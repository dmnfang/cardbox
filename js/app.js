// ══════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════
const S = {
  activeBook: null,
  selectedDecks: [],
  teamCount: 0,
  teamScores: [],
  mode: null,
  showImage: true,
  showWord: true,
  cardOrder: 'sequential',
  revealContent: 'image',
  revealGrid: '4x4',
  revealSpeed: 1,
  targetWords: [],
  vanishGrid: '2x3',
  vanishRounds: 1,
  activeCards: [],
};

// ══════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════
window.addEventListener('DOMContentLoaded', async () => {
  await loadLibrary();
  buildTabs();
  if (LIBRARY?.length) selectBook(LIBRARY[0].id);
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
});

// ══════════════════════════════════════════════
// NAVIGATION
// ══════════════════════════════════════════════
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function goHome() { showScreen('screen-home'); }

function exitMode() {
  hideOverlays();
  S.teamCount = 0;
  S.teamScores = [];
  S.vanishRounds = 1;
  if (typeof stopPointTicker === 'function') stopPointTicker();
  // Reset team toggle UI
  ['rv','vn'].forEach(prefix => {
    [0,2,3,4].forEach(v => {
      document.getElementById(`${prefix}-${v}`)?.classList.toggle('active', v === 0);
    });
  });
  // Reset vanish rounds UI
  [1,2,3,4,5].forEach(v => {
    document.getElementById(`vr-${v}`)?.classList.toggle('active', v === 1);
  });
  showScreen('screen-home');
}

function openSettings() { openPrelaunch(S.mode); }

function hideOverlays() {
  ['end-overlay','target-end-overlay','guess-modal','result-overlay']
    .forEach(id => document.getElementById(id).classList.add('hidden'));
}

// ══════════════════════════════════════════════
// HOME — TABS
// ══════════════════════════════════════════════
function buildTabs() {
  const el = document.getElementById('book-tabs');
  el.innerHTML = '';
  (LIBRARY || []).forEach(b => {
    const btn = document.createElement('button');
    btn.className = 'book-tab';
    btn.textContent = shortName(b.textbook);
    btn.dataset.id = b.id;
    btn.onclick = () => selectBook(b.id);
    el.appendChild(btn);
  });
}

function shortName(n) {
  if (n.includes("Let's Try 1")) return "Let's Try 1";
  if (n.includes("Let's Try 2")) return "Let's Try 2";
  if (n.includes("New Horizon Elementary 5")) return "New Horizon ES 5";
  if (n.includes("New Horizon Elementary 6")) return "New Horizon ES 6";
  return n;
}

function selectBook(id) {
  S.activeBook = id;
  document.querySelectorAll('.book-tab').forEach(b => b.classList.toggle('active', b.dataset.id === id));
  renderDeckGrid();
}

// ══════════════════════════════════════════════
// HOME — DECK GRID
// ══════════════════════════════════════════════
function renderDeckGrid() {
  const grid = document.getElementById('deck-grid');
  grid.innerHTML = '';
  const book = LIBRARY?.find(b => b.id === S.activeBook);
  if (!book) return;

  book.units.forEach(unit => {
    unit.decks.forEach(deck => {
      const selected = isSelected(book.id, unit.id, deck.id);
      const card = document.createElement('div');
      card.className = 'deck-card' + (selected ? ' selected' : '');
      card.id = `dc-${book.id}-${unit.id}-${deck.id}`;
      card.onclick = () => toggleDeck(book, unit, deck);
      card.innerHTML = `
        <div class="deck-card-header">
          <div class="deck-card-title">${deck.title}</div>
          <div class="deck-dot">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 6L4.5 8.5L10 3" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        </div>
        <div class="deck-subtitle">${unit.unit}: ${unit.title}</div>
        <div class="deck-chip">${deck.cards.length} cards</div>
      `;
      grid.appendChild(card);
    });
  });
}

function isSelected(bookId, unitId, deckId) {
  return S.selectedDecks.some(d => d.bookId === bookId && d.unitId === unitId && d.deckId === deckId);
}

