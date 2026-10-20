// ============================================================
// Catálogo de habilidades de la MAGA (Maná) — dueño: trabajador de la clase (2b.1)
// ============================================================
// Paso 2b.1: catálogo BASE completo de docs/paso2-diseno.md §3.2 (estados C/R/N;
// las activas de talento —T— llegan en 2c). Calendario §1.2:
//   Nv1 Dardo · Nv2 Bola de Fuego · Nv3 Ascua · Nv4 Paso de Escarcha ·
//   Nv6 Armadura de Hielo · Nv8 Rayo + Toque Gélido · Nv12 Estela Ígnea + Onda
//   Repulsora · Nv14 Nova de Hielo + Meteoro · Nv15 las 3 definitivas.
// Identidad (§1.4/§2): Maná = pozo de ráfaga; TODAS las gastadoras tienen
// enfriamiento y van en 🖱️Der o en la ranura 2 flexible (gestionar dos
// enfriamientos es la build ofensiva de la Maga).
// Lo que depende de los indicadores de especialización (Cargas Arcanas, capas de
// Escarcha, Calor/Quemadura de Ignición) es del Paso 2c (spec-mechanics.js).
// Paso 2b.2: Ascua y Bola de Fuego usan el tipo genérico `proj` con salpicadura
// (`splash`, el daño se tira al impactar y el básico da Maná al acertar) y el
// Desgarro Arcano la canalización genérica (`unstoppable`). Números recalibrados
// con el banco (solo coef/coste/enfriamiento).
// Este archivo SOLO importa js/skill-defs.js (evita ciclos con powers.js).
import { dmgMods, utilMods, O_RAD, O_PROJ, O_BIG, V_BURN, V_VULN, V_STUN, V_SLOW, V_CHAIN, V_EXEC,
  T_ZONE } from './skill-defs.js';

