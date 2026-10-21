// Transformación mockup → formato del juego (docs/paso2-implementacion.md §3.1 y §3.5).
// Solo ESTRUCTURA y TEXTOS: los efectos (fx, poderes, forja) se escriben a mano en E2 desde `impl`/`k`;
// aquí quedan como `fx: {}` + `todo` (talentos) o como comentario (forja).
// Puro salvo la comprobación de iconos (existsSync en assets/).
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, nodosMockup } from './cargar.mjs';
import { verificarD, compilar, conFuente } from './funciones.mjs';
import { comentar, inline } from './serializar.mjs';

// rol del juego (dps|tank|support|control) si el juego aún no lo tiene: desde la etiqueta del mockup
const ROL = { 'Daño': 'dps', 'Daño en área': 'dps', 'Un objetivo': 'dps', 'Tanque': 'tank', 'Apoyo': 'support', 'Control': 'control' };
// banderas «toca todo tu X» del mockup → selector de talentos (§3.8); las que no tienen selector se expanden a ids
export const SEL_BANDERA = { fire: '@fire', frost: '@frost', arcane: '@arcane', holy: '@holy', sagrado: '@holy', nature: '@nature',
  physical: '@physical', movilidad: '@movement', golpes: '@all' };
const SIN_IMPL = 'sin impl: escribir el efecto desde el texto';
export const VAR = { A: 'i', B: 'ii' };
export const varDe = v => VAR[v] || v;
const clon = v => (v == null ? v : JSON.parse(JSON.stringify(v)));
const CATS = ['basic', 'spender', 'movement', 'defense', 'utility', 'spec', 'ultimate'];

// ruta de icono del mockup → ruta del juego (relativa a assets/); icons256/ del arte = skills256/ del repo
export function rutaIcono(ruta) {
  if (!ruta || typeof ruta !== 'string') return { ruta, existe: false };
  const cand = ruta.startsWith('icons256/') ? 'skills256/' + ruta.slice('icons256/'.length) : ruta;
  if (existsSync(join(ROOT, 'assets', cand))) return { ruta: cand, existe: true };
  return { ruta, existe: false };
}

// Build del mockup → forma «cruda» (la que se escribe a mano: `cls` en orden de compra con «id_» = rangos tardíos).
// Las builds de la Maga llegan ya normalizadas por TV2.normBuild (cls sumado + clsOrder): se deshace.
export function buildCruda(b, errores = [], donde = '') {
  let cls;
  if (Array.isArray(b.clsOrder)) {
    cls = {}; const prev = {};
    for (const [id, acum] of b.clsOrder) {
      const k = id in prev ? `${id}_` : id;
      if (k in cls) errores.push(`${donde}: ${id} se compra en más de dos tandas: no cabe en la forma «id_»`);
      cls[k] = acum - (prev[id] || 0); prev[id] = acum;
    }
  } else cls = { ...(b.cls || {}) };
  const out = {};
  for (const k of ['sp', 'n', 'arch', 'hero', 'heroCh', 'heroNodes', 'cls', 'clsCh', 'spec', 'specCh']) if (b[k] !== undefined) out[k] = k === 'cls' ? cls : clon(b[k]);
  for (const k of Object.keys(b)) if (!(k in out) && k !== 'clsOrder') out[k] = clon(b[k]);
  return out;
}

// Contexto de una conversión: errores (fallan), avisos, iconos que faltan, grants omitidos.
// traducir(texto) → ['alias → canónica', …] (opcional: tabla de W2 y vocabulario del juego; lo pasa
// convert.mjs) se añade al `todo` para que KT no traduzca a mano
function nuevoCtx(cls, traducir = null) { return { cls, errores: [], avisos: [], iconos: [], grantsOmitidos: [], traducir }; }
function todoDe(ctx, impl) {
  const t = impl || SIN_IMPL;
  const tr = impl && ctx.traducir ? ctx.traducir(impl) : [];
  return tr.length ? `${t} ⟶ traducir: ${tr.join('; ')}` : t;
}

function icono(ctx, ruta, donde) {
  const r = rutaIcono(ruta);
  if (ruta && !r.existe) ctx.iconos.push({ donde, ruta });
  return r.ruta;
}

// d(r) del mockup → función del juego (compilada desde la fuente copiada; el serializador escribe esa fuente)
function copiarD(ctx, d, max, helpers, donde) {
  if (typeof d !== 'function') return d == null ? undefined : String(d);
  const { src, errores } = verificarD(d, max, helpers, donde);
  ctx.errores.push(...errores);
  let f;
  try { f = compilar(src, helpers); } catch { f = (...a) => d(...a); }
  return conFuente(f, src);
}

