const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const TILE = 40;
const COLS = 15;
const ROWS = 15;
const W = COLS * TILE;
const H = ROWS * TILE;

// Tile types
const EMPTY = 0, BRICK = 1, STEEL = 2, WATER = 3, BASE = 4, FOREST = 5;

// Directions
const DIR = { UP: 0, RIGHT: 1, DOWN: 2, LEFT: 3 };
const DX = [0, 1, 0, -1];
const DY = [-1, 0, 1, 0];

// Colors
const COLORS = {
  bg: '#1a1a2e',
  brick: '#c0392b',
  brickDark: '#922b21',
  steel: '#7f8c8d',
  steelLight: '#bdc3c7',
  water: '#2980b9',
  waterLight: '#5dade2',
  base: '#f39c12',
  baseDark: '#d68910',
  forest: '#27ae60',
  player: '#f0a500',
  playerDark: '#c17f00',
  enemy: '#e74c3c',
  enemyDark: '#b03a2e',
  bullet: '#fff176',
  explosion: ['#f39c12', '#e74c3c', '#f1c40f', '#ffffff'],
};

// Map layouts per level
function getMap(level) {
  const maps = [
    // Level 1
    [
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,1,1,0,1,1,0,1,0,1,1,0,1,1,0],
      [0,1,0,0,0,1,0,0,0,0,1,0,0,1,0],
      [0,0,0,1,0,0,0,2,0,0,0,1,0,0,0],
      [0,1,0,1,0,1,0,0,0,1,0,1,0,1,0],
      [0,1,0,0,0,1,0,1,0,1,0,0,0,1,0],
      [0,0,0,2,0,0,0,0,0,0,0,2,0,0,0],
      [0,1,0,0,0,1,0,0,0,1,0,0,0,1,0],
      [0,1,0,1,0,1,0,1,0,1,0,1,0,1,0],
      [0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],
      [0,1,0,0,0,1,0,2,0,1,0,0,0,1,0],
      [0,1,1,0,0,1,0,0,0,1,0,0,1,1,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,1,0,1,1,0,1,0,1,0,1,1,0,1,0],
      [0,0,0,0,0,0,0,4,0,0,0,0,0,0,0],
    ],
    // Level 2
    [
      [0,0,0,0,0,2,0,0,0,2,0,0,0,0,0],
      [0,1,1,0,0,0,0,1,0,0,0,0,1,1,0],
      [0,1,0,2,0,1,0,1,0,1,0,2,0,1,0],
      [0,0,0,0,0,1,0,0,0,1,0,0,0,0,0],
      [2,1,0,1,0,0,0,2,0,0,0,1,0,1,2],
      [0,1,0,1,0,1,0,1,0,1,0,1,0,1,0],
      [0,0,0,0,0,1,0,0,0,1,0,0,0,0,0],
      [0,2,0,1,0,0,0,1,0,0,0,1,0,2,0],
      [0,1,0,1,0,1,0,0,0,1,0,1,0,1,0],
      [0,1,0,0,0,1,0,2,0,1,0,0,0,1,0],
      [0,0,0,2,0,0,0,0,0,0,0,2,0,0,0],
      [0,1,0,1,0,1,0,1,0,1,0,1,0,1,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [2,1,0,1,2,0,1,0,1,0,2,1,0,1,2],
      [0,0,0,0,0,0,0,4,0,0,0,0,0,0,0],
    ],
  ];
  const idx = (level - 1) % maps.length;
  return maps[idx].map(row => [...row]);
}

// State
let map, player, enemies, bullets, explosions, state, kills, lives, level;
let paused = false;
let enemySpawnTimer = 0;
let enemySpawnInterval = 180;
let maxEnemiesOnField = 4;
let totalEnemiesPerLevel = 10;
let enemiesRemaining, animFrame;
let waterAnim = 0;

