// ============================================================
// Paso 2 (E2, KT-arquera): barras de mecánica de la Arquera — js/mech-arquera.js + js/ui-gauges-arquera.js
// ============================================================
// docs/paso2g-arquera.md §7.0–§7.2 y docs/paso2d2-hud-pc.md §3.7–§3.10, §4 y §7.1:
//  · registro: validateGaugeView = [] para concentracion, coto e impulso (y registrados en el núcleo);
//  · A3: demo con tags idle/building/(full|active)/decay, nodos de su especialización, la demo respeta
//    gaugeTuning() (máximos, ritmos y tiempos: Calma Absoluta, Respiro, Batida, pérdida quieta);
//  · A4: explain(gaugeTuning()) cita los números de T (formato español), sin textos viejos
//    («Tiro Fijado», «Apuntado al instante», «Cepo: recarga»);
//  · mecánica real (arnés): Concentración (15/s, perfectos, Calma, Respiro, de rodillas), Coto
//    (trampas, Racimo como una, Presa, cargas, Batida con su sonido) e Impulso (pérdida quieta, Vendaval);
//  · model() con vistas REALES del arnés en cada estado y world.ground bajo cada Presa;
//  · gaugeView v2 (x y seq: movido de test75) y gaugeTuning contra el texto de los nodos;
//  · A8: css/gauges-arquera.css solo anima transform/opacity y todo selector empieza por .gz-<id>;
//  · headless: el módulo no toca document/window al importarse.
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

assert.equal(typeof globalThis.document, 'undefined');
const A = await import('../js/ui-gauges-arquera.js');
const G = await import('../js/ui-gauges.js');
const { gaugeTuning, gaugeDefs, gaugeSeq, spendGauge } = await import('../js/spec-mechanics.js');
const { firePower } = await import('../js/powers.js');
const { TALENT_TREES } = await import('../js/talents.js');
const { CLASSES } = await import('../js/data.js');
const { resolveSkill } = await import('../js/skill-resolve.js');
const { makeHarness } = await import('./helpers/power-harness.mjs');
const THREE = await import('three');

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const T = gaugeTuning();
// NÚMEROS DEL DOCUMENTO (docs/paso2g-arquera.md §7.0–§7.2), como literales: la mecánica real se mide
// contra ellos, no contra gaugeTuning() (si no, cambiar un número no rompería nada)
const DOC = {
  concentracion: { gainPerSec: 15, losePerSec: 25, critPerPoint: 0.15, max: 100, perfectGain: 15, basicPerfectGain: 3, gainGap: 1,
    calmT: 5, calmLong: 8, calmChargeMul: 1.5, calmLock: 7 },
  coto: { maxArmed: 3, preyT: 15, manada: { elite: 1, trap: 2 }, batida: { n: 3, win: 1, pct: 15, dur: 6, icd: 12 }, trap: { charges: 3, cd: 4, root: 2 } },   // S-arquera (A3): 3 cargas de 4 s
  impulso: { perShot: 3, shotGap: 0.15, galeT: 6, galeAspd: 25, max: 100, galeProj: 1, idleAfter: 2, idleRate: 10 },
};
const V = A.ARQUERA_GAUGE_VIEWS;
const IDS = ['concentracion', 'coto', 'impulso'];
const SPEC = { concentracion: 'francotiradora', coto: 'montaraz', impulso: 'tiradora' };
const es = n => String(Math.round(n * 100) / 100).replace('.', ',');
const approx = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;
const SK = id => CLASSES.arquera.skills.find(s => s.id === id);
let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks++; };
const eq = (a, b, m) => { assert.equal(a, b, m); checks++; };
const mk = (spec, specRanks = {}, choice = {}) => makeHarness({ classId: 'arquera', spec, level: 100, talents: { specRanks, choice } });

// ---------------------------------------------------------------- números congelados (gaugeTuning = documento)
for (const id of IDS) { assert.deepEqual(T[id], DOC[id], `gaugeTuning().${id} = los números del documento`); checks++; }

// ---------------------------------------------------------------- registro
assert.deepEqual(Object.keys(V).sort(), [...IDS].sort(), 'ARQUERA_GAUGE_VIEWS = las 3 mecánicas de la Arquera');
assert.deepEqual(G.gaugeViewErrors(), [], `núcleo sin rechazos: ${G.gaugeViewErrors().join(' | ')}`);
for (const id of IDS) {
  assert.deepEqual(G.validateGaugeView(id, V[id]), [], `${id}: validateGaugeView`);
  ok(!G.gaugeViewFor(id).generic, `${id}: registrado con renderizador propio`);
  ok(typeof V[id].model === 'function', `${id}: model()`);
}

