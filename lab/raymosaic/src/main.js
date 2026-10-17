import {DEFAULT_LIGHT,createArray,aimMirrors,projectMirror,withinWall,WALL} from './optics.mjs';
import {makeTargetCanvas,paintTarget,sampleTarget,orientDrawingTargets} from './targets.js';
import {publicPageUrl,publicShareText,shareServiceUrl,mastodonShareUrl} from './public-share.js';
import {createScene,drawScene,drawProjectionOnly,drawExportSignature,easeAlign,cycleAlign,projectPoint} from './scene.js';
import {captureDrawing,restoreDrawing,validateProject,saveLocal,loadLocal,parseProject,projectFile,makeShareHash,projectFromHash} from './project-state.js';
import {language,t,applyLanguage} from './i18n.js';
const $=id=>document.getElementById(id);
const canvas=$('scene'),context=canvas.getContext('2d',{alpha:false});
const scene=createScene(),baseMirrors=createArray(28,16),targetCanvas=makeTargetCanvas();
let light=[...DEFAULT_LIGHT],targets=[],mirrors=[],preset='heart',ice=false,showRays=false,selected=-1,lightDirty=false;
let introStart=performance.now(),introForce=false,renderWidth=0,renderHeight=0,movingCamera=false;
let messageTimer=0,exportWorker=null,exporting=false,exportBlob=null,exportUrl=null;
let motifKind='heart',motifText='',aimLight=[...DEFAULT_LIGHT],restoring=false,autoSaveTimer=0,booting=true,cameraTouched=false,layoutMode='';
$('mirrorCount').textContent=`${baseMirrors.length} MIRRORS`;
function toast(message){const t=$('toast');t.textContent=message;t.classList.remove('hidden');clearTimeout(messageTimer);messageTimer=setTimeout(()=>t.classList.add('hidden'),3200);}
function setTargets(kind,text){motifKind=kind;motifText=kind==='text'?String(text||'HELLO').slice(0,13):'';aimLight=[...light];paintTarget(targetCanvas,kind,text);targets=orientDrawingTargets(sampleTarget(targetCanvas,baseMirrors.length),kind==='draw'&&$('mirrorDrawing').checked);mirrors=aimMirrors(baseMirrors,light,targets);selected=-1;$('inspector').classList.add('hidden');lightDirty=false;$('recalculate').disabled=true;
 introStart=performance.now();introForce=true;$('motto').textContent=kind==='heart'?'A HEART MADE OF REFLECTIONS':kind==='text'?`YOUR MESSAGE, IN LIGHT`:'EVERY SPOT IS A REFLECTION';
 $('opticsMessage').textContent=t('optics');renderProjectionPreview();scheduleAutoSave();
}
setTargets('heart');booting=false;
function renderProjectionPreview(){
 const preview=$('projectionPreview');if(!preview)return;
 drawProjectionOnly(preview.getContext('2d',{alpha:false}),scene,mirrors,light,{width:preview.width,height:preview.height,align:1,time:0,ice,reverseView:true});
}
const handheld=()=>matchMedia('(max-width:680px), (max-height:540px) and (orientation:landscape) and (max-width:900px)').matches;
function responsiveCamera(){
 const compact=handheld(),wide=innerWidth>innerHeight;
 const mode=compact?(wide?'handheld-wide':'handheld-tall'):'desktop';
 scene.camera.focalScale=compact?(wide?.82:1.05):.69;
 if(layoutMode!==mode&&!cameraTouched){
   const defaultCamera=createScene().camera;
   const desired=mode==='handheld-tall'?{yaw:.34,pitch:.39,distance:12.5,target:[5.2,3.45,0]}:
    mode==='handheld-wide'?{yaw:.38,pitch:.42,distance:15.5,target:[4.25,3.2,0]}:defaultCamera;
   Object.assign(scene.camera,desired);
 }
 layoutMode=mode;
}
function resize(){responsiveCamera();const rect=canvas.getBoundingClientRect();const dpr=Math.min(window.devicePixelRatio||1,1.35);renderWidth=Math.max(1,Math.round(rect.width*dpr));renderHeight=Math.max(1,Math.round(rect.height*dpr));if(canvas.width!==renderWidth||canvas.height!==renderHeight){canvas.width=renderWidth;canvas.height=renderHeight;}}
const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
function currentAlign(now){if(reduceMotion.matches)return 1;const t=Math.min(1,(now-introStart)/2600);return easeAlign(t);}
let lastFrame=0;function tick(now){if(now-lastFrame<32){requestAnimationFrame(tick);return;}lastFrame=now;resize();const align=currentAlign(now);drawScene(context,scene,mirrors,light,{width:renderWidth,height:renderHeight,align,time:reduceMotion.matches?0:now/1000,rays:showRays,selected,ice,showLabels:!window.matchMedia('(max-width:680px)').matches});requestAnimationFrame(tick);}
requestAnimationFrame(tick);
function updatePresetButtons(name){document.querySelectorAll('[data-preset]').forEach(b=>{b.classList.toggle('selected',b.dataset.preset===name);});}
function selectTab(tab){document.querySelectorAll('.tab').forEach(b=>{const active=b.dataset.tab===tab;b.classList.toggle('active',active);b.setAttribute('aria-selected',String(active));});
 for(const t of ['presets','text','draw'])$(t+'Tab').classList.toggle('hidden',t!==tab);}
