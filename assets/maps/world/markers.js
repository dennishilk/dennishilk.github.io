import { projectCoordinates } from "./projection.js";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

export const MARKER_STYLES = `
  .world-observer-marker { pointer-events: none; vector-effect: non-scaling-stroke; }
  .world-observer-marker__dot { fill: var(--marker-color); }
  .world-observer-marker__pulse,
  .world-observer-marker__ring {
    fill: none;
    stroke: var(--marker-color);
    vector-effect: non-scaling-stroke;
    transform-box: fill-box;
    transform-origin: center;
  }
  .world-observer-marker__pulse { animation: world-observer-pulse 2s ease-out infinite; }
  .world-observer-marker__ring { animation: world-observer-ring 1.6s ease-out infinite; }
  @keyframes world-observer-pulse {
    0% { opacity: .65; transform: scale(.35); }
    75%, 100% { opacity: 0; transform: scale(2.2); }
  }
  @keyframes world-observer-ring {
    0% { opacity: .85; transform: scale(.75); }
    100% { opacity: 0; transform: scale(1.65); }
  }
  @media (prefers-reduced-motion: reduce) {
    .world-observer-marker__pulse,
    .world-observer-marker__ring { animation: none; opacity: .55; }
  }
`;

function markerOptions(options = {}) {
  const { latitude, longitude, size = 10, color = "#38d0ff" } = options;
  const position = projectCoordinates(latitude, longitude);
  if (!Number.isFinite(size) || size <= 0) {
    throw new RangeError("Marker size must be a positive number.");
  }
  return { ...options, ...position, size, color };
}

function createMarker(layer, options, effectClass) {
  const { x, y, size, color, id, className, cssClass } = markerOptions(options);
  const group = document.createElementNS(SVG_NAMESPACE, "g");
  group.setAttribute("class", ["world-observer-marker", className || cssClass].filter(Boolean).join(" "));
  group.setAttribute("transform", `translate(${x} ${y})`);
  group.style.setProperty("--marker-color", color);
  group.setAttribute("aria-hidden", "true");
  if (id) group.id = id;

  if (effectClass) {
    const effect = document.createElementNS(SVG_NAMESPACE, "circle");
    effect.setAttribute("class", effectClass);
    effect.setAttribute("r", String(size));
    effect.setAttribute("stroke-width", String(Math.max(1.5, size / 5)));
    group.append(effect);
  }

  const dot = document.createElementNS(SVG_NAMESPACE, "circle");
  dot.setAttribute("class", "world-observer-marker__dot");
  dot.setAttribute("r", String(size / 2));
  group.append(dot);
  layer.append(group);
  return group;
}

/** Add a simple dot marker to a marker layer. */
export function addMarker(layer, options) {
  return createMarker(layer, options);
}

/** Add a dot with a soft, continuously expanding pulse. */
export function addPulseMarker(layer, options) {
  return createMarker(layer, options, "world-observer-marker__pulse");
}

/** Add a dot with a compact expanding ring animation. */
export function addRingMarker(layer, options) {
  return createMarker(layer, options, "world-observer-marker__ring");
}
