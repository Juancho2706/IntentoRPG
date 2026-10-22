// ============================================================
// S-arquera · SENSACIÓN DE LAS HABILIDADES DE LA ARQUERA (auditoría, recomendados del dueño)
// ============================================================
// Cada apartado prueba un hallazgo y falla sin su arreglo (cada uno por separado: un apartado roto no
// tapa a los demás; al final, exit 1 si alguno falla):
//   A1   Andanada: impar con la central al cursor (y doble: su gemela por la misma línea), abanico que
//        se cierra con la distancia (atan(2,5 m / d) entre 15° y 60°), ≤ 2 flechas por enemigo (un
//        demonio a 5/6/8 m recibe 2, con y sin Arco Ancho, y una rata o una cría también; 5 zombis
//        juntos —cursor y lados a 1,2 m, o el racimo apretado de 0,8 m—, ≥ 6; en columna no cuenta: las
//        flechas paran en el primero), el empujón de la Repulsora no le quita la segunda y el salto se ve
//   A-x1 Disparo Disperso: a un blanco a 6 m pega como un básico normal, también a una rata (el abanico
//        no se abre más que el blanco); a quemarropa, 25°; con Bocajarro a 2 m, 2 flechas y un empujón
//   A2   Carrera del Viento: no bloquea (básico y otras ranuras mientras corres), viento a los pies y sus
//        flechas de viento atraviesan (al de detrás también le llegan)
//   A3   cepo «colocar y detonar»: cerrado y pegado al atrapado, detonable (Detonante, Salto) y se
//        gasta; al jefe no lo atrapa: lo muerde una vez, sigue armado, ralentiza y suma Quebranto; un
//        cepo cerrado no cuenta en el tope de 3 (colocar otro no quita el único armado)
//   A4   Tiro Celestial: anillo que se cierra en la ventana, chispas que convergen, haz vivo de la
//        línea, surco, destello, sacudida y congelado (una vez) en el perfecto
//   A5   Disparo Apuntado: saeta alargada y trazador que acaba en la última víctima de SU línea (Tres
//        Saetas: uno por saeta); congelado en el perfecto; sin haz del motor. Cuerda Tensa: el básico
//        tensado brilla en el arco (dorado en la ventana) y su saeta acaba donde acaba la flecha
//   A7   forja por build: Perforación y Pulso, Disparo Apuntado base; Punto Débil, Tiro Pesado; y la
//        forja de cada build cumple el needsForm de sus nodos (Sobrepenetración y Línea de Mira atraviesan)
//   A10  cepo visible: dientes que se cierran, pulso armado, chasquido y estallido de espinas
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { makeHarness } from './helpers/power-harness.mjs';
import { ENEMIES } from '../js/data.js';
import { resolveSkill } from '../js/skill-resolve.js';
import { powerState } from '../js/powers.js';
import * as FE from '../js/field-entities.js';
import * as TAL from '../js/talents.js';

const fails = [];
let checks = 0;
const ok = (c, m) => { checks++; assert.ok(c, m); };
const eq = (a, b, m) => { checks++; assert.equal(a, b, m); };
const near = (a, b, eps, m) => { checks++; assert.ok(Math.abs(a - b) <= eps, `${m} (${a} frente a ${b})`); };
function section(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (e) { fails.push(name); console.error(`✗ ${name}\n    ${e.message.split('\n')[0]}`); }
}
const WEAPON = { kind: 'item', slot: 'weapon', name: 'Arco de prueba', dmg: [1000, 1000], affixes: {}, quality: 0 };
const DEF = id => ENEMIES.find(e => e.id === id);
// heroína con un arco fijo y sin críticos (golpe constante)
function hero(level, { spec = null, forge = {} } = {}) {
  const h = makeHarness({ classId: 'arquera', level, spec });
  h.p.equipment.weapon = { ...WEAPON };
  h.p.skillForge = { ...forge };
  h.p.recompute();
  h.p.hp = h.p.stats.maxHP; h.p.mp = h.p.stats.maxMP;
  h.p.combatRng = () => 0.999;
  h.g.input.mouseHeld.l = false;                     // sin el básico automático: solo lo que se lanza
  return h;
}
// golpes directos que recibe un enemigo (n y daño) con un filtro de las opciones del golpe; el enemigo
// queda QUIETO ante el retroceso físico de cada golpe (los empujones de displace sí lo mueven)
function tally(e, match = () => true) {
  const t = { n: 0, sum: 0, at: [] };                // at: dónde estaba en cada golpe
  const td = e.takeDamage.bind(e);
  e.takeDamage = (a, c, o = {}) => {
    const x = e.pos.x, z = e.pos.z;
    const d = td(a, c, o) || 0;
    e.pos.x = x; e.pos.z = z;
    if (!o.dot && match(o)) { t.n++; t.sum += d; t.at.push({ x, z }); }
    return d;
  };
  return t;
}
const skill = id => o => o.skill === id;
const trapHit = o => !!o.trap;
// espías de lo que se ve: emitFx (nombre del preset o del preset en línea), sacudidas, congelados y haces
function spy(h) {
  const S = { fx: [], shakes: [], stops: [], beams: [] };
  h.g.emitFx = (name, pos) => { S.fx.push({ name: typeof name === 'string' ? name : name?.name, def: typeof name === 'string' ? null : name, pos, t: h.p.simT || 0 }); };
  h.g.addShake = k => { S.shakes.push(k); };
  h.g.hitStop = ms => { S.stops.push(ms); };
  const sb = h.g.spawnLiveBeam.bind(h.g);
  h.g.spawnLiveBeam = o => { const b = sb(o); S.beams.push({ o, b }); return b; };
  S.count = name => S.fx.filter(f => f.name === name).length;
  return S;
}
const traps = h => (h.g.fields || []).filter(f => !f.dead && f.kind === 'trampa');
const flat = v => ({ x: v.x, z: v.z });

