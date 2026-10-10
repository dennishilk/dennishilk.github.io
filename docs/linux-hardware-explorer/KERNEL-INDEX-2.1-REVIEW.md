# Linux Hardware Explorer 2.1 — USB class drivers and private matching

**Status (2026-10-10): review-only patch; no GitHub push, new branch, public deployment, sitemap change or indexing.**

**Repository target:** `dennishilk/dennishilk.github.io`, branch `main`, last inspected source state associated with `eb21c5e9c316e74b7693c06e88e677df93ae62c2`. The 2.0 archive was *not* committed: this package is a **standalone cumulative 2.1 patch** against that pre-2.0 source, not a patch to apply after the earlier 2.0 review patch. Check the current branch before applying. It preserves the static site generator, Fix Lab, catalog, profile content, blog, SEO and other pages.

## Reviewed design and files

Existing-file modifications (hunks, not whole-file replacements):

- `assets/linux-hardware-explorer/core.js`: preserve complete sysfs PCI/USB modaliases and observed USB interface number/descriptor fields; retain merged alias observations.
- `assets/linux-hardware-explorer/inspector-worker.js`: correlate separately reported USB interface bindings, then enrich catalog results with a fixed-index lookup. Worker timeout/clear remains owned by the existing `LocalAnalysis` controller.
- `assets/linux-hardware-explorer/app.js`: distinguish a pasted, unverified product label, catalog identity, actual USB-interface binding, class explanation and versioned kernel aliases. Show root-hub host-controller observations without conflating them with external USB interfaces; bilingual DE/EN copy notes privacy and capability limits. Input-derived labels are text nodes.

New code:

- `assets/linux-hardware-explorer/kernel-alias-matcher.js`: source field-aware PCI/USB/HID glob matching; unknown qualifiers require an unconstrained source-field `*`; respects USB-core vendor-specific class match exception. HID matching needs an explicit complete HID modalias; USB VID:PID is insufficient to infer one.
- `assets/linux-hardware-explorer/usb-topology.js`: correlate `Bus ### Device ###` and `lsusb -t` using **bus+device+interface**, capture limited numeric `lsusb -v` interface descriptors, preserve unbound/conflicting observations. Topology-only input produces anonymous device records. Never turn `12M` USB speed into a UART baud rate; never infer `/dev/ttyUSB*`.
- `assets/linux-hardware-explorer/kernel-index-loader.js`: **same four fixed URLs** for every analysis, `manifest.json`, `pci.json`, `usb.json`, `hid.json`. No vendor-derived path and no API/raw-report requests. Data is fetched in the worker, with size limits and normal browser HTTP cache. If unavailable, catalog and actual binding evidence still render.
- `scripts/build-kernel-driver-index.mjs`: deterministic **full** PCI/USB/HID alias extraction from a pinned actual kernel-build `modules.alias` and optional NUL-separated built-in alias information; no vendor allowlist, no handwritten mass dataset, bus-level partition + vendor buckets inside each public file.
- `scripts/compare-kernel-driver-index.mjs`: human-readable version-to-version diff; does not touch production.
- `tests/linux-hardware-explorer-kernel-2.1.test.mjs`: new regression coverage for matching, topology, source provenance, privacy and performance.
- Generated `assets/linux-hardware-explorer/kernel-index/*.json`: reproducible build outputs.

## Linux kernel matching model

Matching a `MODULE_DEVICE_TABLE`-derived alias is a **possible driver candidate**. Whether the driver is included in the distribution, built in, loadable, loaded, bound, initialized and feature-complete are distinct propositions. The alias file describes the inspected kernel **build**, not Linux support for all versions. Source `modules.builtin.modinfo` contained **zero PCI/USB/HID aliases in the inspected file**, so we do not invent them or claim that class drivers without aliases are absent. Example: the kernel USB core handles hub-class devices, but a root hub's reported `xhci_hcd` refers to host controller context, not an external USB interface driver selected by a marketing name. Some HID devices bind via HID bus aliases independently of their USB transport.

