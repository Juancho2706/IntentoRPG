// ============================================================
// Paso 2d.2 · E1 (W7): barras de mecánica de la Arquera — js/ui-gauges-arquera.js
// ============================================================
// docs/paso2d2-hud-pc.md §3.7–§3.9, §4 y §7.1:
//  · registro: validateGaugeView = [] para concentracion, coto e impulso (y registrados en el núcleo);
//  · A3: demo con tags idle/building/(full|active)/decay, ids de nodes en TALENT_TREES de su
//    especialización y demo.nodes ⊂ nodes; la demo respeta gaugeTuning() (máximos y tiempos);
//  · A4: explain(gaugeTuning()) cita los números de T (formato español) y no tiene <br>/HTML ajeno;
//  · model() con vistas REALES del arnés (makeHarness) en cada estado;
//  · world.ground (marca de suelo bajo la Presa) puro;
//  · A8: css/gauges-arquera.css solo anima transform/opacity y todo selector empieza por .gz-<id>;
//  · headless: el módulo no toca document/window al importarse.
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

assert.equal(typeof globalThis.document, 'undefined');
const A = await import('../js/ui-gauges-arquera.js');
const G = await import('../js/ui-gauges.js');
const { gaugeTuning, gaugeDefs, setGauge, spendGauge } = await import('../js/spec-mechanics.js');
const { TALENT_TREES } = await import('../js/talents.js');
const { makeHarness } = await import('./helpers/power-harness.mjs');

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const T = gaugeTuning();
const V = A.ARQUERA_GAUGE_VIEWS;
const IDS = ['concentracion', 'coto', 'impulso'];
const SPEC = { concentracion: 'francotiradora', coto: 'montaraz', impulso: 'tiradora' };
const es = n => String(Math.round(n * 100) / 100).replace('.', ',');

// ---------------------------------------------------------------- registro
assert.deepEqual(Object.keys(V).sort(), [...IDS].sort(), 'ARQUERA_GAUGE_VIEWS = las 3 mecánicas de la Arquera');
assert.deepEqual(G.gaugeViewErrors(), [], `núcleo sin rechazos: ${G.gaugeViewErrors().join(' | ')}`);
for (const id of IDS) {
  assert.deepEqual(G.validateGaugeView(id, V[id]), [], `${id}: validateGaugeView`);
  assert.ok(!G.gaugeViewFor(id).generic, `${id}: registrado con renderizador propio`);
  assert.ok(typeof V[id].model === 'function', `${id}: model()`);
}

