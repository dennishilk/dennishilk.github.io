# Linux Audio Rescue — editorial and implementation record

Published to the website repository on 27 October 2026. Worldnode deployment is intentionally left to Dennis.

## Published routes

- German: https://www.dennishilk.com/de/blog/linux-audio-fehler-beheben/
- English: https://www.dennishilk.com/blog/linux-audio-troubleshooting/

The article has 21 equivalent sections in each language. Generated reading metadata counts approximately 4,554 German and 5,396 English words, including the command interpretations and source list. No keyword volume, ranking, measured receiver delay or reproduced hardware repair is claimed.

## Assistant and shared content

Fourteen symptom entries feed a directed acyclic graph with 32 checks and 29 possible outcome states (61 nodes). There are 495 distinct complete answer paths from the symptom entries, plus a clearly labeled incomplete-evidence exit available at every question. Outcome is deliberately not called a confirmed diagnosis or successful repair.

The existing twelve `content/linux-fix-lab/audio.json` records remain authoritative for detailed existing diagnostics, causes, solutions, precautions and rollback. `content/linux-audio-rescue/flow.mjs` contains navigation and additional symptom questions, referencing semantic Lab IDs. `scripts/build-linux-audio-rescue.mjs` validates references, detects cycles/missing/unreachable nodes, resolves shared records and renders the embedded data. Do not hand-edit the generated article fragments, lead fragments or pages.

Build with `npm run build:audio-rescue`. `npm run build:linux-news` also refreshes the audio article and embedded Lab records before rebuilding the localized category, RSS and sitemaps. After changing the shared audio records, run one of these builds as well as the Lab build. No runtime fetch, log parser, upload, storage or shell execution exists in the assistant. It uses native buttons, details and checkbox controls, moves focus to each new question, exposes live status, keeps a visible answer history and supports Back, reset, native history and direct `#audio-NODE` links. Language switching retains the current audio node. Expert mode exposes additional shared Lab diagnostics at the outcome; beginners still receive the complete article and step-specific interpretations.

The articles remain fully readable without JavaScript. The assistant explicitly explains the script requirement. Clipboard failure leaves selectable command text and a manual-copy instruction.

## Original visual assets

`python scripts/build-linux-audio-visuals.py` creates four diagrams, each in DE/EN and desktop/mobile layouts (16 SVG files), and two 1200×630 PNG social previews:

1. Architecture: audio transport is solid; WirePlumber policy is dashed and outside the serial transport path. BlueZ is a separate branch.
2. Failure layers: application, server connection, policy, ALSA/kernel and the physical link.
3. S/PDIF silence timeline: explicitly illustrative, without measured durations.
4. Main diagnostic decisions: a summary of the richer interactive graph.

No stock photography or fabricated terminal evidence is used. The existing dark blog shell, navigation, typography and category order are retained. New category cards are inserted without moving existing cards. No historical article publication dates are changed.

## Verification commands

```sh
npm run build:audio-rescue
node --test tests/linux-audio-rescue.test.mjs tests/linux-news.test.mjs tests/blog-rss.test.mjs tests/linux-fix-lab*.test.mjs tests/seo-sitemap-generator.test.mjs
node scripts/audit-seo.mjs
npm run test:audio-rescue:browser
npm run test:linux-news:browser -- --audio-only
```

The browser test supports a normal Playwright Chromium installation, or `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` for an existing compatible executable. The test environment used Chromium 153.0.8010.0 through the installed Playwright runtime. The default Playwright download returned an invalid archive; an npm-packaged Chromium binary was extracted locally instead. No browser dependency or binary is added to the website.

Automated checks cover the full graph in both languages, actual UI traversal and backtracking of all complete answer paths, every uncertainty exit, clipboard operations, expert mode, keyboard activation, accessible roles/focus, mobile state rendering, image decoding, reciprocal language links, no-JavaScript prose, metadata/feeds/sitemaps, source syntax and shared-Lab identity. Widths: 320, 390, 650, 768, 1024, 1440 and 2048 px. No external requests are allowed in the browser test. A visual screenshot review supplements programmatic checks; it is not a formal screen-reader user study or WCAG certification.

The narrow Lab inbound-link allowlist is extended only for the two explicitly requested new audio articles. A previous release test encoded the original launch's restricted inbound-link policy; unrelated pages remain covered by that policy.

## Research record and limits

The guide was checked against upstream documentation and distribution manifests on 27 October 2026. Retrieved upstream documentation identifies PipeWire 1.6.10 and WirePlumber 0.5.18; this describes the retrieved documentation, not a universal installed version or latest-stable guarantee. Debian and Ubuntu manifests show why installed versions and distro-specific package names matter. Fedora's generic troubleshooting page and direct ArchWiki access encountered an access challenge; Fedora package facts were checked against its package catalog, and Arch reference statements against indexed official distribution documentation. Neither blocked full page is presented as a hardware test.

