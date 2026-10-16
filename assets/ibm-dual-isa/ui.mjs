import {mountStations} from './stations.mjs';
import {makeCPU,ServiceScenario,ControlledRunner} from './model.mjs';
const $=id=>document.getElementById(id),de=document.documentElement.lang==='de',t=(a,b)=>de?b:a;
let selected=0,block=null,kind='add',a=17,b=25;
const cores=Array.from({length:11},()=>({z:makeCPU('z',kind,a,b),arm:makeCPU('arm',kind,a,b),config:{kind,a,b}}));
const errorText=e=>de&&e.message==='Use whole numbers from 0 to 1000'?'Ganze Zahlen von 0 bis 1000 eingeben':de&&e.message==='Invalid synthetic transaction'?'Ungültige synthetische Transaktion':e.message;
const cpu=()=>cores[selected],hex=n=>n.toString(16).padStart(2,'0').toUpperCase();
const descriptions={
 complex:t('Eleven cores of the same announced design. Each supports IBM Z and Arm natively; these are not two dedicated core clusters.','Elf Kerne desselben angekündigten Designs. Jeder unterstützt IBM Z und Arm nativ; dies sind keine zwei dedizierten Kerncluster.'),
 cache:t('Caches keep frequently needed data close to execution. IBM announces a large cache architecture. Capacities, placement and coherence between software environments are not modeled here.','Caches halten häufig benötigte Daten nahe an der Ausführung. IBM kündigt eine große Cache-Architektur an. Größen, Platzierung und Kohärenz zwischen Softwareumgebungen sind hier nicht modelliert.'),
 ai:t('Announced integrated inference acceleration. Specialized compute can support inference near transactions. The deterministic rule in the Application station is not a trained model and does not execute this accelerator.','Angekündigte integrierte Inferenzbeschleunigung. Spezialisierte Recheneinheiten können Inferenz nahe an Transaktionen unterstützen. Die deterministische Regel in der Station Praxis ist kein trainiertes Modell und führt diesen Beschleuniger nicht aus.'),
 dpu:t('A dedicated on-chip data processing unit is announced for I/O acceleration. This block represents its role, not a published queue structure or bandwidth figure.','Eine dedizierte On-Chip-Datenverarbeitungseinheit ist zur I/O-Beschleunigung angekündigt. Der Block zeigt ihre Rolle, keine veröffentlichte Warteschlangenstruktur oder Bandbreite.'),
 io:t('Enterprise I/O connects software to storage and external services. Protocols, isolation and recovery still matter. The service demo performs no external I/O.','Enterprise-I/O verbindet Software mit Speicher und externen Diensten. Protokolle, Isolation und Wiederherstellung bleiben relevant. Die Service-Demo führt keine externe Ein-/Ausgabe aus.')
};
function inspect(){
 $('core-details').hidden=!!block;
 $('selected-core-label').textContent=t('Core ','Kern ')+String(selected+1).padStart(2,'0');
 $('inspector-title').textContent=block?({complex:t('Core complex','Kernkomplex'),cache:t('Cache hierarchy','Cache-Hierarchie'),ai:t('AI inference','KI-Inferenz'),dpu:'I/O DPU',io:'Enterprise I/O'})[block]:t('Core ','Kern ')+String(selected+1).padStart(2,'0');
 $('block-description').textContent=block?descriptions[block]:t('One selected dual-ISA core. In the Instructions station, two source interpreters belong to separate teaching contexts.','Ein gewählter Dual-ISA-Kern. In der Station Befehle gehören die beiden Quellinterpreter zu getrennten Lehrkontexten.');
 $('core-workload').textContent=cpu().config.kind==='add'?t('Add / store / load','Addition / Speichern / Laden'):t('Compare / branch','Vergleich / Sprung');
 $('core-state').textContent=runner.running?t('Running / two contexts','Läuft / zwei Kontexte'):cpu().z.halted&&cpu().arm.halted?t('Complete / queue empty','Beendet / Warteschlange leer'):t('Paused / two contexts','Pausiert / zwei Kontexte');
 $('core-count').textContent=cpu().z.count+cpu().arm.count;
 for(const isa of ['z','arm'])$(isa+'-stream').textContent=cpu()[isa].program[cpu()[isa].pc]?.source||t('End of listing','Listing-Ende');
 $('core-registers').textContent=['z','arm'].map(isa=>`${isa==='z'?'Z R':'Arm X'}0 = ${cpu()[isa].registers[0]} · PC ${cpu()[isa].pc}`).join('\n');
 $('core-timeline').replaceChildren(...cpu().z.trace.slice(-4).map((e)=>{const li=document.createElement('li');li.textContent=`Z #${e.pc} → #${e.next} / Arm ${t('independent context','getrennter Kontext')}`;return li;}));
 for(const button of document.querySelectorAll('[data-core]')){const i=Number(button.dataset.core),active=i===selected&&!block;button.setAttribute('aria-pressed',String(active));button.classList.toggle('running',i===selected&&runner.running);button.querySelector('.core-state').textContent=cores[i].z.halted?t('COMPLETE','BEENDET'):i===selected&&runner.running?t('EXECUTING','LÄUFT'):t('READY','BEREIT');}
 for(const button of document.querySelectorAll('[data-block]'))button.setAttribute('aria-pressed',String(button.dataset.block===block));
}
function render(error){
 for(const isa of ['z','arm']){
  const c=cpu()[isa],name=isa==='z'?'R':'X';
  $(isa+'-counter').textContent=`${c.count} ${t('instructions','Befehle')}`;
  $(isa+'-listing').replaceChildren(...c.program.map((i,index)=>{const li=document.createElement('li'),n=document.createElement('span'),text=document.createElement('code');n.textContent=String(index).padStart(2,'0');text.textContent=i.source;li.append(n,text);if(c.pc===index&&!c.halted){li.className='current';li.setAttribute('aria-current','step');}return li;}));
  $(isa+'-registers').replaceChildren(...c.registers.slice(0,isa==='arm'?5:4).map((value,i)=>{const el=document.createElement('div'),v=document.createElement('strong');el.className='register';el.textContent=name+i;v.textContent=BigInt.asIntN(64,value).toString();el.append(v);return el;}));
  $(isa+'-memory').textContent=[...c.memory.slice(128,136)].map(hex).join(' ');
  $(isa+'-result').textContent=String(c.read(128));$(isa+'-pc').textContent=c.pc+(c.halted?' / '+t('complete','beendet'):'');
  $(isa+'-flags').textContent=isa==='z'?'CC '+c.cc:Object.entries(c.flags).map(([k,v])=>k+v).join(' ');
 }
 const complete=cpu().z.halted&&cpu().arm.halted;
 $('step').disabled=runner.running||complete;$('run').disabled=runner.running||complete;$('pause').disabled=!runner.running;
 $('execution-status').textContent=error?t('Error: ','Fehler: ')+errorText(error):complete?t('Complete · both results match: ','Beendet · beide Ergebnisse gleich: ')+cpu().z.read(128):runner.running?t('Running','Läuft'):t('Paused · selected core ','Pausiert · gewählter Kern ')+(selected+1);
 $('trace').textContent=['z','arm'].flatMap(isa=>cpu()[isa].trace.map(e=>`${isa==='z'?'IBM Z  ':'Arm A64'} #${String(e.pc).padStart(2,'0')}  ${e.source.padEnd(23)} → #${e.next}`)).join('\n')||t('Press STEP to follow the first instruction.','Mit EINZELSCHRITT den ersten Befehl verfolgen.');
 inspect();
}
const runner=new ControlledRunner(()=>{for(const isa of ['z','arm'])cpu()[isa].step();return !(cpu().z.halted&&cpu().arm.halted);},render,()=>Number($('speed').value));
function pause(){runner.pause();render();}
$('step').onclick=()=>{pause();try{for(const isa of ['z','arm'])cpu()[isa].step();render();}catch(e){render(e);}};
$('run').onclick=()=>runner.start();$('pause').onclick=pause;$('speed').onchange=()=>{const running=runner.running;runner.pause();if(running)runner.start();render();};
function resetSelected(){runner.pause();const config=cpu().config;cores[selected]={z:makeCPU('z',config.kind,config.a,config.b),arm:makeCPU('arm',config.kind,config.a,config.b),config};render();}
$('reset').onclick=resetSelected;
$('load').onclick=()=>{pause();try{const na=Number($('operand-a').value),nb=Number($('operand-b').value),k=$('program').value;if(!$('operand-a').value||!$('operand-b').value)throw Error(t('Enter A and B','A und B eingeben'));const z=makeCPU('z',k,na,nb),arm=makeCPU('arm',k,na,nb);kind=k;a=na;b=nb;cores[selected]={z,arm,config:{kind:k,a:na,b:nb}};render();}catch(e){render(e);}};
for(const button of document.querySelectorAll('[data-core]'))button.onclick=()=>{pause();selected=Number(button.dataset.core);block=null;const config=cpu().config;$('program').value=config.kind;$('operand-a').value=config.a;$('operand-b').value=config.b;render();};
for(const button of document.querySelectorAll('[data-block]'))button.onclick=()=>{block=button.dataset.block;inspect();};
const scenario=new ServiceScenario();
function serviceRender(error){
 for(const [i,li] of [...$('service-flow').children].entries()){li.classList.toggle('active',scenario.phase===i+1);li.classList.toggle('done',scenario.phase>i+1);}
 $('request').textContent=scenario.request?JSON.stringify(scenario.request,null,2):t('Waiting for a service request.','Warten auf eine Service-Anfrage.');
 $('response').textContent=scenario.response?JSON.stringify(scenario.response,null,2):t('Waiting for the Arm service.','Warten auf den Arm-Service.');
 $('service-status').textContent=error?t('Error: ','Fehler: ')+errorText(error):!scenario.input?t('Submit a synthetic transaction to begin.','Reiche zum Start eine synthetische Transaktion ein.'):scenario.phase===5?t('Complete · decision: ','Beendet · Entscheidung: ')+(scenario.response.decision==='review'?t('review','prüfen'):t('approve','freigeben')):t('Workflow stage ','Ablaufschritt ')+scenario.phase+'/5';
 $('service-step').disabled=!scenario.input||scenario.phase===5||serviceRunner.running;$('service-run').disabled=!scenario.input||scenario.phase===5||serviceRunner.running;$('service-pause').disabled=!serviceRunner.running;
 $('deployment-note').textContent=$('deployment').value==='integrated'?t('Concept: Z environment ↔ explicit service boundary ↔ Arm Linux environment, within a future integrated platform. OS, ABI, isolation and transport still apply.','Konzept: Z-Umgebung ↔ explizite Service-Grenze ↔ Arm-Linux-Umgebung innerhalb einer zukünftigen integrierten Plattform. Betriebssystem, ABI, Isolation und Transport bleiben notwendig.'):t('Concept: Z machine ↔ external network boundary ↔ Arm machine. The same request and rule apply; no synthetic latency or energy advantage is claimed.','Konzept: Z-Rechner ↔ externe Netzwerkgrenze ↔ Arm-Rechner. Dieselbe Anfrage und Regel gelten; kein erfundener Latenz- oder Energievorteil.');
}
const serviceRunner=new ControlledRunner(()=>{scenario.step();return scenario.phase<5;},serviceRender,()=>800);
$('transaction').onsubmit=e=>{e.preventDefault();serviceRunner.pause();try{scenario.submit({amount:Number($('amount').value),foreign:$('foreign').checked});serviceRender();}catch(error){serviceRender(error);}};
$('service-step').onclick=()=>{scenario.step();serviceRender();};$('service-run').onclick=()=>serviceRunner.start();$('service-pause').onclick=()=>{serviceRunner.pause();serviceRender();};$('service-reset').onclick=()=>{serviceRunner.pause();scenario.reset();serviceRender();};$('deployment').onchange=()=>serviceRender();
const comparisons={
 separate:[t('Separate CPU systems','Getrennte CPU-Systeme'),t('IBM Z and Arm software execute on different machines. A service boundary crosses the network. Deployment, security and data movement must be managed.','IBM-Z- und Arm-Software laufen auf verschiedenen Rechnern. Eine Service-Grenze führt über das Netzwerk. Bereitstellung, Sicherheit und Datentransport müssen verwaltet werden.'),'<div class="boundary"><small>01 / MACHINE</small><div class="die-core">IBM Z</div></div><div class="boundary"><small>02 / MACHINE</small><div class="die-core arm">Arm</div></div>'],
 heterogeneous:[t('Separate core types on one chip','Getrennte Kerntypen auf einem Chip'),t('A hypothetical heterogeneous chip has dedicated Z cores and dedicated Arm cores. Both types share a package, but an individual core does not natively support both ISAs. This is a comparison model, not IBM’s announcement.','Ein hypothetischer heterogener Chip besitzt dedizierte Z-Kerne und dedizierte Arm-Kerne. Beide Typen teilen ein Package; ein einzelner Kern unterstützt aber nicht beide ISAs nativ. Das ist ein Vergleichsmodell, nicht IBMs Ankündigung.'),'<div class="boundary"><small>01 / CHIP</small><div class="die-core">Z CORE</div><div class="die-core arm">Arm CORE</div></div>'],
 emulated:[t('Software emulation or translation','Softwareemulation oder Übersetzung'),t('A software layer implements or translates guest instructions for a host ISA. Its correctness and coverage depend on that implementation. This is different from hardware natively supporting both instruction sets. No performance ranking is implied.','Eine Softwareschicht implementiert oder übersetzt Gastbefehle für eine Host-ISA. Korrektheit und Abdeckung hängen von dieser Implementierung ab. Das unterscheidet sich von nativer Hardwareunterstützung beider Befehlssätze. Daraus folgt keine Leistungsrangfolge.'),'<div class="boundary"><small>SOFTWARE / HARDWARE</small><div class="translate">GUEST ISA → TRANSLATION → HOST ISA</div><div class="die-core">HOST CORE</div></div>'],
 native:[t('IBM’s announced native dual-ISA design','IBMs angekündigtes natives Dual-ISA-Design'),t('Each core in the announced design supports both IBM Z and Arm natively. This diagram means capability, not one mixed-ISA process or a published dual-decoder pipeline. Software environments still require OS, ABI and isolation support.','Jeder Kern des angekündigten Designs unterstützt IBM Z und Arm nativ. Das Diagramm zeigt Fähigkeiten, keinen Prozess mit gemischten ISAs und keine veröffentlichte Dual-Decoder-Pipeline. Softwareumgebungen benötigen weiterhin Betriebssystem-, ABI- und Isolationsunterstützung.'),'<div class="boundary"><small>01 / CORE DESIGN</small><div class="die-core dual"><span class="z">IBM Z</span> × <span class="arm">Arm</span></div><div class="die-core dual"><span class="z">IBM Z</span> × <span class="arm">Arm</span></div></div>']
};
function compare(id){const [title,copy,diagram]=comparisons[id];$('compare-title').textContent=title;$('compare-copy').textContent=copy;$('compare-diagram').innerHTML=diagram;for(const b of document.querySelectorAll('[data-compare]'))b.setAttribute('aria-pressed',String(b.dataset.compare===id));}
for(const b of document.querySelectorAll('[data-compare]'))b.onclick=()=>compare(b.dataset.compare);
document.addEventListener('visibilitychange',()=>{if(document.hidden){pause();serviceRunner.pause();serviceRender();}});window.addEventListener('pagehide',()=>{runner.pause();serviceRunner.pause();});
render();serviceRender();compare('native');
mountStations({
 onLeave(){runner.pause();serviceRunner.pause();render();serviceRender();},
 formatPosition:(number,total)=>t(`Station ${number} of ${total}`,`Station ${number} von ${total}`)
});
document.documentElement.dataset.dualIsaReady='true';
