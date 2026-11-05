# Linux deep dives — publication report

Date: 5 November 2026. Repository: `dennishilk/dennishilk.github.io`, branch `main`.

Six complete editions use the existing Linux News & Security category and its canonical fragments/build process. No Worldnode access or deployment; the separate backend repository was not changed.

## Articles

| Language | Title | URL | Words |
| --- | --- | --- | ---: |
| en | APT Vulnerability CVE-2026-109518: Check and Update Debian & Ubuntu | https://www.dennishilk.com/blog/apt-cve-2026-109518/ | 2,121 |
| de | APT-Sicherheitslücke CVE-2026-109518: Debian und Ubuntu sicher aktualisieren | https://www.dennishilk.com/de/blog/apt-cve-2026-109518/ | 1,995 |
| en | 948 Linux Kernel Vulnerabilities Found by AI: What Was Counted | https://www.dennishilk.com/blog/ai-linux-kernel-948-vulnerabilities/ | 2,498 |
| de | 948 Linux-Kernel-Schwachstellen durch KI: Was die Untersuchung zeigt | https://www.dennishilk.com/de/blog/ki-linux-kernel-948-schwachstellen/ | 2,183 |
| en | KDE Plasma 6.8 Without an X11 Session: What XWayland Preserves | https://www.dennishilk.com/blog/kde-plasma-6-8-wayland-x11-xwayland/ | 2,362 |
| de | KDE Plasma 6.8 ohne X11-Sitzung: Was mit XWayland weiter funktioniert | https://www.dennishilk.com/de/blog/kde-plasma-6-8-wayland-x11-xwayland/ | 2,077 |

## Features and integration

- APT: original trust-boundary diagram, release-specific package table, local reference selector, checklist progress/reset, diagnostic commands and documented retry mitigation. The guide does not inspect systems or produce a safety badge.
- Kernel: original process graphic and numeric ledger distinguish target, candidate, reproduced finding, exploit artifact and patch-group counts; status vocabulary separates reports, staging, merges, public exploits and installed updates. Costs and bounty comparisons have explicit denominators and limits.
- KDE: native Wayland and XWayland paths, distribution package snapshot, compatibility matrix, portal/driver references and five workflow-specific readiness guides.
- Twelve localized responsive SVGs and six 1200×630 social PNGs; original asset generator. No external runtime dependencies or trackers.
- Existing typography, table layout, author/date/reading-time treatment, desktop/mobile contents, reciprocal DE/EN switches, canonical/hreflang, BlogPosting/BreadcrumbList, social metadata, index counts, RSS and sitemap integration.
- Shared news heading wrapping prevents long German headlines overflowing a 320px viewport.

## Validation actually run

- `npm run build:linux-deep-dives:visuals` — 12 SVGs and 6 social PNGs authored successfully.
- `npm run build:linux-news` — six editions plus the pre-existing category rebuilt; both feeds contain 55 entries.
- `npm run sync:seo` — executed; unrelated formatting-only output discarded to keep this publication scoped. Normal `--sitemaps-only` build integration retained.
- `npm run test:linux-news` — 38 passed, including deterministic regeneration and local links/assets/fragments.
- `node --test tests/blog-rss.test.mjs tests/sitemaps.test.mjs tests/seo-localization.test.mjs tests/seo-sitemap-generator.test.mjs tests/linux-deep-dives.test.mjs` — 42 passed, including 14 new deep-dive checks.
- `npm run test:seo` — 1,067 indexable pages / 1,067 unique sitemap URLs; zero validation errors, canonical mismatches, broken hreflang pairs or broken crawlable internal links.
- `npm run test:linux-news:browser` — Chromium 141.0.7390.37: 84 article views and 14 index views at widths 320, 390, 650, 768, 1024, 1440 and 2048. Hero images decoded, mobile/desktop contents, sticky-header clearance, reciprocal language switches and category cards passed.
- Browser interactions additionally covered keyboard copy with exact clipboard contents, clipboard-denial fallback, all APT reference choices, keyboard checkboxes, progress/reset, all five Wayland choices, restoration of the full guide and all six editions with JavaScript disabled.
- Desktop/mobile screenshots were manually reviewed in both languages. Browser text bounds stayed inside all twelve SVG viewBoxes.
- HTML5 parsing with isolated parse5 tooling: all six pages had zero parse errors. JavaScript syntax checks and `git diff --check` passed.
- The existing GitHub browser-QA workflow now runs the static news and deep-dive checks before its browser suite.

Local browser provisioning used a compatible downloaded headless Chromium because the runtime-default browser download returned an incomplete archive. No test dependency was added to the published site.

## Primary evidence and limitations

The dated fact record is [`content/linux-news/november-2026.evidence.json`](../content/linux-news/november-2026.evidence.json). Article bodies link evidence next to claims. Main sources:

- Debian DSA-6607-1, DLA-4880-1, the APT team advisory and Debian security tracker; Ubuntu CVE tracker and remediation bulletin.
- OpenAI’s 4 November report; upstream KASAN, kernel CVE and security-reporting documentation; official kernelCTF rules and Docker isolation documentation.
- KDE’s 14 October release and 2 June developer explanation; Wayland architecture/XWayland documentation; XDG portal references; official distribution package pages; version-scoped NVIDIA documentation.

Research counts are attributed claims, not independently reproduced exploits. Repository package snapshots do not establish the state of any visitor’s installation. No vulnerability reproduction, hardware compatibility certification, Cthulhu benchmark or production update was performed. The guide components have no network/persistence APIs.

The Debian DLA mailing-list page initially returned 403; its official indexed message and tracker corroborated date and version. The KDE NVIDIA wiki returned 403 and the Wayland book page timed out; their official indexed entries identified the sources. Accessible NVIDIA versioned documentation and Wayland architecture documentation supply additional direct references. These retrieval boundaries are recorded in the evidence file.

