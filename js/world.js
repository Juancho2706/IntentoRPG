// ============================================================
// Generación del mundo: pueblo y mazmorras procedurales
// ============================================================
import * as THREE from 'three';

function ri(min, max) { return Math.floor(min + Math.random() * (max - min + 1)); }

// ---------------------------------------------------------
// Texturas de suelo generadas por canvas (sin assets)
// ---------------------------------------------------------
// Genera albedo (ruido sutil teñido al color base) + normal map a juego, para
// dar grano y micro-relieve al suelo sin depender de imágenes externas. Cachea
// por color base para no regenerar al recargar el mismo bioma. Tolerante a
// entornos sin DOM (tests): devuelve null y el material cae a color plano.
const _groundTexCache = new Map();

// Construye un campo de ruido fractal (fBm) tileable en una rejilla, devuelto
// como función muestreable n(x,y)∈[0,1]. Varias octavas de value-noise con
// rejillas que envuelven (toroidal) para que la textura se repita sin costuras.
function _makeFbm(octaves = 4, baseGrid = 8) {
  const layers = [];
  for (let o = 0; o < octaves; o++) {
    const g = baseGrid * (1 << o);
    const gv = new Float32Array((g + 1) * (g + 1));
    for (let i = 0; i <= g; i++)
      for (let j = 0; j <= g; j++)
        gv[i * (g + 1) + j] = (i === g || j === g)
          ? gv[(i % g) * (g + 1) + (j % g)]   // envolver bordes (tileable)
          : Math.random();
    layers.push({ g, gv, amp: 1 / (1 << o) });
  }
  const sm = t => t * t * (3 - 2 * t);
  return (u, v) => {
    let sum = 0, norm = 0;
    for (const L of layers) {
      const gx = u * L.g, gy = v * L.g;
      const x0 = gx | 0, y0 = gy | 0, tx = sm(gx - x0), ty = sm(gy - y0);
      const w = L.g + 1;
      const a = L.gv[x0 * w + y0], b = L.gv[(x0 + 1) * w + y0];
      const c2 = L.gv[x0 * w + (y0 + 1)], d2 = L.gv[(x0 + 1) * w + (y0 + 1)];
      const top = a + (b - a) * tx, bot = c2 + (d2 - c2) * tx;
      sum += (top + (bot - top) * ty) * L.amp; norm += L.amp;
    }
    return sum / norm;
  };
}

// Devuelve { map, normalMap, roughnessMap } o null si no hay canvas (tests).
// Albedo = fBm teñido al color base + manchas/vetas + grano; normal por Sobel
// (más nítido); roughness inversa al ruido (zonas pulidas brillan distinto).
export function makeGroundTextures(colorHex, opts = {}) {
  if (typeof document === 'undefined') return null;
  const variation = opts.variation ?? 0.18;
  const key = colorHex + ':' + variation + ':' + (opts.tint ?? '');
  if (_groundTexCache.has(key)) return _groundTexCache.get(key);
  const s = 256;
  const c = new THREE.Color(colorHex);
  const baseRGB = [c.r * 255, c.g * 255, c.b * 255];
  // color de veta/mancha: una variante más oscura y desaturada del base
  const dark = c.clone().offsetHSL(0, -0.08, -0.16);
  const darkRGB = [dark.r * 255, dark.g * 255, dark.b * 255];
  // tinte opcional (motas de musgo/ceniza/escarcha) según bioma
  let tintRGB = null;
  if (opts.tint != null) { const t = new THREE.Color(opts.tint); tintRGB = [t.r * 255, t.g * 255, t.b * 255]; }

  const fbm = _makeFbm(opts.octaves ?? 4, opts.baseGrid ?? 8);
  const blotch = _makeFbm(2, 3);   // manchas grandes de suciedad/musgo
  const grain = _makeFbm(1, 64);   // grano fino de alta frecuencia

  // --- albedo + buffer de altura (para normal y roughness) ---
  const cv = document.createElement('canvas'); cv.width = cv.height = s;
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(s, s);
  const d = img.data;
  const height = new Float32Array(s * s);
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const u = x / s, v = y / s;
      const n = fbm(u, v);                 // estructura principal
      const bl = blotch(u, v);             // manchas
      const gr = grain(u, v);              // grano
      const k = (y * s + x) * 4;
      height[y * s + x] = n * 0.8 + gr * 0.2;
      // mezcla base→oscuro según manchas, modulada por variación de ruido
      let mix = Math.max(0, Math.min(1, (bl - 0.42) * 1.7));
      const f = (n - 0.5) * variation + (gr - 0.5) * variation * 0.45;
      let r = baseRGB[0] * (1 + f) * (1 - mix) + darkRGB[0] * mix;
      let g = baseRGB[1] * (1 + f) * (1 - mix) + darkRGB[1] * mix;
      let b = baseRGB[2] * (1 + f) * (1 - mix) + darkRGB[2] * mix;
      if (tintRGB) {
        // motas de tinte donde el ruido fino pica alto (musgo/escarcha/ceniza)
        const sp = Math.max(0, (gr - 0.7) * 3.0) * (opts.tintAmt ?? 0.5);
        r = r * (1 - sp) + tintRGB[0] * sp;
        g = g * (1 - sp) + tintRGB[1] * sp;
        b = b * (1 - sp) + tintRGB[2] * sp;
      }
      d[k]     = Math.max(0, Math.min(255, r));
      d[k + 1] = Math.max(0, Math.min(255, g));
      d[k + 2] = Math.max(0, Math.min(255, b));
      d[k + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const map = new THREE.CanvasTexture(cv);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = 8;

  // --- normal map desde el buffer de altura (Sobel envolvente) ---
  const ncv = document.createElement('canvas'); ncv.width = ncv.height = s;
  const nctx = ncv.getContext('2d');
  const nimg = nctx.createImageData(s, s);
  const nd = nimg.data;
  const H = (x, y) => height[((y + s) % s) * s + ((x + s) % s)];
  const strength = opts.normalStrength ?? 1.6;
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      // Sobel 3×3 para un relieve más suave y direccional
      const dx = ((H(x - 1, y - 1) + 2 * H(x - 1, y) + H(x - 1, y + 1)) -
                  (H(x + 1, y - 1) + 2 * H(x + 1, y) + H(x + 1, y + 1))) * strength;
      const dy = ((H(x - 1, y - 1) + 2 * H(x, y - 1) + H(x + 1, y - 1)) -
                  (H(x - 1, y + 1) + 2 * H(x, y + 1) + H(x + 1, y + 1))) * strength;
      const nz = 1.0;
      const inv = 1 / Math.hypot(dx, dy, nz);
      const k = (y * s + x) * 4;
      nd[k]     = (dx * inv * 0.5 + 0.5) * 255;
      nd[k + 1] = (dy * inv * 0.5 + 0.5) * 255;
      nd[k + 2] = (nz * inv * 0.5 + 0.5) * 255;
      nd[k + 3] = 255;
    }
  }
  nctx.putImageData(nimg, 0, 0);
  const normalMap = new THREE.CanvasTexture(ncv);
  normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping;
  normalMap.anisotropy = 8;

  // --- roughness map: las hondonadas (musgo/agua) algo más pulidas ---
  const rcv = document.createElement('canvas'); rcv.width = rcv.height = s;
  const rctx = rcv.getContext('2d');
  const rimg = rctx.createImageData(s, s);
  const rd = rimg.data;
  for (let i = 0; i < s * s; i++) {
    const h = height[i];
    // crestas ásperas (cerca de 1) / hondonadas más lisas (0.6)
    const rough = 0.66 + h * 0.34;
    const k = i * 4;
    rd[k] = rd[k + 1] = rd[k + 2] = Math.max(0, Math.min(255, rough * 255));
    rd[k + 3] = 255;
  }
  rctx.putImageData(rimg, 0, 0);
  const roughnessMap = new THREE.CanvasTexture(rcv);
  roughnessMap.wrapS = roughnessMap.wrapT = THREE.RepeatWrapping;

  const out = { map, normalMap, roughnessMap };
  _groundTexCache.set(key, out);
  return out;
}

// Construye los parámetros de un MeshStandardMaterial de suelo con textura/
// normal opcionales. Si no hay texturas (tests), cae a color plano sin incluir
// claves undefined (evita warnings de three por normalScale sin normalMap).
export function groundMatParams(colorHex, tex, normalScale = 0.6) {
  const p = { color: colorHex, roughness: 1, metalness: 0.0 };
  if (tex) {
    p.map = tex.map;
    p.normalMap = tex.normalMap;
    p.normalScale = new THREE.Vector2(normalScale, normalScale);
    if (tex.roughnessMap) p.roughnessMap = tex.roughnessMap;
  }
  return p;
}

