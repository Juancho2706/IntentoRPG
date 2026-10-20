// ============================================================
// Paso 2d.2 · E0 (W1): gaugeView v2 de js/spec-mechanics.js (docs/paso2d2-hud-pc.md §3.10)
// ============================================================
// (el plan lo llamaba test72; ese número ya lo usa test72-nucleo-2c2 y el 73 es del HUD de PC)
// Cubre, con el arnés REAL (h.gaugeView()), los 9 indicadores:
//  · campos comunes nuevos: tMax, decayIn, decaying, hold, ready, seq, x, sinceCombat;
//    compatibilidad hacia atrás (id, name, value, max, color, state, label, t, enemy);
//  · cada campo `x` de la tabla §3.10 y cada contador seq (gain, full, spent, empty);
//  · la regla de objetivo de la Escarcha (cursor > jefe en combate > el más escarchado);
//  · colores de STYLE.md en def.color;
//  · gaugeTuning() como única fuente: lo que copia de los poderes coincide con el texto del nodo.
import assert from 'node:assert/strict';
import { makeHarness } from './helpers/power-harness.mjs';
import { BASE_GAUGE_IDS, gaugeDefs, gaugeTuning, gaugeSeq, gainGauge, spendGauge, gaugeView, pickGaugeEnemy } from '../js/spec-mechanics.js';
import { TALENT_TREES } from '../js/talents.js';
import { POWER_HOOKS, powerState } from '../js/powers.js';

const approx = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;
const mk = (classId, spec, level = 30, extra = {}) => makeHarness({ classId, spec, level, ...extra });
const T = gaugeTuning();

// ---------------------------------------------------------------- comunes y compatibilidad
const COMMON = ['id', 'name', 'value', 'max', 'color', 'state', 'decayIn', 'decaying', 'hold', 'seq', 'ready', 'x', 'sinceCombat'];
const SPECS = { guerrero: ['berserker', 'guardian', 'cruzado'], maga: ['piromante', 'crionte', 'arcanista'], arquera: ['francotiradora', 'montaraz', 'tiradora'] };
const X_KEYS = {
  sed: ['low', 'frenzyT', 'frenzyMax'],
  bastion: ['drPct', 'wallT', 'wallMax', 'wallDr', 'decayEvery'],
  fervor: ['hammerHits', 'hammerNeed', 'ascT', 'ascMax'],
  calor: ['cooling', 'combT', 'combMax', 'mult'],
  escarcha: ['enemyName', 'boss', 'layered', 'frozen', 'numbT', 'targetFrozen'],
  cargas: ['loseAfter', 'bonusPct', 'manaBack', 'resonance'],
  concentracion: ['moving', 'critPct', 'visionT', 'visionMax'],
  coto: ['preyName', 'preyHpPct', 'trapCharges', 'trapChargesMax', 'trapCdFrac', 'preyTrapped'],
  impulso: ['moving', 'galeExt'],
};
const STYLE = { sed: '#e8634a', bastion: '#7fb0e8', fervor: '#ecc760', calor: '#ff8a3d', escarcha: '#74cdf2', cargas: '#b996ff', concentracion: '#ead86e', coto: '#86d47a', impulso: '#66d7c7' };
const seen = new Set();
for (const [cid, list] of Object.entries(SPECS)) {
  for (const s of list) {
    const h = mk(cid, s);
    const v = h.gaugeView();
    assert.ok(v, `${s}: hay vista`);
    for (const k of COMMON) assert.ok(k in v, `${s}: campo común ${k}`);
    assert.equal(v.state, 'idle', `${s}: vacío = idle`);
    assert.deepEqual(Object.keys(v.seq).sort(), ['empty', 'full', 'gain', 'spent'], `${s}: seq`);
    assert.ok(Array.isArray(v.ready) && typeof v.x === 'object', `${s}: ready/x`);
    for (const k of X_KEYS[v.id]) assert.ok(k in v.x, `${v.id}: x.${k}`);
    assert.equal(v.color, STYLE[v.id], `${v.id}: color de STYLE.md`);
    assert.equal(gaugeDefs()[v.id].color, STYLE[v.id]);
    assert.equal(v.decayIn, null, `${v.id}: vacío no pierde`);
    seen.add(v.id);
  }
}
assert.deepEqual([...seen].sort(), [...BASE_GAUGE_IDS].sort(), 'los 9 indicadores');
assert.equal(mk('guerrero', null, 9).gaugeView(), null, 'sin especialización: null (como v1)');

