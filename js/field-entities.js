// ============================================================
// Entidades de SUELO (campos, trampas, zonas) — registro + mixin de Game
// ============================================================
// Paso 2b.0 — docs/paso2-diseno.md §9.1.3. Sustituye al genérico `groundZones`
// (la Estela de las ramas de Transformación se migró aquí como kind 'estela').
//   defineField(kind, { init(f, opts), tick(g, f, dt), onEnter?(g, f, e),
//                       onExit?(g, f, e), onExpire?(g, f), onDetonate?(g, f, opts), render?(g, f) })
//   g.spawnField(kind, { pos, radius, dur, owner, data, follow, shape, a, b, width, maxPerSkill }) → f | null
//       (tope de FIELD_CAP_PER_OWNER por dueño: al pasarlo cae el más viejo, FIFO;
//        maxPerSkill: tope por habilidad —data.skill— del mismo dueño y tipo, FIFO)
//   g.fieldsAt(pos) → campos que contienen la posición
//   g.updateFields(dt) (lo llama Game.tick) · g.clearFields() (Game.loadWorld)
// `render` es opcional y va en try/catch: en headless (sin fxGroup) no se dibuja
// nada. Se llama al crear el campo, en cada tick y una última vez con f.dead=true
// para que libere lo que haya creado.
// El daño de los campos se marca `dot:true` (como un DoT: no dispara onHit salvo
// los poderes con `procs:true`) y NO es proc (recibe Debilidad y Π[×] como antes).
// Paso 2 (2g, docs/paso2-implementacion.md §3.6): forma `line` (a, b, width: muros y
// estelas de avance), `follow` ('owner' | 'aim': se recentra cada tick), armado (data.armT),
// `g.fieldsOf`, `g.nearestOwnField`, `g.detonateField`/`g.detonateAt` (detonar trampas
// propias: perTarget, cadena), trampa genérica ampliada (armado, estallido, consumo, cebo),
// campos `muro` (bloquea o encierra), `senuelo` (atrae) y `emisor` (dispara desde su sitio).
// El movimiento enemigo lo corrigen `g.lureStep` (cebo, 5 Hz escalonado) y
// `g.constrainMove` (muros y zonas que encierran); solo cuestan algo con g._moveFields > 0.
import * as THREE from 'three';

export const FIELD_DEFS = {};
export const FIELD_CAP_PER_OWNER = 12;
const FIELD_KEYS = new Set(['init', 'tick', 'onEnter', 'onExit', 'onExpire', 'onDetonate', 'render', 'name']);
// retardo del estallido de una trampa detonada (parpadea en rojo antes: §3.6)
export const TRAP_FLASH_T = 0.1;
// el cebo no mueve a quien ya pelea cuerpo a cuerpo contigo (m)
const LURE_MELEE_R = 2.5;

export function defineField(kind, def) {
  if (!kind || FIELD_DEFS[kind]) throw new Error(`defineField: kind inválido o repetido "${kind}"`);
  for (const k of Object.keys(def || {})) if (!FIELD_KEYS.has(k)) throw new Error(`defineField("${kind}"): clave desconocida "${k}"`);
  FIELD_DEFS[kind] = Object.freeze({ kind, ...def });
  return FIELD_DEFS[kind];
}

