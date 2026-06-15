// ============================================================
// Entrada: ratón, teclado y joystick táctil
// ============================================================
import * as THREE from 'three';
import { mergeBindings, buildCodeMap, assignBinding, MOVE_ACTIONS } from './bindings.js';

export class Input {
  constructor(game) {
    this.game = game;
    this.joyDir = null;     // {x,z} desde el joystick táctil
    this.keyDir = null;     // {x,z} desde WASD/flechas
    this.mouseWorld = null; // último punto del mundo bajo el ratón
    this.pointerDown = false;
    this.keys = new Set();
    this.joyId = null;
    // remapeo: acciones↔teclas (defaults + anulaciones del jugador)
    this.bindings = mergeBindings(game.settings?.bindings);
    this.codeToAction = buildCodeMap(this.bindings);
    this.capturing = null;  // acción que espera la siguiente tecla (UI de remapeo)
    this.captureCb = null;

    const canvas = game.renderer.domElement;
    canvas.addEventListener('pointerdown', e => this.onPointerDown(e));
    window.addEventListener('pointermove', e => this.onPointerMove(e));
    window.addEventListener('pointerup', e => this.onPointerUp(e));
    window.addEventListener('contextmenu', e => e.preventDefault());

    // Bloqueo de orientación a horizontal (best-effort): solo funciona en móvil
    // y en contexto pantalla completa / PWA instalada; si falla, el overlay
    // "gira el dispositivo" cubre el caso. Se intenta una vez al primer gesto.
    const tryLockLandscape = () => {
      window.removeEventListener('pointerdown', tryLockLandscape);
      try { screen.orientation?.lock?.('landscape').catch(() => {}); } catch { /* no soportado */ }
    };
    if (window.matchMedia?.('(pointer: coarse)').matches) {
      window.addEventListener('pointerdown', tryLockLandscape, { once: true });
    }

    window.addEventListener('keydown', e => {
      if (e.repeat) return;
      // captura de remapeo: la siguiente tecla se asigna a la acción pendiente
      if (this.capturing) {
        e.preventDefault();
        const action = this.capturing, cb = this.captureCb;
        this.capturing = null; this.captureCb = null;
        if (e.code !== 'Escape') this.setBinding(action, e.code); // Esc = cancelar
        cb?.(e.code !== 'Escape' ? e.code : null);
        return;
      }
      this.keys.add(e.code);
      this.updateKeyDir();
      const action = this.codeToAction[e.code];
      // las acciones de movimiento se leen "mantenidas" (updateKeyDir), no aquí
      if (action && !MOVE_ACTIONS.has(action)) this.doAction(action, e);
    });
    window.addEventListener('keyup', e => { this.keys.delete(e.code); this.updateKeyDir(); });

    // joystick táctil: aparece al tocar la mitad izquierda.
    // El seguimiento y el fin del gesto se escuchan en window para no
    // perder el pointerup si el dedo termina sobre otro elemento del HUD.
    const zone = document.getElementById('joy-zone');
    zone.addEventListener('pointerdown', e => {
      if (this.joyId !== null) return;
      e.preventDefault();
      this.joyId = e.pointerId;
      this.joyOrigin = { x: e.clientX, y: e.clientY };
      const joy = document.getElementById('joystick');
      joy.classList.remove('hidden');
      joy.style.left = e.clientX + 'px';
      joy.style.top = e.clientY + 'px';
    });
    window.addEventListener('pointermove', e => {
      if (e.pointerId !== this.joyId) return;
      let dx = e.clientX - this.joyOrigin.x, dy = e.clientY - this.joyOrigin.y;
      const len = Math.hypot(dx, dy);
      const max = 48;
      if (len > max) { dx = dx / len * max; dy = dy / len * max; }
      document.getElementById('joy-knob').style.transform = `translate(${dx}px, ${dy}px)`;
      if (len > 10) {
        // convertir dirección de pantalla a dirección de mundo (cámara isométrica girada 45°)
        const wx = (dx + dy) * 0.7071, wz = (dy - dx) * 0.7071;
        const wl = Math.hypot(wx, wz) || 1;
        this.joyDir = { x: wx / wl, z: wz / wl };
      } else this.joyDir = null;
    });
    const endJoy = e => {
      if (e && e.pointerId !== undefined && e.pointerId !== this.joyId) return;
      this.joyId = null;
      this.joyDir = null;
      document.getElementById('joystick').classList.add('hidden');
      document.getElementById('joy-knob').style.transform = '';
    };
    window.addEventListener('pointerup', endJoy);
    window.addEventListener('pointercancel', endJoy);
    window.addEventListener('blur', () => endJoy());
    document.addEventListener('visibilitychange', () => { if (document.hidden) endJoy(); });
  }

