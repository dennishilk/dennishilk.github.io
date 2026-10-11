const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync,existsSync}=require('node:fs');
const path=require('node:path');
const api=require('../assets/blog/nebucoin/lab.js');
const root=path.resolve(__dirname,'..');
async function mine(s,difficulty=1){
 const b={height:s.chain.length+1,previous:s.chain.at(-1)?.hash||'0'.repeat(64),difficulty,nonce:0,payout:s.pending,data:s.pending?'DEMO payout 4.75':'DEMO reward'};
 for(let n=0;n<12000;n++){b.nonce=n;b.hash=await api.hash(b);if(b.hash.startsWith('0'.repeat(difficulty))){api.acceptBlock(s,b);return b;}}
 throw Error('test fixture exhausted');
}
test('shares and invalid work do not mint coins; payouts require mature blocks and later inclusion',async()=>{
 const s=api.createState();for(let i=0;i<100;i++)api.share(s);api.share(s,false);
 assert.equal(s.pool,0);assert.equal(s.ledger,0);assert.equal(s.rewards.length,0);assert.equal(api.payout(s),false);
 const first=await mine(s);assert.equal(s.pool,0);assert.equal(s.rewards.length,1);assert.equal(api.payout(s),false);
 const second=await mine(s);assert.equal(second.previous,first.hash);assert.equal(s.pool,500);
 assert.equal(api.payout(s),true);assert.equal(s.pool,0);assert.equal(s.deductions,25);assert.equal(s.pending,475);assert.equal(s.ledger,0);assert.equal(api.payout(s),false);
 await mine(s);assert.equal(s.pending,0);assert.equal(s.ledger,475);assert.equal(s.wallet,0);
 api.sync(s);assert.equal(s.wallet,475);s.online=false;
 api.payout(s);await mine(s);assert.equal(s.ledger,950);assert.equal(s.wallet,475);api.sync(s);assert.equal(s.wallet,950);
});
test('toy hashes bind nonce, previous hash, difficulty and data; bad candidates are rejected',async()=>{
 const s=api.createState();const b=await mine(s,2);assert.match(b.hash,/^00[0-9a-f]{62}$/);assert.equal(b.hash,await api.hash(b));
 assert.notEqual(b.hash,await api.hash({...b,data:'modified'}));assert.notEqual(b.hash,await api.hash({...b,nonce:b.nonce+1}));
 assert.throws(()=>api.acceptBlock(s,{...b,height:2,previous:'wrong'}),/link/);
 assert.throws(()=>api.acceptBlock(s,{...b,height:2,previous:b.hash,hash:'f'.repeat(64)}),/proof/);
});
test('Unicode message limit and illustrative fee boundaries are enforced',()=>{
 for(const [length,fee] of [[0,0],[1,100],[20,100],[21,125],[40,125],[41,150],[60,150],[61,175],[80,175]]){const m=api.message('🙂'.repeat(length));assert.equal(m.length,length);assert.equal(m.valid,true);assert.equal(m.fee,fee);}
 assert.equal(api.message('x'.repeat(81)).valid,false);
});
test('maturity creates eligibility, not daily interest; discoveries reward immature outputs',()=>{
 const s=api.createState();assert.equal(api.eligible(s),100);s.hours=24;assert.equal(api.eligible(s),110);assert.equal(s.wins,0);
 s.baseStake=500;assert.equal(api.eligible(s),510);
 let found;for(let i=0;i<30;i++){const result=api.stake(s);if(result.won){found=result;break;}}
 assert.ok(found);assert.equal(s.wins,1);assert.equal(api.eligible(s),510);assert.equal(s.immature.at(-1).ready,48);
 s.hours=48;assert.equal(api.eligible(s),511);
 for(let i=s.draws;i<200;i++)api.stake(s);assert.equal(api.stake(s),null);
});
for(const [lang,folder,other] of [['en','blog','de/blog'],['de','de/blog','blog']])test(lang+': metadata, discovery, assets, anchors and no-JS article are complete',()=>{
 const route='/'+folder+'/i-built-my-own-cryptocurrency/';const html=readFileSync(path.join(root,folder,'i-built-my-own-cryptocurrency/index.html'),'utf8');
 const graph=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];const post=graph.find(x=>x['@type']==='BlogPosting');
 assert.equal(post.url,'https://www.dennishilk.com'+route);assert.equal(post.inLanguage,lang);assert.ok(post.wordCount>3000);
 assert.ok(html.includes('class="language-link" href="/'+other+'/i-built-my-own-cryptocurrency/"'));
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);assert.equal(new Set(ids).size,ids.length);
 for(const [,id] of html.matchAll(/href="#([^"]+)"/g))assert.ok(ids.includes(id),id);
 for(const [,local] of html.matchAll(/(?:href|src)="(\/[^"?#]+)(?:\?[^"#]*)?"/g))assert.ok(existsSync(path.join(root,local)),local);
 assert.equal((html.match(/<section class="nebu-panel"/g)||[]).length,6);assert.ok(html.includes('<noscript>'));assert.equal((html.match(/<fieldset disabled[^>]*>/g)||[]).length,6);
 assert.ok(html.includes('0.25')||html.includes('0,25'));assert.ok(html.includes('BankSocietyCoin'));
 assert.ok(!/<script[^>]+src="https?:/i.test(html));assert.ok(html.includes('summary_large_image'));assert.ok(existsSync(path.join(root,post.image.url.slice('https://www.dennishilk.com/'.length))));
 for(const file of ['index.html','feed.xml'])assert.ok(readFileSync(path.join(root,folder,file),'utf8').includes(post.url));assert.ok(readFileSync(path.join(root,'sitemap-blog.xml'),'utf8').includes(post.url));
});
