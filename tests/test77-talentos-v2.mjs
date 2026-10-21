// Paso 2g · E1 (W1) — motor de talentos v2 (js/talents.js) sobre el fixture v2
//  1) reglas comunes = TV2.REGLAS del mockup; earnedAt y pointKindAt (un sistema por nivel)
//  2) G3 ritmo: ningún árbol se completa; último punto de especialización al Nv70
//  3) G4 presupuesto (algoritmo de check3.js): un final cabe; dos no; con dos, el ápice ≤ 1;
//     y el motor no deja comprar lo que el presupuesto no da
//  4) puertas y requisitos; nodos gratis
//  5) G5 Paragon: sin efecto hasta 31/31 gastados; clave gratis al abrirse; apertura al Nv70
//  6) G13 pausa: bajar de 31/31 pausa el héroe (sin efecto, nodos guardados) y volver lo reactiva
//  7) buildRanks idéntico a simularBuild (validador) y a t2applyPreset (héroe), nivel a nivel,
//     sobre las 36 builds del fixture y las 12 REALES de la Maga del mockup
//  8) aggregateTalents: selectores §3.8, escala por rango, costRedBig, powerRank/talentRank,
//     innata y mecánica solo con la especialización activa; memo por revisión (riesgo 11)
//  9) normalizeTalents v2: v1 → vacío, purga, elecciones, héroe por especialización, loadouts,
//     validación por árbol al nivel (talentos-recortados)
// 10) treeSignature, specElem, presetRanks/presetList (envoltorios del banco)
import assert from 'node:assert/strict';
import './helpers/use-talents-fixture.mjs';
import { cargarMockup } from '../tools/convert-v2/lib/cargar.mjs';
const T = await import('../js/talents.js');
const F = await import('./fixtures/talents-sample.mjs');
const { CLASSES } = await import('../js/data.js');

const { TV2, C: MAGA_MOCK } = cargarMockup('maga');
const hero = (classId, level, talents = {}) => ({ classId, level, talents: T.normalizeTalents({ v: 2, ...talents }, classId) });
const spent = (nodes, ranks) => T.spentIn({ nodes }, ranks);

// ------------------------------------------------ 1) reglas comunes
assert.equal(T.TALENT_TREES.maga, F.MAGA_TALENTS, 'el gancho carga el fixture');
assert.equal(T.LEVEL_MAX, TV2.REGLAS.nivelMax);
assert.deepEqual({ ...T.TALENT_RULES.pts }, { ...TV2.REGLAS.pts });
for (const k of ['specAt', 'specLast', 'heroAt', 'textoMax', 'heroNodos']) assert.equal(T.TALENT_RULES[k], TV2.REGLAS[k], k);
assert.deepEqual([...T.TALENT_RULES.clsLate], [...TV2.REGLAS.clsLate]);
assert.deepEqual(JSON.parse(JSON.stringify(T.CLASS_GATES)), JSON.parse(JSON.stringify(TV2.REGLAS.gates.cls)));
assert.deepEqual(JSON.parse(JSON.stringify(T.SPEC_GATES)), JSON.parse(JSON.stringify(TV2.REGLAS.gates.spec)));
assert.deepEqual(T.HERO_GATES, []);
const kinds = { spec: 0, cls: 0, hero: 0, board: 0 };
for (let L = 1; L <= 100; L++) {
  for (const w of ['cls', 'spec', 'hero', 'board']) assert.equal(T.earnedAt(w, L), TV2.earnedAt(w, L), `earnedAt(${w}, ${L})`);
  const k = T.pointKindAt(L);
  const gained = ['cls', 'spec', 'hero', 'board'].filter(w => T.earnedAt(w, L) > T.earnedAt(w, L - 1));
  assert.ok(gained.length <= 1, `Nv${L}: un solo sistema por nivel (${gained})`);
  assert.equal(k, gained[0] || null, `pointKindAt(${L})`);
  if (k) kinds[k]++;
}
assert.deepEqual(kinds, { spec: 31, cls: 34, hero: 10, board: 16 }, 'cada sistema recibe sus puntos exactos hasta el 100');
assert.equal(T.pointKindAt(9), null); assert.equal(T.pointKindAt(10), 'spec'); assert.equal(T.pointKindAt(11), 'cls');
assert.equal(T.pointKindAt(70), 'spec'); assert.equal(T.pointKindAt(71), 'hero'); assert.equal(T.pointKindAt(80), 'hero');
assert.equal(T.pointKindAt(81), 'board'); assert.equal(T.pointKindAt(85), 'cls'); assert.equal(T.pointKindAt(100), 'cls');
assert.equal(T.PARAGON_OPEN_LEVEL, 81);
assert.equal(T.TALENT_START_LEVEL, 10, 'stub @deprecated = TALENT_RULES.specAt (D23)');
assert.equal(T.specInsignia('maga', 'piromante'), null, 'stub @deprecated → null (D23)');
// resto de stubs @deprecated (D23): siguen exportados con un valor coherente con v2
assert.equal(T.TALENT_CAP_LEVEL, 100); assert.equal(T.featCount({ strongholdsCleared: ['a', 'b'], records: { bossKills: 9 } }), 0, 'D11: sin hazañas');
assert.equal(T.skillElem({ id: 'x', elem: 'frost' }), 'frost'); assert.equal(T.skillElem(null), null);
assert.equal(T.ELEM_NAME.fire, 'Fuego'); assert.deepEqual(T.SKILL_ELEM, {});
assert.deepEqual([9, 10, 18, 50, 100].map(T.talentSkillBase), [1, 1, 2, 6, 6]);
console.log('Reglas comunes = TV2.REGLAS; un sistema por nivel (31 + 34 + 10 + 16) ✓');

