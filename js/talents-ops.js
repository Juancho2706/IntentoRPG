// ============================================================
// TALENTOS · operaciones (mutaciones puras sobre p.talents)
// ============================================================
// Complemento de js/talents.js (que solo CONSULTA: puntos, puertas, requisitos,
// presets). Aquí viven las MUTACIONES que necesita el panel (js/ui-talents.js):
// sumar/restar rango, elegir opción A/B, reiniciar, build recomendada, elegir
// especialización y exportar/importar el código de build. Módulo PURO (sin DOM).
//
// No importa talents.js: recibe su API por inyección, para que el panel y los
// tests no dependan de los imports de talents-<clase>.js:
//
//   import * as Talents from './talents.js';
//   const ops = createTalentOps(Talents);
//   ops.addRank(p, 'spec', 's1')   // → { ok:true } | { ok:false, reason:'…' }
//
// Ninguna operación llama a recompute() ni guarda: quien la invoca (el panel →
// onChange(p) → el juego) hace player.recompute() y el guardado.
//
// CÓDIGO DE BUILD:  IRPG1-<clase>-<spec|x>-<clase>-<spec>-<chk>
//   · un carácter base36 por nodo NO gratuito, en el orden del array `nodes`;
//     en los nodos de elección le sigue la opción (A/B) si tiene rango;
//   · <chk> = 2 caracteres de suma de verificación de todo lo anterior.
//   p. ej.  IRPG1-guerrero-berserker-21101B22030220-3210101A21010200000-k7
export const CODE_VERSION = 'IRPG1';

const B36 = '0123456789abcdefghijklmnopqrstuvwxyz';
const NAMES = { guerrero: 'Guerrero', maga: 'Maga', arquera: 'Arquera' };
const className = (id) => NAMES[id] || id;

// suma de verificación corta (FNV-1a de 32 bits → 2 caracteres base36)
export function codeChecksum(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return B36[h % 36] + B36[Math.floor(h / 36) % 36];
}

