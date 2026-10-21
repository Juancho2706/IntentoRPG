// Paso 2c.2 — NÚCLEO de la integración de talentos (sin portadores/anfitriones)
//  1) poder común nucleo_tv: claves tv que consume el núcleo (curas/recurso al matar con
//     o sin Quemadura/Sangrado, Ejecutar, Pirotecnia, Espinas Venenosas, reducción de daño
//     condicional) y claves de combat-math (preyDmg, explodedDmg, executePct, burningCrit)
//  2) rootAdd/slowPctAdd (máximo + suma) y Estela que ralentiza
//  3) ⑪ onResource · ⑫ damageAlly (onAllyDamaged/onAllyLethal) · ⑬ onDotEnd y API de DoT
//  4) g.heal en un punto · g.shield con dr · startChannel sin mantener la tecla
//  5) básico de arma por ⑦ onCast (forceCrit / cancelar) · passiveTick de activas conocidas
//  6) indicadores: gaugeGain/gaugeLoss por stat, fervorChance, focusEnergy, galeHeal/galeEnergy
//  7) invisibilidad real del héroe · killStatus · dmgTakenPct
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { makeHarness } from './helpers/power-harness.mjs';
import { definePower, defineSkillBehavior, firePower, POWER_HOOKS, HOOK_NAMES } from '../js/powers.js';
import { CORE_TV_POWER, usesCoreTv, wasExecuted } from '../js/powers-common.js';
import { condAddPct, condCritPct, mitigate, EXECUTE_ELITE_ADD } from '../js/combat-math.js';
import { resolveSkill } from '../js/skill-resolve.js';
import { CLASSES } from '../js/data.js';
import { killStatus } from '../js/game-skills.js';
import { gainGauge, gaugeValue } from '../js/spec-mechanics.js';

globalThis.performance = globalThis.performance || { now: () => Date.now() };
const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e;
const SK = (cid, id) => CLASSES[cid].skills.find(s => s.id === id);
const mk = (o = {}) => makeHarness({ classId: 'guerrero', level: 30, ...o });

for (const h of ['onResource', 'onAllyDamaged', 'onAllyLethal', 'onDotEnd']) assert.ok(HOOK_NAMES.includes(h), `gancho ${h}`);
assert.ok(POWER_HOOKS[CORE_TV_POWER], 'poder común nucleo_tv registrado');