// Esparce "decals" simples (discos oscuros: grietas/manchas) sobre el suelo.
// `isOpen(x,z)` opcional filtra a celdas transitables. Pooled en un solo Group.
export function scatterDecals(group, rnd, count, opts = {}) {
  if (typeof document === 'undefined') return; // sin canvas en tests
  const tex = _decalTexture();
  if (!tex) return;
  const geo = new THREE.CircleGeometry(1, 12);
  const minX = opts.minX ?? -10, maxX = opts.maxX ?? 10;
  const minZ = opts.minZ ?? -10, maxZ = opts.maxZ ?? 10;
  for (let i = 0; i < count; i++) {
    const x = minX + rnd() * (maxX - minX);
    const z = minZ + rnd() * (maxZ - minZ);
    if (opts.isOpen && !opts.isOpen(x, z)) continue;
    const mat = new THREE.MeshBasicMaterial({
      map: tex, transparent: true, opacity: 0.18 + rnd() * 0.22,
      color: opts.color ?? 0x000000, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -1,
    });
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = rnd() * Math.PI;
    const r = 0.6 + rnd() * 1.4;
    m.scale.set(r, r, 1);
    m.position.set(x, (opts.y ?? 0) + 0.011, z);
    m.renderOrder = 1;
    group.add(m);
  }
}

let _decalTex = null;
function _decalTexture() {
  if (_decalTex) return _decalTex;
  if (typeof document === 'undefined') return null;
  const s = 64;
  const cv = document.createElement('canvas'); cv.width = cv.height = s;
  const ctx = cv.getContext('2d');
  // mancha irregular con borde difuso (grieta/suciedad)
  const g = ctx.createRadialGradient(s / 2, s / 2, 2, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(0,0,0,0.9)');
  g.addColorStop(0.6, 'rgba(0,0,0,0.5)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
  // unas vetas que sugieren grietas
  ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 1.2;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    let x = s / 2, y = s / 2;
    ctx.moveTo(x, y);
    const steps = 4 + (Math.random() * 3 | 0);
    const ang = Math.random() * Math.PI * 2;
    for (let j = 0; j < steps; j++) {
      x += Math.cos(ang + (Math.random() - 0.5)) * 6;
      y += Math.sin(ang + (Math.random() - 0.5)) * 6;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  _decalTex = new THREE.CanvasTexture(cv);
  return _decalTex;
}

// RNG determinista para la mazmorra diaria (misma semilla = mismo trazado)
export function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Biomas de la mazmorra según la profundidad
export const BIOMES = [
  { name: 'Cripta', minFloor: 1, floor: 0x3c3a44, wall: 0x2a2733, fog: 0x070609,
    ambient: 0x556677, torch: 0xff9944 },
  { name: 'Cavernas de Hielo', minFloor: 6, floor: 0x39495e, wall: 0x263750, fog: 0x060c14,
    ambient: 0x6688bb, torch: 0x66bbff,
    accent: { color: 0x9fe8ff, emissive: 0x2288bb, chance: 0.045 },
    crystal: { color: 0xbfeaff, emissive: 0x44aadd } },
  { name: 'Infierno', minFloor: 11, floor: 0x462a26, wall: 0x2f1816, fog: 0x130404,
    ambient: 0x885544, torch: 0xff5522,
    accent: { color: 0xff6a22, emissive: 0xbb3300, chance: 0.05 },
    crystal: { color: 0xff8844, emissive: 0xcc3300 } },
  { name: 'Abismo Estelar', minFloor: 16, floor: 0x2a2440, wall: 0x1a1530, fog: 0x070512,
    ambient: 0x7766aa, torch: 0xbb66ff,
    accent: { color: 0xaa88ff, emissive: 0x6633cc, chance: 0.05 },
    crystal: { color: 0xcc99ff, emissive: 0x7744cc } },
];

// Cuadrícula de colisión. cells[z][x] = 1 transitable, 0 muro
export class Grid {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.ox = -w / 2; this.oz = -h / 2;
    this.cells = Array.from({ length: h }, () => new Array(w).fill(0));
  }
  cellAt(wx, wz) {
    const x = Math.floor(wx - this.ox), z = Math.floor(wz - this.oz);
    if (x < 0 || z < 0 || x >= this.w || z >= this.h) return 0;
    return this.cells[z][x];
  }
  walkable(wx, wz, r = 0.32) {
    return this.cellAt(wx - r, wz - r) && this.cellAt(wx + r, wz - r) &&
           this.cellAt(wx - r, wz + r) && this.cellAt(wx + r, wz + r);
  }
  // línea de visión: muestrea celdas entre dos puntos (los muros bloquean)
  lineOfSight(x0, z0, x1, z1) {
    const dx = x1 - x0, dz = z1 - z0;
    const steps = Math.ceil(Math.hypot(dx, dz) / 0.4);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      if (!this.cellAt(x0 + dx * t, z0 + dz * t)) return false;
    }
    return true;
  }
  center(x, z) { return new THREE.Vector3(this.ox + x + 0.5, 0, this.oz + z + 0.5); }
}

export function instancedBoxes(positions, size, color, opts = {}) {
  const geo = new THREE.BoxGeometry(size[0], size[1], size[2]);
  const matParams = {
    color, roughness: opts.roughness ?? 0.95, metalness: 0.02,
    emissive: opts.emissive ?? 0x000000, emissiveIntensity: opts.emissiveIntensity ?? 1,
  };
  // texturas opcionales: solo se incluyen si existen (evita warnings de three
  // por parámetros undefined, p.ej. normalScale sin normalMap)
  if (opts.map) matParams.map = opts.map;
  if (opts.normalMap) {
    matParams.normalMap = opts.normalMap;
    matParams.normalScale = new THREE.Vector2(opts.normalScale ?? 0.6, opts.normalScale ?? 0.6);
  }
  const mat = new THREE.MeshStandardMaterial(matParams);
  const mesh = new THREE.InstancedMesh(geo, mat, positions.length);
  const m = new THREE.Matrix4();
  const c = new THREE.Color();
  for (let i = 0; i < positions.length; i++) {
    const p = positions[i];
    m.makeTranslation(p.x, p.y, p.z);
    mesh.setMatrixAt(i, m);
    c.set(color).offsetHSL(0, 0, (Math.random() - 0.5) * (opts.vary ?? 0.06));
    mesh.setColorAt(i, c);
  }
  mesh.castShadow = !!opts.castShadow;
  mesh.receiveShadow = opts.receiveShadow !== false;
  return mesh;
}

export function makePortal(color, label) {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.9, 0.12, 10, 28),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.6, roughness: 0.4 })
  );
  ring.position.y = 1.2;
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(0.78, 24),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.45, side: THREE.DoubleSide })
  );
  disc.position.y = 1.2;
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(1.1, 1.25, 0.18, 20),
    new THREE.MeshStandardMaterial({ color: 0x444450, roughness: 0.9 })
  );
  base.position.y = 0.09;
  g.add(ring, disc, base);
  g.userData.spin = [ring, disc];
  g.userData.label = label;
  return g;
}

// Definiciones de santuario compartidas por mazmorras y zonas
export const SHRINE_DEFS = [
  { kind: 'xp', name: 'Santuario de Experiencia', color: 0xb388ff },
  { kind: 'dmg', name: 'Santuario de Furia', color: 0xff5544 },
  { kind: 'pocion', name: 'Santuario de la Vida', color: 0x55dd66 },
  { kind: 'oro', name: 'Santuario Dorado', color: 0xffd24a },
  { kind: 'fortuna', name: 'Santuario de la Fortuna', color: 0x4ade80 },
  { kind: 'avaricia', name: 'Santuario de la Avaricia', color: 0xffcc33 },
  { kind: 'maldito', name: 'Santuario Susurrante', color: 0x8855aa },
];

// Malla de santuario (pilar + cristal). userData.crystal se apaga al usarlo.
export function makeShrineMesh(color) {
  const shrine = new THREE.Group();
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 1.1, 6),
    new THREE.MeshStandardMaterial({ color: 0x4a4756, roughness: 0.9 }));
  pillar.position.y = 0.55;
  pillar.castShadow = true;
  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.4 }));
  crystal.position.y = 1.35;
  crystal.userData.baseY = 1.35;
  shrine.add(pillar, crystal);
  shrine.userData.crystal = crystal;
  return shrine;
}

export function makeNPC(color, hatColor) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.2, 10), mat);
  body.position.y = 0.6;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0xd9a878, roughness: 0.8 }));
  head.position.y = 1.4;
  body.castShadow = head.castShadow = true;
  g.add(body, head);
  if (hatColor) {
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.5, 10),
      new THREE.MeshStandardMaterial({ color: hatColor, roughness: 0.85 }));
    hat.position.y = 1.75;
    g.add(hat);
  }
  return g;
}

export function makeWaypoint() {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.15, 0.22, 8),
    new THREE.MeshStandardMaterial({ color: 0x55606e, roughness: 0.8 }));
  base.position.y = 0.11;
  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0),
    new THREE.MeshStandardMaterial({ color: 0x44ddff, emissive: 0x22aacc, emissiveIntensity: 1.6 }));
  crystal.position.y = 0.95;
  g.add(base, crystal);
  g.userData.crystal = crystal;
  return g;
}

