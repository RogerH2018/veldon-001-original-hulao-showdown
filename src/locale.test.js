import test from 'node:test';
import assert from 'node:assert/strict';
import { ROSTER } from './roster.js?v=5';
import {
  actionName,
  commandName,
  familyName,
  fighterName,
  moveName,
  preferredLanguage,
  setLanguage,
  sideName,
  styleName,
} from './locale.js?v=5';
import { ACTIONS, compileCombo, describeCombo, keyName } from './input.js?v=5';

test('explicit link, saved selection and browser languages have predictable precedence', () => {
  assert.equal(preferredLanguage('en', 'zh', ['zh-HK']), 'en');
  assert.equal(preferredLanguage(null, 'zh', ['en-GB']), 'zh');
  assert.equal(preferredLanguage('invalid', 'de', ['fr', 'zh-TW', 'en']), 'zh');
  assert.equal(preferredLanguage(null, null, ['fr']), 'en');
  assert.equal(sideName(0, 'en'), 'P1');
  assert.equal(sideName(1, 'zh'), '2P');
});

test('both languages cover every fighter, weapon, basic attack, signature and four-step recipe', () => {
  for (const c of ROSTER) {
    const terms = [fighterName(c, 'en'), familyName(c, 'en'), styleName(c, 'en')];
    for (const id of ['A', 'B', 'C', 'D']) terms.push(moveName(c, c.techniques[id].name, 'en'));
    for (const skill of c.signatures) {
      terms.push(moveName(c, skill.name, 'en'), commandName(skill, 'en'));
      assert.equal(commandName(skill, 'zh'), skill.commandText);
      assert.deepEqual(compileCombo(commandName(skill, 'en'), -1), compileCombo(skill.commandText, -1));
    }
    assert.equal(fighterName(c, 'zh'), c.name);
    for (const term of terms) {
      assert.equal(typeof term, 'string', c.name);
      assert.match(term, /[A-Za-z]/);
      assert.doesNotMatch(term, /\p{Script=Han}/u);
    }
  }
});

test('the same stored command and legacy chord re-label without changing playback', () => {
  for (const id of ACTIONS) {
    assert.deepEqual(compileCombo(actionName(id, 'zh'), 1), compileCombo(actionName(id, 'en'), 1));
  }
  assert.equal(describeCombo('左 快击 下 快击', 'en'), 'Left → Jab → Down → Jab');
  assert.equal(
    describeCombo('A W8 236AC', 'en'),
    'Jab → Wait 8 frames → Down → Down+Forward → Forward+Jab+Break'
  );
  try {
    setLanguage('en');
    assert.equal(keyName('ShiftLeft'), 'Left Shift');
    assert.throws(() => compileCombo('W90', 1), /wait/i);
  } finally {
    setLanguage('zh');
  }
});
