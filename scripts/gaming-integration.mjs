import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export function gamingPublication(root) {
  const file = join(root, 'content/linux-gaming-repair/publication.json');
  const value = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
  const approved = value.phase === 'public-launch' && value.allowIndexing === true;
  if ((value.activateSitemap || value.activateIntegration) && !approved) {
    throw new Error('Gaming activation requires approved public-launch indexing');
  }
  return { approved, sitemapActive: approved && value.activateSitemap === true,
    integrationActive: approved && value.activateIntegration === true };
}

const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const tr = (lang, en, de) => lang === 'de' ? de : en;
const path = lang => `${lang === 'de' ? '/de' : ''}/linux-gaming-repair/`;

export function gamingIntegration(root) {
  const state = gamingPublication(root);
  const empty = { nav: () => '', landing: () => '', problem: () => '', hardware: () => '' };
  if (!state.integrationActive) return empty;
  const file = join(root, 'content/linux-gaming-repair/integration.json');
  const map = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
  function related(articles, lang) {
    if (!articles?.length) return '';
    for (const article of articles) {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(article.id) || typeof article.title?.[lang] !== 'string') {
        throw new Error('Invalid gaming backlink');
      }
    }
    return `<section id="gaming-context"><h2>${tr(lang, 'Investigate the gaming failure path', 'Den Fehlerweg im Spiel untersuchen')}</h2><p>${tr(lang, 'Connect these system observations to Proton, Vulkan and frame-time evidence. A detected GPU or a reset message alone does not establish the cause of a game crash.', 'Verbinde diese Systembefunde mit Proton-, Vulkan- und Frame-Time-Hinweisen. Eine erkannte GPU oder eine Reset-Meldung allein belegt die Ursache eines Spielabsturzes nicht.')}</p><ul>${articles.map(article => `<li><a href="${path(lang)}${article.id}/">${escape(article.title[lang])}</a></li>`).join('')}</ul><p><a href="${path(lang)}#assistants">${tr(lang, 'Follow the gaming diagnostic questions', 'Gaming-Diagnosefragen durchgehen')}</a> · <a href="${path(lang)}#log-inspector">${tr(lang, 'Inspect gaming logs locally', 'Gaming-Logs lokal prüfen')}</a></p></section>`;
  }
  return {
    nav: lang => `<a href="${path(lang)}">Gaming Repair</a>`,
    landing: lang => `<section id="gaming-repair" class="lab-section"><h2>${tr(lang, 'Trace a gaming problem through the right layers', 'Gaming-Probleme auf den passenden Ebenen verfolgen')}</h2><p>${tr(lang, 'Inspect Proton, Wine, Vulkan and kernel logs locally, investigate distinct crash paths and build reversible Steam launch options. Storage stalls and GPU failures remain separate evidence.', 'Prüfe Proton-, Wine-, Vulkan- und Kernel-Logs lokal, untersuche unterschiedliche Absturzwege und baue rücknehmbare Steam-Startoptionen. Speicherpausen und GPU-Fehler bleiben getrennte Hinweise.')}</p><a class="lab-button" href="${path(lang)}">${tr(lang, 'Open Linux Gaming Repair Center', 'Linux Gaming Repair Center öffnen')}</a></section>`,
    problem: (id, lang) => related(map.articlesByProblem?.[id], lang),
    hardware: (id, lang) => related(map.articlesByHardware?.[id], lang),
  };
}