export function makeTorch(flameColor = 0xffaa33) {
  const g = new THREE.Group();
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 1.4, 6),
    new THREE.MeshStandardMaterial({ color: 0x4a3520, roughness: 1 }));
  stick.position.y = 0.7;
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.4, 8),
    new THREE.MeshBasicMaterial({ color: flameColor }));
  flame.position.y = 1.55;
  g.add(stick, flame);
  g.userData.flame = flame;
  return g;
}

// ---------------------------------------------------------
// PROPS AMBIENTALES PROCEDURALES (sin assets, solo geometría Three)
// ---------------------------------------------------------
// Todos devuelven un Group/Mesh listo para posicionar. Pensados como decoración
// NO colisionable (no tocan el grid). Usan solo primitivas → seguros en tests.
function _shade(hex, f) { return new THREE.Color(hex).offsetHSL(0, 0, f).getHex(); }

// Roca poligonal irregular (dodecaedro deformado) con musgo opcional encima.
export function makeRock(rnd = Math.random, opts = {}) {
  const g = new THREE.Group();
  const baseR = opts.r ?? (0.3 + rnd() * 0.5);
  const col = opts.color ?? 0x6a6660;
  const geo = new THREE.DodecahedronGeometry(baseR, 0);
  // deformar vértices para que no sea un poliedro perfecto
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const j = (rnd() - 0.5) * baseR * 0.35;
    pos.setXYZ(i, pos.getX(i) + j, pos.getY(i) + (rnd() - 0.5) * baseR * 0.2, pos.getZ(i) + (rnd() - 0.5) * baseR * 0.35);
  }
  geo.computeVertexNormals();
  const rock = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: col, roughness: 0.95, flatShading: true }));
  rock.scale.y = 0.7 + rnd() * 0.4;
  rock.position.y = baseR * 0.55;
  rock.rotation.set(rnd() * 0.4, rnd() * Math.PI, rnd() * 0.4);
  rock.castShadow = true; rock.receiveShadow = true;
  g.add(rock);
  if (opts.moss && rnd() < 0.7) {
    const moss = new THREE.Mesh(new THREE.SphereGeometry(baseR * 0.85, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.5),
      new THREE.MeshStandardMaterial({ color: opts.mossColor ?? 0x4a6a32, roughness: 1 }));
    moss.position.y = baseR * 0.9; moss.scale.set(1, 0.5, 1);
    g.add(moss);
  }
  return g;
}

// Racimo de cristales (varios prismas que emergen de una base).
export function makeCrystalCluster(rnd = Math.random, opts = {}) {
  const g = new THREE.Group();
  const col = opts.color ?? 0xbfeaff, em = opts.emissive ?? 0x44aadd;
  const n = opts.count ?? (2 + (rnd() * 3 | 0));
  for (let i = 0; i < n; i++) {
    const h = 0.4 + rnd() * (opts.maxH ?? 0.9);
    const r = 0.06 + rnd() * 0.12;
    const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 5),
      new THREE.MeshStandardMaterial({ color: col, emissive: em, emissiveIntensity: 0.9 + rnd() * 0.6, roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.92 }));
    const a = rnd() * Math.PI * 2, off = rnd() * 0.18;
    m.position.set(Math.cos(a) * off, h * 0.5, Math.sin(a) * off);
    m.rotation.set((rnd() - 0.5) * 0.5, rnd() * Math.PI, (rnd() - 0.5) * 0.5);
    m.castShadow = true;
    g.add(m);
  }
  return g;
}

// Pila de huesos / costillar (esfera achatada + arcos finos).
export function makeBonePile(rnd = Math.random) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xcfc7b0, roughness: 1 });
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 7), mat);
  skull.scale.set(1, 0.9, 1.1); skull.position.y = 0.14; g.add(skull);
  for (let i = 0; i < 3 + (rnd() * 2 | 0); i++) {
    const rib = new THREE.Mesh(new THREE.TorusGeometry(0.12 + rnd() * 0.06, 0.018, 5, 10, Math.PI), mat);
    rib.position.set((rnd() - 0.5) * 0.3, 0.05 + rnd() * 0.04, (rnd() - 0.5) * 0.3);
    rib.rotation.set(Math.PI / 2 + (rnd() - 0.5), rnd() * Math.PI, 0);
    g.add(rib);
  }
  g.rotation.y = rnd() * Math.PI;
  return g;
}

// Raíz/zarcillo retorcido que sale del suelo (cilindros encadenados).
export function makeRoot(rnd = Math.random, opts = {}) {
  const g = new THREE.Group();
  const col = opts.color ?? 0x3a2c1c;
  let x = 0, z = 0, y = 0, ang = rnd() * Math.PI * 2, r = 0.07 + rnd() * 0.05;
  const seg = 3 + (rnd() * 3 | 0);
  for (let i = 0; i < seg; i++) {
    const len = 0.25 + rnd() * 0.25;
    const seg3 = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.7, r, len, 6),
      new THREE.MeshStandardMaterial({ color: col, roughness: 1 }));
    const tilt = 0.5 + rnd() * 0.5;
    seg3.position.set(x, y + len * 0.4, z);
    seg3.rotation.set(Math.cos(ang) * tilt, 0, Math.sin(ang) * tilt);
    seg3.castShadow = true;
    g.add(seg3);
    x += Math.cos(ang) * len * tilt * 0.6; z += Math.sin(ang) * len * tilt * 0.6; y += len * 0.5;
    ang += (rnd() - 0.5) * 1.4; r *= 0.8;
  }
  return g;
}

// Tufo de hierba/maleza: varias palas finas (PlaneGeometry) en abanico.
export function makeGrassTuft(rnd = Math.random, opts = {}) {
  const g = new THREE.Group();
  const col = opts.color ?? 0x4e7a36;
  const mat = new THREE.MeshStandardMaterial({ color: col, roughness: 1, side: THREE.DoubleSide });
  const n = 3 + (rnd() * 3 | 0);
  for (let i = 0; i < n; i++) {
    const h = 0.3 + rnd() * 0.35;
    const blade = new THREE.Mesh(new THREE.PlaneGeometry(0.08, h), mat);
    blade.position.set((rnd() - 0.5) * 0.18, h * 0.5, (rnd() - 0.5) * 0.18);
    blade.rotation.set((rnd() - 0.5) * 0.3, rnd() * Math.PI, (rnd() - 0.5) * 0.4);
    g.add(blade);
  }
  return g;
}

// Seta luminosa (sombrero emisivo + tallo). Para biomas oscuros/abismo.
export function makeMushroom(rnd = Math.random, opts = {}) {
  const g = new THREE.Group();
  const cap = opts.color ?? 0x9b6bff, em = opts.emissive ?? 0x5a2fbf;
  const h = 0.18 + rnd() * 0.22;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, h, 6),
    new THREE.MeshStandardMaterial({ color: 0xd8d0c0, roughness: 1, emissive: 0x222018, emissiveIntensity: 0.3 }));
  stem.position.y = h * 0.5;
  const hat = new THREE.Mesh(new THREE.SphereGeometry(0.1 + rnd() * 0.06, 9, 6, 0, Math.PI * 2, 0, Math.PI * 0.55),
    new THREE.MeshStandardMaterial({ color: cap, emissive: em, emissiveIntensity: 1.1, roughness: 0.5 }));
  hat.position.y = h; hat.scale.y = 0.7;
  g.add(stem, hat);
  return g;
}

// Pilar/columna en ruinas (fuste con cierto deterioro + base/capitel).
export function makeRuinPillar(rnd = Math.random, opts = {}) {
  const g = new THREE.Group();
  const col = opts.color ?? 0x6a6052;
  const mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.92, flatShading: true });
  const hh = 0.8 + rnd() * 1.4;
  const broken = rnd() < 0.5;
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, hh, 8, 1), mat);
  shaft.position.y = hh * 0.5; shaft.castShadow = true; shaft.receiveShadow = true;
  shaft.rotation.y = rnd() * Math.PI;
  g.add(shaft);
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.22, 0.8), mat);
  base.position.y = 0.11; base.castShadow = true; g.add(base);
  if (!broken) {
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.2, 0.72), mat);
    cap.position.y = hh + 0.1; cap.castShadow = true; g.add(cap);
  } else {
    shaft.rotation.z = (rnd() - 0.5) * 0.18; // ligeramente inclinado
    // bloque caído junto a la base
    const chunk = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.4), mat);
    chunk.position.set(0.5 + rnd() * 0.3, 0.15, (rnd() - 0.5) * 0.6);
    chunk.rotation.set(rnd(), rnd(), rnd()); chunk.castShadow = true; g.add(chunk);
  }
  return g;
}

