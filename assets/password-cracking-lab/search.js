import {wordForms} from './transformations.js';
import {packedView,initializeDictionaryVariants,dictionaryIndexStats} from './packed-dictionary.js?v=20261013-bud-1';
export {initializeDictionaryVariants,dictionaryIndexStats};
import { DICTIONARY, DICTIONARY_META, DICTIONARIES, DICTIONARY_COUNTS, WORDLIST_SOURCES } from './dictionary.js?v=20261013-bud-1';
export { DICTIONARY, DICTIONARY_META, DICTIONARIES, DICTIONARY_COUNTS, WORDLIST_SOURCES };
export function yearRange(year=new Date().getUTCFullYear()){if(!Number.isInteger(year))throw new Error('Invalid calendar year');return {yearMin:1984,yearMax:Math.min(9999,Math.max(2035,year))};}
export const BLIND_LIMITS=Object.freeze({maximumLength:24,suffixDigits:2,...yearRange()});
export const BLIND_CHARSET='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'+String.fromCharCode(...Array.from({length:95},(_,i)=>i+32).filter(c=>!((c>=48&&c<=57)||(c>=65&&c<=90)||(c>=97&&c<=122))));
export const SETS=Object.freeze({digits:'0123456789',lower:'abcdefghijklmnopqrstuvwxyz',upper:'ABCDEFGHIJKLMNOPQRSTUVWXYZ',symbols:'!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~'});
function integer(value,fallback,min=1,max=24) {const n=Number(value??fallback);if(!Number.isInteger(n)||n<min||n>max)throw new Error('Invalid search length');return n;}
export function normalizeConfig(input={}) {
  const strategy=input.strategy??'blind';
  if(strategy==='blind'){
    const german=input.german!==false,english=input.english!==false,common=input.common===true,brute=input.brute===true;
    if(!german&&!english&&!common&&!brute)throw new Error('Select at least one search method');
    return {strategy,german,english,common,brute};
  }
  // Legacy explicit configurations are retained for engine benchmarks and fixtures.
  if(!['smart','numeric','dictionary','brute'].includes(strategy))throw new Error('Unknown strategy');
  const dictionaryMode=strategy==='dictionary'||strategy==='smart';
  const min=strategy==='dictionary'?1:integer(input.min,1),max=strategy==='dictionary'?24:integer(input.max,4);if(min>max)throw new Error('Minimum length exceeds maximum');
  const flags=Object.fromEntries(Object.keys(SETS).map(k=>[k,Boolean(input[k]??(k==='digits'||k==='lower'))]));
  const charset=Object.entries(SETS).filter(([key])=>flags[key]).map(([,value])=>value).join('');
  if((strategy==='brute'||strategy==='smart')&&!charset)throw new Error('Select at least one character set');
  const years=dictionaryMode&&input.years===true;
  const yearMin=years?integer(input.yearMin,BLIND_LIMITS.yearMin,1900,9999):BLIND_LIMITS.yearMin,yearMax=years?integer(input.yearMax,BLIND_LIMITS.yearMax,1900,9999):BLIND_LIMITS.yearMax;if(yearMin>yearMax)throw new Error('Minimum year exceeds maximum');
  return {strategy,min,max,numericMax:strategy==='smart'?integer(input.numericMax,6):6,suffix:dictionaryMode?integer(input.suffix,4,0,4):0,variants:input.variants!==false,leet:dictionaryMode&&input.leet===true,years,yearMin,yearMax,...flags,charset};
}
const dictionaryCache=new Map();
export function dictionaryBases(variants=false,leet=false,language=null){
  if(language!==null&&!DICTIONARIES[language])throw new Error('Unknown dictionary language');
  const key=String(language)+':'+String(variants)+':'+String(leet);if(dictionaryCache.has(key))return dictionaryCache.get(key);
  if(language!==null&&variants&&leet&&typeof packedView==='function'){const view=packedView(language);if(view)return view;}
  const entries=new Set();
  for(const word of (language?DICTIONARIES[language]:DICTIONARY))for(const form of wordForms(word,variants,leet))entries.add(form);
  const result=Object.freeze([...entries]);dictionaryCache.set(key,result);return result;
}
function dictionaryRadix(p){return p.yearMin===undefined?10n**BigInt(p.suffixDigits):BigInt(p.yearMax-p.yearMin+1);}
function dictionarySuffix(p,index){return p.yearMin===undefined?(p.suffixDigits?String(index).padStart(p.suffixDigits,'0'):''):String(p.yearMin+Number(index));}
function phase(kind,data) {
  const result={kind,...data};
  result.count=kind==='dictionary'?BigInt(dictionaryBases(data.variants,data.leet,data.language??null).length)*dictionaryRadix(result):BigInt(data.charset.length)**BigInt(data.length);
  return result;
}
export function createPhases(input) {
  const c=normalizeConfig(input),phases=[];
  if(c.strategy==='blind'){
    const languages=['common','de','en'].filter(language=>c[language==='de'?'german':language==='en'?'english':'common']);
    // Every selected base phase precedes every suffix phase. Ordering is fixed.
    for(const language of languages)phases.push(phase('dictionary',{language,variants:true,leet:true,suffixDigits:0}));
    for(const language of languages)phases.push(phase('dictionary',{language,variants:true,leet:true,suffixDigits:4,yearMin:BLIND_LIMITS.yearMin,yearMax:BLIND_LIMITS.yearMax}));
    for(let width=1;width<=BLIND_LIMITS.suffixDigits;width++)for(const language of languages)phases.push(phase('dictionary',{language,variants:true,leet:true,suffixDigits:width}));
    if(c.brute)for(let length=1;length<=BLIND_LIMITS.maximumLength;length++)phases.push(phase('brute',{charset:BLIND_CHARSET,length}));
    let offset=0n;for(const p of phases){p.offset=offset;offset+=p.count;}return phases;
  }
  const numbers=(start,end)=>{for(let n=start;n<=end;n++)phases.push(phase('numeric',{charset:SETS.digits,length:n}));};
  const words=(suffix)=>phases.push(phase('dictionary',{variants:c.variants,leet:c.leet,suffixDigits:suffix}));
  const years=()=>{if(c.years)phases.push(phase('dictionary',{variants:c.variants,leet:c.leet,suffixDigits:4,yearMin:c.yearMin,yearMax:c.yearMax}));};
  if(c.strategy==='numeric')numbers(c.min,c.max);
  if(c.strategy==='dictionary'){words(0);years();for(let n=1;n<=c.suffix;n++)words(n);}
  if(c.strategy==='brute')for(let n=c.min;n<=c.max;n++)phases.push(phase('brute',{charset:c.charset,length:n}));
  if(c.strategy==='smart') {
    words(0);numbers(1,Math.min(3,c.numericMax));years();
    for(let n=1;n<=c.suffix;n++)words(n);
    numbers(4,c.numericMax);
    for(let n=c.min;n<=c.max;n++)if(!(c.charset===SETS.digits&&n<=c.numericMax))phases.push(phase('brute',{charset:c.charset,length:n}));
  }
  let offset=0n;for(const p of phases){p.offset=offset;offset+=p.count;}return phases;
}
export function candidateAt(p,index) {
  const n=BigInt(index);if(n<0n||n>=BigInt(p.count))throw new RangeError('Candidate index outside phase');
  if(p.kind==='dictionary') {
    const radix=dictionaryRadix(p),bases=dictionaryBases(p.variants,p.leet,p.language??null);
    return bases[Number(n/radix)]+dictionarySuffix(p,n%radix);
  }
  const radix=BigInt(p.charset.length);let value=n,text='';
  for(let i=0;i<p.length;i++){text=p.charset[Number(value%radix)]+text;value/=radix;}return text;
}
export function dictionaryRangePhase(p,start,count){
  if(p.kind!=='dictionary'||!p.language)return p;
  const n=BigInt(start),last=n+BigInt(count)-1n;if(!Number.isInteger(count)||count<1||count>65536||n<0n||last>=p.count)throw new Error('Invalid dictionary range');
  const radix=dictionaryRadix(p),first=Number(n/radix),end=Number(last/radix)+1;
  if(!Number.isSafeInteger(first)||!Number.isSafeInteger(end))throw new Error('Dictionary base index exceeds exact range');
  const bases=dictionaryBases(p.variants,p.leet,p.language);
  return {...p,baseOffset:first,rangeBases:bases.slice(first,end)};
}
export class CandidateCursor {
  constructor(p,start=0n) {
    this.phase=p;this.index=BigInt(start);this.bases=p.kind==='dictionary'?(p.rangeBases??dictionaryBases(p.variants,p.leet,p.language??null)):null;this.radix=p.kind==='dictionary'?dictionaryRadix(p):BigInt(p.charset.length);
    if(this.bases){this.wordIndex=Number(this.index/this.radix)-(p.baseOffset??0);this.suffixIndex=Number(this.index%this.radix);this.suffixCount=Number(this.radix);}
    if(!this.bases){this.digits=new Uint8Array(p.length);let n=this.index;for(let i=p.length-1;i>=0;i--){this.digits[i]=Number(n%this.radix);n/=this.radix;}}
  }
  next() {
    if(this.index>=BigInt(this.phase.count))throw new RangeError('Candidate cursor exhausted');
    const n=this.index++;
    if(!this.bases){let text='';for(const digit of this.digits)text+=this.phase.charset[digit];for(let i=this.digits.length-1;i>=0;i--){if(++this.digits[i]<this.phase.charset.length)break;this.digits[i]=0;}return text;}
    const result=this.bases[this.wordIndex]+dictionarySuffix(this.phase,this.suffixIndex);if(++this.suffixIndex===this.suffixCount){this.suffixIndex=0;this.wordIndex++;}return result;
  }
}
export class RangeLedger {
  constructor(phases) {this.phases=phases;this.total=phases.reduce((n,p)=>n+BigInt(p.count),0n);this.next=0n;this.checked=0n;this.frontier=0n;this.pending=new Map();this.completed=new Map();this.nextId=1;this.phaseChecked=phases.map(()=>0n);}
  allocate(requested) {
    if(this.next>=this.total)return null;
    const countLimit=integer(requested,1024,1,65536),phaseIndex=this.phases.findIndex(p=>this.next<BigInt(p.offset)+BigInt(p.count)),p=this.phases[phaseIndex];
    const start=this.next-BigInt(p.offset),remaining=BigInt(p.count)-start,count=Number(remaining<BigInt(countLimit)?remaining:BigInt(countLimit));
    const job={id:this.nextId++,phaseIndex,phase:p,start,count,globalStart:this.next};this.next+=BigInt(count);this.pending.set(job.id,job);return job;
  }
  confirm(id,count) {
    const job=this.pending.get(id);if(!job||count!==job.count)throw new Error('Unknown or incomplete candidate range');
    this.pending.delete(id);this.checked+=BigInt(count);this.phaseChecked[job.phaseIndex]+=BigInt(count);this.completed.set(job.globalStart,BigInt(count));
    while(this.completed.has(this.frontier)){const size=this.completed.get(this.frontier);this.completed.delete(this.frontier);this.frontier+=size;}return job;
  }
  get exhausted() {return this.next===this.total&&this.pending.size===0;}
}