document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>selectTab(b.dataset.tab)));
document.querySelectorAll('[data-preset]').forEach(b=>b.addEventListener('click',()=>{const name=b.dataset.preset;preset=name;updatePresetButtons(name);setTargets(name==='hello'?'text':name,'HELLO');}));
$('applyText').addEventListener('click',()=>{const value=$('customText').value.trim();if(!value){toast(t('invalid'));return;}preset='custom';updatePresetButtons('none');setTargets('text',value);});
$('quickGif').addEventListener('click',()=>{if(!$('customText').value.trim()){toast(t('invalid'));return;}$('applyText').click();$('quality').value='compact';$('duration').value='3';$('shareGif').click();$('startExport').click();});
$('customText').addEventListener('keydown',e=>{if(e.key==='Enter')$('applyText').click();});
$('replay').addEventListener('click',()=>{introStart=performance.now();toast(t('replay'));});
$('showRays').addEventListener('change',e=>{showRays=e.target.checked;scheduleAutoSave();});
$('coolLight').addEventListener('change',e=>{ice=e.target.checked;renderProjectionPreview();scheduleAutoSave();});
for(const [id,i] of [['lightX',0],['lightY',1],['lightZ',2]])$(id).addEventListener('input',e=>{light[i]=Number(e.target.value);lightDirty=true;$('recalculate').disabled=false;$('lightCoordinates').textContent=light.map(x=>x.toFixed(1)).join(' / ');
 renderProjectionPreview();$('opticsMessage').textContent='The mirrors are still aiming at the old source. Watch the image shift, then recalculate.';$('motto').textContent='THE LIGHT MOVED. THE PHYSICS FOLLOWED.';scheduleAutoSave();});
$('recalculate').addEventListener('click',()=>{mirrors=aimMirrors(baseMirrors,light,targets);aimLight=[...light];lightDirty=false;$('recalculate').disabled=true;introStart=performance.now();renderProjectionPreview();scheduleAutoSave();$('opticsMessage').textContent='Normals recalculated for the new light source.';toast('Mirrors recalculated from the reflection law');});
$('reset').addEventListener('click',()=>{light=[...DEFAULT_LIGHT];$('lightX').value=String(light[0]);$('lightY').value=String(light[1]);$('lightZ').value=String(light[2]);$('lightCoordinates').textContent=light.map(x=>x.toFixed(1)).join(' / ');scene.camera=createScene().camera;cameraTouched=false;layoutMode='';
 $('showRays').checked=false;showRays=false;$('coolLight').checked=false;ice=false;preset='heart';updatePresetButtons('heart');selectTab('presets');setTargets('heart');scheduleAutoSave();toast('Instrument reset');});
// Orbit camera by dragging the scene; inspect a facet with a click.
let pointer=null;
canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;pointer={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,dragged:false};canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(!pointer||pointer.id!==e.pointerId)return;const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;if(Math.hypot(e.clientX-pointer.startX,e.clientY-pointer.startY)>5)pointer.dragged=true;
 if(pointer.dragged){cameraTouched=true;scene.camera.yaw+=dx*.0055;scene.camera.pitch=Math.max(.16,Math.min(1.22,scene.camera.pitch-dy*.0055));}
 pointer.x=e.clientX;pointer.y=e.clientY;});
