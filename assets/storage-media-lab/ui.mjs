import {media,localizedMeta} from './media.mjs';
import {comparisons,examples,parseBytes,countMedia,createArchive,archiveAction} from './model.mjs';
import {objectSVG,mechanismSVG} from './illustrations.mjs';
import {sources,accessed} from './sources.mjs';
const de=document.documentElement.lang==='de',L=de?1:0,t=(en,ger)=>de?ger:en,fmt=n=>BigInt(n).toLocaleString(de?'de-DE':'en-US');
const $=s=>document.querySelector(s),all=s=>[...document.querySelectorAll(s)];
let selected='floppy',kind='floppy',step=0,target=examples[0].bytes,archive=createArchive(),busy=false,station=0;
const stationIDs=['gallery','inside','calculator','archive','ventoy'];
function showStation(id,focus=false){
 const i=stationIDs.indexOf(id);station=i<0?0:i;
 all('[data-station]').forEach((el,n)=>{el.hidden=n!==station;});
 all('.tabs a').forEach((el,n)=>{if(n===station)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');});
 $('#position').textContent=t('Station','Station')+' '+(station+1)+' / 5 · '+t('Explore at your own pace','In deinem Tempo erkunden');
 if(focus)$('[data-station]:not([hidden]) h2').focus();
}
all('[data-station-target]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();const id=a.dataset.stationTarget;history.replaceState(null,'','#'+id);showStation(id,true);}));
window.addEventListener('hashchange',()=>showStation(location.hash.slice(1),true));
function gallery(id){
 selected=id;const m=media.find(m=>m.id===id);
 $('#gallery-art').innerHTML=objectSVG(m.type,m.name[L]);
 $('#gallery-title').textContent=m.name[L];$('#gallery-capacity').textContent=localizedMeta(m,de?'de':'en').capacity;
 $('#gallery-era').textContent=localizedMeta(m,de?'de':'en').era;$('#gallery-how').textContent=m.how[L];$('#gallery-use').textContent=m.use[L];
 $('#gallery-source').href=sources[m.source].url;$('#gallery-source').textContent=sources[m.source].name+' ↗';
 all('[data-medium]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.medium===id)));
}
$('#shelf').innerHTML=media.map(m=>`<button data-medium="${m.id}" aria-pressed="false">${objectSVG(m.type,m.name[L])}<span>${m.name[L]}</span></button>`).join('');
all('[data-medium]').forEach(b=>b.addEventListener('click',()=>gallery(b.dataset.medium)));gallery(selected);
const lessons={
 floppy:[
 ['A flexible disk rotates. Concentric tracks hold encoded magnetic patterns. The head moves radially; the drawing shows only a few tracks.','Eine flexible Scheibe rotiert. Konzentrische Spuren tragen codierte Magnetmuster. Der Kopf bewegt sich radial; die Zeichnung zeigt nur wenige Spuren.'],
 ['Sectors divide tracks into addressable pieces. The standard PC HD layout is 80 × 2 × 18 × 512 = 1,474,560 bytes. The colored wedge is not a literal single bit.','Sektoren teilen Spuren in adressierbare Stücke. Das PC-HD-Layout ergibt 80 × 2 × 18 × 512 = 1.474.560 Byte. Ein Sektorausschnitt ist kein einzelnes Bit.'],
 ['Filesystem metadata uses some sectors. A head must reach the track and wait for the sector to rotate underneath it. Dirt, damage and formatting incompatibility are different problems.','Dateisystem-Metadaten brauchen Sektoren. Der Kopf muss die Spur erreichen und warten, bis der Sektor vorbeikommt. Schmutz, Schäden und Formatinkompatibilität sind unterschiedliche Probleme.']
 ],
 zip:[
 ['ZIP is magnetic too. A dedicated drive reads a flexible disk inside a thicker cartridge; the ordinary floppy drive cannot substitute for it.','ZIP arbeitet ebenfalls magnetisch. Ein eigenes Laufwerk liest eine flexible Scheibe in einer dickeren Kassette; ein Diskettenlaufwerk ersetzt es nicht.'],
 ['Higher track density and a dedicated mechanism allow much more data. This conceptual drawing does not reproduce exact ZIP head geometry or track counts.','Höhere Spurdichte und ein eigener Mechanismus erlauben viel mehr Daten. Die Prinzipzeichnung bildet keine exakte ZIP-Kopfgeometrie oder Spurzahl nach.'],
 ['100 MB is the nominal comparison unit. Actual formatted space depends on the disk and filesystem. ZIP cartridges and ZIP compressed files share a name, not a storage mechanism.','100 MB ist die nominelle Vergleichseinheit. Formatierter Platz hängt von Medium und Dateisystem ab. ZIP-Kassetten und ZIP-Archivdateien teilen einen Namen, kein Speicherverfahren.']
 ],
 cd:[
 ['A laser pickup follows a spiral. In pressed CDs, differences in reflected light reveal encoded pit/land transitions. Pits are not simply 1 and lands 0.','Eine Laseroptik folgt einer Spirale. Bei gepressten CDs werden codierte Pit-/Land-Übergänge über reflektiertes Licht erfasst. Pits sind nicht einfach 1 und Lands 0.'],
 ['Mode 1 provides 2,048 user bytes per sector. At 75 sectors per second, 74 × 60 × 75 × 2,048 = 681,984,000 bytes. Audio sectors instead carry 2,352 bytes.','Mode 1 bietet 2.048 Nutzbyte je Sektor. Bei 75 Sektoren pro Sekunde: 74 × 60 × 75 × 2.048 = 681.984.000 Byte. Audiosektoren tragen dagegen 2.352 Byte.'],
 ['A mixed-mode Quake CD has game data and separate audio tracks. Copying files from the data track does not extract the soundtrack. CD-R and CD-RW use different recording materials.','Eine Mixed-Mode-Quake-CD enthält Spieldaten und getrennte Audiospuren. Dateikopien aus dem Datentrack extrahieren den Soundtrack nicht. CD-R und CD-RW nutzen andere Aufzeichnungsmaterialien.']
 ],
 usb:[
 ['NAND stores charge in cells. The controller translates logical block addresses to physical storage. The squares here represent blocks, not individual transistors.','NAND speichert Ladung in Zellen. Der Controller übersetzt logische Blockadressen in physische Speicherbereiche. Die Kästchen stehen für Blöcke, nicht für einzelne Transistoren.'],
 ['Write a logical block again: the controller can place it elsewhere. Flash is programmed in pages and erased in larger blocks; it is not overwritten like magnetic tape.','Beim erneuten Schreiben kann der Controller einen logischen Block anderswo ablegen. Flash wird seitenweise programmiert und in größeren Blöcken gelöscht, nicht wie Magnetband überschrieben.'],
 ['Wear leveling distributes wear. Garbage collection reclaims space and error correction detects or corrects limited faults. Controller behavior varies; this is a conceptual remapping example.','Wear Leveling verteilt den Verschleiß. Garbage Collection gewinnt Platz zurück; Fehlerkorrektur erkennt oder korrigiert begrenzte Fehler. Das Controllerverhalten variiert; hier ist die Neuzuordnung vereinfacht.']
 ],
 ssd:[
 ['An SSD combines NAND packages and a controller. It is often internal storage rather than a removable carrier. There are no rotating platters.','Eine SSD kombiniert NAND-Packages und Controller. Sie ist oft interner Speicher statt Wechselmedium. Es gibt keine rotierenden Platten.'],
 ['NVMe names a command protocol, commonly over PCIe. M.2 names a physical form factor; neither term by itself describes the number of bits in a NAND cell.','NVMe bezeichnet ein Befehlsprotokoll, meist über PCIe. M.2 ist ein Bauformat; beide Begriffe beschreiben nicht die Bitzahl einer NAND-Zelle.'],
 ['Logical-to-physical mapping, wear leveling and spare area help manage finite endurance. More capacity alone does not guarantee greater speed or infinite data retention.','Adresszuordnung, Wear Leveling und Reservebereiche helfen bei begrenzter Lebensdauer. Mehr Kapazität garantiert weder mehr Tempo noch unbegrenzten Datenerhalt.']
 ]};
function inside(){
 $('#inside-art').innerHTML=mechanismSVG(kind,step,de?'de':'en');
 $('#inside-copy').textContent=lessons[kind][step][L];$('#inside-progress').textContent=`${step+1} / 3`;
 all('[data-kind]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.kind===kind)));
 $('#lesson-prev').disabled=step===0;$('#lesson-next').disabled=step===2;
 $('#inside-art').classList.toggle('motion',$('#motion').checked);
 $('#inside-source').href=sources[kind==='floppy'?'ibm':kind==='zip'?'zip':kind==='cd'?'cd':'flash'].url;
}
all('[data-kind]').forEach(b=>b.addEventListener('click',()=>{kind=b.dataset.kind;step=0;inside();}));
$('#lesson-prev').addEventListener('click',()=>{step=Math.max(0,step-1);inside();});$('#lesson-next').addEventListener('click',()=>{step=Math.min(2,step+1);inside();});$('#motion').addEventListener('change',inside);inside();
function wall(){
 const c=$('#wall'),ctx=c.getContext?.('2d');if(!ctx)return;
 const count=countMedia(target,1474560n),scale=$('#scale').value==='auto'?BigInt(Math.max(1,Math.ceil(Number(count)/144))):BigInt($('#scale').value);
 const boxes=countMedia(count,scale),visible=Number(boxes>144n?144n:boxes);ctx.clearRect(0,0,960,260);
 for(let i=0;i<visible;i++){const x=12+(i%24)*39,y=12+Math.floor(i/24)*37;ctx.fillStyle=scale===1n?'#426575':'#a1845e';ctx.fillRect(x,y,29,29);ctx.fillStyle='#d4cdb6';ctx.fillRect(x+5,y+13,19,11);ctx.fillStyle='#a2adb0';ctx.fillRect(x+6,y+1,15,8);}
 $('#wall-caption').textContent=t('Each symbol = ','Ein Symbol = ')+fmt(scale)+t(' floppy disks. ',' Disketten. ')+t('Total: ','Gesamt: ')+fmt(count)+(boxes>144n?t(' · showing 144 groups; total includes the remainder.',' · 144 Gruppen dargestellt; die Gesamtzahl enthält den Rest.'):'');
 c.setAttribute('aria-label',$('#wall-caption').textContent);
}
function calculate(){
 $('#results').innerHTML=comparisons.map(m=>`<div class="result"><span>${m.name[L]}</span><strong>${fmt(countMedia(target,m.bytes))}</strong><small>${fmt(m.bytes)} B</small></div>`).join('');
 $('#target-bytes').textContent=fmt(target)+' B';wall();personal();
}
function example(){
 const e=examples[Number($('#example').value)];target=e.bytes;$('#custom').value=String(Number(target)/1e9);$('#unit').value='GB';$('#input-error').textContent='';
 const src=e.source&&sources[e.source];$('#example-source').innerHTML=src?`<a href="${src.url}">${src.name} ↗</a> · ${accessed}`:t('Illustrative file size, not a historical game distribution.','Beispieldatei, keine historische Spieleverteilung.');calculate();
}
$('#example').addEventListener('change',example);
function custom(){const n=parseBytes($('#custom').value,$('#unit').value);if(n===null){$('#input-error').textContent=t('Enter a non-negative number (up to 9 decimal places), maximum 1 EB.','Nichtnegative Zahl eingeben (bis 9 Nachkommastellen), höchstens 1 EB.');return;}target=n;$('#input-error').textContent='';$('#example-source').textContent=t('Custom capacity comparison.','Eigener Kapazitätsvergleich.');calculate();}
$('#custom').addEventListener('input',custom);$('#unit').addEventListener('change',custom);$('#scale').addEventListener('change',wall);
const messages={
 ready:['Insert the first volume.','Lege das erste Volume ein.'],loaded:['Volume inserted. Read to verify it.','Volume eingelegt. Zum Prüfen lesen.'],next:['Verified. Insert the next volume.','Geprüft. Nächstes Volume einlegen.'],
 read:['Simulated physical read error. Retrying the same copy cannot repair it.','Simulierter physischer Lesefehler. Wiederholen repariert diese Kopie nicht.'],checksum:['Simulated checksum mismatch. Bytes arrived, but verification failed.','Simulierter Prüfsummenfehler. Byte angekommen, aber die Prüfung scheitert.'],missing:['Simulated missing volume. A matching replacement is required.','Simuliertes fehlendes Volume. Eine passende Ersatzkopie wird benötigt.'],wrong:['Wrong volume. Match the requested number.','Falsches Volume. Die angeforderte Nummer muss stimmen.'],insert:['No volume inserted.','Kein Volume eingelegt.'],replaced:['Good backup copy inserted. Read it to resume.','Gute Sicherungskopie eingelegt. Zum Fortsetzen lesen.'],done:['It worked! Every volume verified. One small USB stick could carry this demo.','Es hat geklappt! Alle Volumes geprüft. Ein kleiner USB-Stick könnte dieses Demo tragen.'],inspect:['A volume number identifies sequence; a checksum checks data integrity.','Die Volumenummer ordnet die Reihenfolge; eine Prüfsumme prüft die Datenintegrität.']};
function renderArchive(){
 const done=archive.status==='done';
 $('#archive-terminal').textContent=`VOLUME ${done?archive.total:archive.current} / ${archive.total}\n${fmt(archive.verified)} / ${fmt(archive.bytes)} B\n${messages[archive.message][L]}\n${t('Read attempts','Leseversuche')}: ${archive.attempts}`;
 $('#archive-terminal').classList.toggle('error',archive.status==='error');
 $('#archive-progress').max=Number(archive.bytes);$('#archive-progress').value=Number(archive.verified);
 $('#disk-stack').innerHTML=Array.from({length:archive.total},(_,i)=>`<button data-volume="${i+1}" aria-pressed="${archive.loaded===i+1}" ${done?'disabled':''}>${objectSVG('floppy',t('Insert volume ','Volume einlegen ')+(i+1))}${String(i+1).padStart(2,'0')}</button>`).join('');
 for(const id of ['sample','fault','reset','inspect'])$('#'+id).disabled=busy;
 all('[data-volume]').forEach(b=>{b.disabled=busy||done;});
 all('[data-volume]').forEach(b=>b.addEventListener('click',()=>act({type:'insert',volume:Number(b.dataset.volume)})));
 $('#replace').disabled=busy||archive.current!==16||archive.status!=='error';
 for(const id of ['read','retry','fast'])$('#'+id).disabled=busy||done;
 $('#archive-end').hidden=!done;
 $('#loaded').textContent=archive.loaded===null?'A: —':`A: ${String(archive.loaded).padStart(2,'0')}`;
}
function beep(){if(!$('#sound').checked)return;try{const C=window.AudioContext||window.webkitAudioContext;const ctx=new C(),osc=ctx.createOscillator(),gain=ctx.createGain();osc.frequency.value=archive.status==='error'?160:520;gain.gain.value=.035;osc.connect(gain);gain.connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+.065);osc.onended=()=>ctx.close();}catch{}}
function act(action){if(busy)return;archive=archiveAction(archive,action);renderArchive();if(action.type==='read'||action.type==='retry'||action.type==='fast')beep();}
$('#read').addEventListener('click',async()=>{if(busy)return;busy=true;renderArchive();$('#archive-terminal').textContent=t('Reading and checking…','Lesen und prüfen…');await new Promise(r=>setTimeout(r,matchMedia('(prefers-reduced-motion: reduce)').matches?0:350));busy=false;act({type:'read'});});
$('#retry').addEventListener('click',()=>act({type:'retry'}));$('#replace').addEventListener('click',()=>act({type:'replace'}));$('#fast').addEventListener('click',()=>act({type:'fast'}));
$('#inspect').addEventListener('click',()=>{$('#fault-details').open=true;act({type:'inspect'});});
function resetArchive(){if(busy)return;archive=createArchive(BigInt($('#sample').value),$('#fault').value);renderArchive();}
$('#reset').addEventListener('click',resetArchive);$('#sample').addEventListener('change',resetArchive);$('#fault').addEventListener('change',resetArchive);renderArchive();
function personal(){
 const useStick=$('#personal-size').value==='stick',bytes=useStick?128000000000n:target,mode=$('#personal-mode').value;
 $('#personal-target').textContent=fmt(bytes)+' B';
 if(mode==='compact'){
  $('#personal-results').innerHTML=comparisons.filter(m=>['floppy','zip','usb'].includes(m.id)).map(m=>{const count=countMedia(bytes,m.bytes),max=countMedia(bytes,1474560n)||1n;return `<div class="comparison-row"><span>${m.name[L]}<br><strong>${fmt(count)}</strong></span><div class="bar" style="width:${Number(count*10000n/max)/100}%"></div></div>`;}).join('');
 }else $('#personal-results').innerHTML=comparisons.filter(m=>['floppy','zip','usb'].includes(m.id)).map(m=>{const n=mode==='equivalent'?(Number(bytes)/Number(m.bytes)).toLocaleString(de?'de-DE':'en-US',{maximumFractionDigits:2}):fmt(countMedia(bytes,m.bytes));return `<p><strong>${n}</strong> × ${m.name[L]}</p>`;}).join('');
 $('#personal-note').textContent=mode==='equivalent'?t('Fractional capacity equivalents; a physical transfer needs whole media.','Kapazitätsäquivalente mit Nachkommastellen; ein physischer Transfer braucht ganze Medien.'):mode==='compact'?t('Linear bars show whole-media counts relative to the floppy count. Tiny bars have a minimum visible width.','Lineare Balken zeigen ganze Medien relativ zur Diskettenzahl. Winzige Balken haben eine sichtbare Mindestbreite.'):t('Whole media, rounded up, including a partly filled last medium.','Ganze Medien, aufgerundet, einschließlich eines teilweise gefüllten letzten Mediums.');
}
$('#personal-size').addEventListener('change',personal);$('#personal-mode').addEventListener('change',personal);
example();showStation(location.hash.slice(1));$('#interactive-controls').hidden=false;$('#gallery-fallback').hidden=true;
