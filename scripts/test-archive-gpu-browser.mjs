// Genuine WGSL acceptance. SwiftShader is explicitly a software test device.
import {createServer} from 'node:http';import {readFileSync,writeFileSync,mkdtempSync,statSync} from 'node:fs';import{execFileSync}from'node:child_process';import{resolve,extname}from'node:path';import{tmpdir,cpus,totalmem}from'node:os';import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright/index.mjs');
const root=resolve('.'),out=process.env.ARCHIVE_GPU_REPORT??resolve(mkdtempSync(resolve(tmpdir(),'archive-gpu-')),'report.json');
const rar5Base64=readFileSync(resolve(process.env.RUNNER_TEMP??'/tmp','archive-wasm-test/test-v5.rar')).toString('base64');
const longFixture=mkdtempSync(resolve(tmpdir(),'archive-rar5-long-'));execFileSync('python3',['scripts/archive-gpu-fixtures.py',longFixture,'x'.repeat(127)]);const rar5LongBase64=readFileSync(resolve(longFixture,'rar5-header-gpu-7.rar')).toString('base64');
const fixtures=JSON.parse(execFileSync('python3',['scripts/archive-recovery-fixtures.py'],{encoding:'utf8'}));
const server=createServer((req,res)=>{try{let p=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!p.startsWith(root+'/'))throw Error();if(statSync(p).isDirectory())p+='/index.html';res.setHeader('content-type',({'.js':'text/javascript','.mjs':'text/javascript','.html':'text/html','.css':'text/css','.wasm':'application/wasm'})[extname(p)]??'application/octet-stream');res.setHeader('cache-control','public,max-age=3600');let data=readFileSync(p);if(p.endsWith('/archive-recovery-lab/gpu.js')&&process.env.ARCHIVE_GPU_HARDWARE!=='1')data=Buffer.from(data.toString().replace('allowSoftware=false','allowSoftware=true'));if(p.endsWith('/archive-recovery-lab/gpu-worker.js')&&new URL(req.url,'http://localhost').searchParams.get('drain-delay')==='1200')data=Buffer.from(data.toString().replace('const flags=await gpu.compute(candidates,param);','const flags=await gpu.compute(candidates,param);await new Promise(resolve=>setTimeout(resolve,1200));'));res.end(data);}catch{res.statusCode=404;res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({executablePath:process.env.ARCHIVE_RECOVERY_BROWSER??'/usr/bin/google-chrome',headless:true,args:['--no-sandbox',...(process.env.ARCHIVE_GPU_HARDWARE==='1'?[]:['--enable-unsafe-webgpu','--use-angle=swiftshader','--enable-unsafe-swiftshader'])]}),ctx=await browser.newContext({acceptDownloads:true});
const page=await ctx.newPage(),requests=[],errors=[];ctx.on('request',r=>requests.push({url:r.url(),method:r.method(),body:r.postData()}));page.on('pageerror',e=>errors.push(e.message));
const cgroup=name=>{try{return readFileSync('/sys/fs/cgroup/'+name,'utf8').trim();}catch{return null;}};
const report={createdAt:new Date().toISOString(),cgroupCpuMax:cgroup('cpu.max'),cgroupMemoryMax:cgroup('memory.max'),browser:browser.version(),cpu:cpus()[0].model,logicalProcessors:cpus().length,hostVisibleMemoryBytes:totalmem(),hardwareGpuRequested:process.env.ARCHIVE_GPU_HARDWARE==='1',softwareTestOptIn:process.env.ARCHIVE_GPU_HARDWARE!=='1',benchmarks:[]};
const ready=()=>page.waitForFunction(()=>window.archiveRecoveryReady);
const get=async id=>page.locator('#'+id).textContent();
async function known(length=1,target=page){for(const k of ['de','en','common'])await target.locator('#'+k).uncheck();await target.locator('#brute').check();await target.locator('#mode').selectOption('known');await target.locator('#min').fill(String(length));await target.locator('#max').fill(String(length));for(const k of ['lower','upper','symbols'])await target.locator('#'+k).uncheck();await target.locator('#digits').check();}
async function select(bytes,name='private.zip'){await page.locator('#file').setInputFiles({name,mimeType:'application/octet-stream',buffer:Buffer.from(bytes)});await page.waitForFunction(()=>!document.getElementById('start').disabled||/UNSUPPORTED|NICHT UNTERSTÜTZT/.test(document.getElementById('status').textContent));}
async function found(){await page.waitForFunction(()=>!document.getElementById('result').hidden,{},{timeout:90000});}
async function outputs(rar=false){
 const n=await page.locator('#downloads button').count();assert.equal(n,rar?1:2);
 for(const button of await page.locator('#downloads button').all()){
  const event=page.waitForEvent('download');await button.click();const d=await event,bytes=readFileSync(await d.path());
  if(rar)assert.equal(bytes.toString(),'Independent Python RAR5 AES-256 fixture\n');else if(d.suggestedFilename()==='readme.txt')assert.match(bytes.toString(),/Harmless local demonstration/);else assert.equal(bytes.length,0);
 }
 const event=page.waitForEvent('download');await page.locator('#allzip').click();const d=await event;
 execFileSync('python3',['-c',rar?"import zipfile,sys;z=zipfile.ZipFile(sys.argv[1]);assert z.testzip() is None;assert len(z.infolist())==1;assert z.read('folder/sample.txt')==b'Independent Python RAR5 AES-256 fixture\\n'":"import zipfile,sys;z=zipfile.ZipFile(sys.argv[1]);assert z.testzip() is None;assert len(z.infolist())==2;assert all(not f.flag_bits&1 for f in z.infolist());assert b'Harmless local demonstration' in z.read('demo/readme.txt')",await d.path()]);
}
try{
 await page.goto(origin+'/museum/archive-recovery-lab/');await ready();
 report.adapter=await page.evaluate(async()=>{const {ArchiveGpu}=await import('/assets/archive-recovery-lab/gpu.js');const g=await ArchiveGpu.create({variant:'zip'});try{return g.info;}finally{g.dispose();}});
 if(!process.env.ARCHIVE_GPU_BENCHMARK_ONLY){
 // Actual GPU outputs are compared with independent Python encrypted fixtures,
 // for both AE revisions, compression modes, Unicode, ZIP64 and empty AES.
 report.crypto=await page.evaluate(async fixtures=>{
  const {ArchiveGpu,zipParameters}=await import('/assets/archive-recovery-lab/gpu.js'),{inspect,verifier,recover,exportZip}=await import('/assets/archive-recovery-lab/core.js');
  const gpu=await ArchiveGpu.create(),results=[];if(/swiftshader|llvmpipe|software/i.test(Object.values(gpu.info).join(' '))){let code;try{await ArchiveGpu.create({allowSoftware:false});}catch(e){code=e.code;}if(code!=='gpu-software')throw Error('software guard');}
  try{
   for(const [name,base64] of Object.entries(fixtures).filter(([k])=>/^(zipcrypto|aes|zip64$|empty-aes$)/.test(k))){
    const bytes=Uint8Array.from(atob(base64),x=>x.charCodeAt(0)),blob=new Blob([bytes]),info=await inspect(blob),param=await zipParameters(blob,info),password=['zip64','empty-aes'].includes(name)?'7':'päss🔐';
    const candidates=['wrong','secret',password,'x'.repeat(256)],flags=await gpu.compute(candidates,param),cpu=await verifier(blob);
    if(!(flags[2]&1))throw Error('GPU false negative '+name);
    if(await cpu.check('wrong')||!await cpu.check(password))throw Error('CPU mismatch');
    const recovered=await recover(blob,password);if(recovered.files[0].blob.size&&name!=='zip64'&&!(await recovered.files[0].blob.text()).includes('Independent encrypted fixture'))throw Error('wrong bytes');
    results.push({name,gpuMatch:true,independent:true});
   }
   // A real cryptographic header collision must fail the full CPU check.
   const b=new Blob([Uint8Array.from(atob(fixtures['zipcrypto-0-1']),c=>c.charCodeAt(0))]),i=await inspect(b),p=await zipParameters(b,i),v=await verifier(b);let collisions=0;
   for(let start=0;start<1024;start+=256){const c=Array.from({length:256},(_,k)=>String(start+k)),f=await gpu.compute(c,p);for(let k=0;k<f.length;k++)if(f[k]&1){if(await v.check(c[k]))throw Error('collision accepted');collisions++;}}
   if(!collisions)throw Error('expected real header collisions');
   // Authentication-tag damage preserves PBKDF2 verifier but must yield no match.
   const bytes=Uint8Array.from(atob(fixtures['aes256-0-2']),c=>c.charCodeAt(0)),original=new Blob([bytes]),meta=await inspect(original);bytes[meta.target.dataOffset+meta.target.compressedSize-1]^=1;
   const damaged=new Blob([bytes]),d=await inspect(damaged),f=await gpu.compute(['päss🔐'],await zipParameters(damaged,d));if(!(f[0]&1)||await(await verifier(damaged)).check('päss🔐'))throw Error('authentication gate');
   // Wrong shader and actual device destruction have distinct failure codes.
   let shader;try{await ArchiveGpu.create({source:'invalid WGSL'});}catch(e){shader=e.code;}if(shader!=='gpu-shader')throw Error('shader error classification');
   const lost=await ArchiveGpu.create();lost.device.destroy();await lost.device.lost;await new Promise(r=>setTimeout(r,0));let loss;try{await lost.compute(['x'],p);}catch(e){loss=e.code;}lost.dispose();if(loss!=='gpu-lost')throw Error('loss classification');
   return {vectors:results,collisions,authenticationGate:true,shaderFailure:shader,deviceLoss:loss,adapter:gpu.info};
  }finally{gpu.dispose();}
 },fixtures);
 report.rar5=await page.evaluate(async({base64,longBase64})=>{
  const {ArchiveGpu}=await import('/assets/archive-recovery-lab/gpu.js'),{rar5Parameters}=await import('/assets/archive-recovery-lab/rar5-gpu.js'),{createFormatBackend}=await import('/assets/archive-recovery-lab/format-backend.js?v=20261014-48-drain1');
  const blob=new Blob([Uint8Array.from(atob(base64),c=>c.charCodeAt(0))]),param=await rar5Parameters(blob),gpu=await ArchiveGpu.create();
  try{
   const flags=await gpu.compute(['wrong','junrar','JUNRAR'],param);if(flags.join(',')!=='0,1,0')throw Error('RAR5 GPU flags');
   const backend=await createFormatBackend(blob,'RAR5');if(!backend.info.gpuParameters||await backend.check('wrong')||!await backend.check('junrar'))throw Error('RAR5 CPU mismatch');
   // Real GPU actor and its CPU gate, followed by a fresh native extraction.
   const actor=(blob,candidates)=>new Promise((resolve,reject)=>{const w=new Worker('/assets/archive-recovery-lab/gpu-worker.js?v=20261014-48-drain1',{type:'module'});const timer=setTimeout(()=>{w.terminate();reject(Error('RAR5 worker timeout'));},45000);w.onerror=reject;w.onmessage=({data})=>{
    if(data.type==='ready')w.postMessage({type:'batch',id:1,candidates});
    if(data.type==='error'){clearTimeout(timer);w.terminate();reject(Error(data.code));}
    if(data.type==='done'){clearTimeout(timer);w.terminate();resolve(data);}
   };w.postMessage({type:'init',blob,format:'RAR5'});});
   const run=await actor(blob,['wrong','junrar','JUNRAR']);
   if(run.match!=='junrar'||run.checked!==3)throw Error('RAR5 worker verification');
   const fresh=await createFormatBackend(blob,'RAR5'),{files}=await fresh.recover(run.match);if(files.length!==1||await files[0].blob.text()!=='file1\n')throw Error('RAR5 extraction mismatch');
   const longBlob=new Blob([Uint8Array.from(atob(longBase64),c=>c.charCodeAt(0))]),longCandidate='x'.repeat(128),longRun=await actor(longBlob,['wrong',longCandidate]);if(longRun.match!==longCandidate)throw Error('RAR5 native truncation mismatch');const longFresh=await createFormatBackend(longBlob,'RAR5');if((await longFresh.recover(longCandidate)).files.length!==1)throw Error('RAR5 long independent gate');
   const {exportZip}=await import('/assets/archive-recovery-lab/core.js');const zip=await exportZip(files);
   return {flags:[...flags],checked:run.checked,independent:true,iterations:param.iterations,zip:Array.from(new Uint8Array(await zip.arrayBuffer()))};
  }finally{gpu.dispose();}
 },{base64:rar5Base64,longBase64:rar5LongBase64});
 const rarZip=resolve(tmpdir(),'archive-gpu-rar5-verified.zip');writeFileSync(rarZip,Buffer.from(report.rar5.zip));delete report.rar5.zip;
 execFileSync('python3',['-c',"import zipfile,sys;z=zipfile.ZipFile(sys.argv[1]);assert z.testzip() is None;assert z.read(z.namelist()[0])==b'file1\\n'",rarZip]);
 console.log('PASS genuine RAR5 WGSL, wrong/correct candidates, CPU gate, native extraction and independent ZIP bytes');
 console.log('PASS genuine WGSL: independent ZIP variants, Unicode, long HMAC keys, real collisions, authentication, shader errors, device loss');
 for(const language of ['en','de']){
  await page.goto(origin+(language==='de'?'/de':'')+'/museum/archive-recovery-lab/');await ready();
  assert.equal(await page.locator('#engine').inputValue(),'cpu');assert.equal(await page.locator('#workers').inputValue(),'2');
  assert.deepEqual(await page.locator('#workers option').evaluateAll(a=>a.map(x=>Number(x.value))),Array.from({length:16},(_,i)=>i+1));
  for(const n of Array.from({length:16},(_,i)=>i+1)){await page.locator('#workers').selectOption(String(n));assert.equal(await page.locator('#workers').inputValue(),String(n));}
  await page.locator('#workers').selectOption('2');await page.locator('#authorized').check();
  await page.locator('#hardware-details summary').first().click();await page.locator('#gpu-check').click();await page.waitForFunction(()=>!document.getElementById('gpu-check').disabled,{},{timeout:60000});
  assert.equal(JSON.parse(await get('gpu-diagnostics')).code,'ready');assert.equal(await page.locator('#engine').inputValue(),'cpu');
  for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:950});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}
  for(const method of ['zipcrypto','aes128','aes192','aes256']){
   const bytes=await page.evaluate(async method=>{const {createDemo}=await import('/assets/archive-recovery-lab/core.js');return Array.from(new Uint8Array(await(await createDemo('7',method)).arrayBuffer()));},method);
   await select(bytes);await known();await page.locator('#engine').selectOption('gpu');await page.locator('#start').click();await found();assert.equal(await page.locator('#recovered').inputValue(),'7');assert.match(await get('result-engine'),/GPU/);await outputs();
  }
  // Independently generated RAR5: both real engines, actual UI and downloads.
  for(const engine of ['gpu','hybrid']){
   await select([...readFileSync('tests/fixtures/archive-recovery/rar5-header-gpu-7.rar')],'independent.rar');await known();await page.locator('#engine').selectOption(engine);await page.locator('#start').click();await found();assert.equal(await page.locator('#recovered').inputValue(),'7');await outputs(true);
  }
  await ctx.setOffline(true);await page.locator('#start').click();await found();await outputs(true);await ctx.setOffline(false);
  // Hybrid with enough candidates to give both actors real disjoint work.
  const bytes=await page.evaluate(async()=>{const {createDemo}=await import('/assets/archive-recovery-lab/core.js');return Array.from(new Uint8Array(await(await createDemo('777','aes256')).arrayBuffer()));});
  await select(bytes);await known(3);await page.locator('#engine').selectOption('hybrid');await page.locator('#start').click();await found();assert.equal(await page.locator('#recovered').inputValue(),'777');await outputs();
  // The same cached modules, WGSL and fresh workers must operate offline.
  await ctx.setOffline(true);await page.locator('#start').click();await found();await outputs();await ctx.setOffline(false);
  // Real GPU/Hybrid control lifecycle, with no match in the configured space.
  const long=await page.evaluate(async()=>{const {createDemo}=await import('/assets/archive-recovery-lab/core.js');return Array.from(new Uint8Array(await(await createDemo('99999')).arrayBuffer()));});
  await page.evaluate(()=>{window.originalArchiveTestWorker=Worker;globalThis.Worker=class extends Worker{constructor(url,options){if(String(url).includes('/gpu-worker.js')){const delayed=new URL(url);delayed.searchParams.set('drain-delay','1200');url=delayed;}super(url,options);}};});
  for(const engine of ['gpu','hybrid']){
   await select(long);await known(4);await page.locator('#engine').selectOption(engine);await page.locator('#start').click();await page.waitForFunction(()=>document.body.dataset.recoveryState==='running');
   await page.locator('#pause').click();await page.waitForFunction(()=>document.body.dataset.recoveryState==='paused');
   // An in-flight dispatch drains; after that no new work may be submitted.
   await page.waitForFunction(()=>document.body.dataset.pauseDraining==='false',{},{timeout:35000});const paused=await get('checked');await page.waitForTimeout(200);assert.equal(await get('checked'),paused);
   await page.locator('#resume').click();await page.waitForFunction(()=>document.body.dataset.recoveryState==='running');await page.locator('#stop').click();await page.waitForFunction(()=>document.body.dataset.recoveryState==='stopped');assert.equal(await page.locator('#result').isHidden(),true);
  }
  await page.evaluate(()=>{globalThis.Worker=window.originalArchiveTestWorker;delete window.originalArchiveTestWorker;});
  // File change keeps the chosen unavailable mode; explicit CPU choice required.
  await page.locator('#file').setInputFiles('tests/fixtures/archive-recovery/test-7z-secret.7z');await page.waitForFunction(()=>/ZSTD/.test(document.getElementById('file-status').textContent));
  assert.equal(await page.locator('#engine').inputValue(),'hybrid');assert.equal(await page.locator('#engine option[value=gpu]').isDisabled(),true);assert.equal(await page.locator('#start').isDisabled(),true);assert.match(await get('engine-help'),/7Z/);await page.locator('#engine').selectOption('cpu');assert.equal(await page.locator('#start').isEnabled(),true);
  await page.locator('#workers').selectOption('16');await page.locator('#start').click();await page.waitForFunction(()=>document.body.dataset.recoveryState==='error');assert.equal(await page.locator('#workers').inputValue(),'16');assert.match(await get('status-detail'),language==='de'?/Speicherbudget/:/memory budget/);await page.locator('#workers').selectOption('2');
  await page.locator('#engine').focus();await page.keyboard.press('Home');assert.equal(await page.locator('#engine').inputValue(),'cpu');
  console.log('PASS',language,'manual engines, 1–16 choices, downloads, Hybrid, offline, unsupported-file transition, responsive and keyboard');
 }
 // A valid GPU filter match on one entry cannot authorize a different password
 // on a second entry: the fresh, complete verifier must refuse all downloads.
 const mixed=await page.evaluate(async()=>{const zip=(await import('/assets/archive-recovery-lab/zip-api.js')).default;const w=new zip.ZipWriter(new zip.BlobWriter());await w.add('one.txt',new zip.TextReader('one'),{password:'7',encryptionStrength:3});await w.add('two.txt',new zip.TextReader('two'),{password:'8',encryptionStrength:3});return Array.from(new Uint8Array(await(await w.close()).arrayBuffer()));});
 await select(mixed);await known();await page.locator('#engine').selectOption('gpu');await page.locator('#start').click();await page.waitForFunction(()=>document.body.dataset.recoveryState==='error');assert.equal(await page.locator('#result').isHidden(),true);assert.equal(await page.locator('#downloads button').count(),0);assert.equal(await page.locator('#engine').inputValue(),'gpu');
 // Actual device loss during a Hybrid run terminates both paths, without fallback.
 const slow=await page.evaluate(async()=>{const {createDemo}=await import('/assets/archive-recovery-lab/core.js');return Array.from(new Uint8Array(await(await createDemo('99999')).arrayBuffer()));});
 await select(slow);await known(4);await page.locator('#engine').selectOption('hybrid');
 await ctx.route('**/gpu-worker.js*',route=>route.fulfill({contentType:'text/javascript',body:readFileSync('assets/archive-recovery-lab/gpu-worker.js','utf8').replace("if(!stopped)self.postMessage({type:'ready',info:gpu.info});return;","if(!stopped)self.postMessage({type:'ready',info:gpu.info});setTimeout(()=>{if(!stopped)gpu.device.destroy();},100);return;")}));
 await page.locator('#start').click();await page.waitForFunction(()=>document.body.dataset.recoveryState==='error',{},{timeout:60000});assert.match(await get('status-detail'),/GPU/);assert.equal(await page.locator('#engine').inputValue(),'hybrid');assert.equal(await page.locator('#result').isHidden(),true);assert.equal(await page.locator('#engine option[value=hybrid]').isDisabled(),true);await ctx.unroute('**/gpu-worker.js*');
 // A fresh capability check cannot enable modes when the real shader is invalid.
 await ctx.route('**/crypto.wgsl*',route=>route.fulfill({contentType:'text/plain',body:'invalid WGSL'}));await page.locator('#gpu-check').click();await page.waitForFunction(()=>!document.getElementById('gpu-check').disabled);assert.equal(JSON.parse(await get('gpu-diagnostics')).code,'gpu-shader');assert.equal(await page.locator('#start').isDisabled(),true);await ctx.unroute('**/crypto.wgsl*');
 console.log('PASS full independent-verification gate, live Hybrid device loss, shader failure, no downloads and no CPU fallback');
 // A RAR5-specific KAT failure must not hold back a validated ZIP kernel.
 await ctx.route('**/gpu.js*',route=>route.fulfill({contentType:'text/javascript',body:readFileSync('assets/archive-recovery-lab/gpu.js','utf8').replace('allowSoftware=false','allowSoftware=true').replace("async selftest(variant='all'){","async selftest(variant='all'){if(variant==='rar5')throw gpuError('gpu-selftest');")}));
 await page.locator('#gpu-check').click();await page.waitForFunction(()=>!document.getElementById('gpu-check').disabled,{},{timeout:60000});const partial=JSON.parse(await get('gpu-diagnostics'));assert.equal(partial.adapter.validated.ZIP,true);assert.equal(partial.adapter.failures.RAR5,'gpu-selftest');assert.equal(await page.locator('#start').isEnabled(),true);
 await page.locator('#file').setInputFiles('tests/fixtures/archive-recovery/rar5-header-gpu-7.rar');await page.waitForFunction(()=>/RAR5/.test(document.getElementById('file-status').textContent));assert.equal(await page.locator('#start').isDisabled(),true);assert.match(await get('engine-help'),/Selbsttests|self-tests/);await ctx.unroute('**/gpu.js*');

 }
 // Real exhaustive workloads, same input and exactly 1,000 completed candidates.
 report.benchmarks=await page.evaluate(async rar5Base64=>{
  const {createDemo,recover}=await import('/assets/archive-recovery-lab/core.js'),{SearchRun}=await import('/assets/archive-recovery-lab/search.js');const results=[];
  for(const method of ['zipcrypto','aes128','aes192','aes256']){
   const blob=await createDemo('9999',method);for(const [engine,workers]of[['cpu',2],['cpu',4],['cpu',8],['cpu',16],['gpu',2],['hybrid',2]]){
    const phase={kind:'brute',charset:'0123456789',length:3,count:1000n,offset:0n};
    const entry=await new Promise((resolve,reject)=>{const run=new SearchRun(blob,[phase],workers,{progress:s=>{if(s.state==='exhausted')resolve({engine,workers:engine==='gpu'?0:workers,selectedWorkerCount:workers,format:method,checked:String(s.checked),cpuChecked:String(s.cpuChecked),gpuChecked:String(s.gpuChecked),elapsedMs:s.elapsed,initMs:s.initMs,attemptsPerSecond:Number(s.checked)/(s.elapsed/1000),resourcePlan:s.resourcePlan});},error:reject},'ZIP',{engine});run.start();});
    const r=await recover(blob,'9999');entry.independent=r.files.length===2&&(await r.files[0].blob.text()).includes('Harmless local demonstration');results.push(entry);
   }
  }
  const {resourcePlan}=await import('/assets/archive-recovery-lab/resources.js'),{createFormatBackend}=await import('/assets/archive-recovery-lab/format-backend.js?v=20261014-48-drain1');
  const rar=new Blob([Uint8Array.from(atob(rar5Base64),c=>c.charCodeAt(0))]);
  for(const [engine,workers]of[['cpu',2],['cpu',4],['cpu',8],['cpu',16],['gpu',2],['hybrid',2]]){
   const plan=resourcePlan('RAR5',workers,rar.size,{engine});
   if(!plan.allowed){results.push({engine,workers,format:'rar5',blocked:'worker-memory',resourcePlan:plan});continue;}
   const phase={kind:'brute',charset:'0123456789',length:2,count:64n,offset:0n};
   const entry=await new Promise((resolve,reject)=>{const run=new SearchRun(rar,[phase],workers,{progress:s=>{if(s.state==='exhausted')resolve({engine,workers:engine==='gpu'?0:workers,selectedWorkerCount:workers,format:'rar5',checked:String(s.checked),cpuChecked:String(s.cpuChecked),gpuChecked:String(s.gpuChecked),elapsedMs:s.elapsed,initMs:s.initMs,attemptsPerSecond:Number(s.checked)/(s.elapsed/1000),resourcePlan:s.resourcePlan});},error:reject},'RAR5',{engine});run.start();});
   const {files}=await(await createFormatBackend(rar,'RAR5')).recover('junrar');entry.independent=files.length===1&&await files[0].blob.text()==='file1\n';results.push(entry);
  }
  return results;
 },rar5Base64);
 for(const x of report.benchmarks){if(x.blocked){assert.equal(x.blocked,'worker-memory');continue;}assert.equal(x.checked,x.format==='rar5'?'64':'1000');assert.equal(x.independent,true);if(x.engine==='hybrid'){assert.ok(Number(x.cpuChecked)>0);assert.ok(Number(x.gpuChecked)>0);}}
 writeFileSync(out,JSON.stringify(report,null,2)+'\n');
 console.log('BENCHMARKS',JSON.stringify(report.benchmarks.map(x=>({format:x.format,engine:x.engine,workers:x.workers,rate:Math.round(x.attemptsPerSecond)}))));
 if(!process.env.ARCHIVE_GPU_BENCHMARK_ONLY){
 // CPU still works with no WebGPU interface and hardware concurrency = 1.
 const noGpu=await browser.newContext();await noGpu.addInitScript(()=>{Object.defineProperty(navigator,'gpu',{value:undefined});Object.defineProperty(navigator,'hardwareConcurrency',{value:1});});const q=await noGpu.newPage();await q.goto(origin+'/museum/archive-recovery-lab/');await q.waitForFunction(()=>window.archiveRecoveryReady);assert.equal(await q.locator('#workers').inputValue(),'2');assert.equal(await q.locator('#engine').inputValue(),'cpu');await q.locator('#authorized').check();await q.locator('#load-demo').isDisabled();
 const bytes=await page.evaluate(async()=>{const {createDemo}=await import('/assets/archive-recovery-lab/core.js');return Array.from(new Uint8Array(await(await createDemo('7')).arrayBuffer()));});await q.locator('#file').setInputFiles({name:'no-gpu.zip',mimeType:'application/zip',buffer:Buffer.from(bytes)});await q.waitForFunction(()=>!document.getElementById('start').disabled);assert.equal(await q.locator('#engine option[value=gpu]').isDisabled(),true);await known(1,q);await q.locator('#start').click();await q.waitForFunction(()=>!document.getElementById('result').hidden,{},{timeout:60000});assert.equal(await q.locator('#recovered').inputValue(),'7');await noGpu.close();
 for(const reported of [16,24,32]){const c=await browser.newContext();await c.addInitScript(n=>Object.defineProperty(navigator,'hardwareConcurrency',{value:n}),reported);const p=await c.newPage();await p.goto(origin+'/museum/archive-recovery-lab/');await p.waitForFunction(()=>window.archiveRecoveryReady);assert.equal(await p.locator('#workers').inputValue(),'2');assert.equal(await p.locator('#engine').inputValue(),'cpu');await c.close();}

 }
 assert.equal(requests.some(r=>new URL(r.url).origin!==origin||r.method!=='GET'||r.body),false);assert.deepEqual(errors,[]);report.requests=requests.length;report.privateTransmissions=0;report.pageErrors=errors;writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log('PASS real CPU 2/4/8/16, GPU and Hybrid benchmarks; report:',out);
}finally{await ctx.close();await browser.close();await new Promise(r=>server.close(r));}
