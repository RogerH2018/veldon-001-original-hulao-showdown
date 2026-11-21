import { ACTIONS, DEFAULT_BINDINGS, DEFAULT_MACROS, compileCombo, keyName, normalizeKey } from './input.js?v=3';
import { DEFAULT_ROSTER, findFighter } from './roster.js?v=3';

const $ = selector => document.querySelector(selector);
const storageKey = 'veldon.hulao.v1';
const legacyMacroNames = ['迎潮', '回流', '放电'];
const reserved = new Set(['Escape', 'Enter', 'Tab', 'MetaLeft', 'MetaRight', 'AltLeft', 'AltRight', 'ControlLeft', 'ControlRight']);
export const labels = { up: '上', left: '左', down: '下', right: '右', A: '快击', B: '突进', C: '重破', D: '上挑' };
const defaults = () => ({
  mode: 'cpu', difficulty: 2, sound: true,
  roster: [...DEFAULT_ROSTER],
  bindings: structuredClone(DEFAULT_BINDINGS), macros: structuredClone(DEFAULT_MACROS),
});

export function validateSettings(config) {
  if (!['cpu', 'local'].includes(config.mode) || ![1, 2, 3].includes(config.difficulty) || typeof config.sound !== 'boolean') {
    throw new Error('对战设置无效');
  }
  if (config.bindings.length !== 2 || config.macros.length !== 2) throw new Error('需要两位玩家的设置');
  if (config.roster.length !== 2 || !config.roster.every(findFighter)) throw new Error('对战角色无效');
  const used = new Set();
  const bind = (key, id) => {
    if (typeof key !== 'string' || !key || reserved.has(key) || used.has(key)) {
      throw new Error(id + 'P 的按键重复或不可用：' + keyName(String(key ?? '')));
    }
    used.add(key);
  };
  config.bindings.forEach((bindings, player) => {
    for (const action of ACTIONS) bind(bindings[action], player + 1);
    if (config.macros[player].length !== 3) throw new Error('每位玩家需要三个连招槽');
    config.macros[player].forEach((macro, slot) => {
      bind(macro.key, player + 1);
      if (!['signature', 'custom'].includes(macro.source)) throw new Error('连招来源无效');
      if (typeof macro.name !== 'string' || macro.name.trim().length < 1 || macro.name.length > 20) {
        throw new Error((player + 1) + 'P 连招 ' + (slot + 1) + ' 的名称须为 1 至 20 字');
      }
      if (typeof macro.sequence !== 'string' || macro.sequence.length > 160) throw new Error('连招指令须在 160 字符以内');
      compileCombo(macro.sequence, player ? -1 : 1, macro.gap);
    });
  });
}

export function loadSettings() {
  try {
    const saved = migrateSettings(JSON.parse(localStorage.getItem(storageKey) ?? localStorage.getItem('veldon.arc-harbor.v1')));
    validateSettings(saved);
    return saved;
  } catch {
    return defaults();
  }
}

export function migrateSettings(saved) {
  if (!saved) return defaults();
  saved.roster = DEFAULT_ROSTER.map((id, player) => findFighter(saved.roster?.[player])?.id ?? id);
  saved.macros.forEach((slots, player) => slots.forEach((slot, index) => {
    const previous = DEFAULT_MACROS[player][index];
    if (slot.source === undefined) {
      const renamed = ![previous.name, legacyMacroNames[index]].includes(slot.name);
      slot.source = renamed || slot.sequence !== previous.sequence || slot.gap !== previous.gap ? 'custom' : 'signature';
    }
    if (slot.source === 'signature' && slot.name === legacyMacroNames[index]) slot.name = previous.name;
  }));
  return saved;
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}

