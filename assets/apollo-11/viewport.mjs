/** Canvas 2D perspective texture mapping. No GPU framework, network assets or idle loop. */
const TAU=Math.PI*2;
function random(seed){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
function terrain(){
 const size=1536,c=document.createElement('canvas');c.width=c.height=size;const ctx=c.getContext('2d'),rng=random(19690720);
 ctx.fillStyle='#77766f';ctx.fillRect(0,0,size,size);
 const pixels=ctx.getImageData(0,0,size,size);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){let i=(y*size+x)*4;const n=(rng()-.5)*28+Math.sin(x/95)*3+Math.sin(y/71)*3;pixels.data[i]=115+n;pixels.data[i+1]=114+n;pixels.data[i+2]=107+n;}
 ctx.putImageData(pixels,0,0);
 // Layered ejecta aprons, bright rims and dark recessed bowls; repeatable original terrain.
 const craters=Array.from({length:420},()=>({x:rng()*size,y:rng()*size,r:2+Math.pow(rng(),3)*95})).sort((a,b)=>b.r-a.r);
 for(const {x,y,r} of craters){for(const dx of [-size,0,size])for(const dy of [-size,0,size]){
  const X=x+dx,Y=y+dy;if(X+r*2<0||X-r*2>size||Y+r*2<0||Y-r*2>size)continue;
  let g=ctx.createRadialGradient(X,Y,r*.7,X,Y,r*1.55);g.addColorStop(0,'#adaca2');g.addColorStop(.55,'#99988b80');g.addColorStop(1,'#88887700');ctx.fillStyle=g;ctx.fillRect(X-r*1.6,Y-r*1.6,r*3.2,r*3.2);
  g=ctx.createRadialGradient(X+r*.27,Y+r*.2,r*.05,X,Y,r);g.addColorStop(0,'#101312');g.addColorStop(.58,'#272c29');g.addColorStop(.81,'#62665c');g.addColorStop(.94,'#b6b8a4');g.addColorStop(1,'#96998b');ctx.fillStyle=g;ctx.beginPath();ctx.arc(X,Y,r,0,TAU);ctx.fill();
  ctx.strokeStyle='#c2c1b2aa';ctx.lineWidth=Math.max(1,r*.07);ctx.beginPath();ctx.arc(X,Y,r,Math.PI*.8,Math.PI*1.7);ctx.stroke();
 }}
 for(let i=0;i<7000;i++){const x=rng()*size,y=rng()*size,r=.3+rng()*1.5;ctx.fillStyle=rng()>.5?'#dad6c344':'#20251d77';ctx.fillRect(x,y,r*2,r);}
 return c;
}
export class LunarViewport{
 constructor(canvas,{reduced=false,label='LANDING SITE'}={}){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.texture=terrain();this.reduced=reduced;this.label=label;this.frames=0;}
 draw(s){
  const c=this.canvas,rect=c.getBoundingClientRect(),ratio=Math.min(devicePixelRatio||1,1.5),w=Math.max(1,Math.round(rect.width*ratio)),h=Math.max(1,Math.round(rect.height*ratio));
  if(c.width!==w||c.height!==h){c.width=w;c.height=h;}
  const ctx=this.ctx;this.frames++;
  // Camera is pitched toward the surface. Texture perspective is illustrative, not an optical LM camera.
  const horizon=h*.23+s.angle*h*.001,focal=w*.7,alt=Math.max(7,s.h+7),tex=this.texture,world=2600;
  ctx.fillStyle='#030605';ctx.fillRect(0,0,w,h);
  ctx.fillStyle='#454941';ctx.beginPath();ctx.moveTo(0,horizon+2);for(let x=0;x<=w;x+=8)ctx.lineTo(x,horizon-Math.sin(x/w*17)*3-Math.sin(x/w*39)*2);ctx.lineTo(w,horizon+14);ctx.lineTo(0,horizon+14);ctx.fill();
  ctx.imageSmoothingEnabled=true;
  const strip=Math.max(2,Math.round(h/210));
  for(let y=Math.max(1,Math.floor(horizon+4));y<h;y+=strip){
   const z=Math.min(world*3,alt*focal/(y-horizon)),span=z*w/focal,center=s.x*.55,zWorld=s.x*.65+z;
   const srcY=((zWorld/world*tex.height)%tex.height+tex.height)%tex.height;
   const total=span/world*tex.width;
   let start=((center-span/2)/world*tex.width%tex.width+tex.width)%tex.width,remaining=total,dest=0;
   // Far terrain can span many repeated tiles. Cap work with an atlas-width sample at the horizon.
   if(total>tex.width*3){ctx.drawImage(tex,0,srcY,tex.width,2,0,y,w,strip);}
   else while(remaining>0.01){const take=Math.min(tex.width-start,remaining);ctx.drawImage(tex,start,srcY,take,Math.max(1,strip*z/(y-horizon)/world*tex.height),dest,y,take/total*w,strip);dest+=take/total*w;remaining-=take;start=0;}
   const shade=Math.max(0,.25-(y-horizon)/h*.2);ctx.fillStyle=`rgba(9,16,12,${shade})`;ctx.fillRect(0,y,w,strip);
  }
  // Distant ridge/haze is lighting, not lunar atmospheric fog.
  const shade=ctx.createLinearGradient(0,horizon,0,h);shade.addColorStop(0,'#060b09a0');shade.addColorStop(.18,'#060b0910');shade.addColorStop(1,'#00000018');ctx.fillStyle=shade;ctx.fillRect(0,horizon,w,h-horizon);
  const targetX=w*.5+(s.target-s.x)/Math.max(alt,15)*w*.42, targetY=h*.67, radius=Math.min(w*.18,40/Math.max(alt,20)*w*.42);
  ctx.strokeStyle='#e9c88599';ctx.lineWidth=1*ratio;ctx.setLineDash([7*ratio,6*ratio]);ctx.beginPath();ctx.ellipse(targetX,targetY,radius,Math.max(4,radius*.32),0,0,TAU);ctx.stroke();ctx.setLineDash([]);
  ctx.strokeStyle='#f1d79cbb';ctx.beginPath();ctx.moveTo(targetX-15*ratio,targetY);ctx.lineTo(targetX+15*ratio,targetY);ctx.moveTo(targetX,targetY-15*ratio);ctx.lineTo(targetX,targetY+15*ratio);ctx.stroke();
  ctx.fillStyle='#e4d3a9';ctx.font=`${10*ratio}px monospace`;ctx.fillText(this.label,Math.max(8,Math.min(w-140*ratio,targetX-35*ratio)),targetY+30*ratio);
  // An original schematic shadow grows with proximity. No external images.
  const scale=Math.min(1.1,40/(alt+18));ctx.save();ctx.translate(w*.55,h*.89);ctx.scale(scale*ratio,scale*ratio*.65);ctx.fillStyle='#0b0e0cbb';ctx.beginPath();ctx.moveTo(-18,-36);ctx.lineTo(18,-36);ctx.lineTo(30,-5);ctx.lineTo(14,20);ctx.lineTo(-14,20);ctx.lineTo(-30,-5);ctx.closePath();ctx.fill();ctx.strokeStyle='#0b0e0cbb';ctx.lineWidth=8;for(const d of [-1,1]){ctx.beginPath();ctx.moveTo(d*20,0);ctx.lineTo(d*48,40);ctx.lineTo(d*65,40);ctx.stroke();}ctx.restore();
  // Exhaust lifts ballistic streaks only near the ground. No atmospheric flame plume.
  if(!this.reduced&&s.throttle>0&&s.h<40&&s.status==='running'){
   ctx.strokeStyle='#c7bfa333';ctx.lineWidth=ratio;const rng=random(20+Math.floor(s.t*12));for(let i=0;i<22;i++){const x=w*.5+(rng()-.5)*w*.5,y=h*(.85+rng()*.12);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+(x-w/2)*.3,y+h*.03);ctx.stroke();}
  }
  const vignette=ctx.createRadialGradient(w/2,h/2,h*.1,w/2,h/2,Math.max(w,h)*.67);vignette.addColorStop(0,'#0000');vignette.addColorStop(1,'#000b');ctx.fillStyle=vignette;ctx.fillRect(0,0,w,h);
 }
}
