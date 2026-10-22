// Paso 2 (E5, C1) — guardas del cierre: lo que se borró no vuelve
//  1) los stubs @deprecated de D23 ya no se exportan (datos, talentos, catálogos, mixins)
//  2) ningún js/*.js nombra un stub borrado ni deja un @deprecated «se borra en E5» (grep vacío)
//  3) G15: ningún texto de js/ dice «Gastadora» (el término actual es «Principal»)
//  4) D21: la cuarentena (tests/pending-2g.json) está vacía
//  5) cada ruta de ASSETS y UI_ASSETS de sw.js existe en disco (cache.addAll falla entera con un 404)
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
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
allDead.push('respecSkills', 'chooseSkillMod');
console.log(`D23: ${allDead.length} exports y métodos retirados ya no existen ✓`);

// ------------------------------------------------ 2) grep vacío en js/
const jsDir = join(ROOT, 'js');
const sources = readdirSync(jsDir).filter(f => f.endsWith('.js')).map(f => [f, readFileSync(join(jsDir, f), 'utf8')]);
assert.ok(sources.length > 60, 'se leen los js/*.js');
const deadRe = new RegExp(`\\b(${allDead.join('|')})\\b`);
const found = [];
for (const [f, src] of sources) src.split(/\r?\n/).forEach((l, i) => { if (deadRe.test(l)) found.push(`js/${f}:${i + 1}: ${l.trim().slice(0, 90)}`); });
assert.deepEqual(found, [], 'nombres borrados que aún aparecen en js/:\n' + found.join('\n'));
const pending = [];
for (const [f, src] of sources) src.split(/\r?\n/).forEach((l, i) => { if (/@deprecated/.test(l) && /\bE5\b|\bC1\b/.test(l)) pending.push(`js/${f}:${i + 1}: ${l.trim().slice(0, 90)}`); });
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
for (const name of ['ASSETS', 'UI_ASSETS']) {
  const list = listOf(name);
  assert.ok(list.length > 50, `${name}: se leen las rutas`);
  const missing = list.filter(u => u.startsWith('./') && u !== './' && !existsSync(join(ROOT, u.slice(2))));
  assert.deepEqual(missing, [], `sw.js ${name}: rutas que no existen (cache.addAll falla entera con un 404):\n${missing.join('\n')}`);
  assert.equal(new Set(list).size, list.length, `sw.js ${name}: sin rutas repetidas`);
}
console.log('sw.js: todas las rutas de ASSETS y UI_ASSETS existen ✓');

console.log('\n✅ CIERRE DEL PASO 2 (stubs borrados, G15, cuarentena vacía, rutas de sw.js) OK');
