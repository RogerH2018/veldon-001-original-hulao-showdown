import { COMPANIES } from './generals.js?v=3';

const swatches = {
  jade: ['#287768', '#153f40'], ivory: ['#ded9bd', '#73868c'], steel: ['#96adbe', '#40546d'],
  charcoal: ['#50515d', '#2b2735'], russet: ['#b25d44', '#622f32'], gold: ['#ca974e', '#795237'],
  indigo: ['#515f9a', '#303951'], teal: ['#40838b', '#254955'], lilac: ['#ba86b2', '#704565'],
  plum: ['#785577', '#492d4d'], crimson: ['#bd524e', '#6d3039'],
};
const lights = {
  dragon: '#86e8ae', petal: '#ffa8bc', flame: '#ff9d63', storm: '#a5c6ff', wind: '#a6e3ca',
  stars: '#d0bbff', water: '#83dbe9', stone: '#ebc48b', sun: '#ffd66f', moon: '#ddd2ff',
  sand: '#f4c47b', feather: '#c2e2fa', leaf: '#bae597', ice: '#a9e7ff', ink: '#c4abd8',
  tiger: '#ffb460', bell: '#efc6ff',
};
const arms = {
  sword: [4.15, 1.00, 7], twins: [4.25, 0.98, 5], daggers: [4.45, 0.96, 3],
  spear: [3.95, 1.02, 15], serpent: [3.75, 1.08, 14], glaive: [3.63, 1.09, 14],
  halberd: [3.72, 1.08, 15], hammer: [3.40, 1.13, 6], axe: [3.50, 1.10, 10],
  mace: [3.58, 1.09, 8], shield: [3.46, 1.11, 4], bow: [4.17, 0.99, 12],
  staff: [3.82, 1.03, 13], fan: [4.08, 0.99, 8], scroll: [3.86, 1.01, 8],
  lute: [3.76, 1.02, 10], ribbon: [4.23, 0.97, 13],
};
export const STROKES = {
  T: 'thrust', S: 'cut', U: 'rise', H: 'crush', F: 'cast', R: 'rush',
  W: 'sweep', V: 'spin', D: 'dive', K: 'kick', N: 'volley', X: 'burst',
};
export const TACTIC_NAMES = { quick: '快击', charge: '突进', break: '重破' };
export const SIGNATURE_TACTICS = ['quick', 'charge', 'break'];
const descriptions = ['快击 · 近身连打', '突进 · 跨步追击', '重破 · 耗气终结'];
const kingdomColors = { 蜀: '#8bcea8', 魏: '#9fb6ee', 吴: '#f1a796', 群雄: '#e8c381' };
const armorByDye = { jade: 0, ivory: 1, steel: 1, crimson: 2, charcoal: 3, indigo: 4, teal: 6, gold: 7, lilac: 8, plum: 8, russet: 9 };
export const TEAMS = COMPANIES.map(({ id, kingdom, name }) => ({ id, kingdom, name, color: kingdomColors[kingdom] }));

function signature(text, slot, group, member, effect) {
  const [name, score] = text.split('/');
  const variation = (group * 3 + member * 7 + slot) % 10;
  let tick = [7 + variation % 4, 13 + variation % 4, 16 + variation % 5][slot];
  const steps = [...score].map((symbol, hit) => {
    const kind = STROKES[symbol];
    if (!kind) throw new Error(name + ' 的动作谱无效');
    const last = hit === score.length - 1;
    const step = { at: tick, kind, damage: (slot === 2 ? 4 : slot + 3) + (last ? 4 + (member + group) % 4 : 0),
      push: last ? [39, 62, 81][slot] + variation : 8 + (variation + hit) % 5 };
    tick += 8 + (member + slot) % 4 + (['crush', 'dive', 'spin'].includes(kind) ? 3 : 0);
    return step;
  });
  return {
    name, slot, effect, steps, tactic: SIGNATURE_TACTICS[slot], description: descriptions[slot],
    end: steps.at(-1).at + 19 + member % 5, reach: [140 + variation * 3, 161 + variation * 2, 235 + variation * 8][slot],
    drive: [1 + variation * 0.18, 24 + member * 0.65, 9 + (member + group) % 7][slot],
    cost: slot === 2 ? 32 + (group + member) % 7 : 0, pitch: 142 + group * 9 + member * 3 + slot * 12,
  };
}

export const ROSTER = COMPANIES.flatMap(({ id: team, kingdom, name: unit, members }, group) =>
  members.trim().split('\n').map((line, index) => {
    const [name, roman, style, weapon, dye, effect, ...moves] = line.split('|');
    const [speed, weight, reach] = arms[weapon];
    const number = group * 10 + index;
    return {
      id: team + '-' + roman.toLowerCase().replaceAll(' ', '-'), name, roman, style, team, kingdom, family: kingdom + ' · ' + unit,
      color: lights[effect], robe: swatches[dye][0], lining: swatches[dye][1], weapon, effect, index, number,
      armor: dye === 'ivory' && ['staff', 'fan', 'scroll', 'ribbon'].includes(weapon) ? 5 : armorByDye[dye],
      speed: speed + (index % 4) * 0.055, weight: weight + (index % 3) * 0.009, reach,
      signatures: moves.map((move, slot) => signature(move, slot, group, index, effect)),
    };
  }),
);
export const DEFAULT_ROSTER = ['shu-oath-guan-yu', 'lords-gate-lu-bu'];
const byId = new Map(ROSTER.map(character => [character.id, character]));
export const findFighter = id => byId.get(id);
