// ============================================================
// TALENTOS (estilo WoW Retail): árbol de CLASE + árbol de ESPECIALIZACIÓN
// ============================================================
// Reemplaza a las maestrías (Paso 2c.0). Cada clase tiene un árbol de clase
// compartido y 3 especializaciones (los ids son los de las antiguas maestrías →
// migración trivial, save-schema MIGRATIONS[3]). Módulo PURO (sin DOM): lo usan
// Player.recompute(), el mixin game-talents.js, talents-ops.js (panel), la
// migración de guardado y los tests headless.
//
// NODO: { id, name, icon, t, r, c, max, req?, free?, fx?, opts?, d? }
//   t   'p' pasiva · 'a' activa nueva (grant) · 'c' elección (opts A/B) ·
//       'k' nodo clave · 'x' apex (fila final de la especialización)
//   r/c fila (0..8) y columna (0..3, admite .5) en la rejilla
//   req ids de nodos padre: basta con UNO al rango máximo (regla WoW)
//   free el nodo clave de la especialización: gratis al elegirla
//   d(r) descripción del rango r (r>=1). Las elecciones describen cada opción.
//
// EFECTOS (`fx`, también dentro de cada opción de elección). Un número se
// multiplica por el rango; un array da el valor absoluto por rango [r1, r2…].
//   stats:  { dmgPct, crit, hp, mp, arm, … }        → recompute (como el equipo)
//   elem:   { fire|frost|arcane|phys|holy|nature: % } → +% daño de esas skills
//   skillLv:{ skillId|'@elem'|'@all'|'@spec': +niveles }
//   mod:    { skillId|'@elem'|'@all'|'@spec': { …claves de skill-defs.emptyMods:
//             dmg proj pierce radius range slow(s) slowPct(%) crit dot buff dur(%)
//             durS(+s) cdr cost gen lifesteal vuln stun root execute chain zone
//             zoneDur cdhit echo coldblood haste cleanse critCdr(s por crítico)
//             rootAdd(+s) slowPctAdd(+%) } }
//             Fusión = skill-defs.mergeMods: se SUMAN salvo slow/slowPct/stun/root/
//             vuln/execute/chain/zone/cdhit/haste (gana el MÁXIMO) y los booleanos.
//             Un «+N s de inmovilización» de talento sobre la habilidad = rootAdd (suma).
//   tv:     { clave: valor } valores que leen los hooks de combate (§5.3). Todos
//     numéricos y SUMADOS, salvo costRedBig = { pct, over } (objeto: pct se suma,
//     over = el umbral más bajo). Incondicionales que ya aplica recompute:
//     critDmg (saco aditivo del crítico) y dmgReduc (dr).
//   power:  'id' (entra en player.powers → registro de poderes, js/powers*.js)
//   grant:  'skillId' (habilidad activa nueva de kind 'talent'; data.js la añade
//           NORMALIZADA al catálogo de la clase y talentAgg.grants la desbloquea)
// '@spec' = las habilidades del ELEMENTO de la especialización ACTIVA (spec.elem o el de
// su insignia: Piromante fuego, Crionte escarcha, Arcanista arcano…) ∪ las activas
// que concede su árbol (texto de Maga c9: «habilidades del elemento de tu especialización»).
// ESPECIALIZACIÓN: { id, name, role, mechanic (indicador de spec-mechanics.js),
//   innate:{…} (pasivas de línea base, §5.2.5; NO son nodos: aggregateTalents las
//   devuelve en agg.innate y recompute las aplica: block solo con escudo),
//   nodes, preset, clsPreset (preset del árbol de CLASE para esta especialización) }
import { CLASSES } from './data.js';
import { mergeMods } from './skill-defs.js';
import { MAGA_TALENTS } from './talents-maga.js';
import { GUERRERO_TALENTS } from './talents-guerrero.js';
import { ARQUERA_TALENTS } from './talents-arquera.js';

