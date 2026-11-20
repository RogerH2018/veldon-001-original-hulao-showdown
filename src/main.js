import { Fight, FIGHTERS, Opponent, ROUND_SECONDS, TICKS } from './fight.js';
import { ACTIONS, MacroPlayer, PORT, keyName, normalizeKey } from './input.js';
import { createRenderer } from './render.js';
import { FightSound } from './sound.js';
import { loadSettings, saveSettings, setupSettings, labels } from './settings.js';

const $ = selector => document.querySelector(selector);
const dialog = $('#preferences');
let settings = loadSettings();
let paused = false;
const held = new Set();
const tapped = new Set();
const pointers = new Map();
const macros = [new MacroPlayer(), new MacroPlayer()];
const cpu = new Opponent();
const audio = new FightSound();
const arrows = { up: '↑', left: '←', down: '↓', right: '→' };

const status = message => { $('#status').textContent = message; };
const fight = new Fight((event, id) => {
  audio.play(event);
  if (event === 'hit') macros[id].cancel();
  if (event === 'round' || event === 'roundEnd') resetInputs();
  if (event === 'fight') {
    renderTouch();
    status('开始对战');
  }
  if (event === 'match') status(FIGHTERS[id].name + '获胜');
});
const render = createRenderer($('#arena'));
const playerCount = () => settings.mode === 'local' ? 2 : 1;

function persist() {
  if (!saveSettings(settings)) status('设置已应用。本浏览器无法持久保存设置。');
}

function resetInputs() {
  held.clear();
  tapped.clear();
  pointers.clear();
  macros.forEach(macro => macro.cancel());
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
  $('#mode-status').textContent = settings.mode === 'cpu' ? '单人对战' : '双人同屏';
  $('#opponent-label').textContent = settings.mode === 'cpu' ? 'CPU' : '2P';
  $('#sound').setAttribute('aria-pressed', settings.sound);
  $('#sound').textContent = settings.sound ? '声音开启' : '声音关闭';
  $('#pause').disabled = inLobby || finished;
  $('#pause').textContent = paused ? '继续 · Esc' : '暂停 · Esc';
  $('#overlay').hidden = dialog.open || (!paused && !finished);
  $('#overlay-title').textContent = paused ? '对战暂停' : finished ? FIGHTERS[fight.roundWinner].name + '获胜' : '';
  $('#overlay-detail').textContent = finished ? fight.fighters.map(fighter => fighter.wins).join(' : ') + ' · 对战结束' : '';
  $('#continue').textContent = paused ? '继续对战' : '再战一场';
  audio.enabled = settings.sound;
}

function updateDecks() {
  $('#decks').innerHTML = FIGHTERS.map((fighter, index) => {
    const auto = index === 1 && settings.mode === 'cpu';
    const group = actions => actions.map(action => '<span title="' + labels[action] + '"><kbd></kbd><small>'
      + (arrows[action] ?? action) + '</small></span>').join('');
    return '<article class="deck deck-' + index + '" data-deck="' + index + '"><div class="deck-title"><b>'
      + (auto ? 'CPU' : (index + 1) + 'P') + '</b><strong>' + fighter.name + '</strong><span>' + fighter.style + '</span></div>'
      + (auto ? '<p class="cpu-note">电脑难度 · ' + ['入门', '标准', '进阶'][settings.difficulty - 1] + '</p>'
        : '<div class="deck-keys"><div>' + group(ACTIONS.slice(0, 4)) + '</div><div>' + group(ACTIONS.slice(4))
        + '</div></div><div class="deck-macros"></div>') + '</article>';
  }).join('');
  document.querySelectorAll('[data-deck]').forEach(deck => {
    const index = Number(deck.dataset.deck);
    deck.querySelectorAll('.deck-keys kbd').forEach((key, position) => {
      key.textContent = keyName(settings.bindings[index][ACTIONS[position]]);
    });
    const container = deck.querySelector('.deck-macros');
    if (container) settings.macros[index].forEach(macro => {
      const label = document.createElement('span');
      const key = document.createElement('kbd');
      key.textContent = keyName(macro.key);
      label.append(key, ' ' + macro.name);
      container.append(label);
    });
  });
}

function renderTouch() {
  $('#touch').innerHTML = FIGHTERS.slice(0, playerCount()).map((fighter, index) => {
    const buttons = actions => actions.map(action => '<button type="button" aria-label="' + fighter.name + ' ' + labels[action]
      + '" data-player="' + index + '" data-action="' + action + '">' + (arrows[action] ?? action) + '</button>').join('');
    const shortcuts = settings.macros[index].map((slot, i) => '<button type="button" data-player="' + index
      + '" data-macro="' + i + '">连招 ' + (i + 1) + '</button>').join('');
    return '<div class="touch-deck deck-' + index + '"><b>' + (index + 1) + 'P</b><div class="pad">' + buttons(ACTIONS.slice(0, 4))
      + '</div><div class="pad">' + buttons(ACTIONS.slice(4)) + '</div><div class="touch-macros">' + shortcuts + '</div></div>';
  }).join('');
}

