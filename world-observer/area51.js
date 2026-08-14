(function () {
  "use strict";

  const observerId = "area51-reachability";
  const dashboardUrl = "/world-observer/dashboard/internet.json";
  const historyUrl = "/world-observer/dashboard/history/internet-observers.json";

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

  function median(values) {
    if (!values.length) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    if (sorted.length % 2) return sorted[middle];
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  function renderObservationPulse(record) {
    const grid = document.getElementById("area51-pulse-grid");
    const peaks = document.getElementById("area51-peak-list");
    grid.textContent = "";
    peaks.textContent = "";

    const points = Array.isArray(record?.points) ? record.points : [];
    const numericPoints = points
      .map((point, index) => ({ ...point, index, numericValue: Number(point?.value) }))
      .filter((point) => Number.isFinite(point.numericValue));

    document.getElementById("area51-pulse-start").textContent = points[0]?.date || "—";
    document.getElementById("area51-pulse-end").textContent = points.at(-1)?.date || "—";

    if (!points.length || !numericPoints.length) {
      grid.appendChild(createElement("p", "area51-chart-empty", "No published numeric history is available yet."));
      return;
    }

    const maximum = Math.max(...numericPoints.map((point) => Math.max(0, point.numericValue)), 1);
    const logMaximum = Math.log1p(maximum) || 1;

    points.forEach((point, index) => {
      const numeric = Number(point?.value);
      const hasNumeric = Number.isFinite(numeric);
      const status = String(point?.data_status || "unknown").toLowerCase();
      const cell = createElement("span", "area51-pulse-cell");
      cell.dataset.status = status;
      cell.setAttribute("role", "listitem");

      if (hasNumeric) {
        const normalized = Math.log1p(Math.max(0, numeric)) / logMaximum;
        cell.style.setProperty("--pulse", Math.max(0.08, normalized).toFixed(3));
      } else {
        cell.classList.add("is-missing");
      }

      if (index === points.length - 1) cell.classList.add("is-latest");

      const valueLabel = hasNumeric
        ? formatMetric(numeric, point.metric_unit || record?.metric_unit)
        : "no numeric value";
      const accessibleLabel = `${point.date || "Observation"}: ${valueLabel}; status ${status}`;
      cell.title = accessibleLabel;
      cell.setAttribute("aria-label", accessibleLabel);
      grid.appendChild(cell);
    });

    [...numericPoints]
      .sort((a, b) => b.numericValue - a.numericValue)
      .slice(0, 5)
      .forEach((point, index) => {
        const item = document.createElement("li");
        item.append(
          createElement("span", "area51-peak-rank", `#${index + 1}`),
          createElement("time", "area51-peak-date", point.date || "—"),
          createElement("strong", "area51-peak-value", formatMetric(point.numericValue, point.metric_unit || record?.metric_unit)),
        );
        peaks.appendChild(item);
      });
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
    const numericValues = numericPoints.map((point) => Number(point.value));
    const summary = document.getElementById("observer-history-summary");
    const metrics = document.getElementById("area51-history-metrics");
    metrics.textContent = "";

    if (!record || !points.length) {
      summary.textContent = "No published history is available for this observer yet.";
      document.getElementById("area51-historical-copy").textContent =
        "No published history is available in the existing export yet.";
      renderObservationPulse(null);
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
    const unit = record.metric_unit || numericPoints.at(-1)?.metric_unit || "score";
    const peak = numericValues.length ? Math.max(...numericValues) : null;
    const medianValue = median(numericValues);
    const missingCount = Math.max(0, totalCount - numericCount);

    summary.textContent =
      `${formatNumber(totalCount)} published points • ${formatNumber(numericCount)} numeric • ${formatNumber(missingCount)} gaps`;

    appendHistoryMetric(metrics, "Latest", formatMetric(latest, unit));
    appendHistoryMetric(metrics, "7-day average", formatMetric(record.seven_day_average, unit));
    appendHistoryMetric(metrics, "30-day average", formatMetric(record.thirty_day_average, unit));
    appendHistoryMetric(metrics, "Median", formatMetric(medianValue, unit));
    appendHistoryMetric(metrics, "Peak", formatMetric(peak, unit));

    const firstDate = points[0]?.date || "the first published observation";
    const lastDate = points.at(-1)?.date || "the latest published observation";
    document.getElementById("area51-historical-copy").textContent =
      `${formatNumber(totalCount)} published history points span ${firstDate} to ${lastDate}; ${formatNumber(numericCount)} contain numeric values. The pulse display and peak list are descriptive views of those published values, without a causal interpretation.`;

    renderObservationPulse(record);
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
