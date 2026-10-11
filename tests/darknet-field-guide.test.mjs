import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {resolve} from 'node:path';

const root = resolve(import.meta.dirname, '..');
const slug = 'darknet-tor-onion-services';
const origin = 'https://www.dennishilk.com';
for (const [lang, prefix, other] of [['en', '/blog/', '/de/blog/'], ['de', '/de/blog/', '/blog/']]) {
  const path = prefix + slug + '/';
  const html = readFileSync(resolve(root, '.' + path, 'index.html'), 'utf8');
  test(`${lang}: article metadata, translation and discovery agree`, () => {
    const graph = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];
    const post = graph.find(x => x['@type'] === 'BlogPosting');
    assert.equal(post.url, origin + path);
    assert.equal(post.inLanguage, lang);
    assert.ok(post.wordCount > 2500);
    assert.equal(post.datePublished, '2026-10-11');
    assert.ok(html.includes(`<link rel="canonical" href="${post.url}">`));
    assert.ok(html.includes(`class="language-link" href="${other}${slug}/"`));
    for (const asset of html.matchAll(/(?:src|href)="(\/[^"?#]+)(?:\?[^"#]*)?"/g)) {
      const file = resolve(root, '.' + asset[1]);
      assert.ok(existsSync(file), asset[1]);
    }
    const image = typeof post.image === 'string' ? post.image : post.image.url;
    assert.ok(existsSync(resolve(root, '.' + image.slice(origin.length))));
    for (const file of ['index.html', 'feed.xml']) assert.ok(readFileSync(resolve(root, '.' + prefix, file), 'utf8').includes(post.url));
    assert.ok(readFileSync(resolve(root, 'sitemap-blog.xml'), 'utf8').includes(post.url));
  });
  test(`${lang}: onion data path meets at rendezvous without an exit or public-server shortcut`, () => {
    const onion = html.match(/<div class="onion-branches">([\s\S]*?)<\/section>/)[1];
    assert.equal((onion.match(/<ol class="route /g) || []).length, 2);
    assert.equal((onion.match(/<li/g) || []).length, 7); // Two endpoints plus five relays, before the shared sixth relay.
    assert.ok(onion.includes('class="rendezvous"'));
    assert.ok(!onion.includes('class="exit"'));
    assert.ok(!onion.includes('Destination') && !onion.includes('Zielwebsite'));
    assert.equal((html.match(/class="map-panel"/g) || []).length, 6);
    assert.ok(html.includes('aria-describedby="map-caption"'));
  });
  test(`${lang}: source boundaries, visible FAQ and local table of contents survive without JS`, () => {
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(x => x[1]);
    assert.equal(ids.length, new Set(ids).size);
    for (const [, id] of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(id), id);
    for (const observer of ['iran-dns-behavior', 'north-korea-connectivity', 'cuba-internet-weather']) {
      assert.ok(html.includes(`/world-observer/${observer}.html`));
    }
    assert.ok(html.includes('2019') && html.includes('2017'));
    assert.ok(html.includes('https://securedrop.org/directory/new-york-times/'));
    assert.ok(html.includes('https://spec.torproject.org/rend-spec/rendezvous-protocol.html'));
    assert.equal((html.match(/<details><summary>/g) || []).length, 6);
    assert.ok(!html.includes('"@type":"FAQPage"'));
    assert.ok(!/<script[^>]+src="https?:/i.test(html));
  });
}
