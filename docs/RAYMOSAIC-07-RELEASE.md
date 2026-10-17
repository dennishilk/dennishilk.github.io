# RAYMOSAIC 07 — Optical OVERDRIVE ❤️🪞🚀

**Canonical:** `dennishilk/raymosaic`  
**Site copy:** `lab/raymosaic/`; German wrapper: `de/lab/raymosaic/index.html`.  
**Publishing:** GitHub only; Dennis manually deploys Worldnode.

## Implemented

1. **Adaptive GIF framing** based on *actual forward ray-wall intersections*, rather than the original target-canvas bounds. One bounding volume across every message scene keeps the viewing transform stable through physical mirror-normal transitions. Projection-only art uses a clean dark canvas, centered and enlarged with preserved proportions and protected upper/lower glow margins. Full-scene export uses a restrained fixed virtual-camera change. Square, portrait, landscape, short names, and long messages are supported. The optically generated light remains unchanged; only the camera and viewing transform are different.
2. **Live "Show scene labels" / "Beschriftungen anzeigen"** switch controls the three original source/wall/array labels in the normal 3D view. Light rays, the mirror inspector, and physical calculations remain independent. Default true in both new and legacy projects; projects and compressed share links preserve the setting.
3. Exactly **448 Classic (28×16)**, **666 DOOM of Love ❤️ (37×18)**, and **1337 OVERDRIVE 🚀**. The last uses a balanced 51×27 array with 40 intentionally unused perimeter positions, yielding *exactly 1337* independently aimed reflectors with IDs 0–1336. No 1024 selectable mode. Switching density preserves entered text or drawn artwork. A brief nonblocking terminal Easter egg is shown once per page session and respects reduced-motion.
4. OVERDRIVE live redraws use a less aggressive frame budget when needed; no optical facets are dropped. The unchanged browser GIF Worker remains cancellable. Existing multi-scene, PNG, native/social share and physics explanation implementations are preserved.

## Verified optical and browser tests

- **25/25 Node tests** pass for optical normals, independent 448/666/1337 forward reconstruction, format-v1 compatibility and link roundtrips, and the fixed framed geometry across multi-segment messages.
- Browser regression passes in **desktop Linux Chromium and Firefox**, including 448/666/1337, scene labels, Easter egg, private projects, URLs, public sharing, cancel, multilingual controls, and Android-size portrait/landscape emulations.
- Exported **1337-facet** GIFs were independently decoded with Pillow: square projection, complete scene, and multi-scene love message in both browsers, plus portrait and landscape in Chromium.
- **Measured 320×320 luminous motif width (old → new):** Chromium **233 → 272 px (+16.7%)**; Firefox **234 → 275 px (+17.5%)**. Both compared the same NEBU motif and 1337 solved mirrors, once with the legacy flat wall viewport and once with the new forward-hit framing. Before/after images are in the browser CI artifacts. These are representative measurements, not guarantees for every motif.
- **Observed 390×390 forward render time per frame** (Linux CI, 3 offscreen frames per configuration): Chromium 448 **4.3 ms**, 666 **5.5 ms**, 1337 **6.6 ms**; Firefox **7.7 / 11.7 / 22.7 ms**. Browser and runner timings vary. They are **not real Android FPS measurements**.
- Existing bilingual website sitemap, RSS/blog, browser-prefixed EN/DE routes, social sharing and other site checks are still required/kept in CI. Eleven original and two new shared app source files are synchronized from the canonical repository.

## Deliberate limits and manual checks

- GIF framing does **not** enlarge optical facet positions or fake any light rays. Changes are to the viewing transform only; projects retain their normals and data.
- GIF sizes can increase with message length and optical density, so existing export frame budgets, quality controls and cancellation stay in place.
- Native Android, iOS/Safari and WhatsApp GIF handoff have **not** been physically retested here. Browser viewport emulation is separate from device testing. Dennis should inspect both a narrow portrait export and the 1337 layout on his own Android device after manual deployment.
- No uploads, embedded sharing widgets, trackers, third-party scripts, automated Worldnode access or social announcements were added. Old Git branches were not deleted.
- GitHub Pages may publish directly from website `main` after merge even before Dennis pulls on Worldnode.
