// ============================================================
// Test 84 — MOVIMIENTO y CONTROL del Paso 2 (docs/paso2-implementacion.md §3.6, §3.7, D20)
// ============================================================
//  1) moveMul: preparación con movimiento, Π de multiplicadores, 0 = quieto, con duración
//  2) plantado: 1 s sin caminar; caminar o usar movilidad lo rompe; keepPlanted (Sin Pausa)
//  3) desplazar: atraer/empujar acotado, rendimientos decrecientes, élites ×0,6, jefes →
//     Quebranto (combat-math), no atraviesa muros
//  4) minHpPct / endHealPct (Furia Inmortal): suelo de vida salvo golpes unavoidable
//  5) rendimiento: recompute no rehace la definición forjada ni los stats de postura
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { DISPLACE_DR, staggerFromDisplace, STAGGER_PER_DISPLACE_M } from '../js/combat-math.js';
import { VERB_DEFAULTS } from '../js/skill-defs.js';
import { forgedDef } from '../js/skill-resolve.js';
import { verbHarness } from './fixtures/skills-verbs-sample.mjs';

const DT = 1 / 60;
const mk = (classId = 'guerrero', opts = {}) => verbHarness(classId, { level: 30, ...opts });
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;

// ------------------------------------------------ 1) moveMul
{
  const h = mk();
  h.enemy({ hp: 1e7, pos: [1.5, 0, 0] });
  h.aim(1.5, 0); h.setSlot('rmb', 'vx_mandoble');
  // referencia: 0,3 s caminando sin nada
  const x0 = h.p.pos.z;
  h.walk({ x: 0, z: 1 }, 0.3);
  const free = h.p.pos.z - x0;
  h.p.pos.set(0, 0, 0);
  assert.equal(h.press('rmb'), true); h.release('rmb');
  assert.ok(near(h.p.moveMulProduct(), 0.5), 'preparando: moveMul 0,5');
  h.walk({ x: 0, z: 1 }, 0.3);
  const slow = h.p.pos.z;
  assert.ok(near(slow / free, 0.5, 0.06), `te mueves al 50 % mientras preparas (${(slow / free).toFixed(3)})`);
  h.step(0.2);
  assert.ok(near(h.p.moveMulProduct(), 1), 'acaba la preparación: velocidad normal');
  // Π y quieto
  h.p.setMoveMul('a', 0.5); h.p.setMoveMul('b', 0.8);
  assert.ok(near(h.p.moveMulProduct(), 0.4), 'Π de multiplicadores');
  h.p.setMoveMul('c', 0);
  const z0 = h.p.pos.z;
  h.walk({ x: 0, z: 1 }, 0.2);
  assert.ok(near(h.p.pos.z, z0) && !h.p.moving, 'moveMul 0: quieto');
  h.p.clearMoveMul('a'); h.p.clearMoveMul('b'); h.p.clearMoveMul('c');
  h.p.setMoveMul('d', 0.5, 0.25);
  h.step(0.3);
  assert.ok(near(h.p.moveMulProduct(), 1), 'con duración: caduca solo');
  console.log('moveMul: preparación, Π, quieto, duración ✓');
}

