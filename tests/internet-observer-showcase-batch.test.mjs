import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const detail = readFileSync(new URL("world-observer/internet-observer-detail.js", root), "utf8");
const runtime = readFileSync(new URL("world-observer/internet-observer-showcase.js", root), "utf8");
const css = readFileSync(new URL("world-observer/internet-observer-showcase-base.css", root), "utf8");
const shellCss = readFileSync(new URL("world-observer/internet-observer-showcase.css", root), "utf8");

const quick = [
  "dns-time-to-answer-index",
  "dns-tta-stress-index",
  "global-reachability-long-horizon",
  "global-reachability-score",
  "http-reachability-index",
  "ipv6-adoption-locked-states",
  "ipv6-global-compare",
  "ipv6-locked-states",
  "iran-dns-behavior",
  "mx-presence-by-country",
  "mx-presence-per-country",
  "silent-countries-list",
  "undersea-cable-dependency",
];

function latest(slug) {
  return JSON.parse(readFileSync(new URL(`world-observer/dashboard/latest/${slug}.json`, root), "utf8"));
}

test("thirteen remaining non-premium observers use the shared showcase mode", () => {
  assert.equal(quick.length, 13);
  assert.doesNotThrow(() => new Function(detail));
  assert.doesNotThrow(() => new Function(runtime));
  assert.ok(detail.includes("const quickShowcases = {"));
  assert.ok(detail.includes("if (initQuickShowcase()) return;"));

  const quickBlock = detail.slice(detail.indexOf("const quickShowcases = {"), detail.indexOf("const isDedicatedLocalizedObserver"));
  for (const slug of quick) assert.ok(quickBlock.includes(`\"${slug}\"`), slug);
  assert.ok(!quickBlock.includes('"undersea-cable-dependency-map"'), "premium cable map must stay out of batch");

  assert.ok(detail.includes('/world-observer/internet-observer-showcase.css?v=1'));
  assert.ok(detail.includes('/world-observer/internet-observer-showcase.js?v=1'));
});

test("showcase runtime only reads existing static World Observer exports", () => {
  assert.ok(runtime.includes('const latestUrl = `/world-observer/dashboard/latest/${id}.json`'));
  assert.ok(runtime.includes('const historyUrl = "/world-observer/dashboard/history/internet-observers.json"'));
  assert.ok(!runtime.match(/fetch\(["']https?:\/\//));
  assert.ok(runtime.includes('fetch(latestUrl, { cache: "no-store" })'));
  assert.ok(runtime.includes('fetch(historyUrl, { cache: "no-store" })'));
});

test("showcase shell provides every static DOM target used by the runtime", () => {
  const ids = [...runtime.matchAll(/\$\("([^"]+)"\)/g)].map(match => match[1]);
  assert.ok(ids.length > 5);
  for (const id of new Set(ids)) {
    assert.ok(detail.includes(`id=\"${id}\"`), `missing shell id ${id}`);
  }
});

test("current exports match the renderer families without inventing data", () => {
  const dns = latest("dns-time-to-answer-index");
  assert.ok(Array.isArray(dns.targets) && dns.targets.length > 0);
  assert.ok(dns.targets.every(target => target.queries?.A && target.queries?.AAAA));

  const stress = latest("dns-tta-stress-index");
  assert.ok(Array.isArray(stress.countries) && stress.countries.length > 0);
  assert.ok(stress.countries.every(row => "dns_stress_score" in row && "tta_p95_ms" in row));

  const horizon = latest("global-reachability-long-horizon");
  assert.ok(horizon.global && Array.isArray(horizon.countries));

  const score = latest("global-reachability-score");
  assert.ok(score.countries.every(row => row.max_score === 3));
  assert.ok(score.notes.includes("ICMP ping") && score.notes.includes("TCP 443") && score.notes.includes("DNS A"));

  const http = latest("http-reachability-index");
  assert.ok(http.targets.every(row => "reachable" in row && "response_ms" in row && "http_status" in row));

  const adoption = latest("ipv6-adoption-locked-states");
  assert.ok(adoption.notes.includes("AAAA resolution") && adoption.notes.includes("native IPv6"));

  const compare = latest("ipv6-global-compare");
  assert.ok(compare.countries.every(row => "global_ipv6_rate" in row && "delta_vs_global" in row));

  const unavailable = latest("ipv6-locked-states");
  assert.equal(unavailable.data_status, "unavailable");
  assert.ok(runtime.includes("Exported placeholder zero fields are not interpreted"));

  const iran = latest("iran-dns-behavior");
  assert.ok(iran.notes.includes("standard recursion") && iran.notes.includes("No censorship circumvention"));
  assert.ok(iran.targets.every(target => ["A", "AAAA", "MX", "TXT"].every(type => target.queries?.[type])));

  const stub = latest("mx-presence-by-country");
  assert.equal(stub.results?.status, "stub");
  assert.ok(runtime.includes("No passive data source yet"));

  const mx = latest("mx-presence-per-country");
  assert.ok(mx.countries.every(row => "mx_present_rate" in row && "sample_size" in row));

  const silent = latest("silent-countries-list");
  assert.ok(Array.isArray(silent.top_silent_countries));
  assert.ok(silent.top_silent_countries.every(row => "silence_score" in row && "classification" in row));

  const cable = latest("undersea-cable-dependency");
  assert.ok(cable.notes.includes("static undersea cable infrastructure"));
  assert.ok(cable.notes.includes("does not measure live cable status"));
  assert.ok(runtime.includes("NO LIVE CABLE STATUS // NO ROUTES // NO MAP"));
});

test("showcase styling stays responsive, themed and motion-safe", () => {
  for (const theme of ["stress", "horizon", "reach", "http", "ipv6", "compare", "unavailable", "dnsgrid", "stub", "mx", "silence", "cable"]) {
    assert.ok(css.includes(`data-showcase-theme=\"${theme}\"`), theme);
  }
  assert.ok(css.includes("@media(max-width:820px)"));
  assert.ok(css.includes("@media(max-width:560px)"));
  assert.ok(css.includes("prefers-reduced-motion:reduce"));
  assert.ok(shellCss.includes("internet-observer-showcase-base.css?v=1"));
  assert.ok(shellCss.includes("body.quick-showcase .content.world-observer-page"));
});
