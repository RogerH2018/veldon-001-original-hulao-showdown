import { fighterArt } from './art.js';

const PI = Math.PI;
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

function oval(ctx, x, y, w, h, color) {
  ctx.beginPath();
  ctx.ellipse(x, y, w, h, 0, 0, PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

export function drawFighter(ctx, fighter, frame, stage, moveTable) {
  const { ground, lobby } = stage;
  const { character, facing, move } = fighter;
  const x = lobby ? fighter.id ? 932 : 268 : fighter.x;
  const y = ground - fighter.y;
  const tint = character.color;
  const sprite = fighterArt(character);
  oval(ctx, x, ground + 4, 55, 12, '#041119bc');
  oval(ctx, x, ground + 5, 42, 6, tint + '38');
  if (!sprite) return;

  const signature = move?.skill;
  const beat = signature?.steps[Math.min(move.next, signature.steps.length - 1)];
  const stepDistance = beat ? Math.abs(move.age - beat.at) : 0;
  const pulse = beat ? clamp(1 - stepDistance / 10, 0, 1) : move ? Math.sin(PI * clamp(move.age / moveTable[move.id].end, 0, 1)) : 0;
  const walk = fighter.pose === 'walk';
  const guard = fighter.pose === 'guard';
  const hit = fighter.pose === 'hurt';
  const win = fighter.pose === 'win';
  const airborne = fighter.y > 1;
  const form = beat?.kind ?? move?.id;
  const rising = form === 'lift' || form === 'cross';
  const heavy = form === 'drop' || form === 'cleave' || form === 'burst';
  const height = (lobby ? 295 : 226) + (character.weight - 1) * 68;
  const width = sprite.w / sprite.h * height;
  const breath = Math.sin(frame * 0.09 + fighter.id * 2) * 0.01;
  const stride = walk ? Math.sin(frame * 0.41) : 0;
  const lean = hit ? -0.21 : move ? (rising ? -0.15 : heavy ? 0.23 : 0.16) * pulse : walk ? 0.06 : guard ? -0.04 : 0;
  const torso = hit ? -13 : (lobby ? 0 : pulse * (rising ? 9 : signature?.slot === 1 ? 19 : 13));
  const bob = (walk ? Math.abs(stride) * 7 : 0) + (rising ? 20 * pulse : 0);
  const pivot = sprite.h * 0.57;
  const bodyTop = -height * (1 + breath);

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facing, guard ? 0.84 : 1);
  if (signature && pulse > 0.33) {
    for (let lag = 2; lag >= 1; lag--) {
      ctx.save();
      ctx.globalAlpha = pulse * (lag === 2 ? 0.11 : 0.21);
      ctx.filter = 'brightness(1.55)';
      ctx.drawImage(sprite.image, sprite.x, sprite.y, sprite.w, sprite.h, -width / 2 - lag * 27, -height - bob, width, height);
      ctx.restore();
    }
  }
  if (fighter.flash > 4) {
    ctx.filter = 'brightness(1.6) saturate(0.5)';
  } else if (signature?.slot === 2 && pulse > 0.5) {
    ctx.shadowColor = tint;
    ctx.shadowBlur = 15 * pulse;
  }

  if (lobby || airborne || hit || win) {
    ctx.translate(torso, -bob);
    ctx.rotate(lean + (win ? Math.sin(frame * 0.18) * 0.035 : 0));
    ctx.drawImage(sprite.image, sprite.x, sprite.y, sprite.w, sprite.h, -width / 2, bodyTop, width, -bodyTop);
  } else {
    const legSource = sprite.h - pivot;
    const hips = bodyTop + pivot / sprite.h * -bodyTop;
    const pose = width * 0.045 * stride;
    ctx.drawImage(sprite.image, sprite.x, sprite.y + pivot, sprite.w, legSource,
      -width / 2 + pose, hips - 1, width, -hips + 1);
    ctx.translate(torso + pose / 2, hips - bob * 0.6);
    ctx.rotate(lean);
    ctx.drawImage(sprite.image, sprite.x, sprite.y, sprite.w, pivot + 8,
      -width / 2, bodyTop - hips, width, hips - bodyTop + 8 / sprite.h * height);
  }
  ctx.restore();

  if (guard) {
    ctx.save();
    ctx.translate(x, y - 93);
    ctx.scale(facing, 1);
    ctx.strokeStyle = tint + 'b0';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(19, 0, 63, 90, 0.12, -1.12, 1.13);
    ctx.stroke();
    ctx.restore();
  }
}
