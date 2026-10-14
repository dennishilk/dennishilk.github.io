// Small, real CPU format workloads. No GPU comparison is inferred from these.
import {createServer} from 'node:http';import {readFileSync,writeFileSync,statSync} from 'node:fs';import {execFileSync} from 'node:child_process';import{resolve,extname}from'node:path';import{cpus}from'node:os';import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright/index.mjs');
const fixture=(path,format,label)=>({base64:readFileSync(path).toString('base64'),format,label});
const cases=[fixture(resolve(process.env.RUNNER_TEMP??'/tmp','archive-wasm-test/test-v4.rar'),'RAR4','RAR4 encrypted headers'),fixture('tests/fixtures/archive-recovery/rar5-header-gpu-7.rar','RAR5','RAR5 encrypted headers'),...['data-only-copy.7z','data-only-lzma2.7z','test-7z-secret.7z'].map(x=>fixture('tests/fixtures/archive-recovery/'+x,'7Z',x)),fixture('tests/fixtures/archive-recovery/test-pdf-aes256-test9.pdf','PDF','PDF R6 original')];
const pdfs=JSON.parse(execFileSync('python3',['-c',"from pypdf import PdfWriter\nimport io,json,base64\nout={}\nfor a in ['RC4-40','RC4-128','AES-128']:\n w=PdfWriter();w.add_blank_page(width=300,height=300);w.encrypt(user_password='7',owner_password='other',algorithm=a);b=io.BytesIO();w.write(b);out[a]=base64.b64encode(b.getvalue()).decode()\nprint(json.dumps(out))"],{encoding:'utf8'}));for(const[label,base64]of Object.entries(pdfs))cases.push({format:'PDF',label:'PDF '+label,base64});
const root=resolve('.'),server=createServer((q,r)=>{try{let p=resolve(root,'.'+new URL(q.url,'http://localhost').pathname);if(!p.startsWith(root+'/'))throw Error();if(statSync(p).isDirectory())p+='/index.html';r.setHeader('content-type',({'.js':'text/javascript','.mjs':'text/javascript','.html':'text/html','.wasm':'application/wasm','.css':'text/css'})[extname(p)]??'application/octet-stream');r.end(readFileSync(p));}catch{r.statusCode=404;r.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.ARCHIVE_RECOVERY_BROWSER??'/usr/bin/google-chrome',args:['--no-sandbox']});
try{
 const page=await browser.newPage();await page.goto('http://127.0.0.1:'+server.address().port+'/museum/archive-recovery-lab/');await page.waitForFunction(()=>window.archiveRecoveryReady);
 const results=await page.evaluate(async cases=>{
  const {SearchRun}=await import('/assets/archive-recovery-lab/search.js'),{resourcePlan}=await import('/assets/archive-recovery-lab/resources.js'),results=[];
  for(const {base64,format,label}of cases){const blob=new Blob([Uint8Array.from(atob(base64),c=>c.charCodeAt(0))]);for(const workers of [2,4,8,16]){
   const plan=resourcePlan(format,workers,blob.size);if(!plan.allowed){results.push({label,format,workers,blocked:'worker-memory',resourcePlan:plan});continue;}
   const phase={kind:'brute',charset:'0123456789',length:2,count:16n,offset:0n};
   const row=await new Promise((resolve,reject)=>{const run=new SearchRun(blob,[phase],workers,{progress:s=>{if(s.state==='exhausted')resolve({label,format,workers,checked:String(s.checked),elapsedMs:s.elapsed,initMs:s.initMs,attemptsPerSecond:Number(s.checked)/(s.elapsed/1000),resourcePlan:s.resourcePlan});},error:reject},format);run.start();});results.push(row);
  }}return results;
 },cases);
 assert.ok(results.every(x=>x.blocked==='worker-memory'||x.checked==='16'));
 const cgroup=name=>{try{return readFileSync('/sys/fs/cgroup/'+name,'utf8').trim();}catch{return null;}};
 const report={browser:browser.version(),cpu:cpus()[0].model,logicalProcessors:cpus().length,cgroupCpuMax:cgroup('cpu.max'),cgroupMemoryMax:cgroup('memory.max'),note:'Sixteen real rejection checks per accepted configuration, no match. Extraction/download correctness is covered separately by the acceptance browser suites. These short workloads are noisy, not Cthulhu performance.',results};
 const out=process.env.ARCHIVE_CPU_REPORT??'/tmp/archive-cpu-performance.json';writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log('CPU_FORMAT_BENCHMARKS_PASS',out);
}finally{await browser.close();await new Promise(r=>server.close(r));}
