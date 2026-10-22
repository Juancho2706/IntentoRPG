// Paso 2 · T0 — nivel de aprendizaje de los talentos (regla del dueño: un nodo u opción que solo toca
// habilidades que el héroe aún no conoce NO se toma; queda bloqueado con su motivo)
//  0) learnAt sale del catálogo: la primera habilidad que conoces de las que toca o concede el nodo
//     (por opción en una elección); el árbol de clase no depende de la especialización
//  0b) `needs` manda sobre touch: elige entre lo que el nodo toca y cambia su nivel (si no, sobra)
//  a) ningún nodo ni opción se toma por debajo de su learnAt: canAddRank y addRank reales con el
//     camino más barato hasta el nodo, gateFail/validRanks con el camino completo, el barrido de (b),
//     la vista (nodo en gris, motivo y opción con candado)
//  b) SIN PUNTOS MUERTOS: en cada nivel 1–100 los rangos tomables alcanzan los puntos ganados
//  c) ELECCIÓN REAL al empezar: Nv10–25 (especialización) y Nv11–25 (clase), ≥ 2 nodos tomables
//  d) las builds (buildsFor/buildRanks) gastan todos los puntos en cada nivel 10–100 y son legales
//  e) recorte fino de normalizeTalents (solo lo que no vale, de abajo arriba, puntos devueltos) y
//     los 57 guardados v4 reales cargan sin recorte
//  f) escenario de reorden: una elección con una opción de más nivel sube a la primera fila (ops,
//     flotante, guardado, build y código eligen la opción que ya sirve)
// Lo que HOY falla por los DATOS de una clase (b, c, d y la regla de 0) va a
// tests/talentos-nivel/pending-<clase>.json y la suite sale verde solo si coincide EXACTAMENTE.
// Las clases los vacían al reordenar. `--escribir` reescribe esos archivos con lo que falla ahora
// (revisa el diff: es la lista de deudas de cada clase).
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import * as T from '../js/talents.js';
import { CLASSES } from '../js/data.js';
import { nodeTooltip, talentsView } from '../js/talents-view.js';
import { TALENT_REASONS } from '../js/talents-ops.js';
import { migrateSave } from '../js/save-schema.js';
import { CLASS_IDS, levelTrees, heroFor, pathTo, takeLevel, buyLevel, greedyFill, earned, firstLevel, spentOf, OPS, nodeLabel }
  from './helpers/talent-level.mjs';

const WRITE = process.argv.includes('--escribir');
const PENDING_DIR = new URL('./talentos-nivel/', import.meta.url);
const R = T.TALENT_RULES;
const rowOrder = (a, b) => a.r - b.r || a.c - b.c;
const skillName = (classId, id) => CLASSES[classId].skills.find(s => s.id === id)?.name || id;
const learnText = l => (l.at === Infinity ? `${l.name} no es de esta especialización` : `Se abre al aprender ${l.name} (Nv${l.at})`);
const copyHero = p => ({ ...p, talents: JSON.parse(JSON.stringify(p.talents)) });

// deudas de datos por clase: { regla, arbol, nivel, motivo }
const found = Object.fromEntries(CLASS_IDS.map(c => [c, []]));
const debt = (classId, regla, arbol, nivel, motivo) => found[classId].push({ regla, arbol, nivel, motivo });

