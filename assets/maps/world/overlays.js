import { projectCoordinates } from "./projection.js";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

function element(layer, tagName, attributes, options = {}) {
  const node = document.createElementNS(SVG_NAMESPACE, tagName);
  Object.entries(attributes).forEach(([name, value]) => node.setAttribute(name, String(value)));
  const customClass = options.className || options.cssClass;
  if (customClass) node.classList.add(...customClass.trim().split(/\s+/));
  if (options.id) node.id = options.id;
  node.setAttribute("aria-hidden", "true");
  layer.append(node);
  return node;
}

/**
 * Draw a geographic polyline in the order supplied.
 * @param {SVGGElement} layer Destination overlay layer.
 * @param {{points: Array<{latitude:number, longitude:number}>, color?:string, width?:number, className?:string, id?:string}} options
 * @returns {SVGPolylineElement}
 */
export function addPolyline(layer, options = {}) {
  const { points, color = "#38d0ff", width = 2 } = options;
  if (!Array.isArray(points) || points.length < 2) {
    throw new TypeError("A polyline requires at least two geographic points.");
  }
  const projected = points.map(({ latitude, longitude }) => {
    const { x, y } = projectCoordinates(latitude, longitude);
    return `${x},${y}`;
  }).join(" ");
  return element(layer, "polyline", {
    points: projected, fill: "none", stroke: color, "stroke-width": width,
    "vector-effect": "non-scaling-stroke", class: "world-observer-overlay world-observer-polyline",
  }, options);
}

/** Draw a circle centered on a geographic coordinate. Radius is in viewBox units. */
export function addCircle(layer, options = {}) {
  const { latitude, longitude, radius = 10, color = "#38d0ff", width = 2, fill = "none" } = options;
  if (!Number.isFinite(radius) || radius <= 0) throw new RangeError("Circle radius must be positive.");
  const { x, y } = projectCoordinates(latitude, longitude);
  return element(layer, "circle", {
    cx: x, cy: y, r: radius, fill, stroke: color, "stroke-width": width,
    "vector-effect": "non-scaling-stroke", class: "world-observer-overlay world-observer-circle",
  }, options);
}

/** Add a text label at a geographic coordinate. */
export function addTextLabel(layer, options = {}) {
  const { latitude, longitude, text = "", color = "#d8f6ff", fontSize = 18, offsetX = 0, offsetY = 0 } = options;
  const { x, y } = projectCoordinates(latitude, longitude);
  const label = element(layer, "text", {
    x: x + offsetX, y: y + offsetY, fill: color, "font-size": fontSize,
    class: "world-observer-overlay world-observer-label",
  }, options);
  label.textContent = text;
  return label;
}
