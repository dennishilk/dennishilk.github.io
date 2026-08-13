(() => {
  const slug = document.body?.dataset.publicObserver;
  if (!slug) return;

  const configs = {
    "wiesmoor-population": { render: renderPopulation },
    "wiesmoor-energy": { render: renderEnergy },
    "wiesmoor-groundwater": { render: renderGroundwater },
    "wiesmoor-development": { render: renderDevelopment },
    "wiesmoor-finance": { render: renderFinance },
  };
  const config = configs[slug];
  if (!config) return;

  let currentPayload = null;
  const $ = id => document.getElementById(id);
  const de = () => document.documentElement.lang === "de";
  const t = (english, german) => de() ? german : english;
  const locale = () => de() ? "de-DE" : "en-GB";
  const finite = value => value !== null && value !== "" && Number.isFinite(Number(value));
  const text = (id, value) => { const node = $(id); if (node) node.textContent = value ?? "—"; };
  const el = (tag, className, value) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value !== undefined) node.textContent = value;
    return node;
  };
  const number = (value, digits = 0) => finite(value)
    ? Number(value).toLocaleString(locale(), { minimumFractionDigits: 0, maximumFractionDigits: digits })
    : "—";
  const signedNumber = (value, digits = 0) => finite(value)
    ? `${Number(value) > 0 ? "+" : ""}${number(value, digits)}`
    : "—";
  const euro = value => finite(value)
    ? Number(value).toLocaleString(locale(), { style: "currency", currency: "EUR", maximumFractionDigits: Number(value) % 1 ? 2 : 0 })
    : "—";
  const dateLabel = value => {
    if (!value) return "—";
    const parsed = new Date(`${String(value).slice(0, 10)}T12:00:00Z`);
    return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleDateString(locale(), { year: "numeric", month: "short", day: "numeric" });
  };
  const cadenceLabel = value => {
    const cadence = String(value || "").trim().toLowerCase();
    if (cadence === "daily") return t("Daily", "Täglich");
    if (cadence === "annual") return t("Annual", "Jährlich");
    if (cadence.startsWith("on publication of a new official")) {
      return t("On new official publication", "Bei neuer amtlicher Veröffentlichung");
    }
    return cadence ? String(value) : "";
  };
  const safeUrl = value => {
    try {
      const url = new URL(String(value), location.origin);
      return url.protocol === "https:" || url.origin === location.origin ? url.href : null;
    } catch { return null; }
  };

  function setStatus(payload) {
    const raw = String(payload?.data_status || payload?.status || "unavailable").toLowerCase();
    const normalized = raw === "ok" ? "ok" : raw === "partial" ? "partial" : "unavailable";
    const label = normalized === "ok" ? t("AVAILABLE", "VERFÜGBAR") : normalized === "partial" ? t("PARTIAL", "TEILWEISE") : t("UNAVAILABLE", "NICHT VERFÜGBAR");
    const badge = $("observer-status");
    if (badge) {
      badge.textContent = `${t("STATUS", "STATUS")}: ${label}`;
      badge.className = `status-badge ${normalized}`;
    }
    const cadence = cadenceLabel(payload?.update_policy?.cadence);
    const cadenceSuffix = cadence ? ` · ${t("Update cadence", "Aktualisierung")}: ${cadence}` : "";
    text("observer-last-update", `${t("Snapshot", "Snapshot")}: ${payload?.collected_at_utc || payload?.listing_observed_at_utc || "—"}${cadenceSuffix}`);
    text("observer-source", payload?.sources?.[0]?.name || t("Official source", "Amtliche Quelle"));
  }

  function metric(label, value, note = "") {
    const wrapper = el("div", "public-metric");
    const description = el("dd", "", value);
    if (note) description.append(el("small", "", note));
    wrapper.append(el("dt", "", label), description);
    return wrapper;
  }

  function setMetrics(items) {
    const list = $("key-metrics");
    if (!list) return;
    list.replaceChildren(...items.map(item => metric(...item)));
  }

  function setNote(value, tone = "") {
    const node = $("observer-note");
    if (!node) return;
    node.textContent = value;
    node.className = `public-observer-note${tone ? ` ${tone}` : ""}`;
  }

  function barChart(container, rows, ariaLabel) {
    container.replaceChildren();
    if (!rows.length) {
      container.append(el("p", "observer-limitation", t("No chart data is available.", "Keine Diagrammdaten verfügbar.")));
      return;
    }
    const chart = el("div", "public-bar-chart");
    chart.setAttribute("role", "img");
    chart.setAttribute("aria-label", ariaLabel);
    const max = Math.max(...rows.map(row => Math.abs(Number(row.value) || 0)), 1);
    rows.forEach(row => {
      const item = el("div", `public-bar-row${row.tone ? ` ${row.tone}` : ""}`);
      const label = el("span", "public-bar-label", row.label);
      const track = el("span", "public-bar-track");
      const fill = el("span", "public-bar-fill");
      fill.style.width = `${Math.max(1.5, Math.abs(Number(row.value) || 0) / max * 100).toFixed(2)}%`;
      track.append(fill);
      item.append(label, track, el("strong", "public-bar-value", row.display));
      chart.append(item);
    });
    container.append(chart);
  }

  function lineChart(container, points, ariaLabel, valueLabel) {
    container.replaceChildren();
    const usable = points.filter(point => finite(point.value));
    if (usable.length < 2) {
      container.append(el("p", "observer-limitation", t("Not enough observations for a trend chart.", "Zu wenige Beobachtungen für ein Verlaufsdiagramm.")));
      return;
    }
    const values = usable.map(point => Number(point.value));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = Math.max(max - min, 1);
    const width = 720;
    const height = 220;
    const padX = 34;
    const padY = 24;
    const x = index => padX + index / (usable.length - 1) * (width - padX * 2);
    const y = value => height - padY - (value - min) / range * (height - padY * 2);
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", ariaLabel);
    svg.classList.add("public-line-chart");
    for (const fraction of [0, .25, .5, .75, 1]) {
      const line = document.createElementNS(svg.namespaceURI, "line");
      line.setAttribute("x1", String(padX));
      line.setAttribute("x2", String(width - padX));
      line.setAttribute("y1", String(padY + fraction * (height - padY * 2)));
      line.setAttribute("y2", String(padY + fraction * (height - padY * 2)));
      line.classList.add("public-chart-gridline");
      svg.append(line);
    }
    const polyline = document.createElementNS(svg.namespaceURI, "polyline");
    polyline.setAttribute("points", usable.map((point, index) => `${x(index).toFixed(1)},${y(Number(point.value)).toFixed(1)}`).join(" "));
    polyline.classList.add("public-chart-line");
    svg.append(polyline);
    usable.forEach((point, index) => {
      const circle = document.createElementNS(svg.namespaceURI, "circle");
      circle.setAttribute("cx", x(index).toFixed(1));
      circle.setAttribute("cy", y(Number(point.value)).toFixed(1));
      circle.setAttribute("r", "3.5");
      circle.classList.add("public-chart-point");
      const title = document.createElementNS(svg.namespaceURI, "title");
      title.textContent = `${point.label}: ${point.display}`;
      circle.append(title);
      svg.append(circle);
    });
    const caption = el("p", "public-chart-range", `${number(min, 2)}–${number(max, 2)} ${valueLabel}`.trim());
    container.append(svg, caption);
  }

  function table(headers, rows) {
    const wrapper = el("div", "public-table-scroll");
    wrapper.tabIndex = 0;
    wrapper.setAttribute("role", "region");
    wrapper.setAttribute("aria-label", `${headers.join(", ")} · ${t("data table", "Datentabelle")}`);
    const node = el("table", "public-data-table");
    const head = el("thead");
    const headerRow = el("tr");
    headers.forEach(header => headerRow.append(el("th", "", header)));
    head.append(headerRow);
    const body = el("tbody");
    rows.forEach(row => {
      const tr = el("tr");
      row.forEach(cell => {
        const td = el("td");
        if (cell instanceof Node) td.append(cell); else td.textContent = cell ?? "—";
        tr.append(td);
      });
      body.append(tr);
    });
    node.append(head, body);
    wrapper.append(node);
    return wrapper;
  }

  function renderSources(payload) {
    const list = $("observer-sources");
    if (!list) return;
    const items = Array.isArray(payload?.sources) ? payload.sources : [];
    if (!items.length) return;
    list.replaceChildren(...items.map(source => {
      const li = el("li");
      const url = safeUrl(source.url);
      if (url) {
        const link = el("a", "", source.name || url);
        link.href = url;
        link.rel = "noopener";
        li.append(link);
      } else li.textContent = source.name || "—";
      if (source.role) li.append(document.createTextNode(` — ${source.role}`));
      return li;
    }));
  }

  function renderLimits(payload) {
    const list = $("observer-limitations");
    if (!list) return;
    const limitations = Array.isArray(payload?.limitations) ? payload.limitations : [];
    if (!limitations.length) return;
    list.replaceChildren(...limitations.map(item => el("li", "", item)));
  }

  function renderPopulation(payload) {
    const latest = payload.latest_official_observation || {};
    text("primary-title", t("LATEST OFFICIAL POPULATION", "LETZTE AMTLICHE BEVÖLKERUNGSZAHL"));
    text("primary-value", number(latest.population));
    text("primary-detail", `${dateLabel(latest.reference_date)} · ${latest.census_basis || "—"}`);
    setMetrics([
      [t("Reference date", "Stichtag"), dateLabel(latest.reference_date)],
      [t("Male", "Männlich"), number(latest.male)],
      [t("Female", "Weiblich"), number(latest.female)],
      [t("Population density", "Bevölkerungsdichte"), `${number(latest.population_density_per_km2)} / km²`],
    ]);
    text("breakdown-title", t("OFFICIAL YEAR-END SERIES", "AMTLICHE JAHRESENDREIHE"));
    const history = Array.isArray(payload.history) ? payload.history : [];
    lineChart($("breakdown-content"), history.map(item => ({
      label: String(item.reference_date || "").slice(0, 4),
      value: item.population,
      display: number(item.population),
    })), t("Official Wiesmoor year-end population", "Amtliche Wiesmoorer Bevölkerung zum Jahresende"), t("people", "Personen"));
    $("breakdown-content")?.append(table(
      [t("Year", "Jahr"), t("Population", "Bevölkerung"), t("Statistical basis", "Statistische Basis")],
      history.map(item => [String(item.reference_date || "").slice(0, 4), number(item.population), item.census_basis || "—"]),
    ));
    text("timeline-title", t("COMPARABILITY", "VERGLEICHBARKEIT"));
    const comparison = payload.year_on_year?.latest_comparable_change || {};
    const comparisonBox = el("div", "public-callout");
    comparisonBox.append(
      el("strong", "", t("Latest comparable year-on-year change", "Letzte vergleichbare Jahresänderung")),
      el("p", "", comparison.status === "comparable"
        ? `${String(comparison.from_reference_date).slice(0, 4)} → ${String(comparison.to_reference_date).slice(0, 4)}: ${signedNumber(comparison.absolute_change)} (${signedNumber(comparison.percent_change, 2)} %)`
        : "—"),
    );
    $("timeline-content")?.replaceChildren(comparisonBox);
    setNote(t(
      "The 2023→2024 difference is deliberately not calculated as year-on-year change because the statistical basis changes from Zensus 2011 to Zensus 2022.",
      "Die Differenz 2023→2024 wird bewusst nicht als Jahresänderung berechnet, weil die statistische Basis vom Zensus 2011 zum Zensus 2022 wechselt.",
    ), "warning");
  }

  function energyLabel(item) {
    const labels = {
      solar: ["Solar", "Solar"], wind: ["Wind", "Wind"], biomass: ["Biomass", "Biomasse"],
      natural_gas: ["Natural gas", "Erdgas"], storage: ["Storage", "Speicher"], other: ["Other", "Sonstige"],
    };
    const pair = labels[item.id] || [item.source_label || item.id, item.source_label || item.id];
    return t(pair[0], pair[1]);
  }

  function renderEnergy(payload) {
    const totals = payload.totals || {};
    text("primary-title", t("OPERATIONAL INSTALLED POWER", "INSTALLIERTE LEISTUNG · IN BETRIEB"));
    text("primary-value", finite(totals.installed_net_nominal_capacity_kw_operational)
      ? `${number(Number(totals.installed_net_nominal_capacity_kw_operational) / 1000, 2)} MW`
      : "—");
    text("primary-detail", t("Net nominal capacity · municipality aggregate", "Nettonennleistung · Gemeindeaggregat"));
    const categories = Array.isArray(payload.categories) ? payload.categories : [];
    setMetrics([
      [t("Listed units", "Gelistete Einheiten"), number(totals.listed_units)],
      [t("Operational units", "Einheiten in Betrieb"), number(totals.operational_units)],
      [t("Energy categories", "Energiekategorien"), number(categories.length)],
      [t("Aggregation", "Aggregation"), t("Municipality only", "Nur Gemeindeebene")],
    ]);
    text("breakdown-title", t("INSTALLED POWER BY CATEGORY", "INSTALLIERTE LEISTUNG NACH KATEGORIE"));
    barChart($("breakdown-content"), categories.map(item => ({
      label: energyLabel(item),
      value: item.installed_net_nominal_capacity_kw_operational,
      display: `${number(Number(item.installed_net_nominal_capacity_kw_operational) / 1000, 2)} MW · ${number(item.operational_units)} ${t("units", "Einheiten")}`,
    })), t("Installed net nominal electrical power by energy category", "Installierte elektrische Nettonennleistung nach Energiekategorie"));
    text("timeline-title", t("COMMISSIONING HISTORY", "INBETRIEBNAHME-VERLAUF"));
    const history = Array.isArray(payload.commissioning_history) ? payload.commissioning_history : [];
    lineChart($("timeline-content"), history.map(item => ({
      label: String(item.year),
      value: item.installed_net_nominal_capacity_kw,
      display: `${number(Number(item.installed_net_nominal_capacity_kw) / 1000, 2)} MW`,
    })), t("Currently operational power grouped by source-listed commissioning year", "Aktuell betriebliche Leistung nach quellenseitigem Inbetriebnahmejahr"), "kW");
    setNote(t(
      "Installed capacity is not production, generation, feed-in, or local consumption. No unit, address, operator, or identifier record is published.",
      "Installierte Leistung ist weder Erzeugung noch Produktion, Einspeisung oder lokaler Verbrauch. Es werden keine Einheiten-, Adress-, Betreiber- oder Identifikationsdaten veröffentlicht.",
    ), "warning");
  }

  function renderGroundwater(payload) {
    const latest = payload.latest_official_observation || {};
    const station = payload.reference_station || {};
    text("primary-title", t("REGIONAL GROUNDWATER LEVEL", "REGIONALER GRUNDWASSERSTAND"));
    text("primary-value", finite(latest.water_level_m_nhn) ? `${number(latest.water_level_m_nhn, 2)} m NHN` : "—");
    text("primary-detail", latest.official_groundwater_class
      ? `${t("Official NLWKN class", "Amtliche NLWKN-Klasse")}: ${latest.official_groundwater_class}`
      : t("No source class available", "Keine Quellenklasse verfügbar"));
    setMetrics([
      [t("Regional reference station", "Regionale Referenzmessstelle"), station.name || "—", station.locality || ""],
      [t("Distance from Wiesmoor", "Entfernung zu Wiesmoor"), finite(station.distance_from_wiesmoor_km) ? `${number(station.distance_from_wiesmoor_km, 2)} km` : "—"],
      [t("Observation date", "Beobachtungsdatum"), dateLabel(latest.date)],
      [t("Derived depth below ground", "Abgeleitete Tiefe unter Gelände"), finite(latest.derived_depth_below_ground_m) ? `${number(latest.derived_depth_below_ground_m, 2)} m` : "—"],
    ]);
    text("breakdown-title", t("RECENT OFFICIAL DAILY VALUES", "LETZTE AMTLICHE TAGESWERTE"));
    const history = (Array.isArray(payload.history) ? payload.history : []).slice(-31);
    lineChart($("breakdown-content"), history.map(item => ({
      label: String(item.date), value: item.water_level_m_nhn, display: `${number(item.water_level_m_nhn, 2)} m NHN`,
    })), t("Recent official groundwater levels at the regional reference station", "Letzte amtliche Grundwasserstände an der regionalen Referenzmessstelle"), "m NHN");
    $("breakdown-content")?.append(table(
      [t("Date", "Datum"), t("Water level", "Wasserstand"), t("Official source class", "Amtliche Quellenklasse")],
      [...history].reverse().slice(0, 10).map(item => [dateLabel(item.date), `${number(item.water_level_m_nhn, 2)} m NHN`, item.official_groundwater_class || "—"]),
    ));
    text("timeline-title", t("REFERENCE-STATION CONTEXT", "KONTEXT DER REFERENZMESSSTELLE"));
    const candidates = Array.isArray(payload.nearby_station_candidates) ? payload.nearby_station_candidates : [];
    $("timeline-content")?.replaceChildren(table(
      [t("Official station", "Amtliche Messstelle"), t("Locality", "Ort"), t("Distance", "Entfernung")],
      candidates.map(item => [item.name || "—", item.locality || "—", finite(item.distance_from_wiesmoor_km) ? `${number(item.distance_from_wiesmoor_km, 2)} km` : "—"]),
    ));
    setNote(t(
      "Regional reference station — not a measurement inside Wiesmoor. Missing sentinels are excluded; any displayed class comes from NLWKN and is not a World Observer warning threshold.",
      "Regionale Referenzmessstelle — keine Messung innerhalb Wiesmoors. Fehlwert-Codes werden ausgeschlossen; jede angezeigte Klasse stammt vom NLWKN und ist keine Warnschwelle des World Observer.",
    ), "warning");
  }

  function renderDevelopment(payload) {
    const collections = Array.isArray(payload.listed_collections) ? payload.listed_collections : [];
    text("primary-title", t("OFFICIAL COLLECTIONS LISTED", "AMTLICH GELISTETE SAMMLUNGEN"));
    text("primary-value", number(payload.listed_collection_count));
    text("primary-detail", t("Observed in the official public directory", "Im amtlichen öffentlichen Verzeichnis beobachtet"));
    setMetrics([
      [t("Collections", "Sammlungen"), number(payload.listed_collection_count)],
      [t("Linked documents", "Verlinkte Dokumente"), number(payload.listed_document_count)],
      [t("Formal project stage", "Formaler Projektstand"), t("Not inferred", "Nicht abgeleitet")],
      [t("Listing observed", "Verzeichnis beobachtet"), payload.listing_observed_at_utc || "—"],
    ]);
    text("breakdown-title", t("CURRENT OFFICIAL DOCUMENT LISTING", "AKTUELLE AMTLICHE DOKUMENTENLISTE"));
    const grid = el("div", "public-collection-grid");
    collections.forEach(item => {
      const card = el("article", "public-collection-card");
      const heading = el("h3", "", de() ? item.title_de : item.title_en);
      const url = safeUrl(item.source_url);
      if (url) {
        const link = el("a", "", heading.textContent);
        link.href = url;
        link.rel = "noopener";
        heading.replaceChildren(link);
      }
      card.append(
        heading,
        el("p", "", `${number(item.document_count)} ${t("documents linked", "Dokumente verlinkt")}`),
        el("small", "", `${item.official_identifier} · ${t("stage not inferred", "Stand nicht abgeleitet")}`),
      );
      grid.append(card);
    });
    $("breakdown-content")?.replaceChildren(grid);
    text("timeline-title", t("DOCUMENT DATES VISIBLE IN OFFICIAL FILENAMES", "DOKUMENTDATEN IN AMTLICHEN DATEINAMEN"));
    const timeline = Array.isArray(payload.document_timeline) ? payload.document_timeline.slice(0, 20) : [];
    $("timeline-content")?.replaceChildren(table(
      [t("Document date", "Dokumentdatum"), t("Collection", "Sammlung"), t("Official document", "Amtliches Dokument")],
      timeline.map(item => {
        const url = safeUrl(item.source_url);
        const link = el("a", "", item.document_title || "—");
        if (url) { link.href = url; link.rel = "noopener"; }
        return [dateLabel(item.date), item.collection_identifier || "—", link];
      }),
    ));
    setNote(t(
      "A listed directory proves only that documents were present when observed. It does not prove an open consultation, deadline, approval, or construction stage.",
      "Ein gelistetes Verzeichnis belegt nur, dass Dokumente zum Beobachtungszeitpunkt vorhanden waren. Es belegt keine laufende Beteiligung, Frist, Genehmigung oder Bauphase.",
    ), "warning");
  }

  function financeStatusLabel(value) {
    return value === "ACTUAL" ? t("ACTUAL", "IST") : value === "PLAN" ? t("PLAN", "PLAN") : t("FORECAST", "PROGNOSE");
  }

  function renderFinance(payload) {
    const plan = payload.latest_budget_plan || {};
    const result = plan.result_budget_eur || {};
    const periods = Array.isArray(payload.reporting_periods) ? payload.reporting_periods : [];
    text("primary-title", t("2026 PLANNED OVERALL RESULT", "GEPLANTES GESAMTERGEBNIS 2026"));
    text("primary-value", euro(result.overall_result));
    text("primary-detail", t("PLAN · not an actual result", "PLAN · kein Ist-Ergebnis"));
    setMetrics([
      [t("Ordinary revenue · PLAN", "Ordentliche Erträge · PLAN"), euro(result.ordinary_revenue)],
      [t("Ordinary expense · PLAN", "Ordentliche Aufwendungen · PLAN"), euro(result.ordinary_expense)],
      [t("Investment borrowing authorization · PLAN", "Kreditermächtigung Investitionen · PLAN"), euro(plan.investment_borrowing_authorization)],
      [t("Liquidity credit ceiling · PLAN", "Höchstbetrag Liquiditätskredite · PLAN"), euro(plan.liquidity_credit_ceiling)],
    ]);
    text("breakdown-title", t("OVERALL RESULT BY VALUE STATUS", "GESAMTERGEBNIS NACH WERTSTATUS"));
    barChart($("breakdown-content"), periods.map(item => ({
      label: `${item.fiscal_year} · ${financeStatusLabel(item.value_status)}`,
      value: item.result_budget_eur?.overall_result,
      display: euro(item.result_budget_eur?.overall_result),
      tone: String(item.value_status || "").toLowerCase(),
    })), t("Municipal overall result with explicit actual, plan, and forecast status", "Kommunales Gesamtergebnis mit explizitem Ist-, Plan- und Prognosestatus"));
    text("timeline-title", t("FINANCIAL PERIODS", "FINANZZEITRÄUME"));
    const legend = el("div", "public-status-legend");
    ["ACTUAL", "PLAN", "FORECAST"].forEach(status => legend.append(el("span", status.toLowerCase(), financeStatusLabel(status))));
    const periodsTable = table(
      [t("Year", "Jahr"), t("Status", "Status"), t("Ordinary revenue", "Ordentliche Erträge"), t("Ordinary expense", "Ordentliche Aufwendungen"), t("Overall result", "Gesamtergebnis")],
      periods.map(item => [
        String(item.fiscal_year), financeStatusLabel(item.value_status), euro(item.result_budget_eur?.ordinary_revenue),
        euro(item.result_budget_eur?.ordinary_expense), euro(item.result_budget_eur?.overall_result),
      ]),
    );
    $("timeline-content")?.replaceChildren(legend, periodsTable);
    setNote(t(
      "ACTUAL, PLAN, and FORECAST are kept strictly separate. Budget values are not live bank balances or 2026 spending results.",
      "IST, PLAN und PROGNOSE bleiben strikt getrennt. Haushaltswerte sind weder Live-Kontostände noch Ist-Ausgaben des Jahres 2026.",
    ), "warning");
  }

  function render(payload) {
    setStatus(payload);
    if (!payload || !["ok", "partial"].includes(String(payload.data_status || payload.status).toLowerCase())) {
      text("primary-title", t("DATA UNAVAILABLE", "DATEN NICHT VERFÜGBAR"));
      text("primary-value", "—");
      text("primary-detail", t("No substitute value is fabricated.", "Es wird kein Ersatzwert erfunden."));
      setMetrics([]);
      $("breakdown-content")?.replaceChildren(el("p", "observer-limitation", t("The current official-data snapshot could not be loaded.", "Der aktuelle amtliche Daten-Snapshot konnte nicht geladen werden.")));
      $("timeline-content")?.replaceChildren();
    } else config.render(payload);
    renderLimits(payload || {});
    renderSources(payload || {});
  }

  async function load() {
    const paths = [
      `/world-observer/dashboard/latest/${slug}.json`,
      `dashboard/latest/${slug}.json`,
      `/world-observer/data/latest/${slug}.json`,
    ];
    for (const path of paths) {
      try {
        const response = await fetch(path, { cache: "no-store" });
        if (!response.ok) continue;
        const payload = await response.json();
        if (payload && payload.observer === slug) return payload;
      } catch {}
    }
    return {
      observer: slug,
      status: "unavailable",
      data_status: "unavailable",
      limitations: [t("The current official-data snapshot could not be loaded; no substitute value is shown.", "Der aktuelle amtliche Daten-Snapshot konnte nicht geladen werden; es wird kein Ersatzwert angezeigt.")],
      sources: [],
    };
  }

  load().then(payload => {
    currentPayload = payload;
    render(payload);
  });

  new MutationObserver(records => {
    if (currentPayload && records.some(record => record.attributeName === "lang")) render(currentPayload);
  }).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
})();
