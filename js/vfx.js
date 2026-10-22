// vfx.js — helpers de game-feel (hit-stop, trauma-shake, impactos) y el HAZ VIVO.
// Opera sobre la instancia de Game vía métodos; solo depende de three (el haz vivo).
import * as THREE from 'three';

// Ruido suave 1D (value noise interpolado) para una sacudida orgánica,
// en lugar de Math.random() puro cada frame (que produce un temblor "sucio").
// Devuelve un valor continuo en [-1, 1] respecto a t.
export function smoothNoise(t, seed = 0) {
  const x = t + seed * 13.37;
  const i = Math.floor(x);
  const f = x - i;
  // hash determinista por entero
  const h = (n) => {
    const s = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453;
    return (s - Math.floor(s)) * 2 - 1; // [-1, 1]
  };
  const a = h(i);
  const b = h(i + 1);
  // suavizado smoothstep para una curva continua
  const u = f * f * (3 - 2 * f);
  return a + (b - a) * u;
}

// Duración de hit-stop (ms) según la "fuerza" del golpe.
// normal ~50ms, fuerte ~90ms, crítico ~160ms. El crítico del BÁSICO, 40 ms (S0, G08): sale muy a
// menudo y contra cualquier rata; el peso lo llevan las habilidades que declaran `heavy`.
export function hitStopMs(kind) {
  switch (kind) {
    case 'crit': return 160;
    case 'heavy': return 90;
    case 'basicCrit': return 40;
    default: return 50;
  }
}

// Sacudida de una habilidad de CARGAR y soltar (S0, G08): base × (0,6 + 0,4 · fracción de la carga).
// Sin carga (frac null), la base entera.
export function chargedShake(base, frac = null) {
  if (!(base > 0)) return 0;
  if (frac == null || !Number.isFinite(frac)) return base;
  return base * (0.6 + 0.4 * Math.max(0, Math.min(1, frac)));
}

// ------------------------------------------------------------ HAZ VIVO (S0, T3)
// Un haz que VIVE mientras dura su habilidad: se crea al empezar, cada fotograma va de `from` (la
// mano o el arma) a `to` (el objetivo o el FINAL de la línea que atraviesa) y se apaga al acabar.
// Núcleo claro + halo aditivo del color de la habilidad, ruido que se desliza a lo largo del haz
// (procedural en el shader: sin canvas), ancho y brillo cambiables en vivo (Cargas, rampa), latido
// por tic y chispas en el punto de impacto. Sin `document` (pruebas headless) o sin fxGroup no crea
// malla: el asa guarda igual su estado (from, to, ancho, brillo, vivo) y las pruebas lo leen.
// opts: from / to (Vector3, {x,y,z} o función que lo devuelve cada fotograma), color, coreColor,
//   width (m, el halo), core (m, el núcleo), intensity (brillo; 0 = invisible), scroll (m/s del
//   ruido), sparks (false = sin chispas), sparkEvery (s), dur (s: se apaga solo; sin dur, hasta end())
export const LIVE_BEAM_DEFAULTS = Object.freeze({ width: 0.5, core: 0.15, intensity: 1, color: 0xb996ff, coreColor: 0xffffff,
  scroll: 6, sparkEvery: 0.1, fadeIn: 0.06, fadeOut: 0.14, pulseDecay: 0.16 });

