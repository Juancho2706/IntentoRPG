// ============================================================
// S-GUERRERO · LA SENSACIÓN DE LAS HABILIDADES DEL GUERRERO (hallazgos recomendados de la auditoría)
// ============================================================
// Cada apartado prueba un hallazgo y falla sin su arreglo (cada uno por separado: un apartado roto no
// tapa a los demás; al final, exit 1 si alguno falla):
//   G01+F1  Remolino: golpea al empezar, rampa +15 %/s hasta +45 %; Danza Carmesí sube el tope
//   G02     el giro: campo que sigue al héroe con el radio real, «whoosh», gotas por golpe, pose
//   G04     Cataclismo: detona TODAS las marcas de su radio, gasta el Fervor (+25 %/punto), su suelta
//           perfecta llama al Martillo Celestial (z26); golpe máximo acotado (la columna arde en pulsos)
//   G05     Cataclismo: mira con el radio real (dorada en la ventana) y luz en el héroe que sube;
//           columna, anillo de choque, congelado 120 ms, sacudida 0,8 y suelo con motas y borde
//   G06     sello de Juicio sobre la barra de vida (parpadea al caducar), estado en el marco y
//           destello «¡Juicio!» al detonar
//   G07     Juicio: marca de +150 % (la detona también la definitiva), +1 de Fervor, al instante y
//           sin coste; las marcas de Sello del Martillo y Edicto valen +100 %
//   G08     golpe pesado por habilidad (Hendidura, Rajar 3.º, Martillo cargado, Terremoto, Salto, Cataclismo)
//   G09     réplicas del Terremoto que se ven y sacuden a la mitad
//   G10     Carga de Escudo a 8 m/s (mín. 0,3 s), +15 % por arrastrado (hasta +60 %), anillo y estela
//   G13     Embestida en 0,2 s con estela continua e impacto
//   F2      Montaña Viva: las réplicas aturden sin rendimientos decrecientes
//   F3      Estampida Sin Fin: la cadena que abre el Salto recargado deja Vulnerable 3 s
import assert from 'node:assert/strict';
import { makeHarness } from './helpers/power-harness.mjs';
import { resolveSkill } from '../js/skill-resolve.js';
import { SKILL_FX_PRESETS } from '../js/fx-skills.js';
import { enemyStatuses } from '../js/hud-model.js';
import { worldMarksPlan } from '../js/world-marks.js';
// las APIs nuevas por espacio de nombres: sin ellas (código de antes) falla su apartado, no la carga
import * as PG from '../js/powers-guerrero.js';
import * as UG from '../js/ui-gauges-guerrero.js';

const fails = [];
let checks = 0;
const ok = (c, m) => { checks++; assert.ok(c, m); };
const eq = (a, b, m) => { checks++; assert.equal(a, b, m); };
const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol;
function section(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (e) { fails.push(name); console.error(`✗ ${name}\n    ${e.message.split('\n')[0]}`); }
}
const WEAPON = { kind: 'item', slot: 'weapon', name: 'Arma de prueba', dmg: [1000, 1000], affixes: {}, quality: 0 };
// héroe con arma fija y sin críticos (golpe constante)
function hero(level, spec = null, opts = {}) {
  const h = makeHarness({ classId: 'guerrero', level, spec, seed: 7, ...(opts.talents ? { talents: opts.talents } : {}) });
  h.p.equipment.weapon = { ...WEAPON };
  if (opts.forge) h.p.skillForge = { ...opts.forge };
  h.p.recompute();
  h.p.hp = h.p.stats.maxHP; h.p.mp = h.p.stats.maxMP;
  h.p.combatRng = () => 0.999;
  return h;
}
// golpes directos que recibe un enemigo (quieto ante el retroceso)
function foe(h, x, z = 0, extra = {}) {
  const e = h.enemy({ hp: 1e9, pos: [x, 0, z], ...extra });
  const t = { n: 0, list: [] };
  const td = e.takeDamage.bind(e);
  e.takeDamage = (a, c, o = {}) => {
    const px = e.pos.x, pz = e.pos.z;
    const d = td(a, c, o) || 0;
    e.pos.x = px; e.pos.z = pz;
    if (!o.dot && !o.proc) { t.n++; t.list.push(d); }
    return d;
  };
  e.t = t;
  return e;
}
// espías de la sensación (el arnés no dibuja, no congela ni sacude)
const fxKey = x => (typeof x === 'string' ? x : Object.keys(SKILL_FX_PRESETS).find(k => SKILL_FX_PRESETS[k] === x) || null);
function spy(h) {
  const log = { stops: [], shakes: [], fx: [], rings: [], texts: [] };
  h.g.hitStop = ms => log.stops.push(ms);
  h.g.addShake = a => log.shakes.push(a);
  h.g.emitFx = (preset, pos) => log.fx.push({ k: fxKey(preset), pos, t: h.p.simT || 0 });
  h.g.spawnRing = (pos, r, c) => log.rings.push({ x: pos.x, z: pos.z, r, c });
  h.g.ui.spawnText = (pos, txt) => log.texts.push(String(txt));
  log.count = k => log.fx.filter(f => f.k === k).length;
  return log;
}
const sk = (h, id) => h.p.cls.skills.find(s => s.id === id);
const prof = (h, id) => resolveSkill(h.p, sk(h, id));
const fields = (h, kind) => (h.g.fields || []).filter(f => f.kind === kind && !f.dead);
// golpes de una habilidad que pasan por ⑤ (sin DoT ni procs)
function hitLog(h, id) {
  const list = [];
  const oph = h.g.onPlayerHit.bind(h.g);
  h.g.onPlayerHit = (e, hit) => { if (hit?.skill === id && !hit.dot && !hit.proc) list.push({ e, dealt: hit.dealt || 0, echo: !!hit.echo, t: h.p.simT || 0 }); return oph(e, hit); };
  return list;
}