// ------------------------------------------------ 2) G3 ritmo
for (const [cid, t] of Object.entries(F.FIXTURE_TREES)) {
  const total = nodes => nodes.reduce((a, n) => a + (n.free ? 0 : n.max), 0);
  assert.equal(total(t.cls.nodes), 53, `${cid}: clase 53 rangos`);
  assert.ok(total(t.cls.nodes) > T.earnedAt('cls', 100), `${cid}: la clase no se completa`);
  for (const s of t.specs) { assert.equal(total(s.nodes), 59); assert.ok(total(s.nodes) > T.earnedAt('spec', 100), `${cid}/${s.id}: no se completa`); }
  for (const h of t.hero) assert.ok(total(h.nodes) > T.earnedAt('hero', 100), `${cid}/${h.id}: el Paragon no se completa`);
}
assert.equal(T.earnedAt('spec', 69), 30); assert.equal(T.earnedAt('spec', 70), 31); assert.equal(T.earnedAt('spec', 100), 31);
assert.equal(T.earnedAt('cls', 69), 30); assert.equal(T.earnedAt('cls', 84), 30); assert.equal(T.earnedAt('cls', 100), 34);
assert.equal(T.earnedAt('hero', 70), 0); assert.equal(T.earnedAt('hero', 71), 1); assert.equal(T.earnedAt('hero', 80), 10);
assert.equal(T.earnedAt('board', 80), 0); assert.equal(T.earnedAt('board', 81), 1); assert.equal(T.earnedAt('board', 100), 16);
console.log('G3: ningún árbol se completa; último punto de especialización al Nv70 ✓');

// ------------------------------------------------ 3) G4 presupuesto (check3.js)
// coste mínimo de tener unos nodos a unos rangos: cadenas de requisitos (padres al máximo) + relleno de puertas
function minCost(nodes, gates, targets) {
  const by = new Map(nodes.map(n => [n.id, n]));
  const memo = new Map();
  const chains = id => {
    if (memo.has(id)) return memo.get(id);
    const n = by.get(id), rq = n.req || [];
    const out = rq.length ? rq.flatMap(q => chains(q).map(c => [...c, id])) : [[id]];
    memo.set(id, out); return out;
  };
  const cost = need => {
    let base = 0, maxRow = 0;
    for (const [id, r] of need) { const n = by.get(id); if (!n.free) base += r; maxRow = Math.max(maxRow, n.r); }
    let fill = 0;
    for (const g of gates) {
      if (g.row > maxRow) continue;
      let have = 0, cap = 0;
      for (const n of nodes) { if (n.free || n.r >= g.row) continue; const r = need.get(n.id) || 0; have += r; cap += n.max - r; }
      const f = Math.max(0, g.need - have);
      if (f > cap) return Infinity;
      fill = Math.max(fill, f);
    }
    return base + fill;
  };
  const ids = Object.keys(targets);
  let best = Infinity;
  const rec = (i, need) => {
    if (i === ids.length) { best = Math.min(best, cost(need)); return; }
    for (const ch of chains(ids[i])) {
      const nn = new Map(need);
      ch.forEach((id, k) => nn.set(id, Math.max(nn.get(id) || 0, k === ch.length - 1 ? targets[ids[i]] : by.get(id).max)));
      rec(i + 1, nn);
    }
  };
  rec(0, new Map());
  return best;
}
for (const [cid, t] of Object.entries(F.FIXTURE_TREES)) {
  const cf = t.cls.nodes.filter(n => n.t === 'f').map(n => n.id);
  for (const f of cf) assert.equal(minCost(t.cls.nodes, T.CLASS_GATES, { [f]: 3 }), 30, `${cid}: un final de clase cuesta 30 (Nv69)`);
  assert.ok(minCost(t.cls.nodes, T.CLASS_GATES, { [cf[0]]: 3, [cf[1]]: 3 }) > 34, `${cid}: dos finales de clase no caben`);
  for (const s of t.specs) {
    const fs = s.nodes.filter(n => n.t === 'f').map(n => n.id), ap = s.nodes.find(n => n.t === 'x').id;
    for (const f of fs) {
      assert.equal(minCost(s.nodes, T.SPEC_GATES, { [f]: 3 }), 26, `${s.id}: un final al máximo = 26 (Nv60)`);
      assert.equal(minCost(s.nodes, T.SPEC_GATES, { [f]: 3, [ap]: 4 }), 30, `${s.id}: final + ápice completo = 30 (Nv68)`);
    }
    for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) {
      assert.ok(minCost(s.nodes, T.SPEC_GATES, { [fs[i]]: 3, [fs[j]]: 3 }) > 31, `${s.id}: dos finales al máximo no caben`);
      assert.ok(minCost(s.nodes, T.SPEC_GATES, { [fs[i]]: 1, [fs[j]]: 1, [ap]: 1 }) <= 31, `${s.id}: con dos finales cabe el ápice a rango 1`);
      assert.ok(minCost(s.nodes, T.SPEC_GATES, { [fs[i]]: 1, [fs[j]]: 1, [ap]: 2 }) > 31, `${s.id}: con dos finales el ápice no pasa de 1`);
    }
  }
}
// el motor tampoco lo permite: una lista de compra que pide dos finales al máximo se queda en uno
{
  const s = F.MAGA_TALENTS.specs[0];
  const greedy = s.nodes.filter(n => !n.free).sort((a, b) => a.r - b.r || a.c - b.c).map(n => [n.id, n.max]);
  const r = T.fillByOrder(s.nodes, T.SPEC_GATES, greedy, 31);
  assert.equal(spent(s.nodes, r), 31);
  assert.ok(s.nodes.filter(n => n.t === 'f' && (r[n.id] | 0) === n.max).length <= 1, 'nunca dos finales al máximo');
}
console.log('G4: un final cabe (clase 30, especialización 26; con ápice 30), dos no; con dos, ápice ≤ 1 ✓');