// ------------------------------------------------ 2) plantado (D20)
{
  const h = mk();
  h.stand(VERB_DEFAULTS.plantedAfter - 0.1);
  assert.ok(!h.p.planted, 'aún no');
  h.stand(0.15);
  assert.ok(h.p.planted, `plantado tras ${VERB_DEFAULTS.plantedAfter} s quieto`);
  h.walk({ x: 1, z: 0 }, DT * 2);
  assert.ok(!h.p.planted && h.p.plantedT < 0.05, 'caminar lo rompe');
  h.stand(1.1);
  assert.ok(h.p.planted);
  h.setSlot('k1', 'vx_paso'); h.aim(3, 0);
  h.press('k1'); h.release('k1');
  assert.ok(!h.p.planted, 'usar la movilidad lo rompe');
  // keepPlanted (Sin Pausa): una preparación con la clave deja caminar sin romperlo
  const k = mk('guerrero', { forge: { vx_mandoble: { mejora: { name: 'Sin Pausa', line: 'x', mod: { keepPlanted: true } } } } });
  k.enemy({ hp: 1e7, pos: [1.5, 0, 0] });
  k.aim(1.5, 0); k.setSlot('rmb', 'vx_mandoble');
  k.stand(1.1);
  assert.ok(k.p.planted);
  k.press('rmb'); k.release('rmb');
  k.walk({ x: 0, z: 1 }, 0.3);
  assert.ok(k.p.planted, 'keepPlanted: preparando y caminando sigue plantado');
  k.step(0.2);
  k.walk({ x: 0, z: 1 }, 0.1);
  assert.ok(!k.p.planted, 'sin preparación, caminar lo rompe');
  console.log('Plantado: 1 s, caminar/movilidad lo rompen, keepPlanted ✓');
}

// ------------------------------------------------ 3) desplazar
{
  const h = mk();
  const p = h.p;
  const e = h.enemy({ hp: 1e7, pos: [5, 0, 0] });
  const moved = e.displace(p.pos, 3, { toward: true, src: p });
  assert.ok(near(moved, 3, 1e-6) && near(e.pos.x, 2), `atraer 3 m (${e.pos.x})`);
  assert.ok(near(e.dispDR, DISPLACE_DR.add), 'suma resistencia');
  const m2 = e.displace(p.pos, 3, { toward: true, src: p });
  assert.ok(near(m2, Math.min(3 * (1 - DISPLACE_DR.add), 2 - 0.8), 1e-6), `atraer acota a 0,8 m de ti y decrece (${m2})`);
  e.pos.set(5, 0, 0);
  const k1 = e.displace(p.pos, 2, { src: p });
  assert.ok(near(k1, 2 * (1 - 2 * DISPLACE_DR.add), 1e-6), `empujar con rendimientos decrecientes (${k1})`);
  e.tickStun(10);
  assert.equal(e.dispDR, 0, 'la resistencia decae');
  e.dispDR = 0.95;
  assert.equal(e.displace(p.pos, 3, { src: p }), 0, 'inmune con ≥ 0,9');
  // élite ×0,6
  const el = h.enemy({ hp: 1e7, rank: 'elite', pos: [0, 0, 5] });
  assert.ok(near(el.displace(p.pos, 2, { src: p }), 1.2, 1e-6), 'élites: ×0,6');
  // jefe: no se mueve, llena Quebranto
  const b = h.enemy({ hp: 1e7, boss: true, pos: [0, 0, -5] });
  const bz = b.pos.z;
  assert.equal(b.displace(p.pos, 2, { src: p }), 0);
  assert.ok(near(b.pos.z, bz) && near(b.stagger, staggerFromDisplace(2)) && near(staggerFromDisplace(2), 2 * STAGGER_PER_DISPLACE_M), `jefe: Quebranto ${b.stagger}`);
  // no atraviesa paredes (casilla no transitable a x < 3)
  h.g.world.grid = { walkable: (x) => x >= 3, lineOfSight: () => true };
  const w = h.enemy({ hp: 1e7, pos: [6, 0, 3] });
  w.displace(new THREE.Vector3(10, 0, 3), 6, { src: p });
  assert.ok(w.pos.x >= 3 - 1e-9 && w.pos.x < 3.5, `se para contra la pared (${w.pos.x.toFixed(2)})`);
  h.g.world.grid = { walkable: () => true, lineOfSight: () => true };
  // por la habilidad: vx_tiron atrae a los del radio hacia ti, vx_empuje los aleja
  const t = mk();
  const a1 = t.enemy({ hp: 1e7, pos: [5, 0, 0] });
  t.setSlot('rmb', 'vx_tiron'); t.press('rmb'); t.release('rmb');
  // (el golpe además lo sacude unos centímetros: retroceso de impacto de Enemy.takeDamage)
  assert.ok(a1.pos.x > 1.8 && a1.pos.x < 2.4, `Tirón: atrae 3 m (${a1.pos.x.toFixed(2)})`);
  t.step(0.3);
  t.setSlot('rmb', 'vx_empuje'); a1.dispDR = 0;
  t.press('rmb'); t.release('rmb');
  assert.ok(a1.pos.x > 4.7 && a1.pos.x < 5.6, `Empuje: aleja 3 m (${a1.pos.x.toFixed(2)})`);
  console.log('Desplazar: acotado, DR, élites ×0,6, jefes → Quebranto, paredes ✓');
}

