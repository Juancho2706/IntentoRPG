// ============================================================
// Test 83 — CAMPOS del Paso 2 (2g): trampas, cebo, detonar, muro, seguir, topes, emisor,
// estela de avance y saltar a tu campo (docs/paso2-implementacion.md §3.6; field-entities.js)
// ============================================================
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { definePower } from '../js/powers.js';
import { insideField, fieldArmed, TRAP_FLASH_T } from '../js/field-entities.js';
import { resolveSkill } from '../js/skill-resolve.js';
import { verbHarness } from './fixtures/skills-verbs-sample.mjs';

const DT = 1 / 60;
const HITS = [];
definePower('vx_spy83', { name: 'espía de campos', onHit(g, p, e, hit) { HITS.push({ e, ...hit }); } });
const mk = (classId = 'arquera') => { HITS.length = 0; const h = verbHarness(classId, { level: 30, powers: ['vx_spy83'] }); h.p.stats.wMin = h.p.stats.wMax = 100; return h; };
const live = (h, kind, skill) => h.g.fieldsOf(h.p, { kind, skill });
const v3 = (x, z) => new THREE.Vector3(x, 0, z);

// ------------------------------------------------ 1) trampa ampliada: armado, salto, estallido, consumo, tope
{
  const h = mk();
  h.setSlot('k2', 'vx_cepo');
  h.aim(4, 0);
  assert.equal(h.press('k2'), true); h.release('k2');
  const [f] = live(h, 'trampa', 'vx_cepo');
  assert.ok(f && !fieldArmed(f), 'colocada, sin armar');
  const prey = h.enemy({ hp: 1e6, pos: [4, 0, 0] });
  const side = h.enemy({ hp: 1e6, pos: [6.2, 0, 0] });     // fuera del radio de disparo (1,5), dentro del estallido (3)
  h.step(0.3);
  assert.equal(prey.hp, 1e6, 'sin armar (0,5 s) no salta aunque esté encima');
  h.step(0.3);
  assert.ok(prey.hp < 1e6 && prey.rootT > 0, 'armada: golpea e inmoviliza al que la pisa');
  assert.ok(side.hp < 1e6, 'el estallido alcanza a los de alrededor');
  assert.ok(HITS.some(x => x.e === side && x.trap), 'HitInfo.trap en el estallido (golpe real: ⑤)');
  assert.equal(live(h, 'trampa').length, 0, 'consume: true → desaparece');
  assert.equal(h.g.trapBurstsWithin(h.p, 1), 1, 'registro de estallidos (Batida)');
  prey.alive = side.alive = false;
  // tope maxArmed 2: la más vieja cae (FIFO)
  for (const x of [4, 6, 8]) { h.aim(x, 6); h.press('k2'); h.release('k2'); h.step(0.25); }   // GCD 0,2 s
  const traps = live(h, 'trampa', 'vx_cepo');
  assert.deepEqual(traps.map(t => t.pos.x), [6, 8], 'maxArmed 2: cae la primera');
  console.log('Trampa: armado, salto, estallido real, consumo, maxArmed ✓');
}

// ------------------------------------------------ 2) cebo (lure): atrae a quien no pelea; élites más cerca; jefes no
{
  const h = mk();
  h.setSlot('k2', 'vx_cepo');
  h.aim(8, 0); h.press('k2'); h.release('k2');
  assert.ok(h.g._moveFields > 0, 'un cebo activa la corrección del movimiento enemigo');
  const far = h.enemy({ hp: 1e6, pos: [8, 0, 5] });          // a 5 m (radio 6)
  const elite = h.enemy({ hp: 1e6, rank: 'elite', pos: [8, 0, -5] });   // élite a 5 m (eliteRadius 3)
  const boss = h.enemy({ hp: 1e6, boss: true, pos: [4, 0, 0] });        // jefe a 4 m (boss: false)
  const fighter = h.enemy({ hp: 1e6, pos: [10.5, 0, 1] });   // pegado a ti, en combate (fuera del radio de la trampa)
  h.p.pos.set(10.5, 0, 2.5); fighter.aggroed = true;
  const start = [far, elite, boss, fighter].map(e => e.pos.clone());
  // el cebo actúa con la trampa ARMADA
  assert.equal(h.g.lureStep(far, DT), false, 'sin armar no atrae');
  h.step(0.6);
  for (let i = 0; i < 60; i++) for (const e of [far, elite, boss, fighter]) h.g.lureStep(e, DT);
  assert.ok(far.pos.distanceTo(v3(8, 0)) < start[0].distanceTo(v3(8, 0)) - 0.8, 'el común camina hacia la trampa');
  assert.ok(elite.pos.distanceTo(start[1]) < 1e-9, 'élite fuera de eliteRadius: no');
  assert.ok(boss.pos.distanceTo(start[2]) < 1e-9, 'jefe: no (boss: false)');
  assert.ok(fighter.pos.distanceTo(start[3]) < 1e-9, 'quien ya pelea cuerpo a cuerpo contigo: no');
  // por Enemy.update (el cebo sustituye a la IA mientras atrae)
  const z0 = far.pos.z;
  far.update(0.2);
  assert.ok(far.pos.z < z0, 'Enemy.update usa el cebo');
  console.log('Cebo: atrae a comunes, élites solo de cerca, ni jefes ni quien te pega ✓');
}