// ---------------------------------------------------------------- A3: demo y nodos
const arq = TALENT_TREES.arquera;
for (const id of IDS) {
  const d = V[id];
  const spec = arq.specs.find(s => s.id === SPEC[id]);
  assert.equal(spec.mechanic, id, `${id}: es la mecánica de ${spec.name}`);
  const treeIds = new Set(spec.nodes.map(n => n.id));
  for (const n of Object.keys(d.nodes)) assert.ok(treeIds.has(n), `${id}: nodo ${n} existe en ${spec.name}`);
  assert.ok(Object.keys(d.nodes).length >= 4, `${id}: al menos 4 nodos que la potencian`);
  for (const n of G.demoNodes(d.demo)) assert.ok(n in d.nodes, `${id}: la demo cita ${n}, que falta en nodes`);
  const tags = new Set(d.demo.map(f => f.tag).filter(Boolean));
  for (const t of ['idle', 'building', 'decay']) assert.ok(tags.has(t), `${id}: demo con tag ${t}`);
  assert.ok(tags.has('full') || tags.has('active'), `${id}: demo con full o active`);
  const len = G.demoLength(d.demo);
  assert.ok(len >= 10 && len <= 13.5, `${id}: la demo dura 10–13 s (${len})`);
  for (const f of d.demo) if (!f.end) assert.ok(typeof f.cap === 'string' || f.cap === undefined, `${id}: cap de texto`);
  // muestreo a 10 Hz: la vista sintética respeta los máximos de T y el modelo no rompe
  const base = { id, max: typeof gaugeDefs()[id].max === 'number' ? gaugeDefs()[id].max : 100 };
  for (let t = 0; t < len; t += 0.1) {
    const v = G.demoFrameAt(d.demo, t, base).view;
    assert.ok(v.value >= 0 && v.value <= v.max, `${id}: demo t=${t.toFixed(1)} valor ${v.value} ≤ máx ${v.max}`);
    if (v.t != null) assert.ok(v.tMax > 0 && v.t <= v.tMax + 1e-9, `${id}: demo t=${t.toFixed(1)} anillo ${v.t}/${v.tMax}`);
    const m = d.model(v, T);
    assert.ok(m && typeof m.num === 'string', `${id}: model en la demo t=${t.toFixed(1)}`);
  }
  for (const tag of ['idle', 'building', 'full', 'active', 'decay']) assert.equal(G.demoFrameByTag(d.demo, tag, base).view.id, id);
}
// máximos y tiempos de T en la demo
{
  const c = G.demoFrameByTag(V.concentracion.demo, 'full', { id: 'concentracion', max: 100 }).view;
  assert.ok(c.value === T.concentracion.max && c.state === 'full' && c.ready.includes('a_t_apuntado'), 'Concentración: demo full = máx. y Disparo Apuntado listo');
  const ca = G.demoFrameByTag(V.concentracion.demo, 'active', { id: 'concentracion', max: 100 }).view;
  assert.ok(ca.state === 'active' && ca.tMax === T.concentracion.vision.t && ca.label === 'Visión Certera', 'Concentración: demo Visión Certera 12 s');
  const cd = G.demoFrameByTag(V.concentracion.demo, 'decay', { id: 'concentracion', max: 100 }).view;
  assert.ok(cd.decaying && cd.x.moving && G.gaugeDataState(cd) === 'decay', 'Concentración: demo decay = moviéndote');
  // ritmo de la demo: +20/s quieta, −25/s moviéndote
  const D = V.concentracion.demo, at = t => G.demoFrameAt(D, t, { id: 'concentracion', max: 100 }).view.value;
  assert.ok(Math.abs((at(2.5) - at(1.5)) - T.concentracion.gainPerSec) < 1e-6, 'demo: gana +20/s');
  const fDec = D.find(f => f.tag === 'decay');
  assert.ok(Math.abs((at(fDec.t + 0.2) - at(fDec.t + 1.2)) - T.concentracion.losePerSec) < 1e-6, 'demo: pierde −25/s');
  const k = G.demoFrameByTag(V.coto.demo, 'active', { id: 'coto', max: 3 }).view;
  assert.ok(k.state === 'prey' && k.tMax === T.coto.preyT && k.x.preyName, 'Coto: demo de Presa 15 s con nombre');
  const kf = G.demoFrameByTag(V.coto.demo, 'full', { id: 'coto', max: 3 }).view;
  assert.ok(kf.value === T.coto.maxArmed && kf.max === T.coto.maxArmed, 'Coto: demo full = 3 armadas');
  const kd = G.demoFrameByTag(V.coto.demo, 'decay', { id: 'coto', max: 3 }).view;
  assert.ok(V.coto.model(kd, T).expiring, 'Coto: demo decay = la Presa caduca');
  const i = G.demoFrameByTag(V.impulso.demo, 'active', { id: 'impulso', max: 100 }).view;
  assert.ok(i.state === 'active' && i.tMax === T.impulso.galeT && i.value === T.impulso.max && i.ready.includes('flecha_multiple'), 'Impulso: demo Vendaval 6 s');
  const idc = G.demoFrameByTag(V.impulso.demo, 'decay', { id: 'impulso', max: 100 }).view;
  assert.ok(V.impulso.model(idc, T).still && !V.impulso.model(idc, T).spinning, 'Impulso: demo decay = quieta, rosa detenida');
}

