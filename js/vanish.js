// ══════════════════════════════════════════════
// VANISH MODE
// ══════════════════════════════════════════════
let vRound = 0;
let vPoolCards = [];
let vGridCards = [];
let vGhostIdxs = [];
let vFoundIdxs = [];
let vWrong = [];
let vPhase = 'study'; // study | guessing

const V_SIZES = { '2x3':[2,3,6], '3x3':[3,3,9], '4x3':[4,3,12] };

function initVanish() {
  vRound = 0;
  const [,,total] = V_SIZES[S.vanishGrid];
  vPoolCards = shuffle([...S.activeCards]).slice(0, total);
  showScreen('screen-vanish');
  startVanishRound();
}

function startVanishRound() {
  vPhase = 'study'; vFoundIdxs = []; vWrong = [];
  vGridCards = shuffle([...vPoolCards]);

  const numGhost = vRound + 1;
  const all = vGridCards.map((_,i)=>i);
  vGhostIdxs = shuffle(all).slice(0, numGhost);

  const instr = document.getElementById('vanish-instruction');
instr.textContent = 'Please look carefully!';
instr.style.padding = '24px 24px 0';
  const btn = document.getElementById('vanish-action-btn');
  btn.textContent = 'Shuffle';
  btn.style.background = 'var(--vanish)';

  document.getElementById('vanish-showme-btn').style.display = 'none';

  renderVanishGrid(false);
}

function renderVanishGrid(showGhosts) {
  const [cols, rows] = V_SIZES[S.vanishGrid];
  const grid = document.getElementById('vanish-grid');
  grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  grid.style.gridTemplateRows    = `repeat(${rows}, 1fr)`;
  grid.innerHTML = '';

  vGridCards.forEach((card, i) => {
    const ghost  = showGhosts && vGhostIdxs.includes(i) && !vFoundIdxs.includes(i);
    const found  = vFoundIdxs.includes(i);
    const cell = document.createElement('div');
    cell.className = 'vanish-cell' + (ghost ? ' ghost' : '') + (found ? ' correct' : '');

    if (ghost) {
  cell.style.background = 'var(--surface-inset)';
  cell.style.border = '2px solid var(--stroke-default)';
  const icon = document.createElement('div');
  icon.style.cssText = 'display:flex;align-items:center;justify-content:center;color:var(--text-disabled);';
  icon.innerHTML = `<svg width="32" height="32" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M10 1.66663C11.9891 1.66663 13.8968 2.4568 15.3033 3.86332C16.7098 5.26985 17.5 7.1775 17.5 9.16663V16.35C17.5 17.875 15.8617 18.8391 14.5292 18.0991L14.2267 17.9366C13.3933 17.51 12.74 17.37 11.8192 17.8416L11.6542 17.9316C11.1792 18.2029 10.6448 18.3532 10.0981 18.3692C9.55139 18.3852 9.00913 18.2664 8.51917 18.0233L8.34583 17.9316C7.28167 17.3233 6.54083 17.505 5.47083 18.0983C4.1375 18.84 2.5 17.8758 2.5 16.3508V9.16663C2.5 7.1775 3.29018 5.26985 4.6967 3.86332C6.10322 2.4568 8.01088 1.66663 10 1.66663ZM7.08333 7.49996C6.75181 7.49996 6.43387 7.63166 6.19945 7.86608C5.96503 8.1005 5.83333 8.41844 5.83333 8.74996C5.83333 9.08148 5.96503 9.39942 6.19945 9.63384C6.43387 9.86826 6.75181 9.99996 7.08333 9.99996C7.41485 9.99996 7.7328 9.86826 7.96722 9.63384C8.20164 9.39942 8.33333 9.08148 8.33333 8.74996C8.33333 8.41844 8.20164 8.1005 7.96722 7.86608C7.7328 7.63166 7.41485 7.49996 7.08333 7.49996ZM12.9167 7.49996C12.5851 7.49996 12.2672 7.63166 12.0328 7.86608C11.7984 8.1005 11.6667 8.41844 11.6667 8.74996C11.6667 9.08148 11.7984 9.39942 12.0328 9.63384C12.2672 9.86826 12.5851 9.99996 12.9167 9.99996C13.2482 9.99996 13.5661 9.86826 13.8005 9.63384C14.035 9.39942 14.1667 9.08148 14.1667 8.74996C14.1667 8.41844 14.035 8.1005 13.8005 7.86608C13.5661 7.63166 13.2482 7.49996 12.9167 7.49996Z" fill="currentColor"/></svg>`;
  cell.appendChild(icon);
} else {
      if (S.showImage !== false) {
        const wrap = document.createElement('div');
        wrap.className = 'vanish-cell-img';
        const img = document.createElement('img');
        img.src = getImagePath(card.folder, card.image);
        img.alt = card.word;
        img.onerror = () => img.style.display='none';
        wrap.appendChild(img);
        cell.appendChild(wrap);
      }
      const w = document.createElement('div');
      w.className = 'vanish-cell-word';
      w.textContent = card.word;
      cell.appendChild(w);
    }
    grid.appendChild(cell);
  });
}

