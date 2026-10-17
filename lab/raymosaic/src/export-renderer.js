// GIF rendering boundary. Projection mode never enters the apparatus renderer.
// Only mirror geometry, normals and the source reach this module: no target mask.
import {lerpNormal} from './optics.mjs';
import {sequenceFrame} from './message-sequence.mjs';
import {drawScene,drawProjectionOnly,drawExportSignature,easeAlign,cycleAlign} from './scene.js';

export function renderExportFrame(ctx,scene,state,index,total,mode,includeSignature,width,height){
 if(mode!=='projection'&&mode!=='scene')throw Error('Unknown export render mode');
 const step=sequenceFrame(index,total,state.scenes.length),multi=state.scenes.length>1;
 const chosen=state.scenes[step.index],incoming=multi&&step.index>0?state.scenes[step.index-1]:null;
 const reflectors=incoming&&step.alpha<1?chosen.map((m,i)=>({...m,
  normal:lerpNormal(incoming[i]?.normal||[0,1,0],m.normal,easeAlign(step.alpha))})):chosen;
 const time=index/total;
 const opts={width,height,align:multi?(step.index===0?step.alpha:1):cycleAlign(time),
  time:time*5,ice:state.ice,selected:-1,rays:false,showLabels:false};
 if(mode==='projection'){
  drawProjectionOnly(ctx,scene,reflectors,state.light,{...opts,reverseView:state.reverseView,framing:state.framing});
 }else{
  drawScene(ctx,{...scene,camera:state.exportCamera},reflectors,state.light,{...opts,exportClean:true});
 }
 if(includeSignature)drawExportSignature(ctx,width,height);
}
