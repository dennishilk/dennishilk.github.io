// Only the two unlisted Snakkie pages. No navigation/RSS/sitemap changes.
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const words=JSON.parse(readFileSync(new URL('assets/snakkie/knowledge/platt-words.json',root))).entries;
const first=[...words].sort((a,b)=>a.id.localeCompare(b.id))[0];
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
for(const lang of ['en','de']){
 const de=lang==='de',t=(en,german)=>de?german:en,route=`${de?'/de':''}/snakkie/`;
 const title=t('Snakkie — Your friendly companion from East Frisia','Snakkie — Dein freundlicher Begleiter aus Ostfriesland');
 const description=t('Meet Nebby’s cousin Snakkie: East Frisian stories, dry humour, checked Platt examples and the Wiesmoor weather report. A small curated knowledge companion.','Lerne Nebbys Cousin Snakkie kennen: Ostfriesland, trockener Humor, belegte Platt-Beispiele und der Wiesmoor-Wetterbericht. Ein kleiner wissensbasierter Begleiter.');
 const html=`<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,follow">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="https://www.dennishilk.com${route}">
<link rel="alternate" hreflang="en" href="https://www.dennishilk.com/snakkie/">
<link rel="alternate" hreflang="de" href="https://www.dennishilk.com/de/snakkie/">
<link rel="alternate" hreflang="x-default" href="https://www.dennishilk.com/snakkie/">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="https://www.dennishilk.com${route}">
<meta property="og:image" content="https://www.dennishilk.com/assets/snakkie/snakkie-captain-768.webp">
<meta property="og:image:alt" content="${t('Snakkie, Nebby’s penguin cousin in a striped shirt and captain’s hat.','Snakkie, Nebbys Pinguin-Cousin im Streifenhemd mit Kapitänsmütze.')}">
<meta name="twitter:card" content="summary">
<link rel="icon" href="/favicon.png">
<link rel="stylesheet" href="/assets/snakkie/snakkie.css?v=3">
<link rel="stylesheet" href="/assets/css/language-toggle.css?v=20261006">
<script defer src="/assets/js/language-toggle.js?v=20261006"></script>
<script type="module" src="/assets/snakkie/ui.mjs?v=3"></script>
</head>
<body>
<a class="skip" href="#main">${t('Skip to content','Zum Inhalt springen')}</a>
<div class="page">
<nav class="topnav" aria-label="${t('Page navigation','Seitennavigation')}"><a class="brand" href="${de?'/de/':'/'}"><span aria-hidden="true">~/</span> DENNIS HILK</a><div class="nav-end"><span class="preview-tag">${t('A quiet little test harbour','Unser kleiner Testhafen')}</span><span class="lang-switch"><a href="${de?'/snakkie/':'/de/snakkie/'}" hreflang="${de?'en':'de'}" lang="${de?'en':'de'}">${de?'EN':'DE'}</a></span></div></nav>
<main id="main" tabindex="-1">
<header class="hero">
<div class="hero-copy"><p class="eyebrow">⚓ WIESMOOR · OSTFRIESLAND</p><h1>Snakkie<span>.</span></h1><p class="tagline">Your friendly companion from East Frisia.</p><p class="intro"><strong lang="nds">Moin! Ik bün Snakkie.</strong> ${t('A little local knowledge. A dry joke. And time for a proper chat. Pull up a chair!','Ein bisschen Heimatwissen. Ein trockener Spruch. Und Zeit zum Schnacken. Setz dich dazu!')}</p></div>
<figure class="mascot"><img src="/assets/snakkie/snakkie-captain-480.webp" width="480" height="480" fetchpriority="high" alt="${t('Snakkie, the navy-blue penguin with a white captain’s hat and blue-and-white striped shirt.','Snakkie, der dunkelblaue Pinguin mit weißer Kapitänsmütze und blau-weiß gestreiftem Hemd.')}"><figcaption>↳ ${t('Nebby’s cousin from East Frisia.','Nebbys Cousin aus Ostfriesland.')}</figcaption></figure>
</header>
<section id="chat" class="chat panel" aria-labelledby="chat-title">
<div class="chat-heading"><h2 id="chat-title">${t('Let’s have a chat.','Lass uns schnacken.')}</h2><label class="reply-picker">${t('Replies','Antworten')} <select id="reply-language" aria-label="${t('Reply language','Antwortsprache')}"><option value="${lang}">${de?'Deutsch':'English'}</option><option value="${de?'en':'de'}">${de?'English':'Deutsch'}</option></select></label></div>
<p id="chat-disclosure" class="disclosure">${t('Curated knowledge & humour · no generative language model','Gepflegtes Wissen & Humor · kein generatives Sprachmodell')}</p>
<div class="chat-messages" id="chat-messages" role="log" aria-live="polite" aria-relevant="additions" aria-label="${t('Conversation with Snakkie','Unterhaltung mit Snakkie')}" tabindex="0"><article class="message welcome"><img src="/assets/snakkie/snakkie-avatar.webp" width="40" height="40" alt=""><div><p class="message-author">Snakkie</p><p class="message-body">${t('Moin! I know a little about my home, a few Platt words and a hundred jokes. Ask away — if it isn’t in my little knowledge book, I’ll say so.','Moin! Ich kenne ein bisschen Heimat, ein paar Platt-Wörter und hundert Witze. Frag los — wenn etwas nicht in meinem kleinen Wissensbuch steht, sage ich das.')}</p></div></article></div>
<button id="latest-message" type="button" class="latest-message" hidden>${t('Latest message ↓','Neueste Nachricht ↓')}</button>
<div class="suggestions" aria-label="${t('Conversation starters','Gesprächseinstiege')}" hidden>${[['Tell me a joke','Erzähl einen Witz'],['What does Moin mean?','Was heißt Moin?'],['Weather in Wiesmoor','Wetter in Wiesmoor'],['Who is Nebby?','Wer ist Nebby?']].map(([en,german])=>`<button type="button" class="suggestion" data-question="${esc(t(en,german))}">${t(en,german)}</button>`).join('')}</div>
<form id="chat-form" aria-describedby="chat-disclosure composer-note"><label class="sr-only" for="chat-input">${t('Message to Snakkie','Nachricht an Snakkie')}</label><div class="composer"><textarea id="chat-input" rows="1" maxlength="800" placeholder="${t('Ask Snakkie …','Frag Snakkie …')}" disabled></textarea><button id="send" class="button primary" type="submit" disabled>${t('Send','Senden')} ↑</button></div><div class="composer-footer"><small id="composer-note">${t('Enter to send · Shift+Enter for a new line','Enter sendet · Shift+Enter für eine neue Zeile')}</small><button class="text-button" id="reset-chat" type="button" disabled>${t('New conversation','Neues Gespräch')}</button></div></form>
<p id="chat-status" class="sr-only" role="status"></p>
<noscript><p class="no-js">${t('The chat needs JavaScript. You can still read the word example below.','Der Chat benötigt JavaScript. Das Wortbeispiel darunter bleibt lesbar.')}</p></noscript>
</section>
<section id="platt" class="platt panel" aria-labelledby="platt-title"><div class="platt-intro"><p class="eyebrow">${t('A little language from home','Ein Stück Sprache von hier')}</p><h2 id="platt-title">Platt van Dag<span>.</span></h2><p>${t('A small word. A little closer.','Ein kleines Wort. Ein Stück näher dran.')}</p><p class="sample-label" id="daily-note">${t('2 dictionary-checked words · daily rotation','2 belegte Wörter · täglicher Wechsel')}</p><div class="word-controls" hidden><button id="previous-word" type="button" aria-label="${t('Previous word','Vorheriges Wort')}">←</button><span id="word-count">1 / ${words.length}</span><button id="next-word" type="button" aria-label="${t('Next word','Nächstes Wort')}">→</button></div></div><div id="word-content" aria-live="polite" aria-atomic="true"><h3 id="word" lang="nds">${first.word}</h3><dl class="word-translations"><div><dt>DE</dt><dd id="word-de">${first.de}</dd></div><div><dt>EN</dt><dd id="word-en">${first.en}</dd></div></dl><blockquote><p id="word-example" lang="nds">${first.example}</p><p id="word-example-translation">${de?first.exampleDe:first.exampleEn}</p></blockquote><p class="word-note" id="word-note">${de?first.noteDe:first.noteEn}</p><a class="word-source" id="word-source" href="${first.source}" rel="noreferrer">${first.sourceLabel} ↗</a></div></section>
<details class="about"><summary>${t('A little more about Snakkie','Noch ein bisschen über Snakkie')}</summary><p>${t('Nebby explores in an astronaut’s helmet. His cousin Snakkie stays closer to East Frisia, in a captain’s hat. Same family, different journeys.','Nebby ist mit Astronautenhelm unterwegs. Sein Cousin Snakkie bleibt näher an Ostfriesland, mit Kapitänsmütze. Dieselbe Familie, unterschiedliche Reisepläne.')}</p><p>${t('My answers come from a local collection with term matching, not a generative AI. Weather is read from the existing World Observer, with timestamps and freshness checks. Chat text stays in this tab; it is not stored on the server.','Meine Antworten kommen aus einer lokalen Sammlung mit Begriffssuche, nicht aus generativer KI. Wetter lese ich beim vorhandenen World Observer, mit Zeitangaben und Altersprüfung. Chattexte bleiben in diesem Tab und werden nicht auf dem Server gespeichert.')}</p><p>${t('The Platt examples are attested in the dictionary for East Frisia. Specific Wiesmoor usage still needs local speaker review. Audio and a larger regional collection will follow later.','Die Platt-Beispiele sind im Wörterbuch für Ostfriesland belegt. Der genaue Gebrauch in Wiesmoor wartet noch auf die Prüfung durch lokale Sprecher. Audio und eine größere regionale Sammlung folgen später.')}</p></details>
</main><footer><a class="brand" href="${de?'/de/':'/'}">DENNIS HILK</a><p>Snakkie · ${t('A little piece of East Frisia.','Ein kleines Stück Ostfriesland.')}</p><div><a href="/impressum.html">${t('Legal notice','Impressum')}</a><a href="/datenschutzerklaerung.html">${t('Privacy','Datenschutz')}</a></div></footer></div>
</body></html>
`;
 const out=new URL('.'+route,root);mkdirSync(out,{recursive:true});writeFileSync(new URL('index.html',out),html);console.log(`Snakkie: ${route}`);
}
