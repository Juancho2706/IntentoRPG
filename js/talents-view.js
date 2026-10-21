// ============================================================
// VISTA DEL PANEL DE TALENTOS v2 (módulo PURO, sin DOM) — Paso 2 · E3 (U1)
// ============================================================
// Lo que DIBUJA js/ui-talents.js, en datos: geometría fija del panel (1560 × 930 a escala 1,
// como el mockup docs/mockups/skills-ux.html), nodos con posición, forma y estado, aristas,
// puertas, banda del ápice, cabeceras «Gastados X / Y», estado del Paragon (abierto, en pausa,
// velo), tu kit, el selector de especialización y los tooltips. Contrato:
// docs/paso2-implementacion.md §3.12; diseño: docs/paso2g-maga-coherencia.md §7.1, §9 y §10.
// Se prueba sin DOM en tests/test85-talentos-vista.mjs.
//
//   talentsView(p) → null | {
//     classId, level, view: 'trees' | 'choose', head, spec, points, kit, hero, chooser,
//     trees: { cls, spec?, hero? }   cada uno { which, name, w, h, x0, y0, head, nodes, edges, gates, apex }
//   }
//   nodo: { id, which, t, tag, x, y, w, h, shape: 'circle'|'hex', inner: 'circle'|'split'|'square'|null,
//           state: 'locked'|'avail'|'partial'|'max'|'paused', rank, max, free, choice, hasAct, icon, … }
//
// Coordenadas: x, y de un nodo son del lienzo de su árbol; (x0, y0) del árbol es la esquina del
// lienzo dentro del panel. Así el panel coloca nodos, flotantes y tooltips SIN leer el layout.
import * as Talents from './talents.js';
import { createTalentOps, TALENT_REASONS } from './talents-ops.js';
import { CLASSES } from './data.js';
import { knownSkills } from './skill-resolve.js';
import { CAT_LABELS, skillSlots } from './skill-defs.js';

// operaciones puras (solo para CONSULTAR el estado de un nodo; las mutaciones van por ops)
const OPS = createTalentOps(Talents);
const R = Talents.TALENT_RULES;

// ------------------------------------------------------------ geometría (px a escala 1)
// Panel del mockup: 1560 × 930, relleno 22/28, cabecera 86, pie 60, huecos 14, columnas 2 : 1 : 2
// (588 · 300 · 588). Cada columna: borde 1, cabecera 62 y lienzo debajo.
export const TALENT_PANEL = Object.freeze({
  w: 1560, h: 930, padX: 28, padY: 22, headH: 86, footH: 60, gap: 14, midW: 300, colHead: 62, border: 1,
  refW: 1920, refH: 1080, sMin: 0.8, sMax: 1.25,
});
const P = TALENT_PANEL;
const BODY_H = P.h - 2 * P.padY - P.headH - P.footH - 2 * P.gap;           // 712
const SIDE_W = (P.w - 2 * P.padX - 2 * P.gap - P.midW) / 2;                 // 588
const COL_X = { cls: P.padX, hero: P.padX + SIDE_W + P.gap, spec: P.padX + SIDE_W + P.gap + P.midW + P.gap };
const COL_W = { cls: SIDE_W, hero: P.midW, spec: SIDE_W };
const BODY_Y = P.padY + P.headH + P.gap;                                    // 122
// lienzo de cada árbol (dentro del borde y bajo la cabecera de la columna)
export const TREE_CANVAS = Object.freeze(Object.fromEntries(['cls', 'hero', 'spec'].map(w => [w, Object.freeze({
  x0: COL_X[w] + P.border, y0: BODY_Y + P.border + P.colHead,
  w: COL_W[w] - 2 * P.border, h: BODY_H - 2 * P.border - P.colHead,
  colX: COL_X[w], colW: COL_W[w],
})])));
export const BODY_BOX = Object.freeze({ x: P.padX, y: BODY_Y, w: P.w - 2 * P.padX, h: BODY_H });
// márgenes del mockup (layout()): el héroe deja sitio arriba a las pestañas de árbol. A los lados,
// 40 (el mockup, 34): con 34 la pastilla de rango de la columna 6 se salía 3 px del lienzo
const PAD = { cls: { x: 40, top: 30, bot: 44 }, spec: { x: 40, top: 30, bot: 44 }, hero: { x: 54, top: 96, bot: 54 } };
// tamaño de la caja de un nodo por tipo (el hexágono es más ancho que alto). El ápice mide 54 (el
// mockup, 58): con 58 la pastilla del final que tiene encima lo pisaba (A5)
export const NODE_BOX = Object.freeze({ p: [44, 44], c: [50, 46], k: [54, 54], f: [54, 54], x: [54, 54] });
// pastilla de rango: esquina inferior derecha de la caja (right −12, bottom −9; 28 × 17)
export const RANK_PILL = Object.freeze({ dx: 12, dy: 9, w: 28, h: 17 });
// letra A/B del hexágono: esquina inferior izquierda (left −7, bottom −7; 17 × 17)
const AB_BADGE = { dx: 7, dy: 7, w: 17, h: 17 };
// cajas que ocupa un nodo colocado (icono, pastilla, letra A/B, pips): solapes y etiquetas de puerta
export function nodeBoxes(n) {
  const l = n.x - n.w / 2, t = n.y - n.h / 2, r = n.x + n.w / 2, b = n.y + n.h / 2;
  const out = [{ kind: 'node', l, t, r, b }];
  if (n.t === 'x') out.push({ kind: 'pips', l: n.x - 25, t: b - 2, r: n.x + 25, b: b + 10 });
  else if (!n.free) out.push({ kind: 'pill', l: r + RANK_PILL.dx - RANK_PILL.w, t: b + RANK_PILL.dy - RANK_PILL.h, r: r + RANK_PILL.dx, b: b + RANK_PILL.dy });
  if (n.t === 'c') out.push({ kind: 'ab', l: l - AB_BADGE.dx, t: b + AB_BADGE.dy - AB_BADGE.h, r: l - AB_BADGE.dx + AB_BADGE.w, b: b + AB_BADGE.dy });
  return out;
}
export const boxHit = (a, b, m = 0) => Math.min(a.r, b.r) - Math.max(a.l, b.l) > -m && Math.min(a.b, b.b) - Math.max(a.t, b.t) > -m;
// ancho estimado de la etiqueta de una puerta (11 px, negrita; relleno 6 + 6)
export const gateLabelW = text => Math.ceil(12 + String(text).length * 6.8);
// cajas de la etiqueta (18 px de alto, centrada en la línea) y del sello (redondo: se mide su
// cuadrado interior) de una puerta en x = gx
export function gateBoxes(gx, y, lw) {
  return { label: { l: gx - 6, t: y - 9, r: gx - 6 + lw, b: y + 9 }, seal: { l: gx - 28, t: y - 9, r: gx - 10, b: y + 9 } };
}

