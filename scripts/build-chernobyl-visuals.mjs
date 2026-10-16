import {mkdirSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {reactorDiagram} from '../assets/chernobyl-control-room/diagrams.mjs';
const require=createRequire(import.meta.url);let sharp;try{sharp=require('sharp');}catch{sharp=require(resolve(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'sharp'));}
const out='assets/blog/computer-museum';mkdirSync(out,{recursive:true});const figures={};
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;');
const text=(x,y,s,size=22,c='#e4e5d7')=>`<text x="${x}" y="${y}" font-size="${size}" fill="${c}" font-family="Arial, sans-serif">${esc(s)}</text>`;
const box=(x,y,w,h,c='#798b70')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="#26352a" stroke="${c}"/>`;
const svg=(w,h,body)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="#111b14"/>${body}</svg>`;
for(const lang of ['en','de']){
 const t=(en,de)=>lang==='de'?de:en;
 const section=reactorDiagram(lang,'article').replace('<svg class="reactor-diagram"','<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="774"').replace('<g class="system-overlay"','<g display="none" class="system-overlay"');
 // Explicit background ensures text remains readable when the SVG is opened on its own.
 const sectionSVG=section.replace(/(<desc[^>]*>[\s\S]*?<\/desc>)/,'$1<rect width="760" height="490" fill="#17231b"/>');
 writeFileSync(`${out}/chernobyl-section-${lang}.svg`,sectionSVG);
 await sharp(Buffer.from(sectionSVG)).webp({quality:88}).toFile(`${out}/chernobyl-section-${lang}.webp`);
 let body=text(45,55,t('SKALA / INFORMATION IS NOT ONE SINGLE SAFETY FUNCTION','SKALA / INFORMATION IST NICHT EINE EINZIGE SCHUTZFUNKTION'),25);
 body+=box(325,95,550,75)+text(353,143,t('Plant observations / sensor signals','Anlagenbeobachtungen / Sensorsignale'),26);
 body+='<g fill="none" stroke="#97bca3" stroke-width="3"><path d="M600 170V205H215V244M600 205V244M600 205H985V244"/></g>';
 const cards=[
 [45,'DREG',t('Record selected signals','Ausgewählte Signale aufzeichnen'),t('Coverage + priority + gaps','Abdeckung + Priorität + Lücken')],
 [430,'PRIZMA',t('Calculate reactor quantities','Reaktorgrößen berechnen'),t('Inputs + cycle + availability','Eingaben + Zyklus + Verfügbarkeit')],
 [815,t('PROTECTION','SCHUTZ'),t('Distinct protection functions','Eigenständige Schutzfunktionen'),t('Not identical to SKALA','Nicht mit SKALA gleichzusetzen')]];
 for(const [x,h,p,q]of cards){body+=box(x,245,340,190)+text(x+20,287,h,27,'#dfbe7b')+text(x+20,343,p,20)+text(x+20,391,q,18,'#b8c7ad');}
 body+=text(45,488,t('01:22:30 snapshot ≠ a calculation available to the crew at that moment','Zustandsaufnahme 01:22:30 ≠ damals verfügbares Rechenergebnis'),24,'#dfbe7b');
 body+=text(45,535,t('S · Logical roles, not a wiring diagram or historical computer interface.','S · Funktionsübersicht, kein Schaltplan und keine historische Rechneroberfläche.'),18,'#a8b6a7');
 const monitoring=svg(1200,570,body);writeFileSync(`${out}/chernobyl-monitoring-${lang}.svg`,monitoring);await sharp(Buffer.from(monitoring)).webp({quality:88}).toFile(`${out}/chernobyl-monitoring-${lang}.webp`);
 body=text(45,55,t('HOW TO READ THE RECONSTRUCTION','DIE REKONSTRUKTION RICHTIG LESEN'),30);
 const rows=[['D',t('Documented','Belegt'),t('A source supports an event or statement.','Eine Quelle trägt Ereignis oder Aussage.'),'#bdd3b0'],['R',t('Reconstructed','Rekonstruiert'),t('An inferred state or interpreted arrangement.','Ein abgeleiteter Zustand oder interpretierter Aufbau.'),'#e5c68d'],['S',t('Schematic','Schematisch'),t('An explanation, not recovered telemetry.','Eine Erklärung, keine überlieferte Telemetrie.'),'#abd1cf']];
 for(let i=0;i<rows.length;i++){const [mark,h,p,c]=rows[i],y=95+i*120;body+=box(45,y,1110,98,c)+text(70,y+65,mark,45,c)+text(160,y+40,h,28,c)+text(160,y+76,p,22);}
 body+=text(45,500,t('A documented time does not turn its accompanying drawing into a measurement.','Eine belegte Zeit macht das danebenstehende Bild noch nicht zum Messwert.'),22,'#c6d0ba');
 const legend=svg(1200,540,body);writeFileSync(`${out}/chernobyl-legend-${lang}.svg`,legend);await sharp(Buffer.from(legend)).webp({quality:88}).toFile(`${out}/chernobyl-legend-${lang}.webp`);
 const shot=await sharp(`${out}/chernobyl-hero-${lang}.webp`).resize(1110,365,{fit:'cover',position:'top'}).png().toBuffer();
 const overlay=svg(1200,630,text(45,42,'DENNIS HILK / COMPUTER MUSEUM',17,'#a8b6a7')+text(45,102,t('Chernobyl Unit 4','Tschernobyl Block 4'),44)+text(45,146,t('RBMK control room & SKALA','RBMK-Kontrollraum & SKALA'),27,'#dfbe7b')+text(45,603,t('Original museum reconstruction · documented / reconstructed / schematic','Eigene Museumsrekonstruktion · belegt / rekonstruiert / schematisch'),19,'#b9c6af')).replace('<rect width="1200" height="630" fill="#111b14"/>','');
 await sharp({create:{width:1200,height:630,channels:3,background:'#111b14'}}).composite([{input:shot,left:45,top:187},{input:Buffer.from(overlay)}]).png({compressionLevel:9}).toFile(`${out}/chernobyl-social-${lang}.png`);
}
const specs=[
 ['hero','hero',['Actual English museum control-room interface with analogue gauges, symbolic channels, annunciators and the SKALA inspector.','Actual capture of this exhibit. Panel arrangement is reconstructed; pointers, lamps and channel colours are schematic.'],['Tatsächliche deutsche Museumsoberfläche mit Analoginstrumenten, symbolischen Kanälen, Meldefeldern und SKALA-Inspektor.','Echte Aufnahme dieser Ausstellung. Panelanordnung rekonstruiert; Zeiger, Leuchten und Kanalfarben schematisch.']],
 ['section','section',['Original simplified RBMK section separating graphite, fuel channels, cooling water, steam and rod assemblies.','Original schematic; representative channels, no scale or historical rod-position trace.'],['Eigener vereinfachter RBMK-Schnitt mit Graphit, Brennstoffkanälen, Kühlwasser, Dampf und Stabbaugruppen.','Eigene schematische Grafik; repräsentative Kanäle, kein Maßstab und keine historische Stabpositionskurve.']],
 ['monitoring','monitoring',['Plant observations connect to DREG recording, PRIZMA calculation and distinct protection functions.','Original functional diagram, not a historical wiring plan. Based on the distinctions in INSAG-7.'],['Anlagenbeobachtungen, DREG-Aufzeichnung, PRIZMA-Berechnung und eigenständige Schutzfunktionen.','Eigene Funktionsgrafik, kein historischer Schaltplan. Grundlage sind die Unterscheidungen in INSAG-7.']],
 ['sequence','sequence',['Actual exhibit chapter showing the recorded AZ-5 signal time alongside a schematic rod diagram.','Actual interface capture. The event time is report-supported; the rod positions are schematic, not recorded telemetry.'],['Echtes Ausstellungskapitel mit belegter AZ-5-Signalzeit neben einer schematischen Stabdarstellung.','Tatsächliche Oberflächenaufnahme. Die Ereigniszeit ist berichtsgestützt; die Stabpositionen sind schematisch, keine aufgezeichnete Telemetrie.']],
 ['detail','detail',['Actual detail of the museum control panel with inspection-only AZ-5 and process instruments.','Actual capture of an original reconstructed interface, not a photograph from the historical control room.'],['Echtes Detail des Museumspanels mit AZ-5 zur Inspektion und Prozessinstrumenten.','Tatsächliche Aufnahme einer eigenen rekonstruierten Oberfläche, kein Foto der historischen Leitwarte.']],
 ['legend','legend',['Three evidence categories: documented facts, reconstructed states and schematic explanation.','Original reading guide. An event timestamp and its accompanying visualization can have different evidence status.'],['Drei Belegkategorien: belegte Tatsachen, rekonstruierte Zustände und schematische Erklärung.','Eigene Lesehilfe. Ereigniszeit und zugehörige Visualisierung können einen unterschiedlichen Belegstatus haben.']]
];
for(const [key,file,en,de]of specs){const dimensions={};for(const lang of ['en','de']){const m=await sharp(`${out}/chernobyl-${file}-${lang}.webp`).metadata();dimensions[lang]=[m.width,m.height];}
 figures['chernobyl-'+key]={file:`chernobyl-${file}-LANG.webp`,width:dimensions.en[0],height:dimensions.en[1],dimensions,en,de,hero:key==='hero'};
 if(['hero','sequence','detail'].includes(key))figures['chernobyl-'+key].srcset=`/assets/blog/computer-museum/chernobyl-${file}-LANG-800.webp 800w, /assets/blog/computer-museum/chernobyl-${file}-LANG.webp ${dimensions.en[0]}w`;
}
writeFileSync('content/museum-blog/chernobyl-figures.json',JSON.stringify(figures,null,2)+'\n');console.log('Built original localized diagrams, optimized WebP figures and 1200×630 social images.');
