// ============================================================
// TALENTOS v2 (Paso 2g): clase + especialización + árboles héroe (Paragon), Nv1–100
// ============================================================
// Módulo PURO (sin DOM). Lo usan Player.recompute(), el mixin game-talents.js,
// talents-ops.js (panel), progression.js, la migración de guardado y los tests.
// Contrato: docs/paso2-implementacion.md §3.1–§3.4 y §3.8; reglas comunes = espejo
// exacto de docs/mockups/data/talents-v2-comun.js (TV2.REGLAS; lo compara
// tests/test-v2-paridad.mjs).
//
// DATOS (js/talents-<clase>.js, v: 2):
//   cls:   { name, nodes: [30] }                       árbol de CLASE (c1…c30)
//   specs: [{ id, name, role, mechanic, elem, innate, nodes: [29] }]
//   hero:  [{ id, name, specs:[2 ids], key, line, nodes: [13] }]   (hero-<clase>.js)
//   builds: { <clave>: { sp, n, arch, hero, heroNodes, heroCh, cls, clsCh, spec, specCh } }
//   defaultBuild: { <specId>: <clave> }
// NODO: { id, name, t, tag, r, c, max, req?, free?, fx?, opts?, d? }
//   t   'p' pasiva · 'c' elección (opts A/B) · 'k' clave (gratis, rango 1) ·
//       'f' final (1–3 rangos) · 'x' ápice (1–4 rangos)
//   req basta UNO de esos nodos al máximo (el nodo clave gratis cuenta como comprado)
//   d(r) texto del rango r; en una elección el texto va en opts[].desc
//
// EFECTOS (`fx`, también dentro de cada opción). Un número se multiplica por el rango;
// una lista da el valor por rango [r1, r2…] (scaleFx).
//   stats   { dmgPct, crit, hp, … }             → recompute (como el equipo)
//   elem    { fire|frost|arcane|physical|holy|nature: % } → +% daño de ese elemento (forjado)
//   skillLv { <selector>: +niveles }
//   mod     { <selector>: { …claves de skill-defs.mergeMods } }
//   tv      { clave: valor } las leen los ganchos de combate; números SUMADOS salvo
//           costRedBig = { pct, over } (pct suma, over = el umbral más bajo)
//   power   'id' (registro de poderes; los finales y el ápice leen su rango con powerRank)
//   grant   'skillId' (activa de talento, kind 'talent', ranura 2)
// SELECTORES (§3.8): '<skillId>', '@all', '@<elem>' (elemento FORJADO), '@spec' (kit de la
//   especialización activa), '@cat:<cat>' y '@basic' '@spender' '@movement' '@defense'
//   '@utility' '@insignia' '@ultimate', '@tag:<tag>' y '@melee' '@charge' '@recast' '@combo'
//   '@stance' (tags FORJADOS), '@windup', '@holyZone'.
//
// ESTADO GUARDADO (§3.2): p.talents = { v:2, spec, cls, sp:{specId:{…}}, choice,
//   hero:{ specId:{ tree, nodes:{treeId:{…}}, choice:{treeId:{…}} } }, loadouts:{ specId:[…] } }
//   Los nodos gratis (clave de especialización y de héroe) NO se guardan.
import { CLASSES, specKitOf } from './data.js';
import { mergeMods } from './skill-defs.js';
import { MAGA_TALENTS } from './talents-maga.js';
import { GUERRERO_TALENTS } from './talents-guerrero.js';
import { ARQUERA_TALENTS } from './talents-arquera.js';

// ------------------------------------------------------------ reglas comunes (TV2.REGLAS)
export const LEVEL_MAX = 100;
export const CLASS_GATES = [{ row: 4, need: 8 }, { row: 7, need: 24 }];
export const SPEC_GATES = [{ row: 4, need: 8 }, { row: 7, need: 20 }, { row: 9, need: 25, apex: true }];
export const HERO_GATES = [];
export const TALENT_RULES = Object.freeze({
  nivelMax: LEVEL_MAX,
  pts: Object.freeze({ cls: 34, spec: 31, hero: 10, board: 16 }),
  gates: Object.freeze({ cls: CLASS_GATES, spec: SPEC_GATES }),
  specAt: 10,               // se elige especialización (su nodo clave es gratis)
  specLast: 70,             // último punto de especialización (31/31)
  heroAt: 71,               // primer punto de Paragon (además exige 31/31 gastados)
  clsLate: Object.freeze([85, 90, 95, 100]),
  textoMax: 120,
  heroNodos: 13,
});
const CLS_LATE = TALENT_RULES.clsLate;

/** @deprecated D23: usa TALENT_RULES.specAt. Se borra en E5 (C1). */
export const TALENT_START_LEVEL = TALENT_RULES.specAt;

