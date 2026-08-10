import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { C64Machine } = require("../museum/c64/c64-machine.js");
const {
  BasicProgram,
  C64Session,
  Parser,
  canonicalVariable,
  compileProgram
} = require("../museum/c64/c64-basic-core.js");

function createLab(options = {}) {
  const events = [];
  const machine = new C64Machine({ onEvent: event => events.push(event) });
  const session = new C64Session({
    machine,
    emit: event => events.push(event),
    noProgressStatementsLimit: options.noProgressStatementsLimit,
    noProgressMsLimit: options.noProgressMsLimit,
    segmentStatementLimit: options.segmentStatementLimit,
    seed: 64
  });
  return { events, machine, session };
}

function runUntilSettled(session, maximum = 200000) {
  let statements = 0;
  while (session.runtime.status === "running" && statements < maximum) {
    const result = session.step(500, 0);
    statements += result.count;
  }
  return statements;
}

function loadAndRun(lab, source) {
  assert.equal(lab.session.loadSource(source), true);
  lab.session.submit("RUN");
  runUntilSettled(lab.session);
  return lab;
}

function output(events) {
  return events.filter(event => event.type === "output")
    .map(event => event.text + (event.newline ? "\n" : ""))
    .join("");
}

test("PRINT and question-mark alias execute in immediate mode", () => {
  const lab = createLab();
  lab.session.submit('PRINT "HELLO"');
  runUntilSettled(lab.session);
  lab.session.submit('?"WORLD"');
  runUntilSettled(lab.session);
  assert.match(output(lab.events), /HELLO/);
  assert.match(output(lab.events), /WORLD/);
  assert.equal(lab.session.runtime.status, "ready");
});

test("variables, arithmetic precedence, strings and significant names follow the contract", () => {
  const lab = loadAndRun(createLab(), [
    "10 SCORE=2+3*4",
    "20 SCENE=99",
    '30 NAME$="COMMODORE"',
    '40 PRINT SCORE;":";NAME$',
    "50 END"
  ].join("\n"));
  assert.equal(canonicalVariable("SCORE"), "SC");
  assert.equal(canonicalVariable("SCENE"), "SC");
  assert.equal(canonicalVariable("NAME$"), "NA$");
  assert.equal(lab.session.runtime.getVariable("SCORE"), 99);
  assert.equal(lab.session.runtime.getVariable("NAME$"), "COMMODORE");
  assert.match(output(lab.events), /99\s*:COMMODORE/);
});

test("line insertion, replacement, deletion and LIST ranges remain numeric", () => {
  const program = new BasicProgram();
  program.submit('20 PRINT "B"');
  program.submit('10 PRINT "A"');
  program.submit('20 PRINT "REPLACED"');
  assert.deepEqual(program.list(""), ['10 PRINT "A"', '20 PRINT "REPLACED"']);
  program.submit("20");
  program.submit('30 PRINT "C"');
  program.submit('40 PRINT "D"');
  assert.deepEqual(program.list("30"), ['30 PRINT "C"']);
  assert.deepEqual(program.list("30-"), ['30 PRINT "C"', '40 PRINT "D"']);
  assert.deepEqual(program.list("-30"), ['10 PRINT "A"', '30 PRINT "C"']);
  assert.deepEqual(program.list("10-30"), ['10 PRINT "A"', '30 PRINT "C"']);
});

test("RUN, NEW and CLR have distinct program and variable behavior", () => {
  const lab = loadAndRun(createLab(), ["10 X=42", "20 END"].join("\n"));
  assert.equal(lab.session.runtime.getVariable("X"), 42);
  assert.match(lab.session.program.source(), /10 X=42/);
  lab.session.submit("CLR");
  assert.equal(lab.session.runtime.getVariable("X"), 0);
  assert.match(lab.session.program.source(), /10 X=42/);
  lab.session.submit("NEW");
  assert.equal(lab.session.program.source(), "");
});

