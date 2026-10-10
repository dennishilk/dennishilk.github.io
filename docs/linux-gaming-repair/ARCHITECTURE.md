# Linux Gaming Repair Center architecture

The project extends the existing static diagnostic ecosystem. It introduces no
framework, backend, account system or runtime package dependency.

- `content/linux-gaming-repair/articles.mjs`: bilingual reviewed editorial
  source with explained commands, limitations and existing-project relations.
- `assets/linux-gaming-repair/core.js`: bounded log-pattern classifier,
  evidence-layer observations, redaction and conservative summary generation.
- `assets/linux-gaming-repair/inspector-worker.js`: local asynchronous parsing.
- `assets/linux-gaming-repair/diagnostics.js`: branching assistants, allowlisted
  launch construction, distro checks, graphics layers and frame-time guidance.
- `assets/linux-gaming-repair/app.js`: event handling and safe DOM rendering.
- `scripts/build-linux-gaming-repair.mjs`: generated static routes, metadata,
  minimal public catalog, output hashes and related-project integration maps.
- `scripts/gaming-integration.mjs`: approved navigation and contextual
  backlinks in the existing Fix Lab and Hardware Explorer templates.
- `scripts/sync-seo.mjs`: single ownership of the dedicated gaming sitemap,
  reciprocal language alternates, recorded dates and robots advertisement.

Visitors can read every article without JavaScript. The interactive engines
process data in the current browser tab. The page policy denies connections
(`connect-src 'none'`), form submission, frames and external scripts. Commands
are never executed. Diagnostic inputs are not written to browser storage or
the address. Shared language preference storage contains only the language.

Findings identify observations and plausible investigation paths. Device
identity, kernel binding, Vulkan enumeration and game presentation are separate
stages. Kernel GPU failures, PCIe transport errors, storage link resets and
userspace translation errors retain separate findings. An absence of a matched
line does not rule out a failure; in particular, a hard-lock can interrupt the
last journal write. No tested pattern is a compatibility guarantee.

Launch strings are constructed entirely from allowlisted values. Invalid API,
runtime and driver combinations yield an explanation instead of a misleading
command. System checks are read-only first. Temporary launch changes and NixOS
declarative examples carry requirements and rollback descriptions.

Generated HTML is committed for static deployment. `build:gaming-repair`
regenerates gaming routes, the two related diagnostic projects and sitemaps.
Git history remains on `main`, without force-push. No build or deployment
command connects to Worldnode.

See `REVIEW.md` for measured validation and `REGRESSION-BASELINE.md` for
pre-existing repository failures. Event/DOM harnesses verify logic; they do not
replace a rendering, mobile-device or assistive-technology browser test.
