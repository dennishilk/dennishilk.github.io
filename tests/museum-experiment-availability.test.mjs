import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const museum = await readFile(new URL('../museum/index.html', import.meta.url), 'utf8');

function cardFor(title) {
  const titleIndex = museum.indexOf(`<h3>${title}</h3>`);
  assert.notEqual(titleIndex, -1, `${title} card should exist`);
  const cardStart = museum.lastIndexOf('<article', titleIndex);
  const cardEnd = museum.indexOf('</article>', titleIndex);
  return museum.slice(cardStart, cardEnd);
}

test('newly opened interactive experiments use the available card treatment', () => {
  for (const title of ['The Lost Administrator', 'UNIX Time Sharing Center']) {
    const card = cardFor(title);
    assert.match(card, /class="museum-status available">AVAILABLE</);
    assert.doesNotMatch(card, /PLANNED|museum-status planned/);
  }
});

test('interactive experiment routes and types remain unchanged', () => {
  assert.match(cardFor('The Lost Administrator'), /Interactive Story Experience[\s\S]*href="\/lost-administrator\/"/);
  assert.match(cardFor('UNIX Time Sharing Center'), /Shared Multi-User UNIX Host[\s\S]*href="\/museum\/unix-time-sharing-center\/"/);
});
