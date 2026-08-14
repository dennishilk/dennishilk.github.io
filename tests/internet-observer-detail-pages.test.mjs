import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const dashboard = JSON.parse(readFileSync(new URL("world-observer/dashboard/internet.json", root), "utf8"));
const dashboardHtml = readFileSync(new URL("world-observer/internet.html", root), "utf8");
const renderer = readFileSync(new URL("world-observer.js", root), "utf8");
const area51Renderer = readFileSync(new URL("world-observer/area51.js", root), "utf8");
const area51GermanBundle = readFileSync(new URL("site-i18n-de-area51.js", root), "utf8");
const siteLanguage = readFileSync(new URL("site-language.js", root), "utf8");
const stars = readFileSync(new URL("stars.js", root), "utf8");
const sitemap = readFileSync(new URL("sitemap.xml", root), "utf8");

function slugFor(observerId) {
  return observerId === "area51-reachability" ? "area51" : observerId;
}

test("every current Internet observer has a stable detail page", () => {
  assert.equal(dashboard.observer_count, 21);
  assert.equal(dashboard.observers.length, 21);

  for (const observer of dashboard.observers) {
    const slug = slugFor(observer.observer);
    const path = `world-observer/${slug}.html`;
    const html = readFileSync(new URL(path, root), "utf8");
    const canonical = `https://dennishilk.com/world-observer/${slug}.html`;

    if (observer.observer === "area51-reachability") {
      assert.ok(html.includes("<title>Groom Lake Public Signal Observatory – Area 51 | World Observer</title>"));
    } else {
      assert.match(html, new RegExp(`<title>${observer.display_name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} – World Observer</title>`));
    }

    assert.ok(html.includes(`data-observer-id="${observer.observer}"`));
    assert.ok(html.includes(`href="${canonical}"`));
    assert.ok(html.includes("← Back to Internet Observers"));
    assert.match(html, /<h2 id="current-observation-title">[^<]+<\/h2>/);

    if (observer.observer === "area51-reachability") {
      assert.ok(html.includes("<h2 id=\"public-watch-title\">Satellite &amp; Thermal Watch</h2>"));
      assert.ok(html.includes("Latest Public Satellite Pass"));
      assert.ok(html.includes("Recent Sentinel-2 passes"));
      assert.ok(html.includes("Thermal Anomaly Watch"));
      assert.ok(html.includes("NO BASEMAP · DETECTIONS ONLY"));
      assert.ok(html.includes("GetLegendGraphic"));
      assert.ok(html.includes("stac.dataspace.copernicus.eu"));
      assert.ok(html.includes("gibs.earthdata.nasa.gov"));
      assert.ok(!html.includes("area51-thermal-base"));
    } else {
      assert.match(html, /<h2 id="history-title">[^<]+<\/h2>/);
    }

    assert.match(html, />Observed<\/h[23]>/);
    assert.match(html, />Derived<\/h[23]>/);
    assert.match(html, />Unknown<\/h[23]>/);
    assert.match(html, />Methodology<\/h[23]>/);
    assert.match(html, />Sources<\/h[23]>/);
    assert.ok(sitemap.includes(`<loc>${canonical}</loc>`));
  }
});

test("Area51 has crawlable English and German localized pages", () => {
  const english = readFileSync(new URL("world-observer/area51.html", root), "utf8");
  const german = readFileSync(new URL("de/world-observer/area51.html", root), "utf8");
  const enUrl = "https://dennishilk.com/world-observer/area51.html";
  const deUrl = "https://dennishilk.com/de/world-observer/area51.html";

  assert.ok(english.includes('<html lang="en">'));
  assert.ok(german.includes('<html lang="de">'));
  assert.ok(english.includes(`<link rel="alternate" hreflang="de" href="${deUrl}">`));
  assert.ok(german.includes(`<link rel="alternate" hreflang="en" href="${enUrl}">`));
  assert.ok(english.includes(`<link rel="canonical" href="${enUrl}">`));
  assert.ok(german.includes(`<link rel="canonical" href="${deUrl}">`));
  assert.ok(english.includes('"inLanguage": "en"'));
  assert.ok(german.includes('"inLanguage": "de"'));
  assert.ok(german.includes("Letzte öffentliche Satellitenpassage"));
  assert.ok(german.includes("Beobachtung thermischer Anomalien"));
  assert.ok(sitemap.includes(`<loc>${deUrl}</loc>`));
  assert.ok(sitemap.includes(`hreflang="de" href="${deUrl}"`));
});

test("Area51 language switch uses dedicated localized routes", () => {
  assert.doesNotThrow(() => new Function(siteLanguage));
  assert.doesNotThrow(() => new Function(stars));
  assert.ok(siteLanguage.includes('"/world-observer/area51.html": { en: "/world-observer/area51.html", de: "/de/world-observer/area51.html" }'));
  assert.ok(siteLanguage.includes('"/de/world-observer/area51.html": { en: "/world-observer/area51.html", de: "/de/world-observer/area51.html" }'));
  assert.ok(stars.includes("/site-language.js?v=20260814-area51-1"));
});

test("Internet observer cards use crawlable anchor destinations", () => {
  assert.ok(dashboardHtml.includes("/world-observer/internet-observer-detail.css"));
  assert.ok(dashboardHtml.includes('href="/world-observer.html">← World Observer</a>'));
  assert.ok(renderer.includes('const link = document.createElement("a")'));
  assert.ok(renderer.includes('link.href = observerUrl'));
  assert.ok(renderer.includes('link.setAttribute("aria-label", `Open ${titleText} observer`)'));
  assert.ok(renderer.includes('id === "area51-reachability" ? "area51" : id'));
  assert.ok(renderer.includes('getObserverId(observer) !== "east-frisia-water-observer"'));
  assert.ok(!renderer.includes('detailsId = `internet-observer-details-${index}`'));
});

test("Area51 public-watch renderer and German bundle remain valid JavaScript", () => {
  assert.doesNotThrow(() => new Function(area51Renderer));
  assert.doesNotThrow(() => new Function(area51GermanBundle));
  assert.ok(area51Renderer.includes("stac.dataspace.copernicus.eu/v1/search"));
  assert.ok(area51Renderer.includes("recentPasses(features)"));
  assert.ok(area51Renderer.includes("VIIRS_NOAA20_Thermal_Anomalies_375m_All"));
  assert.ok(area51Renderer.includes("gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi"));
  assert.ok(area51Renderer.includes('document.documentElement.lang.toLowerCase().startsWith("de")'));
});
