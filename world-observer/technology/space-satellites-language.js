(function () {
  "use strict";

  const routes = {
    en: "/world-observer/technology/space-satellites.html",
    de: "/de/world-observer/technology/space-satellites.html",
  };
  const current = document.documentElement.lang.toLowerCase().startsWith("de") ? "de" : "en";

  const metadata = {
    en: {
      title: "Space & Satellites – CelesTrak Orbital Group Data | World Observer",
      description: "Observe selected public CelesTrak GP groups with record counts and element freshness, without inventing real-time satellite positions or a global satellite total.",
      breadcrumb: ["Home", "World Observer", "Technology Observers", "Space & Satellites"],
    },
    de: {
      title: "Satelliten & Umlaufbahndaten – CelesTrak-Gruppen | World Observer",
      description: "Beobachtung ausgewählter öffentlicher CelesTrak-GP-Gruppen mit Datensatzanzahlen und Elementfrische – ohne erfundene Echtzeitpositionen oder globale Satellitengesamtzahl.",
      breadcrumb: ["Startseite", "World Observer", "Technology-Observer", "Satelliten & Umlaufbahndaten"],
    },
  };

  const applyMetadata = () => {
    const meta = metadata[current];
    document.title = meta.title;
    const selectors = [
      ['meta[name="description"]', meta.description],
      ['meta[property="og:title"]', meta.title],
      ['meta[property="og:description"]', meta.description],
      ['meta[name="twitter:title"]', meta.title],
      ['meta[name="twitter:description"]', meta.description],
    ];
    selectors.forEach(([selector, value]) => {
      let node = document.querySelector(selector);
      if (!node) {
        node = document.createElement("meta");
        const match = selector.match(/meta\[(name|property)="([^"]+)"\]/);
        if (match) node.setAttribute(match[1], match[2]);
        document.head.appendChild(node);
      }
      node.setAttribute("content", value);
    });

    if (!document.getElementById("seo-breadcrumb-jsonld")) {
      const items = current === "de"
        ? [[meta.breadcrumb[0], "/de/"], [meta.breadcrumb[1], "/world-observer.html"], [meta.breadcrumb[2], "/world-observer/technology.html"], [meta.breadcrumb[3], routes.de]]
        : [[meta.breadcrumb[0], "/"], [meta.breadcrumb[1], "/world-observer.html"], [meta.breadcrumb[2], "/world-observer/technology.html"], [meta.breadcrumb[3], routes.en]];
      const script = document.createElement("script");
      script.id = "seo-breadcrumb-jsonld";
      script.type = "application/ld+json";
      script.textContent = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map(([name, route], index) => ({
          "@type": "ListItem",
          position: index + 1,
          name,
          item: `https://dennishilk.com${route}`,
        })),
      });
      document.head.appendChild(script);
    }
  };

  applyMetadata();

  let stored = null;
  try {
    stored = localStorage.getItem("dennishilk-language");
  } catch (error) {}

  if ((stored === "en" || stored === "de") && stored !== current) {
    location.replace(`${routes[stored]}${location.search}${location.hash}`);
    return;
  }

  document.querySelectorAll("[data-space-language]").forEach((link) => {
    link.addEventListener("click", () => {
      const language = link.dataset.spaceLanguage;
      if (language !== "en" && language !== "de") return;
      try {
        localStorage.setItem("dennishilk-language", language);
        localStorage.setItem("about-language", language);
      } catch (error) {}
    });
  });
}());
