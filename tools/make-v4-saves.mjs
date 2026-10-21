#!/usr/bin/env node
// ============================================================
// Paso 2 (impl) · E0.2 — Guardados v4 REALES y volcado del catálogo v4
// ============================================================
// Genera, con el código del juego ANTES de que el Paso 2 lo cambie (SAVE_VERSION = 4,
// commit base ccce3d9), los guardados `Player.toSaveData()` de las tres clases en
// siete niveles y todas las especializaciones, y vuelca el catálogo v4 (ids, cat, req,
// kind y slots de cada habilidad, ramas y opciones de SKILL_MODS, insignia por
// especialización y básico de arma por clase). Los consumen KA (tablas legadas de
// `js/save-legacy-<clase>.js`), M1 (`tests/test-save-2g.mjs`) y el conversor.
//
//   node tools/make-v4-saves.mjs --write    genera y escribe los dos JSON (solo con el código v4)
//   node tools/make-v4-saves.mjs --check    regenera en memoria y compara con lo commiteado (solo v4)
//   node tools/make-v4-saves.mjs --verify   comprueba los invariantes de los JSON commiteados
//                                           (NO importa código del juego: sirve en cualquier commit)
//   node tools/make-v4-saves.mjs --list     tabla resumen de los guardados commiteados
//
// Cómo se consumen (desde un test en tests/*.mjs):
//   const SAVES = JSON.parse(readFileSync(new URL('./fixtures/saves-v4-paso2.json', import.meta.url), 'utf8'));
//   // → { '<clase>-<nivel>-<spec|sin-spec>': Player.toSaveData() de SAVE_VERSION 4, tal cual lo escribe el juego }
//   const CAT = JSON.parse(readFileSync(new URL('./fixtures/catalog-v4.json', import.meta.url), 'utf8'));
//   // → CAT.classes[clase].{skills, mods, specs, weaponBasic, classGrants}, CAT.supports, CAT.slotRules,
//   //   CAT.paragonBoards[clase] y CAT._meta.saves (índice con ramas 3.ª, k2/k3 de talento, tablero, hazañas…)
// El archivo de guardados tiene una línea por guardado y NO lleva claves de metadatos (solo guardados).
//
// Los fixtures se generaron y COMMITEARON antes de tocar código del Paso 2: no hay que
// regenerarlos. Con el código en v5 `--write` y `--check` se niegan a correr (producirían
// guardados v5 y pisarían los v4 reales); `--verify` y `--list` siguen valiendo.
//
// Cómo se obtienen los guardados (nada se escribe a mano): un `Player` REAL sube nivel a
// nivel con `gainXP` (puntos de habilidad, atributos y Paragon como en el juego), y luego se
// "juega" con los MISMOS métodos que usa la interfaz: `chooseSkillMod` (ramas, con su doble
// toque), `chooseSpec`/`applyTalentPreset`/`addTalentRank` (talentos), `assignHotbar` (barra),
// `equipItem`/`socketGem` (equipo), `allocateParagonNode`/`socketGlyph` (tablero) y la
// asignación de soportes del panel de habilidades. Determinista: todo el azar sale de
// `js/rng.js` (`createRng(hashSeed(…))`), el botín por `withItemRng`, `Math.random` se
// sustituye por un stream con semilla, los `uid` se renumeran por guardado y la salida
// se serializa con un formato estable (una línea por guardado).
//
// Cobertura (por guardado; `--verify` la afirma):
//   · 3 clases × Nv {5, 10, 18, 40, 50, 60, 75}; con especialización (3 por clase) desde Nv10
//     → 3 × (1 + 6 × 3) = 57 guardados. Clave: `<clase>-<nivel>-<spec|sin-spec>`.
//   · 3.ª rama (Transformación / Variante / Recurso) elegida en 2 o 3 habilidades, más ramas
//     sueltas de las otras dos columnas y puntos de habilidad sin gastar en algunos.
//   · soportes aprendidos y engarzados (también en el básico y en activas de talento).
//   · talentos reales (preset completo, preset recortado o reparto al azar; a veces con otra
//     especialización ya gastada antes: `talents.sp` con dos mapas), activa insignia en `k3` y
//     activas de talento en `k2` (en la mayoría desde Nv18), básico alternativo en `lmb`,
//     segunda gastadora en `k2`, ranuras vacías.
//   · tablero de Paragon con nodos, glifos engarzados, glifos sin engarzar y `paragon.points`
//     sin gastar; «hazañas» (bastiones reclamados y jefes derrotados).
//   · equipo con gemas engarzadas, mochila (con un legendario sin identificar), bolsa de
//     materiales, mascota, misión, bendiciones, códice, hardcore, tintes y nombres.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const SAVES_PATH = fileURLToPath(new URL('../tests/fixtures/saves-v4-paso2.json', import.meta.url));
const CATALOG_PATH = fileURLToPath(new URL('../tests/fixtures/catalog-v4.json', import.meta.url));

const CODE_COMMIT = 'ccce3d9';                       // commit del código del juego que se vuelca
const CLASS_IDS = ['guerrero', 'maga', 'arquera'];
const LEVELS = [5, 10, 18, 40, 50, 60, 75];
const SPEC_FROM = 10;                                // la especialización se elige desde Nv10
const SEED_NAME = 'make-v4-saves·paso2';

// Campos del guardado v4 (copia CONGELADA de PLAYER_SAVE_FIELDS en SAVE_VERSION 4, en su orden;
// `--verify` no importa código del juego, así que no puede leerlos de save-schema.js)
const V4_FIELDS = [
  'classId', 'level', 'xp', 'attributes', 'statPoints', 'skillPoints', 'skillSystemV', 'skillBranches', 'hotbar',
  'gold', 'potions', 'inventory', 'materials', 'equipment', 'lastFloor', 'hp', 'mp', 'waypoints', 'records', 'cube',
  'quest', 'hardcore', 'pet', 'talents', 'era', 'titles', 'title',
  'discoveredZones', 'homeZone', 'strongholdsCleared', 'dailyDone', 'tips',
  'supports', 'knownSupports', 'skillMods', 'paragon', 'refugeUnlocked', 'discovered',
  'heroName', 'tint', 'torment', 'codex', 'blessings',
];
const SLOTS = ['lmb', 'rmb', 'k1', 'k2', 'k3', 'k4'];