let fieldUid = 1;
let lureSeq = 0;
// distancia² de un punto al segmento a–b
function segDist2(px, pz, a, b) {
  const vx = b.x - a.x, vz = b.z - a.z;
  const l2 = vx * vx + vz * vz;
  const t = l2 > 1e-9 ? Math.max(0, Math.min(1, ((px - a.x) * vx + (pz - a.z) * vz) / l2)) : 0;
  const dx = px - (a.x + vx * t), dz = pz - (a.z + vz * t);
  return dx * dx + dz * dz;
}
// ¿`pos` está dentro del campo? (círculo o línea con grosor); pad: margen extra
export function insideField(f, pos, pad = 0) {
  if (f.shape === 'line') { const r = f.width / 2 + pad; return segDist2(pos.x, pos.z, f.a, f.b) <= r * r; }
  const dx = pos.x - f.pos.x, dz = pos.z - f.pos.z, r = f.radius + pad;
  return dx * dx + dz * dz <= r * r;
}
const inside = (f, pos) => insideField(f, pos);
// ¿el paso (bx, bz) → (nx, nz) cruza el segmento a–b del muro (alargado `pad` m por cada extremo)?
function stepCrosses(f, bx, bz, nx, nz, pad) {
  const wx = f.b.x - f.a.x, wz = f.b.z - f.a.z, mx = nx - bx, mz = nz - bz;
  const den = mx * wz - mz * wx;
  if (Math.abs(den) < 1e-12) return false;
  const dx = f.a.x - bx, dz = f.a.z - bz;
  const t = (dx * wz - dz * wx) / den;            // a lo largo del paso
  const u = (dx * mz - dz * mx) / den;            // a lo largo del muro
  const e = pad / (Math.hypot(wx, wz) || 1);
  return t >= 0 && t <= 1 && u >= -e && u <= 1 + e;
}
const isBossE = e => !!(e?.def?.boss || e?.def?.uber || e?.def?.worldBoss);
// ¿el campo cambia el movimiento enemigo? (muro, zona que encierra, cebo)
const movesEnemies = f => !f.dead && (f.kind === 'muro' || !!f.data?.contain || !!f.data?.lure);
// ¿armada? (data.armT s desde que se colocó o se rearmó)
export const fieldArmed = f => !f.dead && !f.sprung && (f.age || 0) >= (f.armAt || 0) - 1e-9;
// ¿es una trampa detonable? (la genérica, las de clase con onDetonate o data.trap)
const isTrap = f => f.kind === 'trampa' || !!FIELD_DEFS[f.kind]?.onDetonate || !!f.data?.trap;