// ------------------------------------------------ 1) nucleo_tv
{
  assert.equal(usesCoreTv({}), false); assert.equal(usesCoreTv({ eliteDmg: 5 }), false);
  assert.equal(usesCoreTv({ killHeal: 1 }), true);
  const plain = mk();
  assert.ok(!plain.p.powers.has(CORE_TV_POWER), 'sin claves del núcleo no hay poder');
  // curas al matar: incondicional · solo si sangraba · solo si ardía (sustento)
  const h = mk({ tv: { killHeal: 2, bleedKillHeal: 3, burnKillHeal: 5 } });
  const p = h.p;
  assert.ok(p.powers.has(CORE_TV_POWER), 'con claves del núcleo: nucleo_tv');
  p.hp = p.stats.maxHP * 0.3;
  let hp0 = p.hp, s0 = h.sustained();
  const e1 = h.enemy({ hp: 50 });
  e1.takeDamage(999, false, {});
  assert.ok(near(h.sustained() - s0, p.stats.maxHP * 0.02, 1), `killHeal 2 %: ${h.sustained() - s0}`);
  h.tick(1);                                            // la cubeta se rellena
  s0 = h.sustained();
  const e2 = h.enemy({ hp: 50 });
  h.g.applyDoT(e2, 100, 5, 1, null, 'g_hendidura:bleed');
  assert.ok(killStatus(e2).bleeding && !killStatus(e2).burning, 'killStatus: sangra');
  e2.takeDamage(999, false, {});
  assert.ok(near(h.sustained() - s0, p.stats.maxHP * 0.05, 1), 'sangraba: 2 + 3 %');
  h.tick(1); s0 = h.sustained();
  const e3 = h.enemy({ hp: 50 });
  h.g.applyDoT(e3, 100, 5, 1, null, 'bola_fuego:burn');
  e3.takeDamage(999, false, {});
  assert.ok(near(h.sustained() - s0, p.stats.maxHP * 0.06, 1), 'ardía: 2 + 5 % (topado a 6 %/s por la cubeta)');
  assert.equal(h.g.kills.at(-1).kill.status.burning, true, 'KillInfo.status.burning real en el arnés');
  void hp0;
}
{ // recurso al matar (Maga): manaOnKill + burnKillMana / bleedKillMana
  const h = makeHarness({ classId: 'maga', level: 30, tv: { manaOnKill: 3, burnKillMana: 4, bleedKillMana: 7 } });
  const p = h.p; p.mp = 0;
  h.enemy({ hp: 20 }).takeDamage(99, false, {});
  assert.equal(Math.round(p.mp), 3, 'manaOnKill');
  const e = h.enemy({ hp: 20 }); h.g.applyDoT(e, 50, 5, 1, null, 'x:burn');
  e.takeDamage(99, false, {});
  assert.equal(Math.round(p.mp), 10, '+3 +4 si ardía');
  const b = h.enemy({ hp: 20 }); h.g.applyDoT(b, 50, 5, 1, null, 'x:bleed');
  b.takeDamage(99, false, {});
  assert.equal(Math.round(p.mp), 20, '+3 +7 si sangraba');
}
{ // Ejecutar: normales rematados, élites/jefes +40 aditivo y marca de remate
  const h = mk({ tv: { executePct: 20 } });
  const n = h.enemy({ hp: 1000 }); n.hp = 300;
  h.hit(n, { skill: 'g_tajo', dealt: 10 });
  assert.ok(n.alive, 'al 30 % no se remata');
  n.hp = 150;
  h.hit(n, { skill: 'g_tajo', dealt: 10 });
  assert.ok(!n.alive && wasExecuted(n), 'al 15 %: rematado');
  const el = h.enemy({ hp: 1000, rank: 'elite' }); el.hp = 150;
  h.hit(el, { skill: 'g_tajo', dealt: 10 });
  assert.ok(el.alive && wasExecuted(el), 'élite bajo el umbral: vivo pero marcado (remate al morir)');
  assert.equal(condAddPct({ executePct: 20 }, { targetElite: true, targetFrac: 0.15 }), EXECUTE_ELITE_ADD);
  assert.equal(condAddPct({ executePct: 20 }, { targetElite: true, targetFrac: 0.25 }), 0);
  assert.equal(condAddPct({ executePct: 20 }, { targetElite: false, targetFrac: 0.1 }), 0, 'normales: remate, no +40');
}
{ // combat-math: Presa, «ya estallaron», crítico contra enemigos en llamas
  assert.equal(condAddPct({ preyDmg: 10 }, { targetPrey: true }), 10);
  assert.equal(condAddPct({ preyDmg: 10 }, { targetElite: true }), 0, 'preyDmg solo contra la Presa');
  assert.equal(condAddPct({ explodedDmg: 15 }, { targetExploded: true, elem: 'fire' }), 15);
  assert.equal(condAddPct({ explodedDmg: 15 }, { targetExploded: true, elem: 'frost' }), 0, 'solo golpes de Fuego');
  assert.equal(condCritPct({ burningCrit: 12 }, { targetBurning: true }), 12);
  assert.equal(condCritPct({ burningCrit: 12 }, { targetBurning: false }), 0);
  // rollDamage pasa el estado real del objetivo (Quemadura viva)
  const h = makeHarness({ classId: 'maga', level: 30, tv: { burningCrit: 100 } });
  const e = h.enemy({ hp: 1e6 });
  let crits = 0;
  for (let i = 0; i < 20; i++) crits += h.p.rollDamage(1, 0, 0, e, { elem: 'fire' }).crit ? 1 : 0;
  h.g.applyDoT(e, 100, 4, 1, null, 'bola_fuego:burn');
  let critsB = 0;
  for (let i = 0; i < 20; i++) critsB += h.p.rollDamage(1, 0, 0, e, { elem: 'fire' }).crit ? 1 : 0;
  assert.ok(critsB > crits && critsB >= 15, `más críticos contra el que arde (${crits} → ${critsB}; tope 60 %)`);
}
{ // Pirotecnia (critFireCdr): crítico DIRECTO de Fuego, una vez por instante, no definitivas
  const h = makeHarness({ classId: 'maga', level: 30, tv: { critFireCdr: 0.5 } });
  const p = h.p, e = h.enemy({ hp: 1e6 });
  p.cds.bola_fuego = 5; p.cds.m_u_supernova = 30; p.cds.rayo = 2;
  h.hit(e, { skill: 'bola_fuego', crit: true, elem: 'fire' });
  h.hit(e, { skill: 'bola_fuego', crit: true, elem: 'fire' });
  assert.ok(near(p.cds.bola_fuego, 4.5), `−0,5 s una vez por instante: ${p.cds.bola_fuego}`);
  assert.equal(p.cds.m_u_supernova, 30, 'la definitiva no'); assert.equal(p.cds.rayo, 2, 'lo que no es de Fuego no');
  h.tick(0.1);
  h.hit(e, { skill: 'bola_fuego', crit: false, elem: 'fire' });
  h.hit(e, { skill: 'bola_fuego', crit: true, elem: 'fire', dot: true });
  assert.ok(near(p.cds.bola_fuego, 4.4, 1e-3), 'sin crítico o con un tic de DoT, nada');
}
{ // Espinas Venenosas (rootedWeak): Debilidad a los inmovilizados
  const h = mk({ tv: { rootedWeak: 10 } });
  const a = h.enemy({ hp: 1e6 }), b = h.enemy({ hp: 1e6, pos: [3, 0, 0] });
  a.applyCC('root', 2, { src: h.p });
  h.tick(0.1);
  assert.equal(a.debuffs.m_espinas_venenosas?.pct, 10, 'inmovilizado: +10 Debilidad');
  assert.ok(!b.debuffs.m_espinas_venenosas, 'el que no lo está, no');
}
{ // reducción de daño condicional (⑧ condDr)
  const taken = (h, opts = {}) => { const p = h.p; p.hp = p.stats.maxHP; p.shields = []; p.takeDamage(200, 1, opts); return p.stats.maxHP - p.hp; };
  const m = makeHarness({ classId: 'maga', level: 30, tv: { drHighMana: 20 } });
  m.p.mp = m.p.stats.maxMP; const hi = taken(m);
  m.p.mp = 0; const lo = taken(m);
  assert.ok(near(hi / lo, 0.8, 0.02), `Piel de Maná: con maná > 50 % −20 % (${hi} / ${lo})`);
  const g = mk({ tv: { drVsSlowed: 20, drMoving: 10 } });
  const src = g.enemy({ hp: 1e6 });
  g.p.moving = false;
  const base = taken(g, { source: src });
  src.applyCC('slow', 3, { pct: 50, src: g.p });
  const slowed = taken(g, { source: src });
  g.p.moving = true;
  const both = taken(g, { source: src });
  assert.ok(near(slowed / base, 0.8, 0.02) && near(both / base, 0.7, 0.02), `contra ralentizados −20 %, moviéndote −10 % más (${base} ${slowed} ${both})`);
  const f = makeHarness({ classId: 'arquera', level: 30, spec: 'francotiradora', tv: { drFocus: 20 } });
  f.gauge('concentracion', 40); const f40 = taken(f);
  f.gauge('concentracion', 60); const f60 = taken(f);
  assert.ok(near(f60 / f40, 0.8, 0.02), `Posición Elevada: Concentración > 50 → −20 % (${f40} → ${f60})`);
}

