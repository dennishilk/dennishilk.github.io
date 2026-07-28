import { parseCommand } from './command-parser.mjs';
import { commands } from './command-registry.mjs';
import { VirtualFilesystem, LIMITS } from './virtual-filesystem.mjs';

export class ShellEngine {
  constructor(state) { this.state=state; this.fs=new VirtualFilesystem(state.filesystem); }
  execute(source) { const parsed=parseCommand(source); if(parsed.error)return {stdout:[],stderr:[parsed.error],exitCode:2}; if(!parsed.tokens.length)return {stdout:[],stderr:[],exitCode:0}; const [name,...args]=parsed.tokens, handler=commands[name]; const output=handler?handler(args,{state:this.state,fs:this.fs}):{stdout:[],stderr:[`bash: ${name}: command not found`],exitCode:127}; for(const key of ['stdout','stderr'])if(output[key].length>LIMITS.outputLines)output[key]=[...output[key].slice(0,LIMITS.outputLines),`${name}: output limit reached`]; return output; }
}
