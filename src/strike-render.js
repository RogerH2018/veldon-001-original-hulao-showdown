const tau = Math.PI * 2;
const aspect = {
  dragon: '龍', tiger: '虎', flame: '火', wind: '風', moon: '月', sun: '日', petal: '花', bell: '音',
  stone: '山', sand: '沙', feather: '羽', ice: '霜', water: '潮', stars: '星', leaf: '木', ink: '墨', storm: '雷',
};
function path(ctx, points, color, width) {
  ctx.beginPath(); points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
}
function cut(ctx, r, width, turn) {
  ctx.save(); ctx.rotate(turn); ctx.beginPath();
  ctx.moveTo(-r * .57, r * .52);
  ctx.bezierCurveTo(-r * .25, -r * .94, r * .65, -r * .83, r, r * .08);
  ctx.bezierCurveTo(r * .57, -r * .50 - width, -r * .20, -r * .63, -r * .57, r * .52);
  ctx.fill(); ctx.restore();
}
function motif(ctx, family, r, phase, color) {
  ctx.strokeStyle = color; ctx.lineWidth = 2.3; ctx.fillStyle = color;
  if (family === 'dragon' || family === 'water' || family === 'wind' || family === 'ink') {
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(-r * .95, r * .2 + i * 7);
      ctx.bezierCurveTo(-r * .4, -r * (1.3 - i * .16), r * .3, r * .7, r, -r * .56 + i * 5);
      ctx.stroke();
    }
    if (family === 'dragon') {
      path(ctx, [[r * .78,-r * .40],[r * .83,-r * .67],[r * .9,-r * .52],[r * 1.05,-r * .59],[r,-r * .40]], color, 3.5);
    }
  } else if (family === 'stars' || family === 'storm' || family === 'ice') {
    const star = family === 'stars';
    const vertices = Array.from({ length: 7 }, (_, i) => [(i - 3) * r * .30, Math.sin(i * 3.72 + phase * .5) * r * .55]);
    path(ctx, vertices, color, star ? 1.5 : 3.5);
    for (const [x,y] of vertices) {ctx.fillRect(x-2, y-2, star ? 4 : 2, star ? 4 : 7);}
  } else if (family === 'tiger') {
    for (let i = -1; i <= 1; i++) {ctx.save(); ctx.translate(i * 13, i * 5); cut(ctx, r * .7, 7, -.65); ctx.restore();}
  } else if (['sun', 'moon', 'bell'].includes(family)) {
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.ellipse(0, 0, r * (.45+i*.19), r * (.38+i*.17), -.39, .25, family === 'moon' ? 4.5 : tau); ctx.stroke();
    }
  }
}
export function drawStrike(ctx, event, age) {
  if (age < 0 || age >= 1) return;
  const { kind, family, color, last, slot } = event;
  const scale = last ? 1.17 : slot < 0 ? .72 : .94;
  const fade = (1 - age) ** 1.16, span = Math.max(55, event.span);
  ctx.save(); ctx.translate(event.x, event.y); ctx.scale(event.facing, 1); ctx.lineCap = 'round';
  ctx.globalAlpha = fade;
  const beam = ['volley', 'thrust', 'rush', 'cast', 'burst'].includes(kind);
  ctx.fillStyle = color;
  if (kind === 'palm' || kind === 'elbow' || kind === 'deflect') {
    ctx.save();ctx.translate(span*.71,-4);ctx.rotate(kind==='deflect'?-.65:.13);
    for(let i=0;i<3;i++) {
      const r=(12+age*32+i*7)*scale;
      ctx.beginPath();ctx.ellipse(i*6,0,r*.49,r,0,-1.8,kind==='palm'?2.9:1.8);
      ctx.strokeStyle=i===1?'#fff3ce':color;ctx.lineWidth=i===2?2:4;ctx.stroke();
    }
    if(kind==='elbow') path(ctx,[[-36,9],[-8,-12],[22,1],[-3,9]],color,5);
    ctx.restore();
  } else if (kind === 'draw') {
    const edge=span+age*17;
    path(ctx,[[12,29],[edge*.65,3],[edge,-29]],color,7*scale);
    path(ctx,[[28,20],[edge*.72,-2],[edge+4,-31]],'#fff4d0',2*scale);
  } else if (beam) {
    const start = 26 + age * 21, end = span + (slot < 0 ? 0 : age * 11);
    const mid = (start + end) / 2, thick = kind === 'burst' ? 23 : kind === 'cast' ? 12 : 6;
    ctx.beginPath(); ctx.moveTo(start, 5);
    ctx.quadraticCurveTo(mid, -thick, end, kind === 'volley' ? -11 : -2);
    ctx.quadraticCurveTo(mid, thick, start, 5); ctx.fill();
    path(ctx, [[start+8,3],[mid,0],[end,-3]], '#fff5d8', 2.4);
    if (kind === 'volley') for (const offset of [-12,12]) path(ctx, [[mid-13,offset],[end-5,offset-9],[end-11,offset-13]], color, 2);
  } else {
    ctx.save(); ctx.translate(span*.64, kind === 'rise' ? -17 : 2);
    const tilt = { cut: .2, rise: -1.05, sweep: -.19, crush: 1.15, dive: 1.34, spin: -.55, kick: -.25 }[kind] ?? 0;
    cut(ctx, (65 + age * 14) * scale, 11, tilt + age * .23);
    ctx.fillStyle = '#fff4cf'; cut(ctx, (54 + age * 13) * scale, 3, tilt - .15 + age * .23);
    if (kind === 'spin' || last) {ctx.fillStyle=color; cut(ctx, 58*scale, 8, tilt+2.7);}
    ctx.restore();
  }
  ctx.translate(span * .83, -3);
  const radius = (37 + age * 60) * scale;
  if (slot >= 0) motif(ctx, family, radius, age, color);
  const count = last ? 23 : slot < 0 ? 5 : 11;
  for (let i = 0; i < count; i++) {
    const angle = i * 2.4 + event.frame * .11;
    const distance = (11 + age * (40 + i % 5 * 11)) * scale;
    const x = Math.cos(angle) * distance, y = Math.sin(angle) * distance - age * (family === 'flame' ? 33 : 4);
    ctx.fillStyle = i % 3 ? color : '#fff5d2';
    ctx.beginPath(); ctx.ellipse(x, y, (family === 'petal' || family === 'leaf' || family === 'feather' ? 6 : 3.5) * scale,
      1.8 * scale, angle + age, 0, tau); ctx.fill();
  }
  if (last && slot === 2) {
    ctx.scale(event.facing,1); ctx.translate(0, -79 - age * 12); ctx.rotate(-.09);
    ctx.fillStyle = '#762c21'; ctx.fillRect(-17,-17,34,34);
    ctx.strokeStyle = '#efca89'; ctx.lineWidth = 1; ctx.strokeRect(-15,-15,30,30);
    ctx.fillStyle = '#fff0bc'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.font='bold 26px KaiTi, STKaiti, serif'; ctx.fillText(aspect[family] ?? '武', 0, 1);
  }
  ctx.restore();
}
