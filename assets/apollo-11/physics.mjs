/** Original educational model. SI units; flat local plane, no orbital dynamics. */
export const G=1.62, THRUST=45040, ISP=311, G0=9.80665, STEP=1/60;
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function initialState(scenario='final'){
 const full=scenario==='full';
 return {scenario,t:0,x:full?-4000:-35,h:full?6000:120,vx:full?80:1,vy:full?-42:-2.5,angle:0,throttle:0.25,fuel:full?4500:600,initialFuel:full?4500:600,dryMass:6800,target:0,mode:full?'guided':'manual',status:'ready',phase:full?'63':'66',impact:null};
}
export function hoverThrottle(s){return (s.dryMass+s.fuel)*G/THRUST;}
export function guidance(s){
 const descent=-Math.max(.6,Math.min(42,.55*Math.sqrt(Math.max(0,s.h))));
 const desiredX=clamp((s.target-s.x)*.045,-Math.min(80,s.h*.06+.4),Math.min(80,s.h*.06+.4));
 const ax=clamp((desiredX-s.vx)*.45,-1.4,1.4);
 const ay=clamp((descent-s.vy)*.8,-.7,2.5)+G;
 return {angle:clamp(Math.atan2(ax,ay)*180/Math.PI,-30,30),throttle:clamp(Math.hypot(ax,ay)*(s.dryMass+s.fuel)/THRUST,0,1)};
}
export function step(s,dt=STEP){
 if(!Number.isFinite(dt)||dt<=0||dt>.1)throw new RangeError('Physics step must be in (0, 0.1] seconds');
 if(s.status!=='running')return s;
 if(s.mode==='guided')Object.assign(s,guidance(s));
 s.angle=clamp(s.angle,-40,40);s.throttle=clamp(s.throttle,0,1);
 const requested=s.throttle*THRUST,used=Math.min(s.fuel,requested*dt/(ISP*G0));
 const thrust=used*ISP*G0/dt, mass=s.dryMass+s.fuel-used/2, rad=s.angle*Math.PI/180;
 const ax=thrust*Math.sin(rad)/mass,ay=thrust*Math.cos(rad)/mass-G;
 const oldH=s.h;
 const predicted=s.h+s.vy*dt+.5*ay*dt*dt;
 let actual=dt;
 // Interpolate first contact inside the fixed step: never award success after clipping impact velocity.
 if(predicted<=0){let lo=0,hi=dt;for(let i=0;i<25;i++){const m=(lo+hi)/2;if(oldH+s.vy*m+.5*ay*m*m>0)lo=m;else hi=m;}actual=(lo+hi)/2;}
 s.x+=s.vx*actual+.5*ax*actual*actual;s.h=Math.max(0,s.h+s.vy*actual+.5*ay*actual*actual);
 s.vx+=ax*actual;s.vy+=ay*actual;s.fuel=Math.max(0,s.fuel-used*actual/dt);s.t+=actual;
 s.phase=s.h>1800?'63':s.h>150?'64':'66';
 if(predicted<=0){
  s.h=0;s.impact={vx:s.vx,vy:s.vy,angle:s.angle,error:Math.abs(s.x-s.target)};
  s.status=Math.abs(s.vy)<=2.5&&Math.abs(s.vx)<=1.5&&Math.abs(s.angle)<=8&&s.impact.error<=40?'landed':'crashed';
  s.throttle=0;
 }
 if(s.t>=1200||s.h>20000||Math.abs(s.x)>40000){s.status='out-of-range';s.throttle=0;}
 return s;
}
/** Fixed-step accumulator: identical inputs at identical steps give identical states. */
export class Flight {
 constructor(scenario='final'){this.restart(scenario);}
 restart(scenario=this.state?.scenario||'final'){this.state=initialState(scenario);this.accumulator=0;return this.state;}
 start(){if(['ready','paused'].includes(this.state.status))this.state.status='running';}
 pause(){if(this.state.status==='running')this.state.status='paused';}
 advance(seconds){if(this.state.status!=='running')return;this.accumulator+=clamp(seconds,0,1);while(this.accumulator+1e-10>=STEP&&this.state.status==='running'){step(this.state);this.accumulator-=STEP;}}
}