// escala del panel: la del HUD (1920 × 1080 = 1; 0,8 – 1,25) y nunca más grande que la ventana
export function panelScale(vw, vh) {
  const W = Math.max(1, +vw || P.refW), H = Math.max(1, +vh || P.refH);
  const base = Math.min(Math.max(Math.min(W / P.refW, H / P.refH), P.sMin), P.sMax);
  const fit = Math.min((W - 16) / P.w, (H - 16) / P.h);
  return Math.round(Math.max(0.4, Math.min(base, fit)) * 1000) / 1000;
}

// posiciones de un árbol en su lienzo (rejilla 0–6 × filas del árbol; héroe 0–2 con .5)
export function treeLayout(which, nodes) {
  const can = TREE_CANVAS[which], pad = PAD[which];
  const maxR = Math.max(1, ...nodes.map(n => n.r)), maxC = Math.max(1, ...nodes.map(n => n.c));
  const dx = (can.w - 2 * pad.x) / maxC, dy = (can.h - pad.top - pad.bot) / maxR;
  return { X: c => pad.x + c * dx, Y: r => pad.top + r * dy, dx, dy, w: can.w, h: can.h, maxR, maxC };
}

// ------------------------------------------------------------ textos fijos
export const KIND_TEXT = Object.freeze({ p: 'Pasiva', c: 'Elección A/B', k: 'Nodo clave', f: 'Final de rama', x: 'Ápice' });
export const ROLE_TEXT = Object.freeze({ UNI: 'Un objetivo', AREA: 'Área', CTRL: 'Control', AGU: 'Aguante', APO: 'Apoyo', MOV: 'Movilidad' });
const TREE_WORD = { cls: 'clase', spec: 'especialización', hero: 'Paragon' };
const SLOT_LABEL = { lmb: 'IZQ', rmb: 'DER', k1: '1', k2: '2', k3: '3', k4: '4' };
const CAT_ORDER = { basic: 0, spender: 1, movement: 2, defense: 3, utility: 3, spec: 4, ultimate: 5 };

// motivos de las respuestas de ops (TALENT_REASONS, talents-ops.js) → texto para el jugador.
// `detail`: el texto concreto de la respuesta (r.text) dice más que el fijo (puertas, requisitos,
// códigos); si no viene, se usa el fijo.
export const REASON_TEXT = Object.freeze({
  combat: { text: 'En combate no puedes cambiar talentos' },
  points: { text: 'No te quedan puntos en este árbol', detail: true },
  gate: { text: 'Gasta más puntos en las filas de arriba', detail: true },
  req: { text: 'Antes necesitas el talento de arriba al máximo', detail: true },
  max: { text: 'Ya está al máximo' },
  'hero-closed': { text: 'Gasta tus 31 puntos de especialización para abrir el Paragon' },
  'no-spec': { text: 'Elige primero una especialización' },
  choice: { text: 'Esa opción no es válida' },
  'code-version': { text: 'Es una build de otra versión de los talentos', detail: true },
  'code-class': { text: 'Ese código es de otra clase', detail: true },
  'code-check': { text: 'El código está dañado: cópialo de nuevo completo', detail: true },
  'code-illegal': { text: 'Esa build no cabe en tu nivel', detail: true },
  free: { text: 'Es gratis: ya está activo' },
  empty: { text: 'No tiene rangos que quitar' },
  unknown: { text: 'No se pudo hacer', detail: true },
  level: { text: `Las especializaciones se abren al nivel ${R.specAt}`, detail: true },
  full: { text: 'Ya tienes 10 configuraciones en esta especialización' },
});
// texto de una respuesta fallida de ops (null si salió bien)
export function reasonText(r) {
  if (!r || r.ok) return null;
  const e = REASON_TEXT[r.reason];
  const detail = typeof r.text === 'string' && r.text.trim() ? r.text.trim().replace(/^⚔️\s*/, '') : '';
  if (!e) return detail || REASON_TEXT.unknown.text;
  return (e.detail && detail) || e.text;
}
export { TALENT_REASONS };

