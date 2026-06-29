const SUMMARY_URL = "world-observer/latest/summary.json";
const MEDIA_URL = "world-observer/latest/media-language-germany.json";

async function loadJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status}`);
  }
  return response.json();
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

function renderDashboard(summary, media) {
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
}

function showFallback() {
  document.getElementById("observer-dashboard").hidden = true;
  document.getElementById("observer-fallback").hidden = false;
}

async function initWorldObserver() {
  try {
    const [summary, media] = await Promise.all([
      loadJson(SUMMARY_URL),
      loadJson(MEDIA_URL),
    ]);
    renderDashboard(summary, media);
    document.getElementById("observer-dashboard").hidden = false;
  } catch (error) {
    console.warn(error);
    showFallback();
  }
}

initWorldObserver();
