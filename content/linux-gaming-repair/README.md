# Linux Gaming Repair Center editorial source

`articles.mjs` contains the reviewed English and German knowledge articles.
The same stable article ID is used beneath both language routes. Each article
includes distinct diagnostic questions, explained commands, a reversible test,
limitations and primary references. Commands are text for visitors to inspect;
the application never executes them.

Edit the source and run `npm run build:gaming-repair` from the repository root.
Do not edit generated HTML, the public catalog, manifests or integration maps
by hand. The build validates article and assistant references against the
existing Fix Lab and Hardware Explorer catalogs. Unchanged output retains its
recorded modification date. The sitemap synchronizer owns the live sitemap.

`publication.json` records the approved public launch. Navigation and sitemap
activation require `phase: "public-launch"` and `allowIndexing: true`.
The user explicitly approved this launch in the Phase 3 mission; this file does
not request an additional approval.

The anonymized acceptance fixture in `assets/linux-gaming-repair/fixtures.js`
separates user-documented observations from synthetic parser examples. The
fixture is an investigation case, not a reproduced benchmark or solved fault.
Do not turn a missing final kernel message, a power-limit correlation or a SATA
CRC error into a confirmed GPU diagnosis.

Review exact installed versions before changing requirements or recommending a
driver, Proton build, firmware or distribution configuration. Upstream main
branch requirements do not automatically describe a game's bundled version.
