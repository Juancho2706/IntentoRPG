// ============================================================
// PostFX — post-procesado opcional (bloom + viñeta + grading)
// ============================================================
// Encapsula EffectComposer y sus passes. Todos los addons se cargan de forma
// DINÁMICA con try/catch: si el CDN no está disponible (offline antes de
// precachear, fallo de red...) el juego NO se rompe — simplemente cae al
// `renderer.render` normal. Comprobar siempre `pfx.active` antes de usar.
import * as THREE from 'three';

// Shader de viñeta sutil + ligero tinte de bioma (multiplicativo, muy suave).
// Barato: solo unas operaciones por píxel.
const VignetteShader = {
  uniforms: {
    tDiffuse: { value: null },
    offset:   { value: 1.15 },   // cuanto mayor, más tarde empieza el oscurecido
    darkness: { value: 0.85 },   // intensidad del borde oscuro
    tint:     { value: new THREE.Color(0xffffff) },
    tintAmt:  { value: 0.0 },    // 0 = sin tinte
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float offset;
    uniform float darkness;
    uniform vec3 tint;
    uniform float tintAmt;
    varying vec2 vUv;
    void main() {
      vec4 tex = texture2D(tDiffuse, vUv);
      // tinte de bioma muy leve, mezclado en color
      tex.rgb = mix(tex.rgb, tex.rgb * tint, tintAmt);
      // viñeta radial
      vec2 uv = (vUv - 0.5) * vec2(offset);
      float vig = clamp(1.0 - dot(uv, uv) * darkness, 0.0, 1.0);
      // un toque suave para que no sea lineal
      vig = smoothstep(0.0, 1.0, vig);
      gl_FragColor = vec4(tex.rgb * mix(1.0, vig, 0.85), tex.a);
    }
  `,
};

export class PostFX {
  constructor() {
    this.active = false;       // true solo si todos los addons cargaron
    this.enabled = true;       // toggle del usuario (settings.postfx)
    this.bloomEnabled = true;  // bloom puede apagarse por calidad/reduceMotion
    this.composer = null;
    this.bloomPass = null;
    this.vignettePass = null;
    this._size = new THREE.Vector2(1, 1);
  }

  // Carga perezosa y tolerante a fallos de los addons de post-procesado.
  // Devuelve true si el composer quedó operativo.
  async init(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    try {
      const [{ EffectComposer }, { RenderPass }, { UnrealBloomPass }, { ShaderPass }, { OutputPass }] =
        await Promise.all([
          import('three/addons/postprocessing/EffectComposer.js'),
          import('three/addons/postprocessing/RenderPass.js'),
          import('three/addons/postprocessing/UnrealBloomPass.js'),
          import('three/addons/postprocessing/ShaderPass.js'),
          import('three/addons/postprocessing/OutputPass.js').catch(() => ({ OutputPass: null })),
        ]);

      renderer.getSize(this._size);
      const composer = new EffectComposer(renderer);
      composer.setPixelRatio(renderer.getPixelRatio());
      composer.setSize(this._size.x, this._size.y);

      composer.addPass(new RenderPass(scene, camera));

      // Bloom selectivo por UMBRAL: solo lo realmente brillante/emisivo
      // (orbes, proyectiles, cristales, portales, ojos, loot legendario)
      // supera el threshold y florece.
      const bloom = new UnrealBloomPass(this._size.clone(), 0.5, 0.4, 0.86);
      bloom.threshold = 0.86;   // solo florece lo más brillante (menos "show de luces")
      bloom.strength = 0.5;
      bloom.radius = 0.4;
      composer.addPass(bloom);
      this.bloomPass = bloom;

      // viñeta + tinte de bioma
      const vig = new ShaderPass(VignetteShader);
      composer.addPass(vig);
      this.vignettePass = vig;

      // OutputPass aplica tone mapping + conversión a sRGB al final de la
      // cadena (recomendado en three 0.160). Si no existe, el RenderPass ya
      // habrá hecho el tone mapping del renderer; marcamos el último pass.
      if (OutputPass) {
        composer.addPass(new OutputPass());
      } else {
        vig.renderToScreen = true;
      }

      this.composer = composer;
      this.active = true;
      return true;
    } catch (err) {
      // CDN no disponible o addons incompatibles: degradación elegante.
      console.warn('[postfx] addons no disponibles, render directo:', err?.message || err);
      this.active = false;
      return false;
    }
  }

  // ¿Debe renderizarse a través del composer ahora mismo?
  get shouldRender() {
    return this.active && this.enabled;
  }

  setEnabled(on) {
    this.enabled = !!on;
  }

  // bloom on/off (calidad adaptativa / reduceMotion)
  setBloom(on) {
    this.bloomEnabled = !!on;
    if (this.bloomPass) this.bloomPass.enabled = !!on;
  }

  // tinte de bioma para el grading (color cálido/frío/violeta + fuerza)
  setTint(colorHex, amount = 0.0) {
    if (!this.vignettePass) return;
    this.vignettePass.uniforms.tint.value.setHex(colorHex);
    this.vignettePass.uniforms.tintAmt.value = amount;
  }

  // mantener composer en sincronía con renderer (tamaño + pixelRatio)
  setSize(w, h, pixelRatio) {
    this._size.set(w, h);
    if (!this.composer) return;
    if (pixelRatio != null) this.composer.setPixelRatio(pixelRatio);
    this.composer.setSize(w, h);
    if (this.bloomPass) this.bloomPass.setSize(w, h);
  }

  render() {
    this.composer.render();
  }
}

// ============================================================
// AmbientParticles — motas/nieve/brasas/vacío por bioma
// ============================================================
// Un único THREE.Points reutilizado (pooled): cambia de "preset" según el
// bioma sin recrear geometría. Las partículas viven en una caja centrada en
// la cámara (la siguen) y reaparecen por arriba/abajo al salirse — barato y
// siempre cubre lo visible. Desactivable (reduceMotion / postfx off).
const BOX = 26;          // lado de la caja de partículas alrededor de la cámara
const HALF = BOX / 2;

// Presets por bioma. type: 0 polvo, 1 nieve, 2 brasas, 3 vacío
const PRESETS = {
  'Cripta':           { type: 0, count: 90,  color: 0x99916f, size: 0.06, rise: false, speed: 0.25, drift: 0.4 },
  'Cavernas de Hielo':{ type: 1, count: 150, color: 0xcfe8ff, size: 0.09, rise: false, speed: 1.1,  drift: 0.7 },
  'Infierno':         { type: 2, count: 120, color: 0xff7a33, size: 0.08, rise: true,  speed: 1.4,  drift: 0.5 },
  'Abismo Estelar':   { type: 3, count: 110, color: 0xb98cff, size: 0.10, rise: false, speed: 0.5,  drift: 0.6 },
};

export class AmbientParticles {
  constructor(scene) {
    this.scene = scene;
    this.points = null;
    this.preset = null;
    this.enabled = true;
    this.active = false;   // hay un preset cargado y visible
    this._max = 160;
    this._build();
  }

  _build() {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(this._max * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setDrawRange(0, 0);
    const mat = new THREE.PointsMaterial({
      color: 0xffffff, size: 0.08, transparent: true, opacity: 0.7,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 2;
    this.points.visible = false;
    this.scene.add(this.points);
    this._vel = new Float32Array(this._max * 3); // velocidad por partícula
  }

  setEnabled(on) {
    this.enabled = !!on;
    if (this.points) this.points.visible = !!on && this.active;
  }

  // Configura el preset por nombre de bioma (o lo desactiva si no hay).
  setBiome(biomeName, center) {
    const preset = PRESETS[biomeName] || null;
    this.preset = preset;
    if (!preset) {
      this.active = false;
      this.points.visible = false;
      return;
    }
    const count = Math.min(preset.count, this._max);
    const geo = this.points.geometry;
    const pos = geo.attributes.position.array;
    const cx = center?.x || 0, cy = center?.y || 0, cz = center?.z || 0;
    for (let i = 0; i < count; i++) {
      const k = i * 3;
      pos[k]     = cx + (Math.random() - 0.5) * BOX;
      pos[k + 1] = cy + Math.random() * BOX;
      pos[k + 2] = cz + (Math.random() - 0.5) * BOX;
      this._vel[k]     = (Math.random() - 0.5) * preset.drift;
      this._vel[k + 1] = preset.rise
        ? (0.4 + Math.random()) * preset.speed
        : -(0.3 + Math.random()) * preset.speed;
      this._vel[k + 2] = (Math.random() - 0.5) * preset.drift;
    }
    geo.setDrawRange(0, count);
    geo.attributes.position.needsUpdate = true;
    this.points.material.color.setHex(preset.color);
    this.points.material.size = preset.size;
    this.points.material.opacity = preset.type === 0 ? 0.45 : 0.7;
    this.active = true;
    this.points.visible = this.enabled;
  }

  // Avanza las partículas y mantiene la caja centrada en la cámara.
  update(dt, camPos) {
    if (!this.active || !this.enabled || !this.points.visible) return;
    const p = this.preset;
    const geo = this.points.geometry;
    const count = geo.drawRange.count;
    const pos = geo.attributes.position.array;
    const vel = this._vel;
    const t = performance.now() / 1000;
    const cx = camPos.x, cy = 0, cz = camPos.z;
    for (let i = 0; i < count; i++) {
      const k = i * 3;
      // deriva ondulante para polvo/vacío; caída/ascenso para nieve/brasas
      pos[k]     += (vel[k] + Math.sin(t * 0.7 + i) * p.drift * 0.5) * dt;
      pos[k + 1] += vel[k + 1] * dt;
      pos[k + 2] += (vel[k + 2] + Math.cos(t * 0.6 + i) * p.drift * 0.5) * dt;
      // recentrar respecto a la cámara y reciclar al salir de la caja
      let dx = pos[k] - cx, dy = pos[k + 1] - cy, dz = pos[k + 2] - cz;
      if (dx >  HALF) pos[k] -= BOX; else if (dx < -HALF) pos[k] += BOX;
      if (dz >  HALF) pos[k + 2] -= BOX; else if (dz < -HALF) pos[k + 2] += BOX;
      if (p.rise) { if (dy > HALF) pos[k + 1] = cy - 0.5; }
      else        { if (dy < -1)   pos[k + 1] = cy + HALF; else if (dy > HALF) pos[k + 1] = cy - 0.5; }
    }
    geo.attributes.position.needsUpdate = true;
  }
}
