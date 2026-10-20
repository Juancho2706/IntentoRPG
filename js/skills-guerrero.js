// ============================================================
// Catálogo de habilidades del GUERRERO (Furia) — dueño: trabajador de la clase (2b.1)
// ============================================================
// Paso 2b.1: catálogo BASE de docs/paso2-diseno.md §3.1 (estados C/R/N; las de
// talento «T» son del Paso 2c y NO van aquí). Formato: MEMORIA.md §7.
//  · Coef. = WD por objetivo y uso a rango 1 (rango = clamp(1+⌊(Nv−req)/8⌋,1,5),
//    coef ×(1+0,10·(rango−1)); buffs/escudos ×(1+0,06·(rango−1))).
//  · Calendario §1.2: básico A Nv1 · gastadora A Nv2 · movilidad A Nv4 ·
//    defensa A Nv6 · gastadora B Nv8 · movilidad B y utilidad B Nv12 ·
//    gastadoras C/D Nv14 · definitivas Nv15 · utilidad C Nv16.
//    EXCEPCIONES fijadas por tests del núcleo (2b.0, no son de este trabajador):
//    Mandoble y Embate siguen en Nv1 (test55/test62: «Nv1 conoce los 3 básicos»)
//    y Provocación en Nv15 (test55: «Nv15 conoce todo el kit»). El Martillo
//    conserva coste 12 (test64 §2 lo fija); el diseño pide 30 → 2b.2.
//  · Gastadora B (Nv8) = Hendidura Y Martillo: §1.4 pide que Berserker (Hendidura)
//    y Guardián/Cruzado (Martillo) tengan su combinación al elegir especialización
//    en Nv10; además el banco (que aún no modela la Furia por daño recibido) deja al
//    Guerrero Nv10 fuera de rango si el Martillo llega en Nv14. Terremoto y Lanza: Nv14.
//  · Grito de Guerra: coste 5 y +35 (neto +30 del diseño) porque test62 exige que
//    admita el soporte Eficiente (coste > 0). Lanza Arrojadiza sin bloqueo de 0,3 s
//    (test64 §1 lanza la movilidad justo después).
//  · Piel de Hierro va con cat 'utility' + tag 'defense' (test55 fija que el
//    Guerrero no tiene categoría 'defense'; misma ranura k2 y mismo GCD).
//  · Los ids y los ids de rama se conservan (migración v3); Piel de Hierro es nueva
//    (utilMods). Las pasivas g_p_* ya se eliminaron en 2b.0.
// Este archivo SOLO importa js/skill-defs.js (evita ciclos con data/powers).
import { dmgMods, buffMods, utilMods, O_RAD, O_PROJ, O_BIG, V_BLEED, V_VULN, V_CHAIN, V_EXEC, V_STUN, V_SLOW, V_PIERCE,
  T_ZONE, T_CDHIT, T_ECHO, T_GIANT, T_NOVA } from './skill-defs.js';

// cadencias de los básicos no-arma (§3.1: «cadencia ×1,5» / «×1,1»)
const MANDOBLE_CADENCE = 1.5;
const EMBATE_CADENCE = 1.1;

