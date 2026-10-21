// ============================================================
// Test 91 — COLA W2d, parte B (entidades, campos, topes y talentos) del Paso 2
// (docs/paso2-implementacion.md punto 17, «Cola W2d»):
//  1) básico de arma: alcance del perfil (def.range, rangeMul, escala de un tensado), cadencia del
//     perfil, VFX de la variante y color (variante → forjada → VFX base → clase), salpicadura nativa
//  2) Enemy.clearCC ('freeze' quita solo el aturdimiento del hielo)
//  3) applyCC('fear'): huye sin atacar; a los jefes, Quebranto
//  4) rendimientos decrecientes del Quebranto por ralentización y por desplazamiento reaplicados
//  5) topes propios (drCapAdd/blockCapAdd), innate.mod y las stats costPct/skillSpeedPct
//  6) trampa genérica: hitDot que se renueva, sin golpe directo con estallido (⑤ sin daño), rango y
//     burstMul en estallido y detonación, detonate.consume: false
//  7) Punto Débil: el premio de la marca, una vez por enemigo cada 8 s
//  8) registro de estallidos con la clave de la trampa y trapBurstsWithin({ distinct })
//  9) g.stopDash, g.expireField y dotsOf con interval
// 10) poderes v1 que 2g saca: ningún contenido los usa (los retira la cola cuando W-pruebas suelte sus tests)
// ============================================================
import assert from 'node:assert/strict';
import * as THREE from 'three';
import * as CM from '../js/combat-math.js';
import { applyHitEffects, INNATE_ONLY_STATS } from '../js/entities.js';
import { definePower, POWER_HOOKS } from '../js/powers.js';
import { SKILL_FX, SKILL_FX_PRESETS } from '../js/fx-skills.js';
import { resolveSkill } from '../js/skill-resolve.js';
import { fieldArmed, TRAP_FLASH_T } from '../js/field-entities.js';
import { talentTreesFor, TALENT_TREES } from '../js/talents.js';
import { LEGENDARY_POWERS } from '../js/items.js';
import { PARAGON_BOARDS, ERA_MUTATORS } from '../js/data.js';
import { makeHarness } from './helpers/power-harness.mjs';
import { verbHarness } from './fixtures/skills-verbs-sample.mjs';

const DT = 1 / 60;
const near = (a, b, m, tol = 1e-6) => assert.ok(Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)), `${m}: ${a} ≠ ${b}`);
const fxp = x => (typeof x === 'string' ? (SKILL_FX_PRESETS[x] || x) : x);
// espía de ⑤ (todos los golpes del héroe)
const HITS = [];
definePower('vx91_spy', { name: 'espía 91', procs: true, onHit(g, p, e, hit) { HITS.push({ e, ...hit }); } });
const of = (e, pred = () => true) => HITS.filter(x => x.e === e && pred(x));
// héroe con proyectiles espiados y golpes sin azar (sin crítico, arma fija)
function hero(classId, level, opts = {}) {
  HITS.length = 0;
  const h = makeHarness({ classId, level, powers: ['vx91_spy'], ...opts });
  h.p.combatRng = () => 0.99;
  h.shots = [];
  const spawn = h.g.spawnProjectile.bind(h.g);
  h.g.spawnProjectile = o => { h.shots.push(o); return spawn(o); };
  h.fx = [];
  h.g.emitFx = (name) => { h.fx.push(name); };
  return h;
}
const forge = (h, map) => { h.p.skillForge = { ...(h.p.skillForge || {}), ...map }; h.p.recompute(); };

