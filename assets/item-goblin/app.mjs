import {blankItem,validateItem,parseItemJSON,generateItem,applyLocks,History,QUALITIES,CATEGORIES,NUM_FIELDS,ARRAY_FIELDS,encodeShare,decodeShare} from './core.mjs';
import {renderItem,itemText} from './render.mjs';
const lang=document.documentElement.lang==='de'?'de':'en';
const T={
 de:{editor:'Werkbank',examples:'Fundstücke',collection:'Meine Sammlung',name:'Gegenstandsname',quality:'Qualität',color:'Goblin-Farbe',itemLevel:'Gegenstandsstufe',requiredLevel:'Benötigte Stufe',binding:'Bindungsart',unique:'Einzigartig',slot:'Ausrüstungsplatz',type:'Gegenstandstyp',armor:'Rüstung',damageMin:'Minimaler Schaden',damageMax:'Maximaler Schaden',speed:'Angriffstempo',durability:'Haltbarkeit',profession:'Beruf / absurde Voraussetzung',classes:'Klassenvoraussetzung',stats:'Eigene Attribute',equip:'Anlegen-Effekte',use:'Benutzen-Effekte',hit:'Trefferchance-Effekte',cooldown:'Abklingzeit',setBonus:'Setbonus',flavor:'Beschreibung / Flavourtext',maker:'Hersteller',gold:'Gold',silver:'Silber',copper:'Kupfer',icon:'Gegenstandssymbol',iconPosition:'Symbolposition',outside:'Links neben dem Tooltip',inside:'Im Tooltip',none:'Ohne Symbol',basics:'Name & Herkunft',numbers:'Waffen & Rüstung',requirements:'Voraussetzungen & Bindung',effects:'Magie & Nebenwirkungen',details:'Beschreibung & Verkaufspreis',icons:'Symbol & eigenes Bild',lines:'Ein Eintrag pro Zeile. Positive, negative und frei erfundene Werte sind willkommen.',optional:'Leer = ausgeblendet',lock:'Gegen Auswürfeln sperren',reroll:'Dieses Feld neu auswürfeln',category:'Loot-Kategorie',absurdity:'Absurditätsgrad',levels:['Fast glaubwürdig','Klassischer WoW-Humor','Völlig bescheuert','Goblin außer Kontrolle'],qualities:['Schlecht','Gewöhnlich','Ungewöhnlich','Selten','Episch','Legendär','Artefakt','Erbstück','Goblin-Sondermüll'],categories:['Alles','Waffen','Rüstungen','Ringe & Schmuck','Verbrauchsgegenstände','Reittiere','Questgegenstände','Grauer Händlermüll','Legendäre Gegenstände','Tank-Humor','Heiler-Humor','DD-Humor','Raid-Humor','PvP-Humor','Berufs-Humor','Real Life','Linux & IT','Goblin-Wahnsinn'],roll:'🎲 /roll 1337',undo:'Rückgängig',redo:'Wiederholen',previous:'Vorheriger Wurf',reset:'Leeres Item',preview:'Dein frisch geschmiedeter Unsinn',previewHint:'Live-Vorschau · genauso wird dein Bild exportiert',copyImage:'Bild kopieren',download:'PNG herunterladen',copyText:'Text kopieren',share:'Link teilen',exportJSON:'JSON exportieren',importJSON:'JSON importieren',save:'Item lokal speichern',favorite:'Als Favorit speichern',unfavorite:'Favorit entfernen',search:'Fundstücke durchsuchen',load:'An die Werkbank',noResults:'Hier liegt noch kein Loot.',storage:'Favoriten und gespeicherte Items liegen nur in diesem Browser. Kein Konto, kein Upload. Der Editor wird beim nächsten Besuch neu gestartet. Geteilte Links enthalten deine Item-Daten.',clear:'Lokale Sammlung löschen',delete:'Löschen',saved:'In diesem Browser gespeichert.',cleared:'Lokale Sammlung gelöscht.',exportOptions:'Export einrichten',background:'Hintergrund',classic:'Klassischer Tooltip',transparent:'Transparent',workshop:'Goblin-Werkstatt',resolution:'Auflösung',branding:'Dezentes Branding anzeigen',copyOK:'PNG-Bild kopiert. Jetzt in Discord oder deinen Messenger einfügen.',downloadOK:'PNG wurde heruntergeladen.',textOK:'Text kopiert.',shareOK:'Link kopiert. Er enthält das vollständige Item.',fallback:'Bild-Zwischenablage nicht verfügbar. Das PNG wurde stattdessen heruntergeladen.',copyFail:'Kopieren ist hier nicht erlaubt. Nutze den Download oder markiere den Vorschautext.',upload:'Eigenes Symbol wählen (PNG, JPEG, WebP · bis 2 MB)',uploadFail:'Bitte PNG, JPEG oder WebP bis 2 MB und höchstens 4096 × 4096 Pixel wählen.',removeUpload:'Eigenes Bild entfernen',invalid:'Das Item konnte nicht geladen werden:',error:'Goblin-Panne:',initialError:'Die Werkstatt konnte nicht geladen werden. Bitte lade die Seite neu.',jsonOK:'Item aus JSON geladen.',shareLoaded:'Geteiltes Item geladen.',unlocked:'Alle Felder entsperren',locks:'gesperrte Felder',record:'Datenbank-Datensatz exportieren',recordHint:'Für die permanente Sammlung: zweite Sprachfassung ergänzen. Anleitung im Repository.',favoriteHeader:'Favoriten',ownHeader:'Eigene Items',limit:'Die Sammlung ist voll (100 Einträge). Lösche zuerst ein Item.',emptyName:'Gib deinem Item zuerst einen Namen.',storageFail:'Speichern nicht möglich. Der Browser-Speicher ist voll oder gesperrt. Bitte JSON exportieren.',working:'Goblin arbeitet …',downloadText:'Text herunterladen',shareTooLong:'Dieser Link ist zu lang. Exportiere das Item als JSON.',notSaved:'Noch nicht lokal gespeichert',loaded:'Item an der Werkbank.',caption:'Vorschautext für Screenreader',maxImage:'Dieses Bild ist zu groß.',loading:'Die Schmiede heizt auf …'},
 en:{editor:'Workbench',examples:'Loot cabinet',collection:'My collection',name:'Item name',quality:'Quality',color:'Goblin color',itemLevel:'Item level',requiredLevel:'Required level',binding:'Binding',unique:'Unique',slot:'Equipment slot',type:'Item type',armor:'Armor',damageMin:'Minimum damage',damageMax:'Maximum damage',speed:'Attack speed',durability:'Durability',profession:'Profession / absurd requirement',classes:'Class requirements',stats:'Custom attributes',equip:'Equip effects',use:'Use effects',hit:'Chance-on-hit effects',cooldown:'Cooldown',setBonus:'Set bonus',flavor:'Description / flavor text',maker:'Made by',gold:'Gold',silver:'Silver',copper:'Copper',icon:'Item icon',iconPosition:'Icon position',outside:'Beside the tooltip',inside:'Inside the tooltip',none:'No icon',basics:'Name & origin',numbers:'Weapons & armor',requirements:'Requirements & binding',effects:'Magic & side effects',details:'Flavor & sell price',icons:'Icon & custom image',lines:'One entry per line. Positive, negative and entirely invented stats welcome.',optional:'Empty = hidden',lock:'Lock against random changes',reroll:'Reroll this field',category:'Loot category',absurdity:'Absurdity level',levels:['Almost believable','Classic WoW humor','Utterly ridiculous','Goblin out of control'],qualities:['Poor','Common','Uncommon','Rare','Epic','Legendary','Artifact','Heirloom','Goblin-grade waste'],categories:['Everything','Weapons','Armor','Rings & trinkets','Consumables','Mounts','Quest items','Vendor trash','Legendary items','Tank humor','Healer humor','Damage dealer humor','Raid humor','PvP humor','Profession humor','Real life','Linux & IT','Goblin madness'],roll:'🎲 /roll 1337',undo:'Undo',redo:'Redo',previous:'Previous roll',reset:'Blank item',preview:'Your freshly forged nonsense',previewHint:'Live preview · exactly what your image export looks like',copyImage:'Copy image',download:'Download PNG',copyText:'Copy text',share:'Share link',exportJSON:'Export JSON',importJSON:'Import JSON',save:'Save item locally',favorite:'Save as favorite',unfavorite:'Remove favorite',search:'Search the loot cabinet',load:'To the workbench',noResults:'No loot in here yet.',storage:'Favorites and saved items stay in this browser. No account, no upload. The editor starts fresh on your next visit. Shared links contain your item data.',clear:'Delete local collection',delete:'Delete',saved:'Saved in this browser.',cleared:'Local collection deleted.',exportOptions:'Set up export',background:'Background',classic:'Classic tooltip',transparent:'Transparent',workshop:'Goblin workshop',resolution:'Resolution',branding:'Show subtle branding',copyOK:'PNG image copied. Paste it into Discord or your messenger.',downloadOK:'PNG downloaded.',textOK:'Text copied.',shareOK:'Link copied. It contains the complete item.',fallback:'Image clipboard unavailable. Your PNG was downloaded instead.',copyFail:'Clipboard access is blocked. Use download or select the preview text.',upload:'Choose your icon (PNG, JPEG, WebP · up to 2 MB)',uploadFail:'Choose a PNG, JPEG or WebP up to 2 MB and no larger than 4096 × 4096 pixels.',removeUpload:'Remove custom image',invalid:'Could not load this item:',error:'Goblin mishap:',initialError:'The workshop could not load. Please reload this page.',jsonOK:'JSON item loaded.',shareLoaded:'Shared item loaded.',unlocked:'Unlock all fields',locks:'locked fields',record:'Export catalog record',recordHint:'For the permanent catalog: add the second language. Instructions in the repository.',favoriteHeader:'Favorites',ownHeader:'Custom items',limit:'Your collection is full (100 entries). Delete an item first.',emptyName:'Give your item a name first.',storageFail:'Could not save. Browser storage is full or blocked. Please export JSON.',working:'Goblin at work …',downloadText:'Download text',shareTooLong:'This link is too long. Export the item as JSON.',notSaved:'Not saved locally yet',loaded:'Item on the workbench.',caption:'Preview text for screen readers',maxImage:'This image is too large.',loading:'Heating up the forge …'}
}[lang];
const $=id=>document.getElementById(id);
const el=(tag,attrs={},text)=>{const e=document.createElement(tag);for(const [k,v]of Object.entries(attrs)){if(k==='class')e.className=v;else e.setAttribute(k,String(v));}if(text!==undefined)e.textContent=text;return e;};
const button=(text,fn,attrs={})=>{const e=el('button',{type:'button',...attrs},text);e.addEventListener('click',()=>Promise.resolve().then(fn).catch(report));return e;};
const say=(message,bad=false)=>{const node=$('status');node.textContent=message;node.dataset.error=bad?'true':'false';};
const report=err=>say(`${T.error} ${err.message}`,true);
const STORE='the-item-goblin.collection.v1';
let item=blankItem(),history,previous=null,generator,examples,iconRows,revision=0,historyTimer,renderTimer;
let collection={favorites:[],own:[]};const locks=new Set(),fields=new Map(),iconCache=new Map();
const options={scale:2,background:'classic',branding:true};
function flush(){clearTimeout(historyTimer);history.push(item);updateHistory();}
function updateHistory(){ $('undo').disabled=history.index===0;$('redo').disabled=history.index===history.items.length-1;$('previous').disabled=!previous; }
function commit(next,{typing=false}={}){
 item=validateItem(next);revision++;
 if(typing){clearTimeout(historyTimer);historyTimer=setTimeout(flush,450);}else flush();
 syncFields();scheduleRender();
}
function syncFields(){
 for(const [key,node]of fields){const value=item[key];if(document.activeElement!==node){if(node.type==='checkbox')node.checked=value;else node.value=Array.isArray(value)?value.join('\n'):value??'';}}
 $('color-row').hidden=item.quality!=='goblin';
 $('remove-icon').hidden=!item.customIcon;
 const fav=collection.favorites.some(x=>JSON.stringify(x.item)===JSON.stringify(item));$('favorite').textContent=fav?T.unfavorite:T.favorite;
 updateHistory();
}
async function loadIcon(){
 const src=item.customIcon||iconRows.find(x=>x.id===item.icon).src;
 if(!iconCache.has(src)){iconCache.set(src,new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error(T.uploadFail));image.src=src;}));if(iconCache.size>50)iconCache.delete(iconCache.keys().next().value);}
 return iconCache.get(src);
}
function scheduleRender(){clearTimeout(renderTimer);renderTimer=setTimeout(()=>drawPreview().catch(report),35);}
async function drawPreview(){
 const rev=revision, snapshot=structuredClone(item), icon=snapshot.iconPosition==='none'?null:await loadIcon();
 if(rev!==revision)return;
 const canvas=$('preview-canvas');await renderItem(canvas,snapshot,lang,options,icon);
 $('preview-text').textContent=itemText(snapshot,lang);$('image-size').textContent=`${canvas.width} × ${canvas.height} PNG`;
}
function makeSelect(values,labels){const s=el('select');values.forEach((v,i)=>s.append(el('option',{value:v},labels[i])));return s;}
function field(key,kind='text',selectValues){
 const box=el('div',{class:`field ${kind==='textarea'?'wide':''}`,id:`${key}-row`});
 const header=el('div',{class:'field-label'}),label=el('label',{for:`field-${key}`},T[key]);header.append(label);
 if(!['color','iconPosition','unique'].includes(key)){
  const lock=button('◇',()=>{if(locks.has(key))locks.delete(key);else locks.add(key);lock.setAttribute('aria-pressed',String(locks.has(key)));lock.textContent=locks.has(key)?'◆':'◇';$('lock-count').textContent=`${locks.size} ${T.locks}`;},{class:'mini lock',title:T.lock,'aria-label':`${T.lock}: ${T[key]}`,'aria-pressed':'false','data-lock':key});
  const reroll=button('↻',()=>{flush();const next=generateItem(generator,lang,$('category').value,+$('absurdity').value);const patch={...item,[key]:next[key]};if(['damageMin','damageMax','speed'].includes(key))for(const k of ['damageMin','damageMax','speed'])patch[k]=next[k];commit(patch);},{class:'mini',title:T.reroll,'aria-label':`${T.reroll}: ${T[key]}`});header.append(lock,reroll);
 }
 box.append(header);
 let node=selectValues?makeSelect(selectValues.values,selectValues.labels):el(kind==='textarea'?'textarea':'input',kind==='textarea'?{rows:3}:{type:kind});
 node.id=`field-${key}`;fields.set(key,node);
 if(kind==='textarea'){node.maxLength=12000;node.setAttribute('aria-describedby',ARRAY_FIELDS.includes(key)?'lines-hint':'optional-hint');}
 else if(!selectValues&&kind!=='checkbox'){node.maxLength=key==='name'?200:2000;node.placeholder=T.optional;}
 if(kind==='number'){node.min=key==='speed'?'0.01':'0';node.max='10000000';node.step=key==='speed'?'0.01':'1';}
 node.addEventListener('input',()=>{
  const value=node.type==='checkbox'?node.checked:NUM_FIELDS.includes(key)?node.value===''?null:Number(node.value):ARRAY_FIELDS.includes(key)?node.value.split('\n'):node.value;
  try{commit({...item,[key]:value},{typing:true});node.setCustomValidity('');}catch(e){node.setCustomValidity(e.message);say(`${T.invalid} ${e.message}`,true);}
 });box.append(node);return box;
}
function group(title,keys,{open=false}={}){
 const detail=el('details',{class:'editor-group'});detail.open=open;detail.append(el('summary',{},title));const body=el('div',{class:'fields'});
 for(const key of keys){const kind=ARRAY_FIELDS.includes(key)||['flavor','binding','profession','classes','maker','cooldown'].includes(key)?'textarea':NUM_FIELDS.includes(key)?'number':key==='unique'?'checkbox':'text';body.append(field(key,kind));}
 detail.append(body);return detail;
}
function showTab(name){for(const tab of ['editor','examples','collection']){$(`panel-${tab}`).hidden=tab!==name;$(`tab-${tab}`).setAttribute('aria-selected',String(tab===name));$(`tab-${tab}`).tabIndex=tab===name?0:-1;}}
function makeUI(){
 const root=$('goblin-app');root.replaceChildren();
 const forge=el('section',{class:'roll-bar','aria-label':T.roll});const control=el('div',{class:'roll-controls'});
 for(const [id,title,values,labels]of [['category',T.category,CATEGORIES,T.categories],['absurdity',T.absurdity,[0,1,2,3],T.levels]]){
  const label=el('label',{for:id},title),select=makeSelect(values,labels);select.id=id;if(id==='absurdity')select.value='1';label.append(select);control.append(label);
 }
 forge.append(control,button(T.roll,()=>{flush();previous=structuredClone(item);commit(applyLocks(item,generateItem(generator,lang,$('category').value,+$('absurdity').value),locks));const quotes=QUIPS[lang];$('goblin-quip').textContent=quotes[Math.floor(Math.random()*quotes.length)];},{id:'roll',class:'roll-button'}));root.append(forge);
 const jumps=el('nav',{class:'mobile-jumps','aria-label':T.editor});jumps.append(el('a',{href:'#preview-heading'},lang==='de'?'Vorschau & Export':'Preview & export'),el('a',{href:'#panel-editor'},T.editor));root.append(jumps);
 const bench=el('div',{class:'workbench'}),left=el('section',{class:'editor-panel','aria-label':T.editor}),tabs=el('div',{class:'tabs',role:'tablist','aria-label':T.editor});
 for(const key of ['editor','examples','collection']){
  const b=button(T[key],()=>showTab(key),{id:`tab-${key}`,role:'tab','aria-controls':`panel-${key}`,'aria-selected':key==='editor'?'true':'false',tabindex:key==='editor'?0:-1});
  b.addEventListener('keydown',event=>{const keys=['editor','examples','collection'];let index=keys.indexOf(key);if(event.key==='ArrowRight')index=(index+1)%3;else if(event.key==='ArrowLeft')index=(index+2)%3;else if(event.key==='Home')index=0;else if(event.key==='End')index=2;else return;event.preventDefault();showTab(keys[index]);$(`tab-${keys[index]}`).focus();});tabs.append(b);
 }left.append(tabs);
 const editor=el('div',{id:'panel-editor',role:'tabpanel','aria-labelledby':'tab-editor'});
 const toolbar=el('div',{class:'history-bar'});
 toolbar.append(button(T.undo,()=>{flush();item=history.undo();revision++;syncFields();scheduleRender();},{id:'undo'}),button(T.redo,()=>{clearTimeout(historyTimer);item=history.redo();revision++;syncFields();scheduleRender();},{id:'redo'}),button(T.previous,()=>{flush();if(previous){const temp=item;commit(previous);previous=temp;updateHistory();}},{id:'previous'}),button(T.reset,()=>{flush();commit(blankItem());},{id:'reset'}));editor.append(toolbar);
 const lockBar=el('div',{class:'lock-bar'});lockBar.append(el('span',{id:'lock-count'},`0 ${T.locks}`),button(T.unlocked,()=>{locks.clear();for(const node of document.querySelectorAll('[data-lock]')){node.setAttribute('aria-pressed','false');node.textContent='◇';}$('lock-count').textContent=`0 ${T.locks}`;}));editor.append(lockBar,el('p',{id:'optional-hint',class:'muted small'},T.optional));
 const identity=group(T.basics,['name','itemLevel','slot','type'],{open:true});identity.querySelector('.fields').insertBefore(field('quality','select',{values:Object.keys(QUALITIES),labels:T.qualities}),identity.querySelector('.fields').children[1]);identity.querySelector('.fields').append(field('color','color'));editor.append(identity);
 const stats=group(T.stats,['stats'],{open:true});stats.querySelector('.fields').prepend(el('p',{id:'lines-hint',class:'muted small wide'},T.lines));editor.append(stats,group(T.numbers,['armor','damageMin','damageMax','speed','durability']),group(T.requirements,['requiredLevel','binding','unique','profession','classes']),group(T.effects,['equip','use','hit','cooldown','setBonus'],{open:true}),group(T.details,['flavor','maker','gold','silver','copper'],{open:true}));
 const iconGroup=el('details',{class:'editor-group'});iconGroup.append(el('summary',{},T.icons));const iconBody=el('div',{class:'fields'});iconBody.append(field('icon','select',{values:iconRows.map(x=>x.id),labels:iconRows.map(x=>x[lang])}),field('iconPosition','select',{values:['outside','inside','none'],labels:[T.outside,T.inside,T.none]}));
 const upload=el('input',{id:'icon-upload',type:'file',accept:'image/png,image/jpeg,image/webp'}),ul=el('label',{class:'wide',for:'icon-upload'},T.upload);ul.append(upload);upload.addEventListener('change',()=>handleUpload(upload.files[0]).catch(report).finally(()=>{upload.value='';}));iconBody.append(ul,button(T.removeUpload,()=>commit({...item,customIcon:''}),{id:'remove-icon',class:'wide'}));iconGroup.append(iconBody);editor.append(iconGroup);
 const cabinet=el('div',{id:'panel-examples',role:'tabpanel','aria-labelledby':'tab-examples'});cabinet.hidden=true;const searchLabel=el('label',{for:'example-search',class:'search-label'},T.search),search=el('input',{id:'example-search',type:'search'});search.addEventListener('input',renderExamples);searchLabel.append(search);cabinet.append(searchLabel,el('div',{id:'example-list',class:'loot-list'}));
 const saved=el('div',{id:'panel-collection',role:'tabpanel','aria-labelledby':'tab-collection'});saved.hidden=true;saved.append(el('p',{class:'muted'},T.storage),button(T.save,()=>saveItem('own'),{id:'save-own'}),button(T.importJSON,()=>$('json-import').click()),button(T.clear,()=>{try{localStorage.removeItem(STORE);collection={favorites:[],own:[]};renderCollection();syncFields();say(T.cleared);}catch{say(T.storageFail,true);}}),el('div',{id:'collection-list',class:'loot-list'}));
 left.append(editor,cabinet,saved);bench.append(left);
 const right=el('section',{class:'preview-panel','aria-labelledby':'preview-heading'});right.append(el('p',{class:'eyebrow'},'100% Loot. 0% Quality Control.'),el('h2',{id:'preview-heading'},T.preview),el('p',{class:'muted small'},T.previewHint));
 const stage=el('div',{class:'preview-stage'}),canvas=el('canvas',{id:'preview-canvas',role:'img','aria-label':T.preview,'aria-describedby':'preview-text'});stage.append(canvas);right.append(stage,el('pre',{id:'preview-text',class:'sr-only'},''),el('p',{id:'image-size',class:'image-size'},''));
 const actions=el('div',{class:'export-actions'});actions.append(button(T.copyImage,copyImage,{id:'copy-image',class:'primary'}),button(T.download,()=>downloadPNG(),{id:'download-png',class:'gold-button'}),button(T.copyText,copyText,{id:'copy-text'}),button(T.share,share,{id:'share-link'}),button(T.exportJSON,()=>downloadJSON(item,filename()+'.json'),{id:'export-json'}),button(T.importJSON,()=>$('json-import').click(),{id:'import-json'}),button(T.favorite,()=>saveItem('favorites'),{id:'favorite'}),button(T.save,()=>saveItem('own'),{id:'save-item'}));right.append(actions);
 const settings=el('details',{class:'export-settings'});settings.append(el('summary',{},T.exportOptions));const opts=el('div',{class:'fields'});
 for(const [key,title,values,labels]of [['background',T.background,['classic','transparent','workshop'],[T.classic,T.transparent,T.workshop]],['scale',T.resolution,[1,2,3],['1×','2× HD','3× HD']]]){
 const label=el('label',{},title),select=makeSelect(values,labels);select.id=`export-${key}`;select.value=String(options[key]);select.addEventListener('change',()=>{options[key]=key==='scale'?Number(select.value):select.value;revision++;scheduleRender();});label.append(select);opts.append(label);}
 const brand=el('label',{class:'wide checkbox-label'},T.branding),check=el('input',{type:'checkbox',id:'export-branding'});check.checked=true;check.addEventListener('change',()=>{options.branding=check.checked;revision++;scheduleRender();});brand.prepend(check);opts.append(brand);settings.append(opts);right.append(settings);
 const dev=el('details',{class:'export-settings'});dev.append(el('summary',{},lang==='de'?'Für deine Item-Datenbank':'For your item database'),el('p',{class:'muted small'},T.recordHint),button(T.record,()=>{const id=filename();downloadJSON({id,category:$('category').value==='all'?'goblin':$('category').value,[lang]:item},id+'.catalog.json');},{id:'export-record'}));right.append(dev);
 const status=el('p',{id:'status',role:'status','aria-live':'polite','aria-atomic':'true',class:'status'});right.append(status);bench.append(right);root.append(bench);
 const input=el('input',{id:'json-import',type:'file',accept:'.json,application/json',hidden:''});input.addEventListener('change',async()=>{try{const file=input.files[0];if(!file)return;if(file.size>200000)throw new Error('JSON > 200 kB');const next=parseItemJSON(await file.text());flush();commit(next);showTab('editor');say(T.jsonOK);}catch(e){say(`${T.invalid} ${e.message}`,true);}finally{input.value='';}});root.append(input);
}
async function handleUpload(file){
 if(!file)return;
 if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>2*1024*1024)throw new Error(T.uploadFail);
 const bitmap=await createImageBitmap(file);
 try{
  if(bitmap.width>4096||bitmap.height>4096)throw new Error(T.uploadFail);
  const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d');const ratio=Math.min(128/bitmap.width,128/bitmap.height);const w=bitmap.width*ratio,h=bitmap.height*ratio;ctx.drawImage(bitmap,(128-w)/2,(128-h)/2,w,h);
  const customIcon=c.toDataURL('image/webp',.85);flush();commit({...item,customIcon});
 }finally{bitmap.close();}
}
function filename(){return (item.name||'item-goblin').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80)||'item-goblin';}
function downloadBlob(blob,name){const url=URL.createObjectURL(blob),link=el('a',{href:url,download:name});document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
function downloadJSON(value,name){downloadBlob(new Blob([JSON.stringify(value,null,2)+'\n'],{type:'application/json'}),name);}
async function pngBlob(){const snapshot=structuredClone(item),icon=snapshot.iconPosition==='none'?null:await loadIcon(),canvas=document.createElement('canvas');await renderItem(canvas,snapshot,lang,{...options},icon);return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error(T.maxImage)),'image/png'));}
async function downloadPNG(blob){downloadBlob(blob||await pngBlob(),filename()+'.png');say(T.downloadOK);}
async function copyImage(){
 const promise=pngBlob();
 if(navigator.clipboard?.write&&typeof ClipboardItem!=='undefined'){
  try{await navigator.clipboard.write([new ClipboardItem({'image/png':promise})]);say(T.copyOK);return;}catch{/* Safari may restrict clipboard even on HTTPS; keep the user's image. */}
 }
 await downloadPNG(await promise);say(T.fallback);
}
async function copyText(){try{await navigator.clipboard.writeText(itemText(item,lang));say(T.textOK);}catch{downloadBlob(new Blob([itemText(item,lang)],{type:'text/plain'}),filename()+'.txt');say(T.copyFail);}}
async function share(){let hash;try{hash=encodeShare(item);}catch{say(T.shareTooLong,true);return;}const url=new URL(location.href);url.search='';url.hash=hash;try{await navigator.clipboard.writeText(url.href);say(T.shareOK);}catch{downloadBlob(new Blob([url.href],{type:'text/plain'}),filename()+'.link.txt');say(T.copyFail);}}
function saveCollection(next){try{localStorage.setItem(STORE,JSON.stringify(next));collection=next;renderCollection();syncFields();say(T.saved);return true;}catch{say(T.storageFail,true);return false;}}
function saveItem(kind){
 if(!item.name.trim()){say(T.emptyName,true);return;}
 const next=structuredClone(collection),index=next[kind].findIndex(x=>JSON.stringify(x.item)===JSON.stringify(item));
 if(index>=0){if(kind==='favorites')next[kind].splice(index,1);else{say(T.saved);return;}}
 else{if(next[kind].length>=100){say(T.limit,true);return;}next[kind].unshift({id:crypto.randomUUID(),item:structuredClone(item),lang});}
 saveCollection(next);
}
function loadCollection(){try{const raw=localStorage.getItem(STORE);if(!raw)return; if(raw.length>12000000)throw new Error('Storage too large');const data=JSON.parse(raw);for(const key of ['own','favorites']){if(!Array.isArray(data[key])||data[key].length>100)throw new Error('Invalid collection');collection[key]=data[key].map(x=>({id:String(x.id).slice(0,100),item:validateItem(x.item),lang:x.lang==='en'?'en':'de'}));}}catch{collection={favorites:[],own:[]};}}
function lootCard(value,subtitle,onLoad){const card=el('article',{class:'loot-card'});const title=el('h3',{},value.name);title.style.color=value.quality==='goblin'?value.color:QUALITIES[value.quality];card.append(title,el('p',{class:'muted small'},subtitle),button(T.load,onLoad));return card;}
function renderExamples(){const list=$('example-list');list.replaceChildren();const query=$('example-search').value.trim().toLocaleLowerCase(lang);const matches=examples.filter(row=>`${row[lang].name} ${row[lang].flavor||''} ${row.category}`.toLocaleLowerCase(lang).includes(query));for(const row of matches){const value=validateItem(row[lang]);list.append(lootCard(value,value.flavor,()=>{flush();commit(value);showTab('editor');say(T.loaded);}));}if(!matches.length)list.append(el('p',{},T.noResults));}
function renderCollection(){const list=$('collection-list');list.replaceChildren();for(const key of ['favorites','own']){list.append(el('h3',{},key==='favorites'?T.favoriteHeader:T.ownHeader));if(!collection[key].length)list.append(el('p',{class:'muted'},T.noResults));for(const row of collection[key]){const card=lootCard(row.item,row.item.flavor,()=>{flush();commit(row.item);showTab('editor');say(T.loaded);});card.append(button(T.delete,()=>{const next=structuredClone(collection);next[key]=next[key].filter(x=>x.id!==row.id);saveCollection(next);}));list.append(card);}}}
const QUIPS={de:['Qualitätskontrolle kostet extra.','Das war bestimmt Absicht.','Keine Rückerstattung nach dem Anlegen.','Wir nennen das ein Feature.','Der letzte Goblin wurde befördert. Wohin, wissen wir nicht.','Legendär ist relativ.','100 % handgefertigt. Mit fragwürdigen Händen.','Alle Gegenstände wurden unter Aufsicht eines Goblins nicht getestet.','Das Auktionshaus übernimmt keine Verantwortung.','Need before Greed? Wir nehmen beides.'],en:['Quality control costs extra.','That was definitely intentional.','No refunds after equipping.','We call that a feature.','The last goblin got promoted. We do not know where to.','Legendary is relative.','100% handmade. By questionable hands.','All items were not tested under goblin supervision.','The auction house accepts no responsibility.','Need before Greed? We take both.']};
async function init(){
 const fetchJSON=async name=>{const r=await fetch(`/assets/item-goblin/data/${name}.json`);if(!r.ok)throw new Error(T.initialError);return r.json();};
 const [catalog,pools,icons]=await Promise.all([fetchJSON('items'),fetchJSON('generator'),fetchJSON('icons')]);
 examples=catalog.items;generator=pools;iconRows=icons.icons;
 item=validateItem(examples[0][lang]);let shareError='',shareSuccess=false;
 if(location.hash){try{item=decodeShare(location.hash);shareSuccess=true;}catch(e){shareError=`${T.invalid} ${e.message}`;}}
 history=new History(item);loadCollection();makeUI();syncFields();renderExamples();renderCollection();await drawPreview();
 if(shareError)say(shareError,true);else if(shareSuccess)say(T.shareLoaded);
 const languageLink=$('language-link');languageLink.addEventListener('click',()=>{try{languageLink.hash=encodeShare(item);}catch{languageLink.hash='';}});
 window.addEventListener('hashchange',()=>{if(!location.hash)return;try{flush();commit(decodeShare(location.hash));say(T.shareLoaded);}catch(e){say(`${T.invalid} ${e.message}`,true);}});
 document.addEventListener('keydown',event=>{if(!(event.ctrlKey||event.metaKey)||event.key.toLowerCase()!=='z'||['INPUT','TEXTAREA'].includes(document.activeElement.tagName))return;event.preventDefault();$(event.shiftKey?'redo':'undo').click();});
}
init().catch(err=>{const message=el('p',{role:'alert',class:'load-error'},`${T.initialError} ${err.message}`);$('goblin-app').replaceChildren(message);});
