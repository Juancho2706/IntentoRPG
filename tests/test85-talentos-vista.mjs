// Paso 2 · E3 (U1) — modelo puro del panel de talentos v2 (js/talents-view.js) y su contrato
// (docs/paso2-implementacion.md §3.12; diseño docs/paso2g-maga-coherencia.md §7.1, §9 y §10)
//  1) geometría del panel (1560 × 930, columnas 2 : 1 : 2) y escala a 1920 × 1080 y 1366 × 768
//  2) por clase, especialización y nivel (10, 40, 69, 70, 100): 30 + 29 + 13 nodos, rejilla 0–6 y
//     héroe 0–2 con .5, estados del contrato, aristas y puertas; nada se sale del lienzo ni se pisa
//     (A5 en el modelo: nodos, pastillas, letras A/B y etiquetas de puerta)
//  3) G6 formas: círculo (pasiva, clave, final, ápice), hexágono (elección), cuadrado (opción activa elegida)
//  4) Paragon: velo a Nv69 (30/31), abierto a Nv70 con la clave gratis, en pausa con nodos guardados
//  5) motivos de ops → texto (TALENT_REASONS, incluido 'empty'); textos cortos y sin jerga
//  6) redibujo por diferencias: un punto toca pocos nodos; cambiar de árbol héroe o de especialización
//     reconstruye solo esos árboles
//  7) tooltips, «habilidades que toca», Tu kit, configuraciones y build reconocida
//  8) G10 sobre css/talents.css: motion solo con transform / opacity / clip-path / stroke-dashoffset y
//     reducir movimiento sin pulsos, chispas ni sacudidas
//  9) ui-talents.js se importa sin DOM, contrato de DOM (§3.12) y envoltorio gameTalentOps sobre el mixin real
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeHarness } from './helpers/power-harness.mjs';
import * as Talents from '../js/talents.js';
import { TALENT_REASONS } from '../js/talents-ops.js';
import { talentMethods } from '../js/game-talents.js';
import {
  talentsView, viewDiff, panelScale, TALENT_PANEL, TREE_CANVAS, NODE_BOX, nodeBoxes, boxHit, gateLabelW, gateBoxes,
  REASON_TEXT, reasonText, nodeTooltip, skillTooltip, gateTooltip, nodeTouches, nodesTouchingSkill,
  loadoutOptions, matchBuild, kitView, chooserView, contractState,
} from '../js/talents-view.js';
import * as UI from '../js/ui-talents.js';

const CLS = { maga: ['piromante', 'crionte', 'arcanista'], guerrero: ['berserker', 'guardian', 'cruzado'], arquera: ['tiradora', 'francotiradora', 'montaraz'] };
const STATES = new Set(['locked', 'avail', 'partial', 'max', 'paused']);
const hero = (classId, spec, level, extra = {}) => makeHarness({ classId, spec, level, build: true, ...extra });

// ------------------------------------------------ 1) geometría y escala
const P = TALENT_PANEL;
assert.equal(P.w, 1560); assert.equal(P.h, 930);
const sideW = TREE_CANVAS.cls.colW, midW = TREE_CANVAS.hero.colW;
assert.equal(TREE_CANVAS.spec.colW, sideW, 'clase y especialización miden lo mismo');
assert.ok(Math.abs(sideW / midW - 2) < 0.1, `columnas 2 : 1 : 2 (${sideW} : ${midW})`);
assert.equal(2 * sideW + midW + 2 * P.gap, P.w - 2 * P.padX, 'las tres columnas llenan el ancho');
assert.ok(TREE_CANVAS.cls.x0 < TREE_CANVAS.hero.x0 && TREE_CANVAS.hero.x0 < TREE_CANVAS.spec.x0, 'orden clase · Paragon · especialización');
for (const w of ['cls', 'hero', 'spec']) {
  const c = TREE_CANVAS[w];
  assert.ok(c.x0 + c.w <= P.w - P.padX && c.y0 + c.h <= P.h - P.padY - P.footH - P.gap, `lienzo ${w} dentro del cuerpo`);
}
assert.equal(panelScale(1920, 1080), 1, '1920 × 1080 → escala 1 (la del mockup)');
assert.equal(panelScale(1366, 768), 0.8, '1366 × 768 → escala 0,8 (la del mockup)');
for (const [vw, vh] of [[1920, 1080], [1366, 768], [1280, 720], [2560, 1440], [1600, 900]]) {
  const s = panelScale(vw, vh);
  assert.ok(P.w * s <= vw - 8 && P.h * s <= vh - 8, `${vw}×${vh}: el panel cabe (escala ${s})`);
}
console.log(`Geometría: columnas ${sideW} · ${midW} · ${sideW}; escala 1 a 1920, 0,8 a 1366 ✓`);