test("GOTO and IF skip the wrong path and reach the target", () => {
  const lab = loadAndRun(createLab(), [
    "10 X=1",
    "20 IF X=1 THEN GOTO 50",
    '30 PRINT "BAD"',
    "40 END",
    '50 PRINT "GOOD"',
    "60 END"
  ].join("\n"));
  const text = output(lab.events);
  assert.match(text, /GOOD/);
  assert.doesNotMatch(text, /BAD/);
  assert.ok(lab.session.runtime.metrics.branches > 0);
});

test("FOR/NEXT supports positive and negative STEP", () => {
  const lab = loadAndRun(createLab(), [
    "10 FOR I=1 TO 3",
    "20 PRINT I;",
    "30 NEXT I",
    "40 FOR J=3 TO 1 STEP -1",
    "50 PRINT J;",
    "60 NEXT J",
    "70 END"
  ].join("\n"));
  assert.match(output(lab.events).replace(/\s/g, ""), /123321/);
  assert.equal(lab.session.runtime.getVariable("I"), 4);
  assert.equal(lab.session.runtime.getVariable("J"), 0);
});

test("GOSUB/RETURN resumes at the following instruction", () => {
  const lab = loadAndRun(createLab(), [
    "10 X=2:GOSUB 100",
    '20 PRINT "X=";X',
    "30 END",
    "100 X=X*4",
    "110 RETURN"
  ].join("\n"));
  assert.equal(lab.session.runtime.getVariable("X"), 8);
  assert.equal(lab.session.runtime.metrics.gosubs, 1);
  assert.equal(lab.session.runtime.metrics.returns, 1);
});

test("DATA, READ and RESTORE use one deterministic data cursor", () => {
  const lab = loadAndRun(createLab(), [
    '10 DATA 5,-2,"C64"',
    "20 READ A,B,C$",
    "30 RESTORE",
    "40 READ D",
    "50 END"
  ].join("\n"));
  assert.equal(lab.session.runtime.getVariable("A"), 5);
  assert.equal(lab.session.runtime.getVariable("B"), -2);
  assert.equal(lab.session.runtime.getVariable("C$"), "C64");
  assert.equal(lab.session.runtime.getVariable("D"), 5);
});

test("INPUT waits without blocking and GET consumes queued keys", () => {
  const lab = createLab();
  lab.session.loadSource(["10 INPUT \"NUMBER\";N", "20 GET K$", "30 END"].join("\n"));
  lab.session.submit("RUN");
  runUntilSettled(lab.session);
  assert.equal(lab.session.runtime.status, "waiting-input");
  lab.session.queueKeys("A");
  lab.session.submit("42");
  runUntilSettled(lab.session);
  assert.equal(lab.session.runtime.getVariable("N"), 42);
  assert.equal(lab.session.runtime.getVariable("K$"), "A");
  assert.equal(lab.session.runtime.status, "ready");
});

test("approved scalar functions and logical/comparison operators evaluate", () => {
  const lab = loadAndRun(createLab(), [
    '10 A=INT(3.9)+ABS(-2)+SGN(-7)',
    '20 B$=LEFT$("COMMODORE",3)+RIGHT$("64",2)',
    '30 C=ASC("A"):D$=CHR$(66)',
    '40 E=LEN(B$):F=VAL("12.5"):G$=MID$("SPRITE",2,3)',
    '50 H=(3>2) AND NOT 0',
    "60 END"
  ].join("\n"));
  assert.equal(lab.session.runtime.getVariable("A"), 4);
  assert.equal(lab.session.runtime.getVariable("B$"), "COM64");
  assert.equal(lab.session.runtime.getVariable("C"), 65);
  assert.equal(lab.session.runtime.getVariable("D$"), "B");
  assert.equal(lab.session.runtime.getVariable("E"), 5);
  assert.equal(lab.session.runtime.getVariable("F"), 12.5);
  assert.equal(lab.session.runtime.getVariable("G$"), "PRI");
  assert.equal(lab.session.runtime.getVariable("H"), -1);
});

