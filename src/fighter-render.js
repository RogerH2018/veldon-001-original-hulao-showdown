import { armorArt, fighterArt } from './art.js?v=3';
import { motionAt } from './motion.js?v=3';
import { drawWeapon, line, oval, shape, twoHanded } from './weapons.js?v=3';

const ink = '#342730', trim = '#edc580';
const skinTones = ['#f6c599', '#efb892', '#dfa27a', '#f1c29c'];
const skinFor = c => c.name === '关羽' ? '#ce8067' : ['孟获', '祝融'].includes(c.name) ? '#be8462' : skinTones[c.number % 4];

function limbJoint(ax, ay, bx, by, upper, lower, bend) {
  const dx = bx - ax, dy = by - ay, len = Math.max(0.1, Math.hypot(dx, dy));
  const span = Math.min(upper + lower - 0.1, Math.max(Math.abs(upper - lower) + 0.1, len));
  const along = (upper * upper - lower * lower + span * span) / (2 * span);
  const cross = bend * Math.sqrt(Math.max(0, upper * upper - along * along));
  return [ax + (dx * along - dy * cross) / len, ay + (dy * along + dx * cross) / len];
}
function paintLeg(ctx, hipX, hipY, footX, footY, c) {
  const [kx, ky] = limbJoint(hipX, hipY, footX, footY - 5, 24, 23, -1);
  line(ctx, hipX, hipY, kx, ky, ink, 17); line(ctx, hipX, hipY, kx, ky, c.lining, 13);
  line(ctx, kx, ky, footX, footY - 4, ink, 14); line(ctx, kx, ky, footX, footY - 4, '#58434a', 10);
  line(ctx, kx-2, ky+2, kx*.55 + footX*.45-2, ky*.55 + (footY-4)*.45, '#9e7970', 2);
  ctx.save(); ctx.translate(footX, footY);
  shape(ctx, 'M-7 -13 L4 -11 L5 -7 Q10 -6 14 -9 Q20 -5 15 -1 L-6 0 Q-9 -4 -7 -13 Z', '#423744');
  line(ctx, -5, -10, 4, -9, trim, 2); line(ctx, -5, -2, 13, -3, '#bc9270', 1.8); ctx.restore();
}
function arm(ctx, x, y, handX, handY, c, front) {
  const [ex, ey] = limbJoint(x, y, handX, handY, 25, 29, 1);
  line(ctx, x, y, ex, ey, ink, 18); line(ctx, x, y, ex, ey, front ? c.robe : c.lining, 14);
  line(ctx, ex, ey, handX, handY, ink, 13); line(ctx, ex, ey, handX, handY, '#806459', 9);
  line(ctx, ex, ey, ex * .6 + handX * .4, ey * .6 + handY * .4, '#aa8058', 9);
  for (const s of [.24,.5,.73]) {
    const x1=ex*(1-s)+handX*s, y1=ey*(1-s)+handY*s;
    const len=Math.max(1,Math.hypot(handX-ex,handY-ey)), nx=(ey-handY)/len*3.7, ny=(handX-ex)/len*3.7;
    line(ctx, x1-nx,y1-ny,x1+nx,y1+ny,trim,1.3);
  }
  oval(ctx, x, y, 9.6, 7, c.lining, -.28); oval(ctx, x - 1, y - 2, 8, 4, c.robe, -.28);
}
function hand(ctx, x, y, c, angle) {
  oval(ctx, x, y, 7.8, 6.8, ink, angle); oval(ctx, x, y - .5, 6.2, 5.4, skinFor(c), angle);
  oval(ctx, x + 1, y - 3, 3.8, 2, '#f8cca3', angle);
  line(ctx, x+1,y+1,x+4,y+2,'#ba8266',1); line(ctx, x-1,y+3,x+2,y+4,'#ba8266',.8);
}
function heldWeapon(ctx, x, y, angle, c, pose) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
  drawWeapon(ctx, c, pose.rhythm, pose.active, Math.max(0, 35 - pose.x)); ctx.restore();
}
function stamp(ctx, sprite, x, y, w, h) {
  ctx.drawImage(sprite.image, sprite.x, sprite.y, sprite.w, sprite.h, x, y, w, h);
}