function toggleDeck(book, unit, deck) {
  const idx = S.selectedDecks.findIndex(d => d.bookId === book.id && d.unitId === unit.id && d.deckId === deck.id);
  if (idx >= 0) {
    S.selectedDecks.splice(idx, 1);
  } else {
    S.selectedDecks.push({ bookId: book.id, unitId: unit.id, deckId: deck.id, title: deck.title, unit: unit.unit, folder: deck.folder, cards: deck.cards });
    prefetchDeckImages(deck.folder, deck.cards);
  }
  const el = document.getElementById(`dc-${book.id}-${unit.id}-${deck.id}`);
  if (el) el.classList.toggle('selected', idx < 0);
  updateModeBtns();
}

function clearDecks() {
  S.selectedDecks = [];
  renderDeckGrid();
  updateModeBtns();
}

function prefetchDeckImages(folder, cards) {
  if (!('caches' in window)) return;
  caches.open('cardbox-v2').then(cache => {
    cards.forEach(card => {
      const url = getImagePath(folder, card.image);
      fetch(url).then(res => {
        if (res.ok) cache.put(url, res);
      }).catch(() => {});
    });
  });
}

function updateModeBtns() {
  const n = S.selectedDecks.length;
  const clearBtn = document.getElementById('clear-btn');
  if (clearBtn) clearBtn.classList.toggle('hidden', n === 0);
  ['flash','reveal','target','vanish'].forEach(m => {
    document.getElementById(`btn-${m}`).disabled = n === 0;
  });
  const st = document.getElementById('modes-status');
  if (n === 0) st.innerHTML = 'Select at least 1 deck';
  else st.innerHTML = `<strong>${n}</strong> deck${n>1?'s':''} selected`;
}

function getAllCards() {
  const cards = [];
  S.selectedDecks.forEach(d => d.cards.forEach(c => cards.push({...c, folder: d.folder})));
  return cards;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length-1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
  return a;
}

// ══════════════════════════════════════════════
// PRE-LAUNCH
// ══════════════════════════════════════════════
const MODE_COLOR = { flash:'var(--flash)', reveal:'var(--reveal)', target:'var(--target)', vanish:'var(--vanish)' };
const MODE_ICON  = { flash:'⚡', reveal:'👁', target:'🎯', vanish:'👻' };
const MODE_LABEL = { flash:'Flash', reveal:'Reveal', target:'Target', vanish:'Vanish' };

