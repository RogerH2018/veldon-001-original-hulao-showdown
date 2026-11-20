// The original browser controls use this layout for portable combo sequences.
export const PORT = { A: 0, B: 8, C: 1, D: 9, up: 4, down: 5, left: 6, right: 7 };
export const ACTIONS = ['up', 'left', 'down', 'right', 'A', 'B', 'C', 'D'];
export const DEFAULT_BINDINGS = [
  { up: 'KeyW', left: 'KeyA', down: 'KeyS', right: 'KeyD', A: 'KeyJ', B: 'KeyK', C: 'KeyU', D: 'KeyI' },
  { up: 'ArrowUp', left: 'ArrowLeft', down: 'ArrowDown', right: 'ArrowRight', A: 'Digit1', B: 'Digit2', C: 'Digit4', D: 'Digit5' },
];
export const DEFAULT_MACROS = [
  ['KeyL', 'KeyO', 'KeyP'], ['Digit3', 'Digit6', 'Digit9'],
].map(keys => keys.map((key, index) => ({
  key, source: 'signature', name: ['迎潮', '回流', '放电'][index],
  sequence: ['A W8 236A', '214B', '236D'][index], gap: 16,
})));

const directions = {
  1: ['down', 'left'], 2: ['down'], 3: ['down', 'right'], 4: ['left'], 5: [],
  6: ['right'], 7: ['up', 'left'], 8: ['up'], 9: ['up', 'right'],
};

export function compileCombo(sequence, facing, gap = 16) {
  const tokens = sequence.toUpperCase().trim().split(/[\s,，→]+/).filter(Boolean);
  if (tokens.length < 1 || tokens.length > 20) throw new Error('连招需要 1 至 20 段指令');
  if (!Number.isInteger(gap) || gap < 6 || gap > 30) throw new Error('默认间隔须为 6 至 30 帧');
  const toPorts = digit => directions[digit].map(action => {
    if (facing < 0 && action === 'left') return PORT.right;
    if (facing < 0 && action === 'right') return PORT.left;
    return PORT[action];
  });
  const result = [];

  for (const token of tokens) {
    if (/^W\d{1,2}$/.test(token)) {
      const frames = Number(token.slice(1));
      if (frames < 1 || frames > 60) throw new Error('等待帧数必须在 1–60 之间');
      result.push({ buttons: [], frames });
      continue;
    }
    const match = token.match(/^([1-9]{0,12})([ABCD]{1,4})$/);
    if (!match) throw new Error('无法识别指令「' + token + '」，示例：A W8 236A');
    const [, motion, attack] = match;
    for (const digit of motion.slice(0, -1)) result.push({ buttons: toPorts(digit), frames: 3 });
    const buttons = [...new Set([...attack].map(action => PORT[action]))];
    result.push({ buttons: [...(motion ? toPorts(motion.at(-1)) : []), ...buttons], frames: 4 });
    result.push({ buttons: [], frames: gap });
  }
  return result;
}

export function normalizeKey(event) {
  let code = event.code || (/^[a-z]$/i.test(event.key) ? 'Key' + event.key.toUpperCase()
    : /^\d$/.test(event.key) ? 'Digit' + event.key : event.key === ' ' ? 'Space' : event.key);
  if (/^Numpad\d$/.test(code)) code = 'Digit' + code.at(-1);
  return code;
}

export function keyName(code) {
  const names = { ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Space: '空格', ShiftLeft: '左 Shift', ShiftRight: '右 Shift' };
  return names[code] ?? code.replace(/^(Key|Digit)/, '');
}

export class MacroPlayer {
  constructor() { this.cancel(); }
  start(macro, facing) {
    if (this.pulses.length) return false;
    this.pulses = compileCombo(macro.sequence, facing, macro.gap);
    this.remaining = this.pulses[0].frames;
    return true;
  }
  advance() {
    if (!this.pulses.length) return [];
    const buttons = this.pulses[0].buttons;
    if (--this.remaining === 0) {
      this.pulses.shift();
      this.remaining = this.pulses[0]?.frames ?? 0;
    }
    return buttons;
  }
  cancel() {
    this.pulses = [];
    this.remaining = 0;
  }
}
