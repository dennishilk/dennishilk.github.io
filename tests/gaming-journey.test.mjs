import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
const root=resolve(import.meta.dirname,'..');
const read=p=>readFileSync(resolve(root,p),'utf8');
const manifest=JSON.parse(read('assets/blog/gaming-journey/image-sources.json'));
const routes={de:'de/blog/meine-spiele-von-damals-bis-heute/',en:'blog/my-gaming-journey-1984-2026/'};
const pages=Object.fromEntries(Object.entries(routes).map(([lang,path])=>[lang,read(path+'index.html')]));
const attrs=tag=>Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map(x=>[x[1],x[2]]));
const tags=(html,name)=>[...html.matchAll(new RegExp(`<${name}\\b[^>]*>`,'g'))].map(x=>attrs(x[0]));
const titles=html=>tags(html,'li').filter(a=>a['data-game-title']).map(a=>a['data-game-title']);
const origin='https://www.dennishilk.com/';
for(const [lang,html] of Object.entries(pages)){
 test(`${lang}: one existing article, reciprocal locale URLs and truthful metadata`,()=>{
  assert.equal((html.match(/<h1\b/g)||[]).length,1);
  const links=tags(html,'link');assert.ok(links.some(a=>a.rel==='canonical'&&a.href===origin+routes[lang]));
  for(const locale of ['en','de'])assert.ok(links.some(a=>a.hreflang===locale&&a.href===origin+routes[locale]));
  assert.ok(links.some(a=>a.hreflang==='x-default'&&a.href===origin+routes.en));
  const data=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  const article=data['@graph'].find(n=>n['@type']==='BlogPosting');assert.equal(article.datePublished,'2026-11-06');assert.equal(article.dateModified,'2026-11-07');assert.equal(article.author.name,'Dennis Hilk');assert.equal(article.inLanguage,lang);assert.ok(data['@graph'].some(n=>n['@type']==='BreadcrumbList'));
 });
 test(`${lang}: all 99 memories and disclosed artwork coverage remain accessible`,()=>{
  const cards=tags(html,'li').filter(a=>a['data-game-title']);assert.equal(cards.length,99);assert.equal(new Set(cards.map(a=>a['data-game-title'])).size,99);
  const coverage=manifest.coverage.find(c=>c.lang===lang);assert.deepEqual(cards.filter(c=>c['data-image-status']!=='unillustrated').map(c=>c['data-game-title']),coverage.imagedGames.map(t=>t.replaceAll('&','&amp;')));
  assert.equal(coverage.actualImages+coverage.unillustratedCount,99);assert.equal(coverage.unillustratedGames.length,coverage.unillustratedCount);assert.ok(coverage.actualImages>=62);assert.equal(coverage.screenshotCount+coverage.coverCount+coverage.artworkCount+coverage.logoCount+coverage.referenceCount,coverage.actualImages);
  const unillustrated = [...html.matchAll(/<li class="game-card"[^>]*data-image-status="unillustrated"[^>]*>[\s\S]*?<\/li>/g)];
  assert.equal(unillustrated.length,coverage.unillustratedCount);
  for(const [entry] of unillustrated)assert.doesNotMatch(entry,/<(?:img|svg)\b|href="https:\/\//);
  assert.doesNotMatch(html,/game-schematic|archive-symbols\.svg/);
  const [article,credits] = html.split('<section class="era-block" id="quellen">');
  assert.ok(credits);
  assert.doesNotMatch(article,/<a\b[^>]*href="https:\/\/(?:commons\.wikimedia\.org|creativecommons\.org|www\.mobygames\.com)\//);
  assert.ok(html.includes('data-game-search'));assert.ok(html.includes('data-images-only'));assert.ok(html.includes('data-reset-filters'));assert.ok(html.includes('aria-live="polite"'));
 });
 test(`${lang}: all nine real character screenshots have the correct identity and level`,()=>{
  const cards=[...html.matchAll(/<figure class="character-card"[^>]*>([\s\S]*?)<\/figure>/g)].map(x=>x[0]);assert.equal(cards.length,9);
  for(const name of ['Nebukatneza','Bearforceone','Onenightstab','Desponia','Crocodile','Arganosh','Kurtcowbain','Katharina','Onlyzugzug']){
   const card=cards.find(c=>c.includes(`data-character="${name}"`));assert.ok(card,name);assert.ok(card.includes(`wow-${name.toLowerCase()}-`));assert.match(card,new RegExp(`${lang==='de'?'Stufe':'Level'} ${name==='Onlyzugzug'?1:60}\\b`));assert.ok(card.includes('data-enlarge'));assert.ok(card.includes('Blizzard Entertainment'));
  }
 });
 test(`${lang}: local image links, captions, dimensions and provenance are complete`,()=>{
  const declared=new Set(manifest.images.flatMap(m=>[m.path,m.thumbnail].filter(Boolean)));
  for(const image of tags(html,'img').filter(i=>i.src)){
   assert.ok(image.src.startsWith('/'),image.src);assert.ok(existsSync(resolve(root,image.src.slice(1))),image.src);assert.ok(image.alt?.length>4,image.src);assert.ok(Number(image.width)>0&&Number(image.height)>0,image.src);assert.ok(declared.has(image.src),`Uncredited: ${image.src}`);
   if(image.fetchpriority!=='high')assert.equal(image.loading,'lazy',image.src);
  }
  for(const a of tags(html,'a').filter(a=>a.href?.startsWith('/'))){
   const url=a.href.split(/[?#]/)[0];assert.ok(existsSync(resolve(root,url.slice(1)+(url.endsWith('/')?'index.html':''))),a.href);
  }
  const ids=new Set(tags(html,'h2').concat(tags(html,'h3'),tags(html,'li'),tags(html,'section'),tags(html,'div'),tags(html,'main')).map(a=>a.id).filter(Boolean));
  for(const a of tags(html,'a').filter(a=>a.href?.startsWith('#')))assert.ok(a.href==='#'||ids.has(a.href.slice(1)),`Missing anchor: ${a.href}`);
  const hero=html.match(/<figure class="memory-hero">([\s\S]*?)<\/figure>/)[1];assert.ok(hero.includes('data-enlarge'));assert.ok(hero.includes('href="/assets/blog/cthulhu-arch-dwm/desktop-2048.webp"'));
 });
 test(`${lang}: personal corrections and original anecdote placement remain intact`,()=>{
  const visible=html.replace(/<[^>]+>/g,' ');
  for(const text of ['Buddy Holly','Silber','Sub7','VHS-C','ASSHOLE','Bluescreen der Vergeltung']){
   if(text==='Silber'&&lang==='en')assert.ok(visible.includes('silver wedding'));else assert.ok(visible.includes(text),text);
  }
  assert.ok(visible.includes(lang==='de'?'Genau einmal.':'Just once.'));assert.ok(visible.includes(lang==='de'?'Windows vorsorglich neu':'reinstalled Windows as a precaution'));
  const amiga=html.match(/<section class="era-block" id="amiga">([\s\S]*?)<\/section>/)[1];assert.ok(amiga.includes('Fettuccini'));assert.ok(amiga.includes('F10'));assert.ok(!amiga.includes('id="clippy-title"'));
  const hardware=html.match(/<section class="era-block" id="hardware">([\s\S]*?)<\/section>/)[1];assert.ok(hardware.includes('id="clippy-title"'));assert.ok(hardware.includes('id="athlon-title"'));
  assert.ok(!visible.includes('vermutlich Buddy Holly'));assert.ok(!visible.includes('probably Buddy Holly'));assert.ok(!visible.includes('haben wir nach erneutem'));
 });
}
test('DE and EN preserve the same ordered archive rather than duplicate or thin pages',()=>assert.deepEqual(titles(pages.de),titles(pages.en)));
test('all new media have traceable attribution and no thumbnail downloads full-resolution originals',()=>{
 for(const m of manifest.images){assert.ok(m.path&&m.sourceURL&&m.creator&&m.license&&m.attribution&&m.modifications&&m.section,m.path);assert.ok(existsSync(resolve(root,m.path.slice(1))),m.path);
  if(m.thumbnail){assert.notEqual(m.thumbnail,m.path);assert.ok(statSync(resolve(root,m.thumbnail.slice(1))).size<150_000,m.thumbnail);}
  if(m.kind==='historical-reference-photo'||m.kind==='publisher-game-image')assert.match(m.licenseURL,/^https:\/\//);
 }
 assert.equal(manifest.images.filter(m=>m.kind==='historical-reference-photo').length,18);
});
test('animation supports reduced motion and modal has native keyboard semantics',()=>{
 const css=read('assets/blog/gaming-journey/chronicle.css');assert.match(css,/@media\(prefers-reduced-motion:reduce\)[\s\S]*animation:none/);assert.ok(!css.includes('infinite'));
 for(const html of Object.values(pages)){assert.ok(html.includes('<dialog'));assert.ok(html.includes('method="dialog"'));assert.ok(html.includes('aria-labelledby="memory-lightbox-caption"'));}
 const js=read('assets/blog/gaming-journey/timeline.js');assert.ok(js.includes('showModal()'));assert.ok(js.includes('preventScroll: true'));assert.ok(js.includes("image.removeAttribute('src')"));
});
