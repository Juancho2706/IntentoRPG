// ============================================================
// Barras de mecánica del Guerrero — js/ui-gauges-guerrero.js + css/gauges-guerrero.css + js/mech-guerrero.js
// ============================================================
// Paso 2d.2 (docs/paso2d2-hud-pc.md §3.1–§3.3, §3.10, §4 y §7.1) con las mecánicas rehechas del Paso 2g
// (docs/paso2g-guerrero.md §7 y §11.5): Sed, Bastión (posturas, plantado, descarga) y Fervor (Veredicto).
//  · headless: el módulo no toca document/window al importarse;
//  · registro: validateGaugeView = [] para sed, bastion y fervor;
//  · A3: demo con tags idle/building/(full|active)/decay, ids de nodes en el árbol de su
//    especialización, demo[].nodes ⊂ nodes, valores dentro de gaugeTuning();
//  · A4: explain(T) cita los números de T (y cambian si cambia T);
//  · model() con vistas REALES del arnés en cada estado;
//  · mecánica (antes en test75): x, seq, ready y los números de gaugeTuning contra los nodos;
//  · A8: la CSS solo anima transform/opacity (+ stroke-dashoffset de las venas) y todo selector
//    empieza por .gz-sed/.gz-bastion/.gz-fervor.
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

assert.equal(typeof globalThis.document, 'undefined');
const W = await import('../js/ui-gauges-guerrero.js');
const G = await import('../js/ui-gauges.js');
const { gaugeTuning, gaugeSeq, gainGauge, gaugeMax } = await import('../js/spec-mechanics.js');
const { TALENT_TREES } = await import('../js/talents.js');
const { CLASSES } = await import('../js/data.js');
const { firePower } = await import('../js/powers.js');
const { resolveSkill } = await import('../js/skill-resolve.js');
const { multiplierProduct } = await import('../js/combat-math.js');
const { makeHarness } = await import('./helpers/power-harness.mjs');

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const T = gaugeTuning();
const VIEWS = W.GUERRERO_GAUGE_VIEWS;
const IDS = ['sed', 'bastion', 'fervor'];
const SPEC = { sed: 'berserker', bastion: 'guardian', fervor: 'cruzado' };
const MAX = { sed: T.sed.max, bastion: T.bastion.max, fervor: T.fervor.max };
const approx = (a, b, e = 1e-6) => Math.abs(a - b) <= e;
const mk = (spec, specRanks = {}, extra = {}) => makeHarness({ classId: 'guerrero', spec, level: 100, seed: 7, talents: { specRanks }, ...extra });
const specOf = id => TALENT_TREES.guerrero.specs.find(s => s.id === id);
const nodeOf = (spec, id) => specOf(spec).nodes.find(n => n.id === id);
const dOf = (n, r = 1) => (typeof n.d === 'function' ? n.d(r) : n.d);
function seqDelta(h, id, fn) {
  const a = { ...gaugeSeq(h.p, id) };
  fn();
  const b = h.gaugeView().seq;
  return { gain: b.gain - a.gain, full: b.full - a.full, spent: b.spent - a.spent, empty: b.empty - a.empty };
}

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
  const spec = specOf(SPEC[id]);
  assert.equal(spec.mechanic, id, `${id}: es la mecánica de ${spec.name}`);
  const treeIds = new Set(spec.nodes.map(n => n.id));
  for (const n of Object.keys(d.nodes)) assert.ok(treeIds.has(n), `${id}: nodo ${n} existe en ${spec.name}`);
  assert.ok(Object.keys(d.nodes).length >= 5, `${id}: varios nodos que la potencian`);
  assert.ok(d.nodes[spec.nodes[0].id], `${id}: cita su nodo clave ${spec.nodes[0].id}`);
  for (const n of G.demoNodes(d.demo)) assert.ok(n in d.nodes, `${id}: la demo cita ${n}`);
  const tags = new Set(d.demo.map(f => f.tag).filter(Boolean));
  for (const t of ['idle', 'building', 'decay']) assert.ok(tags.has(t), `${id}: tag ${t}`);
  assert.ok(tags.has('full') || tags.has('active'), `${id}: tag full o active`);
  const len = G.demoLength(d.demo);
  assert.ok(len >= 10 && len <= 13, `${id}: la demo dura 10–13 s (${len})`);
  for (let t = 0; t < len; t += 0.1) {
    const v = G.demoFrameAt(d.demo, t, { id, max: MAX[id] }).view;
    assert.ok(v.value >= 0 && v.value <= MAX[id] + 1e-9, `${id}@${t.toFixed(1)}: valor ${v.value} ≤ ${MAX[id]}`);
    if (v.tMax != null && v.t != null) assert.ok(v.t <= v.tMax + 1e-9, `${id}@${t.toFixed(1)}: t ≤ tMax`);
    if (id === 'bastion' && v.x.walkIn != null) assert.ok(v.x.walkIn <= T.bastion.moveLossEvery + 1e-9, 'bastion: walkIn ≤ moveLossEvery');
    if (id === 'bastion' && v.x.lockT) assert.ok(v.x.lockT <= T.bastion.lockAfterBurst + 1e-9, 'bastion: lockT ≤ lockAfterBurst');
  }
  // sonidos: solo full/spent y con tonos que existen en sfx.js
  for (const [ev, name] of Object.entries(d.sounds || {})) {
    assert.ok(['full', 'spent'].includes(ev), `${id}: sonido de ${ev}`);
    assert.ok(new RegExp(`\\b${name}\\s*:`).test(sfxSrc), `${id}: el tono "${name}" existe en sfx.js`);
  }
  for (const tag of tags) {
    const m = d.model(G.demoFrameByTag(d.demo, tag, { id, max: MAX[id] }).view, T);
    assert.ok(m && typeof m.num === 'string', `${id}: model(${tag})`);
  }
}
// el estado activo dura lo de gaugeTuning(): Sed Saciada y la espera tras descargar el Bastión
{
  const s = G.demoFrameByTag(VIEWS.sed.demo, 'active', { id: 'sed', max: 100 }).view;
  assert.ok(s.state === 'active' && s.tMax === T.sed.satedT, `sed: Sed Saciada ${s.tMax} = ${T.sed.satedT} s`);
  const b = G.demoFrameByTag(VIEWS.bastion.demo, 'active', { id: 'bastion', max: 5 }).view;
  assert.ok(b.state === 'active' && b.label === 'Descarga' && b.tMax === T.bastion.lockAfterBurst, `bastion: Descarga ${b.tMax} = ${T.bastion.lockAfterBurst} s`);
  assert.ok(W.bastionModel(b, T).lock, 'bastion: la demo de la descarga muestra el bloqueo');
  const f = G.demoFrameByTag(VIEWS.fervor.demo, 'full', { id: 'fervor', max: 3 }).view;
  assert.deepEqual(f.ready, ['g_martillo'], 'fervor: demo full → el Martillo está listo (Veredicto)');
  assert.ok(!VIEWS.fervor.demo.some(fr => fr.tag === 'active'), 'fervor: sin estado activo (ya no hay Ascensión)');
}

