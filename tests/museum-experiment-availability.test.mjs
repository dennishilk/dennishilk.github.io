import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const museum=readFileSync(new URL('../museum/index.html',import.meta.url),'utf8');
test('interactive experiments remain available in the compact directory',()=>{
 for(const slug of ['linux-terminal-academy','unix-time-sharing-center','debian-server-experiment','failure-lab','bbs-system'])assert.match(museum,new RegExp('href="/museum/'+slug+'/"[^>]*data-status="available"'));
});
test('completed story and real laboratory remain separate from the searchable exhibits',()=>{
 const specials=museum.slice(museum.indexOf('class="catalog-specials"'),museum.indexOf('id="exhibits"'));
 assert.match(specials,/The Lost Administrator/);assert.match(specials,/completed novel/);assert.match(specials,/href="\/lost-administrator\/"/);assert.match(specials,/href="\/museum\/home-computing-lab\/"/);assert.doesNotMatch(specials,/Linux Terminal Academy/);
});
