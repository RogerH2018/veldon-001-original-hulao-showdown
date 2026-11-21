import { actionName, bindPageLanguage, fighterName, language, localeKey, moveName, preferredLanguage, setLanguage, sideName, skillDetail, styleName, t } from './locale.js?v=5';
import { Fight, Opponent, ROUND_SECONDS, TICKS } from './fight.js?v=5';
import { ACTIONS, MacroPlayer, PORT, keyName, normalizeKey } from './input.js?v=5';
import { createRenderer, preloadStage } from './render.js?v=5';
import { FightSound } from './sound.js?v=5';
import { loadSettings, saveSettings, setupSettings, macroName } from './settings.js?v=5';
import { preloadFighter } from './art.js?v=5';
import { setupRosterPicker } from './picker.js?v=5';

const $ = selector => document.querySelector(selector);
const url = new URL(location.href);
let savedLanguage;
try { savedLanguage = localStorage.getItem(localeKey); } catch {}
setLanguage(preferredLanguage(url.searchParams.get('lang'), savedLanguage, navigator.languages));
const translatePage = bindPageLanguage(document);
translatePage();
const dialog = $('#preferences');
const rosterDialog = $('#roster-dialog');
let settings = loadSettings();
let paused = false;
let loading = false;
let opening = 0;
const held = new Set();
const tapped = new Set();
const pressOrder = [[], []];
const pointers = new Map();
const macros = [new MacroPlayer(), new MacroPlayer()];
const cpu = new Opponent();
const audio = new FightSound();
const arrows = { up: '↑', left: '←', down: '↓', right: '→' };

const status = message => { $('#status').textContent = message; };
const fight = new Fight((event, id) => {
  audio.play(event, id);
  if (event === 'hit') macros[id].cancel();
  if (event === 'round' || event === 'roundEnd') resetInputs();
  if (event === 'fight') {
    renderTouch();
    status(t('开始对战'));
  }
  if (event === 'counter') status(t('{name}打出了克制', {name:fighterName(fight.fighters[id.id].character)}));
  if (event === 'match') status(id === null ? t('平局') : t('{name}获胜',{name:fighterName(fight.selection[id])}));
}, settings.roster);
const render = createRenderer($('#arena'));
const playerCount = () => settings.mode === 'local' ? 2 : 1;

function persist() {
  if (!saveSettings(settings)) status(t('设置已应用。本浏览器无法持久保存设置。'));
}

function resetInputs() {
  held.clear();
  tapped.clear();
  pressOrder.forEach(order => { order.length = 0; });
  pointers.clear();
  macros.forEach(macro => macro.cancel());
  fight.fighters.forEach(fighter => { fighter.pending = null; fighter.commandHistory.length = 0; fighter.input.clear(); fighter.directions.length = 0; });
  document.querySelectorAll('.touch button.active').forEach(button => button.classList.remove('active'));
}

function refresh() {
  const phase = fight.phase;
  const inLobby = phase === 'lobby';
  const finished = phase === 'matchEnd';
  $('#screen').dataset.phase = phase;
  $('#lobby').hidden = !inLobby;
  $('#touch').hidden = phase !== 'fight' || paused || dialog.open;
  $('#cpu-mode').setAttribute('aria-pressed', settings.mode === 'cpu');
  $('#local-mode').setAttribute('aria-pressed', settings.mode === 'local');
  $('#difficulty').value = settings.difficulty;
  $('#difficulty-control').hidden = settings.mode === 'local';
  $('#mode-status').textContent = t(settings.mode === 'cpu' ? '单人对战' : '双人同屏');
  $('#picked-0').textContent = sideName(0) + ' · ' + fighterName(fight.selection[0]);
  $('#picked-1').textContent = (settings.mode === 'cpu' ? 'CPU' : sideName(1)) + ' · ' + fighterName(fight.selection[1]);
  $('#start').disabled = loading;
  $('#start').innerHTML = loading ? t('正在准备角色…') : t('开始对战') + ' <kbd>Enter</kbd>';
  $('#opponent-label').textContent = settings.mode === 'cpu' ? 'CPU' : sideName(1);
  $('#sound').setAttribute('aria-pressed', settings.sound);
  $('#sound').textContent = t(settings.sound ? '声音开启' : '声音关闭');
  $('#pause').disabled = inLobby || finished;
  $('#pause').textContent = t(paused ? '继续 · Esc' : '暂停 · Esc');
  $('#overlay').hidden = dialog.open || (!paused && !finished);
  $('#overlay-title').textContent = paused ? t('对战暂停') : finished ? t('{name}获胜',{name:fighterName(fight.selection[fight.roundWinner])}) : '';
  $('#overlay-detail').textContent = finished ? fight.fighters.map(fighter => fighter.wins).join(' : ') + ' · ' + t('对战结束') : '';
  $('#continue').textContent = t(paused ? '继续对战' : '再战一场');
  $('#fullscreen').textContent = t(document.fullscreenElement ? '退出全屏' : '全屏');
  audio.enabled = settings.sound;
  document.querySelectorAll('.skill-trigger').forEach(button => { button.disabled = phase !== 'fight' || paused || dialog.open; });
}