const modeSVGs = {
  flash:  `<svg width="32" height="32" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M11.3004 1.04602C11.5035 1.10986 11.6808 1.2368 11.8067 1.40837C11.9326 1.57995 12.0005 1.78721 12.0004 2.00002V7.00002H16.0004C16.1834 6.99994 16.3628 7.05003 16.5192 7.14484C16.6757 7.23965 16.8031 7.37556 16.8876 7.53776C16.9722 7.69996 17.0106 7.88225 16.9988 8.06478C16.9869 8.24732 16.9253 8.4231 16.8204 8.57302L9.82044 18.573C9.69862 18.7476 9.52428 18.8787 9.32278 18.9473C9.12129 19.0159 8.90317 19.0184 8.70014 18.9545C8.49711 18.8906 8.31978 18.7635 8.19394 18.5919C8.06809 18.4202 8.00031 18.2129 8.00044 18V13H4.00045C3.81753 13.0001 3.63809 12.95 3.48166 12.8552C3.32524 12.7604 3.19781 12.6245 3.11325 12.4623C3.0287 12.3001 2.99025 12.1178 3.0021 11.9353C3.01395 11.7527 3.07563 11.5769 3.18045 11.427L10.1804 1.42702C10.3025 1.2528 10.4768 1.12203 10.6782 1.05369C10.8797 0.985356 11.0976 0.983018 11.3004 1.04702" fill="currentColor"/></svg>`,
  reveal: `<svg width="32" height="32" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10.0007 7.5C9.33761 7.5 8.70172 7.76339 8.23288 8.23223C7.76404 8.70107 7.50065 9.33696 7.50065 10C7.50065 10.663 7.76404 11.2989 8.23288 11.7678C8.70172 12.2366 9.33761 12.5 10.0007 12.5C10.6637 12.5 11.2996 12.2366 11.7684 11.7678C12.2373 11.2989 12.5007 10.663 12.5007 10C12.5007 9.33696 12.2373 8.70107 11.7684 8.23223C11.2996 7.76339 10.6637 7.5 10.0007 7.5ZM10.0007 14.1667C8.89558 14.1667 7.83577 13.7277 7.05437 12.9463C6.27297 12.1649 5.83398 11.1051 5.83398 10C5.83398 8.89493 6.27297 7.83512 7.05437 7.05372C7.83577 6.27232 8.89558 5.83333 10.0007 5.83333C11.1057 5.83333 12.1655 6.27232 12.9469 7.05372C13.7283 7.83512 14.1673 8.89493 14.1673 10C14.1673 11.1051 13.7283 12.1649 12.9469 12.9463C12.1655 13.7277 11.1057 14.1667 10.0007 14.1667ZM10.0007 3.75C5.83398 3.75 2.27565 6.34167 0.833984 10C2.27565 13.6583 5.83398 16.25 10.0007 16.25C14.1673 16.25 17.7256 13.6583 19.1673 10C17.7256 6.34167 14.1673 3.75 10.0007 3.75Z" fill="currentColor"/></svg>`,
  target: `<svg width="32" height="32" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 12.5C10.663 12.5 11.2989 12.2366 11.7678 11.7678C12.2366 11.2989 12.5 10.663 12.5 10C12.5 9.33696 12.2366 8.70107 11.7678 8.23223C11.2989 7.76339 10.663 7.5 10 7.5C9.33696 7.5 8.70107 7.76339 8.23223 8.23223C7.76339 8.70107 7.5 9.33696 7.5 10C7.5 10.663 7.76339 11.2989 8.23223 11.7678C8.70107 12.2366 9.33696 12.5 10 12.5Z" fill="currentColor"/><path fill-rule="evenodd" clip-rule="evenodd" d="M9.99935 18.3333C14.6018 18.3333 18.3327 14.6025 18.3327 9.99996C18.3327 5.39746 14.6018 1.66663 9.99935 1.66663C5.39685 1.66663 1.66602 5.39746 1.66602 9.99996C1.66602 14.6025 5.39685 18.3333 9.99935 18.3333ZM14.9993 9.99996C14.9993 11.326 14.4726 12.5978 13.5349 13.5355C12.5972 14.4732 11.3254 15 9.99935 15C8.67327 15 7.4015 14.4732 6.46382 13.5355C5.52613 12.5978 4.99935 11.326 4.99935 9.99996C4.99935 8.67388 5.52613 7.40211 6.46382 6.46443C7.4015 5.52674 8.67327 4.99996 9.99935 4.99996C11.3254 4.99996 12.5972 5.52674 13.5349 6.46443C14.4726 7.40211 14.9993 8.67388 14.9993 9.99996Z" fill="currentColor"/></svg>`,
  vanish: `<svg width="32" height="32" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M10 1.66663C11.9891 1.66663 13.8968 2.4568 15.3033 3.86332C16.7098 5.26985 17.5 7.1775 17.5 9.16663V16.35C17.5 17.875 15.8617 18.8391 14.5292 18.0991L14.2267 17.9366C13.3933 17.51 12.74 17.37 11.8192 17.8416L11.6542 17.9316C11.1792 18.2029 10.6448 18.3532 10.0981 18.3692C9.55139 18.3852 9.00913 18.2664 8.51917 18.0233L8.34583 17.9316C7.28167 17.3233 6.54083 17.505 5.47083 18.0983C4.1375 18.84 2.5 17.8758 2.5 16.3508V9.16663C2.5 7.1775 3.29018 5.26985 4.6967 3.86332C6.10322 2.4568 8.01088 1.66663 10 1.66663ZM7.08333 7.49996C6.75181 7.49996 6.43387 7.63166 6.19945 7.86608C5.96503 8.1005 5.83333 8.41844 5.83333 8.74996C5.83333 9.08148 5.96503 9.39942 6.19945 9.63384C6.43387 9.86826 6.75181 9.99996 7.08333 9.99996C7.41485 9.99996 7.7328 9.86826 7.96722 9.63384C8.20164 9.39942 8.33333 9.08148 8.33333 8.74996C8.33333 8.41844 8.20164 8.1005 7.96722 7.86608C7.7328 7.63166 7.41485 7.49996 7.08333 7.49996ZM12.9167 7.49996C12.5851 7.49996 12.2672 7.63166 12.0328 7.86608C11.7984 8.1005 11.6667 8.41844 11.6667 8.74996C11.6667 9.08148 11.7984 9.39942 12.0328 9.63384C12.2672 9.86826 12.5851 9.99996 12.9167 9.99996C13.2482 9.99996 13.5661 9.86826 13.8005 9.63384C14.035 9.39942 14.1667 9.08148 14.1667 8.74996C14.1667 8.41844 14.035 8.1005 13.8005 7.86608C13.5661 7.63166 13.2482 7.49996 12.9167 7.49996Z" fill="currentColor"/></svg>`
};

