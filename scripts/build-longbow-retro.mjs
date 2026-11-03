// One bilingual personal retro-gaming article for the existing blog.
// Source: content/behind-projects/longbow.{de,en}.fragment and longbow.json.
// Reuses the existing site header/footer, article components and Behind the Projects cards.
// Safe to rerun; does not rewrite other article bodies.
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {resolve} from 'node:path';

const root=resolve(import.meta.dirname,'..');
const origin='https://www.dennishilk.com';
const read=(path)=>readFileSync(resolve(root,path),'utf8');
const write=(path,content)=>writeFileSync(resolve(root,path),content,'utf8');
const esc=(s)=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const data=JSON.parse(read('content/behind-projects/longbow.json'));
const date=(s,lang)=>new Intl.DateTimeFormat(lang==='de'?'de-DE':'en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(s+'T12:00:00Z'));
const photoBase='/assets/blog/janes-longbow-1996/';
const sourceUrls=[
 'https://www.mobygames.com/game/2711/janes-combat-simulations-ah-64d-longbow/',
 'https://www.gamespot.com/reviews/ah-64d-longbow-review/1900-2535742/',
 'https://arstechnica.com/gaming/2011/06/history-of-sim-gamespart-2/',
 'https://www.tales-from-darkenedroom.com/post/jane-s-ah-64d-longbow-a-version-retrospective-primer',
 'https://guides.loc.gov/this-month-in-business-history/january/y2k',
 'https://www.flightsimulator.com/microsoft-flight-simulator-2024-launch-day-update/',
 'https://arstechnica.com/gaming/2021/11/battlefield-2042-review-the-future-of-warfare-is-meaningless/',
 'https://www.mobygames.com/company/11/origin-systems-inc/',
 'https://news.ea.com/press-releases/press-releases-details/2011/EA-Launches-Origin/default.aspx'
];
const cardId='story-longbow';

for (const lang of ['de','en']) {
 const a=data[lang],de=lang==='de',prefix=de?'/de':'',route=prefix+'/blog/'+a.slug+'/',url=origin+route;
 const en=origin+'/blog/'+data.en.slug+'/',ger=origin+'/de/blog/'+data.de.slug+'/',other=de?en:ger;
 const template=read(de?'de/blog/nebuverse-gotosocial-selbst-hosten/index.html':'blog/nebuverse-self-hosting-gotosocial/index.html');
 const shellMatch=template.match(/<body\b[\s\S]*?<\/header>/);
 const footerMatch=template.match(/<footer class="site-footer">[\s\S]*?<\/footer>/);
 if(!shellMatch||!footerMatch) throw Error('Existing blog shell/footer changed: '+lang);
 const shell=shellMatch[0].replace(/(<a class="language-link" href=")[^"]+/, '$1'+other.slice(origin.length));
 const footer=footerMatch[0];
 let body=read('content/behind-projects/longbow.'+lang+'.fragment');
 let photos=0;
 body=body.replace(/\{\{photo:([\w-]+)\}\}/g,(_,key)=>{
  const spec=data.photos[key];
  if(!spec) throw Error('Unknown photo: '+key);
  photos++;
  const [alt,caption]=spec[lang],src=photoBase+spec.file;
  // Captions are trusted, authored HTML: small inline code elements are intentional.
  return `<figure class="article-figure longbow-photo longbow-photo-${key}"><a href="${src}" aria-label="${esc(de?'Foto in voller Größe öffnen':'Open full-size photograph')}"><img src="${src}" width="${spec.width}" height="${spec.height}" ${key==='bigbox'?'fetchpriority="high"':'loading="lazy"'} decoding="async" alt="${esc(alt)}"></a><figcaption>${caption} <span class="picture-credit">© Dennis Hilk · 2026</span></figcaption></figure>`;
 });
 if(photos!==12||body.includes('{{photo:')) throw Error('Photo count/placeholders wrong: '+lang+' '+photos);
 const headings=[...body.matchAll(/<h2 id="([^"]+)">([^<]+)<\/h2>/g)];
 const toc='<ol>'+headings.map(([,id,title])=>`<li><a href="#${esc(id)}">${esc(title)}</a></li>`).join('')+'</ol>';
 const words=body.replace(/<[^>]*>/g,' ').split(/\s+/).filter(Boolean).length;
 const minutes=Math.ceil(words/210);
 const social=origin+photoBase+'social-'+lang+'.png';
 const graph={'@context':'https://schema.org','@graph':[
  {'@type':'BlogPosting','@id':url+'#article',mainEntityOfPage:url,url,headline:a.title,description:a.description,inLanguage:lang,datePublished:data.date,dateModified:data.date,author:{'@type':'Person',name:'Dennis Hilk',url:origin+'/about/'},publisher:{'@type':'Person',name:'Dennis Hilk',url:origin+'/'},isPartOf:{'@id':origin+prefix+'/blog/#blog'},articleSection:a.category,wordCount:words,image:social,citation:sourceUrls,keywords:['Jane’s AH-64D Longbow','Longbow 1996','big box','retro gaming','Pentium III','Windows 98','MS-DOS','SCSI','Origin Systems','Electronic Arts']},
  {'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:de?'Startseite':'Home',item:origin+prefix+'/'},{'@type':'ListItem',position:2,name:'Blog',item:origin+prefix+'/blog/'},{'@type':'ListItem',position:3,name:a.title,item:url}]}
 ]};
 const head=`<!doctype html>
<html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(a.seoTitle)} · Dennis Hilk</title><meta name="description" content="${esc(a.description)}"><meta name="robots" content="index,follow,max-image-preview:large">
<link rel="canonical" href="${url}"><link rel="alternate" hreflang="en" href="${en}"><link rel="alternate" hreflang="de" href="${ger}"><link rel="alternate" hreflang="x-default" href="${en}">
<link rel="alternate" type="application/rss+xml" title="Dennis Hilk — Blog (${de?'Deutsch':'English'})" href="${origin+prefix}/blog/feed.xml">
<meta property="og:type" content="article"><meta property="og:site_name" content="Dennis Hilk"><meta property="og:title" content="${esc(a.title)}"><meta property="og:description" content="${esc(a.description)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${social}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${esc(a.socialAlt)}"><meta property="og:locale" content="${de?'de_DE':'en_US'}"><meta property="og:locale:alternate" content="${de?'en_US':'de_DE'}"><meta property="article:published_time" content="${data.date}"><meta property="article:modified_time" content="${data.date}"><meta property="article:section" content="${esc(a.category)}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(a.title)}"><meta name="twitter:description" content="${esc(a.description)}"><meta name="twitter:image" content="${social}"><meta name="twitter:image:alt" content="${esc(a.socialAlt)}">
<link rel="stylesheet" href="/blog/blog.css?v=20261008-tutorials"><link rel="stylesheet" href="/assets/css/language-toggle.css?v=20261006"><link rel="stylesheet" href="${photoBase}longbow.css?v=20261103"><script defer src="/assets/js/language-toggle.js?v=20261006"></script><script defer src="/blog/navigation.js?v=20261008"></script>
<script type="application/ld+json">${JSON.stringify(graph).replaceAll('<','\\u003c')}</script></head>`;
 const tocTitle=de?'In diesem Artikel':'In this article';
 const html=head+'\n'+shell+`<main class="article-main longbow-article" id="main"><nav class="breadcrumbs" aria-label="${de?'Brotkrumennavigation':'Breadcrumbs'}"><a href="${prefix}/">${de?'Startseite':'Home'}</a><span aria-hidden="true">/</span><a href="${prefix}/blog/">Blog</a><span aria-hidden="true">/</span><a href="${prefix}/blog/#behind-projects">${esc(a.category)}</a></nav><header class="article-header"><p class="eyebrow">${esc(a.category)} · ${esc(a.tag)}</p><h1 id="article-title">${esc(a.title)}</h1><div class="article-meta"><span>${de?'Von':'By'} <a href="/about/">Dennis Hilk</a></span><time datetime="${data.date}">${date(data.date,lang)}</time><span>${minutes} ${de?'Minuten Lesezeit':'minute read'}</span></div></header><div class="article-layout"><article class="article-copy" aria-labelledby="article-title"><details class="mobile-toc"><summary>${tocTitle}</summary>${toc}</details>
${body}
<nav class="article-end-nav" aria-label="${de?'Artikelnavigation':'Article navigation'}"><a href="${prefix}/blog/#behind-projects">← ${esc(a.category)}</a><a href="#page-top">${de?'Nach oben':'Back to top'} ↑</a></nav></article><aside class="article-sidebar"><nav class="desktop-toc" aria-label="${tocTitle}"><h2>${tocTitle}</h2>${toc}</nav><a class="sidebar-tool" href="${prefix}/blog/${de?'jurassic-park-unix-system-sgi-fsn':'jurassic-park-unix-sgi-fsn'}/">${de?'Mehr echte Retro-Computergeschichte':'More genuine retro-computing history'} →</a></aside></div><aside class="related-guide"><p class="eyebrow">${de?'Weiter entdecken':'Explore more'}</p><a href="${prefix}/blog/${de?'jurassic-park-unix-system-sgi-fsn':'jurassic-park-unix-sgi-fsn'}/">${de?'Jurassic Park: Das echte UNIX-System':'Jurassic Park: The Real UNIX System'} →</a><a href="/museum/${de?'?lang=de':''}">Computer Museum →</a></aside></main>`+footer+'\n</body></html>\n';
 mkdirSync(resolve(root,route.slice(1)),{recursive:true});write(route.slice(1)+'index.html',html);
 // Add to the existing Behind the Projects category, without replacing any other card.
 const indexPath=(de?'de/':'')+'blog/index.html';let index=read(indexPath);
 const section=index.match(/<section id="behind-projects"[\s\S]*?<\/section>/)?.[0];
 if(!section)throw Error('Missing Behind the Projects section: '+indexPath);
 const card=`<article id="${cardId}" class="guide-card"><a class="card-link" href="${route}"><div class="guide-top"><span class="category">${esc(a.category)} · ${esc(a.tag)}</span><span class="reading-time">${minutes} ${de?'Minuten Lesezeit':'minute read'}</span></div><h3>${esc(a.title)}</h3><p>${esc(a.description)}</p><span class="read-link">${de?'Artikel lesen':'Read the article'} <span aria-hidden="true">→</span></span></a></article>`;
 let updated=section.replace(/<article id="story-longbow"[\s\S]*?<\/article>/,'');
 updated=updated.replace('<div class="guide-grid">','<div class="guide-grid">'+card);
 if(updated===section&&!section.includes(cardId))throw Error('Cannot locate guide grid: '+indexPath);
 const count=String((updated.match(/class="guide-card\b/g)||[]).length).padStart(2,'0');
 updated=updated.replace(/(<div class="section-heading">[\s\S]*?<span>)\d+(<\/span>)/,(_,a,b)=>a+count+b);
 index=index.replace(section,updated).replace(/(<a href="#behind-projects">[\s\S]*?<span>)\d+(<\/span>)/,(_,a,b)=>a+count+b);
 let changedLd=false;
 index=index.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/,(_,json)=>{
   const metadata=JSON.parse(json),nodes=metadata['@graph'];
   const list=nodes?.find(x=>x['@type']==='ItemList');
   const blog=nodes?.find(x=>x['@type']==='Blog');
   if(!list?.itemListElement||!blog)throw Error('Blog JSON-LD missing ItemList/Blog');
   list.itemListElement=[{'@type':'ListItem',url,name:a.title},...list.itemListElement.filter(x=>x.url!==url)].map((x,i)=>({...x,position:i+1}));
   list.numberOfItems=list.itemListElement.length;
   blog.dateModified=[blog.dateModified,data.date].sort().at(-1);
   changedLd=true;
   return '<script type="application/ld+json">'+JSON.stringify(metadata).replaceAll('<','\\u003c')+'</script>';
 });
 if(!changedLd)throw Error('Blog ItemList not updated');
 const list=JSON.parse(index.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'].find(n=>n['@type']==='ItemList');
 index=index.replace(/(<p class="blog-count">)\d+/,'$1'+list.numberOfItems);
 write(indexPath,index);
 console.log(`Longbow ${lang}: ${words} words, ${photos} original photos, ${minutes} min. ${route}`);
}