// ———————————————————————————————————————— A1
section('A1 · Andanada: abanico al cursor que se cierra lejos, 2 flechas por enemigo y salto con polvo', () => {
  const volley = (level, forge, foes, aim) => {
    const h = hero(level, { spec: 'tiradora', forge });
    const S = spy(h);
    const es = foes.map(([x, z, def]) => { const e = h.enemy({ hp: 1e9, pos: [x, 0, z], def }); e.t = tally(e, skill('a_t_andanada')); return e; });
    h.aim(...aim); h.setSlot('k3', 'a_t_andanada');
    ok(h.cast('k3'), 'lanza la Andanada');
    const n = h.g.projectiles.length;
    const ang = h.g.projectiles.map(pr => Math.atan2(pr.vel.x, pr.vel.z));
    h.step(1.2);
    return { h, S, es, n, ang, hits: es.map(e => e.t.n) };
  };
  // número impar y la central, justo al cursor (a 5 m y en diagonal)
  for (const aim of [[0, 5], [4, 4]]) {
    const r = volley(12, {}, [], aim);
    eq(r.n % 2, 1, `número impar de flechas (${r.n})`);
    const want = Math.atan2(aim[0], aim[1]);
    ok(r.ang.some(a => Math.abs(a - want) < 1e-6), `una flecha va al cursor (${aim})`);
  }
  // la central sale doble: 0,05 s después, su gemela por la misma línea (desde donde disparó)
  {
    const h = hero(12, { spec: 'tiradora' });
    h.aim(0, 5); h.setSlot('k3', 'a_t_andanada');
    ok(h.cast('k3'), 'Andanada');
    const n0 = h.g.projectiles.length;
    h.step(0.07);
    eq(h.g.projectiles.length, n0 + 1, 'una flecha más 0,05 s después: la gemela');
    eq(h.g.projectiles.filter(pr => Math.abs(Math.atan2(pr.vel.x, pr.vel.z)) < 1e-6).length, 2, 'dos flechas por la línea del cursor');
  }
  // el abanico se cierra con la distancia: 2,5 m a cada lado del cursor (atan(2,5 / d)), entre 15° y
  // 60° de semiapertura; con Arco Ancho (Nv13), 3 m y hasta 75°
  const span = (z, L = 12) => { const r = volley(L, {}, [], [0, z]); return Math.max(...r.ang) - Math.min(...r.ang); };
  near(span(0.5), 2 * 1.047, 0.01, 'a quemarropa, 120°');
  near(span(5), 2 * Math.atan(2.5 / 5), 0.01, 'a 5 m, 2,5 m a cada lado');
  near(span(12), 2 * 0.2618, 0.01, 'lejos, 30°');
  near(span(5, 13), 2 * Math.atan(3 / 5), 0.01, 'Arco Ancho a 5 m: 3 m a cada lado');
  near(span(0.5, 13), 2 * 1.309, 0.01, 'Arco Ancho a quemarropa: 150°');
  // un demonio solo a 5, 6 y 8 m: 2 flechas, con y sin Arco Ancho (Nv13), y nunca 3; un blanco
  // pequeño (rata, cría de espora) también recibe las 2 (la central y su gemela)
  for (const d of [5, 6, 8]) for (const L of [12, 13]) {
    const r = volley(L, {}, [[0, d, DEF('demonio')]], [0, d]);
    eq(r.hits[0], 2, `demonio a ${d} m ${L >= 13 ? 'con' : 'sin'} Arco Ancho: 2 flechas`);
  }
  for (const id of ['rata', 'cria_espora']) for (const d of [5, 8]) {
    const r = volley(12, {}, [[0, d, DEF(id)]], [0, d]);
    eq(r.hits[0], 2, `${id} (escala ${DEF(id).scale}) a ${d} m: 2 flechas`);
  }
  // Repulsora: el empujón llega 0,15 s después del impacto, así que la flecha vecina aún lo encuentra
  // (a 8 m, empujado al instante, quedaría fuera del alcance de 10 m de las demás)
  for (const d of [6, 8]) {
    const rep = volley(16, { a_t_andanada: 'ii' }, [[0, d, DEF('demonio')]], [0, d]);
    eq(rep.hits[0], 2, `Repulsora a ${d} m: 2 flechas, no 1`);
    ok(rep.es[0].t.at.every(q => Math.abs(q.z - d) < 0.3), `las 2 le llegan antes del empujón (z ${rep.es[0].t.at.map(q => q.z.toFixed(2))})`);
    ok(rep.es[0].pos.z > d + 1.5, `y lo empuja (z=${rep.es[0].pos.z.toFixed(2)})`);
  }
  // 5 zombis juntos: ≥ 6 impactos y ninguno con más de 2. Dos formaciones: uno al cursor a 6 m, dos a
  // sus lados a 1,2 m y dos detrás; y el racimo apretado (0,8 m entre ellos). En columna no vale: las
  // flechas paran en el primero y solo las del centro llegan
  const packs = {
    'cursor, lados y detrás': [[0, 6], [1.2, 6.5], [-1.2, 6.5], [0.6, 7.5], [-0.6, 7.5]],
    'racimo apretado': [[0, 6], [0.8, 6], [-0.8, 6], [0.4, 6.8], [-0.4, 6.8]],
  };
  for (const [k, pos] of Object.entries(packs)) for (const L of [12, 13]) {
    const g = volley(L, {}, pos.map(([x, z]) => [x, z, DEF('zombi')]), [0, 6]);
    const tot = g.hits.reduce((a, b) => a + b, 0);
    ok(tot >= 6, `5 zombis (${k}) ${L >= 13 ? 'con' : 'sin'} Arco Ancho: ≥ 6 impactos (${g.hits})`);
    ok(g.hits.every(n => n <= 2), `ninguno recibe más de 2 (${g.hits})`);
  }
  // el salto se ve: polvo al despegar y al caer, y estela de polvo en el aire
  const s = volley(12, {}, [], [0, 6]);
  ok(s.S.count('arqLeapKick') >= 2, `polvo al despegar y al caer (${s.S.count('arqLeapKick')})`);
  ok(s.S.count('arqRollDust') >= 3, `estela de polvo en el aire (${s.S.count('arqRollDust')})`);
});