// ------------------------------------------------------------
// utilidades comunes (también para --verify)
// ------------------------------------------------------------
const lf = s => s.replace(/\r\n/g, '\n');
const sha = s => createHash('sha256').update(lf(s)).digest('hex');
const isPrim = v => v === null || typeof v !== 'object';
const jsonClone = o => JSON.parse(JSON.stringify(o));
const saveKey = (cid, lvl, spec) => `${cid}-${lvl}-${spec || 'sin-spec'}`;

// «hazañas» como las cuenta talents.featCount (v4): bastiones (≤2) + jefes únicos (≤4)
const featCountOf = save =>
  Math.min(2, (save.strongholdsCleared || []).length) + Math.min(4, Math.floor((save.records?.bossKills || 0) / 3));

// Serializador estable y legible: arrays de primitivas en línea; objetos cortos en línea.
function fmt(v, ind = 0, width = 520) {
  const pad = ' '.repeat(ind);
  if (isPrim(v)) return JSON.stringify(v);
  if (Array.isArray(v)) {
    if (v.every(isPrim)) return '[' + v.map(x => JSON.stringify(x)).join(', ') + ']';
    return '[\n' + v.map(x => pad + ' ' + fmt(x, ind + 1, width)).join(',\n') + '\n' + pad + ']';
  }
  const ents = Object.entries(v);
  if (!ents.length) return '{}';
  const flat = ents.every(([, x]) => isPrim(x) || (Array.isArray(x) && x.every(isPrim)));
  if (flat) {
    const line = '{ ' + ents.map(([k, x]) => JSON.stringify(k) + ': ' + fmt(x, 0)).join(', ') + ' }';
    if (line.length + ind <= width) return line;
  }
  return '{\n' + ents.map(([k, x]) => pad + ' ' + JSON.stringify(k) + ': ' + fmt(x, ind + 1, width)).join(',\n') + '\n' + pad + '}';
}
// guardados: una línea por guardado (compacta)
const fmtSaves = saves =>
  '{\n' + Object.entries(saves).map(([k, s]) => ' ' + JSON.stringify(k) + ': ' + JSON.stringify(s)).join(',\n') + '\n}\n';

// qué hay en un guardado (la misma función alimenta el índice del catálogo y --verify/--list)
function analyze(key, save, catalog) {
  const cat = catalog.classes[save.classId];
  const skill = id => cat.skills.find(s => s.id === id) || null;
  const third = [];
  for (const [skId, brs] of Object.entries(save.skillBranches || {})) {
    const branch3 = cat.mods[skId]?.[2]?.id;
    if (branch3 && brs[branch3]) third.push(skId);
  }
  const talentIn = slot => (skill(save.hotbar?.[slot])?.kind === 'talent' ? save.hotbar[slot] : null);
  const spec = save.talents?.spec || null;
  const board = catalog.paragonBoards[save.classId] || [];
  const socketIds = new Set(board.filter(n => n.type === 'socket').map(n => n.id));
  const nodes = Object.keys(save.paragon?.nodes || {});
  return {
    key, classId: save.classId, level: save.level, spec,
    third, branches: Object.values(save.skillBranches || {}).reduce((a, o) => a + Object.keys(o || {}).length, 0),
    skillPoints: save.skillPoints, bar: SLOTS.map(s => save.hotbar?.[s] || '·').join(' '),
    k2: talentIn('k2'), k3: talentIn('k3'),
    supported: Object.entries(save.supports || {}).filter(([, l]) => l.length).length,
    knownSupports: (save.knownSupports || []).length,
    nodes: nodes.length, sockets: nodes.filter(n => socketIds.has(n)).length,
    glyphs: Object.keys(save.paragon?.glyphs || {}).length, paragonPoints: save.paragon?.points || 0,
    feats: featCountOf(save), bossKills: save.records?.bossKills || 0, strongholds: (save.strongholdsCleared || []).length,
  };
}

// ------------------------------------------------------------
// --verify / --list : invariantes de los JSON commiteados (sin código del juego)
// ------------------------------------------------------------
function loadFixtures() {
  if (!existsSync(SAVES_PATH) || !existsSync(CATALOG_PATH)) throw new Error('Faltan tests/fixtures/saves-v4-paso2.json o catalog-v4.json (corre --write con el código v4)');
  const savesText = readFileSync(SAVES_PATH, 'utf8'), catText = readFileSync(CATALOG_PATH, 'utf8');
  return { saves: JSON.parse(savesText), catalog: JSON.parse(catText), savesText, catText };
}

