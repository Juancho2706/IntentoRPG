// Paso 2 (E5, C1) — guardas del cierre: lo que se borró no vuelve
//  1) los stubs @deprecated de D23 ya no se exportan (datos, talentos, catálogos, mixins)
//  2) ningún js/*.js nombra un stub borrado ni deja un @deprecated «se borra en E5» (grep vacío; el
//     @deprecated se busca por COMENTARIO entero: JSDoc de varias líneas y rachas de // incluidas)
//  3) G15: ningún texto de js/ dice «Gastadora» (el término actual es «Principal»)
//  4) D21: la cuarentena (tests/pending-2g.json) está vacía
//  5) cada ruta de ASSETS y UI_ASSETS de sw.js existe en disco CON LA CAPITALIZACIÓN EXACTA (cache.addAll falla
//     entera con un 404; Vercel es Linux, y existsSync no distingue mayúsculas en Windows/macOS)
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as DATA from '../js/data.js';
import * as PB from '../js/paragon-board.js';
import * as SD from '../js/skill-defs.js';
import * as TAL from '../js/talents.js';
import * as SK_G from '../js/skills-guerrero.js';
import * as SK_M from '../js/skills-maga.js';
import * as SK_A from '../js/skills-arquera.js';
import * as TA_G from '../js/talents-guerrero.js';
import * as TA_M from '../js/talents-maga.js';
import * as TA_A from '../js/talents-arquera.js';
import { economyMethods } from '../js/economy.js';
import { skillMethods } from '../js/game-skills.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// ------------------------------------------------ 1) exports retirados
const DEAD = {
  'data.js': [DATA, ['SKILL_MODS', 'aggregateSkillMods', 'PARAGON_BOARD']],
  'paragon-board.js': [PB, ['PARAGON_BOARD']],
  'skill-defs.js': [SD, ['aggregateMods', 'dmgMods', 'buffMods', 'utilMods', 'V_BLEED', 'V_BURN', 'V_POISON', 'V_VULN', 'V_STUN', 'V_SLOW',
    'V_PIERCE', 'V_EXEC', 'V_CHAIN', 'T_ZONE', 'T_CDHIT', 'T_ECHO', 'T_GIANT', 'T_NOVA', 'O_RAD', 'O_PROJ', 'O_PROJ2', 'O_BIG']],
  'talents.js': [TAL, ['TALENT_START_LEVEL', 'specInsignia', 'presetList', 'presetRanks', 'TALENT_CAP_LEVEL', 'featCount', 'SKILL_ELEM',
    'ELEM_NAME', 'skillElem', 'talentSkillBase']],
  'skills-guerrero.js': [SK_G, ['GUERRERO_SKILL_MODS']],
  'skills-maga.js': [SK_M, ['MAGA_SKILL_MODS']],
  'skills-arquera.js': [SK_A, ['ARQUERA_SKILL_MODS']],
  'talents-guerrero.js': [TA_G, ['GUERRERO_TALENT_SKILL_DEFS']],
  'talents-maga.js': [TA_M, ['MAGA_TALENT_SKILL_DEFS']],
  'talents-arquera.js': [TA_A, ['ARQUERA_TALENT_SKILL_DEFS']],
};
const allDead = [];
for (const [file, [ns, names]] of Object.entries(DEAD)) {
  for (const n of names) { assert.equal(ns[n], undefined, `${file}: ${n} se borró (D23, E5)`); allDead.push(n); }
}
// el puente de activas de talento (<CLASE>_TALENTS.skills) tampoco existe: las activas viven en el catálogo (D29)
for (const [id, t] of [['guerrero', TA_G.GUERRERO_TALENTS], ['maga', TA_M.MAGA_TALENTS], ['arquera', TA_A.ARQUERA_TALENTS]])
  assert.equal(t.skills, undefined, `${id}: el árbol ya no trae el puente skills (D29)`);
// métodos de Game retirados (test43 vigila que el resto no cambie)
assert.equal(economyMethods.respecSkills, undefined, 'economy: respecSkills se borró');
assert.equal(skillMethods.chooseSkillMod, undefined, 'game-skills: chooseSkillMod se borró');
assert.equal(economyMethods.respecParagonCost, undefined, 'economy: respecParagonCost se borró (D12: el reinicio es gratis)');
allDead.push('respecSkills', 'chooseSkillMod', 'respecParagonCost');
console.log(`D23: ${allDead.length} exports y métodos retirados ya no existen ✓`);

