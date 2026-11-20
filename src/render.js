import { GROUND, HEIGHT, MOVES, WIDTH } from './fight.js?v=2';
import { drawFighter } from './fighter-render.js';
import { drawStrike } from './strike-render.js';

const tau = Math.PI * 2;

function poly(ctx, points, fill) {
  ctx.beginPath();
  points.forEach(([x, y], step) => step ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function line(ctx, points, color, width = 1) {
  ctx.beginPath();
  points.forEach(([x, y], step) => step ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

function ellipse(ctx, x, y, rx, ry, fill) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, tau);
  ctx.fillStyle = fill;
  ctx.fill();
}

function makeBackdrop() {
  const backdrop = document.createElement('canvas');
  backdrop.width = WIDTH;
  backdrop.height = HEIGHT;
  const ctx = backdrop.getContext('2d');
  const sky = ctx.createLinearGradient(0, 0, 0, 490);
  sky.addColorStop(0, '#07111c');
  sky.addColorStop(0.53, '#173641');
  sky.addColorStop(1, '#235859');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const haze = ctx.createRadialGradient(600, 310, 15, 600, 310, 530);
  haze.addColorStop(0, '#87f5d137');
  haze.addColorStop(1, '#28305f00');
  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, WIDTH, 470);
  for (let i = 0; i < 105; i++) {
    const x = i * 253 % 1193;
    const y = 9 + i * 113 % 289;
    ctx.fillStyle = i % 5 ? '#bce8d52c' : '#d9f9e680';
    ctx.fillRect(x, y, 1 + Number(i % 5 === 0), 1);
  }

  ctx.save();
  ctx.translate(850, 153);
  ctx.rotate(-0.18);
  ellipse(ctx, 0, 0, 135, 110, '#96f8cc0a');
  ellipse(ctx, 0, 0, 104, 90, '#93efd121');
  ellipse(ctx, 0, 0, 83, 83, '#9af4cb30');
  ctx.strokeStyle = '#a1f9d267';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 0, 150, 35, 0, 0, tau);
  ctx.stroke();
  ctx.restore();

  for (let i = 0; i < 32; i++) {
    const x = i * 39 - 12;
    const h = 30 + i * 71 % 125;
    const w = 18 + i * 17 % 47;
    ctx.fillStyle = i % 3 ? '#173e46' : '#102c38';
    ctx.fillRect(x, 401 - h, w, h);
    ctx.fillStyle = '#a8d6aa32';
    for (let j = 11; j < h - 6; j += 13) {
      ctx.fillRect(x + 6 + j * 3 % 8, 401 - h + j, 3 + i % 7, 2);
    }
  }

  const water = ctx.createLinearGradient(0, 397, 0, 535);
  water.addColorStop(0, '#124043');
  water.addColorStop(1, '#081d2d');
  ctx.fillStyle = water;
  ctx.fillRect(0, 397, WIDTH, 150);
  for (let i = 0; i < 138; i++) {
    const y = 399 + i * 51 % 125;
    ctx.fillStyle = i % 6 === 0 ? '#d79a6b5e' : '#6bd5c149';
    ctx.fillRect(i * 211 % 1188, y, 6 + i * 39 % 105, 1 + Number(y > 482));
  }
  drawCrane(ctx, 97, 82, 1);
  drawCrane(ctx, 1138, 161, -0.72);
  poly(ctx, [[0, 469], [1200, 469], [1200, 640], [0, 640]], '#142833');
  poly(ctx, [[0, 483], [1200, 483], [1200, 640], [0, 640]], '#182c38');
  line(ctx, [[0, 477], [1200, 477]], '#8fccc480', 2);
  for (const y of [498, 514, 546, 597]) line(ctx, [[0, y], [1200, y]], '#57728354');
  for (let i = -9; i <= 9; i++) line(ctx, [[600 + i * 57, 483], [600 + i * 137, 640]], '#57728343');
  ctx.fillStyle = '#081820';
  ctx.fillRect(0, 570, 1200, 13);
  for (let i = 0; i < 31; i++) {
    const x = i * 40 - 9;
    poly(ctx, [[x, 570], [x + 16, 570], [x + 5, 583], [x - 11, 583]], '#d59c5b65');
  }
  for (let i = 0; i < 15; i++) {
    const x = 26 + i * 82;
    ctx.fillStyle = '#56c8b8a6';
    ctx.fillRect(x, 466, 15, 3);
    ctx.fillStyle = '#49dbc729';
    ctx.fillRect(x - 4, 464, 23, 7);
  }
  const shade = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  shade.addColorStop(0, '#00091040');
  shade.addColorStop(0.73, '#00000000');
  shade.addColorStop(1, '#000a16bb');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  return backdrop;
}