// ------------------------------------------------ 2) rootAdd / slowPctAdd · Estela que ralentiza
// rootAdd/slowPctAdd son del núcleo (resolveSkill): se prueban sobre una habilidad SINTÉTICA que inmoviliza 2 s
// (antes, la activa v1 a_t_cepo, que sale de los talentos en E1.5; la Trampa de Cepo la prueba KA-arquera)
{
  const cepoDef = { id: 't_cepo', name: 'Cepo de prueba', cat: 'utility', tags: ['utility', 'area', 'cc', 'nature'], elem: 'nature',
    type: 'area', at: 'target', coef: 0.6, cost: 10, cd: 8, radius: 1.5, range: 9, root: 2 };
  const h = makeHarness({ classId: 'arquera', level: 30, inject: { skills: [cepoDef] } });
  const cepo = h.p.cls.skills.find(s => s.id === 't_cepo');
  assert.equal(resolveSkill(h.p, cepo).root, 2);
  h.p.talentExtra.mods = { t_cepo: { rootAdd: 1.5 } }; h.p.recompute();
  assert.equal(resolveSkill(h.p, cepo).root, 3.5, 'rootAdd SUMA sobre la habilidad');
  h.p.talentExtra.mods = { t_cepo: { root: 1, rootAdd: 0.5 } }; h.p.recompute();
  assert.equal(resolveSkill(h.p, cepo).root, 2.5, 'root toma el MÁXIMO (2 > 1) + rootAdd');
  h.p.talentExtra.mods = { t_cepo: { root: 3 } }; h.p.recompute();
  assert.equal(resolveSkill(h.p, cepo).root, 3, 'root del mod mayor que el de la habilidad: manda el mod');
  const m = makeHarness({ classId: 'maga', level: 30 });
  m.p.talentExtra.mods = { nova_hielo: { slowPctAdd: 10 } }; m.p.recompute();
  assert.equal(resolveSkill(m.p, SK('maga', 'nova_hielo')).slowPct, 40, 'slowPctAdd: 30 + 10');
  // Estela: con slow (la Nova ralentiza) también ralentiza; sin slow, solo daña
  const e = m.enemy({ hp: 1e6, pos: [0.5, 0, 0] });
  m.g.spawnField('estela', { pos: new THREE.Vector3(0, 0, 0), radius: 2, dur: 2, owner: m.p, data: { dps: 10, slow: 3, slowPct: 30 } });
  m.step(0.6);
  assert.ok(e.slowT > 0 && e.slowPct === 30, 'Estela de una habilidad que ralentiza: ralentiza');
  const k = makeHarness({ classId: 'maga', level: 30 });
  const e2 = k.enemy({ hp: 1e6, pos: [0.5, 0, 0] });
  k.g.spawnField('estela', { pos: new THREE.Vector3(0, 0, 0), radius: 2, dur: 2, owner: k.p, data: { dps: 10 } });
  k.step(0.6);
  assert.ok(!(e2.slowT > 0) && e2.hp < e2.maxHP, 'sin slow: daña y no ralentiza');
  // Nova con mod.zone → su Estela lleva slow (canal real)
  const n = makeHarness({ classId: 'maga', level: 30 });
  n.p.talentExtra.mods = { nova_hielo: { zone: 1 } }; n.p.recompute();
  n.enemy({ hp: 1e6, pos: [1, 0, 0] }); n.aim(1, 0); n.setSlot('rmb', 'nova_hielo'); n.p.mp = n.p.stats.maxMP;
  assert.equal(n.cast('rmb'), true);
  n.step(0.2);
  const est = (n.g.fields || []).find(f => f.kind === 'estela' && !f.dead);
  assert.ok(est && est.data.slow > 0 && est.data.slowPct === 30, 'la Estela de la Nova ralentiza con su slowPct');
}

