#!/usr/bin/env node
// =====================================================================================================
// Validador de talentos v2 (Paso 2g) · una clase o todas
// -----------------------------------------------------------------------------------------------------
// Carga data/talents-v2-comun.js + data/talents-v2-<clase>.js (los mismos scripts que el mockup) y comprueba
// el contrato de data/README-talents-v2.md: formato, rejillas, presupuesto, puertas, builds punto a punto
// hasta el Nv100, textos (largo, siglas, anglicismos) y el kit del libro.
//
//   node docs/mockups/data/validar-talentos.mjs maga                  validación completa (debe pasar)
//   node docs/mockups/data/validar-talentos.mjs guerrero --estructura solo formato (un esqueleto pasa)
//   node docs/mockups/data/validar-talentos.mjs --todas               todas las clases (los esqueletos, solo formato)
//   node docs/mockups/data/validar-talentos.mjs maga --tablas         tablas Markdown generadas de los datos (para el doc)
//   node docs/mockups/data/validar-talentos.mjs guerrero --plantilla spec berserker b   árbol a rellenar (cls | spec <id> <prefijo> | hero <id> <prefijo>)
//   … --sin-avisos   oculta los avisos (solo errores)
// Sale con código 1 si hay errores.
// Port de la comprobación v4 de la Maga (check4.js: builds punto a punto, textos ≤ 120, rangos por fila).
// =====================================================================================================
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const DIR = dirname(fileURLToPath(import.meta.url));
const ASSETS = 'D:/Proyectos/IntentoRPG-assets/web/'; // arte (si existe la carpeta, se avisa de los iconos que faltan)
const argv = process.argv.slice(2);
const flag = f => argv.includes(f);
const CLS_ARG = argv.find(a => !a.startsWith('--') && !argv[argv.indexOf(a) - 1]?.startsWith('--plantilla'));

// ------------------------------------------------------------------ carga (como el navegador: scripts clásicos sobre window)
function cargar(cls) {
  const ctx = { console }; ctx.window = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
  vm.runInContext(readFileSync(join(DIR, 'talents-v2-comun.js'), 'utf8'), ctx, { filename: 'talents-v2-comun.js' });
  const archivo = join(DIR, `talents-v2-${cls}.js`);
  if (!existsSync(archivo)) return { TV2: ctx.TV2, C: null, archivo };
  vm.runInContext(readFileSync(archivo, 'utf8'), ctx, { filename: `talents-v2-${cls}.js` });
  return { TV2: ctx.TV2, C: ctx.TALENTS_V2_CLASSES?.[cls] || null, archivo };
}

// ------------------------------------------------------------------ utilidades
const ROLES = ['UNI', 'AREA', 'CTRL', 'AGU'];
const ROLES_FORJA = ['UNI', 'AREA', 'CTRL', 'AGU', 'APO', 'MOV'];
const CATS = ['basic', 'spender', 'movement', 'defense', 'utility', 'spec', 'ultimate'];
const ELEMS = ['physical', 'fire', 'frost', 'arcane', 'nature', 'holy'];
const PROHIBIDO = /\bUNI\b|ÁREA×5|\bTTD\b|stagger|\bprocs?\b|gastadora/i;
const PENDIENTE = /por diseñar/i;
const num = id => +String(id).replace(/^\D+/, '');
const pref = id => String(id).replace(/\d+$/, '');
const isStr = v => typeof v === 'string' && v.trim() !== '';
const nodosDe = C => [...(C.tree?.cls || []), ...Object.values(C.tree?.spec || {}).flat(), ...(C.tree?.hero || []).flatMap(h => h.nodes || [])];

function nuevoInforme(cls) {
  const r = { cls, err: [], av: [], info: [] };
  r.e = (sec, m) => r.err.push(`[${sec}] ${m}`);
  r.a = (sec, m) => r.av.push(`[${sec}] ${m}`);
  r.i = (sec, m) => r.info.push(`[${sec}] ${m}`);
  return r;
}
// texto(s) de efecto de un nodo: [rango, texto] (el ápice, por segmento «N) …»)
function textosNodo(n, R, sec) {
  const out = [];
  if (n.t === 'c') { for (const o of n.opts || []) out.push([`${n.id}${o.k}`, o.d]); return out; }
  if (typeof n.d !== 'function') { R.e(sec, `${n.id}: falta d(r) (función que devuelve el efecto en el rango r)`); return out; }
  for (let r = 1; r <= (n.max || 1); r++) {
    let t; try { t = n.d(r); } catch (e) { R.e(sec, `${n.id}: d(${r}) lanza ${e.message}`); continue; }
    if (!isStr(t)) { R.e(sec, `${n.id}: d(${r}) no devuelve texto`); continue; }
    if (/undefined|NaN/.test(t)) R.e(sec, `${n.id}: d(${r}) contiene «undefined» o «NaN»: ${t}`);
    if (n.t === 'x') { const seg = t.split(/\s(?=\d\)\s)/).pop(); out.push([`${n.id}·r${r}`, seg]); } else out.push([`${n.id}·r${r}`, t]);
  }
  return out;
}

