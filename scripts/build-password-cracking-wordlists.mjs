// Compile pinned, filtered local snapshots. Runtime requires no list requests.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const base=new URL('../assets/password-cracking-lab/',import.meta.url),check=process.argv.includes('--check');
const manifest=JSON.parse(readFileSync(new URL('wordlists/sources.json',base),'utf8'));
let source='// Generated from pinned wordlists/ snapshots. See sources.json.\n';
for(const file of ['LICENSE-english-SCOWL.txt','LICENSE-english-Hunspell.txt','LICENSE-common-MIT.txt'])source+='/* '+file+'\n'+readFileSync(new URL('wordlists/'+file,base),'utf8').replaceAll('*/','* /')+'*/\n';
for(const [id,name] of [['de','german'],['en','english'],['common','common']]){
  const raw=readFileSync(new URL('wordlists/'+name+'.txt',base),'utf8');
  if(createHash('sha256').update(raw).digest('hex')!==manifest[id].bundledSha256)throw new Error('Wordlist snapshot checksum mismatch: '+id);
  if(!raw.endsWith('\n'))throw new Error('Missing final newline: '+id);
  const lines=raw.slice(0,-1).split('\n');if(lines.length!==manifest[id].selected||new Set(lines).size!==lines.length)throw new Error('Invalid wordlist size/deduplication: '+id);
  if(lines.some(w=>!/^[\x20-\x7e]{1,20}$/.test(w)))throw new Error('Non-ASCII or oversized wordlist base: '+id);
  source+='export const EXTERNAL_'+id.toUpperCase()+'=Object.freeze('+JSON.stringify(raw.slice(0,-1))+'.split("\\n"));\n';
}
source+='export const WORDLIST_SOURCES=Object.freeze('+JSON.stringify(manifest)+');\n';
const file=new URL('wordlists-data.js',base);
if(check){if(readFileSync(file,'utf8')!==source)throw new Error('Outdated wordlists-data.js');}else writeFileSync(file,source);
console.log(check?'Wordlist snapshots and generated module verified':'Wordlist module built');
