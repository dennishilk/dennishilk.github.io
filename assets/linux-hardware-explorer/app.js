import { LocalAnalysis } from './controller.js';
import { LIMITS, filterProfiles, publicSummary, redactHardwareReport, canonicalPublicUrl, contextHash, validPublicContext, matchReason, landingPath, profilePath } from './core.js';
import { shareIntent, moveAssistant } from '../linux-fix-lab/core.js';

// Public article pages need command copying and sharing, not the entire device database.
const [catalogModule, workflowModule] = document.getElementById('hardware-report') ?
  await Promise.all([import('./catalog.js'), import('./workflows.js')]) :
  [{ catalog: { profiles: [], categories: {}, problems: [] } }, { workflows: [] }];
const { catalog } = catalogModule, { workflows } = workflowModule;

const language = document.documentElement.lang === 'de' ? 'de' : 'en';
const t = (en, de) => language === 'de' ? de : en;
const $ = id => document.getElementById(id);
const profiles = new Map(catalog.profiles.map(p => [p.id, p]));
const problems = new Map(catalog.problems.map(p => [p.id, p]));
const el = (tag, text = '', className = '') => {
  const node = document.createElement(tag); node.textContent = text;
  if (className) node.className = className; return node;
};
const link = (text, path) => { const node = el('a', text); node.href = path; return node; };
const button = (text, action, className = 'lab-button') => {
  const node = el('button', text, className); node.type = 'button'; node.addEventListener('click', action); return node;
};
const local = value => value[language];
const status = text => { const target = $('hardware-ui-status'); if (target) target.textContent = text; };
let privateEpoch = 0, lastResults = [], currentContext = {}, flowHistory = [], shareDialog = null, shareTarget = null;
let fallback = $('hardware-copy-fallback');
const objectUrls = new Set();
const canWork = typeof Worker === 'function';

