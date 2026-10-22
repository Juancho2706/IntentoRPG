// Endgame: tablero de glifos (Paso 2g §3.9): geometría en molinete, puntos DERIVADOS del nivel
// (Nv81+, 16 al Nv100), conectividad, stats por nodo, legendarios sin poder y reinicio gratis
// fuera de combate (los glifos se quedan en su zócalo)
import assert from 'node:assert/strict';
import { PARAGON_BOARDS, PARAGON_BOARD_SIZE, paragonBoardFor, paragonPathCost,
  PARAGON_SOCKET_STEP, PARAGON_LEGENDARY_STEP } from '../js/paragon-board.js';
import { earnedAt, PARAGON_OPEN_LEVEL, paragonPointsEarned, paragonPointsLeft } from '../js/talents.js';
import { Player } from '../js/entities.js';
import { economyMethods } from '../js/economy.js';
import { buildDungeon } from '../js/world.js';

globalThis.performance = globalThis.performance || { now: () => Date.now() };
const dist = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

// ------------------------------------------------ 1) geometría (las tres clases)
for (const [cid, board] of Object.entries(PARAGON_BOARDS)) {
  const by = new Map(board.map(n => [n.id, n]));
  assert.equal(by.size, board.length, `${cid}: ids únicos`);
  const start = board.filter(n => n.type === 'start');
  assert.equal(start.length, 1, `${cid}: un Inicio`);
  assert.deepEqual([start[0].x, start[0].y], [4, 4]);
  for (const n of board) {
    assert.equal(n.id, `${n.x}_${n.y}`);
    assert.ok(n.x >= 0 && n.y >= 0 && n.x < PARAGON_BOARD_SIZE && n.y < PARAGON_BOARD_SIZE, `${cid}/${n.id}: dentro del 9×9`);
    assert.ok(!n.power, `${cid}/${n.id}: el tablero no da poderes`);
  }
  const count = t => board.filter(n => n.type === t).length;
  assert.deepEqual([count('legendary'), count('socket'), count('rare')], [4, 4, 8], `${cid}: 4 legendarios, 4 zócalos, 8 raros`);
  assert.equal(board.length, 1 + 4 * 9 + 8, `${cid}: 45 casillas`);
  // árbol: conexo y sin ciclos (aristas = nodos − 1), así el coste mínimo es la unión de caminos
  const edges = board.reduce((a, n) => a + board.filter(o => dist(n, o) === 1).length, 0) / 2;
  assert.equal(edges, board.length - 1, `${cid}: sin ciclos`);
  assert.ok(board.every(n => paragonPathCost(board, [n.id]) < Infinity), `${cid}: conexo`);
  // legendarios a 9 pasos con el zócalo de su brazo en el camino
  for (const leg of board.filter(n => n.type === 'legendary')) {
    assert.equal(paragonPathCost(board, [leg.id]), PARAGON_LEGENDARY_STEP, `${cid}/${leg.id}: a ${PARAGON_LEGENDARY_STEP} casillas`);
    const sock = board.find(n => n.type === 'socket' && n.cat == null && paragonPathCost(board, [leg.id, n.id]) === PARAGON_LEGENDARY_STEP);
    assert.ok(sock, `${cid}/${leg.id}: con un zócalo en su camino`);
    assert.equal(paragonPathCost(board, [sock.id]), PARAGON_SOCKET_STEP);
    assert.ok(leg.name && leg.desc && Object.keys(leg.stats).length >= 2, `${cid}/${leg.id}: estadísticas grandes con nombre`);
  }
  // presupuesto: 16 puntos al Nv100 → un legendario (9) con 7 nodos más; dos legendarios (18) no
  const legs = board.filter(n => n.type === 'legendary').map(n => n.id);
  for (let i = 0; i < legs.length; i++) for (let j = i + 1; j < legs.length; j++)
    assert.ok(paragonPathCost(board, [legs[i], legs[j]]) > earnedAt('board', 100), `${cid}: ${legs[i]} + ${legs[j]} no caben`);
  assert.ok(PARAGON_LEGENDARY_STEP <= earnedAt('board', 100));
}
assert.equal(paragonBoardFor('clase_inexistente'), PARAGON_BOARDS.guerrero, 'clase desconocida: el tablero del guerrero');
assert.equal(paragonBoardFor('maga'), PARAGON_BOARDS.maga);
const BOARD_G = PARAGON_BOARDS.guerrero;   // los casos de abajo usan el tablero del guerrero
console.log('Tablero: molinete 9×9 de 45 casillas, árbol, legendario a 9 pasos, nunca dos con 16 puntos ✓');

// ------------------------------------------------ 2) puntos derivados del nivel
assert.equal(PARAGON_OPEN_LEVEL, 81);
let prev = 0;
for (let L = 1; L <= 100; L++) {
  const e = earnedAt('board', L);
  assert.ok(e === prev || e === prev + 1, `Nv${L}: a lo sumo un punto por nivel`);
  prev = e;
}
assert.equal(earnedAt('board', 80), 0); assert.equal(earnedAt('board', 81), 1); assert.equal(earnedAt('board', 100), 16);

