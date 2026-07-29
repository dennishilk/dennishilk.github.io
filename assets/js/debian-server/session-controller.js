import { ShellEngine } from './shell-engine.js';
import { clearState, loadState, saveState } from './session-state.js';
import { TerminalRenderer } from './terminal-renderer.js';
import { commands } from './command-registry.js';
import { normalizePath, parentPath } from './path-utils.js';
import { createFilesystem } from './virtual-filesystem.js';
import { submitAnonymousCompletedSession } from './exploration-statistics.js';
import { completeTerminalInput } from './tab-completion.js';

const initializedDocuments = new WeakSet();

export function initializeSession(doc = document, view = window, storage = view.localStorage) {
  if (initializedDocuments.has(doc)) return;

  const terminal = doc.querySelector('#debian-terminal');
  const history = doc.querySelector('#terminal-history');
  const input = doc.querySelector('#terminal-input');
  const prompt = doc.querySelector('#terminal-prompt-text');
  const exitLink = doc.querySelector('#session-exit');
  const result = doc.querySelector('#session-result');
  const status = doc.querySelector('#session-status');
  const restart = doc.querySelector('#session-restart');
  if (!terminal || !history || !input || !prompt) return;

  const state = loadState(storage);
  const engine = new ShellEngine(state);
  const renderer = new TerminalRenderer(terminal, history, prompt);
  const formatDuration = ms => { const seconds=Math.max(0,Math.floor(ms/1000)),minutes=Math.floor(seconds/60);return minutes?`${minutes}m ${seconds%60}s`:`${seconds}s`; };
  const pathsIn = root => { const found=new Set(),stack=[['/',root]];while(stack.length){const [path,node]=stack.pop();found.add(path);if(node.type==='directory')Object.values(node.children).forEach(child=>stack.push([path==='/'?`/${child.name}`:`${path}/${child.name}`,child]));}return found; };
  const showResult = () => {
    terminal.hidden=true; if(exitLink)exitLink.hidden=true; if(result)result.hidden=false; if(status)status.textContent='SESSION COMPLETE';
    const entries=state.session.commands, nonEmpty=entries.filter(x=>!x.empty), recognized=nonEmpty.filter(x=>x.recognized).length;
    const initialPaths=pathsIn(createFilesystem()),currentPaths=pathsIn(state.filesystem),created=[...currentPaths].filter(path=>!initialPaths.has(path)).length;
    const values=[['Commands entered',String(nonEmpty.length)],['Recognized commands',String(recognized)],['Unrecognized commands',String(nonEmpty.length-recognized)],['Directories visited',String(state.session.directoriesVisited.length)],['Created items retained',String(created)],['Session duration',formatDuration(state.session.durationMs??Date.now()-Date.parse(state.session.startedAt))],['Final working directory',state.currentDirectory]];
    const stats=doc.querySelector('#result-stats'); stats?.replaceChildren();
    values.forEach(([label,value])=>{const dt=doc.createElement('dt'),dd=doc.createElement('dd');dt.textContent=label;dd.textContent=value;stats?.append(dt,dd);});
    const transcript=doc.querySelector('#result-transcript'); transcript?.replaceChildren();
    nonEmpty.forEach(entry=>{const li=doc.createElement('li');li.textContent=entry.text;transcript?.append(li);});
  };
  const completeSession = () => { const now=new Date();state.session.status='completed';state.session.completedAt=now.toISOString();state.session.durationMs=Math.max(0,now-Date.parse(state.session.startedAt));saveState(state,storage);submitAnonymousCompletedSession(state.session,view.fetch?.bind(view),view.sessionStorage);input.disabled=true;showResult(); };
  const clear = () => {
    renderer.clear();
    input.value = '';
    renderer.updatePrompt(state.currentDirectory);
    renderer.scroll();
  };
  let historyIndex=state.commandHistory.length;
  const complete=()=>completeTerminalInput(input,state,engine.fs,Object.keys(commands),choices=>{renderer.output({stdout:[choices.join('  ')],stderr:[]});renderer.scroll();});
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
      state.session.commands.push({text:source,order:state.session.commands.length+1,submittedAt:new Date().toISOString(),elapsedMs:Math.max(0,Date.now()-Date.parse(state.session.startedAt)),empty:false,recognized:output.exitCode!==127});
      if (!state.session.directoriesVisited.includes(state.currentDirectory)) state.session.directoriesVisited.push(state.currentDirectory);
      if (output.exit) { renderer.output({stdout:['logout'],stderr:[]});renderer.scroll();completeSession();return; }
      if (output.clear) renderer.clear();
      else renderer.output(output);
      saveState(state, storage);
    } else { state.session.commands.push({text:source,order:state.session.commands.length+1,submittedAt:new Date().toISOString(),elapsedMs:Math.max(0,Date.now()-Date.parse(state.session.startedAt)),empty:true,recognized:true});saveState(state,storage); }
    renderer.updatePrompt(state.currentDirectory);
    renderer.scroll();
  };

  input.addEventListener('keydown', event => {
    if(event.key==='ArrowUp'||event.key==='ArrowDown'){event.preventDefault();historyIndex=Math.max(0,Math.min(state.commandHistory.length,historyIndex+(event.key==='ArrowUp'?-1:1)));input.value=state.commandHistory[historyIndex]||'';return;}
    if(event.key==='Tab'){event.preventDefault();complete();return;}
    if(event.ctrlKey&&event.key.toLowerCase()==='c'){event.preventDefault();renderer.command(state.currentDirectory,`${input.value}^C`);input.value='';renderer.scroll();return;}
    if(event.ctrlKey&&event.key.toLowerCase()==='d'&&!input.value){event.preventDefault();input.value='exit';submit();return;}
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
    input.value='exit';submit();
  });
  restart?.addEventListener('click',()=>{clearState(storage);view.location.reload();});
  terminal.addEventListener('click', () => input.focus());
  if(state.session.status==='completed') showResult(); else { renderer.updatePrompt(state.currentDirectory);input.focus(); }
  initializedDocuments.add(doc);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initializeSession(), { once: true });
} else {
  initializeSession();
}
