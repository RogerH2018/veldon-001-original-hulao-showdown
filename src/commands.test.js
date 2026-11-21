import test from 'node:test';
import assert from 'node:assert/strict';
import { Fight, MOVES } from './fight.js?v=5';
import { ROSTER } from './roster.js?v=5';
import { MODEL_SCALE, motionAt } from './motion.js?v=5';
import { skeleton } from './fighter-render.js?v=5';
import {
  CONTROL_NAMES,
  DEFAULT_BINDINGS,
  DEFAULT_MACROS,
  OLD_DEFAULTS,
  MacroPlayer,
  PORT,
  describeCombo,
} from './input.js?v=5';
import { migrateSettings } from './settings.js?v=5';

function ready(character, side, onEvent) {
  const ids = [ROSTER[0].id, ROSTER[1].id];
  ids[side] = character.id;
  const fight = new Fight(onEvent, ids);
  fight.start();
  while (fight.phase === 'intro') fight.step();
  fight.fighters[0].x = 525;
  fight.fighters[1].x = 622;
  return fight;
}

test('all 300 input recipes work with absolute directions on each side, even during a preceding attack', () => {
  for (const c of ROSTER)
    for (const skill of c.signatures)
      for (const side of [0, 1]) {
        const fight = ready(c, side);
        assert.equal(skill.commandText, skill.command.map((key) => CONTROL_NAMES[key]).join(' → '));
        for (const key of skill.command) {
          fight.step();
          const input = [[], []];
          input[side] = [PORT[key]];
          fight.step(input);
        }
        const fighter = fight.fighters[side];
        assert.equal(fighter.move?.skill?.name, skill.name, c.name + ' ' + skill.name);
        for (let i = 0; i < skill.steps[0].at; i++) fight.step();
        assert.equal(fighter.signatureBanner.hits, 1, c.name + skill.name + ' opening');
      }
});

test('ordered sub-frame taps, input timeouts and insufficient energy resolve through the fight loop', () => {
  const c = ROSTER[1],
    [first, , finisher] = c.signatures;
  const fight = ready(c, 0);
  fight.step([[], []], [first.command, []]);
  assert.equal(fight.fighters[0].move.skill.name, first.name);
  const slow = ready(c, 0);
  slow.step([[], []], [[first.command[0]], []]);
  for (let i = 0; i < 31; i++) slow.step();
  slow.step([[], []], [first.command.slice(1), []]);
  assert.equal(slow.fighters[0].move?.skill, undefined);
  const tired = ready(c, 1);
  tired.fighters[1].energy = 0;
  tired.step([[], []], [[], finisher.command]);
  assert.equal(tired.fighters[1].move?.skill, undefined);
  assert.match(tired.fighters[1].inputNotice.text, /能量不足/);
});

test('eight-control macros wait for long recoveries and can play two complete signature recipes back-to-back', () => {
  const c = ROSTER[1],
    swings = [],
    signatures = [];
  const fight = ready(c, 0, (event, data) => {
    if (event === 'swing') swings.push(data.kind);
    if (event === 'signature') signatures.push(data.skill.name);
  });
  const macro = new MacroPlayer(),
    actor = fight.fighters[0];
  const run = (sequence) => {
    assert.equal(macro.start({ sequence, gap: 16 }, 1, c), true);
    let frame = 0;
    while (macro.pulses.length && frame++ < 700) {
      const buttons = macro.advance(actor);
      fight.step([buttons, []], [[...(macro.pressed ? [macro.pressed] : [])], []]);
    }
    assert.ok(frame < 700);
  };
  run('重破 上挑 上挑 快击');
  assert.deepEqual(
    swings,
    ['C', 'D', 'D', 'A'].map((id) => c.techniques[id].kind)
  );
  actor.move = null;
  actor.commandHistory.length = 0;
  const both = c.signatures.slice(0, 2);
  run(both.map((s) => s.commandText).join(' → '));
  assert.deepEqual(
    signatures,
    both.map((s) => s.name)
  );
});

