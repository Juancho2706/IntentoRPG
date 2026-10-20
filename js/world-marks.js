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
import * as THREE from 'three';
import { activeMechanic } from './spec-mechanics.js';
import { gaugeViewFor } from './ui-gauges.js';

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
// el pintor (pool de Three.js)
// ------------------------------------------------------------
const COL = { off: 0x21485a, lit: 0x74cdf2, frozen: 0xeefcff, numb: 0xbfe9ff, rim: 0x0b1a22 };

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
    // libera las tiras cuyo enemigo ya no toca
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
  }

  clear() {
    for (const s of this.strips) { s.e = null; s.sig = ''; s.g.visible = false; }
    this.ground = null;
    this.groundMesh.visible = false;
  }

  // ¿lleva marca encima? (main.js sube la etiqueta de rango para no taparla)
  hasMark(e) { return this.strips.some(s => s.e === e && s.g.visible); }

  // nº de objetos de la escena (tests: constante tras crear el pool)
  objectCount() { let n = 0; this.group.traverse(() => { n++; }); return n; }
}
