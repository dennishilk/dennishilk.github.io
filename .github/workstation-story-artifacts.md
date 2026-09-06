# Michael workstation story-artifact manifest

This file is developer-facing. The final English EPUB is authoritative; the canon audit is the correction layer and the workstation hints are implementation guidance only.

| Path / ID | Fact encoded | Source | Chapter / section | Day-Zero basis |
|---|---|---|---|---|
| startup and immutable state identity | Debian 13; `m.weber@workstation`; `tty1`; exact last-login and frozen time | Final English EPUB; canon audit | Chapters 1, 3; identity and timeline corrections | The preserved session is the Day-Zero workstation itself. |
| `EMMA0731` | Emma asks about the printer cartridge at 10:42 EDT | Final English EPUB | Chapter 1 | Message was received before the freeze. |
| `EMMA0731R1` | Michael gives the cabinet instructions and says 3:05 pickup | Final English EPUB | Chapter 1 | Reply was sent before the freeze. |
| `EMMA0731R2` | Emma thanks him and sends the Major Tom line | Final English EPUB | Chapter 1 | Reply was received before the freeze. |
| `~/Mail/EMMA/README` | Emma archive has hundreds of messages and is approximately 4.8 GB; only the approved thread is browsable | Final English EPUB; workstation hints | Chapter 1; hints §3 | Archive metadata and the existing approved thread predate the freeze. |
| `~/Calendar/2026-07-31-pick-up-emma.ics` | Pick up Emma at 3:05 | Final English EPUB | Chapters 1, 3 | It is a same-day obligation known before the freeze. |
| `~/Notes/home.todo` | 3:05 Emma pickup reminder | Final English EPUB; workstation hints | Chapter 1; hints §3 | Restrained representation of the established obligation. |
| `~/Projects/major-tom/README` | Emma and Chloe have printable Major Tom pages; files are not on this workstation | Final English EPUB; workstation hints | Chapter 1; hints §3 | The email establishes the pages before the freeze; the README adds no project content. |
| `~/Notes/work/2026-07-31.txt` | Backup verification, parser correction, defective customer drive intake, and archive-notice closure | Final English EPUB; canon audit; workstation hints | Chapters 1, 3; hints §§6–8 | Minimal same-day status note with no invented customer, ticket, tool, host, code, or result. |
| `/var/log/chesapeake/backup-verification.log` | Scheduled backup verification completed successfully | Final English EPUB; canon audit; workstation hints | Chapters 1, 3; hints §5 | Restrained automatic Day-Zero log, already present at freeze. |
| `/var/log/auth.log` | `m.weber` login on `tty1` at 13:41:26 EDT | Final English EPUB; canon audit | Chapters 1, 3, 10 | Automatic local login record predates the freeze. |
| `/var/log/kern.log` | One device automatically enumerated as mass storage and vendor-specific serial, attaching `ttyUSB0` | Final English EPUB; canon audit; workstation hints | Chapters 10–11; hints §20 | Raw kernel state already existed on Day Zero; no later interpretation is included. |

Explicit exclusions: the drawer USB, persistent `TAG_SERVICE`, reconstructed `linkdiag` history, C.M.T.A. archive ghost, T43 material, Emma's T480, Steve's workstation, police/vehicle/phone/financial evidence, later interviews, later USB identification, and any post-disappearance conclusions.
