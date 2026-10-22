// Paso 1A — fórmulas de combate (js/combat-math.js) y su cableado:
// sacos (aditivo vs [×] escasos), topes (crítico, CDR, vel. ataque/movimiento,
// armadura, resistencias, robo de vida), Volátil no recursivo, Tormento sin ilvl,
// ilvl acotado, reescalado de objetos viejos (migración de guardado v1→v2).
import * as THREE from 'three';
import { readFileSync } from 'fs';
import * as CM from '../js/combat-math.js';
import { Player, Enemy } from '../js/entities.js';
import { generateItem, rollDrops, rescaleItemToCurrent } from '../js/items.js';
import { ENEMIES, scaleEnemy, BOSSES } from '../js/data.js';
import { migrateSave, SAVE_VERSION } from '../js/save-schema.js';
import { createRng } from '../js/rng.js';

globalThis.performance = globalThis.performance || { now: () => Date.now() };
const ok = (c, m) => { if (!c) throw new Error(m); };
const approx = (a, b, e = 1e-6) => Math.abs(a - b) <= e;
const fake = () => ({ ui: { spawnText() {}, message() {}, flashDamage() {} }, sfx() {}, addShake() {}, vibrate() {}, tip() {}, spawnBurst() {},
  input: { joyDir: null, keyDir: null }, enemies: [], nearestEnemy() { return null; } });

// --- 1) saco ADITIVO: soportes + mods + sinergias suman, no multiplican ---
const prof = CM.skillProfile({ mult: 2, synergyPct: 20, sups: ['amplify', 'overcharge'], mods: { dmg: 45, crit: 30 }, critBonus: 5 });
ok(prof.coef === 2 && prof.addPct === 20 + 30 + 50 + 45 && prof.critBonus === 35, 'skillProfile: ' + JSON.stringify(prof));
ok(CM.skillProfile({ mult: 2, echoMult: 0.5 }).coef === 1, 'el Eco escala el coeficiente');
const st = { dmgPct: 100, mainMult: 1.5, critDmg: 20 };
ok(approx(CM.hitDamage(10, 2, st, 50, false), 10 * 2 * (1 + 1.5) * 1.5), 'hitDamage sin crítico');
ok(approx(CM.hitDamage(10, 2, st, 50, true), 10 * 2 * (1 + 1.7) * 1.5 * CM.CRIT_MULT), 'hitDamage: crítico ×1,5 y su extra en el saco aditivo');
console.log('Saco aditivo (sinergias+soportes+mods+dmgPct+critDmg) ✓');

// --- 2) multiplicadores [×]: solo los 3 mayores, cada uno ≤ ×1,3 ---
CM.registerMultiplier('t_test_a', { mult: 1.3, when: () => true });
CM.registerMultiplier('t_test_b', { mult: 2.0, when: () => true }); // se topa a 1,3
// con condición de contexto (como la vieja Cacería: ×1,30 contra ralentizados, salvo jefes)
CM.registerMultiplier('t_test_c', { mult: 1.3, when: c => !c.e?.def?.boss && c.targetSlowed });
const act = CM.activeMultipliers(new Set(['furia', 'm_berserk', 't_test_a', 't_test_b', 't_test_c']),
  { hpFrac: 1, targetSlowed: true }, [{ id: 'x', mult: 1.12 }]);
ok(act.length === CM.MAX_MULT_ACTIVE && act.every(m => m <= 1.3) && approx(act[0], 1.3) && approx(act[1], 1.3) && approx(act[2], 1.3), 'activeMultipliers: ' + act);
ok(approx(CM.multiplierProduct(new Set(['t_test_c']), { targetSlowed: true, e: { def: { boss: true } } }), 1), 'la condición del contexto: no cuenta contra jefes');
ok(approx(CM.multiplierProduct(new Set(['t_test_c']), { targetSlowed: true, e: { def: {} } }), 1.3), 'la condición del contexto: ×1,30 contra ralentizados');
ok(CM.multiplierProduct(new Set(['m_berserk']), { hpFrac: 0.9 }) === 1, 'Sed de Batalla solo con vida baja');
delete CM.MULT_POWERS.t_test_a; delete CM.MULT_POWERS.t_test_b; delete CM.MULT_POWERS.t_test_c;
console.log('Multiplicadores escasos: máx 3 activos, tope ×1,3 c/u, hook registerMultiplier ✓');

