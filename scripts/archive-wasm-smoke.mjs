import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import SevenZip from '../assets/archive-recovery-lab/vendor/7zz.es6.js';
import {createFormatBackend} from '../assets/archive-recovery-lab/format-backend.js';
const dir=resolve(process.env.RUNNER_TEMP||'/tmp','archive-wasm-test');
mkdirSync(dir,{recursive:true});
writeFileSync(resolve(dir,'sample.txt'),'Real encrypted WASM file - Grüße 🔐\n');
execFileSync('7z',['a','-t7z','-mhe=on','-p7','-y',resolve(dir,'encrypted.7z'),resolve(dir,'sample.txt')],{stdio:'pipe'});
const python=["from pypdf import PdfWriter","from pathlib import Path","p=Path("+JSON.stringify(dir)+")",
 "for algo in ['RC4-40','RC4-128','AES-128','AES-256']:",
 " w=PdfWriter();w.add_blank_page(width=300,height=300)",
 " w.encrypt(user_password='7',owner_password='owner-other',algorithm=algo)",
 " with open(p/('encrypted-'+algo+'.pdf'),'wb') as f:w.write(f)"].join('\n');
execFileSync('python3',['-c',python]);
let output=[];
const opts={print:x=>output.push('OUT '+x),printErr:x=>output.push('ERR '+x)};
const z=await SevenZip({...opts,locateFile:name=>new URL('../assets/archive-recovery-lab/vendor/'+name,import.meta.url).pathname,noInitialRun:true});
const samples=[
 ['RAR4',readFileSync(resolve(dir,'test-v4.rar')),'junrar'],
 ['RAR5',readFileSync(resolve(dir,'test-v5.rar')),'junrar'],
 ['7Z',readFileSync(resolve(dir,'encrypted.7z')),'7']];
for(let index=0;index<samples.length;index++){
 const [label,data,pass]=samples[index],name='/test-'+index+(index===2?'.7z':'.rar');
 z.FS.writeFile(name,data);
 for(const candidate of ['wrong',pass]){
  output=[];let code;
  try{code=z.callMain(['t','-bd','-y','-p'+candidate,name]);}
  catch(e){code='EXCEPTION: '+e;}
  console.log(JSON.stringify({engine:'7zz',label,candidate,code,tail:output.slice(-9)}));
  if(candidate===pass)assert.equal(code,0,label+' correct password');else assert.notEqual(code,0,label+' wrong password must be rejected');
 }
 output=[];
 const code=z.callMain(['x','-bd','-y','-p'+pass,'-o/out-'+index,name]);
 console.log(JSON.stringify({engine:'7zz',label,operation:'extract',code,tail:output.slice(-5)}));
 assert.equal(code,0);
}
for(const [label,data,password] of samples){
 const backend=await createFormatBackend(new Blob([data]),label);
 assert.equal(backend.info.supported,true);
 assert.equal(await backend.check('wrong'),false);
 assert.equal(await backend.check(password),true);
 const recovered=await backend.recover(password);
 assert.ok(recovered.files.length>=1);
 for(const f of recovered.files)assert.ok(f.blob.size>0&&f.blob.size<=16*1024*1024);
 console.log('REAL_BACKEND_RECOVERY',label,recovered.files.map(x=>x.name));
}
console.log('REAL_WASM_SMOKE_SUCCESS');