// Estandarte colgante para el campamento (poste + tela emisiva sutil).
export function makeBanner(rnd = Math.random, color = 0x9a2f3a) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 2.2, 6),
    new THREE.MeshStandardMaterial({ color: 0x3a2c1c, roughness: 1 }));
  pole.position.y = 1.1; pole.castShadow = true;
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.0),
    new THREE.MeshStandardMaterial({ color, roughness: 0.85, side: THREE.DoubleSide, emissive: color, emissiveIntensity: 0.06 }));
  cloth.position.set(0.36, 1.45, 0);
  g.add(pole, cloth);
  return g;
}

// Coloca instancias de un factory de prop sobre celdas abiertas (no toca grid).
// `cells` = lista [x,z]; `chance` por celda; `make(rnd)` crea el prop.
function _scatterProp(group, grid, cells, rnd, chance, make, opts = {}) {
  const skip = opts.skip; // (x,z)=>bool para excluir (p.ej. campamento)
  let placed = 0; const cap = opts.cap ?? Infinity;
  for (const [x, z] of cells) {
    if (placed >= cap) break;
    if (rnd() >= chance) continue;
    if (skip && skip(x, z)) continue;
    const c = grid.center(x, z);
    const m = make(rnd);
    m.position.set(c.x + (rnd() - 0.5) * 0.5, opts.y ?? 0, c.z + (rnd() - 0.5) * 0.5);
    m.rotation.y = rnd() * Math.PI * 2;
    const sc = (opts.minScale ?? 0.85) + rnd() * ((opts.maxScale ?? 1.25) - (opts.minScale ?? 0.85));
    m.scale.multiplyScalar(sc);
    group.add(m);
    placed++;
  }
  return placed;
}

// ---------------------------------------------------------
// CAMPAMENTO/PUEBLO contiguo dentro de una zona abierta (seamless hub)
// ---------------------------------------------------------
// Coloca los servicios del pueblo en un "bolsillo" seguro alrededor de una
// celda central de la zona, para que el jugador salga del campamento caminando
// directo al mundo abierto, sin portal. Devuelve { radius } (en celdas).
// Reutiliza makeNPC/makePortal/makeTorch/instancedBoxes. Muta grid/group/interactables.
export function placeTownServices(grid, group, interactables, torchLights, centerCell, opts = {}) {
  const [cx, cz] = centerCell;
  const R = opts.radius || 7;
  const carve = (x, z) => { if (grid.cells[z] && grid.cells[z][x] !== undefined) grid.cells[z][x] = 1; };
  // 1) despeja el bolsillo seguro (transitable) en forma de disco
  for (let dz = -R; dz <= R; dz++)
    for (let dx = -R; dx <= R; dx++)
      if (dx * dx + dz * dz <= R * R) carve(cx + dx, cz + dz);

  // 2) suelo del campamento (parche de tierra) sobre la zona, con textura
  const C = grid.center(cx, cz);
  const campTex = makeGroundTextures(0x6a5740, { variation: 0.26, normalStrength: 1.8, tint: 0x8a7a55, tintAmt: 0.4 });
  if (campTex) { for (const t of [campTex.map, campTex.normalMap, campTex.roughnessMap]) if (t) t.repeat.set(3, 3); }
  const floor = new THREE.Mesh(new THREE.CircleGeometry(R - 0.5, 36),
    new THREE.MeshStandardMaterial(groundMatParams(0x6a5740, campTex, 0.8)));
  floor.rotation.x = -Math.PI / 2; floor.position.set(C.x, 0.02, C.z); floor.receiveShadow = true;
  group.add(floor);
  // anillo empedrado en el borde del parche (lee como camino del campamento)
  const cobble = new THREE.Mesh(new THREE.RingGeometry(R - 1.4, R - 0.5, 40, 1),
    new THREE.MeshStandardMaterial({ color: 0x564a3a, roughness: 1 }));
  cobble.rotation.x = -Math.PI / 2; cobble.position.set(C.x, 0.025, C.z); cobble.receiveShadow = true;
  group.add(cobble);
  scatterDecals(group, Math.random, 14, { minX: C.x - R + 2, maxX: C.x + R - 2, minZ: C.z - R + 2, maxZ: C.z + R - 2, y: 0.03, color: 0x2a1f12 });

  // 3) servicios alrededor del centro (cada uno en su celda, ya transitable)
  const npc = (dx, dz, type, label, col, col2) => {
    const x = cx + dx, z = cz + dz; carve(x, z);
    const pos = grid.center(x, z);
    const m = makeNPC(col, col2); m.position.copy(pos); group.add(m);
    interactables.push({ type, pos: pos.clone(), radius: 2.2, label, labelCls: 'lbl-npc' });
    return pos;
  };
  npc(-4, -3, 'healer', '⛪ Curandero', 0xf0ead8);
  npc(4, -3, 'vendor', '💰 Mercader', 0x8a5d2e, 0x553311);
  npc(5, 1, 'enchanter', '🔮 Encantadora', 0x9a4a8a, 0x55224a);
  npc(-5, 1, 'questgiver', '🎖️ Capitán de la Guardia', 0x4a6a9a, 0x2a3a55);
  npc(0, 5, 'petkeeper', '🐾 Domador de Bestias', 0x3a7d4a, 0x224a2a);

  // alijo
  { const x = cx - 3, z = cz + 4; carve(x, z); const pos = grid.center(x, z);
    const stash = new THREE.Group();
    const sBox = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.7, 0.75), new THREE.MeshStandardMaterial({ color: 0x5a4a7a, roughness: 0.8 }));
    sBox.position.y = 0.35;
    const sLid = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.22, 0.8), new THREE.MeshStandardMaterial({ color: 0xc9a227, metalness: 0.5, roughness: 0.5 }));
    sLid.position.y = 0.78; sBox.castShadow = sLid.castShadow = true; stash.add(sBox, sLid); stash.position.copy(pos);
    group.add(stash);
    interactables.push({ type: 'stash', pos: pos.clone(), radius: 1.8, label: '🗃️ Alijo compartido', labelCls: 'lbl-chest' }); }

  // Estatua del Mundo (Tormento / Códice)
  { const x = cx + 3, z = cz + 4; carve(x, z); const pos = grid.center(x, z);
    const statue = new THREE.Group();
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 0.5, 8), new THREE.MeshStandardMaterial({ color: 0x3a3340, roughness: 0.9 }));
    pedestal.position.y = 0.25;
    const figure = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), new THREE.MeshStandardMaterial({ color: 0x882244, emissive: 0xcc3366, emissiveIntensity: 1.2, roughness: 0.4 }));
    figure.position.y = 1.4; figure.userData.baseY = 1.4; pedestal.castShadow = true;
    statue.add(pedestal, figure); statue.userData.crystal = figure; statue.position.copy(pos);
    group.add(statue);
    interactables.push({ type: 'world_statue', pos: pos.clone(), radius: 2.0, label: '🗿 Estatua del Mundo', labelCls: 'lbl-npc', mesh: statue }); }

  // portal del Desafío Diario
  { const x = cx - 6, z = cz - 2; carve(x, z); const pos = grid.center(x, z);
    const dp = makePortal(0xffcc33, 'Diario'); dp.position.copy(pos); group.add(dp);
    interactables.push({ type: 'portal_daily', pos: pos.clone(), radius: 1.3, label: '🌟 Desafío Diario', labelCls: 'lbl-portal', mesh: dp }); }

  // 4) empalizada perimetral con HUECOS (lee como campamento; no encierra)
  const fence = [];
  const ringR = R - 0.3;
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 16) {
    // deja 4 aberturas (N/S/E/O) para salir caminando al mundo abierto
    const near = Math.min(Math.abs(((a % (Math.PI / 2)) - 0))); // distancia al múltiplo de 90°
    if (near < 0.28) continue;
    fence.push({ x: C.x + Math.cos(a) * ringR, y: 0.6, z: C.z + Math.sin(a) * ringR });
  }
  group.add(instancedBoxes(fence, [0.5, 1.2, 0.5], 0x6b5a3e, { castShadow: true }));

  // 5) fogata central con UNA sola luz real (las antorchas laterales son solo
  // malla: las point lights son caras, mejor 1 que 3 en el campamento)
  { const fire = makeTorch(0xffaa33); fire.position.set(C.x, 0, C.z); group.add(fire);
    const light = new THREE.PointLight(0xffcc88, 16, 13, 1.6); light.position.set(C.x, 1.8, C.z);
    group.add(light); torchLights.push(light); }
  for (const [dx, dz] of [[-5, -5], [5, 5]]) {
    const t = makeTorch(0xffaa33); const p = grid.center(cx + dx, cz + dz); t.position.copy(p); group.add(t);
  }
  // estandartes junto a las antorchas (color del campamento)
  for (const [dx, dz, col] of [[-5, -5, 0x9a2f3a], [5, 5, 0x2f5a9a]]) {
    const b = makeBanner(Math.random, col); const p = grid.center(cx + dx, cz + dz);
    b.position.set(p.x + 0.6, 0, p.z); group.add(b);
  }
  // matojos de hierba y piedrecitas alrededor del parche (decorativo)
  const tuftCol = (opts.grassColor ?? 0x4e6a34);
  for (let i = 0; i < 16; i++) {
    const a = Math.random() * Math.PI * 2, rr = (R - 2) + Math.random() * 2.2;
    const px = C.x + Math.cos(a) * rr, pz = C.z + Math.sin(a) * rr;
    const m = Math.random() < 0.55 ? makeGrassTuft(Math.random, { color: tuftCol }) : makeRock(Math.random, { r: 0.18 + Math.random() * 0.2, moss: true });
    m.position.set(px, 0, pz); m.rotation.y = Math.random() * Math.PI * 2;
    group.add(m);
  }
  return { radius: R };
}

