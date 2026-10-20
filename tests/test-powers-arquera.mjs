// ============================================================
// Paso 2c.1 — PODERES y ACTIVAS DE TALENTO de la ARQUERA (js/powers-arquera.js)
// ============================================================
// (a) cobertura: todo power/grant de los árboles existe y se puede lanzar
// (b) al menos un caso de comportamiento por poder y por activa (arnés con talentos REALES)
// (c) definePower rechaza claves desconocidas · (d) ningún poder nuevo declara `mult`
// (e) Paso 2c.2: sin «anfitriones»: cada nodo con efecto propio lleva SU poder (ninguno en dos
//     nodos) o una clave tv del núcleo; los casos de cada nodo prueban las mismas cifras de 2c.1
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { makeHarness } from './helpers/power-harness.mjs';
import { missingFor, talentRefs, KEY_NODE_MULTS } from './helpers/talent-coverage.mjs';
import { POWER_HOOKS, SKILL_BEHAVIORS, definePower, firePower, powerState } from '../js/powers.js';
import { arqueraPowers, arqueraSkillBehaviors, arqueraFields } from '../js/powers-arquera.js';
import { gaugeState, gaugeMax } from '../js/spec-mechanics.js';
import { resolveSkill } from '../js/skill-resolve.js';
import { CLASSES } from '../js/data.js';
import { ARQUERA_TALENTS } from '../js/talents-arquera.js';
import { condAddPct } from '../js/combat-math.js';
import { FIELD_DEFS } from '../js/field-entities.js';
import { SKILL_FX } from '../js/fx-skills.js';

// los ganchos rotos se avisan con console.warn (firePower/canal): ninguno debe fallar
const warnings = [];
const warn0 = console.warn, err0 = console.error;
console.warn = (...a) => { warnings.push(a.map(String).join(' ')); };
console.error = (...a) => { warnings.push(a.map(String).join(' ')); };

const approx = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;
const SK = id => CLASSES.arquera.skills.find(s => s.id === id);
const mk = (spec, sp = {}, cls = {}, choice = {}, level = 50) =>
  makeHarness({ classId: 'arquera', level, spec, talents: { cls, spec: sp, choice } });
const ready = h => { const p = h.p; p.mp = p.stats.maxMP; p.gcdT = 0; p.actionLockT = 0; p.castLock = 0; p.basicAt = null; };
const ally = (x = 3, z = 0) => ({ pos: new THREE.Vector3(x, 0, z), alive: true, hp: 50, stats: { maxHP: 100, healPct: 0 }, buffs: [],
  addBuff(id, stats, dur) { this.buffs = this.buffs.filter(b => b.id !== id); this.buffs.push({ id, stats, t: dur, dur }); },
  healSkill(n) { const b = this.hp; this.hp = Math.min(this.stats.maxHP, this.hp + n); return this.hp - b; } });
const countProj = g => { const box = { n: 0 }; const orig = g.spawnProjectile.bind(g); g.spawnProjectile = o => { box.n++; orig(o); }; return box; };
const traps = h => (h.g.fields || []).filter(f => !f.dead && f.kind === 'a_cepo' && !f.sprung);

// ------------------------------------------------ (a) (c) (d) cobertura y registro
assert.deepEqual(missingFor('arquera'), { powers: [], behaviors: [], skills: [] });
assert.throws(() => definePower('arq_mal', { onHitt() {} }), /clave desconocida/);
for (const id of talentRefs('arquera').powers) if (!KEY_NODE_MULTS.includes(id)) assert.ok(!POWER_HOOKS[id].mult, `${id}: sin mult`);
for (const [id, d] of Object.entries(arqueraPowers())) { assert.ok(!('mult' in d), `${id}: sin mult`); assert.equal(POWER_HOOKS[id]?.name, d.name, `${id} registrado`); }
for (const id of Object.keys(arqueraSkillBehaviors())) assert.ok(SKILL_BEHAVIORS[id]?.cast, `${id}: comportamiento con cast`);
for (const kind of Object.keys(arqueraFields())) assert.ok(FIELD_DEFS[kind], `campo ${kind} registrado`);
for (const s of CLASSES.arquera.skills.filter(x => x.kind === 'talent')) assert.ok(SKILL_FX[s.id], `${s.id}: VFX/SFX`);
// Paso 2c.2: ningún poder de la Arquera está en dos nodos (ni en dos opciones de una elección)
{
  const owner = new Map();
  const trees = [['cls', ARQUERA_TALENTS.cls.nodes], ...ARQUERA_TALENTS.specs.map(sp => [sp.id, sp.nodes])];
  for (const [tree, nodes] of trees) for (const n of nodes) {
    const fxs = n.t === 'c' ? n.opts.map(o => [`${n.id}${o.k}`, o.fx || {}]) : [[n.id, n.fx || {}]];
    for (const [where, fx] of fxs) {
      if (!fx.power) continue;
      const here = `${tree}/${where}`;
      assert.ok(!owner.has(fx.power), `${fx.power}: en ${owner.get(fx.power)} y en ${here} (sin portadores)`);
      owner.set(fx.power, here);
    }
  }
  assert.ok(!owner.has('f_perch'), 'f_perch retirado (s8 es tv del núcleo)');
}
console.log(`Cobertura: ${Object.keys(arqueraPowers()).length} poderes, 13 comportamientos y 5 campos registrados; sin mult nuevo; un poder por nodo ✓`);

