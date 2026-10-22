// Paso 2 (2f + 2g) — E4b-bugs (B2): los efectos ROTOS que encontró el banco del catálogo 2g
// (docs/paso2-e4-informe.md §0 y §6; docs/paso2-implementacion.md punto 19). Cada bloque falla sin
// su arreglo:
//  1) DoT: reaplicar no reinicia el ritmo de los tics (js/timers.js). El Sangrado del Remolino
//     (4 golpes/s, tics de 0,5 s) hacía 0 tics durante el giro y la Sed no subía (Danza Carmesí)
//  2) Línea Mortal (f25): la carga completa llega con la ventana dorada; con Tiro Pesado el
//     soltado perfecto (2,15–2,35 s de 2,5) no la activaba nunca. Revisión: la MISMA carga completa
//     (combat-math chargeFullAt) en todo el kit: Salva de Vigía (f10A) y Tres Saetas (charge.full)
//     pedían el máximo, y con la ventana antes del máximo un soltado perfecto no las activaba
//  3) Gran Cacería (m26): «todas tus trampas» incluye la que pisa la Presa: se rearma a mitad de
//     daño junto a ella (antes pedía otra trampa armada y, con los cepos a sus pies, nunca había)
//  4) Banco: Vaivén Eterno (v26) gasta el Vendaval en Andanada (GAUGE_SPEND) y el final se activa;
//     APOYO con los aliados a tu lado y siempre heridos (Tierra Santa, z27, se veía ±1 %). Las
//     comparaciones «sin el nodo» usan withoutNode (rangos puestos: el Paragon sigue abierto)
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { TickScheduler, applyDoTInstance } from '../js/timers.js';
import { makeHarness } from './helpers/power-harness.mjs';
import { powerState } from '../js/powers.js';
import { resolveSkill } from '../js/skill-resolve.js';
import { buildHero, refEnemies, apoyoSim, simulateUni, withoutNode, GAUGE_SPEND, UNI_LIFE } from './helpers/bench-core.mjs';
import { setGauge, gaugeState } from '../js/spec-mechanics.js';
import * as CM from '../js/combat-math.js';

const ok = (c, m) => { assert.ok(c, m); console.log(`✓ ${m}`); };
const v3 = (x, z) => new THREE.Vector3(x, 0, z);
// enemigo mínimo para el planificador: cuenta el daño de los tics
const dummy = () => ({ alive: true, dmg: 0, ticks: 0, takeDamage(n) { this.dmg += n; this.ticks++; }, game: null });

// ------------------------------------------------------------ 1) DoT: el ritmo de los tics
{
  // refresco (se suma lo pendiente): reaplicado cada 0,25 s, tics de 0,5 s
  const s = new TickScheduler(), e = dummy();
  for (let t = 0; t < 3 - 1e-9; t += 0.25) { applyDoTInstance(s, e, { total: 60, ticks: 6, interval: 0.5, source: 'g_remolino:bleed' }); s.tick(0.25); }
  ok(e.ticks >= 5, `DoT refrescado cada 0,25 s (tics de 0,5 s): ${e.ticks} tics en 3 s (antes 0)`);
  const before = e.dmg;
  for (let t = 0; t < 10; t += 0.1) s.tick(0.1);
  ok(Math.abs(e.dmg - 60 * 12) <= 12 * 2, `refrescar no pierde daño: ${e.dmg} de ${60 * 12}`);
  ok(e.dmg > before, 'lo pendiente sigue saliendo al dejar de reaplicarlo');
  // sustitución (no se apila): reaplicado cada 0,4 s, tics de 1 s
  const s2 = new TickScheduler(), e2 = dummy();
  for (let t = 0; t < 4 - 1e-9; t += 0.4) { applyDoTInstance(s2, e2, { total: 30, ticks: 3, interval: 1, source: 'g_rajar:bleed', replace: true }); s2.tick(0.4); }
  ok(e2.ticks >= 3, `DoT sustituido cada 0,4 s (tics de 1 s): ${e2.ticks} tics en 4 s (antes 0: Reabrir dejaba sin tics los Sangrados)`);
  // la primera aplicación sigue esperando un intervalo entero
  const s3 = new TickScheduler(), e3 = dummy();
  applyDoTInstance(s3, e3, { total: 30, ticks: 3, interval: 1, source: 'x:burn' });
  s3.tick(0.99);
  ok(e3.ticks === 0, 'la primera aplicación hace su primer tic al cabo de un intervalo');
}
{
  // el Remolino de la build Danza Carmesí: su Sangrado hace tics DURANTE el giro y llena la Sed
  const h = makeHarness({ classId: 'guerrero', spec: 'berserker', level: 70, build: 'danza', seed: 3 });
  const e = h.enemy({ hp: 1e9, pos: [1.5, 0, 0] });
  let dotTicks = 0;
  const td = e.takeDamage.bind(e);
  e.takeDamage = (n, c, o = {}) => { if (o.dot && o.skill === 'g_remolino' && h.g._channel) dotTicks++; return td(n, c, o); };
  h.p.mp = h.p.stats.maxMP;
  h.setSlot('k3', 'g_remolino');
  h.aim(1.5, 0);
  ok(h.press('k3'), 'el Remolino empieza a girar');
  h.step(2.8);
  const sed = h.gaugeValue('sed');
  h.release('k3');
  ok(dotTicks >= 3, `tics del Sangrado del Remolino durante el giro: ${dotTicks} (antes 0)`);
  ok(sed > 0, `la Sed sube con esos tics durante el giro: ${sed.toFixed(1)} (antes 0)`);
}