// ---------------------------------------------------------------- A3: demo y nodos
const arq = TALENT_TREES.arquera;
for (const id of IDS) {
  const d = V[id];
  const spec = arq.specs.find(s => s.id === SPEC[id]);
  eq(spec.mechanic, id, `${id}: es la mecánica de ${spec.name}`);
  const treeIds = new Set(spec.nodes.map(n => n.id));
  for (const n of Object.keys(d.nodes)) ok(treeIds.has(n), `${id}: nodo ${n} existe en ${spec.name}`);
  ok(Object.keys(d.nodes).length >= 4, `${id}: al menos 4 nodos que la potencian`);
  for (const [n, txt] of Object.entries(d.nodes)) {
    const node = spec.nodes.find(x => x.id === n);
    const names = node.t === 'c' ? node.opts.map(o => o.name) : [node.name];
    ok(names.some(nm => txt.includes(nm)), `${id}: el texto de ${n} nombra el nodo (${names.join(' / ')})`);
  }
  for (const n of G.demoNodes(d.demo)) ok(n in d.nodes, `${id}: la demo cita ${n}, que falta en nodes`);
  const tags = new Set(d.demo.map(f => f.tag).filter(Boolean));
  for (const t of ['idle', 'building', 'decay']) ok(tags.has(t), `${id}: demo con tag ${t}`);
  ok(tags.has('full') || tags.has('active'), `${id}: demo con full o active`);
  const len = G.demoLength(d.demo);
  ok(len >= 10 && len <= 13.5, `${id}: la demo dura 10–13,5 s (${len})`);
  for (const f of d.demo) if (!f.end) ok(typeof f.cap === 'string' || f.cap === undefined, `${id}: cap de texto`);
  // muestreo a 10 Hz: la vista sintética respeta los máximos de T y el modelo no rompe
  const base = { id, max: typeof gaugeDefs()[id].max === 'number' ? gaugeDefs()[id].max : 100 };
  for (let t = 0; t < len; t += 0.1) {
    const v = G.demoFrameAt(d.demo, t, base).view;
    assert.ok(v.value >= 0 && v.value <= v.max, `${id}: demo t=${t.toFixed(1)} valor ${v.value} ≤ máx ${v.max}`);
    if (v.t != null) assert.ok(v.tMax > 0 && v.t <= v.tMax + 1e-9, `${id}: demo t=${t.toFixed(1)} anillo ${v.t}/${v.tMax}`);
    const m = d.model(v, T);
    assert.ok(m && typeof m.num === 'string' && typeof m.now === 'string', `${id}: model en la demo t=${t.toFixed(1)}`);
    checks += 3;
  }
  for (const tag of tags) eq(G.demoFrameByTag(d.demo, tag, base).view.id, id, `${id}: fotograma ${tag}`);
}
// la demo respeta T: ritmos, máximos y tiempos
{
  const C = T.concentracion, D = V.concentracion.demo, base = { id: 'concentracion', max: 100 };
  const at = t => G.demoFrameAt(D, t, base).view;
  const full = G.demoFrameByTag(D, 'full', base).view;
  ok(full.value === C.max && full.state === 'full' && full.ready.includes('a_t_apuntado'), 'Concentración: demo full = máx. y Disparo Apuntado listo');
  const act = G.demoFrameByTag(D, 'active', base).view;
  ok(act.state === 'active' && act.tMax === C.calmT && act.label === 'Calma Absoluta' && V.concentracion.model(act, T).active, 'Concentración: demo Calma Absoluta 5 s');
  const dec = G.demoFrameByTag(D, 'decay', base).view;
  ok(dec.decaying && dec.x.moving && G.gaugeDataState(dec) === 'decay', 'Concentración: demo decay = moviéndote');
  ok(approx(at(2.5).value - at(1.5).value, C.gainPerSec), `demo: gana +${C.gainPerSec}/s`);
  const fDec = D.find(f => f.tag === 'decay');
  ok(approx(at(fDec.t + 0.2).value - at(fDec.t + 1.2).value, C.losePerSec), `demo: pierde −${C.losePerSec}/s`);
  const rest = D.find(f => f.label === 'Respiro');
  const r = at(rest.t + 0.05);
  ok(r.value === 0 && r.tMax === C.calmLock && V.concentracion.model(r, T).rest, `Concentración: demo Respiro de ${C.calmLock} s a 0`);
  const K = T.coto, KD = V.coto.demo, kb = { id: 'coto', max: K.maxArmed };
  const prey = G.demoFrameByTag(KD, 'prey', kb).view;
  ok(prey.state === 'prey' && prey.tMax === K.preyT && prey.x.preyName, 'Coto: demo de Presa 15 s con nombre');
  const kf = G.demoFrameByTag(KD, 'full', kb).view;
  ok(kf.value === K.maxArmed && kf.max === K.maxArmed, 'Coto: demo full = 3 armadas');
  const ka = G.demoFrameByTag(KD, 'active', kb).view, km = V.coto.model(ka, T);
  ok(ka.state === 'active' && ka.label === 'Batida' && ka.tMax === K.batida.dur && km.batida && km.sub.includes(`+${K.batida.pct} %`), 'Coto: demo Batida 6 s');
  ok(V.coto.model(G.demoFrameByTag(KD, 'decay', kb).view, T).expiring, 'Coto: demo decay = la Presa caduca');
  const I = T.impulso, ID = V.impulso.demo, ib = { id: 'impulso', max: 100 };
  const ia = G.demoFrameByTag(ID, 'active', ib).view;
  ok(ia.state === 'active' && ia.tMax === I.galeT && ia.value === I.max && ia.ready.includes('flecha_multiple'), 'Impulso: demo Vendaval 6 s');
  const idc = G.demoFrameByTag(ID, 'decay', ib).view, im = V.impulso.model(idc, T);
  ok(im.still && im.losing && !im.spinning && im.stop.includes(`−${I.idleRate}/s`), 'Impulso: demo decay = quieta, pierde');
  const iD = ID.find(f => f.tag === 'decay');
  ok(approx(G.demoFrameAt(ID, iD.t + 0.2, ib).view.value - G.demoFrameAt(ID, iD.t + 0.8, ib).view.value, 0.6 * I.idleRate), `demo: quieta pierde −${I.idleRate}/s`);
  const before = ID.filter(f => f.t < iD.t && f.x?.moving === false).pop();
  ok(before && approx(iD.t - before.t, I.idleAfter), `demo: empieza a perder a los ${I.idleAfter} s quieta`);
}

