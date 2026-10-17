import {WALL,add,sub,mul,dot,cross,unit,lerpNormal,projectMirror,mirrorBasis,withinWall} from './optics.mjs';
const TAU=Math.PI*2;
const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export function createCamera(){return {yaw:.36,pitch:.46,distance:22,target:[1.05,2.6,0]};}
function projector(camera,w,h,flat=false){
 const {yaw,pitch,distance,target}=camera;
 const eye=add(target,[Math.cos(pitch)*Math.cos(yaw)*distance,Math.sin(pitch)*distance,Math.cos(pitch)*Math.sin(yaw)*distance]);
 const forward=unit(sub(target,eye)),right=unit(cross(forward,[0,1,0])),up=cross(right,forward),focal=Math.min(w*(camera.focalScale||.69),h*1.37);
 return p=>{const v=sub(p,eye),d=dot(v,forward);if(d<=.01)return null;
  return [w*.5+dot(v,right)/d*focal,h*.515-dot(v,up)/d*focal,d];};
}
function path3(ctx,p,points){ctx.beginPath();let begun=false;for(const point of points){const q=p(point);if(!q)continue;if(begun)ctx.lineTo(q[0],q[1]);else{ctx.moveTo(q[0],q[1]);begun=true;}}return begun;}
function line3(ctx,p,a,b,stroke,width=1){const x=p(a),y=p(b);if(!x||!y)return;ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x[0],x[1]);ctx.lineTo(y[0],y[1]);ctx.stroke();}
function quad(ctx,p,points,fill,stroke){if(!path3(ctx,p,points))return;ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();}}
function sprite(hue){const c=document.createElement('canvas');c.width=80;c.height=80;const x=c.getContext('2d');const g=x.createRadialGradient(40,40,1,40,40,39);
 if(hue==='ice'){g.addColorStop(0,'rgba(246,255,255,1)');g.addColorStop(.12,'rgba(172,236,255,.95)');g.addColorStop(.30,'rgba(82,174,240,.56)');g.addColorStop(.65,'rgba(30,103,195,.11)');g.addColorStop(1,'rgba(20,88,180,0)');}
 else {g.addColorStop(0,'rgba(255,255,240,1)');g.addColorStop(.12,'rgba(255,234,169,.97)');g.addColorStop(.30,'rgba(252,177,90,.61)');g.addColorStop(.65,'rgba(217,99,50,.13)');g.addColorStop(1,'rgba(217,99,50,0)');}
 x.fillStyle=g;x.fillRect(0,0,80,80);return c;}
export function createScene(){return {camera:createCamera(),warm:sprite('gold'),cool:sprite('ice')};}
function mirrorNormal(m,align,time,shimmer=true){let n=lerpNormal([0,1,0],m.normal,align);
 if(shimmer&&align>.99){const a=Math.sin(time*3.1+m.id*1.83)*.0007; n=unit(add(n,[0,a*.5,a]))||n;}return n;
}
function spotsFor(mirrors,light,align,time,low=false){const out=[];
 for(const m of mirrors){const normal=mirrorNormal(m,align,time);const rays=projectMirror(light,m.center,normal,WALL.x,low?0:m.size);
  if(!withinWall(rays.center))continue;
  const cos=Math.max(0,dot(normal,unit(sub(light,m.center))));
  out.push({mirror:m,center:rays.center,corners:rays.corners,normal,energy:Math.pow(cos,.6)});
 }return out;
}
function projectGlow(ctx,p,spots,img,w,h,brightness=1,mode='scene'){
 ctx.save();ctx.globalCompositeOperation='screen';
 for(const hit of spots){const center=p(hit.center);if(!center)continue;
  let radius=Math.max(3,Math.min(12,w/165));
  const corners=hit.corners.map(p).filter(Boolean);if(corners.length){radius=0;for(const a of corners)radius=Math.max(radius,Math.hypot(a[0]-center[0],a[1]-center[1]));radius=Math.max(2.8,Math.min(radius*.48,15));}
  const flicker=1+.06*Math.sin(hit.mirror.id*1.6+brightness*10);
  ctx.globalAlpha=Math.min(1,brightness*hit.energy*flicker*.9);
  ctx.drawImage(img,center[0]-radius*2.1,center[1]-radius*2.1,radius*4.2,radius*4.2);
 }
 ctx.restore();
}
function flatMap(w,h,reverseView=false){const margin=.075,s=Math.min((w*(1-margin*2))/(WALL.hiZ-WALL.loZ),(h*(1-margin*2))/(WALL.hiY-WALL.loY));
 return pt=>[w*.5+(reverseView?-1:1)*(pt[2]-(WALL.hiZ+WALL.loZ)/2)*s,h*.5-((pt[1]-(WALL.hiY+WALL.loY)/2))*s,10];}
