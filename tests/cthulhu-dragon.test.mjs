import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import test from 'node:test';
const root=resolve(import.meta.dirname,'..'),read=p=>readFileSync(resolve(root,p),'utf8');
const source=JSON.parse(read('content/cthulhu-dragon/source.json'));
const slug='nixos-xmonad-kanagawa-dragon';
const decode=s=>s.replace(/<span\b[^>]*>|<\/span>/g,'').replaceAll('&quot;','"').replaceAll('&gt;','>').replaceAll('&lt;','<').replaceAll('&amp;','&');
for(const lang of ['en','de']){
  const prefix=lang==='de'?'de/':'',route=prefix+'blog/'+slug+'/',html=read(route+'index.html');
  test(lang+': every full configuration matches its audited source',()=>{
    assert.equal((html.match(/data-source-file=/g)||[]).length,15);
    for(const [file,hash] of Object.entries(source.files)){
      const text=read('content/cthulhu-dragon/files/'+file);
      assert.equal(createHash('sha256').update(text).digest('hex'),hash);
      const figure=html.slice(html.indexOf('data-source-file="'+file+'"'));
      const code=figure.match(/<pre\b[^>]*><code\b[^>]*>([\s\S]*?)<\/code>/)[1];
      assert.equal(decode(code),text.trimEnd()+'\n',file);
      assert.ok(html.includes('https://raw.githubusercontent.com/dennishilk/cthulhu/main/'+source.directory+'/'+file));
    }
  });
  test(lang+': article SEO and reciprocal language routing',()=>{
    const data=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    const article=data['@graph'].find(x=>x['@type']==='BlogPosting');
    assert.equal(article.inLanguage,lang);assert.equal(article.datePublished,'2026-10-19');assert.ok(article.wordCount>3000);
    assert.equal((html.match(/<h1\b/g)||[]).length,1);
    for(const l of ['en','de'])assert.ok(html.includes('hreflang="'+l+'" href="https://www.dennishilk.com/'+(l==='de'?'de/':'')+'blog/'+slug+'/"'));
    assert.ok(html.includes('href="https://www.dennishilk.com/'+route+'"'));
    assert.ok(!article.articleSection.toLowerCase().includes('security'));
    assert.ok(html.includes(source.revision));
  });
  test(lang+': section, local-file and source links resolve',()=>{
    const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
    assert.equal(new Set(ids).size,ids.length);
    for(const [,href] of html.matchAll(/href="([^"?#]+(?:#[^"]+)?)"/g)){
      if(href.startsWith('http'))continue;
      if(href.startsWith('/')){
        const [path,fragment]=href.split('#');const file=path.endsWith('/')?path+'index.html':path;
        assert.ok(existsSync(resolve(root,'.'+file)),href);
        if(fragment)assert.ok(read(file.slice(1)).includes('id="'+fragment+'"'),href);
      }
    }
    for(const [,id] of html.matchAll(/href="#([^"]+)"/g))assert.ok(ids.includes(id),id);
    assert.ok(html.includes('width="2048" height="858"'));
  });
  test(lang+': tutorials, RSS and sitemap include the new guide once',()=>{
    const index=read(prefix+'blog/index.html');
    const section=index.match(/<section id="tutorials"[\s\S]*?<\/section>/)[0];
    assert.equal((section.match(/id="cthulhu-dragon"/g)||[]).length,1);
    assert.ok(!index.match(/<section id="linux-news"[\s\S]*?<\/section>/)[0].includes(slug));
    const feed=read(prefix+'blog/feed.xml');assert.equal((feed.match(new RegExp('<link>https://www.dennishilk.com/'+route,'g'))||[]).length,1);
    assert.ok(read('sitemap-blog.xml').includes('<loc>https://www.dennishilk.com/'+route+'</loc>'));
  });
}
test('no original artwork or inherited private paths are bundled with configs',()=>{
  assert.ok(!Object.keys(source.files).some(p=>p.endsWith('.png')||p.endsWith('cthulhu-born')));
  for(const p of Object.keys(source.files))assert.ok(!read('content/cthulhu-dragon/files/'+p).includes('/home/nebu'));
});
