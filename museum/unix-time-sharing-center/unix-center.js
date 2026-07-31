(() => {
  const screen = document.querySelector('.screen');
  const initial = screen.querySelector('pre').innerHTML;
  const applyDisplay = () => {
    screen.style.filter = `brightness(${brightness.value}%) contrast(${contrast.value}%)`;
  };
  const brightness = document.querySelector('#brightness');
  const contrast = document.querySelector('#contrast');
  brightness.addEventListener('input', applyDisplay);
  contrast.addEventListener('input', applyDisplay);
  document.querySelector('#clear').addEventListener('click', () => { screen.querySelector('pre').textContent = ''; });
  document.querySelector('#reset').addEventListener('click', () => { screen.querySelector('pre').innerHTML = initial; brightness.value = 100; contrast.value = 100; applyDisplay(); });
  document.querySelector('#fullscreen').addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.querySelector('.terminal-station').requestFullscreen?.();
  });
})();
