// Social preview: real exhibit rendered in Chromium, compacted to 1200 × 630.
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const {chromium}=await import(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright/index.mjs');
const server=createServer(async(req,res)=>{try{let p=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!p.startsWith(root))throw Error('path');if((await stat(p)).isDirectory())p+='/index.html';res.setHeader('Content-Type',({'.html':'text/html','.mjs':'text/javascript','.css':'text/css','.woff2':'font/woff2','.webp':'image/webp','.png':'image/png'})[extname(p)]||'application/octet-stream');res.end(await readFile(p));}catch{res.statusCode=404;res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 browser=await chromium.launch({executablePath:process.env.SGI_BROWSER||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1200,height:630},deviceScaleFactor:1});await page.goto('http://127.0.0.1:'+server.address().port+'/museum/jurassic-park-sgi/');await page.waitForFunction(()=>document.documentElement.dataset.sgiReady==='true');await page.evaluate(()=>document.fonts.ready);
 await page.addStyleTag({content:'.exhibit{padding:0 30px}.topnav{min-height:47px}.hero{padding:9px 0}.hero h1{font-size:32px;margin:0}.hero .eyebrow{display:none}.intro,.hero-copy,.hero-mark,.mode-bar>span,.explorer-lower,.help,.desk-hardware,.monitor-foot,.field-notes,footer{display:none}.mode-bar{margin-bottom:13px}.mode-bar button{padding:9px 22px}.case-top{padding:10px 30px 6px}.desktop{min-height:0;padding-bottom:7px}.desktop-top{margin-bottom:8px}.desktop-dock{display:none}#landscape{height:180px}.navigator{display:block}.navigator-tools{display:none}.navigator-tools{gap:4px}.navigator-tools button{padding:4px}.navigator-tools label{margin-top:2px}.scale-note{margin-top:5px;font-size:8px}.navigator-tools input[type=range]{height:15px}.window-status{padding:3px 10px}.monitor-chin{padding:8px 40px 1px}.sgi-label{font-size:18px}.cube-symbol{font-size:23px}.monitor{padding-bottom:9px}.bezel{padding:8px}'});
 await page.locator('[data-view=overview]').evaluate(b=>b.click());await page.waitForTimeout(100);
 await page.screenshot({path:resolve(root,'assets/jurassic-park-sgi/preview.png')});
 console.log('Rendered 1200 × 630 SGI social preview.');
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