test('every general has a distinct four-move score and individually choreographed multi-beat signature tracks', () => {
  const sets = new Set(),
    signatures = new Set(),
    names = new Set();
  for (const c of ROSTER) {
    const normals = ['A', 'B', 'C', 'D'].map((id) => c.techniques[id]);
    for (const t of normals) names.add(t.name);
    sets.add(normals.map((t) => t.kind + t.footwork).join('/'));
    for (const s of c.signatures) signatures.add(s.steps.map((b) => b.kind + b.footwork).join('/'));
    const actor = { character: c, pose: 'idle', y: 0 };
    const tracks = [
      { id: null, end: 0 },
      ...Object.entries(MOVES).map(([id, m]) => ({ id, end: m.end })),
      ...c.signatures.map((skill) => ({ id: 'signature', skill, end: skill.end })),
    ];
    for (const { id, skill, end } of tracks)
      for (let age = 0; age <= end; age++) {
        const move = id ? { id, skill, age } : null;
        const rig = skeleton(c, motionAt({ ...actor, move }, age, MOVES));
        const [back, front] = rig.hands;
        assert.ok(
          Math.hypot(front.x - back.x, front.y - back.y) >= 18,
          c.name + ' ' + (id ?? 'idle') + ' wrists at ' + age
        );
        const span = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
        for (const arm of rig.arms) {
          assert.ok(Math.abs(span(arm.from, arm.elbow) - 26 * rig.bulk) < 0.01);
          assert.ok(Math.abs(span(arm.elbow, arm.wrist) - 24 * rig.bulk) < 0.01);
        }
        for (const leg of rig.legs) {
          assert.ok(leg.foot.y <= 0.001);
          assert.ok(Math.abs(span(leg.from, leg.knee) - 31 * rig.bulk) < 0.01);
          assert.ok(Math.abs(span(leg.knee, leg.ankle) - 26 * rig.bulk) < 0.01);
        }
      }
  }
  assert.equal(names.size, 400);
  assert.equal(sets.size, 100);
  assert.equal(signatures.size, 300);
});

test('old default scores migrate and edited legacy timing, bindings and chords survive intact', () => {
  const saved = {
    roster: [],
    bindings: structuredClone(DEFAULT_BINDINGS),
    macros: structuredClone(DEFAULT_MACROS),
  };
  for (const slots of saved.macros)
    for (const [i, m] of slots.entries()) {
      delete m.source;
      m.sequence = OLD_DEFAULTS[i];
    }
  const custom = saved.macros[1][1];
  custom.sequence = 'A W8 236AC';
  custom.gap = 21;
  const current = migrateSettings(saved);
  assert.equal(current.macros[0][0].source, 'signature');
  assert.equal(current.macros[1][1].sequence, 'A W8 236AC');
  assert.equal(current.macros[1][1].gap, 21);
  assert.equal(current.macros[1][1].source, 'custom');
  assert.equal(describeCombo(custom.sequence), '快击 → 等待 8 帧 → 下 → 下+前 → 前+快击+重破');
});

test('the planted foot stays in place while advancing and retreating on either side; jumps settle on both soles', () => {
  for (const side of [0, 1])
    for (const direction of ['left', 'right']) {
      const match = ready(ROSTER[1], side),
        actor = match.fighters[side];
      match.fighters[0].x = 330;
      match.fighters[1].x = 870;
      const input = [[], []];
      input[side] = [PORT[direction]];
      let previous,
        lockedFrames = 0;
      for (let i = 0; i < 48; i++) {
        match.step(input);
        const model = skeleton(actor.character, motionAt(actor, match.frame, MOVES));
        const soles = model.legs.map((l) => ({
          x: actor.x + actor.facing * MODEL_SCALE * l.foot.x,
          y: l.foot.y,
        }));
        if (previous && actor.walkBlend === 1)
          soles.forEach((sole, j) => {
            if (Math.abs(sole.y) < 1e-6 && Math.abs(previous[j].y) < 1e-6) {
              assert.ok(Math.abs(sole.x - previous[j].x) < 0.001);
              lockedFrames++;
            }
          });
        previous = actor.walkBlend === 1 ? soles : null;
      }
      assert.ok(lockedFrames > 20);
      input[side] = [PORT.up];
      match.step(input);
      match.step();
      assert.ok(actor.y > 0);
      while (actor.y > 0) match.step();
      assert.equal(actor.landingFrames, 8);
      const grounded = skeleton(actor.character, motionAt(actor, match.frame, MOVES));
      assert.ok(grounded.legs.every((l) => Math.abs(l.foot.y) < 0.001));
    }
});
