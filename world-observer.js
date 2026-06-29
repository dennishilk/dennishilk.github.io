const SUMMARY_URLS = ["/world-observer/latest/summary.json", "world-observer/latest/summary.json"];
const MEDIA_URLS = [
  "/world-observer/dashboard/media.json",
  "/world-observer/latest/media-language-germany.json",
  "dashboard/media.json",
  "latest/media-language-germany.json",
  "world-observer/latest/media-language-germany.json",
];
const MEDIA_HISTORY_URLS = [
  "/world-observer/dashboard/history/media-language-germany.json",
  "dashboard/history/media-language-germany.json",
  "world-observer/dashboard/history/media-language-germany.json",
];
const INTERNET_URLS = [
  "/world-observer/dashboard/internet.json",
  "dashboard/internet.json",
  "world-observer/dashboard/internet.json",
];
const INTERNET_HISTORY_URLS = [
  "/world-observer/dashboard/history/internet-observers.json",
  "dashboard/history/internet-observers.json",
  "world-observer/dashboard/history/internet-observers.json",
];
const HEARTBEAT_CONTENTS_URL = "https://api.github.com/repos/dennishilk/world-observer/contents/state/heartbeat";

const CATEGORY_LINKS = {
  internet: "/world-observer/internet.html",
  media: "/world-observer/media.html",
  society: "/world-observer/society.html",
  environment: "/world-observer/environment.html",
};

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

function formatDateTimeUtc(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString().replace(".000Z", "Z");
}

function formatRelativeAge(timestamp, now = new Date()) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  const seconds = Math.max(0, Math.round((now.getTime() - date.getTime()) / 1000));
  const units = [
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];

  for (const [unit, unitSeconds] of units) {
    const value = Math.floor(seconds / unitSeconds);
    if (value >= 1) {
      return `${value} ${unit}${value === 1 ? "" : "s"} ago`;
    }
  }

  return "just now";
}

function getHeartbeatTimestamp(heartbeat) {
  return heartbeat?.timestamp || heartbeat?.heartbeat_at || heartbeat?.generated_at || heartbeat?.last_update || heartbeat?.time || null;
}

async function loadLatestHeartbeat() {
  const contents = await loadJson(HEARTBEAT_CONTENTS_URL);
  const files = (Array.isArray(contents) ? contents : [])
    .filter((item) => item.type === "file" && item.name?.endsWith(".json"))
    .sort((a, b) => String(b.name).localeCompare(String(a.name)));

  if (!files.length) {
    return null;
  }

  const newest = files[0];
  const heartbeat = newest.download_url ? await loadJson(newest.download_url) : null;
  return { filename: newest.name, heartbeat: heartbeat || {}, timestamp: getHeartbeatTimestamp(heartbeat) || newest.name.replace(/\.json$/i, "") };
}

function renderHeartbeatUnavailable() {
  setText("heartbeat-status", "unavailable");
  setText("heartbeat-timestamp", "—");
  setText("heartbeat-age", "—");
  const message = document.getElementById("heartbeat-message");
  const badge = document.getElementById("heartbeat-status-badge");
  const card = document.querySelector(".server-heartbeat");
  if (message) {
    message.textContent = "Server heartbeat not available yet.";
  }
  if (badge) {
    badge.textContent = "unavailable";
    badge.className = "status-badge unavailable";
  }
  if (card) {
    card.classList.remove("heartbeat-ok", "heartbeat-warning");
    card.classList.add("heartbeat-error");
  }
}

