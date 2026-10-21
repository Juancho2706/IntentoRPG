// Paridad juego ↔ mockup (docs/paso2-implementacion.md §4): la usan tests/test-v2-paridad.mjs (datos del juego)
// y convert.mjs (comprobación de sus propios borradores). Compara:
//  · reglas comunes: TALENT_RULES / LEVEL_MAX / earnedAt / puertas = TV2 (solo si js/talents.js ya exporta TALENT_RULES);
//  · talentos (si <CLASE>_TALENTS.v === 2): ids, t, r, c, max, req, free; nombres y d(r); win; opciones (k, role, nombre,
//    texto, grant); especializaciones (orden, nombre, roleLabel, mecánica); árboles héroe (specs, key, line, nombre);
//    builds (normalizadas) y defaultBuild;
//  · catálogo (si <CLASE>_CATALOG_V === 2): ids, cat, req, spec, elem y activa de talento; forja (ids, nombres, líneas,
//    papeles); SPEC_BAR (barra, forja i/ii, selección), FORGE_RECO y FALLBACK_BAR.
// Una divergencia deliberada se declara en tools/convert-v2/divergencias.json ({ clase, ruta, motivo }); cubre su ruta y
// todo lo que cuelga de ella.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { textoD } from './lib/funciones.mjs';
import { varDe } from './lib/transformar.mjs';

const DIR = dirname(fileURLToPath(import.meta.url));
export const DIVERGENCIAS = join(DIR, 'divergencias.json');

export function cargarDivergencias(ruta = DIVERGENCIAS) {
  if (!existsSync(ruta)) return [];
  const j = JSON.parse(readFileSync(ruta, 'utf8'));
  return Array.isArray(j.divergencias) ? j.divergencias : [];
}

// igualdad profunda: listas en orden; objetos sin importar el orden de las claves (salvo `ordenadas`)
function canon(v, ordenadas = false) {
  if (Array.isArray(v)) return v.map(x => canon(x));
  if (v && typeof v === 'object') {
    const ks = ordenadas ? Object.keys(v) : Object.keys(v).sort();
    return ks.filter(k => v[k] !== undefined).map(k => [k, canon(v[k])]);
  }
  return v === undefined ? null : v;
}
const igual = (a, b, ordenadas = false) => JSON.stringify(canon(a, ordenadas)) === JSON.stringify(canon(b, ordenadas));
const corto = v => { const s = typeof v === 'string' ? `«${v}»` : JSON.stringify(v); return s && s.length > 160 ? s.slice(0, 157) + '…' : s; };

function nuevoInforme(cls) {
  const R = { cls, difs: [], pendientes: [], info: [] };
  R.dif = (ruta, mockup, juego) => R.difs.push({ ruta, mockup, juego });
  R.eq = (a, b, ruta, ordenadas = false) => { if (!igual(a, b, ordenadas)) R.dif(ruta, a, b); };
  return R;
}

// ---------------------------------------------------------------- reglas comunes
export function compararReglas(TV2, core) {
  const R = nuevoInforme('reglas');
  if (!core?.TALENT_RULES) { R.info.push('js/talents.js aún no exporta TALENT_RULES (W1, E1): reglas sin comparar'); return R; }
  const T = core.TALENT_RULES, G = TV2.REGLAS;
  R.eq(G.pts, T.pts, 'reglas.pts');
  for (const k of ['specAt', 'specLast', 'heroAt']) R.eq(G[k], T[k], `reglas.${k}`);
  R.eq(G.clsLate, T.clsLate, 'reglas.clsLate');
  if ('LEVEL_MAX' in core) R.eq(G.nivelMax, core.LEVEL_MAX, 'reglas.LEVEL_MAX');
  if (core.CLASS_GATES) R.eq(G.gates.cls, core.CLASS_GATES, 'reglas.CLASS_GATES');
  if (core.SPEC_GATES) R.eq(G.gates.spec, core.SPEC_GATES, 'reglas.SPEC_GATES');
  if (typeof core.earnedAt === 'function') {
    for (const w of ['cls', 'spec', 'hero', 'board']) for (let L = 1; L <= G.nivelMax; L++) {
      const a = TV2.earnedAt(w, L), b = core.earnedAt(w, L);
      if (a !== b) { R.dif(`reglas.earnedAt.${w}.${L}`, a, b); break; }
    }
  }
  return R;
}

