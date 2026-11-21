import { WALK_CYCLE } from './motion.js?v=5';
import { twoHanded } from './weapons.js?v=5';

export const paired = (c) => ['twins', 'daggers'].includes(c.weapon) || ['典韦', '凌统'].includes(c.name);
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const mix = (a, b, t) => a + (b - a) * t;
const point = (x, y) => ({ x, y });
const length = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const direction = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
const angleDelta = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

// Coordinates within each painted hand: the cuff nestles in the bracer and
// the contact sits over a shaft, bowstring or zither string. Length is cuff-to-contact.
export const HANDS = [
  [0.42, 0.94, 0.54, 0.41, 8.4],
  [0.57, 0.94, 0.46, 0.41, 8.4],
  [0.39, 0.94, 0.56, 0.4, 9.3],
  [0.62, 0.94, 0.45, 0.4, 9.3],
  [0.46, 0.94, 0.55, 0.38, 8.6],
  [0.58, 0.94, 0.44, 0.38, 8.6],
  [0.34, 0.94, 0.73, 0.21, 12.0],
  [0.39, 0.94, 0.55, 0.41, 9.0],
  [0.49, 0.94, 0.51, 0.19, 12.0],
  [0.2, 0.94, 0.76, 0.48, 10.2],
];
function joint(from, to, upper, lower, bend) {
  const dx = to.x - from.x,
    dy = to.y - from.y,
    span = Math.max(0.001, Math.hypot(dx, dy));
  const along = clamp((upper * upper - lower * lower + span * span) / (2 * span), -upper, upper);
  const cross = bend * Math.sqrt(Math.max(0, upper * upper - along * along));
  return point(from.x + (along * dx - cross * dy) / span, from.y + (along * dy + cross * dx) / span);
}
function within(p, center, radius) {
  const d = length(p, center);
  if (d <= radius) return p;
  return point(center.x + ((p.x - center.x) * radius) / d, center.y + ((p.y - center.y) * radius) / d);
}

// Keep a rigid weapon grip or pelvis inside both limbs’ reach circles.
function reachablePoint(desired, front, second, radius) {
  const a = within(desired, front, radius),
    b = within(desired, second, radius);
  if (length(a, second) <= radius) return a;
  if (length(b, front) <= radius) return b;
  const dx = second.x - front.x,
    dy = second.y - front.y,
    d = Math.max(0.001, Math.hypot(dx, dy));
  const mid = point((front.x + second.x) / 2, (front.y + second.y) / 2);
  const h = Math.sqrt(Math.max(0, radius * radius - (d * d) / 4));
  const sign = dx * (desired.y - mid.y) - dy * (desired.x - mid.x) >= 0 ? 1 : -1;
  return point(mid.x - (sign * dy * h) / d, mid.y + (sign * dx * h) / d);
}

