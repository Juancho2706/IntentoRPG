// ============================================================
// Catálogo de habilidades del GUERRERO (Furia) — dueño: trabajador de la clase (2b.1)
// ============================================================
// Paso 2b.0: las definiciones de data.js se MOVIERON aquí tal cual (mismos ids,
// coeficientes, costes y enfriamientos) al formato nuevo (cat/slots/tags/coef).
// Excepciones estructurales del núcleo: la generación de los básicos sigue §2
// (Tajo +10 / Mandoble +14 / Embate +7), las definitivas no cuestan recurso
// (§1.1) y los golpes pesados llevan windup/impactDelay (§4.4). Las pasivas
// compradas (g_p_*) se eliminaron (§3.1). El catálogo completo de §3.1 lo escribe
// el trabajador de 2b.1 aquí mismo; el formato está en docs/paso2-diseno.md §9.4.
// Este archivo NO importa nada del juego salvo los constructores de ramas.
import { dmgMods, buffMods, O_RAD, O_PROJ, O_BIG, V_BLEED, V_VULN, V_CHAIN, V_EXEC, V_STUN, V_SLOW, V_PIERCE,
  T_ZONE, T_CDHIT, T_ECHO, T_GIANT, T_NOVA } from './skill-defs.js';

export const GUERRERO_SKILLS = [
  // — BÁSICOS (generan Furia; cadencia de ataque, sin GCD) —
  { id: 'g_tajo', name: 'Tajo', icon: '⚔️', cat: 'basic', slots: ['lmb'], tags: ['basic', 'melee', 'area', 'physical'], elem: 'physical',
    type: 'weapon', req: 1, coef: 1.0, gen: 10, genPerExtra: 2, genMax: 16, cleave: 0.5, cleaveR: 2.0,
    desc: 'Corta al objetivo y a los enemigos pegados (50 %). Genera Furia.' },
  { id: 'g_mandoble', name: 'Mandoble', icon: '🗡️', cat: 'basic', slots: ['lmb'], tags: ['basic', 'melee', 'physical'], elem: 'physical',
    type: 'melee', req: 1, coef: 1.4, gen: 14, range: 2.4, windup: 0.12,
    desc: 'Un golpe único contundente. Genera mucha Furia.' },
  { id: 'g_embate', name: 'Embate', icon: '🌀', cat: 'basic', slots: ['lmb'], tags: ['basic', 'melee', 'area', 'physical'], elem: 'physical',
    type: 'area', at: 'self', req: 1, coef: 0.8, gen: 7, genPerExtra: 2, genMax: 15, radius: 2.5,
    desc: 'Un barrido corto alrededor. Genera Furia por cada enemigo golpeado.' },
  // — GASTADORAS (rmb o k2) —
  { id: 'torbellino', name: 'Torbellino', icon: '🌪️', cat: 'spender', slots: ['rmb', 'k2'], tags: ['spender', 'melee', 'area', 'physical'], elem: 'physical',
    type: 'area', at: 'self', req: 2, coef: 1.3, cost: 10, cd: 3, radius: 2.9, lockT: 0.3,
    desc: 'Giras con tu arma dañando a todos los enemigos cercanos.' },
  { id: 'g_martillo', name: 'Martillo de Guerra', icon: '🔨', cat: 'spender', slots: ['rmb', 'k2'], tags: ['spender', 'melee', 'area', 'physical'], elem: 'physical',
    type: 'area', at: 'target', req: 2, coef: 2.0, cost: 12, cd: 4, radius: 3, range: 7, windup: 0.15, impactDelay: 0.23,
    desc: 'Aplastas el suelo con tu martillo creando una onda.' },
  { id: 'terremoto', name: 'Terremoto', icon: '💥', cat: 'spender', slots: ['rmb', 'k2'], tags: ['spender', 'area', 'physical'], elem: 'physical',
    type: 'area', at: 'target', req: 5, coef: 2.0, cost: 16, cd: 8, radius: 3.5, range: 8, windup: 0.15, impactDelay: 0.23, shake: 0.5,
    desc: 'Golpeas el suelo creando una onda destructiva en la zona.' },
  { id: 'g_lanza', name: 'Lanza Arrojadiza', icon: '🎯', cat: 'spender', slots: ['rmb', 'k2'], tags: ['spender', 'proj', 'physical'], elem: 'physical',
    type: 'proj', req: 5, coef: 1.6, cost: 8, cd: 2.5, speed: 16, range: 11, pierce: true,
    desc: 'Arrojas una lanza que atraviesa a los enemigos en línea.' },
  { id: 'g_hendidura', name: 'Hendidura', icon: '🪓', cat: 'spender', slots: ['rmb', 'k2'], tags: ['spender', 'melee', 'cone', 'physical'], elem: 'physical',
    type: 'cone', req: 9, coef: 1.4, cost: 11, cd: 5, radius: 3.2, angle: 120, windup: 0.12,
    desc: 'Un golpe frontal pesado que desgarra a todo lo que tienes delante.' },
  // — MOVILIDAD (k1, fuera del GCD) —
  { id: 'embestida', name: 'Embestida', icon: '💨', cat: 'movement', slots: ['k1'], tags: ['movement', 'melee', 'area', 'physical'], elem: 'physical',
    type: 'dash', req: 2, coef: 1.3, cost: 9, cd: 6, range: 7, radius: 1.9, lockT: 0.25,
    desc: 'Cargas hacia el objetivo dañando lo que encuentres al llegar.' },
  { id: 'g_salto', name: 'Salto Devastador', icon: '🦶', cat: 'movement', slots: ['k1'], tags: ['movement', 'area', 'physical'], elem: 'physical',
    type: 'leap', req: 9, coef: 2.0, cost: 16, cd: 8, radius: 3.2, range: 8, airT: 0.45, shake: 0.4,
    desc: 'Saltas al punto elegido (intocable en el aire) y caes con fuerza demoledora.' },
  // — UTILIDAD / DEFENSA (k2) —
  { id: 'grito_guerra', name: 'Grito de Guerra', icon: '📢', cat: 'utility', slots: ['k2'], tags: ['utility', 'shout', 'buff', 'ally', 'physical'], elem: 'physical',
    type: 'buff', req: 5, cost: 8, cd: 15, dur: 12, buff: { dmgPct: 15 },
    desc: 'Aumenta tu daño durante unos segundos.' },
  { id: 'g_provocacion', name: 'Provocación', icon: '🛡️', cat: 'utility', slots: ['k2'], tags: ['utility', 'buff', 'physical'], elem: 'physical',
    type: 'buff', req: 9, cost: 10, cd: 16, dur: 10, buff: { arm: 20, dmgPct: 10 },
    desc: 'Aumentas tu armadura y tu daño un tiempo.' },
  // — DEFINITIVAS (k4, sin coste) —
  { id: 'g_u_furia', name: 'Furia Inmortal', icon: '😤', cat: 'ultimate', slots: ['k4'], tags: ['ultimate', 'buff', 'physical'], elem: 'physical',
    type: 'buff', req: 15, cd: 45, dur: 8, buff: { dmgPct: 40, arm: 40, lph: 6 },
    desc: 'Definitiva: te vuelves una bestia imparable unos segundos.' },
  { id: 'g_u_cataclismo', name: 'Cataclismo', icon: '☄️', cat: 'ultimate', slots: ['k4'], tags: ['ultimate', 'area', 'holy'], elem: 'holy',
    type: 'area', at: 'target', req: 15, coef: 4, cd: 40, radius: 5, range: 9, windup: 0.15, impactDelay: 0.23, shake: 0.5,
    desc: 'Definitiva: una devastación se desploma sobre la zona.' },
  { id: 'g_u_estandarte', name: 'Estandarte de Guerra', icon: '🚩', cat: 'ultimate', slots: ['k4'], tags: ['ultimate', 'buff', 'aura', 'holy'], elem: 'holy',
    type: 'buff', req: 15, cd: 50, dur: 12, buff: { dmgPct: 20, aspdPct: 20 },
    desc: 'Definitiva: clavas tu estandarte y combates con furia renovada.' },
];

