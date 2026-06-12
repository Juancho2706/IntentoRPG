// Regresión de balance: si un cambio saca la dificultad de estos rangos, falla.
// Héroe simulado: nivel y equipo raro acordes al piso, vs enemigos escalados.
import { Player } from '../js/entities.js';
import { generateItem } from '../js/items.js';
import { scaleEnemy, ENEMIES, bossForFloor, xpForLevel } from '../js/data.js';
import { buildDungeon } from '../js/world.js';

globalThis.performance = globalThis.performance || { now: () => Date.now() };
const world = buildDungeon(1);
const fake = { ui: { spawnText(){}, message(){} }, sfx(){}, addShake(){}, vibrate(){}, tip(){}, spawnBurst(){}, input: { joyDir: null, keyDir: null }, world, enemies: [] };

function buildHero(floor) {
  const p = new Player(fake, 'guerrero');
  p.level = Math.min(20 + Math.max(0, floor - 16) * 2, Math.max(1, floor + 4));
  const pts = 5 * (Math.min(p.level, 20) - 1);
  p.attributes.fue += Math.round(pts * 0.6);
  p.attributes.vit += Math.round(pts * 0.4);
  if (p.level > 20) { p.paragon.dmgPct = p.level - 20; p.paragon.hp = p.level - 20; }
  for (const slot of ['weapon', 'helm', 'chest', 'boots', 'gloves', 'pants', 'shoulders', 'belt', 'offhand', 'ring', 'amulet']) {
    let best = null, bv = -1;
    for (let i = 0; i < 30; i++) {
      const it = generateItem(Math.max(1, floor), 'raro', slot);
      const v = (it.dmg ? it.dmg[0] + it.dmg[1] : 0) + (it.arm || 0) + Object.values(it.affixes).reduce((a, b) => a + b, 0);
      if (v > bv) { bv = v; best = it; }
    }
    p.equipment[slot] = best;
  }
  p.recompute();
  return p;
}

// rangos aceptables (mediana sobre 5 héroes para reducir varianza)
const LIMITS = { ttkNormal: [0.4, 3.5], ttkBoss: [5, 45], hitsToDie: [22, 80], killsToLevel: [25, 130] };
let fail = false;

for (const floor of [1, 4, 8, 12, 16, 20, 25]) {
  const runs = [];
  for (let r = 0; r < 5; r++) {
    const p = buildHero(floor);
    const s = p.stats;
    const dps = ((s.dmgMin + s.dmgMax) / 2) * (1 + s.crit / 100 * 0.8) / s.atkTime;
    const e = scaleEnemy(ENEMIES.find(x => x.id === 'esqueleto'), floor);
    const b = scaleEnemy(bossForFloor(floor), floor);
    const red = s.arm / (s.arm + 60 + 16 * floor);
    runs.push({
      ttkNormal: e.hp / dps,
      ttkBoss: b.hp / dps,
      hitsToDie: s.maxHP / Math.max(1, e.dmg * (1 - Math.min(0.75, red))),
      killsToLevel: xpForLevel(p.level) / e.xp,
    });
  }
  const med = (k) => runs.map(r => r[k]).sort((a, b) => a - b)[2];
  const row = { ttkNormal: med('ttkNormal'), ttkBoss: med('ttkBoss'), hitsToDie: med('hitsToDie'), killsToLevel: med('killsToLevel') };
  const errs = Object.entries(LIMITS)
    .filter(([k, [lo, hi]]) => row[k] < lo || row[k] > hi)
    .map(([k, [lo, hi]]) => `${k}=${row[k].toFixed(1)} fuera de [${lo},${hi}]`);
  console.log(`Piso ${String(floor).padStart(2)}: TTK ${row.ttkNormal.toFixed(1)}s · jefe ${row.ttkBoss.toFixed(0)}s · aguantas ${row.hitsToDie.toFixed(0)} golpes · ${row.killsToLevel.toFixed(0)} kills/nivel ${errs.length ? '❌ ' + errs.join('; ') : '✓'}`);
  if (errs.length) fail = true;
}

if (fail) { console.error('❌ BALANCE FUERA DE RANGO'); process.exit(1); }
console.log('✅ BALANCE DENTRO DE RANGO');
