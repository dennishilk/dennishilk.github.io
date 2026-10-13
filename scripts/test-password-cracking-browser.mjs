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
    for(const lang of ['en','de']){
      const prefix=lang==='de'?'/de':'',url=base+prefix+'/museum/password-cracking-lab/';
      await page.goto(url);await page.waitForFunction(()=>window.passwordLabReady===true);
      assert.equal(await page.locator('html').getAttribute('lang'),lang);
      for(const width of [1440,1024,768,390,320]){await page.setViewportSize({width,height:950});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,lang+' overflow at '+width);}
      await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement!==document.body),true);
      for(const selector of ['#museum-back','#guide-link','#language-link'])assert.ok((await page.locator(selector).getAttribute('href')).startsWith('/'));
      await screenshot(page,lang+'-mobile');await page.setViewportSize({width:1440,height:950});await screenshot(page,lang+'-desktop');await page.setViewportSize({width:390,height:950});
      assert.equal(await page.locator('#advanced-options').evaluate(el=>el.open),false);assert.equal(await page.locator('.hardware-grid article').count(),3);assert.ok(await page.locator('#phase-journey li').count());assert.equal(await page.evaluate(()=>document.querySelector('#dashboard').getBoundingClientRect().top<document.querySelector('.setup').getBoundingClientRect().top),true);pass(lang+': outcome-first layout, hardware cards, progressive disclosure, keyboard access and five responsive widths');
      await page.locator('[data-example="123"]').click();await page.locator('#start').click();await page.waitForFunction(()=>document.body.dataset.state==='success');
      assert.equal(await page.locator('#password').inputValue(),'');assert.equal(await page.locator('#recovered').textContent(),'');
      assert.equal(await page.locator('#status').innerText(),lang==='de'?'PASSWORT GEFUNDEN':'PASSWORD FOUND');assert.equal(await page.evaluate(()=>document.querySelector('#result').getBoundingClientRect().top<document.querySelector('#checked').getBoundingClientRect().top),true);
      await screenshot(page,lang+'-found');
      await page.locator('#reveal').click();assert.equal(await page.locator('#recovered').textContent(),'123');await page.locator('#reset').click();assert.equal(await page.locator('#recovered').textContent(),'');
      pass(lang+': real CPU recovery, cleared input, explicit reveal and reset erasure');
      await page.locator('[data-example="katharina2482"]').click();await context.setOffline(true);
      let requests=0;const countRequest=request=>{if(/^https?:/.test(request.url()))requests++;};page.on('request',countRequest);
      await page.locator('#start').click();await page.waitForFunction(()=>document.body.dataset.state==='success');await page.locator('#reveal').click();assert.equal(await page.locator('#recovered').textContent(),'katharina2482');assert.equal(requests,0);
      page.off('request',countRequest);await context.setOffline(false);
      const packets=await page.evaluate(()=>window.workerPackets.filter(p=>p.action==='batch'));assert.ok(packets.length>0);for(const p of packets){assert.deepEqual(Object.keys(p).sort(),['action','count','id','phase','start','target']);assert.ok(/^[a-f0-9]{64}$/.test(p.target));}
      pass(lang+': offline dictionary recovery makes no HTTP requests or plaintext worker messages');
      await page.locator('#reset').click();await page.locator('#advanced-options').evaluate(el=>el.open=true);await page.locator('#strategy').selectOption('numeric');await page.locator('#min').fill('24');await page.locator('#max').fill('1');await page.locator('#password').fill('outside');await page.locator('#start').click();await page.waitForFunction(()=>document.body.dataset.state==='error');assert.ok((await page.locator('#status-detail').innerText()).includes(lang==='de'?'Bitte prüfe':'Check lengths'));
      await page.locator('#min').fill('1');await page.locator('#password').fill('outside');await page.locator('#start').click();await page.waitForFunction(()=>document.body.dataset.state==='exhausted');assert.equal(await page.locator('#checked').textContent(),'10');
      assert.equal(await page.locator('#status').innerText(),lang==='de'?'NICHT GEFUNDEN':'NOT FOUND');
      assert.equal(await page.locator('#mode option[value="gpu"]').evaluate(el=>el.disabled),true);assert.equal(await page.locator('#mode option[value="hybrid"]').evaluate(el=>el.disabled),true);assert.ok((await page.locator('#gpu-capability').innerText()).includes(lang==='de'?'Softwareadapter':'software adapter'));
      pass(lang+': exact exhaustion and honestly disabled software GPU modes');
    }
    for(const lang of ['en','de']){
      await page.goto(base+(lang==='de'?'/de':'')+'/museum/password-cracking-lab/');await page.waitForFunction(()=>window.passwordLabReady===true);
      await page.locator('[data-example="katharina2024"]').click();assert.equal(await page.locator('#years').isChecked(),true);await page.locator('#start').click();await page.waitForFunction(()=>document.body.dataset.state==='success');await page.locator('#reveal').click();assert.equal(await page.locator('#recovered').textContent(),'katharina2024');
      await page.locator('[data-example="p@$$w0rd"]').click();assert.equal(await page.locator('#leet').isChecked(),true);await page.locator('#start').click();await page.waitForFunction(()=>document.body.dataset.state==='success');await page.locator('#reveal').click();assert.equal(await page.locator('#recovered').textContent(),'p@$$w0rd');
      await page.locator('#advanced-options').evaluate(el=>el.open=true);assert.equal(await page.locator('#length-settings').isVisible(),false);await page.locator('#advanced-options').evaluate(el=>el.open=true);await page.locator('#strategy').selectOption('numeric');assert.equal(await page.locator('#length-settings').isVisible(),true);await page.locator('#strategy').selectOption('smart');assert.equal(await page.locator('#length-settings').isVisible(),true);assert.ok((await page.locator('#min-label').innerText()).includes(lang==='de'?'Brute Force':'Brute force'));
      pass(lang+': real year and selected leetspeak recovery, relevant editable length controls');
    }
    // Test-only delivery overrides expose the real main-thread shader path on
    // this software-only machine. Adapter metadata remains software=true.
    const fallbackContext=await browser.newContext(),fallback=await fallbackContext.newPage();fallback.setDefaultTimeout(120000);fallback.on('pageerror',error=>errors.push(error.message));
    const {WORKER_SOURCE}=await import('../assets/password-cracking-lab/worker-source.js');
    const gpuSource=await readFile(resolve(root,'assets/password-cracking-lab/gpu.js'),'utf8');assert.ok(gpuSource.includes('allowSoftware=false'));
    await fallbackContext.route('**/assets/password-cracking-lab/gpu.js*',route=>route.fulfill({contentType:'text/javascript',body:gpuSource.replace('allowSoftware=false','allowSoftware=true')}));
    await fallbackContext.route('**/assets/password-cracking-lab/worker-source.js*',route=>route.fulfill({contentType:'text/javascript',body:'export const WORKER_SOURCE = '+JSON.stringify("Object.defineProperty(navigator,'gpu',{value:undefined});\n"+WORKER_SOURCE)+';'}));
    await fallback.goto(base+'/museum/password-cracking-lab/');await fallback.waitForFunction(()=>window.passwordLabReady===true);
    assert.equal(await fallback.locator('#mode option[value="gpu"]').evaluate(el=>el.disabled),false);assert.ok((await fallback.locator('#gpu-capability').innerText()).includes('Test-only software'));
    await fallback.locator('#gpu-diagnostics > summary').click();let diagnostic=JSON.parse(await fallback.locator('#gpu-raw').textContent());assert.equal(diagnostic.path,'main');assert.equal(diagnostic.diagnostics.worker.code,'interface-unavailable');assert.equal(diagnostic.diagnostics.main.software,true);
    await fallback.locator('#advanced-options').evaluate(el=>el.open=true);await fallback.locator('#mode').selectOption('gpu');await fallback.locator('#strategy').selectOption('numeric');await fallback.locator('#min').fill('5');await fallback.locator('#max').fill('5');await fallback.locator('#password').fill('99999');await fallback.locator('#start').click();await fallback.waitForFunction(()=>document.body.dataset.state==='success');
    assert.equal(await fallback.locator('#gpu-done').textContent(),'100,000');assert.equal(await fallback.locator('#cpu-done').textContent(),'0');assert.equal(await fallback.locator('#checked').textContent(),'100,000');assert.ok((await fallback.locator('#active-gpu-path').textContent()).includes('Main thread'));
    diagnostic=JSON.parse(await fallback.locator('#gpu-raw').textContent());assert.equal(diagnostic.diagnostics.worker.code,'interface-unavailable');await fallback.locator('#reveal').click();assert.equal(await fallback.locator('#recovered').textContent(),'99999');
    pass('real main-thread GPU UI recovery, precise fallback diagnostics and actual shader-only counters');
    await fallback.locator('#reset').click();await fallback.locator('#mode').selectOption('hybrid');await fallback.locator('#min').fill('24');await fallback.locator('#max').fill('24');await fallback.locator('#password').fill('outside-this-space');await fallback.locator('#start').click();await fallback.waitForFunction(()=>document.body.dataset.state==='running');await fallback.waitForTimeout(31000);assert.equal(await fallback.locator('body').getAttribute('data-state'),'running');
    await fallback.locator('#pause').click();await fallback.waitForFunction(()=>document.body.dataset.state==='paused');const pausedCount=await fallback.locator('#checked').textContent();await fallback.waitForTimeout(400);assert.equal(await fallback.locator('#checked').textContent(),pausedCount);assert.ok(Number((await fallback.locator('#gpu-done').textContent()).replaceAll(',',''))>0);assert.ok(Number((await fallback.locator('#cpu-done').textContent()).replaceAll(',',''))>0);
    await fallback.locator('#resume').click();await fallback.waitForTimeout(500);assert.notEqual(await fallback.locator('#checked').textContent(),pausedCount);await fallback.locator('#stop').click();await fallback.waitForFunction(()=>document.body.dataset.state==='stopped');await screenshot(fallback,'main-hybrid-stopped');await fallback.locator('#reset').click();assert.equal(await fallback.locator('#recovered').textContent(),'');await fallbackContext.close();
    pass('real main-thread GPU + CPU UI run exceeds 30 seconds, pauses, resumes and stops');
    await page.goto(base+'/museum/password-cracking-lab/');await page.waitForFunction(()=>window.passwordLabReady===true);
    await page.locator('[data-example="123!"]').click();await page.locator('#start').click();await page.waitForFunction(()=>document.body.dataset.state==='success');await page.locator('#reveal').click();assert.equal(await page.locator('#recovered').textContent(),'123!');pass('real brute-force symbol recovery');
    await page.locator('#reset').click();await page.locator('#password').fill('123');
    const remeasure=async()=>{const before=await page.evaluate(()=>window.workerPackets.filter(p=>p.action==='batch').length);await page.locator('#measure').click();await page.waitForFunction(()=>document.body.dataset.state==='ready');const after=await page.evaluate(()=>window.workerPackets.filter(p=>p.action==='batch').length);assert.ok(after>before);assert.equal(await page.locator('#checked').textContent(),'0');};
    await remeasure();await remeasure();pass('repeated Measure runs fresh real batches without advancing attack counters');
    await page.locator('#reset').click();await page.locator('#password').fill('old-test');await page.evaluate(()=>{document.querySelector('#start').click();document.querySelector('#reset').click();document.querySelector('#password').value='new-test';});await page.waitForTimeout(400);assert.equal(await page.locator('#password').inputValue(),'new-test');assert.equal(await page.locator('#checked').textContent(),'0');pass('reset during target hashing cannot restart old work or erase new input');
    await page.locator('#reset').click();await page.locator('#advanced-options').evaluate(el=>el.open=true);await page.locator('#strategy').selectOption('numeric');await page.locator('#min').fill('24');await page.locator('#max').fill('24');await page.locator('#password').fill('outside-that-numeric-space');await page.locator('#start').click();await page.waitForFunction(()=>document.body.dataset.state==='running');await page.waitForTimeout(31000);assert.equal(await page.locator('body').getAttribute('data-state'),'running');
    await page.locator('#pause').click();await page.waitForFunction(()=>document.body.dataset.state==='paused');const before=await page.locator('#checked').textContent();await page.waitForTimeout(400);assert.equal(await page.locator('#checked').textContent(),before);await page.locator('#resume').click();await page.waitForTimeout(500);assert.notEqual(await page.locator('#checked').textContent(),before);await page.locator('#stop').click();await page.waitForFunction(()=>document.body.dataset.state==='stopped');await page.locator('#reset').click();assert.equal(await page.locator('#checked').textContent(),'0');pass('actual search exceeds 30 seconds, pauses, resumes, stops and resets');
    for(const lang of ['en','de']){
      const prefix=lang==='de'?'/de':'';await page.goto(base+prefix+'/blog/how-fast-can-your-computer-crack-a-password/');assert.equal(await page.locator('html').getAttribute('lang'),lang);assert.ok((await page.locator('article').innerText()).length>7000);
      for(const width of [1440,390]){await page.setViewportSize({width,height:950});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}
      assert.ok(await page.locator('a[href="'+prefix+'/museum/password-cracking-lab/"]').count());
    }
    pass('native bilingual blog layouts, readable articles and lab links');
    const museum=await context.newPage();
    await museum.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
    await museum.addInitScript(()=>localStorage.setItem('dennishilk-language','de'));
    for(const path of ['/museum/','/de/museum/cryptography-lab/','/de/museum/cryptography-lab/password-graveyard/']){
      await museum.goto(base+path);await museum.waitForFunction(()=>document.documentElement.lang==='de'&&document.querySelector('[data-password-lab]')?.getAttribute('href')==='/de/museum/password-cracking-lab/');
      assert.equal(await museum.locator('[data-password-lab]').count(),1);assert.ok((await museum.locator('[data-password-lab]').innerText()).includes('ÖFFNEN'));
    }
    await museum.close();pass('live German Museum and both mirrored Crypto routes link to the independent German lab');
  }
  assert.deepEqual(errors,[]);assert.ok(httpRequests.every(url=>new URL(url).origin===base),'Initial assets must stay on the same host');console.log('Browser acceptance: '+passed+' checks passed; software execution is distinct from physical GPU verification.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