function renderHeartbeatStatus(result, now = new Date()) {
  const timestamp = result?.timestamp;
  const date = new Date(timestamp);
  if (!timestamp || Number.isNaN(date.getTime())) {
    renderHeartbeatUnavailable();
    return;
  }

  const ageMs = now.getTime() - date.getTime();
  const isError = ageMs > 24 * 60 * 60 * 1000;
  const isWarning = ageMs > 2 * 60 * 60 * 1000;
  const state = isError ? "error" : isWarning ? "warning" : "ok";
  const badgeClass = isError ? "unavailable" : isWarning ? "partial" : "ok";

  setText("heartbeat-status", "alive");
  setText("heartbeat-timestamp", formatDateTimeUtc(timestamp));
  setText("heartbeat-age", formatRelativeAge(timestamp, now));

  const message = document.getElementById("heartbeat-message");
  const badge = document.getElementById("heartbeat-status-badge");
  const card = document.querySelector(".server-heartbeat");
  if (message) {
    message.textContent = `Latest heartbeat file: ${result.filename || "heartbeat.json"}`;
  }
  if (badge) {
    badge.textContent = isError ? "stale" : isWarning ? "old" : "alive";
    badge.className = `status-badge ${badgeClass}`;
  }
  if (card) {
    card.classList.remove("heartbeat-ok", "heartbeat-warning", "heartbeat-error");
    card.classList.add(`heartbeat-${state}`);
  }
}

async function renderServerHeartbeat() {
  try {
    renderHeartbeatStatus(await loadLatestHeartbeat());
  } catch (error) {
    console.warn("Server heartbeat not available", error);
    renderHeartbeatUnavailable();
  }
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
  const byId = new Map();

  if (!history) {
    return byId;
  }

  const addPoints = (id, points) => {
    if (!id) {
      return;
    }
    byId.set(String(id), normalizeObserverHistoryPoints(points));
  };

  const rawObservers = normalizeCollection(history);
  if (rawObservers.length) {
    rawObservers.forEach((observer) => {
      const id = getObserverId(observer);
      addPoints(id, observer.history || observer.points || observer.data || observer.values || []);
    });
  }

  Object.entries(history.history || history.observers_history || history.observers || history.data || {}).forEach(([id, points]) => {
    addPoints(id, points);
  });

  return byId;
}

function getNestedValue(source, path) {
  return String(path)
    .split(".")
    .reduce((value, key) => (value && value[key] !== undefined ? value[key] : undefined), source);
}

function firstFiniteMetricValue(source, keys) {
  for (const key of keys) {
    const rawValue = getNestedValue(source, key);
    const value = Number(rawValue);
    if (Number.isFinite(value)) {
      return value;
    }
  }

  return null;
}

function normalizeObserverHistoryPoints(points) {
  return (Array.isArray(points) ? points : [])
    .map((point, index) => ({
      date: point.date || point.last_seen || point.last_update || point.timestamp || point.observed_at || `Point ${index + 1}`,
      value: firstFiniteMetricValue(point, [
        "value",
        "primary_metric.value",
        "metric_value",
        "uptime",
        "availability",
        "latency_ms",
        "response_time_ms",
        "status_code",
      ]),
    }))
    .filter((point) => Number.isFinite(point.value));
}

function getObserverId(observer) {
  return String(observer.id || observer.observer_id || observer.name || observer.slug || observer.display_name || observer.observer || "internet-observer");
}

function normalizeStatusClass(value) {
  const status = String(value || "unknown").toLowerCase().replace(/[^a-z0-9-]/g, "-");
  if (["ok", "active", "available", "online", "healthy", "published"].includes(status)) {
    return "ok";
  }
  if (["partial", "degraded", "warning", "stale", "limited"].includes(status)) {
    return "partial";
  }
  if (["unavailable", "missing", "error", "offline", "failed"].includes(status)) {
    return "unavailable";
  }
  return status;
}