// ------------------------------------------------ 0) learnAt = la primera habilidad que conoces
// (definición escrita aparte, sobre el catálogo: kit base a su req; kit de especialización a su req y
// no antes de elegirla, solo con ella; activa de talento a su req)
const knownAt = (classId, id, spec) => {
  const sk = CLASSES[classId].skills.find(s => s.id === id);
  if (!sk) return null;
  if (sk.kind === 'talent' || !sk.spec) return sk.req || 1;
  if (spec !== '*' && spec !== sk.spec) return Infinity;
  return Math.max(sk.req || 1, R.specAt);
};
// `needs` (de la opción o del nodo) manda sobre lo que toca
const needsOf = (node, k) => (k ? node.opts.find(o => o.k === k)?.needs : null) || node.needs || null;
const learnIds = (classId, node, k) => needsOf(node, k) || T.nodeTouches(classId, node, k).ids;
const expectAt = (classId, node, k, spec) => {
  const ats = learnIds(classId, node, k).map(id => knownAt(classId, id, spec)).filter(v => v != null);
  return ats.length ? Math.min(...ats) : null;
};
let nLearn = 0;
for (const classId of CLASS_IDS) {
  for (const tree of levelTrees(classId)) {
    const spec = tree.spec || '*';
    for (const n of tree.nodes) {
      if (n.free) { assert.equal(T.nodeLearn(n), null, `${classId}/${n.id}: el nodo clave gratis no tiene learnAt`); continue; }
      if (n.t === 'c') {
        const per = n.opts.map(o => expectAt(classId, n, o.k, spec));
        n.opts.forEach((o, i) => assert.equal(T.learnAt(n, o.k), per[i], `${classId}/${n.id}${o.k}: learnAt de la opción`));
        assert.equal(T.learnAt(n), per.includes(null) ? null : Math.min(...per), `${classId}/${n.id}: una elección vale si alguna opción vale`);
      } else assert.equal(T.learnAt(n), expectAt(classId, n, null, spec), `${classId}/${n.id}: learnAt`);
      const l = T.nodeLearn(n);
      if (l) {
        assert.equal(l.name, skillName(classId, l.skill), `${classId}/${n.id}: nombre de la habilidad`);
        assert.ok(T.nodeTouches(classId, n).ids.includes(l.skill), `${classId}/${n.id}: la habilidad sale de lo que toca`);        nLearn++;
      }
      // el árbol de clase no puede depender de la especialización (cambiarla no rompe la clase)
      if (tree.which === 'cls') {
        for (const s of T.talentTreesFor(classId).specs) {
          const a = T.learnOfNode(classId, n, s.id), b = T.learnOfNode(classId, n, '*');
          const sig = x => JSON.stringify([x.node?.at ?? null, Object.values(x.opts).map(o => o?.at ?? null)]);
          if (sig(a) !== sig(b)) debt(classId, 'clase-segun-espec', 'clase', null, `${nodeLabel(n)}: con ${s.name} se abre a otro nivel (solo toca habilidades de otras especializaciones)`);
        }
      }
    }
  }
}
assert.ok(nLearn > 50, `hay nodos con nivel de aprendizaje (${nLearn})`);
assert.equal(T.learnFail(T.TALENT_TREES.maga.cls.nodes[0], undefined), null, 'sin nivel no se mira');
assert.ok(TALENT_REASONS.includes('learn'), 'motivo propio en ops');
console.log(`0) learnAt de ${nLearn} nodos = la primera habilidad que conoces de las que tocan ✓`);

// ------------------------------------------------ 0b) `needs`: la habilidad que de verdad dispara el efecto
// manda sobre touch. Cada needs elige entre lo que el nodo toca y CAMBIA el nivel (si no, sobra). Los
// casos de D1 (touch daba un nivel falso) quedan con la habilidad que los dispara
const NEEDS_EXPECT = {
  guerrero: { d12: 'terremoto', d5: 'terremoto', z5: 'g_martillo' },
  arquera: { v6: 'a_v_carrera', f6: 'a_f_rodilla' },
};
let nNeeds = 0;
for (const classId of CLASS_IDS) {
  for (const tree of levelTrees(classId)) {
    const spec = tree.spec || '*';
    for (const n of tree.nodes) {
      for (const k of [null, ...(n.opts || []).map(o => o.k)]) {
        const needs = k ? n.opts.find(o => o.k === k).needs : n.needs;
        if (needs == null) continue;
        const at = `${classId}/${n.id}${k || ''}`;
        assert.ok(Array.isArray(needs) && needs.length > 0, `${at}: needs es una lista de habilidades`);
        const touches = T.nodeTouches(classId, n, k).ids;
        for (const id of needs) assert.ok(touches.includes(id), `${at}: needs «${id}» no está entre lo que toca (${touches})`);
        const byTouch = Math.min(...touches.map(id => knownAt(classId, id, spec)).filter(v => v != null));
        assert.notEqual(expectAt(classId, n, k, spec), byTouch, `${at}: needs no cambia el nivel (Nv${byTouch}): sobra`);
        nNeeds++;
      }
    }
  }
}
for (const [classId, want] of Object.entries(NEEDS_EXPECT)) {
  for (const [id, skill] of Object.entries(want)) {
    const n = levelTrees(classId).flatMap(t => t.nodes).find(x => x.id === id);
    assert.equal(T.nodeLearn(n)?.skill, skill, `${classId}/${id}: se abre con ${skillName(classId, skill)}`);
  }
}
// semántica en el motor (nodos sintéticos): needs manda sobre touch, el de la opción sobre el del nodo
const synP = { id: 'zz1', t: 'p', touch: ['g_tajo', 'terremoto'] };
assert.equal(T.learnOfNode('guerrero', synP, 'guardian').node.skill, 'g_tajo', 'sin needs: la primera que conoces');
assert.equal(T.learnOfNode('guerrero', { ...synP, needs: ['terremoto'] }, 'guardian').node.at, 14, 'con needs: el Terremoto (Nv14)');
assert.equal(T.learnOfNode('guerrero', { ...synP, needs: ['g_martillo'] }, 'guardian').node.at, Infinity, 'needs de otra especialización: nunca');
const synC = T.learnOfNode('guerrero', { id: 'zz2', t: 'c', touch: ['g_tajo', 'terremoto'], needs: ['terremoto'],
  opts: [{ k: 'A' }, { k: 'B', needs: ['g_tajo'] }] }, 'guardian');
