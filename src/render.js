import { FIGHTERS, GROUND, HEIGHT, MOVES, WIDTH } from './fight.js';

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

function drawFighter(ctx, fighter, frame, showpiece) {
  const char = FIGHTERS[fighter.id];
  const anchor = fighter.id === 0;
  const x = showpiece ? (anchor ? 264 : 936) : fighter.x;
  const y = GROUND - fighter.y;
  const direction = fighter.facing;
  const move = fighter.move;
  const strike = move ? Math.sin(Math.PI * Math.min(1, move.age / MOVES[move.id].end)) : 0;
  const low = fighter.pose === 'guard';
  const hurt = fighter.pose === 'hurt';
  const gait = fighter.pose === 'walk' ? Math.sin(frame * 0.23) * 14 : 0;
  const breath = Math.sin(frame * 0.079 + fighter.id * 1.6) * 3;
  const tall = anchor ? 1 : 1.1;
  const arm = move ? (move.id === 'C' ? 88 : move.id === 'D' ? 78 : 64) * strike : 0;
  const scale = showpiece ? 1.23 : 1.06;
  const color = fighter.flash > 4 ? '#fefff7' : char.color;
  const shoulder = anchor ? 39 : 28;
  const reactor = anchor ? 12 : 7;

  ellipse(ctx, x, GROUND + 5, 56 * scale, 10, '#051017a0');
  ellipse(ctx, x, GROUND + 6, 36 * scale, 5, char.color + '24');
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(direction * scale, scale);
  ctx.rotate(hurt ? -0.18 : move ? strike * 0.11 : 0);
  const hip = -68 + (low ? 18 : 0) + breath * 0.45;
  const chest = -131 * tall + (low ? 21 : 0) + breath;

  line(ctx, [[-17, hip + 5], [-32 + gait, -26], [-35 + gait, -6]], '#101c2a', anchor ? 26 : 17);
  line(ctx, [[18, hip + 5], [27 - gait, -28], [36 - gait, -5]], char.shadow, anchor ? 31 : 18);
  poly(ctx, [[14 - gait, -40], [32 - gait, -38], [40 - gait, -14], [22 - gait, -12]], char.suit);
  poly(ctx, [[18 - gait, -10], [37 - gait, -14], [50 - gait, -7], [50 - gait, 1], [15 - gait, 1]], color);
  poly(ctx, [[-42 + gait, -12], [-24 + gait, -10], [-20 + gait, 0], [-53 + gait, 0], [-53 + gait, -7]], char.shadow);

  if (anchor) {
    poly(ctx, [[-48, chest - 20], [-20, chest - 33], [-9, chest + 23], [-49, chest + 17]], '#172933');
    line(ctx, [[-44, chest - 13], [-27, chest - 20], [-22, chest + 7]], '#f3ac592e', 3);
  } else {
    const sweep = Math.sin(frame * 0.12) * 10;
    poly(ctx, [[-20, chest - 13], [-46, chest - 2], [-85 - strike * 15, chest + 16 + sweep], [-54, chest + 24], [-20, chest + 8]], '#2bd3bf9c');
    line(ctx, [[-21, chest - 10], [-51, chest + 5], [-79 - strike * 15, chest + 18 + sweep]], '#a9fcdd', 2);
  }
  poly(ctx, [[-shoulder, chest - 6], [-21, chest - 27], [23, chest - 25], [shoulder + 7, chest], [21, hip + 10], [-21, hip + 10]], '#0d1823');
  poly(ctx, [[-shoulder + 7, chest - 4], [-19, chest - 19], [24, chest - 17], [shoulder, chest + 2], [17, hip], [-16, hip]], char.suit);
  poly(ctx, [[-shoulder + 9, chest], [-12, chest - 16], [25, chest - 13], [shoulder - 1, chest + 3], [17, chest + 21], [-17, chest + 17]], char.shadow);
  poly(ctx, [[-reactor, chest + 5], [0, chest - 6], [reactor, chest + 5], [0, chest + 14]], color);
  line(ctx, [[-17, hip - 5], [20, hip - 5]], color, 3);

  const head = chest - (anchor ? 42 : 47);
  if (anchor) {
    poly(ctx, [[-27, head + 13], [-29, head - 10], [-18, head - 23], [15, head - 24], [27, head - 8], [25, head + 15], [5, head + 24], [-13, head + 22]], '#121c24');
    poly(ctx, [[-27, head - 8], [-17, head - 22], [14, head - 22], [26, head - 9], [16, head - 4], [-16, head - 4]], color);
    poly(ctx, [[-20, head + 2], [23, head - 4], [19, head + 9], [-11, head + 12]], '#552d26');
    line(ctx, [[-11, head + 5], [17, head + 2]], '#ffe5a7', 4);
  } else {
    poly(ctx, [[-24, head + 9], [-18, head - 21], [-4, head - 24], [21, head - 14], [29, head + 1], [12, head + 18], [-4, head + 23]], '#101c2b');
    poly(ctx, [[-24, head + 7], [-20, head - 6], [-34, head - 30], [-8, head - 22], [13, head - 16], [26, head - 6], [13, head - 1]], color);
    poly(ctx, [[-11, head + 4], [27, head - 2], [17, head + 8], [-6, head + 12]], '#e4ffee');
  }

  const fistX = low ? 30 : 43 + arm;
  const fistY = low ? chest - 19 : chest + 17 - strike * (move?.id === 'C' ? 28 : 11);
  line(ctx, [[-shoulder + 5, chest + 2], [-44, chest + 26], [-34, chest + 47]], char.shadow, anchor ? 19 : 13);
  line(ctx, [[shoulder - 4, chest + 3], [35 + arm * 0.62, chest + 22], [fistX, fistY]], '#111e29', anchor ? 25 : 17);
  poly(ctx, [[fistX - 12, fistY - 12], [fistX + 13, fistY - 14], [fistX + 21, fistY - 3], [fistX + 14, fistY + 12], [fistX - 12, fistY + 11]], color);
  line(ctx, [[fistX - 2, fistY - 4], [fistX + 13, fistY - 6]], '#fff7db98', 2);

  if (low) {
    ctx.strokeStyle = char.color + '99';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(28, -78, 56, 74, 0, -1.27, 1.02);
    ctx.stroke();
  }
  if (strike > 0.66) {
    ctx.strokeStyle = char.color + 'b6';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.ellipse(39, chest + 6, 81, 63, -0.23, -0.54, 0.73);
    ctx.stroke();
  }
  ctx.restore();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const background = makeBackdrop();
  return (fight, frame) => {
    ctx.drawImage(background, 0, 0);
    for (let i = 0; i < 33; i++) {
      const x = (i * 127 + frame * (0.23 + i % 3 * 0.13)) % WIDTH;
      const y = 190 + i * 67 % 296 + Math.sin(frame * 0.03 + i) * 8;
      ellipse(ctx, x, y, 1.1 + i % 3 * 0.3, 1, i % 4 ? '#9affdb70' : '#ffc17c9c');
    }
    for (const projectile of fight.projectiles) {
      const y = GROUND - projectile.y;
      const color = FIGHTERS[projectile.id].color;
      ellipse(ctx, projectile.x, y, 32, 14, color + '30');
      ellipse(ctx, projectile.x, y, 22, 7, color);
      line(ctx, [[projectile.x, y - 1], [projectile.x - projectile.facing * 65, y - 1]], color + '9a', 4);
    }
    for (const fighter of fight.fighters) drawFighter(ctx, fighter, frame, fight.phase === 'lobby');
    for (const effect of fight.effects) {
      const age = (fight.frame - effect.frame) / effect.duration;
      const color = effect.blocked ? '#b8fff2' : FIGHTERS[effect.id].color;
      ctx.save();
      ctx.globalAlpha = (1 - age) ** 1.6;
      ctx.translate(effect.x, effect.y);
      for (let i = 0; i < 10; i++) {
        ctx.rotate(tau / 10);
        const radius = 12 + age * 76;
        line(ctx, [[radius / 2, 0], [radius + i * 2, 1]], i % 3 ? color : '#fff8da', 2 + i % 3);
      }
      ctx.restore();
    }
  };
}
