const AUTH_ENDPOINT = "/wopr/auth/login";
const DASHBOARD_URL = "/wopr/dashboard/";
const EVENT_ENDPOINT = "/wopr/auth/event";

const loginForm = document.getElementById("wopr-login");
const authMessage = document.getElementById("auth-message");
const gameSection = document.getElementById("game-section");
const boardElement = document.getElementById("tic-tac-toe-board");
const gameStatus = document.getElementById("game-status");
const resetButton = document.getElementById("reset-game");
const identifierInput = document.getElementById("wopr-identifier");
const passwordInput = document.getElementById("wopr-secret");

const JOSHUA_FILM_CREDENTIAL = "JOSHUA";
const JOSHUA_ROCKET_COUNT = 72;
const JOSHUA_ROCKET_MIN_SIZE = 18;
const JOSHUA_ROCKET_MAX_SIZE = 32;
const JOSHUA_DISMISS_ARM_DELAY = 220;
const JOSHUA_ALARM_SEGMENTS = 7;
const JOSHUA_ALARM_SEGMENT_DURATION = 0.26;
const JOSHUA_ALARM_SEGMENT_GAP = 0.12;
const JOSHUA_ALARM_START_DELAY = 360;
const JOSHUA_ROCKET_LAUNCH_DELAY = 720;
const JOSHUA_ROCKET_LAUNCH_WINDOW = 2.1;

let joshuaAudioContext = null;
let joshuaSequenceActive = false;
let joshuaDismissHandler = null;
let joshuaActiveAlarm = null;

const wins = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

let board = Array(9).fill("");
let gameOver = false;

function recordAnonymousEvent(type) {
  if (!navigator.sendBeacon) return;
  const payload = JSON.stringify({ type, at: new Date().toISOString() });
  navigator.sendBeacon(EVENT_ENDPOINT, new Blob([payload], { type: "application/json" }));
}

function setMessage(text, mode = "") {
  authMessage.textContent = text;
  authMessage.className = `auth-message ${mode}`.trim();
}


function isJoshuaFilmCredential(identifier, password) {
  return identifier.trim().toUpperCase() === JOSHUA_FILM_CREDENTIAL && password.trim().toUpperCase() === JOSHUA_FILM_CREDENTIAL;
}

function setLoginDisabled(isDisabled) {
  loginForm.querySelectorAll("input, button").forEach((control) => {
    control.disabled = isDisabled;
  });
}

function getJoshuaAudioContext() {
  const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextConstructor) return null;
  if (!joshuaAudioContext || joshuaAudioContext.state === "closed") {
    joshuaAudioContext = new AudioContextConstructor();
  }
  return joshuaAudioContext;
}

async function readyJoshuaAudioContext() {
  const context = getJoshuaAudioContext();
  if (!context) return null;
  if (context.state === "suspended") await context.resume();
  return context;
}

function cleanupJoshuaAlarm(alarm = joshuaActiveAlarm, fadeSeconds = 0.08) {
  if (!alarm) return;
  const { context, masterGain, nodes, cleanupTimer } = alarm;
  if (cleanupTimer) window.clearTimeout(cleanupTimer);

  try {
    const stopAt = context.currentTime + fadeSeconds;
    masterGain.gain.cancelScheduledValues(context.currentTime);
    masterGain.gain.setTargetAtTime(0.0001, context.currentTime, Math.max(0.01, fadeSeconds / 3));
    nodes.forEach((node) => {
      try { node.stop(stopAt + 0.02); } catch (error) { /* Node may already be stopped. */ }
    });
  } catch (error) {
    // Cleanup is best-effort; dismissal must still restore the login state.
  }

  window.setTimeout(() => {
    nodes.forEach((node) => {
      try { node.disconnect(); } catch (error) { /* Node may already be disconnected. */ }
    });
    try { masterGain.disconnect(); } catch (error) { /* Node may already be disconnected. */ }
    if (joshuaActiveAlarm === alarm) joshuaActiveAlarm = null;
  }, Math.ceil((fadeSeconds + 0.08) * 1000));
}

