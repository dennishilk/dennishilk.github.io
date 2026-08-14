(() => {
  "use strict";

  const OBSERVER_ID = "internet-shrinkage-index";
  const DASHBOARD_URL = "/world-observer/dashboard/internet.json";
  const HISTORY_URL = "/world-observer/dashboard/history/internet-observers.json";

  const isGerman = document.documentElement.lang.toLowerCase().startsWith("de");
  const text = isGerman ? {
    loadError: "Die veröffentlichten Observer-Daten konnten derzeit nicht geladen werden.",
    lastUpdate: "Letzte Beobachtung/Aktualisierung",
    points: "veröffentlichte Verlaufspunkte",
    partial: "PARTIELL",
    ok: "OK",
    unavailable: "NICHT VERFÜGBAR",
    seriesPeak: "Serienmaximum",
    relative: "relativ zur beobachteten Spannweite der aktuellen Serie",
    stats: {
      total: "VERLAUFSPUNKTE",
      current: "AKTUELLE SERIE",
      legacy: "LEGACY-PUNKTE",
      distinct: "UNTERSCHIEDLICHE WERTE",
      changes: "WERTÄNDERUNGEN",
      peak: "SERIENMAXIMUM"
    },
    historySummary: (currentCount, latest, peak) => `Die aktive Metrik-Serie enthält ${currentCount} vergleichbare numerische Punkte. Der letzte veröffentlichte Wert ist ${latest}; das beobachtete Maximum dieser Serie liegt bei ${peak}. Diese Werte beschreiben ausschließlich den Exportverlauf.`,
    breakCopy: (legacyCount, legacyNames, currentPath) => legacyCount > 0
      ? `${legacyCount} veröffentlichte Punkt${legacyCount === 1 ? "" : "e"} verwenden einen früheren Metrik-Pfad (${legacyNames.join(", ")}). Die aktuelle Reihe verwendet ${currentPath}. Die beiden Segmente werden nicht als direkt vergleichbare Messreihe skaliert.`
      : `Alle numerischen Verlaufspunkte verwenden den aktuellen Metrik-Pfad ${currentPath}.`,
    observedScore: value => `Aktuell veröffentlichter Schrumpfungs-Score: ${value}.`,
    observedCountries: value => `Veröffentlichte Anzahl ausgewerteter Länder: ${value}.`,
    observedHistory: total => `${total} veröffentlichte Verlaufspunkte mit Datum, Status und Metrik-Pfad.`,
    derivedPeak: value => `Beobachtetes Maximum innerhalb der aktuellen vergleichbaren Serie: ${value}.`,
    derivedDistinct: value => `${value} unterschiedliche numerische Werte innerhalb der aktuellen Serie.`,
    derivedChanges: value => `${value} aufeinanderfolgende Wertänderungen innerhalb der aktuellen Serie.`
  } : {
    loadError: "The published observer data are currently unavailable.",
    lastUpdate: "Last observation/update",
    points: "published history points",
    partial: "PARTIAL",
    ok: "OK",
    unavailable: "UNAVAILABLE",
    seriesPeak: "series peak",
    relative: "relative to current-series observed range",
    stats: {
      total: "HISTORY POINTS",
      current: "CURRENT SERIES",
      legacy: "LEGACY POINTS",
      distinct: "DISTINCT VALUES",
      changes: "VALUE CHANGES",
      peak: "SERIES PEAK"
    },
    historySummary: (currentCount, latest, peak) => `The active metric series contains ${currentCount} comparable numeric points. Its latest published value is ${latest}; the observed peak within that series is ${peak}. These values describe only the export history.`,
    breakCopy: (legacyCount, legacyNames, currentPath) => legacyCount > 0
      ? `${legacyCount} published point${legacyCount === 1 ? "" : "s"} use an earlier metric path (${legacyNames.join(", ")}). The active series uses ${currentPath}. The two segments are not scaled as one directly comparable measurement series.`
      : `All numeric history points use the current metric path ${currentPath}.`,
    observedScore: value => `Current published shrinkage score: ${value}.`,
    observedCountries: value => `Published countries-evaluated count: ${value}.`,
    observedHistory: total => `${total} published history points with date, status and metric path.`,
    derivedPeak: value => `Observed peak inside the active comparable series: ${value}.`,
    derivedDistinct: value => `${value} distinct numeric values inside the active series.`,
    derivedChanges: value => `${value} consecutive value changes inside the active series.`
  };

  const byId = id => document.getElementById(id);
  const numeric = value => typeof value === "number" && Number.isFinite(value);
  const formatValue = value => numeric(value) ? Number(value).toFixed(value === 0 || Number.isInteger(value) ? 1 : 2).replace(/\.0$/, ".0") : "—";
  const formatScore = value => numeric(value) ? Number(value).toFixed(2) : "—";
  const statusLabel = status => {
    if (status === "ok") return text.ok;
    if (status === "partial") return text.partial;
    return text.unavailable;
  };

  function countChanges(values) {
    let changes = 0;
    for (let i = 1; i < values.length; i += 1) {
      if (values[i] !== values[i - 1]) changes += 1;
    }
    return changes;
  }

  function renderCountries(count) {
    const host = byId("shrink-country-dots");
    host.replaceChildren();
    const safeCount = Math.max(0, Math.min(80, Number.isFinite(Number(count)) ? Number(count) : 0));
    for (let i = 0; i < safeCount; i += 1) {
      host.appendChild(document.createElement("i"));
    }
  }

  function renderStats(stats) {
    const host = byId("shrink-history-stats");
    host.replaceChildren();
    const entries = [
      [text.stats.total, stats.total],
      [text.stats.current, stats.currentCount],
      [text.stats.legacy, stats.legacyCount],
      [text.stats.distinct, stats.distinct],
      [text.stats.changes, stats.changes],
      [text.stats.peak, formatScore(stats.peak)]
    ];
    entries.forEach(([label, value]) => {
      const row = document.createElement("div");
      const span = document.createElement("span");
      const strong = document.createElement("strong");
      span.textContent = label;
      strong.textContent = String(value);
      row.append(span, strong);
      host.appendChild(row);
    });
  }

  function renderHistoryField(points, currentPath, peak) {
    const host = byId("shrink-history-field");
    host.replaceChildren();
    let breakInserted = false;

    points.forEach(point => {
      const bar = document.createElement("i");
      bar.className = "shrink-history-bar";
      bar.dataset.status = point.data_status || "unknown";
      const isCurrent = point.metric_name === currentPath;
      if (!isCurrent) {
        bar.classList.add("is-legacy");
        bar.style.setProperty("--bar-height", "100%");
      } else {
        if (!breakInserted) {
          bar.classList.add("is-break");
          breakInserted = true;
        }
        const ratio = numeric(point.value) && peak > 0 ? Math.max(0, Math.min(1, point.value / peak)) : 0;
        bar.style.setProperty("--bar-height", `${Math.max(4, ratio * 100)}%`);
      }
      bar.title = `${point.date || "—"} · ${numeric(point.value) ? point.value : "—"} · ${point.metric_name || "no metric"}`;
      host.appendChild(bar);
    });
  }

  function renderRecentTable(points) {
    const tbody = byId("observer-history-table").querySelector("tbody");
    tbody.replaceChildren();
    points.slice(-14).reverse().forEach(point => {
      const row = document.createElement("tr");
      const values = [
        point.date || "—",
        numeric(point.value) ? String(point.value) : "—",
        point.metric_name || "—",
        point.data_status || "—"
      ];
      values.forEach(value => {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.appendChild(cell);
      });
      tbody.appendChild(row);
    });
  }

  function render(dashboard, history) {
    const observer = dashboard.observers?.find(item => item.observer === OBSERVER_ID);
    const historyObserver = history.observers?.[OBSERVER_ID];
    if (!observer || !historyObserver) throw new Error("observer export missing");

    const currentValue = Number(observer.primary_metric_value);
    const currentPath = observer.primary_metric_path || "global.global_shrinkage_index";
    const countryCount = Number(observer.secondary_metrics?.["Countries evaluated"]);
    const points = Array.isArray(historyObserver.points) ? historyObserver.points : [];
    const numericPoints = points.filter(point => numeric(point.value));
    const currentPoints = numericPoints.filter(point => point.metric_name === currentPath);
    const legacyPoints = numericPoints.filter(point => point.metric_name && point.metric_name !== currentPath);
    const currentValues = currentPoints.map(point => point.value);
    const peak = currentValues.length ? Math.max(...currentValues) : 0;
    const latest = currentValues.length ? currentValues[currentValues.length - 1] : currentValue;
    const distinct = new Set(currentValues.map(value => String(value))).size;
    const changes = countChanges(currentValues);
    const legacyNames = [...new Set(legacyPoints.map(point => point.metric_name))];

    byId("shrink-current-value").textContent = formatScore(currentValue);
    byId("shrink-aperture-value").textContent = formatScore(currentValue);
    byId("shrink-country-count").textContent = Number.isFinite(countryCount) ? String(countryCount) : "—";
    byId("shrink-status").textContent = statusLabel(observer.data_status || observer.status);
    byId("observer-last-update").textContent = `${text.lastUpdate}: ${observer.last_seen_date || "—"}`;
    byId("shrink-metric-path").textContent = currentPath;
    byId("shrink-relative-label").textContent = text.relative;
    byId("shrink-series-peak-label").textContent = `${text.seriesPeak} ${formatScore(peak)}`;
    byId("shrink-history-count-label").textContent = `${points.length} ${text.points}`;
    byId("shrink-history-start").textContent = points[0]?.date || "—";
    byId("shrink-history-end").textContent = points.at(-1)?.date || "—";

    const normalized = peak > 0 && Number.isFinite(currentValue) ? Math.max(0, Math.min(1, currentValue / peak)) : 0;
    byId("shrink-aperture").style.setProperty("--compression", `${normalized * 38}%`);
    renderCountries(countryCount);
    renderHistoryField(points, currentPath, peak);
    renderRecentTable(points);
    renderStats({
      total: points.length,
      currentCount: currentPoints.length,
      legacyCount: legacyPoints.length,
      distinct,
      changes,
      peak
    });

    byId("observer-history-summary").textContent = text.historySummary(currentPoints.length, formatScore(latest), formatScore(peak));
    byId("shrink-break-copy").textContent = text.breakCopy(legacyPoints.length, legacyNames, currentPath);
    byId("shrink-observed-score").textContent = text.observedScore(formatScore(currentValue));
    byId("shrink-observed-countries").textContent = text.observedCountries(Number.isFinite(countryCount) ? countryCount : "—");
    byId("shrink-observed-history").textContent = text.observedHistory(points.length);
    byId("shrink-derived-peak").textContent = text.derivedPeak(formatScore(peak));
    byId("shrink-derived-distinct").textContent = text.derivedDistinct(distinct);
    byId("shrink-derived-changes").textContent = text.derivedChanges(changes);

    byId("observer-loading").hidden = true;
    byId("observer-content").hidden = false;
  }

  Promise.all([
    fetch(DASHBOARD_URL, { cache: "no-store" }).then(response => {
      if (!response.ok) throw new Error(`dashboard ${response.status}`);
      return response.json();
    }),
    fetch(HISTORY_URL, { cache: "no-store" }).then(response => {
      if (!response.ok) throw new Error(`history ${response.status}`);
      return response.json();
    })
  ]).then(([dashboard, history]) => render(dashboard, history)).catch(() => {
    byId("observer-loading").textContent = text.loadError;
  });
})();
