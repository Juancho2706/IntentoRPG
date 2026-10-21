// ============================================================
// Paso 2d.2 · E0 (W1): gaugeView v2 de js/spec-mechanics.js (docs/paso2d2-hud-pc.md §3.10)
// ============================================================
// (el plan lo llamaba test72; ese número ya lo usa test72-nucleo-2c2 y el 73 es del HUD de PC)
// Parte GENÉRICA (Paso 2, E1.5): con el arnés REAL (h.gaugeView()), los 9 indicadores:
//  · campos comunes nuevos: tMax, decayIn, decaying, hold, ready, seq, x, sinceCombat;
//    compatibilidad hacia atrás (id, name, value, max, color, state, label, t, enemy);
//  · que exista cada campo `x` de la tabla §3.10; seq (gain, full, spent, empty) con la API del núcleo;
//  · colores de STYLE.md en def.color; gaugeTuning() congelado y estable.
// Los casos por clase (cada `x` en su estado, objetivo de la Escarcha, gaugeTuning contra el texto del
// nodo) están en tests/test-gauges-<clase>.mjs: usan ids de nodo y habilidades de la clase (KT, E2).
import assert from 'node:assert/strict';
import { makeHarness } from './helpers/power-harness.mjs';
import { BASE_GAUGE_IDS, gaugeDefs, gaugeTuning, gaugeSeq, gainGauge, spendGauge } from '../js/spec-mechanics.js';

const mk =(classId, spec, level = 30, extra = {}) => makeHarness({ classId, spec, level, ...extra });
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
// con la API del núcleo (sin ids de nodo ni habilidades): una barra por clase
for (const [cid, s, id] of [['guerrero', 'guardian', 'bastion'], ['maga', 'arcanista', 'cargas'], ['arquera', 'francotiradora', 'concentracion']]) {
  const h = mk(cid, s, 40);
  const max = gaugeDefs()[id].max;
  let d = seqDelta(h, id, () => gainGauge(h.p, id, max));
  assert.ok(d.gain === 1 && d.full === 1, `${id}: seq.gain + seq.full al llenarse (${JSON.stringify(d)})`);
  d = seqDelta(h, id, () => spendGauge(h.p, id, max));
  assert.ok(d.spent === 1 && d.empty === 1, `${id}: seq.spent + seq.empty al vaciarse (${JSON.stringify(d)})`);
  const before = { ...gaugeSeq(h.p, id) };
  h.p.gauges = {};
  assert.deepEqual(h.gaugeView().seq, before, `${id}: seq sobrevive a resetGauges`);
}

// Los casos por clase (Sed, Bastión, Fervor, Calor, Escarcha, Cargas, Concentración, Coto e Impulso,
// y gaugeTuning contra el texto de sus nodos) viven en tests/test-gauges-<clase>.mjs desde el Paso 2
// (E1.5): usan ids de nodo y habilidades de cada clase (dueño KT de la clase).

assert.ok(Object.isFrozen(T) && gaugeTuning() === T, 'gaugeTuning: congelado y estable');

console.log('✅ gaugeView v2 (2d.2 §3.10): campos comunes, x de los 9, seq, colores y gaugeTuning estable OK');
