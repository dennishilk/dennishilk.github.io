import {normalizeConfig,createPhases,DICTIONARIES,DICTIONARY_COUNTS,BLIND_LIMITS,dictionaryBases} from './search.js?v=20261013-blind-1';
import {makeEngines,probeGPU,benchmark,CrackSession} from './coordinator.js?v=20261013-blind-1';
const de=document.documentElement.lang==='de',locale=de?'de-DE':'en-US';
const text=de?{
  idle:'BEREIT',preparing:'VORBEREITUNG',calibrating:'LEISTUNG WIRD GEMESSEN',ready:'MESSUNG ABGESCHLOSSEN',running:'SUCHE LÄUFT',pausing:'WIRD PAUSIERT',paused:'PAUSIERT',verifying:'TREFFER WIRD GEPRÜFT',success:'PASSWORT GEFUNDEN',exhausted:'NICHT GEFUNDEN',stopped:'GESTOPPT',error:'FEHLER',
  idleDetail:'Wähle ein erfundenes Passwort und starte deinen Versuch.',preparingDetail:'Der Ziel-Hash und die Rechen-Engines werden lokal vorbereitet.',calibratingDetail:'Echte Messbatches laufen. Der Angriffszähler bleibt dabei bei null.',readyDetail:'Die Messung ist fertig. Du kannst die Suche jetzt starten.',runningDetail:'Dein Computer prüft echte Kandidaten gegen den lokalen SHA-256-Hash.',pausingDetail:'Bereits vergebene Batches werden noch abgeschlossen.',pausedDetail:'Die Sitzung ist erhalten. Fortsetzen arbeitet mit derselben Bereichsverwaltung.',verifyingDetail:'SHA-256 und Web Crypto bestätigen den Treffer unabhängig.',successDetail:'Dein Computer hat einen passenden Kandidaten bestätigt.',exhaustedDetail:'Der gewählte Suchraum ist vollständig geprüft — ohne Treffer.',stoppedDetail:'Die Rechen-Engines sind beendet. Bestätigte Versuche bleiben sichtbar.',errorDetail:'Dieser Lauf wurde wegen eines Berechnungsfehlers beendet.',
  enter:'Gib ein erfundenes Testpasswort ein.',invalid:'Bitte prüfe Längen und Zeichensätze. Die Mindestlänge darf nicht größer als die Höchstlänge sein.',invalidYear:'Die erste Jahreszahl darf nicht größer als die letzte sein.',workersInvalid:'Wähle eine gültige Anzahl CPU-Worker.',secure:'Die lokale Prüfung benötigt HTTPS oder localhost und Web Crypto.',
  numeric:'Numerische Suche',dictionary:'Wörterbuch',brute:'Brute Force',smart:'Smarte Reihenfolge',chars:'Zeichen',suffix:'Suffix-Ziffern',years:'Jahre',original:'Originalschreibweise',variants:'Groß-/Kleinschreibung',leet:'Leetspeak',waiting:'Offen',partial:'Teilweise geprüft',active:'Aktiv',complete:'Abgeschlossen',
  none:'Keine aktive Suchphase',range:'Lückenlos bestätigte Indizes',inFlight:'offene Bereiche',measureFirst:'Noch nicht gemessen',unknown:'Noch nicht verlässlich schätzbar',liveRate:'Aktuell gemessen',averageRate:'Durchschnitt dieses Laufs',calibrationRate:'Gemessene Kalibrierung',
  reveal:'Passwort lokal anzeigen',hide:'Passwort ausblenden',found:'Der Kandidat wurde tatsächlich gefunden und unabhängig verifiziert. Er bleibt verborgen, bis du ihn lokal anzeigen lässt.',outside:'Dein Passwort wurde im gewählten Suchraum nicht gefunden. Alle konfigurierten Versuche sind abgeschlossen; andere Kandidaten bleiben ungeprüft.',cancelled:'Du hast die Suche gestoppt. Nur abgeschlossene Versuche zählen. Daraus folgt keine Aussage über die Sicherheit des Passworts.',failed:'Die Berechnung wurde beendet. Details zum Fehler findest du unten; es läuft kein versteckter Ersatzangriff.',
  seconds:'s',yearsUnit:'Jahre',below:'unter 0,001 %',hiddenTab:'Der Tab wurde verborgen. Die Suche pausiert und kann in dieser offenen Sitzung fortgesetzt werden.',
  cpuReady:'Bereit',notSelected:'Nicht ausgewählt',cpuActive:'aktive CPU-Worker',resting:'Zwischen den Batches',gpuEncoding:'Kandidaten werden vorbereitet',gpuDispatch:'GPU-Batch wird geprüft',done:'Abgeschlossen',available:'Verfügbar',unavailable:'Nicht verfügbar',notChecked:'Nicht geprüft',present:'Vorhanden',absent:'Nicht vorhanden',
  mainPath:'Hauptthread + Vorbereitungs-Worker',workerPath:'WebGPU im Worker',pathNone:'CPU verfügbar · GPU deaktiviert',checking:'GPU-Unterstützung wird geprüft …',gpuWorker:'GPU verfügbar — ',gpuMain:'GPU verfügbar über den kompatiblen Hauptthread-Modus — ',softwareTest:'WebGPU-Testpfad mit Softwareadapter — ',
  dictionarySummary:'feste Wörter und Wortkombinationen',derived:'eindeutige Wortvarianten',baseWords:'Einzelwörter',wordPairs:'Feste Wortkombinationen',configured:'Konfiguriert',disabledGpu:'Für diesen Modus fehlt ein nutzbarer GPU-Pfad. CPU bleibt auswählbar.',initialization:'Initialisierung',interface:'WebGPU-API',adapter:'Adapter',device:'Gerät',shader:'Shader',pipeline:'Compute-Pipeline',selftest:'SHA-256-Selbsttest',execution:'Berechnung',
  gpuCodes:{'interface-unavailable':'WebGPU ist in diesem Browserkontext nicht verfügbar.','adapter-unavailable':'WebGPU ist vorhanden, aber der Browser stellt keinen nutzbaren Adapter bereit.','adapter-request-failed':'Die GPU-Adapteranfrage ist fehlgeschlagen.','software-adapter':'Es wurde nur ein Softwareadapter erkannt. GPU und Hybrid bleiben deaktiviert.','device-creation-failed':'Der Adapter konnte kein GPU-Gerät bereitstellen.','shader-compilation-failed':'Der SHA-256-Shader konnte nicht übersetzt werden.','pipeline-creation-failed':'Die GPU-Compute-Pipeline konnte nicht erstellt werden.','selftest-failed':'Der GPU-Selbsttest ist fehlgeschlagen.','initialization-timeout':'Die GPU-Initialisierung hat nicht rechtzeitig geantwortet.','preparation-worker-failed':'Der Vorbereitungs-Worker für GPU-Kandidaten konnte nicht starten.','worker-unavailable':'Der GPU-Worker konnte nicht starten.','device-lost':'Das GPU-Gerät wurde verloren. Der Lauf wurde beendet.','execution-failed':'Die GPU-Berechnung ist fehlgeschlagen.','initialization-failed':'Die GPU-Initialisierung ist fehlgeschlagen.'}
}:{
  idle:'READY',preparing:'PREPARING',calibrating:'MEASURING PERFORMANCE',ready:'MEASUREMENT COMPLETE',running:'SEARCHING',pausing:'PAUSING',paused:'PAUSED',verifying:'VERIFYING MATCH',success:'PASSWORD FOUND',exhausted:'NOT FOUND',stopped:'STOPPED',error:'ERROR',
  idleDetail:'Choose an invented password and start your experiment.',preparingDetail:'Preparing the local target hash and compute engines.',calibratingDetail:'Real measurement batches are running. The attack counter stays at zero.',readyDetail:'The measurement is complete. You can start the search now.',runningDetail:'Your computer is checking real candidates against the local SHA-256 hash.',pausingDetail:'Already assigned batches are being completed.',pausedDetail:'The session is retained. Resume continues with the same range ledger.',verifyingDetail:'SHA-256 and Web Crypto independently confirm the matching candidate.',successDetail:'Your computer confirmed a matching candidate.',exhaustedDetail:'The selected search space is fully checked — without a match.',stoppedDetail:'The compute engines have ended. Confirmed attempts remain visible.',errorDetail:'This run ended because a calculation failed.',
  enter:'Enter an invented test password.',invalid:'Check lengths and character sets. The minimum length must not exceed the maximum.',invalidYear:'The first year must not exceed the last year.',workersInvalid:'Choose a valid CPU worker count.',secure:'Local verification needs HTTPS or localhost and Web Crypto.',
  numeric:'Numeric search',dictionary:'Dictionary',brute:'Brute force',smart:'Smart ordering',chars:'characters',suffix:'suffix digits',years:'years',original:'Original spelling',variants:'Case variants',leet:'Leetspeak',waiting:'Not searched',partial:'Partly checked',active:'Active',complete:'Complete',
  none:'No active search phase',range:'Contiguously confirmed indices',inFlight:'ranges in flight',measureFirst:'Not measured yet',unknown:'Not reliably estimable yet',liveRate:'Currently measured',averageRate:'This run’s average',calibrationRate:'Measured calibration',
  reveal:'Reveal password locally',hide:'Hide password',found:'The candidate was actually found and independently verified. It stays hidden until you explicitly reveal it locally.',outside:'Your password was not found in the selected search space. All configured attempts are complete; other candidates remain untested.',cancelled:'You stopped the search. Only completed attempts count. This does not establish password safety.',failed:'Computation has ended. Details are available below; no hidden replacement attack is running.',
  seconds:'s',yearsUnit:'years',below:'below 0.001%',hiddenTab:'The tab was hidden. The search is pausing and can resume within this open session.',
  cpuReady:'Ready',notSelected:'Not selected',cpuActive:'active CPU workers',resting:'Between batches',gpuEncoding:'Preparing candidates',gpuDispatch:'Checking a GPU batch',done:'Complete',available:'Available',unavailable:'Unavailable',notChecked:'Not checked',present:'Present',absent:'Absent',
  mainPath:'Main thread + preparation worker',workerPath:'WebGPU in a worker',pathNone:'CPU available · GPU disabled',checking:'Checking GPU support …',gpuWorker:'GPU available — ',gpuMain:'GPU available through the compatible main-thread path — ',softwareTest:'Test-only software WebGPU path — ',
  dictionarySummary:'fixed words and word-pair patterns',derived:'unique word variants',baseWords:'Individual words',wordPairs:'Fixed word-pair patterns',configured:'Configured',disabledGpu:'This mode has no usable GPU execution path. CPU remains available.',initialization:'Initialization',interface:'WebGPU API',adapter:'Adapter',device:'Device',shader:'Shader',pipeline:'Compute pipeline',selftest:'SHA-256 self-test',execution:'Execution',
  gpuCodes:{'interface-unavailable':'WebGPU is unavailable in this browser context.','adapter-unavailable':'WebGPU is present, but Chrome did not provide a usable adapter.','adapter-request-failed':'The GPU adapter request failed.','software-adapter':'Only a software adapter was detected. GPU and Hybrid remain disabled.','device-creation-failed':'The adapter could not provide a GPU device.','shader-compilation-failed':'The SHA-256 shader could not compile.','pipeline-creation-failed':'The GPU compute pipeline could not be created.','selftest-failed':'The GPU SHA-256 self-test failed.','initialization-timeout':'GPU initialization did not respond in time.','preparation-worker-failed':'The GPU candidate preparation worker could not start.','worker-unavailable':'The GPU worker could not start.','device-lost':'The GPU device was lost. The run has ended.','execution-failed':'GPU computation failed.','initialization-failed':'GPU initialization failed.'}
};
const $=id=>document.getElementById(id),number=new Intl.NumberFormat(locale),short=new Intl.NumberFormat(locale,{maximumFractionDigits:0});
const settings=['mode','workers','german','english','brute'];
const busyStates=['preparing','calibrating','running','pausing','paused','verifying'];
let state='idle',session=null,snapshot=null,engines=[],calibration=null,calibrationKey=null,estimateBefore=null,operation=0,revealed=false,phases=[],message=null;
let gpuCapability={available:false,path:'none',code:'checking',diagnostics:{}},probeSequence=0,probeEngines=[];
function duration(seconds){
  if(!Number.isFinite(seconds)||seconds<0)return text.unknown;
  if(seconds<60)return new Intl.NumberFormat(locale,{maximumFractionDigits:seconds<1?3:1}).format(seconds)+' '+text.seconds;
  if(seconds<3600)return new Intl.NumberFormat(locale,{maximumFractionDigits:1}).format(seconds/60)+' min';
  if(seconds<86400)return new Intl.NumberFormat(locale,{maximumFractionDigits:1}).format(seconds/3600)+' h';
  if(seconds<31557600)return new Intl.NumberFormat(locale,{maximumFractionDigits:1}).format(seconds/86400)+(de?' Tage':' days');
  const years=seconds/31557600;return (years<1e8?new Intl.NumberFormat(locale,{maximumFractionDigits:1}).format(years):years.toExponential(2))+' '+text.yearsUnit;
}
function config(){return normalizeConfig({german:$('german').checked,english:$('english').checked,brute:$('brute').checked});}
function phaseName(p){
  if(p.kind!=='dictionary')return text[p.kind]+' · '+p.length+' '+text.chars;
  const details=[p.language?(p.language==='de'?(de?'Deutsches Wörterbuch':'German dictionary'):(de?'Englisches Wörterbuch':'English dictionary')):text.dictionary,p.variants?text.variants:text.original];if(p.leet)details.push(text.leet);
  details.push(p.yearMin===undefined?p.suffixDigits+' '+text.suffix:p.yearMin+'–'+p.yearMax+' '+text.years);return details.join(' · ');
}
function setState(value,reason=null){state=value;message=reason;document.body.dataset.state=value;render();}
function errorMessage(error){
  if(error.code&&text.gpuCodes[error.code])return text.gpuCodes[error.code];
  const reason=error.message||String(error);
  if(/Minimum year exceeds/.test(reason))return text.invalidYear;
  if(/Select at least one search method/.test(reason))return de?'Aktiviere mindestens eine Suchmethode.':'Enable at least one search method.';
  if(/Invalid search length|Minimum length exceeds|Select at least one|Unknown strategy/.test(reason))return text.invalid;
  if(/Invalid CPU worker count/.test(reason))return text.workersInvalid;return reason;
}
function clearReveal(){revealed=false;$('recovered').textContent='';$('reveal').textContent=text.reveal;}
function drawRows(){
  $('phase-rows').replaceChildren();phases.forEach((phase,index)=>{
    const row=document.createElement('tr');row.dataset.phase=index;
    for(const value of [phaseName(phase),'0 / '+number.format(phase.count),text.waiting]){const cell=document.createElement('td');cell.textContent=value;row.append(cell);}
    $('phase-rows').append(row);
  });
}
function gpuSummary(){
  if(gpuCapability.code==='checking')return text.checking;
  if(gpuCapability.available)return (gpuCapability.software?text.softwareTest:gpuCapability.path==='main'?text.gpuMain:text.gpuWorker)+(gpuCapability.description||'WebGPU');
  return text.gpuCodes[gpuCapability.code]||text.gpuCodes['initialization-failed'];
}
function renderGpu(){
  const capability=gpuCapability;
  $('gpu-capability').textContent=gpuSummary();$('gpu-capability').dataset.available=capability.available;
  for(const option of $('mode').options)if(option.value!=='cpu')option.disabled=!capability.available;
  const availableWord=value=>value===true?text.present:value===false?text.absent:text.notChecked;
  $('gpu-main-interface').textContent=availableWord(capability.diagnostics?.main?.interface??Boolean(navigator.gpu));
  $('gpu-worker-interface').textContent=availableWord(capability.diagnostics?.worker?.interface??null);
  $('gpu-execution').textContent=capability.available?(capability.path==='main'?text.mainPath:text.workerPath):text.pathNone;
  $('gpu-adapter').textContent=capability.description||text.notChecked;
  for(const path of ['main','worker']){
    const detail=capability.diagnostics?.[path];$('gpu-'+path+'-status').textContent=!detail||detail.stage==='not-tested'?text.notChecked:detail.stage==='ready'?text.complete:text.gpuCodes[detail.code]||text.gpuCodes['initialization-failed'];
  }
  const raw=JSON.stringify({path:capability.path,code:capability.code||'ready',adapter:capability.description||null,diagnostics:capability.diagnostics,runtimeFailure:capability.runtimeFailure||null},null,2);if($('gpu-raw').textContent!==raw)$('gpu-raw').textContent=raw;
  $('gpu-retry').disabled=busyStates.includes(state)||capability.code==='checking';
}
function render(){
  const busy=busyStates.includes(state),terminal=['success','exhausted','stopped','error'].includes(state);
  for(const id of settings)$(id).disabled=busy;
  $('password').disabled=busy;$('intensity').disabled=['preparing','calibrating'].includes(state);
  const methods=$('german').checked||$('english').checked||$('brute').checked;
  const canStart=methods&&!busy&&Boolean(crypto?.subtle)&&Boolean($('password').value)&&($('mode').value==='cpu'||gpuCapability.available);
  $('start').disabled=!canStart;$('pause').disabled=state!=='running';$('resume').disabled=state!=='paused';$('stop').disabled=!busy;
  let c=null;try{c=config();}catch{}
  if(!busy)$('workers').disabled=$('mode').value==='gpu';
  const selected=[];
  if(c?.german)selected.push(de?'Deutsches Wörterbuch':'German dictionary');
  if(c?.english)selected.push(de?'Englisches Wörterbuch':'English dictionary');
  if(c?.brute)selected.push('Brute Force · ASCII 1–'+BLIND_LIMITS.maximumLength);
  $('config-summary').textContent=selected.join(' → ')||(de?'Aktiviere mindestens eine Suchmethode.':'Enable at least one search method.');
  $('selected-methods').textContent=$('config-summary').textContent;
  $('method-help').textContent=methods?(de?'Feste Kandidatenfolge. Dein Passwort verändert weder Wörter noch Reihenfolge oder Grenzen.':'Fixed candidate sequence. Your password changes neither vocabulary, ordering nor limits.'):(de?'Aktiviere mindestens eine Suchmethode.':'Enable at least one search method.');
  $('intensity-value').textContent=$('intensity').value+'%';
  const title=text[state]||text.idle,detail=message||text[state+'Detail']|| (state==='success'?text.found:state==='exhausted'?text.outside:state==='stopped'?text.cancelled:text.failed);
  if($('status').textContent!==title)$('status').textContent=title;
  if($('status-detail').textContent!==detail)$('status-detail').textContent=detail;
  const announcement=title+'. '+detail;if($('announcement').textContent!==announcement)$('announcement').textContent=announcement;
  const s=snapshot,total=s?.total??phases.reduce((n,p)=>n+p.count,0n),checked=s?.checked??0n;
  $('checked').textContent=number.format(checked);$('space').textContent=number.format(total);$('elapsed').textContent=duration((s?.elapsed??0)/1000);
  const scaled=total?Number(checked*100000n/total):0;$('progress').value=scaled/1000;
  $('progress-label').textContent=checked>0n&&scaled===0?text.below:new Intl.NumberFormat(locale,{maximumFractionDigits:3}).format(scaled/1000)+'%';
  let cpu=0,gpu=0,rate=0;
  if(s){cpu=terminal?(s.cpuAverage||0):(s.cpu||0);gpu=terminal?(s.gpuAverage||0):(s.gpu||0);rate=terminal?(s.average||0):(s.combined||0);}
  else if(calibration){cpu=calibration.cpu;gpu=calibration.gpu;rate=calibration.combined;}
  $('rate-label').textContent=s?(terminal?text.averageRate:text.liveRate):text.calibrationRate;
  for(const [id,value] of [['cpu-rate',cpu],['gpu-rate',gpu],['rate',rate]])$(id).textContent=s||calibration?short.format(value):'—';
  $('rate-note').textContent=s||calibration?text.configured+' · SHA-256':text.measureFirst;
  const estimateRate=s?.average>0?s.average:calibration?.combined;
  $('estimate').textContent=estimateRate>0?duration(Number(total)/estimateRate):text.measureFirst;
  $('remaining').textContent=s&&['running','pausing','paused'].includes(state)&&estimateRate>0?duration(Number(total-checked)/estimateRate):['success','exhausted'].includes(state)?text.done:state==='stopped'?text.stopped:text.unknown;
  $('active-strategy').textContent=s?.strategy?phaseName(s.phases[s.strategy.phaseIndex]):text.none;
  $('phase-number').textContent=s?.strategy?String(s.strategy.phaseIndex+1)+' / '+s.phases.length:'';
  const frontier=s?.frontier??0n;$('ranges').textContent=text.range+': '+(frontier?'0–'+number.format(frontier-1n):'—')+' · '+(s?.pending??0)+' '+text.inFlight;
  $('bench-checked').textContent=calibration?number.format(calibration.checked):text.measureFirst;
  $('bench-elapsed').textContent=calibration?duration(calibration.ms/1000):text.measureFirst;
  $('cpu-done').textContent=number.format(s?.cpuDone??0n);$('gpu-done').textContent=number.format(s?.gpuDone??0n);
  const activeCpu=s?.cpuActive??engines.filter(e=>e.kind==='cpu'&&e.busy).length,activeGpu=s?.gpuActive??engines.some(e=>e.kind==='gpu'&&e.busy),gpuActivity=s?.gpuActivity??engines.find(e=>e.kind==='gpu')?.activity;
  const inactive=terminal?(state==='stopped'?text.stopped:state==='error'?text.error:text.done):state==='paused'?text.paused:state==='running'?text.resting:text.cpuReady;
  $('cpu-activity').textContent=$('mode').value==='gpu'?text.notSelected:activeCpu?activeCpu+' '+text.cpuActive:inactive;
  $('gpu-activity').textContent=$('mode').value==='cpu'?text.notSelected:activeGpu?(gpuActivity==='encoding'?text.gpuEncoding:text.gpuDispatch):gpuCapability.available?inactive:text.unavailable;
  $('cpu-chip').dataset.active=String(activeCpu>0);$('gpu-chip').dataset.active=String(Boolean(activeGpu));
  $('active-gpu-path').textContent=s?.gpuPath?(s.gpuPath==='main'?text.mainPath:text.workerPath):text.notSelected;
  if(s?.phaseChecked)for(const row of $('phase-rows').children){
    const index=Number(row.dataset.phase),done=s.phaseChecked[index],p=s.phases[index];
    row.children[1].textContent=number.format(done)+' / '+number.format(p.count);
    row.classList.toggle('phase-active',s.strategy?.phaseIndex===index&&['running','pausing','verifying'].includes(state));row.classList.toggle('phase-done',done===p.count);
    row.children[2].textContent=done===p.count?text.complete:row.classList.contains('phase-active')?text.active:done>0n?text.partial:text.waiting;
  }
  $('result').hidden=!terminal;$('result').className='result '+state;$('result-title').textContent=title;
  $('result-message').textContent=state==='success'?text.found:state==='exhausted'?text.outside:state==='stopped'?text.cancelled:text.failed;
  $('reveal').hidden=state!=='success';$('result-details').hidden=state!=='success';
  if(state==='success'&&s?.result){$('result-time').textContent=duration(s.elapsed/1000);$('result-strategy').textContent=phaseName(s.result.phase);$('result-engine').textContent=s.result.engine.toUpperCase();$('result-before').textContent=estimateBefore===null?text.unknown:duration(estimateBefore);}
  // Presentation uses the same verified snapshots and capability result as the engines.
  $('hardware-cpu').closest('article').dataset.active=String(activeCpu>0);
  $('hardware-gpu').closest('article').dataset.active=String(Boolean(activeGpu));
  $('hardware-hybrid').closest('article').dataset.active=String(activeCpu>0&&Boolean(activeGpu));
  $('hardware-cpu').textContent=$('cpu-activity').textContent;
  $('hardware-workers').textContent=$('mode').value==='gpu'?text.notSelected:$('workers').value+(de?' konfigurierte Worker':' configured workers');
  $('hardware-cpu-rate').textContent=$('cpu-rate').textContent;
  $('hardware-gpu-rate').textContent=$('gpu-rate').textContent;
  $('hardware-gpu').textContent=gpuCapability.code==='checking'?text.checking:gpuCapability.available?(de?'Verfügbar':'Available'):text.unavailable;
  $('hardware-gpu-summary').textContent=gpuSummary();
  $('hardware-hybrid').textContent=gpuCapability.code==='checking'?text.checking:gpuCapability.available?(de?'Verfügbar':'Available'):text.unavailable;
  $('hardware-hybrid-summary').textContent=gpuCapability.available?(de?'CPU-Worker und WebGPU teilen getrennte Suchbereiche.':'CPU workers and WebGPU share distinct search ranges.'):(de?'Benötigt einen nutzbaren WebGPU-Adapter. CPU-Suche bleibt verfügbar.':'Requires a usable WebGPU adapter. CPU search remains available.');
  const journey=$('phase-journey');
  const groups=[];
  phases.forEach((p,index)=>{
    const kind=p.kind==='dictionary'?(p.yearMin!==undefined?'years':p.suffixDigits>0?'suffix':'dictionary'):p.kind;
    const key=(p.language||'')+':'+kind;
    if(groups.at(-1)?.key===key)groups.at(-1).indices.push(index);else groups.push({key,kind,language:p.language,indices:[index]});
  });
  const current=s?.strategy?.phaseIndex;
  const journeyData=groups.map(group=>{
    const done=Boolean(s?.phaseChecked)&&group.indices.every(index=>s.phaseChecked[index]===s.phases[index].count);
    return {label:(group.language?group.language.toUpperCase()+' · ':'')+(group.kind==='suffix'?(de?'Wörter + Ziffern':'Words + digits'):group.kind==='years'?(de?'Wörter + Jahre':'Words + years'):text[group.kind]),state:done?'complete':group.indices.includes(current)?(state==='running'?'active':state):'waiting'};
  });
  const signature=JSON.stringify(journeyData);
  if(journey.dataset.signature!==signature){
    journey.dataset.signature=signature;journey.replaceChildren();
    journeyData.forEach((item,index)=>{const li=document.createElement('li');li.dataset.state=item.state;li.textContent=String(index+1).padStart(2,'0')+' / '+item.label;li.setAttribute('aria-label',item.label+' · '+(text[item.state]||item.state));if(item.state==='active')li.setAttribute('aria-current','step');journey.append(li);});
  }
  renderGpu();
}
function refreshConfig(){try{phases=createPhases(config());drawRows();render();}catch(error){phases=[];drawRows();setState('idle',errorMessage(error));}}
function cancel(reset=false){
  operation++;engines.forEach(e=>e.close());engines=[];session?.clear();session=null;snapshot=null;clearReveal();estimateBefore=null;$('password').value='';
  if(reset){calibration=null;calibrationKey=null;}setState(reset?'idle':'stopped');refreshConfig();
}
function showDashboard(){$('dashboard').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});$('dashboard').focus({preventScroll:true});}
function runtimeGpuFailure(failure){gpuCapability={...gpuCapability,available:false,code:failure.code,runtimeFailure:{code:failure.code,stage:failure.stage,message:failure.message,engine:failure.engine,details:failure.details||null}};renderGpu();}
async function prepare(){
  const epoch=++operation;clearReveal();session?.clear();session=null;snapshot=null;engines=[];let target=null;const created=[];
  try{
    if(!$('password').value){setState('idle',text.enter);return;}if(!crypto?.subtle)throw new Error(text.secure);
    const c=config(),mode=$('mode').value,workers=Number($('workers').value),intensity=Number($('intensity').value);
    if(mode!=='cpu'&&!gpuCapability.available)throw new Error(text.disabledGpu);
    const key=JSON.stringify({c,mode,workers,intensity,gpuPath:gpuCapability.path});phases=createPhases(c);drawRows();setState('preparing');showDashboard();
    let plaintext=$('password').value;const bytes=new TextEncoder().encode(plaintext);plaintext='';let digest;
    try{digest=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));target=Array.from(digest,b=>b.toString(16).padStart(2,'0')).join('');}finally{bytes.fill(0);digest?.fill(0);}
    if(epoch!==operation)return;$('password').value='';
    const ready=await makeEngines(mode,workers,{gpuPath:gpuCapability.path,onCreated:engine=>{created.push(engine);if(epoch===operation)engines.push(engine);else engine.close();}});
    if(epoch!==operation){ready.forEach(e=>e.close());return;}engines=ready;
    const gpu=engines.find(e=>e.kind==='gpu');if(gpu)gpuCapability={...gpuCapability,...gpu.info,path:gpu.info.execution,available:true,code:null,diagnostics:{...gpuCapability.diagnostics,...Object.fromEntries(Object.entries(gpu.diagnostics||{}).filter(([,detail])=>detail.stage!=='not-tested'))}};
    if(!calibration||calibrationKey!==key){
      setState('calibrating');const measured=await benchmark(engines,createPhases({strategy:'numeric',min:6,max:6})[0],target,intensity);
      if(epoch!==operation)return;calibration=measured;calibrationKey=key;
    }
    estimateBefore=Number(phases.reduce((n,p)=>n+p.count,0n))/calibration.combined;
    session=new CrackSession({config:c,target,engines,intensity,onUpdate:value=>{
      if(epoch!==operation)return;snapshot=value;state=value.state;message=null;document.body.dataset.state=state;
      if(state==='error'){message=errorMessage(value.errorInfo||{message:value.error});if(value.errorInfo?.engine==='gpu')runtimeGpuFailure(value.errorInfo);}
      render();
    }});target=null;session.start();
  }catch(error){
    if(epoch===operation){created.forEach(e=>e.close());engines=[];const reason=errorMessage(error);snapshot={error:reason};if(error.engine==='gpu')runtimeGpuFailure(error);setState('error',reason);}
  }finally{target=null;if(epoch!==operation)created.forEach(e=>e.close());}
}
async function refreshGpu(){
  const sequence=++probeSequence;probeEngines.forEach(e=>e.close());probeEngines=[];gpuCapability={...gpuCapability,available:false,code:'checking'};renderGpu();render();
  const capability=await probeGPU({onCreated:engine=>{if(sequence===probeSequence)probeEngines.push(engine);else engine.close();}});
  if(sequence!==probeSequence)return;probeEngines=[];gpuCapability=capability;render();window.passwordLabReady=true;
}
for(const id of settings)$(id).addEventListener('change',()=>{
  if(!busyStates.includes(state)){session?.clear();session=null;snapshot=null;clearReveal();calibration=null;calibrationKey=null;setState('idle');refreshConfig();}
});
$('password').addEventListener('input',()=>{if(!busyStates.includes(state)){session?.clear();session=null;snapshot=null;clearReveal();setState('idle');refreshConfig();}});
$('intensity').addEventListener('input',()=>{if(session&&['running','paused','pausing'].includes(state))session.intensity=Number($('intensity').value);else{calibration=null;calibrationKey=null;}render();});
$('start').addEventListener('click',()=>prepare());$('pause').addEventListener('click',()=>session?.pause());$('resume').addEventListener('click',()=>session?.resume());$('stop').addEventListener('click',()=>{if(session)session.stop();else cancel(false);});$('reset').addEventListener('click',()=>cancel(true));$('gpu-retry').addEventListener('click',refreshGpu);
document.querySelector('.hardware-panel .details-link').addEventListener('click',()=>{$('gpu-diagnostics').open=true;});
$('reveal').addEventListener('click',()=>{if(state!=='success'||!snapshot?.result)return;revealed=!revealed;$('recovered').textContent=revealed?snapshot.result.candidate:'';$('reveal').textContent=revealed?text.hide:text.reveal;});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='running'){session.pause();message=text.hiddenTab;render();}});
window.addEventListener('pagehide',()=>{operation++;probeSequence++;session?.clear();[...engines,...probeEngines].forEach(e=>e.close());$('password').value='';clearReveal();});
const useful=Math.max(1,Math.min(8,(navigator.hardwareConcurrency||2)-1));$('workers').max=useful;$('workers').value=Math.min(4,useful);
for(const language of ['de','en']){
  const meta=DICTIONARY_COUNTS[language];
  $('dictionary-'+language+'-size').textContent=number.format(meta.total);
  $('dictionary-'+language+'-words').textContent=number.format(meta.individualWords);
  $('dictionary-'+language+'-pairs').textContent=number.format(meta.wordPairs);
  $('dictionary-'+language+'-variants').textContent=number.format(dictionaryBases(true,true,language).length);
}
refreshConfig();refreshGpu();
setInterval(()=>{if(session&&['running','pausing','paused','verifying'].includes(state))snapshot=session.snapshot();if(busyStates.includes(state))render();},150);
