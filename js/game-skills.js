// ============================================================
// CANAL DE LANZAMIENTO de habilidades (mixin de Game) — Paso 2b.0 · Paso 2 (verbos)
// ============================================================
// docs/paso2-diseno.md §4.4 y §9.1. Un solo canal para todas las habilidades:
//   castSkillSlot(slot) → resolveSkill (definición FORJADA en prof.def) → gating (CD/cargas
//   · GCD 0,2 s · bloqueo · coste) → ⑦ onCast (puede cancelar sin coste) → windup
//   (cancelable con la esquiva: NO cobra el coste) o CARGA (se suelta) → commit (cobra
//   coste, pone CD o gasta una carga) → efecto (comportamiento registrado o TIPO GENÉRICO)
//   → impacto (inmediato o con impactDelay sincronizado con el VFX) → ⑦ afterCast.
// Tipos genéricos: melee · proj · area · cone · line · leap · dash · blink · shield
//   · taunt · zone · trap · mark · channel · buff · aura · combo · stance · wall
//   (+ 'weapon' = Player.basicAttack).
// Las canalizaciones tic a tic van por el planificador (js/timers.js) y se
// interrumpen con la esquiva, al soltar la tecla o con un golpe > 10 % de la vida.
// Primitivas para poderes (§9.1.4): onPlayerHit ⑤, dealProcDamage, heal, shield,
// allies. Sin setTimeout (lo vigila test59). Se inyecta en Game.prototype.
// Paso 2b.2 — API para comportamientos de clase:
//   g.gainResource(p, n, opts?)       recurso de clase (Furia/Maná/Energía); ⑪ onResource
//   g.fireProjectile(ctx, opts)       un proyectil del perfil (opts.coef, opts.from: Paso 2)
//   g.startChannel(ctx, done, opts)   canalización por tics (soltar/esquivar/golpe la cortan)
// Paso 2c.2 — núcleo de la integración de talentos: g.heal/g.shield con pos/dr, damageAlly ⑫,
//   API de DoT (dotsOf, hasDoT, dotRemaining, consumeDoT, replaceDoT, ⑬ onDotEnd), killStatus.
// Paso 2 (2f + 2g; docs/paso2-implementacion.md §3.5–§3.7) — VERBOS:
//   cargar y soltar (g._charging, g.releaseSkillSlot, ventana perfecta), relanzar
//   (p.skState[id].recast), combo de 3, secuencia del básico, canal ampliado (moveMul,
//   autoShot, drainPerSec, hold:'toggle', endReason, g.extendChannel), posturas
//   (g.stanceOf, g.setStanceBoth), cargas de enfriamiento (p.skCharges), g.reduceCooldown
//   (ÚNICA vía para restar enfriamiento), g.chooseForge, g.cancelHeld, marcas que se detonan,
//   desplazar (pull/knock/drag), réplicas, estelas, saltar a tu campo, pulsos, ⑭ onSkillEnd.
//   Repeticiones (cast.echo > 0): no consumen cargas ni relanzamientos, no avanzan combo ni
//   secuencia, una carga repetida sale con frac = 1, y una repetición no genera otra (tope 3).
//   Los SONIDOS de los verbos (D26) se emiten aquí, en el instante del borde.
// Cola W2d (parte A, punto 17 del plan): g.castEcho (repetición con su propia serie, at y
//   origin), g.startCooldown, g.channelInfo, g.extendMark; tics de canal a instantes fijos;
//   principal instantánea sobre el canal de una definitiva imparable; detonar al final del
//   vuelo; encadenado que nace en el origen y lleva la habilidad; velocidad de habilidades.
import * as THREE from 'three';
import { resolveSkill, isKnown, fitsSlot, GCD, cooldownWithMassacre, forgeState, forgedDef, validSupports } from './skill-resolve.js';
import { projFanOffset, forgeVar, VERB_DEFAULTS, supportFits } from './skill-defs.js';
import { FIELD_DEFS } from './field-entities.js';
import { firePower, dealProcDamage as powerProcDamage, SKILL_BEHAVIORS } from './powers.js';
import { applyHitEffects, weaponBasicOf } from './entities.js';
import { canAfford, spendResource, gainResource, drainResource } from './resources.js';
import { COLDBLOOD_CRIT, threatFromHeal, chargeRelease, rankCoef } from './combat-math.js';
import { applyDoTInstance, dotsOf, dotRemaining, consumeDoTs, replaceDoTInstance, dotKindOf } from './timers.js';
import { SUPPORTS } from './data.js';
import { SKILL_FX_PRESETS, skillFxFor } from './fx-skills.js';
import { gainGauge } from './spec-mechanics.js';

const SLOT_ACTION = { k1: 'skill1', k2: 'skill2', k3: 'skill3', k4: 'skill4' };
// tipos que NO salen sobre el canal de una definitiva (Doble Grieta): moverían o cortarían el canal
const OVER_CHANNEL_TYPES_NO = new Set(['channel', 'leap', 'dash', 'blink', 'stance', 'weapon']);
const DOT_COLORS = { poison: 0x7cff6a, burn: 0xff7722, bleed: 0xff4466 };
const fxp = x => (typeof x === 'string' ? (SKILL_FX_PRESETS[x] || x) : x);
const v3 = (x, z, y = 0) => new THREE.Vector3(x, y, z);
// reloj de pared (ms) para medir la suelta entre ticks; el arnés lo sustituye por el de simulación
const wallNow = g => (typeof g.clockNow === 'function' ? g.clockNow() : (typeof performance !== 'undefined' ? performance.now() : Date.now()));
// estado volátil de los verbos de una habilidad (§3.7)
const skStateOf = (p, id) => ((p.skState || (p.skState = {}))[id] || (p.skState[id] = {}));
// ¿una habilidad (por los tags e id de un golpe) encaja en un selector de detonación?
// '@all' · '@<cat>' (basic|spender|movement|defense|utility|ultimate; @insignia = spec) ·
// '@tag:<tag>' · '@<elem>' · '<skillId>'
function matchSel(sel, hit) {
  if (!sel || !hit) return false;
  if (Array.isArray(sel)) return sel.some(s => matchSel(s, hit));
  if (sel === '@all') return true;
  const tags = hit.tags instanceof Set ? hit.tags : new Set(hit.tags || []);
  if (sel.startsWith('@tag:')) return tags.has(sel.slice(5));
  if (sel === '@insignia') return tags.has('spec');
  if (sel[0] === '@') return tags.has(sel.slice(1)) || hit.elem === sel.slice(1);
  return hit.skill === sel;
}
// de dónde SALE un lanzamiento: el héroe o, en una repetición con `origin` (g.castEcho), ese
// punto (la Nova de Ventisca Viva sale del centro de la Tormenta)
function srcPos(ctx) {
  return ctx.origin ? v3(ctx.origin.x, ctx.origin.z) : ctx.p.pos.clone().setY(0);
}
// jefe (jefe de zona, über o de mundo): pull.boss:false no lo atrae
const isBossEnemy = e => !!(e?.def?.boss || e?.def?.uber || e?.def?.worldBoss);
// centro de una habilidad de área/zona según `at`: 'self' (de donde sale) · 'enemy' (sobre el
// enemigo de la mira, o la mira si no hay) · 'target' / por defecto (la mira, acotada al alcance)
function castCenter(ctx) {
  const at = ctx.sk.at;
  if (at === 'self') return srcPos(ctx);
  if (at === 'enemy' && ctx.enemy?.alive) return ctx.enemy.pos.clone().setY(0);
  return ctx.target.clone().setY(0);
}
// dirección de la mira desde el héroe (o desde `from`; su frente si la mira está encima)
function aimDir(p, target, from = null) {
  const dir = target.clone().sub(from || p.pos).setY(0);
  if (dir.lengthSq() < 1e-6) dir.set(Math.sin(p.group.rotation.y), 0, Math.cos(p.group.rotation.y));
  return dir.normalize();
}

