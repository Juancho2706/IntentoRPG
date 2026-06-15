// Regresión estructural: mixins de Game (economyMethods, enemyAbilities).
// main.js inyecta estos objetos en Game.prototype con Object.assign. Verificamos
// que el mixin de habilidades de enemigo exporta exactamente los métodos
// esperados, que todos son funciones y que no colisiona con economyMethods
// (una colisión sobrescribiría silenciosamente comportamiento real).
import { economyMethods } from '../js/economy.js';
import { enemyAbilities } from '../js/enemy-abilities.js';
import { endgameMethods } from '../js/game-endgame.js';
import { worldFlowMethods } from '../js/game-world-flow.js';
import { zoneLifeMethods } from '../js/game-zone-life.js';
import { masteryMethods } from '../js/game-mastery.js';
import { eraMethods } from '../js/game-eras.js';

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
  'checkDailyReward', 'travelTo', 'travelToZone', 'applyPact', 'setHomeZone',
];
const wfKeys = Object.keys(worldFlowMethods);
for (const m of WORLDFLOW_EXPECTED) {
  if (typeof worldFlowMethods[m] !== 'function') throw new Error('falta método world-flow o no es función: ' + m);
}
if (wfKeys.length !== WORLDFLOW_EXPECTED.length) {
  throw new Error(`worldFlowMethods tiene ${wfKeys.length} métodos, esperaba ${WORLDFLOW_EXPECTED.length}: ${wfKeys.join(', ')}`);
}
console.log(`worldFlowMethods exporta los ${WORLDFLOW_EXPECTED.length} métodos esperados, todos funciones ✓`);

const ZONELIFE_EXPECTED = [
  'randomZoneCellFrom', 'randomZoneCell', 'zoneTick', 'spawnWorldBoss',
  'spawnGoblin', 'goblinEscape',
];
const zlKeys = Object.keys(zoneLifeMethods);
for (const m of ZONELIFE_EXPECTED) {
  if (typeof zoneLifeMethods[m] !== 'function') throw new Error('falta método zone-life o no es función: ' + m);
}
if (zlKeys.length !== ZONELIFE_EXPECTED.length) {
  throw new Error(`zoneLifeMethods tiene ${zlKeys.length} métodos, esperaba ${ZONELIFE_EXPECTED.length}: ${zlKeys.join(', ')}`);
}
console.log(`zoneLifeMethods exporta los ${ZONELIFE_EXPECTED.length} métodos esperados, todos funciones ✓`);

const MASTERY_EXPECTED = ['masterySpent', 'chooseMastery', 'allocateMasteryNode', 'masteryRespecCost', 'respecMastery'];
const msKeys = Object.keys(masteryMethods);
for (const m of MASTERY_EXPECTED) {
  if (typeof masteryMethods[m] !== 'function') throw new Error('falta método mastery o no es función: ' + m);
}
if (msKeys.length !== MASTERY_EXPECTED.length) {
  throw new Error(`masteryMethods tiene ${msKeys.length} métodos, esperaba ${MASTERY_EXPECTED.length}: ${msKeys.join(', ')}`);
}
console.log(`masteryMethods exporta los ${MASTERY_EXPECTED.length} métodos esperados, todos funciones ✓`);

const ERA_EXPECTED = ['currentEraId', 'eraDef', 'eraMutatorBonus', 'ensureEra', 'eraObjProgress', 'eraInfo', 'claimEraReward'];
const erKeys = Object.keys(eraMethods);
for (const m of ERA_EXPECTED) {
  if (typeof eraMethods[m] !== 'function') throw new Error('falta método era o no es función: ' + m);
}
if (erKeys.length !== ERA_EXPECTED.length) {
  throw new Error(`eraMethods tiene ${erKeys.length} métodos, esperaba ${ERA_EXPECTED.length}: ${erKeys.join(', ')}`);
}
console.log(`eraMethods exporta los ${ERA_EXPECTED.length} métodos esperados, todos funciones ✓`);

// sin colisiones de nombres entre los siete mixins (se aplican todos al prototype)
const mixins = { economyMethods, enemyAbilities, endgameMethods, worldFlowMethods, zoneLifeMethods, masteryMethods, eraMethods };
const seen = new Map();
for (const [name, obj] of Object.entries(mixins)) {
  for (const k of Object.keys(obj)) {
    if (seen.has(k)) throw new Error(`colisión de nombres: "${k}" en ${seen.get(k)} y ${name}`);
    seen.set(k, name);
  }
}
console.log('Sin colisiones de nombres entre los siete mixins de Game ✓');

// todos los métodos de los mixins siguen siendo funciones (sanidad)
for (const [name, obj] of Object.entries(mixins)) {
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v !== 'function') throw new Error(`${name}.${k} no es función`);
  }
}
console.log('Mixins de Game estructuralmente OK ✓');