// ------------------------------------------------ 3) ⑪ ⑫ ⑬ y API de DoT
{
  const got = [];
  definePower('t72_res', { name: 'prueba', onResource(g, p, n, src) { got.push([n, src]); } });
  const h = mk({ powers: ['t72_res'] });
  h.p.mp = 0;
  h.g.gainResource(h.p, 10);
  h.g.gainResource(h.p, 5, { silent: true });
  assert.deepEqual(got.map(x => x[0]), [10], '⑪ solo lo ganado de verdad y sin silent');
  h.p.mp = h.p.stats.maxMP; h.g.gainResource(h.p, 10);
  assert.equal(got.length, 1, 'con el recurso lleno no se gana nada: sin evento');
}
{
  definePower('t72_ally', { name: 'prueba', onAllyDamaged(g, p, a, dmg) { dmg.amount *= 0.5; } });
  definePower('t72_save', { name: 'prueba', icd: 5, onAllyLethal(g, p, a) { return a.pos.distanceTo(p.pos) <= 10; } });
  const h = mk({ powers: ['t72_ally', 't72_save'] });
  const a = h.ally(3, 0, 1000), far = h.ally(30, 0, 1000);
  assert.ok(h.g.allies().includes(a), 'el aliado está en g.party / g.allies');
  a.takeDamage(100);
  assert.equal(a.hp, 950, '⑫ onAllyDamaged: la mitad');
  a.takeDamage(5000);
  assert.ok(a.alive && a.hp === 1, '⑫ onAllyLethal: queda a 1');
  const b = h.ally(2, 0, 100);
  b.takeDamage(500);
  assert.ok(!b.alive, 'icd del poder: el segundo golpe letal en 5 s ya no lo salva');
  h.tick(6);
  far.takeDamage(5000);
  assert.ok(!far.alive && far.hp === 0, 'el lejano cae (el poder no lo salva: no consume el icd)');
  const b2 = h.ally(2, 0, 100);
  b2.takeDamage(500);
  assert.ok(b2.alive && b2.hp === 1, 'pasada la recarga, vuelve a salvar');
  const solo = mk(); const c = solo.ally(2, 0, 100);
  c.takeDamage(500);
  assert.ok(!c.alive, 'sin poderes de aliados: cae');
}
{
  const ended = [];
  definePower('t72_dot', { name: 'prueba', onDotEnd(g, p, e, dot) { ended.push(dot); } });
  const h = mk({ powers: ['t72_dot'] });
  const g = h.g, e = h.enemy({ hp: 1e6 });
  g.applyDoT(e, 100, 4, 1, null, 'p_ignicion:burn');
  assert.equal(g.dotsOf(e, 'burn').length, 1); assert.equal(g.dotRemaining(e, 'burn'), 100);
  g.applyDoT(e, 40, 4, 1, null, 'p_ignicion:burn');
  assert.equal(g.dotRemaining(e, 'p_ignicion:burn'), 140, 'applyDoT integra lo pendiente');
  g.replaceDoT(e, 40, 4, 1, 'p_ignicion:burn');
  assert.equal(g.dotRemaining(e, 'burn'), 40, 'replaceDoT: lo pendiente se pierde');
  g.applyDoT(e, 60, 3, 1, null, 'g_hendidura:bleed');
  assert.equal(g.dotRemaining(e), 100, 'todas las fuentes');
  assert.equal(g.consumeDoT(e, 'burn'), 40, 'consumeDoT devuelve lo restante');
  assert.ok(!g.hasDoT(e, 'burn') && g.hasDoT(e, 'bleed'), 'y lo quita (el resto sigue)');
  h.step(3.2);
  assert.equal(ended.length, 1, '⑬ solo el que se agotó solo (no el consumido)');
  assert.equal(ended[0].kind, 'bleed'); assert.equal(ended[0].total, 60); assert.equal(ended[0].source, 'g_hendidura:bleed');
  const d = h.enemy({ hp: 30 });
  g.applyDoT(d, 300, 3, 1, null, 'x:burn');
  h.step(3.2);
  assert.ok(!d.alive && ended.length === 1, 'si el objetivo muere, no hay ⑬');
}