export const fieldMethods = {
  // crea un campo de suelo; devuelve el campo o null si el kind no existe
  spawnField(kind, { pos, radius = 2, dur = 4, owner = null, data = {}, follow = null, shape = null, a = null, b = null, width = 1, maxPerSkill = 0 } = {}) {
    const def = FIELD_DEFS[kind];
    if (!def || !pos) return null;
    if (!this.fields) this.fields = [];
    // tope por dueño (FIFO): el más viejo caduca ya
    const mine = this.fields.filter(f => f.owner === owner && !f.dead);
    while (mine.length >= FIELD_CAP_PER_OWNER) this._expireField(mine.shift());
    // tope por habilidad (zoneMax, trap.maxArmed, un muro por habilidad)
    if (maxPerSkill > 0 && data?.skill) {
      const same = this.fields.filter(f => !f.dead && f.owner === owner && f.kind === kind && f.data?.skill === data.skill);
      while (same.length >= maxPerSkill) this._expireField(same.shift());
    }
    const f = { uid: fieldUid++, kind, pos: { x: pos.x, y: 0.05, z: pos.z }, radius, dur, t: dur, owner, data: { ...data }, inside: new Set(), dead: false,
      age: 0, armAt: Math.max(0, data?.armT || 0), follow: follow === true ? 'owner' : (follow || null) };
    if (shape === 'line' && a && b) {
      f.shape = 'line'; f.a = { x: a.x, z: a.z }; f.b = { x: b.x, z: b.z }; f.width = Math.max(0.2, width);
      f.radius = Math.max(0.5, Math.hypot(b.x - a.x, b.z - a.z) / 2);
      f.pos.x = (a.x + b.x) / 2; f.pos.z = (a.z + b.z) / 2;
    }
    try { def.init?.(f, { pos, radius, dur, owner, data }); } catch (err) { console.warn(`[campo ${kind}] init`, err); }
    this.fields.push(f);
    if (movesEnemies(f)) this._recountMoveFields();
    this._renderField(f);
    return f;
  },

  // campos activos que contienen `pos`
  fieldsAt(pos) {
    return (this.fields || []).filter(f => !f.dead && inside(f, pos));
  },
  // campos vivos de un dueño (opcional: kind y habilidad; armed: solo los armados)
  fieldsOf(owner, { kind = null, skill = null, armed = false } = {}) {
    return (this.fields || []).filter(f => !f.dead && f.owner === owner && (!kind || f.kind === kind) && (!skill || f.data?.skill === skill) && (!armed || fieldArmed(f)));
  },
  // tu campo (de `kind`) más cercano a `pos`; con maxDist, acotado a esa distancia de `from`
  nearestOwnField(owner, pos, { kind = null, from = null, maxDist = Infinity } = {}) {
    let best = null, bd = Infinity;
    for (const f of this.fieldsOf(owner, { kind })) {
      if (from && Number.isFinite(maxDist) && Math.hypot(f.pos.x - from.x, f.pos.z - from.z) > maxDist + 1e-6) continue;
      const d = (f.pos.x - pos.x) ** 2 + (f.pos.z - pos.z) ** 2;
      if (d < bd) { bd = d; best = f; }
    }
    return best;
  },

  // avanza todos los campos: seguir, tick, entradas/salidas de enemigos y caducidad
  updateFields(dt) {
    const list = this.fields;
    if (!list || !list.length) return;
    for (const f of list.slice()) {
      if (f.dead) continue;
      const def = FIELD_DEFS[f.kind];
      f.t -= dt;
      f.age = (f.age || 0) + dt;
      if (f.flashT > 0) f.flashT = Math.max(0, f.flashT - dt);
      if (f.follow) this._followField(f);
      if (def.onEnter || def.onExit) {
        for (const e of this.enemies || []) {
          const was = f.inside.has(e);
          const now = e.alive && inside(f, e.pos);
          if (now && !was) { f.inside.add(e); try { def.onEnter?.(this, f, e); } catch (err) { console.warn(`[campo ${f.kind}] onEnter`, err); } }
          else if (!now && was) { f.inside.delete(e); try { def.onExit?.(this, f, e); } catch (err) { console.warn(`[campo ${f.kind}] onExit`, err); } }
        }
      }
      try { def.tick?.(this, f, dt); } catch (err) { console.warn(`[campo ${f.kind}] tick`, err); }
      this._renderField(f);
      if (f.t <= 0 || f.dead) this._expireField(f);
    }
    this.fields = list.filter(f => !f.dead);
  },
  // recentra un campo que sigue (al dueño o a la mira); una línea se traslada entera
  _followField(f) {
    const to = f.follow === 'aim' ? (this.input?.mouseWorld || f.owner?.pos) : f.owner?.pos;
    if (!to || (f.owner && f.owner.alive === false)) return;
    const dx = to.x - f.pos.x, dz = to.z - f.pos.z;
    if (Math.abs(dx) < 1e-6 && Math.abs(dz) < 1e-6) return;
    f.pos.x += dx; f.pos.z += dz;
    if (f.shape === 'line') { f.a.x += dx; f.a.z += dz; f.b.x += dx; f.b.z += dz; }
  },

  clearFields() {
    for (const f of this.fields || []) { f.dead = true; this._renderField(f); }
    this.fields = [];
    this._moveFields = 0;
  },

  _expireField(f) {
    if (!f || f._expired) return;
    f._expired = true;
    const def = FIELD_DEFS[f.kind];
    try { def?.onExpire?.(this, f); } catch (err) { console.warn(`[campo ${f.kind}] onExpire`, err); }
    const mv = movesEnemies(f);
    f.dead = true;
    if (mv) this._recountMoveFields();
    this._renderField(f);
  },

  _renderField(f) {
    const def = FIELD_DEFS[f.kind];
    if (!def?.render || !this.fxGroup) return;
    try { def.render(this, f); } catch { /* sin GL en tests */ }
  },
  // cuántos campos vivos cambian el movimiento enemigo (Enemy.update solo paga si > 0)
  _recountMoveFields() {
    this._moveFields = (this.fields || []).filter(movesEnemies).length;
    return this._moveFields;
  },

  // ---------------- detonar (§3.6) ----------------
  // DETONA un campo: su `onDetonate` (trampas de clase) o el estallido de la trampa genérica.
  // Parpadea TRAP_FLASH_T s y estalla (opts.delay = 0: al instante). opts = { coef, radius,
  // perTarget: { map, max }, skill, chain (m), done:Set }. → true si va a estallar.
  detonateField(f, opts = {}) {
    if (!f || f.dead || f._detonating) return false;
    const def = FIELD_DEFS[f.kind];
    if (!def?.onDetonate && f.kind !== 'trampa') return false;
    f._detonating = true;
    f.flashT = TRAP_FLASH_T;
    const go = () => {
      f._detonating = false;
      if (f.dead) return;
      try {
        if (def.onDetonate) def.onDetonate(this, f, opts);
        else this._trapBurst(f, opts);
      } catch (err) { console.warn(`[campo ${f.kind}] onDetonate`, err); }
      this._logTrapBurst(f.owner);
      // detonación en cadena: las trampas propias a `chain` m también estallan
      if (opts.chain > 0 && f.owner) {
        const done = opts.done || (opts.done = new Set());
        done.add(f);
        for (const o of this.fieldsOf(f.owner)) {
          if (done.has(o) || !isTrap(o) || Math.hypot(o.pos.x - f.pos.x, o.pos.z - f.pos.z) > opts.chain) continue;
          done.add(o);
          this.detonateField(o, opts);
        }
      }
    };
    const delay = opts.delay ?? TRAP_FLASH_T;
    if (delay > 0 && this.timers) this.timers.schedule(delay, go); else go();
    return true;
  },
  // DETONAR en un punto (clave `detonate: { radius, coef, chain, perTarget }` de un impacto o
  // de una llegada): estalla las trampas propias cuyo centro cae en el radio; cada enemigo
  // recibe como mucho perTarget estallidos (2 por defecto). → nº de trampas detonadas
  detonateAt(owner, pos, det = {}, { skill = null } = {}) {
    if (!owner || !pos) return 0;
    const r = det.radius || 3;
    const opts = { coef: det.coef ?? 1, chain: det.chain || 0, skill, perTarget: { map: new Map(), max: Math.max(1, det.perTarget ?? 2) }, done: new Set() };
    let n = 0;
    for (const f of this.fieldsOf(owner)) {
      if (!isTrap(f) || Math.hypot(f.pos.x - pos.x, f.pos.z - pos.z) > r + 1e-6) continue;
      opts.done.add(f);
      if (this.detonateField(f, opts)) n++;
    }
    return n;
  },
  // estallido de la trampa genérica: área en su radio de estallido con el golpe del dueño
  // (golpe real: crítico, ⑤ onHit con hit.trap) y se consume (o se rearma si consume:false)
  _trapBurst(f, opts = {}) {
    const d = f.data || {};
    const owner = f.owner;
    const at = new THREE.Vector3(f.pos.x, 0, f.pos.z);
    const rad = opts.radius ?? d.burst?.radius ?? Math.max(2, f.radius * 1.5);
    const coef = opts.coef ?? d.burst?.coef ?? d.coef ?? 1;
    if (owner && owner === this.player && coef > 0 && this.dealArea) {
      this.dealArea(at, rad, coef, { hitInfo: { skill: opts.skill || d.skill || null, tags: d.tags || new Set(['trap']), elem: d.elem || null },
        hitExtra: { trap: true }, perTarget: opts.perTarget || null, from: at });
    }
    this.spawnRing?.(at, rad, d.color ?? 0xc8a050);
    this.sfx?.('trap');
    this._spendTrap(f);
  },
  _spendTrap(f) {
    if (f.data?.consume === false) { f.sprung = false; f.armAt = (f.age || 0) + Math.max(0, f.data.armT || 0); return; }
    f.sprung = true;
    this._expireField(f);
  },
  // registro de estallidos de trampas (la Batida del Coto: 3 en 1 s)
  _logTrapBurst(owner) {
    if (!owner) return;
    const log = owner.trapBursts || (owner.trapBursts = []);
    log.push(owner.simT || 0);
    if (log.length > 12) log.splice(0, log.length - 12);
  },
  trapBurstsWithin(owner, s = 1) {
    const now = owner?.simT || 0;
    return (owner?.trapBursts || []).filter(t => now - t <= s + 1e-9).length;
  },

  // ---------------- movimiento enemigo (§3.6) ----------------
  // CEBO: si un cebo armado (trampa con lure o señuelo) atrae a `e`, lo acerca a él este
  // frame y devuelve true (el enemigo no piensa). Se reevalúa a 5 Hz, escalonado.
  lureStep(e, dt) {
    if (!e?.alive || e.stunT > 0 || e.rootT > 0 || e.frozenT > 0) return false;
    if (e._lureOff == null) e._lureOff = (lureSeq++ % 5) * 0.04;
    e._lureAcc = (e._lureAcc ?? e._lureOff) + dt;
    if (e._lure === undefined || e._lureAcc >= 0.2 - 1e-9) { e._lureAcc = 0; e._lure = this._pickLure(e); }
    const f = e._lure;
    if (!f || f.dead || (f.kind !== 'senuelo' && !fieldArmed(f))) { e._lure = null; return false; }
    const dx = f.pos.x - e.pos.x, dz = f.pos.z - e.pos.z, l = Math.hypot(dx, dz);
    if (l < 0.6) return false;
    const spd = (e.def?.spd || 2) * (f.data.lure.speedMul ?? 0.8) * dt;
    const s = Math.min(spd, l - 0.5);
    const nx = e.pos.x + dx / l * s, nz = e.pos.z + dz / l * s;
    const grid = this.world?.grid;
    if (!grid || grid.walkable(nx, e.pos.z)) e.pos.x = nx;
    if (!grid || grid.walkable(e.pos.x, nz)) e.pos.z = nz;
    if (e.group?.rotation) e.group.rotation.y = Math.atan2(dx, dz);
    return true;
  },
  _pickLure(e) {
    const p = this.player;
    if (p?.alive && e.aggroed && e.pos.distanceTo?.(p.pos) <= LURE_MELEE_R) return null;   // ya pelea contigo
    const boss = isBossE(e);
    let best = null, bd = Infinity;
    for (const f of this.fields || []) {
      const L = f.data?.lure;
      if (!L || f.dead || (f.kind !== 'senuelo' && !fieldArmed(f))) continue;
      if (boss && !L.boss) continue;
      const r = e.def?.rank ? (L.eliteRadius ?? L.radius ?? 6) : (L.radius ?? 6);
      const d = Math.hypot(f.pos.x - e.pos.x, f.pos.z - e.pos.z);
      if (d <= r && d < bd) { bd = d; best = f; }
    }
    return best;
  },
  // MUROS y ZONAS QUE ENCIERRAN: deshace el paso de `e` desde (bx, bz) si cruzó un muro
  // (no a jefes salvo blocks:'all' o contain) o salió de una zona que lo encierra
  constrainMove(e, bx, bz) {
    if (!e?.alive) return false;
    const boss = isBossE(e);
    const nx = e.pos.x, nz = e.pos.z;
    if (Math.abs(nx - bx) < 1e-9 && Math.abs(nz - bz) < 1e-9) return false;
    for (const f of this.fields || []) {
      if (f.dead) continue;
      if (f.kind === 'muro' && f.shape === 'line') {
        const all = f.data.blocks === 'all' || f.data.contain;
        if (!all && (!f.data.blocks || boss)) continue;
        const pad = 0.4 * (e.def?.scale || 1);
        const near1 = segDist2(nx, nz, f.a, f.b) <= (f.width / 2 + pad) ** 2;
        const near0 = segDist2(bx, bz, f.a, f.b) <= (f.width / 2 + pad) ** 2;
        // cruza el segmento, o se mete en el grosor del muro
        if (stepCrosses(f, bx, bz, nx, nz, pad) || (near1 && !near0)) { e.pos.x = bx; e.pos.z = bz; return true; }
      } else if (f.data?.contain && f.shape !== 'line') {
        const was = insideField(f, { x: bx, z: bz }), now = insideField(f, e.pos);
        if (was && !now) { e.pos.x = bx; e.pos.z = bz; return true; }
      }
    }
    return false;
  },
};

