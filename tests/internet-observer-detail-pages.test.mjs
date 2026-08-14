import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const dashboard = JSON.parse(readFileSync(new URL("world-observer/dashboard/internet.json", root), "utf8"));
const dashboardHtml = readFileSync(new URL("world-observer/internet.html", root), "utf8");
const renderer = readFileSync(new URL("world-observer.js", root), "utf8");
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

    assert.match(html, new RegExp(`<title>${observer.display_name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} – World Observer</title>`));
    assert.ok(html.includes(`data-observer-id="${observer.observer}"`));
    assert.ok(html.includes(`href="${canonical}"`));
    assert.ok(html.includes("← Back to Internet Observers"));
    assert.ok(html.includes("<h2 id=\"current-observation-title\">Current Observation</h2>"));

    if (observer.observer === "area51-reachability") {
      assert.ok(html.includes("<h2 id=\"public-watch-title\">Satellite &amp; Thermal Watch</h2>"));
      assert.ok(html.includes("Latest Public Satellite Pass"));
      assert.ok(html.includes("Thermal Anomaly Watch"));
      assert.ok(html.includes("stac.dataspace.copernicus.eu"));
      assert.ok(html.includes("gibs.earthdata.nasa.gov"));
    } else {
      assert.ok(html.includes("<h2 id=\"history-title\">History</h2>"));
    }

    assert.ok(html.includes(">Observed</h2>"));
    assert.ok(html.includes(">Derived</h2>"));
    assert.ok(html.includes(">Unknown</h2>"));
    assert.ok(html.includes(">Methodology</h2>"));
    assert.ok(html.includes(">Sources</h2>"));
    assert.ok(sitemap.includes(`<loc>${canonical}</loc>`));
  }
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
