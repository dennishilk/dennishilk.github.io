/* WoW Forever Observer: reads public, same-origin data only. Blizzard credentials never reach this page. */
(() => {
  'use strict';
  const card = document.querySelector('[data-forever-card]');
  if (!card) return;
  const lang = document.documentElement.lang === 'de' ? 'de' : 'en';
  const locale = lang === 'de' ? 'de-DE' : 'en-GB';
  const labels = lang === 'de' ? {
    synced: 'API synchronisiert', checked: 'Letzter erfolgreicher Abgleich',
    stale: 'Gespeicherter Stand (der Abgleich ist momentan nicht aktuell)',
    level: 'Stufe', empty: 'Noch keine Live-Daten verfügbar',
    skill: 'Punkte', login: 'Letzter gemeldeter Login'
  } : {
    synced: 'API synchronised', checked: 'Last successful sync',
    stale: 'Saved snapshot (updates are currently delayed)',
    level: 'Level', empty: 'Live data not yet available',
    skill: 'Skill', login: 'Last reported login'
  };
  const target = (key) => card.querySelector('[data-forever-' + key + ']');
  const number = (x) => new Intl.NumberFormat(locale).format(x);
  const date = (value) => new Intl.DateTimeFormat(locale, {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin',
    timeZoneName: 'short'
  }).format(new Date(value));
  const validInt = (x, max) => Number.isInteger(x) && x >= 0 && x <= max;
  function showList(node, entries, format) {
    if (!node) return;
    const list = document.createDocumentFragment();
    for (const entry of entries.slice(0, 30)) {
      const li = document.createElement('li');
      li.textContent = format(entry);
      list.append(li);
    }
    if (list.childNodes.length) node.replaceChildren(list);
  }
  async function refresh() {
    try {
      const response = await fetch('/world-observer/data/wow-forever-dennis-hilk.json', {
        cache: 'no-store', credentials: 'same-origin'
      });
      if (!response.ok) return;
      const data = await response.json();
      if (!data || data.schema_version !== 1 || data.source !== 'blizzard-forever-eu') return;
      const character = data.character;
      if (!character || character.name !== 'Dennis' || character.surname !== 'Hilk' ||
          !validInt(character.level, 100) || character.level < 1) return;
      const sync = Date.parse(data.last_success_at);
      const expires = Date.parse(data.expires_at);
      const now = Date.now();
      if (!Number.isFinite(sync) || !Number.isFinite(expires) || sync > now + 300000 ||
          now >= expires || now - sync > 29 * 86400000) return;
      const status = target('status');
      const old = now - sync > 48 * 3600000;
      if (status) status.textContent = (old ? labels.stale : labels.synced) + ' · ' +
        labels.checked + ': ' + date(sync);
      const level = target('level');
      if (level) level.textContent = labels.level + ' ' + number(character.level);
      const xp = target('xp');
      if (xp && validInt(character.experience, 1000000000))
        xp.textContent = number(character.experience) + ' XP';
      const ilvl = target('ilvl');
      if (ilvl && validInt(character.average_item_level, 10000))
        ilvl.textContent = number(character.average_item_level);
      const login = target('login');
      if (login && Number.isFinite(character.last_login_timestamp) &&
          character.last_login_timestamp > 0)
        login.textContent = labels.login + ': ' + date(character.last_login_timestamp);
      if (Array.isArray(data.professions)) {
        showList(target('professions'), data.professions.filter((p) =>
          p && typeof p.name === 'string' && p.name.length < 100 &&
          validInt(p.skill_points, 1000) && validInt(p.max_skill_points, 1000)),
          (p) => p.name + ' · ' + number(p.skill_points) + '/' + number(p.max_skill_points));
      }
      if (Array.isArray(data.equipment)) {
        showList(target('equipment'), data.equipment.filter((p) =>
          p && typeof p.slot === 'string' && p.slot.length < 100 &&
          typeof p.name === 'string' && p.name.length < 140),
          (p) => p.slot + ': ' + p.name +
            (validInt(p.item_level, 10000) ? ' (iLvl ' + number(p.item_level) + ')' : ''));
      }
    } catch (_) {
      /* Network failure: leave the clearly dated fallback visible. */
    }
  }
  refresh();
  window.setInterval(() => {
    if (document.visibilityState === 'visible') refresh();
  }, 15 * 60 * 1000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refresh();
  });
})();