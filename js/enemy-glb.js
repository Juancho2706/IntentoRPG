// enemy-glb.js — Enemigos con modelo 3D riggeado (.glb) y animaciones por clips.
// El juego sigue creando el modelo procedural (js/entities.js · makeEnemyModel); cuando el .glb de su
// forma está cargado, se le pone encima y el procedural se oculta. Sin WebGL, sin red o en gama baja
// no pasa nada: queda el procedural. Solo navegador (lo crea main.js; los tests no lo importan).
//
// Modelos: assets/models/<forma>.glb, hechos en Blender (IntentoRPG-assets/concepts/<enemigo>/), con
// animaciones propias hechas pose a pose (sin captura de movimiento).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

// forma del catálogo (def.shape) → modelo. `alto` = altura del modelo en unidades del grupo (× def.scale = metros).
// `golpe` = segundo del clip de ataque en que cae el impacto. El enemigo AVISA antes de pegar
// (Enemy.swingT, entities.js): el clip arranca al empezar la preparación, adelantado lo justo para que su
// impacto coincida con el daño. Ataques sin preparación (disparos, golpes de suelo): entra cerca del impacto.
export const GLB_SHAPES = {
  demon: { url: './assets/models/demonio.glb', alto: 1.45, ataques: [{ clip: 'ataque2', golpe: 0.70 }, { clip: 'ataque', golpe: 0.87 }], tinte: 0.3 },
};
const MAX_ACTIVOS = 14;        // tope de modelos riggeados a la vez (el resto sigue procedural)
const FUNDIDO = 0.16;

export class GlbEnemies {
  constructor(opts = {}) {
    this.enabled = opts.enabled !== false;
    this.tpl = {};             // forma → { scene, clips, altura } | 'cargando' | 'error'
    this.cola = {};            // forma → enemigos que esperan la carga
    this.activos = 0;
    this.loader = new GLTFLoader();
  }

  // Llamado por Enemy al nacer. Devuelve true si la forma tiene modelo (aunque aún esté cargando).
  attach(enemy) {
    if (!this.enabled) return false;
    const shape = enemy.def?.shape, cfg = GLB_SHAPES[shape];
    if (!cfg) return false;
    const t = this.tpl[shape];
    if (t === 'error') return false;
    if (t && t !== 'cargando') { this._poner(enemy, cfg, t); return true; }
    (this.cola[shape] || (this.cola[shape] = [])).push(enemy);
    if (!t) {
      this.tpl[shape] = 'cargando';
      this.loader.load(cfg.url, (gltf) => {
        const box = new THREE.Box3().setFromObject(gltf.scene);
        const tpl = { scene: gltf.scene, clips: gltf.animations, altura: Math.max(0.5, box.max.y - box.min.y) };
        tpl.scene.traverse(o => { if (o.isMesh) { o.frustumCulled = false; o.geometry.userData.shared = true; } });
        this.tpl[shape] = tpl;
        for (const e of this.cola[shape] || []) if (e.alive && !e._disposed) this._poner(e, cfg, tpl);
        this.cola[shape] = [];
      }, undefined, () => { this.tpl[shape] = 'error'; this.cola[shape] = []; });
    }
    return true;
  }

  _poner(enemy, cfg, tpl) {
    if (enemy.glb || this.activos >= MAX_ACTIVOS) return;
    const root = SkeletonUtils.clone(tpl.scene);
    // el grupo del enemigo ya va escalado por def.scale (makeEnemyModel): aquí solo se normaliza la altura
    root.scale.setScalar(cfg.alto / tpl.altura);
    const bar = enemy.group.userData.bar;
    if (bar) bar.position.y = cfg.alto + 0.3;
    const tint = new THREE.Color(enemy.def.color ?? 0xffffff);
    root.traverse(o => {
      if (!o.isMesh) return;
      o.userData.sharedGeo = true;                       // Enemy.dispose no libera la geometría compartida
      o.castShadow = false;
      const m = o.material = o.material.clone();        // material propio: destello de golpe y fundido por enemigo
      m.userData.baseEmissive = m.emissive.getHex();
      if (!m.emissiveMap && m.emissive.getHex() === 0 && cfg.tinte) m.color.lerp(tint, cfg.tinte);
      if (m.emissiveMap || m.emissive.getHex() !== 0) m.emissiveIntensity = 1.6;
    });
    // el procedural se oculta (sigue ahí para el aura, la cáscara de escudo y las marcas que cuelgan del grupo)
    for (const c of enemy._procChildren || []) c.visible = false;
    enemy.group.add(root);
    const mixer = new THREE.AnimationMixer(root);
    const acts = {};
    for (const c of tpl.clips) acts[c.name] = mixer.clipAction(c);
    enemy.glb = { root, mixer, acts, cfg, cur: null, lock: 0, n: 0, lungePrev: 0, hitPrev: 0, sw: false, muerto: 0 };
    this.activos++;
    this._ir(enemy.glb, 'reposo', 0);
    mixer.update(Math.random() * 2);                     // desfase: una manada no respira al unísono
  }