export function drawProjectionOnly(ctx,scene,mirrors,light,opts={}){
 const {width:w,height:h,align=1,time=0,ice=false,reverseView=false}=opts;ctx.clearRect(0,0,w,h);
 // Flat dark studio backdrop: avoids distracting gradient/dither textures in GIF exports.
 ctx.fillStyle='#0a1019';ctx.fillRect(0,0,w,h);
 const p=flatMap(w,h,reverseView),s=spotsFor(mirrors,light,align,time);
 projectGlow(ctx,p,s,ice?scene.cool:scene.warm,w,h,1);
}
export function drawScene(ctx,scene,mirrors,light,opts={}){
 const {width:w,height:h,align=1,time=0,rays=false,selected=-1,ice=false,showLabels=true,low=false,exportClean=false}=opts;
 const p=projector(scene.camera,w,h),wall=[[WALL.x,WALL.loY,WALL.loZ],[WALL.x,WALL.loY,WALL.hiZ],[WALL.x,WALL.hiY,WALL.hiZ],[WALL.x,WALL.hiY,WALL.loZ]];
 ctx.clearRect(0,0,w,h);
 if(exportClean){ctx.fillStyle='#0a1019';ctx.fillRect(0,0,w,h);}
 else{
 const bg=ctx.createLinearGradient(0,0,w,h);bg.addColorStop(0,'#0b121f');bg.addColorStop(.58,'#070d16');bg.addColorStop(1,'#141722');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
 const amb=ctx.createRadialGradient(w*.48,h*.42,5,w*.48,h*.42,w*.67);amb.addColorStop(0,'rgba(23,47,78,.44)');amb.addColorStop(1,'rgba(5,10,20,0)');ctx.fillStyle=amb;ctx.fillRect(0,0,w,h);
 // Floor grid = precise spatial reference, never a projection shortcut.
 for(let z=-4.2;z<=4.21;z+=.7)line3(ctx,p,[-4.7,-.12,z],[3.9,-.12,z],'rgba(129,162,192,.13)',.85);
 for(let x=-4.7;x<=3.91;x+=.7)line3(ctx,p,[x,-.12,-4.2],[x,-.12,4.2],'rgba(129,162,192,.13)',.85);
 }
 quad(ctx,p,wall,'#111b2b','rgba(130,183,213,.64)');
 // Metal frame around wall.
 const frame=wall.map(a=>[a[0]-.06,a[1],a[2]]);quad(ctx,p,frame,'rgba(35,51,68,.12)','rgba(159,192,212,.47)');
 // Forward-projected light points; independent of target-image generator.
 const spots=spotsFor(mirrors,light,align,time,low);
 ctx.save();if(path3(ctx,p,wall)){ctx.closePath();ctx.clip();projectGlow(ctx,p,spots,ice?scene.cool:scene.warm,w,h,1);}
 ctx.restore();
 if(showLabels){ctx.save();ctx.font=`${Math.max(10,Math.round(w*.0082))}px ui-monospace,monospace`;ctx.fillStyle='rgba(174,216,234,.86)';const wp=p([WALL.x,7.77,WALL.loZ]);if(wp)ctx.fillText('02  /  PROJECTION WALL',wp[0],wp[1]);ctx.restore();}
 // Optional ray visibility is intentionally sparse, to remain readable.
 if(rays){const visible=spots.filter((s,i)=>s.mirror.id===selected||i%Math.max(1,Math.floor(mirrors.length/25))===0);
  for(const hit of visible){const main=hit.mirror.id===selected;
   line3(ctx,p,light,hit.mirror.center,main?'rgba(250,212,120,.90)':'rgba(255,206,120,.29)',main?2:1);
   line3(ctx,p,hit.mirror.center,hit.center,main?'rgba(157,239,255,.94)':'rgba(115,211,254,.30)',main?2:1);
  }
 }
 // Render each physical finite mirror as a perspective-projected oriented square.
 const ordered=mirrors.map(m=>({m,v:p(m.center)})).filter(item=>item.v).sort((a,b)=>b.v[2]-a.v[2]);
 for(const {m} of ordered){const n=mirrorNormal(m,align,time),[a,b]=mirrorBasis(n),r=m.size*.5;
  const point=(u,v)=>add(m.center,add(mul(a,u*r),mul(b,v*r)));
  const c=dot(n,unit(sub(light,m.center)));
  const spec=Math.max(0,dot(n,unit(sub(scene.camera.target,m.center))));
  const luminance=Math.floor(Math.min(190,65+105*Math.pow(Math.max(0,c),1.7)+30*spec));
  const selectedMirror=m.id===selected;
  const fill=selectedMirror?'#f2d792':`rgb(${Math.round(luminance*.8)},${Math.round(luminance*.91)},${luminance})`;
  quad(ctx,p,[point(-1,-1),point(1,-1),point(1,1),point(-1,1)],fill,selectedMirror?'#fff0a8':'rgba(217,235,248,.23)');
  if(selectedMirror){const tip=add(m.center,mul(n,.6));line3(ctx,p,m.center,tip,'rgba(255,239,170,.96)',2);}
 }
 // Lamp in world space.
 const l=p(light);if(l){const rad=Math.max(18,w*.024);const halo=ctx.createRadialGradient(l[0],l[1],1,l[0],l[1],rad*2.8);
  halo.addColorStop(0,ice?'rgba(201,244,255,.7)':'rgba(255,231,170,.8)');halo.addColorStop(.25,ice?'rgba(68,187,255,.25)':'rgba(241,164,75,.22)');halo.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=halo;ctx.beginPath();ctx.arc(l[0],l[1],rad*2.8,0,TAU);ctx.fill();
  ctx.fillStyle=ice?'#dffbff':'#fff5d3';ctx.beginPath();ctx.arc(l[0],l[1],Math.max(4,rad*.3),0,TAU);ctx.fill();
  ctx.strokeStyle='rgba(216,237,251,.72)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(l[0],l[1],Math.max(7,rad*.53),0,TAU);ctx.stroke();
  if(showLabels){ctx.font=`${Math.max(10,Math.round(w*.0082))}px ui-monospace,monospace`;ctx.fillStyle='rgba(174,216,234,.85)';ctx.fillText('01 / POINT LIGHT',l[0]+rad*.7,l[1]-rad*.7);}
 }
 if(showLabels){const q=p([-4.2,.15,-3.4]);if(q){ctx.font=`${Math.max(10,Math.round(w*.0082))}px ui-monospace,monospace`;ctx.fillStyle='rgba(174,216,234,.78)';ctx.fillText('03 / MICRO MIRROR ARRAY',q[0],q[1]);}}
}
export function easeAlign(progress){return ease(progress);}
export function cycleAlign(t){const k=t%1;if(k<.1)return 0;if(k<.60)return ease((k-.1)/.5);if(k<.85)return 1;return 1-ease((k-.85)/.15);}
export function projectPoint(camera,width,height,worldPoint){return projector(camera,width,height)(worldPoint);}
// Shared, optional signature for both GIF modes. Never applied to the live simulation.
export function drawExportSignature(ctx,w,h){
 ctx.save();
 ctx.fillStyle='rgba(186,199,215,.49)';
 ctx.font=`500 ${Math.max(10,Math.min(16,Math.round(w*.023)))}px ui-monospace,monospace`;
 ctx.textAlign='left';ctx.textBaseline='alphabetic';
 ctx.fillText('RAYMOSAIC',w*.058,h*.944);
 ctx.restore();
}