// ------------------------------------------------ 4) puertas, requisitos, puntos y nodos gratis
{
  const p = hero('maga', 50, { spec: 'piromante' });
  const cls = T.treeOf(p, 'cls'), sp = T.treeOf(p, 'spec');
  assert.equal(cls.nodes.length, 30); assert.equal(sp.nodes.length, 29);
  assert.equal(T.canAddRank(p, 'cls', 'c1'), true);
  assert.equal(T.canAddRank(p, 'cls', 'c4'), false, 'c4 exige c1 al máximo');
  p.talents.cls.c1 = 2;
  assert.equal(T.canAddRank(p, 'cls', 'c4'), true);
  assert.equal(T.canAddRank(p, 'spec', 's0'), false, 'la clave gratis no se compra');
  assert.equal(T.canAddRank(p, 'spec', 's1'), true, 's1 cuelga de la clave gratis');
  // puerta de la fila 4: 8 puntos en las filas 0–3
  const nine = { c1: 2, c4: 3, c5: 1, c8: 2, c11: 1 };
  assert.equal(spent(cls.nodes, nine), 9);
  assert.equal(T.gateFail(cls, nine, T.nodeById(cls, 'c15'), 50), null, 'con 9 arriba se abre la fila 4');
  assert.match(T.gateFail(cls, { c1: 2, c4: 3, c5: 1, c8: 1 }, T.nodeById(cls, 'c15'), 50) || '', /Gasta 8 puntos/, '7 puntos arriba no abren la fila 4');
  assert.equal(T.gateFail(cls, { c1: 2, c4: 3, c5: 1, c8: 1 }, T.nodeById(cls, 'c11'), 50), null, 'la fila 3 no tiene puerta');
  // ápice: 25 puntos en las filas 0–8
  const s = T.treeOf(p, 'spec');
  const x = T.nodeById(s, 's28');
  const r24 = T.fillByOrder(s.nodes, T.SPEC_GATES, s.nodes.filter(n => !n.free && n.r < 9).map(n => [n.id, n.max]), 24);
  assert.match(T.gateFail(s, r24, x, 100) || '', /Gasta 25 puntos/);
  const r25 = T.fillByOrder(s.nodes, T.SPEC_GATES, s.nodes.filter(n => !n.free && n.r < 9).map(n => [n.id, n.max]), 25);
  assert.equal(T.gateFail(s, r25, x, 100), null, 'con 25 se abre el ápice');
  assert.match(T.reqFail(cls, { c1: 1 }, T.nodeById(cls, 'c4')) || '', /al máximo/);
  // presupuesto: Nv11 da 1 punto de clase
  const q = hero('maga', 11, { spec: 'piromante' });
  assert.equal(T.talentPointsLeft(q, 'cls'), 1); assert.equal(T.talentPointsLeft(q, 'spec'), 1);
  q.talents.cls.c1 = 1;
  assert.equal(T.canAddRank(q, 'cls', 'c1'), false, 'sin puntos de clase');
  assert.equal(T.canRemoveRank(q, 'cls', 'c1'), true);
  q.talents.cls = { c1: 2, c4: 1 };
  assert.equal(T.canRemoveRank(q, 'cls', 'c1'), false, 'no se quita un padre del que cuelga otro');
  // sin especialización: 0 puntos de especialización y ningún árbol de especialización
  const n = hero('arquera', 40);
  assert.equal(T.treeOf(n, 'spec'), null); assert.equal(T.talentPointsLeft(n, 'spec'), 0);
  assert.equal(T.activeSpec(hero('arquera', 9, { spec: 'tiradora' })), null, 'antes del Nv10 la especialización no está activa');
}
console.log('Puertas (8 → fila 4), requisitos, presupuesto por nivel y clave gratis ✓');

