// Regresión de RITMO (Paso 1A): XP por nivel, ataque básico y aguante por piso.
// Las rotaciones reales (habilidades, soportes, mods, élites/jefes, Tormento y
// óptimo vs típico) las mide el banco de balance (balance-bench.mjs). Aquí se
// vigila lo que el banco no cubre: el ritmo de subida de nivel y que el ATAQUE
// BÁSICO (lo único que tiene un héroe recién creado) siga siendo viable, usando
// las fórmulas reales de combat-math (golpe medio, crítico topado, mitigación).
import { Player } from '../js/entities.js';
import { generateItem } from '../js/items.js';
import { scaleEnemy, ENEMIES, xpForLevel } from '../js/data.js';
import { CRIT_MULT, expectedMitigation, itemLevel } from '../js/combat-math.js';
import { createRng } from '../js/rng.js';

globalThis.performance = globalThis.performance || { now: () => Date.now() };
const fake = { ui: { spawnText(){}, message(){} }, sfx(){}, addShake(){}, vibrate(){}, tip(){}, spawnBurst(){}, input: { joyDir: null, keyDir: null }, enemies: [] };

function buildHero(floor, seed) {
  const rng = createRng(1000 + floor * 7 + seed);
  const p = new Player(fake, 'guerrero');
  p.level = Math.min(20 + Math.max(0, floor - 16) * 2, Math.max(1, floor + 4));
  const pts = 5 * (Math.min(p.level, 20) - 1);
  p.attributes.fue += Math.round(pts * 0.6);
  p.attributes.vit += Math.round(pts * 0.4);
  if (p.level > 20) {
    const order = ['4_3', '4_5', '4_2', '4_6', '4_1', '4_7', '3_2', '5_2', '3_6', '5_6', '4_0', '4_8'];
    const n = Math.min(order.length, p.level - 20);
    for (let i = 0; i < n; i++) p.paragon.nodes[order[i]] = true;
  }
  for (const slot of ['weapon', 'helm', 'chest', 'boots', 'gloves', 'pants', 'shoulders', 'belt', 'offhand', 'ring', 'amulet']) {
    let best = null, bv = -1;
    for (let i = 0; i < 6; i++) {
      const it = generateItem(itemLevel(floor), 'raro', slot, null, 'guerrero', rng);
      const v = (it.dmg ? it.dmg[0] + it.dmg[1] : 0) + (it.arm || 0) + Object.values(it.affixes).reduce((a, b) => a + b, 0);
      if (v > bv) { bv = v; best = it; }
    }
    p.equipment[slot] = best;
  }
  p.recompute();
  return p;
}

// rangos aceptables (mediana sobre 5 héroes)
const LIMITS = { ttkBasic: [0.4, 4.5], hitsToDie: [12, 80], killsToLevel: [25, 130] };
let fail = false;

for (const floor of [1, 4, 8, 12, 16, 20, 25]) {
  const runs = [];
  for (let r = 0; r < 5; r++) {
    const p = buildHero(floor, r);
    const s = p.stats;
    const dps = p.avgHit(1) * (1 + s.crit / 100 * (CRIT_MULT - 1)) / s.atkTime; // básico de arma
    const e = scaleEnemy(ENEMIES.find(x => x.id === 'esqueleto'), floor);
    runs.push({
      ttkBasic: e.hp / dps,
      hitsToDie: s.maxHP / Math.max(1, e.dmg * expectedMitigation(s, floor)),
      killsToLevel: xpForLevel(p.level) / e.xp,
    });
  }
  const med = (k) => runs.map(r => r[k]).sort((a, b) => a - b)[2];
  const row = { ttkBasic: med('ttkBasic'), hitsToDie: med('hitsToDie'), killsToLevel: med('killsToLevel') };
  const errs = Object.entries(LIMITS)
    .filter(([k, [lo, hi]]) => row[k] < lo || row[k] > hi)
    .map(([k, [lo, hi]]) => `${k}=${row[k].toFixed(1)} fuera de [${lo},${hi}]`);
  console.log(`Piso ${String(floor).padStart(2)}: TTK básico ${row.ttkBasic.toFixed(1)}s · aguantas ${row.hitsToDie.toFixed(0)} golpes · ${row.killsToLevel.toFixed(0)} kills/nivel ${errs.length ? '❌ ' + errs.join('; ') : '✓'}`);
  if (errs.length) fail = true;
}

if (fail) { console.error('❌ RITMO FUERA DE RANGO'); process.exit(1); }
console.log('✅ RITMO (XP / básico / aguante) DENTRO DE RANGO');
