// Progressive enhancement: originals remain normal links without JavaScript.
(() => {
  const links = [...document.querySelectorAll('[data-wow40-lightbox]')];
  if (!links.length || typeof HTMLDialogElement === 'undefined') return;
  const dialog = document.createElement('dialog');
  dialog.className = 'wow40-lightbox';
  const close = document.createElement('button'), photo = document.createElement('img');
  close.type = 'button';
  close.textContent = document.documentElement.lang === 'de' ? 'Schließen ×' : 'Close ×';
  dialog.append(close, photo); document.body.append(dialog);
  close.onclick = () => dialog.close();
  dialog.onclick = event => {if (event.target === dialog) dialog.close();};
  for (const link of links) link.onclick = event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); photo.src = link.href; photo.alt = link.querySelector('img')?.alt || '';
    dialog.showModal();
  };
})();
