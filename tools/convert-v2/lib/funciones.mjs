// Funciones d(r) de los datos: fuente serializable, identificadores libres y verificación de texto.
// Regla (docs/paso2-implementacion.md §4): las d(r) se copian con toString(); sus identificadores
// libres solo pueden ser exports de js/talent-text.js (n1, pl…); si aparece otro, el conversor falla.
// Después se evalúa la fuente copiada con esos helpers y se compara su texto con el del mockup para
// r = 1…max.

const KEYWORDS = new Set(['true', 'false', 'null', 'undefined', 'typeof', 'instanceof', 'new', 'return', 'if', 'else', 'const',
  'let', 'var', 'function', 'this', 'void', 'in', 'of', 'NaN', 'Infinity', 'delete', 'do', 'while', 'for', 'break', 'continue',
  'switch', 'case', 'default', 'throw', 'try', 'catch', 'finally', 'async', 'await', 'yield', 'class', 'extends', 'super']);
// globales de JS que una d(r) puede usar sin importarlos
const GLOBALES = new Set(['Math', 'String', 'Number', 'Array', 'Object', 'JSON', 'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'Boolean']);

// léxico mínimo de una expresión de JS: identificadores, puntuación, cadenas y plantillas (con ${…} anidados)
export function lex(src) {
  const toks = [];
  let i = 0;
  const push = (t, v) => toks.push({ t, v });
  function hasta(cierraLlave) {
    let depth = 0;
    while (i < src.length) {
      const ch = src[i];
      if (/\s/.test(ch)) { i++; continue; }
      if (ch === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
      if (ch === '/' && src[i + 1] === '*') { const j = src.indexOf('*/', i + 2); i = j < 0 ? src.length : j + 2; continue; }
      if (ch === '"' || ch === "'") {
        let j = i + 1;
        while (j < src.length && src[j] !== ch) { if (src[j] === '\\') j++; j++; }
        push('str', src.slice(i, j + 1)); i = j + 1; continue;
      }
      if (ch === '`') { i++; push('tpl', '`'); plantilla(); continue; }
      if (/[A-Za-z_$]/.test(ch)) {
        let j = i; while (j < src.length && /[\w$]/.test(src[j])) j++;
        push('id', src.slice(i, j)); i = j; continue;
      }
      if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(src[i + 1] || ''))) {
        let j = i; while (j < src.length && /[\w.]/.test(src[j])) j++;
        push('num', src.slice(i, j)); i = j; continue;
      }
      if (ch === '{') { depth++; push('p', '{'); i++; continue; }
      if (ch === '}') { if (cierraLlave && depth === 0) { i++; return; } depth--; push('p', '}'); i++; continue; }
      if (src.startsWith('=>', i)) { push('p', '=>'); i += 2; continue; }
      if (src.startsWith('...', i)) { push('p', '...'); i += 3; continue; }
      if (src.startsWith('?.', i) && !/[0-9]/.test(src[i + 2] || '')) { push('p', '?.'); i += 2; continue; }
      push('p', ch); i++;
    }
  }
  function plantilla() {
    while (i < src.length) {
      const ch = src[i];
      if (ch === '\\') { i += 2; continue; }
      if (ch === '`') { i++; return; }
      if (ch === '$' && src[i + 1] === '{') { i += 2; push('p', '('); hasta(true); push('p', ')'); continue; }
      i++;
    }
  }
  hasta(false);
  return toks;
}

// identificadores libres de la fuente de una función (sin parámetros, locales, palabras clave ni globales de JS)
export function identificadoresLibres(src) {
  const toks = lex(src);
  const params = new Set(), locales = new Set(), usados = new Set();
  for (let k = 0; k < toks.length; k++) {
    const tk = toks[k];
    if (tk.v === '=>') {
      const prev = toks[k - 1];
      if (prev?.t === 'id') params.add(prev.v);
      else if (prev?.v === ')') {
        let d = 0;
        for (let m = k - 1; m >= 0; m--) {
          if (toks[m].v === ')') d++;
          else if (toks[m].v === '(') { d--; if (d === 0) break; }
          else if (d === 1 && toks[m].t === 'id' && ['(', ',', '...'].includes(toks[m - 1]?.v)) params.add(toks[m].v);
        }
      }
    }
    if (tk.t === 'id' && ['const', 'let', 'var'].includes(tk.v) && toks[k + 1]?.t === 'id') locales.add(toks[k + 1].v);
    if (tk.t === 'id' && tk.v === 'function') {
      let m = k + 1;
      if (toks[m]?.t === 'id') { locales.add(toks[m].v); m++; }
      if (toks[m]?.v === '(') for (m++; m < toks.length && toks[m].v !== ')'; m++) if (toks[m].t === 'id') params.add(toks[m].v);
    }
  }
  for (let k = 0; k < toks.length; k++) {
    const tk = toks[k];
    if (tk.t !== 'id') continue;
    const prev = toks[k - 1], next = toks[k + 1];
    if (prev && (prev.v === '.' || prev.v === '?.')) continue;                    // propiedad: x.y
    if (next?.v === ':' && (prev?.v === '{' || prev?.v === ',')) continue;        // clave de un objeto literal
    if (KEYWORDS.has(tk.v)) continue;
    usados.add(tk.v);
  }
  return [...usados].filter(v => !params.has(v) && !locales.has(v) && !GLOBALES.has(v)).sort();
}

// fuente de una función lista para escribirse como expresión (LF; método abreviado → function)
export function fuenteFuncion(fn) {
  let src = Function.prototype.toString.call(fn).replace(/\r\n/g, '\n');
  if (/^[A-Za-z_$][\w$]*\s*\(/.test(src) && !/^function\b/.test(src) && !/^async\b/.test(src)) src = 'function ' + src;
  return src;
}

// compila la fuente con los helpers de js/talent-text.js como únicos nombres libres
export function compilar(src, helpers) {
  const nombres = Object.keys(helpers);
  // eslint-disable-next-line no-new-func
  return new Function(...nombres, `"use strict"; return (${src});`)(...nombres.map(n => helpers[n]));
}

// Verifica una d(r) del mockup: identificadores libres ⊆ helpers y mismo texto para r = 1…max.
// → { src, errores: [texto] } (src = fuente a escribir; null si d no es función)
export function verificarD(d, max, helpers, donde) {
  const errores = [];
  if (typeof d !== 'function') return { src: null, errores };
  const src = fuenteFuncion(d);
  const libres = identificadoresLibres(src).filter(v => !(v in helpers));
  if (libres.length) {
    errores.push(`${donde}: d(r) usa ${libres.map(v => `«${v}»`).join(', ')}, que no exporta js/talent-text.js (exporta: ${Object.keys(helpers).join(', ')})`);
    return { src, errores };
  }
  let f;
  try { f = compilar(src, helpers); } catch (e) { errores.push(`${donde}: la fuente de d(r) no compila fuera del mockup: ${e.message}`); return { src, errores }; }
  for (let r = 1; r <= Math.max(1, max || 1); r++) {
    let a, b;
    try { a = d(r); } catch (e) { a = `‹lanza ${e.message}›`; }
    try { b = f(r); } catch (e) { b = `‹lanza ${e.message}›`; }
    if (a !== b) errores.push(`${donde}: d(${r}) cambia al copiarla: «${a}» → «${b}»`);
  }
  return { src, errores };
}

// texto de una d (función o texto) en el rango r; null si no hay d
export function textoD(d, r) {
  if (typeof d === 'function') { try { return String(d(r)); } catch (e) { return `‹lanza ${e.message}›`; } }
  return d == null ? null : String(d);
}

// marca una función con la fuente que debe escribir el serializador (lo usa serializar.mjs)
export const FUENTE = Symbol('fuente');
export function conFuente(fn, src) { fn[FUENTE] = src; return fn; }
