# Linux Hardware & Driver Explorer — authoring contract

Phase 2 of Linux Fix Lab. Work-in-progress review implementation, not published.

## Source strategy

Upstream Linux source snapshot reviewed on 2026-10-10:
`3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0` (torvalds/linux).
This is a source snapshot, not a claimed minimum kernel version or a tested
compatibility result. Use immutable `https://github.com/torvalds/linux/blob/<ref>/...`
links for ID tables, configuration and implementation claims. Documentation
defines the intended interface. Runtime binding comes only from pasted input.
No mass import of PCI/USB databases. Short numeric identifiers are curated
facts; author original prose. Source snippets used in verification remain
attributed; do not copy large third-party tables into browser assets.

## Profile contract

Research groups each author one JSON array under `research/`, with these fields:

- `id`: permanent lowercase ASCII kebab slug, shared across languages.
- `category`: `amd-graphics`, `nvidia-graphics`, `intel-graphics`, `wifi`,
  `ethernet`, `audio`, `storage`, `usb`, `bluetooth`, `pcie`, `input`, `virtual`.
- `name`, `summary`, `identity`, `driverNotes`, `limitations`: `{en,de}` plain
  strings. Write genuinely device/family-specific original information.
  Do not equate a chipset or source table name with an exact marketed product.
- `bus`: `pci`, `usb`, `class`, or `virtual`.
- `ids`: curated exact matches, e.g. `{bus:"pci",vendor:"8086",device:"2723"}`.
  Optional `subvendor`, `subdevice`, `revision` narrow a match; never invent them.
  Every pair needs checked upstream evidence. No exact ID is required for an
  explicitly generic documented class/device-family profile.
- Optional ID qualifiers `pciClass` (six hex digits), `usbInterface`
  (`class:subclass:protocol`), `subvendor`, `subdevice` and `revision` are match
  constraints. Missing observed qualifiers remain candidates; a contradictory
  complete qualifier excludes that numeric rule.
- `match`: `{modules:[],pciClasses:[],usbClasses:[]}`. Secondary context only;
  module/class evidence must never masquerade as an exact product match.
- `drivers`: objects `{module,role,evidence}`. `role`: `kernel` or `userspace`;
  `evidence`: `id-table`, `class`, or `documentation`. Candidate names only;
  runtime binding and module presence are separate observations.
- `firmware`: `{state,patterns,explanation:{en,de}}`. `state`: `required`,
  `conditional`, `device-dependent`, or `none-documented`. Patterns are only
  source-backed examples; missing patterns means no exact filenames established.
  `none-documented` does not assert that hardware has no firmware.
- `checkpoints`: at least two `{command,label:{en,de},interpretation:{en,de},elevated}`.
  Read-only commands only. Use visible `BDF`, `MODULE`, `INTERFACE` placeholders.
  Explain the target and privileges, including sudo only if required.
- `fixLab`: existing problem IDs checked against Fix Lab content; omit rather
  than fabricate. Root integration derives and validates links.
- `sources`: at least two `{title,url,kind,claim}`. `kind`: `source-code`,
  `documentation`, or `firmware-manifest`. `claim` describes exactly what was
  checked. Prefer immutable source URLs; do not pretend every limitation is a
  reproduced fault. Optional `license`, `locator` and `retrieved` aid provenance.
- `reviewed`: `2026-10-10` for this actual editorial review.

No support scores, fabricated tested results, blanket firmware filename guesses,
unverified distro installation advice, model inference from report labels, or
claims of comprehensive arbitrary hardware coverage. All user-facing text is
localized. Synthetic examples must be labelled as fixtures.

## Release gate

Dennis requested a reviewable implementation before approving publication.
`publication.json` therefore defaults to review, no indexing, no active root
sitemap and no live cross-navigation activation. New files and an optional
gated integration patch may be reviewed locally; nothing is pushed or deployed.
Before any later launch, fetch current main and retain World Observer updates.
