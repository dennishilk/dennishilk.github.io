(function () {
  const { VirtualSystem, Shell, commandProfiles } = window.LinuxAcademy;
  const $ = selector => document.querySelector(selector);
  const output = $('#terminalOutput'), input = $('#terminalInput'), prompt = $('#prompt'), mission = $('#missionList');
  let system, shell, history, historyIndex, progress, hintLevel, latestPipeline;
  const write = lines => { const block = document.createElement('pre'); block.className = 'terminal-text'; block.textContent = lines.join('\n'); output.append(block); };
  const promptText = () => `museum@linux:${system.cwd === system.homeDirectory ? '~' : system.cwd}$`;
  function render() {
    prompt.textContent = promptText();
    const labels = [['entered', 'ENTER /var/log'], ['inspected', 'INSPECT academy.log'], ['filtered', 'FILTER ERROR LINES'], ['counted', 'COUNT THE ERRORS WITH A PIPELINE'], ['sampled', 'INSPECT THE FIRST TWO ERRORS']];
    mission.innerHTML = labels.map(([key, label]) => `<li class="${progress[key] ? 'complete' : ''}">[${progress[key] ? 'X' : ' '}] ${label}</li>`).join('');
    $('#completion').hidden = !labels.every(([key]) => progress[key]);
    const next = labels.find(([key]) => !progress[key]);
    $('#guidance').textContent = next ? `MISSION: ${next[1]}\n${next[0] === 'entered' ? 'TRY: cd /var/log' : next[0] === 'inspected' ? 'TRY: cat academy.log' : next[0] === 'filtered' ? 'TRY: cat academy.log | grep ERROR' : next[0] === 'counted' ? 'TRY: cat academy.log | grep ERROR | wc -l' : 'TRY: cat academy.log | grep ERROR | head -n 2'}` : 'Mission complete. The PIPELINE FLOW panel shows the actual text produced at every stage.';
    $('#flow').textContent = latestPipeline ? latestPipeline.map((stage, index) => `${stage.command.toUpperCase()}\n${index ? `${stage.inputLines} lines in` : 'SOURCE'} → ${stage.outputLines} lines out${index < latestPipeline.length - 1 ? '\n  │\n  ▼' : ''}`).join('\n') : 'RUN A COMMAND TO SEE ITS TEXT FLOW.';
  }
  function update(result) {
    if (!result.success) return;
    latestPipeline = result.pipeline || latestPipeline;
    const log = system.fileSystem.resolve('/var/log/academy.log', system.cwd, system.homeDirectory).node.content.replace(/\n$/, '');
    const errors = log.split('\n').filter(line => line.includes('ERROR')).join('\n');
    if (system.cwd === '/var/log') progress.entered = true;
    if (result.command === 'cat' && result.output.join('\n') === log) progress.inspected = true;
    if (result.output.join('\n') === errors && result.pipeline && result.pipeline.some(stage => /^grep ERROR$/i.test(stage.command))) progress.filtered = true;
    if (result.output.join('\n') === '4' && result.pipeline && result.pipeline.some(stage => /^wc -l$/i.test(stage.command))) progress.counted = true;
    if (result.output.join('\n') === errors.split('\n').slice(0, 2).join('\n') && result.pipeline && result.pipeline.some(stage => /^head -n 2$/i.test(stage.command))) progress.sampled = true;
  }
  function run(raw) { const result = shell.execute(raw); write([`${promptText()} ${raw}`, ...result.output]); if (result.clear) output.replaceChildren(); if (raw.trim()) { history.push(raw); historyIndex = history.length; } update(result); render(); $('#announcer').textContent = result.success ? 'Command completed.' : result.output.join(' '); input.value = ''; input.focus(); }
  function reset() { system = new VirtualSystem(); shell = new Shell(system, { allowedCommands: commandProfiles.lab06 }); history = []; historyIndex = 0; progress = {}; hintLevel = 0; latestPipeline = null; output.replaceChildren(); write(['LINUX TERMINAL ACADEMY', 'LAB 06 — PIPES & SHELL POWER', '', 'MISSION: Find important events in a busy fictional system log.', 'Everything here exists only in browser memory; it never sees your computer.']); render(); input.focus(); }
  input.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); run(input.value); } if (event.key === 'ArrowUp') { event.preventDefault(); if (history.length) input.value = history[Math.max(0, --historyIndex)]; } if (event.key === 'ArrowDown') { event.preventDefault(); input.value = historyIndex < history.length - 1 ? history[++historyIndex] : (historyIndex = history.length, ''); } if (event.ctrlKey && event.key.toLowerCase() === 'l') { event.preventDefault(); run('clear'); } });
  document.querySelectorAll('[data-command]').forEach(button => button.addEventListener('click', () => run(button.dataset.command)));
  $('#resetButton').addEventListener('click', reset); $('#hintButton').addEventListener('click', () => { hintLevel++; write([hintLevel === 1 ? 'Start by entering the log directory: cd /var/log' : hintLevel === 2 ? 'Use a pipe to send the log text into grep: cat academy.log | grep ERROR' : 'Count the matching lines: cat academy.log | grep ERROR | wc -l. Then sample two with head -n 2.']); input.focus(); }); reset();
})();