// ------------------------------------------------------------ 2) Línea Mortal (f25)
{
  // Francotiradora con Tiro Pesado (la forja recomendada): ventana dorada 2,15–2,35 s de 2,5
  const mk = () => {
    const h = makeHarness({ classId: 'arquera', spec: 'francotiradora', level: 100, seed: 5, talents: { specRanks: { f25: 3 } } });
    h.p.skillForge = { a_t_apuntado: 'ii' };
    h.p.recompute();
    return h;
  };
  const ch = resolveSkill(mk().p, mk().p.cls.skills.find(s => s.id === 'a_t_apuntado')).charge;
  ok(ch.max === 2.5 && ch.perfect[0] === 2.15 && ch.perfect[1] === 2.35, 'Tiro Pesado: carga hasta 2,5 s, ventana 2,15–2,35 s');
  const speed = ch.speed || 1;
  const shoot = sec => {
    const h = mk();
    const far = h.enemy({ hp: 1e9, pos: [24, 0, 0] });
    const hits = [];
    const td = far.takeDamage.bind(far);
    far.takeDamage = (n, c, o = {}) => { hits.push(o.skill); return td(n, c, o); };
    h.p.mp = h.p.stats.maxMP;
    h.setSlot('k3', 'a_t_apuntado');
    h.aim(24, 0);
    h.press('k3');
    h.step(sec / speed);
    h.release('k3');
    h.step(1.2);
    return { line: hits.filter(s => s === 'f_linea_mortal').length };
  };
  const perfect = shoot((ch.perfect[0] + ch.perfect[1]) / 2), early = shoot(1.8), full = shoot(2.6);
  ok(perfect.line === 1, `soltado perfecto (2,25 s) a carga completa: la línea estalla (${perfect.line}; antes 0)`);
  ok(full.line === 1, 'a la carga máxima, también');
  ok(early.line === 0, 'antes de la ventana dorada (1,8 s), no');
  ok(CM.chargeFullAt(ch) === 2.15, 'la carga completa empieza con la ventana dorada');
}
{
  // la regla compartida: con la ventana antes del máximo, desde la ventana; sin ventana o con la
  // ventana en el máximo, el máximo
  ok(CM.chargeFullAt({ min: 0.3, max: 2.5, perfect: [2.15, 2.35] }) === 2.15 && CM.chargeFullAt({ min: 0.3, max: 1.5 }) === 1.5
    && CM.chargeFullAt({ min: 0.3, max: 1.5, perfect: [1.5, 1.5] }) === 1.5, 'chargeFullAt: ventana dorada antes del máximo, o el máximo');
  ok(CM.chargeRelease({ min: 0.3, max: 2.5, perfect: [2.15, 2.35] }, 2.25).full && !CM.chargeRelease({ min: 0.3, max: 2.5, perfect: [2.15, 2.35] }, 2.1).full,
    'chargeRelease: `full` desde la ventana dorada (antes, solo en el máximo)');
  // tensa hasta `u` s nominales (sea cual sea la velocidad: Rodilla en Tierra la sube) y suelta
  const tenseTo = (h, slot, u) => {
    h.press(slot);
    const c = h.g._charging;
    h.step(Math.max(0, u - c.u) / h.g._chargeSpeed(c));
    h.release(slot);
    return c;
  };
  // Salva de Vigía (f10A), de rodillas y con Tiro Pesado: el soltado perfecto también dispara las 2 saetas
  const salva = u => {
    const h = makeHarness({ classId: 'arquera', spec: 'francotiradora', level: 100, seed: 5, talents: { specRanks: { f10: 1 }, choice: { f10: 'A' } } });
    h.p.skillForge = { a_t_apuntado: 'ii' };
    h.p.recompute();
    let n = 0;
    for (const e of [h.enemy({ hp: 1e9, pos: [6, 0, 0] }), h.enemy({ hp: 1e9, pos: [4, 0, 4] })]) {
      const td = e.takeDamage.bind(e);
      e.takeDamage = (a, c, o = {}) => { if (o.skill === 'f_salva') n++; return td(a, c, o); };
    }
    h.p.mp = h.p.stats.maxMP;
    h.setSlot('k2', 'a_f_rodilla');
    h.aim(6, 0);
    h.cast('k2');
    h.step(0.1);
    h.setSlot('k3', 'a_t_apuntado');
    const c = tenseTo(h, 'k3', u);
    h.step(1);
    return { n, window: c.window };
  };
  const sp = salva(2.25), se = salva(1.8), sm = salva(2.5);
  ok(sp.window[0] === 2.15 && sp.window[1] === 2.35, 'Salva de Vigía con Tiro Pesado: ventana 2,15–2,35 s');
  ok(sp.n === 2, `Salva de Vigía: el soltado perfecto (2,25 s) es a carga completa: 2 saetas (${sp.n}; antes 0)`);
  ok(sm.n === 2 && se.n === 0, `Salva de Vigía: al máximo, también; antes de la ventana (1,8 s), no (${sm.n}, ${se.n})`);
  // Tres Saetas (charge.full, con la Mejora: hasta 1,3 s, ventana 1,0–1,17 s): el perfecto da 3 saetas
  const saetas = at => {
    const h = makeHarness({ classId: 'arquera', spec: 'francotiradora', level: 100, seed: 5 });
    h.p.skillForge = { a_t_apuntado: 'i' };
    h.p.recompute();
    h.enemy({ hp: 1e9, pos: [8, 0, 0] });
    h.p.mp = h.p.stats.maxMP;
    h.setSlot('k3', 'a_t_apuntado');
    h.aim(8, 0);
    const n0 = h.g.projectiles.length;
    h.press('k3');
    const c = h.g._charging, u = at(c);
    h.step(Math.max(0, u - c.u) / h.g._chargeSpeed(c));
    h.release('k3');
    h.step(0.02);
    return { n: h.g.projectiles.length - n0, c };
  };
  const tp = saetas(c => (c.window[0] + c.window[1]) / 2), th = saetas(c => c.min + 0.3), tm = saetas(c => c.max);
  ok(tp.c.max === 1.3 && tp.c.window[0] < tp.c.max, `Tres Saetas: la ventana (${tp.c.window.join('–')} s) se abre antes del máximo (${tp.c.max} s)`);
  ok(tp.n === 3, `Tres Saetas: el soltado perfecto es a carga completa: 3 saetas (${tp.n}; antes 1)`);
  ok(tm.n === 3 && th.n === 1, `Tres Saetas: al máximo, 3; antes de la ventana, 1 (${tm.n}, ${th.n})`);
}