// ------------------------------------------------ 4) heal en un punto · escudo con dr · canal sin mantener
{
  const h = mk();
  const p = h.p; p.pos.set(0, 0, 0);
  const on = h.ally(20, 0, 1000), off = h.ally(30, 0, 500);
  on.hp = 100; off.hp = 100; p.hp = p.stats.maxHP * 0.5;
  const hp0 = p.hp;
  h.g.heal(a => a.stats.maxHP * 0.1, { target: 'all', pos: new THREE.Vector3(20, 0, 0), radius: 2 });
  assert.equal(on.hp, 200, 'cura a quien está sobre el punto (10 % de SU vida)');
  assert.equal(off.hp, 100, 'no al que está fuera'); assert.equal(p.hp, hp0, 'ni al héroe lejos del punto');
  h.g.shield(300, { target: 'self', dur: 5, src: 't72', dr: 20 });
  assert.equal(p.shieldDr(), 20, 'escudo con dr');
  p.shields[0].amt = 0;
  assert.equal(p.shieldDr(), 0, 'roto el escudo, sin dr');
}
{
  const h = mk();
  const g = h.g;
  g.input.held = () => false;                           // la tecla NO está mantenida
  let n = 0, done = 0;
  const ctx = { p: h.p, sk: { id: 't72' }, key: 'k3', res: { hits: 0, dealt: 0, killed: 0 } };
  g.startChannel(ctx, () => { done++; }, { dur: 1, ticks: 4, hold: false, onTick: () => { n++; } });
  h.step(1.2);
  assert.equal(n, 4, 'hold:false: los 4 tics sin mantener la tecla'); assert.equal(done, 1);
  let m = 0;
  g.startChannel({ ...ctx }, () => {}, { dur: 1, ticks: 4, onTick: () => { m++; } });
  h.step(1.2);
  assert.equal(m, 0, 'por defecto, soltar la tecla la corta');
}

