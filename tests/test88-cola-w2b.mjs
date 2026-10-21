// ============================================================
// Test 88 — COLA W2 del Paso 2 (punto 16 de docs/paso2-implementacion.md; docs/paso2-claves-w2.md §7)
// ============================================================
//  1) tv.drStill (Arquera f15A Quietud): reducción de daño quieta ≥ 1 s (p.stillT: sin desplazarte
//     por ningún medio; no es el plantado)
//  2) tv.fieldDur (Arquera m20 Ojo de Trampera): +% de duración de tus trampas y zarzales (campos
//     marcados data.fieldDur); nunca los de un enemigo ni una zona sin marca. Con habilidades
//     REALES: Bomba de Humo no se alarga y el Cerco de Zarzas inmoviliza mientras viva su campo
//  3) stats.blockPower (Guerrero d1 Escudo Alzado, d15B Aguante de Roca): un bloqueo para
//     50 % + blockPower, con tope 90 %, en el golpe con azar y en el esperado (y desde una postura)
//  2c) (al final) Bomba de Humo: la ceguera dura lo que el humo, con fieldDur y sin él
import assert from 'node:assert/strict';
import * as CM from '../js/combat-math.js';
import { NUCLEO_TV_KEYS } from '../js/skill-defs.js';
import { CORE_TV_KEYS } from '../js/talents.js';
import { firePower } from '../js/powers.js';
import { usesCoreTv, CORE_TV_POWER, DR_STILL_T } from '../js/powers-common.js';
import { defineField } from '../js/field-entities.js';
import { verbHarness } from './fixtures/skills-verbs-sample.mjs';

const DT = 1 / 60;
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;
const mk = (classId, tv = {}, opts = {}) => {
  const h = verbHarness(classId, { level: 30, ...opts });
  h.p.talentExtra.tv = tv; h.p.recompute();
  return h;
};
// daño recibido de un golpe (vida llena y sin escudos)
const taken = (h, n = 200) => { const p = h.p; p.hp = p.stats.maxHP; p.shields = []; p.takeDamage(n, 1); return p.stats.maxHP - p.hp; };

// ------------------------------------------------ claves en la fuente única
for (const k of ['drStill', 'fieldDur']) {
  assert.ok(NUCLEO_TV_KEYS.includes(k) && CORE_TV_KEYS.includes(k), `${k}: en NUCLEO_TV_KEYS y, por ella, en CORE_TV_KEYS`);
}
assert.equal(usesCoreTv({ drStill: 15 }), true, 'drStill activa nucleo_tv (la aplica su condDr)');
assert.equal(usesCoreTv({ fieldDur: 25 }), false, 'fieldDur la lee spawnField: no activa nucleo_tv');

