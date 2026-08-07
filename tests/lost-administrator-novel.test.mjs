import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { buildNovel } from '../scripts/build-lost-administrator-novel.mjs';

const repositoryRoot = path.resolve(import.meta.dirname, '..');
const read = relative => fs.readFile(path.join(repositoryRoot, relative), 'utf8');

test('project metadata presents the ongoing novel and uses its cover image', async () => {
  const html = await read('lost-administrator/index.html');
  const head = html.slice(0, html.indexOf('</head>'));
  const title = 'The Lost Administrator — Ongoing Novel &amp; Interactive Story Experience';
  const description = 'The Lost Administrator is an ongoing novel and interactive story experience told through published chapters, digital traces and Michael Weber’s reconstructed Debian workstation.';
  const cover = 'https://dennishilk.com/assets/lost-administrator/thelostadministrator.webp';
  assert.match(head, new RegExp(`<title>${title}</title>`));
  assert.equal((head.match(new RegExp(`content="${description.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g')) || []).length, 3);
  assert.equal((head.match(new RegExp(`content="${cover}"`, 'g')) || []).length, 2);
  assert.equal((head.match(new RegExp(`content="${title}"`, 'g')) || []).length, 2);
  assert.doesNotMatch(head, /planned|browser-only/i);
});

async function fixture(manifest, sources = {}) {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'novel-build-'));
  const chapterDir = path.join(rootDir, 'content/lost-administrator/novel/chapters');
  await fs.mkdir(chapterDir, { recursive: true });
  await fs.writeFile(path.join(rootDir, 'content/lost-administrator/novel/novel-manifest.json'), JSON.stringify(manifest));
  for (const [name, text] of Object.entries(sources)) await fs.writeFile(path.join(chapterDir, name), text);
  return rootDir;
}

test('main landing page uses full-card links for the novel and workstation', async () => {
  const html = await read('lost-administrator/index.html');
  const storyCards = html.match(/<a class="[^"]*lost-admin-novel-link[^"]*" href="\/lost-administrator\/novel\/">[\s\S]*?<\/a>/g) || [];
  const environmentCards = html.match(/<a class="[^"]*lost-admin-environment-link[^"]*" href="\/lost-administrator\/workstation\/">[\s\S]*?<\/a>/g) || [];

  assert.equal(storyCards.length, 1);
  assert.equal(environmentCards.length, 1);
  assert.match(storyCards[0], /class="[^"]*detail-card[^"]*"[\s\S]*01 \/ STORY[\s\S]*<h2>The Novel<\/h2>/);
  assert.match(environmentCards[0], /class="[^"]*detail-card[^"]*"[\s\S]*02 \/ ENVIRONMENT[\s\S]*<h2>Interactive Workstation<\/h2>/);
  const cardContents = (storyCards[0] + environmentCards[0]).replace(/<a\b[^>]*>/g, '');
  assert.doesNotMatch(cardContents, /<(?:a|button)\b/);
  assert.doesNotMatch(html, /READ\s*(?:<[^>]+>)*→|LOGIN\s*(?:<[^>]+>)*→/);
  assert.doesNotMatch(html, /THE STORY IS COMPLETE/);
  assert.match(storyCards[0], /The Lost Administrator is a completed novel\. The interactive workstation opens an additional window into the same fictional world and Michael Weber’s life\.<\/p>/);
  assert.doesNotMatch(html, /THE NOVEL IS CURRENTLY IN DEVELOPMENT/);
  assert.doesNotMatch(html.slice(html.indexOf('<body>')), /thelostadministrator\.webp/);
});

test('landing page centers the download and support button groups', async () => {
  const html = await read('lost-administrator/index.html');
  const css = await read('style.css');
  assert.match(css, /\.lost-admin-actions\s*\{[^}]*justify-content:\s*center;/);
  assert.equal(html.match(/class="lost-admin-command lost-admin-command-no-accent"/g)?.length, 2);
  assert.match(css, /\.lost-admin-command-no-accent\s*\{[^}]*border-left:\s*0;/);
});

test('canonical chapter Markdown remains unchanged', async () => {
  const expectedHashes = new Map([
    ['content/lost-administrator/novel/chapters/chapter-01-day-zero.md', '242468c4819e6f92e3301761ff8896b2cf0c0303c417ff6262b27d98e988ac52'],
    ['content/lost-administrator/novel/chapters/chapter-02-ill-be-right-back.md', 'ae1ec8331677d27bd7f6c27edbfce760187202626c05eed2fcd5401ab6682951'],
    ['content/lost-administrator/novel/chapters/chapter-03-the-truth.md', 'f2b302a234734a6fa8f69d901811595e57d795b7468ba419914cb02ed4a72905'],
    ['content/lost-administrator/novel/chapters/chapter-04-the-things-we-leave-behind.md', 'afd9600bd225137008835f6bace045eb0ac4235b28775bea0efa92e59cb43d2c'],
    ['content/lost-administrator/novel/chapters/chapter-05-the-passenger.md', '864d501844da7c3ef5fc38f66866a190da6fba93389eb48c999cc44ace213406'],
    ['content/lost-administrator/novel/chapters/chapter-06-no-such-vehicle.md', '3b4ee030271727658a9f21ca661972618ee913122cf7b57b1e2bb9247b5b4beb'],
    ['content/lost-administrator/novel/chapters/chapter-07-out-of-range.md', '522b87a7daff90da43e36d6eaa388fd6ef5a4986030acdcaea092415eb617dcb'],
    ['content/lost-administrator/novel/chapters/chapter-08-restricted-access.md', '561c7eca8432210edc5b75d73e4d2b0c35c4ccc6470364cd0f6315cb93e39a17'],
    ['content/lost-administrator/novel/chapters/chapter-09-accepted.md', '34f6fb2d2114f18a2c6b92236461a3e50229b493293c54b3a378e21e41980e32'],
    ['content/lost-administrator/novel/chapters/chapter-10-the-time-between.md', 'a0406e3b5c564997268395de2f32646ca5752aa25ea32fcc883574a13b3e1f07'],
    ['content/lost-administrator/novel/chapters/chapter-11-the-other-network.md', '674c0f39ea6c6d648751d855e12965092b5dfda39f9aae6ddf3b5b30f8e980a9'],
    ['content/lost-administrator/novel/chapters/chapter-12-no-check-in.md', '70b2d8bfc6568c3cb788b4f19ff6f40013a6622f57007d226d629b0a20fa487e'],
    ['content/lost-administrator/novel/chapters/chapter-13-authorized-contacts.md', '8b2717d6b9858899de931463cbec980bf22107f574a00a1dfde8b0b49dd71b7d'],
    ['content/lost-administrator/novel/chapters/chapter-14-alpha.md', '3a359be5cb69e7a2ce86eb750d1c4facbe3596b36b7b1b7e6a66a26e8cb363a6'],
    ['content/lost-administrator/novel/chapters/chapter-15-ground-truth.md', 'd4171340360208647fa97b6f7b53da13474b20e97a7dc672b9a4acb0ae5b5554'],
    ['content/lost-administrator/novel/chapters/chapter-16-the-last-step.md', '21f0e578ae2e8a2ef8f784089c73bb2f3cabc17b63afb5ac87f8520b12f784d7'],
    ['content/lost-administrator/novel/chapters/chapter-17-without-a-word.md', 'ba733f23a9080a7ba0ed9c0f613276e93d4774797cf17c0349e0b8e20eab33e7'],
    ['content/lost-administrator/novel/chapters/chapter-18-before-anyone-else.md', 'fecd45f0689d44198e0c3f92d2c50dd3ba10dd03d7100db22df3b7c430d8bf9d'],
    ['content/lost-administrator/novel/chapters/chapter-19-the-package.md', '28da35eb603c3652e826896bd521da246acce72a3a23d8bb49ba4137c745c857'],
    ['content/lost-administrator/novel/chapters/chapter-20-where-the-road-ends.md', '24c9041b0dfaeca1910c0670c5d05f39b3cc6e3365fff48e982981a05b39e785'],
    ['content/lost-administrator/novel/chapters/chapter-21-no-wake.md', 'e018a2007b7f665516fb440e4aa7bf71ec78874425fe128059c02f305a7ebcd3'],
    ['content/lost-administrator/novel/chapters/chapter-22-the-one-who-waited.md', '99dbdbb8dd4afe8517ceaa96f3d4681eee18f506ec6a7bdc1f478dc53e7200c6'],
    ['content/lost-administrator/novel/chapters/chapter-23-who-will-feed-grissom.md', '27b9a487a4d013886ec85bc6ac421fbb7d15abd7e5ff95a82727afa5558991f6'],
    ['content/lost-administrator/novel/chapters/chapter-24-the-other-end.md', '4b6d705a7b4848c01eb362c4b834e7d961de640f8bef32926f0f94f6e4f40af4']
  ]);

  for (const [chapter, expectedHash] of expectedHashes) {
    const source = await fs.readFile(path.join(repositoryRoot, chapter));
    assert.equal(createHash('sha256').update(source).digest('hex'), expectedHash, chapter);
  }
});

test('novel contents underlines its heading and separates only consecutive chapters', async () => {
  const css = await read('lost-administrator/novel/novel.css');
  assert.doesNotMatch(css, /\.novel-contents\s*\{[^}]*border-top/);
  assert.match(css, /\.novel-contents h2\s*\{[^}]*border-bottom:\s*1px solid var\(--novel-border\)[^}]*display:\s*inline-block/);
  assert.doesNotMatch(css, /\.novel-toc\s*\{[^}]*border-top/);
  assert.match(css, /\.novel-toc li \+ li\s*\{[^}]*border-top:\s*1px solid var\(--novel-border\)/);
  assert.doesNotMatch(css, /\.novel-toc a\s*\{[^}]*border-bottom/);
  assert.doesNotMatch(css, /\.novel-toc li(?:\s|,|\{)[^}]*border-bottom/);
});

test('generated novel pages use the versioned novel stylesheet', async () => {
  const pages = [
    'lost-administrator/novel/index.html',
    'lost-administrator/novel/chapters/day-zero/index.html',
    'lost-administrator/novel/chapters/ill-be-right-back/index.html',
    'lost-administrator/novel/chapters/the-truth/index.html',
    'lost-administrator/novel/chapters/the-things-we-leave-behind/index.html',
    'lost-administrator/novel/chapters/the-passenger/index.html',
    'lost-administrator/novel/chapters/no-such-vehicle/index.html',
    'lost-administrator/novel/chapters/out-of-range/index.html',
    'lost-administrator/novel/chapters/restricted-access/index.html',
    'lost-administrator/novel/chapters/accepted/index.html',
    'lost-administrator/novel/chapters/the-time-between/index.html',
    'lost-administrator/novel/chapters/the-other-network/index.html',
    'lost-administrator/novel/chapters/no-check-in/index.html',
    'lost-administrator/novel/chapters/authorized-contacts/index.html',
    'lost-administrator/novel/chapters/alpha/index.html',
    'lost-administrator/novel/chapters/ground-truth/index.html',
    'lost-administrator/novel/chapters/the-last-step/index.html',
    'lost-administrator/novel/chapters/without-a-word/index.html',
    'lost-administrator/novel/chapters/before-anyone-else/index.html',
    'lost-administrator/novel/chapters/the-package/index.html',
    'lost-administrator/novel/chapters/where-the-road-ends/index.html',
    'lost-administrator/novel/chapters/no-wake/index.html',
    'lost-administrator/novel/chapters/the-one-who-waited/index.html',
    'lost-administrator/novel/chapters/who-will-feed-grissom/index.html',
    'lost-administrator/novel/chapters/the-other-end/index.html',
    'lost-administrator/novel/end/index.html'
  ];
  for (const page of pages) {
    const html = await read(page);
    assert.match(html, /href="\/style\.css\?v=60"/);
    assert.match(html, /href="\/lost-administrator\/novel\/novel\.css\?v=4"/);
  }
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

test('publishes exactly twenty-four approved chapters in order with adjacent navigation and a separate final page', async () => {
  const expected = [
    { number: 1, slug: 'day-zero', title: 'Day Zero', source: 'chapter-01-day-zero.md' },
    { number: 2, slug: 'ill-be-right-back', title: 'I’ll Be Right Back', source: 'chapter-02-ill-be-right-back.md' },
    { number: 3, slug: 'the-truth', title: 'The Truth', source: 'chapter-03-the-truth.md' },
    { number: 4, slug: 'the-things-we-leave-behind', title: 'The Things We Leave Behind', source: 'chapter-04-the-things-we-leave-behind.md' },
    { number: 5, slug: 'the-passenger', title: 'The Passenger', source: 'chapter-05-the-passenger.md' },
    { number: 6, slug: 'no-such-vehicle', title: 'No Such Vehicle', source: 'chapter-06-no-such-vehicle.md' },
    { number: 7, slug: 'out-of-range', title: 'Out of Range', source: 'chapter-07-out-of-range.md' },
    { number: 8, slug: 'restricted-access', title: 'Restricted Access', source: 'chapter-08-restricted-access.md' },
    { number: 9, slug: 'accepted', title: 'Accepted', source: 'chapter-09-accepted.md' },
    { number: 10, slug: 'the-time-between', title: 'The Time Between', source: 'chapter-10-the-time-between.md' },
    { number: 11, slug: 'the-other-network', title: 'The Other Network', source: 'chapter-11-the-other-network.md' },
    { number: 12, slug: 'no-check-in', title: 'No Check-In', source: 'chapter-12-no-check-in.md' },
    { number: 13, slug: 'authorized-contacts', title: 'Authorized Contacts', source: 'chapter-13-authorized-contacts.md' },
    { number: 14, slug: 'alpha', title: 'Alpha', source: 'chapter-14-alpha.md' },
    { number: 15, slug: 'ground-truth', title: 'Ground Truth', source: 'chapter-15-ground-truth.md' },
    { number: 16, slug: 'the-last-step', title: 'The Last Step', source: 'chapter-16-the-last-step.md' },
    { number: 17, slug: 'without-a-word', title: 'Without a Word', source: 'chapter-17-without-a-word.md' },
    { number: 18, slug: 'before-anyone-else', title: 'Before Anyone Else', source: 'chapter-18-before-anyone-else.md' },
    { number: 19, slug: 'the-package', title: 'The Package', source: 'chapter-19-the-package.md' },
    { number: 20, slug: 'where-the-road-ends', title: 'Where the Road Ends', source: 'chapter-20-where-the-road-ends.md' },
    { number: 21, slug: 'no-wake', title: 'No Wake', source: 'chapter-21-no-wake.md' },
    { number: 22, slug: 'the-one-who-waited', title: 'The One Who Waited', source: 'chapter-22-the-one-who-waited.md' },
    { number: 23, slug: 'who-will-feed-grissom', title: 'Who Will Feed Grissom?', source: 'chapter-23-who-will-feed-grissom.md' },
    { number: 24, slug: 'the-other-end', title: 'The Other End', source: 'chapter-24-the-other-end.md' }
  ];
  const manifest = JSON.parse(await read('content/lost-administrator/novel/novel-manifest.json'));
  assert.deepEqual(manifest.chapters, expected);

  const landing = await read('lost-administrator/novel/index.html');
  const pages = await Promise.all(expected.map(chapter => read(`lost-administrator/novel/chapters/${chapter.slug}/index.html`)));
  const chapterLinks = [...landing.matchAll(/href="\/lost-administrator\/novel\/chapters\/([^/]+)\//g)].map(match => match[1]);
  assert.deepEqual(chapterLinks, expected.map(chapter => chapter.slug));
  assert.equal(new Set(chapterLinks).size, 24);
  assert.deepEqual(expected.map(chapter => chapter.number), Array.from({ length: 24 }, (_, index) => index + 1));

  for (let index = 0; index < expected.length; index += 1) {
    const page = pages[index];
    assert.match(page, new RegExp(`<p class="novel-chapter-number">CHAPTER ${expected[index].number}</p><h1>${expected[index].title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</h1>`));
    assert.equal((page.match(/<h1>/g) || []).length, 1);
    if (index === 0) assert.doesNotMatch(page, /class="novel-previous"/);
    else assert.match(page, new RegExp(`class="novel-previous"[^>]*href="/lost-administrator/novel/chapters/${expected[index - 1].slug}/`));
    if (index === expected.length - 1) assert.match(page, /class="novel-next"[^>]*href="\/lost-administrator\/novel\/end\/"[^>]*>Next page →<\/a>/);
    else assert.match(page, new RegExp(`class="novel-next"[^>]*href="/lost-administrator/novel/chapters/${expected[index + 1].slug}/`));
  }

  const publication = landing + pages.join('');
  assert.doesNotMatch(publication, /chapter(?:-|\s*)0?25|coming soon/i);
  await assert.rejects(fs.access(path.join(repositoryRoot, 'lost-administrator/novel/chapters/chapter-25/index.html')));
});

test('approved sources retain their required endings and terminal identity', async () => {
  const chapterOne = (await read('content/lost-administrator/novel/chapters/chapter-01-day-zero.md')).trimEnd();
  const chapterTwo = (await read('content/lost-administrator/novel/chapters/chapter-02-ill-be-right-back.md')).trimEnd();
  const chapterThree = (await read('content/lost-administrator/novel/chapters/chapter-03-the-truth.md')).trimEnd();
  assert.ok(chapterOne.endsWith('Behind him, the office continued working.'));
  assert.ok(chapterTwo.endsWith('Michael Weber was missing.'));
  assert.match(chapterTwo, /m\.weber@workstation:~\$/);
  assert.doesNotMatch(chapterTwo, /michael@workstation:~\$/);
  assert.match(chapterThree, /```text\n[\s\S]*```/);
});

test('Chapter 03 source stays separate and its fenced text renders safely', async () => {
  const source = await read('content/lost-administrator/novel/chapters/chapter-03-the-truth.md');
  const generated = await read('lost-administrator/novel/chapters/the-truth/index.html');
  assert.match(source, /```text/);
  assert.doesNotMatch(generated, /```/);
  assert.match(generated, /<pre><code class="language-text">[\s\S]*?<\/code><\/pre>/);
  const fencedBlocks = [...source.matchAll(/```text\n([\s\S]*?)\n```/g)].map(match => match[1]);
  assert.equal(fencedBlocks.length, 2);
  for (const block of fencedBlocks) assert.ok(generated.includes(`<pre><code class="language-text">${block}</code></pre>`));
  assert.notEqual(source, generated);
});

test('all internal links in the novel publication resolve', async () => {
  const publicFiles = [
    'lost-administrator/novel/index.html',
    'lost-administrator/novel/chapters/day-zero/index.html',
    'lost-administrator/novel/chapters/ill-be-right-back/index.html',
    'lost-administrator/novel/chapters/the-truth/index.html',
    'lost-administrator/novel/chapters/the-things-we-leave-behind/index.html',
    'lost-administrator/novel/chapters/the-passenger/index.html',
    'lost-administrator/novel/chapters/no-such-vehicle/index.html',
    'lost-administrator/novel/chapters/out-of-range/index.html',
    'lost-administrator/novel/chapters/restricted-access/index.html',
    'lost-administrator/novel/chapters/accepted/index.html',
    'lost-administrator/novel/chapters/the-time-between/index.html',
    'lost-administrator/novel/chapters/the-other-network/index.html',
    'lost-administrator/novel/chapters/no-check-in/index.html',
    'lost-administrator/novel/chapters/authorized-contacts/index.html',
    'lost-administrator/novel/chapters/alpha/index.html',
    'lost-administrator/novel/chapters/ground-truth/index.html',
    'lost-administrator/novel/chapters/the-last-step/index.html',
    'lost-administrator/novel/chapters/without-a-word/index.html',
    'lost-administrator/novel/chapters/before-anyone-else/index.html',
    'lost-administrator/novel/chapters/the-package/index.html',
    'lost-administrator/novel/chapters/where-the-road-ends/index.html',
    'lost-administrator/novel/chapters/no-wake/index.html',
    'lost-administrator/novel/chapters/the-one-who-waited/index.html',
    'lost-administrator/novel/chapters/who-will-feed-grissom/index.html',
    'lost-administrator/novel/chapters/the-other-end/index.html',
    'lost-administrator/novel/end/index.html'
  ];
  for (const publicFile of publicFiles) {
    const html = await read(publicFile);
    for (const [, href] of html.matchAll(/href="(\/lost-administrator\/novel\/[^"?#]*)"/g)) {
      const destination = href.endsWith('/') ? `${href}index.html` : href;
      await fs.access(path.join(repositoryRoot, destination.slice(1)));
    }
  }
});

test('generated publication contains no Markdown fences, drafts, or Canon material', async () => {
  const publicFiles = [
    'lost-administrator/novel/index.html',
    'lost-administrator/novel/chapters/day-zero/index.html',
    'lost-administrator/novel/chapters/ill-be-right-back/index.html',
    'lost-administrator/novel/chapters/the-truth/index.html',
    'lost-administrator/novel/chapters/the-things-we-leave-behind/index.html',
    'lost-administrator/novel/chapters/the-passenger/index.html',
    'lost-administrator/novel/chapters/no-such-vehicle/index.html',
    'lost-administrator/novel/chapters/out-of-range/index.html',
    'lost-administrator/novel/chapters/restricted-access/index.html',
    'lost-administrator/novel/chapters/accepted/index.html',
    'lost-administrator/novel/chapters/the-time-between/index.html',
    'lost-administrator/novel/chapters/the-other-network/index.html',
    'lost-administrator/novel/chapters/no-check-in/index.html',
    'lost-administrator/novel/chapters/authorized-contacts/index.html',
    'lost-administrator/novel/chapters/alpha/index.html',
    'lost-administrator/novel/chapters/ground-truth/index.html',
    'lost-administrator/novel/chapters/the-last-step/index.html',
    'lost-administrator/novel/chapters/without-a-word/index.html',
    'lost-administrator/novel/chapters/before-anyone-else/index.html',
    'lost-administrator/novel/chapters/the-package/index.html',
    'lost-administrator/novel/chapters/where-the-road-ends/index.html',
    'lost-administrator/novel/chapters/no-wake/index.html',
    'lost-administrator/novel/chapters/the-one-who-waited/index.html',
    'lost-administrator/novel/chapters/who-will-feed-grissom/index.html',
    'lost-administrator/novel/chapters/the-other-end/index.html',
    'lost-administrator/novel/end/index.html'
  ];
  const publication = (await Promise.all(publicFiles.map(read))).join('\n');
  assert.doesNotMatch(publication, /```|\*Friday, July 31, 2026\*|\*\*(?:06:30 AM|01:30 PM)\*\*/);
  assert.match(publication, /<pre><code class="language-text">/);
  assert.doesNotMatch(publication, /Canon Bible|private Canon|unpublished draft|chapter(?:-|\s*)0?25|German draft/i);
});

test('completed landing lists 24 chapters but not the separate visual ending', async () => {
  const html = await read('lost-administrator/novel/index.html');
  const chapterLinks = [...html.matchAll(/href="\/lost-administrator\/novel\/chapters\/([^/]+)\//g)];
  assert.equal(chapterLinks.length, 24);
  assert.match(html, /<p class="novel-subtitle">A complete novel<\/p>/);
  assert.match(html, /All 24 chapters of The Lost Administrator are available to read online\./);
  assert.doesNotMatch(html, /currently in development|as they are released|\/novel\/end\//i);
});

test('Chapter 24 ends with supplied prose and links to the non-chapter final page', async () => {
  const html = await read('lost-administrator/novel/chapters/the-other-end/index.html');
  const article = html.match(/<article class="novel-prose">([\s\S]*?)<\/article>/);
  assert.ok(article);
  assert.ok(article[1].trim().endsWith('</p>'));
  assert.doesNotMatch(article[1], /end\.webp|THE END|Chapter 25/i);
  assert.match(html, /href="\/lost-administrator\/novel\/chapters\/who-will-feed-grissom\/">← Previous chapter<\/a>/);
  assert.match(html, /href="\/lost-administrator\/novel\/end\/">Next page →<\/a>/);
  assert.doesNotMatch(html, /Next chapter →/);
});

test('manifest models the image ending outside exactly 24 chapters', async () => {
  const manifest = JSON.parse(await read('content/lost-administrator/novel/novel-manifest.json'));
  assert.equal(manifest.chapters.length, 24);
  assert.deepEqual(manifest.endPage, {
    slug: 'end',
    image: '/assets/lost-administrator/end.webp',
    alt: 'Four-scene collage from The Lost Administrator: Michael and Emma beside the aquarium, the white GMC Yukon beside a boat ramp, an old fenced communications site, and Michael’s RoboDad mug beside Byte the hamster.'
  });
  assert.equal(manifest.chapters.some(chapter => chapter.number === 25 || chapter.slug === 'end'), false);
});

test('visual ending is responsive, accessible, canonical, and has no visible narrative or navigation', async () => {
  await fs.access(path.join(repositoryRoot, 'assets/lost-administrator/end.webp'));
  const html = await read('lost-administrator/novel/end/index.html');
  const css = await read('lost-administrator/novel/novel.css');
  const main = html.match(/<main class="novel-final">([\s\S]*?)<\/main>/);
  assert.ok(main);
  assert.match(main[1], /^<img class="novel-final-image" src="\/assets\/lost-administrator\/end\.webp" alt="Four-scene collage[^>]+">$/);
  assert.doesNotMatch(main[1], /<h[1-6]|<p|<nav|<a|Chapter 25|THE END/i);
  assert.doesNotMatch(html, /class="novel-(?:next|previous|chapter-nav)"/);
  assert.match(html, /<title>The Lost Administrator — Final Page<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/dennishilk\.com\/lost-administrator\/novel\/end\/">/);
  assert.match(css, /\.novel-final-image\s*\{[^}]*width:\s*100%[^}]*max-width:\s*100%[^}]*height:\s*auto[^}]*margin:\s*0 auto/);
});
