// Paso 1B — azar con semilla por subsistema (js/rng.js)
//  1) PRNG determinista + helpers; hashSeed estable
//  2) misma semilla → misma mazmorra (hash del grid + spawns + interactuables,
//     incluidas las losas de acento) y misma zona; semillas distintas → distintas
//  3) misma semilla → mismo elenco de spawn (rollSpawnDef con el stream 'spawn')
//  4) misma semilla + misma secuencia de muertes → mismo botín (stream 'loot');
//     los streams son independientes (tirar de 'spawn' no altera 'loot')
//  5) grietas: semilla semanal por nivel (riftSeed) reproducible
import assert from 'node:assert/strict';
import { createRng, hashSeed, createWorldRng, riftSeed, weekIndex } from '../js/rng.js';
import { buildDungeon } from '../js/world.js';
import { buildZone } from '../js/zones.js';
import { rollSpawnDef, pickEnemyDef, scaleEnemy, rollEnemyRank } from '../js/data.js';
import { rollDrops, generateItem, makeRiftKey, withItemRng } from '../js/items.js';

globalThis.performance = globalThis.performance || { now: () => Date.now() };

// ------------------------------------------------ 1) PRNG
{
  const a = createRng(42), b = createRng(42), c = createRng(43);
  const sa = Array.from({ length: 50 }, () => a()), sb = Array.from({ length: 50 }, () => b());
  assert.deepEqual(sa, sb, 'misma semilla → misma secuencia');
  assert.notDeepEqual(sa, Array.from({ length: 50 }, () => c()), 'semilla distinta → secuencia distinta');
  assert.ok(sa.every(x => x >= 0 && x < 1), 'rango [0,1)');
  const r = createRng(7);
  for (let i = 0; i < 500; i++) { const v = r.int(3, 6); assert.ok(v >= 3 && v <= 6 && Number.isInteger(v)); }
  assert.ok(['x', 'y'].includes(r.pick(['x', 'y'])));
  assert.equal(typeof r.chance(0.5), 'boolean');
  const sh = r.shuffle([1, 2, 3, 4, 5, 6]);
  assert.deepEqual([...sh].sort(), [1, 2, 3, 4, 5, 6]);
  assert.equal(hashSeed('rift', 3, 2900), hashSeed('rift', 3, 2900));
  assert.notEqual(hashSeed('rift', 3, 2900), hashSeed('rift', 4, 2900));
  // media razonable (no sesgada)
  const m = createRng(99); let sum = 0; for (let i = 0; i < 20000; i++) sum += m();
  assert.ok(Math.abs(sum / 20000 - 0.5) < 0.02, 'media ≈ 0.5');
  console.log('PRNG sfc32 determinista + helpers + hashSeed estable ✓');
}

// ------------------------------------------------ 2) layout
const vkey = v => `${v.x.toFixed(2)},${v.z.toFixed(2)}`;
function dungeonHash(w) {
  const grid = w.grid.cells.map(r => r.join('')).join('|');
  const spawns = w.spawns.map(s => s.kind + ':' + (s.pos ? vkey(s.pos) : s.positions.map(vkey).join(';'))).join(' ');
  const inter = w.interactables.map(i => i.type + ':' + vkey(i.pos) + (i.mimic ? 'M' : '')).join(' ');
  // nº de instancias por malla (las losas de acento varían con el azar)
  const inst = w.group.children.filter(o => o.isInstancedMesh).map(o => o.count).join(',');
  return hashSeed(grid, spawns, inter, inst);
}
{
  const s = riftSeed(5, 2900);
  const a = buildDungeon(26, s), b = buildDungeon(26, s), c = buildDungeon(26, s + 1);
  assert.equal(dungeonHash(a), dungeonHash(b), 'misma semilla → misma mazmorra');
  assert.notEqual(dungeonHash(a), dungeonHash(c), 'semilla distinta → mazmorra distinta');
  // biomas con losas de acento (antes Math.random dentro de la generación)
  for (const f of [1, 6, 11, 16, 21]) assert.equal(dungeonHash(buildDungeon(f, 1234)), dungeonHash(buildDungeon(f, 1234)), `piso ${f} determinista`);
  const zh = w => hashSeed(w.grid.cells.map(r => r.join('')).join('|'), w.spawns.length, w.interactables.map(i => i.type + vkey(i.pos)).join(' '));
  const z1 = buildZone('Cripta', { seed: 777, townPocket: true }), z2 = buildZone('Cripta', { seed: 777, townPocket: true });
  assert.equal(zh(z1), zh(z2), 'misma semilla → misma zona');
  assert.notEqual(zh(z1), zh(buildZone('Cripta', { seed: 778, townPocket: true })), 'semilla distinta → zona distinta');
  console.log('Mismo layout con la misma semilla (mazmorras, losas de acento, zonas) ✓');
}

