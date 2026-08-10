import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  C64Machine,
  ADDRESSES,
  petsciiToScreen,
  screenToText
} = require("../museum/c64/c64-machine.js");
const { C64Session } = require("../museum/c64/c64-basic-core.js");

function run(source) {
  const events = [];
  const machine = new C64Machine({ onEvent: event => events.push(event) });
  const session = new C64Session({ machine, emit: event => events.push(event) });
  session.loadSource(source);
  session.submit("RUN");
  while (session.runtime.status === "running") session.step(500, 0);
  return { events, machine, session };
}

test("machine provides 64 KiB and historically meaningful default registers", () => {
  const machine = new C64Machine();
  assert.equal(machine.memory.length, 65536);
  assert.equal(machine.screen.length, 1000);
  assert.equal(machine.colors.length, 1000);
  assert.equal(machine.peek(ADDRESSES.BORDER), 14);
  assert.equal(machine.peek(ADDRESSES.BACKGROUND), 6);
  assert.ok(machine.screen.every(value => value === 32));
});

test("screen RAM, color RAM, border and background map to visible state", () => {
  const machine = new C64Machine();
  machine.poke(1024, 1);
  machine.poke(55296, 23);
  machine.poke(53280, 2);
  machine.poke(53281, 0);
  const snapshot = machine.snapshot();
  assert.equal(snapshot.screen[0], 1);
  assert.equal(snapshot.colors[0], 7);
  assert.equal(snapshot.border, 2);
  assert.equal(snapshot.background, 0);
  assert.match(snapshot.transcript, /^A/);
});

test("supported control codes clear, home, reverse, move and select colors", () => {
  const machine = new C64Machine();
  machine.writeText("ABC", { newline: false });
  machine.writeText(String.fromCharCode(147), { newline: false });
  assert.ok(machine.screen.every(value => value === 32));
  machine.writeText(String.fromCharCode(5) + "A", { newline: false });
  assert.equal(machine.colors[0], 1);
  machine.writeText(String.fromCharCode(18) + "B" + String.fromCharCode(146), { newline: false });
  assert.ok(machine.screen[1] & 128);
  machine.writeText(String.fromCharCode(19) + "C", { newline: false });
  assert.equal(machine.screen[0] & 127, 3);
});

test("PETSCII-to-screen teaching mapping distinguishes letters and screen text", () => {
  assert.equal(petsciiToScreen(65), 1);
  assert.equal(petsciiToScreen(90), 26);
  assert.equal(petsciiToScreen(42), 42);
  assert.equal(screenToText(1), "A");
  assert.equal(screenToText(26), "Z");
  assert.equal(screenToText(42), "*");
});

test("eight monochrome sprites derive from authentic pointer and register addresses", () => {
  const machine = new C64Machine();
  for (let sprite = 0; sprite < 8; sprite += 1) {
    const pointer = 13 + sprite;
    machine.poke(2040 + sprite, pointer);
    machine.poke(53248 + sprite * 2, 10 + sprite);
    machine.poke(53249 + sprite * 2, 80 + sprite);
    machine.poke(53287 + sprite, sprite);
    machine.poke(pointer * 64, 128 >> (sprite % 8));
  }
  machine.poke(53264, 1);
  machine.poke(53269, 255);
  const sprites = machine.snapshot().sprites;
  assert.equal(sprites.length, 8);
  assert.ok(sprites.every(sprite => sprite.enabled));
  assert.equal(sprites[0].x, 266);
  assert.equal(sprites[0].pointer, 13);
  assert.equal(sprites[0].data.length, 63);
  assert.equal(sprites[7].pointer, 20);
  assert.notEqual(sprites[7].data[0], 0);
});

test("SID-range writes remain bytes and produce observable audio events", () => {
  const events = [];
  const machine = new C64Machine({ onEvent: event => events.push(event) });
  [54272, 54273, 54276, 54277, 54278, 54296].forEach((address, index) => machine.poke(address, index + 1));
  const audio = events.filter(event => event.type === "audio");
  assert.equal(audio.length, 6);
  assert.deepEqual(audio.map(event => event.address), [54272, 54273, 54276, 54277, 54278, 54296]);
});

test("POKE evaluates, truncates and validates through the BASIC runtime", () => {
  const lab = run([
    "10 POKE 1024.9,1.9",
    "20 A=PEEK(1024)",
    "30 END"
  ].join("\n"));
  assert.equal(lab.machine.peek(1024), 1);
  assert.equal(lab.session.runtime.getVariable("A"), 1);

  const invalid = run(["10 POKE -1,1", "20 END"].join("\n"));
  const text = invalid.events.filter(event => event.type === "output").map(event => event.text).join("\n");
  assert.match(text, /ILLEGAL QUANTITY/);
});

test("snapshot supplies a screen-reader description of graphics state", () => {
  const machine = new C64Machine();
  machine.poke(2040, 13);
  machine.poke(832, 255);
  machine.poke(53248, 120);
  machine.poke(53249, 100);
  machine.poke(53287, 7);
  machine.poke(53269, 1);
  const snapshot = machine.snapshot();
  assert.match(snapshot.description, /sprite 1 yellow at x 120, y 100/i);
  assert.match(snapshot.description, /border light blue/i);
});

test("reset clears program-visible memory, sprites and audio registers", () => {
  const machine = new C64Machine();
  machine.poke(1024, 1);
  machine.poke(53269, 1);
  machine.poke(54296, 15);
  machine.reset();
  assert.equal(machine.peek(1024), 32);
  assert.equal(machine.peek(53269), 0);
  assert.equal(machine.peek(54296), 0);
  assert.equal(machine.snapshot().sprites.filter(sprite => sprite.enabled).length, 0);
});
