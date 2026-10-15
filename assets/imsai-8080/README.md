# IMSAI 8080 — accuracy and operation

An independently authored Intel 8080 interpreter and a separately authored
WarGames-inspired browser workstation, in English and German. MIT licensed;
see LICENSE in this directory. No proprietary ROMs, OS images or film assets.

## Accuracy contract

HELLO is preloaded without executing; RUN starts it immediately.

`cpu.mjs` implements all documented Intel 8080 instructions: register and memory
moves, arithmetic and logical operations, rotates, DAA, all conditional branches,
stack, exchanges, I/O, interrupt enable/disable, RST and HLT. All 256 opcode
bytes decode; the 12 undocumented bytes use the usual 8080 NOP/JMP/RET/CALL
aliases. No Z80/8085 extensions. Flags are S, Z, AC, P, CY with PSW bits 1/3/5
normalized. Subtraction and DCR use 8080 auxiliary carry (the complement of
half-borrow), and ANA uses bit 3 of the OR of its operands; this differs from
common 8085 assumptions. DAA is tested exhaustively for valid packed-BCD
additions. RAM and stack wrap at 16 bits. EI becomes effective after the next
instruction; the core accepts externally supplied RST interrupts through
`interrupt(0..7)`. The exhibit does not generate peripheral interrupts.

Nominal instruction T-state counts are accumulated, including conditional call
and return timing. This is **instruction-level emulation, not a cycle-exact IMSAI
system emulator**: no electrical bus phases, READY/HOLD timing, UART model,
original S-100 devices, floppy hardware, CP/M or IMDOS. RESET intentionally also
clears registers/flags for a reproducible museum starting point; physical 8080
reset does not promise these initial register values. RAM survives RESET.

The LEDs show the front-panel inspected address and corresponding RAM byte.
During CPU execution the pointer follows PC after each instruction batch. The
status LEDs summarize CPU/UI state (MEMR indicates the inspector read; WO is not
a latched bus transaction); these are **not a bus analyzer**. OUT 02 is an
explicit output latch, shown as a numeric value. Status IN/OUT represents the
last museum port operation. The red RUN indicator means the scheduler is active,
not a measured hardware clock.

Browser RUN performs 1 / 100 / 1000 instructions per 100 ms tick (10 / 1,000 /
10,000 instructions per second nominally). STOP cancels the tick. Each run stops
after 200,000 instructions or 30 seconds, whichever is first; a hidden page or
bonus-mode switch stops it immediately. Browser scheduling is not real time.
No CPU loop or animation runs while stopped. The single cursor effect respects
reduced motion. No external CPU diagnostics are claimed as passed; the included
unit suite exercises all opcode decoding, instruction families, flags, cycles,
wrapping, interrupts and all original demos. Hardware behavior outside this
contract is not emulated.

## Front panel

- Input toggles are bits 15..0. Up = 1. Blue selects the upper address byte;
  red selects the lower address/data byte. The hex field is an accessible
  alternative. Tab plus Space/Enter works; touch buttons also work.
- EXAMINE copies the switch word into the address pointer. EXAMINE NEXT adds one.
- DEPOSIT writes the switch word's lower 8 bits at the pointer. DEPOSIT NEXT
  advances **before** writing. Neither changes PC.
- RUN sets PC to the pointer and releases HLT. STOP follows PC. STEP executes one
  instruction at PC; use Set PC to choose the starting instruction explicitly.
- RESET stops and resets CPU state to PC 0000, SP FFFF; RAM is preserved.
- Load demo / Load bytes clears CPU, RAM, serial queues and output latches.
  Custom code is limited to 4096 hex bytes loaded at 0000. No upload is involved.
- F7 steps and F8 runs/stops only when focus is inside the hardware workbench and
  outside a text field. The on-screen keyboard enters characters into the last
  visible text field, or the current terminal field.

## Original demo listings

These programs were written for the exhibit. They contain no ROM code.

