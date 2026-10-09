import { searchMatches, canonicalSolutionUrl, shareIntent, moveAssistant } from './core.js';

const language = document.documentElement.lang === 'de' ? 'de' : 'en';
const de = language === 'de';
const t = de ? {
  copied:'Kopiert.', copyFailed:'Kopieren ist gesperrt. Markiere den Text und kopiere ihn selbst.',
  solved:'Schön, dass es geholfen hat! Du kannst genau diesen Hinweis teilen. Die Bestätigung bleibt in diesem Browser.',
  share:'Hinweis teilen', close:'Schließen', message:'Nachricht vor dem Teilen bearbeiten', instance:'Deine Fediverse-Instanz (Domain)',
  copy:'Direktlink kopieren', native:'Über das Gerät teilen', openMastodon:'Bei deiner Instanz öffnen', openX:'Bei X öffnen', openFacebook:'Bei Facebook öffnen',
  defaultMessage:'Ein Linux-Hinweis, der bei der Fehlersuche helfen kann. 🐧', successMessage:'Dieser Hinweis hat mir geholfen, mein Linux-Problem zu lösen! 🐧',
  instanceError:'Bitte eine öffentliche HTTPS-Domain ohne Pfad, Port oder Zugangsdaten eingeben.',
  shareNote:'Es wird nichts automatisch veröffentlicht. Die gewählte Plattform öffnet ihren Entwurf. Der Link enthält keine Logs. Manche Fediverse-Server unterstützen /share nicht; dann hilft „Direktlink kopieren“. Facebook übernimmt nur den Link.',
  nativeUnavailable:'Die Geräte-Freigabe ist hier nicht verfügbar. Kopiere den Direktlink.', nativeFailed:'Die Freigabe wurde abgebrochen oder ist gesperrt. Du kannst den Direktlink kopieren.',
  externalFallback:'Falls sich kein Entwurf öffnet, nutze diesen Link:', openPrepared:'Vorbereitete Freigabeseite öffnen',
  count:n=>`${n} passende Probleme`, noResults:'Keine Treffer. Versuche einen kürzeren Begriff oder einen anderen Bereich.',
  back:'Zurück', restart:'Von vorn beginnen', why:'Warum diese Frage?', command:'Sicherer nächster Prüfschritt', result:'Einordnung', read:'Passende Anleitung',
  uncertainty:'Diese Auswahl grenzt Hinweise ein. Sie bestätigt keine Ursache und führt keine Befehle aus.', invalid:'Diese Diagnoseposition ist nicht vorhanden. Wähle eine Diagnosehilfe.',
} : {
  copied:'Copied.', copyFailed:'Clipboard access is blocked. Select the text and copy it manually.',
  solved:'Glad it helped! You can share this specific solution. The confirmation stays in this browser.',
  share:'Share this solution', close:'Close', message:'Edit the message before sharing', instance:'Your Fediverse instance (domain)',
  copy:'Copy direct link', native:'Share through your device', openMastodon:'Open on your instance', openX:'Open on X', openFacebook:'Open on Facebook',
  defaultMessage:'A Linux reference that may help with troubleshooting. 🐧', successMessage:'This helped me solve my Linux problem! 🐧',
  instanceError:'Enter a public HTTPS domain without a path, port or credentials.',
  shareNote:'Nothing is published automatically. The selected platform opens its draft. The link contains no logs. Some Fediverse servers do not support /share; use “Copy direct link” there. Facebook accepts only the link.',
  nativeUnavailable:'Device sharing is unavailable here. Copy the direct link.', nativeFailed:'Sharing was cancelled or blocked. You can copy the direct link.',
  externalFallback:'If no draft opens, use this link:', openPrepared:'Open the prepared share page',
  count:n=>`${n} matching problems`, noResults:'No matches. Try a shorter term or a different category.',
  back:'Back', restart:'Start again', why:'Why this question?', command:'Safe next diagnostic step', result:'Interpretation', read:'Relevant guide',
  uncertainty:'These choices narrow the evidence. They do not confirm a root cause or execute commands.', invalid:'This diagnostic position does not exist. Choose an assistant.',
};

const element = (tag, text, className) => {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
};
const button = (text, action) => {
  const node = element('button', text, 'lab-button'); node.type = 'button'; node.addEventListener('click', action); return node;
};
const announce = text => { const status = document.getElementById('ui-status'); if (status) status.textContent = text; };
async function copyText(text, container) {
  try { await navigator.clipboard.writeText(text); announce(t.copied); return true; }
  catch {
    container.querySelector('[data-copy-fallback]')?.remove();
    const field = element('textarea'); field.value = text; field.readOnly = true; field.dataset.copyFallback = '';
    field.setAttribute('aria-label', t.copyFailed); container.append(field); field.focus(); field.select(); announce(t.copyFailed); return false;
  }
}

