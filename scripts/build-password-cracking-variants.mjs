import {readFileSync,writeFileSync,readdirSync,unlinkSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {DICTIONARIES} from '../assets/password-cracking-lab/dictionary.js';
import {wordForms} from '../assets/password-cracking-lab/transformations.js';
const base=new URL('../assets/password-cracking-lab/',import.meta.url);
const notices=['LICENSE-english-SCOWL.txt','LICENSE-ESDB80.txt','LICENSE-common-MIT.txt'].map(name=>'/* '+name+'\n'+readFileSync(new URL('wordlists/'+name,base),'utf8').replaceAll('*/','* /')+'*/\n').join('');
const check=process.argv.includes('--check'),descriptors={},files=new Map();let imports='';
for(const [language,words] of Object.entries(DICTIONARIES)){
  const unique=new Set();for(const word of words)for(const form of wordForms(word,true,true))unique.add(form);
  const forms=[...unique],lengths=Buffer.alloc(forms.length),content=Buffer.from(forms.join(''),'utf8'),header=Buffer.alloc(4);header.writeUInt32LE(forms.length);
  forms.forEach((form,i)=>lengths[i]=Buffer.byteLength(form));const bytes=Buffer.concat([header,lengths,content]);
  const zipped=gzipSync(bytes,{level:9}),encoded=zipped.toString('base64'),parts=[];
  for(let offset=0,index=0;offset<encoded.length;offset+=800000,index++){
    const name='variant-pack-'+language+'-'+index+'.js',symbol='pack_'+language+'_'+index;parts.push(symbol);
    imports+='import {'+symbol+'} from "./'+name+'?v=20261013-bud-1";\n';
    files.set(name,notices+'// Generated dictionary-index chunk. Sources/licenses: wordlists/sources.json.\nexport const '+symbol+'='+JSON.stringify(encoded.slice(offset,offset+800000))+';\n');
  }
  descriptors[language]={count:forms.length,compressedBytes:zipped.length,uncompressedBytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),parts};
}
let meta='// Generated deterministic ASCII variant indexes.\n'+imports+'export const VARIANT_PACKS={\n';
for(const [language,d] of Object.entries(descriptors)){const {parts,...rest}=d;meta+=JSON.stringify(language)+':{...'+JSON.stringify(rest)+',parts:['+parts.join(',')+']},\n';}meta+='};\n';files.set('packed-variants.js',meta);
for(const [name,content] of files){if(check){if(readFileSync(new URL(name,base),'utf8')!==content)throw new Error('Outdated '+name);}else writeFileSync(new URL(name,base),content);}
if(!check)for(const name of readdirSync(base))if(/^variant-pack-/.test(name)&&!files.has(name))unlinkSync(new URL(name,base));
console.log(JSON.stringify(Object.fromEntries(Object.entries(descriptors).map(([l,d])=>[l,{...d,parts:d.parts.length}]))));
