(() => {
  const bundle = window.DennisSiteI18nDE || (window.DennisSiteI18nDE = { common: {}, prefixes: {}, pages: {} });
  bundle.common ||= {};
  bundle.prefixes ||= {};
  bundle.pages ||= {};

  const path = "/world-observer/area51.html";
  const existing = bundle.pages[path] || {};
  const spec = {
    title: "Area51-Erreichbarkeit – World Observer",
    description: "Öffentliche Telemetrieansicht des Area51-Reachability-Observers mit aktuellen Exportwerten und veröffentlichtem Verlauf ohne kausale Behauptungen.",
    text: {
      "GROOM LAKE PUBLIC SIGNAL OBSERVATORY": "GROOM LAKE – ÖFFENTLICHES SIGNAL-OBSERVATORIUM",
      "← Back to Internet Observers": "← Zurück zu den Internet-Observern",
      "Establishing public telemetry view…": "Öffentliche Telemetrieansicht wird aufgebaut…",
      "01 / CURRENT EXPORT": "01 / AKTUELLER EXPORT",
      "Current Observation": "Aktuelle Beobachtung",
      "Reachability score": "Erreichbarkeitswert",
      "SCORE / EXPORTED VALUE": "WERT / EXPORTIERTER WERT",
      "Published observer aggregate. The instrument does not represent a geographic position.": "Veröffentlichter Observer-Gesamtwert. Das Instrument stellt keine geografische Position dar.",
      "OBSERVATION CHANNELS": "BEOBACHTUNGSKANÄLE",
      "DATA": "DATEN",
      "Public export values only. No intent, cause, identity, precise position, or military activity is inferred.": "Ausschließlich öffentliche Exportwerte. Daraus werden weder Absicht, Ursache, Identität, genaue Position noch militärische Aktivität abgeleitet.",
      "PUBLIC LOCATION CONTEXT": "ÖFFENTLICHER ORTSKONTEXT",
      "Location / Imagery": "Ort / Bilddaten",
      "Groom Lake, Nevada": "Groom Lake, Nevada",
      "Public aerial / orthoimagery from the current USGS service mosaic. Not a live feed; image age varies with the source mosaic.": "Öffentliche Luft-/Orthobilddaten aus dem aktuellen USGS-Service-Mosaik. Kein Live-Bild; das Alter der Aufnahme hängt vom Quellmosaik ab.",
      "USGS imagery & licensing ↗": "USGS-Bilddaten & Lizenz ↗",
      "02 / PUBLISHED SERIES": "02 / VERÖFFENTLICHTE REIHE",
      "History": "Verlauf",
      "Loading published history…": "Veröffentlichter Verlauf wird geladen…",
      "Accessible recent data table": "Zugängliche Tabelle der neuesten Daten",
      "Most recent published numeric history points": "Neueste veröffentlichte numerische Verlaufspunkte",
      "Date": "Datum",
      "Value": "Wert",
      "RAW / CURRENT": "ROH / AKTUELL",
      "Observed": "Beobachtet",
      "COMPUTED / PUBLISHED": "BERECHNET / VERÖFFENTLICHT",
      "Derived": "Abgeleitet",
      "The existing observer export supplies a derived primary metric. This page does not add a new calculation.": "Der bestehende Observer-Export liefert eine abgeleitete Primärmetrik. Diese Seite fügt keine neue Berechnung hinzu.",
      "ARCHIVE / CONTEXT": "ARCHIV / KONTEXT",
      "Historical": "Historisch",
      "Published history is presented as recorded values without a causal interpretation.": "Der veröffentlichte Verlauf wird als aufgezeichnete Werte ohne kausale Interpretation dargestellt.",
      "BOUNDARY / NOT ESTABLISHED": "GRENZE / NICHT BELEGT",
      "Unknown": "Unbekannt",
      "The exports do not establish identity, purpose, intent, precise position, cause, or military activity. Absence or change in a signal is not an explanation.": "Die Exporte belegen weder Identität, Zweck, Absicht, genaue Position, Ursache noch militärische Aktivität. Das Fehlen oder die Veränderung eines Signals ist keine Erklärung.",
      "03 / DOCUMENTATION": "03 / DOKUMENTATION",
      "Methodology": "Methodik",
      "Detailed collector methodology will be documented in a later observer-specific source review. This interface does not add to or modify the existing measurement logic.": "Die detaillierte Collector-Methodik wird in einer späteren observer-spezifischen Quellenprüfung dokumentiert. Diese Oberfläche ergänzt oder verändert die bestehende Messlogik nicht.",
      "04 / PROVENANCE": "04 / PROVENIENZ",
      "Sources": "Quellen",
      "Telemetry source attribution will be expanded in a later observer-specific pass. The Location / Imagery panel separately uses public USGS / USDA orthoimagery from The National Map.": "Die Quellenangaben zur Telemetrie werden in einem späteren observer-spezifischen Durchgang erweitert. Das Panel Ort / Bilddaten nutzt separat öffentliche USGS-/USDA-Orthobilddaten aus The National Map."
    },
    attributes: {
      "Public USGS and USDA orthoimagery centered on Groom Lake, Nevada": "Öffentliche USGS-/USDA-Orthobilddaten mit Groom Lake, Nevada, im Zentrum",
      "Observation provenance and interpretation boundaries": "Provenienz der Beobachtungen und Grenzen der Interpretation",
      "Current local data exports": "Aktuelle lokale Datenexporte"
    },
    phrases: [
      ["Last observation/update:", "Letzte Beobachtung/Aktualisierung:"],
      ["Primary metric", "Primärmetrik"],
      ["EXPORTED VALUE", "EXPORTIERTER WERT"],
      ["Secondary metrics", "Sekundärmetriken"],
      ["JANET-like aircraft", "JANET-ähnliche Flugzeuge"],
      ["Other aircraft", "Andere Flugzeuge"],
      ["Time buckets", "Zeitfenster"],
      ["COUNT", "ANZAHL"],
      ["Latest exported observation:", "Letzte exportierte Beobachtung:"],
      ["The existing export publishes", "Der bestehende Export veröffentlicht"],
      ["This page displays that supplied value without adding a new calculation or causal interpretation.", "Diese Seite zeigt den bereitgestellten Wert, ohne eine neue Berechnung oder kausale Interpretation hinzuzufügen."],
      ["No published numeric history is available yet.", "Es ist noch kein veröffentlichter numerischer Verlauf verfügbar."],
      ["No published history is available for this observer yet.", "Für diesen Observer ist noch kein veröffentlichter Verlauf verfügbar."],
      ["No published history is available in the existing export yet.", "Im bestehenden Export ist noch kein veröffentlichter Verlauf verfügbar."],
      ["published points", "veröffentlichte Punkte"],
      ["numeric values", "numerische Werte"],
      ["Latest delta", "Letzte Änderung"],
      ["30-day average", "30-Tage-Mittel"],
      ["7-day average", "7-Tage-Mittel"],
      ["Previous", "Vorher"],
      ["Latest", "Aktuell"],
      ["published history points span", "veröffentlichte Verlaufspunkte reichen von"],
      ["contain numeric values. They are displayed without a causal interpretation.", "enthalten numerische Werte. Sie werden ohne kausale Interpretation dargestellt."],
      ["Public observer data is not available yet.", "Öffentliche Observer-Daten sind derzeit nicht verfügbar."],
      ["Area51 Reachability published observation history", "Veröffentlichter Beobachtungsverlauf der Area51-Erreichbarkeit"],
      ["published history points", "veröffentlichten Verlaufspunkten"],
      ["Missing numeric points appear as gaps.", "Fehlende numerische Punkte erscheinen als Lücken."]
    ]
  };

  bundle.pages[path] = {
    ...existing,
    ...spec,
    text: Object.assign({}, existing.text || {}, spec.text || {}),
    attributes: Object.assign({}, existing.attributes || {}, spec.attributes || {}),
    html: Object.assign({}, existing.html || {}, spec.html || {}),
    phrases: [...(existing.phrases || []), ...(spec.phrases || [])],
  };
})();