// ------------------------------------------------------------
// TIPOS GENÉRICOS: (g, ctx, done) → CastResult | undefined (si es diferido, llaman
// a done(res) al impactar). ctx = { p, sk (definición forjada o del paso), prof, key, target,
// enemy, coef, isEcho, hitInfo, color, fx, avgHit, res:{hits,dealt,killed}, hit(e, dealt),
// dmgOpts (con perfect/step/echo), areaOpts, cast }
// ------------------------------------------------------------
const GENERIC = {
  melee(g, ctx) {
    const { p, prof } = ctx;
    const range = prof.range || ctx.sk.range || 2.2;
    const e = ctx.enemy;
    if (!e || !e.alive || p.pos.distanceTo(e.pos) > range + 0.6) return ctx.res; // golpe al vacío
    p.faceToward(e.pos);
    p.swing = 1;
    const cb = prof.critBonus + (prof.coldblood && e.slowT > 0 ? COLDBLOOD_CRIT : 0);
    const { dmg, crit } = p.rollDamage(ctx.coef, cb, prof.addPct + (prof.dmgDirect || 0), e, ctx.hitInfo);
    ctx.hit(e, e.takeDamage(dmg, crit, ctx.dmgOpts) || 0);
    if (prof.chain && e.alive) g.spawnChainBounce(e, Math.round(ctx.avgHit), prof.chain, [], 0xffbb44, prof.chainPct, ctx);
    p.onDealHit();
    if (crit && prof.windup > 0) g.hitStop?.('heavy');   // golpe pesado (Mandoble)
    g.spawnRing?.(e.pos, 0.8, 0xffbb44);
    g.emitFx(fxp(ctx.fx?.impact), e.pos.clone().setY(1.0));
    if (ctx.fx?.extra) g.emitFx(fxp(ctx.fx.extra), e.pos.clone().setY(0.1));
    ctx.zoneCenter = e.pos.clone().setY(0); ctx.zoneRad = 1.5;
    return ctx.res;
  },

  // área: `at` self/target/enemy; impacts + scatter (varios impactos repartidos en un anillo
  // alrededor del centro, sin azar: Lluvia de Meteoritos)
  area(g, ctx, done) {
    const { p, prof, sk, fx } = ctx;
    const atTarget = sk.at !== 'self';
    const center = castCenter(ctx);
    const rad = prof.radius || 2;
    if (atTarget) p.faceToward(center); else p.swing = 1;
    const n = Math.max(1, Math.floor(sk.impacts || 1));
    const scatter = n > 1 ? Math.max(0, sk.scatter || rad) : 0;
    const base = Math.atan2(center.x - p.pos.x, center.z - p.pos.z);
    const centers = [];
    for (let i = 0; i < n; i++) {
      if (n === 1) { centers.push(center); break; }
      const a = base + i * Math.PI * 2 / n;
      centers.push(center.clone().add(v3(Math.sin(a) * scatter * 0.6, Math.cos(a) * scatter * 0.6)));
    }
    for (const c of centers) g.spawnRing?.(c, rad, ctx.color || 0xff6633);
    const impact = () => {
      for (const c0 of centers) {
        const c = atTarget ? c0 : (ctx.followSelf ? p.pos.clone() : c0);
        g.dealArea(c, rad, ctx.coef, { ...ctx.areaOpts, from: c });
        const y = fx?.auraY ?? 1.0;
        if (fx?.impact) g.emitFx(fxp(fx.impact), c.clone().setY(0.3));
        if (fx?.aura) g.emitFx(fxp(fx.aura), c.clone().setY(atTarget ? 0.3 : y));
        if (fx?.extra) g.emitFx(fxp(fx.extra), c.clone().setY(atTarget ? 0.1 : 0.5));
        ctx.zoneCenter = c; ctx.zoneRad = rad;
      }
      if (atTarget) g.addShake?.(sk.shake || 0.25);
      return done(ctx.res);
    };
    if (prof.impactDelay > 0) {
      // el daño llega CON el VFX: bola que cae y aterriza en impactDelay s
      if (atTarget && g.fxGroup) {
        try {
          for (const c of centers) {
            const ball = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), new THREE.MeshBasicMaterial({ color: ctx.color || 0xff6633 }));
            ball.position.copy(c).setY(5);
            g.fxGroup.add(ball);
            g.fx.push({ mesh: ball, t: 0, dur: prof.impactDelay, fall: c.clone() });
          }
        } catch { /* sin GL */ }
      }
      if (fx?.trail) g.emitFx(fxp(fx.trail), center.clone().setY(4.5));
      g.timers.schedule(prof.impactDelay, impact);
      return undefined; // diferido
    }
    return impact();
  },

  cone(g, ctx) {
    const { p, prof } = ctx;
    const o = ctx.origin ? srcPos(ctx) : p.pos;
    const dir = aimDir(p, ctx.target, o);
    p.faceToward(p.pos.clone().add(dir));
    p.swing = 1;
    const list = g.enemiesInCone(o, dir, prof.radius || 3, prof.angle || 90);
    for (const e of list) {
      const cb = prof.critBonus + (prof.coldblood && e.slowT > 0 ? COLDBLOOD_CRIT : 0);
      const { dmg, crit } = p.rollDamage(ctx.coef, cb, prof.addPct, e, ctx.hitInfo);
      ctx.hit(e, e.takeDamage(dmg, crit, ctx.dmgOpts) || 0);
    }
    if (list.length) p.onDealHit();
    const front = o.clone().addScaledVector(dir, (prof.radius || 3) * 0.6);
    ctx.zoneCenter = front; ctx.zoneRad = (prof.radius || 3) * 0.6;
    g.spawnRing?.(front, (prof.radius || 3) * 0.6, ctx.color || 0xffaa55);
    if (ctx.fx?.impact) g.emitFx(fxp(ctx.fx.impact), front.clone().setY(1.0));
    if (ctx.fx?.aura) g.emitFx(fxp(ctx.fx.aura), p.pos.clone().setY(1.0));
    return ctx.res;
  },

  line(g, ctx) {
    const { p, prof, sk } = ctx;
    const o = ctx.origin ? srcPos(ctx) : p.pos;
    const dir = aimDir(p, ctx.target, o);
    p.faceToward(p.pos.clone().add(dir));
    const len = prof.range || sk.length || 8;
    const list = g.enemiesInLine(o, dir, len, prof.width || 2);
    for (const e of list) {
      const { dmg, crit } = p.rollDamage(ctx.coef, prof.critBonus, prof.addPct, e, ctx.hitInfo);
      ctx.hit(e, e.takeDamage(dmg, crit, ctx.dmgOpts) || 0);
    }
    if (list.length) p.onDealHit();
    // Encadenado desde el primero de la línea (Rayo en Cadena: chain + chainPct)
    if (prof.chain && list.length) {
      const first = list.reduce((a, b) => (a.pos.distanceToSquared(o) <= b.pos.distanceToSquared(o) ? a : b));
      g.spawnChainBounce(first, Math.round(ctx.avgHit), prof.chain, list, ctx.color || 0x66ddff, prof.chainPct, ctx);
    }
    const mid = o.clone().addScaledVector(dir, len / 2);
    ctx.zoneCenter = mid; ctx.zoneRad = Math.max(1.5, (prof.width || 2));
    g.spawnBeam?.(o, o.clone().addScaledVector(dir, len), ctx.color || 0xd8c49a, 0.25);
    if (ctx.fx?.impact) g.emitFx(fxp(ctx.fx.impact), mid.clone().setY(0.3));
    return ctx.res;
  },

  // Proyectiles: el daño se tira AL IMPACTAR y el lanzamiento TERMINA al impactar
  // (básicos: con el primer impacto, así el recurso llega solo si aciertas; resto:
  // cuando todos resolvieron) o, si fallan o perforan, al agotar su alcance.
  // Paso 2: perTarget (hasta N proyectiles del lanzamiento al mismo enemigo), carga completa
  // con charge.full (otra cuenta/abanico), secuencia del básico (seq) y detonate al impactar
  // y al final del alcance (cola W2d: Flecha Detonante a tus trampas sin nadie encima).
  proj(g, ctx, done) {
    const { p, prof, sk, fx } = ctx;
    p.faceToward(ctx.target);
    p.swing = 1;
    const full = ctx.chargeFull || null;
    let count = full?.count || (prof.count + (prof.proj || 0));
    const spread = full?.spread ?? prof.spread;
    const from0 = ctx.origin ? srcPos(ctx) : p.pos.clone().setY(0);
    const baseAngle = Math.atan2(ctx.target.x - from0.x, ctx.target.z - from0.z);
    const muzzle = from0.clone().setY(1.0).add(v3(Math.sin(baseAngle) * 0.5, Math.cos(baseAngle) * 0.5));
    if (fx?.trail) g.emitFx(fxp(fx.trail), muzzle);
    else if (fx?.aura && !(prof.splash > 0)) g.emitFx(fxp(fx.aura), muzzle);
    const finish = () => done(ctx.res);
    const firstHit = ctx.isBasic && !ctx.isEcho;
    // sin escopetazo: si la habilidad dispara 1 proyectil de base, los extra
    // (Multiproyectil, Doble, Vendaval) no repiten impacto en el mismo enemigo;
    // perTarget > 1 (Andanada Cerrada) deja que hasta N del lanzamiento den al mismo
    const castHits = prof.perTarget > 1 ? new Map() : (count > 1 && (sk.count || 1) <= 1 ? new Set() : null);
    const extra = ctx.seqNth ? (sk.seq?.extra || null) : null;
    let pending = count + (extra ? Math.max(1, extra.count || 1) : 0);
    const shots = [];
    for (let i = 0; i < count; i++) shots.push({ angle: baseAngle + projFanOffset(i, count, spread), coef: null, pierce: undefined });
    if (extra) {
      const n = Math.max(1, extra.count || 1), half = Math.ceil(n / 2);
      for (let i = 0; i < n; i++) shots.push({ angle: baseAngle + (i % 2 ? -1 : 1) * Math.ceil((i + 1) / 2) * (extra.spread || 0.26) / half, coef: ctx.coef * (extra.coef ?? 1), pierce: extra.pierce });
    }
    const range = prof.range || sk.range || 10;
    const flight = range / Math.max(1, prof.speed || 14) + 0.05;
    // detonar (prof.detonate: coef ya escalado con el rango) al impactar y, si nadie lo para,
    // donde acaba su vuelo (el final del alcance o la pared)
    const det = prof.detonate || null;
    for (const s of shots) {
      let resolved = false, stopped = false;
      const pierces = s.pierce ?? prof.pierce;
      g.fireProjectile(ctx, {
        angle: s.angle, castHits, perTarget: prof.perTarget, coef: s.coef ?? undefined, pierce: s.pierce,
        onImpact: (e) => {
          if (e && det) g.detonateAt(p, e.pos, det, { skill: sk.id });
          if (e && !pierces) stopped = true;
          if (firstHit) { finish(); return; }
          if (!prof.pierce && !resolved) { resolved = true; if (--pending <= 0) finish(); }
        },
      });
      if (det) {
        const end = g.clampWalkable(from0, from0.clone().add(v3(Math.sin(s.angle) * range, Math.cos(s.angle) * range)), range);
        g.timers.schedule(flight, () => { if (!stopped && p.alive) g.detonateAt(p, end, det, { skill: sk.id }); });
      }
    }
    void count;
    if (sk.beam) g.spawnBeam?.(muzzle, ctx.target.clone().setY(1.0), ctx.color || 0xffee66);
    ctx.lifestealDone = true; // el robo de los proyectiles va por impacto
    g.timers.schedule(flight, finish);
    return undefined; // diferido: termina al impactar (o al agotar el alcance)
  },

  // salto: `at:'ownField'` (a tu campo más cercano a la mira), estela (`trail`), `plant`
  // (al caer cuentas como plantado) y `detonate` al caer. El vuelo, más corto con skillSpeed
  leap(g, ctx, done) {
    const { p, prof, sk } = ctx;
    const from = p.pos.clone();
    const to = ctx.fieldDest ? ctx.fieldDest.clone() : g.clampWalkable(p.pos, ctx.target, ctx.destRange || prof.range || sk.range || 8);
    p.faceToward(to);
    p.leap = {
      from: p.pos.clone(), to, t: 0, dur: (sk.airT || prof.impactDelay || 0.45) / (prof.skillSpeed || 1), plant: !!sk.plant,
      onLand: () => {
        const rad = prof.radius || 3;
        g.spawnRing?.(p.pos, rad, ctx.color || 0xffcc66);
        if (ctx.coef > 0) g.dealArea(p.pos.clone(), rad, ctx.coef, { ...ctx.areaOpts, from: p.pos.clone() });
        ctx.zoneCenter = p.pos.clone(); ctx.zoneRad = rad;
        g._arrive(ctx, from);
        if (ctx.fx?.impact) g.emitFx(fxp(ctx.fx.impact), p.pos.clone().setY(0.7));
        g.addShake?.(sk.shake || 0.35);
        done(ctx.res);
      },
    };
    return undefined; // diferido: impacta al caer
  },

  // avance: instantáneo (como hoy) o LENTO con dashT (Carga de Escudo: 8 m en 1 s, imparable;
  // más corto con skillSpeed); `drag` arrastra a los que encuentra (dragWidth m a cada lado) y
  // los junta dentro del golpe de llegada, `trail` deja un campo en línea, `plant`, `detonate`
  // y `taunt` al llegar
  dash(g, ctx, done) {
    const { p, prof, sk } = ctx;
    const from = p.pos.clone();
    let dest = ctx.fieldDest ? ctx.fieldDest.clone() : null;
    if (!dest) {
      const dir = ctx.target.clone().sub(p.pos).setY(0);
      const dist = Math.min(dir.length(), ctx.destRange || prof.range || sk.range || 7);
      dest = dist > 0.1 ? p.pos.clone().addScaledVector(dir.normalize(), dist) : p.pos.clone();
    }
    p.faceToward(dest);
    const dragged = new Set();
    const arrive = () => {
      const rad = prof.radius || 1.9;
      // los arrastrados que quedaron fuera del golpe de llegada (un dragWidth ancho) se juntan
      for (const e of dragged) {
        if (!e.alive) continue;
        const ex = e.pos.x - p.pos.x, ez = e.pos.z - p.pos.z, d = Math.hypot(ex, ez), keep = rad * 0.8;
        if (d <= keep || d < 1e-6) continue;
        const nx = p.pos.x + ex / d * keep, nz = p.pos.z + ez / d * keep;
        if (!g.world?.grid || g.world.grid.walkable(nx, nz)) { e.pos.x = nx; e.pos.z = nz; }
      }
      g.spawnRing?.(p.pos, rad, 0xffcc66);
      if (ctx.coef > 0) g.dealArea(p.pos.clone(), rad, ctx.coef, { ...ctx.areaOpts, from: p.pos.clone() });
      ctx.zoneCenter = p.pos.clone(); ctx.zoneRad = rad;
      if (prof.chain) { const ne = g.nearestEnemy(rad + 2); if (ne) g.spawnChainBounce(ne, Math.round(ctx.avgHit), prof.chain, [], 0xffcc66, prof.chainPct, ctx); }
      p.swing = 1;
      g._arrive(ctx, from);
      if (ctx.fx?.impact) g.emitFx(fxp(ctx.fx.impact), p.pos.clone().setY(0.7));
    };
    const dragW = prof.dragWidth || 0;
    // un paso del avance: mueve al héroe y a los arrastrados
    const stepTo = (nx, nz) => {
      const dx = nx - p.pos.x, dz = nz - p.pos.z;
      if (!g.world?.grid?.walkable(nx, nz)) return false;
      p.pos.x = nx; p.pos.z = nz;
      if (dragW > 0) {
        for (const e of g.enemies || []) {
          if (!e.alive || e.def?.boss || e.def?.uber || e.def?.worldBoss) continue;
          const ex = e.pos.x - p.pos.x, ez = e.pos.z - p.pos.z;
          if (dragged.has(e) || ex * ex + ez * ez <= (dragW + 0.6) * (dragW + 0.6)) {
            dragged.add(e);
            if (!g.world?.grid || g.world.grid.walkable(e.pos.x + dx, e.pos.z + dz)) { e.pos.x += dx; e.pos.z += dz; }
          }
        }
      }
      return true;
    };
    const total = from.distanceTo(dest);
    const dirN = total > 1e-4 ? dest.clone().sub(from).setY(0).normalize() : v3(0, 0);
    const dashT = (sk.dashT || 0) / (prof.skillSpeed || 1);
    if (dashT > 0 && total > 0.1) {
      // avance lento por frames (Player.update mueve; imparable mientras dura)
      p.castLock = Math.max(p.castLock || 0, dashT + 0.05);
      if (sk.unstoppable) p.unstoppableT = Math.max(p.unstoppableT || 0, dashT + 0.1);
      let traveled = 0;
      p.dashMove = {
        dur: dashT, t: 0,
        step: (dt) => {
          const want = Math.min(total - traveled, total * dt / dashT);
          if (want <= 0) return true;
          const ok = stepTo(p.pos.x + dirN.x * want, p.pos.z + dirN.z * want);
          traveled += want;
          if (ctx.fx?.trail && Math.random() < 0.3) g.emitFx(fxp(ctx.fx.trail), v3(p.pos.x, p.pos.z, 0.9));
          return !ok || traveled >= total - 1e-4;
        },
        onArrive: () => { arrive(); done(ctx.res); },
      };
      return undefined;   // diferido: impacta al llegar
    }
    let traveled = 0;
    while (traveled < total) {
      const step = Math.min(0.3, total - traveled);
      if (!stepTo(p.pos.x + dirN.x * step, p.pos.z + dirN.z * step)) break;
      traveled += step;
      if (ctx.fx?.trail && traveled % 0.6 < 0.3) g.emitFx(fxp(ctx.fx.trail), v3(p.pos.x, p.pos.z, 0.9));
    }
    arrive();
    return ctx.res;
  },

  blink(g, ctx) {
    const { p, prof, sk } = ctx;
    const from = p.pos.clone();
    const to = ctx.fieldDest ? ctx.fieldDest.clone() : g.clampWalkable(p.pos, ctx.target, ctx.destRange || prof.range || sk.range || 8);
    g.spawnRing?.(p.pos, 1.0, ctx.color || 0x99aaff);
    p.pos.x = to.x; p.pos.z = to.z;
    g.spawnRing?.(p.pos, 1.2, ctx.color || 0x99aaff);
    if (ctx.fx?.impact) g.emitFx(fxp(ctx.fx.impact), p.pos.clone().setY(1.0));
    ctx.zoneCenter = p.pos.clone(); ctx.zoneRad = 2;
    g._arrive(ctx, from);
    return ctx.res;
  },

  shield(g, ctx) {
    const { p, prof, sk } = ctx;
    const amt = (sk.shieldPct || 20) / 100 * p.stats.maxHP * prof.buffMul;
    g.shield(amt, { target: sk.tags?.includes('ally') ? 'all' : 'self', dur: prof.dur || 6, src: sk.id });
    g.spawnRing?.(p.pos, 1.4, ctx.color || 0x88ccff);
    if (ctx.fx?.aura) g.emitFx(fxp(ctx.fx.aura), p.pos.clone().setY(1.0));
    return ctx.res;
  },

  // Provocación: con radio, a todos en él; sin radio, a UN enemigo (el de la mira o
  // el más cercano a `range`). sk.weakenPct: ese enemigo te hace −X % (× potencia)
  // mientras dura (Enemy.weakenOutgoing). Sin objetivo: no gasta el enfriamiento.
  taunt(g, ctx) {
    const { p, prof, sk } = ctx;
    const dur = prof.dur || 4;
    let list;
    if (prof.radius > 0) list = (g.enemies || []).filter(e => e.alive && e.pos.distanceTo(p.pos) <= prof.radius);
    else {
      const range = prof.range || 15;
      let e = ctx.enemy;
      if (!e?.alive || e.pos.distanceTo(p.pos) > range + 0.5) e = g.nearestEnemy?.(range) || null;
      list = e ? [e] : [];
    }
    if (!list.length && !ctx.isEcho) {
      g.reduceCooldown(p, sk.id, Infinity);
      g.ui?.message?.('Ningún enemigo al alcance');
      return ctx.res;
    }
    const weak = sk.weakenPct ? Math.min(90, sk.weakenPct * (prof.buffMul || 1)) : 0;
    for (const e of list) {
      if (e.applyCC('taunt', dur, { src: p })) ctx.res.hits++;
      if (weak > 0) e.weakenOutgoing?.(sk.id, weak, dur);
      if (list.length === 1) g.spawnRing?.(e.pos, 1.2, ctx.color || 0xff5544);
      if (ctx.fx?.impact) g.emitFx(fxp(ctx.fx.impact), e.pos.clone().setY(1.6));
    }
    if (list.length === 1) p.faceToward(list[0].pos);
    g.spawnRing?.(p.pos, prof.radius || 2, ctx.color || 0xff5544);
    if (ctx.fx?.aura) g.emitFx(fxp(ctx.fx.aura), p.pos.clone().setY(1.0));
    return ctx.res;
  },

  // zona: `at` self/target/enemy, `follow` ('owner'|'aim'), `contain` (no se puede salir:
  // Jaula de Espinas), healPct (% de vida/s a los aliados dentro) y tope zoneMax por habilidad
  zone(g, ctx) {
    const { p, prof, sk } = ctx;
    const pos = castCenter(ctx);
    // coef de una zona = WD por segundo · allyDr/projMissPct: defensa de los aliados dentro
    g.spawnField('zona', { pos, radius: prof.radius || 3, dur: prof.dur || 4, owner: p, follow: sk.follow || null,
      maxPerSkill: prof.zoneMax || 0,
      data: { dps: ctx.coef > 0 ? ctx.avgHit : 0, slow: prof.slow, slowPct: prof.slowPct, color: ctx.color, skill: sk.id, tags: prof.tags,
        allyDr: sk.allyDr ? Math.round(sk.allyDr * (prof.buffMul || 1)) : 0, projMissPct: sk.projMissPct || 0,
        contain: !!sk.contain, healPct: (sk.healPct || 0) + (prof.mods?.zoneHeal || 0) } });
    ctx.zoneCenter = pos; ctx.zoneRad = prof.radius || 3;
    g.spawnRing?.(pos, prof.radius || 3, ctx.color || 0x9aa0a8);
    if (ctx.fx?.aura) g.emitFx(fxp(ctx.fx.aura), pos.clone().setY(0.6));
    if (ctx.fx?.extra) g.emitFx(fxp(ctx.fx.extra), pos.clone().setY(0.3));
    return ctx.res;
  },

  // TRAMPA (§3.6): se ARMA en trap.armT s, salta con el primer enemigo dentro de su radio
  // (inmoviliza `root`, daña el golpe del perfil y, con `burst`, estalla en área), se consume
  // (trap.consume, por defecto sí) y puede ATRAER (trap.lure) mientras está armada.
  // Tope trap.maxArmed (y zoneMax) por habilidad: al pasarlo cae la más vieja.
  trap(g, ctx) {
    const { p, prof, sk } = ctx;
    const t = sk.trap || {};
    const pos = ctx.target.clone().setY(0);
    const f = g.spawnField('trampa', { pos, radius: t.radius || prof.radius || 1.5, dur: prof.dur || sk.life || VERB_DEFAULTS.trapLife, owner: p,
      maxPerSkill: Math.max(t.maxArmed || 0, prof.zoneMax || 0),
      // burst va en crudo (de la definición); rank, para que el estallido escale con el rango
      // (× rankCoef(rank), lo aplica field-entities una vez); coef y hitDot ya llevan el rango
      data: { dmg: ctx.avgHit, coef: ctx.coef, root: Math.max(t.root || 0, prof.root || 0), color: ctx.color, skill: sk.id, tags: prof.tags, elem: prof.elem,
        armT: t.armT ?? VERB_DEFAULTS.trapArmT, burst: t.burst || null, consume: t.consume !== false,
        lure: t.lure || null, hitDot: prof.hitDot, rank: prof.rank } });
    if (f) { ctx.zoneCenter = pos; ctx.zoneRad = f.radius; }
    return ctx.res;
  },

  mark(g, ctx) {
    const { prof, sk } = ctx;
    const e = ctx.enemy;
    if (!e || !e.alive) return ctx.res;
    const dur = prof.mark?.dur || prof.dur || 8;
    const m = prof.mark || { id: sk.id, dur };
    g.applyMark(e, { ...prof, mark: { ...m, dur } }, ctx.p);
    if (sk.weakPct && !m.weakPct) e.applyWeakness(sk.id, sk.weakPct, dur);
    g.spawnRing?.(e.pos, 1.0, ctx.color || 0xcc88ff);
    ctx.res.hits = 1;
    return ctx.res;
  },

  // Canalización genérica (g.startChannel): cada tic golpea a un objetivo
  // PEGAJOSO (el mismo enemigo mientras siga vivo y a rango) o un área si la
  // habilidad tiene radio. Si declara `behavior` con tick (sin cast), ese tick
  // SUSTITUYE al golpe por defecto: type:'channel' + behavior conviven.
  // Paso 2: con autoShot, el tic solo dispara (Carrera del Viento) · pull por tic (Ciclón: con
  // pull.radius, a otro radio que el del daño) · slowImmune mientras dura (Giro Firme)
  channel(g, ctx, done) {
    const { p, prof, sk } = ctx;
    const beh = sk.behavior ? SKILL_BEHAVIORS[sk.behavior] : null;
    if (ctx.fx?.aura) g.emitFx(fxp(ctx.fx.aura), p.pos.clone().setY(1.0));
    const auto = sk.autoShot || null;
    const defaultTick = (inst, interval) => {
      if (auto) return;
      if (prof.radius > 0) { g.dealArea(sk.at === 'self' || !sk.at ? p.pos.clone() : ctx.target.clone(), prof.radius, ctx.coef, { ...ctx.areaOpts, from: p.pos.clone() }); return; }
      const range = Math.max(2, prof.range || 8);
      let e = inst.target;
      if (!e || !e.alive || e.pos.distanceTo(p.pos) > range + 1) e = inst.target = g.nearestEnemy(range, ctx.target) || g.nearestEnemy(range) || null;
      if (!e) return;
      p.faceToward(e.pos);
      const cb = prof.critBonus + (prof.coldblood && e.slowT > 0 ? COLDBLOOD_CRIT : 0);
      const { dmg, crit } = p.rollDamage(ctx.coef, cb, prof.addPct, e, ctx.hitInfo);
      ctx.hit(e, e.takeDamage(dmg, crit, ctx.dmgOpts) || 0);
      p.onDealHit();
      g.spawnBeam?.(p.pos, e.pos, ctx.color || 0xcc88ff, interval);
      if (ctx.fx?.impact) g.emitFx(fxp(ctx.fx.impact), e.pos.clone().setY(1.0));
      if (ctx.fx?.tickSfx) g.sfx?.(ctx.fx.tickSfx);
    };
    return g.startChannel(ctx, done, {
      dur: sk.channelT || prof.dur || 2,
      ticks: sk.ticks,
      unstoppable: prof.unstoppable,
      slowImmune: prof.slowImmune,
      hold: sk.hold,
      endless: !!sk.endless,
      autoShot: auto,
      drainPerSec: sk.drainPerSec || 0,
      moveMul: prof.moveMul,
      onTick: beh?.tick ? (inst, interval) => beh.tick(g, p, inst, interval) : defaultTick,
      onEnd: beh?.end ? (inst, end) => beh.end(g, p, inst, end) : null,
    });
  },

  // buff: a ti (o a los aliados con tag 'ally'); `pulse` (provoca o golpea cada `every` s
  // mientras dura: Ciudadela). minHpPct/endHealPct del buff NO escalan con el rango.
  buff(g, ctx) {
    const { p, prof, sk } = ctx;
    const meta = { name: sk.name, icon: sk.icon, desc: sk.desc };
    const targets = prof.tags.has('ally') ? g.allies(p.pos, sk.allyRadius || 15) : [p];
    const stats = { ...prof.buff };
    for (const k of ['minHpPct', 'endHealPct']) if (sk.buff?.[k] != null) stats[k] = sk.buff[k];
    for (const a of targets) {
      a.addBuff?.(sk.id, { ...stats }, prof.dur, meta);
      if (prof.slowImmune) a.grantSlowImmune?.(prof.dur);           // Agilidad, Piel de Hierro
      if (prof.unstoppable) a.unstoppableT = Math.max(a.unstoppableT || 0, prof.dur);
    }
    if (sk.pulse) g._startPulses(ctx, () => p.pos, () => !!p.buffs?.some(b => b.id === sk.id && b.t > 0));
    g.spawnRing?.(p.pos, 1.4, ctx.color || 0x66ddff);
    if (ctx.fx?.aura) g.emitFx(fxp(ctx.fx.aura), p.pos.clone().setY(1.0));
    if (ctx.fx?.extra) g.emitFx(fxp(ctx.fx.extra), p.pos.clone().setY(0.2));
    return ctx.res;
  },

  // AURA en el suelo (Estandarte de Guerra): campo 'aura' a tus pies; cada 0,5 s
  // renueva el buff a los aliados en el radio y da resPerSec de recurso al dueño dentro.
  // Paso 2: `follow` y `pulse` (pulsos desde el centro del aura)
  aura(g, ctx) {
    const { p, prof, sk } = ctx;
    const pos = (sk.at === 'target' ? ctx.target : p.pos).clone().setY(0);
    const rad = prof.radius || 8;
    const f = g.spawnField('aura', { pos, radius: rad, dur: prof.dur || 10, owner: p, follow: sk.follow || null,
      data: { buff: { ...prof.buff }, buffId: sk.id, meta: { name: sk.name, icon: sk.icon, desc: sk.desc },
        resPerSec: (sk.resPerSec || 0) * (prof.buffMul || 1), color: ctx.color || sk.color || 0xd8a040 } });
    if (f) { try { FIELD_DEFS.aura.tick(g, f, 0); } catch { /* primer pulso: buff al instante */ } }
    if (f && sk.pulse) g._startPulses(ctx, () => v3(f.pos.x, f.pos.z), () => !f.dead);
    ctx.zoneCenter = pos; ctx.zoneRad = rad;
    g.spawnRing?.(pos, rad, ctx.color || 0xd8a040);
    if (ctx.fx?.aura) g.emitFx(fxp(ctx.fx.aura), pos.clone().setY(0.2));
    if (ctx.fx?.extra) g.emitFx(fxp(ctx.fx.extra), pos.clone().setY(1.6));
    return ctx.res;
  },

  // COMBO DE 3 (§3.6): cada pulsación ejecuta el paso que toca (ctx.comboIdx) con su propio
  // tipo y geometría; coef del paso = × el del perfil
  combo(g, ctx, done) {
    const fn = GENERIC[ctx.sk.type];
    if (!fn || ctx.sk.type === 'combo') return ctx.res;
    return fn(g, ctx, done);
  },

  // MURO (§3.6): campo en LÍNEA perpendicular a la mira, centrado donde apuntas; bloquea el
  // paso (blocks: no a jefes; 'all' también a jefes) o encierra (contain). Uno por habilidad.
  wall(g, ctx) {
    const { p, prof, sk } = ctx;
    const w = sk.wall || {};
    const center = castCenter(ctx);
    const dir = aimDir(p, center);
    const perp = v3(-dir.z, dir.x);
    const len = (w.len || 6) * (prof.radiusMul || 1);
    const a = center.clone().addScaledVector(perp, -len / 2), b = center.clone().addScaledVector(perp, len / 2);
    g.spawnField('muro', { pos: center, radius: len / 2, dur: prof.dur || 3, owner: p, shape: 'line', a, b, width: w.width || 1,
      maxPerSkill: Math.max(1, prof.zoneMax || 0),
      data: { blocks: w.blocks ?? true, contain: !!w.contain, dps: ctx.coef > 0 ? ctx.avgHit : 0, slow: prof.slow, slowPct: prof.slowPct,
        color: ctx.color || 0xaad8ff, skill: sk.id, tags: prof.tags } });
    ctx.zoneCenter = center; ctx.zoneRad = Math.max(1.5, len / 2);
    g.spawnRing?.(center, 1.2, ctx.color || 0xaad8ff);
    return ctx.res;
  },
};
export const GENERIC_SKILL_TYPES = Object.keys(GENERIC);
// estado del objetivo para el KillInfo de ⑥ (main.js lo construye igual; el arnés de
// tests lo usa tal cual): DoT por tipo con dotsOf (claves `<fuente>:<tipo>`)
export function killStatus(e) {
  const has = k => dotsOf(e, k).length > 0;
  return { frozen: (e?.frozenT || 0) > 0, bleeding: has('bleed'), burning: has('burn'), poisoned: has('poison'),
    slowed: (e?.slowT || 0) > 0, rooted: (e?.rootT || 0) > 0, prey: !!e?.prey,
    weakened: (e?.weaknessPct?.() || 0) > 0 || (e?.vulnT || 0) > 0 };
}
// ¿tiene con qué lanzarse? (comportamiento registrado con cast o tipo genérico). Las
// activas de talento cuyo comportamiento aún no existe (2c.1) no se lanzan ni cobran.
export function skillCastable(sk) {
  if (!sk) return false;
  if (sk.type === 'weapon' || sk.type === 'stance') return true;   // la postura tiene su flujo (_castStance)
  const b = sk.behavior ? SKILL_BEHAVIORS[sk.behavior] : null;
  return !!(b?.cast || GENERIC[sk.type]);
}