// ———————————————————————————————————————— A-x1
section('A-x1 · Disparo Disperso: a 6 m pega como un básico (también a una rata); a quemarropa, 25°', () => {
  const run = (forge, z, id = 'zombi') => {
    const h = hero(7, { forge });
    const e = h.enemy({ hp: 1e9, pos: [0, 0, z], def: DEF(id) });
    const t = tally(e, skill('a_disparo'));
    h.aim(0, z); h.setSlot('lmb', 'a_disparo');
    ok(h.cast('lmb'), 'dispara');
    const ang = h.g.projectiles.map(pr => Math.atan2(pr.vel.x, pr.vel.z));
    h.step(0.9);
    return { t, span: Math.max(...ang) - Math.min(...ang), n: ang.length };
  };
  const basic = run({}, 6), dis = run({ a_disparo: 'i' }, 6), close = run({ a_disparo: 'i' }, 1);
  eq(dis.n, 3, '3 flechas');
  eq(dis.t.n, 2, 'a 6 m, 2 flechas al mismo zombi');
  ok(dis.t.sum >= basic.t.sum * 0.99, `a 6 m, al menos un básico normal (${dis.t.sum} frente a ${basic.t.sum})`);
  near(close.span, 0.436, 0.01, 'a quemarropa, 25°');
  ok(dis.span < 0.2, `a 6 m el abanico se cierra (${dis.span.toFixed(3)} rad)`);
  // un blanco pequeño SOLO con la mira encima (WASD: apunta a un punto): las flechas de los lados no se
  // abren más que él (0,8 × su radio de impacto), así que también recibe un básico entero
  for (const id of ['rata', 'cria_espora']) for (const z of [3, 6, 9]) {
    const b = run({}, z, id), d = run({ a_disparo: 'i' }, z, id);
    eq(d.t.n, 2, `${id} a ${z} m: 2 flechas`);
    ok(d.t.sum >= b.t.sum * 0.99, `${id} a ${z} m: al menos un básico normal (${d.t.sum} frente a ${b.t.sum})`);
  }
  // en un grupo (otra rata a 1,2 m) el abanico no se estrecha: sigue a 0,4 m a cada lado, para repartirse
  {
    const h = hero(7, { forge: { a_disparo: 'i' } });
    h.enemy({ hp: 1e9, pos: [0, 0, 6], def: DEF('rata') }); h.enemy({ hp: 1e9, pos: [1.2, 0, 6], def: DEF('rata') });
    h.aim(0, 6); h.setSlot('lmb', 'a_disparo');
    ok(h.cast('lmb'), 'dispara al grupo');
    const ang = h.g.projectiles.map(pr => Math.atan2(pr.vel.x, pr.vel.z));
    near(Math.max(...ang) - Math.min(...ang), 2 * Math.atan(0.4 / 6), 0.002, 'en grupo, el abanico de siempre');
  }
  // Bocajarro (c6A) a 2 m: el empujón espera a la descarga (0,15 s), así que las 2 flechas le dan, y
  // empuja una sola vez (1 m). Aquí el zombi NO se fija tras cada golpe: si el empujón llegara con la
  // primera flecha, la segunda ya no lo encontraría
  {
    const h = hero(7, { forge: { a_disparo: 'i' } });
    h.p.talentExtra = { powers: ['a_bocajarro'] }; h.p.recompute();
    const e = h.enemy({ hp: 1e9, pos: [0, 0, 2], def: DEF('zombi') });
    const t = { n: 0 };
    const td = e.takeDamage.bind(e);
    e.takeDamage = (a, c, o = {}) => { if (!o.dot && o.skill === 'a_disparo') t.n++; return td(a, c, o); };
    h.aim(0, 2); h.setSlot('lmb', 'a_disparo');
    ok(h.cast('lmb'), 'dispara a bocajarro');
    h.step(0.9);
    eq(t.n, 2, 'Bocajarro a 2 m: le dan las 2 flechas');
    near(e.pos.z, 3, 0.35, 'y lo empuja una vez, 1 m');
  }
});

