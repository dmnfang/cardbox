let LIBRARY = null;

async function loadLibrary() {
  try {
    const res = await fetch('data/library.json');
    LIBRARY = (await res.json()).library;
  } catch(e) {
    console.error('Failed to load library.json', e);
    LIBRARY = [];
  }
}

function getImagePath(folder, image) {
  return `assets/flashcards/${folder}/${encodeURIComponent(image)}`;
}
