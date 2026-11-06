/* Native links and all archive entries work without JavaScript. */
(() => {
  'use strict';
  const de = document.documentElement.lang === 'de';
  const root = document.querySelector('[data-game-browser]');
  if (root) {
    const search = root.querySelector('[data-game-search]');
    const imagesOnly = root.querySelector('[data-images-only]');
    const buttons = [...root.querySelectorAll('[data-era-filter]')];
    const groups = [...root.querySelectorAll('[data-game-era]')];
    const status = root.querySelector('[data-results]');
    const normalize = value => value.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    let selected = 'all';
    function update() {
      const query = normalize(search.value.trim());
      let count = 0;
      for (const group of groups) {
        let shown = 0;
        for (const card of group.querySelectorAll('.game-card')) {
          const matches = (selected === 'all' || group.dataset.gameEra === selected)
            && (!imagesOnly.checked || card.dataset.imageStatus === 'screenshot')
            && normalize(`${card.dataset.gameTitle} ${card.dataset.gameMemory}`).includes(query);
          card.hidden = !matches;
          if (matches) { shown++; count++; }
        }
        group.hidden = shown === 0;
      }
      buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.eraFilter === selected)));
      status.textContent = de ? `${count} von 99 Erinnerungen${count === 0 ? ' – bitte Suche oder Filter ändern.' : ''}`
        : `${count} of 99 memories${count === 0 ? ' – try another search or filter.' : ''}`;
    }
    search.addEventListener('input', update);
    imagesOnly.addEventListener('change', update);
    buttons.forEach(button => button.addEventListener('click', () => { selected = button.dataset.eraFilter; update(); }));
    root.querySelector('[data-reset-filters]').addEventListener('click', () => {
      selected = 'all'; search.value = ''; imagesOnly.checked = false; update(); search.focus();
    });
    update();
  }
  // A modal upgrades local links; originals are requested only when selected.
  const dialog = document.querySelector('.memory-lightbox');
  if (dialog && typeof dialog.showModal === 'function') {
    const image = dialog.querySelector('img');
    const caption = dialog.querySelector('p');
    const original = dialog.querySelector('.memory-original');
    let opener;
    document.addEventListener('click', event => {
      const link = event.target.closest('a[data-enlarge]');
      if (!link || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const thumb = link.querySelector('img');
      if (!thumb) return;
      event.preventDefault();
      opener = link;
      image.alt = thumb.alt;
      image.width = thumb.naturalWidth || Number(thumb.width);
      image.height = thumb.naturalHeight || Number(thumb.height);
      image.src = link.href;
      caption.textContent = link.closest('figure')?.querySelector('figcaption')?.textContent.trim() || thumb.alt;
      original.href = link.href;
      dialog.showModal();
    });
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
    });
    dialog.addEventListener('close', () => { image.removeAttribute('src'); opener?.focus({ preventScroll: true }); });
    image.addEventListener('error', () => { dialog.close(); if (opener) window.location.assign(opener.href); });
  }
  document.querySelector('[data-paperclip]')?.addEventListener('click', event => {
    const image = event.currentTarget.parentElement.querySelector('img');
    image.classList.remove('paperclip-wave');
    requestAnimationFrame(() => requestAnimationFrame(() => image.classList.add('paperclip-wave')));
  });
})();
