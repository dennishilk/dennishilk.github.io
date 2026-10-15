/** A deliberately bounded DSKY command interpreter, NOT Pinball or an AGC CPU. */
export const keys=['VERB','+','7','8','9','NOUN','−','4','5','6','0','1','2','3','CLR','PRO','KEY REL','ENTR','RSET'];
export const signed=(value,scale=1)=>{const n=Math.min(99999,Math.round(Math.abs(value)*scale));return (value<0?'−':'+')+String(n).padStart(5,'0');};
export class DSKY {
 constructor(){this.reset();}
 reset(){this.verb='16';this.noun='60';this.field=null;this.buffer='';this.draftVerb='';this.draftNoun='';this.error=false;this.test=false;this.hold=false;this.saved=null;this.code='ready';}
 fail(code='invalid'){this.error=true;this.code=code;return {type:'error',code};}
 key(key,state){
  if(key==='RSET'){this.error=false;this.test=false;this.code='reset';return {type:'reset'};}
  if(key==='KEY REL'){this.field=null;this.buffer='';this.error=false;this.test=false;this.hold=false;this.saved=null;if(this.verb==='06')this.verb='16';this.code='released';return {type:'release'};}
  if(key==='VERB'){this.field='verb';this.draftVerb='';this.draftNoun='';this.buffer='';this.error=false;this.test=false;this.code='verb';return {type:'input'};}
  if(key==='NOUN'){
   if(this.field==='verb'&&this.buffer.length!==2)return this.fail('twoDigits');
   if(this.field==='verb')this.draftVerb=this.buffer;
   if(!this.draftVerb)return this.fail('startVerb');
   this.field='noun';this.buffer='';this.code='noun';return {type:'input'};
  }
  if(key==='CLR'){if(!this.field)return this.fail('noEntry');this.buffer='';this.error=false;this.code='cleared';return {type:'input'};}
  if(/^\d$/.test(key)){
   if(!this.field)return this.fail('startVerb');
   if(this.buffer.length>=2)return this.fail('twoDigits');
   this.buffer+=key;this.code='entry';return {type:'input'};
  }
  if(key==='+'||key==='−'||key==='-')return this.fail('unsigned');
  if(key==='PRO')return this.fail('noProceed');
  if(key!=='ENTR')return this.fail();
  if(this.field==='program'){
   if(this.buffer.length!==2)return this.fail('twoDigits');
   if(this.buffer!=='66'||!['running','paused','ready'].includes(state.status))return this.fail('program');
   if(state.h>150)return this.fail('tooHigh');
   this.field=null;this.verb='16';this.noun='60';this.draftVerb='';this.buffer='';this.error=false;this.hold=false;this.test=false;this.saved=null;this.code='manual';return {type:'manual'};
  }
  if(this.field==='verb'&&this.buffer==='35'){
   this.verb='35';this.field=null;this.test=true;this.error=false;this.code='lampTest';return {type:'lampTest'};
  }
  if(this.field==='verb'&&this.buffer==='37'){
   this.verb='37';this.field='program';this.buffer='';this.code='programEntry';return {type:'input'};
  }
  if(this.field!=='noun'||this.buffer.length!==2)return this.fail('sequence');
  const verb=this.draftVerb,noun=this.buffer;
  if(!(['06','16'].includes(verb)&&['60','36'].includes(noun)))return this.fail('unsupported');
  this.verb=verb;this.noun=noun;this.field=null;this.draftVerb='';this.buffer='';this.error=false;this.test=false;
  this.hold=verb==='06';this.saved=null;this.saved=this.hold?this.registers(state):null;this.code='accepted';return {type:'display'};
 }
 registers(s){
  if(this.test)return ['+88888','+88888','+88888'];
  if(this.hold&&this.saved)return this.saved;
  if(this.noun==='36'){const sec=Math.floor(s.t);return [signed(Math.floor(sec/3600)),signed(Math.floor(sec/60)%60),signed(sec%60)];}
  // N60 semantics from Luminary099 PINBALL_NOUN_TABLES: VHORIZ, HDOTDISP, HCALC.
  // Museum scaling: velocities in tenths ft/s; height in whole ft. Not original AGC scaling/overflow.
  return [signed(Math.abs(s.vx)*3.28084,10),signed(s.vy*3.28084,10),signed(s.h*3.28084)];
 }
 display(s){return {prog:this.test?'88':s.phase,verb:this.test?'88':this.field==='verb'?this.buffer.padEnd(2,'_'):this.draftVerb||this.verb,noun:this.test?'88':this.field==='noun'?this.buffer.padEnd(2,'_'):this.noun,registers:this.field==='program'?[this.buffer.padEnd(5,'_'),'     ','     ']:this.registers(s),error:this.error,keyrel:!!this.field,test:this.test};}
}
export function keyboardKey(event){if(event.ctrlKey||event.metaKey||event.altKey)return null;const k=event.key.length===1?event.key.toLowerCase():event.key;return ({v:'VERB',n:'NOUN',e:'ENTR',Enter:'ENTR',Backspace:'CLR',Escape:'KEY REL',r:'RSET',p:'PRO','-':'−','+':'+'})[k]||(/^\d$/.test(k)?k:null);}
