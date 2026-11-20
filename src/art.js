const sheets = new Map();

function alphaBounds(ctx, cellX, cellY, width, height) {
  const data = ctx.getImageData(cellX, cellY, width, height).data;
  let left = width, right = -1, top = height, bottom = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] < 110) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }
  if (right < left) throw new Error('Sprite cell is empty');
  left = Math.max(0, left - 3);
  top = Math.max(0, top - 3);
  right = Math.min(width - 1, right + 3);
  bottom = Math.min(height - 1, bottom + 3);
  return { x: cellX + left, y: cellY + top, w: right + 1 - left, h: bottom + 1 - top };
}

function loadAtlas(team) {
  if (sheets.has(team)) return sheets.get(team);
  const image = new Image();
  const entry = { image, sprites: null };
  entry.ready = new Promise((resolve, reject) => {
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        context.drawImage(image, 0, 0);
        entry.sprites = Array.from({ length: 10 }, (_, index) => {
          const column = index % 5;
          const row = Math.floor(index / 5);
          const x = Math.round(canvas.width * column / 5);
          const y = Math.round(canvas.height * row / 2);
          return alphaBounds(context, x, y, Math.round(canvas.width * (column + 1) / 5) - x, canvas.height / 2);
        });
        resolve(entry);
      } catch (error) {
        reject(error);
      }
    };
    image.onerror = () => reject(new Error('Could not load artwork for ' + team));
    image.src = new URL('../assets/roster/' + team + '.webp', import.meta.url).href;
  });
  entry.ready.catch(() => {});
  sheets.set(team, entry);
  return entry;
}

export function preloadFighter(character) {
  return loadAtlas(character.team).ready;
}

export function fighterArt(character) {
  const entry = loadAtlas(character.team);
  return entry.sprites ? { image: entry.image, ...entry.sprites[character.index] } : null;
}

export async function drawPortrait(canvas, character, card = false) {
  canvas.dataset.character = character.id;
  delete canvas.dataset.ready;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  try {
    await preloadFighter(character);
  } catch {
    canvas.dataset.ready = 'error';
    return;
  }
  if (canvas.dataset.character !== character.id) return;
  const sprite = fighterArt(character);
  const sourceHeight = card ? sprite.h * 0.46 : sprite.h;
  const scale = Math.min(canvas.width / sprite.w, canvas.height / sourceHeight) * (card ? 1.0 : 0.96);
  const w = sprite.w * scale;
  const h = sourceHeight * scale;
  ctx.drawImage(sprite.image, sprite.x, sprite.y, sprite.w, sourceHeight, (canvas.width - w) / 2, canvas.height - h, w, h);
  canvas.dataset.ready = 'true';
}