export const TALENT_START_LEVEL = 10; // elegir especialización (su nodo clave es gratis)
export const TALENT_CAP_LEVEL = 50;   // último nivel que da punto de talento
export const SPEC_GATES = [{ row: 3, need: 6 }, { row: 6, need: 12 }, { row: 8, need: 17, level: 40 }];
export const CLASS_GATES = [{ row: 3, need: 6 }, { row: 5, need: 12 }];

export const TALENT_TREES = { maga: MAGA_TALENTS, guerrero: GUERRERO_TALENTS, arquera: ARQUERA_TALENTS };

// Las activas que conceden los talentos (TREE.skills, kind 'talent') las añade
// data.js al catálogo de la clase YA NORMALIZADAS (skill-defs.normalizeSkillDef),
// así la barra, el lanzamiento, el resolvedor y la UI las encuentran aunque este
// módulo no se haya importado todavía.

// elemento de las habilidades base (las de talento lo llevan en `elem`)
export const SKILL_ELEM = {
  m_dardo: 'arcane', bola_fuego: 'fire', meteoro: 'fire', m_u_supernova: 'fire',
  nova_hielo: 'frost', rayo: 'arcane', m_p_arcano: 'arcane',
  g_tajo: 'phys', g_mandoble: 'phys', g_embate: 'phys', torbellino: 'phys', embestida: 'phys',
  g_martillo: 'phys', terremoto: 'phys', g_lanza: 'phys', g_salto: 'phys', g_hendidura: 'phys',
  grito_guerra: 'phys', g_provocacion: 'phys', g_u_furia: 'phys', g_u_cataclismo: 'holy', g_u_estandarte: 'holy',
  a_disparo: 'phys', flecha_multiple: 'phys', flecha_perforante: 'phys', agilidad: 'nature',
  lluvia_flechas: 'phys', a_u_diluvio: 'nature',
};
export const ELEM_NAME = { fire: 'Fuego', frost: 'Escarcha', arcane: 'Arcano', phys: 'Físico', holy: 'Sagrado', nature: 'Naturaleza' };
export function skillElem(sk) { return sk ? (sk.elem || SKILL_ELEM[sk.id] || null) : null; }

export function talentTreesFor(classId) { return TALENT_TREES[classId] || null; }
export function findSpec(classId, specId) {
  return (TALENT_TREES[classId]?.specs || []).find(s => s.id === specId) || null;
}
// activa insignia de una especialización: la que otorga su nodo clave gratis (s0)
export function specInsignia(classId, specId) {
  const s = findSpec(classId, specId);
  const k = s?.nodes.find(n => n.free);
  return k?.fx?.grant || null;
}
// especialización ACTIVA del jugador (elegida y con nivel ≥ TALENT_START_LEVEL)
export function activeSpec(p) {
  if (!p || (p.level || 1) < TALENT_START_LEVEL) return null;
  return findSpec(p.classId, p.talents?.spec);
}
// todas las activas que concede un árbol (nodos y opciones de elección)
export function treeGrants(nodes) {
  const out = [];
  for (const n of nodes || []) {
    if (n.fx?.grant) out.push(n.fx.grant);
    for (const o of n.opts || []) if (o.fx?.grant) out.push(o.fx.grant);
  }
  return out;
}
// árbol de clase o de especialización activa del jugador, con sus puertas
export function treeOf(p, which) {
  const t = TALENT_TREES[p.classId];
  if (!t) return null;
  if (which === 'cls') return { key: 'cls', name: t.cls.name, nodes: t.cls.nodes, gates: CLASS_GATES };
  const s = findSpec(p.classId, p.talents?.spec);
  return s ? { key: 'spec', name: s.name, nodes: s.nodes, gates: SPEC_GATES, spec: s } : null;
}
export function nodeById(tree, id) { return tree?.nodes.find(n => n.id === id) || null; }