// ---------------------------------------------------------------- A4: explain(T) cita T
const plain = s => String(s).replace(/<[^>]+>/g, '');
const all = E => [E.text, ...E.cols.flat(), ...E.tip].map(plain).join(' \n ');
for (const id of IDS) {
  const E = VIEWS[id].explain(T);
  assert.ok(typeof E.text === 'string' && E.text.length > 20, `${id}: text`);
  assert.equal(E.cols.length, 3, `${id}: 3 columnas`);
  assert.deepEqual(E.cols.map(c => c[0]), ['Generar', 'Descargar', 'Pérdida'], `${id}: columnas Generar/Descargar/Pérdida`);
  assert.ok(E.tip.length >= 2 && E.tip.length <= 3, `${id}: tip de 2–3 líneas`);
  for (const s of [E.text, ...E.tip]) assert.ok(!/<(?!\/?b>)[^>]*>/.test(s), `${id}: solo <b> en el HTML`);
  assert.ok(!/\d\.\d/.test(all(E)), `${id}: decimales en formato español`);
  assert.ok(!/stagger|\bprocs?\b|\bUNI\b/i.test(all(E)), `${id}: sin jerga`);
}
const has = (id, ...xs) => { const s = all(VIEWS[id].explain(T)); for (const x of xs) assert.ok(s.includes(x), `${id}: explain cita «${x}»\n${s}`); };
has('sed', `${T.sed.satedT} s`, `+${T.sed.satedDmgPct} %`, `${T.sed.decayRate}/s`, `${T.sed.decayAfter} s`, `${T.sed.bleedPerSec}/s`, `${T.sed.lowHpPct} %`, `+${T.sed.perBleedTick}`);
has('bastion', `máx. ${T.bastion.max}`, `${T.bastion.drPerCharge} %`, `${T.bastion.plantedEvery} s`, `${T.bastion.moveLossEvery} s`, `${T.bastion.lockAfterBurst} s`,
  `${T.bastion.burst.shieldPct} %`, `${T.bastion.burst.coef * 100} %`, `${T.bastion.burst.radius} m`, `Con ${T.bastion.burstAt}`);
has('fervor', `${T.fervor.basicHits} Tajos`, `+${T.fervor.verdict.dmgPct} %`, `${T.fervor.verdict.healPct} %`, `gasta ${T.fervor.verdict.cost}`, `${T.fervor.decayOOC} s`,
  `Cataclismo perfecto, ${T.fervor.perfectCataclysm}`, `máx. ${T.fervor.perCastMax} por lanzamiento`);
