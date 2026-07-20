/* Browser-local Lab 08 attempt and certificate helpers. No network or account state. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.LinuxAcademyGraduation = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  const eligibilityKey = 'linuxTerminalAcademy.noHintLab08Earned';
  const certificateIdKey = 'linuxTerminalAcademy.certificateId';
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
    return {
      get hintUsed() { return hintUsed; },
      useHint() { hintUsed = true; },
      reset() { hintUsed = false; },
      recordCompletion(system) { if (system.recoveryHealthy() && !hintUsed && storage) storage.setItem(eligibilityKey, 'true'); return system.recoveryHealthy() && !hintUsed; }
    };
  }
  function eligible(storage) { return !!storage && storage.getItem(eligibilityKey) === 'true'; }
  function certificateId(storage) { let id = storage && storage.getItem(certificateIdKey); if (!id) { id = `LTA-2026-${Math.random().toString(36).slice(2, 10).toUpperCase()}`; if (storage) storage.setItem(certificateIdKey, id); } return id; }
  return { eligibilityKey, recoveryHint, createAttempt, eligible, certificateId };
});
