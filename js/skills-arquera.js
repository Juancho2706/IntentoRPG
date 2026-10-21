// ============================================================
// Catálogo de habilidades de la ARQUERA (Energía) — dueño: trabajador de la clase (2b.1)
// ============================================================
// Paso 2b.1: catálogo BASE de docs/paso2-diseno.md §3.3 (estados C/R/N; las de
// talento «T» llegan en el Paso 2c con su árbol). Energía (§2): pozo fijo de 60,
// regeneración plana de 6/s, los básicos generan +5 al ACERTAR y las gastadoras
// no tienen enfriamiento salvo la Lluvia de Flechas (4 s).
// Calendario §1.2: Nv1 Disparo · Nv2 Flecha Perforante (Gastadora A) · Nv3
// Disparo Disperso · Nv4 Paso Veloz · Nv6 Red de Caza · Nv8 Flecha Múltiple
// (Gastadora B) y Flecha de Cicuta · Nv12 Agilidad y Bomba de Humo · Nv14
// Lluvia de Flechas (Gastadora C) · Nv15 las 3 definitivas.
//
// Convención de `coef`: es el coeficiente POR IMPACTO que reciben
// rollDamage/dealArea (lo que tira el motor). Las habilidades de varios impactos
// declaran cuántos (`count` flechas, `waves` oleadas, `shots` disparos) y la
// descripción da el total de la tabla §3.3 (p. ej. Diluvio 8 × 2,5 = 20 WD).
// Las zonas (`Cerco de Zarzas`) usan coef = WD por segundo (como el tipo `zone`).
//
// Este archivo solo importa js/skill-defs.js (evita ciclos): los comportamientos
// usan los métodos de Game (g.dealArea, g.spawnProjectile, g.spawnField,
// g.applyDoT, g.clampWalkable, g.timers.schedule…) y las primitivas de Player/
// Enemy (addBuff, cleanse, applyCC, applyWeakness), nunca setTimeout.
// Paso 2b.2: Disparo Disperso y Flecha de Cicuta usan el tipo genérico `proj` (el
// núcleo da la Energía AL IMPACTAR; el Veneno de Cicuta es `hitDot`), Agilidad es un
// buff genérico con `slowImmune` y la Bomba de Humo una zona genérica con `allyDr` y
// `projMissPct` (el fallo de proyectiles enemigos lo resuelve Projectile). El Tiro
// Celestial dispara con g.fireProjectile. Números recalibrados con el banco.
import { dmgMods, buffMods, utilMods, O_RAD, O_PROJ, O_PROJ2, V_POISON, V_VULN, V_STUN, V_PIERCE,
  V_SLOW, V_EXEC, projFanOffset } from './skill-defs.js';