function start() {
  paused = false;
  audio.unlock();
  cpu.reset();
  fight.start();
  refresh();
  $('#pause').focus({ preventScroll: true });
}

function returnToLobby() {
  resetInputs();
  const initial = new Fight();
  fight.phase = initial.phase;
  fight.fighters = initial.fighters;
  fight.effects = initial.effects;
  fight.projectiles = initial.projectiles;
  fight.round = initial.round;
  fight.clock = initial.clock;
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
  status(paused ? '对战暂停' : '继续对战');
  if (paused) $('#continue').focus({ preventScroll: true });
}

window.addEventListener('keydown', event => {
  if (dialog.open || event.target.closest?.('input, textarea, select')) return;
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
    const macro = settings.macros[player].find(slot => slot.key === key);
    if (!action && !macro) continue;
    event.preventDefault();
    held.add(key);
    if (!event.repeat) {
      tapped.add(key);
      if (macro) macros[player].start(macro, fight.fighters[player].facing);
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
  if (!button || fight.phase !== 'fight' || paused) return;
  event.preventDefault();
  const player = Number(button.dataset.player);
  if (button.dataset.macro !== undefined) {
    macros[player].start(settings.macros[player][button.dataset.macro], fight.fighters[player].facing);
    return;
  }
  button.setPointerCapture(event.pointerId);
  const action = button.dataset.action;
  pointers.set(event.pointerId, { player, action, button });
  tapped.add(settings.bindings[player][action]);
  button.classList.add('active');
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
  const buttons = macros[player].advance().slice();
  for (const action of ACTIONS) {
    const key = settings.bindings[player][action];
    if (held.has(key) || tapped.has(key)) buttons.push(PORT[action]);
  }
  for (const pointer of pointers.values()) {
    if (pointer.player === player) buttons.push(PORT[pointer.action]);
  }
  return buttons;
}

function setMode(mode) {
  settings.mode = mode;
  persist();
  refresh();
  updateDecks();
}

setupSettings(dialog, {
  read: () => settings,
  beforeOpen: resetInputs,
  afterOpen: refresh,
  afterClose: () => { resetInputs(); refresh(); $('#settings').focus(); },
  onSave: updated => { settings = updated; persist(); updateDecks(); },
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
      status('浏览器未能进入全屏。');
    }
  };
  document.addEventListener('fullscreenchange', () => {
    button.textContent = document.fullscreenElement ? '退出全屏' : '全屏';
  });
}

const fighterPanel = (fighter, id) => '<article class="fighter deck-' + id + '"><div class="fighter-name"><b>' + fighter.name
  + '</b><span>' + fighter.roman + '</span><small' + (id ? ' id="opponent-label"' : '') + '>' + (id ? 'CPU' : '1P') + '</small></div>'
  + '<div class="health" role="progressbar" aria-label="' + fighter.name + '生命" aria-valuemin="0" aria-valuemax="100"><span></span></div>'
  + '<div class="charge" role="progressbar" aria-label="' + fighter.name + '能量" aria-valuemin="0" aria-valuemax="100"><span></span></div>'
  + '<div class="wins"><i></i><i></i></div><span class="hits"></span></article>';
$('#hud').innerHTML = fighterPanel(FIGHTERS[0], 0) + '<div class="clock"><b id="timer">' + ROUND_SECONDS
  + '</b><span id="round">第 1 局</span></div>' + fighterPanel(FIGHTERS[1], 1);
const panels = [...document.querySelectorAll('.fighter')];

function updateHud() {
  for (const fighter of fight.fighters) {
    const panel = panels[fighter.id];
    for (const [selector, value] of [['.health', fighter.hp], ['.charge', fighter.energy]]) {
      const bar = panel.querySelector(selector);
      bar.style.setProperty('--fill', value + '%');
      bar.setAttribute('aria-valuenow', value);
    }
    panel.querySelectorAll('.wins i').forEach((marker, index) => marker.classList.toggle('won', index < fighter.wins));
    panel.querySelector('.hits').textContent = fighter.combo > 1 ? fighter.combo + ' 次连续命中' : '';
  }
  $('#timer').textContent = Math.ceil(fight.clock / TICKS);
  $('#round').textContent = '第 ' + fight.round + ' 局';
}

function updateAnnouncement() {
  const announcement = $('#announcement');
  const phase = fight.phase;
  announcement.hidden = paused || dialog.open || !['intro', 'roundEnd'].includes(phase);
  if (!announcement.hidden) {
    announcement.textContent = phase === 'intro' ? '第 ' + fight.round + ' 局'
      : fight.roundWinner === null ? '平局' : FIGHTERS[fight.roundWinner].name + ' 赢得本局';
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
      fight.step([controls(0), settings.mode === 'local' ? controls(1) : cpu.controls(fight, settings.difficulty)]);
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

refresh();
updateDecks();
updateHud();
requestAnimationFrame(animate);
