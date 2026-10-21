// ============================================================
// MARCAS DE MUNDO DE LAS BARRAS DE MECÁNICA (Paso 2d.2 · E2) — docs/paso2d2-hud-pc.md §3.5 y §3.8
// ============================================================
// Pinta en el mundo lo que el renderizador de la mecánica activa declara en `world`
// (js/ui-gauges-<clase>.js, datos PUROS):
//   overhead(e, p) → { n, max, numb, frozen } | null   Escarcha (Crionte): una tira de 5 rombos
//       pequeños JUSTO ENCIMA de la barra de vida, solo en élites, jefes, la Presa y el enemigo
//       bajo el cursor (lo decide el renderizador; R1: 60 enemigos no llevan 60 tiras).
//       Congelado → los 5 en blanco hielo; jefe Aterido → cristales pálidos + aro.
//   ground(e, p) → { asset, blend, color, radius, t, tMax, k, expiring, trapped, spin, opacity } | null
//       Coto de Caza (Montaraz): el anillo de zarzas (assets/gauges/gz_coto_marca_suelo.webp, fondo
//       negro → mezcla ADITIVA) bajo la Presa, girando; parpadea al caducar y late si está atrapada.
//
// Coste: un POOL fijo de objetos Three.js creado una vez (OVERHEAD_MAX tiras de 5 rombos + 1
// anillo de suelo) con geometrías y materiales COMPARTIDOS; nada se crea por frame. Los DATOS
// (qué enemigos, cuántas capas) se recalculan a 10 Hz; por frame solo se copian posiciones
// (sin matrixWorld: la del grupo del enemigo) y el giro/parpadeo del anillo.
// Las marcas viven en su propio grupo de la escena (no en fxGroup, que loadWorld limpia, ni dentro
// del grupo del enemigo, cuyo dispose() liberaría los recursos compartidos).
// Headless: el módulo se importa sin DOM (tests/test76); la textura solo se carga si hay `document`.
//
// Paso 2 (U2; docs/paso2-implementacion.md §3.12 «Feedback de los verbos», columna Mundo): con el
// mismo pool fijo, las marcas de los VERBOS del héroe (verbMarksPlan, PURO, a 10 Hz):
//   plantado → anillo bajo los pies · postura → aro a los pies del color del modo (doble y dorado
//   con las dos a la vez) · cebo → un hilo en el suelo de cada enemigo atraído a su cebo ·
//   Batida (3 trampas en 1 s) → anillo que se abre · carga → destello al entrar en la ventana
//   (borde leído CADA frame de g._charging.inWindow, el mismo frame que la barra: G17).
import * as THREE from 'three';
import { activeMechanic } from './spec-mechanics.js';
import { gaugeViewFor } from './ui-gauges.js';
import { verbView } from './hud-model.js';

export const OVERHEAD_MAX = 8;        // tiras simultáneas como mucho (las más cercanas)
export const MARK_HZ = 10;            // datos a 10 Hz (§3.0)
export const MARK_RANGE = 26;         // m: más lejos no se marca (fuera de pantalla)
const STRIP_N = 5;                    // rombos por tira (Escarcha: 5 capas)
// tamaño FIJO en metros (no escala con el enemigo: legible en una rata y discreta en un jefe):
// a la cámara por defecto (≈ 63 px/m) cada rombo mide ≈ 8 px y la tira ≈ 50 px
const DIAMOND = 0.13, GAP = 0.19;
const STRIP_Y = 0.17;                 // m por encima del borde superior de la barra de vida

// ------------------------------------------------------------
// plan (PURO): qué marcas tocan ahora
// ------------------------------------------------------------
// → { id, overhead: [{ e, n, max, numb, frozen }], ground: { e, …ground } | null }
export function worldMarksPlan(game, max = OVERHEAD_MAX) {
  const p = game?.player;
  const id = p ? activeMechanic(p) : null;
  const out = { id, overhead: [], ground: null };
  if (!id) return out;
  const def = gaugeViewFor(id);
  const W = def?.world;
  if (!W) return out;
  const enemies = game.enemies || [];
  const r2 = MARK_RANGE * MARK_RANGE;
  const near = e => !p.pos || !e.pos || (e.pos.x - p.pos.x) ** 2 + (e.pos.z - p.pos.z) ** 2 <= r2;
  if (W.overhead) {
    const list = [];
    for (const e of enemies) {
      if (!e || e.alive === false || !near(e)) continue;
      let m = null;
      try { m = W.overhead(e, p); } catch { m = null; }
      if (m) list.push({ e, n: m.n | 0, max: m.max || STRIP_N, numb: !!m.numb, frozen: !!m.frozen });
    }
    if (list.length > max && p.pos) {
      const hover = game.ui?.hoverEnemy;
      const d2 = e => (e === hover ? -1 : (e.pos.x - p.pos.x) ** 2 + (e.pos.z - p.pos.z) ** 2);
      list.sort((a, b) => d2(a.e) - d2(b.e));
    }
    out.overhead = list.slice(0, max);
  }
  if (W.ground) {
    for (const e of enemies) {
      if (!e || e.alive === false) continue;
      let g = null;
      try { g = W.ground(e, p); } catch { g = null; }
      if (g) { out.ground = { e, ...g }; break; }
    }
  }
  return out;
}

