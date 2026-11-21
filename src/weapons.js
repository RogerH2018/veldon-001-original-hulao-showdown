import { weaponArt } from './art.js?v=3';

const ink = '#35252e', gold = '#e0ad62', pale = '#fff0bf';
const paths = new Map();
export function shape(ctx, outline, fill, edge = ink, width = 2) {
  if (!paths.has(outline)) paths.set(outline, new Path2D(outline));
  const path = paths.get(outline);
  if (fill) { ctx.fillStyle = fill; ctx.fill(path); }
  if (edge) { ctx.strokeStyle = edge; ctx.lineWidth = width; ctx.stroke(path); }
}
export function line(ctx, x1, y1, x2, y2, color, width) {
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
}
export function oval(ctx, x, y, rx, ry, fill, rotation = 0) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rotation, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill();
}
// Atlas cell, length in puppet space, and horizontal grip position.
const equipment = {
  sword: [0, 84, .16], twins: [1, 70, .17], daggers: [2, 52, .25], spear: [3, 142, .34],
  serpent: [4, 148, .34], glaive: [5, 149, .34], halberd: [6, 149, .34], axe: [7, 109, .28],
  hammer: [8, 98, .26], mace: [9, 95, .27],
};
const personalGear = { 典韦: [6, 75, .25], 凌统: [9, 65, .24] };
const longArms = new Set(['spear', 'serpent', 'glaive', 'halberd', 'axe', 'hammer', 'staff', 'mace']);
export const twoHanded = weapon => longArms.has(weapon) || weapon === 'bow' || weapon === 'lute';

function shaft(ctx, from, to) {
  line(ctx, from, 0, to, 0, ink, 6.3);
  line(ctx, from, -0.5, to, -0.5, '#985f43', 3.5);
  for (let x = -8; x < 13; x += 4) line(ctx, x, -2, x + 1, 2, gold, 1.1);
}
function fan(ctx, color) {
  for (let i = -3; i <= 3; i++) {
    ctx.save(); ctx.rotate(i * 0.18);
    shape(ctx, 'M3 0 Q17 -12 49 -3 Q43 8 8 4 Z', i % 2 ? '#f6e8c4' : '#d5d8bb');
    shape(ctx, 'M6 1 Q24 -2 44 -3', null, '#ac936b', 1);
    ctx.restore();
  }
  line(ctx, -7, 0, 13, 0, gold, 4);
  oval(ctx, 6, 0, 3, 3, color);
}
function bow(ctx, draw, color) {
  shape(ctx, 'M0 -39 Q1 -32 9 -28 Q31 -13 14 0 Q29 13 9 28 Q1 32 0 39', null, ink, 6);
  shape(ctx, 'M0 -39 Q1 -32 9 -28 Q31 -13 14 0 Q29 13 9 28 Q1 32 0 39', null, gold, 3);
  line(ctx, 0, -39, -6 - draw, 0, pale, 1.3); line(ctx, -6 - draw, 0, 0, 39, pale, 1.3);
  line(ctx, -21 - draw, 0, 42 - draw, 0, '#674030', 2.6);
  ctx.save(); ctx.translate(39 - draw, 0); shape(ctx, 'M-2 -3 L9 0 L-2 3 Z', '#dee9e3'); ctx.restore();
  line(ctx, -15 - draw, -2, -21 - draw, -5, color, 2);
}
export function drawWeapon(ctx, character, time, striking, draw = 0) {
  const weapon = character.weapon;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (equipment[weapon]) {
    const [cell, length, grip] = personalGear[character.name] ?? equipment[weapon];
    const sprite = weaponArt(weapon === 'sword' && character.style.includes('刀') ? 1 : cell);
    if (!sprite) return;
    const height = length * sprite.h / sprite.w;
    ctx.drawImage(sprite.image, sprite.x, sprite.y, sprite.w, sprite.h, -grip * length, -height * sprite.gripY, length, height);
  } else if (weapon === 'fan') fan(ctx, character.color);
  else if (weapon === 'bow') bow(ctx, Math.min(22, Math.abs(draw)), character.robe);
  else if (weapon === 'ribbon') {
    const length = striking ? 88 : 56;
    ctx.beginPath(); ctx.moveTo(-3, 0); ctx.bezierCurveTo(18, -40, length * .58, 36, length, -8 + time * 10);
    ctx.bezierCurveTo(length * .50, 55, 17, -21, -3, 6);
    ctx.fillStyle = character.robe; ctx.fill(); ctx.strokeStyle = '#e9c68e'; ctx.lineWidth = 2; ctx.stroke();
  } else if (weapon === 'lute') {
    shape(ctx, 'M-24 -7 Q-19 -12 -10 -10 L2 -8 Q27 -7 46 -5 L48 5 Q25 8 5 10 Q-11 15 -23 10 Z', '#83523e', gold);
    for (let y = -5; y <= 5; y += 2) line(ctx, -17, y, 42, y * .52, pale, .7);
    for (let i = 0; i < 7; i++) oval(ctx, -14+i*7, -7+i*.24, .9,.9,pale);
  } else if (weapon === 'scroll') {
    shape(ctx, 'M-2 -12 Q16 -7 35 -15 L39 10 Q16 15 -1 10 Z', '#eed2a3');
    for (let i = 4; i < 35; i += 5) { line(ctx, i, -6, i + 1, 7, '#a58258', .9); line(ctx, i + 1, -3, i + 1, 2, '#624e43', 1); }
    line(ctx, 36, -16, 40, 11, gold, 4);
  } else if (weapon === 'staff') {
    shaft(ctx, -35, 64);
    shape(ctx, 'M53 0 Q54 -12 64 -9 L69 0 L63 9 Q56 12 53 0 Z', gold);
    oval(ctx, 62, -1, 4.5, 5.5, character.color);
  } else if (weapon === 'shield') {
    shape(ctx, 'M4 -26 Q28 -19 31 -5 Q34 18 15 30 Q-8 24 -13 1 Q-11 -18 4 -26 Z', character.lining, gold, 3.4);
    shape(ctx, 'M7 -18 L22 -11 L24 3 L15 18 L0 8 L-4 -7 Z', character.robe, '#bc9258');
    oval(ctx, 10, -1, 6, 6, gold);
  }
}
