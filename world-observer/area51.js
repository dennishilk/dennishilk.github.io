(function () {
  "use strict";

  const observerId = "area51-reachability";
  const dashboardUrl = "/world-observer/dashboard/internet.json";
  const historyUrl = "/world-observer/dashboard/history/internet-observers.json";
  const copernicusStacUrl = "https://stac.dataspace.copernicus.eu/v1/search";
  const watchBbox = [-115.8837890625, 37.1953305828, -115.751953125, 37.2653099556];
  const thermalLayer = "VIIRS_NOAA20_Thermal_Anomalies_375m_All";

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

  function isoDay(date) {
    return date.toISOString().slice(0, 10);
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

  function renderHistoryTable(record) {
    const body = document.querySelector("#observer-history-table tbody");
    const details = document.querySelector(".area51-history-archive");
    body.textContent = "";

    const points = Array.isArray(record?.points) ? record.points : [];
    const numericPoints = points.filter((point) => Number.isFinite(Number(point?.value)));
    const totalCount = Number.isFinite(Number(record?.total_point_count))
      ? Number(record.total_point_count)
      : points.length;
    const numericCount = Number.isFinite(Number(record?.numeric_point_count))
      ? Number(record.numeric_point_count)
      : numericPoints.length;
    const missingCount = Math.max(0, totalCount - numericCount);
    const summary = document.getElementById("observer-history-summary");

    if (!record || !points.length || !numericPoints.length) {
      details.hidden = true;
      summary.textContent = "No published history is available yet.";
      document.getElementById("area51-historical-copy").textContent =
        "No published history is available in the existing export yet.";
      return;
    }

    details.hidden = false;
    summary.textContent = `${formatNumber(totalCount)} points · ${formatNumber(numericCount)} numeric · ${formatNumber(missingCount)} gaps`;

    numericPoints.slice(-12).reverse().forEach((point) => {
      const row = document.createElement("tr");
      row.append(
        createElement("td", "", point.date || "—"),
        createElement("td", "", formatMetric(Number(point.value), point.metric_unit || record.metric_unit)),
      );
      body.appendChild(row);
    });

    const firstDate = points[0]?.date || "the first published observation";
    const lastDate = points.at(-1)?.date || "the latest published observation";
    document.getElementById("area51-historical-copy").textContent =
      `${formatNumber(totalCount)} published history points span ${firstDate} to ${lastDate}; ${formatNumber(numericCount)} contain numeric values. The history remains available as a compact data table without causal interpretation.`;
  }

  function scenePlatform(feature) {
    const properties = feature?.properties || {};
    const platform = properties.platform || properties.constellation;
    if (platform) return String(platform).replaceAll("_", " ").toUpperCase();
    const prefix = String(feature?.id || "").match(/^S2[ABC]/i)?.[0];
    return prefix ? prefix.toUpperCase() : "SENTINEL-2";
  }

  function setSceneUnavailable() {
    document.getElementById("area51-scene-state").textContent = "Catalogue temporarily unavailable";
    document.getElementById("area51-scene-date").textContent = "—";
    document.getElementById("area51-scene-time").textContent = "— UTC";
    document.getElementById("area51-scene-age").textContent = "—";
    document.getElementById("area51-scene-platform").textContent = "—";
    document.getElementById("area51-scene-cloud").textContent = "—";
    document.getElementById("area51-scene-id").textContent = "—";
    document.getElementById("area51-cloud-gauge").style.setProperty("--cloud-angle", "0deg");
  }

  async function loadLatestSatelliteScene() {
    const end = new Date();
    const start = new Date(end.getTime() - (90 * 24 * 60 * 60 * 1000));
    const params = new URLSearchParams({
      collections: "sentinel-2-l2a",
      bbox: watchBbox.join(","),
      datetime: `${start.toISOString()}/${end.toISOString()}`,
      limit: "20",
      sortby: "-datetime",
    });

    try {
      const response = await fetch(`${copernicusStacUrl}?${params.toString()}`, {
        cache: "no-store",
        headers: { Accept: "application/geo+json, application/json" },
      });
      if (!response.ok) throw new Error(`Copernicus STAC HTTP ${response.status}`);
      const payload = await response.json();
      const features = Array.isArray(payload?.features) ? payload.features : [];
      const feature = [...features].sort((a, b) => {
        const aTime = new Date(a?.properties?.datetime || a?.properties?.start_datetime || 0).getTime();
        const bTime = new Date(b?.properties?.datetime || b?.properties?.start_datetime || 0).getTime();
        return bTime - aTime;
      })[0];
      if (!feature) throw new Error("No Sentinel-2 scene returned for watch area");

      const properties = feature.properties || {};
      const acquisition = new Date(properties.datetime || properties.start_datetime);
      if (Number.isNaN(acquisition.getTime())) throw new Error("Scene has no usable acquisition time");

      const cloud = Number(properties["eo:cloud_cover"]);
      const cloudPercent = Number.isFinite(cloud) ? Math.max(0, Math.min(100, cloud)) : null;
      const ageDays = Math.max(0, Math.floor((Date.now() - acquisition.getTime()) / (24 * 60 * 60 * 1000)));
      const sceneId = String(feature.id || "—");

      document.getElementById("area51-scene-state").textContent = "Catalogue online";
      document.getElementById("area51-scene-date").textContent = isoDay(acquisition);
      document.getElementById("area51-scene-time").textContent = `${acquisition.toISOString().slice(11, 16)} UTC`;
      document.getElementById("area51-scene-age").textContent = `${ageDays} d`;
      document.getElementById("area51-scene-platform").textContent = scenePlatform(feature);
      document.getElementById("area51-scene-id").textContent = sceneId;
      document.getElementById("area51-scene-id").title = sceneId;

      const cloudNode = document.getElementById("area51-scene-cloud");
      const gauge = document.getElementById("area51-cloud-gauge");
      if (cloudPercent === null) {
        cloudNode.textContent = "—";
        gauge.style.setProperty("--cloud-angle", "0deg");
        gauge.setAttribute("aria-label", "Tile cloud cover unavailable");
      } else {
        cloudNode.textContent = `${formatNumber(cloudPercent)}%`;
        gauge.style.setProperty("--cloud-angle", `${(cloudPercent * 3.6).toFixed(1)}deg`);
        gauge.setAttribute("aria-label", `Tile cloud cover ${formatNumber(cloudPercent)} percent`);
      }
    } catch (error) {
      console.warn("Unable to load Copernicus Sentinel-2 catalogue metadata", error);
      setSceneUnavailable();
    }
  }

  function thermalWmsUrl(date) {
    const params = new URLSearchParams({
      TIME: `${date}T00:00:00Z`,
      LAYERS: thermalLayer,
      REQUEST: "GetMap",
      SERVICE: "WMS",
      FORMAT: "image/png",
      WIDTH: "900",
      HEIGHT: "600",
      VERSION: "1.1.1",
      SRS: "epsg:4326",
      BBOX: watchBbox.join(","),
      TRANSPARENT: "TRUE",
    });
    return `https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?${params.toString()}`;
  }

  function selectThermalDate(date, button) {
    document.querySelectorAll("#area51-thermal-days button").forEach((candidate) => {
      candidate.setAttribute("aria-pressed", String(candidate === button));
    });
    const overlay = document.getElementById("area51-thermal-overlay");
    overlay.src = thermalWmsUrl(date);
    overlay.alt = `NASA GIBS VIIRS NOAA-20 thermal-anomaly overlay for ${date}`;
    document.getElementById("area51-thermal-date").textContent = date;
  }

  function initThermalWatch() {
    const container = document.getElementById("area51-thermal-days");
    container.textContent = "";
    const today = new Date();

    for (let offset = 1; offset <= 7; offset += 1) {
      const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - offset));
      const dateValue = isoDay(date);
      const button = createElement("button", "", dateValue.slice(5));
      button.type = "button";
      button.title = dateValue;
      button.setAttribute("aria-label", `Show NASA thermal-anomaly layer for ${dateValue}`);
      button.setAttribute("aria-pressed", "false");
      button.addEventListener("click", () => selectThermalDate(dateValue, button));
      container.appendChild(button);
      if (offset === 1) selectThermalDate(dateValue, button);
    }
  }

  async function loadJson(url) {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
    return response.json();
  }

  async function render() {
    initThermalWatch();
    loadLatestSatelliteScene();

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
    renderHistoryTable(history);

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