// enemigos vivos dentro de un campo
export function enemiesInField(g, f) {
  return (g.enemies || []).filter(e => e.alive && inside(f, e.pos));
}

// calcomanía de suelo genérica: disco (círculo) o franja (línea); la libera al morir
function groundDecal(g, f, { color, opacity = 0.2, ring = false } = {}) {
  if (f.dead) { if (f.decal) { g.fxGroup.remove(f.decal); f.decal.geometry.dispose(); f.decal.material.dispose(); f.decal = null; } return null; }
  if (!f.decal) {
    let geo;
    if (f.shape === 'line') geo = new THREE.PlaneGeometry(Math.hypot(f.b.x - f.a.x, f.b.z - f.a.z) || 0.5, f.width);
    else geo = ring ? new THREE.RingGeometry(f.radius * 0.92, f.radius, 48) : new THREE.CircleGeometry(f.radius, 36);
    const decal = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false, blending: ring ? THREE.NormalBlending : THREE.AdditiveBlending }));
    decal.rotation.x = -Math.PI / 2;
    if (f.shape === 'line') decal.rotation.z = -Math.atan2(f.b.z - f.a.z, f.b.x - f.a.x);
    g.fxGroup.add(decal);
    f.decal = decal;
  }
  f.decal.position.set(f.pos.x, 0.05, f.pos.z);    // los campos que siguen se mueven
  return f.decal;
}

