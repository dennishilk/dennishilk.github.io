import {createServer} from 'node:http';
import {readFile,stat,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('playwright'),sharp=require('sharp');
const root=resolve(import.meta.dirname,'..'),capture=process.argv.includes('--capture');
const out=resolve(root,'assets/blog/computer-museum'),qa='/tmp/dual-isa-10-1-qa';
await mkdir(qa,{recursive:true});
const server=createServer(async(req,res)=>{
  try{
    let p=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
    if(!p.startsWith(root+'/'))throw Error('path');
    if((await stat(p)).isDirectory())p+='/index.html';
    res.setHeader('Content-Type',({'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.woff2':'font/woff2'})[extname(p)]||'text/plain');
    res.end(await readFile(p));
  }catch{res.statusCode=404;res.end('404');}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({executablePath:process.env.DUAL_ISA_BROWSER||'/tmp/headless/chrome-headless-shell-linux64/chrome-headless-shell',headless:true,args:['--no-sandbox']});
const errors=[],dimensions={},ids=['architecture','instructions','services','comparison'];
try{
  for(const lang of ['en','de']){
    const prefix=lang==='de'?'/de':'',url=origin+prefix+'/museum/ibm-dual-isa/';
    const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
    await page.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
    await page.clock.install();
    const ready=()=>page.waitForFunction(()=>document.documentElement.dataset.dualIsaReady==='true');
    const active=async id=>{
      await page.waitForFunction(id=>document.getElementById('tab-'+id)?.getAttribute('aria-selected')==='true',id);
      assert.deepEqual(await page.locator('[data-station]:visible').evaluateAll(es=>es.map(e=>e.id)),[id]);
      assert.equal(await page.locator('#tab-'+id).getAttribute('aria-selected'),'true');
      assert.equal(await page.locator('[role=tab][aria-selected=true]').count(),1);
      assert.equal(await page.locator('[role=tab][tabindex="0"]').count(),1);
      assert.match(await page.locator('#station-position').innerText(),new RegExp((ids.indexOf(id)+1)+'.*4'));
    };
    const station=async id=>{await page.locator('#tab-'+id).click();await active(id);};
    const cpuSnapshot=()=>page.locator('#instructions').evaluate(e=>[...e.querySelectorAll('.register-grid,.listing,code[id$="memory"],span[id$="pc"],#trace')].map(n=>n.textContent));
    await page.goto(url);await ready();await active('architecture');
    for(const id of ids){
      assert.equal(await page.locator('#tab-'+id).getAttribute('aria-controls'),id);
      assert.equal(await page.locator('#'+id).getAttribute('aria-labelledby'),'tab-'+id);
    }
    assert.ok(await page.locator('.core-grid').evaluate(e=>e.getBoundingClientRect().top<innerHeight-100),'chip visible in first desktop viewport');
    await page.screenshot({path:qa+'/'+lang+'-initial-desktop.png'});
    // All stations are independently reachable; pagination puts focus in the new panel.
    for(const id of ids)await station(id);
    for(let i=3;i>0;i--){await page.locator('#'+ids[i]+' .station-footer [data-station-target="'+ids[i-1]+'"]').click();await active(ids[i-1]);assert.equal(await page.evaluate(()=>document.activeElement.id),'heading-'+ids[i-1]);}
    for(let i=0;i<3;i++){await page.locator('#'+ids[i]+' .station-next').click();await active(ids[i+1]);assert.equal(await page.evaluate(()=>document.activeElement.id),'heading-'+ids[i+1]);assert.ok(await page.locator('#station-navigation').evaluate(e=>e.getBoundingClientRect().top>=-1));}
    // Manual tab activation, arrow wrap, Home/End, Enter/Space and focus continuity.
    await page.locator('#tab-comparison').focus();await page.keyboard.press('Home');
    assert.equal(await page.evaluate(()=>document.activeElement.id),'tab-architecture');await active('comparison');
    await page.keyboard.press('Enter');await active('architecture');
    await page.keyboard.press('ArrowRight');assert.equal(await page.evaluate(()=>document.activeElement.id),'tab-instructions');
    await page.keyboard.press('Space');await active('instructions');
    await page.keyboard.press('End');assert.equal(await page.evaluate(()=>document.activeElement.id),'tab-comparison');
    await page.keyboard.press('ArrowRight');assert.equal(await page.evaluate(()=>document.activeElement.id),'tab-architecture');
    await page.keyboard.press('ArrowLeft');assert.equal(await page.evaluate(()=>document.activeElement.id),'tab-comparison');
    await page.keyboard.press('Enter');await active('comparison');await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(()=>document.activeElement.id),'comparison');
    // Direct links, reload, history and explicit hash changes.
    for(const id of ids){await page.goto(url+'#'+id);await ready();await active(id);}
    await page.goto(url+'#application');await ready();await active('services');
    await page.goto(url+'#trace');await ready();await active('instructions');
    await page.goto(url+'#instructions');await ready();await page.reload();await ready();await active('instructions');
    await station('services');await station('comparison');await page.goBack();await active('services');await page.goBack();await active('instructions');await page.goForward();await active('services');
    await page.evaluate(()=>{location.hash='comparison';});await active('comparison');
    await page.locator('#comparison .station-footer a[href="#further-reading"]').click();assert.equal(await page.locator('#further-reading').isVisible(),true);await active('comparison');
    await station('architecture');
    assert.equal(await page.locator('[data-core]').count(),11);
    for(let i=0;i<11;i++){await page.locator(`[data-core="${i}"]`).click();assert.match(await page.locator('#inspector-title').innerText(),new RegExp(String(i+1).padStart(2,'0')));}
    for(const id of ['complex','cache','ai','dpu','io']){await page.locator(`[data-block="${id}"]`).click();assert.ok(await page.locator('#block-description').innerText());assert.equal(await page.locator('#core-details').isVisible(),false);}
    await page.locator('[data-core="6"]').click();await station('instructions');
    assert.match(await page.locator('#selected-core-label').innerText(),/07/);
    for(let i=0;i<4;i++)await page.locator('#step').click();
    const saved=await cpuSnapshot();assert.equal(await page.locator('#z-result').innerText(),'42');
    await station('comparison');await page.locator('[data-compare="emulated"]').click();
    await station('architecture');assert.equal(await page.locator('[data-core="6"]').getAttribute('aria-pressed'),'true');
    await station('instructions');assert.deepEqual(await cpuSnapshot(),saved);
    await page.locator('#step').click();assert.equal(await page.locator('#arm-result').innerText(),'42');
    assert.match(await page.locator('#z-memory').innerText(),/00 00 00 00 00 00 00 2A/);assert.match(await page.locator('#arm-memory').innerText(),/2A 00 00 00 00 00 00 00/);
    for(const [a,result,steps] of [['17','42',8],['1','0',9]]){
      await page.locator('#program').selectOption('branch');await page.locator('#operand-a').fill(a);await page.locator('#load').click();
      for(let i=0;i<steps;i++)await page.locator('#step').click();assert.equal(await page.locator('#z-result').innerText(),result);assert.equal(await page.locator('#arm-result').innerText(),result);
    }
    await page.locator('#operand-a').fill('1001');await page.locator('#load').click();assert.match(await page.locator('#execution-status').innerText(),/Error|Fehler/);
    await page.locator('#operand-a').fill('17');await page.locator('#program').selectOption('add');await page.locator('#load').click();
    // Leaving instructions cancels the real interval. Returning does not resume it.
    await page.locator('#speed').selectOption('1000');await page.locator('#run').click();await page.clock.runFor(1100);
    assert.equal(await page.locator('#z-pc').innerText(),'1');
    await station('comparison');const pausedCPU=await cpuSnapshot();await page.clock.runFor(6000);
    await station('instructions');assert.deepEqual(await cpuSnapshot(),pausedCPU);assert.equal(await page.locator('#pause').isDisabled(),true);
    await page.locator('#run').click();await page.clock.runFor(5000);assert.equal(await page.locator('#z-result').innerText(),'42');assert.equal(await page.locator('#run').isDisabled(),true);
    const completedCPU=await cpuSnapshot();
    await station('services');await page.locator('#amount').fill('5000');await page.locator('#foreign').check();await page.locator('#transaction button').click();
    await page.locator('#service-run').click();await page.clock.runFor(1700); // request created, response not yet created
    assert.equal(JSON.parse(await page.locator('#request').innerText()).amount,5000);
    await page.locator('#deployment').selectOption('separate');
    await station('comparison');await page.clock.runFor(6000);
    assert.equal(await page.locator('[data-compare="emulated"]').getAttribute('aria-pressed'),'true');
    await station('services');assert.equal(await page.locator('#service-pause').isDisabled(),true);
    assert.match(await page.locator('#response').innerText(),/Waiting|Warten/);assert.equal(await page.locator('#deployment').inputValue(),'separate');
    await page.locator('#service-step').click();assert.equal(JSON.parse(await page.locator('#response').innerText()).score,75);
    const request=await page.locator('#request').innerText(),response=await page.locator('#response').innerText();
    await station('instructions');assert.deepEqual(await cpuSnapshot(),completedCPU);
    await page.locator('#reset').click();assert.equal(await page.locator('#z-pc').innerText(),'0');assert.equal(await page.locator('#z-result').innerText(),'0');
    await station('services');assert.equal(await page.locator('#request').innerText(),request);assert.equal(await page.locator('#response').innerText(),response);
    await station('instructions');await page.locator('#step').click();assert.equal(await page.locator('#z-pc').innerText(),'1');
    await station('services');await page.locator('#service-reset').click();assert.match(await page.locator('#request').innerText(),/Waiting|Warten/);
    await station('instructions');assert.equal(await page.locator('#z-pc').innerText(),'1');
    await station('comparison');
    for(const id of ['separate','heterogeneous','emulated','native']){await page.locator(`[data-compare="${id}"]`).click();assert.equal(await page.locator(`[data-compare="${id}"]`).getAttribute('aria-pressed'),'true');}
    await station('architecture');await page.locator('[data-core="0"]').focus();await page.keyboard.press('Enter');await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.dataset.core),'1');await page.keyboard.press('Enter');assert.match(await page.locator('#inspector-title').innerText(),/02/);
    if(capture){
      for(const [name,id]of [['hero','architecture'],['instructions','instructions']]){await station(id);const png=await page.locator('#'+id).screenshot();await sharp(png).webp({quality:85}).toFile(out+`/dual-isa-${name}-${lang}.webp`);dimensions[name+'-'+lang]=await sharp(png).metadata().then(({width,height})=>[width,height]);}
    }
    for(const width of [320,390,768,1440,2048]){
      await page.setViewportSize({width,height:1000});
      for(const id of ids){await station(id);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'station overflow '+lang+' '+id+' '+width);}
    }
    await page.setViewportSize({width:390,height:844});await page.goto(url);await ready();await page.screenshot({path:qa+'/'+lang+'-initial-mobile.png'});
    await page.setViewportSize({width:1440,height:1000});
    for(const id of ids){await station(id);await page.locator('#station-navigation').scrollIntoViewIfNeeded();await page.screenshot({path:qa+'/'+lang+'-'+id+'.png'});}
    assert.equal(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),true);
    // Informational fallback retains all sections and source links without JavaScript.
    const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}}),fallback=await context.newPage();
    await fallback.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());await fallback.goto(url);
    assert.equal(await fallback.locator('[data-station]:visible').count(),4);
    assert.equal(await fallback.locator('[role=tab]').count(),0);
    assert.ok(await fallback.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no-JS overflow '+lang);
    assert.equal(await fallback.locator('.mode-nav a').count(),4);
    await fallback.locator('.sources-details summary').click();assert.ok(await fallback.locator('.sources a').count()>=5);
    assert.equal(await fallback.locator('#further-reading .article-link').isVisible(),true);await context.close();
    if(!capture){
      const slug=lang==='de'?'ibm-z-arm-dual-isa-prozessor':'ibm-z-arm-dual-isa-processor';
      await page.goto(origin+prefix+'/blog/'+slug+'/');assert.equal(await page.locator('h1').count(),1);
      for(const img of await page.locator('.article-figure img').all()){await img.scrollIntoViewIfNeeded();await img.evaluate(e=>e.decode());}
      await page.goto(origin+prefix+'/blog/');assert.equal(await page.locator('#dual-isa-story').count(),1);
    }
    await page.close();
  }
  assert.deepEqual(errors,[]);
  if(capture)await writeFile(out+'/dual-isa-capture-dimensions.json',JSON.stringify(dimensions,null,2)+'\n');
  console.log('PASS: DE/EN initial state, four exclusive stations, pagination, deep links, reload/history/hash navigation, complete manual keyboard tabs, eleven cores, retained CPU/service/comparison state, hidden-station timer cancellation, scoped reset, arithmetic/branches/endian data, no-JS fallback, all four stations at 320/390/768/1440/2048, reduced motion and no console/asset errors. QA: '+qa);
}finally{await browser.close();await new Promise(r=>server.close(r));}