// seq: contadores MONÓTONOS por indicador, no se rebobinan con resetGauges
function seqDelta(h, id, fn) {
  const a = { ...gaugeSeq(h.p, id) };
  fn();
  const b = h.gaugeView().seq;
  return { gain: b.gain - a.gain, full: b.full - a.full, spent: b.spent - a.spent, empty: b.empty - a.empty };
}

// ---------------------------------------------------------------- Sed
{
  const h = mk('guerrero', 'berserker');
  const p = h.p;
  let d = seqDelta(h, 'sed', () => { p.takeDamage(p.stats.maxHP * 0.7, 1, {}); });
  assert.equal(d.gain, 1, 'Sed: seq.gain al perder vida');
  let v = h.gaugeView();
  assert.equal(v.x.low, true, 'Sed: x.low con vida < 40 %');
  assert.equal(v.state, 'building');
  p.sinceCombat = 1;
  v = h.gaugeView();
  assert.ok(approx(v.decayIn, T.sed.decayAfter - 1, 1e-6) && v.decaying === false, `Sed: decayIn = after − sinceCombat (${v.decayIn})`);
  p.sinceCombat = 5;
  v = h.gaugeView();
  assert.ok(v.decayIn === 0 && v.decaying === true, 'Sed: perdiendo fuera de combate');
  p.hp = p.stats.maxHP;
  d = seqDelta(h, 'sed', () => h.gauge('sed', 100));
  assert.ok(d.full === 1, 'Sed: seq.full al saciarse');
  v = h.gaugeView();
  assert.ok(v.state === 'active' && v.label === 'Sed Saciada' && v.tMax === T.sed.satedT && v.t > 5.9, 'Sed Saciada: t/tMax');
  assert.ok(v.hold === true && v.decayIn === null && v.x.low === false, 'Sed Saciada: hold, sin pérdida, vida alta');
  assert.equal(v.x.frenzyT, 0);
  p.addBuff('g_desenfreno', { aspdPct: 30 }, T.sed.frenzy.t, { name: 'Desenfreno' });
  v = h.gaugeView();
  assert.ok(v.x.frenzyT === T.sed.frenzy.t && v.x.frenzyMax === T.sed.frenzy.t, 'Sed: x.frenzyT/frenzyMax del buff g_desenfreno');
  d = seqDelta(h, 'sed', () => h.tick(6.2));
  assert.equal(d.empty, 1, 'Sed: seq.empty al terminar la Sed Saciada');
  // resetGauges (cambio de especialización) no rebobina seq
  const before = { ...gaugeSeq(p, 'sed') };
  p.gauges = {};
  assert.deepEqual(h.gaugeView().seq, before, 'seq sobrevive a resetGauges');
}

