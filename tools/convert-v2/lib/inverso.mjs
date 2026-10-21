// --validate-game: datos del JUEGO (o de un borrador) → formato del mockup, para pasarles el validador del mockup
// (docs/mockups/data/validar-talentos.mjs: rejillas, presupuesto, puertas, builds punto a punto con simularBuild).
// Los metadatos que el juego no guarda (recurso, textos de la barra de mecánica, demos…) se toman del mockup:
// lo que se valida son los árboles, las builds, el catálogo y la barra del juego.
import { mkdtempSync, copyFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { ser } from './serializar.mjs';
import { fuenteFuncion } from './funciones.mjs';

const VAR_INV = { i: 'A', ii: 'B' };
const arte = r => (typeof r === 'string' ? r.replace(/^skills256\//, 'icons256/') : r);   // ruta del repo → ruta del arte del mockup
const sinUndef = o => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));
// una d de texto fijo → función cuya fuente lleva el texto literal (se escribe en el script del validador)
// eslint-disable-next-line no-new-func
const dFija = s => new Function(`return () => ${JSON.stringify(String(s))};`)();

function nodoMockup(n) {
  const out = sinUndef({ id: n.id, n: n.name, t: n.t, tag: n.tag, r: n.r, c: n.c, max: n.max, req: n.req, free: n.free || undefined,
    d: n.t === 'c' ? undefined : (typeof n.d === 'function' ? n.d : (n.d != null ? dFija(n.d) : undefined)),
    touch: n.touch?.filter(x => !x.startsWith('@')), arch: n.arch, final: n.final, hyb: n.hyb, icon: n.icon, win: n.win, impl: n.todo });
  if (n.opts) out.opts = n.opts.map(o => sinUndef({ k: o.k, n: o.name, d: o.desc, role: o.role, act: o.fx?.grant, touch: o.touch, icon: o.icon, impl: o.todo }));
  return out;
}

export function claseMockupDesdeJuego({ C, talents, cat }) {
  const specs = (talents.specs || []).map(s => s.id);
  const forge = cat?.forge || {};
  const catalog = [];
  for (const s of cat?.skills || []) {
    const f = forge[s.id] || {}, [vi, vii] = f.vars || [];
    catalog.push(sinUndef({ id: s.id, n: s.name, cat: s.cat, req: s.req, spec: s.spec, elem: s.elem, coef: s.coef, cost: s.cost, cd: s.cd, gen: s.gen,
      s: s.line || s.desc, icon: arte(s.art), innate: s.innate,
      M: f.mejora ? { n: f.mejora.name, s: f.mejora.line, k: '' } : undefined,
      A: vi ? { n: vi.name, r: vi.role, s: vi.line, k: '' } : undefined, B: vii ? { n: vii.name, r: vii.role, s: vii.line, k: '' } : undefined }));
  }
  for (const s of cat?.talentSkills || talents.skills || [])
    catalog.push(sinUndef({ id: s.id, n: s.name, cat: s.cat, req: s.req, talent: true, grantBy: s.grantBy, hero: s.hero || undefined, elem: s.elem, cd: s.cd, gen: s.gen, s: s.line || s.desc, icon: arte(s.art) }));
  const conv = (m, f) => Object.fromEntries(Object.entries(m || {}).map(([k, v]) => [k, f(v)]));
  const aVar = r => conv(r, v => VAR_INV[v] || v);
  return {
    formato: C.formato, estado: C.estado, id: C.id, name: talents.cls?.name || C.name, res: C.res, resIcon: C.resIcon, color: C.color,
    emblem: C.emblem, clsArt: C.clsArt, book: C.book, specOrder: specs, defaultSpec: C.defaultSpec, specs: C.specs,
    catalog: cat ? catalog : C.catalog,
    fallbackBar: cat ? cat.fallbackBar : C.fallbackBar,
    specBar: cat ? conv(cat.specBar, sb => ({ bar: sb.bar, forge: aVar(sb.forge), sel: sb.sel })) : C.specBar,
    reco: cat ? conv(cat.forgeReco, aVar) : C.reco,
    sup: C.sup, mech: C.mech, innate: C.innate, groups: talents.groups || C.groups,
    tree: { cls: (talents.cls?.nodes || []).map(nodoMockup), spec: Object.fromEntries((talents.specs || []).map(s => [s.id, (s.nodes || []).map(nodoMockup)])),
      hero: (talents.hero || []).map(h => ({ id: h.id, n: h.name, specs: h.specs, art: h.art, line: h.line, key: h.key, nodes: (h.nodes || []).map(nodoMockup) })) },
    builds: JSON.parse(JSON.stringify(talents.builds || {})), defaultBuild: talents.defaultBuild, demo: C.demo,
  };
}

// escribe el validador, las reglas comunes y la clase convertida en una carpeta temporal y lo ejecuta
export function validarConMockup({ cls, obj, helpers, mockupDir, estructura = false, conservar = false }) {
  const dir = mkdtempSync(join(tmpdir(), 'convert-v2-'));
  copyFileSync(join(mockupDir, 'talents-v2-comun.js'), join(dir, 'talents-v2-comun.js'));
  copyFileSync(join(mockupDir, 'validar-talentos.mjs'), join(dir, 'validar-talentos.mjs'));
  const consts = Object.entries(helpers).map(([k, f]) => `const ${k} = ${fuenteFuncion(f)};`).join('\n');
  const txt = `(function () {\n'use strict';\n${consts}\nwindow.TALENTS_V2_CLASSES = window.TALENTS_V2_CLASSES || {};\n` +
    `window.TALENTS_V2_CLASSES[${JSON.stringify(cls)}] = ${ser(obj, '', { ancho: 160 })};\n})();\n`;
  writeFileSync(join(dir, `talents-v2-${cls}.js`), txt);
  const r = spawnSync(process.execPath, [join(dir, 'validar-talentos.mjs'), cls, ...(estructura ? ['--estructura'] : [])], { encoding: 'utf8' });
  if (!conservar) rmSync(dir, { recursive: true, force: true });
  return { dir: conservar ? dir : null, status: r.status, salida: (r.stdout || '') + (r.stderr || '') };
}
