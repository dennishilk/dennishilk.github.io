import { LIMITS, parseLog, buildSummary } from './core.js';
import { acceptanceFixture } from './fixtures.js';
import { assistants, LAUNCH_OPTIONS, buildLaunchOptions, diagnosticsFor, inspectGraphics, diagnosePerformance } from './diagnostics.js';
import { catalog } from './catalog.js';

const lang = document.documentElement.lang.startsWith('de') ? 'de' : 'en';
const tr = (en, de) => lang === 'de' ? de : en;
const local = value => value?.[lang] || '';
const byId = id => document.getElementById(id);
const GRAPHICS_LIMIT = 128 * 1024;
const FALLBACK_LIMIT = 256 * 1024;

// All runtime text, including excerpts and redacted evidence, uses textContent.
function node(tag, text = '', className = '') {
  const element = document.createElement(tag);
  element.textContent = text;
  if (className) element.className = className;
  return element;
}
function button(text, action) {
  const element = node('button', text, 'lab-button');
  element.type = 'button';
  element.addEventListener('click', action);
  return element;
}
function status(id, message) {
  const element = byId(id);
  if (element) element.textContent = message;
}
async function copyText(text, statusId, fallback) {
  if (!text) return;
  try {
    if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable');
    await navigator.clipboard.writeText(text);
    status(statusId, tr('Copied. Review before sharing.', 'Kopiert. Vor dem Teilen prüfen.'));
  } catch {
    fallback?.focus();
    if (fallback?.select) fallback.select();
    status(statusId, tr('Clipboard access is unavailable. Select and copy the displayed text manually.', 'Kein Zugriff auf die Zwischenablage. Angezeigten Text markieren und von Hand kopieren.'));
  }
}
function wireCommandCopy(scope = document) {
  for (const control of scope.querySelectorAll('[data-gaming-copy]')) {
    control.addEventListener('click', () => {
      const text = control.closest('.gaming-command')?.querySelector('code')?.textContent;
      copyText(text, 'gaming-ui-status', control.closest('.gaming-command')?.querySelector('pre'));
    });
  }
}
function renderCommand(check) {
  const block = node('div', '', 'gaming-command');
  const label = { 'read-only': tr('Read-only observation', 'Lesende Beobachtung'), temporary: tr('Temporary diagnostic environment', 'Temporäre Diagnoseumgebung'), declarative: tr('Declarative configuration change', 'Deklarative Konfigurationsänderung') }[check.kind] || '';
  block.append(node('p', label, 'gaming-command-kind'));
  const pre = node('pre');
  pre.tabIndex = 0;
  pre.append(node('code', check.command));
  block.append(pre, button(tr('Copy command', 'Befehl kopieren'), () => copyText(check.command, 'gaming-ui-status', pre)));
  if (check.requirements) block.append(node('p', tr('Requirements: ', 'Voraussetzungen: ') + local(check.requirements)));
  if (check.interpretation) block.append(node('p', local(check.interpretation)));
  if (check.rollback) block.append(node('p', tr('Rollback: ', 'Rücknahme: ') + local(check.rollback)));
  return block;
}
function relatedLinks(references = {}) {
  const items = [];
  for (const id of references.articleIds || []) {
    const article = catalog.articles.find(item => item.id === id);
    if (article) items.push({ title: article.title, path: article.path });
  }
  for (const group of ['fixLab', 'hardware']) for (const id of references[group] || []) {
    const target = catalog.links[group][id];
    if (target) items.push(target);
  }
  if (!items.length) return null;
  const container = node('div', '', 'gaming-related');
  container.append(node('h4', tr('Continue with the evidence', 'Mit den Hinweisen weitergehen')));
  const list = node('ul');
  for (const item of items) {
    const li = node('li');
    const link = node('a', local(item.title));
    link.href = item.path[lang];
    li.append(link);
    list.append(li);
  }
  container.append(list);
  return container;
}

wireCommandCopy();
for (const element of document.querySelectorAll('[data-gaming-js]')) element.hidden = false;

const logInput = byId('gaming-log');
if (logInput) initializeTools();

