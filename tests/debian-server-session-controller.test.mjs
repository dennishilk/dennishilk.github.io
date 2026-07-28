import test from 'node:test';
import assert from 'node:assert/strict';

class Element {
  constructor(ownerDocument) {
    this.ownerDocument = ownerDocument;
    this.children = [];
    this.listeners = new Map();
    this.value = '';
    this.disabled = false;
    this.isConnected = true;
    this.textContent = '';
  }
  addEventListener(type, listener) { this.listeners.set(type, listener); }
  dispatchEvent(event) { event.target = this; this.listeners.get(event.type)?.(event); return !event.defaultPrevented; }
  append(child) { this.children.push(child); }
  replaceChildren() { this.children = []; }
  focus() { this.ownerDocument.activeElement = this; }
  set className(value) { this._className = value; }
}

function keyboardEvent(key, options = {}) {
  return { type: 'keydown', key, ctrlKey: Boolean(options.ctrlKey), defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
}

test('session controller keeps the first prompt interactive and executes pwd', async () => {
  const elements = new Map();
  const document = {
    readyState: 'loading', activeElement: null, listeners: new Map(),
    querySelector: selector => elements.get(selector) ?? null,
    createElement: () => new Element(document),
    addEventListener(type, listener) { this.listeners.set(type, listener); }
  };
  for (const selector of ['#debian-terminal', '#terminal-history', '#terminal-input', '#terminal-prompt-text', '#session-exit']) {
    elements.set(selector, new Element(document));
  }
  const data = new Map();
  const sessionStorage = {
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: key => data.delete(key)
  };
  let destination = null;
  const window = { sessionStorage, location: { assign(value) { destination = value; } } };
  globalThis.document = document;
  globalThis.window = window;

  const { initializeSession } = await import('../assets/js/debian-server/session-controller.js');
  assert.doesNotThrow(() => initializeSession(document, window, sessionStorage));

  const terminal = elements.get('#debian-terminal');
  const history = elements.get('#terminal-history');
  const input = elements.get('#terminal-input');
  const prompt = elements.get('#terminal-prompt-text');
  assert.equal(input.isConnected, true);
  assert.equal(input.disabled, false);
  assert.notEqual(input.readOnly, true);
  assert.equal(document.activeElement, input);

  input.value = 'pwd';
  input.dispatchEvent({ type: 'input', defaultPrevented: false });
  input.dispatchEvent(keyboardEvent('Enter'));
  assert.equal(input.value, '');
  assert.ok(history.children.some(line => line.textContent === '/home/visitor'));
  assert.equal(prompt.textContent, 'visitor@lab-node:~$');
  assert.equal(input.isConnected, true);
  assert.equal(document.activeElement, input);
  assert.ok(data.size > 0, 'command state is persisted in sessionStorage');

  terminal.dispatchEvent({ type: 'click', defaultPrevented: false });
  assert.equal(document.activeElement, input);
  input.dispatchEvent(keyboardEvent('l', { ctrlKey: true }));
  assert.equal(history.children.length, 0);

  elements.get('#session-exit').dispatchEvent({ type: 'click', defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } });
  assert.equal(data.size, 0);
  assert.equal(destination, '/museum/debian-server-experiment/');
});