// ------------------------------------------------ G01 + F1 · Remolino
section('G01 · el Remolino golpea al pulsar (sin esperar el primer giro) y crece +15 % por segundo', () => {
  const h = hero(12, 'berserker');
  const e = foe(h, 2);
  const log = hitLog(h, 'g_remolino');
  h.setSlot('k3', 'g_remolino');
  ok(h.press('k3'), 'pulsa');
  h.step(1 / 60);
  eq(log.length, 1, `1.er giro al pulsar (${log.length})`);
  h.stand(2.95);
  h.release('k3');
  ok(log.length >= 12 && log.length <= 13, `13 giros en 3 s (${log.length})`);
  // el tic n lleva +3,75·(n−1) % (tope +45 %): el 5.º, +15 %; el 13.º, +45 %
  ok(near(log[4].dealt / log[0].dealt, 1.15, 0.01), `5.º giro ×1,15 (${(log[4].dealt / log[0].dealt).toFixed(3)})`);
  const last = log[log.length - 1].dealt / log[0].dealt;
  ok(last > 1.4 && last <= 1.45 + 1e-6, `el último, hasta ×1,45 (${last.toFixed(3)})`);
  const pr = prof(h, 'g_remolino');
  ok(pr.radius === 3.8 && pr.ramp?.perTic === 3.75 && pr.ramp?.max === 45, `radio 3,8 m y rampa 3,75/45 (${pr.radius}, ${JSON.stringify(pr.ramp)})`);
  ok(e.t.n === log.length, 'cada giro golpea al de 2 m');
});
section('F1 · Danza Carmesí ya no resta: deja que la rampa del giro siga creciendo (+60/75/90 %)', () => {
  for (const [r, max] of [[0, 45], [1, 60], [3, 90]]) {
    const h = hero(100, 'berserker', r ? { talents: { specRanks: { b25: r } } } : {});
    eq(prof(h, 'g_remolino').ramp?.max, max, `b25 r${r}: tope ${max} %`);
  }
});

