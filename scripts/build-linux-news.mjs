// Original bilingual news articles, using the existing localized blog shell.
// Add paired entries and HTML fragments in content/linux-news/ for future reports.
// This builder preserves every existing index section and does not access the network.
import {readFileSync, writeFileSync, mkdirSync, existsSync} from 'node:fs';
import {resolve} from 'node:path';

const root=resolve(import.meta.dirname,'..'),origin='https://www.dennishilk.com';
const read=p=>readFileSync(resolve(root,p),'utf8');
const write=(p,s)=>writeFileSync(resolve(root,p),s);
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const specs=JSON.parse(read('content/linux-news/articles.json'));
const date=(s,lang)=>new Intl.DateTimeFormat(lang==='de'?'de-DE':'en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(s+'T12:00:00Z'));
const plain=s=>s.replace(/<[^>]*>/g,' ').replace(/&\w+;/g,' ').trim();

for(const a of specs){
  const de=a.lang==='de',prefix=de?'/de':'',route=prefix+'/blog/'+a.slug+'/',url=origin+route;
  const en=de?origin+'/blog/'+a.alternate+'/':url,ger=de?url:origin+'/de/blog/'+a.alternate+'/',other=de?en:ger;
  if(!specs.some(b=>b.topic===a.topic&&b.lang!==a.lang&&b.slug===a.alternate&&b.alternate===a.slug))throw Error('Missing reciprocal article: '+a.slug);
  const template=read(de?'de/blog/ssh-schluessel-linux-server/index.html':'blog/ssh-keys-linux-server/index.html');
  let shell=template.match(/<body\b[\s\S]*?<\/header>/)[0];
  shell=shell.replace(/(<a class="language-link" href=")[^"]+/,'$1'+other.slice(origin.length));
  const footer=template.match(/<footer class="site-footer">[\s\S]*?<\/footer>/)[0];
  const body=read('content/linux-news/'+a.topic+'.'+a.lang+'.fragment');
  const headings=[...body.matchAll(/<h2 id="([^"]+)">([^<]+)<\/h2>/g)];
  const toc='<ol>'+headings.map(([,id,title])=>`<li><a href="#${id}">${title}</a></li>`).join('')+'</ol>';
  const wordCount=plain(body).split(/\s+/).filter(Boolean).length,minutes=Math.ceil(wordCount/210);
  const image=a.heroImage||'/assets/blog/linux-news/'+a.topic+'-'+a.lang+'.svg',social=origin+(a.socialImage||'/assets/blog/linux-news/'+a.topic+'-social-'+a.lang+'.png');
  const graph={'@context':'https://schema.org','@graph':[
    {'@type':'BlogPosting','@id':url+'#article',mainEntityOfPage:url,url,headline:a.title,description:a.description,inLanguage:a.lang,datePublished:a.published,dateModified:a.modified,
      author:{'@type':'Person',name:'Dennis Hilk',url:origin+'/about/'},publisher:{'@type':'Person',name:'Dennis Hilk',url:origin+'/',image:origin+'/avatar.png'},
      isPartOf:{'@id':origin+prefix+'/blog/#blog'},articleSection:a.category,keywords:a.keywords,wordCount,image:social,citation:a.sourceUrls},
    {'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:de?'Startseite':'Home',item:origin+prefix+'/'},{'@type':'ListItem',position:2,name:'Blog',item:origin+prefix+'/blog/'},{'@type':'ListItem',position:3,name:a.title,item:url}]}
  ]};
  const head=`<!doctype html>
<html lang="${a.lang}"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(a.seoTitle)} · Dennis Hilk</title>
<meta name="description" content="${esc(a.description)}"><meta name="robots" content="index,follow,max-image-preview:large">
<link rel="canonical" href="${url}">
<link rel="alternate" hreflang="en" href="${en}"><link rel="alternate" hreflang="de" href="${ger}"><link rel="alternate" hreflang="x-default" href="${en}">
<link rel="alternate" type="application/rss+xml" title="Dennis Hilk — Blog (${de?'Deutsch':'English'})" href="${origin+prefix}/blog/feed.xml">
<meta property="og:type" content="article"><meta property="og:site_name" content="Dennis Hilk"><meta property="og:title" content="${esc(a.title)}">
<meta property="og:description" content="${esc(a.description)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${social}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${esc(a.socialAlt||(de?'Ubuntu 26.10: OpenSSH-Paketwechsel, rc-Status und Risiko beim Purgen. Eigene Erklärgrafik.':'Ubuntu 26.10: OpenSSH package transition, rc state and unsafe purge risk. Original schematic.'))}">
<meta property="og:locale" content="${de?'de_DE':'en_US'}"><meta property="og:locale:alternate" content="${de?'en_US':'de_DE'}">
<meta property="article:published_time" content="${a.published}"><meta property="article:modified_time" content="${a.modified}"><meta property="article:author" content="${origin}/about/"><meta property="article:section" content="${esc(a.category)}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(a.title)}"><meta name="twitter:description" content="${esc(a.description)}"><meta name="twitter:image" content="${social}"><meta name="twitter:image:alt" content="${esc(a.socialAlt||(de?'OpenSSH: Variantenwechsel, erwarteter rc-Zustand und Risiko eines ungeschützten Purge.':'OpenSSH: variant switch, expected rc state and risk from unguarded purge.'))}">
<link rel="stylesheet" href="/blog/blog.css?v=20261008-tutorials"><link rel="stylesheet" href="/assets/blog/linux-news/news.css?v=20261019">
${a.extraCss?`<link rel="stylesheet" href="${esc(a.extraCss)}">`:''}${a.extraJs?`<script type="module" src="${esc(a.extraJs)}"></script>`:''}<link rel="stylesheet" href="/assets/css/language-toggle.css?v=20261006"><script defer src="/assets/js/language-toggle.js?v=20261006"></script><script defer src="/blog/navigation.js?v=20261008"></script>
<script type="application/ld+json">${JSON.stringify(graph)}</script>
</head>`;
  const html=head+'\n'+shell+`
<main id="main" class="article-main news-article${a.articleClass?' '+esc(a.articleClass):''}">
<nav class="breadcrumbs" aria-label="${de?'Brotkrumennavigation':'Breadcrumbs'}"><a href="${prefix}/">${de?'Startseite':'Home'}</a><span aria-hidden="true">/</span><a href="${prefix}/blog/">Blog</a><span aria-hidden="true">/</span><a href="${prefix}/blog/#linux-news">${esc(a.category)}</a></nav>
<header class="article-header"><p class="eyebrow">${esc(a.category)} · ${esc(a.topicLabel||'Ubuntu & OpenSSH')}</p><h1>${esc(a.title)}</h1><p class="intro">${esc(a.summary)}</p><div class="article-meta"><span>${de?'Von':'By'} <a href="/about/">Dennis Hilk</a></span><span>${de?'Veröffentlicht':'Published'} <time datetime="${a.published}">${date(a.published,a.lang)}</time></span><span>${de?'Aktualisiert':'Updated'} <time datetime="${a.modified}">${date(a.modified,a.lang)}</time></span><span>${minutes} ${de?'Minuten Lesezeit':'minute read'}</span></div></header>
${a.leadFragment?read(a.leadFragment):''}<figure class="news-hero"><picture><source media="(max-width:650px)" srcset="${a.heroMobileImage||image.replace('.svg','-mobile.svg')}" width="${a.heroMobileWidth||a.heroWidth||620}" height="${a.heroMobileHeight||a.heroHeight||960}"><img src="${image}" width="${a.heroWidth||1200}" height="${a.heroHeight||720}" fetchpriority="high" decoding="async" alt="${esc(a.imageAlt)}"></picture><figcaption>${esc(a.imageCaption)}</figcaption></figure>
<div class="article-layout"><article class="article-copy" aria-label="${esc(a.title)}"><details class="mobile-toc"><summary>${de?'In diesem Artikel':'In this article'}</summary>${toc}</details>
${body}
<nav class="article-end-nav" aria-label="${de?'Artikelnavigation':'Article navigation'}"><a href="${prefix}/blog/#linux-news">← ${esc(a.category)}</a><a href="#page-top">${de?'Nach oben':'Back to top'} ↑</a></nav></article><aside class="article-sidebar"><nav class="desktop-toc" aria-label="${de?'Inhaltsverzeichnis':'Table of contents'}"><h2>${de?'In diesem Artikel':'In this article'}</h2>${toc}</nav><a class="sidebar-tool" href="${esc(a.primarySourceUrl||'https://bugs.launchpad.net/bugs/2169738')}">${esc(a.primarySourceLabel||(de?'Primärquelle: Launchpad-Bug 2169738':'Primary source: Launchpad bug 2169738'))} ↗</a></aside></div>
<aside class="related-guide"><p class="eyebrow">${de?'Passende Grundlagen':'Related practical guides'}</p><a href="${prefix}/blog/${de?'ssh-schluessel-linux-server':'ssh-keys-linux-server'}/">${de?'SSH-Schlüssel und Serveridentität verstehen':'Understand SSH keys and server identity'} →</a><a href="${prefix}/blog/${de?'linux-konfiguration-sichern':'backup-linux-configuration'}/">${de?'Linux-Konfiguration sinnvoll sichern':'Back up Linux configuration'} →</a><a href="${prefix}/blog/${de?'journalctl-linux-fehler-finden':'journalctl-linux-troubleshooting'}/">${de?'Linux-Fehler mit journalctl untersuchen':'Investigate Linux failures with journalctl'} →</a></aside>
</main>\n`+footer+'\n</body></html>\n';
  mkdirSync(resolve(root,route.slice(1)),{recursive:true});write(route.slice(1)+'index.html',html);
  console.log(a.lang+' '+a.slug+': '+wordCount+' words');
}

// Update just this permanent category; unrelated index content is retained verbatim.
for(const lang of ['en','de']){
  const de=lang==='de',prefix=de?'/de':'',path=prefix.slice(1)+(de?'/':'')+'blog/index.html';
  const articles=specs.filter(a=>a.lang===lang).sort((a,b)=>b.published.localeCompare(a.published)||a.slug.localeCompare(b.slug));
  const category=de?'Linux-News & Sicherheit':'Linux News & Security';
  let h=read(path);
  const existingSection=h.match(/<section id="linux-news"[\s\S]*?<\/section>/)?.[0];
  const existingCards=[...(existingSection||'').matchAll(/<article\b[\s\S]*?<\/article>/g)].map(m=>m[0]);
  const routeOf=card=>card.match(/<a class="card-link" href="([^"]+)"/)?.[1];
  const newsByRoute=new Map(articles.map(a=>[prefix+'/blog/'+a.slug+'/',a]));
  // This category also contains manually maintained investigations such as
  // Cthulhu. Rebuilding the generated news must retain their cards and copy.
  const manualCards=existingCards.filter(card=>!newsByRoute.has(routeOf(card)));
  const count=String(articles.length+manualCards.length).padStart(2,'0');
  h=h.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/,(_,json)=>{
    const data=JSON.parse(json),list=data['@graph'].find(n=>n['@type']==='ItemList'),blog=data['@graph'].find(n=>n['@type']==='Blog');
    const news=articles.map(a=>({'@type':'ListItem',url:origin+prefix+'/blog/'+a.slug+'/',name:a.title}));
    const updates=new Map(news.map(n=>[n.url,n])),existingURLs=new Set(list.itemListElement.map(n=>n.url));
    list.itemListElement=[...news.filter(n=>!existingURLs.has(n.url)),...list.itemListElement.map(n=>updates.has(n.url)?{...n,...updates.get(n.url)}:n)].map((n,i)=>({...n,position:i+1}));
    list.numberOfItems=list.itemListElement.length;
    blog.dateModified=[blog.dateModified,...articles.map(a=>a.modified)].filter(Boolean).sort().at(-1);
    return '<script type="application/ld+json">'+JSON.stringify(data)+'</script>';
  });
  const metadata=JSON.parse(h.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  h=h.replace(/(<p class="blog-count">)\d+/, '$1'+metadata['@graph'].find(n=>n['@type']==='ItemList').numberOfItems);
  const nav=`<a href="#linux-news">${esc(category)}<span>${count}</span></a>`;
  if(h.includes('href="#linux-news"'))h=h.replace(/(<a href="#linux-news">[\s\S]*?<span>)\d+(<\/span>)/,(_,before,after)=>before+count+after);
  else h=h.replace(/(<nav id="blog-navigation"[^>]*>)/,'$1'+nav);
  const renderCard=a=>`<article id="news-${a.topic}" class="guide-card"><a class="card-link" href="${prefix}/blog/${a.slug}/"><div class="guide-top"><span class="category">${esc(a.topicLabel||'Ubuntu & OpenSSH')}</span><span class="reading-time"><time datetime="${a.published}">${date(a.published,lang)}</time></span></div><h3>${esc(a.title)}</h3><p>${esc(a.summary)}</p><span class="read-link">${de?'Analyse lesen':'Read the analysis'} <span aria-hidden="true">→</span></span></a></article>`;
  const existingRoutes=new Set(existingCards.map(routeOf));
  const cards=[...articles.filter(a=>!existingRoutes.has(prefix+'/blog/'+a.slug+'/')).map(renderCard),...existingCards.map(card=>{
    const a=newsByRoute.get(routeOf(card));
    if(!a)return card;
    return card.replace(/<span class="privacy-badge">[\s\S]*?<\/span>/g,'')
      .replace(/<h3>[\s\S]*?<\/h3>/,'<h3>'+esc(a.title)+'</h3>')
      .replace(/<p>[\s\S]*?<\/p>/,'<p>'+esc(a.summary)+'</p>')
      .replace(/<time datetime="[^"]+">[\s\S]*?<\/time>/,`<time datetime="${a.published}">${date(a.published,lang)}</time>`);
  })].join('\n');
  const section=`<section id="linux-news" class="guides-section" aria-labelledby="linux-news-title"><div class="section-heading"><h2 id="linux-news-title">${esc(category)}</h2><span>${count}</span></div><p class="section-intro">${de?'Release-Analysen, wichtige Upstream-Änderungen, Sicherheitsmeldungen und verifizierte Workarounds. Datierte Berichte mit Primärquellen, geprüftem Status und klar benannten offenen Fragen.':'Release analyses, important upstream changes, security advisories and verified workarounds. Dated reports with primary sources, checked status and clearly identified open questions.'}</p><div class="guide-grid">${cards}</div><p class="section-return"><a href="#blog-navigation">${de?'Zur Themenübersicht ↑':'Back to topics ↑'}</a></p></section>`;
  if(existingSection&&existingCards.length){
    const first=existingSection.indexOf(existingCards[0]),last=existingSection.lastIndexOf(existingCards.at(-1))+existingCards.at(-1).length;
    const refreshed=(existingSection.slice(0,first)+cards+existingSection.slice(last))
      .replace(/(<div class="section-heading">[\s\S]*?<span>)\d+(<\/span>)/,(_,before,after)=>before+count+after);
    h=h.replace(existingSection,refreshed);
  }
  else if(existingSection)h=h.replace(existingSection,section);
  else h=h.replace('<section id="tutorials"',section+'\n<section id="tutorials"');
  write(path,h);
  // The SEO generator preserves old sitemap dates. Advance only the index that
  // this category edits, using its editorial metadata, never the execution date.
  const sitemapPath='sitemap-blog.xml',indexUrl=origin+prefix+'/blog/';
  if(existsSync(resolve(root,sitemapPath))){
    const modified=metadata['@graph'].find(n=>n['@type']==='Blog').dateModified;
    const sitemap=read(sitemapPath).replace(/<url>[\s\S]*?<\/url>/g,entry=>{
      if(!entry.includes('<loc>'+indexUrl+'</loc>'))return entry;
      if(!entry.includes('<lastmod>'))return entry.replace('</loc>','</loc>\n    <lastmod>'+modified+'</lastmod>');
      return entry.replace(/<lastmod>([^<]+)<\/lastmod>/,(_,old)=>'<lastmod>'+[old,modified].sort().at(-1)+'</lastmod>');
    });
    write(sitemapPath,sitemap);
  }
}
