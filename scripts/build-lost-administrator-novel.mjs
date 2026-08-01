import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const COVER = '/assets/lost-administrator/thelostadministrator.webp';

const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#39;');

// Deliberately small, safe subset for prose: raw HTML is always escaped.
function renderMarkdown(source) {
  const blocks = source.replaceAll('\r\n', '\n').trim().split(/\n\s*\n/);
  return blocks.filter(Boolean).map(block => {
    const text = block.trim();
    if (/^(?:\*\s*\*\s*\*|-{3,}|_{3,})$/.test(text)) return '<hr>';
    const heading = text.match(/^(#{2,6})\s+(.+)$/s);
    if (heading && !heading[2].includes('\n')) return `<h${heading[1].length}>${escapeHtml(heading[2])}</h${heading[1].length}>`;
    const lines = text.split('\n');
    if (lines.every(line => /^[-*]\s+/.test(line))) return `<ul>${lines.map(line => `<li>${escapeHtml(line.replace(/^[-*]\s+/, ''))}</li>`).join('')}</ul>`;
    if (lines.every(line => /^\d+\.\s+/.test(line))) return `<ol>${lines.map(line => `<li>${escapeHtml(line.replace(/^\d+\.\s+/, ''))}</li>`).join('')}</ol>`;
    if (lines.every(line => /^>\s?/.test(line))) return `<blockquote><p>${lines.map(line => escapeHtml(line.replace(/^>\s?/, ''))).join('<br>')}</p></blockquote>`;
    return `<p>${lines.map(escapeHtml).join('<br>')}</p>`;
  }).join('\n');
}

function page({ title, description, canonical, body, reader = false }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${canonical}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:type" content="website">
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png">
  <link rel="stylesheet" href="/style.css?v=59">
  <link rel="stylesheet" href="/lost-administrator/novel/novel.css">
</head>
<body class="novel-page${reader ? ' novel-reader-page' : ''}">
<div class="content museum-page lost-admin-page">
${body}
  <footer>
    <div class="nebby-terminal-line"><picture><source srcset="/assets/generated/images/nebby.webp" type="image/webp"><img src="/nebby.png" class="nebby" alt="Nebby mascot"></picture><span class="coffee-text">m.weber@workstation:~$<span class="cursor"></span></span></div>
    <p class="footer-links">© 2026 Dennis Hilk — <a href="/museum/">Computer Museum</a> · <a href="/impressum.html">Impressum</a> · <a href="/datenschutzerklaerung.html">Datenschutz</a></p>
  </footer>
</div>
</body>
</html>
`;
}

function validateManifest(data) {
  if (!data || !Array.isArray(data.chapters)) throw new Error('Manifest must contain a chapters array.');
  const numbers = new Set();
  const slugs = new Set();
  return data.chapters.map((entry, index) => {
    const label = `Manifest chapter at index ${index}`;
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error(`${label} must be an object.`);
    if (!Number.isInteger(entry.number) || entry.number < 1) throw new Error(`${label} has an invalid number.`);
    if (numbers.has(entry.number)) throw new Error(`Duplicate chapter number: ${entry.number}.`);
    numbers.add(entry.number);
    if (typeof entry.slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.slug)) throw new Error(`${label} has an invalid slug.`);
    if (slugs.has(entry.slug)) throw new Error(`Duplicate chapter slug: ${entry.slug}.`);
    slugs.add(entry.slug);
    if (typeof entry.title !== 'string' || !entry.title.trim()) throw new Error(`${label} has an invalid title.`);
    if (typeof entry.source !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]*\.md$/.test(entry.source)) throw new Error(`${label} has an unsafe source path.`);
    return { number: entry.number, slug: entry.slug, title: entry.title.trim(), source: entry.source };
  });
}

function landing(chapters) {
  const contents = chapters.length
    ? `<ol class="novel-toc">${chapters.map(chapter => `<li><a href="/lost-administrator/novel/chapters/${escapeHtml(chapter.slug)}/"><span>CHAPTER ${chapter.number}</span><strong>${escapeHtml(chapter.title)}</strong></a></li>`).join('')}</ol>`
    : `<div class="novel-empty"><strong>NO CHAPTERS PUBLISHED YET</strong><p>The first chapter is currently in development.</p></div>`;
  return page({
    title: 'The Lost Administrator — The Novel',
    description: 'Read completed chapters of The Lost Administrator as they are released.',
    canonical: 'https://dennishilk.com/lost-administrator/novel/',
    body: `  <main class="novel-shell">
    <a class="novel-back" href="/lost-administrator/">← BACK TO THE LOST ADMINISTRATOR</a>
    <section class="novel-hero">
      <div class="novel-cover-frame"><img class="novel-cover" src="${COVER}" alt="Cover of The Lost Administrator by Dennis Hilk"></div>
      <div class="novel-copy"><p class="novel-kicker">THE NOVEL</p><h1>The Lost Administrator</h1><p class="novel-subtitle">A novel currently in development</p><p class="novel-intro">Completed chapters will appear here as they are released. Drafts, working notes and unfinished manuscript material are not published.</p></div>
    </section>
    <section class="novel-contents" aria-labelledby="contents-title"><h2 id="contents-title">CONTENTS</h2>${contents}</section>
  </main>`
  });
}

function chapterPage(chapter, previous, next, rendered) {
  const description = `Read Chapter ${chapter.number}, ${chapter.title}, from The Lost Administrator.`;
  const navigation = [
    previous ? `<a class="novel-previous" href="/lost-administrator/novel/chapters/${escapeHtml(previous.slug)}/">← Previous chapter</a>` : '',
    next ? `<a class="novel-next" href="/lost-administrator/novel/chapters/${escapeHtml(next.slug)}/">Next chapter →</a>` : ''
  ].join('');
  return page({ title: `${chapter.title} — The Lost Administrator`, description, canonical: `https://dennishilk.com/lost-administrator/novel/chapters/${chapter.slug}/`, reader: true,
    body: `  <main class="novel-reader"><a class="novel-back" href="/lost-administrator/novel/">← CONTENTS</a><header class="novel-reader-header"><p class="novel-chapter-number">CHAPTER ${chapter.number}</p><h1>${escapeHtml(chapter.title)}</h1></header><article class="novel-prose">${rendered}</article>${navigation ? `<nav class="novel-chapter-nav" aria-label="Chapter navigation">${navigation}</nav>` : ''}</main>` });
}