// ------------------------------------------------ 2) grep vacío en js/
const jsDir = join(ROOT, 'js');
const sources = readdirSync(jsDir).filter(f => f.endsWith('.js')).map(f => [f, readFileSync(join(jsDir, f), 'utf8')]);
assert.ok(sources.length > 60, 'se leen los js/*.js');
const deadRe = new RegExp(`\\b(${allDead.join('|')})\\b`);
const found = [];
for (const [f, src] of sources) src.split(/\r?\n/).forEach((l, i) => { if (deadRe.test(l)) found.push(`js/${f}:${i + 1}: ${l.trim().slice(0, 90)}`); });
assert.deepEqual(found, [], 'nombres borrados que aún aparecen en js/:\n' + found.join('\n'));
// Comentarios de un fuente, cada uno con la línea donde empieza: bloques /* … */ (JSDoc de varias líneas), rachas de
// líneas `//` seguidas y la cola `// …` de una línea de código. Un @deprecated de varias líneas (el formato de varios
// stubs originales: «/** @deprecated … data.js aún lo\n *  importa; C1 lo borra en E5. */») solo se ve si se mira el
// comentario entero, no línea a línea.
function comentarios(src) {
  const out = [], lines = src.split(/\r?\n/);
  const lineaDe = idx => src.slice(0, idx).split(/\r?\n/).length;
  for (const m of src.matchAll(/\/\*[\s\S]*?\*\//g)) out.push({ line: lineaDe(m.index), text: m[0] });
  let racha = null;
  lines.forEach((l, i) => {
    if (/^\s*\/\//.test(l)) {
      if (!racha) { racha = { line: i + 1, text: '' }; out.push(racha); }
      racha.text += l + '\n';
    } else {
      racha = null;
      const k = l.indexOf('//');
      if (k > 0) out.push({ line: i + 1, text: l.slice(k) });
    }
  });
  return out;
}
// líneas (de la marca @deprecated) de los comentarios que dicen «E5» o «C1» (= «se borra en E5 / lo borra C1»)
function deprecadosE5(src) {
  return comentarios(src).filter(c => /@deprecated/.test(c.text) && /\bE5\b|\bC1\b/.test(c.text))
    .map(c => c.line + c.text.slice(0, c.text.indexOf('@deprecated')).split(/\r?\n/).length - 1);
}
// el escáner detecta el caso de una línea Y el de varias (si no, la guarda sería ciega al formato de los stubs originales)
assert.deepEqual(deprecadosE5('/** @deprecated se borra en E5 */\nexport const A = 1;'), [1], 'JSDoc de una línea');
assert.deepEqual(deprecadosE5('export const x = 1;\n/** @deprecated D23: puente; data.js aún lo\n *  importa; C1 lo borra en E5. */\nexport const B = 2;'), [2], 'JSDoc de varias líneas');
assert.deepEqual(deprecadosE5('x();\r\n/**\r\n * @deprecated puente\r\n * (se borra en E5) */\r\nexport const C = 3;'), [3], 'JSDoc con CRLF');
assert.deepEqual(deprecadosE5('x();\n// @deprecated (Paso 2): ramas viejas;\n// se borran en E5\nfoo();'), [2], 'racha de // seguidas');
assert.deepEqual(deprecadosE5('foo(); // @deprecated: C1 lo borra'), [1], 'cola // en una línea de código');
assert.deepEqual(deprecadosE5('/** @deprecated D12: el reinicio es gratis */\nexport const D = 4;'), [], '@deprecated sin E5/C1 no cuenta');
assert.deepEqual(deprecadosE5('// @deprecated algo\nfoo();\n// luego en E5 se ve'), [], 'comentarios separados por código no se mezclan');
assert.deepEqual(deprecadosE5('/** @deprecated algo */\n/** nada de E5 aquí */'), [], 'bloques distintos no se mezclan');
const pending = [];
for (const [f, src] of sources) for (const n of deprecadosE5(src)) pending.push(`js/${f}:${n}: ${src.split(/\r?\n/)[n - 1].trim().slice(0, 90)}`);
assert.deepEqual(pending, [], '@deprecated «se borra en E5» sin borrar:\n' + pending.join('\n'));
console.log('grep vacío en js/: sin nombres de stubs borrados ni @deprecated de E5 ✓');

// ------------------------------------------------ 3) G15: «Gastadora»
const gast = [];
for (const [f, src] of sources) src.split(/\r?\n/).forEach((l, i) => { if (/astadora/i.test(l)) gast.push(`js/${f}:${i + 1}: ${l.trim().slice(0, 90)}`); });
assert.deepEqual(gast, [], 'G15: «Gastadora» en js/ (el término actual es «Principal»):\n' + gast.join('\n'));
assert.equal(SD.CAT_LABELS.spender, 'Principal', 'el término actual de la categoría spender');
console.log('G15: ningún texto de js/ dice «Gastadora» ✓');

// ------------------------------------------------ 4) cuarentena vacía (D21)
const pend = JSON.parse(readFileSync(join(ROOT, 'tests', 'pending-2g.json'), 'utf8'));
assert.deepEqual(Object.keys(pend.suites || {}), [], 'tests/pending-2g.json: la cuarentena debe quedar vacía al cierre (D21)');
console.log('Cuarentena vacía ✓');

// ------------------------------------------------ 5) sw.js: cada ruta existe en disco
const sw = readFileSync(join(ROOT, 'sw.js'), 'utf8');
const listOf = name => {
  const m = sw.match(new RegExp(`const ${name} = \\[([\\s\\S]*?)\\n\\];`));
  assert.ok(m, `sw.js declara ${name}`);
  return [...m[1].matchAll(/'([^']+)'/g)].map(x => x[1]);
};
// existe con la capitalización EXACTA: se recorre cada segmento contra readdirSync (existsSync da true en Windows/macOS
// para «Js/Main.js», y en Vercel (Linux) sería un 404 que tumba cache.addAll entera)
const dirCache = new Map();
const entradas = dir => {
  if (!dirCache.has(dir)) { let r = []; try { r = readdirSync(dir); } catch { /* no es carpeta */ } dirCache.set(dir, r); }
  return dirCache.get(dir);
};
function existeExacto(root, rel) {
  let dir = root;
  for (const seg of rel.split('/').filter(Boolean)) {
    if (!entradas(dir).includes(seg)) return false;
    dir = join(dir, seg);
  }
  return true;
}
assert.ok(existeExacto(ROOT, 'js/main.js'), 'existeExacto: ruta correcta');
assert.ok(!existeExacto(ROOT, 'Js/main.js') && !existeExacto(ROOT, 'js/Main.js') && !existeExacto(ROOT, 'js/main.JS'), 'existeExacto: otra capitalización NO vale');
assert.ok(!existeExacto(ROOT, 'js/no-existe.js'), 'existeExacto: ruta inexistente');
// versionado: un asset sin commitear existe en local pero da 404 en Vercel. Solo AVISA (no falla): `npm test` corre
// ANTES de `git add`/commit, y un archivo recién creado aún no está en el índice. Sin git (zip, CI sin .git): se omite.
let versionados = null;
try {
  versionados = new Set(execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26, stdio: ['ignore', 'pipe', 'ignore'] })
    .split(/\r?\n/).filter(Boolean));
} catch { versionados = null; }
const sinVersionar = [];
for (const name of ['ASSETS', 'UI_ASSETS']) {
  const list = listOf(name);
  assert.ok(list.length > 50, `${name}: se leen las rutas`);
  const rutas = list.filter(u => u.startsWith('./') && u !== './').map(u => u.slice(2));
  const missing = rutas.filter(r => !existeExacto(ROOT, r));
  assert.deepEqual(missing, [], `sw.js ${name}: rutas que no existen con esa capitalización exacta (cache.addAll falla entera con un 404):\n${missing.join('\n')}`);
  assert.equal(new Set(list).size, list.length, `sw.js ${name}: sin rutas repetidas`);
  if (versionados && versionados.size > 100) for (const r of rutas) if (!versionados.has(r)) sinVersionar.push(`${name}: ${r}`);
}
console.log('sw.js: todas las rutas de ASSETS y UI_ASSETS existen (capitalización exacta) ✓');
if (sinVersionar.length) console.log(`⚠ sw.js: ${sinVersionar.length} ruta(s) sin versionar en git (git add antes de desplegar; en Vercel serían un 404):\n  ${sinVersionar.join('\n  ')}`);

console.log('\n✅ CIERRE DEL PASO 2 (stubs borrados, G15, cuarentena vacía, rutas de sw.js) OK');
