import { SPRITE_BOUNDS } from './atlas-bounds.js?v=5';
import { RIG_BOUNDS } from './rig-bounds.js?v=5';

const sheets = new Map();
const parts = ['part-sleeve', 'part-bracer', 'part-trousers', 'part-greave', 'part-boots', 'part-hands'];
const rigs = new WeakMap();

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
  image.src = new URL('../assets/' + (RIG_BOUNDS[team] ? 'rig/' : 'roster/') + team + '.webp' + (team === 'part-hands' || team === 'part-boots' ? '?v=5' : ''), import.meta.url).href;
  return entry;
}

export function preloadFighter(character) {
  return Promise.all([character.team, 'body-' + character.team, 'weapons', ...parts].map(id => loadAtlas(id).ready));
}

function spriteFrom(team, index) {
  const sheet = loadAtlas(team);
  if (!sheet.loaded) return null;
  const [x, y, w, h, gripY] = (RIG_BOUNDS[team] ?? SPRITE_BOUNDS[team])[index];
  return { image: sheet.image, x, y, w, h, gripY };
}

export const fighterArt = character => spriteFrom(character.team, character.index);
export const armorArt = character => spriteFrom('body-' + character.team, character.index);
export const weaponArt = index => spriteFrom('weapons', index);

// The portrait paintings use vermilion and bronze skin on these fighters.
const handTones = { 关羽:'vermilion', 魏延:'vermilion', 孟获:'bronze', 祝融:'bronze' };
const handPalettes = new Map();
function handsForPortrait(hands, name) {
  const tone = handTones[name];
  if (!tone) return hands;
  if (!handPalettes.has(tone)) {
    const source=hands[0].image, atlas=document.createElement('canvas');
    atlas.width=source.naturalWidth; atlas.height=source.naturalHeight;
    const ctx=atlas.getContext('2d');
    ctx.drawImage(source,0,0);
    const pixels=ctx.getImageData(0,0,atlas.width,atlas.height), rgba=pixels.data;
    const channels=tone==='vermilion'?[.98,.73,.72]:[.83,.79,.74];
    for(let i=0;i<rgba.length;i+=4) {
      rgba[i]*=channels[0]; rgba[i+1]*=channels[1]; rgba[i+2]*=channels[2];
    }
    ctx.putImageData(pixels,0,0);
    handPalettes.set(tone,hands.map(sprite=>({...sprite,image:atlas})));
  }
  return handPalettes.get(tone);
}

export function fighterRig(character) {
  if (rigs.has(character)) return rigs.get(character);
  const [sleeve, bracer, trousers, greave, boot] = parts.slice(0,5).map(id => spriteFrom(id, character.armor));
  const hands = Array.from({length:10}, (_, i) => spriteFrom('part-hands', i));
  const head = fighterArt(character), body = armorArt(character);
  if (!head || !body || !sleeve || !bracer || !trousers || !greave || !boot || !hands[0]) return null;
  const rig = { head, body, sleeve, bracer, trousers, greave, boot, hands:handsForPortrait(hands,character.name) };
  rigs.set(character, rig);
  return rig;
}

export async function drawPortrait(canvas, character) {
  canvas.dataset.character = character.id;
  delete canvas.dataset.ready;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  try { await loadAtlas(character.team).ready; } catch { canvas.dataset.ready = 'error'; return; }
  if (canvas.dataset.character !== character.id) return;
  const sprite = fighterArt(character);
  const scale = 0.95 * Math.min(canvas.width / sprite.w, canvas.height / sprite.h);
  const w = sprite.w * scale, h = sprite.h * scale;
  ctx.drawImage(sprite.image, sprite.x, sprite.y, sprite.w, sprite.h, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
  canvas.dataset.ready = 'true';
}