for (const node of document.querySelectorAll('[data-js]')) node.hidden = false;
for (const control of document.querySelectorAll('[data-copy-command]')) {
  control.addEventListener('click', () => copyText(control.closest('.lab-command').querySelector('code').textContent, control.parentElement));
}

function solvedKey(id) { return `linux-fix-lab:solved:v1:${document.body.dataset.problemId}:${id}`; }
function wasSolved(id) { try { return localStorage.getItem(solvedKey(id)) === 'yes'; } catch { return false; } }
for (const control of document.querySelectorAll('[data-solved]')) {
  const solution = control.dataset.solved;
  const feedback = document.getElementById(`feedback-${solution}`);
  if (wasSolved(solution)) { control.setAttribute('aria-pressed','true'); feedback.textContent = t.solved; }
  control.addEventListener('click', () => {
    try { localStorage.setItem(solvedKey(solution), 'yes'); } catch { /* Confirmation also works without storage. */ }
    control.setAttribute('aria-pressed','true'); feedback.textContent = t.solved;
    control.closest('.lab-solution').querySelector('[data-share]').dataset.solvedShare = 'true';
  });
}

let activeDialog;
function openShare(anchor, successful = false) {
  activeDialog?.remove();
  const path = document.body.dataset.canonicalPath;
  const url = canonicalSolutionUrl(path, anchor);
  const dialog = element('dialog', undefined, 'share-dialog'); activeDialog = dialog;
  dialog.setAttribute('aria-labelledby','share-title');
  const previouslyFocused = document.activeElement;
  const close = () => { if (dialog.open && dialog.close) dialog.close(); dialog.remove(); activeDialog = null; previouslyFocused?.focus(); };
  dialog.append(button(t.close, close)); dialog.firstElementChild.classList.add('share-close');
  const title = element('h2', t.share); title.id = 'share-title'; dialog.append(title);
  const direct = element('p', url, 'share-url'); dialog.append(direct);
  const label = element('label', t.message); label.htmlFor = 'share-message';
  const message = element('textarea'); message.id = 'share-message'; message.maxLength = 500; message.value = successful ? t.successMessage : t.defaultMessage;
  dialog.append(label, message);
  const instanceLabel = element('label', t.instance); instanceLabel.htmlFor = 'share-instance';
  const instance = element('input'); instance.id = 'share-instance'; instance.type = 'text'; instance.placeholder = 'social.example.org'; instance.autocomplete = 'off';
  dialog.append(instanceLabel, instance);
  const feedback = element('p', '', 'lab-status'); feedback.setAttribute('role','status');
  const actions = element('div', undefined, 'share-actions');
  const intent = service => {
    try {
      const href = shareIntent(service,{url,message:message.value,instance:instance.value});
      window.open(href, '_blank', 'noopener,noreferrer');
      const manual=element('a',t.openPrepared);manual.href=href;manual.target='_blank';manual.rel='noopener noreferrer';
      feedback.replaceChildren(document.createTextNode(`${t.externalFallback} `),manual);
    } catch { feedback.textContent = t.instanceError; instance.setAttribute('aria-invalid','true'); instance.focus(); }
  };
  instance.addEventListener('input', () => instance.removeAttribute('aria-invalid'));
  actions.append(button(t.openMastodon, () => intent('mastodon')), button(t.openX, () => intent('x')), button(t.openFacebook, () => intent('facebook')),
    button(t.copy, async () => { if (await copyText(url, dialog)) feedback.textContent = t.copied; else feedback.textContent = t.copyFailed; }),
    button(t.native, async () => {
      if (!navigator.share) { feedback.textContent = t.nativeUnavailable; return; }
      try { await navigator.share({title:document.title,text:message.value,url}); }
      catch { feedback.textContent = t.nativeFailed; }
    }));
  dialog.append(actions,feedback,element('p',t.shareNote,'lab-muted'));
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  dialog.addEventListener('click', event => { if (event.target === dialog && event.clientX && (event.offsetX < 0 || event.offsetY < 0)) close(); });
  document.body.append(dialog);
  if (dialog.showModal) dialog.showModal();
  else { dialog.setAttribute('open',''); dialog.setAttribute('role','dialog'); dialog.setAttribute('aria-modal','true'); }
  dialog.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); close(); }
    if (event.key !== 'Tab') return;
    const focusable = [...dialog.querySelectorAll('button,input,textarea,a[href]')];
    const first = focusable[0], last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  message.focus();
}
for (const link of document.querySelectorAll('[data-share]')) link.addEventListener('click', event => {
  event.preventDefault(); const anchor = link.dataset.share || ''; openShare(anchor, link.dataset.solvedShare === 'true' || (anchor && wasSolved(anchor)));
});

// Persist only search and wizard navigation in the local URL, never log contents.
function syncLanguageLink() {
  const control = document.querySelector('a.language-link');
  if (!control) return;
  const target = new URL(control.getAttribute('href'), location.href);
  const current = new URL(location.href);
  target.search = '';
  for (const name of ['q','category']) if (current.searchParams.has(name)) target.searchParams.set(name,current.searchParams.get(name).slice(0,200));
  target.hash = current.hash;
  control.setAttribute('href', `${target.pathname}${target.search}${target.hash}`);
}
window.addEventListener('hashchange', syncLanguageLink); syncLanguageLink();

