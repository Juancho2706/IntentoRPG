// Regresión: economía de la mascota de utilidad (Domador de Bestias).
// Compra por modelo, mejoras con coste creciente, collares (aura) y cambio de
// modelo conservando mejoras. Verifica también el aura del collar en recompute.
import * as THREE from 'three';
import { Player } from '../js/entities.js';
import { economyMethods } from '../js/economy.js';
import { PET_KINDS, PET_UPGRADES, PET_COLLARS } from '../js/data.js';
import { buildDungeon } from '../js/world.js';

globalThis.performance = globalThis.performance || { now: () => Date.now() };

const world = buildDungeon(1);
let spawned = 0, refreshed = 0;
const g = {
  ui: { message() {}, renderPanel() {}, renderPet() {}, updateHUD() {} },
  sfx() {}, vibrate() {}, world, enemies: [], input: { joyDir: null, keyDir: null }, save() {},
  spawnPet() { spawned++; }, refreshPet() { refreshed++; },
};
Object.assign(g, economyMethods);
const p = new Player(g, 'guerrero'); g.player = p;

// --- compra: sin oro no adopta ---
p.gold = 100; p.pet = null;
g.buyPet('lobo');
if (p.pet) throw new Error('adoptó sin oro suficiente');
console.log('Sin oro no adopta ✓');

// --- compra del lobo ---
p.gold = 5000;
g.buyPet('lobo');
if (!p.pet || p.pet.kind !== 'lobo') throw new Error('no adoptó el lobo');
if (p.gold !== 5000 - PET_KINDS.lobo.price) throw new Error('no cobró el precio del lobo');
if (spawned !== 1) throw new Error('no invocó la mascota');
if (!p.pet.owned.lobo) throw new Error('no marcó el modelo como en posesión');
console.log('Adopción del lobo: cobra y aparece ✓');

// segunda compra ignorada (ya tienes compañero)
g.buyPet('halcon');
if (p.pet.kind !== 'lobo') throw new Error('buyPet no debe cambiar el modelo si ya hay pet');

// --- mejora con coste creciente ---
p.gold = 100000;
const c0 = g.petUpgradeCost('pickup');
g.upgradePet('pickup');
if ((p.pet.upgrades.pickup || 0) !== 1) throw new Error('no subió la mejora pickup');
const c1 = g.petUpgradeCost('pickup');
if (!(c1 > c0)) throw new Error('el coste de mejora no crece');
// tope: no pasa de max
for (let i = 0; i < 20; i++) g.upgradePet('pickup');
if (p.pet.upgrades.pickup !== PET_UPGRADES.pickup.max) throw new Error('superó el tope de la mejora');
console.log(`Mejoras: coste creciente (${c0}→${c1}) y tope ${PET_UPGRADES.pickup.max} respetado ✓`);

// --- collar: cobra la primera vez, aplica aura en recompute, gratis al re-equipar ---
p.gold = 100000;
const mf0 = p.stats.mf;
const goldBefore = p.gold;
g.setPetCollar('fortuna');
if (p.pet.collar !== 'fortuna') throw new Error('no equipó el collar fortuna');
if (p.gold !== goldBefore - PET_COLLARS.fortuna.price) throw new Error('no cobró el collar');
if (p.stats.mf !== mf0 + PET_COLLARS.fortuna.value) throw new Error('el aura del collar (mf) no se aplicó en recompute');
// cambiar a otro y volver: el segundo equipado de fortuna es gratis (ya en posesión)
g.setPetCollar('oro');
const gPre = p.gold;
g.setPetCollar('fortuna');
if (p.gold !== gPre) throw new Error('re-equipar un collar en posesión no debe cobrar');
console.log('Collares: cobra una vez, aplica aura y re-equipa gratis ✓');

// collar de oro aplica goldPct
g.setPetCollar('oro');
if (p.stats.goldPct !== PET_COLLARS.oro.value) throw new Error('el collar de oro no aplicó goldPct');
console.log('Collar de Avaricia aplica goldPct ✓');

// --- cambio de modelo: cobra la primera vez, conserva mejoras, reconstruye ---
p.gold = 100000;
const upgKeep = p.pet.upgrades.pickup;
const gPre2 = p.gold;
g.switchPetKind('halcon');
if (p.pet.kind !== 'halcon') throw new Error('no cambió al halcón');
if (p.gold !== gPre2 - PET_KINDS.halcon.price) throw new Error('no cobró el modelo nuevo');
if (p.pet.upgrades.pickup !== upgKeep) throw new Error('perdió las mejoras al cambiar de modelo');
if (refreshed < 1) throw new Error('no reconstruyó el modelo en escena');
// volver al lobo (ya en posesión) es gratis
const gPre3 = p.gold;
g.switchPetKind('lobo');
if (p.gold !== gPre3) throw new Error('volver a un modelo en posesión no debe cobrar');
console.log('Modelos: cobra modelo nuevo, conserva mejoras, cambio gratis si ya es tuyo ✓');

console.log('\n✅ ECONOMÍA DE LA MASCOTA OK');