// sin números a mano: con otra T los textos cambian
{
  const T2 = JSON.parse(JSON.stringify(T));
  T2.sed.satedT = 7.5; T2.sed.decayRate = 13;
  T2.bastion.moveLossEvery = 9; T2.bastion.drPerCharge = 12; T2.bastion.lockAfterBurst = 11; T2.bastion.burst.coef = 4.5;
  T2.fervor.verdict.dmgPct = 333; T2.fervor.basicHits = 7;
  const s1 = all(VIEWS.sed.explain(T2)), s2 = all(VIEWS.bastion.explain(T2)), s3 = all(VIEWS.fervor.explain(T2));
  assert.ok(s1.includes('7.5 s') || s1.includes('7,5 s'), 'sed: satedT sale de T');
  assert.ok(s1.includes('13/s') && !s1.includes(`${T.sed.decayRate}/s`), 'sed: decayRate sale de T');
  assert.ok(s2.includes('9 s') && s2.includes('12 %') && s2.includes('11 s') && s2.includes('450 %'), 'bastion: moveLossEvery, drPerCharge, lockAfterBurst y la onda salen de T');
  assert.ok(s3.includes('+333 %') && s3.includes('7 Tajos'), 'fervor: Veredicto y Tajos salen de T');
}

// ---------------------------------------------------------------- gaugeTuning: única fuente (texto de los nodos y catálogo)
{
  const inc = (txt, ...bits) => { for (const b of bits) assert.ok(txt.includes(b), `«${b}» en «${txt}»`); };
  inc(dOf(nodeOf('berserker', 'b0')), `A ${T.sed.max}`, `Sed Saciada ${T.sed.satedT} s`, `+${T.sed.satedDmgPct} %`);
  inc(specOf('berserker').innateDesc, `${T.sed.lowHpPct} %`, `+${T.sed.satedDmgPct} %`);
  inc(dOf(nodeOf('berserker', 'b5')), `${T.sed.reabrir} de Sed`);
  inc(dOf(nodeOf('berserker', 'b19')), `${T.sed.ultimoTrago} de Sed`);
  inc(nodeOf('berserker', 'b15').opts.find(o => o.k === 'A').desc, `Sed en ${T.sed.negacion}`);
  inc(dOf(nodeOf('berserker', 'b28'), 2), `${T.sed.eliteKill} de Sed`, `dura ${T.sed.apexSatedT} s (antes ${T.sed.satedT} s)`);
  inc(dOf(nodeOf('berserker', 'b16'), 1), `más de ${T.sed.boilAt} de Sed`);
  inc(dOf(nodeOf('guardian', 'd5')), `${T.bastion.raices} carga de Bastión (${T.bastion.raicesBigN} si golpea a ${T.bastion.raicesBig} o más)`);
  assert.ok(T.bastion.guarnicion === 1 && dOf(nodeOf('guardian', 'd20'), 1).includes('1 carga de Bastión por segundo'), 'd20: 1 carga por segundo');
  // la barra cita esos números de T (Sangre Hirviente, Echar Raíces y Guarnición)
  inc(VIEWS.sed.nodes.b16, `más de ${T.sed.boilAt} de Sed`);
  inc(VIEWS.bastion.nodes.d5, `${T.bastion.raices} carga (${T.bastion.raicesBigN} si golpea a ${T.bastion.raicesBig} o más)`);
  inc(VIEWS.bastion.nodes.d20, `cada ${T.bastion.guarnicion} s`);
  inc(dOf(nodeOf('guardian', 'd0')), `(${T.bastion.max} cargas)`, `un ${T.bastion.drPerCharge} %`);
  inc(dOf(nodeOf('guardian', 'd28'), 2), `guarda ${T.bastion.apexMax} cargas (antes ${T.bastion.max})`);
  inc(nodeOf('guardian', 'd15').opts.find(o => o.k === 'B').desc, `Con ${T.bastion.burstAt} cargas`);
  inc(dOf(nodeOf('cruzado', 'z0')), `${T.fervor.perPerfect} de Fervor por lanzamiento`, `A ${T.fervor.verdict.cost}`);
  inc(dOf(nodeOf('cruzado', 'z28'), 2), `un ${T.fervor.verdict.apexHealPct} % (antes ${T.fervor.verdict.healPct} %)`);
  const sk = id => CLASSES.guerrero.skills.find(s => s.id === id);
  assert.equal(sk('g_martillo').charge.perfectGauge.fervor, T.fervor.perPerfect, 'catálogo: suelta perfecta del Martillo = perPerfect');
  assert.equal(sk('g_u_cataclismo').charge.perfectGauge.fervor, T.fervor.perfectCataclysm, 'catálogo: Cataclismo perfecto = perfectCataclysm');
}