// ------------------------------------------------ 1) tv.drStill (Quietud)
{
  const h = mk('arquera', { drStill: 15 });
  assert.ok(h.p.powers.has(CORE_TV_POWER), 'recompute añade nucleo_tv');
  const cond = () => firePower('condDr', h.p, h.p, { amount: 100, src: null });
  assert.equal(DR_STILL_T, 1, 'Quietud: «quieta más de 1 s»');
  h.stand(DR_STILL_T - 0.1);
  assert.equal(cond(), 0, 'quieta menos de 1 s: nada');
  h.stand(0.15);
  assert.equal(cond(), 15, 'quieta 1 s o más: −15 %');
  const quiet = taken(h);
  h.walk({ x: 1, z: 0 }, DT * 2);
  assert.ok(h.p.moving && cond() === 0, 'al moverte se pierde');
  const moving = taken(h);
  assert.ok(near(quiet / moving, 0.85, 0.02), `el golpe entra un 15 % más flojo quieta (${quiet} / ${moving})`);
  h.stand(0.5);
  assert.equal(cond(), 0, 'tras moverte vuelve a contar desde 0');
  h.stand(0.6);
  assert.equal(cond(), 15);
  // usar la movilidad también la rompe
  h.setSlot('k1', 'vx_paso'); h.aim(3, 0);
  h.press('k1'); h.release('k1');
  assert.equal(cond(), 0, 'un paso de movilidad la rompe');
  // cualquier desplazamiento entre fotogramas (rodar o un parpadeo de un comportamiento, un tirón)
  h.stand(1.1);
  assert.equal(cond(), 15);
  h.p.pos.x += 2;
  h.stand(DT);
  assert.equal(cond(), 0, 'desplazada sin caminar: vuelve a 0');
  // chocar contra un muro sin avanzar no la rompe
  h.stand(1.1);
  const walkable = h.g.world.grid.walkable;
  h.g.world.grid.walkable = () => false;
  h.walk({ x: 1, z: 0 }, 0.2);
  h.g.world.grid.walkable = walkable;
  assert.ok(!h.p.moving && cond() === 15, 'contra un muro sigue quieta');
  // llegar de un avance con plant: true (vx_carga) planta, pero no es «quieta»
  const c = mk('arquera', { drStill: 15 });
  const condC = () => firePower('condDr', c.p, c.p, { amount: 100, src: null });
  c.stand(1.1);
  c.setSlot('k1', 'vx_carga'); c.aim(8, 0);
  assert.equal(c.press('k1'), true); c.release('k1');
  c.step(1.1);
  assert.ok(c.p.planted && !c.p.dashMove && c.p.pos.x > 7.9, 'llega plantada');
  assert.equal(condC(), 0, 'plant: true al llegar no da Quietud');
  c.stand(0.5);
  assert.equal(condC(), 0);
  c.stand(0.6);
  assert.equal(condC(), 15, 'un segundo quieta tras llegar: sí');
  // Sin Pausa (keepPlanted): caminar mientras preparas sigue plantado, pero no es «quieta»
  const k = mk('guerrero', { drStill: 15 }, { forge: { vx_mandoble: { mejora: { name: 'Sin Pausa', line: 'x', mod: { keepPlanted: true } } } } });
  k.enemy({ hp: 1e7, pos: [1.5, 0, 0] });
  k.aim(1.5, 0); k.setSlot('rmb', 'vx_mandoble');
  k.stand(1.1);
  k.press('rmb'); k.release('rmb');
  k.walk({ x: 0, z: 1 }, 0.2);
  assert.ok(k.p.planted && k.p.moving, 'keepPlanted: plantado caminando');
  assert.equal(firePower('condDr', k.p, k.p, { amount: 100, src: null }), 0, 'plantado pero moviéndote: sin Quietud');
  // espejo de drMoving: nunca las dos a la vez
  const m = mk('arquera', { drStill: 15, drMoving: 10 });
  const condM = () => firePower('condDr', m.p, m.p, { amount: 100, src: null });
  m.stand(1.1);
  assert.equal(condM(), 15, 'quieta: solo drStill');
  m.walk({ x: 1, z: 0 }, 0.2);
  assert.equal(condM(), 10, 'moviéndote: solo drMoving');
  console.log('tv.drStill: quieta < 1 s no, ≥ 1 s sí; moverse, la movilidad, desplazarse o llegar plantada la rompen ✓');
}

