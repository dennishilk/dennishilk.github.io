// Original SVG schematics; no terminal screenshots or live-status graphics.
// PNG previews use the already available sharp runtime (or a local installation).
import {writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
const require=createRequire(import.meta.url);
const sharp=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/sharp':'sharp');
const out=resolve(import.meta.dirname,'../assets/blog/linux-news');
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const text=(x,y,s,size=30,color='#e9eef5',mono=false)=>`<text x="${x}" y="${y}" font-size="${size}" fill="${color}"${mono?' font-family="DejaVu Sans Mono,monospace"':''}>${esc(s)}</text>`;
const rect=(x,y,w,h,color='#121b26',stroke='#29394b')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="16" fill="${color}" stroke="${stroke}" stroke-width="2"/>`;
const pill=(x,y,label,color)=>rect(x,y-34,62,47,'#101823',color)+text(x+12,y,label,30,color,true);
const svg=(w,h,label,content)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="title desc"><title id="title">${esc(label)}</title><desc id="desc">${esc(label)}</desc><rect width="${w}" height="${h}" rx="18" fill="#0b1017"/><g font-family="DejaVu Sans,sans-serif">${content}</g></svg>\n`;
for(const lang of ['en','de']){
  const de=lang==='de',t=(en,ger)=>de?ger:en;
  const title=t('OpenSSH package handover','OpenSSH: Paketübergabe');
  const label=t('Schematic: regular server replaced by GSSAPI; unguarded purge risks shared configuration.','Schema: GSSAPI ersetzt den regulären Server; Purgen ohne Korrektur gefährdet gemeinsame Konfiguration.');
  let desktop=text(44,54,'DENNIS HILK / LINUX NEWS',19,'#a9b7c8',true)+text(44,118,title,43)+text(44,165,'Ubuntu 26.10 · '+t('Example: regular → GSSAPI','Beispiel: regulär → GSSAPI'),25,'#a9b7c8');
  desktop+=rect(44,211,495,223)+rect(661,211,495,223);
  desktop+=text(70,258,'01 / '+t('BEFORE','VORHER'),23,'#76d2fa',true)+pill(72,326,'ii','#93dfc1')+text(153,326,'openssh-server',27,'#e9eef5',true)+text(72,392,t('Regular variant installed','Reguläre Variante installiert'),23,'#a9b7c8');
  desktop+='<path d="M558 324h80m-15-12 15 12-15 12" stroke="#76d2fa" stroke-width="3" fill="none"/>';
  desktop+=text(685,258,'02 / '+t('AFTER SWITCH','NACH WECHSEL'),23,'#76d2fa',true)+pill(686,319,'rc','#f2b36d')+text(766,319,'openssh-server',25,'#e9eef5',true)+pill(686,386,'ii','#93dfc1')+text(766,386,'openssh-server-gssapi',25,'#e9eef5',true);
  desktop+=text(44,484,t('Switching removes the old package; rc is expected.','Der Wechsel entfernt das alte Paket; rc ist erwartet.'),27,'#a9b7c8');
  desktop+=rect(44,522,1112,136,'#211c18','#73543c')+text(70,570,'03 / '+t('UNSAFE PURGE OF OLD PACKAGE','UNSICHERES PURGEN DES ALTEN PAKETS'),26,'#f2b36d',true)+text(70,618,t('Without the guard: configuration + host keys can be deleted.','Ohne Schutz: Konfiguration + Hostschlüssel können verschwinden.'),28);
  desktop+=text(44,699,t('ORIGINAL SCHEMATIC · NOT A LIVE STATUS DISPLAY','EIGENE ERKLÄRGRAFIK · KEINE LIVE-STATUSANZEIGE'),19,'#a9b7c8',true);
  writeFileSync(out+'/ubuntu-openssh-'+lang+'.svg',svg(1200,720,title,desktop));

  let mobile=text(30,43,'UBUNTU 26.10 / OPENSSH',23,'#76d2fa',true)+text(30,91,t('The package transition','Der Paketwechsel'),34)+text(30,131,t('Example: regular → GSSAPI','Beispiel: regulär → GSSAPI'),25,'#a9b7c8');
  mobile+=rect(26,165,568,170)+text(48,207,'01 / '+t('BEFORE','VORHER'),24,'#76d2fa',true)+pill(50,271,'ii','#93dfc1')+text(132,271,'openssh-server',30,'#e9eef5',true);
  mobile+='<path d="M310 352v44m-12-14 12 14 12-14" stroke="#76d2fa" stroke-width="3" fill="none"/>';
  mobile+=rect(26,418,568,240)+text(48,461,'02 / '+t('AFTER SWITCH','NACH WECHSEL'),24,'#76d2fa',true)+pill(50,525,'rc','#f2b36d')+text(132,525,'openssh-server',29,'#e9eef5',true)+pill(50,592,'ii','#93dfc1')+text(132,592,'openssh-server-gssapi',28,'#e9eef5',true);
  mobile+=text(30,706,t('rc is expected.','rc ist erwartet.'),33,'#a9b7c8');
  mobile+=rect(26,739,568,163,'#211c18','#73543c')+text(48,782,'03 / '+t('UNSAFE PURGE','UNSICHERES PURGEN'),24,'#f2b36d',true)+text(48,828,t('Without the guard:','Ohne Schutz:'),30)+text(48,871,t('config + host keys at risk','Konfiguration + Keys in Gefahr'),28);
  mobile+=text(30,942,t('SCHEMATIC · NOT LIVE STATUS','SCHEMA · KEIN LIVE-STATUS'),22,'#a9b7c8',true);
  writeFileSync(out+'/ubuntu-openssh-'+lang+'-mobile.svg',svg(620,960,label,mobile));

  let social=text(55,55,t('LINUX NEWS & SECURITY','LINUX-NEWS & SICHERHEIT'),22,'#76d2fa',true)+text(55,132,'Ubuntu 26.10',58)+text(55,196,t('OpenSSH: when cleanup breaks access','OpenSSH: Wenn Aufräumen den Zugang kostet'),37);
  social+=rect(55,247,1090,186)+pill(88,307,'rc','#f2b36d')+text(172,307,'openssh-server',33,'#e9eef5',true)+pill(88,385,'ii','#93dfc1')+text(172,385,'openssh-server-gssapi',33,'#e9eef5',true);
  social+=text(55,496,t('The risk: purging the old package without the fix.','Das Risiko: altes Paket ohne Korrektur purgen.'),30,'#f2b36d')+text(55,551,t('Cause · safe checks · prevention · recovery','Ursache · sicher prüfen · vorbeugen · wiederherstellen'),26,'#a9b7c8')+text(55,604,t('dennishilk.com  /  Original schematic','dennishilk.com  /  Eigene Erklärgrafik'),20,'#a9b7c8',true);
  await sharp(Buffer.from(svg(1200,630,title,social))).png({compressionLevel:9}).toFile(out+'/ubuntu-openssh-social-'+lang+'.png');
}
console.log('Built 4 localized responsive SVGs and 2 original 1200×630 social PNGs.');