function verify() {
  const { saves, catalog, savesText } = loadFixtures();
  const errs = [];
  const bad = (k, m) => errs.push(`${k}: ${m}`);
  const meta = catalog._meta || {};
  if (meta.savesSha256 !== sha(savesText)) errs.push('catalog-v4.json._meta.savesSha256 no coincide con saves-v4-paso2.json (¿editado a mano?)');
  const wantKeys = [];
  for (const cid of CLASS_IDS) for (const lvl of LEVELS) {
    if (lvl < SPEC_FROM) wantKeys.push(saveKey(cid, lvl, null));
    else for (const sid of Object.keys(catalog.classes[cid].specs)) wantKeys.push(saveKey(cid, lvl, sid));
  }
  for (const k of wantKeys) if (!saves[k]) errs.push(`falta el guardado ${k}`);
  for (const k of Object.keys(saves)) if (!wantKeys.includes(k)) errs.push(`guardado inesperado ${k}`);
  const stats = {};
  for (const [key, s] of Object.entries(saves)) {
    const a = analyze(key, s, catalog), cid = s.classId, cat = catalog.classes[cid];
    for (const f of V4_FIELDS) if (!(f in s)) bad(key, `falta el campo ${f}`);
    for (const f of Object.keys(s)) if (f !== 'saveVersion' && !V4_FIELDS.includes(f)) bad(key, `campo inesperado ${f}`);
    if (s.saveVersion !== 4) bad(key, `saveVersion ${s.saveVersion} (debe ser 4)`);
    if (!cat) { bad(key, 'clase desconocida'); continue; }
    if (key !== saveKey(cid, s.level, s.talents?.spec || null)) bad(key, 'la clave no coincide con clase/nivel/especialización');
    if (s.level >= SPEC_FROM && !s.talents?.spec) bad(key, 'Nv ≥ 10 sin especialización');
    if (s.level < SPEC_FROM && s.talents?.spec) bad(key, 'especialización antes de Nv10');
    if (s.talents?.v !== 1) bad(key, 'talents.v distinto de 1 (formato v4)');
    // puntos de habilidad: 1 por nivel de Nv2 a Nv20, cada rama desbloqueada cuesta 1
    const earned = Math.min(s.level, 20) - 1;
    if (a.branches + s.skillPoints !== earned) bad(key, `puntos de habilidad: ${a.branches} ramas + ${s.skillPoints} libres ≠ ${earned}`);
    if (a.third.length < 2 || a.third.length > 3) bad(key, `la 3.ª rama debe estar elegida en 2–3 habilidades (hay ${a.third.length})`);
    for (const [skId, brs] of Object.entries(s.skillBranches)) for (const brId of Object.keys(brs)) {
      const opt = s.skillMods?.[skId]?.[brId];
      const br = cat.mods[skId]?.find(b => b.id === brId);
      if (!br || !br.opts.some(o => o.id === opt)) bad(key, `rama ${skId}/${brId} sin opción válida elegida`);
      const sk = cat.skills.find(x => x.id === skId);
      if (!sk || sk.req > s.level) bad(key, `rama de ${skId} que aún no se conoce a Nv${s.level}`);
    }
    if (!a.supported) bad(key, 'sin ningún soporte engarzado');
    if (a.knownSupports < 2) bad(key, 'menos de 2 soportes aprendidos');
    for (const [skId, list] of Object.entries(s.supports)) {
      if (!list.every(id => s.knownSupports.includes(id))) bad(key, `soporte engarzado en ${skId} que no está aprendido`);
      if (new Set(list).size !== list.length) bad(key, `soporte duplicado en ${skId}`);
    }
    // barra
    const seen = new Set();
    for (const slot of SLOTS) {
      const id = s.hotbar[slot];
      if (!id) continue;
      const sk = cat.skills.find(x => x.id === id);
      if (!sk) { bad(key, `${slot}: id desconocido ${id}`); continue; }
      if (!sk.slots.includes(slot)) bad(key, `${id} no va en ${slot}`);
      if (seen.has(id)) bad(key, `${id} repetida en la barra`);
      seen.add(id);
      if (sk.req > s.level) bad(key, `${id} en la barra sin conocerse (req ${sk.req})`);
    }
    if (!s.hotbar.lmb) bad(key, 'lmb vacía');
    // talentos
    if (s.level >= SPEC_FROM) {
      const sp = cat.specs[s.talents.spec];
      if (!sp) bad(key, `especialización desconocida ${s.talents.spec}`);
      else if (s.hotbar.k3 !== sp.insignia) bad(key, `k3 debería ser la insignia ${sp.insignia} (hay ${s.hotbar.k3})`);
      const pts = Object.values(s.talents.cls).reduce((x, y) => x + y, 0), pts2 = Object.values(s.talents.sp[s.talents.spec] || {}).reduce((x, y) => x + y, 0);
      if (s.level >= 18 && pts + pts2 < 1) bad(key, 'sin ningún punto de talento gastado');
    } else if (s.hotbar.k3) bad(key, 'k3 ocupada antes de Nv10');
    // paragon: nodos + puntos libres = puntos ganados (Nv > 20)
    const pEarned = Math.max(0, s.level - 20);
    if (a.nodes + a.paragonPoints !== pEarned) bad(key, `Paragon: ${a.nodes} nodos + ${a.paragonPoints} libres ≠ ${pEarned} ganados`);
    if (s.level >= 40 && a.sockets < 1) bad(key, 'Nv ≥ 40 sin ningún engarce activo en el tablero');
    if (s.level >= 50 && a.glyphs < 1) bad(key, 'Nv ≥ 50 sin glifos engarzados');
    for (const nid of Object.keys(s.paragon.glyphs)) if (!s.paragon.nodes[nid]) bad(key, `glifo engarzado en un nodo inactivo ${nid}`);
    // uids únicos
    const uids = [];
    (function walk(v) {
      if (!v || typeof v !== 'object') return;
      if (Array.isArray(v)) return v.forEach(walk);
      if (typeof v.uid === 'number' && v.kind) uids.push(v.uid);
      Object.values(v).forEach(walk);
    })(s);
    if (new Set(uids).size !== uids.length) bad(key, 'uids repetidos');
    // índice del catálogo
    const idx = meta.saves?.find(x => x.key === key);
    if (!idx) bad(key, 'falta en catalog-v4.json._meta.saves');
    else if (JSON.stringify(idx) !== JSON.stringify(a)) bad(key, 'su entrada en catalog-v4.json._meta.saves no coincide con el guardado');
    (stats[cid] ||= []).push(a);
  }
  // cobertura por clase
  for (const cid of CLASS_IDS) {
    const l = stats[cid] || [];
    const n = (f) => l.filter(f).length;
    if (n(a => a.k2) < 6) errs.push(`${cid}: menos de 6 guardados con una activa de talento en k2 (${n(a => a.k2)})`);
    if (n(a => a.level >= 18 && a.k2) < 6) errs.push(`${cid}: menos de 6 guardados de Nv ≥ 18 con k2 de talento`);
    if (n(a => a.paragonPoints > 0 && a.level >= 40) < 6) errs.push(`${cid}: menos de 6 guardados con paragon.points sin gastar`);
    if (n(a => a.feats >= 3) < 3) errs.push(`${cid}: menos de 3 guardados con ≥ 3 hazañas`);
    if (n(a => a.feats === 0) < 3) errs.push(`${cid}: menos de 3 guardados sin hazañas`);
    if (n(a => a.skillPoints > 0) < 5) errs.push(`${cid}: menos de 5 guardados con puntos de habilidad sin gastar`);
    const lmbAlt = l.filter(a => a.bar.split(' ')[0] !== catalog.classes[cid].weaponBasic).length;
    if (lmbAlt < 5) errs.push(`${cid}: menos de 5 guardados con un básico alternativo en lmb (${lmbAlt})`);
    const emptySlot = l.filter(a => a.level >= 18 && a.bar.split(' ').includes('·')).length;
    if (emptySlot < 2) errs.push(`${cid}: menos de 2 guardados de Nv ≥ 18 con una ranura vacía`);
    const dual = Object.values(saves).filter(s => s.classId === cid && Object.values(s.talents.sp || {}).filter(r => Object.keys(r).length).length >= 2).length;
    if (dual < 2) errs.push(`${cid}: menos de 2 guardados con rangos en dos especializaciones (${dual})`);
  }
  if (errs.length) {
    console.error(`❌ ${errs.length} problema(s) en los fixtures v4:\n - ` + errs.join('\n - '));
    process.exit(1);
  }
  console.log(`✅ ${Object.keys(saves).length} guardados v4 y catálogo v4 coherentes (commit del código: ${meta.codeCommit}).`);
}