function copyFallback(value) {
  if (!fallback) {
    fallback = el('textarea'); fallback.readOnly = true;
    fallback.setAttribute('aria-label', t('Text for manual copying', 'Text zum manuellen Kopieren'));
    document.body.append(fallback);
  }
  fallback.value = value; fallback.hidden = false; fallback.focus(); fallback.select();
  status(t('Select and copy the displayed text manually.', 'Den angezeigten Text auswählen und von Hand kopieren.'));
}
async function copy(value) {
  const epoch = privateEpoch;
  try {
    if (!navigator.clipboard?.writeText) throw new Error('unavailable');
    await navigator.clipboard.writeText(value);
    if (epoch === privateEpoch) status(t('Copied.', 'Kopiert.'));
  } catch { if (epoch === privateEpoch) copyFallback(value); }
}
function command(value) {
  const box = el('div', '', 'hardware-command'), pre = el('pre'); pre.tabIndex = 0;
  pre.append(el('code', value)); box.append(pre, button(t('Copy command', 'Befehl kopieren'), () => copy(value)));
  return box;
}
function fact(list, name, value) { list.append(el('dt', name), el('dd', String(value))); }
function guideList(ids) {
  const list = el('ul');
  for (const id of [...new Set(ids)]) {
    const p = problems.get(id); if (!p) continue;
    const row = el('li'); row.append(link(local(p.title), p.path[language]), document.createTextNode(' · '),
      link(t('First documented next step', 'Erster dokumentierter Hinweis'), p.path[language] + '#' + p.solution)); list.append(row);
  }
  return list;
}
function setContext(value) {
  currentContext = validPublicContext(value, catalog, workflows);
  const hash = contextHash(currentContext, catalog, workflows);
  // Never copy the current query string or arbitrary fragments to another language.
  const languageLink = document.querySelector('a.language-link[hreflang]');
  if (languageLink) {
    const path = document.body.dataset.canonicalPath;
    languageLink.href = (language === 'de' ? path.replace(/^\/de\//, '/') : '/de' + path) + hash;
  }
  if (location.pathname.replace(/index\.html$/, '') === landingPath(language)) history.replaceState(null, '', landingPath(language) + hash);
}
function firmwareLabel(state) {
  return ({ required: t('Host-loaded firmware required', 'Vom Host geladene Firmware erforderlich'), conditional: t('Conditional firmware path', 'Bedingter Firmwareweg'),
    'device-dependent': t('Device/revision dependent', 'Geräte- und revisionsabhängig'), 'none-documented': t('No host payload established here', 'Hier keine Host-Datei belegt') })[state];
}
function bindingLabel(binding) {
  return ({ 'reported-bound': t('Driver binding reported in input', 'Treiberbindung in der Eingabe gemeldet'), unbound: t('Explicitly reported as unbound', 'Ausdrücklich als ungebunden gemeldet'),
    conflicting: t('Conflicting binding observations', 'Widersprüchliche Bindungsbefunde'), unreported: t('Binding not reported; cannot infer unbound', 'Bindung nicht gemeldet; ungebunden ist nicht ableitbar') })[binding];
}
function profileLinks(result, limit = 8) {
  const list = el('ul');
  for (const match of result.matches.slice(0, limit)) {
    const p = profiles.get(match.profileId); if (!p) continue;
    const item = el('li'); item.append(link(local(p.name), p.path[language]), el('p', matchReason(match.reason, language), 'lab-muted'),
      button(t('Keep this public profile as context', 'Dieses öffentliche Profil als Kontext merken'), () => {
        setContext({ ...currentContext, profile: p.id }); status(t('Public profile selected for language switching.', 'Öffentliches Profil für Sprachwechsel gewählt.'));
      })); list.append(item);
  }
  if (result.matches.length > limit) list.append(el('li', t(`${result.matches.length - limit} more context profiles. Narrow the catalog by driver or ID.`, `${result.matches.length - limit} weitere Kontextprofile. Grenze den Katalog nach Treiber oder ID ein.`)));
  return list;
}
const VENDORS = { pci: { '1002': 'AMD', '10de': 'NVIDIA', '8086': 'Intel', '1022': 'AMD', '10ec': 'Realtek', '14e4': 'Broadcom', '168c': 'Qualcomm Atheros', '17cb': 'Qualcomm', '1b21': 'ASMedia', '1b4b': 'Marvell', '15ad': 'VMware', '1af4': 'Virtio' },
  usb: { '046d': 'Logitech', '0bda': 'Realtek', '8087': 'Intel', '0a12': 'Cambridge Silicon Radio', '0b95': 'ASIX', '0e8d': 'MediaTek', '1d6b': 'Linux Foundation' } };
function deviceCard(result) {
  const d = result.device, matched = result.matches.map(m => profiles.get(m.profileId)).filter(Boolean);
  const card = el('article', '', 'hardware-device');
  const identity = d.vendor && d.device ? `${d.bus.toUpperCase()} ${d.vendor}:${d.device}` : t('Identity incomplete', 'Identität unvollständig');
  card.append(el('h3', `${t('Device', 'Gerät')} ${d.index + 1} · ${identity}`));
  card.append(el('p', result.coverage === 'curated-id' ? t('Curated identity evidence; operation untested', 'Kuratierter Identitätsbeleg; Funktion ungeprüft') :
    result.matches.length ? t('Candidate context; exact product not established', 'Möglicher Kontext; exaktes Produkt nicht belegt') : t('Unknown to this curated catalog', 'In diesem kuratierten Katalog unbekannt'), 'hardware-badge'));
  const panels = new Map(), tabs = el('div', '', 'hardware-tabs'); tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', t('Device information', 'Geräteinformationen'));
  const labels = [['overview', t('Overview', 'Überblick')], ['driver', t('Driver', 'Treiber')], ['firmware', 'Firmware'], ['diagnostics', t('Diagnostics', 'Diagnose')], ['issues', t('Known issues', 'Fehlerhilfen')], ['references', t('References', 'Quellen')]];
  function activate(index, focus = false) {
    [...tabs.children].forEach((tab, i) => { tab.setAttribute('aria-selected', String(i === index)); tab.tabIndex = i === index ? 0 : -1; panels.get(labels[i][0]).hidden = i !== index; });
    if (focus) tabs.children[index].focus();
  }
  for (const [index, [id, name]] of labels.entries()) {
    const tabId = `device-${d.index}-${id}-tab`, panelId = `device-${d.index}-${id}-panel`;
    const tab = button(name, () => activate(index), ''); tab.id = tabId; tab.setAttribute('role', 'tab'); tab.setAttribute('aria-controls', panelId);
    tab.addEventListener('keydown', event => {
      let next = index;
      if (event.key === 'ArrowRight') next = (index + 1) % labels.length;
      else if (event.key === 'ArrowLeft') next = (index + labels.length - 1) % labels.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = labels.length - 1;
      else return;
      event.preventDefault(); activate(next, true);
    });
    tabs.append(tab);
    const panel = el('section'); panel.id = panelId; panel.setAttribute('role', 'tabpanel'); panel.setAttribute('aria-labelledby', tabId); panel.tabIndex = 0; panels.set(id, panel);
  }
  const overview = panels.get('overview'), facts = el('dl', '', 'hardware-facts');
  fact(facts, t('Vendor evidence', 'Herstellerhinweis'), VENDORS[d.bus]?.[d.vendor] || t('Name not established here', 'Name hier nicht belegt'));
  if (d.reportedLabel) fact(facts, t('Input label (unverified)', 'Eingabebezeichnung (ungeprüft)'), d.reportedLabel);
  if (d.classCode) fact(facts, t('Reported class', 'Gemeldete Klasse'), d.classCode);
  if (d.subsystemVendor || d.subsystemDevice) fact(facts, t('Subsystem', 'Subsystem'), `${d.subsystemVendor || '?'}:${d.subsystemDevice || '?'}`);
  if (d.revision) fact(facts, t('Revision', 'Revision'), d.revision);
  if (d.bdf || d.usbAddress) fact(facts, t('Local bus address (excluded from export)', 'Lokale Busadresse (im Export weggelassen)'), d.bdf || d.usbAddress);
  if (d.usbInterfaceTriplets.length) fact(facts, t('USB interface classes', 'USB-Schnittstellenklassen'), d.usbInterfaceTriplets.join(', '));
  overview.append(facts, el('p', t('A device label, chipset family and marketed product are different facts. Detection does not establish successful initialization or use.', 'Gerätebezeichnung, Chipfamilie und Verkaufsprodukt sind verschiedene Angaben. Erkennung bestätigt weder erfolgreiche Initialisierung noch Nutzung.')));
  overview.append(profileLinks(result));
  if (!matched.length) overview.append(el('p', t('Keep the numeric ID and read upstream or distribution evidence. No catalog match does not mean unsupported hardware.', 'Behalte die numerische ID und prüfe Upstream- oder Distributionsbelege. Ein fehlender Katalogtreffer bedeutet keine fehlende Unterstützung.')));
  const driver = panels.get('driver'); driver.append(el('p', bindingLabel(result.binding), 'hardware-badge'));
  if (result.boundDriver) driver.append(el('p', `${t('Reported bound driver', 'Gemeldeter gebundener Treiber')}: ${result.boundDriver}`));
  if (d.reportedModules.length) driver.append(el('p', `${t('Input module candidates (not proof of loading)', 'Modulkandidaten der Eingabe (kein Ladenachweis)')}: ${d.reportedModules.join(', ')}`));
  if (result.candidateDrivers.length) driver.append(el('p', `${t('Catalog driver/module candidates', 'Treiber-/Modulkandidaten des Katalogs')}: ${result.candidateDrivers.join(', ')}`));
  if (result.boundMatchesCandidate === false) driver.append(el('p', t('The reported driver differs from the listed candidates. This is a comparison point, not proof of an incorrect binding.', 'Der gemeldete Treiber unterscheidet sich von den Kandidaten. Das ist ein Vergleichspunkt, kein Beweis einer falschen Bindung.')));
  for (const p of matched.slice(0, 8)) driver.append(el('h4', local(p.name)), el('p', local(p.driverNotes)));
  driver.append(link(t('Understand binding and built-in drivers', 'Bindung und fest eingebaute Treiber verstehen'), profilePath('driver-binding', language)));
  const firmware = panels.get('firmware');
  if (!matched.length) firmware.append(el('p', t('Firmware requirements unknown for this identity. A loading-error count cannot identify the correct payload.', 'Firmwarebedarf für diese Identität unbekannt. Ein Ladefehlerzähler benennt nicht die passende Datei.')));
  for (const p of matched.slice(0, 8)) {
    firmware.append(el('h4', local(p.name)), el('p', firmwareLabel(p.firmware.state), 'hardware-badge'), el('p', local(p.firmware.explanation)));
    if (p.firmware.patterns.length) { const list = el('ul'); for (const name of p.firmware.patterns) { const row = el('li'); row.append(el('code', name)); list.append(row); } firmware.append(list); }
  }
  firmware.append(link(t('Distribution-specific package checks', 'Distributionsbezogene Paketprüfungen'), profilePath('distribution-firmware', language)));
  const diagnostics = panels.get('diagnostics'), seenCommands = new Set();
  diagnostics.append(el('p', t('Read-only checks, never executed here. Replace uppercase placeholders manually. Output can contain private identifiers; elevated access may be needed for logs and full descriptors.', 'Lesende Prüfungen; hier wird nichts ausgeführt. Ersetze Großbuchstaben-Platzhalter von Hand. Ausgaben können private Kennungen enthalten; Logs und vollständige Deskriptoren können erhöhte Rechte benötigen.')));
  for (const p of matched.slice(0, 4)) for (const check of p.checkpoints) {
    if (seenCommands.has(check.command)) continue; seenCommands.add(check.command);
    diagnostics.append(el('h4', local(check.label)), command(check.command), el('p', (check.elevated ? t('Elevated access may be needed. ', 'Erhöhte Rechte können nötig sein. ') : '') + local(check.interpretation)));
  }
  if (!matched.length) diagnostics.append(command(d.bus === 'usb' ? 'lsusb -t' : 'lspci -nnk'), command('journalctl -b -k --no-pager'));
  const issues = panels.get('issues'); issues.append(el('p', t('Related guides describe possible observation paths, not confirmed defects in your device.', 'Passende Anleitungen beschreiben mögliche Befundwege, keine bestätigten Fehler deines Geräts.')));
  for (const p of matched.slice(0, 8)) issues.append(el('h4', local(p.name)), el('p', local(p.limitations)));
  issues.append(guideList(matched.flatMap(p => p.fixLab)), link(t('Choose a diagnostic workflow', 'Diagnoseweg wählen'), '#hardware-assistants'));
  const references = panels.get('references'), sourceUrls = new Set(), sourceList = el('ul');
  for (const p of matched.slice(0, 8)) for (const source of p.sources) {
    if (sourceUrls.has(source.url)) continue; sourceUrls.add(source.url);
    const row = el('li'), a = link(source.title, source.url); a.rel = 'noreferrer'; row.append(a); sourceList.append(row);
  }
  references.append(el('p', t('Source review is editorial verification, not a reproduced hardware test. Read each candidate profile for qualifiers and evidence scope.', 'Quellenprüfung ist redaktionelle Prüfung, kein reproduzierter Hardwaretest. Lies die Kandidatenprofile für Bedingungen und Belegumfang.')), sourceList);
  card.append(tabs, ...panels.values()); activate(0); return card;
}

function renderResults(result) {
  lastResults = result.results;
  const root = $('hardware-results'); root.replaceChildren();
  const message = t(`${lastResults.length} devices parsed. ${result.parsed.formats.join(', ')}.`, `${lastResults.length} Geräte gelesen. ${result.parsed.formats.join(', ')}.`);
  $('hardware-parse-status').textContent = message + (result.parsed.shortened ? t(` ${result.parsed.shortened} long lines shortened.`, ` ${result.parsed.shortened} lange Zeilen gekürzt.`) : '') +
    (result.parsed.firmwareObservations ? t(` ${result.parsed.firmwareObservations} firmware-error observations; cause and affected device not established.`, ` ${result.parsed.firmwareObservations} Firmwarefehler-Befunde; Ursache und betroffenes Gerät nicht bestätigt.`) : '');
  if (!lastResults.length) root.append(el('p', t('No device record recognized. Try lspci -nnk or lsusb with numeric IDs; you can also enter pci:8086:2723. Log signals below remain separate.', 'Kein Gerätedatensatz erkannt. Versuche lspci -nnk oder lsusb mit numerischen IDs; auch pci:8086:2723 ist möglich. Log-Hinweise darunter bleiben getrennt.')));
  if (result.findings.length) {
    const findings = el('section'); findings.append(el('h3', t('Separate Fix Lab log signals', 'Getrennte Fix-Lab-Log-Hinweise')), el('p', t('These text signatures are not automatically attributed to any identified device, and do not establish a cause. Raw matching lines are not exported.', 'Diese Textsignaturen werden keinem erkannten Gerät automatisch zugeordnet und bestätigen keine Ursache. Passende Rohzeilen werden nicht exportiert.')),
      guideList(result.findings.map(f => f.problemId))); root.append(findings);
  }
  const controls = el('div', '', 'lab-controls'), search = el('input'), category = el('select'), order = el('select');
  search.type = 'search'; search.maxLength = 200; search.autocomplete = 'off';
  search.setAttribute('aria-label', t('Filter parsed devices locally', 'Gelesene Geräte lokal filtern'));
  category.setAttribute('aria-label', t('Filter result categories', 'Ergebnisbereiche filtern'));
  order.setAttribute('aria-label', t('Sort parsed devices', 'Gelesene Geräte sortieren'));
  category.append(new Option(t('All result categories', 'Alle Ergebnisbereiche'), ''), new Option(t('No catalog match', 'Ohne Katalogtreffer'), 'unknown'));
  for (const [id, name] of Object.entries(catalog.categories)) category.append(new Option(local(name), id));
  order.append(new Option(t('Input order', 'Eingabereihenfolge'), 'input'), new Option(t('Identity', 'Identität'), 'id'), new Option(t('Binding state', 'Bindungszustand'), 'binding'));
  controls.append(search, category, order); root.append(controls);
  const count = el('p', '', 'lab-status'), cards = el('div'); count.setAttribute('role', 'status'); count.setAttribute('aria-live', 'polite'); root.append(count, cards);
  let visible = 12, selected = [];
  function draw() {
    const query = search.value.toLowerCase().slice(0, 200);
    selected = lastResults.filter(r => (!category.value || (category.value === 'unknown' ? !r.matches.length : r.matches.some(m => profiles.get(m.profileId)?.category === category.value))) &&
      [r.device.vendor, r.device.device, `${r.device.vendor}:${r.device.device}`, r.device.reportedLabel, r.boundDriver, ...r.matches.map(m => local(profiles.get(m.profileId).name))].join(' ').toLowerCase().includes(query));
    selected.sort((a, b) => order.value === 'id' ? `${a.device.vendor}:${a.device.device}`.localeCompare(`${b.device.vendor}:${b.device.device}`) : order.value === 'binding' ? a.binding.localeCompare(b.binding) : a.device.index - b.device.index);
    count.textContent = t(`${selected.length} matching devices; showing ${Math.min(visible, selected.length)}.`, `${selected.length} passende Geräte; ${Math.min(visible, selected.length)} sichtbar.`);
    cards.replaceChildren(...selected.slice(0, visible).map(deviceCard));
    if (selected.length > visible) cards.append(button(t('Show 12 more devices', 'Weitere 12 Geräte zeigen'), () => { visible += 12; draw(); }));
  }
  for (const input of [search, category, order]) input.addEventListener(input === search ? 'input' : 'change', () => { visible = 12; draw(); });
  draw(); $('hardware-export-controls').hidden = !lastResults.length;
}
const errors = {
  'too-large': [ 'Report exceeds 2 million characters.', 'Bericht überschreitet 2 Millionen Zeichen.' ],
  'too-many-lines': [ 'Report exceeds 20,000 lines.', 'Bericht überschreitet 20.000 Zeilen.' ],
  'too-many-devices': [ 'Report exceeds 512 device records. Use a smaller excerpt.', 'Bericht überschreitet 512 Geräte. Nutze einen kleineren Auszug.' ],
  'json-depth-or-node-limit': [ 'JSON report exceeds the nesting or node limit.', 'JSON-Bericht überschreitet die Verschachtelungs- oder Knotengrenze.' ],
  'worker-unavailable': [ 'Local Worker unavailable. The static catalog and workflows remain usable; report analysis did not run.', 'Lokaler Worker nicht verfügbar. Statischer Katalog und Diagnosewege bleiben nutzbar; der Bericht wurde nicht analysiert.' ],
  'analysis-timeout': [ 'Local analysis timed out and its Worker was stopped. Use a smaller excerpt.', 'Lokale Analyse dauerte zu lange; ihr Worker wurde beendet. Nutze einen kleineren Auszug.' ],
};
const analysis = new LocalAnalysis({ createWorker: () => new Worker(new URL('./inspector-worker.js', import.meta.url), { type: 'module' }),
  onResult: data => { $('hardware-analyse').disabled = !canWork; renderResults(data); },
  onError: error => {
    const pair = errors[error] || ['Report could not be parsed. Check the selected format or malformed JSON.', 'Bericht konnte nicht gelesen werden. Prüfe Formatwahl oder fehlerhaftes JSON.'];
    if ($('hardware-analyse')) $('hardware-analyse').disabled = !canWork;
    if ($('hardware-parse-status')) $('hardware-parse-status').textContent = t(...pair);
  } });

function clearPrivate({ notice = false } = {}) {
  privateEpoch++; analysis.clear(); lastResults = [];
  for (const id of ['hardware-report', 'hardware-file', 'hardware-redacted']) if ($(id)) $(id).value = '';
  if ($('hardware-search')) { $('hardware-search').value = ''; filterCatalog(); }
  if (fallback) { fallback.value = ''; fallback.hidden = true; }
  if ($('hardware-results')) $('hardware-results').replaceChildren();
  for (const id of ['hardware-export-controls', 'hardware-redacted-panel']) if ($(id)) $(id).hidden = true;
  if ($('hardware-redacted-panel')) $('hardware-redacted-panel').open = false;
  if ($('hardware-include-ids')) $('hardware-include-ids').checked = false;
  if ($('hardware-analyse')) $('hardware-analyse').disabled = !canWork;
  if ($('hardware-parse-status')) $('hardware-parse-status').textContent = notice ? t('Private fields and local results cleared.', 'Private Felder und lokale Ergebnisse geleert.') : '';
  if (shareDialog) { shareDialog.querySelectorAll('input,textarea').forEach(input => { input.value = ''; }); closeShare(false); }
  for (const url of objectUrls) URL.revokeObjectURL(url); objectUrls.clear();
  status('');
}
function summary() { return publicSummary(lastResults, catalog, language, { includeIds: $('hardware-include-ids').checked }); }
if ($('hardware-report')) {
  $('hardware-analyse').disabled = !canWork;
  if (!canWork) $('hardware-parse-status').textContent = t(...errors['worker-unavailable']);
  $('hardware-analyse').addEventListener('click', () => {
    if (!$('hardware-report').value.trim()) { $('hardware-parse-status').textContent = t('Paste a relevant report or numeric identifier first.', 'Füge zuerst einen passenden Bericht oder eine numerische Kennung ein.'); return; }
    privateEpoch++; lastResults = []; $('hardware-results').replaceChildren(); $('hardware-export-controls').hidden = true;
    $('hardware-redacted').value = ''; $('hardware-redacted-panel').hidden = true;
    if (fallback) { fallback.value = ''; fallback.hidden = true; }
    $('hardware-analyse').disabled = true; $('hardware-parse-status').textContent = t('Analysing in this tab…', 'Analyse in diesem Tab…');
    analysis.run($('hardware-report').value, $('hardware-format').value);
  });
  $('hardware-report').addEventListener('input', () => {
    privateEpoch++; analysis.clear(); $('hardware-analyse').disabled = !canWork;
    lastResults = []; $('hardware-results').replaceChildren(); $('hardware-export-controls').hidden = true;
    $('hardware-redacted').value = ''; $('hardware-redacted-panel').hidden = true;
    if (fallback) { fallback.value = ''; fallback.hidden = true; }
    $('hardware-parse-status').textContent = '';
  });
  $('hardware-file').addEventListener('change', async () => {
    const file = $('hardware-file').files[0]; if (!file) return;
    clearPrivate(); const epoch = privateEpoch;
    if (file.size > LIMITS.characters) { $('hardware-parse-status').textContent = t('File exceeds 2 MB.', 'Datei überschreitet 2 MB.'); return; }
    try {
      const text = await file.text(); if (epoch !== privateEpoch) return;
      if (text.length > LIMITS.characters) { $('hardware-parse-status').textContent = t(...errors['too-large']); return; }
      $('hardware-report').value = text; $('hardware-report').focus();
      $('hardware-parse-status').textContent = t('File read locally. Choose Identify locally to analyse it.', 'Datei lokal gelesen. Wähle Lokal erkennen für die Analyse.');
    } catch { if (epoch === privateEpoch) $('hardware-parse-status').textContent = t('Local file could not be read.', 'Lokale Datei konnte nicht gelesen werden.'); }
  });
  $('hardware-clear').addEventListener('click', () => { clearPrivate({ notice: true }); $('hardware-report').focus(); });
  $('hardware-sample').addEventListener('click', () => {
    clearPrivate(); $('hardware-format').value = 'auto';
    $('hardware-report').value = '01:00.0 VGA compatible controller [0300]: Synthetic AMD family [1002:73df] (rev c1)\n\tKernel driver in use: amdgpu\n\tKernel modules: amdgpu\n02:00.0 Network controller [0280]: Synthetic Intel Wi-Fi [8086:2723]\n\tKernel modules: iwlwifi\nBus 001 Device 004: ID 8087:0026 Synthetic Bluetooth\namdgpu: Direct firmware load for amdgpu/example.bin failed with error -2';
    $('hardware-parse-status').textContent = t('Synthetic parser fixture, not a hardware test. Choose Identify locally.', 'Synthetisches Parserbeispiel, kein Hardwaretest. Wähle Lokal erkennen.'); $('hardware-report').focus();
  });
  $('hardware-copy-summary').addEventListener('click', () => copy(summary()));
  $('hardware-download-summary').addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([summary()], { type: 'text/plain;charset=utf-8' })); objectUrls.add(url);
    const a = link('', url); a.download = 'linux-hardware-summary.txt'; document.body.append(a); a.click(); a.remove();
    setTimeout(() => { URL.revokeObjectURL(url); objectUrls.delete(url); }, 1000);
  });
  $('hardware-redact').addEventListener('click', () => {
    $('hardware-redacted').value = redactHardwareReport($('hardware-report').value);
    $('hardware-redacted-panel').hidden = false; $('hardware-redacted-panel').open = true; $('hardware-redacted').focus();
  });
}