const modeIconColors = {
  flash: '#F0C040', reveal: '#6AB4E8', target: '#F08080', vanish: '#80C8A0'
};

function openPrelaunch(mode) {
  const prevMode = S.mode;
  S.mode = mode;

  // Reset teams only when switching modes
  if (prevMode !== mode) {
    S.teamCount = 0;
    S.teamScores = [];
    ['rv','vn'].forEach(prefix => {
      [0,2,3,4].forEach(v => {
        document.getElementById(`${prefix}-${v}`)?.classList.toggle('active', v === 0);
      });
    });
  }

  const iconContainer = document.getElementById('prelaunch-icon');
  iconContainer.outerHTML = `<span id="prelaunch-icon" style="color:${modeIconColors[mode]};display:flex;align-items:center;">${modeSVGs[mode]}</span>`;
  document.getElementById('prelaunch-label').textContent = MODE_LABEL[mode];

  const btn = document.getElementById('launch-btn');
  btn.dataset.mode = mode;
  btn.style.background = MODE_COLOR[mode];
  document.getElementById('launch-icon').textContent = MODE_ICON[mode];
  document.getElementById('launch-label').textContent = `Launch ${MODE_LABEL[mode]}`;

  ['s-flash','s-reveal','s-target','s-vanish'].forEach(id => {
    const el = document.getElementById(id);
    el.classList.add('hidden');
    el.style.display = '';
  });

  if (mode === 'flash') {
    const el = document.getElementById('s-flash');
    el.classList.remove('hidden');
    el.style.cssText = 'display:flex;flex-direction:column;gap:20px;flex:1;min-height:0';
    updateCardPreview();
  } else if (mode === 'reveal') {
    const el = document.getElementById('s-reveal');
    el.classList.remove('hidden');
    el.style.cssText = 'display:flex;flex-direction:column;gap:20px;flex:1;min-height:0';
    updateRevealPreview();
  } else if (mode === 'target') {
    const el = document.getElementById('s-target');
    el.classList.remove('hidden');
    el.style.cssText = 'display:flex;flex-direction:column;gap:12px;flex:1;min-height:0';
    buildWordPicker();
    updateTargetCounter();
  } else if (mode === 'vanish') {
    const el = document.getElementById('s-vanish');
    el.classList.remove('hidden');
    el.style.cssText = 'display:flex;flex-direction:column;gap:20px;flex:1;min-height:0';
    updateVanishPreview();
    updateVanishGridBtns();
  }

  renderSelectedList();
  updateLaunchBtn();
  showScreen('screen-prelaunch');
}

