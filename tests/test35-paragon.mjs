// Endgame: Tablero de Paragon (nodos conectados, adyacencia, stats, poderes)
import * as THREE from 'three';
import { PARAGON_BOARD } from '../js/data.js';
import { Player } from '../js/entities.js';
import { economyMethods } from '../js/economy.js';
import { buildDungeon } from '../js/world.js';

globalThis.performance = globalThis.performance || { now: () => Date.now() };

// el tablero tiene un inicio y nodos legendarios con poder
const start = PARAGON_BOARD.find(n => n.type === 'start');
if (!start) throw new Error('el tablero necesita un nodo de inicio');
const legos = PARAGON_BOARD.filter(n => n.type === 'legendary' && n.power);
if (legos.length < 1) throw new Error('debe haber nodos legendarios con poder');
console.log(`Tablero: ${PARAGON_BOARD.length} nodos, ${legos.length} legendarios con poder ✓`);

// monta un Game mínimo con los métodos reales de economía (paragon)
const world = buildDungeon(1);
const g = {
  ui: { spawnText() {}, message() {}, flashDamage() {} }, sfx() {}, addShake() {}, vibrate() {}, tip() {},
  spawnBurst() {}, input: { joyDir: null, keyDir: null }, world, enemies: [], save() {},
};
Object.assign(g, economyMethods);
const p = new Player(g, 'guerrero'); g.player = p;
p.paragon.points = 10;

// 1) adyacencia: un nodo contiguo al inicio es accesible; uno lejano no
const adj = PARAGON_BOARD.find(n => n.type !== 'start' && Math.abs(n.x - start.x) + Math.abs(n.y - start.y) === 1);
if (!g.paragonNodeReachable(adj.id)) throw new Error('un nodo contiguo al inicio debería ser accesible');
const far = PARAGON_BOARD.find(n => Math.abs(n.x - start.x) + Math.abs(n.y - start.y) >= 3);
if (g.paragonNodeReachable(far.id)) throw new Error('un nodo lejano no debería ser accesible sin camino');
console.log('Conectividad: solo se activan nodos contiguos a otros activos ✓');

// 2) activar un nodo gasta un punto y aplica sus stats
const hp0 = p.stats.maxHP, pts0 = p.paragon.points;
g.allocateParagonNode('4_5'); // nodo +6 vida (contiguo al inicio)
if (p.paragon.points !== pts0 - 1) throw new Error('no descontó el punto');
if (!p.paragon.nodes['4_5']) throw new Error('no marcó el nodo');
if (p.stats.maxHP !== hp0 + 6) throw new Error('el nodo no aplicó su stat');
console.log(`Activar nodo: -1 punto, maxHP ${hp0}→${p.stats.maxHP} ✓`);

// 3) un nodo legendario otorga su poder al activarse (camino completo)
const fest = PARAGON_BOARD.find(n => n.power === 'festin');
// camino contiguo hasta el legendario inferior (4_8): 4_5(ya)→4_6→4_7→4_8
for (const id of ['4_6', '4_7', '4_8']) g.allocateParagonNode(id);
if (!p.paragon.nodes['4_8']) throw new Error('no se activó el nodo legendario');
if (!p.powers.has('festin')) throw new Error('el nodo legendario no otorgó su poder');
console.log(`Nodo legendario «${fest.name}» otorga el poder festin ✓`);

// 4) reespecializar devuelve todos los puntos y vacía el tablero
p.gold = 99999;
const spent = Object.keys(p.paragon.nodes).length;
const before = p.paragon.points;
g.respecParagon();
if (Object.keys(p.paragon.nodes).length !== 0) throw new Error('la reespecialización no vació el tablero');
if (p.paragon.points !== before + spent) throw new Error('no reembolsó todos los puntos');
if (p.powers.has('festin')) throw new Error('el poder del nodo debería desaparecer al reespecializar');
console.log(`Reespecializar: +${spent} puntos devueltos, tablero vacío ✓`);

void THREE;
console.log('test35-paragon OK');