function list() {
  const { saves, catalog } = loadFixtures();
  const rows = Object.entries(saves).map(([k, s]) => analyze(k, s, catalog));
  console.log('clave'.padEnd(30), 'ramas3'.padEnd(4), 'ptsH', 'soporte', 'k2'.padEnd(18), 'k3'.padEnd(18), 'nodos/eng/glifos/pts', 'hazañas');
  for (const a of rows) {
    console.log(a.key.padEnd(30), String(a.third.length).padEnd(6), String(a.skillPoints).padEnd(4), `${a.supported}/${a.knownSupports}`.padEnd(7),
      (a.k2 || '·').padEnd(18), (a.k3 || '·').padEnd(18), `${a.nodes}/${a.sockets}/${a.glyphs}/${a.paragonPoints}`.padEnd(20), `${a.feats} (b${a.bossKills} f${a.strongholds})`);
  }
}

// ------------------------------------------------------------
// generación (solo con el código en SAVE_VERSION 4)
// ------------------------------------------------------------
async function loadGame() {
  globalThis.performance = globalThis.performance || { now: () => Date.now() };
  const imp = p => import(new URL(p, import.meta.url).href);
  const [schema, data, ents, items, skillDefs, skillResolve, talents, rngMod, gameSkills, gameTalents, economy] = await Promise.all([
    imp('../js/save-schema.js'), imp('../js/data.js'), imp('../js/entities.js'), imp('../js/items.js'), imp('../js/skill-defs.js'),
    imp('../js/skill-resolve.js'), imp('../js/talents.js'), imp('../js/rng.js'), imp('../js/game-skills.js'),
    imp('../js/game-talents.js'), imp('../js/economy.js'),
  ]);
  return { schema, data, ents, items, skillDefs, skillResolve, talents, rngMod, gameSkills, gameTalents, economy };
}

// juego falso con los mixins REALES que usa la interfaz para cada acción
function makeGame(M) {
  const g = {
    state: 'play', settings: {}, inSafeCamp: true, enemies: [], projectiles: [],
    ui: {
      message() {}, spawnText() {}, levelUpFlash() {}, refreshHotbar() {}, refreshSkillsView() {}, updateHUD() {},
      renderPanel() {}, renderShop() {}, itemPopup() {}, logLoot() {},
    },
    sfx() {}, vibrate() {}, spawnBurst() {}, tip() {}, save() {}, spawnPet() {},
  };
  Object.assign(g, M.gameSkills.skillMethods, M.gameTalents.talentMethods, M.economy.economyMethods);
  return g;
}

const NAMES = {
  guerrero: ['Aldrik', 'Brenna', 'Torvald', 'Hilda', 'Ragnar', 'Sigrid'],
  maga: ['Eowyn', 'Lyra', 'Ilvana', 'Merrin', 'Selene', 'Orlaith'],
  arquera: ['Aelin', 'Faelan', 'Nerys', 'Thalia', 'Kaelen', 'Ysolde'],
};
const TINTS = [null, null, null, 0xc44536, 0x3a86a8, 0x6a994e, 0x9d4edd, 0xe9c46a];
// piezas de equipo por nivel (cuántas ranuras llevan algo)
const GEAR_ORDER = ['weapon', 'chest', 'helm', 'boots', 'offhand', 'gloves', 'shoulders', 'belt', 'pants', 'amulet', 'ring', 'ring'];
const GEAR_COUNT = { 5: 3, 10: 5, 18: 7, 40: 10, 50: 11, 60: 12, 75: 12 };
// grietas superadas (rango de los glifos y de las bendiciones) por nivel
const MAX_RIFT = { 5: 0, 10: 0, 18: 0, 40: 3, 50: 6, 60: 9, 75: 14 };
const BOSS_KILLS = { 5: [0, 0], 10: [0, 2], 18: [0, 4], 40: [3, 9], 50: [6, 14], 60: [9, 18], 75: [12, 24] };

let mathRandomCalls = 0;   // fugas de Math.random durante la generación (informativo; el stream tiene semilla)

