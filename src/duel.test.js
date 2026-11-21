import test from 'node:test';
import assert from 'node:assert/strict';
import { Fight, MOVES } from './fight.js?v=3';
import { PORT, DEFAULT_BINDINGS, DEFAULT_MACROS } from './input.js?v=3';
import { ROSTER, DEFAULT_ROSTER } from './roster.js?v=3';
import { motionAt } from './motion.js?v=3';
import { migrateSettings, validateSettings } from './settings.js?v=3';

const tick = (fight, controls = [[],[]]) => fight.step(controls);
function duel() {
  const f = new Fight();
  f.start(); for (let i=0;i<85;i++) tick(f);
  f.fighters[0].x=520; f.fighters[1].x=614;
  return f;
}
function timedInputs(fight, moves, delays) {
  const end = Math.max(...moves.map((id,i)=>MOVES[id].active+delays[i]));
  for (let i=0;i<end;i++) tick(fight,moves.map((id,side)=>i===delays[side]?[PORT[id]]:[]));
}

test('the three attack priorities resolve symmetrically on simultaneous contact with a damage and stun bonus',()=>{
  for(const [win,lose] of [['A','C'],['B','A'],['C','B']]) for(const side of [0,1]) {
    const f=duel(), moves=side?[lose,win]:[win,lose];
    const end=Math.max(...moves.map(id=>MOVES[id].active));
    timedInputs(f,moves,moves.map(id=>end-MOVES[id].active));
    const first=f.fighters[side],other=f.fighters[1-side];
    assert.equal(first.hp,100,win); assert.equal(other.hp,100-Math.round(MOVES[win].damage*first.character.weight*1.25));
    assert.equal(other.stun,MOVES[win].stun+5); assert.ok(first.counterBanner);
  }
});
test('a five-tick intercept works on either side, a late counter or an out-of-range counter cannot parry',()=>{
  for(const side of [0,1]) {
    const f=duel(),moves=side?['A','B']:['B','A'];timedInputs(f,moves,[0,0]);
    assert.equal(f.fighters[side].hp,100);assert.ok(f.fighters[side].counterBanner);
    const late=duel();timedInputs(late,moves,side?[0,1]:[1,0]);
    assert.ok(late.fighters[side].hp<100);assert.equal(late.fighters[1-side].hp,100);
  }
  const f=duel();f.fighters[1].x=935;timedInputs(f,['B','A'],[0,0]);
  assert.deepEqual(f.fighters.map(v=>v.hp),[100,100]);assert.ok(f.fighters.every(v=>!v.counterBanner));
});
test('equal techniques trade; recovery can be punished without a counter bonus',()=>{
  const f=duel();timedInputs(f,['A','A'],[0,0]);
  assert.ok(f.fighters.every(v=>v.hp<100&&!v.counterBanner));
  const recovery=duel();recovery.fighters[1].move={id:'C',age:MOVES.C.active+1};
  for(let i=0;i<MOVES.A.active;i++)tick(recovery,[i?[]:[PORT.A],[]]);
  assert.equal(recovery.fighters[1].hp,100-Math.round(MOVES.A.damage*recovery.fighters[0].character.weight));
  assert.equal(recovery.fighters[0].counterBanner,undefined);
});
test('anti-air reaches above ordinary attacks; a block breaker is identified separately',()=>{
  for(const button of ['A','D']){
    const f=duel();f.fighters[0].move={id:button,age:MOVES[button].active-1};f.fighters[1].y=141;tick(f);
    assert.equal(f.fighters[0].counterBanner?.name,button==='D'?'对空迎击':undefined);
    assert.equal(f.fighters[1].hp<100,button==='D');
  }
  const f=duel();for(let i=0;i<MOVES.C.active;i++)tick(f,[i?[]:[PORT.C],[PORT.down]]);
  assert.equal(f.fighters[0].counterBanner.name,'破防');
});
test('every signature opener participates in the same priority rules from either side',()=>{
  const losingButtons=['C','A','B'];
  for(const c of ROSTER) for(const skill of c.signatures) for(const side of [0,1]){
    const ids=[...DEFAULT_ROSTER];ids[side]=c.id;
    const f=new Fight(undefined,ids);f.start();for(let i=0;i<85;i++)tick(f);
    const a=f.fighters[side],b=f.fighters[1-side];a.x=side?614:520;b.x=side?520:614;
    f.requestSignature(side,skill.slot);
    const enemy=losingButtons[skill.slot];
    a.move.age=skill.steps[0].at-1;b.move={id:enemy,age:MOVES[enemy].active-1};
    tick(f);
    assert.equal(a.hp,100,c.name+skill.name);assert.equal(a.signatureBanner.hits,1);
    assert.equal(b.hp,100-Math.round(skill.steps[0].damage*c.weight*1.25));assert.ok(a.counterBanner);
  }
});
test('all generals articulate the wrist, weapon, torso and feet across windup, hit and recovery',()=>{
  const names=new Set();
  for(const c of ROSTER) {
    const base={character:c,pose:'idle',y:0}, rest=motionAt(base,0,MOVES);
    assert.ok(!names.has(c.name));names.add(c.name);
    for(const [id,m] of Object.entries(MOVES)){
      const at=age=>motionAt({...base,move:{id,age}},0,MOVES);
      const windTick=m.active-Math.min(5,Math.ceil(m.active/2));
      const before=at(windTick), hit=at(m.active), after=at(m.end);
      assert.ok(Math.hypot(before.x-hit.x,before.y-hit.y)>15,c.name+id);
      assert.ok(Math.abs(before.angle-hit.angle)>.1);assert.ok(Math.abs(before.lean-hit.lean)>.05);
      assert.ok(Math.abs(hit.step-after.step)>1);assert.ok(Math.abs(rest.x-after.x)<.01);
    }
    for(const skill of c.signatures) for(const beat of skill.steps){
      const sample=age=>motionAt({...base,move:{id:'signature',skill,age}},0,MOVES);
      const wind=sample(beat.at-3),hit=sample(beat.at);
      assert.ok(Math.hypot(wind.x-hit.x,wind.y-hit.y)>10,skill.name+beat.kind);
      assert.ok(Object.values(hit).every(value=>typeof value!=='number'||Number.isFinite(value)));
    }
  }
});
test('the old roster migrates independently of custom controls and macros',()=>{
  const old={mode:'local',difficulty:3,sound:false,roster:['harbor-anchor','echo-room-tone'],
    macros:structuredClone(DEFAULT_MACROS),bindings:structuredClone(DEFAULT_BINDINGS)};
  old.bindings[0].A='KeyQ';old.macros[0][0].name='迎潮';delete old.macros[0][0].source;
  old.macros[1][1].name='自编';old.macros[1][1].source='custom';old.macros[1][1].sequence='D W8 A';
  const migrated=migrateSettings(old);validateSettings(migrated);
  assert.deepEqual(migrated.roster,DEFAULT_ROSTER);assert.equal(migrated.bindings[0].A,'KeyQ');
  assert.equal(migrated.macros[0][0].source,'signature');assert.equal(migrated.macros[1][1].sequence,'D W8 A');
});
