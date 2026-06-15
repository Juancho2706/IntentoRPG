// Regresión estructural: mixins de Game (economyMethods, enemyAbilities).
// main.js inyecta estos objetos en Game.prototype con Object.assign. Verificamos
// que el mixin de habilidades de enemigo exporta exactamente los métodos
// esperados, que todos son funciones y que no colisiona con economyMethods
// (una colisión sobrescribiría silenciosamente comportamiento real).
import { economyMethods } from '../js/economy.js';
import { enemyAbilities } from '../js/enemy-abilities.js';
import { endgameMethods } from '../js/game-endgame.js';
import { worldFlowMethods } from '../js/game-world-flow.js';

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

const ENDGAME_EXPECTED = [
  'ensureZoneBounties', 'bountyProgress', 'grantBountyReward', 'tormentUnlocked',
  'setTorment', 'checkTormentUnlock', 'extractAspect', 'imprintCost',
  'imprintAspect', 'offerBlessing', 'chooseBlessing', 'fragmentCount',
  'pinnacleFloor', 'summonPinnacle',
];
const endKeys = Object.keys(endgameMethods);
for (const m of ENDGAME_EXPECTED) {
  if (typeof endgameMethods[m] !== 'function') throw new Error('falta método endgame o no es función: ' + m);
}
if (endKeys.length !== ENDGAME_EXPECTED.length) {
  throw new Error(`endgameMethods tiene ${endKeys.length} métodos, esperaba ${ENDGAME_EXPECTED.length}: ${endKeys.join(', ')}`);
}
console.log(`endgameMethods exporta los ${ENDGAME_EXPECTED.length} métodos esperados, todos funciones ✓`);

const WORLDFLOW_EXPECTED = [
  'ensureQuestOffer', 'acceptQuest', 'questProgress', 'claimQuest',
  'checkDailyReward', 'travelTo', 'travelToZone', 'applyPact',
];
const wfKeys = Object.keys(worldFlowMethods);
for (const m of WORLDFLOW_EXPECTED) {
  if (typeof worldFlowMethods[m] !== 'function') throw new Error('falta método world-flow o no es función: ' + m);
}
if (wfKeys.length !== WORLDFLOW_EXPECTED.length) {
  throw new Error(`worldFlowMethods tiene ${wfKeys.length} métodos, esperaba ${WORLDFLOW_EXPECTED.length}: ${wfKeys.join(', ')}`);
}
console.log(`worldFlowMethods exporta los ${WORLDFLOW_EXPECTED.length} métodos esperados, todos funciones ✓`);

// sin colisiones de nombres entre los cuatro mixins (se aplican todos al prototype)
const mixins = { economyMethods, enemyAbilities, endgameMethods, worldFlowMethods };
const seen = new Map();
for (const [name, obj] of Object.entries(mixins)) {
  for (const k of Object.keys(obj)) {
    if (seen.has(k)) throw new Error(`colisión de nombres: "${k}" en ${seen.get(k)} y ${name}`);
    seen.set(k, name);
  }
}
console.log('Sin colisiones de nombres entre los cuatro mixins de Game ✓');

// todos los métodos de los mixins siguen siendo funciones (sanidad)
for (const [name, obj] of Object.entries(mixins)) {
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v !== 'function') throw new Error(`${name}.${k} no es función`);
  }
}
console.log('Mixins de Game estructuralmente OK ✓');
