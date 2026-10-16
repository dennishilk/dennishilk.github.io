// Small retained 3D scene: perspective projection + painter-sorted cuboids on Canvas 2D.
// No WebGL, continuous frame loop, network requests or third-party rendering library.
export class Landscape {
 constructor(canvas,{select,open,label}){
  this.canvas=canvas;this.ctx=canvas.getContext('2d');this.select=select;this.open=open;this.label=label;this.yaw=-.15;this.pitch=.72;this.zoom=1;this.hits=[];
  if(!this.ctx)return;
  this.observer=new ResizeObserver(()=>this.draw());this.observer.observe(canvas);
  canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;this.drag={x:e.clientX,y:e.clientY,yaw:this.yaw,pitch:this.pitch,moved:false};canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!this.drag)return;const dx=e.clientX-this.drag.x,dy=e.clientY-this.drag.y;if(Math.abs(dx)+Math.abs(dy)>5)this.drag.moved=true;if(this.drag.moved){this.yaw=this.drag.yaw+dx*.006;this.pitch=Math.max(.22,Math.min(1.4,this.drag.pitch+dy*.004));this.draw();}});
  canvas.addEventListener('pointerup',e=>{if(this.drag&&!this.drag.moved){const n=this.hit(e);if(n)this.select(n);}this.drag=null;});
  canvas.addEventListener('pointercancel',()=>this.drag=null);
  canvas.addEventListener('dblclick',e=>{const n=this.hit(e);if(n)this.open(n);});
 }
 setDirectory(directory){
  this.directory=directory;this.boxes=[];this.links=[];
  const weight=(n,depth)=>!n.children||depth===3?1:Math.max(1,n.children.filter(c=>c.children).reduce((s,c)=>s+weight(c,depth+1),0));
  const total=weight(directory,0)*230;
  const layout=(n,depth,left,width)=>{
   const x=left+width/2,z=depth*530,w=Math.min(265,Math.max(190,width*.82)),h=12+Math.log2(n.size+1)*1.5;
   this.boxes.push({node:n,x,z,y:0,w,d:180,h,kind:'dir'});
   const files=n.children.filter(c=>!c.children);
   files.forEach((f,i)=>this.boxes.push({node:f,x:x+(i-(files.length-1)/2)*65,z:z-5,y:h,w:52,d:55,h:32+Math.log2(f.size+1)*7,kind:'file'}));
   if(depth>=3)return;
   const children=n.children.filter(c=>c.children);let offset=left;const sum=children.reduce((s,c)=>s+weight(c,depth+1),0);
   children.forEach(c=>{const span=width*weight(c,depth+1)/sum,cx=offset+span/2;this.links.push([[x,0,z+90],[cx,0,z+530-90]]);layout(c,depth+1,offset,span);offset+=span;});
  };
  layout(directory,0,-total/2,total);this.centerZ=Math.max(...this.boxes.map(b=>b.z))/2;this.radius=Math.max(total*.52,this.centerZ+180,350);this.zoom=1;this.draw();
 }
 view(name){this.yaw=name==='front'?0:-.15;this.pitch={overview:.72,bird:1.28,front:.28}[name]||.72;this.zoom=1;this.draw();}
 project(x,y,z){
  z-=this.centerZ;const rx=x*Math.cos(this.yaw)-z*Math.sin(this.yaw),rz=x*Math.sin(this.yaw)+z*Math.cos(this.yaw);
  const ry=y*Math.cos(this.pitch)+rz*Math.sin(this.pitch),depth=this.radius*1.65+(rz*Math.cos(this.pitch)-y*Math.sin(this.pitch));
  const scale=Math.min(this.width*.9,this.height*1.5)/Math.max(80,depth)*this.zoom;
  return [this.width/2+rx*scale,this.height*.51-ry*scale,depth];
 }
 draw(){
  if(!this.ctx||!this.directory||!this.canvas.getBoundingClientRect().width)return;
  const {width,height}=this.canvas.getBoundingClientRect(),ratio=Math.min(devicePixelRatio||1,1.5);this.width=width;this.height=height;
  if(this.canvas.width!==Math.round(width*ratio)||this.canvas.height!==Math.round(height*ratio)){this.canvas.width=Math.round(width*ratio);this.canvas.height=Math.round(height*ratio);}
  const c=this.ctx;c.setTransform(ratio,0,0,ratio,0,0);c.clearRect(0,0,width,height);
  const bg=c.createLinearGradient(0,0,0,height);bg.addColorStop(0,'#063a42');bg.addColorStop(.35,'#328c8d');bg.addColorStop(.36,'#205f3f');bg.addColorStop(1,'#0a3328');c.fillStyle=bg;c.fillRect(0,0,width,height);
  const line=(a,b,color)=>{c.strokeStyle=color;c.beginPath();c.moveTo(...this.project(...a).slice(0,2));c.lineTo(...this.project(...b).slice(0,2));c.stroke();};
  for(let i=-5;i<=5;i++){const r=this.radius*1.3;line([i*r/5,-3,-r],[i*r/5,-3,r*2],'#ffffff0b');line([-r,-3,i*r/5],[r,-3,i*r/5],'#ffffff0b');}
  this.links.forEach(([a,b])=>line(a,b,'#d5e7c9aa'));
  const faces=[],labels=[];this.hits=[];
  for(const b of this.boxes){
   const {x,y,z,w,d,h,node}=b,vertices=[[-w/2,0,-d/2],[w/2,0,-d/2],[w/2,0,d/2],[-w/2,0,d/2],[-w/2,h,-d/2],[w/2,h,-d/2],[w/2,h,d/2],[-w/2,h,d/2]].map(([dx,dy,dz])=>this.project(x+dx,y+dy,z+dz));
   const color=b.kind==='dir'?['#ba797b','#784955','#d19491']:node.age<90?['#67d9ef','#237b9a','#95e8f3']:node.age<180?['#719ed4','#345d92','#a2c6eb']:node.age<360?['#ae89cd','#694c86','#c9a8e4']:['#e4bd7f','#987142','#f3d8a3'];
   for(const [indices,shade] of [[[0,1,5,4],1],[[1,2,6,5],1],[[2,3,7,6],0],[[3,0,4,7],0],[[4,5,6,7],2]])faces.push({node,points:indices.map(i=>vertices[i]),fill:color[shade],depth:indices.reduce((s,i)=>s+vertices[i][2],0)/4});
   const p=b.kind==='dir'?this.project(x,y,z+d/2+45):this.project(x,y+h+15,z);labels.push({node,p,kind:b.kind});
  }
  faces.sort((a,b)=>b.depth-a.depth);
  for(const f of faces){c.beginPath();f.points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=f.fill;c.fill();c.lineWidth=f.node===this.selected?2: .65;c.strokeStyle=f.node===this.selected?'#ffffb9':'#d6edf155';c.stroke();this.hits.push(f);}
  c.textAlign='center';const occupied=[];
  labels.sort((a,b)=>(b.node===this.selected)-(a.node===this.selected)||a.p[2]-b.p[2]);
  for(const {node,p,kind} of labels){
   if(kind==='file'&&this.radius>700&&node!==this.selected)continue;
   if(width<450&&node!==this.selected&&node!==this.directory&&node.parent!==this.directory)continue;
   const name=node.name;c.font=(kind==='dir'?'bold ':'')+'11px monospace';const tw=c.measureText(name).width,rect={x:p[0]-tw/2-4,y:p[1]-10,w:tw+8,h:17};
   if(node!==this.selected&&(rect.x<3||rect.x+rect.w>width-3||occupied.some(r=>rect.x<r.x+r.w+3&&rect.x+rect.w+3>r.x&&rect.y<r.y+r.h+3&&rect.y+rect.h+3>r.y)))continue;
   rect.x=Math.max(2,Math.min(width-rect.w-2,rect.x));occupied.push(rect);c.fillStyle=node===this.selected?'#fff6c9':'#0b252bd9';c.fillRect(rect.x,rect.y,rect.w,rect.h);c.fillStyle=node===this.selected?'#172a2b':'#eff7e9';c.fillText(name,rect.x+rect.w/2,rect.y+12);
  }
  c.textAlign='left';c.fillStyle='#dbefdc';c.font='11px monospace';c.fillText(this.label,12,height-13);
 }
 hit(e){const rect=this.canvas.getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top;
  for(const f of [...this.hits].reverse()){let inside=false;const p=f.points;for(let i=0,j=p.length-1;i<p.length;j=i++){if((p[i][1]>y)!==(p[j][1]>y)&&x<(p[j][0]-p[i][0])*(y-p[i][1])/(p[j][1]-p[i][1])+p[i][0])inside=!inside;}if(inside)return f.node;}return null;
 }
}