// Ramas (3 × 3) de cada habilidad. Mismos ids que antes (la migración v3 los conserva).
export const GUERRERO_SKILL_MODS = {
  // básicos (Transformación más ligera)
  g_tajo:      dmgMods('g_tajo', O_RAD, V_BLEED, V_VULN, V_CHAIN),
  g_mandoble:  dmgMods('g_mandoble', O_BIG, V_EXEC, V_STUN, T_ECHO),
  g_embate:    dmgMods('g_embate', O_RAD, V_BLEED, V_SLOW, T_ZONE),
  // gastadoras y movilidad (Transformación = cambia EN GRANDE cómo funciona)
  torbellino:  dmgMods('torbellino', O_RAD, T_ZONE, T_CDHIT, T_GIANT),
  embestida:   dmgMods('embestida', O_RAD, V_CHAIN, T_NOVA, T_ZONE),
  g_martillo:  dmgMods('g_martillo', O_RAD, T_NOVA, T_CDHIT, T_ZONE),
  terremoto:   dmgMods('terremoto', O_RAD, T_ZONE, T_GIANT, V_EXEC),
  g_lanza:     dmgMods('g_lanza', O_PROJ, V_PIERCE, V_CHAIN, T_ECHO),
  g_salto:     dmgMods('g_salto', O_RAD, T_NOVA, T_CDHIT, T_ZONE),
  g_hendidura: dmgMods('g_hendidura', O_RAD, T_ZONE, T_CDHIT, V_BLEED),
  grito_guerra: buffMods('grito_guerra'),
  g_provocacion: buffMods('g_provocacion'),
  // definitivas
  g_u_cataclismo: dmgMods('g_u_cataclismo', O_RAD, T_ZONE, T_GIANT, V_EXEC),
  g_u_furia:      buffMods('g_u_furia'),
  g_u_estandarte: buffMods('g_u_estandarte'),
};

// Comportamientos a medida (solo cuando ningún tipo genérico sirve): la habilidad declara
// `behavior: 'id'` y aquí va { cast(g, p, prof, cast) → CastResult|undefined, tick?, end? }.
// Los registra js/powers.js al cargar (defineSkillBehavior). Usar los métodos de Game
// (g.dealArea, g.dealProcDamage, g.spawnField, g.applyDoT, g.enemiesInCone…) en vez de
// importar módulos del juego: este archivo solo importa js/skill-defs.js (evita ciclos).
export const GUERRERO_SKILL_BEHAVIORS = {};