export const MAGA_SKILLS = [
  // — BÁSICOS (generan Maná; «casi no genera») —
  { id: 'm_dardo', name: 'Dardo Arcano', icon: '✨', cat: 'basic', slots: ['lmb'], tags: ['basic', 'proj', 'arcane'], elem: 'arcane',
    type: 'weapon', req: 1, coef: 1.05, gen: 3, color: 0xcc66ff,
    desc: 'Lanza un dardo arcano a distancia (100 % del daño de arma) y recupera 3 de Maná al impactar.' },
  { id: 'm_ascua', name: 'Ascua', icon: '🔸', cat: 'basic', slots: ['lmb'], tags: ['basic', 'proj', 'area', 'fire'], elem: 'fire',
    type: 'proj', req: 3, coef: 0.75, splash: 0.3, radius: 1.5, gen: 3, speed: 14, range: 9, size: 0.16, color: 0xff8a33,
    desc: 'Lanza una ascua que estalla al impactar: 75 % de daño al objetivo y 30 % a los enemigos a 1,5 m. Recupera 3 de Maná si acierta.' },
  { id: 'm_toque', name: 'Toque Gélido', icon: '🌬️', cat: 'basic', slots: ['lmb'], tags: ['basic', 'cone', 'cc', 'frost'], elem: 'frost',
    type: 'cone', req: 8, coef: 0.7, radius: 4, angle: 70, range: 4, slow: 1.5, slowPct: 20, gen: 4, color: 0x9fe3ff,
    desc: 'Exhalas un vaho helado en un cono de 70° y 4 m: 70 % de daño a todos y los ralentiza un 20 % durante 1,5 s. Recupera 4 de Maná si acierta.' },

  // — GASTADORAS (🖱️Der o ranura 2; todas con enfriamiento) —
  // Bola de Fuego: tag 'area' (explota: Expansivo/Concentrado cambian su radio) y
  // lanzamiento de 0,3 s (windup: la esquiva lo cancela sin coste)
  { id: 'bola_fuego', name: 'Bola de Fuego', icon: '🔥', cat: 'spender', slots: ['rmb', 'k2'], tags: ['spender', 'proj', 'area', 'fire'], elem: 'fire',
    type: 'proj', req: 2, coef: 2.2, splash: 3.5, radius: 2, cost: 18, cd: 1.5, windup: 0.3, speed: 13, range: 12, size: 0.26, color: 0xff6622,
    desc: 'Tras 0,3 s de lanzamiento, una esfera ardiente que explota al impactar: 220 % de daño al objetivo y 350 % a los enemigos a 2 m. Cuesta 18 de Maná; enfriamiento 1,5 s.' },
  { id: 'rayo', name: 'Rayo', icon: '⚡', cat: 'spender', slots: ['rmb', 'k2'], tags: ['spender', 'proj', 'arcane'], elem: 'arcane',
    type: 'proj', req: 8, coef: 2.3, cost: 20, cd: 2.2, lockT: 0.3, speed: 18, range: 13, pierce: true, beam: true, color: 0xffee66,
    desc: 'Un rayo arcano que atraviesa a todos los enemigos en línea (230 % de daño). Cuesta 20 de Maná; enfriamiento 2,2 s.' },
  { id: 'nova_hielo', name: 'Nova de Hielo', icon: '❄️', cat: 'spender', slots: ['rmb', 'k2'], tags: ['spender', 'area', 'cc', 'frost'], elem: 'frost',
    type: 'area', at: 'self', req: 14, coef: 1.4, cost: 25, cd: 4, radius: 3.3, slow: 3, slowPct: 30, color: 0x66ccff,
    desc: 'Una onda gélida a tu alrededor (3,3 m): 140 % de daño y ralentiza un 30 % durante 3 s. Cuesta 25 de Maná; enfriamiento 4 s.' },
  { id: 'meteoro', name: 'Meteoro', icon: '☄️', cat: 'spender', slots: ['rmb', 'k2'], tags: ['spender', 'area', 'fire'], elem: 'fire',
    type: 'area', at: 'target', req: 14, coef: 3.7, cost: 40, cd: 6, radius: 3, range: 11, impactDelay: 0.6, shake: 0.5, color: 0xff4400,
    desc: 'Invoca un meteoro que se estrella 0,6 s después en la zona elegida (3 m): 370 % de daño. Cuesta 40 de Maná; enfriamiento 6 s.' },

  // — MOVILIDAD (ranura 1, fuera del GCD) —
  { id: 'm_paso_escarcha', name: 'Paso de Escarcha', icon: '🧊', cat: 'movement', slots: ['k1'], tags: ['movement', 'frost'], elem: 'frost',
    behavior: 'm_paso_escarcha', req: 4, cd: 10, range: 6, lockT: 0.2, radius: 1.5, dur: 3, slow: 1, slowPct: 40, color: 0x9fe3ff,
    desc: 'Te deslizas 6 m hacia la mira y dejas una estela helada durante 3 s que ralentiza un 40 % a quien la pisa. Enfriamiento 10 s.' },
  { id: 'm_estela_ignea', name: 'Estela Ígnea', icon: '♨️', cat: 'movement', slots: ['k1'], tags: ['movement', 'zone', 'fire'], elem: 'fire',
    behavior: 'm_estela_ignea', req: 12, coef: 0.4, cd: 10, range: 6, lockT: 0.2, radius: 1.5, dur: 3, color: 0xff7733,
    desc: 'Te deslizas 6 m hacia la mira dejando un rastro de fuego durante 3 s: 40 % de daño por segundo a quien lo pisa. Enfriamiento 10 s.' },

  // — DEFENSA / UTILIDAD (ranura 2) —
  { id: 'm_armadura', name: 'Armadura de Hielo', icon: '🛡️', cat: 'defense', slots: ['k2'], tags: ['defense', 'shield', 'frost'], elem: 'frost',
    type: 'shield', req: 6, cd: 12, shieldPct: 30, dur: 8, color: 0x88ccff,
    desc: 'Te envuelve una coraza de hielo: escudo del 30 % de tu vida máxima durante 8 s. Enfriamiento 12 s.' },
  { id: 'm_onda', name: 'Onda Repulsora', icon: '🌀', cat: 'utility', slots: ['k2'], tags: ['utility', 'area', 'cc', 'arcane'], elem: 'arcane',
    behavior: 'm_onda', req: 12, coef: 0.8, cost: 15, cd: 12, radius: 4, knock: 5, stun: 0.5, color: 0xb98cff,
    desc: 'Una onda arcana a tu alrededor (4 m): 80 % de daño, empuja 5 m a los enemigos y los aturde 0,5 s. Cuesta 15 de Maná; enfriamiento 12 s.' },

  // — DEFINITIVAS (ranura 4, sin coste; eliges una) —
  { id: 'm_u_supernova', name: 'Supernova', icon: '🌟', cat: 'ultimate', slots: ['k4'], tags: ['ultimate', 'area', 'fire'], elem: 'fire',
    behavior: 'm_u_supernova', req: 15, coef: 4.7, pulses: 3, pulseGap: 0.25, burn: 12, burnT: 6, cd: 50, radius: 5, range: 10,
    windup: 0.15, impactDelay: 0.5, shake: 0.6, color: 0xffcc44,
    desc: 'Definitiva: una estrella cae en la zona (5 m) y estalla 0,5 s después en tres ondas de 470 % de daño (1410 % en total) que dejan una quemadura de 1200 % en 6 s. Enfriamiento 50 s.' },
  { id: 'm_u_tormenta', name: 'Tormenta Glacial', icon: '🌨️', cat: 'ultimate', slots: ['k4'], tags: ['ultimate', 'zone', 'cc', 'frost'], elem: 'frost',
    behavior: 'm_u_tormenta', req: 15, coef: 0.6, cd: 55, radius: 6, dur: 8, interval: 0.5, slowPct: 40, freeze: 1.5, freezeAt: 5, color: 0xbfe9ff,
    desc: 'Definitiva: una ventisca te sigue durante 8 s (6 m): 60 % de daño cada 0,5 s (960 % en total), ralentiza un 40 % y congela 1,5 s a quien encadena 5 golpes (con rendimientos decrecientes). Enfriamiento 55 s.' },
  { id: 'm_u_desgarro', name: 'Desgarro Arcano', icon: '🌌', cat: 'ultimate', slots: ['k4'], tags: ['ultimate', 'channel', 'arcane'], elem: 'arcane',
    type: 'channel', unstoppable: true, req: 15, coef: 4.4, channelT: 3, ticks: 6, cd: 45, range: 10, color: 0xd28cff,
    desc: 'Definitiva: canalizas un rayo arcano gigante durante 3 s contra un objetivo (880 % de daño por segundo, 2640 % en total). Eres imparable mientras dura; mantén la tecla. Enfriamiento 45 s.' },
];