function vanishAction() {
  if (vPhase === 'study') doShuffle();
  else openGuessModal();
}

function doShuffle() {
  document.getElementById('vanish-instruction').textContent = 'Shuffling...';
  const [cols, rows] = V_SIZES[S.vanishGrid];
  const total = cols * rows;
  const grid = document.getElementById('vanish-grid');
  const colors = ['var(--flash)', 'var(--reveal)', 'var(--target)', 'var(--vanish)'];
  const ghostSVG = `<svg width="32" height="32" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M10 1.66663C11.9891 1.66663 13.8968 2.4568 15.3033 3.86332C16.7098 5.26985 17.5 7.1775 17.5 9.16663V16.35C17.5 17.875 15.8617 18.8391 14.5292 18.0991L14.2267 17.9366C13.3933 17.51 12.74 17.37 11.8192 17.8416L11.6542 17.9316C11.1792 18.2029 10.6448 18.3532 10.0981 18.3692C9.55139 18.3852 9.00913 18.2664 8.51917 18.0233L8.34583 17.9316C7.28167 17.3233 6.54083 17.505 5.47083 18.0983C4.1375 18.84 2.5 17.8758 2.5 16.3508V9.16663C2.5 7.1775 3.29018 5.26985 4.6967 3.86332C6.10322 2.4568 8.01088 1.66663 10 1.66663ZM7.08333 7.49996C6.75181 7.49996 6.43387 7.63166 6.19945 7.86608C5.96503 8.1005 5.83333 8.41844 5.83333 8.74996C5.83333 9.08148 5.96503 9.39942 6.19945 9.63384C6.43387 9.86826 6.75181 9.99996 7.08333 9.99996C7.41485 9.99996 7.7328 9.86826 7.96722 9.63384C8.20164 9.39942 8.33333 9.08148 8.33333 8.74996C8.33333 8.41844 8.20164 8.1005 7.96722 7.86608C7.7328 7.63166 7.41485 7.49996 7.08333 7.49996ZM12.9167 7.49996C12.5851 7.49996 12.2672 7.63166 12.0328 7.86608C11.7984 8.1005 11.6667 8.41844 11.6667 8.74996C11.6667 9.08148 11.7984 9.39942 12.0328 9.63384C12.2672 9.86826 12.5851 9.99996 12.9167 9.99996C13.2482 9.99996 13.5661 9.86826 13.8005 9.63384C14.035 9.39942 14.1667 9.08148 14.1667 8.74996C14.1667 8.41844 14.035 8.1005 13.8005 7.86608C13.5661 7.63166 13.2482 7.49996 12.9167 7.49996Z" fill="white"/></svg>`;

  // Cover all cells with colored tiles
  const cells = [...grid.querySelectorAll('.vanish-cell')];
  cells.forEach((cell, i) => {
    cell.style.background = colors[i % 4];
    cell.style.border = 'none';
    cell.innerHTML = ghostSVG;
    cell.style.alignItems = 'center';
    cell.style.justifyContent = 'center';
  });

  // Cycle colors 3 times
  let cycle = 0;
  const cycleInterval = setInterval(() => {
    cycle++;
    cells.forEach((cell, i) => {
      cell.style.background = colors[(i + cycle) % 4];
    });
    if (cycle >= 5) {
      clearInterval(cycleInterval);
      // Shuffle and reveal with ghosts
      setTimeout(() => {
        vGridCards = shuffle([...vPoolCards]);
        vPhase = 'guessing';
const instr = document.getElementById('vanish-instruction');
instr.textContent = '';
instr.style.padding = '0';
document.getElementById('vanish-action-btn').textContent = 'Guess';
renderVanishGrid(true);
document.getElementById('vanish-showme-btn').style.display = 'flex';
      }, 200);
    }
  }, 200);
}