// ------------------------------------------------ G02 · el giro se ve, se oye y gira
section('G02 · el giro: campo con el radio real que sigue al héroe y acaba con el canal; whoosh y gotas', () => {
  const h = hero(12, 'berserker');
  const log = spy(h);
  foe(h, 2); foe(h, 2.5, 1);
  h.setSlot('k3', 'g_remolino');
  h.press('k3'); h.step(0.1);
  const f = fields(h, 'g_giro');
  eq(f.length, 1, 'un campo g_giro mientras giras');
  ok(f[0].radius === 3.8 && f[0].data.inst === h.g._channel, `radio 3,8 m y ligado a ESTE canal (${f[0].radius})`);
  h.walk({ x: 0, z: 1 }, 0.5);
  ok(near(f[0].pos.x, h.p.pos.x, 1e-6) && near(f[0].pos.z, h.p.pos.z, 1e-6) && h.p.pos.z > 0.5, 'sigue al héroe');
  const ticks = h.g._channel.tickN;
  eq(h.sfxCount('whoosh'), ticks, `un «whoosh» por giro (${h.sfxCount('whoosh')}/${ticks})`);
  ok(log.count('bloodWhirl') >= ticks, `el remolino de sangre en cada giro (${log.count('bloodWhirl')}/${ticks})`);
  ok(log.count('bloodDrops') === 2 * ticks, `gotas de sangre por golpe (${log.count('bloodDrops')})`);
  h.release('k3'); h.step(0.05);
  ok(f[0].dead && !fields(h, 'g_giro').length, 'al soltar, el giro acaba');
});
section('G02 · pose del giro: cuerpo a ~2 vueltas/s con el brazo del arma extendido; Ciclón rojo y gris', () => {
  ok(typeof PG.giroPose === 'function', 'giroPose exportada');
  const a = { rig: { rotation: { y: 0, z: 0.3 } }, armR: { rotation: { x: 0, z: 0 } }, armL: { rotation: { x: 0, z: 0 } } };
  PG.giroPose(a, 0.25);
  ok(near(a.rig.rotation.y, 0.25 * 13 % (Math.PI * 2), 1e-9) && a.rig.rotation.z === 0, `giro del cuerpo (${a.rig.rotation.y})`);
  ok(a.armR.rotation.z > 1.2 && a.armL.rotation.z < -0.5, 'brazos abiertos');
  const h = hero(16, 'berserker', { forge: { g_remolino: 'ii' } });
  foe(h, 2);
  h.setSlot('k3', 'g_remolino'); h.press('k3'); h.step(0.1);
  eq(JSON.stringify(fields(h, 'g_giro')[0]?.data.colors), JSON.stringify([0xcfd6e0, 0xc8202a]), 'Ciclón: anillo gris y rojo');
});