// ---------------------------------------------------------------- A4: explain cita T
const NUM_RE = /\d/;
for (const id of IDS) {
  const E = V[id].explain(T);
  assert.ok(E.text && E.cols.length === 3 && E.tip.length >= 2 && E.tip.length <= 3, `${id}: explain { text, cols[3], tip[2–3] }`);
  assert.ok(['Generar'].includes(E.cols[0][0]) && E.cols[1][0] === 'Descargar' && ['Pérdida', 'Ventana'].includes(E.cols[2][0]), `${id}: columnas Generar/Descargar/Pérdida|Ventana`);
  const all = [E.text, ...E.cols.flat(), ...E.tip].join(' ');
  assert.ok(!/<(?!\/?b>)/.test(E.text), `${id}: text solo con <b>`);
  assert.ok(!/\d\.\d/.test(all), `${id}: números en formato español (sin punto decimal)`);
  assert.ok(NUM_RE.test(all), `${id}: explain cita números`);
}
{
  const C = T.concentracion, E = V.concentracion.explain(T), all = JSON.stringify(E);
  for (const s of [`+${C.gainPerSec}/s`, `−${C.losePerSec}/s`, `+${es(C.critPerPoint)} %`, `+${es(C.critPerPoint * C.max)} %`, `gasta ${C.alientoSpend}`, `${C.vision.t} s`])
    assert.ok(all.includes(s), `A4 Concentración cita «${s}»`);
}
{
  const C = T.coto, all = JSON.stringify(V.coto.explain(T));
  for (const s of [`máx. ${C.maxArmed}`, `${C.maxArmed + C.maxArmedExtra} con Coto Cerrado`, `${C.preyT} s`, `${C.trap.cd} s por carga`, `${C.trap.root} s`])
    assert.ok(all.includes(s), `A4 Coto cita «${s}»`);
}
{
  const I = T.impulso, all = JSON.stringify(V.impulso.explain(T));
  for (const s of [`suma ${I.perShot}`, `A ${I.max}`, `${I.galeT} s`, `+${I.galeAspd} %`, `+${I.andanada}`, `+${es(I.galechain.perKill)} s`, `+${I.galechain.max} s`])
    assert.ok(all.includes(s), `A4 Impulso cita «${s}»`);
}
// con otro T (tuning distinto) el texto cambia: no hay números escritos a mano
{
  const T2 = JSON.parse(JSON.stringify(T));
  T2.concentracion.gainPerSec = 37; T2.coto.preyT = 23; T2.impulso.galeT = 9;
  assert.ok(JSON.stringify(V.concentracion.explain(T2)).includes('+37/s'), 'explain usa T (Concentración)');
  assert.ok(JSON.stringify(V.coto.explain(T2)).includes('23 s'), 'explain usa T (Coto)');
  assert.ok(JSON.stringify(V.impulso.explain(T2)).includes('Vendaval 9 s'), 'explain usa T (Impulso)');
}
// sonidos: tonos existentes de sfx.js, solo full/spent
const sfxSrc = readFileSync(join(root, 'js', 'sfx.js'), 'utf8');
for (const id of IDS) for (const [ev, tone] of Object.entries(V[id].sounds || {})) {
  assert.ok(['full', 'spent'].includes(ev), `${id}: sonido de ${ev}`);
  assert.ok(new RegExp(`\\b${tone}\\s*:`).test(sfxSrc), `${id}: el tono ${tone} existe en sfx.js`);
}

