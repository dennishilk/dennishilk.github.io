function buildDashboardUrls(filename) {
  return [
    `world-observer/dashboard/${filename}`,
    `./world-observer/dashboard/${filename}`,
    `/world-observer/dashboard/${filename}`,
    `dashboard/${filename}`,
  ];
}

const SUMMARY_URLS = buildDashboardUrls("summary.json");
const MEDIA_URLS = [
  ...buildDashboardUrls("media.json"),
  "/world-observer/latest/media-language-germany.json",
  "world-observer/latest/media-language-germany.json",
  "./world-observer/latest/media-language-germany.json",
  "latest/media-language-germany.json",
];
const MEDIA_HISTORY_URLS = buildDashboardUrls("history/media-language-germany.json");
const INTERNET_URLS = buildDashboardUrls("internet.json");
const INTERNET_HISTORY_URLS = buildDashboardUrls("history/internet-observers.json");
const HEARTBEAT_URLS = buildDashboardUrls("heartbeat.json");
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
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toISOString().slice(0, 16).replace("T", " ") + " UTC";
}

function formatRelativeAge(timestamp, now = new Date()) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  const seconds = Math.max(0, Math.round((now.getTime() - date.getTime()) / 1000));
  const units = [
    ["d", 86400],
    ["h", 3600],
    ["min", 60],
  ];

  for (const [unit, unitSeconds] of units) {
    const value = Math.floor(seconds / unitSeconds);
    if (value >= 1) {
      return `${value} ${unit} ago`;
    }
  }

  return "just now";
}

function getHeartbeatFreshness(timestamp, now = new Date()) {
  const date = new Date(timestamp);
  if (!timestamp || Number.isNaN(date.getTime())) {
    return { status: "offline", state: "error", badgeClass: "unavailable" };
  }

  const ageMs = now.getTime() - date.getTime();
  const hourMs = 60 * 60 * 1000;

  if (ageMs > 24 * hourMs) {
    return { status: "offline", state: "error", badgeClass: "unavailable" };
  }

  if (ageMs > 12 * hourMs) {
    return { status: "old", state: "warning", badgeClass: "partial" };
  }

  if (ageMs > 3 * hourMs) {
    return { status: "delayed", state: "warning", badgeClass: "partial" };
  }

  return { status: "alive", state: "ok", badgeClass: "ok" };
}

function normalizeHeartbeatFreshness(status) {
  const normalized = String(status || "").toLowerCase();
  return ["alive", "delayed", "old", "offline"].includes(normalized) ? normalized : null;
}

function chooseHeartbeatFreshness(heartbeat, timestamp, now = new Date()) {
  const computed = getHeartbeatFreshness(timestamp, now);
  const exported = normalizeHeartbeatFreshness(heartbeat?.freshness_status);

  if (exported && exported === computed.status) {
    return { ...computed, status: exported };
  }

  return computed;
}

function getHeartbeatTimestamp(heartbeat) {
  return heartbeat?.latest_heartbeat_utc || heartbeat?.timestamp || heartbeat?.heartbeat_at || heartbeat?.generated_at || heartbeat?.last_update || heartbeat?.time || null;
}

async function loadHeartbeatFromDashboardExport() {
  const heartbeat = await loadOptionalJson(HEARTBEAT_URLS);
  return heartbeat ? { filename: "dashboard/heartbeat.json", heartbeat, timestamp: getHeartbeatTimestamp(heartbeat), source: "dashboard" } : null;
}

async function loadHeartbeatFromGithubApi() {
  const contents = await loadJson(HEARTBEAT_CONTENTS_URL);
  const files = (Array.isArray(contents) ? contents : [])
    .filter((item) => item.type === "file" && item.name?.endsWith(".json"))
    .sort((a, b) => String(b.name).localeCompare(String(a.name)));

  if (!files.length) {
    return null;
  }

  const newest = files[0];
  const heartbeat = newest.download_url ? await loadJson(newest.download_url) : null;
  return { filename: newest.name, heartbeat: heartbeat || {}, timestamp: getHeartbeatTimestamp(heartbeat) || newest.name.replace(/\.json$/i, ""), source: "github" };
}