function filterCatalog() {
  if (!$('hardware-profile-list')) return;
  const result = filterProfiles(catalog.profiles, { query: $('hardware-search').value, category: $('hardware-category').value, sort: $('hardware-sort').value, language });
  const nodes = new Map([...$('hardware-profile-list').children].map(node => [node.dataset.profile, node]));
  for (const node of nodes.values()) node.hidden = true;
  for (const profile of result) { const node = nodes.get(profile.id); node.hidden = false; $('hardware-profile-list').append(node); }
  $('hardware-search-status').textContent = `${result.length} ${t('profiles', 'Profile')}`; $('hardware-search-empty').hidden = result.length > 0;
  setContext({ ...currentContext, category: $('hardware-category').value, sort: $('hardware-sort').value });
}
if ($('hardware-search')) {
  $('hardware-search').addEventListener('input', filterCatalog);
  $('hardware-category').addEventListener('change', filterCatalog); $('hardware-sort').addEventListener('change', filterCatalog);
  $('hardware-search-reset').addEventListener('click', () => { $('hardware-search').value = ''; $('hardware-category').value = ''; $('hardware-sort').value = 'name'; filterCatalog(); });
}
function renderWorkflow(id, nodeId = '', { push = false, focus = false } = {}) {
  const tree = workflows.find(w => w.id === id), panel = $('hardware-workflow-panel'); if (!tree || !panel) return;
  if (!Object.hasOwn(tree.nodes, nodeId)) nodeId = tree.start;
  const node = tree.nodes[nodeId];
  if (push && currentContext.workflow === id && currentContext.node) flowHistory.push(currentContext.node);
  setContext({ ...currentContext, workflow: id, node: nodeId }); panel.hidden = false; panel.replaceChildren();
  const heading = el('h3', local(tree.title)); heading.tabIndex = -1; panel.append(heading);
  panel.append(el('h4', local(node.question || node.heading)), el('p', local(node.explanation)));
  if (node.hypothesis) panel.append(el('p', local(node.hypothesis), 'lab-source-note'));
  if (node.command) panel.append(command(node.command));
  if (node.commands) for (const value of node.commands) panel.append(command(value));
  if (node.choices) for (const [i, choice] of node.choices.entries()) panel.append(button(local(choice.label), () => renderWorkflow(id, moveAssistant(tree, nodeId, i), { push: true, focus: true })));
  if (node.problemIds) panel.append(guideList(node.problemIds));
  const controls = el('div', '', 'lab-actions');
  if (flowHistory.length) controls.append(button(t('Previous question', 'Vorherige Frage'), () => renderWorkflow(id, flowHistory.pop(), { focus: true })));
  controls.append(button(t('Restart this workflow', 'Diesen Diagnoseweg neu beginnen'), () => { flowHistory = []; renderWorkflow(id, tree.start, { focus: true }); })); panel.append(controls);
  if (focus) heading.focus();
}
document.querySelectorAll('[data-hardware-workflow]').forEach(node => node.addEventListener('click', () => { flowHistory = []; renderWorkflow(node.dataset.hardwareWorkflow, '', { focus: true }); }));

