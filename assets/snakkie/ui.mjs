import { words, wordAt } from './words.mjs';
import { LocalInference } from './inference.mjs?v=2';
import {models,limits,shouldSend} from './model-config.mjs?v=2';

const de = document.documentElement.lang === 'de';
const t = (en, german) => de ? german : en;
const $ = id => document.getElementById(id);
const form = $('chat-form'), input = $('chat-input'), log = $('chat-messages');
const send = $('send'), reset = $('reset-chat'), replyLanguage = $('reply-language');
const start = $('start-model'), stop = $('stop-model'), badge = $('model-badge');
const modelSelect = $('model-select'), backendSelect = $('backend-select'), progress = $('model-progress');
const ai = new LocalInference();
let busy = false, operation = '', abort, history = [], pinned = true, loadedBackend = '';

function updateControls() {
  document.querySelector('.model-setup').classList.toggle('model-ready',ai.ready);
  input.disabled = !ai.ready;
  send.disabled = !ai.ready || busy;
  reset.disabled = busy;
  replyLanguage.disabled = busy;
  modelSelect.disabled = busy || ai.ready; backendSelect.disabled = busy || ai.ready;
  start.disabled = busy || ai.ready;
  stop.hidden = !busy || operation !== 'generate';
  $('cancel-load').hidden = !busy || operation !== 'load';
  if (!busy) stop.disabled = false;
  $('unload-model').disabled = busy || !ai.ready;
  $('clear-cache').disabled = busy;
}
function setStatus(text) { $('model-status').textContent = text; }
function showError(error) {
  const messages = {
    ASSETS_NOT_PROVISIONED:t('The model files have not been provided on this test site yet. The rest of the page still works.', 'Die Modelldateien sind auf dieser Testseite noch nicht bereitgestellt. Der Rest der Seite bleibt benutzbar.'),
    WEBGPU_UNAVAILABLE:t('WebGPU is unavailable here. Select CPU or Automatic and try again.', 'WebGPU ist hier nicht verfügbar. Wähle CPU oder Automatisch und versuche es erneut.'),
    INPUT_TOO_LONG:t('Please shorten your message (maximum 800 UTF-8 bytes).', 'Bitte kürze deine Nachricht (höchstens 800 UTF-8-Bytes).'),
    MODEL_SIZE_MISMATCH:t('The model file is incomplete or has an unexpected size. Please clear the model cache and retry.', 'Die Modelldatei ist unvollständig oder hat eine unerwartete Größe. Bitte lösche den Modellcache und versuche es erneut.'),
    GENERATION_TIMEOUT:t('The answer took too long. The model was unloaded; you can start it again.', 'Die Antwort hat zu lange gedauert. Das Modell wurde entladen; du kannst es erneut starten.'),
    LOAD_TIMEOUT:t('Loading took too long. You can try again, or select CPU mode.', 'Das Laden hat zu lange gedauert. Versuche es erneut oder wähle den CPU-Modus.'),
  };
  const message = error.name === 'QuotaExceededError'
    ? t('Browser storage is full. Free some space or delete Snakkie’s model cache and retry.','Der Browserspeicher ist voll. Schaffe Platz oder lösche Snakkies Modellcache und versuche es erneut.')
    : messages[error.message] || t('The local model could not continue. It may need more memory or a different browser. Try CPU mode or a new conversation.', 'Das lokale Modell konnte nicht fortfahren. Möglicherweise fehlt Speicher oder Browserunterstützung. Versuche den CPU-Modus oder ein neues Gespräch.');
  $('model-error').textContent = message; $('model-error').hidden = false;
}
function clearError() { $('model-error').hidden = true; $('model-error').textContent = ''; }
function scrollIfPinned() { if (pinned) log.scrollTop = log.scrollHeight; }
log.addEventListener('scroll', () => {
  pinned = log.scrollHeight - log.scrollTop - log.clientHeight < 80;
  $('latest-message').hidden = pinned;
});
$('latest-message').addEventListener('click', () => { pinned = true; scrollIfPinned(); $('latest-message').hidden = true; });
function resizeInput() { input.style.height = 'auto'; input.style.height = Math.min(180,Math.max(70,input.scrollHeight))+'px'; }
input.addEventListener('input',resizeInput);
input.addEventListener('keydown', event => {
  if (shouldSend(event)) { event.preventDefault(); if (!busy && ai.ready) form.requestSubmit(); }
});
function updateDownloadNote() {
  const bytes = models[modelSelect.value].bytes;
  const size = bytes >= 1e9 ? new Intl.NumberFormat(de?'de-DE':'en-US',{maximumFractionDigits:2}).format(bytes/1e9)+' GB' : Math.round(bytes/1e6)+' MB';
  $('download-note').textContent = t(`First start: about ${size} model + 9 MB runtime from this website. No automatic download.`, `Erster Start: etwa ${size} Modell + 9 MB Laufzeitdateien von dieser Website. Kein automatischer Download.`);
}
modelSelect.addEventListener('change',updateDownloadNote);
start.addEventListener('click', async () => {
  if (busy || ai.ready) return;
  busy = true; operation = 'load'; clearError(); abort = new AbortController(); updateControls();
  badge.textContent = t('Loading model','Modell lädt');
  progress.hidden = false; progress.removeAttribute('value');
  const states = {
    checking:t('Checking local files…','Lokale Dateien werden geprüft …'),
    downloading:t('Downloading model…','Modell wird heruntergeladen …'),
    initializing:t('Initializing model…','Modell wird initialisiert …'),
    cached:t('Loading the cached model…','Modell aus dem Cache wird geladen …'),
    'cpu-fallback':t('GPU initialization failed. Trying CPU…','GPU-Initialisierung fehlgeschlagen. Versuche CPU …'),
  };
  try {
    const result = await ai.load({model:modelSelect.value,backend:backendSelect.value,signal:abort.signal,onStatus:status => {
      setStatus(states[status.state] || status.state);
      if (status.state === 'downloading' && status.total) {
        progress.value = Math.min(100,status.loaded/status.total*100);
        setStatus(`${states.downloading} ${Math.round(status.loaded/1000000)} / ${Math.round(status.total/1000000)} MB`);
      } else progress.removeAttribute('value');
      if (status.persistent === false) $('cache-note').textContent = t('Browser storage unavailable: this download lasts only for this session.','Browserspeicher nicht verfügbar: Dieser Download gilt nur für diese Sitzung.');
    }});
    loadedBackend = result.backend === 'webgpu' ? t('WebGPU requested','WebGPU angefordert') : 'CPU / WASM';
    document.querySelector('.model-setup').classList.add('model-ready');
    badge.textContent = t('Model ready','Modell bereit');
    setStatus(`${models[result.model].name} · ${loadedBackend} · ${result.fromCache ? t('from cache','aus dem Cache') : t('ready on this device','auf diesem Gerät bereit')}`);
    $('cache-note').textContent = result.persistent ? t('Model saved in this browser. The browser can remove it; conversations are not saved.','Modell in diesem Browser gespeichert. Der Browser darf es entfernen; Gespräche werden nicht gespeichert.') : t('Session only: the model will need to be downloaded again next time.','Nur diese Sitzung: Das Modell muss beim nächsten Mal erneut geladen werden.');
    input.placeholder = t('Moin Snakkie! Ask me something…','Moin Snakkie! Frag mich etwas …');
  } catch (error) {
    badge.textContent = t('Model unavailable','Modell nicht verfügbar');
    if (error.name === 'AbortError') setStatus(t('Loading cancelled.','Laden abgebrochen.')); else { showError(error); setStatus(t('Model not loaded.','Modell nicht geladen.')); }
  } finally {
    busy = false; progress.hidden = true; updateControls(); if (ai.ready) input.focus(); else if (document.activeElement === $('cancel-load')) start.focus();
  }
});