function updateDecks() {
  $('#decks').innerHTML = fight.selection.map((fighter, index) => {
    const auto = index === 1 && settings.mode === 'cpu';
    const group = actions => actions.map(action => '<span title="' + actionName(action) + '"><kbd></kbd><small>'
      + (arrows[action] ?? actionName(action)) + '</small></span>').join('');
    return '<article class="deck deck-' + index + '" style="--accent:' + fighter.color + '" data-deck="' + index + '"><div class="deck-title"><b>'
      + (auto ? 'CPU' : sideName(index)) + '</b><strong>' + fighterName(fighter) + '</strong><span>' + styleName(fighter) + '</span></div>'
      + (auto ? '<p class="cpu-note">' + t('电脑难度') + ' · ' + t(['入门', '标准', '进阶'][settings.difficulty - 1]) + '</p>'
        : '<div class="deck-keys"><div>' + group(ACTIONS.slice(0, 4)) + '</div><div>' + group(ACTIONS.slice(4))
        + '</div></div>') + '<div class="deck-macros" aria-label="' + t('专属连招') + '"></div></article>';
  }).join('');
  document.querySelectorAll('[data-deck]').forEach(deck => {
    const index = Number(deck.dataset.deck);
    deck.querySelectorAll('.deck-keys kbd').forEach((key, position) => {
      key.textContent = keyName(settings.bindings[index][ACTIONS[position]]);
    });
    const container = deck.querySelector('.deck-macros');
    fight.selection[index].signatures.forEach((skill, slot) => {
      const auto = index >= playerCount();
      const macro = settings.macros[index][slot];
      const label = document.createElement(auto ? 'span' : 'button');
      const key = document.createElement('kbd');
      const detail = document.createElement('small');
      detail.textContent = skillDetail(skill);
      if (!auto) {
        label.type = 'button';
        label.className = 'skill-trigger';
        label.dataset.signature = slot;
        label.disabled = fight.phase !== 'fight' || paused;
        if (macro.source === 'signature') {
          key.textContent = keyName(macro.key);
          label.append(key, ' ');
        }
      }
      label.append(moveName(fight.selection[index],skill.name), detail);
      container.append(label);
    });
    if (index < playerCount()) settings.macros[index].filter(macro => macro.source === 'custom').forEach(macro => {
      const tag = document.createElement('span');
      const key = document.createElement('kbd');
      key.textContent = keyName(macro.key);
      tag.append(key, ' ' + macroName(macro));
      container.append(tag);
    });
  });
}

function renderTouch() {
  $('#touch').innerHTML = fight.selection.slice(0, playerCount()).map((fighter, index) => {
    const buttons = actions => actions.map(action => '<button type="button" aria-label="' + fighterName(fighter) + ' ' + actionName(action)
      + '" data-player="' + index + '" data-action="' + action + '">' + (arrows[action] ?? actionName(action)) + '</button>').join('');
    const shortcuts = fighter.signatures.map((skill, i) => '<button type="button" data-player="' + index
      + '" data-macro="' + i + '">' + moveName(fighter,skill.name) + '</button>').join('');
    const custom = settings.macros[index].map((macro, i) => macro.source === 'custom' ? '<button type="button" data-player="'
      + index + '" data-custom="' + i + '"></button>' : '').join('');
    return '<div class="touch-deck deck-' + index + '"><b>' + sideName(index) + '</b><div class="pad">' + buttons(ACTIONS.slice(0, 4))
      + '</div><div class="pad">' + buttons(ACTIONS.slice(4)) + '</div><div class="touch-macros">' + shortcuts + custom + '</div></div>';
  }).join('');
  document.querySelectorAll('#touch button[data-custom]').forEach(button => {
    const { player, custom } = button.dataset;
    button.textContent = macroName(settings.macros[player][custom]);
  });
}

