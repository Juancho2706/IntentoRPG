// ============================================================
// PostFX — post-procesado opcional (AO + bloom + outline + viñeta + SMAA)
// ============================================================
// Encapsula EffectComposer y sus passes. Todos los addons se cargan de forma
// DINÁMICA con try/catch: si el CDN no está disponible (offline antes de
// precachear, fallo de red...) el juego NO se rompe — simplemente cae al
// `renderer.render` normal, o a un composer con menos passes. Cada efecto
// degrada por separado: un fallo de SMAA/GTAO/Outline no tumba el bloom.
// Comprobar siempre `pfx.active` antes de usar.
//
// Orden de la cadena (cuando todo carga):
//   RenderPass → GTAO (oclusión) → Outline (héroe/enemigos) →
//   Bloom (emisivos) → Vignette+tint (grading) → SMAA (antialias) → Output
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
    this.active = false;       // true solo si el composer base cargó
    this.enabled = true;       // toggle del usuario (settings.postfx)
    this.bloomEnabled = true;  // bloom puede apagarse por calidad/reduceMotion
    this.aoEnabled = true;     // oclusión ambiental (settings.ao + calidad)
    this.outlineEnabled = true;// contorno de héroe/enemigos (settings.outline)
    this.composer = null;
    this.bloomPass = null;
    this.vignettePass = null;
    this.gtaoPass = null;
    this.outlinePass = null;
    this.smaaPass = null;
    this._size = new THREE.Vector2(1, 1);
  }

  // Carga perezosa y tolerante a fallos de los addons de post-procesado.
  // Devuelve true si el composer quedó operativo (aunque falten efectos).
  async init(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    try {
      // núcleo imprescindible: si esto falla, no hay composer en absoluto.
      const [{ EffectComposer }, { RenderPass }, { UnrealBloomPass }, { ShaderPass }, { OutputPass }] =
        await Promise.all([
          import('three/addons/postprocessing/EffectComposer.js'),
          import('three/addons/postprocessing/RenderPass.js'),
          import('three/addons/postprocessing/UnrealBloomPass.js'),
          import('three/addons/postprocessing/ShaderPass.js'),
          import('three/addons/postprocessing/OutputPass.js').catch(() => ({ OutputPass: null })),
        ]);

      renderer.getSize(this._size);
      const w = this._size.x, h = this._size.y;
      const composer = new EffectComposer(renderer);
      composer.setPixelRatio(renderer.getPixelRatio());
      composer.setSize(w, h);

      composer.addPass(new RenderPass(scene, camera));

      // --- 1) Oclusión ambiental de contacto (GTAO) ---
      // Suave y comedida: oscurece grietas/contactos para "asentar" objetos en
      // el suelo. Opcional: si el addon no carga, se omite sin más.
      try {
        const { GTAOPass } = await import('three/addons/postprocessing/GTAOPass.js');
        const gtao = new GTAOPass(scene, camera, w, h);
        // intensidad comedida (no es un efecto "de demo")
        gtao.blendIntensity = 0.85;
        gtao.updateGtaoMaterial?.({
          radius: 0.5, distanceExponent: 1.0, thickness: 1.0,
          scale: 1.0, samples: 8, distanceFallOff: 1.0,
          screenSpaceRadius: false,
        });
        gtao.updatePdMaterial?.({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 4, radiusExponent: 1, rings: 2, samples: 8 });
        gtao.enabled = this.aoEnabled;
        composer.addPass(gtao);
        this.gtaoPass = gtao;
      } catch (e) {
        console.warn('[postfx] GTAO no disponible:', e?.message || e);
      }

      // --- 2) Contorno estilizado (Outline) sobre héroe y enemigos ---
      // Borde oscuro sutil para look "diorama" y legibilidad. selectedObjects
      // se actualiza desde el juego cada frame (o periódicamente).
      try {
        const { OutlinePass } = await import('three/addons/postprocessing/OutlinePass.js');
        const outline = new OutlinePass(new THREE.Vector2(w, h), scene, camera, []);
        outline.edgeStrength = 2.6;
        outline.edgeGlow = 0.0;       // sin halo brillante: borde limpio
        outline.edgeThickness = 1.0;
        outline.pulsePeriod = 0;
        outline.visibleEdgeColor.set(0x05060a);  // contorno casi negro
        outline.hiddenEdgeColor.set(0x05060a);
        outline.enabled = this.outlineEnabled;
        composer.addPass(outline);
        this.outlinePass = outline;
      } catch (e) {
        console.warn('[postfx] Outline no disponible:', e?.message || e);
      }

      // --- 3) Bloom selectivo por UMBRAL ---
      // Solo lo realmente brillante/emisivo (orbes, proyectiles, cristales,
      // portales, ojos, loot legendario) supera el threshold y florece.
      const bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.5, 0.4, 0.86);
      bloom.threshold = 0.86;   // solo florece lo más brillante
      bloom.strength = 0.5;
      bloom.radius = 0.4;
      composer.addPass(bloom);
      this.bloomPass = bloom;

      // --- 4) viñeta + tinte de bioma (grading) ---
      const vig = new ShaderPass(VignetteShader);
      composer.addPass(vig);
      this.vignettePass = vig;

      // --- 5) Antialias SMAA (el composer pierde el MSAA del renderer) ---
      try {
        const { SMAAPass } = await import('three/addons/postprocessing/SMAAPass.js');
        const smaa = new SMAAPass(w * renderer.getPixelRatio(), h * renderer.getPixelRatio());
        composer.addPass(smaa);
        this.smaaPass = smaa;
      } catch (e) {
        console.warn('[postfx] SMAA no disponible:', e?.message || e);
      }

      // OutputPass aplica tone mapping + conversión a sRGB al final de la
      // cadena (recomendado en three 0.160). Si no existe, marcamos el último
      // pass disponible para que pinte a pantalla.
      if (OutputPass) {
        composer.addPass(new OutputPass());
      } else {
        const last = this.smaaPass || vig;
        last.renderToScreen = true;
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

  // oclusión ambiental on/off (settings.ao / calidad baja)
  setAO(on) {
    this.aoEnabled = !!on;
    if (this.gtaoPass) this.gtaoPass.enabled = !!on;
  }

  // contorno on/off (settings.outline / calidad baja)
  setOutline(on) {
    this.outlineEnabled = !!on;
    if (this.outlinePass) this.outlinePass.enabled = !!on;
  }

  // lista de objetos a contornear (héroe + enemigos visibles). El juego la
  // actualiza periódicamente; barato porque OutlinePass solo recorre la lista.
  setOutlineTargets(objects) {
    if (this.outlinePass) this.outlinePass.selectedObjects = objects || [];
  }

  // ¿hay capacidad de outline? (para que el juego no recopile objetos en balde)
  get hasOutline() { return !!this.outlinePass; }

  // tinte de bioma para el grading (color cálido/frío/violeta + fuerza)
  setTint(colorHex, amount = 0.0) {
    if (!this.vignettePass) return;
    this.vignettePass.uniforms.tint.value.setHex(colorHex);
    this.vignettePass.uniforms.tintAmt.value = amount;
  }

  // mantener composer en sincronía con renderer (tamaño + pixelRatio).
  // composer.setSize ya propaga el tamaño EFECTIVO (×pixelRatio) a TODAS las
  // passes (bloom, GTAO, outline, SMAA), así que no hace falta redimensionar
  // cada una a mano (hacerlo con el tamaño lógico las descuadraría).
  setSize(w, h, pixelRatio) {
    this._size.set(w, h);
    if (!this.composer) return;
    if (pixelRatio != null) this.composer.setPixelRatio(pixelRatio);
    this.composer.setSize(w, h);
  }

  render() {
    this.composer.render();
  }
}

// ============================================================
// BlobShadows — sombras de contacto/blob bajo entidades
// ============================================================
// Un disco oscuro semitransparente que sigue a cada entidad (héroe/enemigos)
// para darles "peso" sin coste de sombras reales. Pooled: un único material
// compartido y mallas reutilizadas. Se posa en el suelo (y≈0.02) y se atenúa
// con la altura de la entidad (saltos/empujes) y al morir.
const _v = new THREE.Vector3();

export class BlobShadows {
  constructor(scene) {
    this.scene = scene;
    this.enabled = true;
    this.group = new THREE.Group();
    this.group.renderOrder = -1; // bajo todo lo demás
    scene.add(this.group);
    // textura radial suave generada por canvas (degradado a transparente)
    this._tex = this._makeTexture();
    this._geo = new THREE.PlaneGeometry(1, 1);
    this._pool = [];      // mallas reutilizables
    this._used = 0;
  }

  _makeTexture() {
    if (typeof document === 'undefined') return null;
    const s = 64;
    const cv = document.createElement('canvas');
    cv.width = cv.height = s;
    const ctx = cv.getContext('2d');
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(0,0,0,0.55)');
    g.addColorStop(0.55, 'rgba(0,0,0,0.32)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  _acquire() {
    if (this._used < this._pool.length) return this._pool[this._used++];
    const mat = new THREE.MeshBasicMaterial({
      map: this._tex, color: 0x000000, transparent: true, opacity: 0.5,
      depthWrite: false, depthTest: true, blending: THREE.NormalBlending,
    });
    const m = new THREE.Mesh(this._geo, mat);
    m.rotation.x = -Math.PI / 2;
    m.renderOrder = -1;
    this.group.add(m);
    this._pool.push(m);
    this._used++;
    return m;
  }

  setEnabled(on) {
    this.enabled = !!on;
    this.group.visible = !!on;
  }

  // Reposiciona todas las sombras. `entities` = array de {pos, radius?, y?, alive?}.
  // hero opcional (se dibuja siempre el primero, un poco más marcado).
  update(hero, enemies) {
    if (!this.enabled || !this._tex) return;
    this._used = 0;
    if (hero && hero.alive !== false) this._place(hero.pos, 0.85, 0.5);
    if (enemies) {
      for (const e of enemies) {
        if (!e.alive || !e.group?.visible) continue;
        const sc = (e.def?.scale || 1);
        this._place(e.pos, 0.55 * sc + 0.25, 0.42);
      }
    }
    // ocultar las sobrantes del pool
    for (let i = this._used; i < this._pool.length; i++) this._pool[i].visible = false;
  }

  _place(pos, radius, opacity) {
    const m = this._acquire();
    m.visible = true;
    // atenuar con la altura sobre el suelo (saltos): sombra más pequeña/tenue
    const yUp = Math.max(0, pos.y || 0);
    const fade = 1 / (1 + yUp * 0.8);
    _v.copy(pos); _v.y = 0.02;
    m.position.copy(_v);
    const r = radius * (0.7 + 0.3 * fade);
    m.scale.set(r * 2, r * 2, 1);
    m.material.opacity = opacity * fade;
  }

  dispose() {
    for (const m of this._pool) m.material.dispose();
    this._geo.dispose();
    this._tex?.dispose();
    this.scene.remove(this.group);
    this._pool.length = 0;
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
    this._density = 1;     // escala de densidad por gama del dispositivo (0..1)
    this._biome = null;    // último bioma para re-sembrar al cambiar densidad
    this._center = null;
    this._build();
  }

  // Ajusta la densidad (0..1) y re-siembra el bioma activo con el nuevo conteo.
  setDensity(scale) {
    this._density = Math.max(0.1, Math.min(1, scale || 1));
    if (this.active && this._biome) this.setBiome(this._biome, this._center);
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
    this._biome = biomeName;
    if (center) this._center = { x: center.x, y: center.y, z: center.z };
    if (!preset) {
      this.active = false;
      this.points.visible = false;
      return;
    }
    const count = Math.max(8, Math.min(Math.round(preset.count * this._density), this._max));
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