// ------------------------------------------------------------
// ESTELA (rama de Transformación `zone`): daña a los enemigos dentro cada
// `interval` s. data = { dps, color, skill, slow?, slowPct? } — Paso 2c.2: si la
// habilidad ralentiza (prof.slow), su Estela también (suelo helado de Nova Perpetua)
// ------------------------------------------------------------
defineField('estela', {
  name: 'Estela',
  init(f) { f.data.interval = f.data.interval || 0.5; f.acc = 0; f.fxAcc = 0; f.data.color = f.data.color ?? 0xff7733; },
  tick(g, f, dt) {
    f.acc += dt; f.fxAcc += dt;
    if (f.acc < f.data.interval) return;
    f.acc = 0;
    const per = Math.max(1, Math.round((f.data.dps || 0) * f.data.interval));
    for (const e of enemiesInField(g, f)) {
      e.takeDamage(per, false, { dot: true, source: 'field:estela', skill: f.data.skill || null, tags: new Set(['zone']) });
      if (f.data.slow > 0 && e.alive) e.applyCC?.('slow', Math.max(f.data.interval + 0.2, 0.5), { pct: f.data.slowPct || 30, src: f.owner });
    }
    g.spawnRing?.(new THREE.Vector3(f.pos.x, 0.05, f.pos.z), f.radius * (0.7 + 0.3 * Math.random()), f.data.color);
  },
  render(g, f) {
    const col = f.data.color;
    if (f.dead) { groundDecal(g, f); return; }
    if (!f.decal) {
      groundDecal(g, f, { color: col, opacity: 0.22 });
      g.spawnRing?.(new THREE.Vector3(f.pos.x, 0.05, f.pos.z), f.radius, col);
      const hex = '#' + (((col >>> 0) & 0xffffff).toString(16).padStart(6, '0'));
      f.fx = { name: 'Estela', texture: 'glow', blending: 'additive', count: 5, burst: true, lifetime: [0.4, 1.0], shape: 'disc', shapeRadius: f.radius * 0.85,
        speed: [0.6, 2.0], gravity: -2.2, drag: 0.5, size: { start: [0.16, 0.36], end: 0 }, color: { start: '#ffe9b0', end: hex }, alpha: { start: 0.95, end: 0 } };
    }
    groundDecal(g, f);
    const life = Math.max(0, Math.min(1, f.t / (f.dur || 1)));
    f.decal.material.opacity = (0.16 + 0.12 * Math.abs(Math.sin(f.t * 6))) * (0.4 + 0.6 * life);
    if (!g.settings?.reduceMotion && f.fx && (f.fxAcc || 0) >= 0.18) {
      f.fxAcc = 0;
      const a = Math.random() * Math.PI * 2, r = Math.random() * f.radius * 0.7;
      g.emitFx?.(f.fx, { x: f.pos.x + Math.cos(a) * r, y: 0.12, z: f.pos.z + Math.sin(a) * r });
    }
  },
});

