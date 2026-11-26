// Deterministic allocation preview from our own data and existing fan-tool icons.
import {readFileSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const sharp=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/sharp`:'sharp');
const base=new URL('../assets/wow-forever-paladin/',import.meta.url),data=JSON.parse(readFileSync(new URL('data.json',base))),build=data.presets.holy;
const colors=['#e8c376','#a5d9f4','#f0a693'];
let svg='<svg xmlns="http://www.w3.org/2000/svg" width="1192" height="760" viewBox="0 0 1192 760"><rect width="1192" height="760" fill="#101722"/><text x="32" y="40" fill="#c1d0df" font-size="17" font-family="DejaVu Sans,sans-serif">DENNIS HILK · WOW FOREVER · SECONDARY SPEC</text><text x="32" y="83" fill="#f1d494" font-size="32" font-family="DejaVu Serif,serif">Holy 31 / 5 / 15</text><text x="1160" y="80" text-anchor="end" fill="#d3dce7" font-size="18" font-family="DejaVu Sans,sans-serif">Level 60 · 51 points · 26 Nov 2026</text>';
for(const [ti,tree] of data.trees.entries()){
 const x=24+ti*389,y=110,color=colors[ti];
 svg+=`<rect x="${x}" y="${y}" width="366" height="570" rx="10" fill="#182231" stroke="${color}"/><text x="${x+18}" y="${y+37}" fill="${color}" font-size="25" font-family="DejaVu Serif,serif">${tree.name.en}</text><text x="${x+345}" y="${y+37}" fill="${color}" font-size="25" text-anchor="end" font-family="DejaVu Sans,sans-serif">${build[ti].reduce((a,b)=>a+b,0)}</text>`;
 const center=t=>({x:x+10+(t.col-.5)*86,y:y+55+(t.row-.5)*70});
 for(const t of tree.talents.filter(t=>t.req)){
  const parent=tree.talents.find(p=>p.id===t.req.id),a=center(parent),b=center(t);
  const active=build[ti][tree.talents.indexOf(parent)]>=t.req.rank;
  svg+=`<path d="M${a.x},${a.y+23} L${b.x},${b.y-24}" fill="none" stroke="${active?'#d1be7a':'#586678'}" stroke-width="3"/>`;
 }
 for(const [i,t]of tree.talents.entries()){
  const c=center(t),rank=build[ti][i],icon=readFileSync(new URL(`icons/${t.icon}.jpg`,base)).toString('base64');
  svg+=`<rect x="${c.x-25}" y="${c.y-25}" width="50" height="50" rx="4" fill="#0b121e" stroke="${rank?color:'#526174'}" stroke-width="2"/><image x="${c.x-23}" y="${c.y-23}" width="46" height="46" href="data:image/jpeg;base64,${icon}" opacity="${rank?1:.22}"/><rect x="${c.x-8}" y="${c.y+16}" width="43" height="23" rx="6" fill="#101a29" stroke="${rank?color:'#526174'}"/><text x="${c.x+13}" y="${c.y+33}" text-anchor="middle" fill="${rank?color:'#9cabbc'}" font-size="16" font-family="DejaVu Sans Mono,monospace">${rank}/${t.max}</text>`;
 }
}
svg+='<text x="32" y="718" fill="#c1d0df" font-size="17" font-family="DejaVu Sans,sans-serif">Personal level-60 goal · Protection remains the main spec</text><text x="32" y="745" fill="#94a7bb" font-size="14" font-family="DejaVu Sans,sans-serif">Our fan-tool preview · Talent data: Talents Forever (CC BY 4.0) · Game icons: Blizzard Entertainment</text></svg>';
const target=new URL('../assets/blog/wow-forever/wow-forever-dennis-hilk-holy-build.webp',import.meta.url);
await sharp(Buffer.from(svg)).webp({quality:90}).toFile(target.pathname);
console.log('Built Holy 31/5/15 preview, 1192 × 760.');
