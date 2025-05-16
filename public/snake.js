// ======== Récupération DOM & Canvas ======== //
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const btnPause = document.getElementById("btn-pause");
const volumeSlider = document.getElementById("volume");
const menuPause = document.getElementById("menu-pause");
const btnResume = document.getElementById("resume-btn");

canvas.width = canvas.height = 400;

// ======== Constantes & État ======== //
const gridSize = 20;
const tileCount = canvas.width / gridSize;
let snake = [{ x: 10, y: 10 }];
let velocity = { x: 0, y: 0 };
let apple = { x: 5, y: 5 };
let score = 0;
let speed = 5;
let speedModifier = 1;
let lastTime = 0;
let isGameOver = false;
let paused = false;

let currentSnakeColor = { r: 0, g: 255, b: 0 };
let targetSnakeColor = { r: 0, g: 255, b: 0 };

// ======== Audio ======== //
const audioEat = new Audio("assets/sounds/eat.mp3");
const audioHit = new Audio("assets/sounds/hit.mp3");
const audioPause = new Audio("assets/sounds/pause.mp3");
const bgm = new Audio("assets/sounds/bgm.mp3");
const bonusBgm = new Audio("assets/sounds/bonus-music.mp3");
const audioBonusPick = new Audio("assets/sounds/bonus.mp3");
const audioSlow = new Audio("assets/sounds/slow.mp3");
const audioShield = new Audio("assets/sounds/shield.mp3");
bgm.loop = true;
bonusBgm.loop = true;

// ======== Power-ups ======== //
const POWERUPS = { SHIELD: "shield", DOUBLE: "double", SLOW: "slow" };
let currentPowerUp = null;
let powerUpPos = { x: 0, y: 0 };
let powerUpTimer = 0;
let scoreMultiplier = 1;
let shieldActive = false;
let activePowerUp = null;

// ======== Gestion du volume ======== //
[
  audioEat,
  audioHit,
  audioPause,
  bgm,
  bonusBgm,
  audioBonusPick,
  audioSlow,
  audioShield,
].forEach((a) => (a.volume = parseFloat(volumeSlider.value)));
volumeSlider.addEventListener("input", (e) => {
  const v = parseFloat(e.target.value);
  [
    audioEat,
    audioHit,
    audioPause,
    bgm,
    bonusBgm,
    audioBonusPick,
    audioSlow,
    audioShield,
  ].forEach((a) => (a.volume = v));
});

// ======== Boucle de jeu ======== //
function loop(timeStamp) {
  if (isGameOver || paused) return;
  requestAnimationFrame(loop);

  draw();

  const delta = (timeStamp - lastTime) / 1000;
  if (delta >= 1 / (speed * speedModifier)) {
    lastTime = timeStamp;
    update(delta);
  }
}

// Démarrage
window.addEventListener("load", () => {
  lastTime = performance.now();
  requestAnimationFrame(loop);
  bgm.play().catch(() => {});
  renderLeaderboard("score-list-top10");
});

let audioStarted = false;

function startAudio() {
  if (!audioStarted) {
    bgm.play().catch(() => {});
    audioStarted = true;
    document.removeEventListener("click", startAudio);
    document.removeEventListener("keydown", startAudio);
  }
}

document.addEventListener("click", startAudio);
document.addEventListener("keydown", startAudio);

