import {phaseView,groupStatus} from './presentation.js';
import {inspect,createDemo,exportZip,LIMITS} from './core.js';
import {probeUnsupportedFormat} from './format-probe.js';
import {preparePhases,SearchRun,BLIND_LIMITS} from './search.js';
const de=document.documentElement.lang==='de',$=id=>document.getElementById(id),say=(en,german)=>de?german:en;
const locale=de?'de-DE':'en-US',num=n=>n.toLocaleString(locale),seconds=ms=>ms<1000?Math.round(ms)+' ms':(ms/1000).toLocaleString(locale,{maximumFractionDigits:1})+' s';
const errors={limits:say('Resource limit exceeded. See the documented size and expansion limits.','Ressourcenlimit überschritten. Beachte die dokumentierten Größen- und Entpacklimits.'),malformed:say('Malformed or inconsistent ZIP file.','Beschädigte oder widersprüchliche ZIP-Datei.'),split:say('Split or multi-volume archives are unsupported.','Mehrteilige Archive werden nicht unterstützt.'),encryption:say('This encryption variant is unsupported.','Diese Verschlüsselungsvariante wird nicht unterstützt.'),compression:say('Only Stored and Deflate compression are supported.','Nur Stored- und Deflate-Kompression werden unterstützt.'),'unsafe-path':say('An unsafe output path was rejected.','Ein unsicherer Ausgabepfad wurde abgewiesen.'),duplicate:say('Duplicate or conflicting output filenames were rejected.','Doppelte oder kollidierende Ausgabenamen wurden abgewiesen.'),symlink:say('Archives containing symbolic links are unsupported.','Archive mit symbolischen Links werden nicht unterstützt.'),unencrypted:say('No encrypted file found; password recovery is unnecessary.','Keine verschlüsselte Datei gefunden; eine Passwortsuche ist nicht nötig.'), 'owner-only':say('This PDF opens without an opening password; owner permissions are not an opening-password lock.','Dieses PDF lässt sich ohne Öffnungspasswort öffnen; Eigentümerrechte sind keine Öffnungspasswort-Sperre.'),'empty-zipcrypto':say('No independently verifiable encrypted payload. Empty ZipCrypto checks cannot prove a password.','Kein unabhängig prüfbarer verschlüsselter Inhalt. Leere ZipCrypto-Dateien können ein Passwort nicht beweisen.'),independent:say('The candidate did not pass independent extraction of every file. No recovered output is released. Check for corruption or different passwords per entry.','Der Kandidat bestand die unabhängige Entschlüsselung aller Dateien nicht. Keine Ausgabe wird freigegeben. Prüfe Dateischäden oder unterschiedliche Passwörter je Eintrag.'),worker:say('A local Worker failed. Reset and try fewer workers.','Ein lokaler Worker ist fehlgeschlagen. Setze zurück und probiere weniger Worker.'),verification:say('Local verification failed. The file may be corrupted.','Die lokale Prüfung ist fehlgeschlagen. Die Datei könnte beschädigt sein.'),password:say('Enter a nonempty demonstration password, at most 128 UTF-8 bytes.','Gib ein Testpasswort mit 1–128 UTF-8-Bytes ein.')};
const states={starting:say('PREPARING','VORBEREITUNG'),running:say('SEARCHING','SUCHE LÄUFT'),paused:say('PAUSED','PAUSIERT'),stopping:say('STOPPING','WIRD GESTOPPT'),stopped:say('STOPPED','GESTOPPT'),draining:say('CONFIRMING','BESTÄTIGUNG'),verifying:say('VERIFYING ALL FILES','ALLE DATEIEN PRÜFEN'),found:say('PASSWORD RECOVERED','PASSWORT WIEDERHERGESTELLT'),exhausted:say('SEARCH EXHAUSTED','SUCHRAUM ERSCHÖPFT'),error:say('ERROR','FEHLER')};
let runConfig=null,phaseRun=null,phaseNodes=[],journeyNodes=new Map(),lastViewPaint=0,lastViewState=null;
let file=null,info=null,run=null,result=null,sample=null,token=0,preparing=false,rateSample={elapsed:0,checked:0n},currentRate=0;const urls=new Set();
const phaseName=p=>p.kind==='dictionary'?`${({common:say('Common & IT','Häufig & IT'),de:say('German','Deutsch'),en:say('English','Englisch')})[p.language]??'Dictionary'} · ${p.yearMin?say('years','Jahre')+' '+p.yearMin+'–'+p.yearMax:p.suffixDigits?say('numeric suffix','Ziffernanhang')+' '+p.suffixDigits:say('case + leetspeak','Schreibweise + Leetspeak')}`:`Brute Force · ${p.length} ${say('characters','Zeichen')} · ${p.charset.length} ${say('symbols','Zeichen im Alphabet')}`;
function download(blob,name){const u=URL.createObjectURL(blob);urls.add(u);const a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>{URL.revokeObjectURL(u);urls.delete(u);},60000);}
function cleanupUrls(){for(const u of urls)URL.revokeObjectURL(u);urls.clear();}
function busy(){return preparing||run&&!run.closed;}
function controls(){const locked=Boolean(busy());for(const id of ['file','remove','mode','de','en','common','brute','min','max','lower','upper','digits','symbols','workers','load-demo'])$(id).disabled=locked||(id==='remove'&&!file)||(id==='load-demo'&&!sample);$('start').disabled=locked||!info?.supported;$('pause').disabled=run?.state!=='running';$('resume').disabled=run?.state!=='paused';$('stop').disabled=!locked||run?.state==='stopping';refreshSelection();}
function status(message,detail=''){text('status',message);text('status-detail',detail);}
function clearResult(){result=null;$('result').hidden=true;$('recovered').value='';$('recovered').type='password';$('reveal').setAttribute('aria-pressed','false');$('downloads').replaceChildren();$('result-summary').textContent='';for(const id of ['result-strategy','result-method','result-engine','result-checks','result-time','result-format','verification-time','download-count'])text(id,'');$('reveal').textContent=say('Show password','Passwort anzeigen');cleanupUrls();}
function clearSearch(){document.body.dataset.state='ready';document.body.dataset.recoveryState='ready';run?.dispose();run=null;runConfig=null;phaseRun=null;lastViewState=null;preparing=false;clearResult();text('rate-label',say('Measured attempts / second','Gemessene Versuche / Sekunde'));for(const id of ['checked','rate','average','elapsed','space','remaining','phase'])$(id).textContent='—';$('progress').value=0;$('progress-label').textContent='0%';rateSample={elapsed:0,checked:0n};currentRate=0;paintPhases(true);refreshSelection();}
function metadata(items){$('metadata').replaceChildren();for(const [key,value] of items){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=key;dd.textContent=value;$('metadata').append(dt,dd);}}
function inspectOther(blob,format){
 return new Promise((resolve,reject)=>{
  const w=new Worker(new URL('./format-worker.js',import.meta.url),{type:'module'});
  const timeout=setTimeout(()=>{w.terminate();reject(Object.assign(new Error('timeout'),{code:'limits'}));},45000);
  const end=()=>{clearTimeout(timeout);w.terminate();};
  w.onerror=()=>{end();reject(Object.assign(new Error('worker'),{code:'worker'}));};
  w.onmessage=({data})=>{
   if(data.type==='inspected'){end();resolve(data.info);}
   if(data.type==='error'){end();reject(Object.assign(new Error(data.code),{code:data.code}));}
  };
  w.postMessage({type:'inspect',blob,format});
 });
}
async function select(selected){if(busy())return;const id=++token;clearSearch();file=selected;info=null;metadata([]);controls();if(!selected){status(say('READY','BEREIT'));return;}status(say('READING HEADER','HEADER EINLESEN'));
 try{
 const detected=await inspect(selected);
 if(id!==token)return;
 // Only the real local WASM backend may enable a non-ZIP search.
 const found=detected.format==='ZIP'||detected.format==='UNKNOWN'?detected:
  await inspectOther(selected,detected.format);
 if(id!==token)return;
 info=found;
 metadata([[say('Filename','Dateiname'),selected.name??'local-demo.zip'],[say('File size','Dateigröße'),num(selected.size)+' B'],[say('Container','Container'),found.format]]);
 if(!found.supported){
   let probe;
   try{probe=await probeUnsupportedFormat(selected,found.format);}
   catch{if(id!==token)return;status(say('FILE REJECTED','DATEI ABGEWIESEN'),say('Damaged or unsupported container header. No password search was started.','Beschädigter oder nicht unterstützter Container-Header. Es wurde keine Passwortsuche gestartet.'));return;}
   if(id!==token)return;
   const detail=({
    'rar4-main':say('RAR4 main header parsed','RAR4-Hauptheader gelesen'),
    'rar5-main':say('RAR5 main header parsed','RAR5-Hauptheader gelesen'),
    'rar5-encryption-block':say('RAR5 encryption header found','RAR5-Verschlüsselungsheader erkannt'),
    '7z-encoded':say('7Z encoded header (encryption not established)','7Z kodierter Header (Verschlüsselung nicht bestätigt)'),
    '7z-plain':say('7Z ordinary header (encryption not established)','7Z normaler Header (Verschlüsselung nicht bestätigt)'),
    'pdf-version':say('PDF version header parsed','PDF-Versionsheader gelesen')
   })[probe.detail]??say('Signature only','Nur Dateisignatur');
   metadata([[say('Filename','Dateiname'),selected.name??say('Local file','Lokale Datei')],[say('File size','Dateigröße'),num(selected.size)+' B'],[say('Container','Container'),found.format],
    [say('Header inspection','Headerprüfung'),detail],
    ...(probe.version?[[say('PDF version','PDF-Version'),probe.version]]:[]),
    ...(probe.headerEncrypted===true?[[say('Header protection','Header-Schutz'),say('Encrypted archive headers detected','Verschlüsselte Archiv-Header erkannt')]]:[]),
    ...(probe.volume?[[say('Volumes','Teile'),say('Multi-volume archive detected','Mehrteiliges Archiv erkannt')]]:[]),
    [say('Password verification','Passwortprüfung'),say('Not implemented for this format','Für dieses Format nicht implementiert')],
    [say('Recovered downloads','Wiederhergestellte Downloads'),say('Unavailable','Nicht verfügbar')]]);
   status(say('UNSUPPORTED','NICHT UNTERSTÜTZT'),found.format+': '+say('metadata only; no password testing, extraction or export.','nur Metadaten; keine Passwortprüfung, Entschlüsselung oder Export.'));
   return;
  }
 metadata([[say('Filename','Dateiname'),selected.name??'local-demo.zip'],[say('File size','Dateigröße'),num(selected.size)+' B'],['Container',found.format],[say('Encryption','Verschlüsselung'),found.algorithms.join(' + ')],[say('Files / encrypted','Dateien / verschlüsselt'),`${found.entries.length} / ${found.encryptedCount}`],[say('Output size','Ausgabegröße'),num(found.total)+' B'],[say('Filenames','Dateinamen'),found.filenamesEncrypted?say('Encrypted with archive headers','Mit Archiv-Headern verschlüsselt'):say('Visible or separately encrypted','Sichtbar oder separat verschlüsselt')],[say('Extraction','Entpacken'),say('Local, after verified recovery','Lokal, nach bestätigter Wiederherstellung')],[say('Parameters','Parameter'),found.format==='ZIP'?(found.algorithms.some(a=>a.includes('AES'))?'PBKDF2-HMAC-SHA-1 · 1,000 · HMAC-SHA-1-80':'ZipCrypto · CRC-32'):say('Format-specific password derivation · local WASM','Formatspezifische Schlüsselableitung · lokales WASM')]]);status(say('READY','BEREIT'),say('Choose your search methods. No password length was inferred.','Wähle deine Suchmethoden. Es wurde keine Passwortlänge abgeleitet.'));
 }catch(e){if(id!==token)return;info=null;status(say('FILE REJECTED','DATEI ABGEWIESEN'),errors[e.code]??errors.malformed);}finally{if(id===token)controls();}
}
function config(){const c={german:$('de').checked,english:$('en').checked,common:$('common').checked,brute:$('brute').checked,mode:$('mode').value,min:Number($('min').value),max:Number($('max').value)};for(const k of ['lower','upper','digits','symbols'])c[k]=$(k).checked;if(!c.german&&!c.english&&!c.common&&!c.brute)throw Error(say('Choose at least one search method.','Wähle mindestens eine Suchmethode.'));return c;}
function draw(s){
 text('status',states[s.state]??s.state);document.body.dataset.state=s.state==='found'?'success':s.state;document.body.dataset.recoveryState=s.state;$('checked').textContent=num(s.checked);$('space').textContent=num(s.total);$('elapsed').textContent=seconds(s.elapsed);
 if(s.elapsed-rateSample.elapsed>=500){currentRate=Number(s.checked-rateSample.checked)/((s.elapsed-rateSample.elapsed)/1000);rateSample={elapsed:s.elapsed,checked:s.checked};}
 const average=s.elapsed?Number(s.checked)/(s.elapsed/1000):0;const finished=['found','exhausted','stopped'].includes(s.state);text('rate-label',finished?say('Average attempts / second','Durchschnittliche Versuche / Sekunde'):say('Measured attempts / second','Gemessene Versuche / Sekunde'));$('rate').textContent=s.state==='running'||s.state==='draining'?(s.elapsed>=500?num(Math.round(currentRate)):'—'):finished&&average?num(Math.round(average)):'—';$('average').textContent=average?num(Math.round(average)):'—';
 const percent=s.total?Number(s.checked*1000000n/s.total)/10000:0;$('progress').value=percent;$('progress-label').textContent=percent.toLocaleString(locale,{maximumFractionDigits:4})+'%';
 const remain=s.total-s.checked,secs=average>0&&s.elapsed>=1000?Number(remain)/average:Infinity;$('remaining').textContent=s.state==='running'&&Number.isFinite(secs)?secs>315576000?say('More than 10 years at current rate','Bei aktueller Rate über 10 Jahre'):seconds(secs*1000):'—';
 paintPhases();
 if(s.state==='exhausted')text('status-detail',say('All selected candidates were rejected. This does not prove the password is unbreakable.','Alle ausgewählten Kandidaten wurden abgewiesen. Das beweist keine Unknackbarkeit.'));
 if(s.state==='paused')text('status-detail',say('Search paused. Resume explicitly, including after returning to this tab.','Suche pausiert. Setze ausdrücklich fort, auch nach Rückkehr zu diesem Tab.'));
 if(s.state==='running')text('status-detail',say('Your CPU is checking candidates against the selected file.','Deine CPU prüft Passwortkandidaten gegen die gewählte Datei.'));
 if(s.state==='verifying')text('status-detail',say('Re-opening the archive and verifying every file independently.','Das Archiv wird erneut geöffnet und jede Datei unabhängig geprüft.'));
 if(s.state==='stopped')text('status-detail',say('Search stopped. Confirmed checks are retained; restart begins a fresh search.','Suche gestoppt. Bestätigte Versuche bleiben sichtbar; ein neuer Start beginnt von vorn.'));
 controls();
}
$('start').addEventListener('click',async()=>{if(busy()||!info?.supported)return;const id=++token;clearSearch();preparing=true;controls();status(states.starting,say('Preparing the shared dictionary indexes locally…','Gemeinsame Wörterbuchindizes werden lokal vorbereitet…'));
 try{const c=config();runConfig=c;refreshSelection();const phases=await preparePhases(c);if(id!==token)return;if(!phases.length)throw Error(say('The search has no candidates.','Die Suche hat keine Kandidaten.'));
  preparing=false;run=new SearchRun(file,phases,Number($('workers').value),{progress:draw,error:code=>{status(states.error,errors[code]??errors.verification);controls();},result:data=>{
   result=data;$('result').hidden=false;$('allzip').hidden=info?.format==='PDF';$('recovered').value=data.password;$('status-detail').textContent=say('Every file passed independent extraction and integrity checks.','Jede Datei bestand die unabhängige Entschlüsselung und Integritätsprüfung.');
   $('result-summary').textContent=`${phaseName(run.phases[data.phase])}\nCPU Worker ${data.worker} · ${num(data.checked)} ${say('confirmed attempts','bestätigte Versuche')} · ${seconds(data.elapsed)}\n${say('Independent verification','Unabhängige Bestätigung')}: ${seconds(data.verificationMs)}\n${data.algorithms.join(' + ')}`;
   const matching=run.phases[data.phase];text('result-strategy',phaseName(matching));text('result-method',methodName(matching.kind==='dictionary'?matching.language:'brute')+' · '+modeName(runConfig));text('result-engine',`CPU Worker ${data.worker}`);text('result-checks',num(data.checked));text('result-time',seconds(data.elapsed+data.verificationMs));text('result-format',info.format+' · '+data.algorithms.join(' + '));text('verification-time',say('Independent confirmation: ','Unabhängige Bestätigung: ')+seconds(data.verificationMs));
   const files=data.files.filter(f=>!f.directory);text('download-count',`(${files.length})`);
   for(const f of files){const button=document.createElement('button'),name=document.createElement('span'),size=document.createElement('span');button.type='button';name.className='download-name';name.textContent=f.name;size.className='download-size';size.textContent=num(f.blob.size)+' B ↓';button.append(name,size);button.addEventListener('click',()=>download(f.blob,f.name.split('/').at(-1)));$('downloads').append(button);}paintPhases(true);controls();
  }},info.format);$('status-detail').textContent='';paintPhases(true);await run.start();if(document.hidden)run.pause();
 }catch(e){if(id!==token)return;preparing=false;status(states.error,e.message);controls();}
});
$('file').addEventListener('change',()=>select($('file').files[0]??null));
for(const type of ['dragenter','dragover'])$('drop').addEventListener(type,e=>{e.preventDefault();if(!busy())$('drop').classList.add('dragging');});
$('drop').addEventListener('dragleave',()=>$('drop').classList.remove('dragging'));
$('drop').addEventListener('drop',e=>{e.preventDefault();$('drop').classList.remove('dragging');if(busy())return;if(e.dataTransfer.files.length!==1){status(states.error,say('Select exactly one file.','Wähle genau eine Datei.'));return;}select(e.dataTransfer.files[0]);});
$('remove').addEventListener('click',()=>{$('file').value='';select(null);});
$('mode').addEventListener('change',()=>{$('known-settings').hidden=$('mode').value!=='known';$('blind-note').hidden=$('mode').value!=='blind';});
$('pause').addEventListener('click',()=>run?.pause());$('resume').addEventListener('click',()=>{if(!document.hidden){$('status-detail').textContent='';run?.resume();}});$('stop').addEventListener('click',()=>{if(preparing){++token;preparing=false;status(states.stopped);controls();}else run?.stop();});
$('reset').addEventListener('click',()=>{++token;clearSearch();file=null;info=null;sample=null;$('file').value='';$('demo-password').value='';$('load-demo').disabled=true;$('download-demo').disabled=true;$('demo-status').textContent=say('No sample created yet.','Noch kein Beispiel erzeugt.');metadata([]);status(say('READY','BEREIT'),say('Choose your ZIP below, select methods, then start the local search.','Wähle unten deine ZIP, lege die Methoden fest und starte die lokale Suche.'));document.body.dataset.state='ready';document.body.dataset.recoveryState='ready';controls();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)run?.pause();});window.addEventListener('pagehide',()=>{run?.dispose();cleanupUrls();});
$('reveal').addEventListener('click',()=>{const show=$('recovered').type==='password';$('recovered').type=show?'text':'password';$('reveal').setAttribute('aria-pressed',String(show));$('reveal').textContent=show?say('Hide password','Passwort verbergen'):say('Show password','Passwort anzeigen');});
$('copy').addEventListener('click',async()=>{if(!result)return;try{await navigator.clipboard.writeText(result.password);$('status-detail').textContent=say('Password copied locally.','Passwort lokal kopiert.');}catch{$('status-detail').textContent=say('Clipboard unavailable. Reveal the password and copy it manually.','Zwischenablage nicht verfügbar. Zeige das Passwort an und kopiere es manuell.');}});
$('allzip').addEventListener('click',async()=>{if(!result||info?.format==='PDF')return;const data=result;$('allzip').disabled=true;try{const blob=await exportZip(data.files);if(result===data)download(blob,'recovered-files.zip');}catch{$('status-detail').textContent=errors.verification;}finally{$('allzip').disabled=false;}});
$('generate').addEventListener('click',async()=>{const id=token;$('generate').disabled=true;try{const b=await createDemo($('demo-password').value,$('demo-method').value);if(id!==token)return;sample=b;$('demo-password').value='';$('demo-status').textContent=say('Encrypted sample ready. Select it, then choose your search normally.','Verschlüsseltes Beispiel bereit. Wähle es aus und konfiguriere die Suche selbst.');$('download-demo').disabled=false;controls();}catch(e){$('demo-status').textContent=errors[e.code]??errors.verification;}finally{$('generate').disabled=false;}});
$('load-demo').addEventListener('click',()=>{if(sample)select(new File([sample],'local-demo.zip',{type:'application/zip'}));});$('download-demo').addEventListener('click',()=>{if(sample)download(sample,'local-demo.zip');});
$('workers').value=String(Math.min(2,Math.max(1,(navigator.hardwareConcurrency??2)-1)));$('cpu-status').textContent=say('CPU Workers · ','CPU-Worker · ')+(navigator.hardwareConcurrency??say('unknown','unbekannt'))+say(' logical processors reported by browser.',' vom Browser gemeldete logische Prozessoren.');
$('gpu-diagnostics').textContent=JSON.stringify({cpu:'Worker + ZipCrypto / PBKDF2-HMAC-SHA-1',webgpuInterface:Boolean(navigator.gpu),zipGPU:'algorithm-unsupported',hybrid:'not-implemented',measuredGPUCandidates:0,yearMin:BLIND_LIMITS.yearMin,yearMax:BLIND_LIMITS.yearMax,limits:LIMITS},null,2);
$('gpu-check').addEventListener('click',async()=>{let adapter=null,code='interface-unavailable';try{if(navigator.gpu){adapter=await navigator.gpu.requestAdapter();code=adapter?'adapter-available-algorithm-unsupported':'adapter-unavailable';}}catch{code='initialization-failed';}$('gpu-diagnostics').textContent=JSON.stringify({code,adapter:adapter?{vendor:adapter.info?.vendor??'',architecture:adapter.info?.architecture??'',description:adapter.info?.description??''}:null,zipGPU:'algorithm-unsupported',hybrid:'not-implemented',measuredGPUCandidates:0},null,2);});
function text(id,value){const node=$(id);if(node.textContent!==String(value))node.textContent=String(value);}
const methodName=key=>({common:say('Common passwords & IT','Häufige Passwörter & IT'),de:say('German dictionary','Deutsches Wörterbuch'),en:say('English dictionary','Englisches Wörterbuch'),brute:say('Brute force','Bruteforce')})[key];
const groupNames={words:say('Words & variants','Wörter & Varianten'),years:say('Year suffixes','Jahreszahlen'),numbers:say('Numeric suffixes','Ziffernanhänge'),brute:say('Brute force','Bruteforce')};
const phaseLabels={complete:say('Completed','Abgeschlossen'),active:say('Active','Aktiv'),paused:say('Paused','Pausiert'),matched:say('Verified match','Bestätigter Treffer'),partial:say('Partially checked','Teilweise geprüft'),pending:say('Upcoming','Ausstehend')};
function selection(){return {german:$('de').checked,english:$('en').checked,common:$('common').checked,brute:$('brute').checked,mode:$('mode').value};}
function selectedKeys(c){return ['common','de','en','brute'].filter(k=>c[k==='de'?'german':k==='en'?'english':k]);}
function modeName(c){return c.mode==='known'?say('Prior knowledge','Vorwissen-Modus'):say('Blind search','Blinde Suche');}
function refreshSelection(){
 const c=run&&runConfig?runConfig:selection(),keys=selectedKeys(c),active=new Set(run?.state==='running'?[...run.pending.values()].map(j=>run.phases[j.pi].kind==='dictionary'?run.phases[j.pi].language:'brute'):[]);
 const signature=keys.join(',');if($('selected-methods').dataset.methods!==signature){$('selected-methods').replaceChildren();for(const key of keys){const badge=document.createElement('span');badge.className='method-badge';badge.dataset.method=key;badge.textContent=methodName(key);$('selected-methods').append(badge);}if(!keys.length){const label=document.createElement('span');label.className='help';label.textContent=say('Choose at least one method below.','Wähle unten mindestens eine Methode.');$('selected-methods').append(label);}$('selected-methods').dataset.methods=signature;}
 for(const badge of $('selected-methods').querySelectorAll('[data-method]'))badge.dataset.active=String(active.has(badge.dataset.method));
 text('methods-label',run?say('Methods used in this search','Methoden dieser Suche'):say('Selected methods','Ausgewählte Methoden'));
 text('live-mode',modeName(c));text('mode-activity',modeName(c)+(c.mode==='known'?say(' · explicit hints',' · eigene Hinweise'):say(' · no assumed length',' · keine angenommene Länge')));
 text('live-file',file?.name??say('No file selected','Keine Datei ausgewählt'));
 text('file-status',info?.supported?info.format+' · '+info.algorithms.join(' + ')+say(' · supported',' · unterstützt'):info?.supported===false?info.format+say(' · recovery unsupported',' · Wiederherstellung nicht unterstützt'):file?say('No supported encrypted file is ready.','Keine unterstützte verschlüsselte Datei ist bereit.'):say('Choose a file to begin.','Wähle eine Datei zum Beginnen.'));
 $('file-status').dataset.supported=String(Boolean(info?.supported));
 text('config-summary',`${info?.supported?info.format+' · ':''}CPU · ${$('workers').value} ${say('workers','Worker')} · ${modeName(selection())} · ${selectedKeys(selection()).length} ${say('selected methods','gewählte Methoden')}`);
 const state=run?.state,activeWorkers=run?.pending.size??0;
 text('cpu-activity',state==='running'?`${activeWorkers} ${say('workers · local format verification','Worker · lokale Formatprüfung')}`:state==='verifying'?say('Fresh Worker · checking every file','Neuer Worker · prüft alle Dateien'):state==='paused'?say('Paused · no new attempts','Pausiert · keine neuen Versuche'):state==='found'?say('Finished · independently verified','Fertig · unabhängig bestätigt'):state==='stopped'||state==='exhausted'?say('Finished · workers released','Beendet · Worker freigegeben'):preparing||state==='starting'?say('Preparing local search','Lokale Suche wird vorbereitet'):`${say('Ready','Bereit')} · ${$('workers').value} ${say('workers selected','Worker gewählt')}`);
 $('cpu-chip').dataset.active=String(state==='running'||state==='verifying'||state==='draining');text('cpu-live-rate',state==='running'&&currentRate>0?num(Math.round(currentRate)):'—');
 if(!run)paintPhases();
}
function paintPhases(force=false){
 const state=run?.state??'ready',now=performance.now();if(!force&&state===lastViewState&&now-lastViewPaint<120)return;lastViewPaint=now;lastViewState=state;
 if(!run){
  $('phase-rows').replaceChildren();$('phase-journey').replaceChildren();phaseRun=null;phaseNodes=[];journeyNodes=new Map();const c=selection(),groups=[...(c.german||c.english||c.common?['words','years','numbers']:[]),...(c.brute?['brute']:[])];
  for(const group of groups){const li=document.createElement('li');li.dataset.state='pending';li.textContent=groupNames[group]+' · '+say('Ready to start','Bereit zum Start');$('phase-journey').append(li);}text('phase',say('Waiting for your search','Wartet auf deinen Start'));text('phase-number','');text('phase-count','');return;
 }
 const pending=[...run.pending.values()].map(j=>j.pi),rows=phaseView(run.phases,run.phaseDone,pending,state,run.winner?.phase);
 if(phaseRun!==run){
  phaseRun=run;phaseNodes=[];journeyNodes=new Map();$('phase-rows').replaceChildren();$('phase-journey').replaceChildren();
  for(const row of rows){const tr=document.createElement('tr'),name=document.createElement('td'),count=document.createElement('td'),status=document.createElement('td');name.textContent=phaseName(row.phase);tr.append(name,count,status);$('phase-rows').append(tr);phaseNodes.push({tr,count,status});if(!journeyNodes.has(row.group)){const li=document.createElement('li');$('phase-journey').append(li);journeyNodes.set(row.group,li);}}
 }
 for(const row of rows){const n=phaseNodes[row.index];n.tr.dataset.state=row.status;n.count.textContent=num(row.checked)+' / '+num(row.phase.count);n.status.textContent=phaseLabels[row.status];}
 for(const [group,node] of journeyNodes){const status=groupStatus(rows.filter(r=>r.group===group));node.dataset.state=status;node.textContent=groupNames[group]+' · '+phaseLabels[status];}
 const completed=rows.filter(r=>r.status==='complete').length,current=run.winner?.phase??pending[0];
 text('phase',state==='verifying'?say('Independent extraction of every file','Unabhängige Entschlüsselung aller Dateien'):current!==undefined?phaseName(run.phases[current]):state==='exhausted'?say('All configured phases completed','Alle konfigurierten Phasen abgeschlossen'):say('Search inactive','Suche inaktiv'));
 text('phase-number',state==='found'?(completed===rows.length?say('Verified match · all phases fully checked','Bestätigter Treffer · alle Phasen vollständig geprüft'):say('Verified match · remaining phases were not exhausted','Bestätigter Treffer · restliche Phasen nicht ausgeschöpft')):`${completed} / ${rows.length} ${say('phases completed','Phasen abgeschlossen')}${new Set(pending).size>1?' · '+say('parallel phases','parallele Phasen')+': '+new Set(pending).size:''}`);text('phase-count',`(${rows.length})`);
}
for(const id of ['common','de','en','brute','mode','workers','min','max','lower','upper','digits','symbols'])$(id).addEventListener('change',()=>{refreshSelection();if(!run)paintPhases(true);});
controls();paintPhases(true);window.archiveRecoveryReady=true;