// ------------------------------------------------------------
// plan de los VERBOS (PURO): plantado, postura, hilos del cebo, Batida
// ------------------------------------------------------------
export const THREAD_MAX = 8;          // hilos de cebo simultáneos (los enemigos más cercanos)
export const HUNT_N = 3;              // Batida: trampas que estallan…
export const HUNT_S = 1;              // …en este tiempo (s)
const num = v => (Number.isFinite(+v) ? +v : 0);
// los estallidos registrados por el motor (owner.trapBursts): instantes o { t, x, z }
const burstT = b => (typeof b === 'number' ? b : num(b?.t));
// → { planted: { x, z } | null, stance: { x, z, color, both } | null,
//     threads: [{ e, x1, z1, x2, z2 }], hunt: { n, t, x, z } | null }
export function verbMarksPlan(game, max = THREAD_MAX) {
  const p = game?.player;
  const out = { planted: null, stance: null, threads: [], hunt: null };
  if (!p || p.alive === false || !p.pos) return out;
  const at = { x: num(p.pos.x), z: num(p.pos.z) };
  const vv = verbView(game);
  const slots = Object.values(vv.slots).filter(Boolean);
  // plantado: solo si alguna habilidad de la barra lo usa
  if (p.planted && slots.some(v => v.planted != null)) out.planted = { ...at };
  // postura: la primera ranura con una postura activa
  const st = slots.find(v => v.stance)?.stance;
  if (st) out.stance = { ...at, color: st.color, both: !!st.both };
  // hilos: cada enemigo vivo y cercano que su cebo atrae (e._lure, lo pone field-entities a 5 Hz)
  const r2 = MARK_RANGE * MARK_RANGE;
  for (const e of game.enemies || []) {
    const f = e?._lure;
    if (!f || f.dead || e.alive === false || !e.pos || !f.pos) continue;
    const d2 = (e.pos.x - at.x) ** 2 + (e.pos.z - at.z) ** 2;
    if (d2 > r2) continue;
    out.threads.push({ e, d2, x1: num(e.pos.x), z1: num(e.pos.z), x2: num(f.pos.x), z2: num(f.pos.z) });
  }
  if (out.threads.length > max) out.threads.sort((a, b) => a.d2 - b.d2);
  out.threads = out.threads.slice(0, max).map(({ d2, ...t }) => t);
  // Batida: HUNT_N estallidos en HUNT_S s; en el centro de esos estallidos si el motor guarda
  // dónde fueron, si no a los pies de la cazadora
  const now = num(p.simT);
  const recent = (p.trapBursts || []).filter(b => now - burstT(b) <= HUNT_S + 1e-9);
  if (recent.length >= HUNT_N) {
    const pts = recent.filter(b => b && typeof b === 'object' && Number.isFinite(b.x) && Number.isFinite(b.z));
    const c = pts.length ? { x: pts.reduce((s, b) => s + b.x, 0) / pts.length, z: pts.reduce((s, b) => s + b.z, 0) / pts.length } : at;
    out.hunt = { n: recent.length, t: Math.max(...recent.map(burstT)), x: c.x, z: c.z };
  }
  return out;
}

// ------------------------------------------------------------
// el pintor (pool de Three.js)
// ------------------------------------------------------------
const COL = { off: 0x21485a, lit: 0x74cdf2, frozen: 0xeefcff, numb: 0xbfe9ff, rim: 0x0b1a22 };
const VCOL = { planted: 0xd8b46a, thread: 0xe9c46a, hunt: 0xffd27a, flash: 0xffe7a8 };
const HUNT_DUR = 0.6, FLASH_DUR = 0.25;