// núcleo del lanzamiento (ranura o repetición): gating, ⑦ onCast, carga, preparación y commit.
// Función del módulo (no del mixin): se llama con castSkillCore.call(g, …). → false, true o el
// CastInfo del lanzamiento que arrancó
function castSkillCore(p, sk, key, { echoMult = 0, series = null, at = null, origin = null } = {}) {
  const isEcho = echoMult > 0;
  const prof = resolveSkill(p, sk);
  const def = prof.def || sk;
  // ---- §3.6.1: una CARGA en curso bloquea las demás ranuras, salvo la movilidad (la
  // cancela sin coste) y una postura con swapGcd 0 (se alterna sin cortarla) ----
  if (!isEcho && this._charging) {
    const c = this._charging;
    if (c.key === key) {
      if (c.toggle) this.releaseSkillSlot(key, { force: true });   // 2.ª pulsación en modo toggle: suelta
      return false;
    }
    if (def.cat === 'movement') this._endCharge('cancel');
    else if (!(def.type === 'stance' && (def.stance?.swapGcd ?? 0) === 0)) return false;
  }
  // canal enganchado (toggle): la 2.ª pulsación de su ranura lo suelta
  if (!isEcho && this._channel?.toggle && this._channel.ctx.key === key) { this._endChannel(this._channel, true, 'release'); return false; }
  // tras una suelta AUTOMÁTICA hay que soltar el botón antes de volver a cargar
  if (!isEcho && this._needsRelease?.[key]) return false;
  // repeticiones: como mucho echoCap por lanzamiento original (una repetición no genera otra);
  // g.castEcho trae su propia serie
  const sst = skStateOf(p, sk.id);
  if (isEcho) {
    const ec = series || sst.echo || (sst.echo = { seq: -1, n: 0 });
    if ((ec.n || 0) >= VERB_DEFAULTS.echoCap) return false;
    ec.n = (ec.n || 0) + 1;
  }
  if (def.type === 'weapon' && !prof.charge) { if (!isEcho) this.castBasic(); return !isEcho; }
  // activa de talento sin comportamiento todavía (Paso 2c.1): no se lanza ni cobra
  if (!skillCastable(def)) {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (!isEcho && (!this._noCastAt || now - this._noCastAt > 1500)) { this.ui?.message?.(`${sk.name}: aún no disponible`); this._noCastAt = now; }
    return false;
  }
  const isBasic = def.cat === 'basic';
  // ventana de RELANZAR abierta (§3.6): sin coste (free) ni enfriamiento propio; separación `gap`
  const rcState = !isEcho && prof.recast && sst.recast?.left > 0 ? sst.recast : null;
  const stanceSwapFree = def.type === 'stance' && (def.stance?.swapGcd ?? 0) === 0;
  const stanceEnding = def.type === 'stance' && (def.stance?.modes?.length || 0) === 1 && sst.stance?.mode != null && def.stance?.recastEnds !== false;
  // una principal puede CANCELAR el windup de un básico en curso (el remate del
  // Mandoble), como en D4: la principal tiene prioridad sobre el básico
  const yieldBasic = !isEcho && !isBasic && !!this._windup?.ctx?.isBasic;
  // Doble Grieta (a21): durante el canal de una DEFINITIVA imparable sale una principal
  // INSTANTÁNEA (sin preparación ni carga) sin cortarlo. Lo demás sigue esperando al canal
  const overUlt = !isEcho && overUltChannel.call(this, prof, def, key);
  if (!isEcho) {
    const locked = ((p.castLock > 0 && !overUlt) || this._windup) && !yieldBasic;
    if ((locked && !stanceSwapFree) || p.leap || p.dashMove || (this._channel && !overUlt)) return false;   // bloqueo en curso
    if (isBasic) {
      if (p.atkCd > 0) return false;
      // bloqueo de ACCIÓN compartido: mientras una principal prepara, bloquea o
      // vuela hacia su impacto, el básico no sale (queda a la espera con el
      // botón mantenido); y si hay una principal pedida y lista, cede el turno
      if (p.actionLockT > 0 || this._spenderWaiting()) return false;
    } else if (rcState) {
      if ((p.simT || 0) - (rcState.lastAt || 0) < rcState.gap - 1e-9) return false;
    } else if (!stanceEnding && !this._skillReady(p, sk)) return false;
    // una sola acción por frame: si el básico acaba de salir en ESTE instante, la
    // principal sale en el siguiente (16 ms; el básico no la retrasa más que eso)
    if (!isBasic && p.basicAt != null && p.basicAt === p.simT) return false;
    if (prof.gcd && p.gcdT > 0 && !stanceSwapFree && !rcState) return false;          // GCD 0,2 s
    const free = (rcState && prof.recast.free) || stanceEnding;
    if (!free && !canAfford(p, prof.cost)) {
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      if (!this._noResAt || now - this._noResAt > 700) { this.ui?.message?.(`${p.cls.resource?.name || 'Recurso'} insuficiente`); this._noResAt = now; }
      return false;
    }
  }
  // POSTURA (§3.6): su propio flujo (cambiar de modo, acabar, Guardia Total)
  if (def.type === 'stance') return this._castStance(p, sk, prof, key, isEcho);
  const { target, near } = this.skillTarget(p, prof, at, origin);
  // SALTAR A TU CAMPO (at:'ownField'): sin campo de ese tipo a tu alcance no se lanza (sin
  // coste), salvo fallbackRange (salto normal de esa distancia)
  let fieldDest = null, destRange = 0;
  if (def.at === 'ownField' && (def.type === 'leap' || def.type === 'blink' || def.type === 'dash')) {
    const f = this.nearestOwnField(p, target, { kind: def.fieldKind, from: p.pos, maxDist: prof.range || def.range || 15 });
    if (f) fieldDest = v3(f.pos.x, f.pos.z);
    else if (def.fallbackRange > 0) destRange = def.fallbackRange;
    else {
      if (!isEcho) this.ui?.message?.('Ningún campo tuyo a tu alcance');
      return false;
    }
  }
  if (prof.type === 'melee' && !prof.behavior && (!near || p.pos.distanceTo(near.pos) > (prof.range || 2.2) + 0.6)) {
    // básico cuerpo a cuerpo sin objetivo: golpe al vacío (no genera recurso)
    if (isBasic && !isEcho) {
      if (this.input?.mouseWorld) p.faceToward(this.input.mouseWorld);
      p.atkCd = p.stats.atkTime * 0.6; p.swing = 1;
      return false;
    }
    // con el clic mantenido no spamear el aviso cada frame
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (!isEcho && (!this._noTgtAt || now - this._noTgtAt > 900)) { this.ui?.message?.('Ningún enemigo al alcance'); this._noTgtAt = now; }
    return false;
  }
  // COMBO: paso que toca (el 1.º si caducó la ventana); una repetición usa el actual sin avanzar
  let comboIdx = -1;
  if (def.type === 'combo' && Array.isArray(def.steps) && def.steps.length) {
    const cs = sst.combo || (sst.combo = { idx: 0, until: 0 });
    if ((p.simT || 0) > cs.until) cs.idx = 0;
    comboIdx = Math.min(cs.idx, def.steps.length - 1);
  }
  // sobre el canal de una definitiva, tampoco un paso de combo con preparación
  if (overUlt && comboIdx >= 0 && (def.steps[comboIdx]?.windup || 0) > 0) return false;
  // SECUENCIA (no arma; la de arma la cuenta Player.basicAttack)
  const seq = !isEcho && def.seq && def.type !== 'weapon' ? this.seqAdvance(p, sk) : null;
  // CastInfo.sk = definición FORJADA (los poderes y los comportamientos leen la forma real)
  const cast = { sk: def, prof, slot: key, target, enemy: near };
  if (rcState) cast.recast = { idx: rcState.idx + 1, left: rcState.left - 1, perfect: rcState.perfectLast > 0 && rcState.until - (p.simT || 0) <= rcState.perfectLast + 1e-9 };
  if (comboIdx >= 0) cast.step = comboIdx + 1;
  if (seq) { cast.seqNth = seq.nth; cast.seqIdx = seq.idx; }
  if (isEcho) cast.echo = echoMult;
  // ⑦ onCast (cancelado sin coste); el básico de arma tensable lo pasa al disparar (basicAttack)
  if (!isEcho && def.type !== 'weapon' && firePower('onCast', p, this, p, cast) === false) return false;
  if (yieldBasic) this.cancelCast('principal');                                     // corta el remate del básico
  const ctx = this._makeCtx(p, sk, prof, key, cast, { target, near, isEcho, echoMult, comboIdx, fieldDest, destRange, rcState, origin });
  // CARGAR Y SOLTAR (§3.6): empieza la carga (el coste y el enfriamiento, al soltar).
  // Una repetición sale a carga completa (frac = 1) sin esperar.
  if (prof.charge) {
    if (isEcho || prof.charge.instant || cast.instant) return this._releaseWith(ctx, prof.charge.max, 'auto', { instant: true }) && cast;
    return this._beginCharge(ctx) && cast;
  }
  // bloqueo de acción para el básico: preparación + max(bloqueo, impacto diferido,
  // vuelo del proyectil hasta la mira), nunca menos que el GCD
  if (!isEcho && !isBasic && prof.gcd) {
    const flight = prof.tags.has('proj') ? Math.min(prof.range || 10, p.pos.distanceTo(target)) / Math.max(1, prof.speed || 14) : 0;
    p.actionLockT = Math.max(p.actionLockT || 0, GCD, (ctx.windup || 0) + Math.max(prof.lockT || 0, prof.impactDelay || 0, flight));
  }
  if (!isEcho && prof.gcd && !rcState) p.gcdT = GCD;
  p.castPose?.(ctx.sk.type);
  // WINDUP: el golpe se programa; la esquiva lo cancela SIN cobrar el coste
  if (!isEcho && ctx.windup > 0) {
    p.castLock = ctx.windup + 0.05;
    p.swing = Math.max(p.swing || 0, 0.6);
    if (ctx.stepMoveMul !== 1) p.setMoveMul('windup', ctx.stepMoveMul, ctx.windup + 0.05);
    const id = this.timers.schedule(ctx.windup, () => {
      if (this._windup?.id !== id) return;
      this._windup = null;
      p.castLock = 0;
      p.clearMoveMul?.('windup');
      if (p.alive) this._commitCast(ctx);
    });
    this._windup = { id, ctx };
    return cast;
  }
  return this._commitCast(ctx) && cast;
}
// ¿esta principal puede salir SOBRE el canal en curso? Solo con el canal de una definitiva
// imparable (otra ranura) y si es instantánea: sin preparación, sin carga (salvo instant) y sin
// ser canal, salto, avance, parpadeo ni postura (cortarían o moverían al que canaliza)
function overUltChannel(prof, def, key) {
  const inst = this._channel;
  if (!inst || !inst.unstoppable || inst.ctx.key === key) return false;
  const chDef = inst.ctx.baseProf?.def || inst.ctx.cast?.sk || inst.ctx.sk;
  if (chDef?.cat !== 'ultimate' || def.cat !== 'spender') return false;
  if (prof.windup > 0 || (prof.charge && !prof.charge.instant)) return false;
  return !OVER_CHANNEL_TYPES_NO.has(def.type);
}

