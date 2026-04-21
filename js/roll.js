// ══════════════════════════════════════════════
// ROLL MODE
// ══════════════════════════════════════════════
let rollSnakePath = [];    // array of grid indices in snake order (path[0]=start, path[last]=loop)
let rollPositions = [];    // current path position for each team (0 = start)
let rollCurrentTeam = 0;
let rollCardPool  = [];
let rollCardIdx   = 0;
let rollCols      = 4;
let rollRows      = 4;
let rollMoving    = false; // prevent double-taps during animation

const ROLL_COLORS = ['var(--reveal)', 'var(--target)', 'var(--vanish)', 'var(--roll)'];

// ── Snake path builder ────────────────────────
// Returns array of grid cell indices in snake traversal order.
// Row 0: left→right, Row 1: right→left, Row 2: left→right, etc.
function buildSnakePath(cols, rows) {
  const path = [];
  for (let r = 0; r < rows; r++) {
    const leftToRight = r % 2 === 0;
    for (let c = 0; c < cols; c++) {
      const col = leftToRight ? c : cols - 1 - c;
      path.push(r * cols + col);
    }
  }
  return path;
}

// ── Init ──────────────────────────────────────
function initRoll() {
  const map = { '4x4':[4,4], '5x4':[5,4], '6x4':[6,4] };
  [rollCols, rollRows] = map[S.rollGrid] || [4,4];

  rollSnakePath   = buildSnakePath(rollCols, rollRows);
  rollCardPool    = shuffle([...S.activeCards]);
  rollCardIdx     = 0;
  rollPositions   = Array(S.teamCount).fill(0);
  rollCurrentTeam = 0;
  rollMoving      = false;

  showScreen('screen-roll');
  buildTeamBtns('roll-team-btns', () => {});
  renderRollBoard();
  updateRollActiveTeam();
}

// ── Board render ──────────────────────────────
function renderRollBoard() {
  const boardEl = document.getElementById('roll-board');
  boardEl.style.gridTemplateColumns = `repeat(${rollCols}, 1fr)`;
  boardEl.style.gridTemplateRows    = `repeat(${rollRows}, 1fr)`;
  boardEl.innerHTML = '';

  const total = rollCols * rollRows;

  for (let gridIdx = 0; gridIdx < total; gridIdx++) {
    const cell = document.createElement('div');
    cell.className = 'roll-cell';
    cell.id = `roll-cell-${gridIdx}`;

    const pathPos = rollSnakePath.indexOf(gridIdx);
    const isStart = pathPos === 0;
    const isLoop  = pathPos === total - 1;

    cell.style.background = (isStart || isLoop)
  ? 'var(--flash)'
  : ROLL_COLORS[pathPos % ROLL_COLORS.length];

    // Nub direction based on where the snake path goes next from this cell
    if (pathPos < total - 1) {
      const nextGridIdx = rollSnakePath[pathPos + 1];
      const curRow = Math.floor(gridIdx / rollCols);
      const nxtRow = Math.floor(nextGridIdx / rollCols);
      const curCol = gridIdx % rollCols;
      const nxtCol = nextGridIdx % rollCols;

      if (nxtRow === curRow && nxtCol > curCol) cell.classList.add('nub-right');
      else if (nxtRow === curRow && nxtCol < curCol) cell.classList.add('nub-left');
      else if (nxtRow > curRow) cell.classList.add('nub-down');
    }

    // Icon
    const icon = document.createElement('div');
    icon.className = 'roll-cell-icon';
    cell.appendChild(icon);

    // Token container
    const tokens = document.createElement('div');
    tokens.className = 'roll-cell-tokens';
    tokens.id = `roll-tokens-${gridIdx}`;
    cell.appendChild(tokens);

    boardEl.appendChild(cell);
  }

  renderAllTokens();
}

// ── Token rendering ───────────────────────────
function renderAllTokens() {
  document.querySelectorAll('.roll-cell-tokens').forEach(el => {
    el.innerHTML = '';
    el.style.display = 'flex';
    el.style.flexWrap = 'wrap';
    el.style.gap = '8px';
    el.style.justifyContent = 'center';
    el.style.alignItems = 'center';
    el.style.width = '';
  });

  rollPositions.forEach((pathPos, teamIdx) => {
    const gridIdx = rollSnakePath[pathPos];
    const container = document.getElementById(`roll-tokens-${gridIdx}`);
    if (!container) return;
    const token = document.createElement('div');
    token.className = 'roll-token';
    if (teamIdx === rollCurrentTeam) token.classList.add('roll-token-active');
    token.textContent = teamIdx + 1;
    container.appendChild(token);
  });

  document.querySelectorAll('.roll-cell-tokens').forEach(el => {
    const count = el.children.length;
    if (count >= 3) {
  el.style.display = 'grid';
  el.style.gridTemplateColumns = 'repeat(2, 80px)';
  el.style.gap = '8px';
  el.style.width = 'fit-content';
  el.style.position = 'absolute';
  el.style.top = '50%';
  el.style.left = '50%';
  el.style.transform = 'translate(-50%, -50%)';
}
  });
}