function initGame() {
  map = getMap(level);
  kills = 0;
  enemiesRemaining = totalEnemiesPerLevel + (level - 1) * 3;
  maxEnemiesOnField = Math.min(3 + level, 6);

  // Find base position
  let baseX = 7, baseY = 14;
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (map[r][c] === BASE) { baseX = c; baseY = r; }

  player = {
    x: baseX * TILE - TILE,
    y: (ROWS - 2) * TILE,
    dir: DIR.UP,
    speed: 2,
    cooldown: 0,
    alive: true,
    invincible: 120,
    animTick: 0,
  };

  enemies = [];
  bullets = [];
  explosions = [];
  enemySpawnTimer = 60;
  state = 'playing';
  updateUI();
}

function spawnEnemy() {
  if (enemies.length >= maxEnemiesOnField || enemiesRemaining <= 0) return;
  const spawnPoints = [[0,0],[7,0],[14,0]];
  const pt = spawnPoints[Math.floor(Math.random() * spawnPoints.length)];
  const cx = pt[0], cy = pt[1];
  if (isTileFreeForTank(cx * TILE, cy * TILE)) {
    enemies.push({
      x: cx * TILE, y: cy * TILE,
      dir: DIR.DOWN,
      speed: 0.8 + (level - 1) * 0.2,
      cooldown: Math.floor(Math.random() * 80) + 60,
      moveTick: 0,
      moveDir: 60 + Math.floor(Math.random() * 60),
      alive: true,
      animTick: 0,
      hp: level >= 3 ? 2 : 1,
    });
    enemiesRemaining--;
  }
}

function isTileFreeForTank(px, py) {
  const margin = 2;
  const corners = [
    [px + margin, py + margin],
    [px + TILE - margin - 1, py + margin],
    [px + margin, py + TILE - margin - 1],
    [px + TILE - margin - 1, py + TILE - margin - 1],
  ];
  for (const [cx, cy] of corners) {
    const tc = Math.floor(cx / TILE);
    const tr = Math.floor(cy / TILE);
    if (tc < 0 || tr < 0 || tc >= COLS || tr >= ROWS) return false;
    const t = map[tr][tc];
    if (t === BRICK || t === STEEL || t === WATER || t === BASE) return false;
  }
  return true;
}

function moveTank(tank, dir, speed) {
  const nx = tank.x + DX[dir] * speed;
  const ny = tank.y + DY[dir] * speed;
  // Snap to grid axis when turning
  let sx = nx, sy = ny;
  if (dir === DIR.UP || dir === DIR.DOWN) sx = Math.round(nx / TILE) * TILE;
  if (dir === DIR.LEFT || dir === DIR.RIGHT) sy = Math.round(ny / TILE) * TILE;
  if (isTileFreeForTank(sx, sy)) {
    tank.x = sx; tank.y = sy;
    return true;
  }
  return false;
}

function fireBullet(tank, isPlayer) {
  if (tank.cooldown > 0) return;
  const bx = tank.x + TILE / 2 - 3 + DX[tank.dir] * (TILE / 2);
  const by = tank.y + TILE / 2 - 3 + DY[tank.dir] * (TILE / 2);
  bullets.push({ x: bx, y: by, dir: tank.dir, speed: 5, isPlayer, alive: true });
  tank.cooldown = isPlayer ? 25 : 60 + Math.floor(Math.random() * 40);
}

function addExplosion(x, y, size = 1) {
  explosions.push({ x, y, size, frame: 0, maxFrame: 18 });
}

// Input
const keys = {};
window.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'KeyP') paused = !paused;
  if (e.code === 'Space') e.preventDefault();
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function handleInput() {
  if (!player.alive) return;
  let moved = false;
  const dirs = [
    ['ArrowUp','KeyW', DIR.UP],
    ['ArrowDown','KeyS', DIR.DOWN],
    ['ArrowLeft','KeyA', DIR.LEFT],
    ['ArrowRight','KeyD', DIR.RIGHT],
  ];
  for (const [k1, k2, d] of dirs) {
    if (keys[k1] || keys[k2]) {
      player.dir = d;
      moved = moveTank(player, d, player.speed);
      if (moved) player.animTick++;
      break;
    }
  }
  if (keys['Space']) fireBullet(player, true);
  if (player.cooldown > 0) player.cooldown--;
}

