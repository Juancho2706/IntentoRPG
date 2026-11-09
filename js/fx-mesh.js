// fx-mesh.js — Kit de efectos de MALLA con shader (rework VFX).
// Complementa a particles.js: lo que una nube de sprites no lee bien (frente de una onda, filo de un tajo,
// marca en el suelo, columna, haz, telegrafía) se dibuja con un plano/cilindro y un shader pequeño.
//
// Reglas del kit (investigación VFX oct-2026, MEMORIA §5.3):
//  · El borde visual ES el alcance: el anillo termina en el radio de juego, el tajo en el rango.
//  · Timing no lineal: el frente sale con ease-out (pico antes del 25 % de la vida) y muere por EROSIÓN
//    con ruido, no por fundido lineal de alfa.
//  · Mezcla premultiplicada (ONE, ONE_MINUS_SRC_ALPHA): el mismo plano suma luz y pone sombra debajo
//    (el aditivo solo se lee sobre oscuro).
//  · Nada se crea por golpe: mallas en pool por tipo; los materiales clonados comparten programa.
//
// Uso: const mfx = new MeshFx(scene); mfx.ring(pos, r, color); …; mfx.update(dt) cada fotograma.
// Todo es cosmético (Math.random permitido; nunca toca la simulación).
import * as THREE from 'three';

export const ELEM_DECAL = Object.freeze({
  fire: 'fx_grieta_suelo', physical: 'fx_grieta_suelo', frost: 'fx_esquirla_hielo',
  arcane: 'fx_runa_arcana', holy: 'fx_anillo_sagrado', nature: 'fx_hojas',
});
export const ELEM_COLOR = Object.freeze({
  fire: 0xff7a2a, physical: 0xe8d2a8, frost: 0x8fd8ff, arcane: 0xb48cff, holy: 0xffe28a, nature: 0x8fe06a,
});

const PRELOAD = ['fx_grieta_suelo', 'fx_esquirla_hielo', 'fx_runa_arcana', 'fx_anillo_sagrado', 'fx_hojas'];

// ---------------------------------------------------------------- ruido en teja (una vez)
function makeNoise(size = 128) {
  const cell = (n, seed) => {            // ruido de valor periódico de n celdas
    const g = new Float32Array(n * n);
    let s = seed;
    for (let i = 0; i < g.length; i++) { s = (s * 16807 + 12345) % 2147483647; g[i] = (s % 10000) / 10000; }
    return (x, y) => {
      const fx = x * n, fy = y * n, x0 = Math.floor(fx), y0 = Math.floor(fy);
      const tx = fx - x0, ty = fy - y0, sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
      const a = g[(y0 % n) * n + (x0 % n)], b = g[(y0 % n) * n + ((x0 + 1) % n)];
      const c = g[((y0 + 1) % n) * n + (x0 % n)], d = g[((y0 + 1) % n) * n + ((x0 + 1) % n)];
      return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
    };
  };
  const o1 = [cell(4, 7), cell(8, 31), cell(16, 97), cell(32, 211)];
  const o2 = [cell(6, 19), cell(12, 53), cell(24, 151)];
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size, v = y / size;
    const a = o1[0](u, v) * 0.5 + o1[1](u, v) * 0.27 + o1[2](u, v) * 0.15 + o1[3](u, v) * 0.08;
    const b = o2[0](u, v) * 0.55 + o2[1](u, v) * 0.3 + o2[2](u, v) * 0.15;
    const i = (y * size + x) * 4;
    data[i] = a * 255; data[i + 1] = b * 255; data[i + 2] = Math.abs(a - 0.5) * 510; data[i + 3] = 255;
  }
  const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = t.minFilter = THREE.LinearFilter; t.needsUpdate = true;
  return t;
}

const VERT = /* glsl */`
  varying vec2 vUv; varying vec3 vN;
  void main() { vUv = uv; vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const TAIL = /* glsl */`
  #include <tonemapping_fragment>
  #include <colorspace_fragment>`;
