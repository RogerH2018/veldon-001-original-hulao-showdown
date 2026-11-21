import { actionName, commandName, fighterName, moveName, sideName, t } from './locale.js?v=5';
import { ACTIONS, DEFAULT_BINDINGS, DEFAULT_MACROS, OLD_DEFAULTS, CONTROL_NAMES, EDITOR_ACTIONS, namedActions, describeCombo, compileCombo, keyName, normalizeKey } from './input.js?v=5';
import { DEFAULT_ROSTER, findFighter } from './roster.js?v=5';

const $ = selector => document.querySelector(selector);
const storageKey = 'veldon.hulao.v1';
const legacyMacroNames = ['迎潮', '回流', '放电'];
const reserved = new Set(['Escape', 'Enter', 'Tab', 'MetaLeft', 'MetaRight', 'AltLeft', 'AltRight', 'ControlLeft', 'ControlRight']);
export const labels = CONTROL_NAMES;
export const macroName = macro => DEFAULT_MACROS[0].some(slot => slot.name === macro.name) ? t(macro.name) : macro.name;
const defaults = () => ({
  mode: 'cpu', difficulty: 2, sound: true,
  roster: [...DEFAULT_ROSTER],
  bindings: structuredClone(DEFAULT_BINDINGS), macros: structuredClone(DEFAULT_MACROS),
});

