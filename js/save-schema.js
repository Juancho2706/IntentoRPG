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
// Migraciones CONGELADAS (D16): MIGRATIONS[0], [2] y [3] no leen el catálogo vivo, sino
// constantes copiadas del catálogo v4 (tests/fixtures/catalog-v4.json, E0.2), así su salida
// no cambia cuando cambian las habilidades o los talentos. MIGRATIONS[4] (v4 → v5, Paso 2g)
// SÍ usa los datos vivos (defaultBuild, SPEC_BAR, FALLBACK_BAR, la definición forjada):
// aplica el Recomendado vigente el día en que el jugador carga (§3.11).
//
// Qué NO vive aquí (se queda en el constructor de Player, documentado allí):
//   valores por defecto de campos ausentes (sirven también al héroe nuevo) y
//   validaciones contra catálogos que pueden cambiar entre despliegues sin
//   cambiar el formato (mascota/collar, talentos, hotbar, skills inexistentes).
// El alijo (`intentorpg_stash`, array de objetos compartido) y las claves de
// hueco (`intentorpg_save_slot{0..2}`) no cambian de formato.
import { CLASSES, SUPPORTS, SPEC_BAR, FALLBACK_BAR, xpForLevel } from './data.js';
import { rescaleItemToCurrent } from './items.js';
import { supportFits, supportSockets } from './skill-defs.js';
import * as SR from './skill-resolve.js';
import { normalizeTalents, aggregateTalents, buildRanks, findSpec, defaultBuildKey, talentTreesFor,
  LEVEL_MAX, TALENT_RULES, TALENTS_TRIMMED_NOTICE } from './talents.js';
import { canAddMaterial } from './materials.js';   // hoja: sin ciclo con entities.js
import { MAGA_LEGACY } from './save-legacy-maga.js';
import { GUERRERO_LEGACY } from './save-legacy-guerrero.js';
import { ARQUERA_LEGACY } from './save-legacy-arquera.js';

export const SAVE_VERSION = 5;