// ================================================================ model() y mecánica con vistas REALES
// ---------------------------------------------------------------- Sed
{
  const h = mk('berserker'), p = h.p;
  let v = h.gaugeView(), m = W.sedModel(v, T);
  assert.equal(v.id, 'sed');
  assert.ok(m.k === 0 && m.dash === 101 && m.tier === 0 && !m.lit && m.num === '0' && m.anchor === 'ends', `sed idle: ${JSON.stringify(m)}`);
  assert.ok(/llenarla/.test(m.sub), 'sed idle: pista de cómo llenarla');
  // perder vida: +1 por 1 %
  let d = seqDelta(h, 'sed', () => p.takeDamage(p.stats.maxHP * 0.7, 1, {}));
  v = h.gaugeView(); m = W.sedModel(v, T);
  const lostPct = 100 - p.hp / p.stats.maxHP * 100;
  assert.ok(d.gain === 1 && approx(v.value, Math.round(lostPct * T.sed.perHpPct * 10) / 10, 0.11), `sed: +${T.sed.perHpPct} por 1 % de vida perdida (${v.value} ≈ ${lostPct})`);
  assert.ok(v.state === 'building' && v.x.low === true, 'sed: con menos del 40 % de vida, x.low');
  assert.ok(m.lit && m.low && m.tier >= 1 && approx(m.dash, 100 - 100 * m.k, 1e-3) && m.hs > 0.78 && m.hs < 1.08, `sed building: ${JSON.stringify(m)}`);
  assert.equal(m.num, String(Math.floor(v.value)));
  assert.ok(m.sub.includes(`+${T.sed.satedDmgPct}`), 'sed: vida baja → subtítulo con el bono');
  // un golpe letal no la llena más allá de la vida que tenías
  {
    const q = mk('berserker', {}, { talents: { specRanks: { b15: 1 }, choice: { b15: 'A' } } });
    q.p.hp = q.p.stats.maxHP * 0.05;
    q.p.takeDamage(1e7, 1, {});
    assert.ok(q.p.alive && q.gaugeValue('sed') === T.sed.negacion && !(q.gaugeState('sed').satedT > 0), 'sed: el golpe letal no la sacia (Negación la deja en 50)');
  }
  // Sangrado: +2 por golpe, como mucho 10 por segundo
  {
    const b = mk('berserker'), e = b.enemy({ hp: 1e9 });
    const tick = () => b.g.onPlayerHit(e, { dealt: 10, dot: true, source: 'g_rajar:bleed', tags: new Set(), skill: 'g_rajar' });
    tick();
    assert.equal(b.gaugeValue('sed'), T.sed.perBleedTick, `sed: +${T.sed.perBleedTick} por golpe de Sangrado`);
    for (let i = 0; i < 7; i++) tick();
    assert.equal(b.gaugeValue('sed'), T.sed.bleedPerSec, `sed: +${T.sed.perBleedTick} por golpe de Sangrado, máx. ${T.sed.bleedPerSec}/s`);
    for (let t = 0; t < 1.05; t += 0.1) { b.p.sinceCombat = 0; b.tick(0.1); }     // en combate: no se drena
    tick();
    assert.equal(b.gaugeValue('sed'), T.sed.bleedPerSec + T.sed.perBleedTick, 'sed: al segundo siguiente, otra vez');
  }
  // fuera de combate se drena
  p.sinceCombat = 1;
  v = h.gaugeView();
  assert.ok(approx(v.decayIn, T.sed.decayAfter - 1) && v.decaying === false, `sed: decayIn = after − sinceCombat (${v.decayIn})`);
  p.sinceCombat = T.sed.decayAfter + 1;
  v = h.gaugeView(); m = W.sedModel(v, T);
  assert.ok(v.decaying && G.gaugeDataState(v) === 'decay', 'sed: fuera de combate pierde');
  assert.ok(m.anchor === 'heart' && m.dash > 200 && m.dash <= 300 && m.tier === 0 && m.sub.includes(`−${T.sed.decayRate}/s`), `sed decay: ${JSON.stringify(m)}`);
  const v0 = v.value;
  h.tick(1);
  assert.ok(approx(h.gaugeValue('sed'), v0 - T.sed.decayRate, 0.2), `sed: −${T.sed.decayRate}/s (${v0} → ${h.gaugeValue('sed')})`);
  // a 100: Sed Saciada
  p.sinceCombat = 0; p.hp = p.stats.maxHP;
  d = seqDelta(h, 'sed', () => h.gauge('sed', 100));
  v = h.gaugeView(); m = W.sedModel(v, T);
  assert.ok(d.full === 1 && v.state === 'active' && v.label === 'Sed Saciada' && v.tMax === T.sed.satedT && v.t > T.sed.satedT - 0.1, 'sed: Sed Saciada (t/tMax)');
  assert.ok(v.hold === true && v.decayIn === null && v.x.low === false, 'sed Saciada: no se drena y no cuenta como vida baja');
  assert.ok(m.sated && m.drip && m.dash === 0 && m.hs === 1.08 && !m.low && m.num === '100', `sed active: ${JSON.stringify(m)}`);
  assert.ok(m.sub.startsWith('Sed Saciada · ') && m.sub.includes(' s'), `sed active: subtítulo (${m.sub})`);
  // Sed Saciada: el ×1,25 de Al borde (m_berserk) aunque tengas la vida llena (lo que test65 no cubre)
  const satedMul = 1 + T.sed.satedDmgPct / 100;
  assert.ok(p.hp === p.stats.maxHP && approx(multiplierProduct(p.powers, { hpFrac: 1, p }), satedMul), `sed Saciada: ×${satedMul} con la vida llena`);
  gainGauge(p, 'sed', 10);
  assert.equal(h.gaugeValue('sed'), 100, 'sed Saciada: no gana más');
  d = seqDelta(h, 'sed', () => h.tick(T.sed.satedT + 0.2));
  assert.ok(d.empty === 1 && h.gaugeValue('sed') === 0, 'sed: al terminar vuelve a 0 (seq.empty)');
  assert.equal(multiplierProduct(p.powers, { hpFrac: 1, p }), 1, 'sed: acabada la Sed Saciada, con la vida llena ×1');
  const before = { ...gaugeSeq(p, 'sed') };
  p.gauges = {};
  assert.deepEqual(h.gaugeView().seq, before, 'seq sobrevive a resetGauges');
  // Corazón Indomable 2: 9 s; Sangre Hirviente: venas ámbar
  {
    const c = mk('berserker', { b28: 2, b16: 1 });
    c.gauge('sed', 60); c.p.sinceCombat = 0; c.tick(0.2);
    let cv = c.gaugeView();
    const cm = W.sedModel(cv, T);
    assert.ok(cv.x.boil && cm.boil && cm.sub === 'Sangre Hirviente', `sed: Sangre Hirviente → x.boil (${JSON.stringify(cv.x)})`);
    c.gauge('sed', 100);
    cv = c.gaugeView();
    assert.ok(cv.tMax === T.sed.apexSatedT && cv.t > T.sed.apexSatedT - 0.1, `sed: Corazón Indomable 2 → ${T.sed.apexSatedT} s (${cv.tMax})`);
    const n = mk('berserker');
    n.gauge('sed', 60); n.tick(0.2);
    assert.ok(!n.gaugeView().x.boil, 'sed: sin Sangre Hirviente, venas rojas');
  }
}