function renderSelectedList() {
  const list = document.getElementById('selected-list');
  list.innerHTML = '';
  if (S.selectedDecks.length === 0) {
    list.innerHTML = `
      <div class="no-decks">
        <p><strong>No decks selected</strong><br>Please go back and select some decks to use this mode</p>
        <button class="back-home-btn" onclick="goHome()">Back to Home</button>
      </div>
    `;
    return;
  }
  S.selectedDecks.forEach((d, i) => {
    const item = document.createElement('div');
    item.className = 'sel-item';
    item.innerHTML = `
      <div class="deck-card-header">
        <div class="sel-title">${d.title}</div>
        <button class="remove-btn" onclick="removeDeck(${i})">✕</button>
      </div>
      <div class="sel-sub">${d.unit}: ${d.title}</div>
      <div class="deck-chip">${d.cards.length} cards</div>
    `;
    list.appendChild(item);
  });
}

function removeDeck(i) {
  S.selectedDecks.splice(i, 1);
  renderDeckGrid();
  updateModeBtns();
  renderSelectedList();
  updateLaunchBtn();
  if (S.mode === 'target') { buildWordPicker(); updateTargetCounter(); }
  if (S.mode === 'vanish') { updateVanishPreview(); updateVanishGridBtns(); }
  if (S.mode === 'reveal') { updateRevealPreview(); }
}

// Flash content toggles
function toggleContent(type, on) {
  if (type === 'image') S.showImage = on;
  else S.showWord = on;
  if (!S.showImage && !S.showWord) { if (type === 'image') { S.showWord = true; } else { S.showImage = true; } }
  document.getElementById('t-img-on').classList.toggle('active', S.showImage);
  document.getElementById('t-img-off').classList.toggle('active', !S.showImage);
  document.getElementById('t-word-on').classList.toggle('active', S.showWord);
  document.getElementById('t-word-off').classList.toggle('active', !S.showWord);
  updateCardPreview();
}

function updateCardPreview() {
  const cards = getAllCards();
  const sample = cards[0];
  const imgWrap = document.getElementById('prev-img-wrap');
  const word = document.getElementById('prev-word');
  imgWrap.style.display = S.showImage ? 'flex' : 'none';
  word.style.display = S.showWord ? 'block' : 'none';
  if (sample && S.showImage) {
    const img = document.getElementById('prev-img');
    img.src = getImagePath(sample.folder, sample.image);
    img.alt = sample.word;
  }
  if (sample && S.showWord) word.textContent = sample.word;
}

function setOrder(o) {
  S.cardOrder = o;
  document.getElementById('t-seq').classList.toggle('active', o === 'sequential');
  document.getElementById('t-shuf').classList.toggle('active', o === 'shuffle');
}

function setGrid(g) {
  S.revealGrid = g;
  ['4x4','6x4','8x4','10x4'].forEach(v => document.getElementById(`rg-${v}`).classList.toggle('active', v === g));
  updateRevealPreview();
}

function setRevealContent(c) {
  S.revealContent = c;
  document.getElementById('r-img').classList.toggle('active', c === 'image');
  document.getElementById('r-word').classList.toggle('active', c === 'word');
  updateRevealPreview();
}

function setSpeed(s) {
  S.revealSpeed = s;
  [1,2,3].forEach(v => document.getElementById(`rs-${v}`).classList.toggle('active', v === s));
  clearInterval(window._revealPreviewTimer);
  updateRevealPreview();
}