function update(delta) {
  // Déplacement
  const head = { x: snake[0].x + velocity.x, y: snake[0].y + velocity.y };
  snake.unshift(head);

  // Collecte power-up
  if (currentPowerUp && head.x === powerUpPos.x && head.y === powerUpPos.y) {
    activePowerUp = currentPowerUp;
    switch (currentPowerUp) {
      case POWERUPS.SHIELD:
        shieldActive = true;
        powerUpTimer = 1;
        audioShield.play();
        targetSnakeColor = { r: 0, g: 255, b: 255 };
        break;
      case POWERUPS.DOUBLE:
        scoreMultiplier = 2;
        powerUpTimer = 10;
        speedModifier = 1.5;
        bgm.pause();
        bonusBgm.play();
        audioBonusPick.play();
        targetSnakeColor = { r: 255, g: 255, b: 0 };
        break;
      case POWERUPS.SLOW:
        speedModifier = 0.5;
        powerUpTimer = 5;
        audioSlow.play();
        targetSnakeColor = { r: 0, g: 0, b: 255 };
        break;
    }
    currentPowerUp = null;
  }

  // Manger pomme
  if (head.x === apple.x && head.y === apple.y) {
    audioEat.play();
    score += scoreMultiplier;
    scoreEl.textContent = `Score : ${score}`;
    placeApple();
    speed += 0.2;
  } else {
    snake.pop();
  }

  // Collision murs
  if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
    if (shieldActive) {
      head.x = (head.x + tileCount) % tileCount;
      head.y = (head.y + tileCount) % tileCount;
      shieldActive = false;
    } else return gameOver();
  }

  // Collision corps
  if (snake.slice(1).some((seg) => seg.x === head.x && seg.y === head.y)) {
    return gameOver();
  }

  // Timer power-up
  if (powerUpTimer > 0) {
    powerUpTimer -= delta;
    if (powerUpTimer <= 0) {
      scoreMultiplier = 1;
      speedModifier = 1;
      shieldActive = false;
      bonusBgm.pause();
      bgm.play();
      targetSnakeColor = { r: 0, g: 255, b: 0 };
      activePowerUp = null;
    }
  }

  // couleur serpent
  const t = Math.min(1, delta / 0.5);
  currentSnakeColor.r += (targetSnakeColor.r - currentSnakeColor.r) * t;
  currentSnakeColor.g += (targetSnakeColor.g - currentSnakeColor.g) * t;
  currentSnakeColor.b += (targetSnakeColor.b - currentSnakeColor.b) * t;
}

// ======== Draw ======== //
function draw() {
  // fond
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // serpent
  const snakeColor = `rgb(${Math.round(currentSnakeColor.r)},${Math.round(
    currentSnakeColor.g
  )},${Math.round(currentSnakeColor.b)})`;
  ctx.fillStyle = snakeColor;
  snake.forEach((seg) =>
    ctx.fillRect(seg.x * gridSize, seg.y * gridSize, gridSize - 2, gridSize - 2)
  );

  // pomme
  ctx.fillStyle = "#f00";
  ctx.fillRect(
    apple.x * gridSize,
    apple.y * gridSize,
    gridSize - 2,
    gridSize - 2
  );

  // icône power-up
  if (currentPowerUp) {
    const colors = { shield: "#0ff", double: "#ff0", slow: "#00f" };
    ctx.fillStyle = colors[currentPowerUp];
    ctx.fillRect(
      powerUpPos.x * gridSize,
      powerUpPos.y * gridSize,
      gridSize - 2,
      gridSize - 2
    );
  }

  // label bonus actif
  if (activePowerUp && powerUpTimer > 0) {
    ctx.fillStyle = "#fff";
    ctx.font = "16px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(
      `${activePowerUp.toUpperCase()}: ${powerUpTimer.toFixed(1)}s`,
      canvas.width / 2,
      canvas.height - 8
    );
    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";
  }
}

// ======== Pomme & spawn ======== //
function placeApple() {
  apple.x = Math.floor(Math.random() * tileCount);
  apple.y = Math.floor(Math.random() * tileCount);
  if (snake.some((seg) => seg.x === apple.x && seg.y === apple.y)) placeApple();
  maybeSpawnPowerUp();
}
function maybeSpawnPowerUp() {
  if (!currentPowerUp && Math.random() < 0.3) {
    const types = Object.values(POWERUPS);
    currentPowerUp = types[Math.floor(Math.random() * types.length)];
    do {
      powerUpPos.x = Math.floor(Math.random() * tileCount);
      powerUpPos.y = Math.floor(Math.random() * tileCount);
    } while (
      snake.some((s) => s.x === powerUpPos.x && s.y === powerUpPos.y) ||
      (powerUpPos.x === apple.x && powerUpPos.y === apple.y)
    );
  }
}