// ---------------------------------------------------------------- model() con vistas REALES
// Concentración
{
  const h = makeHarness({ classId: 'arquera', spec: 'francotiradora', level: 40 });
  const p = h.p;
  let m = V.concentracion.model(h.gaugeView(), T);
  assert.ok(m.k === 0 && m.offset === 9 && !m.locked && !m.moving && m.num === '0', `Concentración idle: retícula abierta (${JSON.stringify(m)})`);
  h.tick(1);
  let v = h.gaugeView();
  m = V.concentracion.model(v, T);
  assert.ok(v.state === 'building' && m.k > 0 && m.offset < 9 && m.offset > 0 && /Quieta/.test(m.hint), 'Concentración building: esquineras cerrándose');
  assert.equal(m.crit, `+${(v.value * T.concentracion.critPerPoint).toFixed(1).replace('.', ',')} % crít`, 'Concentración: texto de crítico');
  h.gauge('concentracion', 100);
  m = V.concentracion.model(h.gaugeView(), T);
  assert.ok(m.locked && m.offset === 0 && m.eye && m.sub === 'Tiro Fijado' && m.critPct === 15, 'Concentración full: punto rojo (Tiro Fijado)');
  assert.equal(m.aimedReady, false);
  h.addPowers('f_aliento_cazador');
  assert.ok(V.concentracion.model(h.gaugeView(), T).aimedReady, 'Concentración: Aliento del Cazador → Disparo Apuntado al instante');
  p.moving = true;
  v = h.gaugeView();
  m = V.concentracion.model(v, T);
  assert.ok(G.gaugeDataState(v) === 'decay' && m.moving && m.losing && m.sub === 'Se pierde al moverte' && /−25\/s/.test(m.hint), 'Concentración decay: MOVIÉNDOTE −25/s');
  p.addBuff('a_t_vision', { 'gaugeLoss:concentracion': -100 }, T.concentracion.vision.t, { name: 'Visión Certera' });
  v = h.gaugeView();
  m = V.concentracion.model(v, T);
  assert.ok(v.state === 'active' && m.active && !m.moving && !m.losing && m.eye && m.sub === undefined, 'Concentración active: Visión Certera, sin temblor');
}
// Coto de Caza
{
  const h = makeHarness({ classId: 'arquera', spec: 'montaraz', level: 40 });
  const p = h.p;
  let m = V.coto.model(h.gaugeView(), T);
  assert.ok(m.n === 0 && m.max === 3 && m.slots.filter(s => s.show).length === 3 && m.slots[0].st === 'ready' && !m.prey && m.name === 'sin Presa', `Coto idle: huellas vacías (${JSON.stringify(m.slots)})`);
  assert.equal(m.num, '0/3');
  const spawn = (x) => h.g.spawnField('trampa', { pos: { x, z: 0 }, radius: 1.5, dur: 20, owner: p, data: { dmg: 1 } });
  spawn(3); h.tick(0.1);
  p.powerState.a_t_cepo = { charges: 0, max: 1, nextAt: p.simT + 6 };
  p.cdMax = { ...(p.cdMax || {}), a_t_cepo: 8 };
  m = V.coto.model(h.gaugeView(), T);
  assert.ok(m.n === 1 && m.slots[0].st === 'armed' && m.slots[1].st === 'cd' && Math.abs(m.slots[1].f - 0.25) < 0.02 && m.slots[2].st === 'empty', `Coto building: 1 armada + barrido de recarga (${JSON.stringify(m.slots)})`);
  spawn(5); spawn(7); h.tick(0.1);
  m = V.coto.model(h.gaugeView(), T);
  assert.ok(m.full && m.slots.slice(0, 3).every(s => s.st === 'armed') && m.sub === 'Coto completo' && m.num === '3/3', 'Coto full: todas armadas');
  const el = h.enemy({ hp: 1000, rank: 'elite', pos: [0, 0, 4] });
  el.def = { ...el.def, name: 'Bestia Alfa' };
  h.hit(el, {});
  el.hp = 600;
  let v = h.gaugeView();
  m = V.coto.model(v, T);
  assert.ok(v.state === 'prey' && m.prey && m.name === 'Bestia Alfa' && m.hp === 0.6 && /Presa · Bestia Alfa · 15,0 s/.test(m.sub) && !m.expiring, `Coto prey: medallón con nombre, vida y 15 s (${m.sub})`);
  el.rootT = 2;
  assert.ok(V.coto.model(h.gaugeView(), T).trapped, 'Coto: ATRAPADA');
  // world.ground: marca de suelo bajo la Presa (y nada bajo otros)
  const gr = V.coto.world.ground(el, p);
  assert.ok(gr && gr.asset === 'gz_coto_marca_suelo' && gr.blend === 'additive' && gr.tMax === T.coto.preyT && gr.trapped && !gr.expiring && gr.radius > 0, `world.ground de la Presa (${JSON.stringify(gr)})`);
  const other = h.enemy({ hp: 500, pos: [0, 0, 6] });
  assert.equal(V.coto.world.ground(other, p), null, 'world.ground: null si no es la Presa');
  assert.equal(V.coto.world.ground(null, p), null);
  h.tick(13);
  v = h.gaugeView();
  m = V.coto.model(v, T);
  if (v.state === 'prey') assert.ok(m.expiring && V.coto.world.ground(el, p).expiring, 'Coto: la Presa caduca (< 3 s)');
  h.tick(3);
  assert.equal(V.coto.world.ground(el, p), null, 'world.ground: la Presa caducó');
  // Coto Cerrado: 4.ª ranura
  m = V.coto.model({ ...h.gaugeView(), max: T.coto.maxArmed + T.coto.maxArmedExtra }, T);
  assert.ok(m.slots.filter(s => s.show).length === 4 && m.num.endsWith('/4'), 'Coto Cerrado: aparece la 4.ª ranura');
}
// Impulso
{
  const h = makeHarness({ classId: 'arquera', spec: 'tiradora', level: 40 });
  const p = h.p;
  const e = h.enemy({ hp: 1e6 });
  let m = V.impulso.model(h.gaugeView(), T);
  assert.ok(m.still && !m.spinning && m.lit === 0 && m.feathers.every(f => f === 'off') && m.sub === 'Muévete y dispara', 'Impulso idle: rosa quieta, ¡MUÉVETE!');
  p.moving = true;
  h.hit(e, { tags: ['proj'], skill: 'a_disparo' });
  m = V.impulso.model(h.gaugeView(), T);
  assert.ok(m.spinning && !m.still && m.speed === 1 && m.feathers[0] === 'half', 'Impulso building: gira lento, media pluma');
  setGauge(p, 'impulso', 50);
  m = V.impulso.model(h.gaugeView(), T);
  assert.ok(m.speed === 2 && m.lit === 2 && m.feathers[2] === 'half' && m.line1 === '2 de 5 plumas', `Impulso 50: 2 plumas y media, giro medio (${JSON.stringify(m.feathers)})`);
  setGauge(p, 'impulso', 80);
  assert.equal(V.impulso.model(h.gaugeView(), T).speed, 3, 'Impulso ≥ 67: giro rápido');
  p.moving = false;
  m = V.impulso.model(h.gaugeView(), T);
  assert.ok(m.still && !m.spinning && m.sub === 'Quieta: no ganas', 'Impulso quieta: la rosa se detiene');
  h.gauge('impulso', 100);
  const v = h.gaugeView();
  m = V.impulso.model(v, T);
  assert.ok(v.state === 'active' && m.active && m.speed === 4 && m.spinning && !m.still && m.feathers.every(f => f === 'on'), 'Impulso Vendaval: giro muy rápido y plumas blancas');
  assert.ok(m.line1.includes(`+${T.impulso.galeAspd} %`) && m.line2.includes('Flecha Múltiple'), 'Impulso Vendaval: texto');
  spendGauge(p, 'impulso', 0);
}

