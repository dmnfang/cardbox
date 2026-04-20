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
  document.querySelectorAll('.roll-cell-tokens').forEach(el => el.innerHTML = '');

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
  animateDie(roll, () => animateMove(rollCurrentTeam, roll));
}

function animateDie(finalValue, callback) {
  const btn = document.getElementById('roll-die-btn');
  if (!btn) { callback(); return; }
  rollMoving = true;
  let count = 0;
  const interval = setInterval(() => {
    btn.textContent = Math.floor(Math.random() * 6) + 1;
    count++;
    if (count >= 10) {
      clearInterval(interval);
      btn.textContent = finalValue;
      setTimeout(callback, 300);
    }
  }, 60);
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

  setTimeout(() => animateMove(teamIdx, stepsRemaining - 1), 350);
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
  { type:'forward', label:'move one forward', icon: () => `<svg width="72" height="72" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M14 6l6 6-6 6" stroke="var(--vanish)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>` },
  { type:'back',    label:'move one back',    icon: () => `<svg width="72" height="72" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M10 6L4 12l6 6" stroke="var(--target)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>` },
  { type:'stay',    label:'stay here',        icon: () => `<svg width="72" height="72" viewBox="0 0 24 24" fill="none"><path d="M18 8a6 6 0 0 0-12 0v7h12V8z" fill="var(--vanish)"/><rect x="4" y="14" width="16" height="3" rx="1.5" fill="var(--vanish)"/></svg>` },
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
  } else if (outcome === 'back') {
    rollPositions[teamIdx] = (rollPositions[teamIdx] - 1 + total) % total;
  }

  renderAllTokens();
  rollCurrentTeam = (rollCurrentTeam + 1) % S.teamCount;
  updateRollActiveTeam();
  document.getElementById('roll-die-btn').textContent = '🎲';
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