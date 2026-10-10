// Exercise publication flags in an isolated copy. Never changes the working checkout or pushes.
import assert from 'node:assert/strict';
import { cpSync, constants, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..'), scratch = mkdtempSync(join(tmpdir(), 'hardware-release-check-')), copy = join(scratch, 'site');
const digest = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const stable = ['index.html', 'de/index.html', 'sitemap.xml', 'sitemap-de.xml', 'sitemap-blog.xml', 'sitemap-internet-observers.xml', 'sitemap-technology-observers.xml', 'sitemap-images.xml', 'sitemap-cisco-doom.xml', 'world-observer/dashboard/summary.json'];
const originals = new Map(stable.map(path => [path, digest(join(root, path))]));
const configPath = 'content/linux-hardware-explorer/publication.json';
const originalConfig = readFileSync(join(root, configPath), 'utf8');
const run = (args, { fail = false } = {}) => {
  const result = spawnSync(process.execPath, args, { cwd: copy, encoding: 'utf8', maxBuffer: 8_000_000 });
  if (fail) assert.notEqual(result.status, 0, 'unsafe gate unexpectedly accepted');
  else assert.equal(result.status, 0, `${args.join(' ')}\n${result.stdout}\n${result.stderr}`);
  return result.stdout + result.stderr;
};
const setConfig = value => writeFileSync(join(copy, configPath), JSON.stringify({ schemaVersion: 1, ...value }, null, 2) + '\n');
const locs = xml => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
const build = () => { run(['scripts/build-linux-hardware-explorer.mjs']); run(['scripts/build-linux-fix-lab.mjs']); run(['scripts/sync-seo.mjs', '--sitemaps-only']); };
let report;
try {
  cpSync(root, copy, { recursive: true, mode: constants.COPYFILE_FICLONE, filter: path => !['.git', 'node_modules'].includes(relative(root, path).split('/')[0]) });
  const labPaths = locs(readFileSync(join(copy, 'sitemap-linux-fix-lab.xml'), 'utf8')).sort();
  setConfig({ phase: 'review', allowIndexing: false, activateSitemap: false, activateIntegration: false });
  build();
  assert.match(readFileSync(join(copy, 'linux-hardware-explorer/index.html'), 'utf8'), /content="noindex,follow"/);
  assert.equal(readFileSync(join(copy, 'sitemap-index.xml'), 'utf8').includes('sitemap-linux-hardware-explorer.xml'), false);
  assert.equal(readFileSync(join(copy, 'linux-fix-lab/index.html'), 'utf8').includes('/linux-hardware-explorer/'), false);
  setConfig({ phase: 'review', allowIndexing: true, activateSitemap: true, activateIntegration: true });
  assert.match(run(['scripts/build-linux-hardware-explorer.mjs'], { fail: true }), /activation requires|requires approved/i);
  setConfig({ phase: 'public-launch', allowIndexing: true, activateSitemap: true, activateIntegration: true });
  build();
  const manifest = JSON.parse(readFileSync(join(copy, 'content/linux-hardware-explorer/generated-manifest.json'), 'utf8'));
  const sitemap = readFileSync(join(copy, 'sitemap-linux-hardware-explorer.xml'), 'utf8');
  assert.equal(locs(sitemap).length, Object.keys(manifest.pages).length);
  assert.deepEqual(locs(sitemap).sort(), Object.keys(manifest.pages).map(path => 'https://www.dennishilk.com' + path).sort());
  assert.deepEqual(locs(readFileSync(join(copy, 'sitemap-linux-fix-lab.xml'), 'utf8')).sort(), labPaths);
  assert.ok(readFileSync(join(copy, 'sitemap-index.xml'), 'utf8').includes('sitemap-linux-hardware-explorer.xml'));
  assert.equal(readFileSync(join(copy, 'robots.txt'), 'utf8').split('Sitemap: https://www.dennishilk.com/sitemap-linux-hardware-explorer.xml').length, 2);
  const integration = JSON.parse(readFileSync(join(copy, 'content/linux-hardware-explorer/integration.json'), 'utf8'));
  const problems = JSON.parse(readFileSync(join(copy, 'content/linux-fix-lab/generated-manifest.json'), 'utf8'));
  let integratedPages = 0;
  for (const path of Object.keys(problems.pages)) {
    const html = readFileSync(join(copy, path.slice(1), 'index.html'), 'utf8');
    assert.ok(html.includes('/linux-hardware-explorer/'));
    if (html.includes('id="hardware-context"')) integratedPages++;
  }
  assert.equal(integratedPages, Object.keys(integration.profilesByProblem).length * 2);
  for (const [path, hash] of originals) assert.equal(digest(join(copy, path)), hash, `unrelated file changed: ${path}`);
  const audit = run(['scripts/audit-seo.mjs']); assert.match(audit, /validation errors: 0/);
  const suites = run(['--test', 'tests/sitemaps.test.mjs', 'tests/seo-sitemap-generator.test.mjs', 'tests/homepage-featured-projects.test.mjs', 'tests/linux-fix-lab-build.test.mjs', 'tests/linux-fix-lab-content.test.mjs', 'tests/linux-fix-lab-pages.test.mjs', 'tests/linux-fix-lab-runtime.test.mjs', 'tests/linux-fix-lab-release.test.mjs', 'tests/linux-hardware-explorer-pages.test.mjs']);
  const generated = ['linux-hardware-explorer/index.html', 'de/linux-hardware-explorer/index.html', 'content/linux-hardware-explorer/generated-manifest.json', 'sitemap-linux-hardware-explorer.xml', 'sitemap-index.xml', 'robots.txt'];
  const hashes = new Map(generated.map(path => [path, digest(join(copy, path))])); build();
  for (const [path, hash] of hashes) assert.equal(digest(join(copy, path)), hash, `non-deterministic build: ${path}`);
  setConfig({ phase: 'review', allowIndexing: false, activateSitemap: false, activateIntegration: false }); build();
  assert.equal(existsSync(join(copy, 'sitemap-linux-hardware-explorer.xml')), false);
  assert.equal(readFileSync(join(copy, 'sitemap-index.xml'), 'utf8').includes('sitemap-linux-hardware-explorer.xml'), false);
  assert.equal(readFileSync(join(copy, 'robots.txt'), 'utf8').includes('sitemap-linux-hardware-explorer.xml'), false);
  assert.equal(readFileSync(join(copy, 'linux-fix-lab/index.html'), 'utf8').includes('/linux-hardware-explorer/'), false);
  assert.match(readFileSync(join(copy, 'linux-hardware-explorer/index.html'), 'utf8'), /content="noindex,follow"/);
  run(['scripts/audit-seo.mjs']);
  report = { schemaVersion: 1, checked: new Date().toISOString().slice(0, 10), isolated: true,
    reviewGate: 'passed', invalidGate: 'rejected', approvedBuild: 'passed', hardwareSitemapUrls: locs(sitemap).length,
    fixLabUrlsRetained: labPaths.length, integratedLocalizedProblemPages: integratedPages, relatedProblems: Object.keys(integration.profilesByProblem).length,
    seoValidationErrors: 0, deterministic: true, deactivation: 'passed', unrelatedFilesUnchanged: stable, testSummary: suites.split('\n').filter(line => /(?:ℹ|#) (?:tests|pass|fail)\b/.test(line)).join('\n') };
  console.log(JSON.stringify(report, null, 2));
} finally {
  rmSync(scratch, { recursive: true, force: true });
  assert.equal(readFileSync(join(root, configPath), 'utf8'), originalConfig, 'working checkout gate was changed');
  for (const [path, hash] of originals) assert.equal(digest(join(root, path)), hash, `working checkout changed: ${path}`);
}
const outputIndex = process.argv.indexOf('--output');
if (outputIndex >= 0 && report) writeFileSync(resolve(process.argv[outputIndex + 1]), JSON.stringify(report, null, 2) + '\n');
