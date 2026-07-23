(() => {
  const floppy = document.querySelector('[data-floppy]');
  if (floppy) {
    const button = floppy.querySelector('[data-floppy-button]'); const output = floppy.querySelector('output'); let disk = 0;
    button.addEventListener('click', () => {
      disk += 1;
      if (disk < 6) output.textContent = `READING DISK ${disk}... DISK OK — INSERT NEXT DISK`;
      else if (disk === 6) { output.textContent = 'READ ERROR ON A LATE DISK — INSTALLATION INTERRUPTED'; button.textContent = 'RESTART RECONSTRUCTION'; }
      else { disk = 0; output.textContent = 'READY — INSERT DISK 1'; button.textContent = 'INSERT NEXT DISK'; }
    });
  }
  const builder = document.querySelector('[data-pc-builder]');
  if (builder) {
    const output = builder.querySelector('output'); const required = ['motherboard', 'cpu', 'ram', 'power', 'storage', 'display'];
    builder.addEventListener('change', () => { const selected = [...builder.querySelectorAll('input:checked')].map(input => input.value); const missing = required.filter(item => !selected.includes(item)); output.textContent = missing.length ? `NOT READY — MISSING: ${missing.join(', ').toUpperCase()}` : 'BOOT PATH COMPLETE — CONCEPTUAL SYSTEM READY'; });
  }
  const diagnosis = document.querySelector('[data-linux-diagnosis]');
  if (diagnosis) {
    const output = diagnosis.querySelector('output'); diagnosis.addEventListener('click', event => { const choice = event.target.dataset.diagnose; if (!choice) return; output.textContent = choice === 'bootloader' ? 'GOOD FIRST CHECK — VERIFY BOOT DEVICE, PARTITION LAYOUT, THEN BOOTLOADER CONFIGURATION.' : 'POSSIBLE LATER CHECK — FIRST ESTABLISH WHETHER THE FIRMWARE CAN FIND A BOOTABLE SYSTEM.'; });
  }
})();