// ------------------------------------------------------------ iconos y habilidades
// ruta (relativa a assets/) del icono de un nodo: el suyo o talents/<clase>-<clase|spec|héroe>-<id>.webp
export function nodeIconPath(classId, which, ownerId, node) {
  if (node?.icon) return node.icon;
  const tree = which === 'cls' ? 'clase' : ownerId;
  return `talents/${classId}-${tree}-${node?.id}.webp`;
}
const skillCatalog = classId => (CLASSES[classId]?.skills || []).filter(s => s.kind !== 'passive');
const findSkill = (classId, id) => skillCatalog(classId).find(s => s.id === id) || null;
// nodo (de clase, especialización o héroe) que concede una activa de talento
function grantNodeOf(classId, skillId) {
  const t = Talents.talentTreesFor(classId);
  if (!t) return null;
  const has = n => n.fx?.grant === skillId || (n.opts || []).some(o => o.fx?.grant === skillId);
  const n0 = t.cls.nodes.find(has);
  if (n0) return { node: n0, which: 'cls', owner: 'clase' };
  for (const s of t.specs || []) { const n = s.nodes.find(has); if (n) return { node: n, which: 'spec', owner: s.id }; }
  for (const h of t.hero || []) { const n = (h.nodes || []).find(has); if (n) return { node: n, which: 'hero', owner: h.id }; }
  return null;
}
// icono de una habilidad: el pintado (skills/<id>.webp); las activas de talento, el de su nodo
export function skillIconPath(classId, sk) {
  if (!sk) return null;
  if (sk.kind === 'talent') {
    const g = grantNodeOf(classId, sk.id);
    if (g) { const o = (g.node.opts || []).find(x => x.fx?.grant === sk.id); return o?.icon || nodeIconPath(classId, g.which, g.owner, g.node); }
  }
  return `skills/${sk.id}.webp`;
}
// una línea de la habilidad: `line` (2g) o la primera frase de la descripción
function skillLine(sk) {
  if (sk?.line) return sk.line;
  const d = String(sk?.desc || '').replace(/^Definitiva:\s*/, '');
  return (d.split(/(?<=[.;])\s/)[0] || '').slice(0, 120);
}

// Selectores '@…' de `touch` → grupo de la clase (etiqueta «Toca todo tu Fuego»). Espejo inverso
// de SEL_BANDERA del conversor (tools/convert-v2/lib/transformar.mjs): bandera → selector.
const FLAG_SEL = { fire: '@fire', frost: '@frost', arcane: '@arcane', holy: '@holy', sagrado: '@holy', nature: '@nature',
  physical: '@physical', movilidad: '@movement', golpes: '@all' };
const SEL_CAT = { '@basic': 'basic', '@spender': 'spender', '@movement': 'movement', '@defense': 'defense', '@utility': 'utility', '@insignia': 'spec', '@ultimate': 'ultimate' };
function expandTouch(classId, key) {
  const t = Talents.talentTreesFor(classId);
  const cat = skillCatalog(classId);
  if (key[0] !== '@') return { ids: [key] };
  const flag = Object.keys(t?.groups || {}).find(g => FLAG_SEL[g] === key);
  if (flag) return { ids: [...(t.groups[flag].ids || [])], label: t.groups[flag].label };
  if (key === '@all') return { ids: cat.map(s => s.id) };
  if (SEL_CAT[key]) return { ids: cat.filter(s => s.cat === SEL_CAT[key]).map(s => s.id) };
  const el = key.slice(1) === 'phys' ? 'physical' : key.slice(1);
  return { ids: cat.filter(s => (s.elem === 'phys' ? 'physical' : s.elem) === el).map(s => s.id) };
}
// habilidades que toca un nodo (touch del nodo + de sus opciones + activas que concede).
// k: solo esa opción. → { ids (del catálogo de la clase), label? } — para «Habilidades que toca»,
// «Tu kit» y la iluminación por habilidad. U2 puede reutilizarla para talentLinks/nodeSkills.
export function nodeTouches(classId, node, k = null) {
  const keys = [...(node?.touch || [])];
  for (const o of node?.opts || []) {
    if (k && o.k !== k) continue;
    keys.push(...(o.touch || []));
    if (o.fx?.grant) keys.push(o.fx.grant);
  }
  if (node?.fx?.grant) keys.push(node.fx.grant);
  const ids = new Set();
  let label = null;
  for (const key of keys) {
    const x = expandTouch(classId, key);
    if (x.label && !label) label = x.label;
    for (const id of x.ids) ids.add(id);
  }
  const known = new Set(skillCatalog(classId).map(s => s.id));
  return { ids: [...ids].filter(id => known.has(id)), label };
}

