import {root,nodes,resolvePath,counts,doorPath} from './filesystem.mjs';
import {Recovery,stages} from './recovery.mjs';
import {Landscape} from './landscape.mjs';
const de=document.documentElement.lang==='de',lang=de?'de':'en',t=(en,ger)=>de?ger:en,$=id=>document.getElementById(id);
const model=new Recovery();let cwd=root,selected=root,terminalCwd=root,denials=0;
const stageLabels={diagnose:t('diagnose systems','Systeme prüfen'),isolate:t('isolate bypass','Umgehung isolieren'),reboot:t('restart services','Dienste neu starten'),power:t('restore power','Strom wiederherstellen'),communications:t('restore communications','Kommunikation starten'),fences:t('test fence circuits','Zaunkreise prüfen'),doors:t('restore visitor-center door locks','Türverriegelung wiederherstellen')};
const messages={diagnose:t('Diagnostic complete: maintenance bypass found. Isolate it before restarting.','Diagnose abgeschlossen: Wartungsumgehung gefunden. Vor dem Neustart isolieren.'),isolate:t('Bypass isolated. Safe to restart the fictional control services.','Umgehung isoliert. Die fiktiven Steuerdienste können neu starten.'),reboot:t('Control services restarted. Main power bus remains disconnected.','Steuerdienste neu gestartet. Hauptstrombus noch getrennt.'),power:t('Main power bus online. Communications relay can now start.','Hauptstrombus aktiv. Kommunikationsrelais kann jetzt starten.'),communications:t('Communications relay online. Test circuits A, B and C.','Kommunikationsrelais aktiv. Stromkreise A, B und C prüfen.'),fences:t('All three fence circuits passed. Locate door.control in the 3D filesystem.','Alle drei Zaunkreise geprüft. Suche door.control im 3D-Dateisystem.'),doors:t('Visitor-center door locks restored. SYSTEM SECURED. Recovery complete.','Türverriegelung im Besucherzentrum wiederhergestellt. SYSTEM GESICHERT. Wiederherstellung abgeschlossen.')};
const landscape=new Landscape($('landscape'),{select:selectNode,open:openNode,label:t('DIRECTORY LANDSCAPE / drag to orbit','VERZEICHNISLANDSCHAFT / Ziehen zum Drehen')});
function setMode(bonus,focus=false){
 $('workstation').hidden=bonus;$('bonus').hidden=!bonus;
 $('mode-workstation').setAttribute('aria-pressed',String(!bonus));$('mode-bonus').setAttribute('aria-pressed',String(bonus));
 $('mode-context').textContent=bonus?t('FILM-INSPIRED BONUS · FICTIONAL SYSTEMS','FILMINSPIRIERTER BONUS · FIKTIVE SYSTEME'):t('HISTORICALLY INSPIRED · INDEPENDENT RECONSTRUCTION','HISTORISCH INSPIRIERT · EIGENSTÄNDIGE REKONSTRUKTION');
 if(!bonus)landscape.draw();
 if(focus)$(bonus?'bonus':'workstation').focus({preventScroll:true});
}
$('mode-workstation').addEventListener('click',()=>setMode(false));$('mode-bonus').addEventListener('click',()=>setMode(true));
function permission(n){return n.children?'dr-xr-xr-x':'-r--r--r--';}
function selectNode(node){
 selected=node;landscape.selected=node;landscape.draw();
 $('inspector-title').textContent=node.name;
 $('metadata').replaceChildren();
 const fields=[[t('Path','Pfad'),node.path],[t('Type','Typ'),node.children?t('Directory','Verzeichnis'):t('Text / museum module','Text / Museumsmodul')],[t('Size','Größe'),node.size+' '+t('bytes · fictional volume','Bytes · fiktives Volume')],[t('Age','Alter'),node.age+' '+t('days · fictional','Tage · fiktiv')],[t('Mode','Modus'),permission(node)]];
 for(const [label,value] of fields){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;$('metadata').append(dt,dd);}
 $('file-content').textContent=node.children?node.description[lang]:node.content[lang];
 $('open-item').textContent=node.children?t('Open directory','Verzeichnis öffnen'):t('Read file','Datei lesen');
 $('file-action').hidden=!node.action;
 $('file-action').textContent=node.action==='dennis'?t('Open lockscreen','Sperrbildschirm öffnen'):node.action==='shark'?t('View spare monitor','Zweitmonitor ansehen'):t('Run module in bonus mode','Modul im Bonusmodus ausführen');
 $('inspect-message').textContent='';
 for(const button of $('directory-list').querySelectorAll('button'))button.setAttribute('aria-pressed',String(button.dataset.path===node.path));
 $('landscape-status').textContent=(node.children?t('Directory','Verzeichnis'):t('File','Datei'))+' / '+node.path;
 if(node.path===doorPath)model.inspectDoor();
}
function navigate(node){if(!node?.children)return;cwd=node;$('pathbar').textContent=cwd.path;$('directory-caption').textContent=cwd.children.length+' '+t('items','Einträge');$('nav-up').disabled=!cwd.parent;$('directory-list').replaceChildren();
 for(const item of cwd.children){const button=document.createElement('button');button.type='button';button.dataset.path=item.path;button.textContent=(item.children?'▰ ':'▤ ')+item.name;const small=document.createElement('small');small.textContent=item.children?item.children.length+' '+t('items','Einträge'):item.size+' B';button.append(small);button.addEventListener('click',()=>selectNode(item));button.addEventListener('dblclick',()=>openNode(item));$('directory-list').append(button);}
 landscape.setDirectory(cwd);$('zoom').value='100';selectNode(cwd);
}
function openNode(node){if(node.children){navigate(node);return;}
 if(node.parent!==cwd)navigate(node.parent);selectNode(node);
 if(node.action==='dennis')lockscreenSequence();else if(node.action==='shark')$('shark-dialog').showModal();
 else {$('inspect-message').textContent=t('File opened in the inspector.','Datei im Inspektor geöffnet.');$('file-content').focus({preventScroll:true});}
}
$('open-item').addEventListener('click',()=>openNode(selected));
$('nav-up').addEventListener('click',()=>{if(cwd.parent)navigate(cwd.parent);});
$('nav-reset').addEventListener('click',()=>{landscape.view('overview');navigate(root);$('file-search').value='';$('search-results').replaceChildren();syncView('overview');});
function syncView(name){for(const b of document.querySelectorAll('[data-view]'))b.setAttribute('aria-pressed',String(b.dataset.view===name));$('zoom').value='100';}
for(const b of document.querySelectorAll('[data-view]'))b.addEventListener('click',()=>{landscape.view(b.dataset.view);syncView(b.dataset.view);});
$('zoom').addEventListener('input',()=>{landscape.zoom=Number($('zoom').value)/100;landscape.draw();});
$('file-search').addEventListener('input',()=>{const q=$('file-search').value.trim().toLowerCase();$('search-results').replaceChildren();if(!q)return;
 const matches=[...nodes.values()].filter(n=>n.name.toLowerCase().includes(q));
 const note=document.createElement('p');note.textContent=matches.length+' '+t('matches','Treffer');$('search-results').append(note);
 for(const n of matches.slice(0,12)){const b=document.createElement('button');b.textContent=n.name;b.title=n.path;b.type='button';b.addEventListener('click',()=>{navigate(n.children?n:n.parent);selectNode(n);});$('search-results').append(b);}
});
$('landscape').addEventListener('keydown',e=>{
 const visible=[...new Set((landscape.boxes||[]).map(b=>b.node))];
 if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();const direction=['ArrowLeft','ArrowUp'].includes(e.key)?-1:1;selectNode(visible[(visible.indexOf(selected)+direction+visible.length)%visible.length]);}
 else if(e.key==='Enter'){e.preventDefault();openNode(selected);}else if(e.key==='Backspace'){e.preventDefault();if(cwd.parent)navigate(cwd.parent);}
});
function log(text){const out=$('terminal-output');const lines=(out.textContent+'\n'+text).trimStart().split('\n');out.textContent=lines.slice(-180).join('\n');out.scrollTop=out.scrollHeight;$('terminal-feedback').textContent=text;}
function drawRecovery(){
 for(const b of document.querySelectorAll('[data-action]')){const done=model.completed.has(b.dataset.action);b.classList.toggle('done',done);b.classList.toggle('next',model.next===b.dataset.action);b.setAttribute('aria-label',stageLabels[b.dataset.action]+(done?' / '+t('complete','abgeschlossen'):''));}
 $('locate-module').classList.toggle('next',model.next==='doors');
 const status=$('service-status');status.replaceChildren();for(const service of ['power','communications','fences','doors']){const online=model.completed.has(service);const line=document.createElement('span');line.classList.toggle('online',online);line.textContent=({power:t('POWER','STROM'),communications:t('COMMS','KOMM.'),fences:t('FENCES A/B/C','ZÄUNE A/B/C'),doors:t('DOOR LOCKS','TÜRSCHLÖSSER')})[service]+' / '+(online?t('ONLINE','AKTIV'):t('OFFLINE','INAKTIV'));status.append(line);for(const g of document.querySelectorAll('[data-service='+service+']'))g.classList.toggle('online',online);}
 $('system-banner').textContent=model.secured?t('SYSTEM SECURED','SYSTEM GESICHERT'):t('SYSTEM COMPROMISED','SYSTEM BEEINTRÄCHTIGT');$('system-banner').classList.toggle('secured',model.secured);
 $('recovery-hint').textContent=model.secured?t('Recovery complete. Explore the files, or restart the scenario.','Wiederherstellung abgeschlossen. Erkunde die Dateien oder starte das Szenario neu.'):model.next==='doors'?t('Final step: locate Visitor.Center/door.control in fsn, inspect it and run its restore module.','Letzter Schritt: Visitor.Center/door.control in fsn suchen, prüfen und das Wiederherstellungsmodul starten.'):t('Next: ','Nächster Schritt: ')+stageLabels[model.next]+'.';
}
function apply(action){const result=model.apply(action);let message;
 if(!result.ok)message=result.reason==='module'?t('Module not inspected. Find door.control in the filesystem first.','Modul noch nicht geprüft. Finde zuerst door.control im Dateisystem.'):result.reason==='dependency'?t('Interlock: first ','Verriegelung: zuerst ')+stageLabels[result.required]+'.':t('Unknown module.','Unbekanntes Modul.');
 else message=result.reason==='already'?t('Already complete: ','Bereits abgeschlossen: ')+stageLabels[action]+'.':messages[action];
 log(message);drawRecovery();return message;
}
for(const b of document.querySelectorAll('[data-action]'))b.addEventListener('click',()=>apply(b.dataset.action));
$('file-action').addEventListener('click',()=>{
 if(selected.action==='dennis'){lockscreenSequence();return;}if(selected.action==='shark'){$('shark-dialog').showModal();return;}
 const action=selected.action;setMode(true,true);const message=apply(action);$('inspect-message').textContent=message;
});
$('locate-module').addEventListener('click',()=>{setMode(false,true);navigate(root);$('file-search').focus();$('inspect-message').textContent=t('Find Physical.Plant → Physical.Security → Visitor.Center → door.control, or search its name.','Suche Physical.Plant → Physical.Security → Visitor.Center → door.control oder nutze die Namenssuche.');});
function startScenario(){model.reset();denials=0;terminalCwd=root;$('terminal-output').textContent='';log(t('PARK / LOCAL RECOVERY CONSOLE\nMaintenance bypass detected. Services are offline.\nType help, or begin with “Diagnose systems”.','PARK / LOKALE WIEDERHERSTELLUNGSKONSOLE\nWartungsumgehung erkannt. Dienste sind inaktiv.\nGib help ein oder beginne mit „Systeme prüfen“.'));drawRecovery();}
$('recovery-reset').addEventListener('click',()=>{startScenario();});$('clear-terminal').addEventListener('click',()=>$('terminal-output').textContent='');
function denial(){denials++;log('access: '+t('PERMISSION DENIED.','ZUGRIFF VERWEIGERT.'));if(denials>=3){log(t('THE MAGIC WORD IS MISSING.','DAS ZAUBERWORT FEHLT.'));showDennis();}else log(denials===1?t('Try: access security grid','Versuch: access security grid'):t('Try: access main security grid','Versuch: access main security grid'));}
function showDennis(){$('magic-feedback').textContent='';$('magic').value='';if(!$('dennis-dialog').open)$('dennis-dialog').showModal();}
function lockscreenSequence(){setMode(true,true);for(let i=0;i<3;i++)denial();}
$('close-dennis').addEventListener('click',()=>$('dennis-dialog').close());$('close-shark').addEventListener('click',()=>$('shark-dialog').close());
function magicWord(word){if(['please','bitte'].includes(word.trim().toLowerCase())){denials=0;$('dennis-dialog').close();log(t('Politeness acknowledged. Dennis returns you to the recovery console.','Höflichkeit erkannt. Dennis gibt die Wiederherstellungskonsole frei.'));return true;}return false;}
$('magic-form').addEventListener('submit',e=>{e.preventDefault();if(!magicWord($('magic').value))$('magic-feedback').textContent=t('That word could be a little friendlier.','Das Wort könnte etwas freundlicher sein.');});
$('terminal-form').addEventListener('submit',e=>{e.preventDefault();const raw=$('command').value.trim();$('command').value='';if(!raw)return;log('> '+raw);const [verb,...rest]=raw.split(/\s+/),arg=rest.join(' '),v=verb.toLowerCase();
 if(v==='help'){log(t('help · status · diagnose · isolate · reboot\nrestore power | communications | fences | doors\nls · pwd · cd PATH · cat PATH · open PATH · clear\nPaths are case-sensitive. No host commands are executed.\nHidden detour: access security → access security grid → access main security grid','help · status · diagnose · isolate · reboot\nrestore power | communications | fences | doors\nls · pwd · cd PFAD · cat PFAD · open PFAD · clear\nPfade beachten Groß-/Kleinschreibung. Keine Hostbefehle werden ausgeführt.\nVersteckter Umweg: access security → access security grid → access main security grid'));}
 else if(v==='status'){log(stages.map(s=>stageLabels[s]+': '+(model.completed.has(s)?t('complete','abgeschlossen'):t('pending','ausstehend'))).join('\n'));}
 else if(['diagnose','isolate','reboot'].includes(v)&&!arg)apply(v);
 else if(v==='restore'&&['power','communications','fences','doors'].includes(arg.toLowerCase()))apply(arg.toLowerCase());
 else if(v==='access'&&['security','security grid','main security grid'].includes(arg.toLowerCase()))denial();
 else if(['please','bitte'].includes(v))magicWord(v);
 else if(v==='clear')$('terminal-output').textContent='';
 else if(v==='pwd')log(terminalCwd.path);
 else if(v==='ls'){const n=arg?resolvePath(arg,terminalCwd):terminalCwd;if(!n)log(t('Path not found.','Pfad nicht gefunden.'));else log(n.children?n.children.map(c=>(c.children?'d ':'- ')+c.name).join('\n'):n.name);}
 else if(['cd','cat','open'].includes(v)){
  const n=resolvePath(arg||'/park',terminalCwd);if(!n)log(t('Path not found.','Pfad nicht gefunden.'));
  else if(v==='cd'){if(n.children){terminalCwd=n;log(n.path);}else log(t('Not a directory.','Kein Verzeichnis.'));}
  else if(v==='cat'){if(n.children)log(t('Use ls for a directory.','Nutze ls für Verzeichnisse.'));else {log(n.content[lang]);if(n.path===doorPath)model.inspectDoor();}}
  else {setMode(false,true);navigate(n.children?n:n.parent);openNode(n);}
 }
 else log(t('Unknown command. Type help for this bounded museum console.','Unbekannter Befehl. help zeigt die Befehle dieser begrenzten Museumskonsole.'));
});
const total=counts();$('volume-count').textContent=total.dirs+' '+t('directories','Verzeichnisse')+' / '+total.files+' '+t('files','Dateien');
navigate(root);startScenario();
if(!landscape.ctx)$('landscape-status').textContent=t('Canvas unavailable. Use the equivalent directory list below.','Canvas nicht verfügbar. Nutze die gleichwertige Verzeichnisliste unten.');
// Deliberately no animation timers. All updates are driven by user input or resize.
document.documentElement.dataset.sgiReady='true';
