import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const root=new URL('../',import.meta.url),origin='https://www.dennishilk.com';
const read=p=>readFileSync(new URL(p,root),'utf8');
const specs=JSON.parse(read('content/linux-news/articles.json'));
const data=html=>JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
const attrs=tag=>Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map(([,k,v])=>[k,v]));

for(const a of specs){
  const prefix=a.lang==='de'?'de/':'',path=prefix+'blog/'+a.slug+'/index.html',url=origin+'/'+prefix+'blog/'+a.slug+'/';
  test(a.lang+': publication metadata, reciprocal routes and distribution agree',()=>{
    const html=read(path),article=data(html)['@graph'].find(n=>n['@type']==='BlogPosting');
    assert.equal((html.match(/<h1\b/g)||[]).length,1);
    assert.equal(article.url,url);assert.equal(article.inLanguage,a.lang);
    assert.equal(article.datePublished,a.published);assert.equal(article.dateModified,a.modified);
    assert.ok(article.wordCount>=(a.topic==='worldnode-nginx'?1200:1400));assert.equal(article.articleSection,a.category);
    for(const [key,value] of [['canonical',url],['description',a.description]]){
      const tags=[...html.matchAll(/<(?:link|meta)\b[^>]*>/g)].map(m=>attrs(m[0]));
      const found=tags.filter(t=>t.rel===key||t.name===key);assert.equal(found.length,1,key);assert.equal(found[0].href||found[0].content,value.replaceAll('&','&amp;'));
    }
    const pair=specs.find(b=>b.lang!==a.lang&&b.topic===a.topic),alternate=origin+'/'+(pair.lang==='de'?'de/':'')+'blog/'+pair.slug+'/';
    assert.ok(html.includes(`hreflang="${pair.lang}" href="${alternate}"`));
    assert.ok(html.includes('class="language-link" href="'+alternate.slice(origin.length)+'"'));
    assert.equal((html.match(/hreflang="x-default"/g)||[]).length,1);
    const feed=read(prefix+'blog/feed.xml');assert.equal(feed.split('<link>'+url+'</link>').length-1,1);
    const sitemapEntry=read('sitemap-blog.xml').match(/<url>[\s\S]*?<\/url>/g).find(s=>s.includes('<loc>'+url+'</loc>'));
    assert.ok(sitemapEntry);assert.ok(sitemapEntry.includes('<lastmod>'+a.modified+'</lastmod>'));
    for(const lang of ['en','de','x-default'])assert.ok(sitemapEntry.includes('hreflang="'+lang+'"'));
  });
  test(a.lang+': all local links, assets, fragments and accessible figures resolve',()=>{
    const html=read(path),ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
    assert.equal(new Set(ids).size,ids.length,'duplicate ID');
    for(const tag of [...html.matchAll(/<(?:a|img|source|link|script)\b[^>]*>/g)].map(m=>attrs(m[0]))){
      const href=tag.href||tag.src||tag.srcset;if(!href)continue;
      const link=new URL(href,url);if(link.origin!==origin)continue;
      const file=link.pathname.endsWith('/')?link.pathname+'index.html':link.pathname;
      assert.ok(existsSync(new URL(file.slice(1),root)),link.href);
      if(link.hash){const content=link.pathname===new URL(url).pathname?html:read(file.slice(1));assert.ok(content.includes('id="'+link.hash.slice(1)+'"'),link.href);}
    }
    const img=attrs(html.match(/<img\b[^>]*>/)[0]);assert.ok(img.alt.length>50);assert.ok(Number(img.width)>0&&Number(img.height)>0);
    if(a.heroMobileImage){
      const source=attrs(html.match(/<source media="\(max-width:650px\)"[^>]*>/)[0]);
      assert.equal(source.srcset,a.heroMobileImage);
    }else assert.match(html,/<source media="\(max-width:650px\)"[^>]*-mobile\.svg/);
    assert.ok(html.includes('<figcaption>'));
    const social=readFileSync(new URL(a.socialImage?.slice(1)||'assets/blog/linux-news/'+a.topic+'-social-'+a.lang+'.png',root));
    assert.equal(social.subarray(1,4).toString(),'PNG');assert.equal(social.readUInt32BE(16),1200);assert.equal(social.readUInt32BE(20),630);
  });
  test(a.lang+': copyable commands are diagnostic and repair prerequisites precede recovery',()=>{
    const body=read('content/linux-news/'+a.topic+'.'+a.lang+'.fragment');
    const commands=[...body.matchAll(/<pre\b[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/g)].map(m=>m[1].trim());
    if(a.topic==='linux-audio-rescue'){
      assert.ok(commands.length>=20);
      assert.ok(body.includes('session.suspend-timeout-seconds = 0'));
      assert.ok(body.includes('51-audio-rescue-spdif.conf.disabled'));
      return;
    }
    if(a.topic==='worldnode-nginx'){
      assert.equal(commands.length,6);
      for(const cmd of commands)assert.match(cmd,/^(?:apt-cache policy nginx|dpkg-query -W |systemctl status nginx |sudo zgrep )/);
      for(const cve of ['15176','93479','95101','97205','97629'])assert.ok(body.includes('CVE-2026-'+cve));
      assert.ok(body.includes('DSA-6575-1'));assert.ok(body.includes('1.26.3-3+deb13u10'));
      assert.ok(body.includes('/usr/bin/unattended-upgrade'));assert.ok(body.includes('2026-10-22T06:51:26+02:00'));
      assert.equal((body.match(/<figure class="wn-shot">/g)||[]).length,4);
      const html=read(path);
      assert.ok(html.includes('href="'+a.primarySourceUrl+'"'));
      assert.ok(html.includes('content="'+a.socialAlt+'"'));
      assert.ok(!html.includes('bugs.launchpad.net/bugs/2169738'));
      return;
    }
    assert.equal(commands.length,8);
    for(const cmd of commands)assert.match(cmd,/^(?:cat \/etc\/os-release|dpkg -l 'openssh-\*'|apt-cache policy openssh-server |dpkg-query --control-show openssh-server postrm|apt-get -s --reinstall install openssh-server-gssapi|sudo \/usr\/sbin\/sshd -t|systemctl status ssh\.service ssh\.socket |sudo journalctl -u ssh\.service -u ssh\.socket )/);
    const repair=body.indexOf('apt-get -s --reinstall');assert.ok(body.indexOf('class="news-callout"',body.indexOf('<h2 id="'+(a.lang==='de'?'wiederherstellen':'recovery')+'"'))<repair);
    assert.match(body,/USN-8928-1/);assert.match(body,/26\.04 LTS/);assert.match(body,/24\.04 LTS/);assert.match(body,/22\.04 LTS/);
    assert.ok(body.includes('datetime="'+a.checked+'"'));
  });
}

test('category navigation, visible totals, cards and RSS-source lists remain consistent',()=>{
  for(const prefix of ['','de/']){
    const html=read(prefix+'blog/index.html'),schema=data(html),list=schema['@graph'].find(n=>n['@type']==='ItemList');
    const cards=[...html.matchAll(/<a class="card-link" href="([^"]+)"/g)].map(m=>origin+m[1]);
    assert.equal(new Set(cards).size,cards.length);
    assert.equal(cards.length,list.numberOfItems);assert.equal(list.itemListElement.length,cards.length);
    assert.deepEqual(new Set(cards),new Set(list.itemListElement.map(n=>n.url)));
    assert.equal(Number(html.match(/<p class="blog-count">(\d+)/)[1]),cards.length);
    assert.equal((html.match(/<section id="linux-news"/g)||[]).length,1);
    assert.equal((html.match(/<section id="networks"/g)||[]).length,1);
    const section=html.match(/<section id="linux-news"[\s\S]*?<\/section>/)[0];
    const count=(section.match(/class="guide-card"/g)||[]).length;
    assert.equal(Number(section.match(/<span>(\d+)<\/span>/)[1]),count);
    assert.equal(Number(html.match(/href="#linux-news">[\s\S]*?<span>(\d+)<\/span>/)[1]),count);
    const entry=read('sitemap-blog.xml').match(/<url>[\s\S]*?<\/url>/g).find(s=>s.includes('<loc>'+origin+'/'+prefix+'blog/</loc>'));
    assert.ok(entry.includes('<lastmod>'+schema['@graph'].find(n=>n['@type']==='Blog').dateModified+'</lastmod>'));
  }
});

test('rebuild is deterministic and does not remove existing articles or change other sections',()=>{
  const paths=[...specs.map(a=>(a.lang==='de'?'de/':'')+'blog/'+a.slug+'/index.html'),'blog/index.html','de/blog/index.html','sitemap-blog.xml'];
  const before=paths.map(read);
  execFileSync(process.execPath,['scripts/build-linux-news.mjs'],{cwd:root});
  const hash=s=>createHash('sha256').update(s).digest('hex');
  paths.forEach((path,i)=>assert.equal(hash(read(path)),hash(before[i]),'rebuild changed '+path));
});
