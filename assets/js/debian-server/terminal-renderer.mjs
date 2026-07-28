import { promptPath } from './path-utils.mjs';
export class TerminalRenderer {
  constructor(terminal, history, prompt) { this.terminal=terminal;this.history=history;this.prompt=prompt; }
  promptText(cwd) { return `visitor@lab-node:${promptPath(cwd)}$`; }
  updatePrompt(cwd) { this.prompt.textContent=this.promptText(cwd); }
  line(text,className) { const element=document.createElement('div');element.className=className;element.textContent=text;this.history.append(element); }
  command(cwd,text) { this.line(`${this.promptText(cwd)}${text ? ` ${text}` : ''}`,'debian-terminal-command'); }
  output(result) { result.stdout.forEach(line=>this.line(line,'debian-terminal-output'));result.stderr.forEach(line=>this.line(line,'debian-terminal-error')); }
  clear() { this.history.replaceChildren(); }
  scroll() { this.terminal.scrollTop=this.terminal.scrollHeight; }
}
