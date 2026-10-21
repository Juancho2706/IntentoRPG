// Paso 1B — guardado versionado declarativo (js/save-schema.js)
//  1) ida y vuelta de un héroe COMPLETO: serializar → JSON → cargar → serializar
//     da exactamente lo mismo (deepEqual), dos veces seguidas
//  2) toSaveData() == serializePlayer() y cubre TODOS los campos declarados
//  3) migración de un save "v0" realista (sin saveVersion, formatos viejos) hasta v5:
//     sin puntos de habilidad ni ramas (Paso 2g), tablero sin nodos ni puntos
//  4) idempotencia: migrar un save ya en la versión actual no lo cambia; un save del
//     Paso 0 (habilidades v4, con rama elegida) llega a v5 una sola vez
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
// Paso 2b.0: gastadora de proyectil (admite Multiproyectil por tags) y definitiva
const core = G.skills.find(s => s.cat === 'spender' && s.tags.includes('proj'));
const ult = G.skills.find(s => s.cat === 'ultimate');
const p = new Player(mk(), 'guerrero', null, { name: 'Probador', tint: 0x33aa66 });
p.level = 34; p.xp = 12345; p.statPoints = 3; p.gold = 98765;
p.attributes = { ...p.attributes, fue: p.attributes.fue + 20 };
p.skillForge = { [core.id]: 'ii', [ult.id]: null };   // Paso 2g: variante por habilidad (D3)
p.hotbar = p.normalizeHotbar({ lmb: 'g_tajo', rmb: core.id, k1: null, k2: null, k3: null, k4: ult.id });
p.inventory = [generateItem(20, 'raro', null, null, 'guerrero'), generateItem(25, 'legendario'), makeCharm(20)];
p.materials = [makeGem(10), makeGem(10), makeRune(), makeRiftKey(3), makeGlyph(2)];
p.equipment.weapon = generateItem(30, 'legendario', 'weapon', null, 'guerrero');
p.equipment.helm = generateItem(30, 'raro', 'helm');
p.cube = [generateItem(10, 'magico')];
p.waypoints = [1, 5, 10];
p.records.kills = 4321; p.records.maxRift = 4;
p.quest = { type: 'kill', goal: 20, progress: 7, reward: { gold: 100 } };
p.pet = { kind: 'halcon', owned: { lobo: true, halcon: true }, level: 4, xp: 33, upgrades: { pickup: 1 }, collar: 'fortuna', ownedCollars: { none: true, fortuna: true } };
p.paragon.nodes = { '4_3': true, '4_2': true, '4_1': true, '4_0': true };
p.paragon.glyphs = { '4_0': makeGlyph(3) };
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
for (const k of ['skillPoints', 'skillBranches', 'skillMods', 'mastery', 'skills']) assert.ok(!(k in s1), `${k} ya no se guarda (v5)`);
assert.deepEqual(s1.skillForge, { [core.id]: 'ii', [ult.id]: null });
assert.equal(s1.talents.v, 2, 'talentos v2');

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
  // pre-v4: sin skillSystemV → v0 reembolsa y v3 recalcula los puntos desde el nivel
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
assert.deepEqual(m.paragon, { nodes: {}, glyphs: {} }, 'paragon plano → tablero de glifos sin nodos ni puntos (se derivan del nivel)');
assert.equal(m.skillSystemV, 5);
for (const k of ['skillPoints', 'skillBranches', 'skillMods', 'skills']) assert.equal(m[k], undefined, `v5: sin ${k}`);
assert.deepEqual(m.skillForge, {}, 'sin ramas traducidas, sin variantes');
assert.deepEqual(m.talents, { ...m.talents, v: 2, spec: null, cls: {}, choice: {}, hero: {}, loadouts: {} }, 'sin maestría: talentos v2 vacíos');
assert.deepEqual(m.notices, ['paso2'], 'aviso de variantes; sin Recomendado (no tenía especialización)');
assert.ok(m.hotbar.lmb, 'lmb nunca vacía');

const hero = new Player(mk(), 'guerrero', v0);
assert.ok(hero.skills.g_tajo > 0, 'siempre conoce el básico');
assert.ok(hero.skills[core.id] > 0, 'las habilidades se aprenden solas por nivel');
assert.equal(hero.materials.length, 3);
assert.equal(hero.pet.kind, 'lobo', 'mascota antigua normalizada');
assert.equal(hero.gold, 400); assert.equal(hero.heroName, 'Viejo');
assert.equal(hero.records.kills, 99); assert.equal(hero.records.maxFloor, 8);
assert.deepEqual(hero.waypoints, [1, 5]);
// y desde aquí el ciclo es estable
const h1 = json(hero.toSaveData());
const h2 = json(new Player(mk(), 'guerrero', json(h1)).toSaveData());
assert.deepEqual(h2, h1, 'tras migrar, la ida y vuelta es estable');
console.log('Save v0 realista migrado a v5: materiales, soportes, tablero, kit, mascota ✓');

// ------------------------------------------------ 4) idempotencia
assert.deepEqual(migrateSave(s1), s1, 'migrar un save actual no lo cambia');
// save del Paso 0 (habilidades v4, sin saveVersion) con rangos y una rama: llega a v5 sin
// puntos ni ramas (la rama se traduce a variante solo si la tabla legada lo dice: KA, E2)
const paso0 = { classId: 'guerrero', level: 34, skillSystemV: 4, skillPoints: 0,
  skills: { g_tajo: 1, [core.id]: 5 }, skillBranches: { [core.id]: { [`${core.id}_o`]: true } },
  skillMods: { [core.id]: { [`${core.id}_o`]: `${core.id}_o1` } } };
const mp0 = migrateSave(paso0);
assert.equal(mp0.saveVersion, SAVE_VERSION);
for (const k of ['skillPoints', 'skillBranches', 'skillMods']) assert.equal(mp0[k], undefined, `Paso 0 → v5: sin ${k}`);
assert.equal(typeof mp0.skillForge, 'object');
assert.deepEqual(migrateSave(mp0), mp0, 'migrar dos veces da lo mismo');
assert.equal(migrateSave(null), null);
console.log('Migración idempotente (saves actuales y del Paso 0 intactos) ✓');