export const ARQUERA_SKILLS = [
  // — BÁSICOS (generan +5 de Energía al ACERTAR; cadencia 0,9 s, sin GCD) —
  { id: 'a_disparo', name: 'Disparo Rápido', icon: '🏹', cat: 'basic', slots: ['lmb'], tags: ['basic', 'proj', 'physical'], elem: 'physical',
    type: 'weapon', req: 1, coef: 1.0, gen: 5,
    desc: 'Dispara una flecha veloz (100 % del daño del arma). Al acertar recupera 5 de Energía.' },
  { id: 'a_disperso', name: 'Disparo Disperso', icon: '🎇', cat: 'basic', slots: ['lmb'], tags: ['basic', 'proj', 'area', 'physical'], elem: 'physical',
    type: 'proj', req: 3, coef: 0.45, gen: 5, count: 3, spread: 0.218, speed: 18, range: 9.5, size: 0.1, color: 0xe8d8a0,
    desc: 'Dispara 3 flechas en abanico de 25° (45 % del arma cada una). Al acertar recupera 5 de Energía.' },
  { id: 'a_cicuta', name: 'Flecha de Cicuta', icon: '🌿', cat: 'basic', slots: ['lmb'], tags: ['basic', 'proj', 'nature', 'dot'], elem: 'nature',
    type: 'proj', req: 8, coef: 0.7, gen: 5, hitDot: { kind: 'poison', coef: 0.5, dur: 4 }, speed: 17, range: 9.5, size: 0.1, color: 0x8fe05a,
    desc: 'Una flecha untada en cicuta: 70 % del arma al impactar y Veneno de 50 % más durante 4 s (se acumula). Al acertar recupera 5 de Energía.' },

  // — GASTADORAS (rmb o k2; sin enfriamiento salvo la Lluvia) —
  { id: 'flecha_perforante', name: 'Flecha Perforante', icon: '➶', cat: 'spender', slots: ['rmb', 'k2'], tags: ['spender', 'proj', 'physical'], elem: 'physical',
    type: 'proj', req: 2, coef: 2.4, cost: 26, cd: 0, speed: 17, range: 13, pierce: true, lockT: 0.35, color: 0xffffcc,
    desc: 'Una flecha pesada (240 % del arma) que atraviesa a todos los enemigos en su camino. 26 de Energía, sin enfriamiento.' },
  { id: 'flecha_multiple', name: 'Flecha Múltiple', icon: '🔱', cat: 'spender', slots: ['rmb', 'k2'], tags: ['spender', 'proj', 'area', 'physical'], elem: 'physical',
    type: 'proj', req: 8, coef: 0.39, cost: 22, cd: 0, speed: 15, range: 10, count: 5, spread: 0.436, lockT: 0.35, color: 0xccddaa,
    desc: 'Dispara 5 flechas en un abanico de 50° (39 % del arma cada una; ≈78 % a un objetivo pegado). 22 de Energía, sin enfriamiento.' },
  { id: 'lluvia_flechas', name: 'Lluvia de Flechas', icon: '🌧️', cat: 'spender', slots: ['rmb', 'k2'], tags: ['spender', 'area', 'physical'], elem: 'physical',
    behavior: 'a_lluvia', at: 'target', req: 14, coef: 0.6, waves: 4, span: 1.2, cost: 30, cd: 4, radius: 3, range: 11, impactDelay: 0.3, color: 0xaaffaa,
    desc: 'Tras 0,3 s de aviso, 4 oleadas de flechas caen en 1,5 s sobre un círculo de 3 m (60 % del arma cada una: 240 % en total). 30 de Energía, enfriamiento 4 s.' },

  // — MOVILIDAD (k1, fuera del GCD) —
  { id: 'a_paso', name: 'Paso Veloz', icon: '👣', cat: 'movement', slots: ['k1'], tags: ['movement', 'physical'], elem: 'physical',
    behavior: 'a_paso', req: 4, cd: 9, range: 6, rollT: 0.2, lockT: 0.2, dur: 3, buff: { aspdPct: 20 },
    desc: 'Ruedas 6 m en la dirección en que te mueves (o hacia el cursor) y ganas +20 % de velocidad de ataque durante 3 s. Enfriamiento 9 s.' },
  { id: 'agilidad', name: 'Agilidad', icon: '🌪️', cat: 'movement', slots: ['k1'], tags: ['movement', 'buff', 'physical'], elem: 'physical',
    type: 'buff', req: 12, cd: 16, dur: 6, buff: { spdPct: 30, aspdPct: 15 }, slowImmune: true,
    desc: 'Durante 6 s: +30 % de velocidad de movimiento, +15 % de velocidad de ataque e inmunidad a las ralentizaciones. Enfriamiento 16 s.' },

  // — DEFENSA / UTILIDAD (k2) —
  { id: 'a_red', name: 'Red de Caza', icon: '🕸️', cat: 'utility', slots: ['k2'], tags: ['utility', 'cc', 'physical'], elem: 'physical',
    behavior: 'a_red', at: 'target', req: 6, cost: 10, cd: 14, radius: 2.5, range: 9, root: 2.5, color: 0xd8c49a,
    desc: 'Lanzas una red a hasta 9 m que inmoviliza 2,5 s a todo lo que atrapa en 2,5 m (los jefes, menos tiempo). 10 de Energía, enfriamiento 14 s.' },
  { id: 'a_humo', name: 'Bomba de Humo', icon: '💨', cat: 'defense', slots: ['k2'], tags: ['defense', 'zone', 'physical'], elem: 'physical',
    type: 'zone', behavior: 'a_humo', at: 'self', req: 12, cd: 16, radius: 4, dur: 8, allyDr: 50, projMissPct: 50, blindPct: 30, color: 0x9aa0a8,
    desc: 'Una nube de humo de 4 m a tus pies durante 8 s: dentro recibes −50 % de daño, la mitad de los proyectiles enemigos que la cruzan se pierden y los enemigos dentro, cegados, hacen −30 % de daño. Enfriamiento 16 s.' },

  // — DEFINITIVAS (k4, sin coste; eliges una) —
  { id: 'a_u_diluvio', name: 'Diluvio de Saetas', icon: '🌠', cat: 'ultimate', slots: ['k4'], tags: ['ultimate', 'area', 'physical'], elem: 'physical',
    behavior: 'a_diluvio', at: 'target', req: 15, coef: 2.73, waves: 8, span: 3.6, cd: 50, radius: 5, range: 12, windup: 0.15, impactDelay: 0.4, shake: 0.18, color: 0xbfffbf,
    desc: 'Definitiva: tras una telegrafía, 8 oleadas de saetas arrasan un círculo de 5 m durante 4 s (273 % del arma cada una: 2184 % por objetivo). Enfriamiento 50 s.' },
  { id: 'a_u_celeste', name: 'Tiro Celestial', icon: '🌌', cat: 'ultimate', slots: ['k4'], tags: ['ultimate', 'proj', 'physical'], elem: 'physical',
    behavior: 'a_celeste', req: 15, coef: 7.0, shots: 3, window: 8, recastGap: 0.35, cd: 50, speed: 30, range: 16, pierce: true, beam: true, windup: 0.3, color: 0x9fd8ff,
    desc: 'Definitiva: hasta 3 haces celestes perforantes (700 % del arma cada uno) que disparas a voluntad pulsando otra vez la tecla durante 8 s; cada uno carga 0,3 s. Enfriamiento 50 s desde el primero.' },
  { id: 'a_u_zarzas', name: 'Cerco de Zarzas', icon: '🌵', cat: 'ultimate', slots: ['k4'], tags: ['ultimate', 'zone', 'cc', 'nature'], elem: 'nature',
    behavior: 'a_zarzas', at: 'self', req: 15, coef: 1.0, cd: 55, radius: 7, dur: 8, crossRoot: 1.5, weakPct: 15, color: 0x5a8a3a,
    desc: 'Definitiva: un anillo de zarzas de 7 m a tu alrededor durante 8 s. Quien lo cruza queda inmovilizado 1,5 s; dentro, los enemigos sufren Veneno (100 % del arma por segundo: 800 % en total) y reciben +15 % de daño (Debilidad). Enfriamiento 55 s.' },
];

