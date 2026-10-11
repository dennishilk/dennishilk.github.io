/* Cthulhu interactive historical timeline and GPU case study. No network, tracking or live diagnosis. */
(()=>{"use strict";
const root=document.querySelector('[data-ct-demo]');
if(!root)return;
const type=root.getAttribute('data-ct-demo');
const q=s=>root.querySelector(s);
if(type==='timeline'){
  const buttons=[...root.querySelectorAll('[data-era]')];
  const items=[...root.querySelectorAll('[data-era-item]')];
  const show=era=>{
    buttons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.era===era)));
    items.forEach(el=>{el.hidden=era!=='all' && el.dataset.eraItem!==era;});
  };
  buttons.forEach(b=>b.addEventListener('click',()=>show(b.dataset.era)));
  show('all');
}
if(type==='crash'){
  const versions={
    early:{
      de:'Frühere Linux-Tests: massive Unterschiede je nach Spiel. Die Symptome beweisen nicht, dass alle Abstürze dieselbe Ursache hatten.',
      en:'Earlier Linux tests: symptoms varied widely by game. These observations do not establish a single root cause.'
    },
    low:{
      de:'112 W: Teilweise weniger Hardlocks, aber kein zuverlässiger Fix. Arma 3 stürzte weiterhin hart ab; Quake RTX verlor das Bild, während Spiel und LocalSend weiterliefen; Black Flag Resynced zeigte noch Blackouts nach etwa 3–10 Minuten.',
      en:'112 W: Fewer hardlocks in some tests, but no reliable fix. Arma 3 still hard-crashed; Quake RTX lost video while the game and LocalSend kept running; Black Flag Resynced still had blackouts after roughly 3–10 minutes.'
    },
    current:{
      de:'Mesa 26.2.4, 160 W: In insgesamt ungefähr zehn Stunden Gaming nur ein beobachteter Hardcrash (Black Flag Resynced). Das ist ein Praxisergebnis, kein nachgewiesener Mesa-Patch.',
      en:'Mesa 26.2.4, 160 W: About ten hours of gaming with one observed hard crash (Black Flag Resynced). This is an observation, not proof of a specific Mesa patch.'
    }
  };
  const select=q('[data-test]');
  const state=q('[data-state]');
  const info=q('[data-info]');
  const matrix={
    stalker:{early:['Stalls + hardlocks','Stalls + hardlocks'],low:['Stalls remained','Stalls blieben bestehen'],current:['2 h stable at 160 W','2 h stabil bei 160 W']},
    arma:{early:['Hardlock entering the world','Hardlock beim Weltbeitritt'],low:['Still hard-crashed when entering the world','Weiterhin Hardcrash beim Weltbeitritt'],current:['~1 h: weapons + helicopter','~1 h: Waffen + Hubschrauber']},
    quake:{early:['Display lost; game and LocalSend kept running','Bild weg; Spiel und LocalSend liefen'],low:['Display gone; game and LocalSend kept running','Bild weg; Spiel und LocalSend liefen weiter'],current:['No display loss in retest','Kein Bildausfall im Nachtest']},
    blackflag:{early:['Hard crash after minutes','Hardcrash nach Minuten'],low:['Intermittent blackouts after ~3–10 min','Teils Blackouts nach ca. 3–10 Min.'],current:['One hard crash after ~2 h','Ein Hardcrash nach ~2 h']},
    sata:{early:['ata2 BadCRC/link resets, independent lead','ata2 BadCRC/Link-Resets, separate Spur'],low:['Drive relocation did not fix hardlocks','Laufwerkswechsel löste Hardlocks nicht'],current:['Cable/port tests still pending','Kabel-/Porttests noch offen']}
  };
  const lang=root.getAttribute('lang')==='de'?'de':'en';
  const idx=lang==='de'?1:0;
  const show=()=>{
    const scenario=root.querySelector('[data-mode][aria-pressed="true"]').dataset.mode;
    const item=matrix[select.value];
    state.textContent=item[scenario][idx];
    info.textContent=versions[scenario][lang];
  };
  root.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{
    root.querySelectorAll('[data-mode]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
    show();
  }));
  select.addEventListener('change',show);
  show();
}
})();