// ------------------------------------------------------------ estados
// estado de ops.nodeState → el del contrato (§3.12): locked | avail | partial | max | paused
export function contractState(st) {
  switch (st?.state) {
    case 'available': return 'avail';
    case 'partial': return 'partial';
    case 'max': case 'free': return 'max';
    case 'paused': return 'paused';
    default: return 'locked';
  }
}
const choiceIcon = (o, node, base) => o?.icon || base;

function nodeView(p, which, tree, node, L, ownerId, treeHasRoom) {
  const st = OPS.nodeState(p, which, node, tree);
  const [w, h] = NODE_BOX[node.t] || NODE_BOX.p;
  const icon = nodeIconPath(p.classId, which, ownerId, node);
  const v = {
    id: node.id, which, t: node.t, tag: node.tag || 'num', name: node.name,
    x: Math.round(L.X(node.c) * 10) / 10, y: Math.round(L.Y(node.r) * 10) / 10, w, h,
    r: node.r, c: node.c,
    shape: node.t === 'c' ? 'hex' : 'circle',
    inner: node.t === 'c' ? 'split' : 'circle',
    state: contractState(st), rank: st.rank, max: node.max, free: !!node.free,
    canAdd: !!st.canAdd, canRemove: !!st.canRemove, choice: null,
    hyb: node.hyb || null, final: node.final || null, req: [...(node.req || [])],
    icon, iconA: null, iconB: null, flipB: false, hasAct: false, actChosen: false,
    rankText: node.free ? '' : `${st.rank}/${node.max}`, pips: node.t === 'x' ? node.max : 0,
    room: treeHasRoom,
  };
  if (node.t === 'c') {
    const [a, b] = node.opts || [];
    v.iconA = choiceIcon(a, node, icon);
    v.iconB = choiceIcon(b, node, icon);
    v.flipB = !b?.icon;
    v.hasAct = (node.opts || []).some(o => !!o.fx?.grant);
    if (st.rank > 0) {
      const ch = st.choice || a?.k || 'A';
      const o = (node.opts || []).find(x => x.k === ch) || a;
      v.choice = ch;
      v.actChosen = !!o?.fx?.grant;
      v.inner = v.actChosen ? 'square' : 'circle';
      v.icon = choiceIcon(o, node, icon);
      v.flip = ch === 'B' && !o?.icon;
    }
  }
  return v;
}

// árbol del jugador ya colocado: nodos, aristas, puertas y banda del ápice
function treeViewOf(p, which) {
  const tree = Talents.treeOf(p, which);
  if (!tree) return null;
  const owner = which === 'cls' ? 'clase' : which === 'spec' ? tree.spec?.id : tree.hero?.id;
  const L = treeLayout(which, tree.nodes);
  const can = TREE_CANVAS[which];
  const left = Talents.talentPointsLeft(p, which);
  const nodes = tree.nodes.map(n => nodeView(p, which, tree, n, L, owner, left > 0));
  const by = new Map(nodes.map(n => [n.id, n]));
  // aristas recortadas 26 px en cada punta (no se meten bajo los iconos)
  const edges = [];
  for (const n of nodes) for (const pid of n.req) {
    const par = by.get(pid);
    if (!par) continue;
    const x1 = par.x, y1 = par.y, x2 = n.x, y2 = n.y, d = Math.hypot(x2 - x1, y2 - y1) || 1, k = 26 / d;
    const on = par.rank >= par.max && par.rank > 0, live = on && n.rank > 0;
    edges.push({ id: `${pid}>${n.id}`, from: pid, to: n.id, state: live ? 'live' : on ? 'on' : 'off',
      x1: r1(x1 + (x2 - x1) * k), y1: r1(y1 + (y2 - y1) * k), x2: r1(x2 - (x2 - x1) * k), y2: r1(y2 - (y2 - y1) * k) });
  }
  // puertas: línea entre la fila anterior y la suya
  const ranks = Talents.ranksOf(p, which);
  const gates = [];
  let apex = null;
  for (const g of tree.gates || []) {
    const y = r1(L.Y(g.row) - L.dy * 0.5);
    const have = Talents.spentIn(tree, ranks, g.row);
    const ok = have >= g.need && (!g.level || (p.level | 0) >= g.level);
    const isApex = !!(g.apex || g.level);
    if (isApex) apex = { y, row: g.row };
    gates.push({ row: g.row, y, need: g.need, have: Math.min(have, g.need), ok, apex: isApex, level: g.level || null,
      gx: isApex ? 34 : gateX(nodes, g, y, can.w),
      label: `${isApex ? 'Ápice · ' : ''}${ok ? '' : `${Math.min(have, g.need)}/`}${g.need}${g.level ? ` · Nv${g.level}` : ''}` });
  }
  return { which, name: tree.name, owner, x0: can.x0, y0: can.y0, w: can.w, h: can.h, dy: r1(L.dy), dx: r1(L.dx), nodes, edges, gates, apex };
}
const r1 = v => Math.round(v * 10) / 10;
// x de la etiqueta de una puerta (sello a su izquierda): el primer hueco, de izquierda a derecha,
// que no pisa ningún nodo, pastilla ni letra de las dos filas que separa. Se mide con la etiqueta
// más ancha («24/24») y el sello, para que no salte de sitio al abrirse.
function gateX(nodes, g, y, w) {
  const obst = nodes.filter(n => n.r === g.row - 1 || n.r === g.row).flatMap(nodeBoxes);
  const lw = gateLabelW(`${g.need}/${g.need}`);
  for (let gx = 32; gx + lw - 6 <= w - 8; gx += 2) {
    const { label, seal } = gateBoxes(gx, y, lw);
    if (!obst.some(o => boxHit(o, label, 1) || boxHit(o, seal, 1))) return gx;
  }
  return 32;
}

