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

  addPage("/world-observer/media.html", {
    title: "Medien-Observer – Sprachmuster in deutschen Schlagzeilen | World Observer",
    description: "Beobachtung von Sprachmustern in öffentlichen deutschen Schlagzeilen: Medien-Sprachindex, Kategorien, Trends und beobachtete Begriffe – ohne Aussagen zu Absicht, Koordination oder Manipulation.",
    text: {
      "Media Observer": "Medien-Observer",
      "Germany-only media language observer preview loaded from static JSON exports.": "Deutschlandbezogene Vorschau des Medien-Sprach-Observers aus statischen JSON-Exporten.",
      "Media": "Medien",
      "Society": "Gesellschaft",
      "Hometown": "Heimat",
      "Earth & Space": "Erde & Weltraum",
      "Technology": "Technologie",
      "Traffic": "Verkehr",
      "World Observer data not available yet.": "World-Observer-Daten sind derzeit noch nicht verfügbar.",
      "Germany Media Language Observer": "Deutschland: Medien-Sprach-Observer",
      "This observer analyzes language patterns in public headlines. It does not infer intent, causation, coordination, or manipulation.": "Dieser Observer analysiert Sprachmuster in öffentlichen Schlagzeilen. Er leitet daraus keine Absicht, Kausalität, Koordination oder Manipulation ab.",
      "What is this index?": "Was ist dieser Index?",
      "The Media Language Index is a descriptive language marker derived from public headline text captured by the observer.": "Der Medien-Sprachindex ist ein beschreibender Sprachmarker, der aus öffentlich erfassten Schlagzeilentexten des Observers abgeleitet wird.",
      "Use it as a writing-style signal only. It is not evidence of editorial intent, manipulation, coordination, or causation.": "Er dient ausschließlich als Signal für Schreibstil. Er ist kein Beleg für redaktionelle Absicht, Manipulation, Koordination oder Kausalität.",
      "Media Language Index": "Medien-Sprachindex",
      "Public broadcast": "Öffentlich-rechtlich",
      "Private media": "Private Medien",
      "Headlines analyzed": "Analysierte Schlagzeilen",
      "Media Trend": "Medientrend",
      "30d average": "30-Tage-Durchschnitt",
      "Public/private spread": "Abstand öffentlich/privat",
      "Calmer": "Ruhiger",
      "More alarm-oriented": "Stärker alarmorientiert",
      "— Today": "— Heute",
      "Observed changes": "Beobachtete Änderungen",
      "Top observed terms": "Häufigste beobachtete Begriffe",
      "Headline categories": "Schlagzeilen-Kategorien",
      "Trending terms": "Zunehmende Begriffe",
      "Less frequent terms": "Seltener verwendete Begriffe",
      "Today": "Heute",
      "Latest": "Neueste",
      "Waiting for more observations.": "Warten auf weitere Beobachtungen.",
      "Observation range": "Beobachtungsbereich",
      "First observation": "Erste Beobachtung",
      "Range starts after the next observation.": "Der Bereich beginnt nach der nächsten Beobachtung."
    },
    attributes: {
      "Nebby mascot": "Nebby-Maskottchen"
    },
    phrases: [
      [": no usable observations", ": keine nutzbaren Beobachtungen"],
      ["value unavailable", "Wert nicht verfügbar"],
      [": first observation ", ": erste Beobachtung "]
    ]
  });

  addPage("/world-observer/society.html", {
    title: "Gesellschafts-Observer – Öffentliche soziale & wirtschaftliche Indikatoren | World Observer",
    description: "Öffentliche soziale und wirtschaftliche Indikatoren für Gesellschaft und Alltag: Kraftstoff, Haushaltsstrom, ostfriesischer Tee sowie vorbereitete künftige Observer – transparent und rein beschreibend.",
    text: {
      "Society Observer": "Gesellschafts-Observer",
      "Public social and economic indicators from static observer exports.": "Öffentliche soziale und wirtschaftliche Indikatoren aus statischen Observer-Exporten.",
      "Public social and economic indicators": "Öffentliche soziale und wirtschaftliche Indikatoren",
      "Media": "Medien",
      "Society": "Gesellschaft",
      "Hometown": "Heimat",
      "Earth & Space": "Erde & Weltraum",
      "Technology": "Technologie",
      "Traffic": "Verkehr",
      "Fuel Observer": "Kraftstoff-Observer",
      "Electricity Observer": "Strom-Observer",
      "East Frisian Tea Observer": "Ostfriesland-Tee-Observer",
      "Food Observer": "Lebensmittel-Observer",
      "Housing Observer": "Wohnkosten-Observer",
      "Deutsche Bahn Observer": "Deutsche-Bahn-Observer",
      "Deutsche Post Observer": "Deutsche-Post-Observer",
      "PLANNED": "GEPLANT",
      "German fuel prices": "Kraftstoffpreise in Deutschland",
      "Average German petrol and diesel prices, refreshed from public ADAC fuel-price releases.": "Durchschnittliche deutsche Benzin- und Dieselpreise, aktualisiert anhand öffentlicher ADAC-Kraftstoffpreis-Meldungen.",
      "Current values": "Aktuelle Werte",
      "Fuel Trend": "Kraftstofftrend",
      "Observed changes": "Beobachtete Änderungen",
      "ADAC press releases · Germany-wide averages · EUR/L": "ADAC-Pressemitteilungen · Deutschlandweite Durchschnittswerte · EUR/L",
      "Average household electricity price (EUR/kWh) and a fixed 3,500 kWh example household cost for Germany.": "Durchschnittlicher Haushaltsstrompreis (EUR/kWh) und beispielhafte Haushaltskosten bei fest angenommenen 3.500 kWh für Deutschland.",
      "Household electricity": "Haushaltsstrom",
      "Source: Eurostat": "Quelle: Eurostat",
      "Representative East Frisian black tea price monitoring with a strict public product listing signal.": "Repräsentative Preisbeobachtung für ostfriesischen Schwarztee auf Basis eines streng öffentlichen Produktsignals.",
      "Representative black tea": "Repräsentativer Schwarztee",
      "Prepared stub: price history appears only after a representative 1 kg loose black tea product can be observed from a public, reproducible product listing.": "Vorbereiteter Platzhalter: Eine Preisreihe erscheint erst, wenn ein repräsentatives 1-kg-Produkt für losen Schwarztee über eine öffentliche, reproduzierbare Produktlistung beobachtet werden kann.",
      "Prepared for future public product data.": "Vorbereitet für künftige öffentliche Produktdaten.",
      "Planned observer": "Geplanter Observer",
      "Food price observer prepared for future public CPI or retail-basket data.": "Lebensmittelpreis-Observer für künftige öffentliche VPI- oder Warenkorb-Daten vorbereitet.",
      "Housing cost observer prepared for future rent or housing-cost series.": "Wohnkosten-Observer für künftige Miet- oder Wohnkosten-Zeitreihen vorbereitet.",
      "Public rail service indicators are planned but not collected yet.": "Öffentliche Bahn-Serviceindikatoren sind geplant, werden aber noch nicht erhoben.",
      "Public postal price or service indicators are planned but not collected yet.": "Öffentliche Postpreis- oder Serviceindikatoren sind geplant, werden aber noch nicht erhoben.",
      "Waiting for fuel observations.": "Warten auf Kraftstoff-Beobachtungen.",
      "Waiting for next observation": "Warten auf die nächste Beobachtung",
      "Current price": "Aktueller Preis",
      "30d avg (available data)": "30-Tage-Durchschnitt (verfügbare Daten)",
      "365d avg (available data)": "365-Tage-Durchschnitt (verfügbare Daten)",
      "Last seen": "Zuletzt gesehen",
      "365d comparison": "365-Tage-Vergleich",
      "First observation recorded. Trend line starts after the next observation.": "Erste Beobachtung erfasst. Die Trendlinie beginnt nach der nächsten Beobachtung.",
      "Waiting for more historical observations.": "Warten auf weitere historische Beobachtungen.",
      "Waiting for more observations.": "Warten auf weitere Beobachtungen.",
      "Waiting for first observation": "Warten auf die erste Beobachtung",
      "Prepared for future East Frisian black tea price history; no price data is available yet.": "Für eine künftige Preisreihe zu ostfriesischem Schwarztee vorbereitet; derzeit sind noch keine Preisdaten verfügbar.",
      "Waiting for the first representative East Frisian black tea observation.": "Warten auf die erste repräsentative Beobachtung zu ostfriesischem Schwarztee.",
      "No observed tea price changes yet.": "Noch keine beobachteten Änderungen beim Teepreis.",
      "Germany-only electricity price observer is waiting for an available Society dashboard export.": "Der deutschlandbezogene Strompreis-Observer wartet auf einen verfügbaren Society-Dashboard-Export.",
      "Germany-only household electricity price observer using exported public dashboard data.": "Deutschlandbezogener Haushaltsstrompreis-Observer auf Basis exportierter öffentlicher Dashboard-Daten.",
      "Annual household cost": "Jährliche Haushaltskosten",
      "Monthly household cost": "Monatliche Haushaltskosten",
      "Tea Trend": "Teetrend",
      "Today": "Heute",
      "Latest": "Neueste",
      "Observation range": "Beobachtungsbereich",
      "First observation": "Erste Beobachtung",
      "Range starts after the next observation.": "Der Bereich beginnt nach der nächsten Beobachtung.",
      "Lower": "Niedriger",
      "Higher": "Höher"
    },
    attributes: {
      "Nebby mascot": "Nebby-Maskottchen"
    },
    phrases: [
      ["Fuel Trend (last ", "Kraftstofftrend (letzte "],
      ["Tea Trend (last ", "Teetrend (letzte "],
      [" days)", " Tage)"],
      [": no usable observations", ": keine nutzbaren Beobachtungen"],
      ["value unavailable", "Wert nicht verfügbar"],
      [": first observation ", ": erste Beobachtung "]
    ]
  });
})();