// ---------------------------------------------------------------- Bastión
{
  const h = mk('guerrero', 'guardian', 40);
  const p = h.p;
  let d = seqDelta(h, 'bastion', () => { gainGauge(p, 'bastion', 5); });
  assert.ok(d.gain === 1 && d.full === 1, 'Bastión: gain + full');
  let v = h.gaugeView();
  assert.equal(v.x.decayEvery, T.bastion.decayEvery);
  assert.ok(approx(v.decayIn, T.bastion.decayEvery), `Bastión: decayIn = 6 recién ganado (${v.decayIn})`);
  h.tick(2);
  v = h.gaugeView();
  assert.ok(approx(v.decayIn, T.bastion.decayEvery - 2, 1e-6), `Bastión: decayIn baja con el tiempo (${v.decayIn})`);
  assert.equal(v.x.drPct, 0, 'sin Muralla Viviente: drPct 0');
  p.talents.sp.guardian = { ...(p.talents.sp.guardian || {}), s17: 2 };
  h.addPowers('g_muralla_viva');
  v = h.gaugeView();
  assert.equal(v.x.drPct, T.bastion.murallaPerRank * 2 * 5, `Bastión: x.drPct = 2 × rango × cargas (${v.x.drPct})`);
  assert.equal(v.x.drPct, POWER_HOOKS.g_muralla_viva.condDr(p), 'drPct sale del condDr real del poder');
  d = seqDelta(h, 'bastion', () => { spendGauge(p, 'bastion', 5); });
  assert.ok(d.spent === 1 && d.empty === 1, 'Bastión: spent + empty');
  p.addBuff('g_t_muro', { dr: 50 }, T.bastion.wall.t, { name: 'Muro de Escudos' });
  v = h.gaugeView();
  assert.ok(v.state === 'active' && v.label === 'Muro de Escudos' && v.x.wallT === 8 && v.x.wallMax === 8 && v.x.wallDr === 50 && v.tMax === 8, 'Bastión: Muro de Escudos (x.wall*)');
}

// ---------------------------------------------------------------- Fervor
{
  const h = mk('guerrero', 'cruzado', 40);
  const p = h.p;
  const f = h.enemy({ hp: 1e6 });
  h.hit(f, { skill: 'g_martillo' }); h.hit(f, { skill: 'g_martillo' });
  let v = h.gaugeView();
  assert.ok(v.x.hammerHits === 2 && v.x.hammerNeed === T.fervor.hammerHits, 'Fervor: x.hammerHits / hammerNeed');
  let d = seqDelta(h, 'fervor', () => h.hit(f, { skill: 'g_martillo' }));
  assert.equal(d.gain, 1, 'Fervor: 3.er Martillo → gain');
  assert.equal(h.gaugeView().x.hammerHits, 0);
  assert.deepEqual(h.gaugeView().ready, [], 'Fervor: con 1 no está listo');
  d = seqDelta(h, 'fervor', () => gainGauge(p, 'fervor', 2));
  assert.equal(d.full, 1, 'Fervor: full a 3');
  assert.deepEqual(h.gaugeView().ready, ['g_t_veredicto'], 'Fervor: Veredicto listo');
  d = seqDelta(h, 'fervor', () => spendGauge(p, 'fervor', 3));
  assert.ok(d.spent === 1 && d.empty === 1, 'Fervor: spent + empty');
  p.addBuff('g_ascension', {}, T.fervor.ascension.t, { name: 'Ascensión' });
  v = h.gaugeView();
  assert.ok(v.state === 'active' && v.label === 'Ascensión' && v.x.ascT === 10 && v.x.ascMax === 10 && v.tMax === 10, 'Fervor: Ascensión (x.ascT/ascMax)');
  assert.deepEqual(v.ready, ['g_t_veredicto'], 'en Ascensión el Veredicto no gasta: listo');
  assert.equal(v.decayIn, null, 'Fervor no pierde');
}

// ---------------------------------------------------------------- Calor
{
  const h = mk('maga', 'piromante', 40);
  const p = h.p;
  const e = h.enemy({ hp: 1e6 });
  let d = seqDelta(h, 'calor', () => h.hit(e, { elem: 'fire', skill: 'bola_fuego' }));
  assert.equal(d.gain, 1, 'Calor: gain por golpe de Fuego');
  let v = h.gaugeView();
  assert.ok(approx(v.decayIn, T.calor.decayAfter) && v.x.cooling === false, `Calor: decayIn = 3 s (coolIn) (${v.decayIn})`);
  assert.equal(v.x.mult, 1);
  h.tick(3.2);
  v = h.gaugeView();
  assert.ok(v.decaying === true && v.x.cooling === true && v.decayIn === 0, 'Calor: se enfría (x.cooling)');
  d = seqDelta(h, 'calor', () => h.gauge('calor', 100));
  assert.equal(d.full, 1, 'Calor: full');
  v = h.gaugeView();
  assert.ok(v.state === 'active' && v.hold === true && v.decayIn === null, 'Ignición Total: hold');
  assert.deepEqual(v.ready, T.calor.skills, 'Ignición: Bola de Fuego y Meteoro listos');
  h.aim(4, 0); h.setSlot('rmb', 'bola_fuego');
  d = seqDelta(h, 'calor', () => h.cast('rmb'));
  assert.ok(d.spent === 1 && d.empty === 1, 'Calor: spent + empty al lanzar con Ignición');
  p.addBuff('p_combustion', { 'gaugeGain:calor': 100 }, T.calor.combustion.t, { name: 'Combustión' });
  v = h.gaugeView();
  assert.ok(v.x.combT === 10 && v.x.combMax === 10 && v.x.mult === T.calor.combustion.mult, 'Calor: Combustión (x.combT/combMax/mult)');
  assert.ok(v.label === 'Combustión' && v.tMax === 10 && v.t === 10, 'Calor: anillo de Combustión');
}

