(function () {
  "use strict";

  const observerId = document.body.dataset.observerId;
  const dedicatedLocalizedObservers = new Set(["cuba-internet-weather", "dns-time-to-answer-index", "dns-tta-stress-index", "global-reachability-long-horizon", "global-reachability-score", "http-reachability-index", "internet-shrinkage-index", "ipv6-adoption-locked-states", "ipv6-global-compare", "ipv6-locked-states", "iran-dns-behavior", "mx-presence-by-country", "mx-presence-per-country", "north-korea-connectivity", "silent-countries-list", "tls-fingerprint-change", "traceroute-to-nowhere", "undersea-cable-dependency", "undersea-cable-dependency-map"]);
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
    return ({
      ok: "OK",
      partial: "teilweise",
      unavailable: "nicht verfügbar",
      unknown: "unbekannt",
      missing: "fehlend",
    })[normalized] || normalized.replaceAll("_", " ");
  }

  function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: String(value).includes("T") ? "short" : undefined,
      timeZone: "UTC",
    }).format(date) + " UTC";
  }

  function observerRoute(language) {
    if (!isDedicatedLocalizedObserver) return null;
    return language === "de"
      ? `/de/world-observer/${observerId}.html`
      : `/world-observer/${observerId}.html`;
  }

  function initDedicatedLanguageSwitcher() {
    if (!isDedicatedLocalizedObserver) return false;

    const currentLanguage = isGerman ? "de" : "en";
    let stored = null;
    try {
      stored = localStorage.getItem("dennishilk-language");
    } catch (error) {}

    if ((stored === "de" || stored === "en") && stored !== currentLanguage) {
      const target = observerRoute(stored);
      if (target) {
        location.replace(`${target}${location.search}${location.hash}`);
        return true;
      }
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
      link.addEventListener("click", () => {
        try {
          localStorage.setItem("dennishilk-language", language);
          localStorage.setItem("about-language", language);
        } catch (error) {}
      });
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
    heading.textContent = isGerman
      ? (localizedObserverNames[observerId] || observer.display_name)
      : observer.display_name;
    main.insertBefore(heading, backNav);
  }

  function ensureDetailStructure() {
    const shell = document.getElementById("observer-content");
    if (!shell || shell.children.length) return;
    shell.className = "internet-detail-shell";
    shell.innerHTML = isGerman
      ? `
        <section class="internet-detail-summary" aria-labelledby="current-observation-title">
          <h2 id="current-observation-title">Aktuelle Beobachtung</h2>
          <div class="internet-detail-summary-grid">
            <p class="internet-detail-primary"><span id="observer-primary-label">Primärmetrik</span><strong id="observer-primary-value">—</strong></p>
            <p id="observer-last-update" class="internet-detail-updated">Letzte Beobachtung/Aktualisierung: —</p>
            <dl id="observer-secondary-metrics" class="internet-secondary-metrics internet-detail-secondary"></dl>
          </div>
        </section>
        <section class="internet-detail-section internet-detail-history-section" aria-labelledby="history-title">
          <h2 id="history-title">Verlauf</h2>
          <p id="observer-history-summary" class="internet-detail-placeholder">Veröffentlichter Verlauf wird geladen…</p>
          <div class="internet-detail-history-wrap">
            <table id="observer-history-table" class="internet-detail-history">
              <thead><tr><th scope="col">Datum</th><th scope="col">Wert</th><th scope="col">Datenstatus</th></tr></thead>
              <tbody></tbody>
            </table>
          </div>
        </section>
        <section class="internet-detail-section" aria-labelledby="observed-title"><h2 id="observed-title">Beobachtet</h2><p class="internet-detail-placeholder">Observer-spezifische Einordnung wird in einem späteren Gestaltungsschritt ergänzt.</p></section>
        <section class="internet-detail-section" aria-labelledby="derived-title"><h2 id="derived-title">Abgeleitet</h2><p class="internet-detail-placeholder">Observer-spezifische Einordnung wird in einem späteren Gestaltungsschritt ergänzt.</p></section>
        <section class="internet-detail-section" aria-labelledby="unknown-title"><h2 id="unknown-title">Unbekannt</h2><p class="internet-detail-placeholder">Observer-spezifische Einordnung wird in einem späteren Gestaltungsschritt ergänzt.</p></section>
        <section class="internet-detail-section" aria-labelledby="methodology-title"><h2 id="methodology-title">Methodik</h2><p class="internet-detail-placeholder">Observer-spezifische Einordnung wird in einem späteren Gestaltungsschritt ergänzt.</p></section>
        <section class="internet-detail-section" aria-labelledby="sources-title"><h2 id="sources-title">Quellen</h2><p class="internet-detail-placeholder">Observer-spezifische Einordnung wird in einem späteren Gestaltungsschritt ergänzt.</p></section>
      `
      : "";
  }

  function renderSecondaryMetrics(observer) {
    const container = document.getElementById("observer-secondary-metrics");
    container.textContent = "";
    const entries = Object.entries(observer.secondary_metrics || {});
    if (!entries.length) {
      const term = document.createElement("dt");
      term.textContent = t.secondaryMetrics;
      const value = document.createElement("dd");
      value.textContent = "—";
      container.append(term, value);
      return;
    }

    entries.forEach(([label, rawValue]) => {
      const term = document.createElement("dt");
      term.textContent = metricName(label);
      const value = document.createElement("dd");
      value.textContent = formatMetric(rawValue, observer.secondary_metric_units?.[label]);
      container.append(term, value);
    });
  }

  function renderHistory(record) {
    const summary = document.getElementById("observer-history-summary");
    const table = document.getElementById("observer-history-table");
    const body = table.querySelector("tbody");
    body.textContent = "";
    const points = Array.isArray(record?.points) ? record.points : [];

    if (!points.length) {
      summary.textContent = t.noHistory;
      table.hidden = true;
      return;
    }

    table.hidden = false;
    summary.textContent = t.historySummary(points.length.toLocaleString(locale));
    points.slice(-12).reverse().forEach((point) => {
      const row = document.createElement("tr");
      const date = document.createElement("td");
      date.textContent = point.date || "—";
      const value = document.createElement("td");
      value.textContent = formatMetric(point.value, point.metric_unit || record.metric_unit);
      const status = document.createElement("td");
      status.textContent = formatStatus(point.data_status);
      row.append(date, value, status);
      body.appendChild(row);
    });
  }

  async function loadJson(url) {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
    return response.json();
  }

  async function render() {
    if (initDedicatedLanguageSwitcher()) return;
    ensureDetailStructure();

    const [dashboardResult, historyResult] = await Promise.allSettled([
      loadJson(dashboardUrl),
      loadJson(historyUrl),
    ]);

    if (dashboardResult.status !== "fulfilled") throw dashboardResult.reason;
    const dashboard = dashboardResult.value;
    const observer = (dashboard.observers || []).find((entry) => entry.observer === observerId);
    if (!observer) throw new Error(`Observer not found: ${observerId}`);

    ensureCompactHeading(observer);
    document.getElementById("observer-primary-label").textContent =
      metricName(observer.primary_metric_name || t.primaryMetric);
    document.getElementById("observer-primary-value").textContent =
      formatMetric(observer.primary_metric_value, observer.primary_metric_unit);
    document.getElementById("observer-last-update").textContent =
      `${t.lastUpdate}: ${formatDate(observer.last_seen_date)}`;

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
