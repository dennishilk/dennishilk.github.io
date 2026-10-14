// Original acceptance files, not replacements. Test-only bounded alphabet for
// the five-character PDF search keeps CI finite; real coordinator, candidateAt,
// CPU Workers, independent verification and UI downloads remain in use.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdtempSync,statSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright/index.mjs');
const root=resolve('.'),fixtures=resolve(root,'tests/fixtures/archive-recovery');
const zstdExpected=JSON.parse(readFileSync(resolve(fixtures,'expected-zstd.json'),'utf8'));
const dir=mkdtempSync(resolve(tmpdir(),'archive-real-browser-'));
const serverRequests=[];
const mime={'.js':'text/javascript','.mjs':'text/javascript','.html':'text/html','.css':'text/css','.wasm':'application/wasm'};
const server=createServer((req,res)=>{
 serverRequests.push({url:req.url,method:req.method});
 try{
  assert.equal(req.method,'GET');
  let file=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
  assert.ok(file.startsWith(root+'/'));
  if(statSync(file).isDirectory())file+='/index.html';
  res.setHeader('Content-Type',mime[extname(file)]||'application/octet-stream');
  res.setHeader('Cache-Control','public, max-age=3600');
  res.end(readFileSync(file));
 }catch{res.statusCode=404;res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,executablePath:process.env.ARCHIVE_RECOVERY_BROWSER||'/usr/bin/google-chrome',args:['--no-sandbox']});
const context=await browser.newContext({acceptDownloads:true});
const page=await context.newPage(),errors=[],requests=[],logs=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{logs.push(m.text());if(m.type()==='error')errors.push(m.text());});
context.on('request',r=>requests.push({url:r.url(),method:r.method(),body:r.postData()}));
const ready=()=>page.waitForFunction(()=>window.archiveRecoveryReady);
const supported=()=>page.waitForFunction(()=>!document.getElementById('start').disabled,null,{timeout:45000});
const found=()=>page.waitForFunction(()=>!document.getElementById('result').hidden,null,{timeout:180000});
const input=name=>page.locator('#file').setInputFiles(resolve(fixtures,name));
async function known(){
 for(const id of ['de','en','common'])await page.locator('#'+id).uncheck();
 await page.locator('#brute').check();await page.locator('#mode').selectOption('known');
 await page.locator('#min').fill('1');await page.locator('#max').fill('1');
 for(const id of ['lower','upper','symbols'])await page.locator('#'+id).uncheck();
 await page.locator('#digits').check();await page.locator('#workers').selectOption('1');
}
async function downloadZstd(label){
 assert.equal(await page.locator('#recovered').inputValue(),'secret');
 assert.equal(await page.locator('#checked').innerText(),'677');
 assert.equal(await page.locator('#downloads button').count(),3);
 assert.match(await page.locator('#result-format').innerText(),/ZSTD/);
 for(const button of await page.locator('#downloads button').all()){
  const name=await button.locator('.download-name').textContent();
  const pending=page.waitForEvent('download');await button.click();
  const download=await pending,bytes=readFileSync(await download.path());
  assert.equal(download.suggestedFilename(),name.split('/').at(-1));
  assert.equal(bytes.length,zstdExpected[name].size);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),zstdExpected[name].sha256);
 }
 const pending=page.waitForEvent('download');await page.locator('#allzip').click();
 const download=await pending,path=resolve(dir,label+'.zip');await download.saveAs(path);
 execFileSync('python3',['-c',[
  'from zipfile import ZipFile','import hashlib,json,sys',
  'expected=json.loads(sys.stdin.read())','z=ZipFile('+JSON.stringify(path)+')',
  'assert z.testzip() is None;assert set(z.namelist())==set(expected)',
  'assert all(not i.flag_bits&1 for i in z.infolist())',
  'for name,e in expected.items():',
  ' b=z.read(name);assert len(b)==e["size"];assert hashlib.sha256(b).hexdigest()==e["sha256"]'
 ].join('\n')],{input:JSON.stringify(zstdExpected)});
}
async function downloadPdf(label){
 assert.equal(await page.locator('#recovered').inputValue(),'test9');
 assert.equal(await page.locator('#checked').innerText(),'100');
 assert.equal(await page.locator('#allzip').isVisible(),false);
 const pending=page.waitForEvent('download');await page.locator('#downloads button').first().click();
 const download=await pending,path=resolve(dir,label+'.pdf');await download.saveAs(path);
 execFileSync('python3',['-c',[
  'from pypdf import PdfReader','import fitz',
  'p='+JSON.stringify(path),
  'r=PdfReader(p);assert not r.is_encrypted;assert len(r.pages)==1',
  "assert 'ARCHIVE RECOVERY LAB' in r.pages[0].extract_text()",
  'd=fitz.open(p);assert not d.needs_pass;assert len(d)==1',
  "assert 'PDF-Passwort' in d[0].get_text()",
  'd[0].get_pixmap().save('+JSON.stringify(resolve(dir,label+'.png'))+')'].join('\n')]);
}
try{
 console.log('BROWSER',await browser.version());
 for(const language of ['en','de']){
  await page.goto(origin+(language==='de'?'/de':'')+'/museum/archive-recovery-lab/');await ready();
  assert.equal(await page.locator('#file').isDisabled(),true);
  await page.locator('#authorized').check();
  await input('test-7z-secret.7z');await supported();
  assert.match(await page.locator('#file-status').innerText(),/AES-256.*ZSTD/);
  const checks=await page.evaluate(async()=>{
   const {createFormatBackend}=await import('/assets/archive-recovery-lab/format-backend.js?v=20261014-48-drain1');
   const b=await createFormatBackend(document.querySelector('#file').files[0],'7Z');
   return {wrong:await b.check('wrong'),good:await b.check('secret')};
  });
  assert.deepEqual(checks,{wrong:false,good:true});
  for(const id of ['de','en'])await page.locator('#'+id).uncheck();
  await page.locator('#common').check();await page.locator('#brute').uncheck();
  await page.locator('#workers').selectOption('1');
  await page.locator('#start').click();
  await page.waitForFunction(()=>Number(document.getElementById('checked').textContent.replace(/[^0-9]/g,''))>=4);
  await page.locator('#pause').click();await page.waitForFunction(()=>document.body.dataset.pauseDraining==='false');
  const pausedChecks=await page.locator('#checked').innerText();await page.waitForTimeout(300);
  assert.equal(await page.locator('#checked').innerText(),pausedChecks);
  assert.match(await page.locator('#status').innerText(),/PAUSED|PAUSIERT/);
  await page.locator('#resume').click();await found();await downloadZstd(language+'-original-zstd');
  console.log(language,'ORIGINAL_ZSTD_FULL_UI_677_REAL_DICTIONARY_CHECKS_VALID_DOWNLOADS');
  await context.setOffline(true);const zstdNetworkBefore=serverRequests.length;
  await input('test-7z-secret.7z');await supported();
  await page.locator('#start').click();await found();await downloadZstd(language+'-offline-zstd');
  assert.equal(serverRequests.length,zstdNetworkBefore);await context.setOffline(false);
  console.log(language,'ORIGINAL_ZSTD_FULL_SEARCH_OFFLINE_ZERO_SERVER_REQUESTS');
  await input('test-pdf-aes256-test9.pdf');await supported();
  // Genuine negative and positive opening-password checks against original R6.
  const direct=await page.evaluate(async()=>{
   const {createFormatBackend}=await import('/assets/archive-recovery-lab/format-backend.js?v=20261014-48-drain1');
   const b=await createFormatBackend(document.querySelector('#file').files[0],'PDF');
   return {revision:b.info.revision,bad:await b.check('wrong'),good:await b.check('test9')};
  });
  assert.deepEqual(direct,{revision:6,bad:false,good:true});
  await known();
  await page.evaluate(async()=>{
   const {SearchRun}=await import('/assets/archive-recovery-lab/search.js?v=20261014-48-drain1');
   const start=SearchRun.prototype.start;
   SearchRun.prototype.start=function(){
    if(this.format==='PDF'){
     this.phases=[{kind:'brute',charset:'tes9',length:5,count:1024n,offset:0n}];
     this.phaseDone=[0n];this.total=1024n;
    }
    return start.call(this);
   };
  });
  await page.locator('#start').click();await found();await downloadPdf(language+'-original-pdf');
  assert.match(await page.locator('#result-format').innerText(),/PDF Standard Security R6/);
  console.log(language,'ORIGINAL_PDF_FULL_UI_100_REAL_CHECKS_AND_VALID_DOWNLOAD');
  // Fresh inspection and fresh search/verification Workers under actual offline
  // mode. Cached static resources only; the test server receives no requests.
  await context.setOffline(true);const networkBefore=serverRequests.length;
  await input('test-7z-secret.7z');
  await supported();
  await input('test-pdf-aes256-test9.pdf');await supported();
  await page.locator('#start').click();await found();await downloadPdf(language+'-offline-original-pdf');
  assert.equal(serverRequests.length,networkBefore);
  await context.setOffline(false);
  console.log(language,'ORIGINAL_FILES_OFFLINE_NO_SERVER_REQUESTS');
  for(const name of ['data-only-lzma2.7z','data-only-copy.7z']){
   await input(name);await supported();await page.locator('#start').click();await found();
   assert.equal(await page.locator('#recovered').inputValue(),'7');
   assert.equal(await page.locator('#checked').innerText(),'8');
   const pending=page.waitForEvent('download');await page.locator('#allzip').click();
   const download=await pending,path=resolve(dir,language+'-'+name+'.zip');await download.saveAs(path);
   execFileSync('python3',['-c',[
    'from zipfile import ZipFile','z=ZipFile('+JSON.stringify(path)+')',
    'assert z.testzip() is None',"assert z.namelist()==['folder/sample.txt']",
    "assert z.read('folder/sample.txt').decode()=='Independent data-only encrypted 7Z fixture — Grüße!\\n'"].join('\n')]);
   const one=page.waitForEvent('download');await page.locator('#downloads button').first().click();
   assert.equal(readFileSync(await (await one).path(),'utf8'),'Independent data-only encrypted 7Z fixture — Grüße!\n');
  }
  console.log(language,'READABLE_HEADER_LZMA2_AND_COPY_FULL_UI_REAL_DOWNLOADS');
  await page.locator('#reset').click();
  assert.equal(await page.locator('#authorized').isChecked(),false);
  assert.equal(await page.locator('#file').isDisabled(),true);
  assert.equal(await page.evaluate(()=>localStorage.length+sessionStorage.length),0);
 }
 assert.deepEqual(errors,[]);
 assert.ok(requests.every(r=>r.method==='GET'&&!r.body&&new URL(r.url).origin===origin));
 for(const secret of ['test9','secret','test-pdf-aes256','test-7z-secret']){
  assert.ok(requests.every(r=>!r.url.includes(secret)));
  assert.ok(logs.every(log=>!log.includes(secret)));
 }
 // Controlled engine failures prove that initialization/structure failures do
 // not become unsupported-format or corrupt-file claims. Injected exceptions
 // contain private markers which must never reach diagnostics or page text.
 for(const [code,source] of [
  ['wasm-init',"export default async()=>{throw Error('PRIVATE filename password content')}"] ,
  ['wasm-memory',"export default async()=>({FS:{writeFile(){throw new WebAssembly.RuntimeError('memory access out of bounds PRIVATE')}}})"],
  ['pdf-structure',"export default async o=>({FS:{writeFile(){}},callMain(args){o.print(args.includes('--show-encryption')?'R = 6':'parser rejected PRIVATE');return 2}})"]
 ]){
  const fault=await browser.newContext();
  await fault.route('**/vendor/qpdf.mjs*',r=>r.fulfill({status:200,contentType:'text/javascript',body:source}));
  const p=await fault.newPage();await p.goto(origin+'/museum/archive-recovery-lab/');
  await p.waitForFunction(()=>window.archiveRecoveryReady);await p.locator('#authorized').check();
  await p.locator('#file').setInputFiles(resolve(fixtures,'test-pdf-aes256-test9.pdf'));
  await p.waitForFunction(()=>document.getElementById('status').textContent==='LOCAL ENGINE ERROR');
  const diagnostic=JSON.parse(await p.locator('#gpu-diagnostics').textContent()).formatDiagnostic;
  assert.equal(diagnostic.code,code);
  assert.ok(!(await p.locator('body').textContent()).includes('PRIVATE'));
  assert.equal(await p.locator('#start').isDisabled(),true);
  await fault.close();
 }
 console.log('SAFE_ENGINE_DIAGNOSTICS_SUCCESS');
 console.log('REAL_FILES_BROWSER_SUCCESS',requests.length,'same-origin GET-only requests; no uploads, no persistent storage');
 console.log('QA_OUTPUT',dir);
}finally{await context.close();await browser.close();await new Promise(r=>server.close(r));}
