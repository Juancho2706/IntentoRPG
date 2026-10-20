// ============================================================
// Catálogo de habilidades del GUERRERO (Furia) — dueño: trabajador de la clase (2b.1)
// ============================================================
// Paso 2b.1: catálogo BASE de docs/paso2-diseno.md §3.1 (estados C/R/N; las de
// talento «T» son del Paso 2c y NO van aquí). Formato: MEMORIA.md §7.
//  · Coef. = WD por objetivo y uso a rango 1 (rango = clamp(1+⌊(Nv−req)/8⌋,1,5),
//    coef ×(1+0,10·(rango−1)); buffs/escudos ×(1+0,06·(rango−1))).
//  · Calendario §1.2: básico A Nv1 · gastadora A Nv2 · básico B Nv3 · movilidad A Nv4 ·
//    defensa A Nv6 · gastadora B y básico C Nv8 · movilidad B y utilidad B Nv12 ·
//    gastadoras C/D Nv14 · definitivas Nv15 · utilidad C Nv16 (Provocación).
//  · Gastadora B (Nv8) = Hendidura Y Martillo: §1.4 pide que Berserker (Hendidura)
//    y Guardián/Cruzado (Martillo) tengan su combinación al elegir especialización
//    en Nv10. Terremoto y Lanza: Nv14.
//  · Paso 2b.2: los fallbacks de 2b.1 pasaron al núcleo (cadencia, inmunidad a
//    ralentizaciones, gen/genOnHit, daño saliente debilitado, coste por buff,
//    campo 'aura'); los números son los de §3.1 recalibrados con el banco.
//  · Los ids y los ids de rama se conservan (migración v3); Piel de Hierro es nueva
//    (utilMods). Las pasivas g_p_* ya se eliminaron en 2b.0.
// Este archivo SOLO importa js/skill-defs.js (evita ciclos con data/powers).
import { dmgMods, buffMods, utilMods, O_RAD, O_PROJ, O_BIG, V_BLEED, V_VULN, V_CHAIN, V_EXEC, V_STUN, V_SLOW, V_PIERCE,
  T_ZONE, T_CDHIT, T_ECHO, T_GIANT, T_NOVA } from './skill-defs.js';

