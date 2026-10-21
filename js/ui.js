// ============================================================
// Interfaz: HUD, inventario, árbol de habilidades, paneles
// ============================================================
import * as THREE from 'three';
import { CLASSES, STAT_NAMES, STAT_DESC, TIER_LEVELS, PACTS, ENEMIES, ELITE_MODS, SUPPORTS, ZONE_LIST, xpForLevel, POTION_PRICES, PET_PRICE, PET_KINDS, PET_UPGRADES, PET_COLLARS, paragonBoardFor, PARAGON_CATS, PARAGON_BOARD_SIZE } from './data.js';
// Paso 2b.0: números finales de las habilidades (coste/CD/soportes) desde el resolvedor único
import { resolveSkill, supportFits, supportSockets, fitsSlot, profileSummary, isKnown, RANK_MAX, GCD } from './skill-resolve.js';
import { RARITIES, SLOT_NAMES, SETS, LEGENDARY_POWERS, RUNES, RUNEWORDS, itemStatLines, statText, glyphValue } from './items.js';
import { BINDABLE_ACTIONS, keyLabel } from './bindings.js';
import { materialStackKey } from './entities.js';
import { SYSTEMS_GUIDE, SKILL_MODS } from './data.js';
import { CAPS, CRIT_MULT, armorReduction, tormentMods, areaLevelForHero } from './combat-math.js';
// Paso 2d: panel de talentos (módulo propio), indicador de especialización y modelo puro del HUD
import * as Talents from './talents.js';
import { createTalentPanel } from './ui-talents.js';
import { gaugeView } from './spec-mechanics.js';
import { createGaugeHud } from './ui-gauges.js';
import * as HM from './hud-model.js';

const $ = (id) => document.getElementById(id);

// ============================================================
// Set de iconos SVG (sprite inline en index.html, símbolos #ic-...).
// Monocromos y teñibles por CSS (currentColor). Helper icon(name) que
// genera <svg><use href="#ic-name"/></svg>; si el símbolo no existe en el
// sprite, hace fallback a un texto/emoji para no romper la lectura.
// ------------------------------------------------------------
// símbolos disponibles en el sprite (debe coincidir con index.html)
const ICON_SET = new Set([
  'bag', 'book', 'hero', 'cart', 'gear', 'eye', 'eye-off', 'map', 'chart',
  'scroll', 'book-open', 'sword', 'dash', 'hand', 'potion', 'search', 'broom',
  'sort', 'recycle', 'close', 'str', 'dex', 'vit', 'ene', 'crit', 'blood',
  'mana', 'thorns', 'shield', 'boot', 'clover', 'hourglass', 'target', 'skull',
  'star', 'crown', 'mask', 'pit', 'portal', 'chest', 'coin', 'clock', 'grave',
  'village', 'camp', 'leaf', 'lock', 'vortex', 'flask', 'gem', 'anvil', 'chat',
  'medal', 'globe', 'trophy', 'dice', 'question', 'warn', 'link', 'save',
  'copy', 'import', 'sun', 'speaker', 'music', 'shake', 'phone', 'rocket',
  'palette', 'text', 'bulb', 'paint', 'magic', 'play', 'trash', 'plus',
  'check', 'gift', 'wolf', 'fav',
]);

// genera el marcado de un icono. opts: { cls, title, size, fallback }
// Devuelve una cadena HTML lista para insertar en innerHTML.
function icon(name, opts = {}) {
  const { cls = '', title = '', size = 0, fallback = '' } = opts;
  if (!ICON_SET.has(name)) {
    // fallback accesible: texto/emoji entre <span> con título
    const t = title ? ` title="${title}"` : '';
    return `<span class="ui-ico-fallback ${cls}"${t} aria-hidden="true">${fallback || '•'}</span>`;
  }
  const sz = size ? ` style="width:${size}px;height:${size}px"` : '';
  const t = title ? ` title="${title}"` : '';
  const a = title ? ` role="img" aria-label="${title}"` : ' aria-hidden="true"';
  return `<svg class="ui-ico ${cls}"${sz}${t}${a}><use href="#ic-${name}"/></svg>`;
}

// glifo de rareza: la rareza no depende solo del color (accesibilidad).
// SVG monocromo teñido por color de rareza (vía currentColor en el contenedor).
const RARITY_ICON = { normal: '', magico: 'magic', raro: 'gem', legendario: 'star', conjunto: 'crown' };
const RARITY_GLYPH = { normal: '', magico: '✦', raro: '◆', legendario: '★', conjunto: '❖' };
// icono guía de cada ranura vacía (ayuda a saber qué va en cada hueco)
const SLOT_ICON = {
  weapon: '🗡️', offhand: '🛡️', helm: '🪖', shoulders: '🎽',
  chest: '🧥', gloves: '🧤', belt: '🔗', pants: '👖',
  boots: '🥾', amulet: '📿', ring: '💍', ring2: '💍',
};
const HOVER_TOOLTIP = true; // solo PC: la ficha de objeto sale al pasar el ratón

// contexto de cada estadística derivada (qué hace) — se muestra como tooltip
// en la hoja de personaje para que el jugador entienda su build.
const DERIVED_DESC = {
  dmg: 'Daño por golpe de tu arma + atributos. Base de todo tu daño.',
  crit: `Probabilidad de golpe crítico (×${CRIT_MULT} de daño). Tope ${CAPS.crit}% contando los bonus de habilidades y soportes.`,
  lph: 'Vida que recuperas cada vez que golpeas a un enemigo.',
  mph: 'Maná que recuperas cada vez que golpeas a un enemigo.',
  thorns: 'Daño que devuelves a quien te golpea cuerpo a cuerpo.',
  maxHP: 'Vida máxima. Al llegar a 0 mueres.',
  maxMP: 'Maná máximo. Lo gastan tus habilidades.',
  arm: `Reduce el daño FÍSICO recibido. Rinde menos contra enemigos de más nivel de área; tope ${CAPS.armor}%.`,
  aspd: `Ataques por segundo de tu ataque básico. Tope +${CAPS.aspd}% de velocidad de ataque.`,
  spd: `Velocidad de movimiento. Tope +${CAPS.spd}%.`,
  mf: 'Hallazgo mágico: sube la probabilidad de botín raro y legendario.',
  cdr: `Reducción de enfriamiento: tus habilidades se recargan más rápido. Tope ${CAPS.cdr}% sumando soportes y modificadores.`,
};

export class UI {
  constructor(game) {
    this.game = game;
    this.floats = [];
    this.labelMap = new Map();
    this._v = new THREE.Vector3();
    this.activePanel = null;
    this.drag = null;
    // brújula de objetivos fuera de pantalla (goblin del tesoro / jefe de mundo)
    this._compass = new Map();      // id -> { el, alpha }
    this._cv = new THREE.Vector3(); // vector auxiliar reutilizable (proyección)
    this._onDragMove = this.onDragMove.bind(this);
    this._onDragUp = this.onDragUp.bind(this);
    this.altHeld = false;           // Alt mantenido (input.js): tooltips del HUD en combate
    this.hoverEnemy = null;         // enemigo bajo el cursor (marco del objetivo, mecánica)
    this.bindHUD();
    // Paso 2d.2: escala del HUD (--s) y verificación de solapes (?hudcheck=1)
    this.applyHudScale();
    window.addEventListener('resize', () => this.applyHudScale());
    if (/[?&]hudcheck=1(&|$)/.test(location.search)) setTimeout(() => this.hudCheck(), 600);
    // Paso 2d
    this.initTalentPanel();
    this.preloadMapSprites();
    this.decoratePanels();
  }

  // ============================================================
  // Paso 2d · talentos, iconos pintados y marcos
  // ============================================================
  // Panel de talentos (js/ui-talents.js). Las mutaciones van por el mixin
  // game-talents.js (recompute + barra ↔ activas concedidas + guardado); el panel
  // solo comprueba canEdit antes y repinta después.
  initTalentPanel() {
    const g = this.game;
    const quiet = (fn) => (...a) => { g._talentQuiet = true; try { return fn(...a) || { ok: false }; } finally { g._talentQuiet = false; } };
    const ops = {
      addRank: quiet((p, which, id) => g.addTalentRank(which, id)),
      removeRank: quiet((p, which, id) => g.removeTalentRank(which, id)),
      setChoice: quiet((p, which, id, k) => g.chooseTalentOption(id, k)),
      toggleChoice: quiet((p, which, id) => g.toggleTalentChoice(which, id)),
      chooseSpec: quiet((p, specId) => g.chooseSpec(specId)),
      applyPresetAll: quiet(() => g.applyTalentPreset('all')),
      resetAll: quiet(() => g.resetTalentTree('all')),
      importCode: quiet((p, code) => g.importTalentCode(code)),
    };
    try {
      this.talentPanel = createTalentPanel(document.body, {
        api: Talents, ops, assetBase: 'assets/',
        getPlayer: () => g.player,
        onClose: () => this.closePanel(),
        canEdit: () => g.canEditTalents?.() || null,
        // el mixin ya hizo recompute + guardado; aquí solo se refresca el HUD
        onChange: () => { this.refreshHotbar(); this.updateHUD(); },
      });
    } catch (e) { console.error('[talentos] no se pudo crear el panel', e); this.talentPanel = null; }
  }

  // N: abre el panel de talentos (o la elección de especialización si aún no hay)
  openTalents() {
    if (!this.talentPanel) return;
    if (this.activePanel === 'talents') { this.closePanel(); return; }
    const p = this.game.player;
    if (p && p.level >= Talents.TALENT_START_LEVEL && !Talents.activeSpec(p)) { this.openSpecChoice(); return; }
    this.togglePanel('talents');
  }
  openSpecChoice() {
    if (!this.talentPanel) return;
    this.closePanel();
    this.activePanel = 'talents';
    this.markJustOpened();
    this.talentPanel.showSpecChoice();
  }

  // aviso de especialización pendiente (Nv10): banner fijo + apertura automática de
  // la pantalla de elección la primera vez que estás fuera de combate y sin paneles
  updateSpecPrompt(p) {
    const el = $('spec-prompt'); if (!el) return;
    const need = !!p && p.level >= Talents.TALENT_START_LEVEL && !Talents.activeSpec(p);
    el.classList.toggle('hidden', !need || this.activePanel === 'talents');
    if (!need) { this._specAutoShown = false; return; }
    if (!this._specAutoShown && this.game.state === 'play' && !this.activePanel && !this.game.canEditTalents?.()) {
      this._specAutoShown = true;
      this.message('🌿 ¡Nivel 10! Elige tu especialización: define tu rol, abre su árbol de talentos y te da su habilidad insignia (ranura 3).', 5000);
      this.openSpecChoice();
    }
  }

  // sprites del mapa: se cargan UNA vez; si alguno falla, el mapa usa el punto de siempre
  preloadMapSprites() {
    this.mapSprites = {};
    for (const name of HM.MAP_SPRITES) {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => { img._ok = true; };
      img.onerror = () => { img._ok = false; };
      img.src = HM.mapIcon('mk_' + name);
      this.mapSprites[name] = img;
    }
  }
  _sprite(name) { const im = name && this.mapSprites?.[name]; return im && im._ok && im.naturalWidth ? im : null; }

  // iconos de menú pintados en las cabeceras de los paneles (#panel-<id> → menu_*),
  // con el SVG de siempre como respaldo si la imagen no carga
  decoratePanels() {
    for (const panel of document.querySelectorAll('.panel[id^="panel-"]')) {
      const id = panel.id.slice(6);
      const src = HM.menuIcon(id);
      const h2 = panel.querySelector('.panel-head h2');
      if (!src || !h2 || h2.querySelector('.head-img')) continue;
      const svg = h2.querySelector('.head-ico');
      const img = document.createElement('img');
      img.className = 'head-img'; img.alt = ''; img.draggable = false; img.src = src;
      img.onerror = () => { img.remove(); svg?.classList.remove('hidden'); };
      if (svg) { svg.classList.add('hidden'); svg.before(img); } else h2.prepend(img);
    }
  }

  // ---------- arrastrar y soltar (Pointer Events) ----------
  // Cada celda lleva data-zone / data-key. Las celdas con objeto son
  // arrastrables; todas son destinos válidos. Un clic sin arrastre = acción.
  bindCell(div, desc, tapFn) {
    div.dataset.zone = desc.zone;
    div.dataset.key = desc.key;
    div._tapFn = tapFn;
    if (desc.item) {
      div.addEventListener('pointerdown', (e) => this.dragStart(e, div, desc, tapFn));
      // ficha del objeto al pasar el ratón
      if (HOVER_TOOLTIP) {
        div.addEventListener('pointerenter', (e) => { if (!this.drag) this.showItemTooltip(desc.item, e.clientX, e.clientY); });
        div.addEventListener('pointermove', (e) => { if (!this.drag) this.moveTooltip(e.clientX, e.clientY); });
        div.addEventListener('pointerleave', () => this.hideItemTooltip());
      }
    } else if (tapFn) {
      div.addEventListener('click', tapFn);
    }
  }

  dragStart(e, div, desc, tapFn) {
    if (e.button != null && e.button !== 0) return;
    e.preventDefault();
    this.hideItemTooltip();
    this.drag = { desc, div, tapFn, sx: e.clientX, sy: e.clientY, moved: false, ghost: null, id: e.pointerId };
    window.addEventListener('pointermove', this._onDragMove);
    window.addEventListener('pointerup', this._onDragUp);
    window.addEventListener('pointercancel', this._onDragUp);
  }

  onDragMove(e) {
    const d = this.drag;
    if (!d || e.pointerId !== d.id) return;
    const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
    if (!d.moved && Math.hypot(dx, dy) > 8) {
      d.moved = true;
      const ghost = document.createElement('div');
      ghost.className = 'drag-ghost';
      ghost.innerHTML = d.div.innerHTML;
      document.body.appendChild(ghost);
      d.ghost = ghost;
      d.div.classList.add('dragging-src');
    }
    if (d.moved) {
      d.ghost.style.left = e.clientX + 'px';
      d.ghost.style.top = e.clientY + 'px';
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const cell = el && el.closest('[data-zone]');
      if (cell !== this._dropCell) {
        this._dropCell?.classList.remove('drop-hover');
        this._dropCell = cell && cell !== d.div ? cell : null;
        this._dropCell?.classList.add('drop-hover');
      }
    }
  }

  onDragUp(e) {
    const d = this.drag;
    if (!d || e.pointerId !== d.id) return;
    window.removeEventListener('pointermove', this._onDragMove);
    window.removeEventListener('pointerup', this._onDragUp);
    window.removeEventListener('pointercancel', this._onDragUp);
    this.drag = null;
    d.div.classList.remove('dragging-src');
    this._dropCell?.classList.remove('drop-hover');
    this._dropCell = null;
    if (d.ghost) d.ghost.remove();
    if (!d.moved) { if (d.tapFn) d.tapFn(); return; } // fue un clic, no un arrastre
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const cell = el && el.closest('[data-zone]');
    if (cell) {
      const raw = cell.dataset.key;
      const dst = { zone: cell.dataset.zone, key: /^\d+$/.test(raw) ? +raw : raw };
      this.game.moveItem(d.desc, dst);
    }
    this.renderPanel();
    this.updateHUD();
  }

  bindHUD() {
    const g = this.game;
    const tap = (id, fn) => $(id)?.addEventListener('click', e => { e.preventDefault(); fn(); });
    tap('btn-pot-hp', () => { g.player?.usePotion('hp'); this.updateHUD(); });
    tap('btn-pot-mp', () => { g.player?.usePotion('mp'); this.updateHUD(); });
    tap('btn-dodge', () => g.player?.dodge());
    for (const id of ['btn-pot-hp', 'btn-pot-mp', 'btn-dodge']) $(id)?.addEventListener('pointerdown', e => e.preventDefault());
    $('minimap').addEventListener('click', () => this.openMap());
    // micromenú (abajo a la derecha): cada botón hace lo mismo que su tecla
    document.querySelectorAll('#hud-micro .mb').forEach(b => b.addEventListener('click', () => this.microAction(b.dataset.micro)));
    $('spec-prompt')?.addEventListener('click', () => this.openSpecChoice());
    // alas de beneficios y perjuicios: ficha al pasar el ratón (fuera de combate o con Alt)
    for (const id of ['buff-wing', 'debuff-wing']) {
      const wing = $(id); if (!wing) continue;
      wing.addEventListener('pointerover', e => { const c = e.target.closest?.('.buff'); if (c?._buff) this.showHudTip(this.buffTipHTML(c._buff), c); });
      wing.addEventListener('pointerout', e => { if (!e.relatedTarget || !wing.contains(e.relatedTarget)) this.hideHudTip(); });
    }
    $('btn-identify').addEventListener('click', () => g.identifyAll());
    $('btn-junk').addEventListener('click', () => g.sellJunk());
    $('btn-sort').addEventListener('click', () => g.sortInventory());
    document.querySelectorAll('.panel-close').forEach(b => b.addEventListener('click', () => this.closePanel()));
    $('btn-collection').addEventListener('click', () => this.openCollection());
    $('btn-respawn').addEventListener('click', () => g.respawn());
    this.refreshKeyLabels();

    // cerrar panel/popup al hacer clic fuera (paneles flotantes, no el de
    // bendición que obliga a elegir). Se registra en captura para detectar el
    // origen real del clic; el sello _justOpened evita que el mismo gesto que
    // abre lo cierre.
    document.addEventListener('pointerdown', (e) => this.onOutsidePointer(e), true);
  }

  // ============================================================
  // Paso 2d.2 · HUD de PC (docs/paso2d2-hud-pc.md §2)
  // ============================================================
  // --s del HUD: HM.hudLayout(ancho, alto, Escala del HUD) → 1 a 1080p, 0,8 a 768p
  applyHudScale() {
    const L = HM.hudLayout(window.innerWidth, window.innerHeight, this.game.settings?.hudScale || 1);
    if (L.s !== this._hudS) { this._hudS = L.s; document.documentElement.style.setProperty('--s', String(L.s)); }
    document.body.classList.toggle('micro-2', L.microRows === 2);
    this.hudLayout = L;
    return L;
  }

  // acción de un botón del micromenú (o de su tecla)
  microAction(id) {
    switch (id) {
      case 'talents': this.openTalents(); break;
      case 'map': this.activePanel === 'map' ? this.closePanel() : this.openMap(); break;
      case 'quest': this.activePanel === 'quest' ? this.closePanel() : this.openQuest(); break;
      case 'collection': this.activePanel === 'collection' ? this.closePanel() : this.openCollection(); break;
      case 'guide': this.activePanel === 'guide' ? this.closePanel() : this.openGuide(); break;
      case 'paragon': this.activePanel === 'paragon' ? this.closePanel() : this.openParagon(); break;
      case 'settings': this.togglePanel('settings'); break;
      default: this.togglePanel(id);
    }
  }
  // Esc: cierra lo que haya abierto; sin nada abierto, abre las Opciones (D4)
  escape() {
    const popupOpen = !$('item-popup').classList.contains('hidden');
    if (this.activePanel || popupOpen) { this.closePanel(); return; }
    if (this.game.state === 'play') this.togglePanel('settings');
  }
  // Z: modo limpio del HUD (persiste en settings)
  toggleCleanHud() {
    const g = this.game;
    g.settings.cleanHud = !g.settings.cleanHud;
    g.saveSettings?.();
    document.body.classList.toggle('hud-clean', !!g.settings.cleanHud);
    this.message(g.settings.cleanHud ? 'Modo limpio activado [Z]' : 'HUD completo [Z]', 1600);
  }
  // teclas visibles del HUD (micromenú, pociones, esquiva) según los atajos remapeados
  refreshKeyLabels() {
    const b = this.game.input?.bindings;
    const lab = (action, fb) => { const c = b?.[action]?.[0]; return c ? keyLabel(c).replace(/^Mayús (izq|der)$/, '⇧') : fb; };
    const MAP = { stats: 'character', inv: 'inventory', skills: 'skills', talents: 'talents', paragon: 'paragon', map: 'map', quest: 'quests', collection: 'collection', guide: 'guide', settings: 'close' };
    for (const m of HM.MICRO_MENU) {
      const btn = document.querySelector(`#hud-micro [data-micro="${m.id}"]`); if (!btn) continue;
      const k = lab(MAP[m.id], '');
      const kb = btn.querySelector('kbd'); if (kb && k) kb.textContent = k;
      btn.title = `${m.label}${k ? ` [${k}]` : ''}`;
    }
    for (const kb of document.querySelectorAll('#hud-bar .hb-kbd[data-key]')) kb.textContent = lab(kb.dataset.key, kb.textContent);
    if (this.game.player) this.refreshHotbar();
  }