async function loadLatestHeartbeat() {
  const dashboardHeartbeat = await loadHeartbeatFromDashboardExport();
  if (dashboardHeartbeat) {
    return dashboardHeartbeat;
  }

  return loadHeartbeatFromGithubApi();
}

function renderHeartbeatUnavailable() {
  setText("heartbeat-status", "offline");
  setText("heartbeat-timestamp", "—");
  setText("heartbeat-age", "—");
  const message = document.getElementById("heartbeat-message");
  const badge = document.getElementById("heartbeat-status-badge");
  const card = document.querySelector(".server-heartbeat");
  if (message) {
    message.textContent = "Server heartbeat not available yet.";
  }
  if (badge) {
    badge.textContent = "OFFLINE";
    badge.className = "status-badge unavailable";
  }
  if (card) {
    card.classList.remove("heartbeat-ok", "heartbeat-warning");
    card.classList.add("heartbeat-error");
  }
}

function renderHeartbeatStatus(result, now = new Date()) {
  const timestamp = result?.timestamp;
  const freshness = chooseHeartbeatFreshness(result?.heartbeat, timestamp, now);
  const date = new Date(timestamp);
  if (!timestamp || Number.isNaN(date.getTime())) {
    renderHeartbeatUnavailable();
    return;
  }

  setText("heartbeat-status", freshness.status);
  setText("heartbeat-timestamp", formatDateTimeUtc(timestamp));
  setText("heartbeat-age", formatRelativeAge(timestamp, now));

  const message = document.getElementById("heartbeat-message");
  const badge = document.getElementById("heartbeat-status-badge");
  const card = document.querySelector(".server-heartbeat");
  if (message) {
    const sourceLabel = result.source === "github" ? "GitHub API fallback" : "dashboard export";
    message.textContent = `Latest heartbeat from ${sourceLabel}: ${result.filename || "heartbeat.json"}`;
  }
  if (badge) {
    badge.textContent = freshness.status.toUpperCase();
    badge.className = `status-badge ${freshness.badgeClass}`;
  }
  if (card) {
    card.classList.remove("heartbeat-ok", "heartbeat-warning", "heartbeat-error");
    card.classList.add(`heartbeat-${freshness.state}`);
  }
}