function handsFor(c, p, shoulders, bulk, swing) {
  const upper = 26 * bulk,
    lower = 24 * bulk;
  const reach = upper + lower + 5;
  const angle = p.angle + swing * 0.3,
    cos = Math.cos(angle),
    sin = Math.sin(angle);
  let main = point(13 + p.x * 0.77 * p.extension + swing * 5, -45 + p.y * 0.82);
  let rear, offset;
  let poses = [
    p.gesture === 'palm' ? 2 : p.gesture === 'elbow' ? 5 : ['fan', 'scroll'].includes(c.weapon) ? 8 : 3,
    0,
  ];
  const bowDraw = clamp(23 - (p.x - 25) * 0.54, 0, 23);
  if (c.weapon === 'bow') {
    const release = Math.max(0, 18 - bowDraw);
    offset = point(
      -(6 + bowDraw + release) * cos + release * 0.2 * sin,
      -(6 + bowDraw + release) * sin - release * 0.2 * cos
    );
    poses = [6, 0];
  } else if (c.weapon === 'lute') {
    main = point(main.x - 6, main.y + 6);
    const pluck = Math.sin(p.phase * 2 * Math.PI) * p.amount * 5;
    offset = point((25 + pluck) * cos - 3 * sin, (25 + pluck) * sin + 3 * cos);
    poses = [9, 1];
  } else if (twoHanded(c.weapon) && !paired(c)) {
    const gap = ['mace', 'axe', 'hammer', 'staff'].includes(c.weapon) ? 24 : 34 + p.spread;
    offset = point(-gap * cos, -gap * sin);
    poses = [1, 0];
  } else if (paired(c)) poses = [1, 0];

  if (offset) {
    main = reachablePoint(
      main,
      shoulders[1],
      point(shoulders[0].x - offset.x, shoulders[0].y - offset.y),
      reach
    );
    rear = point(main.x + offset.x, main.y + offset.y);
  } else {
    main = within(main, shoulders[1], reach);
    const guard = p.gesture === 'palm' || p.gesture === 'elbow' ? p.amount : 0;
    rear = within(
      point(-28 - p.x * 0.16 + p.offX + swing * 6 + 22 * guard, -34 - p.y * 0.25 + p.offY - 8 * guard),
      shoulders[0],
      reach
    );
    const dy = rear.y - main.y,
      clearance = 21;
    if (Math.abs(dy) < clearance && Math.abs(rear.x - main.x) < clearance) {
      rear = point(main.x - Math.sqrt(clearance * clearance - dy * dy), rear.y);
    }
  }
  const hands = [rear, main];
  const arms = hands.map((grip, i) => {
    const from = shoulders[i],
      pose = poses[i],
      palmLength = HANDS[pose][4];
    const bend = 1;
    const estimatedElbow = joint(from, grip, upper, lower + palmLength, bend);
    const forearm = direction(estimatedElbow, grip);
    const twist = offset || i || paired(c) ? 0.34 * Math.sin(2 * (angle + Math.PI / 2 - forearm)) : 0;
    let handAngle = forearm + twist;
    const reachToGrip = length(from, grip),
      straight = direction(from, grip);
    const minimumFold = Math.min(10, reachToGrip + palmLength - 0.01);
    if (reachToGrip > 0.01) {
      const minimumAngle = Math.acos(
        clamp((reachToGrip ** 2 + palmLength ** 2 - minimumFold ** 2) / (2 * reachToGrip * palmLength), -1, 1)
      );
      const bendAngle = angleDelta(handAngle, straight);
      if (Math.abs(bendAngle) < minimumAngle) handAngle = straight + (bendAngle < 0 ? -1 : 1) * minimumAngle;
    }
    let wrist = point(grip.x - Math.cos(handAngle) * palmLength, grip.y - Math.sin(handAngle) * palmLength);
    // At full extension the wrist straightens before the elbow can hyperextend.
    if (length(wrist, from) > upper + lower - 0.15) {
      wrist = point(grip.x - Math.cos(straight) * palmLength, grip.y - Math.sin(straight) * palmLength);
    }
    return { from, elbow: joint(from, wrist, upper, lower, bend), wrist, grip, pose };
  });
  return { hands, arms, angle, bowDraw };
}

// During stance the foot travels backwards by exactly the body's advance.
// The cubic swing brings the foot ahead and meets the ground at zero world speed.
function walkingFoot(travel, index) {
  const u = (((travel / WALK_CYCLE + (index ? 0.28 : 0.78)) % 1) + 1) % 1;
  const stance = 0.56,
    swing = clamp((u - stance) / (1 - stance), 0, 1);
  const transfer = swing * swing * (3 - 2 * swing);
  const x = WALK_CYCLE * (stance / 2 - u + transfer);
  const lift = 12 * Math.sin(Math.PI * swing) ** 2;
  const pitch =
    u < stance ? mix(-0.15, 0.22, u / stance) : mix(0.22, -0.15, transfer) - 0.12 * Math.sin(Math.PI * swing);
  return { x, lift, pitch };
}