canvas.addEventListener('pointerup',e=>{if(!pointer||pointer.id!==e.pointerId)return;if(!pointer.dragged){const rect=canvas.getBoundingClientRect();const x=(e.clientX-rect.left)*(canvas.width/rect.width),y=(e.clientY-rect.top)*(canvas.height/rect.height);let closest=-1,best=(Math.max(18,canvas.width*.015))**2;
 for(const m of mirrors){const q=projectPoint(scene.camera,canvas.width,canvas.height,m.center);if(!q)continue;const d=(q[0]-x)**2+(q[1]-y)**2;if(d<best){best=d;closest=m.id;}}
 selected=closest;if(selected>=0){const m=mirrors[selected];const hits=projectMirror(light,m.center,m.normal,WALL.x,m.size);$('mirrorId').textContent=`MIRROR ${String(selected+1).padStart(3,'0')}`;
 $('mirrorInfo').textContent=`Normal: ${m.normal.map(n=>n.toFixed(3)).join(' / ')}\nTilt: ${m.tilt?.toFixed(1)??'invalid'}°\nForward ray: ${withinWall(hits.center)?'intersects wall':'misses wall'}\nCoordinates: ${m.center.map(a=>a.toFixed(2)).join(' / ')}`;
 $('inspector').classList.remove('hidden');}else $('inspector').classList.add('hidden');}
 pointer=null;scheduleAutoSave();});
canvas.addEventListener('pointercancel',()=>pointer=null);
canvas.addEventListener('wheel',e=>{e.preventDefault();scene.camera.distance=Math.max(12,Math.min(38,scene.camera.distance+e.deltaY*.019));cameraTouched=true;scheduleAutoSave();},{passive:false});
$('closeInspector').addEventListener('click',()=>{selected=-1;$('inspector').classList.add('hidden');});
// Drawing surface with undo and erase.
const draw=$('drawCanvas'),drawctx=draw.getContext('2d');let stroke=false,erase=false,lastPoint=null,history=[];
function saveHistory(){history.push(drawctx.getImageData(0,0,draw.width,draw.height));if(history.length>25)history.shift();}
function pointOnDraw(e){const r=draw.getBoundingClientRect();return [(e.clientX-r.left)*draw.width/r.width,(e.clientY-r.top)*draw.height/r.height];}
draw.addEventListener('pointerdown',e=>{stroke=true;saveHistory();draw.setPointerCapture(e.pointerId);lastPoint=pointOnDraw(e);drawctx.lineJoin='round';drawctx.lineCap='round';drawctx.lineWidth=erase?21:9;drawctx.globalCompositeOperation=erase?'destination-out':'source-over';drawctx.strokeStyle='#ffffff';drawctx.beginPath();drawctx.arc(...lastPoint,drawctx.lineWidth*.5,0,Math.PI*2);drawctx.fillStyle='#ffffff';if(erase)drawctx.clearRect(lastPoint[0]-11,lastPoint[1]-11,22,22);else drawctx.fill();});
draw.addEventListener('pointermove',e=>{if(!stroke)return;const q=pointOnDraw(e);drawctx.beginPath();drawctx.moveTo(...lastPoint);drawctx.lineTo(...q);drawctx.stroke();lastPoint=q;});
function endStroke(){stroke=false;drawctx.globalCompositeOperation='source-over';scheduleAutoSave();}
draw.addEventListener('pointerup',endStroke);draw.addEventListener('pointercancel',endStroke);
$('brush').addEventListener('click',()=>{erase=false;$('brush').classList.add('active');$('eraser').classList.remove('active');});
$('eraser').addEventListener('click',()=>{erase=true;$('eraser').classList.add('active');$('brush').classList.remove('active');});
$('undoDraw').addEventListener('click',()=>{const previous=history.pop();if(previous)drawctx.putImageData(previous,0,0);scheduleAutoSave();});
$('clearDraw').addEventListener('click',()=>{saveHistory();drawctx.clearRect(0,0,draw.width,draw.height);scheduleAutoSave();});
$('applyDraw').addEventListener('click',()=>{preset='custom';updatePresetButtons('none');setTargets('draw',draw);});
$('mirrorDrawing').addEventListener('change',()=>{if(motifKind==='draw')setTargets('draw',draw);else scheduleAutoSave();});

