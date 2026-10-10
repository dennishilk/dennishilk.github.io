# Source provenance and attribution

The 154 profiles contain original bilingual explanations and selected numeric
identity facts. No PCI/USB database was bulk imported, and no upstream driver
source tree, firmware binary, proprietary driver or installation package is
redistributed by this feature.

- Linux kernel contributors: implementation evidence is pinned to
  [torvalds/linux 3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0](https://github.com/torvalds/linux/tree/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0).
  The kernel's own source licensing and file SPDX notices remain with those
  upstream resources. Profile links record exact file paths and table locators.
- NVIDIA: eight selected identity rows come from the manufacturer's versioned
  [580.95.05 supported-chip README](https://download.nvidia.com/XFree86/Linux-x86_64/580.95.05/README/supportedchips.html).
  This is a reference version, not an installation or version recommendation.
  The manufacturer's documentation remains under its own copyright. Device
  names and IDs are curated facts; surrounding catalog prose is original.
- Kernel, wireless, distribution and tool maintainers: explanatory links point
  to official project, Debian, Ubuntu, Fedora, Arch, NixOS and Gentoo resources.
  No documentation chapter was copied into the pages.
- The existing blog, Linux Fix Lab UI, language component, log signature model,
  guided transition and social intent helpers are reused within Dennis Hilk's
  existing repository.

`SOURCE-AUDIT.json` records 267 successfully retrieved primary resources, their
fetch locations, byte counts and SHA-256 checksums. The four `RESEARCH-*.md`
records document reviewed IDs, qualifiers, source boundaries and exceptions.
`tests/fixtures/hardware-source-evidence.json` holds 16 representative golden
identity/driver facts with evidence hashes; these are synthetic parser records,
not reports from tested hardware.

Source review establishes the evidence described in each profile. It does not
establish a minimum supported kernel, complete firmware package, all OEM board
variants, operational success or compatibility certification.