## Source URLs

- https://lists.debian.org/debian-security-announce/2026/msg00526.html
- https://security-tracker.debian.org/tracker/CVE-2026-109518
- https://lists.debian.org/deity/2026/11/msg00005.html
- https://lists.debian.org/debian-lts-announce/2026/11/msg00004.html
- https://ubuntu.com/blog/apt-vulnerability-fixes-available
- https://ubuntu.com/security/CVE-2026-109518
- https://manpages.debian.org/trixie/apt/apt-secure.8.en.html
- https://manpages.debian.org/trixie/apt/apt.conf.5.en.html
- https://manpages.debian.org/trixie/apt/apt.8.en.html
- https://manpages.debian.org/trixie/apt/apt-cache.8.en.html
- https://manpages.debian.org/trixie/dpkg/dpkg.1.en.html
- https://openai.com/index/a-thousand-fewer-paths-to-root/
- https://docs.kernel.org/dev-tools/kasan.html
- https://docs.kernel.org/process/security-bugs.html
- https://docs.kernel.org/process/cve.html
- https://google.github.io/security-research/kernelctf/rules.html
- https://docs.docker.com/engine/security/
- https://kde.org/announcements/plasma/6/6.8.0/
- https://planet.kde.org/david-edmundson-2026-06-02-ex-11-prepping-for-plasmas-last-x11-supported-release/
- https://wayland.freedesktop.org/architecture.html
- https://wayland.freedesktop.org/docs/book/Xwayland.html
- https://flatpak.github.io/xdg-desktop-portal/docs/doc-org.freedesktop.portal.ScreenCast.html
- https://flatpak.github.io/xdg-desktop-portal/docs/doc-org.freedesktop.portal.RemoteDesktop.html
- https://flatpak.github.io/xdg-desktop-portal/docs/doc-org.freedesktop.portal.GlobalShortcuts.html
- https://packages.debian.org/trixie/plasma-desktop
- https://packages.ubuntu.com/plasma-desktop
- https://archlinux.org/packages/extra/x86_64/plasma-desktop/
- https://packages.fedoraproject.org/pkgs/plasma-desktop/plasma-desktop/
- https://community.kde.org/Plasma/Wayland/Nvidia
- https://download.nvidia.com/XFree86/Linux-x86_64/580.178.04/README/wayland-issues.html

## Changed files

Complete manifest for this publication.

- `.github/workflows/linux-news-browser.yml`
- `assets/blog/linux-news/ai-linux-kernel-948-de-mobile.svg`
- `assets/blog/linux-news/ai-linux-kernel-948-de.svg`
- `assets/blog/linux-news/ai-linux-kernel-948-en-mobile.svg`
- `assets/blog/linux-news/ai-linux-kernel-948-en.svg`
- `assets/blog/linux-news/ai-linux-kernel-948-social-de.png`
- `assets/blog/linux-news/ai-linux-kernel-948-social-en.png`
- `assets/blog/linux-news/apt-cve-2026-109518-de-mobile.svg`
- `assets/blog/linux-news/apt-cve-2026-109518-de.svg`
- `assets/blog/linux-news/apt-cve-2026-109518-en-mobile.svg`
- `assets/blog/linux-news/apt-cve-2026-109518-en.svg`
- `assets/blog/linux-news/apt-cve-2026-109518-social-de.png`
- `assets/blog/linux-news/apt-cve-2026-109518-social-en.png`
- `assets/blog/linux-news/deep-dives.css`
- `assets/blog/linux-news/deep-dives.js`
- `assets/blog/linux-news/news.css`
- `assets/blog/linux-news/plasma-68-wayland-de-mobile.svg`
- `assets/blog/linux-news/plasma-68-wayland-de.svg`
- `assets/blog/linux-news/plasma-68-wayland-en-mobile.svg`
- `assets/blog/linux-news/plasma-68-wayland-en.svg`
- `assets/blog/linux-news/plasma-68-wayland-social-de.png`
- `assets/blog/linux-news/plasma-68-wayland-social-en.png`
- `blog/ai-linux-kernel-948-vulnerabilities/index.html`
- `blog/apt-cve-2026-109518/index.html`
- `blog/feed.xml`
- `blog/index.html`
- `blog/kde-plasma-6-8-wayland-x11-xwayland/index.html`
- `content/linux-news/README.md`
- `content/linux-news/ai-linux-kernel-948.de.fragment`
- `content/linux-news/ai-linux-kernel-948.en.fragment`
- `content/linux-news/apt-cve-2026-109518.de.fragment`
- `content/linux-news/apt-cve-2026-109518.en.fragment`
- `content/linux-news/articles.json`
- `content/linux-news/november-2026.evidence.json`
- `content/linux-news/plasma-68-wayland.de.fragment`
- `content/linux-news/plasma-68-wayland.en.fragment`
- `de/blog/apt-cve-2026-109518/index.html`
- `de/blog/feed.xml`
- `de/blog/index.html`
- `de/blog/kde-plasma-6-8-wayland-x11-xwayland/index.html`
- `de/blog/ki-linux-kernel-948-schwachstellen/index.html`
- `docs/linux-news-2026-11-05-publication.md`
- `package.json`
- `scripts/build-linux-deep-dive-visuals.mjs`
- `scripts/test-linux-news-browser.mjs`
- `sitemap-blog.xml`
- `tests/linux-deep-dives.test.mjs`
- `tests/linux-news.test.mjs`

## Manual production pull

After reviewing the publication commit, Dennis deploys manually:

```bash
git -C /srv/www/dennishilk.github.io pull --ff-only origin main
```
