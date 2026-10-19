// ============================================================
// TALENTOS (estilo WoW Retail): árbol de CLASE + árbol de ESPECIALIZACIÓN
// ============================================================
// Reemplaza a las maestrías. Cada clase tiene un árbol de clase compartido y 3
// especializaciones (los ids son los de las antiguas maestrías → migración
// trivial). Módulo PURO (sin DOM): lo usan Player.recompute(), el mixin
// game-mastery.js, la UI y los tests headless.
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
//   skillLv:{ skillId|'@elem'|'@all': +niveles }
//   mod:    { skillId|'@elem'|'@all': { dmg, proj, radius, cdr, dur, crit,
//             cost, dot, zone, echo, slow, vuln, stun, chain, pierce, coldblood } }
//   tv:     { clave: valor } valores numéricos que leen los hooks de combate:
//     eliteDmg slowedDmg highHpDmg lowHpDmg critDmg dmgReduc costRed
//     dotPct burnPct poisonPct bleedPct dotDur killHeal burnKillHeal
//     burnExplode killExplode manaOnKill executePct shatterPct highManaDmg
//   power:  'id' (entra en player.powers; ver hooks en entities/main)
//   grant:  'skillId' (habilidad activa nueva de kind 'talent')
import { CLASSES } from './data.js';
import { MAGA_TALENTS } from './talents-maga.js';
import { GUERRERO_TALENTS } from './talents-guerrero.js';
import { ARQUERA_TALENTS } from './talents-arquera.js';

export const TALENT_START_LEVEL = 10; // elegir especialización (su nodo clave es gratis)
export const TALENT_CAP_LEVEL = 50;   // último nivel que da punto de talento
export const SPEC_GATES = [{ row: 3, need: 6 }, { row: 6, need: 12 }, { row: 8, need: 17, level: 40 }];
export const CLASS_GATES = [{ row: 3, need: 6 }, { row: 5, need: 12 }];

export const TALENT_TREES = { maga: MAGA_TALENTS, guerrero: GUERRERO_TALENTS, arquera: ARQUERA_TALENTS };

// las habilidades activas que conceden los talentos viven en el catálogo de la
// clase (kind 'talent'), así la barra, el lanzamiento y la UI las encuentran.
for (const [cid, t] of Object.entries(TALENT_TREES)) {
  const list = CLASSES[cid]?.skills;
  if (!list) continue;
  for (const sk of t.skills || []) if (!list.some(s => s.id === sk.id)) list.push({ ...sk, kind: 'talent' });
}

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
      for (const n of nodes) { const r = ranks?.[n.id] | 0; if (r > 0) o[n.id] = Math.min(r, n.max); }
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
  if (node.req.some(id => (ranks[id] | 0) >= (nodeById(tree, id)?.max || 1))) return null;
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
// rellena el árbol con la build recomendada (lista ordenada de [id, rangos])
export function presetRanks(p, which) {
  const tree = treeOf(p, which); if (!tree) return null;
  const list = which === 'cls' ? TALENT_TREES[p.classId].cls.preset : tree.spec.preset;
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

const MOD_MAX = ['slow', 'vuln', 'stun', 'execute', 'chain', 'zone', 'cdhit'];
const MOD_BOOL = ['pierce', 'echo', 'coldblood'];
// fusiona modificadores de skill (mismo vocabulario que aggregateSkillMods)
export function mergeSkillMods(out, add) {
  if (!add) return out;
  for (const [k, v] of Object.entries(add)) {
    if (MOD_BOOL.includes(k)) { if (v) out[k] = true; }
    else if (k === 'dot') { if (v && !out.dot) out.dot = v; }
    else if (MOD_MAX.includes(k)) out[k] = Math.max(out[k] || 0, v);
    else out[k] = (out[k] || 0) + v;
  }
  return out;
}

// expande '@all' / '@fire' a los ids de skill de la clase
function expandSkillKey(classId, key) {
  const list = CLASSES[classId]?.skills || [];
  if (key === '@all') return list.filter(s => s.kind !== 'passive' && s.type !== 'weapon').map(s => s.id);
  if (key[0] === '@') { const el = key.slice(1); return list.filter(s => skillElem(s) === el && s.type !== 'passive').map(s => s.id); }
  return [key];
}

// suma TODOS los efectos de los talentos asignados → lo consume recompute()
export function aggregateTalents(p) {
  const agg = { stats: {}, tv: {}, powers: new Set(), skillLv: {}, mods: {}, grants: new Set() };
  const T = p.talents;
  const t = TALENT_TREES[p.classId];
  if (!T || !t) return agg;
  const apply = (node, r) => {
    const fx = nodeFx(node, T.choice?.[node.id]);
    for (const [k, v] of Object.entries(fx.stats || {})) agg.stats[k] = (agg.stats[k] || 0) + scaleFx(v, r);
    for (const [k, v] of Object.entries(fx.tv || {})) agg.tv[k] = (agg.tv[k] || 0) + scaleFx(v, r);
    for (const [k, v] of Object.entries(fx.skillLv || {}))
      for (const id of expandSkillKey(p.classId, k)) agg.skillLv[id] = (agg.skillLv[id] || 0) + scaleFx(v, r);
    for (const [el, v] of Object.entries(fx.elem || {}))
      for (const id of expandSkillKey(p.classId, '@' + el)) mergeSkillMods(agg.mods[id] || (agg.mods[id] = {}), { dmg: scaleFx(v, r) });
    for (const [k, m] of Object.entries(fx.mod || {})) {
      const scaled = {};
      for (const [mk, mv] of Object.entries(m)) scaled[mk] = scaleFx(mv, r);
      for (const id of expandSkillKey(p.classId, k)) mergeSkillMods(agg.mods[id] || (agg.mods[id] = {}), scaled);
    }
    if (fx.power) agg.powers.add(fx.power);
    if (fx.grant) agg.grants.add(fx.grant);
  };
  for (const n of t.cls.nodes) { const r = T.cls?.[n.id] | 0; if (r > 0) apply(n, r); }
  const s = findSpec(p.classId, T.spec);
  if (s && (p.level || 1) >= TALENT_START_LEVEL) {
    const ranks = T.sp?.[s.id] || {};
    for (const n of s.nodes) { const r = n.free ? 1 : (ranks[n.id] | 0); if (r > 0) apply(n, r); }
  }
  return agg;
}

// nivel base de las habilidades concedidas por talento: sube con el personaje
export function talentSkillBase(level) {
  return Math.max(1, Math.min(6, 1 + Math.floor(Math.max(0, (level || 1) - TALENT_START_LEVEL) / 8)));
}
