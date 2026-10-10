// A zero-dependency DOM/event contract harness. It is not a rendering engine or
// a real browser. Tests load the generated HTML and run the actual app module.
const decode = text => text.replace(/&(?:#(\d+)|#x([a-f0-9]+)|([a-z]+));/gi, (raw, decimal, hex, named) => decimal ? String.fromCodePoint(Number(decimal)) : hex ? String.fromCodePoint(parseInt(hex, 16)) : ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }[named] ?? raw));
const voidTags = new Set(['AREA', 'BASE', 'BR', 'COL', 'EMBED', 'HR', 'IMG', 'INPUT', 'LINK', 'META', 'PARAM', 'SOURCE', 'TRACK', 'WBR']);

export function gamingDom(html, { clipboard, worker = true } = {}) {
  let document;
  const downloads = [];
  class Node {
    constructor(tag = '#text', text = '') {
      this.tagName = tag.toUpperCase();
      this._text = text;
      this.children = [];
      this.attributes = {};
      this.listeners = {};
      this.hidden = false;
      this.disabled = false;
      this.checked = false;
      this.files = [];
      this._value = undefined;
      this.dataset = new Proxy({}, { set: (target, key, value) => {
        target[key] = String(value);
        this.attributes['data-' + String(key).replace(/[A-Z]/g, c => '-' + c.toLowerCase())] = String(value);
        return true;
      } });
    }
    get id() { return this.attributes.id || ''; }
    set id(value) { this.attributes.id = String(value); }
    get className() { return this.attributes.class || ''; }
    set className(value) { this.attributes.class = String(value); }
    get type() { return this.attributes.type || ''; }
    set type(value) { this.attributes.type = String(value); }
    get name() { return this.attributes.name || ''; }
    get lang() { return this.attributes.lang || ''; }
    set lang(value) { this.attributes.lang = String(value); }
    get textContent() { return this._text + this.children.map(child => child.textContent).join(''); }
    set textContent(value) { this.replaceChildren(); this._text = String(value); }
    get value() {
      if (this._value !== undefined) return this._value;
      if (this.tagName === 'SELECT') return this.querySelector('option')?.value || '';
      if (this.tagName === 'OPTION') return this.attributes.value ?? this.textContent;
      if (this.tagName === 'TEXTAREA') return this.textContent;
      return this.attributes.value || '';
    }
    set value(value) { this._value = String(value); if (this.type === 'file' && !value) this.files = []; }
    get parentElement() { return this.parentNode || null; }
    get firstElementChild() { return this.children.find(child => child.tagName !== '#TEXT') || null; }
    get elements() { return { namedItem: name => this.querySelector(`[name="${name}"]`) }; }
    append(...nodes) {
      for (let child of nodes) {
        if (typeof child === 'string') child = new Node('#text', child);
        child.remove();
        child.parentNode = this;
        this.children.push(child);
      }
    }
    replaceChildren(...nodes) {
      for (const child of this.children) child.parentNode = null;
      this.children = [];
      this._text = '';
      this.append(...nodes);
    }
    remove() {
      if (this.parentNode) this.parentNode.children = this.parentNode.children.filter(child => child !== this);
      this.parentNode = null;
    }
    setAttribute(key, value) {
      this.attributes[key] = String(value);
      if (key === 'hidden') this.hidden = true;
      if (key === 'disabled') this.disabled = true;
      if (key === 'checked') this.checked = true;
      if (key.startsWith('data-')) this.dataset[key.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = String(value);
    }
    getAttribute(key) { return this.attributes[key] ?? null; }
    removeAttribute(key) {
      delete this.attributes[key];
      if (key === 'hidden') this.hidden = false;
    }
    matches(selector) {
      return selector.split(',').some(raw => {
        const s = raw.trim();
        const tag = s.match(/^[a-z][a-z0-9-]*/i)?.[0];
        const id = s.match(/#([a-z0-9-]+)/i)?.[1];
        const classes = [...s.matchAll(/\.([a-z0-9-]+)/gi)].map(match => match[1]);
        const attrs = [...s.matchAll(/\[([\w-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\]]*)))?\]/g)];
        return (!tag || this.tagName === tag.toUpperCase()) && (!id || this.id === id) && classes.every(cls => this.className.split(/\s+/).includes(cls)) && attrs.every(match => Object.hasOwn(this.attributes, match[1]) && (match[2] === undefined && match[3] === undefined && match[4] === undefined || this.attributes[match[1]] === (match[2] ?? match[3] ?? match[4])));
      });
    }
    closest(selector) { return this.matches(selector) ? this : this.parentNode?.closest(selector) || null; }
    querySelectorAll(selector) {
      const matches = [];
      const walk = parent => { for (const child of parent.children) { if (child.matches(selector)) matches.push(child); walk(child); } };
      walk(this);
      return matches;
    }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    addEventListener(type, callback) { (this.listeners[type] ||= []).push(callback); }
    async dispatch(type, properties = {}) {
      const event = { target: this, key: '', defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, ...properties };
      for (let current = this; current; current = current.parentNode) for (const callback of current.listeners[type] || []) await callback(event);
      return event;
    }
    click() {
      if (this.tagName === 'A' && this.download) downloads.push({ name: this.download, href: this.href });
      return this.disabled ? Promise.resolve() : this.dispatch('click');
    }
    // Native button keyboard activation is represented here. No layout/focus
    // traversal claim is made; generated semantic controls are also checked.
    async activateKey(key) {
      this.focus();
      const event = await this.dispatch('keydown', { key });
      if (this.tagName === 'BUTTON' && ['Enter', ' '].includes(key) && !event.defaultPrevented) await this.click();
    }
    focus() { document.activeElement = this; }
    select() { this.selected = true; }
    reset() {
      for (const control of this.querySelectorAll('input,textarea,select')) {
        control._value = undefined;
        control.checked = Object.hasOwn(control.attributes, 'checked');
        if (control.type === 'file') control.files = [];
      }
    }
    reportValidity() {
      for (const control of this.querySelectorAll('input')) if (control.type === 'number' && control.value !== '') {
        const number = Number(control.value);
        if (!Number.isFinite(number) || control.attributes.min !== undefined && number < Number(control.attributes.min) || control.attributes.max !== undefined && number > Number(control.attributes.max)) return false;
      }
      return true;
    }
  }
  const wrapper = new Node('document');
  const stack = [wrapper];
  for (const match of html.matchAll(/<\/?([a-z][a-z0-9-]*)([^>]*)>|([^<]+)/gi)) {
    if (match[3]) { stack.at(-1).append(new Node('#text', decode(match[3]))); continue; }
    const [token, tag, attrText] = match;
    if (token.startsWith('</')) {
      const index = stack.findLastIndex(item => item.tagName === tag.toUpperCase());
      if (index > 0) stack.splice(index);
      continue;
    }
    const element = new Node(tag);
    for (const attribute of attrText.matchAll(/([a-z_:][\w:.-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/gi)) element.setAttribute(attribute[1], decode(attribute[2] ?? attribute[3] ?? attribute[4] ?? ''));
    stack.at(-1).append(element);
    if (!voidTags.has(element.tagName)) stack.push(element);
  }
  const body = wrapper.querySelector('body');
  const documentElement = wrapper.querySelector('html');
  document = { body, documentElement, activeElement: null, createElement: tag => new Node(tag), createTextNode: text => new Node('#text', text), getElementById: id => wrapper.querySelector('#' + id), querySelector: selector => wrapper.querySelector(selector), querySelectorAll: selector => wrapper.querySelectorAll(selector) };
  const windowListeners = {};
  const window = { addEventListener(type, callback) { (windowListeners[type] ||= []).push(callback); } };
  const workers = [];
  class Worker {
    constructor(url, options) {
      if (!worker) throw new Error('worker intentionally unavailable');
      this.url = url; this.options = options; this.terminated = false; workers.push(this);
    }
    postMessage(message) { this.message = message; }
    terminate() { this.terminated = true; }
    emit(data) { this.onmessage?.({ data }); }
    fail() { this.onerror?.({ preventDefault() {} }); }
  }
  Object.assign(globalThis, { document, window, Worker });
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { clipboard } });
  return { document, workers, downloads, Node, async dispatchWindow(type, properties = {}) { for (const callback of windowListeners[type] || []) await callback(properties); } };
}
