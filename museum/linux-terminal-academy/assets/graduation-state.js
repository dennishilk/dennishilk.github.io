if (typeof document !== 'undefined' && !document.querySelector('script[data-site-language-loader]')) {
  const languageScript = document.createElement('script');
  languageScript.src = '/site-language.js?v=20260809-sitewide-1';
  languageScript.dataset.siteLanguageLoader = 'true';
  document.head.appendChild(languageScript);
}

/* Browser-local Lab 08 attempt and certificate helpers. No network or account state. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.LinuxAcademyGraduation = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  const eligibilityKey = 'linuxTerminalAcademy.noHintLab08Earned';
  const certificateIdKey = 'linuxTerminalAcademy.certificateId';
  const displayNameKey = 'linuxTerminalAcademy.certificateDisplayName';
  const earnedIssueDateKey = 'linuxTerminalAcademy.earnedCertificateIssueDate';
  const obsoleteKeys = ['linuxTerminalAcademy.certificatePreview', 'linuxTerminalAcademy.certificatePreviewName', 'linuxTerminalAcademy.previewCertificateIssueDate'];
  const graduationKeys = [eligibilityKey, certificateIdKey, displayNameKey, earnedIssueDateKey, ...obsoleteKeys];
  function removeObsoleteState(storage) {
    if (storage && typeof storage.removeItem === 'function') obsoleteKeys.forEach(key => storage.removeItem(key));
  }
  function recoveryHint(system) {
    const evidence = system.recovery.evidence;
    const runaway = system.processByPid(733);
    if (runaway && !runaway.terminated) return evidence.processInspected ? 'The high-CPU museum-render-worker is non-essential. Request a safe stop with: kill 733' : 'Observe the fictional process table first: ps aux. Find the process consuming unusual CPU before stopping it.';
    if (!evidence.serviceInspected) return 'Inspect the failed fictional service: systemctl status museum-exhibit.service';
    if (!evidence.journalRead) return 'Read its fictional journal for the failure detail: journalctl -u museum-exhibit.service';
    const state = system.recoveryPermissionState();
    if (state === 'missing') return 'The required file is currently missing. This Academy can recreate it with: touch /srv/museum/exhibit-index.txt, then set its required mode with chmod 600 /srv/museum/exhibit-index.txt. RESET LAB also restores the original fictional file.';
    if (state === 'unreadable') return 'Inspect the mode with: ls -l /srv/museum/exhibit-index.txt. The owner needs read permission; the final recovery requires the exact minimum mode rw------- (600).';
    if (state === 'overpermissive') return 'The file is readable, but this mission requires the minimum necessary mode, not extra execute or group/other access. Repair it with: chmod 600 /srv/museum/exhibit-index.txt';
    if (system.serviceByName('museum-exhibit.service').state !== 'active') return 'The file now has the exact minimum mode. Restart the fictional service: systemctl restart museum-exhibit.service';
    if (!evidence.serviceVerified) return 'Verify the recovery with: systemctl status museum-exhibit.service';
    return 'All recovery conditions are satisfied. Review the mission checklist and system health panel.';
  }
  function createAttempt(storage) {
    let hintUsed = false;
    return { get hintUsed() { return hintUsed; }, useHint() { hintUsed = true; }, reset() { hintUsed = false; }, recordCompletion(system) { const earned = system.recoveryHealthy() && !hintUsed; if (earned) markEarned(storage); return earned; } };
  }
  function eligible(storage) { removeObsoleteState(storage); return !!storage && storage.getItem(eligibilityKey) === 'true'; }
  function certificateMode(storage) { return eligible(storage) ? 'earned' : 'locked'; }
  function markEarned(storage) { if (!storage) return; removeObsoleteState(storage); storage.setItem(eligibilityKey, 'true'); }
  function displayName(storage) { return storage && storage.getItem(displayNameKey) || ''; }
  function saveDisplayName(storage, name) { if (storage) storage.setItem(displayNameKey, String(name || '').slice(0, 80)); }
  function certificateId(storage) { let id = storage && storage.getItem(certificateIdKey); if (!id) { id = `LTA-2026-${Math.random().toString(36).slice(2, 10).toUpperCase()}`; if (storage) storage.setItem(certificateIdKey, id); } return id; }
  function issueDate(storage) { let date = storage && storage.getItem(earnedIssueDateKey); if (!date) { date = new Date().toISOString().slice(0, 10); if (storage) storage.setItem(earnedIssueDateKey, date); } return date; }
  function clearGraduationState(storage) { if (storage && typeof storage.removeItem === 'function') graduationKeys.forEach(key => storage.removeItem(key)); }
  return { eligibilityKey, certificateIdKey, displayNameKey, earnedIssueDateKey, obsoleteKeys, graduationKeys, removeObsoleteState, recoveryHint, createAttempt, eligible, certificateMode, markEarned, displayName, saveDisplayName, certificateId, issueDate, clearGraduationState };
});