// ------------------------------------------------ G04 / G05 · Cataclismo
// carga el Cataclismo `hold` s apuntando a `aim` y suelta; devuelve el arnés tras `after` s
function cata(h, hold, aim = [6, 0], after = 0.35) {
  h.aim(aim[0], aim[1]); h.setSlot('k4', 'g_u_cataclismo');
  ok(h.press('k4'), 'empieza a cargar');
  h.step(hold); h.release('k4'); h.step(after);
  return h;
}
section('G05 · mientras cargas: mira con el radio real que sigue al ratón, dorada en la ventana, y luz en el héroe', () => {
  const h = hero(20, 'cruzado');
  const log = spy(h);
  h.aim(6, 0); h.setSlot('k4', 'g_u_cataclismo'); h.press('k4');
  h.step(0.5);
  const f = fields(h, 'g_cata_mira')[0];
  ok(f && near(f.pos.x, 6, 0.01) && f.radius === prof(h, 'g_u_cataclismo').radius, `mira en la mira con el radio real (${f?.radius})`);
  ok(!f.win && f.frac > 0.15 && f.frac < 0.3, `a 0,5 s: poca carga y fuera de la ventana (${f.frac?.toFixed(2)})`);
  const early = log.count('cataChargeMote');
  h.aim(-4, 3); h.step(0.5);
  ok(near(f.pos.x, -4, 0.01) && near(f.pos.z, 3, 0.01), 'sigue a la mira');
  h.step(0.8);
  ok(f.win && f.frac > 0.85, `a 1,8 s: en la ventana perfecta (${f.frac.toFixed(2)})`);
  const late = log.count('cataChargeMote') - early;
  ok(late / 1.3 > 2 * early / 0.5, `la luz del héroe se acelera con la carga (${(early / 0.5).toFixed(1)} → ${(late / 1.3).toFixed(1)} por segundo)`);
  ok(log.fx.filter(x => x.k === 'cataChargeMote').every(x => near(x.pos.x, h.p.pos.x, 1e-6)), 'las motas salen del héroe');
  h.release('k4'); h.step(1 / 60);
  ok(f.dead && !fields(h, 'g_cata_mira').length, 'al soltar, la mira se va');
  ok(Array.isArray(PG.CATA_MOTES?.charge), 'CATA_MOTES exportado');
});
section('G05 · al caer: columna, anillo de choque del radio real, congelado 120 ms, sacudida 0,8 y suelo que brilla', () => {
  const h = hero(20, 'cruzado');
  const log = spy(h);
  const e = foe(h, 6);
  cata(h, 1.98, [6, 0], 0.01);
  const col = fields(h, 'g_cata_columna')[0];
  ok(col && near(col.pos.x, 6, 0.01) && col.data.delay === 0.3, 'columna de luz en la mira, que baja 0,3 s');
  eq(e.t.n, 0, 'aún no cae');
  h.step(0.33);
  const rad = prof(h, 'g_u_cataclismo').radius;
  ok(log.rings.some(r => r.r === rad && r.c === 0xffd36b && near(r.x, 6, 0.01)), `anillo de choque dorado de ${rad} m`);
  ok(log.stops.includes(120), `congelado de 120 ms (${log.stops})`);
  const sh = Math.max(...log.shakes);
  ok(sh > 0.78 && sh <= 0.8 + 1e-9, `sacudida 0,8 a carga completa (${sh.toFixed(3)})`);
  const floor = h.g.fieldsOf(h.p, { kind: 'zona', skill: 'g_u_cataclismo' })[0];
  const glow = fields(h, 'g_suelo_sagrado')[0];
  ok(floor && glow && glow.data.zone === floor, 'el suelo consagrado lleva su brillo');
  const m0 = log.count('holyGroundMote');
  h.tick(2);
  const motes = log.count('holyGroundMote') - m0;
  ok(motes >= 9 && motes <= 11, `motas doradas a 5 por segundo (${motes} en 2 s)`);
  ok(log.fx.filter(x => x.k === 'holyGroundMote').every(x => Math.hypot(x.pos.x - 6, x.pos.z) <= floor.radius + 1e-6), 'dentro del suelo');
  h.tick(4.5);
  ok(!fields(h, 'g_suelo_sagrado').length && !h.g.fieldsOf(h.p, { kind: 'zona', skill: 'g_u_cataclismo' }).length, 'el brillo se va con la zona');
  // a media carga, la sacudida es menor (0,8 × (0,6 + 0,4 × fracción))
  const k = hero(20, 'cruzado'); const kl = spy(k); foe(k, 6);
  cata(k, 1.0, [6, 0], 0.4);
  const half = Math.max(...kl.shakes);
  ok(half < sh - 0.1 && half >= 0.8 * 0.6, `a media carga, sacudida menor (${half.toFixed(3)})`);
});
section('G04 · la columna arde: 4 golpes más al 70 % del impacto, más flojos que él (golpe máximo acotado)', () => {
  const h = hero(20, 'cruzado');
  const e = foe(h, 6);
  cata(h, 1.98, [6, 0], 0.35);
  eq(e.t.n, 1, 'el impacto');
  h.step(1.25);
  eq(e.t.n, 5, `y 4 golpes de la columna en 1,2 s (${e.t.n})`);
  const [hit, ...burn] = e.t.list;
  ok(burn.every(d => near(d / hit, 0.7, 0.02)), `cada uno, el 70 % del impacto (${burn.map(d => (d / hit).toFixed(2))})`);
  const def = sk(h, 'g_u_cataclismo');
  ok(def.charge.scale.coef[1] === 7 && def.coef === 3, `impacto de 300 a 700 % (${def.charge.scale.coef})`);
});
section('G04 · detona TODAS las marcas de Juicio de su radio (+150 % cada una), no las de fuera', () => {
  const h = hero(20, 'cruzado');
  const log = spy(h);
  const inside = [foe(h, 6), foe(h, 7, 2), foe(h, 4.5, -2)], out = foe(h, 6, 9);
  const jp = prof(h, 'g_juicio');
  for (const e of [...inside, out]) h.g.applyMark(e, jp, h.p);
  const dets = [];
  const md = h.g.markDetonation.bind(h.g);
  h.g.markDetonation = (en, hit) => { const r = md(en, hit); if (r) dets.push({ en, skill: hit.skill, r }); return r; };
  cata(h, 1.0, [6, 0], 0.35);
  ok(inside.every(e => dets.some(d => d.en === e && d.skill === 'g_u_cataclismo' && d.r === 150)), `las 3 de dentro, al +150 % (${dets.map(d => d.r)})`);
  ok(inside.every(e => !e.marks?.juicio) && out.marks?.juicio, 'consume las de dentro; la de fuera sigue');
  // G06: cada detonación se ve (una por enemigo) y se lee
  eq(log.count('juicioDetonate'), 3, 'un destello dorado por marca detonada');
  eq(log.texts.filter(t => t === '¡Juicio!').length, 3, '«¡Juicio!» sobre cada una');
});
section('G04 · gasta el Fervor que tenías al empezar a cargar: +25 % por punto al impacto', () => {
  const run = fv => {
    const h = hero(20, 'cruzado');
    const e = foe(h, 6);
    h.gauge('fervor', fv);
    cata(h, 1.0, [6, 0], 0.35);
    return { dmg: e.t.list[0], left: h.gaugeValue('fervor'), h };
  };
  const a = run(0), b = run(2);
  const base = b.h.p.rollDamage ? null : null;
  ok(b.dmg > a.dmg * 1.05, `con 2 de Fervor, el impacto pega más (${a.dmg.toFixed(0)} → ${b.dmg.toFixed(0)})`);
  eq(b.left, 0, 'y se lo lleva');
  // el +50 % va al saco aditivo: (1 + A + 0,5) / (1 + A), con A el aditivo del Cataclismo
  const A = (prof(a.h, 'g_u_cataclismo').addPct || 0) / 100;
  ok(near(b.dmg / a.dmg, (1 + A + 0.5) / (1 + A), 0.02), `+50 % al saco aditivo (×${(b.dmg / a.dmg).toFixed(3)})`);
  // una suelta perfecta conserva los 3 que da
  const h = hero(20, 'cruzado'); foe(h, 6); h.gauge('fervor', 2);
  cata(h, 1.8, [6, 0], 0.35);
  eq(h.gaugeValue('fervor'), 3, 'suelta perfecta: el Fervor queda en 3');
});
section('G04 · su suelta perfecta llama al Martillo Celestial (z26) donde cae, con su radio', () => {
  const run = (hold, z26) => {
    const h = hero(30, 'cruzado', z26 ? { talents: { specRanks: { z26: 1 } } } : {});
    const e = foe(h, 6, 0.5);
    const log = hitLog(h, 'g_u_cataclismo');
    cata(h, hold, [6, 0], 0.32);
    h.step(0.35);
    return { echo: log.filter(x => x.echo), first: log[0]?.dealt || 0, e };
  };
  const p = run(1.8, true), miss = run(1.0, true), none = run(1.8, false);
  eq(p.echo.length, 1, `perfecta con z26: un martillo del cielo (${p.echo.length})`);
  ok(near(p.echo[0].dealt / p.first, 0.3, 0.02), `repite el 30 % del impacto (${(p.echo[0].dealt / p.first).toFixed(2)})`);
  ok(!miss.echo.length && !none.echo.length, 'fuera de la ventana o sin z26, nada');
});