function buildSave(M, classId, level, specId, index) {
  const { createRng, hashSeed } = M.rngMod;
  const { CLASSES, SKILL_MODS, SUPPORTS, ZONE_LIST, BLESSINGS, blessingValue, xpForLevel, PET_KINDS, PET_COLLARS, paragonBoardFor, generateQuest } = M.data;
  const { generateItem, makeGem, makeRune, makeRiftKey, makeFragment, makeCharm, makeGlyph, withItemRng } = M.items;
  const { supportFits, supportSockets, skillSlots } = M.skillDefs;
  const { isKnown, fitsSlot } = M.skillResolve;
  const { Player } = M.ents;
  const key = saveKey(classId, level, specId);

  const rng = createRng(hashSeed(SEED_NAME, classId, level, specId || 'none'));
  const R = name => rng.fork(name);
  const mathRandom = R('math-random');                     // nada de azar sin semilla
  Math.random = () => { mathRandomCalls++; return mathRandom(); };
  const g = makeGame(M);
  const r0 = R('hero');
  const heroName = r0.chance(0.5) ? r0.pick(NAMES[classId]) : undefined;
  const tint = r0.pick(TINTS);
  const p = new Player(g, classId, null, { name: heroName, tint });
  g.player = p;
  const cls = CLASSES[classId];

  // ---- 1) nivel a nivel (puntos de habilidad Nv2–20, Paragon desde Nv21, habilidades aprendidas solas)
  for (let l = 1; l < level; l++) p.gainXP(xpForLevel(p.level));
  p.xp = Math.floor(R('xp').float(0, 0.8) * xpForLevel(p.level));

  // ---- 2) atributos como el panel de personaje (+1 y −1 punto)
  {
    const r = R('stats');
    const main = cls.mainStat, others = ['fue', 'des', 'vit', 'ene'].filter(a => a !== main);
    const leave = r.chance(0.35) ? r.int(1, 8) : 0;
    while (p.statPoints > leave) {
      const u = r.float();
      const stat = u < 0.5 ? main : u < 0.8 ? 'vit' : r.pick(others);
      p.attributes[stat]++; p.statPoints--;
    }
    p.recompute();
  }

  // ---- 3) equipo (generado por el botín real), gemas, mochila y materiales
  {
    const r = R('gear');
    const ilvlOf = () => Math.max(1, Math.round(level * 0.8) + r.int(-2, 1));
    const roll = () => {
      const u = r.float();
      if (level >= 25 && u < 0.10) return 'legendario';
      if (level >= 10 && u < 0.45) return 'raro';
      return u < 0.8 ? 'magico' : 'normal';
    };
    const mats = [];
    const nGems = r.int(1, level >= 40 ? 8 : 4);
    for (let i = 0; i < nGems; i++) mats.push(withItemRng(r, () => makeGem(ilvlOf())));
    for (let i = r.int(0, 2); i > 0; i--) mats.push(withItemRng(r, () => makeRune()));
    if (level >= 40) for (let i = r.int(0, 2); i > 0; i--) mats.push(withItemRng(r, () => makeRiftKey(r.int(1, MAX_RIFT[level] || 1))));
    if (level >= 60 && r.chance(0.5)) mats.push(withItemRng(r, () => makeFragment()));
    p.materials.push(...mats);
    for (const slot of GEAR_ORDER.slice(0, GEAR_COUNT[level])) {
      const it = generateItem(ilvlOf(), roll(), slot, null, classId, r);
      it.unidentified = false;
      p.discover?.(it);
      p.inventory.push(it);
      g.equipItem(p.inventory.length - 1);
    }
    // gemas en los engarces libres del equipo
    for (const it of Object.values(p.equipment)) {
      while (it && it.sockets && (it.gems?.length || 0) < it.sockets) {
        const gi = p.materials.findIndex(m => m.kind === 'gem' || (m.kind === 'rune' && r.chance(0.3)));
        if (gi < 0) break;
        g.socketGem(it.uid, gi);
      }
    }
    // mochila: unas pocas piezas sueltas (una legendaria sin identificar a veces) y algún amuleto
    for (let i = r.int(0, Math.min(6, 1 + Math.floor(level / 12))); i > 0; i--) {
      const it = generateItem(ilvlOf(), i === 1 && level >= 25 && r.chance(0.5) ? 'legendario' : roll(), null, null, classId, r);
      if (it.rarity !== 'legendario' || r.chance(0.5)) it.unidentified = false;
      if (r.chance(0.15)) it.fav = true;
      p.inventory.push(it);
    }
    if (level >= 18 && r.chance(0.4)) p.inventory.push(withItemRng(r, () => makeCharm(ilvlOf())));
    if (level >= 40 && r.chance(0.5)) { const it = generateItem(ilvlOf(), 'raro', null, null, classId, r); it.unidentified = false; p.cube.push(it); }
    p.gold = r.int(60, 400 + level * 260);
    p.potions = { hp: r.int(1, 9), mp: r.int(0, 6) };
    p.recompute();
  }

  // ---- 4) ramas de habilidad (puntos de Nv2–20): 3.ª rama en 2–3 habilidades + ramas sueltas
  {
    const r = R('branches');
    const pool = r.shuffle(cls.skills.filter(s => s.kind !== 'talent' && SKILL_MODS[s.id] && isKnown(p, s)));
    const unlock = (sk, bi) => {
      const br = SKILL_MODS[sk.id][bi], opt = r.pick(br.opts);
      g.chooseSkillMod(sk.id, br.id, opt.id);                 // 1.er toque: aviso
      g.chooseSkillMod(sk.id, br.id, opt.id);                 // 2.º toque: desbloquea (1 punto)
      return { br, opt };
    };
    const n3 = Math.min(pool.length, r.chance(0.5) ? 3 : 2);
    const chosen3 = [];
    for (const sk of pool.slice(0, n3)) chosen3.push({ sk, ...unlock(sk, 2) });
    // otras ramas (Ofensiva / Ímpetu o Potencia / Duración…) en las mismas u otras habilidades
    const others = [];
    for (const sk of pool) for (const bi of [0, 1]) if (!p.skillBranches[sk.id]?.[SKILL_MODS[sk.id][bi].id]) others.push([sk, bi]);
    r.shuffle(others);
    // se gastan casi todos los puntos; en ~40 % de los héroes quedan algunos sin gastar
    const keepFree = r.chance(0.4) ? r.int(1, Math.max(1, Math.min(6, p.skillPoints - 1))) : 0;
    for (const [sk, bi] of others) if (p.skillPoints > keepFree) unlock(sk, bi);
    // cambiar libremente de opción en una rama ya desbloqueada (gratis)
    if (chosen3.length && r.chance(0.5)) {
      const c = r.pick(chosen3);
      g.chooseSkillMod(c.sk.id, c.br.id, r.pick(c.br.opts).id);
    }
  }

  // ---- 5) talentos (Nv ≥ 10) por los métodos del juego
  if (level >= SPEC_FROM) {
    const r = R('talents');
    const specs = M.talents.TALENT_TREES[classId].specs.map(s => s.id);
    const style = ['preset', 'partial', 'random'][(index + specs.indexOf(specId)) % 3];
    const dual = (index % 4) === 1 || (level >= 40 && specId === specs[(index + 1) % 3] && r.chance(0.3));
    const spend = (mode) => {
      if (mode === 'preset') g.applyTalentPreset('all');
      else if (mode === 'partial') {
        g.applyTalentPreset('all');
        for (let k = r.int(2, 5); k > 0; k--) {
          const c = [];
          for (const which of ['cls', 'spec']) {
            const tree = M.talents.treeOf(p, which);
            for (const n of tree?.nodes || []) if (!n.free && M.talents.canRemoveRank(p, which, n.id)) c.push([which, n.id]);
          }
          if (!c.length) break;
          const [which, id] = r.pick(c);
          g.removeTalentRank(which, id);
        }
      } else {
        const leave = r.int(0, 3);
        for (let guard = 0; guard < 400; guard++) {
          const info = g.talentPointsInfo();
          if (info.cls + info.spec <= leave) break;
          const c = [];
          for (const which of ['cls', 'spec']) {
            const tree = M.talents.treeOf(p, which);
            for (const n of tree?.nodes || []) if (!n.free && M.talents.canAddRank(p, which, n.id)) c.push([which, n.id, n]);
          }
          if (!c.length) break;
          const [which, id, node] = r.pick(c);
          g.addTalentRank(which, id);
          if (node.t === 'c') g.chooseTalentOption(id, r.pick(node.opts).k);
        }
      }
    };
    if (dual) {                                             // gastó antes en otra especialización y cambió
      const other = specs.filter(s => s !== specId)[r.int(0, 1)];
      g.chooseSpec(other);
      spend(r.pick(['preset', 'random']));
    }
    g.chooseSpec(specId);
    spend(style);
    // elecciones A/B al revés en algún nodo de elección comprado
    if (r.chance(0.4)) for (const which of ['cls', 'spec']) {
      const tree = M.talents.treeOf(p, which);
      const nodes = (tree?.nodes || []).filter(n => n.t === 'c' && (M.talents.ranksOf(p, which)[n.id] | 0) > 0);
      if (nodes.length && r.chance(0.5)) g.toggleTalentChoice(which, r.pick(nodes).id);
    }
  }

  // ---- 6) barra a mano: básico alternativo, segunda gastadora o activa de talento en k2, ranuras vacías
  {
    const r = R('bar');
    const known = cls.skills.filter(s => isKnown(p, s));
    const basics = known.filter(s => s.cat === 'basic' && s.id !== p.hotbar.lmb);
    if (basics.length && (index % 3) !== 0) g.assignHotbar('lmb', r.pick(basics).id);
    const talentK2 = known.filter(s => s.kind === 'talent' && skillSlots(s).includes('k2') && !Object.values(p.hotbar).includes(s.id));
    const spenders = known.filter(s => s.cat === 'spender' && s.id !== p.hotbar.rmb && skillSlots(s).includes('k2'));
    const wantTalent = level >= 18 ? r.chance(0.8) : r.chance(0.5);
    if (talentK2.length && wantTalent) g.assignHotbar('k2', r.pick(talentK2).id);
    else if (spenders.length && r.chance(0.4)) g.assignHotbar('k2', r.pick(spenders).id);
    if (level >= 18 && r.chance(0.3)) g.assignHotbar(r.pick(['k1', 'k4']), null);     // ranura vacía a propósito
    if (level >= 18 && r.chance(0.2)) { const alt = known.filter(s => s.cat === 'spender' && s.id !== p.hotbar.rmb && !Object.values(p.hotbar).includes(s.id)); if (alt.length) g.assignHotbar('rmb', r.pick(alt).id); }
  }

  // ---- 7) soportes aprendidos y engarzados (como el panel de habilidades)
  {
    const r = R('supports');
    const nKnown = Math.min(SUPPORTS.length, 2 + Math.floor(level / 9));
    p.knownSupports = r.shuffle(SUPPORTS.map(s => s.id)).slice(0, nKnown);
    const known = cls.skills.filter(s => isKnown(p, s));
    const inBar = [...new Set(SLOTS.map(s => p.hotbar[s]).filter(Boolean))].map(id => cls.skills.find(s => s.id === id));
    const extra = r.shuffle(known.filter(s => !inBar.includes(s)));
    const targets = [...r.shuffle(inBar), ...extra].slice(0, level < 18 ? r.int(2, 3) : r.int(3, 6));
    for (const sk of targets) {
      const compat = r.shuffle(SUPPORTS.filter(s => p.knownSupports.includes(s.id) && supportFits(s, sk)).map(s => s.id));
      if (!compat.length) continue;
      const n = Math.min(compat.length, r.int(1, supportSockets(sk)));
      p.supports[sk.id] = compat.slice(0, n);
    }
    // garantía: al menos una habilidad con soporte
    if (!Object.values(p.supports).some(l => l.length)) {
      for (const sk of [...inBar, ...known]) {
        const s = SUPPORTS.find(x => supportFits(x, sk));
        if (s) { if (!p.knownSupports.includes(s.id)) p.knownSupports.push(s.id); p.supports[sk.id] = [s.id]; break; }
      }
    }
    p.resolved = {};
    p.recompute();
  }

  // ---- 8) tablero de Paragon (desde Nv21): nodos, glifos engarzados y puntos sin gastar
  if (level > 20) {
    const r = R('paragon');
    const board = paragonBoardFor(classId);
    const earned = p.paragon.points;
    const frac = [0.55, 0.75, 1][(index + level) % 3];
    const spendN = Math.max(8, Math.min(board.length - 1, Math.round(earned * frac)));
    const adj = n => board.filter(o => Math.abs(o.x - n.x) + Math.abs(o.y - n.y) === 1);
    // 1) un camino directo a uno o dos engarces (garantiza glifos), 2) el resto al azar ponderado
    const sockets = r.shuffle(board.filter(n => n.type === 'socket'));
    const wantSockets = spendN >= 12 ? 2 : 1;
    const start = board.find(n => n.type === 'start');
    const pathTo = (target) => {                          // BFS desde el inicio (vecinos en orden de tablero)
      const prev = new Map([[start.id, null]]), q = [start];
      while (q.length) {
        const cur = q.shift();
        if (cur.id === target.id) break;
        for (const nb of adj(cur)) if (!prev.has(nb.id)) { prev.set(nb.id, cur.id); q.push(nb); }
      }
      const path = [];
      for (let id = target.id; id && id !== start.id; id = prev.get(id)) path.unshift(id);
      return path;
    };
    for (const t of sockets.slice(0, wantSockets)) for (const id of pathTo(t)) if (p.paragon.points > earned - spendN) g.allocateParagonNode(id);
    const WEIGHT = { socket: 3, legendary: 2, rare: 2, magic: 1.5, minor: 1 };
    while (p.paragon.points > earned - spendN) {
      const cand = board.filter(n => n.type !== 'start' && !p.paragon.nodes[n.id] && g.paragonNodeReachable(n.id));
      if (!cand.length) break;
      const total = cand.reduce((a, n) => a + (WEIGHT[n.type] || 1), 0);
      let u = r.float() * total, pick = cand[0];
      for (const n of cand) { u -= WEIGHT[n.type] || 1; if (u <= 0) { pick = n; break; } }
      g.allocateParagonNode(pick.id);
    }
    // glifos: uno por engarce activo (a veces uno queda sin engarzar) y algún glifo suelto en la bolsa
    const maxRift = MAX_RIFT[level] || 1;
    const active = board.filter(n => n.type === 'socket' && p.paragon.nodes[n.id]);
    let skipped = false;
    for (const sNode of active) {
      p.materials.push(withItemRng(r, () => makeGlyph(r.int(1, Math.min(10, maxRift + 1)))));
      if (!skipped && active.length > 1 && r.chance(0.2)) { skipped = true; continue; }
      g.socketGlyph(sNode.id, p.materials.length - 1);
    }
    for (let i = r.int(0, 2); i > 0; i--) p.materials.push(withItemRng(r, () => makeGlyph(r.int(1, Math.min(10, maxRift + 1)))));
  }

  // ---- 9) progreso del mundo, registros y endgame
  {
    const r = R('world');
    const rec = p.records;
    rec.kills = level * r.int(140, 260) + r.int(0, 99);
    rec.eliteKills = Math.floor(rec.kills * r.float(0.02, 0.05));
    const [bLo, bHi] = BOSS_KILLS[level];
    rec.bossKills = r.int(bLo, bHi);
    rec.mimics = r.int(0, Math.floor(level / 6));
    rec.deaths = r.int(0, Math.floor(level / 3));
    rec.maxFloor = Math.max(1, Math.min(60, Math.round(level / 2.2) + r.int(0, 3)));
    rec.legendaries = Object.values(p.equipment).filter(it => it?.rarity === 'legendario').length + r.int(0, 2);
    rec.setPieces = r.int(0, 2);
    rec.goldEarned = p.gold + level * r.int(300, 900);
    rec.chests = r.int(2, 8) * level;
    rec.playTime = level * r.int(700, 1500);
    rec.quests = r.int(0, level >> 1);
    rec.dailies = r.int(0, Math.floor(level / 8));
    rec.maxRift = MAX_RIFT[level];
    p.lastFloor = r.int(1, rec.maxFloor);
    p.waypoints = [...new Set([1, ...Array.from({ length: r.int(1, 4) }, () => r.int(1, rec.maxFloor))])].sort((a, b) => a - b);
    p.discoveredZones = ZONE_LIST.filter(z => z.minLevel <= level).map(z => z.biome);
    // hazañas: bastiones reclamados (≤2)
    const strongholds = ZONE_LIST.filter(z => z.stronghold && z.minLevel <= level).map(z => z.biome);
    p.strongholdsCleared = level >= 18 ? strongholds.filter((_, i) => i === 0 || level >= 40 || r.chance(0.5)) : [];
    if (level >= 18 && !p.strongholdsCleared.length) p.strongholdsCleared = strongholds.slice(0, 1);
    if (level < 40 && p.strongholdsCleared.length > 1 && r.chance(0.5)) p.strongholdsCleared.pop();
    p.homeZone = p.strongholdsCleared.length && r.chance(0.4) ? r.pick(p.strongholdsCleared) : 'Cripta';
    p.refugeUnlocked = level >= 10 && r.chance(0.7);
    p.tips = Object.fromEntries(['mover', 'subir', 'botin'].slice(0, r.int(0, 3)).map(t => [t, true]));
    if (r.chance(0.35)) p.quest = generateQuest(level);
    if (p.quest) p.quest.progress = r.int(0, p.quest.goal - 1);
    if (level >= 18 && r.chance(0.5)) {
      const kind = r.pick(Object.keys(PET_KINDS));
      const collarIds = Object.keys(PET_COLLARS);
      const collar = r.pick(collarIds);
      p.pet = { kind, owned: { [kind]: true }, level: r.int(1, 6), xp: r.int(0, 80), upgrades: r.chance(0.6) ? { pickup: r.int(1, 3) } : {},
        collar, ownedCollars: { none: true, [collar]: true } };
    }
    if (level >= 40) for (const it of Object.values(p.equipment)) if (it?.power && !p.codex[it.power.id]) p.codex[it.power.id] = { id: it.power.id, name: it.power.name, desc: it.power.desc };
    if (level >= 60) {
      const cats = r.shuffle([...new Set(BLESSINGS.map(b => b.cat))]).slice(0, r.int(1, 3));
      for (const cat of cats) {
        const b = r.pick(BLESSINGS.filter(x => x.cat === cat));
        const value = blessingValue(b, r.int(1, MAX_RIFT[level]));
        p.blessings[cat] = { id: b.id, cat, stat: b.stat, value, name: b.name, text: b.desc.replace('{v}', value) };
      }
    }
    p.hardcore = (index % 11) === 7;
    p.recompute();
    p.hp = Math.max(1, Math.round(p.stats.maxHP * r.float(0.5, 1)));
    if (p.cls.resource?.start !== 0) p.mp = Math.round(p.stats.maxMP * r.float(0.3, 1));
  }

  const data = jsonClone(p.toSaveData());
  // uids por guardado (estables aunque se añada otra clase): 1..n por orden de serialización
  let uid = 1;
  (function walk(v) {
    if (!v || typeof v !== 'object') return;
    if (Array.isArray(v)) return v.forEach(walk);
    if (typeof v.uid === 'number' && v.kind) v.uid = uid++;
    Object.values(v).forEach(walk);
  })(data);
  void key;
  return data;
}

