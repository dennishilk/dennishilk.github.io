// User-requested automated browser tests; existing runtime/browser, no browser installation.
import {createServer} from 'node:http';
import {readFile,stat,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),runtime=process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
const dependency=name=>{try{return require(name);}catch(e){if(!runtime)throw e;return require(resolve(runtime,name));}};
const {chromium}=dependency('playwright'),sharp=dependency('sharp');
const root=resolve(import.meta.dirname,'..'),qa='/tmp/chernobyl-qa',capture=process.argv.includes('--capture'),out=resolve(root,'assets/blog/computer-museum');
await mkdir(qa,{recursive:true});
const server=createServer(async(req,res)=>{try{let p=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!p.startsWith(root+'/'))throw Error('path');if((await stat(p)).isDirectory())p+='/index.html';res.setHeader('Content-Type',({'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png'})[extname(p)]||'text/plain');res.end(await readFile(p));}catch{res.statusCode=404;res.end('404');}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({executablePath:process.env.CHERNOBYL_BROWSER||'/tmp/headless/chrome-headless-shell-linux64/chrome-headless-shell',headless:true,args:['--no-sandbox']});
const errors=[],report={};
try{
 for(const lang of ['en','de']){
  const route=lang==='de'?'/de/museum/chernobyl-kontrollraum/':'/museum/chernobyl-control-room/';
  const page=await browser.newPage({viewport:{width:1440,height:1060},reducedMotion:'reduce'});
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
  await page.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  await page.clock.install();await page.goto(origin+route);await page.waitForFunction(()=>document.documentElement.dataset.chernobylReady==='true');
  const active=async id=>{assert.deepEqual(await page.locator('[data-station]:visible').evaluateAll(es=>es.map(e=>e.id)),[id]);assert.equal(await page.locator('#tab-'+id).getAttribute('aria-selected'),'true');};
  const station=async id=>{await page.locator('#tab-'+id).click();await active(id);};
  const shot=async(key,locator)=>{await locator.screenshot({path:qa+'/'+key+'-'+lang+'.png'});if(capture){const buffer=await sharp(qa+'/'+key+'-'+lang+'.png').resize({width:1400,withoutEnlargement:true}).webp({quality:86}).toBuffer();await writeFile(out+'/chernobyl-'+key+'-'+lang+'.webp',buffer);await sharp(buffer).resize({width:800,withoutEnlargement:true}).webp({quality:82}).toFile(out+'/chernobyl-'+key+'-'+lang+'-800.webp');return await sharp(buffer).metadata();}};
  await active('basics');await page.locator('#basics [data-hotspot=rods]').click();assert.match(await page.locator('#basics-inspector').innerText(),/Graphit|graphite/);
  await shot('basics',page.locator('#basics .basics-layout'));
  await station('room');
  for(const id of ['power','feedwater','water','turbine','fuel','alarms','skala','az5','rods']){await page.locator('#room [data-hotspot='+id+']').first().click();const text=await page.locator('#room-inspector').innerText();assert.ok(text.length>80);assert.ok(await page.locator('#room-inspector .badge').isVisible());}
  assert.match(await page.locator('#room-inspector').innerText(),/control|Regel/i);
  await page.locator('#view-labels').uncheck();assert.ok(await page.locator('#control-room').evaluate(e=>e.classList.contains('hide-labels')));await page.locator('#view-labels').check();
  await page.locator('#view-overlay').check();assert.ok(await page.locator('#room-system-path').isVisible());await page.locator('#view-overlay').uncheck();
  await page.locator('#view-section').check();assert.ok(await page.locator('#room-section').isVisible());assert.ok(!await page.locator('#room-map').isVisible());await page.locator('#view-section').uncheck();
  await page.locator('#view-history').uncheck();assert.ok(!await page.locator('#historical-annotation').isVisible());await page.locator('#view-history').check();
  await page.locator('#room [data-hotspot=skala]').click();const hero=await shot('hero',page.locator('.room-layout'));
  await shot('detail',page.locator('.control-room'));
  await station('skala');for(const id of ['signals','dreg','prizma','protection']){await page.locator('[data-computing='+id+']').click();assert.ok((await page.locator('#computing-inspector').innerText()).length>100);}
  await page.locator('[data-computing=prizma]').click();await page.locator('#computing-inspector summary').click();assert.match(await page.locator('#computing-inspector').innerText(),/01:22:30/);await shot('skala',page.locator('.skala-layout'));
  await station('sequence');assert.ok(await page.locator('#start-sequence').isVisible());
  await page.locator('#start-sequence').click();assert.match(await page.locator('#step-count').innerText(),/01.*11/);await page.clock.runFor(18001);assert.match(await page.locator('#step-count').innerText(),/02.*11/);
  await page.locator('#toggle-play').click();const paused=await page.locator('#step-count').innerText();await page.clock.runFor(40000);assert.equal(await page.locator('#step-count').innerText(),paused);
  await page.locator('#next-step').click();assert.match(await page.locator('#historical-power').innerText(),/200 MW\(th\)/);
  await page.locator('#previous-step').click();assert.match(await page.locator('#historical-power').innerText(),/30 MW\(th\)/);
  await page.locator('#restart-sequence').click();assert.match(await page.locator('#step-count').innerText(),/01.*11/);await page.clock.runFor(20000);assert.match(await page.locator('#step-count').innerText(),/01.*11/);
  await page.locator('#toggle-play').click();await page.locator('#sequence-pace').selectOption('8000');await page.clock.runFor(8001);assert.match(await page.locator('#step-count').innerText(),/02.*11/);
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});const hiddenChapter=await page.locator('#step-count').innerText();await page.clock.runFor(40000);assert.equal(await page.locator('#step-count').innerText(),hiddenChapter);await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});await page.locator('#toggle-play').click();await station('basics');await page.clock.runFor(40000);await station('sequence');assert.match(await page.locator('#step-count').innerText(),/02.*11/);
  await page.locator('.chapter-list summary').click();await page.locator('[data-step="5"]').click();assert.match(await page.locator('#step-title').innerText(),/AZ-5/);assert.equal(await page.locator('#sequence-stage').getAttribute('data-phase'),'insertion');await page.locator('.chapter-list summary').click();const sequence=await shot('sequence',page.locator('.sequence-layout'));
  await page.locator('.chapter-list summary').click();await page.locator('[data-step="10"]').click();assert.ok(await page.locator('#toggle-play').isDisabled());assert.ok(await page.locator('#next-step').isDisabled());await page.locator('#restart-sequence').click();
  await page.locator('#start-sequence').click();await page.clock.runFor(8000*12);assert.match(await page.locator('#step-count').innerText(),/11.*11/);assert.equal(await page.locator('#sequence-progress').getAttribute('value'),'11');
  await station('findings');await page.locator('#findings .station-footer a').first().click();await active('sequence');assert.equal(await page.evaluate(()=>document.activeElement.id),'heading-sequence');
  await page.locator('#tab-basics').focus();await page.keyboard.press('End');assert.equal(await page.evaluate(()=>document.activeElement.id),'tab-findings');await page.keyboard.press('Enter');await active('findings');await page.keyboard.press('ArrowRight');assert.equal(await page.evaluate(()=>document.activeElement.id),'tab-basics');await page.keyboard.press('Space');await active('basics');
  await page.goto(origin+route+'#room');await page.waitForFunction(()=>document.documentElement.dataset.chernobylReady==='true');await active('room');await station('skala');await page.goBack();await active('room');
  const overflows=[];for(const width of [320,375,768,1024,1440]){await page.setViewportSize({width,height:1000});for(const id of ['basics','room','skala','sequence','findings']){await station(id);assert.ok(await page.locator('.station-tabs').isVisible());const wide=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);if(wide)overflows.push({width,id,elements:await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).slice(-12).map(e=>({tag:e.tagName,id:e.id,cls:e.className,text:e.textContent.slice(0,80),right:e.getBoundingClientRect().right}))) });}if(width===320){await station('room');await page.screenshot({path:qa+'/mobile-'+lang+'.png',fullPage:true});}}
  assert.deepEqual(overflows,[],'no horizontal overflow');report[lang]={stations:5,widths:[320,375,768,1024,1440],hero:hero?[hero.width,hero.height]:null,sequence:sequence?[sequence.width,sequence.height]:null};
  // Native article checks run after assets and article builds.
  if(process.argv.includes('--articles')){const article=lang==='de'?'/de/blog/tschernobyl-rbmk-skala-kontrollraum/':'/blog/chernobyl-rbmk-skala-control-room/';await page.goto(origin+article);await page.locator('footer').scrollIntoViewIfNeeded();for(const img of await page.locator('.article-figure img').all()){await img.scrollIntoViewIfNeeded();await img.evaluate(i=>i.decode());}await page.locator('h1').scrollIntoViewIfNeeded();await page.screenshot({path:qa+'/article-desktop-'+lang+'.png'});for(const width of [320,375,768,1440]){await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'article has no overflow at '+width);}await page.setViewportSize({width:320,height:1000});await page.locator('h1').scrollIntoViewIfNeeded();await page.screenshot({path:qa+'/article-mobile-'+lang+'.png'});assert.ok((await page.locator('.article-copy').innerText()).length>10000);await page.locator('a.language-link').click();assert.equal(await page.locator('html').getAttribute('lang'),lang==='de'?'en':'de');}
  await page.close();
 }
 const offline=await browser.newPage({javaScriptEnabled:false});await offline.goto(origin+'/museum/chernobyl-control-room/');assert.equal(await offline.locator('[data-station]:visible').count(),5);assert.ok(await offline.locator('.static-chronology').isVisible());await offline.close();
 assert.deepEqual(errors,[],'no console, page or HTTP errors');await writeFile(qa+'/report.json',JSON.stringify({result:'PASS',...report,errors},null,2));console.log(JSON.stringify({result:'PASS',...report,errors},null,2));
}finally{await browser.close();await new Promise(r=>server.close(r));}