function updateEnemies() {
  for (const e of enemies) {
    if (!e.alive) continue;
    e.animTick++;
    if (e.cooldown > 0) e.cooldown--;

    // AI movement
    e.moveDir--;
    if (e.moveDir <= 0 || !moveTank(e, e.dir, e.speed)) {
      e.dir = Math.floor(Math.random() * 4);
      e.moveDir = 60 + Math.floor(Math.random() * 80);
      // Bias towards player
      if (Math.random() < 0.5 && player.alive) {
        const dx = player.x - e.x;
        const dy = player.y - e.y;
        if (Math.abs(dx) > Math.abs(dy)) e.dir = dx > 0 ? DIR.RIGHT : DIR.LEFT;
        else e.dir = dy > 0 ? DIR.DOWN : DIR.UP;
      }
    } else {
      moveTank(e, e.dir, e.speed);
    }

    // Fire occasionally
    if (e.cooldown === 0) fireBullet(e, false);
  }
  enemies = enemies.filter(e => e.alive);
}

function updateBullets() {
  for (const b of bullets) {
    if (!b.alive) continue;
    b.x += DX[b.dir] * b.speed;
    b.y += DY[b.dir] * b.speed;

    // Out of bounds
    if (b.x < 0 || b.y < 0 || b.x > W || b.y > H) { b.alive = false; continue; }

    // Hit map
    const tc = Math.floor((b.x + 3) / TILE);
    const tr = Math.floor((b.y + 3) / TILE);
    if (tc >= 0 && tr >= 0 && tc < COLS && tr < ROWS) {
      const tile = map[tr][tc];
      if (tile === BRICK) {
        map[tr][tc] = EMPTY;
        addExplosion(tc * TILE + TILE / 2, tr * TILE + TILE / 2, 0.6);
        b.alive = false; continue;
      } else if (tile === STEEL) {
        addExplosion(tc * TILE + TILE / 2, tr * TILE + TILE / 2, 0.5);
        b.alive = false; continue;
      } else if (tile === BASE) {
        map[tr][tc] = EMPTY;
        addExplosion(tc * TILE + TILE / 2, tr * TILE + TILE / 2, 1.5);
        b.alive = false;
        gameOver();
        return;
      }
    }

    // Bullet vs bullet
    for (const b2 of bullets) {
      if (b2 === b || !b2.alive) continue;
      if (Math.abs(b.x - b2.x) < 6 && Math.abs(b.y - b2.y) < 6) {
        b.alive = false; b2.alive = false;
        addExplosion(b.x, b.y, 0.4);
        break;
      }
    }
    if (!b.alive) continue;

    // Hit player
    if (!b.isPlayer && player.alive && player.invincible <= 0) {
      if (b.x > player.x && b.x < player.x + TILE && b.y > player.y && b.y < player.y + TILE) {
        b.alive = false;
        addExplosion(player.x + TILE / 2, player.y + TILE / 2, 1.2);
        player.alive = false;
        lives--;
        updateUI();
        setTimeout(() => {
          if (lives > 0) respawnPlayer();
          else gameOver();
        }, 800);
      }
    }

    // Hit enemies
    if (b.isPlayer) {
      for (const e of enemies) {
        if (!e.alive) continue;
        if (b.x > e.x && b.x < e.x + TILE && b.y > e.y && b.y < e.y + TILE) {
          b.alive = false;
          e.hp--;
          if (e.hp <= 0) {
            e.alive = false;
            addExplosion(e.x + TILE / 2, e.y + TILE / 2, 1.2);
            kills++;
            updateUI();
            if (kills >= totalEnemiesPerLevel + (level - 1) * 3 && enemies.filter(x=>x.alive).length === 0 && enemiesRemaining <= 0) {
              setTimeout(nextLevel, 1000);
            }
          } else {
            addExplosion(e.x + TILE / 2, e.y + TILE / 2, 0.6);
          }
          break;
        }
      }
    }
  }
  bullets = bullets.filter(b => b.alive);
}

