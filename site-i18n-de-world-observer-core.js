(() => {
  const bundle = window.DennisSiteI18nDE || (window.DennisSiteI18nDE = { common: {}, prefixes: {}, pages: {} });
  bundle.common ||= {};
  bundle.prefixes ||= {};
  bundle.pages ||= {};

  const mergeSpec = (target, extra) => {
    target ||= {};
    for (const key of ["text", "attributes", "html"]) target[key] = Object.assign({}, target[key] || {}, extra[key] || {});
    target.phrases = [...(target.phrases || []), ...(extra.phrases || [])];
    if (extra.title) target.title = extra.title;
    if (extra.description) target.description = extra.description;
    return target;
  };
  const addPage = (path, spec) => { bundle.pages[path] = mergeSpec(bundle.pages[path], spec); };

  addPage("/world-observer.html", {
    title: "World Observer – Öffentliche Daten zu Internet, Umwelt, Gesellschaft & Technologie",
    description: "Langfristige Beobachtungen öffentlicher Daten zu Internet-Infrastruktur, Umwelt, Gesellschaft und Technologie mit transparenten Quellen, Historie und klaren Interpretationsgrenzen.",
    text: {
      "Observe. Don't speculate.": "Beobachten. Nicht spekulieren.",
      "Static observation dashboard preview for public, non-tracking data exports.": "Statische Beobachtungsübersicht auf Basis öffentlicher, nicht-trackender Datenexporte.",
      "Hometown": "Heimat",
      "Traffic": "Verkehr",
      "World Observer shows observational data only. It does not make causal claims, does not claim manipulation, and should not be read as proof of intent.": "World Observer zeigt ausschließlich Beobachtungsdaten. Daraus werden keine Kausalbehauptungen oder Manipulationsvorwürfe abgeleitet, und die Daten sind nicht als Beleg für eine Absicht zu verstehen.",
      "Dashboard values are descriptive public-data indicators and should be read with their observer-specific context.": "Dashboard-Werte sind beschreibende Indikatoren aus öffentlichen Daten und müssen im jeweiligen Kontext des Observers gelesen werden.",
      "observers total": "Observer gesamt",
      "dashboard version": "Dashboard-Version",
      "Server Heartbeat": "Server-Heartbeat",
      "Server heartbeat not available yet.": "Server-Heartbeat ist derzeit nicht verfügbar.",
      "status": "Status",
      "latest heartbeat UTC": "Letzter Heartbeat UTC",
      "relative age": "Relatives Alter",
      "offline": "offline",
      "just now": "gerade eben"
    },
    attributes: {
      "World Observer data policy": "Datenrichtlinie des World Observer",
      "World Observer status metrics": "Statusmetriken des World Observer"
    },
    phrases: [
      ["Latest heartbeat from", "Letzter Heartbeat aus"],
      ["dashboard export", "Dashboard-Export"],
      ["GitHub API fallback", "GitHub-API-Fallback"],
      [" ago", " zuvor"]
    ]
  });

  addPage("/world-observer/technology.html", {
    text: {
      "Space Technology": "Weltraumtechnik",
      "Public orbital group telemetry with strict provenance and no invented real-time positions.": "Öffentliche Telemetrie ausgewählter Orbitalgruppen mit klarer Provenienz und ohne erfundene Echtzeitpositionen.",
      "Space / Satellites": "Weltraum / Satelliten",
      "Selected CelesTrak GP groups observed independently: Stations, Starlink, OneWeb, GPS Operational, Galileo and CubeSats.": "Ausgewählte CelesTrak-GP-Gruppen werden getrennt beobachtet: Stations, Starlink, OneWeb, GPS Operational, Galileo und CubeSats.",
      "Groups available:": "Verfügbare Gruppen:",
      "Starlink GP records:": "Starlink-GP-Datensätze:",
      "Freshest selected GP epoch:": "Neueste ausgewählte GP-Epoche:",
      "LOADING": "LÄDT"
    },
    attributes: {
      "Space technology observer cards": "Observer-Karten zur Weltraumtechnik",
      "Open Space / Satellites observer": "Observer Weltraum / Satelliten öffnen"
    },
    phrases: [
      ["Groups available:", "Verfügbare Gruppen:"],
      ["Starlink GP records:", "Starlink-GP-Datensätze:"],
      ["Freshest selected GP epoch:", "Neueste ausgewählte GP-Epoche:"]
    ]
  });

  addPage("/world-observer/internet.html", {
    title: "Internet-Observer – Öffentliche Infrastruktur-Signale | World Observer",
    description: "Öffentliche Signale zur Internet-Infrastruktur als Zeitreihen: DNS, HTTP, IPv6, TLS, Routing, Unterseekabel und globale Erreichbarkeit – mit transparenten Quellen und ohne Kausalbehauptungen.",
    text: {
      "Internet Observers": "Internet-Observer",
      "Public infrastructure signals, observed as time series.": "Öffentliche Infrastruktur-Signale, als Zeitreihen beobachtet.",
      "Active Observers": "Aktive Observer",
      "Loading Internet observer data…": "Internet-Observer-Daten werden geladen…",
      "Internet observers describe public infrastructure signals only. They do not establish cause, intent, or attribution, and should be read as observational indicators rather than proof of manipulation.": "Internet-Observer beschreiben ausschließlich öffentliche Infrastruktur-Signale. Sie belegen weder Ursache, Absicht noch Zuschreibung und sind als Beobachtungsindikatoren zu lesen, nicht als Beweis für Manipulation.",
      "Open observer →": "Observer öffnen →",
      "Current cards loaded. Trend file is not available yet.": "Aktuelle Karten geladen. Die Trenddatei ist derzeit nicht verfügbar.",
      "No Internet observer data published yet.": "Noch keine Internet-Observer-Daten veröffentlicht.",
      "The first observation will appear after the initial daily run.": "Die erste Beobachtung erscheint nach dem ersten täglichen Lauf.",
      "This observer could not be rendered, but other observers are still available.": "Dieser Observer konnte nicht dargestellt werden; die übrigen Observer bleiben verfügbar."
    },
    phrases: [
      ["Last update:", "Letzte Aktualisierung:"],
      ["Open observer →", "Observer öffnen →"],
      ["Internet Observer", "Internet-Observer"],
      [" observations", " Beobachtungen"],
      ["Open ", "Observer öffnen: "],
      [" observer", ""]
    ]
  });
})();