// puntos ganados de cada sistema al nivel L (copia literal de talents-v2-comun.js)
export function earnedAt(w, L) {
  if (w === 'spec') return L < 10 ? 0 : Math.min(31, Math.floor((Math.min(L, 70) - 10) / 2) + 1);
  if (w === 'cls') return (L < 11 ? 0 : Math.floor((Math.min(L, 69) - 11) / 2) + 1) + CLS_LATE.filter(x => x <= L).length;
  if (w === 'hero') return Math.max(0, Math.min(10, L - 70));
  if (w === 'board') { let n = 0; for (let l = 81; l <= L; l++) if (!CLS_LATE.includes(l)) n++; return n; }
  return 0;
}
// qué sistema da el punto del nivel L (un solo sistema por nivel): avisos de subida
export function pointKindAt(L) {
  for (const w of ['spec', 'cls', 'hero', 'board']) if (earnedAt(w, L) > earnedAt(w, L - 1)) return w;
  return null;
}
// primer nivel con punto de tablero de glifos (81)
export const PARAGON_OPEN_LEVEL = (() => { for (let L = 1; L <= LEVEL_MAX; L++) if (earnedAt('board', L) > 0) return L; return LEVEL_MAX; })();

// ------------------------------------------------------------ datos por clase
export const TALENT_TREES = { maga: MAGA_TALENTS, guerrero: GUERRERO_TALENTS, arquera: ARQUERA_TALENTS };
export function talentTreesFor(classId) { return TALENT_TREES[classId] || null; }
export function findSpec(classId, specId) {
  return (TALENT_TREES[classId]?.specs || []).find(s => s.id === specId) || null;
}
export function findHero(classId, treeId) {
  return (TALENT_TREES[classId]?.hero || []).find(h => h.id === treeId) || null;
}
// los dos árboles héroe de una especialización (en el orden de los datos)
export function heroTreesFor(classId, specId) {
  return (TALENT_TREES[classId]?.hero || []).filter(h => (h.specs || []).includes(specId));
}
// elemento de una especialización (D19: explícito en los datos)
export function specElem(spec, legacySpec) {
  const s = typeof spec === 'string' ? legacySpec : spec; // compat: specElem(classId, spec)
  return s?.elem || null;
}
// especialización ACTIVA del jugador (elegida y con nivel ≥ specAt)
export function activeSpec(p) {
  if (!p || (p.level || 1) < TALENT_RULES.specAt) return null;
  return findSpec(p.classId, p.talents?.spec);
}
// árbol héroe ACTIVO de la especialización del jugador (el elegido o el primero)
export function activeHeroTree(p) {
  const s = findSpec(p?.classId, p?.talents?.spec);
  if (!s) return null;
  const trees = heroTreesFor(p.classId, s.id);
  const want = p.talents?.hero?.[s.id]?.tree;
  return trees.find(h => h.id === want) || trees[0] || null;
}
// todas las activas que concede una lista de nodos (nodos y opciones)
export function treeGrants(nodes) {
  const out = [];
  for (const n of nodes || []) {
    if (n.fx?.grant) out.push(n.fx.grant);
    for (const o of n.opts || []) if (o.fx?.grant) out.push(o.fx.grant);
  }
  return out;
}
export function nodeById(tree, id) { return tree?.nodes?.find(n => n.id === id) || null; }

// árbol del jugador con sus puertas: which 'cls' | 'spec' | 'hero'
export function treeOf(p, which) {
  const t = TALENT_TREES[p?.classId];
  if (!t) return null;
  if (which === 'cls') return { key: 'cls', name: t.cls.name, nodes: t.cls.nodes, gates: CLASS_GATES };
  const s = findSpec(p.classId, p.talents?.spec);
  if (!s) return null;
  if (which === 'spec') return { key: 'spec', name: s.name, nodes: s.nodes, gates: SPEC_GATES, spec: s };
  if (which === 'hero') {
    const h = activeHeroTree(p);
    return h ? { key: 'hero', name: h.name, nodes: h.nodes || [], gates: HERO_GATES, hero: h, spec: s } : null;
  }
  return null;
}
// estado del árbol héroe de la especialización elegida (lo crea si falta)
function heroState(p, create = true) {
  const T = p?.talents;
  const spec = T?.spec;
  if (!T || !spec) return null;
  if (!T.hero || typeof T.hero !== 'object') { if (!create) return null; T.hero = {}; }
  let st = T.hero[spec];
  if (!st) {
    if (!create) return null;
    st = T.hero[spec] = { tree: heroTreesFor(p.classId, spec)[0]?.id || null, nodes: {}, choice: {} };
  }
  st.nodes ||= {}; st.choice ||= {};
  return st;
}
// rangos del jugador en un árbol (crea el objeto si falta, como hasta ahora)
export function ranksOf(p, which) {
  const T = p?.talents;
  if (!T) return {};
  if (which === 'cls') return T.cls || (T.cls = {});
  if (!T.spec) return {};
  if (which === 'spec') { T.sp ||= {}; return T.sp[T.spec] || (T.sp[T.spec] = {}); }
  if (which === 'hero') {
    const h = activeHeroTree(p);
    const st = heroState(p);
    if (!h || !st) return {};
    return st.nodes[h.id] || (st.nodes[h.id] = {});
  }
  return {};
}
// elecciones A/B de un árbol: clase y especialización comparten `choice` (ids únicos por
// clase); las del héroe van por especialización y árbol (D4)
export function choicesOf(p, which) {
  const T = p?.talents;
  if (!T) return {};
  if (which === 'hero') {
    const h = activeHeroTree(p);
    const st = heroState(p);
    if (!h || !st) return {};
    return st.choice[h.id] || (st.choice[h.id] = {});
  }
  return T.choice || (T.choice = {});
}

