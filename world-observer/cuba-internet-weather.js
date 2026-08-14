(() => {
  "use strict";

  const OBSERVER_ID = "cuba-internet-weather";
  const DASHBOARD_URL = "/world-observer/dashboard/internet.json";
  const HISTORY_URL = "/world-observer/dashboard/history/internet-observers.json";
  const isGerman = document.documentElement.lang.toLowerCase().startsWith("de");
  const locale = isGerman ? "de-DE" : "en-US";

  const loading = document.getElementById("observer-loading");
  const content = document.getElementById("observer-content");
  const currentValue = document.getElementById("cuba-current-value");
  const currentRepeat = document.getElementById("cuba-current-repeat");
  const currentStatus = document.getElementById("cuba-status");
  const lastUpdate = document.getElementById("observer-last-update");
  const needle = document.getElementById("cuba-needle");
  const rangeMin = document.getElementById("cuba-range-min");
  const rangeMax = document.getElementById("cuba-range-max");
  const relativePosition = document.getElementById("cuba-relative-position");
  const avg7 = document.getElementById("cuba-avg-7");
  const avg30 = document.getElementById("cuba-avg-30");
  const avg90 = document.getElementById("cuba-avg-90");
  const historyCountLabel = document.getElementById("cuba-history-count-label");
  const historyStart = document.getElementById("cuba-history-start");
  const historyEnd = document.getElementById("cuba-history-end");
  const historyPlot = document.getElementById("cuba-history-plot");
  const historySummary = document.getElementById("observer-history-summary");
  const historyStats = document.getElementById("cuba-history-stats");
  const historyTable = document.getElementById("observer-history-table");
  const observedCurrent = document.getElementById("cuba-observed-current");
  const observedHistory = document.getElementById("cuba-observed-history");
  const observedStatus = document.getElementById("cuba-observed-status");
  const derivedMedian = document.getElementById("cuba-derived-median");
  const derivedPosition = document.getElementById("cuba-derived-position");
  const derivedUpper = document.getElementById("cuba-derived-upper");

  function number(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function formatNumber(value, digits = 2) {
    if (!Number.isFinite(value)) return "—";
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value);
  }

  function formatDate(value) {
    if (!value) return "—";
    const simple = /^\d{4}-\d{2}-\d{2}$/.test(value);
    const date = new Date(simple ? `${value}T00:00:00Z` : value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: "UTC",
    }).format(date);
  }

  function quantile(sorted, q) {
    if (!sorted.length) return null;
    if (sorted.length === 1) return sorted[0];
    const index = (sorted.length - 1) * q;
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) return sorted[lower];
    const weight = index - lower;
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  function average(values) {
    if (!values.length) return null;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  function windowAverage(history, numericPoints, key, fallbackCount) {
    const exported = number(history?.windows?.[key]?.avg);
    if (exported !== null) return exported;
    return average(numericPoints.slice(-fallbackCount).map(point => point.numericValue));
  }

  function createSvgElement(name, attributes = {}) {
    const node = document.createElementNS("http://www.w3.org/2000/svg", name);
    Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, String(value)));
    return node;
  }

  function renderPlot(points, stats) {
    historyPlot.replaceChildren();
    if (!points.length) return;

    const width = 1000;
    const height = 300;
    const left = 38;
    const right = 18;
    const top = 20;
    const bottom = 28;
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;
    const spread = stats.max - stats.min;
    const padding = spread > 0 ? spread * 0.08 : Math.max(1, stats.max * 0.08);
    const domainMin = stats.min - padding;
    const domainMax = stats.max + padding;
    const domainSpread = Math.max(0.0001, domainMax - domainMin);

    const x = index => left + (points.length === 1 ? plotWidth / 2 : (index / (points.length - 1)) * plotWidth);
    const y = value => top + ((domainMax - value) / domainSpread) * plotHeight;

    const svg = createSvgElement("svg", {
      viewBox: `0 0 ${width} ${height}`,
      role: "img",
      "aria-label": isGerman
        ? "Veröffentlichter Verlauf der durchschnittlichen Ping-Latenz"
        : "Published average ping-latency history",
      preserveAspectRatio: "none",
    });

    const defs = createSvgElement("defs");
    const gradient = createSvgElement("linearGradient", { id: "cubaHistoryFill", x1: "0", y1: "0", x2: "0", y2: "1" });
    gradient.append(
      createSvgElement("stop", { offset: "0%", "stop-color": "#52e8f2", "stop-opacity": "0.18" }),
      createSvgElement("stop", { offset: "100%", "stop-color": "#52e8f2", "stop-opacity": "0.01" }),
    );
    defs.append(gradient);
    svg.append(defs);

    for (let step = 0; step <= 4; step += 1) {
      const gridY = top + (plotHeight / 4) * step;
      svg.append(createSvgElement("line", { x1: left, y1: gridY, x2: width - right, y2: gridY, class: "cuba-chart-grid" }));
      const labelValue = domainMax - ((domainSpread / 4) * step);
      const label = createSvgElement("text", { x: 2, y: gridY + 4, class: "cuba-axis-label" });
      label.textContent = formatNumber(labelValue, 0);
      svg.append(label);
    }

    const q3Y = y(stats.q3);
    const q1Y = y(stats.q1);
    svg.append(createSvgElement("rect", {
      x: left,
      y: Math.min(q3Y, q1Y),
      width: plotWidth,
      height: Math.max(1, Math.abs(q1Y - q3Y)),
      class: "cuba-iqr-band",
    }));

    const pathParts = points.map((point, index) => `${index === 0 ? "M" : "L"}${x(index).toFixed(2)},${y(point.numericValue).toFixed(2)}`);
    const baseline = height - bottom;
    const fillPath = `${pathParts.join(" ")} L${x(points.length - 1).toFixed(2)},${baseline} L${x(0).toFixed(2)},${baseline} Z`;
    svg.append(createSvgElement("path", { d: fillPath, class: "cuba-history-fill" }));
    svg.append(createSvgElement("path", { d: pathParts.join(" "), class: "cuba-history-line" }));

    points.forEach((point, index) => {
      if (point.numericValue >= stats.q90) {
        const circle = createSvgElement("circle", {
          cx: x(index),
          cy: y(point.numericValue),
          r: 3.3,
          class: "cuba-upper-point",
        });
        const title = createSvgElement("title");
        title.textContent = `${point.date}: ${formatNumber(point.numericValue)} ms`;
        circle.append(title);
        svg.append(circle);
      }
    });

    const lastIndex = points.length - 1;
    svg.append(createSvgElement("circle", {
      cx: x(lastIndex),
      cy: y(points[lastIndex].numericValue),
      r: 4.3,
      class: "cuba-latest-point",
    }));

    historyPlot.append(svg);
  }

  function addStat(label, value, suffix = "") {
    const block = document.createElement("div");
    const labelNode = document.createElement("span");
    const valueNode = document.createElement("strong");
    const suffixNode = document.createElement("small");
    labelNode.textContent = label;
    valueNode.textContent = value;
    suffixNode.textContent = suffix;
    block.append(labelNode, valueNode, suffixNode);
    historyStats.append(block);
  }

  function renderTable(points) {
    const tbody = historyTable.querySelector("tbody");
    tbody.replaceChildren();
    points.slice(-20).reverse().forEach(point => {
      const row = document.createElement("tr");
      const dateCell = document.createElement("td");
      const valueCell = document.createElement("td");
      const statusCell = document.createElement("td");
      dateCell.textContent = formatDate(point.date);
      valueCell.textContent = point.numericValue === null ? "—" : `${formatNumber(point.numericValue)} ms`;
      statusCell.textContent = point.data_status || "—";
      row.append(dateCell, valueCell, statusCell);
      tbody.append(row);
    });
  }

  function render(dashboard, historyRoot) {
    const observer = dashboard?.observers?.find(item => item.observer === OBSERVER_ID);
    const history = historyRoot?.observers?.[OBSERVER_ID];
    if (!observer || !history) throw new Error("Cuba observer export missing");

    const allPoints = Array.isArray(history.points) ? history.points.map(point => ({
      ...point,
      numericValue: number(point.value),
    })) : [];
    const numericPoints = allPoints.filter(point => point.numericValue !== null);
    if (!numericPoints.length) throw new Error("Cuba latency history has no numeric points");

    const values = numericPoints.map(point => point.numericValue);
    const sorted = [...values].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const q1 = quantile(sorted, 0.25);
    const median = quantile(sorted, 0.5);
    const q3 = quantile(sorted, 0.75);
    const q90 = quantile(sorted, 0.9);
    const iqr = q3 - q1;
    const current = number(observer.primary_metric_value) ?? number(history.latest_value) ?? values[values.length - 1];
    const rangeSpan = Math.max(0.0001, max - min);
    const rawPosition = (current - min) / rangeSpan;
    const position = Math.max(0, Math.min(1, rawPosition));
    const positionPercent = position * 100;
    const needleAngle = -70 + position * 140;
    const mean7 = windowAverage(history, numericPoints, "7d", 7);
    const mean30 = windowAverage(history, numericPoints, "30d", 30);
    const mean90 = windowAverage(history, numericPoints, "90d", 90);

    currentValue.textContent = formatNumber(current);
    currentRepeat.textContent = `${formatNumber(current)} ms`;
    currentStatus.textContent = String(observer.data_status || observer.status || "unknown").toUpperCase();
    rangeMin.textContent = formatNumber(min, 0);
    rangeMax.textContent = formatNumber(max, 0);
    relativePosition.textContent = isGerman
      ? `${formatNumber(positionPercent, 1)} % des beobachteten numerischen Bereichs`
      : `${formatNumber(positionPercent, 1)}% through the observed numeric range`;
    needle.style.transform = `translateX(-50%) rotate(${needleAngle.toFixed(2)}deg)`;
    avg7.textContent = formatNumber(mean7);
    avg30.textContent = formatNumber(mean30);
    avg90.textContent = formatNumber(mean90);

    lastUpdate.textContent = isGerman
      ? `Letzte Beobachtung/Aktualisierung: ${formatDate(observer.last_seen_date)}`
      : `Last observation/update: ${formatDate(observer.last_seen_date)}`;

    historyCountLabel.textContent = isGerman
      ? `${allPoints.length} veröffentlichte Latenzpunkte`
      : `${allPoints.length} published latency points`;
    historyStart.textContent = formatDate(allPoints[0]?.date);
    historyEnd.textContent = formatDate(allPoints[allPoints.length - 1]?.date);

    renderPlot(numericPoints, { min, max, q1, q3, q90 });

    historyStats.replaceChildren();
    if (isGerman) {
      addStat("Verlaufspunkte", String(allPoints.length));
      addStat("Minimum", formatNumber(min), "ms");
      addStat("Median", formatNumber(median), "ms");
      addStat("Maximum", formatNumber(max), "ms");
      addStat("Interquartilsabstand", formatNumber(iqr), "ms");
      addStat("Aktuelle Bereichsposition", formatNumber(positionPercent, 1), "%");
    } else {
      addStat("History points", String(allPoints.length));
      addStat("Minimum", formatNumber(min), "ms");
      addStat("Median", formatNumber(median), "ms");
      addStat("Maximum", formatNumber(max), "ms");
      addStat("Interquartile range", formatNumber(iqr), "ms");
      addStat("Current range position", formatNumber(positionPercent, 1), "%");
    }

    const upperCount = numericPoints.filter(point => point.numericValue >= q90).length;
    historySummary.textContent = isGerman
      ? `${numericPoints.length} numerische Verlaufspunkte reichen von ${formatNumber(min)} bis ${formatNumber(max)} ms. Der Median liegt bei ${formatNumber(median)} ms; ${upperCount} Punkte liegen im berechneten oberen Dezil. Diese Werte beschreiben ausschließlich die veröffentlichte Messreihe.`
      : `${numericPoints.length} numeric history points range from ${formatNumber(min)} to ${formatNumber(max)} ms. The median is ${formatNumber(median)} ms; ${upperCount} points fall in the calculated upper decile. These figures describe only the published measurement series.`;

    observedCurrent.textContent = isGerman
      ? `Aktuell veröffentlichte durchschnittliche Ping-Zeit: ${formatNumber(current)} ms.`
      : `Current published average ping time: ${formatNumber(current)} ms.`;
    observedHistory.textContent = isGerman
      ? `${allPoints.length} veröffentlichte Verlaufspunkte; davon ${numericPoints.length} numerisch.`
      : `${allPoints.length} published history points; ${numericPoints.length} are numeric.`;
    observedStatus.textContent = isGerman
      ? `Exportstatus: ${String(observer.data_status || observer.status || "unknown")}; letzte Beobachtung: ${formatDate(observer.last_seen_date)}.`
      : `Export status: ${String(observer.data_status || observer.status || "unknown")}; last observation: ${formatDate(observer.last_seen_date)}.`;
    derivedMedian.textContent = isGerman
      ? `Median ${formatNumber(median)} ms; Interquartilsabstand ${formatNumber(iqr)} ms, aus numerischen Verlaufspunkten berechnet.`
      : `Median ${formatNumber(median)} ms; interquartile range ${formatNumber(iqr)} ms, calculated from numeric history points.`;
    derivedPosition.textContent = isGerman
      ? `Aktueller Wert liegt bei ${formatNumber(positionPercent, 1)} % des beobachteten numerischen Min-Max-Bereichs.`
      : `Current value sits ${formatNumber(positionPercent, 1)}% through the observed numeric min-max range.`;
    derivedUpper.textContent = isGerman
      ? `Schwelle des oberen Dezils: ${formatNumber(q90)} ms; ${upperCount} veröffentlichte Punkte erreichen oder überschreiten sie.`
      : `Upper-decile threshold: ${formatNumber(q90)} ms; ${upperCount} published points meet or exceed it.`;

    renderTable(allPoints);
    loading.hidden = true;
    content.hidden = false;
  }

  Promise.all([
    fetch(DASHBOARD_URL, { cache: "no-store" }).then(response => {
      if (!response.ok) throw new Error(`Dashboard export ${response.status}`);
      return response.json();
    }),
    fetch(HISTORY_URL, { cache: "no-store" }).then(response => {
      if (!response.ok) throw new Error(`History export ${response.status}`);
      return response.json();
    }),
  ]).then(([dashboard, history]) => render(dashboard, history)).catch(() => {
    loading.dataset.state = "error";
    loading.textContent = isGerman
      ? "Öffentliche Observer-Daten sind derzeit nicht verfügbar. Es werden keine Ersatzwerte erfunden."
      : "Public observer data is currently unavailable. No substitute values are invented.";
    content.hidden = true;
  });
})();