function updateRollActiveTeam() {
  for (let i = 0; i < S.teamCount; i++) {
    const btn = document.getElementById(`roll-team-btns-t${i}`);
    if (!btn) continue;
    btn.style.borderColor = i === rollCurrentTeam ? 'var(--roll)' : 'var(--stroke-default)';
  }
  renderAllTokens();
}

// ── Roll die ──────────────────────────────────
function rollDie() {
  if (rollMoving) return;
  const roll = Math.floor(Math.random() * 6) + 1;
  animateDie(roll);
}

function animateDie(finalValue) {
  rollMoving = true;
  const overlay = document.getElementById('roll-die-overlay');
  const numEl = document.getElementById('roll-die-number');
  overlay.classList.remove('hidden');
  let count = 0;
  const interval = setInterval(() => {
    numEl.textContent = Math.floor(Math.random() * 6) + 1;
    count++;
    if (count >= 15) {
      clearInterval(interval);
      numEl.textContent = finalValue;
      overlay.dataset.roll = finalValue;
    }
  }, 60);
}

function rollDieConfirm() {
  const roll = parseInt(document.getElementById('roll-die-overlay').dataset.roll);
  document.getElementById('roll-die-overlay').classList.add('hidden');
  setTimeout(() => animateMove(rollCurrentTeam, roll), 400);
}

// ── Animated step-by-step movement ───────────
function animateMove(teamIdx, stepsRemaining) {
  if (stepsRemaining === 0) {
    rollMoving = false;
    showRollCard();
    return;
  }

  const total = rollSnakePath.length;
  const oldPos = rollPositions[teamIdx];
  const newPos = (oldPos + 1) % total;
  rollPositions[teamIdx] = newPos;
  renderAllTokens();

  // Award lap bonus when passing through start
  if (newPos === 0) {
    S.teamScores[teamIdx] += 200;
    updateTeamScore('roll-team-btns', teamIdx);
    spawnRollConfetti();
  }

  setTimeout(() => animateMove(teamIdx, stepsRemaining - 1), 800);
}

// ── Card flip ─────────────────────────────────
function showRollCard() {
  const card = getNextRollCard();
  document.getElementById('roll-card-img').src  = getImagePath(card.folder, card.image);
  document.getElementById('roll-card-img').alt  = card.word;
  document.getElementById('roll-card-word').textContent = card.word;
  document.getElementById('roll-card-overlay').classList.remove('hidden');
}

function getNextRollCard() {
  if (rollCardIdx >= rollCardPool.length) {
    rollCardPool = shuffle([...S.activeCards]);
    rollCardIdx  = 0;
  }
  return rollCardPool[rollCardIdx++];
}

function rollGotIt() {
  document.getElementById('roll-card-overlay').classList.add('hidden');
  showRollResult();
}

// ── Result screen ─────────────────────────────
const ROLL_POINT_OPTIONS = [50, 75, 100, 125, 150, 175, 200];

const ROLL_OUTCOMES = [
{ type:'forward', label:'forward', icon: () => `<img src="assets/icons/move-forward.svg" style="height:240px;width:240px;">` },
{ type:'back',    label:'back',    icon: () => `<img src="assets/icons/move-back.svg" style="height:240px;width:240px;">` },
{ type:'stay',    label:'stay',        icon: () => `<img src="assets/icons/stay.svg" style="height:240px;width:240px;">` },
];

const ROLL_WEIGHTS = [30, 30, 40];

