// ============================================================
// Entrada (solo PC): ratón y teclado
// ============================================================
import * as THREE from 'three';
import { mergeBindings, buildCodeMap, assignBinding, MOVE_ACTIONS } from './bindings.js';

const ALT_CODES = new Set(['AltLeft', 'AltRight']);
// acción de tecla → ranura de habilidad (soltar la tecla suelta la carga o el canal: §3.6.1)
const ACTION_SLOT = { skill1: 'k1', skill2: 'k2', skill3: 'k3', skill4: 'k4' };
const PANEL_ACTIONS = new Set(['inventory', 'skills', 'character', 'talents', 'paragon', 'quests', 'collection', 'guide', 'map', 'close']);

export class Input {
  constructor(game) {
    this.game = game;
    this.keyDir = null;     // {x,z} desde WASD/flechas
    this.mouseWorld = null; // último punto del mundo bajo el ratón
    this.mouseScreen = null; // { x, y } en px de pantalla (enemigo bajo el cursor, HUD)
    this.pointerDown = false;
    // botones de ratón mantenidos (D27: derivados de e.buttons; también en clic-mover). Solo
    // cuentan si la pulsación EMPEZÓ en el lienzo (_canvasPress): arrastrar desde un panel no lanza
    this.mouseHeld = { l: false, r: false };
    this._canvasPress = false;
    this.keys = new Set();
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

    window.addEventListener('keydown', e => {
      // Alt mantenido: tooltips del HUD en combate (convención de PoE). No es una acción.
      if (ALT_CODES.has(e.code)) { e.preventDefault(); this.setAlt(true); return; }
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
      // escribiendo en un campo (p. ej. el código de build de talentos): las teclas no son acciones
      if (e.code !== 'Escape' && e.target?.closest?.('input:not([type=range]):not([type=checkbox]):not([type=radio]), textarea, [contenteditable="true"]')) return;
      this.keys.add(e.code);
      this.updateKeyDir();
      const action = this.codeToAction[e.code];
      // decisión 12 del plan: Ctrl/⌘ + tecla (Ctrl+Z…) no es una acción del juego, y el HUD limpio
      // no se alterna con un panel abierto
      if (action === 'cleanHud' && (e.ctrlKey || e.metaKey || this.game.ui?.activePanel)) return;
      // las acciones de movimiento se leen "mantenidas" (updateKeyDir), no aquí
      if (action && !MOVE_ACTIONS.has(action)) this.doAction(action, e);
    });
    window.addEventListener('keyup', e => {
      if (ALT_CODES.has(e.code)) { this.setAlt(false); return; }
      this.keys.delete(e.code); this.updateKeyDir();
      // soltar la tecla de una ranura (por el remapeo) suelta su carga o su canal
      const slot = ACTION_SLOT[this.codeToAction[e.code]];
      if (slot && !this.held(this.codeToAction[e.code])) this.game.releaseSkillSlot?.(slot);
    });

    // perder el foco, ocultar la pestaña o cancelar el puntero: nada queda «mantenido»
    // (teclas incluidas) y la carga o el canal mantenido se cancelan SIN coste (§3.6.1)
    const clearHeld = () => {
      this.mouseHeld.l = this.mouseHeld.r = false;
      this.pointerDown = false; this._canvasPress = false;
      this.keys.clear(); this.keyDir = null;
      this.setAlt(false);
      this.game.cancelHeld?.('cancel');
    };
    window.addEventListener('blur', clearHeld);
    window.addEventListener('pointercancel', clearHeld);
    document.addEventListener('visibilitychange', () => { if (document.hidden) clearHeld(); });
  }

  // D27: botones del ratón desde e.buttons (bit 1 = izq., bit 2 = der.). Pointer Events no
  // emite pointerdown para el 2.º botón de un acorde (llega en pointermove), así que cada
  // evento compara con el estado anterior: flanco de subida → lanza la ranura (en clic-mover
  // solo 🖱️Der; 🖱️Izq ataca/mueve en onPointerDown), flanco de bajada → g.releaseSkillSlot.
  syncButtons(e, { fromDown = false } = {}) {
    const g = this.game;
    // algunos punteros (lápiz, eventos sintéticos) dan buttons = 0 en pointerdown: se deriva de e.button
    const mask = typeof e.buttons === 'number' && e.buttons ? e.buttons : (fromDown ? (e.button === 2 ? 2 : 1) : (e.buttons || 0));
    if (!this._canvasPress && !(fromDown && mask)) return;
    const l = !!(mask & 1), r = !!(mask & 2);
    const was = { l: this.mouseHeld.l, r: this.mouseHeld.r };
    this.mouseHeld.l = l; this.mouseHeld.r = r;
    const play = g.player?.alive && g.state === 'play';
    const scheme = g.settings?.controlScheme || 'wasd';
    if (was.l && !l) g.releaseSkillSlot?.('lmb');
    if (was.r && !r) g.releaseSkillSlot?.('rmb');
    if (play && r && !was.r) g.castSkillSlot('rmb');
    if (play && l && !was.l && scheme !== 'click') g.castSkillSlot('lmb');
    if (!mask) this._canvasPress = false;
  }