assert.deepEqual([synC.opts.A.skill, synC.opts.B.skill, synC.node.at], ['terremoto', 'g_tajo', 1], 'la opción sin needs usa el del nodo; la elección vale con la que ya sirve');
assert.ok(nNeeds >= 20, `nodos con needs (${nNeeds})`);
console.log(`0b) needs en ${nNeeds} nodos u opciones: elige entre lo que tocan y cambia su nivel ✓`);

// ------------------------------------------------ a) nunca por debajo de su learnAt
let realCases = 0, pathCases = 0, optCases = 0, viewCases = 0;
for (const classId of CLASS_IDS) {
  for (const tree of levelTrees(classId)) {
    const first = firstLevel(tree);
    for (const n of tree.nodes) {
      if (n.free) continue;
      const nl = T.nodeLearn(n);
      const opts = n.t === 'c' ? n.opts.map(o => ({ k: o.k, l: T.nodeLearn(n, o.k) })) : [];
      const top = Math.max(nl?.at ?? 0, ...opts.map(o => o.l?.at ?? 0));
      if (!top) continue;
      // a1) con el camino más barato hasta el nodo y los puntos de ese nivel: canAddRank y addRank reales
      for (let L = first; L < Math.min(top, T.LEVEL_MAX + 1); L++) {
        const path = pathTo(tree, n, L);
        if (!path || spentOf(tree, path) > earned(tree, L) - 1) continue;
        const p = heroFor(tree, L, path);
        if (nl && L < nl.at) {
          assert.equal(T.canAddRank(p, tree.which, n.id), false, `${classId}/${n.id} Nv${L}: no se toma antes de Nv${nl.at}`);
          const r = OPS.addRank(copyHero(p), tree.which, n.id);
          assert.equal(r.reason, 'learn', `${classId}/${n.id} Nv${L}: motivo learn (${r.text})`);
          assert.equal(r.text, learnText(nl), `${classId}/${n.id}: «${learnText(nl)}»`);
          realCases++;
        } else {
          for (const o of opts) {
            if (!o.l || L >= o.l.at) continue;
            assert.equal(T.canAddRank(p, tree.which, n.id, o.k), false, `${classId}/${n.id}${o.k} Nv${L}: la opción no se toma antes de Nv${o.l.at}`);
            const r = OPS.addRank(copyHero(p), tree.which, n.id, o.k);
            assert.equal(r.reason, 'learn', `${classId}/${n.id}${o.k} Nv${L}: motivo learn`);
            const q = copyHero(p), ok = OPS.addRank(q, tree.which, n.id);
            assert.ok(ok.ok, `${classId}/${n.id} Nv${L}: sin opción, toma la que ya sirve`);
            assert.equal(T.learnFail(n, L, q.talents.choice[n.id]), null, `${classId}/${n.id} Nv${L}: la opción elegida ya sirve`);
            realCases++;
          }
        }
      }
      // a2) con el camino completo (puertas y padres listos): el motivo es solo el nivel
      const full = pathTo(tree, n, T.LEVEL_MAX);
      if (full && nl && nl.at >= 2 && nl.at <= T.LEVEL_MAX) {
        assert.equal(T.gateFail(tree, full, n, nl.at - 1), learnText(nl), `${classId}/${n.id}: motivo a Nv${nl.at - 1}`);
        assert.equal(T.gateFail(tree, full, n, nl.at), null, `${classId}/${n.id}: abierto a Nv${nl.at}`);
        // con un camino que ya vale a su nivel (si los padres se conocen antes): legal justo desde ahí
        const at = pathTo(tree, n, nl.at);
        if (at) {
          assert.equal(T.validRanks(tree, { ...at, [n.id]: 1 }, nl.at - 1), false, `${classId}/${n.id}: rangos ilegales a Nv${nl.at - 1}`);
          assert.equal(T.validRanks(tree, { ...at, [n.id]: 1 }, nl.at), true, `${classId}/${n.id}: legal a Nv${nl.at}`);
        }
        pathCases++;
        // vista: el nodo va en gris (como tras una puerta) con su motivo (la especialización, activa)
        if (tree.which === 'cls' || nl.at - 1 >= R.specAt) {
          const p = heroFor(tree, nl.at - 1, full);
          const v = talentsView(p).trees[tree.which].nodes.find(x => x.id === n.id);
          assert.equal(v.state, 'locked', `${classId}/${n.id}: en gris a Nv${nl.at - 1}`);
          assert.equal(v.learn, learnText(nl)); assert.equal(v.learnAt, nl.at);
          const tt = nodeTooltip(p, tree.which, n.id);
          assert.equal(tt.status, learnText(nl), `${classId}/${n.id}: el tooltip dice el motivo`); assert.equal(tt.statusKind, 'lk');
          viewCases++;
        }
      }
      for (const o of opts) {
        if (!o.l || o.l.at <= Math.max(1, nl?.at ?? 0) || o.l.at > T.LEVEL_MAX) continue;
        const L = o.l.at - 1;
        assert.equal(T.learnFail(n, L, o.k), learnText(o.l), `${classId}/${n.id}${o.k}: motivo de la opción`);
        assert.notEqual(T.openChoice(n, o.k, L), o.k, `${classId}/${n.id}${o.k}: a Nv${L} no se elige`);
        assert.equal(T.openChoice(n, o.k, o.l.at), o.k, `${classId}/${n.id}${o.k}: a Nv${o.l.at} sí`);
        const fc = T.fixChoices([n], { [n.id]: 1 }, { [n.id]: o.k }, L);
        assert.deepEqual(fc.switched, [n.id], `${classId}/${n.id}${o.k}: una elección guardada pasa a la otra`);
        assert.equal(T.learnFail(n, L, fc.choice[n.id]), null);
        // ops y vista con el nodo listo (aunque falten puntos): elegir la opción bloqueada no se permite
        if (full) {
          const p = heroFor(tree, L, { ...full, [n.id]: 1 }, { [n.id]: fc.choice[n.id] });
          const r = OPS.setChoice(copyHero(p), tree.which, n.id, o.k);
          assert.equal(r.reason, 'learn', `${classId}/${n.id}${o.k}: setChoice bloqueado`); assert.equal(r.text, learnText(o.l));
          const tt = nodeTooltip(p, tree.which, n.id);
          assert.equal(tt.opts.find(x => x.k === o.k).lock, learnText(o.l), `${classId}/${n.id}${o.k}: la opción lleva su candado`);
          assert.equal(tt.opts.find(x => x.k !== o.k).lock, null);
          viewCases++;
        }
        optCases++;
      }
    }
  }
}
assert.ok(pathCases > 20 && optCases > 0 && viewCases > 20, `casos: ${pathCases} nodos y ${optCases} opciones`);
console.log(`a) bloqueo por nivel: ${realCases} casos con puntos reales, ${pathCases} con el camino completo, ${optCases} opciones, vista ✓`);

