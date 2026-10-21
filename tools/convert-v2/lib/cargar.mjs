// Carga de los datos del mockup (talents-v2-comun.js + talents-v2-<clase>.js) en node:vm con un
// `window` falso, igual que el mockup (scripts clásicos) y que docs/mockups/data/validar-talentos.mjs.
// Sin dependencias. Cada carga usa un contexto nuevo: los objetos devueltos se pueden mutar sin
// afectar a otra carga (p. ej. TV2.normBuild muta las builds).
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve, relative } from 'node:path';
import vm from 'node:vm';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
export const MOCKUP_DIR = join(ROOT, 'docs', 'mockups', 'data');
export const CLASES = ['maga', 'guerrero', 'arquera'];
export const PREFIJO = { maga: 'MAGA', guerrero: 'GUERRERO', arquera: 'ARQUERA' };

// sha1 corto del texto con saltos de línea normalizados (el hash no cambia con CRLF/LF)
export function hashTexto(txt) {
  return createHash('sha1').update(txt.replace(/\r\n/g, '\n')).digest('hex').slice(0, 12);
}

// { TV2, C, archivo, hash, rel } · C = null si el archivo de la clase no existe o no se registra
export function cargarMockup(cls, dir = MOCKUP_DIR) {
  const ctx = { console };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  const comun = join(dir, 'talents-v2-comun.js');
  if (!existsSync(comun)) throw new Error(`no existe ${comun}`);
  vm.runInContext(readFileSync(comun, 'utf8'), ctx, { filename: 'talents-v2-comun.js' });
  const archivo = join(dir, `talents-v2-${cls}.js`);
  if (!existsSync(archivo)) return { TV2: ctx.TV2, C: null, archivo, hash: null, rel: rel(archivo) };
  const txt = readFileSync(archivo, 'utf8');
  vm.runInContext(txt, ctx, { filename: `talents-v2-${cls}.js` });
  return { TV2: ctx.TV2, C: ctx.TALENTS_V2_CLASSES?.[cls] || null, archivo, hash: hashTexto(txt), rel: rel(archivo) };
}

function rel(p) {
  const r = relative(ROOT, p).replace(/\\/g, '/');
  return r.startsWith('..') ? p.replace(/\\/g, '/') : r;
}

// todos los nodos de una clase del mockup, con su árbol: [{ n, arbol:'cls'|<specId>|<heroId>, tipo:'cls'|'spec'|'hero' }]
export function nodosMockup(C) {
  const out = [];
  for (const n of C.tree?.cls || []) out.push({ n, arbol: 'cls', tipo: 'cls' });
  for (const sp of C.specOrder || []) for (const n of C.tree?.spec?.[sp] || []) out.push({ n, arbol: sp, tipo: 'spec' });
  for (const h of C.tree?.hero || []) for (const n of h.nodes || []) out.push({ n, arbol: h.id, tipo: 'hero' });
  return out;
}
