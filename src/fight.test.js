import test from 'node:test';
import assert from 'node:assert/strict';
import { compileCombo, DEFAULT_BINDINGS, DEFAULT_MACROS, MacroPlayer, normalizeKey, PORT } from './input.js';
import { Fight, MOVES, Opponent } from './fight.js';
import { DEFAULT_ROSTER, ROSTER } from './roster.js';
import { migrateSettings, validateSettings } from './settings.js';

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

test('100 selectable fighters each have three named and mechanically distinct signatures', () => {
  assert.equal(ROSTER.length, 100);
  assert.equal(new Set(ROSTER.map(character => character.id)).size, 100);
  assert.equal(new Set(ROSTER.flatMap(character => character.signatures.map(skill => skill.name))).size, 300);
  assert.equal(new Set(ROSTER.map(character => character.team + ':' + character.index)).size, 100);
  for (const character of ROSTER) {
    assert.equal(character.signatures.length, 3);
    assert.deepEqual(character.signatures.map(skill => skill.slot), [0, 1, 2]);
    assert.equal(new Set(character.signatures.map(skill => skill.steps.map(beat => beat.kind).join(','))).size, 3);
  }
});

test('all 300 signatures hit at the intended ranges on both sides of the arena', () => {
  for (const character of ROSTER) {
    for (const skill of character.signatures) {
      for (const player of [0, 1]) {
        const selection = [...DEFAULT_ROSTER];
        selection[player] = character.id;
        const hits = [];
        const fight = new Fight((event, data) => { if (event === 'signatureHit') hits.push(data); }, selection);
        fight.start();
        advance(fight, 85);
        const attacker = fight.fighters[player];
        const target = fight.fighters[1 - player];
        target.x = attacker.x + attacker.facing * [108, 398, 285][skill.slot];
        assert.equal(fight.requestSignature(player, skill.slot), 'started', skill.name);
        advance(fight, skill.end + 1);
        assert.equal(hits.length, skill.steps.length, skill.name + ' 1P/2P: ' + player);
        assert.equal(target.hp, 100 - skill.steps.reduce((sum, beat) => sum + Math.round(beat.damage * character.weight), 0), skill.name);
        assert.equal(hits.at(-1).last, true);
        assert.equal(attacker.move, null);
      }
    }
  }
});

test('a missed or guarded opener does not make later hits connect', () => {
  const far = ready();
  assert.equal(far.requestSignature(0, 0), 'started');
  advance(far, 80);
  assert.equal(far.fighters[1].hp, 100);

  const guarded = ready();
  guarded.fighters[1].x = guarded.fighters[0].x + 95;
  assert.equal(guarded.requestSignature(0, 0), 'started');
  advance(guarded, 60, [], [PORT.down]);
  assert.equal(guarded.fighters[1].hp, 100);
  assert.equal(guarded.fighters[0].signatureBanner.hits, 0);
});

test('an interrupted signature stops before its next strike', () => {
  const fight = ready();
  fight.fighters[1].x = fight.fighters[0].x + 92;
  assert.equal(fight.requestSignature(0, 2), 'started');
  advance(fight, 22, [], [PORT.A]);
  assert.equal(fight.fighters[0].move, null);
  assert.equal(fight.fighters[1].hp, 100);
});

test('selection persists across rounds and finishers require energy', () => {
  const fight = new Fight(undefined, [ROSTER[76].id, ROSTER[99].id]);
  fight.start();
  advance(fight, 85);
  assert.strictEqual(fight.fighters[0].character, ROSTER[76]);
  assert.strictEqual(fight.fighters[1].character, ROSTER[99]);
  fight.fighters[0].energy = 0;
  assert.equal(fight.requestSignature(0, 2), 'energy');
  fight.fighters[1].hp = 0;
  advance(fight, 116);
  assert.strictEqual(fight.fighters[1].character, ROSTER[99]);
});

test('saved shortcuts upgrade without overwriting custom commands or key bindings', () => {
  const legacy = { mode: 'local', difficulty: 1, sound: false, bindings: structuredClone(DEFAULT_BINDINGS), macros: structuredClone(DEFAULT_MACROS) };
  legacy.macros.flat().forEach(macro => { delete macro.source; });
  legacy.macros[0][0].key = 'KeyQ';
  legacy.macros[0][1].sequence = 'A W14 236A';
  const migrated = migrateSettings(legacy);
  validateSettings(migrated);
  assert.deepEqual(migrated.roster, DEFAULT_ROSTER);
  assert.equal(migrated.macros[0][0].source, 'signature');
  assert.equal(migrated.macros[0][0].key, 'KeyQ');
  assert.equal(migrated.macros[0][1].source, 'custom');
  assert.equal(migrated.macros[0][1].sequence, 'A W14 236A');
});
