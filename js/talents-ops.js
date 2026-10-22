// ============================================================
// TALENTOS · operaciones (mutaciones puras sobre p.talents) — v2 (Paso 2g)
// ============================================================
// Complemento de js/talents.js (que solo CONSULTA: puntos, puertas, requisitos, builds).
// Aquí viven las MUTACIONES que necesitan el panel (js/ui-talents.js) y el mixin
// (js/game-talents.js): sumar/restar rango (clase, especialización y héroe), elegir opción
// A/B, árbol héroe, reiniciar, build recomendada, configuraciones guardadas, deshacer
// (snapshot/restore), especialización y el código de build IRPG2. Módulo PURO (sin DOM).
//
// No importa talents.js: recibe su API por inyección (el panel y los tests no dependen de
// los imports de talents-<clase>.js):
//   import * as Talents from './talents.js';
//   const ops = createTalentOps(Talents);
//   ops.addRank(p, 'spec', 's1')   // → { ok:true, rank } | { ok:false, reason:'gate', text:'…' }
//
// Respuestas: { ok, reason?, text?, … }. `reason` es un código del conjunto CERRADO
// TALENT_REASONS (los de §3.4 más seis que el plan no nombraba: 'free' nodo gratis, 'empty' sin
// rangos que quitar, 'unknown' id o configuración desconocida, 'level' nivel insuficiente,
// 'full' sin hueco de configuración y 'learn' (T0) nodo u opción que solo toca habilidades que
// aún no conoces; test70 vigila que no aparezca otro). `text` es el texto para el jugador (la UI
// puede usar el suyo, traduciendo por código).
// Ninguna operación llama a recompute() ni guarda: lo hace quien la invoca.
//
// CÓDIGO DE BUILD (§3.10):
//   IRPG2-<clase>-<spec|x>-<firma2>-<cls>-<spec>-<árbolHéroe|x>-<héroe>-<chk2>
//   · por nodo NO gratuito, en el orden de los datos, un carácter base36 en minúscula con el
//     rango; tras una elección con rango, su opción A/B en mayúscula. Héroe: 0/1 + A/B.
//   · firma2 = 2 caracteres de treeSignature(clase): otra versión de los árboles → 'code-version'
//   · chk2 = FNV-1a (2 caracteres base36) de todo lo anterior. Un IRPG1-… → 'code-version'.
export const CODE_VERSION = 'IRPG2';
export const CODE_VERSION_OLD = 'IRPG1';
export const LOADOUTS_MAX = 10;
export const LOADOUT_NAME_MAX = 24;
export const TALENT_REASONS = Object.freeze(['combat', 'points', 'gate', 'req', 'max', 'hero-closed', 'no-spec', 'choice',
  'code-version', 'code-class', 'code-check', 'code-illegal', 'free', 'empty', 'unknown', 'level', 'full', 'learn']);

const B36 = '0123456789abcdefghijklmnopqrstuvwxyz';
const NAMES = { guerrero: 'Guerrero', maga: 'Maga', arquera: 'Arquera' };
const className = (id) => NAMES[id] || id;
const TREE_NAME = { cls: 'clase', spec: 'especialización', hero: 'Paragon' };

// suma de verificación corta (FNV-1a de 32 bits → 2 caracteres base36)
export function codeChecksum(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return B36[h % 36] + B36[Math.floor(h / 36) % 36];
}
const fail = (reason, text, extra = {}) => ({ ok: false, reason, text, error: text, ...extra });