// ---------------------------------------------------------------- A4: explain cita T
for (const id of IDS) {
  const E = V[id].explain(T);
  ok(E.text && E.cols.length === 3 && E.tip.length >= 2 && E.tip.length <= 3, `${id}: explain { text, cols[3], tip[2–3] }`);
  ok(E.cols[0][0] === 'Generar' && E.cols[1][0] === 'Descargar' && ['Pérdida', 'Ventana'].includes(E.cols[2][0]), `${id}: columnas Generar/Descargar/Pérdida|Ventana`);
  const all = [E.text, ...E.cols.flat(), ...E.tip].join(' ');
  ok(!/<(?!\/?b>)/.test(E.text), `${id}: text solo con <b>`);
  ok(!/\d\.\d/.test(all), `${id}: números en formato español (sin punto decimal)`);
}
{
  const C = T.concentracion, all = JSON.stringify(V.concentracion.explain(T));
  for (const s of [`+${C.gainPerSec}/s`, `−${C.losePerSec}/s`, `+${es(C.critPerPoint)} %`, `+${es(C.critPerPoint * C.max)} %`, `Calma Absoluta</b> ${C.calmT} s`,
    `+${C.perfectGain}`, `+${C.basicPerfectGain}`, `Respiro de ${C.calmLock} s`, `×${es(C.calmChargeMul)}`, 'de rodillas'])
    ok(all.includes(s), `A4 Concentración cita «${s}»`);
}
{
  const C = T.coto, B = C.batida, all = JSON.stringify(V.coto.explain(T));
  for (const s of [`máx. ${C.maxArmed}`, `${C.preyT} s`, `${C.trap.cd} s por carga`, `${C.trap.root} s`, `${B.n} trampas en ${B.win} s`, `+${B.pct} %`, `${B.dur} s`, `cada ${B.icd} s`])
    ok(all.includes(s), `A4 Coto cita «${s}»`);
}
{
  const I = T.impulso, all = JSON.stringify(V.impulso.explain(T));
  for (const s of [`suma ${I.perShot}`, `A ${I.max}`, `${I.galeT} s`, `+${I.galeAspd} %`, `más de ${I.idleAfter} s`, `${I.idleRate} por segundo`, `−${I.idleRate}/s`])
    ok(all.includes(s), `A4 Impulso cita «${s}»`);
}
// con otro T el texto cambia: no hay números escritos a mano
{
  const T2 = JSON.parse(JSON.stringify(T));
  T2.concentracion.gainPerSec = 37; T2.concentracion.calmT = 9; T2.coto.preyT = 23; T2.coto.batida.pct = 33; T2.impulso.galeT = 9; T2.impulso.idleRate = 17;
  ok(JSON.stringify(V.concentracion.explain(T2)).includes('+37/s') && JSON.stringify(V.concentracion.explain(T2)).includes('Calma Absoluta</b> 9 s'), 'explain usa T (Concentración)');
  ok(JSON.stringify(V.coto.explain(T2)).includes('23 s') && JSON.stringify(V.coto.explain(T2)).includes('+33 %'), 'explain usa T (Coto)');
  ok(JSON.stringify(V.impulso.explain(T2)).includes('Vendaval</b> 9 s') && JSON.stringify(V.impulso.explain(T2)).includes('−17/s'), 'explain usa T (Impulso)');
}
// textos viejos fuera (docs/paso2g-arquera.md §16.2): ni en la vista ni en la hoja de estilo
{
  const src = readFileSync(join(root, 'js', 'ui-gauges-arquera.js'), 'utf8') + readFileSync(join(root, 'css', 'gauges-arquera.css'), 'utf8');
  for (const old of ['Tiro Fijado', 'Apuntado al instante', 'Cepo: recarga', 'Visión Certera', 'Aliento del Cazador'])
    ok(!src.includes(old), `sin el texto viejo «${old}»`);
  const demoTxt = JSON.stringify(IDS.map(id => [V[id].demo, V[id].nodes, V[id].explain(T)]));
  for (const s of ['Calma Absoluta', 'Batida', 'Respiro']) ok(demoTxt.includes(s), `la barra enseña «${s}»`);
}
// sonidos: tonos existentes de sfx.js, solo full/spent
const sfxSrc = readFileSync(join(root, 'js', 'sfx.js'), 'utf8');
for (const id of IDS) for (const [ev, tone] of Object.entries(V[id].sounds || {})) {
  ok(['full', 'spent'].includes(ev), `${id}: sonido de ${ev}`);
  ok(new RegExp(`\\b${tone}\\s*:`).test(sfxSrc), `${id}: el tono ${tone} existe en sfx.js`);
}
ok(/\bverb_hunt\s*:/.test(sfxSrc), 'la Batida suena con verb_hunt (existe en sfx.js)');