function updateRevealPreview() {
  const preview = document.getElementById('card-preview-reveal');
  if (!preview) return;
  const map = { '4x4':[4,4], '6x4':[6,4], '8x4':[8,4], '10x4':[10,4] };
  const [cols, rows] = map[S.revealGrid] || [4,4];
  const colors = ['var(--flash)', 'var(--vanish)', 'var(--target)', 'var(--reveal)'];
  preview.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  preview.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
  preview.innerHTML = '';

  const cards = getAllCards();
  const sample = cards[0];
  if (!sample) {
    const imgWrap = document.getElementById('prev-img-wrap-reveal');
    const word = document.getElementById('prev-word-reveal');
    if (imgWrap) imgWrap.style.setProperty('display', 'none', 'important');
    if (word) word.style.setProperty('display', 'none', 'important');
    if (preview) preview.innerHTML = '';
    clearInterval(window._revealPreviewTimer);
    return;
  }

  const imgWrap = document.getElementById('prev-img-wrap-reveal');
  const word = document.getElementById('prev-word-reveal');
  if (!imgWrap || !word) return;

  if (S.revealContent === 'image') {
    imgWrap.style.setProperty('display', 'flex', 'important');
    word.style.setProperty('display', 'none', 'important');
    const img = document.getElementById('prev-img-reveal');
    img.src = getImagePath(sample.folder, sample.image);
  } else {
    imgWrap.style.setProperty('display', 'none', 'important');
    word.style.setProperty('display', 'flex', 'important');
    word.textContent = sample.word;
  }

  for (let i = 0; i < cols * rows; i++) {
    const sq = document.createElement('div');
    sq.className = 'reveal-preview-sq';
    sq.style.background = colors[(i + Math.floor(i / cols)) % 4];
    preview.appendChild(sq);
  }
  animateRevealPreview(preview, cols * rows);
}

function animateRevealPreview(grid, total) {
  const speedMs = { 1: 800, 2: 400, 3: 150 };
  const delay = speedMs[S.revealSpeed] || 800;
  const squares = [...grid.querySelectorAll('.reveal-preview-sq')];
  const order = shuffle([...Array(total).keys()]);
  let i = 0;
  clearInterval(window._revealPreviewTimer);
  window._revealPreviewTimer = setInterval(() => {
    if (i >= order.length) {
      clearInterval(window._revealPreviewTimer);
      setTimeout(() => updateRevealPreview(), 1000);
      return;
    }
    squares[order[i]].style.opacity = '0';
    i++;
  }, delay);
}

// Target word picker
function buildWordPicker() {
  S.targetWords = [];
  const grid = document.getElementById('word-picker-grid');
  grid.innerHTML = '';
  getAllCards().forEach(card => {
    const tile = document.createElement('button');
    tile.className = 'word-tile';
    tile.textContent = card.word;
    tile.onclick = () => toggleTargetWord(card, tile);
    grid.appendChild(tile);
  });
}

function toggleTargetWord(card, tile) {
  const idx = S.targetWords.findIndex(w => w.word === card.word && w.folder === card.folder);
  if (idx >= 0) {
    S.targetWords.splice(idx, 1);
    tile.classList.remove('selected');
    tile.querySelector('.word-tile-badge')?.remove();
    renumberBadges();
  } else {
    S.targetWords.push({...card});
    tile.classList.add('selected');
    const badge = document.createElement('div');
    badge.className = 'word-tile-badge';
    badge.textContent = S.targetWords.length;
    tile.appendChild(badge);
  }
  updateTargetCounter();
  updateLaunchBtn();
}

function renumberBadges() {
  let i = 1;
  document.querySelectorAll('.word-tile.selected .word-tile-badge').forEach(b => b.textContent = i++);
}

function updateTargetCounter() {
  const n = S.targetWords.length;
  const el = document.getElementById('target-counter');
  if (n === 0) {
    el.innerHTML = 'Select at least 1 keyword to get started';
  } else {
    el.innerHTML = `<strong>${n} target word${n>1?'s':''}</strong> selected — <strong>${n} round${n>1?'s':''}</strong> will be played`;
  }
}

// Vanish
function setVanishGrid(g) {
  S.vanishGrid = g;
  updateVanishGridBtns();
  updateVanishPreview();
}

function updateVanishGridBtns() {
  const total = getAllCards().length;
  const sizes = {'2x3':6,'3x3':9,'4x3':12};
  ['2x3','3x3','4x3'].forEach(g => {
    const btn = document.getElementById(`vg-${g}`);
    if (!btn) return;
    btn.disabled = sizes[g] > total;
    btn.classList.toggle('active', g === S.vanishGrid);
  });
}

function setVanishRounds(r) {
  S.vanishRounds = r;
  [1,2,3,4,5].forEach(v => document.getElementById(`vr-${v}`)?.classList.toggle('active', v === r));
}

