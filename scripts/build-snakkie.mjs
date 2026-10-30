// Standalone static pages: follows the site's English root / German /de routes.
// Never adds navigation, RSS entries, project cards or sitemap entries.
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { words } from '../assets/snakkie/words.mjs';

const root = new URL('../', import.meta.url);
const esc = text => String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
for (const lang of ['en', 'de']) {
  const de = lang === 'de';
  const t = (en, german) => de ? german : en;
  const route = `${de ? '/de' : ''}/snakkie/`;
  const title = t('Snakkie — Your friendly AI from East Frisia | Preview', 'Snakkie — Dein KI-Begleiter aus Ostfriesland | Vorschau');
  const description = t('Meet Snakkie: Nebby in a captain’s hat. A first look at a friendly East Frisian companion, with a chat interface preview and curated Low German words.', 'Lerne Snakkie kennen: Nebby mit Kapitänsmütze. Ein erster Blick auf den ostfriesischen Begleiter mit Chatvorschau und kuratierten plattdeutschen Wörtern.');
  const first = words[0];
  const html = `<!doctype html>
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
  <meta property="og:image:alt" content="${t('Snakkie, our navy-blue penguin in a striped shirt and captain’s hat.', 'Snakkie, unser dunkelblauer Pinguin mit Streifenhemd und Kapitänsmütze.')}">
  <meta name="twitter:card" content="summary">
  <link rel="icon" href="/favicon.png">
  <link rel="stylesheet" href="/assets/snakkie/snakkie.css?v=1">
  <link rel="stylesheet" href="/assets/css/language-toggle.css?v=20261006">
  <script defer src="/assets/js/language-toggle.js?v=20261006"></script>
  <script type="module" src="/assets/snakkie/ui.mjs?v=1"></script>
</head>
<body>
  <a class="skip" href="#main">${t('Skip to content', 'Zum Inhalt springen')}</a>
  <div class="page">
    <nav class="topnav" aria-label="${t('Page navigation', 'Seitennavigation')}">
      <a class="brand" href="${de ? '/de/' : '/'}"><span class="prompt" aria-hidden="true">~/</span> DENNIS HILK</a>
      <div class="nav-end"><span class="preview-tag">${t('A first hello', 'Ein erstes Moin')}</span><span class="lang-switch"><a href="${de ? '/snakkie/' : '/de/snakkie/'}" hreflang="${de ? 'en' : 'de'}" lang="${de ? 'en' : 'de'}">${de ? 'EN' : 'DE'}</a></span></div>
    </nav>
    <main id="main" tabindex="-1">
      <header class="hero">
        <div class="hero-copy">
          <p class="eyebrow"><span aria-hidden="true">⚓</span> WIESMOOR · OSTFRIESLAND</p>
          <h1>Snakkie<span class="title-dot">.</span></h1>
          <p class="tagline">Your friendly AI<br>from East Frisia.</p>
          <p class="greeting" lang="nds">Moin! Ik bün Snakkie.</p>
          <p class="intro">${t('A curious companion from East Frisia. Here to help, share a little local culture and, eventually, have a proper chat. With a dry sense of humour, naturally.', 'Ein neugieriger Begleiter aus Ostfriesland. Zum Fragenbeantworten, Kulturentdecken und irgendwann auch zum richtigen Snacken. Mit einer ordentlichen Portion trockenem Humor, versteht sich.')}</p>
          <div class="hero-actions"><a class="button primary" href="#chat">${t('Meet Snakkie', 'Snakkie kennenlernen')} <span aria-hidden="true">↗</span></a><a class="quiet-link" href="#platt">Platt van Dag <span aria-hidden="true">↓</span></a></div>
          <p class="hero-note">${t('Design preview · Real AI is still on the horizon.', 'Designvorschau · Die echte KI ist noch am Horizont.')}</p>
        </div>
        <figure class="mascot">
          <div class="mascot-orbit" aria-hidden="true"></div>
          <img src="/assets/snakkie/snakkie-captain-768.webp" srcset="/assets/snakkie/snakkie-captain-480.webp 480w, /assets/snakkie/snakkie-captain-768.webp 768w" sizes="(max-width: 700px) 88vw, 46vw" width="768" height="768" fetchpriority="high" alt="${t('Snakkie: the familiar navy-blue Nebby penguin, waving in a blue-and-white striped shirt and a white captain’s hat with a gold anchor.', 'Snakkie: der vertraute dunkelblaue Nebby-Pinguin winkt im blau-weiß gestreiften Hemd mit weißer Kapitänsmütze und goldenem Anker.')}">
          <figcaption><span aria-hidden="true">↳</span> Nebby becomes Snakkie!</figcaption>
        </figure>
      </header>

      <section class="hello-strip" aria-label="${t('Snakkie’s personality', 'Snakkies Persönlichkeit')}">
        <p>${t('Rooted here.<br><strong>Curious about everywhere.</strong>', 'Hier verwurzelt.<br><strong>Neugierig auf die ganze Welt.</strong>')}</p>
        <p>${t('Helpful by nature. A little cheeky by choice. German and English are planned, alongside carefully checked East Frisian Platt. Good answers come first. The odd joke can come along.', 'Von Natur aus hilfsbereit. Aus Überzeugung ein bisschen frech. Geplant sind Deutsch, Englisch und sorgfältig geprüftes ostfriesisches Platt. Gute Antworten stehen zuerst. Ein kleiner Spruch darf mit an Bord.')}</p>
      </section>

      <div class="preview-grid">
        <section id="chat" class="chat panel" aria-labelledby="chat-title">
          <div class="panel-heading"><div><p class="eyebrow">${t('01 / A place to chat', '01 / Platz zum Snacken')}</p><h2 id="chat-title">${t('Pull up a chair.', 'Setz dich dazu.')}</h2></div><span class="status-badge">${t('Interface preview', 'Oberflächenvorschau')}</span></div>
          <p class="preview-disclosure" id="preview-disclosure">${t('No AI model is connected. You can try the layout: your text stays on this page and receives no AI answer.', 'Hier ist noch kein KI-Modell verbunden. Du kannst die Oberfläche ausprobieren: Dein Text bleibt auf dieser Seite und erhält keine KI-Antwort.')}</p>
          <div class="chat-messages" id="chat-messages" role="log" aria-live="polite" aria-relevant="additions" aria-label="${t('Preview conversation', 'Vorschau-Unterhaltung')}" tabindex="0">
            <article class="message welcome">
              <img src="/assets/snakkie/snakkie-avatar.webp" width="48" height="48" alt="">
              <div><p class="message-author">Snakkie <span>· ${t('written welcome', 'geschriebene Begrüßung')}</span></p><p>${t('Moin! I’m Snakkie. My captain’s hat is ready; my AI is still being built. One day I’d like to help in English, German and East Frisian Platt. For now, come and have a look around!', 'Moin! Ich bin Snakkie. Die Mütze sitzt, an meiner KI wird noch gebaut. Später möchte ich dir auf Deutsch, Englisch und ostfriesischem Platt helfen. Fürs Erste: Schau dich in Ruhe um!')}</p></div>
            </article>
          </div>
          <form id="chat-form" aria-describedby="preview-disclosure composer-note">
            <div class="chat-options"><label for="reply-language">${t('Future reply language', 'Spätere Antwortsprache')}</label><select id="reply-language" disabled><option value="${lang}">${de ? 'Deutsch' : 'English'}</option><option value="${de ? 'en' : 'de'}">${de ? 'English' : 'Deutsch'}</option><option value="nds">${t('East Frisian Platt (planned)', 'Ostfriesisches Platt (geplant)')}</option></select></div>
            <p class="translation-plan" id="translation-plan" hidden>${t('Planned: show an English translation alongside Platt replies.', 'Geplant: deutsche Übersetzung zu plattdeutschen Antworten einblenden.')}</p>
            <label class="sr-only" for="chat-input">${t('Preview message (maximum 500 characters)', 'Vorschaunachricht (höchstens 500 Zeichen)')}</label>
            <div class="composer"><textarea id="chat-input" rows="2" maxlength="500" placeholder="${t('Try a message — only on this page…', 'Probier eine Nachricht – nur auf dieser Seite …')}" disabled></textarea><button class="button primary" id="send" type="submit" disabled>${t('Try', 'Testen')} <span aria-hidden="true">↑</span></button></div>
            <div class="composer-footer"><small id="composer-note">${t('Local preview · nothing is sent or saved', 'Lokale Vorschau · nichts wird versendet oder gespeichert')}</small><button id="reset-chat" type="button" class="text-button" disabled>${t('Clear', 'Leeren')}</button></div>
          </form>
          <noscript><p class="no-js">${t('The preview controls need JavaScript. This welcome and the word example remain readable.', 'Die Vorschau-Bedienung benötigt JavaScript. Begrüßung und Wortbeispiel bleiben lesbar.')}</p></noscript>
        </section>

        <section id="platt" class="platt panel" aria-labelledby="platt-title">
          <div class="panel-heading"><div><p class="eyebrow">${t('02 / A little local language', '02 / Ein Stück Sprache von hier')}</p><h2 id="platt-title">Platt van Dag<span class="title-dot">.</span></h2></div><span class="word-icon" aria-hidden="true">Aa</span></div>
          <p class="word-intro">${t('A small word. A little closer to home.', 'Ein kleines Wort. Ein Stück näher dran.')}</p>
          <p class="sample-label">${t('Curated examples · no daily rotation yet', 'Kuratierte Beispiele · noch kein täglicher Wechsel')}</p>
          <div id="word-content" aria-live="polite" aria-atomic="true">
            <h3 id="word" lang="nds">${first.word}</h3>
            <dl class="word-translations"><div><dt>DE</dt><dd id="word-de">${first.de}</dd></div><div><dt>EN</dt><dd id="word-en">${first.en}</dd></div></dl>
            <blockquote><p id="word-example" lang="nds">${first.example}</p><p id="word-example-translation">${de ? first.exampleDe : first.exampleEn}</p></blockquote>
            <p class="word-note" id="word-note">${de ? first.noteDe : first.noteEn}</p>
            <a id="word-source" class="word-source" href="${first.source}" rel="noreferrer">${first.sourceLabel} <span aria-hidden="true">↗</span></a>
          </div>
          <div class="word-controls" hidden><button id="previous-word" type="button" aria-label="${t('Previous word example', 'Vorheriges Wortbeispiel')}">←</button><span id="word-count">1 / ${words.length}</span><button id="next-word" type="button" aria-label="${t('Next word example', 'Nächstes Wortbeispiel')}">→</button></div>
          <p class="audio-note">${t('Pronunciation audio will follow after local review.', 'Aussprache-Audio folgt nach regionaler Prüfung.')}</p>
        </section>
      </div>

      <section class="story" aria-labelledby="story-title">
        <div class="story-copy"><p class="eyebrow">03 / NEBBY BECOMES SNAKKIE</p><h2 id="story-title">${t('Same curious soul.<br>A different hat.', 'Dieselbe Neugier.<br>Eine andere Mütze.')}</h2><p>${t('You may already know Nebby, our little explorer in an astronaut’s helmet. Now he’s coming home to East Frisia: familiar face, striped shirt, captain’s hat. And a new role as a friendly digital companion.', 'Vielleicht kennst du Nebby schon, unseren kleinen Entdecker mit Astronautenhelm. Jetzt kommt er nach Ostfriesland: vertrautes Gesicht, Streifenhemd, Kapitänsmütze. Und eine neue Rolle als freundlicher digitaler Begleiter.')}</p></div>
        <div class="story-note"><span aria-hidden="true">⚓</span><p>${t('“First, make yourself at home.<br>The clever part is coming.”', '„Erst mal ankommen.<br>Das mit dem Schlausein kommt noch.“')}</p><small>Snakkie · ${t('an authored line, not an AI response', 'ein geschriebener Spruch, keine KI-Antwort')}</small></div>
      </section>
      <details class="horizon"><summary>${t('What’s on the horizon?', 'Was kommt als Nächstes?')}</summary><p>${t('A genuinely helpful AI, carefully checked regional language, optional translations and a curated daily word. The inference engine is still an open decision. This version has no model downloads, external AI services or subscriptions.', 'Eine wirklich hilfreiche KI, sorgfältig geprüftes regionales Platt, optionale Übersetzungen und ein kuratiertes Wort des Tages. Die KI-Engine ist noch offen. Diese Version nutzt keine Modell-Downloads, externen KI-Dienste oder Abonnements.')}</p></details>
    </main>
    <footer><a class="brand" href="${de ? '/de/' : '/'}">DENNIS HILK</a><p>Snakkie · ${t('Made with curiosity in East Frisia.', 'Mit Neugier in Ostfriesland gemacht.')}</p><div><a href="/impressum.html">${t('Legal notice', 'Impressum')}</a><a href="/datenschutzerklaerung.html">${t('Privacy', 'Datenschutz')}</a></div></footer>
  </div>
</body>
</html>
`;
  const output = new URL(`.${route}`, root);
  mkdirSync(output, { recursive: true });
  writeFileSync(new URL('index.html', output), html);
  console.log(`Snakkie: ${fileURLToPath(new URL('index.html', output))}`);
}
