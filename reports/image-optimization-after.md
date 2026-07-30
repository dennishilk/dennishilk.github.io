# Image optimization audit

> Byte figures are inventory/transfer estimates, not browser timings.

## Global totals

- Raster images: **60**
- Raster bytes: **106876741 (101.9 MiB)**
- Repository bytes (excluding `.git`): **143046732 (136.4 MiB)**
- Images / repository: **74.71%**
- Oversized candidates: **0**
- Unreferenced candidates: **4**
- Manual review: **18**

### By extension

| Extension | Bytes |
|---|---:|
| jpg | 79891603 (76.2 MiB) |
| png | 24223646 (23.1 MiB) |
| webp | 2761492 (2.6 MiB) |

## Before / after transfer estimate

| Metric | Value |
|---|---:|
| Original raster count | 60 |
| Current raster count | 60 |
| Estimated transfer before | 101.9 MiB |
| Estimated transfer after | 101.9 MiB |
| Bytes saved | 0 |
| Percentage saved | 0% |
| Optimized / converted / resized | 0 / 0 / 0 |
| Unchanged / skipped / manual / failed | 60 / 18 / 18 / 0 |

No live references were changed: the environment had no WebP encoder, so the safety gate produced no PASS candidates. Repository growth is limited to reviewable tooling, tests, documentation, state, and reports.

## Audit findings and root causes

- Full-resolution JPEG photographs dominate the raster inventory; evidence and scientific assets require curator/manual review rather than automatic downscaling.
- The 1024×1024 root `avatar.png` is served at a CSS width of 160 px (120 px on small screens), but no derivative was introduced without an available encoder and visual review.
- The requested `nebu.png` does not exist. The similarly named 1024×1024 alpha-bearing `nebby.png` exists in two byte-identical copies and is displayed as a small mascot.
- Existing markup commonly omits intrinsic dimensions and lazy/async hints; these are reported, not bulk-edited, to avoid LCP and semantic regressions.

## Top savings

No candidates passed in this environment, so the top-20 savings table is empty (0 bytes saved).

## Largest 20

| Path | Size | Dimensions | Class | Status |
|---|---:|---:|---|---|
| `assets/wiesmoor/1783513449100.jpg` | 6.1 MiB | 2736×3648 | photo | ELIGIBLE |
| `assets/wiesmoor/1783513449999.jpg` | 5.0 MiB | 4080×3060 | photo | ELIGIBLE |
| `assets/wiesmoor/1783513449217.jpg` | 4.9 MiB | 3648×2736 | photo | ELIGIBLE |
| `assets/wiesmoor/1783513449676.jpg` | 4.2 MiB | 3648×2736 | photo | ELIGIBLE |
| `assets/wiesmoor/1783513449513.jpg` | 4.1 MiB | 3648×2736 | photo | ELIGIBLE |
| `assets/home-computing-lab/cthulhu-fastfetch-system-snapshot-2026.png` | 3.8 MiB | 3440×1440 | screenshot | ELIGIBLE |
| `assets/home-computing-lab/field-notes/worldnode-cthulhu-terminals.png` | 3.7 MiB | 3440×1440 | museum evidence image | MANUAL REVIEW |
| `assets/wiesmoor/1783513449947.jpg` | 3.6 MiB | 4080×3060 | photo | ELIGIBLE |
| `assets/wiesmoor/1783513449869.jpg` | 3.5 MiB | 3648×2736 | photo | ELIGIBLE |
| `assets/me/IMG_20260620_070938.jpg` | 3.4 MiB | 4640×3488 | photo | ELIGIBLE |
| `assets/home-computing-lab/field-notes/windows98-scsi-system.jpg` | 3.4 MiB | 4000×1800 | museum evidence image | MANUAL REVIEW |
| `assets/home-computing-lab/field-notes/windows98-device-manager-scsi.jpg` | 3.2 MiB | 4000×1800 | museum evidence image | MANUAL REVIEW |
| `assets/me/admin team.jpg` | 2.8 MiB | 4000×1800 | photo | ELIGIBLE |
| `assets/geomagnetic-magnetosphere.png` | 2.6 MiB | 1536×1024 | map/scientific asset | MANUAL REVIEW |
| `assets/home-computing-lab/field-notes/missing-capacitor.jpg` | 2.4 MiB | 4000×1800 | museum evidence image | MANUAL REVIEW |
| `assets/home-computing-lab/field-notes/scsi-to-ide-upgrade.jpg` | 2.3 MiB | 4000×1800 | museum evidence image | MANUAL REVIEW |
| `assets/horizon/horizon-landscape.webp` | 2.2 MiB | None×None | map/scientific asset | MANUAL REVIEW |
| `assets/home-computing-lab/field-notes/windows98-system-properties.jpg` | 2.2 MiB | 1800×4000 | museum evidence image | MANUAL REVIEW |
| `assets/home-computing-lab/powercolor-rx-9060-xt-hellhound-box-2026-07-27.jpg` | 2.1 MiB | 4000×1800 | photo | ELIGIBLE |
| `avatar.png` | 2.1 MiB | 1024×1024 | avatar | ELIGIBLE |