// ---------------------------------------------------------
// PUEBLO
// ---------------------------------------------------------
export function buildTown() {
  const W = 36, H = 36;
  const grid = new Grid(W, H);
  const group = new THREE.Group();
  const interactables = [];

  // todo transitable excepto el borde
  for (let z = 1; z < H - 1; z++)
    for (let x = 1; x < W - 1; x++)
      grid.cells[z][x] = 1;

  // suelo con grano: textura/normal/roughness generadas por canvas (césped del
  // pueblo, con motas de musgo más claro y manchas de tierra)
  const gTex = makeGroundTextures(0x5e7a44, { variation: 0.26, normalStrength: 1.6, tint: 0x7e9a52, tintAmt: 0.5 });
  if (gTex) { for (const t of [gTex.map, gTex.normalMap, gTex.roughnessMap]) if (t) t.repeat.set(W / 5, H / 5); }
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(W, H),
    new THREE.MeshStandardMaterial(groundMatParams(0x5e7a44, gTex, 0.7))
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);
  // manchas/parches de tierra repartidos (coherente con el camino)
  scatterDecals(group, Math.random, 22, { minX: -W / 2 + 2, maxX: W / 2 - 2, minZ: -H / 2 + 2, maxZ: H / 2 - 2, color: 0x3a2c1a });

  // camino central de tierra
  const path = new THREE.Mesh(
    new THREE.PlaneGeometry(4, H - 4),
    new THREE.MeshStandardMaterial({ color: 0x8a7355, roughness: 1 })
  );
  path.rotation.x = -Math.PI / 2;
  path.position.y = 0.01;
  group.add(path);

  // muralla perimetral
  const wallPos = [];
  for (let z = 0; z < H; z++)
    for (let x = 0; x < W; x++)
      if (x === 0 || z === 0 || x === W - 1 || z === H - 1) {
        const c = grid.center(x, z);
        wallPos.push({ x: c.x, y: 1, z: c.z });
      }
  group.add(instancedBoxes(wallPos, [1, 2, 1], 0x6b6258, { castShadow: true }));

  // casas (bloquean colisión)
  const houses = [
    { x: 5, z: 6, w: 5, d: 4 }, { x: 26, z: 5, w: 6, d: 5 },
    { x: 4, z: 24, w: 5, d: 5 }, { x: 27, z: 25, w: 5, d: 4 },
    { x: 25, z: 15, w: 4, d: 4 },
  ];
  for (const h of houses) {
    for (let z = h.z; z < h.z + h.d; z++)
      for (let x = h.x; x < h.x + h.w; x++)
        if (grid.cells[z]) grid.cells[z][x] = 0;
    const cx = grid.ox + h.x + h.w / 2, cz = grid.oz + h.z + h.d / 2;
    const body = new THREE.Mesh(new THREE.BoxGeometry(h.w, 2.2, h.d),
      new THREE.MeshStandardMaterial({ color: 0x9c8468, roughness: 0.95 }));
    body.position.set(cx, 1.1, cz);
    body.castShadow = body.receiveShadow = true;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(h.w, h.d) * 0.75, 1.6, 4),
      new THREE.MeshStandardMaterial({ color: 0x7a3b2a, roughness: 0.95 }));
    roof.position.set(cx, 3.0, cz);
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    group.add(body, roof);
  }

  // árboles decorativos (lejos de NPCs, portales, waypoint y punto de aparición)
  const reserved = [[11, 14], [22, 14], [Math.floor(W / 2), 3], [Math.floor(W / 2), H - 6], [Math.floor(W / 2), 8], [13, 22], [12, 4], [23, 22], [26, 9]];
  for (let i = 0; i < 14; i++) {
    const x = ri(2, W - 3), z = ri(2, H - 3);
    if (!grid.cells[z][x]) continue;
    if (Math.abs(grid.ox + x - 0) < 4) continue; // no en el camino
    if (reserved.some(([rx, rz]) => Math.abs(rx - x) < 3 && Math.abs(rz - z) < 3)) continue;
    grid.cells[z][x] = 0;
    const c = grid.center(x, z);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 1.3, 7),
      new THREE.MeshStandardMaterial({ color: 0x5a4028, roughness: 1 }));
    trunk.position.set(c.x, 0.65, c.z);
    // copa en dos esferas desfasadas (más volumen y silueta orgánica)
    const cr = 0.85 + Math.random() * 0.4;
    const leafA = _shade(0x3f6e2f, (Math.random() - 0.5) * 0.1);
    const crown = new THREE.Mesh(new THREE.SphereGeometry(cr, 10, 8),
      new THREE.MeshStandardMaterial({ color: leafA, roughness: 1, flatShading: true }));
    crown.position.set(c.x, 2.0, c.z);
    const crown2 = new THREE.Mesh(new THREE.SphereGeometry(cr * 0.72, 9, 7),
      new THREE.MeshStandardMaterial({ color: _shade(leafA, 0.06), roughness: 1, flatShading: true }));
    crown2.position.set(c.x + (Math.random() - 0.5) * 0.6, 2.6, c.z + (Math.random() - 0.5) * 0.6);
    trunk.castShadow = crown.castShadow = crown2.castShadow = true;
    group.add(trunk, crown, crown2);
    // matojos de hierba al pie del árbol
    const tuft = makeGrassTuft(Math.random, { color: _shade(0x4e7a36, (Math.random() - 0.5) * 0.08) });
    tuft.position.set(c.x + (Math.random() - 0.5) * 0.7, 0, c.z + (Math.random() - 0.5) * 0.7);
    group.add(tuft);
  }

  // dispersión ambiental: hierba, piedras y alguna ruina sobre suelo transitable
  for (let i = 0; i < 60; i++) {
    const x = ri(2, W - 3), z = ri(2, H - 3);
    if (!grid.cells[z][x]) continue;
    if (Math.abs(grid.ox + x) < 3) continue;            // no en el camino
    if (reserved.some(([rx, rz]) => Math.abs(rx - x) < 2 && Math.abs(rz - z) < 2)) continue;
    const c = grid.center(x, z);
    const roll = Math.random();
    let m;
    if (roll < 0.6) m = makeGrassTuft(Math.random, { color: _shade(0x4e7a36, (Math.random() - 0.5) * 0.1) });
    else if (roll < 0.88) m = makeRock(Math.random, { r: 0.18 + Math.random() * 0.3, moss: true });
    else m = makeRuinPillar(Math.random, { color: 0x76705c });
    m.position.set(c.x + (Math.random() - 0.5) * 0.5, 0, c.z + (Math.random() - 0.5) * 0.5);
    m.rotation.y = Math.random() * Math.PI * 2;
    group.add(m);
  }

  // fuente del curandero
  const healerPos = grid.center(11, 14);
  const fountain = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.4, 0.5, 16),
    new THREE.MeshStandardMaterial({ color: 0x8899aa, roughness: 0.6 }));
  fountain.position.set(healerPos.x, 0.25, healerPos.z - 1.6);
  const water = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.1, 16),
    new THREE.MeshStandardMaterial({ color: 0x3da8d8, emissive: 0x1188bb, emissiveIntensity: 0.4 }));
  water.position.set(healerPos.x, 0.52, healerPos.z - 1.6);
  group.add(fountain, water);

  const healer = makeNPC(0xf0ead8);
  healer.position.copy(healerPos);
  group.add(healer);
  interactables.push({ type: 'healer', pos: healerPos.clone(), radius: 2.2, label: '⛪ Curandero', labelCls: 'lbl-npc' });

  const vendorPos = grid.center(22, 14);
  const vendor = makeNPC(0x8a5d2e, 0x553311);
  vendor.position.copy(vendorPos);
  group.add(vendor);
  // puesto del mercader
  const stall = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 1),
    new THREE.MeshStandardMaterial({ color: 0x6e4f2f, roughness: 1 }));
  stall.position.set(vendorPos.x, 0.45, vendorPos.z - 1.2);
  stall.castShadow = true;
  group.add(stall);
  interactables.push({ type: 'vendor', pos: vendorPos.clone(), radius: 2.4, label: '💰 Mercader', labelCls: 'lbl-npc' });

  // Domador de Bestias: compra y mejora tu compañero de utilidad
  const tamerPos = grid.center(18, 18);
  const tamer = makeNPC(0x3a7d4a, 0x224a2a);
  tamer.position.copy(tamerPos);
  group.add(tamer);
  // pequeña perrera/poste junto al domador
  const kennel = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.7, 0.9),
    new THREE.MeshStandardMaterial({ color: 0x5a4326, roughness: 1 }));
  kennel.position.set(tamerPos.x + 1.3, 0.35, tamerPos.z);
  kennel.castShadow = true;
  group.add(kennel);
  interactables.push({ type: 'petkeeper', pos: tamerPos.clone(), radius: 2.2, label: '🐾 Domador de Bestias', labelCls: 'lbl-npc' });

  // salida del pueblo a la zona abierta (al norte): se cruza caminando
  const gatePos = grid.center(Math.floor(W / 2), 2);
  const gate = makePortal(0x66cc55, 'Cripta');
  gate.position.copy(gatePos);
  group.add(gate);
  interactables.push({ type: 'gate_zone', biome: 'Cripta', auto: true, pos: gatePos.clone(), radius: 1.6, label: '🌿 Salir a las Tierras de la Cripta', labelCls: 'lbl-portal', mesh: gate });

  // antorchas junto a la salida
  for (const dx of [-2, 2]) {
    const t = makeTorch();
    t.position.set(gatePos.x + dx, 0, gatePos.z);
    group.add(t);
  }

  // alijo compartido entre personajes
  const stashPos = grid.center(23, 22);
  const stash = new THREE.Group();
  const sBox = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.7, 0.75),
    new THREE.MeshStandardMaterial({ color: 0x5a4a7a, roughness: 0.8 }));
  sBox.position.y = 0.35;
  const sLid = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.22, 0.8),
    new THREE.MeshStandardMaterial({ color: 0xc9a227, metalness: 0.5, roughness: 0.5 }));
  sLid.position.y = 0.78;
  sBox.castShadow = sLid.castShadow = true;
  stash.add(sBox, sLid);
  stash.position.copy(stashPos);
  group.add(stash);
  interactables.push({ type: 'stash', pos: stashPos.clone(), radius: 1.8, label: '🗃️ Alijo compartido', labelCls: 'lbl-chest' });

  // encantadora: reforja afijos por oro
  const enchPos = grid.center(26, 9);
  const enchanter = makeNPC(0x9a4a8a, 0x55224a);
  enchanter.position.copy(enchPos);
  group.add(enchanter);
  interactables.push({ type: 'enchanter', pos: enchPos.clone(), radius: 2.2, label: '🔮 Encantadora', labelCls: 'lbl-npc' });

  // capitán de la guardia: misiones
  const captPos = grid.center(13, 22);
  const captain = makeNPC(0x4a6a9a, 0x2a3a55);
  captain.position.copy(captPos);
  group.add(captain);
  interactables.push({ type: 'questgiver', pos: captPos.clone(), radius: 2.0, label: '🎖️ Capitán de la Guardia', labelCls: 'lbl-npc' });

  // portal del desafío diario (mismo trazado para todos cada día)
  const dailyPos = grid.center(12, 4);
  const dailyPortal = makePortal(0xffcc33, 'Desafío Diario');
  dailyPortal.position.copy(dailyPos);
  group.add(dailyPortal);
  interactables.push({ type: 'portal_daily', pos: dailyPos.clone(), radius: 1.3, label: '🌟 Desafío Diario', labelCls: 'lbl-portal', mesh: dailyPortal });

  // waypoint del pueblo: viaje rápido a los pisos descubiertos
  const wpPos = grid.center(Math.floor(W / 2), 8);
  const wp = makeWaypoint();
  wp.position.copy(wpPos);
  group.add(wp);
  interactables.push({ type: 'waypoint', pos: wpPos.clone(), radius: 1.2, label: '🗺️ Waypoint', labelCls: 'lbl-portal', mesh: wp });

  // Estatua del Mundo: ajusta la dificultad (Tormento) y abre el Códice de Aspectos
  const statuePos = grid.center(Math.floor(W / 2) - 5, 8);
  const statue = new THREE.Group();
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 0.5, 8),
    new THREE.MeshStandardMaterial({ color: 0x3a3340, roughness: 0.9 }));
  pedestal.position.y = 0.25;
  const figure = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0),
    new THREE.MeshStandardMaterial({ color: 0x882244, emissive: 0xcc3366, emissiveIntensity: 1.2, roughness: 0.4 }));
  figure.position.y = 1.4; figure.userData.baseY = 1.4;
  pedestal.castShadow = true;
  statue.add(pedestal, figure);
  statue.userData.crystal = figure;
  statue.position.copy(statuePos);
  group.add(statue);
  interactables.push({ type: 'world_statue', pos: statuePos.clone(), radius: 2.0, label: '☠️ Estatua del Mundo', labelCls: 'lbl-elite', mesh: statue });

  const spawn = grid.center(Math.floor(W / 2), H - 6);
  return {
    type: 'town', group, grid, spawn, interactables, spawns: [],
    fog: { color: 0x9fb8d0, near: 30, far: 70 },
    ambient: 0x96a8c0, ambientIntensity: 0.9,
    sun: { color: 0xfff2d8, intensity: 2.4 },
    clearColor: 0x9fb8d0,
  };
}

