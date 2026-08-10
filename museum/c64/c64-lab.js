(function () {
  "use strict";

  const locale = document.documentElement.lang === "de" ? "de" : "en";
  const lessonsApi = window.C64Lessons;
  const lessons = lessonsApi.lessons;
  const assetBase = new URL(".", document.currentScript.src);
  const STORAGE_KEY = "c64-programming-lab.v2";
  const MAX_EVENT_HISTORY = 12000;
  const MAX_TRANSCRIPT = 65536;

  const text = {
    en: {
      step: "STEP",
      of: "OF",
      objective: "OBJECTIVE",
      history: "WHY THIS IS C64",
      challenge: "YOUR CHALLENGE",
      hint: "Hint",
      secondHint: "Another hint",
      hideHint: "Hide hint",
      solution: "Show solution",
      restore: "Restore starter",
      next: "Next lesson",
      completed: "LESSON COMPLETE",
      running: "Program running",
      ready: "Ready for BASIC input",
      paused: "Program paused by the safety budget",
      waiting: "Program waiting for INPUT",
      stopped: "Program stopped",
      internalError: "The lab encountered an internal error. Your program remains saved.",
      activeProgram: "Stop or continue the current program before entering another command.",
      continue: "Continue program",
      workerRestart: "The worker did not stop in time and was safely recreated.",
      loaded: "Program loaded",
      saved: "Program downloaded and saved locally",
      invalidFile: "That file is not a valid BASIC project or exceeds 64 KiB.",
      replace: "Replace the current program with this lesson content?",
      newProject: "Delete the current program and begin a new project?",
      freeTitle: "Free Programming Mode",
      freeObjective: "Write your own program with the documented BASIC V2 teaching subset.",
      freeHistory: "Resource limits remain active. Browser Save/Open are modern lab controls, not C64 disk commands.",
      freeChallenge: "Try LIST, RUN, PEEK and POKE—or revisit any lesson.",
      soundOn: "Sound on",
      soundOff: "Sound muted",
      crtOn: "CRT effect on",
      crtOff: "CRT effect off",
      transcriptShown: "Transcript shown",
      transcriptHidden: "Transcript hidden",
      resetDone: "Machine reset; program preserved",
      screenCleared: "Screen cleared with a modern lab control",
      noProgram: "(NO STORED PROGRAM)",
      programLabel: "Stored BASIC program",
      memoryEmpty: "Run a POKE lesson to inspect memory writes.",
      completeStar: "STAR RUNNER is complete. You programmed the animation in BASIC."
    },
    de: {
      step: "SCHRITT",
      of: "VON",
      objective: "ZIEL",
      history: "WARUM DAS C64 IST",
      challenge: "DEINE AUFGABE",
      hint: "Hinweis",
      secondHint: "Weiterer Hinweis",
      hideHint: "Hinweis ausblenden",
      solution: "Lösung zeigen",
      restore: "Starter wiederherstellen",
      next: "Nächste Lektion",
      completed: "LEKTION ABGESCHLOSSEN",
      running: "Programm läuft",
      ready: "Bereit für BASIC-Eingabe",
      paused: "Das Sicherheitsbudget hat das Programm pausiert",
      waiting: "Das Programm wartet auf INPUT",
      stopped: "Programm gestoppt",
      internalError: "Im Labor ist ein interner Fehler aufgetreten. Dein Programm bleibt gespeichert.",
      activeProgram: "Stoppe das laufende Programm oder setze es fort, bevor du einen neuen Befehl eingibst.",
      continue: "Programm fortsetzen",
      workerRestart: "Der Worker reagierte nicht rechtzeitig und wurde sicher neu erstellt.",
      loaded: "Programm geladen",
      saved: "Programm heruntergeladen und lokal gespeichert",
      invalidFile: "Die Datei ist kein gültiges BASIC-Projekt oder größer als 64 KiB.",
      replace: "Das aktuelle Programm durch den Inhalt dieser Lektion ersetzen?",
      newProject: "Das aktuelle Programm löschen und ein neues Projekt beginnen?",
      freeTitle: "Freies Programmieren",
      freeObjective: "Schreibe dein eigenes Programm mit dem dokumentierten BASIC-V2-Lehrumfang.",
      freeHistory: "Die Ressourcenlimits bleiben aktiv. Browser-Speichern/Öffnen sind moderne Laborfunktionen, keine C64-Diskettenbefehle.",
      freeChallenge: "Probiere LIST, RUN, PEEK und POKE aus oder kehre zu einer Lektion zurück.",
      soundOn: "Ton an",
      soundOff: "Ton stumm",
      crtOn: "CRT-Effekt an",
      crtOff: "CRT-Effekt aus",
      transcriptShown: "Transkript eingeblendet",
      transcriptHidden: "Transkript ausgeblendet",
      resetDone: "Maschine zurückgesetzt; Programm erhalten",
      screenCleared: "Bildschirm mit moderner Laborfunktion gelöscht",
      noProgram: "(KEIN GESPEICHERTES PROGRAMM)",
      programLabel: "Gespeichertes BASIC-Programm",
      memoryEmpty: "Starte eine POKE-Lektion, um Speicherzugriffe zu sehen.",
      completeStar: "STAR RUNNER ist vollständig. Du hast die Animation in BASIC programmiert."
    }
  }[locale];

  const elements = {
    start: document.getElementById("c64Start"),
    lab: document.getElementById("c64Lab"),
    canvas: document.getElementById("c64Canvas"),
    canvasDescription: document.getElementById("c64CanvasDescription"),
    screenText: document.getElementById("c64ScreenText"),
    transcriptPanel: document.getElementById("c64TranscriptPanel"),
    transcript: document.getElementById("c64Transcript"),
    command: document.getElementById("c64Command"),
    commandForm: document.getElementById("c64CommandForm"),
    commandLabel: document.getElementById("c64CommandLabel"),
    run: document.getElementById("c64Run"),
    stop: document.getElementById("c64Stop"),
    continueRun: document.getElementById("c64Continue"),
    reset: document.getElementById("c64Reset"),
    newProject: document.getElementById("c64New"),
    clear: document.getElementById("c64Clear"),
    save: document.getElementById("c64Save"),
    open: document.getElementById("c64Open"),
    file: document.getElementById("c64File"),
    sound: document.getElementById("c64Sound"),
    soundState: document.getElementById("c64SoundState"),
    crt: document.getElementById("c64Crt"),
    transcriptToggle: document.getElementById("c64TranscriptToggle"),
    status: document.getElementById("c64Status"),
    live: document.getElementById("c64LiveStatus"),
    program: document.getElementById("c64ProgramListing"),
    lessonNav: document.getElementById("c64LessonNav"),
    lessonStep: document.getElementById("c64LessonStep"),
    lessonTitle: document.getElementById("c64LessonTitle"),
    lessonObjective: document.getElementById("c64LessonObjective"),
    lessonHistory: document.getElementById("c64LessonHistory"),
    lessonChallenge: document.getElementById("c64LessonChallenge"),
    hint: document.getElementById("c64HintText"),
    hintButton: document.getElementById("c64Hint"),
    solution: document.getElementById("c64Solution"),
    restore: document.getElementById("c64Restore"),
    next: document.getElementById("c64Next"),
    free: document.getElementById("c64Free"),
    completion: document.getElementById("c64LessonComplete"),
    memoryBody: document.getElementById("c64MemoryBody"),
    specialKeys: document.getElementById("c64SpecialKeys")
  };

  let worker = null;
  let workerId = 0;
  let stopTimer = null;
  let started = false;
  let source = "";
  let runtime = { status: "ready", variables: {}, metrics: {} };
  let machine = null;
  let currentLesson = lessons[0];
  let mode = "lesson";
  let eventHistory = [];
  let lessonEvents = [];
  let commandHistory = [];
  let commandHistoryIndex = 0;
  let transcript = "";
  let hintIndex = 0;
  let memoryValues = new Map();
  let completed = new Set();
  let saveTimer = null;
  const responseWaiters = new Map();

  const renderer = new window.C64Screen.Renderer(elements.canvas, {
    description: elements.canvasDescription,
    screenText: elements.screenText
  });

  function previewSnapshot() {
    const screen = new Array(1000).fill(32);
    const colors = new Array(1000).fill(14);
    const lines = [
      "    **** COMMODORE 64 BASIC V2 ****",
      "",
      " 64K RAM SYSTEM  38911 BASIC BYTES FREE",
      "",
      " READY."
    ];
    function code(character) {
      const value = character.charCodeAt(0);
      if (value >= 65 && value <= 90) return value - 64;
      return value;
    }
    lines.forEach(function (line, row) {
      Array.from(line.slice(0, 40)).forEach(function (character, column) {
        screen[row * 40 + column] = code(character);
      });
    });
    return {
      screen: screen,
      colors: colors,
      border: 14,
      background: 6,
      cursor: 5 * 40 + 1,
      textColor: 14,
      sprites: [],
      description: locale === "de" ?
        "C64-Lehrbildschirm mit Startmeldung; keine Sprites aktiv." :
        "C64 teaching display with startup message; no sprites enabled.",
      transcript: lines.join("\n")
    };
  }

  renderer.render(previewSnapshot());

  function loadSavedState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      if (typeof saved.source === "string" && saved.source.length <= 65536) source = saved.source;
      if (Array.isArray(saved.completed)) completed = new Set(saved.completed.filter(function (id) {
        return lessons.some(function (lesson) { return lesson.id === id; });
      }));
      const hashId = location.hash.replace(/^#lesson-/, "");
      const lessonId = lessons.some(function (lesson) { return lesson.id === hashId; }) ? hashId : saved.lesson;
      if (lessonId) currentLesson = lessonsApi.byId(lessonId);
      if (saved.crt === true && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        document.body.classList.add("c64-crt-enabled");
        elements.crt.setAttribute("aria-pressed", "true");
      }
      if (saved.transcript === true) {
        elements.transcriptPanel.hidden = false;
        elements.transcriptToggle.setAttribute("aria-pressed", "true");
      }
    } catch (error) {}
  }

  function persist() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          version: 2,
          source: source.slice(0, 65536),
          lesson: currentLesson.id,
          completed: Array.from(completed),
          crt: document.body.classList.contains("c64-crt-enabled"),
          transcript: !elements.transcriptPanel.hidden,
          mode: mode
        }));
      } catch (error) {}
    }, 120);
  }

  function announce(message) {
    elements.live.textContent = "";
    requestAnimationFrame(function () { elements.live.textContent = message; });
  }

  function setStatus(status, announcement) {
    elements.status.dataset.state = status;
    elements.status.textContent = announcement;
    if (elements.status.dataset.lastAnnouncement !== announcement) {
      elements.status.dataset.lastAnnouncement = announcement;
      announce(announcement);
    }
  }

  function post(type, data) {
    if (!worker) return null;
    const id = ++workerId;
    worker.postMessage(Object.assign({ type: type, id: id }, data || {}));
    return id;
  }

  function createWorker() {
    if (worker) worker.terminate();
    worker = new Worker(new URL("c64-worker.js", assetBase));
    worker.addEventListener("message", handleWorkerMessage);
    worker.addEventListener("error", function () {
      setStatus("error", text.internalError);
    });
    post("init", { source: source });
  }

  function handleWorkerMessage(event) {
    const batch = event.data || {};
    if (batch.response && responseWaiters.has(batch.response.id)) {
      responseWaiters.get(batch.response.id)(batch.response);
      responseWaiters.delete(batch.response.id);
    }
    if (batch.response && batch.response.action === "stop") {
      clearTimeout(stopTimer);
      stopTimer = null;
    }
    if (batch.session) {
      runtime = batch.session.runtime || runtime;
      source = batch.session.source == null ? source : batch.session.source;
      updateProgramListing();
    }
    if (batch.machine) {
      machine = batch.machine;
      renderer.render(machine);
    }
    for (const item of batch.events || []) consumeEvent(item);
    updateRuntimeUi();
    renderMemory();
    validateCurrentLesson();
    persist();
  }

  function appendTranscript(value, newline) {
    transcript += String(value || "") + (newline ? "\n" : "");
    if (transcript.length > MAX_TRANSCRIPT) {
      transcript = "[Earlier output truncated]\n" + transcript.slice(-MAX_TRANSCRIPT + 27);
    }
    elements.transcript.textContent = transcript;
    elements.transcript.scrollTop = elements.transcript.scrollHeight;
  }

  function consumeEvent(item) {
    eventHistory.push(item);
    lessonEvents.push(item);
    if (eventHistory.length > MAX_EVENT_HISTORY) eventHistory.splice(0, eventHistory.length - MAX_EVENT_HISTORY);
    if (lessonEvents.length > MAX_EVENT_HISTORY) lessonEvents.splice(0, lessonEvents.length - MAX_EVENT_HISTORY);

    if (item.type === "output") appendTranscript(item.text, item.newline);
    if (item.type === "memory") {
      memoryValues.set(item.address, item.value);
      if (memoryValues.size > 80) memoryValues.delete(memoryValues.keys().next().value);
    }
    if (item.type === "audio") audio.handle(item.address, item.value);
    if (item.type === "internal-error") setStatus("error", text.internalError);
    if (item.type === "notice" && item.code === "program-active") announce(text.activeProgram);
    if (item.type === "pause") setStatus("paused", text.paused);
    if (item.type === "status" && item.status === "ready" && item.reason !== "error") setStatus("ready", text.ready);
    if (item.type === "error") {
      const suffix = item.line == null ? "" : " IN " + item.line;
      setStatus("error", "?" + item.message + " ERROR" + suffix);
    }
  }

  function updateRuntimeUi() {
    const status = runtime.status || "ready";
    const running = status === "running";
    const paused = status === "paused";
    const waiting = status === "waiting-input";
    elements.run.disabled = running || waiting;
    elements.stop.disabled = !running && !paused && !waiting;
    elements.continueRun.hidden = !paused;
    elements.command.disabled = running || paused;
    elements.commandLabel.textContent = waiting ?
      (locale === "de" ? "INPUT-Antwort" : "INPUT response") :
      (locale === "de" ? "BASIC-Eingabe" : "BASIC input");
    if (waiting) setStatus("waiting", text.waiting);
    else if (running) setStatus("running", text.running);
    else if (paused) setStatus("paused", text.paused);
    else if (status === "internal-error") setStatus("error", text.internalError);
    else if (elements.status.dataset.state !== "error") setStatus("ready", text.ready);
  }

  function updateProgramListing() {
    elements.program.textContent = source || text.noProgram;
    elements.program.setAttribute("aria-label", text.programLabel);
  }

  function startLab() {
    if (!started) {
      started = true;
      elements.lab.hidden = false;
      elements.start.disabled = true;
      elements.start.textContent = locale === "de" ? "LABOR AKTIV" : "LAB ACTIVE";
      createWorker();
    }
    elements.lab.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    setTimeout(function () { elements.command.focus({ preventScroll: true }); }, 80);
  }

  function submitCommand(command) {
    if (!started) startLab();
    command = String(command == null ? elements.command.value : command).trimEnd();
    if (!command.trim()) return;
    commandHistory.push(command);
    commandHistory = commandHistory.slice(-50);
    commandHistoryIndex = commandHistory.length;
    elements.command.value = "";
    post("submit", { value: command });
  }

  function hardStop() {
    if (!worker) return;
    const id = post("stop");
    clearTimeout(stopTimer);
    stopTimer = setTimeout(function () {
      if (!worker) return;
      worker.terminate();
      worker = null;
      audio.hardMute();
      createWorker();
      setStatus("ready", text.workerRestart);
    }, 100);
    responseWaiters.set(id, function () {
      clearTimeout(stopTimer);
      stopTimer = null;
      audio.hardMute();
      setStatus("ready", text.stopped);
    });
  }

  function loadSource(nextSource, force) {
    if (!force && source.trim() && source.trim() !== String(nextSource || "").trim() && !window.confirm(text.replace)) return;
    if (!started) startLab();
    lessonEvents = [];
    transcript = "";
    elements.transcript.textContent = "";
    memoryValues.clear();
    source = String(nextSource || "");
    updateProgramListing();
    post("load-source", { source: source });
    announce(text.loaded);
  }

  function renderLessonNavigation() {
    elements.lessonNav.textContent = "";
    lessons.forEach(function (lesson) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "c64-lesson-tab";
      button.dataset.lessonId = lesson.id;
      button.setAttribute("aria-current", String(mode === "lesson" && lesson.id === currentLesson.id));
      const copy = lesson.copy[locale];
      button.innerHTML = "<span>" + String(lesson.number).padStart(2, "0") + "</span><b></b>";
      button.querySelector("b").textContent = copy.title;
      if (completed.has(lesson.id)) {
        button.classList.add("is-complete");
        button.setAttribute("aria-label", copy.title + " — " + text.completed);
      }
      button.addEventListener("click", function () { selectLesson(lesson.id); });
      elements.lessonNav.appendChild(button);
    });
  }

  function renderLesson() {
    const copy = currentLesson.copy[locale];
    elements.lessonStep.textContent = text.step + " " + currentLesson.number + " " + text.of + " " + lessons.length;
    elements.lessonTitle.textContent = copy.title;
    elements.lessonObjective.previousElementSibling.textContent = text.objective;
    elements.lessonHistory.previousElementSibling.textContent = text.history;
    elements.lessonChallenge.previousElementSibling.textContent = text.challenge;
    elements.lessonObjective.textContent = copy.objective;
    elements.lessonHistory.textContent = copy.history;
    elements.lessonChallenge.textContent = copy.challenge;
    elements.hint.textContent = "";
    elements.hint.hidden = true;
    hintIndex = 0;
    elements.hintButton.textContent = text.hint;
    elements.solution.textContent = text.solution;
    elements.restore.textContent = text.restore;
    elements.next.textContent = currentLesson.number === lessons.length ?
      (locale === "de" ? "Freies Programmieren" : "Free programming") : text.next;
    elements.completion.hidden = !completed.has(currentLesson.id);
    elements.completion.textContent = completed.has(currentLesson.id) ?
      text.completed + " — " + copy.success : "";
    renderLessonNavigation();
  }

  function renderFreeMode() {
    elements.lessonStep.textContent = locale === "de" ? "FREIER MODUS" : "FREE MODE";
    elements.lessonTitle.textContent = text.freeTitle;
    elements.lessonObjective.previousElementSibling.textContent = text.objective;
    elements.lessonHistory.previousElementSibling.textContent = text.history;
    elements.lessonChallenge.previousElementSibling.textContent = text.challenge;
    elements.lessonObjective.textContent = text.freeObjective;
    elements.lessonHistory.textContent = text.freeHistory;
    elements.lessonChallenge.textContent = text.freeChallenge;
    elements.hint.hidden = true;
    elements.completion.hidden = true;
    elements.solution.hidden = true;
    elements.restore.hidden = true;
    elements.next.hidden = true;
    elements.hintButton.hidden = true;
    renderLessonNavigation();
  }

  function selectLesson(id) {
    mode = "lesson";
    currentLesson = lessonsApi.byId(id);
    lessonEvents = [];
    elements.solution.hidden = false;
    elements.restore.hidden = false;
    elements.next.hidden = false;
    elements.hintButton.hidden = false;
    history.replaceState(null, "", "#lesson-" + currentLesson.id);
    renderLesson();
    persist();
  }

  function showHint() {
    const hints = currentLesson.copy[locale].hints;
    if (elements.hint.hidden) {
      hintIndex = 0;
      elements.hint.hidden = false;
    } else if (hintIndex < hints.length - 1) {
      hintIndex += 1;
    } else {
      elements.hint.hidden = true;
      elements.hintButton.textContent = text.hint;
      return;
    }
    elements.hint.textContent = hints.slice(0, hintIndex + 1).join(" ");
    elements.hintButton.textContent = hintIndex < hints.length - 1 ? text.secondHint : text.hideHint;
  }

  function loadLessonContent(solution) {
    if (currentLesson.command) {
      elements.command.value = currentLesson.command;
      elements.command.focus();
      return;
    }
    loadSource(solution ? currentLesson.solution : currentLesson.starter, false);
  }

  function validateCurrentLesson() {
    if (mode !== "lesson" || completed.has(currentLesson.id)) return;
    const passed = lessonsApi.validateLesson(currentLesson.id, {
      events: lessonEvents,
      machine: machine,
      runtime: runtime,
      source: source
    });
    if (!passed) return;
    completed.add(currentLesson.id);
    elements.completion.hidden = false;
    elements.completion.textContent = text.completed + " — " + currentLesson.copy[locale].success;
    announce(currentLesson.id === "star-runner" ? text.completeStar : elements.completion.textContent);
    renderLessonNavigation();
    persist();
  }

  function nextLesson() {
    const index = lessons.findIndex(function (lesson) { return lesson.id === currentLesson.id; });
    if (index >= lessons.length - 1) enterFreeMode();
    else selectLesson(lessons[index + 1].id);
  }

  function enterFreeMode() {
    mode = "free";
    history.replaceState(null, "", "#free");
    renderFreeMode();
    persist();
  }

  function addressLabel(address) {
    const labels = {
      1024: "SCREEN RAM",
      2040: "SPRITE 0 POINTER",
      53248: "SPRITE 0 X",
      53249: "SPRITE 0 Y",
      53264: "SPRITE X HIGH",
      53269: "SPRITE ENABLE",
      53280: "BORDER",
      53281: "BACKGROUND",
      53287: "SPRITE 0 COLOR",
      54272: "SID FREQ LOW",
      54273: "SID FREQ HIGH",
      54276: "SID CONTROL",
      54277: "SID ATTACK/DECAY",
      54278: "SID SUSTAIN/RELEASE",
      54296: "SID VOLUME",
      55296: "COLOR RAM"
    };
    if (labels[address]) return labels[address];
    if (address >= 1024 && address <= 2023) return "SCREEN +" + (address - 1024);
    if (address >= 55296 && address <= 56295) return "COLOR +" + (address - 55296);
    if (address >= 832 && address <= 894) return "SPRITE DATA +" + (address - 832);
    return "MEMORY";
  }

  function renderMemory() {
    elements.memoryBody.textContent = "";
    const entries = Array.from(memoryValues.entries()).slice(-10).reverse();
    if (!entries.length) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 3;
      cell.textContent = text.memoryEmpty;
      row.appendChild(cell);
      elements.memoryBody.appendChild(row);
      return;
    }
    entries.forEach(function (entry) {
      const row = document.createElement("tr");
      [String(entry[0]), addressLabel(entry[0]), String(entry[1])].forEach(function (value) {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.appendChild(cell);
      });
      elements.memoryBody.appendChild(row);
    });
  }

  function saveProject() {
    const blob = new Blob([source + (source ? "\n" : "")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "c64-program.bas";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    persist();
    announce(text.saved);
  }

  function openProject(file) {
    if (!file || file.size > 65536) {
      announce(text.invalidFile);
      return;
    }
    const reader = new FileReader();
    reader.addEventListener("load", function () {
      const value = String(reader.result || "");
      if (value.length > 65536 || value.split(/\r?\n/).length > 2000) {
        announce(text.invalidFile);
        return;
      }
      loadSource(value, false);
    });
    reader.addEventListener("error", function () { announce(text.invalidFile); });
    reader.readAsText(file);
  }

  class AudioEngine {
    constructor() {
      this.enabled = false;
      this.context = null;
      this.master = null;
      this.oscillator = null;
      this.registers = new Uint8Array(25);
    }

    async toggle() {
      if (!this.enabled) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        this.context = this.context || new AudioContext();
        this.master = this.master || this.context.createGain();
        this.master.gain.value = 0;
        this.master.connect(this.context.destination);
        await this.context.resume();
        this.enabled = true;
      } else {
        this.enabled = false;
        this.hardMute();
      }
      elements.sound.setAttribute("aria-pressed", String(this.enabled));
      elements.soundState.textContent = this.enabled ? text.soundOn : text.soundOff;
      announce(elements.soundState.textContent);
    }

    frequency() {
      const register = this.registers[0] + this.registers[1] * 256;
      return Math.max(20, Math.min(12000, register * 985248 / 16777216));
    }

    waveform(control) {
      if (control & 32) return "sawtooth";
      if (control & 64) return "square";
      return "triangle";
    }

    startVoice(control) {
      if (!this.enabled || !this.context || !this.master) return;
      this.stopVoice();
      const oscillator = this.context.createOscillator();
      oscillator.type = this.waveform(control);
      oscillator.frequency.value = this.frequency();
      oscillator.connect(this.master);
      const volume = (this.registers[24] & 15) / 15 * 0.12;
      const attack = ((this.registers[5] >> 4) & 15) / 15 * 0.35;
      const now = this.context.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setValueAtTime(0.0001, now);
      this.master.gain.linearRampToValueAtTime(volume, now + attack + 0.005);
      oscillator.start();
      this.oscillator = oscillator;
    }

    stopVoice() {
      if (!this.oscillator || !this.context || !this.master) return;
      const oscillator = this.oscillator;
      const now = this.context.currentTime;
      const release = (this.registers[6] & 15) / 15 * 0.4 + 0.015;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(0.0001, now, release / 4);
      try { oscillator.stop(now + release); } catch (error) {}
      this.oscillator = null;
    }

    hardMute() {
      if (this.oscillator) {
        try { this.oscillator.stop(); } catch (error) {}
        this.oscillator = null;
      }
      if (this.master && this.context) this.master.gain.setValueAtTime(0, this.context.currentTime);
    }

    handle(address, value) {
      if (address < 54272 || address > 54296) return;
      this.registers[address - 54272] = value & 255;
      elements.soundState.dataset.activity = "true";
      clearTimeout(this.activityTimer);
      this.activityTimer = setTimeout(function () { delete elements.soundState.dataset.activity; }, 180);
      if (!this.enabled || !this.context) return;
      if ((address === 54272 || address === 54273) && this.oscillator) this.oscillator.frequency.value = this.frequency();
      if (address === 54296 && this.master && this.oscillator) {
        this.master.gain.setTargetAtTime((value & 15) / 15 * 0.12, this.context.currentTime, 0.01);
      }
      if (address === 54276) {
        if (value & 1) this.startVoice(value);
        else this.stopVoice();
      }
    }

    suspend() {
      this.hardMute();
      if (this.context && this.context.state === "running") this.context.suspend();
    }
  }

  const audio = new AudioEngine();

  elements.start.addEventListener("click", startLab);
  elements.commandForm.addEventListener("submit", function (event) {
    event.preventDefault();
    submitCommand();
  });
  elements.command.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      event.preventDefault();
      hardStop();
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      commandHistoryIndex = Math.max(0, commandHistoryIndex - 1);
      elements.command.value = commandHistory[commandHistoryIndex] || "";
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      commandHistoryIndex = Math.min(commandHistory.length, commandHistoryIndex + 1);
      elements.command.value = commandHistory[commandHistoryIndex] || "";
    }
  });

  elements.run.addEventListener("click", function () { submitCommand("RUN"); });
  elements.stop.addEventListener("click", hardStop);
  elements.continueRun.addEventListener("click", function () { post("continue"); });
  elements.reset.addEventListener("click", function () {
    post("reset");
    transcript = "";
    elements.transcript.textContent = "";
    audio.hardMute();
    announce(text.resetDone);
  });
  elements.newProject.addEventListener("click", function () {
    if (!source.trim() || window.confirm(text.newProject)) submitCommand("NEW");
  });
  elements.clear.addEventListener("click", function () {
    post("clear-screen");
    announce(text.screenCleared);
  });
  elements.save.addEventListener("click", saveProject);
  elements.open.addEventListener("click", function () { elements.file.click(); });
  elements.file.addEventListener("change", function () {
    openProject(elements.file.files && elements.file.files[0]);
    elements.file.value = "";
  });
  elements.sound.addEventListener("click", function () { audio.toggle(); });
  elements.crt.addEventListener("click", function () {
    const enabled = !document.body.classList.contains("c64-crt-enabled");
    document.body.classList.toggle("c64-crt-enabled", enabled);
    elements.crt.setAttribute("aria-pressed", String(enabled));
    announce(enabled ? text.crtOn : text.crtOff);
    persist();
  });
  elements.transcriptToggle.addEventListener("click", function () {
    const show = elements.transcriptPanel.hidden;
    elements.transcriptPanel.hidden = !show;
    elements.transcriptToggle.setAttribute("aria-pressed", String(show));
    announce(show ? text.transcriptShown : text.transcriptHidden);
    persist();
  });
  elements.hintButton.addEventListener("click", showHint);
  elements.solution.addEventListener("click", function () { loadLessonContent(true); });
  elements.restore.addEventListener("click", function () { loadLessonContent(false); });
  elements.next.addEventListener("click", nextLesson);
  elements.free.addEventListener("click", enterFreeMode);

  elements.specialKeys.addEventListener("click", function (event) {
    const button = event.target.closest("button[data-c64-key]");
    if (!button) return;
    const key = button.dataset.c64Key;
    if (key === "RETURN") submitCommand();
    else if (key === "RUN") submitCommand("RUN");
    else if (key === "STOP") hardStop();
    else if (key === "CLR") post("clear-screen");
    else if (key === "LEFT" || key === "RIGHT") {
      const position = elements.command.selectionStart || 0;
      const next = key === "LEFT" ? Math.max(0, position - 1) : Math.min(elements.command.value.length, position + 1);
      elements.command.focus();
      elements.command.setSelectionRange(next, next);
    }
  });

  document.addEventListener("keydown", function (event) {
    if (!started || runtime.status !== "running") return;
    if (event.key === "Escape") {
      event.preventDefault();
      hardStop();
      return;
    }
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      post("keys", { value: event.key.toUpperCase() });
    }
  });

  document.addEventListener("visibilitychange", function () {
    if (!worker) return;
    if (document.hidden) {
      post("suspend");
      audio.suspend();
    } else {
      post("resume");
    }
  });

  window.addEventListener("pagehide", function () {
    persist();
    audio.hardMute();
  });

  loadSavedState();
  if (location.hash === "#free") mode = "free";
  updateProgramListing();
  renderMemory();
  if (mode === "free") renderFreeMode();
  else renderLesson();
  elements.soundState.textContent = text.soundOff;
  setStatus("ready", text.ready);
})();