function setTeams(n, prefix) {
  S.teamCount = n;
  S.teamScores = Array(n).fill(0);
  [0,2,3,4].forEach(v => {
    document.getElementById(`${prefix}-${v}`)?.classList.toggle('active', v === n);
  });
}

function updateVanishPreview() {
  const preview = document.getElementById('vanish-preview-grid');
  if (!preview) return;
  const map = {'2x3':[2,3],'3x3':[3,3],'4x3':[4,3]};
  const [cols, rows] = map[S.vanishGrid] || [2,3];
  const total = cols * rows;
  preview.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  preview.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
  preview.innerHTML = '';
  const ghostIdx = Math.floor(Math.random() * total);
  const cards = getAllCards().slice(0, total);
  for (let i = 0; i < total; i++) {
    const cell = document.createElement('div');
    cell.className = 'vanish-pcell' + (i === ghostIdx ? ' ghost' : '');
    if (i === ghostIdx) {
      cell.innerHTML = `<svg width="24" height="24" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M10 1.66663C11.9891 1.66663 13.8968 2.4568 15.3033 3.86332C16.7098 5.26985 17.5 7.1775 17.5 9.16663V16.35C17.5 17.875 15.8617 18.8391 14.5292 18.0991L14.2267 17.9366C13.3933 17.51 12.74 17.37 11.8192 17.8416L11.6542 17.9316C11.1792 18.2029 10.6448 18.3532 10.0981 18.3692C9.55139 18.3852 9.00913 18.2664 8.51917 18.0233L8.34583 17.9316C7.28167 17.3233 6.54083 17.505 5.47083 18.0983C4.1375 18.84 2.5 17.8758 2.5 16.3508V9.16663C2.5 7.1775 3.29018 5.26985 4.6967 3.86332C6.10322 2.4568 8.01088 1.66663 10 1.66663ZM7.08333 7.49996C6.75181 7.49996 6.43387 7.63166 6.19945 7.86608C5.96503 8.1005 5.83333 8.41844 5.83333 8.74996C5.83333 9.08148 5.96503 9.39942 6.19945 9.63384C6.43387 9.86826 6.75181 9.99996 7.08333 9.99996C7.41485 9.99996 7.7328 9.86826 7.96722 9.63384C8.20164 9.39942 8.33333 9.08148 8.33333 8.74996C8.33333 8.41844 8.20164 8.1005 7.96722 7.86608C7.7328 7.63166 7.41485 7.49996 7.08333 7.49996ZM12.9167 7.49996C12.5851 7.49996 12.2672 7.63166 12.0328 7.86608C11.7984 8.1005 11.6667 8.41844 11.6667 8.74996C11.6667 9.08148 11.7984 9.39942 12.0328 9.63384C12.2672 9.86826 12.5851 9.99996 12.9167 9.99996C13.2482 9.99996 13.5661 9.86826 13.8005 9.63384 14.035 9.39942 14.1667 9.08148 14.1667 8.74996C14.1667 8.41844 14.035 8.1005 13.8005 7.86608C13.5661 7.63166 13.2482 7.49996 12.9167 7.49996Z" fill="currentColor"/></svg>`;
    } else {
      cell.textContent = cards[i]?.word || '';
    }
    preview.appendChild(cell);
  }
}

function updateLaunchBtn() {
  const btn = document.getElementById('launch-btn');
  if (!btn) return;
  const noDecks = S.selectedDecks.length === 0;
  const noTarget = S.mode === 'target' && S.targetWords.length === 0;
  btn.disabled = noDecks || noTarget;
}

// ══════════════════════════════════════════════
// LAUNCH
// ══════════════════════════════════════════════
function launchMode() {
  let cards = getAllCards();
  if (S.cardOrder === 'shuffle') cards = shuffle(cards);
  S.activeCards = cards;
  if (S.mode === 'flash')  initFlash();
  if (S.mode === 'reveal') initReveal();
  if (S.mode === 'target') initTarget();
  if (S.mode === 'vanish') initVanish();
}