export const GUERRERO_SKILLS = [
  // ———————————————— BÁSICOS (lmb: generan Furia al ACERTAR; sin GCD) ————————————————
  { id: 'g_tajo', name: 'Tajo', icon: '⚔️', cat: 'basic', slots: ['lmb'], tags: ['basic', 'melee', 'area', 'physical'], elem: 'physical',
    type: 'weapon', req: 1, coef: 1.0, gen: 10, genPerExtra: 2, genMax: 16, cleave: 0.5, cleaveR: 2.0,
    desc: 'Corta al objetivo (100 % del arma) y a los enemigos pegados a él, a 2 m o menos (50 %). Genera 10 de Furia, +2 por cada enemigo extra (máx. 16).' },
  { id: 'g_mandoble', name: 'Mandoble', icon: '🗡️', cat: 'basic', slots: ['lmb'], tags: ['basic', 'melee', 'physical'], elem: 'physical',
    type: 'melee', req: 3, coef: 1.5, gen: 14, range: 2.4, windup: 0.12, cadence: 1.5,
    desc: 'Un golpe único y pesado (150 % del arma, preparación de 0,12 s), pero un 50 % más lento que el Tajo. Genera 14 de Furia al acertar.' },
  { id: 'g_embate', name: 'Embate', icon: '🌀', cat: 'basic', slots: ['lmb'], tags: ['basic', 'melee', 'area', 'physical'], elem: 'physical',
    type: 'area', at: 'self', req: 8, coef: 0.6, gen: 7, genPerExtra: 2, genMax: 15, radius: 2.5, cadence: 1.1,
    desc: 'Barrido circular que golpea a todos a 2,5 m (60 % del arma cada uno), un 10 % más lento que el Tajo. Genera 7 de Furia, +2 por cada enemigo extra (máx. 15).' },

  // ———————————————— GASTADORAS (rmb o k2; sin enfriamiento salvo Terremoto) ————————————————
  { id: 'torbellino', name: 'Torbellino', icon: '🌪️', cat: 'spender', slots: ['rmb', 'k2'], tags: ['spender', 'melee', 'area', 'physical'], elem: 'physical',
    type: 'area', at: 'self', req: 2, coef: 1.5, cost: 25, radius: 2.9, lockT: 0.3,
    desc: 'Giro instantáneo con el arma: 150 % del arma a todos los enemigos a 2,9 m. Cuesta 25 de Furia.' },
  { id: 'g_hendidura', name: 'Hendidura', icon: '🪓', cat: 'spender', slots: ['rmb', 'k2'], tags: ['spender', 'melee', 'cone', 'physical'], elem: 'physical',
    type: 'cone', req: 8, coef: 2.9, cost: 27, radius: 4.5, angle: 120, windup: 0.12,
    desc: 'Tajo frontal pesado (preparación de 0,12 s): 290 % del arma a todo lo que haya en un cono de 120° y 4,5 m. Cuesta 27 de Furia.' },
  { id: 'g_martillo', name: 'Martillo de Guerra', icon: '🔨', cat: 'spender', slots: ['rmb', 'k2'], tags: ['spender', 'melee', 'area', 'physical'], elem: 'physical',
    type: 'area', at: 'target', req: 8, coef: 0.34, cost: 30, radius: 3, range: 2.5, windup: 0.15, impactDelay: 0.23, shake: 0.35,
    desc: 'Descargas el martillo hasta 2,5 m delante (preparación de 0,15 s): la onda hace 34 % del arma a todos en 3 m al tocar el suelo. Cuesta 30 de Furia.' },
  { id: 'terremoto', name: 'Terremoto', icon: '💥', cat: 'spender', slots: ['rmb', 'k2'], tags: ['spender', 'line', 'cc', 'physical'], elem: 'physical',
    type: 'line', req: 14, coef: 3.1, cost: 26, cd: 4, range: 8, width: 2, stun: 0.75, bossStun: false, windup: 0.15,
    desc: 'Partes el suelo en una grieta de 8 × 2 m (preparación de 0,15 s): 310 % del arma y aturde 0,75 s a todo lo que alcanza salvo a los jefes. Cuesta 26 de Furia; enfriamiento 4 s.' },
  { id: 'g_lanza', name: 'Lanza Arrojadiza', icon: '🎯', cat: 'spender', slots: ['rmb', 'k2'], tags: ['spender', 'proj', 'physical'], elem: 'physical',
    type: 'proj', req: 14, coef: 1.9, cost: 20, speed: 16, range: 11, pierce: true, lockT: 0.3,
    desc: 'Arrojas una lanza que atraviesa a todos los enemigos en 11 m: 190 % del arma a cada uno. Tu respuesta a voladores y lanzadores. Cuesta 20 de Furia.' },

  // ———————————————— MOVILIDAD (k1, fuera del GCD) ————————————————
  { id: 'embestida', name: 'Embestida', icon: '💨', cat: 'movement', slots: ['k1'], tags: ['movement', 'melee', 'area', 'physical'], elem: 'physical',
    type: 'dash', req: 4, coef: 1.2, cd: 8, range: 7, radius: 1.9, lockT: 0.25, genOnHit: 12,
    desc: 'Embistes hasta 7 m hacia la mira: al llegar haces 120 % del arma a todos en 1,9 m y, si golpeas a alguno, ganas 12 de Furia. Enfriamiento 8 s.' },
  { id: 'g_salto', name: 'Salto Devastador', icon: '🦶', cat: 'movement', slots: ['k1'], tags: ['movement', 'area', 'cc', 'physical'], elem: 'physical',
    type: 'leap', req: 12, coef: 1.8, cd: 12, radius: 3.2, range: 8, airT: 0.45, slow: 2, slowPct: 40, shake: 0.4,
    desc: 'Saltas hasta 8 m al punto elegido (0,45 s en el aire, intocable) y al caer haces 180 % del arma en 3,2 m y ralentizas un 40 % durante 2 s. Enfriamiento 12 s.' },

  // ———————————————— DEFENSA / UTILIDAD (k2) ————————————————
  { id: 'g_piel', name: 'Piel de Hierro', icon: '🛡️', cat: 'defense', slots: ['k2'], tags: ['defense', 'buff', 'physical'], elem: 'physical',
    type: 'buff', req: 6, cd: 20, dur: 12, buff: { dr: 50 }, slowImmune: true,
    desc: 'Tu piel se vuelve de acero 12 s: −50 % de daño recibido (reducción de daño, tope 50 %) e inmunidad a las ralentizaciones. Enfriamiento 20 s.' },
  { id: 'g_provocacion', name: 'Provocación', icon: '😠', cat: 'utility', slots: ['k2'], tags: ['utility', 'taunt', 'cc', 'physical'], elem: 'physical',
    type: 'taunt', req: 16, cd: 8, range: 15, dur: 4, weakenPct: 15, genOnHit: 15,
    desc: 'Provocas a un enemigo a 15 m o menos: te ataca a ti durante 4 s y te hace un 15 % menos de daño. Ganas 15 de Furia. Enfriamiento 8 s (no se gasta si no hay objetivo).' },
  { id: 'grito_guerra', name: 'Grito de Guerra', icon: '📢', cat: 'utility', slots: ['k2'], tags: ['utility', 'shout', 'buff', 'ally', 'physical'], elem: 'physical',
    type: 'buff', req: 12, cd: 20, dur: 8, buff: { dmgPct: 10 }, allyRadius: 15, gen: 30,
    desc: 'Rugido de batalla: ganas 30 de Furia al instante y tu grupo a 15 m gana +10 % de daño durante 8 s. Sin coste; enfriamiento 20 s.' },

  // ———————————————— DEFINITIVAS (k4, sin coste; elige una) ————————————————
  { id: 'g_u_furia', name: 'Furia Inmortal', icon: '😤', cat: 'ultimate', slots: ['k4'], tags: ['ultimate', 'buff', 'physical'], elem: 'physical',
    type: 'buff', req: 15, cd: 60, dur: 10, buff: { aspdPct: 30, spenderCostPct: -100 }, unstoppable: true, slowImmune: true,
    desc: 'Definitiva: 10 s de furia sin límite: tus gastadoras no cuestan Furia, +30 % de velocidad de ataque y eres imparable (inmune a control e interrupciones). Enfriamiento 60 s.' },
  { id: 'g_u_cataclismo', name: 'Cataclismo', icon: '☄️', cat: 'ultimate', slots: ['k4'], tags: ['ultimate', 'area', 'holy'], elem: 'holy',
    type: 'area', at: 'target', behavior: 'g_u_cataclismo', req: 15, coef: 3.1, cd: 50, radius: 3, range: 9, windup: 0.15,
    impacts: 8, spanT: 5, teleT: 0.4, shake: 0.5,
    desc: 'Definitiva: 8 meteoros de luz caen en 5 s sobre la zona (cada uno avisa 0,4 s antes): 310 % del arma por impacto en 3 m, hasta 2480 % en el centro. Enfriamiento 50 s.' },
  { id: 'g_u_estandarte', name: 'Estandarte de Guerra', icon: '🚩', cat: 'ultimate', slots: ['k4'], tags: ['ultimate', 'aura', 'buff', 'ally', 'physical'], elem: 'physical',
    type: 'aura', req: 15, cd: 55, dur: 12, radius: 8, buff: { dmgPct: 20, dr: 15 }, resPerSec: 5,
    desc: 'Definitiva: clavas tu estandarte 12 s. Tu grupo a 8 m o menos gana +20 % de daño, −15 % de daño recibido y 5 de Furia por segundo. Enfriamiento 55 s.' },
];

