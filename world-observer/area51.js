(function () {
  "use strict";

  const observerId = "area51-reachability";
  const dashboardUrl = "/world-observer/dashboard/internet.json";
  const historyUrl = "/world-observer/dashboard/history/internet-observers.json";
  const svgNamespace = "http://www.w3.org/2000/svg";

  function formatNumber(value) {
    if (value === null || value === undefined || value === "") return "—";
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return String(value);
    return new Intl.NumberFormat("en", {
      maximumFractionDigits: Number.isInteger(numeric) ? 0 : 2,
    }).format(numeric);
  }

  function formatMetric(value, unit) {
    const formatted = formatNumber(value);
    const normalizedUnit = String(unit || "").toLowerCase();
    if (formatted === "—" || !unit || normalizedUnit === "count" || normalizedUnit === "score") {
      return formatted;
    }
    return `${formatted} ${unit}`;
  }

  function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);

    const options = {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    };
    if (String(value).includes("T")) {
      options.hour = "2-digit";
      options.minute = "2-digit";
      options.hour12 = false;
    }

    return `${new Intl.DateTimeFormat("en-GB", options).format(date)} UTC`;
  }

  function createElement(tagName, className, text) {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function createSvgElement(tagName, attributes = {}) {
    const element = document.createElementNS(svgNamespace, tagName);
    Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, String(value)));
    return element;
  }

  function appendMetric(container, label, value, unit) {
    const group = createElement("div");
    const term = createElement("dt", "", label);
    const unitLabel = createElement("small", "", String(unit || "exported value").toUpperCase());
    const description = createElement("dd", "", formatMetric(value, unit));
    term.appendChild(unitLabel);
    group.append(term, description);
    container.appendChild(group);
  }

  function appendHistoryMetric(container, label, value) {
    const group = createElement("div");
    group.append(
      createElement("dt", "", label),
      createElement("dd", "", value),
    );
    container.appendChild(group);
  }

  function renderCurrentObservation(observer) {
    document.getElementById("observer-primary-label").textContent =
      observer.primary_metric_name || "Primary metric";
    document.getElementById("observer-primary-value").textContent =
      formatMetric(observer.primary_metric_value, observer.primary_metric_unit);
    document.getElementById("observer-primary-unit").textContent =
      `${String(observer.primary_metric_unit || "value").toUpperCase()} / EXPORTED VALUE`;
    document.getElementById("observer-last-update").textContent =
      `Last observation/update: ${formatDate(observer.last_seen_date)}`;

    const metrics = document.getElementById("observer-secondary-metrics");
    metrics.textContent = "";
    const entries = Object.entries(observer.secondary_metrics || {});

    if (!entries.length) {
      appendMetric(metrics, "Secondary metrics", null, "");
    } else {
      entries.forEach(([label, value]) => {
        appendMetric(metrics, label, value, observer.secondary_metric_units?.[label]);
      });
    }

    const observedList = document.getElementById("area51-observed-list");
    observedList.textContent = "";
    entries.forEach(([label, value]) => {
      const unit = observer.secondary_metric_units?.[label];
      observedList.appendChild(createElement("li", "", `${label}: ${formatMetric(value, unit)}.`));
    });
    observedList.appendChild(
      createElement("li", "", `Latest exported observation: ${formatDate(observer.last_seen_date)}.`),
    );

    document.getElementById("area51-derived-copy").textContent =
      `The existing export publishes “${observer.primary_metric_name || "Primary metric"}” as ${formatMetric(observer.primary_metric_value, observer.primary_metric_unit)}. This page displays that supplied value without adding a new calculation or causal interpretation.`;
  }

  function splitNumericSegments(points) {
    const segments = [];
    let current = [];

    points.forEach((point, index) => {
      const value = Number(point?.value);
      if (Number.isFinite(value)) {
        current.push({ ...point, index, numericValue: value });
        return;
      }
      if (current.length) segments.push(current);
      current = [];
    });

    if (current.length) segments.push(current);
    return segments;
  }

  function niceStep(rawStep) {
    if (!Number.isFinite(rawStep) || rawStep <= 0) return 1;
    const magnitude = 10 ** Math.floor(Math.log10(rawStep));
    const normalized = rawStep / magnitude;
    const factor = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
    return factor * magnitude;
  }

  function buildAxisScale(values) {
    const rawMinimum = Math.min(0, ...values);
    const rawMaximum = Math.max(0, ...values);
    const rawRange = rawMaximum - rawMinimum || 1;
    const step = niceStep(rawRange / 4);
    const minimum = Math.floor(rawMinimum / step) * step;
    let maximum = Math.ceil(rawMaximum / step) * step;
    if (maximum === minimum) maximum = minimum + step;
    const tickCount = Math.max(1, Math.round((maximum - minimum) / step));
    return { minimum, maximum, step, tickCount };
  }

  function renderHistoryChart(record) {
    const container = document.getElementById("area51-history-chart");
    container.textContent = "";

    const points = Array.isArray(record?.points) ? record.points : [];
    const segments = splitNumericSegments(points);
    const numericPoints = segments.flat();

    if (!points.length || !numericPoints.length) {
      container.appendChild(
        createElement("p", "area51-chart-empty", "No published numeric history is available yet."),
      );
      return;
    }

    const width = 800;
    const height = 360;
    const margin = { top: 22, right: 24, bottom: 52, left: 78 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const values = numericPoints.map((point) => point.numericValue);
    const axis = buildAxisScale(values);
    const range = axis.maximum - axis.minimum || axis.step;
    const denominator = Math.max(points.length - 1, 1);
    const x = (index) => margin.left + (index / denominator) * plotWidth;
    const y = (value) => margin.top + (1 - ((value - axis.minimum) / range)) * plotHeight;

    const svg = createSvgElement("svg", {
      viewBox: `0 0 ${width} ${height}`,
      role: "img",
      "aria-labelledby": "area51-chart-title area51-chart-description",
    });

    const title = createSvgElement("title", { id: "area51-chart-title" });
    title.textContent = "Area51 Reachability published observation history";
    const description = createSvgElement("desc", { id: "area51-chart-description" });
    description.textContent =
      `${numericPoints.length} numeric values across ${points.length} published history points, from ${points[0]?.date || "the first observation"} to ${points.at(-1)?.date || "the latest observation"}. Missing numeric points appear as gaps.`;
    svg.append(title, description);

    const definitions = createSvgElement("defs");
    const gradient = createSvgElement("linearGradient", {
      id: "area51-history-fill",
      x1: "0",
      x2: "0",
      y1: "0",
      y2: "1",
    });
    const start = createSvgElement("stop", {
      offset: "0%",
      "stop-color": "#5be3ff",
      "stop-opacity": "0.28",
    });
    const end = createSvgElement("stop", {
      offset: "100%",
      "stop-color": "#5be3ff",
      "stop-opacity": "0",
    });
    gradient.append(start, end);
    definitions.appendChild(gradient);
    svg.appendChild(definitions);

    for (let tick = 0; tick <= axis.tickCount; tick += 1) {
      const ratio = tick / axis.tickCount;
      const lineY = margin.top + ratio * plotHeight;
      const value = axis.maximum - tick * axis.step;
      svg.appendChild(createSvgElement("line", {
        class: "area51-chart-grid",
        x1: margin.left,
        x2: width - margin.right,
        y1: lineY,
        y2: lineY,
      }));

      const label = createSvgElement("text", {
        class: "area51-chart-axis-label",
        x: margin.left - 12,
        y: lineY + 6,
        "text-anchor": "end",
      });
      label.textContent = formatNumber(value);
      svg.appendChild(label);
    }

    segments.forEach((segment) => {
      const coordinates = segment.map((point) => [x(point.index), y(point.numericValue)]);
      if (coordinates.length > 1) {
        const linePath = coordinates
          .map(([pointX, pointY], index) => `${index === 0 ? "M" : "L"} ${pointX.toFixed(2)} ${pointY.toFixed(2)}`)
          .join(" ");
        const areaPath = [
          `M ${coordinates[0][0].toFixed(2)} ${(margin.top + plotHeight).toFixed(2)}`,
          ...coordinates.map(([pointX, pointY]) => `L ${pointX.toFixed(2)} ${pointY.toFixed(2)}`),
          `L ${coordinates.at(-1)[0].toFixed(2)} ${(margin.top + plotHeight).toFixed(2)} Z`,
        ].join(" ");

        svg.appendChild(createSvgElement("path", {
          class: "area51-chart-area",
          d: areaPath,
        }));
        svg.appendChild(createSvgElement("path", {
          class: "area51-chart-line",
          d: linePath,
        }));
      }
    });

    numericPoints.forEach((point, numericIndex) => {
      if (numericIndex % 7 !== 0 && numericIndex !== numericPoints.length - 1) return;
      const isLatest = numericIndex === numericPoints.length - 1;
      const circle = createSvgElement("circle", {
        class: isLatest ? "area51-chart-latest" : "area51-chart-point",
        cx: x(point.index),
        cy: y(point.numericValue),
        r: isLatest ? 6 : 3,
      });
      const pointTitle = createSvgElement("title");
      pointTitle.textContent = `${point.date || "Observation"}: ${formatMetric(point.numericValue, point.metric_unit || record.metric_unit)}`;
      circle.appendChild(pointTitle);
      svg.appendChild(circle);
    });

    const dateLabels = [
      [points[0]?.date, margin.left, "start"],
      [points.at(-1)?.date, width - margin.right, "end"],
    ];
    dateLabels.forEach(([date, labelX, anchor]) => {
      const label = createSvgElement("text", {
        class: "area51-chart-axis-label",
        x: labelX,
        y: height - 14,
        "text-anchor": anchor,
      });
      label.textContent = date || "—";
      svg.appendChild(label);
    });

    container.appendChild(svg);
  }

  function renderHistoryTable(record) {
    const body = document.querySelector("#observer-history-table tbody");
    const details = document.querySelector(".area51-data-table");
    body.textContent = "";

    const numericPoints = (Array.isArray(record?.points) ? record.points : [])
      .filter((point) => Number.isFinite(Number(point?.value)));

    if (!numericPoints.length) {
      details.hidden = true;
      return;
    }

    details.hidden = false;
    numericPoints.slice(-12).reverse().forEach((point) => {
      const row = document.createElement("tr");
      const date = createElement("td", "", point.date || "—");
      const value = createElement(
        "td",
        "",
        formatMetric(Number(point.value), point.metric_unit || record.metric_unit),
      );
      row.append(date, value);
      body.appendChild(row);
    });
  }

  function renderHistory(record) {
    const points = Array.isArray(record?.points) ? record.points : [];
    const numericPoints = points.filter((point) => Number.isFinite(Number(point?.value)));
    const summary = document.getElementById("observer-history-summary");
    const metrics = document.getElementById("area51-history-metrics");
    metrics.textContent = "";

    if (!record || !points.length) {
      summary.textContent = "No published history is available for this observer yet.";
      document.getElementById("area51-historical-copy").textContent =
        "No published history is available in the existing export yet.";
      renderHistoryChart(null);
      renderHistoryTable(null);
      return;
    }

    const totalCount = Number.isFinite(Number(record.total_point_count))
      ? Number(record.total_point_count)
      : points.length;
    const numericCount = Number.isFinite(Number(record.numeric_point_count))
      ? Number(record.numeric_point_count)
      : numericPoints.length;
    const latest = record.latest_value ?? numericPoints.at(-1)?.value;
    const previous = record.previous_value ?? numericPoints.at(-2)?.value;
    const unit = record.metric_unit || numericPoints.at(-1)?.metric_unit || "score";

    summary.textContent =
      `${formatNumber(totalCount)} published points / ${formatNumber(numericCount)} numeric values`;

    appendHistoryMetric(metrics, "Latest", formatMetric(latest, unit));
    appendHistoryMetric(metrics, "Previous", formatMetric(previous, unit));
    appendHistoryMetric(metrics, "7-day average", formatMetric(record.seven_day_average, unit));
    appendHistoryMetric(metrics, "30-day average", formatMetric(record.thirty_day_average, unit));

    if (Number.isFinite(Number(record.delta))) {
      const direction = String(record.direction || "").toLowerCase();
      const arrow = direction === "up" ? "↑" : direction === "down" ? "↓" : "→";
      appendHistoryMetric(metrics, "Latest delta", `${arrow} ${formatMetric(Math.abs(Number(record.delta)), unit)}`);
    }

    const firstDate = points[0]?.date || "the first published observation";
    const lastDate = points.at(-1)?.date || "the latest published observation";
    document.getElementById("area51-historical-copy").textContent =
      `${formatNumber(totalCount)} published history points span ${firstDate} to ${lastDate}; ${formatNumber(numericCount)} contain numeric values. They are displayed without a causal interpretation.`;

    renderHistoryChart(record);
    renderHistoryTable(record);
  }

  async function loadJson(url) {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
    return response.json();
  }

  async function render() {
    const [dashboardResult, historyResult] = await Promise.allSettled([
      loadJson(dashboardUrl),
      loadJson(historyUrl),
    ]);

    if (dashboardResult.status !== "fulfilled") throw dashboardResult.reason;

    const observer = (dashboardResult.value.observers || [])
      .find((entry) => entry.observer === observerId);
    if (!observer) throw new Error(`Observer not found: ${observerId}`);

    renderCurrentObservation(observer);

    const history = historyResult.status === "fulfilled"
      ? historyResult.value?.observers?.[observerId]
      : null;
    renderHistory(history);

    document.getElementById("observer-loading").hidden = true;
    document.getElementById("observer-content").hidden = false;
    document.body.dataset.telemetryReady = "true";
  }

  render().catch((error) => {
    console.error("Unable to render Area51 observer", error);
    const loading = document.getElementById("observer-loading");
    loading.textContent = "Public observer data is not available yet.";
  });
}());
