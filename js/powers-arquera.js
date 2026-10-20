// ============================================================
// PODERES de la ARQUERA (Francotiradora · Montaraz · Tiradora) — Paso 2c.1
// ============================================================
// Dueño: el trabajador de la clase en el Paso 2c.1 (docs/paso2-diseno.md §9.1.6).
// Solo se tocan ESTE archivo, js/talents-arquera.js, js/fx-skills-arquera.js y
// tests/test-powers-arquera.mjs. js/powers.js importa y registra al cargar los cuatro
// mapas que devuelven las funciones de abajo.
// Son FUNCIONES (no constantes) a propósito: powers.js ↔ powers-arquera.js forman un
// ciclo de módulos y una función declarada se puede llamar aunque este módulo aún
// no se haya evaluado (p. ej. si un test lo importa el primero). Por eso TODOS los
// helpers de este archivo son `function` (elevadas) y las tablas son `var` perezosas.
//
//  arqueraPowers()          { id: PowerDef }  → definePower (claves de POWER_KEYS en powers.js:
//                        stats modifyResolve condAdd condCrit onCast afterCast onHit onKill
//                        condDr onDamaged onLethal onTick onGauge · icd priority procs state
//                        name desc tags). Ningún poder de este archivo declara `mult`.
//  arqueraSkillBehaviors() { skillId: { cast?(g,p,prof,cast), tick?, end? } } → defineSkillBehavior
//  arqueraFields()          { kind: { init, tick, onEnter?, onExit?, onExpire?, render? } } → defineField
//  arqueraGauges()          {} (la Arquera no añade indicadores: potencia concentracion/coto/impulso)
//
// REGLAS: nada de `powers.has(` (aquí: hasPower), ni setTimeout (g.timers.schedule), ni
// Math.random en la simulación (solo en el dibujo de los campos). Daño de un poder:
// dealProcDamage. Control: e.applyCC. Curas: p.sustain / g.heal / g.shield. Amenaza:
// g.forceTarget. Aliados: g.allies(pos, r) (en solitario = solo tú).
//
// ── PODERES ANFITRIONES (rodeo local; «pedido al núcleo» abajo) ──────────────────
// tests/test65a cierra el vocabulario de `power` (§5.3 + POWERS_EXTRA) y de `tv`, así
// que los nodos cuyo texto necesita un gancho y NO tienen poder propio llevan en su
// fx el poder más afín de su misma especialización, y ese poder FILTRA cada efecto
// por el rango del nodo que lo pide (nodeRank/picked). El efecto PROPIO del poder solo
// se aplica si su nodo está comprado (o si el poder llega sin nodos: p.talentExtra).
//   a_tailwind ........ c5B Paso Ligero  · anfitrión de c12B Camuflaje (crítico al salir)
//   f_aliento_cazador . s4               · s11 Respiración Profunda (Energía al llenar)
//   f_perch ........... s8               · s15 Paso del Acechador (−15 % de pérdida)
//   f_overpen ......... s14              · s6B Herida Abierta (sangrado de los críticos)
//   m_cepo_doble ...... s4               · s10 Lazo Corredizo (solo el 1.er enemigo)
//   m_warden .......... s13B             · s8 Pellejo de Oso (solo contra ralentizados)
//   m_extratrap / m_greathunt aplican además s17 Espinas Venenosas (tv.rootedWeak: test65a fija
//                       su fx sin poder; s17 exige s14 o s15, así que uno de los dos existe)
//   m_thornweb ........ x1               · s3 Abrojos (campo que ralentiza) · s11 Ponzoña Lenta
//   m_greathunt ....... x3               · s15 Cazadora Paciente (solo la Presa)
//   t_andanada_impulsiva s4              · s6B Corona de Flechas (360° de verdad)
//   t_slipstream ...... s13B             · s5 Viento de Cola (+vel. de ataque) · s8 Esquiva Felina
//   t_galechain ....... s14              · s11 Segundo Aliento (vida y Energía al llenar)
// PEDIDOS AL NÚCLEO (no se tocaron archivos compartidos):
//  · test65a: admitir ids propios (f_herida_abierta, f_respiracion, f_acechador, m_lazo,
//    m_pellejo, m_espinas, m_abrojos, m_ponzona, m_presa, t_corona, t_viento_cola,
//    t_esquiva_felina, t_segundo_aliento, a_camuflaje) y retirar los anfitriones.
//  · tv.dmgReduc lo suma recompute SIEMPRE: los condicionales (Pellejo de Oso, Esquiva
//    Felina) se corrigen aquí con un condDr negativo cuando la condición no se cumple.
//  · mergeMods toma el MÁXIMO de root: el «+1 s / +0,5 s» del Cepo lo suma el comportamiento.
//  · Invisibilidad real del héroe (Camuflaje): hoy los enemigos ya enzarzados pierden el
//    objetivo (persiguen un «fantasma» donde desapareciste), pero uno que te vea por
//    primera vez puede enzarzarse. Revelar (Bengala, rastro de la Presa): no hay
//    enemigos invisibles todavía; queda la marca e.revealedT.
//  · Ritmo de pérdida de la Concentración (tv.focusDrain): Visión Certera y Paso del
//    Acechador devuelven lo perdido escribiendo gaugeState(...).v (sin eventos ⑩).
//  · g.heal centrado en un punto (Guardabosques cura a los aliados SOBRE la trampa:
//    al héroe por g.heal, a los aliados remotos con su healSkill).
//  · El básico de arma no pasa por ⑦ onCast: Ráfaga Infinita cuenta sus disparos por
//    p.basicAt (onTick) y el crítico del Camuflaje marca el hitInfo en condCrit.
import * as THREE from 'three';
import { dealProcDamage, powerState, hasPower } from './powers.js';
import { gainGauge, spendGauge, gaugeValue, gaugeState, gaugeMax } from './spec-mechanics.js';
import { projFanOffset } from './skill-defs.js';
import { rankCoef } from './combat-math.js';
import { enemiesInField } from './field-entities.js';

// ------------------------------------------------------------
// constantes (un solo sitio; reflejan el texto de cada nodo)
// ------------------------------------------------------------
// eslint-disable-next-line no-var
var TUNE;
function tune() {
  return TUNE || (TUNE = Object.freeze({
    frame: 1e-3,                                     // «cada tick» del planificador
    tailwind: { quiet: 3, spdPct: 12 },              // c5B
    halcon: { radius: 15, crit: 5, spdPct: 6, pulse: 0.5 },   // c15
    cuero: { drPerRank: 4, dur: 2 },                 // c7: el doble 2 s tras la Voltereta
    freeShot: { window: 10 },                        // c2: ventana del disparo gratis
    camo: { pulse: 0.2, radius: 30 },                // c12B
    aliento: { spend: 50 },                          // F s4
    perch: { drPerRank: 3, over: 50 },               // F s8
    acechador: { less: 0.15, drain: 25 },            // F s15 (25/s = pérdida base)
    patience: { perSec: 2, max: 20 },                // F s13B
    overpen: { perEnemy: 15 },                       // F s14
    herida: { pct: 80, dur: 6 },                     // F s6B
    weakspot: { dur: 8, crit: 15 },                  // F x1
    impossible: { gap: 0.25 },                       // F x3
    cepo: { maxArmed: 3, extraR: 0.3, ironRoot: 1, deepRootPerRank: 0.5, mineCoef: 1.2, mineAdd: 120, poisonDur: 5 },
    warden: { pctPerSec: 3, pulse: 0.5 },            // M s13B
    pellejo: { drPerRank: 5 },                       // M s8
    lazo: { rootPerRank: 0.5 },                      // M s10
    ponzona: { slowPct: 10, slowT: 1.2 },            // M s11
    presa: { perRank: 10 },                          // M s15
    web: { link: 10, width: 0.6, slowPct: 50, slowT: 0.6, pulse: 0.2, bleedCoef: 1.0, vfx: 0.5 },
    greathunt: { dmgPct: 15, dur: 6 },               // M x3
    esquiva: { drPerRank: 4 },                       // T s8
    vientoCola: { aspdPerRank: 5 },                  // T s5
    andanada: { impulso: 20 },                       // T s4
    galechain: { perKill: 0.5, max: 6 },             // T s14
    segundo: { energyPerRank: 10 },                  // T s11
    slip: { spdPct: 15, every: 0.6, dur: 2.5, radius: 1.6 },  // T s13B
    infinite: { every: 10, storm: 5 },               // T x1 / x3
  }));
}