// ── Guess modal ──────────────────────────────
function openGuessModal() {
  document.getElementById('guess-title').textContent = 'Guess the vanished card!';
  document.getElementById('guess-input').value = '';
  document.getElementById('guess-submit').style.background = 'var(--vanish)';
  renderWrongChips();
  document.getElementById('guess-modal').classList.remove('hidden');
  setTimeout(() => document.getElementById('guess-input').focus(), 80);
}

function closeGuessModal() {
  document.getElementById('guess-modal').classList.add('hidden');
}

function submitGuess() {
  const input = document.getElementById('guess-input');
  const guess = input.value.trim();
  if (!guess) return;

  const remaining = vGhostIdxs.filter(i => !vFoundIdxs.includes(i));
  const matchIdx = remaining.find(i => vGridCards[i].word.trim().toLowerCase() === guess.trim().toLowerCase());

  if (matchIdx !== undefined) {
    input.value = '';
    vFoundIdxs.push(matchIdx);
    closeGuessModal();
    renderVanishGrid(true);
    const allFound = vGhostIdxs.every(i => vFoundIdxs.includes(i));
    if (allFound) {
      spawnVanishConfetti();
      const last = vRound >= S.vanishRounds - 1;
      setTimeout(() => {
        if (last) {
          showEndSheet('All done!', 'Play Again', 'var(--vanish)');
        } else {
          document.getElementById('target-end-title').textContent = `Round ${vRound + 1} finished!`;
          const btn = document.getElementById('target-end-primary');
          btn.textContent = 'Next Round';
          btn.style.background = 'var(--vanish)';
          btn.onclick = () => {
            document.getElementById('target-end-overlay').classList.add('hidden');
            vRound++;
            startVanishRound();
          };
          document.getElementById('target-end-overlay').classList.remove('hidden');
        }
      }, 1000);
    } else {
      spawnVanishConfetti();
    }
  } else {
    input.value = '';
    vWrong.push(guess);
    renderWrongChips();
    input.classList.add('shake');
    setTimeout(() => input.classList.remove('shake'), 400);
  }
}