// ------------------------------------------------ 5) G5 Paragon: apertura
const PYRO = F.MAGA_TALENTS.builds.brasa;     // Paragon «invoca»
function heroAt(level, build = PYRO, classId = 'maga') {
  const r = T.buildRanks({ classId, level }, build, { level });
  return { classId, level, talents: T.normalizeTalents({ v: 2, spec: build.sp, cls: r.cls, sp: r.sp, choice: r.choice, hero: r.hero ? { [build.sp]: r.hero } : {} }, 'maga') };
}
{
  assert.deepEqual(T.heroTreesFor('maga', 'piromante').map(h => h.id), ['crono', 'invoca'], 'cada especialización en 2 árboles héroe');
  assert.deepEqual(T.heroTreesFor('maga', 'crionte').map(h => h.id), ['invoca', 'escriba']);
  const p69 = heroAt(69);
  assert.equal(spent(T.findSpec('maga', 'piromante').nodes, p69.talents.sp.piromante), 30);
  assert.equal(T.heroOpen(p69), false, 'Nv69: 30/31 → Paragon cerrado');
  assert.equal(T.talentPointsEarned(p69, 'hero'), 0);
  const a69 = T.aggregateTalents(p69);
  const keyPower = F.MAGA_TALENTS.hero.find(h => h.id === 'invoca').nodes[0].fx.power;
  assert.ok(!a69.powers.has(keyPower), 'sin efecto del árbol héroe antes de 31/31');
  assert.equal(a69.heroOpen, false);
  const p70 = heroAt(70);
  assert.equal(T.heroOpen(p70), true, 'Nv70 con los 31 gastados: Paragon abierto');
  assert.equal(T.talentPointsEarned(p70, 'hero'), 0, 'el primer punto llega al Nv71');
  assert.ok(T.aggregateTalents(p70).powers.has(keyPower), 'la clave del héroe es gratis al abrirse');
  assert.equal(T.activeHeroTree(p70).id, 'invoca');
  // con los 31 ganados pero 30 gastados: cerrado aunque el nivel dé puntos de héroe
  const p75 = heroAt(75);
  const s0 = Object.keys(p75.talents.sp.piromante).find(id => id === 's3');
  p75.talents.sp.piromante[s0]--; if (!p75.talents.sp.piromante[s0]) delete p75.talents.sp.piromante[s0];
  assert.equal(T.heroOpen(p75), false, '30/31 gastados: cerrado');
  assert.equal(T.talentPointsLeft(p75, 'hero') <= 0, true);
}
console.log('G5: Paragon cerrado hasta 31/31 gastados, abierto al Nv70, clave gratis y 1.er punto al Nv71 ✓');

// ------------------------------------------------ 6) G13 pausa
{
  const p = heroAt(80);
  const inv = F.MAGA_TALENTS.hero.find(h => h.id === 'invoca');
  const ranks = p.talents.hero.piromante.nodes.invoca;
  assert.equal(Object.keys(ranks).length, 10, 'Nv80: 10 nodos de héroe');
  const nodePower = inv.nodes.find(n => n.id === 'f3').fx.power;
  assert.ok(T.aggregateTalents(p).powers.has(nodePower));
  assert.equal(T.talentRank(p, 'f3'), 1);
  assert.equal(T.heroPaused(p), false);
  const saved = JSON.stringify(p.talents.hero);
  delete p.talents.sp.piromante.s3;      // 30/31
  assert.equal(T.heroPaused(p), true, 'bajar de 31/31 pausa el Paragon');
  const a = T.aggregateTalents(p);
  assert.ok(!a.powers.has(nodePower) && !a.powers.has(inv.nodes[0].fx.power), 'en pausa no da efecto (ni la clave)');
  assert.equal(a.heroPaused, true); assert.equal(a.ranks.f3, undefined);
  p.talentAgg = a;
  assert.equal(T.talentRank(p, 'f3'), 0, 'talentRank = 0 en pausa');
  assert.equal(JSON.stringify(p.talents.hero), saved, 'los nodos del Paragon se guardan');
  p.talents.sp.piromante.s3 = 1;
  assert.equal(T.heroPaused(p), false);
  const b = T.aggregateTalents(p);
  assert.ok(b.powers.has(nodePower), 'al recuperar 31/31 vuelve a funcionar');
  p.talentAgg = b;
  assert.equal(T.talentRank(p, 'f3'), 1);
  // otro árbol héroe vacío: no está en pausa aunque falte un punto
  delete p.talents.sp.piromante.s3;
  p.talents.hero.piromante.tree = 'crono';
  assert.equal(T.heroPaused(p), false, 'la pausa mira el árbol héroe activo');
}
console.log('G13: pausa sin efecto, nodos guardados y recuperación ✓');