// ------------------------------------------------------------ 3) Gran Cacería (m26)
{
  const run = nodes => {
    const h = makeHarness({ classId: 'arquera', spec: 'montaraz', level: 100, seed: 11, talents: { specRanks: nodes } });
    const e = h.enemy({ hp: 1e9, rank: 'elite', pos: [5, 0, 0] });
    h.hit(e, { skill: 'a_disparo', tags: ['proj'] });          // Presa (Coto de Caza)
    h.p.mp = h.p.stats.maxMP;
    h.setSlot('k3', 'a_t_cepo');
    h.aim(5, 0);
    h.cast('k3');                                               // un cepo a sus pies: lo pisa al armarse
    const f = (h.g.fields || []).find(x => x.kind === 'trampa');
    const dmg0 = f?.data?.dmg;
    h.step(0.9);
    return { prey: !!e.prey, f, dmg0, alive: !!f && !f.dead && !f.sprung };
  };
  const a = run({ m26: 3 }), b = run({});
  ok(a.prey && b.prey, 'el enemigo es tu Presa');
  ok(!b.alive, 'sin Gran Cacería, la trampa que pisa la Presa se gasta');
  ok(a.alive, 'con Gran Cacería y una sola trampa, la que pisa la Presa se rearma (antes se gastaba y no pasaba nada)');
  ok(a.f.data.greatHunt && Math.abs(a.f.data.dmg / a.dmg0 - 0.5) < 1e-9, 'a mitad de daño (y ya no cuenta como trampa normal)');
  ok(Math.abs(Math.hypot(a.f.pos.x - 5, a.f.pos.z) - 2.2) < 0.05, 'salta junto a la Presa (a 2,2 m)');
}

