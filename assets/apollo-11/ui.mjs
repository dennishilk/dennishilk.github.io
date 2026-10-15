import {Flight,hoverThrottle,clamp} from './physics.mjs';
import {DSKY,keyboardKey} from './dsky.mjs';
import {events} from './history.mjs';
const de=document.documentElement.lang==='de',t=(en,ger)=>de?ger:en,$=id=>document.getElementById(id);
const flight=new Flight(),dsky=new DSKY(),motion=matchMedia('(prefers-reduced-motion: reduce)');
let viewport=null,raf=0,last=0,paint=0,telemetry=0,sourceToken=0,oldPhase='66',visible=true,canvasVisible=true;
let renderCount=0;
const messages={
 ready:t('Ready. Try VERB 16 NOUN 60 ENTR.','Bereit. Probiere VERB 16 NOUN 60 ENTR.'),verb:t('Enter two VERB digits.','Zwei VERB-Ziffern eingeben.'),noun:t('Enter two NOUN digits, then ENTR.','Zwei NOUN-Ziffern eingeben, dann ENTR.'),entry:t('Entry in progress. CLR clears this field.','Eingabe läuft. CLR löscht dieses Feld.'),cleared:t('Current field cleared.','Aktuelles Feld gelöscht.'),
 invalid:t('OPR ERR: invalid command. RSET acknowledges.','OPR ERR: ungültiger Befehl. RSET quittiert.'),twoDigits:t('OPR ERR: exactly two digits are required.','OPR ERR: genau zwei Ziffern erforderlich.'),startVerb:t('OPR ERR: start with VERB.','OPR ERR: mit VERB beginnen.'),noEntry:t('No input field is active. Press VERB first.','Kein Eingabefeld aktiv. Zuerst VERB drücken.'),unsigned:t('OPR ERR: signed data entry is not supported in this mode.','OPR ERR: vorzeichenbehaftete Dateneingabe wird hier nicht unterstützt.'),noProceed:t('No proceed request is pending in this reconstruction.','In dieser Rekonstruktion wartet keine Fortsetzungsanfrage.'),program:t('Only P66 is selectable during an active training scenario.','Nur P66 ist während eines laufenden Trainingsszenarios wählbar.'),tooHigh:t('P66 selection requires altitude ≤150 m in this model.','P66-Wahl erfordert in diesem Modell eine Höhe ≤150 m.'),sequence:t('Use V16 N60 E, V06 N60 E, V16 N36 E, V35 E or V37 E 66 E.','V16 N60 E, V06 N60 E, V16 N36 E, V35 E oder V37 E 66 E verwenden.'),unsupported:t('OPR ERR: this VERB/NOUN pair is not implemented.','OPR ERR: dieses VERB/NOUN-Paar ist nicht implementiert.'),reset:t('Warning lamps acknowledged. Flight state preserved.','Warnlampen quittiert. Flugzustand bleibt erhalten.'),released:t('Display released to current model data.','Anzeige für aktuelle Modelldaten freigegeben.'),lampTest:t('Lamp test active. RSET ends the test.','Lampentest aktiv. RSET beendet den Test.'),programEntry:t('Enter program 66, then ENTR (below 150 m).','Programm 66 eingeben, dann ENTR (unter 150 m).'),manual:t('P66: manual training controls selected.','P66: manuelle Trainingssteuerung gewählt.'),accepted:t('Command accepted. Data from the flight model.','Befehl angenommen. Daten aus dem Flugmodell.')};