## Unreferenced candidates

- `assets/home-computing-lab/thinkpad-t480-cooling-upgrade-2026-07-27.jpg`
- `assets/horizon/observatory-footer.webp`
- `assets/me/admin team.jpg`
- `assets/me/kind mit oma.jpg`

## Oversized relative to explicit display dimensions

- None detected.

## Referenced images missing explicit width/height

- `assets/404-kermit-dennis.jpg`
- `assets/geomagnetic-magnetosphere.png`
- `assets/home-computing-lab/amd-ryzen-7-5800x3d-box-2026-07-27.jpg`
- `assets/home-computing-lab/asus-strix-radeon-r9-380-artifact-2026-07-27.jpg`
- `assets/home-computing-lab/cthulhu-case-2026.jpg`
- `assets/home-computing-lab/cthulhu-fastfetch-system-snapshot-2026.png`
- `assets/home-computing-lab/cthulhu-workstation-overview-2026.jpg`
- `assets/home-computing-lab/field-notes/icq-retro-workstation.png`
- `assets/home-computing-lab/field-notes/m2-screw-fall.jpg`
- `assets/home-computing-lab/field-notes/missing-capacitor-detail.png`
- `assets/home-computing-lab/field-notes/missing-capacitor.jpg`
- `assets/home-computing-lab/field-notes/one-line-fix-login.png`
- `assets/home-computing-lab/field-notes/scsi-to-ide-upgrade.jpg`
- `assets/home-computing-lab/field-notes/windows98-device-manager-scsi.jpg`
- `assets/home-computing-lab/field-notes/windows98-scsi-system.jpg`
- `assets/home-computing-lab/field-notes/windows98-system-properties.jpg`
- `assets/home-computing-lab/field-notes/worldnode-cthulhu-terminals.png`
- `assets/home-computing-lab/gentoo-xmonad-rtx3060ti-ryzen5800x3d-desktop-2026-07-27.png`
- `assets/home-computing-lab/homelab-qnap-nas-2026-07-27.jpg`
- `assets/home-computing-lab/homelab-rack-overview-2026-07-27.jpg`
- `assets/home-computing-lab/msi-gtx-970-gaming-4g-reconstruction-2026.png`
- `assets/home-computing-lab/powercolor-rx-9060-xt-hellhound-box-2026-07-27.jpg`
- `assets/home-computing-lab/preserved-operating-system-ssds-2026-07-27.jpg`
- `assets/home-computing-lab/retro-pc-dos-boot-2026-07-27.jpg`
- `assets/home-computing-lab/retro-pc-overview-2026-07-27.jpg`
- `assets/home-computing-lab/worldnode-1u-server-open-2026-07-27.jpg`
- `assets/horizon/horizon-landscape.webp`
- `assets/horizon/iss.webp`
- `assets/horizon/milky-way-overlay.webp`
- `assets/me/lost-place-newspaper-feature.jpg`
- `assets/traffic-world-map.png`
- `assets/wiesmoor/1783513449100.jpg`
- `assets/wiesmoor/1783513449217.jpg`
- `assets/wiesmoor/1783513449513.jpg`
- `assets/wiesmoor/1783513449676.jpg`
- `assets/wiesmoor/1783513449869.jpg`
- `assets/wiesmoor/1783513449947.jpg`
- `assets/wiesmoor/1783513449999.jpg`
- `assets/wordpress-kant-hochkant.jpg`
- `avatar.png`
- `favicon.png`
- `images/avatar.png`
- `images/nebby.png`
- `nebby.png`

