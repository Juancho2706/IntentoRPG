// ============================================================
// Nivel de aprendizaje de los talentos (T0): a qué nivel se puede tomar cada nodo
// ============================================================
// Lo usan tests/test-talentos-nivel.mjs y tools/audit-talentos-nivel.mjs (el antes/después del
// reorden de cada clase). Todo pasa por la API REAL de js/talents.js (canAddRank, validRanks,
// learnAt…); aquí solo se arma el estado del héroe que hace falta para preguntarle.
//
//   levelTrees(classId)          árboles de clase y de especialización: { classId, which, spec, key, name, nodes, gates }
//   heroFor(tree, level, ranks)  héroe mínimo con esos rangos en ese árbol (sin recortar)
//   pathTo(tree, node, level)    rangos MÍNIMOS que dejan el nodo listo (padre al máximo y puertas)
//                                al nivel, con nodos que ya se pueden tener a ese nivel; null si no hay
//   takeLevel(tree, node, k)     primer nivel en que el nodo (u opción k) se puede tomar de verdad:
//                                pathTo cabe en los puntos de antes y canAddRank dice que sí
//   buyLevel(tree, node)         lo mismo sin mirar el nivel de aprendizaje del propio nodo: su
//                                «nivel de compra» por la forma del árbol (fila, padres y puertas)
//   greedyFill(tree, level, p?)  gasta los puntos del nivel nodo a nodo (orden de filas) con canAddRank
import * as T from '../../js/talents.js';
import { createTalentOps } from '../../js/talents-ops.js';

export const OPS = createTalentOps(T);
export const CLASS_IDS = Object.keys(T.TALENT_TREES);
export const MAX_LEVEL = T.LEVEL_MAX;

// árboles de clase y de especialización de una clase (los del nivel de aprendizaje)
export function levelTrees(classId) {
  const t = T.TALENT_TREES[classId];
  if (!t) return [];
  const out = [{ classId, which: 'cls', spec: null, key: 'clase', name: t.cls.name || 'Clase', nodes: t.cls.nodes, gates: T.CLASS_GATES }];
  for (const s of t.specs || []) out.push({ classId, which: 'spec', spec: s.id, key: s.id, name: s.name, nodes: s.nodes, gates: T.SPEC_GATES });
  return out;
}
// puntos de ese árbol al nivel
export const earned = (tree, L) => T.earnedAt(tree.which, L);
// primer nivel con algún punto en el árbol (especialización 10, clase 11)
export const firstLevel = tree => { for (let L = 1; L <= MAX_LEVEL; L++) if (earned(tree, L) > 0) return L; return MAX_LEVEL; };
export const spentOf = (tree, ranks) => T.spentIn(tree, ranks);
const rowOrder = (a, b) => a.r - b.r || a.c - b.c;

// héroe con unos rangos en ESE árbol (el de clase sin especialización: su nivel de aprendizaje
// no depende de ella). normalizeTalents sin nivel: no recorta nada
export function heroFor(tree, level, ranks = {}, choice = {}) {
  const talents = T.normalizeTalents({ v: 2, spec: tree.spec, cls: tree.which === 'cls' ? ranks : {},
    sp: tree.spec ? { [tree.spec]: ranks } : {}, choice }, tree.classId);
  return { classId: tree.classId, level, talentsRev: 0, talents };
}

// rangos mínimos para que `node` quede listo al nivel L: la cadena de padres más barata (cada padre
// al máximo, todos ya tomables a ese nivel) y el relleno de las puertas (de arriba abajo, rango a
// rango, solo lo que valga). El propio nodo queda a 0. null si a ese nivel no hay camino
export function pathTo(tree, node, L) {
  const by = new Map(tree.nodes.map(n => [n.id, n]));
  const learned = n => n.free || !T.learnFail(n, L);
  const cost = r => Object.values(r).reduce((a, b) => a + b, 0);
  const memo = new Map();
  const reqChain = n => {
    if (!n.req?.length) return {};
    let best = null;
    for (const pid of n.req) {
      const c = chain(pid);
      if (c && (!best || cost(c) < cost(best))) best = c;
    }
    return best;
  };
  function chain(id) {
    if (memo.has(id)) return memo.get(id);
    memo.set(id, null);
    const n = by.get(id);
    let res = null;
    if (n && learned(n)) {
      const base = reqChain(n);
      if (base) res = n.free ? base : { ...base, [id]: Math.max(base[id] | 0, n.max) };
    }
    memo.set(id, res);
    return res;
  }
  const base = reqChain(node);
  if (!base) return null;
  const ranks = { ...base };
  const above = [...tree.nodes].filter(n => !n.free).sort(rowOrder);
  for (const g of [...(tree.gates || [])].sort((a, b) => a.row - b.row)) {
    if (node.r < g.row) continue;
    while (T.spentIn(tree, ranks, g.row) < g.need) {
      const add = above.find(n => n.r < g.row && (ranks[n.id] | 0) < n.max && learned(n) && (() => {
        const r2 = { ...ranks, [n.id]: (ranks[n.id] | 0) + 1 };
        return !T.gateFail(tree, r2, n, L) && !T.reqFail(tree, r2, n);
      })());
      if (!add) return null;
      ranks[add.id] = (ranks[add.id] | 0) + 1;
    }
  }
  return T.validRanks(tree, ranks, L) ? ranks : null;
}

// primer nivel en que el nodo (u opción k) se toma: hay un camino que cabe en los puntos de antes y
// canAddRank (real) lo deja. ignoreLearn: el nivel del propio nodo no cuenta (nivel de compra)
function firstTake(tree, node, k, ignoreLearn) {
  if (node.free) return null;
  for (let L = firstLevel(tree); L <= MAX_LEVEL; L++) {
    const path = pathTo(tree, node, L);
    if (!path || spentOf(tree, path) > earned(tree, L) - 1) continue;
    if (ignoreLearn) return L;
    if (T.canAddRank(heroFor(tree, L, path), tree.which, node.id, k)) return L;
  }
  return null;
}
export const takeLevel = (tree, node, k = null) => firstTake(tree, node, k, false);
export const buyLevel = (tree, node) => firstTake(tree, node, null, true);

// gasta los puntos del nivel L, uno a uno, en el primer nodo (orden de filas) que canAddRank deja.
// p: héroe de un nivel anterior para seguir llenando (los rangos ya puestos siguen valiendo: con
// más nivel solo se abren cosas). onStep(p): antes de cada punto, con puntos libres. → { p, left }
export function greedyFill(tree, L, p = null, onStep = null) {
  p ||= heroFor(tree, L);
  p.level = L;
  const nodes = [...tree.nodes].filter(n => !n.free).sort(rowOrder);
  for (;;) {
    if (T.talentPointsLeft(p, tree.which) <= 0) break;
    onStep?.(p);
    const n = nodes.find(x => T.canAddRank(p, tree.which, x.id));
    if (!n) break;
    const r = OPS.addRank(p, tree.which, n.id);
    if (!r.ok) throw new Error(`greedyFill: canAddRank dejó ${n.id} y addRank no (${r.text})`);
  }
  return { p, left: Math.max(0, T.talentPointsLeft(p, tree.which)) };
}

// nombre corto de un nodo para los informes: «a3 Flujo Constante»
export const nodeLabel = n => `${n.id} ${n.name}`;
