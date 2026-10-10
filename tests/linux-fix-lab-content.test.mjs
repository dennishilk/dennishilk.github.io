import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { categories, loadProblems, problemPath } from '../scripts/build-linux-fix-lab.mjs';
import { matchesPattern, searchMatches } from '../assets/linux-fix-lab/core.js';

const root=resolve(import.meta.dirname,'..');
const problems=loadProblems();
const trees=JSON.parse(readFileSync(resolve(root,'content/linux-fix-lab/assistants.json'),'utf8'));
const bilingual=(value,label)=>{for(const lang of ['en','de'])assert.ok(typeof value?.[lang]==='string'&&value[lang].trim().length>1,`${label}: missing ${lang}`);};

test('expanded inventory has 154 distinct problems across all 12 categories',()=> {
  assert.equal(problems.length,154);
  assert.equal(new Set(problems.map(problem=>problem.id)).size,154);
  assert.deepEqual(new Set(problems.map(problem=>problem.category)),new Set(Object.keys(categories)));
  for(const lang of ['en','de']) {
    assert.equal(new Set(problems.map(problem=>problem.slug[lang])).size,154);
    assert.equal(new Set(problems.map(problem=>problem.title[lang])).size,154);
    assert.equal(new Set(problems.map(problem=>problem.summary[lang])).size,154);
  }
});

