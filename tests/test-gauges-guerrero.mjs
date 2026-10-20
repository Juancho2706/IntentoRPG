// ============================================================
// Paso 2d.2 · E1 (W5): barras de mecánica del Guerrero — js/ui-gauges-guerrero.js + css/gauges-guerrero.css
// ============================================================
// docs/paso2d2-hud-pc.md §3.1–§3.3, §4 y §7.1:
//  · headless: el módulo no toca document/window al importarse;
//  · registro: validateGaugeView = [] para sed, bastion y fervor (y entran en el núcleo);
//  · A3: demo con tags idle/building/(full|active) (+ decay si la mecánica pierde), ids de
//    nodes en TALENT_TREES de su especialización, demo[].nodes ⊂ nodes, valores de la demo
//    dentro de gaugeTuning() (máximos y duraciones);
//  · A4: explain(T) cita los números de T (y cambian si cambia T: no hay números a mano);
//  · model() con vistas REALES del arnés (makeHarness(...).gaugeView()) en cada estado;
//  · A8: css/gauges-guerrero.css solo anima transform/opacity (+ transición de
//    stroke-dashoffset de las venas); todo selector empieza por .gz-sed/.gz-bastion/.gz-fervor.
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

assert.equal(typeof globalThis.document, 'undefined');
const W = await import('../js/ui-gauges-guerrero.js');
const G = await import('../js/ui-gauges.js');
const { gaugeTuning, gaugeSeq, gainGauge, spendGauge } = await import('../js/spec-mechanics.js');
const { TALENT_TREES } = await import('../js/talents.js');
const { makeHarness } = await import('./helpers/power-harness.mjs');

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const T = gaugeTuning();
const VIEWS = W.GUERRERO_GAUGE_VIEWS;
const IDS = ['sed', 'bastion', 'fervor'];
const SPEC = { sed: 'berserker', bastion: 'guardian', fervor: 'cruzado' };
const MAX = { sed: T.sed.max, bastion: T.bastion.max, fervor: T.fervor.max };
const approx = (a, b, e = 1e-6) => Math.abs(a - b) <= e;

// ---------------------------------------------------------------- registro
assert.deepEqual(Object.keys(VIEWS).sort(), [...IDS].sort(), 'exporta exactamente sed, bastion y fervor');
assert.deepEqual(G.gaugeViewErrors(), [], `núcleo sin rechazos: ${G.gaugeViewErrors().join(' | ')}`);
for (const id of IDS) {
  assert.deepEqual(G.validateGaugeView(id, VIEWS[id]), [], `${id}: validateGaugeView`);
  assert.ok(G.gaugeViewFor(id) && !G.gaugeViewFor(id).generic, `${id}: registrado con renderizador propio`);
  assert.equal(typeof VIEWS[id].model, 'function', `${id}: model()`);
}

