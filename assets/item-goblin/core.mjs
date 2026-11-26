/** The Item Goblin: shared, dependency-free data contract and generator. */
export const VERSION = 1;
export const QUALITIES = {poor:'#9d9d9d',common:'#ffffff',uncommon:'#1eff00',rare:'#0070dd',epic:'#a335ee',legendary:'#ff8000',artifact:'#e6cc80',heirloom:'#00ccff',goblin:'#b6f54a'};
export const CATEGORIES = ['all','weapon','armor','jewelry','consumable','mount','quest','junk','legendary','tank','healer','damage','raid','pvp','profession','life','it','goblin'];
export const ICONS = ['sword','axe','mace','shield','staff','ring','boots','helmet','potion','bag','stone','tool','food','computer','keyboard','mount','scroll'];
export const ARRAY_FIELDS = ['stats','equip','use','hit','setBonus'];
export const NUM_FIELDS = ['itemLevel','requiredLevel','armor','damageMin','damageMax','speed','gold','silver','copper'];
export const TEXT_FIELDS = ['name','binding','slot','type','durability','profession','classes','cooldown','flavor','maker'];
export const blankItem = () => ({version:1,name:'',quality:'rare',color:'#b6f54a',itemLevel:null,requiredLevel:null,binding:'',unique:false,slot:'',type:'',armor:null,damageMin:null,damageMax:null,speed:null,durability:'',profession:'',classes:'',stats:[],equip:[],use:[],hit:[],cooldown:'',setBonus:[],flavor:'',maker:'',gold:null,silver:null,copper:null,icon:'ring',customIcon:'',iconPosition:'outside'});
export function validateItem(input) {
  const fail = message => { throw new Error(message); };
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('Expected an item object');
  if (input.version !== VERSION) fail('Unsupported item version');
  if (typeof input.name !== 'string' || typeof input.quality !== 'string') fail('Name and quality are required');
  const out = blankItem();
  for (const key of Object.keys(input)) if (!Object.hasOwn(out,key)) fail(`Unknown field: ${key}`);
  for (const key of TEXT_FIELDS) {
    if (input[key] === undefined) continue;
    if (typeof input[key] !== 'string' || input[key].length > (key==='name'?200:2000)) fail(`Invalid text: ${key}`);
    out[key] = input[key].replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'');
  }
  for (const key of NUM_FIELDS) {
    const n = input[key];
    if (n === undefined || n === null) continue;
    if (typeof n !== 'number' || !Number.isFinite(n) || n<0 || n>10000000 || (key==='speed' && n===0)) fail(`Invalid number: ${key}`);
    out[key] = n;
  }
  if (out.damageMin!==null && out.damageMax!==null && out.damageMax<out.damageMin) fail('Maximum damage must be at least minimum damage');
  for (const key of ARRAY_FIELDS) {
    if (input[key] === undefined) continue;
    if (!Array.isArray(input[key]) || input[key].length>100 || input[key].some(x=>typeof x!=='string'||x.length>1000)) fail(`Invalid lines: ${key}`);
    out[key] = input[key].map(x=>x.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'')).filter(x=>x.trim());
  }
  if (input.quality!==undefined) { if (!Object.hasOwn(QUALITIES,input.quality)) fail('Invalid quality'); out.quality=input.quality; }
  if (input.color!==undefined) { if (typeof input.color!=='string'||!/^#[a-f\d]{6}$/i.test(input.color)) fail('Invalid color'); out.color=input.color; }
  if (input.icon!==undefined) { if (!ICONS.includes(input.icon)) fail('Invalid icon'); out.icon=input.icon; }
  if (input.iconPosition!==undefined) { if (!['outside','inside','none'].includes(input.iconPosition)) fail('Invalid icon position'); out.iconPosition=input.iconPosition; }
  if (input.unique!==undefined) { if (typeof input.unique!=='boolean') fail('Invalid unique flag'); out.unique=input.unique; }
  if (input.customIcon !== undefined) {
    if (typeof input.customIcon!=='string'||input.customIcon.length>120000||(input.customIcon!==''&&!/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(input.customIcon))) fail('Invalid local icon');
    out.customIcon=input.customIcon;
  }
  if (JSON.stringify(out).length>180000) fail('Item too large');
  return out;
}
export function parseItemJSON(raw) {
  if (typeof raw!=='string'||raw.length>200000) throw new Error('JSON too large');
  return validateItem(JSON.parse(raw));
}
export const dps = item => item.damageMin!==null&&item.damageMax!==null&&item.speed>0 ? (item.damageMin+item.damageMax)/2/item.speed : null;
export function encodeShare(item) {
  const bytes = new TextEncoder().encode(JSON.stringify(validateItem(item)));
  let binary=''; for (const b of bytes) binary+=String.fromCharCode(b);
  const hash='ig1.'+btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  if (hash.length>64000) throw new Error('Share link too long. Export JSON instead.');
  return hash;
}
export function decodeShare(hash) {
  hash=hash.replace(/^#/,'');
  if (!hash.startsWith('ig1.')||hash.length>64000||!/^ig1\.[A-Za-z0-9_-]+$/.test(hash)) throw new Error('Invalid share link');
  const binary=atob(hash.slice(4).replace(/-/g,'+').replace(/_/g,'/'));
  return parseItemJSON(new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(binary,c=>c.charCodeAt(0))));
}
export function applyLocks(current, generated, locks) {
  const next={...generated};
  for (const key of locks) if (Object.hasOwn(current,key)) next[key]=structuredClone(current[key]);
  // A lock on any weapon number locks the complete damage tuple to keep it valid.
  if (['damageMin','damageMax','speed'].some(k=>locks.has(k))) for (const k of ['damageMin','damageMax','speed']) next[k]=current[k];
  return validateItem(next);
}
export class History {
  constructor(item) { this.items=[structuredClone(item)]; this.index=0; }
  push(item) { if(JSON.stringify(item)===JSON.stringify(this.items[this.index]))return; this.items.splice(this.index+1);this.items.push(structuredClone(item));if(this.items.length>80)this.items.shift();this.index=this.items.length-1; }
  undo() { if(this.index>0)this.index--;return structuredClone(this.items[this.index]); }
  redo() { if(this.index<this.items.length-1)this.index++;return structuredClone(this.items[this.index]); }
}
const nouns = {
 weapon:[['Schwert','Sword','sword'],['Zweihandaxt','Two-handed Axe','axe'],['Streitkolben','Mace','mace'],['Stab','Staff','staff']],
 armor:[['Stiefel','Boots','boots'],['Helm','Helmet','helmet'],['Schild','Shield','shield']],
 jewelry:[['Ring','Ring','ring'],['Talisman','Talisman','stone']],consumable:[['Trank','Potion','potion'],['Proviant','Rations','food']],mount:[['Dienstpony','Company Pony','mount']],quest:[['Schriftrolle','Scroll','scroll']],junk:[['Kiesel','Pebble','stone'],['Beutel','Bag','bag']],
 tank:[['Schild','Shield','shield']],healer:[['Stab','Staff','staff']],damage:[['Schwert','Sword','sword']],raid:[['Schlachtzugs-Tastatur','Raid Keyboard','keyboard']],pvp:[['Duellhelm','Dueling Helmet','helmet']],profession:[['Werkzeug','Tool','tool']],life:[['Feierabendstiefel','After-work Boots','boots']],it:[['Terminal','Terminal','computer'],['Tastatur','Keyboard','keyboard']],goblin:[['Prototyp','Prototype','tool']],legendary:[['Weltenhammer','World Hammer','mace']]
};
export function generateItem(database, lang='de', category='all', absurdity=1, random=Math.random) {
  if (!CATEGORIES.includes(category)) throw new Error('Invalid category');
  if (!Number.isInteger(absurdity)||absurdity<0||absurdity>3) throw new Error('Invalid absurdity');
  const pick = xs => xs[Math.min(xs.length-1,Math.floor(random()*xs.length))];
  const n = (a,b) => Math.floor(random()*(b-a+1))+a;
  const cat=category==='all'?pick(CATEGORIES.slice(1)):category;
  const pool = key => {
    const eligible=database[key].filter(x=>(x.minAbsurdity??0)<=absurdity);
    const matching=eligible.filter(x=>x.themes.includes(cat)||x.themes.includes('all'));
    return matching.length?matching:eligible;
  };
  const word = key => { const rows=pool(key); return rows.length?pick(rows):null; };
  const item=blankItem(), noun=pick(nouns[cat]), de=lang==='de';
  const suffix=word('suffixes'), adjective=word('adjectives');
  item.name=[absurdity>1&&adjective?adjective[lang]:null,noun[de?0:1],suffix?.[lang]].filter(Boolean).join(' ');
  item.icon=noun[2];item.quality=cat==='legendary'?'legendary':cat==='junk'?'poor':pick(['common','uncommon','rare','rare','epic','legendary','artifact','heirloom',...(absurdity===3?['goblin']:[])]);
  item.itemLevel=n(1,133);item.requiredLevel=n(1,60);item.binding=de?'Wird beim Anlegen gebunden':'Binds when equipped';
  const weapon=['sword','axe','mace','staff'].includes(item.icon);
  if (weapon) {item.slot=de?'Zweihändig':'Two-Hand';item.type=de?({sword:'Schwert',axe:'Axt',mace:'Streitkolben',staff:'Stab'}[item.icon]):({sword:'Sword',axe:'Axe',mace:'Mace',staff:'Staff'}[item.icon]);item.damageMin=n(20,160);item.damageMax=item.damageMin+n(30,180);item.speed=n(15,45)/10;item.durability='100 / 100';}
  else if (['boots','helmet','shield'].includes(item.icon)) {item.armor=n(2,800);item.slot=de?({boots:'Füße',helmet:'Kopf',shield:'Schild'}[item.icon]):({boots:'Feet',helmet:'Head',shield:'Off Hand'}[item.icon]);item.type=de?'Rüstung':'Armor';item.durability=cat==='life'?'1 / 100':'80 / 80';}
  else { item.slot=de?({ring:'Finger',potion:'Verbrauchbar',mount:'Reittier',scroll:'Questgegenstand'}[item.icon]||'Verschiedenes'):({ring:'Finger',potion:'Consumable',mount:'Mount',scroll:'Quest Item'}[item.icon]||'Miscellaneous'); }
  const statPool=pool('stats'), effectPool=pool('effects');
  item.stats=[...new Set(Array.from({length:n(1,2+absurdity)},()=>pick(statPool)?.[lang]).filter(Boolean))];
  const effects=[...new Set(Array.from({length:n(1,1+absurdity)},()=>pick(effectPool)))].filter(Boolean);
  for (const effect of effects) {
    const kind=['consumable','mount','quest'].includes(cat)?'use':effect.kind==='hit'&&!weapon?'equip':effect.kind;
    item[kind||'equip'].push(effect[lang]);
  }
  item.flavor=word('flavors')?.[lang]||'';
  if (absurdity>0) item.profession=word('requirements')?.[lang]||'';
  item.maker=de?'Goblin-Werkstatt, Ostfriesland':'Goblin Workshop, East Frisia';
  item.gold=cat==='junk'?0:n(0,absurdity===3?1337:99);item.silver=n(0,99);item.copper=n(0,99);
  if (['consumable','mount','quest','junk'].includes(cat)) {item.binding='';item.requiredLevel=null;}
  return validateItem(item);
}
