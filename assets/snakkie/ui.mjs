import { createCompanion, loadKnowledge, shouldSend } from './engine.mjs?v=6';
import { relevantHistory } from './conversation.mjs';
import { loadWords, wordAt, dailyWordIndex } from './words.mjs?v=3';

const de = document.documentElement.lang === 'de';
const t = (en, german) => de ? german : en;
const $ = id => document.getElementById(id);
const form = $('chat-form');
const input = $('chat-input');
const send = $('send');
const log = $('chat-messages');
const language = $('reply-language');
const reset = $('reset-chat');
const status = $('chat-status');
const suggestions = document.querySelectorAll('.suggestion');

let request;
let pinned = true;
let history = [];
const companion = loadKnowledge().then(data => () => createCompanion(data)).catch(() => () => null);
let ready = companion.then(create => create());

function controls() {
  send.disabled = Boolean(request);
  language.disabled = Boolean(request);
  suggestions.forEach(button => { button.disabled = Boolean(request); });
}

function grow() {
  input.style.height = 'auto';
  input.style.height = Math.min(130, Math.max(46, input.scrollHeight)) + 'px';
}

function scroll() {
  if (pinned) log.scrollTop = log.scrollHeight;
}

log.addEventListener('scroll', () => {
  pinned = log.scrollHeight - log.scrollTop - log.clientHeight < 65;
  $('latest-message').hidden = pinned;
});
$('latest-message').addEventListener('click', () => {
  pinned = true;
  scroll();
  $('latest-message').hidden = true;
});
input.addEventListener('input', grow);
input.addEventListener('keydown', event => {
  if (!shouldSend(event)) return;
  event.preventDefault();
  if (!request) form.requestSubmit();
});

function message(role, text, sources = [], note = '') {
  const article = document.createElement('article');
  article.className = 'message ' + (role === 'user' ? 'user-message' : 'assistant-message');
  article.dataset.chatTurn = '';
  const content = document.createElement('div');
  const author = document.createElement('p');
  const body = document.createElement('p');
  author.className = 'message-author';
  author.textContent = role === 'user' ? t('You', 'Du') : 'Snakkie';
  body.className = 'message-body';
  body.textContent = text;
  content.append(author);
  if (note) {
    const details = document.createElement('p');
    details.className = 'message-note';
    details.textContent = note;
    content.append(details);
  }
  if (text) content.append(body);
  if (role === 'assistant') {
    const avatar = document.createElement('img');
    avatar.src = '/assets/snakkie/snakkie-avatar.webp';
    avatar.width = avatar.height = 40;
    avatar.alt = '';
    article.append(avatar);
  }
  if (Array.isArray(sources)) {
    const links = document.createElement('div');
    links.className = 'message-sources';
    for (const source of sources) {
      if (typeof source?.url !== 'string' || typeof source.label !== 'string') continue;
      let url;
      try {
        url = new URL(source.url, location.origin);
      } catch {
        continue;
      }
      if (url.username || url.password || !['https:', 'http:'].includes(url.protocol) ||
          (url.protocol === 'http:' && url.origin !== location.origin)) continue;
      const link = document.createElement('a');
      link.href = url.href;
      link.textContent = (source.id ? '[' + source.id + '] ' : '') + source.label + ' ↗';
      link.rel = 'noreferrer';
      links.append(link);
    }
    if (links.childElementCount) content.append(links);
  }
  article.append(content);
  log.append(article);
  if (log.querySelectorAll('[data-chat-turn]').length > 60) {
    const first = log.querySelector('[data-chat-turn]');
    const height = first.offsetHeight;
    first.remove();
    if (!pinned) log.scrollTop -= height;
  }
  scroll();
}

function remember(question, answer) {
  history = [...history,
    { role: 'user', content: question.slice(0, 500) },
    { role: 'assistant', content: answer.slice(0, 500) }
  ].slice(-6);
}

async function aiReply(text, replyLanguage, signal) {
  const response = await fetch('/api/snakkie/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ message: text, language: replyLanguage, history: relevantHistory(text, history) }),
    signal: AbortSignal.any([signal, AbortSignal.timeout(57_000)])
  });
  if (response.status === 429) return { error: 'rate_limit' };
  if (response.status === 413) return { error: 'input_too_large' };
  if (response.status === 504) return { error: 'timeout' };
  const result = await response.json();
  if (!response.ok) return { error: result.error };
  if (typeof result.text !== 'string' || !result.text) return { error: 'unavailable' };
  return result;
}

const unavailable = () => t('The local AI is temporarily unavailable. Please try again shortly.', 'Die lokale KI ist gerade nicht erreichbar. Versuch’s gleich noch mal.');
function failureNote(error) {
  if (error === 'busy') return t('Moin! I’m helping someone else just now. Try again shortly.', 'Moin! Hier ist gerade ordentlich Betrieb. Versuch’s gleich noch mal.');
  if (error === 'rate_limit') return t('Too many requests in a short time. Give me a moment before trying again.', 'Das waren viele Anfragen in kurzer Zeit. Gib mir einen Moment und versuch es dann erneut.');
  if (error === 'timeout') return t('That answer took too long. Try again or ask a shorter question.', 'Das hat zu lange gedauert. Versuch’s noch mal oder stell die Frage kürzer.');
  if (error === 'input_too_large') return t('Please shorten your message and try again.', 'Kürze bitte deine Nachricht und versuch es erneut.');
  return unavailable();
}

