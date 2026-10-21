// Paso 2 · E3 (U1) — la mecánica de cada especialización en el panel de talentos v2 y las marcas de mundo
// (docs/paso2-implementacion.md §3.12; docs/paso2d2-hud-pc.md §4 y Anexo A; 2g §9.3)
//  1) el panel no tiene textos de mecánica propios: SPEC_INFO solo trae presentación (color e icono del chip)
//     y mechInfo(spec) sale de explain(gaugeTuning()) del renderizador de cada mecánica (sin las
//     afirmaciones falsas del panel antiguo, Anexo A)
//  2) el selector de especialización (chooserView) enseña rol, línea, mecánica, pasiva y kit de las 9, con
//     el icono del chip en assets/; bloqueado antes del Nv10 y con la actual marcada después. El kit son
//     las habilidades con `spec` del catálogo o, mientras no lo tengan, las que más mejora su árbol
//  3) marcas de mundo (js/world-marks.js): Escarcha sobre notables o el cursor, Presa con anillo
//     aditivo, pool fijo y datos a 10 Hz
// Los nodos que citan las demos de cada barra (A3) son de KT: los vigila test-gauges-<clase>.
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import * as THREE from 'three';
import { SPEC_INFO, mechInfo } from '../js/ui-talents.js';
import { chooserView, talentsView } from '../js/talents-view.js';
import { TALENT_TREES } from '../js/talents.js';
import { CLASSES } from '../js/data.js';
import { gaugeViewFor } from '../js/ui-gauges.js';
import { gaugeTuning, gaugeDefs } from '../js/spec-mechanics.js';
import { WorldMarks, worldMarksPlan, OVERHEAD_MAX, MARK_HZ } from '../js/world-marks.js';
import { makeHarness } from './helpers/power-harness.mjs';

