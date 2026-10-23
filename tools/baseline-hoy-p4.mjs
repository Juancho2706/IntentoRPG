// ============================================================
// LÍNEA BASE «HOY» DEL PASO 4 (E0.6, ancla de la regla IT0)
// ============================================================
// Mide con el código actual, SIN tocar el banco, lo que IT0 compara después con la v4 de ítems:
// TTK (común, élite y jefe), TTD, DPS y Aguante del típico y del óptimo, por especialización y
// por clase (la de SPEC_PICK), en los Nv50, 58, 70 y 100.
// El bucle imita runBench (tests/balance-bench.mjs) con T = 0: héroe nuevo para cada simulación
// (24 comunes, 6 élites y 2 jefes) y la variante defensiva para el TTD. Aguante: vida máxima,
// mitigación esperada (CM.expectedMitigation: fracción del golpe que entra) y EHP = vida / mitigación.
// Con --seeds N cada número es la mediana de N semillas (1…N).
// Uso (pesado, por turno): node tools/turno.mjs node tools/baseline-hoy-p4.mjs --seeds N
//      · --levels 50,70 (otros niveles) · --out <ruta> (otra salida)
// Salida: tests/fixtures/baseline-hoy-p4.json
// ============================================================
import { writeFileSync } from 'fs';
import { execSync } from 'child_process';
import * as CM from '../js/combat-math.js';
import { buildHero, refEnemies, simulate, ttdPack, ttdPlus, SPECS, SPEC_CLASS, ALL_SPECS, SPEC_PICK, med } from '../tests/helpers/bench-core.mjs';

const ARGV = process.argv.slice(2);
const argOf = k => { const i = ARGV.indexOf(k); return i >= 0 ? ARGV[i + 1] : null; };
const N = Math.min(30, Math.max(1, parseInt(argOf('--seeds'), 10) || 1));
const LEVELS = (argOf('--levels') || '50,58,70,100').split(',').map(Number);
const OUT = argOf('--out') || 'tests/fixtures/baseline-hoy-p4.json';
const GEARS = ['tipico', 'optimo'];
const KEYS = ['ttkN', 'ttkE', 'ttkB', 'dps', 'ttd', 'ttdPlus', 'maxHP', 'mit', 'ehp', 'wd'];
// 5 cifras significativas; el infinito (la regeneración gana al daño) queda en null
const r5 = v => (v == null || !Number.isFinite(v) ? null : +v.toPrecision(5));

// una medición: especialización × nivel × equipo × semilla (una fila de runBench)
function measure(spec, L, gear, seed) {
  const c = SPEC_CLASS[spec], al = CM.areaLevelForHero(L), ref = refEnemies(al, 0);
  const mk = (variant = 'ofensiva') => buildHero(c, L, gear, { al, spec, seed, variant, move: true });
  const n = simulate(mk(), ref.common, 24, { kind: 'common', ref });
  const e = simulate(mk(), ref.elite, 6, { kind: 'elite', ref });
  const bo = simulate(mk(), ref.boss, 2, { kind: 'boss', ref });
  const def = mk('defensiva');
  // héroe sin estrenar para el Aguante y el golpe de arma
  const p = mk();
  const mit = CM.expectedMitigation(p.stats, al);
  return { ttkN: n.ttk, ttkE: e.ttk, ttkB: bo.ttk, dps: bo.dps, ttd: ttdPack(def, ref, al), ttdPlus: ttdPlus(def, ref, al),
    maxHP: p.stats.maxHP, mit, ehp: p.stats.maxHP / mit, wd: p.avgHit(1, 0) };
}

const t0 = Date.now();
const runs = {};
for (let seed = 1; seed <= N; seed++) {
  const ts = Date.now();
  for (const spec of ALL_SPECS) for (const L of LEVELS) for (const gear of GEARS) {
    ((runs[spec] ??= {})[L] ??= {})[gear] ??= [];
    runs[spec][L][gear].push(measure(spec, L, gear, seed));
  }
  console.log(`semilla ${seed}/${N}: ${((Date.now() - ts) / 1000).toFixed(0)} s`);
}

// medianas por especialización; la clase toma la de SPEC_PICK
const medOf = list => Object.fromEntries(KEYS.map(k => [k, r5(med(list.map(m => m[k])))]));
const specs = {};
for (const spec of ALL_SPECS) {
  specs[spec] = { clase: SPEC_CLASS[spec] };
  for (const L of LEVELS) specs[spec][L] = Object.fromEntries(GEARS.map(g => [g, medOf(runs[spec][L][g])]));
}
const clases = {};
for (const c of Object.keys(SPECS)) {
  const { clase, ...niveles } = specs[SPEC_PICK[c]];
  clases[c] = { spec: SPEC_PICK[c], ...niveles };
}
// los enemigos de referencia de cada nivel (vida y daño por segundo), para la tabla ENEMY_P4
const enemigos = {};
for (const L of LEVELS) {
  const al = CM.areaLevelForHero(L), ref = refEnemies(al, 0);
  enemigos[L] = { al, ...Object.fromEntries(Object.entries(ref).filter(([, v]) => typeof v === 'number').map(([k, v]) => [k, r5(v)])) };
}

let commit = '?';
try { commit = execSync('git rev-parse --short HEAD').toString().trim(); } catch {}
const duracionS = Math.round((Date.now() - t0) / 1000);
writeFileSync(OUT, JSON.stringify({
  fecha: new Date().toISOString().slice(0, 10), commit, semillas: N, niveles: LEVELS, duracionS,
  nota: 'Mediana de N semillas (1…N) con el banco de hoy (bench-core, move: true, T = 0); null = infinito',
  claves: { ttkN: 's por común (24)', ttkE: 's por élite (6)', ttkB: 's por jefe (2)', dps: 'DPS contra el jefe',
    ttd: 's contra manada sin defensa activa (ttdPack, variante defensiva)', ttdPlus: 's con la defensa de la 2 (ttdPlus)',
    maxHP: 'vida máxima', mit: 'fracción del golpe físico que entra (expectedMitigation)', ehp: 'maxHP / mit', wd: 'golpe medio de arma, avgHit(1, 0)' },
  enemigos, clases, specs,
}, null, 1) + '\n');

// resumen en consola: la clase (SPEC_PICK), típico | óptimo
console.log(`\nlínea base «hoy» · ${N} semilla(s) · ${duracionS} s · ${commit} → ${OUT}`);
console.log('clase       Nv   DPS típ/ópt        TTK jefe típ/ópt   TTD típ/ópt     EHP típ/ópt');
const f = v => (v == null ? '∞' : v >= 100 ? v.toFixed(0) : v.toFixed(1));
for (const [c, r] of Object.entries(clases)) for (const L of LEVELS) {
  const t = r[L].tipico, o = r[L].optimo;
  console.log(`${c.padEnd(10)} ${String(L).padStart(3)}  ${`${f(t.dps)}/${f(o.dps)}`.padEnd(18)} ${`${f(t.ttkB)}/${f(o.ttkB)}`.padEnd(18)} ${`${f(t.ttd)}/${f(o.ttd)}`.padEnd(15)} ${f(t.ehp)}/${f(o.ehp)}`);
}
