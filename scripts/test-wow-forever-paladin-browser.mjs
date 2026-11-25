import {createServer} from 'node:http';
import {readFile,stat,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve(import.meta.dirname,'..'),out='/tmp/wow-forever-paladin-qa';
await mkdir(out,{recursive:true});
const {chromium}=await import(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright/index.mjs':'playwright');
const server=createServer(async(req,res)=>{
  try{
    const pathname=new URL(req.url,'http://localhost').pathname;
    // This JSON is generated on Worldnode, outside Git. Exercise the dated offline fallback locally.
    if(pathname==='/world-observer/data/wow-forever-dennis-hilk.json'){res.setHeader('Content-Type','application/json');res.end('{}');return;}
    let file=resolve(root,'.'+pathname);
    if(!file.startsWith(root+'/'))throw Error('outside root');
    if((await stat(file)).isDirectory())file+='/index.html';
    res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.mjs':'text/javascript','.js':'text/javascript','.json':'application/json','.css':'text/css','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.md':'text/plain; charset=utf-8'})[extname(file)]||'application/octet-stream');
    res.end(await readFile(file));
  }catch{res.statusCode=404;res.end('404');}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
const report={views:[],interactions:[],errors:[]};let browser;
const paths={de:'/de/tools/wow-forever-paladin-talentrechner/',en:'/tools/wow-forever-paladin-talent-calculator/'};
try{
  browser=await chromium.launch({headless:true,executablePath:process.env.PALADIN_CHROMIUM || '/usr/bin/chromium',args:['--no-sandbox']});
  const context=await browser.newContext({permissions:['clipboard-read','clipboard-write'],reducedMotion:'reduce'});
  const page=await context.newPage();
  page.on('pageerror',e=>report.errors.push(e.message));
  page.on('response',r=>{if(r.url().startsWith(origin)&&r.status()>=400)report.errors.push(r.status()+' '+r.url());});
  page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('ERR_FAILED'))report.errors.push(m.text());});
  await page.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  for(const lang of ['de','en']){
    await page.setViewportSize({width:1440,height:1100});
    await page.goto(origin+paths[lang]);await page.waitForSelector('[data-ready=true]',{state:'attached'});
    const pt=page.locator('.pt');
    assert.equal(await pt.locator('[data-talent]').count(),51);
    assert.equal((await pt.locator('.pt-total').textContent()).trim(),'0 / 35 / 16');
    await pt.locator('[data-preset=retribution]').click();assert.equal((await pt.locator('.pt-total').textContent()).trim(),'12 / 8 / 31');
    await pt.locator('[data-preset=protection]').click();
    // A maxed parent with an invested dependent cannot be removed.
    await pt.locator('[data-talent="1:1"]').click({button:'right'});assert.equal((await pt.locator('.pt-total').textContent()).trim(),'0 / 35 / 16');
    assert.ok((await pt.locator('.pt-status').textContent()).length>0);
    await pt.locator('[data-own]').click();assert.equal((await pt.locator('.pt-total').textContent()).trim(),'0 / 0 / 0');
    const first=pt.locator('[data-talent="0:0"]');
    await first.click();assert.equal(await first.locator('.pt-rank').textContent(),'1/5');
    await first.click({button:'right'});assert.equal(await first.locator('.pt-rank').textContent(),'0/5');
    await first.focus();await page.keyboard.press('Enter');assert.equal(await first.locator('.pt-rank').textContent(),'1/5');
    await page.keyboard.press('Shift+Enter');assert.equal(await first.locator('.pt-rank').textContent(),'0/5');
    await page.keyboard.press('+');assert.equal(await first.locator('.pt-rank').textContent(),'1/5');
    await page.keyboard.press('ArrowRight');assert.equal(await page.evaluate(()=>document.activeElement.dataset.talent),'0:1');
    await page.keyboard.press('Escape');assert.ok(await page.locator('.pt-tooltip').isHidden());
    await pt.locator('[data-share]').click();const shared=await page.evaluate(()=>navigator.clipboard.readText());
    assert.ok(shared.includes(paths[lang]+'#paladin=p1.'));assert.equal(await pt.locator('.pt-share input').inputValue(),shared);
    await page.goto(shared);await page.waitForSelector('[data-ready=true]',{state:'attached'});assert.equal((await page.locator('.pt-total').textContent()).trim(),'1 / 0 / 0');
    await page.goto(origin+paths[lang]+'#paladin=p1.55555555555555555.55555555555555555.55555555555555555');await page.waitForSelector('[data-ready=true]',{state:'attached'});
    assert.equal((await page.locator('.pt-total').textContent()).trim(),'0 / 35 / 16');assert.ok((await page.locator('.pt-status').textContent()).length>0);
    await page.locator('[data-preset=retribution]').click();await page.locator('[data-tree-reset="0"]').click();assert.equal((await page.locator('.pt-total').textContent()).trim(),'0 / 8 / 31');
    await page.locator('[data-preset=protection]').click();
    for(const width of [320,390,768,1024,1440]){
      await page.setViewportSize({width,height:1000});
      const state=await page.evaluate(()=>({width:innerWidth,container:document.querySelector('.pt').clientWidth-parseFloat(getComputedStyle(document.querySelector('.pt')).paddingLeft)-parseFloat(getComputedStyle(document.querySelector('.pt')).paddingRight),scroll:document.documentElement.scrollWidth,visibleTrees:[...document.querySelectorAll('.pt-tree')].filter(t=>getComputedStyle(t).display!=='none').length,broken:[...document.images].filter(i=>i.complete&&!i.naturalWidth).length}));
      assert.ok(state.scroll<=width,lang+' overflow '+width+': '+state.scroll);assert.equal(state.broken,0);assert.equal(state.visibleTrees,state.container<660?1:3);report.views.push({lang,surface:'tool',...state});
    }
    await page.setViewportSize({width:1440,height:1100});await page.goto(origin+paths[lang]);await page.waitForSelector('[data-ready=true]',{state:'attached'});await page.screenshot({path:out+'/'+lang+'-desktop.png'});
    if(lang==='en'){
      // Static build previews and social image are captured from our own live UI.
      await page.locator('[data-preset=protection]').click();
      await page.locator('.pt').screenshot({path:out+'/protection-build.png',type:'png'});
      await page.locator('.pt-trees').screenshot({path:out+'/social-trees.png'});
      await page.locator('[data-preset=retribution]').click();
      await page.locator('.pt').screenshot({path:out+'/retribution-build.png',type:'png'});
    }
    // Shared implementation embedded in each existing diary.
    await page.goto(origin+(lang==='de'?'/de':'')+'/blog/wow-forever-nebukatneza-dennis-hilk/');await page.waitForSelector('[data-ready=true]',{state:'attached'});
    const panel=page.locator('#diary-calculator-panel');if(await panel.count()&&!await panel.evaluate(e=>e.open))await panel.locator(':scope > summary').click();
    for(const width of [320,390,768,1024,1440]){
      await page.setViewportSize({width,height:1000});
      const state=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));if(state.scroll>width){console.log(await page.evaluate(()=>[...document.querySelectorAll('body *')].map(el=>({tag:el.tagName,cls:String(el.className),id:el.id,clipped:(()=>{for(let a=el.parentElement;a&&a!==document.body;a=a.parentElement){if(['hidden','auto','scroll','clip'].includes(getComputedStyle(a).overflowX))return true;}return false;})(),r:el.getBoundingClientRect().right,w:el.getBoundingClientRect().width})).filter(x=>x.r>innerWidth+2&&x.w>0&&!x.clipped).slice(0,30)));await page.screenshot({path:out+'/blog-overflow.png'});}assert.ok(state.scroll<=width,lang+' blog overflow '+width+': '+state.scroll);report.views.push({lang,surface:'blog',...state});
    }
    await page.locator('[data-preset=retribution]').click();assert.equal((await page.locator('.pt-total').textContent()).trim(),'12 / 8 / 31');
    await page.locator('[data-preset=protection]').click();
    assert.equal(await page.locator('#level-40-20261125').count(),1);
    await page.locator('[data-wow40-lightbox]').first().click();assert.ok(await page.locator('.wow40-lightbox').isVisible());await page.keyboard.press('Escape');assert.ok(await page.locator('.wow40-lightbox').isHidden());
    report.interactions.push(lang+': presets, cap, prerequisite removal, click/right-click, keyboard, clipboard round-trip, malicious URL, tree reset, embedding and lightbox');
  }
  const touch=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const mobile=await touch.newPage();
  await mobile.goto(origin+paths.de);await mobile.waitForSelector('[data-ready=true]',{state:'attached'});
  await mobile.locator('[data-own]').tap();await mobile.locator('[data-talent="0:0"]').tap();assert.equal(await mobile.locator('[data-talent="0:0"] .pt-rank').textContent(),'1/5');
  await mobile.locator('[data-add]').tap();assert.equal(await mobile.locator('[data-talent="0:0"] .pt-rank').textContent(),'2/5');
  await mobile.locator('[data-remove]').tap();assert.equal(await mobile.locator('[data-talent="0:0"] .pt-rank').textContent(),'1/5');
  for(const ti of [0,1,2]){await mobile.locator(`[data-mobile-tree="${ti}"]`).tap();assert.ok(await mobile.locator('.pt-tree').nth(ti).isVisible());}
  await mobile.screenshot({path:out+'/de-mobile.png'});report.interactions.push('Real touch context: tap, +/− controls and three mobile tree selectors');
  const plain=await browser.newContext({javaScriptEnabled:false});const nojs=await plain.newPage();await nojs.goto(origin+paths.de);
  assert.equal(await nojs.locator('#talent-reference ~ section details').count(),51);report.interactions.push('All 51 talents and all ranks readable without JavaScript');
  assert.deepEqual(report.errors,[]);
  console.log('PASS: '+report.views.length+' viewport checks, both languages, functional interactions, clipboard, touch and no-JS reference.');
} finally {
  await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');
  if(browser)await browser.close();await new Promise(r=>server.close(r));
}
