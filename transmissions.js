const transmissionForm = document.getElementById("transmission-form");
const transmissionStatus = document.getElementById("transmission-status");
const transmissionList = document.getElementById("transmission-list");

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

function appendDetail(parent, label, value) {
  const row = document.createElement("p");
  const strong = document.createElement("strong");
  strong.textContent = `${label}: `;
  const span = document.createElement("span");
  span.textContent = value;
  row.append(strong, span);
  parent.appendChild(row);
}

function renderTransmissions(transmissions) {
  transmissionList.innerHTML = "";
  if (!transmissions.length) {
    const empty = document.createElement("p");
    empty.className = "transmission-empty";
    empty.textContent = "NO APPROVED SIGNALS RECEIVED YET.";
    transmissionList.appendChild(empty);
    return;
  }

  transmissions.forEach((transmission) => {
    const article = document.createElement("article");
    article.className = "transmission-entry";

    const header = document.createElement("div");
    header.className = "transmission-entry-header";

    const signal = document.createElement("h3");
    signal.textContent = `SIGNAL ${String(transmission.signal_number).padStart(4, "0")}`;

    header.appendChild(signal);

    const meta = document.createElement("div");
    meta.className = "transmission-entry-meta";
    appendDetail(meta, "CALLSIGN", transmission.callsign || "UNKNOWN");
    appendDetail(meta, "ORIGIN", transmission.origin || "UNSPECIFIED");
    const dateRow = document.createElement("p");
    const dateLabel = document.createElement("strong");
    dateLabel.textContent = "DATE:";
    const time = document.createElement("time");
    time.dateTime = transmission.receivedAt || "";
    time.textContent = formatTransmissionTime(transmission.receivedAt);
    dateRow.append(dateLabel, time);
    meta.appendChild(dateRow);

    const message = document.createElement("blockquote");
    message.textContent = transmission.message || "";

    const status = document.createElement("p");
    status.className = "transmission-entry-status";
    status.innerHTML = "<strong>STATUS:</strong><span>RECEIVED</span>";

    article.append(header, meta, message, status);
    transmissionList.appendChild(article);
  });
}

async function loadTransmissions() {
  if (!transmissionList) return;
  try {
    const response = await fetch("/api/transmissions", { headers: { "Accept": "application/json" } });
    if (!response.ok) throw new Error("public transmissions unavailable");
    const data = await response.json();
    renderTransmissions(Array.isArray(data.transmissions) ? data.transmissions : []);
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

loadTransmissions();
