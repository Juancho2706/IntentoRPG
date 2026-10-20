// Paso 1B — guardado versionado declarativo (js/save-schema.js)
//  1) ida y vuelta de un héroe COMPLETO: serializar → JSON → cargar → serializar
//     da exactamente lo mismo (deepEqual), dos veces seguidas
//  2) toSaveData() == serializePlayer() y cubre TODOS los campos declarados
//  3) migración de un save "v0" realista (sin saveVersion, formatos viejos)
//  4) idempotencia: migrar un save ya en la versión actual no lo cambia; los
//     saves v0 que ya estaban en el sistema de habilidades v4 (Paso 0) no se tocan
//  5) migrateSave no muta la entrada
import assert from 'node:assert/strict';
import { CLASSES, BLESSINGS } from '../js/data.js';
import { Player } from '../js/entities.js';
import { generateItem, makeGem, makeRune, makeRiftKey, makeGlyph, makeCharm } from '../js/items.js';
import { SAVE_VERSION, PLAYER_SAVE_FIELDS, serializePlayer, migrateSave } from '../js/save-schema.js';

globalThis.performance = globalThis.performance || { now: () => Date.now() };
const mk = () => ({ ui: { spawnText() {}, message() {} }, sfx() {}, world: null, enemies: [], projectiles: [] });
const json = o => JSON.parse(JSON.stringify(o));

// ------------------------------------------------ 1) héroe completo
const G = CLASSES.guerrero;
const core = G.skills.find(s => s.kind === 'core');
const ult = G.skills.find(s => s.kind === 'ultimate');
const p = new Player(mk(), 'guerrero', null, { name: 'Probador', tint: 0x33aa66 });
p.level = 34; p.xp = 12345; p.statPoints = 3; p.skillPoints = 2; p.gold = 98765;
p.attributes = { ...p.attributes, fue: p.attributes.fue + 20 };
p.skills[core.id] = 3; p.skills[ult.id] = 1;
p.skillBranches = { [core.id]: { [`${core.id}_o`]: true } };
p.skillMods = { [core.id]: { m1: true } };
p.hotbar = p.normalizeHotbar({ lmb: 'g_tajo', rmb: core.id, k1: ult.id, k2: null, k3: null, k4: null });
p.inventory = [generateItem(20, 'raro', null, null, 'guerrero'), generateItem(25, 'legendario'), makeCharm(20)];
p.materials = [makeGem(10), makeGem(10), makeRune(), makeRiftKey(3), makeGlyph(2)];
p.equipment.weapon = generateItem(30, 'legendario', 'weapon', null, 'guerrero');
p.equipment.helm = generateItem(30, 'raro', 'helm');
p.cube = [generateItem(10, 'magico')];
p.waypoints = [1, 5, 10];
p.records.kills = 4321; p.records.maxRift = 4;
p.quest = { type: 'kill', goal: 20, progress: 7, reward: { gold: 100 } };
p.pet = { kind: 'halcon', owned: { lobo: true, halcon: true }, level: 4, xp: 33, upgrades: { pickup: 1 }, collar: 'fortuna', ownedCollars: { none: true, fortuna: true } };
p.mastery = { id: 'berserker', nodes: { b_dmg: true }, points: 2 };
p.paragon = { points: 5, nodes: { '4_3': true, '4_2': true }, glyphs: { '4_1': makeGlyph(3) } };
p.codex = { lp_test: { id: 'lp_test', name: 'Aspecto de prueba', desc: 'x' } };
const bl = BLESSINGS[0];
p.blessings = { [bl.cat]: { id: bl.id, cat: bl.cat, stat: bl.stat, value: bl.base, name: bl.name, text: 'x' } };
p.discovered.sets.s1 = true; p.discovered.bestiary.esqueleto = 3;
p.discoveredZones = ['Cripta', 'Bosque Sombrío'];
p.strongholdsCleared = ['Bosque Sombrío']; p.homeZone = 'Cripta';
p.titles = ['Temporada 1']; p.title = 'Temporada 1';
p.era = { week: 2900, xp: 50 };
p.tips = { mover: true }; p.torment = 2; p.refugeUnlocked = true; p.dailyDone = '2026-10-20';
p.supports = { [core.id]: ['multi', 'echo'] }; p.knownSupports = ['multi', 'echo'];
p.recompute();
p.hp = 123.4; p.mp = 0;

const s1 = json(p.toSaveData());
assert.equal(s1.saveVersion, SAVE_VERSION, 'el guardado lleva saveVersion');
for (const k of PLAYER_SAVE_FIELDS) assert.ok(k in s1, `falta el campo ${k} en el guardado`);
assert.deepEqual(json(serializePlayer(p)), s1, 'toSaveData debe delegar en serializePlayer');
assert.equal(s1.hp, 123, 'hp se redondea');

