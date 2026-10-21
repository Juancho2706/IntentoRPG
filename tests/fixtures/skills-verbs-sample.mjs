// ============================================================
// Habilidades SINTÉTICAS con cada verbo del Paso 2 (§3.6) para probar el motor
// ============================================================
// Los catálogos reales no traen verbos hasta KA1 (E2): estas definiciones las inyecta el
// arnés (makeHarness({ inject: { skills, forge } })) en una COPIA de la clase, sin tocar
// CLASSES. Todas pasan validateSkillDef (lo comprueba test82). Ids con prefijo `vx_`.
//   import { verbSkills, verbHarness } from './fixtures/skills-verbs-sample.mjs';
//   const h = verbHarness('guerrero', { level: 30 });          // todas inyectadas
//   h.setSlot('rmb', 'vx_martillo'); h.press('rmb'); …
import { makeHarness } from '../helpers/power-harness.mjs';

const base = { icon: '🧪', desc: 'prueba de verbo', req: 1, elem: 'physical' };
const S = (def) => ({ ...base, ...def });

export const VERB_SKILLS = [
  // CARGAR Y SOLTAR: escala lineal del coef, ventana perfecta [0,9, 1,1], +50 % y crítico,
  // te frena al 50 % mientras cargas (el Martillo del Cruzado)
  S({ id: 'vx_martillo', name: 'Martillo Cargado', cat: 'spender', tags: ['spender', 'area', 'melee', 'holy'], elem: 'holy',
    type: 'area', at: 'self', coef: 1, cost: 20, cd: 2, radius: 3,
    charge: { min: 0.2, max: 1.2, perfect: [0.9, 1.1], perfectPct: 50, perfectCrit: true, scale: { coef: [0.5, 2] }, moveMul: 0.5 } }),
  // carga sin suelta automática (se mantiene al máximo hasta soltar)
  S({ id: 'vx_tenso', name: 'Tensar', cat: 'spender', tags: ['spender', 'proj', 'physical'],
    type: 'proj', coef: 1, cost: 0, cd: 0, range: 12, speed: 30,
    charge: { min: 0.1, max: 0.6, perfect: [0.45, 0.6], autoRelease: false } }),
  // RELANZAR: 3 usos en 2 s, «tiempo justo» en los últimos 0,5 s, CD desde el primero
  S({ id: 'vx_andanada', name: 'Andanada', cat: 'spender', tags: ['spender', 'area', 'physical'],
    type: 'area', at: 'self', coef: 0.5, cost: 10, cd: 6, radius: 3,
    recast: { n: 3, win: 2, perfectLast: 0.5, cdFrom: 'first' } }),
  // RELANZAR con condición: solo si golpea; el CD cuenta al cerrar la cadena
  S({ id: 'vx_garra', name: 'Garra', cat: 'spender', tags: ['spender', 'area', 'physical'],
    type: 'area', at: 'self', coef: 0.5, cost: 10, cd: 5, radius: 2,
    recast: { n: 2, win: 1.5, cond: 'hit', cdFrom: 'end' } }),
  // RELANZAR + CARGAR (Tiro Celestial): cada relanzamiento abre su propia carga
  S({ id: 'vx_celeste', name: 'Tiro Celestial', cat: 'spender', tags: ['spender', 'proj', 'holy'], elem: 'holy',
    type: 'proj', coef: 1, cost: 10, cd: 8, range: 14, speed: 40,
    charge: { min: 0.1, max: 0.8, perfect: [0.65, 0.8] }, recast: { n: 2, win: 2, cdFrom: 'first' } }),
  // COMBO DE 3: melee → cono → área con preparación en el 3.º
  S({ id: 'vx_combo', name: 'Danza de Hojas', cat: 'spender', tags: ['spender', 'melee', 'physical'],
    type: 'combo', coef: 1, cost: 0, cd: 0, range: 2.5, radius: 3,
    steps: [{ type: 'melee', coef: 1 }, { type: 'cone', coef: 1.2, angle: 120, radius: 3 }, { type: 'area', at: 'self', coef: 2, radius: 3, windup: 0.3 }] }),
  // SECUENCIA en una principal de proyectil: el 3.º dispara 2 flechas extra
  S({ id: 'vx_tercera', name: 'Tercera Flecha', cat: 'spender', tags: ['spender', 'proj', 'physical'],
    type: 'proj', coef: 1, cost: 0, cd: 0, range: 12, speed: 30, seq: { every: 3, extra: { count: 2, spread: 0.3, coef: 0.6 } } }),
  // CANAL ampliado: corre al 140 %, dispara solo cada 0,4 s y drena 10/s; dura hasta soltar
  S({ id: 'vx_carrera', name: 'Carrera del Viento', cat: 'spender', tags: ['spender', 'channel', 'nature'], elem: 'nature',
    type: 'channel', coef: 0.45, cost: 0, cd: 1, channelT: 1, ticks: 10, range: 10, endless: true,
    moveMul: 1.4, autoShot: { every: 0.4, coef: 0.45, target: 'nearest', range: 10 }, drainPerSec: 10 }),
  // canal enganchable (toggle): la 2.ª pulsación lo suelta
  S({ id: 'vx_rayo', name: 'Rayo Sostenido', cat: 'spender', tags: ['spender', 'channel', 'arcane'], elem: 'arcane',
    type: 'channel', coef: 0.3, cost: 0, cd: 0, channelT: 2, ticks: 8, range: 10, hold: 'toggle' }),
  // POSTURA de 2 modos (alternar sin GCD) y de 1 modo con duración (Rodilla en Tierra)
  S({ id: 'vx_guardia', name: 'Guardia', cat: 'defense', tags: ['defense', 'buff', 'physical'],
    type: 'stance', cd: 0, stance: { modes: [
      { id: 'escudo', name: 'Escudo', stats: { dr: 20 }, moveMul: 0.8 },
      { id: 'espada', name: 'Espada', stats: { dmgPct: 25 } }], swapGcd: 0, swapCd: 1 } }),
  S({ id: 'vx_rodilla', name: 'Rodilla en Tierra', cat: 'utility', tags: ['utility', 'buff', 'physical'],
    type: 'stance', cd: 4, stance: { modes: [{ id: 'rodilla', name: 'Rodilla', stats: { crit: 10 }, moveMul: 0.5, chargeSpeed: 40 }],
      dur: 8, endOnDodge: true, recastEnds: true } }),
  // CARGAS de enfriamiento: 3 parpadeos, 6 s cada uno
  S({ id: 'vx_paso', name: 'Paso Sombrío', cat: 'movement', tags: ['movement', 'physical'],
    type: 'blink', cd: 6, range: 5, charges: 3 }),
  // MARCA que detona la próxima principal (+40 %, 1 uso) y da Debilidad
  S({ id: 'vx_sentencia', name: 'Sentencia', cat: 'utility', tags: ['utility', 'mark', 'holy'], elem: 'holy',
    type: 'mark', cd: 1, range: 12, mark: { id: 'vx_sentencia', dur: 8, uses: 1, weakPct: 10, detonate: { by: '@spender', pct: 40 } } }),
  // TRAMPA ampliada: arma en 0,5 s, 2 armadas como mucho, estallido en área y cebo
  S({ id: 'vx_cepo', name: 'Cepo', cat: 'utility', tags: ['utility', 'trap', 'cc', 'nature'], elem: 'nature',
    type: 'trap', coef: 0.6, cd: 0, range: 12, dur: 20,
    trap: { armT: 0.5, maxArmed: 2, radius: 1.5, root: 2, burst: { radius: 3, coef: 1 }, consume: true, lure: { radius: 6, eliteRadius: 3, boss: false, speedMul: 0.8 } } }),
  // trampa sin estallido ni cebo (detonable)
  S({ id: 'vx_mina', name: 'Mina', cat: 'utility', tags: ['utility', 'trap', 'nature'], elem: 'nature',
    type: 'trap', coef: 0.4, cd: 0, range: 12, dur: 20, trap: { armT: 0.2, radius: 1, maxArmed: 3 } }),
  // DETONAR: flecha que hace estallar tus trampas (2 estallidos por enemigo como mucho)
  S({ id: 'vx_detonante', name: 'Flecha Detonante', cat: 'spender', tags: ['spender', 'proj', 'fire'], elem: 'fire',
    type: 'proj', coef: 0.8, cost: 0, cd: 0, range: 14, speed: 40, pierce: true, detonate: { radius: 3, coef: 1, chain: 0, perTarget: 2 } }),
  // detonación en cadena (chain 6 m)
  S({ id: 'vx_cadena', name: 'Detonación en Cadena', cat: 'spender', tags: ['spender', 'area', 'fire'], elem: 'fire',
    type: 'area', at: 'target', coef: 0.2, cost: 0, cd: 0, range: 14, radius: 1, detonate: { radius: 1.5, coef: 1, chain: 6, perTarget: 3 } }),
  // MURO perpendicular a la mira (bloquea, no a jefes)
  S({ id: 'vx_muro', name: 'Muro de Hielo', cat: 'utility', tags: ['utility', 'wall', 'frost'], elem: 'frost',
    type: 'wall', cd: 0, range: 10, dur: 3, wall: { len: 6, width: 1, blocks: true } }),
  // ZONA que te sigue, como mucho 2 a la vez; encierra (contain) y cura un 2 %/s
  S({ id: 'vx_corona', name: 'Corona', cat: 'spender', tags: ['spender', 'zone', 'holy'], elem: 'holy',
    type: 'zone', at: 'self', coef: 0.5, cost: 0, cd: 0, radius: 3, dur: 5, follow: 'owner', zoneMax: 2, healPct: 2 }),
  S({ id: 'vx_jaula', name: 'Jaula', cat: 'utility', tags: ['utility', 'zone', 'nature'], elem: 'nature',
    type: 'zone', at: 'target', coef: 0, cd: 0, range: 10, radius: 3, dur: 4, contain: true }),
  // ESTELA de un avance (Sendero de Luz) y avance LENTO que arrastra y provoca (Carga de Escudo)
  S({ id: 'vx_sendero', name: 'Sendero de Luz', cat: 'movement', tags: ['movement', 'holy'], elem: 'holy',
    type: 'dash', cd: 1, range: 6, trail: { field: 'zona', dur: 3, width: 1.5, heal: 3 } }),
  S({ id: 'vx_carga', name: 'Carga de Escudo', cat: 'movement', tags: ['movement', 'physical'],
    type: 'dash', coef: 0.3, cd: 1, range: 8, radius: 2, dashT: 1, unstoppable: true, drag: true, taunt: 2, plant: true }),
  // SALTAR A TU CAMPO (a la trampa más cercana a la mira; sin trampa, no se lanza)
  S({ id: 'vx_acecho', name: 'Salto de Acecho', cat: 'movement', tags: ['movement', 'nature'], elem: 'nature',
    type: 'leap', coef: 0.5, cd: 1, range: 15, radius: 2, at: 'ownField', fieldKind: 'trampa', detonate: { radius: 2, coef: 1 } }),
  // PULSOS de un buff (Ciudadela: provoca cada 1 s)
  S({ id: 'vx_ciudadela', name: 'Ciudadela', cat: 'defense', tags: ['defense', 'buff', 'taunt', 'physical'],
    type: 'buff', cd: 10, dur: 4, buff: { dr: 10 }, pulse: { every: 1, radius: 6, taunt: 1 } }),
  // RÉPLICAS (Terremoto): 2 réplicas al 50 % si estás plantado
  S({ id: 'vx_terremoto', name: 'Terremoto', cat: 'spender', tags: ['spender', 'area', 'physical'],
    type: 'area', at: 'self', coef: 1, cost: 0, cd: 0, radius: 3, repeat: { n: 2, every: 0.5, coef: 0.5, needPlanted: true } }),
  // DESPLAZAR: atraer 3 m · empujar 3 m
  S({ id: 'vx_tiron', name: 'Tirón', cat: 'spender', tags: ['spender', 'area', 'physical'],
    type: 'area', at: 'self', coef: 0.1, cost: 0, cd: 0, radius: 6, pull: 3 }),
  S({ id: 'vx_empuje', name: 'Empuje', cat: 'spender', tags: ['spender', 'area', 'physical'],
    type: 'area', at: 'self', coef: 0.1, cost: 0, cd: 0, radius: 6, knock: 3 }),
  // PREPARACIÓN con movimiento al 50 %
  S({ id: 'vx_mandoble', name: 'Golpe Pesado', cat: 'spender', tags: ['spender', 'melee', 'physical'],
    type: 'melee', coef: 2, cost: 0, cd: 0, range: 2.5, windup: 0.4, moveMul: 0.5 }),
  // OTROS: minHpPct + endHealPct (Furia Inmortal), killReset, shieldGain
  S({ id: 'vx_inmortal', name: 'Furia Inmortal', cat: 'defense', tags: ['defense', 'buff', 'physical'],
    type: 'buff', cd: 30, dur: 4, buff: { minHpPct: 20, endHealPct: 10 } }),
  S({ id: 'vx_verdugo', name: 'Verdugo', cat: 'spender', tags: ['spender', 'melee', 'physical'],
    type: 'melee', coef: 1, cost: 0, cd: 8, range: 2.5, killReset: true }),
  S({ id: 'vx_corazon', name: 'Corazón de Hielo', cat: 'spender', tags: ['spender', 'area', 'frost'], elem: 'frost',
    type: 'area', at: 'self', coef: 0.2, cost: 0, cd: 0, radius: 4, shieldGain: [5, 20] }),
  // claves resueltas en docs/paso2-claves-w2.md: chainPct (Rayo en Cadena) e impacts + scatter
  // (Lluvia de Meteoritos)
  S({ id: 'vx_rayo_cadena', name: 'Rayo en Cadena', cat: 'spender', tags: ['spender', 'line', 'arcane'], elem: 'arcane',
    type: 'line', coef: 1, cost: 0, cd: 0, range: 8, width: 1.5, chain: 3, chainPct: 70 }),
  S({ id: 'vx_meteoritos', name: 'Lluvia de Meteoritos', cat: 'spender', tags: ['spender', 'area', 'fire'], elem: 'fire',
    type: 'area', at: 'target', coef: 0.55, cost: 0, cd: 0, range: 12, radius: 1, impacts: 3, scatter: 2.5 }),
];

export const verbSkill = id => VERB_SKILLS.find(s => s.id === id);

// arnés con TODAS las habilidades de verbo inyectadas (y forja opcional)
export function verbHarness(classId = 'guerrero', { level = 30, forge = {}, skills = [], ...opts } = {}) {
  const h = makeHarness({ classId, level, ...opts, inject: { skills: [...VERB_SKILLS, ...skills], forge } });
  h.p.mp = h.p.stats.maxMP;
  return h;
}
