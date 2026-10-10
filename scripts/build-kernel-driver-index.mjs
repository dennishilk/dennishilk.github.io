#!/usr/bin/env node
// Offline, deterministic conversion of kernel-build modules.alias (+ optional built-in aliases).
// All bus partitions are fetched at fixed URLs; no device-dependent network requests.
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';

const argv = process.argv.slice(2), options = {};
for (let i=0; i<argv.length; i+=2) {
  if (!/^--[a-z-]+$/.test(argv[i]) || !argv[i+1] || argv[i+1].startsWith('--')) throw Error('Invalid argument '+argv[i]);
  options[argv[i].slice(2)] = argv[i+1];
}
if (!options.aliases || !options.release || !options.out) throw Error('Usage: node scripts/build-kernel-driver-index.mjs --aliases PATH --release RELEASE --out DIR [--builtin PATH] [--config PATH] [--source-label LABEL]');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const source = p => {const bytes=readFileSync(p); return {label:options['source-label'] || p, sha256:hash(bytes),bytes:bytes.length};};
const provenance={modulesAlias:source(options.aliases)};
if (options.config) provenance.kernelConfig=source(options.config);
if (options.builtin) provenance.modulesBuiltinModinfo=source(options.builtin);
const buses=['pci','usb','hid'];
const VALID=/^(pci|usb|hid):[a-zA-Z0-9*?\[\]-]{1,240}$/;
const MODULE=/^[A-Za-z0-9_.-]{1,100}$/;
const entries=new Map(), byPattern=new Map();
const counts={aliasFileRows:0,builtinRows:0,duplicateRows:0,ambiguousPatterns:0,invalidRows:0,unsupportedBusRows:0};
function add(pattern,module,kind){
  if (!VALID.test(pattern) || !MODULE.test(module)) {counts.invalidRows++;return;}
  const bus=pattern.slice(0,pattern.indexOf(':'));
  if (!buses.includes(bus)){counts.unsupportedBusRows++;return;}
  const id=JSON.stringify([pattern,module,kind]);
  if(entries.has(id)){counts.duplicateRows++;return;}
  entries.set(id,[pattern,module,kind]);
  const previous=byPattern.get(pattern)||new Set(); previous.add(module+'|'+kind); byPattern.set(pattern,previous);
}
for(const line of readFileSync(options.aliases,'utf8').split(/\r?\n/)){
  if(!line.startsWith('alias ')) continue;
  const m=line.match(/^alias (\S+) (\S+)$/); if(!m) {counts.invalidRows++;continue;}
  if (!buses.some(b=>m[1].startsWith(b+':'))) {counts.unsupportedBusRows++;continue;}
  counts.aliasFileRows++; add(m[1],m[2],'module');
}
if(options.builtin) for(const field of readFileSync(options.builtin).toString('utf8').split('\0')){
  const m=field.match(/^([A-Za-z0-9_.-]+)\.alias=(\S+)$/);
  if(!m || !buses.some(b=>m[2].startsWith(b+':'))) continue;
  counts.builtinRows++; add(m[2],m[1],'builtin');
}
counts.ambiguousPatterns=[...byPattern.values()].filter(s=>s.size>1).length;
const out=resolve(options.out);mkdirSync(out,{recursive:true});
for(const name of readdirSync(out)) if (/^(pci|usb|hid)\.json$|^manifest\.json$/.test(name))rmSync(join(out,name));
const files={}, aliasCount={};
const field=(pattern,bus,key)=>{
  if (bus==='hid') {const m=/^hid:b(.*?)g(.*?)v(.*?)p(.*)$/.exec(pattern);return m?.[key==='vendor'?3:4]||'*';}
  if(bus==='pci'){const m=/^pci:v(.*?)d(.*?)sv(.*?)sd(.*?)bc(.*?)sc(.*?)i(.*)$/.exec(pattern);return m?.[key==='vendor'?1:2]||'*';}
  const m=/^usb:v(.*?)p(.*?)d(.*?)dc(.*?)dsc(.*?)dp(.*?)ic(.*?)isc(.*?)ip(.*?)in(.*)$/.exec(pattern);
  return m?.[key==='vendor'?1:2]||'*';
};
const literal=(str,len)=>str.length===len && new RegExp(`^[0-9a-f]{${len}}$`,'i').test(str)?str.toLowerCase():null;
const compare=(a,b)=>a<b?-1:a>b?1:0;
const ordered=[...entries.values()].sort((a,b)=>compare(a[0],b[0])||compare(a[1],b[1])||compare(a[2],b[2]));
for(const bus of buses){
  const data={schema:2,bus,vendor:{},generic:[]};let n=0;
  for(const entry of ordered){const [pattern]=entry;if(!pattern.startsWith(bus+':'))continue;
    n++;
    const v=literal(field(pattern,bus,'vendor'),bus==='usb'?4:8);
    const key=v?(bus==='pci'?v.slice(-4):bus==='hid'?v.slice(-8):v):null;
    const p=literal(field(pattern,bus,'device'),bus==='usb'?4:8);
    if(!key){data.generic.push(entry);continue;}
    const group=(data.vendor[key]||={exact:{},broad:[]});
    if(p){(group.exact[p]||=[]).push(entry);}else group.broad.push(entry);
  }
  const encoded=JSON.stringify(data)+'\n',name=bus+'.json';writeFileSync(join(out,name),encoded);
  files[bus]={name,sha256:hash(encoded),bytes:Buffer.byteLength(encoded),aliases:n,generic:data.generic.length,vendors:Object.keys(data.vendor).length};aliasCount[bus]=n;
}
const manifest={schema:2,generatedFrom:'kernel-build-module-aliases',kernelRelease:options.release,source:provenance,
 buses,downloadPolicy:'always-fetch-fixed-three-bus-files',sourceCoverage:'Loadable module aliases, plus only built-in aliases actually present in the optional NUL-delimited built-in metadata; no absent aliases fabricated.',
 semantics:'Build-specific possible candidates only; not an installed, loaded, bound or functional-device claim. Missing alias is not proof of unsupported hardware.',
 counts:{...counts,total:ordered.length,byBus:aliasCount},files};
writeFileSync(join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({release:manifest.kernelRelease,counts:manifest.counts,files:manifest.files},null,2));
