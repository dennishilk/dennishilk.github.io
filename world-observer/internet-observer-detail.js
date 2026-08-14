(function () {
  "use strict";

  const observerId = document.body.dataset.observerId;
  const dedicatedLocalizedObservers = new Set(["cuba-internet-weather", "dns-time-to-answer-index", "dns-tta-stress-index", "global-reachability-long-horizon", "global-reachability-score", "http-reachability-index", "internet-shrinkage-index", "ipv6-adoption-locked-states", "ipv6-global-compare", "ipv6-locked-states", "iran-dns-behavior", "mx-presence-by-country", "mx-presence-per-country", "north-korea-connectivity", "silent-countries-list", "tls-fingerprint-change", "traceroute-to-nowhere", "undersea-cable-dependency", "undersea-cable-dependency-map"]);
  const quickShowcases = {
    "dns-time-to-answer-index": { kind: "dns-latency", theme: "resolver", tag: ["RESOLVER LATENCY BENCH", "RESOLVER-LATENZMESSUNG"], lead: ["Sequential A and AAAA lookup timings from the published export. Resolver identities, answers and TTL values are not stored.", "Sequenzielle A- und AAAA-Zeitmessungen aus dem veröffentlichten Export. Resolver-Identitäten, Antworten und TTL-Werte werden nicht gespeichert."] },
    "dns-tta-stress-index": { kind: "dns-stress", theme: "stress", tag: ["DNS STRESS FIELD", "DNS-STRESSFELD"], lead: ["Eight published country samples combine DNS timing, jitter, timeout rate and a 30-day baseline into the observer stress score.", "Acht veröffentlichte Länderstichproben verbinden DNS-Zeit, Jitter, Timeout-Rate und eine 30-Tage-Basislinie zum Observer-Stresswert."] },
    "global-reachability-long-horizon": { kind: "horizon", theme: "horizon", tag: ["LONG-HORIZON REACHABILITY", "LANGZEIT-ERREICHBARKEIT"], lead: ["A deliberately small two-country sample with current score, 90/180-day means, slopes and exported horizon flags.", "Eine bewusst kleine Zwei-Länder-Stichprobe mit aktuellem Wert, 90-/180-Tage-Mitteln, Trends und exportierten Langzeit-Flags."] },
    "global-reachability-score": { kind: "reach-score", theme: "reach", tag: ["THREE-SIGNAL REACHABILITY", "DREI-SIGNAL-ERREICHBARKEIT"], lead: ["Each sampled target can score one point for ICMP, TCP 443 and DNS A. The page shows only the exported two-country sample.", "Jedes Stichprobenziel kann je einen Punkt für ICMP, TCP 443 und DNS A erhalten. Die Seite zeigt ausschließlich die exportierte Zwei-Länder-Stichprobe."] },
    "http-reachability-index": { kind: "http", theme: "http", tag: ["HTTP ENDPOINT ARRAY", "HTTP-ENDPOINT-ARRAY"], lead: ["Eight public HTTPS targets with reachability, HTTP status and observed response time from one published run.", "Acht öffentliche HTTPS-Ziele mit Erreichbarkeit, HTTP-Status und beobachteter Antwortzeit aus einem veröffentlichten Lauf."] },
    "ipv6-adoption-locked-states": { kind: "ipv6-adoption", theme: "ipv6", tag: ["NATIVE IPv6 DUAL CHECK", "NATIVER IPv6-DUALCHECK"], lead: ["A target counts only when AAAA resolution and a TCP 443 handshake over native IPv6 both succeed.", "Ein Ziel zählt nur, wenn AAAA-Auflösung und TCP-443-Handshake über natives IPv6 beide erfolgreich sind."] },
    "ipv6-global-compare": { kind: "ipv6-compare", theme: "compare", tag: ["IPv6 COMPARISON PLANE", "IPv6-VERGLEICHSEBENE"], lead: ["Three exported country samples compared with the observer's published global reference and 30-day baselines.", "Drei exportierte Länderstichproben im Vergleich mit der veröffentlichten globalen Referenz und 30-Tage-Basislinien des Observers."] },
    "ipv6-locked-states": { kind: "ipv6-unavailable", theme: "unavailable", tag: ["SOURCE AVAILABILITY GATE", "QUELLEN-VERFÜGBARKEIT"], lead: ["The current source export is unavailable. Placeholder zero fields are deliberately not presented as an IPv6 measurement.", "Der aktuelle Quellenexport ist nicht verfügbar. Platzhalter-Nullfelder werden bewusst nicht als IPv6-Messung dargestellt."] },
    "iran-dns-behavior": { kind: "iran-dns", theme: "dnsgrid", tag: ["DNS QUERY MATRIX", "DNS-ABFRAGEMATRIX"], lead: ["Five domains × four record types through standard recursion via the system resolver. No censorship circumvention or evasion is used.", "Fünf Domains × vier Record-Typen über Standard-Rekursion des System-Resolvers. Es werden keine Zensurumgehung oder Evasion eingesetzt."] },
    "mx-presence-by-country": { kind: "mx-stub", theme: "stub", tag: ["PASSIVE MX SENSOR BAY", "PASSIVER MX-SENSOR"], lead: ["The export explicitly says no passive data sources are configured yet, so this observer shows an honest empty sensor state.", "Der Export sagt ausdrücklich, dass noch keine passiven Datenquellen konfiguriert sind; deshalb zeigt der Observer einen ehrlichen leeren Sensorzustand."] },
    "mx-presence-per-country": { kind: "mx-per", theme: "mx", tag: ["MX SAMPLE RACK", "MX-STICHPROBENRACK"], lead: ["Five country sample groups with three observations each and exported MX-present, absent, timeout and completeness rates.", "Fünf Länderstichproben mit je drei Beobachtungen und exportierten MX-Present-, Absent-, Timeout- und Vollständigkeitsraten."] },
    "silent-countries-list": { kind: "silent", theme: "silence", tag: ["SIGNAL QUIETNESS BOARD", "SIGNAL-STILLE-BOARD"], lead: ["Five exported country samples ranked by the observer silence score. The current export classifies every row as normal.", "Fünf exportierte Länderstichproben nach dem Silence-Score des Observers. Der aktuelle Export klassifiziert jede Zeile als normal."] },
    "undersea-cable-dependency": { kind: "cable", theme: "cable", tag: ["STATIC CABLE INVENTORY", "STATISCHES KABELINVENTAR"], lead: ["A static three-country infrastructure summary. This is not the premium cable map and not a live cable-status monitor.", "Eine statische Infrastruktur-Zusammenfassung für drei Länder. Das ist weder die Premium-Kabelkarte noch ein Live-Kabelstatus-Monitor."] }
  };
  const isDedicatedLocalizedObserver = dedicatedLocalizedObservers.has(observerId);
  const isGerman = document.documentElement.lang.toLowerCase().startsWith("de");
  const locale = isGerman ? "de-DE" : "en-GB";
  const dashboardUrl = "/world-observer/dashboard/internet.json";
  const historyUrl = "/world-observer/dashboard/history/internet-observers.json";

  const localizedObserverNames = {
    "cuba-internet-weather": "Kuba Internet-Wetter",
    "dns-time-to-answer-index": "DNS-Antwortzeitindex",
    "dns-tta-stress-index": "DNS-TTA-Stressindex",
    "global-reachability-long-horizon": "Globale Erreichbarkeit – Langzeithorizont",
    "global-reachability-score": "Globaler Erreichbarkeitswert",
    "http-reachability-index": "HTTP-Erreichbarkeitsindex",
    "internet-shrinkage-index": "Internet-Schrumpfungsindex",
    "ipv6-adoption-locked-states": "IPv6-Adoption – Locked States",
    "ipv6-global-compare": "IPv6 Global Compare",
    "ipv6-locked-states": "IPv6 Locked States",
    "iran-dns-behavior": "Iran DNS-Verhalten",
    "mx-presence-by-country": "MX-Präsenz nach Land",
    "mx-presence-per-country": "MX-Präsenz pro Land",
    "north-korea-connectivity": "Nordkorea-Konnektivität",
    "silent-countries-list": "Liste stiller Länder",
    "tls-fingerprint-change": "TLS-Fingerprint-Änderung",
    "traceroute-to-nowhere": "Traceroute ins Nirgendwo",
    "undersea-cable-dependency": "Abhängigkeit von Unterseekabeln",
    "undersea-cable-dependency-map": "Karte der Unterseekabel-Abhängigkeiten"
  };

  const copy = {
    en: {
      primaryMetric: "Primary metric",
      secondaryMetrics: "Secondary metrics",
      lastUpdate: "Last observation/update",
      noHistory: "No published history is available for this observer yet.",
      historySummary: (count) => `${count} published history points are available. Showing the 12 most recent.`,
      unavailable: "Observer data is not available yet.",
    },
    de: {
      primaryMetric: "Primärmetrik",
      secondaryMetrics: "Sekundärmetriken",
      lastUpdate: "Letzte Beobachtung/Aktualisierung",
      noHistory: "Für diesen Observer ist noch kein veröffentlichter Verlauf verfügbar.",
      historySummary: (count) => `${count} veröffentlichte Verlaufspunkte sind verfügbar. Angezeigt werden die 12 neuesten.`,
      unavailable: "Observer-Daten sind derzeit nicht verfügbar.",
    },
  };

  const t = copy[isGerman ? "de" : "en"];

  const metricNamesDE = {
    "Average ping time": "Durchschnittliche Ping-Zeit",
    "Average DNS response": "Durchschnittliche DNS-Antwortzeit",
    "DNS stress score": "DNS-Stresswert",
    "Average reachability score": "Durchschnittlicher Erreichbarkeitswert",
    "Reachability score": "Erreichbarkeitswert",
    "HTTP success rate": "HTTP-Erfolgsrate",
    "Shrinkage index": "Schrumpfungsindex",
    "data_status": "Datenstatus",
    "Countries evaluated": "Ausgewertete Länder",
    "DNS answers": "DNS-Antworten",
    "MX records present": "Vorhandene MX-Einträge",
    "TCP probes": "TCP-Sonden",
    "Significant events": "Signifikante Ereignisse",
    "Trace count": "Traceroute-Anzahl",
    "Cable count": "Kabelanzahl",
    "DNS timeouts": "DNS-Zeitüberschreitungen",
    "Queries checked": "Geprüfte Abfragen",
    "Successful queries": "Erfolgreiche Abfragen",
    "Reachability percent": "Erreichbarkeit",
    "Average response time": "Durchschnittliche Antwortzeit",
    "Reachable targets": "Erreichbare Ziele",
    "Targets checked": "Geprüfte Ziele",
    "IPv6 capable rate": "IPv6-fähiger Anteil",
    "SERVFAIL responses": "SERVFAIL-Antworten",
    "ICMP probes": "ICMP-Sonden",
    "Silent countries listed": "Aufgeführte stille Länder",
    "TLS change score": "TLS-Änderungswert",
    "Landing points": "Landepunkte",
  };

  function metricName(value) {
    return isGerman ? (metricNamesDE[value] || value) : value;
  }

  function formatNumber(value) {
    if (value === null || value === undefined || value === "") return "—";
    if (typeof value === "number") {
      return Number.isInteger(value)
        ? value.toLocaleString(locale)
        : value.toLocaleString(locale, { maximumFractionDigits: 2 });
    }
    return String(value).toLowerCase() === "ok" ? "OK" : String(value);
  }

  function formatMetric(value, unit) {
    const formatted = formatNumber(value);
    if (formatted === "—" || !unit || ["count", "score"].includes(String(unit).toLowerCase())) return formatted;
    return `${formatted} ${unit}`;
  }

  function formatStatus(value) {
    const normalized = String(value || "unknown").toLowerCase();
    if (!isGerman) return normalized.replaceAll("_", " ");
    return ({ ok: "OK", partial: "teilweise", unavailable: "nicht verfügbar", unknown: "unbekannt", missing: "fehlend" })[normalized] || normalized.replaceAll("_", " ");
  }

  function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: String(value).includes("T") ? "short" : undefined, timeZone: "UTC" }).format(date) + " UTC";
  }

  function observerRoute(language) {
    if (!isDedicatedLocalizedObserver) return null;
    return language === "de" ? `/de/world-observer/${observerId}.html` : `/world-observer/${observerId}.html`;
  }

  function initDedicatedLanguageSwitcher() {
    if (!isDedicatedLocalizedObserver) return false;
    const currentLanguage = isGerman ? "de" : "en";
    let stored = null;
    try { stored = localStorage.getItem("dennishilk-language"); } catch (error) {}
    if ((stored === "de" || stored === "en") && stored !== currentLanguage) {
      const target = observerRoute(stored);
      if (target) { location.replace(`${target}${location.search}${location.hash}`); return true; }
    }
    const nav = document.createElement("nav");
    nav.className = "internet-detail-language-switcher";
    nav.setAttribute("aria-label", "Page language / Seitensprache");
    const makeLink = (language, label) => {
      const link = document.createElement("a");
      link.href = observerRoute(language);
      link.hreflang = language;
      link.lang = language;
      link.textContent = label;
      link.setAttribute("aria-current", String(language === currentLanguage));
      link.addEventListener("click", () => { try { localStorage.setItem("dennishilk-language", language); localStorage.setItem("about-language", language); } catch (error) {} });
      return link;
    };
    nav.append(makeLink("en", "EN"));
    const separator = document.createElement("span");
    separator.textContent = "|";
    separator.setAttribute("aria-hidden", "true");
    nav.append(separator, makeLink("de", "DE"));
    document.body.appendChild(nav);
    return false;
  }

  function ensureCompactHeading(observer) {
    if (!isDedicatedLocalizedObserver || document.querySelector(".internet-detail-eyebrow")) return;
    const main = document.querySelector(".world-observer-page main");
    const backNav = main?.querySelector(".wo-back-nav");
    if (!main || !backNav) return;
    const heading = document.createElement("h1");
    heading.className = "internet-detail-eyebrow";
    heading.textContent = isGerman ? (localizedObserverNames[observerId] || observer.display_name) : observer.display_name;
    main.insertBefore(heading, backNav);
  }

  function quickHeading() {
    if (document.querySelector(".internet-detail-eyebrow")) return;
    const main = document.querySelector(".world-observer-page main");
    const backNav = main?.querySelector(".wo-back-nav");
    if (!main || !backNav) return;
    const heading = document.createElement("h1");
    heading.className = "internet-detail-eyebrow";
    heading.textContent = isGerman ? (localizedObserverNames[observerId] || document.title.split(" – ")[0]) : document.title.split(" – ")[0];
    main.insertBefore(heading, backNav);
  }

  function initQuickShowcase() {
    const config = quickShowcases[observerId];
    if (!config) return false;
    document.body.classList.add("quick-showcase");
    document.body.dataset.showcaseKind = config.kind;
    document.body.dataset.showcaseTheme = config.theme;
    quickHeading();
    const style = document.createElement("link");
    style.rel = "stylesheet";
    style.href = "/world-observer/internet-observer-showcase.css?v=1";
    style.dataset.quickShowcaseStyle = "true";
    document.head.appendChild(style);
    const shell = document.getElementById("observer-content");
    if (!shell) return true;
    const langIndex = isGerman ? 1 : 0;
    const observed = isGerman ? "Beobachtet" : "Observed";
    const derived = isGerman ? "Abgeleitet" : "Derived";
    const unknown = isGerman ? "Unbekannt" : "Unknown";
    const methodology = isGerman ? "Methodik" : "Methodology";
    const sources = isGerman ? "Quellen" : "Sources";
    shell.className = "quick-showcase-shell";
    shell.innerHTML = `
      <section class="quick-section" aria-labelledby="current-observation-title">
        <div class="quick-section-head"><div><span class="quick-section-index">01 / ${config.tag[langIndex]}</span><h2 id="current-observation-title">${isGerman ? "Aktuelle Beobachtung" : "Current Observation"}</h2></div><p class="quick-section-intro">${config.lead[langIndex]}</p></div>
        <div class="quick-current-layout"><aside class="quick-primary"><small>${isGerman ? "Primäranzeige" : "Primary readout"}</small><strong id="quick-primary-value">—</strong><span id="quick-primary-label" class="quick-primary-label">—</span><span id="quick-status" class="quick-status">—</span><p id="quick-update" class="quick-update">—</p></aside><div id="quick-visual" class="quick-visual"></div></div>
      </section>
      <section class="quick-section" aria-labelledby="history-title"><div class="quick-history-head"><div><span class="quick-section-index">02 / ${isGerman ? "VERÖFFENTLICHTER VERLAUF" : "PUBLISHED HISTORY"}</span><h2 id="history-title">${isGerman ? "Verlauf" : "History"}</h2></div><p id="quick-history-meta" class="quick-history-meta">—</p></div><div id="quick-history-plot" class="quick-history-panel"></div><p id="quick-history-summary" class="quick-history-summary">—</p><details class="quick-history-details"><summary>${isGerman ? "Neueste veröffentlichte Punkte öffnen" : "Open recent published points"}</summary><div class="quick-history-table-wrap"><table id="observer-history-table" class="quick-history-table"><thead><tr><th>${isGerman ? "Datum" : "Date"}</th><th>${isGerman ? "Wert" : "Value"}</th><th>${isGerman ? "Datenstatus" : "Data status"}</th></tr></thead><tbody></tbody></table></div></details></section>
      <section class="quick-section"><div class="quick-section-head"><div><span class="quick-section-index">03 / EVIDENCE BOUNDARY</span><h2>${isGerman ? "Was der Export sagen kann — und was nicht" : "What the export can — and cannot — say"}</h2></div><p class="quick-section-intro">${isGerman ? "Exportierte Beobachtung, Browser-Darstellung und nicht exportierter Kontext bleiben getrennt." : "Exported observation, browser presentation and unexported context stay separate."}</p></div><div class="quick-evidence-grid"><article class="quick-evidence-card"><h3>${observed}</h3><ul><li>${isGerman ? "Aktuelle Felder stammen ausschließlich aus dem statischen Latest-Export dieses Observers." : "Current fields come only from this observer's static latest export."}</li><li>${isGerman ? "Verlaufspunkte stammen ausschließlich aus dem veröffentlichten History-Export." : "History points come only from the published history export."}</li></ul></article><article class="quick-evidence-card"><h3>${derived}</h3><ul><li>${isGerman ? "Relative Balken oder Rangfolgen sind reine Browser-Darstellung innerhalb des aktuellen Exports." : "Relative bars or ranking are browser-only views within the current export."}</li><li>${isGerman ? "Es werden keine externen Werte ergänzt." : "No external values are added."}</li></ul></article><article class="quick-evidence-card"><h3>${unknown}</h3><ul><li>${isGerman ? "Ursachen, Provider-/Routing-Kontext und Repräsentativität außerhalb der Stichprobe sind nicht belegt." : "Causes, provider/routing context and representativeness beyond the sample are not established."}</li><li>${isGerman ? "Fehlender Kontext wird nicht durch Annahmen ersetzt." : "Missing context is not replaced with assumptions."}</li></ul></article></div></section>
      <section class="quick-method-grid"><article class="quick-method-card"><h2>${methodology}</h2><p>${isGerman ? "Die Seite führt selbst keine Live-Messung durch. Sie visualisiert den bereits veröffentlichten Latest-Export und dessen vorhandene History-Reihe; observer-spezifische Einschränkungen werden direkt in der aktuellen Darstellung gezeigt." : "The page performs no live measurement. It visualizes the already-published latest export and its existing history series; observer-specific limitations are shown directly in the current display."}</p></article><article class="quick-method-card"><h2>${sources}</h2><p><code>/world-observer/dashboard/latest/${observerId}.json</code><br><code>/world-observer/dashboard/history/internet-observers.json</code></p></article></section>`;
    const script = document.createElement("script");
    script.src = "/world-observer/internet-observer-showcase.js?v=1";
    script.dataset.quickShowcaseRuntime = "true";
    document.head.appendChild(script);
    return true;
  }

  function ensureDetailStructure() {
    const shell = document.getElementById("observer-content");
    if (!shell || shell.children.length) return;
    shell.className = "internet-detail-shell";
    shell.innerHTML = isGerman
      ? `
        <section class="internet-detail-summary" aria-labelledby="current-observation-title"><h2 id="current-observation-title">Aktuelle Beobachtung</h2><div class="internet-detail-summary-grid"><p class="internet-detail-primary"><span id="observer-primary-label">Primärmetrik</span><strong id="observer-primary-value">—</strong></p><p id="observer-last-update" class="internet-detail-updated">Letzte Beobachtung/Aktualisierung: —</p><dl id="observer-secondary-metrics" class="internet-secondary-metrics internet-detail-secondary"></dl></div></section>
        <section class="internet-detail-section internet-detail-history-section" aria-labelledby="history-title"><h2 id="history-title">Verlauf</h2><p id="observer-history-summary" class="internet-detail-placeholder">Veröffentlichter Verlauf wird geladen…</p><div class="internet-detail-history-wrap"><table id="observer-history-table" class="internet-detail-history"><thead><tr><th scope="col">Datum</th><th scope="col">Wert</th><th scope="col">Datenstatus</th></tr></thead><tbody></tbody></table></div></section>
        <section class="internet-detail-section" aria-labelledby="observed-title"><h2 id="observed-title">Beobachtet</h2><p class="internet-detail-placeholder">Observer-spezifische Einordnung wird in einem späteren Gestaltungsschritt ergänzt.</p></section><section class="internet-detail-section" aria-labelledby="derived-title"><h2 id="derived-title">Abgeleitet</h2><p class="internet-detail-placeholder">Observer-spezifische Einordnung wird in einem späteren Gestaltungsschritt ergänzt.</p></section><section class="internet-detail-section" aria-labelledby="unknown-title"><h2 id="unknown-title">Unbekannt</h2><p class="internet-detail-placeholder">Observer-spezifische Einordnung wird in einem späteren Gestaltungsschritt ergänzt.</p></section><section class="internet-detail-section" aria-labelledby="methodology-title"><h2 id="methodology-title">Methodik</h2><p class="internet-detail-placeholder">Observer-spezifische Einordnung wird in einem späteren Gestaltungsschritt ergänzt.</p></section><section class="internet-detail-section" aria-labelledby="sources-title"><h2 id="sources-title">Quellen</h2><p class="internet-detail-placeholder">Observer-spezifische Einordnung wird in einem späteren Gestaltungsschritt ergänzt.</p></section>`
      : "";
  }

  function renderSecondaryMetrics(observer) {
    const container = document.getElementById("observer-secondary-metrics");
    container.textContent = "";
    const entries = Object.entries(observer.secondary_metrics || {});
    if (!entries.length) {
      const term = document.createElement("dt"); term.textContent = t.secondaryMetrics;
      const value = document.createElement("dd"); value.textContent = "—";
      container.append(term, value); return;
    }
    entries.forEach(([label, rawValue]) => {
      const term = document.createElement("dt"); term.textContent = metricName(label);
      const value = document.createElement("dd"); value.textContent = formatMetric(rawValue, observer.secondary_metric_units?.[label]);
      container.append(term, value);
    });
  }

  function renderHistory(record) {
    const summary = document.getElementById("observer-history-summary");
    const table = document.getElementById("observer-history-table");
    const body = table.querySelector("tbody");
    body.textContent = "";
    const points = Array.isArray(record?.points) ? record.points : [];
    if (!points.length) { summary.textContent = t.noHistory; table.hidden = true; return; }
    table.hidden = false;
    summary.textContent = t.historySummary(points.length.toLocaleString(locale));
    points.slice(-12).reverse().forEach((point) => {
      const row = document.createElement("tr");
      const date = document.createElement("td"); date.textContent = point.date || "—";
      const value = document.createElement("td"); value.textContent = formatMetric(point.value, point.metric_unit || record.metric_unit);
      const status = document.createElement("td"); status.textContent = formatStatus(point.data_status);
      row.append(date, value, status); body.appendChild(row);
    });
  }

  async function loadJson(url) {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
    return response.json();
  }

  async function render() {
    if (initDedicatedLanguageSwitcher()) return;
    if (initQuickShowcase()) return;
    ensureDetailStructure();
    const [dashboardResult, historyResult] = await Promise.allSettled([loadJson(dashboardUrl), loadJson(historyUrl)]);
    if (dashboardResult.status !== "fulfilled") throw dashboardResult.reason;
    const dashboard = dashboardResult.value;
    const observer = (dashboard.observers || []).find((entry) => entry.observer === observerId);
    if (!observer) throw new Error(`Observer not found: ${observerId}`);
    ensureCompactHeading(observer);
    document.getElementById("observer-primary-label").textContent = metricName(observer.primary_metric_name || t.primaryMetric);
    document.getElementById("observer-primary-value").textContent = formatMetric(observer.primary_metric_value, observer.primary_metric_unit);
    document.getElementById("observer-last-update").textContent = `${t.lastUpdate}: ${formatDate(observer.last_seen_date)}`;
    renderSecondaryMetrics(observer);
    const history = historyResult.status === "fulfilled" ? historyResult.value : null;
    renderHistory(history?.observers?.[observerId]);
    document.getElementById("observer-loading").hidden = true;
    document.getElementById("observer-content").hidden = false;
  }

  render().catch((error) => {
    console.error("Unable to render Internet observer detail page", error);
    const loading = document.getElementById("observer-loading");
    loading.textContent = t.unavailable;
  });
}());
