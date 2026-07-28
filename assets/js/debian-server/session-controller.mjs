import { ShellEngine } from './shell-engine.mjs';
import { clearState, loadState, saveState } from './session-state.mjs';
import { TerminalRenderer } from './terminal-renderer.mjs';

const terminal=document.querySelector('#debian-terminal'), history=document.querySelector('#terminal-history'), input=document.querySelector('#terminal-input'), prompt=document.querySelector('#terminal-prompt-text'), exitLink=document.querySelector('#session-exit');
if(terminal&&history&&input&&prompt){
  const state=loadState(), engine=new ShellEngine(state), renderer=new TerminalRenderer(terminal,history,prompt);
  const leave=()=>{clearState();window.location.assign('/museum/debian-server-experiment/');};
  const clear=()=>{renderer.clear();input.value='';renderer.updatePrompt(state.currentDirectory);renderer.scroll();};
  const submit=()=>{const source=input.value,cwd=state.currentDirectory;renderer.command(cwd,source);input.value='';if(source.trim()){state.commandHistory.push(source.trim());if(state.commandHistory.length>200)state.commandHistory.shift();const output=engine.execute(source);if(output.exit){leave();return;}if(output.clear)renderer.clear();else renderer.output(output);saveState(state);}renderer.updatePrompt(state.currentDirectory);renderer.scroll();};
  input.addEventListener('keydown',event=>{if(event.ctrlKey&&event.key.toLowerCase()==='l'){event.preventDefault();clear();return;}if(event.key==='Enter'){event.preventDefault();submit();}});
  exitLink?.addEventListener('click',event=>{event.preventDefault();leave();});
  terminal.addEventListener('click',()=>input.focus());renderer.updatePrompt(state.currentDirectory);input.focus();
}
