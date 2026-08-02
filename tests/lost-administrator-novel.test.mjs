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
  assert.match(html, /href="\/lost-administrator\/novel\/"[^>]*>READ <span aria-hidden="true">→<\/span>/);
  assert.match(html, /href="\/lost-administrator\/workstation\/"[^>]*>LOGIN <span aria-hidden="true">→<\/span>/);
  assert.doesNotMatch(html, /thelostadministrator\.webp/);
});

test('novel pages use a static shell without the animated starfield', async () => {
  const css = await read('lost-administrator/novel/novel.css');
  const html = await read('lost-administrator/novel/index.html');
  assert.match(css, /\.novel-page\s*\{[^}]*background:\s*#000/);
  assert.doesNotMatch(html, /stars\.js|id="stars"/);

  const rootDir = await fixture({ chapters: [{ number: 1, slug: 'one', title: 'One', source: 'one.md' }] }, { 'one.md': 'Quiet prose.' });
  await buildNovel({ rootDir });
  const chapter = await fs.readFile(path.join(rootDir, 'lost-administrator/novel/chapters/one/index.html'), 'utf8');
  assert.match(chapter, /<body class="novel-page novel-reader-page">/);
  assert.doesNotMatch(chapter, /stars\.js|id="stars"/);
});

test('novel landing uses the existing cover and required alt text', async () => {
  await fs.access(path.join(repositoryRoot, 'assets/lost-administrator/thelostadministrator.webp'));
  const html = await read('lost-administrator/novel/index.html');
  assert.match(html, /src="\/assets\/lost-administrator\/thelostadministrator\.webp"/);
  assert.match(html, /alt="Cover of The Lost Administrator by Dennis Hilk"/);
});

test('novel landing centers the responsive cover above its supporting copy', async () => {
  const html = await read('lost-administrator/novel/index.html');
  const css = await read('lost-administrator/novel/novel.css');
  assert.doesNotMatch(html, /class="novel-kicker"|<h1>The Lost Administrator<\/h1>/);
  assert.match(html, /novel-cover-frame[\s\S]*novel-subtitle[\s\S]*novel-intro[\s\S]*novel-contents/);
  assert.match(css, /\.novel-hero\s*\{[^}]*flex-direction:\s*column[^}]*align-items:\s*center[^}]*text-align:\s*center/);
  assert.match(css, /\.novel-cover-frame\s*\{[^}]*width:\s*min\(420px, 100%\)/);
  assert.match(css, /\.novel-cover\s*\{[^}]*width:\s*100%[^}]*height:\s*auto/);

  const rootDir = await fixture({ chapters: [] });
  await buildNovel({ rootDir });
  const rebuilt = await fs.readFile(path.join(rootDir, 'lost-administrator/novel/index.html'), 'utf8');
  assert.doesNotMatch(rebuilt, /class="novel-kicker"|<h1>The Lost Administrator<\/h1>/);
  assert.match(rebuilt, /novel-cover-frame[\s\S]*novel-subtitle[\s\S]*novel-intro[\s\S]*novel-contents/);
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

test('renders the supported Markdown subset while keeping manuscript HTML safe', async () => {
  const rootDir = await fixture(
    { chapters: [{ number: 1, slug: 'markup', title: '*Safe* `Markup`', source: 'markup.md' }] },
    { 'markup.md': 'A *quiet* **strong** `command` and <script>alert("no")</script>.\n\n- *list*\n\n> **quoted** `text`\n\n```text\nm.weber@workstation:~$ status\n  preserved output\n```' }
  );
  await buildNovel({ rootDir });
  const html = await fs.readFile(path.join(rootDir, 'lost-administrator/novel/chapters/markup/index.html'), 'utf8');
  assert.match(html, /A <em>quiet<\/em> <strong>strong<\/strong> <code>command<\/code>/);
  assert.match(html, /&lt;script&gt;alert\(&quot;no&quot;\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /<li><em>list<\/em><\/li>/);
  assert.match(html, /<blockquote><p><strong>quoted<\/strong> <code>text<\/code><\/p><\/blockquote>/);
  assert.match(html, /<pre><code class="language-text">m\.weber@workstation:~\$ status\n  preserved output<\/code><\/pre>/);
  assert.doesNotMatch(html, /```/);
});

test('publishes the two approved chapters in order with adjacent navigation only', async () => {
  const landing = await read('lost-administrator/novel/index.html');
  const chapterOne = await read('lost-administrator/novel/chapters/day-zero/index.html');
  const chapterTwo = await read('lost-administrator/novel/chapters/ill-be-right-back/index.html');
  assert.ok(landing.indexOf('/chapters/day-zero/') < landing.indexOf('/chapters/ill-be-right-back/'));
  assert.match(chapterOne, /class="novel-next"[^>]*href="\/lost-administrator\/novel\/chapters\/ill-be-right-back\//);
  assert.doesNotMatch(chapterOne, /class="novel-previous"/);
  assert.match(chapterTwo, /class="novel-previous"[^>]*href="\/lost-administrator\/novel\/chapters\/day-zero\//);
  assert.doesNotMatch(chapterTwo, /class="novel-next"/);
  assert.doesNotMatch(landing + chapterOne + chapterTwo, /chapter(?:-|\s*)3|chapter-03/i);
  await assert.rejects(fs.access(path.join(repositoryRoot, 'lost-administrator/novel/chapters/chapter-3/index.html')));
});

test('approved sources retain their required endings and terminal identity', async () => {
  const chapterOne = (await read('content/lost-administrator/novel/chapters/chapter-01-day-zero.md')).trimEnd();
  const chapterTwo = (await read('content/lost-administrator/novel/chapters/chapter-02-ill-be-right-back.md')).trimEnd();
  assert.ok(chapterOne.endsWith('Behind him, the office continued working.'));
  assert.ok(chapterTwo.endsWith('Michael Weber was missing.'));
  assert.match(chapterTwo, /m\.weber@workstation:~\$/);
  assert.doesNotMatch(chapterTwo, /michael@workstation:~\$/);
});

test('generated publication contains no Markdown fences, drafts, or Canon material', async () => {
  const publicFiles = [
    'lost-administrator/novel/index.html',
    'lost-administrator/novel/chapters/day-zero/index.html',
    'lost-administrator/novel/chapters/ill-be-right-back/index.html'
  ];
  const publication = (await Promise.all(publicFiles.map(read))).join('\n');
  assert.doesNotMatch(publication, /```|\*Friday, July 31, 2026\*|\*\*(?:06:30 AM|01:30 PM)\*\*/);
  assert.match(publication, /<pre><code class="language-text">/);
  assert.doesNotMatch(publication, /Canon Bible|private Canon|unpublished draft/i);
});
