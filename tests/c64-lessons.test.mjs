import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { C64Machine } = require("../museum/c64/c64-machine.js");
const { BasicProgram, C64Session, compileProgram } = require("../museum/c64/c64-basic-core.js");
const lessonsApi = require("../museum/c64/c64-lessons.js");

function executeLesson(lesson) {
  const events = [];
  const machine = new C64Machine({ onEvent: event => events.push(event) });
  const session = new C64Session({
    machine,
    emit: event => events.push(event),
    noProgressStatementsLimit: 200000,
    noProgressMsLimit: 100000000,
    segmentStatementLimit: 100000,
    seed: 64
  });
  if (lesson.command) {
    session.submit(lesson.command);
  } else {
    assert.equal(session.loadSource(lesson.solution), true);
    session.submit("RUN");
  }
  let safety = 0;
  while (session.runtime.status === "running" && safety < 120000) {
    safety += session.step(1000, 0).count;
  }
  return {
    events,
    machine: machine.snapshot(),
    runtime: session.runtime.state(),
    source: session.program.source()
  };
}

test("ten stable lesson IDs and both complete languages are present", () => {
  assert.equal(lessonsApi.lessons.length, 10);
  assert.equal(new Set(lessonsApi.lessons.map(lesson => lesson.id)).size, 10);
  assert.deepEqual(lessonsApi.lessons.map(lesson => lesson.number), [1,2,3,4,5,6,7,8,9,10]);
  for (const lesson of lessonsApi.lessons) {
    for (const language of ["en", "de"]) {
      const copy = lesson.copy[language];
      for (const key of ["title", "objective", "history", "challenge", "hints", "success"]) {
        assert.ok(copy[key], lesson.id + " " + language + " " + key);
      }
      assert.equal(copy.hints.length, 2);
    }
    assert.notEqual(lesson.copy.en.objective, lesson.copy.de.objective);
  }
});

test("every starter and solution program fits line limits and parses", () => {
  for (const lesson of lessonsApi.lessons) {
    for (const key of ["starter", "solution"]) {
      if (!lesson[key]) continue;
      const program = new BasicProgram();
      assert.doesNotThrow(() => program.load(lesson[key]), lesson.id + " " + key);
      assert.doesNotThrow(() => compileProgram(program), lesson.id + " " + key);
      assert.ok(lesson[key].split("\n").every(line => line.length <= 80), lesson.id + " line length");
    }
  }
});

test("every canonical lesson solution passes its state-based validator", () => {
  for (const lesson of lessonsApi.lessons) {
    const context = executeLesson(lesson);
    assert.equal(lessonsApi.validateLesson(lesson.id, context), true, lesson.id);
  }
});

test("validators reject empty source and an untouched startup machine", () => {
  const machine = new C64Machine();
  const context = {
    events: [],
    machine: machine.snapshot(),
    runtime: { variables: {}, metrics: {} },
    source: ""
  };
  for (const lesson of lessonsApi.lessons) {
    assert.equal(lessonsApi.validateLesson(lesson.id, context), false, lesson.id);
  }
});

test("sprite lesson exposes exactly one original 63-byte rocket", () => {
  assert.equal(lessonsApi.ROCKET_DATA.length, 63);
  assert.ok(lessonsApi.ROCKET_DATA.every(value => Number.isInteger(value) && value >= 0 && value <= 255));
  assert.ok(lessonsApi.ROCKET_DATA.some(value => value !== 0));
  assert.match(lessonsApi.byId("sprite").solution, /POKE 2040,13/);
  assert.match(lessonsApi.byId("sprite").solution, /POKE 53269,1/);
});

test("STAR RUNNER is BASIC-driven and combines every promised concept", () => {
  const source = lessonsApi.STAR_RUNNER;
  for (const pattern of [
    /RND\(1\)/,
    /POKE 55296/,
    /READ B/,
    /POKE 2040,13/,
    /POKE 53269,1/,
    /POKE 53248,X/,
    /GOSUB 200/,
    /RETURN/,
    /POKE 53280/,
    /POKE 54276,17/,
    /POKE 54276,16/
  ]) assert.match(source, pattern);
  assert.doesNotMatch(source, /SYS|LOAD|SAVE|SPRITE|SOUND/i);

  const context = executeLesson(lessonsApi.byId("star-runner"));
  const positions = context.events.filter(event => event.type === "memory" && event.address === 53248);
  assert.ok(positions.length > 100);
  assert.ok(context.runtime.metrics.returns > 0);
  assert.equal(lessonsApi.validateLesson("star-runner", context), true);
});

test("sound lesson passes from register events independently of audible output", () => {
  const context = executeLesson(lessonsApi.byId("sound"));
  const controls = context.events.filter(event => event.type === "audio" && event.address === 54276)
    .map(event => event.value);
  assert.deepEqual(controls, [17, 16]);
  assert.equal(lessonsApi.validateLesson("sound", context), true);
});