// ------------------------------------------------ 4) vida mínima y cura al acabar
{
  const h = mk();
  const p = h.p;
  h.setSlot('k2', 'vx_inmortal');
  assert.equal(h.press('k2'), true); h.release('k2');
  assert.equal(p.minHpFloor(), p.stats.maxHP * 0.2, 'minHpPct 20 (no escala con el rango)');
  p.hp = p.stats.maxHP * 0.5;
  p.takeDamage(p.stats.maxHP * 5, 1);
  assert.ok(near(p.hp, p.stats.maxHP * 0.2, 1) && p.alive, `no baja del 20 % (${p.hp})`);
  p.takeDamage(p.stats.maxHP * 5, 1, { unavoidable: true });
  assert.ok(p.hp < p.stats.maxHP * 0.2, 'un golpe unavoidable sí');
  // cura al acabar (endHealPct 10)
  const q = mk();
  q.setSlot('k2', 'vx_inmortal');
  q.press('k2'); q.release('k2');
  q.p.hp = q.p.stats.maxHP * 0.3;
  q.step(3.9);
  const before = q.p.hp;
  q.step(0.2);
  const gained = q.p.hp - before;
  assert.ok(gained >= q.p.stats.maxHP * 0.1 - 1, `al acabar cura un 10 % (${gained.toFixed(1)})`);
  console.log('minHpPct (unavoidable lo ignora) y endHealPct ✓');
}

// ------------------------------------------------ 5) recompute: cachés de forja y de postura
{
  const forge = { vx_corazon: { mejora: { name: 'x', line: 'x', add: { radius: 1 } } } };
  const h = mk('guerrero', { forge });
  const sk = h.p.cls.skills.find(s => s.id === 'vx_corazon');
  // la definición forjada se calcula una vez y se reutiliza entre recompute (caché p.forged)
  const f1 = forgedDef(h.p, sk);
  for (let i = 0; i < 1000; i++) h.p.recompute();
  const f2 = forgedDef(h.p, sk);
  assert.equal(f1, f2, 'mil recompute sin cambios: la misma definición forjada (no se rehace)');
  assert.equal(f1.radius, 5, 'Mejora aplicada (radio 4 + 1)');
  h.p.level = 2; h.p.recompute();          // por debajo de req+3: sin Mejora
  assert.equal(forgedDef(h.p, sk), sk, 'bajo el nivel de la Mejora: la definición base');
  h.p.level = 30; h.p.recompute();
  assert.equal(forgedDef(h.p, sk).radius, 5);
  // stats de postura: caché hasta el cambio de modo (sin recompute)
  h.setSlot('k2', 'vx_guardia');
  h.press('k2'); h.release('k2');
  const vs = h.p.verbStats();
  assert.equal(h.p.verbStats(), vs, 'verbStats en caché');
  h.step(1.1); h.press('k2'); h.release('k2');
  assert.notEqual(h.p.verbStats(), vs, 'cambiar de modo invalida la caché');
  assert.equal(h.p.verbStats().dmgPct, 25);
  console.log('recompute: definición forjada y stats de postura en caché ✓');
}

console.log('\n✅ MOVIMIENTO Y CONTROL (moveMul · plantado · desplazar · minHpPct · cachés) OK');