function closeShare(restore = true) {
  if (!shareDialog) return;
  if (shareDialog.open && typeof shareDialog.close === 'function') shareDialog.close(); else { shareDialog.removeAttribute('open'); shareDialog.hidden = true; }
  shareDialog.querySelectorAll('input,textarea').forEach(input => { input.value = ''; });
  if (restore) shareTarget?.focus(); shareTarget = null;
}
function openShare(path, title, trigger) {
  if (shareDialog) { closeShare(false); shareDialog.remove(); }
  const url = canonicalPublicUrl(path); shareTarget = trigger;
  shareDialog = el('dialog', '', 'hardware-share-dialog'); shareDialog.setAttribute('aria-labelledby', 'hardware-share-title');
  shareDialog.append(el('h2', t('Share public information', 'Öffentliche Informationen teilen'))); shareDialog.firstChild.id = 'hardware-share-title';
  shareDialog.append(el('p', t('Only this public page is selected. No raw report, findings, IDs or private labels are inserted. Social buttons open an editable draft on the selected service.', 'Nur diese öffentliche Seite ist gewählt. Rohbericht, Befunde, IDs und private Bezeichnungen werden nicht eingefügt. Soziale Schaltflächen öffnen einen bearbeitbaren Entwurf beim gewählten Dienst.')));
  const urlLabel = el('label', t('Public URL', 'Öffentliche URL')), urlInput = el('input'); urlInput.readOnly = true; urlInput.value = url; urlLabel.append(urlInput);
  const messageLabel = el('label', t('Optional message (review before sharing)', 'Optionale Nachricht (vor Weitergabe prüfen)')), message = el('textarea'); message.maxLength = 2000; message.value = title; messageLabel.append(message);
  const instanceLabel = el('label', t('Mastodon instance (e.g. mastodon.social)', 'Mastodon-Instanz (z. B. mastodon.social)')), instance = el('input'); instance.type = 'text'; instance.autocomplete = 'off'; instance.maxLength = 253; instanceLabel.append(instance);
  const modalStatus = el('p', '', 'lab-status'); modalStatus.setAttribute('role', 'status'); modalStatus.setAttribute('aria-live', 'polite');
  const actions = el('div', '', 'lab-actions');
  for (const [service, label] of [['mastodon', 'Mastodon / Fediverse'], ['x', 'X / Twitter'], ['facebook', 'Facebook']]) actions.append(button(label, () => {
    try { const target = shareIntent(service, { url, message: message.value, instance: instance.value }); window.open(target, '_blank', 'noopener,noreferrer'); }
    catch { modalStatus.textContent = t('Enter a valid public HTTPS Mastodon instance without paths or credentials.', 'Gib eine gültige öffentliche HTTPS-Mastodon-Instanz ohne Pfad oder Zugangsdaten an.'); }
  }));
  if (navigator.share) actions.append(button(t('Native sharing', 'Systemfreigabe'), async () => {
    try { await navigator.share({ title, text: message.value, url }); } catch { /* User cancellation has no side effect. */ }
  }));
  actions.append(button(t('Copy direct link', 'Direktlink kopieren'), async () => {
    const epoch = privateEpoch;
    try { if (!navigator.clipboard?.writeText) throw new Error('unavailable'); await navigator.clipboard.writeText(url); if (epoch === privateEpoch) modalStatus.textContent = t('Link copied.', 'Link kopiert.'); }
    catch { if (epoch === privateEpoch) { urlInput.focus(); urlInput.select(); modalStatus.textContent = t('Copy the selected URL manually.', 'Ausgewählte URL von Hand kopieren.'); } }
  }), button(t('Close', 'Schließen'), () => closeShare()));
  shareDialog.append(urlLabel, messageLabel, instanceLabel, actions, modalStatus); document.body.append(shareDialog);
  shareDialog.addEventListener('cancel', event => { event.preventDefault(); closeShare(); });
  if (typeof shareDialog.showModal === 'function') shareDialog.showModal();
  else { shareDialog.hidden = false; shareDialog.setAttribute('open', ''); }
  urlInput.focus();
}
document.querySelectorAll('[data-hardware-share]').forEach(node => node.addEventListener('click', event => {
  event.preventDefault(); openShare(document.body.dataset.canonicalPath, document.querySelector('h1').textContent, node);
}));
document.querySelectorAll('[data-hardware-copy]').forEach(node => node.addEventListener('click', () => copy(node.parentElement.querySelector('code').textContent)));
document.querySelectorAll('[data-js]').forEach(node => { node.hidden = false; });

