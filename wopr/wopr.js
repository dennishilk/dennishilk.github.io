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
const JOSHUA_ALARM_PULSES = 3;
const JOSHUA_ROCKET_LAUNCH_WINDOW = 0.9;

let joshuaAudioContext = null;
let joshuaSequenceActive = false;
let joshuaDismissHandler = null;

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

async function playJoshuaAlarm() {
  try {
    const context = await readyJoshuaAudioContext();
    if (!context) return;

    const now = context.currentTime;
    const masterGain = context.createGain();
    masterGain.gain.setValueAtTime(0.0001, now);
    masterGain.connect(context.destination);

    for (let pulse = 0; pulse < JOSHUA_ALARM_PULSES; pulse += 1) {
      const start = now + (pulse * 0.25);
      const end = start + 0.15;
      const oscillator = context.createOscillator();
      const pulseGain = context.createGain();

      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(520 + (pulse * 35), start);
      oscillator.frequency.linearRampToValueAtTime(760 + (pulse * 45), start + 0.075);
      oscillator.frequency.linearRampToValueAtTime(610 + (pulse * 30), end);

      pulseGain.gain.setValueAtTime(0.0001, start);
      pulseGain.gain.linearRampToValueAtTime(0.16, start + 0.018);
      pulseGain.gain.linearRampToValueAtTime(0.1, start + 0.09);
      pulseGain.gain.exponentialRampToValueAtTime(0.0001, end);

      oscillator.connect(pulseGain);
      pulseGain.connect(masterGain);
      oscillator.start(start);
      oscillator.stop(end + 0.02);
      oscillator.addEventListener("ended", () => {
        oscillator.disconnect();
        pulseGain.disconnect();
      }, { once: true });
    }

    window.setTimeout(() => masterGain.disconnect(), 1050);
    await new Promise((resolve) => window.setTimeout(resolve, 900));
  } catch (error) {
    // Audio is celebratory only; blocked playback must not interrupt the Easter egg.
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
    const isLeftGutter = Math.random() < 0.5;
    const startX = isLeftGutter ? Math.random() * 34 : 66 + Math.random() * 34;
    const driftDirection = isLeftGutter ? 1 : -1;
    const drift = driftDirection * (6 + Math.random() * 20);
    const midDrift = drift * (0.35 + Math.random() * 0.3);
    const rise = 110 + Math.random() * 24;
    const delay = reduceMotion ? Math.random() * 0.35 : (index / Math.max(rocketCount - 1, 1)) * JOSHUA_ROCKET_LAUNCH_WINDOW;
    const duration = reduceMotion ? 1.8 : 4 + Math.random();
    const rotation = driftDirection * (10 + Math.random() * 18);

    rocket.className = "joshua-rocket";
    rocket.textContent = "🚀";
    rocket.style.setProperty("--rocket-size", `${size}px`);
    rocket.style.setProperty("--rocket-start", `${startX}vw`);
    rocket.style.setProperty("--rocket-drift", `${drift}vw`);
    rocket.style.setProperty("--rocket-mid-drift", `${midDrift}vw`);
    rocket.style.setProperty("--rocket-rise", `${rise}vh`);
    rocket.style.setProperty("--rocket-delay", `${delay}s`);
    rocket.style.setProperty("--rocket-duration", `${duration}s`);
    rocket.style.setProperty("--rocket-rotation", `${rotation}deg`);
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
  await new Promise((resolve) => window.setTimeout(resolve, 420));
  await playJoshuaAlarm();
  await new Promise((resolve) => window.setTimeout(resolve, 240));
  const rocketLayer = createJoshuaRockets();

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
  const dismiss = (event) => dismissJoshuaSequence(overlay, rocketLayer, event);
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