// poder → { self: [árbol, nodo, opción?], hosted: [[árbol, nodo, opción?]…] } (ver cabecera)
// eslint-disable-next-line no-var
var HOSTS;
function hosts() {
  return HOSTS || (HOSTS = {
    a_tailwind: { self: ['cls', 'c5', 'B'], hosted: [['cls', 'c12', 'B']] },
    f_aliento_cazador: { self: ['francotiradora', 's4'], hosted: [['francotiradora', 's11']] },
    f_perch: { self: ['francotiradora', 's8'], hosted: [['francotiradora', 's15']] },
    f_overpen: { self: ['francotiradora', 's14'], hosted: [['francotiradora', 's6', 'B']] },
    m_cepo_doble: { self: ['montaraz', 's4'], hosted: [['montaraz', 's10']] },
    m_warden: { self: ['montaraz', 's13', 'B'], hosted: [['montaraz', 's8']] },
    m_thornweb: { self: ['montaraz', 'x1'], hosted: [['montaraz', 's3'], ['montaraz', 's11']] },
    m_greathunt: { self: ['montaraz', 'x3'], hosted: [['montaraz', 's15']] },
    t_andanada_impulsiva: { self: ['tiradora', 's4'], hosted: [['tiradora', 's6', 'B']] },
    t_slipstream: { self: ['tiradora', 's13', 'B'], hosted: [['tiradora', 's5'], ['tiradora', 's8']] },
    t_galechain: { self: ['tiradora', 's14'], hosted: [['tiradora', 's11']] },
  });
}

// ------------------------------------------------------------
// helpers (todos `function`: seguros en el ciclo de módulos)
// ------------------------------------------------------------
function isBoss(e) { return !!(e?.def?.boss || e?.def?.uber || e?.def?.worldBoss); }
function isEliteish(e) { return !!(e?.def?.rank || isBoss(e)); }
function now(p) { return p?.simT || 0; }
function v3(x, z, y = 0) { return new THREE.Vector3(x, y, z); }
function invalidate(p) { if (p) p.resolved = {}; }
function focus(p) { return gaugeValue(p, 'concentracion'); }

// rango de un nodo: árbol 'cls' o id de especialización (solo la ACTIVA); s0 = 1
function nodeRank(p, tree, id) {
  const T = p?.talents;
  if (!T) return 0;
  if (tree === 'cls') return T.cls?.[id] | 0;
  if (p.talentAgg?.spec !== tree) return 0;
  if (id === 's0') return 1;
  return T.sp?.[tree]?.[id] | 0;
}
// rango si está comprado (y, en una elección, con esa opción; por defecto la A)
function picked(p, tree, id, opt = null) {
  const r = nodeRank(p, tree, id);
  if (!(r > 0)) return 0;
  if (opt && (p.talents?.choice?.[id] || 'A') !== opt) return 0;
  return r;
}
// ¿aplica el efecto PROPIO del poder `id`? (su nodo, o el poder llegó sin nodos)
function ownOn(p, id) {
  if (!hasPower(p, id)) return false;
  const h = hosts()[id];
  if (!h) return true;
  return picked(p, ...h.self) > 0 || !h.hosted.some(x => picked(p, ...x) > 0);
}

// renueva (o crea) un buff corto a un aliado (auras/campos)
function refreshBuff(a, id, stats, keep, meta = {}) {
  const b = a?.buffs?.find?.(x => x.id === id);
  if (b) { b.t = Math.max(b.t, keep); b.dur = Math.max(b.dur || 0, keep); return; }
  a?.addBuff?.(id, { ...stats }, keep, meta);
}
// los aliados SIN el héroe (poderes «de grupo»: en solitario no hacen nada)
function partyOf(g, p, pos = null, r = Infinity) {
  return (g?.allies ? g.allies(pos, r) : []).filter(a => a && a !== p);
}

// dirección del héroe hacia `target` (o su orientación)
function aimDir(p, target) {
  let dx = (target?.x ?? p.pos.x) - p.pos.x, dz = (target?.z ?? p.pos.z) - p.pos.z;
  const l = Math.hypot(dx, dz);
  if (l < 0.05) { dx = Math.sin(p.group?.rotation?.y || 0); dz = Math.cos(p.group?.rotation?.y || 0); }
  else { dx /= l; dz /= l; }
  return { x: dx, z: dz };
}
// destino «hacia atrás» (contrario a la mira), recortado a lo transitable
function backDest(g, p, target, dist) {
  const d = aimDir(p, target);
  const want = p.pos.clone(); want.x -= d.x * dist; want.z -= d.z * dist; want.y = 0;
  return g.clampWalkable ? g.clampWalkable(p.pos, want, dist) : want;
}
// desplazamiento por pasos del planificador (como Paso Veloz): sin invulnerabilidad
function slide(g, p, dest, dur, { trail = null, onDone = null } = {}) {
  const from = p.pos.clone();
  const steps = 6, dt = Math.max(0.02, dur) / steps;
  let i = 0;
  const step = () => {
    if (!p.alive) { onDone?.(); return; }
    i++;
    const k = i / steps;
    p.pos.x = from.x + (dest.x - from.x) * k;
    p.pos.z = from.z + (dest.z - from.z) * k;
    if (trail && i % 2) g.emitFx?.(trail, p.pos.clone().setY(0.4));
    if (i < steps) g.timers.schedule(dt, step);
    else onDone?.();
  };
  g.timers.schedule(dt, step);
}
// abanico de proyectiles del perfil (g.fireProjectile: crítico, ctx.hit, robo…).
// Devuelve el tiempo de vuelo (para cerrar el lanzamiento con cast.done).
function shootFan(g, p, prof, cast, { ctx = cast.ctx, n = null, spread = 0, angle = null, range = null, size = 0.1, onEnemy = null, beam = false } = {}) {
  const sk = cast.sk;
  const tgt = cast.target || p.pos;
  const base = angle ?? Math.atan2(tgt.x - p.pos.x, tgt.z - p.pos.z);
  const count = Math.max(1, n ?? ((prof.count || 1) + (prof.proj || 0)));
  const castHits = count > 1 && (sk.count || 1) <= 1 ? new Set() : null;   // sin escopetazo
  const R = range ?? (prof.range || sk.range || 10);
  p.faceToward?.(v3(p.pos.x + Math.sin(base), p.pos.z + Math.cos(base)));
  p.swing = 1;
  const muzzle = p.pos.clone().setY(1.0);
  muzzle.x += Math.sin(base) * 0.5; muzzle.z += Math.cos(base) * 0.5;
  if (ctx.fx?.aura) g.emitFx?.(ctx.fx.aura, muzzle);
  else if (ctx.fx?.trail) g.emitFx?.(ctx.fx.trail, muzzle);
  for (let i = 0; i < count; i++)
    g.fireProjectile(ctx, { angle: base + projFanOffset(i, count, spread), range: R, size, castHits, onEnemy });
  if (beam) {
    const end = p.pos.clone().setY(1.0);
    end.x += Math.sin(base) * R; end.z += Math.cos(base) * R;
    g.spawnBeam?.(muzzle, end, ctx.color || sk.color || 0xffee66, 0.3);
  }
  ctx.lifestealDone = true;
  return R / Math.max(1, prof.speed || 14) + 0.05;
}
// total y tics de un DoT con el perfil de talentos (dotPct + <tipo>Pct, dotDur añade tics)
function dotOf(p, kind, base, dur) {
  const tv = p?.tv || {};
  const pct = (tv.dotPct || 0) + (tv[kind + 'Pct'] || 0);
  const ticks = Math.max(1, Math.round(dur + (tv.dotDur || 0)));
  return { total: base * Math.max(0, 1 + pct / 100) * ticks / dur, ticks };
}
// distancia² de un punto a un segmento (red de espinas)
function segDist2(px, pz, a, b) {
  const dx = b.x - a.x, dz = b.z - a.z;
  const L = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((px - a.x) * dx + (pz - a.z) * dz) / L));
  const qx = a.x + dx * t - px, qz = a.z + dz * t - pz;
  return qx * qx + qz * qz;
}
// decal de suelo de un campo (anillo o disco); libera al morir
function groundDecal(g, f, { inner = 0.6, opacity = 0.45, color = 0xffffff, disc = false, segs = 32 } = {}) {
  if (f.dead) {
    if (f.decal) { g.fxGroup.remove(f.decal); f.decal.geometry.dispose(); f.decal.material.dispose(); f.decal = null; }
    return null;
  }
  if (!f.decal) {
    const geo = disc ? new THREE.CircleGeometry(f.radius, segs) : new THREE.RingGeometry(f.radius * inner, f.radius, segs);
    const decal = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    decal.rotation.x = -Math.PI / 2;
    decal.position.set(f.pos.x, 0.06, f.pos.z);
    g.fxGroup.add(decal);
    f.decal = decal;
  }
  return f.decal;
}