// ---------------------------------------------------------------- Escarcha (por enemigo + objetivo)
{
  const h = mk('maga', 'crionte', 40);
  const p = h.p;
  const a = h.enemy({ hp: 1e6 }), b = h.enemy({ hp: 1e6, pos: [3, 0, 0] });
  a.def = { ...a.def, name: 'Necrófago' }; b.def = { ...b.def, name: 'Esqueleto' };
  for (let i = 0; i < 3; i++) h.hit(a, { elem: 'frost', skill: 'm_toque' });
  h.hit(b, { elem: 'frost', skill: 'm_toque' });
  let v = h.gaugeView();
  assert.ok(v.enemy === a && v.value === 3 && v.x.enemyName === 'Necrófago', 'Escarcha: sin cursor ni jefe → el más escarchado');
  assert.equal(v.x.layered, 2, 'Escarcha: x.layered = enemigos con ≥ 1 capa');
  v = h.gaugeView({ target: b });
  assert.ok(v.enemy === b && v.value === 1 && v.x.enemyName === 'Esqueleto', 'Escarcha: el enemigo bajo el cursor manda');
  const c = h.enemy({ hp: 1e6, pos: [-3, 0, 0] });
  v = h.gaugeView({ target: c });
  assert.ok(v.enemy === c && v.value === 0 && v.state === 'idle', 'Escarcha: cursor sobre uno sin capas = 0 (no engaña)');
  assert.equal(c.gauges, undefined, 'la vista no crea estado en el enemigo');
  assert.ok(approx(h.gaugeView().decayIn, T.escarcha.decayEvery), 'Escarcha: decayIn del objetivo (2 s por escalón)');
  let d = seqDelta(h, 'escarcha', () => { h.hit(a, { elem: 'frost', skill: 'm_toque' }); h.hit(a, { elem: 'frost', skill: 'm_toque' }); });
  assert.ok(d.gain === 2 && d.full === 1 && d.empty === 1, `Escarcha: gain ×2, full (congelación) y empty (${JSON.stringify(d)})`);
  v = h.gaugeView({ target: a });
  assert.equal(v.x.frozen, 1, 'Escarcha: x.frozen = congelados ahora');
  assert.equal(v.x.targetFrozen, true, 'Escarcha: x.targetFrozen = el objetivo está Congelado');
  assert.equal(h.gaugeView({ target: b }).x.targetFrozen, false, 'Escarcha: x.targetFrozen falso si el objetivo no está Congelado');
  const boss = h.enemy({ hp: 1e6, boss: true, pos: [0, 0, 3] });
  boss.def = { ...boss.def, name: 'Señor del Osario' };
  h.hit(boss, { elem: 'frost', skill: 'm_toque' });
  v = h.gaugeView();
  assert.ok(v.enemy === boss && v.x.boss === true && v.x.enemyName === 'Señor del Osario', 'Escarcha: el jefe en combate antes que el más escarchado');
  for (let i = 0; i < 4; i++) h.hit(boss, { elem: 'frost', skill: 'm_toque' });
  v = h.gaugeView();
  assert.ok(v.enemy === boss && v.state === 'active' && v.label === 'Aterido' && v.x.numbT > 3.9 && v.tMax === T.escarcha.numbT, 'Escarcha: jefe Aterido (x.numbT, tMax 4)');
  assert.equal(pickGaugeEnemy(p, 'escarcha', null), boss);
  assert.equal(h.gaugeView({ target: b }).enemy, b, 'el cursor gana incluso al jefe');
}

