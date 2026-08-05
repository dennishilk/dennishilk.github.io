import { parseShell } from './command-parser.js';
import { commands } from './command-registry.js';
import { VirtualFilesystem, LIMITS } from './virtual-filesystem.js';

export class ShellEngine {
  constructor(state) { this.state=state; this.fs=new VirtualFilesystem(state.filesystem, { home: state.environment?.HOME }); }
  execute(source) {
    const parsed=parseShell(source);if(parsed.error)return this.finish({stdout:[],stderr:[parsed.error],exitCode:2});if(!parsed.tokens.length)return this.finish({stdout:[],stderr:[],exitCode:0});
    const commandsToRun=[];let current=[];let chain=';';
    for(const token of parsed.tokens){if(token.type==='op'&&[';','&&','||'].includes(token.value)){commandsToRun.push({chain,tokens:current});current=[];chain=token.value;}else current.push(token);}commandsToRun.push({chain,tokens:current});
    let last={stdout:[],stderr:[],exitCode:this.state.lastExitCode??0};
    for(const item of commandsToRun){if(!item.tokens.length)return this.finish({stdout:[],stderr:['bash: syntax error: unexpected end of file'],exitCode:2});if(item.chain==='&&'&&last.exitCode!==0)continue;if(item.chain==='||'&&last.exitCode===0)continue;last=this.executePipeline(item.tokens,last.exitCode);}
    return this.finish(last);
  }
  executePipeline(tokens,lastExitCode=this.state.lastExitCode??0){
    const stages=[[]];const redir={stdin:null,stdout:null,stderr:null,appendOut:false,appendErr:false,stderrToStdout:false};
    for(let i=0;i<tokens.length;i++){const t=tokens[i];if(t.type==='op'){
      if(t.value==='|'){if(!stages.at(-1).length)return {stdout:[],stderr:['bash: syntax error near unexpected token `|\''],exitCode:2};stages.push([]);continue;}
      const next=tokens[++i];if(!next||next.type!=='word')return {stdout:[],stderr:[`bash: syntax error near unexpected token '${t.value}'`],exitCode:2};
      if(t.value==='<')redir.stdin=next.value;else if(t.value==='>'||t.value==='>>'){redir.stdout=next.value;redir.appendOut=t.value==='>>';}else if(t.value==='2>'||t.value==='2>>'){if(next.value==='&1')redir.stderrToStdout=true;else{redir.stderr=next.value;redir.appendErr=t.value==='2>>';}}
    }else stages.at(-1).push(t.value);}
    if(stages.length>LIMITS.pipelineStages)return {stdout:[],stderr:['bash: pipeline too long'],exitCode:2};let stdin='';if(redir.stdin){const p=this.fs.get(redir.stdin,this.state.currentDirectory);if(!p||p.type!=='file'||this.fs.denied(redir.stdin))return {stdout:[],stderr:[`bash: ${redir.stdin}: No such file or directory`],exitCode:1};stdin=p.content;}
    let output={stdout:[],stderr:[],exitCode:0};for(let words of stages){if(!words.length)return {stdout:[],stderr:['bash: syntax error: unexpected end of file'],exitCode:2};words=words.map(x=>x.replace(/^\$\?$/,String(lastExitCode)).replace(/\$([A-Za-z_][A-Za-z0-9_]*)/g,(_,k)=>this.state.environment[k]??''));const alias=this.state.aliases[words[0]];if(alias){const bits=alias.split(/\s+/);words=[...bits,...words.slice(1)];}const [name,...args]=words,handler=commands[name];output=handler?handler(args,{state:this.state,fs:this.fs,stdin}):{stdout:[],stderr:[`bash: ${name}: command not found`],exitCode:127};stdin=output.stdout.join('\n')+(output.stdout.length?'\n':'');if(output.stderr.length)break;}
    if(redir.stderrToStdout)output.stdout=[...output.stdout,...output.stderr],output.stderr=[];
    if(redir.stderr==='/dev/null')output.stderr=[];
    if(redir.stdout==='/dev/null')output.stdout=[];else if(redir.stdout){const e=this.writeRedirect(redir.stdout,output.stdout.join('\n')+(output.stdout.length?'\n':''),redir.appendOut);if(e)return e;output.stdout=[];}
    return output;
  }
  writeRedirect(outputFile,data,append){const path=(outputFile.startsWith('/')?outputFile:`${this.state.currentDirectory}/${outputFile}`).replace(/\/+/g,'/'),existing=this.fs.get(path);if(this.fs.denied(path,true))return {stdout:[],stderr:[`bash: ${outputFile}: Permission denied`],exitCode:1};if(data.length>LIMITS.fileSize)return {stdout:[],stderr:[`bash: ${outputFile}: File too large`],exitCode:1};if(existing){if(existing.type!=='file')return {stdout:[],stderr:[`bash: ${outputFile}: Is a directory`],exitCode:1};if(existing.protected||existing.owner!=='visitor')return {stdout:[],stderr:[`bash: ${outputFile}: Permission denied`],exitCode:1};existing.content=(append?existing.content:'')+data;existing.modified=new Date().toISOString();}else{const e=this.fs.add(path,{name:'',type:'file',owner:'visitor',group:'visitor',mode:'-rw-r--r--',content:data,created:new Date().toISOString(),modified:new Date().toISOString(),protected:false});if(e)return {stdout:[],stderr:[`bash: ${outputFile}: ${e}`],exitCode:1};}return null;}
  finish(output){this.state.lastExitCode=output.exitCode??0;this.state.environment.PWD=this.state.currentDirectory;for(const key of ['stdout','stderr']){let bytes=0;output[key]=(output[key]||[]).filter((line,i)=>i<LIMITS.outputLines&&(bytes+=String(line).length+1)<=LIMITS.outputBytes);}return output;}
}