// ---------------------------------------------------------------- Bastión
{
  const h = mk('guardian'), p = h.p;
  let v = h.gaugeView(), m = W.bastionModel(v, T);
  assert.equal(v.id, 'bastion');
  assert.ok(m.n === 0 && m.lit.every(x => !x) && m.crack === 0 && m.num === `0/${T.bastion.max}` && !m.lock && m.text === 'Bloquea o plántate', `bastion idle: ${JSON.stringify(m)}`);
  assert.deepEqual(m.shown, [true, true, true, true, true, false, false], 'bastion: 5 escudos (los 2 de Inexpugnable, ocultos)');
  // bloquear: +1
  const hurt = blocked => firePower('onDamaged', p, h.g, p, { amount: 50, raw: 50, blocked, src: null });
  hurt(false);
  assert.equal(h.gaugeValue('bastion'), 0, 'bastion: un golpe sin bloquear no da');
  let d = seqDelta(h, 'bastion', () => hurt(true));
  assert.ok(d.gain === 1 && h.gaugeValue('bastion') === T.bastion.perBlock, 'bastion: +1 por bloqueo');
  // cada carga, −4 % de daño recibido (el condDr de la mecánica)
  const dr = n => { h.gauge('bastion', n); return firePower('condDr', p, p, { amount: 100, src: null }); };
  assert.equal(dr(3) - dr(0), 3 * T.bastion.drPerCharge, 'bastion: −4 % por carga (condDr real)');
  h.gauge('bastion', 2);
  v = h.gaugeView(); m = W.bastionModel(v, T);
  assert.ok(v.x.drPct === 2 * T.bastion.drPerCharge && m.text === `−${2 * T.bastion.drPerCharge} % de daño`, `bastion: x.drPct y texto (${m.text})`);
  assert.deepEqual(m.lit.slice(0, 5), [true, true, false, false, false], 'bastion: 2 escudos encendidos');
  // postura: Muralla tras el primer cambio
  h.setSlot('k3', 'g_guardia'); h.cast('k3'); h.step(0.05);
  v = h.gaugeView(); m = W.bastionModel(v, T);
  assert.ok(v.x.stance === 'muralla' && m.stance === 'muralla' && m.next === 'ariete', `bastion: x.stance (${v.x.stance})`);
  // plantado en combate: +1 cada 2 s
  p.sinceCombat = 0;
  h.gauge('bastion', 0);
  for (let t = 0; t < 1.2; t += 0.1) { p.sinceCombat = 0; h.tick(0.1); }
  v = h.gaugeView();
  assert.ok(v.x.planted && W.bastionModel(v, T).planted, 'bastion: plantado');
  for (let t = 0; t < T.bastion.plantedEvery * 2 + 0.05; t += 0.1) { p.sinceCombat = 0; h.tick(0.1); }
  assert.equal(h.gaugeValue('bastion'), 2, `bastion: +1 cada ${T.bastion.plantedEvery} s plantado en combate`);
  for (let t = 0; t < 3; t += 0.1) h.tick(0.1);
  p.sinceCombat = T.bastion.combatT + 1; h.tick(T.bastion.plantedEvery + 0.1);
  assert.equal(h.gaugeValue('bastion'), 3, 'bastion: plantado fuera de combate no gana');
  // caminando: −1 cada 2 s (la grieta lo anuncia)
  h.walk({ x: 1, z: 0 }, 1.2);
  v = h.gaugeView(); m = W.bastionModel(v, T);
  assert.ok(v.x.walking && approx(v.x.walkIn, T.bastion.moveLossEvery - 1.2, 0.11), `bastion: caminando, walkIn (${v.x.walkIn})`);
  assert.ok(m.crackIdx === 2 && approx(m.crack, 1 - v.x.walkIn / T.bastion.moveLossEvery, 1e-3) && m.sub.startsWith('caminando'), `bastion: la grieta (${m.crack}, ${m.sub})`);
  h.walk({ x: 1, z: 0 }, 0.9);
  assert.equal(h.gaugeValue('bastion'), 2, `bastion: caminando pierdes 1 cada ${T.bastion.moveLossEvery} s`);
  // con 5: lista la descarga
  d = seqDelta(h, 'bastion', () => h.gauge('bastion', 5));
  v = h.gaugeView(); m = W.bastionModel(v, T);
  assert.ok(v.state === 'full' && m.ready && m.num === '5/5', `bastion full: ${JSON.stringify(m)}`);
  assert.deepEqual(v.ready, ['g_guardia'], 'bastion: con 5, el Cambio de Guardia está listo');
  // descarga a Ariete: onda del 300 % a 5 m y Quebranto a los jefes; 5 s sin llenarse
  const e = h.enemy({ hp: 1e9, pos: [p.pos.x + 3, 0, p.pos.z] }), boss = h.enemy({ hp: 1e9, boss: true, pos: [p.pos.x, 0, p.pos.z + 3] }), far = h.enemy({ hp: 1e9, pos: [p.pos.x + 9, 0, p.pos.z] });
  h.tick(T.bastion.burstAt);                               // la recarga del Cambio de Guardia
  h.gauge('bastion', 5);
  d = seqDelta(h, 'bastion', () => { h.cast('k3'); h.step(0.05); });
  v = h.gaugeView(); m = W.bastionModel(v, T);
  assert.ok(d.spent === 1 && v.value === 0 && v.x.stance === 'ariete', 'bastion: al cambiar a Ariete se gastan todas');
  assert.ok(1e9 - e.hp > 0 && far.hp === 1e9 && approx(boss.stagger || 0, T.bastion.burst.stagger, 1), `bastion: onda a ${T.bastion.burst.radius} m y ${T.bastion.burst.stagger} de Quebranto (${boss.stagger})`);
  assert.ok(v.state === 'active' && v.label === 'Descarga' && v.tMax === T.bastion.lockAfterBurst && v.x.lockT > T.bastion.lockAfterBurst - 0.1, 'bastion: Descarga (x.lockT)');
  assert.ok(m.lock && m.text === 'Sin llenarse' && m.sub.startsWith('Descarga'), `bastion lock: ${JSON.stringify(m)}`);
  hurt(true);
  assert.equal(h.gaugeValue('bastion'), 0, `bastion: ${T.bastion.lockAfterBurst} s sin llenarse`);
  h.tick(T.bastion.lockAfterBurst + 0.1);
  gainGauge(p, 'bastion', 1);
  assert.ok(h.gaugeValue('bastion') === 1 && h.gaugeView().state !== 'active', 'bastion: luego vuelve a llenarse');
  // descarga a Muralla: escudo del 20 % a ti y al aliado más herido
  {
    const g2 = mk('guardian'), q = g2.p;
    const ally = g2.ally(4, 0, 1000), ok = g2.ally(5, 0, 1000);
    ally.hp = 300; ok.hp = 900;
    g2.setSlot('k3', 'g_guardia'); g2.cast('k3'); g2.step(0.05);
    g2.tick(3.1); g2.cast('k3'); g2.step(0.05);            // a Ariete
    g2.tick(3.1); g2.gauge('bastion', 5);
    g2.cast('k3'); g2.step(0.05);                            // a Muralla: descarga
    const mine = (q.shields || []).find(s => s.src === 'bastion');
    assert.ok(mine && approx(mine.amt, Math.round(q.stats.maxHP * T.bastion.burst.shieldPct / 100 * (1 + (q.stats.healPct || 0) / 100)), q.stats.maxHP * 0.01), `bastion: escudo del ${T.bastion.burst.shieldPct} % (${mine?.amt})`);
    assert.ok(ally.shields.some(s => s.src === 'bastion' && approx(s.amt, q.stats.maxHP * T.bastion.burst.shieldPct / 100, 1)) && !ok.shields.length, 'bastion: y al aliado más herido');
  }
  // Inexpugnable 2: 7 cargas a la vista
  {
    const x = mk('guardian', { d28: 2 });
    assert.equal(gaugeMax(x.p, 'bastion'), T.bastion.apexMax);
    x.gauge('bastion', 6);
    const xm = W.bastionModel(x.gaugeView(), T);
    assert.ok(xm.shown.every(Boolean) && xm.num === `6/${T.bastion.apexMax}` && xm.ready, `bastion: Inexpugnable 2 (${JSON.stringify(xm)})`);
  }
}