async function start() {
  if (loading) return;
  const request = ++opening;
  loading = true;
  $('#load-error').hidden = true;
  refresh();
  audio.unlock();
  try {
    await Promise.all([preloadStage(), ...fight.selection.map(preloadFighter)]);
  } catch {
    $('#load-error').hidden = false;
    status(t('角色美术加载失败，请刷新后重试。'));
    return;
  } finally {
    loading = false;
    refresh();
  }
  if (request !== opening || rosterDialog.open) return;
  paused = false;
  cpu.reset();
  fight.start();
  refresh();
  $('#pause').focus({ preventScroll: true });
}

function returnToLobby() {
  resetInputs();
  fight.lobby(settings.roster);
  paused = false;
  refresh();
  updateHud();
  $('#start').focus({ preventScroll: true });
}

function togglePause() {
  if (fight.phase === 'lobby' || fight.phase === 'matchEnd') return;
  paused = !paused;
  resetInputs();
  refresh();
  status(t(paused ? '对战暂停' : '继续对战'));
  if (paused) $('#continue').focus({ preventScroll: true });
}

window.addEventListener('keydown', event => {
  if (dialog.open || rosterDialog.open || event.target.closest?.('input, textarea, select')) return;
  if (event.code === 'Escape' && !event.repeat && fight.phase !== 'lobby') {
    event.preventDefault();
    togglePause();
  }
  if (event.code === 'Enter' && !event.repeat && !event.target.closest?.('button, a')) {
    if (fight.phase === 'lobby' || fight.phase === 'matchEnd') start();
    else if (paused) togglePause();
  }
  if (fight.phase !== 'fight' || paused || event.metaKey || event.ctrlKey || event.altKey) return;
  const key = normalizeKey(event);
  for (let player = 0; player < playerCount(); player++) {
    const action = ACTIONS.find(value => settings.bindings[player][value] === key);
    const slot = settings.macros[player].findIndex(value => value.key === key);
    if (!action && slot < 0) continue;
    event.preventDefault();
    held.add(key);
    if (!event.repeat) {
      tapped.add(key);
      if (action) pressOrder[player].push(action);
      if (slot >= 0) {
        const macro = settings.macros[player][slot];
        if (macro.source === 'signature') triggerSignature(player, slot);
        else macros[player].start(macro, fight.fighters[player].facing, fight.fighters[player].character);
      }
    }
  }
});
window.addEventListener('keyup', event => held.delete(normalizeKey(event)));
window.addEventListener('blur', resetInputs);
document.addEventListener('visibilitychange', () => {
  if (document.hidden && fight.phase === 'fight' && !paused && !dialog.open) togglePause();
});

$('#touch').addEventListener('pointerdown', event => {
  const button = event.target.closest('button[data-player]');
  if (!button?.dataset.action || fight.phase !== 'fight' || paused) return;
  event.preventDefault();
  const player = Number(button.dataset.player);
  button.setPointerCapture(event.pointerId);
  const action = button.dataset.action;
  pointers.set(event.pointerId, { player, action, button });
  pressOrder[player].push(action);
  tapped.add(settings.bindings[player][action]);
  button.classList.add('active');
});
$('#touch').addEventListener('click', event => {
  const button = event.target.closest('button[data-player]');
  if (!button || fight.phase !== 'fight' || paused || dialog.open) return;
  const { player, macro, custom } = button.dataset;
  if (macro !== undefined) triggerSignature(Number(player), Number(macro));
  if (custom !== undefined) macros[player].start(settings.macros[player][custom], fight.fighters[player].facing, fight.fighters[player].character);
});
$('#decks').addEventListener('click', event => {
  const button = event.target.closest('[data-signature]');
  if (button) triggerSignature(Number(button.closest('[data-deck]').dataset.deck), Number(button.dataset.signature));
});
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  $('#touch').addEventListener(type, event => {
    const pointer = pointers.get(event.pointerId);
    if (!pointer) return;
    pointers.delete(event.pointerId);
    if (![...pointers.values()].some(value => value.button === pointer.button)) pointer.button.classList.remove('active');
  });
}