function dumpCatalog(M) {
  const { CLASSES, SKILL_MODS, SUPPORTS, PARAGON_BOARDS } = M.data;
  const { CAT_SLOTS, SLOT_UNLOCK } = M.skillDefs;
  const { TALENT_TREES, specInsignia, treeGrants } = M.talents;
  const classes = {};
  for (const [cid, cls] of Object.entries(CLASSES)) {
    const tree = TALENT_TREES[cid];
    const weapon = cls.skills.find(s => s.cat === 'basic' && s.type === 'weapon') || cls.skills.find(s => s.cat === 'basic') || cls.skills[0];
    // de qué nodo (y opción) sale cada activa de talento
    const grantedBy = {};
    const scan = (nodes, treeKey) => {
      for (const n of nodes) {
        if (n.fx?.grant) grantedBy[n.fx.grant] = { tree: treeKey, node: n.id, ...(n.free ? { free: true } : {}) };
        for (const o of n.opts || []) if (o.fx?.grant) grantedBy[o.fx.grant] = { tree: treeKey, node: n.id, opt: o.k };
      }
    };
    scan(tree.cls.nodes, 'cls');
    for (const s of tree.specs) scan(s.nodes, s.id);
    const skills = cls.skills.map(s => ({
      id: s.id, name: s.name, icon: s.icon, cat: s.cat, req: s.req, kind: s.kind, slots: s.slots,
      type: s.type ?? null, elem: s.elem ?? null, tags: s.tags, coef: s.coef ?? null, cost: s.cost ?? null, cd: s.cd ?? null,
      behavior: s.behavior ?? null, branches: !!SKILL_MODS[s.id], ...(grantedBy[s.id] ? { grantedBy: grantedBy[s.id] } : {}),
    }));
    const mods = {};
    for (const s of cls.skills) if (SKILL_MODS[s.id]) mods[s.id] = jsonClone(SKILL_MODS[s.id]);
    const specs = {};
    for (const s of tree.specs) specs[s.id] = { name: s.name, role: s.role, mechanic: s.mechanic, insignia: specInsignia(cid, s.id), grants: treeGrants(s.nodes) };
    classes[cid] = {
      name: cls.name, resourceId: cls.resourceId, mainStat: cls.mainStat, weaponBasic: weapon.id,
      classGrants: treeGrants(tree.cls.nodes), specs, skills, mods,
    };
  }
  return {
    classes,
    supports: SUPPORTS.map(s => ({ id: s.id, name: s.name, tag: s.tag, requires: s.requires || [], forbids: s.forbids || [] })),
    slotRules: { CAT_SLOTS: jsonClone(CAT_SLOTS), SLOT_UNLOCK: jsonClone(SLOT_UNLOCK) },
    paragonBoards: Object.fromEntries(Object.entries(PARAGON_BOARDS).map(([cid, b]) => [cid, b.map(n => ({
      id: n.id, x: n.x, y: n.y, type: n.type, cat: n.cat ?? null, ...(n.name ? { name: n.name } : {}), ...(n.power ? { power: n.power } : {}),
    }))])),
  };
}