  _ir(g, nombre, fundido = FUNDIDO, opts = {}) {
    const a = g.acts[nombre];
    if (!a || g.cur === a && !opts.reinicia) return;
    a.reset();
    a.setLoop(opts.una ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
    a.clampWhenFinished = !!opts.una;
    if (opts.desde) a.time = opts.desde;
    a.timeScale = opts.vel ?? 1;
    if (g.cur && g.cur !== a) a.crossFadeFrom(g.cur, fundido, false);
    a.play();
    g.cur = a; g.nombre = nombre;
  }

  // Sustituye a la animación procedural (Enemy.animate la llama si enemy.glb existe).
  update(enemy, dt) {
    try { this._update(enemy, dt); return true; }
    catch (err) { console.warn('[enemy-glb] animación desactivada:', err); this._quitar(enemy); return false; }
  }

  // un fallo aquí no puede tumbar el bucle del juego: se vuelve al modelo procedural
  _quitar(enemy) {
    const g = enemy.glb; if (!g) return;
    try { enemy.group.remove(g.root); } catch { /* ya no está */ }
    for (const c of enemy._procChildren || []) c.visible = true;
    this.release(enemy);
  }

  // Muerte: reproduce el clip `muerte`, deja el cuerpo un instante y lo hunde. true = retirar del mundo.
  death(enemy, dt) {
    const g = enemy.glb;
    try {
      if (!g.muerto) {
        const bar = enemy.group.userData.bar; if (bar) bar.visible = false;
        if (g.acts.muerte) this._ir(g, 'muerte', 0.08, { una: true, reinicia: true });
        g.dur = g.acts.muerte ? g.acts.muerte.getClip().duration : 0.3;
      }
      g.muerto += dt;
      g.mixer.update(dt);
      const hund = g.muerto - (g.dur + 0.6);               // tras el clip: 0,6 s en el suelo y se hunde
      if (hund > 0) enemy.group.position.y = -hund * 0.9;
      return hund > 0.9;
    } catch (err) { console.warn('[enemy-glb] muerte:', err); return true; }
  }

  _update(enemy, dt) {
    const g = enemy.glb;
    if (g.muerto) {                                       // revivió (afijo Escudado): vuelve a estar en pie
      g.muerto = 0; g.lock = 0; g.sw = false;
      const bar = enemy.group.userData.bar; if (bar) bar.visible = true;
      this._ir(g, 'reposo', 0.1, { reinicia: true });
    }
    if (!enemy._apos) enemy._apos = enemy.pos.clone();
    const moved = enemy.pos.distanceTo(enemy._apos);
    enemy._apos.copy(enemy.pos);
    const vel = dt > 0 ? moved / dt : 0;
    const lunge = enemy.lunge || 0, hit = enemy.hitT || 0;
    enemy.lunge = Math.max(0, lunge - dt * 4);
    enemy.hitT = Math.max(0, hit - dt * 6);
    g.lock = Math.max(0, g.lock - dt);
    const prep = enemy.swingT || 0;
    if (prep > 0 && !g.sw) {                              // empieza a preparar el golpe: el impacto del clip cae con el daño
      const at = g.cfg.ataques[g.n++ % g.cfg.ataques.length];
      const a = g.acts[at.clip];
      if (a) {
        const desde = Math.max(0, at.golpe - prep);
        this._ir(g, at.clip, 0.1, { una: true, reinicia: true, desde });
        g.lock = Math.max(0.25, a.getClip().duration - desde - 0.15);
        g.sw = true;
      }
    } else if (g.sw) {
      if (prep <= 0 && g.lock <= 0) g.sw = false;         // terminó el golpe y su recuperación
      else if (prep <= 0 && lunge <= 0.9 && g.lungePrev <= 0.9 && enemy.stunT > 0) { g.sw = false; g.lock = 0; }  // lo cortaron
    } else if (lunge > 0.9 && g.lungePrev <= 0.9) {      // ataque sin preparación: el daño cae ya → entrar cerca del impacto
      const at = g.cfg.ataques[g.n++ % g.cfg.ataques.length];
      const a = g.acts[at.clip];
      if (a) {
        const desde = Math.max(0, at.golpe - 0.1);
        this._ir(g, at.clip, 0.08, { una: true, reinicia: true, desde });
        g.lock = Math.max(0.25, a.getClip().duration - desde - 0.15);
      }
    } else if (hit > 0.15 && g.hitPrev <= 0.15 && g.lock <= 0 && g.acts.golpe) {
      this._ir(g, 'golpe', 0.06, { una: true, reinicia: true });
      g.lock = g.acts.golpe.getClip().duration * 0.8;
    } else if (g.lock <= 0) {
      if (vel > 0.25) {
        const corre = vel > Math.max(3.2, (enemy.def.spd || 2.5) * 1.15);
        const clip = corre && g.acts.correr ? 'correr' : 'caminar';
        this._ir(g, clip);
        // sin patinar: la cadencia sigue a la velocidad real (velocidad de referencia de cada ciclo)
        g.cur.timeScale = THREE.MathUtils.clamp(vel / (corre ? 4.2 : 1.5) / Math.max(0.6, enemy.def.scale || 1), 0.6, 1.8);
      } else this._ir(g, 'reposo', 0.25);
    }
    g.lungePrev = lunge; g.hitPrev = hit;
    g.mixer.update(dt);
  }

  // Al quitar al enemigo del mundo.
  release(enemy) {
    const g = enemy.glb; if (!g) return;
    g.mixer.stopAllAction(); g.mixer.uncacheRoot(g.root);
    enemy.glb = null;
    this.activos = Math.max(0, this.activos - 1);
  }
}