// ------------------------------------------------ 2) tv.fieldDur (Ojo de Trampera)
{
  defineField('vx_campo88', { name: 'Campo de prueba' });
  const h = mk('arquera', { fieldDur: 50 });
  const p = h.p;
  // la trampa genérica (vx_cepo: dur 20)
  h.setSlot('k2', 'vx_cepo'); h.aim(6, 0);
  h.press('k2'); h.release('k2');
  const [trap] = h.g.fieldsOf(p, { kind: 'trampa', skill: 'vx_cepo' });
  assert.ok(trap && near(trap.dur, 30) && near(trap.t, 30), `trampa propia: 20 s → 30 s (${trap?.dur})`);
  // un zarzal: campo marcado data.fieldDur. De verdad dura más: vivo a los 5 s, caducado pasados los 6 s
  const at = { x: 0, z: 8 };
  const bramble = h.g.spawnField('zona', { pos: { x: -6, z: 0 }, dur: 4, owner: p, data: { fieldDur: true } });
  assert.ok(near(bramble.dur, 6), `zarzal propio (zona marcada): 4 s → 6 s (${bramble.dur})`);
  h.step(5);
  assert.ok(!bramble.dead, 'el zarzal sigue a los 5 s');
  h.step(1.1);
  assert.ok(bramble.dead, 'y caduca a los 6 s');
  // trampa de clase (data.trap) y campo de clase marcado
  assert.ok(near(h.g.spawnField('vx_campo88', { pos: at, dur: 4, owner: p, data: { trap: true } }).dur, 6), 'campo de clase con data.trap');
  assert.ok(near(h.g.spawnField('vx_campo88', { pos: at, dur: 4, owner: p, data: { fieldDur: true } }).dur, 6), 'campo de clase con data.fieldDur');
  // data.fieldDur: false deja fuera hasta una trampa
  assert.equal(h.g.spawnField('trampa', { pos: at, dur: 4, owner: p, data: { fieldDur: false } }).dur, 4, 'trampa con data.fieldDur false: igual');
  // una zona SIN marca no cambia: la de un tipo genérico (vx_jaula: dur 4), la Estela, ni los demás campos
  h.setSlot('k3', 'vx_jaula'); h.aim(-6, 0);
  h.press('k3'); h.release('k3');
  const [zone] = h.g.fieldsOf(p, { kind: 'zona', skill: 'vx_jaula' });
  assert.ok(zone && zone.dur === 4, `zona genérica sin marca: igual (${zone?.dur})`);
  for (const kind of ['zona', 'estela', 'vx_campo88', 'aura', 'muro', 'senuelo', 'emisor'])
    assert.equal(h.g.spawnField(kind, { pos: at, dur: 4, owner: p }).dur, 4, `${kind} sin marca: igual`);
  // nunca los de un enemigo (aunque traiga tv y marca) ni los que no tienen dueño
  const e = h.enemy({ hp: 1e6, pos: [3, 0, 3] });
  e.tv = { fieldDur: 100 };
  assert.equal(h.g.spawnField('zona', { pos: at, dur: 4, owner: e, data: { fieldDur: true } }).dur, 4, 'zarzal de un enemigo: igual');
  assert.equal(h.g.spawnField('trampa', { pos: at, dur: 4, owner: e }).dur, 4, 'trampa de un enemigo: igual');
  assert.equal(h.g.spawnField('trampa', { pos: at, dur: 4 }).dur, 4, 'sin dueño: igual');
  // un héroe del grupo, con su propio tv
  const ally = h.ally(2, 2, 1000, { tv: { fieldDur: 100 } });
  assert.equal(h.g.spawnField('trampa', { pos: at, dur: 4, owner: ally }).dur, 8, 'aliado del grupo: su propio fieldDur');
  // sin la clave, la duración del catálogo
  const n = mk('arquera');
  n.setSlot('k2', 'vx_cepo'); n.aim(6, 0);
  n.press('k2'); n.release('k2');
  assert.equal(n.g.fieldsOf(n.p, { kind: 'trampa' })[0].dur, 20, 'sin fieldDur: 20 s');
  assert.ok(!n.p.powers.has(CORE_TV_POWER) && !h.p.powers.has(CORE_TV_POWER), 'fieldDur sola no añade nucleo_tv');
  assert.equal(CM.fieldDurationWithTalents(8, { fieldDur: 25 }), 10, 'fórmula: dur × (1 + fieldDur/100)');
  console.log('tv.fieldDur: trampas y zarzales (marca) propios +%; zonas sin marca, enemigos y otros campos igual ✓');
}

