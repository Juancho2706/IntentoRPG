// Árbol de habilidades estilo D4 (6 nodos): recurso por clase, ataque básico
// generador, nodos con sus habilidades, gating por nivel y migración de saves.
import * as THREE from 'three';
import { CLASSES } from '../js/data.js';
import { Player, Enemy } from '../js/entities.js';
import { scaleEnemy, pickEnemyDef } from '../js/data.js';
import { buildDungeon } from '../js/world.js';

globalThis.performance = globalThis.performance || { now: () => Date.now() };

// --- 1) cada clase: recurso válido + árbol de 6 nodos con kinds correctos ---
const EXPECT_KINDS = ['basic', 'core', 'core', 'core', 'ultimate', 'passive'];
for (const c of Object.values(CLASSES)) {
  const r = c.resource;
  if (!r || !r.id || !r.name || typeof r.gen !== 'number') throw new Error(`${c.id} sin recurso válido`);
  if (!Array.isArray(c.tree) || c.tree.length !== 6) throw new Error(`${c.id} debe tener un árbol de 6 nodos`);
  const ids = new Set(c.skills.map(s => s.id));
  let lastReq = 0;
  c.tree.forEach((node, i) => {
    if (node.kind !== EXPECT_KINDS[i]) throw new Error(`${c.id} nodo ${i + 1}: kind ${node.kind} ≠ ${EXPECT_KINDS[i]}`);
    if (typeof node.req !== 'number' || node.req < lastReq) throw new Error(`${c.id} nodo ${i + 1}: req debe ser creciente`);
    lastReq = node.req;
    if (!node.skills.length) throw new Error(`${c.id} nodo ${i + 1} sin habilidades`);
    for (const sid of node.skills) if (!ids.has(sid)) throw new Error(`${c.id}: ${sid} en el árbol no existe en skills`);
  });
  // hay al menos un básico de arma (el ataque principal)
  if (!c.skills.some(s => s.kind === 'basic' && s.type === 'weapon')) throw new Error(`${c.id} sin básico de arma`);
}
console.log('Árbol: 6 nodos por clase (Básico/3×Hab/Ulti/Pasiva), reqs crecientes, ids válidos ✓');

// --- gating de D4 ---: nivel 1 los básicos, primeras habilidades en nivel 2
for (const c of Object.values(CLASSES)) {
  if (c.tree[0].req !== 1) throw new Error(`${c.id}: el nodo de básicos debe ser nivel 1`);
  if (c.tree[1].req !== 2) throw new Error(`${c.id}: las primeras habilidades deben pedir nivel 2`);
}
console.log('Gating: básicos a nivel 1, primera habilidad a nivel 2 ✓');

// --- Guerrero completo: 3 básicos + 9 cores + 3 ultis + 3 pasivas ---
const G = CLASSES.guerrero;
const byKind = k => G.skills.filter(s => s.kind === k).length;
if (byKind('basic') !== 3 || byKind('core') !== 9 || byKind('ultimate') !== 3 || byKind('passive') !== 3)
  throw new Error(`Guerrero (plantilla) debe tener 3 básicos/9 cores/3 ultis/3 pasivas, tiene ${byKind('basic')}/${byKind('core')}/${byKind('ultimate')}/${byKind('passive')}`);
console.log('Guerrero (plantilla): 3 básicos · 9 habilidades · 3 definitivas · 3 pasivas ✓');

// --- harness ---
const world = buildDungeon(1);
const mk = () => ({ ui: { spawnText() {}, message() {}, flashDamage() {} }, sfx() {}, addShake() {}, vibrate() {}, tip() {},
  spawnBurst() {}, spawnRing() {}, emitFx() {}, hitStop() {}, onEnemyKilled() {}, input: { joyDir: null, keyDir: null },
  world, enemies: [], projectiles: [], spawnProjectile(o) { this.projectiles.push(o); } });

// --- 2) naces sabiendo SOLO el básico de arma; nivel 1 → 0 puntos ---
const g = mk();
const p = new Player(g, 'guerrero'); g.player = p;
if (Object.keys(p.skills).length !== 1 || !(p.skills['g_tajo'] > 0)) throw new Error('debes nacer sabiendo solo el básico de arma (g_tajo)');
if (p.skillPoints !== 0) throw new Error('a nivel 1 no debes tener puntos por gastar, tienes ' + p.skillPoints);
if (p.hotbar.lmb !== 'g_tajo') throw new Error('🖱️Izq debe ser el básico de arma por defecto');
if (p.skillSystemV !== 3) throw new Error('skillSystemV debe quedar a 3');
console.log('Inicio: solo el básico de arma (g_tajo), 0 puntos, hotbar lmb=g_tajo ✓');

// --- 3) recurso inicial: Furia 0; Maná lleno ---
if (p.mp !== 0) throw new Error('la Furia del guerrero debe arrancar a 0');
const pm = new Player(mk(), 'maga');
if (pm.mp !== pm.stats.maxMP) throw new Error('el Maná de la maga debe arrancar lleno');
console.log(`Recurso inicial: Furia 0 (guerrero), Maná ${pm.mp}/${pm.stats.maxMP} (maga) ✓`);

// --- 4) el ataque básico GENERA recurso ---
const e = new Enemy(g, scaleEnemy(pickEnemyDef(1), 1), new THREE.Vector3(1.4, 0, 0));
e.maxHP = e.hp = 9999; g.enemies = [e];
const before = p.mp;
p.basicAttack(e);
if (!(p.mp > before)) throw new Error('el ataque básico debe generar recurso (Furia)');
console.log(`Generador: el básico sube la Furia ${before} → ${p.mp} ✓`);

// --- 5) migración: save viejo (sin skillSystemV=3) reembolsa todo y resetea ---
const old = new Player(mk(), 'guerrero', { classId: 'guerrero', skills: { torbellino: 3, embestida: 2 }, skillMods: { torbellino: { tb_m: true } }, skillPoints: 0, skillSystemV: 2 });
if (Object.keys(old.skills).length !== 1 || !(old.skills['g_tajo'] > 0)) throw new Error('la migración debe dejar solo el básico de arma');
if (old.skillPoints !== 6) throw new Error('debe reembolsar 5 niveles + 1 aspecto = 6, dio ' + old.skillPoints);
if (old.skillSystemV !== 3) throw new Error('la migración debe marcar skillSystemV=3');
console.log('Migración: build vieja reembolsada (6 pts) y reseteada al árbol nuevo ✓');

// --- 6) normalizeHotbar: descarta ids inválidos, conserva válidos, respeta huecos ---
const cores = G.skills.filter(s => s.kind === 'core').map(s => s.id);
const hb = p.normalizeHotbar({ lmb: 'g_tajo', rmb: 'inexistente', k1: cores[1], k2: null });
if (hb.lmb !== 'g_tajo') throw new Error('debe conservar el básico de arma');
if (hb.rmb === 'inexistente') throw new Error('debe descartar ids inválidos');
if (hb.k1 !== cores[1]) throw new Error('debe conservar una habilidad válida asignada');
if (hb.k2 !== null) throw new Error('debe respetar una ranura vaciada');
// retrocompat: el literal viejo 'basic' se convierte en el básico de arma
if (p.normalizeHotbar({ lmb: 'basic' }).lmb !== 'g_tajo') throw new Error('el literal viejo basic debe migrar al básico de arma');
console.log('normalizeHotbar: valida ids, respeta huecos y migra el literal viejo ✓');

void THREE;
console.log('\n✅ ÁRBOL DE HABILIDADES (6 NODOS) OK');
