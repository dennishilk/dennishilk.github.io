# IBM Z × Arm — Dual-ISA Processor Lab

Independent bilingual architecture laboratory by Dennis Hilk, October 16, 2026. Not endorsed by IBM or Arm. IBM, IBM Z, LinuxONE, Telum and Arm names are used factually; trademarks belong to their respective owners.

## Evidence, announced design and availability

- [IBM / Arm collaboration, 2026-04-02](https://newsroom.ibm.com/2026-04-02-ibm-announces-strategic-collaboration-with-arm-to-shape-the-future-of-enterprise-computing).
- [IBM Hot Chips announcement, 2026-08-24](https://newsroom.ibm.com/2026-08-24-ibm-unveils-next-generation-dual-architecture-processor-for-ibm-z-and-linuxone).
- [Arm accompanying announcement, 2026-08-24](https://newsroom.arm.com/blog/ibm-and-arm-expanding-ecosystem-for-next-era-of-enterprise-computing).
- [IBM Think context, 2026-08-28](https://www.ibm.com/think/news/hot-chips-dual-architecture-processor-mainframe-ai).
- [Existing z17 generation](https://newsroom.ibm.com/z17), 2025-04-08: Telum II belongs here, not to the future design depicted by this lab.

IBM-announced design targets: eleven high-performance cores, 2 nm, above 5.7 GHz, native IBM Z and Arm support in each core, integrated AI inference acceleration, on-chip I/O DPU and large cache architecture. Intended for future IBM Z and LinuxONE. This project does not establish a commercial release date, cache capacities, physical floorplan, internal pipeline, scheduler, virtualization implementation or measured performance. Announcement claims are not lab measurements.

## Source-level teaching instruction subsets

Official references: [IBM Principles of Operation, SA22-7832-02](https://www.ibm.com/support/pages/sites/default/files/inline-files/sa22-7832-02.pdf), general instructions chapter (ADD 7-18; BRC 7-29; COMPARE; LOAD; LOAD HALFWORD IMMEDIATE; STORE). These longstanding integer instructions also appear in newer editions. [IBM HLASM mnemonic table](https://www.ibm.com/docs/en/hla-and-tf/1.6.0?topic=instructions-table-all-supported). [Arm A64 ISA](https://developer.arm.com/documentation/ddi0602/2026-03/), [Arm MOVZ](https://support.arm.com/documentation/100069/0606/General-Instructions/MOVZ), [Arm assembler A64 reference](https://support.arm.com/documentation/dui0801/l/A64-General-Instructions).

| ISA | Implemented forms | Semantics retained |
| --- | --- | --- |
| IBM Z | LGHI R,imm16; AGR R,R; CGR R,R; BRC mask,label; STG R,displacement; LG R,displacement | Sign-extended immediate; 64-bit signed arithmetic and CC including overflow; signed compare; branch mask; 64-bit big-endian store/load with no base or index register |
| Arm A64 | MOVZ X,#imm16 (no shift); ADD X,X,X (unshifted); CMP X,X (unshifted); B.EQ label; STR X,[Xbase]; LDR X,[Xbase] | 64-bit register values; wrapping addition that preserves flags; subtraction NZCV for CMP; equality branch; 64-bit little-endian data via base register |

No binary encodings are displayed or decoded. `programFor` emits validated decoded source instructions and annotated source listings; it is not a general assembly parser. Register names in Z listings are educational symbolic names (an assembler would need appropriate register equates or dialect syntax). The Arm demo's X4 data pointer is initialized to 128 by `makeCPU`; `TeachingCPU.reset()` itself zeroes all registers. UI reset creates fresh demo contexts and restores X4.

There are sixteen Z integer registers and thirty-one Arm X registers in each model. The UI displays the registers used by the examples. Data memory is a deliberately small 256-byte array; only aligned 8-byte accesses are allowed. That alignment restriction is a lab guard, not a claim about every real instruction's addressing rules. Data address 128 is decimal (0x80). Listing PC is a source index, never a byte address or hardware PSW/PC. Labels map to listing indices, not encoded relative offsets. The harness stops at end-of-listing; no fake HALT mnemonic exists. Infinite loops stop at 10,000 teaching instructions. Arithmetic uses BigInt with explicit 64-bit conversions. Z fixed-point-overflow interruptions are not modeled (overflow mask effectively disabled); CC=3 and wrapped result are retained.

No z/OS instance, full IBM Z emulator, Arm hardware emulator, binary loader, privileged ISA, exception machinery, virtual memory, memory-ordering protocol, operating-system ABI or cycle timing is implemented. This is not a benchmark platform.

## Eleven conceptual cores and allocation

Each selectable tile has independent Z and Arm teaching contexts. One selected-core step advances one instruction in each non-complete context. Other cores retain their state. The pairing makes equivalent programs easy to compare. It does not assert simultaneous issue, resource partitioning, hardware dispatch rules or mixed-ISA execution inside one process. Timeline entries describe teaching events, not clock cycles. The displayed queue denotes two demo contexts, not a real IBM queue depth. Core/block positions, paths, register panels and decorative cell patterns are authored educational graphics, not IBM CAD.

`ControlledRunner` owns one interval and rejects duplicate starts. Pause, reset, core selection, pagehide and hidden-page transitions cancel relevant running work. The CPU and service demonstrations have separate explicit controllers. No continuous animation/render loop, cloud call, banking integration, personal data collection or external runtime dependency exists. Reduced motion disables smooth scrolling; execution only progresses through requested steps/timers. Diagram buttons and DOM listings expose the critical information without relying on graphics.

## Service scenario

Synthetic transaction → validation → request object → Arm service rule → response → completion. Separate software environments communicate through a simulated service contract. No cross-ISA function-call compatibility is implied. OS, ABI and isolation remain required.

`score = min(100, floor(amount / 1000) * 10 + (foreign ? 25 : 0))`; score >= 50 means review. Input amount must be an integer 1–100,000 and the region flag must be boolean. This is deterministic arithmetic, not trained AI, fraud probability or bank policy. The AI block is architectural context and does not execute the scoring rule. Integrated versus separate placement changes the explanatory transport boundary, not a measured or simulated latency. No performance or energy numbers are assigned.

## Assets and provenance

All chip HTML/CSS, comparison blocks and SVGs are original. Four localized WebP images are actual Playwright captures of this implemented exhibit. Six localized SVGs explain same-core capability, service boundaries and architecture comparisons. Two local PNG social cards are 1200×630, composed from the real lab captures and original typography. No generated hardware photographs or third-party diagram artwork. Figure metadata and DE/EN alt text: `content/museum-blog/dual-isa-figures.json`.

## Build and validate

From repository root, Node 24:

```sh
npm run build:dual-isa
npm run test:dual-isa
npm run test:museum-blog
node --test tests/museum-*.test.mjs
npm run test:seo
npm run test:dual-isa:browser
```

Browser tests require the `playwright` and `sharp` Node packages. Set `DUAL_ISA_BROWSER` to an installed Chromium/headless-shell executable; the default is the execution environment's `/tmp/headless/chrome-headless-shell-linux64/chrome-headless-shell`. Existing regression browser scripts have their own executable environment variables. These are development dependencies only. Browser script verifies both languages, eleven cores, both branch paths, context retention, controls, service flow, keyboard activation, reduced motion, assets and widths 320/390/768/1440/2048. It blocks off-origin runtime requests. It writes QA screenshots to `/tmp/dual-isa-qa`.

Rebuild screenshots deliberately before rebuilding figure metadata/social cards:

```sh
node scripts/build-ibm-dual-isa.mjs
node scripts/test-ibm-dual-isa-browser.mjs --capture
node scripts/build-ibm-dual-isa-visuals.mjs
npm run build:dual-isa
```

The article generator uses the established museum-blog pipeline. Integration preserves the existing catalog layout and exhibit order (Apollo DSKY immediately followed by Apollo 11), adds a hardware/architecture filter and one card, updates bilingual blog indexes, RSS and sitemaps. Publication date is 2026-10-16. Worldnode deployment remains manual.

Modern browsers with ES modules, BigInt, DataView BigInt methods and structuredClone are required. Chromium is tested by the acceptance suite. Firefox and Safari compatibility is targeted through standard APIs but not claimed as verified in this environment.
