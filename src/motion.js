export const MODEL_SCALE = 1.23;
export const WALK_CYCLE = 72;
// Wrist x/y relative to the shoulder, weapon angle, torso lean, leading step, body lift, weight shift.
// Each stroke has anticipation, contact and follow-through poses, anchored to the simulation hit tick.
const strokes = {
  thrust: [
    [-12, 7, -18, -12, -4, -4, -8],
    [65, -4, -3, 14, 17, -3, 13],
    [52, 3, 12, 9, 14, -2, 9],
  ],
  cut: [
    [-12, -27, -135, -13, -7, 3, -5],
    [52, 0, -9, 16, 14, 2, 9],
    [35, 18, 43, 12, 15, -4, 6],
  ],
  rise: [
    [4, 29, 49, 11, 6, -12, -5],
    [40, -30, -70, -11, 11, 17, 10],
    [19, -43, -117, -14, 6, 22, 5],
  ],
  crush: [
    [-5, -46, -148, -17, -8, 12, -8],
    [52, 12, 29, 22, 19, -12, 12],
    [40, 27, 63, 20, 18, -14, 9],
  ],
  cast: [
    [0, 6, -98, -12, -6, -4, -6],
    [48, -15, -20, 5, 13, 6, 4],
    [40, -22, -49, -2, 8, 8, 2],
  ],
  rush: [
    [-8, 16, -24, -3, -12, -10, -10],
    [58, 4, -6, 25, 23, 4, 18],
    [48, 3, 10, 19, 23, 1, 12],
  ],
  sweep: [
    [-7, -5, -161, -14, -10, -5, -7],
    [61, 16, 8, 22, 24, -14, 12],
    [30, 26, 68, 17, 18, -12, 10],
  ],
  spin: [
    [-19, -3, -204, -18, -12, -3, -9],
    [57, -12, -17, 14, 21, 15, 9],
    [24, 9, 98, 18, 16, 9, 6],
  ],
  dive: [
    [3, -36, -115, -13, -7, 35, -8],
    [50, 28, 47, 24, 23, -11, 14],
    [35, 30, 71, 18, 16, -13, 7],
  ],
  kick: [
    [-9, 6, -110, -9, -7, -8, -4],
    [22, -20, -84, -22, 53, 17, 8],
    [22, 1, -52, -13, 35, 8, 6],
  ],
  volley: [
    [12, -10, -88, -13, -8, 0, -7],
    [55, -14, -2, -6, 14, 10, 4],
    [44, -6, -17, -14, 8, 8, 0],
  ],
  burst: [
    [-3, -27, -126, -19, -12, 13, -12],
    [58, -4, -4, 21, 24, 6, 16],
    [50, 8, 24, 15, 18, -5, 10],
  ],
  palm: [
    [-15, 14, -97, -14, -4, -7, -5],
    [53, -19, -23, 14, 17, 8, 11],
    [46, -1, 14, 9, 15, 3, 8],
  ],
  elbow: [
    [-16, -6, -140, -18, -9, -2, -10],
    [22, -22, -76, 19, 18, 7, 15],
    [31, -9, -46, 13, 14, 3, 8],
  ],
  draw: [
    [-22, 20, 156, -16, -8, -8, -11],
    [48, -26, -41, 13, 22, 6, 12],
    [24, -40, -96, 8, 17, 9, 8],
  ],
  deflect: [
    [-6, 22, 67, 14, -6, -9, -6],
    [39, -28, -86, -12, 16, 11, 5],
    [18, -33, -118, -16, 12, 6, 2],
  ],
};

export const basicStroke = (character, id) => character.techniques[id].kind;
const rad = Math.PI / 180;
const pole = new Set(['glaive', 'spear', 'serpent', 'halberd', 'staff']);
const unit = (n) => Math.max(0, Math.min(1, n));
const ease = (t) => t * t * (3 - 2 * t);
const blend = (a, b, t) => a.map((v, i) => v + (b[i] - v) * ease(unit(t)));

// Pelvis travel, chest turn, torso tilt, lift at the waist, independent knee lifts,
// and the counter-hand's reach and height at the apex of each kind of footwork.
const footwork = {
  拧: [3, -1.1, -10, 1, 3, 8, 16, -14],
  滑: [18, 0.3, 13, -16, 1, 3, -14, 8],
  踏: [8, 0.35, 12, -7, 26, 0, -10, 3],
  回: [-9, 2.45, -9, 6, 5, 16, 16, -14],
  伏: [1, -0.35, 17, -25, 0, 4, -12, 21],
  旋: [6, 6.28, 5, 17, 22, 10, 13, -16],
  跃: [12, 0.85, -14, 39, 23, 17, -11, -21],
  跨: [14, 0.42, 12, 6, 22, 0, -19, 8],
  撤: [-24, -0.9, -16, 4, 3, 15, 15, -8],
  飘: [-6, -0.62, -12, 28, 12, 18, -22, -15],
  挑: [3, 0.55, -16, 18, 25, 6, 6, -25],
  换: [-4, 1.68, -4, 3, 14, 18, 17, -17],
  翻: [9, 0.83, 3, 32, 18, 28, 14, -16],
  坠: [8, 0.52, 23, 16, 20, 7, -18, -5],
  弓: [13, -0.35, 12, -10, 3, 0, -28, -7],
  架: [-6, -0.75, -8, -4, 3, 0, 25, -23],
  引: [-15, -1.12, -14, 1, 10, 5, -22, -18],
  交: [-2, 1.18, -5, 5, 8, 13, 32, -14],
  错: [8, -1.46, 9, -3, 8, 14, -20, 12],
  合: [2, 0.77, -5, -8, 5, 5, 28, 1],
};
function stance(c) {
  return [
    26 + (c.number % 7),
    10 - (c.number % 5),
    (pole.has(c.weapon) ? -46 : c.weapon === 'bow' ? -3 : -34) - (c.number % 12),
    (c.number % 5) - 2,
    2 + (c.number % 6),
    0,
    0,
  ];
}

