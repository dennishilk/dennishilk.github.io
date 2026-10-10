# Linux Fix Lab — problem-search research, 10 October 2026

This is an editorial backlog, **not a claim to Google Search Console access or measured Google query volumes**. We prioritise recognizable search intent using contemporary issue reports and primary documentation, inspect the existing 150+ entries first, and add only distinct failure paths. Every new page needs EN/DE coverage, conservative commands, diagnostic interpretation, independent causes and rollback.

## Shipped problem-specific batch

| Question pattern | New canonical problem ID | Documentation |
| --- | --- | --- |
| NVIDIA driver missing after Ubuntu kernel update; module not found for booted ABI | `nvidia-module-missing-after-kernel-update` | [Ubuntu NVIDIA modules](https://ubuntu.com/server/docs/nvidia-drivers-installation/); [Ubuntu DKMS](https://ubuntu.com/desktop/docs/en/latest/how-to/graphics/build-your-own-nvidia-modules-using-the-dkms-package/) |
| Ubuntu apt packages kept back although apt is otherwise healthy | `ubuntu-apt-phased-updates-held-back` | [Ubuntu phased updates](https://documentation.ubuntu.com/server/explanation/software/about-apt-upgrade-and-phased-updates/index.html); [apt-cache policy](https://manpages.ubuntu.com/manpages/noble/man8/apt-cache.8.html) |
| Wayland screen-share dialog missing or black capture in browser / meeting app | `wayland-screen-sharing-portal-fails` | [XDG ScreenCast](https://flatpak.github.io/xdg-desktop-portal/docs/doc-org.freedesktop.portal.ScreenCast.html); [backend selection](https://flatpak.github.io/xdg-desktop-portal/docs/portals.conf.html) |
| Webcam / controller disconnects following idle, suspend or USB resume | `usb-autosuspend-resume-disconnect` | [Kernel USB power management](https://docs.kernel.org/driver-api/usb/power-management.html); [usbmon](https://docs.kernel.org/usb/usbmon.html) |

Only the first page introduces a narrowly scoped, synthetic positive/negative log signature in this batch. Held-back APT packages, missing screen sharing and USB disconnects are **not in themselves proof** of phased rollout, a portal backend defect or an autosuspend bug, respectively. Avoid classifying such generic symptoms as root causes.

## Curated, human-readable question entry points

`content/linux-fix-lab/featured-questions.json` supplies bilingual common-issue questions for the landing page. Every question has a substantive two-language short answer and points to a real, canonical Fix Lab guide. This is browseable with JavaScript disabled and deliberately has no fabricated numeric popularity signals, compatibility grades or user reviews.

## Longer-term site information architecture

The Gaming Repair Center can borrow useful browsing principles from ProtonDB **without** claiming to reproduce a crowdsourced compatibility database: title and launcher navigation; exact issue, Proton/Wine/driver versions and verification dates; distinct launch, rendering, audio, anticheat and performance facets; direct citations; and explicit status (`documented report`, `verified upstream fix`, `unconfirmed`, `not supported`). Game compatibility verdicts must not be inferred from one old ProtonDB report.

Across the main Fix Lab, keep the topical catalog primary: GPU, kernel, boot, storage, audio, network, security, desktop, packages, services, NixOS and performance. Avoid duplicated near-identical SEO pages. Separate documentation evidence from reproduced hardware fixes.

## Research queue (not yet new page commitments)

- **NVIDIA / kernel ABI:** Fedora akmods versus Ubuntu prebuilt modules and DKMS; verify distribution-specific packaging rather than merging error mechanisms
- **Modern desktops:** Wayland HDR, VRR, per-monitor scaling and portals, but only when a distinct failure signature or reproducible feature boundary can be cited
- **Connectivity:** Wi-Fi 6E/7 firmware initialization, NetworkManager, per-link DNS and AP/router regressions; never promise that an updated firmware fixes an arbitrary adapter
- **NixOS:** exact evaluation diagnostics for flake inputs, new package revisions, booted versus built generations, and declarative rollback
- **Games:** title-specific failures with game build, graphics API, runner, kernel, Mesa/NVIDIA version, anticheat boundaries and last source-check date

Weekly automated research summaries are **not** automatic code publication. Source and safety review, test generation, sitemap integration and an explicit Git workflow remain necessary before publishing.
