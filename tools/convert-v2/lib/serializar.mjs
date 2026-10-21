// Serializador de datos a fuente de JS legible (objetos, listas, funciones d(r) y comentarios).
import { FUENTE, fuenteFuncion } from './funciones.mjs';

const IDENT = /^[A-Za-z_$][\w$]*$/;
export const RAW = Symbol('raw');            // { [RAW]: 'texto' } se escribe tal cual (referencia a una constante)
export const COMENT = Symbol('comentario');   // objeto[COMENT] = ['línea', …] → comentario antes del elemento

export const raw = txt => ({ [RAW]: txt });
export function comentar(obj, lineas) { if (obj && lineas?.length) obj[COMENT] = [...(obj[COMENT] || []), ...lineas]; return obj; }

// separadores de línea de Unicode (U+2028, U+2029): terminan una cadena de JS si van sin escapar
const LS = new RegExp(String.fromCharCode(0x2028), 'g'), PS = new RegExp(String.fromCharCode(0x2029), 'g');
export function quote(s) {
  return "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r/g, '\\r').replace(/\n/g, '\\n')
    .replace(LS, '\\u' + '2028').replace(PS, '\\u' + '2029') + "'";
}
export const clave = k => (IDENT.test(k) ? k : quote(k));

const compuesto = v => v && typeof v === 'object' && !v[RAW] && (Array.isArray(v) ? v.length : Object.keys(v).length) > 0;

export function inline(v) {
  if (v === null) return 'null';
  if (v === undefined) return 'undefined';
  if (typeof v === 'function') return v[FUENTE] || fuenteFuncion(v);
  if (typeof v === 'string') return quote(v);
  if (typeof v === 'number') return Object.is(v, -0) ? '-0' : String(v);
  if (typeof v === 'boolean') return String(v);
  if (v[RAW]) return v[RAW];
  if (Array.isArray(v)) return v.length ? `[${v.map(inline).join(', ')}]` : '[]';
  const ent = Object.entries(v).filter(([, x]) => x !== undefined);
  return ent.length ? `{ ${ent.map(([k, x]) => `${clave(k)}: ${inline(x)}`).join(', ')} }` : '{}';
}

// ser(v, ind, opts): una línea si cabe en `ancho` (o si no tiene hijos compuestos); si no, un elemento por línea.
// opts.modo(ruta, v) → 'inline' | 'multi' | undefined permite forzar el formato (p. ej. un nodo por línea).
export function ser(v, ind = '', opts = {}, ruta = []) {
  const { ancho = 140, modo = () => undefined } = opts;
  if (!compuesto(v) || typeof v === 'function') return inline(v);
  const m = modo(ruta, v);
  if (m === 'inline') return inline(v);
  const una = inline(v);
  if (m !== 'multi') {
    const hijosCompuestos = (Array.isArray(v) ? v : Object.values(v)).some(compuesto);
    if (!hijosCompuestos || ind.length + una.length <= ancho) return una;
  }
  const ind2 = ind + '  ';
  const coment = x => (x && typeof x === 'object' && x[COMENT] ? x[COMENT].map(l => `${ind2}// ${l}\n`).join('') : '');
  if (Array.isArray(v)) {
    return `[\n${v.map((x, i) => `${coment(x)}${ind2}${ser(x, ind2, opts, [...ruta, i])},\n`).join('')}${ind}]`;
  }
  const ent = Object.entries(v).filter(([, x]) => x !== undefined);
  return `{\n${ent.map(([k, x]) => `${coment(x)}${ind2}${clave(k)}: ${ser(x, ind2, opts, [...ruta, k])},\n`).join('')}${ind}}`;
}
