(() => {
  'use strict';
  const term = document.getElementById('c64Terminal');
  const input = document.getElementById('c64Input');
  const STORE = 'c64basic.programs.v1';
  const demos = {
    HELLO: ['10 PRINT "HELLO FROM THE MUSEUM"','20 PRINT "THIS BASIC IS ORIGINAL"','30 END'],
    COUNT: ['10 FOR I=1 TO 10','20 PRINT I','30 NEXT I','40 END'],
    STARS: ['10 FOR I=1 TO 12','20 PRINT CHR$(42);','30 NEXT I','40 PRINT','50 END'],
    GUESS: ['10 N=INT(RND()*10)+1','20 INPUT "GUESS";G','30 IF G=N THEN PRINT "RIGHT!"','40 IF G<>N THEN PRINT "TRY AGAIN"','50 IF G<>N THEN GOTO 20','60 END'],
    BORKUM: ['10 PRINT "BORKUM LIGHTHOUSE"','20 FOR I=1 TO 5','30 PRINT "~ ~ ~ * ~ ~ ~"','40 NEXT I','50 END'],
    RAIN: ['10 FOR I=1 TO 20','20 PRINT "  .  . .   ."','30 NEXT I','40 END']
  };
  let lines = new Map(), vars = {}, arrays = {}, pc = 0, order = [], stack = [], fors = [], data = [], dataPtr = 0, running = false, execSteps = 0;
  const MAX_STEPS = 20000;
  let current = '', inputWait = null;
  const helps = {PRINT:'PRINT expression[,expression] displays text or values. Example: PRINT "HELLO"',INPUT:'INPUT A or INPUT "NAME";N reads keyboard input.',FOR:'FOR I=1 TO 10 ... NEXT I repeats a block.',IF:'IF A>5 THEN PRINT "HIGH" or IF A=1 THEN GOTO 100.',SAVE:'SAVE "NAME" stores the current program in browser localStorage.',LOAD:'LOAD "HELLO" loads a demo or saved program.',DATA:'DATA 5,7,12 with READ A retrieves constants.'};
  function upper(s){return s.toUpperCase();}
  function print(s=''){ const p=promptSpan(); term.insertBefore(document.createTextNode(String(s)+'\n'), p || null); scroll(); }
  function raw(s=''){ const p=promptSpan(); term.insertBefore(document.createTextNode(String(s)), p || null); scroll(); }
  function promptSpan(){ return document.getElementById('livePrompt'); }
  function renderPrompt(){ let old=promptSpan(); if(old) old.remove(); const span=document.createElement('span'); span.id='livePrompt'; span.innerHTML='<span class="c64-input-line"></span><span class="c64-cursor"></span>'; term.appendChild(span); sync(); scroll(); }
  function sync(){ const p=promptSpan(); if(!p)return; const el=p.querySelector('.c64-input-line'); if(el) el.textContent=current; }
  function scroll(){ term.scrollTop=term.scrollHeight; }
  function ready(){ print('READY.'); running=false; renderPrompt(); focusInput(); }
  function error(m){ print(m); ready(); throw new Error(m); }
  function parseName(s){ const m=s.match(/"([^"]+)"|([^\s]+)/); return m ? upper((m[1]||m[2]).trim()) : 'PROGRAM'; }
  function stored(){ try{return JSON.parse(localStorage.getItem(STORE)||'{}');}catch(e){ print('LOCALSTORAGE ERROR'); return {}; } }
  function persist(name){ if(demos[name]) error('CANNOT SAVE OVER DEMO'); try{ const all=stored(); all[name]=[...lines.entries()].sort((a,b)=>a[0]-b[0]).map(([n,t])=>`${n} ${t}`); localStorage.setItem(STORE,JSON.stringify(all)); }catch(e){ error('LOCALSTORAGE ERROR'); } }
  function loadProgram(arr){ lines.clear(); arr.forEach(l=>{const m=l.match(/^(\d+)\s*(.*)$/); if(m) lines.set(+m[1],m[2]);}); }
  function list(){ [...lines.entries()].sort((a,b)=>a[0]-b[0]).forEach(([n,t])=>print(`${n} ${t}`)); }
  function dir(){ print('DEMOS: '+Object.keys(demos).join('  ')); const names=Object.keys(stored()); print('SAVED: '+(names.length?names.join('  '):'(NONE)')); }
  function tokenizeExpr(s){ return s.match(/"[^"]*"|[A-Z][A-Z0-9]*\$?|\d+(?:\.\d+)?|<>|<=|>=|[()+\-*\/=<>,;]/gi)||[]; }
  function val(tok){ if(tok[0]==='"')return tok.slice(1,-1); if(/^\d/.test(tok))return Number(tok); return vars[upper(tok)] ?? (tok.endsWith('$')?'':0); }
  function expr(s){ const toks=tokenizeExpr(s); let i=0; function primary(){ let t=toks[i++]; if(!t) error('SYNTAX ERROR'); t=upper(t); if(t==='('){let v=compare(); if(toks[i++]!==')')error('SYNTAX ERROR'); return v;} if(['RND','INT','LEN','ABS','CHR$'].includes(t)){ if(toks[i++]!=='(')error('SYNTAX ERROR'); let v=0; if(t!=='RND' || toks[i]!==')') v=compare(); if(toks[i++]!==')')error('SYNTAX ERROR'); if(t==='RND')return Math.random(); if(t==='INT')return Math.floor(Number(v)); if(t==='LEN')return String(v).length; if(t==='ABS')return Math.abs(Number(v)); return String.fromCharCode(Number(v)); } return val(t); }
    function unary(){ if(toks[i]==='-'){i++; return -Number(unary());} return primary(); }
    function mul(){ let v=unary(); while(['*','/'].includes(toks[i])){let o=toks[i++],r=unary(); v=o==='*'?Number(v)*Number(r):Number(v)/Number(r);} return v; }
    function add(){ let v=mul(); while(['+','-'].includes(toks[i])){let o=toks[i++],r=mul(); v=o==='+'?(typeof v==='string'||typeof r==='string'?String(v)+String(r):Number(v)+Number(r)):Number(v)-Number(r);} return v; }
    function compare(){ let v=add(); if(['=','<>','<','>','<=','>='].includes(toks[i])){let o=toks[i++],r=add(); return +(o==='='?v==r:o==='<'?v<r:o==='>'?v>r:o==='<='?v<=r:o==='>='?v>=r:v!=r);} return v; } return compare(); }
  function splitArgs(s){ const out=[]; let q=false,b=''; for(const ch of s){ if(ch==='"')q=!q; if(!q && (ch===','||ch===';')){out.push(b); b='';} else b+=ch;} out.push(b); return out; }
  function assign(s){ const m=s.match(/^([A-Z][A-Z0-9]*\$?)\s*=\s*(.+)$/i); if(!m) error('SYNTAX ERROR'); vars[upper(m[1])]=expr(m[2]); }
  function buildData(){ data=[]; order.forEach(n=>{ const t=lines.get(n), m=t.match(/^DATA\s+(.+)/i); if(m) splitArgs(m[1]).forEach(x=>data.push(expr(x.trim())));}); dataPtr=0; }
  function jump(n){ const idx=order.indexOf(Number(n)); if(idx<0) error('UNDEFINED LINE'); pc=idx; }
  function stmt(s){ s=s.trim(); if(!s) return; const u=upper(s); if(u.startsWith('REM')||u.startsWith('DATA'))return; if(u.startsWith('PRINT')){ let body=s.slice(5).trim(); if(!body) return print(''); const trail=/[;,]\s*$/.test(body); if(trail) body=body.replace(/[;,]\s*$/,''); raw(splitArgs(body).map(a=>expr(a.trim())).join(' ')+(trail?'':'\n')); return; } if(u.startsWith('LET '))return assign(s.slice(4)); if(/^[A-Z][A-Z0-9]*\$?\s*=/.test(s))return assign(s); if(u.startsWith('INPUT')){ const rest=s.slice(5).trim(); let prompt='? ', name=rest; const m=rest.match(/^"([^"]*)"\s*[;,]\s*([A-Z][A-Z0-9]*\$?)$/i); if(m){prompt=m[1]+'? '; name=m[2];} running=false; raw(prompt); inputWait=v=>{vars[upper(name)]=name.endsWith('$')?v:Number(v)||0; pc++; running=true; step();}; return 'WAIT'; } if(u.startsWith('IF')){ const m=s.match(/^IF\s+(.+)\s+THEN\s+(.+)$/i); if(!m)error('SYNTAX ERROR'); if(expr(m[1])){ if(/^\d+$/.test(m[2].trim())){ jump(m[2].trim()); return 'JUMPED'; } else return stmt(m[2]);} return; } if(u.startsWith('GOTO')){ jump(s.slice(4).trim()); return 'JUMPED'; } if(u.startsWith('GOSUB')){ stack.push(pc); jump(s.slice(5).trim()); return 'JUMPED'; } if(u==='RETURN'){ if(!stack.length)error('RETURN WITHOUT GOSUB'); pc=stack.pop()+1; return 'JUMPED'; } if(u.startsWith('FOR')){ const m=s.match(/^FOR\s+([A-Z][A-Z0-9]*)\s*=\s*(.+)\s+TO\s+(.+?)(?:\s+STEP\s+(.+))?$/i); if(!m)error('SYNTAX ERROR'); vars[upper(m[1])]=expr(m[2]); fors.push({v:upper(m[1]),to:expr(m[3]),step:m[4]?expr(m[4]):1,line:pc}); return; } if(u.startsWith('NEXT')){ const f=fors[fors.length-1]; if(!f)error('NEXT WITHOUT FOR'); vars[f.v]+=Number(f.step); if((f.step>=0&&vars[f.v]<=f.to)||(f.step<0&&vars[f.v]>=f.to)){ pc=f.line+1; return 'JUMPED'; } fors.pop(); return; } if(u==='END'||u==='STOP'){ pc=order.length; return; } if(u.startsWith('READ')){ splitArgs(s.slice(4)).forEach(n=>{ if(dataPtr>=data.length)error('OUT OF DATA'); vars[upper(n.trim())]=data[dataPtr++];}); return; } if(u==='RESTORE'){dataPtr=0; return;} if(u.startsWith('DIM')){ arrays[u.slice(3).trim()]=[]; return; } error('SYNTAX ERROR'); }
  function step(){ try{ let budget=600; while(running && pc<order.length && budget-- > 0){ if(++execSteps > MAX_STEPS){ print('BREAK'); return ready(); } const r=stmt(lines.get(order[pc])); if(r==='WAIT')return; if(r==='JUMPED')continue; pc++; } if(running && pc<order.length) return setTimeout(step,0); if(running) ready(); }catch(e){} }
  function run(){ vars={}; arrays={}; stack=[]; fors=[]; order=[...lines.keys()].sort((a,b)=>a-b); buildData(); pc=0; execSteps=0; running=true; step(); }
  function command(line){ print(line); const m=line.match(/^(\d+)\s*(.*)$/); if(m){ const n=+m[1]; if(m[2].trim()) lines.set(n,m[2].trim()); else lines.delete(n); return renderPrompt(); } try{ const u=upper(line.trim()); if(!u)return renderPrompt(); if(u==='RUN')return run(); if(u==='LIST'){list(); return ready();} if(u==='NEW'){lines.clear(); vars={}; arrays={}; stack=[]; fors=[]; data=[]; dataPtr=0; return ready();} if(u==='CLS'){term.textContent=''; renderPrompt(); return ready();} if(u==='DIR'){dir(); return ready();} if(u==='BASIC'){print('8-BIT EDUCATIONAL BASIC V1'); return ready();} if(u==='ABOUT'){print('ORIGINAL EDUCATIONAL BASIC INTERPRETER. NO COMMODORE ROMS. NO COPYRIGHTED SOFTWARE. BUILT FOR THE COMPUTER MUSEUM.'); return ready();} if(u.startsWith('HELP')){const k=upper(line.slice(4).trim()); print(k&&helps[k]?helps[k]:'SYSTEM: HELP ABOUT LIST RUN NEW CLS DIR LOAD SAVE BASIC\nPROGRAM: PRINT INPUT LET IF THEN GOTO GOSUB RETURN FOR NEXT END STOP REM DIM DATA READ RESTORE\nFUNCTIONS: RND() INT() LEN() ABS() CHR$()'); return ready();} if(u.startsWith('SAVE')){persist(parseName(line.slice(4))); return ready();} if(u.startsWith('LOAD')){const name=parseName(line.slice(4)); const all=stored(); if(demos[name])loadProgram(demos[name]); else if(all[name])loadProgram(all[name]); else {print('FILE NOT FOUND'); return ready();} return ready();} stmt(line); return ready(); }catch(e){} }
  function enter(){ const line=current; current=''; const p=promptSpan(); if(p)p.remove(); if(inputWait){ print(line); const cb=inputWait; inputWait=null; cb(line); } else command(line); }
  function focusInput(){ input.focus({preventScroll:true}); }
  term.addEventListener('click',focusInput); input.addEventListener('keydown',e=>{ if(e.key==='Escape' && running){ e.preventDefault(); print('BREAK'); return ready(); } if(e.key==='Enter'){e.preventDefault(); enter();} else if(e.key==='Backspace'){e.preventDefault(); current=current.slice(0,-1); sync();} }); input.addEventListener('input',()=>{ current += input.value.toUpperCase(); input.value=''; sync(); });
  term.textContent='8-BIT EDUCATIONAL BASIC\nTYPE HELP FOR COMMANDS.\n'; renderPrompt(); ready();
})();