## Referenced images missing lazy loading

- `assets/404-kermit-dennis.jpg`
- `assets/geomagnetic-magnetosphere.png`
- `assets/home-computing-lab/amd-ryzen-7-5800x3d-box-2026-07-27.jpg`
- `assets/home-computing-lab/asus-strix-radeon-r9-380-artifact-2026-07-27.jpg`
- `assets/home-computing-lab/cthulhu-case-2026.jpg`
- `assets/home-computing-lab/cthulhu-fastfetch-system-snapshot-2026.png`
- `assets/home-computing-lab/cthulhu-workstation-overview-2026.jpg`
- `assets/home-computing-lab/field-notes/icq-retro-workstation.png`
- `assets/home-computing-lab/field-notes/m2-screw-fall.jpg`
- `assets/home-computing-lab/field-notes/missing-capacitor-detail.png`
- `assets/home-computing-lab/field-notes/missing-capacitor.jpg`
- `assets/home-computing-lab/field-notes/one-line-fix-login.png`
- `assets/home-computing-lab/field-notes/scsi-to-ide-upgrade.jpg`
- `assets/home-computing-lab/field-notes/windows98-device-manager-scsi.jpg`
- `assets/home-computing-lab/field-notes/windows98-scsi-system.jpg`
- `assets/home-computing-lab/field-notes/windows98-system-properties.jpg`
- `assets/home-computing-lab/field-notes/worldnode-cthulhu-terminals.png`
- `assets/home-computing-lab/gentoo-xmonad-rtx3060ti-ryzen5800x3d-desktop-2026-07-27.png`
- `assets/home-computing-lab/homelab-qnap-nas-2026-07-27.jpg`
- `assets/home-computing-lab/homelab-rack-overview-2026-07-27.jpg`
- `assets/home-computing-lab/msi-gtx-970-gaming-4g-reconstruction-2026.png`
- `assets/home-computing-lab/powercolor-rx-9060-xt-hellhound-box-2026-07-27.jpg`
- `assets/home-computing-lab/preserved-operating-system-ssds-2026-07-27.jpg`
- `assets/home-computing-lab/retro-pc-dos-boot-2026-07-27.jpg`
- `assets/home-computing-lab/retro-pc-overview-2026-07-27.jpg`
- `assets/home-computing-lab/worldnode-1u-server-open-2026-07-27.jpg`
- `assets/horizon/horizon-landscape.webp`
- `assets/horizon/iss.webp`
- `assets/horizon/milky-way-overlay.webp`
- `assets/me/IMG_20260620_070938.jpg`
- `assets/me/lost-place-newspaper-feature.jpg`
- `assets/traffic-world-map.png`
- `assets/wiesmoor/1783513449947.jpg`
- `assets/wordpress-kant-hochkant.jpg`
- `avatar.png`
- `favicon.png`
- `images/avatar.png`
- `images/nebby.png`
- `nebby.png`

## Must not be touched automatically

