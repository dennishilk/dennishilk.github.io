import {createServer} from 'node:http';
import {readFile,stat,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve(import.meta.dirname,'..'),out='/tmp/wow-forever-diary-qa';
await mkdir(out,{recursive:true});
const {chromium}=await import(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright/index.mjs':'playwright');
const server=createServer(async(req,res)=>{
  try{
    const pathname=new URL(req.url,'http://localhost').pathname;
    // Worldnode generates this endpoint outside Git; preserve the manual fallback offline.
    if(pathname==='/world-observer/data/wow-forever-dennis-hilk.json'){res.setHeader('Content-Type','application/json');res.end('{}');return;}
    let file=resolve(root,'.'+pathname);if(!file.startsWith(root+'/'))throw Error('outside root');
    if((await stat(file)).isDirectory())file+='/index.html';
    res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.md':'text/plain; charset=utf-8'})[extname(file)]||'application/octet-stream');res.end(await readFile(file));
  }catch{res.statusCode=404;res.end('404');}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port,report={views:[],interactions:[],errors:[]};let browser;
try{
  browser=await chromium.launch({headless:true,executablePath:process.env.PALADIN_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox']});
  const context=await browser.newContext({reducedMotion:'reduce'}),page=await context.newPage();
  page.on('pageerror',e=>report.errors.push(e.message));
  page.on('response',r=>{if(r.url().startsWith(origin)&&r.status()>=400)report.errors.push(r.status()+' '+r.url());});
  await page.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  async function clearHeader(id){await page.waitForFunction(id=>{const r=document.getElementById(id).getBoundingClientRect();return r.top>=document.querySelector('.site-header').getBoundingClientRect().height-1&&r.top<innerHeight;},id);}
  for(const lang of ['de','en']){
    const route=(lang==='de'?'/de':'')+'/blog/wow-forever-nebukatneza-dennis-hilk/';
    await page.setViewportSize({width:1440,height:1000});await page.goto(origin+route);await page.waitForSelector('[data-ready=true]',{state:'attached'});
    assert.equal(await page.locator('[data-diary-section]').count(),6);
    assert.equal(await page.locator('.diary-jump-nav a').count(),6);
    assert.equal(await page.locator('.desktop-toc ol a').count(),6);
    assert.equal(await page.locator('.diary-entry').count(),8);
    assert.equal(await page.locator('.diary-entry[open]').count(),1);
    assert.ok(!await page.locator('#diary-calculator-panel').evaluate(e=>e.open));
    const dates=await page.locator('.diary-entry').evaluateAll(entries=>entries.map(e=>e.dataset.entryDate));assert.deepEqual(dates,[...dates].sort().reverse());
    const anchors=await page.evaluate(()=>({missing:[...document.querySelectorAll('a[href^="#"]')].filter(a=>!a.getAttribute('href').startsWith('#paladin=')&&!document.getElementById(decodeURIComponent(a.hash.slice(1)))).map(a=>a.hash),duplicates:[...document.querySelectorAll('[id]')].map(e=>e.id).filter((id,i,all)=>all.indexOf(id)!==i)}));assert.deepEqual(anchors,{missing:[],duplicates:[]});
    assert.ok(await page.locator('#wow-forever-layering-20261125').evaluate(e=>e.closest('[data-entry-date]')?.dataset.entryDate==='2026-11-25'));
    for(const width of [320,390,768,1024,1440]){
      await page.setViewportSize({width,height:1000});
      const state=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,navVisible:document.querySelector('.diary-jump-nav').getBoundingClientRect().height>0,sidebar:getComputedStyle(document.querySelector('.article-sidebar')).display!=='none'}));
      assert.ok(state.scroll<=width,lang+' overflow '+width+': '+state.scroll);assert.ok(state.navVisible);assert.equal(state.sidebar,width>1000);report.views.push({lang,...state});
    }
    await page.screenshot({path:out+'/'+lang+'-desktop.png'});
    await page.locator('.diary-jump-nav a[href="#paladin-calculator"]').click();await clearHeader('paladin-calculator');
    assert.ok(await page.locator('#diary-calculator-panel').evaluate(e=>e.open));
    await page.locator('[data-preset=retribution]').click();assert.equal((await page.locator('.pt-total').textContent()).trim(),'12 / 8 / 31');
    await page.locator('[data-preset=protection]').click();assert.equal((await page.locator('.pt-total').textContent()).trim(),'0 / 35 / 16');
    await page.goto(origin+route+'#paladin=p1.05005000200000000.50300000000000000.05233011201301351');await page.waitForSelector('[data-ready=true]',{state:'attached'});assert.ok(await page.locator('#diary-calculator-panel').evaluate(e=>e.open));assert.equal((await page.locator('.pt-total').textContent()).trim(),'12 / 8 / 31');
    await page.goto(origin+route+'#level-22-review');await clearHeader('level-22-review');assert.ok(await page.locator('[data-entry-date="2026-11-11"]').evaluate(e=>e.open));
    await page.goto(origin+route+'#ostfriesen-schietwetter');await clearHeader('ostfriesen-schietwetter');assert.ok(await page.locator('[data-entry-date="2026-11-19"]').evaluate(e=>e.open));
    await page.goto(origin+route+'#'+(lang==='de'?'erweiterungen':'expansions'));await clearHeader(lang==='de'?'erweiterungen':'expansions');assert.ok(await page.locator('.diary-backstory').evaluate(e=>e.open));
    await page.goto(origin+route+'#observer');await clearHeader('observer');assert.ok(await page.locator('[data-forever-card]').isVisible());
    await page.goto(origin+route+'#observer-tech');await clearHeader('observer-tech');assert.ok(await page.locator('#observer-tech').isVisible());
    await page.goto(origin+route+'#'+(lang==='de'?'quellen':'sources'));await clearHeader(lang==='de'?'quellen':'sources');assert.ok(await page.locator('.diary-sources').evaluate(e=>e.open));
    // Old dated links must reveal their entry even when it has been closed again manually.
    await page.goto(origin+route+'#diary-journal');await page.locator('.diary-date-links a[href="#level-36-20261123"]').click();await clearHeader('level-36-20261123');
    assert.ok(await page.locator('[data-entry-date="2026-11-23"]').evaluate(e=>e.open));
    const summary=page.locator('[data-entry-date="2026-11-23"] > summary');await summary.focus();await page.keyboard.press('Enter');assert.ok(!await summary.evaluate(e=>e.parentElement.open));await page.keyboard.press('Enter');assert.ok(await summary.evaluate(e=>e.parentElement.open));
    await page.setViewportSize({width:390,height:844});await page.goto(origin+route);await page.waitForSelector('[data-ready=true]',{state:'attached'});await page.screenshot({path:out+'/'+lang+'-mobile.png'});
    await page.locator('.diary-date-links a[href="#level-22-review"]').click();await clearHeader('level-22-review');
    await page.goto(origin+route);await page.waitForSelector('[data-ready=true]',{state:'attached'});await page.locator('.diary-jump-nav a[href="#paladin-calculator"]').click();await clearHeader('paladin-calculator');
    assert.ok(await page.locator('#diary-calculator-panel').evaluate(e=>e.open));
    report.interactions.push(lang+': chapter links, exact presets, six historical deep links, nested disclosure reveal, date shortcuts, keyboard and mobile sticky-header clearance');
  }
  const nojs=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}}),plain=await nojs.newPage();
  await plain.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  await plain.goto(origin+'/de/blog/wow-forever-nebukatneza-dennis-hilk/');
  const summary=plain.locator('[data-entry-date="2026-11-11"] > summary');await summary.click();assert.ok(await plain.locator('#level-22-review').isVisible());
  await plain.locator('#diary-calculator-panel > summary').click();assert.equal(await plain.locator('#diary-calculator-panel noscript figure').count(),2);
  report.interactions.push('Without JavaScript: native historical disclosure and both original build preview images remain available');
  assert.deepEqual(report.errors,[]);console.log('PASS: '+report.views.length+' responsive views, chapter navigation, old fragments, keyboard, embedded calculator and no-JS content.');
}finally{await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');if(browser)await browser.close();await new Promise(r=>server.close(r));}
