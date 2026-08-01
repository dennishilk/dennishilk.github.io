import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { buildNovel } from '../scripts/build-lost-administrator-novel.mjs';

const repositoryRoot = path.resolve(import.meta.dirname, '..');
const read = relative => fs.readFile(path.join(repositoryRoot, relative), 'utf8');

async function fixture(manifest, sources = {}) {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'novel-build-'));
  const chapterDir = path.join(rootDir, 'content/lost-administrator/novel/chapters');
  await fs.mkdir(chapterDir, { recursive: true });
  await fs.writeFile(path.join(rootDir, 'content/lost-administrator/novel/novel-manifest.json'), JSON.stringify(manifest));
  for (const [name, text] of Object.entries(sources)) await fs.writeFile(path.join(chapterDir, name), text);
  return rootDir;
}

test('main landing page links to the novel without displaying its cover', async () => {
  const html = await read('lost-administrator/index.html');
  assert.match(html, /href="\/lost-administrator\/novel\/"[^>]*>READ THE NOVEL/);
  assert.doesNotMatch(html, /thelostadministrator\.webp/);
});

test('novel landing uses the existing cover and required alt text', async () => {
  await fs.access(path.join(repositoryRoot, 'assets/lost-administrator/thelostadministrator.webp'));
  const html = await read('lost-administrator/novel/index.html');
  assert.match(html, /src="\/assets\/lost-administrator\/thelostadministrator\.webp"/);
  assert.match(html, /alt="Cover of The Lost Administrator by Dennis Hilk"/);
});

test('empty manifest creates an honest landing page without chapter links', async () => {
  const rootDir = await fixture({ chapters: [] });
  await buildNovel({ rootDir });
  const html = await fs.readFile(path.join(rootDir, 'lost-administrator/novel/index.html'), 'utf8');
  assert.match(html, /NO CHAPTERS PUBLISHED YET/);
  assert.doesNotMatch(html, /novel\/chapters\//);
});

test('rejects duplicate chapter numbers', async () => {
  const rootDir = await fixture({ chapters: [
    { number: 1, slug: 'one', title: 'One', source: 'one.md' },
    { number: 1, slug: 'two', title: 'Two', source: 'two.md' }
  ] });
  await assert.rejects(buildNovel({ rootDir }), /Duplicate chapter number/);
});

test('rejects duplicate chapter slugs', async () => {
  const rootDir = await fixture({ chapters: [
    { number: 1, slug: 'same', title: 'One', source: 'one.md' },
    { number: 2, slug: 'same', title: 'Two', source: 'two.md' }
  ] });
  await assert.rejects(buildNovel({ rootDir }), /Duplicate chapter slug/);
});

test('rejects missing and unsafe sources', async t => {
  await t.test('missing', async () => {
    const rootDir = await fixture({ chapters: [{ number: 1, slug: 'one', title: 'One', source: 'missing.md' }] });
    await assert.rejects(buildNovel({ rootDir }), /Missing source file/);
  });
  await t.test('path traversal', async () => {
    const rootDir = await fixture({ chapters: [{ number: 1, slug: 'one', title: 'One', source: '../outside.md' }] });
    await assert.rejects(buildNovel({ rootDir }), /unsafe source path/i);
  });
});

test('uses manifest order deterministically and generates previous/next navigation', async () => {
  const manifest = { chapters: [
    { number: 20, slug: 'alpha', title: 'Alpha', source: 'alpha.md' },
    { number: 10, slug: 'beta', title: 'Beta', source: 'beta.md' }
  ] };
  const rootDir = await fixture(manifest, { 'alpha.md': 'Generic fixture text.', 'beta.md': 'More generic fixture text.' });
  await buildNovel({ rootDir });
  const firstBuild = await fs.readFile(path.join(rootDir, 'lost-administrator/novel/index.html'), 'utf8');
  assert.ok(firstBuild.indexOf('/alpha/') < firstBuild.indexOf('/beta/'));
  const alpha = await fs.readFile(path.join(rootDir, 'lost-administrator/novel/chapters/alpha/index.html'), 'utf8');
  const beta = await fs.readFile(path.join(rootDir, 'lost-administrator/novel/chapters/beta/index.html'), 'utf8');
  assert.match(alpha, /class="novel-next"[^>]*href="\/lost-administrator\/novel\/chapters\/beta\//);
  assert.doesNotMatch(alpha, /class="novel-previous"/);
  assert.match(beta, /class="novel-previous"[^>]*href="\/lost-administrator\/novel\/chapters\/alpha\//);
  assert.doesNotMatch(beta, /class="novel-next"/);
  await buildNovel({ rootDir });
  assert.equal(await fs.readFile(path.join(rootDir, 'lost-administrator/novel/index.html'), 'utf8'), firstBuild);
});

test('does not auto-discover unlisted Markdown and preserves the cover on rebuild', async () => {
  const rootDir = await fixture({ chapters: [] }, { 'unlisted-draft.md': 'Generic unlisted fixture text.' });
  await buildNovel({ rootDir });
  const html = await fs.readFile(path.join(rootDir, 'lost-administrator/novel/index.html'), 'utf8');
  assert.doesNotMatch(html, /unlisted-draft/);
  assert.match(html, /thelostadministrator\.webp/);
  await assert.rejects(fs.access(path.join(rootDir, 'lost-administrator/novel/chapters/unlisted-draft/index.html')));
});