// ———————————————————————————————————————— A2
section('A2 · Carrera del Viento: no bloquea y deja viento a los pies', () => {
  const h = hero(20, { spec: 'tiradora' });
  const S = spy(h);
  const e = h.enemy({ hp: 1e9, pos: [0, 0, 5] }), behind = h.enemy({ hp: 1e9, pos: [0, 0, 7] });
  const run = tally(e, skill('a_v_carrera')), basic = tally(e, skill('a_disparo')), through = tally(behind, skill('a_v_carrera'));
  h.aim(0, 5);
  h.setSlot('k1', 'a_v_carrera'); h.setSlot('lmb', 'a_disparo'); h.setSlot('rmb', 'flecha_multiple');
  ok(h.press('k1'), 'empieza a correr');
  h.step(0.3);
  ok(h.g._channel, 'canal activo');
  ok(h.cast('lmb'), 'el básico sale mientras corres');
  ok(h.g._channel, 'y la carrera sigue');
  h.step(0.4);                                       // una acción por fotograma y el bloqueo del básico
  h.p.gcdT = 0; h.p.mp = h.p.stats.maxMP;
  ok(h.cast('rmb'), 'y la principal también');
  ok(h.g._channel, 'sin cortar la carrera');
  h.step(1.0);
  ok(run.n >= 2 && basic.n >= 1, `autodisparos de extra (${run.n}) y el básico (${basic.n})`);
  ok(through.n >= 2 && through.n >= run.n - 1, `los autodisparos atraviesan: el de detrás recibe ${through.n} de ${run.n}`);
  // viento a los pies en cada tic (0,1 s) y estela detrás
  ok(S.count('arqWindStep') >= 10, `viento a los pies cada 0,1 s (${S.count('arqWindStep')} en 1,3 s)`);
  ok(S.count('arqWindTrail') >= 5, `estela detrás (${S.count('arqWindTrail')})`);
  h.release('k1');
});

// ———————————————————————————————————————— A3
section('A3 · cepo «colocar y detonar»: cerrado, pegado, detonable y, a un jefe, armado bajo él', () => {
  const ZOMBI = DEF('zombi');
  const place = (h, x, z, sec = 0.8) => { h.p.gcdT = 0; h.p.mp = h.p.stats.maxMP; h.setSlot('k3', 'a_t_cepo'); h.aim(x, z); const r = h.cast('k3'); h.step(sec); return r; };
  const detonante = (h, x, z, sec = 0.8) => { h.p.gcdT = 0; h.p.mp = h.p.stats.maxMP; h.setSlot('rmb', 'a_m_detonante'); h.aim(x, z); const r = h.cast('rmb'); h.step(sec); return r; };
  // 1) atrapa, se cierra, va pegado y la Detonante lo hace estallar (y se gasta)
  {
    const h = hero(20, { spec: 'montaraz' });
    const e = h.enemy({ hp: 1e9, pos: [0, 0, 6], def: ZOMBI });
    ok(place(h, 0, 6), 'cepo');
    const [f] = traps(h);
    ok(f && f.closed?.e === e && f.sprung, 'se cierra sobre el que lo pisa');
    e.pos.set(2, 0, 6.5); h.step(0.1);
    near(f.pos.x, 2, 1e-6, 'va pegado a él (x)');
    near(f.pos.z, 6.5, 1e-6, 'va pegado a él (z)');
    const burst = tally(e, trapHit);
    ok(detonante(h, 2, 6.5), 'Flecha Detonante');
    ok(burst.n >= 1 && burst.sum > 0, `estalla sobre él (${burst.n} golpes, ${burst.sum})`);
    ok(f.dead, 'y se gasta');
    // al 100 %: el mismo estallido que el de un cepo armado que nadie pisó
    const h2 = hero(20, { spec: 'montaraz' });
    const e2 = h2.enemy({ hp: 1e9, pos: [30, 0, 0], def: ZOMBI });
    place(h2, 0, 8);
    e2.pos.set(0, 0, 6);
    const b2 = tally(e2, trapHit);
    detonante(h2, 0, 6);
    ok(b2.n === 1, 'cepo armado: estalla');
    near(burst.sum / burst.n, b2.sum, b2.sum * 0.01, 'el cerrado estalla al 100 %, como el armado');
  }
  // 2) sin detonarlo, a los 3,5 s se gasta
  {
    const h = hero(20, { spec: 'montaraz' });
    h.enemy({ hp: 1e9, pos: [0, 0, 6], def: ZOMBI });
    place(h, 0, 6, 0.7);
    const [f] = traps(h);
    ok(f?.closed, 'cerrado');
    h.step(f.closed.until - f.age - 0.1);
    ok(!f.dead, 'antes de 3,5 s sigue');
    h.step(0.2);
    ok(f.dead, 'a los 3,5 s se gasta');
  }
  // 3) Salto de Acecho a un cepo cerrado: estalla con daño y se gasta
  {
    const h = hero(20, { spec: 'montaraz' });
    const e = h.enemy({ hp: 1e9, pos: [6, 0, 0], def: ZOMBI });
    place(h, 6, 0);
    const [f] = traps(h);
    ok(f?.closed?.e === e, 'cerrado sobre el zombi');
    const s = tally(e, trapHit);
    h.p.gcdT = 0; h.setSlot('k1', 'a_m_acecho'); h.aim(6, 0);
    ok(h.cast('k1'), 'Salto de Acecho');
    h.step(1);
    ok(s.n >= 1 && s.sum > 0, `al caer, el cepo cerrado estalla (${s.sum})`);
    ok(f.dead, 'y se gasta');
  }
  // 4) Gran Cacería (rearmOnce): el que salta ahora se rearma en vez de cerrarse
  {
    const h = hero(20, { spec: 'montaraz' });
    const e = h.enemy({ hp: 1e9, pos: [0, 0, 6], def: ZOMBI });
    place(h, 0, 6, 0);
    const [f] = traps(h);
    f.rearmOnce = true;
    h.step(0.25);                                    // salta a los 0,2 s (Muelles Firmes) y se vuelve a armar
    ok(e.rootT > 0, 'saltó (lo atrapa)');
    ok(f && !f.dead && !f.closed && !f.sprung, 'rearmOnce: se rearma, no se cierra');
  }
  // 4b) tope de 3: los cepos CERRADOS no cuentan (ya saltaron). Con 2 cerrados y 1 armado, colocar otro
  // no hace caducar al armado (antes caducaba el más viejo, aunque fuera el único armado)
  {
    const h = hero(20, { spec: 'montaraz' });
    const refill = () => h.g.reduceCooldown(h.p, 'a_t_cepo', Infinity);
    h.enemy({ hp: 1e9, pos: [-6, 0, 0], def: ZOMBI }); h.enemy({ hp: 1e9, pos: [6, 0, 0], def: ZOMBI });
    place(h, 0, 9, 0.7);                              // el armado, el más viejo
    refill(); place(h, -6, 0, 0.7); refill(); place(h, 6, 0, 0.7);
    const armed = traps(h).find(f => !f.closed);
    eq(traps(h).filter(f => f.closed).length, 2, 'dos cepos cerrados sobre sus zombis');
    ok(armed && Math.abs(armed.pos.z - 9) < 0.1, 'y uno armado');
    refill(); ok(place(h, 0, -9, 0.1), 'colocas un cuarto');
    ok(!armed.dead, 'el armado sigue (los cerrados no cuentan en el tope)');
    eq(traps(h).length, 4, 'los 4 a la vez: 2 cerrados y 2 armados');
    refill(); place(h, 3, -9, 0.1); refill(); place(h, -3, -9, 0.1);
    eq(traps(h).filter(f => !f.closed).length, 3, 'como mucho 3 sin cerrar');
    ok(armed.dead, 'al pasar de 3 armados caduca el más viejo');
  }
  // 5) jefe: no lo atrapa; una mordida, sigue armado bajo él, lo ralentiza y le suma Quebranto
  {
    const h = hero(20, { spec: 'montaraz' });
    const boss = h.enemy({ hp: 1e9, boss: true, pos: [0, 0, 6], def: ZOMBI });
    const bites = [];
    const sh = h.g.spawnRing; h.g.spawnRing = (...a) => { bites.push(a); return sh?.(...a); };
    place(h, 0, 6, 0.7);
    const [f] = traps(h);
    ok(f && !f.closed && !f.sprung && !f.dead, 'al jefe no lo atrapa: sigue armado');
    ok(f.bitten?.has(boss), 'lo muerde');
    ok(!(boss.stunT > 0), 'sin aturdir');
    eq(h.g.dotsOf(boss, 'poison').length, 1, 'y lo envenena una vez');
    const st0 = boss.stagger || 0, ring0 = bites.length;
    h.step(2);
    const gain = (boss.stagger || 0) - st0;
    // 8 de Quebranto por segundo (el texto): 4 del pulso y 4 de su ralentización (al jefe, el control es Quebranto)
    ok(gain >= 15.9 && gain <= 20.1, `8 de Quebranto por segundo mientras lo pisa (${gain.toFixed(1)} en 2 s)`);
    ok(boss.slowT > 0 && boss.slowPct === 20, `ralentizado (40 %, que a un jefe le llega a la mitad: ${boss.slowPct})`);
    eq(bites.length, ring0, 'una sola mordida (sin más anillos)');
    ok(!f.dead && f.bitten.size === 1, 'sigue armado');
    const b = tally(boss, trapHit);
    detonante(h, 0, 6);
    ok(b.n >= 1, 'la Detonante lo hace estallar sobre el jefe');
    ok(f.dead, 'y se gasta');
  }
});

