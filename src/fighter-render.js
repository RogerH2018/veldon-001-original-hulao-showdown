import { fighterRig } from './art.js?v=5';
import { MODEL_SCALE, motionAt } from './motion.js?v=5';
import { drawWeapon, oval } from './weapons.js?v=5';

import { HANDS, paired, skeleton } from './rig.js?v=5';
export { skeleton };

const beards = new Set(['关羽', '黄忠', '严颜', '张角', '华佗', '程昱', '左慈']);
const point = (x, y) => ({ x, y });
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function image(ctx, s, x, y, w, h) {
  ctx.drawImage(s.image, s.x, s.y, s.w, s.h, x, y, w, h);
}
function turnedSprite(ctx, sprite, yaw, sideWidth, x, y, width, height) {
  const near = Math.max(0, Math.min(1, (yaw + 0.2) / 0.4));
  const opacity = ctx.globalAlpha;
  ctx.save();
  ctx.scale(sideWidth + (1 - sideWidth) * Math.abs(yaw), 1);
  if (near > 0) {
    ctx.globalAlpha = opacity * near;
    image(ctx, sprite, x, y, width, height);
  }
  if (near < 1) {
    ctx.scale(-1, 1);
    ctx.globalAlpha = opacity * (1 - near);
    image(ctx, sprite, x, y, width, height);
  }
  ctx.restore();
}
function segment(ctx, s, a, b, width, top, bottom, mirror = false) {
  const length = distance(a, b);
  ctx.save();
  ctx.translate(a.x, a.y);
  ctx.rotate(Math.atan2(b.y - a.y, b.x - a.x) - Math.PI / 2);
  if (mirror) ctx.scale(-1, 1);
  image(ctx, s, -width * 0.5, -top, width, length + top + bottom);
  ctx.restore();
}
function leg(ctx, rig, l, bulk, front) {
  segment(ctx, rig.trousers, l.from, l.knee, (front ? 26 : 24) * bulk, 7, 5, !front);
  ctx.save();
  ctx.translate(l.ankle.x, l.ankle.y);
  ctx.rotate(l.pitch);
  image(ctx, rig.boot, -l.width * 0.3, -l.height * 0.15, l.width, l.height);
  ctx.restore();
  segment(ctx, rig.greave, l.knee, l.ankle, (front ? 17 : 16) * bulk, 4, 3, !front);
}
function arm(ctx, rig, a, bulk, front) {
  segment(ctx, rig.sleeve, a.from, a.elbow, (front ? 26 : 24) * bulk, 7, 5, !front);
  segment(ctx, rig.bracer, a.elbow, a.wrist, (front ? 15 : 14) * bulk, 4, 2.6, !front);
}
function palm(ctx, rig, arm) {
  const sprite = rig.hands[arm.pose];
  const [cuffX, cuffY, gripX, gripY] = HANDS[arm.pose];
  const dx = (gripX - cuffX) * sprite.w,
    dy = (gripY - cuffY) * sprite.h;
  const scale = distance(arm.wrist, arm.grip) / Math.hypot(dx, dy);
  const orientation = Math.atan2(arm.grip.y - arm.wrist.y, arm.grip.x - arm.wrist.x) - Math.atan2(dy, dx);
  ctx.save();
  ctx.translate(arm.wrist.x, arm.wrist.y);
  ctx.rotate(orientation);
  image(
    ctx,
    sprite,
    -cuffX * sprite.w * scale,
    -cuffY * sprite.h * scale,
    sprite.w * scale,
    sprite.h * scale
  );
  ctx.restore();
}
function weapon(ctx, p, c, where, angle, draw) {
  ctx.save();
  ctx.translate(where.x, where.y);
  ctx.rotate(angle);
  drawWeapon(ctx, c, p.rhythm, p.active, draw);
  ctx.restore();
}
export function drawActor(ctx, fighter, frame, table) {
  const c = fighter.character,
    rig = fighterRig(c);
  if (!rig) return false;
  const p = motionAt(fighter, frame, table),
    sk = skeleton(c, p);
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (p.roll) {
    const pivot = sk.hip.y - 21;
    ctx.translate(sk.hip.x, pivot);
    ctx.rotate(p.roll);
    ctx.translate(-sk.hip.x, -pivot);
  }
  leg(ctx, rig, sk.legs[0], sk.bulk, false);
  leg(ctx, rig, sk.legs[1], sk.bulk, true);
  ctx.translate(sk.hip.x, sk.hip.y);
  ctx.rotate(sk.tilt);
  const w = 72 * sk.bulk;
  ctx.save();
  ctx.translate(-sk.swing * 3, 0);
  turnedSprite(ctx, rig.body, sk.yaw, 0.56, -w / 2, -60, w, 80);
  ctx.restore();
  arm(ctx, rig, sk.arms[0], sk.bulk, false);
  ctx.save();
  ctx.translate(-sk.swing * 5, -53);
  ctx.rotate(-sk.tilt * 0.39 + p.rhythm * 0.015);
  const headH = 80 + (c.index % 3) * 2,
    headW = Math.min(99, (headH * rig.head.w) / rig.head.h);
  turnedSprite(
    ctx,
    rig.head,
    sk.yaw,
    0.84,
    -headW * 0.51,
    -headH + (beards.has(c.name) ? 15 : 5),
    headW,
    headH
  );
  ctx.restore();
  arm(ctx, rig, sk.arms[1], sk.bulk, true);
  if (paired(c)) weapon(ctx, p, c, sk.hands[0], -2.36 - sk.angle * 0.62 - sk.swing * 0.6, 0);
  weapon(ctx, p, c, sk.hands[1], sk.angle, sk.bowDraw);
  palm(ctx, rig, sk.arms[0]);
  palm(ctx, rig, sk.arms[1]);
  ctx.restore();
  return true;
}