// ---------------------------------------------------------
// MAZMORRA PROCEDURAL
// ---------------------------------------------------------
export function buildDungeon(floor, seed = null) {
  const W = 46, H = 46;
  const grid = new Grid(W, H);
  const group = new THREE.Group();
  const interactables = [];
  const spawns = [];
  const biome = BIOMES.filter(b => floor >= b.minFloor).pop();
  // con semilla, el trazado es idéntico para todos (desafío diario)
  const rnd = seed != null ? mulberry32(seed) : Math.random;
  const ri = (min, max) => Math.floor(min + rnd() * (max - min + 1));

  // generar salas
  const rooms = [];
  const maxRooms = 7 + Math.min(4, Math.floor(floor / 2));
  for (let t = 0; t < 80 && rooms.length < maxRooms; t++) {
    const w = ri(5, 9), d = ri(5, 9);
    const x = ri(2, W - w - 2), z = ri(2, H - d - 2);
    const r = { x, z, w, d, cx: x + Math.floor(w / 2), cz: z + Math.floor(d / 2) };
    if (rooms.some(o => x < o.x + o.w + 1 && x + w + 1 > o.x && z < o.z + o.d + 1 && z + d + 1 > o.z)) continue;
    rooms.push(r);
  }

  const carve = (x, z) => { if (x > 0 && z > 0 && x < W - 1 && z < H - 1) grid.cells[z][x] = 1; };
  for (const r of rooms)
    for (let z = r.z; z < r.z + r.d; z++)
      for (let x = r.x; x < r.x + r.w; x++)
        carve(x, z);

  // pasillos en L entre salas consecutivas (ancho 2)
  for (let i = 1; i < rooms.length; i++) {
    const a = rooms[i - 1], b = rooms[i];
    let x = a.cx, z = a.cz;
    while (x !== b.cx) { carve(x, z); carve(x, z + 1); x += Math.sign(b.cx - x); }
    while (z !== b.cz) { carve(x, z); carve(x + 1, z); z += Math.sign(b.cz - z); }
    carve(x, z);
  }

  // suelo y muros instanciados (algunas losas brillan según el bioma)
  const floorPos = [], wallPos = [], accentPos = [];
  for (let z = 0; z < H; z++)
    for (let x = 0; x < W; x++) {
      if (grid.cells[z][x]) {
        const c = grid.center(x, z);
        if (biome.accent && Math.random() < biome.accent.chance)
          accentPos.push({ x: c.x, y: -0.04, z: c.z });
        else
          floorPos.push({ x: c.x, y: -0.05, z: c.z });
      } else {
        // muro solo si toca suelo (ahorra instancias)
        let near = false;
        for (let dz = -1; dz <= 1 && !near; dz++)
          for (let dx = -1; dx <= 1 && !near; dx++) {
            const nz = z + dz, nx = x + dx;
            if (nz >= 0 && nx >= 0 && nz < H && nx < W && grid.cells[nz][nx]) near = true;
          }
        if (near) {
          const c = grid.center(x, z);
          wallPos.push({ x: c.x, y: 0.6, z: c.z });
        }
      }
    }
  // suelo de mazmorra con grano por bioma (textura/normal canvas; cada losa
  // recibe el mapa con leve relieve para asentar la iluminación de contacto)
  const dTex = makeGroundTextures(biome.floor, { variation: 0.22, normalStrength: 1.9, tint: biome.accent?.color, tintAmt: 0.22 });
  group.add(instancedBoxes(floorPos, [1, 0.1, 1], biome.floor,
    { vary: 0.07, map: dTex?.map || null, normalMap: dTex?.normalMap || null, normalScale: 0.6 }));
  // muros bajos para que los enemigos no queden ocultos tras ellos en la vista isométrica
  group.add(instancedBoxes(wallPos, [1, 1.2, 1], biome.wall, { vary: 0.08, castShadow: false }));
  if (accentPos.length)
    group.add(instancedBoxes(accentPos, [1, 0.12, 1], biome.accent.color,
      { emissive: biome.accent.emissive, emissiveIntensity: 0.7, vary: 0.04 }));

  // decoración por sala: pilares en ruinas, huesos, cristales y props de bioma.
  // todo NO bloquea salvo los pilares grandes (que sí marcan el grid, como antes).
  const isCrypt = biome.name === 'Cripta';
  const isAbyss = biome.name === 'Abismo Estelar';
  for (const r of rooms) {
    if (rnd() < 0.5 && r.w > 6 && r.d > 6) {
      for (const [px, pz] of [[r.x + 1, r.z + 1], [r.x + r.w - 2, r.z + r.d - 2]]) {
        grid.cells[pz][px] = 0;
        const c = grid.center(px, pz);
        const pillar = makeRuinPillar(rnd, { color: 0x4a4756 });
        pillar.position.set(c.x, 0, c.z);
        group.add(pillar);
      }
    }
    // pila de huesos detallada
    if (rnd() < 0.6) {
      const c = grid.center(ri(r.x + 1, r.x + r.w - 2), ri(r.z + 1, r.z + r.d - 2));
      const bones = makeBonePile(rnd);
      bones.position.set(c.x, 0, c.z);
      group.add(bones);
    }
    // racimo de cristales/rocas según el bioma
    if (biome.crystal && rnd() < 0.55) {
      const c = grid.center(ri(r.x + 1, r.x + r.w - 2), ri(r.z + 1, r.z + r.d - 2));
      const cl = makeCrystalCluster(rnd, { color: biome.crystal.color, emissive: biome.crystal.emissive, count: 2 + (rnd() * 3 | 0) });
      cl.position.set(c.x, 0, c.z);
      group.add(cl);
    }
    // props ambientales pequeños extra: raíces (cripta), setas (abismo), rocas
    const extra = 1 + (rnd() * 2 | 0);
    for (let e = 0; e < extra; e++) {
      if (rnd() < 0.45) continue;
      const c = grid.center(ri(r.x + 1, r.x + r.w - 2), ri(r.z + 1, r.z + r.d - 2));
      let m;
      if (isCrypt && rnd() < 0.5) m = makeRoot(rnd);
      else if (isAbyss && rnd() < 0.6) m = makeMushroom(rnd, { color: biome.crystal?.color ?? 0x9b6bff, emissive: biome.crystal?.emissive ?? 0x5a2fbf });
      else m = makeRock(rnd, { r: 0.2 + rnd() * 0.3, color: biome.wall, moss: isCrypt, mossColor: 0x44663a });
      m.position.set(c.x, 0, c.z); m.rotation.y = rnd() * Math.PI * 2;
      group.add(m);
    }
  }

  // antorchas (pocas luces reales por rendimiento)
  const torchLights = [];
  for (let i = 0; i < rooms.length; i++) {
    const r = rooms[i];
    const c = grid.center(r.cx, r.z + 1);
    const t = makeTorch(biome.torch);
    t.position.set(c.x, 0, c.z - 0.2);
    group.add(t);
    if (i < 4) {
      const light = new THREE.PointLight(biome.torch, 14, 9, 1.6);
      light.position.set(c.x, 1.8, c.z);
      group.add(light);
      torchLights.push(light);
    }
  }

  // portal de entrada (vuelta al pueblo) en la primera sala
  const entry = grid.center(rooms[0].cx, rooms[0].cz);
  const townPortal = makePortal(0x3399ff, 'Pueblo');
  townPortal.position.copy(entry);
  group.add(townPortal);
  interactables.push({ type: 'portal_town', pos: entry.clone(), radius: 1.3, label: '🌀 Volver al Pueblo', labelCls: 'lbl-portal', mesh: townPortal });

  // altar de pactos (opcional) junto a la entrada
  const altarCell = grid.cells[rooms[0].cz]?.[rooms[0].cx + 2] ? [rooms[0].cx + 2, rooms[0].cz] : [rooms[0].cx, rooms[0].cz + 2];
  const altarPos = grid.center(altarCell[0], altarCell[1]);
  const altar = new THREE.Group();
  const slab = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9),
    new THREE.MeshStandardMaterial({ color: 0x3a2030, roughness: 0.8 }));
  slab.position.y = 0.45;
  const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.26, 0),
    new THREE.MeshStandardMaterial({ color: 0xcc2244, emissive: 0xaa1133, emissiveIntensity: 1.4 }));
  orb.position.y = 1.25; orb.userData.baseY = 1.25;
  slab.castShadow = true;
  altar.add(slab, orb);
  altar.userData.crystal = orb;
  altar.position.copy(altarPos);
  group.add(altar);
  interactables.push({ type: 'altar', pos: altarPos.clone(), radius: 1.4, label: '🩸 Altar de Pactos', labelCls: 'lbl-elite', mesh: altar });

  // waypoint cada 5 pisos, cerca de la entrada (lejos del punto de aparición)
  if (floor % 5 === 0) {
    const r0 = rooms[0];
    for (const [wx, wz] of [[r0.cx - 2, r0.cz], [r0.cx + 2, r0.cz], [r0.cx, r0.cz - 2]]) {
      if (wz < 0 || wx < 0 || wz >= H || wx >= W || !grid.cells[wz][wx]) continue;
      const pos = grid.center(wx, wz);
      const wp = makeWaypoint();
      wp.position.copy(pos);
      group.add(wp);
      interactables.push({ type: 'waypoint', floor, pos: pos.clone(), radius: 1.2, label: `🗺️ Waypoint · Piso ${floor}`, labelCls: 'lbl-portal', mesh: wp });
      break;
    }
  }

  // portal de salida (siguiente piso) en la última sala
  const last = rooms[rooms.length - 1];
  const exit = grid.center(last.cx, last.cz);
  const nextPortal = makePortal(0xff3355, `Piso ${floor + 1}`);
  nextPortal.position.copy(exit);
  group.add(nextPortal);
  interactables.push({ type: 'portal_next', pos: exit.clone(), radius: 1.3, label: `🌀 Descender al Piso ${floor + 1}`, labelCls: 'lbl-portal', mesh: nextPortal });

  // celda transitable aleatoria dentro de una sala (evita pilares)
  const freeCell = (r) => {
    for (let t = 0; t < 12; t++) {
      const x = ri(r.x + 1, r.x + r.w - 2), z = ri(r.z + 1, r.z + r.d - 2);
      if (grid.cells[z][x]) return grid.center(x, z);
    }
    return null;
  };

  // santuarios: bendiciones de un solo uso (alguno está maldito...)
  const SHRINES = SHRINE_DEFS;
  let shrineCount = 0;

  // cofre reutilizable (mimicChance 0 = cofre seguro)
  const placeChest = (r, mimicChance = 0.18) => {
    const pos = freeCell(r);
    if (!pos) return;
    const chest = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.55),
      new THREE.MeshStandardMaterial({ color: 0x7a5a2a, roughness: 0.85 }));
    box.position.y = 0.25;
    const lid = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.18, 0.6),
      new THREE.MeshStandardMaterial({ color: 0xc9a227, metalness: 0.5, roughness: 0.5 }));
    lid.position.y = 0.56;
    box.castShadow = lid.castShadow = true;
    chest.add(box, lid);
    chest.position.copy(pos);
    group.add(chest);
    interactables.push({ type: 'chest', pos: pos.clone(), radius: 1.2, label: '📦 Cofre', labelCls: 'lbl-chest', mesh: chest, opened: false, mimic: rnd() < mimicChance });
  };

  // enemigos por sala con curva de densidad: respiros, picos y salas con guion
  const triggers = [];
  let ambushPlaced = false, treasurePlaced = false;
  for (let i = 1; i < rooms.length; i++) {
    const r = rooms[i];
    const isLast = i === rooms.length - 1;

    // papel de la sala
    let role = 'normal';
    if (!isLast) {
      const roll = rnd();
      if (!ambushPlaced && roll < 0.16 && r.w >= 6 && r.d >= 6) { role = 'ambush'; ambushPlaced = true; }
      else if (!treasurePlaced && roll < 0.28) { role = 'treasure'; treasurePlaced = true; }
      else if (roll < 0.5) role = 'calm';
      else if (roll < 0.78) role = 'normal';
      else role = 'pack';
    }

    if (role === 'calm') {
      // respiro: poca resistencia
      const n = 1 + ri(0, 1);
      for (let j = 0; j < n; j++) {
        const pos = freeCell(r);
        if (pos && pos.distanceTo(exit) >= 2.5) spawns.push({ kind: 'enemy', pos });
      }
    } else if (role === 'normal' || isLast) {
      const n = 2 + Math.floor(floor / 3) + ri(0, 2);
      for (let j = 0; j < n; j++) {
        const pos = freeCell(r);
        if (pos && pos.distanceTo(exit) >= 2.5) spawns.push({ kind: 'enemy', pos });
      }
    } else if (role === 'pack') {
      // manada: líder campeón/élite con esbirros que heredan su rasgo
      const positions = [];
      const count = 4 + ri(0, 1);
      for (let j = 0; j < count; j++) {
        const pos = freeCell(r);
        if (pos) positions.push(pos);
      }
      if (positions.length >= 3) spawns.push({ kind: 'pack', positions });
      else for (const pos of positions) spawns.push({ kind: 'enemy', pos });
    } else if (role === 'treasure') {
      // tesoro custodiado: élite garantizado y cofres extra
      const gp = freeCell(r);
      if (gp) spawns.push({ kind: 'elite', pos: gp });
      placeChest(r);
      placeChest(r);
    } else if (role === 'ambush') {
      // sala-trampa: parece vacía, con un cofre jugoso al centro
      const w1 = [], w2 = [];
      for (let j = 0; j < 4; j++) { const pos = freeCell(r); if (pos) w1.push(pos); }
      for (let j = 0; j < 3; j++) { const pos = freeCell(r); if (pos) w2.push(pos); }
      triggers.push({
        type: 'ambush', pos: grid.center(r.cx, r.cz),
        radius: Math.max(2.5, Math.min(r.w, r.d) / 2),
        waves: [w1, w2], triggered: false,
      });
      placeChest(r, 0); // la trampa es la sala, no el cofre
    }

    if (isLast) {
      const bp = freeCell(last) || exit.clone();
      spawns.push({ kind: 'boss', pos: bp });
    }
    // santuarios (máximo 2 por piso)
    if (shrineCount < 2 && rnd() < 0.22) {
      const sPos = freeCell(r);
      if (sPos) {
        shrineCount++;
        const def = SHRINES[ri(0, SHRINES.length - 1)];
        const shrine = makeShrineMesh(def.color);
        shrine.position.copy(sPos);
        group.add(shrine);
        interactables.push({ type: 'shrine', shrine: def.kind, pos: sPos.clone(), radius: 1.5, label: `✨ ${def.name}`, labelCls: 'lbl-portal', mesh: shrine, used: false });
      }
    }
    // cofres sueltos (las salas con guion ya colocan los suyos)
    if (role !== 'ambush' && role !== 'treasure' && rnd() < 0.35) placeChest(r);
  }

  return {
    type: 'dungeon', floor, biome: biome.name, group, grid,
    spawn: grid.center(rooms[0].cx, rooms[0].cz + 2),
    interactables, spawns, triggers, torchLights, rooms,
    fog: { color: biome.fog, near: 14, far: 30 },
    ambient: biome.ambient, ambientIntensity: 0.32,
    sun: { color: 0x8899bb, intensity: 0.5 },
    clearColor: biome.fog,
  };
}