function updateExplosions() {
  for (const ex of explosions) ex.frame++;
  explosions = explosions.filter(ex => ex.frame < ex.maxFrame);
}

function respawnPlayer() {
  let baseX = 7, baseY = 14;
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (map[r][c] === BASE) { baseX = c; baseY = r; }
  player.x = baseX * TILE - TILE;
  player.y = (ROWS - 2) * TILE;
  player.dir = DIR.UP;
  player.alive = true;
  player.invincible = 150;
  player.cooldown = 0;
}

function nextLevel() {
  level++;
  document.getElementById('level').textContent = level;
  showOverlay(`第 ${level} 关`, '准备好了吗？', '继续', () => initGame());
}

function gameOver() {
  state = 'gameover';
  showOverlay('游戏结束', `击毁坦克：${kills} 辆`, '再来一次', () => {
    lives = 3; level = 1; kills = 0;
    updateUI();
    initGame();
  });
}

function showOverlay(title, sub, btnText, cb) {
  const ov = document.getElementById('overlay');
  ov.innerHTML = `<h2>${title}</h2><p>${sub}</p><button id="startBtn">${btnText}</button>`;
  ov.style.display = 'flex';
  document.getElementById('startBtn').onclick = () => {
    ov.style.display = 'none';
    cb();
  };
}

function updateUI() {
  document.getElementById('lives').textContent = lives;
  document.getElementById('level').textContent = level;
  document.getElementById('kills').textContent = kills;
  const total = totalEnemiesPerLevel + (level - 1) * 3;
  document.getElementById('enemies').textContent = enemiesRemaining + enemies.filter(e=>e.alive).length;
}

// Drawing helpers
function drawTank(x, y, dir, color, darkColor, animTick, invincible) {
  ctx.save();
  ctx.translate(x + TILE / 2, y + TILE / 2);
  ctx.rotate(dir * Math.PI / 2);

  if (invincible > 0 && Math.floor(invincible / 6) % 2 === 0) {
    ctx.restore(); return;
  }

  const t = TILE;
  // Body
  ctx.fillStyle = darkColor;
  ctx.fillRect(-t/2+4, -t/2+4, t-8, t-8);
  ctx.fillStyle = color;
  ctx.fillRect(-t/2+6, -t/2+6, t-12, t-12);

  // Tracks (animated)
  const trackOff = (animTick % 8 < 4) ? 0 : 2;
  ctx.fillStyle = darkColor;
  for (let i = -1; i <= 1; i += 2) {
    ctx.fillRect(i * (t/2 - 3) - 3, -t/2+4+trackOff, 6, 4);
    ctx.fillRect(i * (t/2 - 3) - 3, -t/2+12+trackOff, 6, 4);
    ctx.fillRect(i * (t/2 - 3) - 3, -t/2+20+trackOff, 6, 4);
    ctx.fillRect(i * (t/2 - 3) - 3, -4+trackOff, 6, 4);
  }

  // Barrel
  ctx.fillStyle = color;
  ctx.fillRect(-3, -t/2, 6, t/2 - 2);
  ctx.fillStyle = darkColor;
  ctx.fillRect(-2, -t/2, 4, t/2 - 2);

  ctx.restore();
}

