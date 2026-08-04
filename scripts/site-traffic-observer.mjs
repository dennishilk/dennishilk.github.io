import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { execFileSync } from 'node:child_process';

const BERLIN_TZ = 'Europe/Berlin';
const STATIC_EXT = /\.(?:css|js|mjs|map|png|jpe?g|gif|webp|svg|ico|avif|bmp|tiff?|woff2?|ttf|otf|eot|txt|xml|json|webmanifest|wasm|mp4|webm|mp3|ogg|pdf|zip|gz|br)(?:$|[?#])/i;
const STATIC_NAMES = /^(?:\/)?(?:favicon\.ico|favicon\.png|robots\.txt|sitemap\.xml|site\.webmanifest|manifest\.json)$/i;
const SCANNER_PATH = /(?:wp-admin|wp-login|xmlrpc\.php|\.env|phpmyadmin|cgi-bin|\.git|vendor\/phpunit|boaform|setup\.cgi|admin\/|login\.action|\.\.|%2e|etc\/passwd|proc\/self|boot\.ini|win\.ini|windows\/system32|webshell|cmd=|exec=|shell\.php|upload\.php)/i;
const BOT_UA = /bot|crawler|spider|slurp|bingpreview|facebookexternalhit|preview|monitor|uptime|curl|wget|python-requests|go-http-client|httpclient|headless/i;
const SCANNER_UA = /zgrab|masscan|nmap|nikto|sqlmap|acunetix|nessus|openvas|dirbuster|gobuster|wpscan|botnet|scanner/i;
const SUCCESS = new Set([200, 201, 202, 203, 204, 206, 301, 302, 303, 304, 307, 308]);
// This is intentionally exact: traffic.html only polls this generated payload.  A
// direct browser navigation is still a normal request, but the polling request is
// not useful observation data.  Bot and scanner classification takes precedence.
const OBSERVER_INTERNAL_PATHS = new Set(['/data/site-traffic.json']);
export const SITE_TRAFFIC_INITIAL_TOTAL = 50000;
export const NOVEL_READER_STATE_SCHEMA_VERSION = 3;
export const NOVEL_CHAPTER_OPENS_PREVIOUS_INCORRECT_BASELINE = 2400;
export const NOVEL_CHAPTER_OPENS_HISTORICAL_BASELINE = 26317;
// 2.40 aligns strictly filtered first-party log values with the historically observed novel counter.
// 0.75 is a provisional reader estimate within calibrated 24H pageviews.
// Both values will be reviewed against future screenshots and can be adjusted here.
export const NOVEL_PAGEVIEWS_DISPLAY_FACTOR = 2.40;
export const NOVEL_READER_RATIO = 0.75;
const NOVEL_LANDING_PATH = '/lost-administrator/novel/';
const NOVEL_MANIFEST = JSON.parse(fs.readFileSync(new URL('../content/lost-administrator/novel/novel-manifest.json', import.meta.url), 'utf8'));
const NOVEL_CHAPTERS = Object.freeze(NOVEL_MANIFEST.chapters.map(({ number, slug, title }) => Object.freeze({
  number, slug, title, path: `${NOVEL_LANDING_PATH}chapters/${slug}/`,
})));
const NOVEL_CHAPTER_BY_PATH = new Map(NOVEL_CHAPTERS.map(chapter => [chapter.path, chapter]));

const SCANNER_INTENT_PRIORITY = [
  'path_traversal',
  'secret_hunting',
  'config_backup_discovery',
  'wordpress_probing',
  'iot_camera_probing',
  'generic_exploit_probing',
  'admin_discovery',
  'unknown_scanner_noise',
];

const SCANNER_INTENT_LABELS = {
  path_traversal: 'Path traversal',
  secret_hunting: 'Secret hunting',
  config_backup_discovery: 'Config and backup discovery',
  wordpress_probing: 'WordPress probing',
  iot_camera_probing: 'IoT/camera probing',
  generic_exploit_probing: 'Generic exploit probing',
  admin_discovery: 'Admin discovery',
  unknown_scanner_noise: 'Unknown scanner noise',
};

export const SCANNER_INTENT_DECORATIVE_MASKS = Object.freeze([
  '███.██.███.█',
  '█.███.██.███',
  '██.█.███.██',
  '███.███.█.██',
  '██.███.█.███',
]);

function normalizePathForScannerIntent(req) {
  let value = String(req?.path || '/').replace(/[?#].*$/, '');
  for (let i = 0; i < 3; i++) {
    try {
      const decoded = decodeURIComponent(value);
      if (decoded === value) break;
      value = decoded;
    } catch {
      break;
    }
  }
  return value.replace(/\\/g, '/').toLowerCase();
}

export function classifyScannerIntent(req) {
  const path = normalizePathForScannerIntent(req);
  const filename = path.split('/').pop() || '';

  if (/(?:^|\/)\.\.(?:\/|$)/.test(path) || /(?:^|\/)etc\/passwd(?:$|\/)/.test(path) || /(?:^|\/)proc\/self(?:$|\/)/.test(path) || /(?:^|\/)boot\.ini$/.test(path) || /(?:^|\/)win\.ini$/.test(path) || /windows\/system32/.test(path)) return 'path_traversal';
  if (/(?:^|\/)\.env(?:[./_-]|$)/.test(path) || /(?:^|\/)\.git\/(?:config|head)(?:$|[/?#])/.test(path) || /(?:^|\/)\.svn(?:\/|$)/.test(path) || /(?:credential|credentials|secret|secrets|token|api[-_]?key|apikey|access[-_]?key|private[-_]?key)/.test(filename) || /(?:aws|gcp|google|azure|cloud).*(?:credential|config|key)/.test(path) || /(?:^|\/)(?:\.ssh|id_rsa|id_dsa|id_ecdsa|id_ed25519|authorized_keys)(?:\/|$)/.test(path)) return 'secret_hunting';
  if (/(?:~|\.(?:bak|backup|old|orig|save|swp|sql|dump))$/.test(filename)) return 'config_backup_discovery';
  if (/(?:^|\/)(?:wp-admin|wp-login\.php|wp-admin\/install\.php|xmlrpc\.php|wp-content|wp-includes)(?:\/|$)/.test(path) || /(?:^|\/)wp-content\/(?:plugins|themes)\//.test(path)) return 'wordpress_probing';
  if (/(?:cgi-bin|\/cgi\/|hnap|camera|webcam|dvr|nvr|router|boaform|goform|setup\.cgi)/.test(path)) return 'iot_camera_probing';
  if (/(?:cmd=|exec=|command=|passthru|shell_exec|system\(|\$\(|%24%28|;\s*(?:curl|wget)\b|(?:curl|wget)\+|vendor\/phpunit|eval-stdin|phpunit|webshell|c99|r57|(?:shell|upload|cmd)\.php)/.test(path)) return 'generic_exploit_probing';
  if (/^\/(?:admin|administrator|login|panel|phpmyadmin|manager|console|dashboard)(?:\/|$)/.test(path)) return 'admin_discovery';
  return 'unknown_scanner_noise';
}

export function parseNginxTime(value) {
  const m = String(value).match(/^(\d{2})\/(\w{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2}) ([+-])(\d{2})(\d{2})$/);
  if (!m) return null;
  const months = {Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};
  const [,dd,mon,yyyy,hh,mm,ss,sign,oh,om] = m;
  if (!(mon in months)) return null;
  const utc = Date.UTC(+yyyy, months[mon], +dd, +hh, +mm, +ss);
  const offset = (+oh * 60 + +om) * 60_000 * (sign === '+' ? 1 : -1);
  return new Date(utc - offset);
}

export function berlinDateKey(date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: BERLIN_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

export function berlinTime(date) {
  return new Intl.DateTimeFormat('de-DE', { timeZone: BERLIN_TZ, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(date);
}

export function parseLogLine(line) {
  const m = line.match(/^(\S+) \S+ \S+ \[([^\]]+)\] "(\S+)\s+([^"\s]+)(?:\s+HTTP\/[^"\s]+)?" (\d{3}) \S+ "([^"]*)" "([^"]*)"/);
  if (!m) return null;
  const [, ip, rawTime, method, rawTarget, status, referrer, userAgent] = m;
  const url = rawTarget.split('?')[0] || '/';
  return { ip, time: parseNginxTime(rawTime), method, path: url, status: Number(status), referrer, userAgent };
}

export function classifyRequest(req) {
  const ua = req.userAgent || '';
  if (SCANNER_PATH.test(req.path) || SCANNER_UA.test(ua)) return 'scanner';
  if (BOT_UA.test(ua)) return 'bot';
  if (['GET', 'HEAD'].includes(req.method) && OBSERVER_INTERNAL_PATHS.has(req.path)) return 'observer_internal';
  return 'human';
}

export function isDocumentPath(pathname) {
  const p = pathname || '/';
  if (STATIC_NAMES.test(p) || STATIC_EXT.test(p)) return false;
  if (p === '/') return true;
  if (/\.html?$/i.test(p)) return true;
  const last = p.split('/').pop() || '';
  return !last.includes('.');
}

export function isPageview(req, kind = classifyRequest(req)) {
  return kind === 'human' && ['GET', 'HEAD'].includes(req.method) && SUCCESS.has(req.status) && isDocumentPath(req.path);
}

/** Return canonical manifest metadata only for an eligible novel document request. */
export function novelRequest(req, kind = classifyRequest(req)) {
  if (kind !== 'human' || req.method !== 'GET' || ![200, 304].includes(req.status)) return null;
  const pathname = String(req.path || '/').replace(/[?#].*$/, '');
  if (pathname === NOVEL_LANDING_PATH) return { type: 'landing', chapter: null };
  const chapter = NOVEL_CHAPTER_BY_PATH.get(pathname);
  return chapter ? { type: 'chapter', chapter } : null;
}

const inc = (map, key) => map.set(key, (map.get(key) || 0) + 1);
const rows = (map, name = 'path') => [...map.entries()].sort((a,b) => b[1] - a[1]).map(([k,v]) => ({ [name]: k, count: v }));
const COUNTRY_CODE = /^[A-Z]{2}$/;

function isPrivateIpv4(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  const [a, b] = parts;
  return a === 10 || a === 127 || a === 0 || a >= 224 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 198 && (b === 18 || b === 19));
}

function isPrivateIpv6(ip) {
  const value = ip.toLowerCase();
  if (value === '::' || value === '::1') return true;
  if (value.startsWith('fc') || value.startsWith('fd') || value.startsWith('fe80:')) return true;
  if (value.startsWith('::ffff:')) return isPrivateIp(value.slice(7));
  return false;
}

export function isPrivateIp(ip) {
  const version = net.isIP(ip);
  if (version === 4) return isPrivateIpv4(ip);
  if (version === 6) return isPrivateIpv6(ip);
  return true;
}

export function countryFromGeoiplookup(ip) {
  if (isPrivateIp(ip)) return 'ZZ';
  try {
    const output = execFileSync('geoiplookup', [ip], { encoding: 'utf8', timeout: 750, stdio: ['ignore', 'pipe', 'ignore'] });
    const match = output.match(/GeoIP\s+Country\s+Edition:\s+([A-Z]{2}),/i) || output.match(/GeoIP2?\s+Country.*?:\s+([A-Z]{2})\b/i) || output.match(/\bcountry\s+(?:code|iso_code):\s*([A-Z]{2})\b/i);
    const code = match?.[1]?.toUpperCase();
    return code && COUNTRY_CODE.test(code) && code !== 'A1' && code !== 'A2' ? code : 'ZZ';
  } catch {
    return 'ZZ';
  }
}

export function createCountryLookup(resolveCountry = countryFromGeoiplookup) {
  const cache = new Map();
  return ip => {
    const raw = String(ip || '');
    if (cache.has(raw)) return cache.get(raw);
    const code = isPrivateIp(raw) ? 'ZZ' : String(resolveCountry(raw) || 'ZZ').toUpperCase();
    const safeCode = COUNTRY_CODE.test(code) ? code : 'ZZ';
    cache.set(raw, safeCode);
    return safeCode;
  };
}

export function buildTrafficPayload(lines, { now = new Date(), countryResolver } = {}) {
  const countryFor = createCountryLookup(countryResolver);
  const todayKey = berlinDateKey(now);
  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const topPaths = new Map(), topPages = new Map(), countries = new Map(), referrers = new Map(), species = new Map();
  const hourly = Array.from({ length: 24 }, (_, i) => ({ hour: String(i).padStart(2, '0'), humans: 0, bots: 0, scanners: 0, total: 0 }));
  const live = [];
  const uniqueVisitorIps = new Set();
  const novelReaderIps = new Set();
  const novelToday = { novel_pageviews: 0, chapter_opens: 0 };
  const novel24h = { novel_pageviews: 0, chapter_opens: 0 };
  const chapterToday = new Map(), chapter24h = new Map();
  const scannerIntentCounts = new Map(SCANNER_INTENT_PRIORITY.map(id => [id, 0]));
  const recentScannerEvents = [];
  const rollingScannerTimestamps = [];
  let pageviewsToday = 0, totalPageviews = 0, humanRequestsToday = 0, botRequestsToday = 0, scannerRequestsToday = 0, requests24h = 0;

  for (const line of lines) {
    const req = parseLogLine(line);
    if (!req?.time) continue;
    const kind = classifyRequest(req);
    const pageview = isPageview(req, kind);
    const novel = novelRequest(req, kind);
    // Dashboard polling is deliberately excluded from every aggregate.  Keep
    // scanners and bots visible even when they target this path (see classifier).
    if (kind === 'observer_internal') continue;
    const isToday = berlinDateKey(req.time) === todayKey;
    const in24h = req.time >= since24h && req.time <= now;
    inc(topPaths, req.path);
    if (pageview) { totalPageviews++; inc(topPages, req.path); }
    if (isToday) {
      if (kind === 'human') humanRequestsToday++;
      else if (kind === 'bot') botRequestsToday++;
      else {
        scannerRequestsToday++;
        inc(scannerIntentCounts, classifyScannerIntent(req));
      }
      if (pageview) pageviewsToday++;
      if (novel) {
        novelToday.novel_pageviews++;
        if (novel.chapter) { novelToday.chapter_opens++; inc(chapterToday, novel.chapter.slug); }
      }
    }
    if (in24h) {
      requests24h++;
      const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: BERLIN_TZ, hour: '2-digit', hour12: false }).format(req.time));
      const bin = hourly[hour === 24 ? 0 : hour]; bin.total++; bin[kind === 'scanner' ? 'scanners' : `${kind}s`]++;
      uniqueVisitorIps.add(req.ip);
      if (novel) {
        novel24h.novel_pageviews++;
        novelReaderIps.add(req.ip);
        if (novel.chapter) { novel24h.chapter_opens++; inc(chapter24h, novel.chapter.slug); }
      }
      const country = countryFor(req.ip);
      inc(countries, country);
      live.push({ timestamp: req.time.toISOString(), time: berlinTime(req.time), kind: kind === 'scanner' ? 'SCANNER' : kind.toUpperCase(), country, path: req.path, status: req.status, method: req.method });
      if (kind === 'scanner') {
        const intentId = classifyScannerIntent(req);
        rollingScannerTimestamps.push(req.time);
        recentScannerEvents.push({
          timestamp: req.time.toISOString(),
          time: berlinTime(req.time),
          intent_id: intentId,
          intent_label: SCANNER_INTENT_LABELS[intentId],
        });
      }
    }
    if (kind === 'bot') inc(species, req.userAgent.split(/[\s\/]/)[0] || 'bot');
    if (req.referrer && req.referrer !== '-') inc(referrers, req.referrer.replace(/[?#].*$/, ''));
  }
  live.sort((a,b) => b.timestamp.localeCompare(a.timestamp));
  recentScannerEvents.sort((a,b) => b.timestamp.localeCompare(a.timestamp));
  rollingScannerTimestamps.sort((a,b) => a - b);
  const oldestScanner = rollingScannerTimestamps[0] || null;
  const newestScanner = rollingScannerTimestamps.at(-1) || null;
  const categories = SCANNER_INTENT_PRIORITY.map(id => {
    const count = scannerIntentCounts.get(id) || 0;
    return { id, label: SCANNER_INTENT_LABELS[id], count, share_percent: scannerRequestsToday ? count / scannerRequestsToday * 100 : 0 };
  });
  const topIntent = categories.reduce((top, category) => category.count > top.count ? category : top, categories[0]);
  const scannerIntent = {
    window: 'today_europe_berlin',
    total_scanner_requests: scannerRequestsToday,
    categories,
    classification_priority: [...SCANNER_INTENT_PRIORITY],
    top_intent: topIntent && topIntent.count > 0 ? { id: topIntent.id, label: topIntent.label, count: topIntent.count, share_percent: topIntent.share_percent } : null,
    unknown_count: scannerIntentCounts.get('unknown_scanner_noise') || 0,
    privacy_note: 'Scanner intent is aggregate-only plus a bounded recent event feed; it excludes raw IPs, IP-derived aliases, raw query strings, referrers, status, method, and verbatim user-agent strings.',
    methodology_note: 'Intent categories are assigned deterministically to requests already classified as scanner by the production classifier, using the documented priority order. Counts use the same Europe/Berlin today window as scanner_requests_today.',
    recent_events: recentScannerEvents.slice(0, 10).map((event, index) => ({ ...event, decorative_mask: SCANNER_INTENT_DECORATIVE_MASKS[index % SCANNER_INTENT_DECORATIVE_MASKS.length] })),
    observation_window_started_at: oldestScanner ? oldestScanner.toISOString() : null,
    last_probe_at: newestScanner ? newestScanner.toISOString() : null,
    trapping_duration_seconds: oldestScanner && newestScanner ? Math.floor((newestScanner - oldestScanner) / 1000) : 0,
  };
  const machine = botRequestsToday + scannerRequestsToday, denom = humanRequestsToday + machine;
  const chapterRows = NOVEL_CHAPTERS.map(chapter => ({ ...chapter, today_opens: chapterToday.get(chapter.slug) || 0, last_24_hours_opens: chapter24h.get(chapter.slug) || 0 }));
  const mostOpened = chapterRows.reduce((best, chapter) => chapter.last_24_hours_opens > (best?.last_24_hours_opens || 0) ? chapter : best, null);
  const calibratedNovelPageviewsToday = Math.round(novelToday.novel_pageviews * NOVEL_PAGEVIEWS_DISPLAY_FACTOR);
  const calibratedNovelPageviews24h = Math.round(novel24h.novel_pageviews * NOVEL_PAGEVIEWS_DISPLAY_FACTOR);
  const estimatedReaders24h = Math.max(0, Math.round(calibratedNovelPageviews24h * NOVEL_READER_RATIO));
  const novelReader = { schema_version: 1, generated_at: now.toISOString(), timezone: BERLIN_TZ, method: { source: 'first_party_nginx_access_log', novel_pageview_definition: 'successful_human_novel_document_request', chapter_open_definition: 'successful_human_chapter_document_request', estimated_reader_window: 'rolling_24_hours', completion_tracking: false, display_calibration: { novel_pageviews_display_factor: NOVEL_PAGEVIEWS_DISPLAY_FACTOR, novel_reader_ratio: NOVEL_READER_RATIO, note: 'Novel pageview displays are calibrated from raw first-party log counts; estimated readers are a provisional ratio of calibrated rolling 24H pageviews.' } }, today: { date: todayKey, raw_novel_pageviews: novelToday.novel_pageviews, novel_pageviews: calibratedNovelPageviewsToday, chapter_opens: novelToday.chapter_opens }, last_24_hours: { started_at: since24h.toISOString(), ended_at: now.toISOString(), raw_novel_pageviews: novel24h.novel_pageviews, novel_pageviews: calibratedNovelPageviews24h, calibrated_novel_pageviews: calibratedNovelPageviews24h, chapter_opens: novel24h.chapter_opens, estimated_readers: estimatedReaders24h, most_opened_chapter: mostOpened ? { number: mostOpened.number, slug: mostOpened.slug, title: mostOpened.title, path: mostOpened.path, chapter_opens: mostOpened.last_24_hours_opens } : null }, all_time: { since: now.toISOString(), novel_pageviews: 0, chapter_opens: 0 }, chapters: chapterRows };
  return { generated_at: now.toISOString(), timezone: BERLIN_TZ, pageviews_today: pageviewsToday, human_requests_today: humanRequestsToday, bot_requests_today: machine, scanner_requests_today: scannerRequestsToday, requests_24h: requests24h, requests_total: requests24h, total_pageviews: totalPageviews, estimated_unique_visitors: uniqueVisitorIps.size, human_percent: denom ? humanRequestsToday / denom * 100 : 0, bot_percent: denom ? machine / denom * 100 : 0, top_paths: rows(topPaths), top_pages: rows(topPages), countries: rows(countries, 'country'), crawler_species: rows(species, 'name'), top_referrers: rows(referrers, 'referrer'), hourly, live_requests: live.slice(0, 25), scanner_intent: scannerIntent, novel_reader: novelReader };
}

export function writeTrafficPayload(inputFiles, outputFile, options) {
  const lines = inputFiles.flatMap(file => fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean));
  const payload = buildTrafficPayload(lines, options);
  const stateFile = options?.stateFile || path.resolve(path.dirname(outputFile), '..', 'state', 'site-traffic-total.json');
  const state = updatePersistentPageviewTotal(inputFiles, stateFile, options?.now);
  payload.total_pageviews = state.total_pageviews;
  payload.novel_reader.all_time = { since: state.novel_reader.since, novel_pageviews: state.novel_reader.novel_pageviews, chapter_opens: state.novel_reader.chapter_opens };
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, `${JSON.stringify(payload, null, 2)}\n`);
  return payload;
}

function sourceCheckpoint(file) {
  const stat = fs.statSync(file);
  return { dev: stat.dev, ino: stat.ino, offset: stat.size };
}

function readState(stateFile) {
  try {
    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    if (!Number.isSafeInteger(state.total_pageviews) || state.total_pageviews < SITE_TRAFFIC_INITIAL_TOTAL || !state.sources || typeof state.sources !== 'object') throw new Error('invalid state');
    return state;
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    backupUnreadableState(stateFile, error);
    throw new Error(`Cannot read Site Traffic counter state ${stateFile}: ${error.message}; unreadable file was backed up and not reset automatically`);
  }
}

function backupUnreadableState(stateFile, error) {
  try {
    if (!fs.existsSync(stateFile)) return;
    const backup = `${stateFile}.corrupt-${Date.now()}`;
    fs.copyFileSync(stateFile, backup, fs.constants.COPYFILE_EXCL);
    console.error(`Cannot read Site Traffic counter state ${stateFile}: ${error.message}. Backed up to ${backup}; refusing to reset counters automatically.`);
  } catch (backupError) {
    console.error(`Cannot back up unreadable Site Traffic counter state ${stateFile}: ${backupError.message}`);
  }
}

export function atomicWriteJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
  const fd = fs.openSync(temp, 'w', 0o600);
  try {
    fs.writeFileSync(fd, `${JSON.stringify(value, null, 2)}\n`);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(temp, file);
  // Persist the rename as well where the platform supports directory fsync.
  try {
    const dir = fs.openSync(path.dirname(file), 'r');
    try { fs.fsyncSync(dir); } finally { fs.closeSync(dir); }
  } catch { /* Directory fsync is unavailable on some platforms. */ }
}

function qualifyingRequestsInNewBytes(file, offset) {
  const bytes = fs.readFileSync(file);
  const tail = bytes.subarray(offset);
  const newline = tail.lastIndexOf(0x0a);
  if (newline < 0) return { pageviews: 0, novel_pageviews: 0, chapter_opens: 0, offset };
  const complete = tail.subarray(0, newline + 1).toString('utf8').split(/\r?\n/).filter(Boolean);
  const totals = complete.reduce((total, line) => {
    const req = parseLogLine(line);
    if (!req) return total;
    if (isPageview(req)) total.pageviews++;
    const novel = novelRequest(req);
    if (novel) { total.novel_pageviews++; if (novel.chapter) total.chapter_opens++; }
    return total;
  }, { pageviews: 0, novel_pageviews: 0, chapter_opens: 0 });
  return { ...totals, offset: offset + newline + 1 };
}

/**
 * Update only bytes appended since the durable inode/offset checkpoint.  A new
 * inode is a normal nginx rename rotation and is read from byte zero.  A
 * copytruncate shrink is conservatively checkpointed without counting, which
 * prefers missing an in-flight line to ever recounting retained old content.
 */
function currentLogCheckpoints(inputFiles) {
  return Object.fromEntries(inputFiles.map(file => [path.resolve(file), sourceCheckpoint(file)]));
}

function initialNovelReaderState(inputFiles, now) {
  const checkpoints = currentLogCheckpoints(inputFiles);
  return {
    schema_version: NOVEL_READER_STATE_SCHEMA_VERSION,
    historical_baseline: NOVEL_CHAPTER_OPENS_HISTORICAL_BASELINE,
    counted_since_cutover: 0,
    chapter_opens: NOVEL_CHAPTER_OPENS_HISTORICAL_BASELINE,
    novel_pageviews: 0,
    since: now.toISOString(),
    cutover_timestamp: now.toISOString(),
    sources: checkpoints,
    log_checkpoints: checkpoints,
  };
}

function backupStateForMigration(stateFile) {
  if (!fs.existsSync(stateFile)) return null;
  const backup = `${stateFile}.backup-${Date.now()}`;
  fs.copyFileSync(stateFile, backup, fs.constants.COPYFILE_EXCL);
  return backup;
}

function ensureNovelReaderState(state, inputFiles, now, stateFile) {
  const reader = state.novel_reader;
  if (Number.isSafeInteger(reader?.schema_version) && reader.schema_version > NOVEL_READER_STATE_SCHEMA_VERSION) return false;
  if (reader?.schema_version === NOVEL_READER_STATE_SCHEMA_VERSION && reader.historical_baseline === NOVEL_CHAPTER_OPENS_HISTORICAL_BASELINE && Number.isSafeInteger(reader.chapter_opens) && reader.sources && typeof reader.sources === 'object') {
    if (!reader.log_checkpoints) reader.log_checkpoints = reader.sources;
    return false;
  }
  const previousNovelReader = reader && typeof reader === 'object' ? JSON.parse(JSON.stringify(reader)) : null;
  const backup_path = stateFile ? backupStateForMigration(stateFile) : null;
  state.novel_reader = {
    ...initialNovelReaderState(inputFiles, now),
    previous_incorrect_baseline: previousNovelReader?.historical_baseline === NOVEL_CHAPTER_OPENS_PREVIOUS_INCORRECT_BASELINE ? NOVEL_CHAPTER_OPENS_PREVIOUS_INCORRECT_BASELINE : previousNovelReader?.historical_baseline,
    previous_counted_since_cutover: previousNovelReader?.counted_since_cutover,
    previous_chapter_opens: previousNovelReader?.chapter_opens,
    rebaseline_reason: 'Corrected from verified historical screenshots',
    rebaseline_backup_path: backup_path,
    migrated_from_schema_version: previousNovelReader?.schema_version ?? null,
  };
  return true;
}

function updateNovelReaderTotal(inputFiles, state) {
  for (const file of inputFiles) {
    const key = path.resolve(file);
    const current = sourceCheckpoint(file);
    const previous = state.novel_reader.sources[key];
    if (!previous) {
      state.novel_reader.sources[key] = current;
      continue;
    }
    if (previous.dev === current.dev && previous.ino === current.ino && current.offset >= previous.offset) {
      const added = qualifyingRequestsInNewBytes(file, previous.offset);
      state.novel_reader.novel_pageviews += added.novel_pageviews;
      state.novel_reader.counted_since_cutover += added.chapter_opens;
      state.novel_reader.chapter_opens += added.chapter_opens;
      state.novel_reader.sources[key] = { ...current, offset: added.offset };
    } else if (previous.dev !== current.dev || previous.ino !== current.ino) {
      const added = qualifyingRequestsInNewBytes(file, 0);
      state.novel_reader.novel_pageviews += added.novel_pageviews;
      state.novel_reader.counted_since_cutover += added.chapter_opens;
      state.novel_reader.chapter_opens += added.chapter_opens;
      state.novel_reader.sources[key] = { ...current, offset: added.offset };
    } else {
      state.novel_reader.sources[key] = current;
    }
  }
}

export function updatePersistentPageviewTotal(inputFiles, stateFile, now = new Date()) {
  let state = readState(stateFile);
  if (!state) {
    state = {
      total_pageviews: SITE_TRAFFIC_INITIAL_TOTAL,
      initialized_at: now.toISOString(),
      novel_reader: initialNovelReaderState(inputFiles, now),
      sources: currentLogCheckpoints(inputFiles),
    };
    atomicWriteJson(stateFile, state);
    return state;
  }

  const migratedNovelReader = ensureNovelReaderState(state, inputFiles, now, stateFile);

  for (const file of inputFiles) {
    const key = path.resolve(file);
    const current = sourceCheckpoint(file);
    const previous = state.sources[key];
    if (!previous) {
      // A newly configured source starts at its current end, like migration.
      state.sources[key] = current;
      continue;
    }
    if (previous.dev === current.dev && previous.ino === current.ino && current.offset >= previous.offset) {
      const added = qualifyingRequestsInNewBytes(file, previous.offset);
      state.total_pageviews += added.pageviews;
      state.sources[key] = { ...current, offset: added.offset };
    } else if (previous.dev !== current.dev || previous.ino !== current.ino) {
      const added = qualifyingRequestsInNewBytes(file, 0);
      state.total_pageviews += added.pageviews;
      state.sources[key] = { ...current, offset: added.offset };
    } else {
      state.sources[key] = current;
    }
  }
  if (!migratedNovelReader) updateNovelReaderTotal(inputFiles, state);
  atomicWriteJson(stateFile, state);
  return state;
}
