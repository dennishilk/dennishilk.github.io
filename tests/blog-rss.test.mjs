import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
test("localized RSS feeds match published blog metadata", () => {
  assert.doesNotThrow(() => execFileSync(process.execPath, ["scripts/generate-blog-rss.mjs", "--check"], { cwd: root }));
});
for (const [lang, folder] of [["en", "blog"], ["de", "de/blog"]]) {
  test(lang + " feed discovers all published blog entries", () => {
    const xml = readFileSync(resolve(root, folder, "feed.xml"), "utf8");
    const html = readFileSync(resolve(root, folder, "index.html"), "utf8");
    const metadata = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    const listing = metadata["@graph"].find(x => x["@type"] === "ItemList");
    assert.match(xml, /<rss version="2.0"/);
    assert.match(xml, new RegExp("<language>" + lang + "<\/language>"));
    assert.equal((xml.match(/<item>/g) || []).length, listing.itemListElement.length);
    assert.equal((xml.match(/<guid isPermaLink="true">/g) || []).length, listing.itemListElement.length);
    for (const item of listing.itemListElement) assert.ok(xml.includes(item.url), item.url);
    assert.ok(html.includes('type="application/rss+xml"'));
  });
}