// ---------------------------------------------------------------- A3: demo y nodos
const sfxSrc = readFileSync(join(root, 'js', 'sfx.js'), 'utf8');
for (const id of IDS) {
  const d = VIEWS[id];
  const spec = TALENT_TREES.guerrero.specs.find(s => s.id === SPEC[id]);
  assert.equal(spec.mechanic, id, `${id}: es la mecánica de ${spec.name}`);
  const treeIds = new Set(spec.nodes.map(n => n.id));
  for (const n of Object.keys(d.nodes)) assert.ok(treeIds.has(n), `${id}: nodo ${n} existe en ${spec.name}`);
  assert.ok(Object.keys(d.nodes).length >= 5, `${id}: varios nodos que la potencian`);
  for (const n of G.demoNodes(d.demo)) assert.ok(n in d.nodes, `${id}: la demo cita ${n}`);
  const tags = new Set(d.demo.map(f => f.tag).filter(Boolean));
  for (const t of ['idle', 'building']) assert.ok(tags.has(t), `${id}: tag ${t}`);
  assert.ok(tags.has('full') || tags.has('active'), `${id}: tag full o active`);
  if (id !== 'fervor') assert.ok(tags.has('decay'), `${id}: pierde → tag decay`);
  const len = G.demoLength(d.demo);
  assert.ok(len >= 10 && len <= 13, `${id}: la demo dura 10–13 s (${len})`);
  // valores sintéticos dentro de gaugeTuning(): cada 0,1 s de la demo
  for (let t = 0; t < len; t += 0.1) {
    const v = G.demoFrameAt(d.demo, t, { id, max: MAX[id] }).view;
    assert.ok(v.value >= 0 && v.value <= MAX[id] + 1e-9, `${id}@${t.toFixed(1)}: valor ${v.value} ≤ ${MAX[id]}`);
    if (v.tMax != null && v.t != null) assert.ok(v.t <= v.tMax + 1e-9, `${id}@${t.toFixed(1)}: t ≤ tMax`);
    if (v.decayIn != null && id === 'bastion') assert.ok(v.decayIn <= T.bastion.decayEvery + 1e-9, 'bastion: decayIn ≤ decayEvery');
  }
  const act = G.demoFrameByTag(d.demo, 'active', { id, max: MAX[id] }).view;
  const tMax = { sed: T.sed.satedT, bastion: T.bastion.wall.t, fervor: T.fervor.ascension.t }[id];
  assert.ok(act.state === 'active' && act.tMax === tMax, `${id}: el estado activo dura lo de gaugeTuning() (${act.tMax} = ${tMax})`);
  // sonidos: solo full/spent y con tonos que existen en sfx.js
  for (const [ev, name] of Object.entries(d.sounds || {})) {
    assert.ok(['full', 'spent'].includes(ev), `${id}: sonido de ${ev}`);
    assert.ok(new RegExp(`\\b${name}\\s*:`).test(sfxSrc), `${id}: el tono "${name}" existe en sfx.js`);
  }
  // cada tag representativo pasa por el modelo
  for (const tag of ['idle', 'building', 'full', 'active', 'decay']) {
    const m = d.model(G.demoFrameByTag(d.demo, tag, { id, max: MAX[id] }).view, T);
    assert.ok(m && typeof m.num === 'string', `${id}: model(${tag})`);
  }
}
// Veredicto listo en la demo: la ranura enlazada es la habilidad real (no una ranura)
{
  const v = G.demoFrameByTag(VIEWS.fervor.demo, 'full', { id: 'fervor', max: 3 }).view;
  assert.deepEqual(v.ready, ['g_t_veredicto'], 'fervor: demo full → ready [g_t_veredicto]');
}

// ---------------------------------------------------------------- A4: explain(T) cita T
const plain = s => String(s).replace(/<[^>]+>/g, '');
const all = E => [E.text, ...E.cols.flat(), ...E.tip].map(plain).join(' \n ');
for (const id of IDS) {
  const E = VIEWS[id].explain(T);
  assert.ok(typeof E.text === 'string' && E.text.length > 20, `${id}: text`);
  assert.equal(E.cols.length, 3, `${id}: 3 columnas`);
  assert.deepEqual(E.cols.map(c => c[0]).slice(0, 2), ['Generar', 'Descargar'], `${id}: columnas Generar/Descargar`);
  assert.ok(['Pérdida', 'Ventana'].includes(E.cols[2][0]), `${id}: 3.ª columna Pérdida o Ventana`);
  assert.ok(E.tip.length >= 2 && E.tip.length <= 3, `${id}: tip de 2–3 líneas`);
  for (const s of [E.text, ...E.tip]) assert.ok(!/<(?!\/?b>)[^>]*>/.test(s), `${id}: solo <b> en el HTML`);
  assert.ok(!/\d\.\d/.test(all(E)), `${id}: decimales en formato español`);
}
const has = (id, ...xs) => { const s = all(VIEWS[id].explain(T)); for (const x of xs) assert.ok(s.includes(x), `${id}: explain cita «${x}»\n${s}`); };
has('sed', `${T.sed.satedT} s`, `${T.sed.satedDmgPct} %`, `${T.sed.decayRate}/s`, `${T.sed.decayAfter} s`, `${T.sed.bleedPerSec}/s`, `${T.sed.lowHpPct} %`);
has('bastion', `máx. ${T.bastion.max}`, `${T.bastion.wall.drPerCharge} %`, `${T.bastion.wall.t} s`, `${T.bastion.decayEvery} s`, `${T.bastion.blockPct} %`, `+${T.bastion.shout}`);
has('fervor', `${T.fervor.hammerHits} impactos`, `${T.fervor.verdict.coefPct} %`, `${T.fervor.ascension.t} s`, `gasta ${T.fervor.verdict.cost}`, `${T.fervor.verdict.healPct} %`);
// sin números a mano: con otra T los textos cambian
{
  const T2 = JSON.parse(JSON.stringify(T));
  T2.sed.satedT = 7.5; T2.sed.decayRate = 13; T2.bastion.decayEvery = 9; T2.bastion.wall.drPerCharge = 12; T2.fervor.ascension.t = 14; T2.fervor.verdict.coefPct = 333;
  const s1 = all(VIEWS.sed.explain(T2)), s2 = all(VIEWS.bastion.explain(T2)), s3 = all(VIEWS.fervor.explain(T2));
  assert.ok(s1.includes('7.5 s') || s1.includes('7,5 s'), 'sed: satedT sale de T');
  assert.ok(s1.includes('13/s') && !s1.includes(`${T.sed.decayRate}/s`), 'sed: decayRate sale de T');
  assert.ok(s2.includes('9 s') && s2.includes('12 %'), 'bastion: decayEvery y drPerCharge salen de T');
  assert.ok(s3.includes('14 s') && s3.includes('333 %'), 'fervor: ascensión y coef salen de T');
}