// ---------------------------------------------------------------- Cargas Arcanas
{
  const h = mk('maga', 'arcanista', 40);
  const p = h.p;
  const e = h.enemy({ hp: 1e6 });
  let d = seqDelta(h, 'cargas', () => { for (let i = 0; i < 4; i++) h.hit(e, { skill: 'm_dardo', elem: 'arcane' }); });
  assert.ok(d.gain === 4 && d.full === 1, 'Cargas: gain ×4 y full');
  let v = h.gaugeView();
  assert.ok(v.x.loseAfter === T.cargas.loseAfter && v.x.bonusPct === 140 && v.x.manaBack === 20 && v.x.resonance === false, 'Cargas: x.loseAfter/bonusPct/manaBack');
  assert.ok(approx(v.decayIn, T.cargas.loseAfter), 'Cargas: decayIn = 6 s (loseIn)');
  assert.deepEqual(v.ready, ['rayo'], 'Cargas: Rayo potenciado');
  h.tick(2);
  assert.ok(approx(h.gaugeView().decayIn, 4, 1e-6), 'Cargas: el arco de caducidad baja');
  h.addPowers('a_resonance');
  v = h.gaugeView();
  assert.ok(v.x.resonance === true && v.decayIn === null && v.hold === true, 'Cargas: Resonancia con 4 (no caducan)');
  assert.ok(v.state === 'active' && v.label === 'Resonancia', 'Cargas: Resonancia = estado active');
  d = seqDelta(h, 'cargas', () => spendGauge(p, 'cargas', 4));
  assert.ok(d.spent === 1 && d.empty === 1, 'Cargas: spent + empty');
  assert.deepEqual(h.gaugeView().ready, []);
}

// ---------------------------------------------------------------- Concentración
{
  const h = mk('arquera', 'francotiradora', 40);
  const p = h.p;
  let d = seqDelta(h, 'concentracion', () => h.tick(1));
  assert.ok(d.gain >= 1, 'Concentración: gain quieta');
  let v = h.gaugeView();
  assert.ok(approx(v.x.critPct, v.value * T.concentracion.critPerPoint, 0.01) && v.x.moving === false && v.decaying === false, 'Concentración: x.critPct / quieta');
  d = seqDelta(h, 'concentracion', () => h.gauge('concentracion', 100));
  assert.equal(d.full, 1, 'Concentración: full a 100');
  assert.deepEqual(h.gaugeView().ready, [], 'sin Aliento del Cazador no hay ranura enlazada');
  h.addPowers('f_aliento_cazador');
  assert.deepEqual(h.gaugeView().ready, ['a_t_apuntado'], 'Aliento del Cazador: Disparo Apuntado listo a 100');
  p.moving = true;
  v = h.gaugeView();
  assert.ok(v.x.moving === true && v.decaying === true, 'Concentración: moverte la vacía (decaying)');
  d = seqDelta(h, 'concentracion', () => { for (let i = 0; i < 50; i++) { p.moving = true; h.g.step(0.1); } });
  assert.equal(d.empty, 1, 'Concentración: empty al vaciarse moviéndote');
  h.gauge('concentracion', 40);
  d = seqDelta(h, 'concentracion', () => spendGauge(p, 'concentracion', 30));
  assert.equal(d.spent, 1, 'Concentración: spent (Aliento gasta 50)');
  p.addBuff('a_t_vision', { 'gaugeLoss:concentracion': -100 }, T.concentracion.vision.t, { name: 'Visión Certera' });
  p.moving = true;
  v = h.gaugeView();
  assert.ok(v.state === 'active' && v.label === 'Visión Certera' && v.x.visionT === 12 && v.x.visionMax === 12 && v.tMax === 12, 'Concentración: Visión Certera (x.visionT/visionMax)');
  assert.equal(v.decaying, false, 'con Visión Certera moverte no la vacía');
}