// Ramas (3 × 3) de cada habilidad. Mismos ids que antes (la migración v3 los conserva).
export const GUERRERO_SKILL_MODS = {
  // básicos (Transformación más ligera)
  g_tajo:      dmgMods('g_tajo', O_RAD, V_BLEED, V_VULN, V_CHAIN),
  g_mandoble:  dmgMods('g_mandoble', O_BIG, V_EXEC, V_STUN, T_ECHO),
  g_embate:    dmgMods('g_embate', O_RAD, V_BLEED, V_SLOW, T_ZONE),
  // gastadoras y movilidad (Transformación = cambia EN GRANDE cómo funciona)
  torbellino:  dmgMods('torbellino', O_RAD, T_ZONE, T_CDHIT, T_GIANT),
  g_hendidura: dmgMods('g_hendidura', O_RAD, T_ZONE, T_CDHIT, V_BLEED),
  g_martillo:  dmgMods('g_martillo', O_RAD, T_NOVA, T_CDHIT, T_ZONE),
  terremoto:   dmgMods('terremoto', O_RAD, T_ZONE, T_GIANT, V_EXEC),
  g_lanza:     dmgMods('g_lanza', O_PROJ, V_PIERCE, V_CHAIN, T_ECHO),
  embestida:   dmgMods('embestida', O_RAD, V_CHAIN, T_NOVA, T_ZONE),
  g_salto:     dmgMods('g_salto', O_RAD, T_NOVA, T_CDHIT, T_ZONE),
  // defensa (nueva: Potencia / Recarga / Variante, §3.4) y utilidades
  g_piel:        utilMods('g_piel'),
  g_provocacion: buffMods('g_provocacion'),   // Potencia = más reducción · Duración = provoca más · Recurso
  grito_guerra:  buffMods('grito_guerra'),
  // definitivas
  g_u_furia:      buffMods('g_u_furia'),
  g_u_cataclismo: dmgMods('g_u_cataclismo', O_RAD, T_ZONE, T_GIANT, V_EXEC),
  g_u_estandarte: buffMods('g_u_estandarte'),
};