// ================================================ ÁRBOL DE CLASE
// a_tailwind (c5B Paso Ligero) — el Camuflaje (c12B) lleva ahora su propio poder
{
  const h = mk('francotiradora', {}, { c1: 2, c2: 1, c3: 1, c5: 1 }, { c5: 'B' });
  const p = h.p;
  const s0 = p.stats.spdPct;
  h.tick(0.2);
  assert.equal(p.stats.spdPct, s0 + 12, 'Paso Ligero: +12 % sin recibir daño');
  p.takeDamage(5, 1, {});
  assert.equal(p.stats.spdPct, s0, 'al recibir daño se pierde');
  h.tick(2.5); assert.equal(p.stats.spdPct, s0, '… durante 3 s');
  h.tick(0.7); assert.equal(p.stats.spdPct, s0 + 12, 'y vuelve');
  const c = mk('francotiradora', {}, { c12: 1 }, { c12: 'B', c5: 'A' });
  const c0 = c.p.stats.spdPct; c.tick(0.5);
  assert.equal(c.p.stats.spdPct, c0, 'con solo Camuflaje no da velocidad');
  assert.ok(c.p.powers.has('a_camuflaje') && !c.p.powers.has('a_tailwind'), 'c12B: su poder propio a_camuflaje');
}
// a_aura_halcon (c15): +5 % crítico y +6 % movimiento propios; a los aliados a 15 m
{
  const h = mk('francotiradora', {}, { c15: 1 });
  const p = h.p;
  assert.equal(p.powerStats.crit, 5); assert.equal(p.powerStats.spdPct, 6);
  const near = ally(5, 0), far = ally(30, 0);
  h.g.party = [near, far];
  h.tick(0.6);
  assert.ok(near.buffs.some(b => b.id === 'a_aura_halcon' && b.stats.crit === 5 && b.stats.spdPct === 6), 'aliado cercano con el aura');
  assert.ok(!far.buffs.length, 'el lejano no');
  h.g.party = [];
}
// a_t_voltereta (c2) + Cuero Curtido (c7) + disparo gratis
{
  const h = mk('francotiradora', {}, { c1: 2, c2: 1, c7: 2 });
  const p = h.p, g = h.g;
  const e = h.enemy({ hp: 1e7, pos: [5, 0, 0] });
  h.aim(5, 0); ready(h);
  h.setSlot('k1', 'a_t_voltereta');
  assert.equal(h.cast('k1'), true);
  h.step(0.4);
  assert.ok(approx(p.pos.x, -6, 0.05), `rueda 6 m hacia atrás (x=${p.pos.x.toFixed(2)})`);
  assert.ok(p.buffs.some(b => b.id === 'a_cuero_curtido' && b.stats.dr === 8), 'Cuero Curtido: −8 % extra 2 s');
  p.pos.set(0, 0, 0);
  h.setSlot('rmb', 'flecha_perforante');
  p.mp = p.stats.maxMP; const mp0 = p.mp;
  assert.equal(h.cast('rmb'), true);
  h.step(0.05);
  assert.ok(mp0 - p.mp < 1, `el siguiente disparo no cuesta Energía (${mp0} → ${p.mp.toFixed(1)})`);
  h.step(0.5); ready(h);
  const mp1 = p.mp;
  assert.equal(h.cast('rmb'), true); h.step(0.05);
  assert.ok(mp1 - p.mp > 15, 'solo el primero');
  h.step(2.5);
  assert.ok(!p.buffs.some(b => b.id === 'a_cuero_curtido'), 'el doble dura 2 s');
  void e; void g;
}
// a_t_conmocion (c3, tipo genérico): ralentiza 50 % 4 s
{
  const h = mk('francotiradora', {}, { c1: 2, c3: 1 });
  const e = h.enemy({ hp: 1e7, pos: [4, 0, 0] });
  h.aim(4, 0); ready(h); h.setSlot('k2', 'a_t_conmocion');
  assert.equal(h.cast('k2'), true); h.step(0.5);
  assert.ok(e.hp < e.maxHP && e.slowT > 3 && e.slowPct === 50, 'Disparo Conmocionante: 50 % durante 4 s');
}
// a_t_silencio (c5A): silencia 3 s; a los jefes +20 de stagger (no 40)
{
  const h = mk('francotiradora', {}, { c1: 2, c2: 1, c3: 1, c5: 1 }, { c5: 'A' });
  const e = h.enemy({ hp: 1e7, pos: [4, 0, 0] });
  h.aim(4, 0); ready(h); h.setSlot('k2', 'a_t_silencio');
  assert.equal(h.cast('k2'), true); h.step(0.5);
  assert.ok(e.silenceT > 2.4 && e.hp < e.maxHP, 'interrumpe y silencia 3 s');
  const b = h.enemy({ hp: 1e9, boss: true, pos: [0, 0, 5] });
  e.alive = false;
  h.aim(0, 5); ready(h); h.p.cds.a_t_silencio = 0;
  assert.equal(h.cast('k2'), true); h.step(0.5);
  assert.ok(b.stagger >= 20 && b.stagger < 25, `jefe: +20 de stagger (${b.stagger.toFixed(1)})`);
}
// a_t_bengala (c12A): +8 % de daño al grupo dentro, 8 s
{
  const h = mk('francotiradora', {}, { c12: 1 }, { c12: 'A' });
  const p = h.p;
  const a = ally(6, 0); h.g.party = [a];
  h.aim(4, 0); ready(h); h.setSlot('k2', 'a_t_bengala');
  const d0 = p.stats.dmgPct;
  assert.equal(h.cast('k2'), true);
  assert.ok(h.g.fields.some(f => f.kind === 'a_bengala'), 'campo de bengala');
  assert.equal(p.stats.dmgPct, d0 + 8, '+8 % de daño dentro');
  h.tick(0.6);
  assert.ok(a.buffs.some(b => b.id === 'a_t_bengala' && b.stats.dmgPct === 8), 'el aliado dentro también');
  h.tick(8.5);
  assert.ok(!h.g.fields.some(f => f.kind === 'a_bengala' && !f.dead) && p.stats.dmgPct === d0, 'dura 8 s');
  h.g.party = [];
}
// a_t_camuflaje (c12B) + a_camuflaje: invisibilidad REAL (Enemy.update del juego) y crítico
// seguro del primer ataque al salir (o del que la rompe), por ⑦ onCast → cast.forceCrit
{
  const h = mk('francotiradora', {}, { c12: 1 }, { c12: 'B' });
  const p = h.p, g = h.g;
  // avanza el arnés y la IA REAL de los enemigos indicados
  const run = (sec, list) => { for (let t = 0; t < sec - 1e-9; t += 0.05) { g.step(0.05); for (const e of list) if (e.alive) e.update(0.05); } };
  const near = h.enemy({ hp: 1e7, pos: [1.2, 0, 0] }); near.aggroed = true;   // enzarzado y pegado
  ready(h); h.setSlot('k2', 'a_t_camuflaje');
  assert.equal(h.cast('k2'), true);
  assert.ok(p.isInvisible(), 'invisible de verdad (p.goInvisible)');
  const fresh = h.enemy({ hp: 1e7, pos: [3, 0, 0] });                        // te «vería» al instante
  const hp0 = p.hp, at0 = near.pos.clone();
  run(2, [near, fresh]);
  assert.ok(!near.aggroed && near.pos.distanceTo(at0) < 1e-6 && p.hp === hp0, 'el enzarzado te pierde: ni te persigue ni te ataca');
  assert.ok(!fresh.aggroed, 'uno nuevo no se enzarza mientras dura');
  run(1.8, [fresh]);
  assert.ok(p.isInvisible() && !fresh.aggroed, 'durante los 4 s');
  run(0.5, []);
  assert.ok(!p.isInvisible() && !p.buffs.some(b => b.id === 'a_t_camuflaje'), 'a los 4 s se acaba');
  assert.ok(powerState(p, 'a_camuflaje').crit, 'y queda cebado el crítico del primer disparo');
  run(1.0, [fresh]);
  assert.ok(fresh.aggroed, 'al salir te vuelven a ver');
  for (const e of [near, fresh]) e.alive = false;
  // crítico de TODOS los impactos del ataque (aquí el básico de arma: cast.weapon)
  const crits = (e) => { const out = []; const td = e.takeDamage.bind(e); e.takeDamage = (a, crit, o = {}) => { if (!o.dot && !o.proc) out.push(!!crit); return td(a, crit, o); }; return out; };
  const tgt = h.enemy({ hp: 1e9, pos: [5, 0, 0] });
  const c1 = crits(tgt);
  h.aim(5, 0); ready(h);
  p.basicAttack(tgt); h.step(0.8);
  assert.ok(c1.length >= 1 && c1.every(Boolean), `el primer disparo al salir (básico de arma) es crítico (${c1})`);
  assert.ok(!powerState(p, 'a_camuflaje').crit, 'y se consume');
  // disparar durante el camuflaje lo rompe y ese disparo (todos sus proyectiles) es crítico
  p.cds.a_t_camuflaje = 0; ready(h);
  assert.equal(h.cast('k2'), true);
  assert.ok(p.isInvisible());
  ready(h); h.setSlot('rmb', 'flecha_multiple');
  c1.length = 0;
  assert.equal(h.cast('rmb'), true);
  assert.ok(!p.isInvisible(), 'atacar rompe el camuflaje (p.reveal)');
  h.step(0.8);
  assert.ok(c1.length >= 1 && c1.every(Boolean), `disparo desde el camuflaje: crítico (${c1})`);
  h.step(4);
  assert.ok(!powerState(p, 'a_camuflaje').crit, 'roto a mano, no deja otro crítico cebado');
  void g;
}
console.log('Árbol de clase: Paso Ligero, Halcón, Voltereta, Conmoción, Silencio, Bengala, Camuflaje ✓');

