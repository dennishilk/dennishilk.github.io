(() => {
  "use strict";

  const path = location.pathname || "/";
  const de = path.startsWith("/de/") || path === "/de";

  const metadata = {
    "/": {
      title: "Dennis Hilk – Open Source, Linux, World Observer & Computer Museum",
      description: "Open-source projects, Linux experiments, the World Observer public-data observatory, interactive computer museum exhibits and The Lost Administrator by Dennis Hilk.",
    },
    "/index.html": {
      title: "Dennis Hilk – Open Source, Linux, World Observer & Computer Museum",
      description: "Open-source projects, Linux experiments, the World Observer public-data observatory, interactive computer museum exhibits and The Lost Administrator by Dennis Hilk.",
    },
    "/de/": {
      title: "Dennis Hilk – Open Source, Linux, World Observer & Computermuseum",
      description: "Open-Source-Projekte, Linux-Experimente, das Public-Data-Projekt World Observer, interaktive Computermuseum-Ausstellungen und The Lost Administrator von Dennis Hilk.",
    },
    "/de/index.html": {
      title: "Dennis Hilk – Open Source, Linux, World Observer & Computermuseum",
      description: "Open-Source-Projekte, Linux-Experimente, das Public-Data-Projekt World Observer, interaktive Computermuseum-Ausstellungen und The Lost Administrator von Dennis Hilk.",
    },
    "/world-observer.html": {
      title: "World Observer – Public Data on Internet, Environment, Society & Technology",
      description: "Explore long-term public-data observations across Internet infrastructure, environment, society and technology with transparent sources, history and interpretation limits.",
    },
    "/world-observer/internet.html": {
      title: "Internet Observers – DNS, IPv6, Reachability & Network Infrastructure",
      description: "Public-data Internet observations covering DNS, IPv6, reachability, mail infrastructure, TLS, routes and undersea cable context with published history and clear evidence limits.",
    },
    "/world-observer/technology.html": {
      title: "Technology Observers – Linux, Software Ecosystems, Time & Satellites",
      description: "Technology observations covering Linux package ecosystems, kernel archives, reference time and selected public satellite element groups without invented global totals.",
    },
    "/world-observer/hometown.html": {
      title: "Wiesmoor Public Data Observer – Weather, Water, Moor, Population & More",
      description: "Ten privacy-friendly public-data observers around Wiesmoor, East Frisia: weather, peatland, sky, water, population, energy, groundwater, planning and municipal finance.",
    },
    "/de/world-observer/hometown.html": {
      title: "Wiesmoor Observer – Wetter, Moor, Wasser, Bevölkerung, Energie & Finanzen",
      description: "Zehn datenschutzfreundliche Public-Data-Observer rund um Wiesmoor in Ostfriesland: Wetter, Moor, Himmel, Wasser, Bevölkerung, Energie, Grundwasser, Planung und Stadtfinanzen.",
    },
    "/museum/": {
      title: "Interactive Computer Museum – C64 BASIC, Modems, BBS & Retro Computing",
      description: "Explore interactive browser exhibits about C64 BASIC, acoustic couplers, dial-up modems, BBS systems, retro computers and the real computing lab behind the museum.",
    },
    "/museum/index.html": {
      title: "Interactive Computer Museum – C64 BASIC, Modems, BBS & Retro Computing",
      description: "Explore interactive browser exhibits about C64 BASIC, acoustic couplers, dial-up modems, BBS systems, retro computers and the real computing lab behind the museum.",
    },
    "/world-observer/wiesmoor.html": {
      title: "Wiesmoor, Germany – History of a Peat & Flower Town | World Observer",
      description: "Explore Wiesmoor in East Frisia, Lower Saxony, Germany — from raised bog and peat-fired power to horticulture, canals and its Flower Town identity.",
    },
  };

  const setMeta = (selector, value, create = null) => {
    if (!value) return;
    let node = document.querySelector(selector);
    if (!node && create) {
      node = document.createElement("meta");
      Object.entries(create).forEach(([name, content]) => node.setAttribute(name, content));
      document.head.appendChild(node);
    }
    if (node) node.setAttribute("content", value);
  };

  const applyMetadata = () => {
    const entry = metadata[path];
    if (!entry) return;
    document.title = entry.title;
    setMeta('meta[name="description"]', entry.description, { name: "description" });
    setMeta('meta[property="og:title"]', entry.title, { property: "og:title" });
    setMeta('meta[property="og:description"]', entry.description, { property: "og:description" });
    setMeta('meta[name="twitter:title"]', entry.title, { name: "twitter:title" });
    setMeta('meta[name="twitter:description"]', entry.description, { name: "twitter:description" });
  };

  const ensureRobots = () => {
    const robots = document.querySelector('meta[name="robots"]');
    if (robots) {
      const current = robots.getAttribute("content") || "";
      if (/\bnoindex\b/i.test(current)) return;
      if (!/\bmax-image-preview\s*:/i.test(current)) {
        robots.setAttribute("content", `${current.replace(/\s*,?\s*$/, "")}${current.trim() ? "," : ""}max-image-preview:large`);
      }
      return;
    }
    const node = document.createElement("meta");
    node.name = "robots";
    node.content = "index,follow,max-image-preview:large";
    document.head.appendChild(node);
  };

  const wiesmoorPairs = {
    "/world-observer/wiesmoor-weather.html": "/de/world-observer/wiesmoor-weather.html",
    "/world-observer/wiesmoor-peatland.html": "/de/world-observer/wiesmoor-peatland.html",
    "/world-observer/wiesmoor-sky.html": "/de/world-observer/wiesmoor-sky.html",
    "/world-observer/east-frisia-water.html": "/de/world-observer/east-frisia-water.html",
    "/world-observer/horizon-observer.html": "/de/world-observer/horizon-observer.html",
    "/world-observer/wiesmoor-population.html": "/de/world-observer/wiesmoor-population.html",
    "/world-observer/wiesmoor-energy.html": "/de/world-observer/wiesmoor-energy.html",
    "/world-observer/wiesmoor-groundwater.html": "/de/world-observer/wiesmoor-groundwater.html",
    "/world-observer/wiesmoor-development.html": "/de/world-observer/wiesmoor-development.html",
    "/world-observer/wiesmoor-finance.html": "/de/world-observer/wiesmoor-finance.html",
  };
  const reversePairs = Object.fromEntries(Object.entries(wiesmoorPairs).map(([en, german]) => [german, en]));

  const ensureAlternates = () => {
    const enPath = reversePairs[path] || (wiesmoorPairs[path] ? path : null);
    const dePath = wiesmoorPairs[enPath];
    if (!enPath || !dePath) return;

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = `https://dennishilk.com${de ? dePath : enPath}`;

    const values = { en: enPath, de: dePath, "x-default": enPath };
    Object.entries(values).forEach(([language, route]) => {
      let link = document.querySelector(`link[rel="alternate"][hreflang="${language}"]`);
      if (!link) {
        link = document.createElement("link");
        link.rel = "alternate";
        link.hreflang = language;
        document.head.appendChild(link);
      }
      link.href = `https://dennishilk.com${route}`;
    });
    setMeta('meta[property="og:locale"]', de ? "de_DE" : "en_US", { property: "og:locale" });
    setMeta('meta[property="og:locale:alternate"]', de ? "en_US" : "de_DE", { property: "og:locale:alternate" });
  };

  const breadcrumbs = new Map([
    ["/world-observer/wiesmoor.html", [
      ["Home", "/"], ["World Observer", "/world-observer.html"], ["Hometown", "/world-observer/hometown.html"], ["Wiesmoor", "/world-observer/wiesmoor.html"],
    ]],
    ["/de/world-observer/wiesmoor.html", [
      ["Startseite", "/de/"], ["World Observer", "/world-observer.html"], ["Hometown", "/de/world-observer/hometown.html"], ["Wiesmoor", "/de/world-observer/wiesmoor.html"],
    ]],
    ["/world-observer/area51.html", [
      ["Home", "/"], ["World Observer", "/world-observer.html"], ["Internet Observers", "/world-observer/internet.html"], ["Area 51 / Groom Lake", "/world-observer/area51.html"],
    ]],
    ["/de/world-observer/area51.html", [
      ["Startseite", "/de/"], ["World Observer", "/world-observer.html"], ["Internet-Observer", "/world-observer/internet.html"], ["Area 51 / Groom Lake", "/de/world-observer/area51.html"],
    ]],
    ["/museum/modem-lab/", [
      ["Home", "/"], ["Computer Museum", "/museum/"], ["Modem & Acoustic Coupler Lab", "/museum/modem-lab/"],
    ]],
    ["/lost-administrator/", [
      ["Home", "/"], ["The Lost Administrator", "/lost-administrator/"],
    ]],
  ]);

  const breadcrumbForWiesmoorObserver = () => {
    const enPath = reversePairs[path] || (wiesmoorPairs[path] ? path : null);
    if (!enPath) return null;
    const currentName = document.querySelector("h1")?.textContent?.trim() || "Wiesmoor Observer";
    return de
      ? [["Startseite", "/de/"], ["World Observer", "/world-observer.html"], ["Wiesmoor Observer", "/de/world-observer/hometown.html"], [currentName, path]]
      : [["Home", "/"], ["World Observer", "/world-observer.html"], ["Hometown Observer", "/world-observer/hometown.html"], [currentName, path]];
  };

  const addBreadcrumb = () => {
    const items = breadcrumbs.get(path) || breadcrumbForWiesmoorObserver();
    if (!items || document.getElementById("seo-breadcrumb-jsonld")) return;
    const payload = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: items.map(([name, route], index) => ({
        "@type": "ListItem",
        position: index + 1,
        name,
        item: `https://dennishilk.com${route}`,
      })),
    };
    const script = document.createElement("script");
    script.id = "seo-breadcrumb-jsonld";
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(payload);
    document.head.appendChild(script);
  };

  applyMetadata();
  ensureRobots();
  ensureAlternates();
  addBreadcrumb();
}());
