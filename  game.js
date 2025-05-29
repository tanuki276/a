const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const shootSound = document.getElementById("shoot-sound");
const hitSound = document.getElementById("hit-sound");
const scoreText = document.getElementById("score");

let score = 0;

// プレイヤー画像
const playerImg = new Image();
playerImg.src = "https://upload.wikimedia.org/wikipedia/commons/4/46/Space_Invaders_ship.png";

// 敵画像
const enemyImg = new Image();
enemyImg.src = "https://upload.wikimedia.org/wikipedia/commons/5/59/Space_Invaders_alien.png";

// プレイヤー
let player = {
  x: 180,
  y: 260,
  width: 32,
  height: 32,
  speed: 4
};

// 弾
let bullets = [];

// 敵たち
let enemies = [];
let enemyDirection = 1;
let enemySpeed = 1;
for (let i = 0; i < 5; i++) {
  enemies.push({ x: 60 * i + 40, y: 40, alive: true });
}

// キー入力
let keys = {};
document.addEventListener("keydown", e => {
  keys[e.key] = true;
  if (e.key === " ") {
    shoot();
  }
});
document.addEventListener("keyup", e => {
  keys[e.key] = false;
});

// 弾発射
function shoot() {
  bullets.push({ x: player.x + 12, y: player.y, speed: 5 });
  shootSound.currentTime = 0;
  shootSound.play();
}

// 描画
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // プレイヤー
  ctx.drawImage(playerImg, player.x, player.y, player.width, player.height);

  // 弾
  ctx.fillStyle = "white";
  bullets.forEach(b => {
    b.y -= b.speed;
    ctx.fillRect(b.x, b.y, 4, 10);
  });

  // 敵
  enemies.forEach(e => {
    if (e.alive) {
      ctx.drawImage(enemyImg, e.x, e.y, 32, 32);
    }
  });

  // 弾×敵 当たり判定
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

  // 弾の削除
  bullets = bullets.filter(b => b.y > 0);

  // 敵移動（左右に反転）
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
    enemies.forEach(e => e.y += 10);
  }

  requestAnimationFrame(draw);
}

// 操作
function update() {
  if (keys["ArrowLeft"]) player.x -= player.speed;
  if (keys["ArrowRight"]) player.x += player.speed;

  player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
  requestAnimationFrame(update);
}

draw();
update();