function getPrimaryMetric(observer) {
  const metric = observer.primary_metric || observer.primaryMetric;
  if (metric && typeof metric === "object") {
    const label = metric.label || metric.name || metric.key || "primary metric";
    const value = metric.display_value ?? metric.formatted ?? metric.value;
    const unit = metric.unit && metric.display_value === undefined && metric.formatted === undefined ? ` ${metric.unit}` : "";
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

function normalizeSecondaryMetrics(observer) {
  const source = observer.secondary_metrics || observer.secondaryMetrics || observer.metrics || [];

  if (Array.isArray(source)) {
    return source.map((metric, index) => {
      if (metric && typeof metric === "object") {
        return {
          label: metric.label || metric.name || metric.key || `metric ${index + 1}`,
          value: metric.display_value ?? metric.formatted ?? metric.value ?? "—",
          unit: metric.unit && metric.display_value === undefined && metric.formatted === undefined ? ` ${metric.unit}` : "",
        };
      }
      return { label: `metric ${index + 1}`, value: metric ?? "—", unit: "" };
    });
  }

  return Object.entries(source || {}).map(([label, value]) => {
    if (value && typeof value === "object") {
      return {
        label: value.label || value.name || label,
        value: value.display_value ?? value.formatted ?? value.value ?? "—",
        unit: value.unit && value.display_value === undefined && value.formatted === undefined ? ` ${value.unit}` : "",
      };
    }
    return { label, value: value ?? "—", unit: "" };
  });
}

function formatMetricValue(metric) {
  return `${metric.value ?? "—"}${metric.value == null || metric.value === "—" ? "" : metric.unit || ""}`;
}

function getLastUpdate(observer, data) {
  return observer.last_update || observer.last_seen || observer.timestamp || observer.observed_at || data?.last_update || data?.generated_at;
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString().slice(0, 10);
}

function getDashboardVersion(summary) {
  return summary.dashboard_version || summary.version || summary.schema_version || "static";
}

function collectHistoryDates(history, pointNormalizer) {
  if (!history) {
    return [];
  }

  return pointNormalizer(history)
    .map((point) => formatDate(point.date))
    .filter((date) => date && date !== "—");
}

function countObservedDays(mediaHistory, internetHistory) {
  const days = new Set(collectHistoryDates(mediaHistory, normalizeHistoryPoints));

  if (internetHistory) {
    normalizeInternetHistory(internetHistory).forEach((points) => {
      points.forEach((point) => {
        const day = formatDate(point.date);
        if (day && day !== "—") {
          days.add(day);
        }
      });
    });
  }

  return days.size;
}

function renderObservedDays(mediaHistory, internetHistory) {
  const card = document.getElementById("observer-days-card");
  const count = countObservedDays(mediaHistory, internetHistory);

  if (!card) {
    return;
  }

  card.hidden = count === 0;
  if (count > 0) {
    setText("observer-days-observed", formatNumber(count));
  }
}

function renderMiniSparkline(points, label) {
  const wrap = document.createElement("div");
  wrap.className = "mini-sparkline";

  if (!points.length) {
    wrap.textContent = "No historical trend available.";
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

  if (points.length === 1) {
    const [cx, cy] = coordinates[0].split(",");
    const marker = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    marker.setAttribute("cx", cx);
    marker.setAttribute("cy", cy);
    marker.setAttribute("r", "3.5");
    marker.setAttribute("class", "sparkline-point");
    svg.appendChild(marker);
  }

  wrap.appendChild(svg);
  return wrap;
}

function renderMetricList(metrics, className = "internet-secondary-metrics") {
  const list = document.createElement("dl");
  list.className = className;

  if (!metrics.length) {
    const term = document.createElement("dt");
    term.textContent = "secondary metrics";
    const description = document.createElement("dd");
    description.textContent = "—";
    list.append(term, description);
    return list;
  }

  metrics.forEach((metric) => {
    const term = document.createElement("dt");
    term.textContent = metric.label;
    const description = document.createElement("dd");
    description.textContent = formatMetricValue(metric);
    list.append(term, description);
  });

  return list;
}

function renderInternetObservers(data, history) {
  const container = document.getElementById("internet-observer-cards");
  const status = document.getElementById("internet-observer-status");
  if (!container || !status) {
    return;
  }
  container.textContent = "";

  const observers = normalizeCollection(data)
    .slice()
    .sort((a, b) => Number(a.dashboard_priority ?? a.priority ?? 9999) - Number(b.dashboard_priority ?? b.priority ?? 9999));
  const historyById = history ? normalizeInternetHistory(history) : new Map();

  if (!data || !observers.length) {
    status.innerHTML = `<strong>No Internet observer data published yet.</strong><br>The first observation will appear after the initial daily run.`;
    return;
  }

  status.textContent = history ? "" : "Current cards loaded. Historical trend file is not available yet.";

  observers.forEach((observer, index) => {
    const id = getObserverId(observer);
    const titleText = observer.display_name || observer.name || observer.observer || id || "Internet Observer";
    const primaryMetric = getPrimaryMetric(observer);
    const secondaryMetrics = normalizeSecondaryMetrics(observer);
    const points = historyById.get(id) || historyById.get(titleText) || [];
    const lastUpdate = formatDate(getLastUpdate(observer, data));
    const detailsId = `internet-observer-details-${index}`;

    const card = document.createElement("article");
    card.className = "internet-observer-card";

    const toggle = document.createElement("button");
    toggle.className = "internet-card-toggle";
    toggle.type = "button";
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-controls", detailsId);

    const header = document.createElement("div");
    header.className = "internet-card-header";

    const title = document.createElement("h3");
    title.textContent = titleText;

    const observerStatus = String(observer.status || observer.health || "unknown");
    const dataStatus = String(observer.data_status || "published");
    const badges = document.createElement("div");
    badges.className = "internet-card-badges";

    [observerStatus, dataStatus].forEach((badgeText) => {
      const badge = document.createElement("span");
      badge.className = `status-badge ${normalizeStatusClass(badgeText)}`;
      badge.textContent = badgeText;
      badges.appendChild(badge);
    });

    header.append(title, badges);

    const metric = document.createElement("p");
    metric.className = "internet-primary-metric";

    const metricLabel = document.createElement("span");
    metricLabel.textContent = primaryMetric.label;

    const metricValue = document.createElement("strong");
    metricValue.textContent = formatMetricValue(primaryMetric);

    metric.append(metricLabel, metricValue);

    const secondarySummary = renderMetricList(secondaryMetrics.slice(0, 4), "internet-secondary-metrics compact");

    const lastSeen = document.createElement("p");
    lastSeen.className = "internet-last-seen";
    lastSeen.textContent = `Last update: ${lastUpdate}`;

    toggle.append(header, metric, secondarySummary, lastSeen, renderMiniSparkline(points, titleText));

    const details = document.createElement("div");
    details.className = "internet-card-details";
    details.id = detailsId;
    details.hidden = true;

    const meta = document.createElement("dl");
    meta.className = "internet-detail-list";
    [
      ["observer id", id],
      ["last update", lastUpdate],
      ["history point count", formatNumber(points.length)],
    ].forEach(([label, value]) => {
      const term = document.createElement("dt");
      term.textContent = label;
      const description = document.createElement("dd");
      description.textContent = value;
      meta.append(term, description);
    });

    const secondaryTitle = document.createElement("h4");
    secondaryTitle.textContent = "Secondary metrics";
    details.append(meta, secondaryTitle, renderMetricList(secondaryMetrics, "internet-secondary-metrics details"));

    toggle.addEventListener("click", () => {
      const expanded = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!expanded));
      details.hidden = expanded;
      card.classList.toggle("expanded", !expanded);
    });

    card.append(toggle, details);
    container.appendChild(card);
  });
}

function renderCategories(categories) {
  const container = document.getElementById("observer-categories");
  if (!container) {
    return;
  }
  container.textContent = "";

  categories.forEach((category) => {
    const key = category.name?.toLowerCase();
    const card = document.createElement("a");
    card.className = `card observer-category ${category.status || "unknown"}`;
    card.href = CATEGORY_LINKS[key] || "/world-observer.html";
    card.setAttribute("aria-label", `Open ${category.name || "observer"} observer category`);

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

function renderMediaLists(media = {}) {
  const terms = document.getElementById("media-top-terms");
  if (!terms) {
    return;
  }
  terms.textContent = "";
  (media.top_terms || []).forEach((term) => {
    const item = document.createElement("li");
    item.textContent = term;
    terms.appendChild(item);
  });

  const counts = document.getElementById("media-category-counts");
  if (!counts) {
    return;
  }
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
  if (!container) {
    return;
  }
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
  if (!status) {
    return;
  }

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

function renderDashboard(summary = {}, media = {}, mediaHistory, internet, internetHistory) {
  setText("observer-last-update", summary.last_update);
  setText("observer-total", formatNumber(summary.total_observers));
  setText("observer-missing", formatNumber(summary.missing_observers));
  setText("observer-degraded", formatNumber(summary.degraded_observers));
  setText("observer-version", getDashboardVersion(summary));
  renderObservedDays(mediaHistory, internetHistory);
  renderServerHeartbeat();

  renderInternetObservers(internet, internetHistory);

  setText("media-fear-overall", formatIndex(media.fear_index_overall));
  setText("media-public-fear", formatIndex(media.public_broadcast?.fear_index));
  setText("media-private-fear", formatIndex(media.private_media?.fear_index));
  setText("media-headline-count", formatNumber(media.headline_count));
  renderMediaLists(media);
  renderMediaTrend(mediaHistory);
}

function showFallback(message = "World Observer data not available yet.") {
  const dashboard = document.getElementById("observer-dashboard");
  const fallback = document.getElementById("observer-fallback");
  if (dashboard) {
    dashboard.hidden = true;
  }
  if (fallback) {
    fallback.textContent = message;
    fallback.hidden = false;
  }
}

function showDashboard() {
  const dashboard = document.getElementById("observer-dashboard");
  if (dashboard) {
    dashboard.hidden = false;
  }
}

function renderPlannedCards(id, items) {
  const container = document.getElementById(id);
  if (!container) {
    return;
  }
  container.textContent = "";
  items.forEach((item) => {
    const card = document.createElement("article");
    card.className = "card observer-category planned";
    const title = document.createElement("h3");
    title.textContent = item;
    const status = document.createElement("p");
    status.innerHTML = "<strong>Status:</strong> planned";
    const description = document.createElement("p");
    description.textContent = "Observer card planned. Data will appear here once a public export is available.";
    card.append(title, status, description);
    container.appendChild(card);
  });
}

async function initWorldObserver() {
  const page = document.body.dataset.observerPage || "overview";

  try {
    if (page === "society") {
      renderPlannedCards("society-planned-cards", ["Fuel", "Electricity", "Food", "Housing", "Deutsche Bahn", "Deutsche Post"]);
      showDashboard();
      return;
    }

    if (page === "environment") {
      renderPlannedCards("environment-planned-cards", ["Weather", "Climate", "Natural disasters"]);
      showDashboard();
      return;
    }

    if (page === "internet") {
      const [internet, internetHistory] = await Promise.all([
        loadOptionalJson(INTERNET_URLS),
        loadOptionalJson(INTERNET_HISTORY_URLS),
      ]);
      renderInternetObservers(internet, internetHistory);
      showDashboard();
      return;
    }

    if (page === "media") {
      const [media, mediaHistory] = await Promise.all([
        loadOptionalJson(MEDIA_URLS),
        loadOptionalJson(MEDIA_HISTORY_URLS),
      ]);
      if (!media) {
        showFallback("Media observer data not available yet.");
        return;
      }
      setText("media-fear-overall", formatIndex(media.fear_index_overall));
      setText("media-public-fear", formatIndex(media.public_broadcast?.fear_index));
      setText("media-private-fear", formatIndex(media.private_media?.fear_index));
      setText("media-headline-count", formatNumber(media.headline_count));
      renderMediaLists(media);
      renderMediaTrend(mediaHistory);
      showDashboard();
      return;
    }

    const [summary, media, mediaHistory, internet, internetHistory] = await Promise.all([
      loadOptionalJson(SUMMARY_URLS),
      loadOptionalJson(MEDIA_URLS),
      loadOptionalJson(MEDIA_HISTORY_URLS),
      loadOptionalJson(INTERNET_URLS),
      loadOptionalJson(INTERNET_HISTORY_URLS),
    ]);
    if (!summary) {
      showFallback();
      return;
    }
    renderDashboard(summary, media || {}, mediaHistory, internet, internetHistory);
    showDashboard();
  } catch (error) {
    console.warn(error);
    showFallback();
  }
}

initWorldObserver();
