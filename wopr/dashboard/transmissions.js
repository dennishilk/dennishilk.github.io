const pendingCount = document.getElementById("pending-count");
const reviewButton = document.getElementById("review-button");
const reviewStatus = document.getElementById("review-status");
const reviewPanel = document.getElementById("review-panel");
const pendingList = document.getElementById("pending-list");

function setReviewStatus(text, mode = "") {
  reviewStatus.textContent = text;
  reviewStatus.className = `auth-message ${mode}`.trim();
}

function formatUtc(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "TIME UNKNOWN";
  return date.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, " UTC");
}

function detail(label, value) {
  const row = document.createElement("p");
  const strong = document.createElement("strong");
  strong.textContent = `${label}: `;
  row.append(strong, value || "—");
  return row;
}

function renderPending(pending) {
  pendingCount.textContent = String(pending.length);
  pendingList.innerHTML = "";
  if (!pending.length) {
    const empty = document.createElement("p");
    empty.className = "game-copy";
    empty.textContent = "NO PENDING TRANSMISSIONS.";
    pendingList.appendChild(empty);
    return;
  }

  pending.forEach((transmission) => {
    const article = document.createElement("article");
    article.className = "pending-transmission";
    article.append(
      detail("CALLSIGN", transmission.callsign),
      detail("ORIGIN", transmission.origin || "UNSPECIFIED"),
      detail("MESSAGE", transmission.message),
      detail("RECEIVED", formatUtc(transmission.receivedAt)),
      detail("STATUS", transmission.status),
    );

    const actions = document.createElement("div");
    actions.className = "moderation-actions";
    const approve = document.createElement("button");
    approve.type = "button";
    approve.textContent = "APPROVE";
    approve.addEventListener("click", () => moderate(transmission.id, "approve"));
    const reject = document.createElement("button");
    reject.type = "button";
    reject.textContent = "REJECT";
    reject.className = "danger-button";
    reject.addEventListener("click", () => moderate(transmission.id, "reject"));
    actions.append(approve, reject);
    article.appendChild(actions);
    pendingList.appendChild(article);
  });
}

async function loadPending(showPanel = false) {
  try {
    const response = await fetch("/wopr/api/transmissions/pending", { credentials: "same-origin", headers: { "Accept": "application/json" } });
    if (response.status === 401) {
      window.location.assign("/wopr/");
      return;
    }
    if (!response.ok) throw new Error("queue unavailable");
    const data = await response.json();
    const pending = Array.isArray(data.pending) ? data.pending : [];
    renderPending(pending);
    setReviewStatus("QUEUE SYNCHRONIZED.", "success");
    if (showPanel) reviewPanel.hidden = false;
  } catch (error) {
    setReviewStatus("QUEUE UNAVAILABLE.", "error");
  }
}

async function moderate(id, action) {
  setReviewStatus(`${action.toUpperCase()} REQUEST TRANSMITTING…`);
  try {
    const response = await fetch(`/wopr/api/transmissions/${encodeURIComponent(id)}/${action}`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Accept": "application/json" },
    });
    if (response.status === 401) {
      window.location.assign("/wopr/");
      return;
    }
    if (!response.ok) throw new Error("moderation failed");
    await loadPending(true);
  } catch (error) {
    setReviewStatus("MODERATION ACTION FAILED.", "error");
  }
}

reviewButton.addEventListener("click", () => {
  reviewPanel.hidden = !reviewPanel.hidden;
  loadPending(true);
});

loadPending(false);

async function loadCompactSecurity() {
  const status = document.getElementById("compact-security-status");
  const findings = document.getElementById("compact-security-findings");
  if (!status || !findings) return;
  try {
    const response = await fetch("/wopr/api/security/summary", { credentials: "same-origin", headers: { Accept: "application/json" } });
    if (response.status === 401) return;
    if (!response.ok) throw new Error("security unavailable");
    const data = await response.json();
    status.textContent = data.summary?.system_status || "SECURE";
    findings.textContent = String(data.summary?.active_findings || 0);
  } catch {
    status.textContent = "ATTENTION";
  }
}

loadCompactSecurity();