// ---------------------------------------------------------------- mecánica real + model(): Concentración
{
  const C = DOC.concentracion;
  const h = mk('francotiradora');
  const p = h.p;
  let v = h.gaugeView(), m = V.concentracion.model(v, T);
  ok(m.k === 0 && m.offset === 9 && !m.locked && !m.moving && m.num === '0' && m.sub === 'Quédate quieta para apuntar', `idle: retícula abierta (${JSON.stringify(m)})`);
  h.tick(2);
  v = h.gaugeView(); m = V.concentracion.model(v, T);
  ok(approx(v.value, 2 * C.gainPerSec, 0.01), `quieta +${C.gainPerSec}/s (${v.value})`);
  ok(v.state === 'building' && m.k > 0 && m.offset < 9 && m.hint === `Quieta +${C.gainPerSec}/s`, 'building: esquineras cerrándose');
  eq(m.crit, `+${(v.value * C.critPerPoint).toFixed(1).replace('.', ',')} % crít`, 'texto de crítico');
  ok(approx(v.x.critPct, v.value * C.critPerPoint, 0.01), 'x.critPct');
  // moverte la vacía (−25/s)
  const v0 = v.value;
  h.walk({ x: 1, z: 0 }, 1);
  p.moving = true;
  v = h.gaugeView(); m = V.concentracion.model(v, T);
  // (a 10 Hz: el primer tic puede caer antes de echar a andar)
  ok(v0 - v.value <= C.losePerSec + 1e-6 && v0 - v.value >= C.losePerSec * 0.9 - 1e-6, `moviéndote −${C.losePerSec}/s (${v0} → ${v.value})`);
  ok(G.gaugeDataState(v) === 'decay' && m.losing && m.sub === 'Se pierde al moverte' && m.hint.includes(`−${C.losePerSec}/s`), 'decay: MOVIÉNDOTE');
  // de rodillas: moverte no la vacía
  p.moving = false;
  h.setSlot('k2', 'a_f_rodilla'); h.aim(0, 0); h.cast('k2'); h.step(0.1);
  const vk = h.gaugeValue('concentracion');
  h.walk({ x: 1, z: 0 }, 0.5);
  p.moving = true;
  v = h.gaugeView(); m = V.concentracion.model(v, T);
  ok(h.gaugeValue('concentracion') >= vk && v.x.kneeling && m.kneeling && !m.losing && !v.decaying, 'de rodillas: moverte no la vacía');
  p.moving = false;
  // perfecto de Disparo Apuntado: +15 (uno por segundo); del básico: +3
  // (sin la ganancia quieta: tv.focusRate −100, para medir solo los perfectos). Con el catálogo y la
  // forja REALES: a Nv100 va con la Mejora (Tensado Rápido), así que se suelta en el centro de SU
  // ventana dorada; y por debajo de su mínimo (0,3 s) soltar cancela sin coste (W2d-A)
  const b = makeHarness({ classId: 'arquera', spec: 'francotiradora', level: 100, tv: { focusRate: -100 } }), e = b.enemy({ hp: 1e7, pos: [6, 0, 0] });
  const ap = resolveSkill(b.p, SK('a_t_apuntado')).charge;
  const win = (ap.perfect[0] + ap.perfect[1]) / 2 / ap.speed;
  ok(ap.min === 0.3 && ap.perfect[1] < 1.25, `la ventana real de Disparo Apuntado (${ap.perfect.join('–')} s; la de antes de la forja acababa en 1,35)`);
  b.setSlot('k3', 'a_t_apuntado'); b.aim(6, 0);
  b.hold('k3', 0.2); b.step(0.8);
  ok(b.gaugeValue('concentracion') === 0 && b.g._chargeEnd?.reason === 'early' && !(b.p.cds.a_t_apuntado > 0) && b.p.mp === b.p.stats.maxMP,
    'soltar antes del mínimo: ni dispara, ni gasta, ni recarga');
  b.hold('k3', win); b.step(0.8);
  eq(b.gaugeValue('concentracion'), C.perfectGain, `perfecto de Disparo Apuntado: +${C.perfectGain}`);
  b.g.reduceCooldown(b.p, 'a_t_apuntado', Infinity);
  b.hold('k3', win); b.step(0.8);
  eq(b.gaugeValue('concentracion'), 2 * C.perfectGain, 'otro perfecto (más de 1 s después): +15');
  b.g.reduceCooldown(b.p, 'a_t_apuntado', Infinity);
  b.hold('k3', 0.6); b.step(0.8);
  eq(b.gaugeValue('concentracion'), 2 * C.perfectGain, 'sin perfecto, nada');
  b.g.reduceCooldown(b.p, 'a_t_apuntado', Infinity);
  b.hold('k3', 1.25); b.step(0.8);
  eq(b.gaugeValue('concentracion'), 2 * C.perfectGain, 'a 1,25 s (pasada la ventana real), nada');
  b.setSlot('lmb', 'a_disparo');
  b.hold('lmb', 0.9); b.step(0.5);
  eq(b.gaugeValue('concentracion'), 2 * C.perfectGain + C.basicPerfectGain, `perfecto del básico: +${C.basicPerfectGain}`);
  // una ganancia de perfecto por segundo como mucho: perfectos del básico (⑦ onCast) a 0, 0,5 y 1,1 s
  {
    const q = makeHarness({ classId: 'arquera', spec: 'francotiradora', level: 100, tv: { focusRate: -100 } });
    const perfectBasic = () => firePower('onCast', q.p, q.g, q.p, { sk: SK('a_disparo'), weapon: true, perfect: true, charge: { t: 0.9, frac: 0.9 } });
    perfectBasic();
    eq(q.gaugeValue('concentracion'), 3, 'perfecto del básico: +3');
    q.step(0.5); perfectBasic();
    eq(q.gaugeValue('concentracion'), 3, 'otro a los 0,5 s: nada (uno por segundo)');
    q.step(0.6); perfectBasic();
    eq(q.gaugeValue('concentracion'), 6, 'a los 1,1 s: otra vez +3');
  }
  // a 100: CALMA ABSOLUTA (5 s; perfecto desde media carga; Apuntado y haces ×1,5) y luego RESPIRO
  const sp0 = resolveSkill(h.p, SK('a_t_apuntado')).charge.speed;
  h.gauge('concentracion', 100);
  v = h.gaugeView(); m = V.concentracion.model(v, T);
  ok(v.state === 'active' && v.label === 'Calma Absoluta' && v.tMax === C.calmT && v.x.calmT === C.calmT && v.x.visionT === C.calmT, 'Calma Absoluta 5 s');
  assert.deepEqual(v.ready, ['a_t_apuntado', 'a_u_celeste'], 'Calma: Apuntado y Tiro Celestial listos'); checks++;
  ok(m.active && m.eye && m.hint === 'Todo tensado es perfecto', 'model: Calma');
  ok(p.stats.perfectAlways > 0 || p.powerStats?.perfectAlways > 0, 'Calma: perfecto desde media carga (perfectAlways)');
  ok(approx(resolveSkill(p, SK('a_t_apuntado')).charge.speed / sp0, C.calmChargeMul, 1e-6), `Calma: se tensa ×${C.calmChargeMul}`);
  h.walk({ x: 1, z: 0 }, 0.5);
  eq(h.gaugeValue('concentracion'), 100, 'Calma: moverte no la vacía');
  h.tick(C.calmT);
  v = h.gaugeView(); m = V.concentracion.model(v, T);
  ok(v.value === 0 && v.label === 'Respiro' && v.x.lockT > 0 && m.rest && m.sub === 'Respiro', 'al acabar: a 0 y Respiro');
  ok(!(p.stats.perfectAlways > 0) && !p.buffs.some(x => x.id === 'f_calma'), 'sin Calma, sin perfecto gratis');
  h.tick(C.calmLock - 1);
  eq(h.gaugeValue('concentracion'), 0, `Respiro: ${C.calmLock} s sin ganar`);
  h.tick(1.5);
  ok(h.gaugeValue('concentracion') > 0, 'tras el Respiro vuelve a ganar');
  // Ojo Inmóvil: Calma de 8 s
  const o = mk('francotiradora', { f28: 1 });
  o.gauge('concentracion', 100);
  eq(o.gaugeView().tMax, C.calmLong, `Ojo Inmóvil: Calma de ${C.calmLong} s`);
}

