// Pure, explainable functions shared by browser tools and Node tests.
export const LIMITS = Object.freeze({ characters: 2_000_000, lines: 20_000, lineLength: 4096, examples: 12 });
export const SITE_ORIGIN = 'https://www.dennishilk.com';

export function matchesPattern(line, pattern) {
  const value = String(line).toLowerCase();
  return pattern.all.every(token => value.includes(token.toLowerCase()))
    && (!pattern.any?.length || pattern.any.some(token => value.includes(token.toLowerCase())))
    && (!pattern.none?.length || !pattern.none.some(token => value.includes(token.toLowerCase())));
}

export function inspectLog(input, patterns) {
  if (typeof input !== 'string') throw new TypeError('invalid-input');
  if (input.length > LIMITS.characters) throw new RangeError('too-large');
  const lines = input.split(/\r\n|\n|\r/);
  if (lines.length > LIMITS.lines) throw new RangeError('too-many-lines');
  const findings = new Map();
  const compiled = patterns.map(pattern => ({ ...pattern, all: pattern.all.map(token => token.toLowerCase()),
    any: pattern.any?.map(token => token.toLowerCase()), none: pattern.none?.map(token => token.toLowerCase()) }));
  let shortened = 0;
  lines.forEach((original, index) => {
    const line = original.slice(0, LIMITS.lineLength);
    if (line.length !== original.length) shortened++;
    if (!line.trim()) return;
    const value = line.toLowerCase();
    for (const pattern of compiled) {
      if (!pattern.all.every(token => value.includes(token))
        || (pattern.any?.length && !pattern.any.some(token => value.includes(token)))
        || (pattern.none?.length && pattern.none.some(token => value.includes(token)))) continue;
      let finding = findings.get(pattern.id);
      if (!finding) {
        finding = { patternId: pattern.id, problemId: pattern.problemId, severity: pattern.severity, count: 0, lines: [] };
        findings.set(pattern.id, finding);
      }
      finding.count++;
      if (finding.lines.length < LIMITS.examples) finding.lines.push({ number: index + 1, text: line });
    }
  });
  const priorities = { error: 0, warning: 1, info: 2 };
  return { lineCount: lines.length, shortened, findings: [...findings.values()].sort((a, b) => priorities[a.severity] - priorities[b.severity]) };
}

// Best-effort redaction, not a guarantee that an excerpt is anonymous.
export function redactSensitive(text) {
  return String(text)
    .replace(/\b(?:bearer\s+)[a-z0-9._~+\/-]+=*/gi, 'Bearer [TOKEN]')
    .replace(/\b(password|passwd|token|secret|authorization|api[_-]?key)\s*[:=]\s*[^\s,;]+/gi, '$1=[REDACTED]')
    .replace(/https?:\/\/[^\s<>]+/gi, '[URL]')
    .replace(/[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[EMAIL]')
    .replace(/(?:\/home\/[^/\s:]+|\/Users\/[^/\s:]+)/g, '/home/[USER]')
    .replace(/\b(?:[0-9a-f]{2}:){5}[0-9a-f]{2}\b/gi, '[MAC]')
    .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '[IP]')
    .replace(/(?<![a-z0-9])(?:[0-9a-f]{0,4}:){2,}[0-9a-f:]{0,4}(?![a-z0-9])/gi, '[IPV6]')
    .replace(/(^|\n)([A-Z][a-z]{2}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}\s+)[^\s]+/g, '$1$2[HOST]');
}

export function diagnosticSummary(result, catalog, language = 'en', { includeLines = false, redact = true } = {}) {
  const de = language === 'de';
  const text = [de ? 'Linux Fix Lab — lokale Log-Hinweise' : 'Linux Fix Lab — local log findings',
    de ? 'Signaturen sind Hinweise, kein Beweis einer gemeinsamen Ursache.' : 'Signatures are clues, not proof of a shared root cause.'];
  for (const finding of result.findings) {
    const pattern = catalog.patterns.find(item => item.id === finding.patternId);
    const problem = catalog.problems.find(item => item.id === finding.problemId);
    if (!pattern || !problem) continue;
    text.push('', problem.title[language], catalog.categories[problem.category][language], pattern.explanation[language], pattern.significance[language],
      `${SITE_ORIGIN}${problem.path[language]}#diagnostics`, `${de ? 'Treffer' : 'Matches'}: ${finding.count}`,
      `${de ? 'Beispiel-Zeilennummern' : 'Example line numbers'}: ${finding.lines.map(line => line.number).join(', ')}`);
    if (includeLines) for (const line of finding.lines) text.push(`${line.number}: ${redact ? redactSensitive(line.text) : line.text}`);
  }
  if (!result.findings.length) text.push(de ? 'Keine bekannte Signatur gefunden. Das schließt Fehler nicht aus.' : 'No known signature found. This does not exclude a fault.');
  return text.join('\n');
}

export function normalizeSearch(text) {
  return String(text).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replaceAll('ß', 'ss');
}
export function searchMatches(text, query) {
  const haystack = normalizeSearch(text);
  return normalizeSearch(query).trim().split(/\s+/).filter(Boolean).every(token => haystack.includes(token));
}

export function canonicalSolutionUrl(path, anchor = '') {
  if (!/^\/(?:de\/)?linux-fix-lab\/(?:[a-z0-9-]+\/)?$/.test(path)) throw new TypeError('invalid-path');
  if (anchor && !/^[a-z][a-z0-9-]*$/.test(anchor)) throw new TypeError('invalid-anchor');
  return `${SITE_ORIGIN}${path}${anchor ? `#${anchor}` : ''}`;
}

export function validateInstance(value) {
  const input = String(value).trim();
  if (!input || input.length > 253 || /[\s\\]/.test(input)) throw new TypeError('invalid-instance');
  const url = new URL(input.includes('://') ? input : `https://${input}`);
  const host = url.hostname;
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.search || url.hash || !['', '/'].includes(url.pathname)
    || !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(host)
    || /\.(local|localhost|test|invalid|internal|example)$/.test(host)) throw new TypeError('invalid-instance');
  return url.origin;
}

export function shareIntent(service, { url, message = '', instance = '' }) {
  const canonical = new URL(url);
  if (canonical.origin !== SITE_ORIGIN || canonical.search
    || !/^\/(?:de\/)?linux-(?:fix-lab|hardware-explorer)\/(?:[a-z0-9-]+\/)?$/.test(canonical.pathname)
    || (canonical.hash && !/^#[a-z][a-z0-9-]*$/.test(canonical.hash))) throw new TypeError('invalid-share-url');
  let target;
  if (service === 'mastodon') {
    target = new URL('/share', validateInstance(instance));
    target.searchParams.set('text', `${message}\n${canonical.href}`);
  } else if (service === 'x') {
    target = new URL('https://twitter.com/intent/tweet');
    target.searchParams.set('text', message);
    target.searchParams.set('url', canonical.href);
  } else if (service === 'facebook') {
    target = new URL('https://www.facebook.com/sharer/sharer.php');
    target.searchParams.set('u', canonical.href);
  } else throw new TypeError('invalid-service');
  return target.href;
}

export function moveAssistant(tree, current, choiceIndex) {
  const node = tree.nodes[current];
  const choice = node?.choices?.[choiceIndex];
  if (!choice || !tree.nodes[choice.next]) throw new TypeError('invalid-choice');
  return choice.next;
}