function initializeTools() {
  const logFile = byId('log-file');
  const results = byId('log-results');
  const analyze = byId('analyze-log');
  const summary = byId('diagnostic-summary');
  const summaryPanel = byId('summary-panel');
  const assistantPanel = byId('assistant-panel');
  const distro = byId('distro');
  let worker = null;
  let workerTimer = null;
  let job = 0;
  let lastReport = null;
  let currentAssistant = null;
  let path = [];
  let choicePath = [];
  let launchCommand = '%command%';

  function cancelWork() {
    job += 1;
    worker?.terminate();
    worker = null;
    if (workerTimer) clearTimeout(workerTimer);
    workerTimer = null;
    analyze.disabled = false;
    results.removeAttribute('aria-busy');
  }
  function clearReport() {
    lastReport = null;
    results.replaceChildren();
    summary.value = '';
    status('summary-status', '');
    updateSummary();
  }
  function clearLog({ announce = true, focus = false } = {}) {
    cancelWork();
    logInput.value = '';
    logFile.value = '';
    clearReport();
    status('log-status', announce ? tr('Log, pending analysis and findings cleared.', 'Log, laufende Analyse und Befunde geleert.') : '');
    if (focus) logInput.focus();
  }
  function summaryContext() {
    return { distro: distro.value, runtime: byId('launch-form').elements.namedItem('runtime').value, api: byId('launch-form').elements.namedItem('api').value, ...(currentAssistant ? { assistantId: currentAssistant.id } : {}) };
  }
  function updateSummary() {
    if (!lastReport && !currentAssistant) {
      summary.value = '';
      summaryPanel.hidden = true;
      return;
    }
    const chunks = [lastReport ? buildSummary(lastReport, summaryContext(), lang) : tr('Linux Gaming Repair Center\nNo log excerpt has been analyzed.', 'Linux Gaming Repair Center\nEs wurde kein Log-Auszug analysiert.')];
    if (currentAssistant) {
      chunks.push(tr('Diagnostic assistant: ', 'Diagnosehilfe: ') + local(currentAssistant.title));
      for (let i = 0; i < path.length - 1; i++) {
        const previous = currentAssistant.nodes[path[i]];
        const selected = previous.choices?.find(choice => choice.id === choicePath[i]);
        if (selected) chunks.push(local(previous.question || previous.heading) + '\n→ ' + local(selected.label));
      }
      const current = currentAssistant.nodes[path.at(-1)];
      chunks.push(tr('Current step: ', 'Aktueller Schritt: ') + local(current.question || current.heading));
      chunks.push(local(current.body || current.why));
    }
    summary.value = chunks.filter(Boolean).join('\n\n');
    summaryPanel.hidden = false;
    status('summary-status', '');
  }
  function renderReport(report) {
    results.replaceChildren();
    if (report.error) {
      lastReport = null;
      status('log-status', local(report.error.message));
      updateSummary();
      return;
    }
    lastReport = report;
    status('log-status', tr(`Inspected ${report.stats.lines.toLocaleString('en-US')} lines; ${report.findings.length} distinct findings.`, `${report.stats.lines.toLocaleString('de-DE')} Zeilen geprüft; ${report.findings.length} unterschiedliche Befunde.`));
    results.append(node('h3', tr('Evidence observed in this excerpt', 'Beobachtete Hinweise in diesem Auszug'), 'gaming-result-heading'));
    const layers = node('dl', '', 'gaming-layers');
    const names = { gpuIdentification: tr('GPU identification', 'GPU-Identität'), driverBinding: tr('Kernel driver binding', 'Kernel-Treiberbindung'), vulkanEnumeration: tr('Vulkan device enumeration', 'Vulkan-Geräteliste'), rendering: tr('Game rendering evidence', 'Rendering-Hinweis im Spiel') };
    for (const [id, title] of Object.entries(names)) {
      const block = node('div');
      block.append(node('dt', title), node('dd', report.layers[id] === 'observed' ? tr('Evidence present; check its scope.', 'Hinweis vorhanden; Geltungsbereich prüfen.') : tr('Unreported here; not a failure diagnosis.', 'Hier nicht berichtet; keine Fehlerdiagnose.')));
      layers.append(block);
    }
    results.append(layers);
    if (report.notices.length) {
      const notices = node('ul', '', 'gaming-helper');
      for (const notice of report.notices) notices.append(node('li', local(notice)));
      results.append(notices);
    }
    if (!report.findings.length) results.append(node('p', tr('No recognized failure pattern in this excerpt. This does not establish that the game or hardware is healthy. Collect the first failure and its timestamp, including adjacent context.', 'Kein erkanntes Fehlermuster in diesem Auszug. Das belegt keine fehlerfreie Anwendung oder Hardware. Sammle den ersten Fehler mit Zeitpunkt und benachbartem Kontext.')));
    for (const finding of report.findings) {
      const article = node('article');
      const badge = node('span', { error: tr('Error evidence', 'Fehlerhinweis'), warning: tr('Warning evidence', 'Warnhinweis'), info: tr('Context', 'Kontext') }[finding.severity] || tr('Evidence', 'Hinweis'), 'gaming-badge');
      badge.dataset.severity = finding.severity;
      article.append(badge, node('h3', local(finding.title)), node('p', local(finding.explanation)), node('p', tr('Next observation: ', 'Nächste Beobachtung: ') + local(finding.next)));
      if (finding.evidence.length) {
        const detail = node('details');
        detail.append(node('summary', tr(`Redacted evidence (${finding.count} occurrence${finding.count === 1 ? '' : 's'})`, `Redigierter Beleg (${finding.count} Treffer)`)));
        const pre = node('pre', finding.evidence.map(evidence => `${tr('Line', 'Zeile')} ${evidence.line}: ${evidence.text}`).join('\n'), 'gaming-evidence');
        pre.tabIndex = 0;
        detail.append(pre);
        article.append(detail);
      }
      const links = relatedLinks(finding);
      if (links) article.append(links);
      results.append(article);
    }
    updateSummary();
  }
  function analyzeLog() {
    cancelWork();
    clearReport();
    const input = logInput.value;
    if (!input.trim()) {
      status('log-status', tr('Paste or load a relevant text excerpt first.', 'Zuerst einen relevanten Textauszug einfügen oder laden.'));
      logInput.focus();
      return;
    }
    // Do not send an oversized copy to a worker, and never analyze a truncation.
    if (input.length > LIMITS.characters) {
      status('log-status', tr('This excerpt exceeds the character limit. Choose a smaller section around the failure; no partial result was analyzed.', 'Der Auszug überschreitet die Zeichengrenze. Wähle einen kleineren Abschnitt um den Fehler; es wurde kein Teilresultat analysiert.'));
      return;
    }
    const id = job;
    analyze.disabled = true;
    results.setAttribute('aria-busy', 'true');
    status('log-status', tr('Inspecting locally…', 'Wird lokal geprüft…'));
    try {
      worker = new Worker(new URL('./inspector-worker.js', import.meta.url), { type: 'module' });
      worker.onmessage = event => {
        if (id !== job || event.data?.id !== id) return;
        const report = event.data.report;
        cancelWork();
        renderReport(report);
      };
      worker.onerror = event => {
        event.preventDefault?.();
        if (id !== job) return;
        cancelWork();
        fallbackAnalysis(input);
      };
      workerTimer = setTimeout(() => {
        if (id !== job) return;
        cancelWork();
        status('log-status', tr('Analysis timed out. Choose a smaller excerpt around the first failure and retry.', 'Zeitlimit der Analyse erreicht. Wähle einen kleineren Auszug um den ersten Fehler und versuche es erneut.'));
      }, 12000);
      worker.postMessage({ id, input });
    } catch {
      cancelWork();
      fallbackAnalysis(input);
    }
  }
  function fallbackAnalysis(input) {
    if (input.length > FALLBACK_LIMIT) {
      status('log-status', tr('This browser could not start the local worker. The fallback is limited to 256 Ki characters; choose a smaller excerpt. No partial result was analyzed.', 'Dieser Browser konnte den lokalen Worker nicht starten. Die Ersatzanalyse ist auf 256 Ki Zeichen begrenzt; wähle einen kleineren Auszug. Es wurde kein Teilresultat analysiert.'));
      return;
    }
    renderReport(parseLog(input));
    if (lastReport) status('log-status', tr('Analyzed locally with the bounded main-thread fallback (worker unavailable). Review the findings below.', 'Lokal mit begrenzter Ersatzanalyse im Hauptthread geprüft (Worker nicht verfügbar). Befunde unten prüfen.'));
  }
  analyze.addEventListener('click', analyzeLog);
  byId('clear-log').addEventListener('click', () => {
    resetAll();
    status('log-status', tr('All local tools reset. Private inputs and pending analysis cleared.', 'Alle lokalen Werkzeuge zurückgesetzt. Private Eingaben und laufende Analyse geleert.'));
    logInput.focus();
  });
  logInput.value = '';
  logFile.value = '';
  logInput.addEventListener('input', () => {
    cancelWork();
    clearReport();
    status('log-status', tr('Excerpt changed. Inspect it again for current findings.', 'Auszug geändert. Für aktuelle Befunde erneut prüfen.'));
  });
  byId('load-fixture').addEventListener('click', () => {
    clearLog({ announce: false });
    logInput.value = acceptanceFixture.log;
    status('log-status', tr('Synthetic acceptance excerpt loaded. The documented symptoms are listed above; click “Inspect excerpt” to analyze the text.', 'Synthetischer Akzeptanzauszug geladen. Dokumentierte Symptome stehen oben; mit „Auszug prüfen“ den Text analysieren.'));
    logInput.focus();
  });
  logFile.addEventListener('change', async () => {
    cancelWork();
    clearReport();
    logInput.value = '';
    const file = logFile.files?.[0];
    if (!file) return;
    const id = job;
    if (file.size > LIMITS.characters) {
      logFile.value = '';
      status('log-status', tr('The file exceeds the 1 MiB limit. Select a smaller text excerpt.', 'Die Datei überschreitet die Grenze von 1 MiB. Einen kleineren Textauszug auswählen.'));
      return;
    }
    status('log-status', tr('Reading the selected local text file…', 'Gewählte lokale Textdatei wird gelesen…'));
    try {
      const text = await file.text();
      if (id !== job) return;
      if (text.length > LIMITS.characters || text.includes('\u0000')) throw new Error('invalid text file');
      logInput.value = text;
      status('log-status', tr('Local text loaded. Nothing was uploaded. Click “Inspect excerpt” when ready.', 'Lokaler Text geladen. Nichts wurde hochgeladen. Mit „Auszug prüfen“ fortfahren.'));
    } catch {
      if (id !== job) return;
      logInput.value = '';
      logFile.value = '';
      status('log-status', tr('Could not read a supported text file. Choose a plain text excerpt within the limit.', 'Keine unterstützte Textdatei lesbar. Einen einfachen Textauszug innerhalb der Grenze auswählen.'));
    }
  });
  byId('copy-summary').addEventListener('click', () => copyText(summary.value, 'summary-status', summary));
  byId('download-summary').addEventListener('click', () => {
    if (!summary.value) return;
    const url = URL.createObjectURL(new Blob([summary.value], { type: 'text/plain;charset=utf-8' }));
    const link = node('a');
    link.href = url;
    link.download = `linux-gaming-diagnostic-summary-${lang}.txt`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    status('summary-status', tr('Summary downloaded. Review the file before sharing.', 'Zusammenfassung geladen. Datei vor dem Teilen prüfen.'));
  });

  function renderAssistant({ focus = true } = {}) {
    const current = currentAssistant.nodes[path.at(-1)];
    assistantPanel.replaceChildren();
    assistantPanel.append(node('p', local(currentAssistant.title), 'gaming-flow-note'));
    const heading = node('h3', local(current.question || current.heading));
    heading.tabIndex = -1;
    assistantPanel.append(heading);
    if (current.why) assistantPanel.append(node('p', local(current.why)));
    if (current.body) assistantPanel.append(node('p', local(current.body)));
    for (const command of current.commands || []) assistantPanel.append(renderCommand(command));
    if (current.choices?.length) {
      const choices = node('div', '', 'assistant-choices');
      for (const choice of current.choices) {
        const control = button(local(choice.label), () => {
          path.push(choice.next);
          choicePath.push(choice.id);
          renderAssistant();
        });
        control.dataset.choice = choice.id;
        choices.append(control);
      }
      assistantPanel.append(choices);
    }
    const links = relatedLinks(current);
    if (links) assistantPanel.append(links);
    const actions = node('div', '', 'gaming-flow-actions');
    const back = button(tr('Back one question', 'Eine Frage zurück'), () => {
      path.pop();
      choicePath.pop();
      renderAssistant();
    });
    back.id = 'assistant-back';
    back.disabled = path.length < 2;
    const restart = button(tr('Restart this assistant', 'Diagnosehilfe neu beginnen'), () => {
      path = [currentAssistant.start];
      choicePath = [];
      renderAssistant();
    });
    restart.id = 'assistant-restart';
    const preview = button(tr('Review a diagnostic summary', 'Diagnosezusammenfassung prüfen'), () => {
      updateSummary();
      summary.focus();
    });
    preview.id = 'assistant-summary';
    actions.append(back, restart, preview);
    assistantPanel.append(actions);
    updateSummary();
    if (focus) heading.focus();
  }
  for (const control of document.querySelectorAll('[data-assistant]')) {
    control.setAttribute('aria-pressed', 'false');
    control.addEventListener('click', () => {
      currentAssistant = assistants.find(assistant => assistant.id === control.dataset.assistant);
      if (!currentAssistant) return;
      for (const button of document.querySelectorAll('[data-assistant]')) button.setAttribute('aria-pressed', String(button === control));
      path = [currentAssistant.start];
      choicePath = [];
      renderAssistant();
    });
  }

  const graphicsInput = byId('graphics-input');
  graphicsInput.value = '';
  function clearGraphics({ focus = false } = {}) {
    graphicsInput.value = '';
    byId('graphics-results').replaceChildren();
    status('graphics-status', '');
    if (focus) graphicsInput.focus();
  }
  graphicsInput.addEventListener('input', () => {
    byId('graphics-results').replaceChildren();
    status('graphics-status', tr('Excerpt changed. Inspect again for current observations.', 'Auszug geändert. Für aktuelle Beobachtungen erneut prüfen.'));
  });
  byId('clear-graphics').addEventListener('click', () => clearGraphics({ focus: true }));
  byId('inspect-graphics').addEventListener('click', () => {
    const output = byId('graphics-results');
    output.replaceChildren();
    const input = graphicsInput.value;
    if (!input.trim() || input.length > GRAPHICS_LIMIT) {
      status('graphics-status', tr('Paste a relevant excerpt within 128 Ki characters first. No partial result was inspected.', 'Zuerst einen relevanten Auszug innerhalb von 128 Ki Zeichen einfügen. Es wurde kein Teilresultat geprüft.'));
      graphicsInput.focus();
      return;
    }
    const report = inspectGraphics(input);
    for (const observation of report.observations) {
      const article = node('article');
      article.dataset.stage = observation.stage;
      article.append(node('h3', local(observation.title)), node('p', local(observation.body)));
      output.append(article);
    }
    output.append(node('p', local(report.limitations), 'gaming-helper'));
    const links = relatedLinks({ articleIds: ['vulkan-initialization', 'vulkan-32-bit', 'wrong-gpu'] });
    if (links) output.append(links);
    status('graphics-status', tr('Evidence layers listed below. Rendering success must come from the actual game.', 'Hinweise nach Ebenen aufgelistet. Rendering-Erfolg muss aus dem tatsächlichen Spiel stammen.'));
  });
  function renderDistro() {
    byId('distro-diagnostics').replaceChildren(node('h3', tr('Commands for the selected distribution', 'Befehle für die gewählte Distribution'), 'gaming-result-heading'), node('p', tr('One command at a time. These commands are displayed, never executed here.', 'Jeweils einen Befehl. Diese Befehle werden angezeigt und hier niemals ausgeführt.'), 'gaming-helper'), ...diagnosticsFor(distro.value).map(renderCommand));
    updateSummary();
  }
  distro.value = 'other';
  distro.addEventListener('change', renderDistro);
  renderDistro();

  const launchForm = byId('launch-form');
  function renderLaunch() {
    const selection = {};
    for (const id of ['protonLog', 'mangoHud', 'dxvkHud', 'wineD3D', 'loaderDebug']) selection[id] = launchForm.elements.namedItem(id).checked;
    for (const id of ['gpu', 'api', 'driver', 'runtime']) selection[id] = launchForm.elements.namedItem(id).value;
    const result = buildLaunchOptions(selection);
    launchCommand = result.command;
    byId('launch-output').textContent = result.command || tr('No launch string: resolve the incompatible selections below.', 'Kein Starttext: Unpassende Auswahl unten auflösen.');
    byId('copy-launch').disabled = !result.command;
    byId('launch-messages').replaceChildren(...[...result.errors, ...result.warnings].map(message => node('li', local(message))));
    const details = [];
    for (const id of ['mesaDiscrete', 'nvidiaPrime']) if (result.activeOptions.includes(id)) {
      const option = LAUNCH_OPTIONS.find(option => option.id === id);
      details.push(node('li', local(option.explanation) + ' ' + tr('Requirements: ', 'Voraussetzungen: ') + local(option.requirements)), node('li', tr('Side effects: ', 'Nebenwirkungen: ') + local(option.sideEffects)), node('li', tr('Rollback: ', 'Rücknahme: ') + local(option.rollback)));
    }
    byId('launch-messages').append(...details);
    status('launch-status', '');
    updateSummary();
  }
  launchForm.addEventListener('submit', event => event.preventDefault());
  launchForm.addEventListener('change', renderLaunch);
  launchForm.reset();
  renderLaunch();
  byId('reset-launch').addEventListener('click', () => {
    launchForm.reset();
    renderLaunch();
    status('launch-status', tr('All diagnostic options removed. The Steam placeholder is restored.', 'Alle Diagnoseoptionen entfernt. Steam-Platzhalter wiederhergestellt.'));
  });
  byId('copy-launch').addEventListener('click', () => copyText(launchCommand, 'launch-status', byId('launch-output')));

  const performanceForm = byId('performance-form');
  function clearPerformance() {
    performanceForm.reset();
    byId('performance-results').replaceChildren();
    status('performance-status', '');
  }
  clearPerformance();
  performanceForm.addEventListener('submit', event => {
    event.preventDefault();
    if (!performanceForm.reportValidity()) return;
    const metrics = {};
    for (const name of ['gpuUsage', 'cpuCoreUsage', 'vramUsed', 'vramTotal', 'frameTimeMs', 'ioWait']) {
      const value = performanceForm.elements.namedItem(name).value.trim();
      if (value) metrics[name] = Number(value);
    }
    for (const name of ['firstPassOnly', 'movementStalls']) metrics[name] = performanceForm.elements.namedItem(name).checked;
    const findings = diagnosePerformance(metrics);
    const output = byId('performance-results');
    output.replaceChildren();
    for (const finding of findings) {
      const article = node('article');
      article.dataset.performanceFinding = finding.id;
      article.append(node('h3', local(finding.title)), node('p', local(finding.body)), node('p', tr('Next comparison: ', 'Nächster Vergleich: ') + local(finding.next)));
      output.append(article);
    }
    const links = relatedLinks({ articleIds: ['shader-stutter', 'movement-freezes'] });
    if (links) output.append(links);
    status('performance-status', tr('Observations interpreted. Repeat a comparable scene before naming a bottleneck.', 'Beobachtungen eingeordnet. Vergleichbare Szene wiederholen, bevor ein Engpass benannt wird.'));
  });
  performanceForm.addEventListener('input', () => {
    byId('performance-results').replaceChildren();
    status('performance-status', tr('Measurements changed. Interpret them again for current guidance.', 'Messwerte geändert. Für aktuelle Hinweise erneut einordnen.'));
  });
  byId('clear-performance').addEventListener('click', clearPerformance);

  const search = byId('gaming-search');
  const cards = Array.from(document.querySelectorAll('[data-gaming-guide]'));
  function filterKnowledge() {
    const query = search.value.trim().toLocaleLowerCase(lang).slice(0, 500);
    let count = 0;
    for (const card of cards) {
      card.hidden = !card.dataset.search.includes(query);
      if (!card.hidden) count += 1;
    }
    status('knowledge-count', tr(`${count} of ${cards.length} guides.`, `${count} von ${cards.length} Anleitungen.`));
    byId('knowledge-empty').hidden = count > 0;
  }
  search.value = '';
  search.addEventListener('input', filterKnowledge);
  filterKnowledge();

  function resetAll() {
    currentAssistant = null;
    path = [];
    choicePath = [];
    for (const control of document.querySelectorAll('[data-assistant]')) control.setAttribute('aria-pressed', 'false');
    assistantPanel.replaceChildren(node('p', tr('Choose an assistant above. You can go back or restart without changing anything on your system.', 'Wähle oben eine Diagnosehilfe. Du kannst zurückgehen oder neu beginnen, ohne dein System zu verändern.')));
    clearLog({ announce: false });
    clearGraphics();
    clearPerformance();
    distro.value = 'other';
    renderDistro();
    launchForm.reset();
    renderLaunch();
    search.value = '';
    filterKnowledge();
    status('gaming-ui-status', '');
  }
  // bfcache and form restoration must not bring back private excerpts.
  window.addEventListener('pagehide', resetAll);
  window.addEventListener('pageshow', event => {
    if (event.persisted) resetAll();
  });
}
