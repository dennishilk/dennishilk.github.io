/* Progressive enhancement: chapters, disclosure links and the embedded calculator. */
(() => {
  'use strict';
  if (!document.body.classList.contains('wow-diary-page')) return;
  function reveal(hash, scroll) {
    if (!hash || hash === '#') return;
    const calculatorHash = hash === '#paladin-calculator' || hash.startsWith('#paladin=');
    const panel = document.getElementById('diary-calculator-panel');
    if (calculatorHash && panel) panel.open = true;
    let id;
    try { id = calculatorHash ? 'paladin-calculator' : decodeURIComponent(hash.slice(1)); }
    catch { return; }
    const target = document.getElementById(id);
    if (!target) return;
    let expanded = false;
    for (let element = target; element; element = element.parentElement) {
      if (element instanceof HTMLDetailsElement && !element.open) {
        element.open = true;
        expanded = true;
      }
    }
    // Explicit scroll is needed for historical targets in a previously closed entry.
    if (scroll || expanded) requestAnimationFrame(() => target.scrollIntoView({block:'start', behavior:'auto'}));
  }
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || event.defaultPrevented || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    reveal(link.getAttribute('href'), false);
  });
  window.addEventListener('hashchange', () => reveal(location.hash, true));
  reveal(location.hash, Boolean(location.hash));

  const links = [...document.querySelectorAll('[data-diary-nav]')];
  const sections = [...document.querySelectorAll('[data-diary-section]')];
  if (!('IntersectionObserver' in window) || !links.length) return;
  const visible = new Set();
  const update = () => {
    const current = sections.filter(section => visible.has(section))
      .sort((a,b) => Math.abs(a.getBoundingClientRect().top - 140) - Math.abs(b.getBoundingClientRect().top - 140))[0];
    if (!current) return;
    for (const link of links) {
      if (link.dataset.diaryNav === current.dataset.diarySection) link.setAttribute('aria-current','location');
      else link.removeAttribute('aria-current');
    }
  };
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target);
    update();
  }, {rootMargin:'-100px 0px -40% 0px', threshold:0});
  for (const section of sections) observer.observe(section);
})();