// ------------------------------------------------ 1) básico de arma
{
  // cadencia: Mano Rápida (Mejora de Disparo Rápido, Nv4) = ×0,9 del tiempo de ataque
  const a3 = hero('arquera', 3), a4 = hero('arquera', 4);
  for (const h of [a3, a4]) h.p.basicAttack(h.enemy({ hp: 1e6, pos: [0, 0, 5] }));
  near(a3.p.atkCd, a3.p.stats.atkTime, 'sin Mano Rápida: 1 × atkTime');
  near(a4.p.atkCd, a4.p.stats.atkTime * 0.9, 'Mano Rápida: 0,9 × atkTime');
  // alcance: atkRange + 2 (lo de siempre) × rangeMul (Dardo Veloz, Nv4: +20 %)
  const m3 = hero('maga', 3), m4 = hero('maga', 4);
  for (const h of [m3, m4]) h.p.basicAttack(h.enemy({ hp: 1e6, pos: [0, 0, 5] }));
  near(m3.shots[0].range, 9, 'Dardo: 7 + 2 m');
  near(m4.shots[0].range, 9 * 1.2, 'Dardo Veloz: +20 % de alcance');
  near(m4.p.basicRange(), 10.8, 'basicRange');
  near(m3.p.basicReach(), 7, 'reach sin mods = atkRange');
  near(m4.p.basicReach(), 8.8, 'reach: lo que el perfil alarga el disparo');
  near(hero('guerrero', 4).p.basicReach(), 2.1, 'cuerpo a cuerpo: atkRange');
  // clic-mover: con el alcance alargado dispara desde 8 m; sin él, camina hacia el enemigo
  for (const [h, fires] of [[m3, false], [m4, true]]) {
    h.p.atkCd = 0; h.shots.length = 0;
    const e = h.enemy({ hp: 1e6, pos: [0, 0, 8] });
    h.p.attackTarget = e; h.g.input.keyDir = null;
    const z0 = h.p.pos.z;
    h.p.update(DT);
    assert.equal(h.shots.length > 0, fires, `clic-mover a 8 m: ${fires ? 'dispara' : 'se acerca'}`);
    assert.equal(h.p.pos.z > z0, !fires, 'y solo se mueve si no llega');
  }
  // def.range de la definición manda sobre atkRange + 2
  const r = hero('arquera', 1, { inject: { skills: [{ id: 'a_disparo', name: 'Arco largo', cat: 'basic', slots: ['lmb'], tags: ['basic', 'proj', 'physical'], type: 'weapon', coef: 1, gen: 5, range: 14 }] } });
  r.p.basicAttack(r.enemy({ hp: 1e6, pos: [0, 0, 5] }));
  near(r.shots[0].range, 14, 'def.range: 14 m');
  // tensado: charge.scale.range (metros) según la carga; sin escala, charge.rangeMul de la suelta
  definePower('vx91_tensa', { name: 'tensa', modifyResolve(p, sk, prof) {
    if (sk.id === 'a_disparo') prof.charge = { min: 0, max: 1, perfect: [0.8, 1], perfectPct: 0, scale: { range: [10, 16] }, repeat: true, speed: 1 };
  } });
  const t = hero('arquera', 1, { powers: ['vx91_spy', 'vx91_tensa'] });
  const te = t.enemy({ hp: 1e6, pos: [0, 0, 5] });
  t.p.basicAttack(te, { charge: { t: 1, frac: 1, coefMul: 1 } });
  t.p.basicAttack(te, { charge: { t: 0.5, frac: 0.5, coefMul: 1 } });
  t.p.basicAttack(te);
  t.p.basicAttack(te, { charge: { t: 0, frac: 0, coefMul: 1 } });
  assert.deepEqual(t.shots.map(s => s.range), [16, 13, 10.5, 10.5], 'tensado al máximo 16 m, a media carga 13 m; sin carga, el de siempre; un tensado corto, nunca menos');
  near(t.p.basicRange(1), 16, 'basicRange(t)');
  // charge.scale.rangeAdd: metros que SUMA el tensado (Vista Larga: +2 m por rango desde 0,3 s)
  definePower('vx91_vista', { name: 'vista', modifyResolve(p, sk, prof) {
    if (sk.id === 'a_disparo') prof.charge = { min: 0, max: 1, perfect: [0.8, 1], perfectPct: 0, scale: { rangeAdd: [[0.29, 0], [0.3, 4]] }, repeat: true, speed: 1 };
  } });
  const v = hero('arquera', 1, { powers: ['vx91_spy', 'vx91_vista'] });
  const ve = v.enemy({ hp: 1e6, pos: [0, 0, 5] });
  v.p.basicAttack(ve, { charge: { t: 0.2, frac: 0.2, coefMul: 1 } });
  v.p.basicAttack(ve, { charge: { t: 0.6, frac: 0.6, coefMul: 1 } });
  assert.deepEqual(v.shots.map(s => s.range), [10.5, 14.5], 'rangeAdd: un toque, lo de siempre; tensado, +4 m');
  const u = hero('arquera', 1);
  u.p.basicAttack(u.enemy({ hp: 1e6, pos: [0, 0, 5] }), { charge: { t: 1, frac: 1, coefMul: 1, rangeMul: 1.5 } });
  near(u.shots[0].range, 10.5 * 1.5, 'charge.rangeMul sin escala de alcance');
  console.log('Básico de arma: cadencia y alcance del perfil (rangeMul, def.range, tensado), reach en clic-mover ✓');
}
{
  // VFX y color con la forja real: Cicuta (variante con color en vars.ii) y Saeta Ígnea (color de la forjada)
  const c = hero('arquera', 7); forge(c, { a_disparo: 'ii' });
  c.p.basicAttack(c.enemy({ hp: 1e6, pos: [0, 0, 5] }));
  assert.equal(c.shots[0].color, 0x86d47a, 'Cicuta: flecha verde (VFX de la variante)');
  assert.deepEqual(c.shots[0].impactPreset, fxp('arqHemlockSplash'), 'Cicuta: impacto de su variante');
  assert.ok(c.fx.includes(fxp('arqHemlockTrail')), 'Cicuta: estela de su variante al disparar');
  const d = hero('arquera', 7); forge(d, { a_disparo: 'i' });
  d.p.basicAttack(d.enemy({ hp: 1e6, pos: [0, 0, 5] }));
  assert.ok(d.fx.includes(fxp('arqScatter')) && d.shots[0].color === 0xe8d8a0, 'Disparo Disperso: su fogonazo; sin color propio, el de la clase');
  const s = hero('maga', 7); forge(s, { m_dardo: 'i' });
  s.p.basicAttack(s.enemy({ hp: 1e6, pos: [0, 0, 5] }));
  assert.equal(s.shots[0].color, 0xff7a22, 'Saeta Ígnea: el color de la definición forjada (no el arcano del VFX base)');
  const b = hero('maga', 7);
  b.p.basicAttack(b.enemy({ hp: 1e6, pos: [0, 0, 5] }));
  assert.equal(b.shots[0].color, 0xcc66ff, 'Dardo sin variante: arcano');
  // el orden completo con datos sintéticos: variante → definición forjada → VFX base → clase
  const save = SKILL_FX.a_disparo;
  try {
    const shotColor = (fxEntry, varSet, defColor) => {
      SKILL_FX.a_disparo = fxEntry;
      const h = hero('arquera', 10, { inject: {
        skills: [{ id: 'a_disparo', name: 'Disparo', cat: 'basic', slots: ['lmb'], tags: ['basic', 'proj', 'physical'], type: 'weapon', coef: 1, gen: 5, ...(defColor ? { color: defColor } : {}) }],
        forge: { a_disparo: { mejora: null, vars: [
          { id: 'a_disparo_i', name: 'I', role: 'AREA', line: 'i', set: { ...varSet } },
          { id: 'a_disparo_ii', name: 'II', role: 'UNI', line: 'ii', set: { coef: 1 } }] } } } });
      forge(h, { a_disparo: 'i' });
      h.p.basicAttack(h.enemy({ hp: 1e6, pos: [0, 0, 5] }));
      return h.shots[0].color;
    };
    assert.equal(shotColor({ color: 0x111111, vars: { i: { color: 0x222222 } } }, { color: 0x444444 }, 0x333333), 0x222222, '1.º el color del VFX de la variante');
    assert.equal(shotColor({ color: 0x111111, vars: { i: { aura: 'basicArrow' } } }, { color: 0x444444 }, 0x333333), 0x444444, '2.º el de la definición forjada');
    assert.equal(shotColor({ color: 0x111111 }, {}, null), 0x111111, '3.º el del VFX base');
    assert.equal(shotColor({}, {}, null), 0xe8d8a0, '4.º el de la clase');
  } finally { SKILL_FX.a_disparo = save; }
  console.log('Básico de arma: VFX de la variante (skillFxFor) y color variante → forjada → VFX base → clase ✓');
}
{
  // salpicadura NATIVA: clave splash del perfil en su radio; ni el objetivo ni a 3 m
  const sp = hero('maga', 1, { inject: { skills: [{ id: 'm_dardo', name: 'Dardo', cat: 'basic', slots: ['lmb'], tags: ['basic', 'proj', 'arcane'], elem: 'arcane',
    type: 'weapon', coef: 1, gen: 3, speed: 13, splash: 0.5, radius: 1.5 }] } });
  const a = sp.enemy({ hp: 1e6, pos: [0, 0, 5] }), nb = sp.enemy({ hp: 1e6, pos: [1.2, 0, 5.4] }), far = sp.enemy({ hp: 1e6, pos: [3.5, 0, 5] });
  sp.p.basicAttack(a); sp.step(0.6);
  assert.equal(of(a).length, 1, 'el objetivo: solo el impacto');
  const sh = of(nb, x => x.skill === 'm_dardo');
  assert.ok(sh.length === 1 && sh[0].source === 'splash' && sh[0].dealt > 0, 'el vecino: un golpe de salpicadura (source splash)');
  assert.equal(of(far).length, 0, 'fuera del radio, nada');
  const ratio = sh[0].raw / of(a)[0].raw;
  assert.ok(ratio > 0.4 && ratio < 0.6, `salpicadura al 50 % del golpe (${ratio.toFixed(2)})`);
  // dos proyectiles por disparo (count 2: el 2.º a 0,18 rad): el 1.º da al blanco y salpica al que
  // está en la trayectoria del 2.º, que llega después y ya no le da (un enemigo recibe el ataque una vez)
  const two = hero('maga', 1, { inject: { skills: [{ id: 'm_dardo', name: 'Dardo', cat: 'basic', slots: ['lmb'], tags: ['basic', 'proj', 'arcane'], elem: 'arcane',
    type: 'weapon', coef: 1, gen: 3, speed: 13, count: 2, splash: 0.5, radius: 1.5 }] } });
  const a4 = two.enemy({ hp: 1e6, pos: [0, 0, 5] }), b4 = two.enemy({ hp: 1e6, pos: [6 * Math.sin(0.18), 0, 6 * Math.cos(0.18)] });
  two.p.basicAttack(a4); two.step(1);
  assert.equal(of(a4, x => x.skill === 'm_dardo').length, 1, 'count 2: el blanco, un impacto');
  assert.deepEqual(of(b4, x => x.skill === 'm_dardo').map(x => x.source), ['splash'], 'el de la 2.ª trayectoria: la salpicadura y no además el 2.º proyectil');
  // y no recibe dos salpicaduras: entre el blanco y el que golpea el 2.º proyectil (otro instante)
  HITS.length = 0;
  const a5 = two.enemy({ hp: 1e6, pos: [20, 0, 5] }), c5 = two.enemy({ hp: 1e6, pos: [20 + 7 * Math.sin(0.18), 0, 7 * Math.cos(0.18)] }),
    b5 = two.enemy({ hp: 1e6, pos: [19.7, 0, 6.6] });
  for (const x of [a4, b4]) x.alive = false;
  two.p.pos.set(20, 0, 0); two.p.atkCd = 0;
  two.p.basicAttack(a5); two.step(1);
  assert.ok(of(a5).length === 1 && of(c5).filter(x => x.source !== 'splash').length === 1, 'cada proyectil, su blanco');
  assert.deepEqual(of(b5, x => x.skill === 'm_dardo').map(x => x.source), ['splash'], 'el de en medio: una salpicadura, no dos');
  const none = hero('maga', 1);
  const a2 = none.enemy({ hp: 1e6, pos: [0, 0, 5] }), nb2 = none.enemy({ hp: 1e6, pos: [1.2, 0, 5.4] });
  none.p.basicAttack(a2); none.step(0.6);
  assert.equal(of(nb2).length, 0, 'sin splash en el perfil, no salpica');
  // Saeta Ígnea real (su poder aún estalla, tanda 2): la salpicadura nativa no se le suma
  const si = hero('maga', 30); forge(si, { m_dardo: 'i' });
  const a3 = si.enemy({ hp: 1e7, pos: [0, 0, 5] }), nb3 = si.enemy({ hp: 1e7, pos: [1.2, 0, 5.4] });
  si.p.basicAttack(a3); si.step(0.6);
  const got = of(nb3, x => x.skill === 'm_dardo');
  assert.equal(got.length, 1, `Saeta Ígnea: un solo estallido al vecino (${got.map(x => x.source)})`);
  console.log('Básico de arma: salpicadura nativa (splash/radius del perfil, source splash, sin repetir) ✓');
}

