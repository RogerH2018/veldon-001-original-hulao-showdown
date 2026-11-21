import { SPRITE_BOUNDS } from './atlas-bounds.js?v=3';

const sheets = new Map();

function loadAtlas(team) {
  if (sheets.has(team)) return sheets.get(team);
  const image = new Image();
  const entry = { image, loaded: false };
  entry.ready = new Promise((resolve, reject) => {
    image.onload = () => { entry.loaded = true; resolve(entry); };
    image.onerror = () => { sheets.delete(team); reject(new Error('无法加载人物图集 ' + team)); };
  });
  entry.ready.catch(() => {});
  sheets.set(team, entry);
  image.src = new URL('../assets/roster/' + team + '.webp', import.meta.url).href;
  return entry;
}

export function preloadFighter(character) { return Promise.all([loadAtlas(character.team).ready, loadAtlas('armor').ready, loadAtlas('weapons').ready]); }

function spriteFrom(team, index) {
  const sheet = loadAtlas(team);
  if (!sheet.loaded) return null;
  const [x, y, w, h, gripY] = SPRITE_BOUNDS[team][index];
  return { image: sheet.image, x, y, w, h, gripY };
}

export const fighterArt = character => spriteFrom(character.team, character.index);
export const armorArt = character => spriteFrom('armor', character.armor);
export const weaponArt = index => spriteFrom('weapons', index);

export async function drawPortrait(canvas, character) {
  canvas.dataset.character = character.id;
  delete canvas.dataset.ready;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  try { await preloadFighter(character); } catch { canvas.dataset.ready = 'error'; return; }
  if (canvas.dataset.character !== character.id) return;
  const sprite = fighterArt(character);
  const scale = 0.95 * Math.min(canvas.width / sprite.w, canvas.height / sprite.h);
  const w = sprite.w * scale, h = sprite.h * scale;
  ctx.drawImage(sprite.image, sprite.x, sprite.y, sprite.w, sprite.h, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
  canvas.dataset.ready = 'true';
}