// ------------------------------------------------ 3) detonar: perTarget, cadena, parpadeo previo
{
  const h = mk();
  h.setSlot('k2', 'vx_mina'); h.setSlot('rmb', 'vx_detonante');
  for (const x of [5, 5.6, 6.2]) { h.aim(x, 0.4); h.press('k2'); h.release('k2'); h.step(0.25); }
  h.step(0.3);
  assert.equal(live(h, 'trampa', 'vx_mina').length, 3);
  const e = h.enemy({ hp: 1e6, pos: [5.6, 0, 2.2] });        // fuera del radio de disparo de las minas (1)
  h.step(0.1);
  assert.equal(e.hp, 1e6, 'nadie pisa las minas');
  h.aim(5.6, 2.2); h.press('rmb'); h.release('rmb');
  for (let i = 0; i < 60 && !HITS.some(x => x.skill === 'vx_detonante' && !x.trap); i++) h.step(DT);
  const mines = live(h, 'trampa', 'vx_mina');
  assert.ok(mines.length === 3 && mines.every(f => f.flashT > 0), 'al impactar, las trampas del radio parpadean (aún no estallan)');
  assert.ok(!HITS.some(x => x.trap), 'el estallido espera al parpadeo');
  h.step(TRAP_FLASH_T + 0.05);
  assert.equal(live(h, 'trampa', 'vx_mina').length, 0, 'las tres estallan');
  const trapHits = HITS.filter(x => x.e === e && x.trap).length;
  assert.equal(trapHits, 2, `perTarget 2: como mucho 2 estallidos por enemigo (${trapHits})`);
  assert.equal(h.g.trapBurstsWithin(h.p, 1), 3, '3 estallidos en 1 s (la Batida del Coto lo lee)');
  // cadena: detona la primera y salta a las que estén a 6 m de cada una
  const c = mk();
  c.setSlot('k2', 'vx_mina'); c.setSlot('rmb', 'vx_cadena');
  // minas a 2, 5 y 11,5 m (maxArmed 3): 2 → 5 a 3 m (cadena 6 m); 5 → 11,5 a 6,5 m (fuera)
  for (const x of [2, 5, 11.5]) { c.aim(x, 0); c.press('k2'); c.release('k2'); c.step(0.25); }
  c.step(0.3);
  c.aim(2, 0); c.press('rmb'); c.release('rmb');
  c.step(0.6);
  assert.deepEqual(live(c, 'trampa', 'vx_mina').map(f => f.pos.x), [11.5], 'la cadena salta a la de 3 m y no a la de 6,5 m');
  assert.equal(c.g.trapBurstsWithin(c.p, 1), 2);
  console.log('Detonar: perTarget, cadena por distancia, parpadeo previo, registro de estallidos ✓');
}

