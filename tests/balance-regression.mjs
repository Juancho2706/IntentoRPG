// Regresión de RITMO (Paso 1A): XP por nivel, ataque básico y aguante por piso.
// Las rotaciones reales (habilidades, verbos, forja, talentos, élites/jefes, Tormento y
// óptimo vs típico) las mide el banco de balance (balance-bench.mjs) y la forja,
// forge-bench.mjs. Aquí se vigila lo que el banco no cubre: el ritmo de subida de nivel y que
// el ATAQUE BÁSICO (lo único que tiene un héroe recién creado) siga siendo viable, usando
// las fórmulas reales de combat-math (golpe medio, crítico topado, mitigación).
// Paso 2 (E4, B1): con el catálogo 2g las tres clases, cada una con SU básico de arma resuelto
// (coeficiente, cadencia y la Mejora de la forja, que llega sola al Nv req+3: resolveSkill),
// y sin tablero de glifos (en 2g se abre al Nv81; antes el banco ponía nodos del Paragon v1
// desde el Nv21, que ya no existen).
import { Player } from '../js/entities.js';
import { generateItem } from '../js/items.js';
import { scaleEnemy, ENEMIES, xpForLevel } from '../js/data.js';
import { CRIT_MULT, expectedMitigation, itemLevel } from '../js/combat-math.js';
import { resolveSkill } from '../js/skill-resolve.js';
import { createRng } from '../js/rng.js';

globalThis.performance = globalThis.performance || { now: () => Date.now() };
const fake = { ui: { spawnText(){}, message(){} }, sfx(){}, addShake(){}, vibrate(){}, tip(){}, spawnBurst(){}, input: { joyDir: null, keyDir: null }, enemies: [] };
const MAIN = { guerrero: 'fue', maga: 'ene', arquera: 'des' };

function buildHero(classId, floor, seed) {
  const rng = createRng(1000 + floor * 7 + seed);
  const p = new Player(fake, classId);
  p.level = Math.min(20 + Math.max(0, floor - 16) * 2, Math.max(1, floor + 4));
  const pts = 5 * (Math.min(p.level, 20) - 1);
  const main = MAIN[classId] || 'fue';
  p.attributes[main] += Math.round(pts * 0.6);
  p.attributes.vit += Math.round(pts * 0.4);
  for (const slot of ['weapon', 'helm', 'chest', 'boots', 'gloves', 'pants', 'shoulders', 'belt', 'offhand', 'ring', 'amulet']) {
    let best = null, bv = -1;
    for (let i = 0; i < 6; i++) {
      const it = generateItem(itemLevel(floor), 'raro', slot, null, classId, rng);
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

for (const classId of ['guerrero', 'maga', 'arquera']) {
  for (const floor of [1, 4, 8, 12, 16, 20, 25]) {
    const runs = [];
    for (let r = 0; r < 5; r++) {
      const p = buildHero(classId, floor, r);
      const s = p.stats;
      // básico de arma resuelto (2g): coeficiente y cadencia del perfil (con la Mejora si ya llegó)
      const wb = p.cls.skills.find(x => x.cat === 'basic' && x.type === 'weapon');
      const prof = resolveSkill(p, wb);
      const dps = p.avgHit(prof.coef, prof.addPct) * (1 + s.crit / 100 * (CRIT_MULT - 1)) / (s.atkTime * (prof.cadence || 1));
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
    console.log(`${classId.padEnd(8)} piso ${String(floor).padStart(2)}: TTK básico ${row.ttkBasic.toFixed(1)}s · aguantas ${row.hitsToDie.toFixed(0)} golpes · ${row.killsToLevel.toFixed(0)} kills/nivel ${errs.length ? '❌ ' + errs.join('; ') : '✓'}`);
    if (errs.length) fail = true;
  }
}

if (fail) { console.error('❌ RITMO FUERA DE RANGO'); process.exit(1); }
console.log('✅ RITMO (XP / básico / aguante) DENTRO DE RANGO');