function restoreContext() {
  const context = validPublicContext(location.hash.startsWith('#explorer?') ? location.hash.slice(10) : {}, catalog, workflows);
  if (document.body.dataset.hardwareProfile) context.profile = document.body.dataset.hardwareProfile;
  setContext(context);
  if ($('hardware-category')) { $('hardware-category').value = context.category || ''; $('hardware-sort').value = context.sort || 'name'; filterCatalog(); }
  if (context.workflow) renderWorkflow(context.workflow, context.node);
  if (context.profile && $('hardware-results')) {
    const p = profiles.get(context.profile), note = el('p'); note.append(link(local(p.name), p.path[language]), document.createTextNode(' · ' + t('Public context retained; private report was discarded.', 'Öffentlicher Kontext erhalten; privater Bericht verworfen.'))); $('hardware-results').append(note);
  }
}
document.querySelector('a.language-link[hreflang]')?.addEventListener('click', () => { setContext(currentContext); clearPrivate(); }, { capture: true });
window.addEventListener('pagehide', () => clearPrivate());
window.addEventListener('pageshow', event => { if (event.persisted) { clearPrivate(); restoreContext(); } });
window.addEventListener('hashchange', () => { if (location.hash.startsWith('#explorer?')) { flowHistory = []; restoreContext(); } });
restoreContext();