// ---------- 1. SPEC_INFO sin textos de mecánica; mechInfo desde explain() ----------
const T = gaugeTuning();
let n = 0;
for (const [cls, tree] of Object.entries(TALENT_TREES)) {
  for (const spec of tree.specs) {
    n++;
    const info = SPEC_INFO[spec.id];
    assert.ok(info, `SPEC_INFO.${spec.id}`);
    for (const k of ['mech', 'text', 'cols', 'desc', 'role']) assert.ok(!(k in info), `SPEC_INFO.${spec.id} no debe tener "${k}" (sale de los datos o de explain)`);
    assert.match(info.color, /^#[0-9a-f]{6}$/i, `${spec.id}: color`);
    assert.ok(existsSync(new URL(`../assets/${info.gaugeIcon}`, import.meta.url)), `${spec.id}: icono del chip assets/${info.gaugeIcon}`);
    const M = mechInfo(spec);
    assert.ok(M && M.id === spec.mechanic, `${cls}/${spec.id}: mecánica ${spec.mechanic}`);
    assert.equal(M.name, gaugeDefs()[spec.mechanic].name, `${spec.id}: nombre de spec-mechanics`);
    const E = gaugeViewFor(spec.mechanic).explain(T);
    assert.equal(M.text, E.text, `${spec.id}: texto = explain().text`);
    assert.deepEqual(M.cols, E.cols, `${spec.id}: columnas = explain().cols`);
    assert.ok(M.text.length > 20 && M.cols.length === 3, `${spec.id}: texto y columnas Generar/Descargar/Pérdida`);
  }
}
assert.equal(n, 9, '9 especializaciones');
assert.equal(Object.keys(SPEC_INFO).length, 9, 'SPEC_INFO: solo las 9');
assert.equal(mechInfo({}), null, 'sin mecánica no hay bloque');
// Anexo A: ninguna de las afirmaciones falsas del panel antiguo
const all = Object.values(TALENT_TREES).flatMap(t => t.specs).map(s => mechInfo(s)).map(M => M.text + JSON.stringify(M.cols)).join(' ');
for (const bad of ['Combustión Espontánea', 'implosionan', '+12%', 'abanico de 3', 'espinas se duplican', 'Meteoro es instantáneo'])
  assert.ok(!all.includes(bad), `texto de mecánica sin «${bad}» (Anexo A)`);
console.log('Mecánica: 9 especializaciones con nombre, texto y columnas de explain(gaugeTuning()); SPEC_INFO solo presentación ✓');

// ---------- 2. selector de especialización ----------
for (const [cls, tree] of Object.entries(TALENT_TREES)) {
  const low = chooserView(makeHarness({ classId: cls, level: 9 }).p);
  assert.deepEqual(low.map(c => c.id), tree.specs.map(s => s.id), `${cls}: las 3 tarjetas en el orden de los datos`);
  assert.ok(low.every(c => c.locked && !c.current), `${cls} Nv9: bloqueadas`);
  for (const c of low) {
    const s = tree.specs.find(x => x.id === c.id);
    assert.equal(c.mechanic, s.mechanic);
    assert.equal(c.innate, s.innateText, `${c.id}: la pasiva de los datos`);
    assert.ok(c.role && c.line && c.icon && c.emblem, `${c.id}: rol, línea y arte`);
    assert.ok(existsSync(new URL(`../assets/${c.emblem}`, import.meta.url)), `${c.id}: emblema`);
  }
  const spec = tree.specs[1].id;
  const h = makeHarness({ classId: cls, spec, level: 30, build: true });
  const cur = chooserView(h.p);
  assert.deepEqual(cur.filter(c => c.current).map(c => c.id), [spec], `${cls}: la actual marcada`);
  assert.ok(cur.every(c => !c.locked));
  // «Cambiar» abre el selector sobre los árboles (opts.chooser) y el Nv<10 cae en él solo
  assert.equal(talentsView(h.p, { chooser: true }).view, 'choose');
  assert.equal(talentsView(h.p).view, 'trees');
  assert.equal(talentsView(makeHarness({ classId: cls, level: 9 }).p).view, 'choose');
  // kit de la tarjeta: sin `spec` en el catálogo, las habilidades que más mejora su árbol (rotulado «Mejora»)
  const catalog = CLASSES[cls].skills;
  for (const c of cur) {
    const s = tree.specs.find(x => x.id === c.id);
    const touched = new Set(s.nodes.flatMap(nd => [...(nd.touch || []), ...(nd.opts || []).flatMap(o => o.touch || [])]));
    if (catalog.some(sk => sk.spec === c.id)) continue;     // ya con kit propio: lo cubre el bloque de abajo
    assert.equal(c.kitFrom, 'touch', `${c.id}: kit sacado de los nodos`);
    assert.ok(c.kit.length >= 1 && c.kit.length <= 4, `${c.id}: entre 1 y 4 habilidades (${c.kit.length})`);
    for (const k of c.kit) {
      const sk = catalog.find(x => x.id === k.id);
      assert.ok(sk && touched.has(k.id) && sk.cat !== 'basic', `${c.id}: ${k.id} la toca su árbol y no es el básico`);
    }
    assert.deepEqual(c.kit.map(k => k.req), [...c.kit.map(k => k.req)].sort((a, b) => a - b), `${c.id}: por nivel`);
  }
}
// con el campo `spec` en el catálogo (lo trae KA), la tarjeta enseña SUS habilidades sin rótulo
{
  const sk = CLASSES.maga.skills.find(x => x.id === 'meteoro') || CLASSES.maga.skills.find(x => x.cat === 'spender');
  const prev = sk.spec;
  sk.spec = 'crionte';
  try {
    const c = chooserView(makeHarness({ classId: 'maga', level: 30 }).p).find(x => x.id === 'crionte');
    assert.equal(c.kitFrom, 'spec');
    assert.deepEqual(c.kit.map(k => k.id), [sk.id], 'solo la habilidad con spec: crionte');
  } finally { if (prev === undefined) delete sk.spec; else sk.spec = prev; }
  assert.equal(chooserView(makeHarness({ classId: 'maga', level: 30 }).p).find(x => x.id === 'crionte').kitFrom, 'touch');
}
console.log('Selector de especialización: 3 tarjetas por clase con rol, mecánica, pasiva y kit; bloqueo y actual ✓');

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

console.log('\n✅ MECÁNICA EN EL PANEL DE TALENTOS v2 Y MARCAS DE MUNDO (Paso 2 · E3) OK');
