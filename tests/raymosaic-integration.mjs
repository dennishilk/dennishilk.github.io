import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1250,height:820},acceptDownloads:true});
try{
 for(const route of ['/lab/raymosaic/','/de/lab/raymosaic/']){
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8000'+route,{waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('#customText').count(),1);
  assert.equal(await page.locator('html').getAttribute('lang'),route.startsWith('/de/')?'de':'en');
  await page.locator('#customText').fill('LUNA');
  await page.locator('#quickGif').click();
  await page.locator('#downloadGif').waitFor({state:'visible',timeout:120000});
  const size=await page.locator('#exportSize').textContent();
  assert.match(size,/30 frames/);
  await page.locator('#closeExport').click();
  await page.evaluate(()=>{window.__capturedURL='';Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.__capturedURL=text;}}});});
  await page.locator('#shareProject').click();
  await page.waitForFunction(()=>Boolean(window.__capturedURL),null,{timeout:15000});
  const url=await page.evaluate(()=>window.__capturedURL);
  assert.ok(url.length<2100);
  assert.ok(url.startsWith('http://127.0.0.1:8000'+route+'#p=v1.'),url.slice(0,80));
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('#customText')?.value==='LUNA',null,{timeout:20000});
  await page.locator('#shareRaymosaic').click();
  await page.locator('#publicCopy').click();
  const publicUrl=await page.evaluate(()=>window.__capturedURL);
  assert.equal(publicUrl,'https://www.dennishilk.com'+route,'public sharing omits private fragment');
  assert.equal(await page.locator('#mirrorDrawing').isChecked(),true);
  await page.locator('#closePublicShare').click();
  assert.deepEqual(errors,[]);
  console.log('PASS '+route+' GIF, DE/EN locale, JS module worker, personal link and privacy-safe public link: '+size);
  await page.close();
 }
}finally{await context.close();await browser.close();}
