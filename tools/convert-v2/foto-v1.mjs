#!/usr/bin/env node
// Foto congelada del juego v1 para el conversor (tools/convert-v2/juego-v1.json).
// El conversor necesita lo que había en el juego ANTES de la conmutación de E1.5: las activas de talento v1
// (con su definición, que es la referencia de KA1 para portarlas al kit), el catálogo base de cada clase,
// el rol y las innatas de cada especialización y el vocabulario de claves (parámetros de las definiciones,
// claves tv y stats de los talentos v1). Desde E1.5 js/ ya no lo tiene: si el conversor lo leyera vivo, sus
// salidas (out/ y --write) cambiarían con cada paso del Paso 2 y no se podrían regenerar igual.
//
//   node tools/convert-v2/foto-v1.mjs --commit <sha>      lee js/ de ese commit (git show, sin tocar la copia de trabajo)
//   node tools/convert-v2/foto-v1.mjs --js <carpeta>      lee una carpeta js/ ya extraída
// Se generó una vez desde paso2-impl a3440a7 (E1 fusionado, talentos v1). No se edita a mano.
import { writeFileSync, mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { ROOT, CLASES, PREFIJO } from './lib/cargar.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FOTO_V1 = join(HERE, 'juego-v1.json');   // la lee lib/juego.mjs (fotoV1)
const argv = process.argv.slice(2);
const valor = f => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : undefined; };

// extrae js/ de un commit a una carpeta temporal (git show archivo a archivo: no hace falta tar)
function extraer(commit) {
  const dir = mkdtempSync(join(tmpdir(), 'foto-v1-'));
  const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 });
  const archivos = git('ls-tree', '-r', '--name-only', commit, 'js/').split('\n').filter(f => f.endsWith('.js'));
  for (const f of archivos) {
    const destino = join(dir, f);
    mkdirSync(dirname(destino), { recursive: true });
    writeFileSync(destino, git('show', `${commit}:${f}`));
  }
  return { dir: join(dir, 'js'), limpiar: () => rmSync(dir, { recursive: true, force: true }) };
}

// claves tv y stats que usan los datos de talentos v1 (nodos, opciones e innatas)
function clavesTalentos(t) {
  const tv = new Set(), stats = new Set();
  const nodos = [...(t?.cls?.nodes || []), ...(t?.specs || []).flatMap(s => s.nodes || [])];
  for (const n of nodos) for (const fx of [n.fx, ...(n.opts || []).map(o => o.fx)]) {
    for (const k of Object.keys(fx?.tv || {})) tv.add(k);
    for (const k of Object.keys(fx?.stats || {})) stats.add(k);
  }
  for (const s of t?.specs || []) for (const k of Object.keys(s.innate || {})) stats.add(k);
  return { tv: [...tv].sort(), stats: [...stats].sort() };
}

// una definición del catálogo tal cual (sin funciones ni números no finitos: si los hubiera, la foto no sería fiel)
function plano(v, donde) {
  const s = JSON.stringify(v, (k, x) => {
    if (typeof x === 'function') throw new Error(`${donde}.${k}: una función no cabe en la foto JSON`);
    if (typeof x === 'number' && !Number.isFinite(x)) throw new Error(`${donde}.${k}: número no finito`);
    return x;
  });
  return JSON.parse(s);
}

async function foto(jsDir, commit) {
  const clases = {};
  for (const cls of CLASES) {
    const P = PREFIJO[cls];
    const tm = await import(pathToFileURL(join(jsDir, `talents-${cls}.js`)).href);
    const sm = await import(pathToFileURL(join(jsDir, `skills-${cls}.js`)).href);
    const t = tm[`${P}_TALENTS`];
    if (t?.v === 2) throw new Error(`talents-${cls}.js ya está en v2: la foto es del juego v1`);
    const activas = (t?.skills || tm[`${P}_TALENT_SKILLS`] || []).filter(s => s && typeof s === 'object');
    clases[cls] = {
      v: 1,
      catalogV: sm[`${P}_CATALOG_V`] ?? null,
      skills: (sm[`${P}_SKILLS`] || []).map(s => plano(s, `${cls}.${s.id}`)),
      talentSkills: activas.map(s => plano(s, `${cls}.${s.id}`)),
      specs: (t?.specs || []).map(s => ({ id: s.id, role: s.role ?? null, innate: plano(s.innate || {}, `${cls}.${s.id}.innate`) })),
      ...clavesTalentos(t),
    };
  }
  return {
    _meta: {
      nota: 'Foto congelada del juego v1 (antes de la conmutación de E1.5) para tools/convert-v2: activas de talento v1, catálogo base, ' +
        'especializaciones y vocabulario de claves. La genera tools/convert-v2/foto-v1.mjs; no se edita a mano.',
      commit,
      generado: `node tools/convert-v2/foto-v1.mjs ${commit ? `--commit ${commit}` : '--js <carpeta>'}`,
    },
    clases,
  };
}

const commit = valor('--commit'), jsArg = valor('--js');
if (!commit && !jsArg) { console.log('uso: node tools/convert-v2/foto-v1.mjs --commit <sha> | --js <carpeta js/>'); process.exit(2); }
const fuente = commit ? extraer(commit) : { dir: resolve(jsArg), limpiar: () => {} };
try {
  const j = await foto(fuente.dir, commit || null);
  writeFileSync(FOTO_V1, JSON.stringify(j, null, 1) + '\n');
  for (const [cls, c] of Object.entries(j.clases))
    console.log(`  · ${cls}: ${c.skills.length} habilidades base · ${c.talentSkills.length} activas de talento v1 · ${c.specs.length} especializaciones · tv ${c.tv.length} · stats ${c.stats.length}`);
  console.log(`OK → ${FOTO_V1}`);
} finally { fuente.limpiar(); }