export function createTalentOps(T) {
  if (!T || typeof T.treeOf !== 'function') throw new Error('createTalentOps: falta la API de talents.js');
  const specAt = () => T.TALENT_RULES?.specAt ?? 10;

  // p.talents v2 con todas sus partes (lo crea si falta). Los nodos gratis nunca se guardan.
  const ensure = (p) => {
    if (!p.talents || typeof p.talents !== 'object' || p.talents.v !== 2) p.talents = T.normalizeTalents(p.talents ?? null, p.classId);
    const t = p.talents;
    t.cls ||= {}; t.sp ||= {}; t.choice ||= {}; t.hero ||= {}; t.loadouts ||= {};
    return t;
  };
  const bump = (p) => { p.talentsRev = (p.talentsRev | 0) + 1; };
  const nodeName = (tree, id) => T.nodeById(tree, id)?.name || id;
  // nivel de aprendizaje (T0): motivo si el nivel aún no deja el nodo (o la opción k); opción que vale
  const lockOf = (node, level, k = null) => T.learnFail?.(node, level, k) || null;
  const pickOpen = (node, k, level) => (T.openChoice ? T.openChoice(node, k, level) : (k || node.opts?.[0]?.k || null));

  // árbol, nodo y rangos de un ámbito (con su motivo si no se puede usar)
  function scope(p, which) {
    ensure(p);
    if (which !== 'cls' && !p.talents.spec) return { err: fail('no-spec', 'Elige primero una especialización') };
    const tree = T.treeOf(p, which);
    if (!tree) return { err: fail(which === 'hero' ? 'hero-closed' : 'no-spec', which === 'hero' ? 'Esta especialización no tiene árbol héroe' : 'Elige primero una especialización') };
    return { tree, ranks: T.ranksOf(p, which), choice: T.choicesOf(p, which) };
  }
  // talentos asignados que dejarían de ser válidos con estos rangos
  function brokenBy(tree, ranks, level) {
    return tree.nodes.filter(n => !n.free && (ranks[n.id] | 0) > 0 && (T.gateFail(tree, ranks, n, level) || T.reqFail(tree, ranks, n)));
  }

  // estado de un nodo para la UI (no muta nada salvo crear p.talents si falta)
  function nodeState(p, which, node, tree = T.treeOf(p, which)) {
    ensure(p);
    const ranks = T.ranksOf(p, which);
    const isHero = which === 'hero';
    const open = !isHero || T.heroOpen(p);
    // en el Paragon cerrado los nodos guardados siguen ahí (pausa), pero la clave no cuenta
    const r = node.free ? (open ? 1 : 0) : (ranks[node.id] | 0);
    // `gate` incluye el nivel de aprendizaje (T0); `learn` es solo ese motivo y `optLock` el de cada
    // opción de una elección (null = ya sirve)
    const gate = node.free ? null : T.gateFail(tree, ranks, node, p.level | 0);
    const learn = node.free ? null : lockOf(node, p.level | 0);
    const optLock = node.t === 'c' ? Object.fromEntries((node.opts || []).map(o => [o.k, lockOf(node, p.level | 0, o.k)])) : null;
    const req = node.free ? null : T.reqFail(tree, ranks, node);
    const left = T.talentPointsLeft(p, which);
    const maxed = r >= node.max;
    const reachable = !gate && !req;
    const canAdd = !node.free && open && !maxed && reachable && left > 0;
    const canRemove = !node.free && r > 0 && T.canRemoveRank(p, which, node.id);
    let state;
    if (isHero && !open) state = T.heroPaused(p) && (node.free || r > 0) ? 'paused' : 'locked';
    else if (node.free) state = 'free';
    else if (maxed) state = 'max';
    else if (r > 0) state = 'partial';
    else if (canAdd) state = 'available';
    else if (reachable && open) state = 'open';      // desbloqueado pero sin puntos libres
    else state = 'locked';
    let removeBlock = null;
    if (!node.free && r > 0 && !canRemove) {
      const broken = brokenBy(tree, { ...ranks, [node.id]: r - 1 }, p.level | 0).filter(n => n.id !== node.id);
      const names = broken.length > 2 ? `${broken[0].name}, ${broken[1].name} y ${broken.length - 2} más` : broken.map(n => n.name).join(' y ');
      removeBlock = broken.length ? `No puedes quitarlo: ${names} depende${broken.length > 1 ? 'n' : ''} de él` : 'No puedes quitar este rango';
    }
    return { rank: r, max: node.max, state, gate, req, learn, optLock, open: reachable, maxed, canAdd, canRemove, removeBlock, left,
      choice: node.t === 'c' ? (T.choicesOf(p, which)[node.id] || null) : null, paused: state === 'paused' };
  }

  // estado del Paragon antes y después de un cambio (avisos de apertura y pausa)
  const heroFlags = (p) => ({ open: T.heroOpen(p), paused: T.heroPaused(p) });
  function heroDelta(p, before) {
    const now = heroFlags(p), out = {};
    if (!before.open && now.open) out.heroOpened = true;
    if (now.paused && !before.paused) {
      out.heroPaused = true;
      const s = T.findSpec(p.classId, p.talents.spec);
      out.missing = Math.max(0, (T.TALENT_RULES?.pts?.spec ?? 31) - T.spentIn({ nodes: s?.nodes || [] }, p.talents.sp?.[s?.id] || {}));
    }
    return out;
  }

  // sumar un rango; k = opción de una elección (sin k: la última elegida o la A)
  function addRank(p, which, id, k) {
    const sc = scope(p, which);
    if (sc.err) return sc.err;
    const { tree, ranks, choice } = sc;
    const node = T.nodeById(tree, id);
    if (!node) return fail('unknown', 'Talento desconocido');
    if (node.free) return fail('free', 'Este nodo es gratis: ya está activo');
    if (k != null && (node.t !== 'c' || !node.opts.some(o => o.k === k))) return fail('choice', 'Opción no válida');
    if (which === 'hero' && !T.heroOpen(p)) return fail('hero-closed', 'Gasta tus 31 puntos de especialización para abrir el Paragon');
    const cur = ranks[id] | 0;
    const L = p.level | 0;
    // una opción que solo toca habilidades que aún no conoces no se elige (T0)
    const optLock = k != null ? lockOf(node, L, k) : null;
    if (cur >= node.max) {
      // una elección ya comprada: pulsar la otra mitad cambia la opción
      if (node.t === 'c' && k && choice[id] !== k) {
        if (optLock) return fail('learn', optLock);
        choice[id] = k; bump(p); return { ok: true, rank: cur, changed: true };
      }
      return fail('max', 'Ya está al máximo');
    }
    const gate = T.gateFail(tree, ranks, node, L);
    if (gate) return gate === lockOf(node, L) ? fail('learn', gate) : fail('gate', gate);
    if (optLock) return fail('learn', optLock);
    const req = T.reqFail(tree, ranks, node);
    if (req) return fail('req', req);
    if (T.talentPointsLeft(p, which) <= 0) return fail('points', `No te quedan puntos de ${TREE_NAME[which]}`);
    const before = heroFlags(p);
    ranks[id] = cur + 1;
    // sin k: la última elegida o la A; si el nivel aún no la deja, la otra
    if (node.t === 'c') choice[id] = k || pickOpen(node, choice[id] || node.opts?.[0]?.k, L) || node.opts?.[0]?.k || 'A';
    bump(p);
    return { ok: true, rank: ranks[id], ...heroDelta(p, before) };
  }

  function removeRank(p, which, id) {
    const sc = scope(p, which);
    if (sc.err) return sc.err;
    const { tree, ranks } = sc;
    const node = T.nodeById(tree, id);
    if (!node) return fail('unknown', 'Talento desconocido');
    if (node.free) return fail('free', 'El nodo clave no se puede quitar');
    const r = ranks[id] | 0;
    if (r <= 0) return fail('empty', 'No tiene rangos que quitar');
    if (!T.canRemoveRank(p, which, id)) return fail('req', nodeState(p, which, node, tree).removeBlock || 'No puedes quitar este rango');
    const before = heroFlags(p);
    if (r - 1 > 0) ranks[id] = r - 1; else delete ranks[id];
    bump(p);
    return { ok: true, rank: r - 1, ...heroDelta(p, before) };
  }

  // elegir la opción A/B de un nodo de elección (no cuesta puntos)
  function setChoice(p, which, id, k) {
    const sc = scope(p, which);
    if (sc.err) return sc.err;
    const node = T.nodeById(sc.tree, id);
    if (!node || node.t !== 'c') return fail('choice', 'No es un nodo de elección');
    if (!node.opts.some(o => o.k === k)) return fail('choice', 'Opción desconocida');
    const lock = lockOf(node, p.level | 0, k);
    if (lock) return fail('learn', lock);
    sc.choice[id] = k;
    bump(p);
    return { ok: true };
  }
  // pasa a la siguiente opción que el nivel ya deja (si no hay otra, el motivo de la siguiente)
  function toggleChoice(p, which, id) {
    const sc = scope(p, which);
    if (sc.err) return sc.err;
    const node = T.nodeById(sc.tree, id);
    if (!node || node.t !== 'c') return fail('choice', 'No es un nodo de elección');
    const cur = sc.choice[id] || node.opts[0].k;
    const i = node.opts.findIndex(o => o.k === cur);
    const n = node.opts.length;
    for (let d = 1; d < n; d++) {
      const o = node.opts[(i + d) % n];
      if (!lockOf(node, p.level | 0, o.k)) return setChoice(p, which, id, o.k);
    }
    return setChoice(p, which, id, node.opts[(i + 1) % n].k);
  }
  // ¿en qué ámbito está un nodo? (clase, especialización o héroe activo)
  function whichOf(p, id) {
    for (const w of ['cls', 'spec', 'hero']) { const tr = T.treeOf(p, w); if (tr && T.nodeById(tr, id)) return w; }
    return null;
  }

  // árbol héroe de la especialización: gratis fuera de combate; cada árbol guarda sus nodos
  function chooseHeroTree(p, treeId) {
    ensure(p);
    const spec = p.talents.spec;
    if (!spec) return fail('no-spec', 'Elige primero una especialización');
    const trees = T.heroTreesFor(p.classId, spec);
    if (!trees.some(h => h.id === treeId)) return fail('unknown', 'Ese árbol héroe no es de tu especialización');
    const st = p.talents.hero[spec] ||= { tree: trees[0].id, nodes: {}, choice: {} };
    st.nodes ||= {}; st.choice ||= {};
    st.tree = treeId;
    bump(p);
    return { ok: true, tree: treeId };
  }

  function clearChoices(p, tree) { for (const n of tree.nodes) if (n.t === 'c') delete p.talents.choice[n.id]; }
  // elecciones con rango que el nivel aún no deja → la otra opción (T0). true si cambió alguna
  function fixLevelChoices(p, nodes, ranks, level) {
    if (!T.fixChoices) return false;
    const r = T.fixChoices(nodes, ranks, p.talents.choice, level);
    if (!r.switched.length) return false;
    for (const id of r.switched) p.talents.choice[id] = r.choice[id];
    return true;
  }
  // la build aplicada con «Recomendado» (talents.build[spec]) deja de valer si el árbol de la
  // especialización se rehace por otra vía (reinicio, configuración guardada, código): el libro vuelve a
  // recomendar la forja de la build por defecto. Editar nodos sueltos la conserva
  function forgetBuild(p, spec) {
    const b = p.talents.build;
    if (!spec || !b || typeof b !== 'object' || !Object.hasOwn(b, spec)) return;
    delete b[spec];
    if (!Object.keys(b).length) delete p.talents.build;
  }
  function resetTree(p, which) {
    const sc = scope(p, which);
    if (sc.err) return sc.err;
    const before = heroFlags(p);
    if (which === 'cls') { p.talents.cls = {}; clearChoices(p, sc.tree); }
    else if (which === 'spec') { p.talents.sp[p.talents.spec] = {}; clearChoices(p, sc.tree); forgetBuild(p, p.talents.spec); }
    else {
      const st = p.talents.hero[p.talents.spec];
      if (st) { st.nodes[sc.tree.hero.id] = {}; st.choice[sc.tree.hero.id] = {}; }
    }
    bump(p);
    return { ok: true, ...heroDelta(p, before) };
  }
  function resetAll(p) {
    ensure(p);
    const a = resetTree(p, 'cls');
    if (!p.talents.spec) return { ok: a.ok };
    resetTree(p, 'spec');
    if (T.treeOf(p, 'hero')) resetTree(p, 'hero');
    return { ok: true };
  }

  // especialización: cada una conserva sus rangos (p.talents.sp[specId]) y su árbol héroe
  function chooseSpec(p, specId) {
    ensure(p);
    if ((p.level | 0) < specAt()) return fail('level', `Las especializaciones se desbloquean en el nivel ${specAt()}`);
    if (!T.findSpec(p.classId, specId)) return fail('unknown', 'Especialización desconocida');
    p.talents.spec = specId;
    p.talents.sp[specId] ||= {};
    const trees = T.heroTreesFor(p.classId, specId);
    if (trees.length && !p.talents.hero[specId]) p.talents.hero[specId] = { tree: trees[0].id, nodes: {}, choice: {} };
    bump(p);
    return { ok: true };
  }

  // ---------- build recomendada (Recomendado) ----------
  // key: una build de la clase (si es de otra especialización, la elige) o, sin key, la
  // defaultBuild de la especialización activa
  function applyBuild(p, key = null) {
    ensure(p);
    const builds = T.talentTreesFor(p.classId)?.builds || {};
    const k = key || T.defaultBuildKey(p.classId, p.talents.spec);
    const b = k && builds[k];
    if (!b) return fail('unknown', 'Esta especialización no tiene build recomendada');
    if ((p.level | 0) < specAt()) return fail('level', `Las especializaciones se desbloquean en el nivel ${specAt()}`);
    if (!T.findSpec(p.classId, b.sp)) return fail('unknown', 'Especialización desconocida');
    const before = heroFlags(p);
    const r = T.buildRanks(p, b, { level: p.level | 0 });
    p.talents.spec = b.sp;
    clearChoices(p, T.treeOf(p, 'cls'));
    clearChoices(p, T.treeOf(p, 'spec'));
    p.talents.cls = r.cls;
    p.talents.sp[b.sp] = r.sp[b.sp] || {};
    Object.assign(p.talents.choice, r.choice);
    if (r.hero) {
      const st = p.talents.hero[b.sp] ||= { tree: r.hero.tree, nodes: {}, choice: {} };
      st.nodes ||= {}; st.choice ||= {};
      st.tree = r.hero.tree;
      st.nodes[r.hero.tree] = r.hero.nodes[r.hero.tree] || {};
      st.choice[r.hero.tree] = r.hero.choice[r.hero.tree] || {};
    }
    // la build aplicada por especialización (talents.build): el libro recomienda SU forja (hud-model.recoFor)
    const prev = p.talents.build && typeof p.talents.build === 'object' && !Array.isArray(p.talents.build) ? p.talents.build : {};
    p.talents.build = { ...prev, [b.sp]: k };
    bump(p);
    return { ok: true, key: k, spec: b.sp, ...heroDelta(p, before) };
  }
  // compat con el panel de 2d (ui-talents.js): aplica la build entera
  const applyPreset = (p) => applyBuild(p);
  const applyPresetAll = (p) => applyBuild(p);

  // ---------- configuraciones (≤ 10 por especialización) ----------
  function currentLoadout(p, name) {
    const spec = p.talents.spec;
    const nodes = [...T.treeOf(p, 'cls').nodes, ...T.treeOf(p, 'spec').nodes];
    const choice = {};
    for (const n of nodes) if (n.t === 'c' && p.talents.choice[n.id]) choice[n.id] = p.talents.choice[n.id];
    const h = T.activeHeroTree(p), st = p.talents.hero[spec];
    return { name: String(name ?? '').trim().slice(0, LOADOUT_NAME_MAX) || 'Configuración', cls: { ...p.talents.cls }, choice,
      sp: { ...(p.talents.sp[spec] || {}) }, hero: h ? { tree: h.id, nodes: { ...(st?.nodes?.[h.id] || {}) }, choice: { ...(st?.choice?.[h.id] || {}) } } : null };
  }
  function saveLoadout(p, name) {
    ensure(p);
    const spec = p.talents.spec;
    if (!spec) return fail('no-spec', 'Elige primero una especialización');
    const list = p.talents.loadouts[spec] ||= [];
    if (list.length >= LOADOUTS_MAX) return fail('full', `Ya tienes ${LOADOUTS_MAX} configuraciones en esta especialización`);
    list.push(currentLoadout(p, name));
    bump(p);
    return { ok: true, index: list.length - 1 };
  }
  // orden de compra de unos rangos guardados: de arriba abajo (padres y puertas antes)
  const orderOf = (nodes, ranks) => nodes.filter(n => (ranks[n.id] | 0) > 0 && !n.free)
    .sort((a, b) => a.r - b.r || a.c - b.c).map(n => [n.id, ranks[n.id] | 0]);
  function applyLoadout(p, i) {
    ensure(p);
    const spec = p.talents.spec;
    const l = spec && p.talents.loadouts[spec]?.[i];
    if (!l) return fail('unknown', 'Configuración desconocida');
    const before = heroFlags(p);
    const clsTree = T.treeOf(p, 'cls'), specTree = T.treeOf(p, 'spec');
    const L = p.level | 0;
    // si el nivel no da, se recorta punto a punto (como buildRanks)
    const fit = (tree, gates, ranks, budget) => {
      const clean = {};
      for (const n of tree.nodes) if ((ranks?.[n.id] | 0) > 0 && !n.free) clean[n.id] = Math.min(ranks[n.id] | 0, n.max);
      if (T.validRanks({ nodes: tree.nodes, gates }, clean, L) && T.spentIn(tree, clean) <= budget) return { ranks: clean, trimmed: false };
      return { ranks: T.fillByOrder(tree.nodes, gates, orderOf(tree.nodes, clean), budget, L), trimmed: true };
    };
    const c = fit(clsTree, T.CLASS_GATES, l.cls, T.earnedAt('cls', L));
    const s = fit(specTree, T.SPEC_GATES, l.sp, T.earnedAt('spec', L));
    clearChoices(p, clsTree); clearChoices(p, specTree);
    p.talents.cls = c.ranks;
    p.talents.sp[spec] = s.ranks;
    forgetBuild(p, spec);
    for (const [id, k] of Object.entries(l.choice || {})) if (T.nodeById(clsTree, id) || T.nodeById(specTree, id)) p.talents.choice[id] = k;
    // una elección que el nivel aún no deja pasa a la otra opción (T0)
    const fc = fixLevelChoices(p, [...clsTree.nodes, ...specTree.nodes], { ...c.ranks, ...s.ranks }, L);
    let trimmed = c.trimmed || s.trimmed || fc;
    if (l.hero && T.heroTreesFor(p.classId, spec).some(h => h.id === l.hero.tree)) {
      const ht = T.findHero(p.classId, l.hero.tree);
      const st = p.talents.hero[spec] ||= { tree: ht.id, nodes: {}, choice: {} };
      st.nodes ||= {}; st.choice ||= {};
      st.tree = ht.id;
      const h = fit(ht, T.HERO_GATES || [], l.hero.nodes, T.earnedAt('hero', L));
      st.nodes[ht.id] = h.ranks;
      st.choice[ht.id] = { ...(l.hero.choice || {}) };
      trimmed = trimmed || h.trimmed;
    }
    bump(p);
    return { ok: true, trimmed, ...heroDelta(p, before) };
  }
  function renameLoadout(p, i, name) {
    ensure(p);
    const l = p.talents.spec && p.talents.loadouts[p.talents.spec]?.[i];
    if (!l) return fail('unknown', 'Configuración desconocida');
    const nm = String(name ?? '').trim().slice(0, LOADOUT_NAME_MAX);
    if (!nm) return fail('unknown', 'Pon un nombre');
    l.name = nm;
    bump(p);
    return { ok: true };
  }
  function deleteLoadout(p, i) {
    ensure(p);
    const list = p.talents.spec && p.talents.loadouts[p.talents.spec];
    if (!list?.[i]) return fail('unknown', 'Configuración desconocida');
    list.splice(i, 1);
    bump(p);
    return { ok: true };
  }

  // ---------- deshacer (la pila vive en la UI y no se guarda) ----------
  function snapshot(p) {
    ensure(p);
    const t = p.talents;
    return JSON.stringify({ spec: t.spec, cls: t.cls, sp: t.sp, choice: t.choice, hero: t.hero });
  }
  function restore(p, s) {
    ensure(p);
    let o;
    try { o = JSON.parse(s); } catch { return fail('unknown', 'Estado no válido'); }
    const n = T.normalizeTalents({ v: 2, ...o, loadouts: p.talents.loadouts }, p.classId);
    Object.assign(p.talents, { spec: n.spec, cls: n.cls, sp: n.sp, choice: n.choice, hero: n.hero });
    bump(p);
    return { ok: true };
  }

  // ---------- código de build IRPG2 ----------
  function encodeTree(nodes, ranks, choice, hero = false) {
    let s = '';
    for (const n of nodes) {
      if (n.free) continue;
      const r = Math.max(0, Math.min(hero ? 1 : 35, ranks[n.id] | 0));
      s += hero ? (r ? '1' : '0') : B36[r];
      if (n.t === 'c' && r > 0) s += (choice[n.id] || n.opts[0].k).toUpperCase();
    }
    return s;
  }
  function decodeTree(nodes, str, hero = false) {
    const ranks = {}, choice = {};
    let i = 0;
    for (const n of nodes) {
      if (n.free) continue;
      if (i >= str.length) return { error: 'El código no encaja con el árbol actual (le faltan talentos)' };
      const ch = str[i++];
      const r = hero ? '01'.indexOf(ch) : B36.indexOf(ch);
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
  const firma = (classId) => (T.treeSignature(classId) || '').slice(-2).padStart(2, '0');

  function exportCode(p) {
    ensure(p);
    const cls = T.treeOf(p, 'cls');
    if (!cls) return '';
    const spec = T.treeOf(p, 'spec');
    const hero = spec ? T.treeOf(p, 'hero') : null;
    const ht = hero?.hero;
    const body = [CODE_VERSION, p.classId, spec ? p.talents.spec : 'x', firma(p.classId),
      encodeTree(cls.nodes, p.talents.cls || {}, p.talents.choice),
      spec ? encodeTree(spec.nodes, T.ranksOf(p, 'spec'), p.talents.choice) : '',
      ht ? ht.id : 'x',
      ht ? encodeTree(ht.nodes, T.ranksOf(p, 'hero'), T.choicesOf(p, 'hero'), true) : ''].join('-');
    return body + '-' + codeChecksum(body);
  }

  // analiza un código sin aplicarlo: { ok, classId, specId, cls, spec, choice, heroTree, hero, heroChoice }
  function parseCode(code) {
    const s = String(code ?? '').trim().replace(/\s+/g, '');
    if (!s) return fail('code-check', 'Pega un código de build');
    const parts = s.split('-');
    if (parts[0] === CODE_VERSION_OLD) return fail('code-version', 'Es un código de una versión anterior de los talentos: ya no se puede usar');
    if (parts[0] !== CODE_VERSION) return fail('code-check', `Formato no reconocido: el código debe empezar por ${CODE_VERSION}-`);
    if (parts.length !== 9) return fail('code-check', 'El código está incompleto o dañado');
    const [, classId, specId, sig, clsStr, specStr, heroId, heroStr, chk] = parts;
    if (codeChecksum(parts.slice(0, 8).join('-')) !== chk) return fail('code-check', 'El código está dañado (no pasa la verificación). Cópialo de nuevo completo');
    const t = T.talentTreesFor(classId);
    if (!t) return fail('code-class', `Clase desconocida en el código: «${classId}»`);
    if (sig !== firma(classId)) return fail('code-version', 'Es una build de otra versión de los árboles de talentos');
    const c = decodeTree(t.cls.nodes, clsStr);
    if (c.error) return fail('code-illegal', c.error);
    let sp = { ranks: {}, choice: {} }, hp = { ranks: {}, choice: {} };
    if (specId !== 'x') {
      const spec = T.findSpec(classId, specId);
      if (!spec) return fail('code-illegal', `Especialización desconocida en el código: «${specId}»`);
      sp = decodeTree(spec.nodes, specStr);
      if (sp.error) return fail('code-illegal', sp.error);
      if (heroId !== 'x') {
        const h = T.heroTreesFor(classId, specId).find(x => x.id === heroId);
        if (!h) return fail('code-illegal', `Árbol héroe desconocido en el código: «${heroId}»`);
        hp = decodeTree(h.nodes, heroStr, true);
        if (hp.error) return fail('code-illegal', hp.error);
      } else if (heroStr) return fail('code-check', 'El código está dañado (Paragon sin árbol héroe)');
    } else if (specStr || heroId !== 'x' || heroStr) return fail('code-check', 'El código está dañado (árboles de especialización sin especialización)');
    return { ok: true, classId, specId: specId === 'x' ? null : specId, cls: c.ranks, spec: sp.ranks, choice: { ...c.choice, ...sp.choice },
      heroTree: heroId === 'x' ? null : heroId, hero: hp.ranks, heroChoice: hp.choice };
  }

  // valida unos rangos contra el nivel y los puntos del jugador (texto o null)
  function checkTree(tree, ranks, level, budget, label) {
    const spent = T.spentIn(tree, ranks);
    if (spent > budget) return `La build usa ${spent} puntos de ${label} y solo tienes ${budget}`;
    for (const n of tree.nodes) {
      if (n.free || !((ranks[n.id] | 0) > 0)) continue;
      const why = T.gateFail(tree, ranks, n, level) || T.reqFail(tree, ranks, n);
      if (why) return `Build no válida en «${n.name}»: ${why}`;
    }
    return null;
  }

  // importa un código y lo aplica (todo o nada). { trim: true } recorta lo que el nivel no da
  // (punto a punto, como buildRanks) en vez de rechazarlo.
  function importCode(p, code, { trim = false } = {}) {
    ensure(p);
    const d = parseCode(code);
    if (!d.ok) return d;
    if (d.classId !== p.classId) return fail('code-class', `Este código es de ${className(d.classId)} y tu personaje es ${className(p.classId)}`);
    const L = p.level | 0;
    if (d.specId && L < specAt()) return fail('code-illegal', `Necesitas nivel ${specAt()} para usar una especialización`);
    const t = T.talentTreesFor(p.classId);
    const clsTree = { nodes: t.cls.nodes, gates: T.CLASS_GATES };
    const spec = d.specId ? T.findSpec(p.classId, d.specId) : null;
    const specTree = spec ? { nodes: spec.nodes, gates: T.SPEC_GATES } : null;
    const heroDef = d.heroTree ? T.findHero(p.classId, d.heroTree) : null;
    const heroTree = heroDef ? { nodes: heroDef.nodes, gates: T.HERO_GATES || [] } : null;
    let cls = d.cls, sp = d.spec, hero = d.hero, trimmed = false;
    const specBudget = T.earnedAt('spec', L);
    // el Paragon solo se abre con la especialización 31/31 gastada (con los rangos del código)
    const openWith = ranks => !!spec && specBudget >= (T.TALENT_RULES?.pts?.spec ?? 31) && T.spentIn(specTree, ranks) >= (T.TALENT_RULES?.pts?.spec ?? 31);
    const heroBudget = sr => (openWith(sr) ? T.earnedAt('hero', L) : 0);
    const errs = () => checkTree(clsTree, cls, L, T.earnedAt('cls', L), 'clase')
      || (specTree && checkTree(specTree, sp, L, specBudget, 'especialización'))
      || (heroTree && checkTree(heroTree, hero, L, heroBudget(sp), 'Paragon'));
    let err = errs();
    if (err && !trim) return fail('code-illegal', err);
    if (err) {
      cls = T.fillByOrder(clsTree.nodes, T.CLASS_GATES, orderOf(clsTree.nodes, cls), T.earnedAt('cls', L), L);
      if (specTree) sp = T.fillByOrder(specTree.nodes, T.SPEC_GATES, orderOf(specTree.nodes, sp), specBudget, L);
      if (heroTree) hero = T.fillByOrder(heroTree.nodes, T.HERO_GATES || [], orderOf(heroTree.nodes, hero), heroBudget(sp), L);
      trimmed = true;
      err = errs();
      if (err) return fail('code-illegal', err);
    }
    // aplicar
    const before = heroFlags(p);
    for (const n of [...t.cls.nodes, ...(spec?.nodes || [])]) if (n.t === 'c') delete p.talents.choice[n.id];
    p.talents.cls = cls;
    if (spec) {
      p.talents.spec = spec.id;
      p.talents.sp[spec.id] = sp;
      forgetBuild(p, spec.id);
      if (heroDef) {
        const st = p.talents.hero[spec.id] ||= { tree: heroDef.id, nodes: {}, choice: {} };
        st.nodes ||= {}; st.choice ||= {};
        st.tree = heroDef.id;
        st.nodes[heroDef.id] = hero;
        st.choice[heroDef.id] = { ...d.heroChoice };
      }
    }
    Object.assign(p.talents.choice, d.choice);
    // una elección del código que tu nivel aún no deja pasa a la otra opción (T0): cuenta como recorte
    if (fixLevelChoices(p, [...t.cls.nodes, ...(spec?.nodes || [])], { ...cls, ...(spec ? sp : {}) }, L)) trimmed = true;
    bump(p);
    return { ok: true, specId: d.specId, changedSpec: !!d.specId, trimmed, ...heroDelta(p, before) };
  }

  // habilidades activas que concede cada árbol (para la lista del panel)
  function grantsOf(p, which, tree = T.treeOf(p, which)) {
    if (!tree) return [];
    ensure(p);
    const ranks = T.ranksOf(p, which);
    const ch = T.choicesOf(p, which);
    const live = which !== 'hero' || T.heroOpen(p);
    const out = [];
    for (const n of tree.nodes) {
      const r = n.free ? 1 : (ranks[n.id] | 0);
      if (n.t === 'c') {
        for (const o of n.opts) if (o.fx?.grant) {
          const pick = ch[n.id] || n.opts[0].k;
          out.push({ node: n, opt: o.k, name: o.name, skill: o.fx.grant, learned: live && r > 0 && pick === o.k, choice: true });
        }
      } else if (n.fx?.grant) out.push({ node: n, opt: null, name: n.name, skill: n.fx.grant, learned: live && r > 0, choice: false });
    }
    return out;
  }

  return {
    ensure, nodeState, addRank, removeRank, setChoice, toggleChoice, whichOf, chooseHeroTree,
    resetTree, resetAll, chooseSpec, applyBuild, applyPreset, applyPresetAll,
    saveLoadout, applyLoadout, renameLoadout, deleteLoadout, snapshot, restore,
    exportCode, parseCode, importCode, grantsOf,
  };
}