- `assets/geomagnetic-magnetosphere.png`
- `assets/home-computing-lab/asus-strix-radeon-r9-380-artifact-2026-07-27.jpg`
- `assets/home-computing-lab/field-notes/icq-retro-workstation.png`
- `assets/home-computing-lab/field-notes/m2-screw-fall.jpg`
- `assets/home-computing-lab/field-notes/missing-capacitor-detail.png`
- `assets/home-computing-lab/field-notes/missing-capacitor.jpg`
- `assets/home-computing-lab/field-notes/one-line-fix-login.png`
- `assets/home-computing-lab/field-notes/scsi-to-ide-upgrade.jpg`
- `assets/home-computing-lab/field-notes/windows98-device-manager-scsi.jpg`
- `assets/home-computing-lab/field-notes/windows98-scsi-system.jpg`
- `assets/home-computing-lab/field-notes/windows98-system-properties.jpg`
- `assets/home-computing-lab/field-notes/worldnode-cthulhu-terminals.png`
- `assets/home-computing-lab/gentoo-xmonad-rtx3060ti-ryzen5800x3d-desktop-2026-07-27.png`
- `assets/horizon/horizon-landscape.webp`
- `assets/horizon/iss.webp`
- `assets/horizon/milky-way-overlay.webp`
- `assets/horizon/observatory-footer.webp`
- `assets/traffic-world-map.png`

## Duplicate candidates

### Identical hashes

- `assets/home-computing-lab/homelab-rack-overview-2026-07-27.jpg`, `assets/me/IMG_20251117_171614.jpg`
- `images/nebby.png`, `nebby.png`

## Page-level estimates