export function validateSettings(config) {
  if (!['cpu', 'local'].includes(config.mode) || ![1, 2, 3].includes(config.difficulty) || typeof config.sound !== 'boolean') {
    throw new Error(t('对战设置无效'));
  }
  if (config.bindings.length !== 2 || config.macros.length !== 2) throw new Error(t('需要两位玩家的设置'));
  if (config.roster.length !== 2 || !config.roster.every(findFighter)) throw new Error(t('对战角色无效'));
  const used = new Set();
  const bind = (key, id) => {
    if (typeof key !== 'string' || !key || reserved.has(key) || used.has(key)) {
      throw new Error(t('{side} 的按键重复或不可用：{key}', {side:sideName(id-1),key:keyName(String(key ?? ''))}));
    }
    used.add(key);
  };
  config.bindings.forEach((bindings, player) => {
    for (const action of ACTIONS) bind(bindings[action], player + 1);
    if (config.macros[player].length !== 3) throw new Error(t('每位玩家需要三个连招槽'));
    config.macros[player].forEach((macro, slot) => {
      bind(macro.key, player + 1);
      if (!['signature', 'custom'].includes(macro.source)) throw new Error(t('连招来源无效'));
      if (typeof macro.name !== 'string' || macro.name.trim().length < 1 || macro.name.length > 20) {
        throw new Error(t('{side} 连招 {n} 的名称须为 1 至 20 字',{side:sideName(player),n:slot+1}));
      }
      if (typeof macro.sequence !== 'string' || macro.sequence.length > 160) throw new Error(t('连招指令须在 160 字符以内'));
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
      slot.source = renamed || ![previous.sequence, OLD_DEFAULTS[index]].includes(slot.sequence) || slot.gap !== previous.gap ? 'custom' : 'signature';
    }
    if (slot.source === 'signature') {
      if (slot.name === legacyMacroNames[index]) slot.name = previous.name;
      if (slot.sequence === OLD_DEFAULTS[index]) slot.sequence = previous.sequence;
    }
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
      + sideName(index) + ' ' + fighterName(fighter) + '</button>').join('');
    $('#settings-players').innerHTML = fighters.map((fighter, index) => '<section class="settings-pane" data-pane="' + index
      + '"><h3>' + t('方向与攻击') + '</h3><div class="binding-grid">'
      + ACTIONS.map(action => '<label>' + actionName(action) + ' <button type="button" data-field="binding" data-value="' + action + '"></button></label>').join('')
      + '</div><h3>' + t('快捷连招') + '</h3><p class="hint">' + t('选「自定义」后，按实际出招顺序点方向和招式。同一方向可以连点，左右以屏幕为准。') + '</p>'
      + draft.macros[index].map((_, i) => '<div class="macro-row" data-row="'+i+'"><label>' + t('快捷键') + ' <button type="button" data-field="key" data-value="'+i
        +'"></button></label><label>' + t('招式来源') + ' <select data-prop="source"><option value="signature">'+moveName(fighter,fighter.signatures[i].name)
        +'</option><option value="custom">' + t('自定义') + '</option></select></label><label data-custom-name>' + t('名称') + ' <input maxlength="20" data-prop="name"></label>'
        +'<output class="command-line" aria-live="polite"></output><div class="command-tools" aria-label="' + t('编排连招') + '">'
        +EDITOR_ACTIONS.map(key => '<button type="button" data-add="'+key+'">'+actionName(key)+'</button>').join('')
        +'<button type="button" data-undo>' + t('撤销') + '</button><button type="button" data-clear>' + t('清空') + '</button></div>'
        +'<button class="rewrite-command" type="button" data-rewrite>' + t('重新编排') + '</button></div>').join('') + '</section>').join('');
    dialog.querySelectorAll('[data-pane]').forEach(pane => {
      const player = Number(pane.dataset.pane);
      pane.querySelectorAll('button[data-field]').forEach(button => {
        const field = { player, ...button.dataset, button };
        button.textContent = keyName(keyFor(field));
        button.onclick = () => {
          stopRecording();
          recording = field;
          button.textContent = t('请按键');
          button.setAttribute('aria-pressed', 'true');
        };
      });
      pane.querySelectorAll('[data-row]').forEach(row => {
        const i=Number(row.dataset.row), slot=draft.macros[player][i], skill=fighters[player].signatures[i];
        const source=row.querySelector('select'), name=row.querySelector('input');
        const output=row.querySelector('output'), tools=row.querySelector('.command-tools'), rewrite=row.querySelector('[data-rewrite]');
        source.value=slot.source;
        name.value=macroName(slot);
        name.oninput=()=>{ slot.name=name.value; };
        function showCommand() {
          const custom=slot.source==='custom', legacy=!!slot.sequence && !namedActions(slot.sequence);
          row.querySelector('[data-custom-name]').hidden=!custom;
          tools.hidden=!custom || legacy;
          rewrite.hidden=!custom || !legacy;
          output.textContent=custom ? (slot.sequence ? describeCombo(slot.sequence) : t('点一个方向或招式开始'))
            + (legacy ? t('（旧编排，段间 {n} 帧）',{n:slot.gap}) : '') : commandName(skill);
          row.querySelector('[data-undo]').disabled=row.querySelector('[data-clear]').disabled=!slot.sequence;
        }
        source.onchange=()=>{
          slot.source=source.value;
          if (slot.source==='signature' && !slot.sequence) slot.sequence=DEFAULT_MACROS[player][i].sequence;
          showCommand();
        };
        rewrite.onclick=()=>{ slot.sequence=''; showCommand(); tools.querySelector('button').focus(); };
        tools.onclick=event=>{
          const button=event.target.closest('button');
          if (!button) return;
          let keys=namedActions(slot.sequence) ?? [];
          if (button.hasAttribute('data-clear')) keys=[];
          else if (button.hasAttribute('data-undo')) keys.pop();
          else if (keys.length<20) keys.push(button.dataset.add);
          else { feedback(t('一套自定义连招最多 20 步。')); return; }
          slot.sequence=keys.map(key=>labels[key]).join(' ');
          feedback(''); showCommand();
        };
        showCommand();
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
      feedback(t('请选择字母、数字或其他未占用的按键。'));
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
    feedback(t('已恢复默认键位，保存后生效。'));
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
  return () => {
    if (dialog.open) { stopRecording(); feedback(''); renderForm(); }
  };
}