function footTarget(p, i, bulk) {
  const side = i ? 1 : -1,
    home = side * (20 + p.spread * 0.55);
  const knee = i ? p.frontKnee : p.backKnee,
    partner = i ? p.backKnee : p.frontKnee;
  const jumping = ['翻', '跃', '飘', '旋'].includes(p.cue);
  const airborne = jumping ? Math.max(0, p.lift + p.elevation - 9) * 0.77 : 0;
  const tuck = p.jumpTuck * (i ? 22 : 13);
  const lift = airborne + tuck + (jumping ? knee : Math.max(0, knee - partner));
  const drive = clamp(p.advance, -17, 23);
  const attackStep = p.active ? p.step : 0;
  const stanceX =
    home +
    side * attackStep * (i ? 0.54 : 0.34) +
    p.travel * 0.3 +
    knee * (i ? 0.28 : -0.14) -
    drive * (i ? 0.25 : 0.7);
  const gait = walkingFoot(p.gaitDistance, i);
  const x = mix(stanceX, home + gait.x, p.gaitBlend),
    y = -mix(lift, gait.lift, p.gaitBlend);
  const pitch = mix(
    clamp((i ? -0.06 : 0.18) * p.amount - knee * 0.006 - p.jumpTuck * 0.22, -0.52, 0.29),
    gait.pitch,
    p.gaitBlend
  );
  const width = (i ? 27 : 25.8) * bulk,
    height = width * 0.71;
  // A raised heel pivots on the ball; a landing foot pivots on its heel.
  const pivot = width * (pitch > 0 ? 0.59 : -0.2),
    soleToAnkle = -height * 0.8;
  const cos = Math.cos(pitch),
    sin = Math.sin(pitch);
  const ankle = point(x + pivot - pivot * cos - soleToAnkle * sin, y - pivot * sin + soleToAnkle * cos);
  return { foot: point(x, y), ankle, pitch, width, height };
}

export function skeleton(c, p) {
  const yaw = Math.cos(p.turn),
    swing = Math.sin(p.turn),
    bulk = 1 + (c.weight - 1) * 0.97;
  const legs = [footTarget(p, 0, bulk), footTarget(p, 1, bulk)];
  const upper = 31 * bulk,
    lower = 26 * bulk,
    reach = upper + lower - 0.25;
  const hipOffsets = [-10 * yaw, 10 * yaw];
  const centers = legs.map((l, i) => point(l.ankle.x - hipOffsets[i], l.ankle.y - 2));
  const support = legs[0].foot.y >= legs[1].foot.y ? 0 : 1;
  const free = 1 - support;
  const limited = within(centers[free], centers[support], reach * 1.58);
  const foot = legs[free];
  limited.y = Math.min(limited.y, centers[free].y - foot.foot.y);
  foot.ankle.x += limited.x - centers[free].x;
  foot.foot.x += limited.x - centers[free].x;
  foot.ankle.y += limited.y - centers[free].y;
  foot.foot.y += limited.y - centers[free].y;
  centers[free] = limited;
  const desired = point((p.shift + p.travel) * 0.8, Math.min(-37, -65 - p.lift - p.elevation));
  const hip = reachablePoint(desired, centers[0], centers[1], reach);
  legs.forEach((l, i) => {
    l.from = point(hip.x + hipOffsets[i], hip.y + 2);
    const span = length(l.from, l.ankle),
      minSpan = 15 * bulk;
    if (span < minSpan && i === free) {
      const a = direction(l.from, l.ankle);
      const dy = Math.min((minSpan - span) * Math.sin(a), -l.foot.y);
      const vertical = l.ankle.y + dy - l.from.y;
      const across = Math.sqrt(Math.max(0, minSpan * minSpan - vertical * vertical));
      const dx = l.from.x + (Math.cos(a) >= 0 ? across : -across) - l.ankle.x;
      l.ankle.x += dx;
      l.foot.x += dx;
      l.ankle.y += dy;
      l.foot.y += dy;
    }
    l.knee = joint(l.from, l.ankle, upper, lower, -1);
  });
  const shoulders = [point(-17 * yaw - 4, -40), point(16 * yaw + 4, -43)];
  return {
    hip,
    tilt: p.lean + p.bodyTilt * 0.52,
    yaw,
    swing,
    bulk,
    legs,
    ...handsFor(c, p, shoulders, bulk, swing),
  };
}