// ══════════════════════════════════════════════
// END SHEET
// ══════════════════════════════════════════════
function showEndSheet(title, primaryLabel, primaryColor) {
  document.getElementById('end-title').textContent = title;
  const btn = document.getElementById('end-primary');
  btn.textContent = primaryLabel;
  btn.style.background = primaryColor;
  document.getElementById('end-overlay').classList.remove('hidden');
}

function endPrimary() {
  document.getElementById('end-overlay').classList.add('hidden');
  openPrelaunch(S.mode);
}

function endSecondary() {
  hideOverlays();
  goHome();
}

// ══════════════════════════════════════════════
// WORD SIZE HELPER
// ══════════════════════════════════════════════
function wordFontSize(word, hasImage) {
  if (!hasImage) {
    if (word.length <= 5)  return '176px';
    if (word.length <= 10) return '128px';
    if (word.length <= 18) return '96px';
    return '64px';
  }
  if (word.length <= 10) return '64px';
  if (word.length <= 20) return '48px';
  return '40px';
}

// ══════════════════════════════════════════════
// GUESS MODAL
// ══════════════════════════════════════════════
function closeGuessModal() {
  document.getElementById('guess-modal').classList.add('hidden');
  console.log('closeGuessModal called, mode:', S.mode, 'teamCount:', S.teamCount);
  if (S.mode === 'reveal') {
    revPaused = false;
    startRevTimer();
  }
  if (S.mode === 'vanish' && S.teamCount > 0) {
    console.log('restarting ticker');
    startPointTicker(false);
  }
}

function handleGuessSubmit() {
  if (S.mode === 'vanish') submitGuess();
  if (S.mode === 'reveal') submitRevealGuess(window._revealGuessingTeam);
}

// ══════════════════════════════════════════════
// TEAM BUTTONS
// ══════════════════════════════════════════════
const TEAM_ICONS = [
  `<svg width="20" height="20" viewBox="0 0 20 20"><circle cx="10" cy="10" r="9" stroke="currentColor" stroke-width="1.5" fill="none"/><text x="10" y="14" text-anchor="middle" font-size="11" font-weight="800" fill="currentColor" font-family="Nunito, sans-serif">1</text></svg>`,
  `<svg width="20" height="20" viewBox="0 0 20 20"><circle cx="10" cy="10" r="9" stroke="currentColor" stroke-width="1.5" fill="none"/><text x="10" y="14" text-anchor="middle" font-size="11" font-weight="800" fill="currentColor" font-family="Nunito, sans-serif">2</text></svg>`,
  `<svg width="20" height="20" viewBox="0 0 20 20"><circle cx="10" cy="10" r="9" stroke="currentColor" stroke-width="1.5" fill="none"/><text x="10" y="14" text-anchor="middle" font-size="11" font-weight="800" fill="currentColor" font-family="Nunito, sans-serif">3</text></svg>`,
  `<svg width="20" height="20" viewBox="0 0 20 20"><circle cx="10" cy="10" r="9" stroke="currentColor" stroke-width="1.5" fill="none"/><text x="10" y="14" text-anchor="middle" font-size="11" font-weight="800" fill="currentColor" font-family="Nunito, sans-serif">4</text></svg>`,
];

function buildTeamBtns(containerId, onClickFn) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  if (S.teamCount === 0) {
    container.classList.add('hidden');
    return;
  }
  container.classList.remove('hidden');
  for (let i = 0; i < S.teamCount; i++) {
    const btn = document.createElement('button');
    btn.className = 'team-btn';
    btn.id = `${containerId}-t${i}`;
    btn.innerHTML = `${TEAM_ICONS[i]}<span>${S.teamScores[i]}</span>`;
    btn.onclick = () => onClickFn(i);
    container.appendChild(btn);
  }
}

function updateTeamScore(containerId, teamIdx) {
  const btn = document.getElementById(`${containerId}-t${teamIdx}`);
  if (btn) btn.querySelector('span').textContent = S.teamScores[teamIdx];
}