// Opción propia (misma forma que las O_*/V_*/T_* de skill-defs.js)
const T_ETERNAL = { name: 'Invierno Eterno', desc: '+3 s de duración, pero −15 % de daño.', durS: 3, dmg: -15 };

// Ramas (3 × 3) de cada habilidad. Las habilidades que se CONSERVAN mantienen sus
// ids de rama (<id>_o/_f/_v) para que la migración v3 no las pierda (§3.4).
export const MAGA_SKILL_MODS = {
  // básicos
  m_dardo:     dmgMods('m_dardo', O_PROJ, V_BURN, V_VULN, V_SLOW),
  m_ascua:     dmgMods('m_ascua', O_RAD, V_BURN, V_VULN, T_ZONE),
  m_toque:     dmgMods('m_toque', O_RAD, V_SLOW, V_VULN, V_STUN),
  // gastadoras (Rayo ya perfora: su Transformación «Atravesar» pasa a «Rebote»)
  bola_fuego:  dmgMods('bola_fuego', O_PROJ, V_BURN, V_VULN, V_STUN),
  rayo:        dmgMods('rayo', O_PROJ, V_CHAIN, V_VULN, V_STUN),
  nova_hielo:  dmgMods('nova_hielo', O_RAD, V_SLOW, V_VULN, V_STUN),
  meteoro:     dmgMods('meteoro', O_RAD, V_BURN, V_VULN, V_STUN),
  // movilidad y defensa/utilidad (Potencia / Recarga / Variante)
  m_paso_escarcha: utilMods('m_paso_escarcha'),
  m_estela_ignea:  utilMods('m_estela_ignea'),
  m_armadura:      utilMods('m_armadura'),
  m_onda:          utilMods('m_onda'),
  // definitivas
  m_u_supernova: dmgMods('m_u_supernova', O_RAD, V_BURN, V_VULN, V_STUN),
  m_u_tormenta:  dmgMods('m_u_tormenta', O_RAD, V_VULN, V_STUN, T_ETERNAL),
  m_u_desgarro:  dmgMods('m_u_desgarro', O_BIG, V_VULN, V_STUN, V_EXEC),
};

