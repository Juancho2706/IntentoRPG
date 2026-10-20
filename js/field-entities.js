// ============================================================
// Entidades de SUELO (campos, trampas, zonas) — registro + mixin de Game
// ============================================================
// Paso 2b.0 — docs/paso2-diseno.md §9.1.3. Sustituye al genérico `groundZones`
// (la Estela de las ramas de Transformación se migró aquí como kind 'estela').
//   defineField(kind, { init(f, opts), tick(g, f, dt), onEnter?(g, f, e),
//                       onExit?(g, f, e), onExpire?(g, f), render?(g, f) })
//   g.spawnField(kind, { pos, radius, dur, owner, data }) → f | null
//       (tope de FIELD_CAP_PER_OWNER por dueño: al pasarlo cae el más viejo, FIFO)
//   g.fieldsAt(pos) → campos que contienen la posición
//   g.updateFields(dt) (lo llama Game.tick) · g.clearFields() (Game.loadWorld)
// `render` es opcional y va en try/catch: en headless (sin fxGroup) no se dibuja
// nada. Se llama al crear el campo, en cada tick y una última vez con f.dead=true
// para que libere lo que haya creado.
// El daño de los campos se marca `dot:true` (como un DoT: no dispara onHit salvo
// los poderes con `procs:true`) y NO es proc (recibe Debilidad y Π[×] como antes).
import * as THREE from 'three';

export const FIELD_DEFS = {};
export const FIELD_CAP_PER_OWNER = 12;
const FIELD_KEYS = new Set(['init', 'tick', 'onEnter', 'onExit', 'onExpire', 'render', 'name']);

export function defineField(kind, def) {
  if (!kind || FIELD_DEFS[kind]) throw new Error(`defineField: kind inválido o repetido "${kind}"`);
  for (const k of Object.keys(def || {})) if (!FIELD_KEYS.has(k)) throw new Error(`defineField("${kind}"): clave desconocida "${k}"`);
  FIELD_DEFS[kind] = Object.freeze({ kind, ...def });
  return FIELD_DEFS[kind];
}

let fieldUid = 1;
const inside = (f, pos) => {
  const dx = pos.x - f.pos.x, dz = pos.z - f.pos.z;
  return dx * dx + dz * dz <= f.radius * f.radius;
};