// ---------------------------------------------------------------- Coto de Caza
{
  const h = mk('arquera', 'montaraz', 40);
  const p = h.p;
  assert.ok((p.skills.a_t_cepo || 0) > 0, 'Montaraz conoce Trampa de Cepo (s0)');
  let v = h.gaugeView();
  assert.ok(v.x.trapCharges === T.coto.trap.charges && v.x.trapChargesMax === T.coto.trap.charges && v.x.trapCdFrac === 0, 'Coto: cargas de Trampa de Cepo listas');
  const spawn = (x) => h.g.spawnField('trampa', { pos: { x, z: 0 }, radius: 1.5, dur: 20, owner: p, data: { dmg: 1 } });
  let d = seqDelta(h, 'coto', () => { spawn(3); h.tick(0.1); });
  assert.equal(d.gain, 1, 'Coto (derivado): gain al armar una trampa');
  d = seqDelta(h, 'coto', () => { spawn(5); spawn(7); h.tick(0.1); });
  assert.ok(d.gain === 1 && d.full === 1, `Coto: gain + full con 3 armadas (${JSON.stringify(d)})`);
  d = seqDelta(h, 'coto', () => { for (const f of h.g.fields) f.dead = true; h.tick(0.1); });
  assert.ok(d.spent === 1 && d.empty === 1, 'Coto: spent + empty al dispararse/caer');
  // cargas: una gastada con recarga en curso (estado del comportamiento a_t_cepo)
  p.powerState.a_t_cepo = { charges: 0, max: 1, nextAt: p.simT + 6 };
  p.cdMax = { ...(p.cdMax || {}), a_t_cepo: 8 };
  v = h.gaugeView();
  assert.ok(v.x.trapCharges === 0 && approx(v.x.trapCdFrac, 0.25, 0.01), `Coto: x.trapCdFrac = progreso de la recarga (${v.x.trapCdFrac})`);
  p.simT += 6.1;
  assert.equal(h.gaugeView().x.trapCharges, 1, 'Coto: la recarga cumplida cuenta sin mutar el estado');
  assert.equal(p.powerState.a_t_cepo.charges, 0, 'la vista no muta el estado del comportamiento');
  // Presa
  const el = h.enemy({ hp: 1000, rank: 'elite', pos: [0, 0, 4] });
  el.def = { ...el.def, name: 'Bestia Alfa' };
  h.hit(el, {});
  el.hp = 600;
  v = h.gaugeView();
  assert.ok(v.state === 'prey' && v.x.preyName === 'Bestia Alfa' && v.x.preyHpPct === 60 && v.tMax === T.coto.preyT, 'Coto: Presa (x.preyName/preyHpPct, tMax 15)');
  assert.equal(v.x.preyTrapped, false);
  el.rootT = 2;
  assert.equal(h.gaugeView().x.preyTrapped, true, 'Coto: x.preyTrapped con la Presa inmovilizada');
}

// ---------------------------------------------------------------- Impulso
{
  const h = mk('arquera', 'tiradora', 40);
  const p = h.p;
  const e = h.enemy({ hp: 1e6 });
  let v = h.gaugeView();
  assert.equal(v.x.moving, false);
  let d = seqDelta(h, 'impulso', () => { p.moving = true; h.hit(e, { tags: ['proj'], skill: 'a_disparo' }); });
  assert.equal(d.gain, 1, 'Impulso: gain por disparo en movimiento');
  assert.equal(h.gaugeView().x.moving, true, 'Impulso: x.moving');
  d = seqDelta(h, 'impulso', () => h.gauge('impulso', 100));
  assert.equal(d.full, 1, 'Impulso: full → Vendaval');
  v = h.gaugeView();
  assert.ok(v.state === 'active' && v.tMax === T.impulso.galeT && v.hold === true, 'Vendaval: tMax 6');
  assert.deepEqual(v.ready, ['flecha_multiple'], 'Vendaval: Flecha Múltiple potenciada');
  assert.equal(v.x.galeExt, 0);
  h.addPowers('t_galechain');
  powerState(p, 't_galechain').ext = 1.5;
  p.gauges.impulso.galeT += 1.5;
  v = h.gaugeView();
  assert.ok(v.x.galeExt === 1.5 && v.tMax === T.impulso.galeT + 1.5, 'Impulso: x.galeExt alarga tMax (Vendaval Perpetuo)');
  d = seqDelta(h, 'impulso', () => h.tick(8));
  assert.equal(d.empty, 1, 'Impulso: empty al terminar el Vendaval');
  assert.deepEqual(h.gaugeView().ready, []);
}

