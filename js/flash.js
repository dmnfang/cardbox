// ══════════════════════════════════════════════
// FLASH MODE
// ══════════════════════════════════════════════
let flashIdx = 0;
let flashCards = [];
let flashTouchX = 0;

function initFlash() {
  flashCards = [...S.activeCards];
  flashIdx = 0;
  showScreen('screen-flash');
  renderFlash();
  setupFlashTouch();
}

function renderFlash() {
  const card = flashCards[flashIdx];
  if (!card) return;

  document.getElementById('flash-counter').textContent = `${flashIdx + 1} of ${flashCards.length}`;

  const imgWrap = document.getElementById('flash-img-wrap');
  const img     = document.getElementById('flash-img');
  const word    = document.getElementById('flash-word');

  imgWrap.style.display = S.showImage ? 'flex' : 'none';
  word.style.display    = S.showWord  ? 'block' : 'none';

  if (S.showImage) {
  img.style.display = 'none';
  img.src = getImagePath(card.folder, card.image);
  img.alt = card.word;
  img.onload  = () => { img.style.display = 'block'; };
  img.onerror = () => { img.style.display = 'none'; };
}
if (S.showWord) {
  word.textContent = card.word;
  word.style.fontSize = wordFontSize(card.word, S.showImage);
}
}

function flashAdvance() {
  if (flashIdx < flashCards.length - 1) {
    flashIdx++;
    renderFlash();
  } else {
    showEndSheet('All done!', 'Play Again', 'var(--flash)');
  }
}

function flashBack() {
  if (flashIdx > 0) { flashIdx--; renderFlash(); }
}

function setupFlashTouch() {
  const stage = document.getElementById('flash-stage');
  stage.addEventListener('touchstart', e => { flashTouchX = e.touches[0].clientX; }, { passive: true });
  stage.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - flashTouchX;
    if (Math.abs(dx) > 50) { dx < 0 ? flashAdvance() : flashBack(); }
  }, { passive: true });
}

document.addEventListener('keydown', e => {
  if (!document.getElementById('screen-flash').classList.contains('active')) return;
  if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); flashAdvance(); }
  if (e.key === 'ArrowLeft') flashBack();
});