// ---------- Trampa de Cepo: cargas, trampas armadas ----------
function cepoDoble(p) { return ownOn(p, 'm_cepo_doble'); }
function extraTrap(p) { return ownOn(p, 'm_extratrap'); }
function wardenOn(p) { return ownOn(p, 'm_warden'); }
function armedTraps(g, p) {
  return (g?.fields || []).filter(f => !f.dead && !f.sprung && f.owner === p && f.kind === 'a_cepo');
}
// cargas por marca de tiempo (sobrevive a timers.clear del cambio de mundo)
function trapCharges(p, cd) {
  const st = powerState(p, 'a_t_cepo');
  const max = 1 + (cepoDoble(p) ? 1 : 0);
  if (st.charges == null) { st.charges = max; st.max = max; st.nextAt = 0; }
  if (st.max !== max) {
    st.charges = Math.max(0, Math.min(max, st.charges + (max - st.max)));
    st.max = max;
    if (st.charges < max && !(st.nextAt > 0)) st.nextAt = now(p) + cd;
  }
  while (st.charges < max && st.nextAt > 0 && now(p) + 1e-6 >= st.nextAt) {
    st.charges++;
    st.nextAt = st.charges < max ? st.nextAt + cd : 0;
  }
  if (st.charges >= max) st.nextAt = 0;
  return st;
}
// salta la trampa: inmoviliza (o estalla si es Mina), envenena y desaparece
function springTrap(g, f, e) {
  const p = f.owner, d = f.data;
  f.sprung = true;
  d.trap = false;                      // ya no cuenta como armada (Coto de Caza)
  const at = v3(f.pos.x, f.pos.z);
  if (d.mine) {
    g.dealArea?.(at, d.blastR, d.blastCoef, d.areaOpts);
    g.addShake?.(0.15);
    g.emitFx?.('arqThornBurst', at.clone().setY(0.4));
  } else if (e?.alive) {
    e.applyCC?.('root', d.root, { src: p });
    // Cepo de Hierro: a los jefes los ralentiza un 50 % (applyCC aplica ×0,5 a los jefes)
    if (d.bossSlow && isBoss(e)) e.applyCC?.('slow', d.root, { pct: 2 * d.bossSlow, src: p });
  }
  if (e?.alive && d.poison?.total > 0) g.applyDoT?.(e, d.poison.total, d.poison.ticks, 1, 'txt', `${d.skill}:poison`);
  g.spawnRing?.(at, f.radius, d.color);
  g.emitFx?.('arqTrapSnap', at.clone().setY(0.3));
  g.sfx?.('trap');
  f.t = 0;
}

// ---------- Camuflaje ----------
function camoActive(p) { const st = powerState(p, 'a_t_camuflaje'); return now(p) < (st.until || 0); }
function endCamo(p, st, primed) {
  st.until = 0;
  st.crit = !!primed;
  if (st.ghost) st.ghost.alive = false;
  if (p.buffs?.some(b => b.id === 'a_t_camuflaje')) p.buffs = p.buffs.filter(b => b.id !== 'a_t_camuflaje');
}
// los enemigos enzarzados pierden el objetivo: persiguen al «fantasma»
function loseTarget(g, p, ghost) {
  const R = tune().camo.radius;
  for (const e of g.enemies || []) {
    if (!e.alive || !e.aggroed || e.pos.distanceTo(p.pos) > R) continue;
    g.forceTarget?.(e, ghost, tune().camo.pulse + 0.15);
  }
}

// Espinas Venenosas (Montaraz s17): Debilidad +tv.rootedWeak a los inmovilizados
function rootedWeakTick(g, p) {
  const w = p?.tv?.rootedWeak || 0;
  if (!(w > 0)) return;
  for (const e of g?.enemies || [])
    if (e.alive && e.rootT > 0) e.applyWeakness?.('m_espinas_venenosas', w, e.rootT);
}

// ---------- Punto Débil ----------
function weak(p, e) { return !!e && (e._weakspotUntil || 0) > now(p); }

// ---------- Gran Cacería ----------
function greatHunt(g, p, e) {
  const st = powerState(p, 'm_greathunt');
  if (st.prey === e) return false;                   // una vez por Presa
  st.prey = e;
  const cs = powerState(p, 'a_t_cepo');
  if (cs.max) { cs.charges = cs.max; cs.nextAt = 0; }
  if (p.cds) p.cds.a_t_cepo = 0;
  const T = tune().greathunt;
  for (const a of g.allies ? g.allies() : [p])
    a.addBuff?.('m_greathunt', { dmgPct: T.dmgPct }, T.dur, { name: 'Gran Cacería', icon: '🏹', desc: `+${T.dmgPct}% de daño` });
  g.ui?.spawnText?.(e.pos.clone().setY((e.def?.scale || 1) + 1), '¡GRAN CACERÍA!', 'txt-crit');
  g.sfx?.('levelup');
  return true;
}

// ---------- Ráfaga Infinita ----------
function infiniteShot(g, p, wasInfinite) {
  const st = powerState(p, 't_infinite');
  const T = tune().infinite;
  if (wasInfinite && st.ready) {
    st.ready = false;
    invalidate(p);
    const n = p.tv?.infiniteDmg || 0;           // Huracán (x2): +X de Impulso
    if (n > 0) gainGauge(p, 'impulso', n);
    return;
  }
  st.shots = (st.shots || 0) + 1;
  const gale = (gaugeState(p, 'impulso')?.galeT || 0) > 0;
  const every = hasPower(p, 't_eyestorm') && gale ? T.storm : T.every;
  if (st.shots >= every) {
    st.shots = 0;
    st.ready = true;
    invalidate(p);
    g?.ui?.spawnText?.(p.pos, '¡RÁFAGA INFINITA!', 'txt-crit');
  }
}