export class WorldMarks {
  constructor(scene, opts = {}) {
    this.group = new THREE.Group();
    this.group.name = 'world-marks';
    scene?.add(this.group);
    this.max = opts.max || OVERHEAD_MAX;
    this.acc = 1 / MARK_HZ;               // el primer update ya calcula
    this.time = 0;
    this.updates = 0;                     // pasadas de datos (tests: cadencia ≤ 10 Hz)
    this.plan = { id: null, overhead: [], ground: null };
    // recursos compartidos (una vez)
    const quad = new THREE.PlaneGeometry(1, 1);
    const mat = (color, extra = {}) => new THREE.MeshBasicMaterial({ color, transparent: true, depthTest: false, depthWrite: false, ...extra });
    this.res = {
      quad,
      ring: new THREE.RingGeometry(0.42, 0.5, 24),
      m: { off: mat(COL.off, { opacity: 0.85 }), lit: mat(COL.lit), frozen: mat(COL.frozen), numb: mat(COL.numb),
        rim: mat(COL.rim, { opacity: 0.9 }), halo: mat(COL.numb, { opacity: 0.85, blending: THREE.AdditiveBlending }) },
    };
    // tiras de Escarcha: 5 rombos (con su ribete) + aro de Aterido
    this.strips = [];
    for (let i = 0; i < this.max; i++) {
      const g = new THREE.Group();
      g.visible = false;
      const gems = [];
      for (let k = 0; k < STRIP_N; k++) {
        const x = (k - (STRIP_N - 1) / 2) * GAP;
        const rim = new THREE.Mesh(quad, this.res.m.rim);
        rim.position.set(x, 0, 0); rim.rotation.z = Math.PI / 4; rim.scale.setScalar(DIAMOND * 1.35);
        const gem = new THREE.Mesh(quad, this.res.m.off);
        gem.position.set(x, 0, 0.001); gem.rotation.z = Math.PI / 4; gem.scale.setScalar(DIAMOND);
        rim.renderOrder = 1000; gem.renderOrder = 1001;
        g.add(rim, gem);
        gems.push(gem);
      }
      const halo = new THREE.Mesh(this.res.ring, this.res.m.halo);
      halo.position.set(-((STRIP_N - 1) / 2) * GAP - 0.24, 0, 0.002);
      halo.scale.setScalar(0.26); halo.renderOrder = 1001; halo.visible = false;
      g.add(halo);
      this.group.add(g);
      this.strips.push({ g, gems, halo, e: null, sig: '' });
    }
    // anillo de zarzas bajo la Presa
    this.groundMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    this.groundMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.groundMat);
    this.groundMesh.rotation.x = -Math.PI / 2;
    this.groundMesh.renderOrder = 2;
    this.groundMesh.visible = false;
    this.group.add(this.groundMesh);
    this.groundTex = null;
    this.groundReady = false;
    this.ground = null;
    // marcas de los verbos (Paso 2): todo en el suelo salvo el destello de la carga
    const flat = (geo, color, opacity, order = 3) => {
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false,
        blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
      m.rotation.x = -Math.PI / 2; m.renderOrder = order; m.visible = false;
      this.group.add(m);
      return m;
    };
    const ringGeo = new THREE.RingGeometry(0.9, 1, 48);
    this.vplan = { planted: null, stance: null, threads: [], hunt: null };
    this.verb = {
      planted: flat(ringGeo, VCOL.planted, 0.55),
      stance: flat(ringGeo, 0xffffff, 0.7),
      stance2: flat(ringGeo, VCOL.hunt, 0.6),
      hunt: flat(ringGeo, VCOL.hunt, 0.9, 4),
      threads: Array.from({ length: THREAD_MAX }, () => flat(quad, VCOL.thread, 0.5)),
      flash: (() => {
        const m = new THREE.Mesh(new THREE.CircleGeometry(0.5, 24), new THREE.MeshBasicMaterial({ color: VCOL.flash, transparent: true, opacity: 0,
          depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending }));
        m.renderOrder = 1002; m.visible = false;
        this.group.add(m);
        return m;
      })(),
    };
    this.huntAt = null;      // instante del estallido que lanzó la última Batida (una por Batida)
    this.huntT = -1;         // tiempo de la animación del anillo (−1 = parado)
    this.flashT = -1;
    this.lastInWindow = false;
  }

  _loadGroundTex(asset) {
    if (this.groundTex || typeof document === 'undefined') return;
    try {
      const url = new URL(`../assets/gauges/${asset}.webp`, import.meta.url).href;
      // sin textura el plano aditivo sería un cuadrado blanco: solo se muestra al cargar
      this.groundTex = new THREE.TextureLoader().load(url, () => { this.groundReady = true; });
      this.groundTex.colorSpace = THREE.SRGBColorSpace;
      this.groundMat.map = this.groundTex;
      this.groundMat.needsUpdate = true;
    } catch { this.groundTex = null; }
  }

  // datos (10 Hz): asigna tiras del pool y decide colores; sin crear objetos
  _refresh(game) {
    this.updates++;
    const plan = worldMarksPlan(game, this.max);
    this.plan = plan;
    const want = new Map(plan.overhead.map(o => [o.e, o]));
    // libera las tiras cuyo enemigo ya no está en el plan
    for (const s of this.strips) if (s.e && !want.has(s.e)) { s.e = null; s.sig = ''; s.g.visible = false; }
    // asigna las que faltan (mismo enemigo → misma tira)
    for (const o of plan.overhead) {
      let s = this.strips.find(x => x.e === o.e);
      if (!s) { s = this.strips.find(x => !x.e); if (!s) continue; s.e = o.e; }
      const sig = `${o.n}|${o.numb ? 1 : 0}|${o.frozen ? 1 : 0}`;
      if (s.sig === sig) continue;
      s.sig = sig;
      const M = this.res.m;
      for (let k = 0; k < s.gems.length; k++) {
        const lit = o.frozen || k < o.n;
        const m = !lit ? M.off : o.frozen ? M.frozen : o.numb ? M.numb : M.lit;
        if (s.gems[k].material !== m) s.gems[k].material = m;
      }
      s.halo.visible = o.numb;
    }
    // suelo
    const gr = plan.ground;
    this.ground = gr;
    if (gr) this._loadGroundTex(gr.asset || 'gz_coto_marca_suelo');
    this.groundMesh.visible = !!gr && this.groundReady;
    this._refreshVerbs(game);
  }

  // verbos (10 Hz): qué marcas se ven y de qué color; las posiciones se copian por frame
  _refreshVerbs(game) {
    let vp;
    try { vp = verbMarksPlan(game); } catch { vp = { planted: null, stance: null, threads: [], hunt: null }; }
    this.vplan = vp;
    const V = this.verb;
    V.planted.visible = !!vp.planted;
    V.stance.visible = !!vp.stance;
    V.stance2.visible = !!vp.stance?.both;
    if (vp.stance) V.stance.material.color.set(vp.stance.color || '#7fb0e8');
    V.threads.forEach((m, i) => { m.visible = i < vp.threads.length; });
    // Batida nueva → el anillo se abre una vez desde su centro
    if (vp.hunt && (this.huntAt == null || vp.hunt.t - this.huntAt > HUNT_S)) { this.huntAt = vp.hunt.t; this.huntT = 0; this.huntPos = { x: vp.hunt.x, z: vp.hunt.z }; }
  }

  // por frame: posiciones de las marcas de verbo, el anillo de la Batida y el destello de la carga
  _updateVerbs(game, dt) {
    const V = this.verb, vp = this.vplan, p = game?.player;
    const px = p?.pos?.x ?? 0, pz = p?.pos?.z ?? 0, py = (p?.pos?.y || 0) + 0.05;
    const still = !!game?.settings?.reduceMotion;
    if (V.planted.visible) {
      V.planted.position.set(px, py, pz);
      V.planted.scale.setScalar(0.62 * (still ? 1 : 1 + 0.03 * Math.sin(this.time * 4)));
    }
    if (V.stance.visible) {
      V.stance.position.set(px, py + 0.01, pz);
      V.stance.scale.setScalar(0.85);
      V.stance.rotation.z = still ? 0 : this.time * 0.8;
      if (V.stance2.visible) { V.stance2.position.set(px, py + 0.012, pz); V.stance2.scale.setScalar(1.02); }
    }
    for (let i = 0; i < vp.threads.length && i < V.threads.length; i++) {
      const t = vp.threads[i], m = V.threads[i];
      // el enemigo se mueve entre pasadas de datos: el extremo del enemigo sigue su posición actual
      const x1 = t.e?.pos?.x ?? t.x1, z1 = t.e?.pos?.z ?? t.z1;
      const dx = t.x2 - x1, dz = t.z2 - z1, len = Math.hypot(dx, dz);
      m.visible = len > 0.3;
      if (!m.visible) continue;
      m.position.set((x1 + t.x2) / 2, 0.04, (z1 + t.z2) / 2);
      m.rotation.set(-Math.PI / 2, 0, -Math.atan2(dz, dx));
      m.scale.set(len, 0.06, 1);
      m.material.opacity = still ? 0.5 : 0.35 + 0.2 * Math.abs(Math.sin(this.time * 3 + i));
    }
    if (this.huntT >= 0) {
      this.huntT += dt;
      const k = Math.min(1, this.huntT / HUNT_DUR);
      const m = V.hunt;
      m.visible = k < 1;
      m.position.set(this.huntPos.x, py + 0.02, this.huntPos.z);
      m.scale.setScalar(still ? 5 : 1 + 5 * (1 - (1 - k) ** 2));
      m.material.opacity = 0.9 * (1 - k);
      if (k >= 1) this.huntT = -1;
    }
    // carga: destello en el arma (a la altura de la mano) el MISMO frame en que entra en la ventana
    const inW = !!game?._charging?.inWindow;
    if (inW && !this.lastInWindow) this.flashT = 0;
    this.lastInWindow = inW;
    const f = V.flash;
    if (this.flashT >= 0 && p?.pos) {
      this.flashT += dt;
      const k = Math.min(1, this.flashT / FLASH_DUR);
      f.visible = k < 1;
      f.position.set(px, (p.pos.y || 0) + 1.1, pz);
      if (game?.camera) f.quaternion.copy(game.camera.quaternion);
      f.scale.setScalar(still ? 0.9 : 0.6 + 0.6 * k);
      f.material.opacity = 0.85 * (1 - k);
      if (k >= 1) this.flashT = -1;
    }
  }

  // cada frame: posiciones (barato) y, a 10 Hz, los datos
  update(game, dt = 0) {
    this.time += dt;
    this.acc += dt;
    const step = 1 / MARK_HZ;
    if (this.acc >= step - 1e-6) { this.acc = this.acc - step > step ? 0 : Math.max(0, this.acc - step); this._refresh(game); }
    const cam = game?.camera;
    for (const s of this.strips) {
      const e = s.e;
      if (!e) continue;
      const bar = e.group?.userData?.bar;
      const show = !!(e.alive !== false && bar && bar.visible !== false && e.group);
      s.g.visible = show;
      if (!show) continue;
      // borde superior de la barra (su alto es 0,1 en el grupo del enemigo, escalado por él)
      const G = e.group, sy = G.scale?.y || 1;
      s.g.position.set(G.position.x, G.position.y + (bar.position.y + 0.05) * sy + STRIP_Y, G.position.z);
      if (cam) s.g.quaternion.copy(cam.quaternion);
      if (s.halo.visible) s.halo.rotation.z = this.time * 1.5;
    }
    const gr = this.ground;
    if (gr && gr.e?.pos) {
      const m = this.groundMesh;
      m.position.set(gr.e.pos.x, (gr.e.pos.y || 0) + 0.06, gr.e.pos.z);
      const pulse = gr.trapped ? 1 + 0.06 * Math.sin(this.time * 9) : 1;
      m.scale.setScalar((gr.radius || 1) * 1.25 * pulse);
      m.rotation.z = -this.time * (gr.spin || 0) * Math.PI * 2;
      const base = gr.opacity ?? 0.9;
      this.groundMat.opacity = gr.expiring ? base * (0.45 + 0.55 * Math.abs(Math.sin(this.time * 7))) : gr.trapped ? 1 : base;
    }
    this._updateVerbs(game, dt);
  }

  clear() {
    for (const s of this.strips) { s.e = null; s.sig = ''; s.g.visible = false; }
    this.ground = null;
    this.groundMesh.visible = false;
    const V = this.verb;
    for (const m of [V.planted, V.stance, V.stance2, V.hunt, V.flash, ...V.threads]) m.visible = false;
    this.vplan = { planted: null, stance: null, threads: [], hunt: null };
    this.huntT = -1; this.flashT = -1; this.lastInWindow = false;
  }

  // ¿lleva marca encima? (main.js sube la etiqueta de rango para no taparla)
  hasMark(e) { return this.strips.some(s => s.e === e && s.g.visible); }

  // nº de objetos de la escena (tests: constante tras crear el pool)
  objectCount() { let n = 0; this.group.traverse(() => { n++; }); return n; }
}
