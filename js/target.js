// ══════════════════════════════════════════════
// TARGET MODE
// ══════════════════════════════════════════════
let tRound = 0;
let tCards = [];
let tCardIdx = 0;
let tKeyword = null;
let tHit = false;

function initTarget() {
  tRound = 0;
  showScreen('screen-target');
  showTargetIntro();
}

function showTargetIntro() {
  tKeyword = S.targetWords[tRound];

  document.getElementById('target-round-label').textContent =
    `Round ${tRound + 1} of ${S.targetWords.length}`;

  renderIntroCard(tKeyword);

  document.getElementById('target-intro').style.display = 'flex';
  document.getElementById('target-active').classList.add('hidden');
}

function renderIntroCard(card) {
  const imgWrap = document.getElementById('ti-img-wrap');
  const img     = document.getElementById('ti-img');
  const word    = document.getElementById('ti-word');

  imgWrap.style.display = S.showImage ? 'flex' : 'none';
  word.style.display    = S.showWord ? 'block' : 'none';

  if (S.showImage) { img.src = getImagePath(card.folder, card.image); img.alt = card.word; }
  if (S.showWord)  { word.textContent = card.word; word.style.fontSize = wordFontSize(card.word, S.showImage); }
}

function startTargetRound() {
  tCards = shuffle([...S.activeCards]);
  tCardIdx = 0; tHit = false;

  document.getElementById('target-intro').style.display = 'none';
  document.getElementById('target-active').classList.remove('hidden');
  renderTargetCard();
}

function renderTargetCard() {
  const card = tCards[tCardIdx];
  if (!card) return;

  document.getElementById('target-card-counter').textContent =
    `${tCardIdx + 1} of ${tCards.length}`;

  const isKw = card.word === tKeyword.word && card.folder === tKeyword.folder;
  document.getElementById('target-card').classList.toggle('is-target', isKw);

  const imgWrap = document.getElementById('t-img-wrap');
  const img     = document.getElementById('t-img');
  const word    = document.getElementById('t-word');

  imgWrap.style.display = S.showImage ? 'flex' : 'none';
  word.style.display    = S.showWord ? 'block' : 'none';

  if (S.showImage) { img.src = getImagePath(card.folder, card.image); img.alt = card.word; img.onerror = () => img.style.display='none'; }
  if (S.showWord)  { word.textContent = card.word; word.style.fontSize = wordFontSize(card.word, S.showImage); }

  if (isKw && !tHit) { tHit = true; spawnTargetConfetti(); }
}
function targetNext() {
  if (tHit) { showTargetEndSheet(); return; }
  tCardIdx = (tCardIdx + 1) % tCards.length;
  if (tCardIdx === 0) tCards = shuffle([...S.activeCards]);
  renderTargetCard();
}

function showTargetEndSheet() {
  const last = tRound >= S.targetWords.length - 1;
  document.getElementById('target-end-title').textContent   = last ? 'All done!' : `Round ${tRound + 1} finished!`;
  const btn = document.getElementById('target-end-primary');
  btn.textContent = last ? 'Play Again' : 'Next Round';
  btn.style.background = 'var(--target)';
  document.getElementById('target-end-overlay').classList.remove('hidden');
}

function targetEndPrimary() {
  document.getElementById('target-end-overlay').classList.add('hidden');
  const last = tRound >= S.targetWords.length - 1;
  if (last) { openPrelaunch('target'); }
  else { tRound++; tHit = false; showTargetIntro(); }
}

function spawnTargetConfetti() {
  const container = document.getElementById('target-confetti');
  container.innerHTML = '';
  const colors = ['var(--flash)','var(--reveal)','var(--target)','var(--vanish)'];
  for (let i = 0; i < 28; i++) {
    const p = document.createElement('div');
    p.className = 'confetti-piece';
    p.style.cssText = `left:${Math.random()*100}%;top:${Math.random()*40}%;background:${colors[i%4]};animation-delay:${Math.random()*0.4}s;animation-duration:${0.6+Math.random()*0.6}s`;
    container.appendChild(p);
  }
  setTimeout(() => { container.innerHTML = ''; }, 1400);
}
