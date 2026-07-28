import { ShellEngine } from './shell-engine.mjs';
import { clearState, loadState, saveState } from './session-state.mjs';
import { TerminalRenderer } from './terminal-renderer.mjs';

const initializedDocuments = new WeakSet();

export function initializeSession(doc = document, view = window, storage = view.sessionStorage) {
  if (initializedDocuments.has(doc)) return;

  const terminal = doc.querySelector('#debian-terminal');
  const history = doc.querySelector('#terminal-history');
  const input = doc.querySelector('#terminal-input');
  const prompt = doc.querySelector('#terminal-prompt-text');
  const exitLink = doc.querySelector('#session-exit');
  if (!terminal || !history || !input || !prompt) return;

  const state = loadState(storage);
  const engine = new ShellEngine(state);
  const renderer = new TerminalRenderer(terminal, history, prompt);
  const leave = () => {
    clearState(storage);
    view.location.assign('/museum/debian-server-experiment/');
  };
  const clear = () => {
    renderer.clear();
    input.value = '';
    renderer.updatePrompt(state.currentDirectory);
    renderer.scroll();
  };
  const submit = () => {
    const source = input.value;
    const cwd = state.currentDirectory;
    renderer.command(cwd, source);
    input.value = '';
    if (source.trim()) {
      state.commandHistory.push(source.trim());
      if (state.commandHistory.length > 200) state.commandHistory.shift();
      const output = engine.execute(source);
      if (output.exit) { leave(); return; }
      if (output.clear) renderer.clear();
      else renderer.output(output);
      saveState(state, storage);
    }
    renderer.updatePrompt(state.currentDirectory);
    renderer.scroll();
  };

  input.addEventListener('keydown', event => {
    if (event.ctrlKey && event.key.toLowerCase() === 'l') {
      event.preventDefault();
      clear();
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      submit();
    }
  });
  exitLink?.addEventListener('click', event => {
    event.preventDefault();
    leave();
  });
  terminal.addEventListener('click', () => input.focus());
  renderer.updatePrompt(state.currentDirectory);
  input.focus();
  initializedDocuments.add(doc);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initializeSession(), { once: true });
} else {
  initializeSession();
}