// ---------------------------------------------------------------- model() con vistas REALES
// Sed
{
  const h = makeHarness({ classId: 'guerrero', spec: 'berserker', level: 30 });
  const p = h.p;
  let v = h.gaugeView(), m = W.sedModel(v, T);
  assert.equal(v.id, 'sed');
  assert.ok(m.k === 0 && m.dash === 101 && m.tier === 0 && !m.lit && m.num === '0' && m.anchor === 'ends', `sed idle: ${JSON.stringify(m)}`);
  assert.ok(/llenarla/.test(m.sub), 'sed idle: pista de cómo llenarla');
  p.takeDamage(p.stats.maxHP * 0.7, 1, {});
  v = h.gaugeView(); m = W.sedModel(v, T);
  assert.equal(v.state, 'building');
  assert.ok(m.lit && m.low && m.tier >= 1 && approx(m.dash, 100 - 100 * m.k, 1e-3) && m.hs > 0.78 && m.hs < 1.08, `sed building: ${JSON.stringify(m)}`);
  assert.equal(m.num, String(Math.floor(v.value)));
  assert.ok(m.sub.includes(`+${T.sed.satedDmgPct}`), 'sed: vida baja → subtítulo con el bono');
  p.sinceCombat = T.sed.decayAfter + 1;
  v = h.gaugeView(); m = W.sedModel(v, T);
  assert.ok(v.decaying && G.gaugeDataState(v) === 'decay', 'sed: fuera de combate pierde');
  assert.ok(m.anchor === 'heart' && m.dash > 200 && m.dash <= 300 && m.tier === 0 && m.sub.includes(`−${T.sed.decayRate}/s`), `sed decay: ${JSON.stringify(m)}`);
  p.sinceCombat = 0; p.hp = p.stats.maxHP;
  h.gauge('sed', 100);
  v = h.gaugeView(); m = W.sedModel(v, T);
  assert.equal(v.state, 'active');
  assert.ok(m.sated && m.drip && m.dash === 0 && m.hs === 1.08 && !m.low && m.num === '100', `sed active: ${JSON.stringify(m)}`);
  assert.ok(m.sub.startsWith('Sed Saciada · ') && m.sub.includes(' s'), `sed active: subtítulo (${m.sub})`);
  p.addBuff('g_desenfreno', { aspdPct: T.sed.frenzy.aspdPct }, T.sed.frenzy.t, { name: 'Desenfreno' });
  m = W.sedModel(h.gaugeView(), T);
  assert.ok(m.frenzy && m.sub.includes('Desenfreno'), 'sed: Desenfreno (s14) → venas ámbar y subtítulo');
}
// Bastión
{
  const h = makeHarness({ classId: 'guerrero', spec: 'guardian', level: 40 });
  const p = h.p;
  let m = W.bastionModel(h.gaugeView(), T);
  assert.ok(m.n === 0 && m.lit.every(x => !x) && m.crack === 0 && m.num === `0/${T.bastion.max}` && !m.wall, `bastion idle: ${JSON.stringify(m)}`);
  gainGauge(p, 'bastion', 2);
  let v = h.gaugeView(); m = W.bastionModel(v, T);
  assert.deepEqual(m.lit, [true, true, false, false, false], 'bastion: 2 escudos encendidos');
  assert.ok(m.crackIdx === 1 && m.crack < 0.05, `bastion: grieta nace en el último escudo (${m.crack})`);
  assert.ok(m.text.includes(`${2 * T.bastion.wall.drPerCharge}`), 'bastion: anticipa lo que daría el Muro');
  h.tick(4);
  v = h.gaugeView(); m = W.bastionModel(v, T);
  assert.ok(approx(m.crack, 1 - v.decayIn / T.bastion.decayEvery, 1e-3) && m.crack >= 0.5, `bastion: grieta = 1 − decayIn/${T.bastion.decayEvery} (${m.crack})`);
  assert.ok(m.sub.startsWith('se agrieta'), 'bastion: la pérdida se anuncia con texto (A6)');
  gainGauge(p, 'bastion', 3);
  v = h.gaugeView(); m = W.bastionModel(v, T);
  assert.ok(v.state === 'full' && m.n === 5 && m.lit.every(Boolean) && m.num === '5/5' && m.sub === 'muralla completa', `bastion full: ${JSON.stringify(m)}`);
  spendGauge(p, 'bastion', 5);
  p.addBuff('g_t_muro', { dr: 50 }, T.bastion.wall.t, { name: 'Muro de Escudos' });
  v = h.gaugeView(); m = W.bastionModel(v, T);
  assert.ok(v.state === 'active' && m.wall && m.lit.every(Boolean) && m.crack === 0 && m.dr === 50, `bastion wall: ${JSON.stringify(m)}`);
  assert.ok(m.num.startsWith('−50') && m.text.startsWith('−50') && m.sub.startsWith('Muro de Escudos'), 'bastion wall: número y texto');
}
// Fervor
{
  const h = makeHarness({ classId: 'guerrero', spec: 'cruzado', level: 40 });
  const p = h.p, f = h.enemy({ hp: 1e6 });
  let m = W.fervorModel(h.gaugeView(), T);
  assert.ok(m.n === 0 && m.suns.every(x => !x) && m.beads.length === T.fervor.hammerHits && !m.ready && !m.rays, `fervor idle: ${JSON.stringify(m)}`);
  h.hit(f, { skill: 'g_martillo' }); h.hit(f, { skill: 'g_martillo' });
  m = W.fervorModel(h.gaugeView(), T);
  assert.deepEqual(m.beads, [true, true, false], 'fervor: cuentas del Martillo');
  h.hit(f, { skill: 'g_martillo' });
  let v = h.gaugeView(); m = W.fervorModel(v, T);
  assert.ok(v.state === 'building' && m.n === 1 && m.suns[0] && !m.suns[1] && m.beads.every(x => !x), `fervor building: ${JSON.stringify(m)}`);
  gainGauge(p, 'fervor', 2);
  v = h.gaugeView(); m = W.fervorModel(v, T);
  assert.ok(v.state === 'full' && m.ready && m.rays && m.suns.every(Boolean) && m.text === 'Veredicto Final listo' && m.num === '3/3', `fervor full: ${JSON.stringify(m)}`);
  spendGauge(p, 'fervor', 3);
  p.addBuff('g_ascension', {}, T.fervor.ascension.t, { name: 'Ascensión' });
  v = h.gaugeView(); m = W.fervorModel(v, T);
  assert.ok(v.state === 'active' && m.asc && m.wings && m.rays && m.ready && m.sub.startsWith('Ascensión'), `fervor active: ${JSON.stringify(m)}`);
  assert.ok(gaugeSeq(p, 'fervor').spent >= 1, 'fervor: seq.spent (cascada al gastar)');
}