// ------------------------------------------------ 4) muro: bloquea (no a jefes) · zona que encierra
{
  const h = mk('maga');
  h.setSlot('k2', 'vx_muro');
  h.aim(5, 0); h.press('k2'); h.release('k2');
  const [w] = live(h, 'muro');
  assert.ok(w && w.shape === 'line', 'muro en línea');
  assert.ok(Math.abs(w.a.x - 5) < 1e-6 && Math.abs(w.b.x - 5) < 1e-6 && Math.abs(Math.abs(w.a.z - w.b.z) - 6) < 1e-6, 'perpendicular a la mira, 6 m');
  const e = h.enemy({ hp: 1e6, pos: [6, 0, 0] });
  const tryMove = (en, dx, dz) => { const bx = en.pos.x, bz = en.pos.z; en.pos.x += dx; en.pos.z += dz; h.g.constrainMove(en, bx, bz); return en.pos.clone(); };
  assert.ok(Math.abs(tryMove(e, -1.5, 0).x - 6) < 1e-9, 'no lo cruza');
  assert.ok(Math.abs(tryMove(e, -0.7, 0).x - 6) < 1e-9, 'ni se mete en su grosor');
  assert.ok(Math.abs(tryMove(e, 1, 0).x - 7) < 1e-9, 'alejarse sí');
  const out = h.enemy({ hp: 1e6, pos: [6, 0, 4.5] });          // pasa por fuera del extremo
  assert.ok(Math.abs(tryMove(out, -2, 0).x - 4) < 1e-9, 'rodearlo sí');
  const boss = h.enemy({ hp: 1e6, boss: true, pos: [6, 0, 1] });
  assert.ok(Math.abs(tryMove(boss, -2, 0).x - 4) < 1e-9, 'a los jefes no los para (blocks: true)');
  h.step(3.1);
  assert.equal(live(h, 'muro').length, 0);
  assert.equal(h.g._moveFields, 0, 'sin campos de movimiento, Enemy.update no paga nada');
  // zona que ENCIERRA (Jaula): no se sale, sí se entra
  h.setSlot('k2', 'vx_jaula');
  h.aim(0, 6); h.press('k2'); h.release('k2');
  const inn = h.enemy({ hp: 1e6, pos: [0, 0, 6] }), outer = h.enemy({ hp: 1e6, pos: [0, 0, 10] });
  assert.ok(Math.abs(tryMove(inn, 0, 3.5).z - 6) < 1e-9, 'no puede salir');
  assert.ok(Math.abs(tryMove(outer, 0, -2).z - 8) < 1e-9, 'entrar sí');
  console.log('Muro (no cruza, rodear sí, jefes sí) y Jaula (contain) ✓');
}

// ------------------------------------------------ 5) seguir y zoneMax · curación de zona
{
  const h = mk('guerrero');
  h.setSlot('rmb', 'vx_corona');
  h.press('rmb'); h.release('rmb');
  const [z] = live(h, 'zona', 'vx_corona');
  h.walk({ x: 1, z: 0 }, 0.5);
  h.step(DT);
  assert.ok(Math.abs(z.pos.x - h.p.pos.x) < 1e-6 && h.p.pos.x > 1, 'follow owner: la zona va contigo');
  for (let i = 0; i < 2; i++) { h.step(0.25); assert.equal(h.press('rmb'), true); h.release('rmb'); }
  assert.equal(live(h, 'zona', 'vx_corona').length, 2, 'zoneMax 2');
  assert.ok(!live(h, 'zona', 'vx_corona').includes(z), 'cae la más vieja');
  h.p.hp = h.p.stats.maxHP * 0.5;
  let healed = 0;
  const heal0 = h.p.healSkill.bind(h.p);
  h.p.healSkill = (n, src) => { const r = heal0(n, src); if (String(src).startsWith('field:vx_corona')) healed += r; return r; };
  h.step(1.05);                                    // 2 tics de 0,5 s por zona
  assert.ok(Math.abs(healed - h.p.stats.maxHP * 0.02 * 2) < 0.5, `healPct 2 %/s por zona, 2 zonas (${healed.toFixed(2)})`);
  console.log('Zona: follow, zoneMax, healPct ✓');
}

// ------------------------------------------------ 6) emisor: dispara desde su sitio con el perfil del lanzamiento
{
  const h = mk();
  const sk = h.p.cls.skills.find(s => s.id === 'vx_tercera');
  const prof = resolveSkill(h.p, sk);
  const ctx = h.g._makeCtx(h.p, sk, prof, 'k2', { sk, prof, slot: 'k2' }, { target: v3(0, 10), near: null, isEcho: false, echoMult: 0 });
  const e = h.enemy({ hp: 1e6, pos: [0, 0, 12] });
  const f = h.g.spawnField('emisor', { pos: v3(0, 5), radius: 1, dur: 3, owner: h.p, data: { every: 0.5, coef: 0.4, range: 10, ctx } });
  h.step(0.55, DT);
  assert.equal(f.shots, 1, 'cada 0,5 s');
  const pr = h.g.projectiles.at(-1);
  // 20 m/s durante ≤ 0,07 s: desde el emisor (z = 5) está entre 5 y 6,5; desde el héroe (z = 0), < 1,5
  assert.ok(pr.mesh.position.z > 5 && pr.mesh.position.z < 6.5, `el proyectil sale del emisor, no del héroe (z ${pr.mesh.position.z.toFixed(2)})`);
  h.step(1.2, DT);
  assert.ok(f.shots >= 3 && e.hp < 1e6, 'sigue disparando y acierta');
  assert.ok(HITS.some(x => x.e === e && x.skill === 'vx_tercera'), 'golpe atribuido a la habilidad');
  console.log('Emisor: cadencia, origen en el campo, golpe real ✓');
}

