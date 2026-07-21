'use strict';
const assert=require('node:assert/strict'), fs=require('node:fs');
const page=fs.readFileSync(require.resolve('../museum/linux-game-install/lab.html'),'utf8');
const Audio=require('../museum/linux-game-install/games/nebu-strike/audio.js');
const Scores=require('../museum/linux-game-install/games/nebu-strike/highscores.js');
assert.match(page, /id="gameMusic"[^>]*>MUSIC ON/); assert.match(page, /id="gameSfx"[^>]*>SFX ON/);
assert.match(page, /OUTPOST LOST/); assert.match(page, /ENTER CALLSIGN/); assert.match(page, /SAVE SCORE/); assert.match(page, /TOP DEFENDERS — THIS BROWSER/);
assert.doesNotMatch(require('node:fs').readFileSync(require.resolve('../museum/linux-game-install/games/nebu-strike/highscores.js'),'utf8'), /fetch\s*\(|XMLHttpRequest|WebSocket|SERVER UNAVAILABLE/);
class Param { constructor(){this.value=0;} setValueAtTime(v){this.value=v;} exponentialRampToValueAtTime(v){this.value=v;} }
class Node { constructor(){this.gain=new Param();this.frequency=new Param();} connect(){} start(){} stop(){this.onended?.();} }
class Context { constructor(){this.currentTime=0;this.destination=new Node();this.sampleRate=8000;this.state='suspended';} createGain(){return new Node();} createDynamicsCompressor(){const n=new Node();n.threshold=n.knee=n.ratio=n.attack=n.release=new Param();return n;} createOscillator(){return new Node();} createBuffer(){return {getChannelData:()=>new Float32Array(4)};} createBufferSource(){return new Node();} createBiquadFilter(){return new Node();} resume(){this.state='running';return Promise.resolve();} }
let timers=0; const audio=Audio.createAudio({window:{AudioContext:Context,setInterval(){return ++timers;},clearInterval(){}},storage:{getItem:()=>null,setItem(){}}});
assert.equal(audio.getState().audioContextCreated,false); audio.setMusic(false); assert.equal(audio.getState().musicEnabled,false); audio.setMusic(true); assert.equal(audio.getState().musicEnabled,true); audio.start(); assert.equal(audio.getState().musicSchedulerCount,1); audio.start(); assert.equal(audio.getState().musicSchedulerCount,1); audio.stop();
const data=new Map(), store={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)}; const scores=Scores.createScores({storage:store}); scores.save('NEBU',18200,5); assert.equal(scores.getEntries()[0].callsign,'NEBU');
console.log('Nebu Strike DOM-control and local-only integration tests passed');
