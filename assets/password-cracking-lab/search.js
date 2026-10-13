import { DICTIONARY, DICTIONARY_META } from './dictionary.js?v=20261013-compat-1';
export { DICTIONARY, DICTIONARY_META };
export const SETS=Object.freeze({digits:'0123456789',lower:'abcdefghijklmnopqrstuvwxyz',upper:'ABCDEFGHIJKLMNOPQRSTUVWXYZ',symbols:'!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~'});
function integer(value,fallback,min=1,max=24) {const n=Number(value??fallback);if(!Number.isInteger(n)||n<min||n>max)throw new Error('Invalid search length');return n;}
export function normalizeConfig(input={}) {
  const strategy=input.strategy??'smart';if(!['smart','numeric','dictionary','brute'].includes(strategy))throw new Error('Unknown strategy');
  const dictionaryMode=strategy==='dictionary'||strategy==='smart';
  const min=strategy==='dictionary'?1:integer(input.min,1),max=strategy==='dictionary'?24:integer(input.max,4);if(min>max)throw new Error('Minimum length exceeds maximum');
  const flags=Object.fromEntries(Object.keys(SETS).map(k=>[k,Boolean(input[k]??(k==='digits'||k==='lower'))]));
  const charset=Object.entries(SETS).filter(([key])=>flags[key]).map(([,value])=>value).join('');
  if((strategy==='brute'||strategy==='smart')&&!charset)throw new Error('Select at least one character set');
  const years=dictionaryMode&&input.years===true;
  const yearMin=years?integer(input.yearMin,2000,1900,2099):2000,yearMax=years?integer(input.yearMax,2035,1900,2099):2035;if(yearMin>yearMax)throw new Error('Minimum year exceeds maximum');
  return {strategy,min,max,numericMax:strategy==='smart'?integer(input.numericMax,6):6,suffix:dictionaryMode?integer(input.suffix,4,0,4):0,variants:input.variants!==false,leet:dictionaryMode&&input.leet===true,years,yearMin,yearMax,...flags,charset};
}
const dictionaryCache=new Map();
export function dictionaryBases(variants=false,leet=false){
  const key=String(variants)+':'+String(leet);if(dictionaryCache.has(key))return dictionaryCache.get(key);
  const entries=new Set(),classic={a:'4',e:'3',i:'1',o:'0',s:'5',t:'7'},symbols={a:'@',i:'!',o:'0',s:'$'};
  for(const word of DICTIONARY){const forms=leet?[word,word.replace(/[aeiost]/g,c=>classic[c]),word.replace(/[aios]/g,c=>symbols[c])]:[word];
    for(const form of forms){entries.add(form);if(variants){entries.add(form[0].toUpperCase()+form.slice(1));entries.add(form.toUpperCase());}}
  }
  const result=Object.freeze([...entries]);dictionaryCache.set(key,result);return result;
}
function dictionaryRadix(p){return p.yearMin===undefined?10n**BigInt(p.suffixDigits):BigInt(p.yearMax-p.yearMin+1);}
function dictionarySuffix(p,index){return p.yearMin===undefined?(p.suffixDigits?String(index).padStart(p.suffixDigits,'0'):''):String(p.yearMin+Number(index));}
function phase(kind,data) {
  const result={kind,...data};
  result.count=kind==='dictionary'?BigInt(dictionaryBases(data.variants,data.leet).length)*dictionaryRadix(result):BigInt(data.charset.length)**BigInt(data.length);
  return result;
}
export function createPhases(input) {
  const c=normalizeConfig(input),phases=[];
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
    const radix=dictionaryRadix(p),bases=dictionaryBases(p.variants,p.leet);
    return bases[Number(n/radix)]+dictionarySuffix(p,n%radix);
  }
  const radix=BigInt(p.charset.length);let value=n,text='';
  for(let i=0;i<p.length;i++){text=p.charset[Number(value%radix)]+text;value/=radix;}return text;
}
export class CandidateCursor {
  constructor(p,start=0n) {
    this.phase=p;this.index=BigInt(start);this.bases=p.kind==='dictionary'?dictionaryBases(p.variants,p.leet):null;this.radix=p.kind==='dictionary'?dictionaryRadix(p):BigInt(p.charset.length);
    if(this.bases){this.wordIndex=Number(this.index/this.radix);this.suffixIndex=Number(this.index%this.radix);this.suffixCount=Number(this.radix);}
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
