# RAYMOSAIC 06 — 666 Mirrors for the Love ❤️

**Repositories:** `dennishilk/raymosaic` (canonical), `dennishilk/dennishilk.github.io` (static generated copy).  
**Routes:** `/lab/raymosaic/` · `/de/lab/raymosaic/`

## New functions

- Genuine **37×18 = 666** individually oriented facets alongside legacy **28×16 = 448** Classic mirrors.
- Multiline editor up to **400 Unicode graphemes**, complete text preview, character counter and word/sentence-aware splitting. Legacy 13-character names remain one optical scene.
- Optical text mirror checkbox. It changes sampled target coordinates **before** computing per-facet normals and does not fake reflection with a text overlay or post-processing flip.
- Scene cards, previous/next/pause playback, real mirror reorientation and full-message GIF export. Duration auto-extends, with explicit pixel-budget warnings on very large/high-resolution exports. Existing GIF export design, clean background and optional signature preserved.
- Version-1 project extension: `mirrorCount`, `mirrorText`, `sceneIndex`, long `text`; original files and URL fragments default to classic 448 geometry and unmirrored text. JSON files include per-facet normals.
- PNG contains **only the currently selected scene**, named accordingly.
- Accessible bilingual ⓘ **How it works** modal centered in the desktop footer; on smaller screens it uses a compact separate row.

## Validation

- Canonical optics/format/sequence tests: **21 passing** (including original tests).
- Chromium and Firefox browser checks: Classic export, drawing mirroring, public/private sharing, DE/EN UI, 666 stage navigation, complete project-file/share-link roundtrip and multiline messages.
- Independent Pillow validation: an automated sample produced **17 genuinely computed scenes, 304 GIF frames, 320×320 pixels** in both Linux browsers. The beginning, quarter, half, three-quarter and end frames are distinct; the frame plan gives a hold phase to every scene. PNG, scene signatures and clean projection background validated.
- Website browser checks: both prefixed routes, GIF Worker, personal-link roundtrip, new 666 editor, physics dialog, public site links, 4 static integration tests and sitemap/RSS checks.
- Pixel-budget export limits guard memory-intensive high-resolution multi-scene GIFs. The UI warns rather than silently losing scenes.

## Manual acceptance / boundaries

These are **headless Linux browser tests**, including Android-sized viewports, **not** actual Android or iOS device tests. Dennis needs to test the new 666 settings, text editor, scene sequence, GIF and native WhatsApp handoff on his own phone. Real Safari/iOS share flow remains unverified. Emoji glyph rendering depends on locally installed fonts; all original text remains in the editor/project.

Optional 1024 mirrors were **not** added without performance data. The 666 mode is genuine and sufficient for this mission.

All code goes through `scripts/sync-raymosaic.sh`. No external scripts, remote rendering, third-party widgets, social announcements or automatic Worldnode deployment have been introduced.

## Release path

After both CI suites pass, merge each `mission-raymosaic-06` branch into its corresponding `main`. The public website repository has GitHub Pages enabled: changing `main` **may publish to Pages independently of Worldnode**. Dennis explicitly requested main merge but retains manual deployment control of Worldnode. Do not delete any old branches.
