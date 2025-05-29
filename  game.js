const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const shootSound = document.getElementById("shoot-sound");
const hitSound = document.getElementById("hit-sound");
const scoreText = document.getElementById("score");

let score = 0;
let isRunning = false;

let playerImg = new Image();
playerImg.src = "https://upload.wikimedia.org/wikipedia/commons/4/46/Space_Invaders_ship.png";

let enemyImg = new Image();
enemyImg.src = "https://upload.wikimedia.org/wikipedia/commons/5/59/Space_Invaders_alien.png";

let player, bullets, enemies, keys;
let enemyDirection, enemySpeed;

function initGame() {
  player = { x: 180, y: 260, width: 32, height: 32, speed: 4 };
  bullets = [];
  enemies = [];
  keys = {};
  enemyDirection = 1;
  enemySpeed = 1;
  score = 0;
  scoreText.innerText = score;

  for (let i = 0; i < 5; i++) {
    enemies.push({ x: 60 * i + 40, y: 40, alive: true });
  }
}

document.addEventListener("keydown", e => {
  keys[e.key] = true;
  if (e.key === " " && isRunning) shoot();
});
document.addEventListener("keyup", e => {
  keys[e.key] = false;
});

function shoot() {
  bullets.push({ x: player.x + 12, y: player.y, speed: 5 });
  shootSound.currentTime = 0;
  shootSound.play();
}

function draw() {
  if (!isRunning) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(playerImg, player.x, player.y, player.width, player.height);

  // 弾描画
  ctx.fillStyle = "white";
  bullets.forEach(b => {
    b.y -= b.speed;
    ctx.fillRect(b.x, b.y, 4, 10);
  });

  // 敵描画
  enemies.forEach(e => {
    if (e.alive) ctx.drawImage(enemyImg, e.x, e.y, 32, 32);
  });

  // 衝突判定
  bullets.forEach(b => {
    enemies.forEach(e => {
      if (
        e.alive &&
        b.x < e.x + 32 &&
        b.x + 4 > e.x &&
        b.y < e.y + 32 &&
        b.y + 10 > e.y
      ) {
        e.alive = false;
        b.y = -100;
        score += 100;
        scoreText.innerText = score;
        hitSound.currentTime = 0;
        hitSound.play();
      }
    });
  });

  bullets = bullets.filter(b => b.y > 0);

  // 敵の移動
  let moveDown = false;
  enemies.forEach(e => {
    if (e.alive) {
      e.x += enemyDirection * enemySpeed;
      if (e.x < 0 || e.x + 32 > canvas.width) {
        moveDown = true;
      }
    }
  });
  if (moveDown) {
    enemyDirection *= -1;
    enemies.forEach(e => (e.y += 10));
  }

  requestAnimationFrame(draw);
}

function update() {
  if (!isRunning) return;
  if (keys["ArrowLeft"]) player.x -= player.speed;
  if (keys["ArrowRight"]) player.x += player.speed;
  player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
  requestAnimationFrame(update);
}

// 🎮 制御系
function startGame() {
  if (!isRunning) {
    isRunning = true;
    draw();
    update();
  }
}

function stopGame() {
  isRunning = false;
}

function resetGame() {
  stopGame();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "white";
  ctx.fillText("Press ▶️ Start", 130, 150);
}

initGame(); // 最初に初期化
ctx.fillStyle = "white";
ctx.fillText("Press ▶️ Start", 130, 150);