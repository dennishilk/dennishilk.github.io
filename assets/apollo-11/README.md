# Apollo 11 — Land the Eagle

An original, browser-local educational exhibit in English and German.

## Accuracy contract

**No original AGC software executes.** This is not an AGC CPU emulator, a
Virtual AGC port, or a recorded Apollo trajectory. The DSKY is a deliberately
limited command interpreter. Its data comes from the independent flight model.
P63, P64 and P66 name reconstructed phases, not running Luminary programs.

The historical GET event selector and genuine NASA quotations are independent
of the model's elapsed-time clock. Original AGC code is a static, annotated
source viewer, never an execution trace or fabricated instruction pointer.

### Physics

`physics.mjs` is a local 2D plane with lunar gravity of 1.62 m/s², 45,040 N
maximum thrust and 311 s specific impulse. These are representative LM engine
values. Fuel flow is `T / (Isp * 9.80665)`. Variable mass includes fuel and a
chosen 6,800 kg dry vehicle mass. The final approach starts at h=120 m,
x=-35 m, vy=-2.5 m/s, vx=1 m/s, with 600 kg fuel. The guided training descent
starts at 6,000 m, x=-4,000 m, vy=-42 m/s, vx=80 m/s, with 4,500 kg fuel.
Neither is a historical Eagle state vector.

The fixed 1/60 s integrator uses constant-acceleration position updates and
mid-step mass. First ground contact is interpolated within a step; measured
impact velocities are retained. Display timing cannot change the integration
step. The real-time accumulator clamps long frame gaps to avoid a catch-up
spiral. Background tabs, an offscreen cockpit and the engineering experience
pause flight; resuming is explicit. Rendering is limited to 30 Hz (2 Hz with
reduced motion); telemetry updates at 10 Hz. No rendering loop runs when
paused. Canvas 2D avoids WebGL requirements. If canvas fails, flight controls
and text instruments remain usable.

Success requires |vy| ≤2.5 m/s, |vx| ≤1.5 m/s, |tilt| ≤8°, within 40 m of the
selected training site. These are educational limits, not certified LM limits.
A 1,200 s time limit, 20 km altitude limit and 40 km position limit bound runs.

The guided controller derives thrust and tilt from velocity/position errors.
It lands through the same physics as manual control; no forced touchdown,
teleporting state, unlimited fuel or hardcoded successful outcome. P63/P64/P66
change at 1,800 m and 150 m, chosen model thresholds. Engine throttling is
continuous; actual DPS restrictions are omitted. The procedural crater texture
and shadow are original illustrations on a flat collision datum. No real
lunar map, orbit, RCS, slosh, radar errors, abort, ascent or six-axis dynamics.

### Computer experience layout

Selecting experience 02 preserves the DSKY and instruments in the upper cockpit.
The central landing panel is replaced with the engineering view. The existing
source viewer moves into that panel; returning to experience 01 restores it to
the operations row without rebuilding it or resetting the DSKY. Flight physics
pauses on either switch and resumes only explicitly. On small screens the DSKY
is immediately above the engineering panel. Long historical notes stay below.

### DSKY

The annunciator arrangement follows Apollo 11–14 LM drawings: left/right
UPLINK ACTY/TEMP, NO ATT/GIMBAL LOCK, STBY/PROG, KEY REL/RESTART,
OPR ERR/TRACKER, blank/ALT, blank/VEL. Physical legends remain in English in
both languages; operating instructions, feedback and accessible state are
localized. Registers use an original SVG seven-segment treatment.

Supported command sequences:

- `V16 N60 E`: monitor VHORIZ, HDOTDISP, HCALC field order from Luminary099.
  Museum scaling: R1 horizontal speed magnitude and R2 signed vertical speed,
  both in tenths ft/s; R3 altitude in whole feet. Magnitudes saturate at 99999.
  No claim of original Pinball display scaling/overflow behavior.
- `V06 N60 E`: snapshot; KEY REL returns to live monitoring.
- `V16 N36 E`, `V06 N36 E`: model elapsed hours, minutes, seconds, not GET.
- `V35 E`: all-lamps/digits demonstration, dismissed by RSET or KEY REL.
- `V37 E 66 E`: select manual control at ≤150 m in a live/ready/paused scenario.
  This altitude guard is an exhibit restriction.

RSET acknowledges warning lamps without resetting flight. CLR clears the
active field; KEY REL releases the display. PRO and signed entry have no
supported pending requests and return explicit feedback. Unsupported pairs do
not change flight state. Keyboard shortcuts are scoped to the keypad, so the
rest of the page retains ordinary browser behavior. Flight-console arrows and
Space apply only when that console itself has focus.

### Historical audit

