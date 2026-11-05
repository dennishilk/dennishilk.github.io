// Original editorial schematics. No generated screenshots or third-party assets.
// Authoring-only sharp dependency follows build-linux-news-visuals.mjs.
import {writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
const require=createRequire(import.meta.url);
const sharp=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/sharp':'sharp');
const out=resolve(import.meta.dirname,'../assets/blog/linux-news');
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const text=(x,y,s,size=26,color='#e9eef5')=>`<text x="${x}" y="${y}" font-size="${size}" fill="${color}">${esc(s)}</text>`;
const box=(x,y,w,h,accent='#29394b')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="13" fill="#121b26" stroke="${accent}" stroke-width="2"/>`;
const line=(path,accent)=>`<path d="${path}" fill="none" stroke="${accent}" stroke-width="3" marker-end="url(#arrow)"/>`;
const svg=(w,h,title,desc,body,accent)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="title desc"><title id="title">${esc(title)}</title><desc id="desc">${esc(desc)}</desc><defs><marker id="arrow" markerWidth="9" markerHeight="9" refX="8" refY="4" orient="auto"><path d="M0 0L8 4L0 8" fill="none" stroke="${accent}" stroke-width="1.5"/></marker></defs><rect width="${w}" height="${h}" rx="18" fill="#0b1017"/><g font-family="DejaVu Sans,sans-serif">${body}</g></svg>\n`;
for(const lang of ['en','de']){
 const de=lang==='de',t=(en,ger)=>de?ger:en;
 for(const topic of ['apt-cve-2026-109518','ai-linux-kernel-948','plasma-68-wayland']){
  const apt=topic.startsWith('apt'),kernel=topic.startsWith('ai'),accent=apt?'#8ddbc0':kernel?'#b8adf5':'#8bcdf3';
  const title=apt?t('APT: the trust boundary','APT: die Vertrauensgrenze'):kernel?t('From finding to reviewed fix','Vom Befund zur geprüften Korrektur'):t('Two paths. One Wayland desktop.','Zwei Wege. Ein Wayland-Desktop.');
  const desc=apt?t('Signed repository metadata leads to checked package bytes and root installation. Incorrect shared file handling can break the identity between checked and installed content.','Signierte Metadaten führen zu geprüften Paketbytes und Root-Installation. Fehler bei gemeinsam genutzten Dateien können geprüften und installierten Inhalt auseinanderlaufen lassen.'):kernel?t('Numbered research stages, not proportional flows. Each count has its own unit. Human review and upstream reporting follow candidate patch generation.','Nummerierte Forschungsstufen, keine proportionalen Mengenströme. Jede Zahl hat eine eigene Einheit. Kandidatenpatches benötigen menschliche Prüfung und Upstream-Meldung.'):t('Native Wayland apps connect directly to KWin. X11 apps use the XWayland X server, which connects to KWin as a Wayland client. KWin presents both on the displays.','Native Wayland-Apps verbinden sich direkt mit KWin. X11-Apps nutzen den XWayland-X-Server als Wayland-Client von KWin. KWin stellt beide auf den Bildschirmen dar.');
  let desktop=text(44,54,'DENNIS HILK / LINUX',19,accent)+text(44,119,title,kernel?39:43)+text(44,167,apt?'CVE-2026-109518':kernel?t('Researcher-reported results · 4 November 2026','Berichtete Forschungsergebnisse · 4. November 2026'):'Plasma 6.8 · XWayland',24,'#a9b7c8');
  let mobile=text(28,49,apt?'APT / CVE-2026-109518':kernel?t('LINUX KERNEL / AI','LINUX-KERNEL / KI'):'PLASMA 6.8 / WAYLAND',23,accent);
  const mobileTitle=apt?[t('Where trust','Wo Vertrauen'),t('must hold','halten muss')]:kernel?[t('Count the units.','Die Einheiten zählen.'),t('Review the evidence.','Die Belege prüfen.')]:[t('X11 apps stay.','X11-Apps bleiben.'),t('The session changes.','Die Sitzung ändert sich.')];
  mobile+=text(28,101,mobileTitle[0],33)+text(28,145,mobileTitle[1],33);
  if(apt){
   const heads=[t('Signed metadata','Signierte Metadaten'),t('Verified package','Geprüftes Paket'),t('Root installation','Root-Installation')];
   const subs=[t('Release + index hashes','Release + Index-Hashes'),t('Expected package bytes','Erwartete Paketbytes'),t('dpkg consumes the file','dpkg verwendet die Datei')];
   for(let i=0;i<3;i++){const x=44+i*386;desktop+=box(x,236,340,162,accent)+text(x+22,278,'0'+(i+1),23,accent)+text(x+22,322,heads[i],27)+text(x+22,368,subs[i],21,'#a9b7c8');if(i<2)desktop+=line(`M${x+346} 318h32`,accent);}
   desktop+=box(44,454,1112,164,'#f2b36d')+text(68,498,t('THE FAILURE: CHECKED CONTENT CAN CHANGE','DER FEHLER: GEPRÜFTER INHALT KANN SICH ÄNDERN'),27,'#f2b36d')+text(68,546,t('Redirects + retries + incorrect shared-file handling','Weiterleitungen + Wiederholungen + fehlerhafte Dateibehandlung'),27)+text(68,587,t('The installer must receive the same bytes that were verified.','Der Installer muss dieselben Bytes erhalten, die geprüft wurden.'),24,'#a9b7c8');
   for(let i=0;i<3;i++){const y=200+i*193;mobile+=box(28,y,564,146,accent)+text(50,y+42,'0'+(i+1)+' / '+heads[i],27,accent)+text(50,y+98,subs[i],26);if(i<2)mobile+=line(`M310 ${y+153}v28`,accent);}
   mobile+=box(28,806,564,155,'#f2b36d')+text(50,849,t('Verification → use','Prüfung → Verwendung'),28,'#f2b36d')+text(50,893,t('Shared files can break','Gemeinsame Dateien können'),26)+text(50,932,t('the content identity.','die Inhaltsidentität brechen.'),26);
  }else if(kernel){
   const stages=[['5,034','5.034',t('Audit targets','Prüfziele'),t('Selected code areas','Ausgewählte Codebereiche')],['2,308','2.308',t('Candidate findings','Verdachtsmeldungen'),t('After initial deduplication','Nach erster Bereinigung')],['1,724','1.724',t('Reproduced findings','Reproduzierte Befunde'),t('Isolated dynamic validation','Isolierte dynamische Prüfung')],['1,169','1.169',t('LPE exploit artifacts','LPE-Exploit-Artefakte'),t('Security impact demonstrated','Sicherheitsauswirkung gezeigt')],['948','948',t('Distinct LPE groups','Bereinigte LPE-Gruppen'),t('Variants + distinct patches','Varianten + getrennte Patches')],[t('Review','Prüfung'),t('Review','Prüfung'),t('Human assessment','Menschliche Bewertung'),t('Report → upstream process','Meldung → Upstream-Prozess')]];
   for(let i=0;i<6;i++){
    const x=44+(i%3)*378,y=211+Math.floor(i/3)*198;
    desktop+=box(x,y,356,179,i===4?accent:'#29394b')+text(x+18,y+30,'0'+(i+1),18,accent)+text(x+18,y+79,stages[i][de?1:0],i===5?37:42,accent)+text(x+18,y+121,stages[i][2],22)+text(x+18,y+154,stages[i][3],19,'#a9b7c8');
    const my=191+i*128;mobile+=box(28,my,564,112,i===4?accent:'#29394b')+text(46,my+32,'0'+(i+1)+' / '+stages[i][2],23)+text(46,my+81,stages[i][de?1:0],35,accent)+text(i===5?219:209,my+79,i===5?t('Human review','Menschlich'):stages[i][3],19,'#a9b7c8');
   }
   desktop+=text(44,651,t('291 information-leak PoCs: separate outcome. No additive total.','291 Informationsleck-PoCs: separates Ergebnis. Kein Summenwert.'),23,'#a9b7c8');
   mobile+=text(28,992,t('Different units · not a flow chart','Verschiedene Einheiten · kein Mengenfluss'),23,'#a9b7c8');
  }else{
   desktop+=box(44,235,360,125,accent)+text(68,284,t('Native Wayland app','Native Wayland-App'),29)+text(68,327,'Wayland',23,accent);
   desktop+=box(44,443,308,125)+text(68,494,t('X11 application','X11-Anwendung'),29)+text(68,535,'X11',23,accent);
   desktop+=box(412,443,290,125,accent)+text(438,494,'XWayland',32)+text(438,535,t('X server / Wayland client','X-Server / Wayland-Client'),19,'#a9b7c8');
   desktop+=box(794,285,362,187,accent)+text(820,339,'KWin',42,accent)+text(820,383,t('Wayland compositor','Wayland-Compositor'),27)+text(820,431,t('Input + window management','Eingabe + Fensterverwaltung'),21,'#a9b7c8');
   desktop+=line('M414 296H758V331H782',accent)+line('M362 505h38',accent)+line('M712 505h42V421h28',accent);
   desktop+=line('M975 482v44',accent)+box(794,540,362,83)+text(820,591,t('Graphics stack → displays','Grafikstack → Bildschirme'),24);
   desktop+=text(44,658,t('XWayland support continues. The Plasma X11 login session retires.','XWayland bleibt. Die Plasma-X11-Anmeldesitzung entfällt.'),25,'#a9b7c8');
   mobile+=box(28,204,266,164,accent)+text(46,251,t('Native app','Native App'),28)+text(46,301,'Wayland',27,accent)+text(46,344,t('Direct path','Direkter Weg'),20,'#a9b7c8');
   mobile+=box(326,204,266,164)+text(345,251,t('Legacy app','Ältere App'),28)+text(345,301,'X11',27,accent);
   mobile+=line('M459 379v48',accent)+box(326,442,266,140,accent)+text(345,488,'XWayland',28)+text(345,530,t('X server','X-Server'),24)+text(345,563,t('Wayland client','Wayland-Client'),22,'#a9b7c8');
   mobile+=line('M160 380v253',accent)+line('M459 594v39',accent)+box(28,650,564,142,accent)+text(50,699,'KWin',37,accent)+text(50,750,t('Wayland compositor + window manager','Wayland-Compositor + Fensterverwaltung'),24);
   mobile+=line('M310 804v36',accent)+box(28,858,564,94)+text(50,915,t('Graphics stack → displays','Grafikstack → Bildschirme'),27);
  }
  desktop+=text(44,687,t('ORIGINAL SCHEMATIC / DENNISHILK.COM','EIGENES SCHEMA / DENNISHILK.COM'),16,'#a9b7c8');
  if(!kernel)mobile+=text(28,1006,'DENNISHILK.COM / '+t('SCHEMATIC','SCHEMA'),20,'#a9b7c8');
  writeFileSync(`${out}/${topic}-${lang}.svg`,svg(1200,700,title,desc,desktop,accent));
  writeFileSync(`${out}/${topic}-${lang}-mobile.svg`,svg(620,1030,title,desc,mobile,accent));
  const socialTitle=apt?['CVE-2026-109518',t('Check APT. Update safely.','APT prüfen. Sicher aktualisieren.')]:kernel?[t('948 Linux kernel LPEs','948 Linux-Kernel-LPEs'),t('What the research actually shows','Was die Untersuchung wirklich zeigt')]:['KDE Plasma 6.8',t('X11 session out. XWayland stays.','X11-Sitzung weg. XWayland bleibt.')];
  let social=text(55,65,'LINUX / '+t('NEWS & SECURITY','NEWS & SICHERHEIT'),22,accent)+text(55,158,socialTitle[0],62)+text(55,224,socialTitle[1],38);
  const main=apt?['Debian 13 / 12','Ubuntu',t('Verify the installed package','Installiertes Paket prüfen')]:kernel?['1,169 → 948',t('Artifacts → distinct LPEs','Artefakte → unterschiedliche LPEs'),t('Evidence. Cost. Patch status.','Belege. Kosten. Patchstatus.')]:[t('Native Wayland + X11 apps','Native Wayland- + X11-Apps'),'KWin / XWayland',t('Test your actual workflow','Deinen echten Arbeitsablauf prüfen')];
  social+=box(55,285,1090,215,accent)+text(85,355,main[0],45,accent)+text(85,412,main[1],34)+text(85,467,main[2],29,'#a9b7c8')+text(55,576,'dennishilk.com / Dennis Hilk / 5 Nov 2026',23,'#a9b7c8');
  await sharp(Buffer.from(svg(1200,630,socialTitle.join(' · '),desc,social,accent))).png({compressionLevel:9}).toFile(`${out}/${topic}-social-${lang}.png`);
 }
}
console.log('Built 12 original localized responsive SVGs and six 1200×630 social PNGs.');
