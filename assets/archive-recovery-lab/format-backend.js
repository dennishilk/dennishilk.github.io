// Format-specific CPU engines. Runs only inside the local module Worker.
// ZIP keeps its separate, proven worker bundle and algorithm implementation.
import {safePath,LIMITS} from './core.js';
import {probeUnsupportedFormat} from './format-probe.js?v=20261014-47';

export class FormatEngineError extends Error {
 constructor(code,diagnostic={}){super(code);this.code=code;this.diagnostic=diagnostic;}
}
const fail=(code,diagnostic)=>{throw new FormatEngineError(code,diagnostic);};
const MAX_INPUT=8*1024*1024;
const safeNumber=value=>/^\d+$/.test(value||'')&&Number.isSafeInteger(Number(value))?Number(value):null;

function parse7zListing(raw){
 const text=raw.replace(/\r/g,''),blocks=text.split(/\n-{5,}\n/);
 if(blocks.length<2)fail('malformed');
 const files=blocks.slice(1).join('\n----------\n').split(/\n\n+/)
  .map(group=>Object.fromEntries(group.split('\n').filter(s=>s.includes(' = ')).map(s=>{const i=s.indexOf(' = ');return [s.slice(0,i),s.slice(i+3)];})))
  .filter(entry=>entry.Path);
 const result=[],found=new Set();let total=0;
 for(const f of files){
  const name=safePath(f.Path);
  if(f['Symbolic Link']||f['Hard Link'])fail('symlink');
  // 7-Zip's 7z listing uses Attributes, not the RAR-specific Folder field.
  const directory=f.Folder==='+'||/^D(?:\s|$)/.test(f.Attributes??'')||name.endsWith('/');
  const normalized=name.replace(/\/$/,'').normalize('NFC').toLowerCase();
  if(found.has(normalized))fail('duplicate');
  found.add(normalized);
  const size=safeNumber(f.Size),packed=safeNumber(f['Packed Size']);
  if(!directory&&(size===null||size>LIMITS.entry))fail('limits');
  if(!directory&&packed!==null&&size/Math.max(1,packed)>LIMITS.ratio)fail('limits');
  if(!directory)total+=size;
  if(total>LIMITS.total||result.length>=LIMITS.entries)fail('limits');
  result.push({name,directory,size:directory?0:size,encrypted:f.Encrypted==='+',method:f.Method??'',hasCRC:/^[0-9A-F]{8}$/i.test(f.CRC??'')});
 }
 if(!result.length)fail('malformed');
 const nonDirs=new Set(result.filter(x=>!x.directory).map(x=>x.name.normalize('NFC').toLowerCase()));
 for(const f of result) {
  const parts=f.name.normalize('NFC').toLowerCase().split('/');
  for(let n=1;n<parts.length;n++)if(nonDirs.has(parts.slice(0,n).join('/')))fail('duplicate');
 }
 return {files:result,total,encrypted:result.some(f=>f.encrypted)};
}
function validate7zCodecs(listing,format){
 if(format!=='7Z')return;
 for(const entry of listing.files.filter(f=>!f.directory)){
  // Only covered 7z coder chains. The local 7zr build registers the existing
  // upstream Zstandard decoder under extension ID 04F71101 (listed as ZSTD).
  const codecs=entry.method.split(/\s+/).filter(Boolean);
  if(codecs.some(c=>! /^(?:Copy|LZMA2(?::\d+)?|ZSTD|7zAES(?::\d+)?)$/.test(c)))
   fail('archive-codec',{codec:codecs.includes('04F71101')?'zstandard-04f71101':'unsupported'});
  if(entry.encrypted&&!codecs.some(c=>/^7zAES(?::\d+)?$/.test(c)))fail('encryption');
 }
}
function statusResult(runtime,args,collector){
 collector.length=0;
 try{
  const code=runtime.callMain(args);
  return {code:typeof code==='number'?code:1,output:collector.join('\n')};
 }catch(error){
  // Some Emscripten builds throw raw C++ exception pointers on a bad
  // password. This is never success, nor evidence of a matching password.
  if(error instanceof WebAssembly.RuntimeError||error instanceof RangeError)
   fail(/memory|bounds|allocation/i.test(String(error))?'wasm-memory':'engine-internal');
  return {code:2,output:collector.join('\n'),exception:true};
 }
}

