// Rework de clases (estilo D4): recurso por clase, ataque básico generador,
// 4 habilidades core (sin pasivas), hotbar de 6 ranuras y migración de saves.
import * as THREE from 'three';
import { CLASSES } from '../js/data.js';
import { Player, Enemy } from '../js/entities.js';
import { scaleEnemy, pickEnemyDef } from '../js/data.js';
import { buildDungeon } from '../js/world.js';

globalThis.performance = globalThis.performance || { now: () => Date.now() };

// --- 1) cada clase: recurso válido + exactamente 4 cores, sin pasivas ---
for (const c of Object.values(CLASSES)) {
  const r = c.resource;
  if (!r || !r.id || !r.name || typeof r.gen !== 'number') throw new Error(`${c.id} sin recurso válido`);
  const cores = c.skills.filter(s => s.kind === 'core');
  if (cores.length !== 4) throw new Error(`${c.id} debe tener 4 cores, tiene ${cores.length}`);
  if (c.skills.some(s => s.type === 'passive')) throw new Error(`${c.id} no debe tener pasivas en el árbol`);
  if (!c.basicName) throw new Error(`${c.id} sin nombre de ataque básico`);
}
const recursos = Object.values(CLASSES).map(c => c.resource.name);
if (new Set(recursos).size !== 3) throw new Error('los recursos no son distintos: ' + recursos.join(','));
console.log('Recursos por clase:', recursos.join(' / '), '+ 4 cores c/u, sin pasivas ✓');

// --- harness ---
const world = buildDungeon(1);
const mk = () => ({ ui: { spawnText() {}, message() {}, flashDamage() {} }, sfx() {}, addShake() {}, vibrate() {}, tip() {},
  spawnBurst() {}, spawnRing() {}, emitFx() {}, hitStop() {}, onEnemyKilled() {}, input: { joyDir: null, keyDir: null },
  world, enemies: [], projectiles: [], spawnProjectile(o) { this.projectiles.push(o); } });

// --- 2) naces sabiendo SOLO el básico: skills vacío, hotbar.lmb = 'basic' ---
const g = mk();
const p = new Player(g, 'guerrero'); g.player = p;
if (Object.keys(p.skills).length !== 0) throw new Error('debes nacer sin cores aprendidas');
if (p.hotbar.lmb !== 'basic') throw new Error('🖱️Izq debe ser el ataque básico por defecto');
const coreIds = CLASSES.guerrero.skills.filter(s => s.kind === 'core').map(s => s.id);
if (!coreIds.includes(p.hotbar.k1)) throw new Error('la tecla 1 debe tener una core por defecto');
if (p.skillSystemV !== 2) throw new Error('skillSystemV debe quedar marcado a 2');
console.log('Inicio: solo el básico aprendido; hotbar 6 ranuras (lmb=basic, 1-4=cores) ✓');

// --- 3) recurso inicial: Furia arranca vacía; Maná/Energía llenos ---
if (p.mp !== 0) throw new Error('la Furia del guerrero debe arrancar a 0, está en ' + p.mp);
const pm = new Player(mk(), 'maga');
if (pm.mp !== pm.stats.maxMP) throw new Error('el Maná de la maga debe arrancar lleno');
console.log(`Recurso inicial: Furia 0 (guerrero), Maná ${pm.mp}/${pm.stats.maxMP} (maga) ✓`);

// --- 4) el ataque básico GENERA recurso ---
const e = new Enemy(g, scaleEnemy(pickEnemyDef(1), 1), new THREE.Vector3(1.4, 0, 0));
e.maxHP = e.hp = 9999; g.enemies = [e];
const before = p.mp;
p.basicAttack(e);
if (!(p.mp > before)) throw new Error('el ataque básico debe generar recurso (Furia)');
if (Math.abs(p.mp - Math.min(p.stats.maxMP, before + CLASSES.guerrero.resource.gen)) > 1e-6)
  throw new Error('la Furia generada debe ser exactamente resource.gen');
console.log(`Generador: el básico sube la Furia ${before} → ${p.mp} (+${CLASSES.guerrero.resource.gen}) ✓`);

// --- 5) migración: save del sistema viejo reembolsa lo invertido y limpia build ---
const old = new Player(mk(), 'guerrero', { classId: 'guerrero', skills: { torbellino: 3, embestida: 2 }, skillPoints: 0 });
if (Object.keys(old.skills).length !== 0) throw new Error('la migración debe limpiar las skills viejas');
if (old.skillPoints !== 5) throw new Error('debe reembolsar los 5 puntos invertidos, dio ' + old.skillPoints);
if (old.skillSystemV !== 2) throw new Error('la migración debe marcar skillSystemV=2');
console.log('Migración: build vieja reembolsada (5 pts) y reseteada al sistema nuevo ✓');

// --- 6) normalizeHotbar: descarta ids inválidos, conserva válidos y reasigna huecos ---
const hb = p.normalizeHotbar({ lmb: 'basic', rmb: 'inexistente', k1: coreIds[1], k2: null });
if (hb.lmb !== 'basic') throw new Error('debe conservar el básico');
if (hb.rmb === 'inexistente') throw new Error('debe descartar ids inválidos');
if (hb.k1 !== coreIds[1]) throw new Error('debe conservar una core válida asignada');
if (hb.k2 !== null) throw new Error('debe respetar una ranura vaciada explícitamente');
console.log('normalizeHotbar: valida ids, conserva válidos y respeta huecos ✓');

void THREE;
console.log('\n✅ REWORK DE CLASES (RECURSO + GENERADOR + HOTBAR) OK');
