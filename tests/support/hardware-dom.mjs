// Small event/DOM contract harness, not a rendering engine or a browser walkthrough.
export function hardwareDom({ language = 'en', path = '/linux-hardware-explorer/', hash = '', clipboard } = {}) {
  let document;
  class Node {
    constructor(tag = '#text', text = '') { this.tagName = tag.toUpperCase(); this._text = text; this.children = []; this.attributes = {}; this.dataset = {}; this.listeners = {}; this.hidden = false; this._value = undefined; this.files = []; }
    get textContent() { return this._text + this.children.map(n => n.textContent).join(''); }
    set textContent(value) { this._text = String(value); this.replaceChildren(); }
    get value() { return this._value ?? (this.tagName === 'SELECT' ? this.children[0]?.value || '' : ''); }
    set value(value) { this._value = String(value); if (this.type === 'file' && value === '') this.files = []; }
    get firstChild() { return this.children[0] || null; }
    get parentElement() { return this.parentNode || null; }
    append(...nodes) { for (let node of nodes) { if (typeof node === 'string') node = new Node('#text', node); node.remove(); node.parentNode = this; this.children.push(node); } }
    replaceChildren(...nodes) { for (const child of this.children) child.parentNode = null; this.children = []; this.append(...nodes); }
    remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter(n => n !== this); this.parentNode = null; }
    setAttribute(key, value) { this.attributes[key] = String(value); if (key === 'id') this.id = String(value); if (key === 'open') this.open = true; if (key.startsWith('data-')) this.dataset[key.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = String(value); }
    getAttribute(key) { return this.attributes[key] ?? null; }
    removeAttribute(key) { delete this.attributes[key]; if (key === 'open') this.open = false; }
    addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
    async dispatch(type, properties = {}) {
      const event = { target: this, key: '', prevented: false, preventDefault() { this.prevented = true; }, ...properties };
      for (const fn of this.listeners[type] || []) await fn(event); return event;
    }
    click() { return this.dispatch('click'); }
    focus() { document.activeElement = this; }
    select() { this.selected = true; }
    showModal() { this.open = true; }
    close() { this.open = false; }
    querySelectorAll(selector) {
      const matches = [];
      const match = node => selector.split(',').some(raw => {
        const s = raw.trim(), attr = s.match(/\[([^\]]+)\]/)?.[1], tag = s.match(/^[a-z][a-z0-9]*/i)?.[0], cls = s.match(/\.([a-z-]+)/i)?.[1];
        return (!tag || node.tagName === tag.toUpperCase()) && (!cls || String(node.className).split(' ').includes(cls)) && (!attr || Object.hasOwn(node.attributes, attr));
      });
      const walk = node => { for (const child of node.children) { if (match(child)) matches.push(child); walk(child); } }; walk(this); return matches;
    }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  }
  const body = new Node('body'), html = new Node('html'); html.lang = language; html.append(body); body.dataset.canonicalPath = path;
  document = { body, documentElement: html, activeElement: null, createElement: tag => new Node(tag), createTextNode: text => new Node('#text', text),
    getElementById: id => { const walk = node => node.id === id ? node : node.children.map(walk).find(Boolean); return walk(html) || null; },
    querySelectorAll: selector => html.querySelectorAll(selector), querySelector: selector => html.querySelector(selector) };
  const add = (tag, id, attrs = {}) => { const node = new Node(tag); node.id = id; for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value); body.append(node); return node; };
  const languageLink = add('a', 'language', { hreflang: language === 'de' ? 'en' : 'de' }); languageLink.className = 'language-link';
  languageLink.href = language === 'de' ? path.replace(/^\/de\//, '/') : '/de' + path;
  add('h1', 'heading').textContent = language === 'de' ? 'Hardware erkennen' : 'Identify hardware';
  for (const id of ['hardware-ui-status', 'hardware-parse-status', 'hardware-search-status', 'hardware-search-empty']) add('p', id);
  for (const id of ['hardware-report', 'hardware-redacted', 'hardware-copy-fallback']) add('textarea', id);
  add('input', 'hardware-file').type = 'file'; add('input', 'hardware-include-ids').checked = false; add('input', 'hardware-search').value = '';
  for (const [id, value] of [['hardware-format', 'auto'], ['hardware-category', ''], ['hardware-sort', 'name']]) add('select', id).value = value;
  for (const id of ['hardware-analyse', 'hardware-sample', 'hardware-clear', 'hardware-copy-summary', 'hardware-download-summary', 'hardware-redact', 'hardware-search-reset']) add('button', id);
  for (const id of ['hardware-results', 'hardware-export-controls', 'hardware-workflow-panel']) add('div', id);
  add('details', 'hardware-redacted-panel'); add('ul', 'hardware-profile-list');
  const windowListeners = {}, opened = [], workers = [];
  const window = { addEventListener(type, fn) { (windowListeners[type] ||= []).push(fn); }, open(...args) { opened.push(args); } };
  let location = new URL('https://www.dennishilk.com' + path + hash);
  const history = { replaceState(_state, _title, href) { location = new URL(href, location); globalThis.location = location; } };
  class Worker {
    constructor(url, options) { this.url = url; this.options = options; this.terminated = false; workers.push(this); }
    postMessage(message) { this.message = message; }
    terminate() { this.terminated = true; }
    emit(data) { this.onmessage?.({ data }); }
  }
  class Option extends Node { constructor(text, value) { super('option', text); this.value = value; } }
  Object.assign(globalThis, { document, window, location, history, Worker, Option });
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { clipboard } });
  return { document, add, workers, opened, languageLink, Node, window, get location() { return location; },
    async dispatchWindow(type, event = {}) { for (const fn of windowListeners[type] || []) await fn(event); } };
}
