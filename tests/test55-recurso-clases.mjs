// Paso 2b.0 — kit de 6 ranuras con categoría y recurso por clase (reescrito)
//  1) cada clase: recurso de §2, básico de arma generador, catálogo por categorías
//     (desde js/skills-<clase>.js) y vista `tree` derivada para la UI previa al 2d
//  2) las habilidades se aprenden SOLAS por nivel (sin compra de rangos)
//  3) hotbar con categoría: normalizeHotbar/assignHotbar validan CAT_SLOTS (k2 flexible)
//  4) el básico GENERA recurso al acertar; Furia arranca a 0 y Maná/Energía llenos
//  5) al subir de nivel, la habilidad nueva se coloca sola si su ranura está libre
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CLASSES } from '../js/data.js';
import { GUERRERO_SKILLS } from '../js/skills-guerrero.js';
import { MAGA_SKILLS } from '../js/skills-maga.js';
import { ARQUERA_SKILLS } from '../js/skills-arquera.js';
import { Player, Enemy } from '../js/entities.js';
import { scaleEnemy, pickEnemyDef } from '../js/data.js';
import { buildDungeon } from '../js/world.js';
import { makeHarness } from './helpers/power-harness.mjs';

globalThis.performance = globalThis.performance || { now: () => Date.now() };

// --- 1) recurso, básico, catálogo por clase ---
const SRC = { guerrero: GUERRERO_SKILLS, maga: MAGA_SKILLS, arquera: ARQUERA_SKILLS };
const RES = { guerrero: 'furia', maga: 'mana', arquera: 'energia' };
for (const c of Object.values(CLASSES)) {
  assert.equal(c.resource.id, RES[c.id], `${c.id}: recurso de §2`);
  // catálogo BASE + activas de talento (kind 'talent', desde talents-<clase>.js; Paso 2c.0) al final
  const base = c.skills.filter(s => s.kind !== 'talent');
  assert.deepEqual(base.map(s => s.id), SRC[c.id].map(s => s.id), `${c.id}: el catálogo sale de js/skills-${c.id}.js`);
  assert.ok(c.skills.slice(base.length).every(s => s.kind === 'talent'), `${c.id}: las activas de talento van detrás del catálogo base`);
  const wb = c.skills.filter(s => s.cat === 'basic' && s.type === 'weapon');
  assert.equal(wb.length, 1, `${c.id}: un básico de arma`);
  assert.ok(wb[0].gen > 0 && wb[0].req === 1, `${c.id}: el básico de arma genera recurso desde Nv1`);
  assert.ok(c.skills.some(s => s.cat === 'spender' && s.req === 2), `${c.id}: Gastadora A en Nv2`);
  assert.ok(c.skills.some(s => s.cat === 'ultimate' && s.req === 15), `${c.id}: definitivas en Nv15`);
  for (const s of c.skills.filter(x => x.cat === 'ultimate')) assert.equal(s.cost, 0, `${s.id}: la definitiva no cuesta recurso`);
  // vista derivada (UI previa al 2d): nodos por categoría con ids válidos
  const ids = new Set(c.skills.map(s => s.id));
  assert.ok(c.tree.length >= 3 && c.tree[0].kind === 'basic' && c.tree.at(-1).kind === 'ultimate');
  for (const nd of c.tree) for (const sid of nd.skills) assert.ok(ids.has(sid), `${c.id}: ${sid} del árbol no existe`);
}
assert.deepEqual(Object.fromEntries(GUERRERO_SKILLS.map(s => [s.cat, 1])), { basic: 1, spender: 1, movement: 1, defense: 1, utility: 1, ultimate: 1 });
// calendario §1.2 (todas las clases): básico B en Nv3, básico C en Nv8, kit base completo en Nv16
for (const c of Object.values(CLASSES)) {
  const basics = c.skills.filter(s => s.cat === 'basic').map(s => s.req).sort((a, b) => a - b);
  assert.deepEqual(basics, [1, 3, 8], `${c.id}: básicos A/B/C en Nv1/3/8`);
  assert.ok(c.skills.filter(s => s.kind !== 'talent').every(s => s.req <= 16), `${c.id}: el kit base se completa en Nv16`);
  assert.ok(c.skills.filter(s => s.kind === 'talent').every(s => s.req === 10), `${c.id}: las activas de talento usan req 10`);
}
assert.equal(GUERRERO_SKILLS.find(s => s.id === 'g_provocacion').req, 16, 'Provocación = Defensa/utilidad C (Nv16)');
console.log('Clases: recurso de §2, básico generador, catálogo por categoría desde skills-<clase>.js ✓');