// ———————————————————————————————————————— A4
section('A4 · Tiro Celestial: anillo en la ventana, haz de la línea, surco, sacudida y congelado', () => {
  const shot = hold => {
    const h = hero(20, { spec: 'francotiradora' });
    const S = spy(h);
    const e1 = h.enemy({ hp: 1e9, pos: [0, 0, 6] }), e2 = h.enemy({ hp: 1e9, pos: [0, 0, 10] });
    h.aim(0, 6); h.setSlot('k4', 'a_u_celeste');
    ok(h.press('k4'), 'tensa');
    // tensa a 60 Hz anotando cuándo se abre la ventana dorada
    let winAt = null;
    for (let t = 0; t < hold - 1e-9; t += 1 / 60) { h.step(1 / 60); if (winAt == null && h.g._charging?.inWindow) winAt = h.p.simT; }
    const during = S.fx.slice();
    const beams0 = S.beams.length;
    h.release('k4');
    h.step(0.05);
    const at = S.beams.slice(beams0);
    h.step(0.7);
    return { h, S, during, at, e1, e2, winAt };
  };
  const p = shot(0.6), q = shot(0.35);
  // tensando: un anillo que se cierra justo al abrirse la ventana dorada, chispas y brillo
  const rings = p.during.filter(f => f.name === 'Tensado anillo');
  eq(rings.length, 1, 'un anillo por tensado');
  ok(p.winAt != null, 'la ventana se abre');
  near(rings[0].t + rings[0].def.lifetime[0], p.winAt, 0.05, 'el anillo acaba de cerrarse al abrirse la ventana');
  ok(rings[0].def.speed[0] < 0, 'y se cierra (velocidad hacia dentro)');
  const sparks = p.during.filter(f => f.name === 'Tensado chispas');
  ok(sparks.length >= 4 && sparks.every(f => f.def.speed[0] < 0), `chispas que convergen (${sparks.length})`);
  const glows = p.during.filter(f => f.name === 'Tensado brillo');
  ok(glows.length >= 4, `brillo del arco (${glows.length})`);
  ok(glows.at(-1).def.color.end === '#ffcf40' && glows[0].def.color.end !== '#ffcf40', 'el brillo se vuelve dorado en la ventana');
  // al soltar: destello, sacudida, haz de la línea (vivo, 0,5 s, ancho por la carga) y surco
  ok(p.S.count('arqReleasePerfect') === 1 && p.S.count('arqCelestialFlash') === 1, 'destello dorado y celeste');
  ok(Math.max(...p.S.shakes) >= 0.3, `sacudida (${Math.max(...p.S.shakes)})`);
  const line = p.at.find(b => b.o.dur === 0.5);
  ok(line && line.o.to.z > 10, `haz vivo de 0,5 s por toda la línea atravesada (${line?.o.to.z?.toFixed(1)})`);
  const lineEarly = q.at.find(b => b.o.dur === 0.5);
  ok(line.o.width > lineEarly.o.width, `más ancho cuanto más tensado (${line.o.width.toFixed(2)} frente a ${lineEarly.o.width.toFixed(2)})`);
  const furrow = p.at.find(b => b.o.dur === 1);
  ok(furrow && furrow.o.from.y < 0.1 && furrow.o.to.y < 0.1, 'surco luminoso en el suelo');
  // congelado en el perfecto: una vez aunque atraviese a dos
  ok(p.e1.hp < 1e9 && p.e2.hp < 1e9, 'atraviesa a los dos');
  // (el motor congela 45 ms cada impacto crítico de proyectil; el del perfecto, 100 ms, va una vez)
  ok(p.S.stops.filter(ms => ms === 100).length === 1 && Math.max(...p.S.stops) === 100, `un congelado de 100 ms (${p.S.stops})`);
  ok(!q.S.stops.some(ms => ms >= 70), `sin perfecto, sin congelado propio (${q.S.stops})`);
  ok(q.S.count('arqReleaseFlash') === 1 && q.S.count('arqReleasePerfect') === 0, 'destello normal sin perfecto');
});

