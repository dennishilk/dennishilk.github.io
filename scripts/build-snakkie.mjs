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
  const description = t('Meet Snakkie, Nebby’s cousin from East Frisia: a penguin in a captain’s hat, with an experimental local AI chat and curated Low German words.', 'Lerne Snakkie kennen, Nebbys Cousin aus Ostfriesland: ein Pinguin mit Kapitänsmütze, experimentellem lokalem KI-Chat und kuratierten plattdeutschen Wörtern.');
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
  <link rel="stylesheet" href="/assets/snakkie/snakkie.css?v=2">
  <link rel="stylesheet" href="/assets/css/language-toggle.css?v=20261006">
  <script defer src="/assets/js/language-toggle.js?v=20261006"></script>
  <script type="module" src="/assets/snakkie/ui.mjs?v=2"></script>
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
          <p class="hero-note">${t('Local AI experiment · You decide when to start.', 'Lokales KI-Experiment · Du entscheidest, wann es losgeht.')}</p>
        </div>
        <figure class="mascot">
          <div class="mascot-orbit" aria-hidden="true"></div>
          <img src="/assets/snakkie/snakkie-captain-768.webp" srcset="/assets/snakkie/snakkie-captain-480.webp 480w, /assets/snakkie/snakkie-captain-768.webp 768w" sizes="(max-width: 700px) 88vw, 46vw" width="768" height="768" fetchpriority="high" alt="${t('Snakkie, Nebby’s navy-blue penguin cousin, waving in a blue-and-white striped shirt and a white captain’s hat with a gold anchor.', 'Snakkie, Nebbys dunkelblauer Pinguin-Cousin, winkt im blau-weiß gestreiften Hemd mit weißer Kapitänsmütze und goldenem Anker.')}">
          <figcaption><span aria-hidden="true">↳</span> ${t('Nebby’s cousin from East Frisia.', 'Nebbys Cousin aus Ostfriesland.')}</figcaption>
        </figure>
      </header>

      <section class="hello-strip" aria-label="${t('Snakkie’s personality', 'Snakkies Persönlichkeit')}">
        <p>${t('Rooted here.<br><strong>Curious about everywhere.</strong>', 'Hier verwurzelt.<br><strong>Neugierig auf die ganze Welt.</strong>')}</p>
        <p>${t('Helpful by nature. A little cheeky by choice. Try German or English; carefully checked East Frisian Platt is planned. Good answers come first. The odd joke can come along.', 'Von Natur aus hilfsbereit. Aus Überzeugung ein bisschen frech. Probiere Deutsch oder Englisch aus; sorgfältig geprüftes ostfriesisches Platt folgt später. Gute Antworten stehen zuerst. Ein kleiner Spruch darf mit an Bord.')}</p>
      </section>

      <div class="preview-grid">
        <section id="chat" class="chat panel" aria-labelledby="chat-title">
          <div class="panel-heading"><div><p class="eyebrow">${t('01 / A place to chat', '01 / Platz zum Snacken')}</p><h2 id="chat-title">${t('Pull up a chair.', 'Setz dich dazu.')}</h2></div><span class="status-badge" id="model-badge">${t('Model not loaded', 'Modell nicht geladen')}</span></div>
          <p class="preview-disclosure" id="preview-disclosure">${t('A real small language model, running on your device. No chat text goes to an AI service. Experimental: answers can be wrong; authentic Platt is not supported yet.', 'Ein echtes kleines Sprachmodell auf deinem Gerät. Kein Chattext geht an einen KI-Dienst. Experimentell: Antworten können falsch sein; authentisches Platt wird noch nicht unterstützt.')}</p>
          <div class="model-setup">
            <div class="model-settings"><label for="model-select">${t('Language model', 'Sprachmodell')}<select id="model-select" aria-label="${t('Language model', 'Sprachmodell')}"><option value="qwen17">Qwen3 1.7B · ${de ? "1,11" : "1.11"} GB</option><option value="qwen3">Qwen3 0.6B · 397 MB · ${t("weaker answers", "schwächere Antworten")}</option></select></label><label for="backend-select">${t('Run on', 'Berechnung')}<select id="backend-select" aria-label="${t('Run on', 'Berechnung')}"><option value="auto">${t('Automatic · GPU / CPU', 'Automatisch · GPU / CPU')}</option><option value="cpu">CPU · WebAssembly</option><option value="webgpu">WebGPU · ${t('experimental', 'experimentell')}</option></select></label></div>
            <div class="start-row"><button id="start-model" type="button" class="button primary" disabled>${t('Start Snakkie', 'Snakkie starten')} <span aria-hidden="true">↗</span></button><button id="cancel-load" type="button" class="button stop-button" hidden>${t('Cancel loading', 'Laden abbrechen')}</button><p id="download-note">${t('First start: about 1.11 GB for the model + 9 MB runtime from this website. No automatic download.', 'Erster Start: etwa 1,11 GB Modell + 9 MB Laufzeitdateien von dieser Website. Kein automatischer Download.')}</p></div>
            <p id="model-status" role="status">${t('Not loaded. Start when you are ready.', 'Noch nicht geladen. Starte, wenn du bereit bist.')}</p>
            <progress id="model-progress" max="100" value="0" aria-label="${t('Model download progress', 'Fortschritt des Modell-Downloads')}" hidden></progress>
            <p id="model-error" role="alert" hidden></p>
            <div class="model-tools"><button id="unload-model" class="text-button" type="button" disabled>${t('Unload model', 'Modell entladen')}</button><button id="clear-cache" class="text-button" type="button" disabled>${t('Delete model cache', 'Modellcache löschen')}</button><span id="cache-note">${t('Model cache only; conversations are not saved.', 'Nur Modellcache; Gespräche werden nicht gespeichert.')}</span></div>
          </div>
          <div class="chat-messages" id="chat-messages" role="log" aria-live="off" aria-label="${t('Conversation with Snakkie', 'Unterhaltung mit Snakkie')}" tabindex="0">
            <article class="message welcome">
              <img src="/assets/snakkie/snakkie-avatar.webp" width="48" height="48" alt="">
              <div><p class="message-author">Snakkie <span>· ${t('written welcome', 'geschriebene Begrüßung')}</span></p><p>${t('Moin! I’m Snakkie. The captain’s hat fits; now let’s try the brain. Start my local model above, then ask me something in English or German. I’m still small and learning my manners — please check important answers.', 'Moin! Ich bin Snakkie. Die Mütze sitzt, jetzt probieren wir den Kopf dazu. Starte oben mein lokales Modell und frag mich etwas auf Deutsch oder Englisch. Ich bin noch klein und übe meine Manieren – prüfe wichtige Antworten bitte nach.')}</p></div>
            </article>
          </div>
          <button id="latest-message" class="latest-message" type="button" hidden>${t('Latest messages', 'Neueste Nachrichten')} ↓</button>
          <p id="chat-announcement" class="sr-only" role="status"></p>
          <form id="chat-form" aria-describedby="preview-disclosure composer-note keyboard-note">
            <div class="chat-options"><label for="reply-language">${t('Reply language', 'Antwortsprache')}</label><select id="reply-language" disabled><option value="${lang}">${de ? 'Deutsch' : 'English'}</option><option value="${de ? 'en' : 'de'}">${de ? 'English' : 'Deutsch'}</option><option value="nds" disabled>${t('East Frisian Platt (planned)', 'Ostfriesisches Platt (geplant)')}</option></select></div>
            <p class="translation-plan" id="translation-plan" hidden>${t('Planned: show an English translation alongside Platt replies.', 'Geplant: deutsche Übersetzung zu plattdeutschen Antworten einblenden.')}</p>
            <label class="sr-only" for="chat-input">${t('Message to Snakkie', 'Nachricht an Snakkie')}</label>
            <div class="composer"><textarea id="chat-input" rows="2" maxlength="800" aria-describedby="keyboard-note" placeholder="${t('Start the model above, then say moin…', 'Starte oben das Modell, dann sag Moin …')}" disabled></textarea><button class="button primary" id="send" type="submit" disabled>${t('Send', 'Senden')} <span aria-hidden="true">↑</span></button><button class="button stop-button" id="stop-model" type="button" hidden>${t('Stop', 'Stopp')} ■</button></div>
            <p id="keyboard-note" class="keyboard-note">${t('Enter to send · Shift+Enter for a new line', 'Enter zum Senden · Shift+Enter für eine neue Zeile')}</p>
            <div class="composer-footer"><small id="composer-note">${t('On this device · short context · no saved conversations', 'Auf diesem Gerät · begrenzter Kontext · kein gespeicherter Verlauf')}</small><button id="reset-chat" type="button" class="text-button" disabled>${t('New conversation', 'Neues Gespräch')}</button></div>
          </form>
          <noscript><p class="no-js">${t('The local chat needs JavaScript. This welcome and the word example remain readable.', 'Der lokale Chat benötigt JavaScript. Begrüßung und Wortbeispiel bleiben lesbar.')}</p></noscript>
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
        <div class="story-copy"><p class="eyebrow">03 / ${t('A FAMILY RESEMBLANCE', 'DIE FAMILIENÄHNLICHKEIT')}</p><h2 id="story-title">${t('Curiosity runs<br>in the family.', 'Die Neugier liegt<br>in der Familie.')}</h2><p>${t('You may already know Nebby, our little explorer in an astronaut’s helmet. Meet his cousin Snakkie: a striped shirt, a captain’s hat and a home in East Frisia. The family resemblance is unmistakable. So is the curiosity — with a little extra dry humour from the coast.', 'Vielleicht kennst du Nebby schon, unseren kleinen Entdecker mit Astronautenhelm. Das hier ist sein Cousin Snakkie: mit Streifenhemd, Kapitänsmütze und in Ostfriesland zu Hause. Die Familienähnlichkeit ist unverkennbar. Die Neugier auch – dazu kommt eine Extraportion trockener Humor von der Küste.')}</p></div>
        <div class="story-note"><span aria-hidden="true">⚓</span><p>${t('“First, make yourself at home.<br>The clever part is coming.”', '„Erst mal ankommen.<br>Das mit dem Schlausein kommt noch.“')}</p><small>Snakkie · ${t('an authored line, not an AI response', 'ein geschriebener Spruch, keine KI-Antwort')}</small></div>
      </section>
      <details class="horizon"><summary>${t('How does the local experiment work?', 'Wie funktioniert das lokale Experiment?')}</summary><p>${t('wllama runs a quantized Qwen model on your device in a worker. You choose when to download it from this website. Where supported, only model files are cached in origin-private browser storage; the browser can evict them. Without storage, loading is session-only. No chat history is stored or uploaded. Hardware support and answer quality vary; CPU mode can be slow. Only a small recent part of the conversation fits into memory. The experimental WebGPU path may fall back to CPU. A locally reviewed Platt mode and a daily word collection are future work.', 'wllama berechnet ein quantisiertes Qwen-Modell auf deinem Gerät in einem Worker. Du entscheidest, wann es von dieser Website geladen wird. Soweit unterstützt, werden nur Modelldateien im privaten Browserspeicher dieser Domain zwischengespeichert; der Browser darf sie entfernen. Ohne diesen Speicher gilt der Download nur für die Sitzung. Chatverläufe werden weder gespeichert noch hochgeladen. Hardwareunterstützung und Antwortqualität variieren; die CPU kann langsam sein. Nur ein kleiner jüngerer Gesprächsausschnitt passt in den Kontext. Der experimentelle WebGPU-Pfad kann auf die CPU zurückfallen. Regional geprüftes Platt und eine tägliche Wortsammlung folgen später.')}</p></details>
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