Primary source families, linked alongside relevant article text and in its source list:

- PipeWire `pipewire(1)`, `pipewire-props(7)`, `pw-top(1)`, `pw-cli(1)` and `pw-dump(1)` on https://docs.pipewire.org/
- WirePlumber `wpctl`, components, ALSA rules, Bluetooth, settings, fragments and 0.4→0.5 migration on https://pipewire.pages.freedesktop.org/wireplumber/
- systemd `systemctl` and `pam_systemd` on https://www.freedesktop.org/software/systemd/man/latest/
- Linux HD-Audio notes: https://docs.kernel.org/sound/hd-audio/notes.html
- ALSA capture/mixer guidance: https://www.alsa-project.org/wiki/SoundcardTesting
- Debian manuals for aplay/arecord, amixer and bluetoothctl: https://manpages.debian.org/trixie/
- Kernel USB clock and HDMI ELD implementation, linked by the shared Lab records: https://github.com/torvalds/linux/tree/master/sound/
- Flatpak sandbox permissions: https://docs.flatpak.org/en/latest/sandbox-permissions.html
- Debian 13 desktop package set: https://packages.debian.org/trixie/pipewire-audio
- Ubuntu package manifests: https://packages.ubuntu.com/source/noble-updates/wireplumber and https://packages.ubuntu.com/en/stonking/video/wireplumber
- Fedora PulseAudio replacement: https://packages.fedoraproject.org/pkgs/pipewire/pipewire-pulseaudio/

There is no physical PipeWire/ALSA/Bluetooth/S/PDIF test rig in this environment. Shell examples receive syntax checks and documentation review; audio commands and repairs are not executed on Dennis's machines. The targeted SPA-JSON fragment follows documented 0.5 syntax, with an exact node-name placeholder and a specific rollback; it is not claimed to have repaired a real receiver here. No universal kernel parameter, package replacement, power-saving disable or global configuration reset is prescribed.

## SPDIF-Fix review

Read-only source review at `e30e94ce3dce656360ce05472f6c735a4e7f6b41`:
https://github.com/dennishilk/spdif-fix/tree/e30e94ce3dce656360ce05472f6c735a4e7f6b41

The existing bilingual companion article already accurately discusses most limitations, so it is linked without being rewritten or redated. The separate repository remains unchanged. No menu repair was executed.

Possible future improvements, requiring a separate scoped task:

- Detect installed server/session/version explicitly rather than assuming process existence establishes the stack.
- Use an exact, device-specific WirePlumber 0.5 fragment; maintain 0.4 Lua separately if still supported.
- Add a dry run, unique backups and a manifest of files actually created or changed.
- Never remove an existing `.asoundrc` without ownership/provenance and a restorable backup.
- Explain that a PCM definition does not generate a keepalive stream.
- Give the SoX process an explicit target and managed lifecycle instead of relying on a three-second startup delay.
- Distinguish node suspend, ALSA-device closure, digital zero samples and receiver reacquisition.
- Exclude encoded passthrough from mixed PCM keepalive tests and verify the receiver's real behavior.

## Deployment boundary

Only `dennishilk/dennishilk.github.io`, branch `main`, is changed. No feature branch, PR, server SSH session, Worldnode deployment or SPDIF-Fix repository mutation is part of this work. The production article URLs become available after Dennis performs his normal production pull.

## Final results

- 700 automated Node tests passed (Audio Rescue, existing news, RSS, all Fix Lab suites and sitemap generation).
- The Audio Rescue Chromium test passed 495 complete paths in each language, 64 uncertainty exits and 120 clipboard checks. It checked 14 initial responsive views and all 61 states at 320 px in each language (122 state views), plus keyboard/focus, native back/forward, expert mode and no-JavaScript prose. No page errors, failed local responses or external requests were recorded.
- The existing news browser harness, scoped to both new audio articles, passed 14 article views, 14 blog-index views, image decoding, mobile/desktop TOCs, sticky-header clearance, reciprocal language switching and category-card navigation.
- The full existing news browser harness also exposed an unrelated pre-existing 320 px overflow in the German nginx article: document width 331 px. Its generated HTML, shared blog CSS and nginx CSS are byte-identical to the baseline. These unrelated production files were not changed. This pre-existing full-suite browser failure remains a known limitation; the scoped audio checks and all 700 Node checks pass.
- The complete SEO audit reports zero validation errors, broken crawlable links, hreflang failures, canonical mismatches, duplicate title groups or missing alt attributes. RSS check reports 50 articles per language.
- Screenshot review covered desktop/mobile entry layout and original diagrams. Long German outcome text now wraps at 320 px. Article fragment navigation is kept separate from the assistant's `#audio-` routes, avoiding collisions such as `#services`.

Machine-readable results accompany this record in `browser-results.json` and `publication-browser-results.json`. Screenshots are local QA intermediates rather than fictional evidence of Linux audio operation.
