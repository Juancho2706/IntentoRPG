// ============================================================
// Test 88 — COLA W2 del Paso 2 (punto 16 de docs/paso2-implementacion.md; docs/paso2-claves-w2.md §7)
// ============================================================
//  1) tv.drStill (Arquera f15A Quietud): reducción de daño quieta ≥ 1 s (plantada y sin moverse)
//  2) tv.fieldDur (Arquera m20 Ojo de Trampera): +% de duración de tus trampas y zonas; nunca las
//     de un enemigo ni los campos que no son trampa ni zona
//  3) stats.blockPower (Guerrero d1 Escudo Alzado, d15B Aguante de Roca): un bloqueo para
//     50 % + blockPower, con tope 90 %, en el golpe con azar y en el esperado
import assert from 'node:assert/strict';
import * as CM from '../js/combat-math.js';
import { VERB_DEFAULTS, NUCLEO_TV_KEYS } from '../js/skill-defs.js';
import { CORE_TV_KEYS } from '../js/talents.js';
import { firePower } from '../js/powers.js';
import { usesCoreTv, CORE_TV_POWER } from '../js/powers-common.js';
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
  h.stand(VERB_DEFAULTS.plantedAfter - 0.1);
  assert.equal(VERB_DEFAULTS.plantedAfter, 1, 'el plantado (D20) es «quieta 1 s»');
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
  console.log('tv.drStill: quieta < 1 s no, ≥ 1 s sí, moverse o la movilidad la rompen, keepPlanted no cuenta ✓');
}

// ------------------------------------------------ 2) tv.fieldDur (Ojo de Trampera)
{
  defineField('vx_campo88', { name: 'Campo de prueba' });
  const h = mk('arquera', { fieldDur: 50 });
  const p = h.p;
  // trampa y zona por sus tipos genéricos (vx_cepo: dur 20 · vx_jaula: dur 4)
  h.setSlot('k2', 'vx_cepo'); h.aim(6, 0);
  h.press('k2'); h.release('k2');
  const [trap] = h.g.fieldsOf(p, { kind: 'trampa', skill: 'vx_cepo' });
  assert.ok(trap && near(trap.dur, 30) && near(trap.t, 30), `trampa propia: 20 s → 30 s (${trap?.dur})`);
  h.step(0.25);
  h.setSlot('k3', 'vx_jaula'); h.aim(-6, 0);
  h.press('k3'); h.release('k3');
  const [zone] = h.g.fieldsOf(p, { kind: 'zona', skill: 'vx_jaula' });
  assert.ok(zone && near(zone.dur, 6), `zona propia: 4 s → 6 s (${zone?.dur})`);
  // de verdad dura más: viva a los 5 s, caducada pasados los 6 s
  h.step(5);
  assert.ok(!zone.dead, 'la zona sigue a los 5 s');
  h.step(1.1);
  assert.ok(zone.dead, 'y caduca a los 6 s');
  // estela, campo de clase marcado como trampa (data.trap) o como zona (data.zone)
  const at = { x: 0, z: 8 };
  assert.ok(near(h.g.spawnField('estela', { pos: at, dur: 4, owner: p }).dur, 6), 'estela propia: +50 %');
  assert.ok(near(h.g.spawnField('vx_campo88', { pos: at, dur: 4, owner: p, data: { trap: true } }).dur, 6), 'campo de clase con data.trap');
  assert.ok(near(h.g.spawnField('vx_campo88', { pos: at, dur: 4, owner: p, data: { zone: true } }).dur, 6), 'campo de clase con data.zone');
  // lo que no es trampa ni zona no cambia
  assert.equal(h.g.spawnField('vx_campo88', { pos: at, dur: 4, owner: p }).dur, 4, 'campo de clase sin marca: igual');
  for (const kind of ['aura', 'muro', 'senuelo', 'emisor'])
    assert.equal(h.g.spawnField(kind, { pos: at, dur: 4, owner: p }).dur, 4, `${kind}: igual`);
  // nunca los de un enemigo (aunque traiga tv) ni los que no tienen dueño
  const e = h.enemy({ hp: 1e6, pos: [3, 0, 3] });
  e.tv = { fieldDur: 100 };
  assert.equal(h.g.spawnField('zona', { pos: at, dur: 4, owner: e }).dur, 4, 'zona de un enemigo: igual');
  assert.equal(h.g.spawnField('trampa', { pos: at, dur: 4, owner: e }).dur, 4, 'trampa de un enemigo: igual');
  assert.equal(h.g.spawnField('zona', { pos: at, dur: 4 }).dur, 4, 'sin dueño: igual');
  // un héroe del grupo, con su propio tv
  const ally = h.ally(2, 2, 1000, { tv: { fieldDur: 100 } });
  assert.equal(h.g.spawnField('zona', { pos: at, dur: 4, owner: ally }).dur, 8, 'aliado del grupo: su propio fieldDur');
  // sin la clave, la duración del catálogo
  const n = mk('arquera');
  n.setSlot('k2', 'vx_cepo'); n.aim(6, 0);
  n.press('k2'); n.release('k2');
  assert.equal(n.g.fieldsOf(n.p, { kind: 'trampa' })[0].dur, 20, 'sin fieldDur: 20 s');
  assert.ok(!n.p.powers.has(CORE_TV_POWER) && !h.p.powers.has(CORE_TV_POWER), 'fieldDur sola no añade nucleo_tv');
  assert.equal(CM.fieldDurationWithTalents(8, { fieldDur: 25 }), 10, 'fórmula: dur × (1 + fieldDur/100)');
  console.log('tv.fieldDur: trampas y zonas propias +%, enemigos y otros campos igual ✓');
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
  console.log('stats.blockPower: 50 % → 80 % → tope 90 %, golpe y esperado, recompute y buffs ✓');
}

console.log('\n✅ COLA W2 (drStill · fieldDur · blockPower) OK');
