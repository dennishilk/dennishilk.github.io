(() => {
  "use strict";
// Public, read-only snapshots. This observer is independent of website traffic.
const ENDPOINT = '/data/nebuverse/storage.json';
const POLL_INTERVAL_MS = 60_000;
const MAX_SNAPSHOT_LENGTH = 4096;
const FUTURE_TOLERANCE_MS = 60_000;

const copy = {
  en: {
    title: 'NEBUVERSE STORAGE TELEMETRY', instance: 'Personal Mastodon Instance',
    powered: 'Powered by GoToSocial · NEBUVERSE', media: 'MEDIA STORAGE', database: 'SQLITE DATABASE',
    total: 'TOTAL GOTOSOCIAL STORAGE', available: 'AVAILABLE DISK SPACE', last: 'Last successful measurement',
    warning: 'Warning status', awaiting: 'Awaiting telemetry', unavailable: 'Data unavailable',
    current: 'Up to date', stale: 'Stale data', healthy: 'Within thresholds',
    usageWarning: 'Storage threshold reached', diskWarning: 'Low disk space',
    bothWarnings: 'Storage threshold reached · Low disk space',
    waitingNote: 'Storage measurements are not available yet.',
    unavailableNote: 'The storage snapshot could not be loaded.',
    retainedNote: 'Snapshot refresh failed. Showing the last successful measurement.',
    staleNote: 'Showing the last successful measurement. A fresh snapshot is overdue.',
    currentNote: 'Measured disk usage · Total includes media and SQLite journal files.',
    threshold: 'Usage warning threshold', thresholds: (used, free) => `Warning at ${used} used or below ${free} free.`,
    meter: (used, limit) => `${used} used; warning at ${limit}`,
  },
  de: {
    title: 'NEBUVERSE SPEICHER-TELEMETRIE', instance: 'Persönliche Mastodon-Instanz',
    powered: 'Powered by GoToSocial · NEBUVERSE', media: 'MEDIENSPEICHER', database: 'SQLITE-DATENBANK',
    total: 'GOTOSOCIAL-SPEICHER GESAMT', available: 'VERFÜGBARER SPEICHERPLATZ', last: 'Letzte erfolgreiche Messung',
    warning: 'Warnstatus', awaiting: 'Warten auf Telemetrie', unavailable: 'Daten nicht verfügbar',
    current: 'Aktuell', stale: 'Veraltete Daten', healthy: 'Innerhalb der Grenzwerte',
    usageWarning: 'Speicher-Warngrenze erreicht', diskWarning: 'Wenig freier Speicherplatz',
    bothWarnings: 'Speicher-Warngrenze erreicht · Wenig freier Speicherplatz',
    waitingNote: 'Es liegen noch keine Speichermesswerte vor.',
    unavailableNote: 'Die Speichermesswerte konnten nicht geladen werden.',
    retainedNote: 'Aktualisierung fehlgeschlagen. Die letzte erfolgreiche Messung wird angezeigt.',
    staleNote: 'Die letzte erfolgreiche Messung wird angezeigt. Neue Messwerte sind überfällig.',
    currentNote: 'Belegter Speicherplatz · Gesamtwert einschließlich Medien und SQLite-Journaldateien.',
    threshold: 'Speicher-Warngrenze', thresholds: (used, free) => `Warnung ab ${used} belegt oder unter ${free} frei.`,
    meter: (used, limit) => `${used} belegt; Warnung ab ${limit}`,
  },
};

const integer = (value, minimum = 0) => Number.isSafeInteger(value) && value >= minimum;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);

function validateSnapshot(payload, now = Date.now()) {
  if (!object(payload) || payload.schema_version !== 1 || !object(payload.storage) || !object(payload.thresholds)) {
    throw new Error('Invalid storage snapshot');
  }
  const { media_bytes, database_bytes, total_bytes, available_bytes } = payload.storage;
  const { usage_warning_bytes, free_warning_bytes } = payload.thresholds;
  const measured = Date.parse(payload.measured_at);
  if (![media_bytes, database_bytes, total_bytes, available_bytes].every(value => integer(value)) ||
      !integer(usage_warning_bytes, 1) || !integer(free_warning_bytes, 1) ||
      !integer(payload.stale_after_seconds, 60) || payload.stale_after_seconds > 86400 ||
      total_bytes !== media_bytes + database_bytes ||
      typeof payload.measured_at !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(payload.measured_at) ||
      !Number.isFinite(measured) || new Date(measured).toISOString().replace('.000Z', 'Z') !== payload.measured_at ||
      measured > now + FUTURE_TOLERANCE_MS) {
    throw new Error('Invalid storage snapshot');
  }
  const warning = total_bytes >= usage_warning_bytes || available_bytes < free_warning_bytes;
  if (payload.status !== (warning ? 'warning' : 'ok')) throw new Error('Inconsistent storage status');
  // Keep only the public contract. Unknown properties never reach the page.
  return {
    schema_version: 1, status: payload.status, measured_at: payload.measured_at,
    stale_after_seconds: payload.stale_after_seconds,
    storage: { media_bytes, database_bytes, total_bytes, available_bytes },
    thresholds: { usage_warning_bytes, free_warning_bytes },
  };
}

function snapshotState(snapshot, error = null, now = Date.now()) {
  if (!snapshot) return error === 'unavailable' ? 'unavailable' : 'awaiting';
  const age = now - Date.parse(snapshot.measured_at);
  if (age < -FUTURE_TOLERANCE_MS) return 'unavailable';
  if (age >= snapshot.stale_after_seconds * 1000) return 'stale';
  return error ? 'unavailable' : 'current';
}

function formatBytes(bytes, language = 'en') {
  if (!integer(bytes)) return '—';
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'];
  const exponent = Math.min(bytes ? Math.floor(Math.log(bytes) / Math.log(1024)) : 0, units.length - 1);
  const amount = new Intl.NumberFormat(language === 'de' ? 'de-DE' : 'en-US', {
    maximumFractionDigits: exponent ? 2 : 0,
  }).format(bytes / 1024 ** exponent);
  return `${amount} ${units[exponent]}`;
}

function renderStorage(doc, snapshot, { error = null, now = Date.now(), language = 'en' } = {}) {
  const panel = doc.getElementById('nebuverse-storage');
  if (!panel) return;
  const strings = copy[language] || copy.en;
  const set = (id, text) => { const element = doc.getElementById(id); if (element) element.textContent = text; };
  panel.querySelectorAll('[data-storage-copy]').forEach(element => {
    const value = strings[element.dataset.storageCopy];
    if (typeof value === 'string') element.textContent = value;
  });
  const state = snapshotState(snapshot, error, now);
  panel.dataset.state = state;
  set('nebuverse-state', strings[state]);
  for (const field of ['media', 'database', 'total', 'available']) {
    set(`nebuverse-${field}`, formatBytes(snapshot?.storage[`${field}_bytes`], language));
  }
  const last = doc.getElementById('nebuverse-measured');
  if (snapshot) {
    last.dateTime = snapshot.measured_at;
    last.textContent = new Intl.DateTimeFormat(language === 'de' ? 'de-DE' : 'en-GB', {
      timeZone: 'Europe/Berlin', dateStyle: 'medium', timeStyle: 'medium',
    }).format(new Date(snapshot.measured_at)) + ' (Europe/Berlin)';
  } else { last.removeAttribute('datetime'); last.textContent = '—'; }
  let warning = '—';
  if (snapshot) {
    const usage = snapshot.storage.total_bytes >= snapshot.thresholds.usage_warning_bytes;
    const disk = snapshot.storage.available_bytes < snapshot.thresholds.free_warning_bytes;
    warning = usage && disk ? strings.bothWarnings : usage ? strings.usageWarning : disk ? strings.diskWarning : strings.healthy;
  }
  panel.dataset.warning = snapshot?.status || 'unknown';
  set('nebuverse-warning', warning);
  set('nebuverse-note', state === 'awaiting' ? strings.waitingNote : state === 'stale' ? strings.staleNote :
    state === 'unavailable' ? (snapshot ? strings.retainedNote : strings.unavailableNote) : strings.currentNote);
  const threshold = doc.getElementById('nebuverse-threshold');
  threshold.hidden = !snapshot;
  if (snapshot) {
    const used = formatBytes(snapshot.storage.total_bytes, language);
    const limit = formatBytes(snapshot.thresholds.usage_warning_bytes, language);
    const free = formatBytes(snapshot.thresholds.free_warning_bytes, language);
    const meter = doc.getElementById('nebuverse-meter');
    meter.max = snapshot.thresholds.usage_warning_bytes;
    meter.value = Math.min(snapshot.storage.total_bytes, meter.max);
    meter.setAttribute('aria-label', strings.meter(used, limit));
    set('nebuverse-usage-limit', `${used} / ${limit}`);
    set('nebuverse-thresholds', strings.thresholds(limit, free));
  }
}

function startStorageObserver({ doc = globalThis.document, win = globalThis.window,
  fetchSnapshot = globalThis.fetch, now = () => Date.now() } = {}) {
  if (!doc?.getElementById('nebuverse-storage')) return null;
  let snapshot = null, error = null, pending = false;
  const language = () => win.__DENNIS_WORLD_OBSERVER_MIRROR_SOURCE_PATH ||
    doc.documentElement?.lang?.toLowerCase().startsWith('de') ? 'de' : 'en';
  const render = () => renderStorage(doc, snapshot, { error, now: now(), language: language() });
  const refresh = async () => {
    render();
    if (pending || doc.hidden) return;
    pending = true;
    const controller = new AbortController();
    const timeout = win.setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetchSnapshot(`${ENDPOINT}?t=${now()}`, {
        cache: 'no-store', credentials: 'omit', mode: 'same-origin', signal: controller.signal,
      });
      if (!response.ok || response.redirected) {
        error = response.status === 404 && !snapshot ? 'missing' : 'unavailable';
      } else {
        const text = await response.text();
        if (text.length > MAX_SNAPSHOT_LENGTH) throw new Error('Invalid storage snapshot');
        const next = validateSnapshot(JSON.parse(text), now());
        if (snapshot && next.measured_at < snapshot.measured_at) throw new Error('Outdated storage snapshot');
        snapshot = next;
        error = null;
      }
    } catch { error = 'unavailable'; }
    finally { win.clearTimeout(timeout); pending = false; render(); }
  };
  const visibility = () => { if (!doc.hidden) void refresh(); };
  doc.addEventListener('visibilitychange', visibility);
  const interval = win.setInterval(() => { void refresh(); }, POLL_INTERVAL_MS);
  void refresh();
  return { refresh, stop() { win.clearInterval(interval); doc.removeEventListener('visibilitychange', visibility); } };
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') startStorageObserver();

if (typeof module !== "undefined" && module.exports) module.exports = { ENDPOINT, POLL_INTERVAL_MS, validateSnapshot, snapshotState, formatBytes, renderStorage, startStorageObserver };
})();