// ------------------------------------------------------------ cabeceras y Paragon
function colHead(p, which, spec, heroTree) {
  const total = R.pts[which];
  const earned = Talents.talentPointsEarned(p, which);
  const left = Math.max(0, Talents.talentPointsLeft(p, which));
  const tree = Talents.treeOf(p, which);
  const spent = tree ? Talents.spentIn(tree, Talents.ranksOf(p, which)) : 0;
  const L = p.level | 0;
  const meta = [];
  if (which === 'hero') {
    const open = Talents.heroOpen(p);
    if (open && L < R.heroAt) meta.push(`1.er punto al Nv${R.heroAt}`);
    if (!open) meta.push(`Espec. ${specSpent(p, spec)}/${R.pts.spec}`);
    const board = Talents.earnedAt('board', L);
    if (board > 0) meta.push(`Tablero ${board}/${R.pts.board}`);
  } else meta.push(`Nv req. ${which === 'cls' ? 11 : R.specAt}`);
  const name = which === 'cls' ? (Talents.talentTreesFor(p.classId)?.cls?.name || p.classId) : which === 'spec' ? (spec?.name || 'Especialización') : 'Paragon';
  return { which, name, sub: which === 'hero' ? (heroTree?.name || '') : '', spent, total, earned, left, meta,
    text: `Gastados ${spent} / ${total}` };
}
function specSpent(p, spec) {
  if (!spec) return 0;
  return Talents.spentIn({ nodes: spec.nodes }, p.talents?.sp?.[spec.id] || {});
}
function heroView(p, spec) {
  const open = Talents.heroOpen(p), paused = Talents.heroPaused(p);
  const trees = spec ? Talents.heroTreesFor(p.classId, spec.id) : [];
  const cur = Talents.activeHeroTree(p);
  const all = Talents.talentTreesFor(p.classId)?.hero || [];
  const other = all.find(h => !trees.includes(h)) || null;
  const specNames = ids => (ids || []).map(id => Talents.findSpec(p.classId, id)?.name || id).join(' y ');
  const N = R.pts.spec, sp = specSpent(p, spec), earned = Talents.earnedAt('spec', p.level | 0);
  const tree = Talents.treeOf(p, 'hero');
  const kept = tree ? Talents.spentIn(tree, Talents.ranksOf(p, 'hero')) : 0;
  const veil = open ? null : {
    paused,
    title: paused ? 'Paragon en pausa' : 'Paragon',
    goal: `${paused ? 'Vuelve a gastar' : 'Gasta'} tus ${N} puntos de especialización`,
    count: `${sp}/${N}`, frac: Math.round(Math.min(1, sp / N) * 1000) / 1000,
    kept: paused ? `Tus ${kept} punto${kept === 1 ? '' : 's'} del Paragon se guardan y vuelven a funcionar al recuperar el ${N}/${N}` : null,
    when: earned < N ? `El último punto se gana al nivel ${R.specLast}`
      : `Te ${N - sp === 1 ? 'queda 1 punto' : `quedan ${N - sp} puntos`} por gastar en el árbol de ${spec?.name || 'tu especialización'}`,
    previews: trees.map(h => ({ id: h.id, name: h.name, art: h.art || null, key: h.key || h.line || '' })),
    note: `Elige uno de los dos: su nodo clave es gratis y luego ${R.pts.hero} puntos (Nv${R.heroAt}–${R.heroAt + R.pts.hero - 1}) para 12 nodos. Después, el tablero de glifos (${R.pts.board} puntos, Nv81–100).`,
  };
  return { open, paused, tree: cur?.id || null, treeName: cur?.name || '', art: cur?.art || null,
    trees: trees.map(h => ({ id: h.id, name: h.name, art: h.art || null, on: h.id === cur?.id, key: h.key || '', line: h.line || '' })),
    other: other ? { id: other.id, name: other.name, art: other.art || null, title: `${other.name}: ${specNames(other.specs)}` } : null,
    veil };
}