// ======== Fin & leaderboard ======== //
function gameOver() {
  isGameOver = true;
  bgm.pause();
  bgm.currentTime = 0;
  bonusBgm.pause();
  bonusBgm.currentTime = 0;
  audioHit.play();

  setTimeout(async () => {
    try {
      const scores = await fetchHighScores();
      const sorted = [...scores].sort((a, b) => b.score - a.score);
      const lowestFive = sorted.length < 10 ? 0 : sorted[9].score;

      // Si joueur entre dans le top 10
      if (sorted.length < 10 || score > lowestFive) {
        document.getElementById("leaderboard").classList.remove("hidden");
        document.getElementById("new-score-form").classList.remove("hidden");
      } else {
        // Seulement afficher leaderboard si joueur n’a pas fait de high score
        document.getElementById("leaderboard").classList.remove("hidden");
        document.getElementById("new-score-form").classList.add("hidden");
      }

      await renderLeaderboard();
    } catch (e) {
      console.error(e);
    }
  }, 100);
}

// ======== Reset / Play Again ======== //
function resetGame() {
  document.getElementById("leaderboard").classList.add("hidden");
  snake = [{ x: 10, y: 10 }];
  velocity = { x: 0, y: 0 };
  apple = { x: 5, y: 5 };
  score = 0;
  speed = 5;
  speedModifier = 1;
  scoreMultiplier = 1;
  shieldActive = false;
  currentPowerUp = null;
  powerUpTimer = 0;
  targetSnakeColor = { r: 0, g: 255, b: 0 };
  currentSnakeColor = { r: 0, g: 255, b: 0 };
  activePowerUp = null;
  lastTime = performance.now();
  isGameOver = false;
  paused = false;
  scoreEl.textContent = "Score : 0";
  bonusBgm.pause();
  bonusBgm.currentTime = 0;
  bgm.currentTime = 0;
  bgm.play().catch(() => {});
  requestAnimationFrame(loop);
  renderLeaderboard("score-list-top10");
}

document.getElementById("play-again-btn").addEventListener("click", resetGame);

// ======== Controles ======== //
window.addEventListener("keydown", (e) => {
  if (isGameOver || paused) return;
  switch (e.key) {
    case "ArrowUp":
      if (velocity.y === 0) velocity = { x: 0, y: -1 };
      break;
    case "ArrowDown":
      if (velocity.y === 0) velocity = { x: 0, y: 1 };
      break;
    case "ArrowLeft":
      if (velocity.x === 0) velocity = { x: -1, y: 0 };
      break;
    case "ArrowRight":
      if (velocity.x === 0) velocity = { x: 1, y: 0 };
      break;
    case "p":
    case "P":
      btnPause.click();
      break;
  }
});

async function fetchHighScores() {
  try {
    const res = await fetch("/api/scores");
    return await res.json();
  } catch (e) {
    console.error(e);
    return [];
  }
}
async function postHighScore(name, score) {
  try {
    await fetch("/api/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, score }),
    });
  } catch (e) {
    console.error(e);
  }
}

// ======== Leaderboard ======== //
async function renderLeaderboard(targetListId = "score-list") {
  const listEl = document.getElementById(targetListId);
  if (!listEl) return;

  listEl.innerHTML = "";
  const scores = await fetchHighScores();

  // Top 10 seulement
  scores
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .forEach(({ name, score: s }) => {
      const li = document.createElement("li");
      li.textContent = `${name} — ${s} pts`;
      listEl.appendChild(li);
    });
}

async function showLeaderboard() {}

// ======== Save new high score ======== //
document
  .getElementById("save-score-btn")
  .addEventListener("click", async () => {
    const nameInput = document.getElementById("player-name");
    const player = nameInput.value.trim() || "Anonyme";

    await postHighScore(player, score);

    document.getElementById("new-score-form").classList.add("hidden");

    await renderLeaderboard();
    await renderLeaderboard("score-list-top10");
  });

btnPause.addEventListener("click", () => {
  if (isGameOver) return;

  paused = true;
  audioPause.play();
  bgm.pause();
  btnPause.textContent = "Reprendre";
  menuPause.classList.remove("hidden");
});

btnResume.addEventListener("click", () => {
  paused = false;
  bgm.play().catch(() => {});
  btnPause.textContent = "Pause";
  menuPause.classList.add("hidden");
  requestAnimationFrame(loop);
});