// ------------------------------------------------ G06 · sello de Juicio
section('G06 · sello de Juicio sobre la barra de vida (dorado, un rombo por uso; parpadea los últimos 2 s)', () => {
  const W = UG.GUERRERO_GAUGE_VIEWS?.fervor?.world;
  ok(typeof W?.overhead === 'function', 'la vista del Fervor tiene world.overhead');
  const p = {}, other = {};
  eq(W.overhead({ alive: true }, p), null, 'sin marca, nada');
  const m = { alive: true, marks: { juicio: { t: 5, uses: 2, by: p } } };
  eq(JSON.stringify(W.overhead(m, p)), JSON.stringify({ n: 2, max: 2, tone: 'gold', blink: false }), 'dos usos (Tribunal): dos rombos dorados');
  m.marks.juicio.t = UG.JUICIO_BLINK_T - 0.1;
  ok(W.overhead(m, p).blink, 'parpadea al caducar');
  eq(W.overhead(m, other), null, 'solo las tuyas');
  // en el plan del mundo (con la especialización del Cruzado activa) y en el marco del objetivo
  const h = hero(20, 'cruzado');
  const e = foe(h, 5), f2 = foe(h, 8);
  h.g.applyMark(e, prof(h, 'g_juicio'), h.p);
  const plan = worldMarksPlan(h.g);
  ok(plan.id === 'fervor' && plan.overhead.length === 1 && plan.overhead[0].e === e && plan.overhead[0].tone === 'gold', 'worldMarksPlan: el sello, solo sobre el marcado');
  ok(enemyStatuses(e).some(s => s.id === 'juicio' && s.label === 'Juicio') && !enemyStatuses(f2).some(s => s.id === 'juicio'), 'estado «Juicio» en el marco del objetivo');
  e.marks.juicio.uses = 3;
  ok(enemyStatuses(e).some(s => s.label === 'Juicio ×3'), 'con sus usos');
});