// ------------------------------------------------------------
// ZONA genérica (tipo de habilidad `zone`): daño por tic y ralentización opcional.
// data = { dps, interval, slow, slowPct, color, skill, tags, healPct (% de vida/s a los
// aliados dentro), contain (no se puede salir: g.constrainMove) }
// ------------------------------------------------------------
defineField('zona', {
  name: 'Zona',
  init(f) { f.data.interval = f.data.interval || 0.5; f.acc = 0; f.data.color = f.data.color ?? 0x88aaff; },
  tick(g, f, dt) {
    f.acc += dt;
    if (f.acc < f.data.interval) return;
    f.acc = 0;
    const per = Math.max(0, Math.round((f.data.dps || 0) * f.data.interval));
    for (const e of enemiesInField(g, f)) {
      if (per > 0) e.takeDamage(per, false, { dot: true, source: 'field:zona', skill: f.data.skill || null, tags: f.data.tags || new Set(['zone']) });
      if (f.data.slow && e.alive) e.applyCC?.('slow', f.data.slow, { pct: f.data.slowPct || 40, src: f.owner });
    }
    if (f.data.healPct > 0 && g.heal && g.allies) {
      const iv = f.data.interval;
      const inF = new Set(g.allies().filter(a => insideField(f, a.pos)));
      if (inF.size) g.heal(a => (inF.has(a) ? a.stats.maxHP * f.data.healPct / 100 * iv : 0), { target: 'all', pos: new THREE.Vector3(f.pos.x, 0, f.pos.z), radius: f.radius + (f.width || 0), src: `field:${f.data.skill || 'zona'}` });
    }
  },
  render(g, f) {
    const d = groundDecal(g, f, { color: f.data.color, opacity: 0.2 });
    if (d) d.material.opacity = 0.12 + 0.1 * Math.max(0, Math.min(1, f.t / (f.dur || 1)));
  },
});

