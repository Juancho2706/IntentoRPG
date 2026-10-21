// ============================================================
// Paso 2d.2 · E1 (W6): barras de mecánica de la Maga — js/ui-gauges-maga.js + css/gauges-maga.css
// Paso 2 (E2 · KT-maga): nodos 2g (s*, i*, a*), textos y números de gaugeTuning() (js/mech-maga.js)
// ============================================================
// docs/paso2d2-hud-pc.md §3.4 Calor, §3.5 Escarcha, §3.6 Cargas, §4 demo y §7.1:
//  · registro: validateGaugeView = [] para las 3 y quedan registradas (no el genérico);
//  · A3: tags de la demo, ids de nodes en TALENT_TREES de su especialización, demo ⊂ nodes;
//  · A4: explain(gaugeTuning()) cita los números de T (Cargas: «35 %» y «6 s»…);
//  · A8: css/gauges-maga.css solo anima transform/opacity y todo selector es .gz-<id>;
//  · model() con vistas REALES del arnés en cada estado (idle, building, decay, full, active);
//  · world.overhead (Escarcha): solo élites, jefes y el enemigo bajo el cursor; puro;
//  · la demo respeta gaugeTuning() (máximos y tiempos) y nivel superior headless.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

assert.equal(typeof globalThis.document, 'undefined');
const M = await import('../js/ui-gauges-maga.js');
const G = await import('../js/ui-gauges.js');
const { gaugeTuning, gaugeDefs } = await import('../js/spec-mechanics.js');
const { TALENT_TREES } = await import('../js/talents.js');
const { makeHarness } = await import('./helpers/power-harness.mjs');

const T = gaugeTuning();
const V = M.MAGA_GAUGE_VIEWS;
const IDS = ['calor', 'escarcha', 'cargas'];
const SPEC = { calor: 'piromante', escarcha: 'crionte', cargas: 'arcanista' };
const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// ---------------------------------------------------------------- registro y A3
assert.deepEqual(Object.keys(V).sort(), [...IDS].sort(), 'MAGA_GAUGE_VIEWS = { calor, escarcha, cargas }');
assert.deepEqual(G.gaugeViewErrors(), [], 'sin renderizadores rechazados');
for (const id of IDS) {
  const d = V[id];
  assert.deepEqual(G.validateGaugeView(id, d), [], `${id}: validateGaugeView`);
  assert.ok(!G.gaugeViewFor(id).generic && G.gaugeViewFor(id).mount === d.mount, `${id}: registrado (no el genérico)`);
  const tags = new Set(d.demo.map(f => f.tag).filter(Boolean));
  for (const t of ['idle', 'building']) assert.ok(tags.has(t), `${id}: demo con tag ${t}`);
  assert.ok(tags.has('full') || tags.has('active'), `${id}: demo con full o active`);
  const spec = TALENT_TREES.maga.specs.find(s => s.id === SPEC[id]);
  assert.equal(spec.mechanic, id, `${id}: es la mecánica de ${SPEC[id]}`);
  const treeIds = new Set(spec.nodes.map(n => n.id));
  assert.ok(Object.keys(d.nodes).length >= 3, `${id}: al menos 3 nodos que la potencian`);
  for (const n of Object.keys(d.nodes)) assert.ok(treeIds.has(n), `${id}: el nodo ${n} existe en ${spec.name}`);
  for (const n of G.demoNodes(d.demo)) assert.ok(n in d.nodes, `${id}: la demo cita ${n}, que falta en nodes`);
  // la demo respeta gaugeTuning(): duración 10–13,5 s, valores dentro del máximo
  const len = G.demoLength(d.demo);
  assert.ok(len >= 10 && len <= 13.5, `${id}: demo de ${len} s`);
  const max = gaugeDefs()[id].max;
  for (let t = 0; t < len; t += 0.1) {
    const fr = G.demoFrameAt(d.demo, t, { id, max });
    assert.ok(fr.view.value >= 0 && fr.view.value <= max, `${id}: demo t=${t.toFixed(1)} valor ${fr.view.value} ≤ ${max}`);
    assert.ok(d.model(fr.view, T), `${id}: model(demo t=${t.toFixed(1)})`);
  }
  // sonidos permitidos (§3.0) y nombres de tonos de sfx.js
  for (const [k, s] of Object.entries(d.sounds)) assert.ok(['full', 'spent'].includes(k) && ['fire', 'ice', 'bolt', 'chain', 'skill'].includes(s), `${id}: sonido ${k}=${s}`);
}
assert.equal(V.calor.sounds.full, 'fire');
assert.equal(V.escarcha.sounds.full, 'ice');
assert.equal(V.cargas.sounds.spent, 'bolt');
assert.equal(typeof V.escarcha.world?.overhead, 'function', 'Escarcha: world.overhead');

