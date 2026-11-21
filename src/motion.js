// Wrist x/y relative to the shoulder, weapon angle, torso lean, leading step, body lift, weight shift.
// Each stroke has anticipation, contact and follow-through poses, anchored to the simulation hit tick.
const strokes = {
  thrust: [[-12, 7, -18, -12, -4, -4, -8], [65, -4, -3, 14, 17, -3, 13], [52, 3, 12, 9, 14, -2, 9]],
  cut: [[-12, -27, -135, -13, -7, 3, -5], [52, 0, -9, 16, 14, 2, 9], [35, 18, 43, 12, 15, -4, 6]],
  rise: [[4, 29, 49, 11, 6, -12, -5], [40, -30, -70, -11, 11, 17, 10], [19, -43, -117, -14, 6, 22, 5]],
  crush: [[-5, -46, -148, -17, -8, 12, -8], [52, 12, 29, 22, 19, -12, 12], [40, 27, 63, 20, 18, -14, 9]],
  cast: [[0, 6, -98, -12, -6, -4, -6], [48, -15, -20, 5, 13, 6, 4], [40, -22, -49, -2, 8, 8, 2]],
  rush: [[-8, 16, -24, -3, -12, -10, -10], [58, 4, -6, 25, 23, 4, 18], [48, 3, 10, 19, 23, 1, 12]],
  sweep: [[-7, -5, -161, -14, -10, -5, -7], [61, 16, 8, 22, 24, -14, 12], [30, 26, 68, 17, 18, -12, 10]],
  spin: [[-19, -3, -204, -18, -12, -3, -9], [57, -12, -17, 14, 21, 15, 9], [24, 9, 98, 18, 16, 9, 6]],
  dive: [[3, -36, -115, -13, -7, 35, -8], [50, 28, 47, 24, 23, -11, 14], [35, 30, 71, 18, 16, -13, 7]],
  kick: [[4, -7, -90, -9, -7, -8, -4], [14, -16, -95, -22, 53, 17, 8], [22, 1, -52, -13, 35, 8, 6]],
  volley: [[12, -10, -88, -13, -8, 0, -7], [55, -14, -2, -6, 14, 10, 4], [44, -6, -17, -14, 8, 8, 0]],
  burst: [[-3, -27, -126, -19, -12, 13, -12], [58, -4, -4, 21, 24, 6, 16], [50, 8, 24, 15, 18, -5, 10]],
};
const isPole = new Set(['glaive', 'spear', 'serpent', 'halberd', 'staff']);
const ranged = new Set(['scroll', 'fan', 'lute']);
export function basicStroke(weapon, move) {
  if (move === 'A') return ranged.has(weapon) ? 'cast' : weapon === 'bow' ? 'volley' : 'thrust';
  if (move === 'B') return 'rush';
  if (move === 'C') return ['hammer', 'axe', 'mace', 'shield', 'glaive', 'halberd'].includes(weapon) ? 'crush' : 'sweep';
  if (move === 'D') return 'rise';
  if (move === 'dash') return 'thrust';
  if (move === 'pivot') return 'spin';
  return 'burst';
}
const ease = value => value * value * (3 - 2 * value);
const blend = (a, b, t) => a.map((value, i) => value + (b[i] - value) * ease(t));

function stance(character) {
  const { number, weapon } = character;
  return [24 + number % 7, 9 - number % 5, (isPole.has(weapon) ? -53 : weapon === 'bow' ? 0 : -39) - number % 12,
    number % 5 - 2, 2 + number % 6, 0, 0];
}

function attackPose(character, move, table, rest) {
  const age = move.age;
  const steps = move.skill?.steps ?? [{ at: table[move.id].active, kind: basicStroke(character.weapon, move.id) }];
  const usable = move.failedAt === undefined ? steps : steps.slice(0, 1);
  const end = move.failedAt === undefined ? move.skill?.end ?? table[move.id].end : move.failedAt + 12;
  let previous = rest, previousTime = 0;
  function between(time, target) {
    if (age <= time) return blend(previous, target, Math.max(0, Math.min(1, (age - previousTime) / Math.max(1, time - previousTime))));
    previous = target;
    previousTime = time;
  }
  for (let i = 0; i < usable.length; i++) {
    const beat = usable[i];
    const [wind, contact, follow] = strokes[beat.kind];
    const prepAt = i === 0 ? Math.max(1, beat.at - Math.min(5, Math.ceil(beat.at / 2))) : beat.at - 3;
    const pose = between(prepAt, wind) ?? between(beat.at, contact) ?? between(beat.at + 2, follow);
    if (pose) return pose;
  }
  return between(end, rest) ?? rest;
}

export function motionAt(fighter, frame, table) {
  const { character, move, pose } = fighter;
  const rest = stance(character);
  const rhythm = Math.sin(frame * (0.072 + character.index * 0.002) + character.number);
  let values = rest.slice();
  if (move) values = attackPose(character, move, table, rest);
  else if (pose === 'guard') values = [21, -18, -78, -10, 12, -15, -4];
  else if (pose === 'hurt') values = [-11, -10, -119, -20, -5, -6, -10];
  else if (pose === 'win') values = [18, -38, -70 + rhythm * 13, -7, 8, 6 + rhythm * 2, 0];
  else if (pose === 'jump') values = [38, -20, -28, 8, 18, 13, 0];
  else if (pose === 'walk') {
    const stride = Math.sin(frame * 0.34);
    values = [rest[0] + stride * 8, 6 + stride * 5, rest[2] + stride * 14, 4, 19 * stride, Math.abs(stride) * 6, 2];
  } else { values[1] += rhythm * 2.5; values[2] += rhythm * 2.4; values[5] += rhythm * 2; }
  const [x, y, angle, lean, step, lift, shift] = values;
  const flourish = move?.skill ? 1 + move.skill.slot * 0.055 : 1;
  const grip = (character.number % 7 - 3) * 0.8;
  return { x: x * flourish, y: y + grip, angle: (angle + grip) * Math.PI / 180, lean: lean * Math.PI / 180,
    step, lift, shift, rhythm, active: !!move, airborne: fighter.y > 1 || pose === 'jump' };
}
