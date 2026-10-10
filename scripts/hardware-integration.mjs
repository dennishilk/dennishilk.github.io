import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export function hardwarePublication(root) {
  const file = join(root, 'content/linux-hardware-explorer/publication.json');
  const value = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
  const approved = value.phase === 'public-launch' && value.allowIndexing === true;
  if ((value.activateSitemap || value.activateIntegration) && !approved) throw new Error('Hardware activation requires approved public-launch indexing');
  return { approved, sitemapActive: approved && value.activateSitemap === true, integrationActive: approved && value.activateIntegration === true };
}
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const path = lang => `${lang === 'de' ? '/de' : ''}/linux-hardware-explorer/`;
export function hardwareIntegration(root) {
  const state = hardwarePublication(root);
  if (!state.integrationActive) return { nav: () => '', landing: () => '', problem: () => '' };
  const file = join(root, 'content/linux-hardware-explorer/integration.json');
  if (!existsSync(file)) throw new Error('Build Hardware Explorer before activating Fix Lab integration');
  const backlinks = JSON.parse(readFileSync(file, 'utf8')).profilesByProblem;
  const tr = (lang, en, de) => lang === 'de' ? de : en;
  return {
    nav: lang => `<a href="${path(lang)}">${tr(lang, 'Hardware Explorer', 'Hardware-Explorer')}</a>`,
    landing: lang => `<section id="hardware-explorer" class="lab-section"><h2>${tr(lang, 'Identify hardware before changing drivers', 'Hardware vor Treiberänderungen erkennen')}</h2><p>${tr(lang, 'Compare PCI and USB identities, reported binding and firmware evidence locally. Device detection and successful operation are separate observations.', 'Vergleiche PCI- und USB-Identitäten, gemeldete Bindung und Firmwarebelege lokal. Geräteerkennung und erfolgreiche Funktion sind getrennte Befunde.')}</p><a class="lab-button" href="${path(lang)}">${tr(lang, 'Open the Hardware & Driver Explorer', 'Hardware- und Treiber-Explorer öffnen')}</a></section>`,
    problem: (id, lang) => {
      const profiles = backlinks[id] || []; if (!profiles.length) return '';
      for (const p of profiles) if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.id) || !p.name?.[lang]) throw new Error('Invalid hardware backlink');
      return `<section id="hardware-context"><h2>${tr(lang, 'Related hardware and driver context', 'Passender Hardware- und Treiberkontext')}</h2><p>${tr(lang, 'These profiles explain relevant driver paths. They do not establish that your device has this fault. Identify your device and binding first.', 'Diese Profile erklären passende Treiberwege. Sie bestätigen diesen Fehler bei deinem Gerät nicht. Kläre zuerst Geräteidentität und Bindung.')}</p><ul>${profiles.map(p => `<li><a href="${path(lang)}${p.id}/">${escape(p.name[lang])}</a></li>`).join('')}</ul><a href="${path(lang)}#identify">${tr(lang, 'Identify hardware locally', 'Hardware lokal erkennen')}</a></section>`;
    },
  };
}