// ------------------------------------------------------------
// Comportamientos a medida (§9.1.3). Firma: cast(g, p, prof, cast) con
// cast = { sk, prof, slot, target, enemy, ctx, done } → ctx.res (instantáneo) o
// undefined + cast.done(ctx.res) al impactar (diferido, vía g.timers.schedule).
// Solo métodos de Game y primitivas documentadas (dealArea, spawnField,
// applyCC, applyDoT, timers, canalización del núcleo). Sin THREE: los vectores
// se obtienen con .clone() de los que ya existen.
// ------------------------------------------------------------
const STORMS = new WeakMap(); // héroe → tormenta activa (una a la vez)

// deslizamiento hacia la mira (como el tipo genérico `dash`, sin daño). Devuelve
// los puntos recorridos (para dejar la estela) y deja al héroe en el destino.
function slide(g, p, prof, cast) {
  const tgt = cast.target || p.pos;
  let dx = tgt.x - p.pos.x, dz = tgt.z - p.pos.z;
  let len = Math.hypot(dx, dz);
  if (len < 0.5) { // mira encima del héroe: hacia donde mira
    const ry = p.group?.rotation?.y || 0;
    dx = Math.sin(ry); dz = Math.cos(ry); len = 1;
  }
  dx /= len; dz /= len;
  const dist = prof.range || 6;
  const start = p.pos.clone();
  const look = p.pos.clone(); look.x += dx; look.z += dz;
  p.faceToward?.(look);
  const pts = [start];
  let traveled = 0, nextMark = 2;
  while (traveled < dist) {
    const step = Math.min(0.3, dist - traveled);
    const nx = p.pos.x + dx * step, nz = p.pos.z + dz * step;
    if (g.world?.grid && !g.world.grid.walkable(nx, nz)) break;
    p.pos.x = nx; p.pos.z = nz;
    traveled += step;
    if (traveled >= nextMark - 1e-6) { pts.push(p.pos.clone()); nextMark += 2; }
    if (cast.ctx.fx?.trail && traveled % 0.9 < 0.3) {
      const at = p.pos.clone(); at.y = 0.4;
      g.emitFx?.(cast.ctx.fx.trail, at);
    }
  }
  if (pts.length < 2 || pts[pts.length - 1].distanceTo(p.pos) > 0.5) pts.push(p.pos.clone());
  cast.ctx.zoneCenter = p.pos.clone(); cast.ctx.zoneRad = 2;
  return pts;
}