const HEAD = /* glsl */`
  uniform sampler2D uNoise; uniform vec3 uColor; uniform float uT; uniform float uSeed; uniform float uGain;
  varying vec2 vUv; varying vec3 vN;
  float nz(vec2 p) { return texture2D(uNoise, p).r; }
  float nz2(vec2 p) { return texture2D(uNoise, p).g; }`;

const FRAG = {
  // Onda de choque: frente nítido en r = uFront (1 = radio de juego), cola erosionada, relleno tenue y sombra.
  ring: /* glsl */`${HEAD}
    uniform float uFront; uniform float uFill;
    void main() {
      vec2 p = (vUv * 2.0 - 1.0) * 1.15; float r = length(p); float a = atan(p.y, p.x) / 6.2832;
      float n = nz(vec2(a * 3.0 + uSeed, r * 0.7 - uT * 0.5)); float n2 = nz2(vec2(a * 7.0 - uSeed, r * 1.9 + uT));
      float w = mix(0.34, 0.08, uT); float d = r - uFront;
      float band = smoothstep(0.025, 0.0, d) * smoothstep(-w, -w * 0.15, d + (n - 0.5) * w * 1.1);
      float life = 1.0 - uT; band *= smoothstep(0.0, 0.3, life + (n2 - 0.5) * 0.45);
      float rim = smoothstep(0.035, 0.0, abs(d + 0.018)) * smoothstep(0.0, 0.2, life);
      float fill = (1.0 - smoothstep(0.0, max(uFront, 0.05), r)) * uFill * life * life;
      vec3 hot = mix(uColor, vec3(1.0), 0.45);
      vec3 add = uColor * band * 0.8 + hot * rim * 0.95 + uColor * fill;
      float sh = band * 0.38 + rim * 0.1;
      if (max(max(add.r, add.g), add.b) + sh < 0.004) discard;
      gl_FragColor = vec4(add * uGain, sh * min(1.0, uGain)); ${TAIL}
    }`,
  // Tajo: media luna que BARRE el arco en el primer tercio y se erosiona. Filo exterior casi blanco.
  slash: /* glsl */`${HEAD}
    uniform float uArc; uniform float uFlip;
    void main() {
      vec2 p = (vUv * 2.0 - 1.0) * 1.08; float r = length(p);
      float a = atan(p.x * uFlip, p.y);                       // 0 = hacia delante (+v)
      float u = (a + uArc) / (2.0 * uArc);                    // 0..1 a lo largo del arco
      if (u < 0.0 || u > 1.0 || r > 1.02) discard;
      float sweep = smoothstep(0.0, 0.34, uT);                // frente del barrido
      float behind = sweep - u;
      float vis = smoothstep(0.0, 0.03, behind) * exp(-max(behind, 0.0) * mix(1.2, 5.0, smoothstep(0.3, 1.0, uT)));
      float n = nz(vec2(u * 2.0 + uSeed, r * 1.5 - uT * 0.8));
      float inner = 1.0 - 0.5 * sin(3.1416 * clamp(u, 0.0, 1.0)) - 0.04;
      float body = smoothstep(inner - 0.02 + (n - 0.5) * 0.2, inner + 0.22, r) * smoothstep(1.0, 0.965, r);
      float edge = smoothstep(0.9, 0.985, r) * smoothstep(1.0, 0.985, r);
      float life = 1.0 - smoothstep(0.3, 1.0, uT);
      float er = smoothstep(0.0, 0.35, life + (nz2(vec2(u * 4.0, r * 3.0 + uSeed)) - 0.5) * 0.6);
      float m = vis * body * er;
      vec3 add = uColor * m * 0.85 + mix(uColor, vec3(1.0), 0.6) * edge * vis * er * 1.15;
      if (max(max(add.r, add.g), add.b) < 0.004) discard;
      gl_FragColor = vec4(add * uGain, m * 0.25); ${TAIL}
    }`,
  // Calcomanía de suelo: textura pintada (fondo negro → aditiva) que aparece de golpe y se erosiona.
  decal: /* glsl */`${HEAD}
    uniform sampler2D uMap; uniform float uDark; uniform float uMono;
    void main() {
      vec4 t = texture2D(uMap, vUv); float l = max(max(t.r, t.g), t.b);
      t.rgb = mix(t.rgb, vec3(l), uMono);                    // uMono: solo la forma, el color lo pone uColor
      float pop = smoothstep(0.0, 0.08, uT); float life = 1.0 - smoothstep(0.45, 1.0, uT);
      float n = nz(vUv * 1.7 + uSeed);
      float er = smoothstep(0.0, 0.3, life * 1.3 - (1.0 - l) * 0.3 + (n - 0.5) * 0.5) * pop;
      float heat = 1.0 + 1.6 * (1.0 - smoothstep(0.0, 0.22, uT));       // fogonazo inicial
      vec3 add = t.rgb * uColor * er * heat;
      float r = length(vUv * 2.0 - 1.0);
      float sh = uDark * l * er + uDark * 0.35 * (1.0 - smoothstep(0.2, 0.9, r)) * life * pop;
      if (max(max(add.r, add.g), add.b) + sh < 0.004) discard;
      gl_FragColor = vec4(add * uGain, sh); ${TAIL}
    }`,
  // Columna: cilindro abierto con ruido que sube; se adelgaza y se erosiona de arriba abajo.
  pillar: /* glsl */`${HEAD}
    void main() {
      float v = vUv.y; float n = nz(vec2(vUv.x * 2.0 + uSeed, v * 1.3 - uT * 2.2)); float n2 = nz2(vec2(vUv.x * 5.0, v * 3.0 - uT * 4.0));
      float pop = smoothstep(0.0, 0.07, uT); float life = 1.0 - uT;
      float top = smoothstep(life * 1.25 + 0.05, life * 1.25 - 0.35, v + (n - 0.5) * 0.4);
      float fres = pow(1.0 - abs(vN.z), 1.5) * 0.8 + 0.25;
      float streak = smoothstep(0.35, 0.8, n * 0.6 + n2 * 0.5);
      float m = top * pop * (1.0 - v * 0.55) * fres * (0.35 + streak);
      vec3 add = mix(uColor, vec3(1.0), 0.45 * (1.0 - v) * streak) * m;
      if (max(max(add.r, add.g), add.b) < 0.004) discard;
      gl_FragColor = vec4(add * uGain, 0.0); ${TAIL}
    }`,
  // Fogonazo de suelo: «luz falsa» blanda bajo un impacto.
  flash: /* glsl */`${HEAD}
    void main() {
      float r = length(vUv * 2.0 - 1.0); float k = 1.0 - uT;
      float m = pow(max(0.0, 1.0 - r), 2.0) * k * k;
      if (m < 0.004) discard;
      gl_FragColor = vec4(mix(uColor, vec3(1.0), 0.35 * k) * m * uGain, 0.0); ${TAIL}
    }`,
  // Haz: cinta horizontal con núcleo, ruido que corre y puntas afiladas. uWarn = línea de aviso (pulsa).
  beam: /* glsl */`${HEAD}
    uniform float uLen; uniform float uWarn;
    void main() {
      float x = vUv.x; float y = abs(vUv.y * 2.0 - 1.0);
      float n = nz(vec2(x * uLen * 0.25 - uT * 3.0 + uSeed, vUv.y * 0.6)); float n2 = nz2(vec2(x * uLen * 0.6 + uT * 5.0, vUv.y));
      float taper = smoothstep(0.0, 0.06, x) * smoothstep(1.0, 0.9, x);
      float life = mix(1.0 - uT * uT, 0.55 + 0.45 * abs(sin(uT * 40.0 * (0.4 + uT))), uWarn);
      float core = smoothstep(0.22, 0.0, y) * taper;
      float glow = smoothstep(1.0, 0.1, y + (n - 0.5) * 0.7) * taper * (0.55 + 0.6 * n2);
      float grow = mix(1.0 + uT * 0.6, 1.0, uWarn);
      float dash = mix(1.0, step(0.35, fract(x * uLen * 0.8 - uT * 2.0)), uWarn);
      vec3 add = (mix(uColor, vec3(1.0), 0.8) * core * 1.5 * mix(1.0, 0.5, uWarn) + uColor * glow * 0.8 * grow * mix(1.0, 0.45, uWarn)) * life * dash;
      if (max(max(add.r, add.g), add.b) < 0.004) discard;
      gl_FragColor = vec4(add * uGain, 0.0); ${TAIL}
    }`,
  // Telegrafía enemiga: borde luminoso + contorno oscuro, relleno con UN frente que llega al borde en el
  // instante del golpe, pulso de 2 Hz que acelera a 6 Hz en el último 30 %.
  telegraph: /* glsl */`${HEAD}
    uniform float uProg; uniform float uTime; uniform float uPx;
    void main() {
      vec2 p = (vUv * 2.0 - 1.0) * 1.06; float r = length(p); float a = atan(p.y, p.x) / 6.2832;
      float bw = uPx;                                         // ancho del borde (0,14 m en unidades de radio)
      float border = smoothstep(1.0 - bw, 1.0 - bw * 0.6, r) * smoothstep(1.0, 1.0 - bw * 0.15, r);
      float outline = smoothstep(1.0 + bw * 0.5, 1.0, r) * smoothstep(1.0 - bw * 1.6, 1.0 - bw, r);
      float hz = mix(2.0, 6.0, smoothstep(0.7, 1.0, uProg));
      float pulse = 0.72 + 0.28 * sin(uTime * 6.2832 * hz);
      float n = nz(vec2(a * 4.0 + uSeed, r * 1.2 - uTime * 0.15));
      float inside = smoothstep(1.0 - bw, 1.0 - bw * 1.4, r);
      float front = smoothstep(uProg + 0.012, uProg - 0.012, r) * inside;
      float lip = smoothstep(0.07, 0.0, abs(r - uProg)) * inside * step(0.02, uProg);
      vec3 warm = mix(vec3(1.0, 0.62, 0.12), vec3(1.0, 0.16, 0.08), smoothstep(0.35, 1.0, uProg));
      float fill = inside * (0.07 + 0.05 * n) + front * (0.16 + 0.14 * n + 0.16 * uProg);
      vec3 add = warm * (border * pulse * 1.25 + lip * 0.9 + fill * 0.9);
      float sh = outline * 0.55 + inside * 0.14 + front * 0.12;
      if (max(max(add.r, add.g), add.b) + sh < 0.004) discard;
      gl_FragColor = vec4(add * uGain, sh); ${TAIL}
    }`,
};