// ———————————————————————————————————————— A5
section('A5 · Disparo Apuntado: saeta alargada, trazador a la última víctima, congelado sin haz', () => {
  // hold: s de tensado o 'gold' (el centro de la ventana dorada del perfil, con su Mejora y variante)
  const shot = (hold, forge = {}) => {
    const h = hero(20, { spec: 'francotiradora', forge });
    const S = spy(h);
    const e1 = h.enemy({ hp: 1e9, pos: [0, 0, 6] }), e2 = h.enemy({ hp: 1e9, pos: [0, 0, 9] });
    h.aim(0, 6); h.setSlot('k3', 'a_t_apuntado');
    const win = resolveSkill(h.p, h.p.cls.skills.find(s => s.id === 'a_t_apuntado')).charge.perfect;
    ok(h.press('k3'), 'tensa');
    h.step(hold === 'gold' ? (win[0] + win[1]) / 2 : hold); h.release('k3'); h.step(0.02);
    const st = powerState(h.p, 'arq_tensado');
    const shotRef = st.shot;
    h.step(0.8);
    return { h, S, e1, e2, shot: shotRef };
  };
  const p = shot('gold'), q = shot(0.5);
  eq(p.h.sfxCount('verb_perfect'), 1, 'en la ventana: perfecto');
  // saeta (haz corto que viaja) + trazador; dorados y más gruesos en el perfecto; ningún haz del motor
  ok(p.S.beams.length >= 2 && p.S.beams.every(b => b.o.sparks === false), `saeta y trazador, sin el haz del motor (${p.S.beams.length})`);
  const bolt = p.S.beams.find(b => typeof b.o.from === 'function' && typeof b.o.to === 'function');
  const trace = p.S.beams.find(b => b.o.scroll === 10);
  ok(bolt && trace, 'la saeta viaja (extremos vivos) y el trazador sale de la boca');
  eq(bolt.o.color, 0xffcf40, 'saeta dorada en el perfecto');
  const qb = q.S.beams.find(b => typeof b.o.from === 'function');
  ok(qb.o.color !== 0xffcf40 && bolt.o.width > qb.o.width, 'sin perfecto: ni dorada ni tan gruesa');
  // el trazador acaba en la ÚLTIMA víctima (atraviesa: el de 9 m), no en el cursor
  ok(p.shot?.last && Math.abs(p.shot.last.z - 9) < 0.5, `última víctima registrada (${p.shot?.last?.z})`);
  const end = trace.o.to();
  near(end.z, 9, 0.5, 'el trazador termina en la última víctima');
  // congelado de 70 ms una vez en el perfecto
  ok(p.S.stops.filter(ms => ms === 70).length === 1 && Math.max(...p.S.stops) === 70, `congelado de 70 ms una vez (${p.S.stops})`);
  ok(!q.S.stops.some(ms => ms >= 70), `sin perfecto, sin congelado propio (${q.S.stops})`);
  // Tiro Pesado (no atraviesa): la saeta para en su víctima y el trazador acaba en ella
  const t = shot('gold', { a_t_apuntado: 'ii' });
  ok(t.shot && !t.shot.pierce && t.shot.stopAt != null && Math.abs(t.shot.stopAt - 5.7) < 0.5, `Tiro Pesado: la saeta para en el primero (${t.shot?.stopAt})`);
  near(t.S.beams.find(b => b.o.scroll === 10).o.to().z, 6, 0.5, 'y el trazador acaba en él');
  ok(t.e2.hp === 1e9, 'no atraviesa');
  // Tres Saetas (a carga completa): una saeta y un trazador por saeta; el de la central acaba en SU
  // víctima, no en la que alcanza una lateral (antes se iba en diagonal hacia ella)
  {
    const h = hero(20, { spec: 'francotiradora', forge: { a_t_apuntado: 'i' } });
    const S = spy(h);
    const pr = resolveSkill(h.p, h.p.cls.skills.find(s => s.id === 'a_t_apuntado'));
    const half = pr.charge.full.spread;
    const e1 = h.enemy({ hp: 1e9, pos: [0, 0, 6] });
    const e2 = h.enemy({ hp: 1e9, pos: [Math.sin(half) * 9, 0, Math.cos(half) * 9] });   // en la línea de una lateral, más lejos
    h.aim(0, 6); h.setSlot('k3', 'a_t_apuntado');
    ok(h.press('k3'), 'tensa Tres Saetas');
    h.step((pr.charge.perfect[0] + pr.charge.perfect[1]) / 2); h.release('k3'); h.step(0.02);
    const st = powerState(h.p, 'arq_tensado');
    eq(st.shots?.length, 3, 'tres saetas, cada una con su trazador');
    h.step(0.8);
    ok(e1.hp < 1e9 && e2.hp < 1e9, 'la central y una lateral aciertan');
    near(st.shot.last?.z ?? 0, 6, 0.3, 'el trazador de la central acaba en su víctima');
    near(st.shot.last?.x ?? 9, 0, 0.3, 'y no en la de la lateral');
    ok(st.shots.some(s => s !== st.shot && s.last && Math.abs(s.last.x - e2.pos.x) < 0.3), 'la lateral acaba en la suya');
    ok(S.beams.length >= 6, `saeta y trazador por saeta (${S.beams.length} haces)`);
  }
  // Cuerda Tensa: el Disparo Rápido tensado brilla en el arco, crece con la carga y se vuelve dorado en
  // la ventana (sin anillo); su saeta y su trazador hacen el recorrido de la flecha de verdad
  {
    const h = hero(20, { spec: 'francotiradora' });
    const S = spy(h);
    h.enemy({ hp: 1e9, pos: [0, 0, 6] });
    h.aim(0, 6); h.setSlot('lmb', 'a_disparo');
    ok(h.press('lmb'), 'tensa el básico');
    let inWin = false;
    for (let t = 0; t < 0.92; t += 1 / 60) { h.step(1 / 60); if (h.g._charging?.inWindow) inWin = true; }
    ok(inWin, 'llega a la ventana dorada');
    const glows = S.fx.filter(f => f.name === 'Tensado brillo');
    ok(glows.length >= 6, `brillo del arco al tensar el básico (${glows.length})`);
    ok(glows[0].def.color.end !== '#ffcf40' && glows.at(-1).def.color.end === '#ffcf40', 'se vuelve dorado en la ventana');
    ok(glows.at(-1).def.size.start[0] > glows[0].def.size.start[0], 'y crece con la carga');
    eq(S.count('Tensado anillo'), 0, 'sin anillo');
    const n0 = h.g.projectiles.length;
    h.release('lmb'); h.step(1 / 60);
    const arrow = h.g.projectiles[n0] || h.g.projectiles.at(-1);
    const st = powerState(h.p, 'arq_tensado');
    ok(arrow && st.shot?.id === 'a_disparo', 'suelta la flecha con su saeta');
    const speed = Math.hypot(arrow.vel.x, arrow.vel.z), range = (arrow.life + 1 / 60) * speed;
    near(st.shot.speed, speed, 0.01, 'la saeta va a la velocidad de la flecha');
    near(st.shot.lineLen, range, 0.4, `y acaba donde acaba la flecha (${st.shot.lineLen.toFixed(1)} frente a ${range.toFixed(1)} m)`);
  }
});

