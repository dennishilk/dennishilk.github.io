(() => {
  "use strict";

  const OBSERVER_ID = "tls-fingerprint-change";
  const DASHBOARD_URL = "/world-observer/dashboard/internet.json";
  const LATEST_URL = "/world-observer/dashboard/latest/tls-fingerprint-change.json";
  const HISTORY_URL = "/world-observer/dashboard/history/internet-observers.json";
  const isGerman = document.documentElement.lang.toLowerCase().startsWith("de");
  const locale = isGerman ? "de-DE" : "en-US";

  const loading = document.getElementById("observer-loading");
  const content = document.getElementById("observer-content");
  const significantCount = document.getElementById("tls-significant-count");
  const countriesEvaluated = document.getElementById("tls-countries-evaluated");
  const dashboardChangeScore = document.getElementById("tls-dashboard-change-score");
  const anySignificant = document.getElementById("tls-any-significant");
  const massEvent = document.getElementById("tls-mass-event");
  const currentDate = document.getElementById("tls-current-date");
  const countrySurfaces = document.getElementById("tls-country-surfaces");
  const sigmaMult = document.getElementById("tls-sigma-mult");
  const triggerCount = document.getElementById("tls-trigger-count");
  const historyFirstDate = document.getElementById("tls-history-first-date");
  const historyLastDate = document.getElementById("tls-history-last-date");
  const memoryField = document.getElementById("tls-memory-field");
  const historySummary = document.getElementById("tls-history-summary");
  const historyPoints = document.getElementById("tls-history-points");
  const numericPoints = document.getElementById("tls-numeric-points");
  const nonzeroPoints = document.getElementById("tls-nonzero-points");
  const valueChanges = document.getElementById("tls-value-changes");
  const zeroRun = document.getElementById("tls-zero-run");
  const latestHistory = document.getElementById("tls-latest-history");
  const historyBody = document.getElementById("tls-history-body");
  const tls13Count = document.getElementById("tls-tls13-count");
  const aes256Count = document.getElementById("tls-aes256-count");
  const methodSigma = document.getElementById("tls-method-sigma");

  function number(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function formatNumber(value, digits = 2) {
    if (!Number.isFinite(value)) return "—";
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value);
  }

  function formatInteger(value) {
    if (!Number.isFinite(value)) return "—";
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value);
  }

  function formatPercent(value, digits = 0) {
    if (!Number.isFinite(value)) return "—";
    return `${formatNumber(value * 100, digits)}%`;
  }

  function formatDate(value) {
    if (!value) return "—";
    const simple = /^\d{4}-\d{2}-\d{2}$/.test(value);
    const date = new Date(simple ? `${value}T00:00:00Z` : value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: "UTC",
    }).format(date);
  }

  function boolLabel(value) {
    if (value === true) return isGerman ? "JA" : "YES";
    if (value === false) return isGerman ? "NEIN" : "NO";
    return "—";
  }

  function distributionLeader(distribution) {
    const entries = Object.entries(distribution || {})
      .map(([key, value]) => [key, number(value)])
      .filter(([, value]) => value !== null)
      .sort((a, b) => b[1] - a[1]);
    return entries[0] || ["—", null];
  }

  function profileLine(label, name, value) {
    const row = document.createElement("div");
    row.className = "tls-profile-line";

    const labelNode = document.createElement("span");
    labelNode.textContent = label;

    const meter = document.createElement("span");
    meter.className = "tls-profile-meter";
    const fill = document.createElement("i");
    const normalized = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
    fill.style.setProperty("--meter", `${(normalized * 100).toFixed(2)}%`);
    meter.append(fill);

    const valueNode = document.createElement("strong");
    valueNode.textContent = name;
    row.append(labelNode, meter, valueNode);
    return row;
  }

  function metaBlock(label, value) {
    const block = document.createElement("div");
    const labelNode = document.createElement("span");
    const valueNode = document.createElement("strong");
    labelNode.textContent = label;
    valueNode.textContent = value;
    block.append(labelNode, valueNode);
    return block;
  }

  function renderCountries(countries) {
    countrySurfaces.replaceChildren();

    countries.forEach(country => {
      const card = document.createElement("article");
      card.className = "tls-country-card";
      card.dataset.significant = String(country.is_significant === true);

      const head = document.createElement("div");
      head.className = "tls-country-head";
      const countryCode = document.createElement("strong");
      countryCode.className = "tls-country-code";
      countryCode.textContent = country.country || "—";
      const state = document.createElement("span");
      state.className = "tls-country-state";
      state.textContent = country.is_significant === true
        ? (isGerman ? "SIGNIFIKANT" : "SIGNIFICANT")
        : (isGerman ? "KEIN TRIGGER" : "NO TRIGGER");
      head.append(countryCode, state);

      const score = number(country.tls_change_score) ?? 0;
      const surface = document.createElement("div");
      surface.className = "tls-surface-hash";
      surface.setAttribute("aria-label", isGerman
        ? `Visuelle Kodierung des TLS-Änderungswerts ${formatNumber(score)}`
        : `Visual encoding of TLS change score ${formatNumber(score)}`);
      const litCells = Math.round(Math.max(0, Math.min(1, score)) * 12);
      for (let index = 0; index < 12; index += 1) {
        const cell = document.createElement("i");
        if (index < litCells) cell.className = "is-lit";
        surface.append(cell);
      }

      const [tlsName, tlsShare] = distributionLeader(country.tls_version_distribution);
      const [cipherName, cipherShare] = distributionLeader(country.cipher_class_distribution);
      const success = number(country.tls_success_rate);
      const abort = number(country.handshake_abort_rate);
      const alpn = number(country.alpn_presence_rate);

      const meta = document.createElement("div");
      meta.className = "tls-country-meta";
      meta.append(
        metaBlock(isGerman ? "Samples" : "Samples", formatInteger(number(country.sample_size))),
        metaBlock(isGerman ? "Vollständig" : "Complete", formatPercent(number(country.data_completeness), 0)),
        metaBlock(isGerman ? "Change" : "Change", formatNumber(score)),
      );

      card.append(
        head,
        surface,
        profileLine("TLS", `${tlsName} ${formatPercent(tlsShare, 0)}`, tlsShare),
        profileLine(isGerman ? "Cipher" : "Cipher", `${cipherName} ${formatPercent(cipherShare, 0)}`, cipherShare),
        profileLine(isGerman ? "Erfolg" : "Success", formatPercent(success, 0), success),
        profileLine(isGerman ? "Abbruch" : "Abort", formatPercent(abort, 0), abort),
        profileLine("ALPN", formatPercent(alpn, 0), alpn),
        meta,
      );
      countrySurfaces.append(card);
    });
  }

  function renderMemory(points) {
    memoryField.replaceChildren();
    const numeric = points.filter(point => point.numericValue !== null);
    const maxPositive = Math.max(1, ...numeric.map(point => Math.max(0, point.numericValue)));

    points.forEach(point => {
      const cell = document.createElement("span");
      cell.className = "tls-memory-cell";
      if (point.numericValue === null) {
        cell.classList.add("is-missing");
      } else if (point.numericValue > 0) {
        cell.classList.add("is-event");
        cell.style.setProperty("--event-level", String(Math.min(1, point.numericValue / maxPositive)));
      }
      cell.title = `${formatDate(point.date)} · ${point.numericValue === null ? "—" : formatInteger(point.numericValue)} · ${point.data_status || "—"}`;
      cell.setAttribute("aria-label", cell.title);
      memoryField.append(cell);
    });
  }

  function renderTable(points) {
    historyBody.replaceChildren();
    points.slice(-20).reverse().forEach(point => {
      const row = document.createElement("tr");
      const dateCell = document.createElement("td");
      const valueCell = document.createElement("td");
      const statusCell = document.createElement("td");
      dateCell.textContent = formatDate(point.date);
      valueCell.textContent = point.numericValue === null ? "—" : formatInteger(point.numericValue);
      statusCell.textContent = point.data_status || "—";
      row.append(dateCell, valueCell, statusCell);
      historyBody.append(row);
    });
  }

  function countChanges(numeric) {
    let changes = 0;
    for (let index = 1; index < numeric.length; index += 1) {
      if (numeric[index].numericValue !== numeric[index - 1].numericValue) changes += 1;
    }
    return changes;
  }

  function countTrailingZeros(numeric) {
    let count = 0;
    for (let index = numeric.length - 1; index >= 0; index -= 1) {
      if (numeric[index].numericValue !== 0) break;
      count += 1;
    }
    return count;
  }

  function render(dashboard, latest, historyRoot) {
    const observer = dashboard?.observers?.find(item => item.observer === OBSERVER_ID);
    const history = historyRoot?.observers?.[OBSERVER_ID];
    if (!observer || latest?.observer !== OBSERVER_ID || !history) {
      throw new Error("TLS observer export missing");
    }

    const countries = Array.isArray(latest.countries) ? latest.countries : [];
    const points = Array.isArray(history.points) ? history.points.map(point => ({
      ...point,
      numericValue: number(point.value),
    })) : [];
    const numeric = points.filter(point => point.numericValue !== null);
    if (!countries.length || !points.length) throw new Error("TLS observer export incomplete");

    const currentSignificant = number(latest.summary_stats?.significant_count)
      ?? number(observer.primary_metric_value);
    const countryCount = number(latest.summary_stats?.countries_evaluated)
      ?? number(observer.secondary_metrics?.["Countries evaluated"])
      ?? countries.length;
    const dashboardScore = number(observer.secondary_metrics?.["TLS change score"]);
    const sigma = number(latest.significance?.sigma_mult);
    const triggers = Array.isArray(latest.significance?.triggers) ? latest.significance.triggers : [];

    significantCount.textContent = formatInteger(currentSignificant);
    countriesEvaluated.textContent = formatInteger(countryCount);
    dashboardChangeScore.textContent = formatNumber(dashboardScore ?? 0);
    anySignificant.textContent = boolLabel(latest.significance?.any_significant);
    anySignificant.dataset.state = String(latest.significance?.any_significant === true);
    massEvent.textContent = boolLabel(latest.summary_stats?.mass_event);
    massEvent.dataset.state = String(latest.summary_stats?.mass_event === true);
    currentDate.textContent = formatDate(latest.date_utc || observer.last_seen_date);
    sigmaMult.textContent = formatNumber(sigma, 1);
    triggerCount.textContent = formatInteger(triggers.length);
    methodSigma.textContent = formatNumber(sigma, 1);

    renderCountries(countries);

    const allTls13 = countries.filter(country => number(country.tls_version_distribution?.["TLS1.3"]) === 1).length;
    const allAes256 = countries.filter(country => number(country.cipher_class_distribution?.AES_256) === 1).length;
    tls13Count.textContent = `${allTls13}/${countries.length}`;
    aes256Count.textContent = `${allAes256}/${countries.length}`;

    const nonzero = numeric.filter(point => point.numericValue > 0).length;
    const changes = countChanges(numeric);
    const trailingZeros = countTrailingZeros(numeric);
    const latestNumeric = numeric[numeric.length - 1]?.numericValue ?? null;

    historyFirstDate.textContent = formatDate(points[0]?.date);
    historyLastDate.textContent = formatDate(points[points.length - 1]?.date);
    historyPoints.textContent = formatInteger(points.length);
    numericPoints.textContent = formatInteger(numeric.length);
    nonzeroPoints.textContent = formatInteger(nonzero);
    valueChanges.textContent = formatInteger(changes);
    zeroRun.textContent = formatInteger(trailingZeros);
    latestHistory.textContent = formatInteger(latestNumeric);

    renderMemory(points);
    renderTable(points);

    historySummary.textContent = isGerman
      ? `Über ${numeric.length} numerische veröffentlichte Verlaufspunkte gab es ${nonzero} Punkte mit einem Ereigniszähler über null und ${changes} Änderungen zwischen aufeinanderfolgenden numerischen Werten. Die aktuelle Null-Serie umfasst ${trailingZeros} veröffentlichte Punkte. Diese Angaben beschreiben ausschließlich den veröffentlichten Ereigniszähler dieses Observers.`
      : `Across ${numeric.length} numeric published history points, ${nonzero} points had an event count above zero and ${changes} changes occurred between consecutive numeric values. The current zero run spans ${trailingZeros} published points. These figures describe only this observer's published event counter.`;

    loading.hidden = true;
    content.hidden = false;
  }

  Promise.all([
    fetch(DASHBOARD_URL, { cache: "no-store" }).then(response => {
      if (!response.ok) throw new Error(`Dashboard export ${response.status}`);
      return response.json();
    }),
    fetch(LATEST_URL, { cache: "no-store" }).then(response => {
      if (!response.ok) throw new Error(`Latest export ${response.status}`);
      return response.json();
    }),
    fetch(HISTORY_URL, { cache: "no-store" }).then(response => {
      if (!response.ok) throw new Error(`History export ${response.status}`);
      return response.json();
    }),
  ]).then(([dashboard, latest, history]) => render(dashboard, latest, history)).catch(() => {
    loading.dataset.state = "error";
    loading.textContent = isGerman
      ? "Öffentliche TLS-Observer-Daten sind derzeit nicht verfügbar. Es werden keine Ersatzwerte oder Fingerprints erfunden."
      : "Public TLS observer data is currently unavailable. No substitute values or fingerprints are invented.";
    content.hidden = true;
  });
})();