function weightedRandom(items, weights) {
  const total = weights.reduce((a,b) => a+b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

function showRollResult() {
  const outcome      = weightedRandom(ROLL_OUTCOMES, ROLL_WEIGHTS);
  const targetPoints = ROLL_POINT_OPTIONS[Math.floor(Math.random() * ROLL_POINT_OPTIONS.length)];

  document.getElementById('roll-result-icon').innerHTML    = outcome.icon();
  document.getElementById('roll-result-label').textContent = outcome.label;

  const overlay = document.getElementById('roll-result-overlay');
  overlay.dataset.points  = targetPoints;
  overlay.dataset.outcome = outcome.type;
  overlay.classList.remove('hidden');

  // Slot machine
  const pointsEl = document.getElementById('roll-result-points');
  let count = 0;
  const interval = setInterval(() => {
    pointsEl.textContent = ROLL_POINT_OPTIONS[Math.floor(Math.random() * ROLL_POINT_OPTIONS.length)];
    count++;
    if (count >= 15) {
      clearInterval(interval);
      pointsEl.textContent = targetPoints;
    }
  }, 80);
}

function rollDone() {
  const overlay = document.getElementById('roll-result-overlay');
  const points  = parseInt(overlay.dataset.points) || 0;
  const outcome = overlay.dataset.outcome;
  const teamIdx = rollCurrentTeam;

  overlay.classList.add('hidden');

  S.teamScores[teamIdx] += points;
  updateTeamScore('roll-team-btns', teamIdx);

  const total = rollSnakePath.length;
  if (outcome === 'forward') {
    rollPositions[teamIdx] = (rollPositions[teamIdx] + 1) % total;
    setTimeout(() => renderAllTokens(), 400);
  } else if (outcome === 'back') {
    rollPositions[teamIdx] = (rollPositions[teamIdx] - 1 + total) % total;
    setTimeout(() => renderAllTokens(), 400);
  }

  if (outcome === 'stay') {
    // Pulse the token
    const gridIdx = rollSnakePath[rollPositions[teamIdx]];
    const container = document.getElementById(`roll-tokens-${gridIdx}`);
    const token = container?.querySelector('.roll-token-active');
    if (token) {
      token.style.transition = 'transform 0.2s ease';
      token.style.transform = 'scale(1.6)';
      setTimeout(() => { token.style.transform = 'scale(1)'; }, 200);
    }
    setTimeout(() => {
  rollCurrentTeam = (rollCurrentTeam + 1) % S.teamCount;
  updateRollActiveTeam();
  document.getElementById('roll-die-btn').textContent = '🎲';
  // Pulse the new active team's token
  const newGridIdx = rollSnakePath[rollPositions[rollCurrentTeam]];
  const newContainer = document.getElementById(`roll-tokens-${newGridIdx}`);
  const newToken = newContainer?.querySelector('.roll-token-active');
  if (newToken) {
    newToken.style.transition = 'transform 0.25s ease';
    newToken.style.transform = 'scale(1.6)';
    setTimeout(() => { newToken.style.transform = 'scale(1)'; }, 250);
  }
}, 900);
  } else {
    // Delay before movement so token is visible
    setTimeout(() => {
  rollCurrentTeam = (rollCurrentTeam + 1) % S.teamCount;
  updateRollActiveTeam();
  document.getElementById('roll-die-btn').textContent = '🎲';
  // Pulse the new active team's token
  const newGridIdx = rollSnakePath[rollPositions[rollCurrentTeam]];
  const newContainer = document.getElementById(`roll-tokens-${newGridIdx}`);
  const newToken = newContainer?.querySelector('.roll-token-active');
  if (newToken) {
    newToken.style.transition = 'transform 0.25s ease';
    newToken.style.transform = 'scale(1.6)';
    setTimeout(() => { newToken.style.transform = 'scale(1)'; }, 250);
  }
}, 900);
  }
}

// ── Frozen notice ─────────────────────────────
function showRollFrozenNotice() {
  const overlay = document.getElementById('roll-frozen-overlay');
  overlay.classList.remove('hidden');
  setTimeout(() => {
    overlay.classList.add('hidden');
    rollCurrentTeam = (rollCurrentTeam + 1) % S.teamCount;
    updateRollActiveTeam();
  }, 1800);
}

// ── End game ──────────────────────────────────
function endRoll() {
  const scores = S.teamScores.map((s,i) => ({ team:i+1, score:s }));
  scores.sort((a,b) => b.score - a.score);

  const list = document.getElementById('roll-end-scores');
  list.innerHTML = '';
  scores.forEach((s, rank) => {
    const row = document.createElement('div');
    row.className = 'roll-end-row';
    row.innerHTML = `
      <div class="roll-end-rank">${rank === 0 ? '🏆' : rank+1}</div>
      <div class="roll-end-team">Team ${s.team}</div>
      <div class="roll-end-score">${s.score} pts</div>
    `;
    list.appendChild(row);
  });
  document.getElementById('roll-end-overlay').classList.remove('hidden');
}

// ── Confetti ──────────────────────────────────
function spawnRollConfetti() {
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:50;overflow:hidden;';
  document.body.appendChild(container);
  for (let i = 0; i < 60; i++) {
    const p = document.createElement('div');
    p.className = 'confetti-piece';
    p.style.cssText = `left:${Math.random()*100}%;top:${Math.random()*40}%;background:${ROLL_COLORS[i%ROLL_COLORS.length]};animation-delay:${Math.random()*0.4}s;animation-duration:${0.8+Math.random()*0.8}s`;
    container.appendChild(p);
  }
  setTimeout(() => container.remove(), 2000);
}