function drawBullet(b) {
  ctx.fillStyle = COLORS.bullet;
  ctx.shadowColor = COLORS.bullet;
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.arc(b.x + 3, b.y + 3, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawExplosion(ex) {
  const progress = ex.frame / ex.maxFrame;
  const radius = ex.size * TILE * 0.8 * Math.sin(progress * Math.PI);
  const alpha = 1 - progress;
  const colorIdx = Math.floor(progress * COLORS.explosion.length);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = COLORS.explosion[Math.min(colorIdx, COLORS.explosion.length - 1)];
  ctx.shadowColor = '#f39c12';
  ctx.shadowBlur = 15;
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 + progress * 2;
    const r = radius * (0.5 + Math.random() * 0.5);
    ctx.beginPath();
    ctx.arc(ex.x + Math.cos(angle) * r * 0.4, ex.y + Math.sin(angle) * r * 0.4, r * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawMap() {
  waterAnim += 0.02;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const x = c * TILE, y = r * TILE;
      const tile = map[r][c];
      if (tile === EMPTY) {
        ctx.fillStyle = COLORS.bg;
        ctx.fillRect(x, y, TILE, TILE);
      } else if (tile === BRICK) {
        ctx.fillStyle = COLORS.brick;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = COLORS.brickDark;
        for (let i = 0; i < 4; i++) {
          for (let j = 0; j < 4; j++) {
            ctx.fillRect(x + j * 10 + (i % 2 === 0 ? 0 : 5), y + i * 10, 9, 4);
          }
        }
      } else if (tile === STEEL) {
        ctx.fillStyle = COLORS.steel;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = COLORS.steelLight;
        ctx.fillRect(x + 2, y + 2, TILE - 4, 6);
        ctx.fillRect(x + 2, y + 2, 6, TILE - 4);
      } else if (tile === WATER) {
        ctx.fillStyle = COLORS.water;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = COLORS.waterLight;
        const woff = Math.sin(waterAnim + c * 0.5 + r * 0.3) * 3;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.arc(x + 8 + i * 12, y + TILE / 2 + woff, 5, 0, Math.PI);
          ctx.fill();
        }
      } else if (tile === BASE) {
        ctx.fillStyle = COLORS.baseDark;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = COLORS.base;
        ctx.fillRect(x + 4, y + 4, TILE - 8, TILE - 8);
        ctx.fillStyle = COLORS.baseDark;
        ctx.font = 'bold 22px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('★', x + TILE / 2, y + TILE / 2);
      } else if (tile === FOREST) {
        ctx.fillStyle = COLORS.bg;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = COLORS.forest;
        ctx.beginPath();
        ctx.arc(x + TILE / 2, y + TILE / 2, TILE / 2 - 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, H);
  drawMap();
  for (const b of bullets) drawBullet(b);
  for (const e of enemies) {
    if (e.alive) drawTank(e.x, e.y, e.dir, COLORS.enemy, COLORS.enemyDark, e.animTick, 0);
  }
  if (player.alive) drawTank(player.x, player.y, player.dir, COLORS.player, COLORS.playerDark, player.animTick, player.invincible);
  for (const ex of explosions) drawExplosion(ex);

  if (paused && state === 'playing') {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#f0a500';
    ctx.font = 'bold 40px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('暂停', W / 2, H / 2);
  }
}

function gameLoop() {
  if (state === 'playing' && !paused) {
    handleInput();
    if (player.invincible > 0) player.invincible--;
    updateEnemies();
    updateBullets();
    updateExplosions();
    enemySpawnTimer--;
    if (enemySpawnTimer <= 0) {
      spawnEnemy();
      enemySpawnTimer = Math.max(80, enemySpawnInterval - level * 10);
    }
    updateUI();
  }
  draw();
  animFrame = requestAnimationFrame(gameLoop);
}

// Init
lives = 3;
level = 1;
kills = 0;
updateUI();

document.getElementById('startBtn').onclick = () => {
  document.getElementById('overlay').style.display = 'none';
  initGame();
  if (animFrame) cancelAnimationFrame(animFrame);
  gameLoop();
};