// ============================================================
// Comportamientos a medida (solo donde ningún tipo genérico basta). Firma:
//   cast(g, p, prof, cast) con cast = { sk, prof, slot, target, enemy, ctx, done }
//   ctx = { coef, areaOpts, dmgOpts, hitInfo, avgHit, color, fx, isEcho, res, hit(e, dealt) }
// Devuelven ctx.res (instantáneo) o undefined y luego cast.done(ctx.res) (diferido,
// siempre por g.timers.schedule; nunca setTimeout). Solo usan métodos de Game y de
// Player/Enemy (dealArea, gainResource, fireProjectile, startChannel, timers…).
// Paso 2b.2: el resto del kit usa los TIPOS GENÉRICOS del núcleo (Mandoble/Embate
// con cadence, Embestida con genOnHit, Piel/Furia Inmortal con slowImmune y coste
// por buff, Provocación con weakenPct, Grito con gen, Estandarte con type 'aura').
// ============================================================

// emite un campo de FX (string = nombre de preset, objeto = preset) si existe
const emit = (g, preset, pos) => { if (preset) g.emitFx?.(preset, pos); };

export const GUERRERO_SKILL_BEHAVIORS = {
  // Cataclismo: 6 impactos en 3 s alrededor del punto (telegrafía de 0,4 s cada uno).
  // El primero cae en el centro y los demás a 1,2 m: el centro recibe los 6.
  g_u_cataclismo: {
    cast(g, p, prof, cast) {
      const { ctx, sk } = cast;
      const center = cast.target.clone().setY(0);
      const rad = prof.radius || sk.radius || 3;
      const n = Math.max(1, sk.impacts || 6);
      const every = (sk.spanT || 3) / n;
      const tele = sk.teleT ?? 0.4;
      p.faceToward(center);
      let landed = 0;
      for (let i = 0; i < n; i++) {
        const a = (i - 1) * (Math.PI * 2 / Math.max(1, n - 1));
        const pos = i === 0 ? center.clone() : center.clone().add(center.clone().set(Math.sin(a) * 1.2, 0, Math.cos(a) * 1.2));
        g.timers.schedule(i * every, () => {
          g.spawnRing?.(pos, rad, 0xffe7a0);                        // telegrafía
          emit(g, ctx.fx?.trail, pos.clone().setY(4.5));
          g.timers.schedule(tele, () => {
            if (p.alive) {
              g.dealArea(pos, rad, ctx.coef, ctx.areaOpts);
              emit(g, ctx.fx?.impact, pos.clone().setY(0.3));
              emit(g, ctx.fx?.aura, pos.clone().setY(0.3));
              g.addShake?.(sk.shake || 0.4);
            }
            if (++landed >= n) {
              ctx.zoneCenter = center; ctx.zoneRad = rad;
              cast.done(ctx.res);
            }
          });
        });
      }
      return undefined; // diferido: termina con el último impacto
    },
  },
};
