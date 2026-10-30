// Bilingual personal stories using the existing blog shell and card styles.
// Sources: content/behind-projects/articles.json and paired HTML fragments.
import {readFileSync, writeFileSync, mkdirSync, existsSync} from 'node:fs';
import {resolve} from 'node:path';

const root=resolve(import.meta.dirname,'..'),origin='https://www.dennishilk.com';
const read=p=>readFileSync(resolve(root,p),'utf8');
const write=(p,s)=>writeFileSync(resolve(root,p),s);
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const specs=JSON.parse(read('content/behind-projects/articles.json'));
const date=(s,lang)=>new Intl.DateTimeFormat(lang==='de'?'de-DE':'en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(s+'T12:00:00Z'));

for(const a of specs){
  const de=a.lang==='de',prefix=de?'/de':'',route=prefix+'/blog/'+a.slug+'/',url=origin+route;
  const en=de?origin+'/blog/'+a.alternate+'/':url,ger=de?url:origin+'/de/blog/'+a.alternate+'/',other=de?en:ger;
  if(!specs.some(b=>b.topic===a.topic&&b.lang!==a.lang&&b.slug===a.alternate&&b.alternate===a.slug))throw Error('Missing reciprocal story: '+a.slug);
  const template=read(de?'de/blog/nebuverse-gotosocial-selbst-hosten/index.html':'blog/nebuverse-self-hosting-gotosocial/index.html');
  const shell=template.match(/<body\b[\s\S]*?<\/header>/)[0].replace(/(<a class="language-link" href=")[^"]+/,'$1'+other.slice(origin.length));
  const footer=template.match(/<footer class="site-footer">[\s\S]*?<\/footer>/)[0];
  const figure=`<figure class="article-figure"><a href="${a.image}"><img src="${a.image}" width="1528" height="1274" loading="lazy" decoding="async" alt="${esc(a.imageAlt)}"></a><figcaption>${esc(a.imageCaption)}</figcaption></figure>`;
  const body=read('content/behind-projects/'+a.topic+'.'+a.lang+'.fragment').replace('{{screenshot}}',figure);
  const headings=[...body.matchAll(/<h2 id="([^"]+)">([^<]+)<\/h2>/g)];
  const toc='<ol>'+headings.map(([,id,title])=>`<li><a href="#${id}">${title}</a></li>`).join('')+'</ol>';
  const wordCount=body.replace(/<[^>]*>/g,' ').split(/\s+/).filter(Boolean).length,minutes=Math.ceil(wordCount/210),social=origin+a.socialImage;
  const graph={'@context':'https://schema.org','@graph':[
    {'@type':'BlogPosting','@id':url+'#article',mainEntityOfPage:url,url,headline:a.title,description:a.description,inLanguage:a.lang,datePublished:a.date,dateModified:a.date,author:{'@type':'Person',name:'Dennis Hilk',url:origin+'/about/'},publisher:{'@type':'Person',name:'Dennis Hilk',url:origin+'/'},isPartOf:{'@id':origin+prefix+'/blog/#blog'},articleSection:a.category,wordCount,image:social,citation:[a.sourceUrl]},
    {'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:de?'Startseite':'Home',item:origin+prefix+'/'},{'@type':'ListItem',position:2,name:'Blog',item:origin+prefix+'/blog/'},{'@type':'ListItem',position:3,name:a.title,item:url}]}
  ]};
  const head=`<!doctype html>
<html lang="${a.lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(a.seoTitle)} · Dennis Hilk</title><meta name="description" content="${esc(a.description)}"><meta name="robots" content="index,follow,max-image-preview:large">
<link rel="canonical" href="${url}"><link rel="alternate" hreflang="en" href="${en}"><link rel="alternate" hreflang="de" href="${ger}"><link rel="alternate" hreflang="x-default" href="${en}">
<link rel="alternate" type="application/rss+xml" title="Dennis Hilk — Blog (${de?'Deutsch':'English'})" href="${origin+prefix}/blog/feed.xml">
<meta property="og:type" content="article"><meta property="og:site_name" content="Dennis Hilk"><meta property="og:title" content="${esc(a.title)}"><meta property="og:description" content="${esc(a.description)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${social}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${esc(a.socialAlt)}"><meta property="og:locale" content="${de?'de_DE':'en_US'}"><meta property="og:locale:alternate" content="${de?'en_US':'de_DE'}"><meta property="article:published_time" content="${a.date}"><meta property="article:modified_time" content="${a.date}"><meta property="article:section" content="${esc(a.category)}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(a.title)}"><meta name="twitter:description" content="${esc(a.description)}"><meta name="twitter:image" content="${social}"><meta name="twitter:image:alt" content="${esc(a.socialAlt)}">
<link rel="stylesheet" href="/blog/blog.css?v=20261008-tutorials"><link rel="stylesheet" href="/assets/css/language-toggle.css?v=20261006"><script defer src="/assets/js/language-toggle.js?v=20261006"></script><script defer src="/blog/navigation.js?v=20261008"></script>
<script type="application/ld+json">${JSON.stringify(graph).replaceAll('<','\\u003c')}</script></head>`;
  const tocTitle=de?'In diesem Artikel':'In this article';
  const html=head+'\n'+shell+`<main class="article-main" id="main"><nav class="breadcrumbs" aria-label="${de?'Brotkrumennavigation':'Breadcrumbs'}"><a href="${prefix}/">${de?'Startseite':'Home'}</a><span aria-hidden="true">/</span><a href="${prefix}/blog/">Blog</a><span aria-hidden="true">/</span><a href="${prefix}/blog/#behind-projects">${esc(a.category)}</a></nav><header class="article-header"><p class="eyebrow">${esc(a.category)} · Google Search Console</p><h1 id="article-title">${esc(a.title)}</h1><div class="article-meta"><span>${de?'Von':'By'} <a href="/about/">Dennis Hilk</a></span><time datetime="${a.date}">${date(a.date,a.lang)}</time><span>${minutes} ${de?'Minuten Lesezeit':'minute read'}</span></div></header><div class="article-layout"><article class="article-copy" aria-labelledby="article-title"><details class="mobile-toc"><summary>${tocTitle}</summary>${toc}</details>
${body}
<nav class="article-end-nav" aria-label="${de?'Artikelnavigation':'Article navigation'}"><a href="${prefix}/blog/#behind-projects">← ${esc(a.category)}</a><a href="#page-top">${de?'Nach oben':'Back to top'} ↑</a></nav></article><aside class="article-sidebar"><nav class="desktop-toc" aria-label="${tocTitle}"><h2>${tocTitle}</h2>${toc}</nav><a class="sidebar-tool" href="/lost-administrator/">The Lost Administrator →</a></aside></div><aside class="related-guide"><p class="eyebrow">${de?'Weiter entdecken':'Explore more'}</p><a href="/lost-administrator/">${de?'Roman und interaktive Workstation':'Novel and interactive workstation'} →</a><a href="/museum/${de?'?lang=de':''}">Computer Museum →</a></aside></main>`+footer+'\n</body></html>\n';
  mkdirSync(resolve(root,route.slice(1)),{recursive:true});write(route.slice(1)+'index.html',html);

  // Upsert only this story's card and metadata, retaining all other sections.
  const indexPath=(de?'de/':'')+'blog/index.html';let index=read(indexPath);
  const section=index.match(/<section id="behind-projects"[\s\S]*?<\/section>/)?.[0];
  if(!section)throw Error('Missing Behind the Projects category');
  const card=`<article id="story-${a.topic}" class="guide-card"><a class="card-link" href="${route}"><div class="guide-top"><span class="category">${esc(a.category)} · SEO</span><span class="reading-time">${minutes} ${de?'Minuten Lesezeit':'minute read'}</span></div><h3>${esc(a.title)}</h3><p>${esc(a.description)}</p><span class="read-link">${de?'Artikel lesen':'Read the article'} <span aria-hidden="true">→</span></span></a></article>`;
  let updated=section.replace(new RegExp('<article id="story-'+a.topic+'"[\\s\\S]*?<\\/article>'),'');
  updated=updated.replace('<div class="guide-grid">','<div class="guide-grid">'+card);
  const count=String((updated.match(/class="guide-card\b/g)||[]).length).padStart(2,'0');
  updated=updated.replace(/(<div class="section-heading">[\s\S]*?<span>)\d+(<\/span>)/,(_,x,y)=>x+count+y);
  index=index.replace(section,updated).replace(/(<a href="#behind-projects">[\s\S]*?<span>)\d+(<\/span>)/,(_,x,y)=>x+count+y);
  index=index.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/,(_,json)=>{
    const data=JSON.parse(json),list=data['@graph'].find(n=>n['@type']==='ItemList'),blog=data['@graph'].find(n=>n['@type']==='Blog');
    list.itemListElement=[{'@type':'ListItem',url,name:a.title},...list.itemListElement.filter(n=>n.url!==url)].map((n,i)=>({...n,position:i+1}));list.numberOfItems=list.itemListElement.length;
    blog.dateModified=[blog.dateModified,a.date].sort().at(-1);
    return '<script type="application/ld+json">'+JSON.stringify(data)+'</script>';
  });
  const countAll=JSON.parse(index.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'].find(n=>n['@type']==='ItemList').numberOfItems;
  index=index.replace(/(<p class="blog-count">)\d+/,'$1'+countAll);write(indexPath,index);
  if(existsSync(resolve(root,'sitemap-blog.xml'))){
    const indexUrl=origin+prefix+'/blog/';
    write('sitemap-blog.xml',read('sitemap-blog.xml').replace(/<url>[\s\S]*?<\/url>/g,entry=>{
      if(!entry.includes('<loc>'+indexUrl+'</loc>'))return entry;
      return entry.includes('<lastmod>')?entry.replace(/<lastmod>([^<]+)<\/lastmod>/,(_,old)=>'<lastmod>'+[old,a.date].sort().at(-1)+'</lastmod>'):entry.replace('</loc>','</loc>\n    <lastmod>'+a.date+'</lastmod>');
    }));
  }
  console.log(a.lang+' '+a.slug+': '+wordCount+' words');
}
