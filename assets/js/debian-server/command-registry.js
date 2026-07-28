import { HOME, baseName, normalizePath, parentPath } from './path-utils.js';
import { LIMITS, cloneNode, newDirectory, newFile } from './virtual-filesystem.js';

const result = (stdout = [], stderr = [], extra = {}) => ({ stdout, stderr, exitCode: stderr.length ? 1 : 0, ...extra });
const reason = (fs, path, cwd) => fs.denied(normalizePath(path, cwd)) ? 'Permission denied' : 'No such file or directory';
const formatTime = iso => new Date(iso).toLocaleString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' }).replace(',', '');
const longLine = node => `${node.mode} 1 ${node.owner} ${node.group} ${node.type === 'file' ? new TextEncoder().encode(node.content).length : 4096} ${formatTime(node.modified)} ${node.name}`;

function cd(args, ctx) {
  if (args.length > 1) return result([], ['bash: cd: too many arguments']);
  const raw = args[0] || HOME, path = normalizePath(raw, ctx.state.currentDirectory), node = ctx.fs.get(path);
  if (!node) return result([], [`bash: cd: ${raw}: ${reason(ctx.fs, path)}`]);
  if (ctx.fs.denied(path)) return result([], [`bash: cd: ${raw}: Permission denied`]);
  if (node.type !== 'directory') return result([], [`bash: cd: ${raw}: Not a directory`]);
  ctx.state.currentDirectory = path; return result();
}
function ls(args, ctx) {
  let all = false, long = false, invalid = null; const paths = [];
  for (const arg of args) { if (arg.startsWith('-') && arg !== '-') { for (const flag of arg.slice(1)) { if (flag === 'a') all = true; else if (flag === 'l') long = true; else invalid = flag; } } else paths.push(arg); }
  if (invalid) return result([], [`ls: invalid option -- '${invalid}'`]);
  const targets = paths.length ? paths : ['.'], out = [], err = [];
  targets.forEach((raw, index) => { const path = normalizePath(raw, ctx.state.currentDirectory), node = ctx.fs.get(path); if (!node || ctx.fs.denied(path)) { err.push(`ls: cannot access '${raw}': ${reason(ctx.fs, path)}`); return; } if (targets.length > 1) out.push(`${index ? '\n' : ''}${raw}:`); if (node.type === 'file') out.push(long ? longLine(node) : node.name); else { let nodes = Object.values(node.children).filter(n => all || !n.name.startsWith('.')).sort((a,b) => a.name.localeCompare(b.name)); if (all) nodes = [{ ...node, name: '.' }, { ...(ctx.fs.get(parentPath(path)) || node), name: '..' }, ...nodes]; if (long) { out.push(`total ${nodes.length * 4}`); out.push(...nodes.map(longLine)); } else if (nodes.length) out.push(nodes.map(n => n.name).join('  ')); } });
  return result(out, err);
}
function read(command, args, ctx) {
  let count = 10, paths = args;
  if ((command === 'head' || command === 'tail') && args[0] === '-n') { count = Number(args[1]); paths = args.slice(2); if (!Number.isInteger(count) || count < 0) return result([], [`${command}: invalid number of lines: '${args[1]}'`]); }
  if (!paths.length) return result([], [`${command}: missing file operand`]);
  const out = [], err = [];
  for (const raw of paths) { const path = normalizePath(raw, ctx.state.currentDirectory), node = ctx.fs.get(path); if (!node || ctx.fs.denied(path)) { err.push(`${command}: ${raw}: ${reason(ctx.fs, path)}`); continue; } if (node.type === 'directory') { err.push(`${command}: ${raw}: Is a directory`); continue; } let lines = node.content.replace(/\n$/, '').split('\n'); if (command === 'head') lines = lines.slice(0, count); if (command === 'tail') lines = lines.slice(-count); out.push(...lines); }
  return result(out, err);
}
function mkdir(args, ctx) { let parents = false; const paths = args.filter(a => a === '-p' ? !(parents = true) : true); if (!paths.length) return result([], ['mkdir: missing operand']); const err = []; for (const raw of paths) { const target = normalizePath(raw, ctx.state.currentDirectory); if (ctx.fs.denied(target, true)) { err.push(`mkdir: cannot create directory '${raw}': Permission denied`); continue; } const segments = target.split('/').filter(Boolean), built = []; for (let i=0;i<segments.length;i++) { built.push(segments[i]); const path = `/${built.join('/')}`, existing = ctx.fs.get(path); if (existing) { if (i === segments.length-1 && !parents) err.push(`mkdir: cannot create directory '${raw}': File exists`); else if (existing.type !== 'directory') { err.push(`mkdir: cannot create directory '${raw}': Not a directory`); break; } } else if (!parents && i < segments.length-1) { err.push(`mkdir: cannot create directory '${raw}': No such file or directory`); break; } else { const e = ctx.fs.add(path, newDirectory()); if (e) { err.push(`mkdir: cannot create directory '${raw}': ${e}`); break; } } } } return result([], err); }
function touch(args, ctx) { if (!args.length) return result([], ['touch: missing file operand']); const err=[]; for(const raw of args){const path=normalizePath(raw,ctx.state.currentDirectory), node=ctx.fs.get(path); if(ctx.fs.denied(path,true)) err.push(`touch: cannot touch '${raw}': Permission denied`); else if(node?.type==='directory') err.push(`touch: setting times of '${raw}': Is a directory`); else if(node) node.modified=new Date().toISOString(); else {const e=ctx.fs.add(path,newFile()); if(e) err.push(`touch: cannot touch '${raw}': ${e}`);}} return result([],err); }
function rm(args, ctx) { let recursive=false, force=false; const paths=[]; for(const a of args){if(/^-[rf]+$/.test(a)){recursive ||= a.includes('r'); force ||= a.includes('f');}else paths.push(a);} if(!paths.length)return result([],['rm: missing operand']); const err=[]; for(const raw of paths){const path=normalizePath(raw,ctx.state.currentDirectory),node=ctx.fs.get(path); if(path==='/'||ctx.fs.denied(path,true)){err.push(`rm: cannot remove '${raw}': Permission denied`);continue;} if(!node){if(!force)err.push(`rm: cannot remove '${raw}': No such file or directory`);continue;} if(node.type==='directory'&&!recursive){err.push(`rm: cannot remove '${raw}': Is a directory`);continue;} ctx.fs.remove(path);} return result([],err); }
function rmdir(args,ctx){if(!args.length)return result([],['rmdir: missing operand']);const err=[];for(const raw of args){const path=normalizePath(raw,ctx.state.currentDirectory),n=ctx.fs.get(path);let why=!n?'No such file or directory':ctx.fs.denied(path,true)?'Permission denied':n.type!=='directory'?'Not a directory':Object.keys(n.children).length?'Directory not empty':null;if(why)err.push(`rmdir: failed to remove '${raw}': ${why}`);else ctx.fs.remove(path);}return result([],err);}
function transfer(command,args,ctx){let recursive=false;if(command==='cp'&&args[0]==='-r'){recursive=true;args=args.slice(1);}if(args.length!==2)return result([],[`${command}: missing file operand`]);const [srcRaw,dstRaw]=args,srcPath=normalizePath(srcRaw,ctx.state.currentDirectory),src=ctx.fs.get(srcPath);if(!src)return result([],[`${command}: cannot stat '${srcRaw}': No such file or directory`]);if(ctx.fs.denied(srcPath))return result([],[`${command}: cannot open '${srcRaw}': Permission denied`]);if(command==='cp'&&src.type==='directory'&&!recursive)return result([],[`cp: -r not specified; omitting directory '${srcRaw}'`]);let dstPath=normalizePath(dstRaw,ctx.state.currentDirectory),dst=ctx.fs.get(dstPath);if(dst?.type==='directory')dstPath=normalizePath(`${dstPath}/${src.name}`);if(ctx.fs.denied(dstPath,true))return result([],[`${command}: cannot create '${dstRaw}': Permission denied`]);if(src.type==='directory'&&(dstPath===srcPath||dstPath.startsWith(`${srcPath}/`)))return result([],[`${command}: cannot move '${srcRaw}' to a subdirectory of itself, '${dstRaw}'`]);if(command==='cp'&&ctx.fs.count()+countNodes(src)>LIMITS.objects)return result([],['cp: error copying: No space left on device']);if(ctx.fs.get(dstPath))ctx.fs.remove(dstPath);const e=ctx.fs.add(dstPath,command==='cp'?cloneNode(src,baseName(dstPath)):src);if(e)return result([],[`${command}: cannot create '${dstRaw}': ${e}`]);if(command==='mv')ctx.fs.remove(srcPath);return result();}
function countNodes(root){let n=0,stack=[root];while(stack.length){const x=stack.pop();n++;if(x.type==='directory')stack.push(...Object.values(x.children));}return n;}