// ------------------------------------------------ 2) Enemy.clearCC
{
  const h = hero('maga', 20);
  const e = h.enemy({ hp: 1e6 });
  e.applyCC('freeze', 2, { src: h.p });
  assert.ok(e.frozenT > 0 && e.stunT > 0);
  assert.equal(e.clearCC('freeze'), true);
  assert.ok(!(e.frozenT > 0) && !(e.stunT > 0), 'freeze: quita la congelación y su aturdimiento');
  assert.equal(e.clearCC('freeze'), false, 'sin congelación, nada');
  // un aturdimiento más largo de otra fuente sigue entero
  const f = h.enemy({ hp: 1e6, pos: [0, 0, 3] });
  f.applyCC('freeze', 1, { src: h.p });
  const st = f.applyCC('stun', 3, { src: h.p });
  assert.ok(st > f.frozenT && f.stunT === st, 'aturdido más que congelado');
  assert.equal(f.clearCC('freeze'), true);
  assert.ok(!(f.frozenT > 0), 'sin congelación');
  near(f.stunT, st, 'el aturdimiento de otra fuente sigue entero');
  // los demás canales
  const g = h.enemy({ hp: 1e6, pos: [0, 0, -3] });
  g.applyCC('root', 2, { src: h.p }); g.applyCC('slow', 3, { pct: 40, src: h.p }); g.applyCC('stun', 1, { src: h.p });
  assert.ok(g.clearCC('root') && !(g.rootT > 0) && g.slowT > 0, 'root');
  assert.ok(g.clearCC('slow') && !(g.slowT > 0) && g.slowPct === 0, 'slow');
  assert.ok(g.clearCC('stun') && !(g.stunT > 0), 'stun');
  assert.equal(g.clearCC('nada'), false, 'tipo desconocido');
  console.log("clearCC: 'freeze' solo el hielo (un aturdimiento más largo sigue), root, slow, stun ✓");
}

