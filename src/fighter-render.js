import { fighterRig } from './art.js?v=4';
import { motionAt } from './motion.js?v=4';
import { drawWeapon, oval, twoHanded } from './weapons.js?v=4';

const beards = new Set(['关羽', '黄忠', '严颜', '张角', '华佗', '程昱', '左慈']);
const paired = (c) => ['twins', 'daggers'].includes(c.weapon) || ['典韦', '凌统'].includes(c.name);
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const point = (x, y) => ({ x, y });
const distance = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);

function joint(a, b, upper, lower, side) {
  const dx = b.x - a.x,
    dy = b.y - a.y,
    len = Math.max(0.01, Math.hypot(dx, dy));
  const span = clamp(len, Math.abs(upper - lower) + 0.1, upper + lower - 0.1);
  const along = (upper * upper - lower * lower + span * span) / (2 * span);
  const perp = side * Math.sqrt(Math.max(0, upper * upper - along * along));
  return point(a.x + (dx * along - dy * perp) / len, a.y + (dy * along + dx * perp) / len);
}

// Feet are in ground coordinates. Both wrists and their weapons share the chest space.
export function skeleton(c, p) {
  const yaw = Math.cos(p.turn),
    swing = Math.sin(p.turn),
    bulk = 1 + (c.weight - 1) * 1.05;
  const hip = point(p.shift + p.travel, Math.min(-36, -55 - p.lift - p.elevation));
  const tilt = p.lean + p.bodyTilt * 0.55,
    s = -45;
  const shoulders = [point(-19 * yaw - 4, s + 5), point(18 * yaw + 3, s + 3)];
  const main = point(10 + p.x * 0.82 * p.extension + swing * 5, s + p.y * 0.84);
  const angle = p.angle + swing * 0.35;
  const cos = Math.cos(angle),
    sin = Math.sin(angle);
  const bowDraw = clamp(22 - (p.x - 25) * 0.55, 0, 22);
  let rear;
  if (c.weapon === 'bow') {
    rear = point(main.x - (6 + bowDraw) * cos, main.y - (6 + bowDraw) * sin);
    // At release the string snaps forward while the drawing hand flies past the cheek.
    if (bowDraw < 18) {
      rear.x -= (18 - bowDraw) * cos - 5 * p.amount * sin;
      rear.y -= (18 - bowDraw) * sin + 5 * p.amount * cos;
    }
  } else if (c.weapon === 'lute') {
    main.x -= 6;
    main.y += 7;
    rear = point(main.x + 28 * cos - 5 * sin, main.y + 28 * sin + 5 * cos);
  } else if (twoHanded(c.weapon) && !paired(c)) {
    const grip = ['mace', 'axe', 'hammer', 'staff'].includes(c.weapon) ? 25 : 38 + p.spread;
    rear = point(main.x - grip * cos, main.y - grip * sin);
  } else {
    rear = point(-31 - p.x * 0.19 + p.offX + swing * 7, s + 11 - p.y * 0.28 + p.offY);
    if (p.gesture === 'palm' || p.gesture === 'elbow') {
      rear.x += 26 * p.amount;
      rear.y -= 10 * p.amount;
    }
    // Fold the elbow outward when a crossing guard brings the two wrists onto the same sightline.
    const dy = rear.y - main.y,
      clearance = 21;
    if (Math.abs(dy) < clearance && Math.abs(rear.x - main.x) < clearance) {
      const separation = Math.sqrt(clearance * clearance - dy * dy);
      rear.x = Math.min(rear.x, main.x - separation);
    }
  }
  // The legs exchange weight. The rear foot remains planted through a grounded front knee strike.
  const air = p.airborne ? 14 : Math.max(0, (p.lift + p.elevation - 10) * 0.72);
  const legs = [-1, 1].map((side, i) => {
    const from = point(hip.x + side * 11 * yaw, hip.y + 2);
    const kneeUp = i ? p.frontKnee : p.backKnee;
    const foot = point(
      side * (22 + p.spread + p.step * (i ? 0.71 : 0.53)) + p.travel * 0.45 + (i ? 1 : -1) * kneeUp * 0.27,
      -air - kneeUp - (p.airborne ? (i ? 9 : 2) : Math.max(0, side * -p.step * 0.17))
    );
    const ankle = point(foot.x - 3, foot.y - 13);
    return { from, knee: joint(from, ankle, 29 * bulk, 24, i ? -1 : -0.82), ankle, foot };
  });
  const hands = [rear, main];
  const arms = hands.map((wrist, i) => ({
    from: shoulders[i],
    elbow: joint(shoulders[i], wrist, 27 * bulk, 26, !i && p.gesture === 'elbow' ? -1 : 1),
    wrist,
  }));
  return { hip, tilt, yaw, swing, bulk, angle, arms, legs, hands, bowDraw };
}