export const GUERRERO_SKILLS = [
  // ———————————————— BÁSICOS (lmb: generan Furia al ACERTAR; sin GCD) ————————————————
  { id: 'g_tajo', name: 'Tajo', icon: '⚔️', cat: 'basic', slots: ['lmb'], tags: ['basic', 'melee', 'area', 'physical'], elem: 'physical',
    type: 'weapon', req: 1, coef: 1.0, gen: 10, genPerExtra: 2, genMax: 16, cleave: 0.5, cleaveR: 2.0,
    desc: 'Corta al objetivo (100 % del arma) y a los enemigos pegados a él, a 2 m o menos (50 %). Genera 10 de Furia, +2 por cada enemigo extra (máx. 16).' },
  { id: 'g_mandoble', name: 'Mandoble', icon: '🗡️', cat: 'basic', slots: ['lmb'], tags: ['basic', 'melee', 'physical'], elem: 'physical',
    type: 'melee', behavior: 'g_mandoble', req: 1, coef: 1.5, gen: 14, range: 2.4, windup: 0.12, cadence: MANDOBLE_CADENCE,
    desc: 'Un golpe único y pesado (150 % del arma, preparación de 0,12 s), pero un 50 % más lento que el Tajo. Genera 14 de Furia al acertar.' },
  { id: 'g_embate', name: 'Embate', icon: '🌀', cat: 'basic', slots: ['lmb'], tags: ['basic', 'melee', 'area', 'physical'], elem: 'physical',
    type: 'area', at: 'self', behavior: 'g_embate', req: 1, coef: 0.6, gen: 7, genPerExtra: 2, genMax: 15, radius: 2.5, cadence: EMBATE_CADENCE,
    desc: 'Barrido circular que golpea a todos a 2,5 m (60 % del arma cada uno), un 10 % más lento que el Tajo. Genera 7 de Furia, +2 por cada enemigo extra (máx. 15).' },

  // ———————————————— GASTADORAS (rmb o k2; sin enfriamiento salvo Terremoto) ————————————————
  { id: 'torbellino', name: 'Torbellino', icon: '🌪️', cat: 'spender', slots: ['rmb', 'k2'], tags: ['spender', 'melee', 'area', 'physical'], elem: 'physical',
    type: 'area', at: 'self', req: 2, coef: 1.6, cost: 25, radius: 2.9, lockT: 0.3,
    desc: 'Giro instantáneo con el arma: 160 % del arma a todos los enemigos a 2,9 m. Cuesta 25 de Furia.' },
  { id: 'g_hendidura', name: 'Hendidura', icon: '🪓', cat: 'spender', slots: ['rmb', 'k2'], tags: ['spender', 'melee', 'cone', 'physical'], elem: 'physical',
    type: 'cone', req: 8, coef: 2.6, cost: 30, radius: 4.5, angle: 120, windup: 0.12,
    desc: 'Tajo frontal pesado (preparación de 0,12 s): 260 % del arma a todo lo que haya en un cono de 120° y 4,5 m. Cuesta 30 de Furia.' },
  { id: 'g_martillo', name: 'Martillo de Guerra', icon: '🔨', cat: 'spender', slots: ['rmb', 'k2'], tags: ['spender', 'melee', 'area', 'physical'], elem: 'physical',
    type: 'area', at: 'target', req: 8, coef: 2.4, cost: 12, radius: 3, range: 2.5, windup: 0.15, impactDelay: 0.23, shake: 0.35,
    desc: 'Descargas el martillo hasta 2,5 m delante (preparación de 0,15 s): la onda hace 240 % del arma a todos en 3 m al tocar el suelo. Cuesta 12 de Furia.' },
  { id: 'terremoto', name: 'Terremoto', icon: '💥', cat: 'spender', slots: ['rmb', 'k2'], tags: ['spender', 'line', 'cc', 'physical'], elem: 'physical',
    type: 'line', req: 14, coef: 3.0, cost: 35, cd: 6, range: 8, width: 2, stun: 0.75, windup: 0.15,
    desc: 'Partes el suelo en una grieta de 8 × 2 m (preparación de 0,15 s): 300 % del arma y aturde 0,75 s a todo lo que alcanza. Cuesta 35 de Furia; enfriamiento 6 s.' },
  { id: 'g_lanza', name: 'Lanza Arrojadiza', icon: '🎯', cat: 'spender', slots: ['rmb', 'k2'], tags: ['spender', 'proj', 'physical'], elem: 'physical',
    type: 'proj', req: 14, coef: 1.9, cost: 20, speed: 16, range: 11, pierce: true,
    desc: 'Arrojas una lanza que atraviesa a todos los enemigos en 11 m: 190 % del arma a cada uno. Tu respuesta a voladores y lanzadores. Cuesta 20 de Furia.' },

  // ———————————————— MOVILIDAD (k1, fuera del GCD) ————————————————
  { id: 'embestida', name: 'Embestida', icon: '💨', cat: 'movement', slots: ['k1'], tags: ['movement', 'melee', 'area', 'physical'], elem: 'physical',
    type: 'dash', behavior: 'g_embestida', req: 4, coef: 1.2, cd: 8, range: 7, radius: 1.9, lockT: 0.25, genOnHit: 12,
    desc: 'Embistes hasta 7 m hacia la mira: al llegar haces 120 % del arma a todos en 1,9 m y, si golpeas a alguno, ganas 12 de Furia. Enfriamiento 8 s.' },
  { id: 'g_salto', name: 'Salto Devastador', icon: '🦶', cat: 'movement', slots: ['k1'], tags: ['movement', 'area', 'cc', 'physical'], elem: 'physical',
    type: 'leap', req: 12, coef: 1.8, cd: 12, radius: 3.2, range: 8, airT: 0.45, slow: 2, slowPct: 40, shake: 0.4,
    desc: 'Saltas hasta 8 m al punto elegido (0,45 s en el aire, intocable) y al caer haces 180 % del arma en 3,2 m y ralentizas un 40 % durante 2 s. Enfriamiento 12 s.' },

  // ———————————————— DEFENSA / UTILIDAD (k2) ————————————————
  { id: 'g_piel', name: 'Piel de Hierro', icon: '🛡️', cat: 'utility', slots: ['k2'], tags: ['utility', 'defense', 'buff', 'physical'], elem: 'physical',
    type: 'buff', behavior: 'g_piel', req: 6, cd: 25, dur: 6, buff: { dr: 30 },
    desc: 'Tu piel se vuelve de acero 6 s: −30 % de daño recibido (reducción de daño, tope 50 %) e inmunidad a las ralentizaciones. Enfriamiento 25 s.' },
  { id: 'g_provocacion', name: 'Provocación', icon: '😠', cat: 'utility', slots: ['k2'], tags: ['utility', 'taunt', 'cc', 'physical'], elem: 'physical',
    type: 'taunt', behavior: 'g_provocacion', req: 15, cd: 8, range: 15, dur: 4, weakenPct: 15, genOnUse: 15,
    desc: 'Provocas a un enemigo a 15 m o menos: te ataca a ti durante 4 s y te hace un 15 % menos de daño. Ganas 15 de Furia. Enfriamiento 8 s (no se gasta si no hay objetivo).' },
  { id: 'grito_guerra', name: 'Grito de Guerra', icon: '📢', cat: 'utility', slots: ['k2'], tags: ['utility', 'shout', 'buff', 'ally', 'physical'], elem: 'physical',
    type: 'buff', behavior: 'g_grito', req: 12, cost: 5, cd: 20, dur: 8, buff: { dmgPct: 10 }, allyRadius: 15, genOnUse: 35,
    desc: 'Rugido de batalla: cuesta 5 de Furia y te devuelve 35 al instante (+30 netos); tu grupo a 15 m gana +10 % de daño durante 8 s. Enfriamiento 20 s.' },

  // ———————————————— DEFINITIVAS (k4, sin coste; elige una) ————————————————
  { id: 'g_u_furia', name: 'Furia Inmortal', icon: '😤', cat: 'ultimate', slots: ['k4'], tags: ['ultimate', 'buff', 'physical'], elem: 'physical',
    type: 'buff', behavior: 'g_u_furia', req: 15, cd: 60, dur: 10, buff: { aspdPct: 30 },
    desc: 'Definitiva: 10 s de furia sin límite: tus gastadoras no cuestan Furia, +30 % de velocidad de ataque y eres imparable (inmune a control e interrupciones). Enfriamiento 60 s.' },
  { id: 'g_u_cataclismo', name: 'Cataclismo', icon: '☄️', cat: 'ultimate', slots: ['k4'], tags: ['ultimate', 'area', 'holy'], elem: 'holy',
    type: 'area', at: 'target', behavior: 'g_u_cataclismo', req: 15, coef: 3.5, cd: 50, radius: 3, range: 9, windup: 0.15,
    impacts: 6, spanT: 3, teleT: 0.4, shake: 0.5,
    desc: 'Definitiva: 6 meteoros de luz caen en 3 s sobre la zona (cada uno avisa 0,4 s antes): 350 % del arma por impacto en 3 m, hasta 2100 % en el centro. Enfriamiento 50 s.' },
  { id: 'g_u_estandarte', name: 'Estandarte de Guerra', icon: '🚩', cat: 'ultimate', slots: ['k4'], tags: ['ultimate', 'aura', 'buff', 'ally', 'physical'], elem: 'physical',
    type: 'buff', behavior: 'g_u_estandarte', req: 15, cd: 55, dur: 12, radius: 8, buff: { dmgPct: 20, dr: 15 }, furyPerSec: 5,
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
// Player/Enemy (dealArea, enemiesInLine, nearestEnemy, clampWalkable, allies,
// addBuff, applyCC, cleanse, timers). Las habilidades conservan su `type` genérico
// como dato (pose de lanzamiento, objetivo melee del canal y banco de balance).
// ============================================================

// Sangre Fría: crítico extra contra ralentizados (espejo de combat-math.COLDBLOOD_CRIT;
// este módulo no puede importar combat-math)
const COLDBLOOD_CRIT = 100;
const coldCrit = (prof, e) => prof.critBonus + (prof.coldblood && e?.slowT > 0 ? COLDBLOOD_CRIT : 0);

// gana Furia (espejo de resources.gainResource: este módulo no puede importarlo).
// PEDIDO AL NÚCLEO: exponer g.gainResource(n) para los comportamientos.
export function gainFury(p, n) {
  if (!p || !(n > 0)) return 0;
  const before = p.mp || 0;
  p.mp = Math.min(p.stats?.maxMP || 0, before + n);
  p.furiaIdle = 0;
  return p.mp - before;
}

// emite un campo de FX (string = nombre de preset, objeto = preset) si existe
const emit = (g, preset, pos) => { if (preset) g.emitFx?.(preset, pos); };

// repite fn cada `every` s durante `dur` s por el planificador; fn(i) → false corta.
// Se programan todos los pulsos con instantes ABSOLUTOS (i·every) para que la
// duración no derive con el paso de la simulación (reprogramar desde el callback
// acumula el retraso de cada tick).
function repeatFor(g, dur, every, fn) {
  const n = Math.max(1, Math.round(dur / every));
  let stopped = false;
  for (let i = 1; i <= n; i++) {
    g.timers.schedule(i * every, () => {
      if (stopped) return;
      if (fn(i) === false) stopped = true;
    });
  }
}

// Debilita el daño SALIENTE de un enemigo (Provocación) durante `dur` s.
// Fallback: el núcleo no tiene modificador de daño saliente por enemigo, así que se
// sustituye su def por una copia con dmg × (1 − pct) (mismo patrón que el
// debilitamiento de los esbirros del Nigromante) y se deshace por el planificador.
// PEDIDO AL NÚCLEO: `e.outDmgMul` (o condDr por fuente) para no tocar e.def.
export function weakenEnemyDamage(g, e, id, pct, dur) {
  if (!e?.alive || !(pct > 0) || !(dur > 0) || !e.def) return;
  const w = e._outWeak || (e._outWeak = {});
  if (w[id]) g.timers.cancel(w[id].timer);            // refresco: misma reducción, temporizador nuevo
  else {
    const mul = Math.max(0.1, 1 - pct / 100);
    e.def = { ...e.def, dmg: e.def.dmg * mul };
    w[id] = { mul };
  }
  w[id].timer = g.timers.schedule(dur, () => {
    const cur = e._outWeak?.[id];
    if (!cur) return;
    delete e._outWeak[id];
    if (e.def) e.def = { ...e.def, dmg: e.def.dmg / cur.mul };
  });
}

export const GUERRERO_SKILL_BEHAVIORS = {
  // Mandoble: golpe melee único con cadencia ×1,5 (el canal pone atkCd = atkTime;
  // aquí se alarga). Sin objetivo a rango: golpe al vacío (no genera Furia).
  g_mandoble: {
    cast(g, p, prof, cast) {
      const { ctx, sk } = cast;
      const atk = p.stats?.atkTime || 1;
      if (!ctx.isEcho) p.atkCd = atk * (sk.cadence || MANDOBLE_CADENCE);
      const range = prof.range || sk.range || 2.4;
      let e = cast.enemy;
      if (!e?.alive || p.pos.distanceTo(e.pos) > range + 0.6) e = g.nearestEnemy?.(range + 0.6) || null;
      p.swing = 1;
      if (!e) { if (!ctx.isEcho) p.atkCd = atk * 0.6; return ctx.res; }
      p.faceToward(e.pos);
      const { dmg, crit } = p.rollDamage(ctx.coef, coldCrit(prof, e), prof.addPct, e, ctx.hitInfo);
      ctx.hit(e, e.takeDamage(dmg, crit, ctx.dmgOpts) || 0);
      if (prof.chain && e.alive) g.spawnChainBounce?.(e, Math.round(ctx.avgHit), prof.chain, [], 0xffbb44);
      p.onDealHit?.();
      if (crit) g.hitStop?.('heavy');
      g.spawnRing?.(e.pos.clone(), 1.1, 0xffcc66);
      emit(g, ctx.fx?.impact, e.pos.clone().setY(1.0));
      emit(g, ctx.fx?.extra, e.pos.clone().setY(0.2));
      return ctx.res;
    },
  },

  // Embate: barrido de área a tus pies con cadencia ×1,1
  g_embate: {
    cast(g, p, prof, cast) {
      const { ctx, sk } = cast;
      if (!ctx.isEcho) p.atkCd = (p.stats?.atkTime || 1) * (sk.cadence || EMBATE_CADENCE);
      p.swing = 1;
      const c = p.pos.clone();
      const rad = prof.radius || sk.radius || 2.5;
      g.spawnRing?.(c, rad, 0xffbb66);
      g.dealArea(c, rad, ctx.coef, ctx.areaOpts);
      ctx.zoneCenter = c; ctx.zoneRad = rad;
      emit(g, ctx.fx?.aura, c.clone().setY(ctx.fx?.auraY ?? 0.8));
      return ctx.res;
    },
  },

  // Embestida: el `dash` genérico + 12 de Furia SOLO si golpea (§3.1 «gen +12 si golpea»)
  g_embestida: {
    cast(g, p, prof, cast) {
      const { ctx, sk } = cast;
      const target = cast.target;
      p.faceToward(target);
      const dir = target.clone().sub(p.pos).setY(0);
      const dist = Math.min(dir.length(), prof.range || sk.range || 7);
      if (dist > 0.1) {
        dir.normalize();
        let traveled = 0;
        while (traveled < dist) {
          const step = Math.min(0.3, dist - traveled);
          const nx = p.pos.x + dir.x * step, nz = p.pos.z + dir.z * step;
          if (g.world?.grid && !g.world.grid.walkable(nx, nz)) break;
          p.pos.x = nx; p.pos.z = nz;
          traveled += step;
          if (ctx.fx?.trail && traveled % 0.6 < 0.3) emit(g, ctx.fx.trail, p.pos.clone().setY(0.9));
        }
      }
      const rad = prof.radius || sk.radius || 1.9;
      g.spawnRing?.(p.pos.clone(), rad, 0xffcc66);
      if (ctx.coef > 0) g.dealArea(p.pos.clone(), rad, ctx.coef, ctx.areaOpts);
      ctx.zoneCenter = p.pos.clone(); ctx.zoneRad = rad;
      if (prof.chain) { const ne = g.nearestEnemy?.(rad + 2); if (ne) g.spawnChainBounce?.(ne, Math.round(ctx.avgHit), prof.chain, [], 0xffcc66); }
      if (ctx.res.hits > 0 && !ctx.isEcho) gainFury(p, sk.genOnHit || 12);
      p.swing = 1;
      emit(g, ctx.fx?.impact, p.pos.clone().setY(0.7));
      return ctx.res;
    },
  },

  // Piel de Hierro: buff de reducción de daño + inmunidad a ralentizaciones.
  // Fallback de la inmunidad: purga la ralentización cada 0,1 s mientras dura el buff.
  // PEDIDO AL NÚCLEO: `p.slowImmuneT` respetado por quien ralentiza al jugador.
  g_piel: {
    cast(g, p, prof, cast) {
      const { ctx, sk } = cast;
      const dur = prof.dur || sk.dur || 6;
      p.addBuff(sk.id, { ...prof.buff }, dur, { name: sk.name, icon: sk.icon, desc: `−${prof.buff.dr || 0} % de daño recibido; inmune a ralentizaciones` });
      p.cleanse?.();
      repeatFor(g, dur, 0.1, () => {
        if (!p.alive || !p.buffs.some(b => b.id === sk.id)) return false;
        p.cleanse?.();
        return true;
      });
      g.spawnRing?.(p.pos.clone(), 1.4, ctx.color || 0xb8c4d0);
      emit(g, ctx.fx?.aura, p.pos.clone().setY(1.0));
      return ctx.res;
    },
  },

  // Provocación: provoca a UN enemigo a 15 m (Enemy.applyCC('taunt')), le baja el daño
  // que te hace (−15 %, ×potencia de buff) y da 15 de Furia. Sin objetivo no gasta el CD.
  g_provocacion: {
    cast(g, p, prof, cast) {
      const { ctx, sk } = cast;
      const range = prof.range || sk.range || 15;
      let e = cast.enemy;
      if (!e?.alive || p.pos.distanceTo(e.pos) > range + 0.5) e = g.nearestEnemy?.(range) || null;
      if (!e) {
        p.cds[sk.id] = 0;                                 // sin objetivo: no se pierde el enfriamiento
        g.ui?.message?.('Ningún enemigo al alcance');
        return ctx.res;
      }
      const dur = prof.dur || sk.dur || 4;
      p.faceToward(e.pos);
      if (e.applyCC?.('taunt', dur, { src: p })) ctx.res.hits = 1;
      weakenEnemyDamage(g, e, sk.id, Math.min(50, (sk.weakenPct || 15) * (prof.buffMul || 1)), dur);
      gainFury(p, sk.genOnUse || 15);
      g.spawnRing?.(e.pos.clone(), 1.2, ctx.color || 0xff5544);
      g.spawnRing?.(p.pos.clone(), 2, ctx.color || 0xff5544);
      emit(g, ctx.fx?.aura, p.pos.clone().setY(1.2));
      emit(g, ctx.fx?.impact, e.pos.clone().setY(1.6));
      return ctx.res;
    },
  },

  // Grito de Guerra: +30 de Furia al instante y buff de daño al grupo a 15 m
  g_grito: {
    cast(g, p, prof, cast) {
      const { ctx, sk } = cast;
      const meta = { name: sk.name, icon: sk.icon, desc: `+${prof.buff.dmgPct || 0} % de daño` };
      const targets = g.allies ? g.allies(p.pos, sk.allyRadius || 15) : [p];
      for (const a of targets) a.addBuff?.(sk.id, { ...prof.buff }, prof.dur || sk.dur || 8, meta);
      gainFury(p, sk.genOnUse || 30);
      g.spawnRing?.(p.pos.clone(), 2.5, ctx.color || 0xe08a2a);
      emit(g, ctx.fx?.aura, p.pos.clone().setY(1.0));
      emit(g, ctx.fx?.extra, p.pos.clone().setY(0.2));
      return ctx.res;
    },
  },

  // Furia Inmortal: +velocidad de ataque, imparable y gastadoras sin coste.
  // Fallback del «coste 0»: la Furia se mantiene al máximo mientras dura (el canal
  // cobra antes de saberlo). PEDIDO AL NÚCLEO: costMul por buff en resolveSkill.
  g_u_furia: {
    cast(g, p, prof, cast) {
      const { ctx, sk } = cast;
      const dur = prof.dur || sk.dur || 10;
      p.addBuff(sk.id, { ...prof.buff }, dur, { name: sk.name, icon: sk.icon, desc: 'Gastadoras sin coste, imparable, +velocidad de ataque' });
      p.unstoppableT = Math.max(p.unstoppableT || 0, dur);
      p.cleanse?.();
      p.mp = p.stats?.maxMP || p.mp;
      repeatFor(g, dur, 0.1, () => {
        if (!p.alive || !p.buffs.some(b => b.id === sk.id)) return false;
        p.mp = p.stats?.maxMP || p.mp;
        p.cleanse?.();
        return true;
      });
      g.addShake?.(0.3);
      emit(g, ctx.fx?.aura, p.pos.clone().setY(1.0));
      emit(g, ctx.fx?.extra, p.pos.clone().setY(0.2));
      return ctx.res;
    },
  },

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

  // Estandarte de Guerra: estandarte clavado a tus pies. Cada 0,5 s, los aliados a
  // 8 m reciben/renuevan el buff (+daño, −daño recibido) y 2,5 de Furia (5/s).
  // Fallback: el campo 'estandarte' (field-entities) es del Paso 2c; aquí se
  // simula con el planificador. PEDIDO AL NÚCLEO: defineField('estandarte').
  g_u_estandarte: {
    cast(g, p, prof, cast) {
      const { ctx, sk } = cast;
      const pos = p.pos.clone().setY(0);
      const rad = prof.radius || sk.radius || 8;
      const dur = prof.dur || sk.dur || 12;
      const meta = { name: sk.name, icon: sk.icon, desc: `+${prof.buff.dmgPct || 0} % de daño, −${prof.buff.dr || 0} % de daño recibido` };
      const every = 0.5;
      const pulse = () => {
        for (const a of (g.allies ? g.allies(pos, rad) : [p])) {
          const b = a.buffs?.find(x => x.id === sk.id);
          if (b) b.t = Math.max(b.t, every + 0.15);
          else a.addBuff?.(sk.id, { ...prof.buff }, every + 0.15, meta);
          if (a === p) gainFury(p, (sk.furyPerSec || 5) * every);
        }
      };
      pulse();
      let n = 0;
      repeatFor(g, dur, every, () => {
        pulse();
        if (++n % 2 === 0) g.spawnRing?.(pos, rad, ctx.color || 0xd8a040);
        return true;
      });
      g.spawnRing?.(pos, rad, ctx.color || 0xd8a040);
      emit(g, ctx.fx?.aura, pos.clone().setY(0.2));
      emit(g, ctx.fx?.extra, pos.clone().setY(1.6));
      ctx.res.hits = 0;
      return ctx.res;
    },
  },
};