// ------------------------------------------------ 3) applyCC('fear')
{
  const h = hero('guerrero', 20);
  const e = h.enemy({ hp: 1e6, pos: [0.9, 0, 0] });
  e.aggroed = true; e.atkCd = 0;
  const hp0 = h.p.hp;
  assert.equal(e.applyCC('fear', 2, { src: h.p }), 2, 'asustado 2 s');
  for (let t = 0; t < 1; t += DT) e.update(DT);
  assert.ok(e.pos.distanceTo(h.p.pos) > 0.9 + 1.5, `huye del héroe (${e.pos.distanceTo(h.p.pos).toFixed(2)} m)`);
  assert.equal(h.p.hp, hp0, 'asustado no ataca');
  // al acabar vuelve a pelear (ataca en cuanto lo tiene al alcance)
  e.clearCC('fear');
  e.pos.set(0.9, 0, 0); e.atkCd = 0;
  for (let t = 0; t < 2 && h.p.hp === hp0; t += DT) e.update(DT);
  assert.ok(h.p.hp < hp0, 'sin miedo, ataca');
  // al acabar SOLO (sin clearCC) suelta su origen y vuelve a pelear
  const nat = h.enemy({ hp: 1e6, pos: [0, 0, -2] });
  nat.aggroed = true;
  nat.applyCC('fear', 0.5, { src: h.p });
  for (let t = 0; t < 0.6; t += DT) nat.update(DT);
  assert.ok(!(nat.fearT > 0) && nat.fearFrom === null, 'fin natural: sin miedo ni origen');
  const dNat = nat.pos.distanceTo(h.p.pos);
  for (let t = 0; t < 0.5; t += DT) nat.update(DT);
  assert.ok(nat.pos.distanceTo(h.p.pos) < dNat - 0.3, 'y vuelve hacia el héroe');
  // desde `from` (Clamor: el Rival caído), canal duro con rendimientos decrecientes
  const f = h.enemy({ hp: 1e6, pos: [0, 0, 4] });
  f.applyCC('fear', 2, { src: h.p, from: new THREE.Vector3(0, 0, 6) });
  for (let t = 0; t < 0.5; t += DT) f.update(DT);
  assert.ok(f.pos.z < 4 - 0.5, 'huye de `from`');
  f.clearCC('fear');
  const dr = f.stunDR;
  assert.ok(dr > 0.25 && dr < 0.35, `resistencia del canal duro tras asustar (${dr.toFixed(3)}: 0,35 que baja 0,12/s)`);
  near(f.applyCC('fear', 2, { src: h.p }), 2 * (1 - dr), 'reaplicado: × (1 − resistencia)');
  // aturdido no huye; corta un lanzamiento interrumpible
  const s = h.enemy({ hp: 1e6, pos: [3, 0, 0] });
  s.casting = { id: 'vx', t: 1, total: 1, interruptible: true, run() {} };
  s.applyCC('fear', 2, { src: h.p });
  assert.ok(!s.casting, 'corta el lanzamiento');
  s.stunT = 0.5;
  const x0 = s.pos.x;
  for (let t = 0; t < 0.3; t += DT) s.update(DT);
  assert.equal(s.pos.x, x0, 'aturdido: no huye');
  // el miedo manda sobre el cebo: dentro de un cebo armado, huye de su origen y no va hacia el cebo
  h.g.spawnField('trampa', { pos: new THREE.Vector3(0, 0, 16), radius: 1, dur: 20, owner: h.p, data: { dmg: 1, coef: 1, armT: 0, lure: { radius: 8 } } });
  const lu = h.enemy({ hp: 1e6, pos: [0, 0, 12] });
  for (let t = 0; t < 0.4; t += DT) lu.update(DT);
  assert.ok(lu.pos.z > 12 + 0.2, `sin miedo, el cebo lo atrae (${lu.pos.z.toFixed(2)})`);
  lu.pos.set(0, 0, 12);
  lu.applyCC('fear', 2, { src: h.p, from: new THREE.Vector3(0, 0, 14) });
  for (let t = 0; t < 0.5; t += DT) lu.update(DT);
  assert.ok(lu.pos.z < 12 - 0.3, `asustado, huye del origen aunque el cebo tire (${lu.pos.z.toFixed(2)})`);
  // contra un muro rodea: huir de frente a la pared lo desliza de lado (sin pasarla)
  const grid0 = h.g.world.grid;
  h.g.world.grid = { walkable: (x, z) => z < 20.5, lineOfSight: () => true };
  const wl = h.enemy({ hp: 1e6, pos: [0, 0, 20] });
  wl.applyCC('fear', 2, { src: h.p, from: new THREE.Vector3(0, 0, 18) });
  for (let t = 0; t < 0.5; t += DT) wl.update(DT);
  h.g.world.grid = grid0;
  assert.ok(Math.abs(wl.pos.x) > 0.3 && wl.pos.z < 20.5, `contra el muro, rodea (${wl.pos.x.toFixed(2)}, ${wl.pos.z.toFixed(2)})`);
  // a los jefes no los asusta: Quebranto (15 por s, como inmovilizar)
  const b = h.enemy({ hp: 1e7, boss: true, pos: [2, 0, 0] });
  const bx = b.pos.x;
  b.applyCC('fear', 2, { src: h.p });
  for (let t = 0; t < 0.3; t += DT) b.update(DT);
  assert.ok(!(b.fearT > 0) && b.pos.x <= bx + 1e-9, 'jefe: no huye');
  near(b.stagger, CM.staggerFromCC('fear', 2), 'jefe: Quebranto de asustar');
  near(b.stagger, 30, 'jefe: 15 por s × 2 s');
  console.log("applyCC('fear'): huye de su origen sin atacar (sobre el cebo, rodeando muros), rendimientos del canal duro; jefes → Quebranto ✓");
}

// ------------------------------------------------ 4) Quebranto: ralentización y desplazamiento reaplicados
{
  const h = hero('arquera', 20);
  // Grillete (Tiro Rastreador II): mod stagger 20 + ralentiza 50 % 8 s, un impacto por segundo
  const grillete = { id: 'vx91_grillete', tags: new Set(), slow: 8, slowPct: 50, stagger: 20 };
  const b = h.enemy({ hp: 1e9, boss: true });
  const per = [], total = () => b.stagger + CM.STAGGER_MAX * (b.staggerBreaks || 0);
  for (let i = 0; i < 3; i++) { const s0 = total(); applyHitEffects(h.g, h.p, b, grillete, 0); per.push(total() - s0); if (i < 2) b.tickStun(1); }
  near(per[0], 20 + 32, '1.er impacto: 20 + 8 s de ralentización');
  near(per[1], 20 + 4, 'reaplicado 1 s después: 20 + solo el segundo nuevo');
  near(per[2], 20 + 4, 'y así cada segundo');
  assert.equal(b.staggerBreaks, 1, 'a un impacto por segundo, el 3.º lo quiebra (antes, el 2.º: 52 + 52)');
  // ralentización continua: lo mismo que una sola tan larga como la cubierta
  const c = h.enemy({ hp: 1e9, boss: true, pos: [0, 0, 4] });
  for (let i = 0; i < 5; i++) { c.applyCC('slow', 8, { pct: 50, src: h.p }); c.tickStun(1); }
  near(c.stagger, CM.staggerFromCC('slow', 12, { pct: 50 }), '5 ralentizaciones de 8 s, 1 s entre ellas = 12 s cubiertos');
  // una < 30 % ni llena ni cubre
  const w = h.enemy({ hp: 1e9, boss: true, pos: [0, 0, -4] });
  w.applyCC('slow', 8, { pct: 20, src: h.p });
  w.applyCC('slow', 8, { pct: 50, src: h.p });
  near(w.stagger, 32, 'la de 20 % no cubre: la de 50 % llena entera');
  // desplazamiento: × (1 − dr), dr +0,5 por tirón y −0,1 por segundo
  const d = h.enemy({ hp: 1e9, boss: true, pos: [4, 0, 0] });
  const pulls = [];
  for (let i = 0; i < 5; i++) { const s0 = d.stagger; d.displace(h.p.pos, 4, { toward: true, src: h.p }); pulls.push(+(d.stagger - s0).toFixed(6)); d.tickStun(1); }
  assert.deepEqual(pulls, [20, 12, 4, 2, 2], `Arpón (4 m) a 1 tirón por segundo: ${pulls}`);
  d.tickStun(10);
  const s0 = d.stagger; d.displace(h.p.pos, 4, { toward: true, src: h.p });
  near(d.stagger - s0, 20, 'tras 10 s sin tirones, entero otra vez');
  // con la barra cerrada (Quebrantado y bloqueada) ni llena ni sube la resistencia ni cuenta la
  // ralentización como pagada: al reabrirse, el primer tirón rinde entero y la ralentización también
  const k = h.enemy({ hp: 1e9, boss: true, pos: [-4, 0, 0] });
  k.breakStagger();
  for (let t = 0; t < CM.STAGGER_BREAK_T + CM.STAGGER_LOCK_T - 0.5; t += 0.5) {
    k.displace(h.p.pos, 4, { toward: true, src: h.p });
    k.applyCC('slow', 8, { pct: 50, src: h.p });
    k.tickStun(0.5);
  }
  assert.ok(!k.staggerOpen() && k.stagger === 0, 'bloqueada: nada');
  k.tickStun(0.6);
  assert.ok(k.staggerOpen(), 'reabierta');
  const k0 = k.stagger; k.displace(h.p.pos, 4, { toward: true, src: h.p });
  near(k.stagger - k0, 20, 'primer tirón tras el bloqueo: entero');
  const k1 = k.stagger; k.applyCC('slow', 8, { pct: 50, src: h.p });
  near(k.stagger - k1, 32, 'y la ralentización, sus 8 s');
  // a un enemigo normal no le cambia nada (su dispDR de siempre)
  const n = h.enemy({ hp: 1e6, pos: [6, 0, 0] });
  near(n.displace(h.p.pos, 2, { toward: false, src: h.p }), 2, 'normal: 2 m');
  console.log('Quebranto: ralentización por segundos nuevos y desplazamiento con resistencia (jefes) ✓');
}