// ------------------------------------------------------------ puntos, puertas y requisitos
// puntos gastados (los nodos gratis no cuentan); `beforeRow` limita a filas superiores
export function spentIn(tree, ranks, beforeRow = 99) {
  let s = 0;
  for (const n of tree?.nodes || []) if (!n.free && n.r < beforeRow) s += ranks?.[n.id] | 0;
  return s;
}
// el Paragon se abre con la especialización «al máximo»: 31 ganados y 31 gastados
export function heroOpen(p) {
  const L = p?.level || 1;
  const s = activeSpec(p);
  if (!s) return false;
  const need = TALENT_RULES.pts.spec;
  return earnedAt('spec', L) >= need && spentIn({ nodes: s.nodes }, p.talents?.sp?.[s.id] || {}) >= need;
}
// en pausa: hay nodos en el árbol héroe activo y el Paragon no está abierto
export function heroPaused(p) {
  if (!activeSpec(p)) return false;
  const h = activeHeroTree(p);
  if (!h) return false;
  const ranks = p.talents?.hero?.[p.talents.spec]?.nodes?.[h.id] || {};
  return spentIn(h, ranks) > 0 && !heroOpen(p);
}
export function talentPointsEarned(p, which) {
  const L = p?.level || 1;
  if (which === 'hero') return heroOpen(p) ? earnedAt('hero', L) : 0;
  return earnedAt(which, L);
}
export function talentPointsLeft(p, which) {
  const tree = treeOf(p, which);
  if (!tree) return which === 'cls' ? Math.max(0, talentPointsEarned(p, 'cls')) : 0;
  return talentPointsEarned(p, which) - spentIn(tree, ranksOf(p, which));
}
// tablero de glifos (§3.9): 16 puntos derivados del nivel (Nv81–100); gastados = nodos activos
export function paragonPointsEarned(p) { return earnedAt('board', p?.level || 1); }
export function paragonPointsLeft(p) {
  const used = Object.values(p?.paragon?.nodes || {}).filter(Boolean).length;
  return paragonPointsEarned(p) - used;
}
// motivo por el que una puerta bloquea el nodo (o null)
export function gateFail(tree, ranks, node, level) {
  for (const g of tree?.gates || []) {
    if (node.r < g.row) continue;
    const have = spentIn(tree, ranks, g.row);
    if (have < g.need) return `Gasta ${g.need} puntos en las filas de arriba (llevas ${have})`;
    if (g.level && (level || 1) < g.level) return `Requiere nivel ${g.level}`;
  }
  return null;
}
export function reqFail(tree, ranks, node) {
  if (!node.req || !node.req.length) return null;
  // el nodo clave gratis cuenta como comprado: nunca se guarda en `ranks`
  if (node.req.some(id => { const par = nodeById(tree, id); return !!par?.free || (ranks[id] | 0) >= (par?.max || 1); })) return null;
  return `Requiere ${node.req.map(id => nodeById(tree, id)?.name || id).join(' o ')} al máximo`;
}
// rangos legales: cada nodo con rango cumple puertas y requisitos y no pasa de su máximo
export function validRanks(tree, ranks, level) {
  return (tree?.nodes || []).every(n => {
    const r = ranks[n.id] | 0;
    if (!(r > 0) || n.free) return true;
    return r <= n.max && !gateFail(tree, ranks, n, level) && !reqFail(tree, ranks, n);
  });
}
export function canAddRank(p, which, nodeId) {
  const tree = treeOf(p, which); if (!tree) return false;
  const node = nodeById(tree, nodeId); if (!node || node.free) return false;
  const ranks = ranksOf(p, which);
  if ((ranks[nodeId] | 0) >= node.max) return false;
  if (talentPointsLeft(p, which) <= 0) return false;
  return !gateFail(tree, ranks, node, p.level) && !reqFail(tree, ranks, node);
}
export function canRemoveRank(p, which, nodeId) {
  const tree = treeOf(p, which); if (!tree) return false;
  const node = nodeById(tree, nodeId); if (!node || node.free) return false;
  const ranks = ranksOf(p, which);
  const r = ranks[nodeId] | 0;
  if (r <= 0) return false;
  return validRanks(tree, { ...ranks, [nodeId]: r - 1 }, p.level);
}

