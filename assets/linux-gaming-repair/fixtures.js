// SYNTHETIC, ANONYMIZED REPLAYS. These are not captured logs and are not proof of
// hardware compatibility or a solved issue. Historical versions are user-supplied.
export const acceptanceFixture = Object.freeze({
  label: {
    en: 'Synthetic anonymized Cthulhu replay — storage evidence, no final GPU error',
    de: 'Synthetische anonymisierte Cthulhu-Wiedergabe — Speicherbelege, kein letzter GPU-Fehler',
  },
  log: [
    '# SYNTHETIC REPLAY — derived from documented observations, not an original capture.',
    '# Versions below are user-reported historical evidence, not verified current releases.',
    'Kernel: 7.2.8',
    'Mesa: 26.1.8',
    'Vulkan API: 1.4.x',
    '55:00.0 VGA compatible controller [0300]: AMD Navi 44 [Radeon RX 9060 XT] [1002:7590]',
    '    Kernel driver in use: amdgpu',
    '[ 100.000000] ata2.00: exception Emask 0x11 SAct 0x0 SErr 0x4110000 action 0x6 frozen',
    '[ 100.000010] ata2.00: irq_stat 0x08000000, interface fatal error',
    '[ 100.000020] ata2: SError: { UnrecovData 10B8B BadCRC Handshk }',
    '[ 100.000030] ata2.00: failed command: READ FPDMA QUEUED',
    '[ 100.000040] ata2: hard resetting link',
    '# End of synthetic extract. No GPU timeout, reset or lost-bus event is supplied here.',
  ].join('\n'),
  observations: [
    { en: 'Documented workstation: Ryzen 7 5800X3D, Radeon RX 9060 XT 16 GiB / Navi 44, NixOS. These identifiers do not establish rendering success.', de: 'Dokumentierte Workstation: Ryzen 7 5800X3D, Radeon RX 9060 XT 16 GiB / Navi 44, NixOS. Diese Identifikatoren beweisen kein erfolgreiches Rendering.' },
    { en: 'Lightweight games remained stable; movement in S.T.A.L.K.E.R. 2 produced 1–2-second stalls or hard-locks. Some hard-locks left no useful final GPU message.', de: 'Leichte Spiele blieben stabil; Bewegung in S.T.A.L.K.E.R. 2 führte zu 1–2-sekündigen Stalls oder Hard-Locks. Einige Hard-Locks hinterließen keine brauchbare letzte GPU-Meldung.' },
    { en: 'Older Arch Linux testing separately reported the GPU disappearing from the PCIe bus. That earlier observation is not inserted into this no-final-error log.', de: 'Ältere Arch-Linux-Tests meldeten separat das Verschwinden der GPU vom PCIe-Bus. Diese frühere Beobachtung wird nicht in dieses Log ohne letzte GPU-Meldung eingefügt.' },
    { en: 'Moving the game from SATA to NVMe did not eliminate the problem. A 112 W GPU cap avoided some hard crashes but stalls persisted; neither observation proves a cause.', de: 'Verschieben des Spiels von SATA auf NVMe beseitigte das Problem nicht. Ein GPU-Limit von 112 W vermied einige harte Abstürze, Stalls blieben; keine dieser Beobachtungen beweist eine Ursache.' },
    { en: 'The SATA interface/CRC errors and link resets are a distinct I/O hypothesis. GPU/PCIe, kernel/firmware and graphics-userspace hypotheses require their own evidence.', de: 'SATA-Schnittstellen-/CRC-Fehler und Verbindungsresets bilden eine eigene I/O-Hypothese. GPU-/PCIe-, Kernel-/Firmware- und Grafik-Userspace-Hypothesen brauchen eigene Belege.' },
  ],
  limitations: {
    en: 'Illustrative replay only. Timestamps are synthetic; symptoms and historical versions are supplied observations. No causal ordering, failed GPU event, confirmed root cause or fix is invented. The underlying problem remains unresolved.',
    de: 'Nur beispielhafte Wiedergabe. Zeitstempel sind synthetisch; Symptome und historische Versionen stammen aus mitgeteilten Beobachtungen. Es werden keine kausale Reihenfolge, GPU-Fehlermeldung, bestätigte Ursache oder Lösung erfunden. Das zugrunde liegende Problem bleibt ungelöst.',
  },
});

export const isolatedGpuFixture = Object.freeze({
  label: { en: 'Synthetic isolated GPU transport failure', de: 'Synthetischer isolierter GPU-Transportfehler' },
  log: '# SYNTHETIC isolated replay of a separately documented earlier observation.\n[ 200.000000] amdgpu 0000:55:00.0: amdgpu: device lost from bus',
});
export const isolatedStorageFixture = Object.freeze({
  label: { en: 'Synthetic isolated SATA transport failure', de: 'Synthetischer isolierter SATA-Transportfehler' },
  log: '# SYNTHETIC isolated SATA replay.\n[ 300.000000] ata2: SError: { UnrecovData 10B8B BadCRC Handshk }\n[ 300.000020] ata2.00: failed command: READ FPDMA QUEUED\n[ 300.000030] ata2: hard resetting link',
});
export const mixedFailureFixture = Object.freeze({
  label: { en: 'Synthetic mixed independent GPU and storage events', de: 'Synthetische unabhängige GPU- und Speicherereignisse' },
  log: [
    '# SYNTHETIC ADVERSARIAL MIX — not a captured sequence from the workstation.',
    '[ 400.000000] ata2: SError: { UnrecovData 10B8B BadCRC Handshk }',
    '[ 400.000010] ata2: hard resetting link',
    '[ 400.000020] amdgpu 0000:55:00.0: amdgpu: ring gfx_0.0.0 timeout, signaled seq=10, emitted seq=11',
    '[ 400.000030] amdgpu 0000:55:00.0: amdgpu: GPU reset begin!',
  ].join('\n'),
});
