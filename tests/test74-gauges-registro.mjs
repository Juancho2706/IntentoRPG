// ============================================================
// Paso 2d.2 · E0 (W4): núcleo de las barras de mecánica — js/ui-gauges.js + css/gauges*.css
// ============================================================
// docs/paso2d2-hud-pc.md §6.1 y §7.1:
//  · el núcleo se importa HEADLESS (sin document/window en el nivel superior);
//  · registro: defineGaugeView valida la forma (claves, demo con tags, nodes, sounds, world),
//    rechaza repetidos, gaugeViewDefs/gaugeViewErrors; los <CLASE>_GAUGE_VIEWS se registran;
//  · A3: cada renderizador registrado tiene mount/update/demo/explain/nodes, demo con tags
//    idle + building + (full|active) y los ids de nodes existen en TALENT_TREES de su
//    especialización (si una clase exporta alguna vista, deben estar sus 3 mecánicas);
//  · el genérico de reserva funciona para los 9 (modelo + demo válida);
//  · demo pura: fusión hacia delante, ease, t2 → t, seq monótono entre vueltas, por tag;
//  · gaugeDataState / seqEvents;
//  · A8: los @keyframes y las transition de css/gauges*.css solo usan transform y opacity
//    (salvo la transición de stroke-dashoffset de las venas de la Sed).
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// headless de verdad: si el módulo tocara document/window al importarse, esto lanzaría
assert.equal(typeof globalThis.document, 'undefined');
assert.equal(typeof globalThis.window, 'undefined');
const G = await import('../js/ui-gauges.js');
const { GUERRERO_GAUGE_VIEWS } = await import('../js/ui-gauges-guerrero.js');
const { MAGA_GAUGE_VIEWS } = await import('../js/ui-gauges-maga.js');
const { ARQUERA_GAUGE_VIEWS } = await import('../js/ui-gauges-arquera.js');
const { BASE_GAUGE_IDS, gaugeTuning, gaugeDefs } = await import('../js/spec-mechanics.js');
const { TALENT_TREES } = await import('../js/talents.js');
const { makeHarness } = await import('./helpers/power-harness.mjs');

const dir = dirname(fileURLToPath(import.meta.url));
const root = join(dir, '..');

// ---------------------------------------------------------------- API
for (const k of ['defineGaugeView', 'gaugeViewDefs', 'gaugeViewErrors', 'validateGaugeView', 'genericGaugeView', 'gaugeViewFor',
  'createGaugeHud', 'demoFrameAt', 'demoFrameByTag', 'demoLength', 'demoNodes', 'gaugeDataState', 'seqEvents', 'gaugeModel', 'gaugeSpecOf'])
  assert.equal(typeof G[k], 'function', `ui-gauges exporta ${k}()`);
assert.deepEqual(G.gaugeViewErrors(), [], `renderizadores de clase rechazados: ${G.gaugeViewErrors().join(' | ')}`);
for (const [cls, m] of [['guerrero', GUERRERO_GAUGE_VIEWS], ['maga', MAGA_GAUGE_VIEWS], ['arquera', ARQUERA_GAUGE_VIEWS]])
  assert.ok(m && typeof m === 'object' && !Array.isArray(m), `${cls}: <CLASE>_GAUGE_VIEWS es un objeto`);
// la API mínima de ui.js sigue ahí: createGaugeHud(host, { getView }) → { el, update, destroy }
assert.throws(() => G.createGaugeHud(null, {}), /contenedor/);

// especialización de cada mecánica (etiqueta «NOMBRE · ESPECIALIZACIÓN»)
const MECH_SPEC = {};
for (const [cls, tree] of Object.entries(TALENT_TREES)) for (const s of tree.specs) MECH_SPEC[s.mechanic] = { cls, spec: s };
for (const id of BASE_GAUGE_IDS) {
  const sp = G.gaugeSpecOf(id);
  assert.ok(sp && sp.specName === MECH_SPEC[id].spec.name && sp.classId === MECH_SPEC[id].cls, `gaugeSpecOf(${id})`);
}

