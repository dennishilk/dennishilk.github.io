import {createServer} from 'node:http';
import {readFile,stat,mkdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright/index.mjs');
const root=fileURLToPath(new URL('../',import.meta.url)),qa=process.env.SGI_QA_DIR||'/tmp/sgi-qa';await mkdir(qa,{recursive:true});
const server=createServer(async(req,res)=>{try{let p=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!p.startsWith(root))throw Error('path');if((await stat(p)).isDirectory())p+='/index.html';res.setHeader('Content-Type',({'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.webp':'image/webp','.png':'image/png'})[extname(p)]||'application/octet-stream');res.end(await readFile(p));}catch{res.statusCode=404;res.end('404');}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({executablePath:process.env.SGI_BROWSER||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']}),errors=[],requests=[];
try{
 const context=await browser.newContext({viewport:{width:1440,height:1100}});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
 await page.route('**/*',r=>{requests.push(r.request().url());return new URL(r.request().url()).origin!==origin?r.abort():r.continue();});
 const go=async path=>{await page.goto(origin+path);await page.waitForFunction(()=>document.documentElement.dataset.sgiReady==='true');await page.evaluate(()=>document.fonts.ready);};
 const search=async name=>{await page.locator('#file-search').fill(name);await page.locator('#search-results button').filter({hasText:name}).first().click();};
 const command=async text=>{await page.locator('#command').fill(text);await page.locator('#command').press('Enter');};
 for(const lang of ['en','de']){
  await go((lang==='de'?'/de':'')+'/museum/jurassic-park-sgi/');assert.equal(await page.locator('#directory-list button').count(),5);
  assert.ok(await page.locator('#landscape').evaluate(c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data.some(v=>v)));
  await page.screenshot({path:qa+'/'+lang+'-workstation.png',fullPage:true});
  for(const view of ['bird','front','overview']){const before=await page.locator('#landscape').evaluate(c=>c.toDataURL());await page.locator('[data-view='+view+']').click();assert.equal(await page.locator('[data-view='+view+']').getAttribute('aria-pressed'),'true');assert.notEqual(await page.locator('#landscape').evaluate(c=>c.toDataURL()),before);}
  await page.locator('#landscape').focus();await page.keyboard.press('ArrowRight');assert.notEqual(await page.locator('#inspector-title').innerText(),'park');await page.keyboard.press('Enter');assert.notEqual(await page.locator('#pathbar').innerText(),'/park');await page.keyboard.press('Backspace');assert.equal(await page.locator('#pathbar').innerText(),'/park');
  await search('Fences');assert.match(await page.locator('#pathbar').innerText(),/Fences$/);await page.locator('#nav-up').click();assert.match(await page.locator('#pathbar').innerText(),/Physical.Security$/);await page.locator('#nav-reset').click();assert.equal(await page.locator('#pathbar').innerText(),'/park');
  await page.locator('#mode-bonus').click();await command('restore fences');assert.equal(await page.locator('.map-node.online').count(),0);assert.match(await page.locator('#terminal-output').innerText(),/Interlock|Verriegelung/);
  for(const c of ['access security','access security grid']){await command(c);assert.equal(await page.locator('#dennis-dialog').isVisible(),false);}
  await command('access main security grid');assert.equal(await page.locator('#dennis-dialog').isVisible(),true);assert.equal((await page.locator('#terminal-output').innerText()).match(/PERMISSION DENIED|ZUGRIFF VERWEIGERT/g).length,3);
  assert.ok(await page.locator('#dennis-dialog img').evaluate(img=>img.complete&&img.naturalWidth>0));await page.screenshot({path:qa+'/'+lang+'-dennis.png'});await page.locator('#magic').fill(lang==='de'?'bitte':'please');await page.locator('#magic').press('Enter');assert.equal(await page.locator('#dennis-dialog').isVisible(),false);
  await command('cd /park/Physical.Plant');await command('ls');assert.match(await page.locator('#terminal-output').innerText(),/Physical.Security/);await command('cd missing');assert.match(await page.locator('#terminal-output').innerText(),/not found|nicht gefunden/);
  for(const action of ['diagnose','isolate','reboot','power','communications','fences'])await page.locator('[data-action='+action+']').click();
  await command('restore doors');assert.equal(await page.locator('#system-banner.secured').count(),0);
  await page.locator('#locate-module').click();await search('door.control');assert.match(await page.locator('#file-content').innerText(),/ACCESS CONTROL|ZUGANGSSTEUERUNG/);await page.locator('#file-action').click();assert.equal(await page.locator('#system-banner.secured').count(),1);assert.equal(await page.locator('.map-node.online').count(),6);await page.screenshot({path:qa+'/'+lang+'-bonus.png',fullPage:true});
  await page.locator('#recovery-reset').click();assert.equal(await page.locator('.map-node.online').count(),0);
  await page.locator('#mode-workstation').click();await search('.raptor_support');assert.match(await page.locator('#file-content').innerText(),/helping hand|helfende Hand/);await search('ocean-monitor');await page.locator('#file-action').click();assert.equal(await page.locator('#shark-dialog').isVisible(),true);await page.keyboard.press('Escape');
  for(const width of [320,390,640,768,1024,1440,2048]){await page.setViewportSize({width,height:950});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'overflow '+lang+' '+width);await page.locator('#mode-bonus').click();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'bonus overflow '+lang+' '+width);await page.locator('#mode-workstation').click();}
  await page.setViewportSize({width:390,height:844});await page.locator('#nav-reset').click();await page.screenshot({path:qa+'/'+lang+'-mobile.png',fullPage:true});await page.setViewportSize({width:1440,height:1100});
 }
 await page.locator('.language').click();await page.waitForFunction(()=>document.documentElement.lang==='en');assert.ok(page.url().endsWith('/museum/jurassic-park-sgi/'));
 await context.setOffline(true);await search('fsn.notes');assert.match(await page.locator('#file-content').innerText(),/real fsn/);await context.setOffline(false);
 assert.ok(requests.every(url=>new URL(url).origin===origin));assert.deepEqual(errors,[]);
 const noCanvas=await browser.newContext();await noCanvas.addInitScript(()=>{HTMLCanvasElement.prototype.getContext=()=>null;});const fallback=await noCanvas.newPage();await fallback.goto(origin+'/museum/jurassic-park-sgi/');await fallback.waitForFunction(()=>document.documentElement.dataset.sgiReady==='true');await fallback.locator('#directory-list button').first().click();await fallback.locator('#open-item').click();assert.match(await fallback.locator('#pathbar').innerText(),/Airport.Flights/);await noCanvas.close();
 const noJS=await browser.newContext({javaScriptEnabled:false});const staticPage=await noJS.newPage();await staticPage.goto(origin+'/de/museum/jurassic-park-sgi/');assert.ok(await staticPage.locator('#field-notes').isVisible());assert.ok(await staticPage.locator('noscript').isVisible());await noJS.close();
 console.log('PASS: EN/DE 3D rendering, camera views, keyboard/list/search navigation, metadata, ordered recovery, module interlock, 3-denial Dennis sequence, magic word, shark and raptor eggs, language switching, 28 responsive mode checks, offline use, Canvas fallback, no-JS notes, zero page/network errors. QA: '+qa);
}finally{await browser.close();await new Promise(r=>server.close(r));}
