// Paso 2d.2 · E2 (docs/paso2d2-hud-pc.md §4, §3.5, §3.8, Anexo A):
//  · el panel de talentos ya no tiene textos de mecánica propios: salen de explain(gaugeTuning())
//    del renderizador (mechInfo), con píldoras = nodos de la demo que existen en el árbol;
//  · el widget cabe en la columna central (1 en completo, 0,8 en compacto) y en las tarjetas;
//  · marcas de mundo (js/world-marks.js): plan puro (Escarcha sobre notables/cursor, Presa en el
//    suelo), pool fijo sin crear objetos por frame y datos a ≤ 10 Hz.
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { SPEC_INFO, mechInfo, TALENT_LAYOUTS } from '../js/ui-talents.js';
import { TALENT_TREES } from '../js/talents.js';
import { gaugeViewFor } from '../js/ui-gauges.js';
import { gaugeTuning } from '../js/spec-mechanics.js';
import { WorldMarks, worldMarksPlan, OVERHEAD_MAX, MARK_HZ } from '../js/world-marks.js';

// ---------- 1. SPEC_INFO sin textos de mecánica; mechInfo desde explain() ----------
const T = gaugeTuning();
let n = 0;
for (const [cls, tree] of Object.entries(TALENT_TREES)) {
  for (const spec of tree.specs) {
    n++;
    const info = SPEC_INFO[spec.id];
    assert.ok(info, `SPEC_INFO.${spec.id}`);
    for (const k of ['mech', 'text', 'cols']) assert.ok(!(k in info), `SPEC_INFO.${spec.id} no debe tener "${k}" (sale de explain)`);
    const M = mechInfo(spec);
    assert.ok(M && M.id === spec.mechanic, `${spec.id}: mecánica ${spec.mechanic}`);
    const E = gaugeViewFor(spec.mechanic).explain(T);
    assert.equal(M.text, E.text, `${spec.id}: texto = explain().text`);
    assert.deepEqual(M.cols, E.cols, `${spec.id}: columnas = explain().cols`);
    assert.ok(M.demoNodes.length >= 1, `${spec.id}: la demo menciona nodos (píldoras)`);
    for (const id of [...M.demoNodes, ...Object.keys(M.nodes)])
      assert.ok(spec.nodes.some(x => x.id === id), `${spec.id}: el nodo ${id} existe en el árbol`);
  }
}
assert.equal(n, 9, '9 especializaciones');
// Anexo A: ninguna de las afirmaciones falsas del panel antiguo
const all = Object.values(TALENT_TREES).flatMap(t => t.specs).map(s => mechInfo(s)).map(M => M.text + JSON.stringify(M.cols)).join(' ');
for (const bad of ['Combustión Espontánea', 'implosionan', '+12%', 'abanico de 3', 'espinas se duplican', 'Meteoro es instantáneo'])
  assert.ok(!all.includes(bad), `texto de mecánica sin «${bad}» (Anexo A)`);
console.log('Mecánica única: 9 especializaciones con texto y columnas de explain(gaugeTuning()); píldoras y nodos en el árbol ✓');

// ---------- 2. escala del widget (520×72) por diseño ----------
const { full: F, compact: C } = TALENT_LAYOUTS;
assert.equal(F.gzK, 1, 'completo: el widget a escala 1');
assert.equal(C.gzK, 0.8, 'compacto: el widget al 0,8 (nunca oculto)');
for (const L of [F, C]) {
  assert.ok(520 * L.gzK <= L.midW - 2 - 2 * L.mechPadX, `${L.name}: cabe en la columna central`);
  assert.ok(L.cardGzK >= 0.7 && 520 * L.cardGzK <= (L.W - 2 * L.padX - 2 * L.gap) / 3 - 2 - 2 * L.cardPadX - 24, `${L.name}: cabe en la tarjeta (${L.cardGzK})`);
  assert.equal(L.clsW + L.specW + L.midW + 2 * L.gap + 2 * L.padX, L.W, `${L.name}: las tres columnas llenan el ancho`);
  for (const [which, w] of [['cls', L.clsW], ['spec', L.specW]]) {
    const G = L[which], last = G.cx0 + 3 * G.dx;            // 4 columnas (c = 0…3)
    assert.ok(G.cx0 - L.big / 2 >= 8 && last + L.big / 2 + 14 <= w, `${L.name}/${which}: los nodos caben en el árbol`);
  }
}
console.log(`Escala: completo ${F.gzK} (tarjetas ${F.cardGzK}), compacto ${C.gzK} (tarjetas ${C.cardGzK}) ✓`);

