import { ShellEngine } from '../debian-server/shell-engine.js';
import { TerminalRenderer } from '../debian-server/terminal-renderer.js';
import { loadWorkstationState, resetWorkstationState, saveWorkstationState } from './workstation-state.js';
import { commands } from '../debian-server/command-registry.js';
import { completeTerminalInput } from '../debian-server/tab-completion.js';

export function initializeWorkstation(doc=document, view=window, storage=view.localStorage) {
  const terminal=doc.querySelector('#debian-terminal'),history=doc.querySelector('#terminal-history'),input=doc.querySelector('#terminal-input'),prompt=doc.querySelector('#terminal-prompt-text');
  if(!terminal||!history||!input||!prompt)return;
  const state=loadWorkstationState(storage),engine=new ShellEngine(state),renderer=new TerminalRenderer(terminal,history,prompt,{user:'michael',hostname:'workstation',home:'/home/michael'});
  renderer.line('Debian GNU/Linux 13 (trixie)','debian-terminal-message');
  renderer.line('Last login: session record unavailable on tty1','debian-terminal-message');
  renderer.updatePrompt(state.currentDirectory);
  const submit=()=>{const source=input.value;input.value='';renderer.command(state.currentDirectory,source);if(!source.trim()){renderer.scroll();input.focus();return;}state.commandHistory.push(source);const result=engine.execute(source);if(result.clear)renderer.clear();else renderer.output(result);if(result.exit)renderer.line('This workstation remains available in the browser. Use “Leave workstation” to return.','debian-terminal-message');renderer.updatePrompt(state.currentDirectory);saveWorkstationState(state,storage);renderer.scroll();input.focus();};
  let historyIndex=state.commandHistory.length;
  input.addEventListener('keydown',event=>{
    if(event.key==='Enter'){event.preventDefault();historyIndex=state.commandHistory.length+1;submit();}
    else if(event.key==='Tab'){event.preventDefault();completeTerminalInput(input,state,engine.fs,Object.keys(commands),choices=>{renderer.output({stdout:[choices.join('  ')],stderr:[]});renderer.scroll();});input.focus();}
    else if(event.key==='ArrowUp'||event.key==='ArrowDown'){event.preventDefault();historyIndex=Math.max(0,Math.min(state.commandHistory.length,historyIndex+(event.key==='ArrowUp'?-1:1)));input.value=state.commandHistory[historyIndex]||'';input.selectionStart=input.selectionEnd=input.value.length;}
    else if(event.key==='Escape'){input.blur();}
    else if(event.ctrlKey&&event.key.toLowerCase()==='c'){event.preventDefault();renderer.command(state.currentDirectory,`${input.value}^C`);input.value='';renderer.scroll();}
    else if(event.ctrlKey&&event.key.toLowerCase()==='l'){event.preventDefault();renderer.clear();renderer.updatePrompt(state.currentDirectory);renderer.scroll();}
  });
  terminal.addEventListener('click',()=>input.focus());
  doc.querySelector('#workstation-reset')?.addEventListener('click',()=>{resetWorkstationState(storage);view.location.reload();});
  input.focus();
}
if(typeof document!=='undefined')initializeWorkstation();