// ============================================================
// PODERES
// ============================================================
export function arqueraPowers() {
  return {
    // ---------------- árbol de clase ----------------
    // c5B Paso Ligero: +12 % de velocidad de movimiento si no recibes daño en 3 s.
    // Anfitrión de c12B Camuflaje: el primer disparo al salir (o el que lo rompe) es crítico seguro.
    a_tailwind: {
      name: 'Paso Ligero', desc: '+12 % de velocidad de movimiento si no recibes daño durante 3 s.',
      state: () => ({ hitAt: -99, on: false }),
      stats(p) { return ownOn(p, 'a_tailwind') && powerState(p, 'a_tailwind').on ? { spdPct: tune().tailwind.spdPct } : {}; },
      onDamaged(g, p, info) {
        if (!(info?.raw > 0)) return;
        const st = powerState(p, 'a_tailwind');
        st.hitAt = now(p);
        if (st.on) { st.on = false; p.recompute(); }
      },
      onTick(g, p) {
        const st = powerState(p, 'a_tailwind');
        const want = ownOn(p, 'a_tailwind') && now(p) - st.hitAt >= tune().tailwind.quiet;
        if (want !== st.on) { st.on = want; p.recompute(); }
      },
      // hit = el hitInfo del disparo: marcarlo hace críticos TODOS sus proyectiles
      condCrit(p, e, hit) {
        if (!hit || hit.proc || hit.dot) return 0;
        const st = powerState(p, 'a_t_camuflaje');
        if (st.critHit === hit) return 0;
        if (camoActive(p) || st.crit) {
          hit.forceCrit = true;
          st.critHit = hit;
          endCamo(p, st, false);
        }
        return 0;
      },
    },
    // c15 Espíritu del Halcón: tú y los aliados a 15 m, +5 % de crítico y +6 % de movimiento
    a_aura_halcon: {
      name: 'Espíritu del Halcón', desc: 'Aura: tú y los aliados a 15 m ganáis +5 % de crítico y +6 % de velocidad de movimiento.', tags: ['aura'],
      state: () => ({ acc: 0 }),
      stats() { const T = tune().halcon; return { crit: T.crit, spdPct: T.spdPct }; },
      onTick(g, p, dt) {
        const st = powerState(p, 'a_aura_halcon');
        st.acc += dt;
        const T = tune().halcon;
        if (st.acc < T.pulse - 1e-9) return;
        st.acc = 0;
        for (const a of partyOf(g, p, p.pos, T.radius))
          refreshBuff(a, 'a_aura_halcon', { crit: T.crit, spdPct: T.spdPct }, T.pulse + 0.25, { name: 'Espíritu del Halcón', icon: '🦅' });
      },
    },

    // ---------------- Francotiradora ----------------
    // s4 Aliento del Cazador: con Concentración 100, Disparo Apuntado sale sin carga y gasta 50.
    // Anfitrión de s11 Respiración Profunda: al llenar la Concentración, +tv.focusEnergy de Energía.
    f_aliento_cazador: {
      name: 'Aliento del Cazador', desc: 'Con la Concentración al 100 %, Disparo Apuntado sale al instante y gasta 50 de Concentración.',
      modifyResolve(p, sk, prof) {
        if (sk.id !== 'a_t_apuntado' || !ownOn(p, 'f_aliento_cazador')) return;
        if (focus(p) >= 100 - 1e-6) { prof.windup = 0; prof.aliento = true; }
      },
      // el perfil está cacheado: se corrige con la Concentración de ESTE instante
      onCast(g, p, cast) {
        if (cast?.sk?.id !== 'a_t_apuntado' || !ownOn(p, 'f_aliento_cazador')) return;
        const full = focus(p) >= 100 - 1e-6;
        if (full !== !!cast.prof.aliento) {
          cast.prof.windup = full ? 0 : (cast.sk.windup || 0);
          cast.prof.aliento = full;
          if (p.resolved) delete p.resolved[cast.sk.id];
        }
        if (full) spendGauge(p, 'concentracion', tune().aliento.spend);
      },
      onGauge(g, p, id, ev) {
        if (id !== 'concentracion' || ev !== 'full') return;
        if (p.resolved) delete p.resolved.a_t_apuntado;
        if (picked(p, 'francotiradora', 's11')) {
          const n = p.tv?.focusEnergy || 0;
          if (n > 0) g?.gainResource?.(p, n);
        }
      },
    },
    // s8 Posición Elevada: el −3 %/rango (tv.dmgReduc) se DUPLICA con la Concentración > 50.
    // Anfitrión de s15 Paso del Acechador: moverte vacía un 15 % menos de Concentración.
    f_perch: {
      name: 'Posición Elevada', desc: 'Con la Concentración por encima de 50, tu reducción de daño de Posición Elevada se duplica.',
      priority: -1,                                    // su onTick va DESPUÉS del indicador
      state: () => ({ lastV: null }),
      condDr(p) {
        if (!ownOn(p, 'f_perch')) return 0;
        if (focus(p) <= tune().perch.over) return 0;
        const r = nodeRank(p, 'francotiradora', 's8');
        return tune().perch.drPerRank * (r > 0 ? r : 1);
      },
      onTick(g, p, dt) {
        const st = powerState(p, 'f_perch');
        const s = gaugeState(p, 'concentracion');
        if (!s || !picked(p, 'francotiradora', 's15')) { st.lastV = null; return; }
        if (p.moving && st.lastV != null) {
          const lost = Math.max(0, Math.min(st.lastV - s.v, tune().acechador.drain * dt));
          if (lost > 0) s.v = Math.min(gaugeMax(p, 'concentracion'), s.v + lost * tune().acechador.less);
        }
        st.lastV = s.v;
      },
    },
    // s13B Paciencia del Depredador: quieta, +2 % de daño por segundo (máx. +20 %)
    f_patience: {
      name: 'Paciencia del Depredador', desc: 'Quieta, ganas +2 % de daño por segundo, hasta +20 %. Se pierde al moverte.',
      state: () => ({ t: 0 }),
      onTick(g, p, dt) { const st = powerState(p, 'f_patience'); st.t = p.moving ? 0 : st.t + dt; },
      condAdd(p) {
        if (p.moving) return 0;
        const T = tune().patience;
        return Math.min(T.max, T.perSec * powerState(p, 'f_patience').t);
      },
    },
    // s14 Sobrepenetración: cada enemigo atravesado da +15 % (aditivo) contra el siguiente.
    // Anfitrión de s6B Herida Abierta: los críticos de Disparo Apuntado sangran un 80 % extra en 6 s.
    f_overpen: {
      name: 'Sobrepenetración', desc: 'Cada enemigo que atraviesa Disparo Apuntado aumenta un 15 % su daño contra el siguiente.',
      // hit = hitInfo del disparo (uno por disparo): cuenta los enemigos ya atravesados
      condAdd(p, e, hit) {
        if (hit?.skill !== 'a_t_apuntado' || hit.proc || hit.dot || !ownOn(p, 'f_overpen')) return 0;
        const n = hit._overpen | 0;
        hit._overpen = n + 1;
        return tune().overpen.perEnemy * n;
      },
      onHit(g, p, e, hit) {
        if (hit?.skill !== 'a_t_apuntado' || !hit.crit || hit.proc || hit.dot || !e?.alive) return;
        if (!picked(p, 'francotiradora', 's6', 'B')) return;
        const T = tune().herida;
        const tv = p.tv || {};
        const total = hit.raw * T.pct / 100 * Math.max(0, 1 + ((tv.dotPct || 0) + (tv.bleedPct || 0)) / 100);
        g.applyDoT?.(e, total, T.dur, 1, 'txt', 'a_t_apuntado:bleed');
      },
    },
    // x1 Punto Débil: Disparo Apuntado marca a élites y jefes 8 s (+15 % de crítico contra ellos).
    // x2 Herida Expuesta (tv.weakCritDmg): +X puntos de daño crítico (saco aditivo) contra el marcado.
    f_weakspot: {
      name: 'Punto Débil', desc: 'Disparo Apuntado marca a élites y jefes 8 s: +15 % de probabilidad de crítico contra ellos.',
      onHit(g, p, e, hit) {
        if (!e || hit?.proc || hit?.dot) return;
        if (hit.skill === 'a_t_apuntado' && e.alive && isEliteish(e)) {
          const fresh = !weak(p, e);
          e._weakspotUntil = now(p) + tune().weakspot.dur;
          e.weakspotBy = p;                              // el grupo (cooperativo) lo lee del enemigo
          if (fresh) g.ui?.spawnText?.(e.pos.clone().setY((e.def?.scale || 1) + 0.9), '¡PUNTO DÉBIL!', 'txt-crit');
        }
        // Herida Expuesta: el crítico ya salió; se suma la parte de +X puntos del saco aditivo
        const w = p.tv?.weakCritDmg || 0;
        if (w > 0 && hit.crit && weak(p, e) && e.alive && hit.raw > 0) {
          const A = 100 + (p.stats?.dmgPct || 0) + (p.stats?.critDmg || 0);
          dealProcDamage(g, e, hit.raw * w / A, { source: 'power:f_weakspot' });
        }
      },
      condCrit(p, e) { return weak(p, e) ? tune().weakspot.crit : 0; },
    },
    // x3 Disparo Imposible: con Concentración 100, Disparo Apuntado sale dos veces y el
    // segundo es crítico seguro (lo dispara el comportamiento; aquí se decide al lanzar)
    f_impossible: {
      name: 'Disparo Imposible', desc: 'Con la Concentración al 100 %, Disparo Apuntado se dispara dos veces y el segundo es crítico seguro.',
      priority: 5,                                     // antes de que Aliento del Cazador gaste 50
      onCast(g, p, cast) {
        if (cast?.sk?.id === 'a_t_apuntado' && focus(p) >= 100 - 1e-6) cast.impossible = true;
      },
    },

    // ---------------- Montaraz ----------------
    // s4 Cepo Doble: Trampa de Cepo gana una 2.ª carga (la lee el comportamiento).
    // Anfitrión de s10 Lazo Corredizo: Flecha Perforante inmoviliza al PRIMER enemigo que toca.
    m_cepo_doble: {
      name: 'Cepo Doble', desc: 'Trampa de Cepo gana una 2.ª carga.',
      state: () => ({ lazo: false }),
      onCast(g, p, cast) {
        if (cast?.sk?.id === 'flecha_perforante' && picked(p, 'montaraz', 's10')) powerState(p, 'm_cepo_doble').lazo = true;
      },
      onHit(g, p, e, hit) {
        if (hit?.skill !== 'flecha_perforante' || hit.proc || hit.dot) return;
        const st = powerState(p, 'm_cepo_doble');
        if (!st.lazo) return;
        st.lazo = false;
        const r = picked(p, 'montaraz', 's10');
        if (r > 0 && e?.alive) e.applyCC?.('root', tune().lazo.rootPerRank * r, { src: p });
      },
    },
    // s13B Guardabosques: las trampas armadas curan un 3 %/s a los aliados encima (campo a_cepo).
    // Anfitrión de s8 Pellejo de Oso: su −5 %/rango solo vale contra atacantes ralentizados.
    m_warden: {
      name: 'Guardabosques', desc: 'Tus trampas armadas curan un 3 % de vida por segundo a los aliados que estén encima.',
      condDr(p, info) {
        const r = picked(p, 'montaraz', 's8');
        if (!r) return 0;
        const src = info?.src;
        const slowed = !!src && ((src.slowT || 0) > 0 || (src.frozenT || 0) > 0);
        return slowed ? 0 : -tune().pellejo.drPerRank * r;   // recompute ya sumó el incondicional
      },
    },
    // s14 Coto Cerrado: 1 trampa armada más (4) y +30 % de radio de activación.
    // Con s17 Espinas Venenosas (tv.rootedWeak): los inmovilizados reciben +X % (Debilidad) de todo el grupo.
    m_extratrap: {
      name: 'Coto Cerrado', desc: 'Puedes armar 1 trampa más (hasta 4) y su radio de activación crece un 30 %.',
      stats(p) { return ownOn(p, 'm_extratrap') ? { 'gaugeMax:coto': 1 } : {}; },
      onTick(g, p) { rootedWeakTick(g, p); },
    },
    // x1 Red de Espinas: las trampas armadas a ≤ 10 m se unen; quien cruza la red queda
    // ralentizado un 50 % y sangra. x2 Zarzal (tv.webDmg): X % de tu golpe medio por segundo.
    // Anfitrión de s3 Abrojos (campo a_abrojos tras la Lluvia) y s11 Ponzoña Lenta (veneno ralentiza 10 %).
    m_thornweb: {
      name: 'Red de Espinas', desc: 'Tus trampas armadas a menos de 10 m se unen con una red de espinas que ralentiza un 50 % y hace sangrar.',
      procs: true,                                     // Ponzoña Lenta reacciona a los tics de Veneno
      state: () => ({ acc: 0, vfx: 0 }),
      onTick(g, p, dt) {
        if (!ownOn(p, 'm_thornweb')) return;
        const st = powerState(p, 'm_thornweb');
        const T = tune().web;
        st.acc += dt; st.vfx += dt;
        if (st.acc < T.pulse - 1e-9) return;
        st.acc = 0;
        const traps = armedTraps(g, p);
        if (traps.length < 2) return;
        const segs = [];
        for (let i = 0; i < traps.length; i++) for (let j = i + 1; j < traps.length; j++) {
          const a = traps[i].pos, b = traps[j].pos;
          if (Math.hypot(a.x - b.x, a.z - b.z) <= T.link) segs.push([a, b]);
        }
        if (!segs.length) return;
        if (st.vfx >= T.vfx) {
          st.vfx = 0;
          for (const [a, b] of segs) g.spawnBeam?.(v3(a.x, a.z, 0.3), v3(b.x, b.z, 0.3), 0x7a9a3a, T.vfx);
        }
        const webDmg = p.tv?.webDmg || 0;
        const great = ownOn(p, 'm_greathunt');
        const preyE = gaugeState(p, 'coto')?.prey || null;
        for (const e of g.enemies || []) {
          if (!e.alive) continue;
          const r = T.width + 0.3 * (e.def?.scale || 1);
          if (!segs.some(([a, b]) => segDist2(e.pos.x, e.pos.z, a, b) <= r * r)) continue;
          e.applyCC?.('slow', T.slowT, { pct: T.slowPct, src: p });
          if (!e._dots?.['m_thornweb:bleed']) {
            const d = dotOf(p, 'bleed', p.avgHit(T.bleedCoef) * 0.6, 3);
            g.applyDoT?.(e, d.total, d.ticks, 1, 'txt', 'm_thornweb:bleed');
          }
          if (webDmg > 0 && now(p) - (e._webAt ?? -9) >= 1 - 1e-6) {
            e._webAt = now(p);
            dealProcDamage(g, e, p.avgHit(1) * webDmg / 100, { source: 'power:m_thornweb' });
          }
          if (great && e.alive && e === preyE && e.prey) greatHunt(g, p, e);
        }
      },
      afterCast(g, p, cast) {
        if (cast?.sk?.id !== 'lluvia_flechas' || !picked(p, 'montaraz', 's3') || !cast.target) return;
        const prof = cast.prof;
        // la Estela que el núcleo creó por mod.zone (daña, no ralentiza) se sustituye por los Abrojos
        for (const f of g.fields || [])
          if (!f.dead && f.kind === 'estela' && f.owner === p && f.data?.skill === 'lluvia_flechas' && f.t > (f.dur || 0) - 0.05) {
            if (g._expireField) g._expireField(f); else f.t = 0;
          }
        g.spawnField?.('a_abrojos', { pos: cast.target.clone ? cast.target.clone() : cast.target, radius: prof.radius || 3,
          dur: prof.zoneDur || 2, owner: p, data: { slowPct: prof.slowPct || 30 } });
      },
      onHit(g, p, e, hit) {
        if (!hit?.dot || !e?.alive || !/:poison$/.test(hit.source || '') || !picked(p, 'montaraz', 's11')) return;
        const T = tune().ponzona;
        e.applyCC?.('slow', T.slowT, { pct: T.slowPct, src: p });
      },
    },
    // x3 Gran Cacería: si la Presa queda atrapada en la red, todas las trampas se rearman y el
    // grupo gana +15 % de daño 6 s (una vez por Presa; lo dispara m_thornweb).
    // Anfitrión de s15 Cazadora Paciente: su +10 %/rango (tv.eliteDmg) solo contra la Presa.
    m_greathunt: {
      name: 'Gran Cacería', desc: 'Si tu Presa queda atrapada en la red, todas las trampas se rearman y el grupo gana +15 % de daño durante 6 s.',
      onTick(g, p) { rootedWeakTick(g, p); },          // s17 (ver m_extratrap)
      condAdd(p, e) {
        const r = picked(p, 'montaraz', 's15');
        if (!r || !e || !isEliteish(e) || e.prey) return 0;
        return -tune().presa.perRank * r;              // eliteDmg ya lo sumó contra cualquier élite
      },
    },

    // ---------------- Tiradora Veloz ----------------
    // s4 Andanada Impulsiva: Andanada da 20 de Impulso.
    // Anfitrión de s6B Corona de Flechas: Flecha Múltiple sale en 360°.
    t_andanada_impulsiva: {
      name: 'Andanada Impulsiva', desc: 'Andanada te da 20 de Impulso.',
      priority: -10,                                   // modifyResolve: después de sumar proyectiles
      onCast(g, p, cast) {
        if (cast?.sk?.id === 'a_t_andanada' && ownOn(p, 't_andanada_impulsiva')) gainGauge(p, 'impulso', tune().andanada.impulso);
      },
      modifyResolve(p, sk, prof) {
        if (sk.id !== 'flecha_multiple' || !picked(p, 'tiradora', 's6', 'B')) return;
        const n = Math.max(1, (prof.count || 1) + (prof.proj || 0));
        prof.spread = Math.PI * (n - 1) / n;            // n flechas repartidas en la vuelta entera
      },
    },
    // s13B Estela de Viento: durante el Vendaval dejas una estela que acelera un 15 % a los aliados.
    // Anfitrión de s5 Viento de Cola (+5 %/rango de vel. de ataque con Agilidad) y de s8 Esquiva
    // Felina (su −4 %/rango solo mientras te mueves).
    t_slipstream: {
      name: 'Estela de Viento', desc: 'Durante el Vendaval dejas una estela que acelera un 15 % a los aliados.',
      state: () => ({ acc: 9 }),
      stats(p) {
        const r = picked(p, 'tiradora', 's5');
        return r && p.buffs?.some(b => b.id === 'agilidad') ? { aspdPct: tune().vientoCola.aspdPerRank * r } : {};
      },
      condDr(p) {
        const r = picked(p, 'tiradora', 's8');
        return r && !p.moving ? -tune().esquiva.drPerRank * r : 0;
      },
      onTick(g, p, dt) {
        if (!ownOn(p, 't_slipstream')) return;
        const st = powerState(p, 't_slipstream');
        const T = tune().slip;
        st.acc += dt;
        if (!((gaugeState(p, 'impulso')?.galeT || 0) > 0) || !partyOf(g, p).length) return;
        if (st.acc < T.every - 1e-9) return;
        st.acc = 0;
        g.spawnField?.('a_estela_viento', { pos: p.pos.clone().setY(0), radius: T.radius, dur: T.dur, owner: p, data: { spdPct: T.spdPct } });
      },
    },
    // s14 Vendaval Perpetuo: durante el Vendaval cada muerte lo alarga 0,5 s (hasta +6 s).
    // Anfitrión de s11 Segundo Aliento: al llenar el Impulso, +X % de vida y +10/rango de Energía.
    t_galechain: {
      name: 'Vendaval Perpetuo', desc: 'Durante el Vendaval, cada enemigo abatido alarga su duración 0,5 s (hasta +6 s).',
      state: () => ({ ext: 0 }),
      onGauge(g, p, id, ev) {
        if (id !== 'impulso' || ev !== 'full') return;
        powerState(p, 't_galechain').ext = 0;
        const r = picked(p, 'tiradora', 's11');
        if (r) {
          const pct = p.tv?.galeHeal || 0;
          if (pct > 0) g?.heal?.(p.stats.maxHP * pct / 100, { target: 'self', src: 't_segundo_aliento' });
          g?.gainResource?.(p, tune().segundo.energyPerRank * r);
        }
      },
      onKill(g, p) {
        if (!ownOn(p, 't_galechain')) return;
        const gs = gaugeState(p, 'impulso');
        const st = powerState(p, 't_galechain');
        const T = tune().galechain;
        if (!(gs?.galeT > 0) || st.ext >= T.max - 1e-9) return;
        const add = Math.min(T.perKill, T.max - st.ext);
        gs.galeT += add;
        st.ext += add;
        const b = p.buffs?.find(x => x.id === 't_vendaval');
        if (b) { b.t += add; b.dur += add; }
      },
    },
    // x1 Ráfaga Infinita: cada 10 disparos, el siguiente no cuesta Energía y lanza el doble de
    // proyectiles. x2 Huracán (tv.infiniteDmg): +X % de daño y +X de Impulso en ese disparo.
    t_infinite: {
      name: 'Ráfaga Infinita', desc: 'Cada 10 disparos, el siguiente no cuesta Energía y lanza el doble de proyectiles.',
      priority: -5,                                    // después de multidisparo/Vendaval, antes de la Corona
      state: () => ({ shots: 0, ready: false, basicAt: null }),
      modifyResolve(p, sk, prof) {
        const st = powerState(p, 't_infinite');
        if (!st.ready || !prof.tags?.has?.('proj')) return;
        const n = Math.max(1, (prof.count || 1) + (prof.proj || 0));
        prof.proj = (prof.proj || 0) + n;               // el doble de proyectiles
        prof.cost = 0;
        prof.addPct = (prof.addPct || 0) + (p.tv?.infiniteDmg || 0);
        prof.infinite = true;
      },
      onCast(g, p, cast) { if (cast?.prof?.tags?.has?.('proj')) infiniteShot(g, p, !!cast.prof.infinite); },
      // el básico de arma no pasa por ⑦: se detecta por p.basicAt
      onTick(g, p) {
        const st = powerState(p, 't_infinite');
        if (p.basicAt == null || p.basicAt === st.basicAt) return;
        st.basicAt = p.basicAt;
        infiniteShot(g, p, st.ready);
      },
    },
    // x3 Ojo del Huracán: durante el Vendaval, Ráfaga Infinita cada 5 disparos (la lee t_infinite)
    t_eyestorm: {
      name: 'Ojo del Huracán', desc: 'Durante el Vendaval, Ráfaga Infinita se activa cada 5 disparos en lugar de 10.',
    },
  };
}

