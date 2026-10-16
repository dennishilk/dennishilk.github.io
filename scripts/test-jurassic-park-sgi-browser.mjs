import {createServer} from 'node:http';
import {readFile,stat,mkdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {nodes} from '../assets/jurassic-park-sgi/filesystem.mjs';
const {chromium}=await import(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright/index.mjs');
const root=fileURLToPath(new URL('../',import.meta.url)),qa=process.env.SGI_QA_DIR||'/tmp/sgi-qa';await mkdir(qa,{recursive:true});
const server=createServer(async(req,res)=>{try{let p=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!p.startsWith(root))throw Error('path');if((await stat(p)).isDirectory())p+='/index.html';res.setHeader('Content-Type',({'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.webp':'image/webp','.png':'image/png'})[extname(p)]||'application/octet-stream');res.end(await readFile(p));}catch{res.statusCode=404;res.end('404');}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({executablePath:process.env.SGI_BROWSER||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']}),errors=[],requests=[];
try{
 const context=await browser.newContext({viewport:{width:1440,height:1100}});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
 await page.route('**/*',r=>{requests.push(r.request().url());return new URL(r.request().url()).origin!==origin?r.abort():r.continue();});
 const go=async path=>{await page.goto(origin+path);await page.waitForFunction(()=>document.documentElement.dataset.sgiReady==='true');await page.evaluate(()=>document.fonts.ready);};
 const search=async name=>{await page.locator('#file-search').fill(name);await page.locator('#search-results button').filter({hasText:name}).first().click();};
 const command=async text=>{await page.locator('#command').fill(text);await page.locator('#command').press('Enter');};
 const viewer=page.locator('#file-viewer'),observation='/park/Animals/Raptors/observation.log';
 const checkViewer=async(name,lang)=>{
  assert.equal(await viewer.isVisible(),true);assert.equal(await page.locator('#file-viewer-title').textContent(),name);
  const node=[...nodes.values()].find(n=>n.name===name);
  assert.equal(await page.locator('#file-viewer-content').textContent(),node.content[lang]);
  assert.equal(await page.locator('#file-viewer-content > *').count(),0);
  assert.equal(await page.locator('#file-viewer-content').getAttribute('contenteditable'),null);
  assert.equal(await page.locator('#close-file-viewer').getAttribute('aria-label'),lang==='de'?'Dateiansicht schließen':'Close file viewer');
  assert.ok(await viewer.evaluate(el=>{const v=el.getBoundingClientRect(),d=el.closest('.desktop').getBoundingClientRect();return v.left>=d.left&&v.right<=d.right&&v.top>=d.top&&v.bottom<=d.bottom&&!el.matches(':modal');}),'viewer contained inside monitor');
 };
 // Instrument the existing renderer only in the test browser: detect scene rebuilds
 // and inspect the actual retained camera, not an approximation of its CSS controls.
 const watchLandscape=async()=>page.evaluate(async()=>{
  const {Landscape}=await import('/assets/jurassic-park-sgi/landscape.mjs');
  window.sgiTest={builds:0};const draw=Landscape.prototype.draw,setDirectory=Landscape.prototype.setDirectory;
  Landscape.prototype.draw=function(){const result=draw.call(this);window.sgiTest.landscape=this;return result;};
  Landscape.prototype.setDirectory=function(node){window.sgiTest.builds++;return setDirectory.call(this,node);};
  document.getElementById('zoom').dispatchEvent(new Event('input'));
 });
 const state=async()=>page.evaluate(()=>{const l=window.sgiTest.landscape;return {builds:window.sgiTest.builds,yaw:l.yaw,pitch:l.pitch,zoom:l.zoom,directory:l.directory.path,selection:l.selected.path,search:document.getElementById('file-search').value,results:document.getElementById('search-results').innerHTML};});
 const canvasPoint=async path=>page.evaluate(path=>{
  const l=window.sgiTest.landscape,r=l.canvas.getBoundingClientRect();
  for(const f of l.hits.filter(f=>f.node.path===path)){
   const x=f.points.reduce((s,p)=>s+p[0],0)/f.points.length,y=f.points.reduce((s,p)=>s+p[1],0)/f.points.length;
   if(x>0&&x<r.width&&y>0&&y<r.height&&l.hit({clientX:r.left+x,clientY:r.top+y})?.path===path)return {x,y};
  }throw Error('No visible face for '+path);
 },path);
 for(const lang of ['en','de']){
  await page.emulateMedia({reducedMotion:lang==='de'?'reduce':'no-preference'});
  await go((lang==='de'?'/de':'')+'/museum/jurassic-park-sgi/');assert.equal(await page.locator('#directory-list button').count(),5);
  assert.ok(await page.locator('#landscape').evaluate(c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data.some(v=>v)));
  await page.screenshot({path:qa+'/'+lang+'-workstation.png',fullPage:true});
  for(const view of ['bird','front','overview']){const before=await page.locator('#landscape').evaluate(c=>c.toDataURL());await page.locator('[data-view='+view+']').click();assert.equal(await page.locator('[data-view='+view+']').getAttribute('aria-pressed'),'true');assert.notEqual(await page.locator('#landscape').evaluate(c=>c.toDataURL()),before);}
  await page.locator('#landscape').focus();await page.keyboard.press('ArrowRight');assert.notEqual(await page.locator('#inspector-title').innerText(),'park');await page.keyboard.press('Enter');assert.notEqual(await page.locator('#pathbar').innerText(),'/park');await page.keyboard.press('Backspace');assert.equal(await page.locator('#pathbar').innerText(),'/park');
  await search('Fences');assert.match(await page.locator('#pathbar').innerText(),/Fences$/);await page.locator('#nav-up').click();assert.match(await page.locator('#pathbar').innerText(),/Physical.Security$/);await page.locator('#nav-reset').click();assert.equal(await page.locator('#pathbar').innerText(),'/park');
  await watchLandscape();await search('observation.log');
  const item=page.locator('#directory-list button[data-path="'+observation+'"]');
  await page.locator('#directory-list button').filter({hasText:'.raptor_support'}).click();await item.click();
  assert.equal(await viewer.isVisible(),false);assert.equal(await item.getAttribute('aria-pressed'),'true');assert.equal(await page.locator('#inspector-title').innerText(),'observation.log');
  await page.locator('#zoom').fill('137');await page.locator('#landscape').scrollIntoViewIfNeeded();
  const box=await page.locator('#landscape').boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+24,box.y+box.height/2+16,{steps:4});await page.mouse.up();
  const before=await state();assert.notEqual(before.yaw,-.15);assert.equal(before.zoom,1.37);
  await item.dblclick();await checkViewer('observation.log',lang);assert.deepEqual(await state(),before);
  await page.locator('.monitor').screenshot({path:qa+'/'+lang+'-file-viewer.png'});
  await page.locator('#close-file-viewer').click();assert.deepEqual(await state(),before);assert.equal(await item.evaluate(el=>el===document.activeElement),true);
  await page.locator('#open-item').click();await checkViewer('observation.log',lang);await page.keyboard.press('Escape');assert.deepEqual(await state(),before);assert.equal(await page.locator('#open-item').evaluate(el=>el===document.activeElement),true);
  await page.locator('#landscape').focus();await page.keyboard.press('Enter');await checkViewer('observation.log',lang);await page.keyboard.press('Escape');assert.deepEqual(await state(),before);assert.equal(await page.locator('#landscape').evaluate(el=>el===document.activeElement),true);
  await item.press('Enter');await checkViewer('observation.log',lang);await page.keyboard.press('Escape');
  await page.locator('#directory-list button').filter({hasText:'.raptor_support'}).dblclick();await checkViewer('.raptor_support',lang);await page.keyboard.press('Escape');
  // Opening a file visible below the current directory must not navigate to its parent.
  await page.locator('#nav-reset').click();await page.locator('#file-search').fill('observation');await page.locator('#landscape').scrollIntoViewIfNeeded();
  const point=await canvasPoint(observation);await page.locator('#landscape').click({position:point});assert.equal(await viewer.isVisible(),false);assert.equal(await page.locator('#inspector-title').innerText(),'observation.log');
  const rootState=await state();await page.locator('#landscape').dblclick({position:point});await checkViewer('observation.log',lang);await page.keyboard.press('Escape');assert.deepEqual(await state(),rootState);assert.equal(rootState.directory,'/park');
  await page.locator('#mode-bonus').click();await command('open '+observation);await checkViewer('observation.log',lang);await page.keyboard.press('Escape');assert.deepEqual(await state(),rootState);
  await page.locator('#mode-bonus').click();await command('cd /park/Animals/Raptors');await command('open observation.log');await checkViewer('observation.log',lang);await page.keyboard.press('Escape');assert.deepEqual(await state(),rootState);
  await page.locator('#mode-bonus').click();await command('open /park/Animals/Raptors');assert.equal(await viewer.isVisible(),false);assert.equal(await page.locator('#pathbar').textContent(),'/park/Animals/Raptors');
  await page.locator('#mode-bonus').click();await command('restore fences');assert.equal(await page.locator('.map-node.online').count(),0);assert.match(await page.locator('#terminal-output').innerText(),/Interlock|Verriegelung/);
  for(const c of ['access security','access security grid']){await command(c);assert.equal(await page.locator('#dennis-dialog').isVisible(),false);}
  await command('access main security grid');assert.equal(await page.locator('#dennis-dialog').isVisible(),true);assert.equal((await page.locator('#terminal-output').innerText()).match(/PERMISSION DENIED|ZUGRIFF VERWEIGERT/g).length,3);
  assert.ok(await page.locator('#dennis-dialog img').evaluate(async img=>{await img.decode();return img.complete&&img.naturalWidth>0;}));await page.screenshot({path:qa+'/'+lang+'-dennis.png'});await page.locator('#magic').fill(lang==='de'?'bitte':'please');await page.locator('#magic').press('Enter');assert.equal(await page.locator('#dennis-dialog').isVisible(),false);
  await command('cd /park/Physical.Plant');await command('ls');assert.match(await page.locator('#terminal-output').innerText(),/Physical.Security/);await command('cd missing');assert.match(await page.locator('#terminal-output').innerText(),/not found|nicht gefunden/);
  for(const action of ['diagnose','isolate','reboot','power','communications','fences'])await page.locator('[data-action='+action+']').click();
  await command('restore doors');assert.equal(await page.locator('#system-banner.secured').count(),0);
  await page.locator('#locate-module').click();await search('door.control');assert.match(await page.locator('#file-content').innerText(),/ACCESS CONTROL|ZUGANGSSTEUERUNG/);await page.locator('#open-item').click();await checkViewer('door.control',lang);await page.keyboard.press('Escape');await page.locator('#file-action').click();assert.equal(await page.locator('#system-banner.secured').count(),1);assert.equal(await page.locator('.map-node.online').count(),6);await page.screenshot({path:qa+'/'+lang+'-bonus.png',fullPage:true});
  await page.locator('#recovery-reset').click();assert.equal(await page.locator('.map-node.online').count(),0);
  await page.locator('#mode-workstation').click();await search('.raptor_support');assert.match(await page.locator('#file-content').innerText(),/helping hand|helfende Hand/);await search('ocean-monitor');await page.locator('#file-action').click();assert.equal(await page.locator('#shark-dialog').isVisible(),true);await page.keyboard.press('Escape');
  await page.locator('#directory-list button').filter({hasText:'ocean-monitor.txt'}).dblclick();assert.equal(await page.locator('#shark-dialog').isVisible(),true);assert.equal(await viewer.isVisible(),false);await page.keyboard.press('Escape');
  await search('.dennis');await page.locator('#directory-list button').filter({hasText:'.dennis'}).dblclick();assert.equal(await page.locator('#dennis-dialog').isVisible(),true);assert.equal(await viewer.isVisible(),false);await page.keyboard.press('Escape');await page.locator('#mode-workstation').click();
  await page.locator('#mode-bonus').click();await command('open /park/Physical.Plant/Control.Room/ocean-monitor.txt');assert.equal(await page.locator('#shark-dialog').isVisible(),true);assert.equal(await viewer.isVisible(),false);await page.keyboard.press('Escape');
  await page.locator('#mode-bonus').click();await command('open /park/Physical.Plant/Control.Room/.dennis');assert.equal(await page.locator('#dennis-dialog').isVisible(),true);assert.equal(await viewer.isVisible(),false);await page.keyboard.press('Escape');await page.locator('#mode-workstation').click();
  // Every authored ordinary text/configuration/module file uses the same complete viewer.
  for(const n of nodes.values())if(!n.children&&!['dennis','shark'].includes(n.action)){
   await search(n.name);await page.locator('#open-item').click();await checkViewer(n.name,lang);await page.keyboard.press('Escape');
  }
  await search('observation.log');
  for(const width of [320,390,640,768,1024,1440,2048]){
   await page.setViewportSize({width,height:950});await page.locator('#open-item').click();await checkViewer('observation.log',lang);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'viewer overflow '+lang+' '+width);
   if(width===390)await page.locator('.monitor').screenshot({path:qa+'/'+lang+'-file-viewer-mobile.png'});
   await page.keyboard.press('Escape');assert.equal(await viewer.isVisible(),false);
  }
  await page.setViewportSize({width:1440,height:1100});
  // A long plain-text document remains scrollable, read-only and safely literal.
  // This browser-only fixture leaves filesystem.mjs and all authored content untouched.
  await page.evaluate(async({path,lang})=>{const {resolvePath}=await import('/assets/jurassic-park-sgi/filesystem.mjs');const n=resolvePath(path);window.sgiTest.original=n.content[lang];n.content[lang]='<img src="/must-not-load" onerror="throw Error()">\n'+('read-only UNIX document\n'.repeat(150));},{path:observation,lang});
  await page.locator('#open-item').click();assert.equal(await page.locator('#file-viewer-content > *').count(),0);
  assert.ok(await page.locator('#file-viewer-content').evaluate(el=>el.scrollHeight>el.clientHeight&&getComputedStyle(el).overflowY==='auto'));
  await page.locator('#file-viewer-content').press('Control+End');await page.waitForFunction(()=>document.getElementById('file-viewer-content').scrollTop>0);
  await page.screenshot({path:qa+'/'+lang+'-file-viewer-scroll.png'});await page.keyboard.press('Escape');
  await page.evaluate(async({path,lang})=>{const {resolvePath}=await import('/assets/jurassic-park-sgi/filesystem.mjs');resolvePath(path).content[lang]=window.sgiTest.original;},{path:observation,lang});
  await page.locator('#open-item').click();await checkViewer('observation.log',lang);assert.equal(await page.locator('#file-viewer-content').evaluate(el=>el.scrollTop),0);await page.keyboard.press('Tab');assert.equal(await viewer.evaluate(el=>el.contains(document.activeElement)),false);await page.keyboard.press('Escape');
  await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await page.mouse.move(5,5);await page.mouse.wheel(0,300);await page.waitForFunction(()=>scrollY>0);assert.equal(await page.locator('#open-item').isEnabled(),true);
  for(const width of [320,390,640,768,1024,1440,2048]){await page.setViewportSize({width,height:950});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'overflow '+lang+' '+width);await page.locator('#mode-bonus').click();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'bonus overflow '+lang+' '+width);await page.locator('#mode-workstation').click();}
  await page.setViewportSize({width:390,height:844});await page.locator('#nav-reset').click();await page.screenshot({path:qa+'/'+lang+'-mobile.png',fullPage:true});await page.setViewportSize({width:1440,height:1100});
 }
 await page.locator('.language').click();await page.waitForFunction(()=>document.documentElement.lang==='en');assert.ok(page.url().endsWith('/museum/jurassic-park-sgi/'));
 await page.waitForLoadState('networkidle');
 await context.setOffline(true);await search('fsn.notes');assert.match(await page.locator('#file-content').innerText(),/real fsn/);await context.setOffline(false);
 assert.ok(requests.every(url=>new URL(url).origin===origin));assert.deepEqual(errors,[]);
 const noCanvas=await browser.newContext();await noCanvas.addInitScript(()=>{HTMLCanvasElement.prototype.getContext=()=>null;});const fallback=await noCanvas.newPage();await fallback.goto(origin+'/museum/jurassic-park-sgi/');await fallback.waitForFunction(()=>document.documentElement.dataset.sgiReady==='true');await fallback.locator('#directory-list button').first().click();await fallback.locator('#open-item').click();assert.match(await fallback.locator('#pathbar').innerText(),/Airport.Flights/);await fallback.locator('#file-search').fill('flight.plan');await fallback.locator('#search-results button').click();await fallback.locator('#directory-list button').filter({hasText:'flight.plan'}).dblclick();assert.equal(await fallback.locator('#file-viewer-content').textContent(),[...nodes.values()].find(n=>n.name==='flight.plan').content.en);await fallback.keyboard.press('Escape');assert.equal(await fallback.locator('#file-viewer').isVisible(),false);await noCanvas.close();
 const noJS=await browser.newContext({javaScriptEnabled:false});const staticPage=await noJS.newPage();await staticPage.goto(origin+'/de/museum/jurassic-park-sgi/');assert.ok(await staticPage.locator('#field-notes').isVisible());assert.ok(await staticPage.locator('noscript').isVisible());await noJS.close();
 console.log('PASS: EN/DE desktop file viewer (list/canvas double-click, Read file, Enter, terminal open), exact complete contents of every ordinary authored file, camera/zoom/directory/selection/search preservation without scene rebuild, focus/Escape/page scrolling, literal read-only long-text scrolling, monitor containment at 7 widths per language; existing 3D/navigation/recovery/Dennis/ocean/raptor/language/offline/Canvas/no-JS checks; zero page/network errors. QA: '+qa);
}finally{await browser.close();await new Promise(r=>server.close(r));}
