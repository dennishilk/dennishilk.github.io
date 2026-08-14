(function () {
  "use strict";

  const observerId = "area51-reachability";
  const dashboardUrl = "/world-observer/dashboard/internet.json";
  const historyUrl = "/world-observer/dashboard/history/internet-observers.json";
  const copernicusStacUrl = "https://stac.dataspace.copernicus.eu/v1/search";
  const watchBbox = [-115.8837890625, 37.1953305828, -115.751953125, 37.2653099556];
  const thermalLayer = "VIIRS_NOAA20_Thermal_Anomalies_375m_All";
  const isGerman = document.documentElement.lang.toLowerCase().startsWith("de");
  const locale = isGerman ? "de-DE" : "en-GB";

  const copy = {
    en: {
      primaryMetric: "Primary metric",
      exportedValue: "EXPORTED VALUE",
      secondaryMetrics: "Secondary metrics",
      lastUpdate: "Last observation/update",
      latestExported: "Latest exported observation",
      noHistory: "No published history is available yet.",
      noHistoryExport: "No published history is available in the existing export yet.",
      points: "points",
      numeric: "numeric",
      gaps: "gaps",
      catalogueUnavailable: "Catalogue temporarily unavailable",
      catalogueOnline: "Catalogue online",
      cloudUnavailable: "Tile cloud cover unavailable",
      tileCloud: "Tile cloud cover",
      latest: "LATEST",
      recentUnavailable: "Recent scene metadata is temporarily unavailable.",
      layerLoading: "Loading public layer",
      layerLoaded: "Public layer loaded",
      layerUnavailable: "Layer temporarily unavailable",
      showThermal: "Show NASA thermal-anomaly layer for",
      thermalAlt: "NASA GIBS VIIRS NOAA-20 thermal-anomaly overlay for",
      day: "d",
      noScene: "No Sentinel-2 scene returned for watch area",
    },
    de: {
      primaryMetric: "Primärmetrik",
      exportedValue: "EXPORTIERTER WERT",
      secondaryMetrics: "Sekundärmetriken",
      lastUpdate: "Letzte Beobachtung/Aktualisierung",
      latestExported: "Letzte exportierte Beobachtung",
      noHistory: "Es ist noch kein veröffentlichter Verlauf verfügbar.",
      noHistoryExport: "Im bestehenden Export ist noch kein veröffentlichter Verlauf verfügbar.",
      points: "Punkte",
      numeric: "numerisch",
      gaps: "Lücken",
      catalogueUnavailable: "Katalog vorübergehend nicht verfügbar",
      catalogueOnline: "Katalog erreichbar",
      cloudUnavailable: "Kachelbewölkung nicht verfügbar",
      tileCloud: "Kachelbewölkung",
      latest: "NEUESTE",
      recentUnavailable: "Metadaten der letzten Szenen sind vorübergehend nicht verfügbar.",
      layerLoading: "Öffentliche Ebene wird geladen",
      layerLoaded: "Öffentliche Ebene geladen",
      layerUnavailable: "Ebene vorübergehend nicht verfügbar",
      showThermal: "NASA-Thermalanomalie-Ebene anzeigen für",
      thermalAlt: "NASA-GIBS-VIIRS-NOAA-20-Thermalanomalie-Ebene für",
      day: "T",
      noScene: "Keine Sentinel-2-Szene für das Beobachtungsgebiet zurückgegeben",
    },
  };

  const text = (key) => copy[isGerman ? "de" : "en"][key] || key;

  const metricNames = {
    "Reachability score": isGerman ? "Erreichbarkeitswert" : "Reachability score",
    "JANET-like aircraft": isGerman ? "JANET-ähnliche Flugzeuge" : "JANET-like aircraft",
    "Other aircraft": isGerman ? "Andere Flugzeuge" : "Other aircraft",
    "Time buckets": isGerman ? "Zeitfenster" : "Time buckets",
  };

  function localizeMetricName(value) {
    return metricNames[value] || value;
  }

  function applyInterfacePolish() {
    const watchTitle = document.getElementById("public-watch-title");
    if (watchTitle) {
      watchTitle.textContent = isGerman
        ? "Satelliten- & Thermalanomalie-Beobachtung"
        : "Satellite & Thermal Anomaly Watch";
    }

    if (!document.getElementById("area51-legend-contrast-polish")) {
      const style = document.createElement("style");
      style.id = "area51-legend-contrast-polish";
      style.textContent = `
        .area51-thermal-legend figcaption {
          color: #b8d5d9;
          font-size: 0.57rem;
        }
        .area51-thermal-legend img {
          filter: invert(1) hue-rotate(180deg) brightness(1.25) contrast(1.12);
          opacity: 0.98;
          width: min(100%, 340px);
        }
      `;
      document.head.appendChild(style);
    }
  }

  function formatNumber(value) {
    if (value === null || value === undefined || value === "") return "—";
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return String(value);
    return new Intl.NumberFormat(locale, {
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

    return `${new Intl.DateTimeFormat(locale, options).format(date)} UTC`;
  }

  function formatPassDate(date) {
    return new Intl.DateTimeFormat(locale, {
      day: "2-digit",
      month: "short",
      timeZone: "UTC",
    }).format(date);
  }

  function isoDay(date) {
    return date.toISOString().slice(0, 10);
  }

  function createElement(tagName, className, value) {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    if (value !== undefined) element.textContent = value;
    return element;
  }

  function appendMetric(container, label, value, unit) {
    const group = createElement("div");
    const term = createElement("dt", "", localizeMetricName(label));
    const normalizedUnit = String(unit || "exported value");
    const unitLabel = createElement(
      "small",
      "",
      isGerman && normalizedUnit.toLowerCase() === "count" ? "ANZAHL" : normalizedUnit.toUpperCase(),
    );
    const description = createElement("dd", "", formatMetric(value, unit));
    term.appendChild(unitLabel);
    group.append(term, description);
    container.appendChild(group);
  }

  function renderCurrentObservation(observer) {
    const primaryName = localizeMetricName(observer.primary_metric_name || text("primaryMetric"));
    document.getElementById("observer-primary-label").textContent = primaryName;
    document.getElementById("observer-primary-value").textContent =
      formatMetric(observer.primary_metric_value, observer.primary_metric_unit);
    document.getElementById("observer-primary-unit").textContent =
      `${String(observer.primary_metric_unit || "value").toUpperCase()} / ${text("exportedValue")}`;
    document.getElementById("observer-last-update").textContent =
      `${text("lastUpdate")}: ${formatDate(observer.last_seen_date)}`;

    const metrics = document.getElementById("observer-secondary-metrics");
    metrics.textContent = "";
    const entries = Object.entries(observer.secondary_metrics || {});

    if (!entries.length) {
      appendMetric(metrics, text("secondaryMetrics"), null, "");
    } else {
      entries.forEach(([label, value]) => {
        appendMetric(metrics, label, value, observer.secondary_metric_units?.[label]);
      });
    }

    const observedList = document.getElementById("area51-observed-list");
    observedList.textContent = "";
    entries.forEach(([label, value]) => {
      const unit = observer.secondary_metric_units?.[label];
      observedList.appendChild(
        createElement("li", "", `${localizeMetricName(label)}: ${formatMetric(value, unit)}.`),
      );
    });
    observedList.appendChild(
      createElement("li", "", `${text("latestExported")}: ${formatDate(observer.last_seen_date)}.`),
    );

    document.getElementById("area51-derived-copy").textContent = isGerman
      ? `Der bestehende Export veröffentlicht „${primaryName}“ mit dem Wert ${formatMetric(observer.primary_metric_value, observer.primary_metric_unit)}. Diese Seite zeigt diesen gelieferten Wert, ohne eine neue Berechnung oder kausale Interpretation hinzuzufügen.`
      : `The existing export publishes “${primaryName}” as ${formatMetric(observer.primary_metric_value, observer.primary_metric_unit)}. This page displays that supplied value without adding a new calculation or causal interpretation.`;
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
      summary.textContent = text("noHistory");
      document.getElementById("area51-historical-copy").textContent = text("noHistoryExport");
      return;
    }

    details.hidden = false;
    summary.textContent = `${formatNumber(totalCount)} ${text("points")} · ${formatNumber(numericCount)} ${text("numeric")} · ${formatNumber(missingCount)} ${text("gaps")}`;

    numericPoints.slice(-12).reverse().forEach((point) => {
      const row = document.createElement("tr");
      row.append(
        createElement("td", "", point.date || "—"),
        createElement("td", "", formatMetric(Number(point.value), point.metric_unit || record.metric_unit)),
      );
      body.appendChild(row);
    });

    const firstDate = points[0]?.date || "—";
    const lastDate = points.at(-1)?.date || "—";
    document.getElementById("area51-historical-copy").textContent = isGerman
      ? `${formatNumber(totalCount)} veröffentlichte Verlaufspunkte reichen von ${firstDate} bis ${lastDate}; ${formatNumber(numericCount)} enthalten numerische Werte. Der Verlauf bleibt als kompakte Datentabelle ohne kausale Interpretation verfügbar.`
      : `${formatNumber(totalCount)} published history points span ${firstDate} to ${lastDate}; ${formatNumber(numericCount)} contain numeric values. The history remains available as a compact data table without causal interpretation.`;
  }

  function scenePlatform(feature) {
    const properties = feature?.properties || {};
    const platform = properties.platform || properties.constellation;
    if (platform) return String(platform).replaceAll("_", " ").toUpperCase();
    const prefix = String(feature?.id || "").match(/^S2[ABC]/i)?.[0];
    return prefix ? prefix.toUpperCase() : "SENTINEL-2";
  }

  function compactPlatform(feature) {
    const full = scenePlatform(feature);
    const match = full.match(/SENTINEL[- ]?2([ABC])/i);
    return match ? `S2${match[1].toUpperCase()}` : full.replace("SENTINEL-", "S");
  }

  function sceneAcquisition(feature) {
    const value = feature?.properties?.datetime || feature?.properties?.start_datetime;
    const date = new Date(value || 0);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function sceneCloud(feature) {
    const cloud = Number(feature?.properties?.["eo:cloud_cover"]);
    return Number.isFinite(cloud) ? Math.max(0, Math.min(100, cloud)) : null;
  }

  function recentPasses(features) {
    const sorted = [...features]
      .filter((feature) => sceneAcquisition(feature))
      .sort((a, b) => sceneAcquisition(b).getTime() - sceneAcquisition(a).getTime());
    const seen = new Set();
    const result = [];

    for (const feature of sorted) {
      const acquisition = sceneAcquisition(feature);
      const key = `${acquisition.toISOString().slice(0, 16)}|${compactPlatform(feature)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(feature);
      if (result.length === 6) break;
    }
    return result;
  }

  function renderRecentPasses(features) {
    const list = document.getElementById("area51-recent-scenes");
    list.textContent = "";
    const passes = recentPasses(features);

    if (!passes.length) {
      list.appendChild(createElement("li", "area51-recent-scenes-empty", text("recentUnavailable")));
      return;
    }

    passes.forEach((feature, index) => {
      const acquisition = sceneAcquisition(feature);
      const cloud = sceneCloud(feature);
      const item = createElement("li", "area51-recent-scene");
      if (index === 0) item.classList.add("is-latest");

      const dateBlock = createElement("div", "area51-recent-scene-date");
      const date = createElement("time", "", formatPassDate(acquisition));
      date.dateTime = acquisition.toISOString();
      dateBlock.append(date, createElement("span", "", `${acquisition.toISOString().slice(11, 16)} UTC`));

      const platform = createElement("span", "area51-recent-platform", compactPlatform(feature));
      const cloudTrack = createElement("span", "area51-recent-cloud-track");
      const cloudFill = createElement("span", "area51-recent-cloud-fill");
      cloudFill.style.setProperty("--scene-cloud", `${cloud === null ? 0 : cloud}%`);
      cloudTrack.appendChild(cloudFill);
      const cloudLabel = createElement(
        "strong",
        "area51-recent-cloud-value",
        cloud === null ? "—" : `${formatNumber(cloud)}%`,
      );
      const latest = createElement("span", "area51-recent-latest", index === 0 ? text("latest") : "");

      item.append(dateBlock, platform, cloudTrack, cloudLabel, latest);
      list.appendChild(item);
    });
  }

  function setSceneUnavailable() {
    document.getElementById("area51-scene-state").textContent = text("catalogueUnavailable");
    document.getElementById("area51-scene-date").textContent = "—";
    document.getElementById("area51-scene-time").textContent = "— UTC";
    document.getElementById("area51-scene-age").textContent = "—";
    document.getElementById("area51-scene-platform").textContent = "—";
    document.getElementById("area51-scene-cloud").textContent = "—";
    document.getElementById("area51-scene-id").textContent = "—";
    const gauge = document.getElementById("area51-cloud-gauge");
    gauge.style.setProperty("--cloud-angle", "0deg");
    gauge.setAttribute("aria-label", text("cloudUnavailable"));
    renderRecentPasses([]);
  }

  async function loadSatelliteScenes() {
    const end = new Date();
    const start = new Date(end.getTime() - (120 * 24 * 60 * 60 * 1000));
    const params = new URLSearchParams({
      collections: "sentinel-2-l2a",
      bbox: watchBbox.join(","),
      datetime: `${start.toISOString()}/${end.toISOString()}`,
      limit: "30",
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
      const passes = recentPasses(features);
      const feature = passes[0];
      if (!feature) throw new Error(text("noScene"));

      const acquisition = sceneAcquisition(feature);
      const cloudPercent = sceneCloud(feature);
      const ageDays = Math.max(0, Math.floor((Date.now() - acquisition.getTime()) / (24 * 60 * 60 * 1000)));
      const sceneId = String(feature.id || "—");

      document.getElementById("area51-scene-state").textContent = text("catalogueOnline");
      document.getElementById("area51-scene-date").textContent = isoDay(acquisition);
      document.getElementById("area51-scene-time").textContent = `${acquisition.toISOString().slice(11, 16)} UTC`;
      document.getElementById("area51-scene-age").textContent = `${ageDays} ${text("day")}`;
      document.getElementById("area51-scene-platform").textContent = scenePlatform(feature);
      document.getElementById("area51-scene-id").textContent = sceneId;
      document.getElementById("area51-scene-id").title = sceneId;

      const cloudNode = document.getElementById("area51-scene-cloud");
      const gauge = document.getElementById("area51-cloud-gauge");
      if (cloudPercent === null) {
        cloudNode.textContent = "—";
        gauge.style.setProperty("--cloud-angle", "0deg");
        gauge.setAttribute("aria-label", text("cloudUnavailable"));
      } else {
        cloudNode.textContent = `${formatNumber(cloudPercent)}%`;
        gauge.style.setProperty("--cloud-angle", `${(cloudPercent * 3.6).toFixed(1)}deg`);
        gauge.setAttribute("aria-label", `${text("tileCloud")} ${formatNumber(cloudPercent)}%`);
      }

      renderRecentPasses(features);
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
      STYLES: "",
      WIDTH: "900",
      HEIGHT: "600",
      VERSION: "1.1.1",
      SRS: "epsg:4326",
      BBOX: watchBbox.join(","),
      TRANSPARENT: "TRUE",
    });
    return `https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?${params.toString()}`;
  }

  function setThermalState(value, state) {
    const node = document.getElementById("area51-thermal-state");
    node.textContent = value;
    node.dataset.state = state;
  }

  function selectThermalDate(date, button) {
    document.querySelectorAll("#area51-thermal-days button").forEach((candidate) => {
      candidate.setAttribute("aria-pressed", String(candidate === button));
    });

    const overlay = document.getElementById("area51-thermal-overlay");
    setThermalState(text("layerLoading"), "loading");
    overlay.onload = () => setThermalState(text("layerLoaded"), "loaded");
    overlay.onerror = () => setThermalState(text("layerUnavailable"), "error");
    overlay.src = thermalWmsUrl(date);
    overlay.alt = `${text("thermalAlt")} ${date}`;
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
      button.setAttribute("aria-label", `${text("showThermal")} ${dateValue}`);
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
    applyInterfacePolish();
    initThermalWatch();
    loadSatelliteScenes();

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
    loading.textContent = isGerman
      ? "Öffentliche Observer-Daten sind derzeit nicht verfügbar."
      : "Public observer data is not available yet.";
  });
}());