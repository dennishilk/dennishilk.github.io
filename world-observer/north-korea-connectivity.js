(() => {
  "use strict";

  const isGerman = document.documentElement.lang.toLowerCase().startsWith("de");
  const dashboardUrl = "/world-observer/dashboard/internet.json";
  const historyUrl = "/world-observer/dashboard/history/internet-observers.json";
  const observerId = "north-korea-connectivity";

  const text = isGerman ? {
    loadingError: "Die öffentlichen Observer-Daten sind derzeit nicht verfügbar.",
    lastObservation: "Letzte Beobachtung/Aktualisierung",
    units: value => `${value} Einheiten`,
    historyPoints: "Verlaufspunkte",
    numericPoints: "Numerische Punkte",
    coverage: "Numerische Abdeckung",
    distinctValues: "Unterschiedliche TCP-Werte",
    changes: "TCP-Wertänderungen",
    latestValue: "Letzter TCP-Wert",
    pointsAvailable: value => `${value} veröffentlichte Verlaufspunkte`,
    stableSummary: (numeric, value) => `Über ${numeric} numerische Verlaufspunkte blieb der veröffentlichte TCP-Probe-Zählwert bei ${value}. Das zeigt ausschließlich die Kontinuität des Exportwerts und belegt weder Probe-Erfolg noch Netzwerkerreichbarkeit.`,
    changingSummary: (numeric, distinct, changes) => `${numeric} numerische Verlaufspunkte enthalten ${distinct} unterschiedliche TCP-Probe-Zählwerte und ${changes} aufeinanderfolgende Änderungen. Daraus wird keine Aussage über konkrete Ziele, Antworten oder Netzwerkrouten abgeleitet.`,
    emptyHistory: "Für diesen Observer ist noch kein veröffentlichter numerischer TCP-Zählwertverlauf verfügbar.",
    observedTcp: value => `Aktuell veröffentlichter TCP-Probe-Zählwert: ${value}.`,
    observedIcmp: value => `Aktuell veröffentlichter ICMP-Probe-Zählwert: ${value}.`,
    observedHistory: value => `${value} Verlaufspunkte sind im öffentlichen TCP-Zählwertverlauf vorhanden.`,
    derivedCoverage: value => `Numerische Abdeckung des veröffentlichten TCP-Verlaufs: ${value}.`,
    derivedDistinct: value => `${value} unterschiedliche numerische TCP-Zählwerte kommen im veröffentlichten Verlauf vor.`,
    derivedChanges: value => `${value} aufeinanderfolgende TCP-Zählwertänderungen werden ausschließlich aus der veröffentlichten Zahlenreihe berechnet.`,
    status: value => {
      const normalized = String(value || "unknown").toLowerCase();
      return ({ ok: "OK", partial: "TEILWEISE", unavailable: "NICHT VERFÜGBAR", error: "FEHLER", unknown: "UNBEKANNT" })[normalized] || normalized.toUpperCase();
    },
  } : {
    loadingError: "Public observer data is not available yet.",
    lastObservation: "Last observation/update",
    units: value => `${value} units`,
    historyPoints: "History points",
    numericPoints: "Numeric points",
    coverage: "Numeric coverage",
    distinctValues: "Distinct TCP values",
    changes: "TCP value changes",
    latestValue: "Latest TCP value",
    pointsAvailable: value => `${value} published history points`,
    stableSummary: (numeric, value) => `Across ${numeric} numeric history points, the published TCP probe count remained at ${value}. This shows continuity of the export value only and does not establish probe success or network reachability.`,
    changingSummary: (numeric, distinct, changes) => `${numeric} numeric history points contain ${distinct} distinct TCP probe counts and ${changes} consecutive changes. No claim about concrete targets, responses or network routes is derived from that series.`,
    emptyHistory: "No published numeric TCP count history is available for this observer yet.",
    observedTcp: value => `Current published TCP probe count: ${value}.`,
    observedIcmp: value => `Current published ICMP probe count: ${value}.`,
    observedHistory: value => `${value} history points are present in the public TCP count history.`,
    derivedCoverage: value => `Numeric coverage of the published TCP history: ${value}.`,
    derivedDistinct: value => `${value} distinct numeric TCP counts occur in the published history.`,
    derivedChanges: value => `${value} consecutive TCP count changes are computed only from the published numeric series.`,
    status: value => String(value || "unknown").replaceAll("_", " ").toUpperCase(),
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

  function formatPercent(value) {
    return `${formatNumber(value, 1)}%`;
  }

  function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat(isGerman ? "de-DE" : "en-US", {
      dateStyle: "medium",
      timeZone: "UTC",
    }).format(date) + " UTC";
  }

  async function loadJson(url) {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
    return response.json();
  }

  function renderProbeCells(containerId, count, kind) {
    const container = document.getElementById(containerId);
    container.replaceChildren();
    const numeric = Math.max(0, Math.round(numberOrNull(count) || 0));
    const displayed = Math.min(numeric, 64);

    for (let index = 0; index < displayed; index += 1) {
      const cell = document.createElement("span");
      cell.className = "nk-probe-cell";
      cell.style.setProperty("--cell-index", String(index));
      cell.dataset.channel = kind;
      container.appendChild(cell);
    }
  }

  function analyzeHistory(record) {
    const points = Array.isArray(record?.points) ? record.points : [];
    const numeric = points
      .map(point => ({ point, value: numberOrNull(point.value) }))
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
      min: values.length ? Math.min(...values) : null,
      max: values.length ? Math.max(...values) : null,
      latest: values.length ? values.at(-1) : null,
      coverage: points.length ? (numeric.length / points.length) * 100 : 0,
    };
  }

  function renderHistoryField(analysis) {
    const field = document.getElementById("nk-history-field");
    field.replaceChildren();
    const { points, min, max } = analysis;
    const span = min !== null && max !== null ? max - min : 0;

    points.forEach(point => {
      const value = numberOrNull(point.value);
      const cell = document.createElement("span");
      cell.className = "nk-history-cell";

      if (value === null) {
        cell.classList.add("is-gap");
        cell.title = `${point.date || "—"}: — · ${text.status(point.data_status)}`;
      } else {
        const normalized = span === 0 ? 0.62 : (value - min) / span;
        cell.style.setProperty("--level", String(normalized));
        cell.title = `${point.date || "—"}: ${formatNumber(value)} · ${text.status(point.data_status)}`;
      }
      field.appendChild(cell);
    });

    document.getElementById("nk-history-start").textContent = points[0]?.date || "—";
    document.getElementById("nk-history-end").textContent = points.at(-1)?.date || "—";
  }

  function renderHistoryStats(analysis) {
    const stats = [
      [text.historyPoints, analysis.points.length],
      [text.numericPoints, analysis.numeric.length],
      [text.coverage, formatPercent(analysis.coverage)],
      [text.distinctValues, analysis.distinctCount],
      [text.changes, analysis.changes],
      [text.latestValue, formatNumber(analysis.latest)],
    ];
    const container = document.getElementById("nk-history-stats");
    container.replaceChildren();

    stats.forEach(([label, value]) => {
      const item = document.createElement("div");
      item.className = "nk-history-stat";
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

    document.getElementById("nk-history-count-label").textContent = text.pointsAvailable(analysis.points.length);
  }

  function renderHistoryTable(record) {
    const body = document.querySelector("#observer-history-table tbody");
    body.replaceChildren();
    const points = Array.isArray(record?.points) ? record.points : [];

    points.slice(-12).reverse().forEach(point => {
      const row = document.createElement("tr");
      row.innerHTML = `<td>${point.date || "—"}</td><td>${formatNumber(point.value)}</td><td>${text.status(point.data_status)}</td>`;
      body.appendChild(row);
    });
  }

  function renderEvidence(tcp, icmp, analysis) {
    document.getElementById("nk-observed-tcp").textContent = text.observedTcp(formatNumber(tcp));
    document.getElementById("nk-observed-icmp").textContent = text.observedIcmp(formatNumber(icmp));
    document.getElementById("nk-observed-history").textContent = text.observedHistory(analysis.points.length);
    document.getElementById("nk-derived-coverage").textContent = text.derivedCoverage(formatPercent(analysis.coverage));
    document.getElementById("nk-derived-distinct").textContent = text.derivedDistinct(analysis.distinctCount);
    document.getElementById("nk-derived-changes").textContent = text.derivedChanges(analysis.changes);
  }

  async function render() {
    const [dashboard, history] = await Promise.all([
      loadJson(dashboardUrl),
      loadJson(historyUrl),
    ]);

    const observer = (dashboard.observers || []).find(entry => entry.observer === observerId);
    if (!observer) throw new Error(`Observer not found: ${observerId}`);

    const tcp = numberOrNull(observer.primary_metric_value);
    const icmp = numberOrNull(observer.secondary_metrics?.["ICMP probes"]);
    const record = history?.observers?.[observerId] || null;
    const analysis = analyzeHistory(record);

    document.getElementById("nk-tcp-value").textContent = formatNumber(tcp);
    document.getElementById("nk-icmp-value").textContent = formatNumber(icmp);
    document.getElementById("nk-tcp-label").textContent = text.units(formatNumber(tcp));
    document.getElementById("nk-icmp-label").textContent = text.units(formatNumber(icmp));
    document.getElementById("observer-last-update").textContent = `${text.lastObservation}: ${formatDate(observer.last_seen_date)}`;

    renderProbeCells("nk-tcp-cells", tcp, "tcp");
    renderProbeCells("nk-icmp-cells", icmp, "icmp");
    renderHistoryField(analysis);
    renderHistoryStats(analysis);
    renderHistoryTable(record);
    renderEvidence(tcp, icmp, analysis);

    document.getElementById("observer-loading").hidden = true;
    document.getElementById("observer-content").hidden = false;
  }

  render().catch(error => {
    console.error("Unable to render North Korea Connectivity", error);
    document.getElementById("observer-loading").textContent = text.loadingError;
  });
})();
