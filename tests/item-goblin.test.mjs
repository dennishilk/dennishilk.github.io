import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {blankItem,validateItem,parseItemJSON,generateItem,applyLocks,History,encodeShare,decodeShare,CATEGORIES,ICONS,QUALITIES,dps} from '../assets/item-goblin/core.mjs';
import {itemLines,itemText,layoutItem,renderItem} from '../assets/item-goblin/render.mjs';
const catalog=JSON.parse(readFileSync(new URL('../assets/item-goblin/data/items.json',import.meta.url))),db=JSON.parse(readFileSync(new URL('../assets/item-goblin/data/generator.json',import.meta.url)));
function random(seed=20261126){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
function fakeCanvas(){const ctx={font:'',measureText(text){return {width:[...text].length*parseInt(this.font.match(/(\d+)px/)[1],10)*.58}},beginPath(){},roundRect(){},fill(){},stroke(){},fillRect(){},scale(){},moveTo(){},lineTo(){},drawImage(){},fillText(){},createLinearGradient(){return{addColorStop(){}}}};return{width:0,height:0,getContext(){return ctx}};}
test('125 unique authored bilingual examples validate and round-trip, icons exist',()=>{
 assert.ok(catalog.items.length>=100);const ids=new Set();const names={de:new Set(),en:new Set()};
 for(const row of catalog.items){assert.match(row.id,/^[a-z0-9-]+$/);assert.ok(!ids.has(row.id));ids.add(row.id);assert.ok(CATEGORIES.includes(row.category));for(const lang of ['de','en']){const item=validateItem(row[lang]);assert.ok(item.name);assert.ok(item.flavor);assert.ok(item.stats.length+item.equip.length+item.use.length+item.hit.length>0);assert.ok(!names[lang].has(item.name));names[lang].add(item.name);assert.deepEqual(decodeShare(encodeShare(item)),item);assert.ok(existsSync(new URL(`../assets/item-goblin/icons/${item.icon}.svg`,import.meta.url)));}}
 assert.equal(catalog.items[0].de.name,'Alte Latschen');const dad=catalog.items.find(x=>x.de.name==='Stein sein DAD auf Weltenbaum').de;assert.equal(dad.damageMax,1337);assert.equal(dad.speed,6.9);
});
test('generator content counts, bilingual rows and thematic coverage at every level',()=>{
 assert.ok(db.adjectives.length+db.suffixes.length>=150);for(const key of ['stats','effects','flavors'])assert.ok(db[key].length>=100);
 for(const key of ['adjectives','suffixes','stats','effects','flavors','requirements'])for(const row of db[key]){assert.ok(row.de&&row.en);assert.ok(row.themes.every(c=>CATEGORIES.includes(c)));assert.ok(Number.isInteger(row.minAbsurdity)&&row.minAbsurdity>=0&&row.minAbsurdity<=3);if(key==='effects')assert.ok(['equip','use','hit'].includes(row.kind));}
 for(const c of CATEGORIES.slice(1))for(const key of ['suffixes','stats','effects','flavors','requirements'])assert.ok(db[key].some(x=>x.minAbsurdity===0&&(x.themes.includes(c)||x.themes.includes('all'))),`${key}: ${c}`);
});
test('5,760 seeded generated items are valid, varied, and structurally appropriate',()=>{
 const rng=random(),names=new Set(),shapes=new Set();let count=0;
 for(const lang of ['de','en'])for(const cat of CATEGORIES)for(let level=0;level<4;level++)for(let n=0;n<40;n++){
  const i=generateItem(db,lang,cat,level,rng);assert.deepEqual(validateItem(i),i);names.add(i.name);shapes.add(JSON.stringify(i));count++;
  if(cat==='weapon'||cat==='legendary'){assert.ok(i.damageMin!==null&&i.damageMax>i.damageMin&&i.speed>0);assert.ok(dps(i)>0);}
  if(['consumable','mount','quest'].includes(cat)){assert.equal(i.damageMin,null);assert.equal(i.armor,null);assert.ok(i.use.length);}
  if(cat==='armor')assert.ok(i.armor>0);if(cat==='junk')assert.equal(i.quality,'poor');if(cat==='legendary')assert.equal(i.quality,'legendary');
 }
 assert.equal(count,5760);assert.ok(names.size>500);assert.equal(shapes.size,count);
});
test('strict import rejects hostile structures, remote icons, invalid numbers and oversized data',()=>{
 const b=blankItem();for(const patch of [{version:2},{quality:'__proto__'},{icon:'../evil'},{customIcon:'https://evil.test/x.svg'},{customIcon:'data:image/svg+xml;base64,PHN2Zz4='},{customIcon:0},{damageMin:100,damageMax:2},{speed:0},{gold:-1},{armor:Infinity},{name:'a'.repeat(201)},{stats:['x'.repeat(1001)]},{equip:Array(101).fill('x')},{unique:'yes'},{extra:'x'}])assert.throws(()=>validateItem({...b,...patch}),JSON.stringify(patch));
 assert.throws(()=>parseItemJSON('x'.repeat(200001)));assert.throws(()=>parseItemJSON('{broken'));assert.throws(()=>parseItemJSON('{"version":1,"name":"x","quality":"rare","__proto__":{"polluted":true}}'));assert.throws(()=>validateItem({...b,constructor:'x'}));assert.throws(()=>validateItem([]));assert.throws(()=>decodeShare('ig1.'+'x'.repeat(64001)));assert.throws(()=>decodeShare('ig1.###'));assert.throws(()=>decodeShare('ig2.e30'));
 const xss=validateItem({...b,name:'<img src=x onerror=alert(1)>',flavor:'<script>alert(1)</script>'});assert.ok(itemText(xss,'en').includes('<script>')); // remains inert text; no HTML render path
});
test('history groups edits, truncates redo, and preserves a valid locked damage tuple',()=>{
 const a={...blankItem(),name:'A'},b={...a,name:'B'},c={...a,name:'C'};const h=new History(a);h.push(b);h.push(b);assert.equal(h.items.length,2);assert.deepEqual(h.undo(),a);assert.deepEqual(h.redo(),b);h.undo();h.push(c);assert.deepEqual(h.redo(),c);
 const current={...a,damageMin:900,damageMax:1000,speed:3};const next={...b,damageMin:10,damageMax:20,speed:1};const locked=applyLocks(current,next,new Set(['name','damageMin']));assert.equal(locked.name,'A');assert.equal(locked.damageMax,1000);assert.equal(locked.speed,3);
});
test('DPS, Unicode share, quality colors and hidden optional fields',()=>{
 const i={...blankItem(),name:'BÄÄÄMMM! 🥔 你好',stats:['−15 Intelligenz'],damageMin:420,damageMax:1337,speed:6.9};assert.deepEqual(decodeShare(encodeShare(i)),i);assert.equal(dps(i),(420+1337)/2/6.9);assert.equal(Object.keys(QUALITIES).length,9);assert.equal(itemLines(blankItem(),'de').length,1);
});
test('long names, unbroken words and every catalog item lay out without clipping',async()=>{
 const c=fakeCanvas();for(const lang of ['de','en'])for(const row of catalog.items){const i=validateItem(row[lang]);const l=layoutItem(c.getContext('2d'),i,lang,{});for(const r of l.rows){assert.ok(r.y<l.bottom);assert.ok(r.x>=l.x);assert.ok(r.x+c.getContext('2d').measureText(r.text).width<=l.x+l.tooltipWidth+1);}await renderItem(c,i,lang,{scale:2,background:'workshop'});assert.ok(c.height>200);}
 const i={...blankItem(),name:'X'.repeat(200),stats:Array.from({length:80},(_,n)=>`${n}: `+'foo '.repeat(15))};const l=layoutItem(c.getContext('2d'),i,'en',{});assert.equal(l.rows.filter(x=>x.bold).map(x=>x.text).join(''),i.name);assert.ok(l.height>1000);assert.ok(l.rows.every(r=>r.y<l.bottom));await renderItem(c,i,'en',{scale:1,background:'transparent',branding:false});assert.ok(c.height>1000);
});
test('generated routes include SEO, original assets, local-only application and working internal links',()=>{
 for(const lang of ['de','en']){const prefix=lang==='de'?'/de':'';const p=`${prefix}/tools/the-item-goblin/`;const html=readFileSync(new URL(`..${p}index.html`,import.meta.url),'utf8');assert.ok(html.includes(`https://www.dennishilk.com${p}`));for(const s of ['hreflang="de"','hreflang="en"','og:image','WebApplication','noscript'])assert.ok(html.includes(s));for(const match of html.matchAll(/(?:href|src)="(\/[^"#?]*)/g)){const route=match[1];assert.ok(existsSync(new URL('..'+route+(route.endsWith('/')?'index.html':''),import.meta.url)),route);} }
 const app=readFileSync(new URL('../assets/item-goblin/app.mjs',import.meta.url),'utf8');assert.ok(!app.includes('innerHTML'));assert.ok(!app.includes('eval('));assert.ok(!app.includes('fetch(\'http'));assert.ok(app.includes("new ClipboardItem({'image/png':promise})"));
});