// ------------------------------------------------ G07 · Juicio con valor propio
section('G07 · Juicio: al instante y sin coste, +1 de Fervor si golpea y marca de +150 % (la detona la definitiva)', () => {
  const h = hero(12, 'cruzado');
  const e = foe(h, 6);
  h.aim(6, 0); h.setSlot('k3', 'g_juicio');
  const mp = h.p.mp;
  ok(h.cast('k3'), 'lanza');
  h.step(0.2);
  ok(e.t.n === 1 && e.marks?.juicio, 'sin preparación: a los 0,2 s ya golpeó y marcó');
  eq(h.p.mp, mp, 'sin coste');
  eq(h.gaugeValue('fervor'), 1, '+1 de Fervor');
  const d = e.marks.juicio.detonate;
  ok(d.pct === 150 && Array.isArray(d.by) && d.by.includes('@ultimate') && d.by.includes('@spender'), `+150 % y la detona tu principal o tu definitiva (${JSON.stringify(d)})`);
  // al vacío: sin Fervor
  const m = hero(12, 'cruzado');
  m.aim(6, 0); m.setSlot('k3', 'g_juicio'); m.cast('k3'); m.step(0.5);
  eq(m.gaugeValue('fervor'), 0, 'si no golpea, no da Fervor');
});
section('G07 · las marcas de Sello del Martillo (z5) y Edicto (z22) valen +100 %: la del Juicio, más', () => {
  const h = hero(30, 'cruzado', { talents: { specRanks: { z5: 1 } } });
  const e = foe(h, 2.5);
  h.aim(2.5, 0); h.setSlot('rmb', 'g_martillo'); h.press('rmb');
  for (let i = 0; i < 120 && !h.g._charging?.inWindow; i++) h.step(1 / 60);       // suelta en la ventana
  h.release('rmb'); h.step(0.2);
  eq(h.sfxCount('verb_perfect'), 1, 'suelta perfecta');
  ok(e.marks?.juicio?.detonate?.pct === 100, `Sello: marca de +100 % (${e.marks?.juicio?.detonate?.pct})`);
  eq(prof(h, 'g_juicio').mark.detonate.pct, 150, 'la del propio Juicio, +150 %');
  const k = hero(30, 'cruzado', { talents: { specRanks: { z22: 1 } } });
  const a = foe(k, 2.5), b = foe(k, 4.5);
  k.g.applyMark(a, prof(k, 'g_juicio'), k.p);
  k.aim(2.5, 0); k.setSlot('rmb', 'g_martillo'); k.press('rmb'); k.step(0.05); k.release('rmb'); k.step(0.2);
  ok(!a.marks?.juicio && b.marks?.juicio?.detonate?.pct === 100, `Edicto: la marca nueva, +100 % (${b.marks?.juicio?.detonate?.pct})`);
});