// ---------------------------------------------------------------- A4: explain cita gaugeTuning()
const es = n => String(n).replace('.', ',');
const plain = E => [E.text, ...E.cols.flat(), ...E.tip].join(' ');
{
  const E = V.calor.explain(T), s = plain(E);
  assert.equal(E.cols.length, 3);
  assert.deepEqual(E.cols.map(c => c[0]), ['Generar', 'Descargar', 'Pérdida']);
  assert.ok(E.tip.length >= 2 && E.tip.length <= 3);
  for (const frag of [`${T.calor.perFireHit} de Calor`, `−${es(T.calor.decayRate)}/s`, `${es(T.calor.decayAfter)} s`, `+${T.calor.llamarada}`, `A ${T.calor.max}`,
    `+${T.calor.chispas}`, `+${T.calor.voraz} por enemigo`, `${es(T.calor.combustion.base + T.calor.combustion.perRank)} s`, 'Ignición Total', 'Bola de Fuego', 'Meteoro', 'crítico'])
    assert.ok(s.includes(frag), `Calor: explain cita «${frag}»`);
}
{
  const E = V.escarcha.explain(T), s = plain(E);
  assert.equal(E.cols.length, 3);
  for (const frag of [`${es(T.escarcha.freezeT)} s`, `${es(T.escarcha.numbT)} s`, `A ${T.escarcha.max} capas`, `+${T.escarcha.nova}`, `${T.escarcha.bossStagger} de aturdimiento`,
    `cada ${es(T.escarcha.decayEvery)} s`, `${T.escarcha.numbMovePct} %`, `${T.escarcha.numbAspdPct} %`, 'Congelado', 'Aterido', 'cursor', 'Prisión de Hielo'])
    assert.ok(s.includes(frag), `Escarcha: explain cita «${frag}»`);
}
{
  const E = V.cargas.explain(T), s = plain(E);
  assert.equal(E.cols.length, 3);
  assert.ok(s.includes('35 %') && s.includes('6 s'), 'A4: el texto de Cargas contiene «35 %» y «6 s»');
  for (const frag of [`${T.cargas.dmgPerCharge} %`, `${T.cargas.manaPerCharge} de maná`, `máx. ${T.cargas.max}`, `${es(T.cargas.loseAfter)} s`, `cada ${es(T.cargas.sealEvery)} s`,
    `${T.cargas.resonanceCrit} %`, `+${T.cargas.dmgPerCharge * T.cargas.max} %`, 'Resonancia', 'Rayo', 'Desgarro', 'Sello'])
    assert.ok(s.includes(frag), `Cargas: explain cita «${frag}»`);
}
// ningún número a mano: con otra T el texto cambia
{
  const T2 = JSON.parse(JSON.stringify(T));
  T2.cargas.dmgPerCharge = 41; T2.cargas.loseAfter = 7.5; T2.calor.perFireHit = 9; T2.escarcha.freezeT = 2.25;
  assert.ok(plain(V.cargas.explain(T2)).includes('41 %') && plain(V.cargas.explain(T2)).includes('7,5 s'), 'Cargas: los números salen de T');
  assert.ok(plain(V.calor.explain(T2)).includes('9 de Calor'), 'Calor: los números salen de T');
  assert.ok(plain(V.escarcha.explain(T2)).includes('2,25 s'), 'Escarcha: los números salen de T (formato español)');
}

