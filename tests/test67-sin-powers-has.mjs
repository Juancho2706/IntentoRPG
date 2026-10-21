// Paso 2b.0 — arquitectura de poderes data-driven (§9.1)
//  1) PROHIBIDO `powers.has(` fuera de js/powers*.js (como test59 vigila setTimeout)
//  2) todo poder referenciado por el contenido (legendarios, reliquias, Paragon,
//     eras) existe en el registro POWER_HOOKS, también los migrados de las maestrías
//     (que esos poderes clave sigan en un nodo de talento lo comprueba test67b, de KT:
//     partido de aquí en el Paso 2, E1.5, para no apagar esta guarda en la cuarentena)
//  3) definePower rechaza claves desconocidas, ids repetidos y mult fuera de rango
//  4) solo los multiplicadores [×] autorizados declaran `mult` (Paso 1A: ≤ ×1,3)
//  5) firePower aísla los errores (un poder roto no tumba el juego) y respeta icd/procs
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { POWER_HOOKS, POWER_KEYS, definePower, buildHookIndex, firePower, powerState } from '../js/powers.js';
import { LEGENDARY_POWERS } from '../js/items.js'; // (las reliquias reutilizan estos ids)
import { PARAGON_BOARDS, ERA_MUTATORS } from '../js/data.js';
import { TALENT_TREES } from '../js/talents.js';
import { MULT_POWERS } from '../js/combat-math.js';

// ------------------------------------------------ 1) sin powers.has( fuera del registro
const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'js');
const bad = [];
for (const f of readdirSync(dir).filter(f => f.endsWith('.js') && !/^powers.*\.js$/.test(f))) {
  readFileSync(join(dir, f), 'utf8').split('\n').forEach((l, i) => {
    if (/powers\s*\??\.\s*has\s*\(/.test(l)) bad.push(`${f}:${i + 1}: ${l.trim()}`);
  });
}
assert.deepEqual(bad, [], 'powers.has( fuera de js/powers*.js:\n' + bad.join('\n'));
console.log('Ningún `powers.has(` fuera de js/powers*.js ✓');

// ------------------------------------------------ 2) cobertura del contenido actual
const referenced = new Set();
for (const p of LEGENDARY_POWERS) referenced.add(p.id);
// los poderes de los nodos de talento: todos registrados (la lista de los poderes clave que deben seguir en
// un nodo vive en test67b; la cobertura completa, en tests/test-powers-<clase>.mjs)
for (const t of Object.values(TALENT_TREES)) for (const tree of [t.cls, ...t.specs, ...(t.hero || [])]) for (const n of tree.nodes)
  for (const fx of n.t === 'c' ? n.opts.map(o => o.fx || {}) : [n.fx || {}]) if (fx.power) referenced.add(fx.power);
for (const board of Object.values(PARAGON_BOARDS)) for (const n of board) if (n.power) referenced.add(n.power);
for (const e of ERA_MUTATORS) if (e.power) referenced.add(e.power);
const missing = [...referenced].filter(id => !POWER_HOOKS[id]);
assert.deepEqual(missing, [], 'poderes sin entrada en el registro: ' + missing.join(', '));
for (const id of ['festin', 'volatil', 'furia', 'agil', 'multidisparo', 'avaricia', 'm_berserk', 'm_aegis', 'm_judgment', 'm_conflag', 'm_overload', 'm_deadeye', 'm_shatter', 'm_hunt'])
  assert.ok(POWER_HOOKS[id], 'falta el poder migrado ' + id);
console.log(`Registro: los ${referenced.size} poderes referenciados por el contenido existen ✓`);

// ------------------------------------------------ 3) definePower valida
assert.throws(() => definePower('t_mala', { onHit() {}, onHitt() {} }), /clave desconocida/);
assert.throws(() => definePower('festin', { onKill() {} }), /repetido/);
assert.throws(() => definePower('t_mult_alto', { mult: { mult: 1.6 } }), /mult/);
assert.throws(() => definePower('t_no_fn', { onHit: 3 }), /función/);
assert.ok(POWER_KEYS.has('onLethal') && POWER_KEYS.has('icd') && !POWER_KEYS.has('onHitt'));
console.log('definePower rechaza claves desconocidas, ids repetidos y mult > ×1,3 ✓');

// ------------------------------------------------ 4) multiplicadores autorizados
const ALLOWED_MULT = new Set(['furia', 'm_berserk', 'm_deadeye', 'm_hunt']);
const withMult = Object.values(POWER_HOOKS).filter(d => d.mult).map(d => d.id);
assert.deepEqual(withMult.filter(id => !ALLOWED_MULT.has(id)), [], 'poderes con mult no autorizado: ' + withMult);
for (const id of ALLOWED_MULT) assert.ok(MULT_POWERS[id] && MULT_POWERS[id].mult <= 1.3, `${id} registrado en combat-math (≤ ×1,3)`);
console.log('Solo los multiplicadores [×] autorizados declaran mult (registrados en combat-math) ✓');

// ------------------------------------------------ 5) despachador
let calls = 0;
definePower('t_roto', { name: 'prueba', onHit() { throw new Error('roto a propósito'); } });
definePower('t_cuenta', { name: 'prueba', icd: 1, onHit() { calls++; } });
definePower('t_procs', { name: 'prueba', procs: true, onHit() { calls += 100; } });
definePower('t_suma', { name: 'prueba', condAdd: () => 7 });
definePower('t_suma2', { name: 'prueba', condAdd: () => 5, stats: () => ({ crit: 3 }) });
const p = { powers: new Set(['t_roto', 't_cuenta', 't_procs', 't_suma', 't_suma2']), simT: 0 };
buildHookIndex(p);
const warn = console.warn; console.warn = () => {};
try {
  firePower('onHit', p, {}, p, {}, { proc: false });
  assert.equal(calls, 101, 'un poder roto no impide a los demás');
  firePower('onHit', p, {}, p, {}, { proc: false });
  assert.equal(calls, 201, 'icd: t_cuenta no repite antes de 1 s');
  p.simT = 1.01;
  firePower('onHit', p, {}, p, {}, { proc: true });
  assert.equal(calls, 301, 'un proc solo llega a los poderes con procs:true');
  firePower('onHit', p, {}, p, {}, { proc: false, dot: true });
  assert.equal(calls, 401, 'los tics de DoT/campo se tratan como procs');
} finally { console.warn = warn; }
assert.equal(firePower('condAdd', p, p, null, {}), 12, 'condAdd suma');
assert.deepEqual(firePower('stats', p, p), { crit: 3 }, 'stats agrega');
assert.equal(firePower('onCast', { powers: new Set() }, {}), true, 'sin poderes, onCast no cancela');
assert.ok(typeof powerState(p, 'm_aegis') === 'object');
console.log('firePower: aísla errores, respeta icd/procs y agrega resultados ✓');
console.log('\n✅ REGISTRO DE PODERES (sin powers.has dispersos) OK');