// Ramas (3 × 3). Las habilidades que se conservan mantienen sus ids de rama
// (<id>_o/_f/_v · buffs <id>_o/_d/_f) para que la migración v3 no las pierda (§3.4).
export const ARQUERA_SKILL_MODS = {
  // básicos (Transformación ligera)
  a_disparo:         dmgMods('a_disparo', O_PROJ, V_POISON, V_VULN, V_PIERCE),
  a_disperso:        dmgMods('a_disperso', O_PROJ, V_POISON, V_VULN, V_PIERCE),
  a_cicuta:          dmgMods('a_cicuta', O_PROJ, V_VULN, V_SLOW, V_PIERCE),
  // gastadoras
  flecha_perforante: dmgMods('flecha_perforante', O_PROJ, V_PIERCE, V_POISON, V_VULN),
  flecha_multiple:   dmgMods('flecha_multiple', O_PROJ2, V_POISON, V_VULN, V_STUN),
  lluvia_flechas:    dmgMods('lluvia_flechas', O_RAD, V_POISON, V_VULN, V_STUN),
  // movilidad (Agilidad conserva sus ramas de buff por la migración)
  a_paso:            utilMods('a_paso'),
  agilidad:          buffMods('agilidad'),
  // defensa / utilidad
  a_red:             utilMods('a_red'),
  a_humo:            utilMods('a_humo'),
  // definitivas
  a_u_diluvio:       dmgMods('a_u_diluvio', O_RAD, V_POISON, V_VULN, V_STUN),
  a_u_celeste:       dmgMods('a_u_celeste', O_PROJ, V_VULN, V_STUN, V_EXEC),
  a_u_zarzas:        dmgMods('a_u_zarzas', O_RAD, V_VULN, V_SLOW, V_EXEC),
};

