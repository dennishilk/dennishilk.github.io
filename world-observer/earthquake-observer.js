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
    document.getElementById(`earthquake-${id}`).textContent = "Not yet available";
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
  if (!event) return "Not yet available";
  const magnitude = Number.isFinite(event.magnitude) ? `M ${event.magnitude.toFixed(1)}` : "Magnitude unavailable";
  return event.place ? `${magnitude} · ${event.place}` : magnitude;
}

async function renderExport(data, map) {
  const collected = new Date(data.collected_at);
  const isStale = Date.now() - collected.getTime() > STALE_AFTER_MS;
  const isPartial = data.status === "partial" || !data.window || data.events.some((event) => !Number.isFinite(event.magnitude));
  const state = isStale ? "stale" : isPartial ? "partial" : "ok";
  setState(state, isStale ? "The local export is older than six hours." : isPartial ? "The local export contains partial observations." : "Local earthquake observations loaded.");

  const chronological = [...data.events].sort((a, b) => Date.parse(b.observed_at) - Date.parse(a.observed_at));
  const byMagnitude = data.events.filter((event) => Number.isFinite(event.magnitude)).sort((a, b) => b.magnitude - a.magnitude);
  document.getElementById("earthquake-window").textContent = data.window || "Not yet available";
  document.getElementById("earthquake-latest").textContent = formatEvent(chronological[0]);
  document.getElementById("earthquake-largest").textContent = formatEvent(byMagnitude[0]);
  document.getElementById("earthquake-count").textContent = String(data.events.length);
  document.getElementById("earthquake-collected").textContent = collected.toISOString().slice(0, 16).replace("T", " ") + " UTC";

  for (const event of data.events) {
    await map.addMarker({ latitude: event.latitude, longitude: event.longitude, size: 7, color: "#38d0ff" });
  }
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