// ------------------------------------------------------------ efectos
export function scaleFx(v, r) {
  if (Array.isArray(v)) return v[Math.min(r, v.length) - 1];
  if (typeof v === 'number') return v * r;
  return v;
}
// efectos activos del nodo (las elecciones usan la opción escogida o la A)
export function nodeFx(node, choice) {
  if (node.t === 'c') return (node.opts.find(o => o.k === choice) || node.opts[0]).fx || {};
  return node.fx || {};
}
export function nodeDesc(node, r, choice) {
  if (node.t === 'c') { const o = node.opts.find(x => x.k === choice) || node.opts[0]; return `${o.name}: ${o.desc}`; }
  return typeof node.d === 'function' ? node.d(Math.max(1, r)) : (node.d || '');
}
// fusión de modificadores: reglas de skill-defs.mergeMods (máximos, sumas y booleanos)
export function mergeSkillMods(out, add) { return mergeMods(out, add); }

// claves tv que lee el NÚCLEO (combat-math.condAddPct/condCritPct/dotProfile, recompute,
// poder común nucleo_tv, resolveSkill, game-skills). Las de una sola clase van en
// <CLASE>_TV_KEYS (talents-<clase>.js); tests/test78 lo comprueba
export const CORE_TV_KEYS = Object.freeze([
  'critDmg', 'dmgReduc',
  'eliteDmg', 'slowedDmg', 'highHpDmg', 'lowHpDmg', 'highManaDmg', 'preyDmg', 'explodedDmg', 'executeDmg', 'burningCrit',
  'dotPct', 'bleedPct', 'poisonPct', 'burnPct', 'dotDur', 'burnDur',
  'killHeal', 'manaOnKill', 'burnKillHeal', 'burnKillMana', 'bleedKillHeal', 'bleedKillMana', 'executePct',
  'critFireCdr', 'rootedWeak', 'drHighMana', 'drVsSlowed', 'drMoving', 'drFocus', 'shatterPct',
  'costRed', 'costRedBig', 'barrierDr',
]);

// ------------------------------------------------------------ selectores (§3.8)
const ELEM_ALIAS = { phys: 'physical' };
const CAT_ALIAS = { '@basic': 'basic', '@spender': 'spender', '@movement': 'movement', '@defense': 'defense',
  '@utility': 'utility', '@insignia': 'spec', '@ultimate': 'ultimate' };
const TAG_ALIAS = { '@melee': 'melee', '@charge': 'charge', '@recast': 'recast', '@combo': 'combo', '@stance': 'stance' };
const ELEM_KEYS = new Set(['fire', 'frost', 'arcane', 'holy', 'nature', 'physical', 'phys']);
const normElem = e => ELEM_ALIAS[e] || e || null;

// contexto de expansión: catálogo de la clase + accesores de lo FORJADO (los pasa recompute)
function selectorCtx(p, opts) {
  const list = (CLASSES[p.classId]?.skills || []).filter(s => s.kind !== 'passive');
  const byId = new Map(list.map(s => [s.id, s]));
  const defOf = typeof opts.defOf === 'function' ? opts.defOf : null;
  const def = id => (defOf && defOf(id)) || byId.get(id) || null;
  const elemOf = typeof opts.elemOf === 'function' ? opts.elemOf : (id => def(id)?.elem || null);
  const kitOf = typeof opts.kitOf === 'function' ? opts.kitOf : (specId => specKitOf(p.classId, specId));
  const tagsOf = id => { const d = def(id); return new Set([...(d?.tags || []), d?.cat, normElem(d?.elem)].filter(Boolean)); };
  return { list, def, elemOf: id => normElem(elemOf(id)), kitOf, tagsOf };
}
// expande un selector a ids de habilidad de la clase
export function expandSelector(key, ctx, spec) {
  const ids = ctx.list.map(s => s.id);
  if (key === '@all') return ids;
  if (key === '@spec') return spec ? [...(ctx.kitOf(spec.id) || [])] : [];
  if (key === '@windup') return ids.filter(id => (ctx.def(id)?.windup || 0) > 0);
  if (key === '@holyZone') return ids.filter(id => ctx.tagsOf(id).has('zone') && ctx.elemOf(id) === 'holy');
  if (CAT_ALIAS[key]) return ids.filter(id => ctx.def(id)?.cat === CAT_ALIAS[key]);
  if (key.startsWith('@cat:')) return ids.filter(id => ctx.def(id)?.cat === key.slice(5));
  if (TAG_ALIAS[key]) return ids.filter(id => ctx.tagsOf(id).has(TAG_ALIAS[key]));
  if (key.startsWith('@tag:')) return ids.filter(id => ctx.tagsOf(id).has(key.slice(5)));
  if (key[0] === '@' && ELEM_KEYS.has(key.slice(1))) { const el = normElem(key.slice(1)); return ids.filter(id => ctx.elemOf(id) === el); }
  if (key[0] === '@') return [];
  return [key];
}