function touchDe(ctx, n, C, donde) {
  const out = [...(n.touch || [])];
  for (const g of Object.keys(C.groups || {})) {
    if (n[g] !== true) continue;
    if (SEL_BANDERA[g]) out.push(SEL_BANDERA[g]);
    else { out.push(...(C.groups[g].ids || [])); ctx.avisos.push(`${donde}: la bandera «${g}» (${C.groups[g].label}) no tiene selector (§3.8): se expande a sus ids`); }
  }
  return out.length ? [...new Set(out)] : undefined;
}

function nodoJuego(ctx, n, { C, TV2, helpers, arbolIcono, grantSi }) {
  const donde = `${ctx.cls}:${n.id}`;
  const out = { id: n.id, name: n.n, t: n.t, tag: n.tag, r: n.r, c: n.c, max: n.max };
  if (n.req?.length) out.req = [...n.req];
  if (n.free) out.free = true;
  if (n.t !== 'c') out.d = copiarD(ctx, n.d, n.max, helpers, donde);
  const touch = touchDe(ctx, n, C, donde);
  if (touch) out.touch = touch;
  for (const k of ['arch', 'final', 'hyb']) if (n[k] != null) out[k] = n[k];
  out.icon = icono(ctx, n.icon || TV2.iconoNodo(ctx.cls, arbolIcono, n.id), donde);
  if (n.t === 'c') {
    out.opts = (n.opts || []).map(o => {
      const op = { k: o.k, name: o.n, desc: o.d, role: o.role, fx: {} };
      if (o.act) {
        if (o.k !== 'A') ctx.errores.push(`${donde}${o.k}: una habilidad de talento solo va en la opción A (act «${o.act}»)`);
        if (grantSi(o.act)) op.fx.grant = o.act; else ctx.grantsOmitidos.push(`${n.id}${o.k} → ${o.act}`);
      }
      if (o.touch?.length) op.touch = [...o.touch];
      if (o.icon) op.icon = icono(ctx, o.icon, `${donde}${o.k}`);
      op.todo = todoDe(ctx, o.impl);
      return op;
    });
    if (n.win != null) out.win = n.win;
  } else {
    if (n.win != null) out.win = n.win;
    out.fx = {};
    out.todo = todoDe(ctx, n.impl);
  }
  return out;
}

// la definición del juego v1 (foto) en un comentario de una línea (recortado con «…» si es muy largo)
const resumenDef = def => { const t = inline(def); return t.length > 700 ? t.slice(0, 699) + '…' : t; };
// id parecido en el juego para una habilidad nueva (p. ej. m_parpadeo ← m_t_parpadeo, g_remolino ← g_t_remolino)
function parecido(id, catJuego) {
  const m = id.match(/^([a-z])_(.+)$/);
  const cands = m ? [`${m[1]}_t_${m[2]}`, `${m[1]}_p_${m[2]}`, m[2]] : [];
  return cands.map(c => catJuego.get(c)).find(Boolean) || null;
}

// definición de una activa de talento: la del juego v1 (si existía) con los campos 2g encima
function activaTalento(ctx, s, actual) {
  const base = {};
  if (actual) for (const [k, v] of Object.entries(actual)) if (!['id', 'name', 'kind', 'cat', 'slots', 'req', 'desc', 'icon', 'tags', 'elem', 'cd', 'gen'].includes(k)) base[k] = clon(v);
  const tags = actual?.tags ? actual.tags.filter(t => !CATS.includes(t) || t === s.cat) : [s.cat, s.elem];
  const out = { id: s.id, name: s.n, icon: actual?.icon || '✦', kind: 'talent', cat: s.cat, slots: ['k2'], tags: [...new Set([...tags, s.cat, s.elem])],
    elem: s.elem, req: s.req };
  if (s.cd != null) out.cd = s.cd;
  if (s.gen != null) out.gen = s.gen;
  Object.assign(out, base);
  out.grantBy = s.grantBy;
  if (s.hero) out.hero = true;
  out.line = s.s;
  out.desc = actual?.desc || s.s;
  out.art = icono(ctx, s.icon || `icons256/${s.id}.webp`, `${ctx.cls}:${s.id}`);
  out.todo = actual ? 'existe en el juego: revisar texto y números contra la línea 2g' : 'NUEVA: tipo genérico o comportamiento (KA1)';
  if (actual) comentar(out, [`juego v1: ${resumenDef(actual)}`]);
  return out;
}