export async function buildNovel({ rootDir = DEFAULT_ROOT } = {}) {
  const contentDir = path.join(rootDir, 'content/lost-administrator/novel');
  const chaptersDir = path.join(contentDir, 'chapters');
  const outputDir = path.join(rootDir, 'lost-administrator/novel');
  let manifest;
  try { manifest = JSON.parse(await fs.readFile(path.join(contentDir, 'novel-manifest.json'), 'utf8')); }
  catch (error) { throw new Error(`Unable to read novel manifest: ${error.message}`); }
  const chapters = validateManifest(manifest);
  const sources = [];
  for (const chapter of chapters) {
    const sourcePath = path.join(chaptersDir, chapter.source);
    let source;
    try { source = await fs.readFile(sourcePath, 'utf8'); }
    catch { throw new Error(`Missing source file for chapter ${chapter.number}: ${chapter.source}.`); }
    const realSource = await fs.realpath(sourcePath);
    const realChapters = await fs.realpath(chaptersDir);
    if (!realSource.startsWith(`${realChapters}${path.sep}`)) throw new Error(`Unsafe source path for chapter ${chapter.number}.`);
    sources.push(source);
  }
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(path.join(outputDir, 'index.html'), landing(chapters));
  const chapterOutput = path.join(outputDir, 'chapters');
  await fs.rm(chapterOutput, { recursive: true, force: true });
  for (let index = 0; index < chapters.length; index += 1) {
    const destination = path.join(chapterOutput, chapters[index].slug);
    await fs.mkdir(destination, { recursive: true });
    await fs.writeFile(path.join(destination, 'index.html'), chapterPage(chapters[index], chapters[index - 1], chapters[index + 1], renderMarkdown(sources[index])));
  }
  return { chapters: chapters.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  buildNovel().then(({ chapters }) => console.log(`Built novel landing page and ${chapters} chapter page(s).`)).catch(error => { console.error(`Novel build failed: ${error.message}`); process.exitCode = 1; });
}
