import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../about/index.html', import.meta.url), 'utf8');
const script = html.match(/<script>\s*([\s\S]*?)\s*<\/script>/)?.[1];
assert.ok(script, 'about page must contain its language-switch script');

const contentTags = [...html.matchAll(/<([a-z][\w-]*)\b([^>]*)>/gi)]
  .map(([, tagName, attributes]) => ({ tagName: tagName.toLowerCase(), attributes }))
  .filter(({ attributes }) => /\bdata-language-content="(?:en|de)"/.test(attributes));
assert.ok(contentTags.length > 0, 'language content nodes must be explicit');
assert.equal(contentTags.filter(({ attributes }) => /\blang="(?:en|de)"/.test(attributes)).length, contentTags.length,
  'every language content node must retain semantic lang metadata');
assert.equal(contentTags.filter(({ attributes }) => /\bdata-language-content="de"/.test(attributes) && !/\bhidden\b/.test(attributes)).length, 0,
  'German content must be hidden in static HTML');
assert.equal(contentTags.filter(({ attributes }) => /\bdata-language-content="en"/.test(attributes) && /\bhidden\b/.test(attributes)).length, 0,
  'English content must be visible in static HTML');
assert.equal(contentTags.filter(({ tagName }) => ['html', 'body', 'main', 'nav', 'section', 'header', 'footer'].includes(tagName)).length, 0,
  'structural containers must never be language content nodes');
assert.ok(html.includes('.language-content[hidden] { display:none }'), 'only explicit language nodes may be hidden');
assert.doesNotMatch(html, /(?:^|[\s}])\[lang(?:=|\])/m, 'CSS must not hide arbitrary lang elements');
assert.doesNotMatch(html, /body\.is-de|visibility\s*:\s*hidden|opacity\s*:\s*0/, 'no page-level language visibility gate is allowed');
assert.doesNotMatch(html, /<details\b|<summary\b|side-quest/, 'Side Quest UI must be fully removed');
assert.equal((html.match(/class="anecdote"/g) ?? []).length, 2, 'integrated inset anecdotes must remain visible');
for (const anecdote of ['rubbish bag alight', '166847991', 'whole DSL era', 'sewing-kit needles', 'RTL-SDR stick', 'hyperfocus had already moved on', 'sudo shutdown now']) {
  assert.ok(html.includes(anecdote), `integrated anecdote must retain: ${anecdote}`);
}

function runPage(storedValue, storageThrows = false) {
  const nodes = contentTags.map(({ attributes }) => ({
    dataset: { languageContent: attributes.match(/data-language-content="(en|de)"/)?.[1] },
    hidden: /\bhidden\b/.test(attributes)
  }));
  const buttons = ['en', 'de'].map((language) => ({
    dataset: { language }, attributes: {}, listeners: {},
    setAttribute(name, value) { this.attributes[name] = value; },
    addEventListener(name, callback) { this.listeners[name] = callback; }
  }));
  const document = {
    documentElement: { lang: 'en' },
    querySelectorAll(selector) {
      return selector === '[data-language-content]' ? nodes : buttons;
    }
  };
  const localStorage = {
    getItem() { if (storageThrows) throw new Error('blocked'); return storedValue; },
    setItem(_key, value) { if (storageThrows) throw new Error('blocked'); this.value = value; }
  };
  vm.runInNewContext(script, { document, localStorage });
  return { nodes, buttons, document, localStorage };
}

function assertLanguage(page, language) {
  assert.equal(page.document.documentElement.lang, language);
  for (const node of page.nodes) assert.equal(node.hidden, node.dataset.languageContent !== language);
  for (const button of page.buttons) assert.equal(button.attributes['aria-pressed'], String(button.dataset.language === language));
}

// A: no preference -> EN. B: DE click. C: reload persisted DE. D/E: EN click then reload. F: invalid -> EN.
const firstLoad = runPage(null);
assertLanguage(firstLoad, 'en');
firstLoad.buttons[1].listeners.click();
assertLanguage(firstLoad, 'de');
assert.equal(firstLoad.localStorage.value, 'de');
assertLanguage(runPage(firstLoad.localStorage.value), 'de');
firstLoad.buttons[0].listeners.click();
assertLanguage(firstLoad, 'en');
assert.equal(firstLoad.localStorage.value, 'en');
assertLanguage(runPage(firstLoad.localStorage.value), 'en');
assertLanguage(runPage('corrupted-value'), 'en');
assertLanguage(runPage('de', true), 'en');

console.log('about language switch regression checks passed');
