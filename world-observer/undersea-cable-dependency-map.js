(function () {
  "use strict";

  const observerId = "undersea-cable-dependency-map";
  const isGerman = document.documentElement.lang.toLowerCase().startsWith("de");
  const locale = isGerman ? "de-DE" : "en-GB";
  const latestUrl = `/world-observer/dashboard/latest/${observerId}.json`;
  const historyUrl = "/world-observer/dashboard/history/internet-observers.json";
  const $ = (id) => document.getElementById(id);

  const copy = {
    en: {
      loadingError: "Pinned public export could not be loaded.",
      historyUnavailable: "No published numeric history is available for this observer.",
      historySummary: (count) => `${count} published numeric points. This is export history, not uninterrupted calendar-day coverage.`,
      exportedCode: "exported country code",
      cableCount: "Cable count field",
      landingCount: "Landing count field",
      dependency: "Dependency score",
      redundancy: "Redundancy score",
      unknown: "unknown",
      historyAria: (count) => `${count} published numeric cable-count history points`,
    },
    de: {
      loadingError: "Der fixierte öffentliche Export konnte nicht geladen werden.",
      historyUnavailable: "Für diesen Observer ist kein veröffentlichter numerischer Verlauf verfügbar.",
      historySummary: (count) => `${count} veröffentlichte numerische Punkte. Dies ist Exportverlauf und keine lückenlose Kalender-Tagesabdeckung.`,
      exportedCode: "exportierter Ländercode",
      cableCount: "Kabelanzahl-Feld",
      landingCount: "Landepunkt-Feld",
      dependency: "Abhängigkeitswert",
      redundancy: "Redundanzwert",
      unknown: "unbekannt",
      historyAria: (count) => `${count} veröffentlichte numerische Kabelanzahl-Verlaufspunkte`,
    },
  };

  const t = copy[isGerman ? "de" : "en"];

  function formatInteger(value) {
    if (!Number.isFinite(Number(value))) return "—";
    return Number(value).toLocaleString(locale, { maximumFractionDigits: 0 });
  }

  function formatScore(value) {
    if (!Number.isFinite(Number(value))) return "—";
    return Number(value).toLocaleString(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function formatTimestamp(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return `${new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    }).format(date)} UTC`;
  }

  function formatStatus(value) {
    const normalized = String(value || "unknown").toLowerCase();
    if (!isGerman) return normalized.replaceAll("_", " ").toUpperCase();
    return ({
      ok: "OK",
      partial: "TEILWEISE",
      unavailable: "NICHT VERFÜGBAR",
      error: "FEHLER",
      unknown: "UNBEKANNT",
    })[normalized] || normalized.replaceAll("_", " ").toUpperCase();
  }

  function readableToken(value) {
    return String(value || "—").replaceAll("_", " ");
  }

  function markerTrack(count, kind) {
    const track = document.createElement("span");
    track.className = "cable-marker-track";
    track.setAttribute("aria-hidden", "true");

    const numeric = Number.isFinite(Number(count)) ? Math.max(0, Math.trunc(Number(count))) : 0;
    const rendered = Math.min(numeric, 8);
    for (let index = 0; index < rendered; index += 1) {
      const marker = document.createElement("span");
      marker.className = `cable-count-marker${kind === "landing" ? " landing" : ""}`;
      track.appendChild(marker);
    }
    if (numeric > rendered) {
      const overflow = document.createElement("span");
      overflow.className = "cable-marker-overflow";
      overflow.textContent = `+${numeric - rendered}`;
      track.appendChild(overflow);
    }
    return track;
  }

  function markerRow(label, count, kind) {
    const row = document.createElement("div");
    row.className = "cable-marker-row";

    const name = document.createElement("span");
    name.className = "cable-marker-label";
    name.textContent = label;

    const value = document.createElement("span");
    value.className = "cable-marker-count";
    value.textContent = formatInteger(count);

    row.append(name, markerTrack(count, kind), value);
    return row;
  }

  function metric(term, value, formatter) {
    const wrapper = document.createElement("div");
    const dt = document.createElement("dt");
    const dd = document.createElement("dd");
    dt.textContent = term;
    dd.textContent = formatter(value);
    wrapper.append(dt, dd);
    return wrapper;
  }

  function renderCountries(countries) {
    const container = $("country-profiles");
    container.textContent = "";

    countries.forEach((country) => {
      const card = document.createElement("article");
      card.className = "cable-country-card";
      card.dataset.country = String(country.country || "unknown");

      const head = document.createElement("div");
      head.className = "cable-country-head";
      const code = document.createElement("span");
      code.className = "cable-country-code";
      code.textContent = String(country.country || "—");
      const caption = document.createElement("span");
      caption.className = "cable-country-caption";
      caption.textContent = t.exportedCode;
      head.append(code, caption);

      const markers = document.createElement("div");
      markers.className = "cable-marker-zone";
      markers.append(
        markerRow(t.cableCount, country.cable_count, "cable"),
        markerRow(t.landingCount, country.landing_count, "landing"),
      );

      const metrics = document.createElement("dl");
      metrics.className = "cable-country-metrics";
      metrics.append(
        metric(t.cableCount, country.cable_count, formatInteger),
        metric(t.landingCount, country.landing_count, formatInteger),
        metric(t.dependency, country.dependency_score, formatScore),
        metric(t.redundancy, country.redundancy_score, formatScore),
      );

      card.append(head, markers, metrics);
      container.appendChild(card);
    });
  }

  function renderLatest(data) {
    const countries = Array.isArray(data?.countries) ? data.countries : [];
    const cableFieldSum = countries.reduce((sum, row) => sum + (Number.isFinite(Number(row.cable_count)) ? Number(row.cable_count) : 0), 0);
    const landingFieldSum = countries.reduce((sum, row) => sum + (Number.isFinite(Number(row.landing_count)) ? Number(row.landing_count) : 0), 0);

    $("summary-countries").textContent = formatInteger(countries.length);
    $("summary-cables").textContent = formatInteger(cableFieldSum);
    $("summary-landings").textContent = formatInteger(landingFieldSum);
    $("summary-status").textContent = formatStatus(data?.data_status);
    $("export-timestamp").textContent = formatTimestamp(data?.timestamp);

    $("dataset-source-type").textContent = readableToken(data?.source_type);
    $("dataset-methodology").textContent = String(data?.methodology_version || "—");
    $("dataset-status").textContent = formatStatus(data?.data_status);
    $("dataset-timestamp").textContent = formatTimestamp(data?.timestamp);
    $("dataset-hash").textContent = String(data?.dataset_hash_sha256 || "—");
    $("dataset-note").textContent = String(data?.notes || "—");

    renderCountries(countries);
  }

  function numericHistoryPoints(record) {
    return Array.isArray(record?.points)
      ? record.points.filter((point) => typeof point?.value === "number" && Number.isFinite(point.value))
      : [];
  }

  function countChanges(points) {
    let changes = 0;
    for (let index = 1; index < points.length; index += 1) {
      if (points[index].value !== points[index - 1].value) changes += 1;
    }
    return changes;
  }

  function currentRun(points) {
    if (!points.length) return 0;
    const latest = points.at(-1).value;
    let run = 0;
    for (let index = points.length - 1; index >= 0; index -= 1) {
      if (points[index].value !== latest) break;
      run += 1;
    }
    return run;
  }

  function renderHistory(record) {
    const points = numericHistoryPoints(record);
    const memory = $("history-memory");
    memory.textContent = "";

    if (!points.length) {
      $("history-points").textContent = "0";
      $("history-distinct").textContent = "0";
      $("history-changes").textContent = "0";
      $("history-run").textContent = "0";
      $("history-metric").textContent = "—";
      $("history-summary").textContent = t.historyUnavailable;
      memory.setAttribute("aria-label", t.historyUnavailable);
      return;
    }

    const distinct = new Set(points.map((point) => point.value));
    const changes = countChanges(points);
    const run = currentRun(points);

    $("history-points").textContent = formatInteger(points.length);
    $("history-distinct").textContent = formatInteger(distinct.size);
    $("history-changes").textContent = formatInteger(changes);
    $("history-run").textContent = formatInteger(run);
    $("history-metric").textContent = String(points.at(-1)?.metric_name || record?.preferred_metric_paths?.[0] || "—");
    $("history-summary").textContent = t.historySummary(points.length.toLocaleString(locale));
    memory.setAttribute("aria-label", t.historyAria(points.length.toLocaleString(locale)));

    points.forEach((point, index) => {
      const cell = document.createElement("span");
      cell.className = "cable-memory-cell";
      if (index > 0 && point.value !== points[index - 1].value) cell.classList.add("is-change");
      if (!point.date) cell.classList.add("is-missing");
      cell.title = `${point.date || "—"} // ${point.value} // ${point.data_status || t.unknown}`;
      memory.appendChild(cell);
    });
  }

  async function loadJson(url) {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
    return response.json();
  }

  async function render() {
    const [latestResult, historyResult] = await Promise.allSettled([
      loadJson(latestUrl),
      loadJson(historyUrl),
    ]);

    if (latestResult.status === "fulfilled") {
      renderLatest(latestResult.value);
      $("observer-loading").hidden = true;
    } else {
      console.error("Unable to load Undersea Cable Dependency Map export", latestResult.reason);
      $("observer-loading").textContent = t.loadingError;
      $("observer-loading").classList.add("is-error");
    }

    if (historyResult.status === "fulfilled") {
      renderHistory(historyResult.value?.observers?.[observerId]);
    } else {
      console.error("Unable to load Undersea Cable Dependency Map history", historyResult.reason);
      renderHistory(null);
    }
  }

  render();
}());
