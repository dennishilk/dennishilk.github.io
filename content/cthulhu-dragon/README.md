# Cthulhu Dragon publication source

The two complete Markdown guides and 15 configuration snapshots come from the public
Cthulhu revision recorded in `source.json`. Every snapshot is SHA-256 checked and every
embedded full-file block must equal its snapshot before publication. Both languages
receive the same complete file library. Keep code changes in the canonical Cthulhu repo.

After committing Cthulhu on main:

```sh
node scripts/sync-cthulhu-dragon.mjs --from ../cthulhu
npm run build:cthulhu-dragon
npm run test:cthulhu-dragon
npm run test:cthulhu-dragon:browser
npm run test:seo
```

The build is offline. Marked 17.0.5 is vendored from the installed official npm package
under `scripts/vendor/`, with its full license retained. It is used only at build time;
no Markdown engine or code highlighter is downloaded by a visitor. Token colors are
rendered into escaped static code. Copy buttons are progressive enhancement.

The guides belong to the existing desktop tutorials category. News, security advisories
and unrelated article sections remain independent. RSS and sitemaps use the site's
existing generators. No command deploys to Worldnode.

Screenshot source: Dennis Hilk's `2026-10-19_17-07-41.png`, 19 October 2026, 2048×858.
The 2048/1920/960 WebP variants preserve the real screenshot and have localized alt
text. Visible third-party artwork retains separate original rights; no standalone
wallpaper or Fastfetch PNG from the private handoff is published. The configuration
package requires user-supplied images. See the canonical setup's ATTRIBUTION.md.
