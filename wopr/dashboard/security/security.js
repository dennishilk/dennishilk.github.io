const statusEl = document.getElementById("security-status");
const scannerEl = document.getElementById("scanner-requests");
const sensitiveEl = document.getElementById("sensitive-successes");
const decoyEl = document.getElementById("decoy-hits");
const activeEl = document.getElementById("active-findings");
const selfCheckAtEl = document.getElementById("self-check-at");
const intentEl = document.getElementById("scanner-intent-list");
const findingsEl = document.getElementById("findings-list");
const selfCheckEl = document.getElementById("self-check-list");
const INTENT_LABELS = { git_exposure: "Git Exposure", secret_hunting: "Secret Hunting", wordpress_probing: "WordPress Probing", path_traversal: "Path Traversal", admin_discovery: "Admin Discovery", credential_file_probing: "Credential File Probing", backup_file_probing: "Backup File Probing", exploit_probe: "Exploit Probe", unknown: "Other" };
function formatTime(value) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "UNKNOWN" : date.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, " UTC"); }
function setText(el, value) { if (el) el.textContent = String(value); }
async function getJson(url) { const response = await fetch(url, { credentials: "same-origin", headers: { Accept: "application/json" } }); if (response.status === 401) { window.location.assign("/wopr/"); return null; } if (!response.ok) throw new Error(`Request failed: ${url}`); return response.json(); }
async function saveReview(id, status, note) {
  const response = await fetch(`/wopr/api/security/reviews/${encodeURIComponent(id)}`, { method: "PUT", credentials: "same-origin", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ status, note }) });
  if (response.status === 401) { window.location.assign("/wopr/"); return; }
  if (!response.ok) throw new Error("Review update failed");
  await loadSecurity();
}
function renderSummary(summary) { setText(statusEl, summary.system_status || "SECURE"); statusEl.className = `status-pill ${(summary.system_status || "SECURE").toLowerCase()}`; setText(scannerEl, summary.scanner_requests || 0); setText(sensitiveEl, summary.successful_sensitive_requests || 0); setText(decoyEl, summary.decoy_hits || 0); setText(activeEl, summary.active_findings || 0); setText(selfCheckAtEl, summary.last_self_check ? formatTime(summary.last_self_check) : "ON DEMAND"); intentEl.innerHTML = ""; for (const [id, label] of Object.entries(INTENT_LABELS)) { const row = document.createElement("div"); row.className = "security-row"; row.append(Object.assign(document.createElement("span"), { textContent: label }), Object.assign(document.createElement("strong"), { textContent: String(summary.scanner_intent?.[id] || 0) })); intentEl.appendChild(row); } }
function reviewControls(finding, review) {
  if (!review) return null;
  const area = document.createElement("section"); area.className = "operator-review";
  const status = document.createElement("p"); status.className = "operator-status"; status.textContent = review.recurrence ? "⚠ REOCCURRED AFTER RESOLUTION" : `OPERATOR STATUS: ${review.status}`; area.append(status);
  if (review.reviewed_at) area.append(Object.assign(document.createElement("p"), { textContent: `REVIEWED: ${formatTime(review.reviewed_at)}` }));
  const note = document.createElement("textarea"); note.maxLength = 1000; note.rows = 3; note.placeholder = "Operator note (optional, 1000 characters max)"; note.value = review.note || ""; note.setAttribute("aria-label", `Operator note for ${finding.title}`); area.append(note);
  const buttons = document.createElement("div"); buttons.className = "operator-controls";
  const actions = review.status === "RESOLVED" || review.status === "EXPECTED" ? [["OPEN", "REOPEN"], [review.status, "EDIT NOTE"]] : [["ACKNOWLEDGED", "ACKNOWLEDGE"], ["RESOLVED", "RESOLVE"], ["EXPECTED", "MARK EXPECTED"]];
  for (const [nextStatus, label] of actions) { const button = Object.assign(document.createElement("button"), { type: "button", textContent: label }); button.addEventListener("click", async () => { button.disabled = true; try { await saveReview(finding.id, nextStatus, note.value); } catch { button.disabled = false; } }); buttons.append(button); }
  area.append(buttons); return area;
}
function renderFindings(findings) { findingsEl.innerHTML = ""; for (const finding of findings) { const article = document.createElement("article"); article.className = `finding-card ${String(finding.severity || "").toLowerCase()}`; article.innerHTML = `<div class="finding-heading"><strong></strong><span></span></div><p></p><dl><dt>FIRST SEEN</dt><dd></dd><dt>LAST SEEN</dt><dd></dd><dt>AUTOMATED STATUS</dt><dd></dd><dt>REQUESTS</dt><dd></dd></dl>`; article.querySelector("strong").textContent = finding.severity || "INFO"; article.querySelector("span").textContent = finding.title || "Security finding"; article.querySelector("p").textContent = finding.summary || "No summary available."; const dds = article.querySelectorAll("dd"); dds[0].textContent = formatTime(finding.first_seen); dds[1].textContent = formatTime(finding.last_seen); dds[2].textContent = `${finding.status || "unknown"} · ${finding.remediation_status || "review"}`; dds[3].textContent = String(finding.request_count || 0); const controls = reviewControls(finding, finding.operator_review); if (controls) article.append(controls); findingsEl.appendChild(article); } }
function renderSelfCheck(selfCheck) { selfCheckEl.innerHTML = ""; for (const check of selfCheck.checks || []) { const row = document.createElement("div"); row.className = "security-row"; row.append(Object.assign(document.createElement("span"), { textContent: check.path }), Object.assign(document.createElement("strong"), { textContent: `${check.status ?? "—"} ${check.result || "UNKNOWN"}` })); selfCheckEl.appendChild(row); } }
async function loadSecurity() { try { const [summaryData, findingsData, selfCheckData] = await Promise.all([getJson('/wopr/api/security/summary'), getJson('/wopr/api/security/findings'), getJson('/wopr/api/security/self-check')]); if (!summaryData || !findingsData || !selfCheckData) return; renderSummary(summaryData.summary || {}); renderFindings(findingsData.findings || []); renderSelfCheck(selfCheckData.self_check || {}); } catch { setText(statusEl, "ATTENTION"); } }
loadSecurity();