// ———————————————————————————————————————— A7
section('A7 · forja por build, needsForm de sus nodos y Disparo Apuntado sin haz del motor', () => {
  const reco = b => TAL.forgeRecoFor('arquera', 'francotiradora', b).a_t_apuntado;
  eq(reco('perforacion'), null, 'Perforación (Línea Mortal): Disparo Apuntado base, que atraviesa');
  eq(reco('pulso'), null, 'Pulso de Hierro: base (compra nodos que piden atravesar)');
  eq(reco('puntodebil'), 'ii', 'Punto Débil (Disparo Imposible): Tiro Pesado');
  // Sobrepenetración y Línea de Mira piden que la saeta atraviese (el libro avisa con Tiro Pesado)
  const fr = TAL.talentTreesFor('arquera').specs.find(s => s.id === 'francotiradora');
  for (const id of ['f4', 'f5']) eq(fr.nodes.find(n => n.id === id).needsForm?.a_t_apuntado, 'pierce', `${id}: needsForm pierce`);
  // cada build de la Arquera, a Nv100 y con su forja recomendada: ningún nodo comprado sin efecto
  const T = TAL.talentTreesFor('arquera'), builds = T.builds;
  // las habilidades que algún nodo de la Arquera pide con una forma (needsForm de nodos y opciones)
  const needIds = new Set([T.cls, ...T.specs, ...(T.hero || [])].flatMap(t => (t.nodes || []).flatMap(n => [n, ...(n.opts || [])]))
    .flatMap(n => Object.keys(n.needsForm || {})));
  ok(needIds.has('a_t_apuntado'), 'Disparo Apuntado entre las habilidades con needsForm');
  let checked = 0;
  for (const [key, b] of Object.entries(builds)) {
    const hb = makeHarness({ classId: 'arquera', level: 100, spec: b.sp, build: key });
    const forge = TAL.forgeRecoFor('arquera', b.sp, key);
    hb.p.skillForge = { ...forge }; hb.p.recompute();
    for (const sk of hb.p.cls.skills.filter(x => needIds.has(x.id))) {
      const def = resolveSkill(hb.p, sk)?.def || sk;
      const voids = TAL.formVoids(hb.p, sk.id, def);
      eq(voids.length, 0, `${key} (${b.sp}): ${sk.id} con su forja (${forge[sk.id] ?? 'base'}) no deja nodos sin efecto (${voids.map(v => `${v.id} ${v.text}`).join(', ')})`);
    }
    checked++;
  }
  eq(checked, 12, '12 builds de la Arquera');
  // y con Tiro Pesado, Línea Mortal sí los dejaría sin efecto (el aviso funciona)
  {
    const hb = makeHarness({ classId: 'arquera', level: 100, spec: 'francotiradora', build: 'perforacion' });
    hb.p.skillForge = { a_t_apuntado: 'ii' }; hb.p.recompute();
    const def = resolveSkill(hb.p, hb.p.cls.skills.find(s => s.id === 'a_t_apuntado')).def;
    eq(TAL.formVoids(hb.p, 'a_t_apuntado', def).map(v => v.id).sort().join(','), 'f4,f5', 'Línea Mortal con Tiro Pesado: Sobrepenetración y Línea de Mira, sin efecto');
  }
  const h = hero(30, { spec: 'francotiradora' });
  for (const v of [null, 'i', 'ii']) {
    h.p.skillForge = { a_t_apuntado: v }; h.p.recompute();
    const pr = resolveSkill(h.p, h.p.cls.skills.find(s => s.id === 'a_t_apuntado'));
    ok(!pr.def.beam, `Disparo Apuntado ${v || 'base'}: no pinta el haz del motor`);
  }
});