// ------------------------------------------------ G08 · golpe pesado
section('G08 · golpe pesado: Hendidura 70 ms (una vez aunque golpee a 3), Rajar 3.º 80 ms y sacudida 0,45', () => {
  const h = hero(4); const log = spy(h);
  foe(h, 3); foe(h, 3, 1); foe(h, 3.5, -1);
  h.aim(5, 0); h.setSlot('rmb', 'g_hendidura'); h.cast('rmb'); h.step(0.4);
  eq(JSON.stringify(log.stops), '[70]', `un congelado de 70 ms (${log.stops})`);
  ok(log.shakes.includes(0.3), 'y su sacudida');
  const r = hero(20, 'berserker'); const rl = spy(r);
  foe(r, 2);
  r.g.setComboStep(r.p, 'g_rajar', 3);
  r.aim(2, 0); r.setSlot('rmb', 'g_rajar'); r.cast('rmb'); r.step(0.8);
  ok(rl.stops.includes(80) && rl.shakes.includes(0.45), `3.er golpe de Rajar: 80 ms y 0,45 (${rl.stops} · ${rl.shakes})`);
});
section('G08 · Martillo: congelado solo con la carga ≥ 70 %; reduceMotion lo apaga', () => {
  const run = (hold, reduce = false) => {
    const h = hero(16, 'cruzado'); const log = spy(h);
    if (reduce) h.g.settings.reduceMotion = true;
    foe(h, 2.5);
    h.aim(2.5, 0); h.setSlot('rmb', 'g_martillo'); h.press('rmb'); h.step(hold); h.release('rmb'); h.step(0.2);
    return log;
  };
  ok(!run(0.05).stops.includes(80), 'un toque: sin congelado');
  ok(run(1.0).stops.includes(80), 'cargado: 80 ms');
  const rm = run(1.0, true);
  ok(!rm.stops.length && !rm.shakes.length, 'con reduceMotion, ni congelado ni sacudida');
});
section('G08 · Terremoto 80 ms, Salto 70 ms al caer, Embestida 40 ms, Carga de Escudo 60 ms y Cataclismo 120 ms', () => {
  const want = { terremoto: 80, g_salto: 70, embestida: 40, g_carga_escudo: 60, g_u_cataclismo: 120 };
  const h = hero(20, 'guardian');
  for (const [id, ms] of Object.entries(want)) {
    const def = h.p.cls.skills.find(s => s.id === id) || makeHarness({ classId: 'guerrero', level: 20, spec: 'berserker' }).p.cls.skills.find(s => s.id === id);
    eq(def?.heavy, ms, `${id}: ${ms} ms`);
  }
  const s = hero(14, 'berserker'); const sl = spy(s);
  foe(s, 6);
  s.aim(6, 0); s.setSlot('k1', 'g_salto'); s.cast('k1'); s.step(0.6);
  ok(sl.stops.includes(70), `el Salto congela al caer (${sl.stops})`);
});

// ------------------------------------------------ G09 · réplicas del Terremoto
section('G09 · réplicas del Terremoto (plantado): onda y rocas en cada una, sacudida a la mitad y sonido grave', () => {
  const h = hero(20, 'guardian'); const log = spy(h);
  foe(h, 3);
  h.p.plantNow();
  h.aim(3, 0); h.setSlot('rmb', 'terremoto'); h.cast('rmb'); h.stand(1.6);
  const def = sk(h, 'terremoto');
  ok(log.count('quakeWave') >= 3 && log.count('quakeRocks') >= 3, `onda y rocas en el golpe y en las 2 réplicas (${log.count('quakeWave')}, ${log.count('quakeRocks')})`);
  ok(log.shakes.filter(a => near(a, def.shake * 0.5, 1e-9)).length === 2, `2 réplicas a la mitad (${log.shakes})`);
  ok(h.sfxCount('thud') === 2, `sonido grave en cada réplica (${h.sfxCount('thud')})`);
});

// ------------------------------------------------ G10 · Carga de Escudo
section('G10 · Carga de Escudo: 8 m/s (mín. 0,3 s), +15 % por arrastrado al llegar, anillo de su color y estela continua', () => {
  const run = (aim, enemies = []) => {
    const h = hero(14, 'guardian'); const log = spy(h);
    const es = enemies.map(([x, z]) => foe(h, x, z));
    const end = foe(h, aim + 0.5, 0, { boss: true });
    const areas = [];
    const da = h.g.dealArea.bind(h.g);
    h.g.dealArea = (pos, r, m, o = {}) => { if (o.hitInfo?.skill === 'g_carga_escudo') areas.push(o.addPct || 0); return da(pos, r, m, o); };
    h.aim(aim, 0); h.setSlot('k1', 'g_carga_escudo'); h.cast('k1');
    const dur = h.p.dashMove?.dur;
    h.step(dur + 0.1);
    return { h, log, dur, areas, end, es };
  };
  const long = run(8), short = run(2);
  ok(near(long.dur, 1, 1e-6) && near(short.dur, 0.3, 1e-6), `8 m en 1 s; 2 m en 0,3 s (${long.dur}, ${short.dur})`);
  const two = run(8, [[3, 0.5], [5, -0.5]]);
  ok(near(two.areas[0] - long.areas[0], 30, 1e-6), `2 arrastrados: +30 % al golpe de llegada (${two.areas[0] - long.areas[0]})`);
  const five = run(8, [[2, 0.5], [3, -0.5], [4, 0.5], [5, -0.5], [6, 0.5]]);
  ok(near(five.areas[0] - long.areas[0], 60, 1e-6), `5 arrastrados: tope +60 % (${five.areas[0] - long.areas[0]})`);
  const color = 0x6699ff;
  ok(long.log.rings.some(r => r.c === color && r.r === prof(long.h, 'g_carga_escudo').radius), 'anillo de su color y radio al llegar');
  const trail = long.log.count('shieldChargeTrail');
  ok(trail >= 18 && trail <= 28, `estela continua: una cada 0,3 m o el fotograma siguiente (${trail} en 8 m)`);
  ok(long.log.shakes.includes(0.3) && long.log.stops.includes(60), 'sacudida 0,3 y 60 ms al llegar');
});

