(function () {
  "use strict";

  const observerId = document.body.dataset.observerId;
  const dashboardUrl = "/world-observer/dashboard/internet.json";
  const historyUrl = "/world-observer/dashboard/history/internet-observers.json";

  function formatNumber(value) {
    if (value === null || value === undefined || value === "") return "—";
    if (typeof value === "number") return Number.isInteger(value)
      ? value.toLocaleString()
      : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
    return String(value);
  }

  function formatMetric(value, unit) {
    const formatted = formatNumber(value);
    if (formatted === "—" || !unit || ["count", "score"].includes(String(unit).toLowerCase())) return formatted;
    return `${formatted} ${unit}`;
  }

  function formatStatus(value) {
    return String(value || "unknown").replaceAll("_", " ");
  }

  function statusClass(value) {
    return String(value || "unknown").toLowerCase().replace(/[^a-z0-9-]+/g, "-");
  }

  function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: String(value).includes("T") ? "short" : undefined,
      timeZone: "UTC",
    }).format(date) + " UTC";
  }

  function addBadge(container, value, prefix) {
    const badge = document.createElement("span");
    badge.className = `status-badge ${statusClass(value)}`;
    badge.textContent = `${prefix}: ${formatStatus(value)}`;
    container.appendChild(badge);
  }

  function renderSecondaryMetrics(observer) {
    const container = document.getElementById("observer-secondary-metrics");
    const entries = Object.entries(observer.secondary_metrics || {});
    if (!entries.length) {
      const term = document.createElement("dt");
      term.textContent = "Secondary metrics";
      const value = document.createElement("dd");
      value.textContent = "—";
      container.append(term, value);
      return;
    }

    entries.forEach(([label, rawValue]) => {
      const term = document.createElement("dt");
      term.textContent = label;
      const value = document.createElement("dd");
      value.textContent = formatMetric(rawValue, observer.secondary_metric_units?.[label]);
      container.append(term, value);
    });
  }

  function renderHistory(record) {
    const summary = document.getElementById("observer-history-summary");
    const table = document.getElementById("observer-history-table");
    const body = table.querySelector("tbody");
    const points = Array.isArray(record?.points) ? record.points : [];

    if (!points.length) {
      summary.textContent = "No published history is available for this observer yet.";
      table.hidden = true;
      return;
    }

    summary.textContent = `${points.length.toLocaleString()} published history points are available. Showing the 12 most recent.`;
    points.slice(-12).reverse().forEach((point) => {
      const row = document.createElement("tr");
      const date = document.createElement("td");
      date.textContent = point.date || "—";
      const value = document.createElement("td");
      value.textContent = formatMetric(point.value, point.metric_unit || record.metric_unit);
      const status = document.createElement("td");
      status.textContent = formatStatus(point.data_status);
      row.append(date, value, status);
      body.appendChild(row);
    });
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
    const dashboard = dashboardResult.value;
    const observer = (dashboard.observers || []).find((entry) => entry.observer === observerId);
    if (!observer) throw new Error(`Observer not found: ${observerId}`);

    document.getElementById("observer-primary-label").textContent = observer.primary_metric_name || "Primary metric";
    document.getElementById("observer-primary-value").textContent = formatMetric(observer.primary_metric_value, observer.primary_metric_unit);
    document.getElementById("observer-last-update").textContent = `Last observation/update: ${formatDate(observer.last_seen_date)}`;

    const statuses = document.getElementById("observer-statuses");
    addBadge(statuses, observer.status, "Status");
    addBadge(statuses, observer.data_status, "Data status");
    renderSecondaryMetrics(observer);

    const history = historyResult.status === "fulfilled" ? historyResult.value : null;
    renderHistory(history?.observers?.[observerId]);
    document.getElementById("observer-loading").hidden = true;
    document.getElementById("observer-content").hidden = false;
  }

  render().catch((error) => {
    console.error("Unable to render Internet observer detail page", error);
    const loading = document.getElementById("observer-loading");
    loading.textContent = "Observer data is not available yet.";
  });
}());