function bladeTrail(ctx, fighter, frame, table) {
  const { move, character: c } = fighter;
  const beats = move.skill?.steps ?? [{ at: table[move.id].active }];
  if (!beats.some((b) => move.age >= b.at - 2 && move.age <= b.at + 5)) return;
  const reach = ['glaive', 'halberd', 'spear', 'serpent'].includes(c.weapon)
    ? 94
    : ['daggers', 'lute', 'fan'].includes(c.weapon)
      ? 40
      : 62;
  const tip = [];
  for (let lag = 4; lag >= 0; lag--) {
    const p = motionAt(
      { ...fighter, move: { ...move, age: Math.max(0, move.age - lag) } },
      frame - lag,
      table
    );
    const sk = skeleton(c, p),
      a = sk.angle + sk.tilt,
      h = sk.hands[1];
    const x = Math.cos(sk.tilt) * h.x - Math.sin(sk.tilt) * h.y + reach * Math.cos(a);
    const y = Math.sin(sk.tilt) * h.x + Math.cos(sk.tilt) * h.y + reach * Math.sin(a) + 21;
    const cos = Math.cos(p.roll),
      sin = Math.sin(p.roll);
    tip.push(point(sk.hip.x + x * cos - y * sin, sk.hip.y - 21 + x * sin + y * cos));
  }
  ctx.save();
  ctx.globalAlpha = move.skill?.slot === 2 ? 0.62 : 0.42;
  ctx.strokeStyle = c.color;
  ctx.lineCap = 'round';
  for (let j = 1; j < tip.length; j++) {
    ctx.beginPath();
    ctx.moveTo(tip[j - 1].x, tip[j - 1].y);
    ctx.lineTo(tip[j].x, tip[j].y);
    ctx.lineWidth = 1 + j * (move.skill ? 1.65 : 1);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawFighter(ctx, fighter, frame, stage, table) {
  const x = stage.lobby ? (fighter.id ? 945 : 255) : fighter.x;
  const y = stage.ground - fighter.y,
    scale = stage.lobby ? 1.53 : MODEL_SCALE;
  oval(ctx, x, stage.ground + 2, 47 * scale, 7 * scale, '#44302361');
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale * fighter.facing, scale);
  const move = fighter.move;
  if (
    !stage.reduced &&
    move &&
    move.failedAt === undefined &&
    move.age > 4 &&
    (move.skill || ['B', 'C', 'D', 'dash', 'pivot'].includes(move.id))
  ) {
    for (const lag of [6, 3]) {
      ctx.save();
      ctx.globalAlpha = lag === 6 ? 0.085 : 0.16;
      ctx.translate(-lag * 1.4, 0);
      drawActor(ctx, { ...fighter, move: { ...move, age: Math.max(0, move.age - lag) } }, frame - lag, table);
      ctx.restore();
    }
  }
  if (!stage.reduced && move && move.failedAt === undefined) bladeTrail(ctx, fighter, frame, table);
  if (fighter.flash > 5) ctx.filter = 'brightness(1.32)';
  drawActor(ctx, fighter, frame, table);
  if (fighter.pose === 'guard') {
    ctx.strokeStyle = fighter.character.color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.82;
    ctx.beginPath();
    ctx.ellipse(14, -83, 55, 65, 0.1, -1.2, 1.2);
    ctx.stroke();
  }
  ctx.restore();
}
