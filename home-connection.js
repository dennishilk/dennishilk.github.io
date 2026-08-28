(() => {
  "use strict";

  const ENDPOINT = "/data/home-connection/current.json";
  const POLL_INTERVAL_MS = 5 * 60 * 1000;
  const CURRENT_MAX_AGE_MS = 95 * 60 * 1000;
  const DELAYED_MAX_AGE_MS = 3 * 60 * 60 * 1000;
  const GENERIC_OOKLA_URL = "https://www.speedtest.net/";
  const readGerman = () => Boolean(window.__DENNIS_WORLD_OBSERVER_MIRROR_SOURCE_PATH) ||
    window.location?.pathname?.startsWith("/de/") ||
    document.documentElement.lang.toLowerCase().startsWith("de");
  let isGerman = readGerman();
  let locale = isGerman ? "de-DE" : "en-GB";
  let lastPayload = null;
  let unavailable = false;

  const translations = {
    en: {
      connectionKicker: "HOME CONNECTION",
      panelTitle: "REAL HOURLY CONNECTION TELEMETRY",
      residentialProbe: "RESIDENTIAL CONNECTION · PRIVATE HOME PROBE",
      waiting: "WAITING FOR SIGNAL",
      current: "CURRENT",
      delayed: "DELAYED",
      offline: "OFFLINE",
      latestDownload: "DOWNLOAD · LATEST MEASUREMENT",
      dataUsed: "DATA USED · ALL TIME",
      accountSnapshot: "ACCOUNT BASELINE · LOCAL DISH COUNTER",
      upload: "UPLOAD",
      latency: "LATENCY",
      jitter: "JITTER",
      packetLoss: "PACKET LOSS",
      testData: "TEST DATA",
      probeNode: "PROBE NODE",
      probeDescription: "INTEL ATOM D525 · DEBIAN 13 · HOURLY OOKLA CLI",
      topologyTitle: "CONCEPTUAL SIGNAL PATH",
      conceptOnly: "VISUAL MODEL · NOT ORBITAL DATA",
      metricsAria: "Current home connection performance",
      topologyAria: "Conceptual Starlink path from the home dish through a satellite to the network",
      homeDish: "HOME / DISH",
      satellite: "SATELLITE",
      network: "GROUND / NETWORK",
      topologyDisclaimer: "CONCEPTUAL ONLY · NO SATELLITE IDENTITY, POSITION, BEAM, GATEWAY OR ROUTE IS CLAIMED",
      historyLabel: "24 HOUR HISTORY",
      historyTitle: "REAL DOWNLOAD MEASUREMENTS",
      min: "MIN",
      max: "MAX",
      latest: "CURRENT",
      peak24h: "24H PEAK",
      ago24: "24H AGO",
      ago12: "12H",
      now: "NOW",
      lastMeasurement: "LAST MEASUREMENT",
      speedtestServer: "SPEEDTEST SERVER",
      measurementMethod: "MEASUREMENT METHOD",
      speedMethodLabel: "SPEED",
      speedMethod: "Intel Atom D525 · Debian 13 · official Ookla CLI · one scheduled measurement per hour against a fixed public test server.",
      usageMethodLabel: "DATA USAGE",
      usageMethod: "Starlink account total captured as the baseline · dish queried locally via gRPC every 5 minutes · only newly observed download/upload bytes are added.",
      ooklaResult: "VIEW OOKLA RESULT →",
      starlinkDetails: "DENNIS’ STARLINK REFERRAL →",
      starlinkOfficial: "EXPLORE STARLINK →",
      referralNote: "Using Dennis’ personal referral link may give you and Dennis one free month of service, subject to Starlink’s eligibility and market conditions.",
      referralTerms: "Official referral terms ↗",
      noSamples: "0 SAMPLES",
      privacy: "PUBLIC PERFORMANCE METRICS ONLY · NO IP ADDRESS PUBLISHED · NO MAC, INTERFACE, HOSTNAME OR ACCOUNT IDENTIFIER EXPOSED",
      notReported: "NOT REPORTED",
      unavailable: "UNAVAILABLE",
      chartUnavailable: "24H SPEED HISTORY UNAVAILABLE",
      oneMeasurement: "1 REAL MEASUREMENT · WAITING FOR THE NEXT HOURLY SAMPLE",
      measurements: count => `${count} REAL HOURLY MEASUREMENTS`,
      samples: count => `${count} SAMPLE${count === 1 ? "" : "S"}`,
      since: date => `SINCE ${date}`,
      updated: date => `UPDATED ${date}`,
      measuredAt: date => date,
      chartAria: (count, min, max, latest) => `Home connection download history with ${count} real measurement${count === 1 ? "" : "s"}. Minimum ${min} megabits per second, maximum ${max}, current ${latest}.`,
      sampleAria: (date, value) => `${date}: ${value} megabits per second download`,
    },
    de: {
      connectionKicker: "HEIMANSCHLUSS",
      panelTitle: "ECHTE STÜNDLICHE VERBINDUNGSTELEMETRIE",
      residentialProbe: "PRIVATANSCHLUSS · PRIVATER HEIM-MESSPUNKT",
      waiting: "WARTE AUF SIGNAL",
      current: "AKTUELL",
      delayed: "VERZÖGERT",
      offline: "OFFLINE",
      latestDownload: "EMPFANG · LETZTE MESSUNG",
      dataUsed: "DATENVERBRAUCH · GESAMT",
      accountSnapshot: "KONTOBASIS · LOKALER ANTENNENZÄHLER",
      upload: "SENDEN",
      latency: "LATENZ",
      jitter: "SCHWANKUNG",
      packetLoss: "PAKETVERLUST",
      testData: "TESTDATEN",
      probeNode: "MESSPUNKT",
      probeDescription: "INTEL ATOM D525 · DEBIAN 13 · STÜNDLICHE OOKLA-CLI-MESSUNG",
      topologyTitle: "KONZEPTUELLER SIGNALPFAD",
      conceptOnly: "VISUELLES MODELL · KEINE ORBITALDATEN",
      metricsAria: "Aktuelle Leistungswerte des Heimanschlusses",
      topologyAria: "Konzeptueller Starlink-Pfad von der Heimantenne über einen Satelliten zum Netzwerk",
      homeDish: "ZUHAUSE / ANTENNE",
      satellite: "SATELLIT",
      network: "BODEN / NETZWERK",
      topologyDisclaimer: "NUR KONZEPTUELL · KEINE BEHAUPTUNG ZU SATELLIT, POSITION, FUNKKEULE, GATEWAY ODER ROUTE",
      historyLabel: "24-STUNDEN-VERLAUF",
      historyTitle: "ECHTE EMPFANGSMESSUNGEN",
      min: "MIN",
      max: "MAX",
      latest: "AKTUELL",
      peak24h: "24H-SPITZE",
      ago24: "VOR 24H",
      ago12: "12H",
      now: "JETZT",
      lastMeasurement: "LETZTE MESSUNG",
      speedtestServer: "MESSSERVER",
      measurementMethod: "MESSMETHODE",
      speedMethodLabel: "GESCHWINDIGKEIT",
      speedMethod: "Intel Atom D525 · Debian 13 · offizielle Ookla CLI · eine geplante Messung pro Stunde gegen einen festen öffentlichen Messserver.",
      usageMethodLabel: "DATENVERBRAUCH",
      usageMethod: "Starlink-Kontostand als Basis · Antenne lokal alle 5 Minuten per gRPC abgefragt · nur neu beobachtete Download-/Upload-Bytes werden fortlaufend addiert.",
      ooklaResult: "OOKLA-ERGEBNIS →",
      starlinkDetails: "DENNIS’ STARLINK-EMPFEHLUNG →",
      starlinkOfficial: "STARLINK ENTDECKEN →",
      referralNote: "Mit Dennis’ persönlichem Empfehlungslink können du und Dennis je einen Gratismonat erhalten. Es gelten Starlinks Teilnahmebedingungen und regionale Verfügbarkeit.",
      referralTerms: "Offizielle Empfehlungsbedingungen ↗",
      noSamples: "0 MESSPUNKTE",
      privacy: "NUR ÖFFENTLICHE LEISTUNGSMETRIKEN · KEINE IP-ADRESSE VERÖFFENTLICHT · KEINE MAC-, SCHNITTSTELLEN-, RECHNERNAMEN- ODER KONTODATEN OFFENGELEGT",
      notReported: "NICHT GEMELDET",
      unavailable: "NICHT VERFÜGBAR",
      chartUnavailable: "24H-GESCHWINDIGKEITSVERLAUF NICHT VERFÜGBAR",
      oneMeasurement: "1 ECHTE MESSUNG · WARTET AUF DEN NÄCHSTEN STÜNDLICHEN MESSPUNKT",
      measurements: count => `${count} ECHTE STÜNDLICHE MESSUNGEN`,
      samples: count => `${count} MESSPUNKT${count === 1 ? "" : "E"}`,
      since: date => `SEIT ${date}`,
      updated: date => `STAND ${date}`,
      measuredAt: date => date,
      chartAria: (count, min, max, latest) => `Empfangsverlauf des Heimanschlusses mit ${count} echten Messpunkt${count === 1 ? "" : "en"}. Minimum ${min} Megabit pro Sekunde, Maximum ${max}, aktuell ${latest}.`,
      sampleAria: (date, value) => `${date}: ${value} Megabit pro Sekunde Empfang`,
    },
  };
  let copy = translations[isGerman ? "de" : "en"];

  const $ = id => document.getElementById(id);
  const finite = value => value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
  const number = (value, digits = 1) => finite(value)
    ? new Intl.NumberFormat(locale, { maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(Number(value))
    : "—";
  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;",
  })[character]);
  const validDate = value => {
    if (value === null || value === undefined || value === "") return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };
  const formatDateTime = value => {
    const date = validDate(value);
    return date ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(date) : "—";
  };
  const formatDateOnly = value => {
    const date = /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))
      ? validDate(`${value}T00:00:00Z`)
      : validDate(value);
    return date ? new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(date).toUpperCase() : "—";
  };
  const formatAxisTime = value => new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value));
  const niceChartMax = value => {
    const max = Math.max(0, Number(value) || 0);
    const step = max <= 100 ? 25 : max <= 250 ? 50 : max <= 500 ? 100 : max <= 1000 ? 200 : 500;
    return Math.max(step, Math.ceil(max / step) * step);
  };

  const installRuntimePolish = () => {
    if (typeof document.querySelector !== "function" || !document.head || $("home-connection-runtime-polish")) return;
    const style = document.createElement("style");
    style.id = "home-connection-runtime-polish";
    style.textContent = `
      .home-chart-y-axis{position:absolute;inset:0;z-index:2;pointer-events:none}
      .home-chart-y-axis span{position:absolute;left:.45rem;transform:translateY(-50%);padding:.08rem .25rem;border-radius:2px;color:#8196a5;background:rgba(1,12,19,.72);font-size:.55rem;letter-spacing:.05em;line-height:1.2}
      .home-chart-peak{position:absolute;z-index:4;transform:translate(-50%,-100%);padding:.25rem .38rem;border:1px solid rgba(105,220,255,.3);background:rgba(1,13,20,.9);color:#dffbff;font-size:.56rem;font-weight:700;letter-spacing:.055em;line-height:1.35;white-space:nowrap;pointer-events:none;box-shadow:0 0 14px rgba(105,220,255,.12)}
      .home-chart-peak small{display:block;color:#7f95a4;font-size:.52rem;font-weight:500}
      .home-chart-axis{gap:.6rem}
      .home-chart-axis span{flex:1;text-align:center}
      .home-chart-axis span:first-child{text-align:left}
      .home-chart-axis span:last-child{text-align:right}
      .home-measurement-method{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.65rem;margin-top:.65rem;padding:.75rem .8rem;border:1px solid rgba(105,220,255,.13);border-left:2px solid rgba(105,220,255,.35);background:rgba(0,0,0,.13)}
      .home-measurement-method h3{grid-column:1/-1;margin:0;color:#edfaff;font-size:.68rem;letter-spacing:.11em}
      .home-measurement-method p{margin:0;color:#879aa8;font-size:.64rem;line-height:1.55}
      .home-measurement-method strong{display:block;margin-bottom:.18rem;color:#9fb8c7;font-size:.58rem;letter-spacing:.08em}
      @media(max-width:700px){.home-measurement-method{grid-template-columns:1fr}.home-chart-y-axis span{font-size:.5rem}.home-chart-peak{font-size:.51rem}}
    `;
    document.head.appendChild(style);
  };

  const renderMeasurementMethod = () => {
    if (typeof document.querySelector !== "function" || typeof document.createElement !== "function") return;
    installRuntimePolish();
    let method = $("home-measurement-method");
    if (!method) {
      const meta = document.querySelector(".home-connection-meta");
      if (!meta || !meta.parentNode) return;
      method = document.createElement("section");
      method.id = "home-measurement-method";
      method.className = "home-measurement-method";
      method.setAttribute("aria-label", copy.measurementMethod);
      meta.insertAdjacentElement("afterend", method);
    }
    method.setAttribute("aria-label", copy.measurementMethod);
    method.innerHTML = `<h3>${escapeHtml(copy.measurementMethod)}</h3><p><strong>${escapeHtml(copy.speedMethodLabel)}</strong>${escapeHtml(copy.speedMethod)}</p><p><strong>${escapeHtml(copy.usageMethodLabel)}</strong>${escapeHtml(copy.usageMethod)}</p>`;
  };

  const localizeStatic = () => {
    if (isGerman) document.documentElement.lang = "de";
    document.querySelectorAll("[data-home-i18n]").forEach(element => {
      const value = copy[element.dataset.homeI18n];
      if (typeof value === "string") element.textContent = value;
    });
    document.querySelectorAll("[data-home-aria]").forEach(element => {
      const value = copy[element.dataset.homeAria];
      if (typeof value === "string") element.setAttribute("aria-label", value);
    });
    const starlinkLink = $("home-starlink-link");
    if (starlinkLink) {
      // This exact owner-provided URL was already present in the repository.
      const ownerReferral = "https://starlink.com?referral=RC-DF-12369685-91594-14";
      const hasReferral = starlinkLink.dataset.referralUrl === ownerReferral;
      starlinkLink.href = hasReferral ? ownerReferral : (isGerman ? "https://starlink.com/de/" : "https://starlink.com/");
      starlinkLink.textContent = hasReferral ? copy.starlinkDetails : copy.starlinkOfficial;
      const note = $("home-referral-note");
      if (note) note.hidden = !hasReferral;
    }
    const terms = $("home-referral-terms");
    if (terms) terms.href = isGerman ? "https://starlink.com/de/referrals" : "https://starlink.com/referrals";
    renderMeasurementMethod();
  };

  const statusForTimestamp = (timestamp, now = Date.now()) => {
    const measured = validDate(timestamp);
    if (!measured) return { key: "offline", className: "offline", label: copy.offline, ageMs: Infinity };
    const ageMs = Math.max(0, now - measured.getTime());
    if (ageMs <= CURRENT_MAX_AGE_MS) return { key: "current", className: "current", label: copy.current, ageMs };
    if (ageMs <= DELAYED_MAX_AGE_MS) return { key: "delayed", className: "delayed", label: copy.delayed, ageMs };
    return { key: "offline", className: "offline", label: copy.offline, ageMs };
  };

  const setState = state => {
    const element = $("home-connection-state");
    if (!element) return;
    element.className = `home-state ${state.className}`;
    element.textContent = state.label;
  };

  const formatServer = server => {
    if (!server || typeof server !== "object" || Array.isArray(server)) return copy.notReported;
    const name = typeof server.name === "string" ? server.name.trim() : "";
    const location = typeof server.location === "string" ? server.location.trim() : "";
    const rawCountry = typeof server.country === "string" ? server.country.trim() : "";
    const country = isGerman && rawCountry === "Germany" ? "Deutschland" : rawCountry;
    const place = [location, country].filter(Boolean).join(", ");
    return [name, place].filter(Boolean).join(" · ") || copy.notReported;
  };

  const safeResultUrl = value => {
    try {
      const url = new URL(String(value || ""));
      const host = url.hostname.toLowerCase();
      return url.protocol === "https:" && (host === "speedtest.net" || host.endsWith(".speedtest.net"))
        ? url.href
        : GENERIC_OOKLA_URL;
    } catch (_error) {
      return GENERIC_OOKLA_URL;
    }
  };

  const normalizeHistory = (history, now = Date.now()) => {
    const start = now - 24 * 60 * 60 * 1000;
    return (Array.isArray(history) ? history : [])
      .map(sample => ({
        timestamp: validDate(sample?.timestamp ?? sample?.measured_at ?? sample?.time ?? sample?.t),
        download: Number(sample?.download_mbps ?? sample?.down_mbps ?? sample?.download ?? sample?.down),
      }))
      .filter(sample => sample.timestamp && Number.isFinite(sample.download) && sample.download >= 0 && sample.timestamp.getTime() >= start && sample.timestamp.getTime() <= now + 5 * 60 * 1000)
      .sort((left, right) => left.timestamp - right.timestamp)
      .slice(-24);
  };

  const renderChart = (history, now = Date.now()) => {
    const chart = $("home-connection-chart");
    const mode = $("home-chart-mode");
    const minElement = $("home-chart-min");
    const maxElement = $("home-chart-max");
    const currentElement = $("home-chart-current");
    const sampleElement = $("home-chart-samples");
    if (!chart) return [];

    const samples = normalizeHistory(history, now);
    if (!samples.length) {
      chart.className = "home-connection-chart empty";
      chart.textContent = copy.chartUnavailable;
      if (mode) mode.textContent = copy.chartUnavailable;
      [minElement, maxElement, currentElement].forEach(element => { if (element) element.textContent = "—"; });
      if (sampleElement) sampleElement.textContent = copy.samples(0);
      chart.setAttribute("aria-label", copy.chartUnavailable);
      return [];
    }

    installRuntimePolish();
    const values = samples.map(sample => sample.download);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const latest = values.at(-1);
    const chartMax = niceChartMax(max);
    const start = now - 24 * 60 * 60 * 1000;
    const plotted = samples.map(sample => ({
      ...sample,
      x: Math.min(98, Math.max(2, (sample.timestamp.getTime() - start) / (24 * 60 * 60 * 1000) * 100)),
      y: samples.length === 1 ? 50 : 88 - (sample.download / chartMax * 76),
    }));
    const linePoints = plotted.map(sample => `${sample.x.toFixed(2)},${sample.y.toFixed(2)}`).join(" ");
    const first = plotted[0];
    const last = plotted.at(-1);
    const peakIndex = values.indexOf(max);
    const peak = plotted[peakIndex];
    const areaPoints = samples.length > 1
      ? `${first.x.toFixed(2)},94 ${linePoints} ${last.x.toFixed(2)},94`
      : "";
    const line = samples.length > 1 ? `<polyline class="home-chart-line" points="${linePoints}"/>` : "";
    const area = samples.length > 1 ? `<polygon class="home-chart-area" points="${areaPoints}"/>` : "";
    const marker = samples.length === 1
      ? `<line class="home-chart-single-marker" x1="${first.x.toFixed(2)}" y1="8" x2="${first.x.toFixed(2)}" y2="94"/>`
      : "";
    const yAxis = [1, .75, .5, .25, 0].map(fraction => {
      const y = 88 - fraction * 76;
      return `<span style="top:${y.toFixed(2)}%">${escapeHtml(`${number(chartMax * fraction, 0)} Mbps`)}</span>`;
    }).join("");
    const peakDate = formatDateTime(peak.timestamp);
    const peakTime = formatAxisTime(peak.timestamp);
    const peakX = Math.min(88, Math.max(12, peak.x));
    const peakY = Math.max(16, peak.y - 2);
    const peakLabel = samples.length > 1
      ? `<span class="home-chart-peak" style="left:${peakX.toFixed(2)}%;top:${peakY.toFixed(2)}%" title="${escapeHtml(peakDate)}">${escapeHtml(copy.peak24h)} · ${escapeHtml(number(max, 1))} Mbps<small>${escapeHtml(peakTime)}</small></span>`
      : "";
    const points = plotted.map((sample, index) => {
      const value = number(sample.download, 2);
      const date = formatDateTime(sample.timestamp);
      return `<button type="button" class="home-chart-point${index === plotted.length - 1 ? " current" : ""}" style="left:${sample.x.toFixed(2)}%;top:${sample.y.toFixed(2)}%" title="${escapeHtml(`${date} · ${value} Mbps`)}" aria-label="${escapeHtml(copy.sampleAria(date, value))}"></button>`;
    }).join("");

    chart.className = `home-connection-chart${samples.length === 1 ? " single" : ""}`;
    chart.innerHTML = `<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="home-chart-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#69dcff" stop-opacity=".22"/><stop offset="1" stop-color="#69dcff" stop-opacity="0"/></linearGradient></defs>${area}${marker}${line}</svg><div class="home-chart-y-axis" aria-hidden="true">${yAxis}</div>${peakLabel}${points}`;
    chart.setAttribute("aria-label", copy.chartAria(samples.length, number(min, 2), number(max, 2), number(latest, 2)));
    if (mode) mode.textContent = samples.length === 1 ? copy.oneMeasurement : copy.measurements(samples.length);
    if (minElement) minElement.textContent = `${number(min, 1)} Mbps`;
    if (maxElement) maxElement.textContent = `${number(max, 1)} Mbps`;
    if (currentElement) currentElement.textContent = `${number(latest, 1)} Mbps`;
    if (sampleElement) sampleElement.textContent = copy.samples(samples.length);

    if (typeof document.querySelector === "function") {
      const axis = document.querySelector(".home-chart-axis");
      if (axis) {
        const ticks = [0, 6, 12, 18, 24].map(hours => start + hours * 60 * 60 * 1000);
        axis.innerHTML = ticks.map((timestamp, index) => `<span>${escapeHtml(index === ticks.length - 1 ? `${copy.now} ${formatAxisTime(timestamp)}` : formatAxisTime(timestamp))}</span>`).join("");
      }
    }
    return samples;
  };

  const renderUsage = usage => {
    const panel = $("home-account-usage");
    if (!panel) return;
    const gb = Number(usage?.all_time_gb);
    if (!finite(usage?.all_time_gb) || gb < 0) {
      panel.hidden = true;
      return;
    }
    panel.hidden = false;
    $("home-alltime").textContent = `${new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(gb / 1024)} TB`;
    $("home-usage-since").textContent = copy.since(formatDateOnly(usage.since));
    $("home-usage-updated").textContent = copy.updated(formatDateOnly(usage.updated_at));
  };

  const render = (data, now = Date.now()) => {
    if (!data || typeof data !== "object" || !data.latest || typeof data.latest !== "object") {
      throw new TypeError("invalid home connection telemetry");
    }
    const latest = data.latest;
    lastPayload = data;
    unavailable = false;
    const setMetric = (id, value, digits = 1) => { const element = $(id); if (element) element.textContent = number(value, digits); };
    setMetric("home-download", latest.download_mbps, 1);
    setMetric("home-upload", latest.upload_mbps, 1);
    setMetric("home-latency", latest.latency_ms, 1);
    setMetric("home-jitter", latest.jitter_ms, 2);
    setMetric("home-test-data", latest.test_data_mb, 1);

    const packetLoss = $("home-packet-loss");
    const packetLossUnit = $("home-packet-loss-unit");
    if (packetLoss) packetLoss.textContent = finite(latest.packet_loss_percent) ? number(latest.packet_loss_percent, 2) : "—";
    if (packetLossUnit) packetLossUnit.textContent = finite(latest.packet_loss_percent) ? "%" : copy.notReported;

    // Freshness describes the measurement, never the publication timestamp.
    const timestamp = latest.timestamp;
    setState(statusForTimestamp(timestamp, now));
    const measured = $("home-measured-at");
    if (measured) measured.textContent = formatDateTime(timestamp);
    const server = $("home-server");
    if (server) server.textContent = formatServer(latest.server);

    const resultLink = $("home-ookla-link");
    if (resultLink) resultLink.href = safeResultUrl(latest.result_url);
    renderUsage(data.usage);
    renderChart(data.history_24h, now);
    renderMeasurementMethod();
    const card = $("home-connection-card");
    if (card) card.dataset.homeReady = "true";
    return data;
  };

  const renderUnavailable = () => {
    lastPayload = null;
    unavailable = true;
    setState({ className: "offline", label: copy.offline });
    ["home-download", "home-upload", "home-latency", "home-jitter", "home-packet-loss", "home-test-data", "home-alltime", "home-measured-at", "home-server"].forEach(id => {
      const element = $(id);
      if (element) element.textContent = "—";
    });
    const packetLossUnit = $("home-packet-loss-unit");
    if (packetLossUnit) packetLossUnit.textContent = copy.notReported;
    const usage = $("home-account-usage");
    if (usage) usage.hidden = true;
    const resultLink = $("home-ookla-link");
    if (resultLink) resultLink.href = GENERIC_OOKLA_URL;
    renderChart([], Date.now());
  };

  const update = () => fetch(`${ENDPOINT}?t=${Date.now()}`, { cache: "no-store", headers: { Accept: "application/json" } })
    .then(response => {
      if (!response.ok) throw new Error(`home connection telemetry HTTP ${response.status}`);
      return response.json();
    })
    .then(data => render(data))
    .catch(() => renderUnavailable());

  const api = {
    ENDPOINT,
    CURRENT_MAX_AGE_MS,
    DELAYED_MAX_AGE_MS,
    get copy() { return copy; },
    formatServer,
    normalizeHistory,
    render,
    renderChart,
    renderUnavailable,
    safeResultUrl,
    statusForTimestamp,
    update,
  };
  window.HomeConnectionObserver = api;

  localizeStatic();
  // The site-wide switcher can apply German asynchronously, after this script.
  // Repaint from the existing sample; changing language must not start a test
  // or fetch another telemetry snapshot.
  if (typeof MutationObserver !== "undefined") {
    new MutationObserver(() => {
      const nextGerman = readGerman();
      if (nextGerman === isGerman) return;
      isGerman = nextGerman;
      locale = isGerman ? "de-DE" : "en-GB";
      copy = translations[isGerman ? "de" : "en"];
      localizeStatic();
      if (lastPayload) render(lastPayload);
      else if (unavailable) renderUnavailable();
    }).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  }
  if ($("home-connection-card") && !window.__HOME_CONNECTION_DISABLE_AUTO_START__) {
    update();
    window.setInterval(update, POLL_INTERVAL_MS);
  }
})();