// ---------------------------------------------------------------- Coto de Caza
{
  const K = DOC.coto, B = K.batida;
  const h = mk('montaraz');
  const p = h.p;
  let v = h.gaugeView(), m = V.coto.model(v, T);
  ok(m.n === 0 && m.max === K.maxArmed && m.slots[0].st === 'ready' && !m.prey && m.name === 'sin Presa' && m.num === '0/3', `idle: huellas vacías (${JSON.stringify(m.slots)})`);
  ok(v.x.trapCharges === K.trap.charges && v.x.trapChargesMax === K.trap.charges && v.x.trapCdFrac === 0, 'cargas de Trampa de Cepo listas');
  // un cepo de verdad: gasta una carga y se arma en su tiempo de armado (el de la forja real: a Nv100,
  // Muelles Firmes, 0,2 s en lugar de 0,5 s)
  const armT = resolveSkill(p, SK('a_t_cepo')).def.trap.armT;
  ok(armT > 0 && armT < 0.5, `armado de la forja real (${armT} s)`);
  h.setSlot('k3', 'a_t_cepo'); h.aim(-4, 0); h.cast('k3');
  h.step(armT / 2);
  eq(h.gaugeValue('coto'), 0, 'el cepo aún no está armado');
  h.step(0.6 - armT / 2);
  v = h.gaugeView(); m = V.coto.model(v, T);
  ok(v.value === 1 && v.x.trapCharges === K.trap.charges - 1 && v.x.trapCdFrac > 0 && m.slots[0].st === 'armed', 'armado: 1 y la carga se recarga');
  h.tick(2);
  ok(approx(h.gaugeView().x.trapCdFrac, (0.6 + 2) / K.trap.cd, 0.02), `x.trapCdFrac = progreso de la recarga (${h.gaugeView().x.trapCdFrac})`);
  // un Racimo cuenta como una trampa (data.cluster)
  const spawn = (x, z, cluster) => h.g.spawnField('trampa', { pos: new THREE.Vector3(x, 0, z), radius: 1.5, dur: 20, owner: p, data: { dmg: 1, cluster, armT: 0 } });
  spawn(-6, 3, 77); spawn(-6, 4.3, 77); spawn(-7, 3.6, 77);
  h.tick(0.1);
  eq(h.gaugeValue('coto'), 2, 'un Racimo (3 cepos) cuenta 1');
  spawn(-8, -4); spawn(-9, -5);
  h.tick(0.1);
  v = h.gaugeView(); m = V.coto.model(v, T);
  ok(v.value === K.maxArmed && m.full && m.sub === 'Coto completo', `tope ${K.maxArmed}`);
  // Presa: el primer élite que golpeas
  const el = h.enemy({ hp: 1000, rank: 'elite', pos: [6, 0, 0] });
  el.def = { ...el.def, name: 'Bestia Alfa' };
  h.hit(el, { tags: ['proj'] });
  el.hp = 600;
  v = h.gaugeView(); m = V.coto.model(v, T);
  ok(v.state === 'prey' && v.x.preyName === 'Bestia Alfa' && v.x.preyHpPct === 60 && v.tMax === K.preyT && v.x.preys === 1, 'Presa: nombre, vida y 15 s');
  ok(m.prey && m.name === 'Bestia Alfa' && m.hp === 0.6 && /Presa · Bestia Alfa · 15,0 s/.test(m.sub), `model: medallón (${m.sub})`);
  eq(v.x.preyTrapped, false);
  el.rootT = 2;
  ok(h.gaugeView().x.preyTrapped && V.coto.model(h.gaugeView(), T).trapped, 'Presa atrapada');
  el.rootT = 0;
  const gr = V.coto.world.ground(el, p);
  ok(gr && gr.asset === 'gz_coto_marca_suelo' && gr.blend === 'additive' && gr.tMax === K.preyT && !gr.trapped && gr.radius > 0, `world.ground de la Presa (${JSON.stringify(gr)})`);
  const other = h.enemy({ hp: 500, pos: [0, 0, 6] });
  eq(V.coto.world.ground(other, p), null, 'world.ground: null si no es Presa');
  eq(V.coto.world.ground(null, p), null);
  h.tick(13);
  ok(V.coto.model(h.gaugeView(), T).expiring && V.coto.world.ground(el, p).expiring, 'la Presa caduca (< 3 s)');
  h.tick(2.2);
  ok(h.gaugeView().state !== 'prey' && !el.prey && V.coto.world.ground(el, p) === null, `la Presa dura ${K.preyT} s sin golpearla`);
  // BATIDA: 3 estallidos en 1 s → +15 % de daño recibido 6 s a los alcanzados y a la Presa (cada 12 s)
  const w = mk('montaraz'), boss = w.enemy({ hp: 1e7, boss: true, pos: [5, 0, 0] });
  w.hit(boss, { tags: ['proj'] });
  const put = (x, z) => { if (!(w.p.skCharges?.a_t_cepo?.n > 0) && w.p.skCharges?.a_t_cepo) w.g.reduceCooldown(w.p, 'a_t_cepo', Infinity); w.p.mp = w.p.stats.maxMP; w.setSlot('k3', 'a_t_cepo'); w.aim(x, z); w.cast('k3'); w.step(0.7); };
  const det = () => { w.p.mp = w.p.stats.maxMP; w.setSlot('rmb', 'a_m_detonante'); w.aim(5, 0); w.cast('rmb'); w.step(0.6); };
  put(5, 2.4); put(5, -2.4);
  det();
  ok(!boss.debuffs?.coto_batida && w.sfxCount('verb_hunt') === 0, 'dos estallidos no bastan');
  w.tick(1.2);
  put(5, 2.4); put(5, -2.4); put(7.4, 0);
  det();
  v = w.gaugeView(); m = V.coto.model(v, T);
  ok(boss.debuffs?.coto_batida?.pct === B.pct && boss.debuffs.coto_batida.t > B.dur - 0.7, `Batida: +${B.pct} % ${B.dur} s`);
  eq(w.sfxCount('verb_hunt'), 1, 'Batida: suena verb_hunt');
  ok(v.state === 'active' && v.label === 'Batida' && v.tMax === B.dur && v.x.batidaT > 0 && m.batida && m.sub === `¡Batida! +${B.pct} % de daño recibido`, 'barra: Batida');
  put(5, 2.4); put(5, -2.4); put(7.4, 0);
  det();
  eq(w.sfxCount('verb_hunt'), 1, `Batida: una cada ${B.icd} s`);
  ok(w.gaugeView().x.batidaIn > 0, 'x.batidaIn: cuánto falta para otra');
  // Corazón del Bosque 3: con 2 estallidos
  const c = mk('montaraz', { m28: 3 }), cb = c.enemy({ hp: 1e7, boss: true, pos: [5, 0, 0] });
  c.hit(cb, { tags: ['proj'] });
  for (const [x, z] of [[5, 2.4], [5, -2.4]]) { c.p.mp = c.p.stats.maxMP; c.setSlot('k3', 'a_t_cepo'); c.aim(x, z); c.cast('k3'); c.step(0.7); }
  c.p.mp = c.p.stats.maxMP; c.setSlot('rmb', 'a_m_detonante'); c.aim(5, 0); c.cast('rmb'); c.step(0.6);
  ok(cb.debuffs?.coto_batida?.pct === B.pct && c.sfxCount('verb_hunt') === 1, 'Corazón del Bosque 3: Batida con 2');
}

