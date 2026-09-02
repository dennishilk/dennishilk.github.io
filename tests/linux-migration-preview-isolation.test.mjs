import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const [preview, homepage, sitemap, museum] = await Promise.all([
  read('../labs/linux-migration-companion/index.html'),
  read('../index.html'),
  read('../sitemap.xml'),
  read('../museum/index.html'),
]);

test('Linux Migration Companion entry stays unlisted and noindex', () => {
  assert.match(preview, /name="robots" content="noindex,nofollow,noarchive,nosnippet"/);
  assert.match(preview, /src="\/linux-migration-companion\/"/);
  assert.match(preview, /href="\/linux-migration-companion\/"/);
  assert.doesNotMatch(preview, /stars\.js|site-language|Featured Projects|Computer Museum/);
});

test('entry is absent from public discovery surfaces', () => {
  for (const source of [homepage, sitemap, museum]) {
    assert.doesNotMatch(source, /linux-migration-companion/i);
  }
});