// ---------------------------------------------------------------- talentos
function compararNodo(R, m, j, ruta) {
  for (const k of ['t', 'r', 'c', 'max']) R.eq(m[k], j[k], `${ruta}.${k}`);
  R.eq([...(m.req || [])].sort(), [...(j.req || [])].sort(), `${ruta}.req`);
  R.eq(!!m.free, !!j.free, `${ruta}.free`);
  R.eq(m.n, j.name, `${ruta}.name`);
  R.eq(m.win ?? null, j.win ?? null, `${ruta}.win`);
  if (m.t === 'c') {
    const mo = m.opts || [], jo = j.opts || [];
    R.eq(mo.map(o => o.k), jo.map(o => o.k), `${ruta}.opts`);
    for (const o of mo) {
      const q = jo.find(x => x.k === o.k);
      if (!q) continue;
      const rr = `${ruta}.opts.${o.k}`;
      R.eq(o.role, q.role, `${rr}.role`);
      R.eq(o.n, q.name, `${rr}.name`);
      R.eq(o.d, q.desc, `${rr}.desc`);
      const g = q.fx?.grant ?? null;
      if (o.act && !g && (q.todo || j.todo)) R.pendientes.push(`${rr}: concede ${o.act} (sin grant todavía: la activa no existe en el juego)`);
      else R.eq(o.act ?? null, g, `${rr}.grant`);
    }
  } else {
    for (let r = 1; r <= Math.max(1, m.max || 1); r++) R.eq(textoD(m.d, r), textoD(j.d, r), `${ruta}.d(${r})`);
  }
}
function compararArbol(R, mNodes, jNodes, ruta) {
  const jm = new Map((jNodes || []).map(n => [n.id, n]));
  for (const m of mNodes || []) {
    const j = jm.get(m.id);
    if (!j) { R.dif(`${ruta}.${m.id}`, m.n, '(falta en el juego)'); continue; }
    compararNodo(R, m, j, `${ruta}.${m.id}`);
    jm.delete(m.id);
  }
  for (const id of jm.keys()) R.dif(`${ruta}.${id}`, '(no está en el mockup)', jm.get(id).name);
}
export function normalizarBuild(TV2, b) {
  const c = JSON.parse(JSON.stringify(b || {}));
  TV2.normBuild(c);
  return c;
}
export function compararTalentos(R, { C, TV2, talents }) {
  compararArbol(R, C.tree?.cls, talents.cls?.nodes, 'clase');
  const specs = C.specOrder || [];
  R.eq(specs, (talents.specs || []).map(s => s.id), 'spec.orden');
  for (const sp of specs) {
    const js = (talents.specs || []).find(s => s.id === sp);
    if (!js) continue;
    const meta = C.specs?.[sp] || {};
    R.eq(meta.name, js.name, `spec.${sp}.name`);
    R.eq(meta.role, js.roleLabel, `spec.${sp}.roleLabel`);
    R.eq(meta.gauge, js.mechanic, `spec.${sp}.mechanic`);
    compararArbol(R, C.tree?.spec?.[sp], js.nodes, `spec.${sp}`);
  }
  const mh = C.tree?.hero || [], jh = talents.hero || [];
  R.eq(mh.map(h => h.id), jh.map(h => h.id), 'heroe.orden');
  for (const h of mh) {
    const j = jh.find(x => x.id === h.id);
    if (!j) continue;
    R.eq(h.n, j.name, `heroe.${h.id}.name`);
    R.eq(h.specs, j.specs, `heroe.${h.id}.specs`);
    R.eq(h.key ?? null, j.key ?? null, `heroe.${h.id}.key`);
    R.eq(h.line ?? null, j.line ?? null, `heroe.${h.id}.line`);
    compararArbol(R, h.nodes, j.nodes, `heroe.${h.id}`);
  }
  const mb = C.builds || {}, jb = talents.builds || {};
  R.eq(Object.keys(mb).sort(), Object.keys(jb).sort(), 'builds.claves');
  for (const k of Object.keys(mb)) {
    if (!jb[k]) continue;
    const a = normalizarBuild(TV2, mb[k]), b = normalizarBuild(TV2, jb[k]);
    for (const f of new Set([...Object.keys(a), ...Object.keys(b)])) {
      // `spec` y `clsOrder` en orden de compra; el resto, sin importar el orden de las claves
      R.eq(a[f] ?? null, b[f] ?? null, `builds.${k}.${f}`, f === 'spec');
    }
  }
  R.eq(C.defaultBuild || {}, talents.defaultBuild || {}, 'defaultBuild');
}

