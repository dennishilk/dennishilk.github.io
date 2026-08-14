(() => {
  "use strict";

  const id = document.body.dataset.observerId;
  const kind = document.body.dataset.showcaseKind;
  const isDE = document.documentElement.lang.toLowerCase().startsWith("de");
  const locale = isDE ? "de-DE" : "en-GB";
  const latestUrl = `/world-observer/dashboard/latest/${id}.json`;
  const historyUrl = "/world-observer/dashboard/history/internet-observers.json";

  const $ = name => document.getElementById(name);
  const loading = $("observer-loading");
  const content = $("observer-content");
  const statusNode = $("quick-status");
  const primaryValue = $("quick-primary-value");
  const primaryLabel = $("quick-primary-label");
  const updateNode = $("quick-update");
  const visual = $("quick-visual");
  const historyMeta = $("quick-history-meta");
  const historyPlot = $("quick-history-plot");
  const historySummary = $("quick-history-summary");
  const historyTable = $("observer-history-table");

  const text = {
    currentExport: isDE ? "aktueller Export" : "current export",
    noTrigger: isDE ? "KEIN TRIGGER" : "NO TRIGGER",
    unavailable: isDE ? "NICHT VERFÜGBAR" : "UNAVAILABLE",
    relative: isDE ? "relativ zum aktuellen Export" : "relative to current export",
    publishedPoints: isDE ? "veröffentlichte Punkte" : "published points",
    numericPoints: isDE ? "numerische Punkte" : "numeric points",
    valueChanges: isDE ? "Wertänderungen" : "value changes",
    noHistory: isDE ? "Für diesen Observer ist derzeit kein veröffentlichter Verlauf verfügbar." : "No published history is currently available for this observer.",
  };

  function el(tag, className, value) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value !== undefined && value !== null) node.textContent = String(value);
    return node;
  }

  function num(value) {
    if (value === null || value === undefined || value === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function fmt(value, digits = 2) {
    const n = num(value);
    if (n === null) return "—";
    return new Intl.NumberFormat(locale, { maximumFractionDigits: digits, minimumFractionDigits: Number.isInteger(n) ? 0 : Math.min(digits, 2) }).format(n);
  }

  function pct(value, digits = 1) {
    const n = num(value);
    return n === null ? "—" : `${fmt(n * 100, digits)}%`;
  }

  function directPct(value, digits = 1) {
    const n = num(value);
    return n === null ? "—" : `${fmt(n, digits)}%`;
  }

  function dateText(value) {
    if (!value) return "—";
    const candidate = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00Z` : value;
    const d = new Date(candidate);
    if (Number.isNaN(d.getTime())) return String(value);
    return new Intl.DateTimeFormat(locale, { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "UTC" }).format(d);
  }

  function addMetric(parent, label, value, ratio = null, tone = "") {
    const row = el("div", `quick-metric ${tone}`.trim());
    row.append(el("span", "quick-metric-label", label));
    const track = el("span", "quick-meter");
    const fill = el("span", "quick-meter-fill");
    if (ratio !== null && Number.isFinite(ratio)) fill.style.width = `${Math.max(0, Math.min(100, ratio * 100))}%`;
    track.append(fill);
    row.append(track, el("strong", "quick-metric-value", value));
    parent.append(row);
  }

  function card(title, subtitle = "") {
    const node = el("article", "quick-data-card");
    const head = el("div", "quick-card-head");
    head.append(el("strong", "quick-card-title", title));
    if (subtitle) head.append(el("span", "quick-card-subtitle", subtitle));
    node.append(head);
    return node;
  }

  function setPrimary(data) {
    let value = "—";
    let label = text.currentExport;
    if (kind === "dns-latency") {
      value = `${fmt(data?.summary?.avg_query_ms)} ms`;
      label = isDE ? "mittlere DNS-Abfragezeit" : "average DNS query time";
    } else if (kind === "dns-stress") {
      value = String(data?.summary_stats?.significant_count ?? "—");
      label = isDE ? "signifikante Länder-Stichproben" : "significant country samples";
    } else if (kind === "horizon") {
      value = fmt(data?.global?.avg_score_today, 1);
      label = isDE ? "mittlerer aktueller Stichprobenwert" : "average current sample score";
    } else if (kind === "reach-score") {
      const rows = Array.isArray(data?.countries) ? data.countries : [];
      const avg = rows.length ? rows.reduce((s, r) => s + (num(r.score_percent) || 0), 0) / rows.length : null;
      value = avg === null ? "—" : `${fmt(avg, 1)}%`;
      label = isDE ? "mittlerer Zwei-Länder-Score" : "two-country mean score";
    } else if (kind === "http") {
      value = directPct(data?.summary?.success_rate_percent, 1);
      label = isDE ? "HTTP-Erfolgsrate des Laufs" : "run HTTP success rate";
    } else if (kind === "ipv6-adoption") {
      const rows = Array.isArray(data?.countries) ? data.countries : [];
      const tested = rows.reduce((s, r) => s + (num(r.targets_tested) || 0), 0);
      const passed = rows.reduce((s, r) => s + (num(r.ipv6_available_targets) || 0), 0);
      value = `${passed}/${tested}`;
      label = isDE ? "Ziele mit bestandenem Dualcheck" : "targets passing dual check";
    } else if (kind === "ipv6-compare") {
      value = String(data?.summary_stats?.countries_evaluated ?? "—");
      label = isDE ? "exportierte Länder-Stichproben" : "exported country samples";
    } else if (kind === "ipv6-unavailable") {
      value = text.unavailable;
      label = isDE ? "aktueller Quellenstatus" : "current source status";
    } else if (kind === "iran-dns") {
      value = `${data?.summary?.answered ?? "—"}/${data?.summary?.total_queries ?? "—"}`;
      label = isDE ? "Abfragen mit Antwort" : "queries with answers";
    } else if (kind === "mx-stub") {
      value = String(data?.results?.status || "stub").toUpperCase();
      label = isDE ? "passiver Sensorstatus" : "passive sensor status";
    } else if (kind === "mx-per") {
      value = String(data?.summary_stats?.countries_evaluated ?? "—");
      label = isDE ? "Länder-Stichproben" : "country samples";
    } else if (kind === "silent") {
      value = String(data?.summary_stats?.silent_count ?? "—");
      label = isDE ? "als still klassifiziert" : "classified silent";
    } else if (kind === "cable") {
      value = String(Array.isArray(data?.countries) ? data.countries.length : "—");
      label = isDE ? "statische Länder-Inventare" : "static country inventories";
    }
    primaryValue.textContent = value;
    primaryLabel.textContent = label;
    const status = data?.data_status || data?.status || "unknown";
    statusNode.textContent = String(status).toUpperCase();
    statusNode.dataset.status = String(status).toLowerCase();
    updateNode.textContent = `${isDE ? "Letzte Beobachtung/Aktualisierung" : "Last observation/update"}: ${dateText(data?.timestamp || data?.date_utc)}`;
  }

  function renderDnsLatency(data) {
    const targets = Array.isArray(data.targets) ? data.targets : [];
    const times = targets.flatMap(t => Object.values(t.queries || {}).map(q => num(q.query_ms)).filter(v => v !== null));
    const max = Math.max(...times, 1);
    const grid = el("div", "quick-grid quick-grid-three");
    targets.forEach(target => {
      const c = card(target.name, target.domain);
      ["A", "AAAA"].forEach(type => {
        const q = target.queries?.[type] || {};
        addMetric(c, type, q.status === "success" ? `${fmt(q.query_ms)} ms` : String(q.status || "—"), (num(q.query_ms) || 0) / max, q.status === "success" ? "ok" : "warn");
      });
      grid.append(c);
    });
    visual.append(grid, el("p", "quick-derived-note", `${isDE ? "Balkenskala" : "Bar scale"}: ${text.relative}.`));
  }

  function renderDnsStress(data) {
    const rows = Array.isArray(data.countries) ? data.countries : [];
    const max = Math.max(...rows.map(r => num(r.tta_p95_ms) || 0), 1);
    const grid = el("div", "quick-grid quick-grid-four");
    rows.forEach(row => {
      const c = card(row.country, row.is_significant ? (isDE ? "TRIGGER" : "TRIGGER") : text.noTrigger);
      addMetric(c, isDE ? "Stress" : "Stress", fmt(row.dns_stress_score, 4), (num(row.dns_stress_score) || 0) / Math.max(...rows.map(r => num(r.dns_stress_score) || 0), .0001));
      addMetric(c, isDE ? "Mittel" : "Mean", `${fmt(row.tta_mean_ms)} ms`, (num(row.tta_mean_ms) || 0) / max);
      addMetric(c, "p95", `${fmt(row.tta_p95_ms)} ms`, (num(row.tta_p95_ms) || 0) / max);
      addMetric(c, isDE ? "Jitter" : "Jitter", `${fmt(row.jitter_ms)} ms`, (num(row.jitter_ms) || 0) / max);
      const foot = el("div", "quick-card-foot");
      foot.append(el("span", "", `${row.probe_count ?? "—"} probes`), el("span", "", `success ${pct(row.success_rate)}`), el("span", "", `timeout ${pct(row.timeout_rate)}`));
      c.append(foot);
      grid.append(c);
    });
    visual.append(grid, el("p", "quick-derived-note", `${isDE ? "Timing-Balken" : "Timing bars"}: ${text.relative}.`));
  }

  function renderHorizon(data) {
    const g = card(isDE ? "GLOBALER EXPORT-SUMMARY" : "GLOBAL EXPORT SUMMARY", data.significance?.any_significant ? (isDE ? "SIGNIFIKANZ-FLAG AKTIV" : "SIGNIFICANCE FLAG ACTIVE") : text.noTrigger);
    const gm = el("div", "quick-stat-strip");
    [[isDE ? "Heute" : "Today", fmt(data.global?.avg_score_today, 2)], ["180d mean", fmt(data.global?.avg_mean_180d, 4)], ["180d high", String(Boolean(data.global?.is_new_180d_high)).toUpperCase()], ["180d low", String(Boolean(data.global?.is_new_180d_low)).toUpperCase()]].forEach(([a,b]) => { const s=el("span","quick-stat"); s.append(el("small","",a),el("strong","",b)); gm.append(s); });
    g.append(gm);
    const grid = el("div", "quick-grid quick-grid-two");
    (data.countries || []).forEach(row => {
      const c = card(row.country, row.is_new_180d_high ? "180D HIGH FLAG" : "");
      [[isDE ? "Heute" : "Today", row.score_today], ["90d mean", row.mean_90d], ["180d mean", row.mean_180d], ["90d slope", row.slope_90d], ["180d slope", row.slope_180d], ["drawdown", row.drawdown_180d]].forEach(([a,b]) => addMetric(c, a, fmt(b, 4)));
      grid.append(c);
    });
    visual.append(g, grid);
  }

  function renderReachScore(data) {
    const grid = el("div", "quick-grid quick-grid-two");
    (data.countries || []).forEach(row => {
      const c = card(row.country, `${row.targets_tested ?? "—"} ${isDE ? "Ziel" : "target"}`);
      const lamps = el("div", "quick-signal-lamps");
      const labels = ["ICMP", "TCP 443", "DNS A"];
      labels.forEach((label, index) => { const lamp = el("div", `quick-signal-lamp ${index < (num(row.score) || 0) ? "on" : "off"}`); lamp.append(el("span","",label), el("strong","", index < (num(row.score) || 0) ? "1" : "0")); lamps.append(lamp); });
      c.append(lamps);
      const foot = el("div", "quick-card-foot");
      foot.append(el("span","",`${row.score}/${row.max_score}`), el("span","",directPct(row.score_percent)));
      c.append(foot);
      grid.append(c);
    });
    visual.append(grid);
  }

  function renderHttp(data) {
    const rows = Array.isArray(data.targets) ? data.targets : [];
    const max = Math.max(...rows.map(r => num(r.response_ms) || 0), 1);
    const grid = el("div", "quick-endpoint-list");
    rows.forEach(row => {
      const item = el("article", `quick-endpoint ${num(row.response_ms) === max ? "peak" : ""}`);
      const name = (() => { try { return new URL(row.url).hostname; } catch { return row.url; } })();
      const head = el("div", "quick-endpoint-head");
      head.append(el("strong","",name), el("span","",`HTTP ${row.http_status ?? "—"}`));
      item.append(head);
      addMetric(item, row.reachable ? (isDE ? "erreichbar" : "reachable") : (isDE ? "nicht erreichbar" : "unreachable"), `${fmt(row.response_ms)} ms`, (num(row.response_ms) || 0) / max, row.reachable ? "ok" : "warn");
      grid.append(item);
    });
    visual.append(grid, el("p", "quick-derived-note", `${isDE ? "Antwortzeitbalken" : "Response-time bars"}: ${text.relative}.`));
  }

  function renderIpv6Adoption(data) {
    const grid = el("div", "quick-grid quick-grid-three");
    (data.countries || []).forEach(row => {
      const c = card(row.country, row.ipv6_available ? (isDE ? "AVAILABLE" : "AVAILABLE") : (isDE ? "NICHT BESTANDEN" : "NOT PASSED"));
      const ratio = (num(row.ipv6_available_targets) || 0) / Math.max(num(row.targets_tested) || 1, 1);
      addMetric(c, isDE ? "Dualcheck" : "Dual check", `${row.ipv6_available_targets}/${row.targets_tested}`, ratio);
      const chain = el("div", "quick-protocol-chain");
      chain.append(el("span","", "AAAA"), el("i","", "→"), el("span","", "native IPv6"), el("i","", "→"), el("span","", "TCP 443"));
      c.append(chain);
      grid.append(c);
    });
    visual.append(grid);
  }

  function renderIpv6Compare(data) {
    const grid = el("div", "quick-grid quick-grid-three");
    (data.countries || []).forEach(row => {
      const c = card(row.country, row.is_significant ? "TRIGGER" : text.noTrigger);
      addMetric(c, "IPv6 rate", pct(row.ipv6_rate), num(row.ipv6_rate));
      addMetric(c, isDE ? "Global-Referenz" : "Global ref", pct(row.global_ipv6_rate), num(row.global_ipv6_rate));
      addMetric(c, "delta", fmt(row.delta_vs_global, 4));
      addMetric(c, "trend", fmt(row.trend_delta, 4));
      addMetric(c, "z", fmt(row.z, 4));
      grid.append(c);
    });
    visual.append(grid, el("p", "quick-derived-note", isDE ? "Der Export ist PARTIAL; Nullwerte werden nicht über die Stichprobe hinaus verallgemeinert." : "The export is PARTIAL; zero values are not generalized beyond the sample."));
  }

  function renderIpv6Unavailable(data) {
    const state = el("div", "quick-unavailable-state");
    state.append(el("span", "quick-unavailable-code", "SOURCE // UNAVAILABLE"), el("strong", "", isDE ? "Keine aktuelle IPv6-Messung" : "No current IPv6 measurement"), el("p", "", isDE ? "Exportierte Platzhalter-Nullwerte werden aufgrund des Datenstatus nicht interpretiert." : "Exported placeholder zero fields are not interpreted because the data status is unavailable."));
    const source = el("div", "quick-stat-strip");
    const provider = el("span", "quick-stat"); provider.append(el("small","", "provider"), el("strong","", data.source?.provider || "—")); source.append(provider);
    state.append(source);
    const grid = el("div", "quick-grid quick-grid-three");
    (data.countries || []).forEach(row => {
      const c = card(row.country, text.unavailable);
      addMetric(c, isDE ? "Datenstatus" : "Data status", String(row.data_status || "—").toUpperCase());
      addMetric(c, isDE ? "Stichprobe" : "Sample", row.sample_size === null || row.sample_size === undefined ? "—" : String(row.sample_size));
      grid.append(c);
    });
    visual.append(state, grid);
  }

  function renderIranDns(data) {
    const types = ["A", "AAAA", "MX", "TXT"];
    const wrap = el("div", "quick-dns-matrix-wrap");
    const table = el("table", "quick-dns-matrix");
    const thead = el("thead"); const hr = el("tr"); hr.append(el("th","", isDE ? "Ziel" : "Target")); types.forEach(t => hr.append(el("th","",t))); thead.append(hr); table.append(thead);
    const tbody = el("tbody");
    (data.targets || []).forEach(target => {
      const tr = el("tr"); const name = el("th","quick-dns-target"); name.append(el("strong","",target.name),el("small","",target.domain)); tr.append(name);
      types.forEach(type => {
        const q = target.queries?.[type] || {};
        const td = el("td", `quick-dns-cell ${q.status === "answer" ? "answer" : "noanswer"}`);
        td.append(el("strong","",String(q.status || "—").toUpperCase()), el("span","",`${q.answer_count ?? "—"} ans`), el("small","",`${fmt(q.query_ms)} ms`));
        tr.append(td);
      });
      tbody.append(tr);
    });
    table.append(tbody); wrap.append(table);
    const totals = el("div", "quick-stat-strip");
    [[isDE ? "Antworten" : "Answers", data.summary?.answered], ["timeouts", data.summary?.timeouts], ["SERVFAIL", data.summary?.servfail], ["REFUSED", data.summary?.refused], [isDE ? "Fehler" : "Errors", data.summary?.errors]].forEach(([a,b]) => { const s=el("span","quick-stat"); s.append(el("small","",a),el("strong","",b ?? "—")); totals.append(s); });
    visual.append(wrap, totals);
  }

  function renderMxStub(data) {
    const state = el("div", "quick-stub-state");
    state.append(el("span", "quick-unavailable-code", "PASSIVE INPUT // STUB"), el("strong","", isDE ? "Noch keine passive Datenquelle" : "No passive data source yet"), el("p","",data.results?.notes || "—"));
    const rails = el("div", "quick-empty-rails"); for (let i=0;i<12;i+=1) rails.append(el("span","")); state.append(rails);
    visual.append(state);
  }

  function renderMxPer(data) {
    const grid = el("div", "quick-grid quick-grid-five");
    (data.countries || []).forEach(row => {
      const c = card(row.country, row.is_significant ? "TRIGGER" : text.noTrigger);
      addMetric(c, "MX present", `${row.mx_present_count}/${row.sample_size}`, num(row.mx_present_rate));
      addMetric(c, isDE ? "Present-Rate" : "Present rate", pct(row.mx_present_rate), num(row.mx_present_rate));
      addMetric(c, isDE ? "Absent-Rate" : "Absent rate", pct(row.mx_absent_rate), num(row.mx_absent_rate));
      addMetric(c, "timeout", pct(row.mx_timeout_rate), num(row.mx_timeout_rate));
      addMetric(c, isDE ? "Vollständig" : "Complete", pct(row.data_completeness), num(row.data_completeness));
      grid.append(c);
    });
    visual.append(grid);
  }

  function renderSilent(data) {
    const rows = Array.isArray(data.top_silent_countries) ? data.top_silent_countries : [];
    const max = Math.max(...rows.map(r => num(r.silence_score) || 0), .0001);
    const list = el("div", "quick-silence-list");
    rows.forEach((row, index) => {
      const item = el("article", "quick-silence-row");
      item.append(el("span","quick-rank",String(index + 1)), el("strong","quick-country",row.country));
      const meter = el("span","quick-meter"); const fill=el("span","quick-meter-fill"); fill.style.width=`${((num(row.silence_score)||0)/max)*100}%`; meter.append(fill); item.append(meter);
      item.append(el("strong","quick-score",fmt(row.silence_score,4)), el("span","quick-classification",String(row.classification || "—").toUpperCase()));
      list.append(item);
    });
    visual.append(list, el("p", "quick-derived-note", `${isDE ? "Balkenskala" : "Bar scale"}: ${text.relative}; ${isDE ? "Klassifikation bleibt exportiert" : "classification remains exported"}.`));
  }

  function renderCable(data) {
    const grid = el("div", "quick-grid quick-grid-three quick-cable-grid");
    (data.countries || []).forEach(row => {
      const c = card(row.country, row.reachable ? (isDE ? "MINIMAL REACHABLE" : "MINIMAL REACHABLE") : (isDE ? "NICHT ERREICHBAR" : "NOT REACHABLE"));
      const cable = el("div", "quick-cable-symbol");
      for (let i=0; i<Math.max(1, num(row.cable_count) || 0); i+=1) cable.append(el("span",""));
      c.append(cable);
      addMetric(c, isDE ? "Kabelanzahl" : "Cable count", row.cable_count);
      addMetric(c, isDE ? "Regionen" : "Regions", row.distinct_regions);
      grid.append(c);
    });
    visual.append(grid, el("p", "quick-derived-note", isDE ? "STATISCHES INVENTAR // KEIN LIVE-KABELSTATUS // KEINE ROUTEN // KEINE KARTE" : "STATIC INVENTORY // NO LIVE CABLE STATUS // NO ROUTES // NO MAP"));
  }

  const renderers = {
    "dns-latency": renderDnsLatency,
    "dns-stress": renderDnsStress,
    horizon: renderHorizon,
    "reach-score": renderReachScore,
    http: renderHttp,
    "ipv6-adoption": renderIpv6Adoption,
    "ipv6-compare": renderIpv6Compare,
    "ipv6-unavailable": renderIpv6Unavailable,
    "iran-dns": renderIranDns,
    "mx-stub": renderMxStub,
    "mx-per": renderMxPer,
    silent: renderSilent,
    cable: renderCable,
  };

  function historyNumber(value) {
    return value === null || value === undefined || value === "" ? null : num(value);
  }

  function renderHistory(root) {
    const history = root?.observers?.[id];
    const points = Array.isArray(history?.points) ? history.points.map(p => ({ ...p, n: historyNumber(p.value) })) : [];
    if (!points.length) {
      historyMeta.textContent = text.noHistory;
      historySummary.textContent = text.noHistory;
      historyPlot.replaceChildren();
      return;
    }
    const numeric = points.filter(p => p.n !== null);
    const values = numeric.map(p => p.n);
    const min = values.length ? Math.min(...values) : null;
    const max = values.length ? Math.max(...values) : null;
    let changes = 0;
    for (let i=1;i<numeric.length;i+=1) if (numeric[i].n !== numeric[i-1].n) changes += 1;
    historyMeta.textContent = `${dateText(points[0]?.date)} → ${dateText(points[points.length - 1]?.date)} · ${points.length} ${text.publishedPoints}`;
    const cells = el("div", "quick-history-cells");
    points.forEach((point, index) => {
      const cell = el("span", `quick-history-cell ${point.n === null ? "non-numeric" : point.n !== 0 ? "nonzero" : "zero"} ${index === points.length - 1 ? "latest" : ""}`);
      if (point.n !== null && min !== null && max !== null) {
        const spread = Math.max(max - min, .000001);
        const level = max === min ? .35 : .15 + ((point.n - min) / spread) * .85;
        cell.style.setProperty("--level", level.toFixed(3));
      }
      cell.title = `${point.date || "—"}: ${point.value ?? "—"}`;
      cells.append(cell);
    });
    historyPlot.replaceChildren(cells);
    historySummary.textContent = numeric.length
      ? `${numeric.length} ${text.numericPoints} · ${text.valueChanges}: ${changes} · min ${fmt(min, 4)} · max ${fmt(max, 4)}. ${isDE ? "Die Sequenz zeigt veröffentlichte Punkte, keine garantierte tägliche Abdeckung." : "The sequence shows published points, not guaranteed daily coverage."}`
      : `${points.length} ${text.publishedPoints}; ${isDE ? "keine numerische Reihe im Export" : "no numeric series in the export"}.`;

    const tbody = historyTable.querySelector("tbody");
    tbody.replaceChildren();
    points.slice(-12).reverse().forEach(point => {
      const tr = el("tr");
      tr.append(el("td","",dateText(point.date)), el("td","",point.value ?? "—"), el("td","",String(point.data_status || "—").toUpperCase()));
      tbody.append(tr);
    });
  }

  Promise.all([
    fetch(latestUrl, { cache: "no-store" }).then(r => { if (!r.ok) throw new Error(`latest ${r.status}`); return r.json(); }),
    fetch(historyUrl, { cache: "no-store" }).then(r => { if (!r.ok) throw new Error(`history ${r.status}`); return r.json(); }),
  ]).then(([latest, history]) => {
    if (latest?.observer !== id) throw new Error("observer mismatch");
    setPrimary(latest);
    visual.replaceChildren();
    const renderer = renderers[kind];
    if (!renderer) throw new Error(`unknown showcase kind ${kind}`);
    renderer(latest);
    renderHistory(history);
    loading.hidden = true;
    content.hidden = false;
  }).catch(error => {
    loading.dataset.state = "error";
    loading.textContent = isDE ? "Öffentliche Observer-Daten sind derzeit nicht verfügbar. Es werden keine Ersatzwerte erfunden." : "Public observer data is currently unavailable. No substitute values are invented.";
    content.hidden = true;
    console.warn("Internet observer showcase failed", error);
  });
})();