// ---------------------------------------------------------------- gaugeTuning: única fuente
// lo que gaugeTuning copia de un poder (powers-<clase>.js) debe coincidir con el texto del nodo
function nodeText(cls, spec, id) {
  const n = TALENT_TREES[cls].specs.find(s => s.id === spec).nodes.find(x => x.id === id);
  return typeof n.d === 'function' ? n.d(1) : n.d;
}
const has = (txt, ...bits) => bits.every(b => txt.includes(b));
assert.ok(has(nodeText('guerrero', 'berserker', 's14'), `${T.sed.frenzy.t} s`, `${T.sed.frenzy.aspdPct}%`), 'Desenfreno: 8 s / +30 %');
assert.ok(has(nodeText('guerrero', 'berserker', 's4'), `${T.sed.remolino.perEnemy} de Sed`, `máx. ${T.sed.remolino.max}`), 'Remolino Sediento');
assert.ok(has(nodeText('guerrero', 'guardian', 's4'), `${T.bastion.shout} cargas`), 'Desafío Firme');
assert.ok(has(nodeText('guerrero', 'guardian', 's17'), `${T.bastion.murallaPerRank}%`), 'Muralla Viviente');
assert.ok(has(nodeText('guerrero', 'guardian', 's9'), `${T.bastion.wall.drPerCharge}%`, `${T.bastion.wall.t} s`), 'Muro de Escudos');
assert.ok(has(nodeText('guerrero', 'cruzado', 's9'), `${T.fervor.verdict.cost} de Fervor`, `${T.fervor.verdict.coefPct}%`), 'Veredicto Final');
assert.ok(has(nodeText('guerrero', 'cruzado', 'x3'), `${T.fervor.ascension.need} Veredictos`, `${T.fervor.ascension.t} s`), 'Ascensión');
assert.ok(has(nodeText('maga', 'piromante', 's4'), `${T.calor.llamarada} de Calor`), 'Llamarada Avivada');
assert.ok(has(nodeText('maga', 'piromante', 's9'), `${T.calor.combustion.t} s`), 'Combustión');
assert.ok(has(nodeText('maga', 'arcanista', 's14'), `${T.cargas.resonanceCrit}%`), 'Resonancia');
assert.ok(has(nodeText('maga', 'arcanista', 's4'), `máx. ${T.cargas.orbMax}`), 'Orbe Resonante');
assert.ok(has(nodeText('arquera', 'francotiradora', 's4'), `${T.concentracion.alientoSpend} de Concentración`), 'Aliento del Cazador');
assert.ok(has(nodeText('arquera', 'francotiradora', 's9'), `${T.concentracion.vision.t} s`), 'Visión Certera');
assert.ok(has(nodeText('arquera', 'montaraz', 's14'), `hasta ${T.coto.maxArmed + T.coto.maxArmedExtra}`), 'Coto Cerrado');
assert.ok(has(nodeText('arquera', 'tiradora', 's4'), `${T.impulso.andanada} de Impulso`), 'Andanada Impulsiva');
assert.ok(has(nodeText('arquera', 'tiradora', 's14'), `${T.impulso.galechain.perKill} s`, `+${T.impulso.galechain.max} s`), 'Vendaval Perpetuo');
assert.ok(Object.isFrozen(T) && gaugeTuning() === T, 'gaugeTuning: congelado y estable');

console.log('✅ gaugeView v2 (2d.2 §3.10): comunes, x de los 9, seq gain/full/spent/empty, objetivo de la Escarcha, colores y gaugeTuning OK');
