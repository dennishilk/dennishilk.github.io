import { WorldObserverMap } from "/assets/maps/world/world-map.js";

const DASHBOARD_URL = "/world-observer/dashboard/latest/earthquake-observer.json";
const STALE_AFTER_MS = 6 * 60 * 60 * 1000;
const valueIds = ["window", "latest", "largest", "count", "collected"];
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

function setState(state, message, label = state) {
  const status = document.getElementById("earthquake-data-status");
  status.className = `status-badge ${state}`;
  status.textContent = label.toUpperCase();
  document.getElementById("earthquake-loading-status").textContent = message;
}

function unavailable() {
  valueIds.forEach((id) => { document.getElementById(`earthquake-${id}`).textContent = "Awaiting export"; });
}

function validCoordinate(value, minimum, maximum) { return Number.isFinite(value) && value >= minimum && value <= maximum; }

export function validateExport(data) {
  if (!data || typeof data !== "object" || !Array.isArray(data.events)) throw new Error("Invalid dashboard export");
  if (!data.collected_at || Number.isNaN(Date.parse(data.collected_at))) throw new Error("Invalid collection timestamp");
  data.events.forEach((event) => {
    if (!event || !validCoordinate(event.latitude, -90, 90) || !validCoordinate(event.longitude, -180, 180)) throw new Error("Invalid event coordinates");
  });
  return data;
}

function formatEvent(event) {
  if (!event) return "Event unavailable";
  const magnitude = Number.isFinite(event.magnitude) ? `M ${event.magnitude.toFixed(1)}` : "Magnitude unavailable";
  return event.place ? `${magnitude} · ${event.place}` : magnitude;
}

const MAGNITUDE_STYLES = [
  { minimum: 6, color: "#e5484d" }, { minimum: 5, color: "#ff8a3d" }, { minimum: 4, color: "#ffd34e" },
  { minimum: 3, color: "#43d69c" }, { minimum: 2, color: "#42e8ff" }, { minimum: -Infinity, color: "#e6fbff" },
];

