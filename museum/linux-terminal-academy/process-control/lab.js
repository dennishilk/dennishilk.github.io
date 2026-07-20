(function () {
  const { VirtualSystem, Shell, commandProfiles } = window.LinuxAcademy;
  const $ = selector => document.querySelector(selector);
  const output = $('#terminalOutput'), input = $('#terminalInput'), prompt = $('#prompt'), mission = $('#missionList');
  let system, shell, history, historyIndex, progress, hintLevel;
  const write = lines => { const block = document.createElement('pre'); block.className = 'terminal-text'; block.textContent = lines.join('\n'); output.append(block); };
  const promptText = () => `museum@linux:${system.cwd === system.homeDirectory ? '~' : system.cwd}$`;
  function renderMonitor() {
    $('#monitor').textContent = ['PID   PROCESS           STATE CPU', ...system.processes.map(process => `${String(process.pid).padEnd(5)} ${process.command.padEnd(17)} ${process.terminated ? 'ENDED' : process.state.padEnd(5)} ${process.cpu.toFixed(1)}%`), '', 'R = running · S = sleeping · ENDED = stopped'].join('\n');
    $('#context').textContent = 'One shared fictional process table in browser memory.';
  }
  function render() {
    prompt.textContent = promptText();
    const labels = [['inspected', 'INSPECT PROCESSES WITH ps / ps aux'], ['identified', 'IDENTIFY THE HIGH-CPU NON-ESSENTIAL PID'], ['terminated', 'REQUEST NORMAL TERMINATION (TERM)'], ['verified', 'VERIFY THE PROCESS IS GONE']];
    mission.innerHTML = labels.map(([key, label]) => `<li class="${progress[key] ? 'complete' : ''}">[${progress[key] ? 'X' : ' '}] ${label}</li>`).join('');
    $('#completion').hidden = !labels.every(([key]) => progress[key]);
    const next = labels.find(([key]) => !progress[key]);
    $('#guidance').textContent = next ? `SYSTEM FEELS SLOW. DO NOT KILL RANDOM PROCESSES.\nMISSION: ${next[1]}\n${next[0] === 'inspected' ? 'TRY: ps aux' : next[0] === 'identified' ? 'Compare CPU values and PID numbers.' : next[0] === 'terminated' ? 'TRY: kill 427 — default kill sends TERM.' : 'TRY: ps aux'}` : 'Mission complete. You used the least aggressive appropriate signal and checked the result.';
    renderMonitor();
  }
  function update(result) {
    const target = system.processByPid(427);
    if (result.success && (result.command === 'ps' || result.command === 'top')) progress.inspected = true;
    if (progress.inspected && result.success && (result.command === 'ps' || result.command === 'top') && result.output.join('\n').includes('427') && result.output.join('\n').includes('96.7')) progress.identified = true;
    if (progress.identified && result.success && result.command === 'kill' && target.terminated && target.signal === 'TERM') progress.terminated = true;
    if (progress.terminated && result.success && (result.command === 'ps' || result.command === 'top') && !result.output.join('\n').includes('runaway-indexer')) progress.verified = true;
  }
  function run(raw) { const result = shell.execute(raw); write([`${promptText()} ${raw}`, ...result.output]); if (result.clear) output.replaceChildren(); if (raw.trim()) { history.push(raw); historyIndex = history.length; } update(result); render(); $('#announcer').textContent = result.success ? 'Command completed.' : result.output.join(' '); input.value = ''; input.focus(); }
  function reset() { system = new VirtualSystem(); shell = new Shell(system, { allowedCommands: commandProfiles.lab05 }); history = []; historyIndex = 0; progress = {}; hintLevel = 0; output.replaceChildren(); write(['LINUX TERMINAL ACADEMY', 'LAB 05 — PROCESS CONTROL', '', 'MISSION: Diagnose the slow fictional computer. Inspect first; do not kill random processes.', 'Everything here exists only in browser memory; it never sees your computer.']); render(); input.focus(); }
  input.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); run(input.value); } if (event.key === 'ArrowUp') { event.preventDefault(); if (history.length) input.value = history[Math.max(0, --historyIndex)]; } if (event.key === 'ArrowDown') { event.preventDefault(); input.value = historyIndex < history.length - 1 ? history[++historyIndex] : (historyIndex = history.length, ''); } if (event.ctrlKey && event.key.toLowerCase() === 'l') { event.preventDefault(); run('clear'); } });
  document.querySelectorAll('[data-command]').forEach(button => button.addEventListener('click', () => run(button.dataset.command)));
  $('#resetButton').addEventListener('click', reset); $('#hintButton').addEventListener('click', () => { hintLevel++; write([hintLevel === 1 ? 'Start with ps aux. PID 1 is a protected essential process.' : hintLevel === 2 ? 'One non-essential process uses dramatically more CPU than the others.' : 'PID 427 is the runaway indexer. Try kill 427, then ps aux to verify.']); input.focus(); }); reset();
})();