// ------------------------------------------------ 5) topes propios, innate.mod y stats nuevas
{
  // combat-math: drCapAdd 15 → 65 %, blockCapAdd 10 → 50 %; nunca por encima de CAPS_HARD
  const fire = { element: 'fire', rng: () => 0.99 };
  assert.equal(CM.mitigate(1000, { dr: 80 }, fire).dmg, 500, 'tope común 50 %');
  assert.equal(CM.mitigate(1000, { dr: 80, drCapAdd: 15 }, fire).dmg, 350, 'drCapAdd 15: 65 %');
  assert.equal(CM.drCapOf({ drCapAdd: 100 }), CM.CAPS_HARD.dr, 'tope duro');
  assert.equal(CM.mitigate(1000, { block: 70 }, { element: 'fire', rng: () => 0.45 }).blocked, false, 'bloqueo topado en 40');
  assert.equal(CM.mitigate(1000, { block: 70, blockCapAdd: 10 }, { element: 'fire', rng: () => 0.45 }).blocked, true, 'blockCapAdd 10: 50');
  near(CM.expectedMitigation({ block: 70, blockCapAdd: 10 }, 1, 'fire'), 1 - 0.5 * CM.blockReduction({}), 'esperado con el tope propio');
  // recompute: la innata (talentExtra.innate) sube los topes de stats.dr/block y Player.takeDamage los usa
  const h = hero('guerrero', 30);
  h.p.talentExtra.stats = { dr: 80, block: 70 }; h.p.recompute();
  assert.ok(h.p.stats.dr === 50 && h.p.stats.block === 40, 'sin innata: 50 y 40');
  // los topes propios SOLO desde la innata: como stat de nodo, objeto o era no suben nada
  h.p.talentExtra.stats = { dr: 80, block: 70, drCapAdd: 15, blockCapAdd: 10 }; h.p.recompute();
  assert.ok(h.p.stats.dr === 50 && h.p.stats.block === 40 && !h.p.stats.drCapAdd, 'como stat (no innata): sin efecto');
  assert.deepEqual([...INNATE_ONLY_STATS].sort(), ['blockCapAdd', 'drCapAdd'], 'INNATE_ONLY_STATS');
  h.p.talentExtra.stats = { dr: 80, block: 70 };
  h.p.talentExtra.innate = { drCapAdd: 15, blockCapAdd: 10 }; h.p.recompute();
  assert.ok(h.p.stats.dr === 65 && h.p.stats.block === 50, `Guardián: 65 y 50 (${h.p.stats.dr}, ${h.p.stats.block})`);
  // el mismo golpe con el tope común y con el propio: (1 − 0,65) / (1 − 0,5) = 0,7
  const loss = (innate) => {
    const x = hero('guerrero', 30);
    x.p.talentExtra.stats = { dr: 80 }; x.p.talentExtra.innate = innate; x.p.recompute();
    x.p.hp = x.p.stats.maxHP;
    x.p.takeDamage(200, 1, { element: "fire" });
    return x.p.stats.maxHP - x.p.hp;
  };
  const l0 = loss({}), l1 = loss({ drCapAdd: 15 });
  near(l1 / l0, 0.7, `Player.takeDamage con el tope propio (${l0} → ${l1})`, 0.02);
  // innate.mod: los mods de la especialización (Piel de Hierro del Guardián: 12 s y −50 %)
  const spec = talentTreesFor('guerrero').specs.find(s => s.id === 'guardian');
  const inn = spec.innate;
  // la innata real ya trae la Piel de Hierro (tanda 2, KAT-guerrero): «antes» es la innata sin mod
  const { mod: innMod, ...innBase } = inn;
  void innMod;
  const piel = (h2) => resolveSkill(h2.p, h2.p.cls.skills.find(s => s.id === 'g_piel'));
  const ber0 = piel(makeHarness({ classId: 'guerrero', level: 30, spec: 'berserker' }));
  try {
    spec.innate = innBase;
    const before = piel(makeHarness({ classId: 'guerrero', level: 30, spec: 'guardian' }));
    spec.innate = { ...innBase, mod: { g_piel: { durS: 4, buff: 25 }, '@defense': { cdr: 10 } } };
    const after = piel(makeHarness({ classId: 'guerrero', level: 30, spec: 'guardian' }));
    near(after.dur, before.dur + 4, 'Piel de Hierro: +4 s');
    near((after.mods.buff || 0) - (before.mods.buff || 0), 25, 'Piel de Hierro: +25 % de buff');
    near(after.buffMul / before.buffMul, (1 + after.mods.buff / 100) / (1 + (before.mods.buff || 0) / 100), 'y el perfil lo aplica');
    assert.equal((after.mods.cdr || 0) - (before.mods.cdr || 0), 10, 'selector @defense');
    // y no toca el saco de recompute (las stats del Guardián son las mismas con y sin innate.mod)
    const withMod = makeHarness({ classId: 'guerrero', level: 30, spec: 'guardian' }).p.stats;
    spec.innate = innBase;
    const noMod = makeHarness({ classId: 'guerrero', level: 30, spec: 'guardian' }).p.stats;
    assert.deepEqual(withMod, noMod, 'innate.mod no cambia ninguna stat (hpPct, block…)');
    spec.innate = { ...innBase, mod: { g_piel: { durS: 4, buff: 25 }, '@defense': { cdr: 10 } } };
    const other = piel(makeHarness({ classId: 'guerrero', level: 30, spec: 'berserker' }));
    assert.ok(other.dur === ber0.dur && (other.mods.buff || 0) === (ber0.mods.buff || 0), 'con otra especialización, nada');
  } finally { spec.innate = inn; }
  // stats de la cola W2d-A: pasan por recompute (con sus topes)
  h.p.talentExtra.stats = { costPct: -30, skillSpeedPct: 20 }; h.p.recompute();
  assert.ok(h.p.stats.costPct === -30 && h.p.stats.skillSpeedPct === 20, 'costPct y skillSpeedPct');
  h.p.talentExtra.stats = { costPct: -150, skillSpeedPct: 300 }; h.p.recompute();
  assert.ok(h.p.stats.costPct === -100 && h.p.stats.skillSpeedPct === CM.CAPS.aspd, 'topados (−100 y CAPS.aspd)');
  h.p.talentExtra.stats = { skillSpeedPct: -80 }; h.p.recompute();
  assert.equal(h.p.stats.skillSpeedPct, -50, 'y por abajo, −50 (como mucho la mitad de rápido)');
  console.log('Topes propios (drCapAdd/blockCapAdd), innate.mod con selectores y stats costPct/skillSpeedPct ✓');
}