// ------------------------------------------------------------ kit, selector y builds
export function kitView(p) {
  const list = knownSkills(p).filter(s => s.kind !== 'passive');
  list.sort((a, b) => (CAT_ORDER[a.cat] ?? 9) - (CAT_ORDER[b.cat] ?? 9) || (a.req || 1) - (b.req || 1));
  return list.map(sk => ({ id: sk.id, name: sk.name, cat: sk.cat, spec: sk.spec || null, talent: sk.kind === 'talent', icon: skillIconPath(p.classId, sk) }));
}
export function chooserView(p) {
  const t = Talents.talentTreesFor(p?.classId);
  const cur = p?.talents?.spec || null;
  const locked = (p?.level | 0) < R.specAt;
  return (t?.specs || []).map(s => {
    const kit = specKit(p.classId, s);
    return {
      id: s.id, name: s.name, role: s.roleLabel || '', line: s.line || s.desc || '', icon: s.icon || `specs/${s.id}.webp`,
      emblem: s.emblem || `emblems/${s.id}.webp`, mechanic: s.mechanic || null, innate: s.innateText || '',
      innateName: s.innateName || '', innateDesc: s.innateDesc || '',
      kit: kit.list.map(sk => ({ id: sk.id, name: sk.name, icon: skillIconPath(p.classId, sk), req: sk.req || 1, cat: sk.cat })),
      kitFrom: kit.from,
      current: !locked && s.id === cur, locked,
    };
  });
}
// Kit de la tarjeta: las habilidades propias de la especialización (campo `spec` del catálogo). Mientras el
// catálogo no las tenga, las que MÁS mejora su árbol (campo `touch` de sus nodos y opciones), sin el
// básico y como mucho 4; la tarjeta lo rotula «Mejora» para no prometer habilidades que no da.
const KIT_MAX = 4;
export function specKit(classId, spec) {
  const cat = skillCatalog(classId);
  const byReq = (a, b) => (a.req || 1) - (b.req || 1) || String(a.id).localeCompare(String(b.id));
  const own = cat.filter(sk => sk.spec === spec.id);
  if (own.length) return { from: 'spec', list: own.sort(byReq) };
  const byId = new Map(cat.map(sk => [sk.id, sk]));
  const count = new Map();
  for (const n of spec.nodes || []) {
    for (const id of [...(n.touch || []), ...(n.opts || []).flatMap(o => o.touch || [])]) {
      const sk = byId.get(id);
      if (sk && sk.cat !== 'basic') count.set(id, (count.get(id) || 0) + 1);
    }
  }
  const list = [...count].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, KIT_MAX).map(([id]) => byId.get(id)).sort(byReq);
  return { from: list.length ? 'touch' : 'none', list };
}
// opciones del desplegable «Configuración»: builds de la especialización + guardadas (+ «Personalizada»)
export function loadoutOptions(p, sel = 'custom') {
  const spec = p?.talents?.spec;
  if (!spec) return [];
  const out = Talents.buildsFor(p.classId, spec).map(b => ({ value: b.key, label: `${b.arch} · ${b.name}`, title: `${b.arch} · ${b.name}`, kind: 'build' }));
  (p.talents.loadouts?.[spec] || []).forEach((l, i) => out.push({ value: `saved:${i}`, label: `★ ${l.name}`, title: l.name, kind: 'saved' }));
  if (sel === 'custom' || !out.some(o => o.value === sel)) out.push({ value: 'custom', label: 'Personalizada (sin guardar)', title: 'Personalizada (sin guardar)', kind: 'custom' });
  return out.map(o => ({ ...o, selected: o.value === sel || (o.kind === 'custom' && !out.some(x => x.value === sel && x.kind !== 'custom')) }));
}
// ¿los talentos del jugador son exactamente una build de su especialización a su nivel? → clave | null
export function matchBuild(p) {
  const spec = p?.talents?.spec;
  if (!spec) return null;
  const want = Talents.defaultBuildKey(p.classId, spec);
  const keys = [want, ...Talents.buildsFor(p.classId, spec).map(b => b.key).filter(k => k !== want)].filter(Boolean);
  const same = (a, b) => JSON.stringify(sortObj(a || {})) === JSON.stringify(sortObj(b || {}));
  for (const key of keys) {
    const b = Talents.talentTreesFor(p.classId).builds[key];
    const r = Talents.buildRanks(p, b, { level: p.level | 0 });
    if (!same(r.cls, p.talents.cls) || !same(r.sp[spec], p.talents.sp?.[spec])) continue;
    if (r.hero) {
      const st = p.talents.hero?.[spec];
      if (st?.tree !== r.hero.tree || !same(r.hero.nodes[r.hero.tree], st.nodes?.[r.hero.tree])) continue;
    }
    return key;
  }
  return null;
}
const sortObj = o => Object.fromEntries(Object.entries(o).filter(([, v]) => v).sort(([a], [b]) => a.localeCompare(b)));

