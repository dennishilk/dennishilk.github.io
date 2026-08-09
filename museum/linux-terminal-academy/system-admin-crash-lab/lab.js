if (!document.querySelector('script[data-site-language-loader]')) {
  const languageScript = document.createElement('script');
  languageScript.src = '/site-language.js?v=20260809-sitewide-1';
  languageScript.dataset.siteLanguageLoader = 'true';
  document.head.appendChild(languageScript);
}

(function () {
  const { VirtualSystem, Shell, commandProfiles } = window.LinuxAcademy;
  const $ = selector => document.querySelector(selector);
  const output = $('#terminalOutput'), input = $('#terminalInput'), prompt = $('#prompt'), mission = $('#missionList');
  let system, shell, history, historyIndex, progress, hintLevel;
  const write = lines => { const block = document.createElement('pre'); block.className = 'terminal-text'; block.textContent = lines.join('\n'); output.append(block); };
  const promptText = () => `museum@linux:${system.cwd === system.homeDirectory ? '~' : system.cwd}$`;
  function render() {
    prompt.textContent = promptText();
    const validConfig = system.galleryConfig().includes('CONTENT_PATH=/srv/museum');
    const galleryRunning = system.serviceByName('museum-gallery.service').state === 'active';
    if (validConfig) progress.repaired = true;
    if (galleryRunning && progress.repaired) progress.restarted = true;
    const labels = [['status', 'INSPECT FAILED SERVICE'], ['journal', 'READ SERVICE JOURNAL'], ['config', 'INSPECT CONFIGURATION'], ['identified', 'IDENTIFY INVALID PATH'], ['repaired', 'REPAIR CONTENT_PATH'], ['restarted', 'RESTART SERVICE'], ['verified', 'VERIFY SERVICE IS RUNNING']];
    mission.innerHTML = labels.map(([key, label]) => `<li class="${progress[key] ? 'complete' : ''}">[${progress[key] ? 'X' : ' '}] ${label}</li>`).join('');
    $('#completion').hidden = !labels.every(([key]) => progress[key]);
    const next = labels.find(([key]) => !progress[key]);
    $('#guidance').textContent = next ? `MISSION: ${next[1]}\n${next[0] === 'status' ? 'TRY: systemctl status museum-gallery.service' : next[0] === 'journal' ? 'TRY: journalctl -u museum-gallery.service' : next[0] === 'config' ? 'TRY: cat /etc/museum/gallery.conf' : next[0] === 'identified' ? 'Compare CONTENT_PATH with: ls /srv' : next[0] === 'repaired' ? 'TRY: config-set museum-gallery CONTENT_PATH /srv/museum' : next[0] === 'restarted' ? 'TRY: systemctl restart museum-gallery.service' : 'TRY: systemctl status museum-gallery.service'}` : 'Mission complete. Diagnose before acting.';
    $('#serviceMonitor').textContent = Object.entries(system.services).map(([name, service]) => `${name}\n  ${service.state === 'active' ? 'RUNNING' : service.state === 'failed' ? 'FAILED' : 'INACTIVE'}`).join('\n\n');
    $('#configView').textContent = `/etc/museum/gallery.conf\n${system.galleryConfig().trim()}`;
  }
  function update(result) {
    if (!result.success) return;
    const text = result.output.join('\n');
    if (result.command === 'systemctl' && result.input.args[0] === 'status' && result.input.args[1] === 'museum-gallery.service') { if (/Active: failed/.test(text)) progress.status = true; if (/Active: active \(running\)/.test(text) && system.serviceByName('museum-gallery.service').state === 'active') progress.verified = true; }
    if (result.command === 'journalctl' && result.input.args[1] === 'museum-gallery.service') progress.journal = true;
    if (result.command === 'cat' && result.input.args[0] === '/etc/museum/gallery.conf') progress.config = true;
    if (progress.journal && progress.config && system.galleryConfig().includes('/srv/musuem') && !!system.fileSystem.resolve('/srv/museum', system.cwd, system.homeDirectory)) progress.identified = true;
  }
  function run(raw) { const result = shell.execute(raw); write([`${promptText()} ${raw}`, ...result.output]); if (result.clear) output.replaceChildren(); if (raw.trim()) { history.push(raw); historyIndex = history.length; } update(result); render(); $('#announcer').textContent = result.success ? 'Command completed.' : result.output.join(' '); input.value = ''; input.focus(); }
  function reset() { system = new VirtualSystem(); shell = new Shell(system, { allowedCommands: commandProfiles.lab07 }); history = []; historyIndex = 0; progress = {}; hintLevel = 0; output.replaceChildren(); write(['LINUX TERMINAL ACADEMY', 'LAB 07 — SYSTEM ADMINISTRATION', '', 'MISSION: Diagnose and recover a failed fictional museum service.', 'Everything here exists only in browser memory; it never sees your computer.']); render(); input.focus(); }
  input.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); run(input.value); } if (event.key === 'ArrowUp') { event.preventDefault(); if (history.length) input.value = history[Math.max(0, --historyIndex)]; } if (event.key === 'ArrowDown') { event.preventDefault(); input.value = historyIndex < history.length - 1 ? history[++historyIndex] : (historyIndex = history.length, ''); } if (event.ctrlKey && event.key.toLowerCase() === 'l') { event.preventDefault(); run('clear'); } });
  document.querySelectorAll('[data-command]').forEach(button => button.addEventListener('click', () => run(button.dataset.command)));
  $('#resetButton').addEventListener('click', reset); $('#hintButton').addEventListener('click', () => { hintLevel++; write([hintLevel === 1 ? 'Start with status, then read the gallery service journal.' : hintLevel === 2 ? 'Inspect /etc/museum/gallery.conf and compare its path with ls /srv.' : 'Use the Academy-only helper: config-set museum-gallery CONTENT_PATH /srv/museum. Then restart and verify.']); input.focus(); }); reset();
})();