// --- 3) topes del héroe: crítico tras bonus, vel. ataque/mov., CDR ---
const g = fake();
const p = new Player(g, 'arquera'); g.player = p;
p.attributes.des = 400; // crítico enorme por atributo
const ring = generateItem(10, 'raro', 'ring'); ring.unidentified = false; ring.affixes = { crit: 80, aspdPct: 400, spdPct: 300, cdr: 90 };
p.equipment.ring = ring; p.recompute();
ok(p.stats.crit === CM.CAPS.crit, 'crítico de hoja topado: ' + p.stats.crit);
ok(approx(p.stats.atkTime, p.cls.atkTime / 2), 'vel. ataque topada a +100 %: ' + p.stats.atkTime);
ok(approx(p.stats.spd, 4.3 * 1.5), 'vel. movimiento topada a +50 %: ' + p.stats.spd);
ok(p.stats.cdr === CM.CAPS.cdr, 'CDR de hoja topada');
p.combatRng = createRng(7);
let crits = 0; const N = 4000;
for (let i = 0; i < N; i++) if (p.rollDamage(1, 100, 0).crit) crits++;
ok(Math.abs(crits / N - CM.CAPS.crit / 100) < 0.03, 'el bonus de habilidad no salta el tope de crítico: ' + crits / N);
// Torbellino (CD 3) con CDR 50 + Frenético 30 + Raudo 30 + Masacre → NUNCA por debajo del 50 %
ok(approx(CM.skillCooldown(3, 50, { cdr: 30 }, ['swift'], true), 1.5), 'CDR única con tope 50 %');
ok(approx(CM.skillCooldown(4, 10, { cdr: -20 }, [], false), 4 * 1.1), 'los mods de CDR negativa alargan el CD');
console.log('Topes: crítico 60 % tras bonus, vel. ataque +100 %, mov. +50 %, CDR única 50 % ✓');

// --- 4) defensas en capas ---
ok(approx(CM.armorReduction(1e9, 10), CM.CAPS.armor / 100), 'armadura topada al 75 %');
ok(CM.armorReduction(200, 30) < CM.armorReduction(200, 5), 'la misma armadura rinde menos contra niveles de área altos');
const defs = { arm: 1e6, resFire: 95, dr: 80 };
const fire = CM.mitigate(1000, defs, { al: 10, element: 'fire' });
ok(fire.dmg === Math.round(1000 * 0.3 * 0.5), 'fuego: ignora armadura, resistencia topada 70 %, DR topada 50 %: ' + fire.dmg);
const blk = CM.mitigate(1000, { block: 100 }, { al: 1, rng: () => 0 });
ok(blk.blocked && blk.dmg === 500, 'bloqueo topado (40 %) y reduce el golpe a la mitad');
console.log('Defensas: armadura (vs AL, 75 %) → resistencias (70 %) → DR % (50 %) → bloqueo ✓');

// --- 5) robo de vida con tope por segundo ---
const pl = new Player(fake(), 'guerrero');
pl.hp = 1; const max = pl.stats.maxHP;
const h1 = pl.leech(1e9);
ok(approx(h1, CM.LEECH_CAP_PER_SEC * max), 'el robo de un golpe enorme se topa: ' + h1);
ok(pl.leech(1e9) === 0, 'la cubeta vacía no cura más en el mismo instante');
pl._leech = CM.leechRefill(pl._leech, max, 0.5);
ok(approx(pl.leech(1e9), CM.LEECH_CAP_PER_SEC * max * 0.5), 'la cubeta se rellena con el tiempo');
console.log(`Robo de vida: máx ${CM.LEECH_CAP_PER_SEC * 100}% de la vida/s ✓`);

// --- 6) Enemy.takeDamage: Vulnerable ×1,2; los procs no reciben [×] ---
const g2 = fake(); const hero = new Player(g2, 'guerrero'); g2.player = hero;
hero.powers = new Set(['furia']); hero.hp = hero.stats.maxHP;
const dummy = new Enemy(g2, { ...ENEMIES[0], hp: 1e7 }, new THREE.Vector3(9, 0, 0));
ok(dummy.takeDamage(1000, false) === 1150, 'Furia ×1,15 al impactar');
ok(dummy.takeDamage(1000, false, { proc: true }) === 1000, 'un proc (espinas/explosión) no recibe los [×]');
dummy.vulnT = 3;
ok(dummy.takeDamage(1000, false, { proc: true }) === 1200, 'Vulnerable ×1,2 (saco propio)');
console.log('Enemy.takeDamage: Vulnerable + [×] al impactar, procs sin [×] ✓');