// ------------------------------------------------ b) sin puntos muertos (y barrido de canAddRank)
let swept = 0;
for (const classId of CLASS_IDS) {
  for (const tree of levelTrees(classId)) {
    let p = null;
    for (let L = 1; L <= T.LEVEL_MAX; L++) {
      // barrido (hasta el Nv40; luego ya se conoce todo): antes de cada punto, lo que canAddRank deja
      // y lo que ya tiene el héroe valen a este nivel
      const sweep = L > 40 ? null : q => {
        const ranks = T.ranksOf(q, tree.which), ch = T.choicesOf(q, tree.which);
        for (const n of tree.nodes) {
          if (n.free) continue;
          if ((ranks[n.id] | 0) > 0) {
            assert.ok((T.learnAt(n) ?? 0) <= L, `${classId}/${n.id}: con rango a Nv${L} antes de su learnAt`);
            if (n.t === 'c') assert.equal(T.learnFail(n, L, ch[n.id]), null, `${classId}/${n.id}: opción elegida a Nv${L}`);
          }
          if (T.canAddRank(q, tree.which, n.id)) { assert.ok((T.learnAt(n) ?? 0) <= L, `${classId}/${n.id}: tomable a Nv${L}`); swept++; }
          for (const o of n.opts || []) if (T.canAddRank(q, tree.which, n.id, o.k)) assert.ok((T.learnAt(n, o.k) ?? 0) <= L, `${classId}/${n.id}${o.k}: opción a Nv${L}`);
        }
      };
      const r = greedyFill(tree, L, p, sweep);
      p = r.p;
      if (r.left > 0) debt(classId, 'puntos-muertos', tree.key, L, `${r.left} de ${earned(tree, L)} puntos sin nodo que tomar`);
    }
  }
}
assert.ok(swept > 100, `barrido con casos (${swept})`);
console.log(`b) puntos tomables nivel a nivel (1–100) y barrido de canAddRank (${swept} casos) ✓`);