// ================================================ FRANCOTIRADORA
// f_aliento_cazador (s4): instantáneo con Concentración 100 y gasta 50; s11 (tv.focusEnergy del núcleo): Energía al llenar
{
  const h = mk('francotiradora', { s1: 3, s2: 2, s4: 1 });
  const p = h.p, g = h.g;
  h.enemy({ hp: 1e7, pos: [6, 0, 0] });
  h.aim(6, 0); ready(h); h.setSlot('k3', 'a_t_apuntado');
  assert.equal(h.cast('k3'), true);
  assert.ok(g._windup, 'sin Concentración: carga 1 s');
  g.cancelCast('dodge');
  ready(h); h.gauge('concentracion', 100);
  assert.equal(h.cast('k3'), true);
  assert.ok(!g._windup, 'con Concentración 100: al instante');
  assert.ok(approx(h.gaugeValue('concentracion'), 50), 'gasta 50 de Concentración');
  h.gauge('concentracion', 0); p.mp = 0; h.gauge('concentracion', 100);
  assert.equal(p.mp, 0, 'sin s11 no da Energía al llenar');
  const r = mk('francotiradora', { s8: 2, s11: 2 });
  r.p.mp = 0; r.gauge('concentracion', 100);
  assert.equal(r.p.mp, 16, 'Respiración Profunda: +16 de Energía al llenar');
}
// s8 Posición Elevada (tv.drFocus del núcleo): −3 %/rango, el doble con Concentración > 50 ·
// s15 Paso del Acechador (f_acechador: 'gaugeLoss:concentracion' −15): −15 % de pérdida
{
  const h = mk('francotiradora', { s8: 2 });
  const p = h.p;
  h.gauge('concentracion', 60);
  assert.equal(p.tv.dmgReduc, 6, 'la mitad incondicional (tv.dmgReduc)');
  assert.equal(firePower('condDr', p, p, {}), 6, 'Concentración > 50: +6 de reducción');
  h.gauge('concentracion', 40);
  assert.equal(firePower('condDr', p, p, {}), 0, '≤ 50: nada extra');
  const drain = (hh) => {
    hh.gauge('concentracion', 100);
    hh.p.moving = false; firePower('onTick', hh.p, hh.g, hh.p, 0.1);
    hh.p.moving = true;
    for (let i = 0; i < 10; i++) firePower('onTick', hh.p, hh.g, hh.p, 0.1);
    return hh.gaugeValue('concentracion');
  };
  assert.ok(approx(drain(h), 75, 1e-6), 'sin Acechador: −25/s');
  const s = mk('francotiradora', { s15: 1 });
  assert.ok(approx(drain(s), 78.75, 1e-6), 'Paso del Acechador: −15 % de pérdida');
  s.gauge('concentracion', 60);
  assert.equal(firePower('condDr', s.p, s.p, {}), 0, 'Paso del Acechador no da reducción sin s8');
}
// f_patience (s13B): +2 %/s quieta, máx. +20; se pierde al moverte
{
  const h = mk('francotiradora', { s13: 1 }, {}, { s13: 'B' });
  const p = h.p;
  const e = h.enemy({ hp: 1e6 });
  h.tick(5);
  assert.ok(approx(firePower('condAdd', p, p, e, {}), 10, 0.21), '5 s quieta: +10 %');
  h.tick(10);
  assert.equal(firePower('condAdd', p, p, e, {}), 20, 'tope +20 %');
  p.moving = true; firePower('onTick', p, h.g, p, 0.1);
  assert.equal(firePower('condAdd', p, p, e, {}), 0, 'moverse la pierde');
}
// f_overpen (s14): +15 % por enemigo atravesado · s6B f_herida_abierta: los críticos sangran el 80 %
{
  const h = mk('francotiradora', { s14: 1 });
  const p = h.p;
  const e = h.enemy({ hp: 1e7 });
  const hi = { skill: 'a_t_apuntado' };
  assert.deepEqual([0, 1, 2].map(() => firePower('condAdd', p, p, e, hi)), [0, 15, 30], '+15 % acumulado por atravesado');
  assert.equal(firePower('condAdd', p, p, e, { skill: 'flecha_perforante' }), 0, 'solo Disparo Apuntado');
  // disparo real: atraviesa toda la línea
  const line = [3, 5, 7].map(x => h.enemy({ hp: 1e7, pos: [x, 0, 0] }));
  e.alive = false;
  h.aim(8, 0); ready(h); h.setSlot('k3', 'a_t_apuntado');
  assert.equal(h.cast('k3'), true); h.step(1.8);
  assert.ok(line.every(x => x.hp < x.maxHP), 'la saeta atraviesa a los tres');
  const w = mk('francotiradora', { s6: 1 }, {}, { s6: 'B' });
  const t = w.enemy({ hp: 1e7 });
  w.hit(t, { skill: 'a_t_apuntado', crit: true, dealt: 1000 });
  assert.ok(w.g.hasDoT(t, 'a_t_apuntado:bleed'), 'Herida Abierta: el crítico sangra');
  assert.ok(approx(w.g.dotRemaining(t, 'a_t_apuntado:bleed'), 800, 6), 'el 80 % del golpe (redondeo por tic)');
  const t2 = w.enemy({ hp: 1e7, pos: [0, 0, 3] });
  w.hit(t2, { skill: 'a_t_apuntado', crit: false, dealt: 1000 });
  assert.ok(!w.g.hasDoT(t2, 'a_t_apuntado:bleed'), 'sin crítico no');
  assert.equal(firePower('condAdd', w.p, w.p, t, { skill: 'a_t_apuntado', _overpen: 2 }), 0, 'sin s14 no hay Sobrepenetración');
  const a = mk('francotiradora', { s6: 1 }, {}, { s6: 'A' });
  const t3 = a.enemy({ hp: 1e7 });
  a.hit(t3, { skill: 'a_t_apuntado', crit: true, dealt: 1000 });
  assert.ok(!a.g.hasDoT(t3, 'a_t_apuntado:bleed'), 'con Golpe de Gracia no sangra');
}
// f_weakspot (x1): marca élites/jefes 8 s (+15 % de crítico) · x2: daño crítico extra contra ellos
{
  const h = mk('francotiradora', { x1: 1, x2: 2 });
  const p = h.p;
  const el = h.enemy({ hp: 1e7, rank: 'elite' }), c = h.enemy({ hp: 1e7, pos: [0, 0, 3] });
  h.hit(el, { skill: 'a_t_apuntado' }); h.hit(c, { skill: 'a_t_apuntado' });
  assert.equal(firePower('condCrit', p, p, el, {}), 15, 'Punto Débil: +15 % de crítico');
  assert.equal(firePower('condCrit', p, p, c, {}), 0, 'un común no se marca');
  const hp0 = el.hp;
  h.hit(el, { skill: 'a_disparo', crit: false, dealt: 1000 });
  assert.equal(el.hp, hp0, 'Herida Expuesta: nada sin crítico');
  h.hit(el, { skill: 'a_disparo', crit: true, dealt: 1000 });
  assert.ok(el.hp < hp0 && hp0 - el.hp <= 1000 * 24 / 100 + 1, `con crítico: +daño crítico (saco aditivo) (${hp0 - el.hp})`);
  h.tick(8.1); h.gauge('concentracion', 0);
  assert.equal(firePower('condCrit', p, p, el, {}), 0, 'la marca dura 8 s');
}
// f_impossible (x3): con Concentración 100, dos disparos y el segundo crítico seguro
{
  const shots = (focus) => {
    const h = mk('francotiradora', { x3: 1 });
    const e = h.enemy({ hp: 1e9, pos: [6, 0, 0] });
    const crits = [];
    const td = e.takeDamage.bind(e);
    e.takeDamage = (a, crit, o = {}) => { if (o.skill === 'a_t_apuntado' && !o.dot && !o.proc) crits.push(!!crit); return td(a, crit, o); };
    h.aim(6, 0); ready(h); h.setSlot('k3', 'a_t_apuntado'); h.gauge('concentracion', focus);
    assert.equal(h.cast('k3'), true);
    h.step(2.2);
    return crits;
  };
  const two = shots(100), one = shots(50);
  assert.equal(two.length, 2, 'Concentración 100: se dispara dos veces');
  assert.equal(two[1], true, 'el segundo es crítico seguro');
  assert.equal(one.length, 1, 'sin Concentración llena, una vez (sin Eco del núcleo)');
}
// a_t_vision (s9): +25 % vel. de ataque, moverse no vacía la Concentración, Apuntado recarga +50 %
{
  const h = mk('francotiradora', { s9: 1 });
  const p = h.p;
  ready(h); h.setSlot('k3', 'a_t_vision');
  const a0 = p.stats.aspdPct;
  p.cds.a_t_apuntado = 6;
  h.gauge('concentracion', 80);
  assert.equal(h.cast('k3'), true);
  assert.ok(p.stats.aspdPct >= a0 + 25, 'Visión Certera: +25 % de velocidad de ataque');
  h.g.input.keyDir = { x: 1, z: 0 };                       // se mueve de verdad
  h.step(1);
  h.g.input.keyDir = null;
  assert.ok(p.pos.x > 2, 'se movió');
  assert.ok(h.gaugeValue('concentracion') >= 79.5, `moverse no vacía la Concentración (${h.gaugeValue('concentracion').toFixed(1)})`);
  assert.ok(approx(p.cds.a_t_apuntado, 4.5, 0.06), `Disparo Apuntado recarga un 50 % más rápido (${p.cds.a_t_apuntado.toFixed(2)})`);
  const n = mk('francotiradora', {});
  n.gauge('concentracion', 80); n.g.input.keyDir = { x: 1, z: 0 }; n.step(1);
  assert.ok(n.gaugeValue('concentracion') < 60, 'sin Visión, moverse sí la vacía');
}
// a_t_disuasorio (s13A): 120 % a quemarropa, aturde 1 s y te lanza 8 m atrás
{
  const h = mk('francotiradora', { s13: 1 }, {}, { s13: 'A' });
  const p = h.p;
  const e = h.enemy({ hp: 1e7, pos: [3, 0, 0] });
  h.aim(3, 0); ready(h); h.setSlot('k1', 'a_t_disuasorio');
  assert.equal(h.cast('k1'), true);
  h.step(0.5);
  assert.ok(e.hp < e.maxHP && e.stunT > 0.4, 'daña y aturde');
  assert.ok(approx(p.pos.x, -8, 0.31), `retroceso de 8 m (x=${p.pos.x.toFixed(2)})`);
}
console.log('Francotiradora: Aliento, Respiración, Posición Elevada, Acechador, Paciencia, Sobrepenetración, Herida Abierta, Punto Débil, Disparo Imposible, Visión, Disuasorio ✓');

