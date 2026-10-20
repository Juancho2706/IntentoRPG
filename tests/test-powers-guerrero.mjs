// Paso 2c.1/2c.2 — PODERES y ACTIVAS DE TALENTO del GUERRERO (docs/paso2-diseno.md §9.1.5)
//  (a) todo power y grant de js/talents-guerrero.js existe y se puede lanzar (missingFor)
//  (b) al menos un caso de comportamiento por poder y por activa, con talentos REALES
//  (c) definePower rechaza claves desconocidas
//  (d) ningún poder del Guerrero declara `mult` (solo los nodos clave ya registrados)
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { makeHarness } from './helpers/power-harness.mjs';
import { missingFor, talentRefs, KEY_NODE_MULTS } from './helpers/talent-coverage.mjs';
import { POWER_HOOKS, SKILL_BEHAVIORS, definePower, firePower, powerState } from '../js/powers.js';
import { CLASSES } from '../js/data.js';
import { validateSkillDef } from '../js/skill-defs.js';
import { resolveSkill } from '../js/skill-resolve.js';
import { SKILL_FX, SKILL_FX_PRESETS } from '../js/fx-skills.js';
import { gainGauge, spendGauge } from '../js/spec-mechanics.js';
import { TALENT_TREES } from '../js/talents.js';
import { condAddPct } from '../js/combat-math.js';

globalThis.performance = globalThis.performance || { now: () => Date.now() };
const warns = [];
console.warn = (...a) => { warns.push(a.map(String).join(' ')); };
const approx = (a, b, e = 1e-6) => Math.abs(a - b) <= e;
const SK = id => CLASSES.guerrero.skills.find(s => s.id === id);
// arnés Nv20 con talentos reales; con especialización, su insignia en la ranura 3
const INSIGNIA = { berserker: 'g_t_remolino', guardian: 'g_t_desafio', cruzado: 'g_t_devocion' };
const H = (opts = {}) => {
  const h = makeHarness({ classId: 'guerrero', level: 20, ...opts });
  if (INSIGNIA[opts.spec]) h.setSlot('k3', INSIGNIA[opts.spec]);
  return h;
};
const buff = (a, id) => (a.buffs || []).find(b => b.id === id && b.t > 0);
// aliados: h.ally(x, z, maxHP) del arnés (entra en g.party; su daño va por g.damageAlly ⑫)
const lost = e => e.maxHP - e.hp;

// ------------------------------------------------ (a) cobertura
assert.deepEqual(missingFor('guerrero'), { powers: [], behaviors: [], skills: [] });
const refs = talentRefs('guerrero');
// Paso 2c.2: 29 poderes propios (los 26 de 2c.1 + g_instinto_asesino, g_martillo_pesado y
// g_consagracion, que antes eran nodos «portados») + m_berserk/m_aegis/m_judgment = 32
// poderes DISTINTOS referenciados (nucleo_tv no lo cita ningún nodo: lo añade recompute)
assert.equal(refs.powers.size, 32, '29 poderes propios + m_berserk/m_aegis/m_judgment');
// sin portadores: ningún poder del Guerrero está en dos nodos (ni en dos opciones)
{
  const seen = new Map();
  const t = TALENT_TREES.guerrero;
  for (const tree of [t.cls, ...t.specs]) for (const n of tree.nodes)
    for (const fx of n.t === 'c' ? (n.opts || []).map(o => o.fx || {}) : [n.fx || {}]) {
      if (!fx.power) continue;
      const where = `${tree.id || 'cls'}.${n.id}`;
      assert.ok(!seen.has(fx.power), `${fx.power} en dos nodos: ${seen.get(fx.power)} y ${where}`);
      seen.set(fx.power, where);
    }
  assert.equal(seen.size, refs.powers.size, 'un nodo por poder');
}
const TALENT = CLASSES.guerrero.skills.filter(s => s.kind === 'talent');
assert.equal(TALENT.length, 12);
for (const s of TALENT) {
  assert.deepEqual(validateSkillDef(s, { behaviors: SKILL_BEHAVIORS }), [], s.id);
  if (s.behavior) assert.ok(SKILL_BEHAVIORS[s.behavior]?.cast, `${s.id}: comportamiento con cast`);
  const fx = SKILL_FX[s.id];
  assert.ok(fx && fx.sfx, `${s.id}: VFX/SFX`);
  for (const k of ['trail', 'impact', 'aura', 'extra']) if (typeof fx[k] === 'string') assert.ok(SKILL_FX_PRESETS[fx[k]], `${s.id}: preset ${fx[k]}`);
}
for (const n of ['vengeanceWave', 'justiceSpark', 'recklessAura', 'shieldWall', 'devotionCircle', 'ironSkin', 'tauntMark', 'holyImpact'])
  assert.ok(SKILL_FX_PRESETS[n], `preset citado por los poderes: ${n}`);
console.log('(a) todos los poderes y activas del Guerrero existen y se lanzan ✓');

// ------------------------------------------------ (c) y (d)
assert.throws(() => definePower('t_mal_guerrero', { onHitt() {} }), /clave desconocida/);
for (const id of refs.powers) if (!KEY_NODE_MULTS.includes(id)) assert.ok(!POWER_HOOKS[id].mult, `${id}: sin mult`);
console.log('(c) definePower rechaza claves desconocidas · (d) ningún mult nuevo ✓');

