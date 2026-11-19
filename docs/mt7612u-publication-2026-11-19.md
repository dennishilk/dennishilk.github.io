# MT7612U bilingual practical guide — 19 November 2026

Two new complementary blog guides, using the existing Linux article builder:

- `/de/blog/mediatek-mt7612u-linux-treiber-probleme/`
- `/blog/mediatek-mt7612u-linux-driver-troubleshooting/`

The original Hardware Explorer profiles are retained. Their `practiceGuide`
relations are stored in the reviewed catalog source and rendered by the profile
builder. Both articles link back to the profiles and localized Fix Lab entries.
No Worldnode deployment is performed.

## Evidence and editorial boundaries

- Linux v4.19 `drivers/net/wireless/mediatek/mt76/Kconfig` already defines
  MT76x2U; this is historical support evidence, not a recommended kernel version.
- Linux v6.12 `mt76x2/usb.c` includes USB ID 0e8d:7612 and declares the firmware
  dependencies. An ID match does not uniquely identify a retail adapter.
- v6.12 `mt76x2.h` defines mt7662.bin and mt7662_rom_patch.bin; `usb_mcu.c`
  requests the ROM patch followed by operating firmware. The current upstream
  definitions and loader were also checked. Local module metadata/logs take
  priority for a reader's actual kernel.
- usbutils documentation supports plain `lsusb`: the requested `lsusb -nn`
  syntax was corrected and its distinction from `lspci -nn` explained.
- Debian Trixie firmware-mediatek, Bookworm firmware-misc-nonfree, Ubuntu Noble
  linux-firmware, Ubuntu Resolute/Stonking linux-firmware-mediatek, and Arch
  linux-firmware-mediatek package records were checked. Ubuntu's package search
  also lists the split package in noble-updates, so instructions are conditional
  on release, repository candidate and file ownership.
- No original hardware tests, speed results or screenshots are claimed.
  Diagnostic output is labeled illustrative and has no copy button.
- Missing tools, absent modules, failed firmware initialization, radio blocks,
  association, IP configuration and DNS are treated as separate observations.
- The source inventory is `content/linux-news/mt7612u-sources.json`; all listed
  sources are linked at the bottom of both articles.

## Validation

- 367 passing tests: Linux news/articles, Hardware Explorer suites, RSS,
  sitemap coverage and the sitemap generator.
- Hardware release checker: 851 passing tests in an isolated copy; approved
  publication, rejected invalid gate, deactivation and deterministic rebuild
  pass. 332 Hardware Explorer routes and 310 Fix Lab routes retained.
- SEO audit: 0 validation errors, broken internal links, canonical mismatches
  or broken language pairs.
- 26 copyable commands per language pass `bash -n`; JavaScript syntax and SVG
  XML validation pass. Installation commands were not executed.
- Browser QA: desktop, 768 px tablet, 390 px mobile, and 320 px narrow mobile
  layouts checked using actual iframe viewports. A table minimum-width overflow
  was found and fixed. Both narrow pages have scrollWidth equal to clientWidth.
  Diagram loading, full-size link, copy success feedback and language switch
  checked. These checks do not replace testing on physical mobile devices.
- Existing sitemap language test now compares HTML attributes independently of
  their order. Exact MT7612U routes were added to the Fix Lab inbound-link test's
  authorized diagnostic-guide allowlist.

Build with the existing `build-linux-news.mjs`,
`build-linux-hardware-explorer.mjs`, `generate-blog-rss.mjs`, and
`sync-seo.mjs --sitemaps-only` scripts. Recreate original SVG/social graphics with
`python scripts/build-mt7612u-visuals.py` (Pillow required).
