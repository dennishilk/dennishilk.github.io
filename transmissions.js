const transmissionForm = document.getElementById("transmission-form");
const transmissionStatus = document.getElementById("transmission-status");
const transmissionList = document.getElementById("transmission-list");
const transmissionCount = document.getElementById("transmission-count");
const transmissionPages = document.getElementById("transmission-pages");
let approvedTransmissions = [];
let currentTransmissionPage = 1;
let totalTransmissionPages = 1;
let totalTransmissionCount = 0;
let latestLoadRequest = 0;

function formatTransmissionTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "TIME UNKNOWN";
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
    timeZoneName: "short",
    hourCycle: "h23",
  }).format(date).replace(",", "");
}

function setTransmissionStatus(text, mode = "") {
  if (!transmissionStatus) return;
  transmissionStatus.textContent = text;
  transmissionStatus.className = `transmission-status ${mode}`.trim();
}

function makeMetaItem(label, value, className = "") {
  const item = document.createElement("span");
  item.className = className;
  const labelElement = document.createElement("b");
  labelElement.textContent = `${label} `;
  item.append(labelElement, document.createTextNode(value));
  return item;
}

function renderTransmissions() {
  transmissionList.innerHTML = "";
  if (!approvedTransmissions.length) {
    const empty = document.createElement("p");
    empty.className = "transmission-empty";
    empty.textContent = "NO APPROVED SIGNALS RECEIVED YET.";
    transmissionList.appendChild(empty);
    renderPages();
    return;
  }

  approvedTransmissions.forEach((transmission) => {
    const article = document.createElement("article");
    article.className = "transmission-entry";

    const header = document.createElement("div");
    header.className = "transmission-entry-header";

    const identity = document.createElement("div");
    identity.className = "transmission-entry-identity";
    const signal = document.createElement("h3");
    signal.textContent = `#${String(transmission.signal_number).padStart(4, "0")}`;
    identity.append(
      signal,
      makeMetaItem("CALLSIGN", transmission.callsign || "UNKNOWN", "entry-callsign"),
      makeMetaItem("ORIGIN", transmission.origin || "UNSPECIFIED", "entry-origin")
    );

    const time = document.createElement("time");
    time.dateTime = transmission.receivedAt || "";
    time.textContent = formatTransmissionTime(transmission.receivedAt);
    header.append(identity, time);

    const message = document.createElement("blockquote");
    message.textContent = transmission.message || "";

    const status = document.createElement("span");
    status.className = "transmission-entry-status";
    status.textContent = "● RECEIVED";

    article.append(header, message, status);
    transmissionList.appendChild(article);
  });

  renderPages();
}

function renderPages() {
  if (!transmissionPages) return;
  transmissionPages.replaceChildren();
  transmissionPages.hidden = totalTransmissionPages <= 1;
  if (totalTransmissionPages <= 1) return;

  const button = (label, page, options = {}) => {
    const el = document.createElement("button");
    el.type = "button";
    el.className = "transmission-page-button";
    el.textContent = label;
    el.disabled = Boolean(options.disabled);
    if (options.current) {
      el.classList.add("active");
      el.setAttribute("aria-current", "page");
    }
    el.setAttribute("aria-label", options.name || `Page ${page}`);
    el.addEventListener("click", () => changeTransmissionPage(page));
    transmissionPages.appendChild(el);
  };
  const ellipsis = () => {
    const span = document.createElement("span");
    span.className = "transmission-page-ellipsis";
    span.textContent = "…";
    span.setAttribute("aria-hidden", "true");
    transmissionPages.appendChild(span);
  };

  button("← PREV", currentTransmissionPage - 1, { disabled: currentTransmissionPage === 1, name: "Previous page" });
  let previous = 0;
  const visible = new Set([1, totalTransmissionPages]);
  for (let page = Math.max(1, currentTransmissionPage - 2); page <= Math.min(totalTransmissionPages, currentTransmissionPage + 2); page++) visible.add(page);
  for (const page of [...visible].sort((a, b) => a - b)) {
    if (previous && page > previous + 1) ellipsis();
    button(String(page), page, { current: page === currentTransmissionPage });
    previous = page;
  }
  button("NEXT →", currentTransmissionPage + 1, { disabled: currentTransmissionPage === totalTransmissionPages, name: "Next page" });
}

async function loadTransmissions(page = 1) {
  if (!transmissionList) return;
  const request = ++latestLoadRequest;
  try {
    const response = await fetch(`/api/transmissions?page=${encodeURIComponent(page)}`, {
      headers: { "Accept": "application/json" }, cache: "no-store"
    });
    if (!response.ok) throw new Error("public transmissions unavailable");
    const data = await response.json();
    if (request !== latestLoadRequest) return;
    approvedTransmissions = Array.isArray(data.transmissions) ? data.transmissions : [];
    currentTransmissionPage = Number(data.page) || 1;
    totalTransmissionPages = Number(data.total_pages) || 1;
    totalTransmissionCount = Number(data.total) || 0;
    if (transmissionCount) transmissionCount.textContent = `${totalTransmissionCount} SIGNAL${totalTransmissionCount === 1 ? "" : "S"}`;
    renderTransmissions();
    return true;
  } catch (error) {
    if (request !== latestLoadRequest) return false;
    transmissionList.innerHTML = '<p class="transmission-empty">SIGNAL ARCHIVE TEMPORARILY UNAVAILABLE.</p>';
    if (transmissionPages) transmissionPages.hidden = true;
    return false;
  }
}

async function changeTransmissionPage(page, pushHistory = true) {
  if (page < 1 || page > totalTransmissionPages || page === currentTransmissionPage) return;
  if (!await loadTransmissions(page)) return;
  if (pushHistory) {
    const url = new URL(window.location.href);
    if (currentTransmissionPage === 1) url.searchParams.delete("page");
    else url.searchParams.set("page", String(currentTransmissionPage));
    window.history.pushState({ transmissionPage: currentTransmissionPage }, "", url);
  }
  document.querySelector(".public-transmission-archive")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function submitTransmission(event) {
  event.preventDefault();
  const formData = new FormData(transmissionForm);
  const payload = {
    callsign: String(formData.get("callsign") || "").trim(),
    origin: String(formData.get("origin") || "").trim(),
    message: String(formData.get("message") || "").trim(),
    contact_channel: String(formData.get("contact_channel") || "").trim(),
  };

  if (!payload.callsign || !payload.message) {
    setTransmissionStatus("TRANSMISSION FAILED. RETRY LATER.", "error");
    return;
  }

  setTransmissionStatus("TRANSMITTING SIGNAL…");

  try {
    const response = await fetch("/api/transmissions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) throw new Error("submission rejected");
    transmissionForm.reset();
    setTransmissionStatus(data.message || "TRANSMISSION RECEIVED.\nNOW LIVE.", "success");
    await loadTransmissions(1);
    if (currentTransmissionPage === 1) {
      const url = new URL(window.location.href);
      url.searchParams.delete("page");
      window.history.replaceState({ transmissionPage: 1 }, "", url);
    }
  } catch (error) {
    setTransmissionStatus("TRANSMISSION FAILED.\nRETRY LATER.", "error");
  }
}

if (transmissionForm && transmissionStatus) {
  transmissionForm.addEventListener("submit", submitTransmission);
}

window.addEventListener("popstate", () => {
  const page = Number(new URL(window.location.href).searchParams.get("page")) || 1;
  loadTransmissions(page);
});

const initialTransmissionPage = Number(new URL(window.location.href).searchParams.get("page")) || 1;
loadTransmissions(Math.max(1, initialTransmissionPage));
