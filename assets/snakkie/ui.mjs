import { words, wordAt } from './words.mjs';
import { previewAdapter } from './inference.mjs';

const de = document.documentElement.lang === 'de';
const t = (en, german) => de ? german : en;
const $ = id => document.getElementById(id);
// This UI intentionally never calls generate(). Only an explicit future adapter
// integration may turn this interface preview into an AI conversation.
if (previewAdapter.capabilities.inference) throw new Error('The preview requires a non-inference adapter.');

const form = $('chat-form'), input = $('chat-input'), log = $('chat-messages');
const send = $('send'), reset = $('reset-chat'), replyLanguage = $('reply-language');
[input, send, reset, replyLanguage].forEach(control => { control.disabled = false; });
let turns = 0;
form.addEventListener('submit', event => {
  event.preventDefault();
  const value = input.value.trim();
  if (!value) { input.focus(); return; }
  // Bound the preview DOM; no conversation is persisted in browser storage.
  if (turns >= 8) { log.querySelectorAll('[data-preview-turn]').forEach(node => node.remove()); turns = 0; }
  const message = document.createElement('article');
  message.className = 'message user-message';
  message.dataset.previewTurn = '';
  const author = document.createElement('p');
  author.className = 'message-author'; author.textContent = t('You · local preview', 'Du · lokale Vorschau');
  const text = document.createElement('p'); text.textContent = value.slice(0, 500);
  message.append(author, text);
  const notice = document.createElement('p');
  notice.className = 'interface-notice'; notice.dataset.previewTurn = '';
  notice.textContent = t('Interface notice: your text is only displayed here. Snakkie cannot answer yet; no AI is connected.', 'Oberflächenhinweis: Dein Text wird nur hier angezeigt. Snakkie kann noch nicht antworten; es ist keine KI verbunden.');
  log.append(message, notice);
  turns += 1; input.value = ''; input.focus();
  log.scrollTop = log.scrollHeight;
});
reset.addEventListener('click', () => {
  log.querySelectorAll('[data-preview-turn]').forEach(node => node.remove());
  turns = 0; input.value = ''; input.focus();
});
replyLanguage.addEventListener('change', () => {
  $('translation-plan').hidden = replyLanguage.value !== 'nds';
});

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
