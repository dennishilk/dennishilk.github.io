import { ShellEngine } from './shell-engine.js';
import { clearState, loadState, saveState } from './session-state.js';
import { TerminalRenderer } from './terminal-renderer.js';
import { commands } from './command-registry.js';
import { normalizePath, parentPath } from './path-utils.js';

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
  let historyIndex=state.commandHistory.length;
  const complete=()=>{const before=input.value.slice(0,input.selectionStart??input.value.length),parts=before.split(/\s+/),needle=parts.at(-1)||'';let choices=[];if(parts.length===1){choices=Object.keys(commands).filter(x=>x.startsWith(needle));}else{const slash=needle.lastIndexOf('/'),dirPart=slash>=0?needle.slice(0,slash+1):'',base=slash>=0?needle.slice(slash+1):needle,p=normalizePath(dirPart||'.',state.currentDirectory),node=engine.fs.get(p);if(node?.type==='directory'&&!engine.fs.denied(p))choices=Object.keys(node.children).filter(x=>x.startsWith(base)).map(x=>dirPart+x+(node.children[x].type==='directory'?'/':''));}if(choices.length===1){const start=before.length-needle.length;input.value=input.value.slice(0,start)+choices[0]+input.value.slice(before.length);input.selectionStart=input.selectionEnd=start+choices[0].length;}else if(choices.length>1){renderer.output({stdout:[choices.join('  ')],stderr:[]});renderer.scroll();}};
  const submit = () => {
    const source = input.value;
    const cwd = state.currentDirectory;
    renderer.command(cwd, source);
    input.value = '';
    if (source.trim()) {
      state.commandHistory.push(source.trim());
      if (state.commandHistory.length > 200) state.commandHistory.shift();
      historyIndex=state.commandHistory.length;
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
    if(event.key==='ArrowUp'||event.key==='ArrowDown'){event.preventDefault();historyIndex=Math.max(0,Math.min(state.commandHistory.length,historyIndex+(event.key==='ArrowUp'?-1:1)));input.value=state.commandHistory[historyIndex]||'';return;}
    if(event.key==='Tab'){event.preventDefault();complete();return;}
    if(event.ctrlKey&&event.key.toLowerCase()==='c'){event.preventDefault();renderer.command(state.currentDirectory,`${input.value}^C`);input.value='';renderer.scroll();return;}
    if(event.ctrlKey&&event.key.toLowerCase()==='d'&&!input.value){event.preventDefault();leave();return;}
    if(event.ctrlKey&&event.key.toLowerCase()==='a'){event.preventDefault();input.selectionStart=input.selectionEnd=0;return;}
    if(event.ctrlKey&&event.key.toLowerCase()==='e'){event.preventDefault();input.selectionStart=input.selectionEnd=input.value.length;return;}
    if(event.ctrlKey&&event.key.toLowerCase()==='u'){event.preventDefault();const p=input.selectionStart??input.value.length;input.value=input.value.slice(p);input.selectionStart=input.selectionEnd=0;return;}
    if(event.ctrlKey&&event.key.toLowerCase()==='k'){event.preventDefault();const p=input.selectionStart??input.value.length;input.value=input.value.slice(0,p);return;}
    if(event.ctrlKey&&event.key.toLowerCase()==='w'){event.preventDefault();const p=input.selectionStart??input.value.length,start=input.value.slice(0,p).search(/\S+\s*$/);if(start>=0){input.value=input.value.slice(0,start)+input.value.slice(p);input.selectionStart=input.selectionEnd=start;}return;}
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
