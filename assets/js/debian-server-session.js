(() => {
  const terminal = document.querySelector('#debian-terminal');
  const history = document.querySelector('#terminal-history');
  const input = document.querySelector('#terminal-input');

  if (!terminal || !history || !input) return;

  const prompt = 'visitor@lab-node:~$';

  const appendLine = (text, className) => {
    const line = document.createElement('div');
    line.className = className;
    line.textContent = text;
    history.append(line);
  };

  const scrollToLatest = () => {
    terminal.scrollTop = terminal.scrollHeight;
  };

  // Temporary phase-one fallback. Replace this function when the session engine is connected.
  const appendDisconnectedEngineMessage = () => {
    appendLine('Session engine not yet connected.', 'debian-terminal-message');
  };

  const submitLine = () => {
    const command = input.value;
    appendLine(`${prompt}${command ? ` ${command}` : ''}`, 'debian-terminal-command');
    input.value = '';

    if (command.trim()) appendDisconnectedEngineMessage();
    scrollToLatest();
  };

  input.addEventListener('keydown', (event) => {
    if (event.ctrlKey && event.key.toLowerCase() === 'l') {
      event.preventDefault();
      history.replaceChildren();
      input.value = '';
      scrollToLatest();
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      submitLine();
    }
  });

  terminal.addEventListener('click', () => input.focus());
  input.focus();
})();
