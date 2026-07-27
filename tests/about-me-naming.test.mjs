import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const home = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const about = readFileSync(new URL('../about/index.html', import.meta.url), 'utf8');

assert.match(home, /<a href="\/about\/">[^<]*<i[^>]*><\/i> About Me<\/a>/);
assert.doesNotMatch(home, /<a href="\/about\/">[^<]*<i[^>]*><\/i> About<\/a>/);

assert.match(about, /<title>About Me — Dennis Hilk/);
assert.match(about, /<meta property="og:title" content="About Me — Dennis Hilk/);
assert.match(about, /<meta name="twitter:title" content="About Me — Dennis Hilk">/);
assert.match(about, /data-language-content="en">About Me<\/p>/);
assert.match(about, /data-language-content="de" hidden>Über mich<\/p>/);

assert.match(about, /<link rel="canonical" href="https:\/\/dennishilk\.com\/about\/">/);
assert.match(about, /<meta property="og:url" content="https:\/\/dennishilk\.com\/about\/">/);

console.log('About Me naming regression checks passed');