// ------------------------------------------------ 7) buildRanks = simularBuild (copia LITERAL del validador)
function simularBuild(TV2, list, gates, order, w) {
  const by = id => list.find(n => n.id === id);
  const above = (row, ranks) => list.reduce((s, n) => s + (n.r < row && !n.free ? (ranks[n.id] || 0) : 0), 0);
  const legal = ranks => { for (const n of list) { const r = ranks[n.id] || 0; if (!r) continue; if (r > n.max) return false;
    if (n.req?.length && !n.req.some(q => { const p = by(q); return p && (p.free || (ranks[q] || 0) >= p.max); })) return false;
    for (const g of gates) if (n.r >= g.row && above(g.row, ranks) < g.need) return false; } return true; };
  const ranks = {}; let spent = 0, fin = null; const hitos = [];
  for (let L = 1; L <= TV2.REGLAS.nivelMax; L++) {
    while (spent < TV2.earnedAt(w, L)) {
      const hit = order.find(([id, t]) => { if (!by(id) || (ranks[id] || 0) >= t) return false; ranks[id] = (ranks[id] || 0) + 1; const ok = legal(ranks); ranks[id]--; return ok; });
      if (!hit) break; ranks[hit[0]] = (ranks[hit[0]] || 0) + 1; spent++;
    }
    const f = list.find(n => n.t === 'f' && (ranks[n.id] || 0) >= n.max); if (f && !fin) { fin = `${f.n} al Nv${L}`; hitos.push(fin); }
  }
  return { ranks, spent, fin };
}
const atLevel = L => ({ ...TV2, REGLAS: { ...TV2.REGLAS, nivelMax: L } });
const clean = r => Object.fromEntries(Object.entries(r).filter(([, v]) => v > 0));
// t2applyPreset (héroe): con el Paragon abierto, heroNodes en orden mientras queden puntos
function heroPreset(h, b, specRanks, specNodes, L) {
  const out = {};
  const open = TV2.earnedAt('spec', L) >= TV2.REGLAS.pts.spec && spent(specNodes, specRanks) >= TV2.REGLAS.pts.spec;
  if (!open) return out;
  const left = () => TV2.earnedAt('hero', L) - Object.keys(out).length;
  const node = id => h.nodes.find(n => n.id === id);
  const req = n => !n.req?.length || n.req.some(id => { const q = node(id); return q && (q.free || (out[id] || 0) >= q.max); });
  for (const id of b.heroNodes || []) { if (left() <= 0) break; const n = node(id); if (n && req(n)) out[id] = 1; }
  return out;
}
let compared = 0;
for (const [cid, t] of Object.entries(F.FIXTURE_TREES)) {
  for (const [key, raw] of Object.entries(t.builds)) {
    const b = T.normBuild(raw);
    assert.ok(!('clsOrder' in raw), `${cid}/${key}: la build del fixture viene CRUDA (normBuild no la muta)`);
    const s = T.findSpec(cid, b.sp), h = t.hero.find(x => x.id === b.hero);
    for (const L of [1, 10, 11, 24, 25, 47, 48, 57, 58, 60, 68, 69, 70, 71, 75, 80, 85, 99, 100]) {
      const r = T.buildRanks({ classId: cid }, raw, { level: L });
      assert.deepEqual(r.cls, clean(simularBuild(atLevel(L), t.cls.nodes.map(n => ({ ...n, n: n.name })), TV2.REGLAS.gates.cls, b.clsOrder, 'cls').ranks), `${cid}/${key} Nv${L}: clase`);
      assert.deepEqual(r.sp[b.sp], clean(simularBuild(atLevel(L), s.nodes.map(n => ({ ...n, n: n.name })), TV2.REGLAS.gates.spec, b.specOrder, 'spec').ranks), `${cid}/${key} Nv${L}: especialización`);
      assert.deepEqual(r.hero.nodes[b.hero], heroPreset(h, b, r.sp[b.sp], s.nodes, L), `${cid}/${key} Nv${L}: héroe`);
      assert.equal(r.hero.tree, b.hero);
      compared++;
    }
    const r100 = T.buildRanks({ classId: cid }, raw, { level: 100 });
    assert.equal(spent(t.cls.nodes, r100.cls), 34, `${cid}/${key}: 34/34`);
    assert.equal(spent(s.nodes, r100.sp[b.sp]), 31, `${cid}/${key}: 31/31`);
    assert.equal(Object.keys(r100.hero.nodes[b.hero]).length, 10, `${cid}/${key}: 1 + 10 de héroe`);
    assert.deepEqual(r100.choice, { ...raw.clsCh, ...raw.specCh });
  }
}
// las 12 builds REALES de la Maga del mockup (sus árboles, sin pasar por el juego)
for (const [key, raw] of Object.entries(MAGA_MOCK.builds)) {
  const b = T.normBuild(raw);
  const list = MAGA_MOCK.tree.spec[b.sp];
  for (const L of [24, 48, 58, 69, 70, 100]) {
    assert.deepEqual(T.fillByOrder(MAGA_MOCK.tree.cls, T.CLASS_GATES, b.clsOrder, T.earnedAt('cls', L)),
      clean(simularBuild(atLevel(L), MAGA_MOCK.tree.cls, TV2.REGLAS.gates.cls, b.clsOrder, 'cls').ranks), `maga/${key} Nv${L}: clase (mockup)`);
    assert.deepEqual(T.fillByOrder(list, T.SPEC_GATES, b.specOrder, T.earnedAt('spec', L)),
      clean(simularBuild(atLevel(L), list, TV2.REGLAS.gates.spec, b.specOrder, 'spec').ranks), `maga/${key} Nv${L}: especialización (mockup)`);
    compared++;
  }
}
// normBuild: acepta la forma cruda («id_» = rangos tardíos) y la normalizada; no muta
{
  const raw = F.MAGA_TALENTS.builds.ignicion;
  const b = T.normBuild(raw);
  assert.equal(b.cls.c4, 3, 'c4 + c4_ = 3 rangos');
  assert.deepEqual(b.clsOrder.filter(([id]) => id === 'c4'), [['c4', 1], ['c4', 3]], 'orden con rango acumulado');
  assert.ok('c4_' in raw.cls && !('clsOrder' in raw), 'los datos no se mutan');
  assert.equal(T.normBuild(b), b, 'idempotente');
  const mockNorm = TV2.normBuild(JSON.parse(JSON.stringify(raw)));
  assert.deepEqual(T.normBuild(mockNorm).clsOrder, b.clsOrder, 'acepta la build ya normalizada por el mockup');
  // nivel 84: el rango tardío de c4 aún no llega; a Nv85 sí
  assert.equal(T.buildRanks({ classId: 'maga' }, raw, { level: 84 }).cls.c4, 1);
  assert.equal(T.buildRanks({ classId: 'maga' }, raw, { level: 100 }).cls.c4, 3);
}
console.log(`buildRanks = simularBuild + t2applyPreset en ${compared} comparaciones (fixture y Maga real del mockup) ✓`);

