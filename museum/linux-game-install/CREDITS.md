# OpenTTD licensing and browser-runtime decision

## What this exhibit bundles

It bundles **no OpenTTD executable, WebAssembly output, JavaScript port, graphics,
sound effects, music, or other game data**. `terminal.js` is original exhibit code
that simulates a small local package catalog. Therefore no OpenTTD or base-set
license text is being redistributed by this exhibit.

## Research / decision gate

The OpenTTD project identifies its core source under GPL version 2. OpenGFX is
GPLv2; OpenSFX is CC BY-SA 3.0; and OpenMSX is GPLv2. The project source and the
base-set source repositories are the primary places to inspect their exact notices:

* OpenTTD source and COPYING: <https://github.com/OpenTTD/OpenTTD>
* OpenGFX source and COPYING: <https://github.com/OpenTTD/OpenGFX>
* OpenSFX source and license: <https://github.com/OpenTTD/OpenSFX>
* OpenMSX source and COPYING: <https://github.com/OpenTTD/OpenMSX>

At implementation time, no official static-hostable browser release or documented,
reproducible upstream Emscripten/WebAssembly build suitable for this exhibit was
verified. The project therefore takes decision **C**: no game runtime is embedded.
The terminal's completion screen is deliberately not an emulation or recreation of
OpenTTD.

## Future adapter requirements

A future `launch` adapter may only be enabled after its upstream source/version,
reproducible build method, all bundled base sets, their exact license texts and
required attribution are documented locally. GPL source-correspondence obligations
must be met; OpenSFX attribution and CC BY-SA obligations must be met. It must not
bundle or download original Transport Tycoon Deluxe/MicroProse graphics, sounds,
music, ROMs, abandonware, or unreviewed third-party content. It should remain
client-side, offline by default, and disable automatic online content downloads.