// ------------------------------------------------ 6) trampa genérica
const TRAPS = [
  { id: 'vx91_cepo', name: 'Cepo', cat: 'utility', slots: ['k2'], tags: ['utility', 'trap', 'nature'], elem: 'nature', type: 'trap', coef: 0.6, cd: 0, range: 12, dur: 20,
    root: 2, hitDot: { kind: 'poison', coef: 0.6, dur: 5 }, trap: { armT: 0.2, maxArmed: 3, radius: 1.5 } },
  { id: 'vx91_det', name: 'Detonar', cat: 'spender', slots: ['rmb', 'k2'], tags: ['spender', 'area', 'fire'], elem: 'fire', type: 'area', at: 'target', coef: 0.2, cd: 0, range: 14, radius: 1 },
];
const trapHero = (level) => hero('arquera', level, { inject: { skills: TRAPS } });
const v3 = (x, z) => new THREE.Vector3(x, 0, z);
{
  // hitDot: al saltar, el DoT (no el golpe directo) y un ⑤ sin daño con hit.trap
  const h = trapHero(1);
  h.p.stats.wMin = h.p.stats.wMax = 1000;                      // arma fija: el veneno no se redondea a 1 por tic
  h.setSlot('k2', 'vx91_cepo'); h.aim(4, 0); h.press('k2'); h.release('k2');
  const [f] = h.g.fieldsOf(h.p, { kind: 'trampa' });
  h.step(0.3);
  const e = h.enemy({ hp: 1e6, pos: [4, 0, 0] });
  h.step(DT * 2);
  const spring = of(e, x => x.source === 'field:trampa');
  assert.ok(spring.length === 1 && spring[0].dealt === 0 && spring[0].trap?.uid === f.uid, '⑤ al saltar: sin daño, con hit.trap');
  assert.equal(e.hp, 1e6, 'sin golpe directo');
  assert.ok(e.rootT > 0, 'inmoviliza');
  const prof = h.p.resolved.vx91_cepo;
  const want = h.p.avgHit(prof.coef, prof.addPct) * prof.hitDot.coef / prof.coef;
  let [dot] = h.g.dotsOf(e, 'poison');
  assert.ok(dot && dot.source === 'vx91_cepo:poison' && dot.ticks === 10 && dot.interval === 0.5, 'veneno en tics de 0,5 s durante 5 s');
  near(dot.total, want, 'total = golpe de la trampa × hitDot.coef / coef', 0.05);
  h.step(1);
  const left1 = h.g.dotsOf(e, 'poison')[0].left;
  // otra trampa: se renueva, no se suma
  h.aim(4, 0); h.press('k2'); h.release('k2'); h.step(0.3);
  const dots = h.g.dotsOf(e, 'poison');
  assert.equal(dots.length, 1, 'un solo veneno');
  assert.ok(left1 < 10 && dots[0].left === 10, `renovado (${left1} → ${dots[0].left} tics)`);
  near(dots[0].remaining, dot.total, 'renovado: lo de un veneno nuevo, no la suma con lo pendiente', 0.05);
  console.log('Trampa: hitDot que se renueva en vez del golpe directo; ⑤ sin daño con hit.trap ✓');
}
{
  // con estallido: quien la pisa recibe el estallido (no además el golpe directo); rango y burstMul
  const h = trapHero(33);
  const mults = [];
  const deal = h.g.dealArea.bind(h.g);
  h.g.dealArea = (pos, r, mult, o) => { mults.push(mult); return deal(pos, r, mult, o); };
  const rk = CM.rankCoef(h.p.skills.vx91_cepo);
  assert.ok(rk > 1.3, 'rango 5 a Nv33');
  const trap = (x, data = {}) => h.g.spawnField('trampa', { pos: v3(x, 0), radius: 1, dur: 20, owner: h.p,
    data: { dmg: 100, coef: 0.6, skill: 'vx91_cepo', armT: 0, burst: { radius: 3, coef: 1 }, ...data } });
  trap(0);
  const e = h.enemy({ hp: 1e6, pos: [0, 0, 0] }), side = h.enemy({ hp: 1e6, pos: [2, 0, 0] });
  h.step(DT * 2);
  const mine = of(e, x => x.trap);
  assert.equal(mine.filter(x => x.dealt > 0).length, 1, 'quien la pisa: solo el estallido');
  assert.ok(mine.some(x => x.source === 'field:trampa' && x.dealt === 0), 'y el ⑤ del salto, sin daño');
  assert.equal(of(side, x => x.trap).length, 1, 'el vecino: el estallido');
  near(mults[0], 1 * rk, 'trap.burst.coef × rankCoef');
  e.alive = side.alive = false;
  trap(10, { rankMul: 2, burstMul: 0.5 });
  h.enemy({ hp: 1e6, pos: [10, 0, 0] });
  h.step(DT * 2);
  near(mults[1], 1 * 2 * 0.5, 'data.rankMul y data.burstMul');
  // data.rank (lo guarda game-skills al colocarla: W2d-A) manda sobre el rango del dueño: una trampa
  // de un eco o de una habilidad que el héroe no tiene en p.resolved escala con SU rango
  trap(13, { rank: 2 });
  h.enemy({ hp: 1e6, pos: [13, 0, 0] });
  h.step(DT * 2);
  assert.ok(CM.rankCoef(2) !== rk, 'rango 2 ≠ el del dueño');
  near(mults[2], CM.rankCoef(2), 'data.rank: × rankCoef(data.rank), no el rango de la habilidad del dueño');
  // detonar: el coef llega YA escalado (prof.detonate de skill-resolve, W2d-A) y detonateAt no lo
  // reescala; × burstMul de la trampa y × opts.rankMul si un poder pasa uno crudo
  mults.length = 0;
  trap(20, { burst: null, burstMul: 0.5 }); trap(-20);
  h.g.detonateAt(h.p, v3(20, 0), { radius: 2, coef: 1.3 }, { skill: 'vx91_det' });
  h.g.detonateAt(h.p, v3(-20, 0), { radius: 2, coef: 1 }, { skill: 'vx91_det', rankMul: 1.5 });
  h.step(TRAP_FLASH_T + 0.05);
  assert.ok(CM.rankCoef(h.p.skills.vx91_det) > 1, 'la habilidad que detona tiene rango > 1');
  near(mults[0], 1.3 * 0.5, 'detonate.coef tal cual (una sola vez el rango) × burstMul');
  near(mults[1], 1.5, 'opts.rankMul');
  // detonate.consume: false → estalla y se rearma
  const keep = trap(30, { burst: null, armT: 0.4 });
  h.g.detonateAt(h.p, v3(30, 0), { radius: 2, coef: 1, consume: false }, { skill: 'vx91_det' });
  h.step(TRAP_FLASH_T + 0.05);
  assert.ok(!keep.dead && !keep.sprung && !fieldArmed(keep), 'consume:false: sigue, rearmándose');
  h.step(0.45);
  assert.ok(fieldArmed(keep), 'y vuelve a estar armada');
  const gone = trap(40, { burst: null });
  h.g.detonateField(gone, { coef: 1, delay: 0, consume: false });
  assert.ok(!gone.dead, 'detonateField con consume:false');
  h.g.detonateField(gone, { coef: 1, delay: 0 });
  assert.ok(gone.dead, 'sin él, se gasta');
  // el ⑤ sin daño del salto es del héroe dueño: una trampa de otro dueño no lo emite
  const foe = h.enemy({ hp: 1e6, pos: [60, 0, 3] });
  h.g.spawnField('trampa', { pos: v3(50, 0), radius: 1, dur: 20, owner: foe, data: { dmg: 100, coef: 0.6, skill: 'vx91_cepo', armT: 0, hitDot: { kind: 'poison', coef: 0.6, dur: 5 } } });
  const mine2 = h.g.spawnField('trampa', { pos: v3(54, 0), radius: 1, dur: 20, owner: h.p, data: { dmg: 100, coef: 0.6, skill: 'vx91_cepo', armT: 0, hitDot: { kind: 'poison', coef: 0.6, dur: 5 } } });
  const s1 = h.enemy({ hp: 1e6, pos: [50, 0, 0] }), s2 = h.enemy({ hp: 1e6, pos: [54, 0, 0] });
  h.step(DT * 2);
  assert.ok(mine2.dead && of(s2, x => x.source === 'field:trampa').length === 1, 'la del héroe: su ⑤');
  assert.equal(of(s1, x => x.source === 'field:trampa').length, 0, 'la de otro dueño: sin ⑤');
  console.log('Trampa: estallido sin golpe directo, × rango (rankMul, data.rank o el de su habilidad) una vez, burstMul, detonar sin reescalar, consume:false y ⑤ solo del héroe ✓');
}