let cur = s1;
for (let i = 0; i < 2; i++) {
  const loaded = new Player(mk(), cur.classId, json(cur));
  assert.equal(loaded.saveVersion, undefined, 'saveVersion no vive en el héroe');
  const again = json(loaded.toSaveData());
  assert.deepEqual(again, s1, `recarga ${i + 1}: el guardado cambió`);
  cur = again;
}
console.log(`Ida y vuelta de un héroe completo (${PLAYER_SAVE_FIELDS.length} campos): idéntico tras 2 recargas ✓`);

// ------------------------------------------------ 3) save v0 realista
const gem = makeGem(5), rune = makeRune(), key = makeRiftKey(2);
const sword = generateItem(12, 'raro', 'weapon', null, 'guerrero');
const v0 = {
  classId: 'guerrero', level: 26, xp: 500, attributes: { ...G.base }, statPoints: 0, skillPoints: 1,
  // pre-v4: sin skillSystemV → se reembolsan 3 (core) + 1 rama; el básico es gratis
  skills: { g_tajo: 1, [core.id]: 3 }, skillBranches: { [core.id]: { [`${core.id}_o`]: true } },
  gold: 400, potions: { hp: 2, mp: 1 },
  // materiales viviendo aún en la mochila (formato antiguo)
  inventory: [sword, gem, rune, key],
  equipment: { weapon: null, helm: null },
  lastFloor: 8, hp: 150, mp: 40, waypoints: [1, 5], records: { kills: 99, maxFloor: 8 },
  // soporte antiguo como string
  supports: { [core.id]: 'multi' }, knownSupports: ['multi'],
  // Paragon plano antiguo
  paragon: { dmgPct: 3 },
  // mascota antigua
  pet: { level: 1 },
  heroName: 'Viejo', tint: null,
};
const frozen = JSON.stringify(v0);
const m = migrateSave(v0);
assert.equal(JSON.stringify(v0), frozen, 'migrateSave no debe mutar la entrada');
assert.equal(m.saveVersion, SAVE_VERSION);
assert.deepEqual(m.inventory.map(i => i.uid), [sword.uid], 'la mochila conserva solo el equipo');
assert.deepEqual(m.materials.map(i => i.uid).sort(), [gem.uid, rune.uid, key.uid].sort(), 'gemas/runas/llaves pasan a materiales');
assert.deepEqual(m.supports[core.id], ['multi'], 'soporte string → array');
assert.deepEqual(m.paragon, { points: 6, nodes: {}, glyphs: {} }, 'paragon plano → tablero con level-20 puntos');
assert.equal(m.skillSystemV, 4);
assert.equal(m.skillPoints, 1 + 3 + 1, 'reembolso: core 3 + 1 rama (el básico es gratis)');
assert.deepEqual(m.skills, {}); assert.deepEqual(m.skillBranches, {});

const hero = new Player(mk(), 'guerrero', v0);
assert.equal(hero.skills.g_tajo, 1, 'siempre conoce el básico');
assert.equal(hero.skillPoints, 5);
assert.equal(hero.materials.length, 3);
assert.equal(hero.pet.kind, 'lobo', 'mascota antigua normalizada');
assert.equal(hero.gold, 400); assert.equal(hero.heroName, 'Viejo');
assert.equal(hero.records.kills, 99); assert.equal(hero.records.maxFloor, 8);
assert.deepEqual(hero.waypoints, [1, 5]);
// y desde aquí el ciclo es estable
const h1 = json(hero.toSaveData());
const h2 = json(new Player(mk(), 'guerrero', json(h1)).toSaveData());
assert.deepEqual(h2, h1, 'tras migrar, la ida y vuelta es estable');
console.log('Save v0 realista migrado: materiales, soportes, paragon, reembolso v4, mascota ✓');

// ------------------------------------------------ 4) idempotencia
assert.deepEqual(migrateSave(s1), s1, 'migrar un save actual no lo cambia');
// save del Paso 0 (ya v4 pero sin saveVersion): NO reembolsa
const paso0 = { ...json(s1) }; delete paso0.saveVersion;
const mp0 = migrateSave(paso0);
assert.equal(mp0.skillPoints, s1.skillPoints, 'un save v4 sin versión no se reembolsa');
assert.deepEqual(mp0.skills, s1.skills);
assert.deepEqual(mp0.skillBranches, s1.skillBranches);
assert.equal(migrateSave(null), null);
console.log('Migración idempotente (saves actuales y del Paso 0 intactos) ✓');