// deja una estela de campos 'zona' (daño por segundo y/o ralentización) en el recorrido
function trailFields(g, p, prof, cast, pts, data) {
  for (const pt of pts) {
    g.spawnField?.('zona', { pos: pt, radius: prof.radius || 1.5, dur: prof.dur || 3, owner: p,
      data: { color: cast.ctx.color || cast.sk.color, skill: cast.sk.id, tags: prof.tags, ...data } });
  }
}

export const MAGA_SKILL_BEHAVIORS = {
  // Paso de Escarcha: desliz de 6 m + estela que ralentiza 40 % durante 3 s
  m_paso_escarcha: {
    cast(g, p, prof, cast) {
      const pts = slide(g, p, prof, cast);
      trailFields(g, p, prof, cast, pts, { dps: 0, interval: 0.25, slow: Math.max(0.6, prof.slow || 1), slowPct: prof.slowPct || 40 });
      g.spawnRing?.(p.pos, 1.2, cast.ctx.color || cast.sk.color);
      if (cast.ctx.fx?.impact) { const at = p.pos.clone(); at.y = 0.6; g.emitFx?.(cast.ctx.fx.impact, at); }
      return cast.ctx.res;
    },
  },

  // Estela Ígnea: desliz de 6 m dejando fuego (coef = WD por segundo, como `zone`)
  m_estela_ignea: {
    cast(g, p, prof, cast) {
      const pts = slide(g, p, prof, cast);
      trailFields(g, p, prof, cast, pts, { dps: cast.ctx.avgHit });
      if (cast.ctx.fx?.impact) { const at = p.pos.clone(); at.y = 0.6; g.emitFx?.(cast.ctx.fx.impact, at); }
      return cast.ctx.res;
    },
  },

  // Onda Repulsora: daño en área a tu alrededor + EMPUJE (applyCC 'knock') + aturdir
  m_onda: {
    cast(g, p, prof, cast) {
      const ctx = cast.ctx, sk = cast.sk;
      const from = p.pos.clone();
      const knock = (sk.knock || 5) * (prof.rangeMul || 1);
      p.swing = 1;
      g.dealArea(from, prof.radius || 4, ctx.coef, {
        ...ctx.areaOpts,
        // primero el empuje (la identidad de la habilidad) y luego los efectos del
        // perfil (aturdir 0,5 s, ramas): ambos comparten rendimientos decrecientes
        onHit: (e, dealt) => { if (e.alive) e.applyCC?.('knock', knock, { from, src: p }); ctx.hit(e, dealt); },
      });
      ctx.zoneCenter = from; ctx.zoneRad = prof.radius || 4;
      g.spawnRing?.(from, prof.radius || 4, ctx.color || sk.color);
      const at = from.clone(); at.y = 0.5;
      if (ctx.fx?.aura) g.emitFx?.(ctx.fx.aura, at);
      if (ctx.fx?.extra) g.emitFx?.(ctx.fx.extra, at);
      g.addShake?.(0.2);
      return ctx.res;
    },
  },

  // Supernova: telegrafía 0,5 s y TRES ondas de 4,7 WD (14,1 en total) + Quemadura de
  // 6 WD en 6 s. En tres ondas para que ningún golpe suelto supere el 21 % de la
  // vida de un jefe (banco), con el mismo presupuesto de §3.2 (≈20 WD).
  m_u_supernova: {
    cast(g, p, prof, cast) {
      const ctx = cast.ctx, sk = cast.sk;
      const center = (cast.target || p.pos).clone(); center.y = 0;
      const rad = prof.radius || 5;
      const color = ctx.color || sk.color;
      p.faceToward?.(center);
      g.spawnRing?.(center, rad, color);                       // telegrafía
      if (ctx.fx?.trail) { const at = center.clone(); at.y = 4.5; g.emitFx?.(ctx.fx.trail, at); }
      const pulses = Math.max(1, sk.pulses || 1);
      // quemadura: 6 WD a rango 1, escala con el rango igual que el golpe (ctx.coef);
      // s16 Supernova Abrasadora (Piromante, tv.supernovaBurn): un X % más fuerte al crearla
      const burnTotal = p.avgHit(ctx.coef * ((sk.burn || 0) / (sk.coef || 1)), prof.addPct)
        * Math.max(0, 1 + (p.tv?.supernovaBurn || 0) / 100);
      const burnT = sk.burnT || 6;
      let n = 0;
      const pulse = () => {
        n++;
        const last = n >= pulses;
        g.dealArea(center, rad, ctx.coef, {
          ...ctx.areaOpts,
          onHit: (e, dealt) => {
            ctx.hit(e, dealt);
            if (last && e.alive && burnTotal > 0) g.applyDoT?.(e, burnTotal, burnT, 1, undefined, 'm_u_supernova:burn');
          },
        });
        const at = center.clone(); at.y = 0.3;
        if (ctx.fx?.impact) g.emitFx?.(ctx.fx.impact, at);
        if (ctx.fx?.aura) g.emitFx?.(ctx.fx.aura, at);
        if (last && ctx.fx?.extra) g.emitFx?.(ctx.fx.extra, at);
        g.spawnRing?.(center, rad * (last ? 1 : 0.6), color);
        g.addShake?.(last ? (sk.shake || 0.6) : 0.3);
        if (!last) { g.timers.schedule(sk.pulseGap || 0.3, pulse); return; }
        ctx.zoneCenter = center; ctx.zoneRad = rad;
        cast.done(ctx.res);
      };
      g.timers.schedule(prof.impactDelay || 0.5, pulse);
      return undefined; // diferido: termina con la última onda
    },
  },

  // Tormenta Glacial: te SIGUE 8 s; cada 0,5 s daña en 6 m, ralentiza 40 % y suma
  // 1 golpe de escarcha por enemigo; a los 5 lo congela 1,5 s (applyCC 'freeze',
  // con rendimientos decrecientes). Las capas son LOCALES a la tormenta hasta que
  // el indicador de Escarcha del Crionte exista (Paso 2c, spec-mechanics.js).
  m_u_tormenta: {
    cast(g, p, prof, cast) {
      const ctx = cast.ctx, sk = cast.sk;
      const prev = STORMS.get(p); if (prev) prev.alive = false;
      const inst = { alive: true, layers: new Map() };
      STORMS.set(p, inst);
      const interval = sk.interval || 0.5;
      let left = Math.max(1, Math.round((prof.dur || 8) / interval));
      const color = ctx.color || sk.color;
      const pulse = () => {
        if (!inst.alive || !p.alive || g.player !== p || (g.state && g.state !== 'play')) { inst.alive = false; return; }
        const c = p.pos.clone();
        const rad = prof.radius || 6;
        g.dealArea(c, rad, ctx.coef, {
          ...ctx.areaOpts,
          onHit: (e, dealt) => {
            ctx.hit(e, dealt);
            if (!e.alive) return;
            e.applyCC?.('slow', interval + 0.6, { pct: sk.slowPct || 40, src: p });
            const n = (inst.layers.get(e) || 0) + 1;
            if (n >= (sk.freezeAt || 5)) { e.applyCC?.('freeze', sk.freeze || 1.5, { src: p }); inst.layers.set(e, 0); }
            else inst.layers.set(e, n);
          },
        });
        const at = c.clone(); at.y = 1.2;
        if (ctx.fx?.aura) g.emitFx?.(ctx.fx.aura, at);
        at.y = 0.3;
        if (ctx.fx?.extra) g.emitFx?.(ctx.fx.extra, at);
        if (left % 2 === 0) g.spawnRing?.(c, rad, color);
        if (--left > 0) g.timers.schedule(interval, pulse);
        else { inst.alive = false; if (STORMS.get(p) === inst) STORMS.delete(p); }
      };
      pulse(); // primer pulso al lanzarla
      return ctx.res;
    },
  },

};