// ------------------------------------------------ 2) árboles colocados, estados, aristas y puertas
const insideCanvas = (tv, b) => b.l >= 0 && b.t >= 0 && b.r <= tv.w && b.b <= tv.h;
function checkTree(tv, tag) {
  const want = { cls: 30, spec: 29, hero: 13 }[tv.which];
  assert.equal(tv.nodes.length, want, `${tag}: ${want} nodos`);
  const cs = [...new Set(tv.nodes.map(n => n.c))].sort((a, b) => a - b);
  if (tv.which === 'hero') assert.deepEqual(cs, [0, 0.5, 1, 1.5, 2], `${tag}: héroe en columnas 0–2 con .5`);
  else assert.ok(cs[0] === 0 && cs.at(-1) === 6 && cs.every(Number.isInteger), `${tag}: rejilla 0–6`);
  const rows = Math.max(...tv.nodes.map(n => n.r)) + 1;
  assert.equal(rows, { cls: 9, spec: 10, hero: 6 }[tv.which], `${tag}: filas`);
  for (const n of tv.nodes) {
    assert.ok(STATES.has(n.state), `${tag}/${n.id}: estado «${n.state}» del contrato`);
    for (const b of nodeBoxes(n)) assert.ok(insideCanvas(tv, b), `${tag}/${n.id}: ${b.kind} dentro del lienzo`);
    // misma columna → misma x; misma fila → misma y (la rejilla manda)
    assert.ok(tv.nodes.filter(m => m.c === n.c).every(m => m.x === n.x), `${tag}/${n.id}: x por columna`);
    assert.ok(tv.nodes.filter(m => m.r === n.r).every(m => m.y === n.y), `${tag}/${n.id}: y por fila`);
    assert.deepEqual([n.w, n.h], NODE_BOX[n.t], `${tag}/${n.id}: caja de su tipo`);
  }
  // A5 en el modelo: ninguna caja (icono, pastilla, letra) pisa la de OTRO nodo; ninguna etiqueta de puerta pisa nada
  const boxes = tv.nodes.flatMap(n => nodeBoxes(n).map(b => ({ ...b, id: n.id })));
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], b = boxes[j];
    if (a.id !== b.id) assert.ok(!boxHit(a, b), `${tag}: ${a.id}.${a.kind} pisa ${b.id}.${b.kind}`);
  }
  for (const g of tv.gates) {
    if (g.apex) continue;
    const { label, seal } = gateBoxes(g.gx, g.y, gateLabelW(`${g.need}/${g.need}`));
    assert.ok(insideCanvas(tv, label) && insideCanvas(tv, seal), `${tag}: etiqueta de la puerta ${g.row} dentro`);
    for (const b of boxes) assert.ok(!boxHit(b, label) && !boxHit(b, seal), `${tag}: la puerta ${g.row} pisa ${b.id}.${b.kind}`);
  }
  // aristas: una por requisito, con su estado
  const by = new Map(tv.nodes.map(n => [n.id, n]));
  assert.equal(tv.edges.length, tv.nodes.reduce((s, n) => s + n.req.length, 0), `${tag}: una arista por requisito`);
  for (const e of tv.edges) {
    const a = by.get(e.from), b = by.get(e.to);
    const on = a.rank >= a.max && a.rank > 0;
    assert.equal(e.state, on && b.rank > 0 ? 'live' : on ? 'on' : 'off', `${tag}: arista ${e.id}`);
    assert.ok(Math.hypot(e.x2 - e.x1, e.y2 - e.y1) < Math.hypot(b.x - a.x, b.y - a.y), `${tag}: arista ${e.id} recortada`);
  }
  return true;
}
let checked = 0;
for (const [cls, specs] of Object.entries(CLS)) for (const spec of specs) for (const lvl of [10, 40, 69, 70, 100]) {
  const h = hero(cls, spec, lvl);
  const v = talentsView(h.p);
  assert.equal(v.view, 'trees', `${cls}/${spec} Nv${lvl}: vista de árboles`);
  for (const w of ['cls', 'spec', 'hero']) checkTree(v.trees[w], `${cls}/${spec} Nv${lvl} ${w}`);
  assert.equal(v.trees.cls.gates.length, 2, 'clase: 2 puertas');
  assert.deepEqual(v.trees.spec.gates.map(g => [g.row, g.need, g.apex]), [[4, 8, false], [7, 20, false], [9, 25, true]], 'especialización: 8 · 20 · ápice 25');
  assert.ok(v.trees.spec.apex && v.trees.spec.apex.row === 9, 'banda del ápice en la fila 9');
  assert.ok(!v.trees.cls.apex && !v.trees.hero.gates.length, 'clase sin ápice; héroe sin puertas');
  // cabeceras «Gastados X / Y»
  const pts = { cls: 34, spec: 31, hero: 10 };
  for (const w of ['cls', 'spec', 'hero']) {
    const hd = v.trees[w].head;
    assert.equal(hd.total, pts[w], `${w}: presupuesto ${pts[w]}`);
    assert.equal(hd.text, `Gastados ${hd.spent} / ${pts[w]}`);
    assert.equal(hd.spent, Talents.spentIn(Talents.treeOf(h.p, w), Talents.ranksOf(h.p, w)), `${w}: gastados`);
  }
  // una puerta abierta = puntos de arriba ≥ los que pide
  for (const g of v.trees.spec.gates) assert.equal(g.ok, g.have >= g.need, `puerta ${g.row}`);
  assert.ok(v.trees.spec.gates.every(g => g.label === `${g.apex ? 'Ápice · ' : ''}${g.ok ? '' : `${g.have}/`}${g.need}`), 'etiquetas de puerta');
  assert.equal(v.head.title, `Talentos · ${Talents.talentTreesFor(cls).cls.name} ${Talents.findSpec(cls, spec).name}`);
  checked++;
}
assert.equal(checked, 45);
// estado del contrato a partir de ops.nodeState
assert.equal(contractState({ state: 'available' }), 'avail');
assert.equal(contractState({ state: 'free' }), 'max');
assert.equal(contractState({ state: 'open' }), 'locked', 'abierto sin puntos = bloqueado');
console.log(`Árboles: 3 clases × 3 especializaciones × 5 niveles; rejilla, estados, aristas y puertas sin solapes ✓`);