function controls(player) {
  const macro = macros[player];
  const buttons = macro.advance(fight.fighters[player]).slice();
  if (macro.pressed) pressOrder[player].push(macro.pressed);
  for (const action of ACTIONS) {
    const key = settings.bindings[player][action];
    if (held.has(key) || tapped.has(key)) buttons.push(PORT[action]);
  }
  for (const pointer of pointers.values()) {
    if (pointer.player === player) buttons.push(PORT[pointer.action]);
  }
  return buttons;
}

function triggerSignature(player, slot) {
  if (paused || dialog.open || player >= playerCount()) return;
  const result = fight.requestSignature(player, slot);
  const fighter = fight.fighters[player];
  if (result === 'started') macros[player].cancel();
  if (result === 'busy' || result === 'queued') {
    const text = result === 'queued' ? '已预输入' : fighter.stun ? '受击硬直中' : fighter.y > 65 ? '落地后出招' : '招式进行中';
    fighter.inputNotice = { text, until: fight.frame + 34 };
    status(t(text));
  }
  if (result === 'energy') {
    const skill = fighter.character.signatures[slot];
    if (!fighter.move?.skill) {
      fighter.signatureBanner = { name: skill.name, result: '能量不足', hits: 0, max: skill.steps.length, until: fight.frame + 64 };
    }
    status(t('{name}需要 {n} 能量',{name:moveName(fighter.character,skill.name),n:skill.cost}));
  }
}

function setMode(mode) {
  settings.mode = mode;
  persist();
  refresh();
  updateDecks();
}

const redrawSettings = setupSettings(dialog, {
  read: () => settings,
  beforeOpen: resetInputs,
  afterOpen: refresh,
  afterClose: () => { resetInputs(); refresh(); $('#settings').focus(); },
  onSave: updated => { settings = updated; persist(); updateDecks(); renderTouch(); },
});
const redrawRoster = setupRosterPicker({
  selection: () => settings.roster,
  mode: () => settings.mode,
  confirm(player, character) {
    opening++;
    settings.roster[player] = character;
    fight.lobby(settings.roster);
    persist();
    updateDecks();
    updateHud();
    refresh();
  },
});
$('#sound').onclick = () => {
  settings.sound = !settings.sound;
  refresh();
  if (settings.sound) audio.unlock();
  persist();
};
$('#cpu-mode').onclick = () => setMode('cpu');
$('#local-mode').onclick = () => setMode('local');
$('#difficulty').onchange = event => {
  settings.difficulty = Number(event.target.value);
  persist();
  updateDecks();
};
$('#start').onclick = start;
$('#pause').onclick = togglePause;
$('#home').onclick = returnToLobby;
$('#continue').onclick = () => paused ? togglePause() : start();
if (document.fullscreenEnabled) {
  const button = $('#fullscreen');
  button.hidden = false;
  button.onclick = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await $('.game').requestFullscreen();
    } catch {
      status(t('浏览器未能进入全屏。'));
    }
  };
  document.addEventListener('fullscreenchange', () => {
    button.textContent = t(document.fullscreenElement ? '退出全屏' : '全屏');
  });
}

const fighterPanel = id => '<article class="fighter deck-' + id + '"><div class="fighter-name"><b></b><span></span><small'
  + (id ? ' id="opponent-label"' : '') + '></small></div>'
  + '<div class="health" role="progressbar" aria-valuemin="0" aria-valuemax="100"><span></span></div>'
  + '<div class="charge" role="progressbar" aria-valuemin="0" aria-valuemax="100"><span></span></div>'
  + '<div class="wins"><i></i><i></i></div><span class="hits"></span><span class="counter-call"></span></article>';
$('#hud').innerHTML = fighterPanel(0) + '<div class="clock"><b id="timer">' + ROUND_SECONDS
  + '</b><span id="round"></span></div>' + fighterPanel(1);
const panels = [...document.querySelectorAll('.fighter')];

