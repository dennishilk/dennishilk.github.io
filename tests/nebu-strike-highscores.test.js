const assert = require('node:assert/strict');
const S = require('../museum/linux-game-install/games/nebu-strike/highscores.js');
assert.equal(S.normalizeCallsign(' ace-42 '),'ACE-42'); assert.ok(S.validCallsign('NEBU')); assert.ok(!S.validCallsign('x!'));
const ordered=S.scoreEntries([{callsign:'ace',score:10,wave:1},{callsign:'NEBU',score:20,wave:1},...Array.from({length:12},(_,i)=>({callsign:`AAA${i}`,score:i,wave:1}))]); assert.equal(ordered[0].callsign,'NEBU'); assert.equal(ordered.length,S.MAX);
const db=new Map(), local=S.createScores({storage:{getItem:k=>db.get(k),setItem:(k,v)=>db.set(k,v)}}); assert.equal(local.saveBest(55),55); assert.equal(local.getBest(),55);
local.submit('NEBU',5,1).then(()=>assert.fail('missing endpoint must fail'),e=>assert.match(e.message,/UNAVAILABLE/)).then(()=>console.log('Nebu Strike local score validation and failure tests passed'));