// ================================================= ÁRBOL DE CLASE
// c2 Segundo Aliento: toda la Furia → 1 % de vida por cada 3
{
  const h = H({ talents: { cls: { c1: 2, c2: 1 } } });
  const p = h.p;
  h.setSlot('k2', 'g_t_aliento');
  p.hp = p.stats.maxHP * 0.4; p.mp = 99;
  const hp0 = p.hp;
  assert.equal(h.cast('k2'), true);
  assert.equal(p.mp, 0, 'consume toda la Furia');
  const prof = resolveSkill(p, SK('g_t_aliento'));
  assert.ok(approx(p.hp - hp0, p.stats.maxHP * 0.33 * prof.buffMul, 1), `99 de Furia → 33 % (×${prof.buffMul}): +${(p.hp - hp0).toFixed(1)}`);
  assert.ok(p.cds.g_t_aliento > 25, 'enfriamiento 30 s');
  p.cds.g_t_aliento = 0; p.mp = 0;
  h.step(0.25); h.cast('k2');
  assert.ok(!(p.cds.g_t_aliento > 0), 'sin Furia no gasta el enfriamiento');
}
// c3 Intervención: salto a un aliado + escudo del 15 % a ambos
{
  const h = H({ talents: { cls: { c1: 2, c3: 1 } } });
  const p = h.p, a = h.ally(6, 0);
  h.setSlot('k1', 'g_t_intervencion');
  h.aim(6, 0.5);
  assert.equal(h.cast('k1'), true);
  assert.ok(p.leap, 'salta');
  h.step(0.6);
  assert.ok(!p.leap && p.pos.distanceTo(a.pos) < 1.6, `cae junto al aliado (${p.pos.distanceTo(a.pos).toFixed(2)} m)`);
  const want = 0.15 * p.stats.maxHP * resolveSkill(p, SK('g_t_intervencion')).buffMul;
  assert.ok(approx(p.shieldTotal(), want, 1), 'escudo del 15 % para ti');
  assert.ok(a.shields.length === 1 && approx(a.shields[0].amt, want, 1), 'y para el aliado');
  // sin aliado: 8 m hacia la mira
  const s = H({ talents: { cls: { c1: 2, c3: 1 } } });
  s.setSlot('k1', 'g_t_intervencion'); s.aim(20, 0);
  s.cast('k1'); s.step(0.6);
  assert.ok(approx(s.p.pos.x, 7.8, 0.35) && s.p.shieldTotal() > 0, `sin aliado: 8 m al cursor (${s.p.pos.x.toFixed(2)})`);
}
// c12A Bramido de Guerra: +30 % de vida y se cura un 40 % (a ti y a los aliados a 15 m; 2e: 15/21 → 30/40 %)
{
  const h = H({ talents: { cls: { c12: 1 }, choice: { c12: 'A' } } });
  const p = h.p, a = h.ally(5, 0), far = h.ally(30, 0);
  a.hp = 500; far.hp = 500;
  h.setSlot('k2', 'g_t_bramido');
  const max0 = p.stats.maxHP;
  p.hp = max0 * 0.5;
  const hp0 = p.hp;
  assert.equal(h.cast('k2'), true);
  const prof = resolveSkill(p, SK('g_t_bramido'));
  assert.ok(buff(p, 'g_t_bramido') && approx(p.stats.maxHP, Math.round(max0 * (1 + prof.buff.hpPct / 100)), 2), `+${prof.buff.hpPct} % de vida máxima`);
  // la cura usa la vida máxima NUEVA (addBuff recalcula antes): 40 % × potencia de rango
  assert.ok(p.hp - hp0 >= p.stats.maxHP * 0.42, `se cura el 40 % de la vida NUEVA (${Math.round(p.hp - hp0)} de ${p.stats.maxHP})`);
  assert.ok(buff(a, 'g_t_bramido') && a.healed > 140, 'el aliado cercano también');
  assert.ok(!buff(far, 'g_t_bramido') && far.healed === 0, 'el lejano no');
}
// c12B Coraza de Hierro: al bajar del 30 %, −30 % de daño 5 s (una vez cada 60 s)
{
  const h = H({ talents: { cls: { c12: 1 }, choice: { c12: 'B' } } });
  const p = h.p, max = p.stats.maxHP;
  assert.ok(p.powers.has('g_coraza_hierro'));
  p.hp = max * 0.32;
  firePower('onDamaged', p, h.g, p, { amount: max * 0.05 });
  assert.ok(buff(p, 'g_coraza_hierro') && p.stats.dr >= 30, 'cruza el 30 % → −30 % de daño');
  h.tick(5.2);
  assert.ok(!buff(p, 'g_coraza_hierro'), 'dura 5 s');
  p.hp = max * 0.32;
  firePower('onDamaged', p, h.g, p, { amount: max * 0.05 });
  assert.ok(!buff(p, 'g_coraza_hierro'), 'una vez cada 60 s');
}
// c14 Maestro de Armas: +10 % de daño crítico (tv) y cada crítico da 2 de Furia (recalibrado en 2c.2: 15 % / 3)
{
  const h = H({ talents: { cls: { c14: 1 } } });
  const p = h.p, e = h.enemy({ hp: 1e6 });
  p.mp = 0;
  h.hit(e, { skill: 'g_tajo', crit: false });
  assert.equal(p.mp, 0);
  h.hit(e, { skill: 'g_tajo', crit: true });
  assert.equal(p.mp, 2, 'crítico → +2 de Furia');
  assert.equal(p.stats.critDmg, 10);
}
// c15 Hermandad de Armas: +5 % de daño y +8 % de vida; aliados a 15 m; +5 % de Furia por aliado
{
  const base = H();
  const h = H({ talents: { cls: { c15: 1 } } });
  const p = h.p;
  assert.equal(p.stats.dmgPct - base.p.stats.dmgPct, 5, '+5 % de daño');
  assert.ok(approx(p.stats.maxHP, Math.round(base.p.stats.maxHP * 1.08), 1), '+8 % de vida máxima');
  const a = h.ally(4, 0), far = h.ally(40, 0);
  h.tick(0.6);
  assert.ok(buff(a, 'g_aura_hermandad') && !buff(far, 'g_aura_hermandad'), 'el aura alcanza a los aliados a 15 m');
  // la Furia extra va por ⑪ onResource (lo REALMENTE ganado por gainResource)
  p.mp = 10; h.tick(0.1);
  const mid = p.mp;
  h.g.gainResource(p, 20);                            // +20 de Furia ganada → +1 (5 % × 1 aliado)
  assert.ok(approx(p.mp, mid + 21, 1e-6), `Furia +5 % por aliado (${mid} → ${p.mp})`);
  const solo = H({ talents: { cls: { c15: 1 } } });
  solo.tick(0.6); solo.p.mp = 10; solo.g.gainResource(solo.p, 20);
  assert.equal(solo.p.mp, 30, 'en solitario la parte de Furia es 0');
}
console.log('Clase: Segundo Aliento, Intervención, Bramido, Coraza, Maestro de Armas, Hermandad ✓');

