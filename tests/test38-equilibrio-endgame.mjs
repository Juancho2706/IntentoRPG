// Regresión de EQUILIBRIO del endgame: Tormento, tasas de loot y power budget.
// Bloquea las regresiones que detectó la auditoría (Tormento injugable, conjuntos
// como rutina, jefe legendario 100%, glifos inflados).
import { Player } from '../js/entities.js';
import { generateItem, rollDrops, GLYPH_TYPES } from '../js/items.js';
import { scaleEnemy, ENEMIES, bossForFloor, PARAGON_BOARDS } from '../js/data.js';
import { paragonPathCost } from '../js/paragon-board.js';
import { earnedAt } from '../js/talents.js';
import { buildDungeon } from '../js/world.js';
import { CRIT_MULT, expectedMitigation, tormentMods } from '../js/combat-math.js';
import { createRng, hashSeed } from '../js/rng.js';

globalThis.performance = globalThis.performance || { now: () => Date.now() };
const world = buildDungeon(1);
const fake = { ui: { spawnText() {}, message() {} }, sfx() {}, addShake() {}, vibrate() {}, tip() {}, spawnBurst() {}, input: { joyDir: null, keyDir: null }, world, enemies: [] };

function buildHero(floor, seed = null) {
  const rng = seed == null ? null : createRng(hashSeed('t38', floor, seed)); // misma semilla = mismo equipo
  const p = new Player(fake, 'guerrero');
  p.level = Math.min(20 + Math.max(0, floor - 16) * 2, Math.max(1, floor + 4));
  const pts = 5 * (Math.min(p.level, 20) - 1);
  p.attributes.fue += Math.round(pts * 0.6); p.attributes.vit += Math.round(pts * 0.4);
  for (const slot of ['weapon', 'helm', 'chest', 'boots', 'gloves', 'pants', 'shoulders', 'belt', 'offhand', 'ring', 'amulet']) {
    let best = null, bv = -1;
    for (let i = 0; i < 30; i++) { const it = generateItem(Math.max(1, floor), 'raro', slot, null, null, rng); const v = (it.dmg ? it.dmg[0] + it.dmg[1] : 0) + (it.arm || 0) + Object.values(it.affixes).reduce((a, b) => a + b, 0); if (v > bv) { bv = v; best = it; } }
    p.equipment[slot] = best;
  }
  p.recompute(); return p;
}
const median = arr => arr.slice().sort((a, b) => a - b)[Math.floor(arr.length / 2)];
let fail = false;
const T0 = {};

// 1) Tormento (Paso 1A): multiplicadores por escalón SIN subir el nivel de área;
//    el botín gana calidad (masterwork), no ilvl. Con el equipo que da cada
//    escalón, subir de Tormento debe ser SIEMPRE más difícil (antes, +1 piso/T
//    subía el ilvl del botín y T10 con equipo de T10 era MÁS FÁCIL que T0).
console.log('== Tormento ==');
for (const base of [8, 16, 25]) {
  let prev = null;
  for (const T of [0, 3, 6, 10]) {
    const tm = tormentMods(T);
    const runs = [];
    for (let r = 0; r < 5; r++) {
      const p = buildHero(base, r);
      for (const it of Object.values(p.equipment)) if (it) it.quality = tm.quality; // botín del escalón
      p.recompute();
      const s = p.stats;
      const dps = p.avgHit(1) * (1 + s.crit / 100 * (CRIT_MULT - 1)) / s.atkTime;
      const e = scaleEnemy(ENEMIES.find(x => x.id === 'esqueleto'), base), b = scaleEnemy(bossForFloor(base), base);
      runs.push({ ttkN: e.hp * tm.hp / dps, ttkB: b.hp * tm.hp / dps, hits: s.maxHP / Math.max(1, e.dmg * tm.dmg * expectedMitigation(s, base)) });
    }
    const row = { ttkN: median(runs.map(r => r.ttkN)), ttkB: median(runs.map(r => r.ttkB)), hits: median(runs.map(r => r.hits)) };
    const errs = [];
    if (prev && !(row.ttkN > prev.ttkN)) errs.push('TTK no sube');
    if (prev && !(row.hits < prev.hits)) errs.push('aguante no baja');
    if (T === 10 && !(row.ttkB > prev0(base).ttkB * 2.5)) errs.push('T10 debe ser >×2,5 más lento que T0');
    if (row.hits < 8) errs.push('one-shots (aguantas < 8 golpes)');
    console.log(`piso ${String(base).padStart(2)} T${String(T).padStart(2)}: TTK básico ${row.ttkN.toFixed(1)}s · jefe ${row.ttkB.toFixed(0)}s · ${row.hits.toFixed(0)} golpes ${errs.length ? '❌ ' + errs.join(',') : '✓'}`);
    if (errs.length) fail = true;
    if (T === 0) T0[base] = row;
    prev = row;
  }
}
function prev0(base) { return T0[base]; }

