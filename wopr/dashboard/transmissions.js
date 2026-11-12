const pendingCount = document.getElementById("pending-count");
const recentCount = document.getElementById("recent-count");
const reviewButton = document.getElementById("review-button");
const reviewStatus = document.getElementById("review-status");
const reviewPanel = document.getElementById("review-panel");
const pendingList = document.getElementById("pending-list");

function setReviewStatus(text, mode = "") {
  reviewStatus.textContent = text;
  reviewStatus.className = "auth-message " + mode;
}

function formatUtc(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "TIME UNKNOWN";
  return date.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, " UTC");
}

function formatLocal(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "TIME UNKNOWN";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "medium" }).format(date);
}

function dateTimeLocalInput(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (part) => String(part).padStart(2, "0");
  return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate()) +
    "T" + pad(date.getHours()) + ":" + pad(date.getMinutes()) + ":" + pad(date.getSeconds());
}

function detail(label, value) {
  const row = document.createElement("p");
  const strong = document.createElement("strong");
  strong.textContent = label + ": ";
  row.append(strong, document.createTextNode(value || "—"));
  return row;
}

function actionButton(label, action, danger = false) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  if (danger) button.className = "danger-button";
  button.addEventListener("click", action);
  return button;
}

function renderRecent(recent) {
  pendingList.replaceChildren();
  if (!recent.length) {
    const empty = document.createElement("p");
    empty.className = "game-copy";
    empty.textContent = "NO TRANSMISSIONS STORED.";
    pendingList.appendChild(empty);
    return;
  }

  recent.forEach((transmission) => {
    const article = document.createElement("article");
    article.className = "pending-transmission";
    const statusText = {
      APPROVED: "PUBLISHED", PENDING: "PENDING REVIEW", REJECTED: "HIDDEN / REJECTED"
    }[transmission.status] || "UNKNOWN";

    const number = Number.isSafeInteger(transmission.signal_number)
      ? "#" + String(transmission.signal_number).padStart(4, "0") : "NOT NUMBERED";
    article.append(
      detail("SIGNAL", number),
      detail("CALLSIGN", transmission.callsign),
      detail("ORIGIN", transmission.origin || "UNSPECIFIED"),
      detail("MESSAGE", transmission.message),
      detail("STATUS", statusText),
      detail("ORIGINALLY RECEIVED (UTC)", formatUtc(transmission.receivedAt)),
      detail("PUBLIC DISPLAY TIME (LOCAL)", formatLocal(transmission.displayAt || transmission.receivedAt))
    );

    const controls = document.createElement("div");
    controls.className = "moderation-actions";
    if (transmission.status === "PENDING") {
      controls.append(
        actionButton("PUBLISH", () => moderate(transmission.id, "approve")),
        actionButton("REJECT", () => moderate(transmission.id, "reject"), true)
      );
    } else if (transmission.status === "APPROVED") {
      controls.append(actionButton("HIDE", () => {
        if (window.confirm("Hide this public guestbook message? It will remain stored.")) {
          moderate(transmission.id, "hide");
        }
      }, true));
    } else if (transmission.status === "REJECTED") {
      controls.append(actionButton("RESTORE", () => moderate(transmission.id, "restore")));
    }

    const editor = document.createElement("div");
    editor.className = "transmission-time-editor";
    const label = document.createElement("label");
    label.textContent = "SET DISPLAY DATE & TIME (YOUR DEVICE'S LOCAL TIME)";
    const input = document.createElement("input");
    input.type = "datetime-local";
    input.step = "1";
    input.value = dateTimeLocalInput(transmission.displayAt || transmission.receivedAt);
    input.setAttribute("aria-label", "Display date and time for " + transmission.callsign);
    label.appendChild(input);

    const save = actionButton("SAVE DATE / TIME", () => {
      if (!input.value) {
        setReviewStatus("ENTER A VALID DATE AND TIME.", "error");
        return;
      }
      const date = new Date(input.value);
      if (Number.isNaN(date.getTime())) {
        setReviewStatus("INVALID DATE AND TIME.", "error");
        return;
      }
      saveTimestamp(transmission.id, date.toISOString());
    });
    const reset = actionButton("ORIGINAL TIME", () => saveTimestamp(transmission.id, null));
    reset.disabled = !transmission.displayAt;
    const hint = document.createElement("small");
    hint.textContent = "Original receipt is kept unchanged. Only the public timestamp and its chronological position change.";
    editor.append(label, save, reset, hint);
    article.append(controls, editor);
    pendingList.appendChild(article);
  });
}

async function loadRecent(showPanel = false) {
  try {
    const response = await fetch("/wopr/api/transmissions/recent", {
      credentials: "same-origin", headers: { "Accept": "application/json" }, cache: "no-store"
    });
    if (response.status === 401) {
      window.location.assign("/wopr/");
      return;
    }
    if (!response.ok) throw new Error("archive unavailable");
    const data = await response.json();
    pendingCount.textContent = String(data.pending_count || 0);
    recentCount.textContent = String(data.count || 0) + " OF " + String(data.total || 0);
    renderRecent(Array.isArray(data.recent) ? data.recent : []);
    setReviewStatus("ARCHIVE SYNCHRONIZED. SHOWING UP TO 100 MOST RECENT ENTRIES.", "success");
    if (showPanel) reviewPanel.hidden = false;
  } catch (error) {
    setReviewStatus("ARCHIVE UNAVAILABLE.", "error");
  }
}

async function moderate(id, action) {
  setReviewStatus(action.toUpperCase() + " REQUEST TRANSMITTING…");
  try {
    const response = await fetch("/wopr/api/transmissions/" + encodeURIComponent(id) + "/" + action, {
      method: "POST", credentials: "same-origin", headers: { "Accept": "application/json" }
    });
    if (response.status === 401) {
      window.location.assign("/wopr/");
      return;
    }
    if (!response.ok) throw new Error("moderation failed");
    await loadRecent(true);
  } catch (error) {
    setReviewStatus("MODERATION ACTION FAILED.", "error");
  }
}

async function saveTimestamp(id, displayAt) {
  setReviewStatus("SAVING DISPLAY DATE/TIME…");
  try {
    const response = await fetch("/wopr/api/transmissions/" + encodeURIComponent(id) + "/time", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ displayAt }),
    });
    if (response.status === 401) {
      window.location.assign("/wopr/");
      return;
    }
    if (!response.ok) throw new Error("save failed");
    await loadRecent(true);
    setReviewStatus(displayAt ? "DISPLAY TIME SAVED." : "ORIGINAL RECEIPT TIME RESTORED.", "success");
  } catch (error) {
    setReviewStatus("COULD NOT SAVE DATE/TIME.", "error");
  }
}

reviewButton.addEventListener("click", () => {
  if (!reviewPanel.hidden) {
    reviewPanel.hidden = true;
    return;
  }
  loadRecent(true);
});

loadRecent(false);

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
