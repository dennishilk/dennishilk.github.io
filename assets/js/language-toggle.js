(() => {
  "use strict";

  // Keep each page's existing translation engine and its stateful click handlers.
  // Only the alternative language is exposed as a single, shared control.
  if (window.__DENNIS_LANGUAGE_TOGGLE_READY) return;
  window.__DENNIS_LANGUAGE_TOGGLE_READY = true;

  const controlSelector = [
    "body a[hreflang]", "button[data-language]", "button[data-lang]",
    ".site-language-switcher a", ".language-switch button", ".lang-switch a",
    ".cisco-lang a", ".field8-lang a",
  ].join(",");
  const groupSelector = [
    ".site-language-switcher", ".language", ".language-switch", ".lang-switch",
    ".space-language", ".nk-language", ".shrink-language", ".trace-language",
    ".cuba-language", ".tls-language", ".cable-language", ".cisco-lang", ".field8-lang",
  ].join(",");
  const normalize = value => /^(en|de)$/i.test(value || "") ? value.toLowerCase() : null;
  const readPreference = () => {
    try {
      return normalize(localStorage.getItem("dennishilk-language")) || normalize(localStorage.getItem("about-language"));
    } catch (_) { return null; }
  };
  const remember = language => {
    try {
      localStorage.setItem("dennishilk-language", language);
      localStorage.setItem("about-language", language);
    } catch (_) { /* The switch also works with blocked browser storage. */ }
  };
  const languageOf = node => normalize(
    node.dataset.siteLanguage || node.dataset.language || node.dataset.lang ||
    node.getAttribute("hreflang") || node.getAttribute("lang") || node.textContent.trim()
  );
  const setAttribute = (node, name, value) => {
    if (node.getAttribute(name) !== value) node.setAttribute(name, value);
  };
  const pageLanguage = () => document.documentElement.lang.toLowerCase().startsWith("de") ? "de" : "en";
  const targetLabel = target => target === "en" ? "Read in English" : "Auf Deutsch lesen";

  let fallback = null;
  let scheduled = false;
  let initializedNative = false;
  let engineRequested = false;
  let focusedControl = null;

  const controls = () => Array.from(document.querySelectorAll(controlSelector))
    .filter(node => !node.closest("[data-language-fallback]") && languageOf(node));

  const groupsFor = nodes => {
    const groups = new Map();
    nodes.forEach(node => {
      const container = node.closest(groupSelector) || node;
      if (!groups.has(container)) groups.set(container, { container, controls: [], language: pageLanguage() });
      groups.get(container).controls.push(node);
    });
    for (const group of groups.values()) {
      const pressed = group.controls.find(node => node.tagName === "BUTTON" && node.getAttribute("aria-pressed") === "true");
      if (pressed) group.language = languageOf(pressed);
      group.priority = group.controls.some(node => node.tagName === "BUTTON") ? 0
        : group.container.classList.contains("site-language-switcher") ? 2 : 1;
    }
    return Array.from(groups.values()).sort((a, b) => a.priority - b.priority);
  };

  const decorate = (node, language) => {
    if (!node.classList.contains("site-language-control")) node.classList.add("site-language-control");
    if (node.textContent.trim() !== language.toUpperCase()) node.textContent = language.toUpperCase();
    setAttribute(node, "data-site-i18n-skip", "");
    setAttribute(node, "lang", language);
    setAttribute(node, "aria-label", targetLabel(language));
  };

  const alternatePath = language => {
    const alternate = document.querySelector(`link[rel="alternate"][hreflang="${language}"]`);
    if (!alternate) return null;
    try {
      const url = new URL(alternate.href, location.href);
      if (![location.hostname, "www.dennishilk.com", "dennishilk.com"].includes(url.hostname)) return null;
      if (url.pathname === location.pathname && !url.search) return null;
      return `${url.pathname}${location.search || url.search}${location.hash}`;
    } catch (_) { return null; }
  };

  const requestExistingEngine = () => {
    if (engineRequested || document.querySelector("script[src*='stars.js'],script[src*='site-language.js'],script[src*='language-route.js'],script[src*='-de-bootstrap.js']")) return;
    if (location.pathname.startsWith("/linux-migration-companion/") || location.pathname.startsWith("/museum/failure-lab/")) return;
    // Embedded simulations use their parent page's controls.
    if (window.top !== window.self) return;
    engineRequested = true;
    const script = document.createElement("script");
    script.src = "/site-language.js?v=20261006-single-toggle";
    script.dataset.siteLanguageLoader = "true";
    document.head.appendChild(script);
  };

  const updateFallback = () => {
    if (window.top !== window.self) return;
    const current = pageLanguage(), other = current === "de" ? "en" : "de";
    const path = alternatePath(other);
    if (!fallback || (fallback.firstElementChild.tagName === "A") !== Boolean(path)) {
      fallback?.remove();
      fallback = document.createElement("nav");
      fallback.className = "site-language-switcher";
      fallback.dataset.languageFallback = "";
      fallback.dataset.singleLanguageSwitch = "";
      const control = document.createElement(path ? "a" : "button");
      if (!path) control.type = "button";
      control.addEventListener("click", () => {
        const target = languageOf(control);
        remember(target);
        if (!path) {
          requestExistingEngine();
          // If an engine is already loading, its stored preference applies at startup.
          schedule();
        }
      });
      fallback.appendChild(control);
      document.body.appendChild(fallback);
    }
    const node = fallback.firstElementChild;
    if (path) setAttribute(node, "href", path);
    if (node.textContent !== other.toUpperCase()) node.textContent = other.toUpperCase();
    setAttribute(fallback, "aria-label", current === "de" ? "Seitensprache" : "Page language");
    decorate(node, other, current);
    if (!path) requestExistingEngine();
  };

  const sync = () => {
    scheduled = false;
    const groups = groupsFor(controls());
    const primary = groups.find(group => group.controls.some(node => languageOf(node) !== group.language));
    if (!primary) { updateFallback(); return; }
    fallback?.remove();
    fallback = null;

    // About and the React Companion keep locale changes in their original handlers.
    if (!initializedNative && primary.controls.some(node => node.tagName === "BUTTON")) {
      initializedNative = true;
      const desired = normalize(window.__DENNIS_FORCE_SITE_LANGUAGE) ||
        (location.pathname.startsWith("/de/") ? "de" : readPreference());
      const native = primary.controls.find(node => languageOf(node) === desired);
      if (native && desired !== primary.language) { native.click(); schedule(); return; }
    }

    let visible = null;
    for (const group of groups) {
      if (group.container.matches(groupSelector)) {
        setAttribute(group.container, "data-single-language-switch", "");
        setAttribute(group.container, "data-site-i18n-skip", "");
      }
      for (const node of group.controls) {
        const language = languageOf(node);
        const show = group === primary && language !== primary.language && !visible;
        decorate(node, language, primary.language);
        if (node.hidden !== !show) node.hidden = !show;
        if (show) visible = node;
      }
      if (group.container.matches(groupSelector)) {
        const duplicate = group !== primary;
        if (group.container.hidden !== duplicate) group.container.hidden = duplicate;
      }
    }
    if (focusedControl?.hidden && visible) visible.focus({ preventScroll: true });
    focusedControl = null;
  };

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(sync);
  }

  const start = () => {
    document.addEventListener("click", event => {
      const node = event.target.closest?.(controlSelector);
      if (!node || node.closest("[data-language-fallback]")) return;
      const target = languageOf(node);
      if (!target) return;
      remember(target);
      if (document.activeElement === node) focusedControl = node;
      schedule();
    }, true);
    const observer = new MutationObserver(schedule);
    observer.observe(document.documentElement, {
      subtree: true, childList: true, attributes: true,
      attributeFilter: ["lang", "aria-pressed", "aria-current"],
    });
    schedule();
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
