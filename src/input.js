import { CONTROL_NAMES, actionName, t } from './locale.js?v=5';
export { CONTROL_NAMES };
// Stable port numbers also keep previously saved keyboard macros playable.
export const PORT = { A: 0, B: 8, C: 1, D: 9, up: 4, down: 5, left: 6, right: 7 };
export const ACTIONS = ['up', 'left', 'down', 'right', 'A', 'B', 'C', 'D'];
export const DEFAULT_BINDINGS = [
  { up: 'KeyW', left: 'KeyA', down: 'KeyS', right: 'KeyD', A: 'KeyJ', B: 'KeyK', C: 'KeyU', D: 'KeyI' },
  {
    up: 'ArrowUp',
    left: 'ArrowLeft',
    down: 'ArrowDown',
    right: 'ArrowRight',
    A: 'Digit1',
    B: 'Digit2',
    C: 'Digit4',
    D: 'Digit5',
  },
];
export const EDITOR_ACTIONS = ['up', 'down', 'left', 'right', 'A', 'C', 'B', 'D'];
const actionByName = new Map();
for (const [id, name] of Object.entries(CONTROL_NAMES)) {
  actionByName.set(name, id);
  actionByName.set(actionName(id, 'en').toLowerCase(), id);
}
export const OLD_DEFAULTS = ['A W8 236A', '214B', '236D'];

export const DEFAULT_MACROS = [
  ['KeyL', 'KeyO', 'KeyP'],
  ['Digit3', 'Digit6', 'Digit9'],
].map((keys) =>
  keys.map((key, index) => ({
    key,
    source: 'signature',
    name: ['近身快击', '追阵突进', '破阵绝技'][index],
    sequence: ['快击 右 突进', '下 重破 上挑', '左 快击 右 上挑'][index],
    gap: 16,
  }))
);

const directions = {
  1: ['down', 'left'],
  2: ['down'],
  3: ['down', 'right'],
  4: ['left'],
  5: [],
  6: ['right'],
  7: ['up', 'left'],
  8: ['up'],
  9: ['up', 'right'],
};

export function namedActions(sequence) {
  const words = sequence
    .trim()
    .split(/[\s,，、→]+/u)
    .filter(Boolean);
  const keys = words.map(word => actionByName.get(word.toLowerCase()));
  return keys.length && keys.every(Boolean) ? keys : null;
}

export function describeCombo(sequence, lang) {
  const named = namedActions(sequence);
  if (named) return named.map((key) => actionName(key, lang)).join(' → ');
  const dirs = ['', '下+后', '下', '下+前', '后', '回中', '前', '上+后', '上', '上+前'];
  const parts = [];
  for (const token of sequence
    .trim()
    .toUpperCase()
    .split(/[\s,，→]+/)) {
    if (/^W\d+$/.test(token)) {
      parts.push(t('等待 {n} 帧',{n:Number(token.slice(1))},lang));
      continue;
    }
    const m = token.match(/^([1-9]*)([ABCD]+)$/);
    if (!m) return sequence;
    const keys = [...m[1]].map((d) => t(dirs[Number(d)],{},lang));
    const attacks = [...m[2]].map((key) => actionName(key, lang)).join('+');
    if (keys.length) keys[keys.length - 1] += '+' + attacks;
    else keys.push(attacks);
    parts.push(...keys);
  }
  return parts.join(' → ');
}

export function compileCombo(sequence, facing, gap = 16) {
  const tokens = sequence
    .toUpperCase()
    .trim()
    .split(/[\s,，→]+/)
    .filter(Boolean);
  if (tokens.length < 1 || tokens.length > 20) throw new Error(t('连招需要 1 至 20 段指令'));
  if (!Number.isInteger(gap) || gap < 6 || gap > 30) throw new Error(t('默认间隔须为 6 至 30 帧'));
  const named = namedActions(sequence);
  if (named)
    return named.flatMap((action) => [
      { buttons: [PORT[action]], frames: action.length === 1 ? 1 : 4, action },
      { buttons: [], frames: 2 },
    ]);
  const toPorts = (digit) =>
    directions[digit].map((action) => {
      if (facing < 0 && action === 'left') return PORT.right;
      if (facing < 0 && action === 'right') return PORT.left;
      return PORT[action];
    });
  const result = [];

  for (const token of tokens) {
    if (/^W\d{1,2}$/.test(token)) {
      const frames = Number(token.slice(1));
      if (frames < 1 || frames > 60) throw new Error(t('等待帧数必须在 1–60 之间'));
      result.push({ buttons: [], frames });
      continue;
    }
    const match = token.match(/^([1-9]{0,12})([ABCD]{1,4})$/);
    if (!match) throw new Error(t('无法识别指令「{token}」，请用上下左右和四种招式编排',{token}));
    const [, motion, attack] = match;
    for (const digit of motion.slice(0, -1)) result.push({ buttons: toPorts(digit), frames: 3 });
    const buttons = [...new Set([...attack].map((action) => PORT[action]))];
    result.push({ buttons: [...(motion ? toPorts(motion.at(-1)) : []), ...buttons], frames: 4 });
    result.push({ buttons: [], frames: gap });
  }
  return result;
}

export function normalizeKey(event) {
  let code =
    event.code ||
    (/^[a-z]$/i.test(event.key)
      ? 'Key' + event.key.toUpperCase()
      : /^\d$/.test(event.key)
        ? 'Digit' + event.key
        : event.key === ' '
          ? 'Space'
          : event.key);
  if (/^Numpad\d$/.test(code)) code = 'Digit' + code.at(-1);
  return code;
}

export function keyName(code) {
  const names = {
    ArrowUp: '↑',
    ArrowDown: '↓',
    ArrowLeft: '←',
    ArrowRight: '→',
    Space: '空格',
    ShiftLeft: '左 Shift',
    ShiftRight: '右 Shift',
  };
  return names[code] ? t(names[code]) : code.replace(/^(Key|Digit)/, '');
}

export class MacroPlayer {
  constructor() {
    this.cancel();
  }
  start(macro, facing, character) {
    if (this.pulses.length) return false;
    this.pulses = compileCombo(macro.sequence, facing, macro.gap);
    const named = this.pulses.filter((pulse) => pulse.action);
    // Inside an authored command, the follow-up keys are an intentional attack cancel.
    for (let i = 0; i < named.length; i++) {
      const match = character?.signatures.find((skill) =>
        skill.command.every((key, j) => named[i + j]?.action === key)
      );
      if (match) {
        named[i].beginsCommand = true;
        for (let j = 1; j < match.command.length; j++) named[i + j].link = true;
        i += match.command.length - 1;
      }
    }
    this.remaining = this.pulses[0].frames;
    return true;
  }
  advance(fighter) {
    this.pressed = null;
    if (!this.pulses.length) return [];
    const pulse = this.pulses[0];
    if (pulse.action && this.remaining === pulse.frames) {
      if (
        fighter?.stun ||
        (pulse.beginsCommand && fighter?.move?.skill) ||
        (!pulse.link && fighter?.move && pulse.action.length === 1)
      )
        return [];
      this.pressed = pulse.action;
    }
    if (--this.remaining === 0) {
      this.pulses.shift();
      this.remaining = this.pulses[0]?.frames ?? 0;
    }
    return pulse.buttons;
  }
  cancel() {
    this.pulses = [];
    this.remaining = 0;
    this.pressed = null;
  }
}
