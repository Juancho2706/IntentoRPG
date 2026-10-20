// ============================================================
// CANAL DE LANZAMIENTO de habilidades (mixin de Game) — Paso 2b.0
// ============================================================
// docs/paso2-diseno.md §4.4 y §9.1. Un solo canal para todas las habilidades:
//   castSkillSlot(slot) → resolveSkill → gating (CD · GCD 0,2 s · bloqueo · coste)
//   → ⑦ onCast (puede cancelar sin coste) → windup (cancelable con la esquiva: NO
//   cobra el coste) → commit (cobra coste, pone CD) → efecto (comportamiento
//   registrado o TIPO GENÉRICO) → impacto (inmediato o con impactDelay sincronizado
//   con el VFX) → ⑦ afterCast.
// Tipos genéricos: melee · proj · area · cone · line · leap · dash · blink · shield
//   · taunt · zone · trap · mark · channel · buff (+ 'weapon' = Player.basicAttack).
// Las canalizaciones tic a tic van por el planificador (js/timers.js) y se
// interrumpen con la esquiva, al soltar la tecla o con un golpe > 10 % de la vida.
// Primitivas para poderes (§9.1.4): onPlayerHit ⑤, dealProcDamage, heal, shield,
// allies. Sin setTimeout (lo vigila test59). Se inyecta en Game.prototype.
// Paso 2b.2 — API para comportamientos de clase:
//   g.gainResource(p, n, opts?)       recurso de clase (Furia/Maná/Energía); ⑪ onResource
//   g.fireProjectile(ctx, opts)       un proyectil del perfil: crítico + Sangre Fría,
//                                     robo de vida, Encadenado, salpicadura y ctx.hit
//   g.startChannel(ctx, done, opts)   canalización por tics (soltar/esquivar/golpe la cortan)
// y en los tipos genéricos: sk.cadence (básicos), sk.gen (al lanzar) / genOnHit,
// proyectiles con final AL IMPACTAR (el básico da recurso al acertar), splash,
// hitDot, slowImmune/unstoppable (buff/canal), zonas con allyDr/projMissPct,
// provocación con daño saliente debilitado (weakenPct) y auras (campo 'aura').
// Paso 2c.2 — núcleo de la integración de talentos:
//   g.heal(n, { target, radius, pos })   curación de habilidad centrada en un PUNTO (pos)
//   g.shield(n, { …, dr })               escudo que además reduce el daño mientras aguanta
//   g.startChannel(ctx, done, { hold: false })  canalización que NO exige mantener la tecla
//   g.damageAlly(ally, n, opts)          ⑫ daño a un aliado del cooperativo (onAllyDamaged /
//                                        onAllyLethal: Vínculo, Intercesión, Bastión Eterno)
//   g.dotsOf(e, kind?) · g.hasDoT(e, kind) · g.dotRemaining(e, kind|source)
//   g.consumeDoT(e, kind|fn) → daño restante (lo quita) · g.replaceDoT(e, total, ticks, interval, source)
//                                        (sustituye sin integrar lo pendiente: «no se apila»)
//   g.onDotEnd(e, inst)                  ⑬ (lo llama timers.js al agotarse un DoT solo)
//   killStatus(e) (export)               estado del KillInfo (frozen/bleeding/burning/…)
//   CastInfo.weapon / CastInfo.forceCrit el básico de ARMA pasa por ⑦ onCast
//                                        (Player.basicAttack) y un onCast puede forzar el crítico
import * as THREE from 'three';
import { resolveSkill, isKnown, fitsSlot, GCD, cooldownWithMassacre } from './skill-resolve.js';
import { projFanOffset } from './skill-defs.js';
import { FIELD_DEFS } from './field-entities.js';
import { firePower, dealProcDamage as powerProcDamage, SKILL_BEHAVIORS } from './powers.js';
import { applyHitEffects, weaponBasicOf } from './entities.js';
import { canAfford, spendResource, gainResource } from './resources.js';
import { COLDBLOOD_CRIT, threatFromHeal } from './combat-math.js';
import { applyDoTInstance, dotsOf, dotRemaining, consumeDoTs, replaceDoTInstance, dotKindOf } from './timers.js';
import { SKILL_MODS } from './data.js';
import { SKILL_FX, SKILL_FX_PRESETS } from './fx-skills.js';

const SLOT_ACTION = { k1: 'skill1', k2: 'skill2', k3: 'skill3', k4: 'skill4' };
const DOT_COLORS = { poison: 0x7cff6a, burn: 0xff7722, bleed: 0xff4466 };
const fxp = x => (typeof x === 'string' ? (SKILL_FX_PRESETS[x] || x) : x);
const v3 = (x, z, y = 0) => new THREE.Vector3(x, y, z);