// ------------------------------------------------ 7) Punto Débil: una vez por enemigo cada 8 s
{
  const h = hero('arquera', 20);
  const mark = { id: 'vx91_pd', dur: 8, uses: 1, firstCharged: 30 };
  const prof = { id: 'vx91_rastreo', tags: new Set(), mark };
  const e = h.enemy({ hp: 1e6 });
  const tick = s => { for (let t = 0; t < s - 1e-9; t += 0.1) { h.p.simT += 0.1; e.tickStun(0.1); } };
  applyHitEffects(h.g, h.p, e, prof, 0);
  assert.equal(e.marks.vx91_pd.firstCharged, 30, 'la primera marca lleva el premio');
  tick(1);
  applyHitEffects(h.g, h.p, e, prof, 0);
  assert.equal(e.marks.vx91_pd.firstCharged, 30, 'remarcar sin gastarlo lo conserva');
  delete e.marks.vx91_pd;                                     // el primer tensado lo gastó (_releaseWith)
  tick(2);
  applyHitEffects(h.g, h.p, e, prof, 0);
  assert.ok(e.marks.vx91_pd && !e.marks.vx91_pd.firstCharged, 'remarcado a los 3 s: la marca sí, el premio no');
  tick(5.1);
  applyHitEffects(h.g, h.p, e, prof, 0);
  assert.equal(e.marks.vx91_pd.firstCharged, 30, 'a los 8 s, otra vez');
  const o = h.enemy({ hp: 1e6, pos: [0, 0, 3] });
  applyHitEffects(h.g, h.p, o, prof, 0);
  assert.equal(o.marks.vx91_pd.firstCharged, 30, 'por enemigo: otro enemigo lo tiene');
  // Rastreo Múltiple (mark.count 3, radius 4): la regla vale en CADA enemigo marcado, también en los
  // vecinos que reparte g.applyMark. t=0 sobre A (A, B y C con premio); t=2 sobre B: ninguno lo
  // recupera (A y C lo gastaron en t=0 y B lo guarda); t=3 sobre A: C, sin premio desde t=0, tampoco
  const multi = { id: 'vx91_multi', tags: new Set(), mark: { id: 'vx91_pm', dur: 6, uses: 1, firstCharged: 30, count: 3, radius: 4 } };
  const A = h.enemy({ hp: 1e6, pos: [20, 0, 0] }), B = h.enemy({ hp: 1e6, pos: [21, 0, 0] }), C = h.enemy({ hp: 1e6, pos: [20, 0, 1.5] });
  const fc = x => x.marks?.vx91_pm?.firstCharged ?? null;
  const tick2 = s => { for (let t = 0; t < s - 1e-9; t += 0.1) { h.p.simT += 0.1; for (const x of [A, B, C]) x.tickStun(0.1); } };
  applyHitEffects(h.g, h.p, A, multi, 0);
  assert.deepEqual([A, B, C].map(fc), [30, 30, 30], 't=0: los tres con premio');
  delete A.marks.vx91_pm; delete C.marks.vx91_pm;             // A y C lo gastan
  tick2(2);
  applyHitEffects(h.g, h.p, B, multi, 0);
  assert.deepEqual([A, B, C].map(fc), [null, 30, null], 't=2 sobre B: B conserva el suyo; A y C, la marca sin premio');
  tick2(1);
  applyHitEffects(h.g, h.p, A, multi, 0);
  assert.deepEqual([A, B, C].map(fc), [null, 30, null], 't=3 sobre A: igual');
  tick2(5.1);
  delete B.marks.vx91_pm;
  applyHitEffects(h.g, h.p, C, multi, 0);
  assert.deepEqual([A, B, C].map(fc), [30, 30, 30], 'a los 8 s del primero, otra vez en los tres');
  // la marca viva de OTRO héroe no le guarda el premio a este: cada héroe, su propia cuenta
  const p2 = { simT: h.p.simT, pos: h.p.pos.clone(), stats: {} };
  const D = h.enemy({ hp: 1e6, pos: [-20, 0, 0] });
  applyHitEffects(h.g, h.p, D, prof, 0);
  delete D.marks.vx91_pd;
  h.p.simT += 1; p2.simT = h.p.simT;
  applyHitEffects(h.g, p2, D, prof, 0);
  assert.ok(D.marks.vx91_pd.by === p2 && D.marks.vx91_pd.firstCharged === 30, 'otro héroe: su primera marca, con premio');
  h.p.simT += 1;
  applyHitEffects(h.g, h.p, D, prof, 0);
  assert.ok(D.marks.vx91_pd.by === h.p && D.marks.vx91_pd.firstCharged === null, 'la del otro no le vale: a los 2 s, sin premio');
  // preguntar dos veces en el mismo instante (applyHitEffects y g.applyMark) da lo mismo
  const q = h.enemy({ hp: 1e6, pos: [0, 0, -3] });
  assert.ok(q.firstChargedOk(h.p, 'vx91_q') && q.firstChargedOk(h.p, 'vx91_q'), 'mismo instante: idempotente');
  tick(0.5);
  assert.equal(q.firstChargedOk(h.p, 'vx91_q'), false, 'medio segundo después (sin marca viva): no');
  console.log('Punto Débil: el premio de la marca, una vez por enemigo y héroe cada 8 s aunque se remarque (también los vecinos de Rastreo Múltiple) ✓');
}

