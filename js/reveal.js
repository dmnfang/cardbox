// ══════════════════════════════════════════════
// REVEAL MODE
// ══════════════════════════════════════════════
let revIdx = 0;
let revCards = [];
let revTimer = null;
let revPaused = false;
let revDone = false;
let revTotal = 0;
let revGone = 0;

const REV_SPEED = { 1: 1400, 2: 800, 3: 500 };
const SQ_COLORS = ['var(--flash)', 'var(--reveal)', 'var(--target)', 'var(--vanish)'];
const GRID_COLS = { '4x4':4, '6x4':6, '8x4':8, '10x4':10 };
const GRID_ROWS = { '4x4':4, '6x4':4, '8x4':4, '10x4':4 };

function initReveal() {
  revCards = shuffle([...S.activeCards]);
  revIdx = 0;
  showScreen('screen-reveal');
  buildTeamBtns('reveal-team-btns', revealTeamGuess);
  renderReveal();
}

function renderReveal() {
  revWrong = [];
  stopRevTimer();
  revDone = false; revPaused = false; revGone = 0;
  const card = revCards[revIdx];
  if (!card) return;

  document.getElementById('reveal-counter').textContent = `${revIdx + 1} of ${revCards.length}`;

  // Content
  const content = document.getElementById('reveal-content');
  content.innerHTML = '';
  if (S.revealContent === 'image') {
    const img = document.createElement('img');
    img.src = getImagePath(card.folder, card.image);
    img.alt = card.word;
    content.appendChild(img);
  } else {
    const w = document.createElement('div');
    w.className = 'reveal-word';
    w.textContent = card.word;
    w.style.fontSize = wordFontSize(card.word, false);
    content.appendChild(w);
  }

  // Reset card border
  const rc = document.getElementById('reveal-card');
  rc.classList.remove('revealed');

  // Squares
  buildSquares();
  setRevActionBtn('eye');
  setPauseBtn(false);
  startRevTimer();
}

function buildSquares() {
  const cols = GRID_COLS[S.revealGrid] || 4;
  const rows = GRID_ROWS[S.revealGrid] || 4;
  revTotal = cols * rows;
  const container = document.getElementById('reveal-squares');
  container.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  container.style.gridTemplateRows    = `repeat(${rows}, 1fr)`;
  container.innerHTML = '';
  for (let i = 0; i < revTotal; i++) {
    const sq = document.createElement('div');
    sq.className = 'reveal-sq';
    sq.style.background = SQ_COLORS[(i + Math.floor(i / cols)) % SQ_COLORS.length];
    sq.onclick = () => removeSquare(sq);
    container.appendChild(sq);
  }
}

function startRevTimer() {
  if (revPaused || revDone) return;
  revTimer = setInterval(removeRandomSq, REV_SPEED[S.revealSpeed] || 2000);
}

function stopRevTimer() { clearInterval(revTimer); revTimer = null; }

function removeRandomSq() {
  const sqs = [...document.querySelectorAll('.reveal-sq:not(.gone)')];
  if (!sqs.length) { stopRevTimer(); return; }
  removeSquare(sqs[Math.floor(Math.random() * sqs.length)]);
}

function removeSquare(sq) {
  if (sq.classList.contains('gone')) return;
  sq.classList.add('gone');
  revGone++;
  if (revGone >= revTotal) { stopRevTimer(); onAllRevealed(); }
}

function onAllRevealed() {
  revDone = true;
  document.getElementById('reveal-card').classList.add('revealed');
  setRevActionBtn('next');
}