// Orden = orden de claves en el JSON (estable para comparar en tests).
export const PLAYER_SAVE_FIELDS = [
  'classId', 'level', 'xp', 'attributes',
  // Paso 2b.0 (v3): `skills` YA NO se guarda (habilidades y rangos se derivan del nivel).
  // Paso 2g (v5): fuera skillPoints, skillBranches y skillMods; entra skillForge (D3).
  'statPoints',
  'skillSystemV', 'hotbar', 'skillForge',
  // S0 (T1): ranuras que el jugador colocó a mano (la barra de la especialización no las toca). Campo
  // nuevo sin cambio de formato: un guardado sin él carga con {} (ninguna puesta a mano)
  'hotbarManual',
  'gold', 'potions', 'inventory', 'materials', 'equipment',
  'lastFloor', 'hp', 'mp',
  'waypoints', 'records', 'cube',
  // Paso 2c.0 (v4): `talents`; Paso 2g (v5): talentos v2 ({ v:2, spec, cls, sp, choice, hero, loadouts })
  'quest', 'hardcore', 'pet', 'talents', 'era', 'titles', 'title',
  'discoveredZones', 'homeZone', 'strongholdsCleared', 'dailyDone', 'tips',
  'supports', 'knownSupports',
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

// habilidades eliminadas en el Paso 2b (pasivas compradas): sus ramas se descartan
export const REMOVED_SKILLS_V3 = ['g_p_fuerza', 'g_p_coraza', 'g_p_sed', 'm_p_arcano', 'a_p_punteria'];
export const SKILL_SYSTEM_V3 = 5;

// ------------------------------------------------------------ catálogo v4 CONGELADO (D16)
// Copia de tests/fixtures/catalog-v4.json con solo lo que leen MIGRATIONS[0], [2] y [3]:
// básico de arma, habilidades (`id cat req kind(T = talento) ranuras tags banderas`, banderas
// d = coef > 0, c = coste > 0, k = enfriamiento > 0), ramas (sufijos; opciones <rama>1…3),
// soportes ([requiere, prohíbe]), especializaciones e insignias. Se exportan CONGELADAS
// (solo lectura): test61 las reconstruye desde catalog-v4.json y las compara una a una.
const deepFreeze = o => { for (const v of Object.values(o)) if (v && typeof v === 'object') deepFreeze(v); return Object.freeze(o); };
export const V4_WEAPON_BASIC = deepFreeze({ guerrero: 'g_tajo', maga: 'm_dardo', arquera: 'a_disparo' });
export const V4_INSIGNIA = deepFreeze({
  guerrero: { berserker: 'g_t_remolino', guardian: 'g_t_desafio', cruzado: 'g_t_devocion' },
  maga: { piromante: 'p_llamarada', crionte: 'k_prision', arcanista: 'a_orbe' },
  arquera: { francotiradora: 'a_t_apuntado', montaraz: 'a_t_cepo', tiradora: 'a_t_andanada' },
});
export const V4_SPECS = deepFreeze({ guerrero: ['berserker', 'guardian', 'cruzado'], maga: ['piromante', 'crionte', 'arcanista'], arquera: ['francotiradora', 'montaraz', 'tiradora'] });
export const V4_SKILLS = deepFreeze({
  guerrero: ['g_tajo basic 1 - lmb basic/melee/area/physical d', 'g_mandoble basic 3 - lmb basic/melee/physical d', 'g_embate basic 8 - lmb basic/melee/area/physical d',
    'torbellino spender 2 - rmb/k2 spender/melee/area/physical dc', 'g_hendidura spender 8 - rmb/k2 spender/melee/cone/physical dc',
    'g_martillo spender 8 - rmb/k2 spender/melee/area/physical dc', 'terremoto spender 14 - rmb/k2 spender/line/cc/physical dck',
    'g_lanza spender 14 - rmb/k2 spender/proj/physical dc', 'embestida movement 4 - k1 movement/melee/area/physical dk',
    'g_salto movement 12 - k1 movement/area/cc/physical dk', 'g_piel defense 6 - k2 defense/buff/physical k',
    'g_provocacion utility 16 - k2 utility/taunt/cc/physical k', 'grito_guerra utility 12 - k2 utility/shout/buff/ally/physical k',
    'g_u_furia ultimate 15 - k4 ultimate/buff/physical k', 'g_u_cataclismo ultimate 15 - k4 ultimate/area/holy dk',
    'g_u_estandarte ultimate 15 - k4 ultimate/aura/buff/ally/physical k', 'g_t_aliento defense 10 T k2 defense/heal/physical k',
    'g_t_intervencion movement 10 T k1 movement/ally/shield/physical k', 'g_t_bramido defense 10 T k2 defense/shout/buff/ally/physical k',
    'g_t_remolino spec 10 T k3 spec/melee/area/dot/physical dck', 'g_t_temeridad spec 10 T k3 spec/buff/physical k',
    'g_t_ira_ciega spec 10 T k2/k3 spec/buff/utility/physical k', 'g_t_desafio spec 10 T k3 spec/shout/taunt/cc/area/physical k',
    'g_t_muro spec 10 T k2/k3 spec/defense/physical k', 'g_t_carga movement 10 T k1 movement/melee/cc/physical dk',
    'g_t_devocion spec 10 T k3 spec/aura/heal/ally/holy k', 'g_t_veredicto spec 10 T rmb/k2/k3 spec/spender/cone/heal/holy d',
    'g_t_justicia utility 10 T k2 utility/proj/cc/holy dk'],
  maga: ['m_dardo basic 1 - lmb basic/proj/arcane d', 'm_ascua basic 3 - lmb basic/proj/area/fire d', 'm_toque basic 8 - lmb basic/cone/cc/frost d',
    'bola_fuego spender 2 - rmb/k2 spender/proj/area/fire dck', 'rayo spender 8 - rmb/k2 spender/proj/arcane dck',
    'nova_hielo spender 14 - rmb/k2 spender/area/cc/frost dck', 'meteoro spender 14 - rmb/k2 spender/area/fire dck',
    'm_paso_escarcha movement 4 - k1 movement/frost k', 'm_estela_ignea movement 12 - k1 movement/zone/fire dk',
    'm_armadura defense 6 - k2 defense/shield/frost k', 'm_onda utility 12 - k2 utility/area/cc/arcane dck',
    'm_u_supernova ultimate 15 - k4 ultimate/area/fire dk', 'm_u_tormenta ultimate 15 - k4 ultimate/zone/cc/frost dk',
    'm_u_desgarro ultimate 15 - k4 ultimate/channel/arcane dk', 'm_t_barrera defense 10 T k2 defense/shield/arcane k',
    'm_t_parpadeo movement 10 T k1 movement/arcane k', 'm_t_contrahechizo utility 10 T k2 utility/interrupt/arcane k',
    'm_t_inversion defense 10 T k2 defense/arcane k', 'm_t_bloque defense 10 T k2 defense/frost k', 'p_llamarada spec 10 T k3 spec/cone/fire dck',
    'p_combustion spec 10 T k3 spec/buff/fire k', 'p_muro_fuego utility 10 T k2/k3 utility/spec/zone/fire dck',
    'k_prision spec 10 T k3 spec/area/cc/frost dck', 'k_lanza spec 10 T rmb/k2/k3 spec/spender/proj/frost dck',
    'k_ventisca spec 10 T k3 spec/zone/cc/frost dck', 'k_aliento utility 10 T k2/k3 utility/spec/cone/cc/frost dck',
    'a_orbe spec 10 T k3 spec/proj/arcane dck', 'a_misiles spec 10 T rmb/k2/k3 spec/spender/channel/arcane dc',
    'a_sello spec 10 T k3 spec/mark/arcane k', 'a_evocacion utility 10 T k2/k3 utility/spec/channel/arcane k'],
  arquera: ['a_disparo basic 1 - lmb basic/proj/physical d', 'a_disperso basic 3 - lmb basic/proj/area/physical d', 'a_cicuta basic 8 - lmb basic/proj/nature/dot d',
    'flecha_perforante spender 2 - rmb/k2 spender/proj/physical dc', 'flecha_multiple spender 8 - rmb/k2 spender/proj/area/physical dc',
    'lluvia_flechas spender 14 - rmb/k2 spender/area/physical dck', 'a_paso movement 4 - k1 movement/physical k',
    'agilidad movement 12 - k1 movement/buff/physical k', 'a_red utility 6 - k2 utility/cc/physical ck', 'a_humo defense 12 - k2 defense/zone/physical k',
    'a_u_diluvio ultimate 15 - k4 ultimate/area/physical dk', 'a_u_celeste ultimate 15 - k4 ultimate/proj/physical dk',
    'a_u_zarzas ultimate 15 - k4 ultimate/zone/cc/nature dk', 'a_t_voltereta movement 10 T k1 movement/physical k',
    'a_t_conmocion utility 10 T k2 utility/proj/cc/physical dck', 'a_t_silencio utility 10 T k2 utility/interrupt/proj/physical dk',
    'a_t_bengala utility 10 T k2 utility/zone/ally/physical k', 'a_t_camuflaje defense 10 T k2 defense/physical k',
    'a_t_apuntado spec 10 T rmb/k2/k3 spec/spender/proj/physical dck', 'a_t_vision spec 10 T k3 spec/buff/physical k',
    'a_t_disuasorio movement 10 T k1 movement/proj/cc/physical dk', 'a_t_cepo spec 10 T k3 spec/trap/cc/nature dck',
    'a_t_arpon spec 10 T k2/k3 spec/proj/cc/utility/physical dck', 'a_t_senuelo utility 10 T k2/k3 utility/spec/summon/taunt/nature dk',
    'a_t_andanada spec 10 T k3 spec/proj/area/movement/physical dck', 'a_t_danza spec 10 T k3 spec/area/channel/movement/physical dck',
    'a_t_salto movement 10 T k1 movement/proj/physical dk'],
});
export const V4_BRANCHES = deepFreeze({ g_tajo: 'ofv', g_mandoble: 'ofv', g_embate: 'ofv', torbellino: 'ofv', g_hendidura: 'ofv', g_martillo: 'ofv', terremoto: 'ofv',
  g_lanza: 'ofv', embestida: 'ofv', g_salto: 'ofv', g_piel: 'orv', g_provocacion: 'odf', grito_guerra: 'odf', g_u_furia: 'odf', g_u_cataclismo: 'ofv',
  g_u_estandarte: 'odf', m_dardo: 'ofv', m_ascua: 'ofv', m_toque: 'ofv', bola_fuego: 'ofv', rayo: 'ofv', nova_hielo: 'ofv', meteoro: 'ofv',
  m_paso_escarcha: 'orv', m_estela_ignea: 'orv', m_armadura: 'orv', m_onda: 'orv', m_u_supernova: 'ofv', m_u_tormenta: 'ofv', m_u_desgarro: 'ofv',
  a_disparo: 'ofv', a_disperso: 'ofv', a_cicuta: 'ofv', flecha_perforante: 'ofv', flecha_multiple: 'ofv', lluvia_flechas: 'ofv', a_paso: 'orv',
  agilidad: 'odf', a_red: 'orv', a_humo: 'orv', a_u_diluvio: 'ofv', a_u_celeste: 'ofv', a_u_zarzas: 'ofv' });
export const V4_SUPPORTS = deepFreeze({ amplify: [['@dmg'], ['ultimate']], multi: [['proj'], ['channel']], pierce: [['proj'], ['channel']], wide: [['area|cone|zone'], []],
  freeze: [['@dmg'], ['ultimate']], chain: [['proj'], ['channel']], concentrated: [['area|cone|zone'], []], echo: [['@dmg'], ['channel', 'ultimate', 'movement']],
  bleed: [['@dmg', 'melee|proj|area'], []], poison: [['@dmg', 'melee|proj|area'], []], coldblood: [['@dmg'], ['ultimate']], overcharge: [['@dmg'], ['ultimate', 'basic']],
  efficient: [['@cost'], []], swift: [['@cd'], ['ultimate']], focused: [['@dmg'], ['ultimate']], lasting: [['buff|dot|aura|zone|shield'], []] });
// filas → definiciones (perezoso: solo cuando migra un save viejo)
const V4_CACHE = {};
function v4Skills(classId) {
  if (V4_CACHE[classId]) return V4_CACHE[classId];
  const rows = V4_SKILLS[classId];
  if (!rows) return null;
  return (V4_CACHE[classId] = rows.map(r => {
    const [id, cat, req, kind, slots, tags, flags = ''] = r.split(' ');
    return { id, cat, req: +req, kind: kind === 'T' ? 'talent' : cat, slots: slots.split('/'), tags: tags.split('/'),
      coef: flags.includes('d') ? 1 : 0, cost: flags.includes('c') ? 1 : 0, cd: flags.includes('k') ? 1 : 0 };
  }));
}
// ramas de una habilidad v4: [{ id, opts:[{ id }] }] (3 opciones <rama>1…3)
function v4Branches(skId) {
  const suf = V4_BRANCHES[skId];
  return suf ? [...suf].map(s => ({ id: `${skId}_${s}`, opts: [1, 2, 3].map(i => ({ id: `${skId}_${s}${i}` })) })) : null;
}
// soportes por tags tal como funcionaban en v4 (copia congelada de skill-defs.supportFits)
function v4SupportFits(supId, sk) {
  const s = V4_SUPPORTS[supId];
  if (!s || !sk) return false;
  const tags = new Set([...sk.tags, sk.cat]);
  if (s[1].some(f => tags.has(f))) return false;
  const has = tok => tok.split('|').some(t => (t === '@dmg' ? sk.coef > 0 : t === '@cost' ? sk.cost > 0 : t === '@cd' ? sk.cd > 0 : tags.has(t)));
  return s[0].every(has);
}
const v4Sockets = sk => (sk?.cat === 'basic' || sk?.cat === 'ultimate' ? 1 : 2);

// ------------------------------------------------------------ v4 → v5 (Paso 2g, §3.11)
// tablas por clase (save-legacy-<clase>.js; las escribe KA desde catalog-v4.json)
export const LEGACY_TABLES = { maga: MAGA_LEGACY, guerrero: GUERRERO_LEGACY, arquera: ARQUERA_LEGACY };
// contexto de la migración (los tests inyectan tablas y barras de prueba). forgedDef(hero, sk)
// = definición forjada (la de skill-resolve cuando exista; sin ella, la base)
export function migrationCtx(over = {}) {
  return { legacy: LEGACY_TABLES, specBar: SPEC_BAR, fallbackBar: FALLBACK_BAR, canAddMaterial,
    forgedDef: typeof SR.forgedDef === 'function' ? SR.forgedDef : null, ...over };
}
const BAR_SLOTS = ['lmb', 'rmb', 'k1', 'k2', 'k3', 'k4'];
const FORGE_VALUES = ['i', 'ii', null];
// destino de una habilidad vieja en una ranura: { to: id | null | { <ranura | spec | '*'>: id | null } }
//   id        → ese destino (luego se valida: fitsSlot, sin duplicados, conocido)
//   null      → la ranura se vacía (también con un null EXPLÍCITO por ranura o especialización)
//   undefined → inválido: un objeto sin clave aplicable (ni la ranura, ni la especialización,
//               ni '*') o un `to` de otro tipo; cae a SPEC_BAR y luego a FALLBACK_BAR
// Sin `to` (solo `forge`), la habilidad conserva su id.
export function legacyTarget(entry, slot, spec, oldId) {
  if (!entry || !('to' in entry)) return oldId;
  const to = entry.to;
  if (to === null || typeof to === 'string') return to;
  if (!to || typeof to !== 'object' || Array.isArray(to)) return undefined;
  for (const k of [slot, spec, '*']) if (k && Object.hasOwn(to, k)) return to[k] === null || typeof to[k] === 'string' ? to[k] : undefined;
  return undefined;
}

// `over`: partes del contexto que se sustituyen (lo que falte sale de migrationCtx())
export function migrateV4toV5(d, over = {}) {
  const ctx = migrationCtx(over);
  const classId = d.classId;
  const legacy = ctx.legacy?.[classId] || {};
  const cls = CLASSES[classId];
  const skillOf = id => (id && cls?.skills?.find(s => s.id === id)) || null;
  const specAt = TALENT_RULES.specAt;
  // 1) nivel y experiencia (tope Nv100)
  d.level = Math.min(LEVEL_MAX, Math.max(1, d.level | 0 || 1));
  d.xp = Math.max(0, Math.min(Number(d.xp) || 0, xpForLevel(LEVEL_MAX)));
  const L = d.level;
  const oldBar = d.hotbar && typeof d.hotbar === 'object' ? { ...d.hotbar } : {};
  // un save v4 siempre trae estos campos (MIGRATIONS[2]); sin ellos es una segunda pasada:
  // la barra ya tiene ids nuevos y legacy.bar (ids v4) no se le vuelve a aplicar
  const fromV4 = ['skillMods', 'skillBranches', 'skillPoints'].some(k => Object.hasOwn(d, k));
  // 3) talentos: v2 vacío con la misma especialización y el Recomendado vigente al nivel del
  //    save (incluye el árbol héroe si el Paragon se abre). Va antes que la barra: decide qué
  //    activas de talento se conocen. Un save que ya trae v2 solo se normaliza.
  const oldT = d.talents && typeof d.talents === 'object' ? d.talents : null;
  let talents;
  if (oldT?.v === 2) talents = normalizeTalents(oldT, classId);
  else {
    const spec = L >= specAt && findSpec(classId, oldT?.spec) ? oldT.spec : null;
    const t = { v: 2, spec, cls: {}, sp: {}, choice: {}, hero: {}, loadouts: {} };
    const key = spec ? defaultBuildKey(classId, spec) : null;
    if (key) {
      const r = buildRanks({ classId, level: L, talents: t }, talentTreesFor(classId).builds[key], { level: L });
      t.cls = r.cls; t.sp = r.sp; t.choice = r.choice;
      if (r.hero) t.hero = { [spec]: r.hero };
    }
    talents = normalizeTalents(t, classId);
  }
  d.talents = talents;
  const spec = talents.spec;
  // 2) forja: la opción de la 3.ª rama de v4 → variante (legacy.forge) y las absorciones de la
  //    barra (legacy.bar[*].forge). Si dos fuentes eligen variante para la misma habilidad,
  //    gana la de la ranura con más prioridad y, fuera de la barra, la propia antes que una
  //    absorbida; en la misma ranura, la rama elegida (skillMods) antes que la absorción por
  //    defecto de legacy.bar. Sin skillMods (segunda pasada) la forja no se toca.
  const forge = d.skillForge && typeof d.skillForge === 'object' ? { ...d.skillForge } : {};
  if (d.skillMods && typeof d.skillMods === 'object') {
    const sources = [];
    const slotIdx = id => BAR_SLOTS.findIndex(s => oldBar[s] === id);
    for (const [skId, chosen] of Object.entries(d.skillMods)) {
      const entry = legacy.forge?.[skId];
      if (!entry || !chosen || typeof chosen !== 'object') continue;
      const absorbed = typeof entry.to === 'string' && entry.map && typeof entry.map === 'object';
      const map = absorbed ? entry.map : entry;
      for (const opt of Object.values(chosen)) {
        if (typeof opt !== 'string' || !Object.hasOwn(map, opt) || !FORGE_VALUES.includes(map[opt])) continue;
        const i = slotIdx(skId);
        sources.push({ target: absorbed ? entry.to : skId, variant: map[opt], rank: i >= 0 ? i : BAR_SLOTS.length + (absorbed ? 1 : 0), mods: 1 });
      }
    }
    BAR_SLOTS.forEach((slot, i) => {
      const id = oldBar[slot], e = id && legacy.bar?.[id];
      if (!e || !Object.hasOwn(e, 'forge') || !FORGE_VALUES.includes(e.forge)) return;
      const target = legacyTarget(e, slot, spec, id);
      if (target) sources.push({ target, variant: e.forge, rank: i, mods: 0 });
    });
    sources.sort((a, b) => a.rank - b.rank || b.mods - a.mods);
    const fixed = new Set();
    for (const s of sources) { if (fixed.has(s.target)) continue; fixed.add(s.target); forge[s.target] = s.variant; }
  }
  d.skillForge = forge;
  delete d.skillMods; delete d.skillBranches; delete d.skillPoints;
  // 4) tablero de glifos: sin nodos (los puntos se derivan del nivel); los glifos engarzados
  //    vuelven a la bolsa y, si no caben, quedan SIN ENGARZAR en paragon.loose (lista): sus
  //    zócalos v4 no existen en el tablero nuevo, así que en `glyphs` nadie los vería.
  //    economy.js los lista (looseGlyphs) y los recupera (reclaimGlyph, reclaimLooseGlyphs)
  const para = d.paragon && typeof d.paragon === 'object' ? d.paragon : {};
  const mats = Array.isArray(d.materials) ? d.materials : (d.materials = []);
  const loose = [];
  const socketed = para.glyphs && typeof para.glyphs === 'object' ? Object.values(para.glyphs) : [];
  for (const gl of [...socketed, ...(Array.isArray(para.loose) ? para.loose : [])]) {
    if (!gl || typeof gl !== 'object') continue;
    if (ctx.canAddMaterial(mats, gl)) mats.push(gl); else loose.push(gl);
  }
  d.paragon = loose.length ? { nodes: {}, glyphs: {}, loose } : { nodes: {}, glyphs: {} };
  // 5) barra: cada ranura por legacy.bar; el destino debe caber en la ranura (fitsSlot), no
  //    repetirse (gana la primera ranura) y conocerse con los talentos nuevos (las activas de
  //    talento salen salvo que el Recomendado las conceda; el kit, solo de su especialización).
  //    Si no vale: SPEC_BAR de la especialización y después FALLBACK_BAR. Una ranura vacía (o
  //    vaciada con to: null) sigue vacía —así una segunda pasada da lo mismo—, salvo lmb, que
  //    nunca queda vacía.
  const hero = { classId, level: L, talents, skillForge: forge, cls, forged: {} };
  hero.talentAgg = aggregateTalents(hero);
  const known = sk => SR.isKnown(hero, sk) && (!sk.spec || (sk.spec === spec && L >= specAt));
  const hb = {};
  const usable = (id, slot) => { const sk = skillOf(id); return !!sk && SR.fitsSlot(sk, slot) && known(sk) && !Object.values(hb).includes(id); };
  for (const slot of BAR_SLOTS) {
    const old = oldBar[slot];
    const mapped = !old ? null : fromV4 ? legacyTarget(legacy.bar?.[old], slot, spec, old) : old;
    if (slot !== 'lmb' && (!old || mapped === null)) { hb[slot] = null; continue; }
    const cands = [mapped, spec ? ctx.specBar?.[spec]?.bar?.[slot] : null, ctx.fallbackBar?.[classId]?.[slot]];
    hb[slot] = cands.find(id => id && usable(id, slot)) || null;
  }
  if (!hb.lmb) hb.lmb = (cls?.skills || []).find(s => s.cat === 'basic' && usable(s.id, 'lmb'))?.id || null;
  d.hotbar = hb;
  // 6) soportes: se reencajan sobre la definición FORJADA; lo que no encaja o es de una
  //    habilidad retirada vuelve a knownSupports
  const knownSup = Array.isArray(d.knownSupports) ? [...d.knownSupports] : [];
  const removed = new Set(legacy.removed || []);
  const out = {};
  for (const [skId, list] of Object.entries(d.supports && typeof d.supports === 'object' ? d.supports : {})) {
    const ids = Array.isArray(list) ? list : [];
    for (const id of ids) if (!knownSup.includes(id)) knownSup.push(id);
    const sk = !removed.has(skId) ? skillOf(skId) : null;
    if (!sk) continue;
    const def = (typeof ctx.forgedDef === 'function' && ctx.forgedDef(hero, sk)) || sk;
    const ok = [];
    for (const id of ids) {
      const sup = SUPPORTS.find(s => s.id === id);
      if (sup && supportFits(sup, def) && !ok.includes(id) && ok.length < supportSockets(def)) ok.push(id);
    }
    if (ok.length) out[skId] = ok;
  }
  d.supports = out;
  d.knownSupports = knownSup;
  // 7) avisos de carga (ids; los textos están en LOAD_NOTICES)
  const n = Array.isArray(d.notices) ? d.notices : [];
  if (L >= 2 && !n.includes('paso2')) n.push('paso2');
  if (spec && !n.includes(`paso2-${classId}`)) n.push(`paso2-${classId}`);   // se le aplicó el Recomendado
  if (d.paragon.loose && !n.includes('glifos-sueltos')) n.push('glifos-sueltos');
  d.notices = n;
  return d;
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
    if (!(d.skillSystemV >= 4)) {
      const skills = (d.skills && typeof d.skills === 'object') ? d.skills : {};
      const branches = (d.skillBranches && typeof d.skillBranches === 'object') ? d.skillBranches : {};
      const wb = V4_WEAPON_BASIC[d.classId];
      const freeBasic = (wb && skills[wb] > 0) ? 1 : 0;
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
  // skillSystemV = 5 (y además, una segunda pasada da lo mismo). Congelada (D16):
  // lee el catálogo v4 copiado arriba, no el vivo.
  2(d) {
    const list = v4Skills(d.classId);
    delete d.skills;                                  // 1) ya no se persiste
    if (!list) { d.skillSystemV = SKILL_SYSTEM_V3; return d; }
    const byId = Object.fromEntries(list.map(s => [s.id, s]));
    const lvl = Math.max(1, d.level | 0 || 1);
    // 2) ramas: se conservan las de habilidades que siguen existiendo con los mismos
    //    ids de rama; las de habilidades eliminadas se descartan (su punto vuelve)
    const branches = {}, mods = {};
    let kept = 0;
    for (const [skId, brs] of Object.entries(d.skillBranches || {})) {
      const defs = v4Branches(skId);
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
    const weapon = byId[V4_WEAPON_BASIC[d.classId]] || null;
    const known = sk => !!sk && sk.kind !== 'talent' && (sk.req || 1) <= lvl;
    const old = d.hotbar && typeof d.hotbar === 'object' ? d.hotbar : {};
    const oldSkills = ['lmb', 'rmb', 'k1', 'k2', 'k3', 'k4']
      .map(s => (old[s] === 'basic' ? weapon?.id : old[s]))
      .filter((id, i, arr) => id && arr.indexOf(id) === i)
      .map(id => byId[id]).filter(known);
    const firstOf = pred => list.filter(s => known(s) && pred(s)).sort((a, b) => (a.req || 1) - (b.req || 1))[0]?.id || null;
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
    for (const [slot, id] of Object.entries(hb)) if (id && !byId[id].slots.includes(slot)) hb[slot] = null;
    d.hotbar = hb;
    // 4) soportes: se desengarzan los incompatibles por tags o de habilidades
    //    eliminadas (siguen en knownSupports) y se respetan los huecos por categoría
    if (d.supports && typeof d.supports === 'object') {
      const out = {};
      for (const [skId, sl] of Object.entries(d.supports)) {
        const sk = byId[skId];
        if (!sk || !Array.isArray(sl)) continue;
        const ok = [];
        for (const id of sl) if (v4SupportFits(id, sk) && !ok.includes(id) && ok.length < v4Sockets(sk)) ok.push(id);
        if (ok.length) out[skId] = ok;
      }
      d.supports = out;
    }
    d.skillSystemV = SKILL_SYSTEM_V3;                // 5)
    return d;
  },
  // v3 → v4 (Paso 2c.0): maestría → talentos (formato v1). Congelada (D16):
  //  1) sin talentos: { v:1, spec: la maestría (si era una especialización v4), cls:{}, sp:{},
  //     choice:{} }; con talentos, se escriben tal cual (MIGRATIONS[4] los rehace)
  //  2) `mastery` se elimina
  //  3) Nv ≥ 10 con maestría → hotbar.k3 = la insignia v4 de esa especialización
  //  4) aviso al cargar (notices: 'talentos')
  3(d) {
    const legacy = d.mastery && typeof d.mastery === 'object' && typeof d.mastery.id === 'string' ? d.mastery.id : null;
    const had = !!(d.talents && typeof d.talents === 'object');
    const specs = V4_SPECS[d.classId] || [];
    if (!had) d.talents = { v: 1, spec: specs.includes(legacy) ? legacy : null, cls: {}, sp: Object.fromEntries(specs.map(s => [s, {}])), choice: {} };
    delete d.mastery;
    if (!had && legacy && d.talents.spec) {
      const lvl = Math.max(1, d.level | 0 || 1);
      const ins = V4_INSIGNIA[d.classId]?.[d.talents.spec] || null;
      if (lvl >= 10 && ins) {
        const hb = d.hotbar && typeof d.hotbar === 'object' ? d.hotbar : (d.hotbar = {});
        for (const k of Object.keys(hb)) if (hb[k] === ins) hb[k] = null;
        hb.k3 = ins;
      }
      const n = Array.isArray(d.notices) ? d.notices : [];
      if (!n.includes('talentos')) n.push('talentos');
      d.notices = n;
    }
    return d;
  },
  // v4 → v5 (Paso 2g): forja, talentos v2, tablero de glifos y barra (§3.11)
  4(d) { return migrateV4toV5(d); },
};

// texto de cada aviso de carga (Player.notices; lo muestra Game al entrar)
const CLASS_NOTICE = de => `🌿 Los talentos ${de} se rehicieron hasta el nivel 100. Te aplicamos el Recomendado; revísalo con N`;
// S0 (T1): al cargar un guardado de antes de hotbarManual, la barra de la especialización entró sola
export const SPEC_BAR_NOTICE = 'barra-especializacion';
export const LOAD_NOTICES = {
  talentos: '🌿 Tu héroe se actualizó al sistema de talentos: tu maestría es ahora tu especialización. La reespecialización es gratis: revisa tu árbol (N).',
  paso2: '📖 Las ramas ahora son variantes: elige gratis en el libro (T)',
  'paso2-maga': MAGA_LEGACY.notice || CLASS_NOTICE('de la Maga'),
  'paso2-guerrero': GUERRERO_LEGACY.notice || CLASS_NOTICE('del Guerrero'),
  'paso2-arquera': ARQUERA_LEGACY.notice || CLASS_NOTICE('de la Arquera'),
  [TALENTS_TRIMMED_NOTICE]: '🌿 Algunos talentos ya no cabían (por tu nivel o porque los árboles se reordenaron): quitamos solo esos y te devolvimos los puntos. Revisa tus árboles (N)',
  // la migración dejó glifos fuera de la bolsa llena (paragon.loose; economy.looseGlyphs)
  'glifos-sueltos': '🔷 Tu bolsa de materiales estaba llena: algunos glifos te esperan en el tablero de glifos (P). Haz hueco y recógelos',
  [SPEC_BAR_NOTICE]: '⚡ Tu barra lleva ahora las habilidades de tu especialización donde estaban las del kit base. Cámbialas en el libro (T)',
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
