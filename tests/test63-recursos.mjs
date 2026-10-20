// Paso 2b.0 — recursos con identidad (js/resources.js, docs/paso2-diseno.md §2)
//  Furia: 100, arranca a 0, sin regeneración, se gana golpeando Y recibiendo daño
//         (+1 por cada 2 % de vida perdida, tope 12/s), se pierde a 12/s tras 4 s
//  Maná:  100 + 2·Energía + 3·(Nv−1), arranca lleno, 2,5/s × (1 + Energía·0,02)
//  Energía: 60 fijo, arranca llena, 6/s PLANA (+energyRegen, tope +4), no lee atributos
//  Generación del básico: Tajo +10 (+2/extra, máx. 16) · Dardo +3 · Disparo +5
//  Pociones de recurso: Furia +40 · Maná +45 % · Energía +100 %
import assert from 'node:assert/strict';
import { RESOURCE_DEFS, resourceMax, resourceRegenRate, onHurtResource, tickResource, potionResourceAmount } from '../js/resources.js';
import { CLASSES } from '../js/data.js';
import { Player } from '../js/entities.js';
import { makeHarness } from './helpers/power-harness.mjs';

const approx = (a, b, e = 1e-6) => Math.abs(a - b) <= e;

// ---- definiciones (§2) ----
assert.equal(RESOURCE_DEFS.furia.maxBase, 100); assert.equal(RESOURCE_DEFS.furia.start, 0); assert.equal(RESOURCE_DEFS.furia.regen, 0);
assert.equal(RESOURCE_DEFS.furia.idleAfter, 4); assert.equal(RESOURCE_DEFS.furia.decay, 12); assert.equal(RESOURCE_DEFS.furia.hurtCapPerSec, 12);
assert.equal(RESOURCE_DEFS.mana.regen, 2.5); assert.equal(RESOURCE_DEFS.energia.maxBase, 60); assert.equal(RESOURCE_DEFS.energia.regen, 6);
assert.equal(CLASSES.guerrero.resource.id, 'furia'); assert.equal(CLASSES.maga.resource.id, 'mana'); assert.equal(CLASSES.arquera.resource.id, 'energia');
console.log('Definiciones de Furia/Maná/Energía (§2) ✓');

// ---- máximos y regeneración ----
assert.equal(resourceMax(RESOURCE_DEFS.mana, { ene: 22, level: 1 }), 144, 'Maná Nv1 ≈ 145');
assert.equal(resourceMax(RESOURCE_DEFS.mana, { ene: 22, level: 50 }), 100 + 44 + 147);
assert.equal(resourceMax(RESOURCE_DEFS.energia, { ene: 300, level: 50 }), 60, 'la Energía no escala con atributos ni nivel');
assert.equal(resourceMax(RESOURCE_DEFS.energia, { bonus: 50 }), 80, 'equipo hasta +20');
assert.ok(approx(resourceRegenRate(RESOURCE_DEFS.mana, { ene: 22 }), 2.5 * 1.44), 'Maná 2,5 × (1 + Energía·0,02)');
assert.equal(resourceRegenRate(RESOURCE_DEFS.energia, { ene: 400 }), 6, 'Energía 6/s plana: ignora el atributo Energía');
assert.equal(resourceRegenRate(RESOURCE_DEFS.energia, { energyRegen: 10 }), 10, 'energyRegen topado a +4/s');
assert.equal(resourceRegenRate(RESOURCE_DEFS.furia, { ene: 100 }), 0);
const mk = () => ({ ui: { spawnText() {}, message() {}, flashDamage() {} }, sfx() {}, addShake() {}, vibrate() {}, tip() {}, input: { joyDir: null, keyDir: null }, enemies: [], world: { grid: { walkable: () => true } } });
const pg = new Player(mk(), 'guerrero'), pm = new Player(mk(), 'maga'), pa = new Player(mk(), 'arquera');
assert.equal(pg.stats.maxMP, 100); assert.equal(pg.mp, 0, 'la Furia arranca a 0');
assert.equal(pm.stats.maxMP, 100 + 2 * pm.attributes.ene); assert.equal(pm.mp, pm.stats.maxMP, 'Maná lleno');
assert.equal(pa.stats.maxMP, 60); assert.equal(pa.mp, 60, 'Energía llena');
pa.attributes.ene += 50; pa.recompute();
assert.equal(pa.stats.maxMP, 60, 'el atributo Energía no da Energía a la Arquera');
console.log('Máximos y regeneración por clase ✓');