// suma de una clave tv: números se suman; costRedBig {pct, over} suma pct y se queda con
// el umbral más bajo
function addTv(tv, k, v) {
  if (v && typeof v === 'object') {
    const cur = tv[k] && typeof tv[k] === 'object' ? tv[k] : null;
    tv[k] = cur ? { ...cur, pct: (cur.pct || 0) + (v.pct || 0), over: Math.min(cur.over ?? Infinity, v.over ?? Infinity) } : { ...v };
  } else if (Number.isFinite(v)) tv[k] = (Number.isFinite(tv[k]) ? tv[k] : 0) + v;
}

// ------------------------------------------------------------ agregado (memoizado)
function emptyAgg() {
  return { stats: {}, tv: {}, powers: new Set(), skillLv: {}, mods: {}, grants: new Set(), innate: {}, spec: null,
    mechanic: null, ranks: {}, powerRank: {}, hero: null, heroOpen: false, heroPaused: false };
}
function cloneAgg(a) {
  const mods = {};
  for (const [k, m] of Object.entries(a.mods)) mods[k] = { ...m };
  const tv = {};
  for (const [k, v] of Object.entries(a.tv)) tv[k] = v && typeof v === 'object' ? { ...v } : v;
  return { ...a, stats: { ...a.stats }, tv, powers: new Set(a.powers), skillLv: { ...a.skillLv }, mods,
    grants: new Set(a.grants), innate: { ...a.innate }, ranks: { ...a.ranks }, powerRank: { ...a.powerRank } };
}
function computeAgg(p, opts) {
  const agg = emptyAgg();
  const T = p?.talents;
  const t = TALENT_TREES[p?.classId];
  if (!T || !t) return agg;
  const s = activeSpec(p);
  const ctx = selectorCtx(p, opts);
  const apply = (node, r, choice) => {
    agg.ranks[node.id] = r;
    const fx = nodeFx(node, choice);
    for (const [k, v] of Object.entries(fx.stats || {})) agg.stats[k] = (agg.stats[k] || 0) + scaleFx(v, r);
    for (const [k, v] of Object.entries(fx.tv || {})) addTv(agg.tv, k, scaleFx(v, r));
    for (const [k, v] of Object.entries(fx.skillLv || {}))
      for (const id of expandSelector(k, ctx, s)) agg.skillLv[id] = (agg.skillLv[id] || 0) + scaleFx(v, r);
    for (const [el, v] of Object.entries(fx.elem || {}))
      for (const id of expandSelector('@' + normElem(el), ctx, s)) mergeMods(agg.mods[id] || (agg.mods[id] = {}), { dmg: scaleFx(v, r) });
    for (const [k, m] of Object.entries(fx.mod || {})) {
      const scaled = {};
      for (const [mk, mv] of Object.entries(m)) scaled[mk] = scaleFx(mv, r);
      for (const id of expandSelector(k, ctx, s)) mergeMods(agg.mods[id] || (agg.mods[id] = {}), scaled);
    }
    if (fx.power) { agg.powers.add(fx.power); agg.powerRank[fx.power] = Math.max(agg.powerRank[fx.power] || 0, r); }
    if (fx.grant) agg.grants.add(fx.grant);
  };
  for (const n of t.cls.nodes) { const r = Math.min(T.cls?.[n.id] | 0, n.max); if (r > 0) apply(n, r, T.choice?.[n.id]); }
  if (s) {
    agg.spec = s.id;
    agg.mechanic = s.mechanic || null;
    agg.innate = { ...(s.innate || {}) };
    const ranks = T.sp?.[s.id] || {};
    for (const n of s.nodes) { const r = n.free ? 1 : Math.min(ranks[n.id] | 0, n.max); if (r > 0) apply(n, r, T.choice?.[n.id]); }
    // árbol héroe: solo aporta con el Paragon abierto (clave gratis + sus nodos)
    const h = activeHeroTree(p);
    agg.hero = h?.id || null;
    agg.heroOpen = heroOpen(p);
    agg.heroPaused = heroPaused(p);
    if (h && agg.heroOpen) {
      const hr = T.hero?.[s.id]?.nodes?.[h.id] || {};
      const hc = T.hero?.[s.id]?.choice?.[h.id] || {};
      for (const n of h.nodes || []) { const r = n.free ? 1 : Math.min(hr[n.id] | 0, n.max); if (r > 0) apply(n, r, hc[n.id]); }
    }
  }
  return agg;
}
// memo por héroe: clave = lo que cambia el resultado (nivel, especialización, rangos,
// elecciones, árbol héroe y forja). recompute corre en cada addBuff y no debe rehacer
// 156 nodos con selectores por un buff (riesgo 11). Devuelve SIEMPRE una copia: quien
// llama puede sumarle cosas (talentExtra) sin ensuciar el memo
const AGG_MEMO = new WeakMap();
const AGG_STATS = { hits: 0, misses: 0 };
export function talentAggStats() { return { ...AGG_STATS }; }
function aggKey(p) {
  const T = p.talents || {};
  const spec = T.spec || null;
  return JSON.stringify([p.classId, p.level || 1, spec, T.cls || null, spec ? T.sp?.[spec] || null : null,
    T.choice || null, spec ? T.hero?.[spec] || null : null, p.skillForge || null, p.talentsRev || 0]);
}
// opts = { elemOf(id) → elemento forjado, kitOf(specId) → ids del kit, defOf?(id) → definición
// forjada (tags y preparación para '@tag:'/'@windup') }; sin ellos se usa el catálogo.
// El memo supone que esos accesores solo dependen del catálogo, la forja y la especialización.
export function aggregateTalents(p, opts = {}) {
  if (!p || typeof p !== 'object') return emptyAgg();
  const key = aggKey(p);
  const hit = AGG_MEMO.get(p);
  if (hit && hit.key === key) { AGG_STATS.hits++; return cloneAgg(hit.agg); }
  AGG_STATS.misses++;
  const agg = computeAgg(p, opts);
  AGG_MEMO.set(p, { key, agg });
  return cloneAgg(agg);
}
// rango EFECTIVO de un nodo (0 si su árbol no aporta: héroe cerrado o en pausa, otra especialización)
export function talentRank(p, nodeId) {
  const agg = p?.talentAgg?.ranks ? p.talentAgg : aggregateTalents(p);
  return agg.ranks?.[nodeId] | 0;
}
// rango del nodo que concede un poder (los finales y el ápice escalan con él)
export function powerRank(p, powerId) {
  const agg = p?.talentAgg?.powerRank ? p.talentAgg : aggregateTalents(p);
  return agg.powerRank?.[powerId] | 0;
}