// ------------------------------------------------------------ vista completa
export function talentsView(p, opts = {}) {
  if (!p || !Talents.talentTreesFor(p.classId)) return null;
  OPS.ensure(p);
  const t = Talents.talentTreesFor(p.classId);
  const spec = Talents.activeSpec(p);
  const L = p.level | 0;
  const view = !spec || opts.chooser ? 'choose' : 'trees';
  const clsName = t.cls.name || p.classId;
  const head = {
    title: `Talentos · ${clsName}${spec ? ' ' + spec.name : ''}`,
    level: L,
    sub: spec ? 'gratis fuera de combate · se aplica al instante' : L < R.specAt ? `se abren al nivel ${R.specAt}` : 'elige tu especialización',
    emblem: spec ? (spec.emblem || `emblems/${spec.id}.webp`) : 'ui256/menu_talentos.webp',
    hasSpec: !!spec,
  };
  const heroTree = spec ? Talents.activeHeroTree(p) : null;
  const trees = { cls: treeViewOf(p, 'cls') };
  if (spec) {
    trees.spec = treeViewOf(p, 'spec');
    trees.hero = treeViewOf(p, 'hero');
  }
  const heads = { cls: colHead(p, 'cls', spec, heroTree) };
  if (spec) { heads.spec = colHead(p, 'spec', spec, heroTree); heads.hero = colHead(p, 'hero', spec, heroTree); }
  for (const w of Object.keys(trees)) if (trees[w]) trees[w].head = heads[w];
  const points = {};
  for (const w of ['cls', 'spec', 'hero']) {
    const earned = Talents.talentPointsEarned(p, w), left = Talents.talentPointsLeft(p, w);
    points[w] = { earned, left: Math.max(0, left), spent: Math.max(0, earned - left), total: R.pts[w] };
  }
  points.board = { earned: Talents.earnedAt('board', L), total: R.pts.board };
  return {
    classId: p.classId, className: clsName, level: L, view, head,
    spec: spec ? { id: spec.id, name: spec.name, icon: spec.icon || `specs/${spec.id}.webp`, emblem: spec.emblem || `emblems/${spec.id}.webp`, mechanic: spec.mechanic || null } : null,
    cls: { name: clsName, emblem: t.cls.emblem || null, art: t.cls.art || null },
    points, trees, kit: kitView(p),
    hero: spec ? heroView(p, spec) : null,
    chooser: view === 'choose' ? chooserView(p) : null,
  };
}

// ------------------------------------------------------------ diferencias entre dos vistas
// Lo que cambió de a → b (mismo árbol): el panel solo toca esos nodos, aristas y puertas.
//   → { rebuild: Set('cls'|'spec'|'hero'), nodes: [{ which, id, from, to }], edges: [{ which, id, to }],
//       gates: [{ which, row, from, to }], heads: Set(which), hero: bool }
export function viewDiff(a, b) {
  const out = { rebuild: new Set(), nodes: [], edges: [], gates: [], heads: new Set(), hero: false };
  for (const w of ['cls', 'spec', 'hero']) {
    const A = a?.trees?.[w], B = b?.trees?.[w];
    if (!B) { if (A) out.rebuild.add(w); continue; }
    if (!A || A.owner !== B.owner || A.nodes.length !== B.nodes.length) { out.rebuild.add(w); continue; }
    const an = new Map(A.nodes.map(n => [n.id, n]));
    for (const n of B.nodes) {
      const o = an.get(n.id);
      if (!o) { out.rebuild.add(w); break; }
      if (nodeSig(o) !== nodeSig(n)) out.nodes.push({ which: w, id: n.id, from: o, to: n });
    }
    const ae = new Map(A.edges.map(e => [e.id, e.state]));
    for (const e of B.edges) if (ae.get(e.id) !== e.state) out.edges.push({ which: w, id: e.id, from: ae.get(e.id) || null, to: e.state });
    A.gates.forEach((g, i) => { const h = B.gates[i]; if (h && (g.ok !== h.ok || g.label !== h.label)) out.gates.push({ which: w, row: h.row, from: g, to: h }); });
    if (JSON.stringify(A.head) !== JSON.stringify(B.head)) out.heads.add(w);
  }
  if (JSON.stringify(a?.hero) !== JSON.stringify(b?.hero)) out.hero = true;
  return out;
}
const nodeSig = n => `${n.state}|${n.rank}|${n.choice || ''}|${n.inner}|${n.icon}|${n.canAdd ? 1 : 0}|${n.room ? 1 : 0}`;