// PNG uses exactly the same independently computed forward renderer.
$('savePng').addEventListener('click',()=>{const c=document.createElement('canvas');c.width=1600;c.height=900;const ctx=c.getContext('2d');drawScene(ctx,scene,mirrors,light,{width:c.width,height:c.height,align:1,time:1,ice,selected:-1,rays:showRays});c.toBlob(blob=>{if(!blob){toast('PNG generation failed');return;}download(blob,'raymosaic.png');},'image/png');});
function download(blob,filename){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
const modal=$('exportDialog');$('shareGif').addEventListener('click',()=>{modal.showModal();});$('closeExport').addEventListener('click',()=>{cancelGif();modal.close();});
modal.addEventListener('cancel',()=>cancelGif());
function cancelGif(){if(exporting)toast(t('cancel'));if(exportWorker){exportWorker.terminate();exportWorker=null;}exporting=false;$('exportProgress').classList.add('hidden');$('startExport').disabled=false;$('startExport').textContent='Create animated GIF ↗';}
$('cancelExport').addEventListener('click',()=>{cancelGif();modal.close();});
function resetPreviousExport(){if(exportUrl){URL.revokeObjectURL(exportUrl);exportUrl=null;}exportBlob=null;$('exportPreview').classList.add('hidden');$('downloadGif').classList.add('hidden');$('nativeShare').classList.add('hidden');}
function formatSize(n){return n>1000000?`${(n/1000000).toFixed(2)} MB`:`${Math.round(n/1024)} KB`;}
function exportDimensions(aspect,quality){const short=quality==='compact'?320:quality==='high'?768:512;if(aspect==='portrait')return [Math.round(short*9/16),short];if(aspect==='landscape')return [short,Math.round(short*9/16)];return [short,short];}
function createFrameBuffer(c,frameContext,idx,total,mode,includeSignature){const t=idx/total,align=cycleAlign(t),opts={width:c.width,height:c.height,align,time:t*5,ice,selected:-1,rays:false,showLabels:false,low:mode==='projection'};
 if(mode==='projection')drawProjectionOnly(frameContext,scene,mirrors,light,{...opts,reverseView:motifKind==='draw'&&$('mirrorDrawing').checked});
 else {const original=scene.camera;
  const portrait=c.width<c.height,landscape=c.width>c.height;
  scene.camera={...original,target:portrait?[5,3,0]:landscape?[2,2.8,0]:[4.5,3,0],distance:portrait?17.5:landscape?19:15};
  drawScene(frameContext,scene,mirrors,light,{...opts,exportClean:true});scene.camera=original;}
 if(includeSignature)drawExportSignature(frameContext,c.width,c.height);
 return frameContext.getImageData(0,0,c.width,c.height).data.buffer;
}
$('startExport').addEventListener('click',async()=>{
 if(exporting)return;resetPreviousExport();exporting=true;$('startExport').disabled=true;
 const quality=$('quality').value,[width,height]=exportDimensions($('aspect').value,quality),fps=quality==='compact'?10:quality==='high'?15:12,duration=Number($('duration').value),total=Math.round(fps*duration),mode=$('projectionOnly').checked?'projection':'scene',includeSignature=$('brandGif').checked;
 const bufferCanvas=document.createElement('canvas');bufferCanvas.width=width;bufferCanvas.height=height;
 const frameCtx=bufferCanvas.getContext('2d',{willReadFrequently:true});
 const prog=$('exportProgress'),status=$('progressStatus'),fill=$('progressFill'),pct=$('progressPct');prog.classList.remove('hidden');status.textContent='Encoding animation…';fill.style.width='0%';pct.textContent='0%';
 try{const worker=new Worker(new URL('./gif-worker.js',import.meta.url));exportWorker=worker;let index=0;
  worker.onmessage=e=>{
   if(worker!==exportWorker)return;
   const msg=e.data;
   if(msg.type==='ready'){const frame=createFrameBuffer(bufferCanvas,frameCtx,index,total,mode,includeSignature);worker.postMessage({type:'frame',buffer:frame},[frame]);}
   else if(msg.type==='progress'){
    index=msg.done;const progress=Math.round(index/total*100);fill.style.width=progress+'%';pct.textContent=progress+'%';status.textContent=t('exporting')+index+' / '+total;
    if(index>=total){worker.postMessage({type:'finish'});return;}
    // Yield to the main thread so the UI can repaint and the Cancel button remains responsive.
    requestAnimationFrame(()=>{if(worker!==exportWorker)return;const frame=createFrameBuffer(bufferCanvas,frameCtx,index,total,mode,includeSignature);worker.postMessage({type:'frame',buffer:frame},[frame]);});
   }else if(msg.type==='complete'){exportBlob=msg.blob;exportUrl=URL.createObjectURL(exportBlob);$('gifPreview').src=exportUrl;$('exportSize').textContent=`${width} × ${height} · ${msg.frames} frames · ${formatSize(msg.size)}`;
    $('exportPreview').classList.remove('hidden');$('downloadGif').classList.remove('hidden');if(navigator.share&&navigator.canShare&&navigator.canShare({files:[new File([exportBlob],'raymosaic.gif',{type:'image/gif'})]}))$('nativeShare').classList.remove('hidden');
    status.textContent=t('done');fill.style.width='100%';pct.textContent='100%';worker.terminate();exportWorker=null;exporting=false;$('startExport').disabled=false;$('startExport').textContent='Create another GIF ↗';
   }else if(msg.type==='error'){toast(`GIF error: ${msg.message}`);cancelGif();}
  };worker.onerror=e=>{toast(`GIF encoding error: ${e.message}`);cancelGif();};worker.postMessage({type:'init',width,height,fps,total});
 }catch(e){toast(`Export unavailable: ${e.message}`);cancelGif();}
});
$('downloadGif').addEventListener('click',()=>{if(exportBlob)download(exportBlob,'raymosaic.gif');});
$('nativeShare').addEventListener('click',async()=>{if(!exportBlob)return;try{await navigator.share({files:[new File([exportBlob],'raymosaic.gif',{type:'image/gif'})],title:'RAYMOSAIC',text:'I made this with simulated reflected light.'});}catch(e){if(e.name!=='AbortError')toast('Direct sharing unavailable. Please download the GIF instead.');}});

// Versioned local projects. Full project files keep mirror normals.
// Small share links deterministically regenerate normals from the motif and aimLight.
function snapshot(){
 return validateProject({format:'raymosaic',version:1,kind:motifKind,text:motifText,drawing:captureDrawing(draw),
  light:[...light],aimLight:[...aimLight],
  camera:{yaw:scene.camera.yaw,pitch:scene.camera.pitch,distance:scene.camera.distance,target:[...scene.camera.target]},
  ice,rays:showRays,mirrorDrawing:$('mirrorDrawing').checked,normals:mirrors.map(m=>m.normal.map(n=>Math.round(n*1e8)/1e8))});
}
function scheduleAutoSave(){
 if(restoring||booting)return;
 clearTimeout(autoSaveTimer);
 autoSaveTimer=setTimeout(()=>{try{saveLocal(snapshot());}catch(e){console.warn('RAYMOSAIC local save failed:',e.message);}},700);
}
function restoreProject(candidate){
 const p=validateProject(candidate);
 restoring=true;clearTimeout(autoSaveTimer);
 try{
  if(p.drawing)restoreDrawing(draw,p.drawing);
  else drawctx.clearRect(0,0,draw.width,draw.height);
  history=[];$('mirrorDrawing').checked=p.mirrorDrawing;
  light=[...p.aimLight];
  if(p.kind==='draw')setTargets('draw',draw);
  else if(p.kind==='text')setTargets('text',p.text);
  else if(p.kind==='hello')setTargets('text','HELLO');
  else setTargets(p.kind);
  if(p.normals)mirrors=mirrors.map((m,i)=>({...m,normal:[...p.normals[i]]}));
  aimLight=[...p.aimLight];light=[...p.light];
  for(const [id,i] of [['lightX',0],['lightY',1],['lightZ',2]])$(id).value=String(light[i]);
  $('lightCoordinates').textContent=light.map(x=>x.toFixed(1)).join(' / ');
  lightDirty=light.some((v,i)=>Math.abs(v-aimLight[i])>1e-7);
  $('recalculate').disabled=!lightDirty;
  scene.camera={...p.camera,target:[...p.camera.target]};cameraTouched=true;responsiveCamera();
  ice=p.ice;showRays=p.rays;$('coolLight').checked=ice;$('showRays').checked=showRays;
  $('customText').value=p.kind==='text'?p.text:'';
  preset=['heart','star','bolt'].includes(p.kind)?p.kind:'custom';
  updatePresetButtons(preset);selectTab(p.kind==='draw'?'draw':p.kind==='text'?'text':'presets');
  $('opticsMessage').textContent=t('optics');renderProjectionPreview();
  introStart=performance.now();
 }finally{restoring=false;}
 scheduleAutoSave();
}
$('saveProject').addEventListener('click',()=>{try{saveLocal(snapshot());toast(t('saved'));}catch(e){toast(t('broken')+e.message);}});
$('loadLocal').addEventListener('click',()=>{try{const project=loadLocal();if(!project){toast(language==='de'?'Noch kein lokales Projekt vorhanden':'No locally saved project yet');return;}restoreProject(project);toast(t('loaded'));}catch(e){toast(t('broken')+e.message);}});
$('downloadProject').addEventListener('click',()=>{try{download(projectFile(snapshot()),'raymosaic-project-v1.raymosaic');toast(t('file'));}catch(e){toast(t('broken')+e.message);}});
$('openProject').addEventListener('click',()=>$('projectFileInput').click());
$('projectFileInput').addEventListener('change',async e=>{
 const file=e.target.files?.[0];e.target.value='';if(!file)return;
 if(file.size>250000){toast(t('broken')+'File exceeds 250 KB');return;}
 try{restoreProject(parseProject(await file.text()));toast(t('loaded'));}catch(error){toast(t('broken')+error.message);}
});
$('shareProject').addEventListener('click',async()=>{
 try{
  const hash=await makeShareHash(snapshot()),link=new URL(location.href);link.hash=hash;
  const url=link.toString();
  if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(url);toast(t('link'));}
  else window.prompt(language==='de'?'Link kopieren':'Copy link',url);
 }catch(e){toast(t('linkFail')+e.message);}
});
async function loadSharedHash(){
 if(!location.hash.startsWith('#p='))return;
 try{const project=await projectFromHash(location.hash);if(project){restoreProject(project);toast(t('loaded'));}}
 catch(e){toast(t('broken')+e.message);}
}
if(handheld()){
 $('quality').value='compact';$('duration').value='3';
}