// ============================================================
// COMPORTAMIENTOS de las activas de talento
// ============================================================
export function arqueraSkillBehaviors() {
  return {
    // c2 Voltereta: ruedas 6 m hacia atrás; el próximo disparo no cuesta Energía (se devuelve
    // lo que gaste, ventana de 10 s). Cuero Curtido (c7): su reducción de daño se duplica 2 s.
    a_t_voltereta: {
      name: 'Voltereta',
      cast(g, p, prof, cast) {
        const { ctx, sk } = cast;
        const dest = backDest(g, p, cast.target, prof.range || sk.range || 6);
        const r7 = nodeRank(p, 'cls', 'c7');
        if (r7 > 0) {
          const T = tune().cuero;
          p.addBuff('a_cuero_curtido', { dr: T.drPerRank * r7 }, T.dur, { name: 'Cuero Curtido', icon: '🛡️', desc: `−${T.drPerRank * r7}% de daño recibido` });
        }
        const st = powerState(p, 'a_t_voltereta');
        st.until = now(p) + tune().freeShot.window;
        st.lastMp = p.mp;
        st.lastAt = g.timers.now;
        const id = st.id = (st.id || 0) + 1;
        const poll = () => {
          if (st.id !== id || !p.alive || now(p) > st.until) return;
          const drop = st.lastMp - p.mp;
          if (drop > 0.5) {
            const regen = (6 + (p.stats?.energyRegen || 0)) * Math.max(0, g.timers.now - st.lastAt);
            g.gainResource?.(p, drop + regen);
            st.until = 0;
            g.ui?.spawnText?.(p.pos, 'Disparo gratis', 'txt-mana');
            return;
          }
          st.lastMp = p.mp; st.lastAt = g.timers.now;
          g.timers.schedule(tune().frame, poll);
        };
        g.timers.schedule(tune().frame, poll);
        if (ctx.fx?.aura) g.emitFx?.(ctx.fx.aura, p.pos.clone().setY(0.4));
        slide(g, p, dest, sk.lockT || 0.25, { trail: ctx.fx?.trail, onDone: () => cast.done(ctx.res) });
        return undefined;
      },
    },
    // c5A Flecha Silenciadora: interrumpe y silencia 3 s (a los jefes, +20 de stagger del interrumpir)
    a_t_silencio: {
      name: 'Flecha Silenciadora',
      cast(g, p, prof, cast) {
        const { ctx, sk } = cast;
        const fly = shootFan(g, p, prof, cast, { size: 0.12, onEnemy: (e) => {
          if (!e?.alive) return;
          e.applyCC?.('interrupt', sk.silence || 3, { src: p });
          if (ctx.fx?.extra) g.emitFx?.(ctx.fx.extra, e.pos.clone().setY(1.6));
        } });
        g.timers.schedule(fly, () => cast.done(ctx.res));
        return undefined;
      },
    },
    // c12A Flecha Bengala: campo de 10 m 8 s; dentro el grupo hace +8 % de daño (aditivo)
    a_t_bengala: {
      name: 'Flecha Bengala',
      cast(g, p, prof, cast) {
        const { ctx, sk } = cast;
        const at = (cast.target || p.pos).clone(); at.y = 0;
        p.faceToward?.(at);
        g.spawnBeam?.(p.pos.clone().setY(1.0), at.clone().setY(2.5), ctx.color || 0xffcc55, 0.3);
        const f = g.spawnField?.('a_bengala', { pos: at, radius: prof.radius || sk.radius || 10, dur: prof.dur || sk.dur || 8, owner: p,
          data: { dmgPct: sk.dmgPct || 8, color: sk.color || 0xffcc55, name: sk.name, icon: sk.icon } });
        if (f) arqueraFieldsCache().a_bengala.tick(g, f, 0);   // primer pulso al instante
        if (ctx.fx?.aura) g.emitFx?.(ctx.fx.aura, at.clone().setY(2.5));
        ctx.zoneCenter = at; ctx.zoneRad = prof.radius || 10;
        return ctx.res;
      },
    },
    // c12B Camuflaje: invisible 4 s (los enemigos pierden el objetivo); el primer disparo al
    // salir es crítico seguro (lo marca a_tailwind.condCrit; disparar también rompe el camuflaje)
    a_t_camuflaje: {
      name: 'Camuflaje',
      cast(g, p, prof, cast) {
        const { ctx, sk } = cast;
        const dur = prof.dur || sk.dur || 4;
        const st = powerState(p, 'a_t_camuflaje');
        if (st.ghost) st.ghost.alive = false;
        const ghost = { pos: p.pos.clone().setY(0), alive: true, ghost: true, takeDamage() { return 0; }, applySlow() { return false; } };
        st.ghost = ghost;
        st.until = now(p) + dur;
        st.crit = false;
        st.critHit = null;
        const id = st.id = (st.id || 0) + 1;
        p.addBuff(sk.id, {}, dur, { name: sk.name, icon: sk.icon, desc: 'Invisible: los enemigos te pierden; tu primer disparo será crítico' });
        loseTarget(g, p, ghost);
        const pulse = () => {
          if (st.id !== id) return;
          if (now(p) >= st.until) { if (st.until > 0) endCamo(p, st, true); return; }
          loseTarget(g, p, ghost);
          g.timers.schedule(tune().camo.pulse, pulse);
        };
        g.timers.schedule(tune().camo.pulse, pulse);
        if (ctx.fx?.aura) g.emitFx?.(ctx.fx.aura, p.pos.clone().setY(1.0));
        return ctx.res;
      },
    },
    // F s0 Disparo Apuntado: saeta perforante (la carga de 1 s es el windup del núcleo).
    // Disparo Imposible (x3): con cast.impossible sale una segunda saeta de crítico seguro.
    a_t_apuntado: {
      name: 'Disparo Apuntado',
      cast(g, p, prof, cast) {
        const { ctx, sk } = cast;
        let wait = shootFan(g, p, prof, cast, { size: 0.16, beam: !!sk.beam });
        if (cast.impossible) {
          const c2 = { ...ctx, hitInfo: { ...ctx.hitInfo, forceCrit: true }, _chained: false };
          const gap = tune().impossible.gap;
          g.timers.schedule(gap, () => {
            if (!p.alive) return;
            shootFan(g, p, prof, cast, { ctx: c2, size: 0.18, beam: true });
            g.ui?.spawnText?.(p.pos, '¡DISPARO IMPOSIBLE!', 'txt-crit');
          });
          wait += gap;
        }
        g.timers.schedule(wait, () => cast.done(ctx.res));
        return undefined;
      },
    },
    // F s9 Visión Certera: 12 s de +25 % de vel. de ataque; moverte no vacía la Concentración
    // y Disparo Apuntado se recarga un 50 % más rápido (planificador, cada tick)
    a_t_vision: {
      name: 'Visión Certera',
      cast(g, p, prof, cast) {
        const { ctx, sk } = cast;
        const dur = prof.dur || sk.dur || 12;
        p.addBuff(sk.id, { ...prof.buff }, dur, { name: sk.name, icon: sk.icon, desc: sk.desc });
        const st = powerState(p, 'a_t_vision');
        st.until = now(p) + dur;
        st.keep = gaugeState(p, 'concentracion')?.v || 0;
        let last = g.timers.now;
        const id = st.id = (st.id || 0) + 1;
        const faster = (sk.aimedCdr || 50) / 100;
        const tick = () => {
          if (st.id !== id || !p.alive || now(p) >= st.until) return;
          const dt = Math.max(0, g.timers.now - last); last = g.timers.now;
          if ((p.cds?.a_t_apuntado || 0) > 0) p.cds.a_t_apuntado = Math.max(0, p.cds.a_t_apuntado - dt * faster);
          const s = gaugeState(p, 'concentracion');
          if (s) {
            // solo se devuelve la PÉRDIDA por moverte (≤ 25/s); un gasto (Aliento: 50) se queda
            const lost = st.keep - s.v;
            if (p.moving && lost > 0 && lost <= tune().acechador.drain * Math.max(dt, 0.1) * 1.5 + 0.05) s.v = st.keep;   // el indicador pierde a 10 Hz
            else st.keep = s.v;
          }
          g.timers.schedule(tune().frame, tick);
        };
        g.timers.schedule(tune().frame, tick);
        g.spawnRing?.(p.pos, 1.4, ctx.color || 0xffd966);
        if (ctx.fx?.aura) g.emitFx?.(ctx.fx.aura, p.pos.clone().setY(1.6));
        return ctx.res;
      },
    },
    // F s13A Disparo Disuasorio: 120 % del arma a quemarropa, aturde 1 s (stun del perfil) y
    // el retroceso te lanza 8 m hacia atrás
    a_t_disuasorio: {
      name: 'Disparo Disuasorio',
      cast(g, p, prof, cast) {
        const { ctx, sk } = cast;
        const range = prof.range || sk.range || 8;
        let e = ctx.enemy;
        if (!e?.alive || e.pos.distanceTo(p.pos) > range + 0.6) e = g.nearestEnemy?.(range) || null;
        const aim = e ? e.pos.clone() : (cast.target || p.pos).clone();
        p.faceToward?.(aim);
        p.swing = 1;
        if (e) {
          const { dmg, crit } = p.rollDamage(ctx.coef, prof.critBonus, prof.addPct, e, ctx.hitInfo);
          ctx.hit(e, e.takeDamage(dmg, crit, ctx.dmgOpts) || 0);
          p.onDealHit?.();
          if (ctx.fx?.impact) g.emitFx?.(ctx.fx.impact, e.pos.clone().setY(1.0));
        }
        g.spawnBeam?.(p.pos.clone().setY(1.0), aim.clone().setY(1.0), ctx.color || 0xe8d27a, 0.15);
        g.addShake?.(0.2);
        const dest = backDest(g, p, aim, sk.selfKnock || 8);
        slide(g, p, dest, 0.3, { trail: ctx.fx?.trail, onDone: () => cast.done(ctx.res) });
        return undefined;
      },
    },
    // M s0 Trampa de Cepo: cargas (1, 2 con Cepo Doble; 8 s por carga), hasta 3 armadas
    // (4 con Coto Cerrado, +30 % de radio). Inmoviliza 2 s (+1 Cepo de Hierro, +0,5/rango
    // Raíces Profundas) y envenena 150 % en 5 s. Mina de Espinas: estalla 120 % en 3 m, sin inmovilizar.
    a_t_cepo: {
      name: 'Trampa de Cepo',
      cast(g, p, prof, cast) {
        const { ctx, sk } = cast;
        const T = tune().cepo;
        const cd = prof.cd || sk.cd || 8;
        const st = trapCharges(p, cd);
        if (st.charges <= 0) { p.cds[sk.id] = Math.max(0, st.nextAt - now(p)); return ctx.res; }
        const wasFull = st.charges >= st.max;
        st.charges--;
        if (wasFull) st.nextAt = now(p) + cd;
        p.cds[sk.id] = st.charges > 0 ? 0 : Math.max(0, st.nextAt - now(p));
        if (p.cdMax) p.cdMax[sk.id] = cd;
        // trampas armadas: al pasar del máximo cae la más vieja
        const maxArmed = T.maxArmed + (extraTrap(p) ? 1 : 0);
        const armed = armedTraps(g, p);
        while (armed.length >= maxArmed) {
          const old = armed.shift();
          if (g._expireField) g._expireField(old); else old.t = 0;
        }
        const mine = picked(p, 'montaraz', 's6', 'B') > 0;
        const iron = picked(p, 'montaraz', 's6', 'A') > 0;
        const baseMul = mine ? Math.max(0.2, (prof.radiusMul || 2) - 1) : (prof.radiusMul || 1);   // Mina: radius +100 = solo la explosión
        const trigR = (sk.radius || 1.5) * baseMul * (extraTrap(p) ? 1 + T.extraR : 1);
        const root = ((sk.root || 2) + (iron ? T.ironRoot : 0) + T.deepRootPerRank * nodeRank(p, 'montaraz', 's16')) * (prof.durMul || 1);
        // Mina: su mod.dmg +120 (fijado por test65a) es el «120 % de daño» de la explosión, no un
        // bono aditivo: se descuenta del veneno y de la explosión
        const add = prof.addPct - (mine ? T.mineAdd : 0);
        const poison = dotOf(p, 'poison', mine ? p.avgHit(prof.coef, add) : ctx.avgHit, sk.dotDur || T.poisonDur);
        const at = (cast.target || p.pos).clone(); at.y = 0;
        const color = ctx.color || sk.color || 0x86d47a;
        g.spawnField?.('a_cepo', { pos: at, radius: trigR, dur: sk.armT || 30, owner: p,
          data: { trap: true, skill: sk.id, color, root, mine, bossSlow: iron ? 50 : 0, poison,
            blastR: prof.radius || 3, blastCoef: T.mineCoef * rankCoef(prof.rank),
            areaOpts: { addPct: add, critBonus: prof.critBonus, color, hitInfo: ctx.hitInfo } } });
        p.faceToward?.(at);
        if (ctx.fx?.aura) g.emitFx?.(ctx.fx.aura, at.clone().setY(0.3));
        g.spawnRing?.(at, trigR, color);
        ctx.zoneCenter = at; ctx.zoneRad = trigR;
        return ctx.res;
      },
    },
    // M s9 Arpón: 120 % del arma, ralentiza 60 % 3 s (perfil) y atrae 6 m hacia tu trampa
    // armada más cercana al objetivo (sin trampas, hacia ti). Jefes: el empuje suma stagger.
    a_t_arpon: {
      name: 'Arpón',
      cast(g, p, prof, cast) {
        const { ctx, sk } = cast;
        const fly = shootFan(g, p, prof, cast, { size: 0.14, onEnemy: (e) => {
          if (!e?.alive) return;
          let anchor = null, bd = Infinity;
          for (const f of armedTraps(g, p)) {
            const d = Math.hypot(f.pos.x - e.pos.x, f.pos.z - e.pos.z);
            if (d < bd) { bd = d; anchor = f.pos; }
          }
          if (!anchor) { anchor = p.pos; bd = e.pos.distanceTo(p.pos); }
          const dist = Math.min(sk.pull || 6, bd - 0.3);
          g.spawnBeam?.(p.pos.clone().setY(1.0), e.pos.clone().setY(1.0), ctx.color || 0xa0a0a0, 0.25);
          if (dist > 0.2) e.applyCC?.('knock', dist, { src: p, from: { x: 2 * e.pos.x - anchor.x, z: 2 * e.pos.z - anchor.z } });
        } });
        g.timers.schedule(fly, () => cast.done(ctx.res));
        return undefined;
      },
    },
    // M s13A Señuelo de Paja: provoca 5 s a los enemigos a 8 m y luego estalla (200 % en 3 m)
    a_t_senuelo: {
      name: 'Señuelo de Paja',
      cast(g, p, prof, cast) {
        const { ctx, sk } = cast;
        const at = (cast.target || p.pos).clone(); at.y = 0;
        const decoy = { pos: at.clone(), alive: true, decoy: true, hp: 1, stats: { maxHP: 1 }, takeDamage() { return 0; }, applySlow() { return false; } };
        const f = g.spawnField?.('a_senuelo', { pos: at, radius: prof.radius || sk.radius || 8, dur: prof.dur || sk.dur || 5, owner: p,
          data: { decoy, burstR: (sk.burstRadius || 3) * (prof.radiusMul || 1), coef: ctx.coef, color: ctx.color || sk.color || 0xc9a86a,
            areaOpts: { addPct: prof.addPct, critBonus: prof.critBonus, color: ctx.color, hitInfo: ctx.hitInfo, onHit: ctx.hit } } });
        if (f) arqueraFieldsCache().a_senuelo.tick(g, f, 0);
        if (ctx.fx?.aura) g.emitFx?.(ctx.fx.aura, at.clone().setY(0.6));
        ctx.zoneCenter = at; ctx.zoneRad = sk.burstRadius || 3;
        return ctx.res;
      },
    },
    // T s0 Andanada: 12 flechas en 120° (60 % cada una) mientras retrocedes 3 m
    a_t_andanada: {
      name: 'Andanada',
      cast(g, p, prof, cast) {
        const { ctx, sk } = cast;
        const fly = shootFan(g, p, prof, cast, { spread: prof.spread || sk.spread || 1.047, size: 0.09 });
        const dest = backDest(g, p, cast.target, sk.backstep || 3);
        slide(g, p, dest, sk.lockT || 0.35, { trail: ctx.fx?.trail });
        g.timers.schedule(Math.max(fly, sk.lockT || 0.35), () => cast.done(ctx.res));
        return undefined;
      },
    },
    // T s9 Danza de Flechas: 16 flechas en espiral en 4 s (50 % cada una) sin dejar de correr,
    // inmune a las ralentizaciones (no ralentiza ni frena el movimiento)
    a_t_danza: {
      name: 'Danza de Flechas',
      cast(g, p, prof, cast) {
        const { ctx, sk } = cast;
        const dur = sk.channelT || 4;
        const n = Math.max(1, sk.ticks || 16);
        const gap = dur / n;
        const range = Math.max(3, prof.radius || sk.radius || 4);
        p.grantSlowImmune?.(dur);
        p.castLock = Math.max(p.castLock || 0, dur);
        const base = Math.atan2((cast.target?.x ?? p.pos.x + 1) - p.pos.x, (cast.target?.z ?? p.pos.z) - p.pos.z);
        const turn = Math.PI * 2 / Math.max(1, n / 2);   // dos vueltas de espiral
        let i = 0;
        const shoot = () => {
          if (!p.alive) { cast.done(ctx.res); return; }
          g.fireProjectile(ctx, { angle: base + i * turn, range, size: 0.09 });
          if (ctx.fx?.aura && i % 4 === 0) g.emitFx?.(ctx.fx.aura, p.pos.clone().setY(1.0));
          i++;
          if (i < n) g.timers.schedule(gap, shoot);
          else g.timers.schedule(range / Math.max(1, prof.speed || 14) + 0.05, () => cast.done(ctx.res));
        };
        shoot();
        return undefined;
      },
    },
    // T s13A Salto de Retirada: saltas 7 m hacia atrás (en el aire eres intocable) y al
    // aterrizar disparas 5 flechas (60 %); +30 de Impulso al lanzarlo
    a_t_salto: {
      name: 'Salto de Retirada',
      cast(g, p, prof, cast) {
        const { ctx, sk } = cast;
        const to = backDest(g, p, cast.target, prof.range || sk.range || 7);
        gainGauge(p, 'impulso', sk.gaugeGain || 30);
        if (ctx.fx?.trail) g.emitFx?.(ctx.fx.trail, p.pos.clone().setY(0.3));
        p.leap = {
          from: p.pos.clone(), to, t: 0, dur: sk.airT || 0.4,
          onLand: () => {
            const e = g.nearestEnemy?.(12) || null;
            const aim = e ? e.pos.clone() : (cast.target || p.pos).clone();
            const fly = shootFan(g, p, prof, { ...cast, target: aim }, { n: (prof.count || 5) + (prof.proj || 0), spread: 0.26, size: 0.09 });
            g.timers.schedule(fly, () => cast.done(ctx.res));
          },
        };
        return undefined;
      },
    },
  };
}