// ---------- 3. marcas de mundo ----------
const mkEnemy = (x, def = {}, extra = {}) => {
  const group = new THREE.Group();
  group.position.set(x, 0, 0);
  const bar = new THREE.Group(); bar.position.y = 2.1; bar.visible = true;
  group.add(bar);
  group.userData.bar = bar;
  return { alive: true, pos: new THREE.Vector3(x, 0, 0), def: { name: 'E' + x, scale: 1, ...def }, group, hp: 100, maxHP: 100, ...extra };
};
const game = { enemies: [], ui: { hoverEnemy: null }, camera: new THREE.OrthographicCamera() };
const p = { pos: new THREE.Vector3(0, 0, 0), talentAgg: { mechanic: 'escarcha' }, gauges: {}, game };
game.player = p;
const normal = mkEnemy(1, {}, { gauges: { escarcha: { v: 3 } } });          // normal con capas: sin tira
const elite = mkEnemy(2, { rank: 'campeon' }, { gauges: { escarcha: { v: 2 } } });
const boss = mkEnemy(3, { boss: true }, { gauges: { escarcha: { v: 0 } }, numbT: 3 });
const frozen = mkEnemy(4, {}, { gauges: { escarcha: { v: 0 } }, frozenT: 1 });
const far = mkEnemy(60, { rank: 'elite' }, { gauges: { escarcha: { v: 4 } } });
game.enemies.push(normal, elite, boss, frozen, far);
let plan = worldMarksPlan(game);
assert.equal(plan.id, 'escarcha');
assert.deepEqual(plan.overhead.map(o => o.e).sort((a, b) => a.pos.x - b.pos.x), [elite, boss], 'tira solo en élites y jefes cercanos (R1)');
assert.ok(plan.overhead.find(o => o.e === boss).numb, 'jefe Aterido');
game.ui.hoverEnemy = normal;
plan = worldMarksPlan(game);
assert.ok(plan.overhead.some(o => o.e === normal && o.n === 3), 'el enemigo bajo el cursor lleva su tira');
game.ui.hoverEnemy = frozen;
assert.ok(worldMarksPlan(game).overhead.some(o => o.e === frozen && o.frozen), 'congelado bajo el cursor: los 5 rombos');
assert.equal(plan.ground, null, 'Escarcha no pinta suelo');

const scene = new THREE.Scene();
const wm = new WorldMarks(scene);
const objs = wm.objectCount();
assert.ok(scene.children.includes(wm.group), 'las marcas viven en su propio grupo de la escena');
for (let i = 0; i < 120; i++) wm.update(game, 1 / 60);                    // 2 s a 60 fps
assert.ok(wm.updates >= 2 * MARK_HZ - 1 && wm.updates <= 2 * MARK_HZ + 1, `datos a ${MARK_HZ} Hz (${wm.updates} pasadas en 2 s)`);
assert.equal(wm.objectCount(), objs, 'ningún objeto nuevo por frame (pool fijo)');
const used = wm.strips.filter(s => s.e);
assert.equal(used.length, 3, 'tres tiras asignadas (élite, jefe, congelado bajo el cursor)');
const sb = wm.strips.find(s => s.e === boss);
assert.ok(sb.g.visible && sb.halo.visible, 'jefe Aterido: tira visible con aro');
assert.ok(Math.abs(sb.g.position.x - 3) < 1e-6 && Math.abs(sb.g.position.y - (2.15 + 0.17)) < 1e-6, 'la tira va sobre la barra de vida');
const se = wm.strips.find(s => s.e === elite);
assert.equal(se.gems.filter(g => g.material === wm.res.m.lit).length, 2, 'élite con 2 capas: 2 rombos encendidos');
elite.alive = false;
for (let i = 0; i < 10; i++) wm.update(game, 1 / 60);
assert.ok(!wm.strips.some(s => s.e === elite), 'muerto: se libera su tira');
// pool acotado: muchos notables → como mucho OVERHEAD_MAX tiras, las más cercanas
game.enemies.length = 0;
for (let i = 0; i < 20; i++) game.enemies.push(mkEnemy(1 + i, { rank: 'elite' }, { gauges: { escarcha: { v: 1 } } }));
game.ui.hoverEnemy = null;
wm.update(game, 0.2);
assert.equal(wm.strips.filter(s => s.e).length, OVERHEAD_MAX, `como mucho ${OVERHEAD_MAX} tiras`);
assert.ok(wm.strips.every(s => !s.e || s.e.pos.x <= OVERHEAD_MAX), 'las más cercanas');
assert.equal(wm.objectCount(), objs, 'pool fijo con 20 notables');

// Montaraz: anillo de zarzas bajo la Presa (sin textura en headless no se muestra: nunca un cuadrado blanco)
p.talentAgg.mechanic = 'coto';
const prey = mkEnemy(5, { rank: 'elite', scale: 1.2 });
game.enemies.length = 0; game.enemies.push(mkEnemy(2), prey);
p.gauges.coto = { v: 0, prey, preyT: 2 };
plan = worldMarksPlan(game);
assert.ok(plan.ground && plan.ground.e === prey && plan.ground.blend === 'additive' && plan.ground.asset === 'gz_coto_marca_suelo' && plan.ground.expiring, 'Presa: anillo aditivo que parpadea al caducar');
assert.equal(plan.overhead.length, 0, 'Coto no pinta tiras');
wm.update(game, 0.2);
assert.equal(wm.groundMesh.visible, false, 'sin textura cargada el anillo no se muestra');
wm.groundReady = true;
wm.update(game, 0.2);
assert.ok(wm.groundMesh.visible && Math.abs(wm.groundMesh.position.x - 5) < 1e-6, 'anillo bajo la Presa');
assert.ok(wm.groundMesh.material.blending === THREE.AdditiveBlending && !wm.groundMesh.material.depthWrite, 'mezcla aditiva');
p.gauges.coto = { v: 0, prey: null, preyT: 0 };
wm.update(game, 0.2);
assert.equal(wm.groundMesh.visible, false, 'sin Presa no hay anillo');
p.talentAgg.mechanic = null;
assert.deepEqual(worldMarksPlan(game), { id: null, overhead: [], ground: null }, 'sin especialización no hay marcas');
wm.clear();
assert.ok(wm.strips.every(s => !s.e && !s.g.visible), 'clear() libera todo (cambio de mundo)');
console.log('Marcas de mundo: Escarcha sobre notables/cursor, Presa con anillo aditivo, pool fijo y datos a 10 Hz ✓');

console.log('\n✅ PANEL DE TALENTOS Y MARCAS DE MUNDO (Paso 2d.2 · E2) OK');
