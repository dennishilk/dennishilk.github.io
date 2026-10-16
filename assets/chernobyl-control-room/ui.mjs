import {stations,hotspots,evidence,steps,sources} from './content.mjs';
import {createState,transition} from './model.mjs';
const de=document.documentElement.lang==='de',t=(en,ger)=>de?ger:en,at=a=>a[de?1:0],$=id=>document.getElementById(id);
let state=createState(),timer=null;
const stationIds=stations.map(s=>s[0]),tabs=stationIds.map(id=>$('tab-'+id));
const badge=type=>`<span class="badge ${type}">${at(evidence[type])}</span>`;
function cancelTimer(){if(timer!==null)clearTimeout(timer);timer=null;}
function schedule(){cancelTimer();if(state.playing&&state.station==='sequence'&&!document.hidden)timer=setTimeout(()=>dispatch({type:'tick'}),state.interval);}
function phaseText(phase){return ({context:t('S · Test context','S · Versuchskontext'),low:t('S · Low-power context','S · Niedriglastkontext'),rundown:t('S · Coupled systems','S · Gekoppelte Systeme'),insertion:t('S · Initial rod insertion','S · Beginnendes Stabeinfahren'),excursion:t('S · Local feedback, symbolic','S · Lokale Rückkopplung, symbolisch'),failure:t('S · Measurement reliability lost','S · Messzuverlässigkeit verloren'),destroyed:t('S · Reactor destroyed','S · Reaktor zerstört'),aftermath:t('S · Aftermath, no operating state','S · Folgen, kein Betriebszustand'),findings:t('S · Analysis, not operation','S · Analyse, kein Betrieb')})[phase];}
function renderSequence(){
 const step=steps[state.step];
 $('step-count').textContent=t('CHAPTER','KAPITEL')+' '+String(state.step+1).padStart(2,'0')+' / '+steps.length;
 $('step-evidence').innerHTML=badge(step.type);
 $('step-time').textContent=step.time.includes(' / ')?step.time.split(' / ')[de?1:0]:step.time;
 $('step-title').textContent=at(step.title);$('step-text').textContent=at(step.text);$('step-note').textContent=at(step.note);
 $('step-source').href=sources[step.source||'insag'].url;$('step-source').textContent=step.ref+' ↗';
 $('sequence-stage').dataset.phase=step.phase;$('phase-label').textContent=phaseText(step.phase);
 $('historical-power').textContent=step.power?('D · '+step.power):t('No numerical reading shown','Kein Zahlenmesswert dargestellt');
 $('sequence-progress').value=state.step+1;$('previous-step').disabled=state.step===0;$('next-step').disabled=state.step===steps.length-1;
 $('toggle-play').textContent=state.playing?t('Ⅱ Pause','Ⅱ Pause'):(state.step===steps.length-1?t('Completed','Abgeschlossen'):t('▶ Play','▶ Fortsetzen'));
 $('toggle-play').disabled=state.step===steps.length-1;
 const status=state.playing?t('Automatic sequence · ','Automatischer Ablauf · ')+state.interval/1000+t(' s reading time per chapter',' s Lesezeit pro Kapitel'):state.step===steps.length-1?t('Sequence complete. Restart or continue to the technical findings.','Ablauf abgeschlossen. Neu starten oder zur technischen Einordnung wechseln.'):state.started?t('Paused · read at your own pace','Pausiert · in deinem Tempo lesen'):t('Ready · start automatically or browse the chapters','Bereit · automatisch starten oder durch die Kapitel blättern');
 $('playback-status').textContent=status;
 document.querySelectorAll('[data-step]').forEach(b=>b.setAttribute('aria-current',Number(b.dataset.step)===state.step?'step':'false'));
}
function showStation(id,{focus=false,updateHash=false}={}){
 state=transition(state,{type:'station',id});
 for(const name of stationIds){const selected=name===state.station,panel=$(name),tab=$('tab-'+name);panel.hidden=!selected;panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby','tab-'+name);panel.tabIndex=0;tab.setAttribute('role','tab');tab.setAttribute('aria-selected',String(selected));tab.setAttribute('aria-controls',name);tab.tabIndex=selected?0:-1;}
 $('station-position').textContent=t('Station ','Station ')+(stationIds.indexOf(state.station)+1)+' / 5 · '+at(stations.find(s=>s[0]===state.station).slice(1));
 if(updateHash&&location.hash!=='#'+id)history.pushState(null,'','#'+id);
 if(focus){$('heading-'+id).focus({preventScroll:true});document.querySelector('.station-navigation').scrollIntoView({block:'start',behavior:'instant'});}
 renderSequence();schedule();
}
function dispatch(action){state=transition(state,action);renderSequence();schedule();}
for(const a of document.querySelectorAll('[data-station-target]'))a.addEventListener('click',e=>{e.preventDefault();showStation(a.dataset.stationTarget,{updateHash:true,focus:!a.closest('.station-tabs')});});
const tablist=document.querySelector('.station-tabs');tablist.setAttribute('role','tablist');
for(const [i,tab] of tabs.entries())tab.addEventListener('keydown',e=>{let next=i;if(e.key==='ArrowRight')next=(i+1)%tabs.length;else if(e.key==='ArrowLeft')next=(i+tabs.length-1)%tabs.length;else if(e.key==='Home')next=0;else if(e.key==='End')next=tabs.length-1;else if(e.key===' '){e.preventDefault();showStation(stationIds[i],{updateHash:true});return;}else return;e.preventDefault();tabs.forEach((b,n)=>b.tabIndex=n===next?0:-1);tabs[next].focus();});
function restoreHash(){const id=location.hash.slice(1);if(stationIds.includes(id))showStation(id);}
window.addEventListener('hashchange',restoreHash);window.addEventListener('popstate',restoreHash);
function inspect(button){
 const h=hotspots[button.dataset.hotspot],section=button.closest('[data-station]');
 section.querySelectorAll('[data-hotspot]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
 const inspector=section.querySelector('.inspector-content');
 inspector.innerHTML=`<h3>${at(h.name)}</h3>${badge(h.type)}<p>${at(h.text)}</p><details><summary>${t('Engineering note & source','Technikdetail & Quelle')}</summary><p>${at(h.detail)}</p><a href="${sources.insag.url}">${h.ref} ↗</a></details>`;
 // On narrow screens move the new explanation into view; focus remains on the chosen control.
 if(matchMedia('(max-width:800px)').matches)inspector.scrollIntoView({block:'center',behavior:'instant'});
}
for(const b of document.querySelectorAll('[data-hotspot]'))b.addEventListener('click',()=>inspect(b));
const computing={
 signals:[t('Signals from the plant','Signale aus der Anlage'),t('Sensors and instruments provide selected observations. A sensor reading, an alarm contact and a calculated quantity are different kinds of information.','Sensoren und Instrumente liefern ausgewählte Beobachtungen. Sensormesswert, Meldekontakt und berechnete Größe sind verschiedene Informationsarten.'),t('SKALA did not have a complete, instantaneous picture of every physical process. The visible diagram is a modern functional explanation.','SKALA verfügte nicht über ein vollständiges, augenblickliches Bild jedes physikalischen Vorgangs. Das Diagramm ist eine moderne Funktionserklärung.')],
 dreg:['DREG',t('A program for recording diagnostic parameters: selected analogue and discrete signals. The surviving records helped investigators establish parts of the chronology.','Ein Programm zur Aufzeichnung diagnostischer Parameter: ausgewählte analoge und diskrete Signale. Die erhaltenen Aufzeichnungen halfen bei der zeitlichen Einordnung.'),t('Annex I describes fast input for some directly measured signals, but limited coverage, scheduling uncertainty, lower priority and recording gaps from SKALA restarts. It was not a complete high-speed reactor flight recorder.','Anhang I beschreibt schnelle Eingabe mancher direkt gemessener Signale, zugleich begrenzte Abdeckung, zeitliche Unsicherheit, niedrige Priorität und Aufzeichnungslücken durch SKALA-Neustarts. DREG war kein vollständiger Hochgeschwindigkeits-Flugschreiber des Reaktors.')],
 prizma:['PRIZMA',t('A calculation program for reactor parameters not measured directly. A calculated value depends on input data, assumptions and the time at which a result becomes available.','Ein Berechnungsprogramm für nicht direkt gemessene Reaktorparameter. Ein Rechenwert hängt von Eingabedaten, Annahmen und dem Zeitpunkt seiner Verfügbarkeit ab.'),t('The report describes a roughly five-minute cycle for basic calculations and printout-only PRIZMA results. The 01:22:30 tape snapshot was evaluated after the accident with PRIZMA-ANALOG; that result was not a live control-room reading.','Der Bericht beschreibt einen etwa fünfminütigen Zyklus grundlegender Berechnungen und PRIZMA-Ergebnisse nur auf Ausdrucken. Die Magnetbandaufnahme von 01:22:30 wurde nach dem Unfall mit PRIZMA-ANALOG ausgewertet; dieses Ergebnis war keine Live-Anzeige der Leitwarte.')],
 protection:[t('Protection is a separate function','Schutz ist eine eigene Funktion'),t('Plant information processing, automatic regulation and reactor protection must not be collapsed into one fictional central brain. Their interfaces and limitations are part of the engineering story.','Anlageninformationsverarbeitung, automatische Regelung und Reaktorschutz dürfen nicht zu einem fiktiven Zentralgehirn verschmelzen. Schnittstellen und Grenzen gehören zur technischen Geschichte.'),t('A calculated operating reactivity margin was not directly integrated into emergency protection in the way a visitor might expect from a modern dashboard. This is a safety-design and information problem, not evidence of an autonomous computer choosing the accident.','Eine berechnete operative Reaktivitätsreserve war nicht so direkt in den Reaktorschutz eingebunden, wie man es von einem modernen Dashboard erwarten könnte. Das ist ein Schutzkonzept- und Informationsproblem, kein Beleg für einen autonom entscheidenden Computer.')]
};
function selectComputing(id){const [name,text,detail]=computing[id];$('computing-inspector').innerHTML=`<h3>${name}</h3>${badge('documented')}<p>${text}</p><details><summary>${t('Technical detail & source','Technikdetail & Quelle')}</summary><p>${detail}</p><a href="${sources.insag.url}">INSAG-7 §2.3 · Annex I §§1-4.3.2, 1-4.5 ↗</a></details>`;document.querySelectorAll('[data-computing]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.computing===id)));}
for(const b of document.querySelectorAll('[data-computing]'))b.addEventListener('click',()=>selectComputing(b.dataset.computing));
$('view-labels').addEventListener('change',e=>$('control-room').classList.toggle('hide-labels',!e.target.checked));
$('view-overlay').addEventListener('change',e=>{$('control-room').classList.toggle('show-overlay',e.target.checked);$('room-system-path').hidden=!e.target.checked;});
$('view-section').addEventListener('change',e=>{$('room-map').hidden=e.target.checked;$('room-section').hidden=!e.target.checked;});
$('view-history').addEventListener('change',e=>$('historical-annotation').hidden=!e.target.checked);
$('start-sequence').addEventListener('click',()=>{dispatch({type:'start'});showStation('sequence',{updateHash:true});});
$('toggle-play').addEventListener('click',()=>dispatch({type:state.playing?'pause':'resume'}));
$('previous-step').addEventListener('click',()=>dispatch({type:'previous'}));$('next-step').addEventListener('click',()=>dispatch({type:'next'}));$('restart-sequence').addEventListener('click',()=>dispatch({type:'restart'}));
$('sequence-pace').addEventListener('change',e=>dispatch({type:'pace',value:e.target.value}));
for(const b of document.querySelectorAll('[data-step]'))b.addEventListener('click',()=>dispatch({type:'seek',index:Number(b.dataset.step)}));
document.addEventListener('visibilitychange',()=>{if(document.hidden)dispatch({type:'pause'});});window.addEventListener('pagehide',()=>{state=transition(state,{type:'pause'});cancelTimer();});
selectComputing('signals');showStation(stationIds.includes(location.hash.slice(1))?location.hash.slice(1):'basics');
document.documentElement.dataset.chernobylReady='true';