USB source matching includes vendor/product IDs, device revision range, device class/subclass/protocol, interface class/subclass/protocol and interface number. The Linux USB core specifically restricts **vendor-wildcard interface matches when `bDeviceClass=FF`**; index matching applies the same additional condition. Missing descriptor fields do not become fabricated zero-valued evidence. Source: Linux `drivers/usb/core/driver.c`, `usb_match_one_id_intf`; kernel `scripts/mod/file2alias.c`; Linux USB API documentation.

Source references:

- https://github.com/torvalds/linux/blob/master/drivers/usb/core/driver.c
- https://github.com/torvalds/linux/blob/master/scripts/mod/file2alias.c
- https://cdn.kernel.org/doc/html/latest/driver-api/usb/usb.html
- https://docs.kernel.org/kbuild/kbuild.html
- https://man7.org/linux/man-pages/man8/modprobe.8.html

## Inspected Debian source and provenance

Kernel build: `6.12.107+deb13-amd64` (Debian 13). Inputs were read from the current isolated build environment:

- `/lib/modules/6.12.107+deb13-amd64/modules.alias` — SHA-256 `73e4a296d0d2b1c90d45fc73a7a29585ab367157da6f843aec2156c67d4164ff`.
- `/lib/modules/6.12.107+deb13-amd64/modules.builtin.modinfo` — exact SHA-256 in `manifest.json`.
- `/boot/config-6.12.107+deb13-amd64` — exact SHA-256 in `manifest.json`.

Derived data are kernel-build metadata (Linux GPL-2.0-family origin); acknowledge source and review distribution/licensing requirements before release. Device labels remain reported observations or curated, independently sourced identities; no alias-derived marketing names are invented.

## Index size / coverage

| Bus | Unique alias rows | Raw JSON | gzip-9 reference |
|---|---:|---:|---:|
| PCI | 9,539 | 704,919 B | 63,917 B |
| USB | 8,571 | 647,566 B | 65,766 B (order-dependent gzip can vary slightly) |
| HID | 946 | 71,371 B | 8,378 B |
| Manifest | — | 2,163 B | 968 B |
| **Total** | **19,056** | **1,426,019 B** | **139,029 B** |

Counts include generated alias records, not distinct supported products, installed modules or guaranteed working devices. Input had 12 duplicate rows removed and 559 source alias patterns mapping to more than one candidate. Those multi-candidate patterns remain visible with limits, not arbitrarily discarded. 8,331 records of other bus types are outside this PCI/USB/HID release. Partition URLs are not sensitive to the visitor's hardware; vendor buckets exist **inside** downloaded bus files and are selected in browser memory.

The 2.0 prototype had 5,420 entries in 17 vendor-specific JSON files, ~375 KB raw; broad recognition and stronger privacy trade increased raw bytes for dramatically fewer network requests. Actual production compression depends on nginx/CDN `gzip`/`brotli` configuration and caching; the gzip values are offline calculations, not measured live HTTP transfers.

## Cthulhu USB regression interpretations

| Real USB ID | Source-reported device | `lsusb -t` observation | Honest 2.1 interpretation |
|---|---|---|---|
| `1a86:7523` | CH340 | `ch341` | Exact kernel alias + separate observed binding; no serial baud/node inference |
| `04d9:a09c` | Holtek keyboard | `usbhid` | HID interface context and observed transport driver; special keys not certified |
| `05e3:0608` | Genesys Logic hub | `hub` | Kernel USB-core hub-class context and observed binding; no fabricated alias |
| `048d:5702` | ITE RGB | `usbhid` | Observed HID transport only; RGB control unverified |
| `1e7d:2e24` | ROCCAT Kone EMP | `usbhid` | Observed HID transport only; vendor-specific features unverified |
| `1b1c:0c39` | Corsair LCD Cap | `usbhid` | LCD control unverified |
| `1b1c:0c1c` | Corsair Commander CORE | `usbhid` | Fan/pump/RGB control unverified |
| `1d6b:0002` / `1d6b:0003` | Linux root hubs | `xhci_hcd` | Host controller driver context, not ordinary external USB HID/interface binding |

