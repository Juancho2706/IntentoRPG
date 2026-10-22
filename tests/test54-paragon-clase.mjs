// Fase 4 / Paso 2g — tablero de glifos temático por clase + glifos de familia
import assert from 'node:assert/strict';
import { PARAGON_BOARDS, paragonBoardFor, PARAGON_CATS, PG_CFG } from '../js/data.js';
import { makeGlyph, glyphValue } from '../js/items.js';
import { Player } from '../js/entities.js';
import { economyMethods } from '../js/economy.js';
import { buildDungeon } from '../js/world.js';

globalThis.performance = globalThis.performance || { now: () => Date.now() };

// --- 1) un tablero por clase; una clase desconocida cae al del guerrero ---
for (const c of ['guerrero', 'maga', 'arquera']) assert.ok(Array.isArray(PARAGON_BOARDS[c]), c);
assert.equal(paragonBoardFor('guerrero'), PARAGON_BOARDS.guerrero);
assert.equal(paragonBoardFor('clase_inexistente'), PARAGON_BOARDS.guerrero);
console.log('Tableros por clase + respaldo al del guerrero ✓');

// --- 2) geometría idéntica (mismos ids, tipos y familias): saves y glifos estables ---
const shape = b => b.map(n => `${n.id}:${n.type}:${n.cat}`).sort().join(',');
assert.equal(shape(PARAGON_BOARDS.guerrero), shape(PARAGON_BOARDS.maga));
assert.equal(shape(PARAGON_BOARDS.maga), shape(PARAGON_BOARDS.arquera));
console.log('Geometría idéntica entre clases ✓');

// --- 3) familias: cada nodo de un brazo tiene la de su cuadrante; Inicio y zócalos, ninguna ---
for (const n of PARAGON_BOARDS.guerrero) {
  if (n.type === 'start' || n.type === 'socket') { assert.ok(!n.cat, n.id); continue; }
  assert.ok(PARAGON_CATS[n.cat], `${n.id}: familia ${n.cat}`);
}
const perCat = Object.fromEntries(Object.keys(PARAGON_CATS).map(c => [c, PARAGON_BOARDS.guerrero.filter(n => n.cat === c).length]));
assert.deepEqual(perCat, { ofensiva: 10, sustento: 10, defensa: 10, utilidad: 10 }, '10 casillas con familia por brazo');
console.log('Familias por cuadrante; Inicio y zócalos neutros ✓');

// --- 4) legendarios temáticos: difieren entre clases (nombre y estadísticas), sin poder ---
const legs = c => paragonBoardFor(c).filter(n => n.type === 'legendary').map(n => `${n.id}=${n.name}:${JSON.stringify(n.stats)}`).join('|');
assert.notEqual(legs('guerrero'), legs('maga')); assert.notEqual(legs('maga'), legs('arquera')); assert.notEqual(legs('guerrero'), legs('arquera'));
for (const c of ['guerrero', 'maga', 'arquera']) {
  assert.equal(paragonBoardFor(c).find(n => n.id === '7_8').name, PG_CFG[c].leg.uti.name, `${c}: legendario de utilidad en 7_8`);
  for (const n of paragonBoardFor(c)) assert.ok(!n.power, `${c}/${n.id}: sin poder`);
  // los raros llevan la configuración de su clase
  assert.deepEqual(paragonBoardFor(c).find(n => n.id === '3_2').stats, PG_CFG[c].rares.off1);
}
console.log('Legendarios temáticos por clase (guerrero ≠ maga ≠ arquera), solo estadísticas ✓');

// --- 5) glifos de familia: el bonus por familia escala aparte del genérico ---
const gd = makeGlyph(1); Object.assign(gd, { glyphId: 'g_dmg', stat: 'dmgPct', per: 2, adj: 0.5, fam: 'ofensiva', famAdj: 1.5, rank: 2 });
const baseV = glyphValue(gd, 1, 0), famV = glyphValue(gd, 1, 1);
assert.ok(Math.abs((famV - baseV) - gd.famAdj) < 1e-9, 'famAdj por nodo de su familia');
console.log(`Glifo de familia: ${baseV} → ${famV} con un adyacente de su cuadrante ✓`);

// --- 6) en recompute: el mismo glifo ofensivo rinde más en el zócalo ofensivo (4_0, adyacente
//        4_1 ofensivo) que en el de sustento (4_8, adyacente 4_7 de otra familia) ---
const world = buildDungeon(1);
const mkGame = () => { const g = { ui: { spawnText() {}, message() {}, flashDamage() {} }, sfx() {}, world, enemies: [], input: { joyDir: null, keyDir: null }, save() {} }; return Object.assign(g, economyMethods); };
const mkGlyph = () => { const o = makeGlyph(2); return Object.assign(o, { glyphId: 'g_dmg', stat: 'dmgPct', per: 5, adj: 0.5, fam: 'ofensiva', famAdj: 10, rank: 2 }); };
const contrib = (path, socket) => {
  const g = mkGame(), p = new Player(g, 'maga'); g.player = p;
  p.level = 100; p.paragon = { nodes: {}, glyphs: {} }; p.recompute();
  for (const id of [...path, socket]) assert.equal(g.allocateParagonNode(id), true, id);
  const before = p.stats.dmgPct;
  p.materials = [mkGlyph()]; g.socketGlyph(socket, 0);
  assert.ok(p.paragon.glyphs[socket]);
  return p.stats.dmgPct - before;
};
const a = contrib(['4_3', '4_2', '4_1'], '4_0'), b = contrib(['4_5', '4_6', '4_7'], '4_8');
const gl = mkGlyph();
assert.equal(a, glyphValue(gl, 1, 1), 'zócalo ofensivo: 1 adyacente de su familia');
assert.equal(b, glyphValue(gl, 1, 0), 'zócalo de sustento: 1 adyacente de otra familia');
assert.ok(a > b);
console.log(`Recompute: glifo ofensivo +${a}% junto a su familia vs +${b}% junto a otra ✓`);

console.log('\n✅ PARAGON TEMÁTICO + GLIFOS DE FAMILIA OK');