test("RND positive, zero and negative behavior is deterministic", () => {
  const lab = loadAndRun(createLab(), [
    "10 A=RND(-7)",
    "20 B=RND(0)",
    "30 C=RND(1)",
    "40 END"
  ].join("\n"));
  assert.equal(lab.session.runtime.getVariable("A"), lab.session.runtime.getVariable("B"));
  assert.notEqual(lab.session.runtime.getVariable("B"), lab.session.runtime.getVariable("C"));
});

test("syntax and runtime errors use BASIC-style names and source lines", () => {
  const cases = [
    { source: "10 PRINT (", message: "?SYNTAX ERROR IN 10" },
    { source: '10 A="X"+1', message: "?TYPE MISMATCH ERROR IN 10" },
    { source: "10 GOTO 999", message: "?UNDEF'D STATEMENT ERROR IN 10" },
    { source: "10 NEXT", message: "?NEXT WITHOUT FOR ERROR IN 10" },
    { source: "10 RETURN", message: "?RETURN WITHOUT GOSUB ERROR IN 10" },
    { source: "10 READ A", message: "?OUT OF DATA ERROR IN 10" },
    { source: "10 POKE 70000,1", message: "?ILLEGAL QUANTITY ERROR IN 10" },
    { source: "10 A=1/0", message: "?DIVISION BY ZERO ERROR IN 10" }
  ];
  for (const entry of cases) {
    const lab = loadAndRun(createLab(), entry.source);
    assert.match(output(lab.events), new RegExp(entry.message.replace(/[?]/g, "\\?")), entry.source);
    assert.equal(lab.session.runtime.status, "ready");
  }
  const direct = createLab();
  direct.session.submit("INPUT A");
  assert.match(output(direct.events), /\?ILLEGAL DIRECT ERROR/);
});

test("10 GOTO 10 reaches the no-progress pause and always remains stoppable", () => {
  const lab = createLab({
    noProgressStatementsLimit: 50,
    noProgressMsLimit: 100000,
    segmentStatementLimit: 10000
  });
  lab.session.loadSource("10 GOTO 10");
  lab.session.submit("RUN");
  runUntilSettled(lab.session, 1000);
  assert.equal(lab.session.runtime.status, "paused");
  assert.equal(lab.session.runtime.pauseReason, "no-progress");
  assert.equal(lab.session.runtime.metrics.statements, 50);
  assert.equal(lab.session.stop(), true);
  assert.equal(lab.session.runtime.status, "ready");
  assert.match(output(lab.events), /\?BREAK IN 10/);
});

test("runaway PRINT reaches the output cap instead of growing indefinitely", () => {
  const lab = createLab({
    noProgressStatementsLimit: 10000,
    noProgressMsLimit: 100000,
    segmentStatementLimit: 10000
  });
  lab.session.runtime.outputLineLimit = 5;
  lab.session.runtime.outputByteLimit = 1024;
  lab.session.loadSource(['10 PRINT "X"', "20 GOTO 10"].join("\n"));
  lab.session.submit("RUN");
  runUntilSettled(lab.session, 1000);
  assert.equal(lab.session.runtime.status, "paused");
  assert.equal(lab.session.runtime.pauseReason, "output-limit");
  assert.match(output(lab.events), /OUTPUT TRUNCATED/);
});

test("program and logical-line size limits reject growth without corrupting prior source", () => {
  const program = new BasicProgram();
  program.setLine(10, 'PRINT "SAFE"');
  assert.throws(() => program.setLine(20, "A".repeat(79)), /SYNTAX/);
  assert.equal(program.source(), '10 PRINT "SAFE"');
});

test("parser and compiled core are DOM-independent and reject unsupported integer variables", () => {
  assert.doesNotThrow(() => new Parser('PRINT "HELLO":A=2^3').parse());
  assert.throws(() => new Parser("A%=4").parse(), /SYNTAX/);
  const program = new BasicProgram();
  program.load(["10 REM COMMENT", "20 END"].join("\n"));
  const compiled = compileProgram(program);
  assert.ok(compiled.instructions.length >= 2);
  assert.equal(typeof document, "undefined");
});
