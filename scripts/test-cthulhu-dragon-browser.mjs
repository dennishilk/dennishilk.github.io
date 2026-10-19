import {createServer} from 'node:http';
import {readFile,stat,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve(import.meta.dirname,'..'),out='/tmp/cthulhu-dragon-qa';
await mkdir(out,{recursive:true});
const {chromium}=await import(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright/index.mjs':'playwright');
const server=createServer(async(req,res)=>{
  try{let path=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!path.startsWith(root+'/'))throw Error('outside');if((await stat(path)).isDirectory())path+='/index.html';res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png'})[extname(path)]||'application/octet-stream');res.end(await readFile(path));}
  catch{res.statusCode=404;res.end('404');}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port,report={views:[],interactions:[],errors:[]};let browser;
try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  report.browser=browser.version();
  const context=await browser.newContext({permissions:['clipboard-read','clipboard-write'],reducedMotion:'reduce'});
  const page=await context.newPage();
  page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.errors.push(r.status()+' '+r.url());});
  await page.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  for(const lang of ['en','de']){
    const prefix=lang==='de'?'/de':'',route=prefix+'/blog/nixos-xmonad-kanagawa-dragon/';
    await page.goto(origin+route);await page.locator('.dragon-hero img').evaluate(i=>i.decode());
    assert.equal(await page.locator('figure[data-source-file]').count(),15);
    for(const width of [320,390,650,768,1024,1440,2048]){
      await page.setViewportSize({width,height:1000});
      const state=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,mobile:getComputedStyle(document.querySelector('.mobile-toc')).display!=='none',sidebar:getComputedStyle(document.querySelector('.article-sidebar')).display!=='none',image:document.querySelector('.dragon-hero img').naturalWidth}));
      assert.ok(state.scroll<=width,lang+' overflow '+width+': '+state.scroll);assert.ok(state.image>0);assert.equal(state.mobile,width<=1000);assert.equal(state.sidebar,width>1000);report.views.push({lang,...state});
    }
    for(const [name,width,height] of [['desktop',1440,1050],['mobile',390,844]]){
      await page.setViewportSize({width,height});await page.goto(origin+route);await page.locator('.dragon-hero img').evaluate(i=>i.decode());
      await page.screenshot({path:out+'/'+lang+'-'+name+'.png'});
      const block=page.locator('figure[data-source-file="home/.xmonad/xmonad.hs"]');await block.scrollIntoViewIfNeeded();await block.screenshot({path:out+'/'+lang+'-xmonad-'+name+'.png'});
    }
    const block=page.locator('figure[data-source-file="home/.xmonad/xmonad.hs"]');
    const expected=(await readFile(resolve(root,'content/cthulhu-dragon/files/home/.xmonad/xmonad.hs'),'utf8')).trimEnd()+'\n';
    await block.locator('button').click();assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),expected);report.interactions.push(lang+': clipboard contains complete unmodified Haskell');
    await page.goto(origin+route);await page.locator('.mobile-toc summary').click();
    const target=page.locator('.mobile-toc a').nth(4);const id=await target.getAttribute('href');await target.click();assert.ok(page.url().endsWith(id));
    await page.waitForFunction(id=>{const r=document.querySelector(id).getBoundingClientRect();return r.top>=document.querySelector('.site-header').getBoundingClientRect().height-2&&r.top<innerHeight;},id);
    report.interactions.push(lang+': mobile TOC target clears sticky header');
    await page.setViewportSize({width:1440,height:1050});await page.goto(origin+route);await page.locator('.language-link').click();assert.equal(await page.locator('html').getAttribute('lang'),lang==='en'?'de':'en');
    report.interactions.push(lang+': reciprocal language switch');
    await page.goto(origin+prefix+'/blog/');await page.locator('#cthulhu-dragon a.card-link').click();assert.ok(page.url().includes(route));
    report.interactions.push(lang+': existing tutorial card opens article');
  }
  const noJS=await browser.newContext({javaScriptEnabled:false});const plain=await noJS.newPage();await plain.goto(origin+'/blog/nixos-xmonad-kanagawa-dragon/');assert.equal(await plain.locator('figure[data-source-file]').count(),15);assert.equal(await plain.locator('figure[data-source-file="home/.xmonad/xmonad.hs"] code').textContent(),(await readFile(resolve(root,'content/cthulhu-dragon/files/home/.xmonad/xmonad.hs'),'utf8')).trimEnd()+'\n');
  report.interactions.push('Full configuration library is readable without JavaScript');
  assert.deepEqual(report.errors,[]);console.log('PASS: '+report.views.length+' responsive article views, copy fidelity, TOCs, language/card routing and no-JS content.');
}finally{await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');if(browser)await browser.close();await new Promise(r=>server.close(r));}
