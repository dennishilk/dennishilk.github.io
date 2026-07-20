(function(root,factory){const api=factory();if(typeof module!=='undefined')module.exports=api;root.ExchangeCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
const NUMBERS=['201','204','214','225','301','318','381','402','417','503','537','612'];
const GUIDE={
  INCOMING_CALL:{step:'STEP 01 — ANSWER THE CALL',instruction:'TAKE THE GLOWING ANSWER PLUG A\nAND INSERT IT INTO JACK 214.',detail:'214 IS CALLING. The yellow calling lamp is lit.',highlight:['plug:A:answer']},
  ANSWER_JACK:{step:'STEP 01 — ANSWER THE CALL',instruction:'INSERT THE LIFTED ANSWER PLUG A\nINTO JACK 214.',detail:'214 IS CALLING. Insert the physical plug into the highlighted jack.',highlight:['jack:214']},
  CALLER_ANSWERED:{step:'STEP 02 — CALLER REQUESTS 537',instruction:'TAKE CALL PLUG A\nAND INSERT IT INTO JACK 537.',detail:'“NUMBER 537, PLEASE.”\n\nThe answer-side cord is seated in 214.',highlight:['plug:A:calling']},
  DESTINATION_JACK:{step:'STEP 02 — CALLER REQUESTS 537',instruction:'INSERT THE LIFTED CALL PLUG A\nINTO JACK 537.',detail:'“NUMBER 537, PLEASE.”\n\nSeat the second physical plug.',highlight:['jack:537']},
  DESTINATION_CONNECTED:{step:'STEP 03 — RING SUBSCRIBER 537',instruction:'PRESS RING',detail:'Subscriber 537 is READY TO RING.',highlight:['ring:A']},
  RINGING:{step:'STEP 03 — RING SUBSCRIBER 537',instruction:'RINGING SUBSCRIBER 537...',detail:'Waiting for subscriber 537 to answer.',highlight:[]},
  CONNECTED:{step:'CALL CONNECTED',instruction:'214 ↔ CORD A ↔ 537',detail:'The visible cord pair physically connects both telephones.',highlight:[]},
  DISCONNECT:{step:'STEP 04 — CLEAR THE CORD',instruction:'THE CALL HAS ENDED.\nPRESS CLEAR A TO REMOVE BOTH PLUGS.',detail:'Release cord circuit A and return both lines to idle.',highlight:['clear:A']},
  COMPLETE:{step:'MISSION COMPLETE',instruction:'YOU JUST CONNECTED TWO TELEPHONES BY HAND.',detail:'You answered the caller, selected the destination, rang it, and cleared the physical cord circuit.',highlight:[]}
};
function fresh(){return {subscribers:Object.fromEntries(NUMBERS.map(n=>[n,{state:'IDLE',busy:false}])),trunks:{'TRUNK 01':'IDLE','TRUNK 02':'IDLE','TRUNK 03':'IDLE'},cords:['A','B','C'].map(id=>({id,answer:null,calling:null,state:'IDLE'})),mission:0,step:'READY',message:'SYSTEM READY — BEGIN TRAINING.',completed:0};}
function cord(s,id){return s.cords.find(c=>c.id===id)}function target(s,x){return s.subscribers[x]||null}
function incoming(s,n){const t=target(s,n);if(!t||t.busy)return false;t.state='CALLING';return true}
function plug(s,id,side,to){const c=cord(s,id),t=target(s,to);if(!c)return false;if(side==='answer'){if(!t||t.state!=='CALLING'||c.answer)return fail(s,'CALLER IS NOT READY.');c.answer=to;c.state='ANSWERED';t.state='ANSWERED / OPERATOR CONNECTED';return true}if(side==='calling'){if(!c.answer)return fail(s,'ANSWER PLUG REQUIRED.');if(c.calling)return false;if(to.startsWith('TRUNK')){if(s.trunks[to]!=='IDLE')return fail(s,'TRUNK IS BUSY.');c.calling=to;c.state='DESTINATION';s.trunks[to]='SEIZED';return true}if(!t||t.busy||t.state==='CONNECTED')return fail(s,'LINE '+to+' IS BUSY.');if(to===c.answer)return fail(s,'SELECT A DIFFERENT DESTINATION.');c.calling=to;c.state='DESTINATION';t.state='READY TO RING';return true}return false}
function ring(s,id){const c=cord(s,id);if(!c||!c.answer||!c.calling||c.state!=='DESTINATION')return fail(s,'RINGING REQUIRES A VALID DESTINATION.');c.state='RINGING';if(s.subscribers[c.calling])s.subscribers[c.calling].state='RINGING';return true}
function answer(s,id){const c=cord(s,id);if(!c||c.state!=='RINGING')return false;c.state='CONNECTED';s.subscribers[c.answer].state='CONNECTED';s.subscribers[c.answer].busy=true;if(s.subscribers[c.calling]){s.subscribers[c.calling].state='ANSWERED / CONNECTED';s.subscribers[c.calling].busy=true}else s.trunks[c.calling]='CONNECTED';return true}
function disconnect(s,id){const c=cord(s,id);if(!c||c.state!=='CONNECTED')return false;c.state='DISCONNECT';if(s.subscribers[c.answer])s.subscribers[c.answer].state='DISCONNECT';if(s.subscribers[c.calling])s.subscribers[c.calling].state='DISCONNECT';return true}
function clear(s,id){const c=cord(s,id);if(!c)return false;[c.answer,c.calling].forEach(x=>{if(s.subscribers[x])Object.assign(s.subscribers[x],{state:'IDLE',busy:false});if(s.trunks[x])s.trunks[x]='IDLE'});Object.assign(c,{answer:null,calling:null,state:'IDLE'});return true}
function fail(s,msg){s.message=msg;return false}function reset(s){Object.assign(s,fresh());return s}
function guidedStart(s){reset(s);s.mission=1;s.step='INCOMING_CALL';incoming(s,'214');return s.step}
function guidedSelect(s,control){const expected={INCOMING_CALL:'plug:A:answer',CALLER_ANSWERED:'plug:A:calling'}[s.step];if(control!==expected)return false;s.step=s.step==='INCOMING_CALL'?'ANSWER_JACK':'DESTINATION_JACK';return true}
function guidedPlug(s,id,side,to){const expected={ANSWER_JACK:'answer:214',DESTINATION_JACK:'calling:537'}[s.step];if(expected!==side+':'+to||!plug(s,id,side,to))return false;s.step=side==='answer'?'CALLER_ANSWERED':'DESTINATION_CONNECTED';return true}
function guidedRing(s,id){if(s.step!=='DESTINATION_CONNECTED'||!ring(s,id))return false;s.step='RINGING';return true}
function guidedConnected(s,id){if(s.step!=='RINGING'||!answer(s,id))return false;s.step='CONNECTED';return true}
function guidedDisconnect(s,id){if(s.step!=='CONNECTED'||!disconnect(s,id))return false;s.step='DISCONNECT';return true}
function guidedClear(s,id){if(s.step!=='DISCONNECT'||!clear(s,id))return false;s.step='COMPLETE';s.completed++;return true}
function guide(s){return GUIDE[s.step]||null}
return {NUMBERS,GUIDE,fresh,incoming,plug,ring,answer,disconnect,clear,reset,guidedStart,guidedSelect,guidedPlug,guidedRing,guidedConnected,guidedDisconnect,guidedClear,guide};});
