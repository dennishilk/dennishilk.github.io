import fs from 'node:fs';
import path from 'node:path';

const BERLIN_TZ = 'Europe/Berlin';
const STATIC_EXT = /\.(?:css|js|mjs|map|png|jpe?g|gif|webp|svg|ico|avif|bmp|tiff?|woff2?|ttf|otf|eot|txt|xml|json|webmanifest|wasm|mp4|webm|mp3|ogg|pdf|zip|gz|br)(?:$|[?#])/i;
const STATIC_NAMES = /^(?:\/)?(?:favicon\.ico|favicon\.png|robots\.txt|sitemap\.xml|site\.webmanifest|manifest\.json)$/i;
const SCANNER_PATH = /(?:wp-admin|wp-login|xmlrpc\.php|\.env|phpmyadmin|cgi-bin|\.git|vendor\/phpunit|boaform|setup\.cgi|admin\/|login\.action)/i;
const BOT_UA = /bot|crawler|spider|slurp|bingpreview|facebookexternalhit|preview|monitor|uptime|curl|wget|python-requests|go-http-client|httpclient|headless/i;
const SCANNER_UA = /zgrab|masscan|nmap|nikto|sqlmap|acunetix|nessus|openvas|dirbuster|gobuster|wpscan|botnet|scanner/i;
const SUCCESS = new Set([200, 201, 202, 203, 204, 206, 301, 302, 303, 304, 307, 308]);

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

const inc = (map, key) => map.set(key, (map.get(key) || 0) + 1);
const rows = (map, name = 'path') => [...map.entries()].sort((a,b) => b[1] - a[1]).map(([k,v]) => ({ [name]: k, count: v }));
const countryFor = () => 'ZZ';

export function buildTrafficPayload(lines, { now = new Date() } = {}) {
  const todayKey = berlinDateKey(now);
  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const topPaths = new Map(), topPages = new Map(), countries = new Map(), referrers = new Map(), species = new Map();
  const hourly = Array.from({ length: 24 }, (_, i) => ({ hour: String(i).padStart(2, '0'), humans: 0, bots: 0, scanners: 0, total: 0 }));
  const live = [];
  let pageviewsToday = 0, totalPageviews = 0, humanRequestsToday = 0, botRequestsToday = 0, scannerRequestsToday = 0, requests24h = 0;

  for (const line of lines) {
    const req = parseLogLine(line);
    if (!req?.time) continue;
    const kind = classifyRequest(req);
    const pageview = isPageview(req, kind);
    const isToday = berlinDateKey(req.time) === todayKey;
    const in24h = req.time >= since24h && req.time <= now;
    inc(topPaths, req.path);
    if (pageview) { totalPageviews++; inc(topPages, req.path); }
    if (isToday) {
      if (kind === 'human') humanRequestsToday++;
      else if (kind === 'bot') botRequestsToday++;
      else scannerRequestsToday++;
      if (pageview) pageviewsToday++;
    }
    if (in24h) {
      requests24h++;
      const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: BERLIN_TZ, hour: '2-digit', hour12: false }).format(req.time));
      const bin = hourly[hour === 24 ? 0 : hour]; bin.total++; bin[kind === 'scanner' ? 'scanners' : `${kind}s`]++;
      inc(countries, countryFor(req.ip));
      live.push({ timestamp: req.time.toISOString(), time: berlinTime(req.time), kind: kind === 'scanner' ? 'SCANNER' : kind.toUpperCase(), country: countryFor(req.ip), path: req.path, status: req.status, method: req.method });
    }
    if (kind === 'bot') inc(species, req.userAgent.split(/[\s\/]/)[0] || 'bot');
    if (req.referrer && req.referrer !== '-') inc(referrers, req.referrer.replace(/[?#].*$/, ''));
  }
  live.sort((a,b) => b.timestamp.localeCompare(a.timestamp));
  const machine = botRequestsToday + scannerRequestsToday, denom = humanRequestsToday + machine;
  return { generated_at: now.toISOString(), timezone: BERLIN_TZ, pageviews_today: pageviewsToday, human_requests_today: humanRequestsToday, bot_requests_today: machine, scanner_requests_today: scannerRequestsToday, requests_24h: requests24h, requests_total: requests24h, total_pageviews: totalPageviews, estimated_unique_visitors: countries.size, human_percent: denom ? humanRequestsToday / denom * 100 : 0, bot_percent: denom ? machine / denom * 100 : 0, top_paths: rows(topPaths), top_pages: rows(topPages), countries: rows(countries, 'country'), crawler_species: rows(species, 'name'), top_referrers: rows(referrers, 'referrer'), hourly, live_requests: live.slice(0, 25) };
}

export function writeTrafficPayload(inputFiles, outputFile, options) {
  const lines = inputFiles.flatMap(file => fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean));
  const payload = buildTrafficPayload(lines, options);
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, `${JSON.stringify(payload, null, 2)}\n`);
  return payload;
}