NASA MSC-00171 (November 1969), printed p. 5-13, Table 5-I is authoritative for
the event selector:

| GET | Event |
| --- | --- |
| 102:33:05 | Descent ignition |
| 102:37:51 | Landing radar data good |
| 102:38:22 | 1202 |
| 102:38:45 | Radar updates enabled |
| 102:39:02 | 1202 |
| 102:41:32 | P64 |
| 102:42:18 | 1201 |
| 102:42:43 | 1202 |
| 102:42:58 | 1202 |
| 102:43:09 | Landing-point redesignation |
| 102:43:22 | P66 |
| 102:44:28 | Low-level sensor indication |
| 102:45:40 | Landing and engine off, table rounding |

The report text provides touchdown at 102:45:39.9. The Lunar Surface Journal
records the contact-light call at 102:45:40, shutdown call at 102:45:43,
and landing announcement at 102:45:58. Transcript calls and measured events
are different observations; some journal commentary transposes alarm times.
The exhibit intentionally follows Table 5-I for all five alarm events.

Alarms are not random and are not injected into flight physics. The interactive
lesson is a schematic explanation of resource exhaustion and protected task
recovery, not a scheduler emulator or measured browser CPU load. 1202 means no
core sets; 1201 means no VAC areas. Real restart protection was more involved
than dropping one display task. The rendezvous radar caused unanticipated
counter activity/cycle stealing; do not describe it as a hardware CPU defect
or imply all software tasks were always preserved.

### Software and third-party licensing

The local historical files are **Luminary 1A build 099 / LMY99 revision 001**,
NASA 2021112-061, assembled 14 July 1969. Their unchanged public-domain headers
credit the MIT Museum scans, Paul Fjeld, Deborah Douglas and Virtual AGC's
transcription. `source/provenance.json` records the exact upstream Git commit,
file hashes and byte counts. Links to original listings and full-file downloads
remain available. The MIT license in this directory applies only to newly
authored exhibit code, not historical source or the shared site fonts.

Virtual AGC's GPL emulator was investigated as the authentic execution route.
It would also require spacecraft hardware I/O, navigation and sensor models
and careful GPL integration. No Virtual AGC emulator, assembler, compiled rope,
third-party runtime, GPL executable or emulator code is incorporated. Linking
to that project does not claim its emulator runs here. The original source
viewer is local and independent of external availability.

## Build and verification

From repository root:

```sh
node scripts/build-apollo-11.mjs
node scripts/sync-seo.mjs --sitemaps-only
node --test tests/apollo-11-*.test.mjs tests/museum-catalog.test.mjs tests/museum-wopr-order.test.mjs tests/museum-starfield.test.mjs tests/imsai-8080-*.test.mjs
node --test tests/museum-seo.test.mjs tests/museum-bilingual-coverage.test.mjs tests/sitemaps.test.mjs tests/seo-sitemap-generator.test.mjs
```

Pure tests verify the physics, successful/failed impacts, target changes,
reproducibility, frame subdivision, pause/resume and DSKY state machine.
`apollo-11-ui.test.mjs` exercises the actual UI event handlers against both
static shells using a deliberately small DOM harness. It validates control
wiring, local source loading, complete guided runs, failed runs, visibility
pauses, lessons and source selection. **It is not browser automation and does
not verify CSS layout, actual keyboard default behavior or accessibility.**

`test:apollo:browser` is an optional actual Playwright acceptance suite for a
host with Playwright and an installed Chromium. Use APOLLO_BROWSER to select
the executable and APOLLO_QA_DIR for temporary screenshots.

During authoring, the managed browser preview failed before serving because
`bwrap` could not mount `/newroot/proc` (`Operation not permitted`). No browser
layout, console/network, responsive screenshot or real keyboard interaction
success is claimed. Responsive rules cover 320/390/768/1024/1440/1920/3440 px,
but their visual acceptance remains to be checked in a real browser.

## Primary sources

- https://www.nasa.gov/wp-content/uploads/static/apollo50th/pdf/A11_MissionReport.pdf
- https://www.nasa.gov/wp-content/uploads/static/history/alsj/a11/a11.landing.html
- https://www.nasa.gov/wp-content/uploads/static/history/alsj/a11/a11.1201-pa.html
- https://www.nasa.gov/wp-content/uploads/static/history/computers/Ch2-5.html
- https://www.ibiblio.org/apollo/yaDSKY.html
- https://www.ibiblio.org/apollo/Luminary.html
- https://www.ibiblio.org/apollo/listings/Luminary099/PINBALL_NOUN_TABLES.agc.html
- https://github.com/chrislgarry/Apollo-11/tree/911e5c0283c629c50cb97666f34065e8c07d71a5/Luminary099
- https://github.com/virtualagc/virtualagc