// ------------------------------------------------ G13 · Embestida
section('G13 · Embestida: 7 m en 0,2 s (no al instante), estela por el camino e impacto al llegar', () => {
  const h = hero(6); const log = spy(h);
  const e = foe(h, 7.5);
  h.aim(10, 0); h.setSlot('k1', 'embestida'); ok(h.cast('k1'), 'lanza');
  ok(h.p.pos.x < 0.5 && e.t.n === 0, 'aún no llegó');
  h.step(0.1);
  ok(h.p.pos.x > 2.5 && h.p.pos.x < 4.5, `a mitad de camino a los 0,1 s (${h.p.pos.x.toFixed(2)})`);
  h.step(0.12);
  ok(near(h.p.pos.x, 7, 0.05) && e.t.n === 1, 'llega a los 0,2 s y golpea');
  // a 60 Hz cada fotograma recorre ~0,58 m (> 0,3 m): una emisión por fotograma, sin huecos
  const trail = log.count('chargeTrail');
  ok(trail >= 11 && trail <= 13, `estela en cada fotograma (${trail})`);
  ok(log.count('chargeImpact') === 1 && log.stops.includes(40) && log.shakes.includes(0.25), 'impacto, 40 ms y sacudida 0,25');
});

// ------------------------------------------------ F2 · Montaña Viva
section('F2 · Montaña Viva: las réplicas aturden 0,5 s enteros aunque se repitan (sin rendimientos decrecientes)', () => {
  const h = hero(70, 'guardian', { talents: { specRanks: { d26: 1 } } });
  const e = foe(h, 3);
  const cc = [];
  const ac = e.applyCC.bind(e);
  e.applyCC = (kind, dur, o = {}) => { cc.push({ kind, dur, noDR: !!o.noDR, t: h.p.simT }); return ac(kind, dur, o); };
  h.aim(3, 0); h.setSlot('rmb', 'terremoto');
  for (let i = 0; i < 3; i++) { h.p.plantNow(); h.p.mp = h.p.stats.maxMP; h.cast('rmb'); h.stand(1.6); }
  const st = cc.filter(c => c.kind === 'stun');
  ok(st.length >= 2 && st.every(c => c.noDR && c.dur === 0.5), `réplicas: aturden 0,5 s sin rendimientos (${JSON.stringify(st)})`);
});

// ------------------------------------------------ F3 · Estampida Sin Fin
section('F3 · Estampida Sin Fin: la cadena que abre el Salto recargado deja Vulnerable 3 s (la primera, no)', () => {
  const jump = h => { h.aim(4, 0); h.setSlot('k1', 'g_salto'); h.cast('k1'); h.step(0.9); };
  const chain = h => { for (let i = 0; i < 3; i++) jump(h); h.tick(2.3); };
  const run = r => {
    const h = hero(100, 'berserker', r ? { talents: { specRanks: { b27: r } } } : {});
    const pack = [[4, 0], [4, 1], [4.6, -0.6]].map(([x, z]) => foe(h, x, z));
    chain(h);
    const first = pack.map(e => e.vulnT || 0);
    jump(h);
    return { first, second: pack.map(e => e.vulnT || 0) };
  };
  const on = run(3), off = run(0);
  ok(on.first.every(v => v === 0), `la 1.ª cadena no deja Vulnerable (${on.first})`);
  ok(on.second.every(v => v > 2 && v <= 3), `el Salto recargado, sí: 3 s (${on.second.map(v => v.toFixed(2))})`);
  ok(off.second.every(v => v === 0), 'sin b27, nada');
});

console.log(`\n${checks} comprobaciones`);
if (fails.length) {
  console.error(`❌ SENSACIÓN · GUERRERO: ${fails.length} apartados fallan: ${fails.join(' · ')}`);
  process.exit(1);
}
console.log('✅ SENSACIÓN · GUERRERO (S-guerrero): Remolino, giro, Cataclismo, Juicio, golpes pesados, réplicas, avances, Montaña Viva y Estampida');