// ------------------------------------------------ 3) G6 formas
{
  const h = hero('maga', 'piromante', 100);
  const v = talentsView(h.p);
  for (const w of ['cls', 'spec', 'hero']) for (const n of v.trees[w].nodes) {
    assert.equal(n.shape, n.t === 'c' ? 'hex' : 'circle', `${w}/${n.id}: forma`);
    if (n.t !== 'c') assert.equal(n.inner, 'circle');
    else assert.equal(n.inner, n.rank > 0 ? (n.actChosen ? 'square' : 'circle') : 'split', `${w}/${n.id}: interior del hexágono`);
  }
  // una opción ACTIVA elegida se ve cuadrada; la otra opción del mismo nodo, redonda
  let act = null;
  for (const cls of Object.keys(CLS)) {
    const node = Talents.talentTreesFor(cls).cls.nodes.find(n => n.t === 'c' && n.opts.some(o => o.fx?.grant));
    if (node) { act = { cls, node }; break; }
  }
  assert.ok(act, 'algún nodo de clase ofrece una activa (grant)');
  const k = act.node.opts.find(o => o.fx?.grant).k, other = act.node.opts.find(o => o.k !== k).k;
  const spec = CLS[act.cls][0];
  for (const [kk, want] of [[k, 'square'], [other, 'circle']]) {
    const hh = makeHarness({ classId: act.cls, spec, level: 100, talents: { cls: { [act.node.id]: 1 }, choice: { [act.node.id]: kk } } });
    const n = talentsView(hh.p).trees.cls.nodes.find(x => x.id === act.node.id);
    assert.equal(n.inner, want, `${act.node.id} con ${kk}: interior ${want}`);
    assert.equal(n.hasAct, true, `${act.node.id}: marca de activa en el hexágono`);
    assert.equal(n.choice, kk);
  }
  console.log(`G6: círculo · hexágono · cuadrado (${act.cls}/${act.node.id}) ✓`);
}

