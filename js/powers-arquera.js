// ============================================================
// PODERES de la ARQUERA (Francotiradora · Montaraz · Tiradora) — STUB del Paso 2c.0
// ============================================================
// Dueño: el trabajador de la clase en el Paso 2c.1 (docs/paso2-diseno.md §9.1.6).
// Solo se tocan ESTE archivo, js/talents-arquera.js y tests/test-powers-arquera.mjs.
// js/powers.js ya importa y registra al cargar los cuatro mapas que devuelven las
// funciones de abajo; no hay que tocar ningún archivo compartido.
// Son FUNCIONES (no constantes) a propósito: powers.js ↔ powers-arquera.js forman un
// ciclo de módulos y una función declarada se puede llamar aunque este módulo aún
// no se haya evaluado (p. ej. si un test lo importa el primero). Todo lo que use
// el mapa (constantes, helpers) va DENTRO de la función o de los ganchos.
//
//  arqueraPowers()          { id: PowerDef }  → definePower (claves de POWER_KEYS en powers.js:
//                        stats modifyResolve condAdd condCrit onCast afterCast onHit onKill
//                        condDr onDamaged onLethal onTick onGauge · icd priority procs state
//                        name desc tags). `mult` SOLO en los nodos clave ya registrados
//                        (powers-common.js: m_berserk/m_deadeye/m_hunt): un poder nuevo con
//                        mult lo rechaza test67.
//  arqueraSkillBehaviors() { skillId: { cast?(g,p,prof,cast), tick?(g,p,inst,dt), end?(g,p,inst) } }
//                        → defineSkillBehavior: el `behavior` de las activas de talento de
//                        js/talents-arquera.js (formato de MEMORIA.md §7 punto 3).
//  arqueraFields()          { kind: { init, tick, onEnter?, onExit?, onExpire?, render? } } → defineField
//  arqueraGauges()          { id: GaugeDef } → spec-mechanics.defineGauge (solo indicadores NUEVOS;
//                        los 9 de §2 ya existen: potencia los tuyos con gainGauge/spendGauge
//                        y el gancho onGauge(g, p, id, ev, n, e)).
//
// REGLAS: no uses nada importado en el nivel superior del módulo (ciclo powers.js ↔
// powers-<clase>.js: los bindings importados solo se usan DENTRO de los ganchos). Nada de `powers.has(` fuera de js/powers*.js
// (aquí sí se puede: hasPower(p, id)), ni setTimeout (g.timers.schedule), ni
// Math.random en la simulación (g.simRng(stream) / p.combatRng). Daño de un poder:
// dealProcDamage(g, e, n, { source: 'power:<id>' }). Control: e.applyCC(kind, dur, { src: p,
// stagger? }). Curas: p.sustain (golpe/muerte) o g.heal / g.shield (habilidad). Amenaza:
// g.forceTarget(e, p, t) / g.addThreat(e, p, n). Aliados: g.allies(pos, r).
import { dealProcDamage, powerState, hasPower } from './powers.js';
import { gainGauge, spendGauge, gaugeValue, gaugeState } from './spec-mechanics.js';
// (importados como referencia de lo disponible: úsalos solo dentro de los ganchos)

export function arqueraPowers() {
  return {};
}
export function arqueraSkillBehaviors() {
  return {};
}
export function arqueraFields() {
  return {};
}
export function arqueraGauges() {
  return {};
}
