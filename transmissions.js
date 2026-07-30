const transmissionForm = document.getElementById("transmission-form");
const transmissionStatus = document.getElementById("transmission-status");
const transmissionList = document.getElementById("transmission-list");
const transmissionCount = document.getElementById("transmission-count");
const loadMoreButton = document.getElementById("load-more-transmissions");
const TRANSMISSION_BATCH_SIZE = 10;
let approvedTransmissions = [];
let visibleTransmissionCount = TRANSMISSION_BATCH_SIZE;

function formatTransmissionTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "UTC TIME UNKNOWN";
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(date).replace(",", "") + " UTC";
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
    return;
  }

  approvedTransmissions.slice(0, visibleTransmissionCount).forEach((transmission) => {
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

  if (loadMoreButton) {
    const remaining = approvedTransmissions.length - visibleTransmissionCount;
    loadMoreButton.hidden = remaining <= 0;
    loadMoreButton.textContent = `LOAD MORE SIGNALS (${Math.min(remaining, TRANSMISSION_BATCH_SIZE)})`;
  }
}

async function loadTransmissions() {
  if (!transmissionList) return;
  try {
    const response = await fetch("/api/transmissions", { headers: { "Accept": "application/json" } });
    if (!response.ok) throw new Error("public transmissions unavailable");
    const data = await response.json();
    approvedTransmissions = (Array.isArray(data.transmissions) ? data.transmissions : [])
      .slice()
      .sort((a, b) => Number(b.signal_number) - Number(a.signal_number));
    if (transmissionCount) transmissionCount.textContent = `${approvedTransmissions.length} SIGNAL${approvedTransmissions.length === 1 ? "" : "S"}`;
    renderTransmissions();
  } catch (error) {
    transmissionList.innerHTML = '<p class="transmission-empty">SIGNAL ARCHIVE TEMPORARILY UNAVAILABLE.</p>';
  }
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
    setTransmissionStatus("TRANSMISSION RECEIVED.\nAWAITING REVIEW.", "success");
  } catch (error) {
    setTransmissionStatus("TRANSMISSION FAILED.\nRETRY LATER.", "error");
  }
}

if (transmissionForm && transmissionStatus) {
  transmissionForm.addEventListener("submit", submitTransmission);
}

if (loadMoreButton) {
  loadMoreButton.addEventListener("click", () => {
    visibleTransmissionCount += TRANSMISSION_BATCH_SIZE;
    renderTransmissions();
  });
}

loadTransmissions();
