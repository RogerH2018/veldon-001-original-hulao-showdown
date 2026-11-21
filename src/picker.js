import { actionName, familyName, fighterName, language, moveName, sideName, skillDetail, styleName, t } from './locale.js?v=5';
import { drawPortrait, preloadFighter } from './art.js?v=5';
import { drawActor } from './fighter-render.js?v=5';
import { MOVES } from './fight.js?v=5';
import { drawStrike } from './strike-render.js?v=5';
import { findFighter, ROSTER, TEAMS } from './roster.js?v=5';

export function setupRosterPicker({ selection, mode, confirm }) {
  const dialog = document.querySelector('#roster-dialog');
  const list = dialog.querySelector('#roster-list');
  const team = dialog.querySelector('#roster-team');
  const search = dialog.querySelector('#roster-search');
  const portrait = dialog.querySelector('#roster-portrait');
  const preview = dialog.querySelector('#roster-preview');
  let side = 0;
  let candidate;
  let selectedSkill = 0, previewStart = 0, animation = 0;
  const ctx = portrait.getContext('2d');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let playOnce = false;
  function showPreview(time) {
    if (!dialog.open || !candidate) return;
    const normal = candidate.techniques[selectedSkill];
    const skill = normal ? null : candidate.signatures[selectedSkill];
    const end = skill?.end ?? MOVES[selectedSkill].end;
    const beats = skill?.steps ?? [{at:MOVES[selectedSkill].active, kind:normal.kind}];
    const elapsed = Math.max(0, Math.floor((time - previewStart) * .06));
    const tick = reduced.matches ? (playOnce ? elapsed : end + 1) : elapsed % (end + 62);
    const move = tick <= end ? { id: skill ? 'signature' : selectedSkill, skill, age: tick } : null;
    ctx.clearRect(0, 0, portrait.width, portrait.height);
    ctx.save(); ctx.translate(165, 260); ctx.scale(1.08, 1.08);
    ctx.fillStyle = '#211b1d80'; ctx.beginPath(); ctx.ellipse(0, 1, 44, 7, 0, 0, 2 * Math.PI); ctx.fill();
    const drawn = drawActor(ctx, { character: candidate, move, y: 0, pose: 'idle' }, reduced.matches ? tick : elapsed, MOVES);
    if (drawn) portrait.dataset.ready = 'true';
    for (const [i, beat] of beats.entries()) {
      const age = (tick - beat.at) / 15;
      if (age >= 0 && age < 1) drawStrike(ctx, { x:0, y:-82, span:105, family:candidate.effect, color:candidate.color,
        slot:skill?.slot ?? -1, kind:beat.kind, last:!!skill && i===beats.length-1, frame:beat.at, facing:1 }, age);
    }
    ctx.restore();
    animation = requestAnimationFrame(showPreview);
  }
  function selectSkill(index, manual = false) {
    selectedSkill = index;
    playOnce = manual;
    previewStart = performance.now();
    dialog.querySelectorAll('[data-preview],[data-basic]').forEach(b => b.setAttribute('aria-pressed', (b.dataset.basic ?? Number(b.dataset.preview)) === index));
    cancelAnimationFrame(animation);
    animation = requestAnimationFrame(showPreview);
  }

  const observer = new IntersectionObserver(records => {
    for (const record of records) {
      if (!record.isIntersecting) continue;
      const canvas = record.target;
      observer.unobserve(canvas);
      drawPortrait(canvas, findFighter(canvas.dataset.id), true);
    }
  }, { root: list, rootMargin: '80px' });

  function updateTeams() {
    const value = team.value;
    team.replaceChildren(new Option(t('全部势力'), ''));
    for (const kingdom of new Set(TEAMS.map(group => group.kingdom))) team.add(new Option(t(kingdom),kingdom));
    team.value = value;
  }
  updateTeams();

  const updatePreview = (character, choice=0) => {
    candidate = character;
    preview.style.setProperty('--roster-accent', character.color);
    dialog.querySelector('#roster-name').textContent = fighterName(character);
    dialog.querySelector('#roster-style').textContent = (language === 'zh' ? character.roman+' · ' : '') + familyName(character) + ' / ' + styleName(character);
    dialog.querySelector('#roster-basics').replaceChildren(...['A','C','B','D'].map(id => {
      const button=document.createElement('button');
      button.type='button'; button.dataset.basic=id;
      button.textContent=actionName(id)+' · '+moveName(character,character.techniques[id].name);
      button.onclick=()=>selectSkill(id,true);
      return button;
    }));
    dialog.querySelector('#roster-skills').replaceChildren(...character.signatures.map((skill, i) => {
      const line = document.createElement('li');
      const play = document.createElement('button');
      play.type = 'button';
      play.dataset.preview = i;
      play.setAttribute('aria-label', t('演示{name}',{name:moveName(character,skill.name)}));
      play.onclick = () => selectSkill(i, true);
      const name = document.createElement('strong');
      const detail = document.createElement('span');
      name.textContent = moveName(character,skill.name);
      detail.textContent = skillDetail(skill);
      play.append(name, detail);
      line.append(play);
      return line;
    }));
    portrait.dataset.character = character.id;
    delete portrait.dataset.ready;
    preloadFighter(character).catch(() => { if (candidate === character) portrait.dataset.ready = 'error'; });
    selectSkill(choice);
    list.querySelectorAll('[data-character]').forEach(button => {
      button.setAttribute('aria-pressed', button.dataset.character === character.id);
    });
  };

  function renderList() {
    observer.disconnect();
    const normalize = text => text.toLowerCase().replaceAll('ü', 'u').replaceAll('lv', 'lu').replace(/\s+/g, '');
    const query = normalize(search.value);
    const fighters = ROSTER.filter(character => (!team.value || character.kingdom === team.value)
      && (!query || [character.name, character.roman, fighterName(character,'en'), character.family, familyName(character,'en'), character.style, styleName(character,'en'), character.weapon].some(text => normalize(text).includes(query))));
    list.innerHTML = fighters.length ? fighters.map(character =>
      '<button class="fighter-card" type="button" data-character="' + character.id + '" aria-pressed="' + (candidate?.id === character.id)
      + '" style="--roster-accent:' + character.color + '"><canvas width="112" height="90" data-id="' + character.id
      + '" aria-hidden="true"></canvas><b>' + fighterName(character) + '</b><small>' + familyName(character) + '</small></button>',
    ).join('') : '<p class="roster-empty">' + t('没有找到符合条件的角色。') + '</p>';
    dialog.querySelector('#roster-count').textContent = t('{count} / {total} 名角色',{count:fighters.length,total:ROSTER.length});
    list.scrollTop = 0;
    list.querySelectorAll('canvas').forEach(canvas => observer.observe(canvas));
  }

  function sideLabels() {
    dialog.querySelectorAll('[data-side]').forEach(button => {
      const index = Number(button.dataset.side);
      button.setAttribute('aria-pressed', index === side);
      button.textContent = index && mode() === 'cpu' ? t('CPU 对手') : sideName(index);
    });
  }

  function chooseSide(player) {
    side=player;
    sideLabels();
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
  dialog.addEventListener('close', () => { observer.disconnect(); cancelAnimationFrame(animation); });
  document.querySelectorAll('[data-pick]').forEach(button => {
    button.onclick = () => {
      team.value = '';
      search.value = '';
      dialog.showModal();
      chooseSide(Number(button.dataset.pick));
      renderList();
    };
  });
  return () => {
    updateTeams();
    if (dialog.open) { sideLabels(); updatePreview(candidate,selectedSkill); renderList(); }
  };
}