// ================================================ MONTARAZ
const castTrap = (h, x, z) => { h.aim(x, z); ready(h); h.p.cds.a_t_cepo = 0; return h.cast('k3'); };
// a_t_cepo (s0): 1 carga de 8 s, hasta 3 armadas, inmoviliza 2 s y envenena · m_cepo_doble (s4) · m_extratrap (s14)
{
  const h = mk('montaraz', {});
  const p = h.p;
  h.setSlot('k3', 'a_t_cepo');
  assert.equal(castTrap(h, 4, 0), true);
  assert.equal(h.gaugeValue('coto'), 1, 'una trampa armada (Coto de Caza)');
  assert.ok(approx(p.cds.a_t_cepo, resolveSkill(p, SK('a_t_cepo')).cd), '1 carga: enfriamiento de 8 s');
  ready(h); assert.equal(h.cast('k3'), false, 'sin cargas no se lanza');
  for (const [x, z] of [[4, 3], [4, -3], [6, 0]]) { powerState(p, 'a_t_cepo').charges = 1; assert.equal(castTrap(h, x, z), true); h.step(0.05); }
  assert.equal(traps(h).length, 3, 'hasta 3 armadas: cae la más vieja');
  // salta: inmoviliza 2 s y envenena
  const e = h.enemy({ hp: 1e7, pos: [6, 0, 0] });
  h.step(0.1);
  assert.ok(approx(e.rootT, 2, 0.12) && h.g.hasDoT(e, 'a_t_cepo:poison'), 'inmoviliza 2 s y envenena');
  h.step(0.1);
  assert.equal(h.gaugeValue('coto'), 2, 'la trampa saltada desaparece');
  // Cepo Doble: 2 cargas seguidas; vuelve una a los 8 s
  const d = mk('montaraz', { s4: 1 });
  d.setSlot('k3', 'a_t_cepo');
  assert.equal(castTrap(d, 3, 0), true); d.step(0.3);
  ready(d); assert.equal(d.cast('k3'), true, '2.ª carga');
  d.step(0.3); ready(d); assert.equal(d.cast('k3'), false, 'sin una 3.ª');
  d.step(8); ready(d); assert.equal(d.cast('k3'), true, 'la carga vuelve a los 8 s');
  // Coto Cerrado: 4 armadas, +30 % de radio, máximo del indicador 4
  const c = mk('montaraz', { s14: 1 });
  c.setSlot('k3', 'a_t_cepo');
  for (const [x, z] of [[3, 3], [3, -3], [6, 3], [6, -3], [8, 0]]) { powerState(c.p, 'a_t_cepo').charges = 1; castTrap(c, x, z); c.step(0.05); }
  assert.equal(traps(c).length, 4, 'Coto Cerrado: 4 armadas');
  assert.equal(gaugeMax(c.p, 'coto'), 4);
  assert.ok(approx(traps(c)[0].radius, 1.5 * 1.3, 1e-6), '+30 % de radio de activación');
}
// Cepo de Hierro (s6A: mod.rootAdd + m_cepo_hierro) + Raíces Profundas (s16: mod.rootAdd):
// +1 y +0,5/rango que SE SUMAN (prof.root); jefes ralentizados 50 % (prof.bossSlowPct)
{
  const h = mk('montaraz', { s6: 1, s16: 2 }, {}, { s6: 'A' });
  h.setSlot('k3', 'a_t_cepo');
  const cp = resolveSkill(h.p, SK('a_t_cepo'));
  assert.ok(approx(cp.root, 4) && cp.bossSlowPct === 50, `perfil: root 4 s y bossSlowPct 50 (${cp.root}, ${cp.bossSlowPct})`);
  castTrap(h, 4, 0);
  const e = h.enemy({ hp: 1e7, pos: [4, 0, 0] });
  h.step(0.05);
  assert.ok(approx(e.rootT, 4, 0.06), `inmoviliza 2 + 1 + 1 = 4 s (${e.rootT.toFixed(2)})`);
  e.alive = false;
  h.p.cds.a_t_cepo = 0; powerState(h.p, 'a_t_cepo').charges = 1;
  castTrap(h, 0, 5);
  const b = h.enemy({ hp: 1e9, boss: true, pos: [0, 0, 5] });
  h.step(0.05);
  assert.ok(b.slowPct === 50 && b.slowT > 3 && b.stagger > 0, 'jefe: ralentizado 50 % y stagger (no inmovilizado)');
}
// Mina de Espinas (s6B: m_mina → prof.mine, mod.radius +100): estalla 120 % en 3 m, sin inmovilizar
{
  const h = mk('montaraz', { s6: 1 }, {}, { s6: 'B' });
  h.setSlot('k3', 'a_t_cepo');
  castTrap(h, 5, 0);
  assert.ok(approx(traps(h)[0].radius, 1.5), 'el disparador sigue en 1,5 m');
  const near = h.enemy({ hp: 1e7, pos: [7.4, 0, 0] });
  const e = h.enemy({ hp: 1e7, pos: [5, 0, 0] });
  h.step(0.05);
  assert.ok(e.hp < e.maxHP && near.hp < near.maxHP, 'la explosión alcanza 3 m');
  assert.ok(!(e.rootT > 0) && h.g.hasDoT(e, 'a_t_cepo:poison'), 'no inmoviliza; envenena al que la pisa');
  const blast = e.maxHP - e.hp;
  const mp = resolveSkill(h.p, SK('a_t_cepo'));
  assert.ok(mp.mine, 'perfil: prof.mine');
  // Paso 2c.2: el +120 % ya no está en mod.dmg (antes se descontaba aquí): addPct es el real
  const avg = h.p.avgHit(1.2 * mp.coef / 1.5, mp.addPct);
  assert.ok(blast < avg * 1.6 * 1.6, `la explosión es ≈120 % del arma, sin el +120 % aditivo (${blast} frente a ${avg.toFixed(0)})`);
}
// m_warden (s13B): las trampas curan un 3 %/s a los aliados encima (g.heal centrado en la trampa) ·
// s8 Pellejo de Oso (tv.drVsSlowed del núcleo)
{
  const h = mk('montaraz', { s13: 1 }, {}, { s13: 'B' });
  const p = h.p;
  h.setSlot('k3', 'a_t_cepo');
  castTrap(h, 0.5, 0);
  const a = ally(0.5, 0.5); h.g.party = [a];
  p.hp = p.stats.maxHP / 2; const hp0 = p.hp;
  h.tick(1.0);
  assert.ok(approx(p.hp - hp0, p.stats.maxHP * 0.03 + (0.4 + p.stats.vit * 0.02) * 1.0, p.stats.maxHP * 0.004), `Guardabosques: +3 %/s (${(p.hp - hp0).toFixed(1)})`);
  assert.ok(a.hp > 52, 'y al aliado encima');
  h.g.party = [];
  const s8 = mk('montaraz', { s8: 2 });
  const sp = s8.p;
  s8.setSlot('k3', 'a_t_cepo'); castTrap(s8, 0.5, 0);
  sp.hp = sp.stats.maxHP / 2; const h0 = sp.hp; s8.tick(1.0);
  assert.ok(sp.hp - h0 < sp.stats.maxHP * 0.01, 'sin s13B las trampas no curan');
  const slowE = s8.enemy({ hp: 1e6 }); slowE.applyCC('slow', 3, { pct: 40 });
  const fresh = s8.enemy({ hp: 1e6, pos: [0, 0, 3] });
  // 2c.1: tv.dmgReduc 10 + condDr −10 si no estaba ralentizado; 2c.2: solo la condicional
  assert.ok(!sp.tv.dmgReduc, 'Pellejo de Oso ya no da reducción incondicional');
  assert.equal(firePower('condDr', sp, sp, { src: slowE }), 10, 'Pellejo de Oso: contra ralentizados, −10 %');
  assert.equal(firePower('condDr', sp, sp, { src: fresh }), 0, 'contra los demás, nada');
}
// s10 Lazo Corredizo (m_lazo): inmoviliza solo al PRIMER enemigo
{
  const h = mk('montaraz', { s10: 2 });
  const p = h.p;
  const a = h.enemy({ hp: 1e7, pos: [3, 0, 0] }), b = h.enemy({ hp: 1e7, pos: [6, 0, 0] });
  h.aim(8, 0); ready(h); h.setSlot('rmb', 'flecha_perforante');
  assert.equal(h.cast('rmb'), true); h.step(0.8);
  assert.ok(a.hp < a.maxHP && b.hp < b.maxHP, 'atraviesa a los dos');
  assert.ok(approx(a.rootT, 1, 0.8) && a.rootT > 0.3 && !(b.rootT > 0), 'Lazo: solo el primero queda inmovilizado');
  const cd = mk('montaraz', { s10: 2 }); cd.setSlot('k3', 'a_t_cepo');
  castTrap(cd, 3, 0); cd.step(0.3); ready(cd);
  assert.equal(cd.cast('k3'), false, 'Lazo no da la 2.ª carga sin s4');
  assert.ok(cd.p.powers.has('m_lazo') && !cd.p.powers.has('m_cepo_doble'), 's10: su poder propio');
  void p;
}
// m_thornweb (x1): red entre trampas a ≤ 10 m (ralentiza 50 % y sangra) · x2 Zarzal · x3 Gran Cacería
{
  const h = mk('montaraz', { x1: 1, x2: 1, x3: 1 });
  const p = h.p;
  h.setSlot('k3', 'a_t_cepo');
  castTrap(h, 4, -4); powerState(p, 'a_t_cepo').charges = 1; castTrap(h, 4, 4);
  const e = h.enemy({ hp: 1e7, pos: [4, 0, 0], rank: 'elite' });
  h.hit(e, {});                                        // Presa
  assert.ok(e.prey);
  powerState(p, 'a_t_cepo').charges = 0; p.cds.a_t_cepo = 5;
  const hp0 = e.hp;
  h.tick(0.5);
  assert.ok(e.slowPct === 50 && e.slowT > 0, 'la red ralentiza un 50 %');
  assert.ok(h.g.hasDoT(e, 'm_thornweb:bleed'), 'y hace sangrar');
  assert.ok(e.hp < hp0, 'Zarzal: daño por segundo');
  assert.ok(p.buffs.some(b => b.id === 'm_greathunt' && b.stats.dmgPct === 15), 'Gran Cacería: +15 % de daño al grupo');
  assert.ok(p.cds.a_t_cepo === 0 && powerState(p, 'a_t_cepo').charges >= 1, 'y las trampas se rearman');
  const far = h.enemy({ hp: 1e7, pos: [9, 0, 0] });
  h.tick(0.5);
  assert.ok(!(far.slowT > 0), 'fuera de la red, nada');
  const lone = mk('montaraz', { x1: 1 });
  lone.setSlot('k3', 'a_t_cepo'); castTrap(lone, 4, -4); powerState(lone.p, 'a_t_cepo').charges = 1; castTrap(lone, 14, 4);
  const e2 = lone.enemy({ hp: 1e7, pos: [9, 0, 0] });
  lone.tick(0.5);
  assert.ok(!(e2.slowT > 0), 'trampas a más de 10 m no se unen');
}
// s3 Abrojos (m_abrojos: sustituye la Estela por un campo que ralentiza 30 %) y s11 Ponzoña Lenta (m_ponzona + tv.dotDur)
{
  const h = mk('montaraz', { s3: 2 });
  const p = h.p;
  const e = h.enemy({ hp: 1e7, pos: [5, 0, 0] });
  h.aim(5, 0); ready(h); h.setSlot('rmb', 'lluvia_flechas');
  assert.equal(h.cast('rmb'), true);
  h.step(1.8);
  const ab = h.g.fields.filter(f => !f.dead && f.kind === 'a_abrojos');
  assert.equal(ab.length, 1, 'Abrojos tras la Lluvia');
  assert.ok(approx(ab[0].dur, 4), '2 s/rango');
  assert.ok(!h.g.fields.some(f => !f.dead && f.kind === 'estela'), 'sin la Estela que dañaba');
  h.step(0.6);
  assert.ok(e.slowT > 0 && e.slowPct === 30, 'los abrojos ralentizan un 30 %');
  const pz = mk('montaraz', { s11: 1 });
  const t = pz.enemy({ hp: 1e7 });
  pz.g.applyDoT(t, 100, 2, 0.5, 'txt', 'prueba:poison');
  pz.step(0.6);
  assert.ok(t.slowT > 0 && t.slowPct === 10, 'Ponzoña Lenta: el Veneno ralentiza un 10 %');
  assert.equal(pz.p.tv.dotDur, 1.5, 'y dura +1,5 s');
  const sangre = pz.enemy({ hp: 1e7, pos: [0, 0, 3] });
  pz.g.applyDoT(sangre, 100, 2, 0.5, 'txt', 'prueba:bleed');
  pz.step(0.6);
  assert.ok(!(sangre.slowT > 0), 'el Sangrado no');
}
// s17 Espinas Venenosas (tv.rootedWeak: la aplica el núcleo, nucleo_tv)
{
  const h = mk('montaraz', { s14: 1, s17: 2 });
  const e = h.enemy({ hp: 1e7 });
  e.applyCC('root', 2, { src: h.p });
  h.tick(0.2);
  assert.equal(e.debuffs.m_espinas_venenosas?.pct, 20, 'inmovilizado: +20 % de Debilidad');
  const g2 = mk('montaraz', { s15: 1, s17: 1 });
  const e2 = g2.enemy({ hp: 1e7 }); e2.applyCC('root', 2, { src: g2.p }); g2.tick(0.2);
  assert.equal(e2.debuffs.m_espinas_venenosas?.pct, 10, 'también por la rama de s15');
  assert.ok(g2.p.powers.has('nucleo_tv') && !g2.p.powers.has('m_greathunt'), 'por el núcleo, sin poder ajeno');
  const free = g2.enemy({ hp: 1e7, pos: [0, 0, 3] }); g2.tick(0.2);
  assert.ok(!free.debuffs.m_espinas_venenosas, 'sin inmovilizar, nada');
}
// s15 Cazadora Paciente (tv.preyDmg: combat-math.condAddPct contra la Presa)
{
  const h = mk('montaraz', { s15: 2 });
  const p = h.p;
  const el = h.enemy({ hp: 1e7, rank: 'elite' }), el2 = h.enemy({ hp: 1e7, rank: 'elite', pos: [0, 0, 4] });
  h.hit(el, {});
  assert.ok(el.prey && !el2.prey);
  assert.equal(p.tv.preyDmg, 20);
  assert.ok(!p.tv.eliteDmg, 'ya no es eliteDmg corregido por un anfitrión');
  assert.equal(condAddPct(p.tv, { targetElite: true, targetPrey: !!el.prey }), 20, 'contra la Presa +20 %');
  assert.equal(condAddPct(p.tv, { targetElite: true, targetPrey: !!el2.prey }), 0, 'contra otro élite, nada');
  assert.equal(condAddPct(p.tv, { targetElite: false, targetPrey: false }), 0, 'un común tampoco');
}
// a_t_arpon (s9): atrae al objetivo hacia la trampa más cercana y lo ralentiza 60 %
{
  const h = mk('montaraz', { s9: 1 });
  const p = h.p;
  h.setSlot('k3', 'a_t_cepo'); castTrap(h, 4, 0);
  const e = h.enemy({ hp: 1e7, pos: [9, 0, 0] });
  h.aim(9, 0); ready(h); h.setSlot('k2', 'a_t_arpon');
  assert.equal(h.cast('k2'), true);
  h.step(0.6);
  assert.ok(e.pos.x < 5.5 && e.pos.x > 3.5, `atraído hacia la trampa (x=${e.pos.x.toFixed(2)})`);
  assert.ok(e.slowPct === 60 && e.rootT > 0, 'ralentizado 60 % y cae en la trampa');
  void p;
}
// a_t_senuelo (s13A): provoca 5 s a 8 m y estalla en espinas (200 % en 3 m)
{
  const h = mk('montaraz', { s13: 1 }, {}, { s13: 'A' });
  const p = h.p;
  const a = h.enemy({ hp: 1e7, pos: [6, 0, 0] }), b = h.enemy({ hp: 1e7, pos: [4, 0, 6] }), far = h.enemy({ hp: 1e7, pos: [-10, 0, 0] });
  h.aim(5, 0); ready(h); h.setSlot('k2', 'a_t_senuelo');
  assert.equal(h.cast('k2'), true);
  assert.ok(a.combatTarget(p)?.decoy && b.combatTarget(p)?.decoy, 'provoca a los enemigos a 8 m');
  assert.equal(far.combatTarget(p), p, 'no a los lejanos');
  h.tick(3);
  assert.ok(a.combatTarget(p)?.decoy, 'durante 5 s');
  const hpA = a.hp, hpB = b.hp;
  h.tick(2.2);
  assert.ok(a.hp < hpA, 'estalla: daña a los de 3 m');
  assert.equal(b.hp, hpB, 'no a los de más de 3 m');
  assert.equal(a.combatTarget(p), p, 'y deja de provocar');
}
console.log('Montaraz: Cepo (cargas, armadas, Hierro, Mina, Raíces), Guardabosques, Pellejo, Lazo, Red, Zarzal, Gran Cacería, Abrojos, Ponzoña, Espinas, Presa, Arpón, Señuelo ✓');

