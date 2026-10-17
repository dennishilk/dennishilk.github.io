// Export composition is calculated only from forward ray intersections.
// No target text, canvas glyphs, images or renderer output are inspected.
import {projectMirror,withinWall,WALL} from './optics.mjs';
export function projectionBounds(scenes,light){
 let minY=Infinity,maxY=-Infinity,minZ=Infinity,maxZ=-Infinity,hits=0;
 for(const scene of scenes)for(const m of scene){
  const hit=projectMirror(light,m.center,m.normal,WALL.x).center;
  if(!withinWall(hit))continue;
  minY=Math.min(minY,hit[1]);maxY=Math.max(maxY,hit[1]);
  minZ=Math.min(minZ,hit[2]);maxZ=Math.max(maxZ,hit[2]);hits++;
 }
 if(!hits)return {minY:WALL.loY,maxY:WALL.hiY,minZ:WALL.loZ,maxZ:WALL.hiZ,hits:0};
 return {minY,maxY,minZ,maxZ,hits};
}
// A SINGLE shared frame is used for every scene. Geometry is not enlarged:
// only the virtual viewing transform is adapted to the actual light spots.
export function projectionFraming(bounds,width,height,includeSignature=true){
 const spanZ=Math.max(.15,bounds.maxZ-bounds.minZ),spanY=Math.max(.15,bounds.maxY-bounds.minY);
 // Fit the actual hits with one isotropic transform. The renderer caps each
 // glow footprint to this padding, including at the smallest portrait size.
 const padding=Math.min(width,height)*.065+2;
 const foot=includeSignature?Math.max(padding,height*.13):padding;
 const usableHeight=height-padding-foot;
 const scale=Math.min((width-2*padding)/spanZ,usableHeight/spanY);
 return {scale,centerZ:(bounds.minZ+bounds.maxZ)/2,centerY:(bounds.minY+bounds.maxY)/2,
  centerX:width*.5,screenY:padding+usableHeight*.5,glowLimit:padding/2.1};
}
export function exportCamera(bounds,width,height,initial){
 // A restrained push-in for the scene export, while keeping lamp and
 // mirror instrument in view. Camera is fixed across the complete sequence.
 const portrait=width<height,landscape=width>height;
 return {...initial,target:[3.5,(bounds.minY+bounds.maxY)/2,((bounds.minZ+bounds.maxZ)/2)*.3],
  distance:portrait?16.8:landscape?17.5:16.8,focalScale:portrait?.82:landscape?.86:.82};
}
