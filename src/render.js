import { language, t } from './locale.js?v=5';
import { GROUND, HEIGHT, MOVES, WIDTH } from './fight.js?v=5';
import { drawFighter } from './fighter-render.js?v=5';
import { drawStrike } from './strike-render.js?v=5';

const backdrop = new Image();
backdrop.src = new URL('../assets/hulao.webp', import.meta.url).href;
export const preloadStage = () => backdrop.decode();

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const narrow = matchMedia('(max-width: 700px)');
  let focus = WIDTH / 2, zoom = 1;
  const topShade = ctx.createLinearGradient(0, 0, 0, 146);
  topShade.addColorStop(0, '#211a1af5'); topShade.addColorStop(.54, '#27201e70'); topShade.addColorStop(1, '#31221b00');
  return (fight, frame) => {
    const [left, right] = fight.fighters;
    const closeView = narrow.matches && !reduceMotion.matches && fight.phase !== 'lobby';
    const targetZoom = closeView ? Math.min(1.48, WIDTH / (Math.abs(left.x - right.x) + 305)) : 1;
    zoom += (Math.max(1, targetZoom) - zoom) * .17;
    const margin = WIDTH / (2 * zoom);
    const midpoint = closeView ? (left.x + right.x) / 2 : WIDTH / 2;
    focus = Math.max(margin, Math.min(WIDTH - margin, focus + (midpoint - focus) * .17));
    const camera = () => { ctx.translate(WIDTH / 2, GROUND); ctx.scale(zoom, zoom); ctx.translate(-focus, -GROUND); };
    ctx.save(); camera();
    if (backdrop.complete && backdrop.naturalWidth) ctx.drawImage(backdrop, 0, 0, WIDTH, HEIGHT);
    else { ctx.fillStyle = '#b48362'; ctx.fillRect(0, 0, WIDTH, HEIGHT); }
    ctx.restore();
    ctx.fillStyle = topShade; ctx.fillRect(0, 0, WIDTH, 146);
    ctx.save(); camera();
    const impact = fight.effects.find(e => e.last && !e.type && fight.frame - e.frame < 7);
    if (impact && !reduceMotion.matches) {
      const strength = (7 - fight.frame + impact.frame) * .6;
      ctx.translate(Math.sin(frame * 1.7) * strength, Math.cos(frame * 2.8) * strength * .45);
    }
    if (!reduceMotion.matches) for (let i = 0; i < 12; i++) {
      const x = ((i * 127 + frame * (.30 + i % 3 * .16)) % (WIDTH+38))-16;
      const y = 144 + i * 37 % 330 + Math.sin(frame * .023 + i) * 12;
      ctx.fillStyle = i % 2 ? '#a1452e97' : '#d97e4c88'; ctx.beginPath(); ctx.ellipse(x, y, 3.5, 1.2, frame*.016+i, 0, 6.29); ctx.fill();
    }
    for (const p of fight.projectiles) drawStrike(ctx, {kind:'thrust', family:'wind', color:fight.fighters[p.id].character.color,
      slot:-1, span:60, x:p.x-p.facing*50, y:GROUND-p.y, facing:p.facing, frame:fight.frame}, .15);
    const order = left.move && !right.move ? [right, left] : fight.fighters;
    for (const f of order) drawFighter(ctx, f, frame, { ground: GROUND, lobby: fight.phase === 'lobby', reduced: reduceMotion.matches }, MOVES);
    for (const e of fight.effects) {
      const age = (fight.frame - e.frame) / e.duration;
      if (e.type === 'strike') { drawStrike(ctx, e, age); continue; }
      ctx.save(); ctx.translate(e.x, e.y);
      if (e.type === 'counter') {
        ctx.globalAlpha = Math.min(1, (1-age)*4); ctx.translate(0,-age*27);
        ctx.textAlign = 'center'; ctx.font = language === 'en' ? 'bold 22px system-ui' : 'bold 24px KaiTi, STKaiti, serif'; ctx.lineWidth = 4; ctx.strokeStyle = '#4d241c';
        ctx.strokeText(t(e.text),0,0); ctx.fillStyle='#ffe4a1'; ctx.fillText(t(e.text),0,0);
      } else {
        ctx.globalAlpha=(1-age)**1.5;
        const rays=e.last?13:8;
        for(let i=0;i<rays;i++) {
          ctx.rotate(Math.PI*2/rays); const r=9+age*(e.last?83:47);
          ctx.beginPath(); ctx.moveTo(r*.42,0); ctx.lineTo(r+i*1.4,0); ctx.strokeStyle=e.blocked?'#ddf8ff':i%2?e.color:'#fff7dd'; ctx.lineWidth=2+i%3; ctx.stroke();
        }
      }
      ctx.restore();
    }
    ctx.restore();
  };
}