// ------------------------------------------------ 4) Paragon: velo, apertura y pausa
{
  const v69 = talentsView(hero('maga', 'piromante', 69).p);
  assert.ok(!v69.hero.open && v69.hero.veil, 'Nv69: velo');
  assert.ok(v69.trees.hero.nodes.every(n => n.state === 'locked'), 'Nv69: el Paragon en gris');
  assert.equal(v69.hero.veil.count, '30/31');
  assert.equal(v69.hero.veil.title, 'Paragon');
  assert.equal(v69.hero.veil.when, 'El último punto se gana al nivel 70');
  assert.equal(v69.hero.veil.previews.length, 2, 'avance de los dos árboles de la especialización');
  assert.ok(v69.trees.hero.head.meta.includes('Espec. 30/31'), 'cabecera del Paragon cerrado');
  const v70 = talentsView(hero('maga', 'piromante', 70).p);
  assert.ok(v70.hero.open && !v70.hero.veil, 'Nv70 con 31/31: Paragon abierto');
  const key = v70.trees.hero.nodes.find(n => n.free);
  assert.equal(key.state, 'max', 'la clave del héroe, gratis');
  assert.ok(v70.trees.hero.head.meta.includes('1.er punto al Nv71'), 'abierto antes del 71');
  assert.equal(v70.hero.trees.length, 2);
  assert.ok(v70.hero.other && v70.hero.other.title.includes(':'), 'el tercer árbol, apagado con sus especializaciones');
  // pausa: Nv75 con 5 nodos del héroe y la especialización a 30/31
  const h = hero('guerrero', 'berserker', 75);
  const ranks = Talents.ranksOf(h.p, 'spec');
  const id = Object.keys(ranks).reverse().find(x => Talents.canRemoveRank(h.p, 'spec', x));
  ranks[id]--; if (!ranks[id]) delete ranks[id];
  const vp = talentsView(h.p);
  assert.ok(vp.hero.paused && !vp.hero.open, 'Paragon en pausa');
  assert.equal(vp.hero.veil.title, 'Paragon en pausa');
  assert.match(vp.hero.veil.kept, /^Tus 5 puntos del Paragon se guardan/);
  assert.match(vp.hero.veil.when, /^Te queda 1 punto por gastar en el árbol de Berserker$/);
  const paused = vp.trees.hero.nodes.filter(n => n.state === 'paused');
  assert.equal(paused.length, 6, 'los 5 nodos con rango y la clave, en pausa');
  assert.ok(paused.some(n => n.free) && paused.filter(n => !n.free).every(n => n.rank === 1), 'en pausa conservan su rango');
  assert.ok(vp.trees.hero.nodes.filter(n => n.state !== 'paused').every(n => n.state === 'locked'));
  console.log('Paragon: velo a Nv69, abierto a Nv70 con la clave gratis, en pausa con sus nodos ✓');
}

