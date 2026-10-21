// Endgame: glifos del tablero (Paso 2g): engarce en el zócalo de cada brazo (paso 4 del camino),
// escala con adyacentes activos, se quita a la bolsa y no cuenta con el zócalo inactivo; glifos
// sueltos de la migración (paragon.loose): looseGlyphs, reclaimGlyph, reclaimLooseGlyphs
import assert from 'node:assert/strict';
import { makeGlyph, glyphValue } from '../js/items.js';
import { PARAGON_BOARDS, PARAGON_SOCKET_STEP, paragonPathCost } from '../js/paragon-board.js';
import { Player } from '../js/entities.js';
import { economyMethods } from '../js/economy.js';
import { buildDungeon } from '../js/world.js';

globalThis.performance = globalThis.performance || { now: () => Date.now() };

// un zócalo por brazo, a 4 pasos del Inicio
for (const [cid, board] of Object.entries(PARAGON_BOARDS)) {
  const sockets = board.filter(n => n.type === 'socket');
  assert.equal(sockets.length, 4, cid);
  for (const s of sockets) assert.equal(paragonPathCost(board, [s.id]), PARAGON_SOCKET_STEP, `${cid}/${s.id}`);
}
console.log('Zócalos: uno por brazo, a 4 pasos del Inicio ✓');

// valor: rango × per + adyacentes × adj
const gl = makeGlyph(3);
assert.equal(glyphValue(gl, 0), gl.rank * gl.per);
assert.ok(glyphValue(gl, 2) > glyphValue(gl, 0));
console.log(`Glifo escala: base ${glyphValue(gl, 0)} < con 2 adyacentes ${glyphValue(gl, 2)} ✓`);

const world = buildDungeon(1);
const g = { ui: { spawnText() {}, message() {}, flashDamage() {} }, sfx() {}, world, enemies: [], input: { joyDir: null, keyDir: null }, save() {} };
Object.assign(g, economyMethods);
const p = new Player(g, 'guerrero'); g.player = p;
p.level = 100; p.paragon = { nodes: {}, glyphs: {} }; p.recompute();
// brazo de sustento hasta su zócalo (4_8)
for (const id of ['4_5', '4_6', '4_7']) assert.equal(g.allocateParagonNode(id), true, id);
const gv = makeGlyph(2); Object.assign(gv, { glyphId: 'g_hp', stat: 'hp', per: 10, adj: 5, rank: 2, fam: null, baseName: 'Glifo de Vigor', name: 'Glifo de Vigor · rango 2' });
p.materials = [gv];
g.socketGlyph('4_8', 0);
assert.equal(p.paragon.glyphs['4_8'], undefined, 'no se engarza en un zócalo inactivo');
assert.equal(p.materials.length, 1);
assert.equal(g.allocateParagonNode('4_8'), true);
g.socketGlyph('4_7', 0);
assert.equal(p.paragon.glyphs['4_7'], undefined, 'solo en zócalos');
const hp0 = p.stats.maxHP;
g.socketGlyph('4_8', 0);
assert.equal(p.materials.length, 0, 'sale de la bolsa');
assert.equal(p.paragon.glyphs['4_8'], gv);
assert.equal(p.stats.maxHP - hp0, glyphValue(gv, 1), 'rango + 1 adyacente activo (4_7)');
console.log(`Engarzar glifo: maxHP ${hp0}→${p.stats.maxHP} ✓`);

// un adyacente más (3_8, siguiente casilla del brazo) sube el glifo
const hpA = p.stats.maxHP;
const node38 = PARAGON_BOARDS.guerrero.find(n => n.id === '3_8');
assert.equal(g.allocateParagonNode('3_8'), true);
assert.equal(p.stats.maxHP - hpA, (node38.stats.hp || 0) + glyphValue(gv, 2) - glyphValue(gv, 1), 'el glifo cuenta el nuevo adyacente');
console.log(`Sinergia: nodo adyacente sube el glifo, maxHP ${hpA}→${p.stats.maxHP} ✓`);

// un segundo glifo en el mismo zócalo devuelve el anterior a la bolsa
const gw = makeGlyph(1); Object.assign(gw, { glyphId: 'g_arm', stat: 'arm', per: 4, adj: 1, rank: 1, baseName: 'Glifo de Égida' });
p.materials = [gw];
g.socketGlyph('4_8', 0);
assert.equal(p.paragon.glyphs['4_8'], gw); assert.deepEqual(p.materials, [gv]);
g.socketGlyph('4_8', 0);
assert.equal(p.paragon.glyphs['4_8'], gv); assert.deepEqual(p.materials, [gw]);

// quitarlo lo devuelve a la bolsa y revierte su stat
const hpS = p.stats.maxHP;
g.unsocketGlyph('4_8');
assert.equal(p.materials.length, 2); assert.equal(p.paragon.glyphs['4_8'], undefined);
assert.equal(hpS - p.stats.maxHP, glyphValue(gv, 2));
console.log('Quitar glifo: vuelve a la bolsa de materiales ✓');

// glifos SUELTOS (paragon.loose: la migración v4 → v5 no los pudo devolver a la bolsa): se
// listan, no cuentan, se recogen a la bolsa (uno o todos) y desde ahí se engarzan
{
  const mk = n => Object.assign(makeGlyph(1), { glyphId: `g_suelto${n}`, stat: 'hp', per: 9, adj: 0, fam: null, rank: 1, baseName: `Glifo suelto ${n}` });
  const [a, b, c] = [mk(1), mk(2), mk(3)];
  p.materials = [];
  p.recompute(); const hpNone = p.stats.maxHP;
  p.paragon.loose = [a, b, c];
  p.recompute();
  assert.equal(p.stats.maxHP, hpNone, 'sueltos: no dan estadísticas');
  const view = g.looseGlyphs();
  assert.deepEqual(view, [a, b, c]);
  view.pop(); assert.equal(p.paragon.loose.length, 3, 'looseGlyphs devuelve una copia');
  assert.equal(g.reclaimGlyph(1), true);
  assert.deepEqual(p.materials, [b]); assert.deepEqual(p.paragon.loose, [a, c]);
  assert.equal(g.reclaimGlyph(7), false, 'índice inexistente: nada');
  assert.equal(g.reclaimLooseGlyphs(), 2);
  assert.deepEqual(p.materials, [b, a, c]);
  assert.ok(!('loose' in p.paragon), 'sin sueltos la clave desaparece (el guardado queda como uno sin migrar)');
  assert.equal(g.reclaimLooseGlyphs(), 0); assert.deepEqual(g.looseGlyphs(), []);
  // recogido, se engarza como cualquier otro (4_8 sigue activo y vacío)
  const hpB = p.stats.maxHP;
  g.socketGlyph('4_8', 0);
  assert.equal(p.paragon.glyphs['4_8'], b);
  assert.ok(p.stats.maxHP > hpB, 'engarzado, ya cuenta');
}
console.log('Glifos sueltos: se listan, no cuentan y se recogen a la bolsa ✓');

console.log('test37-glifos OK');