// ---------------------------------------------------------------- A8 + prefijos de la CSS
{
  const f = join(root, 'css', 'gauges-guerrero.css');
  assert.ok(existsSync(f), 'css/gauges-guerrero.css existe');
  const css = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const kfRe = /@keyframes\s+([\w-]+)\s*\{/g;
  let m, nk = 0;
  while ((m = kfRe.exec(css))) {
    nk++;
    assert.ok(/^gz-(sed|bastion|fervor)-/.test(m[1]), `A8: keyframes con prefijo gz-<id>- (${m[1]})`);
    let depth = 1, i = kfRe.lastIndex;
    while (depth && i < css.length) { if (css[i] === '{') depth++; else if (css[i] === '}') depth--; i++; }
    for (const [, prop] of css.slice(kfRe.lastIndex, i - 1).matchAll(/([a-z-]+)\s*:/g)) assert.ok(['transform', 'opacity'].includes(prop), `A8: @keyframes ${m[1]} anima ${prop}`);
  }
  assert.ok(nk >= 6, 'hay animaciones propias');
  for (const [, val] of css.matchAll(/transition(?:-property)?\s*:\s*([^;}]+)/g)) {
    for (const part of val.split(',')) {
      const prop = part.trim().split(/\s+/)[0];
      assert.ok(['transform', 'opacity', 'stroke-dashoffset', 'none'].includes(prop), `A8: transition de ${prop}`);
    }
  }
  // la transición de stroke-dashoffset solo en los trazos de las venas de la Sed
  for (const [, sel, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (/stroke-dashoffset[^;]*\.\d+s|transition:[^;]*stroke-dashoffset/.test(body)) assert.ok(/^\s*\.gz-sed /.test(sel), `A8: stroke-dashoffset solo en la Sed (${sel.trim()})`);
    if (sel.trim().startsWith('@') || /^\s*(from|to|\d+%)/.test(sel)) continue;
    for (const s of sel.split(',')) assert.ok(/^\s*\.gz-(sed|bastion|fervor)[\s.:[]/.test(s), `selector con prefijo .gz-<id>: «${s.trim()}»`);
  }
  assert.ok(!/backdrop-filter|box-shadow\s*:[^;]*;[^}]*animation/.test(css), 'R4: sin backdrop-filter');
}

// ---------------------------------------------------------------- assets de la clase
for (const n of ['gz_sed_corazon', 'gz_sed_venas', 'gz_sed_sangre', 'gz_sed_saciada', 'gz_bastion_escudo', 'gz_bastion_escudo_vacio', 'gz_bastion_grieta',
  'gz_bastion_muro', 'gz_fervor_halo', 'gz_fervor_sol', 'gz_fervor_rayos', 'gz_fervor_ascension'])
  assert.ok(existsSync(join(root, 'assets', 'gauges', `${n}.webp`)), `asset ${n}.webp`);
const src = readFileSync(join(root, 'js', 'ui-gauges-guerrero.js'), 'utf8');
for (const n of ['gz_sed_corazon', 'gz_sed_venas', 'gz_sed_sangre', 'gz_sed_saciada', 'gz_bastion_escudo', 'gz_bastion_escudo_vacio', 'gz_bastion_grieta',
  'gz_bastion_muro', 'gz_fervor_halo', 'gz_fervor_sol', 'gz_fervor_rayos', 'gz_fervor_ascension'])
  assert.ok(src.includes(`'${n}'`), `el renderizador usa ${n}`);
assert.ok(!/\b(document|window)\./.test(src), 'sin document/window en el módulo (todo pasa por ctx)');
assert.ok(!/offsetWidth|getBoundingClientRect|offsetHeight/.test(src), 'update sin lecturas de layout');

console.log('✅ Barras del Guerrero (2d.2 E1): registro, A3, A4, model() con vistas reales, A8 y assets OK');
