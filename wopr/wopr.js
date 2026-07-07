const AUTH_ENDPOINT = "/wopr/auth/login";
const DASHBOARD_URL = "/wopr/dashboard/";
const EVENT_ENDPOINT = "/wopr/auth/event";

const loginForm = document.getElementById("wopr-login");
const authMessage = document.getElementById("auth-message");
const gameSection = document.getElementById("game-section");
const boardElement = document.getElementById("tic-tac-toe-board");
const gameStatus = document.getElementById("game-status");
const resetButton = document.getElementById("reset-game");

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