function attackPose(age, steps, end, rest) {
  let previous = rest,
    previousTime = 0;
  function between(time, target) {
    if (age <= time) return blend(previous, target, (age - previousTime) / Math.max(1, time - previousTime));
    previous = target;
    previousTime = time;
  }
  for (const [i, beat] of steps.entries()) {
    const [wind, contact, follow] = strokes[beat.kind];
    const prep = beat.at - (i ? 3 : Math.min(5, Math.ceil(beat.at / 2)));
    const pose = between(prep, wind) ?? between(beat.at, contact) ?? between(beat.at + 2, follow);
    if (pose) return pose;
  }
  return between(end, rest) ?? rest;
}

export function motionAt(fighter, frame, table) {
  const { character: c, move, pose } = fighter;
  const rest = stance(c);
  const gaitDistance = (fighter.walkDistance ?? 0) / MODEL_SCALE;
  const rhythm = Math.sin(frame * (0.072 + c.index * 0.002) + c.number);
  let values = rest.slice(),
    beat,
    phase = 0,
    amount = 0;
  if (move) {
    const normal = c.techniques[move.id];
    const steps = move.skill?.steps ?? [{ at: table[move.id].active, ...normal }];
    const used = move.failedAt === undefined ? steps : steps.filter((b) => b.at <= move.failedAt);
    const end = move.failedAt === undefined ? (move.skill?.end ?? table[move.id].end) : move.failedAt + 12;
    values = attackPose(move.age, used, end, rest);
    const i = used.findIndex((b, i) => move.age < (used[i + 1] ? b.at + 3 : end + 1));
    if (i >= 0) {
      beat = used[i];
      const start = i ? used[i - 1].at + 3 : 0;
      const finish = used[i + 1] ? beat.at + 3 : end;
      phase =
        move.age <= beat.at
          ? 0.62 * unit((move.age - start) / Math.max(1, beat.at - start))
          : 0.62 + 0.38 * unit((move.age - beat.at) / Math.max(1, finish - beat.at));
      amount = Math.sin(Math.PI * phase) * (move.skill ? 1.08 + move.skill.slot * 0.12 : 0.88);
    }
  } else if (pose === 'guard') values = [23, -14, -71, -9, 12, -17, -5];
  else if (pose === 'hurt') values = [-9, -10, -114, -18, -6, -6, -11];
  else if (pose === 'win') values = [19, -34, -68 + rhythm * 17, -7, 8, 6 + rhythm * 2, 0];
  else if (pose === 'jump') values = [35, -17, -23, 8, 18, 13, 0];
  else if (pose === 'walk') {
    const stride = Math.sin(2*Math.PI*gaitDistance/WALK_CYCLE);
    values = [
      rest[0] + stride * 7,
      6 + stride * 4,
      rest[2] + stride * 13,
      4,
      20 * stride,
      Math.abs(stride) * 5,
      2,
    ];
  } else {
    values[1] += rhythm * 2;
    values[2] += rhythm * 2.4;
    values[5] += rhythm * 1.7;
  }

  const [x, y, angle, lean, step, lift, shift] = values;
  const cue = beat?.footwork,
    f = footwork[cue] ?? [0, 0, 0, 0, 0, 0, 0, 0];
  const style = 0.86 + ((c.number * 43) % 101) / 265;
  const a = amount * style;
  const turn = cue === '旋' ? Math.PI * 2 * ease(phase) : f[1] * a;
  const roll = cue === '翻' ? -Math.PI * 2 * ease(phase) : 0;
  const dip = cue === '坠' ? Math.cos(phase * Math.PI) * a * 24 : 0;
  const plant = cue === '踏' || cue === '坠';
  const leadLift = plant ? (phase < 0.62 ? Math.sin((Math.PI * phase) / 0.62) * style : 0) : a;
  const kick = beat?.kind === 'kick' ? 45 * a : 0;
  const bend = ((c.number % 7) - 3) * 0.8;
  const flourish = 1 + (move?.skill?.slot ?? 0) * 0.055;
  return {
    x: x * flourish,
    y: y + bend,
    angle: (angle + bend) * rad,
    lean: lean * rad,
    step,
    lift:lift-Math.sin((fighter.landingFrames ?? 0)*Math.PI/8)*6,
    shift,
    gaitDistance,
    gaitBlend: !move && !fighter.y && ['idle','guard','walk'].includes(pose) ? fighter.walkBlend ?? 0 : 0,
    jumpTuck:unit((fighter.y ?? 0)/42),
    advance:move?.startX === undefined ? 0 : ((fighter.x-move.startX)*fighter.facing)/MODEL_SCALE,
    cue,
    bodyTilt: f[2] * rad * a,
    travel: f[0] * a,
    elevation: f[3] * a + dip,
    turn,
    roll,
    frontKnee: f[4] * leadLift + kick,
    backKnee: f[5] * (plant ? leadLift : a),
    offX: f[6] * a,
    offY: f[7] * a,
    spread: ((c.number % 9) - 4) * 0.7,
    extension: 0.9 + style * 0.1,
    gesture: beat?.kind,
    amount,
    phase,
    rhythm,
    active: !!move,
    airborne: fighter.y > 1 || pose === 'jump',
  };
}
