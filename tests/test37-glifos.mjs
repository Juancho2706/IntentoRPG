// Endgame: Glifos del Tablero de Paragon (engarce, escala con adyacentes)
import * as THREE from 'three';
import { makeGlyph, glyphValue } from '../js/items.js';
import { PARAGON_BOARD } from '../js/data.js';
import { Player } from '../js/entities.js';
import { economyMethods } from '../js/economy.js';
import { buildDungeon } from '../js/world.js';

globalThis.performance = globalThis.performance || { now: () => Date.now() };

// el tablero tiene nodos de engarce
const sockets = PARAGON_BOARD.filter(n => n.type === 'socket');
if (sockets.length < 1) throw new Error('el tablero necesita nodos de engarce');
console.log(`Engarces en el tablero: ${sockets.length} ✓`);

// glifo: valor escala con el rango y con nodos adyacentes activos
const gl = makeGlyph(3);
if (glyphValue(gl, 0) !== gl.rank * gl.per) throw new Error('valor base de glifo incorrecto');
if (!(glyphValue(gl, 2) > glyphValue(gl, 0))) throw new Error('el glifo no escala con adyacentes');
console.log(`Glifo escala: base ${glyphValue(gl, 0)} < con 2 adyacentes ${glyphValue(gl, 2)} ✓`);

// engarzar en un socket activo aplica su stat (recompute real)
const world = buildDungeon(1);
const g = { ui: { spawnText() {}, message() {}, flashDamage() {} }, sfx() {}, world, enemies: [], input: { joyDir: null, keyDir: null }, save() {} };
Object.assign(g, economyMethods);
const p = new Player(g, 'guerrero'); g.player = p;
p.paragon.points = 10;
// activa el brazo (4_3) y el engarce contiguo (3_3)
g.allocateParagonNode('4_3');
g.allocateParagonNode('3_3');
if (!p.paragon.nodes['3_3']) throw new Error('no se activó el engarce 3_3');

// un glifo de vida (per=10, adj=5) rango 2 → 20 + adyacentes×5
const gv = makeGlyph(2); gv.glyphId = 'g_hp'; gv.stat = 'hp'; gv.per = 10; gv.adj = 5; gv.rank = 2;
gv.baseName = 'Glifo de Vigor'; gv.name = 'Glifo de Vigor · rango 2';
p.materials = [gv];
const hp0 = p.stats.maxHP;
g.socketGlyph('3_3', 0);
if (p.materials.length !== 0) throw new Error('el glifo no salió de la bolsa de materiales al engarzar');
if (!p.paragon.glyphs['3_3']) throw new Error('el glifo no quedó engarzado');
if (p.stats.maxHP <= hp0) throw new Error('el glifo engarzado no aplicó su stat');
console.log(`Engarzar glifo: maxHP ${hp0}→${p.stats.maxHP} (rango+adyacentes) ✓`);

// activar un nodo adyacente más al engarce aumenta el bonus del glifo
const hpA = p.stats.maxHP;
g.allocateParagonNode('3_4'); // contiguo a 3_3 (brazo izquierdo)
if (p.stats.maxHP <= hpA) throw new Error('el bonus del glifo no creció al activar un nodo adyacente');
console.log(`Sinergia: nodo adyacente sube el glifo, maxHP ${hpA}→${p.stats.maxHP} ✓`);

// quitar el glifo lo devuelve a la bolsa de materiales y revierte su stat
g.unsocketGlyph('3_3');
if (p.materials.length !== 1) throw new Error('el glifo no volvió a la bolsa de materiales');
if (p.paragon.glyphs['3_3']) throw new Error('el glifo sigue engarzado');
console.log('Quitar glifo: vuelve a la bolsa de materiales ✓');

void THREE;
console.log('test37-glifos OK');
