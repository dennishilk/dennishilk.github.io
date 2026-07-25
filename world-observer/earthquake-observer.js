import { WorldObserverMap } from "/assets/maps/world/world-map.js";

const DASHBOARD_URL = "/world-observer/dashboard/latest/earthquake-observer.json";
const STALE_AFTER_MS = 6 * 60 * 60 * 1000;
const valueIds = ["window", "latest", "largest", "count", "collected"];

function setState(state, message) {
  const status = document.getElementById("earthquake-data-status");
  status.className = `status-badge ${state}`;
  status.textContent = state.toUpperCase();
  document.getElementById("earthquake-loading-status").textContent = message;
}

function unavailable() {
  valueIds.forEach((id) => {
    document.getElementById(`earthquake-${id}`).textContent = "Awaiting export";
  });
}

function validCoordinate(value, minimum, maximum) {
  return Number.isFinite(value) && value >= minimum && value <= maximum;
}

function validateExport(data) {
  if (!data || typeof data !== "object" || !Array.isArray(data.events)) throw new Error("Invalid dashboard export");
  if (!data.collected_at || Number.isNaN(Date.parse(data.collected_at))) throw new Error("Invalid collection timestamp");
  data.events.forEach((event) => {
    if (!event || !validCoordinate(event.latitude, -90, 90) || !validCoordinate(event.longitude, -180, 180)) {
      throw new Error("Invalid event coordinates");
    }
  });
  return data;
}

function formatEvent(event) {
  if (!event) return "Event unavailable";
  const magnitude = Number.isFinite(event.magnitude) ? `M ${event.magnitude.toFixed(1)}` : "Magnitude unavailable";
  return event.place ? `${magnitude} · ${event.place}` : magnitude;
}

const MAGNITUDE_STYLES = [
  { minimum: 6, color: "#ed7770" },
  { minimum: 5, color: "#e9a15d" },
  { minimum: 4, color: "#e5cf68" },
  { minimum: 3, color: "#77c98a" },
  { minimum: 2, color: "#55cbd5" },
  { minimum: -Infinity, color: "#9bdde2" },
];

function eventTime(event) {
  return event?.time || event?.observed_at;
}

function formatWindow(windowValue) {
  if (typeof windowValue === "string") return windowValue;
  if (windowValue && typeof windowValue.label === "string") return windowValue.label;
  if (windowValue?.start && windowValue?.end) {
    const hours = Math.round((Date.parse(windowValue.end) - Date.parse(windowValue.start)) / 3600000);
    if (Number.isFinite(hours) && hours > 0) return `Past ${hours} hours`;
  }
  return "Window unavailable";
}

function magnitudeStyle(magnitude) {
  return MAGNITUDE_STYLES.find(({ minimum }) => magnitude >= minimum) || MAGNITUDE_STYLES.at(-1);
}

function markerSize(magnitude) {
  return Math.max(4, Math.min(15, 3.5 + Math.max(0, magnitude) * 1.65));
}

