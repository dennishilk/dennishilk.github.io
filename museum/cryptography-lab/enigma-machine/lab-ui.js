(()=>{
  const {Enigma,alphabet}=window.EnigmaCore, q=s=>document.querySelector(s), qa=s=>[...document.querySelectorAll(s)];
  const layout=['QWERTZUIO','ASDFGHJK','PYXCVBNML'];
  const training={order:['I','II','III'],reflector:'B',rings:[0,0,0],positions:'AAA',pairs:[]};
  let machine=new Enigma(), input='', output='', chosen=null, busy=false, audioContext, audioBus, noiseBuffer, soundIndex=0;
  let mission={stage:'free',ciphertext:'',typed:''};
  const rotors=q('#rotors'), lamps=q('#lamps'), keys=q('#keys'), plugs=q('#plugs');
  const optionHtml=()=>['I','II','III','IV','V'].map(x=>`<option>${x}</option>`).join('');
  const format=s=>s.replace(/(.{5})/g,'$1 ').trim()||'—';

  // Static controls are created exactly once. State changes only update them.
  function buildStatic(){
    rotors.replaceChildren(...[0,1,2].map(i=>{const d=document.createElement('div');d.className='rotor';d.innerHTML=`<b>${['LEFT','MIDDLE','RIGHT'][i]} · <span id="rt${i}">I</span></b><div class="wheel"><button data-rot="${i}" data-d="-1" aria-label="Turn ${i+1} rotor backward">‹</button><output id="pos${i}">A</output><button data-rot="${i}" data-d="1" aria-label="Turn ${i+1} rotor forward">›</button></div><small id="ring${i}">RING 01</small>`;return d}));
    const fragment=document.createDocumentFragment();
    layout.flatMap(x=>[...x]).forEach(c=>{for(const [tag,className,label] of [['output','lamp','Lamp'],['button','enigma-key','Encode'],['button','socket','Plugboard socket']]){const el=document.createElement(tag);el.className=className;el.dataset.letter=c;el.setAttribute('aria-label',`${label} ${c}`);if(className==='socket')el.setAttribute('aria-pressed','false');el.textContent=c;fragment.appendChild(el)}});
    // Distribute the persistent controls to their permanent sections, never append on render.
    const all=[...fragment.children]; lamps.replaceChildren(...all.filter(x=>x.className==='lamp'));keys.replaceChildren(...all.filter(x=>x.className==='enigma-key'));plugs.replaceChildren(...all.filter(x=>x.className==='socket'));
    qa('.enigma-settings select[data-slot]').forEach((s,i)=>{s.innerHTML=optionHtml();s.value=machine.order[i]});
  }
  function render(){
    machine.rotors.forEach((r,i)=>{q('#pos'+i).textContent=alphabet[r.pos];q('#rt'+i).textContent=r.name;q('#ring'+i).textContent=`RING ${String(r.ring+1).padStart(2,'0')}`});
    q('#reflector').value=machine.reflector;q('#rings').value=String(machine.rings[0]);
    qa('.enigma-settings select[data-slot]').forEach((s,i)=>s.value=machine.order[i]);
    q('#plug-status').textContent=`${machine.pairs.length} / 10 PAIRS`;
    qa('.socket').forEach(x=>{const l=x.dataset.letter;x.classList.toggle('paired',machine.pairs.some(p=>p.includes(l)));x.classList.toggle('selected',l===chosen);x.setAttribute('aria-pressed',String(machine.pairs.some(p=>p.includes(l))))});
  }
  function clearMessage(){input=output='';q('#input').textContent=q('#output').textContent='—';q('#step-note').textContent=''}
  function applyTraining(){
    machine.order=[...training.order];machine.reflector=training.reflector;machine.rings=[...training.rings];machine.starts=[...training.positions].map(c=>alphabet.indexOf(c));machine.setPlugboard([...training.pairs]);machine.reset();chosen=null;clearMessage();render();q('#result').textContent='TRAINING START · AAA';
  }
  function missionPanel(){
    const panel=q('#mission-panel'), title=q('#mission-title'), count=q('#mission-count'), text=q('#mission-text'), actions=q('#mission-actions');
    if(mission.stage==='free'){panel.hidden=true;return} panel.hidden=false;actions.replaceChildren();
    const add=(label,fn)=>{const b=document.createElement('button');b.textContent=label;b.onclick=fn;actions.appendChild(b)};
    const states={
      setup:['01 / 07','SET MACHINE','Training configuration: rotors I–II–III · reflector B · rings 01–01–01 · start AAA · no plugboard pairs. Sender and receiver must begin with matching settings and the same agreed starting state. This is a simplified training configuration, not a complete wartime procedure.'],
      encrypt:['02 / 07','TYPE PLAINTEXT',`TYPE: HALLO\n\nOperate the real keyboard or press physical keys. ${mission.typed.length} / 5 letters entered.`],
      observe:['03 / 07','OBSERVE THE ROTORS',`The two L characters entered the machine at different rotor states, so their outputs differ: L → ${mission.ciphertext[2]} and L → ${mission.ciphertext[3]}. Rotor motion makes this substitution change with every press.`],
      record:['04 / 07','RECORD CIPHERTEXT',`YOUR CIPHERTEXT\n${mission.ciphertext}\n\nKeep it here—nothing is copied, transmitted, or stored.`],
      reset:['05 / 07','RESET TO THE SAME START',`A receiving machine must use the SAME configuration and starting state. Reset restores I–II–III, B, 01–01–01, AAA, and no plugboard pairs—not merely the message display.`],
      decrypt:['06 / 07','TYPE THE CIPHERTEXT',`NOW TYPE THE CIPHERTEXT: ${mission.ciphertext}\n\nUse the same operation—there is no decrypt mode. ${mission.typed.length} / ${mission.ciphertext.length} letters entered.`],
      retry:['02 / 07','RESET THE TRAINING START',`That key operated the real machine, so its rotor state no longer matches the lesson. Reset the deterministic training configuration, then type HALLO in order.`],
      complete:['07 / 07','MESSAGE RECOVERED',`HALLO\n\nEnigma is reciprocal: with the same machine configuration and starting state, the same signal path transforms ciphertext back into plaintext. There is no separate encryption/decryption switch.`]
    }[mission.stage];
    [count.textContent,title.textContent,text.textContent]=states;
    if(mission.stage==='setup')add('LOAD TRAINING CONFIGURATION',()=>{applyTraining();mission={stage:'encrypt',ciphertext:'',typed:''};missionPanel()});
    if(mission.stage==='observe')add('CONTINUE — RECORD CIPHERTEXT',()=>{mission.stage='record';missionPanel()});
    if(mission.stage==='record')add('CONTINUE — PREPARE TO DECRYPT',()=>{mission.stage='reset';missionPanel()});
    if(mission.stage==='reset')add('RESET TO TRAINING START',()=>{applyTraining();mission={stage:'decrypt',ciphertext:mission.ciphertext,typed:''};missionPanel()});
    if(mission.stage==='retry')add('RESET TRAINING START',()=>{applyTraining();mission={stage:'encrypt',ciphertext:'',typed:''};missionPanel()});
    if(mission.stage!=='setup'&&mission.stage!=='complete')add('RESTART MISSION',()=>{mission={stage:'setup',ciphertext:'',typed:''};missionPanel()});
    if(mission.stage==='complete')add('RESTART MISSION',()=>{mission={stage:'setup',ciphertext:'',typed:''};missionPanel()});
    add('EXIT TO FREE OPERATION',()=>{mission={stage:'free',ciphertext:'',typed:''};missionPanel();q('#result').textContent='FREE OPERATION'});
  }
  function updateMission(letter,result){
    if(mission.stage!=='encrypt'&&mission.stage!=='decrypt')return;
    const expected=mission.stage==='encrypt'?'HALLO':mission.ciphertext;
    if(letter!==expected[mission.typed.length]){mission.stage='retry';missionPanel();return}
    mission.typed+=letter;
    if(mission.typed.length===expected.length){if(mission.stage==='encrypt'){mission.ciphertext=output;mission.stage='observe'}else if(output==='HALLO')mission.stage='complete';missionPanel()}else missionPanel();
  }

  function unlockAudio(){try{if(!audioContext){const AudioCtor=window.AudioContext||window.webkitAudioContext;if(!AudioCtor)return false;audioContext=new AudioCtor();audioBus=audioContext.createGain();const compressor=audioContext.createDynamicsCompressor();audioBus.gain.value=1.8;compressor.threshold.value=-16;compressor.knee.value=8;compressor.ratio.value=5;compressor.attack.value=.003;compressor.release.value=.06;audioBus.connect(compressor).connect(audioContext.destination);const buffer=audioContext.createBuffer(1,Math.ceil(audioContext.sampleRate*.045),audioContext.sampleRate);let seed=0x1a2b3c4d,data=buffer.getChannelData(0);data.forEach((_,i)=>{seed=(seed*1664525+1013904223)>>>0;data[i]=(seed/0xffffffff)*2-1});noiseBuffer=buffer}if(audioContext.state!=='running')audioContext.resume().catch(()=>{});return true}catch(_){return false}}
  function noiseClick(time,duration,gain,cutoff){const source=audioContext.createBufferSource(),filter=audioContext.createBiquadFilter(),level=audioContext.createGain();source.buffer=noiseBuffer;filter.type='highpass';filter.frequency.value=cutoff;filter.Q.value=.7;level.gain.setValueAtTime(.0001,time);level.gain.exponentialRampToValueAtTime(gain,time+.001);level.gain.exponentialRampToValueAtTime(.0001,time+duration);source.connect(filter).connect(level).connect(audioBus);source.start(time);source.stop(time+duration+.003)}
  function metalTick(time,frequency,duration,gain){const oscillator=audioContext.createOscillator(),level=audioContext.createGain();oscillator.type='square';oscillator.frequency.setValueAtTime(frequency,time);level.gain.setValueAtTime(.0001,time);level.gain.exponentialRampToValueAtTime(gain,time+.0008);level.gain.exponentialRampToValueAtTime(.0001,time+duration);oscillator.connect(level).connect(audioBus);oscillator.start(time);oscillator.stop(time+duration+.002)}
  function machineSound(stepped){if(!unlockAudio())return;try{const variation=(soundIndex++%5)-2,time=audioContext.currentTime+.001;noiseClick(time,.010+variation*.0004,.12,2100+variation*70);metalTick(time+.001,2450+variation*35,.006,.045);const carries=Number(stepped.middle)+Number(stepped.left),rotorTime=time+.012;noiseClick(rotorTime,.017+carries*.003,.19+carries*.045,1250+variation*45);metalTick(rotorTime+.002,940+carries*120+variation*12,.012+carries*.002,.065+carries*.015);metalTick(time+.023,4200+variation*45,.004,.018)}catch(_){}}
  function encode(letter){if(busy)return;busy=true;const k=q(`.enigma-key[data-letter="${letter}"]`);k.classList.add('down');const r=machine.encipher(letter);machineSound(r.stepped);input+=letter;output+=r.output;render();q('#input').textContent=format(input);q('#output').textContent=format(output);q('#result').textContent=`${letter} → ${r.output}`;const lamp=q(`.lamp[data-letter="${r.output}"]`);lamp.classList.add('lit');if(!q('#path-panel').hidden)showPath(r);if(r.stepped.double)q('#step-note').textContent='DOUBLE STEP';updateMission(letter,r);setTimeout(()=>{k.classList.remove('down');lamp.classList.remove('lit');busy=false},180)}
  function showPath(r){q('#path-list').replaceChildren(...['KEY '+r.input,...r.route.map(x=>`${x.stage.toUpperCase()} · ${x.letter}`),'LAMP '+r.output].map((x,i)=>{const li=document.createElement('li');li.style.animationDelay=`${i*35}ms`;li.textContent=x;return li}))}
  keys.addEventListener('click',e=>{const l=e.target.dataset.letter;if(l)encode(l)});document.addEventListener('keydown',e=>{if(e.repeat||/INPUT|TEXTAREA|SELECT|BUTTON/.test(document.activeElement.tagName))return;const l=e.key.toUpperCase();if(alphabet.includes(l)){e.preventDefault();encode(l)}});
  rotors.addEventListener('click',e=>{const b=e.target.closest('[data-rot]');if(!b)return;const r=machine.rotors[b.dataset.rot];r.pos=(r.pos+26+Number(b.dataset.d))%26;machine.starts[b.dataset.rot]=r.pos;machineSound({middle:false,left:false});render()});
  plugs.addEventListener('click',e=>{const b=e.target.closest('.socket');if(!b)return;const l=b.dataset.letter;if(machine.pairs.some(p=>p.includes(l))){machine.setPlugboard(machine.pairs.filter(p=>!p.includes(l)));chosen=null}else if(!chosen)chosen=l;else if(chosen!==l){try{machine.setPlugboard([...machine.pairs,chosen+l])}catch(err){q('#plug-status').textContent=err.message}chosen=null}render()});
  q('#clear-plugs').onclick=()=>{machine.setPlugboard([]);chosen=null;render()};q('#clear').onclick=clearMessage;q('#reset').onclick=()=>{machine.reset();render();q('#result').textContent='RESET'};q('#settings-toggle').onclick=()=>q('#settings').hidden=!q('#settings').hidden;q('#reflector').onchange=e=>{machine.reflector=e.target.value;render()};q('#rings').onchange=e=>{machine.rings=[Number(e.target.value),Number(e.target.value),Number(e.target.value)];machine.reset();render()};qa('.enigma-settings select[data-slot]').forEach(s=>s.onchange=e=>{machine.order[e.target.dataset.slot]=e.target.value;machine.reset();render()});qa('.mode button').forEach(b=>b.onclick=()=>{qa('.mode button').forEach(x=>x.classList.toggle('active',x===b));q('#path-panel').hidden=b.dataset.mode!=='path'});q('#demo').onclick=()=>q('#result').textContent='TYPE HELLO, NOTE OUTPUT, RESET, THEN TYPE IT BACK.';q('#mission-start').onclick=()=>{mission={stage:'setup',ciphertext:'',typed:''};missionPanel()};
  buildStatic();render();missionPanel();
})();