// ------------------------------------------------------------
// utilidades de los comportamientos (solo métodos de Game / primitivas)
// ------------------------------------------------------------
const inCircle = (pos, c, r) => {
  const dx = pos.x - c.x, dz = pos.z - c.z;
  return dx * dx + dz * dz <= r * r;
};

// Volea de flechas (Tiro Celestial): g.fireProjectile del núcleo (crítico + Sangre
// Fría, robo de vida, Encadenado y ctx.hit) con el haz y el abanico propios.
function volley(g, p, prof, cast, { size = 0.1 } = {}) {
  const { ctx, sk } = cast;
  const tgt = cast.target || p.pos.clone();
  p.faceToward(tgt);
  p.swing = 1;
  const n = Math.max(1, (prof.count || 1) + (prof.proj || 0));
  const base = Math.atan2(tgt.x - p.pos.x, tgt.z - p.pos.z);
  const spread = prof.spread || 0;
  const range = prof.range || sk.range || 10;
  const color = ctx.color || sk.color || 0xe8d8a0;
  const muzzle = p.pos.clone().setY(1.0);
  muzzle.x += Math.sin(base) * 0.5; muzzle.z += Math.cos(base) * 0.5;
  if (ctx.fx?.aura) g.emitFx?.(ctx.fx.aura, muzzle);
  else if (ctx.fx?.trail) g.emitFx?.(ctx.fx.trail, muzzle);
  const castHits = n > 1 && (sk.count || 1) <= 1 ? new Set() : null;   // sin escopetazo
  for (let i = 0; i < n; i++)
    g.fireProjectile(ctx, { angle: base + projFanOffset(i, n, spread), size, color, castHits });
  if (sk.beam) {
    const end = p.pos.clone().setY(1.0);
    end.x += Math.sin(base) * range; end.z += Math.cos(base) * range;
    g.spawnBeam?.(muzzle, end, color, 0.3);
  }
  ctx.lifestealDone = true; // el robo de vida de los proyectiles va por impacto
  return ctx.res;
}

// Lluvia por oleadas sobre un punto: aviso de `impactDelay` s y `waves` impactos
// repartidos en `span` s (cada uno tira el daño por objetivo con dealArea).
function rain(g, p, prof, cast) {
  const { ctx, sk } = cast;
  const center = (cast.target || p.pos).clone(); center.y = 0;
  const rad = prof.radius || sk.radius || 3;
  const waves = Math.max(1, sk.waves || 1);
  const step = waves > 1 ? (sk.span || 1) / (waves - 1) : 0;
  const color = ctx.color || sk.color || 0xaaffaa;
  p.faceToward(center);
  g.spawnRing?.(center, rad, color);                         // telegrafía
  if (ctx.fx?.trail) g.emitFx?.(ctx.fx.trail, center.clone().setY(4.5));
  ctx.zoneCenter = center; ctx.zoneRad = rad;
  let left = waves;
  const wave = () => {
    g.dealArea(center, rad, ctx.coef, ctx.areaOpts);
    if (ctx.fx?.impact) g.emitFx?.(ctx.fx.impact, center.clone().setY(0.3));
    if (ctx.fx?.aura) g.emitFx?.(ctx.fx.aura, center.clone().setY(0.3));
    if (ctx.fx?.extra) g.emitFx?.(ctx.fx.extra, center.clone().setY(0.1));
    g.addShake?.(sk.shake || 0.1);
    if (--left > 0) g.timers.schedule(step, wave);
    else cast.done(ctx.res);
  };
  g.timers.schedule(Math.max(0.01, prof.impactDelay || 0.01), wave);
  return undefined; // diferido: termina con la última oleada
}

