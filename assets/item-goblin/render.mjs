import { QUALITIES, dps } from './core.mjs';
export const WORDS = {
 de:{itemLevel:'Gegenstandsstufe',requiredLevel:'Benötigt Stufe',unique:'Einzigartig',armor:'Rüstung',damage:'Schaden',speed:'Tempo',dps:'Schaden pro Sekunde',durability:'Haltbarkeit',profession:'Benötigt',classes:'Klassen',equip:'Anlegen',use:'Benutzen',hit:'Trefferchance',cooldown:'Abklingzeit',setBonus:'Setbonus',maker:'Hergestellt von',price:'Verkaufspreis',unnamed:'Unbenannter Unfug'},
 en:{itemLevel:'Item Level',requiredLevel:'Requires Level',unique:'Unique',armor:'Armor',damage:'Damage',speed:'Speed',dps:'damage per second',durability:'Durability',profession:'Requires',classes:'Classes',equip:'Equip',use:'Use',hit:'Chance on hit',cooldown:'Cooldown',setBonus:'Set Bonus',maker:'Made by',price:'Sell Price',unnamed:'Unnamed Nonsense'}
};
export function itemLines(item, lang) {
 const w=WORDS[lang], lines=[], add=(text,color='#f1f0df',size=19,space=0)=>{if(text!==''&&text!==null&&text!==undefined)lines.push({text:String(text),color,size,space});};
 add(item.name||w.unnamed,QUALITIES[item.quality==='goblin'?'goblin':item.quality],26);
 if(item.quality==='goblin')lines[0].color=item.color;
 if(item.itemLevel!==null)add(`${w.itemLevel} ${item.itemLevel}`,'#e6cc80',17);
 add(item.binding);if(item.unique)add(w.unique);
 add([item.slot,item.type].filter(Boolean).join(' · '));
 if(item.armor!==null)add(`${item.armor} ${w.armor}`);
 if(item.damageMin!==null&&item.damageMax!==null)add(`${item.damageMin}–${item.damageMax} ${w.damage}${item.speed?`    ${w.speed} ${item.speed.toFixed(2)}`:''}`);
 else if(item.speed)add(`${w.speed} ${item.speed.toFixed(2)}`);
 if(dps(item)!==null)add(`(${dps(item).toFixed(1)} ${w.dps})`,'#f1f0df',17);
 item.stats.forEach(s=>add(s));
 if(item.durability)add(`${w.durability} ${item.durability}`);
 if(item.requiredLevel!==null)add(`${w.requiredLevel} ${item.requiredLevel}`);
 if(item.profession)add(`${w.profession}: ${item.profession}`);
 if(item.classes)add(`${w.classes}: ${item.classes}`);
 for(const field of ['equip','use','hit'])item[field].forEach((s,i)=>add(`${w[field]}: ${s}`,'#1eff00',19,i===0?7:0));
 if(item.cooldown)add(`${w.cooldown}: ${item.cooldown}`,'#f1f0df',17);
 item.setBonus.forEach((s,i)=>add(`${w.setBonus}: ${s}`,'#f4d477',19,i===0?9:0));
 if(item.flavor)add(`“${item.flavor}”`,'#ffd761',19,14);
 if(item.maker)add(`${w.maker} ${item.maker}`,'#9ad8ed',17,8);
 const price=[['gold','g'],['silver','s'],['copper','c']].filter(([k])=>item[k]!==null).map(([k,s])=>`${item[k]}${s}`).join('  ');
 if(price)add(`${w.price}: ${price}`,'#d5ba80',17,8);
 return lines;
}
export const itemText=(item,lang)=>itemLines(item,lang).map(x=>x.text).join('\n');
function wrap(ctx,text,maxWidth) {
 const output=[];
 for(const paragraph of text.split('\n')) {
  let line='';
  for(const word of paragraph.split(/\s+/)) {
   const candidate=line?`${line} ${word}`:word;
   if(ctx.measureText(candidate).width<=maxWidth) {line=candidate;continue;}
   if(line)output.push(line);line='';
   // Split even a long name or unbroken URL without dropping characters.
   for(const char of word) { if(line&&ctx.measureText(line+char).width>maxWidth){output.push(line);line='';} line+=char; }
  }
  output.push(line);
 }
 return output;
}
function roundRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
export function layoutItem(ctx,item,lang,{branding=true}={}) {
 const inside=item.iconPosition==='inside',outside=item.iconPosition==='outside',x=outside?112:24,tooltipWidth=500;
 let y=26;
 const rows=[];
 for(const [index,line] of itemLines(item,lang).entries()){
  ctx.font=`${index===0?'bold ':''}${line.size}px ${index===0?'Georgia, serif':'Arial, sans-serif'}`;
  const width=tooltipWidth-44-(inside&&index===0?78:0);
  y+=line.space;
  for(const text of wrap(ctx,line.text,width)) {rows.push({...line,text,x:x+22+(inside&&index===0?78:0),y:y+line.size,bold:index===0});y+=Math.ceil(line.size*1.35);}
 }
 const bottom=Math.max(inside?96:0,y+22);
 return {rows,x,width:x+tooltipWidth+24,tooltipWidth,height:bottom+(branding?55:22),bottom};
}
export async function renderItem(canvas,item,lang,options={},iconImage=null) {
 const {scale=2,background='classic',branding=true}=options;
 const ctx=canvas.getContext('2d');const layout=layoutItem(ctx,item,lang,{branding});
 // Browser canvas limits differ; tile-free export stays bounded and reports size errors.
 const pixels=layout.width*layout.height*scale*scale;
 if(pixels>64000000||layout.height*scale>30000)throw new Error(lang==='de'?'Dieses Item ist zu groß für ein Bild. Kürze die Texte oder wähle 1×.':'This item is too large for an image. Shorten its text or choose 1×.');
 canvas.width=layout.width*scale;canvas.height=layout.height*scale;ctx.scale(scale,scale);
 if(background==='workshop') {
  const g=ctx.createLinearGradient(0,0,layout.width,layout.height);g.addColorStop(0,'#26372b');g.addColorStop(1,'#100f0a');ctx.fillStyle=g;ctx.fillRect(0,0,layout.width,layout.height);
  ctx.strokeStyle='#75613b';ctx.lineWidth=1;for(let y=10;y<layout.height;y+=28){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(layout.width,y);ctx.stroke();}
 }
 if(background!=='transparent') {
  roundRect(ctx,layout.x,8,layout.tooltipWidth,layout.bottom,9);const g=ctx.createLinearGradient(0,8,0,layout.bottom);g.addColorStop(0,'#0c1127');g.addColorStop(1,'#070d1b');ctx.fillStyle=g;ctx.fill();ctx.strokeStyle='#a6a899';ctx.lineWidth=2;ctx.stroke();
  roundRect(ctx,layout.x+4,12,layout.tooltipWidth-8,layout.bottom-8,6);ctx.strokeStyle='#363e52';ctx.lineWidth=1;ctx.stroke();
 }
 if(item.iconPosition!=='none'&&iconImage) {
  const ix=item.iconPosition==='inside'?layout.x+20:22,iy=24;
  ctx.fillStyle='#1b271b';roundRect(ctx,ix-3,iy-3,70,70,8);ctx.fill();ctx.strokeStyle=item.quality==='goblin'?item.color:QUALITIES[item.quality];ctx.lineWidth=2;ctx.stroke();ctx.drawImage(iconImage,ix,iy,64,64);
 }
 for(const row of layout.rows){ctx.fillStyle=row.color;ctx.font=`${row.bold?'bold ':''}${row.size}px ${row.bold?'Georgia, serif':'Arial, sans-serif'}`;ctx.textBaseline='alphabetic';ctx.fillText(row.text,row.x,row.y);}
 if(branding){ctx.font='14px Arial, sans-serif';ctx.fillStyle='#c3c7ad';ctx.textAlign='center';ctx.fillText('The Item Goblin · dennishilk.com',layout.width/2,layout.bottom+40);ctx.textAlign='left';}
 return layout;
}
