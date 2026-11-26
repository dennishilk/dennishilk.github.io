import {emptyBuild, cloneBuild, totals, spent, requiredLevel, validBuild, changeRank, resetTree, encodeBuild, decodeBuild} from './logic.js';

const words = {
  de: {
    title:'Dein Weg durch das Licht', kicker:'WoW Forever · Paladin',
    protection:'Schutz – Meine Hauptskillung', holy:'Heilig – Meine Zweitskillung',
    planned:'Geplante Level-60-Verteilungen · Schutz als Hauptspec, Heilig als Zweitspec',
    reset:'Alle Punkte zurücksetzen', own:'Eigene Skillung erstellen', share:'Build-Link kopieren',
    treeReset:'Baum zurücksetzen', remaining:'Punkte übrig', level:'Benötigtes Level',
    rank:'Rang', current:'Aktueller Rang', next:'Nächster Rang', maximum:'Maximaler Rang erreicht.',
    noRank:'Noch nicht erlernt.', requires:'Voraussetzungen', earlier:'Punkte in vorherigen Ebenen dieses Baums',
    add:'Punkt hinzufügen', remove:'Punkt entfernen', hint:'Linksklick / Enter: +1 · Rechtsklick / Umschalt+Enter: −1. Pfeiltasten: Talent wählen. Auf dem Handy Talent antippen und die +/−-Tasten unter den Bäumen nutzen.',
    invalid:'Dieser Build-Link ist ungültig oder passt nicht zu diesem Datenstand. Die Schutz-Vorlage wurde geladen.',
    blocked:'Änderung nicht möglich: Punktelimit, Talentrang oder Talentvoraussetzung.',
    copied:'Build-Link kopiert.', copyFallback:'Kopieren nicht möglich. Den Link im Feld markieren und kopieren.',
    selected:'Ausgewähltes Talent', source:'Datenstand', sourceText:'Forever-Client 1.60.1.70755 + dokumentierte Hotfixes vom 3. November. Export: 10. November 2026; geprüft: 25. November. Spätere Live-Anpassungen können abweichen.',
    credits:'Talentdaten: Talents Forever (CC BY 4.0). Spieltexte und Symbole: © Blizzard Entertainment. Eigenständiges, inoffizielles Fan-Tool.',
    translation:'Die deutsche Beschreibung ist eine eigene Übersetzung des geprüften englischen Datensatzes.',
    allRanks:'Alle Ränge lesen', clear:'Eigene Skillung · 0 / 0 / 0', custom:'Eigene Skillung',
    allocation:'Talentverteilung', chosen:'Vorlage geladen', prerequisitesMet:'Voraussetzungen erfüllt.',
  },
  en: {
    title:'Your path through the Light', kicker:'WoW Forever · Paladin',
    protection:'Protection – My Main Spec', holy:'Holy – My Secondary Spec',
    planned:'Planned level-60 allocations · Protection main, Holy secondary',
    reset:'Reset all points', own:'Create your own build', share:'Copy build link',
    treeReset:'Reset tree', remaining:'Points left', level:'Required level',
    rank:'Rank', current:'Current rank', next:'Next rank', maximum:'Maximum rank reached.',
    noRank:'Not learned yet.', requires:'Requirements', earlier:'points in earlier rows of this tree',
    add:'Add point', remove:'Remove point', hint:'Left-click / Enter: +1 · Right-click / Shift+Enter: −1. Arrow keys: choose a talent. On a phone, tap a talent and use the +/− buttons below the trees.',
    invalid:'This build link is invalid or incompatible with this data version. The Protection preset has been loaded.',
    blocked:'Change unavailable: point budget, rank cap or talent prerequisite.',
    copied:'Build link copied.', copyFallback:'Copy unavailable. Select and copy the link from the field.',
    selected:'Selected talent', source:'Data snapshot', sourceText:'Forever client 1.60.1.70755 + recorded November 3 hotfixes. Export: November 10, 2026; checked November 25. Later live tuning may differ.',
    credits:'Talent data: Talents Forever (CC BY 4.0). Game text and icons: © Blizzard Entertainment. Independent, unofficial fan tool.',
    translation:'The German description is our translation of the verified English dataset.',
    allRanks:'Read every rank', clear:'Your own build · 0 / 0 / 0', custom:'Custom build',
    allocation:'Talent allocation', chosen:'Preset loaded', prerequisitesMet:'Requirements met.',
  }
};
const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const roots = [...document.querySelectorAll('[data-paladin-calculator]')];
let data;
try {
  if (roots.length) {
    const response = await fetch(new URL('./data.json?v=20261126-holy', import.meta.url));
    if (!response.ok) throw new Error('Talent data: HTTP ' + response.status);
    data = await response.json();
    for (const root of roots) init(root, data);
  }
} catch (error) {
  for (const root of roots) {
    const text = document.createElement('p');
    text.textContent = root.lang === 'de' ? 'Talentdaten konnten nicht geladen werden. Bitte die Seite erneut laden.' : 'Unable to load talent data. Please reload the page.';
    root.append(text);
  }
  console.error(error);
}