function showMeVanish() {
  const remaining = vGhostIdxs.filter(i => !vFoundIdxs.includes(i));
  if (!remaining.length) return;
  const idx = remaining[Math.floor(Math.random() * remaining.length)];
  const cells = document.querySelectorAll('.vanish-cell');
  const cell = cells[idx];
  if (!cell) return;

  const card = vGridCards[idx];

  // Fade out
  cell.style.opacity = '0';
  setTimeout(() => {
    // Swap content
    cell.style.background = 'var(--surface-card)';
    cell.style.border = '2px solid var(--stroke-default)';
    cell.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'vanish-cell-img';
    const img = document.createElement('img');
    img.src = getImagePath(card.folder, card.image);
    img.alt = card.word;
    wrap.appendChild(img);
    const w = document.createElement('div');
    w.className = 'vanish-cell-word';
    w.textContent = card.word;
    cell.appendChild(wrap);
    cell.appendChild(w);
    // Fade in
    cell.style.opacity = '1';

    // Fade out again after 2s
    setTimeout(() => {
      cell.style.opacity = '0';
      setTimeout(() => {
        cell.style.background = 'var(--surface-inset)';
        cell.style.border = '2px solid var(--stroke-default)';
        cell.innerHTML = '';
        const icon = document.createElement('div');
        icon.style.cssText = 'display:flex;align-items:center;justify-content:center;color:var(--text-disabled);';
        icon.innerHTML = `<svg width="32" height="32" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M10 1.66663C11.9891 1.66663 13.8968 2.4568 15.3033 3.86332C16.7098 5.26985 17.5 7.1775 17.5 9.16663V16.35C17.5 17.875 15.8617 18.8391 14.5292 18.0991L14.2267 17.9366C13.3933 17.51 12.74 17.37 11.8192 17.8416L11.6542 17.9316C11.1792 18.2029 10.6448 18.3532 10.0981 18.3692C9.55139 18.3852 9.00913 18.2664 8.51917 18.0233L8.34583 17.9316C7.28167 17.3233 6.54083 17.505 5.47083 18.0983C4.1375 18.84 2.5 17.8758 2.5 16.3508V9.16663C2.5 7.1775 3.29018 5.26985 4.6967 3.86332C6.10322 2.4568 8.01088 1.66663 10 1.66663ZM7.08333 7.49996C6.75181 7.49996 6.43387 7.63166 6.19945 7.86608C5.96503 8.1005 5.83333 8.41844 5.83333 8.74996C5.83333 9.08148 5.96503 9.39942 6.19945 9.63384C6.43387 9.86826 6.75181 9.99996 7.08333 9.99996C7.41485 9.99996 7.7328 9.86826 7.96722 9.63384C8.20164 9.39942 8.33333 9.08148 8.33333 8.74996C8.33333 8.41844 8.20164 8.1005 7.96722 7.86608C7.7328 7.63166 7.41485 7.49996 7.08333 7.49996ZM12.9167 7.49996C12.5851 7.49996 12.2672 7.63166 12.0328 7.86608C11.7984 8.1005 11.6667 8.41844 11.6667 8.74996C11.6667 9.08148 11.7984 9.39942 12.0328 9.63384C12.2672 9.86826 12.5851 9.99996 12.9167 9.99996C13.2482 9.99996 13.5661 9.86826 13.8005 9.63384C14.035 9.39942 14.1667 9.08148 14.1667 8.74996C14.1667 8.41844 14.035 8.1005 13.8005 7.86608C13.5661 7.63166 13.2482 7.49996 12.9167 7.49996Z" fill="currentColor"/></svg>`;
        cell.appendChild(icon);
        cell.style.opacity = '1';
      }, 100);
    }, 350);
  }, 100);
}

function renderWrongChips() {
  const el = document.getElementById('wrong-guesses');
  el.innerHTML = '';
  vWrong.forEach(g => {
    const chip = document.createElement('div');
    chip.className = 'wrong-chip';
    chip.textContent = g;
    el.appendChild(chip);
  });
}

// ── Result popup ─────────────────────────────
function showResultPopup(correct, allFound) {
  const overlay  = document.getElementById('result-overlay');
  const title    = document.getElementById('result-title');
  const buttons  = document.getElementById('result-buttons');
  buttons.innerHTML = '';

  if (correct) {
    title.textContent = 'Good job! 🎉';
    if (allFound) {
      const last = vRound >= S.vanishRounds - 1;
      const btn = document.createElement('button');
      btn.className = 'result-btn result-btn-primary';
      btn.textContent = last ? 'Play Again' : 'Next Round';
      btn.onclick = () => {
        overlay.classList.add('hidden');
        if (last) showEndSheet('All done!', 'Play Again', 'var(--vanish)');
        else { vRound++; startVanishRound(); }
      };
      buttons.appendChild(btn);
    } else {
      const btn = document.createElement('button');
      btn.className = 'result-btn result-btn-primary';
      btn.textContent = 'Keep Guessing';
      btn.onclick = () => { overlay.classList.add('hidden'); openGuessModal(); };
      buttons.appendChild(btn);
    }
  } else {
    title.textContent = 'Nice try!';
    const look = document.createElement('button');
    look.className = 'result-btn result-btn-secondary';
    look.textContent = 'Look Again';
    look.onclick = () => { overlay.classList.add('hidden'); };
    const again = document.createElement('button');
    again.className = 'result-btn result-btn-primary';
    again.textContent = 'Guess Again';
    again.onclick = () => { overlay.classList.add('hidden'); openGuessModal(); };
    buttons.append(look, again);
  }
  overlay.classList.remove('hidden');
}

document.addEventListener('keydown', e => {
  if (document.getElementById('guess-modal').classList.contains('hidden')) return;
  if (e.key === 'Enter') handleGuessSubmit();
});

function spawnVanishConfetti() {
  const grid = document.getElementById('vanish-grid');
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
