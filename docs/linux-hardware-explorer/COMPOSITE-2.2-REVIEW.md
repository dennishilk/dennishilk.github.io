# Linux Hardware Explorer 2.2 — BRIO USB composite review

Input: Cthulhu Logitech BRIO Ultra HD USB 046d:085e, bus 006 device 003. Reported interfaces 0–2: Video/uvcvideo; 3–4: Audio/snd-usb-audio; 5: HID/usbhid. These are user-supplied binding observations, not operational certification.

The pinned Debian 6.12.107+deb13-amd64 index matches usbhid with class 03 alone. Generic uvcvideo entries require class 0e plus subclass 01 and protocol 00/01. Generic snd_usb_audio entries require class 01 plus subclass 01 or 03. lsusb -t supplies only class labels, so absent qualifiers are not invented. Index provenance and hashes remain in kernel-index/manifest.json.

Changes are limited to topology labels, Video class context, separate binding-status presentation, and a concise grouped overview. The detailed interface evidence remains available. Candidate matching still uses the unchanged fixed index URLs, no user-input-dependent requests.

Local checks: 19 existing 2.1 tests and 9 new BRIO tests passed. Full repository test suites and real browser rendering not available without a complete checkout. No server configuration or deployment changes.
