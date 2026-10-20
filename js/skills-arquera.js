// ============================================================
// Catálogo de habilidades de la ARQUERA (Energía) — dueño: trabajador de la clase (2b.1)
// ============================================================
// Paso 2b.0: definiciones movidas desde data.js tal cual al formato nuevo
// (cat/slots/tags/coef). Cambios estructurales del núcleo: el Disparo genera +5
// (§2), la definitiva no cuesta recurso (§1.1), la Lluvia telegrafía 0,3 s y el
// Diluvio lleva windup (§4.4). Se eliminó la pasiva a_p_punteria (§3.3).
// El catálogo completo de §3.3 lo escribe el trabajador de 2b.1 aquí mismo.
import { dmgMods, buffMods, O_RAD, O_PROJ, O_PROJ2, V_POISON, V_VULN, V_STUN, V_PIERCE } from './skill-defs.js';

export const ARQUERA_SKILLS = [
  // — BÁSICO (genera Energía al acertar) —
  { id: 'a_disparo', name: 'Disparo Rápido', icon: '🏹', cat: 'basic', slots: ['lmb'], tags: ['basic', 'proj', 'physical'], elem: 'physical',
    type: 'weapon', req: 1, coef: 1.0, gen: 5,
    desc: 'Dispara una flecha veloz y recupera Energía.' },
  // — GASTADORAS —
  { id: 'flecha_multiple', name: 'Flecha Múltiple', icon: '🔱', cat: 'spender', slots: ['rmb', 'k2'], tags: ['spender', 'proj', 'area', 'physical'], elem: 'physical',
    type: 'proj', req: 2, coef: 0.9, cost: 7, cd: 2.5, speed: 15, range: 10, count: 3, spread: 0.5, color: 0xccddaa,
    desc: 'Disparas un abanico de flechas a la vez.' },
  { id: 'flecha_perforante', name: 'Flecha Perforante', icon: '➶', cat: 'spender', slots: ['rmb', 'k2'], tags: ['spender', 'proj', 'physical'], elem: 'physical',
    type: 'proj', req: 2, coef: 1.6, cost: 8, cd: 3, speed: 17, range: 13, pierce: true, color: 0xffffcc,
    desc: 'Una flecha que atraviesa a todos los enemigos en su camino.' },
  { id: 'lluvia_flechas', name: 'Lluvia de Flechas', icon: '🌧️', cat: 'spender', slots: ['rmb', 'k2'], tags: ['spender', 'area', 'physical'], elem: 'physical',
    type: 'area', at: 'target', req: 9, coef: 2.2, cost: 15, cd: 7, radius: 3, range: 11, impactDelay: 0.3, color: 0xaaffaa,
    desc: 'Una lluvia mortal de flechas cae sobre la zona objetivo.' },
  // — MOVILIDAD (k1) —
  { id: 'agilidad', name: 'Agilidad', icon: '🌪️', cat: 'movement', slots: ['k1'], tags: ['movement', 'buff', 'nature'], elem: 'nature',
    type: 'buff', req: 5, cost: 10, cd: 18, dur: 10, buff: { spdPct: 15, aspdPct: 15 },
    desc: 'Aumenta tu velocidad de movimiento y de ataque.' },
  // — DEFINITIVA (sin coste) —
  { id: 'a_u_diluvio', name: 'Diluvio de Saetas', icon: '🌠', cat: 'ultimate', slots: ['k4'], tags: ['ultimate', 'area', 'nature'], elem: 'nature',
    type: 'area', at: 'target', req: 15, coef: 3.6, cd: 40, radius: 4.5, range: 12, windup: 0.15, impactDelay: 0.23, color: 0xbfffbf,
    desc: 'Definitiva: un diluvio de saetas asola una gran zona.' },
];

export const ARQUERA_SKILL_MODS = {
  a_disparo:         dmgMods('a_disparo', O_PROJ, V_POISON, V_VULN, V_PIERCE),
  flecha_multiple:   dmgMods('flecha_multiple', O_PROJ2, V_POISON, V_VULN, V_STUN),
  flecha_perforante: dmgMods('flecha_perforante', O_PROJ, V_PIERCE, V_POISON, V_VULN),
  agilidad:          buffMods('agilidad'),
  lluvia_flechas:    dmgMods('lluvia_flechas', O_RAD, V_POISON, V_VULN, V_STUN),
  a_u_diluvio:       dmgMods('a_u_diluvio', O_RAD, V_POISON, V_VULN, V_STUN),
};

// Comportamientos a medida (solo cuando ningún tipo genérico sirve): la habilidad declara
// `behavior: 'id'` y aquí va { cast(g, p, prof, cast) → CastResult|undefined, tick?, end? }.
// Los registra js/powers.js al cargar (defineSkillBehavior). Usar los métodos de Game
// (g.dealArea, g.dealProcDamage, g.spawnField, g.applyDoT, g.enemiesInCone…) en vez de
// importar módulos del juego: este archivo solo importa js/skill-defs.js (evita ciclos).
export const ARQUERA_SKILL_BEHAVIORS = {};