// ---------------------------------------------------------------- Impulso
{
  const I = DOC.impulso;
  const h = mk('tiradora');
  const p = h.p, e = h.enemy({ hp: 1e7 });
  let v = h.gaugeView(), m = V.impulso.model(v, T);
  ok(m.still && !m.spinning && m.lit === 0 && m.feathers.every(f => f === 'off') && m.sub === 'Muévete y dispara', 'idle: rosa quieta, ¡MUÉVETE!');
  p.moving = true;
  h.hit(e, { tags: ['proj'], skill: 'a_disparo' });
  eq(h.gaugeValue('impulso'), I.perShot, `+${I.perShot} por acierto en movimiento`);
  h.hit(e, { tags: ['proj'], skill: 'a_disparo' });
  eq(h.gaugeValue('impulso'), I.perShot, `uno cada ${I.shotGap} s`);
  m = V.impulso.model(h.gaugeView(), T);
  ok(m.spinning && !m.still && m.speed === 1 && m.feathers[0] === 'half', 'building: gira lento, media pluma');
  p.moving = false;
  h.hit(e, { tags: ['proj'], skill: 'a_disparo' });
  eq(h.gaugeValue('impulso'), I.perShot, 'quieta no gana');
  // quieta más de 2 s: −10/s
  h.walk({ x: 1, z: 0 }, 0.2);
  h.gauge('impulso', 50);
  h.stand(I.idleAfter - 0.3);
  v = h.gaugeView();
  ok(v.value === 50 && !v.decaying && v.x.idleIn > 0 && v.x.still > 0, `quieta menos de ${I.idleAfter} s: no pierde`);
  h.stand(0.5);
  const q0 = h.gaugeValue('impulso');
  h.stand(1);
  v = h.gaugeView(); m = V.impulso.model(v, T);
  ok(q0 < 50 && Math.abs((q0 - v.value) - I.idleRate) <= 1.01, `quieta más de ${I.idleAfter} s: −${I.idleRate}/s (${q0} → ${v.value})`);
  ok(v.decaying && v.x.idleIn === 0 && m.losing && m.sub === `Quieta: −${I.idleRate}/s`, 'model: quieta, pierde');
  ok(G.gaugeDataState(v) === 'decay', 'decay: pierde quieta');
  h.walk({ x: 1, z: 0 }, 0.5);
  const after = h.gaugeValue('impulso');
  h.walk({ x: 1, z: 0 }, 0.5);
  eq(h.gaugeValue('impulso'), after, 'moviéndote no pierde');
  // A 100: VENDAVAL (6 s, +25 % vel. de ataque, +1 flecha a Flecha Múltiple)
  const aspd = p.stats.aspdPct, proj = resolveSkill(p, SK('flecha_multiple')).proj;
  h.gauge('impulso', 100);
  v = h.gaugeView(); m = V.impulso.model(v, T);
  ok(v.state === 'active' && v.tMax === I.galeT && v.hold === true && v.x.galeExt === 0, `Vendaval ${I.galeT} s`);
  assert.deepEqual(v.ready, ['flecha_multiple'], 'Vendaval: Flecha Múltiple potenciada'); checks++;
  ok(p.stats.aspdPct === aspd + I.galeAspd && resolveSkill(p, SK('flecha_multiple')).proj === proj + I.galeProj, 'Vendaval: +25 % y +1 flecha');
  ok(m.active && m.speed === 4 && m.feathers.every(f => f === 'on') && m.line1.includes(`+${I.galeAspd} %`) && m.line2.includes('Flecha Múltiple'), 'model: Vendaval');
  h.stand(3);
  eq(h.gaugeValue('impulso'), 100, 'el Vendaval no pierde quieta');
  h.tick(I.galeT);
  ok(h.gaugeValue('impulso') === 0 && !p.buffs.some(b => b.id === 't_vendaval'), 'al acabar: a 0');
  // Vendaval Largo (v2: +1 s/rango) y Vendaval Encadenado (x.galeExt)
  const l = mk('tiradora', { v2: 2 });
  l.gauge('impulso', 100);
  ok(l.gaugeView().tMax === I.galeT + 2 && l.gaugeView().x.galeExt === 0, 'Vendaval Largo r2: 8 s (no es prórroga)');
  const c = mk('tiradora', { v19: 2 });
  c.gauge('impulso', 100);
  c.setSlot('k3', 'a_t_andanada'); c.aim(6, 0); c.cast('k3'); c.step(0.5); c.p.mp = c.p.stats.maxMP; c.cast('k3'); c.step(0.1);
  v = c.gaugeView();
  ok(approx(v.x.galeExt, 1, 0.01) && approx(v.tMax, I.galeT + 1, 0.01), `Vendaval Encadenado: x.galeExt = 1 (${v.x.galeExt})`);
  ok(V.impulso.model(v, T).now.includes('Vendaval Encadenado'), 'model: la prórroga se nombra');
}

