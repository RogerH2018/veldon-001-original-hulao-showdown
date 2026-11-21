import { PORT } from './input.js?v=5';
import { DEFAULT_ROSTER, findFighter } from './roster.js?v=5';
import { basicStroke, motionAt } from './motion.js?v=5';

export const WIDTH = 1200;
export const HEIGHT = 640;
export const GROUND = 521;
export const TICKS = 60;
export const ROUND_SECONDS = 55;

export const MOVES = {
  A: { tactic: 'quick', active: 5, end: 17, reach: 97, damage: 5, stun: 11, drive: 0.4 },
  B: { tactic: 'charge', active: 10, end: 25, reach: 127, damage: 9, stun: 17, drive: 2.1 },
  C: { tactic: 'break', active: 19, end: 39, reach: 120, damage: 13, stun: 23, drive: 0.9, breaker: true },
  D: { tactic: 'antiAir', active: 13, end: 32, reach: 153, damage: 11, stun: 19, drive: 0.5 },
  dash: { tactic: 'charge', active: 11, end: 28, reach: 108, damage: 12, stun: 21, drive: 6.8 },
  pivot: { tactic: 'quick', active: 15, end: 28, reach: 149, damage: 12, stun: 18, drive: -3.5 },
  surge: { active: 13, end: 37, reach: 0, damage: 16, stun: 24, drive: 0, cost: 40 },
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const edgeOrder = ['up','down','left','right','A','B','C','D'];
const attackButtons = ['D', 'C', 'B', 'A'];
const beats = { quick: 'break', charge: 'quick', break: 'charge' };
const counterNames = { quick: '快击截破', charge: '突进抢快', break: '重破拦突' };

function windup(fighter) {
  const action = fighter.move;
  if (!action || action.failedAt !== undefined) return null;
  const move = action.skill ?? MOVES[action.id];
  const active = action.skill?.steps[0].at ?? move.active;
  if (!move.tactic || action.age > active) return null;
  return { tactic: move.tactic, remaining: active - action.age, reach: move.reach + fighter.character.reach };
}

function advantage(tactic, other, airborne) {
  if (tactic === 'antiAir' && airborne) return '对空迎击';
  return other && beats[tactic] === other ? counterNames[tactic] : null;
}

function makeFighter(id, character, wins = 0) {
  return {
    id, character, x: id ? 799 : 401, y: 0, vy: 0, facing: id ? -1 : 1, hp: 100, energy: 42,
    walkDistance: 0, walkBlend: 0, landingFrames: 0,
    pose: 'idle', move: null, stun: 0, flash: 0, wins, guard: false, combo: 0, comboTimer: 0,
    input: new Set(), directions: [], commandHistory: [], pending: null, signatureBanner: null,
  };
}

function relativeDirection(input, facing) {
  const horizontal = (Number(input.has(PORT.right)) - Number(input.has(PORT.left))) * facing;
  const vertical = Number(input.has(PORT.up)) - Number(input.has(PORT.down));
  return 5 + horizontal + vertical * 3;
}

export class Fight {
  constructor(onEvent = () => {}, selection = DEFAULT_ROSTER) {
    this.onEvent = onEvent;
    this.lobby(selection);
  }

  lobby(selection = this.selection?.map(character => character.id) ?? DEFAULT_ROSTER) {
    this.select(selection);
    this.phase = 'lobby';
    this.fighters = this.selection.map((character, id) => makeFighter(id, character));
    this.effects = [];
    this.projectiles = [];
    this.frame = 0;
    this.round = 1;
    this.clock = ROUND_SECONDS * TICKS;
  }

  select(selection) {
    this.selection = DEFAULT_ROSTER.map((fallback, id) => findFighter(selection[id]) ?? findFighter(fallback));
  }

  start() {
    this.round = 1;
    this.frame = 0;
    this.beginRound([0, 0]);
  }

  beginRound(wins) {
    this.fighters = wins.map((value, id) => makeFighter(id, this.selection[id], value));
    this.roundWinner = null;
    this.clock = ROUND_SECONDS * TICKS;
    this.phase = 'intro';
    this.delay = 85;
    this.effects = [];
    this.projectiles = [];
    this.onEvent('round');
  }

  step(controls = [[], []], presses = [[], []]) {
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
    const previousX = [left.x,right.x];
    for (const fighter of this.fighters) {
      const other = fighter.id ? left : right;
      if (!fighter.move && fighter.stun === 0 && fighter.facing * (other.x - fighter.x) < 0) {
        fighter.facing *= -1;
        fighter.directions = [];
      }
      this.updateFighter(fighter, new Set(controls[fighter.id]), other, presses[fighter.id]);
    }
    this.separate(left, right);
    for (const f of this.fighters) {
      const canStep = !f.move && !f.stun && !f.y && !f.vy && !f.input.has(PORT.down)
        && f.input.has(PORT.left) !== f.input.has(PORT.right);
      const travel = canStep ? clamp((f.x-previousX[f.id])*f.facing,-f.character.speed,f.character.speed) : 0;
      f.walkDistance += travel;
      f.walkBlend = clamp(f.walkBlend + (Math.abs(travel)>.05 ? .28 : -.23),0,1);
    }

    const contacts = [];
    for (const fighter of this.fighters) {
      const target = this.fighters[1 - fighter.id];
      const action = fighter.move;
      if (!action) continue;
      if (action.skill) {
        this.signatureContact(fighter, target, action, contacts);
        continue;
      }
      const move = MOVES[action.id];
      if (action.age === move.active) {
        if (action.id === 'surge') {
          this.projectiles.push({ id: fighter.id, x: fighter.x + fighter.facing * 56, y: fighter.y + 74, facing: fighter.facing });
          this.onEvent('surge', fighter.id);
        } else {
          this.strikeEffect(fighter, basicStroke(fighter.character, action.id), move.reach, -1, false);
          if (fighter.facing * (target.x - fighter.x) > 0
            && Math.abs(fighter.x - target.x) <= move.reach + fighter.character.reach
            && Math.abs(fighter.y - target.y) <= (move.tactic === 'antiAir' ? 176 : 96)) {
            contacts.push({ fighter, target, move, tactic: move.tactic, blocked: target.guard && !move.breaker });
          }
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
    this.resolveContacts(contacts);
    if (this.clock === 0 || this.fighters.some(fighter => fighter.hp === 0)) this.endRound();
  }

  updateFighter(fighter, input, other, presses = []) {
    const character = fighter.character;
    const direction = relativeDirection(input, fighter.facing);
    if (direction !== 5 && direction !== fighter.directions.at(-1)?.direction) {
      fighter.directions.push({ direction, frame: this.frame });
    }
    fighter.directions = fighter.directions.filter(mark => this.frame - mark.frame <= 26);
    const edges = [...presses];
    for (const key of edgeOrder) {
      if (input.has(PORT[key]) && !fighter.input.has(PORT[key]) && !presses.includes(key)) edges.push(key);
    }
    const button = attackButtons.find(action => edges.includes(action));
    fighter.input = input;
    fighter.flash = Math.max(0, fighter.flash - 1);
    fighter.comboTimer = Math.max(0, fighter.comboTimer - 1);
    if (!fighter.comboTimer) fighter.combo = 0;
    if (fighter.signatureBanner?.until <= this.frame) fighter.signatureBanner = null;
    if (fighter.pending?.until < this.frame) fighter.pending = null;
    fighter.guard = false;
    fighter.landingFrames = Math.max(0, fighter.landingFrames-1);
    if (fighter.y > 0 || fighter.vy > 0) {
      const wasInAir = fighter.y > 0;
      fighter.y = Math.max(0, fighter.y + fighter.vy);
      fighter.vy = fighter.y === 0 ? 0 : fighter.vy - 0.81;
      if (wasInAir && !fighter.y) fighter.landingFrames = 8;
    }
    if (fighter.stun > 0) {
      fighter.stun--;
      fighter.commandHistory.length = 0;
      return;
    }
    if (!fighter.move && fighter.pending) {
      const slot = fighter.pending.slot;
      fighter.pending = null;
      this.requestSignature(fighter.id, slot);
    }
    let commandStarted = false;
    for (const key of edges) {
      if (this.manualInput(fighter, key)) commandStarted = true;
    }
    if (!commandStarted && !fighter.move && button) this.startMove(fighter, button);
    if (fighter.move) {
      const action = fighter.move;
      action.age++;
      if (action.skill) {
        const first = action.skill.steps[0];
        const last = action.skill.steps.at(-1);
        if (action.age < first.at || (action.confirmed && action.age < last.at)) {
          const gap = fighter.facing * (other.x - fighter.x);
          fighter.x += fighter.facing * clamp(gap - 104, 0, action.skill.drive);
        }
      } else {
        const move = MOVES[action.id];
        if (action.age < move.active) fighter.x += fighter.facing * move.drive;
      }
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
    fighter.move = { id, age: 0, startX:fighter.x };
    fighter.pose = 'attack';
    this.onEvent('swing', { id: fighter.id, weapon: fighter.character.weapon, kind: basicStroke(fighter.character, id) });
  }

  manualInput(fighter, key) {
    const history = fighter.commandHistory;
    if (this.frame - (history.at(-1)?.frame ?? this.frame) > 30) history.length = 0;
    history.push({ key, frame: this.frame });
    if (history.length > 4) history.shift();
    if (history.length < 4) return false;
    const matched = fighter.character.signatures.find(skill => skill.command.every((value,i) => value === history[i].key));
    if (!matched) return false;
    history.length = 0;
    const result = this.requestSignature(fighter.id, matched.slot, true);
    if (result === 'energy') fighter.inputNotice = {text: matched.name + ' · 能量不足', skill: matched, reason:'能量不足', until: this.frame + 65};
    return result === 'started' || result === 'queued';
  }

  requestSignature(id, slot, manual = false) {
    const fighter = this.fighters[id];
    const skill = fighter?.character.signatures[slot];
    if (this.phase !== 'fight' || !skill || fighter.stun || (!manual && fighter.y > 65)) return 'busy';
    if (fighter.energy < skill.cost) return 'energy';
    if (fighter.move && (!manual || fighter.move.skill)) {
      const end = fighter.move.failedAt !== undefined ? fighter.move.failedAt + 12 : fighter.move.skill?.end ?? MOVES[fighter.move.id].end;
      if (end - fighter.move.age > 12) return 'busy';
      fighter.pending = { slot, until: this.frame + 13 };
      return 'queued';
    }
    fighter.commandHistory.length = 0;
    fighter.pending = null;
    if (manual && fighter.y > this.fighters[1-id].y) {
      const drop = fighter.y - this.fighters[1-id].y;
      fighter.vy = Math.min(fighter.vy, -drop / skill.steps[0].at);
    }
    fighter.energy -= skill.cost;
    fighter.move = { id: 'signature', age: 0, startX:fighter.x, skill, confirmed: false, next: 0 };
    fighter.pose = 'attack';
    fighter.directions = [];
    fighter.signatureBanner = { name: skill.name, hits: 0, max: skill.steps.length, until: this.frame + skill.end + 40 };
    this.onEvent('signature', { id, skill, weapon: fighter.character.weapon });
    return 'started';
  }

  signatureContact(fighter, target, action, contacts) {
    const { skill } = action;
    const beat = skill.steps[action.next];
    if (action.age === beat?.at && (action.next === 0 || action.confirmed)) {
      const first = action.next === 0;
      const gap = fighter.facing * (target.x - fighter.x);
      const inRange = gap > 0 && gap <= skill.reach + fighter.character.reach
        && Math.abs(fighter.y - target.y) <= (skill.slot === 2 ? 138 : 104);
      const last = action.next === skill.steps.length - 1;
      this.strikeEffect(fighter, beat.kind, Math.min(skill.reach, Math.max(108, gap)), skill.slot, last);
      if (inRange || !first) {
        contacts.push({
          fighter, target, action,
          move: { damage: beat.damage, stun: last ? 22 : skill.steps[action.next + 1].at - beat.at + 7, push: beat.push },
          blocked: first && target.guard, tactic: first ? skill.tactic : undefined, skill, beat, last,
        });
      } else {
        action.failedAt = action.age;
        fighter.signatureBanner.result = '未命中';
        this.onEvent('miss', fighter.id);
      }
      action.next++;
    }
    if (action.age >= (action.failedAt === undefined ? skill.end : action.failedAt + 12)) fighter.move = null;
  }

  strikeEffect(fighter, kind, span, slot, last) {
    const pose = motionAt(fighter, this.frame, MOVES);
    const height = 110 + clamp((pose.lift + pose.elevation) * .7 - pose.y * .30, -30, 52);
    this.effects.push({ type: 'strike', id: fighter.id, color: fighter.character.color, family: fighter.character.effect,
      kind, slot, x: fighter.x, span, y: GROUND - fighter.y - height, facing: fighter.facing, frame: this.frame,
      duration: last ? 24 : slot < 0 ? 11 : 15, last });
  }

  resolveContacts(contacts) {
    // Decide priority from the same pre-impact state on both sides. Equal classes trade.
    const stopped = new Map();
    for (const contact of contacts) {
      const { fighter, target, tactic } = contact;
      if (!tactic || contact.blocked) continue;
      const defending = windup(target);
      contact.counter = fighter.move?.counterReady || advantage(tactic, defending?.tactic, target.y > 12);
      if (contact.counter || !defending || defending.remaining > 5) continue;
      const reply = advantage(defending.tactic, tactic, fighter.y > 12);
      const gap = target.facing * (fighter.x - target.x);
      const height = defending.tactic === 'antiAir' ? 176 : 96;
      if (reply && gap > 0 && gap <= defending.reach && Math.abs(fighter.y - target.y) <= height) {
        stopped.set(contact, reply);
      }
    }
    for (const [contact, reply] of stopped) {
      const { fighter, target } = contact;
      target.move.counterReady = reply;
      if (fighter.move?.skill) fighter.signatureBanner.result = '被克制';
      fighter.move = null;
      fighter.pending = null;
      fighter.stun = 6;
      fighter.pose = 'hurt';
    }
    for (const contact of contacts) {
      if (!stopped.has(contact)) this.land(contact);
    }
  }

  separate(first, second) {
    if (Math.abs(first.y - second.y) > 95) return;
    const [left, right] = first.x < second.x ? [first, second] : [second, first];
    const gap = 94;
    const overlap = gap - (right.x - left.x);
    if (overlap <= 0) return;
    left.x = clamp(left.x - overlap / 2, 71, WIDTH - 71 - gap);
    right.x = left.x + gap;
  }

  land({ fighter, target, move, blocked, action, skill, beat, counter, last = false }) {
    const guardBreak = move.breaker && target.guard;
    const damage = blocked ? 0 : Math.round(move.damage * fighter.character.weight * (counter ? 1.25 : 1));
    if (counter || guardBreak) {
      fighter.counterBanner = { name: counter || '破防', until: this.frame + 49 };
      this.effects.push({ type: 'counter', text: fighter.counterBanner.name, x: target.x, y: GROUND - target.y - 185,
        frame: this.frame, duration: 38, id: fighter.id, color: fighter.character.color });
      this.onEvent('counter', { id: fighter.id, weapon: fighter.character.weapon });
    }
    if (action && !blocked) {
      action.confirmed = true;
      fighter.signatureBanner.hits++;
      this.onEvent('signatureHit', { id: fighter.id, skill, beat, last, weapon: fighter.character.weapon });
    }
    if (action && blocked) { action.failedAt = action.age; fighter.signatureBanner.result = '被防住'; }
    if (target.move?.skill && target.signatureBanner) target.signatureBanner.result = '被打断';
    target.hp = Math.max(0, target.hp - damage);
    target.stun = blocked ? 8 : move.stun + (counter ? 5 : 0);
    target.pose = blocked ? 'guard' : 'hurt';
    target.move = null;
    target.pending = null;
    target.commandHistory.length = 0;
    target.flash = blocked ? 4 : 9;
    target.x = clamp(target.x + fighter.facing * (blocked ? 10 : move.push ?? 27), 71, WIDTH - 71);
    fighter.energy = Math.min(100, fighter.energy + (skill ? (last ? 7 : 1) : blocked ? 2 : 8));
    target.energy = Math.min(100, target.energy + (skill ? 2 : 5));
    if (!blocked) {
      fighter.combo++;
      fighter.comboTimer = 54;
    }
    this.effects.push({ x: target.x, y: GROUND - target.y - 100, frame: this.frame, duration: 22,
      id: fighter.id, color: fighter.character.color, blocked, last });
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
    this.nextSignature = 240;
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
    else if (level > 1 && fight.frame >= this.nextSignature && gap < 365 && !human.guard) {
      const slot = gap < 122 ? 0 : level === 3 && cpu.energy >= cpu.character.signatures[2].cost && gap < 248 ? 2 : 1;
      this.nextSignature = fight.frame + (level === 2 ? 295 : 210);
      fight.requestSignature(1, slot);
      this.intent = [];
    } else if (level === 3 && gap < 140 && human.y > 15) this.intent = [PORT.D];
    else if (level === 3 && gap < 128 && windup(human)) {
      const response = { break: PORT.A, quick: PORT.B, charge: PORT.C }[windup(human).tactic];
      this.intent = response === undefined ? [away] : [response];
    } else if (level > 1 && human.move && gap < 155 && human.move.id !== 'C') this.intent = [away];
    else if (gap > 145) this.intent = [toward];
    else {
      const choice = Math.floor(fight.frame / 13) % 6;
      const attack = choice < 2 && gap < 100 ? PORT.A : choice === 3 ? PORT.C : gap > 117 ? PORT.D : PORT.B;
      this.intent = this.intent.includes(attack) ? [] : [attack];
    }
    return this.intent;
  }
}
