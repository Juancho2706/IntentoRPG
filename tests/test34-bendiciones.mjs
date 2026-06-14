// Endgame Fase 2: Bendiciones permanentes (recompensa de corrupción/grieta)
import * as THREE from 'three';
import { BLESSINGS, blessingValue } from '../js/data.js';
import { Player } from '../js/entities.js';
import { buildDungeon } from '../js/world.js';

globalThis.performance = globalThis.performance || { now: () => Date.now() };

// 1) el valor de una bendición escala con el nivel de grieta (corrupción)
const bMf = BLESSINGS.find(x => x.stat === 'mf');
if (blessingValue(bMf, 0) !== bMf.base) throw new Error('valor base incorrecto');
if (!(blessingValue(bMf, 5) > blessingValue(bMf, 1))) throw new Error('la bendición no escala con el tier');
console.log(`Bendición escala con corrupción: T1=${blessingValue(bMf, 1)} < T5=${blessingValue(bMf, 5)} ✓`);

// 2) una bendición equipada afecta a las stats (recompute real)
const world = buildDungeon(1);
const g = { ui: { spawnText() {}, message() {}, flashDamage() {} }, sfx() {}, world, enemies: [], input: { joyDir: null, keyDir: null } };
const p = new Player(g, 'guerrero'); g.player = p;
const mf0 = p.stats.mf, hp0 = p.stats.maxHP;
const bHp = BLESSINGS.find(x => x.stat === 'hp');
p.blessings = {
  Fortuna: { ...bMf, value: blessingValue(bMf, 5), text: 'x' },
  Defensiva: { ...bHp, value: blessingValue(bHp, 5), text: 'x' },
};
p.recompute();
if (p.stats.mf <= mf0) throw new Error('la bendición de hallazgo mágico no se aplicó');
if (p.stats.maxHP <= hp0) throw new Error('la bendición de vida no se aplicó');
console.log(`Bendiciones aplicadas: MF ${mf0}→${p.stats.mf}, HP ${hp0}→${p.stats.maxHP} ✓`);

// 3) una bendición por categoría: reasignar reemplaza (no acumula)
p.blessings.Fortuna = { ...bMf, value: blessingValue(bMf, 1), text: 'x' };
p.recompute();
const mfLow = p.stats.mf;
p.blessings.Fortuna = { ...bMf, value: blessingValue(bMf, 9), text: 'x' };
p.recompute();
if (!(p.stats.mf > mfLow)) throw new Error('reemplazar la bendición de la categoría no actualizó las stats');
console.log('Una bendición por categoría (reemplazo, no acumulación) ✓');

void THREE;
console.log('test34-bendiciones OK');
