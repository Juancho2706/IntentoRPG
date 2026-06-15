// Maestrías de clase (ramas): integridad de datos, puntos por nivel, elección,
// asignación con gating por req, aplicación en recompute (stats + powers) y respec.
import * as THREE from 'three';
import { Player } from '../js/entities.js';
import { masteryMethods } from '../js/game-mastery.js';
import { MASTERIES, findMastery, MASTERY_START_LEVEL, xpForLevel } from '../js/data.js';
import { buildDungeon } from '../js/world.js';

globalThis.performance = globalThis.performance || { now: () => Date.now() };

// --- integridad de datos ---
const CLASSES = ['guerrero', 'maga', 'arquera'];
for (const c of CLASSES) {
  const list = MASTERIES[c];
  if (!Array.isArray(list) || list.length !== 3) throw new Error(`${c} debe tener 3 maestrías`);
  for (const m of list) {
    if (!m.id || !m.name || !m.icon) throw new Error(`maestría incompleta en ${c}`);
    if (m.nodes.length !== 9) throw new Error(`${m.id} debe tener 9 nodos`);
    const caps = m.nodes.filter(n => n.type === 'capstone');
    if (caps.length !== 1) throw new Error(`${m.id} debe tener exactamente 1 capstone`);
    for (const n of m.nodes) {
      if (!n.id || !n.name || !n.desc) throw new Error(`nodo incompleto en ${m.id}`);
      if (!n.stats && !n.power) throw new Error(`nodo sin efecto (ni stats ni power): ${m.id}/${n.id}`);
      if (typeof n.req !== 'number') throw new Error(`nodo sin req: ${m.id}/${n.id}`);
    }
  }
}
if (!findMastery('berserker') || findMastery('inexistente')) throw new Error('findMastery falla');
console.log('Integridad de datos: 3×3 maestrías, 9 nodos c/u, 1 capstone, todos con efecto ✓');

// --- harness ---
const world = buildDungeon(1);
const g = {
  ui: { message() {}, spawnText() {}, renderPanel() {}, updateHUD() {}, flashDamage() {} },
  sfx() {}, vibrate() {}, spawnBurst() {}, tip() {}, addShake() {}, world, enemies: [], save() {},
};
Object.assign(g, masteryMethods);
const p = new Player(g, 'guerrero'); g.player = p;

// arranca sin maestría
if (p.mastery.id !== null || p.mastery.points !== 0) throw new Error('mastery debe iniciar vacía');

// --- puntos por nivel: a partir del nivel umbral, +1 cada 2 niveles ---
p.level = MASTERY_START_LEVEL - 1; p.xp = 0;
p.gainXP(xpForLevel(p.level) + xpForLevel(MASTERY_START_LEVEL) + 1); // sube a umbral y al siguiente
if (p.level < MASTERY_START_LEVEL + 1) throw new Error('no subió de nivel lo esperado');
if (p.mastery.points !== 1) throw new Error('debió ganar 1 punto de maestría (nivel par del umbral): ' + p.mastery.points);
console.log(`Puntos por nivel: +1 al llegar al nivel ${MASTERY_START_LEVEL} ✓`);

// --- elegir maestría: solo de tu clase ---
g.chooseMastery('piromante'); // no es de guerrero
if (p.mastery.id) throw new Error('no debe aceptar maestría de otra clase');
g.chooseMastery('berserker');
if (p.mastery.id !== 'berserker') throw new Error('no eligió berserker');
console.log('Elección: solo maestrías de la clase propia ✓');

// --- asignar nodos: respeta puntos y req ---
p.mastery.points = 9;
const dmgBefore = p.stats.dmgMax;
g.allocateMasteryNode('b_dmg'); // minor, req 0, +10% daño
if (!p.mastery.nodes['b_dmg']) throw new Error('no asignó b_dmg');
if (p.mastery.points !== 8) throw new Error('no descontó el punto');
if (!(p.stats.dmgMax > dmgBefore)) throw new Error('el stat de maestría no se aplicó en recompute');
console.log('Asignación: descuenta punto y aplica stats en recompute ✓');

// capstone bloqueado hasta gastar 8
g.allocateMasteryNode('b_cap');
if (p.mastery.nodes['b_cap']) throw new Error('capstone no debe asignarse con <8 gastados');
// asigna el resto de no-capstone (b_as, b_ls req0; b_n1, b_n2, b_n3 req3; b_m1, b_m2 req6)
for (const id of ['b_as', 'b_ls', 'b_n1', 'b_n2', 'b_n3', 'b_m1', 'b_m2']) g.allocateMasteryNode(id);
if (g.masterySpent() !== 8) throw new Error('debería haber 8 nodos asignados, hay ' + g.masterySpent());
g.allocateMasteryNode('b_cap'); // ahora sí (req 8)
if (!p.mastery.nodes['b_cap']) throw new Error('capstone debería asignarse con 8 gastados');
if (!p.powers.has('m_berserk')) throw new Error('el capstone no registró el poder m_berserk');
if (!p.powers.has('festin')) throw new Error('la notable no registró el poder festin');
console.log('Gating por req: capstone solo con 8 nodos; poderes registrados en recompute ✓');

// --- m_berserk en rollDamage: con vida baja pega más ---
p.hp = p.stats.maxHP * 0.3; // <40%
let sumLow = 0; for (let i = 0; i < 400; i++) sumLow += p.rollDamage(1, 100).dmg; // critBonus 100 → siempre crítico (determinista en crit)
p.hp = p.stats.maxHP;       // vida alta
let sumHigh = 0; for (let i = 0; i < 400; i++) sumHigh += p.rollDamage(1, 100).dmg;
if (!(sumLow > sumHigh * 1.2)) throw new Error('m_berserk no aumenta el daño con vida baja');
console.log('Capstone m_berserk: +daño con vida baja, activo en rollDamage ✓');

// --- respec: devuelve puntos y limpia ---
p.gold = 100000;
const totalNodes = g.masterySpent();
g.respecMastery();
if (p.mastery.id !== null) throw new Error('respec no limpió la maestría');
if (g.masterySpent() !== 0) throw new Error('respec no limpió los nodos');
if (p.mastery.points < totalNodes) throw new Error('respec no devolvió los puntos');
if (p.powers.has('m_berserk')) throw new Error('tras respec el poder no debe seguir activo');
console.log('Respec: devuelve puntos, limpia nodos y poderes ✓');

console.log('\n✅ MAESTRÍAS DE CLASE OK');
