// Eras (temporadas locales): mutador determinista por semana, objetivos por
// delta de records, reclamo de recompensa y reinicio al cambiar de semana.
import { Player } from '../js/entities.js';
import { eraMethods } from '../js/game-eras.js';
import { ERA_MUTATORS, ERA_OBJECTIVES, eraIdForTime } from '../js/data.js';
import { buildDungeon } from '../js/world.js';

globalThis.performance = globalThis.performance || { now: () => Date.now() };

const world = buildDungeon(1);
const g = {
  ui: { message() {}, spawnText() {}, renderPanel() {}, updateHUD() {} },
  sfx() {}, vibrate() {}, spawnBurst() {}, world, enemies: [], save() {},
};
Object.assign(g, eraMethods);
const p = new Player(g, 'guerrero'); g.player = p;

// --- determinismo: misma era → mismo mutador y objetivos ---
const a = g.eraDef(1000), b = g.eraDef(1000);
if (a.mutator.id !== b.mutator.id) throw new Error('mutador no determinista');
if (a.objectives.map(o => o.id).join() !== b.objectives.map(o => o.id).join()) throw new Error('objetivos no deterministas');
if (a.objectives.length !== 3) throw new Error('una era debe tener 3 objetivos');
// objetivos distintos entre sí
if (new Set(a.objectives.map(o => o.id)).size !== 3) throw new Error('objetivos repetidos en una era');
// semanas distintas pueden variar el mutador (al menos en el catálogo hay >1)
if (ERA_MUTATORS.length < 3 || ERA_OBJECTIVES.length < 4) throw new Error('catálogos demasiado pequeños');
console.log('Determinismo: mutador + 3 objetivos distintos estables por id de era ✓');

// --- bonus del mutador es coherente con su definición ---
for (let id = 0; id < 14; id++) {
  const def = g.eraDef(id);
  const bonus = ERA_MUTATORS[((id % ERA_MUTATORS.length) + ERA_MUTATORS.length) % ERA_MUTATORS.length];
  if (def.mutator.id !== bonus.id) throw new Error('mutador no cicla por id');
}
console.log('Mutador cicla de forma estable por semana ✓');

// --- ensureEra toma instantánea de records; el progreso es el delta ---
p.records.kills = 100;
g.ensureEra();
const era = p.era;
if (!era || era.id !== eraIdForTime()) throw new Error('ensureEra no fijó la era actual');
// fuerza un objetivo de kills para probar el delta
const obj = { id: 'o_kill', metric: 'kills', goal: 50 };
era.base.kills = 100; // instantánea
p.records.kills = 130; // +30 desde la instantánea
if (g.eraObjProgress(obj) !== 30) throw new Error('progreso (delta) incorrecto: ' + g.eraObjProgress(obj));
p.records.kills = 1000; // muy por encima → clamp al goal
if (g.eraObjProgress(obj) !== 50) throw new Error('el progreso no se limita al goal');
console.log('Progreso por delta de records con clamp al objetivo ✓');

// --- reclamo de recompensa: paga oro una vez ---
const real = g.eraDef().objectives[0];           // un objetivo real de la era actual
p.era.base[real.metric] = 0;
p.records[real.metric] = real.goal + 5;          // completado
p.gold = 0;
g.claimEraReward(real.id);
if (!p.era.claimed[real.id]) throw new Error('no marcó el objetivo como reclamado');
if (p.gold !== (real.reward.gold || 0)) throw new Error('no pagó la recompensa de oro');
const goldAfter = p.gold;
g.claimEraReward(real.id);                        // segundo intento: nada
if (p.gold !== goldAfter) throw new Error('no debe poder reclamarse dos veces');
console.log('Reclamo de recompensa: paga una sola vez ✓');

// --- cambio de semana: ensureEra reinicia el estado ---
p.era.id = eraIdForTime() - 1;                    // simula era vieja
g.ensureEra();
if (p.era.id !== eraIdForTime()) throw new Error('no reinició al cambiar de semana');
if (Object.keys(p.era.claimed).length) throw new Error('no limpió las recompensas reclamadas');
console.log('Cambio de semana: nueva instantánea y recompensas reiniciadas ✓');

console.log('\n✅ ERAS (TEMPORADAS LOCALES) OK');
