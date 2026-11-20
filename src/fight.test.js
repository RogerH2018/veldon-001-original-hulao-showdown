import test from 'node:test';
import assert from 'node:assert/strict';
import { compileCombo, MacroPlayer, normalizeKey, PORT } from './input.js';
import { Fight, MOVES, Opponent } from './fight.js';

function advance(fight, count, player = [], opponent = []) {
  for (let tick = 0; tick < count; tick++) fight.step([player, opponent]);
}

function ready() {
  const fight = new Fight();
  fight.start();
  advance(fight, 85);
  return fight;
}

test('macros keep facing-relative motion, waits, simultaneous attacks and numpad keys', () => {
  const pulses = compileCombo('236AC W12', -1, 9);
  assert.deepEqual(pulses[1].buttons, [PORT.down, PORT.left]);
  assert.deepEqual(pulses[2], { buttons: [PORT.left, PORT.A, PORT.C], frames: 4 });
  assert.deepEqual(pulses.at(-1), { buttons: [], frames: 12 });
  assert.equal(normalizeKey({ key: '2', code: 'Numpad2' }), 'Digit2');
  for (const invalid of ['', '236X', 'W00', 'W61', '0A']) assert.throws(() => compileCombo(invalid, 1));
});

test('a macro enters the same motion through the input ticks as manual controls', () => {
  const fight = ready();
  const macro = new MacroPlayer();
  assert.equal(macro.start({ sequence: '236A', gap: 16 }, 1), true);
  assert.equal(macro.start({ sequence: 'A' }, 1), false);
  for (let step = 0; step < 7; step++) fight.step([macro.advance(), []]);
  assert.equal(fight.fighters[0].move.id, 'dash');
  const manual = ready();
  manual.step([[PORT.down], []]);
  manual.step([[PORT.down, PORT.right], []]);
  manual.step([[PORT.right, PORT.A], []]);
  assert.equal(manual.fighters[0].move.id, 'dash');
});

test('guard stops a light hit, and a breaker lands', () => {
  const fight = ready();
  fight.fighters[0].x = 480;
  fight.fighters[1].x = 567;
  advance(fight, MOVES.A.active, [PORT.A], [PORT.down]);
  assert.equal(fight.fighters[1].hp, 100);
  advance(fight, 18);
  advance(fight, MOVES.C.active, [PORT.C], [PORT.down]);
  assert.ok(fight.fighters[1].hp < 100);
});

test('surge requires energy and travels across the arena', () => {
  const fight = ready();
  fight.fighters[0].energy = 45;
  fight.step([[PORT.down], []]);
  fight.step([[PORT.down, PORT.right], []]);
  fight.step([[PORT.right, PORT.D], []]);
  assert.equal(fight.fighters[0].move.id, 'surge');
  assert.equal(fight.fighters[0].energy, 5);
  advance(fight, 65);
  assert.ok(fight.fighters[1].hp < 100);
});

test('two rounds decide a match, followed by a clean rematch', () => {
  const fight = ready();
  for (let round = 0; round < 2; round++) {
    fight.fighters[1].hp = 0;
    advance(fight, 116);
    if (round === 0) advance(fight, 85);
  }
  assert.equal(fight.phase, 'matchEnd');
  assert.deepEqual(fight.fighters.map(fighter => fighter.wins), [2, 0]);
  fight.start();
  assert.deepEqual(fight.fighters.map(fighter => fighter.wins), [0, 0]);
});

test('CPU closes range and attacks', () => {
  const fight = ready();
  const cpu = new Opponent();
  for (let step = 0; step < 410; step++) fight.step([[], cpu.controls(fight, 2)]);
  assert.ok(fight.fighters[0].hp < 100);
});
