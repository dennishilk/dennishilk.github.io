const assert = require('node:assert/strict');
const { createAudio, BPM, COMPOSITION, finiteComposition } = require('../museum/linux-game-install/games/nebu-strike/audio.js');
class AudioParam { setValueAtTime() {} exponentialRampToValueAtTime() {} }
class Node { constructor(){this.gain=new AudioParam();this.frequency=new AudioParam()} connect(){} start(){} stop(){this.onended?.()} }
class Context { constructor(){this.currentTime=0;this.destination=new Node();this.sampleRate=8000} createGain(){return new Node()} createDynamicsCompressor(){const n=new Node();n.threshold=n.knee=n.ratio=n.attack=n.release=new AudioParam();return n} createOscillator(){return new Node()} createBuffer(){return {getChannelData:()=>new Float32Array(20)}} createBufferSource(){return new Node()} createBiquadFilter(){const n=new Node();n.frequency=new AudioParam();return n} resume(){} }
const timers = new Map(); let id=0;
const win={AudioContext:Context,setInterval(fn){const key=++id;timers.set(key,fn);return key},clearInterval(key){timers.delete(key)}};
const audio=createAudio({window:win,storage:{getItem:()=>null,setItem(){}}});
assert.equal(BPM,124); assert.equal(COMPOSITION.sections.reduce((n,x)=>n+x[1],0),52); assert.ok(finiteComposition());
audio.start(); assert.equal(audio.getState().contextCount,1); assert.equal(audio.getState().schedulerActive,true); audio.start(); assert.equal(audio.getState().schedulersStarted,1);
audio.setMusic(false); assert.equal(audio.getState().schedulerActive,false); audio.setMusic(true); assert.equal(audio.getState().schedulersStarted,2); audio.stop(); assert.equal(audio.getState().schedulerActive,false);
console.log('Nebu Strike audio lifecycle and finite composition tests passed');