// ------------------------------------------------------------ tooltips (datos)
// tooltip de un nodo: título, tipo, una frase (o las dos opciones), «cuál conviene», habilidades
// que toca y estado. alt = detalle técnico (id y efectos).
export function nodeTooltip(p, which, id, { alt = false } = {}) {
  const tree = Talents.treeOf(p, which);
  const node = tree && Talents.nodeById(tree, id);
  if (!node) return null;
  const st = OPS.nodeState(p, which, node, tree);
  const spec = Talents.activeSpec(p);
  const owner = which === 'cls' ? 'clase' : which === 'spec' ? spec?.id : tree.hero?.id;
  const treeName = which === 'cls' ? (Talents.talentTreesFor(p.classId)?.cls?.name || '') : which === 'spec' ? (spec?.name || '') : `Paragon · ${tree.hero?.name || ''}`;
  const r = st.rank;
  const out = {
    id: node.id, which, name: node.name, t: node.t, kind: KIND_TEXT[node.t] || 'Talento', tree: treeName,
    rank: node.free ? 'gratis' : `rango ${r}/${node.max}`, tag: node.tag === 'mec' ? 'Mecánica' : 'Número', tagKey: node.tag || 'num',
    icon: nodeIconPath(p.classId, which, owner, node), shape: node.t === 'c' ? 'hex' : 'circle',
    final: node.final ? `Final de la rama «${node.final}». Con tus puntos llegas a uno al máximo; dos solo a rango 1` : null,
    hyb: node.hyb ? `Híbrido · ${node.hyb}` : null,
    opts: null, now: null, next: null, win: node.win || null, touches: [], touchLabel: null, status: null, statusKind: 'ok', alt: null,
  };
  if (node.t === 'c') {
    const ch = r > 0 ? (st.choice || node.opts[0].k) : null;
    out.opts = node.opts.map(o => ({ k: o.k, name: o.name, desc: o.desc || '', role: ROLE_TEXT[o.role] || '', act: !!o.fx?.grant, on: ch === o.k }));
  } else {
    const d = rr => Talents.nodeDesc(node, rr);
    out.now = (r > 0 ? 'Ahora: ' : '') + d(Math.max(1, r));
    if (r > 0 && r < node.max) { const nx = d(r + 1); if (nx !== d(r)) out.next = `Rango ${r + 1}: ${nx}`; }
  }
  const tc = nodeTouches(p.classId, node);
  out.touchLabel = tc.label || 'Habilidades que toca';
  out.touches = tc.ids.map(sid => { const sk = findSkill(p.classId, sid); return { id: sid, name: sk?.name || sid, icon: skillIconPath(p.classId, sk) }; });
  // estado
  const left = Talents.talentPointsLeft(p, which);
  if (st.state === 'paused') { out.status = `Paragon en pausa: vuelve a gastar tus ${R.pts.spec} puntos de especialización`; out.statusKind = 'lk'; }
  else if (which === 'hero' && !Talents.heroOpen(p)) { out.status = `Se abre con tus ${R.pts.spec} puntos de especialización gastados`; out.statusKind = 'lk'; }
  else if (node.free) { out.status = which === 'hero' ? 'Gratis al abrir el Paragon' : 'Gratis con la especialización'; out.statusKind = 'g'; }
  else if (st.maxed) { out.status = st.removeBlock || 'Al máximo · clic derecho para quitar'; out.statusKind = 'g'; }
  else if (st.gate || st.req) { out.status = st.gate || st.req; out.statusKind = 'lk'; }
  else if (left <= 0) { out.status = `Sin puntos libres de ${TREE_WORD[which]}`; out.statusKind = 'lk'; }
  else if (node.t === 'c' && r <= 0) { out.status = 'Elige A o B encima del nodo (clic en el icono: la última o la A)'; out.statusKind = 'ok'; }
  else { out.status = r > 0 ? 'Clic: +1 rango · clic derecho: −1' : 'Disponible: clic para aprender'; out.statusKind = 'ok'; }
  if (alt) {
    const fxs = node.t === 'c' ? node.opts.map(o => `${o.k}: ${fxSummary(o.fx)}`) : [fxSummary(node.fx)];
    out.alt = `${node.id} · ${fxs.join(' · ')}`;
  }
  return out;
}
function fxSummary(fx) {
  if (!fx) return '—';
  const parts = [];
  if (fx.power) parts.push(`poder ${fx.power}`);
  if (fx.grant) parts.push(`concede ${fx.grant}`);
  for (const k of ['stats', 'tv', 'elem', 'skillLv']) if (fx[k] && Object.keys(fx[k]).length) parts.push(`${k} ${Object.entries(fx[k]).map(([a, b]) => `${a}:${Array.isArray(b) ? b.join('/') : typeof b === 'object' ? JSON.stringify(b) : b}`).join(', ')}`);
  for (const [sel, m] of Object.entries(fx.mod || {})) parts.push(`${sel} ${Object.entries(m).map(([a, b]) => `${a}:${Array.isArray(b) ? b.join('/') : b}`).join(', ')}`);
  return parts.join(' · ') || 'sin efecto todavía';
}
// nodos (clase, especialización activa y héroe activo) que tocan una habilidad
export function nodesTouchingSkill(p, skillId) {
  const out = [];
  for (const w of ['cls', 'spec', 'hero']) {
    const tree = Talents.treeOf(p, w);
    if (!tree) continue;
    const owner = w === 'cls' ? 'clase' : w === 'spec' ? tree.spec?.id : tree.hero?.id;
    const ranks = Talents.ranksOf(p, w);
    for (const n of tree.nodes) if (nodeTouches(p.classId, n).ids.includes(skillId))
      out.push({ which: w, id: n.id, name: n.name, icon: nodeIconPath(p.classId, w, owner, n), rank: n.free ? 1 : (ranks[n.id] | 0) });
  }
  return out;
}
// tooltip de una habilidad de «Tu kit»
export function skillTooltip(p, skillId) {
  const sk = findSkill(p?.classId, skillId);
  if (!sk) return null;
  const spec = sk.spec ? Talents.findSpec(p.classId, sk.spec) : null;
  const origin = sk.kind === 'talent' ? 'Habilidad de talento' : spec ? spec.name : 'Kit base';
  const slots = skillSlots(sk).map(s => SLOT_LABEL[s]).filter(Boolean).join(' o ');
  return { id: sk.id, name: sk.name, icon: skillIconPath(p.classId, sk), talent: sk.kind === 'talent',
    kind: `${origin} · ${CAT_LABELS[sk.cat] || sk.cat}${slots ? ` · ${slots}` : ''}`, line: skillLine(sk),
    links: nodesTouchingSkill(p, skillId) };
}
// tooltip de una puerta
export function gateTooltip(gate) {
  if (!gate) return null;
  return { title: gate.apex ? 'Ápice' : `Puerta de la fila ${gate.row + 1}`,
    line: `Gasta ${gate.need} puntos en las filas de arriba${gate.level ? ` y llega al nivel ${gate.level}` : ''}.`,
    status: gate.ok ? '✓ Abierta' : `Llevas ${gate.have}/${gate.need}`, ok: gate.ok };
}