// --- 7) Volátil: escala con el héroe y no es recursivo ---
ok(CM.volatileDamage(100) === 50, 'Volátil = 50 % del golpe medio');
const main = readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');
// Paso 2b.0: el poder vive en el registro (js/powers-common.js) y onEnemyKilled
// conserva la guarda _killBurst (KillInfo.nested: un estallido no vuelve a estallar)
const commonSrc = readFileSync(new URL('../js/powers-common.js', import.meta.url), 'utf8');
ok(/_killBurst/.test(main) && /nested/.test(main) && /volatileDamage\(/.test(commonSrc) && /kill\?\.nested/.test(commonSrc) && !/maxHP \|\| 20\) \* 0\.4/.test(commonSrc), 'onEnemyKilled debe usar la guarda _killBurst/nested y Volátil volatileDamage');
console.log('Volátil: daño del héroe, sin cadena recursiva ✓');

// --- 8) escalado: curva única, jefes, Tormento sin ilvl ---
ok(approx(CM.G(1), 1) && CM.G(12) > 1.9 && CM.G(12) < 2.1, 'G(AL) = 1,065^(AL−1) (×2 cada ~11 niveles)');
const z1 = scaleEnemy(ENEMIES[1], 1), z20 = scaleEnemy(ENEMIES[1], 20);
ok(z20.hp / z1.hp > CM.G(20) && z20.dmg / z1.dmg < z20.hp / z1.hp, 'vida enemiga crece más rápido que su daño');
ok(scaleEnemy(BOSSES[0], 12).hp >= BOSSES[0].hp * CM.BOSS_HP_MULT, 'los jefes multiplican su vida');
ok(CM.bossHpMult(1) === CM.BOSS_HP_MULT_MIN && CM.bossHpMult(5) > CM.bossHpMult(1) && CM.bossHpMult(30) === CM.BOSS_HP_MULT, 'rampa de vida de jefe ×4,5 → ×11');
ok(CM.eliteHpMult(36) > CM.eliteHpMult(9) && CM.eliteHpMult(9) > CM.eliteHpMult(1), 'vida de élite crece con el nivel de área');
const t10 = CM.tormentMods(10);
ok(t10.hp > 4 && t10.dmg > 2 && t10.quality === 5, 'Tormento 10: ×vida, ×daño y calidad de botín');
ok(!/scaleFloor \+= T/.test(main), 'el Tormento ya no sube el nivel de área (scaleFloor)');
console.log('Escalado: G(AL), jefes, Tormento por escalón ✓');

// --- 9) objetos: ilvl acotado, calidad del Tormento, reescalado de saves viejos ---
ok(generateItem(99, 'raro', 'weapon').ilvl === CM.ILVL_MAX, 'el ilvl del botín se acota');
const dropsQ = rollDrops(20, { minItems: 3, quality: 4 }).filter(d => d.kind === 'item');
ok(dropsQ.length && dropsQ.every(d => d.quality === 4), 'el botín del Tormento trae calidad');
const old = { uid: 1, kind: 'item', slot: 'weapon', ilvl: 30, rarity: 'raro', dmg: [70, 100], affixes: { hp: 80, dmgPct: 9, fue: 20 } };
const oldWeapon = JSON.parse(JSON.stringify(old));
ok(rescaleItemToCurrent(old) && old.sv === CM.ITEM_SCALE_VERSION, 'reescala un objeto viejo');
const f = CM.weaponBase(30) / CM.LEGACY_ITEM.weaponBase(30);
ok(old.dmg[0] === Math.round(70 * f) && old.affixes.dmgPct === 9, 'arma ×(G/lineal) y afijos % intactos');
ok(!rescaleItemToCurrent(old), 'idempotente');
const mig = migrateSave({ saveVersion: 1, classId: 'guerrero', skillSystemV: 4, equipment: { weapon: oldWeapon }, inventory: [] });
ok(mig.saveVersion === SAVE_VERSION && mig.equipment.weapon.sv === CM.ITEM_SCALE_VERSION && mig.equipment.weapon.dmg[0] < 70, 'migración v1→v2 reescala el equipo');
console.log('Objetos: ilvl ≤ 40, calidad de Tormento, migración v1→v2 idempotente ✓');

console.log('\n✅ COMBAT-MATH (Paso 1A) OK');
