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
for (const narrative of [
  ['Borkum returns immediately', 'Borkum sofort wieder da'],
  ['children’s shooting king', 'Kinderschützenkönig'],
  ['Monkey Island', 'Monkey Island'],
  ['thrown away does not mean erased', 'Weggeworfen heißt nicht gelöscht'],
  ['Lessons learned', 'Gelernt'],
  ['gap in my CV from roughly 2008 to 2011', 'Lücke in meinem Lebenslauf aus der Zeit etwa 2008 bis 2011'],
  ['…working there.', '…zum Arbeiten.'],
  ['That week became almost three years', 'Aus der Woche wurden fast drei Jahre'],
  ['security analysis through the building and grounds', 'Sicherheitsanalyse durch Gebäude und Gelände'],
  ['Because it works', 'Weil es geht'],
  ['Toniebox', 'Toniebox'],
  ['166847991', '166847991'],
  ['Nothing lasts longer than a working temporary solution', 'Nichts hält länger als ein funktionierendes Provisorium'],
  ['Try and error eventually got its own infrastructure', 'Try and error bekam irgendwann eine eigene Infrastruktur'],
  ['lime-sand-brickworks', 'Kalksandsteinwerk'],
  ['RTL-SDR stick', 'RTL-SDR-Stick'],
  ['hyperfocus had already moved on', 'Hyperfokus längst weitergezogen'],
  ['sudo shutdown now', 'sudo shutdown now'],
  ['connected by SSH in a terminal to the production website server', 'per SSH im Terminal des Produktiv-Webservers'],
  ['server in Braunschweig', 'Server in Braunschweig'],
  ['Windows XP in a virtual machine, 2013', 'Windows XP in einer virtuellen Maschine, 2013'],
  ['Children’s shooting king with two queens, 1997', 'Kinderschützenkönig mit zwei Königinnen, 1997'],
  ['shooting target still hangs above the workbench today', 'Schützenscheibe von 1997 hängt heute noch über der Werkbank'],
  ['After that, the path led into youth services', 'Danach führte der Weg in die Jugendhilfe'],
  ['That’s two', 'Das sind aber zwei'],
  ['I can’t decide and I don’t want one of them to be sad', 'ich kann mich nicht entscheiden und möchte nicht, dass eine traurig ist']
]) {
  assert.ok(html.includes(narrative[0]), `English narrative must retain: ${narrative[0]}`);
  assert.ok(html.includes(narrative[1]), `German narrative must retain: ${narrative[1]}`);
}

const securityIndex = html.indexOf('Security was its own way of looking');
const civilEngineeringIndex = html.indexOf('From security to civil engineering');
const youthServicesIndex = html.indexOf('After that, the path led into youth services');
assert.ok(securityIndex >= 0 && civilEngineeringIndex > securityIndex && youthServicesIndex > civilEngineeringIndex,
  'career chronology must be security -> Tiefbau -> youth services');
const germanSecurityIndex = html.indexOf('Sicherheitsarbeit war eine eigene Art zu schauen');
const germanCivilEngineeringIndex = html.indexOf('Von der Sicherheitsarbeit in den Tiefbau');
const germanYouthServicesIndex = html.indexOf('Danach führte der Weg in die Jugendhilfe');
assert.ok(germanSecurityIndex >= 0 && germanCivilEngineeringIndex > germanSecurityIndex && germanYouthServicesIndex > germanCivilEngineeringIndex,
  'German career chronology must be security -> Tiefbau -> Jugendhilfe');
assert.doesNotMatch(html, /friends from playing there|kannte ich vom Spielen dort/,
  'two-queens story must not claim Dennis knew the sisters from playing at Eurostrand');
assert.match(html, /…working there\./, 'forensic psychiatry anecdote must explicitly clarify that Dennis worked there');
assert.match(html, /…zum Arbeiten\./, 'forensic psychiatry anecdote must explicitly clarify that Dennis worked there in German');

const imageSources = [...html.matchAll(/<img\b[^>]*\bsrc="(\/assets\/me\/[^"]+)"/g)].map(([, source]) => source.replace(/%20/g, ' '));
assert.ok(imageSources.includes('/assets/me/kinderschuetzenkoenig-1997.jpg'), 'shooting-king archive image must be used');
assert.ok(imageSources.includes('/assets/me/lost-place-lime-sand-brickworks.jpg'), 'lost-place lead image must be used');
assert.ok(imageSources.includes('/assets/me/linux-virtualbox-xp.jpg'), 'Linux archival image must be used');
assert.ok(!imageSources.includes('/assets/me/lost-place-newspaper-feature.jpg'), 'newspaper artifact should remain a non-primary supporting image');
assert.equal(new Set(imageSources).size, imageSources.length, 'images should not be repeated as a gallery');

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
