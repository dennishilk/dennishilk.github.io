const transmissionForm = document.getElementById("transmission-form");
const transmissionStatus = document.getElementById("transmission-status");
const transmissionList = document.getElementById("transmission-list");

function formatTransmissionTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "TIME UNKNOWN";
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(date).replace(":", ":");
}

function setTransmissionStatus(text, mode = "") {
  transmissionStatus.textContent = text;
  transmissionStatus.className = `transmission-status ${mode}`.trim();
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

    const time = document.createElement("time");
    time.dateTime = transmission.receivedAt;
    time.textContent = formatTransmissionTime(transmission.receivedAt);

    const callsign = document.createElement("p");
    callsign.textContent = `CALLSIGN: ${transmission.callsign || "UNKNOWN"}`;

    const origin = document.createElement("p");
    origin.textContent = `ORIGIN: ${transmission.origin || "UNSPECIFIED"}`;

    const message = document.createElement("blockquote");
    message.textContent = `"${transmission.message || ""}"`;

    article.append(time, callsign, origin, message);
    transmissionList.appendChild(article);
  });
}

async function loadTransmissions() {
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
    setTransmissionStatus(data.message || "TRANSMISSION RECEIVED. AWAITING REVIEW.", "success");
  } catch (error) {
    setTransmissionStatus("TRANSMISSION FAILED. RETRY LATER.", "error");
  }
}

if (transmissionForm && transmissionStatus && transmissionList) {
  transmissionForm.addEventListener("submit", submitTransmission);
  loadTransmissions();
}
