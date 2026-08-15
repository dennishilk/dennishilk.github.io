(() => {
  "use strict";

  const pairs = {
    "/de/world-observer/wiesmoor-weather.html": "/world-observer/wiesmoor-weather.html",
    "/de/world-observer/wiesmoor-peatland.html": "/world-observer/wiesmoor-peatland.html",
    "/de/world-observer/wiesmoor-sky.html": "/world-observer/wiesmoor-sky.html",
    "/de/world-observer/east-frisia-water.html": "/world-observer/east-frisia-water.html",
    "/de/world-observer/horizon-observer.html": "/world-observer/horizon-observer.html",
    "/de/world-observer/wiesmoor-population.html": "/world-observer/wiesmoor-population.html",
    "/de/world-observer/wiesmoor-energy.html": "/world-observer/wiesmoor-energy.html",
    "/de/world-observer/wiesmoor-groundwater.html": "/world-observer/wiesmoor-groundwater.html",
    "/de/world-observer/wiesmoor-development.html": "/world-observer/wiesmoor-development.html",
    "/de/world-observer/wiesmoor-finance.html": "/world-observer/wiesmoor-finance.html",
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
    "/site-i18n-de-wiesmoor.js?v=20260813-public-1",
  ];

  const loadScript = (src) => new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = src;
    script.addEventListener("load", resolve, { once: true });
    script.addEventListener("error", resolve, { once: true });
    document.head.appendChild(script);
  });

  const mergeMaps = (...maps) => Object.assign({}, ...maps.filter(Boolean));
  const excludedSelector = ["script", "style", "noscript", "code", "kbd", "samp", "[data-site-i18n-skip]"].join(",");

  const resolveSpec = (bundle) => {
    const common = bundle.common || {};
    const prefixSpecs = Object.entries(bundle.prefixes || {})
      .filter(([prefix]) => enPath.startsWith(prefix))
      .sort((a, b) => a[0].length - b[0].length)
      .map(([, spec]) => spec);
    const page = (bundle.pages || {})[enPath] || {};
    return {
      text: mergeMaps(common.text, ...prefixSpecs.map((spec) => spec.text), page.text),
      attributes: mergeMaps(common.attributes, ...prefixSpecs.map((spec) => spec.attributes), page.attributes),
      html: mergeMaps(common.html, ...prefixSpecs.map((spec) => spec.html), page.html),
      phrases: [...(common.phrases || []), ...prefixSpecs.flatMap((spec) => spec.phrases || []), ...(page.phrases || [])],
      title: page.title || prefixSpecs.map((spec) => spec.title).filter(Boolean).at(-1) || null,
      description: page.description || null,
    };
  };

  const replacePhrases = (value, phrases) => {
    let next = value;
    const ordered = [...phrases]
      .filter((pair) => Array.isArray(pair) && pair.length >= 2 && pair[0])
      .sort((a, b) => b[0].length - a[0].length);
    for (const [from, to] of ordered) next = next.split(from).join(to);
    return next;
  };

  const excluded = (node) => {
    const element = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
    return Boolean(element?.closest?.(excludedSelector));
  };

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
    node.nodeValue = replacePhrases(original, spec.phrases);
  };

  const translateAttributes = (element, spec) => {
    if (!(element instanceof Element) || excluded(element)) return;
    for (const name of ["aria-label", "title", "placeholder", "alt"]) {
      const value = element.getAttribute(name);
      if (!value) continue;
      element.setAttribute(name, spec.attributes[value] || replacePhrases(value, spec.phrases));
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

  const applyHtml = (spec) => {
    Object.entries(spec.html || {}).forEach(([selector, html]) => {
      document.querySelectorAll(selector).forEach((element) => { element.innerHTML = html; });
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

  const updateDiscoveryMetadata = (spec) => {
    if (spec.title) document.title = spec.title;
    if (spec.description) {
      setMeta('meta[name="description"]', spec.description, { name: "description" });
      setMeta('meta[property="og:description"]', spec.description, { property: "og:description" });
      setMeta('meta[name="twitter:description"]', spec.description, { name: "twitter:description" });
    }
    if (spec.title) {
      setMeta('meta[property="og:title"]', spec.title, { property: "og:title" });
      setMeta('meta[name="twitter:title"]', spec.title, { name: "twitter:title" });
    }

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = `https://dennishilk.com${dePath}`;

    const alternates = { en: enPath, de: dePath, "x-default": enPath };
    Object.entries(alternates).forEach(([language, route]) => {
      let link = document.querySelector(`link[rel="alternate"][hreflang="${language}"]`);
      if (!link) {
        link = document.createElement("link");
        link.rel = "alternate";
        link.hreflang = language;
        document.head.appendChild(link);
      }
      link.href = `https://dennishilk.com${route}`;
    });

    setMeta('meta[property="og:url"]', `https://dennishilk.com${dePath}`, { property: "og:url" });
    setMeta('meta[property="og:locale"]', "de_DE", { property: "og:locale" });
    setMeta('meta[property="og:locale:alternate"]', "en_US", { property: "og:locale:alternate" });
  };

  const updateJsonLd = (spec) => {
    document.querySelectorAll('script[type="application/ld+json"]:not(#seo-breadcrumb-jsonld)').forEach((script) => {
      try {
        const data = JSON.parse(script.textContent);
        const update = (node) => {
          if (!node || typeof node !== "object") return;
          if (node.url === `https://dennishilk.com${enPath}` || node.url?.endsWith(enPath)) node.url = `https://dennishilk.com${dePath}`;
          if (node["@type"] === "WebPage" || node["@type"] === "Dataset") {
            node.inLanguage = "de";
            if (spec.title) node.name = spec.title.replace(/\s*[–—-]\s*World Observer.*$/, "");
            if (spec.description) node.description = spec.description;
          }
          Object.values(node).forEach((value) => {
            if (Array.isArray(value)) value.forEach(update);
            else if (value && typeof value === "object") update(value);
          });
        };
        update(data);
        script.textContent = JSON.stringify(data);
      } catch (error) {}
    });
  };

  const rewriteLinksAndAssets = () => {
    const routePairs = Object.fromEntries(Object.entries(pairs).map(([german, english]) => [english, german]));
    document.querySelectorAll("a[href]").forEach((link) => {
      const raw = link.getAttribute("href");
      if (routePairs[raw]) link.setAttribute("href", routePairs[raw]);
      else if (raw === "/world-observer/hometown.html") link.setAttribute("href", "/de/world-observer/hometown.html");
      else if (raw === "/") link.setAttribute("href", "/de/");
    });
    document.querySelectorAll("[src], [srcset]").forEach((element) => {
      for (const attr of ["src", "srcset"]) {
        const value = element.getAttribute(attr);
        if (value?.startsWith("../assets/")) element.setAttribute(attr, `/${value.slice(3)}`);
      }
    });
  };

  bundleSources.reduce((chain, src) => chain.then(() => loadScript(src)), Promise.resolve()).then(() => {
    const bundle = window.DennisSiteI18nDE || {};
    const spec = resolveSpec(bundle);
    translateTree(document.body, spec);
    applyHtml(spec);
    rewriteLinksAndAssets();
    updateDiscoveryMetadata(spec);
    updateJsonLd(spec);

    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === "characterData") translateText(record.target, spec);
        record.addedNodes.forEach((node) => {
          translateTree(node, spec);
          if (node instanceof Element) rewriteLinksAndAssets();
        });
      }
    });
    observer.observe(document.body, { subtree: true, childList: true, characterData: true });
  });
}());
