import { promptPath } from './path-utils.js';
export class TerminalRenderer {
  constructor(terminal, history, prompt, identity = {}) { this.terminal=terminal;this.history=history;this.prompt=prompt;this.user=identity.user||'visitor';this.hostname=identity.hostname||'lab-node';this.home=identity.home; }
  displayPath(cwd) { return this.home&&(cwd===this.home||cwd.startsWith(`${this.home}/`))?`~${cwd.slice(this.home.length)}`:promptPath(cwd); }
  promptText(cwd) { return `${this.user}@${this.hostname}:${this.displayPath(cwd)}$`; }
  updatePrompt(cwd) { this.prompt.replaceChildren();for(const [text,className] of [[this.user,'debian-prompt-user'],['@',''],[this.hostname,'debian-prompt-host'],[':',''],[this.displayPath(cwd),'debian-prompt-path'],['$','debian-prompt-mark']]){const part=this.prompt.ownerDocument.createElement('span');part.textContent=text;if(className)part.className=className;this.prompt.append(part);}if(!this.prompt.ownerDocument?.defaultView)this.prompt.textContent=this.promptText(cwd); }
  updateMailPrompt() { this.prompt.replaceChildren();const part=this.prompt.ownerDocument.createElement('span');part.textContent='mail>';part.className='debian-prompt-user';this.prompt.append(part);if(!this.prompt.ownerDocument?.defaultView)this.prompt.textContent='mail>'; }
  line(text,className) { const element=document.createElement('div');element.className=className;element.textContent=text;this.history.append(element); }
  command(cwd,text) { this.line(`${this.promptText(cwd)}${text ? ` ${text}` : ''}`,'debian-terminal-command'); }
  mailCommand(text) { this.line(`mail>${text ? ` ${text}` : ''}`,'debian-terminal-command'); }
  output(result) { result.stdout.forEach((line,index)=>{const styled=result.styledLines?.[index];if(!styled)return this.line(line,'debian-terminal-output');const element=document.createElement('div');element.className='debian-terminal-output debian-terminal-listing';styled.forEach(token=>{const span=document.createElement('span');span.textContent=token.text;span.className=`debian-entry debian-entry-${token.type}`;if(token.type!=='file')span.setAttribute('aria-label',`${token.text}, ${token.type}`);element.append(span);});this.history.append(element);});result.stderr.forEach(line=>this.line(line,'debian-terminal-error')); }
  clear() { this.history.replaceChildren(); }
  scroll() { this.terminal.scrollTop=this.terminal.scrollHeight; }
}