const world = buildDungeon(1);
const mkGame = () => {
  const g = { ui: { spawnText() {}, message(t) { g.msgs.push(t); }, flashDamage() {} }, msgs: [], sfx() {}, addShake() {}, vibrate() {}, tip() {},
    spawnBurst() {}, input: { joyDir: null, keyDir: null }, world, enemies: [], save() {}, inSafeCamp: false };
  return Object.assign(g, economyMethods);
};
const g = mkGame();
const p = new Player(g, 'guerrero'); g.player = p;
p.paragon = { nodes: {}, glyphs: {} };
p.level = 80; p.recompute();
assert.equal(g.allocateParagonNode('4_5'), false, 'cerrado antes del Nv81');
assert.match(g.msgs.pop(), /nivel 81/);
assert.deepEqual(g.paragonPointsInfo(), { earned: 0, spent: 0, left: 0, open: false, openLevel: 81 });
p.level = 81;
assert.equal(g.allocateParagonNode('4_5'), true, 'Nv81: un punto');
assert.equal(g.allocateParagonNode('4_6'), false, 'sin más puntos');
assert.match(g.msgs.pop(), /No te quedan puntos/);
assert.deepEqual(g.paragonPointsInfo(), { earned: 1, spent: 1, left: 0, open: true, openLevel: 81 });
p.paragon.points = 999; // un campo viejo no da puntos: se derivan del nivel
assert.equal(g.allocateParagonNode('4_6'), false);
delete p.paragon.points;
console.log('Puntos derivados: 0 hasta el Nv80, 1 al Nv81, 16 al Nv100 ✓');

// ------------------------------------------------ 3) conectividad y stats
p.level = 100;
p.paragon = { nodes: {}, glyphs: {} }; p.recompute();
const start = BOARD_G.find(n => n.type === 'start');
const adj = BOARD_G.find(n => n.type !== 'start' && dist(n, start) === 1);
assert.ok(g.paragonNodeReachable(adj.id), 'contiguo al Inicio: accesible');
const far = BOARD_G.find(n => dist(n, start) >= 3);
assert.ok(!g.paragonNodeReachable(far.id), 'lejano: no');
assert.equal(g.allocateParagonNode(far.id), false);
assert.equal(g.allocateParagonNode('start'), false);
assert.equal(g.allocateParagonNode('9_9'), false, 'casilla inexistente');
const hp0 = p.stats.maxHP;
assert.equal(g.allocateParagonNode('4_5'), true); // brazo de sustento: +6 vida
assert.equal(p.stats.maxHP, hp0 + 6, 'el nodo aplica su stat');
assert.equal(g.allocateParagonNode('4_5'), false, 'ya activo');
assert.equal(paragonPointsLeft(p), 15);
console.log(`Conectividad y stats: maxHP ${hp0}→${p.stats.maxHP}; 15 puntos libres ✓`);

// ------------------------------------------------ 4) legendario: estadísticas, sin poder
const sus = ['4_6', '4_7', '4_8', '3_8', '2_8', '1_8', '0_8', '0_7'];
const leg = BOARD_G.find(n => n.id === '0_7');
assert.equal(leg.type, 'legendary');
const powers0 = new Set(p.powers), lph0 = p.stats.lph || 0, hpL = p.stats.maxHP;
for (const id of sus) assert.equal(g.allocateParagonNode(id), true, id);
assert.equal(paragonPointsLeft(p), 16 - 9);
assert.ok(p.stats.maxHP >= hpL + leg.stats.hp, 'el legendario suma su vida');
assert.equal((p.stats.lph || 0) - lph0, leg.stats.lph, 'y su vida al golpear');
assert.deepEqual(new Set(p.powers), powers0, 'el tablero no concede poderes');
// otro legendario no cabe: 7 puntos y está a 9 pasos
const other = BOARD_G.find(n => n.type === 'legendary' && n.id !== '0_7');
assert.ok(paragonPathCost(BOARD_G, [other.id]) > paragonPointsLeft(p));
console.log(`Legendario «${leg.name}»: ${leg.desc}; sin poder ✓`);

// ------------------------------------------------ 5) reinicio gratis fuera de combate
p.gold = 1234;
p.sinceCombat = 0;
const nodes0 = { ...p.paragon.nodes };
assert.equal(g.respecParagon(), false, 'en combate no');
assert.deepEqual(p.paragon.nodes, nodes0);
assert.match(g.msgs.pop(), /fuera de combate/);
p.sinceCombat = 10;
p.paragon.glyphs['4_8'] = { uid: 77, kind: 'glyph', glyphId: 'g_hp', stat: 'hp', per: 10, adj: 5, rank: 2, baseName: 'Glifo de Vigor' };
assert.equal(g.respecParagon(), true);
assert.deepEqual(p.paragon.nodes, {}, 'tablero vacío');
assert.equal(p.gold, 1234, 'gratis');
assert.equal(paragonPointsLeft(p), paragonPointsEarned(p), 'todos los puntos libres');
assert.ok(p.paragon.glyphs['4_8'], 'el glifo se queda en su zócalo');
assert.equal(p.stats.maxHP, hp0, 'sin nodos, sin stats (el glifo no cuenta con el zócalo inactivo)');
assert.equal(g.respecParagon(), false, 'vacío: nada que reiniciar');
g.inSafeCamp = true; p.sinceCombat = 0;
for (const id of ['4_5', '4_6']) g.allocateParagonNode(id);
assert.equal(g.respecParagon(), true, 'en un campamento sí, aunque acabe de luchar');
console.log('Reinicio gratis fuera de combate o en campamento; glifos en su zócalo ✓');

console.log('test35-paragon OK');