// ================================================= BERSERKER
const B = (spec = {}, extra = {}) => H({ spec: 'berserker', talents: { spec, ...extra } });
// s0 Remolino Sangriento: 10 golpes en 3 s a 2,9 m + Sangrado; no exige mantener la tecla
{
  const h = B({ s4: 1 });
  const p = h.p;
  h.g.input.held = () => false;                       // pulsar y soltar: sigue girando
  const es = [0, 1, 2, 3, 4, 5].map(i => h.enemy({ hp: 1e6, pos: [Math.cos(i) * 1.5, 0, Math.sin(i) * 1.5] }));
  const out = h.enemy({ hp: 1e6, pos: [5.5, 0, 0] });
  p.mp = 100;
  assert.equal(h.cast('k3'), true);
  assert.equal(p.mp, 70, 'cuesta 30 de Furia');
  h.step(1.0);
  p.pos.x += 0.5;                                     // te mueves mientras giras
  h.step(2.3);
  assert.ok(!h.g._channel, 'termina tras 2 s (2e)');
  const prof = resolveSkill(p, SK('g_t_remolino'));
  const per = p.avgHit(prof.coef, prof.addPct);
  assert.ok(lost(es[0]) > per * 7, `golpea ~10 veces (${(lost(es[0]) / per).toFixed(1)} golpes medios)`);
  assert.equal(lost(out), 0, 'fuera del radio no');
  assert.ok(h.g.hasDoT(es[0], 'g_t_remolino:bleed'), 'desangra');
  // s4 Remolino Sediento: +2 Sed por golpe (2e), máx. 20 por uso
  assert.equal(powerState(p, 'g_remolino_sediento').got, 20, 'Remolino Sediento: 2 por golpe → tope 20');
  assert.ok(h.gaugeValue('sed') >= 20, 'la Sed sube');
  // la esquiva lo corta
  p.cds.g_t_remolino = 0; p.mp = 100; h.step(0.3);
  h.cast('k3'); h.step(0.4);
  h.g.cancelCast('dodge');
  assert.ok(!h.g._channel, 'la esquiva corta el giro');
}
// s6A Carnicería: +40 % de radio y el Sangrado salta a 1 cercano (2e: +40 → +10 → +40 %, ÁREA×5 con la manada que camina)
{
  const h = B({ s6: 1 }, { choice: { s6: 'A' } });
  const p = h.p;
  const prof = resolveSkill(p, SK('g_t_remolino'));
  assert.ok(approx(prof.radius, 2.9 * 1.4, 1e-9) && prof.chain === 1, 'radio ×1,4 y salto a 1');
  const e = h.enemy({ hp: 1e6, pos: [2, 0, 0] });
  // fuera del giro (radio 4,06 + 0,5) pero a ≤ 4 m del golpeado
  const near = [h.enemy({ hp: 1e6, pos: [5.5, 0, 0] }), h.enemy({ hp: 1e6, pos: [4, 0, 3] })];
  const third = h.enemy({ hp: 1e6, pos: [5.2, 0, -2] });
  p.mp = 100; h.cast('k3'); h.step(0.32);
  assert.ok(h.g.hasDoT(e, 'g_t_remolino:bleed'), 'el golpeado sangra');
  const jumped = [...near, third].filter(o => h.g.hasDoT(o, 'g_t_remolino:bleed'));
  assert.equal(jumped.length, 1, 'el Sangrado salta a 1 cercano por golpe');
  assert.ok([...near, third].every(o => o.hp === o.maxHP || h.g.hasDoT(o)), 'sin que el giro los golpee');
}
// s5 Instinto Asesino (poder propio g_instinto_asesino): cada crítico suma 2 de Sed (solo con s5)
{
  const h = B({ s5: 1 });
  const e = h.enemy({ hp: 1e6 });
  assert.ok(h.p.powers.has('g_instinto_asesino') && !h.p.powers.has('g_carnicero'), 's5 lleva g_instinto_asesino (ya no porta g_carnicero)');
  h.hit(e, { skill: 'g_mandoble', crit: true });
  assert.equal(h.gaugeValue('sed'), 2, 'crítico → +2 Sed');
  const n = B({ s8: 1 });
  n.hit(n.enemy({ hp: 1e6 }), { skill: 'g_mandoble', crit: true });
  assert.equal(n.gaugeValue('sed'), 0, 'sin Instinto Asesino no hay Sed por crítico');
}
// s8 Festín de Sangre y s15 Sed Insaciable (tv.bleedKillHeal / bleedKillMana del núcleo):
// matar a un enemigo que SANGRA → vida y Furia
{
  const h = B({ s8: 2, s15: 2 });
  const p = h.p;
  assert.ok(p.powers.has('nucleo_tv') && !p.powers.has('g_carnicero'), 'lo aplica el núcleo (nucleo_tv)');
  p.hp = p.stats.maxHP * 0.5; p.mp = 0;
  const e = h.enemy({ hp: 100 });
  h.g.applyDoT(e, 30, 3, 1, undefined, 'torbellino:bleed');
  const s0 = h.sustained();
  e.takeDamage(500, false, {});
  assert.ok(approx(h.sustained() - s0, p.stats.maxHP * 0.04, 1), 'Festín de Sangre: 4 % (2 rangos) por sustento');
  assert.equal(p.mp, 8, 'Sed Insaciable: +8 de Furia');
  const f = h.enemy({ hp: 100 });
  const s1 = h.sustained();
  f.takeDamage(500, false, {});
  assert.equal(h.sustained(), s1, 'si no sangra, nada');
  assert.equal(p.mp, 8);
}
// x1 Ejecutar (tv.executePct del núcleo) · x2 Carnicero · x3 Matanza Eterna (wasExecuted)
{
  const h = B({ x1: 1, x2: 2, x3: 1, s14: 1 });
  const p = h.p;
  // +40 a élites/jefes: ahora es combat-math.condAddPct (contexto de rollDamage), no un condAdd de poder
  const execAdd = en => condAddPct(p.tv, { targetElite: !!en.def?.rank, targetFrac: en.hp / en.maxHP });
  const e = h.enemy({ hp: 1000 });
  const thr = p.tv.executePct;                      // 2e: x1 da 6 (más las fuentes de clase)
  e.hp = (thr + 5) * 10;
  h.hit(e, { skill: 'g_tajo' });
  assert.ok(e.alive, 'por encima del umbral no remata');
  e.hp = (thr - 1) * 10;
  p.mp = 0;
  h.hit(e, { skill: 'g_tajo' });
  assert.ok(!e.alive, `Ejecutar: remata a los normales bajo el ${thr} %`);
  assert.equal(h.gaugeValue('sed'), 30, 'Carnicero: +15 Sed por rango (2) por remate');
  assert.equal(p.mp, 5, 'Carnicero: +5 de Furia (2e)');
  const el = h.enemy({ hp: 1000, rank: 'elite' });
  el.hp = (thr - 1) * 10;
  assert.equal(execAdd(el), 25, 'élites bajo el umbral: +25 % (tv.executeDmg; 2c.2: era 40)');
  h.hit(el, { skill: 'g_tajo' });
  assert.ok(el.alive, 'a los élites no los remata');
  el.hp = 500;
  assert.equal(execAdd(el), 0);
  // Matanza Eterna: rematar durante el Desenfreno lo alarga 2 s
  h.gauge('sed', 100);
  const b = buff(p, 'g_desenfreno');
  assert.ok(b, 'Sangre Hirviente: Desenfreno');
  const t0 = b.t;
  const o = h.enemy({ hp: 1000 }); o.hp = (thr - 1) * 10;
  h.hit(o, { skill: 'g_tajo' });
  assert.ok(!o.alive && approx(b.t, t0 + 2, 1e-6), `Matanza Eterna: +2 s (${t0} → ${b.t})`);
  // la muerte de un élite tras bajar del umbral también es remate
  const el2 = h.enemy({ hp: 1000, rank: 'elite' });
  el2.hp = (thr - 1) * 10; h.hit(el2, { skill: 'g_tajo' });
  const t1 = b.t;
  el2.takeDamage(999, false, {});
  assert.ok(approx(b.t, t1 + 2, 1e-6), 'élite que muere bajo el umbral: remate');
}
// s14 Sangre Hirviente: Desenfreno 8 s (+30 % vel. de ataque, 1 % de vida por golpe)
{
  const h = B({ s14: 1 });
  const p = h.p;
  const at0 = p.stats.atkTime;
  h.gauge('sed', 100);
  assert.ok(buff(p, 'g_desenfreno') && p.stats.aspdPct >= 30 && p.stats.atkTime < at0, 'Desenfreno: +30 % de velocidad de ataque');
  p.hp = p.stats.maxHP * 0.5;
  const s0 = h.sustained();
  h.hit(h.enemy({ hp: 1e6 }), { skill: 'g_tajo' });
  assert.ok(approx(h.sustained() - s0, p.stats.maxHP * 0.01, 1), 'cada golpe cura un 1 % (sustento)');
  h.tick(8.2);
  assert.ok(!buff(p, 'g_desenfreno'), 'dura 8 s');
}
// s9 Temeridad: +25 % de crítico, Sed ×2 y +10 % de daño recibido (10 s)
{
  const h = B({ s9: 1 });
  const p = h.p;
  assert.ok(!p.powers.has('g_carnicero'), 'Temeridad ya no necesita poder: todo va en su buff');
  p.combatRng = () => 0.99;                           // sin bloqueos al azar
  // daño REAL recibido (Player.takeDamage → mitigate × takenMult), con la vida llena
  const hurt = () => { p.hp = p.stats.maxHP; p.takeDamage(100, 1, {}); return p.stats.maxHP - p.hp; };
  const l0 = hurt();
  h.setSlot('k3', 'g_t_temeridad');
  const c0 = p.stats.crit;
  assert.equal(h.cast('k3'), true);
  assert.ok(buff(p, 'g_t_temeridad') && p.stats.crit > c0, 'más crítico');
  h.gauge('sed', 0);
  gainGauge(p, 'sed', 10);
  assert.equal(h.gaugeValue('sed'), 20, 'la Sed se llena el doble (stat gaugeGain:sed del buff)');
  assert.equal(p.stats.dmgTakenPct, 10, 'stat dmgTakenPct +10 mientras dura');
  const l1 = hurt();
  assert.ok(l1 > l0 && approx(l1, l0 * 1.1, 0.51), `recibes +10 % de daño (redondeo a enteros) (${l0.toFixed(2)} → ${l1.toFixed(2)})`);
  h.tick(10.2);
  assert.ok(!buff(p, 'g_t_temeridad') && !(p.stats.dmgTakenPct > 0), 'al terminar, nada');
  assert.ok(approx(hurt(), l0, 1e-6), 'daño recibido normal otra vez');
  h.gauge('sed', 0);
  gainGauge(p, 'sed', 10);
  assert.equal(h.gaugeValue('sed'), 10, 'Sed normal otra vez');
}
// s13A Negación de la Muerte · s13B Ira Ciega
{
  const h = B({ s13: 1 }, { choice: { s13: 'A' } });
  const p = h.p;
  p.takeDamage(p.stats.maxHP * 50, 1, {});
  assert.ok(p.alive && p.hp >= 1 && p.hp < 2, 'un golpe letal te deja a 1');
  assert.ok(p.gauges.sed.satedT > 0, 'y con la Sed llena (Sed Saciada)');
  h.tick(1);
  p.takeDamage(p.stats.maxHP * 50, 1, {});
  assert.ok(!p.alive, 'una vez cada 2 minutos');
  const r = B({ s13: 1 }, { choice: { s13: 'B' } });
  const q = r.p;
  r.setSlot('k2', 'g_t_ira_ciega');
  const hp0 = q.hp, d0 = q.stats.dmgPct;
  assert.equal(r.cast('k2'), true);
  assert.ok(approx(q.hp, hp0 * 0.9, 1), 'Ira Ciega: pagas un 10 % de tu vida');
  assert.ok(q.stats.dmgPct - d0 >= 30 && q.unstoppableT > 5, '+30 % de daño e imparable');
  assert.equal(q.applySlow(2), false, 'inmune a ralentizar');
}
console.log('Berserker: Remolino Sangriento (+Sediento, Carnicería), Instinto, Festín, Sed Insaciable, Ejecutar, Carnicero, Matanza Eterna, Desenfreno, Temeridad, Negación, Ira Ciega ✓');

