import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const renderer = readFileSync(new URL("world-observer/internet-observer-detail.js", root), "utf8");
const css = readFileSync(new URL("world-observer/internet-observer-detail.css", root), "utf8");
const stars = readFileSync(new URL("stars.js", root), "utf8");
const robots = readFileSync(new URL("robots.txt", root), "utf8");
const sitemap = readFileSync(new URL("sitemap-internet-observers.xml", root), "utf8");

const observers = [
  ["cuba-internet-weather", "Kuba Internet-Wetter"],
  ["dns-time-to-answer-index", "DNS-Antwortzeitindex"],
  ["dns-tta-stress-index", "DNS-TTA-Stressindex"],
  ["global-reachability-long-horizon", "Globale Erreichbarkeit – Langzeithorizont"],
  ["global-reachability-score", "Globaler Erreichbarkeitswert"],
  ["http-reachability-index", "HTTP-Erreichbarkeitsindex"],
  ["internet-shrinkage-index", "Internet-Schrumpfungsindex"],
  ["ipv6-adoption-locked-states", "IPv6-Adoption – Locked States"],
  ["ipv6-global-compare", "IPv6 Global Compare"],
  ["ipv6-locked-states", "IPv6 Locked States"],
  ["iran-dns-behavior", "Iran DNS-Verhalten"],
  ["mx-presence-by-country", "MX-Präsenz nach Land"],
  ["mx-presence-per-country", "MX-Präsenz pro Land"],
  ["north-korea-connectivity", "Nordkorea-Konnektivität"],
  ["silent-countries-list", "Liste stiller Länder"],
  ["tls-fingerprint-change", "TLS-Fingerprint-Änderung"],
  ["traceroute-to-nowhere", "Traceroute ins Nirgendwo"],
  ["undersea-cable-dependency", "Abhängigkeit von Unterseekabeln"],
  ["undersea-cable-dependency-map", "Karte der Unterseekabel-Abhängigkeiten"],
];

test("all 19 public Internet observers have German crawlable routes", () => {
  assert.equal(observers.length, 19);

  for (const [slug, title] of observers) {
    const html = readFileSync(new URL(`de/world-observer/${slug}.html`, root), "utf8");
    const enUrl = `https://dennishilk.com/world-observer/${slug}.html`;
    const deUrl = `https://dennishilk.com/de/world-observer/${slug}.html`;

    assert.ok(html.includes('<html lang="de">'), slug);
    assert.ok(html.includes(`data-observer-id="${slug}"`), slug);
    assert.ok(html.includes(`<link rel="canonical" href="${deUrl}">`), slug);
    assert.ok(html.includes(`hreflang="en" href="${enUrl}"`), slug);
    assert.ok(html.includes(`hreflang="de" href="${deUrl}"`), slug);
    assert.match(html, /"inLanguage"\s*:\s*"de"/, slug);
    assert.ok(html.includes(title), slug);
    assert.ok(html.includes("← Zurück zu den Internet-Observern"), slug);

    if (slug === "traceroute-to-nowhere") {
      assert.ok(html.includes('/world-observer/traceroute-to-nowhere.css?v=1'), slug);
      assert.ok(html.includes('/world-observer/traceroute-to-nowhere.js?v=1'), slug);
      assert.ok(html.includes('class="trace-language"'), slug);
    } else if (slug === "north-korea-connectivity") {
      assert.ok(html.includes('/world-observer/north-korea-connectivity.css?v=1'), slug);
      assert.ok(html.includes('/world-observer/north-korea-connectivity.js?v=1'), slug);
      assert.ok(html.includes('/world-observer/north-korea-language.js?v=1'), slug);
      assert.ok(html.includes('class="nk-language"'), slug);
    } else if (slug === "internet-shrinkage-index") {
      assert.ok(html.includes('/world-observer/internet-shrinkage-index.css?v=1'), slug);
      assert.ok(html.includes('/world-observer/internet-shrinkage-index.js?v=1'), slug);
      assert.ok(html.includes('/world-observer/internet-shrinkage-language.js?v=1'), slug);
      assert.ok(html.includes('class="shrink-language"'), slug);
    } else if (slug === "cuba-internet-weather") {
      assert.ok(html.includes('/world-observer/cuba-internet-weather.css?v=1'), slug);
      assert.ok(html.includes('/world-observer/cuba-internet-weather.js?v=1'), slug);
      assert.ok(html.includes('/world-observer/cuba-internet-weather-language.js?v=1'), slug);
      assert.ok(html.includes('class="cuba-language"'), slug);
    } else {
      assert.ok(html.includes('/world-observer/internet-observer-detail.css?v=2'), slug);
      assert.ok(html.includes('/world-observer/internet-observer-detail.js?v=2'), slug);
    }

    assert.ok(sitemap.includes(`<loc>${enUrl}</loc>`), `${slug} EN sitemap`);
    assert.ok(sitemap.includes(`<loc>${deUrl}</loc>`), `${slug} DE sitemap`);
    assert.ok(sitemap.includes(`hreflang="de" href="${deUrl}"`), `${slug} de hreflang`);
    assert.ok(sitemap.includes(`hreflang="en" href="${enUrl}"`), `${slug} en hreflang`);
  }
});

test("shared Internet detail runtime localizes remaining generic UI and owns EN/DE switching", () => {
  assert.doesNotThrow(() => new Function(renderer));
  assert.doesNotThrow(() => new Function(stars));

  assert.ok(renderer.includes("dedicatedLocalizedObservers"));
  assert.ok(renderer.includes("internet-detail-language-switcher"));
  assert.ok(renderer.includes('localStorage.setItem("dennishilk-language", language)'));
  assert.ok(renderer.includes("localizedObserverNames"));
  assert.ok(renderer.includes("Durchschnittliche DNS-Antwortzeit"));
  assert.ok(renderer.includes("Aktuelle Beobachtung"));
  assert.ok(renderer.includes("Beobachtet"));
  assert.ok(renderer.includes("Methodik"));
  assert.ok(renderer.includes("Quellen"));

  assert.ok(stars.includes("dedicatedInternetDetailIds"));
  assert.ok(stars.includes("useDedicatedInternetLanguageUi"));
  assert.ok(css.includes(".internet-detail-language-switcher"));
  assert.ok(css.includes(".internet-detail-eyebrow"));
});

test("Internet observer language sitemap is advertised and contains all public pairs", () => {
  assert.ok(robots.includes("Sitemap: https://dennishilk.com/sitemap-internet-observers.xml"));
  assert.equal((sitemap.match(/<url>/g) || []).length, 40);
  assert.ok(sitemap.includes("https://dennishilk.com/world-observer/area51.html"));
  assert.ok(sitemap.includes("https://dennishilk.com/de/world-observer/area51.html"));
});