// ---------------------------------------------------------------- gaugeView v2 (movido de test75): x y seq
{
  const X_KEYS = {
    concentracion: ['moving', 'critPct', 'visionT', 'visionMax', 'kneeling', 'calmT', 'calmMax', 'lockT', 'lockMax'],
    coto: ['preyName', 'preyHpPct', 'trapCharges', 'trapChargesMax', 'trapCdFrac', 'preyTrapped', 'preys', 'batidaT', 'batidaMax', 'batidaIn'],
    impulso: ['moving', 'galeExt', 'still', 'idleIn'],
  };
  function seqDelta(h, id, fn) {
    const a = { ...gaugeSeq(h.p, id) };
    fn();
    const b = h.gaugeView().seq;
    return { gain: b.gain - a.gain, full: b.full - a.full, spent: b.spent - a.spent, empty: b.empty - a.empty };
  }
  for (const id of IDS) {
    const h = mk(SPEC[id]);
    const v = h.gaugeView();
    eq(v.id, id, `${SPEC[id]}: su barra`);
    for (const k of X_KEYS[id]) ok(k in v.x, `${id}: x.${k}`);
  }
  // Concentración: gain quieta, full a 100, empty al acabar la Calma
  {
    const h = mk('francotiradora');
    let d = seqDelta(h, 'concentracion', () => h.tick(1));
    ok(d.gain >= 1, 'Concentración: gain quieta');
    d = seqDelta(h, 'concentracion', () => h.gauge('concentracion', 100));
    eq(d.full, 1, 'Concentración: full a 100');
    d = seqDelta(h, 'concentracion', () => h.tick(T.concentracion.calmT + 0.2));
    eq(d.empty, 1, 'Concentración: empty al acabar la Calma');
  }
  // Coto (derivado): gain al armar, full con 3, spent + empty al caer
  {
    const h = mk('montaraz'), p = h.p;
    const spawn = x => h.g.spawnField('trampa', { pos: new THREE.Vector3(x, 0, 0), radius: 1.5, dur: 20, owner: p, data: { dmg: 1, armT: 0 } });
    h.tick(0.1);                                     // el valor derivado se observa (la primera vez no cuenta)
    let d = seqDelta(h, 'coto', () => { spawn(3); h.tick(0.1); });
    eq(d.gain, 1, 'Coto: gain al armar una trampa');
    d = seqDelta(h, 'coto', () => { spawn(5); spawn(7); h.tick(0.1); });
    ok(d.gain === 1 && d.full === 1, `Coto: gain + full con 3 armadas (${JSON.stringify(d)})`);
    d = seqDelta(h, 'coto', () => { for (const f of h.g.fields) f.dead = true; h.tick(0.1); });
    ok(d.spent === 1 && d.empty === 1, 'Coto: spent + empty al caer');
  }
  // Impulso: gain en movimiento, full → Vendaval, empty al terminar
  {
    const h = mk('tiradora'), e = h.enemy({ hp: 1e6 });
    let d = seqDelta(h, 'impulso', () => { h.p.moving = true; h.hit(e, { tags: ['proj'], skill: 'a_disparo' }); });
    eq(d.gain, 1, 'Impulso: gain por disparo en movimiento');
    d = seqDelta(h, 'impulso', () => h.gauge('impulso', 100));
    eq(d.full, 1, 'Impulso: full → Vendaval');
    d = seqDelta(h, 'impulso', () => h.tick(T.impulso.galeT + 0.5));
    eq(d.empty, 1, 'Impulso: empty al terminar el Vendaval');
    spendGauge(h.p, 'impulso', 0);
  }
}