// PDF Standard Security Handler metadata lives in unencrypted dictionaries.
// Resolve the referenced /Encrypt object; do not infer revision from the
// %PDF header or a random /R token in a content stream.
function pdfRevision(raw){
 const text=new TextDecoder('latin1').decode(raw);
 const links=[...text.matchAll(/\/Encrypt\s+(\d+)\s+(\d+)\s+R\b/g)];
 if(!links.length)return null;
 const [id,gen]=links.at(-1).slice(1).map(Number);
 if(!Number.isSafeInteger(id)||!Number.isSafeInteger(gen))return null;
 const re=new RegExp('(?:^|\\n)\\s*'+id+'\\s+'+gen+'\\s+obj\\b([\\s\\S]*?)\\bendobj\\b','g');
 const objects=[...text.matchAll(re)];
 const source=objects.at(-1)?.[1]??'';
 if(!/\/Filter\s*\/Standard\b/.test(source)||!/\/O\b/.test(source)||!/\/U\b/.test(source))return null;
 const rev=Number(source.match(/\/R\s+(\d+)\b/)?.[1]);
 return [2,3,4,6].includes(rev)?rev:null;
}

const pwdArg=password=>{
 if(typeof password!=='string'||!password||new TextEncoder().encode(password).length>256)fail('password');
 if(/[\x00-\x1f\x7f]/.test(password))fail('password');
 return password;
};
function collectExtracted(fs,listed,root='/out'){
 const files=[];let total=0;
 const expected=new Map(listed.filter(e=>!e.directory).map(e=>[e.name.replace(/\\/g,'/'),e]));
 const scan=(folder,prefix)=>{
  for(const name of fs.readdir(folder)){
   if(name==='.'||name==='..')continue;
   const path=folder+'/'+name,rel=prefix?prefix+'/'+name:name,stat=fs.lstat(path);
   safePath(rel);
   if(fs.isLink(stat.mode))fail('symlink');
   if(fs.isDir(stat.mode)){scan(path,rel);continue;}
   if(!fs.isFile(stat.mode))fail('malformed');
   const entry=expected.get(rel);
   if(!entry)fail('malformed');
   const bytes=fs.readFile(path);
   if(bytes.length!==entry.size||bytes.length>LIMITS.entry)fail('malformed');
   total+=bytes.length;if(total>LIMITS.total)fail('limits');
   files.push({name:rel,directory:false,blob:new Blob([bytes],{type:'application/octet-stream'})});
   expected.delete(rel);
  }
 };
 scan(root,'');
 if(expected.size)fail('malformed');
 return files;
}
export async function createFormatBackend(blob,format){
 let stage='preflight';
 try{
 if(!['RAR4','RAR5','7Z','PDF'].includes(format))fail('format');
 if(!(blob instanceof Blob)||blob.size>Math.min(MAX_INPUT,LIMITS.input))fail('limits');
 const probe=await probeUnsupportedFormat(blob,format);
 const collector=[],log=x=>collector.push(String(x));
 let module,source;
 stage='wasm-init';
 if(format==='PDF'){
  const {default:QPDF}=await import('./vendor/qpdf.mjs?v=20261014-47');
  module=await QPDF({noInitialRun:true,print:log,printErr:log});
  source='/selected.pdf';
 }else{
  const {default:SevenZip}=format==='7Z'?
   await import('./vendor/7zr-zstd.es6.js?v=20261014-471'):
   await import('./vendor/7zz.es6.js');
  module=await SevenZip({noInitialRun:true,print:log,printErr:log,
   locateFile:name=>new URL('./vendor/'+name,import.meta.url).href});
  source=format==='7Z'?'/selected.7z':'/selected.rar';
 }
 stage='input';
 module.FS.writeFile(source,new Uint8Array(await blob.arrayBuffer()));
 const run=args=>statusResult(module,args,collector);
 const check7=password=>{
  // For encrypted headers, a successful 'l -slt' proves the password can
  // decrypt a structurally valid directory WITHOUT decompressing untrusted
  // file payloads on every candidate. Full 't' happens independently after
  // a match, only after enforcing declared output limits.
  if(info?.filenamesEncrypted){
   const header=run(['l','-slt','-bd','-y','-p'+pwdArg(password),source]);
   if(header.code!==0)return false;
   const listing=parse7zListing(header.output);
   validate7zCodecs(listing,format);
   return listing.files.length>0;
  }
  const checked=run(['t','-bd','-y','-p'+pwdArg(password),source]);
  if(/Unsupported Method/i.test(checked.output))fail('archive-codec');
  if(/not enough memory|Cannot allocate memory|E_OUTOFMEMORY/i.test(checked.output))fail('limits');
  return checked.code===0&&/Everything is Ok/i.test(checked.output);
 };
 const list7=password=>{
  const r=run(['l','-slt','-bd','-y','-p'+pwdArg(password),source]);
  if(r.code!==0)fail('verification');
  if(/Multivolume\s*=\s*\+|Volumes\s*=\s*[2-9]/i.test(r.output))fail('split');
  const listing=parse7zListing(r.output);
  validate7zCodecs(listing,format);
  return listing;
 };
 const pdfRun=(candidate,action,out)=>{
  const args=['--password='+pwdArg(candidate),...action,source];
  if(out)args.push(out);
  return run(args);
 };
 let info;
 stage='inspection';
 if(format==='PDF'){
  const raw=run(['--show-encryption',source]);
  if(/File is not encrypted/i.test(raw.output))fail('unencrypted');
  const revision=Number(raw.output.match(/\bR\s*=\s*(\d+)/)?.[1])||
   pdfRevision(new Uint8Array(await blob.arrayBuffer()));
  if(![2,3,4,6].includes(revision))fail('pdf-security');
  // A PDF requiring only an owner password has an empty user password.
  // Never represent permissions-only protection as a document-opening lock.
  const unlocked=run(['--password=','--check',source]);
  if(unlocked.code===0)fail('owner-only');
  if(unlocked.exception)fail('engine-internal');
  // An invalid opening password is expected at inspection, not corruption.
  // A revision token alone must never enable an engine that cannot parse it.
  if(!/invalid password|incorrect password/i.test(unlocked.output))
   fail('pdf-structure',{exitCode:unlocked.code});
  info={format,supported:true,algorithms:['PDF Standard Security R'+revision],
   entries:[{filename:'document.pdf'}],encryptedCount:1,total:blob.size,
   revision,filenamesEncrypted:false};
 }else{
  const r=run(['l','-slt','-bd','-y','-p__invalid_probe_password__',source]);
  if(r.code===0){
   const listing=parse7zListing(r.output);
   if(!listing.encrypted)fail('unencrypted');
   // Readable headers do not imply readable contents. Verify entry encryption
   // metadata and known codecs before allowing full-content password checks.
   validate7zCodecs(listing,format);
   if(format!=='7Z')fail('encryption');
   // 7zAES is not authenticated. With readable headers, empty payloads or
   // absent CRCs cannot establish a password, especially with the Copy coder.
   if(!listing.files.some(f=>!f.directory&&f.encrypted&&f.size>0)||
      listing.files.some(f=>!f.directory&&f.encrypted&&!f.hasCRC))fail('unverifiable');
   if(listing.total/blob.size>LIMITS.ratio)fail('limits');
   if(/Multivolume\s*=\s*\+|Volumes\s*=\s*[2-9]/i.test(r.output))fail('split');
   const codecNames=[...new Set(listing.files.filter(f=>!f.directory).flatMap(f=>f.method.split(/\s+/)).filter(c=>/^(ZSTD|Copy|LZMA2(?::\d+)?)$/.test(c)))];
   if(codecNames.includes('ZSTD')){
    // Native 7z configures every folder coder before processing its streams.
    // A deliberately nonmatching probe rejects unsupported codec properties
    // before Start is enabled. A data/password error is expected here.
    const capability=run(['t','-bd','-y','-p__invalid_probe_password__',source]);
    if(/Unsupported Method/i.test(capability.output))fail('archive-codec');
    if(/not enough memory|Cannot allocate memory|E_OUTOFMEMORY/i.test(capability.output))fail('limits');
   }
   info={format,supported:true,algorithms:[format+' AES-256 · '+codecNames.join(' + ')],
    entries:listing.files,encryptedCount:listing.files.filter(f=>f.encrypted).length,
    total:listing.total,filenamesEncrypted:false};
  }else if(/Wrong password|encrypted archive/i.test(r.output)||
     (format==='7Z'&&r.exception&&probe.headerEncrypted===true)){
   info={format,supported:true,algorithms:[format+' encrypted headers'],
    entries:[{name:'encrypted headers'}],encryptedCount:1,total:0,filenamesEncrypted:true};
  }else if(r.exception)fail('engine-internal');
  else if(/Unsupported Method/i.test(r.output))fail('archive-codec');
  else if(/Headers Error|Unexpected end|Is not archive|Can not open/i.test(r.output))fail('malformed');
  else fail('engine-internal',{exitCode:r.code});
 }
 return {info,async check(password){
  if(format!=='PDF')return check7(password);
  const r=pdfRun(password,['--show-encryption']);
  if(r.code!==0)return false;
  // Do not count an owner-only match as recovering the opening password.
  if(/Supplied password is owner password/i.test(r.output)&&
     !/Supplied password is user password/i.test(r.output))return false;
  const checked=pdfRun(password,['--check']);
  return checked.code===0;
 },async recover(password){
  // The caller creates a fresh Worker + fresh archive instance here.
  if(format==='PDF'){
   const r=pdfRun(password,['--show-encryption']);
   if(r.code!==0||(/Supplied password is owner password/i.test(r.output)&&
        !/Supplied password is user password/i.test(r.output)))fail('independent');
   const out='/decrypted.pdf';
   const extraction=pdfRun(password,['--decrypt'],out);
   if(extraction.code!==0)fail('independent');
   const bytes=module.FS.readFile(out);
   if(bytes.length<16||bytes.length>LIMITS.total)fail('limits');
   module.FS.writeFile('/validation.pdf',bytes);
   const valid=run(['--check','/validation.pdf']);
   const security=run(['--show-encryption','/validation.pdf']);
   if(valid.code!==0||!(/File is not encrypted/i.test(security.output)))fail('independent');
   return {files:[{name:'recovered-document.pdf',blob:new Blob([bytes],{type:'application/pdf'}),directory:false}],info};
  }
  if(!check7(password))fail('independent');
  const listing=list7(password);
  if(!listing.encrypted&&!info.filenamesEncrypted)fail('unencrypted');
  // Validate sizes and filenames before any payload decompression. One
  // independently reconstructed worker then tests every CRC and extracts.
  const test=run(['t','-bd','-y','-p'+pwdArg(password),source]);
  if(test.code!==0||!/Everything is Ok/i.test(test.output))fail('independent');
  module.FS.mkdir('/out');
  const extracted=run(['x','-bd','-y','-p'+pwdArg(password),'-o/out',source]);
  if(extracted.code!==0||!/Everything is Ok/i.test(extracted.output))fail('independent');
  const files=collectExtracted(module.FS,listing.files);
  if(!files.length)fail('malformed');
  return {files,info:{...info,entries:listing.files,total:listing.total}};
 }};
 }catch(error){
  // Never forward engine output: qpdf can print the password, and archive
  // listings contain private paths. Diagnostics contain only fixed labels.
  const code=error.code??(stage==='wasm-init'?'wasm-init':
   error instanceof WebAssembly.RuntimeError||error instanceof RangeError?'wasm-memory':'engine-internal');
  throw new FormatEngineError(code,{format,stage,...(error.diagnostic??{})});
 }
}
