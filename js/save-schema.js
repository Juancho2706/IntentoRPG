// ============================================================
// Esquema de guardado versionado del héroe (módulo puro, testeable headless)
// ============================================================
// - PLAYER_SAVE_FIELDS: lista DECLARATIVA de lo que se persiste del Player.
//   Para guardar un campo nuevo, añádelo aquí (y su valor por defecto en el
//   constructor de Player). Si cambia el FORMATO de un campo ya guardado,
//   sube SAVE_VERSION y añade MIGRATIONS[versiónVieja] (v → v+1).
// - serializePlayer(p): objeto plano listo para JSON (comparte referencias con
//   el héroe a propósito: syncItemUids renumera uids sobre él).
// - migrateSave(data): aplica la cadena de migraciones hasta SAVE_VERSION.
//   Los saves sin `saveVersion` (todos los anteriores a este módulo) son v0.
//
// Qué NO vive aquí (se queda en el constructor de Player, documentado allí):
//   valores por defecto de campos ausentes (sirven también al héroe nuevo) y
//   validaciones contra catálogos que pueden cambiar entre despliegues sin
//   cambiar el formato (mascota/collar, maestría, hotbar, skills inexistentes).
// El alijo (`intentorpg_stash`, array de objetos compartido) y las claves de
// hueco (`intentorpg_save_slot{0..2}`) no cambian de formato.
import { CLASSES } from './data.js';

export const SAVE_VERSION = 1;

// Orden = orden de claves en el JSON (estable para comparar en tests).
export const PLAYER_SAVE_FIELDS = [
  'classId', 'level', 'xp', 'attributes',
  'statPoints', 'skillPoints', 'skills',
  // IMPORTANTE: skillSystemV/skillBranches/hotbar DEBEN guardarse (Paso 0): sin
  // ellos la migración de habilidades v4 reembolsaría la build en cada carga.
  'skillSystemV', 'skillBranches', 'hotbar',
  'gold', 'potions', 'inventory', 'materials', 'equipment',
  'lastFloor', 'hp', 'mp',
  'waypoints', 'records', 'cube',
  'quest', 'hardcore', 'pet', 'mastery', 'era', 'titles', 'title',
  'discoveredZones', 'homeZone', 'strongholdsCleared', 'dailyDone', 'tips',
  'supports', 'knownSupports', 'skillMods',
  'paragon', 'refugeUnlocked', 'discovered',
  'heroName', 'tint',
  'torment', 'codex', 'blessings',
];

// transformaciones al serializar (por campo)
const SAVE_TRANSFORMS = {
  hp: v => Math.round(v),
  mp: v => Math.round(v),
};

export function serializePlayer(p) {
  const out = { saveVersion: SAVE_VERSION };
  for (const k of PLAYER_SAVE_FIELDS) {
    const t = SAVE_TRANSFORMS[k];
    out[k] = t ? t(p[k]) : p[k];
  }
  return out;
}

const MATERIAL_KINDS = ['gem', 'rune', 'riftkey', 'fragment', 'glyph'];

// arma básica de la clase (el rango 1 es gratis: no se reembolsa)
function weaponBasicOf(classId) {
  const cls = CLASSES[classId];
  if (!cls) return null;
  return cls.skills.find(s => s.kind === 'basic' && s.type === 'weapon')
    || cls.skills.find(s => s.kind === 'basic') || cls.skills[0] || null;
}

// MIGRATIONS[v] transforma un save de versión v en uno de versión v+1.
// Reciben una copia profunda (pueden mutar) y devuelven el resultado.
export const MIGRATIONS = {
  // v0 → v1: las migraciones que estaban repartidas por el constructor de Player.
  0(d) {
    // 1) bolsa de materiales: gemas/runas/llaves/fragmentos/glifos que vivían en
    //    la mochila pasan a `materials`
    if (Array.isArray(d.inventory)) {
      const moved = d.inventory.filter(it => it && MATERIAL_KINDS.includes(it.kind));
      if (moved.length) {
        d.inventory = d.inventory.filter(it => !(it && MATERIAL_KINDS.includes(it.kind)));
        d.materials = [...(Array.isArray(d.materials) ? d.materials : []), ...moved];
      }
    }
    // 2) soportes: antes 1 soporte como string → array (multi-socket, máx 2)
    if (d.supports && typeof d.supports === 'object') {
      for (const k of Object.keys(d.supports)) {
        const v = d.supports[k];
        if (typeof v === 'string') d.supports[k] = v ? [v] : [];
        else if (!Array.isArray(v)) d.supports[k] = [];
      }
    }
    // 3) Paragon: formato plano antiguo → tablero (reembolsa level-20 puntos)
    if (!(d.paragon && d.paragon.nodes))
      d.paragon = { points: Math.max(0, (d.level || 1) - 20), nodes: {}, glyphs: {} };
    // 4) habilidades v4 (árbol D4 + mini-ramas que cuestan punto): reembolsa y
    //    resetea builds previas. Idempotente: un save ya en v4 (skillSystemV===4,
    //    p. ej. los del Paso 0) NO se toca. El rango 1 del básico es gratis.
    if (d.skillSystemV !== 4) {
      const skills = (d.skills && typeof d.skills === 'object') ? d.skills : {};
      const branches = (d.skillBranches && typeof d.skillBranches === 'object') ? d.skillBranches : {};
      const wb = weaponBasicOf(d.classId);
      const freeBasic = (wb && skills[wb.id] > 0) ? 1 : 0;
      const spent = Object.values(skills).reduce((a, b) => a + (b | 0), 0) - freeBasic
        + Object.values(branches).reduce((a, o) => a + Object.keys(o || {}).length, 0);
      d.skillPoints = (d.skillPoints | 0) + spent;
      d.skills = {};
      d.skillMods = {};
      d.skillBranches = {};
      d.skillSystemV = 4;
    }
    return d;
  },
};

// Lleva un save (de cualquier versión conocida) a SAVE_VERSION. No muta la
// entrada. null/no-objeto → null. Un save de una versión FUTURA se devuelve
// tal cual (no se puede "desmigrar"; se avisa por consola).
export function migrateSave(data) {
  if (!data || typeof data !== 'object') return null;
  let d = JSON.parse(JSON.stringify(data));
  let v = Number.isInteger(d.saveVersion) ? d.saveVersion : 0;
  if (v > SAVE_VERSION) {
    try { console.warn(`[save] versión ${v} más nueva que la del juego (${SAVE_VERSION})`); } catch { /* sin consola */ }
    return d;
  }
  while (v < SAVE_VERSION) {
    const m = MIGRATIONS[v];
    if (!m) throw new Error(`[save] falta la migración v${v}→v${v + 1}`);
    d = m(d) || d;
    v++;
    d.saveVersion = v;
  }
  return d;
}