function habilidadKit(ctx, s, actual, catJuego) {
  const out = { id: s.id, name: s.n, icon: actual?.icon || '✦', cat: s.cat, req: s.req };
  if (s.spec) out.spec = s.spec;
  out.elem = s.elem;
  for (const k of ['coef', 'cost', 'cd', 'gen']) if (s[k] != null) out[k] = s[k];
  out.line = s.s;
  if (s.innate) out.innate = clon(s.innate);
  out.art = icono(ctx, s.icon || `icons256/${s.id}.webp`, `${ctx.cls}:${s.id}`);
  out.todo = 'KA1: tipo genérico, verbos (§3.6) y números desde el doc de la clase';
  const par = actual ? null : parecido(s.id, catJuego);
  comentar(out, actual ? [`juego v1: ${resumenDef(actual)}`]
    : par ? [`NUEVA en 2g con este id; en el juego hay una parecida: ${resumenDef(par)}`] : ['NUEVA en 2g (no existe en el juego)']);
  return out;
}

function forjaDe(s) {
  const id = s.id;
  const mejora = { name: s.M?.n, icon: 'forge/mejora', line: s.M?.s };
  const vars = [['A', 'i'], ['B', 'ii']].map(([v, sfx]) => ({ id: `${id}_${sfx}`, name: s[v]?.n, role: s[v]?.r, icon: `forge/v_${id}_${sfx}`, line: s[v]?.s }));
  comentar(mejora, [`k: ${s.M?.k ?? '(sin k)'}`]);
  vars.forEach((x, i) => comentar(x, [`k: ${s[['A', 'B'][i]]?.k ?? '(sin k)'}`]));
  return { mejora, vars };
}