// ---------------------------------------------------------------- validación del registro
const okDef = () => ({
  mount: () => ({}), update: () => ({ num: '0' }), model: v => ({ v: v.value }), explain: () => ({ text: 'x', cols: [], tip: [] }),
  nodes: { s0: 'la base' }, sounds: { full: 'skill' },
  demo: [{ t: 0, value: 0, state: 'idle', tag: 'idle', nodes: ['s0'] }, { t: 1, value: 1, state: 'building', tag: 'building', fire: 'gain' },
    { t: 2, value: 2, state: 'full', tag: 'full', fire: 'full' }, { t: 3, end: 1 }],
});
assert.deepEqual(G.validateGaugeView('t_ok', okDef()), []);
const bad = (patch, re, msg) => {
  const d = { ...okDef(), ...patch };
  for (const k of Object.keys(patch)) if (patch[k] === undefined) delete d[k];
  const err = G.validateGaugeView('t_mal', d);
  assert.ok(err.some(e => re.test(e)), `${msg}: ${err.join(' | ') || '(sin error)'}`);
};
bad({ mount: undefined }, /falta mount/, 'sin mount');
bad({ update: undefined }, /falta update/, 'sin update');
bad({ explain: undefined }, /falta explain/, 'sin explain');
bad({ nodes: undefined }, /nodes/, 'sin nodes');
bad({ foo: 1 }, /clave desconocida "foo"/, 'clave desconocida');
bad({ sounds: { gain: 'skill' } }, /solo suenan/, 'sonido de un evento no permitido');
bad({ world: { overhead: 3 } }, /world\.overhead/, 'world inválido');
bad({ demo: [{ t: 0, tag: 'idle' }, { t: 1, end: 1 }] }, /tag "building"/, 'demo sin building');
bad({ demo: [{ t: 0, tag: 'idle' }, { t: 1, tag: 'building' }, { t: 2, end: 1 }] }, /"full" o "active"/, 'demo sin full/active');
bad({ demo: [{ t: 0, tag: 'idle' }, { t: 1, tag: 'building' }, { t: 2, tag: 'full' }] }, /end: 1/, 'demo sin fin');
bad({ demo: [{ t: 2, tag: 'idle' }, { t: 1, tag: 'building' }, { t: 3, tag: 'full' }, { t: 4, end: 1 }] }, /creciente/, 'demo desordenada');
bad({ demo: [{ t: 0, tag: 'idle', fire: 'boom' }, { t: 1, tag: 'building' }, { t: 2, tag: 'full' }, { t: 3, end: 1 }] }, /fire "boom"/, 'fire desconocido');
bad({ demo: [{ t: 0, tag: 'idle', zz: 1 }, { t: 1, tag: 'building' }, { t: 2, tag: 'full' }, { t: 3, end: 1 }] }, /clave desconocida "zz"/, 'clave de fotograma');
assert.throws(() => G.defineGaugeView('t_mal', { mount() {} }), /defineGaugeView/);
const reg = G.defineGaugeView('t_ok', okDef());
assert.ok(Object.isFrozen(reg) && G.gaugeViewDefs().t_ok === reg && G.gaugeViewFor('t_ok') === reg, 'registro y lectura');
assert.throws(() => G.defineGaugeView('t_ok', okDef()), /repetido/);
G.gaugeViewDefs().t_hack = 1;
assert.equal(G.gaugeViewDefs().t_hack, undefined, 'gaugeViewDefs devuelve una copia');

// ---------------------------------------------------------------- A3: renderizadores de clase
const T = gaugeTuning();
const VIEWS = G.gaugeViewDefs();
const classOf = { guerrero: ['sed', 'bastion', 'fervor'], maga: ['calor', 'escarcha', 'cargas'], arquera: ['concentracion', 'coto', 'impulso'] };
let registered = 0;
for (const [cls, ids] of Object.entries(classOf)) {
  const exported = Object.keys({ guerrero: GUERRERO_GAUGE_VIEWS, maga: MAGA_GAUGE_VIEWS, arquera: ARQUERA_GAUGE_VIEWS }[cls]);
  if (!exported.length) { console.log(`  · ${cls}: sin renderizadores todavía (E1) → genérico`); continue; }
  for (const id of ids) assert.ok(VIEWS[id], `${cls}: si exporta vistas, deben estar sus 3 mecánicas (falta ${id})`);
  for (const id of exported) assert.ok(ids.includes(id), `${cls}: "${id}" no es una mecánica de su clase`);
  for (const id of ids) {
    const d = VIEWS[id];
    registered++;
    for (const k of ['mount', 'update', 'explain']) assert.equal(typeof d[k], 'function', `${id}.${k}`);
    assert.ok(Array.isArray(d.demo) && d.nodes && typeof d.nodes === 'object', `${id}: demo/nodes`);
    const tags = new Set(d.demo.map(f => f.tag).filter(Boolean));
    assert.ok(tags.has('idle') && tags.has('building') && (tags.has('full') || tags.has('active')), `${id}: tags de la demo (${[...tags]})`);
    const treeIds = new Set(MECH_SPEC[id].spec.nodes.map(n => n.id));
    for (const n of Object.keys(d.nodes)) assert.ok(treeIds.has(n), `${id}: el nodo ${n} existe en el árbol de ${MECH_SPEC[id].spec.name}`);
    for (const n of G.demoNodes(d.demo)) assert.ok(n in d.nodes, `${id}: la demo cita ${n}, que falta en nodes`);
    const E = d.explain(T);
    assert.ok(E && typeof E.text === 'string' && E.text && Array.isArray(E.cols) && E.cols.length === 3 && Array.isArray(E.tip), `${id}: explain(T) → { text, cols[3], tip }`);
    // la vista REAL del arnés pasa por el modelo sin romper
    const h = makeHarness({ classId: cls, spec: MECH_SPEC[id].spec.id, level: 30 });
    if (d.model) assert.ok(d.model(h.gaugeView(), T) && typeof d.model(h.gaugeView(), T) === 'object', `${id}: model(gaugeView real)`);
    for (const tag of ['idle', 'building', 'full', 'active', 'decay']) {
      const fr = G.demoFrameByTag(d.demo, tag, { id, max: gaugeDefs()[id].max });
      assert.ok(fr.view.id === id, `${id}: demoFrameByTag(${tag})`);
    }
  }
}
console.log(`  · A3: ${registered} renderizadores de clase registrados y válidos`);

