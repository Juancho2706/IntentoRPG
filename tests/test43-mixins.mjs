// Regresión estructural: mixins de Game (economyMethods, enemyAbilities).
// main.js inyecta estos objetos en Game.prototype con Object.assign. Verificamos
// que el mixin de habilidades de enemigo exporta exactamente los métodos
// esperados, que todos son funciones y que no colisiona con economyMethods
// (una colisión sobrescribiría silenciosamente comportamiento real).
import { economyMethods } from '../js/economy.js';
import { enemyAbilities } from '../js/enemy-abilities.js';

const EXPECTED = [
  'updateTriggers', 'bossSummon', 'bossFrostNova', 'spawnFirePool', 'enemyWeb',
  'enemyFan', 'enemyRaise', 'enemyHeal', 'enemySnipe', 'fireSnipe', 'enemyJail',
  'enemyVortex', 'enemyShield', 'enemyChargeWarn', 'enemyChargeImpact',
  'enemySlamFx', 'enemyFrostAuraPulse', 'enemyRallyFx', 'enemyBlinkFx',
  'enemyMeleeFx', 'spawnSporeSack', 'goblinGoldDrip',
];

const keys = Object.keys(enemyAbilities);
for (const m of EXPECTED) {
  if (typeof enemyAbilities[m] !== 'function') throw new Error('falta método o no es función: ' + m);
}
if (keys.length !== EXPECTED.length) {
  throw new Error(`enemyAbilities tiene ${keys.length} métodos, esperaba ${EXPECTED.length}: ${keys.join(', ')}`);
}
console.log(`enemyAbilities exporta los ${EXPECTED.length} métodos esperados, todos funciones ✓`);

// sin colisiones de nombres entre los dos mixins (se aplican ambos al prototype)
const eco = new Set(Object.keys(economyMethods));
const overlap = keys.filter(k => eco.has(k));
if (overlap.length) throw new Error('colisión de nombres entre mixins: ' + overlap.join(', '));
console.log('Sin colisiones de nombres entre economyMethods y enemyAbilities ✓');

// todos los métodos de economyMethods siguen siendo funciones (sanidad)
for (const [k, v] of Object.entries(economyMethods)) {
  if (typeof v !== 'function') throw new Error('economyMethods.' + k + ' no es función');
}
console.log('Mixins de Game estructuralmente OK ✓');