function eventTime(event) { return event?.time || event?.observed_at; }
function formatWindow(value) {
  if (typeof value === "string" && value.trim()) return value;
  if (value && typeof value.label === "string" && value.label.trim()) return value.label;
  if (value?.start && value?.end) {
    const hours = Math.round((Date.parse(value.end) - Date.parse(value.start)) / 3600000);
    if (Number.isFinite(hours) && hours > 0) return `Past ${hours} hours`;
  }
  return "Window unavailable";
}
function hasWindow(value) { return formatWindow(value) !== "Window unavailable"; }
function magnitudeStyle(magnitude) { return MAGNITUDE_STYLES.find(({ minimum }) => magnitude >= minimum) || MAGNITUDE_STYLES.at(-1); }
function markerSize(magnitude) { return Math.max(6, Math.min(16, 4.5 + Math.max(0, magnitude) * 1.65)); }
function formatUtc(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Time unavailable" : `${date.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

export function deriveStatus(data, now = Date.now()) {
  const events = Array.isArray(data?.events) ? data.events : [];
  const fatal = data?.status === "error" || data?.data_status === "error" || data?.error;
  if (fatal || !events.length) return { state: "error", label: "ERROR", message: fatal ? "The earthquake export reports a critical error." : "No usable earthquake observations are available." };
  const missing = [];
  if (!hasWindow(data.window)) missing.push("observation window");
  if (data?.diagnostics?.http_status !== 200) missing.push("successful source response");
  if (!data?.source?.name && !data?.source?.url) missing.push("source attribution");
  if (missing.length) return { state: "partial", label: "PARTIAL", message: `Recorded events are available, but the ${missing.join(" and ")} ${missing.length > 1 ? "are" : "is"} missing.` };
  const age = now - Date.parse(data.collected_at);
  if (Number.isFinite(age) && age > STALE_AFTER_MS) return { state: "available", label: "AVAILABLE", message: `${events.length} recorded events are available; the export is older than six hours.` };
  return { state: "live", label: "LIVE", message: `${events.length} recorded events from ${formatWindow(data.window).toLowerCase()}.` };
}

export function classifyActivity(events) {
  const magnitudes = events.map(({ magnitude }) => magnitude).filter(Number.isFinite);
  const count = (minimum) => magnitudes.filter((value) => value >= minimum).length;
  const strongest = magnitudes.length ? Math.max(...magnitudes) : 0;
  const m4 = count(4), m5 = count(5), m6 = count(6);
  if (m6 >= 3 || strongest >= 7 || m5 >= 20 || m4 >= 50) return { label: "HIGH", className: "high", detail: `${m4} M4+, ${m5} M5+, ${m6} M6+ events in this window.` };
  if (m6 >= 1 || m5 >= 8 || m4 >= 25) return { label: "ELEVATED", className: "elevated", detail: `${m4} M4+, ${m5} M5+, ${m6} M6+ events in this window.` };
  if (m5 >= 1 || m4 >= 8 || events.length >= 150) return { label: "MODERATE", className: "moderate", detail: `${m4} M4+, ${m5} M5+, ${m6} M6+ events in this window.` };
  return { label: "LOW", className: "low", detail: `${m4} M4+, ${m5} M5+, ${m6} M6+ events in this window.` };
}

function setCard(id, lines, strongClass = "") {
  const card = document.getElementById(`earthquake-card-${id}`);
  const strong = document.createElement("strong"); strong.className = strongClass; strong.textContent = lines[0];
  card.replaceChildren(strong, ...lines.slice(1).map((line) => { const span = document.createElement("span"); span.textContent = line; return span; }));
}

function populateCards(data, chronological, byMagnitude) {
  setCard("latest", [`${data.events.length}`, "events recorded", `Latest: ${formatEvent(chronological[0])}`]);
  const activity = classifyActivity(data.events);
  setCard("activity", [activity.label, "Worldwide activity level", activity.detail], `activity-level ${activity.className}`);
  const ranges = [
    { label: "M < 2.0", count: 0 }, { label: "M 2.0–2.9", count: 0 }, { label: "M 3.0–3.9", count: 0 },
    { label: "M 4.0–4.9", count: 0 }, { label: "M 5.0–5.9", count: 0 }, { label: "M ≥ 6.0", count: 0 },
  ];
  byMagnitude.forEach(({ magnitude }) => { ranges[Math.min(5, magnitude < 2 ? 0 : Math.floor(magnitude) - 1)].count += 1; });
  const dominantMagnitude = ranges.reduce((best, range) => range.count > best.count ? range : best, ranges[0]);
  setCard("magnitude", [dominantMagnitude.label, `${dominantMagnitude.count} recorded events`, "Most common magnitude range"]);
  const depths = [{ label: "0–33 km", count: 0 }, { label: "33–300 km", count: 0 }, { label: "> 300 km", count: 0 }];
  data.events.forEach(({ depth_km: depth }) => { if (Number.isFinite(depth) && depth >= 0) depths[depth <= 33 ? 0 : depth <= 300 ? 1 : 2].count += 1; });
  const dominantDepth = depths.reduce((best, range) => range.count > best.count ? range : best, depths[0]);
  setCard("depth", [dominantDepth.label, `${dominantDepth.count} recorded events`, "Most common depth range"]);
  const m6 = byMagnitude.filter(({ magnitude }) => magnitude >= 6).length;
  const m5 = byMagnitude.filter(({ magnitude }) => magnitude >= 5 && magnitude < 6).length;
  const context = m6 ? `${m6} magnitude 6+ ${m6 === 1 ? "event" : "events"} recorded; this is an observation, not a prediction.` : m5 ? `${m5} magnitude 5–5.9 ${m5 === 1 ? "event" : "events"} recorded; no magnitude 6+ events.` : "No magnitude 5+ events were recorded in this window.";
  setCard("context", [formatWindow(data.window), context]);
}

function tooltipContent(tooltip, event) {
  const magnitude = document.createElement("strong"); magnitude.className = "earthquake-tooltip-magnitude"; magnitude.textContent = Number.isFinite(event.magnitude) ? `M ${event.magnitude.toFixed(1)}` : "Magnitude unavailable";
  const place = document.createElement("span"); place.className = "earthquake-tooltip-place"; place.textContent = event.place || `${event.latitude.toFixed(2)}, ${event.longitude.toFixed(2)}`;
  const depth = document.createElement("span"); depth.textContent = `Depth: ${Number.isFinite(event.depth_km) ? `${Math.round(event.depth_km)} km` : "Unavailable"}`;
  const time = document.createElement("span"); time.textContent = formatUtc(eventTime(event));
  const children = [magnitude, place, depth, time];
  if (event.event_url) {
    const link = document.createElement("a"); link.className = "earthquake-tooltip-link"; link.textContent = "View on USGS ↗";
    link.href = event.event_url; link.target = "_blank"; link.rel = "noopener noreferrer"; children.push(link);
  }
  tooltip.replaceChildren(...children);
}

export function makeMarkerInteractive(marker, event, tooltip, mapContainer) {
  marker.classList.add("earthquake-marker"); marker.setAttribute("aria-hidden", "false");
  const accessible = `${formatEvent(event)}, depth ${Number.isFinite(event.depth_km) ? `${Math.round(event.depth_km)} kilometres` : "unavailable"}, ${formatUtc(eventTime(event))}`;
  marker.setAttribute("aria-label", accessible); marker.setAttribute("aria-describedby", tooltip.id); marker.setAttribute("role", event.event_url ? "link" : "img"); marker.setAttribute("tabindex", "0");
  let lastPointerType = "mouse"; let touchPrimed = false; let markerHovered = false; let markerFocused = false;
  const hover = tooltip.earthquakeHover || (tooltip.earthquakeHover = { tooltipHovered: false, tooltipFocused: false, activeMarker: null, closeTimer: 0 });
  const position = (clientX, clientY) => {
    const bounds = mapContainer.getBoundingClientRect(); const tip = tooltip.getBoundingClientRect(); const gap = 12;
    const x = Math.max(8, Math.min(bounds.width - tip.width - 8, clientX - bounds.left + gap));
    const preferredY = clientY - bounds.top + gap;
    const y = Math.max(8, Math.min(bounds.height - tip.height - 8, preferredY));
    tooltip.style.left = `${x}px`; tooltip.style.top = `${y}px`;
  };
  const show = (pointerEvent) => {
    clearTimeout(hover.closeTimer); hover.activeMarker = marker; hover.activeClose = closeIfInactive;
    tooltipContent(tooltip, event); tooltip.classList.add("visible"); tooltip.setAttribute("aria-hidden", "false");
    const markerBounds = marker.getBoundingClientRect(); position(pointerEvent?.clientX ?? markerBounds.left + markerBounds.width / 2, pointerEvent?.clientY ?? markerBounds.top + markerBounds.height / 2);
  };
  const hide = () => { tooltip.classList.remove("visible"); tooltip.setAttribute("aria-hidden", "true"); };
  const closeIfInactive = () => {
    clearTimeout(hover.closeTimer);
    hover.closeTimer = setTimeout(() => {
      if (hover.activeMarker === marker && !markerHovered && !markerFocused && !hover.tooltipHovered && !hover.tooltipFocused) { hide(); hover.activeMarker = null; }
    }, 80);
  };
  if (!hover.listenersAdded) {
    tooltip.addEventListener("pointerenter", () => { hover.tooltipHovered = true; clearTimeout(hover.closeTimer); });
    tooltip.addEventListener("pointerleave", () => { hover.tooltipHovered = false; hover.activeClose?.(); });
    tooltip.addEventListener("focusin", () => { hover.tooltipFocused = true; clearTimeout(hover.closeTimer); });
    tooltip.addEventListener("focusout", () => { hover.tooltipFocused = false; hover.activeClose?.(); });
    hover.listenersAdded = true;
  }
  marker.addEventListener("pointerdown", (e) => { lastPointerType = e.pointerType || "mouse"; });
  marker.addEventListener("pointerenter", (e) => { markerHovered = true; show(e); }); marker.addEventListener("pointermove", (e) => position(e.clientX, e.clientY)); marker.addEventListener("pointerleave", () => { markerHovered = false; closeIfInactive(); });
  marker.addEventListener("focus", (e) => { markerFocused = true; show(e); }); marker.addEventListener("blur", () => { markerFocused = false; closeIfInactive(); });
  marker.addEventListener("click", (e) => {
    if (!event.event_url) return;
    if (lastPointerType === "touch" && !touchPrimed) { e.preventDefault(); touchPrimed = true; show(e); return; }
    window.open(event.event_url, "_blank", "noopener,noreferrer");
  });
  marker.addEventListener("keydown", (e) => { if ((e.key === "Enter" || e.key === " ") && event.event_url) { e.preventDefault(); window.open(event.event_url, "_blank", "noopener,noreferrer"); } });
}

/** Add lightweight navigation to the already-rendered SVG without replotting markers. */
export function createMapNavigation(mapContainer, mapCanvas, svg) {
  const state = { zoom: MIN_ZOOM, x: 0, y: 0 };
  const pointers = new Map();
  let frame = 0; let dragOrigin = null; let pinchOrigin = null; let moved = false;
  const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
  const bounds = () => {
    const canvas = mapCanvas.getBoundingClientRect();
    const baseWidth = svg.offsetWidth || canvas.width; const baseHeight = svg.offsetHeight || canvas.height;
    return { canvas, maxX: Math.max(0, baseWidth * (state.zoom - 1) / 2), maxY: Math.max(0, baseHeight * (state.zoom - 1) / 2) };
  };
  const constrain = () => { const { maxX, maxY } = bounds(); state.x = clamp(state.x, -maxX, maxX); state.y = clamp(state.y, -maxY, maxY); };
  const paint = () => { frame = 0; svg.style.transform = `translate3d(${state.x}px, ${state.y}px, 0) scale(${state.zoom})`; };
  const render = () => { if (!frame) frame = requestAnimationFrame(paint); };
  const zoomAt = (nextZoom, clientX, clientY) => {
    const { canvas } = bounds(); const zoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM); const ratio = zoom / state.zoom;
    const px = clientX - canvas.left - canvas.width / 2; const py = clientY - canvas.top - canvas.height / 2;
    state.x = px - ratio * (px - state.x); state.y = py - ratio * (py - state.y); state.zoom = zoom;
    constrain(); render();
  };
  const distance = (a, b) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  const midpoint = (a, b) => ({ x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 });
  mapContainer.addEventListener("wheel", (event) => { event.preventDefault(); zoomAt(state.zoom * Math.exp(-event.deltaY * .0015), event.clientX, event.clientY); }, { passive: false });
  mapContainer.addEventListener("dblclick", (event) => { event.preventDefault(); zoomAt(state.zoom * 1.6, event.clientX, event.clientY); });
  mapContainer.addEventListener("pointerdown", (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    pointers.set(event.pointerId, event); mapContainer.setPointerCapture?.(event.pointerId); moved = false;
    if (pointers.size === 1) dragOrigin = { clientX: event.clientX, clientY: event.clientY, x: state.x, y: state.y };
    if (pointers.size === 2) { const pair = [...pointers.values()]; pinchOrigin = { distance: distance(...pair), zoom: state.zoom, center: midpoint(...pair) }; }
  });
  mapContainer.addEventListener("pointermove", (event) => {
    if (!pointers.has(event.pointerId)) return; pointers.set(event.pointerId, event);
    if (pointers.size === 2 && pinchOrigin) { const pair = [...pointers.values()]; const center = midpoint(...pair); zoomAt(pinchOrigin.zoom * distance(...pair) / Math.max(1, pinchOrigin.distance), center.x, center.y); moved = true; }
    else if (dragOrigin) { const dx = event.clientX - dragOrigin.clientX; const dy = event.clientY - dragOrigin.clientY; if (Math.hypot(dx, dy) > 3) moved = true; state.x = dragOrigin.x + dx; state.y = dragOrigin.y + dy; constrain(); render(); }
  });
  const endPointer = (event) => { pointers.delete(event.pointerId); dragOrigin = pointers.size === 1 ? { ...[...pointers.values()][0], x: state.x, y: state.y } : null; pinchOrigin = null; };
  mapContainer.addEventListener("pointerup", endPointer); mapContainer.addEventListener("pointercancel", endPointer);
  mapContainer.addEventListener("click", (event) => { if (moved) { event.preventDefault(); event.stopPropagation(); moved = false; } }, true);
  window.addEventListener("resize", () => { constrain(); render(); });
  paint();
  return { state, zoomAt };
}

