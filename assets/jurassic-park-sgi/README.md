# Jurassic Park / SGI / fsn — independent museum reconstruction

English: `/museum/jurassic-park-sgi/` · Deutsch: `/de/museum/jurassic-park-sgi/`

## What runs here

Original dependency-free ES modules. `filesystem.mjs` contains an authored bilingual
park volume; it never reads the visitor's filesystem. `landscape.mjs` renders 3D
cuboids with a perspective camera into Canvas 2D. Directory pedestals and wires
evoke fsn; file heights use a compressed logarithmic size scale, and colors use
invented ages. An equivalent DOM directory list, inspector and name search work
without Canvas. A directory view displays up to three descendant levels, and
entering a directory reveals the next levels. No original SGI binaries or code
are included. This is not IRIX or CPU emulation. Hardware styling is a composite
inspired by period SGI workstations, not a claim to reproduce a specific model.

Only user input and ResizeObserver trigger drawing. There is no continuous frame
loop, audio, remote API, telemetry, persistence or framework. Canvas pixel ratio
is capped at 1.5. Camera controls: overview, bird's eye, front, drag to orbit/tilt,
magnification. Canvas keyboard: arrows select visible objects, Enter opens,
Backspace goes to the parent. Touch users can use all named controls and the list.

Single clicks select and update the existing inspector. Double-clicking an
ordinary file, pressing Enter on the canvas or its directory-list button, using
Read file / Datei lesen, and terminal `open PATH` share one text-viewer path.
The non-modal document dialog is positioned inside the simulated monitor; it
renders the complete localized authored text with `textContent` in a read-only,
scrollable monospace area. Close and Escape restore focus without navigating,
rebuilding the landscape, resetting the camera/zoom, or clearing the search.
Tab can leave the document, and page scrolling remains available. Opening a
file visible in a descendant directory also preserves the current directory;
opening a directory still navigates normally. Dennis and ocean-monitor files
retain their special opening actions, and recovery modules retain their separate
inspection/action controls.

## Cinematic bonus

The separate fictional recovery scenario uses a deterministic dependency model:
diagnose → isolate bypass → restart control services → power → communications →
test three fence circuits → visitor-center door locks. The door module must first
be inspected in the authored filesystem. Buttons and terminal share the same
model. Restart clears completed stages and inspection state; reload clears all
state. This is a museum teaching sequence, not a real IRIX boot procedure or a
literal reconstruction of the film's control software.

Terminal vocabulary: `help`, `status`, `diagnose`, `isolate`, `reboot`,
`restore power`, `restore communications`, `restore fences`, `restore doors`,
`ls [PATH]`, `pwd`, `cd PATH`, `cat PATH`, `open PATH`, `clear`.
Paths are case-sensitive and bounded to the authored volume. No shell is invoked.

### Hidden details

`access security`, `access security grid`, and `access main security grid` each
produce a denial. The third attempt opens the personal Dennis lockscreen.
`please` / `bitte` closes it; Escape and the close button always work too.
The `.dennis` file provides another route through the three-denial sequence.
`.raptor_support` is a fan-discussion joke explicitly not presented as a verified
production fact. `ocean-monitor.txt` opens an original CSS ocean/fin illustration:
a playful reference to Dennis's observation, not a claim authenticating a movie
playing on a particular background monitor. No movie footage/stills/audio ship.

## Sources and historical limits

- SGI's archived original fsn page:
  https://archive.irixnet.org/siliconsurf/free/cool_sw_01.html
- Archived SGI distribution README / interaction description:
  https://nekofiles.irixnet.org/General/fsn/
- Fan tree reconstruction (reference only; no script or code copied):
  https://github.com/unixmonkey/fsn_jurassic_park

SGI describes fsn ("fusion") as an experiment in navigating information
landscapes, not a complete file manager. Original pedestals/files encode size and
file age and support selection, opening and overview navigation. Our scene uses
different geometry, scaling, controls and invented park data. Film-inspired
names identify context; no claim is made to possess the exact filmed filesystem.

## Dennis illustration

`dennis.webp` is an original AI-assisted cartoon generated using the built-in
Imagegen tool from Dennis's supplied personal photograph, with his explicit
request for a humorous face/lockscreen cameo. It is not an altered movie still.
The private source photograph is not included in this repository.

Final prompt: "Use the provided photo as the identity reference for Dennis: bald
head, short beard, mischievous friendly expression, absurd multiple pairs of
sunglasses perched on his head/face. Create an ORIGINAL charming early-1990s
computer clipart full-body cartoon with a large recognizable head, small body
wearing a plain white technician coat over a red shirt, one index finger raised
playfully. Not a film character, no movie costume, no logos, no text, no
watermark. Clean dark ink outlines, restrained flat colors, front-facing centered
full body completely visible, transparent background. The face should clearly
resemble Dennis in the photo, rendered as cartoon."

The generated PNG was resized to a 320×480 WebP with its alpha channel preserved.
The rendered workstation screenshot provides the social preview. UI fonts reuse
the repository's existing JetBrains Mono assets and their existing license.
Film and product names remain the property of their respective owners. No
affiliation or endorsement is implied.

## Build and validation

```sh
npm run build:sgi
npm run test:sgi
SGI_BROWSER=/path/to/chrome node scripts/build-jurassic-park-sgi-preview.mjs
SGI_BROWSER=/path/to/chrome npm run test:sgi:browser
npm run test:seo
node --test tests/museum-*.test.mjs tests/sitemaps.test.mjs tests/seo-sitemap-generator.test.mjs
```

Browser tests require Playwright from `CODEX_PRIMARY_RUNTIME_NODE_MODULES`.
They cover both languages, 3D views, keyboard/list/search navigation, recovery
dependencies, lockscreen order, offline interaction, responsive widths, Canvas
fallback, static historical notes without JavaScript and page/request errors.
Viewer regression checks additionally cover every ordinary file's exact EN/DE
contents, list and canvas double-clicks, both Enter routes, the read button and
terminal, retained camera/directory/selection/search state with no scene rebuild,
focus restoration, Escape, safe literal long-text scrolling, desktop containment
at all seven responsive widths, and reduced-motion use.

## Acceptance record — 16 October 2026

Mission 09.1: all 67 SGI/museum/blog/sitemap regression tests passed, and the SEO
audit reported zero errors across 1,031 indexable pages. The expanded Chromium
151 browser suite passed in English and German, including every ordinary file,
all file-opening routes, state preservation without rebuilding, both special
file actions, the complete recovery scenario, seven responsive widths, reduced
motion, offline use and Canvas fallback. No page or console errors occurred.
Desktop and mobile viewer screenshots were reviewed.

114 Node tests passed across the SGI, museum/catalog, bilingual coverage,
sitemaps, SEO generator, IMSAI and Apollo suites. The full SEO audit reported
zero errors across 1,029 indexable pages. Chromium browser acceptance passed for
SGI in both languages, the museum catalog, and IMSAI in both languages. Desktop
and mobile screenshots were reviewed. SGI has no horizontal overflow in either
mode at 320, 390, 640, 768, 1024, 1440 and 2048 pixels. Headless Chrome 151 was
used for these browser runs.

Additional unrelated regression observation: the existing Apollo browser suite
reports `en overflow 320`. Its pages, assets and browser test remain byte-for-byte
unchanged from the starting commit. No Apollo code is changed by this exhibit.
