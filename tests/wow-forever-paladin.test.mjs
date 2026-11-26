import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {emptyBuild, cloneBuild, totals, spent, requiredLevel, validBuild, changeRank, resetTree, encodeBuild, decodeBuild} from '../assets/wow-forever-paladin/logic.js';
const data=JSON.parse(readFileSync(new URL('../assets/wow-forever-paladin/data.json',import.meta.url)));
const rank=(tree,name)=>data.trees[tree].talents.findIndex(t=>t.name.en===name);

test('Complete Forever dataset: 51 talents, 139 confirmed ranks, both languages and real parents',()=>{
  assert.deepEqual(data.trees.map(t=>t.talents.length),[17,17,17]);
  assert.equal(data.trees.flatMap(t=>t.talents).reduce((n,t)=>n+t.max,0),139);
  for(const tree of data.trees){
    const coords=new Set();
    for(const t of tree.talents){
      assert.ok(t.row>=1&&t.row<=7&&t.col>=1&&t.col<=4);
      const position=t.row+':'+t.col;assert.ok(!coords.has(position));coords.add(position);
      assert.equal(t.confirmed.length,t.max);
      for(const lang of ['de','en']){assert.ok(t.name[lang]);assert.equal(t.desc[lang].length,t.max);for(const text of t.desc[lang])assert.ok(text.trim().length>10);}
      assert.ok(existsSync(new URL('../assets/wow-forever-paladin/icons/'+t.icon+'.jpg',import.meta.url)));
      if(t.req){const parent=tree.talents.find(p=>p.id===t.req.id);assert.ok(parent);assert.equal(t.req.rank,parent.max);}
    }
  }
});
test('Preset totals and exact per-talent ranks transcribed from the original Tank and November 26 Holy screenshots',()=>{
  const expected={
    protection:{Holy:{},Protection:{Redoubt:5,Precision:3,'Sacred Duty':2,"Templar's Bulwark":1,'Shield Specialization':2,Toughness:3,'Swift Judgement':1,'Improved Righteous Fury':3,Anticipation:5,'Holy Shield':1,Reckoning:5,'Iron Creed':3,Shieldsworn:1},Retribution:{Benediction:5,'Improved Judgement':2,Conviction:3,'Sanctified Judgement':3,'Pursuit of Justice':2,'Sacred Arbiter':1}},
    holy:{Holy:{'Spiritual Focus':5,'Healing Light':3,Reverence:2,'Divine Favor':1,Illumination:5,'Holy Conduit':2,'Infusion of Light':2,'Oath of Light':1,'Consecrated Ground':1,'Holy Shock':1,'Boundless Light':2,'Holy Power':5,"Light's Vigil":1},Protection:{'Divine Intellect':5},Retribution:{Benediction:5,'Improved Judgement':2,Conviction:3,'Sanctified Judgement':3,'Pursuit of Justice':2}}
  };
  for(const [key,build] of Object.entries(data.presets)){
    assert.ok(validBuild(data,build));assert.equal(spent(build),51);assert.equal(requiredLevel(build),60);
    data.trees.forEach((tree,ti)=>tree.talents.forEach((t,i)=>assert.equal(build[ti][i],expected[key][tree.name.en][t.name.en]||0,key+': '+t.name.en)));
  }
  assert.deepEqual(totals(data.presets.protection),[0,35,16]);assert.deepEqual(totals(data.presets.holy),[31,5,15]);
});
test('Legal preset builds can be constructed one point at a time',()=>{
  for(const desired of Object.values(data.presets)){
    let build=emptyBuild(data);
    for(let iteration=0;spent(build)<51&&iteration<500;iteration++){
      let progress=false;
      for(let ti=0;ti<3;ti++)for(let i=0;i<17;i++)if(build[ti][i]<desired[ti][i]){
        const next=changeRank(data,build,ti,i,1);if(next){build=next;progress=true;}
      }
      assert.ok(progress,'build has a valid spending order');
    }
    assert.deepEqual(build,desired);
  }
});
test('Rows require earlier points; same-row points do not bypass the gate',()=>{
  const b=emptyBuild(data);assert.equal(changeRank(data,b,1,rank(1,'Precision'),1),null);
  b[1][rank(1,'Divine Intellect')]=4;b[1][rank(1,'Precision')]=1;assert.equal(validBuild(data,b),false);
  b[1][rank(1,'Divine Intellect')]=5;assert.ok(validBuild(data,b));
});
test('All direct prerequisites block learning and removing their required parent',()=>{
  for(const [ti,tree] of data.trees.entries())for(const t of tree.talents.filter(t=>t.req)){
    let b=tree.talents.map(t=>t.max);const parent=tree.talents.findIndex(p=>p.id===t.req.id);
    const all=emptyBuild(data);all[ti]=b; // Some full trees exceed the global budget: isolate and remove unrelated latest ranks.
    while(spent(all)>51){let removed=false;for(let j=b.length-1;j>=0;j--){if(j===parent||b[j]===0||tree.talents[j].id===t.id)continue;const next=cloneBuild(all);next[ti][j]--;if(validBuild(data,next)){all[ti]=next[ti];b=all[ti];removed=true;break;}}assert.ok(removed);}
    assert.ok(validBuild(data,all));assert.equal(changeRank(data,all,ti,parent,-1),null,t.name.en);
  }
});
test('Global cap, max ranks and negative ranks are enforced without mutating input',()=>{
  const original=JSON.stringify(data.presets.protection);
  assert.equal(changeRank(data,data.presets.protection,0,0,1),null);
  assert.equal(changeRank(data,emptyBuild(data),0,0,-1),null);
  const b=emptyBuild(data);b[0][0]=5;assert.equal(changeRank(data,b,0,0,1),null);
  assert.equal(changeRank(data,b,99,0,1),null);assert.equal(changeRank(data,b,0,0,100),null);
  assert.equal(JSON.stringify(data.presets.protection),original);
});
test('Removing lower-row points does not leave higher rows unlocked illegally',()=>{
  const b=emptyBuild(data);b[1][0]=5;b[1][2]=1;
  assert.ok(validBuild(data,b));assert.equal(changeRank(data,b,1,0,-1),null);
  assert.ok(changeRank(data,b,1,2,-1));
});
test('Individual tree reset preserves the other two trees and stays legal',()=>{
  for(const preset of Object.values(data.presets))for(let ti=0;ti<3;ti++){
    const next=resetTree(data,preset,ti);assert.ok(validBuild(data,next));assert.equal(totals(next)[ti],0);
    for(let j=0;j<3;j++)if(ti!==j)assert.deepEqual(next[j],preset[j]);
  }
});
test('Versioned URL encoding round-trips presets, empty and custom builds',()=>{
  let custom=emptyBuild(data);custom=changeRank(data,custom,1,0,1);
  for(const b of [emptyBuild(data),...Object.values(data.presets),custom])assert.deepEqual(decodeBuild(data,encodeBuild(data,b)),b);
  assert.equal(requiredLevel(emptyBuild(data)),10);assert.equal(requiredLevel(custom),10);
  custom[1][0]=5;assert.equal(requiredLevel(custom),14);
});
test('Malformed, over-budget, over-rank, incompatible and script URL values fail closed',()=>{
  const attacks=['',null,undefined,'x'.repeat(10000),'p2.00000000000000000.00000000000000000.00000000000000000','p1.1.2.3','p1.55555555555555555.55555555555555555.55555555555555555','p1.00000000000000006.00000000000000000.00000000000000000','<script>alert(1)</script>','p1.00000000000000001.00000000000000000.00000000000000000',encodeBuild(data,data.presets.protection)+'%00'];
  for(const code of attacks)assert.equal(decodeBuild(data,code),null,String(code));
  for(const invalid of [[],[[],[],[]],[{},[],[]],[[NaN],[],[]]])assert.equal(validBuild(data,invalid),false);
});
test('Deterministic randomized legal edits stay legal and shareable',()=>{
  let build=emptyBuild(data),seed=4711;
  const nextRandom=()=>{seed=(seed*1664525+1013904223)>>>0;return seed;};
  for(let n=0;n<3000;n++){
    const ti=nextRandom()%3,i=nextRandom()%17,delta=nextRandom()%4===0?-1:1;
    const changed=changeRank(data,build,ti,i,delta);if(changed)build=changed;
    assert.ok(validBuild(data,build));assert.ok(spent(build)<=51);assert.deepEqual(decodeBuild(data,encodeBuild(data,build)),build);
    if(n%250===0)build=emptyBuild(data);
  }
});

test('Earlier Retribution share links remain valid after changing the personal secondary preset',()=>{
  const old=decodeBuild(data,'p1.05005000200000000.50300000000000000.05233011201301351');
  assert.ok(old);assert.deepEqual(totals(old),[12,8,31]);assert.equal(data.presets.retribution,undefined);
});