// estado guardado: { v, spec, cls:{id:rango}, sp:{specId:{id:rango}}, choice:{id:'A'|'B'} }
export function normalizeTalents(raw, classId, legacyMasteryId = null) {
  const out = { v: 1, spec: null, cls: {}, sp: {}, choice: {} };
  if (raw && typeof raw === 'object') {
    out.spec = findSpec(classId, raw.spec) ? raw.spec : null;
    out.cls = raw.cls && typeof raw.cls === 'object' ? { ...raw.cls } : {};
    out.sp = raw.sp && typeof raw.sp === 'object' ? { ...raw.sp } : {};
    out.choice = raw.choice && typeof raw.choice === 'object' ? { ...raw.choice } : {};
  } else if (legacyMasteryId && findSpec(classId, legacyMasteryId)) {
    out.spec = legacyMasteryId; // migración: la maestría elegida pasa a ser la especialización
  }
  // purga ids que ya no existen y rangos fuera de rango
  const t = TALENT_TREES[classId];
  if (t) {
    const clean = (ranks, nodes) => {
      const o = {};
      // los nodos gratis (s0) no se guardan nunca (los rodeos viejos del panel los guardaban)
      for (const n of nodes) { const r = ranks?.[n.id] | 0; if (r > 0 && !n.free) o[n.id] = Math.min(r, n.max); }
      return o;
    };
    out.cls = clean(out.cls, t.cls.nodes);
    const sp = {};
    for (const s of t.specs) sp[s.id] = clean(out.sp[s.id] || {}, s.nodes);
    out.sp = sp;
  }
  return out;
}