// ------------------------------------------------------------------ 1. ESTRUCTURA (formato)
function validarEstructura(TV2, C, R) {
  const cls = R.cls, ROS = TV2.CLASES[cls];
  if (!C) { R.e('registro', `no hay window.TALENTS_V2_CLASSES['${cls}'] (¿falta data/talents-v2-${cls}.js o tiene otro id?)`); return false; }
  if (C.id !== cls) R.e('registro', `id «${C.id}» distinto de «${cls}»`);
  if (C.formato !== TV2.formato) R.e('registro', `formato ${C.formato} (el contrato es el ${TV2.formato})`);
  if (!['esqueleto', 'diseño', 'aprobado'].includes(C.estado)) R.a('registro', `estado «${C.estado}»: usa esqueleto | diseño | aprobado`);
  for (const k of ['name', 'res', 'resIcon', 'emblem', 'clsArt']) if (!isStr(C[k])) R.e('clase', `falta ${k} (texto)`);
  if (!ROS) R.a('clase', `${cls} no está en TV2.CLASES (talents-v2-comun.js): el selector de clase no la mostrará`);
  const specs = C.specOrder || [];
  if (!Array.isArray(specs) || specs.length !== 3) R.e('especializaciones', 'specOrder debe tener 3 ids');
  if (ROS && JSON.stringify([...specs].sort()) !== JSON.stringify([...ROS.specs].sort())) R.e('especializaciones', `specOrder ${JSON.stringify(specs)} ≠ las del juego ${JSON.stringify(ROS.specs)}`);
  if (!specs.includes(C.defaultSpec)) R.e('especializaciones', `defaultSpec «${C.defaultSpec}» no está en specOrder`);
  for (const id of specs) {
    const m = C.specs?.[id];
    if (!m) { R.e('especializaciones', `falta specs.${id}`); continue; }
    if (m.id !== id) R.e('especializaciones', `specs.${id}.id = «${m.id}»`);
    for (const k of ['name', 'role', 'mech', 'mechIco', 'line', 'innate', 'gauge']) if (!isStr(m[k])) R.e('especializaciones', `specs.${id}.${k} falta (texto)`);
    if (m.gauge && !TV2.GAUGES.includes(m.gauge)) R.e('especializaciones', `specs.${id}.gauge «${m.gauge}» no existe en js/spec-mechanics.js (${TV2.GAUGES.join(', ')})`);
    if (ROS && m.gauge && ROS.gauges[id] !== m.gauge) R.a('especializaciones', `specs.${id}.gauge «${m.gauge}»: la barra del juego es «${ROS.gauges[id]}» (§17.1: se usa la que ya existe)`);
    const sb = C.specBar?.[id]; if (!sb || typeof sb.bar !== 'object') R.e('libro', `specBar.${id}.bar falta`);
    const mt = C.mech?.[id]; if (!mt) R.e('mecánica', `mech.${id} falta`); else { for (const k of ['n', 'gen', 'out', 'loss']) if (!isStr(mt[k])) R.e('mecánica', `mech.${id}.${k} falta (texto)`); if (!Array.isArray(mt.feed)) R.e('mecánica', `mech.${id}.feed debe ser una lista de ids`); }
    const inn = C.innate?.[id]; if (!inn) R.e('pasiva', `innate.${id} falta`); else for (const k of ['n', 'l']) if (!isStr(inn[k])) R.e('pasiva', `innate.${id}.${k} falta (texto)`);
  }
  for (const k of ['catalog']) if (!Array.isArray(C[k])) R.e('libro', `${k} debe ser una lista`);
  for (const k of ['fallbackBar', 'specBar', 'reco', 'sup', 'mech', 'innate', 'groups', 'builds', 'defaultBuild', 'demo']) if (C[k] == null || typeof C[k] !== 'object') R.e('clase', `${k} debe ser un objeto`);
  for (const [g, gd] of Object.entries(C.groups || {})) if (!isStr(gd?.label) || !Array.isArray(gd?.ids)) R.e('grupos', `groups.${g} = { label, ids:[…] }`);
  // catálogo
  const ids = new Set();
  for (const sk of C.catalog || []) {
    const w = `libro ${sk?.id || '?'}`;
    if (!isStr(sk?.id)) { R.e('libro', 'habilidad sin id'); continue; }
    if (ids.has(sk.id)) R.e(w, 'id repetido'); ids.add(sk.id);
    if (!isStr(sk.n)) R.e(w, 'falta n (nombre)');
    if (!CATS.includes(sk.cat)) R.e(w, `cat «${sk.cat}» (${CATS.join(' | ')})`);
    if (typeof sk.req !== 'number') R.e(w, 'falta req (nivel)');
    if (!ELEMS.includes(sk.elem)) R.e(w, `elem «${sk.elem}» (${ELEMS.join(' | ')})`);
    if (!isStr(sk.s)) R.e(w, 'falta s (una línea)');
    if (sk.spec && !specs.includes(sk.spec)) R.e(w, `spec «${sk.spec}» no es de la clase`);
    if (!sk.talent) {
      for (const v of ['M', 'A', 'B']) if (!isStr(sk[v]?.n) || !isStr(sk[v]?.s)) R.e(w, `forja ${v} = { n, s, k }`);
      for (const v of ['A', 'B']) if (sk[v] && !ROLES_FORJA.includes(sk[v].r)) R.e(w, `${v}.r «${sk[v]?.r}» (${ROLES_FORJA.join(' | ')})`);
    } else if (!isStr(sk.grantBy)) R.e(w, 'una activa de talento lleva grantBy (id del nodo que la concede)');
  }
  // árboles
  const t = C.tree;
  if (!t || !Array.isArray(t.cls) || typeof t.spec !== 'object' || !Array.isArray(t.hero)) { R.e('árboles', 'tree = { cls:[…], spec:{ <spec>:[…] }, hero:[…] }'); return false; }
  for (const id of specs) if (!Array.isArray(t.spec[id])) R.e('árboles', `tree.spec.${id} debe ser una lista`);
  for (const k of Object.keys(t.spec)) if (!specs.includes(k)) R.e('árboles', `tree.spec.${k}: no es una especialización de la clase`);
  if (t.hero.length !== 3) R.e('héroe', `hacen falta 3 árboles héroe (hay ${t.hero.length})`);
  const heroIds = new Set();
  for (const h of t.hero) {
    if (!isStr(h?.id)) { R.e('héroe', 'árbol héroe sin id'); continue; }
    if (heroIds.has(h.id)) R.e('héroe', `id de árbol repetido ${h.id}`); heroIds.add(h.id);
    for (const k of ['n', 'art', 'key', 'line']) if (!isStr(h[k])) R.e(`héroe ${h.id}`, `falta ${k} (texto)`);
    if (!Array.isArray(h.specs) || h.specs.length !== 2 || h.specs.some(x => !specs.includes(x)) || h.specs[0] === h.specs[1]) R.e(`héroe ${h.id}`, 'specs = 2 especializaciones distintas de la clase');
    if (!Array.isArray(h.nodes)) R.e(`héroe ${h.id}`, 'nodes debe ser una lista');
  }
  for (const id of specs) { const n = t.hero.filter(h => (h.specs || []).includes(id)).length; if (n !== 2) R.e('héroe', `${id} está en ${n} árboles héroe (deben ser 2)`); }
  // nodos
  const todos = new Map();
  const trees = [['cls', t.cls, 'clase'], ...specs.map(s => [s, t.spec[s] || [], s]), ...t.hero.map(h => [h.id, h.nodes || [], `héroe ${h.id}`])];
  for (const [w, list, sec] of trees) {
    const local = new Set(list.map(n => n?.id));
    for (const n of list) {
      if (!isStr(n?.id)) { R.e(sec, 'nodo sin id'); continue; }
      if (todos.has(n.id)) R.e(sec, `id ${n.id} repetido (también en ${todos.get(n.id)}): los ids son únicos en toda la clase`); todos.set(n.id, sec);
      if (w === 'cls' && !/^c\d+$/.test(n.id)) R.e(sec, `${n.id}: los nodos de clase se llaman c1…c30`);
      if (w !== 'cls' && /^c\d/.test(n.id)) R.e(sec, `${n.id}: solo los nodos de CLASE empiezan por «c» + número (el motor separa así las elecciones de clase)`);
      if (!isStr(n.n)) R.e(sec, `${n.id}: falta n (nombre)`);
      if (!['p', 'c', 'k', 'f', 'x'].includes(n.t)) R.e(sec, `${n.id}: t «${n.t}» (p | c | k | f | x)`);
      if (!['num', 'mec'].includes(n.tag)) R.e(sec, `${n.id}: tag «${n.tag}» (num | mec)`);
      if (typeof n.r !== 'number' || typeof n.c !== 'number') R.e(sec, `${n.id}: r y c (fila y columna) numéricos`);
      if (!Number.isInteger(n.max) || n.max < 1) R.e(sec, `${n.id}: max entero ≥ 1`);
      for (const q of n.req || []) if (!local.has(q)) R.e(sec, `${n.id}: req «${q}» no está en este árbol`);
      if (n.t === 'k' && !n.free) R.e(sec, `${n.id}: el nodo clave lleva free:true`);
      if (n.t === 'c') {
        if (!Array.isArray(n.opts) || n.opts.length !== 2 || n.opts[0]?.k !== 'A' || n.opts[1]?.k !== 'B') R.e(sec, `${n.id}: una elección lleva opts:[{k:'A',…},{k:'B',…}]`);
        for (const o of n.opts || []) { if (!isStr(o.n) || !isStr(o.d)) R.e(sec, `${n.id}${o.k}: opción con n y d (texto)`); if (!ROLES.includes(o.role)) R.e(sec, `${n.id}${o.k}: role «${o.role}» (${ROLES.join(' | ')})`); }
        if (n.max !== 1) R.e(sec, `${n.id}: una elección tiene max 1`);
      } else textosNodo(n, R, sec);
    }
  }
  // builds (formato)
  for (const [k, b] of Object.entries(C.builds || {})) {
    const sec = `build ${k}`;
    if (!specs.includes(b?.sp)) { R.e(sec, `sp «${b?.sp}» no es una especialización de la clase`); continue; }
    for (const f of ['n', 'arch']) if (!isStr(b[f])) R.e(sec, `falta ${f} (texto)`);
    if (!heroIds.has(b.hero)) R.e(sec, `hero «${b.hero}» no es un árbol héroe`);
    for (const f of ['cls', 'spec', 'clsCh', 'specCh', 'heroCh']) if (b[f] == null || typeof b[f] !== 'object') R.e(sec, `${f} debe ser un objeto`);
    if (!Array.isArray(b.heroNodes)) R.e(sec, 'heroNodes debe ser una lista');
  }
  for (const [sp, k] of Object.entries(C.defaultBuild || {})) if (!C.builds?.[k] || C.builds[k].sp !== sp) R.e('builds', `defaultBuild.${sp} = «${k}» no es una build de ${sp}`);
  // referencias del libro (avisos: con el catálogo vacío se usan las del catálogo 2f)
  const enCat = id => ids.has(id);
  const vacio = !(C.catalog || []).length; let refs2f = 0;
  const ref = (sec, id, que) => { if (id && !enCat(id)) { if (vacio) refs2f++; else R.a(sec, `${que} «${id}» no está en catalog`); } };
  for (const [sp, sb] of Object.entries(C.specBar || {})) { for (const v of Object.values(sb.bar || {})) ref('libro', v, `specBar.${sp}.bar`); ref('libro', sb.sel, `specBar.${sp}.sel`); }
  for (const v of Object.values(C.fallbackBar || {})) ref('libro', v, 'fallbackBar');
  for (const [sp, r] of Object.entries(C.reco || {})) for (const id of Object.keys(r)) ref('libro', id, `reco.${sp}`);
  for (const [sp, m] of Object.entries(C.mech || {})) for (const id of m.feed || []) ref('mecánica', id, `mech.${sp}.feed`);
  for (const [sp, inn] of Object.entries(C.innate || {})) if (inn?.sk) ref('pasiva', inn.sk, `innate.${sp}.sk`);
  for (const [g, gd] of Object.entries(C.groups || {})) for (const id of gd.ids || []) ref('grupos', id, `groups.${g}`);
  if (refs2f) R.i('libro', `catalog vacío: ${refs2f} referencias (specBar, fallbackBar, reco…) apuntan al catálogo 2f de referencia`);
  return true;
}