// ------------------------------------------------------------ 4) banco: Vaivén Eterno y APOYO
{
  // en el Vendaval, la build Vaivén Eterno pulsa Andanada (vuelve sin recarga al cerrar su ventana);
  // las demás, Flecha Múltiple
  const spend = build => {
    const p = buildHero('arquera', 70, 'tipico', { spec: 'tiradora', build, move: true });
    setGauge(p, 'impulso', 100);
    return { galeT: gaugeState(p, 'impulso')?.galeT || 0, id: p.hotbar[GAUGE_SPEND.tiradora(p)] };
  };
  const v = spend('vaiven'), pl = spend('plumas');
  ok(v.galeT > 0 && pl.galeT > 0, 'Vendaval en marcha');
  ok(v.id === 'a_t_andanada', `con Vaivén Eterno, en el Vendaval el banco pulsa Andanada (${v.id}; antes la Múltiple y el final no se activaba)`);
  ok(pl.id === 'flecha_multiple', 'sin Vaivén Eterno, la Múltiple');
  // y el final se activa de verdad en una pelea corta del banco (20 s contra el jefe de UNI, Nv70)
  const L = 70, al = CM.areaLevelForHero(L), ref = refEnemies(al), hp = ref.boss * UNI_LIFE / 60;
  const p = buildHero('arquera', L, 'tipico', { al, seed: 1, spec: 'tiradora', build: 'vaiven', move: true });
  let vaivenes = 0, last = 0;
  simulateUni(p, ref, 20, { hp, onFrame: () => { const u = powerState(p, 't_vaiven').used || 0; if (u > last) vaivenes += u - last; last = u; } });
  ok(vaivenes >= 1, `Vaivén Eterno en una pelea del banco: ${vaivenes} vaivenes en 20 s (antes 0)`);
}
{
  // APOYO: la cura de Tierra Santa (z27) se ve con los aliados a tu lado (en tus zonas) y heridos.
  // «Sin» = el nodo sin efecto y con sus rangos (withoutNode: el Paragon sigue abierto)
  const L = 70, al = CM.areaLevelForHero(L), ref = refEnemies(al), hp = ref.boss * UNI_LIFE / 60;
  const heal = () => apoyoSim(buildHero('guerrero', L, 'tipico', { al, spec: 'cruzado', build: 'santa', move: true }), ref, { hp, allyHp: 1000 }).heal;
  const con = heal(), sin = withoutNode('guerrero', 'cruzado', 'z27', heal);
  ok(con > sin * 1.02, `APOYO: Tierra Santa cura más (${con.toFixed(2)} frente a ${sin.toFixed(2)} %/s; antes 2,45 frente a 2,44)`);
  // la ablación justa: sin el nodo, el Paragon sigue abierto (rangos a 0 lo cerraban)
  const p0 = withoutNode('guerrero', 'cruzado', 'z27', () => buildHero('guerrero', L, 'tipico', { al, spec: 'cruzado', build: 'santa', move: true }));
  ok(p0.talentAgg.heroOpen && !p0.powers.has('g_z_tierra_santa'), 'withoutNode: el nodo no hace nada y el árbol héroe sigue abierto');
}
console.log('\n✅ E4b-bugs: DoT al ritmo, carga completa en la ventana dorada (Línea Mortal, Salva, Tres Saetas), Gran Cacería con una trampa, banco (Vaivén y APOYO)');
