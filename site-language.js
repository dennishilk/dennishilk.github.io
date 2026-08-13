(() => {
  const STORAGE_KEY = "dennishilk-language";
  const LEGACY_KEYS = ["about-language"];
  const VERSION = "2026-08-10-c64-1";
  const BUNDLE_SRCS = [
    "/site-i18n-de.js?v=20260810-c64-1",
    "/site-i18n-de-extra.js?v=20260809-sitewide-1",
    "/site-i18n-de-observers.js?v=20260809-observers-1",
    "/site-i18n-de-wiesmoor.js?v=20260813-public-1",
    "/site-i18n-de-peatland-polish.js?v=20260809-peatland-2",
    "/site-i18n-de-personnel.js?v=20260809-personnel-1",
  ];

  const dedicatedRoutes = {
    "/": { en: "/", de: "/de/" },
    "/index.html": { en: "/", de: "/de/" },
    "/de/": { en: "/", de: "/de/" },
    "/de/index.html": { en: "/", de: "/de/" },
    "/world-observer/hometown.html": { en: "/world-observer/hometown.html", de: "/de/world-observer/hometown.html" },
    "/de/world-observer/hometown.html": { en: "/world-observer/hometown.html", de: "/de/world-observer/hometown.html" },
    "/world-observer/wiesmoor.html": { en: "/world-observer/wiesmoor.html", de: "/de/world-observer/wiesmoor.html" },
    "/de/world-observer/wiesmoor.html": { en: "/world-observer/wiesmoor.html", de: "/de/world-observer/wiesmoor.html" },
    "/museum/c64/": { en: "/museum/c64/", de: "/de/museum/c64/" },
    "/museum/c64/index.html": { en: "/museum/c64/", de: "/de/museum/c64/" },
    "/de/museum/c64/": { en: "/museum/c64/", de: "/de/museum/c64/" },
    "/de/museum/c64/index.html": { en: "/museum/c64/", de: "/de/museum/c64/" },
  };

  // Large map SVGs can contain hundreds or thousands of nodes. They do not carry
  // visible prose that needs translating, so walking them on every mutation is
  // both wasteful and capable of freezing observer-heavy pages.
  const EXCLUDED_SUBTREE_SELECTOR = [
    ".site-language-switcher",
    "script",
    "style",
    "noscript",
    "code",
    "kbd",
    "samp",
    "#earthquake-map-canvas",
    "#buoy-map-canvas",
    "[data-site-i18n-skip]",
  ].join(",");

  const normalizeLanguage = value => (value === "de" ? "de" : value === "en" ? "en" : null);
  const normalizePath = path => {
    if (!path) return "/";
    if (path.endsWith("/index.html")) return path.slice(0, -"index.html".length) || "/";
    return path;
  };
  const currentPath = location.pathname || "/";
  const normalizedPath = normalizePath(currentPath);
  const route = dedicatedRoutes[currentPath];
  let observer = null;
  let bundlePromise = null;
  let activeLanguage = currentPath.startsWith("/de/") ? "de" : "en";

  const readStoredLanguage = () => {
    try {
      const current = normalizeLanguage(localStorage.getItem(STORAGE_KEY));
      if (current) return current;
      for (const key of LEGACY_KEYS) {
        const legacy = normalizeLanguage(localStorage.getItem(key));
        if (legacy) {
          localStorage.setItem(STORAGE_KEY, legacy);
          return legacy;
        }
      }
    } catch (error) {}
    return null;
  };

  const storeLanguage = language => {
    try {
      localStorage.setItem(STORAGE_KEY, language);
      LEGACY_KEYS.forEach(key => localStorage.setItem(key, language));
    } catch (error) {}
  };

  const loadScript = src => new Promise(resolve => {
    const selector = `script[data-site-i18n-src="${CSS.escape(src)}"]`;
    const existing = document.querySelector(selector);
    if (existing?.dataset.loaded === "true") return resolve();
    const script = existing || document.createElement("script");
    const finish = () => { script.dataset.loaded = "true"; resolve(); };
    script.addEventListener("load", finish, { once: true });
    script.addEventListener("error", () => resolve(), { once: true });
    if (!existing) {
      script.src = src;
      script.dataset.siteI18nSrc = src;
      document.head.appendChild(script);
    }
  });

  const loadGermanBundle = () => {
    if (bundlePromise) return bundlePromise;
    bundlePromise = BUNDLE_SRCS.reduce((chain, src) => chain.then(() => loadScript(src)), Promise.resolve())
      .then(() => window.DennisSiteI18nDE || {});
    return bundlePromise;
  };

  const mergeMaps = (...maps) => Object.assign({}, ...maps.filter(Boolean));
  const resolveTranslationSpec = bundle => {
    const common = bundle.common || {};
    const prefixSpecs = Object.entries(bundle.prefixes || {})
      .filter(([prefix]) => normalizedPath.startsWith(prefix))
      .sort((a, b) => a[0].length - b[0].length)
      .map(([, spec]) => spec);
    const page = (bundle.pages || {})[normalizedPath] || {};
    return {
      text: mergeMaps(common.text, ...prefixSpecs.map(spec => spec.text), page.text),
      attributes: mergeMaps(common.attributes, ...prefixSpecs.map(spec => spec.attributes), page.attributes),
      html: mergeMaps(common.html, ...prefixSpecs.map(spec => spec.html), page.html),
      phrases: [...(common.phrases || []), ...prefixSpecs.flatMap(spec => spec.phrases || []), ...(page.phrases || [])],
      title: page.title || prefixSpecs.map(spec => spec.title).filter(Boolean).at(-1) || null,
      description: page.description || null,
    };
  };

  const replacePhrases = (value, phrases) => {
    let next = value;
    const ordered = [...phrases]
      .filter(pair => Array.isArray(pair) && pair.length >= 2 && pair[0])
      .sort((a, b) => b[0].length - a[0].length);
    for (const pair of ordered) next = next.split(pair[0]).join(pair[1]);
    return next;
  };

  const elementForNode = node => {
    if (!node) return null;
    if (node.nodeType === Node.ELEMENT_NODE) return node;
    return node.parentElement || null;
  };

  const isExcludedNode = node => {
    const element = elementForNode(node);
    return Boolean(element?.closest(EXCLUDED_SUBTREE_SELECTOR));
  };

  const shouldSkipNode = node => isExcludedNode(node);

  const translateTextNode = (node, spec) => {
    if (shouldSkipNode(node)) return;
    const original = node.nodeValue;
    if (!original || !original.trim()) return;
    const trimmed = original.trim();
    const normalized = trimmed.replace(/\s+/g, " ");
    const exact = spec.text[trimmed] || spec.text[normalized];
    if (exact) {
      const leading = original.match(/^\s*/)?.[0] || "";
      const trailing = original.match(/\s*$/)?.[0] || "";
      const translated = `${leading}${exact}${trailing}`;
      if (translated !== original) node.nodeValue = translated;
      return;
    }
    const translated = replacePhrases(original, spec.phrases);
    if (translated !== original) node.nodeValue = translated;
  };

  const translateAttributes = (element, spec) => {
    if (!(element instanceof Element) || isExcludedNode(element)) return;
    for (const name of ["aria-label", "title", "placeholder", "alt"]) {
      const value = element.getAttribute(name);
      if (!value) continue;
      const exact = spec.attributes[value];
      const translated = exact || replacePhrases(value, spec.phrases);
      if (translated !== value) element.setAttribute(name, translated);
    }
  };

  const translateTree = (root, spec) => {
    if (!root || isExcludedNode(root)) return;
    if (root.nodeType === Node.TEXT_NODE) return translateTextNode(root, spec);
    if (![Node.ELEMENT_NODE, Node.DOCUMENT_NODE, Node.DOCUMENT_FRAGMENT_NODE].includes(root.nodeType)) return;
    if (root instanceof Element) translateAttributes(root, spec);
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
      {
        acceptNode(node) {
          if (node.nodeType === Node.ELEMENT_NODE && node.matches?.(EXCLUDED_SUBTREE_SELECTOR)) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        },
      },
    );
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (node.nodeType === Node.TEXT_NODE) translateTextNode(node, spec);
      else translateAttributes(node, spec);
    }
  };

  const applyHtmlOverrides = spec => {
    for (const [selector, html] of Object.entries(spec.html || {})) {
      document.querySelectorAll(selector).forEach(element => {
        if (element.dataset.siteI18nHtmlApplied === VERSION) return;
        element.innerHTML = html;
        element.dataset.siteI18nHtmlApplied = VERSION;
      });
    }
  };

  const updateMetadata = spec => {
    if (spec.title) document.title = spec.title;
    if (!spec.description) return;
    ['meta[name="description"]', 'meta[property="og:description"]', 'meta[name="twitter:description"]'].forEach(selector => {
      const node = document.querySelector(selector);
      if (node) node.setAttribute("content", spec.description);
    });
  };

  const startObserver = spec => {
    observer?.disconnect();
    observer = new MutationObserver(records => {
      for (const record of records) {
        if (isExcludedNode(record.target)) continue;
        if (record.type === "characterData") translateTextNode(record.target, spec);
        if (record.type === "attributes") translateAttributes(record.target, spec);
        record.addedNodes?.forEach(node => translateTree(node, spec));
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["aria-label", "title", "placeholder", "alt"] });
  };

  const setPressedState = language => {
    document.querySelectorAll(".site-language-switcher [data-site-language]").forEach(link => link.setAttribute("aria-current", String(link.dataset.siteLanguage === language)));
  };

  const applyGerman = async () => {
    const bundle = await loadGermanBundle();
    const spec = resolveTranslationSpec(bundle);
    document.documentElement.lang = "de";
    document.body.dataset.siteLanguage = "de";
    applyHtmlOverrides(spec);
    translateTree(document.body, spec);
    updateMetadata(spec);
    startObserver(spec);
    activeLanguage = "de";
    setPressedState("de");
  };

  const style = document.createElement("style");
  style.textContent = `.site-language-switcher{position:fixed;top:14px;right:16px;z-index:10000;display:inline-flex;align-items:center;gap:5px;padding:7px 9px;border:1px solid rgba(98,231,224,.35);border-radius:999px;background:rgba(7,16,20,.88);box-shadow:0 8px 24px rgba(0,0,0,.28);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);font:12px/1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}.site-language-switcher a{color:#9aadaa;text-decoration:none;padding:4px 3px;border-bottom:1px solid transparent;cursor:pointer}.site-language-switcher a[aria-current="true"]{color:#62e7e0;border-color:#62e7e0}.site-language-switcher a:focus-visible{outline:2px solid #e8a36c;outline-offset:3px}.site-language-switcher span{color:#61716f}@media(max-width:720px){.site-language-switcher{top:10px;right:10px;padding:6px 8px}}`;
  document.head.appendChild(style);

  const switcher = document.createElement("nav");
  switcher.className = "site-language-switcher";
  switcher.setAttribute("aria-label", "Page language / Seitensprache");
  switcher.dataset.languageVersion = VERSION;
  const makeLink = (language, label) => {
    const link = document.createElement("a");
    link.dataset.siteLanguage = language;
    link.textContent = label;
    link.hreflang = language;
    link.lang = language;
    link.href = route ? `${route[language]}${location.search}${location.hash}` : `${location.pathname}${location.search}${location.hash}`;
    link.setAttribute("aria-current", String(language === activeLanguage));
    link.addEventListener("click", event => {
      storeLanguage(language);
      if (route) return;
      event.preventDefault();
      if (language === "de") applyGerman();
      else if (activeLanguage !== "en") location.reload();
    });
    return link;
  };
  switcher.append(makeLink("en", "EN"));
  const separator = document.createElement("span");
  separator.textContent = "|";
  separator.setAttribute("aria-hidden", "true");
  switcher.append(separator, makeLink("de", "DE"));
  document.body.appendChild(switcher);

  const storedLanguage = readStoredLanguage();
  if (route) {
    const routeLanguage = currentPath.startsWith("/de/") ? "de" : "en";
    activeLanguage = routeLanguage;
    if (storedLanguage && storedLanguage !== routeLanguage && route[storedLanguage]) {
      location.replace(`${route[storedLanguage]}${location.search}${location.hash}`);
      return;
    }
    document.documentElement.lang = routeLanguage;
    setPressedState(routeLanguage);
    return;
  }
  if (storedLanguage === "de") applyGerman();
  else {
    document.documentElement.lang = "en";
    document.body.dataset.siteLanguage = "en";
    activeLanguage = "en";
    setPressedState("en");
  }
})();