// ------------------------------------------------------------ builds (§3.3)
export function buildsFor(classId, specId) {
  return Object.entries(TALENT_TREES[classId]?.builds || {})
    .filter(([, b]) => !specId || b.sp === specId)
    .map(([key, b]) => ({ key, name: b.n, arch: b.arch, build: b }));
}
export function defaultBuildKey(classId, specId) {
  const key = TALENT_TREES[classId]?.defaultBuild?.[specId];
  return key && TALENT_TREES[classId]?.builds?.[key] ? key : null;
}
// lista de compra [[id, rango acumulado], …] de un objeto en orden de compra; «id_» = rangos
// del mismo nodo comprados más tarde (Nv85+)
function purchaseOrder(obj) {
  const acc = {}, order = [];
  for (const [k, v] of Object.entries(obj || {})) {
    const id = k.replace(/_$/, '');
    acc[id] = (acc[id] || 0) + (v | 0);
    order.push([id, acc[id]]);
  }
  return { ranks: acc, order };
}
// build normalizada SIN mutar la de los datos: acepta la forma cruda del mockup (cls en orden
// de compra con «id_», sin clsOrder) y la ya normalizada. Idempotente.
export function normBuild(b) {
  if (!b || typeof b !== 'object') return null;
  if (b._norm) return b;
  const c = b.clsOrder ? { ranks: { ...(b.cls || {}) }, order: b.clsOrder.map(([id, t]) => [id, t]) } : purchaseOrder(b.cls);
  const s = b.specOrder ? { ranks: { ...(b.spec || {}) }, order: b.specOrder.map(([id, t]) => [id, t]) } : purchaseOrder(b.spec);
  const out = { ...b, cls: c.ranks, clsOrder: c.order, spec: s.ranks, specOrder: s.order,
    heroNodes: [...(b.heroNodes || [])], clsCh: { ...(b.clsCh || {}) }, specCh: { ...(b.specCh || {}) }, heroCh: { ...(b.heroCh || {}) } };
  Object.defineProperty(out, '_norm', { value: true });
  return out;
}
// llenado punto a punto (idéntico a simularBuild del validador y a t2applyPreset): cada
// punto va al PRIMER nodo de la lista que se pueda comprar con los rangos actuales
export function fillByOrder(nodes, gates, order, budget, level = LEVEL_MAX) {
  const tree = { nodes, gates };
  const by = new Map(nodes.map(n => [n.id, n]));
  const ranks = {};
  let spent = 0;
  while (spent < budget) {
    const hit = order.find(([id, want]) => {
      const n = by.get(id);
      if (!n || n.free || (ranks[id] | 0) >= want) return false;
      ranks[id] = (ranks[id] | 0) + 1;
      const ok = validRanks(tree, ranks, level);
      if (--ranks[id] <= 0) delete ranks[id];
      return ok;
    });
    if (!hit) break;
    ranks[hit[0]] = (ranks[hit[0]] | 0) + 1;
    spent++;
  }
  return ranks;
}
// rangos de una build al nivel dado: { cls, sp:{ spec: rangos }, choice, hero }
//   hero = { tree, nodes:{ tree: rangos }, choice:{ tree: elecciones } } (los nodos solo si
//   el Paragon se abre con esos rangos al nivel dado; en el orden de heroNodes)
export function buildRanks(p, build, { level } = {}) {
  const b = normBuild(build);
  const classId = p?.classId;
  const t = TALENT_TREES[classId];
  const L = level ?? p?.level ?? 1;
  const out = { cls: {}, sp: {}, choice: {}, hero: null };
  if (!b || !t) return out;
  out.cls = fillByOrder(t.cls.nodes, CLASS_GATES, b.clsOrder, earnedAt('cls', L), L);
  const s = findSpec(classId, b.sp);
  if (s) out.sp[s.id] = L >= TALENT_RULES.specAt ? fillByOrder(s.nodes, SPEC_GATES, b.specOrder, earnedAt('spec', L), L) : {};
  out.choice = { ...b.clsCh, ...b.specCh };
  const h = s && heroTreesFor(classId, s.id).find(x => x.id === b.hero);
  if (h) {
    const ranks = {};
    const open = earnedAt('spec', L) >= TALENT_RULES.pts.spec && spentIn({ nodes: s.nodes }, out.sp[s.id]) >= TALENT_RULES.pts.spec;
    if (open) {
      let left = earnedAt('hero', L);
      const tree = { nodes: h.nodes || [] };
      for (const id of b.heroNodes) {
        if (left <= 0) break;
        const n = nodeById(tree, id);
        if (!n || n.free || ranks[id]) continue;
        if (!reqFail(tree, ranks, n)) { ranks[id] = 1; left--; }
      }
    }
    out.hero = { tree: h.id, nodes: { [h.id]: ranks }, choice: { [h.id]: { ...b.heroCh } } };
  }
  return out;
}

