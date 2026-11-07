// Real browser checks, run in GitHub Actions when local preview is unavailable.
// No deployment and no external requests; screenshots are QA artifacts only.
import {createServer} from 'node:http';
import {readFile,stat,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';

const root=fileURLToPath(new URL('../',import.meta.url));
const output=process.env.LINUX_NEWS_QA||'/tmp/linux-news-browser-qa';
await mkdir(output,{recursive:true});
const {chromium}=await import(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright/index.mjs':'playwright');
const specs=JSON.parse(await readFile(resolve(root,'content/linux-news/articles.json'),'utf8')).filter(a=>!process.argv.includes('--audio-only')||a.topic==='linux-audio-rescue');
const widths=[320,390,650,768,1024,1440,2048],report={browser:'Chromium',articleViews:[],indexViews:[],interactions:[],errors:[]};
const server=createServer(async(req,res)=>{
  try{
    let path=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
    if(!path.startsWith(root))throw Error('Outside root');
    if((await stat(path)).isDirectory())path+='/index.html';
    res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.xml':'application/xml'})[extname(path)]||'application/octet-stream');
    res.end(await readFile(path));
  }catch{res.statusCode=404;res.end('404');}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
let browser;
try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{})});
  report.browserVersion=browser.version();
  const page=await browser.newPage({viewport:{width:1440,height:1050},reducedMotion:'reduce'});
  await page.context().grantPermissions(['clipboard-read','clipboard-write'],{origin});
  page.on('pageerror',e=>report.errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400)report.errors.push(r.status()+' '+r.url());});
  await page.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  for(const a of specs){
    const prefix=a.lang==='de'?'/de':'',route=prefix+'/blog/'+a.slug+'/';
    await page.goto(origin+route);await page.evaluate(()=>document.fonts.ready);
    assert.equal(await page.locator('h1').count(),1);
    assert.equal(await page.locator('html').getAttribute('lang'),a.lang);
    for(const width of widths){
      await page.setViewportSize({width,height:1050});
      const hero=a.heroImage||'/assets/blog/linux-news/'+a.topic+'-'+a.lang+'.svg';
      const expected=width<=650?(a.heroMobileImage||hero.replace('.svg','-mobile.svg')):hero;
      await page.waitForFunction(expected=>{const src=document.querySelector('.news-hero img').currentSrc;return Boolean(src)&&new URL(src).pathname===expected;},expected);
      await page.locator('.news-hero img').evaluate(img=>img.decode());
      const state=await page.evaluate(()=>({viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,heroWidth:document.querySelector('.news-hero').getBoundingClientRect().width,decoded:document.querySelector('.news-hero img').naturalWidth>0,mobileTOC:getComputedStyle(document.querySelector('.mobile-toc')).display!=='none',desktopTOC:getComputedStyle(document.querySelector('.article-sidebar')).display!=='none'}));
      assert.ok(state.documentWidth<=width,`${a.lang} article overflow at ${width}`);assert.ok(state.decoded);assert.equal(state.mobileTOC,width<=1000);assert.equal(state.desktopTOC,width>1000);
      report.articleViews.push({language:a.lang,width,...state});
    }
    for(const [name,width,height] of [['desktop',1440,1050],['mobile',390,844]]){
      await page.setViewportSize({width,height});await page.goto(origin+route);await page.locator('.news-hero img').evaluate(img=>img.decode());
      await page.screenshot({path:output+'/'+a.lang+'-'+a.topic+'-'+name+'.jpg',type:'jpeg',quality:80,fullPage:true});
    }
    const target=a.topic==='linux-audio-rescue'?'services':a.topic==='worldnode-nginx'?'worldnode':a.topic==='ai-linux-kernel-948'?'numbers':a.topic==='plasma-68-wayland'?'readiness':a.topic==='windows-10-esu-2027'?(a.lang==='de'?'entscheidung':'decision'):'fix-status';
    await page.locator('.mobile-toc summary').click();
    await page.locator('.mobile-toc a[href="#'+target+'"]').click();
    assert.ok(page.url().endsWith('#'+target));
    await page.waitForFunction(target=>{const r=document.getElementById(target).getBoundingClientRect();return r.top>=document.querySelector('.site-header').getBoundingClientRect().height-2&&r.top<innerHeight;},target);
    report.interactions.push(a.lang+': mobile TOC target remains below sticky header');
    await page.setViewportSize({width:1440,height:1050});
    await page.goto(origin+route);await page.locator('.desktop-toc a[href="#'+target+'"]').click();assert.ok(page.url().endsWith('#'+target));
    if(a.topic==='windows-10-esu-2027'){
      const lab=page.locator('[data-esu-lab]'),form=lab.locator('form');
      const result=lab.locator('.esu-result'),title=result.locator('h3');
      const requestCount=[];
      const requestListener=request=>requestCount.push(request.url());
      await page.locator('.esu-desktop img').scrollIntoViewIfNeeded();
      await page.locator('.esu-desktop img').evaluate(img=>img.decode());
      await page.waitForLoadState('networkidle');
      page.on('request',requestListener);
      try{
        const values={edition:'home',managed:'no',win11:'no',account:'local',region:'eea',workload:'gaming',apps:'no',anticheat:'yes',spare:'no',priority:'balanced',live:'not-yet'};
        const titleFor=async route=>lab.locator(`template[data-esu-route="${route}"]`).evaluate(node=>node.content.querySelector('h4').textContent);
        await page.context().setOffline(true);
        await form.locator('[type="submit"]').focus();
        await page.keyboard.press('Enter');
        assert.equal(await page.locator(':focus').getAttribute('name'),'edition');
        for(const [name,value] of Object.entries(values))await form.locator(`select[name="${name}"]`).selectOption(value);
        for(const [changes,route] of [
          [{},'esu'],[{win11:'yes'},'windows'],[{anticheat:'no'},'live'],[{live:'passed'},'migration'],[{managed:'yes'},'verify']
        ]){
          for(const [name,value] of Object.entries(changes))await form.locator(`select[name="${name}"]`).selectOption(value);
          assert.equal(await result.isVisible(),false);
          await form.locator('[type="submit"]').focus();
          await page.keyboard.press('Enter');
          assert.equal(await title.textContent(),await titleFor(route));
          assert.equal(await page.locator(':focus').getAttribute('id'),'esu-result-title');
          if(route==='esu')assert.match(await result.textContent(),/Kaufoption|paid option/);
        }
        await form.locator('[type="reset"]').focus();await page.keyboard.press('Enter');
        assert.equal(await result.isVisible(),false);
        assert.equal(await page.locator(':focus').getAttribute('name'),'edition');
        assert.deepEqual(await form.locator('select').evaluateAll(xs=>xs.map(x=>x.value)),Array(11).fill(''));
        assert.deepEqual(requestCount,[]);
      }finally{
        page.off('request',requestListener);
        await page.context().setOffline(false);
      }
      const noJS=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
      const fallback=await noJS.newPage();
      try{
        await fallback.goto(origin+route);
        assert.equal(await fallback.locator('[data-esu-lab]').isVisible(),false);
        assert.ok(await fallback.locator('noscript').isVisible());
        assert.ok(await fallback.locator('#linux-live').isVisible());
      }finally{await noJS.close();}
      report.interactions.push(a.lang+': Decision Lab required fields, five routes, keyboard focus, reset, offline operation and no-JavaScript fallback');
    }
    if(a.topic==='worldnode-nginx'){
      assert.equal(await page.locator('.wn-shot img').count(),4);
      for(const image of await page.locator('.wn-shot img').all()){
        await image.scrollIntoViewIfNeeded();await image.evaluate(img=>img.decode());
        assert.ok(await image.evaluate(img=>img.naturalWidth>0&&img.naturalHeight>0));
      }
    }
    if(a.articleClass?.includes('deep-dive')){
      const first=page.locator('pre[data-copy]').first();
      const command=await first.textContent();
      const button=first.locator('xpath=following-sibling::*[1]').locator('button');
      await button.focus();await page.keyboard.press('Enter');
      await page.waitForFunction(()=>/Copied|Kopiert/.test(document.querySelector('.copy-status').textContent));
      assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),command);
      await page.evaluate(()=>{navigator.clipboard.writeText=async()=>{throw Error('Clipboard denied in test');};});
      await button.click();
      await page.waitForFunction(()=>/manually|manuell/.test(document.querySelector('.copy-status').textContent));
      report.interactions.push(a.lang+' '+a.topic+': keyboard copy preserves exact command; clipboard denial has manual fallback');
      if(a.topic==='apt-cve-2026-109518'){
        const select=page.locator('#apt-release');
        for(const value of ['debian','ubuntu','other','all']){
          await select.selectOption(value);
          const visible=await page.locator('[data-guide-panel]:visible').evaluateAll(xs=>xs.map(x=>x.dataset.guidePanel));
          assert.deepEqual(visible,value==='all'?['debian','ubuntu','other']:[value]);
        }
        for(const box of await page.locator('.check-guide input').all()){await box.focus();await page.keyboard.press('Space');}
        assert.match(await page.locator('[data-progress]').textContent(),/4 (?:of|von) 4/);
        assert.match(await page.locator('[data-progress]').textContent(),/not a security assessment|kein Sicherheitsnachweis/);
        await page.locator('[data-reset]').click();
        assert.equal(await page.locator('.check-guide input:checked').count(),0);
        report.interactions.push(a.lang+': all APT reference filters, keyboard checkboxes, cautionary progress and reset');
      }
      if(a.topic==='plasma-68-wayland'){
        for(const value of ['office','gaming','development','remote','creative','all']){
          await page.locator('#wayland-use').selectOption(value);
          const visible=await page.locator('[data-guide-panel]:visible').evaluateAll(xs=>xs.map(x=>({key:x.dataset.guidePanel,open:x.open})));
          assert.deepEqual(visible,value==='all'?['office','gaming','development','remote','creative'].map(key=>({key,open:false})):[{key:value,open:true}]);
        }
        report.interactions.push(a.lang+': five Wayland workflows and return to full guide');
      }
      const noJS=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
      await noJS.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
      const fallback=await noJS.newPage();await fallback.goto(origin+route);
      assert.equal(await fallback.locator('pre[data-copy]').count(),await page.locator('pre[data-copy]').count());
      for(const panel of await fallback.locator('[data-guide-panel]').all())assert.ok(await panel.isVisible());
      for(const summary of await fallback.locator('.check-guide details summary').all()){
        await summary.click();assert.equal(await summary.evaluate(x=>x.parentElement.open),true);
      }
      assert.equal(await fallback.locator('[data-selector]:visible').count(),0);
      await noJS.close();report.interactions.push(a.lang+' '+a.topic+': commands and full guide available without JavaScript');
    }
    await page.locator('.language-link').click();
    assert.equal(await page.locator('html').getAttribute('lang'),a.lang==='en'?'de':'en');
    assert.ok(page.url().includes('/blog/'+a.alternate+'/'));
    report.interactions.push(a.lang+': desktop TOC and reciprocal language switch');
  }
  for(const lang of ['en','de']){
    const prefix=lang==='de'?'/de':'',a=specs.find(x=>x.lang===lang);
    await page.goto(origin+prefix+'/blog/');
    for(const width of widths){await page.setViewportSize({width,height:1050});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),lang+' index overflow '+width);report.indexViews.push({language:lang,width});}
    await page.setViewportSize({width:1440,height:1050});await page.locator('#blog-navigation a[href="#linux-news"]').click();
    assert.ok(page.url().endsWith('#linux-news'));
    const categoryCount=await page.locator('#linux-news .guide-card').count();
    assert.equal(Number(await page.locator('#linux-news .section-heading span').textContent()),categoryCount);
    for(const article of specs.filter(x=>x.lang===lang))assert.equal(await page.locator('#linux-news .card-link[href="'+prefix+'/blog/'+article.slug+'/"]').count(),1);
    await page.screenshot({path:output+'/'+lang+'-category.jpg',type:'jpeg',quality:80});
    await page.locator('#linux-news .card-link').filter({hasText:a.title}).click();assert.ok(page.url().includes('/blog/'+a.slug+'/'));
    report.interactions.push(lang+': category navigation and article card');
  }
  assert.deepEqual(report.errors,[]);
  console.log('PASS: '+report.articleViews.length+' article views, '+report.indexViews.length+' index views, decoded article images, TOCs, sticky-header clearance, language round trips and category cards.');
}finally{
  await writeFile(output+'/report.json',JSON.stringify(report,null,2)+'\n');
  if(browser)await browser.close();await new Promise(r=>server.close(r));
}
