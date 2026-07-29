import { ShellEngine } from '../debian-server/shell-engine.js';
import { TerminalRenderer } from '../debian-server/terminal-renderer.js';
import { loadWorkstationState, resetWorkstationState, saveWorkstationState } from './workstation-state.js';

export function initializeWorkstation(doc=document, view=window, storage=view.localStorage) {
  const terminal=doc.querySelector('#debian-terminal'),history=doc.querySelector('#terminal-history'),input=doc.querySelector('#terminal-input'),prompt=doc.querySelector('#terminal-prompt-text');
  if(!terminal||!history||!input||!prompt)return;
  const state=loadWorkstationState(storage),engine=new ShellEngine(state),renderer=new TerminalRenderer(terminal,history,prompt,{user:'michael',hostname:'workstation',home:'/home/michael'});
  renderer.line('Debian GNU/Linux 13 (trixie)','debian-terminal-message');
  renderer.line('Last login: Wed Jul 29 08:14:32 2026 on tty1','debian-terminal-message');
  renderer.updatePrompt(state.currentDirectory);
  const submit=()=>{const source=input.value;input.value='';renderer.command(state.currentDirectory,source);if(!source.trim()){renderer.scroll();return;}state.commandHistory.push(source);const result=engine.execute(source);if(result.clear)renderer.clear();else renderer.output(result);if(result.exit)renderer.line('This workstation remains available in the browser. Use “Leave workstation” to return.','debian-terminal-message');renderer.updatePrompt(state.currentDirectory);saveWorkstationState(state,storage);renderer.scroll();};
  input.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();submit();}else if(event.key==='ArrowUp'){event.preventDefault();input.value=state.commandHistory.at(-1)||'';}});
  terminal.addEventListener('click',()=>input.focus());
  doc.querySelector('#workstation-reset')?.addEventListener('click',()=>{resetWorkstationState(storage);view.location.reload();});
  input.focus();
}
if(typeof document!=='undefined')initializeWorkstation();
