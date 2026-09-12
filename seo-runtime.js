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

  const patchCiscoFieldNote7 = () => {
    if (!/^\/museum\/home-computing-lab\/field-notes\/field-note-7\/(?:index\.html)?$/.test(path)) return;

    const storySections = [...document.querySelectorAll(".hcl-field-story > section")];
    const currentLanguage = () => {
      const bodyLanguage = document.body.dataset.siteLanguage;
      if (bodyLanguage === "de" || bodyLanguage === "en") return bodyLanguage;
      return document.documentElement.lang === "de" ? "de" : "en";
    };

    const wernerSection = storySections.find(section => {
      const heading = section.querySelector(":scope > h2")?.textContent || "";
      return /Werner/.test(heading) && /111/.test(heading);
    });

    if (wernerSection && !document.getElementById("cisco-werner-context")) {
      const firstParagraph = wernerSection.querySelector(":scope > p");
      if (firstParagraph) {
        const context = document.createElement("p");
        context.id = "cisco-werner-context";
        context.dataset.siteI18nSkip = "true";
        firstParagraph.insertAdjacentElement("afterend", context);
      }
    }

    const syncWernerContext = () => {
      const context = document.getElementById("cisco-werner-context");
      if (!context) return;
      const language = currentLanguage();
      if (context.dataset.language === language) return;
      context.dataset.language = language;
      context.innerHTML = language === "de"
        ? 'Falls du Werner nicht kennst: <strong>Werner</strong> ist die Comicfigur des deutschen Zeichners <strong>Rötger Feldmann („Brösel“)</strong>. Die Eisrennen-Szene mit Nobelschröder stammt aus <a href="https://de.wikipedia.org/wiki/Werner_%E2%80%93_Das_mu%C3%9F_kesseln%21%21%21" target="_blank" rel="noopener">Werner – Das muß kesseln!!!</a> (1996).'
        : 'If you do not know Werner: Werner is the comic character created by German cartoonist <a href="https://en.wikipedia.org/wiki/R%C3%B6tger_Feldmann" target="_blank" rel="noopener"><strong>Rötger Feldmann (“Brösel”)</strong></a>. The ice-race scene with Nobelschröder is from <a href="https://de.wikipedia.org/wiki/Werner_%E2%80%93_Das_mu%C3%9F_kesseln%21%21%21" target="_blank" rel="noopener">Werner – Das muß kesseln!!!</a> (1996).';
    };

    const patchNobelschroeder = () => {
      const german = document.querySelector('.cisco-recording-pending section[lang="de"]');
      const english = document.querySelector('.cisco-recording-pending section[lang="en"]');

      const germanParagraphs = german?.querySelectorAll("p");
      if (germanParagraphs?.[1]) {
        germanParagraphs[1].innerHTML = 'In der Szene steigt Nobelschröder auf einem gefrorenen See aus dem Auto und rutscht sofort hin und her. Werner sagt: <strong>„Sag mal, kannst du nicht vernünftig grüßen?!“</strong> Und Andi sagt: <strong>„Mach mal nen anständigen Diener!“</strong>';
      }
      if (germanParagraphs?.[2]) {
        germanParagraphs[2].innerHTML = 'Nobelschröder macht noch zwei oder drei Schritte, rutscht dann komplett weg, überschlägt sich und landet mit dem Kopf auf dem Eis. Werner kommentiert trocken, dass Nobelschröder mit seiner <strong>„Abrissbirne“</strong> gleich das ganze Eis kaputtmacht.';
      }

      const englishParagraphs = english?.querySelectorAll("p");
      if (englishParagraphs?.[1]) {
        englishParagraphs[1].innerHTML = 'In the scene, Nobelschröder gets out of a car onto a frozen lake and immediately starts sliding around. Werner says: <strong>“Hey, can’t you greet properly?!”</strong> And Andi says: <strong>“Give us a proper bow!”</strong>';
      }
      if (englishParagraphs?.[2]) {
        englishParagraphs[2].innerHTML = 'Nobelschröder takes another two or three steps, completely loses his footing, flips over and lands head-first on the ice. Werner then dryly comments that Nobelschröder is going to wreck the whole ice surface with his <strong>“wrecking ball”</strong> — meaning his head.';
      }
    };

    const moveWernerRecording = () => {
      if (!wernerSection) return;

      const wernerFigure = [...document.querySelectorAll("figure.hcl-story-evidence")].find(figure =>
        figure.querySelector('source[src*="cisco-werner-111-web.mp4"]'),
      );
      const wernerDetails = [...document.querySelectorAll(".cisco-recording-pending")].find(block =>
        block.querySelector('section[lang="de"][aria-labelledby="werner-de-title"]'),
      );

      if (!wernerFigure || !wernerDetails) return;

      if (wernerFigure.parentElement !== wernerSection || wernerDetails.parentElement !== wernerSection || wernerDetails.nextElementSibling !== wernerFigure) {
        wernerSection.append(wernerDetails, wernerFigure);
      }

      const caption = wernerFigure.querySelector("figcaption");
      if (caption) {
        caption.innerHTML = currentLanguage() === "de"
          ? '<strong>Aufnahme 01 — Werner / 111.</strong> Ein Druck auf die <em>Werner</em>-Kurzwahl startet die ausgewählte Szene direkt auf dem Cisco; Bild und Ton kommen aus dem Telefon.'
          : '<strong>Recording 01 — Werner / 111.</strong> Pressing the <em>Werner</em> speed dial starts the selected scene directly on the Cisco, with video and audio coming from the phone.';
      }
    };

    const syncCiscoLanguagePolish = () => {
      const language = currentLanguage();
      const sections = [...document.querySelectorAll(".hcl-field-story > section")];
      const doomSection = sections.find(section => /DOOM/i.test(section.querySelector(":scope > h2")?.textContent || ""));

      if (doomSection) {
        const firstParagraph = doomSection.querySelector(":scope > p");
        if (firstParagraph) {
          firstParagraph.textContent = language === "de"
            ? "Die zweite Anwendung ist kein vorab aufgenommenes DOOM-Video. DOOM Retro läuft tatsächlich live auf Cthulhu unter Wayland/Sway, und das Cisco zeigt die aktuelle Spielausgabe."
            : "The second application is not a prerecorded DOOM clip. DOOM Retro is actually running live on Cthulhu under Wayland/Sway, and the Cisco displays the current game output.";
        }
        const doomImage = doomSection.querySelector("figure img");
        if (doomImage) {
          doomImage.alt = language === "de"
            ? "Live-DOOM-Spiel auf dem Cisco CP-9951"
            : "Live DOOM gameplay displayed on the Cisco CP-9951";
        }
      }

      const catImage = document.querySelector(".hcl-field-story > figure img");
      if (catImage) {
        catImage.alt = language === "de"
          ? "Cisco CP-9951 im Homelab mit dem unverzichtbaren Katzen-Hintergrund"
          : "Cisco CP-9951 in the home lab with the essential cat background";
      }

      document.querySelectorAll(".hcl-field-story pre").forEach(pre => {
        const value = pre.textContent;
        if (/Werner/.test(value) && /111/.test(value) && /DOOM/.test(value) && /666/.test(value)) {
          pre.textContent = language === "de"
            ? "Taste 2: Werner\n  → 111 → Asterisk → Baresip 200\n  → Werner-Video + Ton → Cisco\n\nTaste 3: DOOM\n  → 666 → Asterisk → Baresip 201\n  → Live-Cthulhu-Video + echter Spielsound → Cisco"
            : "Button 2: Werner\n  → 111 → Asterisk → Baresip 200\n  → Werner video + audio → Cisco\n\nButton 3: DOOM\n  → 666 → Asterisk → Baresip 201\n  → live Cthulhu video + real game audio → Cisco";
        } else if (/2\s*=/.test(value) && /8\s*=/.test(value) && /5\s*=/.test(value) && /0\s*=/.test(value)) {
          pre.textContent = language === "de"
            ? "2 = vorwärts       8 = rückwärts\n4 = links drehen   6 = rechts drehen\n5 = feuern          0 = benutzen / öffnen"
            : "2 = forward        8 = backward\n4 = turn left      6 = turn right\n5 = fire           0 = use / open";
        }
      });
    };

    const syncCiscoFieldNote7 = () => {
      syncWernerContext();
      patchNobelschroeder();
      moveWernerRecording();
      syncCiscoLanguagePolish();
    };

    syncCiscoFieldNote7();
    setTimeout(syncCiscoFieldNote7, 0);
    setTimeout(syncCiscoFieldNote7, 150);
    setTimeout(syncCiscoFieldNote7, 500);

    const languageObserver = new MutationObserver(() => setTimeout(syncCiscoFieldNote7, 0));
    languageObserver.observe(document.body, { attributes: true, attributeFilter: ["data-site-language"] });
  };

  applyMetadata();
  ensureRobots();
  ensureAlternates();
  addBreadcrumb();
  patchCiscoFieldNote7();
})();