export const fieldMethods = {
  // crea un campo de suelo; devuelve el campo o null si el kind no existe
  spawnField(kind, { pos, radius = 2, dur = 4, owner = null, data = {} } = {}) {
    const def = FIELD_DEFS[kind];
    if (!def || !pos) return null;
    if (!this.fields) this.fields = [];
    // tope por dueño (FIFO): el más viejo caduca ya
    const mine = this.fields.filter(f => f.owner === owner && !f.dead);
    while (mine.length >= FIELD_CAP_PER_OWNER) this._expireField(mine.shift());
    const f = { uid: fieldUid++, kind, pos: { x: pos.x, y: 0.05, z: pos.z }, radius, dur, t: dur, owner, data: { ...data }, inside: new Set(), dead: false };
    try { def.init?.(f, { pos, radius, dur, owner, data }); } catch (err) { console.warn(`[campo ${kind}] init`, err); }
    this.fields.push(f);
    this._renderField(f);
    return f;
  },

  // campos activos que contienen `pos`
  fieldsAt(pos) {
    return (this.fields || []).filter(f => !f.dead && inside(f, pos));
  },

  // avanza todos los campos: tick, entradas/salidas de enemigos y caducidad
  updateFields(dt) {
    const list = this.fields;
    if (!list || !list.length) return;
    for (const f of list.slice()) {
      if (f.dead) continue;
      const def = FIELD_DEFS[f.kind];
      f.t -= dt;
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

  clearFields() {
    for (const f of this.fields || []) { f.dead = true; this._renderField(f); }
    this.fields = [];
  },

  _expireField(f) {
    if (!f || f._expired) return;
    f._expired = true;
    const def = FIELD_DEFS[f.kind];
    try { def?.onExpire?.(this, f); } catch (err) { console.warn(`[campo ${f.kind}] onExpire`, err); }
    f.dead = true;
    this._renderField(f);
  },

  _renderField(f) {
    const def = FIELD_DEFS[f.kind];
    if (!def?.render || !this.fxGroup) return;
    try { def.render(this, f); } catch { /* sin GL en tests */ }
  },
};

// enemigos vivos dentro de un campo
export function enemiesInField(g, f) {
  return (g.enemies || []).filter(e => e.alive && inside(f, e.pos));
}

// ------------------------------------------------------------
// ESTELA (rama de Transformación `zone`): daña a los enemigos dentro cada
// `interval` s. data = { dps, color, skill }
// ------------------------------------------------------------
defineField('estela', {
  name: 'Estela',
  init(f) { f.data.interval = f.data.interval || 0.5; f.acc = 0; f.fxAcc = 0; f.data.color = f.data.color ?? 0xff7733; },
  tick(g, f, dt) {
    f.acc += dt; f.fxAcc += dt;
    if (f.acc < f.data.interval) return;
    f.acc = 0;
    const per = Math.max(1, Math.round((f.data.dps || 0) * f.data.interval));
    for (const e of enemiesInField(g, f))
      e.takeDamage(per, false, { dot: true, source: 'field:estela', skill: f.data.skill || null, tags: new Set(['zone']) });
    g.spawnRing?.(new THREE.Vector3(f.pos.x, 0.05, f.pos.z), f.radius * (0.7 + 0.3 * Math.random()), f.data.color);
  },
  render(g, f) {
    const col = f.data.color;
    if (f.dead) {
      if (f.decal) { g.fxGroup.remove(f.decal); f.decal.geometry.dispose(); f.decal.material.dispose(); f.decal = null; }
      return;
    }
    if (!f.decal) {
      const decal = new THREE.Mesh(new THREE.CircleGeometry(f.radius, 36),
        new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
      decal.rotation.x = -Math.PI / 2;
      decal.position.set(f.pos.x, 0.05, f.pos.z);
      g.fxGroup.add(decal);
      f.decal = decal;
      g.spawnRing?.(new THREE.Vector3(f.pos.x, 0.05, f.pos.z), f.radius, col);
      const hex = '#' + (((col >>> 0) & 0xffffff).toString(16).padStart(6, '0'));
      f.fx = { name: 'Estela', texture: 'glow', blending: 'additive', count: 5, burst: true, lifetime: [0.4, 1.0], shape: 'disc', shapeRadius: f.radius * 0.85,
        speed: [0.6, 2.0], gravity: -2.2, drag: 0.5, size: { start: [0.16, 0.36], end: 0 }, color: { start: '#ffe9b0', end: hex }, alpha: { start: 0.95, end: 0 } };
    }
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
// data = { dps, interval, slow, slowPct, color, skill, tags }
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
  },
  render(g, f) {
    if (f.dead) { if (f.decal) { g.fxGroup.remove(f.decal); f.decal.geometry.dispose(); f.decal.material.dispose(); f.decal = null; } return; }
    if (!f.decal) {
      const decal = new THREE.Mesh(new THREE.CircleGeometry(f.radius, 36),
        new THREE.MeshBasicMaterial({ color: f.data.color, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
      decal.rotation.x = -Math.PI / 2;
      decal.position.set(f.pos.x, 0.05, f.pos.z);
      g.fxGroup.add(decal);
      f.decal = decal;
    }
    f.decal.material.opacity = 0.12 + 0.1 * Math.max(0, Math.min(1, f.t / (f.dur || 1)));
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
  render(g, f) {
    if (f.dead) { if (f.decal) { g.fxGroup.remove(f.decal); f.decal.geometry.dispose(); f.decal.material.dispose(); f.decal = null; } return; }
    if (!f.decal) {
      const decal = new THREE.Mesh(new THREE.RingGeometry(f.radius * 0.92, f.radius, 48),
        new THREE.MeshBasicMaterial({ color: f.data.color, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
      decal.rotation.x = -Math.PI / 2;
      decal.position.set(f.pos.x, 0.06, f.pos.z);
      g.fxGroup.add(decal);
      f.decal = decal;
    }
  },
});

// ------------------------------------------------------------
// TRAMPA genérica (tipo `trap`): se arma en el suelo y salta con el primer
// enemigo que entra: daño (proc del dueño) + inmovilizar. data = { dmg, root, color, skill }
// ------------------------------------------------------------
defineField('trampa', {
  name: 'Trampa',
  init(f) { f.data.color = f.data.color ?? 0xc8a050; },
  onEnter(g, f, e) {
    if (f.dead || f.sprung) return;
    f.sprung = true;
    if (f.data.dmg > 0) e.takeDamage(Math.max(1, Math.round(f.data.dmg)), false, { source: 'field:trampa', skill: f.data.skill || null, tags: new Set(['trap']) });
    if (f.data.root && e.alive) e.applyCC?.('root', f.data.root, { src: f.owner });
    g.spawnRing?.(new THREE.Vector3(f.pos.x, 0.05, f.pos.z), f.radius, f.data.color);
    g.sfx?.('hit');
    f.t = 0;
  },
  render(g, f) {
    if (f.dead) { if (f.decal) { g.fxGroup.remove(f.decal); f.decal.geometry.dispose(); f.decal.material.dispose(); f.decal = null; } return; }
    if (!f.decal) {
      const decal = new THREE.Mesh(new THREE.RingGeometry(f.radius * 0.6, f.radius, 24),
        new THREE.MeshBasicMaterial({ color: f.data.color, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false }));
      decal.rotation.x = -Math.PI / 2;
      decal.position.set(f.pos.x, 0.06, f.pos.z);
      g.fxGroup.add(decal);
      f.decal = decal;
    }
  },
});
