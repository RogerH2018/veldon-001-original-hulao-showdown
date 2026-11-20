const tau = Math.PI * 2;
const shapes = {
  arc: 'ring', flare: 'embers', wave: 'ring', bolt: 'lightning', bloom: 'petals',
  prism: 'shards', ink: 'trail', dust: 'embers', gear: 'shards', note: 'ring',
};

function slash(ctx, x, y, sx, sy, tilt, color, alpha) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.scale(sx, sy);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-50, 22);
  ctx.bezierCurveTo(-14, -63, 44, -45, 79, 5);
  ctx.bezierCurveTo(41, -21, -12, -29, -50, 22);
  ctx.fill();
  ctx.strokeStyle = '#fff7e8';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-42, 3);
  ctx.bezierCurveTo(-7, -46, 39, -42, 65, -9);
  ctx.stroke();
  ctx.restore();
}

export function drawStrike(ctx, event, age) {
  const fade = (1 - age) ** 1.2;
  const force = event.last ? 1.45 : 1;
  const palette = event.color;
  const x = Math.max(26, event.span * 0.63);
  const pattern = shapes[event.family];
  ctx.save();
  ctx.translate(event.x, event.y);
  ctx.scale(event.facing, 1);
  ctx.globalCompositeOperation = 'screen';

  if (event.last) {
    const glow = ctx.createRadialGradient(x, 0, 8, x, 0, 106 * force);
    glow.addColorStop(0, palette + 'c8');
    glow.addColorStop(1, palette + '00');
    ctx.globalAlpha = fade * 0.72;
    ctx.fillStyle = glow;
    ctx.fillRect(x - 170, -170, 340, 340);
  }
  if (event.kind === 'pulse' || event.kind === 'burst') {
    ctx.globalAlpha = fade;
    ctx.fillStyle = palette;
    ctx.shadowColor = palette;
    ctx.shadowBlur = event.last ? 22 : 11;
    ctx.beginPath();
    ctx.moveTo(19, 5);
    ctx.quadraticCurveTo(x * 0.66, -35 * force, event.span, 0);
    ctx.quadraticCurveTo(x * 0.8, 23 * force, 19, 5);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#fff9e8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(24, 4);
    ctx.lineTo(event.span, 0);
    ctx.stroke();
  } else {
    const tilt = { jab: -0.08, hook: 0.4, cleave: 0.81, rush: -0.13, lift: -0.9, drop: 0.92, cross: -0.33 }[event.kind] ?? 0;
    slash(ctx, x, event.kind === 'lift' ? -30 : 0, force + age * 0.15, force * 0.87, tilt, palette, fade);
    if (event.slot || event.last) slash(ctx, x - 11, 17, 0.92 * force, 0.67 * force, tilt - 0.23, palette, fade * 0.58);
  }

  ctx.translate(x, 0);
  ctx.globalAlpha = fade * 0.8;
  ctx.strokeStyle = palette;
  ctx.fillStyle = palette;
  ctx.lineWidth = event.last ? 3.5 : 2;
  if (pattern === 'ring') {
    for (let index = 0; index < 3; index++) {
      const radius = 26 + age * 72 + index * 11;
      ctx.beginPath();
      ctx.ellipse(0, 0, radius, radius * (event.family === 'wave' ? 0.35 : 0.71), -0.2, 0, tau);
      ctx.stroke();
    }
  }
  const count = event.last ? 28 : 13;
  for (let index = 0; index < count; index++) {
    const angle = index * 2.399 + event.frame * 0.17;
    const distance = (15 + age * (43 + index % 7 * 12)) * force;
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance * 0.83;
    const size = (2 + index % 5) * force;
    ctx.beginPath();
    if (pattern === 'shards' || pattern === 'petals') {
      ctx.moveTo(dx, dy - size * 1.6);
      ctx.lineTo(dx + size, dy + 2);
      ctx.lineTo(dx, dy + size);
      ctx.lineTo(dx - size / 2, dy);
      ctx.fill();
    } else if (pattern === 'lightning') {
      ctx.moveTo(dx * 0.4, dy * 0.4);
      ctx.lineTo(dx * 0.74 + 4, dy * 0.71 - 7);
      ctx.lineTo(dx * 0.8 - 6, dy * 0.8 + 2);
      ctx.lineTo(dx, dy);
      ctx.stroke();
    } else {
      ctx.ellipse(dx, dy, size * (pattern === 'trail' ? 2.8 : 1.1), size * 0.53, angle, 0, tau);
      ctx.fill();
    }
  }
  ctx.restore();
}