const segmentMap={'0':'ab cdef'.replaceAll(' ',''),'1':'bc','2':'abged','3':'abgcd','4':'fgbc','5':'afgcd','6':'afgecd','7':'abc','8':'abcdefg','9':'abfgcd'};
const segments={a:[3,1,11,2],b:[14,3,2,10],c:[14,16,2,10],d:[3,27,11,2],e:[1,16,2,10],f:[1,3,2,10],g:[3,14,11,2]};
function digits(el,value){if(el.dataset.value===value)return;el.dataset.value=value;el.classList.add('digits');let svg='';for(let i=0;i<value.length;i++){const ch=value[i];svg+=`<g transform="translate(${i*20} 0)">`;if(ch==='+'||ch==='−'||ch==='-'){svg+='<rect x="3" y="14" width="11" height="2" fill="currentColor"/>';if(ch==='+')svg+='<rect x="7.5" y="9" width="2" height="12" fill="currentColor"/>';}else if(ch==='_'){svg+='<rect x="3" y="27" width="11" height="2" fill="currentColor"/>';}else if(segmentMap[ch])for(const [name,[x,y,w,h]]of Object.entries(segments))svg+=`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx=".6" fill="${segmentMap[ch].includes(name)?'currentColor':'#182716'}"/>`;svg+='</g>';}
 el.innerHTML=`<span class="sr-only">${value}</span><svg viewBox="0 0 ${value.length*20} 30" aria-hidden="true">${svg}</svg>`;}