for(const problem of problems)test(`${problem.id}: complete evidence, interpretation, precautions and recovery in DE/EN`,()=> {
  assert.ok(categories[problem.category]);
  assert.match(problem.id,/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  for(const field of ['title','summary','environment'])bilingual(problem[field],field);
  for(const lang of ['en','de']) {
    assert.match(problem.slug[lang],/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(problem.symptoms[lang].length>=2);
    assert.ok(problem.symptoms[lang].every(text=>typeof text==='string'&&text.length>12));
    assert.ok(existsSync(resolve(root,problemPath(problem,lang).slice(1),'index.html')));
  }
  assert.ok(problem.causes.length>=2);problem.causes.forEach(cause=>bilingual(cause,'cause'));
  assert.ok(problem.diagnostics.length>=2);
  for(const diagnostic of problem.diagnostics) {
    assert.match(diagnostic.id,/^[a-z][a-z0-9-]*$/);
    assert.ok(typeof diagnostic.command==='string'&&diagnostic.command.trim().length>0);bilingual(diagnostic.explanation,'command explanation');bilingual(diagnostic.interpretation,'command interpretation');
    assert.doesNotMatch(diagnostic.command,/(?:^|[\s;&|])(?:rm|mkfs(?:\.[a-z0-9]+)?|wipefs|dd|chmod|chown|reboot|poweroff|shutdown)\b|\b(?:sysctl\s+-w|find\b[^\n]*-delete|fsck\b[^\n]*-[ay])|>\s*\/(?:sys|proc|dev)\//i);
  }
  assert.ok(problem.solutions.length>=2);
  assert.equal(new Set(problem.solutions.map(solution=>solution.id)).size,problem.solutions.length);
  for(const solution of problem.solutions) {
    assert.match(solution.id,/^[a-z][a-z0-9-]*$/);
    assert.ok(!['symptoms','causes','diagnostics','solutions','sources','related','main','page-top'].includes(solution.id));
    for(const field of ['title','body','precautions','rollback'])bilingual(solution[field],`solution ${field}`);
    for(const lang of ['en','de'])assert.ok(solution.body[lang].length>90,`${solution.id}: substantive ${lang} action`);
  }
  assert.ok(problem.sources.length>=2);
  for(const source of problem.sources){assert.equal(new URL(source.url).protocol,'https:');assert.ok(source.title.length>8);assert.equal(source.kind,'official');assert.ok(['documentation','source-code','upstream-report','mailing-list-report'].includes(source.evidence));assert.doesNotMatch(source.url,/(?:google\.com\/search|example\.(?:com|org)|localhost)/);}
  assert.match(problem.reviewed,/^\d{4}-\d{2}-\d{2}$/);
});

const patterns=problems.flatMap(problem=>problem.logPatterns.map(pattern=>({...pattern,problemId:problem.id})));
test('recognition inventory contains 150–200 unique meaningful signatures',()=> {
  assert.ok(patterns.length>=150&&patterns.length<=200,`actual signatures: ${patterns.length}`);
  assert.equal(new Set(patterns.map(pattern=>pattern.id)).size,patterns.length);
  const fingerprints=patterns.map(pattern=>JSON.stringify([pattern.all.map(x=>x.toLowerCase()).sort(),(pattern.any||[]).map(x=>x.toLowerCase()).sort(),(pattern.none||[]).map(x=>x.toLowerCase()).sort()]));
  assert.equal(new Set(fingerprints).size,fingerprints.length,'no duplicated literal predicates');
});
for(const pattern of patterns)test(`${pattern.id}: positive fixture, case variation and realistic negatives`,()=> {
  assert.ok(pattern.all.length>0&&pattern.all.every(token=>typeof token==='string'&&token.length>1));
  assert.ok(pattern.all.length>1||(pattern.any||[]).length>0||pattern.all[0].length>=16,'single literals name a specific event or subsystem');
  assert.ok(!pattern.all.every(token=>/^(?:error|failed|failure|warning|timeout|denied)$/i.test(token)),'generic failure words cannot form a signature');
  assert.ok(matchesPattern(pattern.sample,pattern),'positive example matches');
  assert.ok(matchesPattern(pattern.sample.toUpperCase(),pattern),'matching is case-insensitive');
  assert.ok(pattern.negative.length>=2);
  for(const negative of pattern.negative)assert.ok(!matchesPattern(negative,pattern),`negative matched: ${negative}`);
  bilingual(pattern.explanation,'signature explanation');bilingual(pattern.significance,'signature significance');
});

test('search finds log text, titles and German characters with multiple terms',()=> {
  assert.ok(searchMatches('SSH Schlüssel und Berechtigungen','schlussel ssh'));
  assert.ok(searchMatches('Dateisystemgröße Straße','strasse grosse'));
  assert.ok(!searchMatches('Audio PipeWire','audio nvme'));
  for(const problem of problems)for(const lang of ['en','de'])assert.ok(searchMatches(problem.title[lang],problem.title[lang]));
  const crc=problems.filter(problem=>problem.logPatterns.some(pattern=>searchMatches(pattern.sample,'badcrc')));
  assert.ok(crc.some(problem=>problem.id==='storage-sata-crc-errors'));
});

for(const tree of trees)test(`${tree.id}: meaningful reachable bilingual decision tree with valid recovery paths`,()=> {
  assert.ok(tree.nodes[tree.start]);bilingual(tree.title,'assistant title');
  const visited=new Set(),queue=[tree.start];let questions=0,terminals=0;
  while(queue.length){const id=queue.shift();if(visited.has(id))continue;visited.add(id);const node=tree.nodes[id];assert.ok(node);
    if(node.question){questions++;bilingual(node.question,'question');bilingual(node.why,'why');assert.ok(node.choices.length>=2);
      for(const choice of node.choices){bilingual(choice.label,'choice');assert.ok(tree.nodes[choice.next],`${id}: broken choice`);queue.push(choice.next);}
      for(const diagnostic of node.diagnostics){assert.ok(diagnostic.command);bilingual(diagnostic.interpretation,'assistant command result');}
    }else{terminals++;bilingual(node.heading,'result');bilingual(node.body,'result reasoning');assert.ok(node.problemIds.length>0);for(const id of node.problemIds)assert.ok(problems.some(problem=>problem.id===id),`missing article ${id}`);}
  }
  assert.equal(visited.size,Object.keys(tree.nodes).length,'no unreachable question/result');
  assert.ok(questions>=2&&terminals>=3);
});
test('18 distinct assistants are available',()=>assert.equal(trees.length,18));

test('featured symptom questions lead to real bilingual guides without search-volume claims',()=> {
  const faq=JSON.parse(readFileSync(resolve(root,'content/linux-fix-lab/featured-questions.json'),'utf8'));
  assert.equal(faq.schemaVersion,1);
  assert.equal(faq.questions.length,12);
  assert.equal(new Set(faq.questions.map(item=>item.id)).size,12);
  assert.ok(!/search volumes/i.test(faq.disclaimer.de));
  for(const item of faq.questions) {
    assert.ok(problems.some(problem=>problem.id===item.id),item.id);
    for(const lang of ['en','de']) {
      assert.ok(item.question[lang].length>20);
      assert.ok(item.answer[lang].length>35);
    }
  }
});