HELLO (0000):

    LXI H,000Fh
    loop: MOV A,M
          ORA A
          JZ done
          OUT 01h
          INX H
          JMP loop
    done: HLT
    db "IMSAI 8080 READY.",13,10,"HELLO, MUSEUM.",13,10,0

SUM (0000): MVI A,0; MVI B,10; loop: ADD B; DCR B; JNZ loop;
STA 0200h; HLT. Expected A = 37h (decimal 55), RAM[0200h] = 37h.

COUNTER (0000): LXI H,0200h; loop: INR M; MOV A,M; OUT 02h; JMP loop.
After 256 increments the byte wraps to zero. This deliberately runs until STOP
or the bounded scheduler budget. Port 02 is a museum output latch.

ECHO (0000): loop: IN 00h; ANI 1; JZ loop; IN 01h; OUT 01h; JMP loop.
Use the keyboard field under the CRT and submit. Non-ASCII becomes `?`.
The input queue is capped at 2048 bytes, the serial transcript at 8000 characters.

I/O conventions, chosen for the museum rather than an original IMSAI device:
IN 00 = 1 if a keyboard byte is waiting, else 0. IN 01 pops a byte (empty = 0).
OUT 01 renders printable ASCII, CR/LF or backspace; other bytes are ignored.
OUT 02 stores the byte in a visible output latch. Other input ports return 0;
other output ports are ignored. There is no real modem or network interface.

## The bonus and its limitations

`bonus.mjs` is independent of the CPU. Its school database and airline schedules
are entirely fictional; memory-only state disappears at reload or language
navigation. The grade audit supports undo per changed field. Reset restores
all seed grades and closes the demo session. US letter grades A,B,C,D,F are used.
Reservations key occupancy by flight + date + seat; cancellation frees a seat.
All dates use the same fictional timetable; there is no real ticket or service.

Joshua is a deterministic authored state machine, not an LLM. It accepts English
and German aliases, wrong/correct logins and hints. The telephone channel is a
fictional loopback; no number is dialed. Chess is **one curated mate-in-one
study**, not a complete chess implementation. Tic-Tac-Toe uses full minimax and
counts all 255,168 complete legal move sequences with memoized subtrees, including 46,080 drawn
sequences; perfect play is a draw. The fictional strategic model always treats
attack as mutual loss. It is an authored moral/narrative model, **not** a real
military forecast. WITHDRAW can finish without escalation; LEARN after escalation
compares the model to the exhaustive Tic-Tac-Toe search. No places, targets or
identities correspond to real systems. Professor Falken and Joshua are explicitly
film characters. WOPR links point to `/wopr/` (existing interactive service) and
`/museum/wopr/` (existing description); neither service nor authentication changes.

## Rebuild and verify

From the repository root:

    node scripts/build-imsai-8080.mjs
    node --test tests/imsai-8080*.test.mjs tests/museum-*.test.mjs
    node scripts/test-imsai-8080-browser.mjs
    node scripts/test-museum-catalog-browser.mjs

The browser runner uses the repository's existing Playwright runtime convention
(`CODEX_PRIMARY_RUNTIME_NODE_MODULES`) and Chrome (`IMSAI_BROWSER` override).
It serves local files, blocks external requests and writes temporary QA images.
It tests actual DOM interactions for front-panel memory/LEDs, demos, school
save/undo/reset, flight reservation/cancellation, both Joshua login paths, all
three games, both languages, responsive sizes, reduced motion and keyboard input.

Sources: Intel, 8080 Microcomputer Systems User's Manual (September 1975),
https://bitsavers.trailing-edge.com/components/intel/MCS80/98-153B_Intel_8080_Microcomputer_Systems_Users_Manual_197509.pdf ;
Computer History Museum, https://www.computerhistory.org/revolution/artifact/297/1153?position=0 ;
IMSAI production account, https://www.imsai.net/the-wargames-imsai/ .
