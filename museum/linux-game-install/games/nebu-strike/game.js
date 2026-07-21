(function(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.NebuStrike = api;
})(typeof window !== 'undefined' ? window : globalThis, function() {
  'use strict';
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)), wrap=(n,max)=>((n%max)+max)%max;
  function rng(seed){ let s=seed||1234567; return ()=>((s=s*1664525+1013904223>>>0)/4294967296); }
  function asteroid(x,y,size,random){ const pts=[]; for(let i=0;i<10;i++){const a=i*Math.PI*2/10; const r=size*(.72+random()*.35); pts.push([Math.cos(a)*r,Math.sin(a)*r]);} return {x,y,vx:(random()-.5)*55,vy:(random()-.5)*55,size,angle:random()*6.28,spin:(random()-.5)*1.2,shape:pts}; }
  function createGame(width=1280,height=720,seed=9){ return {width,height,state:'TITLE',time:0,countdown:0,wave:0,score:0,lives:3,best:0,ship:{x:width/2,y:height/2,vx:0,vy:0,angle:-Math.PI/2,invincible:0,fire:0},asteroids:[],shots:[],particles:[],shake:0,random:rng(seed),waveDelay:0}; }
  function start(game){ game.state='COUNTDOWN';game.countdown=2.2;game.score=0;game.lives=3;game.wave=0;game.asteroids=[];game.shots=[];game.particles=[];game.waveDelay=0; respawn(game); return game; }
  function respawn(g){ Object.assign(g.ship,{x:g.width/2,y:g.height/2,vx:0,vy:0,angle:-Math.PI/2,invincible:2.4,fire:0}); }
  function wave(g){g.wave++; const count=3+g.wave*2; for(let i=0;i<count;i++){let a; do {a=asteroid(g.random()*g.width,g.random()*g.height, 22+g.random()*22,g.random);} while(Math.hypot(a.x-g.ship.x,a.y-g.ship.y)<180); g.asteroids.push(a);} }
  function burst(g,x,y,color,count=18){for(let i=0;i<count;i++){let a=g.random()*6.28,s=35+g.random()*160;g.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.35+g.random()*.65,max:1,color});} if(g.particles.length>260)g.particles.splice(0,g.particles.length-260);}
  function update(g, keys, dt){dt=Math.min(dt,.05);g.time+=dt;g.shake=Math.max(0,g.shake-dt*2); if(g.state==='TITLE'||g.state==='GAMEOVER')return; if(g.state==='COUNTDOWN'){g.countdown-=dt;if(g.countdown<=0){g.state='PLAYING';wave(g);}return;} if(g.waveDelay){g.waveDelay-=dt;if(g.waveDelay<=0)wave(g);}
    const s=g.ship; if(keys.left)s.angle-=4.5*dt;if(keys.right)s.angle+=4.5*dt; if(keys.thrust){s.vx+=Math.cos(s.angle)*260*dt;s.vy+=Math.sin(s.angle)*260*dt;burst(g,s.x-Math.cos(s.angle)*16,s.y-Math.sin(s.angle)*16,'#64ddff',1);} const speed=Math.hypot(s.vx,s.vy);if(speed>330){s.vx*=.99;s.vy*=.99;}s.vx*=Math.pow(.992,dt*60);s.vy*=Math.pow(.992,dt*60);s.x=wrap(s.x+s.vx*dt,g.width);s.y=wrap(s.y+s.vy*dt,g.height);s.invincible-=dt;s.fire-=dt;
    if(keys.fire&&s.fire<=0){g.shots.push({x:s.x+Math.cos(s.angle)*20,y:s.y+Math.sin(s.angle)*20,vx:s.vx+Math.cos(s.angle)*620,vy:s.vy+Math.sin(s.angle)*620,life:1});s.fire=.16;}
    g.asteroids.forEach(a=>{a.x=wrap(a.x+a.vx*dt,g.width);a.y=wrap(a.y+a.vy*dt,g.height);a.angle+=a.spin*dt;});g.shots.forEach(p=>{p.x=wrap(p.x+p.vx*dt,g.width);p.y=wrap(p.y+p.vy*dt,g.height);p.life-=dt;});g.shots=g.shots.filter(p=>p.life>0);
    for(let pi=g.shots.length-1;pi>=0;pi--)for(let ai=g.asteroids.length-1;ai>=0;ai--){let p=g.shots[pi],a=g.asteroids[ai];if(Math.hypot(p.x-a.x,p.y-a.y)<a.size){g.shots.splice(pi,1);g.asteroids.splice(ai,1);g.score+=Math.round(120-a.size);burst(g,a.x,a.y,'#ffc766',a.size>32?24:15);g.shake=.32;if(a.size>25){for(let j=0;j<2;j++){let c=asteroid(a.x,a.y,a.size*.56,g.random);c.vx=a.vx+(g.random()-.5)*110;c.vy=a.vy+(g.random()-.5)*110;g.asteroids.push(c);}}break;}}
    if(s.invincible<=0)for(const a of g.asteroids)if(Math.hypot(s.x-a.x,s.y-a.y)<a.size+12){g.lives--;burst(g,s.x,s.y,'#ff6b8a',35);g.shake=.8;if(!g.lives){g.state='GAMEOVER';g.best=Math.max(g.best,g.score);}else respawn(g);break;} if(!g.asteroids.length&&!g.waveDelay)g.waveDelay=1.2;
    g.particles.forEach(p=>{p.x=wrap(p.x+p.vx*dt,g.width);p.y=wrap(p.y+p.vy*dt,g.height);p.life-=dt;});g.particles=g.particles.filter(p=>p.life>0); return g;
  }
  return {createGame,start,update,wave,respawn,asteroid};
});