// ================================================= GUARDIÁN
const G = (spec = {}, extra = {}) => H({ spec: 'guardian', talents: { spec, ...extra } });
// s0 Grito Desafiante (+ s4 Desafío Firme · s6A Cerco)
{
  const h = G({ s4: 1 });
  const p = h.p;
  const es = [h.enemy({ pos: [3, 0, 0] }), h.enemy({ pos: [0, 0, 8] })];
  const far = h.enemy({ pos: [14, 0, 0] });
  p.mp = 0;
  assert.equal(h.cast('k3'), true);
  assert.ok(es.every(e => e.tauntT > 0 && e.tauntSrc === p) && !(far.tauntT > 0), 'provoca a todos a 10 m');
  assert.equal(p.mp, 20, '+20 de Furia');
  assert.equal(h.gaugeValue('bastion'), 2, 'Desafío Firme: +2 Bastión');
  // 2e: los provocados te hacen −weakenPct % de daño mientras dura (× potencia del rango)
  const dp = resolveSkill(p, SK('g_t_desafio'));
  assert.ok(approx(es[0].outDmgMul(), 1 - Math.round(SK('g_t_desafio').weakenPct * dp.buffMul) / 100, 1e-9) && far.outDmgMul() === 1, `Grito Desafiante debilita a los provocados (×${es[0].outDmgMul()})`);
  const c = G({ s6: 1 }, { choice: { s6: 'A' } });
  const ce = c.enemy({ pos: [14, 0, 0] });
  c.cast('k3');
  assert.ok(ce.tauntT > 0 && ce.slowT > 2.5, 'Cerco: +50 % de radio y ralentiza 3 s');
  const none = G();
  none.cast('k3');
  assert.ok(!(none.p.cds.g_t_desafio > 0) && none.p.mp === 0, 'sin enemigos: ni enfriamiento ni Furia');
}
// s7 Martillo Pesado (poder propio g_martillo_pesado): Martillo a 3+ → +1 Bastión · s8 Recuperación (tv.killHeal)
{
  const h = G({ s7: 1, s8: 2 });
  const p = h.p;
  assert.ok(p.powers.has('g_martillo_pesado') && !p.powers.has('g_desafio_firme') && p.powers.has('nucleo_tv'), 's7 lleva g_martillo_pesado; s8, la clave del núcleo');
  // 2e: el Martillo de la clase es la onda ligera (0,34, el constructor de Fervor del Cruzado);
  // con Martillo Pesado pasa a un golpe de 2,0 (× rango de la habilidad)
  const mp = resolveSkill(p, SK('g_martillo'));
  assert.ok(approx(mp.coef, 2.0 * (1 + 0.1 * (mp.rank - 1)), 1e-9), `Martillo Pesado: coef 2,0 × rango (${mp.coef})`);
  const mp0 = resolveSkill(G().p, SK('g_martillo'));
  assert.ok(approx(mp0.coef, 0.34 * (1 + 0.1 * (mp0.rank - 1)), 1e-9), `sin s7: la onda ligera 0,34 (${mp0.coef})`);
  h.setSlot('rmb', 'g_martillo');
  for (const z of [-0.6, 0, 0.6]) h.enemy({ hp: 1e6, pos: [2.5, 0, z] });
  h.aim(2.5, 0); p.mp = 100;
  assert.equal(h.cast('rmb'), true);
  h.step(0.5);
  assert.equal(h.gaugeValue('bastion'), 1, 'Martillo Pesado: +1 Bastión si golpea a 3 o más');
  p.hp = p.stats.maxHP * 0.5;
  const s0 = h.sustained();
  h.enemy({ hp: 10, pos: [-3, 0, 0] }).takeDamage(99, false, {});
  assert.ok(approx(h.sustained() - s0, p.stats.maxHP * 0.03, 1), 'Recuperación: 3 % por muerte (2 rangos)');
  const n = G({ s8: 1 });
  n.setSlot('rmb', 'g_martillo');
  for (const z of [-0.6, 0, 0.6]) n.enemy({ hp: 1e6, pos: [2.5, 0, z] });
  n.aim(2.5, 0); n.p.mp = 100; n.cast('rmb'); n.step(0.5);
  assert.equal(n.gaugeValue('bastion'), 0, 'sin s7 no hay Bastión por el Martillo');
}
// s9 Muro de Escudos (+ x1 Represalia · x2 Venganza Acumulada)
{
  const h = G({ s9: 1, x1: 1, x2: 2 });
  const p = h.p;
  h.setSlot('k2', 'g_t_muro');
  h.cast('k2');
  assert.ok(!(p.cds.g_t_muro > 0), 'sin cargas no se gasta el enfriamiento');
  h.gauge('bastion', 3);
  const dr0 = p.stats.dr;
  h.step(0.25);
  assert.equal(h.cast('k2'), true);
  assert.equal(h.gaugeValue('bastion'), 0, 'gasta todas las cargas');
  const b = buff(p, 'g_t_muro');
  assert.ok(b && b.stats.dr >= 30 && b.stats.dr <= 50 && p.stats.dr >= dr0 + 30, `−10 % por carga (${b?.stats.dr})`);
  // Represalia: refleja el 30 % de lo que absorbe el Muro · Venganza: onda al terminar
  const e = h.enemy({ hp: 1e6, pos: [1.5, 0, 0] });
  for (let i = 0; i < 5; i++) p.takeDamage(200, 1, { melee: true, source: e });
  const refl = lost(e);
  assert.ok(refl > 0, `Represalia refleja (${refl})`);
  const abs = powerState(p, 'g_venganza').absorbed;
  assert.ok(abs > 0, `Venganza acumula lo absorbido (${abs.toFixed(0)})`);
  h.tick(8.2);
  assert.ok(lost(e) - refl >= abs * 0.4 - 1, `al terminar, la onda devuelve el 40 % (2 rangos): ${lost(e) - refl} de ${abs.toFixed(0)}`);
  assert.ok(!buff(p, 'g_t_muro'));
  // Represalia con bloqueo (escudo equipado, todo golpe bloqueado)
  const r = G({ x1: 1 });
  r.p.equipment.offhand = { kind: 'item', slot: 'offhand', icon: '🛡️', baseName: 'Escudo', affixes: {}, arm: 5, quality: 0 };
  r.p.recompute(); r.p.combatRng = () => 0;
  const re = r.enemy({ hp: 1e6, pos: [1.5, 0, 0] });
  r.p.takeDamage(200, 1, { melee: true, source: re });
  assert.ok(lost(re) > 0, 'Represalia: también refleja lo bloqueado');
}
// s17 Muralla Viviente: −1 %/rango por carga de Bastión (2e; ya no −2 % fijo)
{
  const h = G({ s17: 2 });
  const p = h.p;
  assert.equal(p.tv.dmgReduc || 0, 0, 'sin reducción fija');
  h.gauge('bastion', 3);
  assert.equal(firePower('condDr', p, p, { amount: 100 }), 6, '2 rangos × 1 % × 3 cargas');
}
// s6B Reto Singular: la Provocación marca: −20 % de daño a tu grupo 8 s
{
  const h = G({ s6: 1 }, { choice: { s6: 'B' } });
  const p = h.p;
  const e = h.enemy({ pos: [4, 0, 0] });
  h.setSlot('k2', 'g_provocacion');
  assert.equal(h.cast('k2'), true);
  assert.ok(e.outWeak.g_reto?.pct === 20 && e.outWeak.g_reto.t > 7.9 && e.marks?.g_reto, 'marca: −20 % 8 s');
  assert.ok(approx(e.outDmgMul(), 0.85 * 0.8, 1e-9), 'se suma a la Provocación (−15 %)');
  void p;
}
// s13A Juramento del Escudo: Muro Inquebrantable se recarga en 20 s · s13B Carga de Escudo
{
  const h = G({ s13: 1 }, { choice: { s13: 'A' } });
  const p = h.p;
  p.takeDamage(p.stats.maxHP * 50, 1, {});
  assert.ok(p.alive, 'Muro Inquebrantable');
  h.tick(0.2);
  const cd = powerState(p, 'm_aegis').cd;
  assert.ok(cd > 19.5 && cd <= 20, `recarga de 20 s (${cd.toFixed(2)})`);
  h.tick(1);
  assert.ok(powerState(p, 'm_aegis').cd < 19.5, 'y sigue bajando');
  const c = G({ s13: 1 }, { choice: { s13: 'B' } });
  const q = c.p;
  c.setSlot('k1', 'g_t_carga');
  const a = c.enemy({ hp: 1e6, pos: [2, 0, 0] }), b2 = c.enemy({ hp: 1e6, pos: [4.5, 0, 0.3] });
  c.aim(8, 0);
  assert.equal(c.cast('k1'), true);
  assert.ok(approx(q.pos.x, 8, 0.31), `carga 8 m (${q.pos.x.toFixed(2)})`);
  assert.ok([a, b2].every(e => e.pos.distanceTo(q.pos) < 1.5), 'arrastra a los que encuentra');
  assert.ok([a, b2].every(e => lost(e) > 0 && e.stunT > 1), 'al llegar los golpea y aturde');
  const d = G({ s13: 1 }, { choice: { s13: 'B' } });
  d.setSlot('k1', 'g_t_carga');
  const boss = d.enemy({ hp: 1e6, pos: [4, 0, 0], boss: true });
  d.aim(8, 0); d.cast('k1');
  assert.ok(d.p.pos.x < 3.5 && boss.pos.x === 4, 'un jefe frena la carga (no se arrastra)');
  assert.ok(boss.stagger > 0 && !(boss.stunT > 0), 'al jefe el aturdimiento le suma stagger');
}
// s14 Vínculo del Guardián (cooperativo): recibes el 20 % del daño de los aliados a 10 m
// (⑫ onAllyDamaged: el golpe al aliado pasa por g.damageAlly; sin sondeo ni h.tick)
{
  const h = G({ s14: 1 });
  const p = h.p, a = h.ally(3, 0), far = h.ally(30, 0);
  const hp0 = p.hp;
  a.takeDamage(100); far.takeDamage(100);
  assert.equal(a.hp, 920, 'el aliado solo sufre el 80 % (te quedas el 20 %)');
  assert.ok(p.hp < hp0 && hp0 - p.hp <= 20, `y lo recibes tú, reducido por tu armadura (${(hp0 - p.hp).toFixed(1)})`);
  assert.equal(far.hp, 900, 'fuera de 10 m no');
  const solo = G({ s14: 1 });
  const s0 = solo.p.hp; solo.tick(1);
  assert.ok(solo.p.hp >= s0, 'en solitario no hace nada');
}
// x3 Bastión Eterno (cooperativo): con 5 cargas, un aliado a 10 m que cae queda a 1 (cada 60 s)
// (⑫ onAllyLethal: el golpe letal pasa por g.damageAlly)
{
  const h = G({ x3: 1 });
  const a = h.ally(3, 0);
  a.takeDamage(5000);
  assert.ok(!a.alive, 'sin 5 cargas no protege');
  const k = G({ x3: 1 });
  const lejos = k.ally(14, 0), b = k.ally(3, 0);
  k.gauge('bastion', 5);
  lejos.takeDamage(5000);
  assert.ok(!lejos.alive, 'a más de 10 m no protege (y no gasta la recarga)');
  b.takeDamage(5000);
  assert.ok(b.alive && b.hp === 1 && b.invulnT === 2, 'con 5 cargas: queda a 1 e inmune 2 s');
  b.invulnT = 0;                                      // el aliado del arnés no descuenta su inmunidad
  k.gauge('bastion', 5);
  b.takeDamage(5000);
  assert.ok(!b.alive, 'una vez cada 60 s');
}
console.log('Guardián: Grito Desafiante (+Desafío Firme, Cerco), Martillo Pesado, Recuperación, Muro de Escudos, Represalia, Venganza, Muralla Viviente, Reto, Juramento, Carga de Escudo, Vínculo, Bastión Eterno ✓');