// Sharing the PUBLIC experience never reads snapshot(), drawing data or location.hash.
const publicModal=$('shareDialog');
$('shareRaymosaic').addEventListener('click',()=>publicModal.showModal());
$('closePublicShare').addEventListener('click',()=>publicModal.close());
if(!navigator.share)$('publicNativeShare').classList.add('hidden');
$('publicNativeShare').addEventListener('click',async()=>{
 if(!navigator.share)return;
 try{await navigator.share({title:'RAYMOSAIC',text:publicShareText(language),url:publicPageUrl(language)});}
 catch(e){if(e.name!=='AbortError')toast(language==='de'?'Geräteteilen nicht verfügbar. Anderen Dienst oder Link kopieren wählen.':'Native sharing unavailable. Choose a service or copy the link.');}
});
function openPublicLink(url){window.open(url,'_blank','noopener,noreferrer');/* noopener may return null even when the window opened successfully. */}
for(const [id,service] of [['publicWhatsApp','whatsapp'],['publicFacebook','facebook'],['publicX','x'],['publicEmail','email']]){
 $(id).addEventListener('click',()=>{const url=shareServiceUrl(service,language);if(service==='email')location.href=url;else openPublicLink(url);});
}
$('publicMastodon').addEventListener('click',()=>{
 try{openPublicLink(mastodonShareUrl($('mastodonInstance').value||'mastodon.social',language));}
 catch(e){toast(e.message);}
});
$('publicCopy').addEventListener('click',async()=>{
 const url=publicPageUrl(language);
 try{if(!navigator.clipboard?.writeText)throw Error('clipboard');await navigator.clipboard.writeText(url);toast(language==='de'?'Öffentlichen RAYMOSAIC-Link kopiert':'Public RAYMOSAIC link copied');}
 catch{window.prompt(language==='de'?'Öffentlichen Link kopieren':'Copy public website link',url);}
});

applyLanguage();
loadSharedHash();
window.addEventListener('hashchange',loadSharedHash);
