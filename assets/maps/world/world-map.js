import { projectCoordinates } from "./projection.js";
import { MARKER_STYLES, addMarker, addPulseMarker, addRingMarker } from "./markers.js";
import { addCircle, addPolyline, addTextLabel } from "./overlays.js";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const DEFAULT_SVG = "/assets/maps/world/world-observer-basemap.svg";

/** Reusable loader and public facade for the canonical World Observer map. */
export class WorldObserverMap {
  /**
   * Create and begin loading a map.
   * @param {{container: string|Element, svg?: string}} options Target and optional basemap URL.
   */
  constructor({ container, svg = DEFAULT_SVG } = {}) {
    this.container = typeof container === "string" ? document.querySelector(container) : container;
    if (!this.container) throw new Error("WorldObserverMap requires a valid container.");
    this.svgUrl = svg;
    this.svgElement = null;
    this.ocean = null;
    this.landLayer = null;
    this.layers = null;
    this.ready = this.load();
  }

  /** Load, validate, inject, and initialize the canonical SVG. */
  async load() {
    const response = await fetch(this.svgUrl);
    if (!response.ok) throw new Error(`Unable to load World Observer map (${response.status}).`);
    const documentNode = new DOMParser().parseFromString(await response.text(), "image/svg+xml");
    const svg = documentNode.documentElement;
    if (svg.localName !== "svg" || documentNode.querySelector("parsererror")) {
      throw new Error("The World Observer basemap is not valid SVG.");
    }

    this.svgElement = document.importNode(svg, true);
    this.svgElement.classList.add("world-observer-map");
    this.svgElement.setAttribute("tabindex", "0");
    this.svgElement.setAttribute("focusable", "true");
    this.svgElement.style.maxWidth = "100%";
    this.svgElement.style.height = "auto";
    this.ocean = this.svgElement.querySelector(".ocean");
    this.landLayer = this.svgElement.querySelector(".land");

    const style = document.createElementNS(SVG_NAMESPACE, "style");
    style.textContent = MARKER_STYLES;
    const overlays = this.#createLayer("world-observer-overlays");
    const markers = this.#createLayer("world-observer-markers");
    const labels = this.#createLayer("world-observer-labels");
    this.layers = { overlays, markers, labels };
    this.svgElement.append(style, overlays, markers, labels);
    this.container.replaceChildren(this.svgElement);
    return this;
  }

  /** Project latitude and longitude into this map's viewBox. */
  projectCoordinates(latitude, longitude) { return projectCoordinates(latitude, longitude); }

  /** Add a simple dot marker. Resolves after the map has loaded. */
  async addMarker(options) { await this.ready; return addMarker(this.layers.markers, options); }

  /** Add an animated pulse marker. Resolves after the map has loaded. */
  async addPulseMarker(options) { await this.ready; return addPulseMarker(this.layers.markers, options); }

  /** Add an animated ring marker. Resolves after the map has loaded. */
  async addRingMarker(options) { await this.ready; return addRingMarker(this.layers.markers, options); }

  /** Draw a geographic polyline. Resolves after the map has loaded. */
  async addPolyline(options) { await this.ready; return addPolyline(this.layers.overlays, options); }

  /** Draw a geographic circle. Resolves after the map has loaded. */
  async addCircle(options) { await this.ready; return addCircle(this.layers.overlays, options); }

  /** Add a geographic text label. Resolves after the map has loaded. */
  async addTextLabel(options) { await this.ready; return addTextLabel(this.layers.labels, options); }

  #createLayer(className) {
    const layer = document.createElementNS(SVG_NAMESPACE, "g");
    layer.setAttribute("class", className);
    layer.setAttribute("aria-hidden", "true");
    layer.setAttribute("pointer-events", "none");
    return layer;
  }
}

export default WorldObserverMap;