// ---------------------------------------------------------------- gaugeTuning: única fuente (texto de los nodos)
{
  const text = (spec, id, r = 1) => {
    const n = TALENT_TREES.arquera.specs.find(s => s.id === spec).nodes.find(x => x.id === id);
    return typeof n.d === 'function' ? n.d(r) : n.d;
  };
  const has = (txt, ...bits) => bits.every(b => txt.includes(b));
  const C = DOC.concentracion, K = DOC.coto, B = K.batida, I = DOC.impulso;
  ok(has(text('tiradora', 'v0'), `${I.perShot} de Impulso`, `A ${I.max}`, `Vendaval ${I.galeT} s`, `+${I.galeAspd} %`, `+${I.galeProj} flecha`), 'v0 Impulso');
  ok(has(text('tiradora', 'v2'), `${I.galeT + 1} s (antes ${I.galeT} s)`), 'v2 Vendaval Largo');
  ok(has(text('tiradora', 'v28', 3), `${I.max - 20} de Impulso`), 'v28 r3: salta a 80');
  ok(has(text('francotiradora', 'f0'), `+${C.gainPerSec} de Concentración por segundo`, `+${C.perfectGain}`, `A ${C.max}: Calma Absoluta ${C.calmT} s`), 'f0 Mira Serena');
  ok(has(text('francotiradora', 'f28'), `${C.calmLong} s (antes ${C.calmT} s)`), 'f28 Ojo Inmóvil: Calma de 8 s');
  ok(has(text('francotiradora', 'f28', 3), `${C.max - 20} de Concentración`), 'f28 r3: salta a 80');
  ok(has(text('montaraz', 'm0'), `hasta ${K.maxArmed}`, `estallan ${B.n}`, `+${B.pct} %`, `${B.dur} s`, `cada ${B.icd} s`), 'm0 Coto de Caza');
  ok(has(text('montaraz', 'm1'), `(antes ${K.trap.cd} s)`), 'm1 Muelles Ligeros');
  ok(has(text('montaraz', 'm23'), `${B.dur + 1} s (antes ${B.dur} s)`, '10 de Quebranto'), 'm23 Batida Mayor');
  ok(has(text('montaraz', 'm28', 3), `con ${B.n - 1} trampas (antes ${B.n})`), 'm28 r3: Batida con 2');
}

// ---------------------------------------------------------------- A8 y prefijos de la CSS
const cssPath = join(root, 'css', 'gauges-arquera.css');
ok(existsSync(cssPath), 'css/gauges-arquera.css existe');
const css = readFileSync(cssPath, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const kfRe = /@keyframes\s+([\w-]+)\s*\{/g;
let km;
while ((km = kfRe.exec(css))) {
  ok(/^gz-(concentracion|coto|impulso)-/.test(km[1]), `keyframes con prefijo gz-<id>-: ${km[1]}`);
  let depth = 1, i = kfRe.lastIndex;
  while (depth && i < css.length) { if (css[i] === '{') depth++; else if (css[i] === '}') depth--; i++; }
  for (const [, prop] of css.slice(kfRe.lastIndex, i - 1).matchAll(/([a-z-]+)\s*:/g)) ok(['transform', 'opacity'].includes(prop), `A8: @keyframes ${km[1]} anima ${prop}`);
}
for (const [, val] of css.matchAll(/transition(?:-property)?\s*:\s*([^;}]+)/g))
  for (const part of val.split(',')) ok(['transform', 'opacity', 'none'].includes(part.trim().split(/\s+/)[0]), `A8: transition de ${part.trim()}`);
const noKf = css.replace(/@keyframes[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '');
for (const [, sel] of noKf.matchAll(/([^{}]+)\{[^{}]*\}/g))
  for (const s of sel.split(',').map(x => x.trim()).filter(Boolean)) ok(/^\.gz-(concentracion|coto|impulso)\b/.test(s), `selector con prefijo .gz-<id>: «${s}»`);
ok(!/backdrop-filter/.test(css), 'sin backdrop-filter');
// clases nuevas de la Calma, el Respiro, la Batida y la pérdida quieta: con regla en la hoja
for (const cls of ['cz-rest', 'cz-kneel', 'ct-batida', 'ct-hasprey', 'im-losing']) ok(css.includes(`.${cls}`), `css: .${cls}`);

// assets de la clase (piel)
for (const a of ['gz_conc_anillo', 'gz_conc_esquinera', 'gz_conc_fijado', 'gz_coto_cepo', 'gz_coto_cepo_vacio', 'gz_coto_presa',
  'gz_coto_marca_suelo', 'gz_impulso_rosa', 'gz_impulso_pluma', 'gz_impulso_vendaval'])
  ok(existsSync(join(root, 'assets', 'gauges', `${a}.webp`)), `asset ${a}.webp`);

// headless (textual): sin document/window en el módulo
const src = readFileSync(join(root, 'js', 'ui-gauges-arquera.js'), 'utf8');
ok(!/\bdocument\./.test(src) && !/\bwindow\./.test(src), 'ui-gauges-arquera.js: sin document/window');

console.log(`✅ Barras de mecánica de la Arquera: registro, demo, explain, mecánica real, model(), x/seq, gaugeTuning y A8 OK · ${checks} comprobaciones`);