const search = document.getElementById('problem-search');
if (search) {
  const category = document.getElementById('problem-category');
  const cards = [...document.querySelectorAll('[data-problem]')];
  const status = document.getElementById('search-status');
  const empty = document.getElementById('search-empty');
  const params = new URL(location.href).searchParams;
  search.value = (params.get('q') || '').slice(0,200);
  if ([...category.options].some(option => option.value === params.get('category'))) category.value = params.get('category');
  const filter = () => {
    let count = 0;
    for (const card of cards) {
      const show = (!category.value || card.dataset.category === category.value) && searchMatches(card.dataset.search,search.value);
      card.hidden = !show; if (show) count++;
    }
    status.textContent = t.count(count); empty.hidden = Boolean(count);
    const url = new URL(location.href); url.search = '';
    if (search.value.trim()) url.searchParams.set('q', search.value.trim().slice(0,200));
    if (category.value) url.searchParams.set('category', category.value);
    history.replaceState(null,'',`${url.pathname}${url.search}${url.hash}`); syncLanguageLink();
    for (const link of document.querySelectorAll('[data-category-filter]')) {
      if (link.dataset.categoryFilter === category.value) link.setAttribute('aria-current','true'); else link.removeAttribute('aria-current');
    }
  };
  search.addEventListener('input',filter); category.addEventListener('change',filter);
  document.getElementById('search-reset').addEventListener('click',() => { search.value = ''; category.value = ''; filter(); search.focus(); });
  for (const link of document.querySelectorAll('[data-category-filter]')) link.addEventListener('click',event => { event.preventDefault(); category.value = link.dataset.categoryFilter; filter(); search.focus(); });
  filter();
}

const assistantData = document.getElementById('assistant-data');
if (assistantData) {
  const trees = JSON.parse(assistantData.textContent);
  const panel = document.getElementById('assistant-panel');
  let historyNodes = [];
  const parsePosition = () => {
    const match = location.hash.match(/^#assistant\/([a-z0-9-]+)\/([a-z0-9-]+)$/);
    return match && {id:match[1],node:match[2]};
  };
  const position = (id,node) => { location.hash = `assistant/${id}/${node}`; };
  const recoverPath = (tree,target) => {
    const queue = [[tree.start]], seen = new Set();
    while (queue.length) {
      const path = queue.shift(), current = path.at(-1);
      if (current === target) return path.slice(0,-1);
      if (seen.has(current)) continue; seen.add(current);
      for (const choice of tree.nodes[current]?.choices || []) queue.push([...path,choice.next]);
    }
    return [];
  };
  const render = focus => {
    const selected = parsePosition();
    if (!selected) { panel.hidden = true; return; }
    const tree = trees.find(item=>item.id === selected.id), node = tree?.nodes[selected.node];
    if (!node) { panel.hidden = false; panel.replaceChildren(element('p',t.invalid)); return; }
    panel.hidden = false; panel.replaceChildren(); historyNodes = recoverPath(tree,selected.node);
    const title = element('h3',node.question?.[language] || node.heading[language],'assistant-question'); title.tabIndex = -1;
    panel.append(element('p',tree.title[language],'eyebrow'),title,element('p',node.why?.[language] || node.body[language]));
    if (node.question) {
      const why = panel.lastElementChild; why.insertBefore(element('strong',`${t.why} `),why.firstChild);
      for (const diagnostic of node.diagnostics || []) {
        panel.append(element('p',t.command,'lab-muted'),element('pre',diagnostic.command),element('p',diagnostic.interpretation[language]));
      }
      const choices = element('div',undefined,'assistant-choices');
      node.choices.forEach((choice,index) => choices.append(button(choice.label[language],()=>position(tree.id,moveAssistant(tree,selected.node,index)))));
      panel.append(choices);
    } else {
      const links = element('ul');
      for (const guide of node.guides) { const li = element('li'),a = element('a',guide.title[language]); a.href = guide.path[language]+'#diagnostics'; li.append(a); links.append(li); }
      panel.append(links);
    }
    const nav = element('div',undefined,'lab-actions');
    const back = button(t.back,()=>position(tree.id,historyNodes.at(-1))); back.disabled = !historyNodes.length;
    nav.append(back,button(t.restart,()=>position(tree.id,tree.start))); panel.append(nav,element('p',t.uncertainty,'lab-source-note'));
    if (focus) title.focus();
  };
  for (const control of document.querySelectorAll('[data-assistant]')) control.addEventListener('click',()=> {
    const tree = trees.find(item=>item.id === control.dataset.assistant); position(tree.id,tree.start);
  });
  window.addEventListener('hashchange',()=>render(true)); render(false);
}