// ---------------------------------------------------------
// REFUGIO DEL ABISMO: segundo pueblo (se desbloquea en el piso 16)
// ---------------------------------------------------------
export function buildRefuge() {
  const W = 26, H = 26;
  const grid = new Grid(W, H);
  const group = new THREE.Group();
  const interactables = [];

  for (let z = 1; z < H - 1; z++)
    for (let x = 1; x < W - 1; x++)
      grid.cells[z][x] = 1;

  const rTex = makeGroundTextures(0x2e2848, { variation: 0.24, normalStrength: 1.8, tint: 0x6a4fb0, tintAmt: 0.3 });
  if (rTex) { for (const t of [rTex.map, rTex.normalMap, rTex.roughnessMap]) if (t) t.repeat.set(W / 5, H / 5); }
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(W, H),
    new THREE.MeshStandardMaterial(groundMatParams(0x2e2848, rTex, 0.7))
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);
  scatterDecals(group, Math.random, 16, { minX: -W / 2 + 2, maxX: W / 2 - 2, minZ: -H / 2 + 2, maxZ: H / 2 - 2, color: 0x120a22 });

  // muralla
  const wallPos = [];
  for (let z = 0; z < H; z++)
    for (let x = 0; x < W; x++)
      if (x === 0 || z === 0 || x === W - 1 || z === H - 1) {
        const c = grid.center(x, z);
        wallPos.push({ x: c.x, y: 1, z: c.z });
      }
  group.add(instancedBoxes(wallPos, [1, 2, 1], 0x3a3055, { castShadow: true }));

  // cristales del vacío decorativos (racimos) + setas luminosas y rocas
  for (let i = 0; i < 10; i++) {
    const x = ri(3, W - 4), z = ri(3, H - 4);
    if (!grid.cells[z][x] || (Math.abs(x - W / 2) < 4 && Math.abs(z - H / 2) < 6)) continue;
    grid.cells[z][x] = 0;
    const c = grid.center(x, z);
    const cl = makeCrystalCluster(Math.random, { color: 0xcc99ff, emissive: 0x7744cc, count: 3 + (Math.random() * 3 | 0), maxH: 1.3 });
    cl.position.set(c.x, 0, c.z);
    group.add(cl);
  }
  // setas luminosas y piedrecitas dispersas (no bloquean)
  for (let i = 0; i < 24; i++) {
    const x = ri(2, W - 3), z = ri(2, H - 3);
    if (!grid.cells[z][x] || (Math.abs(x - W / 2) < 3 && Math.abs(z - H / 2) < 4)) continue;
    const c = grid.center(x, z);
    const m = Math.random() < 0.5
      ? makeMushroom(Math.random, { color: 0xb88bff, emissive: 0x6a3fcf })
      : makeRock(Math.random, { r: 0.18 + Math.random() * 0.24, color: 0x3a3055 });
    m.position.set(c.x + (Math.random() - 0.5) * 0.5, 0, c.z + (Math.random() - 0.5) * 0.5);
    m.rotation.y = Math.random() * Math.PI * 2;
    group.add(m);
  }

  // curandera
  const healerPos = grid.center(7, 10);
  const healer = makeNPC(0xd8c8f0);
  healer.position.copy(healerPos);
  group.add(healer);
  interactables.push({ type: 'healer', pos: healerPos.clone(), radius: 2.2, label: '⛪ Sanadora del Vacío', labelCls: 'lbl-npc' });

  // mercader
  const vendorPos = grid.center(18, 10);
  const vendor = makeNPC(0x6a4a8a, 0x3a2a55);
  vendor.position.copy(vendorPos);
  group.add(vendor);
  interactables.push({ type: 'vendor', pos: vendorPos.clone(), radius: 2.4, label: '💰 Mercader Errante', labelCls: 'lbl-npc' });

  // Domador de Bestias (refugio)
  const tamerPos = grid.center(23, 14);
  const tamer = makeNPC(0x3a7d4a, 0x224a2a);
  tamer.position.copy(tamerPos);
  group.add(tamer);
  interactables.push({ type: 'petkeeper', pos: tamerPos.clone(), radius: 2.2, label: '🐾 Domador de Bestias', labelCls: 'lbl-npc' });

  // alijo compartido
  const stashPos = grid.center(13, 18);
  const stash = new THREE.Group();
  const sBox = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.7, 0.75),
    new THREE.MeshStandardMaterial({ color: 0x5a4a7a, roughness: 0.8 }));
  sBox.position.y = 0.35;
  const sLid = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.22, 0.8),
    new THREE.MeshStandardMaterial({ color: 0xc9a227, metalness: 0.5, roughness: 0.5 }));
  sLid.position.y = 0.78;
  sBox.castShadow = sLid.castShadow = true;
  stash.add(sBox, sLid);
  stash.position.copy(stashPos);
  group.add(stash);
  interactables.push({ type: 'stash', pos: stashPos.clone(), radius: 1.8, label: '🗃️ Alijo compartido', labelCls: 'lbl-chest' });

  // waypoint
  const wpPos = grid.center(13, 13);
  const wp = makeWaypoint();
  wp.position.copy(wpPos);
  group.add(wp);
  interactables.push({ type: 'waypoint', pos: wpPos.clone(), radius: 1.2, label: '🗺️ Waypoint', labelCls: 'lbl-portal', mesh: wp });

  // portal a las profundidades (piso 16+)
  const portalPos = grid.center(13, 4);
  const portal = makePortal(0xaa66ff, 'Abismo');
  portal.position.copy(portalPos);
  group.add(portal);
  interactables.push({ type: 'portal_dungeon', minFloor: 16, pos: portalPos.clone(), radius: 1.3, label: '🌀 Descender al Abismo (16+)', labelCls: 'lbl-portal', mesh: portal });

  return {
    type: 'refuge', group, grid, spawn: grid.center(13, H - 5), interactables, spawns: [],
    fog: { color: 0x0a0716, near: 22, far: 50 },
    ambient: 0x7766aa, ambientIntensity: 0.55,
    sun: { color: 0xbba8ff, intensity: 1.2 },
    clearColor: 0x0a0716,
  };
}
