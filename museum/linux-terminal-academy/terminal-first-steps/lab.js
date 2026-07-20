(function () {
  const { VirtualSystem, Shell } = window.LinuxAcademy;
  const output = document.querySelector('#terminalOutput'), input = document.querySelector('#terminalInput');
  const prompt = document.querySelector('#prompt'), mission = document.querySelector('#missionList');
  const guidance = document.querySelector('#guidance'), announcer = document.querySelector('#announcer');
  let system, shell, history, historyIndex, progress;
  const text = lines => { const block = document.createElement('pre'); block.className = 'terminal-text'; block.textContent = lines.join('\n'); output.append(block); };
  function promptText() { return `museum@linux:${system.cwd === system.homeDirectory ? '~' : system.cwd}$`; }
  function render() {
    prompt.textContent = promptText();
    mission.innerHTML = [['pwd', 'WHERE AM I?'], ['whoami', 'WHO AM I?'], ['ls', 'WHAT FILES ARE HERE?']].map(([key, label]) => `<li class="${progress[key] ? 'complete' : ''}"><span aria-hidden="true">[${progress[key] ? 'X' : ' '}]</span> ${label}</li>`).join('');
    const done = Object.values(progress).every(Boolean);
    document.querySelector('#completion').hidden = !done;
    guidance.textContent = done ? 'OPTIONAL EXPLORATION: cd /  ·  ls  ·  cd home  ·  ls  ·  cd museum  ·  pwd' : !progress.pwd ? 'TRY: pwd' : !progress.whoami ? 'GOOD. NOW FIND OUT WHO YOU ARE. TRY: whoami' : 'NOW LOOK AROUND. TRY: ls';
  }
  function welcome() { text(['LINUX TERMINAL ACADEMY', 'LAB 01 — TERMINAL FIRST STEPS', '', 'THIS COMPUTER IS FICTIONAL.', 'YOU CANNOT BREAK YOUR REAL COMPUTER.', '', 'MISSION: LEARN HOW TO ASK THE SYSTEM SIMPLE QUESTIONS.', '', 'TRY:', 'pwd']); }
  function reset() { system = new VirtualSystem(); shell = new Shell(system); history = []; historyIndex = 0; progress = { pwd: false, whoami: false, ls: false }; output.replaceChildren(); welcome(); render(); input.value = ''; input.focus(); announcer.textContent = 'Lab reset. Your virtual directory is home.'; }
  function run(raw) {
    const value = raw.trim(); if (!value) return;
    text([`${promptText()} ${value}`]); history.push(value); historyIndex = history.length;
    const result = shell.execute(value);
    if (result.clear) output.replaceChildren(); else if (result.output.length) text(result.output);
    if (result.success && Object.prototype.hasOwnProperty.call(progress, result.command)) progress[result.command] = true;
    render(); input.value = ''; input.focus();
    announcer.textContent = result.success ? `${result.command} completed.` : result.output.join(' ');
  }
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter') { event.preventDefault(); run(input.value); }
    if (event.key === 'ArrowUp') { event.preventDefault(); if (history.length) { historyIndex = Math.max(0, historyIndex - 1); input.value = history[historyIndex]; } }
    if (event.key === 'ArrowDown') { event.preventDefault(); historyIndex = Math.min(history.length, historyIndex + 1); input.value = history[historyIndex] || ''; }
  });
  document.addEventListener('keydown', event => { if (event.ctrlKey && event.key.toLowerCase() === 'l') { event.preventDefault(); run('clear'); } });
  document.querySelector('#terminal').addEventListener('click', () => input.focus());
  document.querySelectorAll('[data-command]').forEach(button => button.addEventListener('click', () => run(button.dataset.command)));
  document.querySelector('#hintButton').addEventListener('click', () => { announcer.textContent = guidance.textContent; guidance.classList.add('revealed'); });
  document.querySelector('#resetButton').addEventListener('click', reset);
  reset();
})();
