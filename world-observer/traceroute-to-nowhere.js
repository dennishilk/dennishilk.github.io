(() => {
  "use strict";

  const isGerman = document.documentElement.lang.toLowerCase().startsWith("de");
  const dashboardUrl = "/world-observer/dashboard/internet.json";
  const historyUrl = "/world-observer/dashboard/history/internet-observers.json";
  const observerId = "traceroute-to-nowhere";

  const text = isGerman ? {
    loadingError: "Die öffentlichen Observer-Daten sind derzeit nicht verfügbar.",
    lastObservation: "Letzte Beobachtung/Aktualisierung",
    traces: "veröffentlichte Traces",
    origin: "AGGREGAT",
    path: "VISUALISIERTE ZÄHLSPUR",
    boundary: "NICHT AUFGELÖST",
    laneEnd: "UNBEKANNT",
    laneLabel: "TRACE",
    arrayNote: "Darstellungsregel: Eine visuelle Spur pro Einheit des aktuell veröffentlichten Trace-Counts. Die Spuren sind keine echten Netzwerk-Hops und bilden keine IP-, ASN- oder RTT-Topologie ab.",
    notExported: "NICHT EXPORTIERT",
    available: "VERÖFFENTLICHT",
    historyPoints: "Verlaufspunkte",
    numericPoints: "Numerische Punkte",
    coverage: "Numerische Abdeckung",
    distinctValues: "Unterschiedliche Werte",
    changeEvents: "Wertänderungen",
    latestValue: "Letzter Wert",
    stableSummary: (n, value) => `Über ${n} numerische Verlaufspunkte blieb der veröffentlichte Aggregatwert bei ${value}. Das beschreibt ausschließlich den Exportwert und beweist keine stabile Netzwerkroute.`,
    changingSummary: (n, distinct, changes) => `${n} numerische Verlaufspunkte enthalten ${distinct} unterschiedliche Aggregatwerte und ${changes} aufeinanderfolgende Wertänderungen. Daraus wird keine Aussage über konkrete Netzwerkpfade abgeleitet.`,
    emptyHistory: "Für diesen Observer ist noch kein veröffentlichter numerischer Verlauf verfügbar.",
    pointsAvailable: n => `${n} veröffentlichte Verlaufspunkte`,
    status: "Datenstatus",
    date: "Datum",
    value: "Wert",
    observedCurrent: value => `Aktuell veröffentlichter Trace-Count: ${value}.`,
    observedHistory: n => `${n} Verlaufspunkte sind im öffentlichen History-Export vorhanden.`,
    derivedChanges: n => `${n} aufeinanderfolgende Wertänderungen werden ausschließlich aus der veröffentlichten Zahlenreihe berechnet.`,
    derivedDistinct: n => `${n} unterschiedliche numerische Werte kommen im veröffentlichten Verlauf vor.`,
    derivedCoverage: value => `Numerische Abdeckung des veröffentlichten Verlaufs: ${value}.`,
  } : {
    loadingError: "Public observer data is not available yet.",
    lastObservation: "Last observation/update",
    traces: "published traces",
    origin: "AGGREGATE",
    path: "VISUAL COUNT LANE",
    boundary: "UNRESOLVED",
    laneEnd: "UNKNOWN",
    laneLabel: "TRACE",
    arrayNote: "Presentation rule: one visual lane per unit of the currently published trace count. These lanes are not real network hops and do not represent IP, ASN or RTT topology.",
    notExported: "NOT EXPORTED",
    available: "PUBLISHED",
    historyPoints: "History points",
    numericPoints: "Numeric points",
    coverage: "Numeric coverage",
    distinctValues: "Distinct values",
    changeEvents: "Value changes",
    latestValue: "Latest value",
    stableSummary: (n, value) => `Across ${n} numeric history points, the published aggregate remained at ${value}. This describes the export value only and does not prove a stable network route.`,
    changingSummary: (n, distinct, changes) => `${n} numeric history points contain ${distinct} distinct aggregate values and ${changes} consecutive value changes. No claim about concrete network paths is derived from that series.`,
    emptyHistory: "No published numeric history is available for this observer yet.",
    pointsAvailable: n => `${n} published history points`,
    status: "Data status",
    date: "Date",
    value: "Value",
    observedCurrent: value => `Current published trace count: ${value}.`,
    observedHistory: n => `${n} history points are present in the public history export.`,
    derivedChanges: n => `${n} consecutive value changes are computed only from the published numeric series.`,
    derivedDistinct: n => `${n} distinct numeric values occur in the published history.`,
    derivedCoverage: value => `Numeric coverage of the published history: ${value}.`,
  };

  function numberOrNull(value) {
    if (value === null || value === undefined || value === "") return null;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }

  function formatNumber(value, maximumFractionDigits = 2) {
    const numeric = numberOrNull(value);
    if (numeric === null) return "—";
    return new Intl.NumberFormat(isGerman ? "de-DE" : "en-US", { maximumFractionDigits }).format(numeric);
  }

  function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat(isGerman ? "de-DE" : "en-US", {
      dateStyle: "medium",
      timeStyle: String(value).includes("T") ? "short" : undefined,
      timeZone: "UTC",
    }).format(date) + " UTC";
  }

  function formatPercent(value) {
    return `${formatNumber(value, 1)}%`;
  }

  async function loadJson(url) {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
    return response.json();
  }

  function syncPulseDistances() {
    document.querySelectorAll(".trace-lane-track").forEach(track => {
      track.style.setProperty("--pulse-distance", `${Math.max(0, track.clientWidth - 4)}px`);
    });
  }

  function renderLanes(traceCount) {
    const container = document.getElementById("trace-lanes");
    container.replaceChildren();
    const count = Math.max(0, Math.round(numberOrNull(traceCount) || 0));
    const displayed = Math.min(count, 24);

    for (let index = 0; index < displayed; index += 1) {
      const lane = document.createElement("div");
      lane.className = "trace-lane";
      lane.innerHTML = `
        <span class="trace-lane-id">${text.laneLabel} ${String(index + 1).padStart(2, "0")}</span>
        <span class="trace-lane-track" aria-hidden="true"><span class="trace-lane-pulse" style="--lane-index:${index}"></span></span>
        <span class="trace-lane-end">${text.laneEnd}</span>`;
      container.appendChild(lane);
    }

    if (!displayed) {
      const empty = document.createElement("p");
      empty.className = "trace-array-note";
      empty.textContent = "—";
      container.appendChild(empty);
    }

    document.getElementById("trace-array-origin").textContent = text.origin;
    document.getElementById("trace-array-path").textContent = text.path;
    document.getElementById("trace-array-boundary").textContent = text.boundary;
    document.getElementById("trace-boundary-label").textContent = text.boundary;
    document.getElementById("trace-array-note").textContent = text.arrayNote;

    requestAnimationFrame(syncPulseDistances);
    if ("ResizeObserver" in window) {
      const observer = new ResizeObserver(syncPulseDistances);
      document.querySelectorAll(".trace-lane-track").forEach(track => observer.observe(track));
    } else {
      window.addEventListener("resize", syncPulseDistances, { passive: true });
    }
  }

  function analyzeHistory(record) {
    const points = Array.isArray(record?.points) ? record.points : [];
    const numeric = points
      .map((point, index) => ({ point, index, value: numberOrNull(point.value) }))
      .filter(entry => entry.value !== null);
    const values = numeric.map(entry => entry.value);
    const distinct = new Set(values.map(value => String(value)));
    let changes = 0;
    for (let index = 1; index < values.length; index += 1) {
      if (values[index] !== values[index - 1]) changes += 1;
    }
    return {
      points,
      numeric,
      values,
      distinctCount: distinct.size,
      changes,
      gaps: points.length - numeric.length,
      min: values.length ? Math.min(...values) : null,
      max: values.length ? Math.max(...values) : null,
      latest: values.length ? values.at(-1) : null,
      coverage: points.length ? (numeric.length / points.length) * 100 : 0,
    };
  }

  function renderCarrier(analysis) {
    const strip = document.getElementById("trace-carrier-strip");
    strip.replaceChildren();
    const { points, min, max } = analysis;
    const span = min !== null && max !== null ? max - min : 0;

    points.forEach(point => {
      const value = numberOrNull(point.value);
      const bar = document.createElement("span");
      bar.className = "trace-carrier-point";
      if (value === null) {
        bar.classList.add("is-gap");
        bar.title = `${point.date || "—"}: —`;
      } else {
        const normalized = span === 0 ? 0.62 : (value - min) / span;
        const height = 38 + (normalized * 52);
        const opacity = 0.5 + (normalized * 0.45);
        bar.style.setProperty("--carrier-height", `${height}%`);
        bar.style.setProperty("--carrier-opacity", String(opacity));
        bar.title = `${point.date || "—"}: ${formatNumber(value)}`;
      }
      strip.appendChild(bar);
    });

    const first = points[0]?.date || "—";
    const last = points.at(-1)?.date || "—";
    document.getElementById("trace-carrier-start").textContent = first;
    document.getElementById("trace-carrier-end").textContent = last;
  }

  function renderHistoryStats(analysis) {
    const stats = [
      [text.historyPoints, analysis.points.length],
      [text.numericPoints, analysis.numeric.length],
      [text.coverage, formatPercent(analysis.coverage)],
      [text.distinctValues, analysis.distinctCount],
      [text.changeEvents, analysis.changes],
      [text.latestValue, formatNumber(analysis.latest)],
    ];

    const container = document.getElementById("trace-history-stats");
    container.replaceChildren();
    stats.forEach(([label, value]) => {
      const item = document.createElement("div");
      item.className = "trace-history-stat";
      item.innerHTML = `<span>${label}</span><strong>${value}</strong>`;
      container.appendChild(item);
    });

    const summary = document.getElementById("observer-history-summary");
    if (!analysis.numeric.length) {
      summary.textContent = text.emptyHistory;
    } else if (analysis.distinctCount === 1) {
      summary.textContent = text.stableSummary(analysis.numeric.length, formatNumber(analysis.latest));
    } else {
      summary.textContent = text.changingSummary(analysis.numeric.length, analysis.distinctCount, analysis.changes);
    }

    document.getElementById("trace-history-count-label").textContent = text.pointsAvailable(analysis.points.length);
  }

  function renderHistoryTable(record) {
    const body = document.querySelector("#observer-history-table tbody");
    body.replaceChildren();
    const points = Array.isArray(record?.points) ? record.points : [];
    points.slice(-12).reverse().forEach(point => {
      const row = document.createElement("tr");
      const status = String(point.data_status || "unknown").replaceAll("_", " ");
      row.innerHTML = `<td>${point.date || "—"}</td><td>${formatNumber(point.value)}</td><td>${status}</td>`;
      body.appendChild(row);
    });
  }

  function renderEvidence(observer, analysis) {
    document.getElementById("trace-observed-current").textContent = text.observedCurrent(formatNumber(observer.primary_metric_value));
    document.getElementById("trace-observed-history").textContent = text.observedHistory(analysis.points.length);
    document.getElementById("trace-derived-changes").textContent = text.derivedChanges(analysis.changes);
    document.getElementById("trace-derived-distinct").textContent = text.derivedDistinct(analysis.distinctCount);
    document.getElementById("trace-derived-coverage").textContent = text.derivedCoverage(formatPercent(analysis.coverage));
  }

  function renderFacts(observer) {
    document.getElementById("trace-status").textContent = String(observer.data_status || observer.status || "unknown").toUpperCase();
    document.getElementById("trace-topology").textContent = text.notExported;
    document.getElementById("trace-hop-identities").textContent = text.notExported;
    document.getElementById("trace-rtt").textContent = text.notExported;
  }

  async function render() {
    const [dashboard, history] = await Promise.all([
      loadJson(dashboardUrl),
      loadJson(historyUrl),
    ]);
    const observer = (dashboard.observers || []).find(entry => entry.observer === observerId);
    if (!observer) throw new Error(`Observer not found: ${observerId}`);
    const record = history?.observers?.[observerId] || null;
    const analysis = analyzeHistory(record);

    document.getElementById("observer-primary-value").textContent = formatNumber(observer.primary_metric_value);
    document.getElementById("trace-primary-unit").textContent = text.traces;
    document.getElementById("observer-last-update").textContent = `${text.lastObservation}: ${formatDate(observer.last_seen_date)}`;

    renderLanes(observer.primary_metric_value);
    renderFacts(observer);
    renderCarrier(analysis);
    renderHistoryStats(analysis);
    renderHistoryTable(record);
    renderEvidence(observer, analysis);

    document.getElementById("observer-loading").hidden = true;
    document.getElementById("observer-content").hidden = false;
  }

  render().catch(error => {
    console.error("Unable to render Traceroute To Nowhere", error);
    const loading = document.getElementById("observer-loading");
    loading.textContent = text.loadingError;
  });
})();