const VERT = `varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
// uv.x = metros a lo largo del haz (0 → uLen), uv.y = de borde a borde (0 → 1)
const FRAG = `varying vec2 vUv;
uniform float uTime, uIntensity, uCoreFrac, uAlpha, uLen, uScroll;
uniform vec3 uColor, uCoreColor;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
void main() {
  float d = abs(vUv.y - 0.5) * 2.0;
  float n = noise(vec2(vUv.x * 1.6 - uTime * uScroll * 0.3, vUv.y * 3.0)) * 0.6
          + noise(vec2(vUv.x * 4.0 - uTime * uScroll * 0.55, vUv.y * 7.0 + 3.0)) * 0.4;
  float halo = pow(1.0 - d, 2.2) * (0.45 + 0.75 * n);
  float core = 1.0 - smoothstep(uCoreFrac * 0.35, uCoreFrac, d);
  float ends = smoothstep(0.0, 0.2, vUv.x) * (1.0 - smoothstep(uLen - 0.2, uLen, vUv.x));
  vec3 col = uColor * halo + uCoreColor * core * (0.8 + 0.4 * n);
  float a = clamp(halo * 0.8 + core, 0.0, 1.0) * uAlpha * ends;
  gl_FragColor = vec4(col * uIntensity, a * min(1.0, uIntensity));
}`;

const hexOf = c => '#' + (((c >>> 0) & 0xffffff).toString(16).padStart(6, '0'));
const sparkPreset = c => ({ name: 'Haz vivo · chispas', texture: 'spark', blending: 'additive', count: 5, burst: true, lifetime: [0.12, 0.3],
  shape: 'point', speed: [1.2, 4.5], gravity: -1, drag: 2, size: { start: [0.1, 0.22], end: 0 },
  color: { start: '#ffffff', end: hexOf(c) }, alpha: { start: 0.95, end: 0 } });
const flarePreset = c => ({ name: 'Haz vivo · destello', texture: 'glow', blending: 'additive', count: 1, burst: true, lifetime: [0.1, 0.18],
  shape: 'point', shapeRadius: 0.01, speed: [0, 0], gravity: 0, drag: 0, size: { start: [0.7, 0.9], end: 0 },
  color: { start: '#ffffff', end: hexOf(c) }, alpha: { start: 0.9, end: 0 } });

// lee un extremo: función (cada fotograma), Vector3 o {x, y, z}
function readPoint(src, out) {
  const v = typeof src === 'function' ? src() : src;
  if (!v || !Number.isFinite(v.x) || !Number.isFinite(v.z)) return false;
  out.set(v.x, Number.isFinite(v.y) ? v.y : 1.0, v.z);
  return true;
}

export function createLiveBeam(g, opts = {}) {
  const D = LIVE_BEAM_DEFAULTS;
  const h = {
    alive: true, ending: false, t: 0, fade: 0, pulseK: 0, sparkAcc: 0, steps: 0,
    from: new THREE.Vector3(), to: new THREE.Vector3(),
    width: opts.width ?? D.width, core: opts.core ?? D.core, intensity: opts.intensity ?? D.intensity,
    color: opts.color ?? D.color, coreColor: opts.coreColor ?? D.coreColor, scroll: opts.scroll ?? D.scroll,
    dur: opts.dur > 0 ? opts.dur : 0, sparks: opts.sparks !== false, sparkEvery: Math.max(0.03, opts.sparkEvery ?? D.sparkEvery),
    _from: opts.from || null, _to: opts.to || null, mesh: null, uniforms: null,
    // cambia los extremos (vectores o funciones) y los relee al instante
    update(o = {}) {
      if (o.from) h._from = o.from;
      if (o.to) h._to = o.to;
      readPoint(h._from, h.from); readPoint(h._to, h.to);
      return h;
    },
    setWidth(w, core = null) { if (w > 0) h.width = w; if (core > 0) h.core = core; return h; },
    setIntensity(k) { if (Number.isFinite(k)) h.intensity = Math.max(0, k); return h; },
    setColor(c, coreColor = null) {
      if (c != null) h.color = c;
      if (coreColor != null) h.coreColor = coreColor;
      if (h.uniforms) { h.uniforms.uColor.value.set(h.color); h.uniforms.uCoreColor.value.set(h.coreColor); }
      return h;
    },
    // latido (un tic): +35 % de ancho y brillo que decae en pulseDecay s, chispas y destello en la mano
    pulse(k = 1) {
      h.pulseK = Math.max(h.pulseK, Math.max(0, k));
      if (h.sparks && h.intensity > 0) { g?.emitFx?.(sparkPreset(h.color), h.to.clone()); g?.emitFx?.(flarePreset(h.color), h.from.clone()); }
      return h;
    },
    // se apaga en `fade` s (0: al instante)
    end(fade = D.fadeOut) {
      if (!h.alive || h.ending) return h;
      h.ending = true; h.fade = Math.max(0, fade); h.endT = h.fade;
      if (!(h.fade > 0)) h.dispose();
      return h;
    },
    dispose() {
      h.alive = false;
      if (h.mesh) {
        try { h.mesh.parent?.remove(h.mesh); h.mesh.geometry.dispose(); h.mesh.material.dispose(); } catch { /* sin GL */ }
        h.mesh = null;
      }
    },
    // un fotograma: relee los extremos, anima y redibuja. → false cuando ya no vive
    step(dt) {
      if (!h.alive) return false;
      h.t += dt; h.steps++;
      readPoint(h._from, h.from); readPoint(h._to, h.to);
      if (h.dur > 0 && !h.ending && h.t >= h.dur) h.end();
      if (h.ending) { h.endT -= dt; if (h.endT <= 0) { h.dispose(); return false; } }
      h.pulseK = Math.max(0, h.pulseK - dt / D.pulseDecay);
      if (h.sparks && !h.ending && h.intensity > 0) {
        h.sparkAcc += dt;
        if (h.sparkAcc >= h.sparkEvery) { h.sparkAcc = 0; g?.emitFx?.(sparkPreset(h.color), h.to.clone()); }
      }
      if (h.mesh) draw(h, g);
      return true;
    },
  };
  h.update();
  // malla solo con DOM y grupo de efectos (en las pruebas headless, solo el estado)
  if (typeof document !== 'undefined' && g?.fxGroup) {
    try {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(12), 3));
      geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(8), 2));
      geo.setIndex([0, 1, 2, 2, 1, 3]);
      h.uniforms = {
        uTime: { value: 0 }, uIntensity: { value: h.intensity }, uCoreFrac: { value: 0.3 }, uAlpha: { value: 0 }, uLen: { value: 1 },
        uScroll: { value: h.scroll }, uColor: { value: new THREE.Color(h.color) }, uCoreColor: { value: new THREE.Color(h.coreColor) },
      };
      const mat = new THREE.ShaderMaterial({ uniforms: h.uniforms, vertexShader: VERT, fragmentShader: FRAG, transparent: true,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
      h.mesh = new THREE.Mesh(geo, mat);
      h.mesh.frustumCulled = false;
      h.mesh.renderOrder = 5;
      g.fxGroup.add(h.mesh);
      draw(h, g);
      g.emitFx?.(flarePreset(h.color), h.from.clone());
    } catch { h.mesh = null; }
  }
  return h;
}

// geometría y uniformes de un fotograma: una cinta que mira a la cámara a lo largo del eje del haz
const _ax = new THREE.Vector3(), _view = new THREE.Vector3(), _side = new THREE.Vector3();
function draw(h, g) {
  const a = h.from, b = h.to;
  _ax.subVectors(b, a);
  const len = Math.max(0.05, _ax.length());
  _ax.divideScalar(len);
  if (g?.camera?.getWorldDirection) g.camera.getWorldDirection(_view); else _view.set(0, -1, 0);
  _side.crossVectors(_ax, _view);
  if (_side.lengthSq() < 1e-6) _side.set(-_ax.z, 0, _ax.x);
  _side.normalize();
  const k = 1 + 0.35 * h.pulseK;
  const half = (h.width * k) / 2;
  const pos = h.mesh.geometry.attributes.position, uv = h.mesh.geometry.attributes.uv;
  const P = [[a, -1], [a, 1], [b, -1], [b, 1]];
  P.forEach(([p, s], i) => pos.setXYZ(i, p.x + _side.x * half * s, p.y + _side.y * half * s, p.z + _side.z * half * s));
  [[0, 0], [0, 1], [len, 0], [len, 1]].forEach(([u, v], i) => uv.setXY(i, u, v));
  pos.needsUpdate = true; uv.needsUpdate = true;
  const U = h.uniforms;
  U.uTime.value = h.t;
  U.uLen.value = len;
  U.uCoreFrac.value = Math.max(0.05, Math.min(1, h.core / Math.max(0.01, h.width)));
  U.uIntensity.value = h.intensity * k;
  const fadeIn = Math.min(1, h.t / LIVE_BEAM_DEFAULTS.fadeIn);
  U.uAlpha.value = h.ending ? fadeIn * Math.max(0, h.endT / Math.max(1e-3, h.fade)) : fadeIn;
}
