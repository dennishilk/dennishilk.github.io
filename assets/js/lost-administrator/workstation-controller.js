import { ShellEngine } from '../debian-server/shell-engine.js';
import { TerminalRenderer } from '../debian-server/terminal-renderer.js';
import { loadWorkstationState, resetWorkstationState, saveWorkstationState } from './workstation-state.js';
import { commands } from '../debian-server/command-registry.js';
import { completeTerminalInput } from '../debian-server/tab-completion.js';
import { MailClient } from './mail-client.js';

export function initializeWorkstation(doc=document, view=window, storage=view.localStorage) {
  const terminal=doc.querySelector('#debian-terminal'),history=doc.querySelector('#terminal-history'),input=doc.querySelector('#terminal-input'),prompt=doc.querySelector('#terminal-prompt-text');
  if(!terminal||!history||!input||!prompt)return;
  const state=loadWorkstationState(storage),engine=new ShellEngine(state),renderer=new TerminalRenderer(terminal,history,prompt,{user:'m.weber',hostname:'workstation',home:'/home/m.weber'});
  renderer.line('Debian GNU/Linux 13 (trixie)','debian-terminal-message');
  renderer.line('Last login: Fri Jul 31 17:41:26 UTC 2026 on tty1','debian-terminal-message');
  renderer.line("Type 'help' to see available commands.",'debian-terminal-message');
  renderer.updatePrompt(state.currentDirectory);
  let awaitingResetConfirmation=false,mailClient=null;
  const submit=()=>{const source=input.value;input.value='';if(mailClient){renderer.mailCommand(source);if(!source.trim()){renderer.scroll();input.focus();return;}const result=mailClient.execute(source);renderer.output(result);if(result.quitMail){mailClient=null;renderer.updatePrompt(state.currentDirectory);}else renderer.updateMailPrompt();saveWorkstationState(state,storage);renderer.scroll();input.focus();return;}renderer.command(state.currentDirectory,source);if(!source.trim()){renderer.scroll();input.focus();return;}state.commandHistory.push(source);if(state.commandHistory.length>200)state.commandHistory.shift();
    if(awaitingResetConfirmation){awaitingResetConfirmation=false;if(source==='YES'){resetWorkstationState(storage);view.location.reload();return;}renderer.line('Reset cancelled. The workstation was not changed.','debian-terminal-message');saveWorkstationState(state,storage);renderer.updatePrompt(state.currentDirectory);renderer.scroll();input.focus();return;}
    const result=engine.execute(source);if(result.clear)renderer.clear();else renderer.output(result);if(result.enterMail){mailClient=new MailClient(state);renderer.output(mailClient.start());renderer.updateMailPrompt();}if(result.resetWorkstation){awaitingResetConfirmation=true;renderer.line("This will restore Michael's workstation to its initial state.",'debian-terminal-message');renderer.line('Type YES to continue:','debian-terminal-message');}if(!mailClient)renderer.updatePrompt(state.currentDirectory);saveWorkstationState(state,storage);renderer.scroll();if(result.exit){view.location.assign('/lost-administrator/');return;}input.focus();};
  let historyIndex=state.commandHistory.length;
  input.addEventListener('keydown',event=>{
    if(event.key==='Enter'&&!event.isComposing){event.preventDefault();historyIndex=state.commandHistory.length+1;submit();}
    else if(event.key==='Tab'&&!mailClient){event.preventDefault();completeTerminalInput(input,state,engine.fs,Object.keys(commands),choices=>{renderer.output({stdout:[choices.join('  ')],stderr:[]});renderer.scroll();});input.focus();}
    else if((event.key==='ArrowUp'||event.key==='ArrowDown')&&!mailClient){event.preventDefault();historyIndex=Math.max(0,Math.min(state.commandHistory.length,historyIndex+(event.key==='ArrowUp'?-1:1)));input.value=state.commandHistory[historyIndex]||'';input.selectionStart=input.selectionEnd=input.value.length;}
    else if(event.key==='Escape'){input.blur();}
    else if(event.ctrlKey&&event.key.toLowerCase()==='c'){event.preventDefault();if(mailClient){renderer.mailCommand(`${input.value}^C`);mailClient=null;renderer.updatePrompt(state.currentDirectory);saveWorkstationState(state,storage);}else renderer.command(state.currentDirectory,`${input.value}^C`);input.value='';renderer.scroll();}
    else if(event.ctrlKey&&event.key.toLowerCase()==='l'){event.preventDefault();renderer.clear();mailClient?renderer.updateMailPrompt():renderer.updatePrompt(state.currentDirectory);renderer.scroll();}
  });
  terminal.addEventListener('click',()=>{if(!view.getSelection?.()?.toString())input.focus();});
  const finePointer=!view.matchMedia||view.matchMedia('(pointer: fine)').matches;
  view.addEventListener?.('focus',()=>{if(finePointer&&!doc.activeElement)input.focus();});
  if(finePointer)input.focus();
}
if(typeof document!=='undefined')initializeWorkstation();