function searchNote(state) {
  if (state === 'used') return t('Based on search result excerpts.', 'Auf Basis von Suchauszügen.');
  if (state === 'empty') return t('I found no usable search results.', 'Ich habe keine brauchbaren Suchtreffer gefunden.');
  if (state === 'unavailable') return t('Web search is temporarily unavailable.', 'Die Websuche ist gerade nicht erreichbar.');
  if (state === 'skipped') return t('I kept this question out of web search. Try shorter, non-sensitive search terms.', 'Ich habe diese Frage nicht an die Websuche gesendet. Versuch es mit kurzen Suchbegriffen ohne vertrauliche Angaben.');
  return '';
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  const text = input.value.trim();
  if (request || !text) return;
  const current = new AbortController();
  request = current;
  controls();
  message('user', text);
  input.value = '';
  grow();
  input.focus();
  status.textContent = t('One moment…', 'Ik kiek mol eben na …');
  const started = performance.now();
  let waitNotice;
  try {
    const engine = await ready;
    if (request !== current) return;
    const lookupStarted = performance.now();
    const local = await engine?.reply(text, language.value, { hasContext: history.length > 0 });
    performance.clearMeasures('snakkie:local-lookup');
    performance.measure('snakkie:local-lookup', { start: lookupStarted, end: performance.now() });
    if (request !== current) return;
    if (local?.language) language.value = local.language;
    if (local && local.kind !== 'unknown') {
      message('assistant', local.text, local.sources);
      if (!local.social) remember(local.modelMessage || text, local.text);
    } else {
      waitNotice = setTimeout(() => {
        if (request === current) status.textContent = t('Still working on your reply …', 'Ich bin noch dabei …');
      }, 8000);
      const modelMessage = local?.modelMessage || text;
      const reply = await aiReply(modelMessage, language.value, current.signal);
      if (request !== current) return;
      if (reply.error) {
        message('assistant', failureNote(reply.error));
      } else {
        message('assistant', reply.text, reply.sources, searchNote(reply.search));
        if (!['unverified', 'empty', 'unavailable', 'skipped'].includes(reply.search)) remember(modelMessage, reply.text);
      }
    }
  } catch (error) {
    if (request === current) message('assistant', error?.name === 'TimeoutError' ? failureNote('timeout') : unavailable());
  } finally {
    clearTimeout(waitNotice);
    performance.clearMeasures('snakkie:reply');
    performance.measure('snakkie:reply', { start: started, end: performance.now() });
    if (request === current) {
      request = undefined;
      status.textContent = '';
      controls();
    }
  }
});

reset.addEventListener('click', () => {
  request?.abort();
  request = undefined;
  history = [];
  ready = companion.then(create => create());
  log.querySelectorAll('[data-chat-turn]').forEach(turn => turn.remove());
  input.value = '';
  grow();
  pinned = true;
  scroll();
  $('latest-message').hidden = true;
  input.focus();
  status.textContent = t('New conversation.', 'Neues Gespräch.');
  controls();
});

suggestions.forEach(button => button.addEventListener('click', () => {
  if (request) return;
  input.value = button.dataset.question;
  form.requestSubmit();
  input.focus();
}));

input.disabled = send.disabled = reset.disabled = false;
document.querySelector('.suggestions').hidden = false;

// Learning has its own dataset/request and works even if the chat collection fails.
loadWords().then(list=>{
 const words=[...list].sort((a,b)=>a.id.localeCompare(b.id));let index=dailyWordIndex(words),dayKey=new Date().toDateString();
 function show(i){index=((i%words.length)+words.length)%words.length;const w=wordAt(words,index);$('word').textContent=w.word;$('word-de').textContent=w.de;$('word-en').textContent=w.en;$('word-example').textContent=w.example;$('word-example-translation').textContent=de?w.exampleDe:w.exampleEn;$('word-note').textContent=de?w.noteDe:w.noteEn;$('word-source').href=w.source;$('word-source').textContent=w.sourceLabel+' ↗';$('word-count').textContent=`${index+1} / ${words.length}`;}
 show(index);document.querySelector('.word-controls').hidden=false;
 $('previous-word').addEventListener('click',()=>show(index-1));$('next-word').addEventListener('click',()=>show(index+1));
 function checkDay(){const now=new Date(),key=now.toDateString();if(key!==dayKey){dayKey=key;show(dailyWordIndex(words,now));}}
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkDay();});setInterval(checkDay,60000);
}).catch(()=>{$('daily-note').textContent=t('Static word example · daily selection unavailable','Statisches Wortbeispiel · Tagesauswahl nicht verfügbar');});