  // ¿hay alguna tecla de esta acción mantenida?
  held(action) { return this.bindings[action]?.some(c => this.keys.has(c)); }

  // despacha una acción lógica (resuelta desde la tecla pulsada)
  doAction(action, e) {
    const g = this.game;
    switch (action) {
      case 'inventory': g.ui.togglePanel('inv'); break;
      case 'skills': g.ui.togglePanel('skills'); break;
      case 'character': g.ui.togglePanel('stats'); break;
      case 'potionHP': g.player?.usePotion('hp'); break;
      case 'potionMP': g.player?.usePotion('mp'); break;
      case 'primary': e?.preventDefault(); g.primaryAction(); break;
      case 'dodge': g.player?.dodge(); break;
      case 'grab': g.grabNearest(); break;
      case 'map': e?.preventDefault(); g.ui.activePanel === 'map' ? g.ui.closePanel() : g.ui.openMap(); break;
      case 'close': g.ui.closePanel(); break;
      case 'skill1': g.castSkillSlot(0); break;
      case 'skill2': g.castSkillSlot(1); break;
      case 'skill3': g.castSkillSlot(2); break;
      case 'skill4': g.castSkillSlot(3); break;
    }
  }

  // empieza a capturar la siguiente tecla para reasignar `action` (UI de remapeo)
  beginCapture(action, cb) { this.capturing = action; this.captureCb = cb; }

  // asigna una tecla a una acción (sin duplicados) y persiste
  setBinding(action, code) {
    assignBinding(this.bindings, action, code);
    this.codeToAction = buildCodeMap(this.bindings);
    this.game.settings.bindings = this.bindings;
    this.game.saveSettings?.();
  }

  // restaura los controles por defecto
  resetBindings() {
    this.bindings = mergeBindings({});
    this.codeToAction = buildCodeMap(this.bindings);
    this.game.settings.bindings = null;
    this.game.saveSettings?.();
  }

  updateKeyDir() {
    let x = 0, z = 0;
    if (this.held('moveUp')) { x -= 1; z -= 1; }
    if (this.held('moveDown')) { x += 1; z += 1; }
    if (this.held('moveLeft')) { x -= 1; z += 1; }
    if (this.held('moveRight')) { x += 1; z -= 1; }
    const l = Math.hypot(x, z);
    this.keyDir = l > 0 ? { x: x / l, z: z / l } : null;
  }

  raycast(e) {
    const g = this.game;
    const ndc = new THREE.Vector2(
      (e.clientX / window.innerWidth) * 2 - 1,
      -(e.clientY / window.innerHeight) * 2 + 1
    );
    g.raycaster.setFromCamera(ndc, g.camera);
    return g.raycaster;
  }

  groundPoint(e) {
    const ray = this.raycast(e).ray;
    const t = -ray.origin.y / ray.direction.y;
    if (!isFinite(t) || t < 0) return null;
    return ray.origin.clone().addScaledVector(ray.direction, t);
  }

  onPointerDown(e) {
    const g = this.game;
    if (!g.player || !g.player.alive || g.state !== 'play') return;
    this.pointerDown = true;
    // ¿tocó un enemigo?
    const ray = this.raycast(e);
    const hits = ray.intersectObjects(g.entityGroup.children, true);
    for (const h of hits) {
      let o = h.object;
      while (o && !o.userData.enemy) o = o.parent;
      if (o && o.userData.enemy && o.userData.enemy.alive) {
        g.player.attackTarget = o.userData.enemy;
        g.player.moveTarget = null;
        return;
      }
    }
    if (e.pointerType !== 'mouse') {
      // asistencia de puntería táctil: fijar al enemigo más cercano al toque
      // (objetivo efectivo ≥48px aunque el modelo sea pequeño en pantalla)
      let best = null, bd = 55 * 55;
      for (const en of g.enemies) {
        if (!en.alive) continue;
        const s = g.ui.worldToScreen(en.pos);
        if (s.behind) continue;
        const dx = s.x - e.clientX, dy = s.y - e.clientY;
        const d = dx * dx + dy * dy;
        if (d < bd) { bd = d; best = en; }
      }
      if (best) { g.player.attackTarget = best; g.player.moveTarget = null; }
      return; // en táctil no se camina con tap
    }
    const p = this.groundPoint(e);
    if (p) {
      g.player.moveTarget = p;
      g.player.attackTarget = null;
      g.player.pickTarget = null;
    }
  }

  onPointerMove(e) {
    if (e.pointerType === 'mouse') this.mouseWorld = this.groundPoint(e);
    if (this.pointerDown && e.pointerType === 'mouse' && this.game.player?.alive) {
      const p = this.groundPoint(e);
      if (p && this.game.player.moveTarget) this.game.player.moveTarget = p;
    }
  }

  onPointerUp() { this.pointerDown = false; }
}