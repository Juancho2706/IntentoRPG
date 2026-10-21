// ============================================================
// Test 87 — Nadie escribe p.cds fuera del motor (Paso 2, D2; docs/paso2-implementacion.md §3.7)
// ============================================================
// p.cds[id] sigue siendo un número (lo lee la UI), pero SOLO lo escriben js/game-skills.js
// (poner y restar enfriamientos: g.reduceCooldown, cargas p.skCharges) y js/entities.js (el
// avance por tiempo). Cualquier otro módulo resta enfriamiento con g.reduceCooldown(p, id, s)
// (respeta cargas, cdOnEnd y cdFloor) o reinicia con s = Infinity.
// Entra en CUARENTENA (tests/pending-2g.json) con dueños KA-arquera (skills-arquera.js),
// KT ×3 (powers-<clase>.js) y W1 (economy.js) hasta que migren.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'js');
const ALLOWED = new Set(['game-skills.js', 'entities.js']);
// asignación a p.cds entero, a p.cds[x] / p.cds.x, o con += / -= (no comparaciones)
const WRITE = /\.cds\s*(\[[^\]]+\]|\.[A-Za-z_$][\w$]*)?\s*(?:[-+*/]?=)(?!=)/;
const ASSIGN_OBJ = /Object\.assign\(\s*[\w.]*\.cds\b/;

// el patrón detecta lo que debe y no lo que no
for (const s of ['p.cds[sk.id] = 0', 'p.cds.a_t_cepo = 0', 'p.cds[id] -= 2', 'p.cds = {}', 'this.player.cds[x]=1']) assert.ok(WRITE.test(s), `detecta: ${s}`);
for (const s of ['if (p.cds[id] === 0)', '(p.cds[id] || 0) > 0', 'const t = p.cds[id];', 'p.cds[id] >= 1']) assert.ok(!WRITE.test(s), `no detecta: ${s}`);

const offenders = [];
for (const f of readdirSync(JS).filter(n => n.endsWith('.js') && !ALLOWED.has(n)).sort()) {
  const lines = readFileSync(join(JS, f), 'utf8').split('\n');
  lines.forEach((raw, i) => {
    const code = raw.replace(/\/\/.*$/, '');
    if (WRITE.test(code) || ASSIGN_OBJ.test(code)) offenders.push(`js/${f}:${i + 1}: ${raw.trim().slice(0, 110)}`);
  });
}
assert.deepEqual(offenders, [], `p.cds escrito fuera del motor (usa g.reduceCooldown):\n  ${offenders.join('\n  ')}`);
console.log('\n✅ SIN p.cds FUERA DEL MOTOR (g.reduceCooldown es la única vía) OK');