// ------------------------------------------------ 5) motivos → texto
assert.deepEqual(Object.keys(REASON_TEXT).sort(), [...TALENT_REASONS].sort(), 'un texto por cada motivo de TALENT_REASONS (y ninguno más)');
assert.ok(TALENT_REASONS.includes('empty'));
for (const [k, e] of Object.entries(REASON_TEXT)) {
  assert.ok(e.text.length > 8 && e.text.length <= 70, `${k}: texto corto`);
  assert.ok(!/\b(UNI|ÁREA×5|TTD|stagger|proc)\b|astadora/.test(e.text), `${k}: sin jerga`);
}
assert.equal(reasonText({ ok: true }), null);
assert.equal(reasonText({ ok: false, reason: 'gate', text: 'Gasta 8 puntos en las filas de arriba (llevas 3)' }), 'Gasta 8 puntos en las filas de arriba (llevas 3)', 'puerta: el detalle de la respuesta');
assert.equal(reasonText({ ok: false, reason: 'max', text: 'otra cosa' }), 'Ya está al máximo', 'máximo: el texto fijo');
assert.equal(reasonText({ ok: false, reason: 'empty' }), 'No tiene rangos que quitar');
assert.equal(reasonText({ ok: false, reason: 'combat', text: '⚔️ Solo fuera de combate' }), 'En combate no puedes cambiar talentos');
assert.equal(reasonText({ ok: false, reason: 'code-version' }), REASON_TEXT['code-version'].text, 'sin detalle: el fijo');
assert.equal(reasonText({ ok: false, reason: 'raro', text: '' }), REASON_TEXT.unknown.text, 'motivo desconocido: el genérico');
console.log(`Motivos: ${TALENT_REASONS.length} códigos con texto (puerta y códigos con su detalle) ✓`);

// ------------------------------------------------ 6) redibujo por diferencias
{
  const h = hero('maga', 'piromante', 60);
  const g = h.g;
  Object.assign(g, talentMethods);
  // se quita un punto (queda libre) y se vuelve a gastar
  const id = Object.keys(Talents.ranksOf(h.p, 'spec')).reverse().find(x => Talents.canRemoveRank(h.p, 'spec', x));
  assert.ok(g.removeTalentRank('spec', id).ok, `quitar ${id}`);
  const a = talentsView(h.p);
  const avail = a.trees.spec.nodes.find(n => n.id === id);
  assert.ok(avail.state === 'avail' || avail.state === 'partial', `${id} disponible (${avail.state})`);
  const r = g.addTalentRank('spec', avail.id);
  assert.ok(r.ok, `gastar ${avail.id}`);
  const b = talentsView(h.p);
  let d = viewDiff(a, b);
  assert.equal(d.rebuild.size, 0, 'un punto no reconstruye ningún árbol');
  assert.ok(d.nodes.some(c => c.id === avail.id && c.to.rank === c.from.rank + 1), 'el nodo gastado cambia');
  assert.ok(d.nodes.length < 30, `un punto toca pocos nodos (${d.nodes.length} de 72)`);
  assert.deepEqual(viewDiff(b, talentsView(h.p)).nodes, [], 'sin cambios, sin diferencias');
  // árbol héroe y especialización: solo esos árboles
  const h2 = hero('maga', 'piromante', 100);
  Object.assign(h2.g, talentMethods);
  const v0 = talentsView(h2.p);
  const otherTree = v0.hero.trees.find(t => !t.on).id;
  assert.ok(h2.g.chooseHeroTree(otherTree).ok);
  d = viewDiff(v0, talentsView(h2.p));
  assert.deepEqual([...d.rebuild], ['hero'], 'cambiar de árbol héroe reconstruye solo el héroe');
  const v1 = talentsView(h2.p);
  assert.ok(h2.g.chooseSpec('crionte').ok);
  d = viewDiff(v1, talentsView(h2.p));
  assert.deepEqual([...d.rebuild].sort(), ['hero', 'spec'], 'cambiar de especialización: especialización y héroe; la clase se parchea');
  console.log('Diferencias: un punto toca pocos nodos; héroe y especialización reconstruyen solo lo suyo ✓');
}

