// ============================================================
// Catálogo de habilidades de la MAGA (Maná) — dueño: trabajador de la clase (2b.1)
// ============================================================
// Paso 2b.0: definiciones movidas desde data.js tal cual al formato nuevo
// (cat/slots/tags/coef). Cambios estructurales del núcleo: el Dardo genera +3
// (§2), la definitiva no cuesta recurso (§1.1), el Meteoro impacta a 0,6 s y la
// Supernova lleva windup (§4.4). Se eliminó la pasiva m_p_arcano (§3.2).
// El catálogo completo de §3.2 lo escribe el trabajador de 2b.1 aquí mismo.
import { dmgMods, O_RAD, O_PROJ, V_BURN, V_VULN, V_STUN, V_SLOW, V_PIERCE } from './skill-defs.js';

export const MAGA_SKILLS = [
  // — BÁSICO (genera Maná; "casi no genera") —
  { id: 'm_dardo', name: 'Dardo Arcano', icon: '✨', cat: 'basic', slots: ['lmb'], tags: ['basic', 'proj', 'arcane'], elem: 'arcane',
    type: 'weapon', req: 1, coef: 1.0, gen: 3,
    desc: 'Lanza un dardo a distancia y recupera un poco de Maná.' },
  // — GASTADORAS (con enfriamiento: gestionar enfriamientos es su identidad) —
  { id: 'bola_fuego', name: 'Bola de Fuego', icon: '🔥', cat: 'spender', slots: ['rmb', 'k2'], tags: ['spender', 'proj', 'fire'], elem: 'fire',
    type: 'proj', req: 2, coef: 1.5, cost: 5, cd: 1.5, speed: 13, range: 12, color: 0xff6622,
    desc: 'Lanza una esfera ardiente que explota al impactar.' },
  { id: 'nova_hielo', name: 'Nova de Hielo', icon: '❄️', cat: 'spender', slots: ['rmb', 'k2'], tags: ['spender', 'area', 'cc', 'frost'], elem: 'frost',
    type: 'area', at: 'self', req: 2, coef: 1.0, cost: 11, cd: 6, radius: 3.3, slow: 3, color: 0x66ccff,
    desc: 'Una onda gélida daña y ralentiza a los enemigos cercanos.' },
  { id: 'rayo', name: 'Rayo', icon: '⚡', cat: 'spender', slots: ['rmb', 'k2'], tags: ['spender', 'proj', 'arcane'], elem: 'arcane',
    type: 'proj', req: 5, coef: 1.9, cost: 9, cd: 2.2, speed: 18, range: 13, pierce: true, beam: true, color: 0xffee66,
    desc: 'Un rayo que atraviesa a todos los enemigos en línea.' },
  { id: 'meteoro', name: 'Meteoro', icon: '☄️', cat: 'spender', slots: ['rmb', 'k2'], tags: ['spender', 'area', 'fire'], elem: 'fire',
    type: 'area', at: 'target', req: 9, coef: 2.6, cost: 18, cd: 7, radius: 3, range: 11, impactDelay: 0.6, shake: 0.5, color: 0xff4400,
    desc: 'Invoca un meteoro que arrasa la zona objetivo (impacta al caer).' },
  // — DEFINITIVA (sin coste) —
  { id: 'm_u_supernova', name: 'Supernova', icon: '🌟', cat: 'ultimate', slots: ['k4'], tags: ['ultimate', 'area', 'fire'], elem: 'fire',
    type: 'area', at: 'target', req: 15, coef: 4, cd: 40, radius: 5, range: 10, windup: 0.15, impactDelay: 0.23, shake: 0.5, color: 0xffcc44,
    desc: 'Definitiva: una estrella estalla arrasando la zona.' },
];

export const MAGA_SKILL_MODS = {
  m_dardo:     dmgMods('m_dardo', O_PROJ, V_BURN, V_VULN, V_SLOW),
  bola_fuego:  dmgMods('bola_fuego', O_PROJ, V_BURN, V_VULN, V_STUN),
  nova_hielo:  dmgMods('nova_hielo', O_RAD, V_SLOW, V_VULN, V_STUN),
  rayo:        dmgMods('rayo', O_PROJ, V_PIERCE, V_VULN, V_STUN),
  meteoro:     dmgMods('meteoro', O_RAD, V_BURN, V_VULN, V_STUN),
  m_u_supernova: dmgMods('m_u_supernova', O_RAD, V_BURN, V_VULN, V_STUN),
};

// Comportamientos a medida (solo cuando ningún tipo genérico sirve): la habilidad declara
// `behavior: 'id'` y aquí va { cast(g, p, prof, cast) → CastResult|undefined, tick?, end? }.
// Los registra js/powers.js al cargar (defineSkillBehavior). Usar los métodos de Game
// (g.dealArea, g.dealProcDamage, g.spawnField, g.applyDoT, g.enemiesInCone…) en vez de
// importar módulos del juego: este archivo solo importa js/skill-defs.js (evita ciclos).
export const MAGA_SKILL_BEHAVIORS = {};
