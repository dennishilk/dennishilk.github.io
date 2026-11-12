import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const homepage = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('homepage presents the author identity and exact featured project order', () => {
  assert.match(homepage, /Open-Source Developer • Linux Enthusiast • Author of The Lost Administrator • Creator of BoringWM & World Observer/);
  assert.match(homepage, /<h2>Featured Projects<\/h2>/);
  const start = homepage.indexOf('<section class="projects">');
  const projects = homepage.slice(start, homepage.indexOf('</section>', start));
  assert.deepEqual([...projects.matchAll(/<h3>([^<]+)<\/h3>/g)].map(match => match[1]), [
    'The Lost Administrator', 'Linux Fix Lab', 'Linux Migration Companion', 'BoringOS', 'Free Image Converter'
  ]);
  assert.doesNotMatch(projects, /NVIDIA Installer/);
  const storyCard = projects.slice(projects.indexOf('<a href="/lost-administrator/"'), projects.indexOf('</a>', projects.indexOf('<a href="/lost-administrator/"')));
  assert.match(storyCard, /class="card home-lost-administrator-card"/);
  assert.match(storyCard, /A completed techno-thriller, free in English and German, with a missing Debian administrator and an interactive workstation\./);
  assert.doesNotMatch(storyCard, /ENTER THE STORY →/);
  assert.equal((storyCard.match(/<a\b/g) || []).length, 1);
  assert.doesNotMatch(storyCard, /<button\b/);
});