// ------------------------------------------------ 7) tooltips, toques, kit y configuraciones
{
  const h = hero('maga', 'piromante', 100);
  const p = h.p;
  const v = talentsView(p);
  const hex = v.trees.cls.nodes.find(n => n.t === 'c' && n.rank > 0);
  const t = nodeTooltip(p, 'cls', hex.id, { alt: true });
  assert.equal(t.opts.length, 2);
  assert.ok(t.opts.every(o => o.role && o.desc), 'opciones con papel y frase');
  assert.equal(t.opts.filter(o => o.on).length, 1, 'una opción elegida');
  assert.ok(t.win, 'la caja «cuál conviene»');
  assert.ok(t.alt.startsWith(hex.id), 'Alt: detalle técnico con el id');
  const pas = v.trees.spec.nodes.find(n => n.t === 'p' && n.rank > 0 && n.rank < n.max) || v.trees.spec.nodes.find(n => n.t === 'p' && n.rank > 0);
  const tp = nodeTooltip(p, 'spec', pas.id);
  assert.ok(tp.now.startsWith('Ahora: '), 'pasiva con rango: «Ahora: …»');
  assert.equal(nodeTooltip(p, 'cls', 'zz'), null);
  assert.equal(nodeTooltip(p, 'spec', 's0').status, 'Gratis con la especialización');
  // grupos: «Toca todo tu Fuego» (Maga @fire) y el daño sagrado del Guerrero (@holy)
  const s0 = Talents.findSpec('maga', 'piromante').nodes.find(n => n.id === 's0');
  const tc = nodeTouches('maga', s0);
  assert.equal(tc.label, 'Toca todo tu Fuego');
  assert.ok(tc.ids.includes('bola_fuego') && tc.ids.every(id => p.cls.skills.some(s => s.id === id)), 'ids del catálogo');
  const holy = [...Talents.talentTreesFor('guerrero').cls.nodes, ...Talents.talentTreesFor('guerrero').specs.flatMap(s => s.nodes)].find(n => (n.touch || []).includes('@holy'));
  assert.equal(nodeTouches('guerrero', holy).label, 'Toca todo tu daño sagrado');
  // al revés: los talentos que tocan una habilidad (Tu kit)
  const links = nodesTouchingSkill(p, 'bola_fuego');
  assert.ok(links.some(x => x.id === 'c6' && x.which === 'cls'), 'Bola de Fuego: c6 la toca');
  assert.ok(links.some(x => x.which === 'spec' && x.id === 's0'), 'y la clave del Piromante (todo tu Fuego)');
  assert.ok(!nodesTouchingSkill(p, 'no_existe').length);
  const st = skillTooltip(p, 'bola_fuego');
  assert.ok(st.kind.startsWith('Kit base · Principal · DER o 2'), st.kind);
  assert.ok(st.links.length === links.length && st.line.length > 10);
  // activas de talento: el icono es el del nodo que la concede
  const grantNode = Talents.talentTreesFor('maga').cls.nodes.find(n => n.opts?.some(o => o.fx?.grant === 'm_t_bloque'));
  const hg = makeHarness({ classId: 'maga', spec: 'piromante', level: 100, talents: { cls: { [grantNode.id]: 1 }, choice: { [grantNode.id]: 'A' } } });
  const kit = kitView(hg.p);
  const bloque = kit.find(k => k.id === 'm_t_bloque');
  assert.ok(bloque && bloque.talent, 'la activa concedida entra en Tu kit');
  assert.equal(bloque.icon, grantNode.opts.find(o => o.k === 'A').icon || grantNode.icon, 'con el icono de su nodo');
  assert.ok(kit.every(k => k.icon), 'todo el kit con icono (o marcador)');
  // puerta
  const gt = gateTooltip(v.trees.spec.gates[0]);
  assert.equal(gt.title, 'Puerta de la fila 5');
  assert.equal(gateTooltip(v.trees.spec.gates[2]).title, 'Ápice');
  // configuraciones: builds de la especialización con nombre completo, guardadas y «Personalizada»
  const key = matchBuild(p);
  assert.equal(key, Talents.defaultBuildKey('maga', 'piromante'), 'reconoce la recomendada aplicada');
  let lo = loadoutOptions(p, key);
  assert.equal(lo.filter(o => o.kind === 'build').length, Talents.buildsFor('maga', 'piromante').length);
  assert.ok(lo.every(o => o.title && o.label.endsWith(o.title.split(' · ').at(-1))), 'nombre completo en title');
  assert.equal(lo.filter(o => o.selected).length, 1);
  assert.ok(!lo.some(o => o.kind === 'custom'), 'sin «Personalizada» si es una build');
  Object.assign(h.g, talentMethods);
  assert.ok(h.g.saveTalentLoadout('Lluvia larga').ok);
  lo = loadoutOptions(p, 'custom');
  assert.ok(lo.some(o => o.label === '★ Lluvia larga' && o.value === 'saved:0'));
  assert.ok(lo.find(o => o.kind === 'custom').selected);
  const rr = h.g.removeTalentRank('spec', Object.keys(Talents.ranksOf(p, 'spec')).reverse().find(x => Talents.canRemoveRank(p, 'spec', x)));
  assert.ok(rr.ok);
  assert.equal(matchBuild(p), null, 'tras tocar un punto ya no es la build');
  // selector de especialización
  const ch = chooserView(makeHarness({ classId: 'arquera', level: 5 }).p);
  assert.equal(ch.length, 3);
  assert.ok(ch.every(c => c.locked && !c.current && c.mechanic && c.role && c.line), 'Nv5: tres tarjetas bloqueadas con rol, línea y mecánica');
  const v5 = talentsView(makeHarness({ classId: 'arquera', level: 5 }).p);
  assert.equal(v5.view, 'choose');
  assert.equal(v5.head.sub, 'se abren al nivel 10');
  assert.ok(!v5.trees.spec && !v5.hero, 'sin especialización no hay árbol ni Paragon');
  console.log('Tooltips, toques por grupo, Tu kit, configuraciones y selector ✓');
}

