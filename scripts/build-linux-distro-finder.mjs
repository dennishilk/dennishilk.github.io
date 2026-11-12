import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {distros,desktops,questions,words} from '../assets/linux-distro-finder/catalog.js';
import {portraits} from '../content/linux-distro-finder/distros.mjs';
import {profiles} from '../content/linux-distro-finder/desktops.mjs';
import {updates,commandNotes} from '../content/linux-distro-finder/updates.mjs';
import {reference} from '../content/linux-distro-finder/reference.mjs';
import {articles} from '../content/linux-distro-finder/editorial.mjs';

const root=join(import.meta.dirname,'..');
const assets='/assets/linux-distro-finder';
const origin='https://www.dennishilk.com';
const date='2026-11-12';
const routes={
 tool:{en:'/tools/linux-distro-finder/',de:'/de/tools/linux-distro-finder/'},
 article:{en:'/blog/which-linux-distro-2026/',de:'/de/blog/welche-linux-distribution-passt-zu-mir-2026/'}
};
const screens=JSON.parse(readFileSync(join(root,'content/linux-distro-finder/screens.json')));
const distroScreens={fedora:['fedora-gnome','fedora-kde']};
const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const e=escape;
const attr=(href,label,extra='')=>`<a href="${e(href)}"${extra?' '+extra:''}>${e(label)}</a>`;
const author={'@type':'Person',name:'Dennis Hilk',url:origin+'/about/'};

function write(path,text) {
 const file=join(root,path,'index.html');
 if (process.argv.includes('--check')) {
  if (readFileSync(file,'utf8')!==text) throw new Error('Generated HTML out of date: '+path);
  return;
 }
 mkdirSync(dirname(file),{recursive:true});
 writeFileSync(file,text);
}