// ================================================= CRUZADO
const C = (spec = {}, extra = {}) => H({ spec: 'cruzado', talents: { spec, ...extra } });
// s0 Aura de Devoción (+ s4 Devoción Ferviente · s14 Luz del Alba)
{
  const h = C({ s4: 1, s14: 1 });
  const p = h.p, a = h.ally(6, 0), far = h.ally(40, 0);
  a.hp = 500;
  const arm0 = p.stats.arm, d0 = p.stats.dmgPct;
  p.hp = p.stats.maxHP * 0.5;
  assert.equal(h.cast('k3'), true);
  assert.equal(h.gaugeValue('fervor'), 1, 'Devoción Ferviente: +1 Fervor al lanzarla');
  assert.ok(p.stats.arm - arm0 >= 30, '+30 de armadura');
  assert.equal(p.stats.dmgPct - d0, 10, 'Luz del Alba: +10 % de daño');
  const hp0 = p.hp;
  h.tick(2);
  const prof = resolveSkill(p, SK('g_t_devocion'));
  const regen = (0.4 + p.stats.vit * 0.02) * 2;          // regeneración natural de Player.update
  const want = p.stats.maxHP * 0.03 * 2 * prof.buffMul * 1.1 * (1 + p.stats.healPct / 100) + regen;   // 2e: 3 %/s
  assert.ok(approx(p.hp - hp0, want, p.stats.maxHP * 0.003), `3 %/s (+10 % Ferviente, +15 % innata): ${(p.hp - hp0).toFixed(1)} ≈ ${want.toFixed(1)}`);
  assert.ok(buff(a, 'g_t_devocion') && a.healed > 30 && !buff(far, 'g_t_devocion'), 'aliados a 15 m');
  // el aura te sigue
  const ah = a.healed;
  far.hp = 500;
  p.pos.x = 34; h.tick(1.0);
  assert.ok(buff(p, 'g_t_devocion') && a.healed === ah && far.healed > 0 && buff(far, 'g_t_devocion'), 'el aura te sigue');
  // Luz del Alba: cada Fervor gastado la alarga 1 s
  const f = h.g.fields.find(x => x.kind === 'g_devocion' && !x.dead);
  const t0 = f.t;
  h.gauge('fervor', 3); spendGauge(p, 'fervor', 3);
  assert.ok(approx(f.t, t0 + 3, 1e-9), 'Luz del Alba: +1 s por Fervor gastado');
  h.tick(14);                                         // 2e: dura 12 s (+3 s de Luz del Alba)
  assert.ok(!buff(p, 'g_t_devocion') && !h.g.fields.some(x => x.kind === 'g_devocion' && !x.dead), 'termina');
}
// s9 Veredicto Final (+ s17 Gracia): 3 Fervor → cono de 300 %; el grupo se cura el 25 % del daño
{
  const h = C({ s9: 1, s17: 2 });
  const p = h.p, a = h.ally(2, 2);
  a.hp = 100;
  h.setSlot('rmb', 'g_t_veredicto');
  const e = h.enemy({ hp: 1e6, pos: [3, 0, 0] });
  h.aim(3, 0);
  h.cast('rmb'); h.step(0.3);
  assert.equal(lost(e), 0, 'sin 3 de Fervor no golpea');
  h.gauge('fervor', 3);
  p.hp = p.stats.maxHP * 0.3;
  const s0 = h.sustained();
  h.step(0.3);
  assert.equal(h.cast('rmb'), true);
  h.step(0.3);
  const dealt = lost(e);
  const prof = resolveSkill(p, SK('g_t_veredicto'));
  assert.ok(dealt > p.avgHit(prof.coef, prof.addPct) * 0.8, 'golpe sagrado de 300 %');
  assert.equal(h.gaugeValue('fervor'), 0, 'gasta 3 de Fervor');
  assert.ok(approx(h.sustained() - s0, Math.min(dealt * 0.45, p.stats.maxHP * 0.06), 1.5), `cura el 25 % + 20 % (Gracia) del daño (sustento): ${(h.sustained() - s0).toFixed(1)}`);
  assert.ok(a.healed > 0, 'al aliado también');
}
// x3 Ascensión: tras 3 Veredictos seguidos, 10 s sin gastar Fervor y Aura de 30 m
{
  const h = C({ s9: 1, x3: 1 });
  const p = h.p;
  h.setSlot('rmb', 'g_t_veredicto');
  h.enemy({ hp: 1e7, pos: [3, 0, 0] }); h.aim(3, 0);
  for (let i = 0; i < 3; i++) { h.gauge('fervor', 3); h.cast('rmb'); h.step(0.35); }
  assert.ok(buff(p, 'g_ascension'), 'Ascensión');
  assert.ok(resolveSkill(p, SK('g_t_veredicto')).cd >= 1.5, 'tope: 1,5 s de enfriamiento mientras dura');
  assert.equal(h.gaugeValue('fervor'), 0);
  assert.equal(h.cast('rmb'), true);
  h.step(0.3);
  assert.ok(p.cds.g_t_veredicto > 1, 'sin Fervor también sale (no se gasta)');
  h.cast('k3'); h.tick(0.6);
  assert.equal(h.g.fields.find(x => x.kind === 'g_devocion' && !x.dead)?.radius, 30, 'el Aura cubre 30 m');
  h.tick(10);
  assert.ok(!buff(p, 'g_ascension') && resolveSkill(p, SK('g_t_veredicto')).cd === 0, '10 s');
}
// s13B Martillo de Justicia (tipo genérico proj): aturde 3 s (jefes: 1,5 s → stagger, +30)
{
  const h = C({ s13: 1 }, { choice: { s13: 'B' } });
  h.setSlot('k2', 'g_t_justicia');
  const e = h.enemy({ hp: 1e6, pos: [5, 0, 0] });
  h.aim(5, 0);
  assert.equal(h.cast('k2'), true);
  h.step(0.6);
  assert.ok(lost(e) > 0 && e.stunT > 2.5, 'golpea y aturde 3 s');
  const b = C({ s13: 1 }, { choice: { s13: 'B' } });
  b.setSlot('k2', 'g_t_justicia');
  const boss = b.enemy({ hp: 1e7, pos: [5, 0, 0], boss: true });
  b.aim(5, 0); b.cast('k2'); b.step(0.6);
  assert.ok(boss.stagger >= 30 + 30 * 1.5 - 1 && !(boss.stunT > 0), `jefe: stagger 30 + aturdir 1,5 s (${boss.stagger.toFixed(1)})`);
}
// s3 Mano Sanadora · s6B Sentencia · s8 Luz Sanadora · s12 Fervor Creciente · s6A Consagración
{
  const h = C({ s3: 2 });
  const p = h.p, a = h.ally(5, 0), far = h.ally(20, 0);
  a.hp = far.hp = 500;
  const e = h.enemy({ hp: 1e6 });
  h.hit(e, { skill: 'g_martillo' }); h.hit(e, { skill: 'g_martillo' });   // mismo instante: una vez
  assert.equal(a.healed, 2, 'Mano Sanadora: el aliado recibe la mitad (2 de 4)');
  assert.equal(far.healed, 0);
  assert.equal(p.stats.lph - H({ spec: 'cruzado' }).p.stats.lph, 4, '+4 de vida al golpear');

  const s = C({ s6: 1 }, { choice: { s6: 'B' } });
  const el = s.enemy({ hp: 1e6, rank: 'elite', pos: [3, 0, 0] }), boss = s.enemy({ hp: 1e6, boss: true, pos: [2, 0, 1] });
  const norm = s.enemy({ hp: 1e6, pos: [2, 0, -1] }), farEl = s.enemy({ hp: 1e6, rank: 'elite', pos: [12, 0, 0] });
  s.enemy({ hp: 10, pos: [2, 0, 0] }).takeDamage(99, false, {});
  assert.ok(el.debuffs.g_sentencia?.pct === 20 && boss.debuffs.g_sentencia, 'Sentencia: marca a élites y jefes cercanos');
  assert.ok(!norm.debuffs.g_sentencia && !farEl.debuffs.g_sentencia, 'ni normales ni lejanos');

  const l = C({ s8: 2, s12: 2 });
  const lp = l.p, la = l.ally(5, 0);
  la.hp = 500;
  lp.hp = lp.stats.maxHP * 0.5;
  const s0 = l.sustained();
  l.enemy({ hp: 10, pos: [-3, 0, 0] }).takeDamage(99, false, {});
  assert.ok(approx(l.sustained() - s0, lp.stats.maxHP * 0.03, 1) && approx(la.healed, 30, 1e-6), 'Luz Sanadora: 3 % a ti y a los aliados a 10 m');
  l.g.party = [];
  // Paso 2e: Fervor Creciente pasa del Martillo al BÁSICO (cada golpe que acierta, X %)
  const le = l.enemy({ hp: 1e6, pos: [2.5, 0, 0] });
  lp.combatRng = () => 0;
  const fv = l.gaugeValue('fervor');
  l.hit(le, { skill: 'g_tajo' });
  assert.equal(l.gaugeValue('fervor'), fv + 1, 'Fervor Creciente: +1 Fervor por golpe del básico (azar con semilla)');
  l.hit(le, { skill: 'g_martillo' });
  assert.equal(l.gaugeValue('fervor'), fv + 1, 'el Martillo ya no tira Fervor Creciente');
  lp.combatRng = () => 0.99;
  l.hit(le, { skill: 'g_tajo' });
  assert.equal(l.gaugeValue('fervor'), fv + 1, 'si el azar no acompaña, nada (2.º golpe del básico)');
  l.hit(le, { skill: 'g_tajo' });
  assert.equal(l.gaugeValue('fervor'), fv + 2, '3.er golpe del básico: +1 (1 cada 3, Juicio)');

  const k = C({ s6: 1 }, { choice: { s6: 'A' } });
  const ka = k.ally(2.5, 0.5);
  ka.hp = 500;
  k.setSlot('rmb', 'g_martillo');
  const ke = k.enemy({ hp: 1e6, pos: [2.5, 0, 0] }); k.aim(2.5, 0); k.p.mp = 100;
  k.cast('rmb'); k.step(0.5);
  assert.ok(k.g.fields.some(f => f.kind === 'estela' && !f.dead) && k.g.fields.some(f => f.kind === 'g_consagracion' && !f.dead), 'Consagración: suelo sagrado (daño + cura)');
  const kl = lost(ke);
  k.tick(1.5);
  assert.ok(lost(ke) > kl && ka.healed > 15, 'daña a los enemigos y cura a los aliados');
  // Paso 2e: no se apila; un Martillo nuevo reemplaza el suelo anterior (antes 4 suelos curaban a la vez)
  for (let i = 0; i < 3; i++) { k.p.mp = 100; k.p.cds.g_martillo = 0; k.step(0.3); k.cast('rmb'); k.step(0.5); }
  assert.equal(k.g.fields.filter(f => f.kind === 'g_consagracion' && !f.dead).length, 1, 'Consagración: un solo suelo a la vez');
}
// s10 Estandarte Sagrado: la bonificación del Estandarte alcanza a 15 m
{
  const h = C({ s10: 2 });
  const prof = resolveSkill(h.p, SK('g_u_estandarte'));
  assert.ok(prof.radius === 15 && approx(prof.dur, 12 * 1.4, 1e-9), 'radio 15 m y +40 % de duración');
  const a = h.ally(12, 0);
  h.setSlot('k4', 'g_u_estandarte');
  h.cast('k4'); h.tick(0.6);
  assert.ok(buff(a, 'g_u_estandarte'), 'un aliado a 12 m recibe la bonificación');
}
// s13A Intercesión (cooperativo): un aliado que iba a morir queda a 1; tú pierdes un 20 %
{
  const h = C({ s13: 1 }, { choice: { s13: 'A' } });
  // (⑫ onAllyLethal: el golpe letal pasa por g.damageAlly; sin sondeo ni h.tick)
  const p = h.p, lejos = h.ally(20, 0), a = h.ally(4, 0);
  const hp0 = p.hp;
  lejos.takeDamage(5000);
  assert.ok(!lejos.alive && p.hp === hp0, 'a más de 15 m no intercede (ni gasta la recarga)');
  a.takeDamage(5000);
  assert.ok(a.alive && a.hp === 1, 'el aliado queda a 1 de vida');
  assert.ok(approx(hp0 - p.hp, p.stats.maxHP * 0.2, 1), 'pierdes un 20 % de vida');
  a.takeDamage(5000);
  assert.ok(!a.alive, 'una vez cada 90 s');
}
// x1 Martillo Bendito · x2 Martillos del Juicio
{
  const strike = (spec) => {
    const h = C(spec);
    h.p.equipment.weapon = { kind: 'item', slot: 'weapon', name: 'Maza', dmg: [100, 120], affixes: {}, quality: 0 };
    h.p.recompute();
    const e = h.enemy({ hp: 1e7, pos: [1.5, 0, 0] });
    h.p.hp = h.p.stats.maxHP * 0.5;
    const s0 = h.sustained();
    h.tick(1.05);
    return { h, dmg: lost(e), healed: h.sustained() - s0 };
  };
  const one = strike({ x1: 1 });
  assert.ok(one.h.g.fields.some(f => f.kind === 'g_martillos' && !f.dead), 'los martillos orbitan');
  assert.ok(one.dmg > 0 && approx(one.healed, one.h.p.stats.maxHP * 0.03, 1), `golpean y curan 1 % por golpe (${one.healed.toFixed(1)})`);
  const two = strike({ x1: 1, x2: 2 });
  // +30 % va al saco ADITIVO (no es un [×]): ratio = 5/3 × golpe(+30 %)/golpe
  const hit = (q, add) => q.p.avgHit(0.15, add);
  const want = (5 / 3) * hit(two.h, 30) / hit(one.h, 0);
  assert.ok(want > 5 / 3 + 0.05 && approx(two.dmg / one.dmg, want, 0.04), `Martillos del Juicio: 5 martillos y +30 % (×${(two.dmg / one.dmg).toFixed(3)} ≈ ×${want.toFixed(3)})`);
  const none = C({});
  none.enemy({ hp: 1e6, pos: [1.5, 0, 0] }); none.tick(2);
  assert.ok(!none.g.fields?.some(f => f.kind === 'g_martillos'), 'sin el nodo no hay martillos');
}
console.log('Cruzado: Aura de Devoción (+Ferviente, Luz del Alba), Veredicto (+Gracia), Ascensión, Martillo de Justicia, Mano Sanadora, Sentencia, Luz Sanadora, Fervor Creciente, Consagración, Estandarte Sagrado, Intercesión, Martillos Benditos ✓');

// ------------------------------------------------ sin errores silenciosos
const bad = warns.filter(w => /\[(poder|habilidad|canalización|campo|salto)/.test(w));
assert.deepEqual(bad, [], 'ningún gancho lanzó:\n' + bad.join('\n'));
console.log('✅ PODERES DEL GUERRERO OK');