// ------------------------------------------------ c) elección real al empezar
for (const classId of CLASS_IDS) {
  for (const tree of levelTrees(classId)) {
    const nodes = tree.nodes.filter(n => !n.free).sort(rowOrder);
    const take = new Map(nodes.map(n => [n, takeLevel(tree, n)]));
    const buy = new Map(nodes.map(n => [n, buyLevel(tree, n)]));
    for (let L = firstLevel(tree); L <= 25; L++) {
      const offered = nodes.filter(n => take.get(n) != null && take.get(n) <= L);
      if (offered.length >= 2) continue;
      const waiting = nodes.filter(n => buy.get(n) != null && buy.get(n) <= L && (T.learnAt(n) ?? 0) > L)
        .map(n => { const l = T.nodeLearn(n); return `${nodeLabel(n)} (${l.name}, Nv${l.at})`; });
      const k = offered.length;
      debt(classId, 'eleccion', tree.key, L, `solo ${k} nodo${k === 1 ? '' : 's'} tomable${k === 1 ? '' : 's'}${k ? `: ${offered.map(nodeLabel).join(', ')}` : ''}`
        + (waiting.length ? ` · por aprender: ${waiting.join(', ')}` : ''));
    }
  }
}
console.log('c) elección real en Nv10–25 calculada ✓');

// ------------------------------------------------ d) builds: legales y sin puntos muertos
let builds = 0;
for (const classId of CLASS_IDS) {
  const clsNodes = T.TALENT_TREES[classId].cls.nodes;
  for (const { key, build } of T.buildsFor(classId)) {
    const s = T.findSpec(classId, build.sp);
    for (let L = R.specAt; L <= T.LEVEL_MAX; L++) {
      const r = T.buildRanks({ classId, level: L, talents: { v: 2, spec: s.id } }, build, { level: L });
      const sp = r.sp[s.id];
      assert.ok(T.validRanks({ nodes: clsNodes, gates: T.CLASS_GATES }, r.cls, L), `${classId}/${key} Nv${L}: clase legal`);
      assert.ok(T.validRanks({ nodes: s.nodes, gates: T.SPEC_GATES }, sp, L), `${classId}/${key} Nv${L}: especialización legal`);
      for (const n of [...clsNodes, ...s.nodes]) {
        if (n.t === 'c' && ((r.cls[n.id] | 0) > 0 || (sp[n.id] | 0) > 0)) assert.equal(T.learnFail(n, L, r.choice[n.id] || n.opts[0].k), null, `${classId}/${key}/${n.id} Nv${L}: opción que ya sirve`);
      }
      const sc = T.spentIn({ nodes: clsNodes }, r.cls), ss = T.spentIn({ nodes: s.nodes }, sp);
      if (sc !== T.earnedAt('cls', L)) debt(classId, 'build', 'clase', L, `build «${key}» gasta ${sc} de ${T.earnedAt('cls', L)}`);
      if (ss !== T.earnedAt('spec', L)) debt(classId, 'build', s.id, L, `build «${key}» gasta ${ss} de ${T.earnedAt('spec', L)}`);
    }
    builds++;
  }
}
assert.ok(builds >= 9, `builds (${builds})`);
console.log(`d) ${builds} builds legales nivel a nivel (10–100) ✓`);

