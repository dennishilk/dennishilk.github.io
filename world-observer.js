const SUMMARY_URL = "world-observer/latest/summary.json";
const MEDIA_URL = "world-observer/latest/media-language-germany.json";
const MEDIA_HISTORY_URLS = [
  "world-observer/dashboard/history/media-language-germany.json",
  "dashboard/history/media-language-germany.json",
];
const INTERNET_URLS = [
  "world-observer/dashboard/internet.json",
  "dashboard/internet.json",
];
const INTERNET_HISTORY_URLS = [
  "world-observer/dashboard/history/internet-observers.json",
  "dashboard/history/internet-observers.json",
];

async function loadJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status}`);
  }
  return response.json();
}

async function loadOptionalJson(urls) {
  const errors = [];

  for (const url of urls) {
    try {
      return await loadJson(url);
    } catch (error) {
      errors.push(error);
    }
  }

  console.warn("Optional World Observer data not available", errors);
  return null;
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value ?? "—";
  }
}

function formatNumber(value) {
  return Number.isFinite(value) ? value.toLocaleString() : "—";
}

function formatIndex(value) {
  return Number.isFinite(value) ? value.toFixed(2) : "—";
}

function formatDelta(value) {
  if (!Number.isFinite(value)) {
    return "—";
  }

  if (value === 0) {
    return "0.00";
  }

  return `${value > 0 ? "+" : ""}${value.toFixed(2)}`;
}

function average(values) {
  const validValues = values.filter(Number.isFinite);
  if (!validValues.length) {
    return null;
  }

  return validValues.reduce((total, value) => total + value, 0) / validValues.length;
}

function normalizeHistoryPoints(history) {
  const rawPoints = Array.isArray(history)
    ? history
    : history?.points || history?.history || history?.data || [];

  return rawPoints
    .map((point, index) => ({
      date: point.date || point.last_update || point.timestamp || `Point ${index + 1}`,
      fearIndex: Number(point.fear_index_overall ?? point.fear_index ?? point.value),
    }))
    .filter((point) => Number.isFinite(point.fearIndex));
}

function normalizeCollection(data) {
  if (Array.isArray(data)) {
    return data;
  }

  return data?.observers || data?.internet_observers || data?.items || data?.data || [];
}

function normalizeInternetHistory(history) {
  const rawObservers = normalizeCollection(history);
  const byId = new Map();

  if (rawObservers.length) {
    rawObservers.forEach((observer) => {
      const id = getObserverId(observer);
      byId.set(id, normalizeObserverHistoryPoints(observer.history || observer.points || observer.data || []));
    });
    return byId;
  }

  Object.entries(history?.history || history?.observers_history || {}).forEach(([id, points]) => {
    byId.set(id, normalizeObserverHistoryPoints(points));
  });

  return byId;
}

function normalizeObserverHistoryPoints(points) {
  return (Array.isArray(points) ? points : [])
    .map((point, index) => ({
      date: point.date || point.last_seen || point.last_update || point.timestamp || `Point ${index + 1}`,
      value: Number(point.value ?? point.primary_metric?.value ?? point.metric_value ?? point.uptime ?? point.latency_ms ?? point.response_time_ms ?? point.status_code),
    }))
    .filter((point) => Number.isFinite(point.value));
}

function getObserverId(observer) {
  return String(observer.id || observer.name || observer.slug || observer.display_name || observer.observer || "internet-observer");
}

function getObserverStatus(observer) {
  return observer.data_status || observer.status || observer.health || "unknown";
}

function getPrimaryMetric(observer) {
  const metric = observer.primary_metric || observer.primaryMetric;
  if (metric && typeof metric === "object") {
    const label = metric.label || metric.name || metric.key || "primary metric";
    const value = metric.display_value ?? metric.formatted ?? metric.value;
    const unit = metric.unit ? ` ${metric.unit}` : "";
    return { label, value: value ?? null, unit };
  }

  const directMetrics = [
    ["uptime", "uptime"],
    ["availability", "availability"],
    ["latency_ms", "latency_ms"],
    ["response_time_ms", "response_time_ms"],
    ["status_code", "status_code"],
  ];
  const match = directMetrics.find(([key]) => observer[key] !== undefined && observer[key] !== null);

  if (match) {
    return { label: match[1], value: observer[match[0]], unit: "" };
  }

  return { label: "primary metric", value: null, unit: "" };
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString().slice(0, 10);
}

function renderMiniSparkline(points, label) {
  const wrap = document.createElement("div");
  wrap.className = "mini-sparkline";

  if (!points.length) {
    wrap.textContent = "No history yet";
    return wrap;
  }

  const width = 160;
  const height = 42;
  const padding = 4;
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const lastIndex = Math.max(points.length - 1, 1);
  const coordinates = points.map((point, index) => {
    const x = padding + (index / lastIndex) * (width - padding * 2);
    const y = height - padding - ((point.value - min) / range) * (height - padding * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", `${label} sparkline with ${points.length} history points`);

  const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  polyline.setAttribute("points", coordinates.join(" "));
  polyline.setAttribute("class", "sparkline-line");
  svg.appendChild(polyline);

  wrap.appendChild(svg);
  return wrap;
}

function renderInternetObservers(data, history) {
  const container = document.getElementById("internet-observer-cards");
  const status = document.getElementById("internet-observer-status");
  container.textContent = "";

  const observers = normalizeCollection(data);
  const historyById = history ? normalizeInternetHistory(history) : new Map();

  if (!observers.length) {
    status.textContent = "Internet observer data is not available yet.";
    return;
  }

  status.textContent = history ? "" : "Current cards loaded. Internet observer history is not available yet.";

  observers.forEach((observer) => {
    const id = getObserverId(observer);
    const titleText = observer.display_name || observer.name || observer.observer || "Internet Observer";
    const primaryMetric = getPrimaryMetric(observer);
    const points = historyById.get(id) || historyById.get(titleText) || [];

    const card = document.createElement("article");
    card.className = "internet-observer-card";

    const header = document.createElement("div");
    header.className = "internet-card-header";

    const title = document.createElement("h3");
    title.textContent = titleText;

    const observerStatus = String(getObserverStatus(observer));
    const badge = document.createElement("span");
    badge.className = `status-badge ${observerStatus.toLowerCase().replace(/[^a-z0-9-]/g, "-")}`;
    badge.textContent = observerStatus;

    header.append(title, badge);

    const metric = document.createElement("p");
    metric.className = "internet-primary-metric";

    const metricLabel = document.createElement("span");
    metricLabel.textContent = primaryMetric.label;

    const metricValue = document.createElement("strong");
    metricValue.textContent = `${primaryMetric.value ?? "—"}${primaryMetric.value == null ? "" : primaryMetric.unit}`;

    metric.append(metricLabel, metricValue);

    const lastSeen = document.createElement("p");
    lastSeen.className = "internet-last-seen";
    lastSeen.textContent = `Last seen: ${formatDate(observer.last_seen || observer.last_update || observer.timestamp || data?.last_update)}`;

    card.append(header, metric, lastSeen, renderMiniSparkline(points, titleText));
    container.appendChild(card);
  });
}

function renderCategories(categories) {
  const container = document.getElementById("observer-categories");
  container.textContent = "";

  categories.filter((category) => category.name?.toLowerCase() !== "internet").forEach((category) => {
    const card = document.createElement("article");
    card.className = `card observer-category ${category.status || "unknown"}`;

    const title = document.createElement("h3");
    title.textContent = category.name;

    const status = document.createElement("p");
    status.innerHTML = `<strong>Status:</strong> ${category.status || "unknown"}`;

    const description = document.createElement("p");
    description.textContent = category.description || "No description available.";

    const count = document.createElement("p");
    count.className = "observer-count";
    count.textContent = `Observers: ${formatNumber(category.observers)}`;

    card.append(title, status, description, count);
    container.appendChild(card);
  });
}

function renderMediaLists(media) {
  const terms = document.getElementById("media-top-terms");
  terms.textContent = "";
  (media.top_terms || []).forEach((term) => {
    const item = document.createElement("li");
    item.textContent = term;
    terms.appendChild(item);
  });

  const counts = document.getElementById("media-category-counts");
  counts.textContent = "";
  Object.entries(media.category_counts || {}).forEach(([category, value]) => {
    const term = document.createElement("dt");
    term.textContent = category;

    const count = document.createElement("dd");
    count.textContent = formatNumber(value);

    counts.append(term, count);
  });
}

function renderSparkline(points) {
  const container = document.getElementById("media-trend-sparkline");
  container.textContent = "";

  if (!points.length) {
    container.setAttribute("aria-label", "No media trend history points available");
    return;
  }

  const width = 240;
  const height = 64;
  const padding = 5;
  const values = points.map((point) => point.fearIndex);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const lastIndex = Math.max(points.length - 1, 1);
  const coordinates = points.map((point, index) => {
    const x = padding + (index / lastIndex) * (width - padding * 2);
    const y = height - padding - ((point.fearIndex - min) / range) * (height - padding * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", `Sparkline for ${points.length} media language fear index history points`);

  const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  polyline.setAttribute("points", coordinates.join(" "));
  polyline.setAttribute("class", "sparkline-line");

  svg.appendChild(polyline);

  if (points.length === 1) {
    const [cx, cy] = coordinates[0].split(",");
    const marker = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    marker.setAttribute("cx", cx);
    marker.setAttribute("cy", cy);
    marker.setAttribute("r", "4");
    marker.setAttribute("class", "sparkline-point");
    svg.appendChild(marker);
  }

  container.appendChild(svg);
}

function renderMediaTrend(history) {
  const status = document.getElementById("media-trend-status");

  if (!history) {
    setText("media-trend-points", "—");
    status.textContent = "Media trend history is not available yet.";
    renderSparkline([]);
    return;
  }

  const points = normalizeHistoryPoints(history);
  if (!points.length) {
    setText("media-trend-points", "0");
    status.textContent = "Media trend history has no usable fear index points yet.";
    renderSparkline([]);
    return;
  }

  const latest = points.at(-1)?.fearIndex;
  const previous = points.at(-2)?.fearIndex;
  const delta = Number.isFinite(latest) && Number.isFinite(previous) ? latest - previous : null;

  setText("media-trend-points", formatNumber(points.length));
  setText("media-trend-latest", formatIndex(latest));
  setText("media-trend-previous", formatIndex(previous));
  setText("media-trend-delta", formatDelta(delta));
  setText("media-trend-7d", formatIndex(average(points.slice(-7).map((point) => point.fearIndex))));
  setText("media-trend-30d", formatIndex(average(points.slice(-30).map((point) => point.fearIndex))));

  status.textContent = points.length === 1 ? "Trend starts today." : "";
  renderSparkline(points);
}

function renderDashboard(summary, media, mediaHistory, internet, internetHistory) {
  setText("observer-last-update", summary.last_update);
  setText("observer-total", formatNumber(summary.total_observers));
  setText("observer-missing", formatNumber(summary.missing_observers));
  setText("observer-degraded", formatNumber(summary.degraded_observers));

  renderCategories(summary.categories || []);
  renderInternetObservers(internet, internetHistory);

  setText("media-fear-overall", formatIndex(media.fear_index_overall));
  setText("media-public-fear", formatIndex(media.public_broadcast?.fear_index));
  setText("media-private-fear", formatIndex(media.private_media?.fear_index));
  setText("media-headline-count", formatNumber(media.headline_count));
  renderMediaLists(media);
  renderMediaTrend(mediaHistory);
}

function showFallback() {
  document.getElementById("observer-dashboard").hidden = true;
  document.getElementById("observer-fallback").hidden = false;
}

async function initWorldObserver() {
  try {
    const [summary, media, mediaHistory, internet, internetHistory] = await Promise.all([
      loadJson(SUMMARY_URL),
      loadJson(MEDIA_URL),
      loadOptionalJson(MEDIA_HISTORY_URLS),
      loadOptionalJson(INTERNET_URLS),
      loadOptionalJson(INTERNET_HISTORY_URLS),
    ]);
    renderDashboard(summary, media, mediaHistory, internet, internetHistory);
    document.getElementById("observer-dashboard").hidden = false;
  } catch (error) {
    console.warn(error);
    showFallback();
  }
}

initWorldObserver();
