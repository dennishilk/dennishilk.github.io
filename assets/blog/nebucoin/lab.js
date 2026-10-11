/* Educational reconstruction, 2026. No historical Nebucoin code or network I/O.
 * SHA-256(JSON([height, previousHash, data, difficulty, nonce])) with 1–3 leading
 * hexadecimal zeros. At most 12,000 attempts / click, 12 blocks / session.
 * Accounting uses integer hundredths. Toy rewards mature after ONE later block;
 * this is a lab convention, not Nebucoin's historical PoW maturity rule.
 */
(function () {
  'use strict';
  const encode = block => JSON.stringify([block.height, block.previous, block.data, block.difficulty, block.nonce]);
  async function hash(block) {
    const bytes = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(encode(block)));
    return Array.from(new Uint8Array(bytes), x => x.toString(16).padStart(2, '0')).join('');
  }
  function createState() {
    return {chain: [], shares: 0, rejected: 0, rewards: [], pool: 0, deductions: 0,
      pending: 0, ledger: 0, wallet: 0, online: false, hours: 0, baseStake: 100,
      immature: [{amount: 10, ready: 24}], draws: 0, wins: 0, seed: 17};
  }
  function share(s, accepted = true) { if (accepted) s.shares++; else s.rejected++; }
  function acceptBlock(s, block) {
    if (s.chain.length >= 12) throw new Error('block-limit');
    if (block.height !== s.chain.length + 1 || block.previous !== (s.chain.at(-1)?.hash || '0'.repeat(64))) throw new Error('link');
    if (!block.hash.startsWith('0'.repeat(block.difficulty))) throw new Error('proof');
    s.chain.push(block);
    s.rewards = s.rewards.filter(reward => {
      if (reward.height < block.height) { s.pool += reward.amount; return false; }
      return true;
    });
    // A pending payout is included only by an explicitly mined later block.
    if (s.pending && block.payout === s.pending) { s.ledger += s.pending; s.pending = 0; }
    s.rewards.push({height: block.height, amount: 500});
    if (s.online) s.wallet = s.ledger;
  }
  function payout(s) {
    if (s.pool < 500 || s.pending) return false;
    s.pool -= 500; s.deductions += 25; s.pending = 475;
    return true;
  }
  function sync(s) { s.online = true; s.wallet = s.ledger; }
  function eligible(s) { return s.baseStake + s.immature.filter(x => x.ready <= s.hours).reduce((n, x) => n + x.amount, 0); }
  function stake(s) {
    if (s.draws >= 200) return null;
    const chance = eligible(s) / (eligible(s) + 900); // 900 hypothetical competing units, NOT the original private network.
    s.seed = (Math.imul(s.seed, 1664525) + 1013904223) >>> 0;
    const draw = s.seed / 4294967296;
    s.draws++;
    const won = draw < chance;
    if (won) { s.wins++; s.immature.push({amount: 1, ready: s.hours + 24}); }
    return {chance, draw, won};
  }
  function message(text) {
    const length = Array.from(text).length;
    return {length, valid: length <= 80, fee: length === 0 ? 0 : 100 + Math.max(0, Math.ceil(length / 20) - 1) * 25};
  }
  const api = {encode, hash, createState, share, acceptBlock, payout, sync, eligible, stake, message};
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }
  const root = document.querySelector('#nebucoin-lab');
  if (!root) return;
  const de = root.dataset.lang === 'de';
  const t = (en, german) => de ? german : en;
  const q = name => root.querySelector(`[data-${name}]`);
  const money = n => (n / 100).toLocaleString(de ? 'de-DE' : 'en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
  let s = createState(), generation = 0, running = false;
  const report = text => { q('status').textContent = text; };
  function render() {
    for (const name of ['shares','rejected']) q(name).textContent = s[name];
    for (const name of ['pool','pending','ledger','wallet','deductions']) q(name).textContent = money(s[name]) + ' NEBU';
    q('unconfirmed').textContent = money(s.rewards.reduce((n,x) => n+x.amount,0)) + ' NEBU';
    q('payout').disabled = s.pool < 500 || !!s.pending || running || s.chain.length >= 12;
    q('mine').disabled = running || s.chain.length >= 12 || !globalThis.crypto?.subtle;
    q('difficulty').disabled = running;
    q('wallet-toggle').textContent = s.online ? t('Close wallet', 'Wallet schließen') : t('Open / synchronize wallet', 'Wallet öffnen / synchronisieren');
    q('wallet-state').textContent = s.online ? t('Online · synchronized', 'Online · synchronisiert') : t('Offline · last known balance', 'Offline · zuletzt bekannter Stand');
    q('blocks').replaceChildren();
    for (const b of s.chain) {
      const card = document.createElement('div'); card.className = 'nebu-block';
      const title = document.createElement('strong'); title.textContent = `#${b.height} · ${t('Toy PoW block', 'Modell-PoW-Block')}`;
      card.append(title);
      for (const [label, value] of [[t('Previous', 'Vorgänger'),b.previous],[t('Hash', 'Hash'),b.hash],['Nonce',b.nonce],[t('Data','Daten'),b.data],[t('Confirmations','Bestätigungen'),s.chain.length - b.height + 1]]) {
        const line = document.createElement('p'); const key = document.createElement('span'); key.textContent = label + ': ';
        const val = document.createElement('code'); val.textContent = value; line.append(key,val); card.append(line);
      }
      q('blocks').append(card);
    }
    if (!s.chain.length) q('blocks').textContent = t('No blocks yet. Start a mining attempt in module B.', 'Noch keine Blöcke. Starte einen Mining-Versuch in Modul B.');
    q('hours').textContent = s.hours + ' h';
    q('eligible').textContent = api.eligible(s) + ' NEBU';
    q('immature').textContent = s.immature.filter(x=>x.ready>s.hours).reduce((n,x)=>n+x.amount,0) + ' NEBU';
    q('chance').textContent = (api.eligible(s)/(api.eligible(s)+900)*100).toLocaleString(de ? 'de-DE' : 'en-US', {minimumFractionDigits:1,maximumFractionDigits:1}) + '%';
    q('wins').textContent = s.wins;
    q('stake').disabled = s.draws >= 200;
    q('clock').disabled = s.hours >= 240;
  }
  q('share').addEventListener('click', ()=>{api.share(s);render();report(t('Share accepted by the pool. No block, no reward.', 'Share vom Pool akzeptiert. Kein Block, keine Belohnung.'));});
  q('reject').addEventListener('click', ()=>{api.share(s,false);render();report(t('Invalid work rejected in this model; balances unchanged.', 'Ungültige Arbeit im Modell abgelehnt; Guthaben unverändert.'));});
  q('mine').addEventListener('click', async ()=>{
    const token = generation; running = true; render();
    const block = {height:s.chain.length+1, previous:s.chain.at(-1)?.hash || '0'.repeat(64), difficulty:Number(q('difficulty').value), nonce:0, payout:s.pending,
      data:s.pending ? `DEMO-POOL -> DEMO-RECIPIENT: ${money(s.pending)} NEBU` : t('DEMO mining reward: 5.00 NEBU', 'DEMO-Mining-Belohnung: 5,00 NEBU')};
    report(t('Searching locally…', 'Suche lokal…'));
    try {
      for (let nonce=0;nonce<12000;nonce++) {
        if (token !== generation) return;
        block.nonce=nonce; block.hash=await hash(block);
        if (token !== generation) return;
        if (block.hash.startsWith('0'.repeat(block.difficulty))) {
          api.acceptBlock(s,block); q('attempts').textContent = nonce+1;
          report(t('Valid toy block accepted. Reward starts pending; see modules C and D.', 'Gültiger Modellblock akzeptiert. Belohnung zunächst ausstehend; siehe C und D.'));
          return;
        }
        if (nonce % 64 === 0) {
          q('attempts').textContent = nonce+1;
          await new Promise(resolve => setTimeout(resolve, 4));
        }
      }
      q('attempts').textContent = 12000;
      report(t('Limit reached: no block found. Try again with a lower difficulty.', 'Limit erreicht: kein Block gefunden. Versuche eine geringere Schwierigkeit.'));
    } catch (_) { report(t('Hashing unavailable or block rejected. Reset to try again.', 'Hashing nicht verfügbar oder Block abgelehnt. Zum erneuten Versuch zurücksetzen.')); }
    finally { if(token===generation){running=false;render();} }
  });
  q('payout').addEventListener('click', ()=>{if(api.payout(s)){render();report(t('5 − 0.25 = 4.75 NEBU pending. Mine another block to include the payout.', '5 − 0,25 = 4,75 NEBU ausstehend. Mine einen weiteren Block für die Auszahlung.'));}});
  q('wallet-toggle').addEventListener('click',()=>{if(s.online)s.online=false;else api.sync(s);render();});
  q('reset').addEventListener('click',()=>{generation++;running=false;s=createState();q('attempts').textContent='0';q('difficulty').value='1';q('stake-size').value='100';root.querySelector('[data-path="0"]').click();q('message').value='';q('record').textContent='';q('stake-result').textContent='';renderMessage();render();report(t('Lab reset. All values are fictional.', 'Lab zurückgesetzt. Alle Werte sind fiktiv.'));});
  const paths = de ? [
    'Der Moonlander 2 berechnet Scrypt-Arbeit. Im Browser verwenden wir nur einen kleinen SHA-256-Versuch.',
    'Stratum transportiert Aufgaben und Ergebnisse zwischen Miner und Pool; dies ist kein echter Verbindungsaufbau.',
    'NOMP prüft Shares als Arbeitsnachweise und verwaltet die Pool-Abrechnung. Ein Share muss noch keinen Netzwerkblock erfüllen.',
    'RPC verbindet Pool und Daemon. Der Node prüft Blockkandidaten nach den Regeln der Blockchain.',
    'Erst ein gültiger Block eröffnet eine Belohnung. Bestätigungen und Reife gehen einer verfügbaren Auszahlung voraus.',
    'Eine Auszahlung geht an eine Adresse. Meine separate Qt-Wallet konnte offline sein und später synchronisieren.'
  ] : [
    'The Moonlander 2 computes Scrypt work. The browser uses only a small SHA-256 exercise.',
    'Stratum carries jobs and results between miner and pool; this does not establish a real connection.',
    'NOMP checks shares as evidence of work and handles pool accounting. A share need not meet the network block target.',
    'RPC connects pool and daemon. The node checks block candidates against the blockchain rules.',
    'Only a valid block enables a reward. Confirmations and maturity precede an available payout.',
    'A payout goes to an address. My separate Qt wallet could be offline and synchronize later.'
  ];
  root.querySelectorAll('[data-path]').forEach(button=>button.addEventListener('click',()=>{
    root.querySelectorAll('[data-path]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
    q('path-detail').textContent=paths[Number(button.dataset.path)];
  }));
  function renderMessage() {
    const result=api.message(q('message').value);
    q('message-count').textContent=result.length+' / 80';
    q('message-fee').textContent=money(result.fee)+' NEBU';
    q('message').setAttribute('aria-invalid',String(!result.valid));
    q('message-error').textContent=result.valid ? '' : t('Over 80 characters: rejected by this demonstration.', 'Über 80 Zeichen: von dieser Demonstration abgelehnt.');
    q('create-record').disabled=!result.valid;
    q('record').textContent='';
  }
  q('message').addEventListener('input',renderMessage);
  q('create-record').addEventListener('click',()=>{
    const result=api.message(q('message').value); if(!result.valid)return;
    q('record').textContent=JSON.stringify({type:'EDUCATIONAL PREVIEW',recipient:'DEMO-RECIPIENT-NOT-AN-ADDRESS',message:q('message').value,messageFee:money(result.fee)+' NEBU'},null,2);
  });
  q('clock').addEventListener('click',()=>{s.hours=Math.min(240,s.hours+24);render();q('stake-result').textContent=t('Maturity changed eligibility, not automatic rewards.', 'Reife ändert die Berechtigung, erzeugt keine automatische Belohnung.');});
  q('stake-size').addEventListener('change',()=>{s.baseStake=Number(q('stake-size').value);render();});
  q('stake').addEventListener('click',()=>{
    const result=api.stake(s);if(!result)return;render();
    q('stake-result').textContent=t('Attempt ', 'Versuch ')+s.draws+': '+t('draw ', 'Ziehung ')+(result.draw*100).toFixed(1)+'% · '+(result.won ? t('PoS block found: +1 immature NEBU.', 'PoS-Block gefunden: +1 unreifer NEBU.') : t('No PoS block. No reward.', 'Kein PoS-Block. Keine Belohnung.'));
  });
  root.querySelectorAll('fieldset').forEach(x=>x.disabled=false);
  if(!globalThis.crypto?.subtle)report(t('SHA-256 needs a secure browser context (HTTPS). Other modules remain available.', 'SHA-256 benötigt einen sicheren Browserkontext (HTTPS). Andere Module bleiben verfügbar.'));
  renderMessage();render();
})();