// ------------------------------------------------ 8) registro de estallidos con la clave de la trampa
{
  const h = trapHero(10);
  const put = (x, cluster) => h.g.spawnField('trampa', { pos: v3(x, 0), radius: 0.5, dur: 20, owner: h.p, data: { dmg: 10, coef: 0.6, skill: 'vx91_cepo', armT: 0, ...(cluster != null ? { cluster } : {}) } });
  const a = put(0, 77); put(0.6, 77); const lone = put(1.2);
  h.g.detonateAt(h.p, v3(0.6, 0), { radius: 2, coef: 1 }, { skill: 'vx91_det' });
  h.step(TRAP_FLASH_T + 0.05);
  const log = h.p.trapBursts;
  assert.ok(log.length === 3 && log.every(b => Number.isFinite(b.t) && Number.isFinite(b.x) && Number.isFinite(b.z)), 'entradas { t, x, z, key }');
  assert.deepEqual(log.map(b => b.key).sort(), [77, 77, lone.uid].sort(), 'clave: data.cluster o el uid');
  assert.ok(log.some(b => b.x === a.pos.x && b.z === a.pos.z) && log.some(b => b.x === lone.pos.x), 'donde estalló cada una');
  assert.equal(h.g.trapBurstsWithin(h.p, 1), 3, 'sin opciones: estallidos (como antes)');
  assert.equal(h.g.trapBurstsWithin(h.p, 1, { distinct: true }), 2, 'distinct: un Racimo cuenta como una');
  h.p.trapBursts.push(h.p.simT);                                // una entrada vieja (número)
  assert.ok(h.g.trapBurstsWithin(h.p, 1) === 4 && h.g.trapBurstsWithin(h.p, 1, { distinct: true }) === 3, 'las entradas numéricas cuentan solas');
  h.step(1.2);
  assert.equal(h.g.trapBurstsWithin(h.p, 1, { distinct: true }), 0, 'ventana de 1 s');
  console.log('Registro de estallidos: { t, x, z, key } y trapBurstsWithin(owner, s, { distinct }) ✓');
}

// ------------------------------------------------ 9) g.stopDash, g.expireField, dotsOf con interval
{
  const h = verbHarness('guerrero', { level: 30 });
  h.setSlot('k1', 'vx_carga');
  h.aim(8, 0); h.press('k1'); h.release('k1');
  h.step(0.3);
  assert.ok(h.p.dashMove, 'avanzando');
  const x0 = h.p.pos.x;
  assert.equal(h.g.stopDash(h.p), true, 'stopDash');
  h.step(0.2);
  assert.ok(!h.p.dashMove && Math.abs(h.p.pos.x - x0) < 1e-9 && x0 < 7, `se detiene donde está (${x0.toFixed(2)})`);
  assert.ok(h.p.planted, 'y llega (plant: llega plantado)');
  assert.equal(h.g.stopDash(h.p), false, 'sin avance, nada');
  // expireField: caduca ya (y el recuento de campos que mueven enemigos)
  const w = h.g.spawnField('muro', { pos: v3(0, 5), shape: 'line', a: v3(-2, 5), b: v3(2, 5), width: 1, dur: 10, owner: h.p, data: { blocks: true } });
  assert.ok(h.g._moveFields > 0);
  assert.equal(h.g.expireField(w), true);
  assert.ok(w.dead && h.g._moveFields === 0, 'muerto y fuera del recuento');
  assert.equal(h.g.expireField(w), false, 'dos veces, nada');
  // dotsOf: interval
  const e = h.enemy({ hp: 1e6, pos: [0, 0, 9] });
  h.g.applyDoT(e, 100, 4, 0.8, undefined, 'vx91:bleed');
  const [d] = h.g.dotsOf(e, 'bleed');
  assert.ok(d.interval === 0.8 && d.left * d.interval > 3, 'dotsOf: interval (left × interval = lo que queda)');
  console.log('g.stopDash, g.expireField y dotsOf con interval ✓');
}

// ------------------------------------------------ 10) poderes v1 que 2g saca
{
  const RETIRAR = ['m_aegis', 'm_judgment', 'm_deadeye', 'm_hunt', 'm_conflag', 'm_overload'];
  const used = new Set();
  for (const p of LEGENDARY_POWERS) used.add(p.id);
  for (const t of Object.values(TALENT_TREES)) for (const tree of [t.cls, ...t.specs, ...(t.hero || [])]) for (const n of tree.nodes)
    for (const fx of n.t === 'c' ? n.opts.map(o => o.fx || {}) : [n.fx || {}]) if (fx.power) used.add(fx.power);
  for (const board of Object.values(PARAGON_BOARDS)) for (const n of board) if (n.power) used.add(n.power);
  for (const e of ERA_MUTATORS) if (e.power) used.add(e.power);
  assert.deepEqual(RETIRAR.filter(id => used.has(id)), [], 'ningún nodo, legendario, tablero ni era los usa');
  assert.ok(used.has('m_berserk') && POWER_HOOKS.m_shatter, 'm_berserk (b0) y m_shatter se quedan');
  console.log(`Poderes v1 (${RETIRAR.join(', ')}): sin contenido que los use (se retiran cuando W-pruebas suelte test67/test60) ✓`);
}

console.log('\n✅ COLA W2d-B (básico de arma, clearCC, miedo, Quebranto, topes, innate.mod, trampas, Punto Débil, APIs) OK');
