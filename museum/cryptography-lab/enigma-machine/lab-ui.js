(()=>{
  const {Enigma,alphabet}=window.EnigmaCore, q=s=>document.querySelector(s), qa=s=>[...document.querySelectorAll(s)];
  const layout=['QWERTZUIO','ASDFGHJK','PYXCVBNML'];
  let machine=new Enigma(), input='', output='', chosen=null, busy=false, audioContext, audioBus, noiseBuffer, soundIndex=0;
  const rotors=q('#rotors'), lamps=q('#lamps'), keys=q('#keys'), plugs=q('#plugs');

  function optionHtml(){return ['I','II','III','IV','V'].map(x=>`<option>${x}</option>`).join('')}
  function build(){
    rotors.innerHTML=[0,1,2].map(i=>`<div class="rotor"><b>${['LEFT','MIDDLE','RIGHT'][i]} · <span id="rt${i}">${machine.order[i]}</span></b><div class="wheel"><button data-rot="${i}" data-d="-1" aria-label="Turn ${i+1} rotor backward">‹</button><output id="pos${i}">A</output><button data-rot="${i}" data-d="1" aria-label="Turn ${i+1} rotor forward">›</button></div><small>RING 01</small></div>`).join('');
    layout.flatMap(x=>[...x]).forEach(c=>{
      lamps.insertAdjacentHTML('beforeend',`<output class="lamp" data-letter="${c}" aria-label="Lamp ${c}">${c}</output>`);
      keys.insertAdjacentHTML('beforeend',`<button class="enigma-key" data-letter="${c}" aria-label="Encode ${c}">${c}</button>`);
      plugs.insertAdjacentHTML('beforeend',`<button class="socket" data-letter="${c}" aria-pressed="false" aria-label="Plugboard socket ${c}">${c}</button>`);
    });
    qa('.enigma-settings select[data-slot]').forEach((s,i)=>{s.innerHTML=optionHtml();s.value=machine.order[i]});
    render();
  }
  function render(){
    machine.rotors.forEach((r,i)=>{q('#pos'+i).textContent=alphabet[r.pos];q('#rt'+i).textContent=r.name});
    q('#plug-status').textContent=`${machine.pairs.length} / 10 PAIRS`;
    qa('.socket').forEach(x=>{let l=x.dataset.letter;x.classList.toggle('paired',machine.pairs.some(p=>p.includes(l)));x.classList.toggle('selected',l===chosen)});
  }

  // This is called synchronously from the visitor's machine action. Sources queued
  // during resume begin as soon as the browser releases the audio context, so the
  // unlocking interaction is also the first audible keypress.
  function unlockAudio(){
    try{
      if(!audioContext){
        const AudioCtor=window.AudioContext||window.webkitAudioContext;
        if(!AudioCtor)return false;
        audioContext=new AudioCtor();
        audioBus=audioContext.createGain();
        const compressor=audioContext.createDynamicsCompressor();
        audioBus.gain.value=1.8;
        compressor.threshold.value=-16;
        compressor.knee.value=8;
        compressor.ratio.value=5;
        compressor.attack.value=.003;
        compressor.release.value=.06;
        audioBus.connect(compressor).connect(audioContext.destination);
        const buffer=audioContext.createBuffer(1,Math.ceil(audioContext.sampleRate*.045),audioContext.sampleRate);
        let seed=0x1a2b3c4d, data=buffer.getChannelData(0);
        data.forEach((_,i)=>{seed=(seed*1664525+1013904223)>>>0;data[i]=(seed/0xffffffff)*2-1});
        noiseBuffer=buffer;
      }
      if(audioContext.state!=='running')audioContext.resume().catch(()=>{});
      return true;
    }catch(_){return false}
  }
  function noiseClick(time, duration, gain, cutoff){
    const source=audioContext.createBufferSource(), filter=audioContext.createBiquadFilter(), level=audioContext.createGain();
    source.buffer=noiseBuffer;
    filter.type='highpass';
    filter.frequency.value=cutoff;
    filter.Q.value=.7;
    level.gain.setValueAtTime(.0001,time);
    level.gain.exponentialRampToValueAtTime(gain,time+.001);
    level.gain.exponentialRampToValueAtTime(.0001,time+duration);
    source.connect(filter).connect(level).connect(audioBus);
    source.start(time);source.stop(time+duration+.003);
  }
  function metalTick(time, frequency, duration, gain){
    const oscillator=audioContext.createOscillator(), level=audioContext.createGain();
    oscillator.type='square';
    oscillator.frequency.setValueAtTime(frequency,time);
    level.gain.setValueAtTime(.0001,time);
    level.gain.exponentialRampToValueAtTime(gain,time+.0008);
    level.gain.exponentialRampToValueAtTime(.0001,time+duration);
    oscillator.connect(level).connect(audioBus);
    oscillator.start(time);oscillator.stop(time+duration+.002);
  }
  function machineSound(stepped){
    if(!unlockAudio())return;
    try{
      const variation=(soundIndex++%5)-2, time=audioContext.currentTime+.001;
      // Dry key click, then the indexed rotor clack, then a restrained contact tick.
      noiseClick(time,.010+variation*.0004,.12,2100+variation*70);
      metalTick(time+.001,2450+variation*35,.006,.045);
      const carries=Number(stepped.middle)+Number(stepped.left);
      const rotorTime=time+.012;
      noiseClick(rotorTime,.017+carries*.003,.19+carries*.045,1250+variation*45);
      metalTick(rotorTime+.002,940+carries*120+variation*12,.012+carries*.002,.065+carries*.015);
      metalTick(time+.023,4200+variation*45,.004,.018);
    }catch(_){/* Audio failure must never interrupt the machine. */}
  }
  function format(s){return s.replace(/(.{5})/g,'$1 ').trim()||'—'}
  function encode(letter){
    if(busy)return;
    busy=true;
    let k=q(`.enigma-key[data-letter="${letter}"]`);
    k.classList.add('down');
    let r=machine.encipher(letter);
    machineSound(r.stepped);
    input+=letter;output+=r.output;render();
    q('#input').textContent=format(input);q('#output').textContent=format(output);q('#result').textContent=`${letter} → ${r.output}`;
    let lamp=q(`.lamp[data-letter="${r.output}"]`);
    lamp.classList.add('lit');
    if(q('#path-panel').hidden===false)showPath(r);
    if(r.stepped.double)q('#step-note').textContent='DOUBLE STEP';
    setTimeout(()=>{k.classList.remove('down');lamp.classList.remove('lit');busy=false},180);
  }
  function showPath(r){q('#path-list').innerHTML=['KEY '+r.input,...r.route.map(x=>`${x.stage.toUpperCase()} · ${x.letter}`),'LAMP '+r.output].map((x,i)=>`<li style="animation-delay:${i*35}ms">${x}</li>`).join('')}

  keys.addEventListener('click',e=>{let l=e.target.dataset.letter;if(l)encode(l)});
  document.addEventListener('keydown',e=>{if(e.repeat||/INPUT|TEXTAREA|SELECT|BUTTON/.test(document.activeElement.tagName))return;let l=e.key.toUpperCase();if(alphabet.includes(l)){e.preventDefault();encode(l)}});
  rotors.addEventListener('click',e=>{let b=e.target.closest('[data-rot]');if(!b)return;let r=machine.rotors[b.dataset.rot];r.pos=(r.pos+26+Number(b.dataset.d))%26;machine.starts[b.dataset.rot]=r.pos;machineSound({middle:false,left:false});render()});
  plugs.addEventListener('click',e=>{let b=e.target.closest('.socket');if(!b)return;let l=b.dataset.letter;if(machine.pairs.some(p=>p.includes(l))){machine.setPlugboard(machine.pairs.filter(p=>!p.includes(l)));chosen=null}else if(!chosen)chosen=l;else if(chosen!==l){try{machine.setPlugboard([...machine.pairs,chosen+l])}catch(err){q('#plug-status').textContent=err.message}chosen=null}render()});
  q('#clear-plugs').onclick=()=>{machine.setPlugboard([]);chosen=null;render()};
  q('#clear').onclick=()=>{input=output='';q('#input').textContent=q('#output').textContent='—'};
  q('#reset').onclick=()=>{machine.reset();render();q('#result').textContent='RESET'};
  q('#settings-toggle').onclick=()=>q('#settings').hidden=!q('#settings').hidden;
  q('#reflector').onchange=e=>machine.reflector=e.target.value;
  q('#rings').onchange=e=>{machine.rings=[Number(e.target.value),Number(e.target.value),Number(e.target.value)];machine.reset();render()};
  qa('.enigma-settings select[data-slot]').forEach(s=>s.onchange=e=>{machine.order[e.target.dataset.slot]=e.target.value;machine.reset();build()});
  qa('.mode button').forEach(b=>b.onclick=()=>{qa('.mode button').forEach(x=>x.classList.toggle('active',x===b));q('#path-panel').hidden=b.dataset.mode!=='path'});
  q('#demo').onclick=()=>{q('#result').textContent='TYPE HELLO, NOTE OUTPUT, RESET, THEN TYPE IT BACK.'};
  build();
})();
