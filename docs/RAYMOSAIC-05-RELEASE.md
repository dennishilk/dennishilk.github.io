# RAYMOSAIC 05 — Magic polish release report

**Scope:** canonical application `dennishilk/raymosaic` plus static website copy in `dennishilk/dennishilk.github.io`.

## What changed

- New **Automatically mirror drawing** checkbox, with unchanged sketch preview and optically rendered projection preview. Coordinates are transformed once before inverse solving; existing mirror physics and forward rays remain untouched.
- Format-v1 project files and compressed URL fragments retain the optional `mirrorDrawing` setting. Missing field from legacy projects means `false`; new drawing sessions default to `true`.
- Separate **Share RAYMOSAIC ❤️** dialog for the public application URL (native sharing, WhatsApp, Facebook, X, email, copy link and instance-specific Mastodon) — never serializes personal sketch data. **Share my creation** continues to copy the personal compressed project link; GIF export is separate.
- Mobile stage is lower and larger with mobile-specific perspective camera target/focal scale, landscape reflow and safe-area padding.
- Integrated `polish-raymosaic-gif-export-20261017`: clean dark projection background, minimal scene GIFs, optional small watermark checked by default and disabled by checkbox. Export dialog unchanged.

## Verification (GitHub Actions, Linux)

- Canonical project Node tests: **16/16 passed**. Independent geometric forward-reflection checks include asymmetric arrows and orientation reversibility.
- Chromium and Firefox export actual GIFs and PNGs in CI; independently decoded frames confirm animation and PNG dimensions.
- Branded/unbranded projection GIFs and uniform dark backdrop checked externally.
- Chromium + Firefox cover public sharing URL privacy, Mastodon instance selection, drawing/restoration, DE translation, and emulated **360×740**, **390×844**, **844×390** viewports.
- Website CI covers both prefixed DE/EN routes, actual GIF worker execution, personal link roundtrip, public link excluding the personal hash, SEO/blog integration and regression checks.
- Canonical source and synchronized website: identical SHA for 10 app code/style files; `scripts/sync-raymosaic.sh` now copies `src/public-share.js`.

**Limitations:** automated narrow-screen viewport checks are **not actual Android/iOS device tests**. Dennis tested a prior version on Android; the modified layout should be reviewed on his phone. A real WhatsApp native file hand-off, Mastodon login and Safari/iOS still require manual confirmation. No external sharing service was contacted by the automated link tests. Video export is not part of this mission.

## Publish protection

- All commits were authored in `mission-raymosaic-05` branches for validation and can be fast-forwarded to `main` after green checks.
- **GitHub Pages is enabled in the website repository.** Updating its publishing branch may expose the staged changes immediately via Pages even before any manual Worldnode pull.
- Dennis explicitly authorized pushes to `origin/main` and controls Worldnode deployment himself. No server deploy, social announcements, analytics or embeds are included.
