import { drawPortrait } from './art.js';
import { findFighter, ROSTER, TEAMS } from './roster.js';

export function setupRosterPicker({ selection, mode, confirm }) {
  const dialog = document.querySelector('#roster-dialog');
  const list = dialog.querySelector('#roster-list');
  const team = dialog.querySelector('#roster-team');
  const search = dialog.querySelector('#roster-search');
  const portrait = dialog.querySelector('#roster-portrait');
  const preview = dialog.querySelector('#roster-preview');
  let side = 0;
  let candidate;

  const observer = new IntersectionObserver(records => {
    for (const record of records) {
      if (!record.isIntersecting) continue;
      const canvas = record.target;
      observer.unobserve(canvas);
      drawPortrait(canvas, findFighter(canvas.dataset.id), true);
    }
  }, { root: list, rootMargin: '80px' });

  team.add(new Option('全部队伍', ''));
  TEAMS.forEach(group => team.add(new Option(group.name, group.id)));

  const updatePreview = character => {
    candidate = character;
    preview.style.setProperty('--roster-accent', character.color);
    dialog.querySelector('#roster-name').textContent = character.name;
    dialog.querySelector('#roster-style').textContent = character.roman + ' · ' + character.family + ' / ' + character.style;
    dialog.querySelector('#roster-skills').replaceChildren(...character.signatures.map(skill => {
      const line = document.createElement('li');
      const name = document.createElement('strong');
      const detail = document.createElement('span');
      name.textContent = skill.name;
      detail.textContent = skill.description + ' · ' + skill.steps.length + '段' + (skill.cost ? ' · ' + skill.cost + ' 能量' : '');
      line.append(name, detail);
      return line;
    }));
    drawPortrait(portrait, character);
    list.querySelectorAll('[data-character]').forEach(button => {
      button.setAttribute('aria-pressed', button.dataset.character === character.id);
    });
  };

  function renderList() {
    observer.disconnect();
    const query = search.value.trim().toLowerCase();
    const fighters = ROSTER.filter(character => (!team.value || character.team === team.value)
      && (!query || (character.name + ' ' + character.roman + ' ' + character.family + ' ' + character.style).toLowerCase().includes(query)));
    list.innerHTML = fighters.length ? fighters.map(character =>
      '<button class="fighter-card" type="button" data-character="' + character.id + '" aria-pressed="' + (candidate?.id === character.id)
      + '" style="--roster-accent:' + character.color + '"><canvas width="112" height="90" data-id="' + character.id
      + '" aria-hidden="true"></canvas><b>' + character.name + '</b><small>' + character.family + '</small></button>',
    ).join('') : '<p class="roster-empty">没有找到符合条件的角色。</p>';
    dialog.querySelector('#roster-count').textContent = fighters.length + ' / ' + ROSTER.length + ' 名角色';
    list.scrollTop = 0;
    list.querySelectorAll('canvas').forEach(canvas => observer.observe(canvas));
  }

  function chooseSide(player) {
    side = player;
    dialog.querySelectorAll('[data-side]').forEach(button => {
      const index = Number(button.dataset.side);
      button.setAttribute('aria-pressed', index === side);
      button.textContent = index ? mode() === 'cpu' ? 'CPU 对手' : '2P' : '1P';
    });
    updatePreview(findFighter(selection()[side]));
  }

  list.onclick = event => {
    const button = event.target.closest('button[data-character]');
    if (button) updatePreview(findFighter(button.dataset.character));
  };
  team.onchange = renderList;
  search.oninput = renderList;
  dialog.querySelector('#roster-sides').onclick = event => {
    const button = event.target.closest('button[data-side]');
    if (button) chooseSide(Number(button.dataset.side));
  };
  dialog.querySelector('#roster-confirm').onclick = () => {
    confirm(side, candidate.id);
    dialog.close();
  };
  dialog.querySelector('#roster-close').onclick = () => dialog.close();
  dialog.addEventListener('close', () => observer.disconnect());
  document.querySelectorAll('[data-pick]').forEach(button => {
    button.onclick = () => {
      team.value = '';
      search.value = '';
      dialog.showModal();
      chooseSide(Number(button.dataset.pick));
      renderList();
    };
  });
  return dialog;
}