// ------------------------------------------------ 8) G10: motion en css/talents.css
{
  const css = readFileSync(new URL('../css/talents.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const ALLOWED = new Set(['transform', 'opacity', 'clip-path', 'stroke-dashoffset']);
  const frames = [...css.matchAll(/@keyframes\s+([\w-]+)\s*\{((?:[^{}]*\{[^{}]*\})*)\s*\}/g)];
  assert.ok(frames.length >= 15, `keyframes del panel (${frames.length})`);
  for (const [, name, body] of frames) {
    const props = [...body.matchAll(/([a-z-]+)\s*:/g)].map(m => m[1]);
    for (const pr of props) assert.ok(ALLOWED.has(pr), `@keyframes ${name}: «${pr}» no es transform/opacity/clip-path/stroke-dashoffset`);
  }
  for (const m of css.matchAll(/transition\s*:\s*([^;}]+)/g)) {
    for (const part of m[1].split(/,(?![^(]*\))/)) assert.ok(ALLOWED.has(part.trim().split(/\s+/)[0]), `transition: «${part.trim()}»`);
  }
  assert.ok(!/transition\s*:\s*all/.test(css), 'sin transition: all');
  const rm = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
  assert.ok(css.includes('@media (prefers-reduced-motion: reduce)') && css.includes('body.reduce-motion #talents-panel'), 'reducir movimiento: preferencia del sistema y opción del juego');
  for (const sel of ['.tn-burst', '.tn.fx-spend::before', '.tn.fx-max .tn-face::before', '.tp-beam']) assert.ok(rm.includes(sel), `reducir movimiento oculta ${sel}`);
  assert.ok(/animation-name:\s*tpFadeIn\s*!important/.test(rm), 'reducir movimiento: solo fundidos');
  for (const n of ['tpPulse', 'tpRing', 'tpSpark', 'tpDeny', 'tpFlip', 'tpShine', 'tpSealL', 'tpBeam', 'tpVeil', 'tpIris', 'tpRise', 'tpReflow', 'tpDraw', 'halfA'])
    assert.ok(frames.some(f => f[1] === n), `motion de 2g §10: ${n}`);
  console.log(`G10: ${frames.length} keyframes solo con transform/opacity/clip-path/stroke-dashoffset; reducir movimiento ✓`);
}

// ------------------------------------------------ 9) ui-talents.js: sin DOM, contrato y ops del juego
{
  assert.equal(typeof UI.createTalentPanel, 'function');
  assert.equal(typeof UI.gameTalentOps, 'function');
  const src = readFileSync(new URL('../js/ui-talents.js', import.meta.url), 'utf8');
  for (const s of ["'talents-panel'", 'dataset.open', '`tn t-', 'data-node=', 'data-state=', 'tn-choice', 'data-k=', 'tp-gate', 'data-row=', 'tp-hero', 'data-paused', 'ico-missing', '__uicheck', 'talentscheck', 'data-tree='])
    assert.ok(src.includes(s), `contrato de DOM (§3.12): ${s}`);
  // ni `powers.has(` ni lecturas de layout por frame (requestAnimationFrame solo para reiniciar clases)
  assert.ok(!src.includes('powers.has('));
  // el envoltorio sobre el mixin real: mutaciones silenciosas, deshacer por snapshot/restore
  const h = hero('arquera', 'montaraz', 50);
  Object.assign(h.g, talentMethods);
  const ops = UI.gameTalentOps(h.g);
  for (const k of ['addTalentRank', 'removeTalentRank', 'chooseTalentOption', 'chooseSpec', 'chooseHeroTree', 'applyTalentBuild', 'saveTalentLoadout',
    'applyTalentLoadout', 'resetTalentTree', 'exportTalentCode', 'importTalentCode', 'snapshot', 'restore'])
    assert.equal(typeof ops[k], 'function', `ops.${k}`);
  const code0 = ops.exportTalentCode();
  const snap = ops.snapshot(h.p);
  const msgs = h.g.ui.messages.length;
  const rs = ops.resetTalentTree('all');
  assert.ok(rs.ok && ops.exportTalentCode() !== code0, 'reiniciar cambia la build');
  assert.equal(h.g.ui.messages.length, msgs, 'desde el panel, sin avisos del mixin (_talentQuiet)');
  assert.ok(ops.restore(h.p, snap).ok, 'deshacer');
  assert.equal(ops.exportTalentCode(), code0, 'deshacer devuelve la build exacta');
  assert.equal(h.g._talentQuiet, undefined, 'el envoltorio deja _talentQuiet como estaba');
  // en combate: código y motivo
  h.g.combatFree = false;
  const rc = ops.addTalentRank('cls', 'c1');
  assert.equal(rc.reason, 'combat');
  assert.equal(reasonText(rc), 'En combate no puedes cambiar talentos');
  const rr = ops.restore(h.p, snap);
  assert.equal(rr.reason, 'combat', 'deshacer también respeta el combate');
  h.g.combatFree = true;
  assert.equal(reasonText(ops.removeTalentRank('cls', 'c30')), 'No tiene rangos que quitar', "'empty' traducido");
  // mechInfo y SPEC_INFO (el resto, en test76)
  assert.equal(UI.mechInfo(null), null);
  console.log('ui-talents.js: se importa sin DOM, contrato de DOM y ops del mixin (silenciosas, deshacer, combate) ✓');
}

console.log('\n✅ PANEL DE TALENTOS v2: VISTA PURA (Paso 2 · E3 · U1) OK');