// ---------------------------------------------------------------- Fervor
function hammer(h, at = [2.5, 0], hold = 1.0) {
  h.setSlot('rmb', 'g_martillo'); h.aim(at[0], at[1]); h.p.mp = 100;
  h.press('rmb'); h.step(hold); h.release('rmb'); h.step(0.05);
}
{
  const h = mk('cruzado'), p = h.p;
  const e = h.enemy({ hp: 1e9, pos: [2.5, 0, 0] });
  let v = h.gaugeView(), m = W.fervorModel(v, T);
  assert.equal(v.id, 'fervor');
  assert.ok(m.n === 0 && m.suns.every(x => !x) && m.beads.length === T.fervor.basicHits && !m.ready && !m.rays && /destello/.test(m.sub), `fervor idle: ${JSON.stringify(m)}`);
  // los Tajos: +1 cada 3 (uno por golpe aunque alcance a varios)
  const tajo = () => { h.hit(e, { skill: 'g_tajo', tags: ['basic', 'melee', 'physical'] }); h.tick(0.1); };
  tajo(); tajo();
  v = h.gaugeView(); m = W.fervorModel(v, T);
  assert.ok(v.x.basicHits === 2 && v.x.basicNeed === T.fervor.basicHits, 'fervor: x.basicHits / basicNeed');
  assert.deepEqual(m.beads, [true, true, false], 'fervor: cuentas de los Tajos');
  let d = seqDelta(h, 'fervor', tajo);
  v = h.gaugeView(); m = W.fervorModel(v, T);
  assert.ok(d.gain === 1 && v.value === 1 && v.x.basicHits === 0 && m.suns[0] && !m.suns[1], `fervor: ${T.fervor.basicHits}.er Tajo → +1`);
  // suelta perfecta: +1 (y detonar en el mismo lanzamiento no da otro)
  h.g.applyMark(e, resolveSkill(p, p.cls.skills.find(s => s.id === 'g_juicio')), p);
  assert.ok(e.marks?.juicio, 'fervor: marca de Juicio puesta');
  hammer(h, [2.5, 0], 1.0);
  assert.ok(!e.marks?.juicio && h.gaugeValue('fervor') === 2, `fervor: suelta perfecta que detona → +${T.fervor.perCastMax} (${h.gaugeValue('fervor')})`);
  // detonar con una suelta normal: +1
  h.step(0.6);
  h.g.applyMark(e, resolveSkill(p, p.cls.skills.find(s => s.id === 'g_juicio')), p);
  d = seqDelta(h, 'fervor', () => hammer(h, [2.5, 0], 0.3));
  v = h.gaugeView(); m = W.fervorModel(v, T);
  assert.ok(d.full === 1 && v.state === 'full' && v.value === 3, 'fervor: detonar una marca → +1 (lleno)');
  assert.ok(m.ready && m.rays && m.wings && m.suns.every(Boolean) && m.text === 'Veredicto listo' && m.num === '3/3' && v.label === 'Veredicto', `fervor full: ${JSON.stringify(m)}`);
  assert.deepEqual(v.ready, ['g_martillo'], 'fervor: el Martillo está listo');
  // Veredicto: al instante, +50 %, cura al más herido y gasta todo; no da Fervor
  h.step(0.6);
  const ally = h.ally(1, 1, 1000); ally.hp = 100;
  const add = firePower('condAdd', p, p, e, { skill: 'g_martillo', tags: new Set(['spender']), elem: 'holy' });
  assert.equal(add, 0, 'fervor: sin Veredicto en curso, sin +50 %');
  const adds = [];
  const roll = p.rollDamage.bind(p);
  p.rollDamage = (coef, cb, a, en, info) => { if (info?.skill === 'g_martillo') adds.push(firePower('condAdd', p, p, en, info || {})); return roll(coef, cb, a, en, info); };
  h.setSlot('rmb', 'g_martillo'); h.aim(2.5, 0); p.mp = 100;
  d = seqDelta(h, 'fervor', () => { h.press('rmb'); h.step(0.05); h.release('rmb'); h.step(0.05); });
  p.rollDamage = roll;
  assert.ok(d.spent === 1 && h.gaugeValue('fervor') === 0, 'fervor: el Veredicto gasta todo');
  assert.ok(adds.length >= 1 && adds[0] === T.fervor.verdict.dmgPct, `fervor: Veredicto +${T.fervor.verdict.dmgPct} % (${adds})`);
  assert.ok(approx(ally.hp - 100, 1000 * T.fervor.verdict.healPct / 100, 12), `fervor: cura un ${T.fervor.verdict.healPct} % al más herido (${ally.hp - 100})`);
  // fuera de combate: −1 cada 10 s
  h.gauge('fervor', 2);
  p.sinceCombat = T.fervor.decayOOC + 1;
  h.tick(T.fervor.decayOOC + 0.2);
  assert.equal(h.gaugeValue('fervor'), 1, `fervor: fuera de combate, −1 cada ${T.fervor.decayOOC} s`);
  v = h.gaugeView();
  assert.ok(v.decayIn != null && v.decayIn <= T.fervor.decayOOC + 1e-9, `fervor: decayIn (${v.decayIn})`);
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
  for (const [, sel, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (/stroke-dashoffset[^;]*\.\d+s|transition:[^;]*stroke-dashoffset/.test(body)) assert.ok(/^\s*\.gz-sed /.test(sel), `A8: stroke-dashoffset solo en la Sed (${sel.trim()})`);
    if (sel.trim().startsWith('@') || /^\s*(from|to|\d+%)/.test(sel)) continue;
    for (const s of sel.split(',')) assert.ok(/^\s*\.gz-(sed|bastion|fervor)[\s.:[]/.test(s), `selector con prefijo .gz-<id>: «${s.trim()}»`);
  }
  assert.ok(!/backdrop-filter/.test(css), 'R4: sin backdrop-filter');
  // las clases que pone update() tienen su regla
  for (const cls of ['boil', 'sated', 'drain', 'muralla', 'ariete', 'planted', 'lock', 'ready', 'burst', 'off', 'rays', 'wings'])
    assert.ok(new RegExp(`\\.${cls}\\b`).test(css), `CSS: regla para .${cls}`);
  assert.ok(!/\.frenzy\b|\.wall\b/.test(css), 'CSS: sin las clases v1 (frenzy, wall)');
}

// ---------------------------------------------------------------- assets de la clase
const ASSETS = ['gz_sed_corazon', 'gz_sed_venas', 'gz_sed_sangre', 'gz_sed_saciada', 'gz_bastion_escudo', 'gz_bastion_escudo_vacio', 'gz_bastion_grieta',
  'gz_bastion_muro', 'gz_fervor_halo', 'gz_fervor_sol', 'gz_fervor_rayos', 'gz_fervor_ascension'];
const src = readFileSync(join(root, 'js', 'ui-gauges-guerrero.js'), 'utf8');
for (const n of ASSETS) {
  assert.ok(existsSync(join(root, 'assets', 'gauges', `${n}.webp`)), `asset ${n}.webp`);
  assert.ok(src.includes(`'${n}'`), `el renderizador usa ${n}`);
}
assert.ok(!/\b(document|window)\./.test(src), 'sin document/window en el módulo (todo pasa por ctx)');
assert.ok(!/offsetWidth|getBoundingClientRect|offsetHeight/.test(src), 'update sin lecturas de layout');
assert.ok(!/g_t_muro|g_t_veredicto|g_ascension|g_desenfreno/.test(src + readFileSync(join(root, 'js', 'mech-guerrero.js'), 'utf8')), 'sin las activas ni los buffs v1');

console.log('✅ Barras del Guerrero (2g): registro, A3, A4, gaugeTuning contra los nodos, model() y mecánica con vistas reales, A8 y assets OK');