// ------------------------------------------------ 2b) tv.fieldDur con habilidades REALES de la Arquera
// Ninguna habilidad queda desincronizada de sus campos: lo que no es trampa ni zarzal no cambia, los
// campos de un mismo lanzamiento duran lo mismo y el efecto de un zarzal dura lo que su campo
{
  // campos que deja un lanzamiento (Montaraz: así conoce también sus habilidades de especialización)
  const castFields = (tv, id, slot) => {
    const h = mk('arquera', tv, { spec: 'montaraz' });
    const before = new Set(h.g.fields || []);
    h.setSlot(slot, id); h.aim(0, 0);
    assert.equal(h.press(slot), true, `${id}: se lanza`); h.release(slot);
    h.step(0.5);
    return { h, fields: (h.g.fields || []).filter(f => !before.has(f) && f.owner === h.p && !f.dead) };
  };
  // Bomba de Humo: ni trampa ni zarzal. Lo que deje (su zona y, si va aparte, la ceguera) no se
  // alarga y dura lo mismo; que la ceguera dure lo que el humo lo mira §2c (al final)
  const humo0 = castFields({}, 'a_humo', 'k2'), humo = castFields({ fieldDur: 50 }, 'a_humo', 'k2');
  assert.ok(humo.fields.some(f => f.kind === 'zona' && f.data?.skill === 'a_humo'), `Bomba de Humo deja su zona (${humo.fields.map(f => f.kind)})`);
  assert.equal(humo.fields.length, humo0.fields.length, 'los mismos campos con fieldDur y sin él');
  assert.deepEqual(humo.fields.map(f => f.dur), humo0.fields.map(f => f.dur), 'Bomba de Humo no se alarga');
  assert.equal(new Set(humo.fields.map(f => f.dur)).size, 1, 'sus campos duran lo mismo');
  // Cerco de Zarzas (lo toca m20): cruzarlo inmoviliza mientras viva su campo, se alargue o no
  const { h, fields } = castFields({ fieldDur: 50 }, 'a_u_zarzas', 'k4');
  const ring = fields.find(f => f.data?.skill === 'a_u_zarzas');
  assert.ok(ring, `el Cerco deja su campo (${fields.map(f => f.kind)})`);
  const c = ring.pos;
  const e = h.enemy({ hp: 1e9, pos: [c.x + ring.radius + 2, 0, c.z] });
  h.step(Math.max(0, ring.t - 1));
  assert.ok(!ring.dead && ring.t > 0.5, 'a 1 s de cerrarse el zarzal sigue');
  e.pos.x = c.x + ring.radius - 2;                 // lo cruza
  h.step(0.3);
  assert.ok(e.rootT > 0, `cruzar el Cerco al final de su campo (${ring.dur} s) inmoviliza (rootT ${e.rootT})`);
  console.log('tv.fieldDur con habilidades reales: Bomba de Humo igual; el Cerco inmoviliza mientras vive ✓');
}

