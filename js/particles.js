// particles.js — motor de partículas reutilizable para IntentoRPG.
//
// Diseño (buenas prácticas 2026):
//  - Sistema POOLED basado en THREE.Points + BufferGeometry. Las partículas se
//    pre-asignan una sola vez (POOL_SIZE) y se reciclan por índice; no se crean
//    ni destruyen objetos por frame -> sin "GC stutter".
//  - Atributos del buffer: posición, tamaño, color, alpha. Velocidad / vida /
//    rotación se llevan en arrays planos paralelos (no se suben a la GPU salvo
//    lo que el shader necesita).
//  - Texturas generadas por <canvas> (degradado radial), sin assets externos.
//  - Blending aditivo opcional (fuego, rayo, arcano...) o normal (humo, sangre).
//  - Curvas por vida: color inicio->fin, tamaño inicio->fin, alpha fade.
//
// Pensado para que MÁS ADELANTE el juego lo use: basta con
//   import { ParticleSystem, PRESETS } from './particles.js';
//   const fx = new ParticleSystem(scene);
//   fx.emit(PRESETS.fireImpact, pos);   // en algún evento
//   fx.update(dt);                       // en el bucle de render
//
// No depende del juego ni de three.quarks.

import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Texturas generadas por canvas
// ---------------------------------------------------------------------------

const _texCache = new Map();

