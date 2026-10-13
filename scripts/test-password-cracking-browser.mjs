// Real browser acceptance. The optional software adapter permission is confined
// to this test harness; public GPU / Hybrid controls reject software adapters.
import {createServer} from 'node:http';
import {readFile,stat,mkdir} from 'node:fs/promises';
import {resolve,extname,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const modules=process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
const {chromium}=await import(modules?`${modules}/playwright/index.mjs`:'playwright');
const server=createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost');
    if(url.pathname==='/__password_lab_test__'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><html lang="en"><title>Private engine acceptance test</title><body></body></html>');return;}
    let file=resolve(root,'.'+decodeURIComponent(url.pathname));if(!file.startsWith(root+'/'))throw new Error('Outside repository');
    if((await stat(file)).isDirectory())file=resolve(file,'index.html');
    res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.wgsl':'text/plain','.woff2':'font/woff2','.png':'image/png','.webp':'image/webp','.xml':'application/xml'})[extname(file)]??'application/octet-stream');
    res.end(await readFile(file));
  }catch{res.statusCode=404;res.end('Not found');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({executablePath:process.env.PASSWORD_LAB_BROWSER||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--enable-unsafe-webgpu','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const context=await browser.newContext(),page=await context.newPage(),errors=[],httpRequests=[];let passed=0;
page.setDefaultTimeout(120000);
page.on('request',request=>{if(/^https?:/.test(request.url()))httpRequests.push(request.url());});
page.on('pageerror',error=>errors.push(error.message));const pass=message=>{passed++;console.log('PASS '+message);};
const screenshot=async(surface,name)=>{if(!process.env.PASSWORD_LAB_QA_DIR)return;await mkdir(process.env.PASSWORD_LAB_QA_DIR,{recursive:true});await surface.screenshot({path:resolve(process.env.PASSWORD_LAB_QA_DIR,name+'.png'),fullPage:true});};
try{
  await page.goto(base+'/__password_lab_test__');
  const gpu=await page.evaluate(async()=>{
    const {GpuSha256}=await import('/assets/password-cracking-lab/gpu.js');const {encodeAsciiBlock,hexWords,hashHex,digestHex}=await import('/assets/password-cracking-lab/sha256.js');
    const {createPhases,candidateAt}=await import('/assets/password-cracking-lab/search.js');
    const engine=await GpuSha256.create({allowSoftware:true});
    try{
      const vectors=['','abc','123','123!','katharina2482','a'.repeat(55),...Array.from({length:137},(_,i)=>'vector'+i+'!')],blocks=new Uint32Array(vectors.length*16);
      vectors.forEach((v,i)=>encodeAsciiBlock(v,blocks,i*16));const result=await engine.compute(blocks,vectors.length,hexWords(hashHex('123')),true);
      if(result.match!==2||vectors.some((v,i)=>digestHex(result.digests.subarray(i*8,i*8+8))!==hashHex(v)))throw new Error('GPU digest disagreement');
      const phase=createPhases({strategy:'numeric',min:24,max:24})[0],start=9007199254740993n,target=hashHex(candidateAt(phase,start+77n));
      const big=await engine.batch(phase,start,4096,hexWords(target));if(big.match!==77)throw new Error('GPU index above 2^53 is incorrect');
      const noMatch=await engine.batch(phase,start,71,hexWords(hashHex('outside')));if(noMatch.match!==null)throw new Error('GPU reported a stale or false match');
      const duplicates=new Uint32Array(65*16);for(let i=0;i<65;i++)encodeAsciiBlock(i===7||i===64?'abc':'other'+i,duplicates,i*16);
      const first=await engine.compute(duplicates,65,hexWords(hashHex('abc')));if(first.match!==7)throw new Error('GPU atomic first-match result is incorrect');
      return {info:engine.info,vectors:vectors.length};
    }finally{engine.dispose();}
  });
  console.log('Actual WebGPU adapter: '+JSON.stringify(gpu.info)+'; physical GPU verified: '+!gpu.info.software);
  pass('real browser WGSL SHA-256 agrees with CPU on '+gpu.vectors+' vectors and exact indices above 2^53');
  const compatibility=await page.evaluate(async()=>{
    const {GpuSha256}=await import('/assets/password-cracking-lab/gpu.js');
    const {createPhases}=await import('/assets/password-cracking-lab/search.js');
    const {hexWords,hashHex}=await import('/assets/password-cracking-lab/sha256.js');
    const api=navigator.gpu,request=api.requestAdapter.bind(api),calls=[];
    Object.defineProperty(api,'requestAdapter',{configurable:true,value:options=>{calls.push(options);return options.featureLevel==='compatibility'?request(options):Promise.resolve(null);}});
    let engine;
    try{engine=await GpuSha256.create({allowSoftware:true});const result=await engine.batch(createPhases({strategy:'numeric',min:3,max:3})[0],100n,64,hexWords(hashHex('123')));return {match:result.match,featureLevel:engine.info.featureLevel,calls};}
    finally{engine?.dispose();delete api.requestAdapter;}
  });
  assert.equal(compatibility.match,23);assert.equal(compatibility.featureLevel,'compatibility');assert.equal(compatibility.calls.length,3);
  pass('compatibility feature-level fallback executes the production shader after core adapter requests return null');
  const hybrid=await page.evaluate(async()=>{
    const {WorkerClient,CrackSession}=await import('/assets/password-cracking-lab/coordinator.js');const {WORKER_SOURCE}=await import('/assets/password-cracking-lab/worker-source.js');const {hashHex}=await import('/assets/password-cracking-lab/sha256.js');
    const testSource=WORKER_SOURCE.replace('GpuSha256.create({onStage:','GpuSha256.create({allowSoftware:true,onStage:');
    if(testSource===WORKER_SOURCE)throw new Error('Test-only software adapter override did not apply');
    const cpu=await new WorkerClient('cpu').initialize(),gpu=await new WorkerClient('gpu',testSource).initialize();
    const session=new CrackSession({config:{strategy:'numeric',min:5,max:5},target:hashHex('99999'),engines:[cpu,gpu],intensity:100});
    const result=await session.start();
    if(result.state!=='success'||result.checked!==100000n||result.frontier!==100000n||result.cpuDone<=0n||result.gpuDone<=0n||result.cpuDone+result.gpuDone!==100000n)throw new Error('Real hybrid accounting failed');
    return {cpu:String(result.cpuDone),gpu:String(result.gpuDone)};
  });
  console.log('Confirmed concurrent ranges: CPU '+hybrid.cpu+', WebGPU '+hybrid.gpu);
  pass('real CPU and WebGPU workers concurrently confirm 100000 distinct attempts');
  const mainHybrid=await page.evaluate(async()=>{
    const {WorkerClient,MainThreadGpuClient,selectGpuBackend,CrackSession}=await import('/assets/password-cracking-lab/coordinator.js');
    const {GpuSha256}=await import('/assets/password-cracking-lab/gpu.js');const {WORKER_SOURCE}=await import('/assets/password-cracking-lab/worker-source.js');const {hashHex}=await import('/assets/password-cracking-lab/sha256.js');
    const withoutWorkerGPU="Object.defineProperty(navigator,'gpu',{value:undefined});\n"+WORKER_SOURCE;
    const selected=await selectGpuBackend({workerFactory:()=>new WorkerClient('gpu',withoutWorkerGPU),mainFactory:()=>new MainThreadGpuClient({gpuFactory:options=>GpuSha256.create({...options,allowSoftware:true})})});
    if(!selected.available||selected.path!=='main'||selected.diagnostics.worker.interface!==false||selected.diagnostics.worker.code!=='interface-unavailable')throw new Error('Worker-to-main compatibility selection failed');
    const cpu=await new WorkerClient('cpu').initialize();let updates=0;const heartbeat=setInterval(()=>updates++,1);
    try{
      const session=new CrackSession({config:{strategy:'numeric',min:5,max:5},target:hashHex('99999'),engines:[cpu,selected.engine],intensity:100});const result=await session.start();
      if(result.state!=='success'||result.checked!==100000n||result.frontier!==100000n||result.cpuDone<=0n||result.gpuDone<=0n||result.gpuPath!=='main'||updates<2)throw new Error('Main-thread GPU / CPU Hybrid verification failed');
      return {cpu:String(result.cpuDone),gpu:String(result.gpuDone),updates,workerCode:selected.diagnostics.worker.code};
    }finally{clearInterval(heartbeat);cpu.close();selected.engine.close();}
  });
  console.log('Main-thread shader + CPU workers: '+JSON.stringify(mainHybrid));
  pass('real main-thread GPU fallback with off-thread candidate preparation and genuine responsive Hybrid work');
  const failures=await page.evaluate(async()=>{
    const {GpuSha256}=await import('/assets/password-cracking-lab/gpu.js');const {createPhases}=await import('/assets/password-cracking-lab/search.js');const {hashHex,hexWords}=await import('/assets/password-cracking-lab/sha256.js');let compile;
    try{await GpuSha256.create({allowSoftware:true,shaderSource:'this is intentionally invalid WGSL'});}catch(error){compile={code:error.code,stage:error.stage};}
    const gpu=await GpuSha256.create({allowSoftware:true});
    try{const job=gpu.batch(createPhases({strategy:'numeric',min:6,max:6})[0],0n,4096,hexWords(hashHex('outside'))).then(()=>({code:'unexpected-success'}),error=>({code:error.code,stage:error.stage}));gpu.device.destroy();await gpu.device.lost;return {compile,lost:await job};}
    finally{gpu.dispose();}
  });
  assert.equal(failures.compile.code,'shader-compilation-failed');assert.equal(failures.compile.stage,'shader');assert.equal(failures.lost.code,'device-lost');
  pass('real shader compilation failure and native WebGPU device loss preserve precise failure stages');
  if(!process.argv.includes('--engines-only')){
    await context.addInitScript(()=>{
      window.workerPackets=[];const Original=window.Worker;
      window.Worker=class extends Original{postMessage(data,...args){window.workerPackets.push(structuredClone(data));return super.postMessage(data,...args);}};
    });
    const methods=async(surface,{german=true,english=true,common=false,brute=false}={})=>{
      for(const [id,checked] of Object.entries({german,english,common,brute}))await surface.locator('#'+id).setChecked(checked);
    };
    for(const lang of ['en','de']){
      await page.goto(base+(lang==='de'?'/de':'')+'/museum/password-cracking-lab/');await page.waitForFunction(()=>window.passwordLabReady===true);
      assert.equal(await page.locator('html').getAttribute('lang'),lang);
      assert.equal(await page.locator('input[type=checkbox]').count(),4);assert.equal(await page.locator('[data-example],#advanced-options,#strategy,#min,#max,#measure').count(),0);
      assert.equal(await page.locator('#german').isChecked(),true);assert.equal(await page.locator('#english').isChecked(),true);assert.equal(await page.locator('#brute').isChecked(),false);
      for(const width of [320,390,768,1024,1440]){await page.setViewportSize({width,height:950});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,lang+' overflow at '+width);}
      await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement!==document.body),true);
      assert.equal(await page.locator('.hardware-grid article').count(),3);assert.ok(await page.locator('#phase-journey li').count());
      await screenshot(page,lang+'-blind-desktop');await page.setViewportSize({width:390,height:950});await screenshot(page,lang+'-blind-mobile');
      pass(lang+': simple methods, outcome-first layout, keyboard access and five responsive widths');
      await page.locator('#password').fill('invented');await methods(page,{german:false,english:false});assert.equal(await page.locator('#start').isDisabled(),true);assert.ok((await page.locator('#method-help').innerText()).includes(lang==='de'?'mindestens':'at least'));
      await methods(page,{german:false,english:true});await page.locator('#password').fill('sunshine');await page.locator('#start').click();await page.waitForFunction(()=>document.body.dataset.state==='success');
      assert.equal(await page.locator('#password').inputValue(),'');assert.equal(await page.locator('#recovered').textContent(),'');assert.ok((await page.locator('#result-strategy').textContent()).includes(lang==='de'?'Englisches':'English'));
      assert.ok((await page.locator('#result-time').textContent()).length);await page.locator('#reveal').click();assert.equal(await page.locator('#recovered').textContent(),'sunshine');await page.locator('#reveal').click();assert.equal(await page.locator('#recovered').textContent(),'');await page.locator('#reset').click();
      pass(lang+': no-method validation, independent English selection and verified recovery/reveal/hide/reset');
      await methods(page,{german:true,english:false});await page.locator('#password').fill('sommer2024');await context.setOffline(true);
      let requests=0;const count=request=>{if(/^https?:/.test(request.url()))requests++;};page.on('request',count);
      await page.locator('#start').click();await page.waitForFunction(()=>document.body.dataset.state==='success');assert.equal(requests,0);await page.locator('#reveal').click();assert.equal(await page.locator('#recovered').textContent(),'sommer2024');assert.ok((await page.locator('#result-strategy').textContent()).includes('2000–2035'));
      page.off('request',count);await context.setOffline(false);await page.locator('#reset').click();
      const packets=await page.evaluate(()=>window.workerPackets.filter(p=>p.action==='batch'));assert.ok(packets.length);for(const p of packets){assert.deepEqual(Object.keys(p).sort(),['action','count','id','phase','start','target']);assert.ok(/^[a-f0-9]{64}$/.test(p.target));}
      pass(lang+': real blind German year recovery offline with hash-only worker messages');
      await methods(page,{german:false,english:false,brute:true});await page.locator('#password').fill('a');await page.locator('#start').click();await page.waitForFunction(()=>document.body.dataset.state==='success');await page.locator('#reveal').click();assert.equal(await page.locator('#recovered').textContent(),'a');assert.ok((await page.locator('#result-strategy').textContent()).includes('Brute'));
      assert.equal(await page.locator('#mode option[value=gpu]').evaluate(el=>el.disabled),true);assert.ok((await page.locator('#gpu-capability').textContent()).includes(lang==='de'?'Softwareadapter':'software adapter'));await page.locator('.hardware-panel .details-link').click();assert.equal(await page.locator('#gpu-diagnostics').evaluate(el=>el.open),true);assert.ok(JSON.parse(await page.locator('#gpu-raw').textContent()).diagnostics);
      await page.locator('#reset').click();await methods(page,{german:false,english:false,common:true});await page.locator('#password').fill('outside-🔐');await page.locator('#start').click();await page.waitForFunction(()=>document.body.dataset.state==='exhausted');const commonCount=await page.evaluate(async()=>{const {dictionaryBases}=await import('/assets/password-cracking-lab/search.js');return (BigInt(dictionaryBases(true,true,'common').length)*147n).toLocaleString(document.documentElement.lang==='de'?'de-DE':'en-US');});assert.equal(await page.locator('#checked').textContent(),commonCount);assert.equal(await page.locator('#reveal').isVisible(),false);
      pass(lang+': real fixed-charset brute recovery, software diagnostics and complete dictionary exhaustion');
    }
    const fallbackContext=await browser.newContext(),fallback=await fallbackContext.newPage();fallback.setDefaultTimeout(120000);fallback.on('pageerror',error=>errors.push(error.message));
    const {WORKER_SOURCE}=await import('../assets/password-cracking-lab/worker-source.js');const gpuSource=await readFile(resolve(root,'assets/password-cracking-lab/gpu.js'),'utf8');
    await fallbackContext.route('**/assets/password-cracking-lab/gpu.js*',route=>route.fulfill({contentType:'text/javascript',body:gpuSource.replace('allowSoftware=false','allowSoftware=true')}));
    await fallbackContext.route('**/assets/password-cracking-lab/worker-source.js*',route=>route.fulfill({contentType:'text/javascript',body:'export const WORKER_SOURCE = '+JSON.stringify("Object.defineProperty(navigator,'gpu',{value:undefined});\n"+WORKER_SOURCE)+';'}));
    await fallback.goto(base+'/museum/password-cracking-lab/');await fallback.waitForFunction(()=>window.passwordLabReady===true);
    assert.equal(await fallback.locator('#mode option[value=gpu]').evaluate(el=>el.disabled),false);assert.ok((await fallback.locator('#gpu-capability').innerText()).includes('Test-only software'));
    await methods(fallback,{german:false,english:false,brute:true});await fallback.locator('#mode').selectOption('gpu');await fallback.locator('#password').fill('a');await fallback.locator('#start').click();await fallback.waitForFunction(()=>document.body.dataset.state==='success');
    assert.equal(await fallback.locator('#gpu-done').textContent(),'95');assert.equal(await fallback.locator('#cpu-done').textContent(),'0');await fallback.locator('#reveal').click();assert.equal(await fallback.locator('#recovered').textContent(),'a');
    const diagnostic=JSON.parse(await fallback.locator('#gpu-raw').textContent());assert.equal(diagnostic.path,'main');assert.equal(diagnostic.diagnostics.worker.code,'interface-unavailable');assert.equal(diagnostic.diagnostics.main.software,true);
    pass('real blind main-thread GPU recovery with accurate shader-only counts and fallback diagnostics');
    await fallback.locator('#reset').click();await fallback.locator('#mode').selectOption('hybrid');await fallback.locator('#password').fill('outside-🔐');await fallback.locator('#start').click();await fallback.waitForFunction(()=>document.body.dataset.state==='running');await fallback.waitForTimeout(31000);
    await fallback.locator('#pause').click();await fallback.waitForFunction(()=>document.body.dataset.state==='paused');const before=await fallback.locator('#checked').textContent();await fallback.waitForTimeout(400);assert.equal(await fallback.locator('#checked').textContent(),before);assert.ok(Number((await fallback.locator('#gpu-done').textContent()).replaceAll(',',''))>0);assert.ok(Number((await fallback.locator('#cpu-done').textContent()).replaceAll(',',''))>0);
    await fallback.locator('#resume').click();await fallback.waitForTimeout(500);assert.notEqual(await fallback.locator('#checked').textContent(),before);await fallback.locator('#stop').click();await fallback.waitForFunction(()=>document.body.dataset.state==='stopped');await screenshot(fallback,'blind-hybrid-stopped');await fallback.locator('#reset').click();assert.equal(await fallback.locator('#checked').textContent(),'0');await fallbackContext.close();
    pass('real blind Hybrid UI runs beyond 30 seconds, pauses, resumes, stops and resets');
    for(const lang of ['en','de']){
      const prefix=lang==='de'?'/de':'';await page.goto(base+prefix+'/blog/how-fast-can-your-computer-crack-a-password/');assert.equal(await page.locator('html').getAttribute('lang'),lang);assert.ok((await page.locator('article').innerText()).length>7000);
      for(const width of [1440,390]){await page.setViewportSize({width,height:950});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}
      assert.ok(await page.locator('a[href="'+prefix+'/museum/password-cracking-lab/"]').count());
    }
    pass('updated bilingual guide layouts and native lab links');
  }
  assert.deepEqual(errors,[]);assert.ok(httpRequests.every(url=>new URL(url).origin===base),'Initial assets must stay on the same host');console.log('Browser acceptance: '+passed+' checks passed; software execution is distinct from physical GPU verification.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