async function renderServerHeartbeat() {
  try {
    renderHeartbeatStatus(await loadLatestHeartbeat());
  } catch (error) {
    logRendererError("heartbeat", error);
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

function formatDeltaPercent(value) {
  if (!Number.isFinite(value)) {
    return "—";
  }
  if (value === 0) {
    return "0.0%";
  }
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function formatTrendSummary(delta, deltaPercent) {
  const arrow = Number.isFinite(delta) ? (delta > 0 ? "↑" : delta < 0 ? "↓" : "→") : "—";
  const deltaText = formatDelta(delta);
  const percentText = formatDeltaPercent(deltaPercent);
  return percentText === "—" ? `${arrow} ${deltaText}` : `${arrow} ${deltaText} (${percentText})`;
}

function formatTermChangeDelta(value) {
  if (!Number.isFinite(value)) {
    return "";
  }
  return ` (${value > 0 ? "+" : ""}${formatNumber(value)})`;
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

  if (!data || typeof data !== "object") {
    return [];
  }

  const collection = data.observers || data.internet_observers || data.items || data.data || [];
  return Array.isArray(collection) ? collection : [];
}

function normalizeInternetHistory(history) {
  const byId = new Map();

  if (!history || typeof history !== "object") {
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
      const record = observer && typeof observer === "object" ? observer : {};
      addPoints(id, record.history || record.points || record.data || record.values || []);
    });
  }

  Object.entries(history.history || history.observers_history || history.observers || history.data || {}).forEach(([id, points]) => {
    const pointList = Array.isArray(points) ? points : points?.points || points?.history || points?.data || points?.values || [];
    addPoints(id, pointList);
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
  return (Array.isArray(points) ? points : []).map((point, index) => {
    const record = point && typeof point === "object" ? point : { value: point };
    return {
      date: record.date || record.last_seen || record.last_seen_date || record.last_update || record.timestamp || record.observed_at || `Point ${index + 1}`,
      value: firstFiniteMetricValue(record, [
        "value",
        "primary_metric.value",
        "primary_metric_value",
        "metric_value",
        "uptime",
        "availability",
        "latency_ms",
        "response_time_ms",
        "status_code",
      ]),
    };
  });
}

function numericHistoryPoints(points) {
  return points.filter((point) => Number.isFinite(point.value));
}

function slugifyObserverName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getObserverLookupKeys(observer) {
  if (!observer || typeof observer !== "object") {
    return ["internet-observer"];
  }

  return [
    observer.observer,
    observer.id,
    observer.observer_id,
    slugifyObserverName(observer.display_name),
  ]
    .filter((value) => value !== undefined && value !== null && value !== "")
    .map(String);
}

function getObserverId(observer) {
  return getObserverLookupKeys(observer)[0] || "internet-observer";
}

function normalizeStatusValue(value) {
  return String(value || "unknown").toLowerCase().replace(/[^a-z0-9-]/g, "-");
}

function normalizeStatusClass(value) {
  const status = normalizeStatusValue(value);
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

function formatInternetStatusLabel(value) {
  const status = normalizeStatusValue(value);
  if (status === "ok" || status === "published") {
    return "OK";
  }
  if (status === "partial") {
    return "PARTIAL";
  }
  if (status === "unavailable" || status === "error") {
    return "UNAVAILABLE";
  }
  return String(value || "unknown").toUpperCase();
}

function hasUnavailableInternetSignal(observer) {
  return [observer.data_status, observer.status].some((value) => {
    const status = normalizeStatusValue(value);
    return status === "unavailable" || status === "error";
  });
}

function prepareInternetPrimaryMetric(metric, observer) {
  const label = String(metric.label || "");
  const value = metric.value;
  const normalizedValue = normalizeStatusValue(value);

  if (label === "data_status" && normalizedValue === "error") {
    return { ...metric, label: "current signal", value: "unavailable" };
  }

  if (normalizedValue === "error") {
    return { ...metric, value: "unavailable" };
  }

  if (label === "data_status" && ["ok", "partial", "unavailable"].includes(normalizedValue)) {
    return { ...metric, label: "current signal", value: formatInternetStatusLabel(value) };
  }

  if (hasUnavailableInternetSignal(observer) && (value === null || value === undefined || value === "")) {
    return { ...metric, value: "no current signal" };
  }

  return metric;
}

function getPrimaryMetric(observer) {
  const metric = observer.primary_metric || observer.primaryMetric;
  if (metric && typeof metric === "object") {
    const label = metric.label || metric.name || metric.key || observer.primary_metric_name || "primary metric";
    const value = metric.display_value ?? metric.formatted ?? metric.value;
    const unit = metric.unit && metric.display_value === undefined && metric.formatted === undefined ? ` ${metric.unit}` : "";
    return { label, value: value ?? null, unit };
  }

  if (observer.primary_metric_name || observer.primary_metric_value !== undefined) {
    return {
      label: observer.primary_metric_name || "primary metric",
      value: observer.primary_metric_value ?? null,
      unit: "",
    };
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
  if (!observer || typeof observer !== "object") {
    return [];
  }

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

  if (!source || typeof source !== "object") {
    return [];
  }

  return Object.entries(source).map(([label, value]) => {
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
  const value = metric?.value;
  if (value === null || value === undefined) {
    return "—";
  }
  if (typeof value === "number") {
    return `${formatNumber(value)}${metric.unit || ""}`;
  }
  return `${String(value)}${value === "—" ? "" : metric.unit || ""}`;
}

function getLastUpdate(observer, data) {
  return observer.last_seen_date || observer.last_update || observer.last_seen || observer.timestamp || observer.observed_at || data?.last_seen_date || data?.last_update || data?.generated_at;
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

function renderMiniSparkline(points, label, emptyMessage = "Collecting trend data...") {
  const wrap = document.createElement("div");
  wrap.className = "mini-sparkline";

  if (!points.length) {
    wrap.textContent = emptyMessage;
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

function findInternetHistoryRecord(history, observer) {
  if (!history) {
    return null;
  }

  const candidates = getObserverLookupKeys(observer);
  const collections = [history.history, history.observers_history, history.observers, history.data];

  for (const collection of collections) {
    if (!collection || Array.isArray(collection) || typeof collection !== "object") {
      continue;
    }

    for (const candidate of candidates) {
      if (collection[candidate]) {
        return collection[candidate];
      }
    }
  }

  return normalizeCollection(history).find((historyObserver) => {
    const historyKeys = getObserverLookupKeys(historyObserver);
    return candidates.some((candidate) => historyKeys.includes(candidate));
  }) || null;
}

function getHistoryCount(record, key, fallback) {
  const value = Number(record?.[key]);
  return Number.isFinite(value) ? value : fallback;
}

function getTrendEmptyMessage(totalPointCount, numericPointCount) {
  if (totalPointCount === 0 || numericPointCount === 0) {
    return "Trend starts after multiple observations.";
  }

  return "Collecting trend data...";
}

function finiteHistoryValue(record, key) {
  const value = Number(record?.[key]);
  return Number.isFinite(value) ? value : null;
}

function formatTrendNumber(value) {
  if (!Number.isFinite(value)) {
    return "—";
  }

  return Number.isInteger(value) ? value.toLocaleString() : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function getTrendDirectionArrow(direction, delta) {
  const normalizedDirection = String(direction || "").toLowerCase();
  if (normalizedDirection === "up") {
    return "↑";
  }
  if (normalizedDirection === "down") {
    return "↓";
  }
  if (normalizedDirection === "flat") {
    return "→";
  }
  if (Number.isFinite(delta)) {
    return delta > 0 ? "↑" : delta < 0 ? "↓" : "→";
  }
  return "→";
}

function renderInternetTrendSummary(record, points, label, emptyMessage) {
  const numericPointCount = finiteHistoryValue(record, "numeric_point_count") ?? points.length;

  if (numericPointCount < 2) {
    return renderMiniSparkline(points, label, emptyMessage);
  }

  const delta = finiteHistoryValue(record, "delta");
  const deltaPercent = finiteHistoryValue(record, "delta_percent");
  const thirtyDayAverage = finiteHistoryValue(record, "thirty_day_average");
  const unit = record?.metric_unit && !["count", "score"].includes(String(record.metric_unit).toLowerCase()) ? String(record.metric_unit) : "";
  const unitSuffix = unit ? ` ${unit}` : "";
  const wrap = document.createElement("div");
  wrap.className = "internet-trend-summary mini-sparkline";

  const labelLine = document.createElement("p");
  labelLine.className = "internet-trend-label";
  labelLine.textContent = "Trend";
  wrap.appendChild(labelLine);

  const trend = document.createElement("p");
  trend.className = "internet-trend-line";
  const parts = [getTrendDirectionArrow(record?.direction, delta)];
  if (delta !== null) {
    parts.push(`${formatTrendNumber(delta)}${unitSuffix}`);
  }
  if (deltaPercent !== null) {
    parts.push(`(${formatTrendNumber(deltaPercent)}%)`);
  }
  trend.textContent = parts.join(" ");
  wrap.appendChild(trend);

  if (thirtyDayAverage !== null) {
    const averageLine = document.createElement("p");
    averageLine.className = "internet-trend-subline";
    averageLine.textContent = `30d average - ${formatTrendNumber(thirtyDayAverage)}${unitSuffix}`;
    wrap.appendChild(averageLine);
  }

  return wrap;
}

function renderInternetObserverFallback(container, observer, index, error) {
  const card = document.createElement("article");
  card.className = "internet-observer-card signal-unavailable";

  const title = document.createElement("h3");
  title.textContent = observer && typeof observer === "object"
    ? observer.display_name || observer.name || observer.observer || getObserverId(observer)
    : `Internet Observer ${index + 1}`;

  const message = document.createElement("p");
  message.className = "internet-signal-note";
  message.textContent = "This observer could not be rendered, but other observers are still available.";

  console.error("Failed to render Internet observer card", { observer, error });
  card.append(title, message);
  container.appendChild(card);
}

function renderInternetObservers(data, history) {
  const container = document.getElementById("internet-observer-cards");
  const status = document.getElementById("internet-observer-status");
  if (!container) {
    console.error("Cannot render Internet observers: #internet-observer-cards is missing.");
    return;
  }
  if (!status) {
    console.error("Cannot render Internet observers: #internet-observer-status is missing.");
    return;
  }
  container.textContent = "";

  const observers = normalizeCollection(data)
    .slice()
    .sort((a, b) => Number(a?.dashboard_priority ?? a?.priority ?? 9999) - Number(b?.dashboard_priority ?? b?.priority ?? 9999));
  const historyById = history ? normalizeInternetHistory(history) : new Map();

  if (!data || !observers.length) {
    status.innerHTML = `<strong>No Internet observer data published yet.</strong><br>The first observation will appear after the initial daily run.`;
    return;
  }

  status.textContent = history ? "" : "Current cards loaded. Historical trend file is not available yet.";

  observers.forEach((rawObserver, index) => {
    try {
      const observer = rawObserver && typeof rawObserver === "object" ? rawObserver : { display_name: String(rawObserver || `Internet Observer ${index + 1}`) };
      const id = getObserverId(observer);
      const historyKeys = getObserverLookupKeys(observer);
      const titleText = observer.display_name || observer.name || observer.observer || id || "Internet Observer";
      const primaryMetric = prepareInternetPrimaryMetric(getPrimaryMetric(observer), observer);
      const secondaryMetrics = normalizeSecondaryMetrics(observer);
      const points = historyKeys.map((key) => historyById.get(key)).find(Boolean) || [];
      const numericPoints = numericHistoryPoints(points);
      const historyRecord = findInternetHistoryRecord(history, observer);
      const totalPointCount = getHistoryCount(historyRecord, "total_point_count", points.length);
      const numericPointCount = getHistoryCount(historyRecord, "numeric_point_count", numericPoints.length);
      const trendEmptyMessage = getTrendEmptyMessage(totalPointCount, numericPointCount);
      const lastUpdate = formatDate(getLastUpdate(observer, data));
      const detailsId = `internet-observer-details-${index}`;

      const card = document.createElement("article");
      card.className = "internet-observer-card";
      if (hasUnavailableInternetSignal(observer)) {
        card.classList.add("signal-unavailable");
      }

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
        badge.textContent = formatInternetStatusLabel(badgeText);
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

      const signalNote = document.createElement("p");
      signalNote.className = "internet-signal-note";
      signalNote.textContent = "Observer ran, but no usable signal was available in the latest export.";
      signalNote.hidden = !hasUnavailableInternetSignal(observer);

      const secondarySummary = renderMetricList(secondaryMetrics.slice(0, 3), "internet-secondary-metrics compact");

      const lastSeen = document.createElement("p");
      lastSeen.className = "internet-last-seen";
      lastSeen.textContent = `Last update: ${lastUpdate}`;

      toggle.append(header, metric, signalNote, secondarySummary, lastSeen, renderInternetTrendSummary(historyRecord, numericPoints, titleText, trendEmptyMessage));

      const details = document.createElement("div");
      details.className = "internet-card-details";
      details.id = detailsId;
      details.hidden = true;

      const meta = document.createElement("dl");
      meta.className = "internet-detail-list";
      [
        ["Observer", id],
        ["Last update", lastUpdate],
        ["History points", formatNumber(totalPointCount)],
        ["Numeric trend points", formatNumber(numericPointCount)],
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
    } catch (error) {
      renderInternetObserverFallback(container, rawObserver, index, error);
    }
  });
}

function normalizeCategories(categories) {
  if (Array.isArray(categories)) {
    return categories;
  }

  if (categories && typeof categories === "object") {
    return Object.entries(categories).map(([name, observers]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      status: Number(observers) > 0 ? "active" : "planned",
      observers: Number(observers),
      description: Number(observers) > 0 ? "Observer data is available for this category." : "Observer card planned. Data will appear here once a public export is available.",
    }));
  }

  return [];
}

function renderCategories(categories) {
  const container = document.getElementById("observer-categories");
  if (!container) {
    return;
  }
  container.textContent = "";

  normalizeCategories(categories).forEach((category) => {
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

function formatTopTerm(term) {
  if (term && typeof term === "object") {
    const label = term.term ?? term.label ?? term.name ?? term.value ?? "—";
    return term.count === null || term.count === undefined ? String(label) : `${label} × ${formatNumber(Number(term.count))}`;
  }
  return String(term ?? "—");
}

function formatMediaCategoryName(category) {
  const categoryNames = {
    climate: "Climate",
    crime: "Crime",
    disaster: "Disaster",
    economy: "Economy",
    general_alarm: "General Alarm",
    health: "Health",
    political_pressure: "Political Pressure",
    war_security: "War & Security",
  };

  return categoryNames[category] || String(category ?? "—");
}

function renderMediaLists(media = {}) {
  const terms = document.getElementById("media-top-terms");
  if (!terms) {
    return;
  }
  terms.textContent = "";
  (media.top_terms || []).forEach((term) => {
    const item = document.createElement("li");
    item.textContent = formatTopTerm(term);
    terms.appendChild(item);
  });

  const counts = document.getElementById("media-category-counts");
  if (!counts) {
    return;
  }
  counts.textContent = "";
  Object.entries(media.category_counts || {}).forEach(([category, value]) => {
    const term = document.createElement("dt");
    term.textContent = formatMediaCategoryName(category);

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

function renderTermChangeGroup(container, title, arrow, terms) {
  if (!Array.isArray(terms) || !terms.length) {
    return;
  }

  const group = document.createElement("article");
  group.className = "term-change-card";

  const heading = document.createElement("h4");
  heading.textContent = title;

  const list = document.createElement("ul");
  list.className = "term-change-list";
  terms.forEach((change) => {
    const item = document.createElement("li");
    item.textContent = `${arrow} ${change.term ?? "—"}${formatTermChangeDelta(Number(change.delta))}`;
    list.appendChild(item);
  });

  group.append(heading, list);
  container.appendChild(group);
}

function renderObservedChanges(history) {
  const summariesList = document.getElementById("media-observed-summaries");
  const changesContainer = document.getElementById("media-term-changes");
  if (!summariesList || !changesContainer) {
    return;
  }

  summariesList.textContent = "";
  changesContainer.textContent = "";

  const summaries = history?.summaries || history?.neutral_summaries || [];
  summaries.forEach((summary) => {
    const item = document.createElement("li");
    item.textContent = summary;
    summariesList.appendChild(item);
  });

  const termChanges = history?.term_changes || {};
  renderTermChangeGroup(changesContainer, "Trending terms", "↑", termChanges.rising_terms);
  renderTermChangeGroup(changesContainer, "Less frequent terms", "↓", termChanges.falling_terms);
}

function renderMediaTrend(history) {
  const status = document.getElementById("media-trend-status");
  if (!status) {
    return;
  }

  if (!history) {
    setText("media-trend-direction", "—");
    setText("media-trend-30d", "—");
    setText("media-trend-spread", "—");
    status.textContent = "Media trend history is not available yet.";
    renderSparkline([]);
    renderObservedChanges(null);
    return;
  }

  const points = normalizeHistoryPoints(history);
  if (!points.length) {
    setText("media-trend-direction", "—");
    setText("media-trend-30d", "—");
    setText("media-trend-spread", "—");
    status.textContent = "Media trend history has no usable fear index points yet.";
    renderSparkline([]);
    renderObservedChanges(history);
    return;
  }

  const latest = points.at(-1)?.fearIndex;
  const previous = points.at(-2)?.fearIndex;
  const computedDelta = Number.isFinite(latest) && Number.isFinite(previous) ? latest - previous : null;
  const trend = history.trend || {};
  const comparison = history.public_private_comparison || {};
  const delta = Number.isFinite(Number(trend.delta)) ? Number(trend.delta) : computedDelta;
  const deltaPercent = Number.isFinite(Number(trend.delta_percent)) ? Number(trend.delta_percent) : null;
  const thirtyDayAverage = Number.isFinite(Number(trend.thirty_day_average))
    ? Number(trend.thirty_day_average)
    : average(points.slice(-30).map((point) => point.fearIndex));
  const spread = Number.isFinite(Number(comparison.public_private_spread))
    ? Number(comparison.public_private_spread)
    : null;

  setText("media-trend-direction", formatTrendSummary(delta, deltaPercent));
  setText("media-trend-30d", formatIndex(thirtyDayAverage));
  setText("media-trend-spread", formatDelta(spread));

  status.textContent = points.length === 1 ? "Trend starts today." : "";
  renderSparkline(points);
  renderObservedChanges(history);
}

function logRendererError(rendererName, error) {
  console.error(`World Observer ${rendererName} renderer failed`, error);
}

function renderOptional(rendererName, render) {
  try {
    return render();
  } catch (error) {
    logRendererError(rendererName, error);
    return null;
  }
}

function getSummaryCount(summary, countKey, legacyKey) {
  const count = summary?.[countKey];
  if (Number.isFinite(Number(count))) {
    return Number(count);
  }

  const legacy = summary?.[legacyKey];
  if (Array.isArray(legacy)) {
    return legacy.length;
  }

  return Number(legacy);
}

function renderOverview(summary = {}, mediaHistory, internetHistory) {
  setText("observer-last-update", summary.last_update || summary.last_run_utc || summary.generated_at || summary.latest_date_utc);
  setText("observer-total", formatNumber(getSummaryCount(summary, "observer_count", "total_observers")));
  setText("observer-missing", formatNumber(getSummaryCount(summary, "missing_count", "missing_observers")));
  setText("observer-degraded", formatNumber(getSummaryCount(summary, "degraded_count", "degraded_observers")));
  setText("observer-version", getDashboardVersion(summary));
  renderObservedDays(mediaHistory, internetHistory);
  renderCategories(summary.categories || []);
}

function renderHeartbeat() {
  return renderServerHeartbeat().catch((error) => {
    logRendererError("heartbeat", error);
  });
}

function renderDashboard(summary = {}, media = {}, mediaHistory, internet, internetHistory) {
  try {
    renderOptional("overview", () => renderOverview(summary, mediaHistory, internetHistory));
    renderHeartbeat();
    renderOptional("internet observers", () => renderInternetObservers(internet, internetHistory));

    renderOptional("media overview", () => {
      setText("media-fear-overall", formatIndex(media.fear_index_overall));
      setText("media-public-fear", formatIndex(media.public_broadcast?.fear_index));
      setText("media-private-fear", formatIndex(media.private_media?.fear_index));
      setText("media-headline-count", formatNumber(media.headline_count));
      renderMediaLists(media);
    });
    renderOptional("media trend", () => renderMediaTrend(mediaHistory));
  } catch (error) {
    console.error("World Observer renderDashboard failed", error);
  }
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
      renderOptional("internet observers", () => renderInternetObservers(internet, internetHistory));
      showDashboard();
      return;
    }

    if (page === "media") {
      const [media, mediaHistory] = await Promise.all([
        loadOptionalJson(MEDIA_URLS),
        loadOptionalJson(MEDIA_HISTORY_URLS),
      ]);
      if (!media) {
        console.error("World Observer media data failed to load");
        showDashboard();
        return;
      }
      setText("media-fear-overall", formatIndex(media.fear_index_overall));
      setText("media-public-fear", formatIndex(media.public_broadcast?.fear_index));
      setText("media-private-fear", formatIndex(media.private_media?.fear_index));
      setText("media-headline-count", formatNumber(media.headline_count));
      renderOptional("media overview", () => renderMediaLists(media));
      renderOptional("media trend", () => renderMediaTrend(mediaHistory));
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
    console.error("World Observer dashboard initialization failed", error);
    if (page === "overview") {
      showDashboard();
    }
  }
}

initWorldObserver();
