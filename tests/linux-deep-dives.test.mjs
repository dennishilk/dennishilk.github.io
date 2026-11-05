import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const specs=JSON.parse(read('content/linux-news/articles.json')).filter(a=>a.published==='2026-11-05');
const enhance=read('assets/blog/linux-news/deep-dives.js');

for(const a of specs){
  const body=read(`content/linux-news/${a.topic}.${a.lang}.fragment`);
  const commands=[...body.matchAll(/<pre\b[^>]*><code>([\s\S]*?)<\/code><\/pre>/g)].map(m=>m[1]);
  test(`${a.topic}/${a.lang}: all code blocks can be focused and copied without changing command text`,()=>{
    assert.ok(commands.length);
    for(const pre of body.matchAll(/<pre\b[^>]*>/g)){
      assert.match(pre[0],/data-copy="[^"]+"/);assert.match(pre[0],/tabindex="0"/);
    }
    assert.doesNotMatch(commands.join('\n'),/&(?:amp|lt|gt);/);
  });
  if(a.topic==='apt-cve-2026-109518'){
    test(`${a.lang}: APT remediation retains documented retry mitigation and no automatic approval`,()=>{
      assert.deepEqual(commands.filter(c=>c.startsWith('sudo ')),[
        'sudo apt update',
        'sudo apt upgrade -o Acquire::Retries=0',
        "sudo apt install -o Acquire::Retries=0 --only-upgrade '?source-package(^apt$)'"
      ]);
      assert.ok(body.indexOf('id="local-check"')<body.indexOf('sudo apt upgrade'));
      for(const version of ['3.0.4','2.6.2','2.4.15ubuntu0.1','2.8.4ubuntu0.1','3.2.1ubuntu0.1','3.3.3ubuntu0.1'])assert.ok(body.includes(version));
    });
  }
  if(a.topic==='plasma-68-wayland')test(`${a.lang}: diagnostics do not alter session or force application backends`,()=>{
    assert.deepEqual(commands,['echo "$XDG_SESSION_TYPE"','echo "$WAYLAND_DISPLAY"','echo "$DISPLAY"','loginctl show-session "$XDG_SESSION_ID" -p Type']);
    assert.equal((body.match(/data-guide-panel=/g)||[]).length,5);
  });
  if(a.topic==='ai-linux-kernel-948')test(`${a.lang}: reported units and patch status vocabulary remain distinct`,()=>{
    const ledger=[...body.matchAll(/<dt>([^<]+)<\/dt>/g)].map(m=>m[1]);
    assert.deepEqual(ledger,a.lang==='de'?['5.034','2.308','1.724','1.169 → 948','291','21']:['5,034','2,308','1,724','1,169 → 948','291','21']);
    assert.ok(body.includes('id="not-948"'));
    const rows=[...body.matchAll(/<tr><th scope="row">([^<]+)<\/th>/g)].map(m=>m[1]);
    assert.equal(rows.length,11);
    assert.ok(rows.includes(a.lang==='de'?'An Maintainer gemeldet':'Reported to maintainers'));
    assert.ok(rows.includes(a.lang==='de'?'Staging-Patch':'Staging patch'));
    assert.ok(rows.includes(a.lang==='de'?'Öffentlich verfügbarer Exploit':'Publicly available exploit'));
  });
}

test('without JavaScript, guide panels and commands are retained in semantic HTML',()=>{
  for(const a of specs){
    const body=read(`content/linux-news/${a.topic}.${a.lang}.fragment`);
    for(const panel of body.matchAll(/<[^>]+data-guide-panel=[^>]*>/g))assert.doesNotMatch(panel[0],/\bhidden\b/);
    for(const button of body.matchAll(/<button\b[^>]*>/g))assert.match(button[0],/\bhidden\b/);
  }
});

test('reader helpers have no network, persistence or visitor-inspection code',()=>{
  assert.doesNotMatch(enhance,/\b(?:fetch|XMLHttpRequest|WebSocket|sendBeacon|localStorage|sessionStorage|indexedDB)\b/);
});
