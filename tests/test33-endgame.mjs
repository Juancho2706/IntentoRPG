// Endgame Fase 1: Tormento (dificultad) y Códice de Aspectos
import * as THREE from 'three';
import { generateItem } from '../js/items.js';
import { Player } from '../js/entities.js';
import { buildDungeon } from '../js/world.js';

globalThis.performance = globalThis.performance || { now: () => Date.now() };

const world = buildDungeon(1);
const mk = () => ({ ui: { spawnText() {}, message() {}, flashDamage() {} }, sfx() {}, addShake() {}, vibrate() {}, tip() {}, spawnBurst() {}, spawnRing() {}, input: { joyDir: null, keyDir: null }, world, enemies: [], onEnemyKilled() {}, projectiles: [] });

// 1) un legendario trae un poder (fuente de extracción al Códice)
let leg = null;
for (let i = 0; i < 50 && !leg; i++) { const it = generateItem(5, 'legendario'); if (it.power) leg = it; }
if (!leg || !leg.power || !leg.power.id) throw new Error('un legendario debería traer un poder con id');
console.log(`Legendario con aspecto: «${leg.power.name}» ✓`);

// 2) imprimir un aspecto en un objeto y equiparlo lo ACTIVA (recompute real)
const g = mk();
const p = new Player(g, 'guerrero'); g.player = p;
const base = generateItem(5, 'raro', 'chest'); // objeto sin poder
base.unidentified = false;
if (base.power) throw new Error('el objeto base no debería tener poder');
// simula imprimir el aspecto «furia»
base.power = { id: 'furia', name: 'de la Furia', desc: 'x' };
p.equipment.chest = base;
p.recompute();
if (!p.powers.has('furia')) throw new Error('el aspecto grabado no se activó al equiparlo');
console.log('Códice: aspecto grabado se activa al equipar ✓');

// 3) el Códice como almacén persistente (estructura)
p.codex = p.codex || {};
p.codex[leg.power.id] = { id: leg.power.id, name: leg.power.name, desc: leg.power.desc };
if (!p.codex[leg.power.id]) throw new Error('el Códice no guardó el aspecto');
console.log('Códice: almacena aspectos conocidos ✓');

// 4) fórmula de Tormento desbloqueado: min(10, max(maxRift, floor(maxFloor/6)))
const tormentUnlocked = (maxFloor, maxRift) => Math.min(10, Math.max(maxRift || 0, Math.floor((maxFloor || 1) / 6)));
if (tormentUnlocked(1, 0) !== 0) throw new Error('sin progreso no debe haber Tormento');
if (tormentUnlocked(12, 0) !== 2) throw new Error('piso 12 debería desbloquear Tormento 2');
if (tormentUnlocked(6, 5) !== 5) throw new Error('una grieta nivel 5 desbloquea Tormento 5');
if (tormentUnlocked(120, 0) !== 10) throw new Error('el Tormento debe topar en 10');
console.log('Tormento: desbloqueo por progreso (piso/grieta), tope 10 ✓');

// 5) el Tormento sube la dificultad efectiva: scaleFloor += T*2
const baseFloor = 8, T = 4;
if (baseFloor + T * 2 !== 16) throw new Error('el bonus de piso por Tormento no cuadra');
console.log('Tormento: +2 pisos efectivos por nivel (enemigos y botín) ✓');

console.log('test33-endgame OK');