export function setupSettings(dialog, callbacks) {
  let draft;
  let selected = 0;
  let recording;
  const feedback = message => { $('#settings-error').textContent = message; };

  function keyFor({ player, field, value }) {
    return field === 'key' ? draft.macros[player][value].key : draft.bindings[player][value];
  }

  function stopRecording() {
    if (!recording) return;
    recording.button.textContent = keyName(keyFor(recording));
    recording.button.removeAttribute('aria-pressed');
    recording = null;
  }

  function showTab() {
    dialog.querySelectorAll('[data-tab]').forEach(button => button.setAttribute('aria-pressed', Number(button.dataset.tab) === selected));
    dialog.querySelectorAll('[data-pane]').forEach(pane => { pane.hidden = Number(pane.dataset.pane) !== selected; });
  }

  function renderForm() {
    const fighters = draft.roster.map(findFighter);
    $('#settings-tabs').innerHTML = fighters.map((fighter, index) => '<button type="button" data-tab="' + index + '">'
      + (index + 1) + 'P ' + fighter.name + '</button>').join('');
    $('#settings-players').innerHTML = fighters.map((fighter, index) => '<section class="settings-pane" data-pane="' + index
      + '"><h3>方向与攻击</h3><div class="binding-grid">'
      + ACTIONS.map(action => '<label>' + labels[action] + ' <button type="button" data-field="binding" data-value="' + action + '"></button></label>').join('')
      + '</div><h3>快捷连招</h3><p class="hint">默认使用专属技。切换到自定义时可编辑指令。A W8 236A 表示轻击、等待 8 帧，再冲刺。</p>'
      + draft.macros[index].map((slot, i) => '<div class="macro-row"><label>快捷键 <button type="button" data-field="key" data-value="' + i
        + '"></button></label><label>招式来源 <select data-slot="' + i + '" data-prop="source"><option value="signature">'
        + fighter.signatures[i].name + '</option><option value="custom">自定义</option></select></label>'
        + '<label>名称 <input maxlength="20" data-slot="' + i + '" data-prop="name"></label><label>指令 <input maxlength="160" data-slot="'
        + i + '" data-prop="sequence"></label><label>间隔帧 <input type="number" min="6" max="30" data-slot="' + i
        + '" data-prop="gap"></label></div>').join('') + '</section>').join('');
    dialog.querySelectorAll('[data-pane]').forEach(pane => {
      const player = Number(pane.dataset.pane);
      pane.querySelectorAll('button[data-field]').forEach(button => {
        const field = { player, ...button.dataset, button };
        button.textContent = keyName(keyFor(field));
        button.onclick = () => {
          stopRecording();
          recording = field;
          button.textContent = '请按键';
          button.setAttribute('aria-pressed', 'true');
        };
      });
      pane.querySelectorAll('input').forEach(input => {
        const { slot, prop } = input.dataset;
        input.value = draft.macros[player][slot][prop];
        input.oninput = () => { draft.macros[player][slot][prop] = prop === 'gap' ? Number(input.value) : input.value; };
      });
      pane.querySelectorAll('select[data-prop="source"]').forEach(select => {
        const { slot } = select.dataset;
        select.value = draft.macros[player][slot].source;
        const updateSource = () => {
          draft.macros[player][slot].source = select.value;
          select.closest('.macro-row').querySelectorAll('input').forEach(input => { input.disabled = select.value === 'signature'; });
        };
        select.onchange = updateSource;
        updateSource();
      });
    });
    dialog.querySelectorAll('[data-tab]').forEach(button => {
      button.onclick = () => {
        stopRecording();
        selected = Number(button.dataset.tab);
        showTab();
      };
    });
    showTab();
  }

  dialog.addEventListener('keydown', event => {
    if (!recording || event.target !== recording.button) return;
    const key = normalizeKey(event);
    if (key === 'Tab') {
      stopRecording();
      return;
    }
    event.preventDefault();
    if (key === 'Escape') {
      stopRecording();
      return;
    }
    if (reserved.has(key) || !key) {
      feedback('请选择字母、数字或其他未占用的按键。');
      return;
    }
    const { player, field, value } = recording;
    if (field === 'key') draft.macros[player][value].key = key;
    else draft.bindings[player][value] = key;
    stopRecording();
    feedback('');
  });
  $('#settings').onclick = () => {
    draft = structuredClone(callbacks.read());
    selected = 0;
    recording = null;
    callbacks.beforeOpen();
    feedback('');
    renderForm();
    dialog.showModal();
    callbacks.afterOpen();
  };
  $('#close-settings').onclick = () => dialog.close();
  dialog.addEventListener('close', () => {
    stopRecording();
    callbacks.afterClose();
  });
  $('#defaults').onclick = () => {
    const original = defaults();
    draft.bindings = original.bindings;
    draft.macros = original.macros;
    recording = null;
    renderForm();
    feedback('已恢复默认键位，保存后生效。');
  };
  $('#settings-form').onsubmit = event => {
    event.preventDefault();
    try {
      validateSettings(draft);
    } catch (error) {
      feedback(error.message);
      return;
    }
    callbacks.onSave(draft);
    dialog.close();
  };
}