// ---------------------------------------------------------------- genérico de reserva (los 9)
for (const id of BASE_GAUGE_IDS) {
  const g = G.genericGaugeView(id);
  assert.equal(g.generic, true);
  const { generic, id: _id, ...shape } = g;
  assert.deepEqual(G.validateGaugeView(id, shape), [], `genérico de ${id} válido`);
  if (!VIEWS[id]) assert.equal(G.gaugeViewFor(id), g, `${id} sin vista propia → genérico`);
  const h = makeHarness({ classId: MECH_SPEC[id].cls, spec: MECH_SPEC[id].spec.id, level: 30 });
  const v = h.gaugeView();
  const m = g.model(v);
  assert.ok(m && m.k === 0 && m.segs >= 1 && typeof m.hint === 'string', `genérico: modelo de ${id} vacío`);
  const full = { ...v, value: v.max };
  assert.equal(g.model(full).k, 1, `genérico: ${id} lleno`);
  assert.ok(g.explain(T).text.includes(gaugeDefs()[id].name), 'genérico: explain cita el nombre');
}
assert.equal(G.gaugeModel('cargas', { id: 'cargas', value: 2, max: 4, state: 'building' }).num, '2/4', 'gaugeModel → modelo del registrado o del genérico');

// ---------------------------------------------------------------- demo pura
const F = [
  { t: 0, value: 0, state: 'idle', tag: 'idle', cap: 'vacío', nodes: [] },
  { t: 1, value: 0, state: 'building', ease: 1, x: { cd: 0 }, decayIn: 6, cap: 'llenando', nodes: ['s0'] },
  { t: 3, value: 40, x: { cd: 1 }, decayIn: 4, tag: 'building', fire: 'gain' },
  { t: 4, value: 100, state: 'active', label: 'Ventana', t2: 6, tMax: 6, ease: 1, fire: 'full', ready: ['rayo'], tag: 'active', nodes: ['s4'] },
  { t: 6, t2: 4, x: { moving: 1 } },
  { t: 7, value: 0, state: 'idle', label: '', t2: null, ready: null, fire: 'spent' },
  { t: 8, end: 1 },
];
assert.equal(G.demoLength(F), 8);
assert.deepEqual(G.demoNodes(F), ['s0', 's4']);
let fr = G.demoFrameAt(F, 2, { id: 'cargas', max: 100 });
assert.ok(fr.view.value === 20 && fr.view.x.cd === 0.5 && fr.view.decayIn === 5, `ease interpola value, x numéricos y decayIn (${JSON.stringify(fr.view)})`);
assert.ok(fr.cap === 'llenando' && fr.nodes[0] === 's0' && fr.index === 1, 'cap y nodes de la fase');
fr = G.demoFrameAt(F, 5, { id: 'cargas', max: 100 });
assert.ok(fr.view.state === 'active' && fr.view.label === 'Ventana' && fr.view.t === 5 && fr.view.tMax === 6, `t2 → view.t (con ease: ${fr.view.t})`);
assert.deepEqual(fr.view.ready, ['rayo']);
assert.deepEqual(fr.view.seq, { gain: 1, full: 1, spent: 0, empty: 0 }, 'fire → seq');
fr = G.demoFrameAt(F, 7.5, { id: 'cargas', max: 100 });
assert.ok(!('label' in fr.view) && !('t' in fr.view) && fr.view.ready.length === 0 && fr.view.x.moving === 1, "label '' / t2 null / ready null borran");
const s1 = G.demoFrameAt(F, 7.5).view.seq, s2 = G.demoFrameAt(F, 8 + 7.5).view.seq, s3 = G.demoFrameAt(F, 8 * 5 + 0.1).view.seq;
assert.ok(s2.full === s1.full + 1 && s2.spent === s1.spent + 1 && s3.gain === 5 && s3.full === 5, 'seq MONÓTONO entre vueltas');
assert.equal(G.demoFrameByTag(F, 'active').view.state, 'active');
assert.equal(G.demoFrameByTag(F, 'full').view.state, 'active', 'full → active si no hay full');
assert.equal(G.demoFrameByTag(F, 'decay').tag, 'building', 'decay → building si no hay decay');
assert.equal(G.demoFrameByTag(F, 'idle').view.state, 'idle');

