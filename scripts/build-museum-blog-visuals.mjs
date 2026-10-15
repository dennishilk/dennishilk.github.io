// Original educational SVGs and social cards made from existing real screenshots.
import {writeFileSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createRequire} from 'node:module';
const root=resolve(import.meta.dirname,'..'),out=resolve(root,'assets/blog/computer-museum');
const require=createRequire(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/package.json':import.meta.url),sharp=require('sharp');
const txt=(x,y,s,size=24,color='#d3dde9')=>`<text x="${x}" y="${y}" font-size="${size}" fill="${color}">${s}</text>`;
const box=(x,y,w,h,stroke='#38526d')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="#162334" stroke="${stroke}" stroke-width="2"/>`;
const svg=(height,body)=>`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="${height}" viewBox="0 0 1200 ${height}"><rect width="1200" height="${height}" rx="14" fill="#0e1826"/><g font-family="DejaVu Sans,sans-serif">${body}</g></svg>`;
for(const lang of ['en','de']){
 const de=lang==='de';
 let binary=txt(40,57,de?'ACHT BITS · EIN BYTE':'EIGHT BITS · ONE BYTE',28,'#eef4fc');
 binary+=txt(40,98,de?'Nur die gesetzten Stellen werden addiert.':'Add only the positions whose bit is one.',21,'#9eb4cc');
 for(let i=0;i<8;i++){const x=40+i*140,on=i>=2&&i<=5;binary+=box(x,132,128,180,on?'#70c89b':'#38526d')+txt(x+20,169,String(128>>i),23,'#9eb4cc')+`<rect x="${x+46}" y="195" width="36" height="68" rx="8" fill="${on?'#70c89b':'#31455d'}"/>`+txt(x+53,295,on?'1':'0',28,on?'#70c89b':'#9eb4cc');}
 binary+=txt(40,370,'32 + 16 + 8 + 4 = 60',34,'#eef4fc')+txt(40,422,'00111100₂ = 3C₁₆ = 60₁₀',28,'#70c89b');
 writeFileSync(out+'/binary-switches-'+lang+'.svg',svg(460,binary));
 let arch=txt(40,55,de?'ZWEI GETRENNTE ERLEBNISSE':'TWO SEPARATE EXPERIENCES',29,'#eef4fc');
 arch+=box(40,90,710,420)+box(790,90,370,420,'#a68acd');
 arch+=txt(65,130,'1975 / INTEL 8080',24,'#70c89b')+txt(815,130,'1983 / WarGames',24,'#c5a9e6');
 arch+=box(70,165,200,95)+txt(94,205,'CPU',27)+txt(94,237,de?'Befehle':'Instructions',18);
 arch+=box(305,165,180,95)+txt(330,205,'RAM',27)+txt(330,237,'64 KiB',18);
 arch+=box(520,165,200,95)+txt(545,205,'I/O',27)+txt(545,237,de?'Museumsports':'Museum ports',18);
 arch+=`<path d="M270 213H305M485 213H520M620 260V315" stroke="#70c89b" stroke-width="3"/>`;
 arch+=box(305,315,415,100)+txt(330,355,'OUT 01 → ASCII',24)+txt(330,391,'OUT 02 → '+(de?'Ausgaberegister':'output latch'),20);
 arch+=txt(65,464,de?'Eigene Emulation auf Befehlsebene':'Original instruction-level emulation',22,'#9eb4cc');
 arch+=txt(815,198,de?'Eigene Zustandsmaschine':'Authored state machine',20)+txt(815,244,'Joshua / Tic-Tac-Toe',20)+txt(815,290,de?'Fiktive lokale Szenarien':'Fictional local scenarios',19)+txt(815,393,de?'Keine 8080-Ausführung':'No 8080 execution',20,'#c5a9e6')+txt(815,431,de?'Keine echte Einwahl':'No real telephone call',20,'#c5a9e6');
 writeFileSync(out+'/imsai-architecture-'+lang+'.svg',svg(560,arch));
 let alarms=txt(40,56,de?'ÜBERLAST UND GESCHÜTZTER WIEDERANLAUF':'OVERLOAD AND PROTECTED RECOVERY',28,'#eef4fc');
 const titles=de?['Arbeitsbereiche belegt','Restart auslösen','Wichtige Arbeit fortsetzen']:['Work areas exhausted','Trigger protected restart','Resume essential work'];
 const lines=de?[['1202: keine Core-Sets','1201: keine VAC-Bereiche'],['Geschützte Wiederanlaufpunkte','Zustand gezielt rekonstruieren'],['Flugführung wiederhergestellt','Andere Arbeit kann entfallen']]:[['1202: no core sets','1201: no VAC areas'],['Use protected restart points','Reconstruct required state'],['Guidance restored','Some other work discarded']];
 for(let i=0;i<3;i++){const x=40+i*390;alarms+=box(x,115,340,310,i===0?'#db9d6a':'#70c89b')+txt(x+22,162,String(i+1).padStart(2,'0'),30,i===0?'#db9d6a':'#70c89b')+txt(x+22,217,titles[i],19)+txt(x+22,281,lines[i][0],17)+txt(x+22,323,lines[i][1],17);if(i<2)alarms+=`<path d="M${x+348} 270h30l-9-8m9 8-9 8" fill="none" stroke="#9eb4cc" stroke-width="3"/>`;}
 alarms+=txt(40,476,de?'Vereinfachtes Erklärungsschema · keine AGC-Ausführungsspur':'Simplified explanatory schematic · not an AGC execution trace',21,'#9eb4cc')+txt(40,513,de?'Prioritäten schaffen keine zusätzlichen Arbeitsbereiche.':'Priorities do not create additional work areas.',20,'#9eb4cc');
 writeFileSync(out+'/agc-recovery-'+lang+'.svg',svg(540,alarms));
 for(const topic of ['imsai','apollo']){
  const screenshot=await sharp(out+'/'+(topic==='imsai'?'imsai-panel':'apollo-cockpit')+'.webp').resize(1120,380,{fit:'contain',background:'#0e1826'}).png().toBuffer();
  const title=topic==='imsai'?'IMSAI 8080 / WarGames':'APOLLO 11 / Guidance Computer';
  const subtitle=topic==='imsai'?(de?'Der echte Computer hinter dem Film':'The real computer behind the film'):(de?'Der Computer, der bei der Mondlandung half':'The computer that helped land on the Moon');
  const overlay=Buffer.from(svg(630,txt(40,44,'DENNIS HILK · COMPUTER MUSEUM · '+lang.toUpperCase(),17,'#9eb4cc')+txt(40,103,title,40,'#eef4fc')+txt(40,148,subtitle,24)+txt(40,605,de?'Museumsrekonstruktion · Geschichte verstehen und selbst ausprobieren':'Museum reconstruction · understand the history and try it yourself',17,'#9eb4cc')).replace('<rect width="1200" height="630" rx="14" fill="#0e1826"/>',''));
  await sharp({create:{width:1200,height:630,channels:3,background:'#0e1826'}}).composite([{input:screenshot,left:40,top:181},{input:overlay}]).png({compressionLevel:9}).toFile(out+'/'+topic+'-social-'+lang+'.png');
 }
}
console.log('Built six localized SVG diagrams and four 1200×630 social images.');