async function playJoshuaAlarm() {
  try {
    const context = await readyJoshuaAudioContext();
    if (!context) return null;

    cleanupJoshuaAlarm(joshuaActiveAlarm, 0.03);

    const now = context.currentTime + 0.035;
    const masterGain = context.createGain();
    const nodes = [];
    const alarmDuration = (JOSHUA_ALARM_SEGMENTS * JOSHUA_ALARM_SEGMENT_DURATION) + ((JOSHUA_ALARM_SEGMENTS - 1) * JOSHUA_ALARM_SEGMENT_GAP);
    const stopAt = now + alarmDuration + 0.12;

    masterGain.gain.setValueAtTime(0.0001, now);
    masterGain.gain.linearRampToValueAtTime(0.18, now + 0.035);
    masterGain.gain.setValueAtTime(0.18, now + alarmDuration - 0.12);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, stopAt);
    masterGain.connect(context.destination);

    const primary = context.createOscillator();
    const body = context.createOscillator();
    primary.type = "square";
    body.type = "triangle";
    nodes.push(primary, body);

    for (let segment = 0; segment < JOSHUA_ALARM_SEGMENTS; segment += 1) {
      const start = now + (segment * (JOSHUA_ALARM_SEGMENT_DURATION + JOSHUA_ALARM_SEGMENT_GAP));
      const end = start + JOSHUA_ALARM_SEGMENT_DURATION;
      const frequency = segment % 2 === 0 ? 520 : 780;
      primary.frequency.setValueAtTime(frequency, start);
      primary.frequency.setValueAtTime(frequency, end);
      body.frequency.setValueAtTime(frequency / 2, start);
      body.frequency.setValueAtTime(frequency / 2, end);
    }

    const primaryGain = context.createGain();
    const bodyGain = context.createGain();
    nodes.push(primaryGain, bodyGain);
    primaryGain.gain.setValueAtTime(0.74, now);
    bodyGain.gain.setValueAtTime(0.28, now);
    primary.connect(primaryGain).connect(masterGain);
    body.connect(bodyGain).connect(masterGain);
    primary.start(now);
    body.start(now);
    primary.stop(stopAt);
    body.stop(stopAt);

    const alarm = { context, masterGain, nodes, cleanupTimer: null };
    joshuaActiveAlarm = alarm;
    alarm.cleanupTimer = window.setTimeout(() => cleanupJoshuaAlarm(alarm, 0), Math.ceil((stopAt - context.currentTime + 0.05) * 1000));
    return alarm;
  } catch (error) {
    if (console && typeof console.warn === "function") console.warn("Joshua alarm audio could not be started.", error);
    return null;
  }
}

function createJoshuaRockets() {
  const layer = document.createElement("div");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  layer.className = `joshua-rocket-layer${reduceMotion ? " reduced-motion" : ""}`;
  layer.setAttribute("aria-hidden", "true");
  document.body.appendChild(layer);

  const rocketCount = reduceMotion ? 8 : JOSHUA_ROCKET_COUNT;
  let longestFlight = 0;

  for (let index = 0; index < rocketCount; index += 1) {
    const rocket = document.createElement("span");
    const size = reduceMotion ? 18 : JOSHUA_ROCKET_MIN_SIZE + Math.round(Math.random() * (JOSHUA_ROCKET_MAX_SIZE - JOSHUA_ROCKET_MIN_SIZE));
    const startX = Math.random() * 100;
    const driftDirection = Math.random() < 0.5 ? 1 : -1;
    const drift = driftDirection * (4 + Math.random() * 14);
    const delay = reduceMotion ? Math.random() * 0.35 : (index / Math.max(rocketCount - 1, 1)) * JOSHUA_ROCKET_LAUNCH_WINDOW;
    const duration = reduceMotion ? 1.8 : 4.5 + (Math.random() * 2.5);
    const startRotation = driftDirection * (8 + Math.random() * 12);
    const endRotation = startRotation + (driftDirection * (8 + Math.random() * 18));

    rocket.className = "joshua-rocket";
    rocket.textContent = "🚀";
    rocket.style.setProperty("--rocket-size", `${size}px`);
    rocket.style.setProperty("--rocket-start", `${startX}vw`);
    rocket.style.setProperty("--rocket-drift", `${drift}vw`);
    rocket.style.setProperty("--rocket-delay", `${delay}s`);
    rocket.style.setProperty("--rocket-duration", `${duration}s`);
    rocket.style.setProperty("--rocket-start-rotation", `${startRotation}deg`);
    rocket.style.setProperty("--rocket-end-rotation", `${endRotation}deg`);
    layer.appendChild(rocket);
    longestFlight = Math.max(longestFlight, delay + duration);
  }

  window.setTimeout(() => layer.remove(), reduceMotion ? 2600 : Math.ceil((longestFlight + 0.25) * 1000));
  return layer;
}