// ---------------------------------------------------------------- estado visual y eventos
assert.equal(G.gaugeDataState(null), 'idle');
assert.equal(G.gaugeDataState({ state: 'building' }), 'building');
assert.equal(G.gaugeDataState({ state: 'building', decaying: true }), 'decay', 'perdiendo → decay');
assert.equal(G.gaugeDataState({ state: 'full', decaying: true }), 'decay');
assert.equal(G.gaugeDataState({ state: 'active', decaying: true }), 'active', 'un estado activo manda');
assert.equal(G.gaugeDataState({ state: 'prey' }), 'prey');
assert.equal(G.gaugeDataState({ state: 'raro' }), 'idle');
const sv = (o) => ({ id: 'sed', seq: { gain: 0, full: 0, spent: 0, empty: 0, ...o } });
assert.deepEqual(G.seqEvents(null, sv({ full: 3 })), [], 'sin vista previa no hay eventos (línea base)');
assert.deepEqual(G.seqEvents(sv({}), sv({ gain: 2, full: 1 })), ['gain', 'full']);
assert.deepEqual(G.seqEvents(sv({ spent: 1 }), sv({ spent: 1, empty: 1 })), ['empty']);
assert.deepEqual(G.seqEvents(sv({}), { ...sv({ full: 1 }), id: 'calor' }), [], 'cambio de mecánica: sin eventos');
// con la vista REAL: un umbral real produce 'full' por diferencia
{
  const h = makeHarness({ classId: 'guerrero', spec: 'berserker', level: 30 });
  const a = h.gaugeView();
  h.gauge('sed', 100);
  assert.deepEqual(G.seqEvents(a, h.gaugeView()), ['gain', 'full']);
}

// ---------------------------------------------------------------- A8: CSS solo transform/opacity
const cssDir = join(root, 'css');
const files = readdirSync(cssDir).filter(f => /^gauges.*\.css$/.test(f));
assert.ok(files.includes('gauges.css'), 'css/gauges.css existe');
const ALLOWED = new Set(['transform', 'opacity']);
for (const f of files) {
  const css = readFileSync(join(cssDir, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  // @keyframes: cada propiedad de cada bloque
  const kfRe = /@keyframes\s+([\w-]+)\s*\{/g;
  let m;
  while ((m = kfRe.exec(css))) {
    let depth = 1, i = kfRe.lastIndex;
    while (depth && i < css.length) { if (css[i] === '{') depth++; else if (css[i] === '}') depth--; i++; }
    const body = css.slice(kfRe.lastIndex, i - 1);
    for (const [, prop] of body.matchAll(/([a-z-]+)\s*:/g)) assert.ok(ALLOWED.has(prop), `A8 ${f}: @keyframes ${m[1]} anima "${prop}" (solo transform/opacity)`);
  }
  // transition / transition-property
  for (const [, val] of css.matchAll(/transition(?:-property)?\s*:\s*([^;}]+)/g)) {
    if (/^\s*none\b/.test(val)) continue;
    for (const part of val.split(',')) {
      const prop = part.trim().split(/\s+/)[0];
      const ok = ALLOWED.has(prop) || (prop === 'stroke-dashoffset' && f === 'gauges-guerrero.css');
      assert.ok(ok, `A8 ${f}: transition de "${prop}" (solo transform/opacity; stroke-dashoffset solo en las venas de la Sed)`);
    }
  }
  assert.ok(!/backdrop-filter/.test(css), `R4 ${f}: sin backdrop-filter`);
}
console.log(`  · A8: ${files.join(', ')} solo animan transform/opacity`);

// el núcleo no toca el DOM en el nivel superior (búsqueda textual de respaldo)
const src = readFileSync(join(root, 'js', 'ui-gauges.js'), 'utf8');
const top = src.replace(/export function createGaugeHud[\s\S]*$/, '');
assert.ok(!/\bdocument\./.test(top) && !/\bwindow\./.test(top), 'ui-gauges.js: sin document/window fuera de createGaugeHud');

console.log('✅ Núcleo de barras de mecánica (2d.2 E0): registro, A3, genérico, demo, estados, A8 y headless OK');