function updateHud() {
  for (const fighter of fight.fighters) {
    const panel = panels[fighter.id];
    const character = fighter.character;
    if (panel.dataset.character !== character.id || panel.lang !== document.documentElement.lang) {
      panel.lang = document.documentElement.lang;
      panel.dataset.character = character.id;
      panel.style.setProperty('--accent', character.color);
      panel.querySelector('.fighter-name b').textContent = fighterName(character);
      panel.querySelector('.fighter-name span').textContent = language === 'en' ? t(character.kingdom) : character.roman;
      panel.querySelector('.fighter-name small').textContent = fighter.id && settings.mode==='cpu' ? 'CPU' : sideName(fighter.id);
      panel.querySelector('.health').setAttribute('aria-label', t('{name}生命',{name:fighterName(character)}));
      panel.querySelector('.charge').setAttribute('aria-label', t('{name}能量',{name:fighterName(character)}));
    }
    for (const [selector, value] of [['.health', fighter.hp], ['.charge', fighter.energy]]) {
      const bar = panel.querySelector(selector);
      bar.style.setProperty('--fill', value + '%');
      bar.setAttribute('aria-valuenow', value);
    }
    panel.querySelectorAll('.wins i').forEach((marker, index) => marker.classList.toggle('won', index < fighter.wins));
    panel.querySelector('.counter-call').textContent = fighter.counterBanner?.until > fight.frame ? t(fighter.counterBanner.name)
      : fighter.inputNotice?.until > fight.frame ? (fighter.inputNotice.skill ? moveName(character,fighter.inputNotice.skill.name)+' · '+t(fighter.inputNotice.reason) : t(fighter.inputNotice.text)) : '';
    const banner = fighter.signatureBanner;
    panel.querySelector('.hits').textContent = banner
      ? moveName(character,banner.name) + ' · ' + (banner.result ? t(banner.result) : banner.hits ? t('{hits}/{max} 命中',banner) : t('起手'))
      : fighter.combo > 1 ? t('{n} 次连续命中',{n:fighter.combo}) : '';
  }
  $('#timer').textContent = Math.ceil(fight.clock / TICKS);
  $('#round').textContent = t('第 {n} 局',{n:fight.round});
}

function updateAnnouncement() {
  const announcement = $('#announcement');
  const phase = fight.phase;
  announcement.hidden = paused || dialog.open || !['intro', 'roundEnd'].includes(phase);
  if (!announcement.hidden) {
    announcement.textContent = phase === 'intro' ? t('第 {n} 局',{n:fight.round})
      : fight.roundWinner === null ? t('平局') : t('{name} 赢得本局',{name:fighterName(fight.selection[fight.roundWinner])});
  }
}

const tick = 1000 / TICKS;
let previous = 0;
let remainder = 0;
let hudFrame = -1;
let previousPhase = fight.phase;
function animate(timestamp) {
  remainder += Math.min(100, timestamp - (previous || timestamp));
  previous = timestamp;
  while (remainder >= tick) {
    if (!paused && !dialog.open && fight.phase !== 'lobby' && fight.phase !== 'matchEnd') {
      fight.step([controls(0), settings.mode === 'local' ? controls(1) : cpu.controls(fight, settings.difficulty)], pressOrder);
      pressOrder.forEach(order => { order.length = 0; });
      tapped.clear();
    }
    remainder -= tick;
  }
  if (previousPhase !== fight.phase) {
    previousPhase = fight.phase;
    refresh();
  }
  if (hudFrame !== fight.frame) {
    updateHud();
    hudFrame = fight.frame;
  }
  updateAnnouncement();
  render(fight, fight.phase === 'lobby' ? timestamp / tick : fight.frame);
  requestAnimationFrame(animate);
}

for (const toggle of document.querySelectorAll('[data-language-switch]')) {
  toggle.onclick = () => {
    setLanguage(language === 'en' ? 'zh' : 'en');
    try { localStorage.setItem(localeKey,language); } catch {}
    if (url.searchParams.has('lang')) {
      url.searchParams.set('lang',language);
      history.replaceState(null,'',url);
    }
    translatePage();
    pointers.clear();
    redrawSettings();
    redrawRoster();
    refresh();
    updateDecks();
    renderTouch();
    updateHud();
    updateAnnouncement();
    status('');
  };
}

refresh();
updateDecks();
updateHud();
requestAnimationFrame(animate);