export function drawActor(ctx, fighter, frame, table) {
  const c = fighter.character;
  const head = fighterArt(c), armor = armorArt(c);
  if (!head || !armor) return false;
  const p = motionAt(fighter, frame, table);
  const bulk = 1 + (c.weight - 1) * 1.2;
  const hipY = -42 - p.lift;
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const loose = Math.sin(frame * .13 + c.number) * 3 - p.shift;
  ctx.save(); ctx.translate(p.shift - 5, hipY - 35); ctx.rotate(p.lean * .5);
  ctx.beginPath(); ctx.moveTo(-13, -8); ctx.quadraticCurveTo(-30, 2, -29 + loose, 24);
  ctx.quadraticCurveTo(-31 + loose, 35, -48 + loose, 40); ctx.quadraticCurveTo(-24, 43, -15, 35);
  ctx.quadraticCurveTo(-8, 16, 2, 10); ctx.closePath(); ctx.fillStyle = c.lining; ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();
  const inAir = p.airborne || p.lift > 12;
  const backFootY = inAir ? -11 - Math.max(0, p.lift * .65) : Math.min(0, p.step * .23);
  const kickHeight = Math.max(0, p.step - 25) * 2.2;
  const frontFootY = inAir ? -17 - Math.max(0, p.lift * .3) - kickHeight : -Math.max(0, -p.step * .29);
  paintLeg(ctx, p.shift - 10, hipY, -17 - p.step * .62, backFootY, c);
  paintLeg(ctx, p.shift + 8, hipY, 17 + p.step * .80, frontFootY, c);
  ctx.translate(p.shift, hipY); ctx.rotate(p.lean);
  const shoulderY = -37;
  const hx = 9 + p.x, hy = shoulderY + p.y;
  const two = twoHanded(c.weapon);
  const rearX = two ? hx - Math.cos(p.angle) * 26 : -15 - p.x * .25;
  const rearY = two ? hy - Math.sin(p.angle) * 26 : shoulderY + 12 - p.y * .35;
  arm(ctx, -16, shoulderY + 2, rearX, rearY, c, false);
  if (['twins', 'daggers'].includes(c.weapon)) heldWeapon(ctx, rearX, rearY, -2.55 - p.angle * .62, c, p);
  hand(ctx, rearX, rearY, c, p.angle);
  const bodyW = 56 * bulk;
  stamp(ctx, armor, -bodyW / 2, -48, bodyW, 68);
  // The jaw swings on its collar while the feet stay planted through grounded strikes.
  ctx.save(); ctx.translate(0, -40); ctx.rotate(-p.lean * .36 + p.rhythm * .014);
  const headH = 90 + (c.index % 3) * 2;
  const headW = Math.min(108, headH * head.w / head.h);
  const beard = ['关羽', '黄忠', '严颜', '张角', '华佗', '程昱', '左慈'].includes(c.name);
  stamp(ctx, head, -headW * .51, -headH + (beard ? 15 : 3), headW, headH);
  ctx.restore();
  arm(ctx, 12, shoulderY + 5, hx, hy, c, true);
  heldWeapon(ctx, hx, hy, p.angle, c, p);
  hand(ctx, hx, hy, c, p.angle);
  ctx.restore();
  return true;
}

export function drawFighter(ctx, fighter, frame, stage, table) {
  const x = stage.lobby ? fighter.id ? 945 : 255 : fighter.x;
  const y = stage.ground - fighter.y;
  const scale = stage.lobby ? 1.49 : 1.23;
  const c = fighter.character;
  oval(ctx, x, stage.ground + 2, 49 * scale, 8.5 * scale, '#44302361');
  ctx.save(); ctx.translate(x, y); ctx.scale(scale * fighter.facing, scale);
  const action = fighter.move;
  if (!stage.reduced && action && action.age >= 5 && action.failedAt === undefined
    && (action.skill || ['dash', 'pivot', 'C', 'D'].includes(action.id))) {
    for (const lag of [7, 4]) {
      const earlier = { ...fighter, move: { ...action, age: Math.max(0, action.age - lag) } };
      ctx.save(); ctx.globalAlpha = lag === 7 ? .075 : .13; ctx.translate(-lag * 1.6, 0);
      drawActor(ctx, earlier, frame-lag, table); ctx.restore();
    }
  }
  if (fighter.flash > 5) ctx.filter = 'brightness(1.32)';
  drawActor(ctx, fighter, frame, table);
  if (fighter.pose === 'guard') {
    ctx.strokeStyle = c.color; ctx.lineWidth = 2; ctx.globalAlpha = .82;
    ctx.beginPath(); ctx.ellipse(15, -77, 51, 64, .1, -1.2, 1.2); ctx.stroke();
  }
  ctx.restore();
}