// --- harness clásico ---
const world = buildDungeon(1);
const mk = () => ({ ui: { spawnText() {}, message() {}, flashDamage() {}, refreshHotbar() {} }, sfx() {}, addShake() {}, vibrate() {}, tip() {},
  spawnBurst() {}, spawnRing() {}, emitFx() {}, hitStop() {}, onEnemyKilled() {}, input: { joyDir: null, keyDir: null },
  world, enemies: [], projectiles: [], spawnProjectile(o) { this.projectiles.push(o); }, spawnBeam() {}, levelUpFlash() {} });

// --- 2) aprendidas por nivel ---
const g = mk();
const p = new Player(g, 'guerrero'); g.player = p;
assert.deepEqual(Object.keys(p.skills).sort(), ['g_tajo'], 'Nv1: solo el básico A');
assert.equal(p.skillPoints, undefined, 'sin puntos de habilidad: las ramas pasan a la forja (Paso 2)');
assert.deepEqual(p.skillForge, {}, 'forja vacía al empezar');
assert.equal(p.hotbar.lmb, 'g_tajo', '🖱️Izq = básico de arma');
assert.equal(p.skillSystemV, 5);
p.level = 15; p.recompute();
assert.ok(!p.skills.g_provocacion, 'Nv15 aún no conoce la utilidad C');
p.level = 16; p.recompute();
for (const s of CLASSES.guerrero.skills.filter(x => x.kind !== 'talent')) assert.ok(p.skills[s.id] > 0, `Nv16 conoce ${s.id}`);
assert.ok(!CLASSES.guerrero.skills.some(s => s.kind === 'talent' && p.skills[s.id]), 'sin especialización no conoce ninguna activa de talento');
console.log('Las habilidades se aprenden solas por nivel; el rango es derivado ✓');

// --- 3) hotbar con categoría ---
const hb = p.normalizeHotbar({ lmb: 'g_tajo', rmb: 'inexistente', k1: 'torbellino', k2: 'g_lanza', k3: null, k4: 'g_u_furia' });
assert.equal(hb.rmb, null, 'descarta ids inválidos');
assert.equal(hb.k1, null, 'una gastadora NO va en k1 (movilidad)');
assert.equal(hb.k2, 'g_lanza', 'k2 flexible admite una gastadora');
assert.equal(hb.k4, 'g_u_furia', 'k4 = definitiva');
assert.equal(p.normalizeHotbar({ lmb: 'basic' }).lmb, 'g_tajo', 'el literal viejo basic → básico de arma');
assert.equal(p.normalizeHotbar({ lmb: 'g_tajo', rmb: 'torbellino', k2: 'torbellino' }).k2, null, 'sin duplicados');
const h = makeHarness({ classId: 'guerrero', level: 20 });
assert.equal(h.g.assignHotbar('k2', 'grito_guerra'), true, 'utilidad en k2');
assert.equal(h.g.assignHotbar('k2', 'terremoto'), true, 'gastadora en k2 (flexible)');
assert.equal(h.g.assignHotbar('k1', 'terremoto'), false, 'una gastadora no va en k1');
assert.equal(h.g.assignHotbar('rmb', 'terremoto'), true);
assert.equal(h.p.hotbar.k2, null, 'al moverla de k2 a rmb, k2 queda libre (sin duplicados)');
assert.equal(h.g.assignHotbar('lmb', null), true);
assert.equal(h.p.hotbar.lmb, 'g_tajo', '🖱️Izq nunca queda vacía');
const low = makeHarness({ classId: 'guerrero', level: 3 });
assert.equal(low.g.assignHotbar('k4', 'g_u_furia'), false, 'no se asigna lo que aún no conoces');
console.log('Hotbar con categoría: CAT_SLOTS, k2 flexible, sin duplicados ✓');

// --- 4) recurso inicial y básico generador ---
assert.equal(p.mp, 0, 'la Furia del guerrero arranca a 0');
const pm = new Player(mk(), 'maga');
assert.equal(pm.mp, pm.stats.maxMP, 'el Maná arranca lleno');
const e = new Enemy(g, scaleEnemy(pickEnemyDef(1), 1), new THREE.Vector3(1.4, 0, 0));
e.maxHP = e.hp = 9999; g.enemies = [e];
p.basicAttack(e);
assert.ok(p.mp > 0, 'el ataque básico GENERA Furia');
console.log(`Generador: el básico sube la Furia a ${p.mp} ✓`);

// --- 5) habilidad nueva al subir de nivel → se coloca sola ---
const q = new Player(mk(), 'guerrero');
q.gainXP(400); // pasa a Nv2+
assert.ok(q.level >= 2 && q.skills.torbellino > 0, 'Nv2: aprende la Gastadora A');
assert.equal(q.hotbar.rmb, 'torbellino', 'se coloca sola en su ranura libre');
console.log('Al subir de nivel, la habilidad nueva se coloca sola en su ranura ✓');
console.log('\n✅ KIT DE 6 RANURAS CON CATEGORÍA + RECURSO POR CLASE OK');