// Crea (y cachea) una CanvasTexture para el tipo dado.
// kinds: 'glow' | 'spark' | 'smoke' | 'disc' | 'star'
export function makeParticleTexture(kind = 'glow', size = 256) {
  const key = `${kind}@${size}`;
  if (_texCache.has(key)) return _texCache.get(key);

  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const cx = size / 2;
  ctx.clearRect(0, 0, size, size);

  switch (kind) {
    case 'spark': {
      // núcleo MUY brillante (sobreexpuesto) + halo + cruz de difracción tipo
      // lens-flare para que cada chispa "queme" en pantalla con additive.
      const g = ctx.createRadialGradient(cx, cx, 0, cx, cx, cx);
      g.addColorStop(0.0, 'rgba(255,255,255,1)');
      g.addColorStop(0.18, 'rgba(255,255,255,1)');
      g.addColorStop(0.4, 'rgba(255,255,255,0.55)');
      g.addColorStop(0.7, 'rgba(255,255,255,0.16)');
      g.addColorStop(1.0, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
      // cruz de difracción (anamórfica) sutil
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      for (let i = 0; i < 2; i++) {
        const a = i * Math.PI / 2;
        const len = cx * 0.92;
        const grad = ctx.createLinearGradient(
          cx - Math.cos(a) * len, cx - Math.sin(a) * len,
          cx + Math.cos(a) * len, cx + Math.sin(a) * len);
        grad.addColorStop(0, 'rgba(255,255,255,0)');
        grad.addColorStop(0.5, 'rgba(255,255,255,0.8)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.strokeStyle = grad;
        ctx.lineWidth = size * 0.03;
        ctx.beginPath();
        ctx.moveTo(cx - Math.cos(a) * len, cx - Math.sin(a) * len);
        ctx.lineTo(cx + Math.cos(a) * len, cx + Math.sin(a) * len);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
      break;
    }
    case 'smoke': {
      // humo con textura fractal: varias bolas suaves desplazadas para romper la
      // simetría perfecta y dar cuerpo volumétrico.
      const base = ctx.createRadialGradient(cx, cx, 0, cx, cx, cx);
      base.addColorStop(0.0, 'rgba(255,255,255,0.6)');
      base.addColorStop(0.5, 'rgba(255,255,255,0.3)');
      base.addColorStop(1.0, 'rgba(255,255,255,0)');
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, size, size);
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const rr = cx * 0.32;
        const lx = cx + Math.cos(a) * rr;
        const ly = cx + Math.sin(a) * rr;
        const lobe = ctx.createRadialGradient(lx, ly, 0, lx, ly, cx * 0.5);
        lobe.addColorStop(0, 'rgba(255,255,255,0.22)');
        lobe.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = lobe;
        ctx.fillRect(0, 0, size, size);
      }
      ctx.globalCompositeOperation = 'source-over';
      break;
    }
    case 'disc': {
      // anillo/onda con borde brillante (más "energético" que un disco plano):
      // núcleo translúcido + reborde luminoso.
      const g = ctx.createRadialGradient(cx, cx, 0, cx, cx, cx);
      g.addColorStop(0.0, 'rgba(255,255,255,0.85)');
      g.addColorStop(0.55, 'rgba(255,255,255,0.7)');
      g.addColorStop(0.78, 'rgba(255,255,255,1)');
      g.addColorStop(0.9, 'rgba(255,255,255,0.85)');
      g.addColorStop(1.0, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
      break;
    }
    case 'star': {
      // destello estelar de 6 puntas (3 largas + 3 cortas) + núcleo sobreexpuesto
      // + halo: lectura "legendaria/arcana" muy vistosa.
      const halo = ctx.createRadialGradient(cx, cx, 0, cx, cx, cx);
      halo.addColorStop(0, 'rgba(255,255,255,0.9)');
      halo.addColorStop(0.25, 'rgba(255,255,255,0.4)');
      halo.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, size, size);
      const core = ctx.createRadialGradient(cx, cx, 0, cx, cx, cx * 0.32);
      core.addColorStop(0, 'rgba(255,255,255,1)');
      core.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(cx, cx, cx * 0.32, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      const arms = 6;
      for (let i = 0; i < arms; i++) {
        const a = (i / arms) * Math.PI * 2;
        const arm = cx * (i % 2 === 0 ? 0.98 : 0.55);
        const grad = ctx.createLinearGradient(cx, cx, cx + Math.cos(a) * arm, cx + Math.sin(a) * arm);
        grad.addColorStop(0, 'rgba(255,255,255,1)');
        grad.addColorStop(0.5, 'rgba(255,255,255,0.55)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.strokeStyle = grad;
        ctx.lineWidth = size * (i % 2 === 0 ? 0.045 : 0.03);
        ctx.beginPath();
        ctx.moveTo(cx, cx);
        ctx.lineTo(cx + Math.cos(a) * arm, cx + Math.sin(a) * arm);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
      break;
    }
    case 'glow':
    default: {
      // degradado radial con núcleo sobreexpuesto: glow más intenso y "caliente".
      const g = ctx.createRadialGradient(cx, cx, 0, cx, cx, cx);
      g.addColorStop(0.0, 'rgba(255,255,255,1)');
      g.addColorStop(0.22, 'rgba(255,255,255,0.85)');
      g.addColorStop(0.5, 'rgba(255,255,255,0.4)');
      g.addColorStop(1.0, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
      break;
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  _texCache.set(key, tex);
  return tex;
}

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

const TEX_KINDS = ['glow', 'spark', 'smoke', 'disc', 'star'];

function hexToRgb(hex) {
  let h = String(hex || '#ffffff').replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}

const _lerp = (a, b, t) => a + (b - a) * t;
const _rand = (min, max) => min + Math.random() * (max - min);
const _clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

// Resuelve un par [min,max] o un número a un par.
function pair(v, fb = [0, 0]) {
  if (Array.isArray(v)) return [Number(v[0]), Number(v[1])];
  if (v == null) return [fb[0], fb[1]];
  return [Number(v), Number(v)];
}

// ---------------------------------------------------------------------------
// Esquema / defaults de PRESET
// ---------------------------------------------------------------------------
//
// FORMATO DE PRESET (game-ready, serializable a JSON):
// {
//   name,                       // etiqueta
//   texture,                    // 'glow'|'spark'|'smoke'|'disc'|'star'
//   blending,                   // 'additive' | 'normal'
//   count,                      // partículas por emisión (burst) o por "tanda"
//   burst,                      // true = estallido único; false = emisión continua
//   duration,                   // s — vida del emisor (sólo continuo); 0 = infinito
//   rate,                       // partículas/seg (sólo continuo)
//   lifetime: [min,max],        // s de vida por partícula
//   shape: 'point'|'sphere'|'cone'|'ring'|'disc',
//   shapeRadius,                // radio de la forma de emisión
//   coneAngle,                  // grados de apertura (shape 'cone')
//   speed: [min,max],           // velocidad inicial
//   gravity,                    // aceleración en -Y (unidades/s^2; negativo = sube)
//   drag,                       // 0..1 amortiguación por segundo (0 = ninguna)
//   size: { start:[min,max], end },   // tamaño en mundo (start aleatorio, end factor*?)
//   color: { start:'#hex', end:'#hex' },
//   alpha: { start, end },
//   rotation,                   // grados de rotación inicial (visual, billboard)
//   spin,                       // grados/seg de giro
// }

export const DEFAULT_PRESET = Object.freeze({
  name: 'nuevo',
  texture: 'glow',
  blending: 'additive',
  count: 40,
  burst: true,
  duration: 1.0,
  rate: 60,
  lifetime: [0.5, 1.0],
  shape: 'sphere',
  shapeRadius: 0.4,
  coneAngle: 30,
  speed: [1.5, 3.5],
  gravity: 0,
  drag: 0.2,
  size: { start: [0.3, 0.6], end: 0.0 },
  color: { start: '#ffffff', end: '#ffffff' },
  alpha: { start: 1.0, end: 0.0 },
  rotation: 0,
  spin: 0,
});

// Rellena un preset parcial con los defaults (no muta el original).
export function normalizePreset(p = {}) {
  const d = DEFAULT_PRESET;
  return {
    name: p.name ?? d.name,
    texture: TEX_KINDS.includes(p.texture) ? p.texture : d.texture,
    blending: p.blending === 'normal' ? 'normal' : 'additive',
    count: Math.max(1, Math.round(p.count ?? d.count)),
    burst: p.burst ?? d.burst,
    duration: Number(p.duration ?? d.duration),
    rate: Number(p.rate ?? d.rate),
    lifetime: pair(p.lifetime, d.lifetime),
    shape: ['point', 'sphere', 'cone', 'ring', 'disc'].includes(p.shape) ? p.shape : d.shape,
    shapeRadius: Number(p.shapeRadius ?? d.shapeRadius),
    coneAngle: Number(p.coneAngle ?? d.coneAngle),
    speed: pair(p.speed, d.speed),
    gravity: Number(p.gravity ?? d.gravity),
    drag: Number(p.drag ?? d.drag),
    size: {
      start: pair(p.size?.start, d.size.start),
      end: Number(p.size?.end ?? d.size.end),
    },
    color: {
      start: p.color?.start ?? d.color.start,
      end: p.color?.end ?? d.color.end,
    },
    alpha: {
      start: Number(p.alpha?.start ?? d.alpha.start),
      end: Number(p.alpha?.end ?? d.alpha.end),
    },
    rotation: Number(p.rotation ?? d.rotation),
    spin: Number(p.spin ?? d.spin),
  };
}

// (De)serialización — pensada para guardar/cargar en assets del juego.
export function serializePreset(p) {
  return JSON.stringify(normalizePreset(p), null, 2);
}
export function deserializePreset(json) {
  const obj = typeof json === 'string' ? JSON.parse(json) : json;
  return normalizePreset(obj);
}

// ---------------------------------------------------------------------------
// PRESETS integrados (temáticos para IntentoRPG)
// ---------------------------------------------------------------------------

export const PRESETS = {
  fireImpact: normalizePreset({
    name: 'Impacto de fuego', texture: 'glow', blending: 'additive',
    count: 130, burst: true, lifetime: [0.4, 1.0],
    shape: 'sphere', shapeRadius: 0.3, speed: [3, 8], gravity: -2, drag: 0.6,
    size: { start: [0.55, 1.2], end: 0.0 },
    color: { start: '#fffbe0', end: '#b3160c' }, alpha: { start: 1, end: 0 },
  }),
  iceBurst: normalizePreset({
    name: 'Estallido de hielo', texture: 'spark', blending: 'additive',
    count: 110, burst: true, lifetime: [0.45, 1.0],
    shape: 'sphere', shapeRadius: 0.25, speed: [4, 9], gravity: 2.5, drag: 0.3,
    size: { start: [0.22, 0.55], end: 0.0 },
    color: { start: '#ffffff', end: '#3aa7ff' }, alpha: { start: 1, end: 0 }, spin: 220,
  }),
  lightningSpark: normalizePreset({
    name: 'Chispa de rayo', texture: 'spark', blending: 'additive',
    count: 80, burst: true, lifetime: [0.12, 0.4],
    shape: 'cone', shapeRadius: 0.1, coneAngle: 60, speed: [8, 16], gravity: 0, drag: 0.8,
    size: { start: [0.18, 0.45], end: 0.0 },
    color: { start: '#ffffff', end: '#9b6bff' }, alpha: { start: 1, end: 0 },
  }),
  poisonCloud: normalizePreset({
    name: 'Nube de veneno', texture: 'smoke', blending: 'normal',
    count: 44, burst: false, duration: 2.2, rate: 30, lifetime: [1.4, 2.8],
    shape: 'disc', shapeRadius: 0.7, speed: [0.2, 0.9], gravity: -0.4, drag: 0.5,
    size: { start: [0.8, 1.5], end: 2.2 },
    color: { start: '#9bff5e', end: '#2e5d18' }, alpha: { start: 0.6, end: 0 }, spin: 24,
  }),
  arcaneFlash: normalizePreset({
    name: 'Destello arcano', texture: 'star', blending: 'additive',
    count: 64, burst: true, lifetime: [0.45, 1.1],
    shape: 'sphere', shapeRadius: 0.2, speed: [2, 5], gravity: 0, drag: 0.5,
    size: { start: [0.6, 1.3], end: 0.0 },
    color: { start: '#f4e0ff', end: '#7a3cff' }, alpha: { start: 1, end: 0 }, spin: 110,
  }),
  bloodSplatter: normalizePreset({
    name: 'Salpicadura de sangre', texture: 'disc', blending: 'normal',
    count: 60, burst: true, lifetime: [0.45, 0.95],
    shape: 'cone', shapeRadius: 0.12, coneAngle: 70, speed: [3, 8], gravity: 11, drag: 0.1,
    size: { start: [0.14, 0.38], end: 0.05 },
    color: { start: '#e01414', end: '#4a0202' }, alpha: { start: 1, end: 0 },
  }),
  goldPickup: normalizePreset({
    name: 'Recogida de oro', texture: 'glow', blending: 'additive',
    count: 44, burst: true, lifetime: [0.5, 1.1],
    shape: 'ring', shapeRadius: 0.35, speed: [1.2, 3], gravity: -3.5, drag: 0.4,
    size: { start: [0.25, 0.55], end: 0.0 },
    color: { start: '#fff6c0', end: '#e0a51e' }, alpha: { start: 1, end: 0 }, spin: 70,
  }),
  levelUp: normalizePreset({
    name: 'Subida de nivel', texture: 'star', blending: 'additive',
    count: 96, burst: true, lifetime: [0.8, 1.6],
    shape: 'ring', shapeRadius: 0.5, speed: [2, 4.5], gravity: -3, drag: 0.3,
    size: { start: [0.5, 1.1], end: 0.0 },
    color: { start: '#fffbe6', end: '#f5c542' }, alpha: { start: 1, end: 0 }, spin: 150,
  }),
  legendaryBeam: normalizePreset({
    name: 'Haz legendario', texture: 'glow', blending: 'additive',
    count: 80, burst: false, duration: 1.6, rate: 120, lifetime: [0.6, 1.3],
    shape: 'cone', shapeRadius: 0.12, coneAngle: 12, speed: [5, 10], gravity: -3, drag: 0.2,
    size: { start: [0.4, 0.8], end: 0.0 },
    color: { start: '#fffbe6', end: '#ff8a1e' }, alpha: { start: 1, end: 0 }, spin: 30,
  }),

  // --- NUEVOS presets reutilizables (capas genéricas de espectáculo) ---

  // Onda de choque plana: anillo expansivo en el suelo (usar al impactar fuerte).
  shockwave: normalizePreset({
    name: 'Onda de choque', texture: 'disc', blending: 'additive',
    count: 1, burst: true, lifetime: [0.32, 0.42],
    shape: 'point', shapeRadius: 0.01, speed: [0, 0], gravity: 0, drag: 0,
    size: { start: [0.4, 0.5], end: 6.5 },
    color: { start: '#ffffff', end: '#ffb24d' }, alpha: { start: 0.9, end: 0 },
  }),
  // Destello de núcleo: un flash blanco grande y muy corto (golpe seco de luz).
  coreFlash: normalizePreset({
    name: 'Destello de núcleo', texture: 'glow', blending: 'additive',
    count: 1, burst: true, lifetime: [0.12, 0.18],
    shape: 'point', shapeRadius: 0.01, speed: [0, 0], gravity: 0, drag: 0,
    size: { start: [2.2, 2.8], end: 0.0 },
    color: { start: '#ffffff', end: '#ffe9b0' }, alpha: { start: 1, end: 0 },
  }),
  // Destello de crítico: estrella dorada + chispas, para golpes críticos.
  critFlash: normalizePreset({
    name: 'Crítico', texture: 'star', blending: 'additive',
    count: 28, burst: true, lifetime: [0.25, 0.55],
    shape: 'sphere', shapeRadius: 0.18, speed: [5, 11], gravity: 1, drag: 0.7,
    size: { start: [0.5, 1.1], end: 0.0 },
    color: { start: '#ffffff', end: '#ffae00' }, alpha: { start: 1, end: 0 }, spin: 200,
  }),
  // Brasas ascendentes genéricas (capa de ambiente para fuego/legendario).
  embersRise: normalizePreset({
    name: 'Brasas ascendentes', texture: 'spark', blending: 'additive',
    count: 30, burst: true, lifetime: [0.7, 1.6],
    shape: 'disc', shapeRadius: 0.5, speed: [0.6, 2], gravity: -2.2, drag: 0.4,
    size: { start: [0.1, 0.28], end: 0.0 },
    color: { start: '#ffd27a', end: '#ff3a0c' }, alpha: { start: 1, end: 0 },
  }),
};

// ---------------------------------------------------------------------------
// ParticleSystem (pool)
// ---------------------------------------------------------------------------

export class ParticleSystem {
  // scene: THREE.Scene (o cualquier Object3D contenedor)
  // opts.poolSize: nº máximo de partículas vivas simultáneas (default 2000)
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.poolSize = opts.poolSize || 8000;
    const N = this.poolSize;

    // Arrays de simulación (CPU).
    this.px = new Float32Array(N);
    this.py = new Float32Array(N);
    this.pz = new Float32Array(N);
    this.vx = new Float32Array(N);
    this.vy = new Float32Array(N);
    this.vz = new Float32Array(N);
    this.age = new Float32Array(N);
    this.life = new Float32Array(N);     // vida total; 0 = libre
    this.drag = new Float32Array(N);
    this.grav = new Float32Array(N);
    this.sizeS = new Float32Array(N);
    this.sizeE = new Float32Array(N);
    this.alphaS = new Float32Array(N);
    this.alphaE = new Float32Array(N);
    this.crS = new Float32Array(N); this.cgS = new Float32Array(N); this.cbS = new Float32Array(N);
    this.crE = new Float32Array(N); this.cgE = new Float32Array(N); this.cbE = new Float32Array(N);
    this.texIdx = new Uint8Array(N);     // qué grupo (por textura+blending) lo dibuja
    this.alive = 0;
    this.cursor = 0;

    // Emisores continuos activos.
    this._emitters = [];

    // Un THREE.Points por combinación textura+blending (5 tex x 2 blend = 10).
    // Comparten los mismos arrays de buffer; cada draw filtra por texIdx.
    this._groups = [];
    let gi = 0;
    for (const kind of TEX_KINDS) {
      for (const blend of ['additive', 'normal']) {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3).setUsage(THREE.DynamicDrawUsage));
        geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(N * 3), 3).setUsage(THREE.DynamicDrawUsage));
        geo.setAttribute('psize', new THREE.BufferAttribute(new Float32Array(N), 1).setUsage(THREE.DynamicDrawUsage));
        geo.setAttribute('palpha', new THREE.BufferAttribute(new Float32Array(N), 1).setUsage(THREE.DynamicDrawUsage));
        geo.setDrawRange(0, 0);
        const mat = makePointsMaterial(makeParticleTexture(kind), blend === 'additive');
        const pts = new THREE.Points(geo, mat);
        pts.frustumCulled = false;
        scene.add(pts);
        this._groups.push({ kind, blend, geo, mat, pts, key: `${kind}:${blend}` });
        gi++;
      }
    }
    this._groupIndex = (kind, blend) => TEX_KINDS.indexOf(kind) * 2 + (blend === 'additive' ? 0 : 1);
  }

  // Lanza un preset en una posición (THREE.Vector3 o {x,y,z} o [x,y,z]).
  emit(preset, position) {
    const p = normalizePreset(preset);
    const pos = toVec(position);
    if (p.burst) {
      this._spawnBatch(p, pos, p.count);
    } else {
      this._emitters.push({ p, pos, t: 0, acc: 0 });
    }
  }

  _spawnBatch(p, pos, n) {
    for (let i = 0; i < n; i++) this._spawnOne(p, pos);
  }

  _spawnOne(p, pos) {
    const idx = this._acquire();
    if (idx < 0) return;

    // posición de emisión según la forma
    let ox = 0, oy = 0, oz = 0;       // offset
    let dx = 0, dy = 1, dz = 0;        // dirección base
    const R = p.shapeRadius;
    switch (p.shape) {
      case 'point':
        dx = _rand(-1, 1); dy = _rand(-1, 1); dz = _rand(-1, 1);
        break;
      case 'sphere': {
        const u = Math.random(), v = Math.random();
        const th = u * Math.PI * 2, ph = Math.acos(2 * v - 1);
        const r = R * Math.cbrt(Math.random());
        ox = r * Math.sin(ph) * Math.cos(th);
        oy = r * Math.cos(ph);
        oz = r * Math.sin(ph) * Math.sin(th);
        dx = ox; dy = oy; dz = oz;
        break;
      }
      case 'cone': {
        const half = (p.coneAngle * Math.PI) / 180 / 2;
        const a = _rand(0, Math.PI * 2);
        const r = R * Math.sqrt(Math.random());
        ox = Math.cos(a) * r; oz = Math.sin(a) * r;
        const tilt = _rand(0, half);
        dx = Math.cos(a) * Math.sin(tilt);
        dz = Math.sin(a) * Math.sin(tilt);
        dy = Math.cos(tilt);
        break;
      }
      case 'ring': {
        const a = _rand(0, Math.PI * 2);
        ox = Math.cos(a) * R; oz = Math.sin(a) * R;
        dx = Math.cos(a); dy = _rand(0.2, 0.6); dz = Math.sin(a);
        break;
      }
      case 'disc': {
        const a = _rand(0, Math.PI * 2);
        const r = R * Math.sqrt(Math.random());
        ox = Math.cos(a) * r; oz = Math.sin(a) * r;
        dx = Math.cos(a) * 0.3; dy = _rand(0.4, 1); dz = Math.sin(a) * 0.3;
        break;
      }
    }
    // normaliza dir
    const dl = Math.hypot(dx, dy, dz) || 1;
    dx /= dl; dy /= dl; dz /= dl;

    const spd = _rand(p.speed[0], p.speed[1]);
    this.px[idx] = pos.x + ox;
    this.py[idx] = pos.y + oy;
    this.pz[idx] = pos.z + oz;
    this.vx[idx] = dx * spd;
    this.vy[idx] = dy * spd;
    this.vz[idx] = dz * spd;
    this.age[idx] = 0;
    this.life[idx] = _rand(p.lifetime[0], p.lifetime[1]);
    this.drag[idx] = p.drag;
    this.grav[idx] = p.gravity;
    this.sizeS[idx] = _rand(p.size.start[0], p.size.start[1]);
    this.sizeE[idx] = p.size.end;
    this.alphaS[idx] = p.alpha.start;
    this.alphaE[idx] = p.alpha.end;
    const cs = hexToRgb(p.color.start), ce = hexToRgb(p.color.end);
    this.crS[idx] = cs.r; this.cgS[idx] = cs.g; this.cbS[idx] = cs.b;
    this.crE[idx] = ce.r; this.cgE[idx] = ce.g; this.cbE[idx] = ce.b;
    this.texIdx[idx] = this._groupIndex(p.texture, p.blending);
  }

  _acquire() {
    const N = this.poolSize;
    for (let k = 0; k < N; k++) {
      const i = (this.cursor + k) % N;
      if (this.life[i] <= 0) {
        this.cursor = (i + 1) % N;
        this.alive++;
        return i;
      }
    }
    return -1; // pool lleno
  }

  // Avanza la simulación y reconstruye los buffers de dibujo.
  update(dt) {
    if (!(dt > 0)) dt = 0;

    // emisores continuos
    for (let e = this._emitters.length - 1; e >= 0; e--) {
      const em = this._emitters[e];
      em.t += dt;
      em.acc += em.p.rate * dt;
      let toSpawn = Math.floor(em.acc);
      if (toSpawn > 0) {
        em.acc -= toSpawn;
        // no superar 'count' por tanda
        while (toSpawn-- > 0) this._spawnOne(em.p, em.pos);
      }
      if (em.p.duration > 0 && em.t >= em.p.duration) this._emitters.splice(e, 1);
    }

    const N = this.poolSize;
    // contadores por grupo para empaquetar buffers
    const G = this._groups.length;
    const counts = new Array(G).fill(0);
    // buffers destino
    const bufs = this._groups.map((g) => ({
      pos: g.geo.attributes.position.array,
      col: g.geo.attributes.color.array,
      sz: g.geo.attributes.psize.array,
      al: g.geo.attributes.palpha.array,
    }));

    let alive = 0;
    for (let i = 0; i < N; i++) {
      if (this.life[i] <= 0) continue;
      this.age[i] += dt;
      if (this.age[i] >= this.life[i]) {
        this.life[i] = 0;
        continue;
      }
      // integración
      this.vy[i] -= this.grav[i] * dt;
      const dmp = Math.max(0, 1 - this.drag[i] * dt);
      this.vx[i] *= dmp; this.vy[i] *= dmp; this.vz[i] *= dmp;
      this.px[i] += this.vx[i] * dt;
      this.py[i] += this.vy[i] * dt;
      this.pz[i] += this.vz[i] * dt;

      const t = _clamp01(this.age[i] / this.life[i]);
      const sz = _lerp(this.sizeS[i], this.sizeE[i], t);
      const al = _lerp(this.alphaS[i], this.alphaE[i], t);
      const r = _lerp(this.crS[i], this.crE[i], t);
      const g = _lerp(this.cgS[i], this.cgE[i], t);
      const b = _lerp(this.cbS[i], this.cbE[i], t);

      const gi = this.texIdx[i];
      const buf = bufs[gi];
      const o = counts[gi];
      buf.pos[o * 3] = this.px[i];
      buf.pos[o * 3 + 1] = this.py[i];
      buf.pos[o * 3 + 2] = this.pz[i];
      buf.col[o * 3] = r; buf.col[o * 3 + 1] = g; buf.col[o * 3 + 2] = b;
      buf.sz[o] = sz;
      buf.al[o] = al;
      counts[gi]++;
      alive++;
    }
    this.alive = alive;

    for (let gi = 0; gi < G; gi++) {
      const g = this._groups[gi];
      const c = counts[gi];
      g.geo.setDrawRange(0, c);
      g.geo.attributes.position.needsUpdate = true;
      g.geo.attributes.color.needsUpdate = true;
      g.geo.attributes.psize.needsUpdate = true;
      g.geo.attributes.palpha.needsUpdate = true;
    }
  }

  // Nº de partículas vivas (para HUD / debug).
  get aliveCount() { return this.alive; }

  // Vacía todo lo vivo sin liberar la GPU.
  clear() {
    this.life.fill(0);
    this._emitters.length = 0;
    this.alive = 0;
  }

  dispose() {
    for (const g of this._groups) {
      this.scene.remove(g.pts);
      g.geo.dispose();
      g.mat.dispose();
    }
    this._groups.length = 0;
    this._emitters.length = 0;
  }
}

// Material de puntos con tamaño en mundo + atenuación por distancia + alpha por
// partícula. Usa un ShaderMaterial pequeño para soportar tamaño y alpha por
// vértice (PointsMaterial no permite alpha por vértice fácilmente).
function makePointsMaterial(texture, additive) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTex: { value: texture },
      uScale: { value: 720.0 }, // factor de tamaño en pantalla
    },
    vertexShader: /* glsl */`
      attribute float psize;
      attribute float palpha;
      attribute vec3 color;
      varying float vAlpha;
      varying vec3 vCol;
      uniform float uScale;
      void main() {
        vAlpha = palpha;
        vCol = color;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = psize * uScale / max(0.001, -mv.z);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */`
      uniform sampler2D uTex;
      varying float vAlpha;
      varying vec3 vCol;
      void main() {
        vec4 tex = texture2D(uTex, gl_PointCoord);
        gl_FragColor = vec4(vCol * tex.rgb, tex.a * vAlpha);
        if (gl_FragColor.a < 0.01) discard;
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
}

function toVec(p) {
  if (!p) return new THREE.Vector3();
  if (p.isVector3) return p;
  if (Array.isArray(p)) return new THREE.Vector3(p[0] || 0, p[1] || 0, p[2] || 0);
  return new THREE.Vector3(p.x || 0, p.y || 0, p.z || 0);
}
