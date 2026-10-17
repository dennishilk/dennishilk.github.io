// Target generation only. Never imported by src/scene.js or src/optics.mjs.
const W=240,H=176;
export function makeTargetCanvas(){const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;return canvas;}
export function paintTarget(canvas,kind,value='HELLO'){
 const c=canvas.getContext('2d',{willReadFrequently:true});c.clearRect(0,0,W,H);c.strokeStyle='#fff';c.fillStyle='#fff';c.lineJoin='round';c.lineCap='round';
 if(kind==='heart'){
  c.lineWidth=13;c.beginPath();c.moveTo(120,143);c.bezierCurveTo(102,127,43,87,43,56);c.bezierCurveTo(43,10,102,14,120,54);c.bezierCurveTo(143,11,200,13,200,57);c.bezierCurveTo(200,91,140,133,120,143);c.stroke();
 }else if(kind==='star'){
  c.lineWidth=12;c.beginPath();for(let k=0;k<10;k++){const angle=-Math.PI/2+k*Math.PI/5;const r=k%2?38:73;const x=120+Math.cos(angle)*r,y=88+Math.sin(angle)*r;k?c.lineTo(x,y):c.moveTo(x,y);}c.closePath();c.stroke();
 }else if(kind==='bolt'){
  c.lineWidth=13;c.beginPath();c.moveTo(134,16);c.lineTo(72,91);c.lineTo(118,91);c.lineTo(101,161);c.lineTo(171,70);c.lineTo(125,70);c.closePath();c.stroke();
 }else if(kind==='draw'&&value instanceof HTMLCanvasElement){c.drawImage(value,16,8,W-32,H-16);}
 else{const t=String(value||'HELLO').trim()||'HELLO';let size=t.length<6?71:t.length<10?48:34;
  c.font=`800 ${size}px system-ui,Arial,sans-serif`;while(c.measureText(t).width>216&&size>17){size-=1;c.font=`800 ${size}px system-ui,Arial,sans-serif`;}
  c.textAlign='center';c.textBaseline='middle';c.fillText(t,120,88);
 }
 return canvas;
}
// Horizontal orientation correction is applied once to sampled target coordinates,
// never to the visible sketch or the independently computed forward rays.
export function orientDrawingTargets(points,mirrorDrawing=false){
 return mirrorDrawing?points.map(([u,v])=>[1-u,v]):points;
}
function rng(seed){return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
export function sampleTarget(canvas,count,seed=16723){const c=canvas.getContext('2d',{willReadFrequently:true}),pixels=c.getImageData(0,0,W,H).data;
 const entries=[],sums=[];let total=0;for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const weight=pixels[(y*W+x)*4+3]/255;if(weight>.01){total+=weight;entries.push([x,y]);sums.push(total);}
 }
 if(!total)return Array.from({length:count},()=>[.5,.5]);
 const rand=rng(seed),points=[];for(let i=0;i<count;i++){
  const r=(i+rand()*.7)/count*total;let lo=0,hi=sums.length-1;
  while(lo<hi){const m=(lo+hi)>>1;if(sums[m]<r)lo=m+1;else hi=m;}
  const [x,y]=entries[lo];points.push([(x+rand())/W,(y+rand())/H]);
 }
 // Shuffle target assignment so mechanical movements have a more interesting distribution.
 for(let i=count-1;i>0;i--){const j=Math.floor(rand()*(i+1));[points[i],points[j]]=[points[j],points[i]];}
 return points;
}