// ------------------------------------------------ 8) aggregateTalents
{
  const kitOf = spec => F.FIXTURE_KITS[spec] || [];
  const p = hero('maga', 100, { spec: 'piromante' });
  // clase: @all (c2 ×2), @spender (c6A), elección B de c5 → @basic
  Object.assign(p.talents.cls, { c2: 2, c3: 2, c6: 1, c5: 1, c13: 2 });
  Object.assign(p.talents.choice, { c6: 'A', c5: 'B' });
  const a = T.aggregateTalents(p, { kitOf });
  const all = CLASSES.maga.skills.filter(s => s.kind !== 'passive');
  for (const s of all) assert.equal(a.mods[s.id]?.dmg, 12 + (s.cat === 'spender' ? 15 : 0) + (s.cat === 'basic' ? 20 : 0), `@all ×2 rangos + @spender + @basic sobre ${s.id}`);
  assert.ok(all.filter(s => s.cat === 'movement').every(s => a.mods[s.id].cdr === 20), '@movement: −20 % de enfriamiento');
  assert.equal(a.tv.eliteDmg, 12, 'tv × rango');
  assert.equal(a.spec, 'piromante'); assert.equal(a.mechanic, 'calor'); assert.deepEqual(a.innate, { dmgPct: 2 });
  assert.ok(a.powers.has('m_fx_piromante_0'), 'la clave de especialización es gratis');
  // especialización: @spec (kitOf), elem, mod a una habilidad del kit, elección
  Object.assign(p.talents.sp.piromante, { s1: 3, s2: 2, s3: 1, s5: 1, s8: 1 });
  p.talents.choice.s8 = 'B';
  const b = T.aggregateTalents(p, { kitOf });
  for (const k of kitOf('piromante')) { assert.equal(b.mods[k].dmg, 15 + (k.endsWith('k1') ? 25 : 0), `@spec ×3 + s8B en ${k}`); assert.equal(b.skillLv[k], 2, `skillLv @spec ×2 en ${k}`); }
  assert.ok(!b.mods.fx_crionte_k1, '@spec no toca el kit de otra especialización');
  const fire = all.filter(s => s.elem === 'fire');
  assert.ok(fire.length && fire.every(s => b.mods[s.id].dmg === a.mods[s.id].dmg + 4), 'elem fire: +4 % a las de Fuego');
  assert.ok(all.filter(s => s.elem === 'arcane').every(s => (b.mods[s.id].dmg || 0) === a.mods[s.id].dmg), 'elem fire no toca las de Arcano');
  // el elemento FORJADO manda (elemOf): una habilidad arcana forjada a fuego entra en @fire
  const arc = all.find(s => s.elem === 'arcane' && s.cat === 'spender');
  // (en el juego elemOf sale de la forja: cambiarla es lo que invalida el memo)
  p.skillForge = { [arc.id]: 'i' };
  const c = T.aggregateTalents(p, { kitOf, elemOf: id => (id === arc.id ? 'fire' : all.find(s => s.id === id)?.elem) });
  assert.equal(c.mods[arc.id].dmg, b.mods[arc.id].dmg + 4, `@fire con elemOf: ${arc.id} forjada a Fuego`);
  delete p.skillForge;
  // finales y ápice: powerRank / talentRank
  Object.assign(p.talents.sp.piromante, { s4: 2, s11: 2, s15: 1, s18: 2, s22: 3, s25: 2, s28: 3 });
  const d = T.aggregateTalents(p, { kitOf });
  assert.equal(d.powerRank.m_fx_piromante_25, 2, 'el final da su rango a su poder');
  assert.equal(d.powerRank.m_fx_piromante_28, 3, 'el ápice también');
  p.talentAgg = d;
  assert.equal(T.powerRank(p, 'm_fx_piromante_28'), 3);
  assert.equal(T.talentRank(p, 's25'), 2); assert.equal(T.talentRank(p, 's0'), 1, 'la clave cuenta como rango 1');
  assert.equal(T.talentRank(p, 'i25'), 0, 'otra especialización: rango 0');
  // escala por lista y costRedBig
  const x = T.scaleFx([2, 5, 9], 2); assert.equal(x, 5); assert.equal(T.scaleFx([2, 5], 4), 5, 'la lista topa en el último');
  // sin especialización activa (Nv9): ni innata ni mecánica ni nodos de especialización
  const low = { ...p, level: 9, talents: p.talents };
  const e = T.aggregateTalents(low, { kitOf });
  assert.equal(e.spec, null); assert.equal(e.mechanic, null); assert.deepEqual(e.innate, {});
  assert.ok(!e.powers.has('m_fx_piromante_0'));
}
// selectores §3.8 sobre un catálogo con tags/preparación forjados (defOf)
{
  const ctxList = CLASSES.guerrero.skills.filter(s => s.kind !== 'passive');
  const defs = Object.fromEntries(ctxList.map(s => [s.id, s]));
  const forged = { ...defs, torbellino: { ...defs.torbellino, windup: 0.6, tags: [...defs.torbellino.tags, 'charge'] },
    g_u_cataclismo: { ...defs.g_u_cataclismo, tags: [...defs.g_u_cataclismo.tags, 'zone'] } };
  const ctx = { list: ctxList, def: id => forged[id], elemOf: id => forged[id]?.elem, kitOf: () => ['zz_kit'], tagsOf: id => new Set([...(forged[id]?.tags || []), forged[id]?.cat]) };
  const E = k => T.expandSelector(k, ctx, { id: 'berserker' }).sort();
  const live = pred => ctxList.filter(pred).map(s => s.id);
  const plus = (arr, id) => [...new Set([...arr, id])].sort();
  assert.ok(!(defs.torbellino.windup > 0) && !defs.torbellino.tags.includes('charge'), 'torbellino base: sin preparación ni carga');
  assert.deepEqual(E('@windup'), plus(live(s => s.windup > 0), 'torbellino'), '@windup: la definición FORJADA');
  assert.deepEqual(E('@charge'), plus(live(s => s.tags.includes('charge')), 'torbellino'));
  assert.deepEqual(E('@tag:charge'), E('@charge'));
  assert.deepEqual(E('@holyZone'), plus(live(s => s.tags.includes('zone') && s.elem === 'holy'), 'g_u_cataclismo'));
  assert.deepEqual(E('@spender'), ctxList.filter(s => s.cat === 'spender').map(s => s.id).sort());
  assert.deepEqual(E('@cat:ultimate'), E('@ultimate'));
  assert.deepEqual(E('@insignia'), ctxList.filter(s => s.cat === 'spec').map(s => s.id).sort());
  assert.deepEqual(E('@holy'), ctxList.filter(s => s.elem === 'holy').map(s => s.id).sort());
  assert.deepEqual(E('@phys'), E('@physical'), "alias '@phys' → '@physical'");
  assert.deepEqual(E('@spec'), ['zz_kit']);
  assert.deepEqual(T.expandSelector('@spec', ctx, null), [], '@spec sin especialización: nada');
  assert.deepEqual(E('@all').length, ctxList.length);
  assert.deepEqual(E('g_tajo'), ['g_tajo']); assert.deepEqual(E('@inventado'), []);
}
// memo por revisión: recompute corre en cada addBuff (riesgo 11)
{
  const p = heroAt(100);
  const s0 = T.talentAggStats();
  const a1 = T.aggregateTalents(p);
  const a2 = T.aggregateTalents(p);
  const s1 = T.talentAggStats();
  assert.equal(s1.misses - s0.misses, 1, 'la primera vez calcula');
  assert.equal(s1.hits - s0.hits, 1, 'la segunda sale del memo');
  assert.notEqual(a1, a2, 'cada llamada recibe su copia');
  assert.deepEqual([...a1.powers].sort(), [...a2.powers].sort());
  a2.stats.hp = 999999; a2.powers.add('t_ensucia'); a2.mods.zz = { dmg: 1 };
  const a3 = T.aggregateTalents(p);
  assert.ok(a3.stats.hp !== 999999 && !a3.powers.has('t_ensucia') && !a3.mods.zz, 'mutar la copia no ensucia el memo');
  const m0 = T.talentAggStats().misses;
  p.talents.cls.c3 = (p.talents.cls.c3 | 0) === 2 ? 1 : 2; T.aggregateTalents(p);
  assert.equal(T.talentAggStats().misses, m0 + 1, 'cambiar rangos invalida');
  p.skillForge = { m_dardo: 'i' }; T.aggregateTalents(p);
  assert.equal(T.talentAggStats().misses, m0 + 2, 'cambiar la forja invalida');
  p.level = 99; T.aggregateTalents(p);
  assert.equal(T.talentAggStats().misses, m0 + 3, 'cambiar el nivel invalida');
  p.talents.hero.piromante.tree = 'crono'; T.aggregateTalents(p);
  assert.equal(T.talentAggStats().misses, m0 + 4, 'cambiar de árbol héroe invalida');
  const h0 = T.talentAggStats().hits;
  for (let i = 0; i < 50; i++) T.aggregateTalents(p);
  assert.equal(T.talentAggStats().hits, h0 + 50, '50 recompute seguidos sin cambios = 50 aciertos');
}
console.log('aggregateTalents: selectores §3.8, elemento forjado, finales con rango, innata y memo ✓');