function dismissJoshuaSequence(overlay, rocketLayer, event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  if (joshuaDismissHandler) {
    window.removeEventListener("keydown", joshuaDismissHandler, true);
    joshuaDismissHandler = null;
  }
  overlay.remove();
  cleanupJoshuaAlarm();
  if (rocketLayer) rocketLayer.remove();
  passwordInput.value = "";
  setLoginDisabled(false);
  joshuaSequenceActive = false;
  setMessage("Awaiting credentials. Transmission requires HTTPS and server-side session auth.");
  identifierInput.focus({ preventScroll: true });
}

async function startJoshuaFilmSequence() {
  if (joshuaSequenceActive) return;
  joshuaSequenceActive = true;
  setLoginDisabled(true);
  setMessage("JOSHUA REFERENCE ACCEPTED.", "success");

  await readyJoshuaAudioContext();

  let rocketLayer = null;
  const alarmTimer = window.setTimeout(() => {
    playJoshuaAlarm();
  }, JOSHUA_ALARM_START_DELAY);
  const rocketTimer = window.setTimeout(() => {
    if (joshuaSequenceActive) rocketLayer = createJoshuaRockets();
  }, JOSHUA_ROCKET_LAUNCH_DELAY);

  const overlay = document.createElement("div");
  overlay.className = "joshua-achievement-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-labelledby", "joshua-achievement-title");
  overlay.innerHTML = `
    <div class="joshua-achievement-panel">
      <pre aria-hidden="true">══════════════════════════════════════════════</pre>
      <h2 id="joshua-achievement-title">★ FILM ENTHUSIAST DETECTED ★</h2>
      <p>Congratulations!</p>
      <p>You recognized one of the most iconic<br />computer movie references of the 1980s.</p>
      <p>Joshua was the name of Professor Falken's son<br />and the famous backdoor password in WarGames.</p>
      <p>Thanks for helping keep classic computing<br />history alive.</p>
      <p>The only winning move...<br />is to keep learning.</p>
      <pre aria-hidden="true">══════════════════════════════════════════════</pre>
      <p class="joshua-continue-copy">Press any key to continue...</p>
      <button type="button" class="joshua-continue-button">CONTINUE</button>
    </div>`;
  document.body.appendChild(overlay);

  const continueButton = overlay.querySelector(".joshua-continue-button");
  const dismiss = (event) => {
    window.clearTimeout(alarmTimer);
    window.clearTimeout(rocketTimer);
    dismissJoshuaSequence(overlay, rocketLayer, event);
  };
  continueButton.addEventListener("click", dismiss, { once: true });
  continueButton.focus({ preventScroll: true });

  window.setTimeout(() => {
    joshuaDismissHandler = (event) => dismiss(event);
    window.addEventListener("keydown", joshuaDismissHandler, true);
  }, JOSHUA_DISMISS_ARM_DELAY);
}

function getWinner(state) {
  for (const [a, b, c] of wins) {
    if (state[a] && state[a] === state[b] && state[a] === state[c]) return state[a];
  }
  return state.includes("") ? null : "draw";
}

function bestMove() {
  const available = board.map((value, index) => value ? null : index).filter((value) => value !== null);
  for (const mark of ["O", "X"]) {
    for (const index of available) {
      const test = [...board];
      test[index] = mark;
      if (getWinner(test) === mark) return index;
    }
  }
  if (available.includes(4)) return 4;
  const corners = [0, 2, 6, 8].filter((index) => available.includes(index));
  if (corners.length) return corners[0];
  return available[0];
}