// ------------------------------------------------ e) recorte fino
{
  // e1) propiedad sobre estados al azar (semilla fija): subconjunto, legal, en presupuesto, de abajo
  // arriba y sin quitar de más (lo que se quita o no vale o no cabe)
  let seed = 12345;
  const rnd = () => ((seed = (Math.imul(seed, 1103515245) + 12345) >>> 0) / 2 ** 32);
  let checked = 0;
  for (const classId of CLASS_IDS) {
    for (const tree of levelTrees(classId)) {
      for (let i = 0; i < 12; i++) {
        // estado legal al Nv100 con 15–34 rangos al azar, recortado a un nivel menor
        const p = heroFor(tree, T.LEVEL_MAX);
        const want = 15 + Math.floor(rnd() * 20);
        for (let k = 0; k < want; k++) {
          const ok = tree.nodes.filter(n => T.canAddRank(p, tree.which, n.id));
          if (!ok.length) break;
          OPS.addRank(p, tree.which, ok[Math.floor(rnd() * ok.length)].id);
        }
        const orig = { ...T.ranksOf(p, tree.which) };
        const L = firstLevel(tree) + Math.floor(rnd() * 40);
        const budget = earned(tree, L);
        const { ranks: got, changed } = T.trimRanks(tree.nodes, tree.gates, orig, budget, L);
        assert.ok(T.validRanks(tree, got, L), `${classId}/${tree.key} Nv${L}: legal`);
        assert.ok(spentOf(tree, got) <= budget, 'en presupuesto');
        for (const [id, r] of Object.entries(got)) assert.ok(r <= (orig[id] | 0), `${id}: no añade`);
        assert.equal(changed, Object.keys(orig).some(id => (got[id] | 0) !== orig[id]), 'changed = cambió algo');
        const full = spentOf(tree, got) === budget;
        const cut = tree.nodes.filter(n => (got[n.id] | 0) < (orig[n.id] | 0));
        for (const n of cut) {
          const back = { ...got, [n.id]: (got[n.id] | 0) + 1 };
          const fits = T.validRanks(tree, back, L);
          // lo que vale y cabe no se quita; lo quitado por presupuesto va de abajo arriba
          assert.ok(!fits || full, `${classId}/${tree.key}/${n.id} Nv${L}: se quitó sin motivo`);
          if (fits) for (const m of tree.nodes) if ((got[m.id] | 0) > 0 && rowOrder(m, n) > 0) assert.fail(`${classId}/${tree.key} Nv${L}: queda ${m.id} por debajo de ${n.id}, recortado por presupuesto`);
        }
        // idempotente: recortar lo recortado no cambia nada
        assert.deepEqual(T.trimRanks(tree.nodes, tree.gates, got, budget, L), { ranks: got, changed: false });
        checked++;
      }
    }
  }
  console.log(`e1) recorte fino: ${checked} estados al azar (legal, en presupuesto, de abajo arriba, sin quitar de más) ✓`);

  // e2) normalizeTalents: quita solo lo que no vale (un nodo que el nivel aún no deja) y anota el árbol
  let e2 = 0;
  for (const classId of CLASS_IDS) {
    for (const tree of levelTrees(classId).filter(t => t.which === 'spec')) {
      // el primero (por filas) que el nivel aún no deja y cuelga de nodos que a ese nivel ya valen
      const pathBefore = x => pathTo(tree, x, T.learnAt(x) - 1) || {};
      const n = tree.nodes.filter(x => !x.free && (T.learnAt(x) ?? 0) > R.specAt && spentOf(tree, pathBefore(x)) > 0).sort(rowOrder)[0];
      if (!n) continue;
      const full = pathBefore(n);
      const L = T.learnAt(n) - 1;
      const raw = { v: 2, spec: tree.spec, sp: { [tree.spec]: { ...full, [n.id]: 1 } } };
      const t = T.normalizeTalents(JSON.parse(JSON.stringify(raw)), classId, L);
      const got = t.sp[tree.spec];
      assert.equal(got[n.id], undefined, `${classId}/${n.id}: fuera a Nv${L}`);
      assert.ok(T.validRanks(tree, got, L) && spentOf(tree, got) <= earned(tree, L));
      assert.deepEqual(got, T.trimRanks(tree.nodes, tree.gates, { ...full, [n.id]: 1 }, earned(tree, L), L).ranks, 'normalizeTalents = trimRanks');
      assert.ok(Object.keys(got).length > 0, `${classId}/${tree.key}: el resto se queda (no se vacía el árbol)`);
      assert.deepEqual(T.talentsTrimmed(t), [`sp.${tree.spec}`], 'árbol anotado → aviso talentos-recortados');
      const again = T.normalizeTalents(JSON.parse(JSON.stringify(t)), classId, L);
      assert.deepEqual(T.talentsTrimmed(again), [], 'normalizar lo normalizado no recorta');
      // un nivel más tarde (con los puntos de ese nivel) el nodo ya vale: el recorte solo mira lo que falta
      const later = T.normalizeTalents({ v: 2, spec: tree.spec, sp: { [tree.spec]: { ...full, [n.id]: 1 } } }, classId, T.LEVEL_MAX);
      assert.equal(later.sp[tree.spec][n.id], 1);
      e2++;
    }
  }
  assert.ok(e2 > 0, 'hay casos de recorte por nivel');
  // e3) elección con rango que el nivel aún no deja: pasa a la otra (fixChoices; normalizeTalents la usa)
  let e3 = 0;
  for (const classId of CLASS_IDS) {
    const t = T.TALENT_TREES[classId];
    const n = t.cls.nodes.find(x => x.t === 'c' && x.opts.some(o => (T.learnAt(x, o.k) ?? 0) > (T.learnAt(x) ?? 0)));
    if (!n) continue;
    const o = n.opts.find(x => (T.learnAt(n, x.k) ?? 0) > (T.learnAt(n) ?? 0));
    const raw = { v: 2, cls: { [n.id]: 1 }, choice: { [n.id]: o.k } };
    const at = T.learnAt(n, o.k);
    const norm = T.normalizeTalents(JSON.parse(JSON.stringify(raw)), classId);       // sin nivel: no se toca
    assert.equal(norm.choice[n.id], o.k);
    const fc = T.fixChoices(t.cls.nodes, raw.cls, raw.choice, at - 1);
    assert.notEqual(fc.choice[n.id], o.k, `${classId}/${n.id}: a Nv${at - 1} la opción ${o.k} pasa a la otra`);
    assert.deepEqual(T.fixChoices(t.cls.nodes, raw.cls, raw.choice, at).switched, [], `a Nv${at} se queda`);
    assert.deepEqual(T.fixChoices(t.cls.nodes, {}, raw.choice, at - 1).switched, [], 'sin rango solo es preferencia');
    e3++;
  }
  assert.ok(e3 > 0, 'hay elecciones con una opción de más nivel');
  // e4) los 57 guardados v4 reales (test-fixtures-v4) migran y cargan sin recorte, legales a su nivel
  const REAL = JSON.parse(readFileSync(new URL('./fixtures/saves-v4-paso2.json', import.meta.url), 'utf8'));
  let saves = 0;
  for (const [name, s] of Object.entries(REAL)) {
    if (name.startsWith('_')) continue;
    const v5 = migrateSave(s);
    const L = v5.level, classId = v5.classId;
    const t = T.normalizeTalents(v5.talents, classId, L);
    assert.deepEqual(T.talentsTrimmed(t), [], `${name}: carga sin recorte`);
    const trees = levelTrees(classId);
    const cls = trees[0];
    assert.ok(T.validRanks(cls, t.cls, L) && spentOf(cls, t.cls) <= earned(cls, L), `${name}: clase legal a Nv${L}`);
    if (t.spec) {
      const st = trees.find(x => x.spec === t.spec);
      assert.ok(T.validRanks(st, t.sp[t.spec], L) && spentOf(st, t.sp[t.spec]) <= earned(st, L), `${name}: especialización legal a Nv${L}`);
    }
    saves++;
  }
  assert.equal(saves, 57, 'los 57 guardados v4');
  console.log(`e) normalizeTalents recorta fino (${e2} casos por nivel), elecciones a la otra opción y ${saves} guardados v4 cargan ✓`);
}