// ------------------------------------------------ 5) básico de arma por ⑦ · passiveTick
{
  let seen = 0;
  definePower('t72_cast', { name: 'prueba', onCast(g, p, cast) { if (cast.weapon) { seen++; cast.forceCrit = true; } } });
  const h = mk({ powers: ['t72_cast'] });
  const e = h.enemy({ hp: 1e6, pos: [1.5, 0, 0] });
  h.p.basicAttack(e);
  assert.equal(seen, 1, 'el básico de arma pasa por onCast (cast.weapon)');
  assert.equal(e._lastCrit, true, 'cast.forceCrit = crítico seguro');
  definePower('t72_nocast', { name: 'prueba', onCast(g, p, cast) { return cast.weapon ? false : undefined; } });
  const k = mk({ powers: ['t72_nocast'] });
  const e2 = k.enemy({ hp: 1e6, pos: [1.5, 0, 0] });
  k.p.basicAttack(e2);
  assert.equal(e2.hp, e2.maxHP, 'onCast → false cancela el básico'); assert.equal(k.p.atkCd || 0, 0, 'sin consumir la cadencia');
  // arquera: el proyectil del básico lleva el crítico forzado
  const a = makeHarness({ classId: 'arquera', level: 30, powers: ['t72_cast'] });
  const t = a.enemy({ hp: 1e6, pos: [4, 0, 0] });
  a.p.basicAttack(t);
  a.step(0.6);
  assert.ok(t.hp < t.maxHP && t._lastCrit === true, 'flecha del básico: crítico forzado al impactar');
}
{
  let ticks = 0;
  defineSkillBehavior('t72_beh', { passiveTick() { ticks++; } });
  CLASSES.guerrero.skills.push({ id: 't72_sk', name: 'prueba', kind: 'talent', cat: 'spec', slots: ['k3'], tags: ['spec'], behavior: 't72_beh', req: 10 });
  const h = mk();
  h.tick(1);
  assert.equal(ticks, 0, 'sin conocerla, nada');
  h.p.talentExtra.grants.add('t72_sk'); h.p.recompute();
  assert.equal(h.p.hotbar.k3 === 't72_sk', false, 'no hace falta que esté en la barra');
  h.tick(1);
  assert.equal(ticks, 10, 'passiveTick a 10 Hz mientras la conoces');
  CLASSES.guerrero.skills.pop();
}