// ------------------------------------------------------------------ 2. DISEÑO (rejillas, presupuesto, puertas, textos, kit, builds)
function compararRejilla(list, G, sec, R, prefijo) {
  if (!list.length) { R.e(sec, `árbol vacío: faltan sus ${G.length} nodos (plantilla: --plantilla ${sec.startsWith('spec') ? `spec ${sec.slice(5)} <prefijo>` : sec.startsWith('héroe') ? `hero ${sec.slice(6)} <prefijo>` : 'cls'})`); return; }
  if (list.length !== G.length) R.e(sec, `${list.length} nodos (la rejilla tiene ${G.length})`);
  const pre = new Set(list.map(n => pref(n.id)));
  if (pre.size > 1) R.e(sec, `prefijos distintos en el mismo árbol: ${[...pre].join(', ')} (usa <prefijo><n>)`);
  if (prefijo && !pre.has(prefijo) && list.length) R.e(sec, `los ids deben ser ${prefijo}<n>`);
  for (const g of G) {
    const n = list.find(x => num(x.id) === g.n); const id = `${[...pre][0] || '?'}${g.n}`;
    if (!n) { R.e(sec, `falta el nodo ${id} (fila ${g.r}, columna ${g.c})`); continue; }
    if (n.r !== g.r || n.c !== g.c) R.e(sec, `${n.id}: fila/columna ${n.r},${n.c} (rejilla ${g.r},${g.c})`);
    if (n.max !== g.max) R.e(sec, `${n.id}: ${n.max} rangos (rejilla ${g.max})`);
    const rq = (n.req || []).map(num).sort((a, b) => a - b).join(','), gq = [...g.req].sort((a, b) => a - b).join(',');
    if (rq !== gq) R.e(sec, `${n.id}: requisitos [${(n.req || []).join(', ')}] (rejilla: ${g.req.map(x => `${[...pre][0]}${x}`).join(' o ') || 'ninguno'})`);
    if (n.t !== g.t) {
      const duro = ['k', 'f', 'x'].includes(g.t) || ['k', 'f', 'x'].includes(n.t) || (sec.startsWith('spec') && g.r === 3);
      (duro ? R.e : R.a)(sec, `${n.id}: tipo «${n.t}» (rejilla «${g.t}»)${duro ? '' : ' · cambia la forma, no el presupuesto'}`);
    }
  }
}
// coste mínimo de tener al máximo un conjunto de finales (cadena de requisitos + relleno para las puertas)
function costeMinimo(list, gates, objetivos) {
  const by = id => list.find(n => n.id === id);
  const memo = new Map();
  const cadenas = id => { if (memo.has(id)) return memo.get(id); const n = by(id); const rq = n.req || [];
    const out = rq.length ? rq.flatMap(q => cadenas(q).map(c => [...c, id])) : [[id]]; memo.set(id, out); return out; };
  const coste = set => {
    const nodos = [...set].map(by), base = nodos.reduce((s, n) => s + (n.free ? 0 : n.max), 0);
    const maxRow = Math.max(...nodos.map(n => n.r));
    let relleno = 0;
    for (const g of gates) { if (g.row > maxRow) continue;
      const tiene = nodos.reduce((s, n) => s + (n.r < g.row && !n.free ? n.max : 0), 0);
      const cap = list.reduce((s, n) => s + (n.r < g.row && !n.free && !set.has(n.id) ? n.max : 0), 0);
      const falta = Math.max(0, g.need - tiene); if (falta > cap) return Infinity; relleno = Math.max(relleno, falta); }
    return base + relleno;
  };
  let best = Infinity;
  const rec = (i, set) => { if (i === objetivos.length) { best = Math.min(best, coste(set)); return; }
    for (const c of cadenas(objetivos[i])) rec(i + 1, new Set([...set, ...c])); };
  rec(0, new Set());
  return best;
}
function nivelCon(TV2, w, pts) { for (let L = 1; L <= TV2.REGLAS.nivelMax; L++) if (TV2.earnedAt(w, L) >= pts) return L; return null; }
function simularBuild(TV2, list, gates, order, w) {
  const by = id => list.find(n => n.id === id);
  const above = (row, ranks) => list.reduce((s, n) => s + (n.r < row && !n.free ? (ranks[n.id] || 0) : 0), 0);
  const legal = ranks => { for (const n of list) { const r = ranks[n.id] || 0; if (!r) continue; if (r > n.max) return false;
    if (n.req?.length && !n.req.some(q => { const p = by(q); return p && (p.free || (ranks[q] || 0) >= p.max); })) return false;
    for (const g of gates) if (n.r >= g.row && above(g.row, ranks) < g.need) return false; } return true; };
  const ranks = {}; let spent = 0, fin = null; const hitos = [];
  for (let L = 1; L <= TV2.REGLAS.nivelMax; L++) {
    while (spent < TV2.earnedAt(w, L)) {
      const hit = order.find(([id, t]) => { if (!by(id) || (ranks[id] || 0) >= t) return false; ranks[id] = (ranks[id] || 0) + 1; const ok = legal(ranks); ranks[id]--; return ok; });
      if (!hit) break; ranks[hit[0]] = (ranks[hit[0]] || 0) + 1; spent++;
    }
    const f = list.find(n => n.t === 'f' && (ranks[n.id] || 0) >= n.max); if (f && !fin) { fin = `${f.n} al Nv${L}`; hitos.push(fin); }
  }
  return { ranks, spent, fin };
}
function validarDiseno(TV2, C, R) {
  const G = TV2.REJILLA, RG = TV2.REGLAS, t = C.tree, specs = C.specOrder;
  const cat = C.catalog || [], catIds = new Set(cat.map(s => s.id));
  // --- rejillas
  compararRejilla(t.cls, G.cls, 'clase', R, 'c');
  const prefijos = {};
  for (const sp of specs) { compararRejilla(t.spec[sp], G.spec, `spec ${sp}`, R); prefijos[sp] = pref(t.spec[sp][0]?.id || ''); }
  for (const h of t.hero) compararRejilla(h.nodes, G.hero, `héroe ${h.id}`, R);
  // --- etiquetas: filas 3–9 ≥ 60 % mecánica (§17.3)
  const etiq = (list, sec) => { const f = list.filter(n => n.r >= 3), m = f.filter(n => n.tag === 'mec').length; const p = f.length ? Math.round(100 * m / f.length) : 100;
    (p >= 60 ? R.i : R.e)(sec, `filas 3–9: ${m}/${f.length} «mecánica» (${p} %; mínimo 60 %)`); };
  etiq(t.cls, 'clase'); for (const sp of specs) etiq(t.spec[sp], `spec ${sp}`);
  // --- presupuesto y finales (§17.2)
  const presu = (list, w, sec, gates) => {
    const rangos = list.reduce((s, n) => s + (n.free ? 0 : n.max), 0), pts = RG.pts[w];
    if (rangos <= pts) R.e(sec, `${rangos} rangos ≤ ${pts} puntos: el árbol se puede completar`);
    else R.i(sec, `${list.length} nodos · ${rangos} rangos · ${pts} puntos a Nv${RG.nivelMax} (${Math.round(100 * pts / rangos)} %)`);
    const fins = list.filter(n => n.t === 'f');
    if (fins.length !== 3) { R.e(sec, `${fins.length} finales (deben ser 3, fila 8)`); return; }
    for (const f of fins) { const c = costeMinimo(list, gates, [f.id]); if (c > pts) R.e(sec, `final ${f.n}: cuesta ${c} > ${pts}: inalcanzable`);
      else R.i(sec, `final ${f.n} al máximo: ${c} puntos (Nv${nivelCon(TV2, w, c)})`); }
    let dos = Infinity; for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) dos = Math.min(dos, costeMinimo(list, gates, [fins[i].id, fins[j].id]));
    if (dos <= pts) R.e(sec, `dos finales al máximo caben (${dos} ≤ ${pts}): no obliga a elegir`); else R.i(sec, `dos finales al máximo: ${dos} > ${pts} (imposible ✓)`);
    const apex = list.find(n => n.t === 'x');
    if (apex) { const c = costeMinimo(list, gates, [fins[0].id]) + apex.max; R.i(sec, `final + ápice completo: ${c} puntos (Nv${nivelCon(TV2, w, c) ?? '—'})`); if (c > pts) R.e(sec, 'un final y el ápice completo no caben'); }
  };
  presu(t.cls, 'cls', 'clase', RG.gates.cls);
  for (const sp of specs) presu(t.spec[sp], 'spec', `spec ${sp}`, RG.gates.spec);
  for (const h of t.hero) if (h.nodes.length <= RG.pts.hero + 1 && h.nodes.length) R.e(`héroe ${h.id}`, 'el árbol héroe se completa con 1 + 10 puntos');
  // --- puertas (informativo: nivel al que se abren comprando todo seguido)
  for (const [w, sec] of [['cls', 'clase'], ['spec', 'especialización']]) R.i('puertas', `${sec}: ${RG.gates[w].map(g => `${g.need} → ${g.apex ? 'ápice' : `fila ${g.row}`} (Nv${nivelCon(TV2, w, g.need)})`).join(' · ')}`);
  // --- elecciones y activas de talento (§17.3)
  const acts = { cls: 0 };
  const revisaElecciones = (list, sec, w) => { for (const n of list.filter(x => x.t === 'c')) {
    if (!isStr(n.win)) R.e(sec, `${n.id}: falta win («cuál conviene» en palabras)`);
    for (const o of n.opts || []) if (o.act) {
      if (o.k !== 'A') R.e(sec, `${n.id}${o.k}: una habilidad de talento solo va en la opción A`);
      const sk = cat.find(s => s.id === o.act);
      if (!sk) R.e(sec, `${n.id}${o.k}: act «${o.act}» no está en catalog`);
      else { if (!sk.talent || sk.grantBy !== n.id) R.e(sec, `${n.id}${o.k}: en catalog, ${o.act} lleva talent:true y grantBy:'${n.id}'`);
        if (!['defense', 'utility'].includes(sk.cat)) R.e(sec, `${n.id}${o.k}: ${o.act} va en la ranura 2 (cat defense o utility)`); }
      if (w === 'cls') acts.cls++; else if (w === 'spec') R.a(sec, `${n.id}${o.k}: activa en un árbol de especialización (el kit está en el libro)`); else acts[w] = (acts[w] || 0) + 1;
    } } };
  revisaElecciones(t.cls, 'clase', 'cls');
  for (const sp of specs) revisaElecciones(t.spec[sp], `spec ${sp}`, 'spec');
  for (const h of t.hero) revisaElecciones(h.nodes, `héroe ${h.id}`, h.id);
  if (acts.cls > 3) R.e('clase', `${acts.cls} habilidades de talento (máx. 3)`);
  for (const h of t.hero) if ((acts[h.id] || 0) > 1) R.e(`héroe ${h.id}`, `${acts[h.id]} habilidades de talento (máx. 1)`);
  for (const sk of cat.filter(s => s.talent)) { const n = nodosDe(C).find(x => x.id === sk.grantBy); if (!n || !(n.opts || []).some(o => o.act === sk.id)) R.e(`libro ${sk.id}`, `grantBy «${sk.grantBy}» no es un nodo cuya opción concede ${sk.id}`); }
  // --- textos: ≤ 120, sin siglas/anglicismos, sin «por diseñar»
  const MAX = RG.textoMax, todos = [];
  for (const [list, sec] of [[t.cls, 'clase'], ...specs.map(sp => [t.spec[sp], `spec ${sp}`]), ...t.hero.map(h => [h.nodes, `héroe ${h.id}`])])
    for (const n of list) { for (const [id, tx] of textosNodo(n, nuevoInforme(R.cls), sec)) { if (tx.length > MAX) R.e(sec, `${id}: ${tx.length} caracteres (máx. ${MAX}): «${tx}»`); todos.push([sec, id, tx]); }
      todos.push([sec, n.id, n.n], [sec, n.id + '.win', n.win || '']); for (const o of n.opts || []) todos.push([sec, n.id + o.k, o.n]); }
  for (const sk of cat) { todos.push([`libro ${sk.id}`, 'n', sk.n], [`libro ${sk.id}`, 's', sk.s]); for (const v of ['M', 'A', 'B']) if (sk[v]) todos.push([`libro ${sk.id}`, v, `${sk[v].n} ${sk[v].s}`]);
    if ((sk.s || '').length > MAX) R.a(`libro ${sk.id}`, `línea del libro de ${sk.s.length} caracteres (máx. ${MAX})`); }
  for (const sp of specs) { const m = C.specs[sp], mt = C.mech[sp], inn = C.innate[sp]; todos.push([`spec ${sp}`, 'meta', `${m.name} ${m.role} ${m.line} ${m.innate} ${m.mech}`], [`mecánica ${sp}`, 'textos', `${mt.gen} ${mt.out} ${mt.loss}`], [`pasiva ${sp}`, 'textos', `${inn.n} ${inn.l} ${inn.f || ''}`]); }
  for (const h of t.hero) todos.push([`héroe ${h.id}`, 'meta', `${h.n} ${h.key} ${h.line}`]);
  for (const [sec, id, tx] of todos) { if (PROHIBIDO.test(tx)) R.e(sec, `${id}: sigla o anglicismo («${tx.match(PROHIBIDO)[0]}»): usa «contra jefes», «contra grupos», «Quebranto», «Principal»…`);
    if (PENDIENTE.test(tx)) R.e(sec, `${id}: texto pendiente («por diseñar»)`); }
  // nombres únicos (nodos, opciones, habilidades y variantes): §8 «ningún nombre repetido»
  const nombres = new Map(), add = (nm, d) => { if (!isStr(nm)) return; const k = nm.trim().toLowerCase(); if (!nombres.has(k)) nombres.set(k, []); nombres.get(k).push(d); };
  for (const n of nodosDe(C)) { if (n.t !== 'c') add(n.n, `nodo ${n.id}`); for (const o of n.opts || []) if (!(o.act && cat.find(s => s.id === o.act)?.n === o.n)) add(o.n, `opción ${n.id}${o.k}`); }
  for (const sk of cat) { add(sk.n, `habilidad ${sk.id}`); for (const v of ['M', 'A', 'B']) if (sk[v]) add(sk[v].n, `forja ${sk.id}.${v}`); }
  for (const [nm, ds] of nombres) if (ds.length > 1) R.a('nombres', `«${nm}» se repite: ${ds.join(', ')}`);
  // regla G1: el árbol de clase no nombra habilidades de especialización
  const kitSpec = cat.filter(s => s.spec);
  for (const n of t.cls) { const txt = [n.n, ...textosNodo(n, nuevoInforme(R.cls), 'clase').map(x => x[1]), n.win || '', ...(n.opts || []).map(o => o.n)].join(' ');
    for (const sk of kitSpec) if (new RegExp(`\\b${sk.n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(txt)) R.e('clase', `${n.id} nombra «${sk.n}», del kit de ${sk.spec} (G1)`); }
  // --- kit del libro (§17.1)
  if (!cat.length) R.e('libro', 'catalog vacío: falta el kit base y el de cada especialización');
  else {
    const base = cat.filter(s => !s.spec && !s.talent);
    const cuenta = l => l.reduce((o, s) => (o[s.cat] = (o[s.cat] || 0) + 1, o), {});
    const cb = cuenta(base);
    if (base.length !== 5 || cb.basic !== 1 || cb.spender !== 2 || cb.movement !== 1 || cb.defense !== 1) R.e('libro', `kit base: ${base.length} habilidades ${JSON.stringify(cb)} (deben ser 5: 1 basic, 2 spender, 1 movement, 1 defense)`);
    if (base.some(s => s.req > 9)) R.e('libro', `kit base: todas se aprenden del Nv1 al 9 (${base.filter(s => s.req > 9).map(s => s.id).join(', ')})`);
    for (const sp of specs) { const kit = cat.filter(s => s.spec === sp && !s.talent).sort((a, b) => a.req - b.req);
      const forma = kit.map(s => `${s.cat}@${s.req}`).join(' ');
      const ok = kit.length === 4 && kit[0].cat === 'spec' && kit[0].req === 10 && ['movement', 'utility'].includes(kit[1].cat) && kit[1].req === 12 && kit[2].cat === 'spender' && kit[2].req === 14 && kit[3].cat === 'ultimate' && kit[3].req === 15;
      (ok ? R.i : R.e)(`libro ${sp}`, ok ? `kit: ${kit.map(s => s.n).join(' · ')}` : `kit ${forma || 'vacío'} (deben ser 4: spec@10, movement|utility@12, spender@14, ultimate@15)`); }
    for (const s of cat.filter(x => !x.talent)) if (s.A && s.B && s.A.r === s.B.r) R.e(`libro ${s.id}`, `las dos variantes tienen el mismo papel (${s.A.r}): deben ser de papel opuesto`);
    for (const sp of specs) { const sb = C.specBar[sp]; for (const [slot, id] of Object.entries(sb.bar || {})) if (id && !catIds.has(id)) R.e(`libro ${sp}`, `specBar: «${id}» (${slot}) no está en catalog`); }
  }
  // --- builds punto a punto (G8): 4 por especialización, una híbrida, todas gastan 34/31/1+10
  const builds = Object.entries(C.builds || {});
  const finUsados = new Set(), clsFinUsados = new Set();
  for (const sp of specs) {
    const bs = builds.filter(([, b]) => b.sp === sp);
    if (bs.length < 4) R.e(`builds ${sp}`, `${bs.length} builds (deben ser 4, una híbrida)`);
    if (!C.defaultBuild?.[sp]) R.e(`builds ${sp}`, 'falta defaultBuild (la que aplica «Recomendado»)');
    let hibridas = 0;
    for (const [k, b] of bs) {
      TV2.normBuild(b);
      const sec = `build ${k}`, out = [];
      for (const [w, list, order, ch] of [['cls', t.cls, b.clsOrder, b.clsCh], ['spec', t.spec[sp], Object.entries(b.spec || {}), b.specCh]]) {
        for (const [id] of order) if (!list.find(n => n.id === id)) R.e(sec, `id desconocido «${id}» en ${w}`);
        const sim = simularBuild(TV2, list, RG.gates[w], order, w), pts = RG.pts[w];
        if (sim.spent !== pts) R.e(sec, `${w}: gasta ${sim.spent}/${pts} comprando punto a punto (orden ilegal o le faltan nodos)`);
        out.push(`${w === 'cls' ? 'clase' : sp} ${sim.spent}/${pts} ${sim.fin || 'sin final'}`);
        for (const n of list.filter(x => x.t === 'f' && (sim.ranks[x.id] || 0) >= x.max)) (w === 'cls' ? clsFinUsados : finUsados).add(n.id);
        if (w === 'spec' && !list.some(x => x.t === 'f' && (sim.ranks[x.id] || 0) >= x.max)) hibridas++;
        for (const id of Object.keys(ch || {})) { const n = list.find(x => x.id === id); if (!n || n.t !== 'c') R.e(sec, `elección «${id}» no es un nodo de elección de ${w}`); else if (!['A', 'B'].includes(ch[id])) R.e(sec, `${id}: elección «${ch[id]}» (A o B)`); }
        for (const n of list.filter(x => x.t === 'c' && (sim.ranks[x.id] || 0) > 0)) if (!(ch || {})[n.id]) R.a(sec, `${n.id} comprado sin elección en ${w === 'cls' ? 'clsCh' : 'specCh'} (vale A)`);
      }
      const spHero = TV2.specHeroDe(C)[sp] || [];
      if (!spHero.includes(b.hero)) R.e(sec, `árbol héroe «${b.hero}» no es de ${sp} (${spHero.join(', ')})`);
      const h = t.hero.find(x => x.id === b.hero);
      if (h) {
        const key = h.nodes.find(n => n.free), got = new Set(key ? [key.id] : []); let he = 'ok';
        if (!h.nodes.length) he = 'árbol vacío';
        if (new Set(b.heroNodes).size !== b.heroNodes.length) he = 'ids repetidos';
        if (b.heroNodes.length !== RG.pts.hero) R.e(sec, `heroNodes: ${b.heroNodes.length} (deben ser ${RG.pts.hero}, sin la clave)`);
        for (const id of b.heroNodes) { const n = h.nodes.find(x => x.id === id); if (!n) { he = `id ${id}`; break; } if (n.free) { he = `la clave ${id} es gratis`; break; }
          if (n.req?.length && !n.req.some(q => got.has(q))) { he = `${id} antes que sus requisitos`; break; } got.add(id); }
        for (const id of Object.keys(b.heroCh || {})) if (!h.nodes.find(n => n.id === id && n.t === 'c')) he = `elección ${id}`;
        if (he !== 'ok') R.e(sec, `Paragon ${h.n}: ${he}`);
        out.push(`Paragon ${h.n} 1+${b.heroNodes.length} ${he}`);
      }
      R.i(sec, `${b.n} (${b.arch}) · ${out.join(' · ')}`);
    }
    if (bs.length && !hibridas) R.e(`builds ${sp}`, 'ninguna build híbrida (sin final de especialización al máximo)');
    for (const f of t.spec[sp].filter(n => n.t === 'f')) if (bs.length && !finUsados.has(f.id)) R.a(`builds ${sp}`, `ninguna build usa el final ${f.n}`);
  }
  for (const f of t.cls.filter(n => n.t === 'f')) if (builds.length && !clsFinUsados.has(f.id)) R.a('builds', `ninguna build usa el final de clase ${f.n}`);
  // --- demos e iconos (avisos)
  for (const [k, id] of Object.entries(C.demo || {})) if (typeof id === 'string' && !['hl', 'swapTo'].includes(k) && !nodosDe(C).some(n => n.id === id)) R.a('demo', `demo.${k} = «${id}» no es un nodo`);
  if (existsSync(ASSETS)) {
    const falta = [];
    for (const [w, list] of [['clase', t.cls], ...specs.map(sp => [sp, t.spec[sp]]), ...t.hero.map(h => [h.id, h.nodes])])
      for (const n of list) for (const p of [n.icon || TV2.iconoNodo(R.cls, w, n.id), ...(n.opts || []).map(o => o.icon).filter(Boolean)]) if (!existsSync(ASSETS + p)) falta.push(p);
    for (const sk of cat) { const p = sk.icon || `icons256/${sk.id}.webp`; if (!existsSync(ASSETS + p)) falta.push(p); }
    if (falta.length) R.a('iconos', `${falta.length} iconos sin archivo (se verá el marcador con el id): ${falta.slice(0, 8).join(', ')}${falta.length > 8 ? '…' : ''}`);
    else R.i('iconos', 'todos los iconos existen');
  }
}

// ------------------------------------------------------------------ 3. TABLAS (Markdown, como las del doc de la Maga)
function tablas(TV2, C) {
  const KIND = { p: '○ pasiva', c: '⬡ elección', k: '○ clave', f: '○ **FINAL**', x: '○ **ÁPICE**' }, TAG = { num: 'número', mec: 'mecánica' };
  const ROL = { UNI: 'contra jefes', AREA: 'contra grupos', CTRL: 'control', AGU: 'supervivencia' }, esc = s => String(s ?? '').replace(/\|/g, '/');
  const efecto = n => n.t === 'c' ? n.opts.map(o => `**${o.k} · ${o.act ? '□' : '○'} ${o.n}**${o.act ? ' (habilidad)' : ''}: ${esc(o.d)} _(${ROL[o.role] || o.role})_`).join('<br>')
    : (n.max > 1 && n.t !== 'x' ? `Rango ${n.max}: ` : '') + esc(n.d(n.max));
  const tabla = list => '| Fila | Id | Nodo | Forma · tipo | Etiqueta | Rangos | Requiere | Qué hace (al máximo) | Cuál conviene |\n|---|---|---|---|---|---|---|---|---|\n' +
    [...list].sort((a, b) => a.r - b.r || a.c - b.c).map(n => { const extra = [n.final ? `final: ${n.final}` : '', n.hyb ? `híbrido: ${n.hyb}` : ''].filter(Boolean).join(' · ');
      return `| ${n.r} | ${n.id} | ${esc(n.n)} | ${KIND[n.t]} | ${TAG[n.tag]} | ${n.free ? 'gratis' : n.max} | ${(n.req || []).join(' o ') || (n.free ? 'gratis' : '—')} | ${efecto(n)}${extra ? `<br>_${esc(extra)}_` : ''} | ${esc(n.win || '')} |`; }).join('\n');
  let md = `# Talentos v2 · ${C.name} (generado por validar-talentos.mjs --tablas)\n\n## Árbol de clase\n\n${tabla(C.tree.cls)}\n`;
  for (const sp of C.specOrder) md += `\n## ${C.specs[sp].name}\n\n${C.tree.spec[sp].length ? tabla(C.tree.spec[sp]) : '_(vacío)_'}\n`;
  for (const h of C.tree.hero) md += `\n## Paragon · ${h.n} (${h.specs.map(s => C.specs[s]?.name || s).join(' · ')})\n\n${h.nodes.length ? tabla(h.nodes) : '_(vacío)_'}\n`;
  const byId = (l, id) => l.find(n => n.id === id);
  for (const [k, b] of Object.entries(C.builds || {})) {
    TV2.normBuild(b); const tree = w => w === 'cls' ? C.tree.cls : C.tree.spec[b.sp], h = C.tree.hero.find(x => x.id === b.hero);
    const fmt = (w, ranks, ch) => Object.entries(ranks).map(([id, r]) => { const n = byId(tree(w), id); return `${ch?.[id] && n?.opts ? `${n.opts.find(o => o.k === ch[id]).n} (${ch[id]})` : n?.n || id} ${r}`; }).join(' · ');
    const tot = (w, ranks) => Object.entries(ranks).reduce((s, [id, r]) => s + (byId(tree(w), id)?.free ? 0 : r), 0);
    md += `\n*«${b.n}» (${b.arch}) · Paragon ${h?.n}*\n- **Clase (${tot('cls', b.cls)}/${TV2.REGLAS.pts.cls}):** ${fmt('cls', b.cls, b.clsCh)}\n- **${C.specs[b.sp].name} (${tot('spec', b.spec)}/${TV2.REGLAS.pts.spec}):** ${C.tree.spec[b.sp][0]?.n} (gratis) · ${fmt('spec', b.spec, b.specCh)}\n` +
      `- **Paragon:** ${h?.n}: ${h?.nodes[0]?.n} (gratis) · ${b.heroNodes.map(id => { const n = h?.nodes.find(x => x.id === id); return b.heroCh?.[id] ? `${n.opts.find(o => o.k === b.heroCh[id]).n} (${b.heroCh[id]})` : n?.n || id; }).join(' · ')}\n`;
  }
  return md;
}

// ------------------------------------------------------------------ 4. PLANTILLA de un árbol (para rellenar con la rejilla ya puesta)
function plantilla(TV2, cls, tipo, specId, prefijo) {
  const G = TV2.REJILLA[tipo === 'cls' ? 'cls' : tipo === 'hero' ? 'hero' : 'spec'];
  if (!G) throw new Error('tipo: cls | spec | hero');
  const p = tipo === 'cls' ? 'c' : (prefijo || (specId || 'x')[0]);
  if (tipo !== 'cls' && p === 'c') throw new Error('el prefijo «c» es solo del árbol de clase');
  const tag = g => (g.r >= 3 || g.t !== 'p') ? 'mec' : 'num';
  const lines = G.map(g => {
    const id = `${p}${g.n}`, req = g.req.length ? `, req:[${g.req.map(x => `'${p}${x}'`).join(', ')}]` : '';
    const base = `{ id:'${id}', n:'(nombre)', t:'${g.t}', tag:'${tag(g)}', r:${g.r}, c:${g.c}, max:${g.max}${g.t === 'k' ? ', free:true' : ''}${req}`;
    if (g.t === 'c') return `  ${base}, opts:[\n    { k:'A', n:'(opción A)', d:'(efecto con números)', role:'AREA' },\n    { k:'B', n:'(opción B)', d:'(efecto con números)', role:'UNI' } ],\n    win:'A, contra grupos: (por qué). B, contra jefes: (por qué)' },`;
    if (g.t === 'x') return `  ${base}, d:r=>['1) (rango 1)', '2) (rango 2)', '3) (rango 3)', '4) (rango 4)'].slice(0, r).join(' ') },`;
    if (g.max > 1) return `  ${base}, d:r=>\`(efecto) +\${10*r} %\`${g.t === 'f' ? `, final:'(rama)'` : ''} },`;
    return `  ${base}, d:()=>'(efecto)'${g.t === 'f' ? `, final:'(rama)'` : ''} },`;
  });
  return `// ${tipo === 'cls' ? `árbol de clase de ${cls}` : tipo === 'hero' ? `árbol héroe (${specId || 'id'}) de ${cls}` : `${specId} (${cls})`} · rejilla de data/talents-v2-comun.js · rellena n, d, opts, win, touch, icon…\n[\n${lines.join('\n')}\n]`;
}

// ------------------------------------------------------------------ main
function imprimir(R, modo) {
  const sinAv = flag('--sin-avisos');
  console.log(`\n=== ${R.cls} · ${modo} ===`);
  for (const l of R.info) console.log('  · ' + l);
  if (!sinAv) for (const l of R.av) console.log('  ⚠ ' + l);
  for (const l of R.err) console.log('  ✗ ' + l);
  console.log(R.err.length ? `  → ${R.err.length} errores${R.av.length ? `, ${R.av.length} avisos` : ''}` : `  → OK${R.av.length ? ` (${R.av.length} avisos)` : ''}`);
}
function validar(cls, soloEstructura) {
  const { TV2, C } = cargar(cls), R = nuevoInforme(cls);
  const okEst = validarEstructura(TV2, C, R);
  const modo = soloEstructura ? 'estructura' : 'completa (estructura + diseño)';
  if (okEst && !soloEstructura && !R.err.length) validarDiseno(TV2, C, R);
  else if (okEst && !soloEstructura) R.i('diseño', 'no se valida el diseño hasta que la estructura esté bien');
  imprimir(R, modo);
  return R.err.length;
}

try {
  if (flag('--plantilla')) {
    const i = argv.indexOf('--plantilla'), [tipo, specId, prefijo] = argv.slice(i + 1).filter(a => !a.startsWith('--'));
    const cls = argv.find(a => !a.startsWith('--') && a !== tipo && a !== specId && a !== prefijo) || 'clase';
    console.log(plantilla(cargar(cls).TV2, cls, tipo, specId, prefijo)); process.exit(0);
  }
  if (flag('--tablas')) { const { TV2, C } = cargar(CLS_ARG); if (!C) throw new Error(`no hay datos de ${CLS_ARG}`); console.log(tablas(TV2, C)); process.exit(0); }
  let errores = 0;
  if (flag('--todas')) {
    const TV2 = cargar('maga').TV2;
    for (const cls of TV2.CLASES_ORDEN) { const { C } = cargar(cls); const est = flag('--estructura') || C?.estado === 'esqueleto';
      if (!C) { console.log(`\n=== ${cls} === sin archivo (data/talents-v2-${cls}.js): el mockup muestra «En diseño»`); continue; }
      errores += validar(cls, est); }
  } else {
    if (!CLS_ARG) { console.log('uso: node docs/mockups/data/validar-talentos.mjs <maga|guerrero|arquera|--todas> [--estructura] [--tablas] [--plantilla cls|spec <id> <prefijo>|hero <id> <prefijo>] [--sin-avisos]'); process.exit(2); }
    errores = validar(CLS_ARG, flag('--estructura'));
  }
  console.log(errores ? `\nFALLA: ${errores} errores` : '\nTodo en regla');
  process.exit(errores ? 1 : 0);
} catch (e) { console.error('ERROR del validador:', e.stack || e.message); process.exit(3); }