// ------------------------------------------------ f) escenario de reorden: una elección con una opción
// de más nivel sube a la primera fila (como puede quedar tras reordenar). Con los datos de hoy esas
// opciones se compran justo a su nivel; aquí se prueba qué pasa cuando no
{
  let f = 0;
  for (const classId of CLASS_IDS) {
    const t = T.TALENT_TREES[classId];
    const n = t.cls.nodes.find(x => x.t === 'c' && x.opts.some(o => (T.learnAt(x, o.k) ?? 0) > Math.max(R.specAt + 1, T.learnAt(x) ?? 0)));
    if (!n) continue;
    const o = n.opts.find(x => (T.learnAt(n, x.k) ?? 0) > Math.max(R.specAt + 1, T.learnAt(n) ?? 0));
    const at = T.learnAt(n, o.k), L = R.specAt + 1;
    const keep = { r: n.r, c: n.c, req: n.req };
    try {
      Object.assign(n, { r: 0, c: 0, req: [] });
      const tree = levelTrees(classId)[0];
      // ops: el nodo se toma con la opción que ya sirve; la otra, con su motivo
      const p = heroFor(tree, L);
      assert.equal(T.canAddRank(p, 'cls', n.id), true, `${classId}/${n.id}: el nodo se toma a Nv${L}`);
      assert.equal(T.canAddRank(p, 'cls', n.id, o.k), false, `${classId}/${n.id}${o.k}: la opción no`);
      const lk = OPS.addRank(copyHero(p), 'cls', n.id, o.k);
      assert.equal(lk.reason, 'learn'); assert.equal(lk.text, learnText(T.nodeLearn(n, o.k)));
      const tt0 = nodeTooltip(p, 'cls', n.id);
      assert.equal(tt0.opts.find(x => x.k === o.k).lock, learnText(T.nodeLearn(n, o.k)), 'el flotante la marca');
      assert.match(tt0.status, /\(la otra aún no\)/, 'el estado dice qué opción se puede elegir');
      assert.ok(OPS.addRank(p, 'cls', n.id).ok);
      assert.notEqual(T.choicesOf(p, 'cls')[n.id], o.k, 'sin opción: la que ya sirve');
      assert.equal(OPS.toggleChoice(p, 'cls', n.id).reason, 'learn', 'alternar no lleva a la bloqueada');
      // guardado: la elección bloqueada pasa a la otra y el árbol queda anotado
      const raw = { v: 2, cls: { [n.id]: 1 }, choice: { [n.id]: o.k } };
      const norm = T.normalizeTalents(JSON.parse(JSON.stringify(raw)), classId, L);
      assert.equal(norm.cls[n.id], 1, 'el nodo se queda');
      assert.notEqual(norm.choice[n.id], o.k, 'la elección pasa a la otra');
      assert.deepEqual(T.talentsTrimmed(norm), ['cls']);
      assert.deepEqual(T.talentsTrimmed(T.normalizeTalents(JSON.parse(JSON.stringify(raw)), classId, at)), [], `a Nv${at} ya vale`);
      // build: la elección de la build que el nivel aún no deja pasa a la otra; a su nivel, la suya
      const build = { sp: t.specs[0].id, cls: { [n.id]: 1 }, clsCh: { [n.id]: o.k }, spec: {}, specCh: {}, heroNodes: [] };
      const b1 = T.buildRanks({ classId, level: L }, build, { level: L });
      assert.equal(b1.cls[n.id], 1); assert.notEqual(b1.choice[n.id], o.k, `build a Nv${L}: la otra opción`);
      assert.equal(T.buildRanks({ classId, level: at }, build, { level: at }).choice[n.id], o.k, `build a Nv${at}: la suya`);
      // código: se importa y la elección pasa a la otra (cuenta como recorte)
      const src = heroFor(tree, at, { [n.id]: 1 }, { [n.id]: o.k });
      const code = OPS.exportCode(src);
      const dst = heroFor(tree, L);
      const imp = OPS.importCode(dst, code);
      assert.ok(imp.ok, imp.text); assert.equal(imp.trimmed, true, 'importado con la otra opción');
      assert.equal(dst.talents.cls[n.id], 1); assert.notEqual(dst.talents.choice[n.id], o.k);
      f++;
    } finally { Object.assign(n, keep); }
  }
  assert.ok(f > 0, 'escenario con alguna clase');
  console.log(`f) escenario de reorden (${f} clases): opción bloqueada en ops, flotante, guardado, build y código ✓`);
}