function finishIfNeeded() {
  const result = getWinner(board);
  if (!result) return false;
  gameOver = true;
  document.querySelectorAll(".cell").forEach((cell) => { cell.disabled = true; });
  recordAnonymousEvent("tictactoe_finished");
  if (result === "draw") {
    gameStatus.textContent = "A STRANGE GAME. THE ONLY WINNING MOVE IS NOT TO PLAY.";
  } else if (result === "X") {
    gameStatus.textContent = "YOU HAVE WON. WOPR REQUESTS A REMATCH.";
  } else {
    gameStatus.textContent = "WOPR WINS. A STRANGE GAME.";
  }
  return true;
}

function renderBoard() {
  boardElement.innerHTML = "";
  board.forEach((value, index) => {
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = `cell ${value.toLowerCase()}`.trim();
    cell.setAttribute("role", "gridcell");
    cell.setAttribute("aria-label", `Cell ${index + 1}${value ? ` occupied by ${value}` : " empty"}`);
    cell.textContent = value;
    cell.disabled = Boolean(value) || gameOver;
    cell.addEventListener("click", () => playerMove(index));
    boardElement.appendChild(cell);
  });
}

function woprMove() {
  if (gameOver) return;
  const move = bestMove();
  if (move === undefined) return;
  board[move] = "O";
  renderBoard();
  if (!finishIfNeeded()) gameStatus.textContent = "YOUR MOVE, PROFESSOR.";
}

function playerMove(index) {
  if (gameOver || board[index]) return;
  board[index] = "X";
  renderBoard();
  if (!finishIfNeeded()) {
    gameStatus.textContent = "WOPR IS THINKING.";
    window.setTimeout(woprMove, 420);
  }
}

function resetGame() {
  board = Array(9).fill("");
  gameOver = false;
  gameStatus.textContent = "YOUR MOVE, PROFESSOR.";
  renderBoard();
}

function startGame() {
  gameSection.hidden = false;
  recordAnonymousEvent("tictactoe_started");
  resetGame();
  gameSection.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

async function submitLogin(event) {
  event.preventDefault();
  const formData = new FormData(loginForm);
  const identifier = String(formData.get("identifier") || "").trim();
  const password = String(formData.get("password") || "");

  if (!identifier || !password) {
    setMessage("IDENTIFICATION INCOMPLETE.", "error");
    return;
  }

  if (isJoshuaFilmCredential(identifier, password)) {
    startJoshuaFilmSequence();
    return;
  }

  if (location.protocol !== "https:" && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") {
    setMessage("SECURE CHANNEL REQUIRED. USE HTTPS.", "error");
    return;
  }

  setMessage("TRANSMITTING IDENTIFICATION…");

  try {
    const response = await fetch(AUTH_ENDPOINT, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ identifier, password }),
    });

    loginForm.reset();

    if (response.ok) {
      recordAnonymousEvent("login_success");
      setMessage("IDENTIFICATION CONFIRMED. OPENING SECURE SESSION…", "success");
      window.location.assign(DASHBOARD_URL);
      return;
    }

    recordAnonymousEvent("login_failed");
    setMessage("IDENTIFICATION NOT RECOGNIZED.", "error");
    startGame();
  } catch (error) {
    loginForm.reset();
    setMessage("AUTHENTICATION SERVICE NOT ACTIVE YET. SERVER COMPONENT REQUIRED.", "error");
  }
}

loginForm.addEventListener("submit", submitLogin);
resetButton.addEventListener("click", resetGame);
renderBoard();
recordAnonymousEvent("wopr_view");

const culturalReference = document.querySelector("[data-typewriter='cultural-reference']");

function typeCulturalReference() {
  if (!culturalReference) return;

  const output = culturalReference.querySelector(".cultural-reference-text");
  if (!output) return;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const archiveText = output.textContent;

  if (prefersReducedMotion) {
    output.textContent = archiveText;
    return;
  }

  const characters = Array.from(archiveText);
  let index = 0;
  output.textContent = "";
  culturalReference.classList.add("is-typing");

  function typeNextCharacter() {
    output.textContent += characters[index] || "";
    index += 1;

    if (index >= characters.length) {
      culturalReference.classList.remove("is-typing");
      return;
    }

    const previousCharacter = characters[index - 1];
    const delay = previousCharacter === "\n" ? 340 : 36;
    window.setTimeout(typeNextCharacter, delay);
  }

  window.setTimeout(typeNextCharacter, 450);
}

typeCulturalReference();
