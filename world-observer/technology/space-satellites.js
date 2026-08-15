(function () {
  "use strict";

  const latestUrl = "/world-observer/dashboard/latest/space-satellites.json";
  const isGerman = document.documentElement.lang.toLowerCase().startsWith("de");
  const groupOrder = ["stations", "starlink", "oneweb", "gps_ops", "galileo", "cubesat"];

  const text = isGerman ? {
    loading: "Öffentliche Orbital-Gruppendaten werden geladen…",
    unavailable: "Der Space-/Satelliten-Export ist derzeit nicht verfügbar.",
    records: "GP-Datensätze",
    unique: "Eindeutige Katalog-IDs",
    medianAge: "Medianes Epochenalter",
    inclination: "Mittlere Inklination",
    newest: "Neueste Epoche",
    hours: "h",
    unavailableShort: "nicht verfügbar",
    notAttempted: "nicht abgefragt",
    historyEmpty: "Noch kein veröffentlichter Verlauf vorhanden.",
    historyNote: "Jede Zeile ist ein veröffentlichter Tagespunkt. Gruppenwerte werden nicht addiert.",
    baselineEyebrow: "ERSTE LOKALE VERÖFFENTLICHUNG",
    baselineTitle: "Basislinie etabliert",
    baselineCopy: "Der Verlauf startet bewusst hier. Es gibt keinen rückwirkend aufgefüllten Datenbestand.",
    baselineNote: "Ein echter veröffentlichter Punkt ist vorhanden. Die Zeitreihe wächst erst mit künftigen lokalen Veröffentlichungen.",
    relativeFreshness: "Relative Frische innerhalb der ausgewählten Gruppen",
    freshnessNote: "Längere Balken bedeuten eine jüngere mediane GP-Epoche innerhalb dieses Exports. Das ist kein Satellitenzustand und keine Positionsmessung.",
    cardFreshness: "relative Frische",
    sourceStop: "Quellabfrage gestoppt",
    sourceOk: "Quelle vollständig gelesen",
    orbitLegend: "Ausgewählte GP-Gruppen",
    orbitLegendNote: "Ringe sind nur eine schematische Gruppendarstellung — keine Positionen und keine Flugbahnen.",
  } : {
    loading: "Loading public orbital group data…",
    unavailable: "The Space / Satellites export is currently unavailable.",
    records: "GP records",
    unique: "Unique catalog IDs",
    medianAge: "Median epoch age",
    inclination: "Mean inclination",
    newest: "Newest epoch",
    hours: "h",
    unavailableShort: "unavailable",
    notAttempted: "not queried",
    historyEmpty: "No published history is available yet.",
    historyNote: "Each row is one published daily point. Group values are never summed.",
    baselineEyebrow: "FIRST LOCAL PUBLICATION",
    baselineTitle: "Baseline established",
    baselineCopy: "The published series deliberately starts here. No earlier points are backfilled.",
    baselineNote: "One real published point exists. The time series grows only with future local publications.",
    relativeFreshness: "Relative freshness within selected groups",
    freshnessNote: "Longer bars mean a younger median GP epoch within this export. This is not satellite health and not a position measurement.",
    cardFreshness: "relative freshness",
    sourceStop: "Source query stopped",
    sourceOk: "Source read complete",
    orbitLegend: "Selected GP groups",
    orbitLegendNote: "Rings are a schematic group display only — not positions and not trajectories.",
  };

  function $(id) {
    return document.getElementById(id);
  }

  function formatInteger(value) {
    return Number.isInteger(value)
      ? new Intl.NumberFormat(isGerman ? "de-DE" : "en-US").format(value)
      : "—";
  }

  function formatNumber(value, digits = 2) {
    return typeof value === "number" && Number.isFinite(value)
      ? new Intl.NumberFormat(isGerman ? "de-DE" : "en-US", { maximumFractionDigits: digits }).format(value)
      : "—";
  }

  function formatDateTime(value) {
    if (typeof value !== "string" || !value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat(isGerman ? "de-DE" : "en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    }).format(date) + " UTC";
  }

  function statusLabel(status) {
    if (status === "ok") return "OK";
    if (status === "partial") return isGerman ? "TEILWEISE" : "PARTIAL";
    if (status === "not_attempted") return text.notAttempted.toUpperCase();
    return text.unavailableShort.toUpperCase();
  }

  function freshnessScale(groups) {
    const ages = groupOrder
      .map((key) => groups[key]?.median_epoch_age_hours)
      .filter((value) => typeof value === "number" && Number.isFinite(value));
    const maxAge = ages.length ? Math.max(...ages) : 0;
    const minAge = ages.length ? Math.min(...ages) : 0;
    const span = Math.max(0.01, maxAge - minAge);
    const values = {};

    for (const key of groupOrder) {
      const age = groups[key]?.median_epoch_age_hours;
      values[key] = typeof age === "number" && Number.isFinite(age)
        ? (maxAge === minAge ? 100 : 18 + ((maxAge - age) / span) * 82)
        : 0;
    }
    return values;
  }

  function groupCard(key, group, freshnessWidth) {
    const article = document.createElement("article");
    article.className = "space-group-card";
    article.dataset.status = group?.status || "unavailable";

    const head = document.createElement("div");
    head.className = "space-group-head";
    const identity = document.createElement("div");
    const code = document.createElement("span");
    code.className = "space-group-code";
    code.textContent = group?.query_group || key.toUpperCase();
    const name = document.createElement("h3");
    name.textContent = group?.label || key;
    identity.append(code, name);
    const state = document.createElement("span");
    state.className = "space-group-state";
    state.textContent = statusLabel(group?.status);
    head.append(identity, state);

    const primary = document.createElement("div");
    primary.className = "space-group-primary";
    const primaryLabel = document.createElement("span");
    primaryLabel.textContent = text.records;
    const primaryValue = document.createElement("strong");
    primaryValue.textContent = formatInteger(group?.record_count);
    primary.append(primaryLabel, primaryValue);

    const telemetry = document.createElement("dl");
    telemetry.className = "space-group-telemetry";
    const rows = [
      [text.unique, formatInteger(group?.unique_catalog_ids)],
      [text.medianAge, typeof group?.median_epoch_age_hours === "number" ? `${formatNumber(group.median_epoch_age_hours)} ${text.hours}` : "—"],
      [text.inclination, typeof group?.mean_inclination_deg === "number" ? `${formatNumber(group.mean_inclination_deg)}°` : "—"],
      [text.newest, formatDateTime(group?.newest_epoch_utc)],
    ];

    for (const [label, value] of rows) {
      const row = document.createElement("div");
      const dt = document.createElement("dt");
      const dd = document.createElement("dd");
      dt.textContent = label;
      dd.textContent = value;
      row.append(dt, dd);
      telemetry.appendChild(row);
    }

    const meter = document.createElement("div");
    meter.className = "space-card-freshness";
    const meterHead = document.createElement("div");
    meterHead.className = "space-card-freshness-head";
    const meterLabel = document.createElement("span");
    meterLabel.textContent = text.cardFreshness;
    const meterValue = document.createElement("span");
    meterValue.textContent = typeof group?.median_epoch_age_hours === "number"
      ? `${formatNumber(group.median_epoch_age_hours)} ${text.hours}`
      : "—";
    meterHead.append(meterLabel, meterValue);
    const track = document.createElement("div");
    track.className = "space-card-freshness-track";
    const bar = document.createElement("i");
    bar.style.width = `${Math.max(0, Math.min(100, freshnessWidth || 0))}%`;
    track.appendChild(bar);
    meter.append(meterHead, track);

    article.append(head, primary, telemetry, meter);

    if (group?.reason) {
      const note = document.createElement("p");
      note.className = "space-group-reason";
      note.textContent = group.reason;
      article.appendChild(note);
    }

    return article;
  }

  function renderOrbitField(groups) {
    const field = $("space-orbit-field");
    field.textContent = "";

    const legend = document.createElement("div");
    legend.className = "space-orbit-legend";
    const legendTitle = document.createElement("strong");
    legendTitle.textContent = text.orbitLegend;
    const legendCopy = document.createElement("span");
    legendCopy.textContent = text.orbitLegendNote;
    legend.append(legendTitle, legendCopy);
    field.appendChild(legend);

    const available = groupOrder.filter((key) => groups[key]?.status === "ok");
    groupOrder.forEach((key, index) => {
      const group = groups[key] || {};
      const ring = document.createElement("div");
      ring.className = "space-orbit-ring";
      ring.style.setProperty("--ring-index", String(index));
      ring.dataset.status = group.status || "unavailable";

      const label = document.createElement("span");
      const code = document.createElement("b");
      const count = document.createElement("em");
      code.textContent = group.query_group || key.toUpperCase();
      count.textContent = formatInteger(group.record_count);
      label.append(code, count);
      ring.appendChild(label);
      field.appendChild(ring);
    });

    const core = document.createElement("div");
    core.className = "space-orbit-core";
    const coreValue = document.createElement("span");
    const coreLabel = document.createElement("small");
    coreValue.textContent = `${available.length}/${groupOrder.length}`;
    coreLabel.textContent = isGerman ? "Gruppen" : "groups";
    core.append(coreValue, coreLabel);
    field.appendChild(core);
  }

  function renderFreshness(groups) {
    const container = $("space-freshness-list");
    container.textContent = "";
    const widths = freshnessScale(groups);

    for (const key of groupOrder) {
      const group = groups[key] || {};
      const row = document.createElement("div");
      row.className = "space-freshness-row";
      const label = document.createElement("span");
      label.textContent = group.query_group || key.toUpperCase();
      const track = document.createElement("div");
      track.className = "space-freshness-track";
      const bar = document.createElement("i");
      bar.style.width = `${Math.max(0, Math.min(100, widths[key]))}%`;
      track.appendChild(bar);
      const value = document.createElement("strong");
      const age = group.median_epoch_age_hours;
      value.textContent = typeof age === "number" ? `${formatNumber(age)} ${text.hours}` : "—";
      row.append(label, track, value);
      container.appendChild(row);
    }
  }

  function renderBaseline(memory, point) {
    memory.classList.add("is-baseline");
    const baseline = document.createElement("div");
    baseline.className = "space-baseline-state";

    const copy = document.createElement("div");
    copy.className = "space-baseline-copy";
    const eyebrow = document.createElement("span");
    eyebrow.textContent = text.baselineEyebrow;
    const title = document.createElement("strong");
    title.textContent = text.baselineTitle;
    const note = document.createElement("small");
    note.textContent = text.baselineCopy;
    copy.append(eyebrow, title, note);

    const date = document.createElement("div");
    date.className = "space-baseline-date";
    date.textContent = point.date;
    baseline.append(copy, date);
    memory.appendChild(baseline);
  }

  function renderHistory(history) {
    const points = Array.isArray(history)
      ? history.filter((point) => point && typeof point.date === "string")
      : [];

    $("space-history-points").textContent = formatInteger(points.length);
    $("space-history-first").textContent = points.length ? points[0].date : "—";
    $("space-history-last").textContent = points.length ? points[points.length - 1].date : "—";

    const memory = $("space-memory");
    memory.textContent = "";
    memory.classList.remove("is-baseline");

    if (points.length === 1) {
      renderBaseline(memory, points[0]);
    } else {
      for (const point of points.slice(-60)) {
        const cell = document.createElement("div");
        cell.className = "space-memory-cell";
        cell.title = point.date;
        for (const key of groupOrder) {
          const segment = document.createElement("i");
          segment.className = Number.isInteger(point[`${key}_records`]) ? "has-value" : "is-missing";
          cell.appendChild(segment);
        }
        memory.appendChild(cell);
      }
    }

    const body = $("space-history-body");
    body.textContent = "";
    for (const point of points.slice(-10).reverse()) {
      const row = document.createElement("tr");
      const values = [point.date, ...groupOrder.map((key) => formatInteger(point[`${key}_records`]))];
      values.forEach((value) => {
        const td = document.createElement("td");
        td.textContent = value;
        row.appendChild(td);
      });
      body.appendChild(row);
    }

    $("space-history-note").textContent = points.length === 1
      ? text.baselineNote
      : (points.length ? text.historyNote : text.historyEmpty);
  }

  function render(data) {
    const summary = data?.summary || {};
    const groups = data?.groups || {};
    $("space-selected-groups").textContent = formatInteger(summary.groups_requested);
    $("space-available-groups").textContent = formatInteger(summary.groups_available);
    $("space-freshest-epoch").textContent = formatDateTime(summary.freshest_selected_group_epoch_utc);
    $("space-data-status").textContent = statusLabel(data?.data_status || data?.status);
    $("space-collected-at").textContent = formatDateTime(data?.collected_at_utc);
    $("space-source-state").textContent = data?.diagnostics?.stop_reason ? text.sourceStop : text.sourceOk;
    $("space-source-state").dataset.state = data?.diagnostics?.stop_reason ? "warning" : "ok";

    const widths = freshnessScale(groups);
    const grid = $("space-group-grid");
    grid.textContent = "";
    groupOrder.forEach((key) => grid.appendChild(groupCard(key, groups[key] || {}, widths[key])));

    renderOrbitField(groups);
    renderFreshness(groups);
    renderHistory(data?.history);
  }

  async function load() {
    const loading = $("observer-loading");
    try {
      const response = await fetch(latestUrl, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!data || data.observer !== "space-satellites") throw new Error("unexpected observer payload");
      render(data);
      loading.hidden = true;
      $("observer-content").hidden = false;
    } catch (error) {
      loading.textContent = `${text.unavailable} (${error.message})`;
      loading.dataset.state = "error";
    }
  }

  $("space-freshness-title").textContent = text.relativeFreshness;
  $("space-freshness-note").textContent = text.freshnessNote;
  load();
}());
