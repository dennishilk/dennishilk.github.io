# Cthulhu Dragon — publication review, 19 October 2026

Canonical configuration repository: `dennishilk/cthulhu`, directory
`WM/xmonad/nixos-kanagawa-dragon/`, revision
`dbebd7e1acca81c53dcf498a7409f9210b73d17d`.
The website's `content/cthulhu-dragon/source.json` records the exact source and hashes.

## Published content

- English: `/blog/nixos-xmonad-kanagawa-dragon/` (3,983 prose words, plus full files).
- German: `/de/blog/nixos-xmonad-kanagawa-dragon/` (3,720 prose words, plus full files).
- Both routes cover graphical Plasma preparation and installed Minimal, conservative
  home-file installation, an explicit Plasma/SDDM removal switch, TTY/startx session
  management, mouse monitor focus and drag/retiling, theme/cursor/monitor setup, complete
  Fastfetch/audio integration, rollback and practical hardware checks.
- Each language contains all 15 files, with highlighted static code, raw/GitHub links,
  optional copy controls, a two-mode contents navigation and a real screenshot.
- Existing tutorial category reused; all 46 existing article URLs per language and
  every unrelated category section retained. Blog lists, totals, RSS and sitemap updated.
- Canonical URLs, reciprocal en/de/x-default links, distinct descriptions, Open Graph,
  Twitter metadata, BlogPosting and breadcrumbs supplied through the existing architecture.

## Checks completed locally

- Canonical Cthulhu: 12 behavior tests passed. Existing backup CLI listing and shell
  syntax checks passed; backup/restore code and historical snapshots were not changed.
- Website: 45 tests passed across the new article tests, blog RSS, Linux news,
  sitemap contracts/generation and localization. Includes byte-for-byte full-code
  comparisons against all 15 SHA-256-checked snapshots in both languages.
- Complete SEO audit: 1,051 indexable URLs, zero missing or duplicate sitemap URLs,
  broken internal links, broken hreflang pairs, canonical errors or missing image alts.
- Rebuilding articles, indexes, feeds and sitemap is deterministic. The existing news
  builder remains deterministic too; the two builders preserve each other's entries.
- JavaScript syntax and git whitespace checks passed. Screenshot WebP variants were
  decoded and their real 2048×858 source dimensions verified; none is an AI substitute.

## Checks that require another environment

The local environment has no complete NixOS graphical session. A Chromium download did
not produce a usable browser, and the separate cloud browser cannot reach this local
preview server. The Playwright test therefore has not passed locally. It covers 14
responsive views, exact code copying, table-of-contents navigation, language/card
routing and no-JavaScript content when run in a browser-equipped environment.

The canonical GitHub workflow defines four pinned NixOS evaluations and Haskell
compilation for XMonad/Xmobar. It was queued at review time; no success is inferred from
its existence. The website workflow supplies reproducible browser verification and
uploads QA screenshots. Consult the workflow results for their actual status.

Physical monitor behavior, Radeon/driver compatibility, Polkit dialogs, USB mounting,
Kitty image rendering, microphone/output device selection, OBS capture and Steam games
were not tested by the publishing worker. The owner's source behavior reports and
current screenshot are attributed as such, rather than presented as a new hardware test.

## Images and licenses

Dennis supplied the current screenshot for this article. It was reviewed for visible
private data; it contains the public handle/host and hardware summary, without visible
credentials or private messages/documents. The screenshot retains third-party artwork
in context; this does not establish an MIT license for that artwork. The configuration
package contains none of the private PNG artwork or inherited age marker. Readers use
their own permitted images: first wallpaper 1.png, second 2.png; one display needs 1.png.
GTK source is fetched upstream under GPL-3.0. Kitty palette attribution and the original
MIT notice are retained in Cthulhu. The vendored build-time Marked parser retains its
full separate license.

No Worldnode access or deployment is performed. Dennis deploys from GitHub manually.
