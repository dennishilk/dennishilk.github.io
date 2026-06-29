const SUMMARY_URL = "world-observer/latest/summary.json";
const MEDIA_URL = "world-observer/latest/media-language-germany.json";
const MEDIA_HISTORY_URLS = [
  "world-observer/dashboard/history/media-language-germany.json",
  "dashboard/history/media-language-germany.json",
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

function renderCategories(categories) {
  const container = document.getElementById("observer-categories");
  container.textContent = "";

  categories.forEach((category) => {
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

function renderDashboard(summary, media, mediaHistory) {
  setText("observer-last-update", summary.last_update);
  setText("observer-total", formatNumber(summary.total_observers));
  setText("observer-missing", formatNumber(summary.missing_observers));
  setText("observer-degraded", formatNumber(summary.degraded_observers));

  renderCategories(summary.categories || []);

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
    const [summary, media, mediaHistory] = await Promise.all([
      loadJson(SUMMARY_URL),
      loadJson(MEDIA_URL),
      loadOptionalJson(MEDIA_HISTORY_URLS),
    ]);
    renderDashboard(summary, media, mediaHistory);
    document.getElementById("observer-dashboard").hidden = false;
  } catch (error) {
    console.warn(error);
    showFallback();
  }
}

initWorldObserver();