// ------------------------------------------------------------
// TIPOS GENÉRICOS: (g, ctx, done) → CastResult | undefined (si es diferido, llaman
// a done(res) al impactar). ctx = { p, sk, prof, key, target, enemy, coef, isEcho,
// hitInfo, color, fx, avgHit, res:{hits,dealt,killed}, hit(e, dealt) }
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
    const { dmg, crit } = p.rollDamage(ctx.coef, cb, prof.addPct, e, ctx.hitInfo);
    ctx.hit(e, e.takeDamage(dmg, crit, ctx.dmgOpts) || 0);
    if (prof.chain && e.alive) g.spawnChainBounce(e, Math.round(ctx.avgHit), prof.chain, [], 0xffbb44);
    p.onDealHit();
    if (crit && prof.windup > 0) g.hitStop?.('heavy');   // golpe pesado (Mandoble)
    g.spawnRing?.(e.pos, 0.8, 0xffbb44);
    g.emitFx(fxp(ctx.fx?.impact), e.pos.clone().setY(1.0));
    if (ctx.fx?.extra) g.emitFx(fxp(ctx.fx.extra), e.pos.clone().setY(0.1));
    return ctx.res;
  },

  area(g, ctx, done) {
    const { p, prof, sk, fx } = ctx;
    const atTarget = sk.at === 'target';
    const center = atTarget ? ctx.target.clone() : p.pos.clone();
    const rad = prof.radius || 2;
    if (atTarget) p.faceToward(center); else p.swing = 1;
    g.spawnRing?.(center, rad, ctx.color || 0xff6633);
    const impact = () => {
      const c = atTarget ? center : (ctx.followSelf ? p.pos.clone() : center);
      g.dealArea(c, rad, ctx.coef, ctx.areaOpts);
      ctx.zoneCenter = c; ctx.zoneRad = rad;
      const y = fx?.auraY ?? 1.0;
      if (fx?.impact) g.emitFx(fxp(fx.impact), c.clone().setY(0.3));
      if (fx?.aura) g.emitFx(fxp(fx.aura), c.clone().setY(atTarget ? 0.3 : y));
      if (fx?.extra) g.emitFx(fxp(fx.extra), c.clone().setY(atTarget ? 0.1 : 0.5));
      if (atTarget) g.addShake?.(sk.shake || 0.25);
      return done(ctx.res);
    };
    if (prof.impactDelay > 0) {
      // el daño llega CON el VFX: bola que cae y aterriza en impactDelay s
      if (atTarget && g.fxGroup) {
        try {
          const ball = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), new THREE.MeshBasicMaterial({ color: ctx.color || 0xff6633 }));
          ball.position.copy(center).setY(5);
          g.fxGroup.add(ball);
          g.fx.push({ mesh: ball, t: 0, dur: prof.impactDelay, fall: center.clone() });
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
    const dir = ctx.target.clone().sub(p.pos).setY(0);
    if (dir.lengthSq() < 1e-6) dir.set(Math.sin(p.group.rotation.y), 0, Math.cos(p.group.rotation.y));
    dir.normalize();
    p.faceToward(p.pos.clone().add(dir));
    p.swing = 1;
    const list = g.enemiesInCone(p.pos, dir, prof.radius || 3, prof.angle || 90);
    for (const e of list) {
      const cb = prof.critBonus + (prof.coldblood && e.slowT > 0 ? COLDBLOOD_CRIT : 0);
      const { dmg, crit } = p.rollDamage(ctx.coef, cb, prof.addPct, e, ctx.hitInfo);
      ctx.hit(e, e.takeDamage(dmg, crit, ctx.dmgOpts) || 0);
    }
    if (list.length) p.onDealHit();
    const front = p.pos.clone().addScaledVector(dir, (prof.radius || 3) * 0.6);
    ctx.zoneCenter = front; ctx.zoneRad = (prof.radius || 3) * 0.6;
    g.spawnRing?.(front, (prof.radius || 3) * 0.6, ctx.color || 0xffaa55);
    if (ctx.fx?.impact) g.emitFx(fxp(ctx.fx.impact), front.clone().setY(1.0));
    if (ctx.fx?.aura) g.emitFx(fxp(ctx.fx.aura), p.pos.clone().setY(1.0));
    return ctx.res;
  },

  line(g, ctx) {
    const { p, prof, sk } = ctx;
    const dir = ctx.target.clone().sub(p.pos).setY(0);
    if (dir.lengthSq() < 1e-6) dir.set(Math.sin(p.group.rotation.y), 0, Math.cos(p.group.rotation.y));
    dir.normalize();
    p.faceToward(p.pos.clone().add(dir));
    const len = prof.range || sk.length || 8;
    const list = g.enemiesInLine(p.pos, dir, len, prof.width || 2);
    for (const e of list) {
      const { dmg, crit } = p.rollDamage(ctx.coef, prof.critBonus, prof.addPct, e, ctx.hitInfo);
      ctx.hit(e, e.takeDamage(dmg, crit, ctx.dmgOpts) || 0);
    }
    if (list.length) p.onDealHit();
    const mid = p.pos.clone().addScaledVector(dir, len / 2);
    ctx.zoneCenter = mid; ctx.zoneRad = Math.max(1.5, (prof.width || 2));
    g.spawnBeam?.(p.pos, p.pos.clone().addScaledVector(dir, len), ctx.color || 0xd8c49a, 0.25);
    if (ctx.fx?.impact) g.emitFx(fxp(ctx.fx.impact), mid.clone().setY(0.3));
    return ctx.res;
  },

  // Proyectiles: el daño se tira AL IMPACTAR y el lanzamiento TERMINA al impactar
  // (básicos: con el primer impacto, así el recurso llega solo si aciertas; resto:
  // cuando todos resolvieron) o, si fallan o perforan, al agotar su alcance.
  proj(g, ctx, done) {
    const { p, prof, sk, fx } = ctx;
    p.faceToward(ctx.target);
    p.swing = 1;
    const count = prof.count + (prof.proj || 0);
    const baseAngle = Math.atan2(ctx.target.x - p.pos.x, ctx.target.z - p.pos.z);
    const muzzle = p.pos.clone().setY(1.0).add(v3(Math.sin(baseAngle) * 0.5, Math.cos(baseAngle) * 0.5));
    if (fx?.trail) g.emitFx(fxp(fx.trail), muzzle);
    else if (fx?.aura && !(prof.splash > 0)) g.emitFx(fxp(fx.aura), muzzle);
    const finish = () => done(ctx.res);
    const firstHit = ctx.isBasic && !ctx.isEcho;
    // sin escopetazo: si la habilidad dispara 1 proyectil de base, los extra
    // (Multiproyectil, Doble, Vendaval) no repiten impacto en el mismo enemigo
    const castHits = count > 1 && (sk.count || 1) <= 1 ? new Set() : null;
    let pending = count;
    for (let i = 0; i < count; i++) {
      const off = projFanOffset(i, count, prof.spread);
      let resolved = false;
      g.fireProjectile(ctx, {
        angle: baseAngle + off, castHits,
        onImpact: () => {
          if (firstHit) { finish(); return; }
          if (!prof.pierce && !resolved) { resolved = true; if (--pending <= 0) finish(); }
        },
      });
    }
    if (sk.beam) g.spawnBeam?.(muzzle, ctx.target.clone().setY(1.0), ctx.color || 0xffee66);
    ctx.lifestealDone = true; // el robo de los proyectiles va por impacto
    const range = prof.range || sk.range || 10;
    g.timers.schedule(range / Math.max(1, prof.speed || 14) + 0.05, finish);
    return undefined; // diferido: termina al impactar (o al agotar el alcance)
  },

  leap(g, ctx, done) {
    const { p, prof, sk } = ctx;
    const to = g.clampWalkable(p.pos, ctx.target, prof.range || sk.range || 8);
    p.faceToward(to);
    p.leap = {
      from: p.pos.clone(), to, t: 0, dur: sk.airT || prof.impactDelay || 0.45,
      onLand: () => {
        const rad = prof.radius || 3;
        g.spawnRing?.(p.pos, rad, ctx.color || 0xffcc66);
        if (ctx.coef > 0) g.dealArea(p.pos.clone(), rad, ctx.coef, ctx.areaOpts);
        ctx.zoneCenter = p.pos.clone(); ctx.zoneRad = rad;
        if (ctx.fx?.impact) g.emitFx(fxp(ctx.fx.impact), p.pos.clone().setY(0.7));
        g.addShake?.(sk.shake || 0.35);
        done(ctx.res);
      },
    };
    return undefined; // diferido: impacta al caer
  },

  dash(g, ctx) {
    const { p, prof, sk } = ctx;
    p.faceToward(ctx.target);
    const dir = ctx.target.clone().sub(p.pos).setY(0);
    const dist = Math.min(dir.length(), prof.range || sk.range || 7);
    if (dist > 0.1) {
      dir.normalize();
      let traveled = 0;
      while (traveled < dist) {
        const step = Math.min(0.3, dist - traveled);
        const nx = p.pos.x + dir.x * step, nz = p.pos.z + dir.z * step;
        if (!g.world?.grid?.walkable(nx, nz)) break;
        p.pos.x = nx; p.pos.z = nz;
        traveled += step;
        if (ctx.fx?.trail && traveled % 0.6 < 0.3) g.emitFx(fxp(ctx.fx.trail), v3(p.pos.x, p.pos.z, 0.9));
      }
    }
    const rad = prof.radius || 1.9;
    g.spawnRing?.(p.pos, rad, 0xffcc66);
    if (ctx.coef > 0) g.dealArea(p.pos.clone(), rad, ctx.coef, ctx.areaOpts);
    ctx.zoneCenter = p.pos.clone(); ctx.zoneRad = rad;
    if (prof.chain) { const ne = g.nearestEnemy(rad + 2); if (ne) g.spawnChainBounce(ne, Math.round(ctx.avgHit), prof.chain, [], 0xffcc66); }
    p.swing = 1;
    if (ctx.fx?.impact) g.emitFx(fxp(ctx.fx.impact), p.pos.clone().setY(0.7));
    return ctx.res;
  },

  blink(g, ctx) {
    const { p, prof, sk } = ctx;
    const to = g.clampWalkable(p.pos, ctx.target, prof.range || sk.range || 8);
    g.spawnRing?.(p.pos, 1.0, ctx.color || 0x99aaff);
    p.pos.x = to.x; p.pos.z = to.z;
    g.spawnRing?.(p.pos, 1.2, ctx.color || 0x99aaff);
    if (ctx.fx?.impact) g.emitFx(fxp(ctx.fx.impact), p.pos.clone().setY(1.0));
    ctx.zoneCenter = p.pos.clone(); ctx.zoneRad = 2;
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
      p.cds[sk.id] = 0;
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

  zone(g, ctx) {
    const { p, prof, sk } = ctx;
    const pos = sk.at === 'self' ? p.pos.clone() : ctx.target.clone();
    pos.y = 0;
    // coef de una zona = WD por segundo · allyDr/projMissPct: defensa de los aliados dentro
    g.spawnField('zona', { pos, radius: prof.radius || 3, dur: prof.dur || 4, owner: p,
      data: { dps: ctx.coef > 0 ? ctx.avgHit : 0, slow: prof.slow, slowPct: prof.slowPct, color: ctx.color, skill: sk.id, tags: prof.tags,
        allyDr: sk.allyDr ? Math.round(sk.allyDr * (prof.buffMul || 1)) : 0, projMissPct: sk.projMissPct || 0 } });
    ctx.zoneCenter = pos; ctx.zoneRad = prof.radius || 3;
    g.spawnRing?.(pos, prof.radius || 3, ctx.color || 0x9aa0a8);
    if (ctx.fx?.aura) g.emitFx(fxp(ctx.fx.aura), pos.clone().setY(0.6));
    if (ctx.fx?.extra) g.emitFx(fxp(ctx.fx.extra), pos.clone().setY(0.3));
    return ctx.res;
  },

  trap(g, ctx) {
    const { p, prof, sk } = ctx;
    g.spawnField('trampa', { pos: ctx.target.clone(), radius: prof.radius || 1.5, dur: sk.armT || 20, owner: p,
      data: { dmg: ctx.avgHit, root: prof.root, color: ctx.color, skill: sk.id } });
    return ctx.res;
  },

  mark(g, ctx) {
    const { prof, sk } = ctx;
    const e = ctx.enemy;
    if (!e || !e.alive) return ctx.res;
    const dur = prof.dur || 8;
    e.marks = e.marks || {};
    e.marks[sk.id] = { t: dur, by: ctx.p };
    if (sk.weakPct) e.applyWeakness(sk.id, sk.weakPct, dur);
    g.spawnRing?.(e.pos, 1.0, ctx.color || 0xcc88ff);
    ctx.res.hits = 1;
    return ctx.res;
  },

  // Canalización genérica (g.startChannel): cada tic golpea a un objetivo
  // PEGAJOSO (el mismo enemigo mientras siga vivo y a rango) o un área si la
  // habilidad tiene radio. Si declara `behavior` con tick (sin cast), ese tick
  // SUSTITUYE al golpe por defecto: type:'channel' + behavior conviven.
  channel(g, ctx, done) {
    const { p, prof, sk } = ctx;
    const beh = sk.behavior ? SKILL_BEHAVIORS[sk.behavior] : null;
    if (ctx.fx?.aura) g.emitFx(fxp(ctx.fx.aura), p.pos.clone().setY(1.0));
    return g.startChannel(ctx, done, {
      dur: sk.channelT || prof.dur || 2,
      ticks: sk.ticks,
      unstoppable: prof.unstoppable,
      onTick: beh?.tick ? (inst, interval) => beh.tick(g, p, inst, interval) : (inst, interval) => {
        if (prof.radius > 0) { g.dealArea(ctx.target.clone(), prof.radius, ctx.coef, ctx.areaOpts); return; }
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
      },
      onEnd: beh?.end ? (inst) => beh.end(g, p, inst) : null,
    });
  },

  buff(g, ctx) {
    const { p, prof, sk } = ctx;
    const meta = { name: sk.name, icon: sk.icon, desc: sk.desc };
    const targets = prof.tags.has('ally') ? g.allies(p.pos, sk.allyRadius || 15) : [p];
    for (const a of targets) {
      a.addBuff?.(sk.id, { ...prof.buff }, prof.dur, meta);
      if (prof.slowImmune) a.grantSlowImmune?.(prof.dur);           // Agilidad, Piel de Hierro
      if (prof.unstoppable) a.unstoppableT = Math.max(a.unstoppableT || 0, prof.dur);
    }
    g.spawnRing?.(p.pos, 1.4, ctx.color || 0x66ddff);
    if (ctx.fx?.aura) g.emitFx(fxp(ctx.fx.aura), p.pos.clone().setY(1.0));
    if (ctx.fx?.extra) g.emitFx(fxp(ctx.fx.extra), p.pos.clone().setY(0.2));
    return ctx.res;
  },

  // AURA en el suelo (Estandarte de Guerra): campo 'aura' a tus pies; cada 0,5 s
  // renueva el buff a los aliados en el radio y da resPerSec de recurso al dueño dentro.
  aura(g, ctx) {
    const { p, prof, sk } = ctx;
    const pos = (sk.at === 'target' ? ctx.target : p.pos).clone().setY(0);
    const rad = prof.radius || 8;
    const f = g.spawnField('aura', { pos, radius: rad, dur: prof.dur || 10, owner: p,
      data: { buff: { ...prof.buff }, buffId: sk.id, meta: { name: sk.name, icon: sk.icon, desc: sk.desc },
        resPerSec: (sk.resPerSec || 0) * (prof.buffMul || 1), color: ctx.color || sk.color || 0xd8a040 } });
    if (f) { try { FIELD_DEFS.aura.tick(g, f, 0); } catch { /* primer pulso: buff al instante */ } }
    ctx.zoneCenter = pos; ctx.zoneRad = rad;
    g.spawnRing?.(pos, rad, ctx.color || 0xd8a040);
    if (ctx.fx?.aura) g.emitFx(fxp(ctx.fx.aura), pos.clone().setY(0.2));
    if (ctx.fx?.extra) g.emitFx(fxp(ctx.fx.extra), pos.clone().setY(1.6));
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
  if (sk.type === 'weapon') return true;
  const b = sk.behavior ? SKILL_BEHAVIORS[sk.behavior] : null;
  return !!(b?.cast || GENERIC[sk.type]);
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
  // (efectos de rama/soporte), robo de vida, Encadenado (una vez por lanzamiento),
  // salpicadura (ctx.splashCoef en prof.radius, sin el objetivo directo) y VFX.
  // opts = { angle | to, speed, range, pierce, size, color, castHits:Set (sin escopetazo),
  //          onEnemy(e, dealt), onImpact(e, dealt) }
  fireProjectile(ctx, opts = {}) {
    const { p, prof, sk, fx } = ctx;
    const color = opts.color ?? ctx.color ?? sk.color ?? 0xffffff;
    let to = opts.to;
    if (!to) {
      const a = opts.angle ?? Math.atan2(ctx.target.x - p.pos.x, ctx.target.z - p.pos.z);
      to = p.pos.clone().add(v3(Math.sin(a) * 5, Math.cos(a) * 5));
    }
    const splashCoef = ctx.splashCoef || 0;
    this.spawnProjectile({
      from: p.pos.clone().setY(1.0), to: to.clone().setY(1.0),
      speed: opts.speed ?? prof.speed, range: opts.range ?? (prof.range || sk.range || 10),
      friendly: true, pierce: opts.pierce ?? prof.pierce, color, size: opts.size ?? sk.size ?? 0.14, castHits: opts.castHits || null,
      rollAt: e => p.rollDamage(ctx.coef, prof.critBonus + (prof.coldblood && e?.slowT > 0 ? COLDBLOOD_CRIT : 0), prof.addPct, e, ctx.hitInfo),
      ...ctx.dmgOpts,
      impactPreset: fxp(fx?.impact),
      onHit: (e, dealt) => {
        if (e?.alive && !ctx._chained && prof.chain) { ctx._chained = true; this.spawnChainBounce(e, Math.round(ctx.avgHit), prof.chain, [], color); }
        ctx.hit(e, dealt);
        if (prof.lifesteal && dealt > 0) p.leech(dealt * prof.lifesteal / 100);
        if (e && splashCoef > 0 && prof.radius > 0) {
          const at = e.pos.clone().setY(0);
          this.dealArea(at, prof.radius, splashCoef, { ...ctx.areaOpts, exclude: e });
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
  // opts = { dur, ticks, interval?, unstoppable, hold = true, onTick(inst, interval), onEnd(inst) }.
  // Soltar la tecla (salvo hold:false: Remolino Sangriento gira solo), la esquiva o un
  // golpe > 10 % de la vida (si es `int` y no eres imparable) la cortan. Termina
  // llamando a done(ctx.res).
  startChannel(ctx, done, opts = {}) {
    const p = ctx.p;
    const dur = opts.dur || 2;
    const ticks = Math.max(1, Math.round(opts.ticks || dur / 0.33));
    const interval = opts.interval || dur / ticks;
    const inst = { ctx, left: ticks, timer: 0, done, target: ctx.enemy || null, unstoppable: !!opts.unstoppable, onEnd: opts.onEnd || null, hold: opts.hold !== false };
    this._channel = inst;
    p.castLock = dur + 0.05;
    if (inst.unstoppable) p.unstoppableT = Math.max(p.unstoppableT || 0, dur + 0.1);
    const step = () => {
      if (this._channel !== inst) return;
      if (!p.alive || (inst.hold && !this.slotHeld(ctx.key))) { this.cancelCast('release'); return; }
      try { opts.onTick?.(inst, interval); } catch (err) { console.warn(`[canalización ${ctx.sk.id}]`, err); }
      inst.left--;
      if (inst.left > 0) inst.timer = this.timers.schedule(interval, step);
      else this._endChannel(inst, false);
    };
    inst.timer = this.timers.schedule(interval, step);
    return undefined; // diferido: termina con el último tic
  },
  // ⑤ punto único por impacto (lo llama Enemy.takeDamage): poderes onHit (incluidos
  // los indicadores de especialización gauge_<id>) y critCdr de la habilidad (rama/talento
  // `critCdr`: s de enfriamiento menos por crítico directo, como mucho una vez por instante)
  onPlayerHit(e, hit) {
    const p = this.player;
    if (!p) return;
    if (hit?.crit && hit.skill && !hit.proc && !hit.dot) {
      const prof = p.resolved?.[hit.skill] || ((p.cds[hit.skill] || 0) > 0 ? resolveSkill(p, p.cls.skills.find(s => s.id === hit.skill)) : null);
      if (prof?.critCdr > 0 && (p.cds[hit.skill] || 0) > 0 && p._critCdrAt?.[hit.skill] !== p.simT) {
        (p._critCdrAt || (p._critCdrAt = {}))[hit.skill] = p.simT;
        p.cds[hit.skill] = Math.max(0, p.cds[hit.skill] - prof.critCdr);
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
  // Encadenado: rebotes a enemigos cercanos (−25 % por salto), hasta `jumps`
  spawnChainBounce(fromEnemy, baseDmg, jumps, exclude, color) {
    if (!fromEnemy || baseDmg <= 0 || jumps <= 0) return;
    const seen = new Set(exclude || []);
    seen.add(fromEnemy);
    let origin = fromEnemy;
    let dmg = baseDmg;
    for (let j = 0; j < jumps; j++) {
      dmg = Math.round(dmg * 0.75);
      if (dmg <= 0) break;
      let next = null, bd = 6 * 6;
      for (const e of this.enemies) {
        if (!e.alive || seen.has(e)) continue;
        const d = e.pos.distanceToSquared(origin.pos);
        if (d < bd) { bd = d; next = e; }
      }
      if (!next) break;
      seen.add(next);
      this.spawnProjectile({
        from: origin.pos.clone().setY(1.0), to: next.pos.clone().setY(1.0),
        speed: 18, range: Math.sqrt(bd) + 1, dmg, crit: false, friendly: true,
        color: color || 0x66ddff, size: 0.12,
      });
      origin = next;
    }
  },
  // daño en área: tira el golpe POR OBJETIVO (bonos condicionados) y aplica efectos
  // opts = { addPct, critBonus, coldblood, onHit(e, dealt), color, hitInfo, exclude }
  dealArea(pos, radius, mult, opts = {}) {
    let hits = 0;
    const p = this.player;
    const dmgOpts = { color: opts.color, skill: opts.hitInfo?.skill, tags: opts.hitInfo?.tags, elem: opts.hitInfo?.elem };
    for (const e of this.enemies) {
      if (!e.alive || e === opts.exclude) continue;
      const r = radius + 0.5 * (e.def.scale || 1);
      if (e.pos.distanceToSquared(pos) <= r * r) {
        const cb = (opts.critBonus || 0) + (opts.coldblood && e.slowT > 0 ? COLDBLOOD_CRIT : 0);
        const { dmg, crit } = p.rollDamage(mult, cb, opts.addPct || 0, e, opts.hitInfo);
        const dealt = e.takeDamage(dmg, crit, dmgOpts) || 0;
        if (opts.slow && e.alive) e.applyCC?.('slow', opts.slow, { pct: opts.slowPct || 50, src: p });
        if (opts.onHit) opts.onHit(e, dealt);
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
  // destino transitable más lejano en la recta hacia `to` (acotado a `maxD`)
  clampWalkable(from, to, maxD) {
    const dir = to.clone().sub(from).setY(0);
    const dist = Math.min(dir.length(), maxD);
    if (dist < 0.05) return from.clone();
    dir.normalize();
    const out = from.clone();
    for (let t = 0.3; t <= dist + 1e-6; t += 0.3) {
      const nx = from.x + dir.x * Math.min(t, dist), nz = from.z + dir.z * Math.min(t, dist);
      if (this.world?.grid && !this.world.grid.walkable(nx, nz)) break;
      out.x = nx; out.z = nz;
    }
    return out.setY(0);
  },
  // ¿sigue mantenida la tecla/botón de la ranura? (canalizaciones). Sin input: sí.
  slotHeld(key) {
    const inp = this.input;
    if (!inp) return true;
    if (key === 'lmb') return inp.mouseHeld ? !!inp.mouseHeld.l : true;
    if (key === 'rmb') return inp.mouseHeld ? !!inp.mouseHeld.r : true;
    const act = SLOT_ACTION[key];
    return act && typeof inp.held === 'function' ? !!inp.held(act) : true;
  },

  // ---------------- barra de habilidades y ramas ----------------
  // asigna una habilidad a una ranura: valida su categoría (CAT_SLOTS) y que la
  // conozcas; sin duplicados (k2 nunca repite la de rmb). 🖱️Izq nunca queda vacía.
  assignHotbar(slot, id) {
    const p = this.player;
    if (!p?.hotbar) return false;
    if (!['lmb', 'rmb', 'k1', 'k2', 'k3', 'k4'].includes(slot)) return false;
    if (id) {
      const sk = p.cls.skills.find(s => s.id === id);
      if (!sk || !fitsSlot(sk, slot)) { this.ui?.message?.(`${sk?.name || 'Esa habilidad'} no va en esa ranura`); return false; }
      if (!isKnown(p, sk)) { this.ui?.message?.(`${sk.name}: se aprende al nivel ${sk.req}`); return false; }
      for (const s of Object.keys(p.hotbar)) if (p.hotbar[s] === id) p.hotbar[s] = null;
    } else if (slot === 'lmb') id = weaponBasicOf(p.cls)?.id || null;
    p.hotbar[slot] = id;
    this.ui?.refreshHotbar?.();
    this.save?.();
    return true;
  },

  // elige una OPCIÓN de una mini-rama. La PRIMERA elección de una mini-rama la
  // DESBLOQUEA y cuesta 1 punto de habilidad (doble toque de confirmación);
  // después se cambia libremente entre sus 3 opciones (gratis).
  chooseSkillMod(skillId, branchId, optId) {
    const p = this.player;
    const branches = SKILL_MODS[skillId]; if (!branches) return;
    const br = branches.find(b => b.id === branchId); if (!br) return;
    const opt = (br.opts || []).find(o => o.id === optId); if (!opt) return;
    const unlocked = p.skillBranches?.[skillId]?.[branchId];
    if (unlocked) {
      (p.skillMods[skillId] || (p.skillMods[skillId] = {}))[branchId] = optId;
      p.resolved = {};
      this.ui.message(`✦ ${opt.name}: ${opt.desc}`, 2200);
      this.sfx('uiclick');
    } else {
      const sk = p.cls.skills.find(s => s.id === skillId);
      if (!isKnown(p, sk)) { this.ui.message(`${sk?.name || 'La habilidad'} se aprende al nivel ${sk?.req || '?'}`); return; }
      if (p.skillPoints <= 0) { this.ui.message(`🔒 ${opt.name}: ${opt.desc} — necesitas 1 punto`, 2800); this.sfx('error'); return; }
      const key = skillId + '/' + branchId + '/' + optId;
      if (this._modPending === key) {
        this._modPending = null;
        (p.skillBranches[skillId] || (p.skillBranches[skillId] = {}))[branchId] = true;
        p.skillPoints--;
        (p.skillMods[skillId] || (p.skillMods[skillId] = {}))[branchId] = optId;
        p.resolved = {};
        this.ui.message(`🔓 ${opt.name} desbloqueado`, 2200);
        this.sfx('levelup');
      } else {
        this._modPending = key;
        this.ui.message(`${opt.name}: ${opt.desc} — haz clic otra vez para desbloquear (1 punto)`, 3200);
        this.sfx('uiclick');
      }
    }
    this.ui.refreshSkillsView?.();
    this.ui.updateHUD?.();
    this.save();
  },

  // ¿Hay una gastadora PEDIDA (🖱️Der mantenido) y lista para salir? Entonces el
  // básico cede el turno ese frame: con los dos botones mantenidos nunca salen dos
  // acciones a la vez y la gastadora conserva su cadencia. Sin ratón (tests sin
  // input real), nunca.
  _spenderWaiting() {
    const p = this.player, inp = this.input;
    if (!p || !inp?.mouseHeld?.r) return false;
    const id = p.hotbar?.rmb;
    const sk = id ? p.cls.skills.find(s => s.id === id) : null;
    if (!sk || sk.cat === 'basic' || !isKnown(p, sk)) return false;
    if ((p.cds[sk.id] || 0) > 0 || p.gcdT > 0 || p.castLock > 0 || p.leap || this._channel) return false;
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
  castBasic() {
    const p = this.player;
    if (!p || !p.alive || this.state !== 'play' || this._paused || p.atkCd > 0 || p.castLock > 0 || p.leap || this._windup) return;
    if (p.actionLockT > 0 || this._spenderWaiting()) return;   // la gastadora en curso / pedida manda
    const aim = this.input?.mouseWorld || null;
    const near = this.nearestEnemy((p.cls.atkRange || 8) + 3);
    const scheme = this.settings?.controlScheme || 'wasd';
    p.basicAt = p.simT;                                         // una acción por frame
    if (p.cls.ranged) {
      const fwd = v3(Math.sin(p.group.rotation.y), Math.cos(p.group.rotation.y));
      const tgt = (scheme !== 'click' && aim) ? { pos: aim } : (near || { pos: aim || p.pos.clone().addScaledVector(fwd, 4) });
      p.faceToward(tgt.pos);
      p.basicAttack(tgt);
    } else if (near && p.pos.distanceTo(near.pos) <= p.cls.atkRange) {
      p.faceToward(near.pos);
      p.basicAttack(near);
    } else {
      // golpe melee al vacío hacia la mira (no genera Furia: hay que acertar)
      if (aim) p.faceToward(aim);
      p.atkCd = p.stats.atkTime * 0.6; p.swing = 1;
    }
  },

  // ---------------- canal de lanzamiento ⑦ ----------------
  // punto y enemigo objetivo de un lanzamiento (ratón en PC; si no, el más cercano)
  skillTarget(p, prof) {
    const maxRange = prof.range || 8;
    const near = this.nearestEnemy(maxRange + 2);
    let target;
    if (this.input?.mouseWorld) target = this.input.mouseWorld.clone();
    else if (near) target = near.pos.clone();
    else {
      const fwd = v3(Math.sin(p.group.rotation.y), Math.cos(p.group.rotation.y));
      target = p.pos.clone().addScaledVector(fwd, Math.min(4, maxRange));
    }
    const delta = target.clone().sub(p.pos); delta.y = 0;
    if (delta.length() > maxRange) target = p.pos.clone().addScaledVector(delta.normalize(), maxRange);
    target.y = 0;
    // melee: el enemigo más cercano a TI dentro del alcance; resto: el más cercano a la mira
    const enemy = prof.type === 'melee'
      ? this.nearestEnemy(Math.max(2.2, prof.range || 2.2) + 0.6)
      : (this.nearestEnemy(3, target) || near);
    return { target, near: enemy };
  },

  // echoMult > 0: repetición del Eco (sin coste, sin CD, sin windup, sin GCD).
  // slotKey: 'lmb' | 'rmb' | 'k1'..'k4' (o índice 0-3 → k1-k4, retrocompat).
  // Devuelve true si el lanzamiento arrancó.
  castSkillSlot(slotKey, echoMult = 0) {
    const p = this.player;
    if (!p || !p.alive || this.state !== 'play') return false;
    if (this._paused && !echoMult) return false; // no actuar con un panel abierto (pausa)
    const key = typeof slotKey === 'number' ? ['k1', 'k2', 'k3', 'k4'][slotKey] : slotKey;
    const skId = (p.hotbar || {})[key];
    if (!skId) return false;
    const sk = p.cls.skills.find(s => s.id === skId);
    if (!sk || !isKnown(p, sk)) return false;
    if (sk.type === 'weapon') { if (!echoMult) this.castBasic(); return !echoMult; }
    // activa de talento sin comportamiento todavía (Paso 2c.1): no se lanza ni cobra
    if (!skillCastable(sk)) {
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      if (!echoMult && (!this._noCastAt || now - this._noCastAt > 1500)) { this.ui?.message?.(`${sk.name}: aún no disponible`); this._noCastAt = now; }
      return false;
    }
    const prof = resolveSkill(p, sk);
    const isBasic = sk.cat === 'basic';
    const isEcho = echoMult > 0;
    // una gastadora puede CANCELAR el windup de un básico en curso (el remate del
    // Mandoble), como en D4: la gastadora tiene prioridad sobre el básico
    const yieldBasic = !isEcho && !isBasic && !!this._windup?.ctx?.isBasic;
    if (!isEcho) {
      if (((p.castLock > 0 || this._windup) && !yieldBasic) || p.leap || this._channel) return false; // bloqueo en curso
      if (isBasic) {
        if (p.atkCd > 0) return false;
        // bloqueo de ACCIÓN compartido: mientras una gastadora prepara, bloquea o
        // vuela hacia su impacto, el básico no sale (queda a la espera con el
        // botón mantenido); y si hay una gastadora pedida y lista, cede el turno
        if (p.actionLockT > 0 || this._spenderWaiting()) return false;
      }
      else if ((p.cds[sk.id] || 0) > 0) return false;
      // una sola acción por frame: si el básico acaba de salir en ESTE instante, la
      // gastadora sale en el siguiente (16 ms; el básico no la retrasa más que eso)
      else if (p.basicAt != null && p.basicAt === p.simT) return false;
      if (prof.gcd && p.gcdT > 0) return false;                                       // GCD 0,2 s
      if (!canAfford(p, prof.cost)) {
        const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
        if (!this._noResAt || now - this._noResAt > 700) { this.ui?.message?.(`${p.cls.resource?.name || 'Recurso'} insuficiente`); this._noResAt = now; }
        return false;
      }
    }
    const { target, near } = this.skillTarget(p, prof);
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
    const cast = { sk, prof, slot: key, target, enemy: near };
    if (!isEcho && firePower('onCast', p, this, p, cast) === false) return false; // cancelado sin coste
    if (yieldBasic) this.cancelCast('gastadora');                                    // corta el remate del básico
    // bloqueo de acción para el básico: preparación + max(bloqueo, impacto diferido,
    // vuelo del proyectil hasta la mira), nunca menos que el GCD
    if (!isEcho && !isBasic && prof.gcd) {
      const flight = prof.tags.has('proj') ? Math.min(prof.range || 10, p.pos.distanceTo(target)) / Math.max(1, prof.speed || 14) : 0;
      p.actionLockT = Math.max(p.actionLockT || 0, GCD, (prof.windup || 0) + Math.max(prof.lockT || 0, prof.impactDelay || 0, flight));
    }
    const fx = SKILL_FX[sk.id] || null;
    const dotKind = prof.dot;
    const color = sk.color || (dotKind ? DOT_COLORS[dotKind] : null) || undefined;
    const coef = prof.coef * (isEcho ? echoMult : 1);
    const hitInfo = { skill: sk.id, tags: prof.tags, elem: prof.elem, forceCrit: !!(prof.forceCrit || cast.forceCrit) };
    const ctx = {
      p, sk, prof, key, target, enemy: near, coef, isEcho, isBasic, hitInfo, color, fx, cast,
      dmgOpts: { color, skill: sk.id, tags: prof.tags, elem: prof.elem },
      avgHit: p.avgHit(coef, prof.addPct),
      splashCoef: (prof.splash || 0) * (isEcho ? echoMult : 1),
      res: { hits: 0, dealt: 0, killed: 0 },
    };
    // impacto REAL sobre un enemigo: cuenta, daño infligido y efectos de rama/soporte
    ctx.hit = (e, dealt) => {
      ctx.res.hits++;
      ctx.res.dealt += dealt || 0;
      applyHitEffects(this, p, e, prof, ctx.avgHit);
      if (e && !e.alive) ctx.res.killed++;
    };
    ctx.areaOpts = { addPct: prof.addPct, critBonus: prof.critBonus, coldblood: prof.coldblood, color, hitInfo, onHit: ctx.hit };
    if (!isEcho && prof.gcd) p.gcdT = GCD;
    p.castPose?.(sk.type);
    // WINDUP: el golpe se programa; la esquiva lo cancela SIN cobrar el coste
    if (!isEcho && prof.windup > 0) {
      p.castLock = prof.windup + 0.05;
      p.swing = Math.max(p.swing || 0, 0.6);
      const id = this.timers.schedule(prof.windup, () => {
        if (this._windup?.id !== id) return;
        this._windup = null;
        p.castLock = 0;
        if (p.alive) this._commitCast(ctx);
      });
      this._windup = { id, ctx };
      return true;
    }
    return this._commitCast(ctx);
  },

  // cobra el coste, pone el enfriamiento y ejecuta el efecto (comportamiento o genérico)
  _commitCast(ctx) {
    const { p, sk, prof, isEcho, isBasic } = ctx;
    if (!isEcho) {
      // básico: cadencia × sk.cadence (Mandoble 1,5 · Embate 1,1), sin contar el windup ya esperado
      if (isBasic) { p.atkCd = Math.max(0.05, p.stats.atkTime * (prof.cadence || 1) - (prof.windup || 0)); p.basicAt = p.simT; }
      else {
        if (!spendResource(p, prof.cost)) { this.ui?.message?.(`${p.cls.resource?.name || 'Recurso'} insuficiente`); return false; }
        if (prof.gen) gainResource(p, prof.gen);   // sk.gen (Grito de Guerra) + ramas Furibundo/Iracundo
        p.cds[sk.id] = prof.cd;
        p.cdMax[sk.id] = prof.cd;
      }
      if (prof.lockT > 0) p.castLock = Math.max(p.castLock || 0, prof.lockT);
      if (prof.haste) p.addBuff(`${sk.id}_impulso`, { spdPct: 30 }, prof.haste, { name: 'Impulso', icon: '💨', desc: '+30% de velocidad de movimiento' });
      if (prof.cleanse) p.cleanse();
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
        const fn = GENERIC[sk.type];
        if (!fn) { console.warn(`[habilidad ${sk.id}] tipo genérico desconocido: ${sk.type}`); res = ctx.res; }
        else res = fn(this, ctx, done);
      }
    } catch (err) {
      console.warn(`[habilidad ${sk.id}]`, err);
      res = ctx.res;
    }
    if (res !== undefined) done(res);              // instantáneo; si es diferido, done() llega al impactar
    // Eco (soporte o Transformación): repite ~0,5 s después al 50-60 %
    if (!isEcho && prof.echo > 0) this.timers.schedule(0.5, () => this.castSkillSlot(ctx.key, prof.echo));
    this.sfx?.(ctx.fx?.sfx || 'skill');
    return true;
  },

  // tras el impacto: robo de vida, Masacre, Estela, recurso del básico y ⑦ afterCast
  _finishCast(ctx, res) {
    const { p, sk, prof, isEcho, isBasic } = ctx;
    if (!ctx.lifestealDone && prof.lifesteal && res.dealt > 0) p.leech(res.dealt * prof.lifesteal / 100);
    if (!isEcho && !isBasic && prof.cdhit && res.hits >= prof.cdhit) {
      const reduced = cooldownWithMassacre(prof);
      p.cds[sk.id] = Math.max(0, (p.cds[sk.id] || 0) - (prof.cd - reduced));
    }
    // Estela (zone): daña y, si la habilidad ralentiza (prof.slow), también ralentiza
    // (Paso 2c.2: el suelo helado de Nova Perpetua es la Estela de una Nova que ralentiza)
    if (prof.zone && ctx.zoneCenter && this.spawnField) {
      this.spawnField('estela', { pos: ctx.zoneCenter, radius: Math.max(2, (ctx.zoneRad || 2) * 0.9), dur: prof.zoneDur, owner: p,
        data: { dps: ctx.avgHit * 0.45, color: sk.color || 0xff7733, skill: sk.id, slow: prof.slow > 0 ? prof.slow : 0, slowPct: prof.slowPct || 30 } });
    }
    // recurso de los básicos no-arma (Mandoble/Embate): solo si golpean (+extra por objetivo)
    if (isBasic && !isEcho && res.hits > 0) {
      let add = prof.gen;
      if (prof.genPerExtra && res.hits > 1) add = Math.min(Math.max(prof.genMax || 0, prof.gen), add + prof.genPerExtra * (res.hits - 1));
      gainResource(p, add);
    }
    // no básicos: recurso SOLO si golpea (Embestida +12, Provocación +15)
    if (!isBasic && !isEcho && prof.genOnHit && res.hits > 0) gainResource(p, prof.genOnHit);
    if (!isEcho) firePower('afterCast', p, this, p, ctx.cast, res);
  },

  // la ESQUIVA cancela el windup (sin cobrar el coste) y la canalización
  cancelCast(reason = 'dodge') {
    const p = this.player;
    let any = false;
    if (this._windup) {
      this.timers.cancel(this._windup.id);
      this._windup = null;
      any = true;
    }
    if (this._channel) { this._endChannel(this._channel, true); any = true; }
    if (any && p) p.castLock = 0;
    void reason;
    return any;
  },
  // un golpe fuerte interrumpe las canalizaciones y las habilidades `int:true`
  interruptCast(reason = 'hit') {
    const c = this._channel, w = this._windup;
    if ((c && c.ctx.prof.interruptible) || (w && w.ctx.prof.interruptible)) return this.cancelCast(reason);
    return false;
  },
  _endChannel(inst, canceled) {
    if (this._channel !== inst) return;
    this._channel = null;
    if (inst.timer) this.timers.cancel(inst.timer);
    const p = this.player;
    if (p) { p.castLock = 0; if (inst.unstoppable) p.unstoppableT = 0; }
    try {
      if (inst.onEnd) inst.onEnd(inst);
      else SKILL_BEHAVIORS[inst.ctx.sk.behavior]?.end?.(this, p, inst);
    } catch (err) { console.warn('[canalización] end', err); }
    inst.canceled = !!canceled;
    inst.done?.(inst.ctx.res);
  },
  // limpia windup/canalización/salto (cambio de mundo, muerte)
  resetCastState() {
    this._windup = null;
    this._channel = null;
    const p = this.player;
    if (p) { p.castLock = 0; p.leap = null; p.gcdT = 0; p.actionLockT = 0; }
  },
};