// Convierte una clase del mockup. opts.grantSoloSiExiste: true en --write (E1.5): `grant` solo si la activa ya existe.
// → { talents, hero, talentSkills, skills, forge, specBar, forgeReco, fallbackBar, ctx }
export function convertirClase({ cls, C, TV2, helpers, juego, grantSoloSiExiste = false, traducir = null }) {
  const ctx = nuevoCtx(cls, traducir);
  const catJuego = juego?.catalogo || new Map();
  // una activa 2g «ya existe» si HOY es una activa de talento del juego (kind 'talent', la concede un nodo).
  // Una habilidad base del catálogo con el mismo id (p. ej. grito_guerra, agilidad) no cuenta: KA1 la
  // convierte en activa; hasta entonces su nodo queda sin grant y su definición no entra en el puente
  const activasJuego = new Set((juego?.talentSkills || []).filter(s => s && typeof s === 'object').map(s => s.id));
  const existeActiva = id => activasJuego.has(id);
  const grantSi = id => !grantSoloSiExiste || existeActiva(id);
  const comun = { C, TV2, helpers, grantSi };
  const specs = C.specOrder || [];
  const catalog = C.catalog || [];

  // ---- árboles
  const clsNodes = (C.tree?.cls || []).map(n => nodoJuego(ctx, n, { ...comun, arbolIcono: 'clase' }));
  const specList = specs.map(sp => {
    const meta = C.specs?.[sp] || {}, inn = C.innate?.[sp] || {}, js = juego?.specs?.get(sp);
    const nodes = (C.tree?.spec?.[sp] || []).map(n => nodoJuego(ctx, n, { ...comun, arbolIcono: sp }));
    const insignia = catalog.find(s => s.spec === sp && s.cat === 'spec');
    if (!insignia) ctx.avisos.push(`${cls}:${sp}: sin insignia (cat 'spec') en el catálogo: spec.elem queda null`);
    const out = { id: sp, name: meta.name, role: js?.role || ROL[meta.role] || null, roleLabel: meta.role,
      icon: icono(ctx, `specs/${sp}.webp`, `${cls}:${sp}`), emblem: icono(ctx, `emblems/${sp}.webp`, `${cls}:${sp}`),
      mechanic: meta.gauge, elem: insignia?.elem ?? null, prefix: nodes[0] ? nodes[0].id.replace(/\d+$/, '') : null,
      innate: clon(js?.innate || {}), innateText: meta.innate, line: meta.line, desc: meta.line,
      innateName: inn.n, innateDesc: inn.l, innateNote: inn.f, innateSkill: inn.sk ?? null };
    if (meta.sketch) out.sketch = true;
    out.todo = `innate (fx) desde el texto: «${inn.l || meta.innate || '—'}»`;
    out.nodes = nodes;
    return out;
  });
  const hero = (C.tree?.hero || []).map(h => {
    const nodes = (h.nodes || []).map(n => nodoJuego(ctx, n, { ...comun, arbolIcono: h.id }));
    return { id: h.id, name: h.n, specs: [...(h.specs || [])], art: icono(ctx, h.art, `${cls}:${h.id}`), line: h.line, key: h.key,
      prefix: nodes[0] ? nodes[0].id.replace(/\d+$/, '') : null, nodes };
  });

  // ---- builds (forma cruda; W1 las normaliza con normBuild)
  const builds = {};
  for (const [k, b] of Object.entries(C.builds || {})) builds[k] = buildCruda(b, ctx.errores, `${cls}:build ${k}`);

  // ---- catálogo
  // en --write (E1.5) solo entran las activas que ya existen: una definición sin tipo rompería validateSkillDef al
  // entrar en CLASSES; las nuevas quedan anotadas (las escribe KA1) y su nodo, sin grant
  const talentSkills = catalog.filter(s => s.talent && (!grantSoloSiExiste || existeActiva(s.id))).map(s => activaTalento(ctx, s, catJuego.get(s.id)));
  // D29: <CLASE>_TALENT_SKILLS = ids de las 6 activas (su definición vive en el catálogo desde KA1)
  const talentSkillIds = catalog.filter(s => s.talent).map(s => s.id);
  ctx.activasPendientes = catalog.filter(s => s.talent && grantSoloSiExiste && !existeActiva(s.id)).map(s => s.id);
  ctx.activasEnCatalogo = ctx.activasPendientes.filter(id => catJuego.has(id));   // hoy son habilidades base
  // activas de talento del juego v1 que ya no son activas de talento en 2g (pasan al kit o se retiran)
  const ids2g = new Set(catalog.filter(s => s.talent).map(s => s.id));
  ctx.activasV1Fuera = (juego?.talentSkills || []).map(s => s.id).filter(id => !ids2g.has(id));
  const skills = catalog.filter(s => !s.talent).map(s => habilidadKit(ctx, s, catJuego.get(s.id), catJuego));
  const forge = {};
  for (const s of catalog.filter(x => !x.talent)) forge[s.id] = forjaDe(s);
  const specBar = {}, forgeReco = {};
  for (const sp of specs) {
    const sb = C.specBar?.[sp];
    if (!sb) continue;
    specBar[sp] = { bar: clon(sb.bar), forge: Object.fromEntries(Object.entries(sb.forge || {}).map(([id, v]) => [id, varDe(v)])), sel: sb.sel ?? null };
  }
  for (const [sp, r] of Object.entries(C.reco || {})) forgeReco[sp] = Object.fromEntries(Object.entries(r || {}).map(([id, v]) => [id, varDe(v)]));
  for (const [sp, r] of Object.entries(forgeReco)) for (const [id, v] of Object.entries(r)) {
    if (!['i', 'ii'].includes(v)) ctx.errores.push(`${cls}: reco.${sp}.${id} = «${v}» (A o B)`);
  }

  const talents = { v: 2, cls: { name: C.name, emblem: icono(ctx, C.emblem, `${cls}:clase`), art: icono(ctx, C.clsArt, `${cls}:clase`), nodes: clsNodes },
    specs: specList, hero, builds, defaultBuild: clon(C.defaultBuild || {}), groups: clon(C.groups || {}), skills: talentSkills };
  return { talents, hero, talentSkills, talentSkillIds, skills, forge, specBar, forgeReco, fallbackBar: clon(C.fallbackBar || {}), ctx };
}

// verificación de n1 (talent-text.js) contra TV2.n1 del mockup
export function verificarN1(TV2, helpers) {
  const errores = [];
  if (typeof helpers.n1 !== 'function') return ['js/talent-text.js no exporta n1'];
  for (const v of [0, 0.5, 1, 1.05, 1.5, 2, 2.25, 12.345, -3.2, 1 / 3, 7 * 0.1, 100]) {
    if (TV2.n1(v) !== helpers.n1(v)) errores.push(`n1(${v}): mockup «${TV2.n1(v)}» ≠ talent-text «${helpers.n1(v)}»`);
  }
  if (typeof helpers.pl !== 'function' || helpers.pl(1, 'a', 'b') !== 'a' || helpers.pl(2, 'a', 'b') !== 'b') errores.push('pl(r, uno, muchos) no se comporta como el del mockup');
  return errores;
}

export { nodosMockup };