// ------------------------------------------------ 7) estela de un avance · saltar a tu campo
{
  const h = mk('guerrero');
  h.setSlot('k1', 'vx_sendero');
  h.aim(6, 0); h.press('k1'); h.release('k1');
  const [t] = live(h, 'zona', 'vx_sendero');
  assert.ok(t && t.shape === 'line', 'estela en línea');
  assert.ok(Math.abs(t.a.x) < 0.01 && Math.abs(t.b.x - h.p.pos.x) < 0.01 && h.p.pos.x > 5.5, 'del inicio al final del avance');
  assert.ok(insideField(t, v3(3, 0.5)) && !insideField(t, v3(3, 2)), 'grosor 1,5 m');
  h.p.hp = h.p.stats.maxHP * 0.5;
  let healed = 0;
  const heal0 = h.p.healSkill.bind(h.p);
  h.p.healSkill = (n, src) => { const r = heal0(n, src); if (src === 'field:vx_sendero') healed += r; return r; };
  h.step(1.05);
  assert.ok(Math.abs(healed - h.p.stats.maxHP * 0.03) < 0.5, `la estela cura (trail.heal 3 %/s: ${healed.toFixed(2)})`);
}
{
  const h = mk();
  h.setSlot('k1', 'vx_acecho'); h.setSlot('k2', 'vx_mina');
  h.aim(8, 0);
  const mp0 = h.p.mp;
  assert.equal(h.press('k1'), false, 'sin campo propio no se lanza'); h.release('k1');
  assert.ok(h.p.mp === mp0 && !(h.p.cds.vx_acecho > 0), 'ni coste ni enfriamiento');
  h.aim(8, 0); h.press('k2'); h.release('k2');
  h.step(0.3);
  h.aim(7, 1.5);
  assert.equal(h.press('k1'), true, 'salta a la trampa más cercana a la mira'); h.release('k1');
  h.step(0.6);
  assert.ok(Math.abs(h.p.pos.x - 8) < 0.05 && Math.abs(h.p.pos.z) < 0.05, `aterriza sobre la trampa (${h.p.pos.x.toFixed(2)}, ${h.p.pos.z.toFixed(2)})`);
  h.step(0.2);
  assert.equal(live(h, 'trampa', 'vx_mina').length, 0, 'detonate al llegar: estalla la trampa');
  console.log("Estela del avance y at:'ownField' ✓");
}

// ------------------------------------------------ 8) avance lento que arrastra, provoca y planta
{
  const h = mk('guerrero');
  h.setSlot('k1', 'vx_carga');
  const e = h.enemy({ hp: 1e6, pos: [2, 0, 0.8] });
  const off = h.enemy({ hp: 1e6, pos: [2, 0, 4] });
  h.aim(8, 0);
  assert.equal(h.press('k1'), true); h.release('k1');
  h.step(0.5);
  assert.ok(h.p.pos.x > 2.5 && h.p.pos.x < 6, `a mitad del avance (${h.p.pos.x.toFixed(2)})`);
  assert.ok(h.p.unstoppableT > 0 && h.p.castLock > 0, 'imparable y sin acciones durante el avance');
  h.walk({ x: 0, z: 1 }, 0.1);
  assert.ok(Math.abs(h.p.pos.z) < 1e-6, 'no se puede caminar mientras avanza');
  h.step(0.7);
  assert.ok(h.p.pos.x > 7.9, 'llega');
  assert.ok(e.pos.x > 6, `arrastra a los que encuentra (${e.pos.x.toFixed(2)})`);
  assert.ok(Math.abs(off.pos.x - 2) < 1e-9, 'fuera del ancho de arrastre no');
  assert.ok(e.tauntT > 0, 'provoca a los golpeados al llegar');
  assert.ok(h.p.planted, 'plant: llega plantado');
  console.log('Avance lento: arrastre, imparable, provocación y plantado ✓');
}

console.log('\n✅ CAMPOS 2g (trampa · cebo · detonar · muro · seguir · emisor · estela · saltar a tu campo) OK');
