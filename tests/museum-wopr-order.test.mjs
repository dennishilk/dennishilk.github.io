import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../museum/index.html', import.meta.url), 'utf8');
const interactiveSection = html.match(/<section class="museum-collection" aria-labelledby="interactive-computing-title">([\s\S]*?)<\/section>/)?.[1];
assert.ok(interactiveSection, 'Interactive Computing section must exist');
const cards = [...interactiveSection.matchAll(/<article class="museum-card ([^"]+)">([\s\S]*?)<\/article>/g)];
assert.ok(cards.length > 0, 'Interactive Computing must contain cards');
assert.match(cards[0][1], /museum-card-wopr/, 'WOPR must be the first Interactive Computing card');
assert.match(cards[0][2], /museum-status available/, 'WOPR must retain AVAILABLE status');
assert.match(cards[0][2], /href="\/wopr\/"/, 'WOPR must link directly to its existing experience');
console.log('museum WOPR ordering checks passed');
