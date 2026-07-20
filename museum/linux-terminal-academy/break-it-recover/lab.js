(function () {
  const { VirtualSystem, Shell, commandProfiles } = window.LinuxAcademy;
  const graduation = window.LinuxAcademyGraduation;
  const $ = selector => document.querySelector(selector);
  const output = $('#terminalOutput'), input = $('#terminalInput'), prompt = $('#prompt'), mission = $('#missionList');
  let system, shell, history, historyIndex, attempt;
  const write = lines => { const block = document.createElement('pre'); block.className = 'terminal-text'; block.textContent = lines.join('\n'); output.append(block); };
  const promptText = () => `museum@linux:${system.cwd === system.homeDirectory ? '~' : system.cwd}$`;
  const checks = [['processInspected', 'INSPECT SYSTEM STATE'], ['processIdentified', 'IDENTIFY HIGH-CPU PROCESS'], ['safeProcessStopped', 'STOP RUNAWAY PROCESS SAFELY'], ['serviceInspected', 'INSPECT FAILED SERVICE'], ['journalRead', 'READ SERVICE JOURNAL'], ['permissionInspected', 'INSPECT FILE PERMISSIONS'], ['permissionIdentified', 'IDENTIFY PERMISSION PROBLEM'], ['minimumPermissionRepaired', 'REPAIR MINIMUM REQUIRED PERMISSION'], ['serviceRestarted', 'RESTART FAILED SERVICE'], ['serviceVerified', 'VERIFY SERVICE IS RUNNING']];
  function render() {
    const evidence = system.recovery.evidence, healthy = system.recoveryHealthy();
    prompt.textContent = promptText();
    mission.innerHTML = checks.map(([key, label]) => `<li class="${evidence[key] ? 'complete' : ''}">[${evidence[key] ? 'X' : ' '}] ${label}</li>`).join('') + `<li class="${healthy && checks.every(([key]) => evidence[key]) ? 'complete' : ''}">[${healthy && checks.every(([key]) => evidence[key]) ? 'X' : ' '}] VERIFY SYSTEM RECOVERY</li>`;
    const runaway = system.processByPid(733), service = system.serviceByName('museum-exhibit.service'), recoveryFile = system.recoveryFile(), file = recoveryFile && recoveryFile.node;
    const cpu = runaway.terminated ? 'NORMAL' : 'DEGRADED'; const services = service.state === 'active' ? 'HEALTHY' : 'DEGRADED'; const filesystem = file && file.mode === 'rw-------' ? 'HEALTHY' : 'PERMISSION FAULT';
    $('#healthView').textContent = `CPU:        ${cpu}\nSERVICES:   ${services}\nFILESYSTEM: ${filesystem}\nOVERALL:    ${healthy ? 'RECOVERED' : 'RECOVERY REQUIRED'}`;
    $('#recoveryView').textContent = `PROCESS      ${runaway.terminated ? 'STOPPED' : 'RUNNING'}\nSERVICE      ${service.state === 'active' ? 'RUNNING' : 'FAILED'}\nPERMISSIONS  ${file && file.mode === 'rw-------' ? 'MINIMUM REPAIR' : 'FAULT PRESENT'}`;
    const complete = healthy && checks.every(([key]) => evidence[key]);
    if (complete) attempt.recordCompletion(system);
    $('#completion').hidden = !complete;
    $('#graduation').hidden = !complete || attempt.hintUsed;
    $('#assistedNote').hidden = !complete || !attempt.hintUsed;
  }
  function run(raw) { const result = shell.execute(raw); write([`${promptText()} ${raw}`, ...result.output]); if (result.clear) output.replaceChildren(); if (raw.trim()) { history.push(raw); historyIndex = history.length; } render(); $('#announcer').textContent = result.success ? 'Command completed.' : result.output.join(' '); input.value = ''; input.focus(); }
  function reset() { system = new VirtualSystem().setupRecoveryScenario(); shell = new Shell(system, { allowedCommands: commandProfiles.lab08 }); history = []; historyIndex = 0; attempt = graduation.createAttempt(window.localStorage); output.replaceChildren(); write(['LINUX TERMINAL ACADEMY', 'LAB 08 — SYSTEM RECOVERY', '', 'The fictional museum workstation did not start correctly.', 'Three symptoms are reported: a failed service, an unreadable required file, and a process consuming excessive CPU.', '', 'MISSION: Diagnose the system. Repair only what is necessary. Verify that it is healthy again.', 'Everything here exists only in browser memory; nothing touches your computer.']); render(); input.focus(); }
  input.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); run(input.value); } if (event.key === 'ArrowUp') { event.preventDefault(); if (history.length) input.value = history[Math.max(0, --historyIndex)]; } if (event.key === 'ArrowDown') { event.preventDefault(); input.value = historyIndex < history.length - 1 ? history[++historyIndex] : (historyIndex = history.length, ''); } if (event.ctrlKey && event.key.toLowerCase() === 'l') { event.preventDefault(); run('clear'); } });
  document.querySelectorAll('[data-command]').forEach(button => button.addEventListener('click', () => run(button.dataset.command)));
  $('#resetButton').addEventListener('click', reset); $('#hintButton').addEventListener('click', () => { attempt.useHint(); write([graduation.recoveryHint(system)]); input.focus(); }); reset();
})();