function image(ctx, s, x, y, w, h) {
  ctx.drawImage(s.image, s.x, s.y, s.w, s.h, x, y, w, h);
}
function turnedSprite(ctx, sprite, yaw, sideWidth, x, y, width, height) {
  const near = clamp((yaw + 0.2) / 0.4, 0, 1);
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
  segment(ctx, rig.trousers, l.from, l.knee, (front ? 27 : 25) * bulk, 9, 8, !front);
  segment(ctx, rig.greave, l.knee, l.ankle, (front ? 20 : 19) * bulk, 5, 6, !front);
  const w = (front ? 32 : 30) * bulk;
  ctx.save();
  ctx.translate(l.foot.x, l.foot.y);
  ctx.rotate(clamp((l.ankle.x - l.knee.x) * 0.005, -0.19, 0.17));
  image(ctx, rig.boot, -w * 0.38, -22, w, 23);
  ctx.restore();
}
function arm(ctx, rig, a, bulk, front) {
  segment(ctx, rig.sleeve, a.from, a.elbow, (front ? 28 : 26) * bulk, 9, 7, !front);
  segment(ctx, rig.bracer, a.elbow, a.wrist, (front ? 18 : 17) * bulk, 5, 2, !front);
}
function palm(ctx, rig, a, index, front) {
  const sprite = rig.hands[index];
  const turn = Math.atan2(a.wrist.y - a.elbow.y, a.wrist.x - a.elbow.x);
  const open = [2, 3, 6, 7, 8, 9].includes(index);
  const w = open ? 22 : 17.5,
    h = clamp((w * sprite.h) / sprite.w, 13, 22);
  ctx.save();
  ctx.translate(a.wrist.x, a.wrist.y);
  // The wrist is on the left for the right-reaching poses and on the right for their opposites.
  const leftWrist = [0, 2, 4, 6, 7, 8].includes(index);
  ctx.rotate(turn + (leftWrist ? 0 : Math.PI));
  image(ctx, sprite, -w * (leftWrist ? 0.37 : 0.63), -h * (front ? 0.52 : 0.5), w, h);
  ctx.restore();
}
function weapon(ctx, p, c, where, angle, draw) {
  ctx.save();
  ctx.translate(where.x, where.y);
  ctx.rotate(angle);
  drawWeapon(ctx, c, p.rhythm, p.active, draw);
  ctx.restore();
}
function grips(c, p) {
  if (c.weapon === 'bow') return [6, 0];
  if (c.weapon === 'lute') return [9, 1];
  if (twoHanded(c.weapon) || paired(c)) return [1, 0];
  return [
    p.gesture === 'palm' ? 2 : p.gesture === 'elbow' ? 5 : ['fan', 'scroll'].includes(c.weapon) ? 8 : 3,
    0,
  ];
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
  const poses = grips(c, p);
  palm(ctx, rig, sk.arms[0], poses[0], false);
  palm(ctx, rig, sk.arms[1], poses[1], true);
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
    scale = stage.lobby ? 1.53 : 1.23;
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