  // Alt mantenido → ui.altHeld (y el widget de mecánica, si expone setAltHeld)
  setAlt(on) {
    const ui = this.game.ui;
    if (!ui || !!ui.altHeld === !!on) return;
    ui.altHeld = !!on;
    document.body.classList.toggle('alt-held', !!on);
    try { ui.gaugeHud?.setAltHeld?.(!!on); } catch { /* widget sin soporte de Alt */ }
  }

  // ¿hay alguna tecla de esta acción mantenida?
  held(action) { return this.bindings[action]?.some(c => this.keys.has(c)); }

  // despacha una acción lógica (resuelta desde la tecla pulsada)
  doAction(action, e) {
    const g = this.game;
    // abrir un panel cancela SIN coste la carga o el canal mantenido (§3.6.1)
    if (PANEL_ACTIONS.has(action)) g.cancelHeld?.('panel');
    switch (action) {
      case 'inventory': g.ui.togglePanel('inv'); break;
      case 'skills': g.ui.togglePanel('skills'); break;
      case 'character': g.ui.togglePanel('stats'); break;
      // talentos (KeyN, convención de WoW): panel de js/ui-talents.js (Paso 2d); sin
      // especialización a partir del Nv10 abre directamente la pantalla de elección
      case 'talents': g.ui.openTalents(); break;
      // Paso 2d.2: atajos del micromenú
      case 'paragon': g.ui.microAction('paragon'); break;
      case 'quests': g.ui.microAction('quest'); break;
      case 'collection': g.ui.microAction('collection'); break;
      case 'guide': g.ui.microAction('guide'); break;
      case 'cleanHud': g.ui.toggleCleanHud(); break;
      case 'potionHP': g.player?.usePotion('hp'); break;
      case 'potionMP': g.player?.usePotion('mp'); break;
      case 'primary': e?.preventDefault(); g.primaryAction(); break;
      case 'dodge': g.player?.dodge(); break;
      case 'grab': g.grabNearest(); break;
      case 'map': e?.preventDefault(); g.ui.activePanel === 'map' ? g.ui.closePanel() : g.ui.openMap(); break;
      // Esc: cierra el panel abierto; sin panel, abre las Opciones (convención de D4)
      case 'close': g.ui.escape(); break;
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
    this.game.ui?.refreshKeyLabels?.();
  }

  // restaura los controles por defecto
  resetBindings() {
    this.bindings = mergeBindings({});
    this.codeToAction = buildCodeMap(this.bindings);
    this.game.settings.bindings = null;
    this.game.saveSettings?.();
    this.game.ui?.refreshKeyLabels?.();
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
    this._canvasPress = true;
    const scheme = g.settings?.controlScheme || 'wasd';

    // --- esquema WASD+ratón: el ratón NO mueve; clic izq/der lanzan habilidades ---
    if (scheme !== 'click') {
      e.preventDefault();
      this.syncButtons(e, { fromDown: true });
      return;
    }
    // --- esquema clic-mover (D2): el botón DERECHO lanza la ranura DER ---
    const onlyRight = e.button === 2;
    this.syncButtons(e, { fromDown: true });
    if (onlyRight) { e.preventDefault(); return; }

    // ¿clic sobre un enemigo?
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
    const p = this.groundPoint(e);
    if (p) {
      g.player.moveTarget = p;
      g.player.attackTarget = null;
      g.player.pickTarget = null;
    }
  }

  onPointerMove(e) {
    this.mouseScreen = { x: e.clientX, y: e.clientY };
    this.mouseWorld = this.groundPoint(e);
    if (this._canvasPress) this.syncButtons(e);
    if (this.pointerDown && this.game.player?.alive) {
      const p = this.groundPoint(e);
      if (p && this.game.player.moveTarget) this.game.player.moveTarget = p;
    }
  }

  // suelta SOLO los botones que ya no están pulsados (con el acorde, el otro sigue)
  onPointerUp(e) {
    if (this._canvasPress && typeof e?.buttons === 'number') this.syncButtons(e);
    else { this.mouseHeld.l = this.mouseHeld.r = false; this._canvasPress = false; }
    if (!this.mouseHeld.l && !this.mouseHeld.r) this.pointerDown = false;
  }
}