function setRevActionBtn(type) {
  const btn = document.getElementById('reveal-action-btn');
  if (type === 'eye') {
    btn.style.background = '';
    btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><ellipse cx="9" cy="9" rx="7" ry="4.5" stroke="currentColor" stroke-width="1.8"/><circle cx="9" cy="9" r="2" stroke="currentColor" stroke-width="1.8"/></svg>`;
    btn.onclick = revealAction;
  } else {
    btn.style.background = 'var(--reveal)';
    btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 9H14M14 9L10 5M14 9L10 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    btn.onclick = revealNext;
  }
}

function revealAction() {
  if (revDone) { revealNext(); return; }
  document.querySelectorAll('.reveal-sq:not(.gone)').forEach(sq => sq.classList.add('gone'));
  stopRevTimer();
  onAllRevealed();
}

function revealNext() {
  if (revIdx < revCards.length - 1) { revIdx++; renderReveal(); }
  else showEndSheet('All done!', 'Play Again', 'var(--reveal)');
}

function toggleRevealPause() {
  if (S.teamCount > 0) return; // teams handle pausing
  revPaused = !revPaused;
  setPauseBtn(revPaused);
  revPaused ? stopRevTimer() : startRevTimer();
}

function setPauseBtn(paused) {
  const pauseSvg = document.getElementById('pause-svg');
  if (!pauseSvg) return;
  pauseSvg.innerHTML = paused
    ? `<polygon points="4,2 14,9 4,16" fill="currentColor"/>`
    : `<rect x="4" y="3" width="3" height="12" rx="1" fill="currentColor"/><rect x="11" y="3" width="3" height="12" rx="1" fill="currentColor"/>`;
}

let revWrong = [];

function openRevealGuessModal() {
  document.getElementById('guess-input').value = '';
  document.getElementById('guess-submit').style.background = 'var(--reveal)';
  document.getElementById('guess-title').textContent = 'What is the card?';
  renderRevealWrongChips();
  document.getElementById('guess-modal').classList.remove('hidden');
  setTimeout(() => document.getElementById('guess-input').focus(), 80);
}

function closeRevealGuessModal() {
  document.getElementById('guess-modal').classList.add('hidden');
}

function submitRevealGuess(teamIdx) {
  const input = document.getElementById('guess-input');
  const guess = input.value.trim();
  if (!guess) return;

  const card = revCards[revIdx];
  const correct = card.word.trim().toLowerCase() === guess.trim().toLowerCase();

  if (correct) {
    input.value = '';
    revWrong = [];
    closeGuessModal();
    // Award points based on tiles remaining
    const remaining = document.querySelectorAll('.reveal-sq:not(.gone)').length;
    const points = Math.max(10, remaining * 10);
    const team = window._revealGuessingTeam;
    if (team !== undefined && S.teamCount > 0) {
      S.teamScores[team] += points;
      updateTeamScore('reveal-team-btns', team);
      // Highlight team button
      const btn = document.getElementById(`reveal-team-btns-t${team}`);
      if (btn) {
        btn.classList.add('correct-reveal');
        setTimeout(() => btn.classList.remove('correct-reveal'), 1500);
      }
    }
    revealAction();
    spawnRevealConfetti();
    // Auto resume
    revPaused = false;
    startRevTimer();
  } else {
    input.value = '';
    revWrong.push(guess);
    renderRevealWrongChips();
    input.classList.add('shake');
    setTimeout(() => input.classList.remove('shake'), 400);
  }
}

function renderRevealWrongChips() {
  const el = document.getElementById('wrong-guesses');
  el.innerHTML = '';
  revWrong.forEach(g => {
    const chip = document.createElement('div');
    chip.className = 'wrong-chip';
    chip.textContent = g;
    el.appendChild(chip);
  });
}

function spawnRevealConfetti() {
  const colors = ['var(--flash)','var(--reveal)','var(--target)','var(--vanish)'];
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:50;overflow:hidden;';
  document.body.appendChild(container);
  for (let i = 0; i < 60; i++) {
    const p = document.createElement('div');
    p.className = 'confetti-piece';
    p.style.cssText = `left:${Math.random()*100}%;top:${Math.random()*40}%;background:${colors[i%4]};animation-delay:${Math.random()*0.4}s;animation-duration:${0.8+Math.random()*0.8}s`;
    container.appendChild(p);
  }
  setTimeout(() => container.remove(), 2000);
}

function revealTeamGuess(teamIdx) {
  stopRevTimer();
  revPaused = true;
  openRevealGuessModal();
  window._revealGuessingTeam = teamIdx;
}