// ------------------------------------------------ 6) indicadores
{
  const b = mk({ spec: 'berserker' });
  gainGauge(b.p, 'sed', 5);
  assert.equal(gaugeValue(b.p, 'sed'), 5);
  b.p.addBuff('t72_sed', { 'gaugeGain:sed': 100 }, 5, {});
  gainGauge(b.p, 'sed', 5);
  assert.equal(gaugeValue(b.p, 'sed'), 15, "buff 'gaugeGain:sed': 100 → ×2");
  b.gauge('sed', 20);
  assert.equal(gaugeValue(b.p, 'sed'), 20, 'setGauge (arnés) no se multiplica');
  const f = makeHarness({ classId: 'arquera', level: 30, spec: 'francotiradora' });
  f.gauge('concentracion', 50);
  f.p.moving = true; firePower('onTick', f.p, f.g, f.p, 0.1);
  assert.ok(near(gaugeValue(f.p, 'concentracion'), 47.5), 'moverte vacía 25/s');
  f.p.addBuff('t72_vision', { 'gaugeLoss:concentracion': -100 }, 5, {});
  firePower('onTick', f.p, f.g, f.p, 0.1);
  assert.ok(near(gaugeValue(f.p, 'concentracion'), 47.5), "'gaugeLoss:concentracion': −100 → no pierde");
  f.p.buffs = []; f.p.recompute();
  f.p.talentExtra.powers.add('t72_acechador');
  definePower('t72_acechador', { name: 'prueba', stats: () => ({ 'gaugeLoss:concentracion': -40 }) });
  f.p.recompute();
  firePower('onTick', f.p, f.g, f.p, 0.1);
  assert.ok(near(gaugeValue(f.p, 'concentracion'), 46), 'stat de un poder: −40 % de pérdida');
}
{ // fervorChance (golpe del básico; Paso 2e: antes el Martillo), focusEnergy (Concentración llena), galeHeal/galeEnergy (Impulso lleno)
  const c = mk({ spec: 'cruzado', tv: { fervorChance: 100 } });
  const ce = c.enemy({ hp: 1e6 });
  firePower('afterCast', c.p, c.g, c.p, { sk: { id: 'g_martillo' } }, { hits: 2 });
  assert.equal(gaugeValue(c.p, 'fervor'), 0, 'el Martillo ya no tira fervorChance');
  c.hit(ce, { skill: 'g_tajo' });
  assert.equal(gaugeValue(c.p, 'fervor'), 1, 'fervorChance 100: +1 por golpe del básico');
  const f = makeHarness({ classId: 'arquera', level: 30, spec: 'francotiradora', tv: { focusEnergy: 8 } });
  f.p.mp = 0; f.gauge('concentracion', 100);
  assert.equal(Math.round(f.p.mp), 8, 'focusEnergy al llenar la Concentración');
  const t = makeHarness({ classId: 'arquera', level: 30, spec: 'tiradora', tv: { galeHeal: 4, galeEnergy: 10 } });
  t.p.mp = 0; t.p.hp = t.p.stats.maxHP * 0.5;
  const hp0 = t.p.hp;
  t.gauge('impulso', 100);
  assert.ok(near(t.p.hp - hp0, t.p.stats.maxHP * 0.04, 1), 'galeHeal 4 % (curación de habilidad)');
  assert.equal(Math.round(t.p.mp), 10, 'galeEnergy +10');
}

// ------------------------------------------------ 7) invisibilidad · dmgTakenPct
{
  const h = mk();
  const p = h.p;
  const e = h.enemy({ hp: 1e6, pos: [1.2, 0, 0] });
  e.aggroed = true;
  p.goInvisible(2);
  assert.ok(p.isInvisible());
  const hp0 = p.hp;
  for (let i = 0; i < 30; i++) e.update(1 / 30);
  assert.equal(e.aggroed, false, 'el enzarzado pierde el objetivo');
  assert.equal(p.hp, hp0, 'y no te ataca mientras dura');
  const x = h.enemy({ hp: 1e6, pos: [3, 0, 0] });
  for (let i = 0; i < 30; i++) x.update(1 / 30);
  assert.equal(x.aggroed, false, 'uno nuevo no se enzarza');
  p.reveal();
  for (let i = 0; i < 30; i++) { x.update(1 / 30); e.update(1 / 30); }
  assert.ok(x.aggroed && e.aggroed, 'al acabar, te vuelven a ver');
  h.tick(0.1); p.goInvisible(0.3); h.tick(0.5);
  assert.ok(!p.isInvisible(), 'la invisibilidad caduca sola');
}
{
  assert.equal(mitigate(100, { arm: 0, dr: 0, dmgTakenPct: 10 }, { rng: () => 0.99 }).dmg, 110, 'dmgTakenPct +10 %');
  const h = mk();
  h.p.addBuff('t72_tem', { dmgTakenPct: 10 }, 5, {});
  assert.equal(h.p.stats.dmgTakenPct, 10, 'stat de buff');
}
console.log('\n✅ NÚCLEO 2c.2 (nucleo_tv, rootAdd, ⑪⑫⑬, DoT, heal/shield, canal, básico ⑦, passiveTick, indicadores, invisibilidad) OK');
