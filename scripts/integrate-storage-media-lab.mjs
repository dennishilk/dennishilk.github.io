import {readFileSync,writeFileSync} from 'node:fs';
import {refreshCatalogCounts} from './museum-publication-counts.mjs';
const read=p=>readFileSync(p,'utf8'),origin='https://www.dennishilk.com';
const specs=JSON.parse(read('content/museum-blog/articles.json'));
for(const a of specs.filter(a=>a.topic==='storage')){
 const de=a.lang==='de',prefix=de?'/de':'',path=prefix.slice(1)+(de?'/':'')+'blog/index.html',url=origin+prefix+'/blog/'+a.slug+'/';let h=read(path);
 h=h.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/,(_,raw)=>{
 const data=JSON.parse(raw),list=data['@graph'].find(n=>n['@type']==='ItemList');list.itemListElement=list.itemListElement.filter(n=>n.url!==url);list.itemListElement.unshift({'@type':'ListItem',url,name:a.title});list.itemListElement.forEach((n,i)=>n.position=i+1);list.numberOfItems=list.itemListElement.length;data['@graph'].find(n=>n['@type']==='Blog').dateModified=a.date;return '<script type="application/ld+json">'+JSON.stringify(data)+'</script>';
 });
 const card=`<article id="storage-story" class="guide-card"><a class="card-link" href="${prefix}/blog/${a.slug}/"><div class="guide-top"><span class="category">${a.category}</span><span class="reading-time">${a.minutes} ${de?'Minuten Lesezeit':'minute read'}</span></div><h3>${a.title}</h3><p>${a.description}</p><span class="privacy-badge">${de?'Diskette · ZIP · CD · Flashspeicher':'Floppy · ZIP · CD · flash storage'}</span><span class="read-link">${de?'Artikel lesen':'Read the article'} →</span></a></article>`;
 h=h.replace(/<article id="storage-story"[\s\S]*?<\/article>/g,'').replace('<article id="chernobyl-story"',card+'<article id="chernobyl-story"');
 const count=String(new Set(specs.map(a=>a.topic)).size).padStart(2,'0');
 h=h.replace(/(<section id="museum-stories"[\s\S]*?<div class="section-heading">[\s\S]*?<span>)\d+(<\/span>)/,(_,p,q)=>p+count+q).replace(/(href="#museum-stories"[^>]*>[\s\S]*?<span>)\d+(<\/span>)/,(_,p,q)=>p+count+q);
 writeFileSync(path,h);
}
let h=read('museum/index.html').replace(/<a class="catalog-card museum-card-storage"[\s\S]*?<\/a>\s*/g,'');
const card=`<a class="catalog-card museum-card-storage" href="/museum/storage-media-lab/" data-native-de="/de/museum/speichermedien-lab/" data-category="hardware" data-status="available" data-keywords="storage speicher diskette floppy zip cd dvd blu-ray usb ventoy nand flash quake nin archive archiv 16"><div class="catalog-card-meta"><span class="catalog-topic"><span data-en="Hardware &amp; architecture" data-de="Hardware &amp; Architektur">Hardware &amp; architecture</span></span><span class="catalog-number" aria-hidden="true">25</span></div><img src="/assets/storage-media-lab/preview.svg" width="480" height="350" loading="lazy" alt="ZIP-100 · 100 MB" style="display:block;width:100%;height:125px;object-fit:contain"><h3 data-en="Storage Media Lab · From Floppy to Flash" data-de="Speichermedien-Labor · Von Diskette zu Flash">Storage Media Lab · From Floppy to Flash</h3><p data-en="Explore storage objects, compare modern games and rescue a transfer when disk 16 fails." data-de="Erkunde Speicherobjekte, vergleiche heutige Spiele und rette einen Transfer, wenn Diskette 16 scheitert.">Explore storage objects, compare modern games and rescue a transfer when disk 16 fails.</p><div class="catalog-card-foot"><span data-en="Five stations · Magnetic, optical &amp; flash" data-de="Fünf Stationen · Magnetisch, optisch &amp; Flash">Five stations · Magnetic, optical &amp; flash</span><span class="catalog-enter" aria-hidden="true">↗</span></div></a>`;
h=h.replace('<a class="catalog-card museum-card-dual-isa"',card+'\n<a class="catalog-card museum-card-dual-isa"');
h=h.replace(/("hasPart":\s*\[)([\s\S]*?)(\])/,(raw,p,body,q)=>{const entries=JSON.parse('['+body+']').filter(n=>!n['@id'].includes('storage-media-lab'));entries.push({'@id':origin+'/museum/storage-media-lab/#exhibit'});return p+'\n'+entries.map(n=>'        '+JSON.stringify(n)).join(',\n')+'\n      '+q;});
writeFileSync('museum/index.html',refreshCatalogCounts(h));
console.log('Integrated Storage Media Lab and both articles into museum and blog catalogs.');
