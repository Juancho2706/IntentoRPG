// Texto de los archivos que escribe el conversor: js/talents-<clase>.js, js/hero-<clase>.js (formato §3.1)
// y skills-<clase>.draft.js (formato §3.5). Un nodo por línea (las opciones de una elección, una por línea).
import { relative, join, isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';
import { inline, ser, clave } from './serializar.mjs';
import { identificadoresLibres, FUENTE } from './funciones.mjs';
import { PREFIJO } from './cargar.mjs';

const kv = ([k, v]) => `${clave(k)}: ${inline(v)}`;

export function serNodo(n, ind) {
  const ent = Object.entries(n).filter(([, v]) => v !== undefined);
  const i = ent.findIndex(([k]) => k === 'opts');
  if (i < 0) return `{ ${ent.map(kv).join(', ')} }`;
  const antes = ent.slice(0, i), despues = ent.slice(i + 1);
  return `{ ${antes.map(kv).join(', ')}, opts: [\n${n.opts.map(o => `${ind}    ${inline(o)},`).join('\n')}\n${ind}  ]` +
    (despues.length ? `,\n${ind}  ${despues.map(kv).join(', ')} }` : ' }');
}
export function serNodos(nodes, ind) {
  return nodes.length ? `[\n${nodes.map(n => `${ind}  ${serNodo(n, ind + '  ')},`).join('\n')}\n${ind}]` : '[]';
}
// objeto con un campo por línea; `extra` = [[clave, textoYaSerializado]] al final
function objLineas(ent, ind, extra = []) {
  const lineas = [...ent.filter(([, v]) => v !== undefined).map(([k, v]) => `${ind}  ${clave(k)}: ${ser(v, ind + '  ')},`),
    ...extra.map(([k, t]) => `${ind}  ${clave(k)}: ${t},`)];
  return `{\n${lineas.join('\n')}\n${ind}}`;
}

// helpers de talent-text.js que usan las d(r) de una lista de nodos
function helpersUsados(listas, helpers) {
  const usados = new Set();
  for (const nodes of listas) for (const n of nodes) {
    if (typeof n.d === 'function') for (const v of identificadoresLibres(n.d[FUENTE] || String(n.d))) if (v in helpers) usados.add(v);
  }
  return [...usados].sort();
}

function cabecera({ titulo, rel, hash, estado, modo, extra = [] }) {
  return [
    '// ============================================================',
    `// ${titulo}`,
    '// ============================================================',
    `// Generado por tools/convert-v2/convert.mjs (${modo}) desde ${rel} (sha1 ${hash}, estado «${estado}»).`,
    ...extra.map(l => `// ${l}`),
    '',
  ].join('\n');
}

export function textoHero({ cls, conv, helpers, fuente }) {
  const P = PREFIJO[cls];
  const usados = helpersUsados(conv.hero.map(h => h.nodes), helpers);
  const arboles = conv.hero.map(h => {
    const { nodes, ...meta } = h;
    return `  { ${Object.entries(meta).filter(([, v]) => v !== undefined).map(kv).join(', ')}, nodes: ${serNodos(nodes, '  ')} },`;
  });
  return cabecera({ titulo: `ÁRBOLES HÉROE (Paragon) de la clase ${conv.talents.cls.name} — esqueleto v2`, ...fuente, extra: [
    'Formato: docs/paso2-implementacion.md §3.1 y D5 (lo importa SOLO js/talents-' + cls + '.js, campo `hero`).',
    'Estructura y textos exactos (tests/test-v2-paridad.mjs); `fx: {}` + `todo` = `impl` del mockup (E2: KT).'] }) +
    (usados.length ? `import { ${usados.join(', ')} } from './talent-text.js';\n\n` : '') +
    `export const ${P}_HERO = [\n${arboles.join('\n')}\n];\n`;
}

// escribirJs: true en --write (E1.5, js/): las definiciones de las activas que YA existen quedan en un puente
// @deprecated (<CLASE>_TALENT_SKILL_DEFS = <CLASE>_TALENTS.skills) que data.js fusiona mientras <CLASE>_CATALOG_V = 1.
// En --draft las definiciones van al borrador del catálogo (skills-<clase>.draft.js), como manda D29.
export function textoTalents({ cls, conv, helpers, fuente, escribirJs = false }) {
  const P = PREFIJO[cls], t = conv.talents;
  const usados = helpersUsados([t.cls.nodes, ...t.specs.map(s => s.nodes)], helpers);
  const specs = t.specs.map(s => {
    const { nodes, ...meta } = s;
    return `    ${objLineas(Object.entries(meta), '    ', [['nodes', serNodos(nodes, '      ')]]).replace(/^ {4}/, '')},`;
  });
  const { nodes: clsNodes, ...clsMeta } = t.cls;
  const pend = conv.ctx.activasPendientes || [];
  const puente = escribirJs ? [
    `/** @deprecated D29 (puente de E1.5 hasta KA1): definición de las activas de talento que YA existen en el juego,`,
    ` *  mientras ${P}_CATALOG_V = 1 (data.js las fusiona en CLASSES como antes). Con el catálogo 2g`,
    ` *  (${P}_CATALOG_V = 2) viven en skills-${cls}.js y data.js deja de leer esta lista; se borra en E5 (C1). */`,
    `export const ${P}_TALENT_SKILL_DEFS = ${ser(conv.talentSkills, '', { modo: r => (r.length === 0 ? 'multi' : 'inline') })};`,
    '',
  ] : [];
  const cuerpo = [
    '// D29: las 6 activas de talento de la clase (los nodos las conceden con `grant`); su definición vive en el catálogo.',
    ...(pend.length ? [`// Aún no son activas de talento en el juego (las escribe KA1 en el catálogo; su nodo queda sin grant): ${pend.join(', ')}.`] : []),
    ...((conv.ctx.activasEnCatalogo || []).length ? [`// (${conv.ctx.activasEnCatalogo.join(', ')}: hoy es una habilidad base del catálogo; KA1 la convierte en activa de talento.)`] : []),
    `export const ${P}_TALENT_SKILLS = ${inline(conv.talentSkillIds || conv.talentSkills.map(s => s.id))};`,
    '',
    ...puente,
    `export const ${P}_TALENTS = {`,
    '  v: 2,',
    `  cls: { ${Object.entries(clsMeta).map(kv).join(', ')}, nodes: ${serNodos(clsNodes, '  ')} },`,
    `  specs: [\n${specs.join('\n')}\n  ],`,
    `  hero: ${P}_HERO,`,
    `  builds: ${ser(t.builds, '  ', { modo: r => (r.length <= 1 ? 'multi' : 'inline') })},`,
    `  defaultBuild: ${inline(t.defaultBuild)},`,
    `  groups: ${ser(t.groups, '  ', { modo: r => (r.length === 0 ? 'multi' : 'inline') })},`,
    ...(escribirJs ? [`  skills: ${P}_TALENT_SKILL_DEFS,   // puente D29 (ver arriba)`] : []),
    '};',
    '',
  ];
  return cabecera({ titulo: `TALENTOS v2 de la clase ${t.cls.name} — esqueleto (clase 30 + especialización 3×29 + héroe 3×13)`, ...fuente, extra: [
    'Formato: docs/paso2-implementacion.md §3.1. Estructura, textos, builds y defaultBuild EXACTOS al mockup',
    '(los compara tests/test-v2-paridad.mjs: una divergencia deliberada va en tools/convert-v2/divergencias.json).',
    '`fx: {}` + `todo` = el `impl` del mockup: E2 (KT) los escribe y borra `todo`. Importa SOLO hero y talent-text.'] }) +
    `import { ${P}_HERO } from './hero-${cls}.js';\n` +
    (usados.length ? `import { ${usados.join(', ')} } from './talent-text.js';\n` : '') + '\n' + cuerpo.join('\n');
}

export function textoSkillsDraft({ cls, conv, fuente }) {
  const P = PREFIJO[cls];
  const modoForja = r => (r.length <= 1 || (r.length === 2 && r[1] === 'vars') ? 'multi' : 'inline');
  return cabecera({ titulo: `CATÁLOGO 2g de la clase ${conv.talents.cls.name} — BORRADOR para KA (no lo carga el juego)`, ...fuente, extra: [
    'Formato: docs/paso2-implementacion.md §3.5 (forja de 2f §2.3). Ids, cat, req, spec, elem, nombres, líneas y papeles',
    'exactos (los compara tests/test-v2-paridad.mjs cuando <CLASE>_CATALOG_V = 2). Los efectos se escriben a mano desde',
    'el `k` del mockup (en comentario) y el documento de la clase. Encima de cada habilidad que ya existe, su definición actual.',
    `D29: las ${conv.talentSkills.length} activas de talento (kind 'talent', slots ['k2']) van en este catálogo, al final de ${P}_SKILLS;`,
    `en talents-${cls}.js, ${P}_TALENT_SKILLS es solo la lista de ids: ${conv.talentSkills.map(s => s.id).join(', ') || '—'}.`] }) +
    [
      `export const ${P}_SKILLS = ${ser([...conv.skills, ...conv.talentSkills], '', { modo: r => (r.length === 0 ? 'multi' : 'inline') })};`,
      '',
      '// Forja: ids estables <id>_i / <id>_ii; papeles UNI · AREA · CTRL · AGU · APO · MOV; Mejora a Nv req+3, variantes a req+6',
      `export const ${P}_SKILL_FORGE = ${ser(conv.forge, '', { modo: modoForja })};`,
      '',
      "// Barra, forja ('i'/'ii'; el mockup usa 'A'/'B') y habilidad seleccionada al elegir la especialización (D6)",
      `export const ${P}_SPEC_BAR = ${ser(conv.specBar, '', { modo: r => (r.length === 0 ? 'multi' : 'inline') })};`,
      `export const ${P}_FORGE_RECO = ${ser(conv.forgeReco, '', { modo: r => (r.length === 0 ? 'multi' : 'inline') })};`,
      `export const ${P}_FALLBACK_BAR = ${inline(conv.fallbackBar)};`,
      `export const ${P}_CATALOG_V = 2;`,
      '',
    ].join('\n');
}

// reexporta js/talent-text.js para que el borrador de out/<clase>/ se pueda importar tal cual
// (dirShim = carpeta del borrador; jsDir = js/ del repo; en otra unidad de disco se usa una URL file://)
export function textoShim(dirShim, jsDir) {
  let spec = relative(dirShim, join(jsDir, 'talent-text.js')).replace(/\\/g, '/');
  if (isAbsolute(spec) || /^[A-Za-z]:/.test(spec)) spec = pathToFileURL(join(jsDir, 'talent-text.js')).href;
  else if (!spec.startsWith('.')) spec = './' + spec;
  return `// Solo para importar el borrador desde out/: reexporta js/talent-text.js (en js/ el import es directo).\nexport * from '${spec}';\n`;
}