function appendMessage(role,text) {
  const article = document.createElement('article'); article.className = `message ${role === 'user' ? 'user-message' : 'assistant-message'}`;
  article.dataset.chatTurn = '';
  const content = document.createElement('div'), author = document.createElement('p'), body = document.createElement('p');
  author.className = 'message-author'; author.textContent = role === 'user' ? t('You','Du') : 'Snakkie';
  body.className = 'message-body'; body.textContent = text;
  content.append(author,body);
  if (role === 'assistant') {
    const avatar = document.createElement('img'); avatar.src = '/assets/snakkie/snakkie-avatar.webp'; avatar.width = 48; avatar.height = 48; avatar.alt = '';
    article.append(avatar);
  }
  article.append(content); log.append(article);
  // Keep the visual transcript bounded, too. Preserve the reader's scroll anchor.
  if (log.querySelectorAll('[data-chat-turn]').length > 48) {
    const first = log.querySelector('[data-chat-turn]'); const height = first.offsetHeight;
    first.remove(); if (!pinned) log.scrollTop -= height;
  }
  return {article,body,author};
}
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (busy || !ai.ready) return;
  const value = input.value.trim();
  if (!value) { input.focus(); return; }
  if (new TextEncoder().encode(value).length > limits.inputBytes) { showError(new Error('INPUT_TOO_LONG')); return; }
  busy = true; operation = 'generate'; clearError(); abort = new AbortController(); updateControls();
  const user = {role:'user',content:value};
  appendMessage('user',value);
  const answer = appendMessage('assistant',t('Snakkie is thinking…','Snakkie überlegt …'));
  answer.article.classList.add('thinking'); answer.article.setAttribute('aria-busy','true');
  let response = '';
  input.value = ''; resizeInput(); input.focus();
  pinned = true; scrollIfPinned(); badge.textContent = t('Snakkie is answering','Snakkie antwortet');
  setStatus(t('Generating locally. You can stop at any time.','Antwort wird lokal erzeugt. Du kannst jederzeit stoppen.'));
  try {
    const result = await ai.generate({messages:[...history,user],language:replyLanguage.value,signal:abort.signal,onToken:token => {
      response += token; answer.body.textContent = response; answer.article.classList.remove('thinking'); scrollIfPinned();
    }});
    history = [...history,user,{role:'assistant',content:result.text}].slice(-limits.exchanges*2);
    setStatus(`${loadedBackend} · ${t('answered locally','lokal beantwortet')} · ${(result.elapsedMs/1000).toFixed(1)} s`);
    $('chat-announcement').textContent = t('Snakkie has answered.','Snakkie hat geantwortet.');
  } catch (error) {
    if (error.name === 'AbortError') {
      answer.body.textContent = response || t('Generation stopped.','Antwort abgebrochen.');
      answer.author.textContent = t('Snakkie · stopped','Snakkie · abgebrochen');
      setStatus(t('Stopped. Incomplete replies are not added to the model context.','Gestoppt. Unvollständige Antworten werden nicht in den Modellkontext übernommen.'));
    } else {
      answer.body.textContent = response || t('The answer could not be generated.','Die Antwort konnte nicht erzeugt werden.');
      showError(error); ai.dispose(); setStatus(t('Model stopped after an error. Start it again to retry.','Modell nach einem Fehler gestoppt. Starte es für einen neuen Versuch erneut.'));
    }
  } finally {
    answer.article.classList.remove('thinking'); answer.article.setAttribute('aria-busy','false');
    busy = false; badge.textContent = ai.ready ? t('Model ready','Modell bereit') : t('Model not loaded','Modell nicht geladen'); updateControls();
    if (document.activeElement === stop) (ai.ready ? input : start).focus();
  }
});
stop.addEventListener('click', () => { if (busy) { abort?.abort(); setStatus(t('Stopping…','Wird gestoppt …')); stop.disabled = true; } });
$('cancel-load').addEventListener('click', () => { if (busy) abort?.abort(); });
reset.addEventListener('click', () => {
  if (busy) return;
  log.querySelectorAll('[data-chat-turn]').forEach(node => node.remove());
  history = []; input.value = ''; clearError(); resizeInput(); pinned = true; scrollIfPinned(); if(ai.ready) input.focus();
  $('chat-announcement').textContent = t('New conversation.','Neues Gespräch.');
});
$('unload-model').addEventListener('click', () => {
  if (busy) return;
  ai.dispose(); document.querySelector('.model-setup').classList.remove('model-ready'); badge.textContent = t('Model not loaded','Modell nicht geladen'); setStatus(t('Model unloaded. Cached model files are kept.','Modell entladen. Zwischengespeicherte Modelldateien bleiben erhalten.')); updateControls();
});
$('clear-cache').addEventListener('click', async () => {
  if (busy) return;
  busy = true; operation = 'cache'; updateControls();
  try { await ai.clearCache(); badge.textContent = t('Model not loaded','Modell nicht geladen'); setStatus(t('Snakkie model cache deleted.','Snakkies Modellcache wurde gelöscht.')); $('cache-note').textContent=t('Model files will need to be downloaded again at the next start.','Modelldateien müssen beim nächsten Start erneut geladen werden.'); }
  catch (error) { showError(error); }
  finally { busy = false; document.querySelector('.model-setup').classList.remove('model-ready'); updateControls(); }
});
window.addEventListener('pagehide',()=>ai.dispose());
window.addEventListener('pageshow',event=>{ if(event.persisted){ busy=false; updateControls(); badge.textContent=t('Model not loaded','Modell nicht geladen'); setStatus(t('Start the local model again to continue.','Starte das lokale Modell erneut, um fortzufahren.')); } });
updateDownloadNote(); updateControls();

let wordIndex = 0;
function showWord(index) {
  wordIndex = ((index % words.length) + words.length) % words.length;
  const word = wordAt(wordIndex);
  $('word').textContent = word.word;
  $('word-de').textContent = word.de;
  $('word-en').textContent = word.en;
  $('word-example').textContent = word.example;
  $('word-example-translation').textContent = de ? word.exampleDe : word.exampleEn;
  $('word-note').textContent = de ? word.noteDe : word.noteEn;
  $('word-source').href = word.source;
  $('word-source').textContent = `${word.sourceLabel} ↗`;
  $('word-count').textContent = `${wordIndex + 1} / ${words.length}`;
}
document.querySelector('.word-controls').hidden = false;
$('previous-word').addEventListener('click', () => showWord(wordIndex - 1));
$('next-word').addEventListener('click', () => showWord(wordIndex + 1));