// hazañas: bastiones reclamados (≤2) + jefes únicos derrotados (≤4) → hasta 6
// puntos extra, alternando especialización / clase.
export function featCount(p) {
  const strongholds = Math.min(2, (p.strongholdsCleared || []).length);
  const bosses = Math.min(4, Math.floor((p.records?.bossKills || 0) / 3));
  return strongholds + bosses;
}
export function talentPointsEarned(p, which) {
  const lvl = Math.min(p.level || 1, TALENT_CAP_LEVEL);
  let n = 0;
  if (which === 'spec') { for (let l = TALENT_START_LEVEL; l <= lvl; l += 2) n++; }
  else { for (let l = TALENT_START_LEVEL + 1; l <= lvl; l += 2) n++; }
  if ((p.level || 1) < TALENT_START_LEVEL) return 0;
  const feats = featCount(p);
  n += which === 'spec' ? Math.ceil(feats / 2) : Math.floor(feats / 2);
  return n;
}
export function ranksOf(p, which) {
  const T = p.talents;
  if (!T) return {};
  if (which === 'cls') return T.cls || (T.cls = {});
  if (!T.spec) return {};
  return T.sp[T.spec] || (T.sp[T.spec] = {});
}
// puntos gastados (los nodos gratis no cuentan); `beforeRow` limita a filas superiores
export function spentIn(tree, ranks, beforeRow = 99) {
  let s = 0;
  for (const n of tree.nodes) if (!n.free && n.r < beforeRow) s += ranks[n.id] | 0;
  return s;
}
// puntos libres de un árbol (los nodos gratis no cuestan: spentIn los ignora aunque
// un save viejo los tuviera guardados en ranks)
export function talentPointsLeft(p, which) {
  const tree = treeOf(p, which);
  if (!tree) return which === 'spec' ? 0 : Math.max(0, talentPointsEarned(p, 'cls'));
  return talentPointsEarned(p, which) - spentIn(tree, ranksOf(p, which));
}
// motivo por el que una puerta bloquea el nodo (o null)
export function gateFail(tree, ranks, node, level) {
  for (const g of tree.gates) {
    if (node.r < g.row) continue;
    const have = spentIn(tree, ranks, g.row);
    if (have < g.need) return `Gasta ${g.need} puntos en las filas superiores (llevas ${have})`;
    if (g.level && level < g.level) return `Requiere nivel ${g.level}`;
  }
  return null;
}
export function reqFail(tree, ranks, node) {
  if (!node.req || !node.req.length) return null;
  // el nodo clave gratis (free) cuenta como comprado: nunca se guarda en `ranks`
  if (node.req.some(id => { const par = nodeById(tree, id); return !!par?.free || (ranks[id] | 0) >= (par?.max || 1); })) return null;
  return `Requiere ${node.req.map(id => nodeById(tree, id)?.name || id).join(' o ')} al máximo`;
}
function validRanks(tree, ranks, level) {
  return tree.nodes.every(n => !(ranks[n.id] > 0) || n.free || (!gateFail(tree, ranks, n, level) && !reqFail(tree, ranks, n)));
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
// lista ordenada [id, rangos, opción?] de la build recomendada de un árbol. El
// preset de CLASE es el `clsPreset` de la especialización elegida (cada mockup
// trae el suyo); sin especialización, el `cls.preset` (= el de la 1.ª).
export function presetList(p, which) {
  const t = TALENT_TREES[p?.classId];
  if (!t) return [];
  if (which === 'cls') return findSpec(p.classId, p.talents?.spec)?.clsPreset || t.cls.preset || [];
  return findSpec(p.classId, p.talents?.spec)?.preset || [];
}
// rellena el árbol con la build recomendada (lista ordenada de [id, rangos]).
// Los nodos gratis (free) NO se guardan en los rangos: reqFail ya los cuenta.
export function presetRanks(p, which) {
  const tree = treeOf(p, which); if (!tree) return null;
  const list = presetList(p, which);
  const budget = talentPointsEarned(p, which);
  const ranks = {};
  let left = budget;
  for (const [id, want] of list || []) {
    const node = nodeById(tree, id); if (!node || node.free) continue;
    for (let i = 0; i < want && left > 0; i++) {
      if ((ranks[id] | 0) >= node.max) break;
      if (gateFail(tree, ranks, node, p.level) || reqFail(tree, ranks, node)) break;
      ranks[id] = (ranks[id] | 0) + 1; left--;
    }
  }
  return ranks;
}

// valor de un efecto en el rango r
export function scaleFx(v, r) {
  if (Array.isArray(v)) return v[Math.min(r, v.length) - 1];
  if (typeof v === 'number') return v * r;
  return v;
}
// efectos activos del nodo (las elecciones usan la opción escogida)
export function nodeFx(node, choice) {
  if (node.t === 'c') return (node.opts.find(o => o.k === choice) || node.opts[0]).fx || {};
  return node.fx || {};
}
export function nodeDesc(node, r, choice) {
  if (node.t === 'c') { const o = node.opts.find(x => x.k === choice) || node.opts[0]; return `${o.name}: ${o.desc}`; }
  return typeof node.d === 'function' ? node.d(Math.max(1, r)) : (node.d || '');
}

// fusiona modificadores de skill: MISMAS reglas que las ramas (skill-defs.mergeMods:
// slow/slowPct/stun/root/vuln/… toman el MÁXIMO; el resto suma; booleanos con OR)
export function mergeSkillMods(out, add) { return mergeMods(out, add); }

// elemento de una especialización: spec.elem o el de su insignia (s0)
export function specElem(classId, spec) {
  if (!spec) return null;
  if (spec.elem) return spec.elem;
  const ins = spec.nodes?.find(n => n.free)?.fx?.grant;
  return skillElem((CLASSES[classId]?.skills || []).find(s => s.id === ins)) || null;
}
// expande '@all' / '@fire' / '@spec' a los ids de skill de la clase
// ('@spec' = habilidades del elemento de la especialización ∪ las activas de su árbol)
function expandSkillKey(classId, key, spec = null) {
  const list = CLASSES[classId]?.skills || [];
  if (key === '@all') return list.filter(s => s.kind !== 'passive' && s.type !== 'weapon').map(s => s.id);
  if (key === '@spec') {
    if (!spec) return [];
    const el = specElem(classId, spec);
    const grants = new Set(treeGrants(spec.nodes));
    return list.filter(s => grants.has(s.id) || (el && skillElem(s) === el && s.type !== 'passive')).map(s => s.id);
  }
  if (key[0] === '@') { const el = key.slice(1); return list.filter(s => skillElem(s) === el && s.type !== 'passive').map(s => s.id); }
  return [key];
}
// suma de una clave tv: números se suman; costRedBig {pct, over} suma pct y se
// queda con el umbral más bajo (antes se concatenaba como "0[object Object]")
function addTv(tv, k, v) {
  if (v && typeof v === 'object') {
    const cur = tv[k] && typeof tv[k] === 'object' ? tv[k] : null;
    tv[k] = cur ? { ...cur, pct: (cur.pct || 0) + (v.pct || 0), over: Math.min(cur.over ?? Infinity, v.over ?? Infinity) } : { ...v };
  } else if (Number.isFinite(v)) tv[k] = (Number.isFinite(tv[k]) ? tv[k] : 0) + v;
}

// suma TODOS los efectos de los talentos asignados → lo consume recompute().
// agg = { stats, tv, powers:Set, skillLv, mods, grants:Set, innate, spec, mechanic }
//  · spec / mechanic / innate solo con la especialización ACTIVA (Nv ≥ 10)
//  · el nodo clave gratis (free) cuenta siempre como rango 1 (nunca está en ranks)
export function aggregateTalents(p) {
  const agg = { stats: {}, tv: {}, powers: new Set(), skillLv: {}, mods: {}, grants: new Set(), innate: {}, spec: null, mechanic: null };
  const T = p?.talents;
  const t = TALENT_TREES[p?.classId];
  if (!T || !t) return agg;
  const s = activeSpec(p);
  const apply = (node, r) => {
    const fx = nodeFx(node, T.choice?.[node.id]);
    for (const [k, v] of Object.entries(fx.stats || {})) agg.stats[k] = (agg.stats[k] || 0) + scaleFx(v, r);
    for (const [k, v] of Object.entries(fx.tv || {})) addTv(agg.tv, k, scaleFx(v, r));
    for (const [k, v] of Object.entries(fx.skillLv || {}))
      for (const id of expandSkillKey(p.classId, k, s)) agg.skillLv[id] = (agg.skillLv[id] || 0) + scaleFx(v, r);
    for (const [el, v] of Object.entries(fx.elem || {}))
      for (const id of expandSkillKey(p.classId, '@' + el)) mergeSkillMods(agg.mods[id] || (agg.mods[id] = {}), { dmg: scaleFx(v, r) });
    for (const [k, m] of Object.entries(fx.mod || {})) {
      const scaled = {};
      for (const [mk, mv] of Object.entries(m)) scaled[mk] = scaleFx(mv, r);
      for (const id of expandSkillKey(p.classId, k, s)) mergeSkillMods(agg.mods[id] || (agg.mods[id] = {}), scaled);
    }
    if (fx.power) agg.powers.add(fx.power);
    if (fx.grant) agg.grants.add(fx.grant);
  };
  for (const n of t.cls.nodes) { const r = T.cls?.[n.id] | 0; if (r > 0) apply(n, Math.min(r, n.max)); }
  if (s) {
    agg.spec = s.id;
    agg.mechanic = s.mechanic || null;
    agg.innate = { ...(s.innate || {}) };
    const ranks = T.sp?.[s.id] || {};
    for (const n of s.nodes) { const r = n.free ? 1 : Math.min(ranks[n.id] | 0, n.max); if (r > 0) apply(n, r); }
  }
  return agg;
}

// nivel base de las habilidades concedidas por talento: sube con el personaje
export function talentSkillBase(level) {
  return Math.max(1, Math.min(6, 1 + Math.floor(Math.max(0, (level || 1) - TALENT_START_LEVEL) / 8)));
}