const _v = new THREE.Vector3();
const hex = (c) => (c && c.isColor ? c : new THREE.Color(c ?? 0xffffff));
const easeOut = (t, p = 3) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), p);

export class MeshFx {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'meshFx';
    scene.add(this.group);
    this.noise = makeNoise();
    this.quality = opts.quality ?? 1;          // 0 = mínimo (sin fogonazos ni calcomanías secundarias)
    this.reduceMotion = false;
    this.assetBase = opts.assetBase || './assets/vfx/';
    this._tex = {};
    this._pool = {};
    this._live = [];
    this._time = 0;
    this._plane = new THREE.PlaneGeometry(1, 1);
    this._plane.rotateX(-Math.PI / 2);                               // tumbado en el suelo (XZ), +v = -Z
    this._cyl = new THREE.CylinderGeometry(1, 0.82, 1, 24, 1, true);
    this._cyl.translate(0, 0.5, 0);
    this._proto = {};
    // precarga de las texturas pintadas: la primera calcomanía no puede salir en negro
    if (opts.preload !== false) for (const n of PRELOAD) this.tex(n);
    for (const k of Object.keys(FRAG)) {
      this._proto[k] = new THREE.ShaderMaterial({
        uniforms: {
          uNoise: { value: this.noise }, uColor: { value: new THREE.Color(1, 1, 1) }, uT: { value: 0 }, uSeed: { value: 0 }, uGain: { value: 1 },
          uFront: { value: 0 }, uFill: { value: 0.2 }, uArc: { value: 1 }, uFlip: { value: 1 }, uMap: { value: null }, uDark: { value: 0 },
          uMono: { value: 0 }, uLen: { value: 1 }, uWarn: { value: 0 }, uProg: { value: 0 }, uTime: { value: 0 }, uPx: { value: 0.05 },
        },
        vertexShader: VERT, fragmentShader: FRAG[k], transparent: true, depthWrite: false, side: THREE.DoubleSide,
        blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
        blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
      });
    }
  }

  tex(name) {
    if (!name) return null;
    if (!this._tex[name]) {
      const t = new THREE.TextureLoader().load(this.assetBase + name + '.webp');
      t.colorSpace = THREE.SRGBColorSpace;
      this._tex[name] = t;
    }
    return this._tex[name];
  }

  _get(kind) {
    const free = this._pool[kind] || (this._pool[kind] = []);
    let m = free.pop();
    if (!m) {
      const mat = this._proto[kind].clone();
      mat.uniforms.uNoise.value = this.noise;
      m = new THREE.Mesh(kind === 'pillar' ? this._cyl : this._plane, mat);
      m.frustumCulled = false; m.renderOrder = kind === 'telegraph' ? 6 : 4;
      m.userData.kind = kind;
      this.group.add(m);
    }
    m.visible = true; m.rotation.set(0, 0, 0); m.scale.set(1, 1, 1);
    const u = m.material.uniforms;
    u.uT.value = 0; u.uSeed.value = Math.random() * 7; u.uGain.value = 1;
    return m;
  }

  _add(m, dur, delay = 0, tick = null) {
    const f = { m, t: -delay, dur: Math.max(0.03, dur), tick };
    if (delay > 0) m.visible = false;
    this._live.push(f);
    return f;
  }

  _free(m) { m.visible = false; (this._pool[m.userData.kind] || (this._pool[m.userData.kind] = [])).push(m); }

  // ---- onda de choque: el frente llega EXACTO al radio. opts: { dur, gain, fill, delay, soft, y }
  ring(pos, radius, color, opts = {}) {
    const m = this._get('ring'); const u = m.material.uniforms;
    m.position.set(pos.x, opts.y ?? 0.07, pos.z);
    m.scale.set(radius * 2.3, 1, radius * 2.3);
    u.uColor.value.set(hex(color)); u.uFill.value = opts.fill ?? (opts.soft ? 0.0 : 0.22);
    u.uGain.value = opts.gain ?? (opts.soft ? 0.55 : 1);
    const start = opts.from ?? 0.12;
    this._add(m, opts.dur ?? (0.34 + Math.min(0.3, radius * 0.035)), opts.delay, (k) => {
      u.uFront.value = start + (1 - start) * easeOut(k / 0.62, 3);
    });
    return m;
  }

  // ---- tajo en media luna centrado en `pos`, mirando a `yaw` (rad, 0 = +Z como Object3D.rotation.y).
  // opts: { arc (grados totales), dur, flip, y, gain, tilt, delay }
  slash(pos, yaw, radius, color, opts = {}) {
    const m = this._get('slash'); const u = m.material.uniforms;
    m.position.set(pos.x, opts.y ?? 1.0, pos.z);
    m.rotation.set(opts.tilt ?? 0, yaw + Math.PI, 0, 'YXZ');
    m.scale.set(radius * 2.16, 1, radius * 2.16);
    u.uColor.value.set(hex(color)); u.uArc.value = THREE.MathUtils.degToRad((opts.arc ?? 120) / 2);
    u.uFlip.value = opts.flip ? -1 : 1; u.uGain.value = opts.gain ?? 1;
    this._add(m, opts.dur ?? 0.3, opts.delay);
    return m;
  }

  // ---- calcomanía de suelo con textura pintada. opts: { dur, dark, gain, rot, grow, delay, y }
  decal(pos, radius, texName, color, opts = {}) {
    if (this.quality <= 0 && opts.minor) return null;
    const map = this.tex(texName); if (!map) return null;
    const m = this._get('decal'); const u = m.material.uniforms;
    m.position.set(pos.x, opts.y ?? 0.05, pos.z);
    m.rotation.y = opts.rot ?? Math.random() * Math.PI * 2;
    const s0 = radius * 2 * (opts.grow ? 0.7 : 1);
    m.scale.set(s0, 1, s0);
    u.uMap.value = map; u.uColor.value.set(hex(color ?? 0xffffff)); u.uDark.value = opts.dark ?? 0.35; u.uGain.value = opts.gain ?? 1;
    u.uMono.value = opts.mono ? 1 : 0;
    const spin = opts.spin || 0;
    this._add(m, opts.dur ?? 1.1, opts.delay, (opts.grow || spin) ? (k, dt) => {
      if (opts.grow) { const s = radius * 2 * (0.7 + 0.3 * easeOut(k / 0.25, 3)); m.scale.set(s, 1, s); }
      if (spin) m.rotation.y += spin * dt;
    } : null);
    return m;
  }

  // ---- columna de luz/fuego. opts: { dur, gain, delay }
  pillar(pos, radius, height, color, opts = {}) {
    const m = this._get('pillar'); const u = m.material.uniforms;
    m.position.set(pos.x, opts.y ?? 0.02, pos.z);
    m.scale.set(radius, height, radius);
    u.uColor.value.set(hex(color)); u.uGain.value = opts.gain ?? 1;
    this._add(m, opts.dur ?? 0.55, opts.delay, (k) => { const s = radius * (1 - 0.45 * k); m.scale.set(s, height * (1 + 0.15 * k), s); });
    return m;
  }

  // ---- fogonazo de suelo (luz falsa). opts: { dur, gain, delay }
  flash(pos, radius, color, opts = {}) {
    if (this.quality <= 0 || this.reduceMotion) return null;
    const m = this._get('flash'); const u = m.material.uniforms;
    m.position.set(pos.x, opts.y ?? 0.06, pos.z);
    m.scale.set(radius * 2, 1, radius * 2);
    u.uColor.value.set(hex(color)); u.uGain.value = opts.gain ?? 0.8;
    this._add(m, opts.dur ?? 0.16, opts.delay);
    return m;
  }

  // ---- haz de A a B. dur ≥ 0,5 s = línea de aviso (fina, discontinua, pulsa). opts: { width, gain, warn }
  beam(a, b, color, dur = 0.16, opts = {}) {
    const m = this._get('beam'); const u = m.material.uniforms;
    const dx = b.x - a.x, dz = b.z - a.z; const len = Math.max(0.3, Math.hypot(dx, dz));
    const warn = opts.warn ?? dur >= 0.5;
    const w = opts.width ?? (warn ? 0.34 : 0.8);
    m.position.set((a.x + b.x) / 2, opts.y ?? ((a.y ?? 1) + (b.y ?? 1)) / 2, (a.z + b.z) / 2);
    m.rotation.y = Math.atan2(-dz, dx);                                // +u del plano a lo largo de A→B
    m.scale.set(len, 1, w);
    u.uColor.value.set(hex(color)); u.uLen.value = len; u.uWarn.value = warn ? 1 : 0; u.uGain.value = opts.gain ?? 1;
    this._add(m, dur);
    return m;
  }

  // ---- telegrafía enemiga: devuelve un asa { set(prog), end() }; el dueño la avanza y la cierra.
  telegraph(pos, radius) {
    const m = this._get('telegraph'); const u = m.material.uniforms;
    m.position.set(pos.x, 0.08, pos.z);
    m.scale.set(radius * 2.12, 1, radius * 2.12);
    u.uPx.value = Math.min(0.2, 0.14 / Math.max(0.5, radius)); u.uProg.value = 0;
    const f = this._add(m, 1e9, 0, () => { u.uTime.value = this.reduceMotion ? 0 : this._time; });
    return { mesh: m, set: (prog) => { u.uProg.value = Math.min(1, Math.max(0, prog)) * (1 - u.uPx.value); }, end: () => { f.t = f.dur = 1; } };
  }

  // ---- recetas compuestas -------------------------------------------------------------------
  // Impacto de área con sabor de elemento: onda + fogonazo + calcomanía. `power` 0..2 (básico → definitiva).
  areaImpact(pos, radius, elem, color, power = 1) {
    const col = color ?? ELEM_COLOR[elem] ?? 0xffcc88;
    this.ring(pos, radius, col, { gain: 0.85 + 0.25 * power, fill: 0.16 + 0.08 * power });
    this.flash(pos, radius * 1.25, col, { gain: 0.5 + 0.3 * power });
    const tex = ELEM_DECAL[elem] || 'fx_grieta_suelo';
    const big = elem === 'arcane' || elem === 'holy';
    this.decal(pos, radius * (big ? 1.0 : 0.85), tex, elem === 'physical' ? 0xe6d6b4 : 0xffffff,
      { mono: elem === 'physical', dur: 0.8 + 0.5 * power, dark: big ? 0.2 : 0.5, grow: !big, spin: big ? 0.9 : 0, gain: 0.8 + 0.3 * power, minor: power < 1 });
    if (power >= 2) this.ring(pos, radius * 1.15, col, { delay: 0.09, soft: true, dur: 0.6 });
  }

  // Tajo cuerpo a cuerpo (melee/cono) con sabor de elemento.
  meleeArc(pos, yaw, radius, elem, color, opts = {}) {
    const col = color ?? ELEM_COLOR[elem] ?? 0xffe0b0;
    this.slash(pos, yaw, radius, col, opts);
    if (opts.double) this.slash(pos, yaw, radius * 0.92, col, { ...opts, flip: !opts.flip, delay: 0.07, gain: (opts.gain ?? 1) * 0.8 });
  }

  // Estallido alrededor del héroe al activar un buff/escudo: columna corta + onda blanda + sello a los pies.
  buffBurst(pos, elem, color, radius = 1.4) {
    const col = color ?? ELEM_COLOR[elem] ?? 0xffe28a;
    this.pillar(pos, radius * 0.55, 2.6, col, { dur: 0.5, gain: 0.9 });
    this.ring(pos, radius, col, { soft: true, dur: 0.45 });
    this.decal(pos, radius * 0.95, elem === 'arcane' ? 'fx_runa_arcana' : 'fx_anillo_sagrado', elem === 'arcane' || elem === 'holy' ? 0xffffff : col,
      { dur: 0.9, dark: 0.12, spin: 1.4, gain: 0.8, minor: true });
  }

  update(dt) {
    if (!(dt > 0)) return;
    this._time += dt;
    for (let i = this._live.length - 1; i >= 0; i--) {
      const f = this._live[i];
      f.t += dt;
      if (f.t < 0) continue;
      if (!f.m.visible) f.m.visible = true;
      const k = f.t / f.dur;
      if (k >= 1) { this._free(f.m); this._live.splice(i, 1); continue; }
      f.m.material.uniforms.uT.value = k;
      if (f.tick) f.tick(k, dt);
    }
  }

  get liveCount() { return this._live.length; }

  clear() {
    for (const f of this._live) this._free(f.m);
    this._live.length = 0;
  }

  dispose() {
    this.clear();
    this.scene.remove(this.group);
    for (const k of Object.keys(this._pool)) for (const m of this._pool[k]) m.material.dispose();
    for (const k of Object.keys(this._proto)) this._proto[k].dispose();
    for (const k of Object.keys(this._tex)) this._tex[k].dispose();
    this._plane.dispose(); this._cyl.dispose(); this.noise.dispose();
  }
}