RX 9060 XT PCI `1002:7590`, subsystem `148c:2437`: original curated Navi 44 identity plus reported `amdgpu` remains primary. This 6.12 kernelbuild has no candidate for that ID; **not** evidence of lack of support in NixOS 7.2.8, and not a reason to fall back to Tahiti/Bonaire/Vega recommendations. None of the actual physical devices were directly accessed; acceptance uses supplied observations and real kernel alias records.

## Tests and reproducibility

Standalone new tests: **19/19 passed** with Node.js 22.16.0. Includes exact CH340/PCI matches, USB class matching, insufficient-qualifier rejection, vendor-specific class boundary, interface number/revision range wildcards, full HID modalias boundary, bus+device USB topology, composite interfaces, anonymous topology-only input, root hub, Cthulhu zoo, AMD regression, network request shape, hostile input and 512-device lookup (approximately 200 ms in one offline run). Repeated generator run produced byte-identical JSON and manifest files.

The cumulative patch's changes to existing files were checked using `git apply --check` **against a synthetic source fixture constructed from verified GitHub hunk contexts**, not against a complete repository checkout. Full `npm run test:hardware-explorer`, `npm run test:fix-lab`, SEO and end-to-end browser tests were **not run** because the full repository and browser UI are not available in this runtime. Running those checks on a real checkout before release is essential; do not interpret standalone unit success as a verified deployment.

### Check on a real repository (do not commit automatically)

```sh
git status --short
git rev-parse HEAD
git apply --check /PATH/TO/review.patch
git apply /PATH/TO/review.patch
node --test tests/linux-hardware-explorer-kernel-2.1.test.mjs
npm run test:hardware-explorer
npm run test:fix-lab
npm run test:hardware-release
```

For locally regenerating the index from a supported kernel **without overwriting the published copy**:

```sh
node scripts/build-kernel-driver-index.mjs --aliases /lib/modules/RELEASE/modules.alias --builtin /lib/modules/RELEASE/modules.builtin.modinfo --config /boot/config-RELEASE --release RELEASE --source-label "RELEASE module build" --out /tmp/linux-hardware-index-new
node scripts/compare-kernel-driver-index.mjs assets/linux-hardware-explorer/kernel-index /tmp/linux-hardware-index-new /tmp/kernel-index-diff.md
```

Require a manual diff/source/test review before replacing production data. Build should remain independent of upstream availability.

## Privacy / correctness boundaries and remaining work

1. The browser fetches four **fixed public resource URLs** upon analysis. The server sees a normal HTTP request, time, IP and general page usage; **the requested path cannot reveal the pasted vendor/product**. The text report and matching remain local. No telemetry or external ID API was added. Standard HTTP/cache effects still apply.
2. `lsusb -t` must include the relevant root `Bus ###` context to correlate an interface; absent or ambiguous contexts are not assigned to unrelated devices. USB class labels are recognized only for known topology strings. `lsusb -v` descriptors need explicit interface number and device header to be attached confidently.
3. HID `hid:` bus matching currently requires a **complete explicit HID modalias observation**; we do not derive HID group or HID interface identity from USB VID:PID. Capturing/correlating multiple HID modalias paths for composite devices remains future work. ACPI, SDIO and other bus indexes are not included.
4. Hub-class behavior is **non-alias kernel-core context**, not a module candidate. Built-in driver inventories are not fully represented if modules.builtin.modinfo does not expose relevant aliases. Unsupported modules, firmware quirks, distro packaging and real functionality require platform evidence.
5. Actual site memory use, network timing, `Content-Encoding` configuration, keyboard/assistive-tech rendering, and Chrome/Firefox/Safari UI interactions need a real local server/browser walkthrough. Static source snippets are not a substitute.
6. Entire site and existing **154 original** regression tests could not be executed against a checkout. The patch does not edit any catalog/profile/SEO/blog content, but full integration testing remains a release blocker.

**Do not push/deploy until separately approved.**
