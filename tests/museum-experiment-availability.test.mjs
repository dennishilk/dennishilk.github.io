import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const museum = await readFile(new URL('../museum/index.html', import.meta.url), 'utf8');

function experimentCardFor(title) {
  const experiments = museum.slice(museum.indexOf('class="museum-experiments"'), museum.indexOf('class="museum-collection"'));
  const titleIndex = experiments.indexOf(`<h3>${title}</h3>`);
  assert.notEqual(titleIndex, -1, `${title} card should exist`);
  const cardStart = experiments.lastIndexOf('<article', titleIndex);
  const cardEnd = experiments.indexOf('</article>', titleIndex);
  return experiments.slice(cardStart, cardEnd);
}

test('interactive experiments use the available card treatment', () => {
  for (const title of ['Linux Terminal Academy', 'UNIX Time Sharing Center']) {
    const card = experimentCardFor(title);
    assert.match(card, /class="museum-status available">AVAILABLE</);
    assert.doesNotMatch(card, /PLANNED|museum-status planned/);
  }
});

test('featured story and interactive experiment order are exact', () => {
  const featured = museum.slice(museum.indexOf('class="museum-featured"'), museum.indexOf('class="museum-behind"'));
  assert.match(featured, /<h2 id="featured-experience-title">The Lost Administrator<\/h2>/);
  assert.match(featured, /Ongoing Novel &amp; Interactive Story Experience/);
  assert.deepEqual([...featured.matchAll(/museum-featured-details[^>]*>[\s\S]*?<\/div>/g)][0][0].match(/<span>([^<]+)<\/span>/g), ['<span>ONGOING NOVEL</span>', '<span>INTERACTIVE WORKSTATION</span>']);
  assert.match(featured, /href="\/lost-administrator\/">ENTER THE STORY/);
  assert.doesNotMatch(featured, /Linux Terminal Academy|2 PUBLISHED CHAPTERS/);

  const experiments = museum.slice(museum.indexOf('class="museum-experiments"'), museum.indexOf('class="museum-collection"'));
  assert.deepEqual([...experiments.matchAll(/<h3>([^<]+)<\/h3>/g)].map(match => match[1]), ['Try a Debian Server', 'BBS System', 'Linux Terminal Academy', 'UNIX Time Sharing Center']);
  assert.doesNotMatch(experiments, /The Lost Administrator/);
  assert.match(experimentCardFor('Linux Terminal Academy'), /Interactive Linux Learning Environment[\s\S]*href="\/museum\/linux-terminal-academy\/">ENTER ACADEMY/);
  assert.equal((museum.match(/Linux Terminal Academy/g) || []).length, 1);
  assert.equal((museum.match(/The Lost Administrator/g) || []).length, 1);
  assert.match(experimentCardFor('UNIX Time Sharing Center'), /Shared Multi-User UNIX Host[\s\S]*href="\/museum\/unix-time-sharing-center\/"/);
});