// estado de las recargas del Tiro Celestial (por héroe; volátil, no se guarda)
const CELESTE = new WeakMap();

// Comportamientos a medida (solo cuando ningún tipo genérico sirve): la habilidad
// declara `behavior: 'id'` y aquí va { cast(g, p, prof, cast) → CastResult|undefined }.
// Los registra js/powers.js al cargar (defineSkillBehavior).
export const ARQUERA_SKILL_BEHAVIORS = {
  // Lluvia de Flechas: 4 oleadas en 1,5 s tras 0,3 s de aviso
  a_lluvia: {
    name: 'Lluvia de Flechas',
    cast(g, p, prof, cast) { return rain(g, p, prof, cast); },
  },

  // Diluvio de Saetas: 8 oleadas en 4 s (telegrafía de 0,4 s)
  a_diluvio: {
    name: 'Diluvio de Saetas',
    cast(g, p, prof, cast) { return rain(g, p, prof, cast); },
  },

  // Bomba de Humo (Paso 2e): la zona genérica (−allyDr % de daño a quien está dentro y
  // proyectiles enemigos que se pierden) + CEGUERA: los enemigos dentro del humo hacen
  // −blindPct % de daño (outWeak). Sin la ceguera, a Nv50 el humo topaba en el −50 % de
  // reducción y la Francotiradora perdía la mitad de su vida en 9 s contra una manada.
  a_humo: {
    name: 'Bomba de Humo',
    cast(g, p, prof, cast) {
      const { ctx, sk } = cast;
      const pos = p.pos.clone(); pos.y = 0;
      const radius = prof.radius || sk.radius || 4, dur = prof.dur || sk.dur || 6;
      g.spawnField?.('zona', { pos, radius, dur, owner: p,
        data: { dps: 0, color: ctx.color, skill: sk.id, tags: prof.tags,
          allyDr: sk.allyDr ? Math.round(sk.allyDr * (prof.buffMul || 1)) : 0, projMissPct: sk.projMissPct || 0 } });
      g.spawnField?.('a_humo_ciego', { pos: pos.clone(), radius, dur, owner: p, data: { pct: sk.blindPct || 0 } });
      ctx.zoneCenter = pos; ctx.zoneRad = radius;
      g.spawnRing?.(pos, radius, ctx.color || 0x9aa0a8);
      if (ctx.fx?.aura) g.emitFx?.(ctx.fx.aura, pos.clone().setY(0.6));
      return ctx.res;
    },
  },

  // Paso Veloz: rueda 6 m en la dirección de movimiento (o hacia el cursor) en
  // 0,2 s y da +20 % de velocidad de ataque 3 s
  a_paso: {
    name: 'Paso Veloz',
    cast(g, p, prof, cast) {
      const { ctx, sk } = cast;
      const inp = g.input || {};
      const d = inp.keyDir;
      let dx, dz;
      if (d && Math.hypot(d.x, d.z) > 1e-3) { const l = Math.hypot(d.x, d.z); dx = d.x / l; dz = d.z / l; }
      else {
        const t = cast.target || p.pos;
        dx = t.x - p.pos.x; dz = t.z - p.pos.z;
        const l = Math.hypot(dx, dz);
        if (l < 0.05) { dx = Math.sin(p.group.rotation.y); dz = Math.cos(p.group.rotation.y); } else { dx /= l; dz /= l; }
      }
      const dist = prof.range || sk.range || 6;
      const want = p.pos.clone(); want.x += dx * dist; want.z += dz * dist; want.y = 0;
      const dest = g.clampWalkable(p.pos, want, dist);
      const from = p.pos.clone();
      p.faceToward(dest);
      p.addBuff(sk.id, { ...prof.buff }, prof.dur || 3, { name: sk.name, icon: sk.icon, desc: `+${prof.buff.aspdPct || 0}% de velocidad de ataque` });
      const steps = 6, dt = (sk.rollT || 0.2) / steps;
      let i = 0;
      const step = () => {
        if (!p.alive) { cast.done(ctx.res); return; }
        i++;
        const k = i / steps;
        p.pos.x = from.x + (dest.x - from.x) * k;
        p.pos.z = from.z + (dest.z - from.z) * k;
        if (ctx.fx?.trail && i % 2) g.emitFx?.(ctx.fx.trail, p.pos.clone().setY(0.4));
        if (i < steps) { g.timers.schedule(dt, step); return; }
        ctx.zoneCenter = p.pos.clone(); ctx.zoneRad = 2;          // Variante «Estela»
        if (ctx.fx?.impact) g.emitFx?.(ctx.fx.impact, p.pos.clone().setY(0.3));
        cast.done(ctx.res);
      };
      g.timers.schedule(dt, step);
      return undefined;
    },
  },

  // Red de Caza: vuela hasta el punto (≤ 9 m) e inmoviliza 2 s en 2,5 m
  // (Enemy.applyCC con rendimientos decrecientes; jefes ×0,35). El +15 de
  // stagger en jefes llega con la barra de aturdimiento (Paso 2c).
  a_red: {
    name: 'Red de Caza',
    cast(g, p, prof, cast) {
      const { ctx, sk } = cast;
      const at = (cast.target || p.pos).clone(); at.y = 0;
      const rad = prof.radius || sk.radius || 2.5;
      const color = ctx.color || sk.color || 0xd8c49a;
      const flight = Math.max(0.05, Math.min(0.35, p.pos.distanceTo(at) / 26));
      p.faceToward(at);
      p.swing = 1;
      g.spawnBeam?.(p.pos.clone().setY(1.0), at.clone().setY(0.5), color, flight + 0.1);
      if (ctx.fx?.trail) g.emitFx?.(ctx.fx.trail, p.pos.clone().setY(1.0));
      g.timers.schedule(flight, () => {
        const root = (prof.root || sk.root || 2) * (prof.durMul || 1);
        for (const e of g.enemies || []) {
          if (!e.alive) continue;
          if (!inCircle(e.pos, at, rad + 0.5 * (e.def?.scale || 1))) continue;
          e.applyCC?.('root', root, { src: p });
          ctx.res.hits++;
        }
        ctx.zoneCenter = at; ctx.zoneRad = rad;
        g.spawnRing?.(at, rad, color);
        if (ctx.fx?.impact) g.emitFx?.(ctx.fx.impact, at.clone().setY(0.4));
        g.sfx?.('trap');
        cast.done(ctx.res);
      });
      return undefined;
    },
  },

  // Tiro Celestial: 3 disparos perforantes reutilizando la tecla en 8 s. El
  // núcleo pone el enfriamiento completo al lanzar; aquí se deja una pausa corta
  // entre disparos y, tras el último (o al caducar la ventana), el enfriamiento
  // restante cuenta desde el PRIMER disparo.
  a_celeste: {
    name: 'Tiro Celestial',
    cast(g, p, prof, cast) {
      const { sk } = cast;
      const now = p.simT || 0;
      const shots = sk.shots || 3, win = sk.window || 8;
      let st = CELESTE.get(p);
      if (!st || st.left <= 0 || now > st.until) {
        st = { left: shots, start: now, until: now + win, id: (st?.id || 0) + 1 };
        CELESTE.set(p, st);
        const myId = st.id;
        g.timers.schedule(win, () => {
          const s = CELESTE.get(p);
          if (!s || s.id !== myId || s.left <= 0) return;
          s.left = 0;                                              // ventana agotada
          p.cds[sk.id] = Math.max(p.cds[sk.id] || 0, prof.cd - win);
          p.cdMax[sk.id] = prof.cd;
        });
      }
      st.left--;
      const res = volley(g, p, prof, cast, { size: 0.18 });
      g.addShake?.(0.15);
      if (st.left > 0) { p.cds[sk.id] = sk.recastGap || 0.35; p.cdMax[sk.id] = sk.recastGap || 0.35; }
      else { p.cds[sk.id] = Math.max(0, prof.cd - (now - st.start)); p.cdMax[sk.id] = prof.cd; }
      return res;
    },
  },

  // Cerco de Zarzas: anillo r 7 durante 8 s centrado en ti. Cruzarlo (en
  // cualquier sentido) inmoviliza 1,5 s; dentro, Veneno 1 WD/s (campo `zona`)
  // y Debilidad +15 % (applyWeakness, se refresca).
  a_zarzas: {
    name: 'Cerco de Zarzas',
    cast(g, p, prof, cast) {
      const { ctx, sk } = cast;
      const c = p.pos.clone(); c.y = 0;
      const rad = prof.radius || sk.radius || 7;
      const dur = prof.dur || sk.dur || 8;
      const root = (sk.crossRoot || 1.5) * (prof.durMul || 1);
      const weak = sk.weakPct || 15;
      g.spawnField?.('zona', { pos: c, radius: rad, dur, owner: p,
        data: { dps: ctx.avgHit, interval: 0.5, color: sk.color || 0x5a8a3a, skill: sk.id, tags: prof.tags } });
      g.spawnRing?.(c, rad, sk.color || 0x5a8a3a);
      if (ctx.fx?.aura) g.emitFx?.(ctx.fx.aura, c.clone().setY(0.3));
      ctx.zoneCenter = c; ctx.zoneRad = rad;
      const state = new Map();
      for (const e of g.enemies || []) if (e.alive) state.set(e, inCircle(e.pos, c, rad));
      let t = 0;
      const TICK = 0.1;
      const tick = () => {
        for (const e of g.enemies || []) {
          if (!e.alive) { state.delete(e); continue; }
          const now = inCircle(e.pos, c, rad);
          const was = state.get(e);
          if (was !== undefined && was !== now) {
            e.applyCC?.('root', root, { src: p });
            ctx.hit(e, 0);                                         // efectos de rama (Quebrantar, Tullir…)
            if (ctx.fx?.impact) g.emitFx?.(ctx.fx.impact, e.pos.clone().setY(0.5));
          }
          state.set(e, now);
          if (now && e.alive) e.applyWeakness?.(sk.id, weak, 0.3);
        }
        t += TICK;
        if (t < dur - 1e-6) g.timers.schedule(TICK, tick);
        else cast.done(ctx.res);
      };
      g.timers.schedule(TICK, tick);
      return undefined;
    },
  },
};

