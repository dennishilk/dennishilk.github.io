document.addEventListener('DOMContentLoaded', () => {
  const C = window.CryptoLab, $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  let substitution = 'QWERTYUIOPASDFGHJKLZXCVBNM';
  const stages = { caesar: ['letters','mapping'], rot13: ['letters','mapping'], substitution: ['mapping'], xor: ['codes','bits','xor'] };
  function show(tab) { $$('.crypto-station').forEach(p => p.hidden = p.id !== tab); $$('.crypto-tabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === tab)); $$('.crypto-progress span').forEach(s => s.classList.toggle('active', stages[tab].includes(s.dataset.stage))); }
  $$('.crypto-tabs button').forEach(b => b.addEventListener('click', () => show(b.dataset.tab)));
  const wheel = $('#cipher-wheel'), wheelStep = 360 / C.ALPHABET.length;
  function createWheelRing(selector, className) {
    const ring = $(selector);
    [...C.ALPHABET].forEach((letter, index) => {
      const slot = document.createElement('span'), item = document.createElement('span');
      const angle = index * wheelStep;
      slot.className = 'wheel-slot';
      slot.style.setProperty('--letter-angle', `${angle}deg`);
      item.className = `wheel-letter ${className}`;
      item.textContent = letter;
      item.style.setProperty('--letter-upright', `${-angle}deg`);
      slot.append(item);
      ring.append(slot);
    });
  }
  createWheelRing('.wheel-ring-outer', 'wheel-plain');
  createWheelRing('.wheel-ring-inner', 'wheel-shifted');
  function caesarUpdate() { const shift = +$('#shift').value, mode = +$('input[name="caesar-mode"]:checked').value, shifted = C.caesar(C.ALPHABET, shift); $('#shift-value').textContent = shift; $('#wheel-shift-value').textContent = shift; $('#shifted-alphabet').textContent = shifted; $('#caesar-output').textContent = C.caesar($('#caesar-input').value, shift * mode); wheel.style.setProperty('--wheel-turn', `${-shift * wheelStep}deg`); wheel.setAttribute('aria-label', `Caesar cipher wheel. Plain A maps to shifted ${shifted[0]} at shift ${shift}.`); $('.wheel-plain.reference').classList.remove('reference'); $('.wheel-shifted.reference')?.classList.remove('reference'); $('.wheel-plain').classList.add('reference'); $$('.wheel-shifted')[shift].classList.add('reference'); }
  ['input','change'].forEach(e => { $('#shift').addEventListener(e, caesarUpdate); $('#caesar-input').addEventListener(e, caesarUpdate); $$('input[name="caesar-mode"]').forEach(x => x.addEventListener(e, caesarUpdate)); });
  $('#shift-minus').onclick = () => { $('#shift').value = Math.max(0, +$('#shift').value - 1); caesarUpdate(); }; $('#shift-plus').onclick = () => { $('#shift').value = Math.min(25, +$('#shift').value + 1); caesarUpdate(); };
  function rotUpdate() { const one = C.rot13($('#rot-input').value); $('#rot-output').textContent = one; $('#rot-twice').textContent = C.rot13(one); } $('#rot-input').addEventListener('input', rotUpdate); $('#rot-again').onclick = () => { $('#rot-input').value = C.rot13($('#rot-input').value); rotUpdate(); };
  function randomAlphabet() { const chars = [...C.ALPHABET]; for (let i = chars.length - 1; i; i--) { const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1); [chars[i], chars[j]] = [chars[j], chars[i]]; } return chars.join(''); }
  function subUpdate() { const input = $('#sub-input').value; $('#sub-alphabet').textContent = substitution; $('#sub-output').textContent = C.substitute(input, substitution); const counts = {}; for (const ch of input.toUpperCase()) if (/[A-Z]/.test(ch)) counts[ch] = (counts[ch] || 0) + 1; const top = Object.entries(counts).sort((a,b) => b[1]-a[1] || a[0].localeCompare(b[0])).slice(0, 6); $('#frequency').innerHTML = top.length ? top.map(([c,n]) => `<div><b>${c}</b><span style="--bar:${n}"></span><em>${n}</em></div>`).join('') : '<p>No letters to display yet.</p>'; } $('#sub-input').addEventListener('input', subUpdate); $('#new-alphabet').onclick = () => { substitution = randomAlphabet(); subUpdate(); };
  const bits = n => n.toString(2).padStart(8, '0');
  function xorUpdate() { const m = $('#xor-message').value, k = $('#xor-key').value; const values = C.xorBytes(m, k); $('#xor-cipher').textContent = values.length ? values.map(n => bits(n)).join(' ') : 'Enter a key to view bytes.'; $('#xor-restored').textContent = k ? C.xorText(C.xorText(m, k), k) : ''; if (!m || !k) { $('#bit-visual').textContent = 'Enter a message and key to light the first byte.'; return; } const a = m.charCodeAt(0), b = k.charCodeAt(0), out = a ^ b; $('#bit-visual').innerHTML = [['MESSAGE BYTE',a],['KEY BYTE',b],['XOR RESULT',out]].map(([label,n]) => `<div><b>${label} · ${n}</b><code>${[...bits(n)].map(x => `<i class="bit bit-${x}">${x}</i>`).join('')}</code></div>`).join(''); } $('#xor-message').addEventListener('input', xorUpdate); $('#xor-key').addEventListener('input', xorUpdate); $('#xor-again').onclick = xorUpdate;
  const examples = { caesar: () => { $('#caesar-input').value = 'HELLO WORLD'; $('#shift').value = 3; caesarUpdate(); }, rot13: () => { $('#rot-input').value = 'THE SECRET IS IN THE MUSEUM'; rotUpdate(); }, substitution: () => { $('#sub-input').value = 'MEET ME AT MIDNIGHT'; subUpdate(); }, xor: () => { $('#xor-message').value = 'HELLO'; $('#xor-key').value = 'KEY'; xorUpdate(); } }; $$('.crypto-preset').forEach(b => b.onclick = () => examples[b.dataset.example]());
  caesarUpdate(); rotUpdate(); subUpdate(); xorUpdate(); show('caesar');
});
