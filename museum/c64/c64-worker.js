"use strict";

importScripts("c64-machine.js", "c64-basic-core.js");

const queuedEvents = [];
let timer = null;
let suspended = false;

function queueEvent(event) {
  queuedEvents.push(event);
  if (queuedEvents.length > 1200) queuedEvents.splice(0, queuedEvents.length - 1200);
}

const machine = new self.C64MachineModel.C64Machine({ onEvent: queueEvent });
const session = new self.C64Basic.C64Session({ machine: machine, emit: queueEvent });

function flush(forceSnapshot, response) {
  const payload = {
    type: "batch",
    events: queuedEvents.splice(0),
    session: session.state(),
    machine: forceSnapshot || machine.dirty ? machine.snapshot() : null
  };
  if (response) payload.response = response;
  self.postMessage(payload);
}

function cancelPump() {
  if (timer != null) clearTimeout(timer);
  timer = null;
}

function schedulePump() {
  cancelPump();
  if (suspended || session.runtime.status !== "running") {
    flush(true);
    return;
  }
  timer = setTimeout(pump, 0);
}

function pump() {
  timer = null;
  if (suspended || session.runtime.status !== "running") {
    flush(true);
    return;
  }
  const started = performance.now();
  const result = session.step(500, 4);
  const elapsed = performance.now() - started;
  flush(machine.dirty);
  if (result.status === "running" && !suspended) {
    const pacedDelay = Math.max(0, result.count / 5000 * 1000 - elapsed);
    timer = setTimeout(pump, pacedDelay);
  }
}

self.addEventListener("message", function (event) {
  const message = event.data || {};
  try {
    if (message.type === "init") {
      if (typeof message.source === "string" && message.source.trim()) session.loadSource(message.source);
      flush(true, { id: message.id, action: "init" });
      return;
    }
    if (message.type === "submit") {
      if (session.runtime.status === "running" || session.runtime.status === "paused") {
        queueEvent({ type: "notice", code: "program-active" });
        flush(false, { id: message.id, action: "submit", accepted: false });
        return;
      }
      session.submit(message.value || "");
      flush(true, { id: message.id, action: "submit", accepted: true });
      schedulePump();
      return;
    }
    if (message.type === "load-source") {
      const accepted = session.loadSource(message.source || "");
      flush(true, { id: message.id, action: "load-source", accepted: accepted });
      return;
    }
    if (message.type === "stop") {
      cancelPump();
      session.stop();
      flush(true, { id: message.id, action: "stop" });
      return;
    }
    if (message.type === "continue") {
      session.continueRun();
      flush(true, { id: message.id, action: "continue" });
      schedulePump();
      return;
    }
    if (message.type === "reset") {
      cancelPump();
      session.resetMachine();
      flush(true, { id: message.id, action: "reset" });
      return;
    }
    if (message.type === "clear-screen") {
      machine.clearScreen();
      flush(true, { id: message.id, action: "clear-screen" });
      return;
    }
    if (message.type === "keys") {
      session.queueKeys(message.value || "");
      flush(false, { id: message.id, action: "keys" });
      return;
    }
    if (message.type === "suspend") {
      suspended = true;
      cancelPump();
      flush(false, { id: message.id, action: "suspend" });
      return;
    }
    if (message.type === "resume") {
      suspended = false;
      flush(false, { id: message.id, action: "resume" });
      schedulePump();
      return;
    }
    if (message.type === "snapshot") {
      flush(true, { id: message.id, action: "snapshot" });
    }
  } catch (error) {
    queueEvent({
      type: "internal-error",
      message: error && error.message ? error.message : "Unknown worker error"
    });
    flush(true, { id: message.id, action: message.type || "unknown", accepted: false });
  }
});
