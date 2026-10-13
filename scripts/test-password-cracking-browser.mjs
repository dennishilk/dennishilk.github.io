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
const context=await browser.newContext(),page=await context.newPage(),errors=[];let passed=0;
page.on('pageerror',error=>errors.push(error.message));const pass=message=>{passed++;console.log('PASS '+message);};
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
      return {info:engine.info,vectors:vectors.length};
    }finally{engine.dispose();}
  });
  console.log('Actual WebGPU adapter: '+JSON.stringify(gpu.info)+'; physical GPU verified: '+!gpu.info.software);
  pass('real browser WGSL SHA-256 agrees with CPU on '+gpu.vectors+' vectors and exact indices above 2^53');
  const hybrid=await page.evaluate(async()=>{
    const {WorkerClient,CrackSession}=await import('/assets/password-cracking-lab/coordinator.js');const {WORKER_SOURCE}=await import('/assets/password-cracking-lab/worker-source.js');const {hashHex}=await import('/assets/password-cracking-lab/sha256.js');
    const testSource=WORKER_SOURCE.replace('gpu=await GpuSha256.create();','gpu=await GpuSha256.create({allowSoftware:true});');
    if(testSource===WORKER_SOURCE)throw new Error('Test-only software adapter override did not apply');
    const cpu=await new WorkerClient('cpu').initialize(),gpu=await new WorkerClient('gpu',testSource).initialize();
    const session=new CrackSession({config:{strategy:'numeric',min:5,max:5},target:hashHex('99999'),engines:[cpu,gpu],intensity:100});
    const result=await session.start();
    if(result.state!=='success'||result.checked!==100000n||result.frontier!==100000n||result.cpuDone<=0n||result.gpuDone<=0n||result.cpuDone+result.gpuDone!==100000n)throw new Error('Real hybrid accounting failed');
    return {cpu:String(result.cpuDone),gpu:String(result.gpuDone)};
  });
  console.log('Confirmed concurrent ranges: CPU '+hybrid.cpu+', WebGPU '+hybrid.gpu);
  pass('real CPU and WebGPU workers concurrently confirm 100000 distinct attempts');
  if(!process.argv.includes('--engines-only')){
    await context.addInitScript(()=>{
      window.workerPackets=[];const Original=window.Worker;
      window.Worker=class extends Original{postMessage(data,...args){window.workerPackets.push(structuredClone(data));return super.postMessage(data,...args);}};
    });
    for(const lang of ['en','de']){
      const prefix=lang==='de'?'/de':'',url=base+prefix+'/museum/password-cracking-lab/';
      await page.goto(url);await page.waitForFunction(()=>window.passwordLabReady===true);
      assert.equal(await page.locator('html').getAttribute('lang'),lang);
      for(const width of [1440,768,390,320]){await page.setViewportSize({width,height:950});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,lang+' overflow at '+width);}
      await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement!==document.body),true);
      for(const selector of ['#museum-back','#guide-link','#language-link'])assert.ok((await page.locator(selector).getAttribute('href')).startsWith('/'));
      if(process.env.PASSWORD_LAB_QA_DIR){await mkdir(process.env.PASSWORD_LAB_QA_DIR,{recursive:true});await page.screenshot({path:resolve(process.env.PASSWORD_LAB_QA_DIR,lang+'-mobile.png'),fullPage:true});}
      pass(lang+': independent routes, keyboard access and responsive layouts');
      await page.locator('[data-example="123"]').click();await page.locator('#start').click();await page.waitForFunction(()=>document.body.dataset.state==='success');
      assert.equal(await page.locator('#password').inputValue(),'');assert.equal(await page.locator('#recovered').textContent(),'');
      await page.locator('#reveal').click();assert.equal(await page.locator('#recovered').textContent(),'123');await page.locator('#reset').click();assert.equal(await page.locator('#recovered').textContent(),'');
      pass(lang+': real CPU recovery, cleared input, explicit reveal and reset erasure');
      await page.locator('[data-example="katharina2482"]').click();await context.setOffline(true);
      let requests=0;const countRequest=()=>requests++;page.on('request',countRequest);
      await page.locator('#start').click();await page.waitForFunction(()=>document.body.dataset.state==='success');await page.locator('#reveal').click();assert.equal(await page.locator('#recovered').textContent(),'katharina2482');assert.equal(requests,0);
      page.off('request',countRequest);await context.setOffline(false);
      const packets=await page.evaluate(()=>window.workerPackets.filter(p=>p.action==='batch'));assert.ok(packets.length>0);for(const p of packets){assert.deepEqual(Object.keys(p).sort(),['action','count','id','phase','start','target']);assert.ok(/^[a-f0-9]{64}$/.test(p.target));}
      pass(lang+': offline dictionary recovery makes no HTTP requests or plaintext worker messages');
      await page.locator('#reset').click();await page.locator('#strategy').selectOption('numeric');await page.locator('#min').fill('1');await page.locator('#max').fill('1');await page.locator('#password').fill('outside');await page.locator('#start').click();await page.waitForFunction(()=>document.body.dataset.state==='exhausted');assert.equal(await page.locator('#checked').textContent(),'10');
      assert.equal(await page.locator('#mode option[value="gpu"]').evaluate(el=>el.disabled),true);assert.equal(await page.locator('#mode option[value="hybrid"]').evaluate(el=>el.disabled),true);
      pass(lang+': exact exhaustion and honestly disabled software GPU modes');
    }
    await page.goto(base+'/museum/password-cracking-lab/');await page.waitForFunction(()=>window.passwordLabReady===true);
    await page.locator('[data-example="123!"]').click();await page.locator('#start').click();await page.waitForFunction(()=>document.body.dataset.state==='success');await page.locator('#reveal').click();assert.equal(await page.locator('#recovered').textContent(),'123!');pass('real brute-force symbol recovery');
    await page.locator('#reset').click();await page.locator('#password').fill('123');
    const remeasure=async()=>{const before=await page.evaluate(()=>window.workerPackets.filter(p=>p.action==='batch').length);await page.locator('#measure').click();await page.waitForFunction(()=>document.body.dataset.state==='ready');const after=await page.evaluate(()=>window.workerPackets.filter(p=>p.action==='batch').length);assert.ok(after>before);assert.equal(await page.locator('#checked').textContent(),'0');};
    await remeasure();await remeasure();pass('repeated Measure runs fresh real batches without advancing attack counters');
    await page.locator('#reset').click();await page.locator('#password').fill('old-test');await page.evaluate(()=>{document.querySelector('#start').click();document.querySelector('#reset').click();document.querySelector('#password').value='new-test';});await page.waitForTimeout(400);assert.equal(await page.locator('#password').inputValue(),'new-test');assert.equal(await page.locator('#checked').textContent(),'0');pass('reset during target hashing cannot restart old work or erase new input');
    await page.locator('#reset').click();await page.locator('#strategy').selectOption('numeric');await page.locator('#min').fill('24');await page.locator('#max').fill('24');await page.locator('#password').fill('outside-that-numeric-space');await page.locator('#start').click();await page.waitForFunction(()=>document.body.dataset.state==='running');await page.waitForTimeout(31000);assert.equal(await page.locator('body').getAttribute('data-state'),'running');
    await page.locator('#pause').click();await page.waitForFunction(()=>document.body.dataset.state==='paused');const before=await page.locator('#checked').textContent();await page.waitForTimeout(400);assert.equal(await page.locator('#checked').textContent(),before);await page.locator('#resume').click();await page.waitForTimeout(500);assert.notEqual(await page.locator('#checked').textContent(),before);await page.locator('#stop').click();await page.waitForFunction(()=>document.body.dataset.state==='stopped');await page.locator('#reset').click();assert.equal(await page.locator('#checked').textContent(),'0');pass('actual search exceeds 30 seconds, pauses, resumes, stops and resets');
    for(const lang of ['en','de']){
      const prefix=lang==='de'?'/de':'';await page.goto(base+prefix+'/blog/how-fast-can-your-computer-crack-a-password/');assert.equal(await page.locator('html').getAttribute('lang'),lang);assert.ok((await page.locator('article').innerText()).length>7000);
      for(const width of [1440,390]){await page.setViewportSize({width,height:950});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}
      assert.ok(await page.locator('a[href="'+prefix+'/museum/password-cracking-lab/"]').count());
    }
    pass('native bilingual blog layouts, readable articles and lab links');
  }
  assert.deepEqual(errors,[]);console.log('Browser acceptance: '+passed+' checks passed; software execution is distinct from physical GPU verification.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