// 2) Tasas de loot: conjuntos y legendario de jefe no se vuelven rutina con Tormento
console.log('== Loot ==');
function lootStats(floor, mf, qty) {
  let items = 0, set = 0; const N = 20000;
  for (let i = 0; i < N; i++) for (const it of rollDrops(floor, { mf, qty, cls: 'guerrero' })) if (it.kind === 'item') { items++; if (it.setId) set++; }
  let bl = 0; const BN = 20000;
  for (let i = 0; i < BN; i++) if (rollDrops(floor, { mf, qty, boss: true, cls: 'guerrero' }).some(x => x.kind === 'item' && x.rarity === 'legendario')) bl++;
  return { setPct: set / items * 100, bossLegPct: bl / BN * 100 };
}
const l0 = lootStats(16, 0, 0), l10 = lootStats(25, 120, 80);
console.log(`base: conjuntos ${l0.setPct.toFixed(1)}% · jefe-leg ${l0.bossLegPct.toFixed(0)}%   T10: conjuntos ${l10.setPct.toFixed(1)}% · jefe-leg ${l10.bossLegPct.toFixed(0)}%`);
if (l0.setPct > 8) { console.log('❌ conjuntos demasiado comunes a MF base'); fail = true; }
if (l10.setPct > 12) { console.log('❌ Tormento convierte los conjuntos en rutina'); fail = true; }
if (l10.bossLegPct > 65) { console.log('❌ el jefe garantiza legendario casi siempre'); fail = true; }

// 3) Power budget del tablero de glifos (Paso 2g): 16 puntos al Nv100 = un legendario con su
//    zócalo (9) + 7 nodos; nunca dos legendarios (18). La MEJOR asignación legal de 16 (un
//    legendario + el camino a otra casilla cualquiera, con glifos r10 de su familia en los
//    zócalos que toque) acota el poder.
console.log('== Power budget ==');
const BOARD_G = PARAGON_BOARDS.guerrero;
const BUDGET = earnedAt('board', 100);
if (BUDGET !== 16) { console.log(`❌ el tablero da ${BUDGET} puntos al Nv100 (deben ser 16)`); fail = true; }
const legIds = BOARD_G.filter(n => n.type === 'legendary').map(n => n.id);
for (const a of legIds) for (const b of legIds) if (a < b && paragonPathCost(BOARD_G, [a, b]) <= BUDGET) { console.log(`❌ ${a} y ${b} caben juntos`); fail = true; }
// caminos de cada brazo desde el Inicio (orden de compra), por BFS sobre el árbol
const startN = BOARD_G.find(n => n.type === 'start');
const prevOf = new Map([[startN.id, null]]);
for (const q = [startN]; q.length;) { const n = q.shift(); for (const o of BOARD_G) if (!prevOf.has(o.id) && Math.abs(o.x - n.x) + Math.abs(o.y - n.y) === 1) { prevOf.set(o.id, n.id); q.push(o); } }
const pathTo = id => { const out = []; for (let c = id; c && c !== startN.id; c = prevOf.get(c)) out.unshift(c); return out; };
const sockets = BOARD_G.filter(n => n.type === 'socket').map(n => n.id);
// (con semilla: con Math.random el equipo variaba y el ratio rozaba los topes)
const p = buildHero(20, 1);
const idx = () => { const s = p.stats; const dps = ((s.dmgMin + s.dmgMax) / 2) * (1 + s.crit / 100 * 0.8) / s.atkTime; return dps * s.maxHP * (1 + s.arm / 100); };
const base = idx();
let best = { ratio: 0 }, tried = 0;
for (const leg of legIds) for (const x of BOARD_G) {
  const nodes = new Set([...pathTo(leg), ...pathTo(x.id)]);
  if (nodes.size !== BUDGET) continue;
  if (paragonPathCost(BOARD_G, [...nodes]) !== BUDGET) { console.log(`❌ asignación no conexa ${[...nodes]}`); fail = true; continue; }
  tried++;
  p.paragon = { nodes: Object.fromEntries([...nodes].map(id => [id, true])), glyphs: {} };
  for (const s of sockets.filter(s => nodes.has(s))) {
    const sockFam = BOARD_G.find(n => n.id === pathTo(s)[0]).cat;
    const gt = GLYPH_TYPES.find(g => g.fam === sockFam) || GLYPH_TYPES[0];
    p.paragon.glyphs[s] = { stat: gt.stat, per: gt.per, adj: gt.adj, fam: gt.fam, famAdj: gt.famAdj, rank: 10, baseName: 'g' };
  }
  p.recompute();
  const ratio = idx() / base;
  if (ratio > best.ratio) best = { ratio, leg, to: x.id, glyphs: Object.keys(p.paragon.glyphs).length };
}
console.log(`mejor de ${tried} tableros legales de 16 puntos (legendario ${best.leg} + camino a ${best.to}, ${best.glyphs} glifos r10) = ×${best.ratio.toFixed(2)} del poder base`);
if (tried < 8) { console.log('❌ deberían probarse varias asignaciones'); fail = true; }
if (best.ratio > 2.0) { console.log('❌ el tablero infla el poder demasiado (eclipsa al equipo)'); fail = true; }
if (best.ratio < 1.15) { console.log('❌ el tablero aporta muy poco'); fail = true; }

if (fail) { console.error('❌ EQUILIBRIO DEL ENDGAME FUERA DE RANGO'); process.exit(1); }
console.log('✅ EQUILIBRIO DEL ENDGAME OK');