// ------------------------------------------------ pendientes de datos por clase
const key = e => JSON.stringify([e.regla, e.arbol, e.nivel ?? -1, e.motivo]);
const sortE = list => [...list].sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0));
let bad = 0;
for (const classId of CLASS_IDS) {
  const file = new URL(`pending-${classId}.json`, PENDING_DIR);
  const now = sortE(found[classId]);
  if (WRITE) {
    mkdirSync(PENDING_DIR, { recursive: true });
    writeFileSync(file, JSON.stringify({
      nota: 'Deudas de DATOS del nivel de aprendizaje (tests/test-talentos-nivel.mjs). La suite pasa solo si esta lista coincide EXACTAMENTE con lo que falla. Reordenar nodos las vacía.',
      pendientes: now,
    }, null, 2) + '\n');
    console.log(`✍️  ${classId}: ${now.length} pendientes escritos`);
    continue;
  }
  let saved;
  try { saved = JSON.parse(readFileSync(file, 'utf8')).pendientes; } catch { saved = null; }
  assert.ok(Array.isArray(saved), `falta tests/talentos-nivel/pending-${classId}.json`);
  const a = new Set(now.map(key)), b = new Set(saved.map(key));
  const nuevos = now.filter(e => !b.has(key(e))), resueltos = saved.filter(e => !a.has(key(e)));
  if (nuevos.length || resueltos.length) {
    bad++;
    console.error(`❌ ${classId}: lo que falla no coincide con pending-${classId}.json`);
    for (const e of nuevos) console.error(`   + falla y no está: ${e.regla} · ${e.arbol} · Nv${e.nivel ?? '—'} · ${e.motivo}`);
    for (const e of resueltos) console.error(`   − ya no falla (quítalo): ${e.regla} · ${e.arbol} · Nv${e.nivel ?? '—'} · ${e.motivo}`);
  } else console.log(`${classId}: ${now.length} pendientes de datos (= pending-${classId}.json)${now.length ? ` · ${[...new Set(now.map(e => `${e.regla}/${e.arbol}`))].join(', ')}` : ''}`);
}
assert.equal(bad, 0, 'los pendientes de datos tienen que coincidir exactamente (o vaciarse)');
console.log('Nivel de aprendizaje de los talentos ✓');