// ------------------------------------------------ 3) elenco de spawn
function castOf(seed) {
  const w = buildDungeon(16 + 3 * 2, seed);
  const rng = createWorldRng(seed);
  const sf = 22;
  const out = [];
  for (const s of w.spawns) {
    if (s.kind === 'boss') continue;
    if (s.kind === 'pack') {
      const base = pickEnemyDef(sf, rng.spawn);
      const lead = rollEnemyRank(scaleEnemy(base, sf), sf, rng.spawn);
      out.push(`pack:${base.id}:${lead.rank || '-'}:${lead.modId || ''}`);
      continue;
    }
    const d = rollSpawnDef(s.kind, sf, rng.spawn);
    out.push(`${s.kind}:${d.id}:${d.rank || '-'}:${d.modId || ''}:${d.hp}`);
  }
  return out;
}
{
  const s = riftSeed(3, 2900);
  const a = castOf(s), b = castOf(s);
  assert.ok(a.length > 3, 'hay enemigos');
  assert.deepEqual(a, b, 'misma semilla → mismo elenco');
  assert.notDeepEqual(a, castOf(riftSeed(3, 2901)), 'semilla distinta → elenco distinto');
  // élite de tesoro: 25 reintentos (como antes) → casi siempre élite
  const r = createRng(5);
  let el = 0; for (let i = 0; i < 200; i++) if (rollSpawnDef('elite', 10, r).rank === 'elite') el++;
  assert.ok(el >= 160, `élites de tesoro: ${el}/200`);
  console.log(`Mismo elenco de spawn con la misma semilla (${a.length} entradas) ✓`);
}

// ------------------------------------------------ 4) botín
const strip = d => JSON.stringify(d, (k, v) => (k === 'uid' ? undefined : v));
function lootRun(seed, burnSpawn = 0) {
  const rng = createWorldRng(seed);
  for (let i = 0; i < burnSpawn; i++) rng.spawn(); // otro subsistema consumiendo azar
  const kills = ['normal', 'campeon', 'elite', 'normal', 'boss', 'normal', 'elite', 'mimic', 'normal', 'normal'];
  const drops = [];
  for (const k of kills) {
    const opts = { mf: 120, qty: 40, cls: 'arquera', rng: rng.loot };
    if (k === 'boss') Object.assign(opts, { boss: true, goldChance: 1, potionChance: 0.8 });
    else if (k === 'elite') Object.assign(opts, { minItems: 1, itemChance: 0.3, goldChance: 1, potionChance: 0.4, setChance: 0.03 });
    else if (k === 'campeon') Object.assign(opts, { itemChance: 0.4, goldChance: 0.85, potionChance: 0.3, setChance: 0.02 });
    else if (k === 'mimic') Object.assign(opts, { minItems: 1, itemChance: 0.3, goldChance: 1, potionChance: 0.5, setChance: 0.025 });
    drops.push(...rollDrops(22, opts));
  }
  drops.push(generateItem(22, 'legendario', null, null, 'arquera', rng.loot));
  return drops.map(strip);
}
{
  const s = riftSeed(4, 2900);
  const a = lootRun(s), b = lootRun(s);
  assert.ok(a.length > 10, 'hay botín');
  assert.deepEqual(a, b, 'misma semilla + mismas muertes → mismo botín');
  assert.deepEqual(a, lootRun(s, 37), 'el stream de loot no se altera por tiradas de spawn');
  assert.notDeepEqual(a, lootRun(s + 1), 'semilla distinta → botín distinto');
  // sin rng sigue funcionando con Math.random (llamadas existentes)
  assert.ok(Array.isArray(rollDrops(5, {})));
  assert.ok(generateItem(5, 'raro').name);
  console.log(`Mismo botín con la misma semilla y secuencia de muertes (${a.length} drops) ✓`);
}

// ------------------------------------------------ 5) grietas
{
  const wk = weekIndex(new Date(Date.UTC(2026, 9, 20)));
  assert.equal(weekIndex(new Date(Date.UTC(2026, 9, 19))), wk, 'lunes y martes, misma semana');
  assert.equal(weekIndex(new Date(Date.UTC(2026, 9, 26))), wk + 1, 'el lunes siguiente cambia la semana');
  assert.equal(riftSeed(7, wk), riftSeed(7, wk));
  assert.notEqual(riftSeed(7, wk), riftSeed(8, wk));
  assert.notEqual(riftSeed(7, wk), riftSeed(7, wk + 1));
  assert.equal(createWorldRng(riftSeed(7, wk)).seed, riftSeed(7, wk));
  // las llaves traen su propia semilla, reproducible con el stream de botín
  const k1 = withItemRng(createRng(11), () => makeRiftKey(3)), k2 = withItemRng(createRng(11), () => makeRiftKey(3));
  assert.ok(Number.isInteger(k1.seed) && k1.seed >= 0, 'la llave trae seed');
  assert.equal(k1.seed, k2.seed, 'misma secuencia de botín → misma seed de llave');
  assert.notEqual(k1.seed, withItemRng(createRng(12), () => makeRiftKey(3)).seed);
  console.log('Semilla de grieta semanal por nivel reproducible ✓');
}
