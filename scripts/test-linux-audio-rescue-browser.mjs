// Full branching-UI regression, with actual clicks, clipboard and native keyboard.
// All traffic stays on the local test server. No sound hardware is simulated.
import {createServer} from 'node:http';
import {readFile,stat,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {starts,nodes,unknown} from '../content/linux-audio-rescue/flow.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const output=process.env.AUDIO_RESCUE_QA||'/tmp/linux-audio-rescue-qa';await mkdir(output,{recursive:true});
const {chromium}=await import(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright/index.mjs':'playwright');
const report={views:[],paths:{},unknownExits:0,copied:0,errors:[],externalRequests:[],failedResponses:[]};
const server=createServer(async(req,res)=>{try{let path=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!path.startsWith(root))throw Error('outside');if((await stat(path)).isDirectory())path+='/index.html';res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.xml':'application/xml'})[extname(path)]||'application/octet-stream');res.end(await readFile(path));}catch{res.statusCode=404;res.end('404');}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
let browser;
try{
 let launch={headless:true,args:['--no-sandbox']};
 if(process.env.AUDIO_CHROMIUM_MODULE){const {default:c}=await import(process.env.AUDIO_CHROMIUM_MODULE);launch={headless:true,args:c.args,executablePath:await c.executablePath()};}
 if(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH)launch.executablePath=process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
 browser=await chromium.launch(launch);report.browserVersion=browser.version();
 const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce',permissions:['clipboard-read','clipboard-write']});const page=await context.newPage();page.setDefaultTimeout(10000);
 page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.failedResponses.push(r.status()+' '+r.url());});await page.route('**/*',route=>{if(new URL(route.request().url()).origin===origin)return route.continue();report.externalRequests.push(route.request().url());return route.abort();});
 for(const lang of ['en','de']){
  const url=origin+(lang==='de'?'/de/blog/linux-audio-fehler-beheben/':'/blog/linux-audio-troubleshooting/');
  await page.goto(url);const host=page.locator('#audio-rescue'),view=host.locator('[data-view]'),back=host.locator('[data-back]');
  await view.getByRole('button',{name:starts[0].label[lang],exact:true}).waitFor();
  assert.equal(await view.locator('.rescue-choices > button').count(),14);
  for(const width of [320,390,650,768,1024,1440,2048]){
   await page.setViewportSize({width,height:1000});
   for(const img of await page.locator('.news-hero img,.audio-figure img').all()){await img.scrollIntoViewIfNeeded();await img.evaluate(i=>i.decode());assert.ok(await img.evaluate(i=>i.naturalWidth>0));}
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),lang+' overflow '+width);
   report.views.push({lang,width});
  }
  // The first complete DFS covers every possible result combination, not just nodes.
  await page.setViewportSize({width:1440,height:1000});await page.goto(url);let leaves=0;const copied=new Set(),terminalChecked=new Set();
  async function checkState(id){const n=nodes[id];assert.equal(await view.locator('h3').textContent(),n.title[lang]);assert.equal(await view.locator('h3').evaluate(n=>n===document.activeElement),true,'focus follows the new question');assert.ok(page.url().endsWith('#audio-'+id));
   const b=view.getByRole('button',{name:lang==='de'?'Befehl kopieren':'Copy command',exact:true});
   if(await b.count()&&!copied.has(id)){const command=await view.locator('.rescue-command pre').first().textContent();await b.first().click();assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),command);copied.add(id);report.copied++;}
  }
  async function dfs(id){await checkState(id);const n=nodes[id];if(n.terminal){leaves++;if(!terminalChecked.has(id)){for(const d of await view.locator('details').all()){await d.locator('summary').click();assert.ok((await d.textContent()).length>50);}terminalChecked.add(id);}return;}
   for(const o of n.options){await view.getByRole('button',{name:o.label[lang],exact:true}).click();await dfs(o.next);await back.click();assert.equal(await view.locator('h3').textContent(),n.title[lang]);}
  }
  for(const start of starts){await view.getByRole('button',{name:start.label[lang],exact:true}).click();await dfs(start.id);await back.click();assert.equal(await view.locator('.rescue-choices > button').count(),14);console.log(lang+' '+start.id+': '+leaves+' completed paths so far');}
  report.paths[lang]=leaves;assert.equal(leaves,495);
  // Every question has a usable uncertainty exit; back returns to that question.
  for(const [id,n]of Object.entries(nodes).filter(([,n])=>!n.terminal)){
   await page.goto(url+'#audio-'+id);await view.getByRole('heading',{name:n.title[lang],exact:true}).waitFor();await view.getByText(unknown[lang],{exact:true}).click();await view.getByRole('button',{name:lang==='de'?'Mit unvollständigen Befunden weiter':'Continue with incomplete evidence',exact:true}).click();assert.equal(await view.locator('h3').textContent(),nodes['unresolved-result'].title[lang]);await back.click();assert.equal(await view.locator('h3').textContent(),n.title[lang]);report.unknownExits++;
  }
  // Expert mode exposes the original Lab diagnostics, with real copy operations.
  await page.goto(url+'#audio-busy-result');await host.locator('[data-expert]').check();assert.equal(await view.locator('.rescue-command').count(),2);assert.match(await view.textContent(),/sudo fuser -v/);await view.getByRole('button',{name:lang==='de'?'Befehl kopieren':'Copy command',exact:true}).first().click();assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),'sudo fuser -v /dev/snd/*');report.copied++;
  await host.locator('[data-expert]').uncheck();
  // Open expert prose before exercising its otherwise hidden copy controls.
  for(const summary of await page.locator('.article-copy details:not(.mobile-toc) > summary').all())await summary.click();
  // Every article code block actually copies its adjacent text.
  for(const b of await page.locator('.article-copy .audio-copy').all()){const command=await b.evaluate(n=>n.previousElementSibling.textContent);await b.click();assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),command);report.copied++;}
  // Keyboard activation and native accessible roles are checked on the live UI.
  await page.goto(url);const entry=view.getByRole('button',{name:starts[1].label[lang],exact:true});await entry.focus();await page.keyboard.press('Enter');assert.equal(await view.locator('h3').textContent(),nodes.connection.title[lang]);await page.keyboard.press('Tab');assert.equal(await view.locator('.rescue-command pre').evaluate(b=>b===document.activeElement),true);
  await page.keyboard.press('Tab');await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),await view.locator('.rescue-command pre').textContent());report.copied++;
  await view.getByRole('button',{name:nodes.connection.options[0].label[lang],exact:true}).click();await page.goBack();assert.equal(await view.locator('h3').textContent(),nodes.connection.title[lang]);await page.goForward();assert.equal(await view.locator('h3').textContent(),nodes.context.title[lang]);await page.goBack();
  assert.match(await host.ariaSnapshot(),new RegExp(nodes.connection.title[lang].replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  await page.setViewportSize({width:320,height:850});
  for(const id of Object.keys(nodes)){await page.goto(url+'#audio-'+id);await view.getByRole('heading',{name:nodes[id].title[lang],exact:true}).waitFor();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),lang+' mobile state '+id);}
  await page.goto(url+'#audio-connection');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await host.screenshot({path:output+'/'+lang+'-assistant-mobile.png'});
  await page.setViewportSize({width:1440,height:1000});await page.goto(url);await page.screenshot({path:output+'/'+lang+'-desktop.png'});await page.locator('.news-hero').screenshot({path:output+'/'+lang+'-architecture.png'});
  await page.goto(url+'#audio-silence');await page.locator('.language-link').click();assert.equal(await page.locator('html').getAttribute('lang'),lang==='de'?'en':'de');
  // Static article remains complete with JavaScript disabled.
  const nojs=await browser.newContext({javaScriptEnabled:false,viewport:{width:320,height:850}});const staticPage=await nojs.newPage();await staticPage.goto(url);assert.equal(await staticPage.locator('.article-copy h2').count(),21);assert.ok((await staticPage.locator('.article-copy').textContent()).length>20000);await nojs.close();
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.externalRequests,[]);assert.deepEqual(report.failedResponses,[]);
 console.log('PASS '+JSON.stringify({paths:report.paths,views:report.views.length,unknownExits:report.unknownExits,copied:report.copied,browser:report.browserVersion}));
}finally{await writeFile(output+'/report.json',JSON.stringify(report,null,2)+'\n');if(browser)await browser.close();await new Promise(r=>server.close(r));}