function formatUtc(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Time unavailable" : `${date.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

function populateCards(data, chronological, byMagnitude) {
  const latest = chronological[0];
  const largestMagnitude = byMagnitude[0]?.magnitude ?? 0;
  setCard("latest", [`${data.events.length} events`, `Latest · ${formatEvent(latest)}`]);

  const activity = largestMagnitude >= 6 ? ["VERY HIGH", "very-high"] : largestMagnitude >= 5 ? ["HIGH", "high"] : largestMagnitude >= 4 ? ["MODERATE", "moderate"] : ["LOW", "low"];
  setCard("activity", [activity[0], "Based on the strongest event in this observation window."], `activity-level ${activity[1]}`);

  const ranges = [
    { label: "M < 2.0", count: 0 }, { label: "M 2.0–2.9", count: 0 }, { label: "M 3.0–3.9", count: 0 },
    { label: "M 4.0–4.9", count: 0 }, { label: "M 5.0–5.9", count: 0 }, { label: "M ≥ 6.0", count: 0 },
  ];
  byMagnitude.forEach(({ magnitude }) => { ranges[Math.min(5, magnitude < 2 ? 0 : Math.floor(magnitude) - 1)].count += 1; });
  const dominantMagnitude = ranges.reduce((best, range) => range.count > best.count ? range : best, ranges[0]);
  setCard("magnitude", [dominantMagnitude.label, `Most common · ${dominantMagnitude.count} recorded events`]);

  const depths = [{ label: "0–33 km", count: 0 }, { label: "33–300 km", count: 0 }, { label: "> 300 km", count: 0 }];
  data.events.forEach(({ depth_km: depth }) => { if (Number.isFinite(depth) && depth >= 0) depths[depth <= 33 ? 0 : depth <= 300 ? 1 : 2].count += 1; });
  const dominantDepth = depths.reduce((best, range) => range.count > best.count ? range : best, depths[0]);
  const depthDescription = dominantDepth === depths[0] ? "Most earthquakes in this window were shallow." : dominantDepth === depths[1] ? "Most earthquakes in this window were intermediate-depth." : "Most earthquakes in this window were deep.";
  setCard("depth", [dominantDepth.label, depthDescription]);

  const majorCount = byMagnitude.filter(({ magnitude }) => magnitude >= 6).length;
  const moderateCount = byMagnitude.filter(({ magnitude }) => magnitude >= 5 && magnitude < 6).length;
  const context = majorCount ? `${majorCount === 1 ? "One magnitude 6+ event was" : `${majorCount} magnitude 6+ events were`} recorded in this window.` : moderateCount ? `${moderateCount === 1 ? "One magnitude 5+ event was" : `${moderateCount} magnitude 5+ events were`} recorded in this window. No magnitude 6+ events were detected.` : "No magnitude 5+ earthquakes were detected in this window.";
  setCard("context", ["Window summary", context]);
}

function setCard(id, lines, strongClass = "") {
  const card = document.getElementById(`earthquake-card-${id}`);
  const strong = document.createElement("strong");
  strong.className = strongClass;
  strong.textContent = lines[0];
  card.replaceChildren(strong, ...lines.slice(1).map((line) => {
    const span = document.createElement("span");
    span.textContent = line;
    return span;
  }));
}

function makeMarkerInteractive(marker, event, tooltip, mapContainer) {
  marker.classList.add("earthquake-marker");
  marker.setAttribute("aria-hidden", "false");
  marker.setAttribute("aria-label", `${formatEvent(event)}, depth ${Number.isFinite(event.depth_km) ? `${Math.round(event.depth_km)} kilometres` : "unavailable"}`);
  marker.setAttribute("role", event.event_url ? "link" : "img");
  marker.setAttribute("tabindex", "0");
  const show = (pointerEvent) => {
    tooltip.replaceChildren();
    const fields = [
      ["Magnitude", Number.isFinite(event.magnitude) ? `M ${event.magnitude.toFixed(1)}` : "Unavailable"],
      ["Location", event.place || "Location unavailable"],
      ["Depth", Number.isFinite(event.depth_km) ? `${Math.round(event.depth_km)} km` : "Unavailable"],
      ["Time", formatUtc(eventTime(event))],
    ];
    fields.forEach(([label, value]) => {
      const row = document.createElement("span");
      const heading = document.createElement("small");
      const content = document.createElement("b");
      heading.textContent = label;
      content.textContent = value;
      row.append(heading, content);
      tooltip.append(row);
    });
    if (event.event_url) {
      const link = document.createElement("span");
      link.className = "earthquake-tooltip-link";
      link.textContent = "Open USGS Event ↗";
      tooltip.append(link);
    }
    const bounds = mapContainer.getBoundingClientRect();
    const x = pointerEvent?.clientX ?? bounds.left + bounds.width / 2;
    const y = pointerEvent?.clientY ?? bounds.top + bounds.height / 2;
    tooltip.style.left = `${Math.max(8, Math.min(bounds.width - 248, x - bounds.left + 14))}px`;
    tooltip.style.top = `${Math.max(8, Math.min(bounds.height - tooltip.offsetHeight - 8, y - bounds.top + 14))}px`;
    tooltip.classList.add("visible");
    tooltip.setAttribute("aria-hidden", "false");
  };
  const hide = () => { tooltip.classList.remove("visible"); tooltip.setAttribute("aria-hidden", "true"); };
  marker.addEventListener("pointerenter", show);
  marker.addEventListener("pointermove", show);
  marker.addEventListener("pointerleave", hide);
  marker.addEventListener("focus", show);
  marker.addEventListener("blur", hide);
  marker.addEventListener("click", () => { if (event.event_url) window.open(event.event_url, "_blank", "noopener,noreferrer"); });
  marker.addEventListener("keydown", (keyboardEvent) => {
    if ((keyboardEvent.key === "Enter" || keyboardEvent.key === " ") && event.event_url) {
      keyboardEvent.preventDefault();
      window.open(event.event_url, "_blank", "noopener,noreferrer");
    }
  });
}

async function renderExport(data, map) {
  const collected = new Date(data.collected_at);
  const isStale = Date.now() - collected.getTime() > STALE_AFTER_MS;
  const isPartial = data.status === "partial" || !data.window || data.events.some((event) => !Number.isFinite(event.magnitude));
  const state = isStale ? "stale" : isPartial ? "partial" : "ok";
  setState(state, isStale ? "The local export is older than six hours." : isPartial ? "The local export contains partial observations." : "Local earthquake observations loaded.");

  const chronological = [...data.events].sort((a, b) => Date.parse(eventTime(b)) - Date.parse(eventTime(a)));
  const byMagnitude = data.events.filter((event) => Number.isFinite(event.magnitude)).sort((a, b) => b.magnitude - a.magnitude);
  document.getElementById("earthquake-window").textContent = formatWindow(data.window);
  document.getElementById("earthquake-latest").textContent = formatEvent(chronological[0]);
  document.getElementById("earthquake-largest").textContent = formatEvent(byMagnitude[0]);
  document.getElementById("earthquake-count").textContent = String(data.events.length);
  document.getElementById("earthquake-collected").textContent = collected.toISOString().slice(0, 16).replace("T", " ") + " UTC";

  populateCards(data, chronological, byMagnitude);
  const tooltip = document.getElementById("earthquake-tooltip");
  const mapContainer = document.getElementById("earthquake-map");
  map.layers.markers.setAttribute("aria-hidden", "false");
  for (const event of [...data.events].sort((a, b) => (a.magnitude || 0) - (b.magnitude || 0))) {
    const marker = await map.addMarker({ latitude: event.latitude, longitude: event.longitude, size: markerSize(event.magnitude), color: magnitudeStyle(event.magnitude).color });
    makeMarkerInteractive(marker, event, tooltip, mapContainer);
  }
  document.getElementById("earthquake-map-caption").textContent = `${data.events.length} events from ${formatWindow(data.window).toLowerCase()}. Select a marker to open its USGS event page.`;
}

async function initialize() {
  unavailable();
  setState("loading", "Loading the future local dashboard export.");
  const map = new WorldObserverMap({ container: "#earthquake-map" });
  try {
    await map.ready;
    document.getElementById("earthquake-map-caption").textContent = "Canonical World Observer basemap. No observations are plotted without a valid local export.";
  } catch (error) {
    document.getElementById("earthquake-map-caption").textContent = "Canonical basemap is not available.";
    setState("invalid", "The canonical basemap could not be loaded.");
    return;
  }

  try {
    const response = await fetch(DASHBOARD_URL, { cache: "no-store" });
    if (response.status === 404) {
      setState("unavailable", "No local dashboard export is available yet.");
      return;
    }
    if (!response.ok) throw new Error(`Dashboard request failed (${response.status})`);
    await renderExport(validateExport(await response.json()), map);
  } catch (error) {
    console.warn("Earthquake Observer export unavailable", error);
    setState("invalid", "The local dashboard export could not be validated.");
  }
}

initialize();
