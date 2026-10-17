// RAYMOSAIC optical core. No DOM, target image, canvas, or renderer dependencies.
export const add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
export const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
export const mul=(a,s)=>[a[0]*s,a[1]*s,a[2]*s];
export const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
export const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export const length=a=>Math.hypot(...a);
export function unit(a){const l=length(a);return l>1e-11?mul(a,1/l):null;}
export function reflect(incoming,normal){return sub(incoming,mul(normal,2*dot(incoming,normal)));}
export function intersectWall(origin,direction,x=8){const d=direction[0];if(Math.abs(d)<1e-10)return null;const t=(x-origin[0])/d;return t>1e-8?add(origin,mul(direction,t)):null;}
export function mirrorBasis(normal){let t=unit(cross(normal,[0,1,0]));if(!t)t=unit(cross(normal,[0,0,1]));return [t,cross(normal,t)];}
// For incident I=(mirror-light)/|...| and desired outgoing O=(target-mirror)/|...|,
// the bisector normal N=normalize(O-I) yields reflect(I,N)=O.
export function solveNormal(light,mirror,target,maxTiltDeg=85){
 const i=unit(sub(mirror,light)),o=unit(sub(target,mirror));if(!i||!o)return null;
 const n=unit(sub(o,i));if(!n||n[1]<0)return null;
 const tilt=Math.acos(Math.max(-1,Math.min(1,n[1])))*180/Math.PI;
 return tilt<=maxTiltDeg?{normal:n,tilt}:null;
}
export function projectMirror(light,center,normal,wallX=8,facetSize=0){
 const [t,b]=mirrorBasis(normal);const offsets=facetSize>0?[[0,0],[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]]:[[0,0]];
 const points=[];
 for(const [u,v] of offsets){const surface=add(center,add(mul(t,u*facetSize),mul(b,v*facetSize)));
  const i=unit(sub(surface,light));if(!i){points.push(null);continue;}
  const o=reflect(i,normal);points.push(intersectWall(surface,o,wallX));
 }
 return {center:points[0],corners:points.slice(1)};
}
export function lerpNormal(a,b,t){return unit(add(mul(a,1-t),mul(b,t)))||b;}
export function createArray(nx=28,nz=16){const result=[];
 for(let z=0;z<nz;z++)for(let x=0;x<nx;x++){
  const jitter=((x*71+z*137)%19)/19;
  result.push({id:z*nx+x,center:[-4.05+x*(7.3/(nx-1)),.08,-3.08+z*(6.2/(nz-1))],size:Math.min(0.19,6.2/(nz-1)*.49),jitter});
 }return result;
}
export const DEFAULT_LIGHT=[-4.7,6.8,3.8];
export const WALL={x:8,loY:.65,hiY:7.5,loZ:-4.65,hiZ:4.65};
export function wallPoint(u,v){return [WALL.x,WALL.hiY-v*(WALL.hiY-WALL.loY),WALL.loZ+u*(WALL.hiZ-WALL.loZ)];}
export function withinWall(p){return !!p&&p[1]>=WALL.loY&&p[1]<=WALL.hiY&&p[2]>=WALL.loZ&&p[2]<=WALL.hiZ;}
export function aimMirrors(array,light,targets){return array.map((m,i)=>{
 const target=targets[i]||[.5,.5];const goal=wallPoint(target[0],target[1]);
 const solved=solveNormal(light,m.center,goal);
 return {...m,normal:solved?.normal||[0,1,0],valid:!!solved,tilt:solved?.tilt??null,goal};
});}