// ---------------------------------------------------------------- A8 sobre css/gauges-maga.css
{
  const css = readFileSync(join(root, 'css', 'gauges-maga.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const kfRe = /@keyframes\s+([\w-]+)\s*\{/g;
  let m, kfs = 0;
  while ((m = kfRe.exec(css))) {
    kfs++;
    assert.ok(/^gz-(calor|escarcha|cargas)-/.test(m[1]), `A8: @keyframes ${m[1]} con prefijo gz-<id>-`);
    let depth = 1, i = kfRe.lastIndex;
    while (depth && i < css.length) { if (css[i] === '{') depth++; else if (css[i] === '}') depth--; i++; }
    for (const [, prop] of css.slice(kfRe.lastIndex, i - 1).matchAll(/([a-z-]+)\s*:/g))
      assert.ok(['transform', 'opacity'].includes(prop), `A8: @keyframes ${m[1]} anima "${prop}"`);
  }
  assert.ok(kfs >= 5, 'hay bucles y eventos animados');
  for (const [, val] of css.matchAll(/transition(?:-property)?\s*:\s*([^;}]+)/g))
    for (const part of val.split(',')) assert.ok(['transform', 'opacity'].includes(part.trim().split(/\s+/)[0]), `A8: transition de "${part.trim()}"`);
  assert.ok(!/backdrop-filter/.test(css), 'R4: sin backdrop-filter');
  // todo selector empieza por .gz-<id> de la maga (no toca selectores ajenos)
  const rules = css.replace(/@keyframes[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '');
  for (const [, sel] of rules.matchAll(/([^{}]+)\{[^{}]*\}/g))
    for (const s of sel.split(',')) assert.ok(/^\s*\.gz-(calor|escarcha|cargas)\b/.test(s), `selector ajeno: «${s.trim()}»`);
  // los assets de la piel existen
  for (const a of ['gz_calor_brasero', 'gz_calor_llama', 'gz_calor_llama_blanca', 'gz_calor_ignicion', 'gz_escarcha_cristal', 'gz_escarcha_engaste',
    'gz_escarcha_congelado', 'gz_escarcha_aterido', 'gz_cargas_anillo', 'gz_cargas_runa', 'gz_cargas_nucleo'])
    assert.ok(readFileSync(join(root, 'assets', 'gauges', `${a}.webp`)).length > 1000, `asset ${a}.webp`);
  const js = readFileSync(join(root, 'js', 'ui-gauges-maga.js'), 'utf8');
  assert.ok(!/offsetWidth|offsetHeight|getBoundingClientRect|getComputedStyle/.test(js), 'update no lee layout');
  const updates = [...js.matchAll(/\n {2}update\(inst, v, prev, ctx\) \{([\s\S]*?)\n {2}\},/g)].map(x => x[1]);
  assert.equal(updates.length, 3, 'tres update()');
  for (const u of updates) assert.ok(!/\.style\.|classList|\.textContent\s*=|\.innerHTML\s*=|setAttribute\(/.test(u), 'update escribe solo con ctx.set*');
}

// ---------------------------------------------------------------- model() con vistas REALES: Calor
const mk = spec => makeHarness({ classId: 'maga', spec, level: 40 });
{
  const h = mk('piromante'), p = h.p, e = h.enemy({ hp: 1e6 });
  let m = V.calor.model(h.gaugeView(), T);
  assert.ok(m.tier === 0 && m.heights.every(x => x === 0) && m.ember === 0 && !m.ash && !m.column && m.num === '0', 'Calor idle: brasero frío');
  for (let i = 0; i < 3; i++) { h.hit(e, { elem: 'fire', skill: 'bola_fuego' }); h.tick(0.1); }
  const v = h.gaugeView();
  m = V.calor.model(v, T);
  assert.equal(v.value, 3 * T.calor.perFireHit);
  assert.ok(m.tier === 1 && m.num === String(3 * T.calor.perFireHit) && !m.ash, 'Calor building: tramo de brasa');
  // TODAS las llamas crecen a la vez (no de izquierda a derecha): todas > 0 y la corona manda
  assert.ok(m.heights.every(x => x > 0), 'todas las llamas encendidas a la vez');
  assert.ok(m.heights[4] > m.heights[0] && m.heights[5] > m.heights[9], 'corona: las centrales más altas');
  h.gauge('calor', 70);
  const m70 = V.calor.model(h.gaugeView(), T);
  assert.ok(m70.tier === 3 && m70.heights.every((x, i) => x > m.heights[i]) && m70.ember > m.ember, 'más Calor → llamas más altas en altura, brasas más vivas');
  h.tick(T.calor.decayAfter + 0.3);
  const vd = h.gaugeView();
  m = V.calor.model(vd, T);
  assert.ok(vd.decaying && m.ash && m.sub.includes(`−${T.calor.decayRate}/s`) && G.gaugeDataState(vd) === 'decay', 'Calor decay: ceniza y «se enfría»');
  h.gauge('calor', 100);
  const va = h.gaugeView();
  m = V.calor.model(va, T);
  assert.ok(va.state === 'active' && m.ignition && m.column && m.tier === 4 && !m.ash && m.sub === 'Ignición Total' && m.num === '100', 'Calor active: Ignición Total, columna blanca');
  assert.ok(m.heights.every((x, i) => x >= m70.heights[i]) && Math.max(...m.heights) > 0.99, 'Ignición: altura máxima');
  h.aim(4, 0); h.setSlot('rmb', 'bola_fuego'); h.cast('rmb');
  p.addBuff('p_combustion', {}, 2.5, { name: 'Combustión' });
  m = V.calor.model(h.gaugeView(), T);
  assert.ok(m.comb && m.badge === 'Crítico' && m.sub.startsWith('Combustión'), 'Calor: Combustión con su insignia (todo el Fuego crítico)');
}

// ---------------------------------------------------------------- Escarcha (por enemigo)
{
  const h = mk('crionte');
  const a = h.enemy({ hp: 1e6 }), b = h.enemy({ hp: 1e6, pos: [3, 0, 0] });
  a.def = { ...a.def, name: 'Necrófago' }; b.def = { ...b.def, name: 'Esqueleto' };
  let m = V.escarcha.model(h.gaugeView(), T);
  assert.ok(m.n === 0 && m.lit.every(x => !x) && !m.hasTarget && m.name === '—' && m.num === `0/${T.escarcha.max}`, 'Escarcha idle: sin objetivo con capas');
  for (let i = 0; i < 3; i++) h.hit(a, { elem: 'frost', skill: 'k_lanza' });
  h.hit(b, { elem: 'frost', skill: 'k_lanza' });
  m = V.escarcha.model(h.gaugeView(), T);
  assert.ok(m.n === 3 && m.lit.filter(Boolean).length === 3 && m.lit[0] && !m.lit[3] && m.name === 'Necrófago' && m.counter === '2 con capas', 'Escarcha building: 3 cristales del más escarchado y contador de grupo');
  m = V.escarcha.model(h.gaugeView({ target: b }), T);
  assert.ok(m.n === 1 && m.name === 'Esqueleto', 'Escarcha: el enemigo bajo el cursor');
  // decay: el último cristal pierde brillo según decayIn (2 s por capa)
  h.tick(1.5);
  const vd = h.gaugeView({ target: a });
  m = V.escarcha.model(vd, T);
  assert.ok(vd.decayIn < 1 && m.fade < 0.5 && m.rime > 0.5 && m.last === m.n - 1 && m.sub === 'pierde una capa', `Escarcha decay: el último cristal se escarcha (${vd.decayIn})`);
  // congelación: a 5, se congela (las capas se gastan) → «¡Congelado!» y «1 congelado»
  const seq0 = h.gaugeView({ target: a }).seq.full;
  for (let i = 0; i < 5; i++) h.hit(a, { elem: 'frost', skill: 'k_lanza' });
  const vf = h.gaugeView({ target: a });
  m = V.escarcha.model(vf, T);
  assert.ok(vf.seq.full > seq0 && m.frozen === 1 && m.counter === '1 congelado' && m.targetFrozen && m.sub === '¡Congelado!', 'Escarcha full: congelado, contador y subtítulo');
  // el fotograma de la demo «full» pinta los 5 cristales
  const df = G.demoFrameByTag(V.escarcha.demo, 'full', { id: 'escarcha', max: T.escarcha.max }).view;
  m = V.escarcha.model(df, T);
  assert.ok(m.full && m.lit.every(Boolean) && m.sub === '¡Congelado!', 'Escarcha full (demo): 5 cristales');
  // jefe Aterido
  const boss = h.enemy({ hp: 1e6, boss: true, pos: [0, 0, 3] });
  boss.def = { ...boss.def, name: 'Señor del Osario' };
  for (let i = 0; i < T.escarcha.max; i++) h.hit(boss, { elem: 'frost', skill: 'k_lanza' });
  const vb = h.gaugeView();
  m = V.escarcha.model(vb, T);
  assert.ok(vb.state === 'active' && m.boss && m.numb && m.sub.startsWith('Aterido · ') && m.name === 'Señor del Osario' && m.fade === 1, 'Escarcha active: jefe Aterido');
  // world.overhead: élites, jefes y el del cursor; nunca crea estado
  const ov = V.escarcha.world.overhead;
  const c = h.enemy({ hp: 1e6, pos: [-3, 0, 0] });
  assert.equal(ov(c, h.p), null, 'normal sin capas: nada');
  assert.equal(c.gauges, undefined, 'overhead no crea estado');
  h.hit(b, { elem: 'frost', skill: 'k_lanza' });
  assert.equal(ov(b, h.p), null, 'normal con capas pero sin cursor: nada (R1)');
  h.g.ui.hoverEnemy = b;
  assert.deepEqual(ov(b, h.p), { n: 2, max: T.escarcha.max, numb: false, frozen: false }, 'el enemigo bajo el cursor sí');
  h.g.ui.hoverEnemy = null;
  const el = h.enemy({ hp: 1e6, rank: 'elite', pos: [5, 0, 0] });
  h.hit(el, { elem: 'frost', skill: 'k_lanza' });
  assert.deepEqual(ov(el, h.p), { n: 1, max: T.escarcha.max, numb: false, frozen: false }, 'élite con capas');
  const ob = ov(boss, h.p);
  assert.ok(ob && ob.numb === true && ob.max === T.escarcha.max, 'jefe Aterido');
  assert.equal(ov(null, h.p), null);
}

// ---------------------------------------------------------------- Cargas Arcanas
{
  const h = mk('arcanista'), e = h.enemy({ hp: 1e6 });
  let m = V.cargas.model(h.gaugeView(), T);
  assert.ok(m.n === 0 && m.lit.every(x => !x) && m.arc === 0 && !m.orbit && m.text.includes('Dardo Arcano') && m.num === `0/${T.cargas.max}`, 'Cargas idle: runas apagadas y pista');
  h.hit(e, { skill: 'm_dardo', elem: 'arcane' }); h.hit(e, { skill: 'm_dardo', elem: 'arcane' });
  m = V.cargas.model(h.gaugeView(), T);
  assert.ok(m.n === 2 && m.lit[1] && !m.lit[2] && m.arc === 1 && m.orbit && !m.full && m.text.includes(`+${2 * T.cargas.dmgPerCharge} %`) && m.text.includes(`+${2 * T.cargas.manaPerCharge} maná`), 'Cargas building: 2 runas, arco lleno, previsión');
  h.hit(e, { skill: 'm_dardo', elem: 'arcane' }); h.hit(e, { skill: 'm_dardo', elem: 'arcane' });
  const vf = h.gaugeView();
  m = V.cargas.model(vf, T);
  assert.ok(vf.state === 'full' && m.full && m.core === 1 && m.lit.every(Boolean) && m.text.includes(`+${T.cargas.max * T.cargas.dmgPerCharge} %`), 'Cargas full: núcleo encendido');
  h.tick(T.cargas.loseAfter - 1.5);
  const vd = h.gaugeView();
  m = V.cargas.model(vd, T);
  assert.ok(vd.decayIn < 2 && m.warn && m.orbit && m.arc < 0.34 && m.sub.startsWith('¡se desvanecen!'), `Cargas decay: arco por debajo de 2 s (${vd.decayIn})`);
  h.addPowers('a_resonance');
  const vr = h.gaugeView();
  m = V.cargas.model(vr, T);
  assert.ok(vr.state === 'active' && G.gaugeDataState(vr) === 'active' && vr.x.resonance && m.res && m.arc === 1 && !m.warn && m.sub.startsWith('Resonancia'), 'Cargas active: Resonancia, el arco queda lleno');
}

console.log('✅ Barras de la Maga (2d.2 E1): registro, A3, A4, A8, modelos por estado y world.overhead OK');

// ============================================================
// gaugeView v2 de la Maga (docs/paso2d2-hud-pc.md §3.10). Movido de test75 en el Paso 2 (E1.5):
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
    p.addBuff('p_combustion', {}, 3.5, { name: 'Combustión' });
    v = h.gaugeView();
    assert.ok(v.x.combT === 3.5 && v.x.combMax === 3.5 && v.x.mult === 1, 'Calor: Combustión (x.combT/combMax; ya no multiplica el Calor)');
    assert.ok(v.label === 'Combustión' && v.tMax === 3.5 && v.t === 3.5, 'Calor: anillo de Combustión');
    assert.equal(v.x.perHit, T.calor.perFireHit, 'Calor: x.perHit (Ignición Rápida lo sube)');
  }

  // ---------------------------------------------------------------- Escarcha (por enemigo + objetivo)
  {
    const h = mk('maga', 'crionte', 40);
    const p = h.p;
    const a = h.enemy({ hp: 1e6 }), b = h.enemy({ hp: 1e6, pos: [3, 0, 0] });
    a.def = { ...a.def, name: 'Necrófago' }; b.def = { ...b.def, name: 'Esqueleto' };
    for (let i = 0; i < 3; i++) h.hit(a, { elem: 'frost', skill: 'k_lanza' });
    h.hit(b, { elem: 'frost', skill: 'k_lanza' });
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
    let d = seqDelta(h, 'escarcha', () => { h.hit(a, { elem: 'frost', skill: 'k_lanza' }); h.hit(a, { elem: 'frost', skill: 'k_lanza' }); });
    assert.ok(d.gain === 2 && d.full === 1 && d.empty === 1, `Escarcha: gain ×2, full (congelación) y empty (${JSON.stringify(d)})`);
    v = h.gaugeView({ target: a });
    assert.equal(v.x.frozen, 1, 'Escarcha: x.frozen = congelados ahora');
    assert.equal(v.x.targetFrozen, true, 'Escarcha: x.targetFrozen = el objetivo está Congelado');
    assert.equal(h.gaugeView({ target: b }).x.targetFrozen, false, 'Escarcha: x.targetFrozen falso si el objetivo no está Congelado');
    const boss = h.enemy({ hp: 1e6, boss: true, pos: [0, 0, 3] });
    boss.def = { ...boss.def, name: 'Señor del Osario' };
    h.hit(boss, { elem: 'frost', skill: 'k_lanza' });
    v = h.gaugeView();
    assert.ok(v.enemy === boss && v.x.boss === true && v.x.enemyName === 'Señor del Osario', 'Escarcha: el jefe en combate antes que el más escarchado');
    for (let i = 0; i < 4; i++) h.hit(boss, { elem: 'frost', skill: 'k_lanza' });
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

  // ---------------------------------------------------------------- gaugeTuning: única fuente
  // lo que gaugeTuning copia de un poder (powers-<clase>.js) debe coincidir con el texto del nodo
  function nodeText(cls, spec, id) {
    const n = TALENT_TREES[cls].specs.find(s => s.id === spec).nodes.find(x => x.id === id);
    return typeof n.d === 'function' ? n.d(1) : n.d;
  }
  const has = (txt, ...bits) => bits.every(b => txt.includes(b));
  const optText = (cls, spec, id, k) => TALENT_TREES[cls].specs.find(s => s.id === spec).nodes.find(x => x.id === id).opts.find(o => o.k === k).desc;
  const rankText = (cls, spec, id, r) => TALENT_TREES[cls].specs.find(s => s.id === spec).nodes.find(x => x.id === id).d(r);
  const es1 = n => String(n).replace('.', ',');
  assert.ok(has(nodeText('maga', 'piromante', 's5'), `${T.calor.chispas} de Calor`), 'Chispas');
  assert.ok(has(optText('maga', 'piromante', 's9', 'A'), `${T.calor.llamarada} de Calor`), 'Llamarada Avivada');
  assert.ok(has(optText('maga', 'piromante', 's9', 'B'), `${T.calor.vorazN} o más`, `${T.calor.voraz} de Calor por enemigo`), 'Llamarada Voraz');
  assert.ok(has(nodeText('maga', 'piromante', 's23'), `${es1(T.calor.combustion.base + T.calor.combustion.perRank)} s`), 'Combustión r1');
  assert.ok(has(rankText('maga', 'piromante', 's23', 3), `${es1(T.calor.combustion.base + 3 * T.calor.combustion.perRank)} s`), 'Combustión r3');
  assert.ok(has(nodeText('maga', 'piromante', 's26'), `${T.calor.perpetua} de Calor`, `${T.calor.perpetuaExt} s más`), 'Combustión Perpetua');
  assert.ok(has(rankText('maga', 'piromante', 's28', 3), `${T.calor.eliteCalor} de Calor`, `${T.calor.ignitionAt} de Calor (antes ${T.calor.max})`), 'Corazón del Sol');
  assert.ok(has(nodeText('maga', 'crionte', 'i0'), `la Nova, ${T.escarcha.nova}`, `A ${T.escarcha.max} capas`, `${es1(T.escarcha.freezeT)} s`, `Aterido ${T.escarcha.numbT} s`), 'Escarcha');
  assert.ok(has(nodeText('maga', 'crionte', 'i4'), `(antes cada ${T.escarcha.decayEvery} s)`), 'Escarcha Densa');
  assert.ok(has(nodeText('maga', 'arcanista', 'a0'), `máx. ${T.cargas.max}`, `duran ${T.cargas.loseAfter} s`, `+${T.cargas.dmgPerCharge} %`, `${T.cargas.manaPerCharge} de maná`), 'Cargas Arcanas');
  assert.ok(has(nodeText('maga', 'arcanista', 'a1'), `(antes ${T.cargas.loseAfter} s)`), 'Memoria Arcana');
  assert.ok(has(rankText('maga', 'arcanista', 'a16', 2), `+${2 * T.cargas.resonanceCrit} %`), 'Resonancia');
  assert.ok(has(nodeText('maga', 'piromante', 's16'), `más de ${T.calor.brasero} de Calor`), 'Brasero');
  assert.ok(has(nodeText('maga', 'crionte', 'i2'), `${T.escarcha.critLayers} o más capas`), 'Filo Helado');
  // los rótulos de los nodos en la barra sacan sus números de T (no van escritos a mano)
  const nodes = id => V[id].nodes;
  assert.ok(has(nodes('calor').s9, `${T.calor.llamarada} de Calor`, `${T.calor.voraz} por enemigo`) && has(nodes('calor').s16, `${T.calor.brasero} de Calor`)
    && has(nodes('calor').s28, `a ${T.calor.ignitionAt}`), 'nodos del Calor con los números de T');
  assert.ok(has(nodes('escarcha').i0, `a ${T.escarcha.max},`) && has(nodes('escarcha').i2, `${T.escarcha.critLayers} capas`)
    && has(nodes('escarcha').i28, `bastan ${T.escarcha.max - 1} capas`), 'nodos de la Escarcha con los números de T');
  assert.ok(has(nodes('cargas').a16, `con ${T.cargas.max} Cargas`), 'nodos de las Cargas con los números de T');
  // la Prisión pone las capas de su definición (catálogo: layers), no las de la Nova
  const { MAGA_SKILLS } = await import('../js/skills-maga.js');
  const prision = MAGA_SKILLS.find(s => s.id === 'k_prision').layers;
  assert.ok(prision > 0 && has(V.escarcha.explain(T).cols[0][1], `Prisión de Hielo +${prision}`), 'explain: las capas de la Prisión salen de su definición');
  console.log('✅ gaugeView v2 de la Maga (movido de test75): x, seq y gaugeTuning contra el texto de los nodos OK');
}
