import { CANONICAL_UPTIME_SECONDS, formatClock, formatIdle, formatLogin, whoRows } from './unix-simulation.js';

export const SHELL_LIMITS = Object.freeze({ command: 512, arguments: 32, history: 100, scrollback: 400, output: 24000, file: 12000, results: 50 });
const UNSUPPORTED = /(?:\||[<>;`]|\$\(|&&|\|\||(?:^|\s)&(?:\s|$))/;

export function tokenize(source) {
  if (source.length > SHELL_LIMITS.command) return { error: `Input exceeds ${SHELL_LIMITS.command} characters.` };
  if (UNSUPPORTED.test(source)) return { error: 'Pipes, redirection, substitution, and command chaining are not available in this exhibit.' };
  const words = []; let word = ''; let quote = ''; let escaped = false; let active = false;
  for (const character of source.trim()) {
    if (escaped) { word += character; escaped = false; active = true; continue; }
    if (character === '\\') { escaped = true; active = true; continue; }
    if (quote) { if (character === quote) quote = ''; else word += character; active = true; continue; }
    if (character === '"' || character === "'") { quote = character; active = true; continue; }
    if (/\s/.test(character)) { if (active) { words.push(word); word = ''; active = false; } } else { word += character; active = true; }
  }
  if (escaped) word += '\\';
  if (quote) return { error: 'Unclosed quote.' };
  if (active) words.push(word);
  if (words.length > SHELL_LIMITS.arguments + 1) return { error: `Too many arguments (maximum ${SHELL_LIMITS.arguments}).` };
  return { words };
}

const textFile = (content, owner = 'visitor') => ({ type: 'file', content, owner, mode: '-r--r--r--', date: 'Jul 31  2026' });
const directory = (children = {}, access = true) => ({ type: 'dir', children, access, owner: 'root', mode: 'dr-xr-xr-x', date: 'Jul 31  2026' });
const VFS = directory({
  bin: directory(), dev: directory(), tmp: directory(),
  etc: directory({ passwd: textFile('root:*:0:0:System Administrator:/:/bin/sh\noperator:*:10:10:System Operator:/usr/operator:/bin/sh\ns.harper:*:1001:100:Staff:/usr/s.harper:/bin/sh\nm.weber:*:1002:100:Staff:/usr/m.weber:/bin/sh\nh.sullivan:*:1003:100:Staff:/usr/h.sullivan:/bin/sh\nf.kessler:*:1004:100:Staff:/usr/f.kessler:/bin/sh\nvisitor:*:1042:100:Museum Visitor:/usr/visitor:/bin/sh', 'root') }),
  usr: directory({
    visitor: directory({ '.profile': textFile('PATH=/bin:/usr/bin\n# Read-only museum account'), README: textFile('Welcome to cs-vax1.\nType help for available commands.\nThis account has read-only access to selected company documentation.'), 'welcome.txt': textFile('One central computer serves many terminals. UNIX coordinates people, files, processes, printers, and mail while sharing finite computing resources.'), notes: textFile('Useful paths:\n  /cst/docs/time-sharing.txt\n  /cst/public/terminal-guide.txt\n  /cst/operations/printer-status.txt') }),
    's.harper': directory({}, false), 'm.weber': directory({}, false), 'h.sullivan': directory({}, false), 'f.kessler': directory({}, false), operator: directory({}, false)
  }),
  var: directory({ adm: directory({ motd: textFile('Chesapeake Signal Tech: Friday tape rotation begins at 18:00 UTC.', 'operator') }), mail: directory({}, false), spool: directory({}, false) }),
  cst: directory({
    docs: directory({ 'time-sharing.txt': textFile('TIME SHARING\n\nA central computer switches rapidly among work submitted from many terminals. Each user receives a protected account and the impression of a responsive personal machine.\n\nUNIX made this shared workplace manageable with identities, permissions, processes, a common filesystem, and small composable tools. CPU time, memory, disks, printers, and communications remained communal resources.\n\nCommands were more than syntax: who showed colleagues at work, ps exposed concurrent jobs, mail carried office messages, and permissions established boundaries. Chesapeake Signal Tech retained cs-vax1 because a maintained shared system remained dependable and useful.') }),
    operations: directory({ 'printer-status.txt': textFile('Engineering line printer: ONLINE\nQueue: 2 jobs\nRibbon inspected: Fri Jul 31 11:40 UTC\nNext maintenance: 18:00 UTC', 'operator') }),
    public: directory({ 'terminal-guide.txt': textFile('TERMINAL GUIDE\n\nType help for commands and man command for details.\nUse who to see shared sessions, ls to list files, and mail to read office notices.\nKeep output brief when colleagues share the printer and host.\nLog out when finished so the terminal line is available.') })
  })
});

export function normalizePath(cwd, input = '.') {
  const parts = (input.startsWith('/') ? input : `${cwd}/${input}`).split('/'); const safe = [];
  for (const part of parts) { if (!part || part === '.') continue; if (part === '..') safe.pop(); else safe.push(part); }
  return `/${safe.join('/')}`;
}
function lookup(path) { let node = VFS; for (const part of path.split('/').filter(Boolean)) { if (node.type !== 'dir' || !node.access) return { denied: true }; node = node.children[part]; if (!node) return null; } return node?.access === false ? { denied: true } : node; }
function parentLookup(path) { const bits = path.split('/').filter(Boolean); const name = bits.pop() || '/'; return { parent: lookup(`/${bits.join('/')}`), name }; }
function getFile(state, raw, command) { const path = normalizePath(state.cwd, raw); const node = lookup(path); if (node?.denied) return { error: `${command}: ${raw}: Permission denied` }; if (!node) { const { parent } = parentLookup(path); return { error: parent?.denied ? `${command}: ${raw}: Permission denied` : `${command}: ${raw}: No such file or directory` }; } if (node.type !== 'file') return { error: `${command}: ${raw}: Is a directory` }; return { path, node }; }
const formatUnixDate = timestamp => { const d = new Date(timestamp); return `${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getUTCDay()]} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getUTCMonth()]} ${String(d.getUTCDate()).padStart(2, ' ')} ${formatClock(timestamp)} UTC ${d.getUTCFullYear()}`; };
const uptimeParts = simulation => { const seconds = CANONICAL_UPTIME_SECONDS + Math.floor((simulation.now - simulation.startTime) / 1000); return `${Math.floor(seconds / 86400)} days, ${Math.floor(seconds % 86400 / 3600)}:${String(Math.floor(seconds % 3600 / 60)).padStart(2, '0')}`; };
const activities = ['accounting', 'mail', 'vi', 'lpr', 'man', 'sh', 'compile', 'editor'];
const mailboxSeed = [
  ['operator', 'Friday tape rotation', 'The Friday tape rotation begins at 18:00 UTC. No action is needed from the visitor terminal.'],
  ['m.weber', 'Printer maintenance complete', 'Engineering printer maintenance is complete. The line printer is back online.'],
  ['h.sullivan', 'Documentation cabinet update', 'The shared documentation cabinet index has been updated. Current guides are also under /cst/public.'],
  ['s.harper', 'Staff terminal schedule', 'The afternoon terminal schedule is posted. Please log out when your session is complete.']
];

const definitions = [
  ['help','TERMINAL','help [command]','List commands or explain one command.','The command registry is the visitor map.'],
  ['date','SYSTEM','date','Show simulated UTC date and time.','A shared clock coordinated work across every terminal.'],
  ['uptime','SYSTEM','uptime','Show service time, users, and load.','Long uptime reflected the value of a carefully maintained central host.'],
  ['hostname','SYSTEM','hostname','Print the host name.','A hostname identified the shared computer reached by many terminals.'],
  ['uname','SYSTEM','uname [-a]','Identify the simulated operating environment.','UNIX supplied a recognizable environment across machines.'],
  ['ps','SYSTEM','ps [-e|-f]','Show a selected simulated process view.','Processes let one host keep many users’ jobs separate and concurrent.'],
  ['who','PEOPLE','who','List active login sessions.','Who revealed which people shared the machine at that moment.'],
  ['w','PEOPLE','w','Show sessions and their activity.','W joined the human and resource views of time sharing.'],
  ['users','PEOPLE','users','Print active account names.','Accounts made a communal computer legible.'],
  ['finger','PEOPLE','finger username','Show a small company-directory record.','Directories helped colleagues identify users on remote terminals.'],
  ['id','PEOPLE','id','Show the visitor identity and groups.','Identity and groups formed the basis of UNIX permissions.'],
  ['pwd','FILES','pwd','Print the virtual working directory.','A working directory located each user within the shared filesystem.'],
  ['ls','FILES','ls [-a|-l|-la] [path]','List a safe virtual directory.','Listings made shared disks navigable while permissions protected boundaries.'],
  ['cat','FILES','cat file [file]','Read selected virtual text files.','Cat made small stored records immediately available at a terminal.'],
  ['more','FILES','more file','Page through a virtual text file.','Paging conserved a terminal’s limited screen area.'],
  ['head','FILES','head [-n count] file','Show the first lines of a virtual file.','Small tools extracted useful views without changing the source.'],
  ['tail','FILES','tail [-n count] file','Show the last lines of a virtual file.','Operators used tail to inspect the newest lines of records.'],
  ['wc','FILES','wc [-l|-w|-c] file','Count lines, words, or characters.','Compact tools measured shared text predictably.'],
  ['grep','FILES','grep [-i|-n] pattern file','Find plain text in a virtual file.','Search turned growing shared documentation into useful information.'],
  ['find','FILES','find path -name filename','Find accessible virtual paths by name.','Find located records spread across shared disks.'],
  ['man','FILES','man command','Open an internal manual page.','Online manuals put operating knowledge beside the tools.'],
  ['mail','COMMUNICATION','mail [number|next|headers|quit]','Read the visitor mailbox.','Store-and-forward mail connected office staff before modern collaboration tools.'],
  ['history','TERMINAL','history','Show this session’s recent commands.','Recall reduced repetitive typing at character terminals.'],
  ['echo','TERMINAL','echo [text]','Print literal text.','Echo demonstrates the simple text streams at UNIX’s core.'],
  ['clear','TERMINAL','clear','Clear visible scrollback, not history.','A clear screen provided a fresh workspace without ending a session.'],
  ['logout','TERMINAL','logout','Close the visitor connection.','Logging out released a shared terminal line.', ['exit']],
  ['reset','TERMINAL','reset','Restore the canonical exhibit state.','Reset returns this browser simulation to its opening moment.']
];
export const COMMANDS = new Map(definitions.map(([name, group, usage, help, museum, aliases = []]) => [name, Object.freeze({ name, group, usage, help, museum, aliases })]));
const aliasMap = new Map(); for (const command of COMMANDS.values()) for (const alias of command.aliases) aliasMap.set(alias, command.name);
export function commandNames() { return [...COMMANDS.keys(), ...aliasMap.keys()].sort(); }

export class UnixShell {
  constructor(getSimulation) { this.getSimulation = getSimulation; this.reset(); }
  reset() { this.cwd = '/usr/visitor'; this.mode = 'shell'; this.history = []; this.historyIndex = 0; this.mailbox = mailboxSeed.map((item, index) => ({ number: index + 1, from: item[0], subject: item[1], body: item[2], read: false })); this.pager = null; this.currentMail = 0; this.notesSeen = new Set(); this.queuedAmbient = []; }
  prompt() { return `visitor@cs-vax1:${this.cwd}$ `; }
  complete(input) { const token = input.match(/(?:^|\s)([^\s]*)$/)?.[1] ?? ''; if (!input.trim().includes(' ')) { const matches = commandNames().filter(name => name.startsWith(token)); return { matches, value: matches.length === 1 ? `${matches[0]} ` : input }; } const base = token.includes('/') ? token.slice(0, token.lastIndexOf('/') + 1) : ''; const path = normalizePath(this.cwd, base || '.'); const node = lookup(path); if (!node || node.type !== 'dir') return { matches: [], value: input }; const prefix = token.slice(base.length); const matches = Object.keys(node.children).filter(name => !name.startsWith('.') && node.children[name].access !== false && name.startsWith(prefix)).sort().map(name => `${base}${name}${node.children[name].type === 'dir' ? '/' : ''}`); return { matches, value: matches.length === 1 ? input.slice(0, input.length - token.length) + matches[0] : input }; }
  queueAmbient(text) { if (this.mode === 'shell') return false; this.queuedAmbient.push(text); return true; }
  flushAmbient() { const items = this.queuedAmbient.splice(0); return items; }
  execute(source) {
    const parsed = tokenize(source); if (parsed.error) return this.result([parsed.error]); const words = parsed.words; if (!words.length) return this.result([]);
    this.history.push(source); if (this.history.length > SHELL_LIMITS.history) this.history.shift(); this.historyIndex = this.history.length;
    const name = aliasMap.get(words[0]) || words[0]; const command = COMMANDS.get(name); if (!command) return this.result([`${words[0]}: command not found. Type "help" for available commands.`]);
    const response = this.run(name, words.slice(1)); if (response === null) return this.result([]); if (response && !Array.isArray(response) && typeof response === 'object') return response; const result = typeof response === 'string' ? [response] : response;
    if (command.museum && !this.notesSeen.has(name)) { this.notesSeen.add(name); result.push('', '[MUSEUM NOTE]', command.museum); }
    return this.result(result);
  }
  result(lines, extra = {}) { const safe = lines.flatMap(line => String(line).split('\n')).slice(0, SHELL_LIMITS.scrollback); let size = 0; return { lines: safe.filter(line => (size += line.length + 1) <= SHELL_LIMITS.output), mode: this.mode, ...extra }; }
  run(name, args) {
    const sim = this.getSimulation(); const rows = whoRows(sim);
    if (name === 'help') { if (args[0]) { const key = aliasMap.get(args[0]) || args[0], c = COMMANDS.get(key); return c ? [`${c.name} — ${c.help}`, `Usage: ${c.usage}`, `Historical context: ${c.museum}`, ['date','uptime','who','w','users','finger','ps'].includes(key) ? 'Data: live simulation state.' : 'Data: local browser shell state.'] : [`help: no help for ${args[0]}`]; } return ['AVAILABLE COMMANDS', ...['SYSTEM','PEOPLE','FILES','COMMUNICATION','TERMINAL'].flatMap(group => ['', group, [...COMMANDS.values()].filter(c => c.group === group).map(c => c.name).join('  ')]), '', 'Try: man command']; }
    if (name === 'date') return [formatUnixDate(sim.now)];
    if (name === 'uptime') return [`${formatClock(sim.now)} up ${uptimeParts(sim)}, ${rows.length} users, load average: ${sim.load.map(v => v.toFixed(2)).join(', ')}`];
    if (name === 'hostname') return ['cs-vax1'];
    if (name === 'uname') return args.length === 0 ? ['UNIX'] : args.length === 1 && args[0] === '-a' ? ['UNIX cs-vax1 32V CST-6.2 VAX-11/780 (browser simulation)'] : [`uname: unsupported option '${args[0]}'`];
    if (name === 'who') return ['USER         TTY     LOGIN    IDLE', ...rows.map(r => `${r.username.padEnd(12)} ${r.tty.padEnd(7)} ${r.login.padEnd(8)} ${r.idle}`)];
    if (name === 'users') return [rows.map(r => r.username).join(' ')];
    if (name === 'w') return [`${formatClock(sim.now)} up ${uptimeParts(sim)}, ${rows.length} users, load average: ${sim.load.map(v => v.toFixed(2)).join(', ')}`, 'USER         TTY     LOGIN    IDLE   WHAT', ...rows.map((r,i) => `${r.username.padEnd(12)} ${r.tty.padEnd(7)} ${r.login.padEnd(8)} ${r.idle.padEnd(6)} ${activities[i % activities.length]}`)];
    if (name === 'id') return args.length ? ['id: this exhibit only identifies visitor'] : ['uid=1042(visitor) gid=100(staff) groups=100(staff),105(guests)'];
    if (name === 'finger') { if (args.length !== 1) return ['Usage: finger username']; const account = sim.sessions.find(s => s.username === args[0]); if (!account) return ['finger: user not found']; const names = { 'm.weber':'Michael Weber', visitor:'Museum Visitor', operator:'System Operator', 's.harper':'S. Harper', 'h.sullivan':'H. Sullivan', 'f.kessler':'F. Kessler' }; return [`Login: ${account.username}`, `Name: ${names[account.username] || account.username}`, `On since: Fri Jul 31 ${formatLogin(sim, account)} on ${account.tty}`, `Idle Time: ${formatIdle(account.idleSeconds)}`]; }
    if (name === 'pwd') return [this.cwd];
    if (name === 'ls') return this.list(args);
    if (['cat','more','head','tail','wc','grep'].includes(name)) return this.fileCommand(name, args);
    if (name === 'find') return this.find(args);
    if (name === 'man') { const c = COMMANDS.get(aliasMap.get(args[0]) || args[0]); if (!c) return [`man: no entry for ${args[0] || ''}`]; return this.startPager([`NAME\n  ${c.name} — ${c.help}\n\nSYNOPSIS\n  ${c.usage}\n\nDESCRIPTION\n  ${c.help}\n\nEXAMPLE\n  ${c.usage.replace(/\[.*?\]/g, '').trim()}\n\nMUSEUM NOTE\n  ${c.museum}`], 'man'); }
    if (name === 'ps') { if (args.some(a => !['-e','-f'].includes(a))) return [`ps: unsupported option '${args.find(a => !['-e','-f'].includes(a))}'`]; const full = args.includes('-e') || args.includes('-f'); const processes = [['root','1','?','0:03','init'],['root','2','?','0:01','swapper'],['operator','114','tty0','0:02','cron'],['operator','181','?','0:04','lpd'],...sim.sessions.map((s,i) => [s.username,String(420+i*7),s.tty,'0:01',s.username === 'visitor' ? 'sh' : activities[i%activities.length]])]; return [full ? 'USER         PID TTY     TIME COMMAND' : '  PID TTY     TIME COMMAND', ...processes.filter(p => full || p[0] === 'visitor').map(p => full ? `${p[0].padEnd(12)} ${p.slice(1).join(' ')}` : `${p[1].padStart(5)} ${p.slice(2).join(' ')}`)]; }
    if (name === 'mail') return this.mail(args);
    if (name === 'history') return this.history.map((entry, i) => `${String(i + 1).padStart(4)}  ${entry}`);
    if (name === 'echo') return [args.join(' ')];
    if (name === 'clear') return this.result([], { clear: true });
    if (name === 'reset') return this.result([], { reset: true });
    if (name === 'logout') { this.mode = 'logged-out'; return ['Connection closed.', '', 'Press Enter to reconnect.']; }
    return [];
  }
  list(args) { let flags = ''; let raw = '.'; for (const arg of args) { if (arg.startsWith('-')) flags += arg.slice(1); else if (raw === '.') raw = arg; else return ['ls: too many paths']; } if ([...flags].some(f => !'al'.includes(f))) return [`ls: unsupported option '-${[...flags].find(f => !'al'.includes(f))}'`]; const path = normalizePath(this.cwd, raw), node = lookup(path); if (node?.denied) return [`ls: cannot access '${raw}': Permission denied`]; if (!node) return [`ls: cannot access '${raw}': No such file or directory`]; if (node.type === 'file') return [raw]; const names = Object.keys(node.children).filter(n => flags.includes('a') || !n.startsWith('.')).sort(); if (!flags.includes('l')) return [names.join('  ')]; return ['total ' + names.length, ...names.map(n => { const item=node.children[n]; return `${item.mode} 1 ${item.owner.padEnd(9)} staff ${String(item.type==='file' ? item.content.length : 512).padStart(5)} ${item.date} ${n}`; })]; }
  fileCommand(name, args) { let options = []; while (args[0]?.startsWith('-')) options.push(args.shift()); if (name === 'grep') { if (options.some(o => !['-i','-n'].includes(o))) return [`grep: unsupported option '${options[0]}'`]; if (args.length < 2) return ['grep: missing pattern or file']; const pattern=args.shift(), found=getFile(this,args[0],'grep'); if(found.error)return[found.error]; const needle=options.includes('-i')?pattern.toLowerCase():pattern; return found.node.content.split('\n').map((line,i)=>[line,i]).filter(([line])=>(options.includes('-i')?line.toLowerCase():line).includes(needle)).slice(0,SHELL_LIMITS.results).map(([line,i])=>`${options.includes('-n')?`${i+1}:`:''}${line}`); } let count=10; if (['head','tail'].includes(name) && options.length) { if (options[0] !== '-n' || !/^\d+$/.test(args[0])) return [`${name}: usage: ${name} [-n count] file`]; count=Math.min(100,Number(args.shift())); } if (name === 'wc' && options.some(o=>!['-l','-w','-c'].includes(o))) return [`wc: unsupported option '${options[0]}'`]; if (!args.length) return [`${name}: missing file operand`]; const outputs=[]; for(const raw of args.slice(0,4)){const found=getFile(this,raw,name);if(found.error){outputs.push(found.error);continue;}const content=found.node.content.slice(0,SHELL_LIMITS.file);if(name==='cat')outputs.push(content);else if(name==='more')return this.startPager([content],raw);else if(name==='head')outputs.push(content.split('\n').slice(0,count).join('\n'));else if(name==='tail')outputs.push(content.split('\n').slice(-count).join('\n'));else { const values={ '-l':content.split('\n').length, '-w':content.trim()?content.trim().split(/\s+/).length:0, '-c':content.length }; const selected=options[0]; outputs.push(selected?`${values[selected]} ${raw}`:`${values['-l']} ${values['-w']} ${values['-c']} ${raw}`); }} return outputs; }
  find(args) { if (args.some(a => ['-exec','-delete','-perm','-user','-regex'].includes(a))) return [`find: unsupported option '${args.find(a=>a.startsWith('-'))}'`]; if(args.length!==3||args[1]!=='-name')return['Usage: find path -name filename'];const root=normalizePath(this.cwd,args[0]),node=lookup(root);if(node?.denied)return[`find: '${args[0]}': Permission denied`];if(!node)return[`find: '${args[0]}': No such file or directory`];const out=[];const walk=(item,path)=>{if(out.length>=SHELL_LIMITS.results||item.denied||item.access===false)return;if(path.split('/').pop()===args[2])out.push(path);if(item.type==='dir')for(const [key,value] of Object.entries(item.children))walk(value,`${path==='/'?'':path}/${key}`);};walk(node,root);return out; }
  startPager(chunks, title) { const lines=chunks.join('\n').split('\n').slice(0,300);this.pager={lines,index:0,title};this.mode='pager';return this.pagerPage(12); }
  pagerPage(step=12) { const start=this.pager.index;this.pager.index=Math.min(this.pager.lines.length,start+step);const percent=Math.round(this.pager.index/this.pager.lines.length*100);return [...this.pager.lines.slice(start,this.pager.index),this.pager.index<this.pager.lines.length?`--More-- ${percent}% (Space: page, Enter: line, q: quit)`: '(END — press q)']; }
  handleMode(key) { if(this.mode==='logged-out'){if(key==='Enter'){this.mode='shell';this.cwd='/usr/visitor';return this.result(['Reconnected to cs-vax1.']);}return this.result([]);}if(this.mode==='pager'){if(key==='q'||key==='Q'){this.mode='shell';this.pager=null;return this.result(this.flushAmbient());}if(key===' '||key==='Enter'){const lines=this.pagerPage(key===' '?12:1);return this.result(lines);}return this.result([]);}if(this.mode.startsWith('mail'))return this.mailMode(key);return null; }
  mailboxIndex(){return ['Mail version 6.2. Read-only browser mailbox.',' N  #  FROM          SUBJECT',...this.mailbox.map(m=>`${m.read?'  ':'> '} ${m.number}  ${m.from.padEnd(13)} ${m.subject}`),'& Commands: number, next, headers, quit'];}
  mail(args){if(args.length)return this.mailAction(args.join(' '),false);this.mode='mail-index';return this.mailboxIndex();}
  mailMode(value){if(value==='Escape')value='quit';return this.result(this.mailAction(String(value).trim(),true));}
  mailAction(value,interactive){if(value==='quit'||value==='q'){this.mode='shell';return['Mailbox closed.',...this.flushAmbient()];}if(value==='headers'||value==='h'||!value){this.mode=interactive?'mail-index':'shell';return this.mailboxIndex();}let index=value==='next'||value==='n'?this.mailbox.findIndex((m,i)=>i>=this.currentMail&&!m.read):Number(value)-1;if(index<0||!this.mailbox[index])return['mail: no such message'];const m=this.mailbox[index];m.read=true;this.currentMail=index+1;if(interactive)this.mode='mail-message';return[`Message ${m.number}:`,`From: ${m.from}`,`Subject: ${m.subject}`,'',m.body,'','& Type next, headers, a message number, or quit'];}
}
