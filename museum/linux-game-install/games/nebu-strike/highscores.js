(function(root, factory) { const api=factory(); if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.NebuStrikeScores=api; })(typeof window!=='undefined'?window:globalThis,function(){'use strict';
  const KEY='nebu.localBest', TABLE_KEY='nebu.localScores', MAX=10, CALLSIGN=/^[A-Z0-9_-]{3,12}$/;
  const normalizeCallsign=value=>String(value||'').trim().toUpperCase();
  const validCallsign=value=>CALLSIGN.test(normalizeCallsign(value));
  const scoreEntries=entries=>entries.filter(e=>validCallsign(e.callsign)&&Number.isInteger(e.score)&&e.score>=0&&Number.isInteger(e.wave)&&e.wave>=0).sort((a,b)=>b.score-a.score||b.wave-a.wave).slice(0,MAX).map(({callsign,score,wave})=>({callsign:normalizeCallsign(callsign),score,wave}));
  function createScores({storage=globalThis.localStorage}={}) { let best=0, entries=[];
    try { best=Math.max(0,Number(storage?.getItem(KEY))||0); entries=scoreEntries(JSON.parse(storage?.getItem(TABLE_KEY)||'[]')); } catch (_) { entries=[]; }
    const persist=()=>{ try { storage?.setItem(TABLE_KEY,JSON.stringify(entries)); } catch (_) {} };
    return { getBest:()=>best, getEntries:()=>entries.map(entry=>({...entry})), saveBest(score){if(Number.isInteger(score)&&score>best){best=score;try{storage?.setItem(KEY,String(best))}catch(_){}}return best}, save(callsign,score,wave){if(!validCallsign(callsign)||!Number.isInteger(score)||score<0||score>99999999||!Number.isInteger(wave)||wave<0||wave>9999)throw new Error('INVALID CALLSIGN'); const entry={callsign:normalizeCallsign(callsign),score,wave,saved_at:Date.now()}; entries=scoreEntries([...entries,entry]); this.saveBest(score); persist(); return this.getEntries();}, bounded:scoreEntries}; }
  return {KEY,TABLE_KEY,MAX,normalizeCallsign,validCallsign,scoreEntries,createScores};
});
