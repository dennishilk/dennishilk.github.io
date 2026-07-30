# Safe image optimization workflow

## Purpose and safety model

`scripts/optimize_images.py` inventories local raster assets and creates optional,
non-destructive WebP derivatives under `assets/generated/images/`. Originals, SVGs,
routes, metadata, and references are never overwritten. Animated images, AVIF/WebP,
museum evidence, maps/scientific graphics, unreadable files, and files below 20 KB
are audit-only or manual-review items. A candidate must save both 20 KB and 10%.
Favicons, Apple touch icons, manifest icons, and other special-consumer icons retain
their broadly supported authored format and are reported for manual review. Existing
WebP/AVIF and animated inputs are never redundantly encoded. Metadata, feed, email,
Open Graph, and Twitter-card consumers should likewise be reviewed explicitly before
an authored asset is changed.

The audit records dimensions, ratio, alpha, animation, EXIF orientation, hashes,
references, HTML hints, classification, duplicates, repository totals, and page-level
byte estimates. Estimates are not measured browser timings. Reference matching is
conservative; unreferenced candidates must be checked manually before deletion (the
tool never deletes them).

## Commands

```sh
python3 scripts/optimize_images.py --check-dependencies
python3 scripts/optimize_images.py --audit --report-json reports/audit.json --report-md reports/audit.md
python3 scripts/optimize_images.py --dry-run
python3 scripts/optimize_images.py --generate --top 10
python3 scripts/optimize_images.py --verify
python3 scripts/optimize_images.py --apply
python3 scripts/optimize_images.py --restore
python3 scripts/optimize_images.py --audit --path avatar.png --top 20
```

`--dry-run` writes nothing. `--generate` writes candidates and a deterministic state
manifest, then prints generated/reused/skipped/manual/failed counts, duplicate-group
count, represented bytes, candidate bytes, and potential savings. `--top N` limits
both the terminal and Markdown savings rankings, sorted by absolute bytes saved; it
prints a clear empty result when no usable candidates exist. Re-running reuses a
verified candidate when its recorded source and candidate hashes are unchanged.
`--verify` checks readability, dimensions, aspect
ratio, alpha presence, animation count, and all local HTML `src`/`srcset` raster
references and CSS `url()` values. `--apply` accepts only recorded `PASS` candidates,
but deliberately does not rewrite markup: maintainers must visually approve and
explicitly introduce a derivative. `--restore` removes generated candidates when
the state confirms that references were never changed. To revert an explicit,
reviewed markup edit, use Git to restore that edit, then run `--restore`.

## Dependencies

Python 3 is required. Auditing PNG, JPEG, and GIF has a standard-library fallback.
Pillow enables all supported dimensions and WebP generation. `cwebp`, `avifenc`, and
`oxipng` are reported for operator awareness but are never invoked automatically.
Optional scikit-image availability is reported; the current conservative verifier
does not claim SSIM when it cannot calculate it.

Debian: `apt install python3-pil webp libavif-bin oxipng`. Arch:
`pacman -S python-pillow libwebp libavif oxipng`. Install only the tools approved for
your environment; the script never installs or downloads anything.

Accepted audit formats are PNG/APNG, JPEG, WebP, GIF, and AVIF. SVG, video, PDF,
fonts, JSON, and source maps are not image-processing inputs. Animated GIF/WebP/APNG
and AVIF are not re-encoded. Alpha-bearing screenshots/artwork use lossless WebP;
photos use WebP quality 90 and require visual review before a reference edit. The
automatic verifier rejects changed size, ratio, alpha presence, animation, or an
unreadable result. Inspect text edges, gradients, alpha halos, color, orientation,
and profiles side-by-side at 100% before serving any derivative.

## Layout and authoring guidance

Keep originals in their authored location. Generated files mirror that structure
under `assets/generated/images/`; do not commit the state manifest unless candidates
are intentionally reviewed. Thus `nebby.png` and `images/nebby.png` remain distinct
assets and map to distinct, collision-safe destinations even when byte-identical.
Duplicate hash groups are explicit in reports; generation may reuse the canonical
encoded bytes for another destination, but never aliases or redirects a source.
Generated assets may be committed only after their source hashes, verification,
savings, duplicate handling, and visual output have been reviewed. Use 160/320 px avatar derivatives, thumbnail widths near
320/640 px, and hero widths near 1280/1920 px when the real layout justifies them.
Screenshots should retain a sharp 1× source and preferably a 2× density option.
Museum evidence must retain its full-resolution original and link behavior; introduce
only a separate display derivative after curator review. Never upscale or crop.

Add intrinsic `width` and `height` to prevent layout shift. Add `loading="lazy"` and
`decoding="async"` to below-the-fold content, not likely LCP/above-the-fold imagery.
Use a small `srcset` and `sizes` set only when measured display sizes warrant it;
retain the original as fallback and validate every URL.

## Maintainer workflow

1. Add the original image.
2. Run `--audit` and review classification/references.
3. Run `--dry-run`.
4. Run `--generate` and visually inspect every `PASS` candidate.
5. Run `--apply` (verification gate only), then explicitly update selected markup.
6. Run `--verify` and load affected routes from `python3 -m http.server 8000`.
7. Review `git diff`, including binary sizes and museum evidence links.
8. Commit only after visual inspection. To revert, restore markup with Git and run
   `python3 scripts/optimize_images.py --restore`.

## Potential versus live savings

Reports distinguish baseline transfer, **potential transfer after approved candidate
integration**, and potential bytes saved. These are estimates for valid candidates,
not claims about current production traffic. The tool records `Live references
changed: 0`; actual live savings remain zero until a maintainer visually inspects a
candidate and explicitly changes markup in a separate reviewed task. Unreferenced
candidates and special-consumer assets are called out rather than integrated or
deleted automatically.
