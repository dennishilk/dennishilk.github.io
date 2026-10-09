# Linux Fix Lab content contract

Version 1. Bilingual, documentation-guided editorial entries; not claims of hardware reproduction.

Each category JSON file is an array of problems. A problem contains:

- `id`: globally unique English kebab identifier, permanent.
- `slug`: `{en, de}` localized kebab slugs.
- `category`: one of `graphics`, `kernel`, `boot`, `storage`, `audio`, `network`, `security`, `desktop`, `packages`, `services`, `nixos`, `performance`.
- `title`, `summary`, `environment`: `{en: string, de: string}`. Summary is a distinct description (about 120–165 characters).
- `symptoms`: `{en: string[], de: string[]}`.
- `causes`: array of `{en, de}` evidence-qualified possible causes, not an asserted diagnosis.
- `diagnostics`: at least two objects `{id, command, explanation:{en,de}, interpretation:{en,de}}`. Commands read-only; clearly explain placeholders and privileges. One command per item. No sudo changes or destructive diagnostics.
- `solutions`: at least two topic-specific objects `{id, title:{en,de}, body:{en,de}, precautions:{en,de}, rollback:{en,de}}`. Stable semantic IDs, e.g. `check-driver-binding`. Optional `command` only for reversible, narrowly scoped actions with instructions. Text must explain when the action is justified, what it changes and how to recover. Never promise success.
- `sources`: at least two `{title,url,kind:"official",evidence}` primary references actually checked with browsing. `evidence` is `documentation`, `source-code`, `upstream-report` or `mailing-list-report`. Documentation defines intended behavior; code identifies implementation details in its linked version; reports supply reported observations, not proof of a reproduced fix. Use upstream/distribution references; no search-engine links.
- `reviewed`: the actual editorial source-check date in ISO format (initial collection: `2026-10-09`), not a reproduction date.
- `logPatterns`: objects `{id, all:string[], any?:string[], none?:string[], sample:string, negative:string[], severity:"warning"|"error"|"info", explanation:{en,de}, significance:{en,de}}`. Case-insensitive literal matching of all/any/none on individual bounded lines. Each signature must be subsystem-specific, a meaningful documented failure signal and have positive plus plausible negative examples. Samples are synthetic test fixtures, never observations. A generic `failed`, `timeout`, `permission denied` alone is forbidden. Not every problem needs a pattern; multiple distinct patterns may belong to a problem. Aim for 1–2 strong patterns per entry, no padding.

Text is plain Unicode, rendered with HTML escaping. No raw HTML, no Markdown tables, no invented test successes or current compatibility guarantees. Entries must be distinct and useful, with natural German localization and specific result interpretation. Prefer precise source sections. Do not claim that symptoms identify a unique root cause.

IDs, slugs and solution anchors are persistent contracts. Cross-links are derived and validated at build time. See docs/linux-fix-lab/PROGRESS.md for scope and remaining editorial work.

## Publication policy

The approved first live release has `phase: "live-test"`, `allowIndexing: false` and `activateSitemap: false` in `publication.json`. All generated pages use noindex,follow. The prepared launch XML is stored here and is not an advertised sitemap. Existing pages do not link to the Lab. Change these controls only after a separately approved official launch. `public-launch`, explicit indexing permission and explicit sitemap activation are all required for sitemap integration. Browser modules use .js for the actual server's JavaScript MIME support.