export function createTalentOps(T) {
  if (!T || typeof T.treeOf !== 'function') throw new Error('createTalentOps: falta la API de talents.js');

  // Los nodos gratis (clave s0) se guardan con su rango máximo en los rangos de
  // la especialización: talents.reqFail() mira `ranks[id]` y sin esto s1/s2
  // (req s0) nunca se podrían aprender. spentIn() no los cuenta, canAddRank y
  // canRemoveRank los ignoran y aggregateTalents ya los trata como rango 1.
  const seedFree = (nodes, ranks) => { for (const n of nodes) if (n.free) ranks[n.id] = n.max; return ranks; };
  const ensure = (p) => {
    if (!p.talents || typeof p.talents !== 'object') p.talents = T.normalizeTalents(null, p.classId);
    const t = p.talents;
    t.cls ||= {}; t.sp ||= {}; t.choice ||= {};
    const s = t.spec && T.findSpec(p.classId, t.spec);
    if (s) seedFree(s.nodes, t.sp[s.id] ||= {});
    return t;
  };
  const treeName = (which) => (which === 'cls' ? 'clase' : 'especialización');
  const nodeName = (tree, id) => T.nodeById(tree, id)?.name || id;

  // talentos asignados que dejarían de ser válidos con estos rangos
  function brokenBy(tree, ranks, level) {
    return tree.nodes.filter(n => !n.free && (ranks[n.id] | 0) > 0 &&
      (T.gateFail(tree, ranks, n, level) || T.reqFail(tree, ranks, n)));
  }

  // estado de un nodo para la UI (no muta nada salvo crear p.talents si falta)
  function nodeState(p, which, node, tree = T.treeOf(p, which)) {
    ensure(p);
    const ranks = T.ranksOf(p, which);
    const r = node.free ? 1 : (ranks[node.id] | 0);
    const gate = node.free ? null : T.gateFail(tree, ranks, node, p.level | 0);
    const req = node.free ? null : T.reqFail(tree, ranks, node);
    const left = T.talentPointsLeft(p, which);
    const maxed = r >= node.max;
    const open = !gate && !req;
    const canAdd = !node.free && !maxed && open && left > 0;
    const canRemove = !node.free && r > 0 && T.canRemoveRank(p, which, node.id);
    let state;
    if (node.free) state = 'free';
    else if (maxed) state = 'max';
    else if (r > 0) state = 'partial';
    else if (canAdd) state = 'available';
    else if (open) state = 'open';      // desbloqueado pero sin puntos libres
    else state = 'locked';
    let removeBlock = null;
    if (!node.free && r > 0 && !canRemove) {
      const broken = brokenBy(tree, { ...ranks, [node.id]: r - 1 }, p.level | 0).filter(n => n.id !== node.id);
      const names = broken.length > 2 ? `${broken[0].name}, ${broken[1].name} y ${broken.length - 2} más` : broken.map(n => n.name).join(' y ');
      removeBlock = broken.length ? `No puedes quitarlo: ${names} depende${broken.length > 1 ? 'n' : ''} de él` : 'No puedes quitar este rango';
    }
    return { rank: r, max: node.max, state, gate, req, open, maxed, canAdd, canRemove, removeBlock, left,
      choice: node.t === 'c' ? (p.talents.choice[node.id] || null) : null };
  }

  function addRank(p, which, id) {
    ensure(p);
    const tree = T.treeOf(p, which);
    if (!tree) return { ok: false, reason: 'Elige primero una especialización' };
    const node = T.nodeById(tree, id);
    if (!node) return { ok: false, reason: 'Talento desconocido' };
    if (node.free) return { ok: false, reason: 'Concedido al elegir la especialización' };
    const ranks = T.ranksOf(p, which);
    if ((ranks[id] | 0) >= node.max) return { ok: false, reason: 'Ya está al máximo' };
    const gate = T.gateFail(tree, ranks, node, p.level | 0);
    if (gate) return { ok: false, reason: gate };
    const req = T.reqFail(tree, ranks, node);
    if (req) return { ok: false, reason: req };
    if (T.talentPointsLeft(p, which) <= 0) return { ok: false, reason: `No te quedan puntos de ${treeName(which)}` };
    if (!T.canAddRank(p, which, id)) return { ok: false, reason: 'No se puede aprender ahora' };
    ranks[id] = (ranks[id] | 0) + 1;
    if (node.t === 'c' && !p.talents.choice[id]) p.talents.choice[id] = node.opts?.[0]?.k || 'A';
    return { ok: true, rank: ranks[id] };
  }

  function removeRank(p, which, id) {
    ensure(p);
    const tree = T.treeOf(p, which);
    if (!tree) return { ok: false, reason: 'Elige primero una especialización' };
    const node = T.nodeById(tree, id);
    if (!node) return { ok: false, reason: 'Talento desconocido' };
    if (node.free) return { ok: false, reason: 'El nodo clave no se puede quitar' };
    const ranks = T.ranksOf(p, which);
    const r = ranks[id] | 0;
    if (r <= 0) return { ok: false, reason: 'No tiene rangos que quitar' };
    if (!T.canRemoveRank(p, which, id)) return { ok: false, reason: nodeState(p, which, node, tree).removeBlock || 'No puedes quitar este rango' };
    if (r - 1 > 0) ranks[id] = r - 1; else delete ranks[id];
    return { ok: true, rank: r - 1 };
  }

  // elegir la opción A/B de un nodo de elección (no cuesta puntos: regla WoW)
  function setChoice(p, which, id, k) {
    ensure(p);
    const tree = T.treeOf(p, which);
    const node = tree && T.nodeById(tree, id);
    if (!node || node.t !== 'c') return { ok: false, reason: 'No es un nodo de elección' };
    if (!node.opts.some(o => o.k === k)) return { ok: false, reason: 'Opción desconocida' };
    p.talents.choice[id] = k;
    return { ok: true };
  }
  function toggleChoice(p, which, id) {
    const tree = T.treeOf(p, which);
    const node = tree && T.nodeById(tree, id);
    if (!node || node.t !== 'c') return { ok: false, reason: 'No es un nodo de elección' };
    const cur = ensure(p).choice[id] || node.opts[0].k;
    const i = node.opts.findIndex(o => o.k === cur);
    return setChoice(p, which, id, node.opts[(i + 1) % node.opts.length].k);
  }

  function clearChoices(p, tree) { for (const n of tree.nodes) if (n.t === 'c') delete p.talents.choice[n.id]; }
  function setRanks(p, which, ranks) {
    const t = ensure(p);
    if (which === 'cls') t.cls = ranks;
    else if (t.spec) t.sp[t.spec] = seedFree(T.findSpec(p.classId, t.spec).nodes, ranks);
  }

  function resetTree(p, which) {
    ensure(p);
    const tree = T.treeOf(p, which);
    if (!tree) return { ok: false, reason: 'No hay árbol que reiniciar' };
    setRanks(p, which, {});
    clearChoices(p, tree);
    return { ok: true };
  }
  function resetAll(p) {
    const a = resetTree(p, 'cls');
    const b = T.treeOf(p, 'spec') ? resetTree(p, 'spec') : { ok: true };
    return { ok: a.ok && b.ok };
  }

  // build recomendada: rangos de presetRanks() + las elecciones del preset
  // (tercer elemento opcional de cada entrada: ['c5', 1, 'B'])
  function presetList(p, which) {
    const t = T.talentTreesFor(p.classId);
    if (!t) return [];
    if (which === 'cls') return t.cls.preset || [];
    return T.findSpec(p.classId, p.talents?.spec)?.preset || [];
  }
  // = talents.presetRanks() pero partiendo de los nodos gratis ya asignados
  // (si no, el preset de especialización se corta en s1: ver seedFree)
  function presetRanks(p, which, tree) {
    const list = presetList(p, which);
    if (!list.length) return null;
    const ranks = seedFree(tree.nodes, {});
    let left = T.talentPointsEarned(p, which);
    for (const [id, want] of list) {
      const node = T.nodeById(tree, id); if (!node || node.free) continue;
      for (let i = 0; i < want && left > 0; i++) {
        if ((ranks[id] | 0) >= node.max) break;
        if (T.gateFail(tree, ranks, node, p.level | 0) || T.reqFail(tree, ranks, node)) break;
        ranks[id] = (ranks[id] | 0) + 1; left--;
      }
    }
    return ranks;
  }
  function applyPreset(p, which) {
    ensure(p);
    const tree = T.treeOf(p, which);
    if (!tree) return { ok: false, reason: 'Elige primero una especialización' };
    const ranks = presetRanks(p, which, tree);
    if (!ranks) return { ok: false, reason: 'Este árbol no tiene build recomendada' };
    setRanks(p, which, ranks);
    clearChoices(p, tree);
    for (const [id, , k] of presetList(p, which)) {
      const n = T.nodeById(tree, id);
      if (n?.t === 'c') p.talents.choice[id] = k || n.opts[0].k;
    }
    for (const n of tree.nodes) if (n.t === 'c' && (ranks[n.id] | 0) > 0 && !p.talents.choice[n.id]) p.talents.choice[n.id] = n.opts[0].k;
    return { ok: true };
  }
  function applyPresetAll(p) {
    const a = applyPreset(p, 'cls');
    const b = T.treeOf(p, 'spec') ? applyPreset(p, 'spec') : { ok: true };
    return { ok: a.ok && b.ok, reason: a.reason || b.reason };
  }

  // elegir/cambiar especialización. Cada especialización conserva sus propios
  // rangos (p.talents.sp[specId]); cambiar es gratis (fuera de combate: lo
  // decide quien llama, ver canEdit en ui-talents.js).
  function chooseSpec(p, specId) {
    ensure(p);
    if ((p.level | 0) < T.TALENT_START_LEVEL) return { ok: false, reason: `Las especializaciones se desbloquean en el nivel ${T.TALENT_START_LEVEL}` };
    if (!T.findSpec(p.classId, specId)) return { ok: false, reason: 'Especialización desconocida' };
    p.talents.spec = specId;
    seedFree(T.findSpec(p.classId, specId).nodes, p.talents.sp[specId] ||= {});
    return { ok: true };
  }

  // ---------- código de build ----------
  function encodeTree(tree, ranks, choice) {
    let s = '';
    for (const n of tree.nodes) {
      if (n.free) continue;
      const r = Math.max(0, Math.min(35, ranks[n.id] | 0));
      s += B36[r];
      if (n.t === 'c' && r > 0) s += (choice[n.id] || n.opts[0].k).toUpperCase();
    }
    return s;
  }
  function decodeTree(tree, str) {
    const ranks = {}, choice = {};
    let i = 0;
    for (const n of tree.nodes) {
      if (n.free) continue;
      if (i >= str.length) return { error: 'El código no encaja con el árbol actual (le faltan talentos)' };
      const r = B36.indexOf(str[i++]);
      if (r < 0) return { error: 'El código contiene caracteres no válidos' };
      if (r > n.max) return { error: `Rango no válido en «${n.name}» (${r}; máximo ${n.max})` };
      if (r > 0) ranks[n.id] = r;
      if (n.t === 'c' && r > 0) {
        const k = str[i];
        if (k && /[A-Z]/.test(k)) {
          i++;
          if (!n.opts.some(o => o.k === k)) return { error: `Opción «${k}» no válida en «${n.name}»` };
          choice[n.id] = k;
        } else choice[n.id] = n.opts[0].k;
      }
    }
    if (i !== str.length) return { error: 'El código no encaja con el árbol actual (le sobran talentos)' };
    return { ranks, choice };
  }

  function exportCode(p) {
    ensure(p);
    const cls = T.treeOf(p, 'cls');
    if (!cls) return '';
    const spec = T.treeOf(p, 'spec');
    const body = [CODE_VERSION, p.classId, p.talents.spec && spec ? p.talents.spec : 'x',
      encodeTree(cls, p.talents.cls || {}, p.talents.choice),
      spec ? encodeTree(spec, T.ranksOf(p, 'spec'), p.talents.choice) : ''].join('-');
    return body + '-' + codeChecksum(body);
  }

  // analiza un código sin aplicarlo: { ok, classId, specId, cls, spec, choice } | { ok:false, error }
  function parseCode(code) {
    const s = String(code ?? '').trim().replace(/\s+/g, '');
    if (!s) return { ok: false, error: 'Pega un código de build' };
    const parts = s.split('-');
    if (parts[0] !== CODE_VERSION) return { ok: false, error: `Formato no reconocido: el código debe empezar por ${CODE_VERSION}-` };
    if (parts.length !== 6) return { ok: false, error: 'El código está incompleto o dañado' };
    const [, classId, specId, clsStr, specStr, chk] = parts;
    if (codeChecksum(parts.slice(0, 5).join('-')) !== chk) return { ok: false, error: 'El código está dañado (no pasa la verificación). Cópialo de nuevo completo' };
    const t = T.talentTreesFor(classId);
    if (!t) return { ok: false, error: `Clase desconocida en el código: «${classId}»` };
    const clsTree = { nodes: t.cls.nodes };
    const c = decodeTree(clsTree, clsStr);
    if (c.error) return { ok: false, error: c.error };
    let sp = { ranks: {}, choice: {} };
    if (specId !== 'x') {
      const spec = T.findSpec(classId, specId);
      if (!spec) return { ok: false, error: `Especialización desconocida en el código: «${specId}»` };
      sp = decodeTree({ nodes: spec.nodes }, specStr);
      if (sp.error) return { ok: false, error: sp.error };
      seedFree(spec.nodes, sp.ranks);
    } else if (specStr) return { ok: false, error: 'El código está dañado (árbol de especialización sin especialización)' };
    return { ok: true, classId, specId: specId === 'x' ? null : specId, cls: c.ranks, spec: sp.ranks, choice: { ...c.choice, ...sp.choice } };
  }

  // valida unos rangos contra el nivel y los puntos del jugador
  function checkTree(p, which, tree, ranks, label) {
    const earned = T.talentPointsEarned(p, which);
    const spent = T.spentIn(tree, ranks);
    if (spent > earned) return `La build usa ${spent} puntos de ${label} y solo tienes ${earned}`;
    for (const n of tree.nodes) {
      if (n.free || !((ranks[n.id] | 0) > 0)) continue;
      const why = T.gateFail(tree, ranks, n, p.level | 0) || T.reqFail(tree, ranks, n);
      if (why) return `Build no válida en «${n.name}»: ${why}`;
    }
    return null;
  }

  // importa un código y lo aplica al jugador (todo o nada)
  function importCode(p, code) {
    ensure(p);
    const d = parseCode(code);
    if (!d.ok) return d;
    if (d.classId !== p.classId) return { ok: false, error: `Este código es de ${className(d.classId)} y tu personaje es ${className(p.classId)}` };
    const t = T.talentTreesFor(p.classId);
    const clsTree = { nodes: t.cls.nodes, gates: T.CLASS_GATES };
    let err = checkTree(p, 'cls', clsTree, d.cls, 'clase');
    if (err) return { ok: false, error: err };
    if (d.specId) {
      if ((p.level | 0) < T.TALENT_START_LEVEL) return { ok: false, error: `Necesitas nivel ${T.TALENT_START_LEVEL} para usar una especialización` };
      const spec = T.findSpec(p.classId, d.specId);
      err = checkTree(p, 'spec', { nodes: spec.nodes, gates: T.SPEC_GATES }, d.spec, 'especialización');
      if (err) return { ok: false, error: err };
    }
    // aplicar
    const allNodes = [...t.cls.nodes, ...(d.specId ? T.findSpec(p.classId, d.specId).nodes : [])];
    for (const n of allNodes) if (n.t === 'c') delete p.talents.choice[n.id];
    p.talents.cls = d.cls;
    if (d.specId) { p.talents.spec = d.specId; p.talents.sp[d.specId] = d.spec; }
    Object.assign(p.talents.choice, d.choice);
    return { ok: true, specId: d.specId, changedSpec: !!d.specId };
  }

  // habilidades activas que concede cada árbol (para la lista del panel)
  function grantsOf(p, which, tree = T.treeOf(p, which)) {
    if (!tree) return [];
    ensure(p);
    const ranks = T.ranksOf(p, which);
    const out = [];
    for (const n of tree.nodes) {
      const r = n.free ? 1 : (ranks[n.id] | 0);
      if (n.t === 'c') {
        for (const o of n.opts) if (o.active || o.fx?.grant) {
          const pick = p.talents.choice[n.id] || n.opts[0].k;
          out.push({ node: n, opt: o.k, name: o.name, skill: o.fx?.grant || null, learned: r > 0 && pick === o.k, choice: true });
        }
      } else if (n.t === 'a' || n.fx?.grant) {
        out.push({ node: n, opt: null, name: n.name, skill: n.fx?.grant || null, learned: r > 0, choice: false });
      }
    }
    return out;
  }

  return {
    ensure, nodeState, addRank, removeRank, setChoice, toggleChoice,
    resetTree, resetAll, applyPreset, applyPresetAll, chooseSpec,
    exportCode, parseCode, importCode, grantsOf,
  };
}