function init(root, data) {
  const lang = root.lang === 'de' ? 'de' : 'en', w = words[lang], uid = 'pt-' + roots.indexOf(root);
  const toolPath = lang === 'de' ? '/de/tools/wow-forever-paladin-talentrechner/' : '/tools/wow-forever-paladin-talent-calculator/';
  let build = cloneBuild(data.presets.protection), selected = [1, 1], label = w.protection, tipOpen = false, visibleTree = 1;
  for (const preset of Object.values(data.presets)) if (!validBuild(data, preset)) throw new Error('Invalid shipped preset');
  root.classList.add('pt');
  root.innerHTML = `<div class="pt-heading"><div><p class="pt-kicker">${w.kicker}</p><h3>${w.title}</h3></div><span class="pt-seal" aria-hidden="true">✦</span></div>
    <p class="pt-planned">${w.planned}</p>
    <div class="pt-presets"><button type="button" data-preset="protection"><span aria-hidden="true">🛡</span><strong>${w.protection}</strong><small>0 / 35 / 16 · Level 60</small></button><button type="button" data-preset="holy"><span aria-hidden="true">☀</span><strong>${w.holy}</strong><small>31 / 5 / 15 · Level 60</small></button></div>
    <div class="pt-summary" aria-live="polite"><span class="pt-build-name"></span><strong class="pt-total"></strong><span class="pt-left"></span><span class="pt-level"></span></div>
    <div class="pt-toolbar"><button type="button" data-own>${w.own}</button><button type="button" data-reset>${w.reset}</button><button type="button" data-share>${w.share} ↗</button></div>
    <label class="pt-share" hidden>${w.share}<input type="url" readonly spellcheck="false"></label>
    <p class="pt-help">${w.hint}</p><p class="pt-status" role="status"></p>
    <div class="pt-tree-tabs" aria-label="${w.allocation}">${data.trees.map((tree,ti)=>`<button type="button" data-mobile-tree="${ti}">${tree.name[lang]} <span data-mobile-total="${ti}">0</span></button>`).join('')}</div>
    <div class="pt-trees">${data.trees.map((tree, ti) => treeMarkup(tree, ti)).join('')}</div>
    <section class="pt-detail" aria-labelledby="${uid}-detail-title"></section>
    <div class="pt-foot"><details><summary>${w.source}</summary><p>${w.sourceText}</p><p>${w.credits}</p><p><a href="https://talentsforever.com/export/paladin.json">Talents Forever · JSON</a> · <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a> · <a href="/assets/wow-forever-paladin/SOURCES.md">${lang === 'de' ? 'Quellen und Anpassungen' : 'Sources and modifications'}</a></p></details></div>
    <div class="pt-tooltip" id="${uid}-tooltip" role="tooltip" hidden></div>`;
  const status = root.querySelector('.pt-status'), detail = root.querySelector('.pt-detail'), tip = root.querySelector('.pt-tooltip');
  // Container queries establish a containing block. Keep viewport-positioned tooltips outside it.
  document.body.append(tip);
  let tipTimer;
  const nodes = [...root.querySelectorAll('[data-talent]')];
  function treeMarkup(tree, ti) {
    const paths = tree.talents.filter(t => t.req).map(t => {
      const parent = tree.talents.find(p => p.id === t.req.id);
      const x1 = (parent.col - .5) * 100, y1 = (parent.row - .5) * 70;
      const x2 = (t.col - .5) * 100, y2 = (t.row - .5) * 70;
      const path = y1 === y2 ? `M${x1+30},${y1} H${x2-32}` : `M${x1},${y1+26} V${y2-30} H${x2}`;
      return `<path data-edge="${t.id}" d="${path}" marker-end="url(#${uid}-${ti}-arrow)"/>`;
    }).join('');
    return `<section class="pt-tree pt-${tree.id}" aria-labelledby="${uid}-tree-${ti}"><header><div><small>0${ti+1}</small><h4 id="${uid}-tree-${ti}">${tree.name[lang]}</h4></div><strong data-tree-total="${ti}">0</strong></header>
      <div class="pt-grid"><svg class="pt-arrows" viewBox="0 0 400 490" preserveAspectRatio="none" aria-hidden="true"><defs><marker id="${uid}-${ti}-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10" fill="currentColor"/></marker></defs>${paths}</svg>
      ${tree.talents.map((t, i) => `<button type="button" class="pt-node" data-talent="${ti}:${i}" style="grid-row:${t.row};grid-column:${t.col}" aria-describedby="${uid}-tooltip"><img src="/assets/wow-forever-paladin/icons/${t.icon}.jpg" alt="" width="56" height="56" loading="lazy"><span class="pt-rank">0/${t.max}</span></button>`).join('')}</div>
      <button type="button" class="pt-tree-reset" data-tree-reset="${ti}">${w.treeReset}</button></section>`;
  }
  function requirements(ti, t) {
    const result = [(t.row - 1) * 5 + ' ' + w.earlier];
    if (t.req) result.push(data.trees[ti].talents.find(p => p.id === t.req.id).name[lang] + ' ' + t.req.rank + '/' + t.req.rank);
    return result.join(' · ');
  }
  function description(ti, i) {
    const t = data.trees[ti].talents[i], rank = build[ti][i];
    let cost = t.cost;
    if (lang === 'de') cost = cost.replaceAll('of base mana','des Grundmanas').replaceAll('Enemy:','Feindlich:').replaceAll('Friendly:','Freundlich:').replaceAll('yd range','m Reichweite').replaceAll('Instant','Sofort').replaceAll('cooldown','Abklingzeit').replaceAll('sec cast','Sek. Zauberzeit').replaceAll('sec','Sek.').replaceAll('Requires Shields','Benötigt einen Schild');
    return `<h4>${escapeHTML(t.name[lang])}</h4><p class="pt-rank-label">${w.rank} ${rank} / ${t.max}</p>${cost ? `<p class="pt-cost">${escapeHTML(cost)}</p>` : ''}<p><strong>${w.current}:</strong> ${escapeHTML(rank ? t.desc[lang][rank-1] : w.noRank)}</p><p><strong>${w.next}:</strong> ${escapeHTML(rank < t.max ? t.desc[lang][rank] : w.maximum)}</p><p class="pt-requirements"><strong>${w.requires}:</strong> ${escapeHTML(requirements(ti, t))}</p>`;
  }
  function renderDetails() {
    const activeAction = detail.contains(document.activeElement) ? document.activeElement?.hasAttribute('data-add') ? '[data-add]' : document.activeElement?.hasAttribute('data-remove') ? '[data-remove]' : null : null;
    const [ti, i] = selected, t = data.trees[ti].talents[i];
    detail.innerHTML = `<div class="pt-detail-head"><span class="pt-kicker" id="${uid}-detail-title">${w.selected}</span><div class="pt-point-controls"><button type="button" data-remove aria-label="${w.remove}" ${changeRank(data,build,ti,i,-1) ? '' : 'disabled'}>−</button><button type="button" data-add aria-label="${w.add}" ${changeRank(data,build,ti,i,1) ? '' : 'disabled'}>+</button></div></div>${description(ti,i)}${lang === 'de' && t.translation === 'site' ? `<small>${w.translation}</small>` : ''}<details class="pt-ranks"><summary>${w.allRanks}</summary><ol>${t.desc[lang].map((text,j) => `<li value="${j+1}">${escapeHTML(text)}</li>`).join('')}</ol></details>`;
    detail.querySelector('[data-remove]').onclick = () => modify(ti,i,-1);
    detail.querySelector('[data-add]').onclick = () => modify(ti,i,1);
    if (activeAction) {
      const preferred=detail.querySelector(activeAction);
      (preferred.disabled ? detail.querySelector(activeAction==='[data-add]'?'[data-remove]':'[data-add]') : preferred)?.focus({preventScroll:true});
    }
  }
  function update() {
    root.dataset.visibleTree=String(visibleTree);
    for(const button of root.querySelectorAll('[data-mobile-tree]')) button.setAttribute('aria-pressed',String(Number(button.dataset.mobileTree)===visibleTree));
    root.querySelector('.pt-build-name').textContent = label;
    root.querySelector('.pt-total').textContent = totals(build).join(' / ');
    root.querySelector('.pt-left').textContent = `${51-spent(build)} / 51 ${w.remaining}`;
    root.querySelector('.pt-level').textContent = `${w.level}: ${requiredLevel(build)}`;
    for (const button of root.querySelectorAll('[data-preset]')) button.setAttribute('aria-pressed', String(JSON.stringify(build) === JSON.stringify(data.presets[button.dataset.preset])));
    totals(build).forEach((n, ti) => {root.querySelector(`[data-tree-total="${ti}"]`).textContent=n;root.querySelector(`[data-mobile-total="${ti}"]`).textContent=n;});
    for (const node of nodes) {
      const [ti,i]=node.dataset.talent.split(':').map(Number), t=data.trees[ti].talents[i], rank=build[ti][i];
      const available=!!changeRank(data,build,ti,i,1);
      node.classList.toggle('is-full',rank===t.max); node.classList.toggle('is-partial',rank>0 && rank<t.max); node.classList.toggle('is-locked',!rank&&!available); node.classList.toggle('is-selected',ti===selected[0]&&i===selected[1]);
      node.querySelector('.pt-rank').textContent=`${rank}/${t.max}`;
      node.setAttribute('aria-label',`${t.name[lang]} · ${w.rank} ${rank}/${t.max}`);
      node.dataset.unavailable=String(!available); // Keep inspection/removal available, including at max rank.
      if (t.req) root.querySelector(`[data-edge="${t.id}"]`).classList.toggle('is-active',build[ti][data.trees[ti].talents.findIndex(p=>p.id===t.req.id)]>=t.req.rank);
    }
    renderDetails();
    if (tipOpen) tip.innerHTML=description(...selected);
  }
  function shareURL() {const url=new URL(toolPath,location.origin);url.hash='paladin='+encodeBuild(data,build);return url.href;}
  function changed() {
    const url=new URL(location.href);url.hash='paladin='+encodeBuild(data,build);history.replaceState(null,'',url);
    const input=root.querySelector('.pt-share input');input.value=shareURL();
    update();
  }
  function modify(ti,i,delta) {
    selected=[ti,i];const next=changeRank(data,build,ti,i,delta);
    if (next) {build=next;label=w.custom;status.textContent='';changed();}
    else {status.textContent=w.blocked;update();}
  }
  function hideTip() {clearTimeout(tipTimer);tip.hidden=true;tipOpen=false;}
  function showTip(node) {
    selected=node.dataset.talent.split(':').map(Number);tip.innerHTML=description(...selected);tip.hidden=false;tipOpen=true;
    const rect=node.getBoundingClientRect(),width=Math.min(350,innerWidth-24);
    tip.style.width=width+'px';tip.style.left=Math.max(12,Math.min(innerWidth-width-12,rect.left))+'px';
    const height=tip.getBoundingClientRect().height;
    tip.style.top=Math.max(8,Math.min(innerHeight-height-8,rect.bottom+12))+'px';
  }
  for (const node of nodes) {
    const [ti,i]=node.dataset.talent.split(':').map(Number);
    node.onclick=event=>{hideTip();modify(ti,i,event.shiftKey?-1:1);};
    node.oncontextmenu=event=>{event.preventDefault();hideTip();modify(ti,i,-1);};
    node.onpointerenter=event=>{if(event.pointerType!=='touch')showTip(node);};
    node.onpointerleave=()=>{tipTimer=setTimeout(()=>{if(!tip.matches(':hover'))hideTip();},180);};
    node.onfocus=()=>{selected=[ti,i];renderDetails();if(matchMedia('(hover:hover)').matches)showTip(node);};
    node.onblur=hideTip;
    node.onkeydown=event=>{
      if(event.key==='Escape') {hideTip();event.preventDefault();}
      if(['+','=','-','Delete','Backspace'].includes(event.key)||event.shiftKey&&['Enter',' '].includes(event.key)) {event.preventDefault();hideTip();modify(ti,i,['-','Delete','Backspace'].includes(event.key)||event.shiftKey?-1:1);}
      const shifts={ArrowLeft:[0,-1],ArrowRight:[0,1],ArrowUp:[-1,0],ArrowDown:[1,0]};
      if(shifts[event.key]) {
        event.preventDefault();const t=data.trees[ti].talents[i],[dr,dc]=shifts[event.key];
        const options=data.trees[ti].talents.map((p,j)=>({p,j})).filter(({p})=>dr ? p.col===t.col && (p.row-t.row)*dr>0 : p.row===t.row && (p.col-t.col)*dc>0).sort((a,b)=>Math.abs(a.p.row-t.row)+Math.abs(a.p.col-t.col)-Math.abs(b.p.row-t.row)-Math.abs(b.p.col-t.col));
        if(options[0]) root.querySelector(`[data-talent="${ti}:${options[0].j}"]`).focus();
      }
    };
  }
  for (const button of root.querySelectorAll('[data-preset]')) button.onclick=()=>{hideTip();const key=button.dataset.preset;build=cloneBuild(data.presets[key]);label=w[key];selected=key==='protection'?[1,16]:[0,16];visibleTree=selected[0];status.textContent=w.chosen;changed();};
  for(const button of root.querySelectorAll('[data-mobile-tree]')) button.onclick=()=>{hideTip();visibleTree=Number(button.dataset.mobileTree);selected=[visibleTree,0];update();};
  function clear() {hideTip();build=emptyBuild(data);label=w.custom;selected=[0,0];visibleTree=0;status.textContent=w.clear;changed();}
  root.querySelector('[data-own]').onclick=clear;
  root.querySelector('[data-reset]').onclick=clear;
  for(const button of root.querySelectorAll('[data-tree-reset]')) button.onclick=()=>{hideTip();build=resetTree(data,build,Number(button.dataset.treeReset));label=w.custom;status.textContent='';changed();};
  root.querySelector('[data-share]').onclick=async()=>{
    const field=root.querySelector('.pt-share'),input=field.querySelector('input');field.hidden=false;input.value=shareURL();
    try {await navigator.clipboard.writeText(input.value);status.textContent=w.copied;}
    catch {status.textContent=w.copyFallback;input.focus();input.select();}
  };
  function loadHash() {
    if (!location.hash.startsWith('#paladin=')) return;
    const loaded=decodeBuild(data,location.hash.slice(9));
    build=loaded||cloneBuild(data.presets.protection);label=loaded?w.custom:w.protection;status.textContent=loaded?'':w.invalid;update();
  }
  window.addEventListener('hashchange',loadHash);
  window.addEventListener('scroll',hideTip,{passive:true});
  window.addEventListener('resize',hideTip);
  tip.onpointerenter=()=>clearTimeout(tipTimer);
  tip.onpointerleave=hideTip;
  // Hover details must remain dismissible with Escape, including outside node focus.
  root.addEventListener('keydown',event=>{if(event.key==='Escape')hideTip();});
  update();loadHash();root.dataset.ready='true';
}