// ------------------------------------------------------------
// AURA en el suelo (tipo `aura`: Estandarte de Guerra; base de las auras de 2c).
// Cada `interval` s (0,5) renueva el buff `buffId` a los ALIADOS dentro (g.allies)
// con una duración corta (al salir caduca solo) y da resPerSec de recurso al dueño
// si está dentro. data = { buff:{stat:valor}, buffId, meta, resPerSec, color }
// ------------------------------------------------------------
defineField('aura', {
  name: 'Aura',
  init(f) { f.data.interval = f.data.interval || 0.5; f.acc = f.data.interval; f.data.color = f.data.color ?? 0xd8a040; f.ringAcc = 0; },
  tick(g, f, dt) {
    f.acc += dt; f.ringAcc += dt;
    if (f.acc < f.data.interval - 1e-9) return;
    const step = f.acc; f.acc = 0;
    const keep = f.data.interval + 0.15;
    const allies = g.allies ? g.allies(new THREE.Vector3(f.pos.x, 0, f.pos.z), f.radius) : [];
    for (const a of allies) {
      if (f.data.buffId && f.data.buff) {
        const b = a.buffs?.find(x => x.id === f.data.buffId);
        if (b) { b.t = Math.max(b.t, keep); b.dur = Math.max(b.dur || 0, keep); }
        else a.addBuff?.(f.data.buffId, { ...f.data.buff }, keep, f.data.meta || {});
      }
      if (a === f.owner && f.data.resPerSec > 0) g.gainResource?.(a, f.data.resPerSec * step);
    }
    if (f.ringAcc >= 1) { f.ringAcc = 0; g.spawnRing?.(new THREE.Vector3(f.pos.x, 0.05, f.pos.z), f.radius, f.data.color); }
  },
  render(g, f) { groundDecal(g, f, { color: f.data.color, opacity: 0.35, ring: true }); },
});

// ------------------------------------------------------------
// TRAMPA genérica (tipo `trap`, §3.6): se ARMA en data.armT s y salta con el primer
// enemigo dentro de su radio: golpe `dmg` (del dueño), inmoviliza `root` s y, con
// `burst: { radius, coef }`, estalla en área. Se consume (consume:false: se rearma).
// `lure` (cebo) atrae a los enemigos mientras está armada (g.lureStep). La detona
// g.detonateField / g.detonateAt (estallido, con parpadeo previo).
// data = { dmg, coef, root, color, skill, tags, elem, armT, burst, consume, lure }
// ------------------------------------------------------------
defineField('trampa', {
  name: 'Trampa',
  init(f) { f.data.color = f.data.color ?? 0xc8a050; },
  tick(g, f) {
    if (f.dead || f._detonating || !fieldArmed(f)) return;
    let hit = null;
    for (const e of g.enemies || []) if (e.alive && inside(f, e.pos)) { hit = e; break; }
    if (!hit) return;
    const d = f.data;
    if (d.dmg > 0) hit.takeDamage(Math.max(1, Math.round(d.dmg)), false, { source: 'field:trampa', skill: d.skill || null, tags: d.tags || new Set(['trap']), trap: true });
    if (d.root && hit.alive) hit.applyCC?.('root', d.root, { src: f.owner });
    g.spawnRing?.(new THREE.Vector3(f.pos.x, 0.05, f.pos.z), f.radius, d.color);
    g._logTrapBurst(f.owner);
    if (d.burst) g._trapBurst(f, { coef: d.burst.coef, radius: d.burst.radius, skill: d.skill });
    else { g.sfx?.('hit'); g._spendTrap(f); }
  },
  render(g, f) {
    const d = groundDecal(g, f, { color: f.data.color, opacity: 0.5, ring: true });
    if (!d) return;
    d.material.color.setHex(f.flashT > 0 ? 0xff3030 : f.data.color);
    d.material.opacity = fieldArmed(f) ? 0.55 : 0.22;
  },
});

