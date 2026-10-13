import {normalizeConfig,createPhases,SETS,DICTIONARY} from './search.js';
import {makeEngines,probeGPU,benchmark,CrackSession} from './coordinator.js';
const de=document.documentElement.lang==='de',locale=de?'de-DE':'en-US';
const text=de?{
  idle:'BEREIT · NUR LOKAL',preparing:'LOKALES HASH WIRD VORBEREITET',calibrating:'REALE LEISTUNG WIRD GEMESSEN',ready:'MESSUNG ABGESCHLOSSEN',running:'SUCHE LÄUFT',pausing:'LAUFENDE BEREICHE WERDEN ABGESCHLOSSEN',paused:'PAUSIERT · SITZUNG ERHALTEN',verifying:'TREFFER WIRD UNABHÄNGIG VERIFIZIERT',success:'PASSWORT WIEDERHERGESTELLT',exhausted:'SUCHRAUM VOLLSTÄNDIG GEPRÜFT',stopped:'DURCH DICH GESTOPPT',error:'BERECHNUNG BEENDET · FEHLER',
  enter:'Gib ein erfundenes Testpasswort ein.',invalid:'Bitte prüfe Längen und Zeichensätze. Die Mindestlänge darf nicht größer als die Höchstlänge sein.',secure:'Die lokale Hash-Prüfung benötigt HTTPS oder localhost und Web Crypto.',checking:'WebGPU wird mit einem echten Shader-Selbsttest geprüft …',gpuReady:'Physische GPU verfügbar: ',gpuOff:'GPU und Hybrid deaktiviert. ',software:'Hier steht nur ein Softwareadapter zur Verfügung.',unavailable:'Kein geeigneter WebGPU-Adapter in diesem Browser oder Worker.',
  numeric:'Numerische Suche',dictionary:'Wörterbuch',brute:'Brute Force',chars:'Zeichen',suffix:'Suffix-Ziffern',original:'Originalschreibweise',variants:'Original / Anfang groß / GROSS',waiting:'Offen',partial:'Teilweise geprüft',active:'Aktiv',complete:'Abgeschlossen',
  none:'Noch kein Bereich zugewiesen',range:'Lückenlos bestätigt',inFlight:'Bereiche in Arbeit',remaining:'Geschätzte Restdauer',full:'Geschätzte vollständige Suche',measureFirst:'Zuerst Leistung messen',unknown:'Noch nicht verlässlich schätzbar',liveRate:'Aktuell gemessen · Kandidaten/s',averageRate:'Laufdurchschnitt · Kandidaten/s',calibrationRate:'Kalibrierung · Kandidaten/s',
  reveal:'Lokal anzeigen',hide:'Ausblenden',found:'Der Treffer wurde aus dem gewählten Suchraum erzeugt, per SHA-256 gefunden und nochmals mit Web Crypto bestätigt. Er wird nur auf deine Anforderung angezeigt.',
  outside:'Alle konfigurierten Kandidaten wurden geprüft, ohne Treffer. Das ist keine Aussage darüber, ob das Passwort sicher ist: andere Wörter, Längen oder Zeichen bleiben ungeprüft.',cancelled:'Die Suche wurde beendet. Bestätigte Versuche bleiben sichtbar; noch laufende Bereiche werden nicht mitgezählt. Ein Abbruch beweist keine Passwortsicherheit.',failed:'Die Berechnung wurde mit einem Fehler gestoppt. Es wird kein Ersatzlauf als GPU-Leistung ausgegeben.',
  before:'Schätzung vor dem Lauf',foundStrategy:'Trefferstrategie',engine:'Treffer-Engine',seconds:'s',years:'Jahre',below:'unter 0,001 %',hiddenTab:'Der Tab wurde verborgen. Die Suche wird pausiert; Fortsetzen ist in dieser offenen Sitzung möglich.'
}:{
  idle:'READY · LOCAL ONLY',preparing:'PREPARING THE LOCAL HASH',calibrating:'MEASURING REAL PERFORMANCE',ready:'MEASUREMENT COMPLETE',running:'SEARCH RUNNING',pausing:'DRAINING ASSIGNED RANGES',paused:'PAUSED · SESSION RETAINED',verifying:'INDEPENDENTLY VERIFYING MATCH',success:'PASSWORD RECOVERED',exhausted:'SEARCH SPACE FULLY CHECKED',stopped:'STOPPED BY YOU',error:'COMPUTATION ENDED · ERROR',
  enter:'Enter an invented test password.',invalid:'Check lengths and character sets. The minimum length must not exceed the maximum.',secure:'Local hash verification needs HTTPS or localhost and Web Crypto.',checking:'Checking WebGPU with a real shader self-test …',gpuReady:'Physical GPU available: ',gpuOff:'GPU and Hybrid disabled. ',software:'Only a software adapter is available here.',unavailable:'No suitable WebGPU adapter in this browser or worker.',
  numeric:'Numeric search',dictionary:'Dictionary',brute:'Brute force',chars:'characters',suffix:'suffix digits',original:'Original spelling',variants:'Original / Title case / UPPERCASE',waiting:'Not searched',partial:'Partly checked',active:'Active',complete:'Complete',
  none:'No range assigned yet',range:'Contiguously confirmed',inFlight:'ranges in flight',remaining:'Estimated remaining time',full:'Estimated full search',measureFirst:'Measure performance first',unknown:'Not reliably estimable yet',liveRate:'Currently measured · candidates/s',averageRate:'Run average · candidates/s',calibrationRate:'Calibration · candidates/s',
  reveal:'Reveal locally',hide:'Hide',found:'The matching candidate was generated within the selected space, found through SHA-256 comparison, and independently confirmed with Web Crypto. It is shown only when you request it.',
  outside:'Every configured candidate was checked without a match. This does not establish password safety: other words, lengths and characters remain untested.',cancelled:'The search has ended. Confirmed attempts remain visible; unfinished ranges are not counted. Stopping does not establish password safety.',failed:'Computation stopped with an error. No replacement CPU run is reported as GPU performance.',
  before:'Estimate before the run',foundStrategy:'Matching strategy',engine:'Matching engine',seconds:'s',years:'years',below:'below 0.001%',hiddenTab:'The tab was hidden. The search is pausing; it can resume within this open session.'
};
const $=id=>document.getElementById(id),number=new Intl.NumberFormat(locale),short=new Intl.NumberFormat(locale,{maximumFractionDigits:0});
const controls=['strategy','mode','workers','min','max','numeric-max','suffix','variants','digits','lower','upper','symbols'];
const busyStates=['preparing','calibrating','running','pausing','paused','verifying'];
let state='idle',session=null,snapshot=null,engines=[],calibration=null,calibrationKey=null,estimateBefore=null,operation=0,revealed=false,phases=[],message=null;
function duration(seconds){
  if(!Number.isFinite(seconds)||seconds<0)return text.unknown;
  if(seconds<60)return new Intl.NumberFormat(locale,{maximumFractionDigits:seconds<1?3:1}).format(seconds)+' '+text.seconds;
  if(seconds<3600)return new Intl.NumberFormat(locale,{maximumFractionDigits:1}).format(seconds/60)+' min';
  if(seconds<86400)return new Intl.NumberFormat(locale,{maximumFractionDigits:1}).format(seconds/3600)+' h';
  if(seconds<31557600)return new Intl.NumberFormat(locale,{maximumFractionDigits:1}).format(seconds/86400)+(de?' Tage':' days');
  const years=seconds/31557600;return (years<1e8?new Intl.NumberFormat(locale,{maximumFractionDigits:1}).format(years):years.toExponential(2))+' '+text.years;
}
function config(){return normalizeConfig({strategy:$('strategy').value,min:$('min').value,max:$('max').value,numericMax:$('numeric-max').value,suffix:$('suffix').value,variants:$('variants').checked,...Object.fromEntries(Object.keys(SETS).map(key=>[key,$(key).checked]))});}
function phaseName(phase){return phase.kind==='dictionary'?text.dictionary+' · '+(phase.variants?text.variants:text.original)+' · '+phase.suffixDigits+' '+text.suffix:text[phase.kind]+' · '+phase.length+' '+text.chars;}
function setState(value,reason=null){state=value;message=reason;document.body.dataset.state=value;render();}
function errorMessage(error){const reason=error.message||String(error);if(/Invalid search length|Minimum length exceeds|Select at least one|Unknown strategy/.test(reason))return text.invalid;if(/Invalid CPU worker count/.test(reason))return de?'Wähle eine gültige Anzahl CPU-Worker.':'Choose a valid CPU worker count.';return reason;}
function clearReveal(){revealed=false;$('recovered').textContent='';$('reveal').textContent=text.reveal;}
function drawRows(){
  $('phase-rows').replaceChildren();phases.forEach((phase,index)=>{
    const row=document.createElement('tr');row.dataset.phase=index;
    for(const value of [phaseName(phase),'0 / '+number.format(phase.count),text.waiting]){const cell=document.createElement('td');cell.textContent=value;row.append(cell);}
    $('phase-rows').append(row);
  });
}
function render(){
  const busy=busyStates.includes(state),running=state==='running',terminal=['success','exhausted','stopped','error'].includes(state);
  for(const id of controls)$(id).disabled=busy;
  $('password').disabled=busy;$('intensity').disabled=['preparing','calibrating'].includes(state);
  $('start').disabled=busy||!crypto?.subtle;$('measure').disabled=busy||!crypto?.subtle;
  $('pause').disabled=!running;$('resume').disabled=state!=='paused';$('stop').disabled=!busy;
  document.querySelectorAll('[data-example]').forEach(button=>button.disabled=busy);
  const c=(()=>{try{return config();}catch{return null;}})();
  if(!busy&&c){$('numeric-max').disabled=c.strategy!=='smart';$('min').disabled=c.strategy==='dictionary';$('max').disabled=c.strategy==='dictionary';$('suffix').disabled=!['smart','dictionary'].includes(c.strategy);$('variants').disabled=!['smart','dictionary'].includes(c.strategy);}
  const status=message||text[state];if($('status').textContent!==status)$('status').textContent=status;
  const s=snapshot,total=s?.total??phases.reduce((n,p)=>n+p.count,0n),checked=s?.checked??0n;
  $('checked').textContent=number.format(checked);$('space').textContent=number.format(total);$('elapsed').textContent=duration((s?.elapsed??0)/1000);
  const scale=total?Number(checked*100000n/total):0;$('progress').value=scale/1000;$('progress-label').textContent=checked>0n&&scale===0?text.below:new Intl.NumberFormat(locale,{maximumFractionDigits:3}).format(scale/1000)+'%';
  let cpu=0,gpu=0,rate=0;
  if(s){cpu=terminal?s.cpuAverage:s.cpu;gpu=terminal?s.gpuAverage:s.gpu;rate=terminal?s.average:s.combined;}
  else if(calibration){cpu=calibration.cpu;gpu=calibration.gpu;rate=calibration.combined;}
  $('rate-label').textContent=s?(terminal?text.averageRate:text.liveRate):text.calibrationRate;
  for(const [id,value] of [['cpu-rate',cpu],['gpu-rate',gpu],['rate',rate]])$(id).textContent=(value>0?short.format(value):'—');
  $('cpu-meter').style.width=(rate?Math.min(100,cpu/rate*100):0)+'%';$('gpu-meter').style.width=(rate?Math.min(100,gpu/rate*100):0)+'%';
  const estimateRate=s?.average>0?s.average:calibration?.combined;
  $('estimate').textContent=estimateRate>0?duration(Number(total)/estimateRate):text.measureFirst;
  $('remaining').textContent=s&&['running','pausing','paused'].includes(state)&&estimateRate>0?duration(Number(total-checked)/estimateRate):'—';
  $('active-strategy').textContent=s?.strategy?phaseName(s.phases[s.strategy.phaseIndex]):text.none;
  const frontier=s?.frontier??0n;$('ranges').textContent=text.range+': '+(frontier?'0–'+number.format(frontier-1n):'—')+' · '+(s?.pending??0)+' '+text.inFlight;
  $('bench-checked').textContent=calibration?number.format(calibration.checked):'—';
  if(c){$('charset').textContent=c.strategy==='numeric'?SETS.digits:c.strategy==='dictionary'?DICTIONARY.join(', '):c.charset;$('intensity-value').textContent=$('intensity').value+'%';}
  if(s?.phaseChecked)for(const row of $('phase-rows').children){const index=Number(row.dataset.phase),done=s.phaseChecked[index],p=s.phases[index];row.children[1].textContent=number.format(done)+' / '+number.format(p.count);row.classList.toggle('phase-active',s.strategy?.phaseIndex===index&&['running','pausing','verifying'].includes(state));row.classList.toggle('phase-done',done===p.count);row.children[2].textContent=done===p.count?text.complete:row.classList.contains('phase-active')?text.active:done>0n?text.partial:text.waiting;}
  $('result').hidden=!terminal;$('result').className='result '+state;
  $('result-title').textContent=text[state];$('result-message').textContent=state==='success'?text.found:state==='exhausted'?text.outside:state==='stopped'?text.cancelled:text.failed+(s?.error?' '+s.error:'');
  $('reveal').hidden=state!=='success';$('result-details').hidden=state!=='success';
  if(state==='success'&&s?.result){$('result-strategy').textContent=phaseName(s.result.phase);$('result-engine').textContent=s.result.engine.toUpperCase();$('result-before').textContent=estimateBefore===null?'—':duration(estimateBefore);}
}
function refreshConfig(){try{phases=createPhases(config());drawRows();render();}catch{phases=[];drawRows();setState('idle',text.invalid);}}
function cancel(reset=false){operation++;for(const engine of engines)engine.close();engines=[];session?.clear();session=null;snapshot=null;clearReveal();estimateBefore=null;$('password').value='';if(reset){calibration=null;calibrationKey=null;}setState(reset?'idle':'stopped');refreshConfig();}
async function prepare(startAttack){
  const epoch=++operation;clearReveal();session?.clear();session=null;snapshot=null;engines=[];let target=null,created=[];
  try{
    if(!$('password').value){setState('idle',text.enter);return;}
    if(!crypto?.subtle)throw new Error(text.secure);
    const c=config(),mode=$('mode').value,workers=Number($('workers').value),intensity=Number($('intensity').value),key=JSON.stringify({c,mode,workers,intensity});
    phases=createPhases(c);drawRows();setState('preparing');
    let plaintext=$('password').value;const bytes=new TextEncoder().encode(plaintext);plaintext='';let digest;
    try{digest=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));target=Array.from(digest,b=>b.toString(16).padStart(2,'0')).join('');}finally{bytes.fill(0);digest?.fill(0);}
    if(epoch!==operation)return;if(startAttack)$('password').value='';
    const ready=await makeEngines(mode,workers,{onCreated:engine=>{created.push(engine);if(epoch===operation)engines.push(engine);else engine.close();}});
    if(epoch!==operation){ready.forEach(e=>e.close());return;}engines=ready;
    if(!startAttack||!calibration||calibrationKey!==key){
      setState('calibrating');const measured=await benchmark(engines,createPhases({strategy:'numeric',min:6,max:6})[0],target,intensity);
      if(epoch!==operation)return;calibration=measured;calibrationKey=key;
    }
    if(!startAttack){engines.forEach(e=>e.close());engines=[];target=null;setState('ready');return;}
    estimateBefore=Number(phases.reduce((n,p)=>n+p.count,0n))/calibration.combined;
    session=new CrackSession({config:c,target,engines,intensity,onUpdate:value=>{if(epoch!==operation)return;snapshot=value;state=value.state;message=null;document.body.dataset.state=state;render();}});
    target=null;session.start();
  }catch(error){if(epoch===operation){created.forEach(e=>e.close());engines=[];const reason=errorMessage(error);snapshot={error:reason};setState('error',reason);}}
  finally{target=null;if(epoch!==operation)created.forEach(e=>e.close());}
}
for(const id of controls)$(id).addEventListener('change',()=>{if(!busyStates.includes(state)){session?.clear();session=null;snapshot=null;clearReveal();calibration=null;calibrationKey=null;setState('idle');refreshConfig();}});
$('password').addEventListener('input',()=>{if(!busyStates.includes(state)){session?.clear();session=null;snapshot=null;clearReveal();setState('idle');refreshConfig();}});
$('intensity').addEventListener('input',()=>{if(session&&['running','paused','pausing'].includes(state))session.intensity=Number($('intensity').value);else{calibration=null;calibrationKey=null;}render();});
$('start').addEventListener('click',()=>prepare(true));$('measure').addEventListener('click',()=>prepare(false));$('pause').addEventListener('click',()=>session?.pause());$('resume').addEventListener('click',()=>session?.resume());$('stop').addEventListener('click',()=>{if(session)session.stop();else cancel(false);});$('reset').addEventListener('click',()=>cancel(true));
$('reveal').addEventListener('click',()=>{if(state!=='success'||!snapshot?.result)return;revealed=!revealed;$('recovered').textContent=revealed?snapshot.result.candidate:'';$('reveal').textContent=revealed?text.hide:text.reveal;});
document.querySelectorAll('[data-example]').forEach(button=>button.addEventListener('click',()=>{
  cancel(true);const example=button.dataset.example;$('password').value=example;$('mode').value='cpu';
  if(example==='katharina2482'){$('strategy').value='dictionary';$('suffix').value='4';$('variants').checked=false;}
  else if(example==='123!'){$('strategy').value='brute';$('min').value='1';$('max').value='4';$('digits').checked=true;$('lower').checked=false;$('upper').checked=false;$('symbols').checked=true;}
  else{$('strategy').value='numeric';$('min').value='1';$('max').value='3';}
  refreshConfig();$('password').focus();
}));
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='running'){session.pause();message=text.hiddenTab;render();}});
window.addEventListener('pagehide',()=>{operation++;session?.clear();engines.forEach(e=>e.close());$('password').value='';clearReveal();});
const useful=Math.max(1,Math.min(8,(navigator.hardwareConcurrency||2)-1));$('workers').max=useful;$('workers').value=Math.min(4,useful);
refreshConfig();$('gpu-capability').textContent=text.checking;
const capability=await probeGPU();
for(const option of $('mode').options)if(option.value!=='cpu')option.disabled=!capability.available;
$('gpu-capability').textContent=capability.available?text.gpuReady+capability.description:text.gpuOff+(/software/i.test(capability.reason)?text.software:text.unavailable);
window.passwordLabReady=true;
setInterval(()=>{if(session&&['running','pausing','paused','verifying'].includes(state)){snapshot=session.snapshot();render();}},150);