| Page | Before | After | Savings | Largest |
|---|---:|---:|---:|---|
| `404.html` | 57.9 KiB | 57.9 KiB | 0 B | `assets/404-kermit-dennis.jpg` |
| `about/index.html` | 12.9 MiB | 12.9 MiB | 0 B | `assets/me/IMG_20260620_070938.jpg` |
| `blog/index.html` | 4.4 MiB | 4.4 MiB | 0 B | `avatar.png` |
| `blog/post.html` | 4.4 MiB | 4.4 MiB | 0 B | `avatar.png` |
| `blog/posts/when-tinkering-becomes-noise.html` | 4.4 MiB | 4.4 MiB | 0 B | `avatar.png` |
| `blog/posts/why-i-rolled-back-a-perfect-setup.html` | 4.4 MiB | 4.4 MiB | 0 B | `avatar.png` |
| `datenschutzerklaerung.html` | 3.5 MiB | 3.5 MiB | 0 B | `avatar.png` |
| `docs/image-optimization.md` | 3.5 MiB | 3.5 MiB | 0 B | `avatar.png` |
| `impressum.html` | 3.5 MiB | 3.5 MiB | 0 B | `avatar.png` |
| `index.html` | 7.7 MiB | 7.7 MiB | 0 B | `avatar.png` |
| `lost-administrator/index.html` | 7.7 MiB | 7.7 MiB | 0 B | `avatar.png` |
| `lost-administrator/workstation/index.html` | 926.4 KiB | 926.4 KiB | 0 B | `favicon.png` |
| `museum/apollo-dsky/index.html` | 7.7 MiB | 7.7 MiB | 0 B | `avatar.png` |
| `museum/bios-setup/index.html` | 7.7 MiB | 7.7 MiB | 0 B | `avatar.png` |
| `museum/c64/index.html` | 7.7 MiB | 7.7 MiB | 0 B | `avatar.png` |
| `museum/cryptography-lab/caesar-xor/index.html` | 7.7 MiB | 7.7 MiB | 0 B | `avatar.png` |
| `museum/cryptography-lab/caesar-xor/lab.html` | 3.3 MiB | 3.3 MiB | 0 B | `images/nebby.png` |
| `museum/cryptography-lab/enigma-machine/index.html` | 7.7 MiB | 7.7 MiB | 0 B | `avatar.png` |
| `museum/cryptography-lab/index.html` | 7.7 MiB | 7.7 MiB | 0 B | `avatar.png` |
| `museum/debian-server-experiment/index.html` | 7.7 MiB | 7.7 MiB | 0 B | `avatar.png` |
| `museum/debian-server-experiment/session/index.html` | 4.4 MiB | 4.4 MiB | 0 B | `avatar.png` |
| `museum/debian-server-experiment/statistics/index.html` | 926.4 KiB | 926.4 KiB | 0 B | `favicon.png` |
| `museum/dos-setup/index.html` | 7.7 MiB | 7.7 MiB | 0 B | `avatar.png` |
| `museum/home-computing-lab/architecture/index.html` | 7.7 MiB | 7.7 MiB | 0 B | `avatar.png` |
| `museum/home-computing-lab/cthulhu/index.html` | 22.9 MiB | 22.9 MiB | 0 B | `assets/home-computing-lab/cthulhu-fastfetch-system-snapshot-2026.png` |
| `museum/home-computing-lab/field-notes/field-note-1/index.html` | 11.4 MiB | 11.4 MiB | 0 B | `assets/home-computing-lab/field-notes/worldnode-cthulhu-terminals.png` |
| `museum/home-computing-lab/field-notes/field-note-2/index.html` | 9.5 MiB | 9.5 MiB | 0 B | `avatar.png` |
| `museum/home-computing-lab/field-notes/field-note-3/index.html` | 10.5 MiB | 10.5 MiB | 0 B | `assets/home-computing-lab/field-notes/missing-capacitor.jpg` |
| `museum/home-computing-lab/field-notes/field-note-4/index.html` | 8.0 MiB | 8.0 MiB | 0 B | `avatar.png` |
| `museum/home-computing-lab/field-notes/field-note-5/index.html` | 18.8 MiB | 18.8 MiB | 0 B | `assets/home-computing-lab/field-notes/windows98-scsi-system.jpg` |
| `museum/home-computing-lab/field-notes/field-note-6/index.html` | 8.6 MiB | 8.6 MiB | 0 B | `avatar.png` |
| `museum/home-computing-lab/field-notes/index.html` | 19.1 MiB | 19.1 MiB | 0 B | `assets/home-computing-lab/field-notes/worldnode-cthulhu-terminals.png` |
| `museum/home-computing-lab/homelab/index.html` | 9.2 MiB | 9.2 MiB | 0 B | `avatar.png` |
| `museum/home-computing-lab/icq/index.html` | 7.7 MiB | 7.7 MiB | 0 B | `avatar.png` |
| `museum/home-computing-lab/index.html` | 7.7 MiB | 7.7 MiB | 0 B | `avatar.png` |
| `museum/home-computing-lab/network/index.html` | 7.7 MiB | 7.7 MiB | 0 B | `avatar.png` |
| `museum/home-computing-lab/retro-pc/index.html` | 8.1 MiB | 8.1 MiB | 0 B | `avatar.png` |
| `museum/home-computing-lab/storage/index.html` | 7.7 MiB | 7.7 MiB | 0 B | `avatar.png` |
| `museum/home-computing-lab/workstations/index.html` | 7.7 MiB | 7.7 MiB | 0 B | `avatar.png` |
| `museum/home-computing-lab/worldnode/index.html` | 9.1 MiB | 9.1 MiB | 0 B | `avatar.png` |
| `museum/ibm-pc-xt/index.html` | 7.7 MiB | 7.7 MiB | 0 B | `avatar.png` |
| `museum/index.html` | 7.7 MiB | 7.7 MiB | 0 B | `avatar.png` |
| `museum/linux-game-install/index.html` | 926.4 KiB | 926.4 KiB | 0 B | `favicon.png` |
| `museum/linux-game-install/lab.html` | 926.4 KiB | 926.4 KiB | 0 B | `favicon.png` |
| `museum/linux-terminal-academy/break-it-recover/index.html` | 4.2 MiB | 4.2 MiB | 0 B | `images/nebby.png` |
| `museum/linux-terminal-academy/break-it-recover/lab.html` | 926.4 KiB | 926.4 KiB | 0 B | `favicon.png` |
| `museum/linux-terminal-academy/certificate.html` | 926.4 KiB | 926.4 KiB | 0 B | `favicon.png` |
| `museum/linux-terminal-academy/files-directories/index.html` | 4.2 MiB | 4.2 MiB | 0 B | `images/nebby.png` |
| `museum/linux-terminal-academy/files-directories/lab.html` | 926.4 KiB | 926.4 KiB | 0 B | `favicon.png` |
| `museum/linux-terminal-academy/filesystem-explorer/index.html` | 4.2 MiB | 4.2 MiB | 0 B | `images/nebby.png` |
| `museum/linux-terminal-academy/filesystem-explorer/lab.html` | 926.4 KiB | 926.4 KiB | 0 B | `favicon.png` |
| `museum/linux-terminal-academy/index.html` | 7.7 MiB | 7.7 MiB | 0 B | `avatar.png` |
| `museum/linux-terminal-academy/permissions-users/index.html` | 4.2 MiB | 4.2 MiB | 0 B | `images/nebby.png` |
| `museum/linux-terminal-academy/permissions-users/lab.html` | 926.4 KiB | 926.4 KiB | 0 B | `favicon.png` |
| `museum/linux-terminal-academy/pipes-shell-power/index.html` | 4.2 MiB | 4.2 MiB | 0 B | `images/nebby.png` |
| `museum/linux-terminal-academy/pipes-shell-power/lab.html` | 926.4 KiB | 926.4 KiB | 0 B | `favicon.png` |
| `museum/linux-terminal-academy/process-control/index.html` | 4.2 MiB | 4.2 MiB | 0 B | `images/nebby.png` |
| `museum/linux-terminal-academy/process-control/lab.html` | 926.4 KiB | 926.4 KiB | 0 B | `favicon.png` |
| `museum/linux-terminal-academy/system-admin-crash-lab/index.html` | 926.4 KiB | 926.4 KiB | 0 B | `favicon.png` |
| `museum/linux-terminal-academy/system-admin-crash-lab/lab.html` | 926.4 KiB | 926.4 KiB | 0 B | `favicon.png` |
| `museum/linux-terminal-academy/terminal-first-steps/index.html` | 4.2 MiB | 4.2 MiB | 0 B | `images/nebby.png` |
| `museum/linux-terminal-academy/terminal-first-steps/lab.html` | 926.4 KiB | 926.4 KiB | 0 B | `favicon.png` |
| `museum/malware-history/boot-sector-viewer/index.html` | 926.4 KiB | 926.4 KiB | 0 B | `favicon.png` |
| `museum/malware-history/defense-lab-experience/index.html` | 926.4 KiB | 926.4 KiB | 0 B | `favicon.png` |
| `museum/malware-history/defense-lab/index.html` | 4.2 MiB | 4.2 MiB | 0 B | `images/nebby.png` |
| `museum/malware-history/dos-virus-era/index.html` | 4.2 MiB | 4.2 MiB | 0 B | `images/nebby.png` |
| `museum/malware-history/early-experiments/index.html` | 4.2 MiB | 4.2 MiB | 0 B | `images/nebby.png` |
| `museum/malware-history/email-social-engineering/index.html` | 4.2 MiB | 4.2 MiB | 0 B | `images/nebby.png` |
| `museum/malware-history/file-infection-visualizer/index.html` | 926.4 KiB | 926.4 KiB | 0 B | `favicon.png` |
| `museum/malware-history/floppy-era/index.html` | 4.2 MiB | 4.2 MiB | 0 B | `images/nebby.png` |
| `museum/malware-history/index.html` | 7.7 MiB | 7.7 MiB | 0 B | `avatar.png` |
| `museum/malware-history/internet-worms/index.html` | 4.2 MiB | 4.2 MiB | 0 B | `images/nebby.png` |
| `museum/malware-history/love-letter-incident/index.html` | 4.2 MiB | 4.2 MiB | 0 B | `images/nebby.png` |
| `museum/malware-history/macro-viruses/index.html` | 4.2 MiB | 4.2 MiB | 0 B | `images/nebby.png` |
| `museum/malware-history/modern-malware/index.html` | 4.2 MiB | 4.2 MiB | 0 B | `images/nebby.png` |
| `museum/malware-history/ransomware-concept-demo/index.html` | 926.4 KiB | 926.4 KiB | 0 B | `favicon.png` |
| `museum/malware-history/trojans-botnets/index.html` | 4.2 MiB | 4.2 MiB | 0 B | `images/nebby.png` |
| `museum/malware-history/virtual-floppy-infection/index.html` | 926.4 KiB | 926.4 KiB | 0 B | `favicon.png` |
| `museum/malware-history/virus-scanner-lab/index.html` | 926.4 KiB | 926.4 KiB | 0 B | `favicon.png` |
| `museum/malware-history/worm-propagation-map/index.html` | 926.4 KiB | 926.4 KiB | 0 B | `favicon.png` |
| `museum/modem-lab/index.html` | 7.7 MiB | 7.7 MiB | 0 B | `avatar.png` |
| `museum/telephone-exchange/index.html` | 3.3 MiB | 3.3 MiB | 0 B | `images/nebby.png` |
| `museum/wopr/index.html` | 7.7 MiB | 7.7 MiB | 0 B | `avatar.png` |
| `news.html` | 7.7 MiB | 7.7 MiB | 0 B | `avatar.png` |
| `tests/about-language-switch.test.mjs` | 3.0 MiB | 3.0 MiB | 0 B | `assets/me/kinderschuetzenkoenig-1997.jpg` |
| `traffic.html` | 9.5 MiB | 9.5 MiB | 0 B | `avatar.png` |
| `transmissions/index.html` | 4.4 MiB | 4.4 MiB | 0 B | `avatar.png` |
| `wopr/dashboard/index.html` | 926.4 KiB | 926.4 KiB | 0 B | `favicon.png` |
| `wopr/dashboard/security/index.html` | 926.4 KiB | 926.4 KiB | 0 B | `favicon.png` |
| `wopr/index.html` | 4.4 MiB | 4.4 MiB | 0 B | `avatar.png` |
| `wordpress-nope.html` | 89.8 KiB | 89.8 KiB | 0 B | `assets/wordpress-kant-hochkant.jpg` |
| `world-observer.html` | 7.7 MiB | 7.7 MiB | 0 B | `avatar.png` |
| `world-observer/earthquake-observer.html` | 7.7 MiB | 7.7 MiB | 0 B | `avatar.png` |
| `world-observer/east-frisia-water.html` | 7.7 MiB | 7.7 MiB | 0 B | `avatar.png` |
| `world-observer/environment.html` | 7.7 MiB | 7.7 MiB | 0 B | `avatar.png` |
| `world-observer/geomagnetic-storm-observer.html` | 10.3 MiB | 10.3 MiB | 0 B | `assets/geomagnetic-magnetosphere.png` |
| `world-observer/hometown.html` | 7.7 MiB | 7.7 MiB | 0 B | `avatar.png` |
| `world-observer/horizon-observer.html` | 10.3 MiB | 10.3 MiB | 0 B | `assets/horizon/horizon-landscape.webp` |
| `world-observer/index.html` | 7.7 MiB | 7.7 MiB | 0 B | `avatar.png` |
| `world-observer/internet.html` | 7.7 MiB | 7.7 MiB | 0 B | `avatar.png` |
| `world-observer/media.html` | 7.7 MiB | 7.7 MiB | 0 B | `avatar.png` |
| `world-observer/ocean-buoy-observer.html` | 7.7 MiB | 7.7 MiB | 0 B | `avatar.png` |
| `world-observer/society.html` | 7.7 MiB | 7.7 MiB | 0 B | `avatar.png` |
| `world-observer/technology.html` | 7.7 MiB | 7.7 MiB | 0 B | `avatar.png` |
| `world-observer/technology/arch-package-count.html` | 7.7 MiB | 7.7 MiB | 0 B | `avatar.png` |
| `world-observer/technology/debian-package-count.html` | 7.7 MiB | 7.7 MiB | 0 B | `avatar.png` |
| `world-observer/time-observer.html` | 4.2 MiB | 4.2 MiB | 0 B | `images/nebby.png` |
| `world-observer/wiesmoor-peatland.html` | 7.7 MiB | 7.7 MiB | 0 B | `avatar.png` |
| `world-observer/wiesmoor-sky.html` | 7.7 MiB | 7.7 MiB | 0 B | `avatar.png` |
| `world-observer/wiesmoor-weather.html` | 7.7 MiB | 7.7 MiB | 0 B | `avatar.png` |
| `world-observer/wiesmoor.html` | 39.1 MiB | 39.1 MiB | 0 B | `assets/wiesmoor/1783513449100.jpg` |