function drawCrane(ctx, x, y, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, Math.abs(scale));
  poly(ctx, [[-18, 0], [7, 0], [7, 402], [-18, 402]], '#0a2630');
  poly(ctx, [[-33, 0], [255, 2], [275, 18], [-30, 23]], '#0a2630');
  line(ctx, [[-12, 5], [50, 17], [78, 5], [123, 17], [166, 6], [211, 17], [252, 8]], '#48736e', 2);
  line(ctx, [[238, 17], [238, 148], [245, 160]], '#42625f', 3);
  line(ctx, [[13, 240], [94, 212], [143, 212]], '#132f3a', 9);
  ctx.fillStyle = '#f1a44c';
  ctx.fillRect(242, 156, 8, 4);
  ctx.restore();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const background = makeBackdrop();
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  return (fight, frame) => {
    ctx.drawImage(background, 0, 0);
    const heavyImpact = fight.effects.find(effect => effect.last && effect.type !== 'strike' && fight.frame - effect.frame <= 7);
    ctx.save();
    if (heavyImpact && !reduceMotion.matches) {
      const strength = (8 - (fight.frame - heavyImpact.frame)) * 0.65;
      ctx.translate(Math.sin(frame * 1.7) * strength, Math.cos(frame * 2.8) * strength * 0.45);
    }
    for (let i = 0; i < 33; i++) {
      const x = (i * 127 + frame * (0.23 + i % 3 * 0.13)) % WIDTH;
      const y = 190 + i * 67 % 296 + Math.sin(frame * 0.03 + i) * 8;
      ellipse(ctx, x, y, 1.1 + i % 3 * 0.3, 1, i % 4 ? '#9affdb70' : '#ffc17c9c');
    }
    for (const projectile of fight.projectiles) {
      const y = GROUND - projectile.y;
      const color = fight.fighters[projectile.id].character.color;
      ellipse(ctx, projectile.x, y, 32, 14, color + '30');
      ellipse(ctx, projectile.x, y, 22, 7, color);
      line(ctx, [[projectile.x, y - 1], [projectile.x - projectile.facing * 65, y - 1]], color + '9a', 4);
    }
    for (const fighter of fight.fighters) drawFighter(ctx, fighter, frame, { ground: GROUND, lobby: fight.phase === 'lobby' }, MOVES);
    for (const effect of fight.effects) {
      const age = (fight.frame - effect.frame) / effect.duration;
      if (effect.type === 'strike') {
        drawStrike(ctx, effect, age);
        continue;
      }
      const color = effect.blocked ? '#b8fff2' : effect.color;
      ctx.save();
      ctx.globalAlpha = (1 - age) ** 1.6;
      ctx.translate(effect.x, effect.y);
      const rays = effect.last ? 16 : 10;
      for (let i = 0; i < rays; i++) {
        ctx.rotate(tau / rays);
        const radius = 8 + age * (effect.last ? 119 : 76);
        line(ctx, [[radius / 2, 0], [radius + i * 2, 1]], i % 3 ? color : '#fff8da', 2 + i % 3);
      }
      ctx.restore();
    }
    ctx.restore();
  };
}
