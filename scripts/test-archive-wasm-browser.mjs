import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {resolve,extname} from 'node:path';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const root=resolve('.'),dir=mkdtempSync(resolve(tmpdir(),'archive-browser-'));
writeFileSync(resolve(dir,'sample.txt'),'Encrypted archive test - Grüße\n');
execFileSync('7z',['a','-t7z','-mhe=on','-p7','-y',resolve(dir,'encrypted.7z'),resolve(dir,'sample.txt')],{stdio:'pipe'});
execFileSync('python3',['-c',["from pypdf import PdfWriter","from pathlib import Path","p=Path("+JSON.stringify(dir)+")",
 "for algo in ['RC4-40','RC4-128','AES-128','AES-256']:",
 " w=PdfWriter();w.add_blank_page(width=300,height=300)",
 " w.encrypt(user_password='7',owner_password='owner-other',algorithm=algo)",
 " with open(p/('encrypted-'+algo+'.pdf'),'wb') as f:w.write(f)",
 "owner=PdfWriter();owner.add_blank_page(width=300,height=300)",
 "owner.encrypt(user_password='',owner_password='7',algorithm='AES-256')",
 "with open(p/'owner-only.pdf','wb') as f:owner.write(f)"].join('\n')]);
const server=createServer((req,res)=>{
 try{
  const pathname=new URL(req.url,'http://localhost').pathname;
  let file=resolve(root,'.'+pathname);
  if(!file.startsWith(root+'/'))throw Error('path');
  if(pathname.endsWith('/'))file+='/index.html';
  const data=readFileSync(file);
  res.setHeader('Content-Type',({'.js':'text/javascript','.mjs':'text/javascript','.html':'text/html','.css':'text/css','.wasm':'application/wasm','.woff2':'font/woff2','.png':'image/png'})[extname(file)]||'application/octet-stream');
  res.end(data);
 }catch{res.statusCode=404;res.end('404');}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
const ctx=await browser.newContext({acceptDownloads:true});
const page=await ctx.newPage(),errors=[],requests=[];
page.on('pageerror',e=>errors.push(e.message));
ctx.on('request',r=>requests.push({url:r.url(),method:r.method(),body:r.postData()}));
await ctx.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
try{
 await page.goto(origin+'/museum/archive-recovery-lab/');
 await page.waitForFunction(()=>window.archiveRecoveryReady);
 const cases=[
  ['RAR4',resolve(process.env.RUNNER_TEMP,'archive-wasm-test','test-v4.rar'),'junrar'],
  ['RAR5',resolve(process.env.RUNNER_TEMP,'archive-wasm-test','test-v5.rar'),'junrar'],
  ['7Z',resolve(dir,'encrypted.7z'),'7'],
  ...['RC4-40','RC4-128','AES-128','AES-256'].map(x=>['PDF-'+x,resolve(dir,'encrypted-'+x+'.pdf'),'7'])
 ];
 for(const [label,file,password] of cases){
  await page.locator('#file').setInputFiles(file);
  const output=await page.evaluate(async (pw)=>{
   const blob=document.querySelector('#file').files[0];
   const {recognize}=await import('/assets/archive-recovery-lab/core.js');
   const type=await recognize(blob);
   const {createFormatBackend}=await import('/assets/archive-recovery-lab/format-backend.js');
   try{
    const backend=await createFormatBackend(blob,type);
    const bad=await backend.check('wrong'),good=await backend.check(pw);
    if(bad||!good)throw Error('incorrect password verification');
    const {files}=await backend.recover(pw);
    return {format:type,info:backend.info,files:await Promise.all(files.map(async f=>({name:f.name,bytes:[...new Uint8Array(await f.blob.arrayBuffer())]})))};
   }catch(e){
    let diagnostic=null;
    if(type==='PDF'){
     const {default:QPDF}=await import('/assets/archive-recovery-lab/vendor/qpdf.mjs');
     const output=[];const mod=await QPDF({noInitialRun:true,print:x=>output.push(x),printErr:x=>output.push(x)});
     mod.FS.writeFile('/debug.pdf',new Uint8Array(await blob.arrayBuffer()));
     const runs=[];
     for(const args of [['--show-encryption','/debug.pdf'],['--password=7','--show-encryption','/debug.pdf'],['--password=7','--check','/debug.pdf']]){
      output.length=0;let code;try{code=mod.callMain(args);}catch(err){code=String(err);}
      runs.push({args,code,text:output.join('\n').slice(0,1400)});
     }
     diagnostic=runs;
    }
    return {format:type,error:e.code??e.message,stack:e.stack?.slice(0,400),diagnostic};
   }
  },password);
  console.log(JSON.stringify({label,format:output.format,error:output.error,diagnostic:output.diagnostic,info:output.info,files:output.files?.map(f=>[f.name,f.bytes.length])}));
  assert.ok(!output.error,label+': '+output.error+' '+output.stack);
  assert.ok(output.files?.length>=1,label+' requires decrypted files');
  if(output.format==='PDF'){
   const path=resolve(dir,'decrypted-'+label+'.pdf');
   writeFileSync(path,Buffer.from(output.files[0].bytes));
   execFileSync('python3',['-c',[
    'from pypdf import PdfReader',
    'r=PdfReader('+JSON.stringify(path)+')',
    'assert not r.is_encrypted',
    'assert len(r.pages)==1'].join('\n')]);
  }
 }
 // Owner restrictions without an opening-password lock must NOT be
 // advertised as a crackable user-password PDF.
 await page.locator('#file').setInputFiles(resolve(dir,'owner-only.pdf'));
 const ownerResult=await page.evaluate(async()=>{
  const blob=document.querySelector('#file').files[0];
  const {createFormatBackend}=await import('/assets/archive-recovery-lab/format-backend.js');
  try{const backend=await createFormatBackend(blob,'PDF');return {supported:backend.info.supported};}
  catch(e){return {code:e.code??e.message};}
 });
 assert.equal(ownerResult.code,'owner-only');
 console.log('PDF_PERMISSIONS_ONLY_REJECTED');

 // Exercise the actual shared SearchRun coordinator, result presentation,
 // individual download and reconstructed ordinary ZIP in a real browser.
 await page.locator('#reset').click();
 await page.locator('#file').setInputFiles(resolve(dir,'encrypted.7z'));
 await page.waitForFunction(()=>!document.getElementById('start').disabled,{},{timeout:45000});
 for(const id of ['de','en','common'])await page.locator('#'+id).uncheck();
 await page.locator('#brute').check();
 await page.locator('#mode').selectOption('known');
 await page.locator('#min').fill('1');
 await page.locator('#max').fill('1');
 for(const id of ['lower','upper','symbols'])await page.locator('#'+id).uncheck();
 await page.locator('#digits').check();
 await page.locator('#workers').selectOption('1');
 await page.locator('#start').click();
 await page.waitForFunction(()=>!document.getElementById('result').hidden,{},{timeout:90000});
 assert.equal(await page.locator('#recovered').inputValue(),'7');
 assert.match(await page.locator('#result-format').innerText(),/7Z/);
 assert.equal(await page.locator('#allzip').isVisible(),true);
 const zipDownload=page.waitForEvent('download');
 await page.locator('#allzip').click();
 const zip=await zipDownload;const zipPath=resolve(dir,'verified-from-browser.zip');
 await zip.saveAs(zipPath);
 execFileSync('python3',['-c',[
  'from zipfile import ZipFile',
  'with ZipFile('+JSON.stringify(zipPath)+') as z:',
  " assert z.testzip() is None",
  " assert b'Encrypted archive test' in z.read('sample.txt')"].join('\n')]);
 const individual=page.waitForEvent('download');
 await page.locator('#downloads button').first().click();
 const fileDownload=await individual;
 const filePath=resolve(dir,'browser-sample.txt');
 await fileDownload.saveAs(filePath);
 assert.match(readFileSync(filePath,'utf8'),/Encrypted archive test/);
 console.log('FULL_7Z_UI_RECOVERY_AND_DOWNLOAD_SUCCESS');
 // PDF must use the exact same shared search dashboard and export an actual
 // password-free PDF, not a ZIP, verified independently after downloading.
 await page.locator('#reset').click();
 await page.locator('#file').setInputFiles(resolve(dir,'encrypted-AES-256.pdf'));
 await page.waitForFunction(()=>!document.getElementById('start').disabled,{},{timeout:45000});
 await page.locator('#start').click();
 await page.waitForFunction(()=>!document.getElementById('result').hidden,{},{timeout:90000});
 assert.equal(await page.locator('#recovered').inputValue(),'7');
 assert.match(await page.locator('#result-format').innerText(),/PDF Standard Security R6/);
 assert.equal(await page.locator('#allzip').isVisible(),false);
 const pdfDownload=page.waitForEvent('download');
 await page.locator('#downloads button').first().click();
 const exported=await pdfDownload;
 const out=resolve(dir,'browser-ui-decrypted.pdf');
 await exported.saveAs(out);
 execFileSync('python3',['-c',[
  'from pypdf import PdfReader',
  'r=PdfReader('+JSON.stringify(out)+')',
  'assert not r.is_encrypted',
  'assert len(r.pages)==1'].join('\n')]);
 console.log('FULL_PDF_UI_RECOVERY_AND_DOWNLOAD_SUCCESS');

 // Verify that the bilingual route also initializes the same modules and
 // keeps the existing compact museum-like layout without star animations.
 await page.goto(origin+'/de/museum/archive-recovery-lab/');
 await page.waitForFunction(()=>window.archiveRecoveryReady);
 assert.equal(await page.locator('canvas').count(),0);
 await page.locator('#file').setInputFiles(resolve(dir,'encrypted.7z'));
 await page.waitForFunction(()=>!document.getElementById('start').disabled,{},{timeout:45000});
 assert.match(await page.locator('#file-status').innerText(),/7Z/);
 console.log('GERMAN_MULTI_FORMAT_UI_READY');

 assert.deepEqual(errors,[]);
 assert.ok(requests.every(r=>r.method==='GET'&&new URL(r.url).origin===origin&&!r.body));
 console.log('REAL_BROWSER_WASM_SUCCESS',requests.length,'same-origin GET requests');
}finally{await browser.close();await new Promise(r=>server.close(r));}