export async function renderExport(data, map) {
  const derived = deriveStatus(data);
  const chronological = [...data.events].sort((a, b) => Date.parse(eventTime(b)) - Date.parse(eventTime(a)));
  const byMagnitude = data.events.filter((event) => Number.isFinite(event.magnitude)).sort((a, b) => b.magnitude - a.magnitude);
  document.getElementById("earthquake-window").textContent = formatWindow(data.window);
  document.getElementById("earthquake-latest").textContent = formatEvent(chronological[0]); document.getElementById("earthquake-largest").textContent = formatEvent(byMagnitude[0]);
  document.getElementById("earthquake-count").textContent = String(data.events.length); document.getElementById("earthquake-collected").textContent = formatUtc(data.collected_at);
  populateCards(data, chronological, byMagnitude);
  const tooltip = document.getElementById("earthquake-tooltip"); const mapContainer = document.getElementById("earthquake-map"); map.layers.markers.setAttribute("aria-hidden", "false");
  for (const event of [...data.events].sort((a, b) => (a.magnitude || 0) - (b.magnitude || 0))) {
    const marker = await map.addMarker({ latitude: event.latitude, longitude: event.longitude, size: markerSize(event.magnitude), color: magnitudeStyle(event.magnitude).color });
    makeMarkerInteractive(marker, event, tooltip, mapContainer);
  }
  document.getElementById("earthquake-map-caption").textContent = `${data.events.length} events from ${formatWindow(data.window).toLowerCase()}. Hover or focus a marker for details; activate it to open its USGS event page.`;
  setState(derived.state, derived.message, derived.label);
}

async function initialize() {
  unavailable(); setState("loading", "Loading the local dashboard export."); const map = new WorldObserverMap({ container: "#earthquake-map-canvas" });
  try { await map.ready; createMapNavigation(document.getElementById("earthquake-map"), document.getElementById("earthquake-map-canvas"), map.svgElement); document.getElementById("earthquake-map-caption").textContent = "Canonical World Observer basemap. No observations are plotted without a valid local export."; }
  catch { document.getElementById("earthquake-map-caption").textContent = "Canonical basemap is not available."; setState("error", "The canonical basemap could not be loaded.", "ERROR"); return; }
  try {
    const response = await fetch(DASHBOARD_URL, { cache: "no-store" });
    if (response.status === 404) { setState("error", "No local dashboard export is available yet.", "ERROR"); return; }
    if (!response.ok) throw new Error(`Dashboard request failed (${response.status})`);
    await renderExport(validateExport(await response.json()), map);
  } catch (error) { console.warn("Earthquake Observer export unavailable", error); setState("error", "The local dashboard export could not be validated.", "ERROR"); }
}

initialize();
