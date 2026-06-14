// Regresión de EQUILIBRIO del endgame: Tormento, tasas de loot y power budget.
// Bloquea las regresiones que detectó la auditoría (Tormento injugable, conjuntos
// como rutina, jefe legendario 100%, glifos inflados).
import { Player } from '../js/entities.js';
import { generateItem, rollDrops, GLYPH_TYPES } from '../js/items.js';
import { scaleEnemy, ENEMIES, bossForFloor, PARAGON_BOARD } from '../js/data.js';
import { buildDungeon } from '../js/world.js';

globalThis.performance = globalThis.performance || { now: () => Date.now() };
const world = buildDungeon(1);
const fake = { ui: { spawnText() {}, message() {} }, sfx() {}, addShake() {}, vibrate() {}, tip() {}, spawnBurst() {}, input: { joyDir: null, keyDir: null }, world, enemies: [] };

function buildHero(floor) {
  const p = new Player(fake, 'guerrero');
  p.level = Math.min(20 + Math.max(0, floor - 16) * 2, Math.max(1, floor + 4));
  const pts = 5 * (Math.min(p.level, 20) - 1);
  p.attributes.fue += Math.round(pts * 0.6); p.attributes.vit += Math.round(pts * 0.4);
  for (const slot of ['weapon', 'helm', 'chest', 'boots', 'gloves', 'pants', 'shoulders', 'belt', 'offhand', 'ring', 'amulet']) {
    let best = null, bv = -1;
    for (let i = 0; i < 30; i++) { const it = generateItem(Math.max(1, floor), 'raro', slot); const v = (it.dmg ? it.dmg[0] + it.dmg[1] : 0) + (it.arm || 0) + Object.values(it.affixes).reduce((a, b) => a + b, 0); if (v > bv) { bv = v; best = it; } }
    p.equipment[slot] = best;
  }
  p.recompute(); return p;
}
const median = arr => arr.slice().sort((a, b) => a - b)[Math.floor(arr.length / 2)];
let fail = false;

// 1) Tormento dentro de rangos sanos (ef.piso = base + T)
console.log('== Tormento ==');
const TB = { ttkN: [0.3, 6], ttkB: [5, 70], hits: [12, 95] };
for (const [base, T] of [[8, 0], [8, 6], [16, 0], [16, 6], [16, 10], [25, 0], [25, 10]]) {
  const ef = base + T;
  const runs = [];
  for (let r = 0; r < 5; r++) {
    const p = buildHero(base), s = p.stats;
    const dps = ((s.dmgMin + s.dmgMax) / 2) * (1 + s.crit / 100 * 0.8) / s.atkTime;
    const e = scaleEnemy(ENEMIES.find(x => x.id === 'esqueleto'), ef), b = scaleEnemy(bossForFloor(ef), ef);
    const red = s.arm / (s.arm + 60 + 16 * ef);
    runs.push({ ttkN: e.hp / dps, ttkB: b.hp / dps, hits: s.maxHP / Math.max(1, e.dmg * (1 - Math.min(0.75, red))) });
  }
  const row = { ttkN: median(runs.map(r => r.ttkN)), ttkB: median(runs.map(r => r.ttkB)), hits: median(runs.map(r => r.hits)) };
  const errs = Object.entries(TB).filter(([k, [lo, hi]]) => row[k] < lo || row[k] > hi).map(([k]) => `${k}=${row[k].toFixed(1)}`);
  console.log(`piso ${String(base).padStart(2)} T${String(T).padStart(2)}: TTK ${row.ttkN.toFixed(1)}s · jefe ${row.ttkB.toFixed(0)}s · ${row.hits.toFixed(0)} golpes ${errs.length ? '❌ ' + errs.join(',') : '✓'}`);
  if (errs.length) fail = true;
}

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

// 3) Power budget del endgame: tablero completo + glifos no debe multiplicar x3+
console.log('== Power budget ==');
const p = buildHero(20);
const idx = () => { const s = p.stats; const dps = ((s.dmgMin + s.dmgMax) / 2) * (1 + s.crit / 100 * 0.8) / s.atkTime; return dps * s.maxHP * (1 + s.arm / 100); };
const base = idx();
for (const n of PARAGON_BOARD) if (n.type !== 'start') p.paragon.nodes[n.id] = true;
const gd = GLYPH_TYPES.find(g => g.id === 'g_dmg');
for (const n of PARAGON_BOARD.filter(x => x.type === 'socket')) p.paragon.glyphs[n.id] = { stat: gd.stat, per: gd.per, adj: gd.adj, rank: 10, baseName: 'g' };
p.recompute();
const ratio = idx() / base;
console.log(`endgame completo (tablero + glifos r10) = ×${ratio.toFixed(2)} del poder base`);
if (ratio > 2.8) { console.log('❌ el endgame infla el poder demasiado (eclipsa al equipo)'); fail = true; }
if (ratio < 1.3) { console.log('❌ el endgame aporta muy poco'); fail = true; }

if (fail) { console.error('❌ EQUILIBRIO DEL ENDGAME FUERA DE RANGO'); process.exit(1); }
console.log('✅ EQUILIBRIO DEL ENDGAME OK');