// ============================================================
// CAMPOS DE SUELO propios (tope por dueño: FIELD_CAP_PER_OWNER = 12, FIFO del núcleo)
// ============================================================
// eslint-disable-next-line no-var
var FIELDS_CACHE;
function arqueraFieldsCache() { return FIELDS_CACHE || (FIELDS_CACHE = buildFields()); }
export function arqueraFields() { return arqueraFieldsCache(); }

function buildFields() {
  return {
    // Trampa de Cepo armada (data.trap: cuenta para el Coto de Caza). Salta con el primer
    // enemigo; con Guardabosques cura un 3 %/s a los aliados encima.
    a_cepo: {
      name: 'Trampa de Cepo',
      init(f) { f.acc = 0; f.data.color = f.data.color ?? 0x86d47a; },
      onEnter(g, f, e) { if (!f.dead && !f.sprung) springTrap(g, f, e); },
      tick(g, f, dt) {
        if (f.sprung) return;
        f.acc += dt;
        const T = tune().warden;
        if (f.acc < T.pulse - 1e-9) return;
        const step = f.acc; f.acc = 0;
        const p = f.owner;
        if (!p || !wardenOn(p)) return;
        const at = v3(f.pos.x, f.pos.z);
        for (const a of g.allies ? g.allies(at, f.radius) : []) {
          const n = (a.stats?.maxHP || 0) * T.pctPerSec / 100 * step;
          if (!(n > 0)) continue;
          if (a === g.player) g.heal?.(n, { target: 'self', src: 'm_warden' });
          else a.healSkill?.(n, 'm_warden');
        }
      },
      render(g, f) {
        const d = groundDecal(g, f, { inner: 0.55, opacity: 0.55, color: f.data.color });
        if (d) d.material.opacity = 0.4 + 0.15 * Math.abs(Math.sin(f.t * 3));
      },
    },
    // Abrojos (Montaraz s3): ralentizan un 30 % a quien esté dentro
    a_abrojos: {
      name: 'Abrojos',
      init(f) { f.acc = 0.5; },
      tick(g, f, dt) {
        f.acc += dt;
        if (f.acc < 0.5 - 1e-9) return;
        f.acc = 0;
        for (const e of enemiesInField(g, f)) e.applyCC?.('slow', 0.7, { pct: f.data.slowPct || 30, src: f.owner });
      },
      render(g, f) { groundDecal(g, f, { disc: true, opacity: 0.18, color: 0x9a8a5a }); },
    },
    // Flecha Bengala: renueva +8 % de daño a los aliados dentro y marca a los enemigos revelados
    a_bengala: {
      name: 'Flecha Bengala',
      init(f) { f.acc = 0; },
      tick(g, f, dt) {
        f.acc += dt;
        if (dt > 0 && f.acc < 0.5 - 1e-9) return;
        f.acc = 0;
        const at = v3(f.pos.x, f.pos.z);
        for (const a of g.allies ? g.allies(at, f.radius) : [])
          refreshBuff(a, 'a_t_bengala', { dmgPct: f.data.dmgPct }, 0.65, { name: f.data.name || 'Bengala', icon: f.data.icon || '🎆', desc: `+${f.data.dmgPct}% de daño` });
        for (const e of enemiesInField(g, f)) e.revealedT = 0.6;
      },
      render(g, f) {
        const d = groundDecal(g, f, { inner: 0.94, opacity: 0.35, color: f.data.color });
        if (d) d.material.opacity = 0.25 + 0.12 * Math.abs(Math.sin(f.t * 4));
      },
    },
    // Señuelo de Paja: provoca a los enemigos en el radio; al caducar estalla en espinas
    a_senuelo: {
      name: 'Señuelo de Paja',
      init(f) { f.acc = 0; },
      tick(g, f, dt) {
        f.acc += dt;
        if (dt > 0 && f.acc < 0.5 - 1e-9) return;
        f.acc = 0;
        const t = Math.min(f.t, 0.7);
        if (!(t > 0)) return;
        for (const e of enemiesInField(g, f)) g.forceTarget?.(e, f.data.decoy, t);
      },
      onExpire(g, f) {
        const d = f.data;
        if (d.decoy) d.decoy.alive = false;
        const at = v3(f.pos.x, f.pos.z);
        g.dealArea?.(at, d.burstR, d.coef, d.areaOpts);
        g.spawnRing?.(at, d.burstR, d.color);
        g.emitFx?.('arqThornBurst', at.clone().setY(0.5));
        g.sfx?.('hit');
      },
      render(g, f) { groundDecal(g, f, { inner: 0.96, opacity: 0.25, color: f.data.color }); },
    },
    // Estela de Viento (Tiradora s13B): +15 % de velocidad a los ALIADOS dentro (no al dueño)
    a_estela_viento: {
      name: 'Estela de Viento',
      init(f) { f.acc = 0.5; },
      tick(g, f, dt) {
        f.acc += dt;
        if (f.acc < 0.5 - 1e-9) return;
        f.acc = 0;
        for (const a of partyOf(g, f.owner, v3(f.pos.x, f.pos.z), f.radius))
          refreshBuff(a, 't_slipstream', { spdPct: f.data.spdPct || 15 }, 0.7, { name: 'Estela de Viento', icon: '🌬️' });
      },
      render(g, f) { groundDecal(g, f, { disc: true, opacity: 0.12, color: 0x7fe8d8 }); },
    },
  };
}

export function arqueraGauges() {
  return {};
}
