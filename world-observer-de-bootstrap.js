(() => {
  "use strict";

  const pairs = {
    "/de/world-observer.html": "/world-observer.html",
    "/de/world-observer/environment.html": "/world-observer/environment.html",
    "/de/world-observer/technology.html": "/world-observer/technology.html",
    "/de/world-observer/geomagnetic-storm-observer.html": "/world-observer/geomagnetic-storm-observer.html",
    "/de/world-observer/earthquake-observer.html": "/world-observer/earthquake-observer.html",
    "/de/world-observer/ocean-buoy-observer.html": "/world-observer/ocean-buoy-observer.html",
  };

  const dePath = location.pathname;
  const enPath = pairs[dePath];
  if (!enPath) return;

  document.documentElement.lang = "de";
  try {
    localStorage.setItem("dennishilk-language", "de");
    localStorage.setItem("about-language", "de");
  } catch (error) {}

  const bundleSources = [
    "/site-i18n-de.js?v=20260810-c64-1",
    "/site-i18n-de-extra.js?v=20260809-sitewide-1",
    "/site-i18n-de-observers.js?v=20260809-observers-1",
    "/site-i18n-de-world-observer-core.js?v=20260816-core-1",
  ];

  const loadScript = src => new Promise(resolve => {
    const script = document.createElement("script");
    script.src = src;
    script.addEventListener("load", resolve, { once: true });
    script.addEventListener("error", resolve, { once: true });
    document.head.appendChild(script);
  });

  const mergeMaps = (...maps) => Object.assign({}, ...maps.filter(Boolean));
  const excludedSelector = [
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

  const resolveSpec = bundle => {
    const common = bundle.common || {};
    const prefixSpecs = Object.entries(bundle.prefixes || {})
      .filter(([prefix]) => enPath.startsWith(prefix))
      .sort((a, b) => a[0].length - b[0].length)
      .map(([, spec]) => spec);
    const page = (bundle.pages || {})[enPath] || {};
    return {
      text: mergeMaps(common.text, ...prefixSpecs.map(spec => spec.text), page.text),
      attributes: mergeMaps(common.attributes, ...prefixSpecs.map(spec => spec.attributes), page.attributes),
      html: mergeMaps(common.html, ...prefixSpecs.map(spec => spec.html), page.html),
      phrases: [...(common.phrases || []), ...prefixSpecs.flatMap(spec => spec.phrases || []), ...(page.phrases || [])],
      title: page.title || prefixSpecs.map(spec => spec.title).filter(Boolean).at(-1) || null,
      description: page.description || null,
    };
  };

  const wordCharacter = value => Boolean(value && /[\p{L}\p{N}_]/u.test(value));
  const replaceLiteralPhrase = (value, source, target) => {
    let cursor = 0;
    let result = "";
    const startsWithWord = wordCharacter(source[0]);
    const endsWithWord = wordCharacter(source[source.length - 1]);

    while (cursor < value.length) {
      const index = value.indexOf(source, cursor);
      if (index === -1) break;
      const before = index > 0 ? value[index - 1] : "";
      const afterIndex = index + source.length;
      const after = afterIndex < value.length ? value[afterIndex] : "";
      if ((startsWithWord && wordCharacter(before)) || (endsWithWord && wordCharacter(after))) {
        result += value.slice(cursor, afterIndex);
        cursor = afterIndex;
        continue;
      }
      result += value.slice(cursor, index) + target;
      cursor = afterIndex;
    }
    return result + value.slice(cursor);
  };

  const replacePhrases = (value, phrases) => {
    let next = value;
    const ordered = [...phrases]
      .filter(pair => Array.isArray(pair) && pair.length >= 2 && pair[0])
      .sort((a, b) => b[0].length - a[0].length);
    for (const [from, to] of ordered) next = replaceLiteralPhrase(next, from, to);
    return next;
  };

  const elementFor = node => node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
  const excluded = node => Boolean(elementFor(node)?.closest?.(excludedSelector));

  const translateText = (node, spec) => {
    if (!node?.nodeValue || !node.nodeValue.trim() || excluded(node)) return;
    const original = node.nodeValue;
    const trimmed = original.trim();
    const normalized = trimmed.replace(/\s+/g, " ");
    const exact = spec.text[trimmed] || spec.text[normalized];
    if (exact) {
      const leading = original.match(/^\s*/)?.[0] || "";
      const trailing = original.match(/\s*$/)?.[0] || "";
      node.nodeValue = `${leading}${exact}${trailing}`;
      return;
    }
    const translated = replacePhrases(original, spec.phrases);
    if (translated !== original) node.nodeValue = translated;
  };

  const translateAttributes = (element, spec) => {
    if (!(element instanceof Element) || excluded(element)) return;
    for (const name of ["aria-label", "title", "placeholder", "alt"]) {
      const value = element.getAttribute(name);
      if (!value) continue;
      const translated = spec.attributes[value] || replacePhrases(value, spec.phrases);
      if (translated !== value) element.setAttribute(name, translated);
    }
  };

  const translateTree = (root, spec) => {
    if (!root || excluded(root)) return;
    if (root.nodeType === Node.TEXT_NODE) return translateText(root, spec);
    if (root instanceof Element) translateAttributes(root, spec);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
      acceptNode(node) {
        if (node.nodeType === Node.ELEMENT_NODE && node.matches?.(excludedSelector)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (node.nodeType === Node.TEXT_NODE) translateText(node, spec);
      else translateAttributes(node, spec);
    }
  };

  const applyHtml = spec => {
    Object.entries(spec.html || {}).forEach(([selector, html]) => {
      document.querySelectorAll(selector).forEach(element => { element.innerHTML = html; });
    });
  };

  const setMeta = (selector, value, attrs = null) => {
    if (!value) return;
    let node = document.querySelector(selector);
    if (!node && attrs) {
      node = document.createElement("meta");
      Object.entries(attrs).forEach(([key, val]) => node.setAttribute(key, val));
      document.head.appendChild(node);
    }
    if (node) node.setAttribute("content", value);
  };

  const ensureAlternate = (language, target) => {
    let link = document.querySelector(`link[rel="alternate"][hreflang="${language}"]`);
    if (!link) {
      link = document.createElement("link");
      link.rel = "alternate";
      link.hreflang = language;
      document.head.appendChild(link);
    }
    link.href = `https://dennishilk.com${target}`;
  };

  const updateDiscoveryMetadata = spec => {
    if (spec.title) {
      document.title = spec.title;
      setMeta('meta[property="og:title"]', spec.title, { property: "og:title" });
      setMeta('meta[name="twitter:title"]', spec.title, { name: "twitter:title" });
    }
    if (spec.description) {
      setMeta('meta[name="description"]', spec.description, { name: "description" });
      setMeta('meta[property="og:description"]', spec.description, { property: "og:description" });
      setMeta('meta[name="twitter:description"]', spec.description, { name: "twitter:description" });
    }

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = `https://dennishilk.com${dePath}`;
    ensureAlternate("en", enPath);
    ensureAlternate("de", dePath);
    ensureAlternate("x-default", enPath);
    setMeta('meta[property="og:url"]', `https://dennishilk.com${dePath}`, { property: "og:url" });
    setMeta('meta[property="og:locale"]', "de_DE", { property: "og:locale" });
    setMeta('meta[property="og:locale:alternate"]', "en_US", { property: "og:locale:alternate" });
  };

  const updateJsonLd = spec => {
    document.querySelectorAll('script[type="application/ld+json"]:not(#seo-breadcrumb-jsonld)').forEach(script => {
      try {
        const data = JSON.parse(script.textContent);
        const update = node => {
          if (!node || typeof node !== "object") return;
          if (typeof node.url === "string" && (node.url === `https://dennishilk.com${enPath}` || node.url.endsWith(enPath))) {
            node.url = `https://dennishilk.com${dePath}`;
          }
          if (["WebPage", "CollectionPage", "Dataset"].includes(node["@type"])) {
            node.inLanguage = "de";
            if (spec.title && typeof node.name === "string") node.name = spec.title;
            if (spec.description && typeof node.description === "string") node.description = spec.description;
          }
          Object.values(node).forEach(value => {
            if (Array.isArray(value)) value.forEach(update);
            else if (value && typeof value === "object") update(value);
          });
        };
        update(data);
        script.textContent = JSON.stringify(data);
      } catch (error) {}
    });
  };

  const enToDe = Object.fromEntries(Object.entries(pairs).map(([de, en]) => [en, de]));
  const rewriteLinks = root => {
    const links = root instanceof Element && root.matches("a[href]")
      ? [root]
      : Array.from(root.querySelectorAll?.("a[href]") || []);
    links.forEach(link => {
      if (link.closest(".site-language-switcher")) return;
      const raw = link.getAttribute("href");
      if (!raw) return;
      if (enToDe[raw]) link.setAttribute("href", enToDe[raw]);
      else if (raw === "/world-observer/hometown.html") link.setAttribute("href", "/de/world-observer/hometown.html");
      else if (raw === "/") link.setAttribute("href", "/de/");
    });
  };

  bundleSources.reduce((chain, src) => chain.then(() => loadScript(src)), Promise.resolve()).then(() => {
    const bundle = window.DennisSiteI18nDE || {};
    const spec = resolveSpec(bundle);
    applyHtml(spec);
    translateTree(document.body, spec);
    rewriteLinks(document);
    updateDiscoveryMetadata(spec);
    updateJsonLd(spec);

    const observer = new MutationObserver(records => {
      for (const record of records) {
        if (excluded(record.target)) continue;
        if (record.type === "characterData") translateText(record.target, spec);
        if (record.type === "attributes") translateAttributes(record.target, spec);
        record.addedNodes?.forEach(node => {
          translateTree(node, spec);
          if (node.nodeType === Node.ELEMENT_NODE) rewriteLinks(node);
        });
      }
    });
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["aria-label", "title", "placeholder", "alt"],
    });
  });
})();