// ------------------------------------------------ 9) normalizeTalents v2
{
  const v1 = T.normalizeTalents({ v: 1, spec: 'piromante', cls: { c1: 2 }, sp: { piromante: { s1: 3 } }, choice: { c5: 'A' } }, 'maga');
  const empty = { v: 2, spec: null, cls: {}, sp: { piromante: {}, crionte: {}, arcanista: {} }, choice: {}, hero: {}, loadouts: {} };
  assert.deepEqual({ ...v1 }, empty, 'un v1 vuelve vacío (lo rehace MIGRATIONS[4])');
  assert.deepEqual({ ...T.normalizeTalents(null, 'maga') }, empty, 'sin talentos: la misma forma');
  assert.deepEqual({ ...T.normalizeTalents(T.normalizeTalents(null, 'maga'), 'maga') }, empty, 'normalizar dos veces = una');
  const dirty = T.normalizeTalents({ v: 2, spec: 'piromante', cls: { c1: 99, zz: 3, c2: 0 }, sp: { piromante: { s0: 1, s1: 7, x9: 1 }, nope: { a: 1 } },
    choice: { c5: 'B', c6: 'Z', c1: 'A', s8: 'A', zz: 'A' }, hero: { piromante: { tree: 'escriba', nodes: { invoca: { f1: 5, t1: 1 }, crono: { t1: 1 } }, choice: { invoca: { f2: 'B', f1: 'A' } } }, nope: {} },
    loadouts: { piromante: Array.from({ length: 12 }, (_, i) => ({ name: 'x'.repeat(40) + i, cls: {}, sp: {}, choice: {} })), crionte: 'mal' } }, 'maga');
  assert.equal(dirty.spec, 'piromante');
  assert.deepEqual(dirty.cls, { c1: 2 }, 'purga ids y topa rangos');
  assert.deepEqual(dirty.sp.piromante, { s1: 3 }, 'la clave gratis no se guarda');
  assert.deepEqual(Object.keys(dirty.sp).sort(), ['arcanista', 'crionte', 'piromante']);
  assert.deepEqual(dirty.choice, { c5: 'B', s8: 'A' }, 'solo elecciones válidas de nodos de elección');
  assert.equal(dirty.hero.piromante.tree, 'crono', 'un árbol héroe ajeno a la especialización cae al primero');
  assert.deepEqual(dirty.hero.piromante.nodes, { invoca: { f1: 1 }, crono: { t1: 1 } });
  assert.deepEqual(dirty.hero.piromante.choice, { invoca: { f2: 'B' } });
  assert.equal(dirty.loadouts.piromante.length, 10, '≤ 10 configuraciones'); assert.equal(dirty.loadouts.piromante[0].name.length, 24, 'nombre ≤ 24');
  assert.equal(dirty.loadouts.crionte, undefined);
  assert.equal(T.normalizeTalents(null, 'maga').v, 2);
  // sin `v` se lee como v2 (objetos armados a mano)
  assert.deepEqual(T.normalizeTalents({ spec: 'crionte', cls: { c1: 1 } }, 'maga').cls, { c1: 1 });
  // con nivel: un árbol ilegal o que no cabe se vacía ENTERO y se anota
  const ok = T.normalizeTalents({ v: 2, spec: 'piromante', cls: { c1: 2, c4: 1 }, sp: { piromante: { s1: 1 } } }, 'maga', 50);
  assert.deepEqual(T.talentsTrimmed(ok), []);
  assert.deepEqual(ok.cls, { c1: 2, c4: 1 });
  const bad = T.normalizeTalents({ v: 2, spec: 'piromante', cls: { c4: 1, c2: 1 }, sp: { piromante: { s1: 3, s4: 2, s2: 3 }, crionte: { i1: 1 } },
    hero: { piromante: { tree: 'invoca', nodes: { invoca: { f1: 1 } } } } }, 'maga', 12);
  assert.deepEqual(bad.cls, {}, 'c4 sin c1 al máximo: la clase se vacía');
  assert.deepEqual(bad.sp.piromante, {}, '8 puntos a Nv12 (2 ganados): la especialización se vacía');
  assert.deepEqual(bad.sp.crionte, { i1: 1 }, 'las demás especializaciones se validan aparte');
  assert.deepEqual(bad.hero.piromante.nodes, {}, 'nodos de héroe sin puntos de héroe a Nv12');
  assert.deepEqual(T.talentsTrimmed(bad).sort(), ['cls', 'hero.piromante.invoca', 'sp.piromante']);
  assert.ok(!JSON.stringify(bad).includes('_trimmed') && !Object.keys(bad).includes('_trimmed'), 'la marca no se guarda');
  assert.equal(T.TALENTS_TRIMMED_NOTICE, 'talentos-recortados');
  // pausa: nodos de héroe guardados con la especialización a 30/31 NO son ilegales
  const paused = heroAt(80); delete paused.talents.sp.piromante.s3;
  const n80 = T.normalizeTalents(JSON.parse(JSON.stringify(paused.talents)), 'maga', 80);
  assert.equal(Object.keys(n80.hero.piromante.nodes.invoca).length, 10, 'en pausa los nodos se conservan');
}
console.log('normalizeTalents v2: v1 → vacío, purga, elecciones, héroe por especialización, configuraciones, recorte por árbol ✓');