function dskyUpdate(){const d=dsky.display(flight.state);digits($('dsky-prog'),d.prog);digits($('dsky-verb'),d.verb);digits($('dsky-noun'),d.noun);d.registers.forEach((r,i)=>digits($('r'+(i+1)),r));document.querySelectorAll('[data-lamp]').forEach(l=>{const on=d.test||l.dataset.lamp==='OPR ERR'&&d.error||l.dataset.lamp==='KEY REL'&&d.keyrel;l.classList.toggle('on',!!on);l.setAttribute('aria-label',l.dataset.lamp+': '+t(on?'on':'off',on?'an':'aus'));});$('comp-acty').classList.toggle('on',d.test||flight.state.status==='running');const message=messages[dsky.code]||messages.invalid;if($('dsky-message').textContent!==message)$('dsky-message').textContent=message;$('readout-key').textContent=dsky.noun==='36'?t('R1 HOURS · R2 MINUTES · R3 SECONDS / MODEL TIME','R1 STUNDEN · R2 MINUTEN · R3 SEKUNDEN / MODELLZEIT'):t('R1 HORIZ ×0.1 FT/S · R2 VERT ×0.1 FT/S · R3 FT','R1 HORIZ. ×0,1 FT/S · R2 VERT. ×0,1 FT/S · R3 FT');}
const seconds=n=>String(Math.floor(n/60)).padStart(2,'0')+':'+String(Math.floor(n)%60).padStart(2,'0');
function log(en,ger){const li=document.createElement('li');li.textContent=`T+${seconds(flight.state.t)} / ${t(en,ger)}`;$('flight-log').prepend(li);while($('flight-log').children.length>24)$('flight-log').lastChild.remove();}
function manual(){if(flight.state.mode!=='manual'){flight.state.mode='manual';log('Manual control selected.','Manuelle Steuerung gewählt.');}update();}
function update(){
 const s=flight.state,fuel=100*s.fuel/s.initialFuel;
 $('altitude').textContent=s.h.toFixed(s.h<100?1:0).padStart(5,'0');$('vertical').textContent=(s.vy<0?'−':'+')+Math.abs(s.vy).toFixed(2).padStart(5,'0');$('horizontal').textContent=(s.vx<0?'−':'+')+Math.abs(s.vx).toFixed(2).padStart(5,'0');$('fuel').textContent=fuel.toFixed(1);
 for(const [id,val] of [['altitude',s.h/6000],['vertical',Math.abs(s.vy)/45],['horizontal',Math.abs(s.vx)/80],['fuel',fuel/100]])$(id+'-bar').style.height=clamp(val*100,0,100)+'%';
 $('angle-value').textContent=s.angle.toFixed(1)+'°';$('attitude-line').style.transform=`rotate(${s.angle}deg)`;
 $('throttle').value=Math.round(s.throttle*100);$('throttle-output').textContent=Math.round(s.throttle*100)+'%';$('attitude').value=Math.round(s.angle);$('attitude-output').textContent=s.angle.toFixed(0)+'°';
 $('engine-status').textContent=s.status==='ready'?t('● ENGINE ARMED','● TRIEBWERK BEREIT'):s.status==='paused'?t('○ ENGINE HELD','○ TRIEBWERK PAUSIERT'):t(s.status==='running'&&s.throttle>0&&s.fuel>0?'● ENGINE FIRING':'○ ENGINE OFF',s.status==='running'&&s.throttle>0&&s.fuel>0?'● TRIEBWERK AKTIV':'○ TRIEBWERK AUS');
 $('target-offset').textContent=(s.x-s.target).toFixed(1)+' M';$('phase-badge').textContent='P'+s.phase;$('window-time').textContent='SIM T+'+seconds(s.t);
 $('view-guidance').textContent=({63:t('P63 / BRAKING','P63 / BREMSPHASE'),64:t('P64 / APPROACH','P64 / ANFLUG'),66:t('P66 / FINAL DESCENT','P66 / ENDABSTIEG')})[s.phase];
 $('take-control').textContent=t(s.mode==='guided'?'GUIDANCE: AUTO':'GUIDANCE: MANUAL',s.mode==='guided'?'STEUERUNG: AUTO':'STEUERUNG: MANUELL');$('take-control').setAttribute('aria-pressed',String(s.mode==='guided'));
 const ended=['landed','crashed','out-of-range'].includes(s.status);$('start').disabled=s.status==='running'||ended;$('pause').disabled=!['running','paused'].includes(s.status);$('pause').textContent=s.status==='paused'?t('RESUME','FORTSETZEN'):t('PAUSE','PAUSE');
 for(const id of ['throttle','attitude','hover','engine-cut','level','take-control','target'])$(id).disabled=ended;
 $('view-overlay').hidden=s.status!=='ready';if(s.status==='ready')$('entry-description').textContent=s.scenario==='full'?t('6,000 metres above the Moon. Follow a reconstructed P63–P66 descent.','6.000 Meter über dem Mond. Verfolge einen rekonstruierten P63–P66-Abstieg.'):t('120 metres above the Moon. The next move is yours.','120 Meter über dem Mond. Der nächste Schritt gehört dir.');
 let status='';
 if(s.status==='ready')status=s.scenario==='full'?t('READY / Guided model descent from 6,000 m. Press START; take over whenever you wish.','BEREIT / Geführter Modellabstieg aus 6.000 m. START drücken; du kannst jederzeit übernehmen.'):t('READY / Approx. 27% thrust hovers. Reduce gently to descend. Final target radius: 40 m.','BEREIT / Etwa 27 % Schub halten die Höhe. Zum Sinken sanft reduzieren. Zielradius: 40 m.');
 if(s.status==='paused')status=t('PAUSED / Instruments hold the current state. Resume when ready.','PAUSE / Instrumente halten den aktuellen Zustand. Bei Bereitschaft fortsetzen.');
 if(s.status==='running')status=t(s.mode==='guided'?'GUIDED MODEL / Feedback guidance is controlling thrust and tilt. You can take over.':'MANUAL / Land at ≤2.5 m/s vertical, ≤1.5 m/s horizontal, ≤8° tilt; within 40 m of the target.',s.mode==='guided'?'GEFÜHRTES MODELL / Ein Rückkopplungsregler steuert Schub und Neigung. Du kannst übernehmen.':'MANUELL / Landung mit ≤2,5 m/s vertikal, ≤1,5 m/s horizontal, ≤8° Neigung; höchstens 40 m vom Ziel.');
 if(s.status==='landed')status=t(`TOUCHDOWN / Safe landing. Vertical ${Math.abs(s.impact.vy).toFixed(2)} m/s; horizontal ${Math.abs(s.impact.vx).toFixed(2)} m/s; target error ${s.impact.error.toFixed(1)} m.`,`BODENKONTAKT / Sichere Landung. Vertikal ${Math.abs(s.impact.vy).toFixed(2)} m/s; horizontal ${Math.abs(s.impact.vx).toFixed(2)} m/s; Zielabstand ${s.impact.error.toFixed(1)} m.`);
 if(s.status==='crashed')status=t(`LANDING FAILED / Impact: vertical ${Math.abs(s.impact.vy).toFixed(2)} m/s; horizontal ${Math.abs(s.impact.vx).toFixed(2)} m/s; tilt ${Math.abs(s.impact.angle).toFixed(1)}°; target error ${s.impact.error.toFixed(1)} m.`,`LANDUNG GESCHEITERT / Aufprall: vertikal ${Math.abs(s.impact.vy).toFixed(2)} m/s; horizontal ${Math.abs(s.impact.vx).toFixed(2)} m/s; Neigung ${Math.abs(s.impact.angle).toFixed(1)}°; Zielabstand ${s.impact.error.toFixed(1)} m.`);
 if(s.status==='out-of-range')status=t('TRAINING LIMIT REACHED / Restart the scenario.','TRAININGSGRENZE ERREICHT / Szenario neu starten.');
 if(s.status==='running'&&s.fuel===0)status+=t(' / TANKS EMPTY: NO ENGINE THRUST.',' / TANKS LEER: KEIN TRIEBWERKSSCHUB.');else if(s.status==='running'&&fuel<15)status+=t(' / LOW FUEL: BELOW 15% OF SCENARIO SUPPLY.',' / WENIG TREIBSTOFF: UNTER 15 % DES SZENARIOVORRATS.');
 if($('flight-status').textContent!==status)$('flight-status').textContent=status;
 $('flight-status').classList.toggle('success',s.status==='landed');$('flight-status').classList.toggle('failure',s.status==='crashed'||s.status==='out-of-range');
 dskyUpdate();
}
function draw(){if(viewport&&visible&&canvasVisible&&!document.hidden&&!$('landing-panel').hidden){viewport.draw(flight.state);renderCount++;}}
function stopLoop(){if(raf)cancelAnimationFrame(raf);raf=0;last=0;}
function pause(reason){flight.pause();stopLoop();update();if(reason)log(reason[0],reason[1]);}
function tick(now){raf=0;if(flight.state.status!=='running'||document.hidden||!visible||$('landing-panel').hidden){pause();return;}
 const dt=last?Math.min((now-last)/1000,.1):0;last=now;
 flight.advance(dt*Number($('sim-speed').value));
 if(now-telemetry>=100){update();telemetry=now;}
 if(now-paint>=(motion.matches?500:1000/30)){draw();paint=now;}
 if(oldPhase!==flight.state.phase){oldPhase=flight.state.phase;log('Reconstructed phase P'+oldPhase,'Rekonstruierte Phase P'+oldPhase);}
 if(flight.state.status==='running')raf=requestAnimationFrame(tick);else{update();draw();log(flight.state.status==='landed'?'Safe model touchdown.':'Training attempt ended.',flight.state.status==='landed'?'Sicherer Modell-Bodenkontakt.':'Trainingsversuch beendet.');last=0;}
}
function start(){flight.start();if(flight.state.status!=='running')return;update();if(!raf){last=0;raf=requestAnimationFrame(tick);}log('Simulation running.','Simulation läuft.');}
function restart(){stopLoop();flight.restart($('scenario').value);dsky.reset();$('target').value='0';oldPhase=flight.state.phase;$('flight-log').replaceChildren();update();draw();log('Scenario initialized.','Szenario initialisiert.');}
$('start').onclick=start;$('begin').onclick=start;$('pause').onclick=()=>flight.state.status==='running'?pause():start();$('restart').onclick=restart;$('scenario').onchange=restart;
$('throttle').oninput=()=>{const value=Number($('throttle').value)/100;manual();flight.state.throttle=value;update();draw();};
$('attitude').oninput=()=>{const value=Number($('attitude').value);manual();flight.state.angle=value;update();draw();};
$('hover').onclick=()=>{manual();flight.state.throttle=hoverThrottle(flight.state)/Math.max(.7,Math.cos(flight.state.angle*Math.PI/180));update();draw();};
$('engine-cut').onclick=()=>{manual();flight.state.throttle=0;update();draw();log('Engine stopped.','Triebwerk gestoppt.');};
$('level').onclick=()=>{manual();flight.state.angle=0;update();draw();};
$('take-control').onclick=()=>{if(flight.state.mode==='guided')manual();else{flight.state.mode='guided';log('Model guidance enabled.','Modell-Flugführung aktiviert.');update();}};
$('target').onchange=()=>{const target=Number($('target').value);manual();flight.state.target=target;update();draw();log('Landing site changed to '+target+' m.','Landeplatz auf '+target+' m geändert.');};
function dskyKey(key){const result=dsky.key(key,flight.state);if(result.type==='manual')manual();dskyUpdate();}
$('dsky-keys').onclick=e=>{const b=e.target.closest('[data-key]');if(b)dskyKey(b.dataset.key);};
$('dsky-keys').onkeydown=e=>{if(e.key==='Enter'&&e.target.matches('button'))return;const key=keyboardKey(e);if(key){e.preventDefault();dskyKey(key);}};
const consoleEl=document.querySelector('.flight-console');consoleEl.tabIndex=0;consoleEl.setAttribute('aria-label',t('Flight console. Focus here for arrow and Space shortcuts.','Flugkonsole. Hier fokussieren für Pfeil- und Leertastenkürzel.'));
consoleEl.onkeydown=e=>{if(e.target!==consoleEl)return;const s=flight.state;if(['landed','crashed','out-of-range'].includes(s.status))return;if(e.key===' '){e.preventDefault();s.status==='running'?pause():start();return;}if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();manual();if(e.key==='ArrowUp')s.throttle=clamp(s.throttle+.01,0,1);if(e.key==='ArrowDown')s.throttle=clamp(s.throttle-.01,0,1);if(e.key==='ArrowLeft')s.angle=clamp(s.angle-1,-40,40);if(e.key==='ArrowRight')s.angle=clamp(s.angle+1,-40,40);update();draw();}};
const ops=document.querySelector('.operations-grid');
function experience(computer){
 pause();
 $('landing-panel').hidden=computer;
 $('engineering').hidden=!computer;
 $('cockpit').setAttribute('data-experience',computer?'computer':'landing');
 $('flight-status').hidden=computer;
 document.querySelector('.flight-help').hidden=computer;
 $('land-mode').setAttribute('aria-pressed',String(!computer));
 $('computer-mode').setAttribute('aria-pressed',String(computer));
 ops.classList.toggle('computer-operations',computer);
 // Move the existing viewer, preserving its selected file, IDs and keyboard focus targets.
 (computer?$('engineering-source'):ops).append($('source-panel'));
 if(computer){loadSource();$('engineering').focus({preventScroll:true});}
 else{$('cockpit').focus({preventScroll:true});draw();}
 $('cockpit').scrollIntoView({block:'start',behavior:motion.matches?'instant':'smooth'});
}
$('land-mode').onclick=()=>experience(false);$('computer-mode').onclick=()=>experience(true);
function historyUpdate(){const idx=Number($('history-event').value),event=events[idx];$('history-detail').replaceChildren();const time=document.createElement('time'),p=document.createElement('p');time.textContent=event.get;p.textContent=event[de?'de':'en'];$('history-detail').append(time,p);$('history-prev').disabled=idx===0;$('history-next').disabled=idx===events.length-1;$('history-event').setAttribute('aria-valuetext',event.get+' '+event[de?'de':'en']);}
$('history-event').oninput=historyUpdate;$('history-prev').onclick=()=>{$('history-event').value=Number($('history-event').value)-1;historyUpdate();};$('history-next').onclick=()=>{$('history-event').value=Number($('history-event').value)+1;historyUpdate();};$('history-alarm').onclick=()=>{$('alarm-lab').scrollIntoView({behavior:motion.matches?'instant':'smooth'});document.querySelector('[data-alarm="1202"]').focus({preventScroll:true});};
const instructions={TC:t('TC — Transfer Control. Branch to a subroutine and place a return address in Q.','TC — Transfer Control. Unterprogramm anspringen und Rücksprungadresse in Q ablegen.'),TCF:t('TCF — Transfer Control Fixed. Branch within fixed memory; does not set a subroutine return in Q.','TCF — Transfer Control Fixed. Sprung im Festspeicher; legt keinen Unterprogramm-Rücksprung in Q ab.'),CA:t('CA — Clear and Add. Load the addressed word into the accumulator A.','CA — Clear and Add. Das adressierte Wort in den Akkumulator A laden.'),TS:t('TS — Transfer to Storage. Store A, with AGC overflow handling.','TS — Transfer to Storage. A speichern, mit AGC-Überlaufbehandlung.'),OCT:t('OCT — Assembler directive for an octal constant, not an executed instruction. Alarm codes 1201 and 1202 are octal values.','OCT — Assemblerdirektive für eine Oktalkonstante, kein ausgeführter Befehl. Die Alarmcodes 1201 und 1202 sind Oktalwerte.')};
document.querySelectorAll('[data-instruction]').forEach(b=>b.onclick=()=>{$('instruction-help').textContent=instructions[b.dataset.instruction];document.querySelectorAll('[data-instruction]').forEach(n=>n.setAttribute('aria-pressed',String(n===b)));});
function alarm(code){document.querySelector('[data-task="display"]').classList.add('dropped');document.querySelector('[data-task="display"] strong').textContent=t('DISCARDED','VERWORFEN');document.querySelectorAll('[data-task]:not([data-task="display"]) strong').forEach(n=>n.textContent=t('RESTORED','WIEDERHERGESTELLT'));$('alarm-explanation').textContent=(code==='1202'?t('1202: no core set was free for another job. ','1202: Für eine weitere Aufgabe war kein Core-Set frei. '):t('1201: no VAC area was free for an interpretive job. ','1201: Für eine Interpreter-Aufgabe war kein VAC-Bereich frei. '))+t('This schematic restart drops the display job and restores protected guidance/navigation. Real restart tables were more complex. No flight or CPU overload was generated.','Der schematische Restart verwirft die Anzeigeaufgabe und stellt geschützte Flugführung/Navigation wieder her. Die echten Restart-Tabellen waren komplexer. Kein Flugfehler und keine CPU-Überlastung wurden erzeugt.');}
document.querySelectorAll('[data-alarm]').forEach(b=>b.onclick=()=>alarm(b.dataset.alarm));$('alarm-reset').onclick=()=>{document.querySelector('[data-task="display"]').classList.remove('dropped');document.querySelector('[data-task="display"] strong').textContent=t('QUEUED','WARTET');document.querySelectorAll('[data-task]:not([data-task="display"]) strong').forEach(n=>n.textContent=t('PROTECTED','GESCHÜTZT'));$('alarm-explanation').textContent=t('Lesson reset. Select 1201 or 1202 to compare work-area exhaustion.','Lektion zurückgesetzt. Mit 1201 oder 1202 die Erschöpfung der Arbeitsbereiche vergleichen.');};
const escape=text=>text.replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const sourceCache=new Map();
async function loadSource(){
 const token=++sourceToken,file=$('source-file').value;if(!['LUNAR_LANDING_GUIDANCE_EQUATIONS','EXECUTIVE','ALARM_AND_ABORT'].includes(file))return;
 $('source-code').textContent=t('Loading local source…','Lokaler Quellcode wird geladen…');
 try{let content=sourceCache.get(file);if(!content){const response=await fetch('/assets/apollo-11/source/'+file+'.agc');if(!response.ok)throw Error('HTTP '+response.status);content=await response.text();sourceCache.set(file,content);}if(token!==sourceToken)return;
 const lines=content.split('\n'),ranges=file==='EXECUTIVE'?[[132,152],[200,210]]:file==='ALARM_AND_ABORT'?[[31,74]]:[[33,82]];
 let html='';for(const [start,end]of ranges){if(html)html+='<span class="source-line code-comment">    …</span>';for(let i=start-1;i<Math.min(end,lines.length);i++){const raw=lines[i],comment=raw.indexOf('#'),body=comment<0?raw:raw.slice(0,comment),note=comment<0?'':raw.slice(comment);const code=escape(body).replace(/\b(TCF|TC|CA|TS|OCT|EBANK|COUNT|CCS|LXCH|AD|ZL|INDEX|ADS|CAF|BZMF|INHINT)\b/g,'<span class="code-op">$1</span>');html+=`<span class="source-line"><span class="line-number">${String(i+1).padStart(4,' ')} </span>${code}<span class="code-comment">${escape(note)}</span></span>`;}}
 $('source-code').innerHTML=html;$('source-code').scrollTop=0;$('source-download').href='/assets/apollo-11/source/'+file+'.agc';$('source-original').href='https://www.ibiblio.org/apollo/listings/Luminary099/'+file+'.agc.html';$('source-caption').textContent=t('LMY99 revision 001 · selected original lines · not an execution trace.','LMY99 Revision 001 · ausgewählte Originalzeilen · keine Ausführungsspur.');
 }catch{$('source-code').textContent=t('Local source could not be loaded. Select a file to retry, or use the complete-file link.','Lokaler Quellcode konnte nicht geladen werden. Datei zum erneuten Laden wählen oder den Link zur vollständigen Datei nutzen.');}
}
$('source-file').onchange=loadSource;
new IntersectionObserver((entries,observer)=>{if(entries.some(e=>e.isIntersecting)){loadSource();observer.disconnect();}},{rootMargin:'300px'}).observe($('source-code'));
document.addEventListener('visibilitychange',()=>{if(document.hidden&&flight.state.status==='running')pause(['Hidden tab: flight paused.','Versteckter Tab: Flug pausiert.']);});
new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(!visible&&flight.state.status==='running')pause(['Cockpit out of view: paused.','Cockpit außerhalb der Ansicht: pausiert.']);else if(visible)draw();},{threshold:0}).observe($('cockpit'));
new IntersectionObserver(entries=>{canvasVisible=entries[0].isIntersecting;if(canvasVisible)draw();},{threshold:0}).observe($('lunar-view'));
let resizeTimer;addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(draw,120);});
motion.addEventListener('change',()=>{if(viewport)viewport.reduced=motion.matches;draw();});
update();historyUpdate();log('Scenario initialized.','Szenario initialisiert.');
// Runtime diagnostics expose read-only snapshots for QA; they cannot mutate the flight.
Object.defineProperty(window,'apolloDiagnostics',{value:Object.freeze({snapshot:()=>structuredClone(flight.state),frames:()=>renderCount,running:()=>!!raf})});
import('./viewport.mjs').then(({LunarViewport})=>{viewport=new LunarViewport($('lunar-view'),{reduced:motion.matches,label:t('LANDING SITE','LANDEPLATZ')});draw();window.apolloReady=true;}).catch(()=>{$('lunar-view').setAttribute('aria-label',t('Viewport unavailable. Flight instruments and controls still work.','Ansicht nicht verfügbar. Fluginstrumente und Steuerung funktionieren weiterhin.'));window.apolloReady=true;});