// ------------------------------------------------------------
// Paso 2 (2f + 2g) · stubs de contrato (E0.6; docs/paso2-implementacion.md §3.5, D3, D6 y D24).
// data.js ya los fusiona (SKILL_FORGE, SPEC_BAR, FORGE_RECO, FALLBACK_BAR, CATALOG_V). Los llena
// KA-arquera en E2: KA1 → SPEC_BAR, FALLBACK_BAR y CATALOG_V = 2; KA2 → SKILL_FORGE y FORGE_RECO.
// ------------------------------------------------------------
// skillId → { mejora: { name, icon, line, mod }, vars: [{ id: '<id>_i', name, role, icon, line, … }, { id: '<id>_ii', … }] }
export const ARQUERA_SKILL_FORGE = {};
// specId → { bar: { lmb, rmb, k1, k2, k3, k4 }, sel }   (barra por especialización, D6)
export const ARQUERA_SPEC_BAR = {};
// specId → { skillId: 'i' | 'ii' }                      (forja recomendada, D3)
export const ARQUERA_FORGE_RECO = {};
// { lmb, rmb, k1, k2, k3, k4 } | null                   (barra de reserva de la migración, §3.11)
export const ARQUERA_FALLBACK_BAR = null;
// 1 = catálogo v4 (el de hoy) · 2 = catálogo 2g (lo sube KA1)
export const ARQUERA_CATALOG_V = 1;