// ---- Furia: sin regeneración, pérdida tras 4 s, ganancia por daño recibido ----
pg.mp = 50; pg.furiaIdle = 0;
tickResource(pg, 3.9); assert.equal(pg.mp, 50, 'no se pierde antes de 4 s');
tickResource(pg, 1.0); assert.ok(approx(pg.mp, 50 - 12 * 1.0), 'tras 4 s se pierde a 12/s');
pg.mp = 0; pg._furyHurt = undefined;
const maxHP = pg.stats.maxHP;
onHurtResource(pg, maxHP * 0.10);                     // 10 % de vida perdida → +5
assert.ok(approx(pg.mp, 5), 'Furia +1 por cada 2 % de vida perdida: ' + pg.mp);
onHurtResource(pg, maxHP * 0.50);                     // pide +25, pero quedan 7 en la cubeta
assert.ok(approx(pg.mp, 12), 'tope de 12/s de Furia por daño recibido: ' + pg.mp);
tickResource(pg, 0.5); onHurtResource(pg, maxHP * 0.50);
assert.ok(approx(pg.mp, 18), 'la cubeta de Furia por daño se rellena a 12/s: ' + pg.mp);
// también por el camino real: Player.takeDamage
const pt = new Player(mk(), 'guerrero'); pt.mp = 0;
pt.takeDamage(Math.round(pt.stats.maxHP * 0.2), 1);
assert.ok(pt.mp > 0, 'recibir un golpe genera Furia');
const mana0 = pm.mp; pm.takeDamage(10, 1); assert.equal(pm.mp, mana0, 'el daño no genera Maná');
console.log('Furia: sin regeneración, pérdida a 12/s tras 4 s, +1 por 2 % de vida perdida (tope 12/s) ✓');

// ---- generación de los básicos (al acertar) ----
{
  const h = makeHarness({ classId: 'guerrero', level: 1 });
  const e1 = h.enemy({ hp: 99999, pos: [1.5, 0, 0] });
  h.p.basicAttack(e1);
  assert.equal(h.p.mp, 10, 'Tajo +10 contra un objetivo');
  h.p.mp = 0; h.p.atkCd = 0;
  h.enemy({ hp: 99999, pos: [2.2, 0, 0] }); h.enemy({ hp: 99999, pos: [1.5, 0, 1] }); h.enemy({ hp: 99999, pos: [1.5, 0, -1] }); h.enemy({ hp: 99999, pos: [2.5, 0, 0.5] });
  h.p.basicAttack(e1);
  assert.equal(h.p.mp, 16, 'Tajo +2 por objetivo extra, máx. +16: ' + h.p.mp);
}
for (const [cid, gen] of [['maga', 3], ['arquera', 5]]) {
  const h = makeHarness({ classId: cid, level: 1 });
  const e = h.enemy({ hp: 99999, pos: [0, 0, 4] });
  h.p.mp = 0;
  h.p.basicAttack(e);
  assert.equal(h.p.mp, 0, `${cid}: el recurso llega al impactar, no al disparar`);
  // solo vuelan los proyectiles (sin regeneración de por medio)
  for (let t = 0; t < 1; t += 1 / 60) for (let i = h.g.projectiles.length - 1; i >= 0; i--) if (h.g.projectiles[i].update(1 / 60)) h.g.projectiles.splice(i, 1);
  assert.equal(h.p.mp, gen, `${cid}: el básico genera +${gen} al impactar: ${h.p.mp}`);
}
console.log('Generación del básico: Tajo +10 (+2/extra, máx. 16) · Dardo +3 · Disparo +5 ✓');

// ---- pociones de recurso ----
assert.equal(potionResourceAmount(RESOURCE_DEFS.furia, 100), 40);
assert.equal(potionResourceAmount(RESOURCE_DEFS.mana, 200), 90);
assert.equal(potionResourceAmount(RESOURCE_DEFS.energia, 60), 60);
const pp = new Player(mk(), 'guerrero'); pp.mp = 0; pp.potions.mp = 1; pp.usePotion('mp');
assert.equal(pp.mp, 40, 'poción de Furia +40');
console.log('Pociones de recurso: Furia +40 · Maná +45 % · Energía +100 % ✓');
console.log('\n✅ RECURSOS CON IDENTIDAD OK');