  // ---------- tooltip pequeño del HUD (alas) ----------
  buffTipHTML(b) {
    const secs = Math.max(0, Math.ceil(b.remaining || 0));
    const time = secs >= 60 ? `${Math.floor(secs / 60)} min ${secs % 60} s` : `${secs} s`;
    return `<b>${b.name || 'Efecto'}</b>${b.desc || ''}<small>${b.remaining > 0 ? `Quedan ${time}` : ''}</small>`;
  }
  showHudTip(html, anchor) {
    if (document.body.classList.contains('in-combat') && !this.altHeld) return;
    let tip = $('hud-tip');
    if (!tip) { tip = document.createElement('div'); tip.id = 'hud-tip'; document.body.appendChild(tip); }
    tip.innerHTML = html;
    tip.classList.remove('hidden');
    const r = anchor.getBoundingClientRect();
    const w = tip.offsetWidth, h = tip.offsetHeight;
    tip.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left + r.width / 2 - w / 2)) + 'px';
    tip.style.top = Math.max(8, r.top - h - 10) + 'px';
  }
  hideHudTip() { $('hud-tip')?.classList.add('hidden'); }

  // ¿el panel/popup activo debe cerrarse al hacer clic fuera?
  onOutsidePointer(e) {
    const popupOpen = !$('item-popup').classList.contains('hidden');
    // paneles "modales" sin botón de cerrar: no se cierran con un clic fuera
    const modal = this.activePanel === 'blessing' || this.activePanel === 'riftsummary';
    if ((!this.activePanel || modal) && !popupOpen) return;
    // no cerrar con el MISMO gesto que abrió el panel/popup
    if (this._justOpened) return;
    const t = e.target;
    if (t.closest && (
      t.closest('.panel') ||           // dentro de un panel
      t.closest('#item-popup') ||      // dentro del popup de objeto
      t.closest('#item-tooltip') ||    // tooltip de hover
      t.closest('#hud-micro')          // micromenú: abre/alterna paneles
    )) return;
    // si hay popup abierto, ciérralo primero (deja el panel de fondo); si solo
    // hay panel, ciérralo
    if (popupOpen) { $('item-popup').classList.add('hidden'); return; }
    this.closePanel();
  }

  // marca que se acaba de abrir algo: ignora el resto del gesto actual para no
  // cerrarlo en el mismo pointerdown que lo abrió
  markJustOpened() {
    this._justOpened = true;
    clearTimeout(this._justOpenedT);
    this._justOpenedT = setTimeout(() => { this._justOpened = false; }, 350);
  }

  // ---------- selección de héroe y clase ----------
  // onPick(slot, 'continue') · onPick(slot, classId, { hardcore })
  showClassSelect(onPick) {
    const el = $('class-select');
    el.classList.remove('hidden');
    const cont = $('class-cards');
    cont.innerHTML = '';

    // huecos de guardado (3 héroes)
    const metas = this.game.slotMetas();
    let selectedSlot = metas.findIndex(m => !m);
    const slotRow = document.createElement('div');
    slotRow.className = 'slot-row';
    metas.forEach((m, i) => {
      const card = document.createElement('div');
      card.className = 'slot-card' + (!m && i === selectedSlot ? ' sel' : '');
      if (m) {
        const cls = CLASSES[m.classId];
        const dot = m.tint != null ? `<span class="slot-tint" style="background:#${(m.tint).toString(16).padStart(6, '0')}"></span>` : '';
        const nm = m.name && m.name !== cls?.name ? `${m.name} · ` : '';
        card.innerHTML = `<div class="slot-info">${dot}${cls?.icon || '🧍'} <b>${nm}${cls?.name || '?'} Nv ${m.level}</b><small>Piso máx ${m.maxFloor}${m.hardcore ? ' ' + icon('skull', { cls: 'hud-hc', title: 'Hardcore' }) : ''}</small></div>`;
        const play = document.createElement('button');
        play.className = 'slot-play';
        play.innerHTML = `${icon('play')} Jugar`;
        play.onclick = () => { el.classList.add('hidden'); onPick(i, 'continue'); };
        const del = document.createElement('button');
        del.className = 'slot-del';
        del.innerHTML = icon('trash');
        del.title = 'Borrar héroe'; del.setAttribute('aria-label', 'Borrar héroe');
        del.onclick = () => {
          if (confirm('¿Borrar este héroe para siempre? (El alijo compartido se conserva)')) {
            this.game.deleteSlot(i);
            this.showClassSelect(onPick);
          }
        };
        card.append(play, del);
      } else {
        card.innerHTML = `<div class="slot-info">➕ <b>Hueco ${i + 1}</b><small>Nuevo héroe</small></div>`;
        card.onclick = () => {
          selectedSlot = i;
          slotRow.querySelectorAll('.slot-card').forEach(c => c.classList.remove('sel'));
          card.classList.add('sel');
        };
      }
      slotRow.appendChild(card);
    });
    cont.appendChild(slotRow);

    // selector de esquema de control
    {
      const ctrl = document.createElement('div');
      ctrl.className = 'ctrl-select';
      ctrl.innerHTML = `<span class="ctrl-lbl">🖥️ Controles (PC):</span>`;
      const curScheme = this.game.settings?.controlScheme || 'wasd';
      const ctrlOpts = [
        ['wasd', '⌨️ WASD + ratón', 'Mueves con WASD, apuntas con el ratón; clic izq/der y 1-4 lanzan habilidades'],
        ['click', '🖱️ Clic para mover', 'Estilo Diablo II: clic izquierdo mueve y ataca'],
      ];
      for (const [val, label, desc] of ctrlOpts) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'ctrl-opt' + (val === curScheme ? ' sel' : '');
        b.innerHTML = `<b>${label}</b><small>${desc}</small>`;
        b.onclick = () => {
          this.game.settings.controlScheme = val;
          this.game.saveSettings?.();
          ctrl.querySelectorAll('.ctrl-opt').forEach(x => x.classList.remove('sel'));
          b.classList.add('sel');
        };
        ctrl.appendChild(b);
      }
      cont.appendChild(ctrl);
    }

    if (selectedSlot < 0) {
      const full = document.createElement('p');
      full.className = 'dim';
      full.textContent = 'Los 3 huecos están ocupados: borra un héroe para crear otro.';
      cont.appendChild(full);
      return;
    }

    const hc = document.createElement('label');
    hc.className = 'hc-toggle';
    hc.innerHTML = `<input type="checkbox" id="hc-check"> ${icon('skull')} Modo Hardcore — la muerte es permanente`;
    cont.appendChild(hc);

    // personalización del héroe: nombre y color de armadura
    const custom = document.createElement('div');
    custom.className = 'hero-custom';
    custom.innerHTML = `<input type="text" id="hero-name" maxlength="14" placeholder="Nombre de tu héroe (opcional)" autocomplete="off">`;
    const tints = [0x4a90d9, 0xc23b3b, 0x3fae6a, 0xd9b13a, 0x9a52d6, 0xd9772a, 0xcfd2d6, 0x2a2f3a];
    let selTint = tints[0];
    const tintRow = document.createElement('div');
    tintRow.className = 'tint-row';
    tints.forEach((c, i) => {
      const sw = document.createElement('button');
      sw.type = 'button';
      sw.className = 'tint-sw' + (i === 0 ? ' sel' : '');
      sw.style.background = '#' + c.toString(16).padStart(6, '0');
      sw.onclick = () => {
        selTint = c;
        tintRow.querySelectorAll('.tint-sw').forEach(s => s.classList.remove('sel'));
        sw.classList.add('sel');
      };
      tintRow.appendChild(sw);
    });
    custom.appendChild(tintRow);
    cont.appendChild(custom);

    const row = document.createElement('div');
    row.className = 'class-row';
    for (const cls of Object.values(CLASSES)) {
      const card = document.createElement('div');
      card.className = 'class-card';
      card.innerHTML = `
        <div class="class-icon">${cls.icon}</div>
        <div class="class-body">
          <h3>${cls.name}</h3>
          <p>${cls.desc}</p>
          <div class="class-stats">
            ${Object.entries(cls.base).map(([k, v]) => `<span>${STAT_NAMES[k].slice(0, 3).toUpperCase()} ${v}</span>`).join('')}
          </div>
        </div>
        <button>Elegir</button>`;
      card.querySelector('button').onclick = () => {
        el.classList.add('hidden');
        onPick(selectedSlot, cls.id, {
          hardcore: document.getElementById('hc-check')?.checked,
          name: (document.getElementById('hero-name')?.value || '').trim(),
          tint: selTint,
        });
      };
      row.appendChild(card);
    }
    cont.appendChild(row);
  }

  // ---------- HUD de PC (10 Hz desde main.js) ----------
  updateHUD() {
    const p = this.game.player;
    if (!p) return;
    const g = this.game;
    // "Poder del héroe": feedback flotante cuando SUBE (equipar mejor, nivel,
    // paragon, talentos…). Un solo punto de detección, barato (10Hz).
    const pw = p.stats.power || 0;
    if (this._lastPower != null && pw > this._lastPower && g.state === 'play')
      this.spawnText(p.pos, `+${pw - this._lastPower} ⚡ Poder`, 'txt-gold');
    this._lastPower = pw;
    // orbes: el líquido sube/baja por translateY (sin layout)
    const hpPct = Math.max(0, Math.min(100, p.hp / p.stats.maxHP * 100));
    const mpPct = Math.max(0, Math.min(100, p.mp / Math.max(1, p.stats.maxMP) * 100));
    this._setOrb('orb-hp-fill', hpPct);
    this._setOrb('orb-mp-fill', mpPct);
    this._txt('orb-hp-txt', HM.fmtNum(Math.ceil(p.hp)));
    this._txt('orb-mp-txt', HM.fmtNum(Math.ceil(p.mp)));
    // escudos (Barrera, Muro, Piel de Hierro…): tinte y número sobre el orbe de vida
    const sh = Math.round(p.shieldTotal?.() || 0);
    $('orb-hp').classList.toggle('shielded', sh > 0);
    this._txt('orb-hp-sh', sh > 0 ? `🛡 ${HM.fmtNum(sh)}` : '');
    this._pulseOrb('orb-hp', hpPct, this._lastHpPct);
    this._pulseOrb('orb-mp', mpPct, this._lastMpPct);
    this._lastHpPct = hpPct; this._lastMpPct = mpPct;
    // aviso en el orbe de recurso: LLENO solo para recursos que se CONSTRUYEN
    // (Furia, start:0 → gastadores listos) y BAJO cuando no alcanza para gastar
    const mpOrb = $('orb-mp');
    const builder = p.cls.resource?.start === 0;
    mpOrb.classList.toggle('orb-full', builder && mpPct >= 99);
    mpOrb.classList.toggle('orb-low', p.alive && mpPct < 15);
    // orbe del recurso de la clase: líquido, icono res_* y rótulo (Furia ≠ vida: magma y «FURIA»)
    const res = p.cls.resource;
    if (res && this._orbRes !== res.id) {
      this._orbRes = res.id;
      mpOrb.dataset.res = res.id; mpOrb.title = res.name;
      $('btn-pot-mp').dataset.res = res.id;
      $('btn-pot-mp').setAttribute('aria-label', `Poción de ${res.name.toLowerCase()}`);
      this._txt('orb-mp-name', res.name.toUpperCase());
      const ri = $('orb-mp-res'), src = HM.resIcon(res.id);
      if (ri && src) { ri.onerror = () => ri.classList.add('hidden'); ri.onload = () => ri.classList.remove('hidden'); ri.src = src; ri.title = res.name; }
      this.refreshKeyLabels();
    }
    const need = xpForLevel(p.level);
    const xpK = Math.max(0, Math.min(1, p.xp / need));
    const xf = $('xp-fill'); const xt = `scaleX(${xpK.toFixed(4)})`; if (xf.style.transform !== xt) xf.style.transform = xt;
    $('xp-bar').title = `Experiencia: ${HM.fmtNum(p.xp)} / ${HM.fmtNum(need)}`;
    this.updatePlate(p);
    this.updateObjectives(p);
    // oro y fragmentos (sobre el micromenú)
    const frags = (p.materials || []).filter(m => m.kind === 'fragment').reduce((a, m) => a + (m.qty || m.count || 1), 0);
    const goldKey = p.gold + '|' + frags;
    if (this._hudGold !== goldKey) {
      this._hudGold = goldKey;
      $('hud-gold').innerHTML = `<span title="Oro"><img src="${HM.matIcon('gold')}" alt="" draggable="false">${HM.fmtNum(p.gold)}</span>` +
        (frags > 0 ? `<span title="Fragmentos de Pináculo"><img src="${HM.matIcon('fragment')}" alt="" draggable="false">${frags}</span>` : '');
    }
    this.updateZone();
    this._txt('pot-hp-count', String(p.potions.hp)); $('pot-hp-count').classList.toggle('zero', !p.potions.hp);
    this._txt('pot-mp-count', String(p.potions.mp)); $('pot-mp-count').classList.toggle('zero', !p.potions.mp);
    // aviso pulsante cuando la vida es crítica · en combate (R7: el HUD deja pasar los clics)
    document.body.classList.toggle('low-hp', p.alive && hpPct < 30);
    document.body.classList.toggle('in-combat', (p.sinceCombat ?? 99) < 5);
    // esquiva: barrido de enfriamiento
    const dk = p.dodgeCd > 0 ? Math.min(1, p.dodgeCd / (p.dodgeCdMax || 3)) : 0;
    const dov = $('btn-dodge').querySelector('.cd-overlay');
    dov.style.setProperty('--cd-deg', Math.round(dk * 360) + 'deg'); dov.classList.toggle('on', dk > 0);
    const dsec = $('btn-dodge').querySelector('.sk-cd-sec'), dt = HM.cdText(p.dodgeCd); if (dsec.textContent !== dt) dsec.textContent = dt;
    // aviso contextual («F Recoger · …», «Espacio Hablar · …»)
    this.updatePrompt(p);
    // insignias del micromenú (punto rojo si hay puntos por gastar) y panel activo
    const dot = (id, n, what) => { const b = $(id); if (!b) return; b.classList.toggle('on', n > 0); b.parentElement.title = b.parentElement.title.replace(/ · \d+ .*$/, '') + (n > 0 ? ` · ${n} ${what}` : ''); };
    dot('badge-stats', p.statPoints || 0, 'puntos de atributo');
    dot('badge-paragon', p.paragon?.points || 0, 'puntos de Paragon');
    dot('badge-skills', p.skillPoints || 0, 'puntos');
    const tp = g.talentPointsInfo?.() || { cls: 0, spec: 0 };
    dot('badge-talents', p.level >= Talents.TALENT_START_LEVEL ? (Talents.activeSpec(p) ? tp.cls + tp.spec : 1) : 0, 'puntos de talento');
    if (this._microOn !== this.activePanel) {
      this._microOn = this.activePanel;
      document.querySelectorAll('#hud-micro .mb').forEach(b => b.classList.toggle('on', b.dataset.micro === this.activePanel));
    }
    if (this.activePanel === 'shop') this.updateShopTimer();

    // barra de 6 ranuras, mecánica de la especialización, objetivo/jefe y franja superior
    this.updateHoverEnemy();
    this.updateHotbarState(p);
    this.updateSpecGauge(p);
    this.updateTargetFrame(p);
    this.updateTopBand();
    this.updateSpecPrompt(p);

    // brújula de objetivos importantes fuera de pantalla
    this.updateCompass();
    // modo limpio del HUD: oculta lo no esencial (Z u Opciones)
    document.body.classList.toggle('hud-clean', !!g.settings?.cleanHud);

    this.renderBuffs();
  }
  // escribe texto solo si cambia (evita mutaciones del DOM a 10 Hz)
  _txt(id, t) { const el = $(id); if (el && el.textContent !== t) el.textContent = t; }
  _setOrb(id, pct) {
    const el = $(id); if (!el) return;
    const t = `translateY(${(100 - pct).toFixed(1)}%)`;
    if (el.style.transform !== t) el.style.transform = t;
  }

  // placa del héroe: emblema de la especialización (o el icono de la clase), nivel, clase y Tormento
  updatePlate(p) {
    const spec = Talents.activeSpec(p);
    const v = HM.plateView(p, spec);
    const key = [v.title, v.sub, v.emblem, p.hardcore].join('|');
    if (this._plateKey === key) return;
    this._plateKey = key;
    document.documentElement.style.setProperty('--hud-c', v.color);
    $('hud-level').textContent = v.title;
    $('plate-sub').innerHTML = v.sub + (p.hardcore ? ' ' + icon('skull', { cls: 'hud-hc', title: 'Hardcore' }) : '');
    const emb = $('plate-emb');
    emb.innerHTML = v.emblem ? `<img src="${v.emblem}" alt="" draggable="false" onerror="this.parentNode.textContent='${v.icon}'">` : v.icon;
  }

  // misión activa y contratos de zona (arriba a la derecha, bajo el minimapa)
  updateObjectives(p) {
    const tracker = $('quest-tracker');
    let qh = '';
    if (p.quest) {
      const done = p.quest.progress >= p.quest.goal;
      qh = `<b>Misión</b><div>${done ? '¡Completada! Ve con el Capitán' : `${p.quest.desc} <em>${Math.min(p.quest.progress, p.quest.goal)}/${p.quest.goal}</em>`}</div>`;
    }
    if (tracker._h !== qh) { tracker._h = qh; tracker.innerHTML = qh; tracker.style.display = qh ? '' : 'none'; }
    const ct = $('zone-contracts');
    const w = this.game.world;
    let ch = '';
    if (w?.type === 'zone' && w.bounties?.length) {
      ch = `<div class="c-title">Contratos</div>` + w.bounties.map(b => b.done
        ? `<div class="c-row c-done">${icon('check')} ${b.desc}</div>`
        : `<div class="c-row">${b.desc} <b>${Math.min(b.progress, b.goal)}/${b.goal}</b></div>`).join('');
    }
    if (ct._h !== ch) { ct._h = ch; ct.innerHTML = ch; ct.style.display = ch ? '' : 'none'; }
  }

  // zona bajo el minimapa: nombre, Tormento y atajo del mapa
  updateZone() {
    const w = this.game.world, p = this.game.player;
    const name = w?.type === 'town' ? 'Pueblo' : w?.type === 'refuge' ? 'Refugio'
      : w?.type === 'zone' ? (w.biome || 'Zona') : w?.rift ? `Grieta ${w.rift}` : `${w?.biome ? w.biome + ' · ' : ''}Piso ${w?.floor || 1}`;
    const tor = (p?.torment | 0) > 0 ? `Tormento ${HM.roman(p.torment)}` : 'Normal';
    const mk = keyLabel(this.game.input?.bindings?.map?.[0] || 'KeyM');
    const h = `${name}<small>${tor} · <kbd>${mk}</kbd> mapa</small>`;
    const el = $('hud-zone');
    if (el._h !== h) { el._h = h; el.innerHTML = h; }
  }

  // aviso contextual encima de la mecánica: interactuar (Espacio) o recoger (F)
  updatePrompt(p) {
    const g = this.game, el = $('hud-prompt');
    let loot = null;
    if (!g.currentInteract) {
      let bd = 4.5 * 4.5;
      for (const gi of g.groundItems) {
        const k = gi.item?.kind;
        if (k === 'gold' || k === 'potion') continue;
        const d = gi.mesh.position.distanceToSquared(p.pos);
        if (d < bd) { bd = d; loot = gi.item; }
      }
    }
    const b = g.input?.bindings || {};
    const v = HM.promptView({ interact: g.currentInteract, loot, keys: { primary: keyLabel(b.primary?.[0] || 'Space'), grab: keyLabel(b.grab?.[0] || 'KeyF') } });
    const key = v ? `${v.key}|${v.verb}|${v.name}|${v.rarity}` : '';
    if (el._k === key) return;
    el._k = key;
    el.classList.toggle('off', !v);
    if (!v) { el.innerHTML = ''; return; }
    const col = v.rarity && HM.LOOT_COLOR[v.rarity] ? ` style="color:${HM.LOOT_COLOR[v.rarity]}"` : '';
    el.innerHTML = `<kbd>${v.key}</kbd> ${v.verb} · <span class="rar"${col}>${v.name}</span>${v.tag ? ` (${v.tag})` : ''}`;
  }

  // enemigo bajo el cursor (proyección a pantalla, 10 Hz): marco del objetivo y Escarcha (R1)
  updateHoverEnemy() {
    const ms = this.game.input?.mouseScreen, p = this.game.player;
    let best = null;
    if (ms && p && this.game.state === 'play' && !this.activePanel) {
      let bd = Infinity;
      const unit = window.innerHeight / (this.game.frustum || 17); // px por metro (cámara ortográfica)
      for (const e of this.game.enemies) {
        if (!e.alive || e.pos.distanceToSquared(p.pos) > 24 * 24) continue;
        this._cv.copy(e.pos).setY((e.def.scale || 1) * 0.9).project(this.game.camera);
        if (this._cv.z > 1) continue;
        const sx = (this._cv.x * 0.5 + 0.5) * window.innerWidth, sy = (-this._cv.y * 0.5 + 0.5) * window.innerHeight;
        const r = unit * 0.8 * Math.max(0.8, e.def.scale || 1);
        const d = (sx - ms.x) ** 2 + (sy - ms.y) ** 2;
        if (d < r * r && d < bd) { bd = d; best = e; }
      }
    }
    this.hoverEnemy = best;
  }

  // zona de mecánica (520×72) sobre la barra: js/ui-gauges.js la pinta; aquí solo se
  // alimenta con gaugeView(p, { target }) a 10 Hz. Objetivo (R1): bajo el cursor >
  // jefe en combate > el que elija gaugeView. Si la firma no acepta opts, se ignora.
  updateSpecGauge(p) {
    if (!this.gaugeHud) {
      const host = $('spec-gauge');
      if (!host) return;
      // sfx/onReady: opciones del núcleo de ui-gauges (E0); una versión anterior las ignora
      this.gaugeHud = createGaugeHud(host, { getView: () => null, sfx: (n) => this.game.sfx?.(n), onReady: (ids) => this._markReady(ids) });
      try { this.gaugeHud.setAltHeld?.(!!this.altHeld); } catch { /* sin soporte de Alt */ }
    }
    let view = null;
    try { view = gaugeView(p, { target: HM.pickGaugeTarget(this.game.enemies, this.hoverEnemy, p.pos) }); } catch { view = null; }
    this.gaugeHud.update(view ? { ...view, specName: Talents.activeSpec(p)?.name || '' } : null);
    // §3.0: las ranuras de las habilidades «listas» de la mecánica laten
    this._markReady(view?.ready);
  }
  _markReady(ids) {
    const ready = new Set(Array.isArray(ids) ? ids : []);
    const sig = [...ready].join(',');
    if (sig === this._readySig) return;
    this._readySig = sig;
    for (const btn of document.querySelectorAll('#skillbar .skill-btn')) btn.classList.toggle('spec-ready', !!btn.dataset.skill && (ready.has(btn.dataset.skill) || ready.has(btn.dataset.slot))); // ids de habilidad o de ranura
  }

  // marco del objetivo/jefe: el jefe cercano manda; si no, el enemigo bajo el cursor.
  // Jefe: raíles hud_objetivo_marco + aturdimiento (cadena hud_stagger); élite: hud_objetivo_elite
  updateTargetFrame(p) {
    const el = $('target-frame'); if (!el) return;
    const e = HM.pickTargetFrame(this.game.enemies, this.hoverEnemy, p.pos, 30);
    el.classList.toggle('hidden', !e);
    if (!e) { this._tfRef = null; return; }
    const w = this.game.world;
    const v = HM.targetView(e, { floor: w?.type === 'dungeon' ? (w.scaleFloor || w.floor) : 0 });
    if (this._tfRef !== e) {
      this._tfRef = e;
      el.dataset.kind = v.kind;
      el.querySelector('.tf-name').textContent = v.name;
      el.querySelector('.tf-tag').textContent = v.tag;
      this._tfStSig = null;
    }
    const fill = el.querySelector('.bf-hp-fill'), ft = `scaleX(${v.hpPct.toFixed(3)})`;
    if (fill.style.transform !== ft) fill.style.transform = ft;
    const ht = el.querySelector('.bf-hp-txt'); if (ht.textContent !== v.hpTxt) ht.textContent = v.hpTxt;
    const st = HM.staggerBar(e.staggerView?.());
    const sw = el.querySelector('.bf-stagger');
    sw.classList.toggle('hidden', !st);
    let hint = '';
    if (st) {
      sw.dataset.state = st.state;
      const sf = el.querySelector('.bf-st-fill'), stt = `scaleX(${(st.pct / 100).toFixed(3)})`;
      if (sf.style.transform !== stt) sf.style.transform = stt;
      hint = st.state === 'building' || st.state === 'idle' ? `${st.label} · a 100: Quebrantado` : st.label;
    } else if (v.kind === 'elite') {
      const mod = ELITE_MODS.find(m => m.id === e.def.modId);
      hint = mod ? `Afijo: ${mod.name}` : '';
    }
    const hEl = el.querySelector('.tf-hint'); if (hEl.textContent !== hint) hEl.textContent = hint;
    el.classList.toggle('broken', st?.state === 'broken');
    const sts = HM.enemyStatuses(e);
    const sig = sts.map(x => x.id + x.label).join(',');
    if (sig !== this._tfStSig) {
      this._tfStSig = sig;
      el.querySelector('.bf-status').innerHTML = sts.slice(0, 4).map(x => `<span class="st-chip st-${x.id}" title="${x.label}"><img src="${HM.statusIcon(x.id)}" alt="" draggable="false" onerror="this.remove()"><em>${x.label}</em></span>`).join('');
    }
  }

  // franja superior: borde inferior del marco del objetivo, del banner o de la PAUSA.
  // Los números flotantes no suben por encima (nunca tapan la vida del jefe)
  updateTopBand() {
    let band = 0;
    for (const id of ['target-frame', 'hud-banner']) {
      const el = $(id);
      if (el && !el.classList.contains('hidden') && (id !== 'hud-banner' || el.childElementCount)) band = Math.max(band, el.getBoundingClientRect().bottom);
    }
    if (document.body.classList.contains('paused')) { const pi = $('pause-indic'); if (pi) band = Math.max(band, pi.getBoundingClientRect().bottom); }
    band = Math.max(40, Math.round(band)) + 8;
    if (band !== this._topBand) { this._topBand = band; document.documentElement.style.setProperty('--top-band', band + 'px'); }
  }
  // aviso grande en el banner bajo el marco (p. ej. «¡QUEBRANTADO!» del aturdimiento de un jefe)
  announce(text, kind = '', ms = 1600) {
    this.banner(text, ms, 'ann' + (kind ? ' ann-' + kind : ''));
  }
  // banner crítico: un solo renglón bajo el marco del objetivo (el nuevo sustituye al anterior)
  banner(text, ms = 3500, cls = '') {
    const box = $('hud-banner'); if (!box) return;
    box.innerHTML = '';
    const el = document.createElement('div');
    el.className = 'ban' + (cls ? ' ' + cls : '');
    el.textContent = text;
    el.title = text;
    box.appendChild(el);
    clearTimeout(this._banT1); clearTimeout(this._banT2);
    this._banT1 = setTimeout(() => el.classList.add('out'), Math.max(0, ms - 350));
    this._banT2 = setTimeout(() => { el.remove(); this.updateTopBand(); }, ms);
    this.updateTopBand();
  }

  // registro de sistema (abajo a la izquierda): 4 líneas, se atenúan a los 6 s
  syslog(text, hi = false) {
    const box = $('hud-syslog'); if (!box || !text) return;
    const el = document.createElement('div');
    el.className = 'sl' + (hi ? ' hi' : '');
    el.textContent = text;
    box.appendChild(el);
    while (box.children.length > 4) box.firstChild.remove();
    setTimeout(() => el.classList.add('old'), 6000);
    setTimeout(() => el.classList.add('out'), 11400);
    setTimeout(() => el.remove(), 12000);
  }

  // registro de botín y XP (derecha, sobre el micromenú): 6 entradas, color por rareza;
  // el oro y la XP seguidos se suman en la misma línea
  logLoot(item) {
    const e = HM.lootLogEntry(item);
    const box = $('hud-loot');
    if (!e || !box) return;
    const now = performance.now();
    const last = box.lastElementChild;
    if (e.merge && last?._merge === e.merge && now - last._t < 2500 && !last.classList.contains('old')) {
      last._amount += e.amount;
      last.textContent = HM.lootLogEntry({ kind: e.merge, amount: last._amount }).text;
      last._t = now;
      this._fadeLoot(last);
      return;
    }
    const el = document.createElement('div');
    el.className = 'lg lg-' + e.rarity;
    el.style.color = e.color;
    el.textContent = e.text;
    el._merge = e.merge || null; el._amount = e.amount || 0; el._t = now;
    box.appendChild(el);
    while (box.children.length > 6) box.firstChild.remove();
    this._fadeLoot(el);
  }
  _fadeLoot(el) {
    clearTimeout(el._f1); clearTimeout(el._f2); clearTimeout(el._f3);
    el.classList.remove('old', 'out');
    el._f1 = setTimeout(() => el.classList.add('old'), 3000);
    el._f2 = setTimeout(() => el.classList.add('out'), 5400);
    el._f3 = setTimeout(() => el.remove(), 6000);
  }

  // ============================================================
  // ?hudcheck=1 (criterio A2 de docs/paso2d2-hud-pc.md §7.1): rellena con contenido
  // de muestra los bloques del HUD que estén vacíos u ocultos (peor caso: jefe con
  // estados, banner, aviso, 4 beneficios y 4 perjuicios, 6 líneas de botín…), mide
  // la caja de cada bloque [data-hud-block] (unión con sus descendientes visibles,
  // recortada por overflow) y vuelca en <pre id="measure"> los solapes entre bloques
  // y con la zona de combate central (56 % × 56 %). Lo mismo que ?measure=1 del mockup.
  // ============================================================
  hudCheck() {
    const g = this.game;
    document.body.classList.add('hudcheck');
    $('class-select')?.classList.add('hidden');
    $('hud').classList.remove('hidden');
    this.applyHudScale();
    const fill = (id, html) => { const el = $(id); if (el && !el.textContent.trim()) el.innerHTML = html; return el; };
    // placa
    if (!g.player) {
      $('hud-level').textContent = 'Nv 42 · Crionte';
      $('plate-sub').textContent = 'Maga · Tormento III';
      $('plate-emb').innerHTML = '<img src="assets/emblems/crionte.webp" alt="">';
    }
    // marco del objetivo: jefe con aturdimiento y 3 estados
    const tf = $('target-frame');
    if (tf.classList.contains('hidden')) {
      tf.classList.remove('hidden'); tf.dataset.kind = 'boss';
      tf.querySelector('.tf-name').textContent = 'Señor del Osario';
      tf.querySelector('.tf-tag').textContent = 'JEFE · PISO 12';
      tf.querySelector('.bf-hp-fill').style.transform = 'scaleX(0.63)';
      tf.querySelector('.bf-hp-txt').textContent = '412 880 / 655 000 · 63 %';
      tf.querySelector('.bf-stagger').classList.remove('hidden');
      tf.querySelector('.bf-st-fill').style.transform = 'scaleX(0.42)';
      tf.querySelector('.tf-hint').textContent = 'Aturdimiento 42 % · a 100: Quebrantado';
      tf.querySelector('.bf-status').innerHTML = ['escarcha:Aterido', 'ralentizado:Ralentizado', 'debilidad:Vulnerable'].map(s => { const [id, l] = s.split(':'); return `<span class="st-chip"><img src="${HM.statusIcon(id)}" alt=""><em>${l}</em></span>`; }).join('');
    }
    fill('hud-banner', '<div class="ban">¡El Señor del Osario prepara Lamento Sepulcral!</div>');
    // derecha: zona, misión y contratos
    fill('hud-zone', 'Cripta de Hueso · Piso 12<small>Tormento III · <kbd>M</kbd> mapa</small>');
    const qt = $('quest-tracker');
    if (qt.style.display === 'none' || !qt.textContent.trim()) { qt.style.display = ''; qt.innerHTML = '<b>Misión</b><div>Destruye los osarios <em>2/3</em></div><div>Derrota al Señor del Osario</div>'; }
    // registros de botín (6) y de sistema (3)
    const loot = $('hud-loot');
    if (!loot.children.length) {
      for (const it of [{ name: 'Anillo de Plata', rarity: 'normal' }, { name: 'Botas del Viajero', rarity: 'magico' }, { kind: 'xp', amount: 1240 },
        { name: 'Báculo Glacial', rarity: 'raro' }, { kind: 'gold', amount: 412 }, { name: 'Yelmo del Coloso', rarity: 'legendario' }]) {
        const e = HM.lootLogEntry(it.kind ? it : { kind: 'item', ...it });
        loot.insertAdjacentHTML('beforeend', `<div class="lg" style="color:${e.color}">${e.text}</div>`);
      }
    }
    fill('hud-syslog', '<div class="sl">Has entrado en Cripta de Hueso.</div><div class="sl">Contrato completado: Purga de esqueletos (+2 fragmentos)</div><div class="sl hi">Nueva activa de talento: Lanza de Hielo (ranura 3) · N</div>');
    fill('hud-gold', `<span><img src="${HM.matIcon('gold')}" alt="">12 340</span><span><img src="${HM.matIcon('fragment')}" alt="">37</span>`);
    // alas: 4 beneficios y 4 perjuicios (una fila de 4 sobre cada orbe)
    const wing = (id, de) => { const w = $(id); if (!w.children.length) w.innerHTML = Array.from({ length: 4 }, (_, i) => `<div class="buff${de ? ' de' : ''}" style="--buff-deg:${90 * (i + 1)}deg"><span class="buff-ico">${de ? '❄️' : '✨'}</span><span class="buff-sec">${5 + i}</span></div>`).join(''); };
    wing('buff-wing', false); wing('debuff-wing', true);
    // aviso contextual y zona de mecánica
    const pr = $('hud-prompt');
    if (pr.classList.contains('off')) { pr.classList.remove('off'); pr.innerHTML = '<kbd>F</kbd> Recoger · <span class="rar" style="color:#ffd24a">Báculo Glacial</span> (Raro)'; }
    const sg = $('spec-gauge');
    if (!sg.childElementCount || sg.classList.contains('hidden')) {
      if (!this.gaugeHud) this.gaugeHud = createGaugeHud(sg, { getView: () => null });
      this.gaugeHud.update({ id: 'escarcha', name: 'Escarcha', value: 3, max: 5, color: '#74cdf2', state: 'building', specName: 'Crionte' });
    }
    // barra: 6 ranuras de muestra si aún no hay héroe
    const bar = $('skillbar');
    if (!bar.children.length) {
      bar.innerHTML = ['k1', 'k2', 'k3', 'k4', 'lmb', 'rmb'].map((s, i) => `<button class="skill-btn slot-${s}"><span class="sk-icon">✦</span>${i < 4 ? `<kbd class="hb-kbd">${i + 1}</kbd>` : `<span class="hb-mouse ${s === 'lmb' ? 'l' : 'r'}"><i></i></span>`}</button>`).join('');
    }
    $('xp-fill').style.transform = 'scaleX(0.62)';
    void document.body.offsetWidth;
    const res = this.measureHud();
    let pre = $('measure');
    if (!pre) { pre = document.createElement('pre'); pre.id = 'measure'; document.body.appendChild(pre); }
    pre.textContent = JSON.stringify(res);
    // contorno de la zona de combate (solo visual)
    let cz = $('hud-combat-zone');
    if (!cz) { cz = document.createElement('div'); cz.id = 'hud-combat-zone'; document.body.appendChild(cz); }
    const [x, y, w, h] = res.box.zonaCombate;
    Object.assign(cz.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });
    return res;
  }

  // cajas (px de pantalla) de cada bloque del HUD + zona de combate y sus solapes
  measureHud() {
    const W = window.innerWidth, H = window.innerHeight;
    const L = this.hudLayout || HM.hudLayout(W, H, this.game.settings?.hudScale || 1);
    const visible = (el) => { const cs = getComputedStyle(el); return cs.display !== 'none' && cs.visibility !== 'hidden'; };
    const rectOf = (block) => {
      let r = block.getBoundingClientRect();
      let [x0, y0, x1, y1] = [r.left, r.top, r.right, r.bottom];
      for (const el of block.querySelectorAll('*')) {
        if (!visible(el)) continue;
        let b = el.getBoundingClientRect();
        if (b.width < 1 || b.height < 1) continue;
        let bx0 = b.left, by0 = b.top, bx1 = b.right, by1 = b.bottom;
        // recorta por los ancestros (dentro del bloque) que ocultan su desborde
        for (let a = el.parentElement; a && a !== block.parentElement; a = a.parentElement) {
          if (getComputedStyle(a).overflow === 'visible') continue;
          const c = a.getBoundingClientRect();
          bx0 = Math.max(bx0, c.left); by0 = Math.max(by0, c.top); bx1 = Math.min(bx1, c.right); by1 = Math.min(by1, c.bottom);
        }
        if (bx1 - bx0 < 1 || by1 - by0 < 1) continue;
        x0 = Math.min(x0, bx0); y0 = Math.min(y0, by0); x1 = Math.max(x1, bx1); y1 = Math.max(y1, by1);
      }
      return [Math.round(x0), Math.round(y0), Math.round(x1 - x0), Math.round(y1 - y0)];
    };
    const box = {};
    for (const el of document.querySelectorAll('#hud [data-hud-block]')) {
      if (!visible(el)) continue;
      box[el.dataset.hudBlock] = rectOf(el);
    }
    box.zonaCombate = L.combat;
    const hit = (a, b, t = 0.5) => a[0] + t < b[0] + b[2] && b[0] + t < a[0] + a[2] && a[1] + t < b[1] + b[3] && b[1] + t < a[1] + a[3];
    const names = Object.keys(box), solapes = [];
    for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) if (hit(box[names[i]], box[names[j]])) solapes.push(names[i] + '×' + names[j]);
    // y nada se sale de la pantalla
    const fuera = names.filter(n => n !== 'zonaCombate' && (box[n][0] < 0 || box[n][1] < 0 || box[n][0] + box[n][2] > W || box[n][1] + box[n][3] > H));
    return { res: W + 'x' + H, s: L.s, microRows: L.microRows, box, solapes, fuera };
  }

  // Pulso del orbe al variar la vida/recurso: escala breve del líquido al ganar
  // o gastar (solo transform). Reinicia la animación cada vez.
  _pulseOrb(id, pct, prev) {
    if (prev == null || this.game.settings?.reduceMotion) return;
    const d = pct - prev;
    if (Math.abs(d) < 1.5) return;
    const el = $(id); if (!el) return;
    const cls = d > 0 ? 'orb-gain' : 'orb-spend';
    el.classList.remove('orb-gain', 'orb-spend');
    void el.offsetWidth;
    el.classList.add(cls);
    clearTimeout(this['_pt_' + id]);
    this['_pt_' + id] = setTimeout(() => el.classList.remove(cls), 380);
  }

  // Destello de subida de nivel: anillo dorado expansivo + rótulo central.
  levelUpFlash(level) {
    if (this.game.settings?.reduceMotion) return;
    let el = $('levelup-flash');
    if (!el) {
      el = document.createElement('div');
      el.id = 'levelup-flash';
      document.body.appendChild(el);
    }
    el.innerHTML = `<div class="lu-ring"></div><div class="lu-text">¡NIVEL ${level}!</div>`;
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
    clearTimeout(this._luTimer);
    this._luTimer = setTimeout(() => el.classList.remove('show'), 1500);
  }

  // ---------- brújula / indicador de borde ----------
  // Proyecta objetivos importantes a pantalla; si están FUERA de la vista,
  // muestra una flecha+icono clampada al borde que apunta hacia ellos. Cuando el
  // objetivo entra en pantalla la flecha se desvanece y desaparece.
  // No invasiva: pequeña, semitransparente, se atenúa con suavidad.
  updateCompass() {
    const cont = $('compass');
    if (!cont) return;
    const w = this.game.world;
    const targets = [];
    if (w?.goblin?.alive) targets.push({ id: 'goblin', e: w.goblin, icon: '🪙', cls: 'cmp-goblin' });
    if (w?.worldBoss?.alive) targets.push({ id: 'boss', e: w.worldBoss, icon: '👑', cls: 'cmp-boss' });
    const seen = new Set();
    const W = window.innerWidth, H = window.innerHeight;
    const cx = W / 2, cy = H / 2;
    const pad = 26;            // separación del borde
    for (const t of targets) {
      seen.add(t.id);
      let rec = this._compass.get(t.id);
      if (!rec) {
        const el = document.createElement('div');
        el.className = 'compass-arrow ' + t.cls;
        el.innerHTML = `<span class="cmp-ico">${t.icon}</span><span class="cmp-tip">➤</span>`;
        cont.appendChild(el);
        rec = { el, alpha: 0 };
        this._compass.set(t.id, rec);
      }
      // proyecta la posición del mundo a pantalla
      this._cv.copy(t.e.pos).setY(1.4).project(this.game.camera);
      const behind = this._cv.z > 1;
      let sx = (this._cv.x * 0.5 + 0.5) * W;
      let sy = (-this._cv.y * 0.5 + 0.5) * H;
      // ¿está dentro de la vista (y delante de la cámara)?
      const onScreen = !behind && sx >= pad && sx <= W - pad && sy >= pad && sy <= H - pad;
      let target = 0;
      if (!onScreen) {
        target = 1;
        // si está detrás de la cámara, invierte la dirección proyectada
        if (behind) { sx = W - sx; sy = H - sy; }
        // ángulo desde el centro hacia el objetivo, clampado al rectángulo
        const dx = sx - cx, dy = sy - cy;
        const ang = Math.atan2(dy, dx);
        const hx = (W / 2 - pad), hy = (H / 2 - pad);
        // intersección rayo-rectángulo
        const tx = Math.abs(Math.cos(ang)) < 1e-4 ? Infinity : hx / Math.abs(Math.cos(ang));
        const ty = Math.abs(Math.sin(ang)) < 1e-4 ? Infinity : hy / Math.abs(Math.sin(ang));
        const tt = Math.min(tx, ty);
        const ex = cx + Math.cos(ang) * tt, ey = cy + Math.sin(ang) * tt;
        rec.el.style.transform =
          `translate(-50%, -50%) translate(${ex}px, ${ey}px) rotate(${ang}rad)`;
        // el icono se mantiene derecho (contra-rota la inclinación del contenedor)
        rec.el.style.setProperty('--cmp-rot', ang + 'rad');
      }
      // atenuación suave (aparece/desaparece sin parpadeos)
      rec.alpha += (target - rec.alpha) * 0.25;
      rec.el.style.opacity = rec.alpha < 0.02 ? '0' : (rec.alpha * 0.78).toFixed(3);
      rec.el.style.display = rec.alpha < 0.02 ? 'none' : '';
    }
    for (const [id, rec] of this._compass) {
      if (!seen.has(id)) { rec.el.remove(); this._compass.delete(id); }
    }
  }

  // ---------- alas de beneficios y perjuicios (sobre los orbes) ----------
  // cada efecto: { id, name, icon, remaining, total, desc } (segundos · icon=emoji).
  // Cuadros de 34 px con anillo de tiempo; ficha al pasar el ratón (fuera de combate o con Alt)
  renderBuffs() {
    const L = $('buff-wing'), R = $('debuff-wing');
    if (!L || !R) return;
    const p = this.game.player;
    const list = (p && p.activeBuffs?.()) || [];
    // escudos activos (Paso 2d): se muestran con el icono de estado st_escudo
    if (p?.shields?.length) {
      const amt = Math.round(p.shieldTotal?.() || 0), t = Math.max(...p.shields.map(x => x.t || 0));
      if (amt > 0) list.push({ id: 'shield', name: 'Escudo', icon: '🛡️', remaining: t, total: Math.max(t, this._shieldTotal = Math.max(this._shieldTotal || 0, t)), desc: `Absorbe ${HM.fmtNum(amt)} de daño`, debuff: false });
    } else this._shieldTotal = 0;
    const { buffs, debuffs } = HM.splitBuffs(list);
    this._renderWing(L, buffs.slice(0, 8), false);
    this._renderWing(R, debuffs.slice(0, 8), true);
  }
  _renderWing(wing, list, de) {
    const seen = new Set();
    for (const b of list) {
      seen.add(b.id);
      let cell = wing.querySelector(`.buff[data-id="${b.id}"]`);
      if (!cell) {
        cell = document.createElement('div');
        cell.className = 'buff' + (de ? ' de' : '');
        cell.dataset.id = b.id;
        cell.innerHTML = `<span class="buff-ico"></span><span class="buff-sec"></span>`;
        wing.appendChild(cell);
      }
      cell._buff = b;
      const stIco = HM.playerStatusIcon(b);
      const icoEl = cell.querySelector('.buff-ico');
      const want = stIco ? 'img:' + stIco : 'txt:' + (b.icon || '✨');
      if (icoEl.dataset.v !== want) {
        icoEl.dataset.v = want;
        if (stIco) icoEl.innerHTML = `<img src="${stIco}" alt="" draggable="false">`;
        else icoEl.textContent = b.icon || '✨';
      }
      const secs = Math.max(0, Math.ceil(b.remaining));
      const st = secs >= 60 ? `${Math.ceil(secs / 60)}m` : String(secs);
      const se = cell.querySelector('.buff-sec'); if (se.textContent !== st) se.textContent = st;
      // anillo de cuenta atrás: se vacía según remaining/total
      const frac = b.total > 0 ? Math.max(0, Math.min(1, b.remaining / b.total)) : 0;
      const deg = Math.round(frac * 36) * 10 + 'deg';
      if (cell._deg !== deg) { cell._deg = deg; cell.style.setProperty('--buff-deg', deg); }
      cell.classList.toggle('expiring', b.remaining <= 3);
    }
    for (const cell of [...wing.children]) if (!seen.has(cell.dataset.id)) cell.remove();
  }

  // ---------- barra de 6 ranuras (Paso 2d, docs/paso2-diseno.md §1.1) ----------
  // lmb básico · rmb gastadora · 1 movilidad (fuera del GCD) · 2 flexible
  // (defensa/utilidad o 2.ª gastadora) · 3 especialización · 4 definitiva.
  // Clic = lanzar; clic DERECHO = asignar (la 2 abre el selector de dos pestañas).
  // Se acepta soltar una habilidad arrastrada desde el libro (respeta fitsSlot).
  slotKeyLabel(slot) {
    if (slot === 'lmb') return 'IZQ';
    if (slot === 'rmb') return 'DER';
    const n = { k1: 1, k2: 2, k3: 3, k4: 4 }[slot];
    const code = this.game.input?.bindings?.['skill' + n]?.[0];
    return code ? keyLabel(code) : String(n);
  }
  // arte de una habilidad: las base tienen su icono pintado (assets/skills, 256 px
  // en assets/skills256); las activas de talento, el sprite de su nodo. El emoji
  // queda de respaldo si la imagen no carga.
  skillArt(sk) {
    if (!sk) return null;
    const p = this.game.player;
    const key = (p?.classId || '') + ':' + sk.id;
    this._artCache = this._artCache || new Map();
    if (!this._artCache.has(key)) {
      const art = sk.kind === 'talent' ? HM.talentSkillArt(Talents.TALENT_TREES[p?.classId], sk.id)
        : { icon: HM.baseSkillIcon(sk), big: HM.baseSkillIcon(sk, true) };
      this._artCache.set(key, art);
    }
    return this._artCache.get(key);
  }
  skillIconHTML(sk, cls = 'sk-icon', { big = false } = {}) {
    const art = this.skillArt(sk);
    const src = art && (big && art.big ? art.big : art.icon);
    if (src) return `<span class="${cls} has-art" data-emoji="${sk.icon || '✦'}"><img class="sk-art" src="assets/${src}" alt="" draggable="false" onerror="const s=this.parentNode;s.classList.remove('has-art');s.textContent=s.dataset.emoji"></span>`;
    return `<span class="${cls}">${sk.icon || '✦'}</span>`;
  }
  catBadgeHTML(cat, cls = 'sk-cat') {
    const src = HM.catIcon(cat);
    return src ? `<img class="${cls}" src="${src}" alt="" title="${HM.catLabel(cat)}" draggable="false" onerror="this.remove()">` : '';
  }

  refreshHotbar() {
    const p = this.game.player;
    const bar = $('skillbar');
    if (!p || !bar) return;
    bar.innerHTML = '';
    this._readySig = null;
    const res = p.cls.resource;
    // Paso 2d.2: orden de D4, 1 2 3 4 | IZQ DER (el ratón a la derecha, junto a la mano que lo usa)
    for (const slot of ['k1', 'k2', 'k3', 'k4', 'lmb', 'rmb']) {
      const label = this.slotKeyLabel(slot);
      const keyHTML = slot === 'lmb' || slot === 'rmb'
        ? `<span class="hb-mouse ${slot === 'lmb' ? 'l' : 'r'}" title="${slot === 'lmb' ? 'Clic izquierdo' : 'Clic derecho'}"><i></i></span>`
        : `<kbd class="hb-kbd">${label}</kbd>`;
      const id = p.hotbar?.[slot] || null;
      const sk = id ? p.cls.skills.find(s => s.id === id) : null;
      const known = sk && isKnown(p, sk);
      const prof = sk ? resolveSkill(p, sk) : null;
      const btn = document.createElement('button');
      btn.className = 'skill-btn slot-' + slot;
      btn.dataset.slot = slot;
      btn.dataset.hbSlot = slot;
      let castFn = null;
      const sec = HM.BOOK_SECTIONS.find(s => s.slots.includes(slot));
      if (!sk) {
        btn.classList.add('hb-empty');
        btn.innerHTML = `<span class="sk-icon dim">+</span><span class="sk-key">${label}</span>` + keyHTML + this.catBadgeHTML(slot === 'k2' ? 'defense' : sec?.cats[0]);
        btn.title = `${label}: ranura vacía — clic derecho para asignar (o arrastra desde el libro de habilidades)`;
      } else {
        btn.dataset.skill = sk.id;
        btn.classList.add('cat-' + sk.cat);
        if (sk.cat === 'basic') btn.classList.add('hb-basic');
        if (sk.kind === 'talent') btn.classList.add('hb-talent');
        if (!known) btn.classList.add('hb-locked');
        const cost = prof?.cost || 0;
        const costHTML = sk.cat === 'basic'
          ? `<span class="sk-cost gen" title="genera ${res?.name || 'recurso'}">+${prof?.gen ?? sk.gen ?? 0}</span>`
          : (cost ? `<span class="sk-cost">${cost}</span>` : '');
        btn.innerHTML = this.skillIconHTML(sk) + this.catBadgeHTML(sk.cat) + `<span class="sk-key">${label}</span>` + keyHTML + costHTML +
          `<div class="gcd-overlay"></div><div class="cd-overlay cd-radial"></div><span class="sk-cd-sec"></span>` +
          (sk.kind === 'talent' ? '<span class="sk-talent-tag">TALENTO</span>' : '');
        const catTxt = HM.catLabel(sk.cat);
        btn.title = !known ? `${sk.name} (se aprende al nivel ${sk.req})`
          : `${sk.name} · ${catTxt}${sk.cat === 'basic' ? ` · genera ${res?.name || 'recurso'}` : cost ? ` · ${cost} ${res?.name || ''}` : ''}${sk.kind === 'talent' ? ' · activa de talento' : ''}\nClic derecho: cambiar`;
        castFn = () => {
          if (!known) { this.message(`${sk.name}: se aprende al nivel ${sk.req}`); return; }
          const v = HM.slotView(p, sk, resolveSkill(p, sk), GCD);
          if (v.noRes && v.cdFrac === 0) this.flashNoMana(btn);
          this.game.castSkillSlot(slot);
        };
      }
      this._bindHotbarSlot(btn, slot, label, castFn);
      bar.appendChild(btn);
    }
  }

  // clic = lanzar (castFn); clic derecho = asignar
  _bindHotbarSlot(btn, slot, label, castFn) {
    btn.addEventListener('contextmenu', e => { e.preventDefault(); e.stopPropagation(); this.hotbarSlotChooser(slot, label); });
    btn.addEventListener('pointerdown', e => { e.preventDefault(); });
    btn.addEventListener('click', e => { if (e.button === 0 && castFn) castFn(); });
  }

  // estado en vivo de la barra (10 Hz desde updateHUD): enfriamiento radial,
  // sombra del GCD (más tenue, en todas las ranuras que lo comparten), coste y recurso
  updateHotbarState(p) {
    const bar = $('skillbar'); if (!bar) return;
    for (const btn of bar.children) {
      const id = btn.dataset.skill;
      if (!id) continue;
      const sk = p.cls.skills.find(s => s.id === id);
      if (!sk) continue;
      const v = HM.slotView(p, sk, resolveSkill(p, sk), GCD);
      const ov = btn.querySelector('.cd-overlay');
      if (ov) { ov.style.setProperty('--cd-deg', Math.round(v.cdFrac * 360) + 'deg'); ov.classList.toggle('on', v.cdFrac > 0); }
      const gv = btn.querySelector('.gcd-overlay');
      if (gv) { gv.style.setProperty('--gcd-deg', Math.round(v.gcdFrac * 360) + 'deg'); gv.classList.toggle('on', v.gcdFrac > 0); }
      const secEl = btn.querySelector('.sk-cd-sec');
      if (secEl) { const t = HM.cdText(v.cdSec); if (secEl.textContent !== t) secEl.textContent = t; }
      if ((btn._lastFrac || 0) > 0 && v.cdFrac === 0) {
        btn.classList.remove('just-ready'); void btn.offsetWidth; btn.classList.add('just-ready');
      }
      btn._lastFrac = v.cdFrac;
      if (sk.cat !== 'basic') {
        const costEl = btn.querySelector('.sk-cost');
        if (costEl && costEl.textContent !== String(v.cost)) costEl.textContent = v.cost;
      }
      btn.classList.toggle('no-mana', v.noRes);
    }
  }

  // popup: elige qué habilidad colocar en una ranura. La 2 es flexible: dos
  // pestañas, «Defensa/utilidad» y «Gastadora» (fitsSlot valida cada candidata)
  hotbarSlotChooser(slot, label = this.slotKeyLabel(slot), tab = null) {
    const g = this.game, p = g.player;
    if (!p) return;
    const pop = $('item-popup');
    this.markJustOpened();
    pop.style.left = pop.style.top = pop.style.transform = '';
    const cur = p.hotbar?.[slot] ? p.cls.skills.find(s => s.id === p.hotbar[slot]) : null;
    const known = (sk) => isKnown(p, sk);
    const after = () => { pop.classList.add('hidden'); this.refreshHotbar(); this.updateHUD(); if (this.activePanel === 'skills') this.renderSkills(); };
    let list, tabsHTML = '';
    if (slot === 'k2') {
      const tabs = HM.k2Tabs(p.cls.skills, { fits: fitsSlot, known });
      const sel = tab || HM.k2TabFor(cur);
      tabsHTML = `<div class="hb-tabs" role="tablist">${tabs.map(t =>
        `<button role="tab" class="hb-tab${t.id === sel ? ' on' : ''}" data-tab="${t.id}" aria-selected="${t.id === sel}">` +
        `<img src="${HM.uiIcon(t.icon)}" alt="" draggable="false">${t.label} <small>${t.skills.length}</small></button>`).join('')}</div>` +
        `<p class="hb-tab-hint">${sel === 'spender' ? 'Más daño: dependes de la esquiva y la movilidad. No puede repetir la de clic derecho.' : 'Aguante: escudos, control y utilidad para el contenido difícil.'}</p>`;
      list = tabs.find(t => t.id === sel)?.skills || [];
    } else list = p.cls.skills.filter(s => known(s) && fitsSlot(s, slot));
    const headCat = cur?.cat || (slot === 'k2' ? 'defense' : HM.BOOK_SECTIONS.find(s => s.slots.includes(slot))?.cats[0]);
    pop.innerHTML = `<div class="popup-name">${this.catBadgeHTML(headCat, 'pop-cat')} Ranura ${label}</div>${tabsHTML}<div class="hb-pick"></div><div class="popup-btns"></div>`;
    const pick = pop.querySelector('.hb-pick');
    if (!list.length) pick.innerHTML = `<div class="dim" style="padding:6px 2px">Aún no conoces habilidades para esta ranura: se aprenden solas al subir de nivel${slot === 'k3' ? ' y con tu especialización (Nv10)' : ''}.</div>`;
    for (const sk of list) {
      const prof = resolveSkill(p, sk);
      const b = document.createElement('button');
      const fromRmb = slot === 'k2' && p.hotbar?.rmb === sk.id;
      b.className = 'hb-pick-row' + (p.hotbar?.[slot] === sk.id ? ' on' : '') + (sk.kind === 'talent' ? ' talent' : '');
      b.innerHTML = this.skillIconHTML(sk, 'hb-pick-ico') + `<span class="hb-pick-txt"><b>${sk.name}</b><small>${profileSummary(prof) || HM.catLabel(sk.cat)}${fromRmb ? ' · se quita de clic derecho' : ''}</small></span>` +
        (sk.kind === 'talent' ? '<span class="sk-talent-tag inline">TALENTO</span>' : '') + this.catBadgeHTML(sk.cat, 'hb-pick-cat');
      b.onclick = () => { g.assignHotbar(slot, sk.id); after(); };
      pick.appendChild(b);
    }
    pop.querySelectorAll('.hb-tab').forEach(t => { t.onclick = (e) => { e.stopPropagation(); this.hotbarSlotChooser(slot, label, t.dataset.tab); }; });
    const btns = pop.querySelector('.popup-btns');
    if (slot !== 'lmb') {
      const clr = document.createElement('button'); clr.textContent = 'Vaciar ranura';
      clr.onclick = () => { g.assignHotbar(slot, null); after(); };
      btns.appendChild(clr);
    }
    const c = document.createElement('button'); c.textContent = 'Cerrar';
    c.onclick = () => pop.classList.add('hidden');
    btns.appendChild(c);
    pop.classList.remove('hidden');
  }

  // parpadeo rojo de una celda de habilidad cuando no hay maná suficiente
  flashNoMana(btn) {
    btn.classList.remove('mana-flash');
    void btn.offsetWidth;   // reinicia la animación
    btn.classList.add('mana-flash');
    this.game.sfx('error');
    setTimeout(() => btn.classList.remove('mana-flash'), 450);
  }

  flashDamage() {
    const el = $('damage-flash');
    el.classList.remove('active');
    void el.offsetWidth;
    el.classList.add('active');
  }

  message(text, ms = 2600) {
    // detección de momentos clave para disparar flourishes (no invasiva: la UI
    // posee message(), así que reaccionamos aquí sin tocar la lógica de juego)
    this.detectFlourish(text);
    // Paso 2d.2: todo queda en el registro de sistema (abajo a la izquierda); los
    // sucesos importantes (avisos largos) además salen en el banner bajo el marco
    const route = HM.messageRoute(text, ms);
    if (route === 'none') return;
    this.syslog(String(text), route === 'banner');
    if (route === 'banner') this.banner(String(text), Math.min(ms, 5000));
  }

  // dispara flourishes según el texto del mensaje (subir de nivel, legendario...)
  detectFlourish(text) {
    if (typeof text !== 'string') return;
    // subir de nivel: "⭐ ¡Nivel N!" o "🌟 ¡Nivel N!" (Paragon)
    if (/¡Nivel\s+\d+/.test(text) && /[⭐🌟]/.test(text)) {
      this.flourishLevelUp();
      return;
    }
    // pieza de conjunto o cualquier mención de legendario/mítico al obtenerlo
    if (/Pieza de conjunto/i.test(text) || /legendari[oa]/i.test(text) || /m[íi]tic[oa]/i.test(text)) {
      // extrae un posible nombre tras ":" o "!" para mostrarlo en el haz
      const m = text.match(/[!:]\s*([^!.]+)$/);
      this.flourishLegendary(m ? m[1].trim() : '');
    }
  }

  // ---------- textos flotantes (daño, xp...) ----------
  // Anti-saturación: los números de daño se AGRUPAN — si ya hay un texto del
  // mismo tipo recién creado cerca del mismo punto, se suma a él en vez de
  // crear otro elemento. Además hay un tope duro de simultáneos.
  spawnText(worldPos, text, cls, opts = {}) {
    // ¿es un número de daño puro? (para agrupar). Conserva firma pública.
    const dmgCls = cls === 'txt-dmg' || cls === 'txt-crit';
    if (dmgCls && this.game.settings?.dmgNumbers === false) return; // toggle: ocultar daño
    const col = opts.color != null
      ? (typeof opts.color === 'number' ? '#' + (opts.color >>> 0).toString(16).padStart(6, '0') : opts.color)
      : null;
    const n = dmgCls ? parseInt(text, 10) : NaN;
    if (dmgCls && !Number.isNaN(n)) {
      for (let i = this.floats.length - 1; i >= 0; i--) {
        const f = this.floats[i];
        if (f.group !== cls || f.t > 0.28) continue;
        if (f.pos.distanceToSquared(worldPos) > 9) continue; // ~3u de radio
        f.sum = (f.sum || f.val || 0) + n;
        f.val = f.sum;
        f.el.textContent = String(f.sum);
        if (opts.big) f.el.classList.add('big-hit'); // si un golpe grande se suma, sube de tamaño
        f.t = 0;                       // reinicia la subida/desvanecido
        f.el.classList.remove('coalesce');
        void f.el.offsetWidth;
        f.el.classList.add('coalesce'); // pequeño "tick" al acumular
        return;
      }
    }
    if (this.floats.length > 36) {
      // satura: recicla el más antiguo en vez de seguir creciendo el DOM
      const old = this.floats.shift();
      old?.el.remove();
    }
    const el = document.createElement('div');
    el.className = 'float-txt ' + cls + (opts.big ? ' big-hit' : '');
    el.textContent = text;
    if (col) { el.style.color = col; if (cls === 'txt-crit') el.style.textShadow = `0 0 10px ${col}, 0 2px 4px #000`; }
    $('floats').appendChild(el);
    this.floats.push({
      el, pos: worldPos.clone().add(new THREE.Vector3(0, 1.6, 0)), t: 0,
      group: dmgCls ? cls : null, val: Number.isNaN(n) ? 0 : n,
    });
  }

  // ---------- flourishes de momentos clave ----------
  // anillo dorado + destello al subir de nivel
  flourishLevelUp() {
    if (this.game.settings?.reduceMotion) return;
    const fx = $('flourish');
    if (!fx) return;
    const ring = document.createElement('div');
    ring.className = 'fl-levelup';
    ring.innerHTML = `<span class="fl-ring"></span><span class="fl-burst"></span><span class="fl-lbl">¡SUBES DE NIVEL!</span>`;
    fx.appendChild(ring);
    setTimeout(() => ring.remove(), 1500);
  }

  // haz + viñeta dorada breve al recoger un legendario/mítico (+ sonido)
  flourishLegendary(name = '') {
    const fx = $('flourish');
    if (!fx) return;
    if (!this.game.settings?.reduceMotion) {
      const fl = document.createElement('div');
      fl.className = 'fl-legendary';
      fl.innerHTML = `<span class="fl-vignette"></span><span class="fl-beam"></span>` +
        (name ? `<span class="fl-name">★ ${name}</span>` : '');
      fx.appendChild(fl);
      setTimeout(() => fl.remove(), 1600);
    }
    try { this.game.sfx?.('levelup'); } catch { /* sin audio */ }
  }

  updateFloats(dt) {
    for (let i = this.floats.length - 1; i >= 0; i--) {
      const f = this.floats[i];
      f.t += dt;
      if (f.t > 0.9) { f.el.remove(); this.floats.splice(i, 1); continue; }
      f.pos.y += dt * 1.2;
      const s = this.worldToScreen(f.pos);
      const y = Math.max(s.y, (this._topBand || 48) + 4); // por debajo de la pausa / marco del jefe
      f.el.style.transform = `translate(${s.x}px, ${y}px)`;
      f.el.style.opacity = String(1 - f.t / 0.9);
    }
  }

  worldToScreen(pos) {
    this._v.copy(pos).project(this.game.camera);
    return {
      x: (this._v.x * 0.5 + 0.5) * window.innerWidth,
      y: (-this._v.y * 0.5 + 0.5) * window.innerHeight,
      behind: this._v.z > 1,
    };
  }

  // ---------- etiquetas de mundo (loot, portales, NPCs) ----------
  // entries: [{ id, pos, text, cls, onClick }]
  syncLabels(entries) {
    const seen = new Set();
    for (const e of entries) {
      seen.add(e.id);
      let rec = this.labelMap.get(e.id);
      if (!rec) {
        const el = document.createElement('div');
        el.className = 'world-label ' + (e.cls || '');
        el.textContent = e.text;
        if (e.onClick) el.addEventListener('pointerdown', ev => { ev.preventDefault(); ev.stopPropagation(); e.onClick(); });
        $('labels').appendChild(el);
        rec = { el };
        this.labelMap.set(e.id, rec);
      }
      const s = this.worldToScreen(e.pos);
      rec.el.style.display = s.behind ? 'none' : '';
      rec.el.style.transform = `translate(-50%, -100%) translate(${s.x}px, ${s.y}px)`;
    }
    for (const [id, rec] of this.labelMap) {
      if (!seen.has(id)) { rec.el.remove(); this.labelMap.delete(id); }
    }
  }

  // ---------- paneles ----------
  togglePanel(name) {
    if (this.activePanel === name) return this.closePanel();
    this.closePanel();
    this.activePanel = name;
    if (name === 'skills') { this._skGrew = false; this._focusSkill = null; } // re-anima la vid al abrir
    if (name === 'talents') { this.talentPanel?.open(); this.markJustOpened(); return; }
    $('panel-' + name).classList.remove('hidden');
    this.markJustOpened();
    this.renderPanel();
  }

  closePanel() {
    $('item-popup').classList.add('hidden');
    if (!this.activePanel) return;
    if (this.activePanel === 'talents') this.talentPanel?.close();
    const panel = $('panel-' + this.activePanel);
    if (panel) panel.classList.add('hidden');
    this.activePanel = null;
  }

  // cierra TODOS los paneles y el popup, dejando un estado limpio (arranque)
  closeAllPanels() {
    document.querySelectorAll('.panel').forEach(p => p.classList.add('hidden'));
    this.talentPanel?.close(); // #talents-panel no lleva .panel (E3·U1)
    $('item-popup').classList.add('hidden');
    $('item-tooltip').classList.add('hidden');
    this.activePanel = null;
  }

  renderPanel() {
    if (this.activePanel === 'inv') this.renderInventory();
    else if (this.activePanel === 'skills') this.renderSkills();
    else if (this.activePanel === 'stats') this.renderStats();
    else if (this.activePanel === 'shop') this.renderShop();
    else if (this.activePanel === 'waypoints') this.renderWaypoints();
    else if (this.activePanel === 'quest') this.renderQuest();
    else if (this.activePanel === 'settings') this.renderSettings();
    else if (this.activePanel === 'stash') this.renderStash();
    else if (this.activePanel === 'collection') this.renderCollection();
    else if (this.activePanel === 'progress') this.renderProgress();
    else if (this.activePanel === 'pet') this.renderPet();
    else if (this.activePanel === 'guide') this.renderGuide();
    else if (this.activePanel === 'paragon') this.renderParagon();
    else if (this.activePanel === 'talents') this.talentPanel?.render();
  }

  openStash() {
    if (this.activePanel !== 'stash') {
      this.closePanel();
      this.activePanel = 'stash';
      $('panel-stash').classList.remove('hidden');
      this.markJustOpened();
    }
    this.renderStash();
  }

  renderStash() {
    const g = this.game, p = g.player;
    const used = g.stash.filter(Boolean).length;
    const tag = $('stash-count');
    if (tag) tag.textContent = `${used}/24`;
    const sg = $('stash-grid');
    sg.innerHTML = '';
    for (let i = 0; i < 24; i++) {
      const item = g.stash[i];
      const div = document.createElement('div');
      div.className = 'inv-cell' + (item ? ' rarity-' + item.rarity : '');
      div.innerHTML = this.itemCellHTML(item);
      if (item) div.title = 'Pasar a la mochila';
      this.bindCell(div, { zone: 'stash', key: i, item }, item ? () => { g.takeFromStash(i); this.renderStash(); } : null);
      sg.appendChild(div);
    }
    const ig = $('stash-inv-grid');
    ig.innerHTML = '';
    for (let i = 0; i < 32; i++) {
      const item = p.inventory[i];
      const div = document.createElement('div');
      div.className = 'inv-cell' + (item ? ' rarity-' + item.rarity : '');
      div.innerHTML = this.itemCellHTML(item);
      if (item) div.title = 'Guardar en el alijo';
      this.bindCell(div, { zone: 'inv', key: i, item }, item ? () => { g.depositToStash(i); this.renderStash(); } : null);
      ig.appendChild(div);
    }
  }

  // catálogo de opciones por categorías (data-driven). Cada item se renderiza
  // con renderOptItem; `kw` ayuda a la búsqueda.
  settingsCategories() {
    const g = this.game;
    return [
      { id: 'graficos', icon: 'eye', label: 'Gráficos', items: [
        { t: 'preset' },
        { t: 'select', key: 'quality', icon: 'rocket', label: 'Calidad gráfica', def: 'auto',
          opts: [['auto', 'Automática'], [0, 'Alta'], [1, 'Media'], [2, 'Baja'], [3, 'Mínima']],
          onChange: (v) => g.setQuality?.(v === 'auto' ? 'auto' : parseInt(v, 10)) },
        { t: 'range', icon: 'eye', label: 'Escala de resolución', min: 50, max: 150, step: 5,
          get: () => Math.round((g.settings.renderScale ?? 1) * 100),
          set: (v) => { g.settings.renderScale = v / 100; g.applyResolution?.(); } },
        { t: 'select', key: 'shadows', icon: 'sun', label: 'Sombras', def: 'auto',
          opts: [['auto', 'Según calidad'], ['off', 'Desactivadas (más FPS)']],
          onChange: () => g.applyQuality?.(g.qualityLevel ?? 0) },
        { t: 'toggle', key: 'postfx', icon: 'magic', label: 'Efectos visuales (bloom, postproceso)', def: true, onChange: () => g.syncPostFX?.() },
        { t: 'toggle', key: 'ao', icon: 'bulb', label: 'Oclusión ambiental', def: true, onChange: () => { g.applyQuality?.(g.qualityLevel ?? 0); g.syncPostFX?.(); } },
        { t: 'toggle', key: 'outline', icon: 'paint', label: 'Contorno', def: true, onChange: () => { g.applyQuality?.(g.qualityLevel ?? 0); g.syncPostFX?.(); } },
        { t: 'toggle', key: 'autoq', icon: 'rocket', label: 'Ajuste dinámico (baja si va lento)', def: true },
        { t: 'toggle', key: 'perfHud', icon: 'bulb', label: 'Mostrar FPS y rendimiento', def: false, onChange: (v) => g.togglePerfHud?.(v) },
        { t: 'range', icon: 'sun', label: 'Brillo', min: 60, max: 170, step: 5,
          get: () => Math.round((g.settings.brightness || 1) * 100),
          set: (v) => { g.settings.brightness = v / 100; g.renderer.toneMappingExposure = g.settings.brightness; } },
      ] },
      { id: 'audio', icon: 'speaker', label: 'Audio', items: [
        { t: 'toggle', key: 'sound', icon: 'speaker', label: 'Sonido (efectos)', def: true },
        { t: 'toggle', key: 'music', icon: 'music', label: 'Música ambiental', def: true, onChange: (v) => g.music.setEnabled(v) },
        { t: 'range', icon: 'speaker', label: 'Volumen maestro', min: 0, max: 100, step: 5,
          get: () => Math.round((g.settings.volMaster ?? 1) * 100),
          set: (v) => { g.settings.volMaster = v / 100; g.applyAudio(); }, onCommit: () => g.sfx('uiclick') },
        { t: 'range', icon: 'music', label: 'Volumen música', min: 0, max: 100, step: 5,
          get: () => Math.round((g.settings.volMusic ?? 0.75) * 100),
          set: (v) => { g.settings.volMusic = v / 100; g.applyAudio(); } },
        { t: 'range', icon: 'speaker', label: 'Volumen efectos', min: 0, max: 100, step: 5,
          get: () => Math.round((g.settings.volSfx ?? 0.9) * 100),
          set: (v) => { g.settings.volSfx = v / 100; }, onCommit: () => g.sfx('uiclick') },
      ] },
      { id: 'controles', icon: 'gear', label: 'Controles', items: [
        { t: 'select', key: 'controlScheme', icon: 'hand', label: 'Esquema de control (PC)', def: 'wasd',
          opts: [['wasd', 'WASD + ratón (apuntar; clic = habilidad)'], ['click', 'Clic para mover (estilo Diablo II)']] },
        { t: 'keybinds' },
      ] },
      { id: 'interfaz', icon: 'eye', label: 'Interfaz', items: [
        { t: 'toggle', key: 'cleanHud', icon: 'eye-off', label: 'HUD limpio (oculta lo no esencial) [Z]', def: false, onChange: () => g.applyAccessibility() },
        { t: 'range', icon: 'plus', label: 'Escala del HUD (%)', min: 70, max: 150, step: 5,
          get: () => Math.round((g.settings.hudScale || 1) * 100),
          set: (v) => { g.settings.hudScale = v / 100; this.applyHudScale(); } },
        { t: 'toggle', key: 'dmgNumbers', icon: 'crit', label: 'Números de daño flotantes', def: true },
        { t: 'toggle', key: 'shake', icon: 'shake', label: 'Sacudida de cámara', def: true },
        { t: 'select', key: 'lootFilter', icon: 'search', label: 'Filtro de loot (mostrar desde)', def: 'normal',
          opts: [['normal', 'Todo'], ['magico', 'Mágico+'], ['raro', 'Raro+'], ['legendario', 'Legendario']] },
      ] },
      { id: 'accesibilidad', icon: 'hero', label: 'Accesib.', items: [
        { t: 'toggle', key: 'reduceMotion', icon: 'target', label: 'Movimiento reducido (menos animaciones)', def: false, onChange: () => g.applyAccessibility() },
        { t: 'toggle', key: 'bigText', icon: 'text', label: 'Texto grande', def: false, onChange: () => g.applyAccessibility() },
        { t: 'toggle', key: 'colorblind', icon: 'palette', label: 'Modo daltónico (colores de rareza seguros)', def: false, onChange: () => g.applyAccessibility() },
      ] },
      { id: 'datos', icon: 'save', label: 'Datos', items: [
        { t: 'button', icon: 'copy', label: 'Copiar código de guardado', desc: 'Incluye tu héroe actual y el alijo', fn: () => g.exportSave() },
        { t: 'button', icon: 'import', label: 'Importar código de guardado', desc: 'Sobrescribe el héroe del hueco actual', fn: () => g.importSave() },
      ] },
    ];
  }

  renderSettings() {
    const cont = $('settings-body');
    this.settingsCat = this.settingsCat || 'graficos';
    cont.innerHTML = '';
    // buscador (no debe disparar acciones del juego: corta la propagación)
    const search = document.createElement('input');
    search.type = 'search'; search.className = 'opt-search'; search.placeholder = '🔍 Buscar opción...';
    search.value = this.settingsQuery || '';
    search.addEventListener('keydown', (e) => e.stopPropagation());
    search.oninput = () => { this.settingsQuery = search.value; this.renderSettingsBody(); };
    cont.appendChild(search);
    // pestañas de categoría
    const tabs = document.createElement('div'); tabs.className = 'opt-tabs';
    for (const cat of this.settingsCategories()) {
      const b = document.createElement('button');
      b.className = 'opt-tab' + (cat.id === this.settingsCat && !this.settingsQuery ? ' on' : '');
      b.innerHTML = `${icon(cat.icon)} <span>${cat.label}</span>`;
      b.onclick = () => { this.settingsCat = cat.id; this.settingsQuery = ''; this.renderSettings(); };
      tabs.appendChild(b);
    }
    cont.appendChild(tabs);
    const body = document.createElement('div'); body.id = 'opt-content';
    cont.appendChild(body);
    this.renderSettingsBody();
  }

  renderSettingsBody() {
    const body = $('opt-content');
    if (!body) return;
    body.innerHTML = '';
    const q = (this.settingsQuery || '').trim().toLowerCase();
    const cats = this.settingsCategories();
    if (q) {
      // búsqueda: muestra todos los items cuya etiqueta coincide, agrupados
      let found = 0;
      for (const cat of cats) {
        const matches = cat.items.filter(it => (it.label || (it.t === 'keybinds' ? 'controles teclas remapeo' : '') || (it.t === 'preset' ? 'presets calidad' : '')).toLowerCase().includes(q));
        if (!matches.length) continue;
        const h = document.createElement('h4'); h.className = 'opt-section'; h.innerHTML = `${icon(cat.icon)} ${cat.label}`;
        body.appendChild(h);
        for (const it of matches) { body.appendChild(this.renderOptItem(it)); found++; }
      }
      if (!found) body.innerHTML = '<p class="dim">Sin resultados.</p>';
      return;
    }
    const cat = cats.find(c => c.id === this.settingsCat) || cats[0];
    for (const it of cat.items) body.appendChild(this.renderOptItem(it));
  }

  // renderiza un descriptor de opción a un nodo DOM
  renderOptItem(it) {
    const g = this.game;
    if (it.t === 'toggle') {
      const row = document.createElement('label'); row.className = 'opt-row';
      const checked = (g.settings[it.key] ?? it.def) ? 'checked' : '';
      row.innerHTML = `<span>${icon(it.icon)} ${it.label}</span><input type="checkbox" ${checked}>`;
      row.querySelector('input').onchange = (e) => { g.settings[it.key] = e.target.checked; g.saveSettings(); it.onChange?.(e.target.checked); };
      return row;
    }
    if (it.t === 'select') {
      const row = document.createElement('label'); row.className = 'opt-row';
      const cur = g.settings[it.key] ?? it.def;
      const opts = it.opts.map(([v, l]) => `<option value="${v}" ${String(cur) === String(v) ? 'selected' : ''}>${l}</option>`).join('');
      row.innerHTML = `<span>${icon(it.icon)} ${it.label}</span><select>${opts}</select>`;
      row.querySelector('select').onchange = (e) => {
        if (it.onChange) it.onChange(e.target.value);
        else { g.settings[it.key] = e.target.value; g.saveSettings(); }
      };
      return row;
    }
    if (it.t === 'range') {
      const row = document.createElement('label'); row.className = 'opt-row';
      row.innerHTML = `<span>${icon(it.icon)} ${it.label}</span><input type="range" min="${it.min}" max="${it.max}" step="${it.step}" value="${it.get()}">`;
      const s = row.querySelector('input');
      s.oninput = () => it.set(parseFloat(s.value));
      s.onchange = () => { g.saveSettings(); it.onCommit?.(); };
      return row;
    }
    if (it.t === 'button') {
      const b = document.createElement('button'); b.className = 'shop-item';
      b.innerHTML = `<span class="shop-name">${icon(it.icon)} ${it.label}${it.desc ? ` <small class="shop-stats">${it.desc}</small>` : ''}</span>`;
      b.onclick = it.fn;
      return b;
    }
    if (it.t === 'preset') {
      const wrap = document.createElement('div'); wrap.className = 'opt-presets';
      wrap.innerHTML = `<span class="opt-presets-lbl">${icon('rocket')} Presets</span>`;
      const mk = (id, label) => {
        const b = document.createElement('button'); b.className = 'opt-preset-btn'; b.textContent = label;
        b.onclick = () => { this.applyGraphicsPreset(id); this.renderSettings(); };
        wrap.appendChild(b);
      };
      mk('bateria', '🔋 Batería'); mk('equilibrado', '⚖️ Equilibrado'); mk('calidad', '✨ Calidad');
      return wrap;
    }
    if (it.t === 'keybinds') return this.renderKeybinds();
    return document.createElement('div');
  }

  // presets de gráficos: fijan varios ajustes de golpe
  applyGraphicsPreset(id) {
    const g = this.game, s = g.settings;
    if (id === 'bateria') { s.postfx = false; s.ao = false; s.outline = false; s.perfHud = false; s.shadows = 'off'; s.renderScale = 0.75; g.setQuality?.(3); }
    else if (id === 'equilibrado') { s.postfx = true; s.ao = true; s.outline = true; s.shadows = 'auto'; s.renderScale = 1; g.setQuality?.('auto'); }
    else if (id === 'calidad') { s.postfx = true; s.ao = true; s.outline = true; s.shadows = 'auto'; s.renderScale = 1; g.setQuality?.(0); }
    g.applyResolution?.(); g.syncPostFX?.(); g.saveSettings();
    this.message('⚙️ Preset aplicado', 1800);
  }

  // UI de remapeo de teclado: lista de acciones con su tecla; clic = reasignar
  renderKeybinds() {
    const g = this.game, input = g.input;
    const wrap = document.createElement('div'); wrap.className = 'keybinds';
    wrap.innerHTML = `<p class="dim">Pulsa una acción y luego la tecla nueva (Esc cancela). Reasignar una tecla la quita de su acción anterior.</p>`;
    let lastGroup = '';
    for (const a of BINDABLE_ACTIONS) {
      if (a.group !== lastGroup) {
        lastGroup = a.group;
        const h = document.createElement('div'); h.className = 'keybind-group'; h.textContent = a.group;
        wrap.appendChild(h);
      }
      const row = document.createElement('div'); row.className = 'keybind-row';
      const codes = input?.bindings?.[a.id] || [];
      const keysTxt = codes.length ? codes.map(keyLabel).join(' / ') : '—';
      row.innerHTML = `<span class="keybind-act">${a.label}</span>`;
      const btn = document.createElement('button'); btn.className = 'keybind-key'; btn.textContent = keysTxt;
      btn.onclick = () => {
        btn.textContent = '… pulsa una tecla'; btn.classList.add('capturing');
        input.beginCapture(a.id, () => this.renderSettingsBody());
      };
      row.appendChild(btn);
      wrap.appendChild(row);
    }
    const reset = document.createElement('button'); reset.className = 'shop-item';
    reset.innerHTML = `<span class="shop-name">${icon('recycle')} Restaurar controles por defecto</span>`;
    reset.onclick = () => { input.resetBindings(); this.renderSettingsBody(); this.message('Controles restaurados', 1800); };
    wrap.appendChild(reset);
    return wrap;
  }

  openQuest() {
    if (this.activePanel !== 'quest') {
      this.closePanel();
      this.activePanel = 'quest';
      $('panel-quest').classList.remove('hidden');
      this.markJustOpened();
    }
    this.renderQuest();
  }

  // modal de pactos: elige un riesgo a cambio de recompensa (o cancela)
  openPacts() {
    const g = this.game;
    this.closePanel();
    this.activePanel = 'pacts';
    const panel = $('panel-pacts');
    panel.classList.remove('hidden');
    this.markJustOpened();
    const body = $('pacts-body');
    body.innerHTML = '';
    for (const pact of PACTS) {
      const b = document.createElement('button');
      b.className = 'pact-card';
      // separa la descripción en riesgo · recompensa cuando sea posible
      const parts = pact.desc.split('·').map(s => s.trim());
      const detail = parts.length === 2
        ? `<span class="pact-risk">⚠️ ${parts[0]}</span><span class="pact-reward">🎁 ${parts[1]}</span>`
        : `<span class="pact-reward">${pact.desc}</span>`;
      b.innerHTML = `<span class="pact-name">${pact.icon} ${pact.name}</span><span class="pact-detail">${detail}</span>`;
      b.onclick = () => { g.applyPact(pact.id); this.closePanel(); };
      body.appendChild(b);
    }
    const cancel = document.createElement('button');
    cancel.className = 'quest-btn pact-skip';
    cancel.textContent = '🚪 Entrar sin pacto';
    cancel.onclick = () => this.closePanel();
    body.appendChild(cancel);
  }

  // libro de recetas del cubo (incluye palabras rúnicas)
  openRecipes() {
    if (this.activePanel !== 'recipes') {
      this.closePanel();
      this.activePanel = 'recipes';
      $('panel-recipes').classList.remove('hidden');
      this.markJustOpened();
    }
    const runeName = (id) => (RUNES.find(r => r.id === id) || {}).name || id;
    const cube = [
      ['🧪 Transmutar', '3 objetos de la misma rareza → 1 de rareza superior (cuesta oro, escala con la rareza).'],
      ['🎯 Crafteo dirigido', 'Si los 3 objetos comparten ranura, el resultado es de esa ranura y de tu clase.'],
      ['🔥 Reforjar', '3 legendarios → 1 legendario nuevo con poder (muy caro).'],
      ['💎 Fundir gemas', '3 gemas iguales → la misma gema superior · 3 gemas distintas → gema aleatoria mejor.'],
      ['🔩 Abrir engarce', '1 objeto + 2 gemas → +1 hueco en el objeto (caro; consume las gemas). Tope según la pieza.'],
      ['🪬 Engarzar', 'Arrastra una gema o runa sobre un objeto con hueco libre para incrustarla.'],
    ];
    const cubeHTML = cube.map(([t, d]) => `<div class="col-row have"><span>${t}</span><small>${d}</small></div>`).join('');
    const rwHTML = RUNEWORDS.map(rw => {
      const runes = rw.runes.map(runeName).join(' + ');
      const slots = rw.slots.map(s => SLOT_NAMES[s] || s).join('/');
      const bonus = Object.entries(rw.stats).map(([k, v]) => statText(k, v)).join(', ');
      return `<div class="col-row"><span>🔮 ${rw.name}</span><small>${runes} · en ${slots}<br>${bonus}</small></div>`;
    }).join('');
    $('recipes-body').innerHTML =
      `<h4>🧰 Cubo de Transmutación</h4>${cubeHTML}` +
      `<h4>🔮 Palabras rúnicas <span class="dim">(engarza las runas EN ORDEN en el tipo indicado)</span></h4>${rwHTML}`;
  }

  // panel de colección: sets, poderes legendarios y bestiario
  openCollection() {
    if (this.activePanel !== 'collection') {
      this.closePanel();
      this.activePanel = 'collection';
      $('panel-collection').classList.remove('hidden');
      this.markJustOpened();
    }
    this.renderCollection();
  }

  renderCollection() {
    const d = this.game.player.discovered;
    const body = $('collection-body');
    const setsHTML = SETS.map(s => {
      const found = Object.keys(d.sets[s.id] || {}).length;
      return `<div class="col-row"><span>${s.icon} ${s.name}</span><b>${found}/${s.pieces.length}</b></div>`;
    }).join('');
    const powFound = Object.keys(d.powers).length;
    const powsHTML = LEGENDARY_POWERS.map(p =>
      `<div class="col-row ${d.powers[p.id] ? 'have' : 'miss'}"><span>${d.powers[p.id] ? '✦ ' + p.name : '🔒 ???'}</span>` +
      `<small>${d.powers[p.id] ? p.desc : 'Encuentra un legendario con este poder'}</small></div>`).join('');
    const beasts = ENEMIES.filter(e => !e.coward || true);
    const bestHTML = beasts.map(e => {
      const n = d.bestiary[e.id] || 0;
      return `<div class="col-row ${n ? '' : 'miss'}"><span>${n ? e.name : '🔒 ???'}</span><b>${n}</b></div>`;
    }).join('');
    body.innerHTML = `
      <h4>🟢 Conjuntos</h4>${setsHTML}
      <h4>✦ Poderes legendarios (${powFound}/${LEGENDARY_POWERS.length})</h4>${powsHTML}
      <h4>📖 Bestiario</h4>${bestHTML}`;
  }

  renderQuest() {
    const g = this.game, p = g.player;
    const body = $('quest-body');
    // ficha de recompensa reutilizable
    const rewardHTML = (r) => `
      <div class="quest-reward">
        <span class="quest-reward-lbl">Recompensa</span>
        <span class="quest-reward-list">
          <span class="rwd-chip">🪙 ${r.gold}</span>
          <span class="rwd-chip">✨ ${r.xp} XP</span>
          ${r.item ? '<span class="rwd-chip rwd-item">🟡 Objeto raro</span>' : ''}
        </span>
      </div>`;
    if (p.quest) {
      const q = p.quest;
      const done = q.progress >= q.goal;
      const pct = Math.min(100, q.progress / q.goal * 100);
      body.innerHTML = `
        <div class="quest-card ${done ? 'quest-done' : 'quest-active'}">
          <div class="quest-status">${done ? '✅ Objetivo cumplido' : '⏳ Misión activa'}</div>
          <p class="quest-desc">🎯 ${q.desc}</p>
          <div class="quest-bar"><div style="width:${pct}%"></div></div>
          <p class="quest-progress">${Math.min(q.progress, q.goal)} / ${q.goal}</p>
          ${rewardHTML(q.reward)}
        </div>`;
      const b = document.createElement('button');
      b.className = 'quest-btn';
      b.textContent = done ? '🏆 Reclamar recompensa' : '⏳ En progreso…';
      b.disabled = !done;
      b.onclick = () => g.claimQuest();
      body.appendChild(b);
    } else {
      const q = g.ensureQuestOffer();
      body.innerHTML = `
        <p class="quest-quote">«Las profundidades están cada vez peor. ¿Me ayudas?»</p>
        <div class="quest-card quest-offer">
          <div class="quest-status">📜 Misión disponible</div>
          <p class="quest-desc">🎯 ${q.desc}</p>
          ${rewardHTML(q.reward)}
        </div>`;
      const b = document.createElement('button');
      b.className = 'quest-btn';
      b.textContent = '✔️ Aceptar misión';
      b.onclick = () => { g.acceptQuest(); this.renderQuest(); };
      body.appendChild(b);
    }
  }

  openWaypoints() {
    if (this.activePanel !== 'waypoints') {
      this.closePanel();
      this.activePanel = 'waypoints';
      $('panel-waypoints').classList.remove('hidden');
      this.markJustOpened();
    }
    this.renderWaypoints();
  }

  renderWaypoints() {
    const g = this.game, p = g.player;
    const cont = $('wp-list');
    cont.innerHTML = '';
    const mk = (txt, disabled, fn) => {
      const b = document.createElement('button');
      b.className = 'shop-item';
      b.innerHTML = `<span class="shop-name">${txt}</span>`;
      b.disabled = disabled;
      b.onclick = fn;
      cont.appendChild(b);
    };
    // hogar: el campamento contiguo a la Cripta (seamless). Resaltado si ya estás.
    mk(`${icon('village')} Campamento (Cripta)`, g.world.isHome, () => g.travelTo('town'));
    if (p.refugeUnlocked)
      mk(`${icon('camp')} Refugio del Abismo`, g.world.type === 'refuge', () => g.travelTo('refuge'));
    // zonas abiertas (regiones), desbloqueadas por nivel. La Cripta es el hogar
    // (ya listada arriba como Campamento), así que no se repite aquí.
    const head = document.createElement('div');
    head.className = 'tier-head'; head.innerHTML = `${icon('globe')} Zonas abiertas`;
    cont.appendChild(head);
    for (const z of ZONE_LIST) {
      if (z.biome === 'Cripta') continue; // es el hogar (Campamento)
      const unlocked = p.level >= z.minLevel;
      const here = g.world.type === 'zone' && g.world.biome === z.biome;
      mk(unlocked ? `${icon('leaf')} ${z.biome}` : `${icon('lock')} ${z.biome} (nivel ${z.minLevel})`,
        here || !unlocked, () => g.travelToZone(z.biome));
    }
    const head2 = document.createElement('div');
    head2.className = 'tier-head'; head2.innerHTML = `${icon('pit')} Pisos de mazmorra`;
    cont.appendChild(head2);
    for (const f of [...p.waypoints].sort((a, b) => a - b))
      mk(`${icon('pit')} Piso ${f}`, g.world.type === 'dungeon' && g.world.floor === f, () => g.travelTo(f));
  }

  itemCellHTML(item, { mat = false } = {}) {
    if (!item) return '';
    const r = RARITIES[item.rarity];
    // Paso 2d: materiales con su icono pintado (mat_*); el emoji queda de distintivo (tipo de gema/runa)
    const matSrc = mat ? HM.matIcon(item.kind) : null;
    if (matSrc) {
      const badge = item.kind === 'gem' || item.kind === 'rune' || item.kind === 'glyph' ? `<span class="cell-mat-kind">${item.icon}</span>` : '';
      return `<span class="cell-icon cell-mat" style="filter:drop-shadow(0 0 5px ${r.color})"><img src="${matSrc}" alt="" draggable="false"></span>${badge}` +
        `${item.fav ? `<span class="fav-star">${icon('fav')}</span>` : ''}`;
    }
    // engarces libres (esquina superior derecha) — oculto en objetos sin identificar
    let sockets = '';
    if (item.sockets && !item.unidentified) {
      const free = item.sockets - (item.gems ? item.gems.length : 0);
      if (free > 0) sockets = `<span class="cell-sockets" title="${free} engarce(s) libre(s)">${free}</span>`;
    }
    // glifo de rareza (esquina inferior derecha): el color no es el único indicador
    const glyph = (!item.unidentified && RARITY_ICON[item.rarity])
      ? `<span class="cell-glyph" style="color:${r.color}" title="${r.name}">${icon(RARITY_ICON[item.rarity])}</span>` : '';
    // objeto sin identificar: interrogante claro
    const unid = item.unidentified ? `<span class="cell-unid" title="Sin identificar">${icon('question')}</span>` : '';
    return `<span class="cell-icon" style="text-shadow:0 0 6px ${r.color}">${item.icon}</span>` +
      `${item.fav ? `<span class="fav-star">${icon('fav')}</span>` : ''}${sockets}${glyph}${unid}`;
  }

  renderInventory() {
    const g = this.game;
    const p = g.player;
    // equipo en disposición anatómica (estilo Diablo 3):
    // casco arriba, armadura al centro, botas abajo, arma/anillo/amuleto a los lados
    const eq = $('equip-slots');
    eq.innerHTML = '';
    for (const [slot, label] of Object.entries(SLOT_NAMES)) {
      const item = p.equipment[slot];
      const div = document.createElement('div');
      div.className = `inv-cell equip-cell slot-${slot}` + (item ? ' rarity-' + item.rarity : ' empty-slot');
      div.innerHTML = item
        ? this.itemCellHTML(item)
        : `<span class="cell-hint"><span class="slot-glyph">${HM.eqIcon(slot) ? `<img class="slot-img" src="${HM.eqIcon(slot)}" alt="" draggable="false">` : SLOT_ICON[slot] || ''}</span><span class="slot-name">${label}</span></span>`;
      div.title = item ? '' : label;
      this.bindCell(div, { zone: 'equip', key: slot, item }, item ? () => this.itemPopup(item, { from: 'equip', slot }) : null);
      eq.appendChild(div);
    }

    // cubo de transmutación
    const cubeRow = $('cube-row');
    cubeRow.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const item = p.cube[i];
      const div = document.createElement('div');
      div.className = 'inv-cell' + (item ? ' rarity-' + item.rarity : '');
      div.innerHTML = item ? this.itemCellHTML(item) : '<span class="cell-hint">—</span>';
      if (item) div.title = 'Devolver al inventario';
      this.bindCell(div, { zone: 'cube', key: i, item }, item ? () => { g.cubeReturn(i); this.renderInventory(); } : null);
      cubeRow.appendChild(div);
    }
    const tb = document.createElement('button');
    tb.id = 'btn-transmute';
    const prev = g.cubePreview();
    tb.textContent = prev.text;
    tb.disabled = !prev.ready || (prev.cost > 0 && p.gold < prev.cost);
    tb.onclick = () => g.transmute();
    cubeRow.appendChild(tb);
    // libro de recetas
    const rb = document.createElement('button');
    rb.id = 'btn-recipes';
    rb.innerHTML = icon('book');
    rb.title = 'Ver recetas';
    rb.setAttribute('aria-label', 'Ver recetas');
    rb.onclick = () => this.openRecipes();
    cubeRow.appendChild(rb);

    const invGrid = $('inv-grid');
    invGrid.innerHTML = '';
    for (let i = 0; i < 32; i++) {
      const item = p.inventory[i];
      const div = document.createElement('div');
      div.className = 'inv-cell' + (item ? ' rarity-' + item.rarity : '') + (this.isUpgrade(item) ? ' inv-upgrade' : '');
      div.innerHTML = this.itemCellHTML(item) + (this.isUpgrade(item) ? '<span class="inv-up-badge">▲</span>' : '');
      this.bindCell(div, { zone: 'inv', key: i, item }, item ? () => this.itemPopup(item, { from: 'inv', index: i }) : null);
      invGrid.appendChild(div);
    }
    $('inv-gold').innerHTML = `${icon('coin', { cls: 'ico-gold' })} ${p.gold} oro · haz clic para comparar/equipar · arrastra para mover (I o B para abrir)`;

    // bolsa de materiales (gemas, runas, llaves, fragmentos, glifos)
    this.renderMaterials();
    this.bindInvTabs();
  }

  // pinta la rejilla de la bolsa de materiales
  renderMaterials() {
    const g = this.game, p = g.player;
    const grid = $('mat-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const mats = p.materials || [];
    // gemas/runas idénticas se muestran APILADAS (una celda con contador); la
    // celda referencia el índice real de la primera unidad de la pila
    const cellsList = [];
    const stackAt = new Map();
    mats.forEach((item, i) => {
      const k = materialStackKey(item);
      if (k && stackAt.has(k)) { stackAt.get(k).count++; return; }
      const c = { item, index: i, count: 1 };
      if (k) stackAt.set(k, c);
      cellsList.push(c);
    });
    // celdas para todo el material + algunas vacías para arrastrar/soltar
    const cells = Math.max(24, cellsList.length + 4);
    for (let n = 0; n < cells; n++) {
      const c = cellsList[n];
      const item = c?.item;
      const i = c ? c.index : mats.length + (n - cellsList.length); // vacías → "al final"
      const div = document.createElement('div');
      div.className = 'inv-cell' + (item ? ' rarity-' + item.rarity : '');
      div.innerHTML = this.itemCellHTML(item, { mat: true }) + (c && c.count > 1 ? `<span class="cell-qty">×${c.count}</span>` : '');
      this.bindCell(div, { zone: 'mat', key: i, item }, item ? () => this.itemPopup(item, { from: 'mat', index: i }) : null);
      grid.appendChild(div);
    }
  }

  // conmuta entre las pestañas Mochila / Materiales del inventario
  bindInvTabs() {
    const tabs = document.querySelectorAll('#inv-tabs .inv-tab');
    if (!tabs.length) return;
    tabs.forEach(tab => {
      tab.onclick = () => {
        const key = tab.dataset.invtab;
        tabs.forEach(t => t.classList.toggle('on', t === tab));
        document.querySelectorAll('#panel-inv .inv-tab-pane').forEach(pane => {
          pane.classList.toggle('hidden', pane.dataset.pane !== (key === 'mat' ? 'mat' : 'bag'));
        });
      };
    });
  }

  // bloque ▲▼ de comparación de un objeto del inventario contra lo equipado
  // "poder" del objeto: suma ponderada para el veredicto de un vistazo
  itemPower(it) {
    if (!it || it.kind !== 'item') return 0;
    let s = 0;
    if (it.dmg) s += (it.dmg[0] + it.dmg[1]) / 2 * 2;
    if (it.arm) s += it.arm;
    const W = { crit: 3, dmgPct: 1.5, aspdPct: 1.2, spdPct: 0.8, mf: 0.4, cdr: 1.2, lph: 0.5, mph: 0.4, thorns: 0.3 };
    for (const [k, v] of Object.entries(it.affixes || {})) s += v * (W[k] ?? 1);
    if (it.gems?.length) for (const gm of it.gems) for (const v of Object.values(gm.stats || {})) s += v;
    s *= 1 + (it.quality || 0) * 0.06;
    if (it.power) s += 12;                  // un aspecto legendario vale mucho
    return Math.round(s);
  }

  // ¿equipar este objeto mejoraría tu build? (para resaltarlo en la mochila)
  isUpgrade(item) {
    if (!item || item.kind !== 'item' || !item.slot || item.unidentified) return false;
    const p = this.game.player;
    let equipped;
    if (item.slot === 'ring') {
      const r1 = p.equipment.ring, r2 = p.equipment.ring2;
      if (!r1 || !r2) return true;                    // hay ranura de anillo libre
      equipped = this.itemPower(r1) <= this.itemPower(r2) ? r1 : r2;
    } else equipped = p.equipment[item.slot];
    if (!equipped) return true;                        // ranura vacía
    return this.itemPower(item) > this.itemPower(equipped) + 1;
  }

  // DPS de personaje a partir de un bloque de stats (daño medio × crítico ÷ tiempo
  // de ataque). Sirve para previsualizar el impacto real de equipar un objeto.
  _charDPS(st) {
    if (!st) return 0;
    return ((st.dmgMin + st.dmgMax) / 2) * (1 + (st.crit || 0) / 100 * (CRIT_MULT - 1)) / Math.max(0.05, st.atkTime || 1);
  }

  // Previsualiza equipar un objeto SIN efectos secundarios: equipa en una copia,
  // recalcula, captura las stats clave y restaura. recompute() es determinista a
  // partir del equipo, así que restaurar + recalcular devuelve el estado exacto.
  _previewEquip(item) {
    const p = this.game.player;
    if (!p || item.kind !== 'item' || !item.slot || item.unidentified) return null;
    let key = item.slot;
    if (item.slot === 'ring') {
      const r1 = p.equipment.ring, r2 = p.equipment.ring2;
      key = !r1 ? 'ring' : !r2 ? 'ring2' : (this.itemPower(r1) <= this.itemPower(r2) ? 'ring' : 'ring2');
    }
    const prev = p.equipment[key];
    if (prev === item) return null;
    const grab = () => ({ dps: this._charDPS(p.stats), hp: p.stats.maxHP, arm: p.stats.arm, power: p.stats.power || 0 });
    const before = grab();
    p.equipment[key] = item; p.recompute();
    const after = grab();
    p.equipment[key] = prev; p.recompute();   // restaura el estado exacto
    return { before, after };
  }

  buildCompare(item) {
    const p = this.game.player;
    if (item.kind !== 'item' || !item.slot) return '';
    // ranura objetivo: en anillos, se compara con el que SE REEMPLAZARÍA (el peor
    // equipado si ambas ranuras están ocupadas; si hay hueco, no hay rival)
    let equipped, freeSlot = false;
    if (item.slot === 'ring') {
      const r1 = p.equipment.ring, r2 = p.equipment.ring2;
      if (!r1 || !r2) { equipped = null; freeSlot = true; }
      else equipped = this.itemPower(r1) <= this.itemPower(r2) ? r1 : r2;
    } else equipped = p.equipment[item.slot] || null;
    if (equipped === item) return '';

    // veredicto por poder
    const dPow = this.itemPower(item) - this.itemPower(equipped);
    let verdict;
    if (freeSlot) verdict = `<span class="verdict up">⬆ Mejora (ranura libre)</span>`;
    else if (!equipped) verdict = `<span class="verdict up">⬆ Mejora (nada equipado)</span>`;
    else if (dPow > 1) verdict = `<span class="verdict up">⬆ Mejora (+${dPow} poder)</span>`;
    else if (dPow < -1) verdict = `<span class="verdict down">⬇ Peor (${dPow} poder)</span>`;
    else verdict = `<span class="verdict side">↔ Lateral</span>`;

    // impacto REAL en el personaje (DPS / vida / armadura) por simulación de equipo
    const pv = this._previewEquip(item);
    let impact = '';
    if (pv) {
      const row = (label, b, a, dec = 0) => {
        const d = a - b;
        if (Math.abs(d) < (dec ? 0.5 : 0.5)) return `<div class="cmp-row dim"><span>${label}</span><b>${a.toFixed(dec)}</b></div>`;
        const cls = d > 0 ? 'up' : 'down';
        const sign = d > 0 ? '▲ +' : '▼ ';
        return `<div class="cmp-row ${cls}"><span>${label}</span><b>${b.toFixed(dec)} → ${a.toFixed(dec)}</b><i>${sign}${Math.abs(d).toFixed(dec)}</i></div>`;
      };
      impact = `<div class="cmp-stats">` +
        row('DPS', pv.before.dps, pv.after.dps) +
        row('Vida', pv.before.hp, pv.after.hp) +
        row('Armadura', pv.before.arm, pv.after.arm) +
        `</div>`;
    }

    if (!equipped) return `<div class="compare">${verdict}${impact}</div>`;

    const summarize = (it) => {
      const m = {};
      if (it.dmg) m._dmg = (it.dmg[0] + it.dmg[1]) / 2;
      if (it.arm) m.arm = (m.arm || 0) + it.arm;
      for (const [k, v] of Object.entries(it.affixes || {})) m[k] = (m[k] || 0) + v;
      return m;
    };
    const a = summarize(item), b = summarize(equipped);
    const diffs = [];
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      const d = Math.round(((a[k] || 0) - (b[k] || 0)) * 10) / 10;
      if (!d) continue;
      const label = k === '_dmg' ? `${Math.abs(d)} daño medio` : statText(k, Math.abs(d)).replace('+', '');
      diffs.push(`<div class="diff ${d > 0 ? 'up' : 'down'}">${d > 0 ? '▲ +' : '▼ -'}${label}</div>`);
    }
    return `<div class="compare">${verdict}${impact}<em>Frente a: ${equipped.name}</em>${diffs.join('') || '<div class="diff dim">Sin diferencias</div>'}</div>`;
  }

  // tooltip de escritorio: aparece al pasar el ratón sobre una celda
  showItemTooltip(item, x, y) {
    if (!item) return;
    const tip = $('item-tooltip');
    const r = RARITIES[item.rarity] || RARITIES.normal;
    const glyph = RARITY_ICON[item.rarity] ? icon(RARITY_ICON[item.rarity], { cls: 'rarity-ico' }) : '';
    const lines = itemStatLines(item).map(l => `<div class="stat-line">${l}</div>`).join('');
    tip.innerHTML = `<div class="popup-name" style="color:${r.color}">${glyph} ${item.icon} ${item.name}</div>` +
      `<div class="popup-sub">${r.name}${SLOT_NAMES[item.slot] ? ' · ' + SLOT_NAMES[item.slot] : ''}${item.ilvl ? ' · Nv. ' + item.ilvl : ''}</div>` +
      `${lines}${this.buildCompare(item)}`;
    tip.classList.remove('hidden');
    this.moveTooltip(x, y);
  }

  moveTooltip(x, y) {
    const tip = $('item-tooltip');
    const w = tip.offsetWidth, h = tip.offsetHeight;
    let nx = x + 16, ny = y + 16;
    if (nx + w > window.innerWidth - 8) nx = x - w - 16;
    if (ny + h > window.innerHeight - 8) ny = window.innerHeight - h - 8;
    tip.style.left = Math.max(8, nx) + 'px';
    tip.style.top = Math.max(8, ny) + 'px';
  }

  hideItemTooltip() { $('item-tooltip').classList.add('hidden'); }

  itemPopup(item, ctx) {
    const g = this.game;
    const p = g.player;
    const r = RARITIES[item.rarity];
    const pop = $('item-popup');
    this.markJustOpened();
    this.hideItemTooltip();
    // restaura el centrado por CSS (showBuffInfo lo posiciona en línea)
    pop.style.left = pop.style.top = pop.style.transform = '';
    const lines = itemStatLines(item).map(l => `<div class="stat-line">${l}</div>`).join('');
    // comparación rápida ▲▼ contra lo equipado (lectura en un vistazo);
    // también desde el equipo (compara la pieza con su misma ranura, no aporta
    // diff pero buildCompare lo gestiona). Un clic abre la comparación.
    const compare = (ctx.from === 'inv' || ctx.from === 'equip') ? this.buildCompare(item) : '';
    // información del conjunto: piezas y bonus (activos en verde)
    let setHTML = '';
    if (item.setId) {
      const set = SETS.find(s => s.id === item.setId);
      if (set) {
        const equippedOfSet = Object.values(p.equipment).filter(it => it?.setId === set.id).length;
        const piecesHTML = set.pieces.map(pc => {
          const has = p.equipment[pc.slot]?.setId === set.id;
          return `<div class="set-piece${has ? ' have' : ''}">${has ? '✓' : '·'} ${pc.name}</div>`;
        }).join('');
        const bonusHTML = Object.entries(set.bonuses).map(([n, stats]) => {
          const active = equippedOfSet >= Number(n);
          const txt = Object.entries(stats).map(([k, v]) => statText(k, v)).join(', ');
          return `<div class="set-bonus${active ? ' active' : ''}">(${n} piezas) ${txt}</div>`;
        }).join('');
        setHTML = `<div class="set-info"><div class="set-name">${set.icon} ${set.name} (${equippedOfSet}/${set.pieces.length})</div>${piecesHTML}${bonusHTML}</div>`;
      }
    }
    const nameColor = item.unidentified ? '#b8a0d8' : r.color;
    const glyph = item.unidentified ? '' : (RARITY_ICON[item.rarity] ? icon(RARITY_ICON[item.rarity], { cls: 'rarity-ico' }) : '');
    const nameTxt = item.unidentified ? `${item.icon} Objeto sin identificar` : `${glyph} ${item.icon} ${item.name}`;
    pop.innerHTML = `
      <div class="popup-name" style="color:${nameColor}">${nameTxt}</div>
      <div class="popup-sub">${item.unidentified ? icon('question') + ' ' + r.name : r.name}${SLOT_NAMES[item.slot] ? ' · ' + SLOT_NAMES[item.slot] : ''}${item.ilvl ? ' · Nv. ' + item.ilvl : ''}</div>
      ${lines}${setHTML}${compare}
      <div class="popup-btns"></div>`;
    const btns = pop.querySelector('.popup-btns');
    const addBtn = (txt, fn, cls = '') => {
      const b = document.createElement('button');
      b.textContent = txt;
      b.className = cls;
      b.onclick = () => { fn(); pop.classList.add('hidden'); this.renderPanel(); this.updateHUD(); };
      btns.appendChild(b);
    };
    // objeto sin identificar: solo se puede identificar (o tirar)
    if (item.unidentified) {
      if (ctx.from === 'inv') {
        addBtn('🔎 Identificar', () => g.identifyItem(ctx.index), 'btn-good');
        addBtn('Tirar', () => g.dropItem(ctx.index), 'btn-bad');
      }
      addBtn('Cerrar', () => {});
      pop.classList.remove('hidden');
      return;
    }
    // llave de grieta: abrir la grieta (endgame) — vive en la bolsa de materiales
    if (item.kind === 'riftkey') {
      if (ctx.from === 'mat') {
        addBtn(`🌀 Abrir Grieta Nv ${item.riftLevel}`, () => g.useRiftKey(ctx.index), 'btn-good');
      }
      addBtn('Cerrar', () => {});
      pop.classList.remove('hidden');
      return;
    }
    // materiales (gemas, runas, fragmentos, glifos): acciones específicas
    if (ctx.from === 'mat') {
      if ((item.kind === 'gem' || item.kind === 'rune') && p.cube.length < 3)
        addBtn('Al cubo 🧪', () => g.addMaterialToCube(ctx.index));
      addBtn('Cerrar', () => {});
      pop.classList.remove('hidden');
      return;
    }
    if (ctx.from === 'inv') {
      if (item.kind === 'item' && item.slot) addBtn('Equipar', () => g.equipItem(ctx.index), 'btn-good');
      addBtn(item.fav ? '💔 Quitar ⭐' : '⭐ Favorito', () => g.toggleFav(ctx.index));
      addBtn(`Vender (${item.value} 🪙)`, () => g.sellItem(ctx.index));
      if (p.cube.length < 3 && item.rarity !== 'legendario' && item.rarity !== 'conjunto')
        addBtn('Al cubo 🧪', () => g.addToCube(ctx.index));
      addBtn('Tirar', () => g.dropItem(ctx.index), 'btn-bad');
    } else if (ctx.from === 'equip') {
      addBtn('Desequipar', () => g.unequipItem(ctx.slot));
    }
    // reforjar un afijo si la Encantadora está cerca
    if (g.nearEnchanter && ctx.from === 'inv' && item.kind === 'item' && Object.keys(item.affixes || {}).length) {
      addBtn(`Reforjar afijo (${g.enchantCost(item)} 🪙)`, () => g.enchantItem(ctx.index), 'btn-good');
    }
    // mejorar la calidad del objeto (masterworking), junto a la Encantadora
    if (g.nearEnchanter && ctx.from === 'inv' && item.kind === 'item' && (item.quality || 0) < 5) {
      addBtn(`🔨 Mejorar calidad (${g.masterworkCost(item)} 🪙)`, () => g.masterworkItem(ctx.index), 'btn-good');
    }
    // engarzar gemas/runas si el objeto tiene ranura libre y hay en la mochila
    if (item.sockets && (item.gems || []).length < item.sockets && p.materials.some(i => i.kind === 'gem' || i.kind === 'rune')) {
      const b = document.createElement('button');
      b.textContent = 'Engarzar 💎';
      b.className = 'btn-good';
      b.onclick = () => this.gemChooser(item);
      btns.appendChild(b);
    }
    // Códice de Aspectos: extraer el poder de un legendario o grabar uno conocido
    if (ctx.from === 'inv' && item.kind === 'item') {
      if (item.power) {
        addBtn('🔮 Extraer aspecto', () => g.extractAspect(ctx.index), 'btn-good');
      } else if (item.slot && !item.setId && Object.keys(p.codex || {}).length) {
        const b = document.createElement('button');
        b.className = 'btn-good';
        b.textContent = '🔮 Grabar aspecto…';
        b.onclick = () => this.codexImprintChooser(item, ctx);
        btns.appendChild(b);
      }
    }
    addBtn('Cerrar', () => {});
    pop.classList.remove('hidden');
  }

  gemChooser(item) {
    const g = this.game, p = g.player;
    const pop = $('item-popup');
    pop.style.left = pop.style.top = pop.style.transform = '';
    pop.innerHTML = `
      <div class="popup-name">💎 Elige una gema para:</div>
      <div class="popup-sub">${item.name} (${(item.gems || []).length}/${item.sockets} engarces)</div>
      <div class="popup-btns gem-list"></div>`;
    const btns = pop.querySelector('.popup-btns');
    p.materials.forEach((gm, i) => {
      if (gm.kind !== 'gem' && gm.kind !== 'rune') return;
      const b = document.createElement('button');
      b.innerHTML = `${gm.icon} ${gm.name} · ${itemStatLines(gm)[0] || ''}`;
      b.onclick = () => {
        g.socketGem(item.uid, i);
        pop.classList.add('hidden');
        this.renderPanel();
        this.updateHUD();
      };
      btns.appendChild(b);
    });
    const c = document.createElement('button');
    c.textContent = 'Cancelar';
    c.onclick = () => pop.classList.add('hidden');
    btns.appendChild(c);
  }

  // pips de rango (●●●○○) para leer el nivel de un vistazo
  skillPips(lvl, max) {
    return `<span class="sk-pips">${'●'.repeat(lvl)}<span class="sk-pips-empty">${'○'.repeat(Math.max(0, max - lvl))}</span></span>`;
  }

  // valor principal de una skill a un nivel (para previsualizar la mejora)
  skillMainAt(sk, lvl) {
    const r = Math.max(1, lvl || 1);
    if (sk.coef) return `Daño ${Math.round(sk.coef * (1 + 0.10 * (r - 1)) * 100)}%`;
    if (sk.buff) return Object.entries(sk.buff).map(([k, v]) => `+${Math.round(v * (1 + 0.06 * (r - 1)))} ${STAT_NAMES[k] || k}`).join(', ');
    if (sk.count > 1) return `${sk.count} proyectiles`;
    return null;
  }

  // línea verde "actual → siguiente" para ver qué aporta el próximo punto
  skillUpgradeLine(sk, lvl) {
    const nxt = this.skillMainAt(sk, lvl + 1);
    if (!nxt) return '';
    if (lvl === 0) return `<small class="sk-next">Al aprender: <b>${nxt}</b></small>`;
    const cur = this.skillMainAt(sk, lvl);
    if (cur === nxt) return '';
    return `<small class="sk-next">Siguiente: ${cur} <b>→ ${nxt}</b></small>`;
  }

  // ============================================================
  // LIBRO DE HABILIDADES (Paso 2d): lista por categoría (básico, gastadora,
  // movilidad, defensa/utilidad, especialización, definitiva) con su icono, el
  // rango por nivel, las ramas y las activas de talento marcadas. Clic en una
  // habilidad = foco radial de ramas (renderSkillFocus); arrastrarla a una ranura
  // de la barra (la del libro o la del HUD) la asigna si encaja (fitsSlot).
  // ============================================================
  renderSkills() {
    const p = this.game.player;
    const nav = $('sk-build-nav');
    if (nav) { nav.innerHTML = this.buildNavHTML('skills'); this.bindBuildNav(nav); }
    const ptsEl = $('skill-points');
    const res = p.cls.resource;
    ptsEl.className = 'sk-summary' + (p.skillPoints > 0 ? ' has-points' : '');
    const resImg = HM.resIcon(res?.id);
    ptsEl.innerHTML = `<span class="sk-sum-cls">${p.cls.icon} ${p.cls.name} · ${resImg ? `<img class="sk-sum-res" src="${resImg}" alt="" draggable="false">` : res?.icon || ''} ${res?.name || ''}</span>` +
      (p.skillPoints > 0
        ? `<span class="sk-sum-pts">✦ ${p.skillPoints} punto${p.skillPoints > 1 ? 's' : ''} para ramas</span>`
        : `<span class="sk-sum-pts dim">Sin puntos para ramas</span>`);
    const cont = $('skill-tree');
    cont.innerHTML = '';
    // ---- barra (destino de arrastre) ----
    cont.appendChild(this.renderBookBar());
    // ---- libro ----
    const viewport = document.createElement('div'); viewport.className = 'sk-viewport sk-book';
    const scroll = document.createElement('div'); scroll.className = 'sk-book-scroll';
    viewport.appendChild(scroll);
    const spec = Talents.activeSpec(p);
    const onBar = {};
    for (const [slot, id] of Object.entries(p.hotbar || {})) if (id) onBar[id] = slot;
    const sections = HM.bookSections(p.cls.skills, { known: (sk) => isKnown(p, sk) });
    for (const sec of sections) {
      const box = document.createElement('section'); box.className = 'sk-book-sec sec-' + sec.id;
      const knownN = sec.skills.filter(sk => isKnown(p, sk)).length;
      box.innerHTML = `<header class="sk-book-head"><img class="sk-book-cat" src="${HM.uiIcon(sec.icon)}" alt="" draggable="false" onerror="this.remove()">` +
        `<span class="sk-book-title">${sec.label}</span><span class="sk-book-hint">${sec.hint}</span><span class="sk-book-count">${knownN}/${sec.skills.length}</span></header>`;
      const list = document.createElement('div'); list.className = 'sk-book-list';
      for (const sk of sec.skills) list.appendChild(this.skillBookCard(sk, { onBar: onBar[sk.id], spec }));
      box.appendChild(list);
      scroll.appendChild(box);
    }
    cont.appendChild(viewport);
    if (this._bookScroll) scroll.scrollTop = this._bookScroll;
    scroll.addEventListener('scroll', () => { this._bookScroll = scroll.scrollTop; }, { passive: true });
    if (this._focusSkill) requestAnimationFrame(() => this.renderSkillFocus());

    // ---- pie: ayuda + reinicio de ramas ----
    const hint = document.createElement('div'); hint.className = 'sk-assign-hint';
    hint.innerHTML = 'Arrastra una habilidad a una ranura de la barra · clic para ver sus ramas · clic derecho en una ranura del HUD para cambiarla. La ranura <b>2</b> admite defensa/utilidad <b>o</b> una segunda gastadora.';
    cont.appendChild(hint);
    if (Object.keys(p.skillBranches || {}).length || Object.keys(p.skillMods || {}).length) {
      const free = this.game.canRespecFree?.() ?? true;
      const rb = document.createElement('button');
      rb.className = 'quest-btn sk-respec';
      rb.innerHTML = `${icon('recycle')} Reiniciar ramas <span class="dim">(gratis fuera de combate)</span>`;
      rb.disabled = !free;
      rb.onclick = () => { this.game.respecSkills(); this.renderSkills(); this.updateHUD(); };
      cont.appendChild(rb);
    }
  }

  // barra de 6 ranuras dentro del libro (destino del arrastre; clic = selector)
  renderBookBar() {
    const p = this.game.player;
    const wrap = document.createElement('div'); wrap.className = 'sk-book-bar';
    wrap.innerHTML = '<span class="sk-book-bar-lbl">Barra</span>';
    for (const slot of ['lmb', 'rmb', 'k1', 'k2', 'k3', 'k4']) {
      const label = this.slotKeyLabel(slot);
      const sk = p.hotbar?.[slot] ? p.cls.skills.find(s => s.id === p.hotbar[slot]) : null;
      const sec = HM.BOOK_SECTIONS.find(s => s.slots.includes(slot));
      const b = document.createElement('button');
      b.className = 'sk-bb-slot' + (sk ? ' cat-' + sk.cat : ' empty') + (sk?.kind === 'talent' ? ' talent' : '');
      b.dataset.hbSlot = slot;
      b.innerHTML = (sk ? this.skillIconHTML(sk, 'sk-bb-ico') : '<span class="sk-bb-ico dim">+</span>') +
        this.catBadgeHTML(sk?.cat || (slot === 'k2' ? 'defense' : sec?.cats[0]), 'sk-cat') + `<span class="sk-bb-key">${label}</span>`;
      b.title = `${label}: ${sk ? sk.name : 'vacía'}${slot === 'k2' ? ' · flexible: defensa/utilidad o gastadora' : ''} — clic para cambiar`;
      b.onclick = () => this.hotbarSlotChooser(slot, label);
      wrap.appendChild(b);
    }
    return wrap;
  }

  // tarjeta de una habilidad en el libro
  skillBookCard(sk, { onBar = null, spec = null } = {}) {
    const p = this.game.player;
    const known = isKnown(p, sk);
    const lvl = p.skills[sk.id] || 0;
    const prof = known ? resolveSkill(p, sk) : null;
    const art = sk.kind === 'talent' ? this.skillArt(sk) : null;
    const card = document.createElement('div');
    card.className = `sk-card cat-${sk.cat}${sk.kind === 'talent' ? ' talent' : ''}${known ? '' : ' locked'}${onBar ? ' onbar' : ''}`;
    card.dataset.skill = sk.id;
    card.tabIndex = 0;
    const branches = SKILL_MODS[sk.id] || [];
    const brHTML = branches.length ? `<div class="sk-card-br">${branches.map(br => {
      const unl = !!p.skillBranches?.[sk.id]?.[br.id];
      const sel = (p.skillMods?.[sk.id] || {})[br.id];
      const opt = sel && br.opts.find(o => o.id === sel);
      return `<span class="sk-br${unl ? ' on' : ''}" title="${br.name}${opt ? ': ' + opt.name + ' — ' + opt.desc : unl ? '' : ' · se desbloquea con 1 punto'}">${unl ? '' : '🔒 '}${br.name}${opt ? ` · <b>${opt.name}</b>` : ''}</span>`;
    }).join('')}</div>` : '';
    let tag = '';
    if (sk.kind === 'talent') {
      const from = art?.tree === 'cls' ? 'árbol de clase' : art?.specName ? `${art.specName}` : 'talento';
      tag = `<span class="sk-talent-tag inline" title="Activa concedida por un talento (${from})">TALENTO · ${from}</span>`;
    }
    const rankHTML = known
      ? `<span class="sk-card-rank" title="Rango ${lvl}: sube solo con el nivel (cada 8 niveles desde que se aprende)">R${lvl} ${this.skillPips(Math.min(lvl, RANK_MAX), RANK_MAX)}</span>`
      : `<span class="sk-card-rank lock">${icon('lock')} ${sk.kind === 'talent' ? 'Talento' : 'Nivel ' + sk.req}</span>`;
    const barTag = onBar ? `<span class="sk-card-slot" title="Está en la ranura ${this.slotKeyLabel(onBar)}">${this.slotKeyLabel(onBar)}</span>` : '';
    card.innerHTML = this.skillIconHTML(sk, 'sk-card-ico') +
      `<div class="sk-card-main"><div class="sk-card-name"><b>${sk.name}</b>${tag}</div>` +
      `<div class="sk-card-sub">${rankHTML}${prof ? `<span class="sk-card-nums">${profileSummary(prof) || ''}</span>` : ''}</div>` +
      `<div class="sk-card-desc">${sk.desc || ''}</div>${brHTML}</div>` +
      `<div class="sk-card-side">${barTag}${branches.length ? `<span class="sk-card-brn" title="Ramas desbloqueadas">${Object.values(p.skillBranches?.[sk.id] || {}).filter(Boolean).length}/${branches.length}</span>` : ''}</div>`;
    card.title = known ? `${sk.name}: arrastra a la barra · clic para ver sus ramas` : `${sk.name}: ${sk.kind === 'talent' ? 'concédela con su talento (N)' : 'se aprende sola al nivel ' + sk.req}`;
    card.addEventListener('pointerdown', (e) => this.skillDragStart(e, sk, card));
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter') this.openSkillFocus(sk.id); });
    return card;
  }

  // ---- arrastrar una habilidad del libro a la barra ----
  skillDragStart(e, sk, card) {
    if (e.button !== 0) return;
    const d = { sk, card, sx: e.clientX, sy: e.clientY, moved: false, ghost: null, id: e.pointerId };
    const p = this.game.player;
    const targets = () => document.querySelectorAll('[data-hb-slot]');
    const move = (ev) => {
      if (ev.pointerId !== d.id) return;
      if (!d.moved && Math.hypot(ev.clientX - d.sx, ev.clientY - d.sy) > 7) {
        if (!isKnown(p, sk)) return; // las que no conoces no se arrastran
        d.moved = true;
        const gh = document.createElement('div'); gh.className = 'drag-ghost sk-ghost';
        gh.innerHTML = this.skillIconHTML(sk, 'sk-ghost-ico') + this.catBadgeHTML(sk.cat, 'sk-cat');
        document.body.appendChild(gh); d.ghost = gh;
        document.body.classList.add('sk-dragging');
        for (const t of targets()) t.classList.add(fitsSlot(sk, t.dataset.hbSlot) ? 'drop-ok' : 'drop-no');
      }
      if (d.moved) {
        d.ghost.style.left = ev.clientX + 'px'; d.ghost.style.top = ev.clientY + 'px';
        const el = document.elementFromPoint(ev.clientX, ev.clientY)?.closest?.('[data-hb-slot]') || null;
        if (el !== d.over) { d.over?.classList.remove('drop-hover'); d.over = el; el?.classList.add('drop-hover'); }
      }
    };
    const up = (ev) => {
      if (ev.pointerId !== d.id) return;
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
      document.body.classList.remove('sk-dragging');
      for (const t of targets()) t.classList.remove('drop-ok', 'drop-no', 'drop-hover');
      d.ghost?.remove();
      if (!d.moved) { if (ev.type === 'pointerup') this.openSkillFocus(sk.id); return; }
      const el = document.elementFromPoint(ev.clientX, ev.clientY)?.closest?.('[data-hb-slot]');
      if (!el) return;
      const slot = el.dataset.hbSlot;
      if (!fitsSlot(sk, slot)) {
        const where = HM.catSection(sk.cat)?.slots.map(s => this.slotKeyLabel(s)).join(' o ') || '';
        this.message(`${sk.name} no va en la ranura ${this.slotKeyLabel(slot)}${where ? ` (va en ${where})` : ''}`);
        this.game.sfx?.('error');
        return;
      }
      if (this.game.assignHotbar(slot, sk.id)) { this.game.sfx?.('uiclick'); this.message(`${sk.name} → ranura ${this.slotKeyLabel(slot)}`, 1600); }
      this.refreshHotbar(); this.updateHUD();
      if (this.activePanel === 'skills') this.renderSkills();
    };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  }

  // símbolo (sin texto) que representa el efecto dominante de una opción de pasivo
  optSym(o) {
    if (o.dot === 'bleed') return '🩸'; if (o.dot === 'burn') return '🔥'; if (o.dot === 'poison') return '🧪';
    if (o.execute) return '☠️'; if (o.chain) return '⛓️'; if (o.pierce) return '🏹';
    if (o.stun) return '💫'; if (o.vuln) return '🎯'; if (o.slow) return '❄️';
    if (o.proj) return '✺'; if (o.radius) return '🌀'; if (o.crit) return '✦';
    if (o.lifesteal) return '🩹'; if (o.gen) return '⚡'; if (o.cdr > 0) return '⏱️';
    if (o.buff) return '⬆️'; if (o.dur) return '⌛'; if (o.dmg) return '⚔️';
    return '◆';
  }
  // refresca la vista de habilidades respetando si está abierto el FOCO
  refreshSkillsView() { if (this._focusSkill) this.renderSkillFocus(); else if (this.activePanel === 'skills') this.renderSkills(); }

  // ===== Vista FOCO (drill-down): especialización RADIAL de una habilidad =====
  openSkillFocus(skId) { this._focusSkill = skId; this._modPending = null; this._focusZoom = 1; this.renderSkillFocus(); }
  closeSkillFocus() {
    this._focusSkill = null;
    const ov = $('skill-tree')?.querySelector('.sk-focus');
    if (ov) ov.remove();
    this.renderSkills(); this.updateHUD();
  }
  // texto del inspector (abajo): opción enfocada o, por defecto, la habilidad
  _focusInspect(html) { const el = document.getElementById('sk-focus-insp'); if (el) el.innerHTML = html; }

  renderSkillFocus() {
    const skId = this._focusSkill; if (!skId) return;
    const g = this.game, p = g.player;
    const sk = p.cls.skills.find(s => s.id === skId); if (!sk) return;
    const node = (p.cls.tree || []).find(nd => nd.skills?.includes(skId)) || { req: 1, name: '' };
    const vp = $('skill-tree')?.querySelector('.sk-viewport'); if (!vp) return;
    let ov = vp.querySelector('.sk-focus');
    if (!ov) {
      ov = document.createElement('div'); ov.className = 'sk-focus';
      // el foco captura sus propios gestos: no dejar que d3-zoom mueva el árbol de fondo
      ov.addEventListener('pointerdown', e => e.stopPropagation());
      ov.addEventListener('wheel', e => e.stopPropagation());
      vp.appendChild(ov);
    }
    const W = vp.clientWidth, H = vp.clientHeight;
    ov.innerHTML = '';
    ov.onclick = e => { if (e.target === ov) this.closeSkillFocus(); };
    const back = document.createElement('button'); back.className = 'sk-focus-back';
    back.innerHTML = '← Volver al libro'; back.onclick = () => this.closeSkillFocus();
    ov.appendChild(back);
    const wheel = document.createElement('div'); wheel.className = 'sk-focus-wheel'; ov.appendChild(wheel);
    // capa de zoom: todo el contenido radial va aquí para poder reducirlo
    const zoomLayer = document.createElement('div'); zoomLayer.className = 'sk-focus-zoom'; wheel.appendChild(zoomLayer);
    const cx = W / 2, cy = H * 0.47;
    // radio que ENCAJA en el visor dejando margen para etiquetas y nodos
    const R = Math.max(64, Math.min(W / 2 - 86, cy - 70, H - cy - 90));
    this._focusZoom = this._focusZoom || 1;
    zoomLayer.style.transformOrigin = `${cx}px ${cy}px`;
    zoomLayer.style.transform = `scale(${this._focusZoom})`;
    const applyFZoom = () => { zoomLayer.style.transform = `scale(${this._focusZoom})`; const l = ov.querySelector('.sk-fzoom-lbl'); if (l) l.textContent = Math.round(this._focusZoom * 100) + '%'; };
    // controles de zoom de la rueda (rueda del ratón + botones)
    ov.onwheel = e => { e.preventDefault(); this._focusZoom = Math.max(0.45, Math.min(1.4, Math.round((this._focusZoom + (e.deltaY < 0 ? 0.1 : -0.1)) * 20) / 20)); applyFZoom(); };
    const fz = document.createElement('div'); fz.className = 'sk-zoom sk-fzoom';
    fz.innerHTML = `<button class="sk-zoom-b" data-z="out">−</button><span class="sk-fzoom-lbl">${Math.round(this._focusZoom * 100)}%</span><button class="sk-zoom-b" data-z="in">+</button>`;
    fz.querySelector('[data-z=out]').onclick = () => { this._focusZoom = Math.max(0.45, this._focusZoom - 0.1); applyFZoom(); };
    fz.querySelector('[data-z=in]').onclick = () => { this._focusZoom = Math.min(1.4, this._focusZoom + 0.1); applyFZoom(); };
    ov.appendChild(fz);

    const lvl = p.skills[sk.id] || 0, maxed = lvl >= RANK_MAX;
    const unlockedSkill = isKnown(p, sk);
    const prof = resolveSkill(p, sk);
    const cost = prof?.cost || 0;
    const res = p.cls.resource;

    // SVG de líneas radiales (rombo-habilidad → cada opción)
    const SVGNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(SVGNS, 'svg'); svg.setAttribute('class', 'sk-focus-svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('width', W); svg.setAttribute('height', H);
    zoomLayer.appendChild(svg);
    let lines = '';

    const branches = SKILL_MODS[sk.id] || [];
    const N = Math.max(1, branches.length);
    branches.forEach((br, bi) => {
      const baseAng = (-90 + bi * (360 / N)) * Math.PI / 180;
      const unlocked = !!p.skillBranches?.[sk.id]?.[br.id];
      const sel = (p.skillMods[sk.id] || {})[br.id] || null;
      const M = br.opts.length;
      br.opts.forEach((o, oi) => {
        const ang = baseAng + (oi - (M - 1) / 2) * (26 * Math.PI / 180);
        const x = cx + Math.cos(ang) * R, y = cy + Math.sin(ang) * R;
        lines += `<line x1="${cx.toFixed(1)}" y1="${cy.toFixed(1)}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" class="sk-focus-line${unlocked ? ' on' : ''}${sel === o.id ? ' sel' : ''}"/>`;
        const on = sel === o.id;
        const pending = !unlocked && g._modPending === (sk.id + '/' + br.id + '/' + o.id);
        const b = document.createElement('button');
        b.className = 'sk-focus-opt' + (on ? ' on' : '') + (unlocked ? '' : ' locked') + (pending ? ' pending' : '') + (br.name === 'Transformación' ? ' big' : '');
        b.style.left = x + 'px'; b.style.top = y + 'px';
        b.textContent = this.optSym(o);
        const show = () => this._focusInspect(`<b>${o.name}</b><span>${o.desc}</span><em>${unlocked ? (on ? '✓ activa' : 'Haz clic para elegir (gratis)') : pending ? '⚠ Haz clic otra vez para desbloquear (1 punto)' : `🔒 Rama «${br.name}» — desbloquea por 1 punto`}</em>`);
        b.onmouseenter = show; b.onfocus = show;
        b.onclick = () => { show(); g.chooseSkillMod(sk.id, br.id, o.id); };
        zoomLayer.appendChild(b);
      });
      // etiqueta de la rama
      const lx = cx + Math.cos(baseAng) * (R + 52), ly = cy + Math.sin(baseAng) * (R + 52);
      const lbl = document.createElement('div');
      lbl.className = 'sk-focus-blabel' + (unlocked ? ' on' : '') + (br.name === 'Transformación' ? ' big' : '');
      lbl.style.left = lx + 'px'; lbl.style.top = ly + 'px';
      lbl.innerHTML = unlocked ? br.name : `🔒 ${br.name}<small>1 punto</small>`;
      zoomLayer.appendChild(lbl);
    });
    svg.innerHTML = lines;

    // centro: habilidad + rango + subir + soportes
    const center = document.createElement('div'); center.className = 'sk-focus-center';
    center.style.left = cx + 'px'; center.style.top = cy + 'px';
    // Paso 2b.0: el rango sube SOLO con el nivel (y talentos/equipo); no se compra
    const upHtml = !unlockedSkill
      ? `<button class="sk-focus-up" disabled>🔒 Nivel ${sk.req}</button>`
      : `<button class="sk-focus-up" disabled>${maxed ? '★ Rango máximo por nivel' : 'Sube con el nivel'}</button>`;
    center.innerHTML = `${this.skillIconHTML(sk, 'sk-focus-ico', { big: true })}<div class="sk-focus-name">${sk.name}</div>` +
      `<div class="sk-focus-rank">${this.skillPips(Math.min(lvl, RANK_MAX), RANK_MAX)} <em>R${lvl}</em></div>${upHtml}`;
    zoomLayer.appendChild(center);
    // soportes (engarces) bajo el centro, si la conoces y tiene huecos (básico/definitiva 1, resto 2)
    if (unlockedSkill && supportSockets(sk) > 0) this.renderSupportSlots(center, sk, () => this.renderSkillFocus());

    // inspector inferior
    const insp = document.createElement('div'); insp.className = 'sk-focus-inspector'; insp.id = 'sk-focus-insp';
    ov.appendChild(insp);
    this._focusInspect(`<b>${this.skillIconHTML(sk, 'sk-inline-ico')} ${sk.name}</b><span>${sk.desc}</span><em>${profileSummary(prof)}${cost ? '' : ' · sin coste'} (${res?.name || ''}). Elige 1 opción por rama (la 1ª de cada rama cuesta 1 punto).</em>`);
  }

  // detalle de una habilidad (subir rango + engarces de soporte si aplica)
  skillDetailPopup(sk, node) {
    const g = this.game, p = g.player;
    const pop = $('item-popup');
    pop.style.left = pop.style.top = pop.style.transform = '';
    const lvl = p.skills[sk.id] || 0;
    const reqLvl = sk.req || node?.req || 1;
    const unlocked = isKnown(p, sk);
    const res = p.cls.resource;
    const details = this.skillDetails(sk, Math.max(1, lvl));
    pop.innerHTML = `
      <div class="popup-name">${this.skillIconHTML(sk, 'sk-inline-ico')} ${sk.name} <span class="dim">${unlocked ? 'R' + lvl : 'Nv ' + reqLvl}</span></div>
      <div class="popup-sub">${sk.desc}</div>
      <div class="sk-detail-nums">${details} (${res?.name || ''})</div>
      <div class="popup-btns codex-choose"></div>`;
    const btns = pop.querySelector('.popup-btns');
    const up = document.createElement('button');
    up.className = 'btn-good';
    up.disabled = true;
    up.textContent = unlocked ? `Rango ${lvl} · sube con el nivel` : `🔒 Se aprende al nivel ${reqLvl}`;
    btns.appendChild(up);
    if (unlocked && supportSockets(sk) > 0) this.renderSupportSlots(pop, sk, () => this.skillDetailPopup(sk, node));
    const c = document.createElement('button'); c.textContent = 'Cerrar';
    c.onclick = () => pop.classList.add('hidden');
    btns.appendChild(c);
    pop.classList.remove('hidden');
  }

  // Multi-socket: hasta 2 soportes por habilidad. Muestra dos selectores con el
  // efecto y la contrapartida de cada soporte; los incompatibles aparecen en gris.
  renderSupportSlots(infoEl, sk, onChange) {
    const p = this.game.player;
    const MAX_SLOTS = supportSockets(sk); // huecos: básico/definitiva 1, resto 2 (§4.3)
    // normaliza a array (retrocompat con saves viejos en string)
    let cur = p.supports[sk.id];
    if (typeof cur === 'string') cur = cur ? [cur] : [];
    if (!Array.isArray(cur)) cur = [];
    p.supports[sk.id] = cur;

    // soportes conocidos compatibles con el tipo de esta habilidad
    const compat = SUPPORTS.filter(s => supportFits(s, sk) && p.knownSupports.includes(s.id));
    if (!compat.length && !cur.length) return;

    const wrap = document.createElement('div');
    wrap.className = 'sk-supports';
    const head = document.createElement('div');
    head.className = 'sk-supports-head';
    head.innerHTML = `${icon('gem')} Engarces de soporte <span class="sk-eng-count">${cur.length}/${MAX_SLOTS}</span>`;
    head.title = 'Engarza hasta 2 soportes para modificar esta habilidad. Cada uno tiene un efecto y, a veces, una contrapartida.';
    wrap.appendChild(head);

    const persist = () => {
      // limpia vacíos y duplicados, recorta a MAX_SLOTS
      const clean = [];
      for (const id of p.supports[sk.id]) if (id && !clean.includes(id)) clean.push(id);
      p.supports[sk.id] = clean.slice(0, MAX_SLOTS);
      p.resolved = {};                 // el perfil de la habilidad cambia con sus soportes
      this.game.save();
      (onChange || (() => this.renderSkills()))();
    };

    for (let slot = 0; slot < MAX_SLOTS; slot++) {
      const chosen = cur[slot] || '';
      const sel = document.createElement('select');
      sel.className = 'sk-support';
      // opciones: vacío + compatibles conocidos. Los ya usados en el OTRO slot se marcan en gris/disabled.
      const usedElsewhere = cur.filter((_, i) => i !== slot);
      let opts = `<option value="">Engarce ${slot + 1}: vacío</option>`;
      // los conocidos pero incompatibles con esta habilidad se listan deshabilitados (gris)
      const known = SUPPORTS.filter(s => p.knownSupports.includes(s.id));
      for (const s of known) {
        const incompatible = !supportFits(s, sk);
        const dup = usedElsewhere.includes(s.id);
        const dis = incompatible || dup;
        const label = `${s.icon} ${s.name}${s.trade ? ` (${s.effect}, ${s.trade})` : ` (${s.effect || ''})`}` +
          (incompatible ? ' — incompatible' : dup ? ' — ya engarzado' : '');
        opts += `<option value="${s.id}"${s.id === chosen ? ' selected' : ''}${dis && s.id !== chosen ? ' disabled' : ''}>${label}</option>`;
      }
      sel.innerHTML = opts;
      sel.value = chosen;
      sel.onchange = () => {
        const arr = p.supports[sk.id].slice();
        arr[slot] = sel.value;
        p.supports[sk.id] = arr;
        persist();
      };
      wrap.appendChild(sel);
    }

    // resumen del efecto combinado de los soportes engarzados
    const active = cur.map(id => SUPPORTS.find(s => s.id === id)).filter(Boolean);
    if (active.length) {
      const sum = document.createElement('small');
      sum.className = 'sk-support-sum';
      sum.innerHTML = active.map(s =>
        `${s.icon} <b>${s.effect || s.name}</b>${s.trade ? ` <span class="sk-trade">⚠ ${s.trade}</span>` : ''}`
      ).join(' · ');
      wrap.appendChild(sum);
    }

    infoEl.appendChild(wrap);
  }

  // números FINALES del lanzamiento (resolveSkill: rango, ramas, soportes, CDR…)
  skillDetails(sk, lvl) {
    void lvl;
    return profileSummary(resolveSkill(this.game.player, sk)) || '—';
  }

  // nº de glifos que tienes en la mochila sin engarzar en el Tablero de Paragon
  unsocketedGlyphCount() {
    const p = this.game.player;
    return (p.materials || []).filter(it => it.kind === 'glyph').length;
  }

  // Barra de navegación del "build" que conecta Personaje ↔ Habilidades ↔ Paragon.
  // Se inserta en lo alto de los tres paneles para que se entienda que son partes
  // del mismo sistema y para hacer EVIDENTE dónde están habilidades y glifos.
  buildNavHTML(active) {
    const p = this.game.player;
    const para = p.paragon || {};
    const skillBadge = p.skillPoints > 0 ? `<span class="bnav-badge">${p.skillPoints}</span>` : '';
    const pgPts = para.points || 0;
    const freeGlyphs = this.unsocketedGlyphCount();
    const pgBadge = (pgPts + freeGlyphs) > 0 ? `<span class="bnav-badge">${pgPts + freeGlyphs}</span>` : '';
    const hasBoard = p.level >= 20 || pgPts > 0 || Object.keys(para.nodes || {}).length > 0;
    // tab: si está bloqueado se muestra IGUAL (descubribilidad/aspiración) con
    // candado y el nivel requerido; al pulsarlo se abre una vista de preview.
    const tab = (key, ico, label, badge, on, lockLvl) =>
      `<button class="bnav-tab${on ? ' on' : ''}${lockLvl ? ' bnav-locked' : ''}" data-bnav="${key}"${lockLvl ? ` title="Se desbloquea en el nivel ${lockLvl}"` : ''}>${icon(ico)} <span class="bnav-lbl">${label}</span>${lockLvl ? `<span class="bnav-lock">${icon('lock')} Nv ${lockLvl}</span>` : badge}</button>`;
    return `<div class="build-nav">
        ${tab('stats', 'hero', 'Personaje', '', active === 'stats')}
        ${tab('skills', 'book', 'Habilidades', skillBadge, active === 'skills')}
        ${tab('paragon', 'star', 'Paragon', pgBadge, active === 'paragon', hasBoard ? 0 : 20)}
      </div>`;
  }

  // conecta los clics de la barra de build a los paneles correspondientes
  bindBuildNav(containerEl) {
    if (!containerEl) return;
    containerEl.querySelectorAll('[data-bnav]').forEach(btn => {
      btn.onclick = () => {
        const dest = btn.dataset.bnav;
        if (dest === 'paragon') this.openParagon();
        else this.togglePanel(dest);
      };
    });
  }

  renderStats() {
    const p = this.game.player;
    const s = p.stats;
    const head = document.querySelector('#panel-stats .panel-head h2');
    if (head) head.textContent = `${p.cls.icon} ${p.heroName} · ${p.cls.name} Nv ${p.level}`;

    // barra de navegación del build (Personaje ↔ Habilidades ↔ Paragon)
    const nav = $('cs-build-nav');
    if (nav) { nav.innerHTML = this.buildNavHTML('stats'); this.bindBuildNav(nav); }

    // --- cabecera del héroe ---
    const xpNeed = xpForLevel(p.level);
    const xpPct = Math.max(0, Math.min(100, (p.xp / xpNeed) * 100));
    $('cs-hero').innerHTML = `
      <div class="cs-hero-top">
        <span class="cs-hero-icon">${p.cls.icon}</span>
        <div class="cs-hero-id">
          <div class="cs-hero-name">${p.heroName}</div>
          <div class="cs-hero-sub">${p.cls.name} · Nivel ${p.level}</div>
          ${p.title ? `<div class="cs-hero-title">${p.title}</div>` : ''}
        </div>
      </div>
      <div class="cs-power" title="Poder del héroe: resume la fuerza de tu build. Sube al mejorar equipo, nivel, paragon o talentos.">⚡ Poder <b>${s.power || 0}</b></div>
      <div class="cs-xp"><div class="cs-xp-fill" style="width:${xpPct}%"></div></div>
      <div class="cs-xp-txt">XP ${p.xp} / ${xpNeed}</div>`;

    // --- atributos ---
    const sp = $('stat-points');
    sp.textContent = p.statPoints > 0 ? `${p.statPoints} pts` : 'Sin puntos';
    sp.classList.toggle('cs-points-active', p.statPoints > 0);
    const ATTR_ICONS = { fue: 'str', des: 'dex', vit: 'vit', ene: 'ene' };
    const cont = $('attr-list');
    cont.innerHTML = '';
    for (const key of ['fue', 'des', 'vit', 'ene']) {
      const row = document.createElement('div');
      row.className = 'cs-attr';
      row.title = STAT_DESC[key];
      row.innerHTML = `
        <span class="cs-attr-icon">${icon(ATTR_ICONS[key], { cls: 'attr-' + key })}</span>
        <div class="cs-attr-body">
          <div class="cs-attr-name">${STAT_NAMES[key]} <span class="cs-attr-val">${p.attributes[key]}</span></div>
          <div class="cs-attr-desc">${STAT_DESC[key]}</div>
        </div>`;
      const b = document.createElement('button');
      b.className = 'sk-plus cs-plus';
      b.textContent = '+';
      b.disabled = p.statPoints <= 0;
      b.title = 'Asignar punto';
      b.onclick = () => { p.attributes[key]++; p.statPoints--; p.recompute(); this.renderStats(); this.updateHUD(); this.game.save(); };
      row.appendChild(b);
      cont.appendChild(row);
    }
    // respec de atributos (sumidero de oro)
    if (p.level > 1) {
      const rb = document.createElement('button');
      rb.className = 'quest-btn cs-respec';
      rb.textContent = `🔄 Redistribuir atributos (${this.game.respecCost()} 🪙)`;
      rb.disabled = p.gold < this.game.respecCost();
      rb.onclick = () => { this.game.respecAttributes(); this.renderStats(); this.updateHUD(); };
      cont.appendChild(rb);
    }

    // --- paragon (tablero de nodos, nivel 20+) ---
    const pgSection = $('paragon-section');
    const pg = $('paragon');
    const para = p.paragon || {};
    const hasBoard = p.level >= 20 || para.points > 0 || Object.keys(para.nodes || {}).length > 0;
    const freeGlyphs = this.unsocketedGlyphCount();
    if (hasBoard) {
      pgSection.style.display = '';
      // avisos: puntos sin gastar y/o glifos sin engarzar (descubribilidad)
      let alert = '';
      if (para.points > 0) alert += `<div class="cs-build-alert">⚠️ Tienes <b>${para.points}</b> punto(s) de Paragon sin gastar.</div>`;
      if (freeGlyphs > 0) alert += `<div class="cs-build-alert glyph">🔷 Tienes <b>${freeGlyphs}</b> glifo(s) en la mochila sin engarzar.</div>`;
      pg.innerHTML = `<div class="cs-section-head">
          <span class="cs-section-title">🌟 Paragon y Glifos</span>
          <span class="cs-points ${para.points > 0 ? 'cs-points-active' : ''}">${para.points > 0 ? `${para.points} pts sin gastar` : 'Nv 20+'}</span>
        </div>
        ${alert}
        <p class="cs-build-help">Engarza glifos (🔷) en los nodos de engarce (◇) del tablero para potenciar tu build.</p>`;
      const ob = document.createElement('button');
      ob.className = 'quest-btn cs-build-cta';
      ob.innerHTML = `🌟 Abrir Tablero de Paragon / Glifos${(para.points + freeGlyphs) > 0 ? ` <span class="bnav-badge">${para.points + freeGlyphs}</span>` : ''}`;
      ob.onclick = () => this.openParagon();
      pg.appendChild(ob);
    } else pgSection.style.display = 'none';

    // --- estadísticas derivadas, agrupadas ---
    // cada línea lleva un tooltip (title) que explica qué hace la estadística
    const statLine = (ico, label, val, key) =>
      `<div class="cs-stat"${key && DERIVED_DESC[key] ? ` title="${DERIVED_DESC[key]}"` : ''}><span class="cs-stat-lbl">${icon(ico, { cls: 'cs-stat-ico' })} ${label}</span><span class="cs-stat-val">${val}</span></div>`;
    const group = (title, lines) => lines ? `<div class="cs-stat-group"><div class="cs-stat-group-title">${title}</div>${lines}</div>` : '';
    const offensive =
      statLine('sword', 'Daño', `${s.dmgMin} - ${s.dmgMax}`, 'dmg') +
      statLine('crit', 'Crítico', `${s.crit.toFixed(1)}%`, 'crit') +
      (s.lph ? statLine('blood', 'Vida al golpear', s.lph, 'lph') : '') +
      (s.mph ? statLine('mana', 'Maná al golpear', s.mph, 'mph') : '') +
      (s.thorns ? statLine('thorns', 'Espinas', s.thorns, 'thorns') : '');
    const defensive =
      statLine('vit', 'Vida', `${Math.ceil(p.hp)} / ${s.maxHP}`, 'maxHP') +
      statLine('mana', 'Maná', `${Math.ceil(p.mp)} / ${s.maxMP}`, 'maxMP') +
      statLine('shield', 'Armadura', `${s.arm} <span class="dim">(−${Math.round(armorReduction(s.arm, (this.game.world?.type === 'dungeon' || this.game.world?.type === 'zone') ? this.game.world.scaleFloor : areaLevelForHero(p.level)) * 100)}% físico)</span>`, 'arm');
    const utility =
      statLine('sword', 'Vel. de ataque', `${(1 / Math.max(0.05, s.atkTime)).toFixed(2)}/s${s.aspdPct ? ` <span class="dim">(+${Math.round(s.aspdPct)}%)</span>` : ''}`, 'aspd') +
      statLine('boot', 'Velocidad', s.spd.toFixed(1), 'spd') +
      statLine('clover', 'Hallazgo mágico', `${s.mf || 0}%`, 'mf') +
      (s.cdr ? statLine('hourglass', 'Reducción de enfriamiento', `${s.cdr}%`, 'cdr') : '');
    $('derived-stats').innerHTML =
      group('Ofensivas', offensive) +
      group('Defensivas', defensive) +
      group('Utilidad', utility);

    // --- crónica ---
    const r = p.records;
    const h = Math.floor(r.playTime / 3600), m = Math.floor((r.playTime % 3600) / 60);
    const rec = (ico, label, val) => `<div class="cs-rec"><span class="cs-rec-lbl">${icon(ico, { cls: 'cs-rec-ico' })} ${label}</span><span class="cs-rec-val">${val}</span></div>`;
    $('records').innerHTML =
      rec('skull', 'Monstruos', r.kills) +
      rec('star', 'Élites/campeones', r.eliteKills) +
      rec('crown', 'Jefes', r.bossKills) +
      rec('mask', 'Mímicos', r.mimics) +
      rec('pit', 'Piso más profundo', r.maxFloor) +
      rec('vortex', 'Grieta máxima', `Nv ${r.maxRift || 0}`) +
      rec('star', 'Legendarios', r.legendaries) +
      rec('crown', 'Piezas de conjunto', r.setPieces || 0) +
      rec('chest', 'Cofres abiertos', r.chests) +
      rec('coin', 'Oro recogido', r.goldEarned) +
      rec('target', 'Misiones', r.quests || 0) +
      rec('dice', 'Desafíos diarios', r.dailies || 0) +
      rec('grave', 'Muertes', r.deaths) +
      rec('clock', 'Tiempo jugado', `${h}h ${m}m`);

    // tabla local del desafío diario
    const log = this.game.dailyLog || [];
    const fmt = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
    $('daily-log').innerHTML = log.length
      ? log.map(e => `<div class="cs-daily">${e.date} · ${CLASSES[e.cls]?.icon || ''} Nv ${e.level} · Piso ${e.floor} · ⏱️ ${fmt(e.time)}${e.hc ? ' ☠️' : ''}</div>`).join('')
      : '<div class="dim">Aún no has completado ningún Desafío Diario</div>';
  }

  renderShop() {
    const g = this.game, p = g.player;
    g.ensureShopStock();
    const cont = $('shop-items');
    cont.innerHTML = '';
    // crea una sección con cabecera y devuelve el contenedor de sus ofertas
    const section = (title, help) => {
      const sec = document.createElement('div');
      sec.className = 'npc-section';
      let h = `<div class="npc-section-head"><span>${title}</span></div>`;
      if (help) h += `<p class="npc-help">${help}</p>`;
      sec.innerHTML = h;
      cont.appendChild(sec);
      return sec;
    };
    // botón de oferta con estado legible (disponible / sin oro suficiente)
    const offer = (parent, html, price, fn) => {
      const b = document.createElement('button');
      b.className = 'shop-item';
      const poor = p.gold < price;
      if (poor) b.classList.add('no-gold');
      b.innerHTML = `<span class="shop-name">${html}</span><span class="shop-price">${icon('coin', { cls: 'ico-gold' })} ${price}</span>`;
      b.disabled = poor;
      if (poor) b.title = 'Oro insuficiente';
      b.onclick = () => { fn(); this.renderShop(); this.updateHUD(); };
      parent.appendChild(b);
    };

    // --- consumibles ---
    const sCons = section(`${icon('flask')} Consumibles`, 'Reabastece tus pociones antes de bajar.');
    offer(sCons, `${icon('potion')} Poción de Vida <small class="shop-stats">Tienes ${p.potions.hp}</small>`, POTION_PRICES.hp,
      () => { p.gold -= POTION_PRICES.hp; p.potions.hp++; g.sfx('potion'); g.save(); });
    offer(sCons, `${icon('flask')} Poción de Maná <small class="shop-stats">Tienes ${p.potions.mp}</small>`, POTION_PRICES.mp,
      () => { p.gold -= POTION_PRICES.mp; p.potions.mp++; g.sfx('potion'); g.save(); });

    // --- mascota: ahora se compra y mejora con el Domador de Bestias ---
    {
      const sPet = section(`${icon('wolf')} Compañero`, 'El Domador de Bestias (🐾) se encarga de mascotas y mejoras.');
      sPet.insertAdjacentHTML('beforeend', '<p class="npc-empty">Busca al <b>Domador de Bestias</b> en el pueblo para adoptar y mejorar a tu compañero.</p>');
    }

    // --- mercancía rotativa ---
    const sStock = section(`${icon('chest')} Mercancía del día`, 'Stock que rota con el temporizador.');
    if (!g.shopStock.items.length) {
      sStock.insertAdjacentHTML('beforeend', '<p class="npc-empty">Agotado — vuelve tras la próxima rotación.</p>');
    }
    for (const it of g.shopStock.items) {
      const r = RARITIES[it.rarity];
      const stats = itemStatLines(it).join(' · ');
      offer(sStock,
        `<span style="color:${r.color}">${it.icon} ${it.name}</span>
         <small class="shop-stats">${SLOT_NAMES[it.slot]} · Nv.${it.ilvl} · ${stats}</small>`,
        it.price,
        () => g.buyShopItem(it.uid)
      );
    }

    // --- apuesta: objetos sin identificar, puede tocar legendario ---
    const sGamble = section(`${icon('dice')} Apuesta del Mercader`, 'Objetos sin identificar: rareza mínima mágica… ¿quizá legendario?');
    if (!g.shopStock.gamble.length) {
      sGamble.insertAdjacentHTML('beforeend', '<p class="npc-empty">Sin apuestas disponibles ahora mismo.</p>');
    }
    for (const ofr of g.shopStock.gamble) {
      offer(sGamble,
        `${icon('question')} ${SLOT_NAMES[ofr.slot]} misterioso
         <small class="shop-stats">Se identifica al comprarlo.</small>`,
        ofr.price,
        () => g.buyGambleItem(ofr.uid)
      );
    }
    this.updateShopTimer();
    $('shop-gold').innerHTML = `${icon('coin', { cls: 'ico-gold' })} ${p.gold}`;
  }

  updateShopTimer() {
    const stock = this.game.shopStock;
    if (!stock) return;
    const s = Math.max(0, Math.ceil((stock.until - Date.now()) / 1000));
    $('shop-timer').innerHTML = `${icon('hourglass')} Rota en ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  showDeath(hardcore = false) {
    this.deathHardcore = hardcore;
    $('death-text').textContent = hardcore
      ? '☠️ Modo Hardcore: tu héroe ha caído para siempre y su historia termina aquí.'
      : 'Las profundidades reclaman otra alma...';
    $('btn-respawn').textContent = hardcore ? 'Crear un nuevo héroe' : 'Despertar en el Pueblo';
    const scr = $('death-screen');
    // pantalla de muerte más dramática: fundido a rojo/negro + entrada reiniciada
    scr.classList.toggle('hardcore', !!hardcore);
    scr.classList.remove('hidden');
    if (!this.game.settings?.reduceMotion) {
      scr.classList.remove('dramatic');
      void scr.offsetWidth;          // reinicia la animación de entrada
      scr.classList.add('dramatic');
    }
  }
  hideDeath() { $('death-screen').classList.add('hidden'); }

  // ---------- mapa descubierto (tap en el minimapa) ----------
  openMap() {
    if (this.activePanel !== 'map') {
      this.closePanel();
      this.activePanel = 'map';
      $('panel-map').classList.remove('hidden');
      this.markJustOpened();
    }
    this.renderMap();
    this.renderWorldMap(); // el listado del mundo solo al abrir (no a 10Hz)
  }

  // dibuja el mapa descubierto; se llama cada frame mientras el panel está
  // abierto para que sea "en vivo" (jugador y enemigos se mueven en tiempo real).
  // Paso 2d: fondo de pergamino y marcadores con los sprites mk_* (rectos, aunque
  // el plano gire 45°); si un sprite no cargó se pinta el punto/rombo de siempre.
  renderMap() {
    if (this.activePanel !== 'map') return;
    const w = this.game.world, g = w.grid;
    const ex = w.explored || new Set();
    const cv = $('map-canvas');
    const S = 420; if (cv.width !== S) { cv.width = S; cv.height = S; }
    const ctx = cv.getContext('2d');
    const cs = S / Math.max(g.w, g.h);
    ctx.clearRect(0, 0, S, S); // el pergamino es el fondo CSS del lienzo
    ctx.save();
    ctx.translate(S / 2, S / 2);
    ctx.rotate(Math.PI / 4);
    ctx.scale(0.7071, 0.7071);
    ctx.translate(-S / 2, -S / 2);
    // celdas descubiertas: tinta sepia sobre el pergamino
    for (let z = 0; z < g.h; z++) for (let x = 0; x < g.w; x++) {
      if (!ex.has(z * g.w + x)) continue;
      ctx.fillStyle = g.cells[z][x] ? 'rgba(74,52,28,0.62)' : 'rgba(28,20,12,0.82)';
      ctx.fillRect(x * cs, z * cs, Math.ceil(cs), Math.ceil(cs));
    }
    const m = ctx.getTransform();
    const marks = [];
    const at = (pos) => m.transformPoint(new DOMPoint((pos.x - g.ox) * cs, (pos.z - g.oz) * cs));
    const dot = (pos, color, r, shape) => this._marker(ctx, (pos.x - g.ox) * cs, (pos.z - g.oz) * cs, color, r, shape);
    const seen = (pos) => ex.has((Math.floor(pos.z - g.oz)) * g.w + Math.floor(pos.x - g.ox));
    const mctx = this._mapCtx();
    // POIs (solo los ya descubiertos)
    for (const it of w.interactables) {
      if (!seen(it.pos)) continue;
      const spr = HM.poiSprite(it, mctx);
      if (spr && this._sprite(spr)) { marks.push({ p: at(it.pos), spr, size: HM.markerSize(spr, true), dim: HM.poiLocked(it, mctx) }); continue; }
      const s = this._poiStyle(it);
      if (s) dot(it.pos, s.color, s.r + 1.5, s.shape);
    }
    // botín en el suelo (mágico o mejor) en celdas descubiertas
    for (const gi of this.game.groundItems || []) {
      const it = gi.item; if (!it || !gi.mesh) continue;
      if (it.kind === 'gold' || it.rarity === 'normal' || !RARITIES[it.rarity]) continue;
      if (seen(gi.mesh.position)) dot(gi.mesh.position, '#' + ((RARITIES[it.rarity].glow ?? 0xffffff) >>> 0).toString(16).padStart(6, '0'), 3, 'diamond');
    }
    // enemigos en vivo (solo en celdas descubiertas)
    for (const e of this.game.enemies) {
      if (!e.alive || !seen(e.pos)) continue;
      const spr = HM.enemySprite(e);
      if (spr && this._sprite(spr)) { marks.push({ p: at(e.pos), spr, size: HM.markerSize(spr, true) }); continue; }
      dot(e.pos, this.enemyDot(e), (e.def.boss || e.def.worldBoss) ? 5 : 3, (e.def.boss || e.def.worldBoss) ? 'diamond' : 'dot');
    }
    const death = this._deathHere();
    if (death) marks.push({ p: at(death), spr: 'muerte', size: HM.markerSize('muerte', true) });
    const pl = this.game.player;
    if (pl) {
      if (this._sprite('jugador')) marks.push({ p: at(pl.pos), spr: 'jugador', size: HM.markerSize('jugador', true), rot: this._playerMarkRot(m, pl) });
      else dot(pl.pos, '#ffffff', 4);
    }
    ctx.restore();
    this._drawMarks(ctx, marks);
    const pct = Math.round(ex.size / (g.w * g.h) * 100);
    $('map-info').textContent = `${w.biome || w.type} · descubierto ${pct}%`;
    this.renderMapLegend();
  }

  // contexto para elegir sprites (misión, grieta, nivel)
  _mapCtx() {
    const p = this.game.player, w = this.game.world;
    return { level: p?.level || 1, quest: p?.quest || null, rift: w?.rift || 0 };
  }
  // posición de la última muerte si fue en ESTE mundo (no se guarda)
  _deathHere() {
    const d = this.game.lastDeath, w = this.game.world;
    if (!d || !w) return null;
    return d.type === w.type && (d.biome || '') === (w.biome || '') && (d.floor || 0) === (w.floor || 0) && (d.rift || 0) === (w.rift || 0) ? d.pos : null;
  }
  // giro del sprite del jugador: su orientación en el mundo llevada al plano girado
  _playerMarkRot(m, pl) {
    const ry = pl.group?.rotation?.y || 0;
    const dx = Math.sin(ry), dy = Math.cos(ry);
    const vx = m.a * dx + m.c * dy, vy = m.b * dx + m.d * dy;
    return Math.atan2(vy, vx) + Math.PI / 2; // el sprite apunta hacia arriba
  }
  // sprites rectos (sin la rotación del plano), con una sombra para leerse sobre cualquier fondo
  _drawMarks(ctx, marks) {
    // de menos a más importante: el jugador queda encima
    const order = { jugador: 9, jefe: 8, muerte: 7, elite: 6, goblin: 6 };
    marks.sort((a, b) => (order[a.spr] || 0) - (order[b.spr] || 0));
    for (const mk of marks) {
      const img = this._sprite(mk.spr); if (!img) continue;
      const sz = mk.size;
      ctx.save();
      ctx.translate(mk.p.x, mk.p.y);
      if (mk.rot) ctx.rotate(mk.rot);
      ctx.globalAlpha = mk.dim ? 0.45 : 1;
      ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = 3;
      ctx.drawImage(img, -sz / 2, -sz / 2, sz, sz);
      ctx.restore();
    }
  }

  // leyenda del mapa: los MISMOS sprites que el mapa, solo con lo que puede
  // aparecer en este mundo (p. ej. cofres/descenso en mazmorra, no en pueblo)
  renderMapLegend() {
    const el = $('map-legend'); if (!el) return;
    const w = this.game.world;
    const ctx = { ...this._mapCtx(), enemies: this.game.enemies.filter(e => e.alive), death: !!this._deathHere() };
    const items = HM.mapLegend(w, ctx);
    const sig = items.map(i => i.sprite).join(',');
    if (sig === this._legendSig) return;
    this._legendSig = sig;
    el.innerHTML = items.map(({ sprite, label }) =>
      `<span class="lg-item"><img class="lg-spr" src="${HM.mapIcon('mk_' + sprite)}" alt="" draggable="false">${label}</span>`
    ).join('') + `<span class="lg-item"><i class="lg-mk lg-dot" style="background:#cc4444"></i>Enemigo</span><span class="lg-item"><i class="lg-mk lg-diamond" style="background:#ff66cc"></i>Botín</span>`;
  }

  // Mapa del Mundo (D4-lite): regiones descubiertas, su estado y viaje rápido.
  // Las vecinas sin descubrir se insinúan como "???" para invitar a explorar.
  renderWorldMap() {
    const el = $('worldmap-body'); if (!el) return;
    const g = this.game, p = g.player;
    if (!p) { el.innerHTML = ''; return; }
    const disc = new Set(p.discoveredZones || ['Cripta']);
    // visible = descubierta o vecina de una descubierta (se insinúa como "???")
    const shown = ZONE_LIST.filter(z => disc.has(z.biome) ||
      ZONE_LIST.some(o => disc.has(o.biome) && (o.links || []).includes(z.biome)));
    let html = `<div class="wm-title">🌍 Mapa del Mundo — ${disc.size}/${ZONE_LIST.length} regiones</div><div class="wm-graph">`;
    shown.forEach((z, idx) => {
      if (idx > 0) {
        const prev = shown[idx - 1];
        const linked = (z.links || []).includes(prev.biome);
        const both = disc.has(z.biome) && disc.has(prev.biome);
        html += `<div class="wm-edge${linked ? '' : ' none'}${both ? ' on' : ''}"></div>`;
      }
      if (!disc.has(z.biome)) {
        html += `<div class="wm-node locked" title="Región sin descubrir — sigue un camino 🛣️"><span class="wm-node-ico">❓</span><span class="wm-node-name">¿? ¿?</span><span class="wm-node-sub">sin descubrir</span></div>`;
        return;
      }
      const here = g.world.type === 'zone' && g.world.biome === z.biome;
      const unlocked = p.level >= z.minLevel;
      const cleared = (p.strongholdsCleared || []).includes(z.biome);
      const isRefuge = z.home || cleared;
      const unclaimed = z.stronghold && !cleared;
      const isHome = p.homeZone === z.biome;
      const ico = isRefuge ? '🏕️' : unclaimed ? '🏰' : '🌿';
      const sub = here ? 'aquí' : !unlocked ? `Nv ${z.minLevel}` : unclaimed ? 'bastión' : 'viajar';
      const cls = `wm-node${here ? ' here' : ''}${!unlocked ? ' lvl-locked' : ''}${isRefuge ? ' refuge' : ''}${unclaimed ? ' unclaimed' : ''}`;
      const star = isRefuge ? `<button class="wm-star${isHome ? ' on' : ''}" data-home="${z.biome}" title="${isHome ? 'Tu hogar de reaparición' : 'Fijar como hogar'}">⭐</button>` : '';
      html += `<div class="${cls}" ${(!here && unlocked) ? `data-go="${z.biome}"` : ''} title="${z.biome}${unclaimed ? ' · Bastión sin reclamar' : ''}">
        ${star}<span class="wm-node-ico">${ico}</span><span class="wm-node-name">${z.biome}</span><span class="wm-node-sub">${sub}</span></div>`;
    });
    html += `</div><p class="dim wm-foot">Haz clic en una región conectada para viajar · ⭐ fija tu hogar de reaparición.</p>`;
    el.innerHTML = html;
    el.querySelectorAll('.wm-node[data-go]').forEach(n => n.onclick = () => g.travelToZone(n.dataset.go));
    el.querySelectorAll('.wm-star').forEach(b => b.onclick = (e) => { e.stopPropagation(); g.setHomeZone(b.dataset.home); this.renderWorldMap(); });
  }

  // ---------- minimapa ----------
  initMinimap(world) {
    const base = document.createElement('canvas');
    const g = world.grid;
    base.width = g.w * 3; base.height = g.h * 3;
    const ctx = base.getContext('2d');
    const palette = { town: ['#2e4020', '#4e6a38'], refuge: ['#14102a', '#3a3055'], zone: ['#1a2415', '#3a4a2a'] };
    const [bg, walk] = palette[world.type] || ['#0a0a10', '#3c3a48'];
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, base.width, base.height);
    ctx.fillStyle = walk;
    for (let z = 0; z < g.h; z++)
      for (let x = 0; x < g.w; x++)
        if (g.cells[z][x]) ctx.fillRect(x * 3, z * 3, 3, 3);
    this.minimapBase = base;
    this.minimapGrid = g;
  }

  poiColor(type) {
    if (type === 'zone_dungeon') return '#aa66ff';
    if (type === 'portal_zone') return '#66cc55';
    if (type === 'zone_exit') return '#88dd66';
    if (type === 'portal_next') return '#ff5577';
    if (type === 'waypoint') return '#44ddff';
    if (type === 'shrine') return '#9ff0c4';
    if (type === 'world_event') return '#cc66ff';
    if (type === 'chest') return '#ffcf4a';
    if (type.startsWith('portal')) return '#55aaff';
    if (type === 'vendor' || type === 'questgiver' || type === 'stash' || type === 'enchanter' || type === 'healer' || type === 'petkeeper') return '#ffd24a';
    return null;
  }

  // estilo de marcador de un interactuable en los mapas: color, tamaño y FORMA
  // (rombo = punto de viaje/salida importante, cuadrado = cofre, punto = resto).
  // Devuelve null si no debe pintarse (p. ej. cofre ya saqueado).
  _poiStyle(it) {
    const t = it.type;
    if (t === 'chest') return it.opened ? null : { color: '#ffcf4a', r: 2.6, shape: 'square' };
    if (t === 'portal_next') return { color: '#ff5577', r: 3, shape: 'diamond' };
    if (t === 'zone_dungeon') return { color: '#aa66ff', r: 3, shape: 'diamond' };
    if (t === 'waypoint') return { color: '#44ddff', r: 3, shape: 'diamond' };
    // camino a otra región: verde; gris si aún no alcanzas su nivel mínimo
    if (t === 'zone_exit') {
      const locked = (this.game.player?.level || 1) < (it.minLevel || 0);
      return { color: locked ? '#777777' : '#88dd66', r: 3, shape: 'diamond' };
    }
    if (t.startsWith('portal')) return { color: this.poiColor(t) || '#55aaff', r: 3, shape: 'diamond' };
    const col = this.poiColor(t);
    return col ? { color: col, r: 2, shape: 'dot' } : null;
  }

  // dibuja un marcador con forma en un contexto 2D ya transformado
  _marker(ctx, x, y, color, r, shape = 'dot') {
    ctx.fillStyle = color;
    ctx.beginPath();
    if (shape === 'diamond') { ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath(); }
    else if (shape === 'square') { ctx.rect(x - r, y - r, r * 2, r * 2); }
    else { ctx.arc(x, y, r, 0, Math.PI * 2); }
    ctx.fill();
  }

  // color del punto de un enemigo en mapas (goblin dorado, jefe rojo, resto)
  enemyDot(e) {
    if (e.def.goblin) return '#ffd24a';
    if (e.def.boss || e.def.worldBoss) return '#ff2200';
    return '#cc4444';
  }

  drawMinimap() {
    const cv = $('minimap');
    if (!this.minimapBase) return;
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, cv.width, cv.height);
    const g = this.minimapGrid;
    const p = this.game.player;
    const big = g.w > 70 && p;
    let ox0 = 0, oz0 = 0, scale;
    // rotación de 45° para que coincida con la cámara isométrica: norte en
    // cámara = arriba en el minimapa
    ctx.save();
    ctx.translate(cv.width / 2, cv.height / 2);
    ctx.rotate(Math.PI / 4);
    ctx.translate(-cv.width / 2, -cv.height / 2);
    if (big) {
      const view = 46;
      ox0 = Math.max(0, Math.min(g.w - view, (p.pos.x - g.ox) - view / 2));
      oz0 = Math.max(0, Math.min(g.h - view, (p.pos.z - g.oz) - view / 2));
      ctx.drawImage(this.minimapBase, ox0 * 3, oz0 * 3, view * 3, view * 3, 0, 0, cv.width, cv.height);
      scale = cv.width / view;
    } else {
      ctx.drawImage(this.minimapBase, 0, 0, cv.width, cv.height);
      scale = cv.width / g.w;
    }
    const m = ctx.getTransform();
    const marks = [];
    const lx = (pos) => (pos.x - g.ox - ox0) * scale, lz = (pos) => (pos.z - g.oz - oz0) * scale;
    const at = (pos) => m.transformPoint(new DOMPoint(lx(pos), lz(pos)));
    const dot = (pos, color, r, shape) => this._marker(ctx, lx(pos), lz(pos), color, r, shape);
    const mctx = this._mapCtx();
    // Paso 2d: sprites mk_* (14–18 px) para POIs, jefes, élites y goblin; puntos para el resto
    for (const it of this.game.world.interactables) {
      const spr = HM.poiSprite(it, mctx);
      if (spr && this._sprite(spr)) { marks.push({ p: at(it.pos), spr, size: HM.markerSize(spr) - 2, dim: HM.poiLocked(it, mctx) }); continue; }
      const s = this._poiStyle(it);
      if (s) dot(it.pos, s.color, s.r, s.shape);
    }
    // botín en el suelo (mágico o mejor): rombo del color de su rareza
    for (const gi of this.game.groundItems || []) {
      const it = gi.item; if (!it || !gi.mesh) continue;
      if (it.kind === 'gold' || it.rarity === 'normal' || !RARITIES[it.rarity]) continue;
      dot(gi.mesh.position, '#' + ((RARITIES[it.rarity].glow ?? 0xffffff) >>> 0).toString(16).padStart(6, '0'), 2, 'diamond');
    }
    for (const e of this.game.enemies) {
      if (!e.alive) continue;
      const spr = HM.enemySprite(e);
      if (spr && this._sprite(spr)) { marks.push({ p: at(e.pos), spr, size: HM.markerSize(spr) - 2 }); continue; }
      dot(e.pos, this.enemyDot(e), e.def.goblin ? 3 : 2, (e.def.boss || e.def.worldBoss) ? 'diamond' : 'dot');
    }
    const death = this._deathHere();
    if (death) marks.push({ p: at(death), spr: 'muerte', size: 14 });
    if (p) {
      if (this._sprite('jugador')) marks.push({ p: at(p.pos), spr: 'jugador', size: HM.markerSize('jugador'), rot: this._playerMarkRot(m, p) });
      else dot(p.pos, '#ffffff', 3);
    }
    ctx.restore();
    this._drawMarks(ctx, marks);
  }

  // ---------- Estatua del Mundo: Tormento (dificultad) + Códice ----------
  openProgress() {
    if (this.activePanel !== 'progress') {
      this.closePanel();
      this.activePanel = 'progress';
      $('panel-progress').classList.remove('hidden');
      this.markJustOpened();
    }
    this.renderProgress();
  }

  renderProgress() {
    const g = this.game, p = g.player;
    const cap = g.tormentUnlocked();
    const cur = Math.min(cap, p.torment || 0);
    const body = $('progress-body');
    const aspects = Object.values(p.codex || {});
    // --- Era (temporada local) ---
    const era = g.eraInfo();
    let html = `<h4>${era.mutator.icon} ${era.mutator.name} <span class="dim">· Temporada</span></h4>`;
    html += `<p class="dim">Mutador de la semana: <b>${era.mutator.desc}</b>. Cambia en ${Math.ceil(era.daysLeft)} día(s).</p>`;
    html += `<div class="era-objs">`;
    for (const o of era.objectives) {
      const pctO = Math.round(o.progress / o.goal * 100);
      const state = o.claimed ? '<span class="era-claimed">✔ Reclamado</span>'
        : o.done ? `<button class="era-claim" data-era="${o.id}">🏆 Reclamar (+${o.reward.gold}🪙${o.reward.frag ? ' +Frag' : ''})</button>`
        : `<span class="dim">${o.progress}/${o.goal}</span>`;
      html += `<div class="era-obj">
        <div class="era-obj-top"><span>${o.desc}</span>${state}</div>
        <div class="era-bar"><div class="era-bar-fill" style="width:${pctO}%"></div></div></div>`;
    }
    html += `</div>`;
    if (era.allDone && era.titleClaimed) html += `<p class="dim">🏆 ¡Temporada completada! Título obtenido.</p>`;
    html += `<h4>☠️ Dificultad — Tormento</h4>`;
    { const tm = tormentMods(Math.max(1, cur)); html += `<p class="dim">Más Tormento = enemigos más fuertes y mejor botín (rareza, cantidad y CALIDAD pre-forjada; el nivel de objeto no sube). Se desbloquea empujando grietas y descendiendo en las mazmorras.${cur > 0 ? ` Ahora (T${cur}): vida enemiga ×${tm.hp.toFixed(1)}, daño ×${tm.dmg.toFixed(2)}, XP ×${tm.xp.toFixed(1)}, calidad +${tm.quality}.` : ''}</p>`; }
    html += `<div class="torment-row" id="torment-btns"></div>`;
    html += `<p class="dim">Desbloqueado: <b>Tormento ${cap}</b>. ${cap < 10 ? 'Sigue progresando para subir el tope.' : '¡Tope máximo alcanzado!'}</p>`;
    html += `<h4>🔮 Códice de Aspectos</h4>`;
    html += `<p class="dim">Extrae el poder de un legendario (desde el inventario) para guardarlo aquí; luego puedes grabarlo en otra pieza por oro.</p>`;
    if (!aspects.length) html += `<p class="dim">— Aún no has extraído ningún aspecto —</p>`;
    else html += `<div class="codex-list">` + aspects.map(a => `<div class="codex-entry"><b>«${a.name}»</b><br><span class="dim">${a.desc}</span></div>`).join('') + `</div>`;
    // Bendiciones permanentes (una por categoría)
    const bl = p.blessings || {};
    html += `<h4>🌟 Bendiciones</h4>`;
    html += `<p class="dim">Gana bendiciones completando grietas (mayor nivel = más fuertes). Una activa por categoría.</p>`;
    html += `<div class="codex-list">` + ['Ofensiva', 'Defensiva', 'Celeridad', 'Fortuna'].map(c => {
      const b = bl[c];
      return `<div class="codex-entry"><b>${c}:</b> ${b ? `🌟 ${b.name} <span class="dim">(${b.text})</span>` : '<span class="dim">— vacía —</span>'}</div>`;
    }).join('') + `</div>`;
    // Pináculo (jefe uber)
    const frags = g.fragmentCount();
    html += `<h4>👁️ Pináculo</h4>`;
    html += `<p class="dim">Reúne 3 Fragmentos de Pináculo (de jefes de mundo y grietas) y ofréndalos para invocar al Heraldo del Vacío: suelta un objeto MÍTICO de doble poder.</p>`;
    html += `<p>Fragmentos: <b>${frags} / 3</b></p>`;
    html += `<button id="pinnacle-btn" class="quest-btn">👁️ Invocar al Pináculo</button>`;
    body.innerHTML = html;
    const btnRow = $('torment-btns');
    for (let t = 0; t <= cap; t++) {
      const b = document.createElement('button');
      b.className = 'torment-btn' + (t === cur ? ' sel' : '');
      b.textContent = t === 0 ? 'Normal' : 'T' + t;
      b.onclick = () => { g.setTorment(t); this.renderProgress(); this.updateHUD(); };
      btnRow.appendChild(b);
    }
    const pb = $('pinnacle-btn');
    if (pb) { pb.disabled = frags < 3; pb.onclick = () => g.summonPinnacle(); }
    body.querySelectorAll('[data-era]').forEach(b =>
      b.onclick = () => { g.claimEraReward(b.dataset.era); this.renderProgress(); this.updateHUD(); });
  }

  // ---------- Guía de Sistemas (onboarding / descubribilidad) ----------
  openGuide() {
    if (this.activePanel !== 'guide') {
      this.closePanel();
      this.activePanel = 'guide';
      $('panel-guide').classList.remove('hidden');
      this.markJustOpened();
    }
    this.renderGuide();
  }

  renderGuide() {
    const p = this.game.player;
    const body = $('guide-body');
    let html = `<p class="dim">Todo lo que ofrece IntentoRPG. Lo bloqueado se desbloquea jugando — así sabes qué te espera.</p>`;
    html += `<div class="guide-list">`;
    for (const sys of SYSTEMS_GUIDE) {
      const lvlLocked = sys.req && p.level < sys.req;
      const status = lvlLocked
        ? `<span class="guide-lock">${icon('lock')} Nivel ${sys.req}</span>`
        : sys.req
          ? `<span class="guide-ok">✓ Disponible</span>`
          : `<span class="guide-how">${sys.reqText || ''}</span>`;
      html += `<div class="guide-row${lvlLocked ? ' locked' : ''}">
        <span class="guide-ico">${sys.icon}</span>
        <div class="guide-info"><div class="guide-name">${sys.name} ${status}</div>
          <div class="guide-desc">${sys.desc}</div></div>
      </div>`;
    }
    html += `</div>`;
    body.innerHTML = html;
  }

  // ---------- Domador de Bestias (mascota de utilidad) ----------
  openPet() {
    if (this.activePanel !== 'pet') {
      this.closePanel();
      this.activePanel = 'pet';
      $('panel-pet').classList.remove('hidden');
      this.markJustOpened();
    }
    this.renderPet();
  }

  renderPet() {
    const g = this.game, p = g.player;
    const body = $('pet-body');
    const gold = p.gold;
    const pet = p.pet;
    let html = '';

    if (!pet) {
      // adopción: elegir modelo
      html += `<h4>🐾 Adopta un compañero</h4>`;
      html += `<p class="dim">Tu compañero <b>no combate</b>: recoge botín, atrae tesoros y te otorga un aura de utilidad. Elige modelo (puedes conseguir más luego):</p>`;
      html += `<div class="pet-grid">`;
      for (const [id, k] of Object.entries(PET_KINDS)) {
        const poor = gold < k.price;
        html += `<div class="pet-card">
          <div class="pet-card-ico">${k.icon}</div>
          <div class="pet-card-name">${k.name}</div>
          <div class="dim pet-card-desc">${k.desc}</div>
          <button class="quest-btn pet-buy${poor ? ' no-gold' : ''}" data-buy="${id}" ${poor ? 'disabled' : ''}>
            ${icon('coin', { cls: 'ico-gold' })} ${k.price}</button>
        </div>`;
      }
      html += `</div>`;
      body.innerHTML = html;
      body.querySelectorAll('[data-buy]').forEach(b =>
        b.onclick = () => { g.buyPet(b.dataset.buy); this.renderPet(); this.updateHUD(); });
      return;
    }

    // --- ya tienes compañero ---
    const cur = PET_KINDS[pet.kind] || PET_KINDS.lobo;
    html += `<h4>${cur.icon} ${cur.name}</h4>`;
    html += `<p class="dim">Compañero de utilidad — no hace daño. Recoge botín y te da un aura según su collar.</p>`;

    // mejoras
    html += `<h4>⬆️ Mejoras</h4><div class="pet-upg-list">`;
    for (const [key, u] of Object.entries(PET_UPGRADES)) {
      const lvl = pet.upgrades?.[key] || 0;
      const maxed = lvl >= u.max;
      const cost = g.petUpgradeCost(key);
      const poor = gold < cost;
      const pips = '●'.repeat(lvl) + '○'.repeat(u.max - lvl);
      html += `<div class="pet-upg">
        <div class="pet-upg-info"><b>${u.icon} ${u.name}</b> <span class="pet-pips">${pips}</span>
          <span class="dim">${u.desc}</span></div>
        <button class="quest-btn pet-upg-btn${poor && !maxed ? ' no-gold' : ''}" data-upg="${key}" ${maxed || poor ? 'disabled' : ''}>
          ${maxed ? 'MÁX' : `${icon('coin', { cls: 'ico-gold' })} ${cost}`}</button>
      </div>`;
    }
    html += `</div>`;

    // collar (aura de utilidad)
    html += `<h4>📿 Collar (aura de utilidad)</h4><div class="pet-collar-row">`;
    for (const [id, c] of Object.entries(PET_COLLARS)) {
      const owned = id === 'none' || pet.ownedCollars?.[id];
      const equipped = pet.collar === id;
      const poor = !owned && gold < c.price;
      const label = id === 'none' ? `${c.icon} Ninguno`
        : `${c.icon} ${c.name}<br><small class="dim">${c.desc}</small>`;
      const cost = owned ? (equipped ? 'Equipado' : 'Equipar') : `${c.price}`;
      html += `<button class="quest-btn pet-collar${equipped ? ' sel' : ''}${poor ? ' no-gold' : ''}"
        data-collar="${id}" ${equipped || poor ? 'disabled' : ''}>${label}<span class="pet-collar-cost">${owned ? cost : icon('coin', { cls: 'ico-gold' }) + ' ' + cost}</span></button>`;
    }
    html += `</div>`;

    // otros modelos
    html += `<h4>🎨 Modelos</h4><div class="pet-collar-row">`;
    for (const [id, k] of Object.entries(PET_KINDS)) {
      const owned = pet.owned?.[id];
      const active = pet.kind === id;
      const poor = !owned && gold < k.price;
      const cost = owned ? (active ? 'Activo' : 'Usar') : `${k.price}`;
      html += `<button class="quest-btn pet-collar${active ? ' sel' : ''}${poor ? ' no-gold' : ''}"
        data-kind="${id}" ${active || poor ? 'disabled' : ''}>${k.icon} ${k.name}<span class="pet-collar-cost">${owned ? cost : icon('coin', { cls: 'ico-gold' }) + ' ' + cost}</span></button>`;
    }
    html += `</div>`;

    body.innerHTML = html;
    body.querySelectorAll('[data-upg]').forEach(b =>
      b.onclick = () => { g.upgradePet(b.dataset.upg); });
    body.querySelectorAll('[data-collar]').forEach(b =>
      b.onclick = () => { g.setPetCollar(b.dataset.collar); });
    body.querySelectorAll('[data-kind]').forEach(b =>
      b.onclick = () => { g.switchPetKind(b.dataset.kind); });
  }

  // ---------- Tablero de Paragon ----------
  openParagon() {
    if (this.activePanel !== 'paragon') {
      this.closePanel();
      this.activePanel = 'paragon';
      $('panel-paragon').classList.remove('hidden');
      this.markJustOpened();
    }
    this.renderParagon();
  }

  nodeStatsText(node) {
    const parts = Object.entries(node.stats || {}).map(([k, v]) => statText(k, v));
    if (node.desc) parts.push(node.desc);
    return parts.join(' · ') || (node.type === 'start' ? 'Inicio' : '');
  }

  renderParagon() {
    const g = this.game, p = g.player;
    const para = p.paragon || { points: 0, nodes: {} };
    const N = PARAGON_BOARD_SIZE;
    const board = paragonBoardFor(p.classId);
    const cost = g.respecParagonCost();
    const nav = $('pg-build-nav');
    if (nav) { nav.innerHTML = this.buildNavHTML('paragon'); this.bindBuildNav(nav); }
    $('paragon-points').textContent = para.points > 0 ? `${para.points} puntos sin gastar` : 'Sin puntos · sube de nivel (20+)';
    $('paragon-points').classList.toggle('cs-points-active', para.points > 0);
    // avisos visibles: puntos sin gastar / glifos sin engarzar
    const alertEl = $('pg-alert');
    if (alertEl) {
      const freeGlyphs = this.unsocketedGlyphCount();
      const freeSockets = board.filter(n => n.type === 'socket' && para.nodes?.[n.id] && !para.glyphs?.[n.id]).length;
      const lockedBoard = p.level < 20 && !para.points && !Object.keys(para.nodes || {}).length;
      let html = '';
      if (lockedBoard) html += `<div class="locked-banner">${icon('lock')} El Tablero de Paragon se desbloquea en el <b>nivel 20</b> (te faltan ${20 - p.level}). A partir de ahí cada nivel da 1 punto para gastar en este tablero. Esto es una vista previa de lo que te espera.</div>`;
      if (para.points > 0) html += `<div class="cs-build-alert">⚠️ Tienes <b>${para.points}</b> punto(s) sin gastar.</div>`;
      if (freeGlyphs > 0) html += `<div class="cs-build-alert glyph">🔷 Tienes <b>${freeGlyphs}</b> glifo(s) sin engarzar${freeSockets > 0 ? ` y <b>${freeSockets}</b> engarce(s) ◇ libre(s)` : ''}. Haz clic en un engarce activo para colocarlos.</div>`;
      alertEl.innerHTML = html;
    }
    const grid = $('paragon-grid');
    grid.innerHTML = '';
    grid.style.gridTemplateColumns = `repeat(${N}, 1fr)`;
    const byPos = {};
    for (const n of board) byPos[n.x + ',' + n.y] = n;
    const glyph = { start: '◉', legendary: '★', rare: '◆', magic: '✦', minor: '•', socket: '◇' };
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const cell = document.createElement('div');
      cell.className = 'para-cell';
      const node = byPos[x + ',' + y];
      if (node) {
        const on = node.type === 'start' || !!para.nodes[node.id];
        const avail = !on && para.points > 0 && g.paragonNodeReachable(node.id);
        const gl = node.type === 'socket' ? para.glyphs?.[node.id] : null;
        cell.classList.add('para-node', 'pn-' + node.type);
        if (node.cat) cell.classList.add('cat-' + node.cat);
        if (on) cell.classList.add('on');
        if (avail) cell.classList.add('avail');
        if (gl) cell.classList.add('has-glyph');
        // engarce activo y vacío: resáltalo para que se vea dónde poner glifos
        const openSocket = node.type === 'socket' && on && !gl;
        if (openSocket) cell.classList.add('open-socket');
        cell.textContent = gl ? '🔷' : (glyph[node.type] || '•');
        cell.title = node.type === 'socket'
          ? (gl ? `🔷 ${gl.name} (clic para cambiar/quitar)` : 'Engarce de glifo ◇' + (on ? ' — clic para engarzar un glifo' : ' (actívalo primero)'))
          : (node.name ? node.name + ': ' : '') + this.nodeStatsText(node);
        cell.onclick = () => {
          if (node.type === 'socket') {
            const txt = gl ? `<b>${gl.name}</b>` : 'Engarce vacío';
            $('paragon-info').innerHTML = `🔷 ${txt}`;
            if (on) { this.paragonGlyphChooser(node); return; }
          } else {
            $('paragon-info').innerHTML = `${node.name ? `<b>${node.name}</b> — ` : ''}${this.nodeStatsText(node)}`;
          }
          if (!on && avail) { g.allocateParagonNode(node.id); this.renderParagon(); this.updateHUD(); }
        };
      }
      grid.appendChild(cell);
    }
    $('paragon-respec').textContent = `🔄 Reespecializar (${cost} 🪙)`;
    $('paragon-respec').disabled = p.gold < cost || !Object.keys(para.nodes || {}).length;
    $('paragon-respec').onclick = () => { g.respecParagon(); this.renderParagon(); this.updateHUD(); };
  }

  // engarzar/quitar un glifo en un nodo de engarce del tablero
  paragonGlyphChooser(node) {
    const g = this.game, p = g.player;
    const pop = $('item-popup');
    pop.style.left = pop.style.top = pop.style.transform = '';
    const glyphs = p.materials.filter(it => it.kind === 'glyph');
    const cur = p.paragon.glyphs?.[node.id];
    // familias de los nodos activos contiguos a este engarce (decisión de colocación)
    const board = paragonBoardFor(p.classId);
    const pnodes = p.paragon?.nodes || {};
    const adjNodes = board.filter(o => Math.abs(o.x - node.x) + Math.abs(o.y - node.y) === 1 && (o.type === 'start' || pnodes[o.id]));
    const adjFamCount = (fam) => adjNodes.filter(o => o.cat === fam).length;
    const famsHere = [...new Set(adjNodes.map(o => o.cat).filter(Boolean))].map(c => PARAGON_CATS[c] || c).join(', ') || 'ninguna activa';
    pop.innerHTML = `
      <div class="popup-name">🔷 Engarce de Paragon</div>
      <div class="popup-sub">${cur ? 'Engarzado: ' + cur.name : 'Engarce vacío'} · familias contiguas: ${famsHere}</div>
      <div class="popup-btns codex-choose"></div>`;
    const btns = pop.querySelector('.popup-btns');
    if (!glyphs.length && !cur) {
      const e = document.createElement('div'); e.className = 'dim';
      e.textContent = 'No tienes glifos. Caen en grietas y del Pináculo.';
      btns.appendChild(e);
    }
    glyphs.forEach(gl => {
      const b = document.createElement('button'); b.className = 'btn-good';
      const val = Math.round(glyphValue(gl, adjNodes.length, adjFamCount(gl.fam)));
      const famHit = gl.fam && adjFamCount(gl.fam) > 0 ? ' ⭐' : '';
      b.innerHTML = `Engarzar ${gl.name} <small class="dim">(→ ${statText(gl.stat, val)}${famHit})</small>`;
      b.onclick = () => { g.socketGlyph(node.id, p.materials.indexOf(gl)); pop.classList.add('hidden'); this.renderParagon(); this.updateHUD(); };
      btns.appendChild(b);
    });
    if (cur) {
      const u = document.createElement('button'); u.textContent = '↩️ Quitar glifo';
      u.onclick = () => { g.unsocketGlyph(node.id); pop.classList.add('hidden'); this.renderParagon(); this.updateHUD(); };
      btns.appendChild(u);
    }
    const c = document.createElement('button'); c.textContent = 'Cerrar';
    c.onclick = () => pop.classList.add('hidden');
    btns.appendChild(c);
    pop.classList.remove('hidden');
  }

  // elección de bendición permanente (recompensa de grieta/corrupción)
  // Resumen al completar una grieta: estadísticas de la corrida + recompensas.
  // Modal (pausa el juego vía activePanel); el botón Continuar encadena la oferta
  // de bendición. El elemento se crea perezosamente y se reutiliza.
  showRiftSummary(d, onContinue) {
    this.closePanel();
    let el = $('panel-riftsummary');
    if (!el) { el = document.createElement('div'); el.id = 'panel-riftsummary'; el.className = 'panel'; document.body.appendChild(el); }
    const fmtTime = (s) => { if (s == null) return '—'; const m = Math.floor(s / 60), ss = Math.round(s % 60); return `${m}:${ss.toString().padStart(2, '0')}`; };
    const num = (v) => (v == null ? null : Math.round(v).toLocaleString('es'));
    const stat = (ic, label, val) => (val == null ? '' : `<div class="rs-stat"><span class="rs-ico">${ic}</span><b class="rs-val">${val}</b><span class="rs-lbl">${label}</span></div>`);
    const rewards = (d.rewards || []).map(r => `<div class="rs-reward">${r.icon} ${r.label}</div>`).join('') || '<div class="dim">— botín en el suelo —</div>';
    el.innerHTML = `
      <div class="rs-banner">🌀</div>
      <h2 class="rs-title">Grieta Nivel ${d.rift} <span>completada</span></h2>
      <div class="rs-stats">
        ${stat('⏱️', 'Tiempo', fmtTime(d.time))}
        ${stat('💀', 'Monstruos', num(d.kills))}
        ${stat('✨', 'XP', num(d.xp))}
        ${stat('🪙', 'Oro', num(d.gold))}
        ${d.levels ? stat('⭐', 'Niveles', '+' + d.levels) : ''}
      </div>
      <div class="rs-rew-title">Recompensas</div>
      <div class="rs-rewards">${rewards}</div>
      <button class="rs-continue">Continuar ▸</button>`;
    el.classList.remove('hidden');
    this.activePanel = 'riftsummary';
    this.markJustOpened();
    this.game.sfx?.('levelup');
    el.querySelector('.rs-continue').onclick = () => {
      el.classList.add('hidden');
      this.activePanel = null;
      onContinue?.();
    };
  }

  openBlessing(offers) {
    this.closePanel();
    this.activePanel = 'blessing';
    $('panel-blessing').classList.remove('hidden');
    const p = this.game.player;
    const body = $('blessing-body');
    body.innerHTML = `<p class="dim">Recompensa de corrupción: elige una bendición <b>permanente</b>. Sustituye a la de su categoría.</p>`;
    const row = document.createElement('div');
    row.className = 'bless-cards';
    offers.forEach((o, i) => {
      const cur = p.blessings?.[o.cat];
      const card = document.createElement('div');
      card.className = 'bless-card';
      card.innerHTML = `<div class="bless-cat">${o.cat}</div><div class="bless-name">🌟 ${o.name}</div>` +
        `<div class="bless-eff">${o.text}</div>` +
        (cur ? `<div class="bless-cur dim">Reemplaza: ${cur.text}</div>` : `<div class="bless-cur dim">Categoría vacía</div>`);
      card.onclick = () => this.game.chooseBlessing(i);
      row.appendChild(card);
    });
    body.appendChild(row);
  }

  // selector de aspecto conocido para grabar en un objeto
  codexImprintChooser(item, ctx) {
    const g = this.game, p = g.player;
    const pop = $('item-popup');
    const aspects = Object.values(p.codex || {});
    pop.innerHTML = `
      <div class="popup-name">🔮 Grabar aspecto en:</div>
      <div class="popup-sub">${item.name} · coste ${g.imprintCost(item)} 🪙</div>
      <div class="popup-btns codex-choose"></div>`;
    const btns = pop.querySelector('.popup-btns');
    aspects.forEach(a => {
      const b = document.createElement('button');
      b.className = 'btn-good';
      b.innerHTML = `«${a.name}»`;
      b.onclick = () => { g.imprintAspect(ctx.index, a.id); pop.classList.add('hidden'); this.renderPanel(); this.updateHUD(); };
      btns.appendChild(b);
    });
    const cancel = document.createElement('button');
    cancel.textContent = 'Cancelar';
    cancel.onclick = () => pop.classList.add('hidden');
    btns.appendChild(cancel);
    pop.classList.remove('hidden');
  }
}
