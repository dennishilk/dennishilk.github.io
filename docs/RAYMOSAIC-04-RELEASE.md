# RAYMOSAIC 04 — integration and release gate

**Status:** GitHub-only staging, **not released to Worldnode**. This site repository has GitHub Pages enabled; merging the staged site into the Pages publishing branch may expose it **before** the next manual Worldnode pull. Do not equate a Git push with a private preview.

## One application, two language routes

- Canonical source of truth: [dennishilk/raymosaic](https://github.com/dennishilk/raymosaic), branch `mission-raymosaic-04`.
- English route: `/lab/raymosaic/`.
- German route: `/de/lab/raymosaic/`, with the same core JavaScript and CSS from `/lab/raymosaic/`.
- `scripts/sync-raymosaic.sh /path/to/raymosaic` regenerates the website copy. Do not hand-maintain a fork of the physics renderer.
- The 448-facet inverse solver, independent forward tracing, camera, inspection, drawing, presets and GIF worker come from the real application.

## 30-second gift journey

1. Visit the light laboratory, see the aligned heart and the Text tab.
2. Type a short name into the text field.
3. Choose **Make a GIF gift** / **Als GIF verschenken**. This applies the name and starts a compact 320-pixel, 3-second looping GIF export.
4. Wait for the progress indicator and view the animated preview.
5. Use **Share…** if the device's native file-sharing API supports GIF, or **Download GIF** and send the file through WhatsApp or another messenger.

**Automated technical baseline (GitHub Actions on Linux, 17 October 2026):**

| Check | Chromium | Firefox |
| --- | ---: | ---: |
| Name → finished GIF (automated browser, not a human test) | 1.44 s | 1.51 s |
| GIF dimensions / frames | 320×320 / 30 | 320×320 / 30 |
| GIF file size | 492 KB | 476 KB |
| Independently decoded changing frames (Pillow) | 26 transitions | 26 transitions |
| PNG decoded externally | 1600×900 valid | 1600×900 valid |
| Project file decoded / roundtrip | pass | pass |
| German locale and narrow viewport check | pass | pass |

The standalone application also passed 11 / 11 Node unit tests. Test evidence: [Actions run 39045158437](https://github.com/dennishilk/raymosaic/actions/runs/39045158437), including downloadable GIF, PNG, JSON project and timing artifacts.

### Explicitly **not** tested or guaranteed

- A real human completing the **full** open → name → gift → WhatsApp flow in under 30 seconds.
- Physical Android / iPhone / iPad browsers and messenger handoff.
- Low-end device performance or repeated high-resolution exports on memory-constrained phones.
- Screen-reader comprehension and accessibility audit beyond the current markup.
- A video export. GIF and PNG are supported; no unreliable video option has been shipped.

The automated measurement starts just before the quick-GIF click and ends when the file is ready; it does not include typing time, discovery, native share sheet or WhatsApp delivery.

## Persistence and privacy

Project file v1: local JSON (downloaded as `.raymosaic`) with image mask, text/preset, mirror normals, lamp position, camera and appearance. Browser storage provides autosave, a Save button and Restore Last Project; a project file is safer for backup.

Share links use gzip-compressed URL fragments in browsers that support CompressionStream/DecompressionStream; links exceeding ~1,850 characters trigger file-export guidance instead. The URL fragment is not transmitted to the HTTP server as a normal request, but it is included when a user copies the full URL; anyone with that URL can inspect the motif. Nothing is automatically sent to a third-party image host. Keep the core purely static and local-first.

## SEO and publication assets

- Two bilingual technical blog articles, BlogPosting JSON-LD, canonical/hreflang, OG/Twitter card and source-generated real media.
- Home and blog overview cards in DE/EN.
- Bilingual RSS feed items, sitemap-blog and app site sitemap entries.
- No Google submission has been triggered automatically; after publication, inspect Search Console and submit sitemap index only if necessary.

## Release checklist (Dennis controls)

- [ ] Check both staging branches and website CI.
- [ ] Observe the full 30-second experience with a human on at least one real Android and iOS browser, including a WhatsApp file send.
- [ ] Decide whether GitHub Pages should be disabled until Worldnode deployment. It is currently **enabled** on the website repository.
- [ ] Approve merging to the website's publishing branch; this may itself publish via Pages.
- [ ] Pull to Worldnode manually when ready and smoke-test both URLs, both articles, media MIME types and old site routes.
- [ ] Verify generated sitemap and RSS at the public hostname, then announce the launch.

**Never run an automatic Worldnode deployment from this repository's CI.**