// ———————————————————————————————————————— A10
section('A10 · cepo visible: dientes que se cierran, pulso armado, chasquido y estallido', () => {
  const skin = FE.TRAP_SKINS?.cepo;
  ok(skin && typeof skin.render === 'function' && typeof skin.snap === 'function' && typeof skin.burst === 'function', 'aspecto «cepo» registrado');
  const h = hero(20, { spec: 'montaraz' });
  const S = spy(h);
  const fxGroup = new THREE.Group();
  const rg = { fxGroup };
  const e = h.enemy({ hp: 1e9, pos: [30, 0, 0], def: DEF('zombi') });
  h.setSlot('k3', 'a_t_cepo'); h.aim(0, 6); ok(h.cast('k3'), 'cepo');
  const [f] = traps(h);
  eq(f.data.skin, 'cepo', 'el cepo lleva su aspecto');
  skin.render(rg, f);
  ok(f.skin && fxGroup.children.includes(f.skin.root), 'malla en el grupo de efectos');
  eq(f.skin.teeth.length, 10, '10 dientes');
  const open = f.skin.teeth[0].rotation.z;
  // armado: late (la opacidad del brillo cambia con el tiempo)
  h.step(0.6); skin.render(rg, f);
  const o1 = f.skin.glow.material.opacity;
  h.step(0.25); skin.render(rg, f);
  ok(Math.abs(f.skin.glow.material.opacity - o1) > 0.02, 'armado, late');
  // lo pisa: chasquido (dientes metálicos y sacudida de 0,1) y los dientes se cierran
  e.pos.set(0, 0, 6);
  const sh0 = S.shakes.length;
  h.step(0.1);
  ok(f.closed, 'se cierra');
  ok(S.count('arqTrapSnap') === 1 && S.shakes.slice(sh0).includes(0.1), 'chasquido con sacudida de 0,1');
  skin.render(rg, f); h.step(0.1); skin.render(rg, f);
  ok(f.skin.teeth[0].rotation.z > open + 1.5, `los dientes se cierran (${open.toFixed(2)} → ${f.skin.teeth[0].rotation.z.toFixed(2)})`);
  ok(!f.skin.ring.visible, 'cerrado, sin el anillo del radio');
  // detonado: estallido de espinas con sacudida de 0,18 y la malla se va
  const sh1 = S.shakes.length;
  h.p.gcdT = 0; h.p.mp = h.p.stats.maxMP; h.setSlot('rmb', 'a_m_detonante'); h.aim(0, 6); h.cast('rmb'); h.step(0.8);
  ok(f.dead, 'detonado');
  ok(S.count('arqThornBurst') === 1 && S.count('arqDetonBlast') >= 1 && S.shakes.slice(sh1).includes(0.18), 'estallido de espinas con sacudida de 0,18');
  skin.render(rg, f);
  ok(!f.skin && !fxGroup.children.length, 'la malla se retira al gastarse');
});

console.log(`\n${fails.length ? `❌ SENSACIÓN · ARQUERA: fallan ${fails.length} apartado(s): ${fails.join(' · ')}` : '✅ SENSACIÓN · ARQUERA (S-arquera)'}: ${checks} comprobaciones`);
if (fails.length) process.exit(1);