export const skillMethods = {
  // ---------------- primitivas para poderes (§9.1.4 / §6) ----------------
  // aliados (hoy: el jugador; en cooperativo, los remotos de this.party: entidades
  // con { pos, alive, hp, stats.maxHP, healSkill, addShield }; los tests las simulan)
  allies(pos = null, r = Infinity) {
    const list = this.player?.alive ? [this.player] : [];
    for (const a of this.party || []) if (a && a.alive !== false && a !== this.player) list.push(a);
    if (!pos || !Number.isFinite(r)) return list;
    return list.filter(a => a.pos.distanceTo(pos) <= r);
  },
  // CURACIÓN DE HABILIDAD (§6.1 B): escala con healPct; target 'self'|'lowest'|'all'.
  // pos (Paso 2c.2): centro del radio (Guardabosques cura a los aliados SOBRE la trampa);
  // sin pos, alrededor del héroe. 'self' es siempre el héroe. amount puede ser una
  // función (aliado) → cantidad (p. ej. un % de la vida máxima de CADA aliado).
  heal(amount, { target = 'self', radius = 15, src = 'skill', pos = null } = {}) {
    const p = this.player;
    let list = target === 'self' ? (p ? [p] : []) : this.allies(pos || p?.pos, radius);
    if (target === 'lowest' && list.length) list = [list.reduce((a, b) => (b.hp / b.stats.maxHP < a.hp / a.stats.maxHP ? b : a))];
    let total = 0;
    for (const a of list) total += a.healSkill(typeof amount === 'function' ? amount(a) : amount, src);
    // amenaza de la curación (×0,5, repartida entre los enemigos en combate cercanos)
    if (total > 0 && p) {
      const foes = (this.enemies || []).filter(e => e.alive && e.aggroed && e.pos?.distanceTo?.(p.pos) <= 20);
      for (const e of foes) e.addThreat?.(p, threatFromHeal(total, p.stats?.threatMult || 1, foes.length));
    }
    return total;
  },
  // ESCUDO (§6): se consume tras mitigar; escala con healPct. dr (Paso 2c.2): puntos de
  // reducción de daño MIENTRAS el escudo aguanta (Escudo Prismático: tv.barrierDr)
  shield(amount, { target = 'self', radius = 15, dur = 6, src = 'shield', dr = 0, pos = null } = {}) {
    const p = this.player;
    let list = target === 'self' ? (p ? [p] : []) : this.allies(pos || p?.pos, radius);
    if (target === 'lowest' && list.length) list = [list.reduce((a, b) => (b.hp / b.stats.maxHP < a.hp / a.stats.maxHP ? b : a))];
    let total = 0;
    for (const a of list) total += a.addShield(amount, dur, src, dr > 0 ? { dr } : undefined);
    return total;
  },
  // ⑫ DAÑO A UN ALIADO del cooperativo (Paso 2c.2): las entidades de g.party reciben el
  // daño por aquí. info = { amount (MUTABLE), raw, element, melee, src }. Orden:
  // onAllyDamaged (Vínculo del Guardián se queda una parte) → vida → si cae a 0,
  // onAllyLethal (Intercesión, Bastión Eterno: true = queda a 1). Devuelve el daño
  // aplicado. Sustituye al sondeo de g.party a 10 Hz de 2c.1.
  damageAlly(ally, amount, { element = 'phys', melee = false, source = null } = {}) {
    if (!ally || ally.alive === false || !(amount > 0)) return 0;
    if (ally.invulnT > 0) return 0;
    const p = this.player;
    const info = { amount, raw: amount, element, melee, src: source };
    if (p?.alive && p.hookIndex?.onAllyDamaged) firePower('onAllyDamaged', p, this, p, ally, info);
    const dmg = Math.max(0, info.amount);
    if (!(dmg > 0)) return 0;
    ally.hp = (ally.hp || 0) - dmg;
    if (ally.hp <= 0) {
      if (p?.alive && p.hookIndex?.onAllyLethal && firePower('onAllyLethal', p, this, p, ally, info)) {
        if (ally.hp <= 0) { if (ally.setHp) ally.setHp(1); else ally.hp = 1; }
        ally.alive = true;
      } else { ally.hp = 0; ally.alive = false; ally.onDeath?.(); }
    }
    return dmg;
  },
  // daño originado por un PODER (proc: sin Π[×], no dispara onHit)
  dealProcDamage(e, amount, opts = {}) { return powerProcDamage(this, e, amount, opts); },
  // AMENAZA (§6): suma amenaza de `src` en `e` · PROVOCACIÓN: objetivo forzado `t` s
  // con amenaza = máx. + 10 % (los jefes sí se provocan; sin rendimientos decrecientes)
  addThreat(e, src, n) { e?.addThreat?.(src || this.player, n); },
  forceTarget(e, src, t) { return e?.forceTarget ? e.forceTarget(src || this.player, t) : 0; },
  // recurso de clase para comportamientos y poderes (la Furia además reinicia su pérdida)
  gainResource(p, n, opts) { return gainResource(p || this.player, n, opts); },

  // Un proyectil del PERFIL de un lanzamiento (ctx del canal). Hace lo mismo que el
  // tipo genérico `proj`: tirada al impactar con crítico + Sangre Fría, ctx.hit
  // (efectos de forja/soporte), robo de vida, Encadenado (una vez por lanzamiento),
  // salpicadura (ctx.splashCoef en prof.radius, sin el objetivo directo) y VFX.
  // opts = { angle | to, speed, range, pierce, size, color, castHits:Set|Map, perTarget,
  //          coef (propio: autoShot, emisores), critBonus, from (posición de un campo),
  //          onEnemy(e, dealt), onImpact(e, dealt) }
  fireProjectile(ctx, opts = {}) {
    const { p, prof, sk, fx } = ctx;
    const color = opts.color ?? ctx.color ?? sk.color ?? 0xffffff;
    const from = opts.from ? v3(opts.from.x, opts.from.z, 1.0) : (ctx.origin ? v3(ctx.origin.x, ctx.origin.z, 1.0) : p.pos.clone().setY(1.0));
    let to = opts.to;
    if (!to) {
      const a = opts.angle ?? Math.atan2(ctx.target.x - from.x, ctx.target.z - from.z);
      to = from.clone().add(v3(Math.sin(a) * 5, Math.cos(a) * 5));
    }
    const coef = opts.coef ?? ctx.coef;
    const cb0 = opts.critBonus ?? prof.critBonus;
    const splashCoef = opts.coef != null ? 0 : (ctx.splashCoef || 0);
    const direct = opts.coef != null ? 0 : (prof.dmgDirect || 0);
    this.spawnProjectile({
      from, to: to.clone().setY(1.0),
      speed: opts.speed ?? prof.speed, range: opts.range ?? (prof.range || sk.range || 10),
      friendly: true, pierce: opts.pierce ?? prof.pierce, color, size: opts.size ?? sk.size ?? 0.14,
      castHits: opts.castHits || null, perTarget: opts.perTarget || 1,
      rollAt: e => p.rollDamage(coef, cb0 + (prof.coldblood && e?.slowT > 0 ? COLDBLOOD_CRIT : 0), prof.addPct + direct, e, ctx.hitInfo),
      ...ctx.dmgOpts, hitOpts: ctx.hitExtra || null,
      impactPreset: fxp(fx?.impact),
      onHit: (e, dealt) => {
        if (e?.alive && !ctx._chained && prof.chain) { ctx._chained = true; this.spawnChainBounce(e, Math.round(ctx.avgHit), prof.chain, [], color, prof.chainPct, ctx); }
        ctx.hit(e, dealt);
        if (prof.lifesteal && dealt > 0) p.leech(dealt * prof.lifesteal / 100);
        if (e && splashCoef > 0 && prof.radius > 0) {
          const at = e.pos.clone().setY(0);
          this.dealArea(at, prof.radius, splashCoef, { ...ctx.areaOpts, exclude: e, from: at });
          ctx.zoneCenter = at; ctx.zoneRad = Math.max(1.5, prof.radius);
          this.spawnRing?.(at, prof.radius, color);
          if (fx?.aura) this.emitFx(fxp(fx.aura), at.clone().setY(0.3));
          if (fx?.extra) this.emitFx(fxp(fx.extra), at.clone().setY(0.3));
        } else if (e) { ctx.zoneCenter = e.pos.clone().setY(0); ctx.zoneRad = 1.5; }
        try { opts.onEnemy?.(e, dealt); } catch (err) { console.warn(`[proyectil ${sk.id}]`, err); }
        opts.onImpact?.(e, dealt);
      },
    });
  },

  // Canalización por tics del planificador (API pública para comportamientos).
  // opts = { dur, ticks, interval?, unstoppable, slowImmune, hold = true | false | 'toggle', endless,
  //          moveMul, autoShot {every, coef, target:'nearest'|'maxHp', range}, drainPerSec,
  //          speed (× del tic; por defecto ctx.prof.skillSpeed), onTick(inst, interval), onEnd(inst, end) }.
  // Soltar la tecla (salvo hold:false: Remolino Sangriento gira solo; 'toggle': la 2.ª
  // pulsación), la esquiva o un golpe > 10 % de la vida (si es `int` y no eres imparable)
  // la cortan. endless: dura hasta soltar, quedarte sin recurso o que la corten.
  // Los tics van a instantes FIJOS desde el inicio (t0 + k·interval): no derivan con los
  // fotogramas (cola W2d). La velocidad de habilidades acorta el tic y mete más en la misma duración.
  // Termina llamando a done(ctx.res) y a ⑭ onSkillEnd(kind 'channel').
  startChannel(ctx, done, opts = {}) {
    const p = ctx.p;
    const dur = opts.dur || 2;
    const ticks0 = Math.max(1, Math.round(opts.ticks || dur / 0.33));
    const speed = Math.max(0.1, opts.speed ?? ctx.prof?.skillSpeed ?? 1);
    const interval = (opts.interval || dur / ticks0) / speed;
    const ticks = speed === 1 ? ticks0 : Math.max(1, Math.round(dur / interval));
    const toggle = opts.hold === 'toggle' || (opts.hold !== false && this.settings?.holdMode === 'toggle');
    const t0 = this.timers.now || 0;
    const inst = { ctx, left: ticks, timer: 0, done, target: ctx.enemy || null, unstoppable: !!opts.unstoppable, onEnd: opts.onEnd || null,
      hold: opts.hold !== false && !toggle, toggle, endless: !!opts.endless, interval, autoAcc: 0, endReason: null, released: false, tickN: 0,
      t0, slowImmune: !!opts.slowImmune };
    this._channel = inst;
    p.castLock = opts.endless ? 1e9 : ticks * interval + 0.05;
    if (inst.unstoppable) p.unstoppableT = Math.max(p.unstoppableT || 0, opts.endless ? 1e9 : ticks * interval + 0.1);
    if (inst.slowImmune) p.grantSlowImmune?.(interval + 0.1);
    if (opts.moveMul != null && opts.moveMul !== 1) p.setMoveMul('channel', opts.moveMul);
    const auto = opts.autoShot || null;
    // el siguiente tic, al instante fijo t0 + (hechos + 1)·interval (un fotograma largo los pone al día)
    const schedNext = () => { inst.timer = this.timers.schedule(Math.max(0, inst.t0 + (inst.tickN + 1) * interval - this.timers.now - 1e-9), step); };
    const step = () => {
      if (this._channel !== inst) return;
      if (!p.alive) { this._endChannel(inst, true, 'cancel'); return; }
      if (inst.hold && !this.slotHeld(ctx.key)) { this._endChannel(inst, true, 'release'); return; }
      if (opts.drainPerSec > 0 && !drainResource(p, opts.drainPerSec, interval)) { this._endChannel(inst, true, 'drain'); return; }
      inst.tickN++;
      if (inst.slowImmune) p.grantSlowImmune?.(interval + 0.1);
      try { opts.onTick?.(inst, interval); } catch (err) { console.warn(`[canalización ${ctx.sk?.id}]`, err); }
      // pull por tic (Ciclón): atrae a los enemigos del radio de atracción (pull.radius o el del
      // daño) hacia ti; pull.boss:false deja a los jefes
      const pr = ctx.prof;
      const pullR = pr?.pullRadius || pr?.radius || 0;
      if (pr?.pull > 0 && pullR > 0 && !pr.behavior) {
        for (const e of this.enemies || []) {
          if (!e.alive || (pr.pullBoss === false && isBossEnemy(e))) continue;
          if (e.pos.distanceTo(p.pos) <= pullR + 0.5) e.displace?.(p.pos, pr.pull, { toward: true, src: p });
        }
      }
      if (auto) { inst.autoAcc += interval; while (inst.autoAcc >= auto.every - 1e-9) { inst.autoAcc -= auto.every; this._autoShot(ctx, auto); } }
      if (!inst.endless) inst.left--;
      if (this._channel !== inst) return;
      if (inst.endless || inst.left > 0) schedNext();
      else this._endChannel(inst, false, 'done');
    };
    schedNext();
    return undefined; // diferido: termina con el último tic
  },
  // disparo automático de un canal (autoShot): al más cercano o al de más vida en `range`
  _autoShot(ctx, auto) {
    const p = ctx.p;
    const range = auto.range || ctx.prof.range || 10;
    let best = null;
    for (const e of this.enemies || []) {
      if (!e.alive || e.pos.distanceTo(p.pos) > range) continue;
      if (!best) { best = e; continue; }
      if (auto.target === 'maxHp' ? e.hp > best.hp : e.pos.distanceToSquared(p.pos) < best.pos.distanceToSquared(p.pos)) best = e;
    }
    if (!best) return;
    const coef = (auto.coef ?? ctx.sk.coef ?? 0.5) * (ctx.prof.coef / Math.max(1e-6, ctx.sk.coef || ctx.prof.coef || 1));
    this.fireProjectile(ctx, { to: best.pos.clone(), coef, speed: auto.speed || 22, range: range + 2 });
  },
  // LECTURA del canal en curso (API pública; null sin canal): id de la habilidad, ranura, t (s
  // desde que empezó), dur (total con lo que lo alargaron; Infinity si es endless), left (s que
  // quedan), tics hechos, interval, toggle, hold, endless, unstoppable y p (quien canaliza)
  channelInfo() {
    const inst = this._channel;
    if (!inst) return null;
    const t = Math.max(0, (this.timers?.now || 0) - (inst.t0 || 0));
    const dur = inst.endless ? Infinity : (inst.tickN + Math.max(0, inst.left)) * inst.interval;
    return { id: inst.ctx.cast?.sk?.id || inst.ctx.sk?.id || null, key: inst.ctx.key || null, t, dur,
      left: inst.endless ? Infinity : Math.max(0, dur - t), ticks: inst.tickN, interval: inst.interval,
      toggle: !!inst.toggle, hold: !!inst.hold, endless: !!inst.endless, unstoppable: !!inst.unstoppable, p: inst.ctx.p };
  },
  // alarga la canalización en curso `s` segundos (Danza Carmesí, Tierra Santa)
  extendChannel(p, s) {
    const inst = this._channel;
    if (!inst || inst.ctx.p !== (p || this.player) || !(s > 0)) return false;
    if (!inst.endless) inst.left += Math.max(1, Math.round(s / inst.interval));
    const pl = inst.ctx.p;
    pl.castLock = Math.max(pl.castLock || 0, (inst.endless ? 1e9 : inst.left * inst.interval + 0.05));
    if (inst.unstoppable) pl.unstoppableT = Math.max(pl.unstoppableT || 0, inst.left * inst.interval + 0.1);
    return true;
  },
  // ⑤ punto único por impacto (lo llama Enemy.takeDamage): poderes onHit (incluidos
  // los indicadores de especialización gauge_<id>) y critCdr de la habilidad (forja/talento
  // `critCdr`: s de enfriamiento menos por crítico directo, como mucho una vez por instante)
  onPlayerHit(e, hit) {
    const p = this.player;
    if (!p) return;
    if (hit?.crit && hit.skill && !hit.proc && !hit.dot) {
      const prof = p.resolved?.[hit.skill] || ((p.cds[hit.skill] || 0) > 0 ? resolveSkill(p, p.cls.skills.find(s => s.id === hit.skill)) : null);
      if (prof?.critCdr > 0 && (p.cds[hit.skill] || 0) > 0 && p._critCdrAt?.[hit.skill] !== p.simT) {
        (p._critCdrAt || (p._critCdrAt = {}))[hit.skill] = p.simT;
        this.reduceCooldown(p, hit.skill, prof.critCdr);
      }
    }
    if (!p.hookIndex?.onHit) return;
    firePower('onHit', p, this, p, e, hit);
  },

  // ---------------- utilidades de combate ----------------
  // soportes asignados a una habilidad, siempre como array (tolera saves viejos)
  skillSupports(skillId) {
    const v = this.player?.supports?.[skillId];
    if (Array.isArray(v)) return v;
    if (typeof v === 'string' && v) return [v];
    return [];
  },
  // Daño por tiempo sobre el planificador por ticks (una instancia por fuente y objetivo)
  applyDoT(enemy, totalDmg, ticks, interval, color = 'txt-dmg', source = 'dot') {
    void color;
    return applyDoTInstance(this.timers, enemy, { total: totalDmg, ticks, interval, source });
  },
  // ---- API de DoT (Paso 2c.2: los poderes no tocan e._dots) ----
  // kind = 'burn'|'bleed'|'poison'|… (sufijo de la fuente `<habilidad>:<tipo>`) o null
  dotsOf(e, kind = null) { return dotsOf(e, kind); },
  hasDoT(e, kind = null) { return dotsOf(e, kind).length > 0; },
  // daño pendiente: de una fuente exacta ('p_ignicion:burn') o de todo un tipo ('burn')
  dotRemaining(e, which = null) { return dotRemaining(e, which); },
  // CONSUME (detona): quita los DoT que casan (tipo, fuente o función) y devuelve su daño restante
  consumeDoT(e, which = null) { return consumeDoTs(this.timers, e, which); },
  // SUSTITUYE el DoT de `source` (lo pendiente se pierde: «no se apila»)
  replaceDoT(e, total, ticks, interval = 1, source = 'dot') { return replaceDoTInstance(this.timers, e, { total, ticks, interval, source }); },
  // ⑬ un DoT se agotó SOLO (timers.js): onDotEnd(g, p, e, { source, kind, total, per, ticks })
  onDotEnd(e, inst) {
    const p = this.player;
    if (!p?.hookIndex?.onDotEnd || !inst) return;
    firePower('onDotEnd', p, this, p, e, { source: inst.source, kind: dotKindOf(inst.source), total: inst.total || 0, per: inst.per, ticks: inst.ticks || 0 });
  },
  // Encadenado: rebotes a enemigos cercanos, hasta `jumps`. Sin pct, −25 % por salto
  // (compuesto, como siempre); con pct (Rayo en Cadena: chainPct 70), cada salto hace el pct %
  // del golpe base. La cadena se traza al lanzar (cada eslabón, el más cercano a 6 m del anterior
  // que no esté ya en ella ni en `exclude`) y cada salto NACE en el enemigo del que sale y golpea
  // al SIGUIENTE: su castHits lleva a todos los demás eslabones (ni el origen ni otro eslabón
  // reciben dos veces). Con `ctx` (el del lanzamiento) lleva su habilidad, tags, elemento y marcas
  // (perfect, echo…): cuenta para indicadores y poderes. HitInfo.source = 'chain'.
  spawnChainBounce(fromEnemy, baseDmg, jumps, exclude, color, pct = 0, ctx = null) {
    if (!fromEnemy || baseDmg <= 0 || jumps <= 0) return;
    const seen = new Set(exclude || []);
    seen.add(fromEnemy);
    const links = [];
    let origin = fromEnemy, dmg = baseDmg;
    for (let j = 0; j < jumps; j++) {
      dmg = pct > 0 ? Math.round(baseDmg * pct / 100) : Math.round(dmg * 0.75);
      if (dmg <= 0) break;
      let next = null, bd = 6 * 6;
      for (const e of this.enemies) {
        if (!e.alive || seen.has(e)) continue;
        const d = e.pos.distanceToSquared(origin.pos);
        if (d < bd) { bd = d; next = e; }
      }
      if (!next) break;
      seen.add(next);
      links.push({ from: origin, to: next, dmg, dist: Math.sqrt(bd) });
      origin = next;
    }
    const info = ctx?.hitInfo || null;
    const hitOpts = { ...(ctx?.hitExtra || {}), source: 'chain' };
    for (const l of links) {
      const others = new Set(seen);
      others.delete(l.to);
      this.spawnProjectile({
        from: l.from.pos.clone().setY(1.0), to: l.to.pos.clone().setY(1.0),
        speed: 18, range: l.dist + 1, dmg: l.dmg, crit: false, friendly: true,
        color: color || 0x66ddff, size: 0.12, castHits: others,
        skill: info?.skill || null, tags: info?.tags || null, elem: info?.elem || null, hitOpts,
      });
    }
  },
  // daño en área: tira el golpe POR OBJETIVO (bonos condicionados) y aplica efectos
  // opts = { addPct, critBonus, coldblood, onHit(e, dealt, from), color, hitInfo, exclude,
  //          from (origen de pull/knock), hitExtra (perfect/step/repeat/echo/trap → HitInfo),
  //          perTarget (Map de impactos por enemigo y su tope) }
  dealArea(pos, radius, mult, opts = {}) {
    let hits = 0;
    const p = this.player;
    const dmgOpts = { color: opts.color, skill: opts.hitInfo?.skill, tags: opts.hitInfo?.tags, elem: opts.hitInfo?.elem, ...(opts.hitExtra || {}) };
    const cap = opts.perTarget || null;
    for (const e of this.enemies) {
      if (!e.alive || e === opts.exclude) continue;
      const r = radius + 0.5 * (e.def.scale || 1);
      if (e.pos.distanceToSquared(pos) <= r * r) {
        if (cap && (cap.map.get(e) || 0) >= cap.max) continue;
        if (cap) cap.map.set(e, (cap.map.get(e) || 0) + 1);
        const cb = (opts.critBonus || 0) + (opts.coldblood && e.slowT > 0 ? COLDBLOOD_CRIT : 0);
        const { dmg, crit } = p.rollDamage(mult, cb, opts.addPct || 0, e, opts.hitInfo);
        const dealt = e.takeDamage(dmg, crit, dmgOpts) || 0;
        if (opts.slow && e.alive) e.applyCC?.('slow', opts.slow, { pct: opts.slowPct || 50, src: p });
        if (opts.onHit) opts.onHit(e, dealt, opts.from || pos);
        hits++;
      }
    }
    if (hits) p.onDealHit(); // vida/recurso al golpear (una vez por área)
    return hits;
  },
  enemiesInCone(origin, dir, radius, angleDeg) {
    const cosHalf = Math.cos((angleDeg / 2) * Math.PI / 180);
    return (this.enemies || []).filter(e => {
      if (!e.alive) return false;
      const dx = e.pos.x - origin.x, dz = e.pos.z - origin.z;
      const d = Math.hypot(dx, dz);
      const r = radius + 0.5 * (e.def?.scale || 1);
      if (d > r) return false;
      if (d < 0.6) return true;
      return (dx * dir.x + dz * dir.z) / d >= cosHalf;
    });
  },
  enemiesInLine(origin, dir, length, width) {
    return (this.enemies || []).filter(e => {
      if (!e.alive) return false;
      const dx = e.pos.x - origin.x, dz = e.pos.z - origin.z;
      const along = dx * dir.x + dz * dir.z;
      if (along < -0.5 || along > length + 0.5) return false;
      const perp = Math.abs(dx * dir.z - dz * dir.x);
      return perp <= width / 2 + 0.5 * (e.def?.scale || 1);
    });
  },
  // destino transitable más lejano en la recta hacia `to` (acotado a `maxD`), en pasos de 0,3 m
  // y el último hasta la distancia exacta (un salto de 8 m cae a 8 m, no a 7,8)
  clampWalkable(from, to, maxD) {
    const dir = to.clone().sub(from).setY(0);
    const dist = Math.min(dir.length(), maxD);
    if (dist < 0.05) return from.clone();
    dir.normalize();
    const out = from.clone();
    const n = Math.ceil(dist / 0.3 - 1e-9);
    for (let i = 1; i <= n; i++) {
      const t = Math.min(i * 0.3, dist);
      const nx = from.x + dir.x * t, nz = from.z + dir.z * t;
      if (this.world?.grid && !this.world.grid.walkable(nx, nz)) break;
      out.x = nx; out.z = nz;
    }
    return out.setY(0);
  },
  // ¿sigue mantenida la tecla/botón de la ranura? (canalizaciones y cargas). Sin input: sí.
  slotHeld(key) {
    const inp = this.input;
    if (!inp) return true;
    if (key === 'lmb') return inp.mouseHeld ? !!inp.mouseHeld.l : true;
    if (key === 'rmb') return inp.mouseHeld ? !!inp.mouseHeld.r : true;
    const act = SLOT_ACTION[key];
    return act && typeof inp.held === 'function' ? !!inp.held(act) : true;
  },

  // ---------------- barra de habilidades y forja ----------------
  // asigna una habilidad a una ranura: valida su categoría (CAT_SLOTS) y que la
  // conozcas; sin duplicados (k2 nunca repite la de rmb). 🖱️Izq nunca queda vacía.
  assignHotbar(slot, id) {
    const p = this.player;
    if (!p?.hotbar) return false;
    if (!['lmb', 'rmb', 'k1', 'k2', 'k3', 'k4'].includes(slot)) return false;
    if (id) {
      const sk = p.cls.skills.find(s => s.id === id);
      if (!sk || !fitsSlot(sk, slot)) { this.ui?.message?.(`${sk?.name || 'Esa habilidad'} no va en esa ranura`); return false; }
      if (!isKnown(p, sk)) { this.ui?.message?.(sk.spec ? `${sk.name}: solo con su especialización` : `${sk.name}: se aprende al nivel ${sk.req}`); return false; }
      for (const s of Object.keys(p.hotbar)) if (p.hotbar[s] === id) p.hotbar[s] = null;
    } else if (slot === 'lmb') id = weaponBasicOf(p.cls)?.id || null;
    p.hotbar[slot] = id;
    this.ui?.refreshHotbar?.();
    this.save?.();
    return true;
  },

  // FORJA (§3.5, 2f §2.2): elige la variante 'i' | 'ii' o ninguna (null) de una habilidad.
  // Sin puntos ni confirmación; gratis FUERA de combate (canRespecFree). La variante se abre
  // al Nv req+6. Al cambiarla, los soportes que dejan de encajar con la forma nueva se
  // desengarzan y vuelven a knownSupports (con aviso). → { ok, reason?, unsocketed? }
  chooseForge(skillId, v = null) {
    const p = this.player;
    const sk = p?.cls?.skills.find(s => s.id === skillId);
    if (!sk) return { ok: false, reason: 'skill' };
    const st = forgeState(p, sk);
    if (!st.entry) return { ok: false, reason: 'no-forge' };
    if (v !== null && v !== 'i' && v !== 'ii') return { ok: false, reason: 'variant' };
    if (v && !forgeVar(st.entry, v)) return { ok: false, reason: 'variant' };
    if (v && (p.level || 1) < st.levels.vars) { this.ui?.message?.(`${sk.name}: las variantes se abren al nivel ${st.levels.vars}`); return { ok: false, reason: 'level' }; }
    if (typeof this.canRespecFree === 'function' && !this.canRespecFree()) {
      this.ui?.message?.('⚔️ En combate: la forja se cambia fuera de combate (5 s sin daño) o en un campamento');
      return { ok: false, reason: 'combat' };
    }
    const before = (p.supports?.[skillId] || []).slice();
    p.skillForge = p.skillForge || {};
    p.skillForge[skillId] = v;
    p.recompute();
    // soportes incompatibles con la definición forjada → a knownSupports
    const def = forgedDef(p, sk);
    const keep = [], out = [];
    for (const id of before) {
      const sup = SUPPORTS.find(s => s.id === id);
      if (sup && supportFits(sup, def)) keep.push(id); else out.push(id);
    }
    if (out.length) {
      p.supports[skillId] = keep;
      p.knownSupports = p.knownSupports || [];
      for (const id of out) if (!p.knownSupports.includes(id)) p.knownSupports.push(id);
      p.recompute();
      this.ui?.message?.(`🔧 ${out.length} soporte${out.length > 1 ? 's' : ''} desengarzado${out.length > 1 ? 's' : ''}: no encaja${out.length > 1 ? 'n' : ''} con la forma nueva`, 3000);
    }
    void validSupports;
    this.sfx?.('uiclick');
    this.ui?.refreshSkillsView?.();
    this.ui?.refreshHotbar?.();
    this.save?.();
    return { ok: true, unsocketed: out };
  },
  /** @deprecated Paso 2 (D23): las ramas ya no existen (forja: chooseForge). No hace nada. */
  chooseSkillMod(skillId, branchId, optId) {
    void skillId; void branchId; void optId;
    return false;
  },

  // ¿Hay una principal PEDIDA (🖱️Der mantenido) y lista para salir? Entonces el
  // básico cede el turno ese frame: con los dos botones mantenidos nunca salen dos
  // acciones a la vez y la principal conserva su cadencia. Sin ratón (tests sin
  // input real), nunca.
  _spenderWaiting() {
    const p = this.player, inp = this.input;
    if (!p || !inp?.mouseHeld?.r) return false;
    const id = p.hotbar?.rmb;
    const sk = id ? p.cls.skills.find(s => s.id === id) : null;
    if (!sk || sk.cat === 'basic' || !isKnown(p, sk)) return false;
    if (!this._skillReady(p, sk) || p.gcdT > 0 || p.castLock > 0 || p.leap || this._channel || this._charging) return false;
    const prof = resolveSkill(p, sk);
    if (!canAfford(p, prof.cost)) return false;
    if (prof.type === 'melee') {
      const e = this.nearestEnemy(Math.max(2.2, prof.range || 2.2) + 0.6);
      if (!e) return false;
    }
    return true;
  },

  // ---------------- ataque básico ----------------
  // Básico de arma = GENERADOR. Apunta al cursor; melee golpea al enemigo a
  // rango, a distancia dispara hacia la mira. Sin GCD (lo marca la cadencia).
  // opts.charge: suelta de un básico TENSABLE (Paso 2, Cuerda Tensa)
  castBasic(opts = {}) {
    const p = this.player;
    if (!p || !p.alive || this.state !== 'play' || this._paused || p.atkCd > 0 || p.castLock > 0 || p.leap || this._windup) return;
    if (!opts.charge && this._charging) return;                 // el básico mantenido no dispara durante una carga
    // la principal en curso / pedida manda (la suelta de una carga ya tensada sale siempre)
    if (!opts.charge && (p.actionLockT > 0 || this._spenderWaiting())) return;
    const aim = this.input?.mouseWorld || null;
    const near = this.nearestEnemy((p.cls.atkRange || 8) + 3);
    const scheme = this.settings?.controlScheme || 'wasd';
    p.basicAt = p.simT;                                         // una acción por frame
    if (p.cls.ranged) {
      const fwd = v3(Math.sin(p.group.rotation.y), Math.cos(p.group.rotation.y));
      const tgt = (scheme !== 'click' && aim) ? { pos: aim } : (near || { pos: aim || p.pos.clone().addScaledVector(fwd, 4) });
      p.faceToward(tgt.pos);
      p.basicAttack(tgt, opts);
    } else if (near && p.pos.distanceTo(near.pos) <= p.cls.atkRange) {
      p.faceToward(near.pos);
      p.basicAttack(near, opts);
    } else {
      // golpe melee al vacío hacia la mira (no genera Furia: hay que acertar)
      if (aim) p.faceToward(aim);
      p.atkCd = p.stats.atkTime * 0.6; p.swing = 1;
    }
  },
  // ¿el básico de arma se TENSA? (Cuerda Tensa de la Francotiradora; clic-mover lo usa)
  basicTensable() {
    const p = this.player;
    const wb = p ? weaponBasicOf(p.cls) : null;
    return !!(wb && resolveSkill(p, wb)?.charge);
  },

  // ---------------- canal de lanzamiento ⑦ ----------------
  // punto y enemigo objetivo de un lanzamiento (ratón en PC; si no, el más cercano).
  // aim ({x, z}): punto fijado por quien lanza (g.castEcho) en lugar del ratón; from: desde dónde
  // se mide el alcance (el héroe por defecto; el `origin` de una repetición)
  skillTarget(p, prof, aim = null, from = null) {
    const o = from ? v3(from.x, from.z) : p.pos;
    const maxRange = prof.range || 8;
    const near = this.nearestEnemy(maxRange + 2, from ? o : null);
    let target;
    if (aim) target = v3(aim.x, aim.z);
    else if (this.input?.mouseWorld) target = this.input.mouseWorld.clone();
    else if (near) target = near.pos.clone();
    else {
      const fwd = v3(Math.sin(p.group.rotation.y), Math.cos(p.group.rotation.y));
      target = o.clone().addScaledVector(fwd, Math.min(4, maxRange));
    }
    const delta = target.clone().sub(o); delta.y = 0;
    if (delta.length() > maxRange) target = o.clone().addScaledVector(delta.normalize(), maxRange);
    target.y = 0;
    // melee: el enemigo más cercano a TI dentro del alcance; resto: el más cercano a la mira
    const enemy = prof.type === 'melee'
      ? this.nearestEnemy(Math.max(2.2, prof.range || 2.2) + 0.6, from ? o : null)
      : (this.nearestEnemy(3, target) || near);
    return { target, near: enemy };
  },

  // ¿lista para lanzarse por enfriamiento? (cargas: al menos una)
  _skillReady(p, sk) {
    const prof = resolveSkill(p, sk);
    if (prof.charges > 1) return this._syncCharges(p, sk.id, prof).n > 0;
    return !((p.cds[sk.id] || 0) > 0);
  },

  // echoMult > 0: repetición (sin coste, sin CD, sin windup, sin GCD; no avanza estado).
  // slotKey: 'lmb' | 'rmb' | 'k1'..'k4' (o índice 0-3 → k1-k4, retrocompat).
  // Devuelve true si el lanzamiento arrancó (también si empieza una CARGA).
  castSkillSlot(slotKey, echoMult = 0) {
    const p = this.player;
    if (!p || !p.alive || this.state !== 'play') return false;
    if (this._paused && !echoMult) return false; // no actuar con un panel abierto (pausa)
    const key = typeof slotKey === 'number' ? ['k1', 'k2', 'k3', 'k4'][slotKey] : slotKey;
    const skId = (p.hotbar || {})[key];
    if (!skId) return false;
    const sk = p.cls.skills.find(s => s.id === skId);
    if (!sk || !isKnown(p, sk)) return false;
    return !!castSkillCore.call(this, p, sk, key, { echoMult });
  },

  // REPETICIÓN GRATIS de una habilidad conocida, esté o no en la barra (Ventisca Viva, Remolino,
  // Corazón del Sol/Invierno 4, Lluvia en Retirada, Instinto…): sin coste, enfriamiento, GCD,
  // preparación ni carga (sale a carga completa), × mult de su potencia. Lleva SU PROPIA serie de
  // repeticiones (tope echoCap dentro de ella; `series` = { n } para encadenar varias en la misma):
  // no toca p.skState[id].echo del jugador, ni p.hotbar, ni g.input.mouseWorld. at = {x, z}: mira
  // (acotada al alcance desde el origen); origin = {x, z}: de dónde sale (una habilidad `at:'self'`
  // se centra ahí; un proyectil, una línea o un cono salen de ahí). Como toda repetición, no
  // dispara ⑦ ni genera otra. Una CANALIZACIÓN no se repite (null): el canal es del héroe (su
  // ranura mantenida, castLock, freno y drenaje). Llamada desde otra castEcho en curso (un poder
  // que repite desde el golpe de una repetición), hereda su serie: el tope echoCap vale para
  // toda la cadena y no hay recursión sin fin. → el CastInfo o null.
  // Retrocompatible con castEchoOf de la Arquera: castEcho(p, id, mult, { at }).
  castEcho(p, id, opts = {}, legacy = null) {
    if (typeof opts === 'number') opts = { ...(legacy || {}), mult: opts };
    const { mult = 1, at = null, origin = null, series = null } = opts || {};
    p = p || this.player;
    if (!p || p !== this.player || !p.alive || this.state !== 'play' || !(mult > 0)) return null;
    const sk = p.cls?.skills?.find(s => s.id === id);
    if (!sk || !isKnown(p, sk)) return null;
    const def = resolveSkill(p, sk).def || sk;
    if (def.type === 'channel') return null;
    // anidada: la serie de la castEcho en curso; y nunca más de echoCap niveles (una serie
    // propia en cada nivel no la frena)
    const outer = this._echoRun || null;
    if (outer && outer.depth >= VERB_DEFAULTS.echoCap) return null;
    const run = { series: series || outer?.series || { seq: -1, n: 0 }, depth: (outer?.depth || 0) + 1 };
    this._echoRun = run;
    let res;
    try { res = castSkillCore.call(this, p, sk, null, { echoMult: mult, series: run.series, at, origin }); }
    finally { this._echoRun = outer; }
    return res && res !== true ? res : null;
  },

  // contexto de un lanzamiento (ctx de los tipos genéricos). Con combo, `sk`/`prof` del paso.
  // origin ({x, z}): de dónde sale una repetición de g.castEcho (srcPos)
  _makeCtx(p, sk, prof, key, cast, { target, near, isEcho, echoMult, comboIdx = -1, fieldDest = null, destRange = 0, rcState = null, charge = null, origin = null }) {
    const def = prof.def || sk;
    const isBasic = def.cat === 'basic';
    let stepDef = def, stepProf = prof, windup = prof.windup, stepMoveMul = prof.moveMul;
    if (comboIdx >= 0) {
      const step = def.steps[comboIdx] || {};
      stepDef = { ...def, ...step, type: step.type || 'melee', steps: undefined };
      const wb = step.windup || 0;
      // talentos @windup de los pasos CON preparación ('<id>@windup': prof.windupMods), solo en ese paso
      const wm = wb > 0 ? prof.windupMods : null;
      const wAdd = (prof.mods?.windupAdd || 0) + (wm?.windupAdd || 0), wMul = (prof.mods?.windupMul || 0) + (wm?.windupMul || 0);
      windup = wb > 0 ? Math.max(0, (wb + wAdd) * Math.max(0, 1 + wMul / 100)) / (prof.skillSpeed || 1) : 0;
      stepMoveMul = step.moveMul ?? prof.moveMul;
      if (wm) stepMoveMul = Math.max(wm.moveMulMin || 0, stepMoveMul + (wm.moveMulAdd || 0) / 100);
      stepProf = { ...prof, type: stepDef.type, def: stepDef,
        coef: prof.coef * (step.coef ?? 1),
        addPct: prof.addPct + (wm?.dmg || 0), critBonus: prof.critBonus + (wm?.crit || 0),
        radius: step.radius != null ? step.radius * prof.radiusMul : prof.radius,
        range: step.range != null ? step.range * prof.rangeMul : prof.range,
        angle: step.angle ?? prof.angle, width: step.width ?? prof.width,
        dot: step.dot || prof.dot, windup };
    }
    // VFX con los de la variante forjada encima (por id de variante, MAGA_FORGE_FX o vars.i|ii)
    const fx = skillFxFor(sk.id, def.forged) || null;
    const dotKind = stepProf.dot;
    const color = def.color || (dotKind ? DOT_COLORS[dotKind] : null) || undefined;
    const coef = stepProf.coef * (isEcho ? echoMult : 1) * (charge?.coefMul || 1);
    const forceCrit = !!(prof.forceCrit || cast.forceCrit || (charge?.perfect && prof.charge?.perfectCrit));
    const hitInfo = { skill: sk.id, tags: prof.tags, elem: prof.elem, forceCrit };
    const hitExtra = {};
    if (charge?.perfect) hitExtra.perfect = true;
    if (comboIdx >= 0) hitExtra.step = comboIdx + 1;
    if (isEcho) hitExtra.echo = true;
    const addPct = stepProf.addPct + (charge?.addPct || 0);
    const ctx = {
      p, sk: stepDef, prof: charge ? { ...stepProf, addPct, radius: stepProf.radius * (charge.radiusMul || 1), range: stepProf.range * (charge.rangeMul || 1) } : stepProf,
      baseProf: prof, key, target, enemy: near, coef, isEcho, isBasic, hitInfo, color, fx, cast,
      dmgOpts: { color, skill: sk.id, tags: prof.tags, elem: prof.elem, ...hitExtra },
      hitExtra,
      avgHit: p.avgHit(coef, addPct),
      splashCoef: (prof.splash || 0) * (isEcho ? echoMult : 1) * (charge?.coefMul || 1),
      res: { hits: 0, dealt: 0, killed: 0 },
      windup: isEcho ? 0 : windup, stepMoveMul, comboIdx, fieldDest, destRange, rcState,
      chargeFull: charge?.full ? charge.fullDef : null, seqNth: !!cast.seqNth,
      origin: origin ? { x: origin.x, z: origin.z } : null,
      hitSet: new Set(),                       // golpeados por el impacto (la onda no los repite)
    };
    // impacto REAL sobre un enemigo: cuenta, daño infligido y efectos de forja/soporte
    // (`from`: origen de atraer/empujar; por defecto el héroe)
    ctx.hit = (e, dealt, from = null) => {
      ctx.res.hits++;
      ctx.res.dealt += dealt || 0;
      if (e) ctx.hitSet.add(e);
      // pull.boss:false también al golpear (Arpón): al jefe no se lo atrae; lo demás, igual
      const pr = ctx.prof.pullBoss === false && ctx.prof.pull > 0 && isBossEnemy(e) ? { ...ctx.prof, pull: 0 } : ctx.prof;
      applyHitEffects(this, p, e, pr, ctx.avgHit, { from });
      if (e && !e.alive) ctx.res.killed++;
    };
    ctx.areaOpts = { addPct, critBonus: stepProf.critBonus, coldblood: prof.coldblood, color, hitInfo, onHit: ctx.hit, hitExtra };
    return ctx;
  },

  // cobra el coste, pone el enfriamiento (o gasta una carga) y ejecuta el efecto
  _commitCast(ctx) {
    const { p, sk, prof, isEcho, isBasic } = ctx;
    const base = ctx.baseProf || prof;
    const def = base.def || sk;
    const rc = ctx.rcState;
    if (!isEcho) {
      // básico: cadencia × sk.cadence (Mandoble 1,5 · Embate 1,1), sin contar el windup ya esperado
      if (isBasic) { p.atkCd = Math.max(0.05, p.stats.atkTime * (base.cadence || 1) - (ctx.windup || 0)); p.basicAt = p.simT; }
      else {
        const free = rc && base.recast?.free;
        if (!free && !spendResource(p, base.cost)) { this.ui?.message?.(`${p.cls.resource?.name || 'Recurso'} insuficiente`); return false; }
        if (base.gen && !rc) gainResource(p, base.gen);   // def.gen (Grito de Guerra) + forja/talentos
        // enfriamiento: no en un relanzamiento (ni en el 1.º con cdFrom 'end': al cerrar la cadena)
        if (!rc && !(base.recast && base.recast.cdFrom === 'end')) this._startCooldown(p, sk.id, base);
      }
      if (base.lockT > 0) p.castLock = Math.max(p.castLock || 0, base.lockT);
      if (base.recast && base.recast.cond !== 'hit') this._recastCommit(p, sk, base, ctx);
      if (base.haste) p.addBuff(`${sk.id}_impulso`, { spdPct: 30 }, base.haste, { name: 'Impulso', icon: '💨', desc: '+30% de velocidad de movimiento' });
      if (base.cleanse) p.cleanse();
      if (def.cat === 'movement') p.unplant?.();                    // usar movilidad rompe el plantado
    }
    let finished = false;
    const done = (res) => {
      if (finished) return res;
      finished = true;
      this._finishCast(ctx, res || ctx.res);
      return res || ctx.res;
    };
    let res;
    try {
      const beh = prof.behavior ? SKILL_BEHAVIORS[prof.behavior] : null;
      if (beh?.cast) res = beh.cast(this, p, prof, { ...ctx.cast, ctx, done });
      else {
        const type = ctx.comboIdx >= 0 ? 'combo' : sk.type;
        const fn = GENERIC[type];
        if (!fn) { console.warn(`[habilidad ${sk.id}] tipo genérico desconocido: ${sk.type}`); res = ctx.res; }
        else res = fn(this, ctx, done);
      }
    } catch (err) {
      console.warn(`[habilidad ${sk.id}]`, err);
      res = ctx.res;
    }
    if (res !== undefined) done(res);              // instantáneo; si es diferido, done() llega al impactar
    // Eco (soporte o forja): repite ~0,5 s después al 50-60 % (una repetición no genera otra)
    if (!isEcho && base.echo > 0) {
      const sst = skStateOf(p, sk.id);
      sst.echo = { seq: (sst.echo?.seq || 0) + 1, n: 0 };
      this.timers.schedule(0.5, () => this.castSkillSlot(ctx.key, base.echo));
    } else if (!isEcho) {
      const sst = skStateOf(p, sk.id);
      sst.echo = { seq: (sst.echo?.seq || 0) + 1, n: 0 };
    }
    // estado de los verbos tras lanzar (combo y secuencia no avanzan con repeticiones)
    if (!isEcho && ctx.comboIdx >= 0) this._advanceCombo(p, sk, base);
    this.sfx?.(ctx.fx?.sfx || 'skill');
    return true;
  },

  // tras el impacto: robo de vida, Masacre, Estela, recurso del básico, verbos de llegada
  // (réplicas, onda, curas/escudos, cebos) y ⑦ afterCast
  _finishCast(ctx, res) {
    const { p, sk, prof, isEcho, isBasic } = ctx;
    const base = ctx.baseProf || prof;
    const def = base.def || sk;
    if (!ctx.lifestealDone && prof.lifesteal && res.dealt > 0) p.leech(res.dealt * prof.lifesteal / 100);
    if (!isEcho && !isBasic && base.cdhit && res.hits >= base.cdhit) {
      const reduced = cooldownWithMassacre(base);
      this.reduceCooldown(p, sk.id, Math.max(0, base.cd - reduced));
    }
    // Estela (zone): daña y, si la habilidad ralentiza (prof.slow), también ralentiza
    // (Paso 2c.2: el suelo helado de Nova Perpetua es la Estela de una Nova que ralentiza).
    // Daño por segundo: zonePct % del arma (con el rango y el saco aditivo) o el 45 % del golpe
    if (prof.zone && ctx.zoneCenter && this.spawnField) {
      const zp = base.zonePct || 0;
      const dps = zp > 0 ? p.avgHit(zp / 100 * rankCoef(base.rank), base.addPct) : ctx.avgHit * 0.45;
      this.spawnField('estela', { pos: ctx.zoneCenter, radius: Math.max(2, (ctx.zoneRad || 2) * 0.9), dur: prof.zoneDur, owner: p,
        maxPerSkill: base.zoneMax || 0,
        data: { dps, color: def.color || 0xff7733, skill: sk.id, slow: prof.slow > 0 ? prof.slow : 0, slowPct: prof.slowPct || 30 } });
    }
    // recurso de los básicos no-arma (Mandoble/Embate): solo si golpean (+extra por objetivo)
    if (isBasic && !isEcho && res.hits > 0) {
      let add = base.gen;
      if (base.genPerExtra && res.hits > 1) add = Math.min(Math.max(base.genMax || 0, base.gen), add + base.genPerExtra * (res.hits - 1));
      gainResource(p, add);
    }
    // no básicos: recurso SOLO si golpea (Embestida +12, Provocación +15)
    if (!isBasic && !isEcho && base.genOnHit && res.hits > 0) gainResource(p, base.genOnHit);
    // ---- verbos al terminar (§3.6) ----
    const center = ctx.zoneCenter || p.pos.clone();
    // réplicas en el mismo punto (Terremoto; needPlanted: solo plantado). Una réplica es un
    // eco: no genera otra
    const rp = base.repeat;
    if (!isEcho && rp && rp.n > 0 && (!rp.needPlanted || p.planted)) {
      const rad = ctx.zoneRad || prof.radius || 2, c = center.clone();
      for (let i = 1; i <= rp.n; i++) {
        this.timers.schedule((rp.every || 0.5) * i, () => {
          if (!p.alive) return;
          this.dealArea(c, rad, ctx.coef * (rp.coef ?? 0.5), { ...ctx.areaOpts, from: c, hitExtra: { ...ctx.hitExtra, repeat: i, echo: true } });
          this.spawnRing?.(c, rad, ctx.color || 0xd8c49a);
        });
      }
    }
    // onda tras el golpe (Onda Sagrada): línea hacia la mira desde el centro del impacto, solo a
    // los que el impacto NO alcanzó (ctx.hitSet)
    if (def.wave && !isEcho) {
      const w = def.wave, dir = aimDir(p, ctx.target);
      const struck = ctx.hitSet ? new Set(ctx.hitSet) : null;
      const list = this.enemiesInLine(center, dir, w.range || 8, w.width || 2).filter(e => !struck?.has(e));
      for (const e of list) {
        const { dmg, crit } = p.rollDamage(ctx.coef * (w.coef ?? 0.6), prof.critBonus, prof.addPct, e, ctx.hitInfo);
        ctx.hit(e, e.takeDamage(dmg, crit, ctx.dmgOpts) || 0, center);
      }
      this.spawnBeam?.(center, center.clone().addScaledVector(dir, w.range || 8), ctx.color || 0xffe680, 0.2);
    }
    // escudo por enemigo golpeado (Corazón de Hielo: shieldGain [pct, máx] de la vida máx.)
    if (!isEcho && base.shieldGain && res.hits > 0) {
      const pct = Math.min(base.shieldGain[1] || Infinity, (base.shieldGain[0] || 0) * res.hits);
      if (pct > 0) this.shield(p.stats.maxHP * pct / 100, { target: 'self', dur: 6, src: `${sk.id}:gain` });
    }
    // cura y escudo al grupo al lanzar (Amanecer: heal { pct, radius } · shield { pct, radius, dur })
    if (!isEcho && def.heal?.pct > 0) this.heal(a => a.stats.maxHP * def.heal.pct / 100 * (base.buffMul || 1), { target: def.heal.target || 'all', radius: def.heal.radius || 8, pos: center, src: sk.id });
    if (!isEcho && def.shield?.pct > 0) this.shield(p.stats.maxHP * def.shield.pct / 100 * (base.buffMul || 1), { target: 'all', radius: def.shield.radius || 8, dur: def.shield.dur || 6, pos: center, src: `${sk.id}:shield` });
    // señuelo (lure de la habilidad: Señuelo de Zarzas)
    if (!isEcho && def.lure && this.spawnField) {
      this.spawnField('senuelo', { pos: center, radius: def.lure.radius || 8, dur: def.lure.dur || 6, owner: p, data: { lure: { ...def.lure }, skill: sk.id } });
    }
    // detonar al impactar un área o al llegar (las de proyectil detonan en su impacto)
    if (base.detonate && !ctx.sk.type?.startsWith('proj') && !['leap', 'dash', 'blink'].includes(ctx.sk.type)) this.detonateAt(p, center, base.detonate, { skill: sk.id });
    // reinicio al matar (killReset)
    if (!isEcho && base.killReset && res.killed > 0) this.reduceCooldown(p, sk.id, Infinity);
    // relanzar: abre o avanza la cadena (no con repeticiones)
    if (!isEcho && base.recast) {
      if (base.recast.cond === 'hit') this._recastAfter(p, sk, base, ctx, res);
      else if (ctx._rcChain) {
        // la cadena se abrió/avanzó al lanzar (_recastCommit): aquí suma los golpes y, si este
        // era el último uso, cierra con ⑭ (los golpes de un proyectil llegan al impactar)
        const rc = ctx._rcChain;
        rc.hits += res.hits || 0;
        if (ctx._closeChain) this._skillEnd(p, sk, { kind: 'recast', reason: ctx._closeChain, casts: rc.casts, hits: rc.hits, released: false, frac: 0, perfect: false });
      }
    }
    if (!isEcho) firePower('afterCast', p, this, p, ctx.cast, res);
  },

  // llegada de un salto/avance/parpadeo: plantado, provocación y detonación (§3.6)
  _arrive(ctx, from) {
    const { p, sk, prof } = ctx;
    if (sk.plant) p.plantNow?.();
    // sin daño al llegar no hay golpes que provoquen (applyHitEffects): provoca el radio
    if (prof.taunt > 0 && !(ctx.coef > 0)) {
      const r = (prof.radius || 2) + 0.5;
      for (const e of this.enemies || []) if (e.alive && e.pos.distanceTo(p.pos) <= r) e.applyCC?.('taunt', prof.taunt, { src: p });
    }
    const det = (ctx.baseProf || prof).detonate;
    if (det) this.detonateAt(p, p.pos, det, { skill: sk.id });
    // estela del avance (Sendero de Luz): campo en línea del inicio al final
    const tr = (ctx.baseProf || prof).trail;
    if (tr && from && this.spawnField) {
      const a = from.clone().setY(0), b = p.pos.clone().setY(0);
      const mid = a.clone().add(b).multiplyScalar(0.5);
      this.spawnField(tr.field || 'zona', { pos: mid, radius: Math.max(0.5, a.distanceTo(b) / 2), dur: tr.dur || 4, owner: p, shape: 'line', a, b, width: tr.width || 1.5,
        maxPerSkill: (ctx.baseProf || prof).zoneMax || 0,
        data: { dps: (tr.coef || 0) > 0 ? p.avgHit(tr.coef * (prof.coef / Math.max(1e-6, sk.coef || prof.coef || 1)), prof.addPct) : 0,
          healPct: tr.heal || 0, color: ctx.color || 0xffe680, skill: sk.id, tags: prof.tags } });
    }
  },

  // pulsos de un buff o aura (Ciudadela): cada `every` s mientras `alive()`; provoca a los
  // enemigos del radio y/o los golpea con coef
  _startPulses(ctx, posFn, alive) {
    const pulse = ctx.sk.pulse;
    const every = Math.max(0.1, pulse.every || 1);
    const tick = () => {
      if (!alive() || !ctx.p.alive) return;
      const pos = posFn();
      const r = pulse.radius || 6;
      if (pulse.taunt > 0) for (const e of this.enemies || []) if (e.alive && e.pos.distanceTo(pos) <= r) e.applyCC?.('taunt', pulse.taunt, { src: ctx.p });
      if (pulse.coef > 0) this.dealArea(pos, r, ctx.coef * pulse.coef / Math.max(1e-6, ctx.sk.coef || 1), { ...ctx.areaOpts, from: pos });
      this.timers.schedule(every, tick);
    };
    this.timers.schedule(every, tick);
  },

  // ---------------- enfriamientos y cargas (D2) ----------------
  // pone el enfriamiento de una habilidad (o gasta una carga). cdOnEnd: la recarga empieza al
  // acabar el efecto (Piel de Hierro); cdFloor: suelo de reducción por recarga (definitivas)
  _startCooldown(p, id, prof) {
    const def = prof.def || {};
    const cd = prof.cd;
    p._cdRed = p._cdRed || {}; p._cdRed[id] = 0;
    if (prof.charges > 1) {
      const ch = this._syncCharges(p, id, prof);
      ch.n = Math.max(0, ch.n - 1);
      if (ch.nextAt == null) ch.nextAt = (p.simT || 0) + cd;
      p.cdMax[id] = cd;
      this._syncCharges(p, id, prof);
      return;
    }
    const hold = def.cdOnEnd && prof.dur > 0 ? prof.dur : 0;
    if (hold > 0) (p._cdHold || (p._cdHold = {}))[id] = (p.simT || 0) + hold;
    p.cds[id] = cd + hold;
    p.cdMax[id] = cd + hold;
  },
  // cargas de enfriamiento (p.skCharges[id] = { n, max, nextAt }, recarga PEREZOSA con simT).
  // Deja p.cds[id] = 0 si hay carga o el tiempo hasta la siguiente (la UI sigue leyendo p.cds)
  _syncCharges(p, id, prof = null) {
    const pr = prof || resolveSkill(p, p.cls.skills.find(s => s.id === id));
    const max = Math.max(1, pr?.charges || 1);
    const all = p.skCharges || (p.skCharges = {});
    const ch = all[id] || (all[id] = { n: max, max, nextAt: null });
    if (ch.max !== max) { ch.n = Math.min(max, ch.n + Math.max(0, max - ch.max)); ch.max = max; }
    const cd = Math.max(0.05, pr?.cd || 0.05);
    const now = p.simT || 0;
    while (ch.n < ch.max && ch.nextAt != null && now >= ch.nextAt - 1e-9) {
      ch.n++;
      ch.nextAt = ch.n < ch.max ? ch.nextAt + cd : null;
    }
    if (ch.n >= ch.max) ch.nextAt = null;
    p.cds[id] = ch.n > 0 ? 0 : Math.max(0, (ch.nextAt ?? now) - now);
    return ch;
  },
  // ÚNICA vía para RESTAR enfriamiento (D2): respeta las cargas (adelanta la siguiente), la
  // recarga al acabar (cdOnEnd: no corre mientras dura el efecto) y el suelo cdFloor
  // (fracción de la base que ninguna reducción baja por recarga). s = Infinity: lista ya.
  reduceCooldown(p, id, s) {
    p = p || this.player;
    if (!p || !id || !(s > 0)) return 0;
    const sk = p.cls?.skills?.find(x => x.id === id);
    const prof = sk ? resolveSkill(p, sk) : null;
    if (p._cdHold?.[id] > (p.simT || 0)) {
      // durante el efecto solo se puede devolver ENTERO (reinicio explícito)
      if (s !== Infinity) return 0;
      delete p._cdHold[id];
    }
    let amount = s;
    const floor = prof?.def?.cdFloor;
    if (floor > 0 && floor < 1 && s !== Infinity) {
      const red = p._cdRed || (p._cdRed = {});
      const cap = (1 - floor) * (p.cdMax?.[id] || prof.cd || 0);
      amount = Math.max(0, Math.min(amount, cap - (red[id] || 0)));
      red[id] = (red[id] || 0) + amount;
      if (!(amount > 0)) return 0;
    }
    if (prof && prof.charges > 1) {
      const ch = this._syncCharges(p, id, prof);
      if (ch.nextAt == null) return 0;
      if (amount === Infinity) { ch.n = Math.min(ch.max, ch.n + 1); ch.nextAt = ch.n < ch.max ? (p.simT || 0) + prof.cd : null; }
      else ch.nextAt -= amount;
      this._syncCharges(p, id, prof);
      return amount;
    }
    const before = p.cds[id] || 0;
    p.cds[id] = amount === Infinity ? 0 : Math.max(0, before - amount);
    return before - p.cds[id];
  },

  // PONE una recarga de `s` segundos (API pública: Inquebrantable, «vuelve 15 s después»): la
  // ranura la muestra entera (p.cds y p.cdMax = s) y sustituye a la que hubiera, también a la que
  // esperaba al efecto (cdOnEnd). Con cargas, gasta una (si queda) y la siguiente llega en `s`
  // (las demás, con su recarga de siempre). → true si la puso
  startCooldown(p, id, s) {
    p = p || this.player;
    if (!p || !id || !(s > 0) || !Number.isFinite(s)) return false;
    const sk = p.cls?.skills?.find(x => x.id === id);
    if (!sk) return false;
    const prof = resolveSkill(p, sk);
    (p._cdRed || (p._cdRed = {}))[id] = 0;
    if (p._cdHold) delete p._cdHold[id];
    p.cdMax = p.cdMax || {};
    if (prof?.charges > 1) {
      const ch = this._syncCharges(p, id, prof);
      ch.n = Math.max(0, ch.n - 1);
      ch.nextAt = (p.simT || 0) + s;
      p.cdMax[id] = s;
      this._syncCharges(p, id, prof);
      return true;
    }
    p.cds[id] = s;
    p.cdMax[id] = s;
    return true;
  },

  // reinicia TODOS los enfriamientos y cargas (respec, cambio de especialización): la vía para
  // los módulos que hoy hacen p.cds = {} (test87)
  resetCooldowns(p) {
    p = p || this.player;
    if (!p) return;
    p.cds = {}; p.skCharges = {}; p._cdHold = {}; p._cdRed = {};
  },

  // ---------------- relanzar (§3.6) ----------------
  // sin condición, la cadena se abre o avanza AL LANZAR (la ventana no espera al impacto de un
  // proyectil); con cond:'hit', al terminar (_recastAfter), porque depende de si golpeó
  _recastCommit(p, sk, prof, ctx) {
    const sst = skStateOf(p, sk.id);
    const r = prof.recast;
    const now = p.simT || 0;
    const rc = ctx.rcState;
    if (!rc) {
      if (r.n < 2) { if (r.cdFrom === 'end') this._startCooldown(p, sk.id, prof); return; }
      sst.recast = { n: r.n, idx: 1, left: r.n - 1, until: now + r.win, win: r.win, casts: 1, hits: 0,
        lastAt: now, gap: r.gap, perfectLast: r.perfectLast, cond: r.cond, cdFrom: r.cdFrom, ticked: false, refresh: !!r.refresh };
      ctx._rcChain = sst.recast;
      this.emitFx?.(fxp('verbRecast'), p.pos.clone().setY(0.1));
      return;
    }
    rc.idx++; rc.left--; rc.casts++; rc.lastAt = now;
    ctx._rcChain = rc;
    if (rc.left <= 0) {
      if (sst.recast === rc) sst.recast = null;
      if (rc.cdFrom === 'end') this._startCooldown(p, sk.id, prof);
      ctx._closeChain = 'max';
    } else if (rc.refresh) { rc.until = now + rc.win; rc.ticked = false; }
  },
  _recastAfter(p, sk, prof, ctx, res) {
    const sst = skStateOf(p, sk.id);
    const r = prof.recast;
    const now = p.simT || 0;
    const rc = ctx.rcState;
    if (!rc) {
      // 1.er lanzamiento: abre la cadena (con cond:'hit', solo si golpeó)
      if (r.n < 2 || (r.cond === 'hit' && !(res.hits > 0))) { if (r.cdFrom === 'end') this._startCooldown(p, sk.id, prof); return; }
      sst.recast = { n: r.n, idx: 1, left: r.n - 1, until: now + r.win, win: r.win, casts: 1, hits: res.hits || 0,
        lastAt: now, gap: r.gap, perfectLast: r.perfectLast, cond: r.cond, cdFrom: r.cdFrom, ticked: false,
        refresh: r.refresh ?? r.cond === 'hit' };
      this.emitFx?.(fxp('verbRecast'), p.pos.clone().setY(0.1));
      return;
    }
    rc.idx++; rc.left--; rc.casts++; rc.hits += res.hits || 0; rc.lastAt = now;
    if (r.cond === 'hit' && !(res.hits > 0)) { this._endRecast(p, sk, 'miss'); return; }
    if (rc.left <= 0) { this._endRecast(p, sk, 'max'); return; }
    if (rc.refresh) { rc.until = now + rc.win; rc.ticked = false; }
  },
  _endRecast(p, sk, reason) {
    const sst = skStateOf(p, sk.id);
    const rc = sst.recast;
    if (!rc) return;
    sst.recast = null;
    const prof = resolveSkill(p, sk);
    if (rc.cdFrom === 'end') this._startCooldown(p, sk.id, prof);
    this._skillEnd(p, sk, { kind: 'recast', reason, casts: rc.casts, hits: rc.hits, released: false, frac: 0, perfect: false });
  },

  // ---------------- combo (§3.6) ----------------
  _advanceCombo(p, sk, prof) {
    const def = prof.def || sk;
    const n = def.steps?.length || 0;
    const cs = skStateOf(p, sk.id).combo || (skStateOf(p, sk.id).combo = { idx: 0, until: 0 });
    const done = cs.idx >= n - 1;
    cs.idx = done ? 0 : cs.idx + 1;
    cs.until = (p.simT || 0) + prof.comboWin;
    if (done) this._skillEnd(p, sk, { kind: 'combo', reason: 'done', casts: n, hits: 0, released: false, frac: 0, perfect: false });
    else if (cs.idx === n - 1) this.sfx?.('verb_pip');      // el último paso queda listo
  },
  // fija el paso del combo (1-based): Caída Brutal salta al 3.º tras caer
  setComboStep(p, id, n) {
    p = p || this.player;
    const sk = p?.cls?.skills.find(s => s.id === id);
    if (!sk) return false;
    const prof = resolveSkill(p, sk);
    const steps = prof.def?.steps?.length || 0;
    if (!steps) return false;
    const cs = skStateOf(p, id).combo || (skStateOf(p, id).combo = { idx: 0, until: 0 });
    cs.idx = Math.max(0, Math.min(steps - 1, Math.floor(n) - 1));
    cs.until = (p.simT || 0) + prof.comboWin;
    if (cs.idx === steps - 1) this.sfx?.('verb_pip');
    return true;
  },

  // ---------------- secuencia del básico (§3.6) ----------------
  // cuenta un ataque; → { idx (1…every), nth (es el N-ésimo) }
  seqAdvance(p, sk) {
    p = p || this.player;
    const prof = resolveSkill(p, sk);
    const every = Math.max(2, prof.def?.seq?.every || 3);
    const ss = skStateOf(p, sk.id).seq || (skStateOf(p, sk.id).seq = { count: 0 });
    ss.count++;
    const idx = ((ss.count - 1) % every) + 1;
    if (idx === every - 1) this.sfx?.('verb_pip');          // el siguiente es el especial
    return { idx, nth: idx === every };
  },
  setSeqCount(p, id, n) {
    p = p || this.player;
    const ss = skStateOf(p, id).seq || (skStateOf(p, id).seq = { count: 0 });
    ss.count = Math.max(0, Math.floor(n));
    return true;
  },

  // ---------------- posturas (§3.6) ----------------
  _castStance(p, sk, prof, key, isEcho) {
    if (isEcho) return false;
    const def = prof.def || sk;
    const S = def.stance || {};
    const modes = S.modes || [];
    if (!modes.length) return false;
    const sst = skStateOf(p, sk.id);
    const cur = sst.stance?.mode ?? null;
    const prevId = cur != null ? modes[cur]?.id : null;
    let next;
    if (modes.length === 1) {
      if (cur != null && S.recastEnds !== false) { this._endStance(p, sk, 'recast'); return true; }
      next = 0;
    } else next = cur == null ? 0 : (cur + 1) % modes.length;
    const cast = { sk: prof.def || sk, prof, slot: key, target: null, enemy: null, stance: modes[next].id, stanceFrom: prevId };
    if (firePower('onCast', p, this, p, cast) === false) return false;
    if (!spendResource(p, prof.cost)) { this.ui?.message?.(`${p.cls.resource?.name || 'Recurso'} insuficiente`); return false; }
    // enfriamiento: el del cambio (swapCd) si alternas entre dos; si no, el de la habilidad
    const swap = modes.length === 2 && cur != null && S.swapCd != null;
    if (swap) { p._cdRed = p._cdRed || {}; p._cdRed[sk.id] = 0; p.cds[sk.id] = S.swapCd; p.cdMax[sk.id] = S.swapCd; }
    else this._startCooldown(p, sk.id, prof);
    if ((S.swapGcd ?? 0) > 0 && prof.gcd) p.gcdT = Math.max(p.gcdT || 0, S.swapGcd);
    const dur = S.dur ?? (prof.dur || 0);
    const now = p.simT || 0;
    sst.stance = { mode: next, until: dur > 0 ? now + dur : Infinity, both: sst.stance?.both || false, bothUntil: sst.stance?.bothUntil || 0 };
    const m = modes[next];
    if (m.moveMul != null && m.moveMul !== 1) p.setMoveMul(`stance:${sk.id}`, m.moveMul); else p.clearMoveMul?.(`stance:${sk.id}`);
    p._vstats = null;
    this.sfx?.('verb_stance');
    this.emitFx?.(fxp('verbStance'), p.pos.clone().setY(0.1));
    firePower('afterCast', p, this, p, cast, { hits: 0, dealt: 0, killed: 0 });
    return true;
  },
  _endStance(p, sk, reason) {
    const sst = skStateOf(p, sk.id);
    if (!sst.stance || sst.stance.mode == null) return false;
    sst.stance = null;
    p.clearMoveMul?.(`stance:${sk.id}`);
    p._vstats = null;
    this.sfx?.('verb_stance');
    this._skillEnd(p, sk, { kind: 'stance', reason, casts: 1, hits: 0, released: reason === 'recast', frac: 0, perfect: false });
    return true;
  },
  // modo actual de una postura (id del modo) o null
  stanceOf(p, id) {
    p = p || this.player;
    const st = p?.skState?.[id]?.stance;
    if (!st || st.mode == null) return null;
    const sk = p.cls?.skills.find(s => s.id === id);
    const modes = sk ? (resolveSkill(p, sk).def?.stance?.modes || []) : [];
    return modes[st.mode]?.id ?? null;
  },
  // las DOS posturas a la vez durante `dur` s (Guardia Total)
  setStanceBoth(p, id, dur) {
    p = p || this.player;
    const sst = skStateOf(p, id);
    if (!sst.stance) sst.stance = { mode: 0, until: Infinity };
    sst.stance.both = true;
    sst.stance.bothUntil = (p.simT || 0) + Math.max(0, dur || 0);
    p._vstats = null;
    this.sfx?.('verb_stance');
    return true;
  },
  // modos activos de todas las posturas (los lee Player.verbStats)
  activeStanceModes(p) {
    p = p || this.player;
    const out = [];
    for (const [id, st] of Object.entries(p?.skState || {})) {
      const s = st?.stance;
      if (!s || s.mode == null) continue;
      const sk = p.cls?.skills.find(x => x.id === id);
      if (!sk) continue;
      const modes = resolveSkill(p, sk).def?.stance?.modes || [];
      if (s.both && (p.simT || 0) < s.bothUntil) out.push(...modes);
      else if (modes[s.mode]) out.push(modes[s.mode]);
    }
    return out;
  },

  // ---------------- marcas (§3.6) ----------------
  // pone la marca del perfil (prof.mark) en `e`; mark.count/radius: también a los cercanos
  // (una vez por instante); mark.weakPct: Debilidad mientras dura (Sentencia)
  applyMark(e, prof, p = null) {
    p = p || this.player;
    const m = prof?.mark;
    if (!e?.alive || !m) return null;
    const id = m.id || prof.id;
    const put = (en) => {
      en.marks = en.marks || {};
      en.marks[id] = { id, t: m.dur || 8, by: p, skill: prof.id, uses: Math.max(1, m.uses || 1), detonate: m.detonate || null,
        firstCharged: m.firstCharged || null };
      if (m.weakPct > 0) en.applyWeakness?.(`mark:${id}`, m.weakPct, m.dur || 8);
    };
    put(e);
    if (m.count > 1 && m.radius > 0) {
      const key = `${prof.id}@${p?.simT}`;
      if (this._markSpread !== key) {
        this._markSpread = key;
        const others = (this.enemies || []).filter(o => o !== e && o.alive && o.pos.distanceTo(e.pos) <= m.radius)
          .sort((a, b) => a.pos.distanceToSquared(e.pos) - b.pos.distanceToSquared(e.pos)).slice(0, m.count - 1);
        for (const o of others) put(o);
      }
    }
    return e.marks[id];
  },
  marksOf(e) { return Object.values(e?.marks || {}).filter(m => m && m.t > 0); },
  // ALARGA una marca viva (API pública: Condena, «tus marcas duran el doble»): t = t × mul + add,
  // y su Debilidad (mark.weakPct) dura lo mismo. Con t ≤ 0 se van la marca y su Debilidad. → la marca o null
  extendMark(e, markId, { mul = 1, add = 0 } = {}) {
    const m = e?.marks?.[markId];
    if (!m || !(m.t > 0)) return null;
    m.t = m.t * Math.max(0, Number.isFinite(mul) ? mul : 1) + (Number.isFinite(add) ? add : 0);
    if (!(m.t > 0)) {
      delete e.marks[markId];
      if (e.debuffs) delete e.debuffs[`mark:${markId}`];   // su Debilidad se va con ella
      return null;
    }
    const wk = e.debuffs?.[`mark:${markId}`];
    if (wk && e.applyWeakness) e.applyWeakness(`mark:${markId}`, wk.pct, m.t);
    return m;
  },
  // detona a mano una marca (poderes): consume un uso y, con opts.dmg, hace ese daño (proc)
  detonateMark(e, id, opts = {}) {
    const m = e?.marks?.[id];
    if (!m || !(m.t > 0)) return false;
    if (--m.uses <= 0) delete e.marks[id];
    if (opts.dmg > 0) this.dealProcDamage(e, opts.dmg, { source: `mark:${id}`, skill: opts.skill || m.skill });
    return true;
  },
  // ¿este golpe detona una marca? (lo pregunta Player.rollDamage) → pct al saco aditivo.
  // La habilidad que puso la marca no la detona; los procs y los DoT tampoco.
  markDetonation(e, hit) {
    if (!e?.marks || !hit?.skill || hit.proc || hit.dot) return 0;
    let pct = 0;
    for (const [id, m] of Object.entries(e.marks)) {
      if (!m || !(m.t > 0) || !m.detonate || m.skill === hit.skill) continue;
      if (!matchSel(m.detonate.by, hit)) continue;
      pct += m.detonate.pct || 0;
      if (--m.uses <= 0) delete e.marks[id];
      e._detPending = true;
    }
    return pct;
  },

  // ---------------- cargar y soltar (§3.6, §3.6.1) ----------------
  _beginCharge(ctx) {
    const { p, prof, key, sk } = ctx;
    const ch = prof.charge;
    const toggle = this.settings?.holdMode === 'toggle' || ch.toggle === true;
    this._charging = { key, id: sk.id, sk, prof, ch, ctx, u: 0, t: 0, t0: p.simT || 0, frac: 0, inWindow: false, toggle,
      window: ch.perfect, max: ch.max, min: ch.min, tickWall: wallNow(this), simPerWall: 1, release: null };
    if (ch.moveMul != null && ch.moveMul !== 1) p.setMoveMul('charge', ch.moveMul);
    p.castPose?.(sk.type);
    return true;
  },
  // velocidad de carga: la de la habilidad × posturas (no al básico) × velocidad de ataque (básico)
  _chargeSpeed(c) {
    const p = this.player;
    let s = c.ch.speed || 1;
    const basic = (c.prof.def || c.sk).cat === 'basic';
    if (basic) s *= (p.cls.atkTime || 1) / Math.max(0.05, p.stats.atkTime || 1);
    else for (const m of this.activeStanceModes(p)) if (m.chargeSpeed) s *= 1 + m.chargeSpeed / 100;
    return Math.max(0.05, s);
  },
  // suelta (input.js en keyup / flanco de e.buttons, el sondeo y h.release): se RESUELVE en el
  // tick siguiente sumando lo transcurrido desde el último tick (no se pierde un frame).
  // También suelta un canal mantenido de esa ranura y limpia _needsRelease.
  releaseSkillSlot(slot, { force = false } = {}) {
    if (this._needsRelease) this._needsRelease[slot] = false;
    const c = this._charging;
    // con la partida en pausa (panel abierto con el ratón) la suelta CANCELA sin coste (§3.6.1)
    if (c && c.key === slot && this._paused) { this._endCharge('panel'); if (this.player) this.player.castLock = 0; return true; }
    if (c && c.key === slot && (!c.toggle || force) && !c.release) {
      const elapsed = Math.max(0, Math.min(0.1, (wallNow(this) - c.tickWall) / 1000));
      c.release = { u: Math.min(c.max, c.u + elapsed * c.simPerWall * this._chargeSpeed(c)), reason: 'release' };
      return true;
    }
    const inst = this._channel;
    if (inst && inst.ctx.key === slot && inst.hold) { this._endChannel(inst, true, 'release'); return true; }
    return false;
  },
  // termina la carga SIN coste (esquiva, panel, pausa, blur, golpe fuerte, control duro)
  _endCharge(reason = 'cancel') {
    const c = this._charging;
    if (!c) return false;
    this._charging = null;
    const p = this.player;
    p?.clearMoveMul?.('charge');
    this._skillEnd(p, c.sk, { kind: 'charge', reason, casts: 0, hits: 0, released: false, frac: c.frac || 0, perfect: false });
    return true;
  },
  // resuelve una suelta con la carga `u`: coste, enfriamiento, perfecto y lanzamiento
  _releaseWith(ctx, u, reason, { instant = false } = {}) {
    const { p, prof, sk } = ctx;
    const ch = prof.charge;
    // soltar ANTES del mínimo declarado (charge.min > 0: minHold) no dispara: cancela sin coste,
    // como la esquiva (⑭ con reason 'early'). Sin min declarado o con min 0, un toque dispara
    // al mínimo (Martillo de Guerra, Cuerda Tensa)
    if (reason === 'release' && !instant && !ctx.isEcho && ch.minHold && u < ch.min - 1e-9) {
      if (this._charging?.ctx === ctx) this._endCharge('early');
      return false;
    }
    const c = this._charging;
    if (c && c.ctx === ctx) { this._charging = null; p.clearMoveMul?.('charge'); }
    // Punto Débil (mark.firstCharged): la primera carga contra él es perfecta (+pct). Una suelta
    // por debajo de charge.markMin (un toque del básico tensable) ni la gasta ni la fuerza
    let firstPct = 0;
    const tgt = this.nearestEnemy?.(3, ctx.target) || ctx.enemy;
    if (tgt?.marks && !(u < (ch.markMin || 0) - 1e-9)) {
      for (const [id, m] of Object.entries(tgt.marks)) {
        if (!m?.firstCharged || !(m.t > 0) || m.by !== p) continue;
        ctx.cast.forcePerfect = true;
        firstPct += typeof m.firstCharged === 'number' ? m.firstCharged : 0;
        if (--m.uses <= 0) delete tgt.marks[id];
        break;
      }
    }
    const rel = chargeRelease(ch, u, { def: prof.def || sk, forcePerfect: !!ctx.cast.forcePerfect, perfectAlways: (p.stats?.perfectAlways || p.powerStats?.perfectAlways || 0) > 0 });
    // carga completa con `full` (Tres Saetas): otra cuenta/abanico y coef por proyectil
    const charge = { ...rel, addPct: rel.addPct + firstPct, fullDef: ch.full ? { count: ch.full.count, spread: ch.full.spread ?? prof.spread } : null };
    if (ch.full && rel.full) charge.coefMul *= ch.full.coefMul ?? 1; else charge.full = false;
    ctx.cast.charge = { t: rel.u, frac: rel.frac };
    ctx.cast.perfect = rel.perfect;
    // el ctx se rehace con la carga (coef, radio, alcance, perfecto)
    const ctx2 = this._makeCtx(p, sk, prof, ctx.key, ctx.cast, { target: ctx.target, near: ctx.enemy, isEcho: ctx.isEcho,
      echoMult: ctx.isEcho ? (ctx.coef / Math.max(1e-6, prof.coef)) : 0, comboIdx: ctx.comboIdx, fieldDest: ctx.fieldDest, destRange: ctx.destRange, rcState: ctx.rcState, charge,
      origin: ctx.origin });
    if (ctx.isEcho) ctx2.coef = ctx.coef * (charge.coefMul || 1);
    // feedback del borde (D26): perfecto o fuera de la ventana; la racha de perfectos
    if (!ctx.isEcho) {
      if (rel.perfect) {
        p.perfectStreak = (p.perfectStreak || 0) + 1;
        this.sfx?.('verb_perfect');
        this.ui?.spawnText?.(p.pos.clone().setY(2.2), '¡Perfecto!', 'txt-crit');
        this.emitFx?.(fxp('verbPerfect'), p.pos.clone().setY(1.2));
        for (const [gid, n] of Object.entries(ch.perfectGauge || {})) gainGauge(p, gid, n);
      } else if (!instant) {
        p.perfectStreak = 0;
        this.sfx?.('verb_miss');
      }
    }
    // básico de arma tensable: dispara con la carga
    let ok;
    if ((prof.def || sk).type === 'weapon') {
      this.castBasic({ charge: { t: rel.u, frac: rel.frac, perfect: rel.perfect, coefMul: charge.coefMul, addPct: charge.addPct } });
      ok = true;
    } else {
      if (!ctx.isEcho && prof.gcd && !ctx.rcState) p.gcdT = GCD;
      ok = this._commitCast(ctx2);
    }
    if (!ctx.isEcho) {
      if (reason === 'auto' && !ch.repeat && !instant) (this._needsRelease || (this._needsRelease = {}))[ctx.key] = true;
      this._skillEnd(p, sk, { kind: 'charge', reason, casts: 1, hits: 0, released: reason === 'release', frac: rel.frac, perfect: rel.perfect });
    }
    return ok;
  },

  // §3.6.1: bucle de los botones del ratón MANTENIDOS (Game.tick antes de p.update; el arnés
  // lo llama igual). WASD+ratón: relanza 🖱️Izq/🖱️Der mientras sigan pulsados (las recargas
  // regulan la cadencia), salvo la ranura que carga, canaliza o espera a que sueltes tras una
  // suelta automática (_needsRelease). Clic-mover: solo tensa el básico tensable sobre el
  // enemigo que atacas.
  heldSlotBusy(slot) {
    return this._charging?.key === slot || this._channel?.ctx?.key === slot || !!this._needsRelease?.[slot];
  },
  pumpHeldSlots() {
    const p = this.player, held = this.input?.mouseHeld;
    if (!p || !held) return;
    if ((this.settings?.controlScheme || 'wasd') !== 'click') {
      if (held.l && !this.heldSlotBusy('lmb')) this.castSkillSlot('lmb');
      if (held.r && !this.heldSlotBusy('rmb')) this.castSkillSlot('rmb');
    } else if (held.l && !this.heldSlotBusy('lmb') && p.attackTarget?.alive && this.basicTensable()
      && p.pos.distanceTo(p.attackTarget.pos) <= (p.cls.atkRange || 2) + 0.5) this.castSkillSlot('lmb');
  },

  // ---------------- avance por tick de los verbos (lo llama Player.update) ----------------
  tickSkillVerbs(dt) {
    const p = this.player;
    if (!p) return;
    const now = p.simT || 0;
    // carga en curso: avanza con el dt de simulación (el hit-stop la congela igual)
    const c = this._charging;
    if (c) {
      const wall = wallNow(this);
      const wdt = (wall - c.tickWall) / 1000;
      c.simPerWall = wdt > 1e-4 ? Math.max(0, Math.min(1, dt / wdt)) : 1;
      c.tickWall = wall;
      if (c.release) this._releaseWith(c.ctx, c.release.u, c.release.reason);
      else {
        c.t += dt;
        c.u = Math.min(c.max, c.u + dt * this._chargeSpeed(c));
        c.frac = c.max > c.min ? Math.max(0, (c.u - c.min) / (c.max - c.min)) : 1;
        const [a, b] = c.window;
        const inWin = c.u >= a - 1e-9 && c.u <= b + 1e-9;
        if (inWin && !c.inWindow) { this.sfx?.('verb_win'); this.emitFx?.(fxp('verbWindow'), p.pos.clone().setY(1.4)); }
        c.inWindow = inWin;
        if (!c.toggle && !this.slotHeld(c.key)) c.release = { u: c.u, reason: 'release' };
        else if (c.ch.autoRelease && c.u >= c.max - 1e-9) this._releaseWith(c.ctx, c.u, 'auto');
        if (this._charging === c && c.release) this._releaseWith(c.ctx, c.release.u, c.release.reason);
      }
    }
    // _needsRelease: el sondeo limpia las ranuras que ya no están pulsadas
    if (this._needsRelease) for (const s of Object.keys(this._needsRelease)) if (this._needsRelease[s] && !this.slotHeld(s)) this._needsRelease[s] = false;
    // avance lento (dashT)
    if (p.dashMove) {
      const d = p.dashMove;
      d.t += dt;
      if (d.step(dt) || d.t >= d.dur + 0.5) { p.dashMove = null; try { d.onArrive?.(); } catch (err) { console.warn('[avance] llegada', err); } }
    }
    // relanzar, combo y postura de cada habilidad
    for (const [id, st] of Object.entries(p.skState || {})) {
      if (!st) continue;
      const rc = st.recast;
      if (rc) {
        if (this._charging?.id === id) rc.until += dt;          // la ventana no corre mientras se carga
        if (rc.perfectLast > 0 && !rc.ticked && rc.until - now <= rc.perfectLast + 1e-9) { rc.ticked = true; this.sfx?.('verb_tick'); }
        if (now > rc.until + 1e-9) { const sk = p.cls.skills.find(s => s.id === id); if (sk) this._endRecast(p, sk, 'timeout'); else st.recast = null; }
      }
      const cs = st.combo;
      if (cs && cs.idx > 0 && now > cs.until) {
        cs.idx = 0;
        const sk = p.cls.skills.find(s => s.id === id);
        if (sk) this._skillEnd(p, sk, { kind: 'combo', reason: 'timeout', casts: 0, hits: 0, released: false, frac: 0, perfect: false });
      }
      const ss = st.stance;
      if (ss && ss.mode != null) {
        const sk = p.cls.skills.find(s => s.id === id);
        if (!sk || !isKnown(p, sk)) { if (sk) this._endStance(p, sk, 'spec'); else st.stance = null; }
        else if (now >= ss.until) this._endStance(p, sk, 'end');
        else if (ss.both && now >= ss.bothUntil) { ss.both = false; p._vstats = null; }
      }
    }
  },
  // ¿una preparación o carga en curso deja caminar sin romper el plantado? (Sin Pausa)
  keepsPlanted() {
    return !!((this._windup && this._windup.ctx.prof?.keepPlanted) || (this._charging && this._charging.prof?.keepPlanted));
  },

  // ⑭ fin de un verbo: poderes onSkillEnd y el `end` del comportamiento de la habilidad
  _skillEnd(p, sk, end) {
    if (!p || !sk) return;
    try { if (sk.behavior && SKILL_BEHAVIORS[sk.behavior]?.end && end.kind !== 'channel') SKILL_BEHAVIORS[sk.behavior].end(this, p, { ctx: null, end }, end); } catch (err) { console.warn('[verbo] end', err); }
    if (p.hookIndex?.onSkillEnd) firePower('onSkillEnd', p, this, p, sk, end);
  },

  // la ESQUIVA cancela el windup (sin cobrar el coste), la canalización, la carga y las
  // posturas con endOnDodge
  cancelCast(reason = 'dodge') {
    const p = this.player;
    let any = false;
    if (this._windup) {
      this.timers.cancel(this._windup.id);
      this._windup = null;
      p?.clearMoveMul?.('windup');
      any = true;
    }
    if (this._channel) { this._endChannel(this._channel, true, reason === 'dodge' ? 'dodge' : reason); any = true; }
    if (this._charging) { this._endCharge(reason === 'dodge' ? 'dodge' : reason); any = true; }
    if (reason === 'dodge' && p) {
      for (const [id, st] of Object.entries(p.skState || {})) {
        if (!st?.stance || st.stance.mode == null) continue;
        const sk = p.cls.skills.find(s => s.id === id);
        if (sk && resolveSkill(p, sk).def?.stance?.endOnDodge) { this._endStance(p, sk, 'dodge'); any = true; }
      }
    }
    if (any && p) p.castLock = 0;
    return any;
  },
  // cancela SIN coste lo que se mantiene (carga y canal con mantener): blur, panel, pausa
  // (§3.6.1). reason: 'cancel' | 'panel' | 'cc'
  cancelHeld(reason = 'cancel') {
    let any = false;
    if (this._charging) { this._endCharge(reason); any = true; }
    const inst = this._channel;
    if (inst && (inst.hold || inst.toggle)) { this._endChannel(inst, true, reason); any = true; }
    if (this._needsRelease) this._needsRelease = {};
    if (any && this.player) this.player.castLock = 0;
    return any;
  },
  // un golpe fuerte interrumpe las canalizaciones y las habilidades `int:true`, y SIEMPRE
  // una carga (§3.6.1; sin coste). El llamador ya descarta al héroe imparable.
  interruptCast(reason = 'hit') {
    const c = this._channel, w = this._windup;
    let any = false;
    if (this._charging) { this._endCharge('interrupt'); any = true; }
    if ((c && c.ctx.prof?.interruptible) || (w && w.ctx.prof?.interruptible)) {
      if (this._windup && w?.ctx.prof?.interruptible) { this.timers.cancel(w.id); this._windup = null; this.player?.clearMoveMul?.('windup'); any = true; }
      if (c?.ctx.prof?.interruptible) { this._endChannel(c, true, reason === 'hit' ? 'interrupt' : reason); any = true; }
      if (this.player) this.player.castLock = 0;
    }
    return any;
  },
  _endChannel(inst, canceled, reason = null) {
    if (this._channel !== inst) return;
    this._channel = null;
    if (inst.timer) this.timers.cancel(inst.timer);
    const p = this.player;
    if (p) { p.castLock = 0; if (inst.unstoppable) p.unstoppableT = 0; p.clearMoveMul?.('channel'); }
    inst.endReason = reason || (canceled ? 'cancel' : 'done');
    inst.released = inst.endReason === 'release';
    // sin recurso (drain) hay que soltar antes de volver a canalizar, como tras una suelta automática
    if (inst.endReason === 'drain' && inst.ctx.key) (this._needsRelease || (this._needsRelease = {}))[inst.ctx.key] = true;
    inst.canceled = !!canceled;
    const cast = inst.ctx.cast;
    if (cast) { cast.endReason = inst.endReason; cast.released = inst.released; }
    const end = { kind: 'channel', reason: inst.endReason, casts: 1, hits: inst.ctx.res?.hits || 0, released: inst.released, frac: 0, perfect: false };
    try {
      if (inst.onEnd) inst.onEnd(inst, end);
      else { const b = inst.ctx.sk?.behavior; if (b) SKILL_BEHAVIORS[b]?.end?.(this, p, inst, end); }
    } catch (err) { console.warn('[canalización] end', err); }
    const esk = inst.ctx.cast?.sk || inst.ctx.sk;
    if (esk && p?.hookIndex?.onSkillEnd) firePower('onSkillEnd', p, this, p, esk, end);
    inst.done?.(inst.ctx.res);
  },
  // limpia windup/canalización/carga/salto/avance y el estado de los verbos (cambio de
  // mundo, muerte)
  resetCastState() {
    this._windup = null;
    this._channel = null;
    this._charging = null;
    this._needsRelease = {};
    const p = this.player;
    if (p) {
      p.castLock = 0; p.leap = null; p.dashMove = null; p.gcdT = 0; p.actionLockT = 0;
      p.skState = {}; p.moveMuls = {}; p._vstats = null;
    }
  },
};