// ------------------------------------------------ 3) stats.blockPower (Escudo Alzado, Aguante de Roca)
{
  const hitBlocked = bp => CM.mitigate(1000, { block: 100, blockPower: bp }, { al: 1, rng: () => 0 });
  const r0 = hitBlocked(0), r30 = hitBlocked(30), r40 = hitBlocked(40), r60 = hitBlocked(60);
  assert.ok(r0.blocked && r0.dmg === 500, `sin blockPower el bloqueo para el 50 % (${r0.dmg})`);
  assert.ok(r30.blocked && r30.dmg === 200, `blockPower 30: para el 80 % (${r30.dmg})`);
  assert.equal(r40.dmg, 100, 'blockPower 40: 90 %');
  assert.equal(r60.dmg, 100, `blockPower 60: tope 90 %, un bloqueo nunca para todo (${r60.dmg})`);
  assert.equal(CM.mitigate(1000, { block: 0, blockPower: 60 }, { al: 1, rng: () => 0 }).dmg, 1000, 'sin bloquear no cambia nada');
  assert.ok(near(CM.blockReduction({}), 0.5) && near(CM.blockReduction({ blockPower: 30 }), 0.8) && near(CM.blockReduction({ blockPower: 60 }), CM.BLOCK_REDUCTION_MAX),
    'blockReduction: 0,5 · 0,8 · 0,9');
  // el esperado (banco y UI): 40 % de bloqueo (tope) × lo que para
  const ex = bp => CM.expectedMitigation({ block: 40, blockPower: bp }, 1);
  assert.ok(near(ex(0), 0.8) && near(ex(30), 0.68) && near(ex(60), 0.64), `esperado: ${ex(0)} · ${ex(30)} · ${ex(60)}`);
  // en el héroe: saco de stats de recompute (fx.stats de los nodos, buffs) y Player.takeDamage
  const h = mk('guerrero');
  h.p.talentExtra.stats = { block: 40, blockPower: 30 }; h.p.recompute();
  assert.equal(h.p.stats.blockPower, 30, 'fx.stats.blockPower llega a p.stats');
  h.p.combatRng = () => 0;                     // bloquea siempre (40 %)
  const t30 = taken(h, 400);
  h.p.talentExtra.stats = { block: 40 }; h.p.recompute();
  const t0 = taken(h, 400);
  assert.ok(near(t30 / t0, 0.4, 0.02), `bloqueado: pasa el 20 % en vez del 50 % (${t30} / ${t0})`);
  h.p.addBuff('vx_roca', { blockPower: 10 }, 5);
  assert.equal(h.p.stats.blockPower, 10, 'un buff también lo suma (Aguante de Roca con 5 cargas)');
  // una postura lo da sin recompute (STANCE_STATS y la fusión volátil de takeDamage)
  const wall = { id: 'vx_muro88', name: 'Muro 88', cat: 'defense', tags: ['defense', 'buff', 'physical'], type: 'stance', cd: 0,
    stance: { modes: [{ id: 'muro', name: 'Muro', stats: { block: 40, blockPower: 30 } }] } };
  const s = verbHarness('guerrero', { skills: [wall] });
  s.p.combatRng = () => 0;
  const s0 = taken(s, 200);                    // sin postura: no bloquea
  s.setSlot('k2', 'vx_muro88');
  assert.equal(s.press('k2'), true); s.release('k2');
  assert.equal(s.p.verbStats().blockPower, 30, 'la postura suma blockPower');
  assert.equal(s.p.stats.blockPower, 0, 'sin pasar por recompute');
  const s30 = taken(s, 200);
  assert.ok(near(s30 / s0, 0.2, 0.02), `en postura el bloqueo para el 80 % (${s30} / ${s0})`);
  console.log('stats.blockPower: 50 % → 80 % → tope 90 %, golpe y esperado, recompute, buffs y posturas ✓');
}

// ------------------------------------------------ 2c) Bomba de Humo: la ceguera dura lo que el humo
// (docs/paso2g-arquera.md, a_humo: nube de 4 m y 8 s; dentro, −50 % de daño recibido; los enemigos,
// cegados, pegan −blindPct %). Al final del archivo para que las demás secciones corran aunque falle
{
  for (const tv of [{}, { fieldDur: 50 }]) {
    const h = mk('arquera', tv, { spec: 'montaraz' });
    const sk = h.p.cls.skills.find(s => s.id === 'a_humo');
    assert.ok(sk.blindPct > 0, 'la Bomba de Humo ciega (blindPct del catálogo)');
    h.setSlot('k2', 'a_humo'); h.aim(0, 0);
    assert.equal(h.press('k2'), true); h.release('k2');
    const zone = (h.g.fields || []).find(f => !f.dead && f.kind === 'zona' && f.owner === h.p && f.data?.skill === 'a_humo');
    assert.ok(zone, 'la zona del humo');
    const e = h.enemy({ hp: 1e9, pos: [zone.pos.x + 1, 0, zone.pos.z] });
    const blind = 1 - sk.blindPct / 100, at = JSON.stringify(tv);
    h.step(0.5);
    assert.ok(near(e.outDmgMul(), blind, 1e-3), `${at}: el enemigo dentro pega −${sk.blindPct} % (×${e.outDmgMul()})`);
    h.step(Math.max(0, zone.t - 0.3));
    assert.ok(!zone.dead && near(e.outDmgMul(), blind, 1e-3), `${at}: sigue ciego al final del humo (×${e.outDmgMul()}, quedan ${zone.t.toFixed(2)} s)`);
    h.step(1.2);
    assert.ok(zone.dead && e.outDmgMul() === 1, `${at}: disipado el humo, ya no (×${e.outDmgMul()})`);
  }
  console.log('Bomba de Humo: la ceguera (−blindPct %) dura lo que el humo, con fieldDur y sin él ✓');
}

console.log('\n✅ COLA W2 (drStill · fieldDur · blockPower) OK');