// ------------------------------------------------------------
// MURO (tipo `wall`, §3.6): campo en LÍNEA (a, b, width). blocks: true (no a jefes) |
// 'all'; contain: encierra (bloquea a todos). Puede dañar/ralentizar a quien lo toca.
// data = { blocks, contain, dps, slow, slowPct, color, skill, tags }
// ------------------------------------------------------------
defineField('muro', {
  name: 'Muro',
  init(f) { f.data.interval = f.data.interval || 0.5; f.acc = 0; f.data.color = f.data.color ?? 0xaad8ff; },
  tick(g, f, dt) {
    if (!(f.data.dps > 0) && !f.data.slow) return;
    f.acc += dt;
    if (f.acc < f.data.interval) return;
    f.acc = 0;
    const per = Math.max(0, Math.round((f.data.dps || 0) * f.data.interval));
    for (const e of g.enemies || []) {
      if (!e.alive || !insideField(f, e.pos, 0.5 * (e.def?.scale || 1))) continue;
      if (per > 0) e.takeDamage(per, false, { dot: true, source: 'field:muro', skill: f.data.skill || null, tags: f.data.tags || new Set(['wall']) });
      if (f.data.slow && e.alive) e.applyCC?.('slow', f.data.slow, { pct: f.data.slowPct || 40, src: f.owner });
    }
  },
  render(g, f) { groundDecal(g, f, { color: f.data.color, opacity: 0.55 }); },
});

// ------------------------------------------------------------
// SEÑUELO (clave `lure` de una habilidad): atrae a los enemigos del radio mientras dura
// (g.lureStep). data = { lure: { radius, eliteRadius, boss, speedMul }, skill }
// ------------------------------------------------------------
defineField('senuelo', {
  name: 'Señuelo',
  init(f) { f.data.color = f.data.color ?? 0x86d47a; f.data.lure = { radius: f.radius, ...(f.data.lure || {}) }; },
  render(g, f) { groundDecal(g, f, { color: f.data.color, opacity: 0.3, ring: true }); },
});

// ------------------------------------------------------------
// EMISOR (Familiar, Halcón, Pendón): dispara desde SU posición cada `every` s al enemigo
// más cercano (o al de más vida) a `range` m con el perfil del lanzamiento que lo creó
// (data.ctx; g.fireProjectile con from). data = { every, coef, range, target, speed, ctx, skill, color }
// ------------------------------------------------------------
defineField('emisor', {
  name: 'Emisor',
  init(f) { f.data.every = Math.max(0.1, f.data.every || 1); f.acc = 0; f.data.color = f.data.color ?? 0xffe680; },
  tick(g, f, dt) {
    const d = f.data;
    if (!d.ctx || !g.fireProjectile) return;
    f.acc += dt;
    while (f.acc >= d.every - 1e-9) {
      f.acc -= d.every;
      const range = d.range || 10;
      let best = null;
      for (const e of g.enemies || []) {
        const dist = Math.hypot(e.pos.x - f.pos.x, e.pos.z - f.pos.z);
        if (!e.alive || dist > range) continue;
        if (!best || (d.target === 'maxHp' ? e.hp > best.hp : dist < Math.hypot(best.pos.x - f.pos.x, best.pos.z - f.pos.z))) best = e;
      }
      if (!best) continue;
      g.fireProjectile(d.ctx, { from: f.pos, to: best.pos.clone(), coef: d.coef ?? 0.4, speed: d.speed || 20, range: range + 2, color: d.color });
      f.shots = (f.shots || 0) + 1;
    }
  },
  render(g, f) { groundDecal(g, f, { color: f.data.color, opacity: 0.3, ring: true }); },
});