function build(lang) {
 const de=lang==='de',idx=de?0:1,other=de?'en':'de',prefix=de?'/de':'';
 const t=(de,en)=>idx?en:de;
 const home=de?'/de/':'/',blog=prefix+'/blog/';
 const imageLabels={
  arch:t('Ultrabreiter Arch-Desktop mit dwm, dunklem Hintergrund, Terminals und Systemmonitoren','Ultrawide Arch desktop with dwm, a dark background, terminals and system monitors'),
  gentoo:t('Gentoo-Desktop mit xmonad, Steam und mehreren Terminals','Gentoo desktop with xmonad, Steam and several terminals'),
  nixos:t('Cthulhu mit dunklem xmonad-Desktop und Drachenhintergrund','Cthulhu with a dark xmonad desktop and dragon wallpaper'),
  mint:t('Cinnamon mit Startmenü und unterem Panel','Cinnamon with an application menu and bottom panel'),
  debian:t('GNOME-Shell auf Debian Trixie','GNOME Shell on Debian Trixie'),
  'fedora-gnome':t('Fedora Workstation mit GNOME','Fedora Workstation running GNOME'),
  'fedora-kde':t('KDE Plasma auf Fedora mit Desktop und Panel','KDE Plasma on Fedora with desktop and panel'),
  cachyos:t('CachyOS mit KDE Plasma und Standardlayout','CachyOS with KDE Plasma and its default layout'),
  zorin:t('Angepasster GNOME-Desktop mit Zorin-Panel','Customized GNOME desktop with the Zorin panel'),
  ubuntu:t('Ubuntu-Desktop mit GNOME und Dock','Ubuntu desktop with GNOME and dock'),
  opensuse:t('Tumbleweed-Desktop mit KDE Plasma 6','Tumbleweed desktop with KDE Plasma 6'),
  slackware:t('Slackware 15 mit KDE Plasma','Slackware 15 running KDE Plasma'),
  hyprland:t('Hyprland-Desktop mit angeordneten Fenstern','Hyprland desktop with arranged windows'),
  sway:t('Sway-Sitzung der Ubuntu Sway Remix Edition','Sway session from Ubuntu Sway Remix'),
  niri:t('LXQt-Desktop mit niri als Wayland-Compositor','LXQt desktop using niri as its Wayland compositor'),
  labwc:t('Budgie-Einstellungen für das Erscheinungsbild von labwc','Budgie desktop settings for labwc theming'),
  i3:t('i3 mit Neovim als überlappendem Fenster','i3 with a floating Neovim window'),
  awesome:t('Awesome 4 mit Browser und mehreren Terminalfenstern','Awesome 4 with a browser and several terminals'),
  xfce:t('Xfce 4.20 mit Panel und Desktop','Xfce 4.20 with panel and desktop')
 };
 function figure(id,hero=false) {
  const image=screens[id];
  const alt=imageLabels[id];
  return `<figure><a data-enlarge href="${e(image.path)}" aria-label="${e(t('Vergrößern: ','Enlarge: ')+image.title)}"><img src="${e(image.path)}" width="${image.w}" height="${image.h}" ${hero?'fetchpriority="high"':'loading="lazy"'} decoding="async" alt="${e(alt)}"></a><figcaption>${e(image.title)} · ${attr(image.source,image.artist)}</figcaption></figure>`;
 }
 function shell(type,title,description,body) {
  const isArticle=type==='article',path=routes[type][lang],url=origin+path,alt=routes[type][other],image=screens[isArticle?'arch':'nixos'];
  const imageAlt=imageLabels[isArticle?'arch':'nixos'];
  const label=isArticle?'Blog':t('Werkzeuge','Tools');
  const parent=isArticle?blog:home;
  const crumbs=[{name:t('Startseite','Home'),item:origin+home},...(isArticle?[{name:'Blog',item:origin+blog}]:[]),{name:title,item:url}];
  const schema={'@context':'https://schema.org','@graph':[
   {'@type':isArticle?'BlogPosting':'WebPage','@id':url+'#'+(isArticle?'article':'page'),url,inLanguage:lang,
    ...(isArticle?{headline:title,mainEntityOfPage:url,articleSection:'Linux Tutorials',isPartOf:{'@id':origin+blog+'#blog'}}:{name:title}),
    author,description,image:origin+image.path,datePublished:date,dateModified:date},
   {'@type':'BreadcrumbList',itemListElement:crumbs.map((entry,index)=>({'@type':'ListItem',position:index+1,...entry}))}
  ]};
  return `<!doctype html>
<html lang="${lang}"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(title)} · Dennis Hilk</title>
<meta name="description" content="${e(description)}">
<meta name="robots" content="index,follow,max-image-preview:large">
<link rel="canonical" href="${url}">
<link rel="alternate" hreflang="en" href="${origin+routes[type].en}">
<link rel="alternate" hreflang="de" href="${origin+routes[type].de}">
<link rel="alternate" hreflang="x-default" href="${origin+routes[type].en}">
<link rel="alternate" type="application/rss+xml" title="Dennis Hilk · Blog" href="${origin+blog}feed.xml">
<meta property="og:site_name" content="Dennis Hilk">
<meta property="og:type" content="${isArticle?'article':'website'}">
<meta property="og:title" content="${e(title)}">
<meta property="og:description" content="${e(description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${origin+image.path}">
<meta property="og:image:width" content="${image.w}">
<meta property="og:image:height" content="${image.h}">
<meta property="og:image:alt" content="${e(imageAlt)}">
<meta property="og:locale" content="${de?'de_DE':'en_US'}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image:alt" content="${e(imageAlt)}">
<link rel="icon" href="/favicon.png">
<link rel="stylesheet" href="${assets}/style.css">
<script type="application/ld+json">${JSON.stringify(schema).replaceAll('<','\\u003c')}</script>
<script type="module" src="${assets}/ui.js"></script>
</head><body>
<a href="#main" class="skip">${t('Zum Inhalt','Skip to content')}</a>
<header class="top"><div class="wrap"><a href="${home}"><span class="brand-mark" aria-hidden="true">&gt;_</span>Dennis Hilk</a><a href="${blog}">Blog</a><a class="language" href="${alt}" lang="${other}" hreflang="${other}" aria-label="${t('Read in English','Auf Deutsch lesen')}">${other.toUpperCase()}</a></div></header>
<main id="main" class="wrap${isArticle?' editorial':''}">
<nav class="breadcrumbs" aria-label="${t('Brotkrümelnavigation','Breadcrumbs')}">${attr(home,t('Startseite','Home'))} / ${isArticle?attr(parent,label)+' / ':''}<span aria-current="page">${e(title)}</span></nav>
${body}
</main>
<dialog data-lightbox aria-labelledby="image-caption"><button type="button">${t('Schließen','Close')}</button><figure><img alt=""><figcaption id="image-caption"></figcaption></figure></dialog>
<footer><div class="wrap"><span>© 2026 Dennis Hilk · Wiesmoor</span>${attr('/impressum.html',t('Impressum','Legal notice'))}${attr('/datenschutzerklaerung.html',t('Datenschutz','Privacy'))}</div></footer>
</body></html>
`;
 }
 function option(value,label,selected) {
  return `<option value="${e(value)}"${selected?' selected':''}>${e(label)}</option>`;
 }
 function select(name,label,options,chosen='') {
  return `<label>${e(label)}<select name="${name}">${options.map(([id,word])=>option(id,word,id===chosen)).join('')}</select></label>`;
 }
 const title=t('Linux Distro Finder & WM-Konfigurator','Linux Distro Finder & WM Companion');
 const description=t('Welche Linux-Distribution passt zu dir? Vergleiche elf Distributionen und zwölf Desktops, erstelle WM-Konfigurationen und lerne die Update-Befehle.','Which Linux distro suits you? Compare 11 distributions and 12 desktops, build WM starter configs and learn what update commands do.');
 const nav=[['quiz',t('Distro-Finder','Distro finder')],['distros',t('Distributionen','Distributions')],['desktops',t('Desktops','Desktops')],['builder',t('WM-Konfigurator','WM config builder')],['updates',t('Updates','Updates')],['display',t('X11 & Wayland','X11 & Wayland')],['first-login',t('Erster Login','First login')]];
 const cards=distros.map(d=>{
  const [title,...body]=portraits[d.id][idx];
  return `<article class="profile" id="distro-${d.id}"><h3>${e(d.name)}</h3>${(distroScreens[d.id]||[d.id]).map(id=>figure(id)).join('')}<p class="subtitle">${e(title)}</p>${body.map(p=>`<p>${e(p)}</p>`).join('')}<p class="inline-links">${attr(d.site,t('Offizielle Website / Download','Official site / download'))}${attr(d.docs,t('Dokumentation','Documentation'))}${attr('#update-'+d.id,t('Update-Anleitung','Update guide'))}</p></article>`;
 }).join('\n');
 const filterFields=[
  ['protocol',t('Sitzung','Session'),['x11','wayland']],
  ['layout',t('Fensterlayout','Window layout'),['floating','dynamic','manual','scrolling']],
  ['level',t('Erfahrung','Experience'),['beginner','intermediate','advanced']],
  ['effort',t('Konfigurationsaufwand','Setup effort'),['low','medium','high']],
  ['input',t('Schwerpunkt','Primary input'),['mouse','keyboard']]
 ];
 const desktopCards=desktops.map(d=>{
  const image=profiles[d.id][0],paragraphs=profiles[d.id][idx+1];
  const facets=[d.layout,d.level,d.effort,d.input];
  return `<article class="profile" id="desktop-${d.id}" data-desktop data-protocol="${d.protocol.join(' ')}" data-layout="${d.layout}" data-level="${d.level}" data-effort="${d.effort}" data-input="${d.input}">
<h3>${e(d.name)}</h3>${figure(image)}
<ul class="tags"><li>${d.environment?t('Desktop-Umgebung','Desktop environment'):t('Window Manager','Window manager')}</li><li>${d.protocol.map(p=>words[lang][p]).join(' / ')}</li>${facets.map(v=>`<li>${e(words[lang][v])}</li>`).join('')}</ul>
${paragraphs.map(p=>`<p>${e(p)}</p>`).join('')}<p class="inline-links">${attr(d.docs,t('Projekt-Dokumentation','Project documentation'))}${d.environment?'':attr('#builder',t('Zum Konfigurator','Open builder'))}</p></article>`;
 }).join('\n');
 const updateCards=distros.map(d=>{
  const [commands,source,...body]=updates[d.id];
  return `<details id="update-${d.id}"><summary>${e(d.name)}</summary><p>${e(body[idx])}</p><ul class="command-list">${commands.map(cmd=>`<li><code>${e(cmd)}</code><br>${e(commandNotes[cmd][idx])}</li>`).join('')}</ul><p>${attr(source,t('Offizielle Anleitung','Official instructions'))}</p></details>`;
 }).join('\n');
 const credits=Object.values(screens).map(image=>`<li>${attr(image.source,image.title)} · ${e(image.artist)}${image.license?' · '+attr(image.terms,image.license)+' · '+t('für diese Seite als WebP aufbereitet','resized or converted to WebP for this page'):''}</li>`).join('\n');

 const tool=`<header class="hero"><div><p class="kicker">${t('Linux auswählen. Desktop einrichten.','Find your Linux. Build your desktop.')}</p><h1>${e(title)}</h1>
<p>${t('Vergleiche elf Linux-Distributionen und zwölf Oberflächen. Finde mit 15 Fragen einen Einstieg oder baue direkt eine startfähige Window-Manager-Konfiguration.','Compare eleven Linux distributions and twelve desktops. Answer 15 questions to find a starting point, or go straight to building a window manager configuration.')}</p>
<div class="button-row">${attr('#quiz',t('Distro-Finder starten','Start distro finder'),'class="button primary"')}${attr('#builder',t('WM konfigurieren','Build a WM config'),'class="button"')}</div></div>${figure('nixos',true)}</header>
<nav class="section-nav" aria-label="${t('Auf dieser Seite','On this page')}">${nav.map(([id,label])=>attr('#'+id,label)).join('')}</nav>
<section id="quiz"><h2>${t('Welche Linux-Distribution passt zu dir?','Which Linux distro suits you?')}</h2>
<p class="lead">${t('Deine Antworten bleiben im Browser. Du kannst einzelne Fragen überspringen und Antworten ändern.','Your answers stay in the browser. Skip questions or revise answers at any point.')}</p>
<details><summary>${t('So entsteht die Rangfolge','How the ranking works')}</summary>
<p>${t('Jede Antwort und jedes Distributionsprofil hat pro Thema eine Stufe von 0 bis 2. Die Entfernung zwischen beiden wird mit dem Gewicht der Frage multipliziert. Übersprungene Fragen zählen nicht. Gleichstände haben denselben Rang. Die folgenden Gewichte spiegeln die Prioritäten dieses Ratgebers.','Each answer and distro profile has a level from 0 to 2 per topic. The distance between them is multiplied by the question weight. Skipped questions contribute nothing. Tied distributions share a rank. These weights reflect the priorities of this guide.')}</p>
<ul>${questions.map(([,weight,word])=>`<li>${e(word[idx])} · ${t('Gewicht','Weight')} ${weight}</li>`).join('')}</ul></details>
<noscript><p>${t('Das Quiz braucht JavaScript. Die Porträts, Bilder und Anleitungen findest du weiter unten.','The quiz needs JavaScript. The profiles, images and guides are available below.')}</p></noscript>
<form class="panel" data-quiz hidden><div class="quiz-heading"><span data-progress></span><progress value="0" max="15" aria-label="${t('Quizfortschritt','Quiz progress')}"></progress></div>
<fieldset data-question></fieldset><div data-results hidden></div><div class="button-row"><button type="button" data-previous>${t('Zurück','Previous')}</button><button type="submit" data-next class="primary">${t('Weiter','Next')}</button><button type="button" data-restart class="quiet">${t('Neu starten','Restart')}</button></div></form></section>
<section id="distros"><h2>${t('Elf Linux-Distributionen im Vergleich','Eleven Linux distributions compared')}</h2>
<p class="lead">${t('Die Screenshots zeigen jeweils ein konkretes System. Desktop, Theme und Programme können je nach Edition und Einrichtung anders aussehen. Das gilt besonders für Arch, Gentoo, Slackware und NixOS.','Each screenshot shows a specific installation. Desktop, theme and applications vary by edition and setup, especially on Arch, Gentoo, Slackware and NixOS.')}</p><div class="grid">${cards}</div></section>
<section id="desktops" data-explorer><h2>${t('Desktop-Umgebungen und Window Manager','Desktop environments and window managers')}</h2>
<p class="lead">${t('Ein Desktop bündelt Fensterverwaltung, Einstellungen und weitere Programme. Ein einzelner WM oder Wayland-Compositor verwaltet primär Fenster und Anzeige. Andere Teile kannst du separat ergänzen. Die Sitzungsfilter schließen ältere und experimentelle Angebote ein. Beachte den Hinweis im jeweiligen Profil.','A desktop environment combines window management, settings and other applications. A standalone window manager or Wayland compositor mainly handles windows and display, with other components added separately. Session filters include older and experimental offerings. Check the notes in each profile.')}</p>
<form data-filters class="panel" hidden><div class="form-grid">${filterFields.map(([name,label,keys])=>select(name,label,[['',t('Alle','Any')],...keys.map(key=>[key,words[lang][key]])])).join('')}</div><button type="reset">${t('Filter zurücksetzen','Reset filters')}</button></form><p class="filter-count" data-filter-count aria-live="polite"></p><div class="grid">${desktopCards}</div></section>
<section id="builder"><h2>${t('WM-Konfigurator für den ersten Login','Window manager starter config builder')}</h2>
<p class="lead">${t('Wähle die Distribution, den Window Manager und deine Programme. Du erhältst einen Paketplan, die Tastenkürzel und passende Dateien zum Speichern. Die Auswahl bleibt im Browser.','Choose a distribution, window manager and applications. Get a package plan, shortcuts and the configuration files you can save locally. Your selections stay in the browser.')}</p>
<noscript><p>${t('Die Dateierzeugung benötigt JavaScript. Die Hinweise zum ersten Login stehen weiter unten.','File generation needs JavaScript. First-login instructions are available below.')}</p></noscript>
<form class="panel" data-builder hidden>
<div class="form-grid">
${select('distro',t('Distribution','Distribution'),distros.map(d=>[d.id,d.name]),'debian')}
${select('wm','Window Manager',desktops.filter(d=>!d.environment).map(d=>[d.id,d.name]),'xmonad')}
${select('browser','Browser',[['firefox','Firefox'],['chrome','Google Chrome'],['chromium','Chromium']],'firefox')}
${select('terminal','Terminal',[['classic',t('Klassisch (xterm oder foot)','Classic (xterm or foot)')],['kitty','Kitty'],['alacritty','Alacritty']],'kitty')}
${select('mod',t('Modifikatortaste','Modifier key'),[['super','Super / Windows'],['alt','Alt']],'super')}
</div>
<details data-advanced><summary>${t('Tastenkürzel anpassen','Customize shortcuts')}</summary>
<p>${t('Zahlen und reservierte Tasten sind bereits für Navigation, Arbeitsflächen oder Systemfunktionen belegt.','Numbers and reserved keys are assigned to navigation, workspaces or system functions.')}</p><div class="form-grid" data-keys></div></details>
<details><summary>${t('Design anpassen','Customize appearance')}</summary>
<p>${t('Welche Einstellungen verfügbar sind, hängt vom Window Manager ab. Installiere eine gewählte Schrift bei Bedarf separat.','Available settings depend on the window manager. Install the selected font separately if needed.')}</p>
<div class="form-grid" data-design></div><label class="check"><input type="checkbox" name="wallpaper"> ${t('Hintergrundbild einrichten','Set up wallpaper')}</label></details>
<p tabindex="-1" role="alert" data-build-error></p><button class="primary" type="submit">${t('Konfiguration erstellen','Generate configuration')}</button></form>
<div class="panel" data-build-output hidden></div>
<details class="egg"><summary><img src="${assets}/itsfine.webp" width="1535" height="1024" loading="lazy" alt=""> ${t('Ach, übrigens…','By the way…')}</summary><div>
<h3>${t('EXTREMER LINUX-MODUS FREIGESCHALTET','EXTREME LINUX MODE UNLOCKED')}</h3><p><strong>Gentoo + ratpoison + NVIDIA + Steam</strong></p>
<p><em>${t('Empfohlen für Leute, die ihren Desktop zur Entspannung am Wochenende kompilieren.','Recommended for people who consider compiling their desktop a relaxing weekend activity.')}</em></p>
<p><strong>„Weil’s geht!“</strong></p><p>${attr(assets+'/itsfine.webp',t('Bild in voller Größe ansehen','View the full image'))}</p><p>${t('Eine absichtlich anspruchsvolle Kombination. Prüfe X11-Sitzung, Treiber, 32-Bit-Bibliotheken und Steam separat. Das Quiz wertet sie nicht aus.','An intentionally challenging novelty combination. Check the X11 session, driver, 32-bit libraries and Steam separately. It has no effect on quiz results.')}</p>
<p>${attr('https://wiki.archlinux.org/title/Ratpoison',t('Herausforderung angenommen? Über ratpoison','Challenge accepted? About ratpoison'))}</p></div></details></section>
<section id="updates"><h2>${t('Linux-Updates verstehen','Understand Linux updates')}</h2>
<p class="lead">${t('Ein Paketupdate pflegt die installierte Version. Ein Release-Wechsel folgt eigenen Hinweisen und kann Paketquellen ändern. Firmware für Geräte kommt gegebenenfalls über fwupd oder den Hersteller. Flatpak-Apps und Laufzeiten aktualisierst du separat mit flatpak update.','Package updates maintain the installed release. A release upgrade follows its own instructions and can change repositories. Device firmware may come through fwupd or the vendor. Use flatpak update separately for Flatpak apps and runtimes.')}</p>
<ul class="update-links">${distros.map(d=>`<li>${attr('#update-'+d.id,d.name)}</li>`).join('')}</ul><div class="updates">${updateCards}</div></section>
${reference[lang].map(([id,title,html])=>`<section id="${id}"><h2>${e(title)}</h2>${html}</section>`).join('\n')}
<section><h2>${t('Weiterlesen','Read more')}</h2><p class="inline-links">${attr(routes.article[lang],articles[lang].title)}${attr('/linux-migration-companion/','Linux Migration Companion')}</p></section>
<section id="credits"><h2>${t('Bildnachweise','Screenshot credits')}</h2><ul>${credits}
<li>It’s Fine · ${t('von Dennis Hilk bereitgestelltes, bearbeitetes Motiv','edited artwork supplied by Dennis Hilk')}.</li></ul></section>`;
 write(routes.tool[lang],shell('tool',title,description,tool));

 const article=articles[lang];
 const story=`<header class="hero"><div><p class="kicker">Linux · 2026</p><h1>${e(article.title)}</h1><p>${e(article.intro)}</p><p>${attr('/about/','Dennis Hilk')} · <time datetime="${date}">${t('12. November 2026','12 November 2026')}</time></p></div>${figure('arch',true)}</header>
<nav class="section-nav" aria-label="${t('In diesem Artikel','In this article')}">${article.sections.map(([id,label])=>attr('#'+id,label)).join('')}</nav>
<article class="article-copy">${article.sections.map(([id,title,html])=>`<section id="${id}"><h2>${e(title)}</h2>${html}</section>`).join('\n')}
<section><h2>${t('Quellen und Bilder','Sources and images')}</h2><ul>
${['mint','debian','fedora','arch','gentoo','nixos','opensuse'].map(id=>distros.find(d=>d.id===id)).map(d=>`<li>${attr(d.docs,d.name+' · '+t('Dokumentation','documentation'))}</li>`).join('')}
<li>${attr(screens.arch.source,t('Bild: Dennis Hilk, Cthulhu mit Arch und dwm','Image: Dennis Hilk, Cthulhu with Arch and dwm'))}</li>
</ul><p>${attr(routes.tool[lang],t('Zum Linux Distro Finder','Open the Linux Distro Finder'))}</p></section></article>`;
 write(routes.article[lang],shell('article',article.title,article.description,story));
}

for (const lang of ['en','de']) build(lang);
