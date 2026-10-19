// Deterministic, offline publication of the complete audited Cthulhu guide.
// The source snapshot is tied to one public Cthulhu commit in source.json.
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {Marked} from './vendor/marked-17.0.5.mjs';

const root=resolve(import.meta.dirname,'..');
const read=p=>readFileSync(resolve(root,p),'utf8');
const write=(p,s)=>{mkdirSync(resolve(root,p,'..'),{recursive:true});writeFileSync(resolve(root,p),s);};
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const plain=s=>s.replace(/<[^>]*>/g,' ').replace(/&\w+;/g,' ').replace(/\s+/g,' ').trim();
const source=JSON.parse(read('content/cthulhu-dragon/source.json'));
const origin='https://www.dennishilk.com',base='https://github.com/dennishilk/cthulhu/blob/'+source.revision+'/'+source.directory+'/';
const slug='nixos-xmonad-kanagawa-dragon',published='2026-10-19';
const setup='https://github.com/dennishilk/cthulhu/tree/main/'+source.directory;
for(const [path,expected] of Object.entries(source.files)){
  const text=read('content/cthulhu-dragon/files/'+path);
  if(createHash('sha256').update(text).digest('hex')!==expected)throw Error('Snapshot hash mismatch: '+path);
}
// Lightweight, build-time token colors. Escaping is applied to every token and
// source character; code text remains exact and can be copied with or without JS.
function highlight(text,lang){
  const comment=lang==='haskell'?'--[^\\n]*':lang==='json'?'//[^\\n]*':lang==='ini'?'[#;][^\\n]*':'#[^\\n]*';
  const expression=new RegExp('("(?:\\\\.|[^"\\\\])*"|\'(?:\\\\.|[^\'\\\\])*\'|'+comment+'|\\b(?:import|qualified|as|let|in|if|then|else|case|of|do|module|where|True|False|true|false|with|inherit|assert|for|done|fi|esac|set|export|local)\\b|\\b[0-9]+(?:\\.[0-9]+)?\\b)','g');
  let result='',last=0;
  for(const m of text.matchAll(expression)){
    result+=esc(text.slice(last,m.index));const value=m[0];
    const type=/^["']/.test(value)?'string':/^(?:#|;|--|\/\/)/.test(value)?'comment':/^\d/.test(value)?'number':'keyword';
    result+='<span class="tok-'+type+'">'+esc(value)+'</span>';last=m.index+value.length;
  }
  return result+esc(text.slice(last));
}
const specs=[
{lang:'en',title:'NixOS + XMonad: Building My Complete Kanagawa Dragon Desktop from Scratch',seo:'NixOS XMonad setup: Kanagawa Dragon, startx & full configs',description:'Rebuild my NixOS XMonad desktop with Kanagawa Dragon: Plasma or Minimal, safe startx migration, dual monitors, complete configs, Kitty, GTK and Fastfetch.',summary:'Two installation routes, one reproducible desktop: the real files behind Cthulhu, with mouse-driven tiling, a managed startx session and a complete Kanagawa Dragon configuration library.'},
{lang:'de',title:'NixOS mit XMonad: Mein kompletter Kanagawa-Dragon-Desktop zum Nachbauen',seo:'NixOS mit XMonad: Kanagawa Dragon, startx & komplette Konfiguration',description:'Mein NixOS-XMonad-Desktop zum Nachbauen: Plasma oder Minimal, sicher zu startx wechseln, zwei Monitore, vollständige Konfigurationen, Kitty, GTK und Fastfetch.',summary:'Zwei Installationswege, ein nachvollziehbarer Desktop: die echten Dateien hinter Cthulhu, mit Maus-Tiling, verwalteter startx-Sitzung und vollständiger Kanagawa-Dragon-Konfigurationssammlung.'}
];
for(const a of specs){
  const de=a.lang==='de',prefix=de?'/de':'',route=prefix+'/blog/'+slug+'/',url=origin+route;
  const en=origin+'/blog/'+slug+'/',ger=origin+'/de/blog/'+slug+'/',other=de?en:ger;
  const template=read(de?'de/blog/ssh-schluessel-linux-server/index.html':'blog/ssh-keys-linux-server/index.html');
  let shell=template.match(/<body\b[\s\S]*?<\/header>/)[0].replace(/(<a class="language-link" href=")[^"]+/,'$1'+other.slice(origin.length));
  const footer=template.match(/<footer class="site-footer">[\s\S]*?<\/footer>/)[0];
  const md=read('content/cthulhu-dragon/guide.'+a.lang+'.md').replace(/^# [^\n]+\n/,'')
    .replace(/\]\(ATTRIBUTION\.md\)/g,']('+base+'ATTRIBUTION.md)');
  const headings=[],ids=new Set();let previousHeading='',filePath=null;
  const parser=new Marked({gfm:true,renderer:{
    heading({tokens,depth}){
      const title=this.parser.parseInline(tokens);previousHeading=plain(title);
      filePath=Object.hasOwn(source.files,previousHeading)?previousHeading:null;
      let id=previousHeading.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
      if(ids.has(id))throw Error('Duplicate heading '+id);ids.add(id);
      if(depth===2)headings.push({id,title});
      return `<h${depth} id="${id}">${title}</h${depth}>\n`;
    },
    code({text,lang}){
      const language=(lang||'text').split(/\s/)[0],label=filePath||({de:'Terminal / Konfiguration',en:'Terminal / configuration'})[a.lang];
      if(filePath){
        const expected=read('content/cthulhu-dragon/files/'+filePath).trimEnd();
        if(text!==expected)throw Error('Guide code differs from source: '+filePath);
      }
      const data=filePath?` data-source-file="${esc(filePath)}"`:'';
      const html=`<figure class="code-block"${data}><figcaption><span>${esc(label)}</span><span class="code-language">${esc(language)}</span></figcaption><pre tabindex="0" aria-label="${esc(label)}"><code class="language-${esc(language)}">${highlight(text,language)}\n</code></pre></figure>\n`;
      filePath=null;return html;
    },
    table(token){return `<div class="table-scroll" tabindex="0" role="region" aria-label="${de?'Vergleich oder Zuordnung':'Comparison or reference table'}"><table><thead>${this.tablerow({text:token.header.map(c=>this.tablecell(c)).join('')})}</thead><tbody>${token.rows.map(r=>this.tablerow({text:r.map(c=>this.tablecell(c)).join('')})).join('')}</tbody></table></div>`;}
  }});
  let body=parser.parse(md);
  // File-library headings precede the link paragraph and then their full code.
  // Resolve repository-relative audit references in prose without changing code.
  const toc='<ol>'+headings.map(h=>`<li><a href="#${h.id}">${h.title}</a></li>`).join('')+'</ol>';
  const count=plain(body.replace(/<pre[\s\S]*?<\/pre>/g,'')).split(' ').length,minutes=Math.ceil(count/210);
  const image=origin+'/assets/blog/cthulhu-dragon/desktop-2048.webp';
  const imageAlt=de?'Echter Cthulhu-Desktop: transparentes Kitty mit Fastfetch vor dunklem grünem Bergwald, oben Xmobar mit Uhr und Lautstärke.':'Actual Cthulhu desktop: transparent Kitty with Fastfetch over a dark green mountain forest, with Xmobar clock and volume at the top.';
  const category=de?'Linux-Tutorials & Desktop':'Linux tutorials & desktop';
  const graph={'@context':'https://schema.org','@graph':[
    {'@type':'BlogPosting','@id':url+'#article',url,mainEntityOfPage:url,headline:a.title,description:a.description,inLanguage:a.lang,datePublished:published,dateModified:published,
      author:{'@type':'Person',name:'Dennis Hilk',url:origin+'/about/'},publisher:{'@type':'Person',name:'Dennis Hilk',url:origin+'/'},image,wordCount:count,
      articleSection:category,keywords:['NixOS XMonad setup','NixOS startx','Kanagawa Dragon GTK','XMonad configuration','Linux desktop customization'],isPartOf:{'@id':origin+prefix+'/blog/#blog'},
      isBasedOn:'https://github.com/dennishilk/cthulhu',citation:[setup,'https://github.com/Fausto-Korpsvart/Kanagawa-GKT-Theme','https://xmonad.github.io/xmonad-docs/']},
    {'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:de?'Startseite':'Home',item:origin+prefix+'/'},{'@type':'ListItem',position:2,name:'Blog',item:origin+prefix+'/blog/'},{'@type':'ListItem',position:3,name:a.title,item:url}]}
  ]};
  const head=`<!doctype html>
<html lang="${a.lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(a.seo)} · Dennis Hilk</title><meta name="description" content="${esc(a.description)}"><meta name="robots" content="index,follow,max-image-preview:large">
<link rel="canonical" href="${url}"><link rel="alternate" hreflang="en" href="${en}"><link rel="alternate" hreflang="de" href="${ger}"><link rel="alternate" hreflang="x-default" href="${en}">
<link rel="alternate" type="application/rss+xml" title="Dennis Hilk — Blog (${de?'Deutsch':'English'})" href="${origin+prefix}/blog/feed.xml">
<meta property="og:type" content="article"><meta property="og:site_name" content="Dennis Hilk"><meta property="og:title" content="${esc(a.title)}"><meta property="og:description" content="${esc(a.description)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${image}"><meta property="og:image:width" content="2048"><meta property="og:image:height" content="858"><meta property="og:image:alt" content="${esc(imageAlt)}"><meta property="og:locale" content="${de?'de_DE':'en_US'}"><meta property="og:locale:alternate" content="${de?'en_US':'de_DE'}">
<meta property="article:published_time" content="${published}"><meta property="article:modified_time" content="${published}"><meta property="article:section" content="${esc(category)}"><meta property="article:author" content="${origin}/about/">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(a.title)}"><meta name="twitter:description" content="${esc(a.description)}"><meta name="twitter:image" content="${image}"><meta name="twitter:image:alt" content="${esc(imageAlt)}">
<link rel="stylesheet" href="/blog/blog.css?v=20261008-tutorials"><link rel="stylesheet" href="/assets/blog/cthulhu-dragon/guide.css?v=20261019">
<link rel="stylesheet" href="/assets/css/language-toggle.css?v=20261006"><script defer src="/assets/js/language-toggle.js?v=20261006"></script><script defer src="/blog/navigation.js?v=20261008"></script><script defer src="/assets/blog/cthulhu-dragon/guide.js?v=20261019"></script>
<script type="application/ld+json">${JSON.stringify(graph)}</script></head>`;
  const html=head+'\n'+shell+`
<main id="main" class="article-main dragon-guide"><nav class="breadcrumbs" aria-label="${de?'Brotkrumennavigation':'Breadcrumbs'}"><a href="${prefix}/">${de?'Startseite':'Home'}</a><span aria-hidden="true">/</span><a href="${prefix}/blog/">Blog</a><span aria-hidden="true">/</span><a href="${prefix}/blog/#tutorials">${esc(category)}</a></nav>
<header class="article-header"><p class="eyebrow">CTHULHU · NIXOS / X11 / XMONAD</p><h1>${esc(a.title)}</h1><p class="intro">${esc(a.summary)}</p><div class="article-meta"><span>${de?'Von':'By'} <a href="/about/">Dennis Hilk</a></span><time datetime="${published}">${de?'19. Oktober 2026':'19 October 2026'}</time><span>${minutes} ${de?'Minuten plus Installation':'minutes plus installation'}</span></div></header>
<figure class="dragon-hero"><a href="/assets/blog/cthulhu-dragon/desktop-2048.webp" aria-label="${de?'Desktop-Screenshot in voller Auflösung öffnen':'Open desktop screenshot at full resolution'}"><img src="/assets/blog/cthulhu-dragon/desktop-1920.webp" srcset="/assets/blog/cthulhu-dragon/desktop-960.webp 960w, /assets/blog/cthulhu-dragon/desktop-1920.webp 1920w, /assets/blog/cthulhu-dragon/desktop-2048.webp 2048w" sizes="(max-width:1100px) 94vw, 1080px" width="2048" height="858" fetchpriority="high" decoding="async" alt="${esc(imageAlt)}"></a><figcaption>${de?'Mein echter Desktop am 19. Oktober 2026. Screenshot: Dennis Hilk. Sichtbare fremde Kunst behält ihre ursprünglichen Rechte; eigene Bilder für den Nachbau einsetzen.':'My actual desktop on 19 October 2026. Screenshot: Dennis Hilk. Visible third-party artwork retains its original rights; supply your own images for the reproduction.'}</figcaption></figure>
<div class="dragon-overview"><div><span class="dragon-number">02</span><span>${de?'Wege: Plasma oder Minimal':'routes: Plasma or Minimal'}</span></div><div><span class="dragon-number">15</span><span>${de?'vollständige Dateien':'complete files'}</span></div><a href="${setup}">${de?'Setup auf GitHub':'Setup on GitHub'} ↗</a></div>
<div class="article-layout"><article class="article-copy" aria-label="${esc(a.title)}"><details class="mobile-toc"><summary>${de?'In dieser Anleitung':'In this guide'}</summary>${toc}</details>
${body}
<nav class="article-end-nav" aria-label="${de?'Artikelnavigation':'Article navigation'}"><a href="${prefix}/blog/#tutorials">← ${de?'Desktop-Tutorials':'Desktop tutorials'}</a><a href="#page-top">${de?'Nach oben':'Back to top'} ↑</a></nav></article><aside class="article-sidebar"><nav class="desktop-toc" aria-label="${de?'Inhaltsverzeichnis':'Table of contents'}"><h2>${de?'In dieser Anleitung':'In this guide'}</h2>${toc}</nav><a class="sidebar-tool" href="${setup}">${de?'Alle Dateien auf GitHub':'Every file on GitHub'} ↗</a><p class="source-revision">${de?'Dokumentierter Stand':'Documented revision'}: <a href="https://github.com/dennishilk/cthulhu/commit/${source.revision}">${source.revision.slice(0,7)}</a></p></aside></div>
<aside class="related-guide"><p class="eyebrow">${de?'Passend dazu':'Continue reading'}</p><a href="${prefix}/blog/${de?'nixos-configuration-nix-verstehen':'nixos-configuration-nix-explained'}/">${de?'NixOS-Konfiguration verstehen':'Understand NixOS configuration'} →</a><a href="${prefix}/blog/${de?'fish-shell-einstieg':'fish-shell-beginners'}/">${de?'Fish im Alltag':'Everyday Fish'} →</a><a href="${prefix}/blog/${de?'linux-konfiguration-sichern':'backup-linux-configuration'}/">${de?'Linux-Konfiguration sichern':'Back up Linux configuration'} →</a></aside>
</main>`+footer+'\n</body></html>\n';
  write(route.slice(1)+'index.html',html);
  // Add one card within the established tutorial category, retaining other sections.
  const indexPath=prefix.slice(1)+(de?'/':'')+'blog/index.html';let index=read(indexPath);
  const card=`<article id="cthulhu-dragon" class="guide-card"><a class="card-link" href="${route}"><div class="guide-top"><span class="category">NixOS · XMonad · Kanagawa Dragon</span><span class="reading-time">${minutes} ${de?'Minuten + Installation':'minutes + installation'}</span></div><h3>${esc(a.title)}</h3><p>${esc(a.summary)}</p><span class="privacy-badge">${de?'Plasma & Minimal · komplette Dateien':'Plasma & Minimal · complete files'}</span><span class="read-link">${de?'Desktop nachbauen':'Build this desktop'} <span aria-hidden="true">→</span></span></a></article>`;
  index=index.replace(/<section id="tutorials"[\s\S]*?<\/section>/,section=>{
    section=section.replace(/<article id="cthulhu-dragon"[\s\S]*?<\/article>/,'');
    section=section.replace('<div class="guide-grid">','<div class="guide-grid">'+card);
    if(!section.includes('href="#cthulhu-dragon"'))section=section.replace(/(<nav class="guide-topics"[^>]*>)/,'$1<a href="#cthulhu-dragon">Cthulhu Dragon</a>');
    const total=(section.match(/class="guide-card"/g)||[]).length;
    return section.replace(/(<div class="section-heading"><h2[^>]*>[^<]+<\/h2><span>)\d+/,'$1'+total);
  });
  const tutorialCount=(index.match(/<section id="tutorials"[\s\S]*?<\/section>/)[0].match(/class="guide-card"/g)||[]).length;
  index=index.replace(/(<a href="#tutorials">[\s\S]*?<span>)\d+/,'$1'+tutorialCount);
  index=index.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/,(_,json)=>{
    const data=JSON.parse(json),list=data['@graph'].find(n=>n['@type']==='ItemList'),blog=data['@graph'].find(n=>n['@type']==='Blog');
    const items=list.itemListElement.filter(i=>i.url!==url);
    const tutorials=index.match(/<section id="tutorials"[\s\S]*?<\/section>/)[0];
    const routes=[...tutorials.matchAll(/class="card-link" href="([^"]+)"/g)].map(m=>origin+m[1]).filter(u=>u!==url);
    const insert=items.findIndex(i=>i.url===routes[0]);
    items.splice(insert<0?items.length:insert,0,{'@type':'ListItem',url,name:a.title});
    list.itemListElement=items.map((i,n)=>({...i,position:n+1}));list.numberOfItems=list.itemListElement.length;blog.dateModified=[blog.dateModified,published].sort().at(-1);
    return '<script type="application/ld+json">'+JSON.stringify(data)+'</script>';
  });
  const total=JSON.parse(index.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'].find(x=>x['@type']==='ItemList').numberOfItems;
  index=index.replace(/(<p class="blog-count">)\d+/,'$1'+total);write(indexPath,index);
  console.log(a.lang+': '+count+' prose words, '+Object.keys(source.files).length+' complete files, '+headings.length+' sections');
}