async function generate() {
  const M = await loadGame();
  if (M.schema.SAVE_VERSION !== 4) {
    console.error(`❌ SAVE_VERSION = ${M.schema.SAVE_VERSION}: este generador solo corre con el código del juego en v4 (commit ${CODE_COMMIT}). `
      + 'Regenerarlo ahora produciría guardados v5 y pisaría los v4 REALES. Usa --verify o --list.');
    process.exit(2);
  }
  const realRandom = Math.random;
  const catalogBody = dumpCatalog(M);
  const saves = {};
  let index = 0;
  try {
    for (const cid of CLASS_IDS) {
      const specIds = M.talents.TALENT_TREES[cid].specs.map(s => s.id);
      for (const lvl of LEVELS) {
        for (const sid of (lvl < SPEC_FROM ? [null] : specIds)) {
          saves[saveKey(cid, lvl, sid)] = buildSave(M, cid, lvl, sid, index++);
        }
      }
    }
  } finally { Math.random = realRandom; }
  // informativo: casi todas son los UUID de Three.js al crear el modelo 3D del héroe (no tocan el guardado);
  // en cualquier caso el stream tiene semilla, así que ni siquiera una fuga rompería el determinismo
  if (mathRandomCalls) console.warn(`(informativo) Math.random se llamó ${mathRandomCalls} veces (UUID de Three.js al crear el modelo 3D); sustituido por un stream con semilla.`);
  const catalogShell = { classes: catalogBody.classes, paragonBoards: catalogBody.paragonBoards };
  const meta = {
    nota: 'Generado por tools/make-v4-saves.mjs con el código del juego en SAVE_VERSION 4 (antes del Paso 2). No editar a mano. '
      + '`saves` indexa tests/fixtures/saves-v4-paso2.json (misma clave); `savesSha256` detecta ediciones del otro archivo.',
    codeCommit: CODE_COMMIT, saveVersion: 4, classes: CLASS_IDS, levels: LEVELS, specFromLevel: SPEC_FROM,
    saveFields: V4_FIELDS,
  };
  const savesText = fmtSaves(saves);
  meta.savesSha256 = sha(savesText);
  meta.saves = Object.entries(saves).map(([k, s]) => analyze(k, s, catalogShell));
  const catalog = { _meta: meta, classes: catalogBody.classes, supports: catalogBody.supports, slotRules: catalogBody.slotRules, paragonBoards: catalogBody.paragonBoards };
  return { savesText, catText: fmt(catalog) + '\n', saves, catalog };
}

async function main() {
  const mode = process.argv[2] || '--verify';
  if (mode === '--verify') return verify();
  if (mode === '--list') return list();
  if (mode === '--write' || mode === '--check') {
    const { savesText, catText } = await generate();
    if (mode === '--write') {
      writeFileSync(SAVES_PATH, savesText);
      writeFileSync(CATALOG_PATH, catText);
      console.log(`✅ escrito ${SAVES_PATH} (${(savesText.length / 1024).toFixed(0)} KB) y ${CATALOG_PATH} (${(catText.length / 1024).toFixed(0)} KB)`);
      return verify();
    }
    const cur = loadFixtures();
    const same = lf(cur.savesText) === lf(savesText) && lf(cur.catText) === lf(catText);
    console.log(same ? '✅ la regeneración coincide byte a byte con los fixtures commiteados (determinista).' : '❌ la regeneración NO coincide con los fixtures commiteados.');
    process.exit(same ? 0 : 1);
  }
  console.error('Uso: node tools/make-v4-saves.mjs [--verify | --list | --write | --check]');
  process.exit(64);
}
await main();