// ---------------------------------------------------------------- catálogo y forja
export function compararCatalogo(R, { C, cat }) {
  const mc = C.catalog || [];
  const jc = new Map();
  for (const s of [...(cat.skills || []), ...(cat.talentSkills || [])]) if (s?.id && !jc.has(s.id)) jc.set(s.id, s);
  for (const m of mc) {
    const j = jc.get(m.id);
    if (!j) { R.dif(`catalogo.${m.id}`, m.n, '(falta en el juego)'); continue; }
    for (const k of ['cat', 'req', 'elem']) R.eq(m[k], j[k], `catalogo.${m.id}.${k}`);
    R.eq(m.spec ?? null, j.spec ?? null, `catalogo.${m.id}.spec`);
    R.eq(!!m.talent, j.kind === 'talent', `catalogo.${m.id}.talent`);
    jc.delete(m.id);
  }
  for (const id of jc.keys()) R.dif(`catalogo.${id}`, '(no está en el mockup)', jc.get(id).name);
  const forge = cat.forge || {};
  const conForja = mc.filter(s => !s.talent);
  for (const s of conForja) {
    const f = forge[s.id];
    if (!f) { R.dif(`forja.${s.id}`, s.M?.n, '(falta la entrada de forja)'); continue; }
    R.eq(s.M?.n, f.mejora?.name, `forja.${s.id}.mejora.name`);
    R.eq(s.M?.s, f.mejora?.line, `forja.${s.id}.mejora.line`);
    [['A', 'i'], ['B', 'ii']].forEach(([v, sfx], i) => {
      const x = f.vars?.[i] || {};
      R.eq(`${s.id}_${sfx}`, x.id, `forja.${s.id}.vars.${sfx}.id`);
      R.eq(s[v]?.n, x.name, `forja.${s.id}.vars.${sfx}.name`);
      R.eq(s[v]?.s, x.line, `forja.${s.id}.vars.${sfx}.line`);
      R.eq(s[v]?.r, x.role, `forja.${s.id}.vars.${sfx}.role`);
    });
  }
  for (const id of Object.keys(forge)) if (!conForja.some(s => s.id === id)) R.dif(`forja.${id}`, '(no tiene forja en el mockup)', forge[id]?.mejora?.name);
  for (const [sp, sb] of Object.entries(C.specBar || {})) {
    const j = cat.specBar?.[sp];
    if (!j) { R.dif(`barra.${sp}`, sb.bar, '(falta)'); continue; }
    R.eq(sb.bar, j.bar, `barra.${sp}.bar`);
    R.eq(sb.sel ?? null, j.sel ?? null, `barra.${sp}.sel`);
    R.eq(Object.fromEntries(Object.entries(sb.forge || {}).map(([id, v]) => [id, varDe(v)])), j.forge || {}, `barra.${sp}.forge`);
  }
  const reco = Object.fromEntries(Object.entries(C.reco || {}).map(([sp, r]) => [sp, Object.fromEntries(Object.entries(r || {}).map(([id, v]) => [id, varDe(v)]))]));
  R.eq(reco, cat.forgeReco || {}, 'reco');
  R.eq(C.fallbackBar || {}, cat.fallbackBar || {}, 'reserva');
}

// ---------------------------------------------------------------- una clase
// talents = <CLASE>_TALENTS del juego (o del borrador); cat = { skills, talentSkills, forge, specBar, forgeReco, fallbackBar }
// Cada parte se compara solo si existe: talents?.v === 2 · cat (lo pasa quien llama si CATALOG_V === 2).
export function compararClase({ cls, C, TV2, talents, cat }) {
  const R = nuevoInforme(cls);
  if (talents?.v === 2) compararTalentos(R, { C, TV2, talents });
  else R.info.push(`talentos del juego en v${talents?.v || 1}: se saltan`);
  if (cat) compararCatalogo(R, { C, cat });
  else R.info.push('catálogo del juego sin CATALOG_V = 2: se salta');
  return R;
}

// aplica las divergencias declaradas → { errores: [texto], cubiertas: [texto], obsoletas: [decl] }
export function aplicarDivergencias(R, divergencias) {
  const decl = divergencias.filter(d => d.clase === R.cls || d.clase === '*');
  const usadas = new Set();
  const errores = [], cubiertas = [];
  for (const d of R.difs) {
    const dv = decl.find(x => d.ruta === x.ruta || d.ruta.startsWith(x.ruta + '.') || d.ruta.startsWith(x.ruta + '('));
    const txt = `${R.cls} · ${d.ruta}: mockup ${corto(d.mockup)} · juego ${corto(d.juego)}`;
    if (dv) { usadas.add(dv); cubiertas.push(`${txt} (declarada: ${dv.motivo})`); } else errores.push(txt);
  }
  return { errores, cubiertas, obsoletas: decl.filter(x => !usadas.has(x)) };
}
