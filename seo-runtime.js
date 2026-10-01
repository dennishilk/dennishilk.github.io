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
      title: "Interactive Computer Museum – Apollo DSKY, Linux Labs & Retro Computing",
      description: "Explore an interactive computer museum with an Apollo DSKY recreation, Linux learning labs, C64 BASIC, BBS, modem, DOS, UNIX and real computing systems.",
    },
    "/museum/index.html": {
      title: "Interactive Computer Museum – Apollo DSKY, Linux Labs & Retro Computing",
      description: "Explore an interactive computer museum with an Apollo DSKY recreation, Linux learning labs, C64 BASIC, BBS, modem, DOS, UNIX and real computing systems.",
    },

    "/museum/crt-remote-terminal/": {
      title: "CRT Remote Terminal Simulator – Classic Remote Computing | Computer Museum",
      description: "Use a browser-based CRT terminal recreation to explore text terminals, remote hosts and the command-line interaction model of 1970s and 1980s computing.",
    },
    "/museum/telephone-exchange/": {
      title: "Manual Telephone Exchange Simulator – Interactive Computer Museum",
      description: "Operate a browser-based manual telephone exchange recreation and explore how operators connected calls before automated switching became universal.",
    },
    "/museum/unix-time-sharing-center/": {
      title: "UNIX Time-Sharing Center – Multi-User UNIX Simulation | Computer Museum",
      description: "Explore a browser-based multi-user UNIX time-sharing environment with terminals, users, processes and the shared-computing ideas that shaped modern operating systems.",
    },
    "/museum/ibm-pc-xt/": {
      title: "DOS PC XT Command Line Simulator – Interactive Computer Museum",
      description: "Explore a browser-based DOS-style PC XT environment and learn classic commands, drives, directories and early personal-computer workflows.",
    },

    "/museum/cryptography-lab/": {
      title: "Interactive Cryptography Lab – Enigma, RSA, AES, PGP & Post-Quantum",
      description: "Explore cryptography history and concepts in browser-based exhibits covering Caesar and XOR, Enigma, public-key cryptography, DES and AES, PGP, password hashing and post-quantum cryptography.",
    },
    "/museum/cryptography-lab/enigma-machine/": {
      title: "Enigma Machine Simulator – Interactive Cryptography Lab",
      description: "Explore a browser-based educational Enigma I reconstruction with rotors, plugboard concepts and step-by-step explanations of historical machine encryption.",
    },
    "/museum/cryptography-lab/des-to-aes/": {
      title: "DES to AES – Block Cipher History & Interactive Cryptography Lab",
      description: "Explore the transition from DES to AES through a safe browser-based educational exhibit about block ciphers, key sizes and changing cryptographic standards.",
    },

    "/museum/malware-history/early-experiments/": {
      title: "Early Malware Experiments – Malware History Lab",
      description: "Explore early self-replicating software experiments and the historical ideas that preceded later computer malware in this safe, non-operational museum chapter.",
    },
    "/museum/malware-history/floppy-era/": {
      title: "Floppy Disk Malware Era – Malware History Lab",
      description: "Explore how removable floppy disks shaped early malware spread, boot-sector risks and defensive habits in this safe historical museum chapter.",
    },
    "/museum/malware-history/dos-virus-era/": {
      title: "DOS Virus Era – File Infectors & Boot-Sector Malware History",
      description: "Explore DOS-era viruses, file infection and boot-sector malware as historical concepts, together with the defensive practices that grew around personal computers.",
    },
    "/museum/malware-history/macro-viruses/": {
      title: "Macro Virus History – Documents, Email & Defensive Computing",
      description: "Explore how document macros changed malware distribution in the 1990s and why safer defaults, scanning and user awareness became important defenses.",
    },
    "/museum/malware-history/internet-worms/": {
      title: "Internet Worm History – Morris, Code Red, Slammer & Sasser",
      description: "Explore the history of automated network worms, rapid propagation and the defensive lessons that shaped patching, filtering and incident response.",
    },
    "/museum/malware-history/email-social-engineering/": {
      title: "Email Malware & Social Engineering History – Malware History Lab",
      description: "Explore the rise of email-borne malware and social engineering, and why attachments, trust and user behavior became part of computer security.",
    },
    "/museum/malware-history/trojans-botnets/": {
      title: "Trojans & Botnets – Malware History Lab",
      description: "Explore the historical development of trojans and botnets through safe concepts covering disguised software, remote control and networks of compromised machines.",
    },
    "/museum/malware-history/modern-malware/": {
      title: "Modern Malware History – Ransomware, Theft & Layered Defense",
      description: "Explore modern malware as a historical and defensive topic, including ransomware, credential theft, persistence and the need for layered security and recovery.",
    },
    "/museum/malware-history/defense-lab/": {
      title: "Malware Defense Lab – Prevention, Detection, Containment & Recovery",
      description: "Explore how malware defense evolved from signatures toward layered prevention, detection, containment, recovery and post-incident learning.",
    },

    "/museum/home-computing-lab/": {
      title: "Dennis Hilk's Computing Lab – Linux Workstation, Homelab & Retro PC",
      description: "Explore Dennis Hilk's real computing lab: an Arch Linux workstation, homelab rack, Windows 98 retro PC, storage, networking and Worldnode server infrastructure.",
    },
    "/museum/home-computing-lab/architecture/": {
      title: "Computing Lab Architecture – Linux, Retro PC, Homelab & Worldnode",
      description: "See how the Linux workstation, Windows 98 retro PC, homelab, storage, network and Worldnode server fit together in one documented computing environment.",
    },
    "/museum/home-computing-lab/cthulhu/": {
      title: "Cthulhu – Arch Linux Workstation, Ryzen 5800X3D & Radeon RX 9060 XT",
      description: "Explore Cthulhu, Dennis Hilk's Arch Linux workstation with Ryzen 7 5800X3D, Radeon RX 9060 XT, sway and preserved hardware and software history.",
    },
    "/museum/home-computing-lab/network/": {
      title: "Home Network Lab – Linux, Homelab & Legacy Systems",
      description: "Explore the protected home network connecting modern Linux, homelab services and legacy computers, with routing, firewall, DNS and Samba concepts.",
    },
    "/museum/home-computing-lab/storage/": {
      title: "Computer Storage Across Generations – IDE, SSD, NAS & Network Shares",
      description: "Trace storage across generations in the Author's Computing Lab, from removable media and local drives to SSDs, NAS storage and network shares.",
    },
    "/museum/home-computing-lab/icq/": {
      title: "ICQ 2000b on Windows 98 in 2026 – OSCAR Compatibility Lab",
      description: "Explore how ICQ 2000b on Windows 98 can still communicate through a private OSCAR-compatible server and modern Linux clients.",
    },
    "/museum/home-computing-lab/homelab/": {
      title: "Home Server Rack & Homelab – Real Infrastructure | Dennis Hilk",
      description: "Explore the real homelab rack behind Dennis Hilk's projects, including server, storage and networking infrastructure documented as physical museum artifacts.",
    },
    "/museum/home-computing-lab/worldnode/": {
      title: "Worldnode Server – Debian, nginx & Public Web Infrastructure",
      description: "Explore the documented server infrastructure behind dennishilk.com, World Observer and the Computer Museum, including a preserved earlier Worldnode server stage.",
    },
    "/museum/home-computing-lab/retro-pc/": {
      title: "Windows 98 Retro Internet Workstation – Real Hardware Museum Record",
      description: "Explore a real preserved Windows 98 workstation, its hardware, software and networking role inside the Author's Computing Lab.",
    },

    "/museum/linux-terminal-academy/terminal-first-steps/": {
      title: "Linux Terminal Basics – Learn pwd, ls, cd & man in the Browser",
      description: "Learn Linux terminal basics safely in your browser with pwd, whoami, uname, date, ls, cd, clear, help and man in a fictional resettable system.",
    },
    "/museum/linux-terminal-academy/filesystem-explorer/": {
      title: "Linux Filesystem Explorer – Learn Paths, /, ~ and cd in Browser",
      description: "Learn Linux filesystem navigation with absolute and relative paths, /, ~, ., .., cd, pwd, ls and cat in a safe browser-only lab.",
    },
    "/museum/linux-terminal-academy/files-directories/": {
      title: "Linux Files & Directories – Practice mkdir, cp, mv and rm",
      description: "Practice Linux file and directory concepts with mkdir, touch, cp, mv, rm, cat and ls in a fictional browser-only filesystem you can reset anytime.",
    },
    "/museum/linux-terminal-academy/permissions-users/": {
      title: "Linux Permissions & Users – Learn rwx, chmod, root and sudo Concepts",
      description: "Learn Linux users, groups and rwx permissions with whoami, id, ls -l and chmod concepts in a safe fictional browser environment.",
    },
    "/museum/linux-terminal-academy/process-control/": {
      title: "Linux Process Control – Learn ps, top, PIDs and Signals",
      description: "Learn Linux process concepts with ps, a top-style view, PIDs, CPU clues and signals in a safe browser-only process-control lab.",
    },
    "/museum/linux-terminal-academy/pipes-shell-power/": {
      title: "Linux Pipes & Shell Tools – Practice grep, wc, head and tail",
      description: "Learn how Linux pipelines connect small text tools with |, grep, wc, head and tail using a deterministic fictional log in your browser.",
    },
    "/museum/linux-terminal-academy/system-admin-crash-lab/": {
      title: "Linux System Administration Lab – systemctl, journalctl & Recovery",
      description: "Practice Linux service troubleshooting with fictional systemctl status, journalctl evidence, configuration repair, restart and verification in your browser.",
    },
    "/museum/linux-terminal-academy/break-it-recover/": {
      title: "Linux Troubleshooting & Recovery Challenge – Terminal Academy",
      description: "Combine Linux process, service, journal and permission skills in a resettable browser-only recovery challenge that rewards diagnosis before repair.",
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
    canonical.href = `https://www.dennishilk.com${de ? dePath : enPath}`;

    const values = { en: enPath, de: dePath, "x-default": enPath };
    Object.entries(values).forEach(([language, route]) => {
      let link = document.querySelector(`link[rel="alternate"][hreflang="${language}"]`);
      if (!link) {
        link = document.createElement("link");
        link.rel = "alternate";
        link.hreflang = language;
        document.head.appendChild(link);
      }
      link.href = `https://www.dennishilk.com${route}`;
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

  const normalizedMuseumPath = () => {
    const raw = path.startsWith("/de/museum/") ? path.slice(3) : path;
    return raw.endsWith("/index.html") ? raw.slice(0, -"index.html".length) : raw;
  };

  const museumCurrentName = () => {
    const named = document.querySelector("h1 .name")?.textContent?.trim();
    if (named) return named;
    const heading = document.querySelector("h1")?.textContent?.replace(/\s+/g, " ")?.trim();
    if (heading) return heading.replace(/^[^\s]+@[^\s]+:\S*\$\s*/, "");
    return document.title.split(/\s+[|–—]\s+/)[0]?.trim() || "Computer Museum";
  };

  const museumBreadcrumb = () => {
    const route = normalizedMuseumPath();
    if (!route.startsWith("/museum/") || route === "/museum/") return null;
    const current = museumCurrentName();
    const items = [[de ? "Startseite" : "Home", de ? "/de/" : "/"], ["Computer Museum", "/museum/"]];

    const cluster = (prefix, label) => {
      if (!route.startsWith(prefix)) return false;
      if (route === prefix) items.push([label, path]);
      else {
        const parent = path.startsWith("/de/museum/") ? "/de" + prefix : prefix;
        items.push([label, parent], [current, path]);
      }
      return true;
    };

    if (cluster("/museum/cryptography-lab/", de ? "Kryptografie-Labor" : "Cryptography Lab")) return items;
    if (cluster("/museum/malware-history/", de ? "Malware-Geschichte" : "Malware History Lab")) return items;
    if (cluster("/museum/linux-terminal-academy/", "Linux Terminal Academy")) return items;

    if (route.startsWith("/museum/home-computing-lab/")) {
      items.push([de ? "Computing-Labor des Autors" : "The Author's Computing Lab", "/museum/home-computing-lab/"]);
      if (route === "/museum/home-computing-lab/") return items;
      if (route.startsWith("/museum/home-computing-lab/field-notes/")) {
        items.push([de ? "Field Notes & Artefakte" : "Field Notes & Artifacts", "/museum/home-computing-lab/field-notes/"]);
        if (route === "/museum/home-computing-lab/field-notes/") return items;
      }
      items.push([current, path]);
      return items;
    }

    items.push([current, path]);
    return items;
  };

  const hasJsonLdType = type => {
    for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
      try {
        const data = JSON.parse(script.textContent);
        const nodes = Array.isArray(data) ? data : Array.isArray(data?.["@graph"]) ? data["@graph"] : [data];
        if (nodes.some(node => node?.["@type"] === type || (Array.isArray(node?.["@type"]) && node["@type"].includes(type)))) return true;
      } catch (error) {}
    }
    return false;
  };

  const addBreadcrumb = () => {
    const items = breadcrumbs.get(path) || breadcrumbForWiesmoorObserver() || museumBreadcrumb();
    if (!items || document.getElementById("seo-breadcrumb-jsonld") || hasJsonLdType("BreadcrumbList")) return;
    const payload = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: items.map(([name, route], index) => ({
        "@type": "ListItem",
        position: index + 1,
        name,
        item: `https://www.dennishilk.com${route}`,
      })),
    };
    const script = document.createElement("script");
    script.id = "seo-breadcrumb-jsonld";
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(payload);
    document.head.appendChild(script);
  };

  const addMuseumWebPageSchema = () => {
    const route = normalizedMuseumPath();
    if (!route.startsWith("/museum/")) return;
    const robots = document.querySelector('meta[name="robots"]')?.getAttribute("content") || "";
    if (/\bnoindex\b/i.test(robots) || document.getElementById("seo-museum-webpage-jsonld")) return;

    const canonical = document.querySelector('link[rel="canonical"]')?.href || location.href.split("#")[0];
    const description = document.querySelector('meta[name="description"]')?.getAttribute("content") || "";
    const payload = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": canonical + "#webpage",
      url: canonical,
      name: document.title,
      description,
      inLanguage: document.documentElement.lang === "de" ? "de" : "en",
      creator: {"@id": "https://www.dennishilk.com/#dennis-hilk"},
      isPartOf: {"@id": "https://www.dennishilk.com/museum/#museum"},
    };
    const script = document.createElement("script");
    script.id = "seo-museum-webpage-jsonld";
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(payload);
    document.head.appendChild(script);
  };

  const enrichMuseumMetadata = () => {
    const route = normalizedMuseumPath();
    if (!route.startsWith("/museum/")) return;
    const canonical = document.querySelector('link[rel="canonical"]')?.href || location.href.split("#")[0];
    const description = document.querySelector('meta[name="description"]')?.getAttribute("content") || "";
    const title = document.title;

    setMeta('meta[property="og:site_name"]', "Dennis Hilk Computer Museum", { property: "og:site_name" });
    setMeta('meta[property="og:type"]', "website", { property: "og:type" });
    setMeta('meta[property="og:url"]', canonical, { property: "og:url" });
    setMeta('meta[property="og:title"]', title, { property: "og:title" });
    setMeta('meta[property="og:description"]', description, { property: "og:description" });
    setMeta('meta[name="twitter:card"]', "summary_large_image", { name: "twitter:card" });
    setMeta('meta[name="twitter:title"]', title, { name: "twitter:title" });
    setMeta('meta[name="twitter:description"]', description, { name: "twitter:description" });
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

    const ensureDoomControllerProof = () => {
      const story = document.querySelector(".hcl-field-story");
      if (!story) return;

      let proof = document.getElementById("cisco-doom-controller-proof");
      if (!proof) {
        proof = document.createElement("section");
        proof.id = "cisco-doom-controller-proof";
        proof.dataset.siteI18nSkip = "true";
        const currentResult = [...document.querySelectorAll(".hcl-field-story > section")].find(section =>
          /^(Current result|Aktueller Stand)$/i.test(section.querySelector(":scope > h2")?.textContent?.trim() || ""),
        );
        if (currentResult) currentResult.insertAdjacentElement("beforebegin", proof);
        else story.appendChild(proof);
      }

      const language = currentLanguage();
      if (proof.dataset.language === language && proof.dataset.ready === "true") return;
      proof.dataset.language = language;
      proof.dataset.ready = "true";

      const copy = language === "de" ? {
        title: "Aufnahme 03: Das Cisco steuert DOOM wirklich",
        intro: "Der letzte fehlende Teil war die Eingabe. Die Zifferntasten des CP-9951 senden während des laufenden Calls DTMF über RFC4733 an Asterisk. Ein ausschließlich lokal gebundener AMI-Zugang liefert die empfangenen DTMF-Ereignisse an eine kleine Python-Bridge, die über Linux /dev/uinput echte Tastaturereignisse erzeugt.",
        caption: "Aufnahme 03 — Cisco-Tasten als DOOM-Controller. Bewegung, Feuern und Türen öffnen werden mit den echten Zifferntasten des CP-9951 ausgelöst.",
        path: "Cisco CP-9951 Tastenfeld\n        ↓\nDTMF / RFC4733\n        ↓\nAsterisk\n        ↓\nAMI DTMF Events\n        ↓\nlokale Python-Bridge\n        ↓\nLinux /dev/uinput\n        ↓\nDOOM Retro",
        mapping: "2 = vorwärts       8 = rückwärts\n4 = links drehen   6 = rechts drehen\n5 = feuern          0 = benutzen / öffnen",
        note: "Der bestehende Video- und Audiopfad blieb dabei unverändert. AMI ist nur auf 127.0.0.1 gebunden; Zugangsdaten werden hier bewusst nicht veröffentlicht.",
        final: "DOOM läuft nicht nur auf dem Cisco. DOOM wird mit dem Cisco gespielt. :D",
        fallback: "Dein Browser unterstützt eingebettete MP4-Videos nicht.",
      } : {
        title: "Recording 03: the Cisco really controls DOOM",
        intro: "The final missing piece was input. During the active call, the CP-9951 keypad sends DTMF over RFC4733 to Asterisk. A localhost-only AMI connection exposes the received DTMF events to a tiny Python bridge, which generates real keyboard events through Linux /dev/uinput.",
        caption: "Recording 03 — Cisco keypad as a DOOM controller. Movement, firing and opening doors are driven by the real number keys on the CP-9951.",
        path: "Cisco CP-9951 keypad\n        ↓\nDTMF / RFC4733\n        ↓\nAsterisk\n        ↓\nAMI DTMF events\n        ↓\nlocal Python bridge\n        ↓\nLinux /dev/uinput\n        ↓\nDOOM Retro",
        mapping: "2 = forward        8 = backward\n4 = turn left      6 = turn right\n5 = fire           0 = use / open",
        note: "The existing video and audio path stayed untouched. AMI is bound to 127.0.0.1 only; credentials are intentionally not published here.",
        final: "DOOM is not just displayed on the Cisco. DOOM is played with the Cisco. :D",
        fallback: "Your browser does not support embedded MP4 video.",
      };

      proof.innerHTML = `
        <h2>${copy.title}</h2>
        <p>${copy.intro}</p>
        <figure class="hcl-story-evidence">
          <video controls playsinline preload="metadata" style="display:block;width:100%;height:auto">
            <source src="/assets/home-computing-lab/field-notes/cisco-cp-9951-doom-controller-web.mp4" type="video/mp4">
            ${copy.fallback}
          </video>
          <figcaption>${copy.caption}</figcaption>
        </figure>
        <pre>${copy.path}</pre>
        <pre>${copy.mapping}</pre>
        <p>${copy.note}</p>
        <p><strong>${copy.final}</strong></p>`;
    };

    const syncControllerConclusion = () => {
      const language = currentLanguage();
      const sections = [...document.querySelectorAll(".hcl-field-story > section")];

      let lesson = document.getElementById("cisco-doom-final-result") || document.querySelector(".hcl-field-story > section.hcl-story-lesson");
      if (lesson) {
        lesson.id = "cisco-doom-final-result";
        lesson.dataset.siteI18nSkip = "true";
        lesson.innerHTML = language === "de"
          ? '<h2>Ergebnis</h2><p>Kann ein Cisco CP-9951 DOOM anzeigen und den echten Spielsound ausgeben? Ja.</p><p>Kann es DOOM auch selbst steuern? Ebenfalls ja. Die echten Telefontasten treiben Bewegung, Feuern und Benutzen/Öffnen über RFC4733, Asterisk AMI und Linux uinput. :DD</p>'
          : '<h2>Result</h2><p>Can a Cisco CP-9951 display DOOM and play the real game audio? Yes.</p><p>Can it control DOOM too? Also yes. The real phone keys now drive movement, firing and use/open through RFC4733, Asterisk AMI and Linux uinput. :DD</p>';
      }

      let finalSection = document.getElementById("cisco-doom-controller-final");
      if (!finalSection) {
        finalSection = sections.find(section => /^(Next experiment|Nächstes Experiment)$/i.test(section.querySelector(":scope > h2")?.textContent?.trim() || ""));
        if (finalSection) finalSection.id = "cisco-doom-controller-final";
      }
      if (finalSection) {
        finalSection.dataset.siteI18nSkip = "true";
        finalSection.innerHTML = language === "de"
          ? '<h2>Das Telefon ist jetzt der Controller</h2><p>Der frühere „nächste Versuch“ ist damit abgeschlossen. Der vollständige Eingabepfad lautet jetzt:</p><pre>Cisco CP-9951 Tastatur\n  → DTMF / RFC4733\n  → Asterisk AMI\n  → lokale Python-Bridge\n  → Linux /dev/uinput\n  → DOOM Retro</pre><p>Die Belegung ist bewusst simpel: <strong>2/8</strong> vorwärts/rückwärts, <strong>4/6</strong> drehen, <strong>5</strong> feuern und <strong>0</strong> benutzen/öffnen.</p><p><strong>Damit ist das CP-9951 gleichzeitig SIP-Telefon, DOOM-Display, DOOM-Lautsprecher und echter Hardware-Controller.</strong></p>'
          : '<h2>The phone is now the controller</h2><p>The former “next experiment” is complete. The full input path is now:</p><pre>Cisco CP-9951 keypad\n  → DTMF / RFC4733\n  → Asterisk AMI\n  → local Python bridge\n  → Linux /dev/uinput\n  → DOOM Retro</pre><p>The mapping is deliberately simple: <strong>2/8</strong> forward/backward, <strong>4/6</strong> turn, <strong>5</strong> fire and <strong>0</strong> use/open.</p><p><strong>The CP-9951 is now simultaneously a SIP phone, DOOM display, DOOM speaker and real hardware controller.</strong></p>';
      }

      const description = language === "de"
        ? "Ein Cisco CP-9951 wurde zum SIP/H.264-DOOM-Terminal mit echtem Spielsound und realer Tastensteuerung über RFC4733, Asterisk AMI und Linux uinput."
        : "A Cisco CP-9951 became a SIP/H.264 DOOM terminal with real game audio and real keypad control through RFC4733, Asterisk AMI and Linux uinput.";
      setMeta('meta[name="description"]', description, { name: "description" });
      setMeta('meta[property="og:description"]', description, { property: "og:description" });
      setMeta('meta[name="twitter:description"]', description, { name: "twitter:description" });
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
        if (pre.closest("#cisco-doom-controller-proof") || pre.closest("#cisco-doom-controller-final")) return;
        const value = pre.textContent;
        if (/Werner/.test(value) && /111/.test(value) && /DOOM/.test(value) && /666/.test(value)) {
          pre.textContent = language === "de"
            ? "Taste 2: Werner\n  → 111 → Asterisk → Baresip 200\n  → Werner-Video + Ton → Cisco\n\nTaste 3: DOOM\n  → 666 → Asterisk → Baresip 201\n  → Live-Cthulhu-Video + echter Spielsound → Cisco\n\nController:\n  → Cisco-Tasten → RFC4733 → Asterisk AMI\n  → lokale Python-Bridge → /dev/uinput → DOOM Retro"
            : "Button 2: Werner\n  → 111 → Asterisk → Baresip 200\n  → Werner video + audio → Cisco\n\nButton 3: DOOM\n  → 666 → Asterisk → Baresip 201\n  → live Cthulhu video + real game audio → Cisco\n\nController:\n  → Cisco keypad → RFC4733 → Asterisk AMI\n  → local Python bridge → /dev/uinput → DOOM Retro";
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
      ensureDoomControllerProof();
      syncControllerConclusion();
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
  enrichMuseumMetadata();
  addBreadcrumb();
  addMuseumWebPageSchema();
  patchCiscoFieldNote7();
})();