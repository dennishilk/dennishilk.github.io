const OPERATORS = new Set(['|', '>', '<', ';', '&', '`', '$']);
export const MAX_COMMAND_LENGTH = 512;

export function parseCommand(source) {
  if (source.length > MAX_COMMAND_LENGTH) return { error: 'bash: command too long' };
  const input = source.trim();
  if (!input) return { tokens: [] };
  const tokens = [];
  let token = '', quote = null, escaped = false;
  for (const char of input) {
    if (escaped) { token += char; escaped = false; continue; }
    if (char === '\\') { escaped = true; continue; }
    if (quote) { if (char === quote) quote = null; else token += char; continue; }
    if (char === "'" || char === '"') { quote = char; continue; }
    if (OPERATORS.has(char)) return { error: 'bash: shell operators are not supported in this environment' };
    if (/\s/.test(char)) { if (token) { tokens.push(token); token = ''; } } else token += char;
  }
  if (quote) return { error: `bash: unexpected EOF while looking for matching \`${quote}'` };
  if (escaped) token += '\\';
  if (token) tokens.push(token);
  return { tokens };
}

// Tokenizes only the four deliberately supported composition operators. Quotes and
// backslash escaping are retained as data boundaries, never evaluated as code.
export function parseShell(source) {
  if(source.length>2048)return {error:'bash: command too long'};
  if(/:\s*\(\s*\)\s*\{|`|\$\(|\bwhile\b/.test(source))return {error:'bash: syntax error near unexpected token'};
  const tokens=[];let word='',quote=null,escaped=false,started=false;
  const push=()=>{if(started||word!==''){tokens.push({type:'word',value:word});word='';started=false;}};
  for(let i=0;i<source.length;i++){
    const ch=source[i];
    if(escaped){word+=ch;escaped=false;started=true;continue;}
    if(ch==='\\'){escaped=true;started=true;continue;}
    if(quote){if(ch===quote)quote=null;else word+=ch;started=true;continue;}
    if(ch==='"'||ch==="'"){quote=ch;started=true;continue;}
    if(/\s/.test(ch)){push();continue;}
    if(ch==='2'&&source[i+1]==='>'){push();i++;if(source[i+1]==='>'){tokens.push({type:'op',value:'2>>'});i++;}else tokens.push({type:'op',value:'2>'});continue;}
    if(ch==='>'&&source[i+1]==='>'){push();tokens.push({type:'op',value:'>>'});i++;continue;}
    if(ch==='&'&&source[i+1]==='&'){push();tokens.push({type:'op',value:'&&'});i++;continue;}
    if(ch==='|'&&source[i+1]==='|'){push();tokens.push({type:'op',value:'||'});i++;continue;}
    if('|<>;'.includes(ch)){push();tokens.push({type:'op',value:ch});continue;}
    if(ch==='&')return {error:'bash: unsupported shell operator'};
    word+=ch;started=true;
  }
  if(quote)return {error:`bash: unexpected EOF while looking for matching \`${quote}'`};if(escaped)word+='\\';push();return {tokens};
}