// ------------------------------------------------ 10) firma, elemento, envoltorios del banco
{
  const sig = T.treeSignature('maga');
  assert.match(sig, /^[0-9a-z]+$/); assert.equal(T.treeSignature('maga'), sig, 'estable');
  assert.notEqual(T.treeSignature('guerrero'), sig, 'distinta por clase');
  const n = F.MAGA_TALENTS.specs[1].nodes[5];
  const old = n.max; n.max = old + 1;
  assert.notEqual(T.treeSignature('maga'), sig, 'cambia si cambia un max');
  n.max = old;
  const q = F.MAGA_TALENTS.hero[2].nodes[7]; const oq = q.req; q.req = [...oq].reverse();
  assert.notEqual(T.treeSignature('maga'), sig, 'cambia si cambia un requisito del héroe');
  q.req = oq;
  assert.equal(T.treeSignature('maga'), sig);
  assert.equal(T.specElem(T.findSpec('maga', 'crionte')), 'frost');
  assert.equal(T.specElem('maga', T.findSpec('maga', 'arcanista')), 'arcane', 'compat (classId, spec)');
  const p = hero('arquera', 100, { spec: 'montaraz' });
  assert.equal(T.defaultBuildKey('arquera', 'montaraz'), 'rayo');
  const r = T.buildRanks(p, F.ARQUERA_TALENTS.builds.rayo);
  assert.deepEqual(T.presetRanks(p, 'cls'), r.cls); assert.deepEqual(T.presetRanks(p, 'spec'), r.sp.montaraz);
  assert.deepEqual(T.presetList(p, 'spec').map(([id, n]) => [id, n]), T.normBuild(F.ARQUERA_TALENTS.builds.rayo).specOrder);
  assert.equal(T.presetRanks(hero('arquera', 100), 'cls'), null, 'sin especialización no hay Recomendado');
  assert.deepEqual(T.buildsFor('maga', 'crionte').map(b => b.key), ['glaciar', 'tormenta', 'fractura', 'hibcrio']);
}
console.log('treeSignature, specElem, presetRanks/presetList y buildsFor ✓');

console.log('\n✅ MOTOR DE TALENTOS v2 (test77) OK');
