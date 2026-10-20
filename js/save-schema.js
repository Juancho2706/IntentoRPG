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
import { CLASSES, SKILL_MODS, SUPPORTS } from './data.js';
import { rescaleItemToCurrent } from './items.js';
import { supportFits, supportSockets, skillSlots } from './skill-defs.js';

export const SAVE_VERSION = 3;

// Orden = orden de claves en el JSON (estable para comparar en tests).
export const PLAYER_SAVE_FIELDS = [
  'classId', 'level', 'xp', 'attributes',
  // Paso 2b.0 (v3): `skills` YA NO se guarda (habilidades y rangos se derivan del
  // nivel y los talentos). skillSystemV/skillBranches/hotbar sí (Paso 0).
  'statPoints', 'skillPoints',
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
  return cls.skills.find(s => s.cat === 'basic' && s.type === 'weapon')
    || cls.skills.find(s => s.cat === 'basic') || cls.skills[0] || null;
}

// habilidades eliminadas en el Paso 2b (pasivas compradas): sus ramas se descartan
export const REMOVED_SKILLS_V3 = ['g_p_fuerza', 'g_p_coraza', 'g_p_sed', 'm_p_arcano', 'a_p_punteria'];
export const SKILL_SYSTEM_V3 = 5;

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
    if (!(d.skillSystemV >= 4)) {
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
  // v1 → v2 (Paso 1A, fórmulas de combate): los objetos pasan de la escala lineal
  // vieja (arma 3+2·(ilvl−1), afijos 1+0,22·(ilvl−1)) a la curva única G(ilvl) de
  // combat-math, y el ilvl se acota a ILVL_MAX. Sin esto, un arma vieja de ilvl 30
  // pegaría ~3× más que una nueva. Idempotente por objeto (marca `sv`). El alijo
  // (clave aparte) se reescala al cargarlo (Game.loadStash) con la misma función.
  1(d) {
    const each = arr => { if (Array.isArray(arr)) for (const it of arr) rescaleItemToCurrent(it); };
    each(d.inventory);
    each(d.cube);
    if (d.equipment && typeof d.equipment === 'object') for (const it of Object.values(d.equipment)) rescaleItemToCurrent(it);
    return d;
  },
  // v2 → v3 (Paso 2b.0, docs/paso2-diseno.md §8): kit con categoría, rangos por
  // nivel, ramas, hotbar con k2 flexible y soportes por tags. Idempotente con
  // skillSystemV = 5 (y además, una segunda pasada da lo mismo).
  2(d) {
    const cls = CLASSES[d.classId];
    delete d.skills;                                  // 1) ya no se persiste
    if (!cls) { d.skillSystemV = SKILL_SYSTEM_V3; return d; }
    const byId = Object.fromEntries(cls.skills.map(s => [s.id, s]));
    const lvl = Math.max(1, d.level | 0 || 1);
    // 2) ramas: se conservan las de habilidades que siguen existiendo con los mismos
    //    ids de rama; las de habilidades eliminadas se descartan (su punto vuelve)
    const branches = {}, mods = {};
    let kept = 0;
    for (const [skId, brs] of Object.entries(d.skillBranches || {})) {
      const defs = SKILL_MODS[skId];
      if (!byId[skId] || !defs || REMOVED_SKILLS_V3.includes(skId)) continue;
      for (const [brId, on] of Object.entries(brs || {})) {
        if (!on) continue;
        const br = defs.find(b => b.id === brId);
        if (!br) continue;
        (branches[skId] || (branches[skId] = {}))[brId] = true;
        kept++;
        const opt = d.skillMods?.[skId]?.[brId];
        if (opt && br.opts.some(o => o.id === opt)) (mods[skId] || (mods[skId] = {}))[brId] = opt;
      }
    }
    d.skillBranches = branches;
    d.skillMods = mods;
    // puntos = los ganados en Nv2–20 menos las ramas conservadas (devuelve lo gastado en rangos)
    d.skillPoints = Math.max(0, Math.min(lvl, 20) - 1 - kept);
    // 3) hotbar → ranuras con categoría
    const weapon = weaponBasicOf(d.classId);
    const known = sk => !!sk && sk.kind !== 'talent' && (sk.req || 1) <= lvl;
    const old = d.hotbar && typeof d.hotbar === 'object' ? d.hotbar : {};
    const oldSkills = ['lmb', 'rmb', 'k1', 'k2', 'k3', 'k4']
      .map(s => (old[s] === 'basic' ? weapon?.id : old[s]))
      .filter((id, i, arr) => id && arr.indexOf(id) === i)
      .map(id => byId[id]).filter(known);
    const firstOf = pred => cls.skills.filter(s => known(s) && pred(s)).sort((a, b) => (a.req || 1) - (b.req || 1))[0]?.id || null;
    const oldOf = pred => oldSkills.filter(pred).map(s => s.id);
    const lmbOld = old.lmb === 'basic' ? weapon : byId[old.lmb];
    const hb = { lmb: null, rmb: null, k1: null, k2: null, k3: null, k4: null };
    hb.lmb = (lmbOld && lmbOld.cat === 'basic' && known(lmbOld)) ? lmbOld.id : (weapon?.id || null);
    const oldSp = oldOf(s => s.cat === 'spender');
    hb.rmb = oldSp[0] || firstOf(s => s.cat === 'spender');
    hb.k1 = oldOf(s => s.cat === 'movement')[0] || (lvl >= 4 ? firstOf(s => s.cat === 'movement') : null);
    hb.k2 = oldOf(s => s.cat === 'utility' || s.cat === 'defense')[0]
      || oldSp.find(id => id !== hb.rmb)
      || (lvl >= 6 ? firstOf(s => s.cat === 'defense' || s.cat === 'utility') : null);
    hb.k4 = oldOf(s => s.cat === 'ultimate')[0] || null;
    // red de seguridad: cada id en una ranura válida para su categoría
    for (const [slot, id] of Object.entries(hb)) if (id && !skillSlots(byId[id]).includes(slot)) hb[slot] = null;
    d.hotbar = hb;
    // 4) soportes: se desengarzan los incompatibles por tags o de habilidades
    //    eliminadas (siguen en knownSupports) y se respetan los huecos por categoría
    if (d.supports && typeof d.supports === 'object') {
      const out = {};
      for (const [skId, list] of Object.entries(d.supports)) {
        const sk = byId[skId];
        if (!sk || !Array.isArray(list)) continue;
        const ok = [];
        for (const id of list) {
          const sup = SUPPORTS.find(s => s.id === id);
          if (sup && supportFits(sup, sk) && !ok.includes(id) && ok.length < supportSockets(sk)) ok.push(id);
        }
        if (ok.length) out[skId] = ok;
      }
      d.supports = out;
    }
    d.skillSystemV = SKILL_SYSTEM_V3;                // 5)
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
