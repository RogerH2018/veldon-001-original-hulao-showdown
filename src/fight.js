import { PORT } from './input.js';

export const WIDTH = 1200;
export const HEIGHT = 640;
export const GROUND = 521;
export const TICKS = 60;
export const ROUND_SECONDS = 55;
export const FIGHTERS = [
  { name: '棱锚', roman: 'ANCHOR', style: '近身 · 重装', color: '#ffb15c', shadow: '#91462e', suit: '#50342c', speed: 3.5, weight: 1.14, reach: 14 },
  { name: '流梭', roman: 'SHUTTLE', style: '游击 · 轻装', color: '#64eddd', shadow: '#248e91', suit: '#183b4e', speed: 4.25, weight: 1, reach: 0 },
];

export const MOVES = {
  A: { active: 5, end: 13, reach: 97, damage: 5, stun: 11, drive: 0.4 },
  B: { active: 10, end: 24, reach: 127, damage: 9, stun: 17, drive: 2.1 },
  C: { active: 19, end: 39, reach: 120, damage: 13, stun: 23, drive: 0.9, breaker: true },
  D: { active: 13, end: 32, reach: 153, damage: 11, stun: 19, drive: 0.5 },
  dash: { active: 11, end: 28, reach: 108, damage: 12, stun: 21, drive: 6.8 },
  pivot: { active: 15, end: 28, reach: 149, damage: 12, stun: 18, drive: -3.5 },
  surge: { active: 13, end: 37, reach: 0, damage: 16, stun: 24, drive: 0, cost: 40 },
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const attackButtons = ['D', 'C', 'B', 'A'];

function makeFighter(id, wins = 0) {
  return {
    id, x: id ? 799 : 401, y: 0, vy: 0, facing: id ? -1 : 1, hp: 100, energy: 28,
    pose: 'idle', move: null, stun: 0, flash: 0, wins, guard: false, combo: 0, comboTimer: 0,
    input: new Set(), directions: [],
  };
}

function relativeDirection(input, facing) {
  const horizontal = (Number(input.has(PORT.right)) - Number(input.has(PORT.left))) * facing;
  const vertical = Number(input.has(PORT.up)) - Number(input.has(PORT.down));
  return 5 + horizontal + vertical * 3;
}

export class Fight {
  constructor(onEvent = () => {}) {
    this.onEvent = onEvent;
    this.phase = 'lobby';
    this.fighters = [makeFighter(0), makeFighter(1)];
    this.effects = [];
    this.projectiles = [];
    this.frame = 0;
    this.round = 1;
    this.clock = ROUND_SECONDS * TICKS;
  }

  start() {
    this.round = 1;
    this.frame = 0;
    this.beginRound([0, 0]);
  }

  beginRound(wins) {
    this.fighters = wins.map((value, id) => makeFighter(id, value));
    this.roundWinner = null;
    this.clock = ROUND_SECONDS * TICKS;
    this.phase = 'intro';
    this.delay = 85;
    this.effects = [];
    this.projectiles = [];
    this.onEvent('round');
  }

  step(controls = [[], []]) {
    this.frame++;
    this.effects = this.effects.filter(effect => this.frame - effect.frame < effect.duration);
    if (this.phase === 'intro') {
      if (--this.delay === 0) {
        this.phase = 'fight';
        this.onEvent('fight');
      }
      return;
    }
    if (this.phase === 'roundEnd') {
      if (--this.delay === 0) {
        if (this.fighters.some(fighter => fighter.wins === 2)) {
          this.phase = 'matchEnd';
          this.onEvent('match', this.roundWinner);
        } else {
          this.round++;
          this.beginRound(this.fighters.map(fighter => fighter.wins));
        }
      }
      return;
    }
    if (this.phase !== 'fight') return;

    this.clock--;
    const [left, right] = this.fighters;
    for (const fighter of this.fighters) {
      const other = fighter.id ? left : right;
      if (!fighter.move && fighter.stun === 0 && fighter.facing * (other.x - fighter.x) < 0) {
        fighter.facing *= -1;
        fighter.directions = [];
      }
      this.updateFighter(fighter, new Set(controls[fighter.id]));
    }
    this.separate(left, right);

    const contacts = [];
    for (const fighter of this.fighters) {
      const target = this.fighters[1 - fighter.id];
      const action = fighter.move;
      if (!action) continue;
      const move = MOVES[action.id];
      if (action.age === move.active) {
        if (action.id === 'surge') {
          this.projectiles.push({ id: fighter.id, x: fighter.x + fighter.facing * 56, y: fighter.y + 74, facing: fighter.facing });
          this.onEvent('surge', fighter.id);
        } else if (fighter.facing * (target.x - fighter.x) > 0
          && Math.abs(fighter.x - target.x) <= move.reach + FIGHTERS[fighter.id].reach
          && Math.abs(fighter.y - target.y) <= 96) {
          contacts.push({ fighter, target, move, blocked: target.guard && !move.breaker });
        }
      }
      if (action.age >= move.end) fighter.move = null;
    }
    this.projectiles = this.projectiles.filter(projectile => {
      projectile.x += projectile.facing * 11;
      const target = this.fighters[1 - projectile.id];
      if (Math.abs(projectile.x - target.x) < 38 && Math.abs(projectile.y - target.y - 74) < 75) {
        contacts.push({ fighter: this.fighters[projectile.id], target, move: MOVES.surge, blocked: target.guard });
        return false;
      }
      return projectile.x >= 0 && projectile.x <= WIDTH;
    });
    contacts.forEach(contact => this.land(contact));
    if (this.clock === 0 || this.fighters.some(fighter => fighter.hp === 0)) this.endRound();
  }

  updateFighter(fighter, input) {
    const character = FIGHTERS[fighter.id];
    const direction = relativeDirection(input, fighter.facing);
    if (direction !== 5 && direction !== fighter.directions.at(-1)?.direction) {
      fighter.directions.push({ direction, frame: this.frame });
    }
    fighter.directions = fighter.directions.filter(mark => this.frame - mark.frame <= 26);
    const button = attackButtons.find(action => input.has(PORT[action]) && !fighter.input.has(PORT[action]));
    fighter.input = input;
    fighter.flash = Math.max(0, fighter.flash - 1);
    fighter.comboTimer = Math.max(0, fighter.comboTimer - 1);
    if (!fighter.comboTimer) fighter.combo = 0;
    fighter.guard = false;
    if (fighter.y > 0 || fighter.vy > 0) {
      fighter.y = Math.max(0, fighter.y + fighter.vy);
      fighter.vy = fighter.y === 0 ? 0 : fighter.vy - 0.81;
    }
    if (fighter.stun > 0) {
      fighter.stun--;
      return;
    }
    if (!fighter.move && button) this.startMove(fighter, button);
    if (fighter.move) {
      fighter.move.age++;
      const move = MOVES[fighter.move.id];
      if (fighter.move.age < move.active) fighter.x += fighter.facing * move.drive;
    } else {
      const horizontal = Number(input.has(PORT.right)) - Number(input.has(PORT.left));
      const grounded = fighter.y === 0;
      const crouch = grounded && input.has(PORT.down);
      if (grounded && input.has(PORT.up)) fighter.vy = 15.4;
      if (!crouch) fighter.x += horizontal * character.speed * (grounded ? 1 : 0.78);
      fighter.guard = grounded && !fighter.vy && (crouch || horizontal === -fighter.facing);
      fighter.pose = fighter.vy || fighter.y ? 'jump' : fighter.guard ? 'guard' : horizontal ? 'walk' : 'idle';
    }
    fighter.x = clamp(fighter.x, 71, WIDTH - 71);
  }

  startMove(fighter, button) {
    const motion = fighter.directions.slice(-3).map(mark => mark.direction).join('');
    let id = button;
    if (motion === '236' && button === 'A') id = 'dash';
    if (motion === '214' && button === 'B') id = 'pivot';
    if (motion === '236' && button === 'D' && fighter.energy >= MOVES.surge.cost) id = 'surge';
    fighter.directions = [];
    fighter.energy -= MOVES[id].cost ?? 0;
    fighter.move = { id, age: 0 };
    fighter.pose = 'attack';
    this.onEvent('swing', fighter.id);
  }

  separate(first, second) {
    if (Math.abs(first.y - second.y) > 95) return;
    const [left, right] = first.x < second.x ? [first, second] : [second, first];
    const overlap = 72 - (right.x - left.x);
    if (overlap <= 0) return;
    left.x = clamp(left.x - overlap / 2, 71, WIDTH - 143);
    right.x = left.x + 72;
  }

  land({ fighter, target, move, blocked }) {
    const damage = blocked ? 0 : Math.round(move.damage * FIGHTERS[fighter.id].weight);
    target.hp = Math.max(0, target.hp - damage);
    target.stun = blocked ? 8 : move.stun;
    target.pose = blocked ? 'guard' : 'hurt';
    target.move = null;
    target.flash = blocked ? 4 : 9;
    target.x = clamp(target.x + fighter.facing * (blocked ? 10 : 27), 71, WIDTH - 71);
    fighter.energy = Math.min(100, fighter.energy + (blocked ? 2 : 8));
    target.energy = Math.min(100, target.energy + 5);
    if (!blocked) {
      fighter.combo++;
      fighter.comboTimer = 54;
    }
    this.effects.push({ x: target.x, y: GROUND - target.y - 100, frame: this.frame, duration: 22, id: fighter.id, blocked });
    this.onEvent(blocked ? 'guard' : 'hit', target.id);
  }

  endRound() {
    const [first, second] = this.fighters;
    this.roundWinner = first.hp === second.hp ? null : first.hp > second.hp ? 0 : 1;
    if (this.roundWinner !== null) this.fighters[this.roundWinner].wins++;
    for (const fighter of this.fighters) {
      fighter.move = null;
      fighter.pose = this.roundWinner === fighter.id ? 'win' : 'hurt';
    }
    this.projectiles = [];
    this.phase = 'roundEnd';
    this.delay = 115;
    this.onEvent('roundEnd', this.roundWinner);
  }
}

export class Opponent {
  constructor() { this.reset(); }
  reset() {
    this.next = 0;
    this.intent = [];
  }
  controls(fight, level) {
    if (fight.phase !== 'fight') return [];
    const [human, cpu] = fight.fighters;
    const toward = cpu.x > human.x ? PORT.left : PORT.right;
    const away = toward === PORT.left ? PORT.right : PORT.left;
    const gap = Math.abs(human.x - cpu.x);
    if (fight.frame < this.next) return this.intent;
    this.next = fight.frame + (level === 1 ? 29 : level === 2 ? 17 : 10);
    if (cpu.move || cpu.stun) this.intent = [];
    else if (level > 1 && human.move && gap < 155 && human.move.id !== 'C') this.intent = [away];
    else if (gap > 145) this.intent = [toward];
    else {
      const choice = Math.floor(fight.frame / 13) % 6;
      const attack = choice < 2 && gap < 100 ? PORT.A : choice === 3 ? PORT.C : gap > 117 ? PORT.D : PORT.B;
      this.intent = this.intent.includes(attack) ? [] : [attack];
    }
    return this.intent;
  }
}