// ================================================ TIRADORA VELOZ
// a_t_andanada (s0) + t_andanada_impulsiva (s4): 12 flechas (+1) en 120°, retrocede 3 m, +20 Impulso
{
  const h = mk('tiradora', { s4: 1 });
  const p = h.p;
  const box = countProj(h.g);
  h.enemy({ hp: 1e7, pos: [5, 0, 0] });
  h.aim(5, 0); ready(h); h.setSlot('k3', 'a_t_andanada');
  assert.equal(h.cast('k3'), true);
  assert.equal(box.n, 13, '12 flechas + 1 de Tormenta de Flechas');
  assert.equal(h.gaugeValue('impulso'), 20, 'Andanada Impulsiva: +20 de Impulso');
  h.step(0.6);
  assert.ok(approx(p.pos.x, -3, 0.31), `retrocede 3 m (x=${p.pos.x.toFixed(2)})`);
  const n = mk('tiradora', {});
  n.enemy({ hp: 1e7, pos: [5, 0, 0] }); n.aim(5, 0); ready(n); n.setSlot('k3', 'a_t_andanada'); n.cast('k3');
  assert.equal(n.gaugeValue('impulso'), 0, 'sin s4 no da Impulso');
  // s6B Corona de Flechas (t_corona): 360° de verdad
  const c = mk('tiradora', { s6: 1 }, {}, { s6: 'B' });
  const fm = resolveSkill(c.p, SK('flecha_multiple'));
  const nn = fm.count + fm.proj;
  assert.equal(nn, 10, '5 + 4 + 1');
  assert.ok(approx(fm.spread, Math.PI * (nn - 1) / nn), 'Corona: las flechas cubren la vuelta entera');
  assert.ok(approx(resolveSkill(h.p, SK('flecha_multiple')).spread, SK('flecha_multiple').spread), 'sin s6B, el abanico de 50°');
}
// t_slipstream (s13B): estela que acelera a los aliados durante el Vendaval · s5 Viento de Cola
// (t_viento_cola) · s8 Esquiva Felina (tv.drMoving del núcleo)
{
  const h = mk('tiradora', { s13: 1 }, {}, { s13: 'B' });
  const p = h.p;
  h.gauge('impulso', 100);
  h.tick(1.0);
  assert.ok(!h.g.fields?.some(f => f.kind === 'a_estela_viento'), 'en solitario no deja estela');
  const a = ally(0, 0); h.g.party = [a];
  h.tick(1.0);
  assert.ok(h.g.fields.some(f => !f.dead && f.kind === 'a_estela_viento'), 'con grupo, deja la estela');
  assert.ok(a.buffs.some(b => b.id === 't_slipstream' && b.stats.spdPct === 15), 'el aliado en la estela: +15 % de velocidad');
  assert.ok(!p.buffs.some(b => b.id === 't_slipstream'), 'tú no');
  h.g.party = [];
  const v = mk('tiradora', { s5: 2 });
  ready(v); v.setSlot('k1', 'agilidad');
  const a0 = v.p.stats.aspdPct;
  const buffA = resolveSkill(v.p, SK('agilidad')).buff.aspdPct;
  assert.equal(v.cast('k1'), true);
  assert.equal(v.p.stats.aspdPct, a0 + buffA + 10, 'Viento de Cola: +10 de vel. de ataque con Agilidad');
  assert.equal(resolveSkill(v.p, SK('agilidad')).dur, 6 + 2, '+2 s de Agilidad');
  v.tick(8.2);
  assert.equal(v.p.stats.aspdPct, a0, 'al terminar, nada');
  // Paso 2c.2: el buff de Agilidad ya no lleva el +5 % relativo (mod.buff) que el texto no decía
  assert.equal(buffA, resolveSkill(mk('tiradora', {}).p, SK('agilidad')).buff.aspdPct, 'sin el +5 % relativo del buff');
  const f = mk('tiradora', { s8: 2 });
  // 2c.1: tv.dmgReduc 8 + condDr −8 quieta; 2c.2: solo la condicional
  assert.ok(!f.p.tv.dmgReduc, 'Esquiva Felina ya no da reducción incondicional');
  f.p.moving = false;
  assert.equal(firePower('condDr', f.p, f.p, {}), 0, 'Esquiva Felina: quieta, nada');
  f.p.moving = true;
  assert.equal(firePower('condDr', f.p, f.p, {}), 8, 'en movimiento, −8 %');
}
// t_galechain (s14): cada muerte en Vendaval +0,5 s (máx. +6) · s11 Segundo Aliento (tv.galeHeal + tv.galeEnergy del núcleo)
{
  const h = mk('tiradora', { s14: 1 });
  const p = h.p;
  h.gauge('impulso', 100);
  const gs = gaugeState(p, 'impulso');
  assert.equal(gs.galeT, 6);
  for (let i = 0; i < 3; i++) h.g.onEnemyKilled(h.enemy({ hp: 10 }));
  assert.ok(approx(gs.galeT, 7.5), 'tres muertes: +1,5 s');
  assert.ok(approx(p.buffs.find(b => b.id === 't_vendaval').t, 7.5), 'el buff del Vendaval también');
  for (let i = 0; i < 20; i++) h.g.onEnemyKilled(h.enemy({ hp: 10 }));
  assert.ok(approx(gs.galeT, 12), 'tope +6 s');
  const s = mk('tiradora', { s11: 2 });
  const sp = s.p;
  sp.hp = sp.stats.maxHP / 2; sp.mp = 0; const hp0 = sp.hp;
  s.gauge('impulso', 100);
  assert.ok(approx(sp.hp - hp0, sp.stats.maxHP * 0.08, 1), 'Segundo Aliento: +8 % de vida');
  assert.equal(sp.mp, 20, 'y +20 de Energía');
  const sg = gaugeState(sp, 'impulso');
  s.g.onEnemyKilled(s.enemy({ hp: 10 }));
  assert.equal(sg.galeT, 6, 'sin s14 las muertes no alargan el Vendaval');
}
// t_infinite (x1): cada 10 disparos, el siguiente gratis y con el doble de proyectiles · x2 Huracán · x3 Ojo del Huracán
{
  const h = mk('tiradora', { x1: 1, x2: 2 });
  const p = h.p;
  const proj = { prof: { tags: new Set(['proj']) } };
  const fm0 = resolveSkill(p, SK('flecha_multiple'));
  for (let i = 0; i < 9; i++) firePower('onCast', p, h.g, p, proj);
  assert.ok(!powerState(p, 't_infinite').ready, '9 disparos: aún no');
  const tgt0 = h.enemy({ hp: 1e7, pos: [5, 0, 0] });
  h.aim(5, 0); p.basicAttack(tgt0); h.step(0.6);           // el básico de ARMA también cuenta (⑦ cast.weapon)
  assert.ok(powerState(p, 't_infinite').ready, '10.º disparo: Ráfaga Infinita lista');
  const fm = resolveSkill(p, SK('flecha_multiple'));
  assert.equal(fm.cost, 0, 'no cuesta Energía');
  assert.equal(fm.count + fm.proj, 2 * (fm0.count + fm0.proj), 'el doble de proyectiles');
  assert.equal(fm.addPct, fm0.addPct + 20, 'Huracán: +20 % de daño');
  h.aim(5, 0); ready(h); h.setSlot('rmb', 'flecha_multiple');
  const mp0 = p.mp; const box = countProj(h.g);
  assert.equal(h.cast('rmb'), true);
  assert.equal(box.n, 2 * (fm0.count + fm0.proj), 'el disparo real sale doble');
  assert.ok(p.mp >= mp0 - 0.01, 'y gratis');
  assert.ok(!powerState(p, 't_infinite').ready, 'se consume');
  assert.equal(h.gaugeValue('impulso'), 20, 'Huracán: +20 de Impulso');
  const e = mk('tiradora', { x1: 1, x2: 1, x3: 1 });
  e.gauge('impulso', 100);
  for (let i = 0; i < 5; i++) firePower('onCast', e.p, e.g, e.p, proj);
  assert.ok(powerState(e.p, 't_infinite').ready, 'Ojo del Huracán: en Vendaval, cada 5 disparos');
  const q = mk('tiradora', { x1: 1, x3: 1 });
  for (let i = 0; i < 5; i++) firePower('onCast', q.p, q.g, q.p, proj);
  assert.ok(!powerState(q.p, 't_infinite').ready, 'fuera del Vendaval, cada 10');
}
// a_t_danza (s9): 16 flechas en 4 s, inmune a ralentizaciones, sin frenarte
{
  const h = mk('tiradora', { s9: 1 });
  const p = h.p;
  const box = countProj(h.g);
  h.enemy({ hp: 1e7, pos: [3, 0, 0] });
  h.aim(3, 0); ready(h); h.setSlot('k3', 'a_t_danza');
  assert.equal(h.cast('k3'), true);
  assert.ok(p.slowImmuneT > 3.9, 'inmune a las ralentizaciones');
  assert.equal(p.applySlow(2), false, 'no se le puede ralentizar');
  h.g.input.keyDir = { x: 0, z: 1 };
  h.step(4.5);
  h.g.input.keyDir = null;
  assert.equal(box.n, 16, '16 flechas');
  assert.ok(p.pos.z > 4, 'sin dejar de correr');
}
// a_t_salto (s13A): 7 m hacia atrás, 5 flechas al aterrizar, +30 de Impulso
{
  const h = mk('tiradora', { s13: 1 }, {}, { s13: 'A' });
  const p = h.p;
  const box = countProj(h.g);
  h.enemy({ hp: 1e7, pos: [4, 0, 0] });
  h.aim(4, 0); ready(h); h.setSlot('k1', 'a_t_salto');
  assert.equal(h.cast('k1'), true);
  assert.equal(h.gaugeValue('impulso'), 30, '+30 de Impulso');
  assert.ok(p.leap, 'salta');
  h.step(0.6);
  assert.ok(approx(p.pos.x, -7, 0.31), `7 m hacia atrás (x=${p.pos.x.toFixed(2)})`);
  assert.equal(box.n, 6, '5 flechas al aterrizar (+1 de Tormenta de Flechas)');
}
console.log('Tiradora: Andanada, Andanada Impulsiva, Corona, Estela, Viento de Cola, Esquiva Felina, Vendaval Perpetuo, Segundo Aliento, Ráfaga Infinita, Huracán, Ojo del Huracán, Danza, Salto ✓');

console.warn = warn0; console.error = err0;
assert.deepEqual(warnings, [], 'ningún poder ni comportamiento lanzó errores: ' + warnings.join(' | '));
console.log('\n✅ PODERES DE LA ARQUERA OK');