export const commands = {
  pwd: (a,c)=>result([c.state.currentDirectory]), cd, ls, cat:(a,c)=>read('cat',a,c), head:(a,c)=>read('head',a,c), tail:(a,c)=>read('tail',a,c),
  whoami:()=>result(['visitor']), id:()=>result(['uid=1000(visitor) gid=1000(visitor) groups=1000(visitor)']), hostname:()=>result(['lab-node']),
  uname:(a)=>{const values={'-s':'Linux','-r':'6.12.38+deb13-amd64','-m':'x86_64','-a':'Linux lab-node 6.12.38+deb13-amd64 #1 SMP PREEMPT_DYNAMIC Debian 6.12.38-1 (2026-07-20) x86_64 GNU/Linux'};return a.length>1||a[0]&&!values[a[0]]?result([], [`uname: invalid option -- '${a[0]}'`]):result([values[a[0]]||'Linux']);},
  date:()=>result([new Date().toLocaleString('en-US',{weekday:'short',month:'short',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false,timeZone:'UTC',year:'numeric',timeZoneName:'short'}).replace(',','')]),
  mkdir,touch,rm,rmdir,cp:(a,c)=>transfer('cp',a,c),mv:(a,c)=>transfer('mv',a,c), clear:()=>result([],[],{clear:true}),
  history:(a,c)=>result(c.state.commandHistory.map((line,i)=>`${String(i+1).padStart(4)}  ${line}`)),
  help:()=>result(['Available commands:','pwd  cd  ls  clear  history','cat  head  tail','whoami  id  hostname  uname  date','mkdir  touch  rm  rmdir  cp  mv','help  exit']), exit:()=>result([],[],{exit:true})
};