// ---------------------------------------------------------------- A8 y prefijos de la CSS
const cssPath = join(root, 'css', 'gauges-arquera.css');
assert.ok(existsSync(cssPath), 'css/gauges-arquera.css existe');
const css = readFileSync(cssPath, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const kfRe = /@keyframes\s+([\w-]+)\s*\{/g;
let km;
while ((km = kfRe.exec(css))) {
  assert.ok(/^gz-(concentracion|coto|impulso)-/.test(km[1]), `keyframes con prefijo gz-<id>-: ${km[1]}`);
  let depth = 1, i = kfRe.lastIndex;
  while (depth && i < css.length) { if (css[i] === '{') depth++; else if (css[i] === '}') depth--; i++; }
  for (const [, prop] of css.slice(kfRe.lastIndex, i - 1).matchAll(/([a-z-]+)\s*:/g)) assert.ok(['transform', 'opacity'].includes(prop), `A8: @keyframes ${km[1]} anima ${prop}`);
}
for (const [, val] of css.matchAll(/transition(?:-property)?\s*:\s*([^;}]+)/g))
  for (const part of val.split(',')) assert.ok(['transform', 'opacity', 'none'].includes(part.trim().split(/\s+/)[0]), `A8: transition de ${part.trim()}`);
// todo selector de regla empieza por .gz-<id> (sin tocar selectores ajenos)
const noKf = css.replace(/@keyframes[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '');
for (const [, sel] of noKf.matchAll(/([^{}]+)\{[^{}]*\}/g)) {
  for (const s of sel.split(',').map(x => x.trim()).filter(Boolean))
    assert.ok(/^\.gz-(concentracion|coto|impulso)\b/.test(s), `selector con prefijo .gz-<id>: «${s}»`);
}
assert.ok(!/backdrop-filter/.test(css), 'sin backdrop-filter');

// assets de la clase (piel)
for (const a of ['gz_conc_anillo', 'gz_conc_esquinera', 'gz_conc_fijado', 'gz_coto_cepo', 'gz_coto_cepo_vacio', 'gz_coto_presa',
  'gz_coto_marca_suelo', 'gz_impulso_rosa', 'gz_impulso_pluma', 'gz_impulso_vendaval'])
  assert.ok(existsSync(join(root, 'assets', 'gauges', `${a}.webp`)), `asset ${a}.webp`);

// headless (textual): sin document/window en el módulo
const src = readFileSync(join(root, 'js', 'ui-gauges-arquera.js'), 'utf8');
assert.ok(!/\bdocument\./.test(src) && !/\bwindow\./.test(src), 'ui-gauges-arquera.js: sin document/window');

console.log('✅ Barras de mecánica de la Arquera (2d.2 E1): registro, A3, A4, model() por estado, world.ground y A8 OK');

// ============================================================
// gaugeView v2 de la Arquera (docs/paso2d2-hud-pc.md §3.10). Movido de test75 en el Paso 2 (E1.5):
// usa ids de nodo y habilidades de la clase, así que su dueño es KT de la clase (E2).
// (bloque propio: sus nombres tapan los de arriba sin chocar)
// ============================================================
{
  const { makeHarness } = await import('./helpers/power-harness.mjs');
  const { gaugeTuning, gaugeSeq, gainGauge, spendGauge, pickGaugeEnemy } = await import('../js/spec-mechanics.js');
  const { TALENT_TREES } = await import('../js/talents.js');
  const { POWER_HOOKS, powerState } = await import('../js/powers.js');
  const approx = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;
  const mk = (classId, spec, level = 30, extra = {}) => makeHarness({ classId, spec, level, ...extra });
  const T = gaugeTuning();
  // seq: contadores MONÓTONOS por indicador, no se rebobinan con resetGauges
  function seqDelta(h, id, fn) {
    const a = { ...gaugeSeq(h.p, id) };
    fn();
    const b = h.gaugeView().seq;
    return { gain: b.gain - a.gain, full: b.full - a.full, spent: b.spent - a.spent, empty: b.empty - a.empty };
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
  assert.ok(has(nodeText('arquera', 'francotiradora', 's4'), `${T.concentracion.alientoSpend} de Concentración`), 'Aliento del Cazador');
  assert.ok(has(nodeText('arquera', 'francotiradora', 's9'), `${T.concentracion.vision.t} s`), 'Visión Certera');
  assert.ok(has(nodeText('arquera', 'montaraz', 's14'), `hasta ${T.coto.maxArmed + T.coto.maxArmedExtra}`), 'Coto Cerrado');
  assert.ok(has(nodeText('arquera', 'tiradora', 's4'), `${T.impulso.andanada} de Impulso`), 'Andanada Impulsiva');
  assert.ok(has(nodeText('arquera', 'tiradora', 's14'), `${T.impulso.galechain.perKill} s`, `+${T.impulso.galechain.max} s`), 'Vendaval Perpetuo');
  console.log('✅ gaugeView v2 de la Arquera (movido de test75): x, seq y gaugeTuning contra el texto de los nodos OK');
}
