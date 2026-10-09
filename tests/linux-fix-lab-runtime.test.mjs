import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { performance } from 'node:perf_hooks';
import { LIMITS, inspectLog, redactSensitive, diagnosticSummary, canonicalSolutionUrl, validateInstance, shareIntent, moveAssistant } from '../assets/linux-fix-lab/core.js';
import { catalog } from '../assets/linux-fix-lab/catalog.js';

test('independent simultaneous findings retain real line numbers and all matches',()=> {
  const storage=catalog.patterns.find(pattern=>pattern.problemId==='storage-sata-crc-errors');
  const gpu=catalog.patterns.find(pattern=>pattern.problemId==='amdgpu-ring-timeout');
  const data=inspectLog(`ordinary line\r\n${storage.sample}\r\n\r\n${gpu.sample}\r\n${storage.sample}`,catalog.patterns);
  assert.equal(data.lineCount,5);
  const s=data.findings.find(finding=>finding.patternId===storage.id),g=data.findings.find(finding=>finding.patternId===gpu.id);
  assert.equal(s.count,2);assert.deepEqual(s.lines.map(line=>line.number),[2,5]);assert.deepEqual(g.lines.map(line=>line.number),[4]);
  assert.notEqual(s.problemId,g.problemId);
});
test('normal operational text and broad failure words do not invent diagnoses',()=> {
  const input=['systemd[1]: Started Daily Cleanup.', 'NetworkManager: state change: disconnected -> activated', 'kernel: Linux version test', 'pipewire: device connected', 'failed timeout error denied', 'apt package installed successfully', 'kernel: amdgpu initialized successfully'].join('\n');
  assert.deepEqual(inspectLog(input,catalog.patterns).findings,[]);
});
test('empty, malformed, hostile and extremely long logs remain bounded text',()=> {
  assert.deepEqual(inspectLog('',catalog.patterns).findings,[]);
  assert.throws(()=>inspectLog({},catalog.patterns),TypeError);
  assert.throws(()=>inspectLog('x'.repeat(LIMITS.characters+1),catalog.patterns),/too-large/);
  assert.throws(()=>inspectLog('\n'.repeat(LIMITS.lines),catalog.patterns),/too-many-lines/);
  const pattern=catalog.patterns[0],payload=`${pattern.sample} <img src=x onerror=alert(1)><script>fetch('https://evil.invalid')</script>`;
  const result=inspectLog(payload,catalog.patterns);assert.ok(result.findings.some(finding=>finding.lines[0].text.includes('<script>')));
  const long=inspectLog('x'.repeat(LIMITS.lineLength+10000),catalog.patterns);assert.equal(long.shortened,1);
  const many=inspectLog(Array(40).fill(pattern.sample).join('\n'),catalog.patterns).findings.find(finding=>finding.patternId===pattern.id);
  assert.equal(many.count,40);assert.equal(many.lines.length,LIMITS.examples);
});
test('adversarial colon/bracket input completes in bounded processing without dynamic regexes',()=> {
  const started=performance.now();
  const result=inspectLog(Array(350).fill(`${':'.repeat(4090)}[[[[[[[[[[[[[[[`).join('\n'),catalog.patterns);
  assert.ok(result.shortened===350);assert.deepEqual(result.findings,[]);
  assert.ok(performance.now()-started<10000,'bounded corpus is processed within a generous CI budget');
  const source=readFileSync(new URL('../assets/linux-fix-lab/core.js',import.meta.url),'utf8');assert.doesNotMatch(source,/new RegExp|eval\(|Function\(/);
});
test('summaries omit raw excerpts by default and redaction is an explicit opt-in export option',()=> {
  const sample=catalog.patterns[0],secret='password=not-for-sharing user@example.org /home/dennis 10.1.1.1 aa:bb:cc:dd:ee:ff';
  const result=inspectLog(`${sample.sample} ${secret}`,catalog.patterns);
  const summary=diagnosticSummary(result,catalog,'en');assert.doesNotMatch(summary,/not-for-sharing|user@example|\/home\/dennis|10\.1\.1\.1/);
  const redacted=diagnosticSummary(result,catalog,'de',{includeLines:true,redact:true});assert.doesNotMatch(redacted,/not-for-sharing|user@example|\/home\/dennis|10\.1\.1\.1|aa:bb:cc:dd:ee:ff/);
  const raw=diagnosticSummary(result,catalog,'en',{includeLines:true,redact:false});assert.ok(raw.includes(secret));
  assert.doesNotMatch(redactSensitive('Bearer opaque.token Authorization:SECRET https://user:pass@host/path?token=x IPv6 fe80::abcd'),/opaque|SECRET|user:pass|fe80/);
});
test('public solution links accept only known route shapes and stable anchors',()=> {
  const url=canonicalSolutionUrl('/de/linux-fix-lab/test-problem/','check-cable');assert.equal(url,'https://www.dennishilk.com/de/linux-fix-lab/test-problem/#check-cable');
  for(const path of ['//evil.org/','/linux-fix-lab/a/?log=secret','/linux-fix-lab/../../private/','/blog/','javascript:alert(1)'])assert.throws(()=>canonicalSolutionUrl(path));
  for(const anchor of ['secret?log=x','<script>','../x'])assert.throws(()=>canonicalSolutionUrl('/linux-fix-lab/test/',anchor));
});
test('Mastodon instance validation rejects unsafe schemes, credentials and non-domain destinations',()=> {
  assert.equal(validateInstance('mastodon.social'),'https://mastodon.social');
  assert.equal(validateInstance('https://social.dennishilk.com/'),'https://social.dennishilk.com');
  for(const value of ['javascript:alert(1)','http://mastodon.social','https://user:pass@mastodon.social','https://mastodon.social:4433','https://mastodon.social/share','https://mastodon.social?token=1','https://mastodon.social#x','127.0.0.1','localhost','x.local','[::1]','https://good.org\\@evil.org','good.org\n.evil.org','-invalid.org'])assert.throws(()=>validateInstance(value),value);
});
test('editable social intents encode messages and transmit only the canonical solution URL',()=> {
  const url=canonicalSolutionUrl('/linux-fix-lab/test/','check-cable'),message='my words & emoji 🐧';
  const mastodon=new URL(shareIntent('mastodon',{url,message,instance:'social.dennishilk.com'}));
  assert.equal(mastodon.origin,'https://social.dennishilk.com');assert.equal(mastodon.pathname,'/share');assert.equal(mastodon.searchParams.get('text'),`${message}\n${url}`);
  const x=new URL(shareIntent('x',{url,message}));assert.equal(x.searchParams.get('url'),url);assert.equal(x.searchParams.get('text'),message);
  const facebook=new URL(shareIntent('facebook',{url,message}));assert.equal(facebook.searchParams.get('u'),url);
  for(const bad of [url+'?log=private','https://evil.org/linux-fix-lab/a/','https://www.dennishilk.com/private/'])assert.throws(()=>shareIntent('x',{url:bad,message}));
});
test('all assistant transitions are validated rather than accepting arbitrary targets',()=> {
  const trees=JSON.parse(readFileSync(new URL('../content/linux-fix-lab/assistants.json',import.meta.url),'utf8'));
  for(const tree of trees){for(const [id,node]of Object.entries(tree.nodes)){for(const [index,choice]of (node.choices||[]).entries())assert.equal(moveAssistant(tree,id,index),choice.next);}assert.throws(()=>moveAssistant(tree,tree.start,999));assert.throws(()=>moveAssistant(tree,'missing',0));}
});
test('log and sharing modules have no upload/analytics paths and use text-safe rendering',()=> {
  for(const file of ['app.js','inspector.js','inspector-worker.js','core.js']) {
    const source=readFileSync(new URL(`../assets/linux-fix-lab/${file}`,import.meta.url),'utf8');
    assert.doesNotMatch(source,/\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|\.innerHTML\s*=|insertAdjacentHTML|document\.write|\beval\s*\(/);
    if(file.startsWith('inspector'))assert.doesNotMatch(source,/localStorage|sessionStorage|searchParams\.set|history\.replaceState/,'logs cannot reach persistent storage or URLs');
  }
  const source=readFileSync(new URL('../assets/linux-fix-lab/app.js',import.meta.url),'utf8');
  assert.match(source,/noopener,noreferrer/);assert.match(source,/navigator\.share/);assert.match(source,/event\.key\s*[!=]==\s*'Tab'/);assert.match(source,/event\.key === 'Escape'/);
});
