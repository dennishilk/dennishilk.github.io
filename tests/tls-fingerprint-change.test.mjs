import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const en = readFileSync(new URL("world-observer/tls-fingerprint-change.html", root), "utf8");
const de = readFileSync(new URL("de/world-observer/tls-fingerprint-change.html", root), "utf8");
const js = readFileSync(new URL("world-observer/tls-fingerprint-change.js", root), "utf8");
const language = readFileSync(new URL("world-observer/tls-fingerprint-language.js", root), "utf8");
const css = readFileSync(new URL("world-observer/tls-fingerprint-change.css", root), "utf8");

const enUrl = "https://dennishilk.com/world-observer/tls-fingerprint-change.html";
const deUrl = "https://dennishilk.com/de/world-observer/tls-fingerprint-change.html";

test("TLS showcase has real English and German routes with dedicated assets", () => {
  assert.ok(en.includes('<html lang="en">'));
  assert.ok(de.includes('<html lang="de">'));
  assert.ok(en.includes('data-observer-id="tls-fingerprint-change"'));
  assert.ok(de.includes('data-observer-id="tls-fingerprint-change"'));

  for (const html of [en, de]) {
    assert.ok(html.includes('/world-observer/tls-fingerprint-change.css?v=1'));
    assert.ok(html.includes('/world-observer/tls-fingerprint-change.js?v=1'));
    assert.ok(html.includes('/world-observer/tls-fingerprint-language.js?v=1'));
    assert.ok(html.includes('class="tls-language"'));
    assert.ok(!html.includes('/world-observer/internet-observer-detail.js'));
  }

  assert.ok(en.includes(`<link rel="canonical" href="${enUrl}">`));
  assert.ok(de.includes(`<link rel="canonical" href="${deUrl}">`));
  assert.ok(en.includes(`hreflang="de" href="${deUrl}"`));
  assert.ok(de.includes(`hreflang="en" href="${enUrl}"`));
  assert.match(en, /"inLanguage"\s*:\s*"en"/);
  assert.match(de, /"inLanguage"\s*:\s*"de"/);
  assert.ok(en.includes("← Back to Internet Observers"));
  assert.ok(de.includes("← Zurück zu den Internet-Observern"));
});

test("TLS runtime reads only published dashboard, latest and history exports", () => {
  assert.doesNotThrow(() => new Function(js));
  assert.ok(js.includes('/world-observer/dashboard/internet.json'));
  assert.ok(js.includes('/world-observer/dashboard/latest/tls-fingerprint-change.json'));
  assert.ok(js.includes('/world-observer/dashboard/history/internet-observers.json'));
  assert.ok(js.includes("tls_version_distribution"));
  assert.ok(js.includes("cipher_class_distribution"));
  assert.ok(js.includes("tls_change_score"));
  assert.ok(js.includes("significant_count"));
  assert.ok(js.includes("sample_size"));
  assert.ok(js.includes("handshake_abort_rate"));
  assert.ok(js.includes("alpn_presence_rate"));
});

test("every literal getElementById target exists in both language pages", () => {
  const ids = [...js.matchAll(/getElementById\("([^"]+)"\)/g)].map(match => match[1]);
  assert.ok(ids.length >= 20);
  for (const id of ids) {
    assert.ok(en.includes(`id="${id}"`), `EN missing #${id}`);
    assert.ok(de.includes(`id="${id}"`), `DE missing #${id}`);
  }
});

test("TLS evidence boundary refuses to invent certificate fingerprints or causal context", () => {
  assert.ok(en.includes("does not publish literal certificate fingerprints"));
  assert.ok(en.includes("Certificate hashes/fingerprints"));
  assert.ok(en.includes("country-wide TLS census"));
  assert.ok(de.includes("keine echten Zertifikat-Fingerprints"));
  assert.ok(de.includes("Zertifikat-Hashes/Fingerprints"));
  assert.ok(de.includes("landesweite TLS-Vollerhebung"));
  assert.ok(en.includes("profile surface ≠ certificate hash"));
  assert.ok(de.includes("Profiloberfläche ≠ Zertifikat-Hash"));
});

test("TLS language helper stores explicit EN/DE selection and navigates", () => {
  assert.doesNotThrow(() => new Function(language));
  assert.ok(language.includes('.tls-language a[hreflang]'));
  assert.ok(language.includes('localStorage.setItem(STORAGE_KEY, language)'));
  assert.ok(language.includes('localStorage.setItem(LEGACY_KEY, language)'));
  assert.ok(language.includes('window.location.assign(link.href)'));
});

test("TLS showcase is responsive and respects reduced motion", () => {
  assert.ok(css.includes(".tls-country-surfaces"));
  assert.ok(css.includes(".tls-memory-field"));
  assert.ok(css.includes("@media (max-width: 680px)"));
  assert.ok(css.includes("@media (prefers-reduced-motion: reduce)"));
  assert.ok(css.includes("animation: none !important"));
});