// ------------------------------------------------------------ firma de los árboles (código IRPG2)
export function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}
// FNV-1a de ids + max + req + t de los tres ámbitos (clase, especializaciones y héroe)
export function treeSignature(classId) {
  const t = TALENT_TREES[classId];
  if (!t) return '';
  const part = nodes => (nodes || []).map(n => `${n.id}:${n.t}:${n.max}:${(n.req || []).join(',')}`).join(';');
  const body = [part(t.cls.nodes), ...(t.specs || []).map(s => `${s.id}=${part(s.nodes)}`),
    ...(t.hero || []).map(h => `${h.id}=${part(h.nodes)}`)].join('|');
  return fnv1a(body).toString(36);
}

// ------------------------------------------------------------ normalización del guardado (§3.2)
export const TALENTS_TRIMMED_NOTICE = 'talentos-recortados';
// árboles recortados por normalizeTalents (propiedad NO enumerable: no se guarda)
export function talentsTrimmed(talents) { return talents?._trimmed || []; }
function cleanRanks(raw, nodes) {
  const o = {};
  for (const n of nodes || []) {
    const r = raw?.[n.id] | 0;
    if (r > 0 && !n.free) o[n.id] = Math.min(r, n.max);
  }
  return o;
}
function cleanChoices(raw, nodes) {
  const o = {};
  for (const n of nodes || []) {
    const k = raw?.[n.id];
    if (n.t === 'c' && (n.opts || []).some(x => x.k === k)) o[n.id] = k;
  }
  return o;
}
const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
// raw: estado guardado. v 1 (formato de 2c.0) → v2 VACÍO: la migración MIGRATIONS[4] lo rehace.
// Sin `v` se lee como v2 (objetos armados a mano: arnés y tests).
// level: si viene, valida cada árbol (puertas, requisitos y presupuesto al nivel); un árbol
// ilegal se VACÍA entero y queda anotado (talentsTrimmed → aviso 'talentos-recortados').
export function normalizeTalents(raw, classId, level) {
  const out = { v: 2, spec: null, cls: {}, sp: {}, choice: {}, hero: {}, loadouts: {} };
  const t = TALENT_TREES[classId];
  const trimmed = [];
  if (isObj(raw) && (raw.v === 2 || raw.v === undefined) && t) {
    out.spec = findSpec(classId, raw.spec) ? raw.spec : null;
    out.cls = cleanRanks(raw.cls, t.cls.nodes);
    const allChoiceNodes = [...t.cls.nodes];
    for (const s of t.specs || []) { out.sp[s.id] = cleanRanks(raw.sp?.[s.id], s.nodes); allChoiceNodes.push(...s.nodes); }
    out.choice = cleanChoices(raw.choice, allChoiceNodes);
    for (const s of t.specs || []) {
      const rh = raw.hero?.[s.id];
      if (!isObj(rh)) continue;
      const trees = heroTreesFor(classId, s.id);
      if (!trees.length) continue;
      const st = { tree: trees.some(h => h.id === rh.tree) ? rh.tree : trees[0].id, nodes: {}, choice: {} };
      for (const h of trees) {
        const n = cleanRanks(rh.nodes?.[h.id], h.nodes);
        const c = cleanChoices(rh.choice?.[h.id], h.nodes);
        if (Object.keys(n).length) st.nodes[h.id] = n;
        if (Object.keys(c).length) st.choice[h.id] = c;
      }
      out.hero[s.id] = st;
    }
    for (const s of t.specs || []) {
      const list = Array.isArray(raw.loadouts?.[s.id]) ? raw.loadouts[s.id] : [];
      const ok = list.filter(isObj).slice(0, 10).map(l => ({
        name: String(l.name ?? '').slice(0, 24), cls: isObj(l.cls) ? { ...l.cls } : {}, choice: isObj(l.choice) ? { ...l.choice } : {},
        sp: isObj(l.sp) ? { ...l.sp } : {}, hero: isObj(l.hero) ? JSON.parse(JSON.stringify(l.hero)) : null,
      }));
      if (ok.length) out.loadouts[s.id] = ok;
    }
    // validación por árbol al nivel dado
    if (Number.isFinite(level)) {
      const check = (key, nodes, gates, ranks, budget) => {
        const tree = { nodes, gates };
        if (!validRanks(tree, ranks, level) || spentIn(tree, ranks) > budget) { trimmed.push(key); return {}; }
        return ranks;
      };
      out.cls = check('cls', t.cls.nodes, CLASS_GATES, out.cls, earnedAt('cls', level));
      for (const s of t.specs || []) out.sp[s.id] = check(`sp.${s.id}`, s.nodes, SPEC_GATES, out.sp[s.id], earnedAt('spec', level));
      for (const [sid, st] of Object.entries(out.hero))
        for (const h of heroTreesFor(classId, sid))
          if (st.nodes[h.id]) {
            const r = check(`hero.${sid}.${h.id}`, h.nodes, HERO_GATES, st.nodes[h.id], earnedAt('hero', level));
            if (Object.keys(r).length) st.nodes[h.id] = r; else delete st.nodes[h.id];
          }
    }
  }
  Object.defineProperty(out, '_trimmed', { value: trimmed, enumerable: false });
  return out;
}

// ------------------------------------------------------------ envoltorios del banco (E4 los borra)
/** @deprecated D23: el banco usa la defaultBuild. Lista [[id, rango acumulado, elección?], …]. */
export function presetList(p, which) {
  const key = defaultBuildKey(p?.classId, p?.talents?.spec);
  const b = key && normBuild(TALENT_TREES[p.classId].builds[key]);
  if (!b) return [];
  const ch = { ...b.clsCh, ...b.specCh };
  return (which === 'cls' ? b.clsOrder : b.specOrder).map(([id, n]) => (ch[id] ? [id, n, ch[id]] : [id, n]));
}
/** @deprecated D23: rangos de la defaultBuild de la especialización del jugador. */
export function presetRanks(p, which) {
  const key = defaultBuildKey(p?.classId, p?.talents?.spec);
  if (!key) return null;
  const r = buildRanks(p, TALENT_TREES[p.classId].builds[key]);
  return which === 'cls' ? r.cls : (r.sp[p.talents.spec] || {});
}

// ------------------------------------------------------------ retirados (D23)
/** @deprecated D23: las insignias son habilidades del catálogo (D7). Devuelve null. Se borra en E5. */
export function specInsignia() { return null; }
