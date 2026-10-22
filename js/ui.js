// ============================================================
// Interfaz: HUD, inventario, árbol de habilidades, paneles
// ============================================================
import * as THREE from 'three';
import { CLASSES, STAT_NAMES, STAT_DESC, TIER_LEVELS, PACTS, ENEMIES, ELITE_MODS, ZONE_LIST, xpForLevel, POTION_PRICES, PET_PRICE, PET_KINDS, PET_UPGRADES, PET_COLLARS, paragonBoardFor, PARAGON_CATS, PARAGON_BOARD_SIZE } from './data.js';
// Paso 2b.0: números finales de las habilidades (coste/CD/soportes) desde el resolvedor único
import { resolveSkill, fitsSlot, profileSummary, isKnown, GCD } from './skill-resolve.js';
import { RARITIES, SLOT_NAMES, SETS, LEGENDARY_POWERS, RUNES, RUNEWORDS, itemStatLines, statText, glyphValue } from './items.js';
import { BINDABLE_ACTIONS, keyLabel } from './bindings.js';
import { materialStackKey } from './entities.js';
import { SYSTEMS_GUIDE } from './data.js';
import { CAPS, CRIT_MULT, armorReduction, tormentMods, areaLevelForHero } from './combat-math.js';
// Paso 2d: panel de talentos (módulo propio), indicador de especialización y modelo puro del HUD
import * as Talents from './talents.js';
import { createTalentPanel, gameTalentOps } from './ui-talents.js';
import { reasonText, TALENT_REASONS } from './talents-view.js';
import { gaugeView } from './spec-mechanics.js';
import { createGaugeHud } from './ui-gauges.js';
import * as HM from './hud-model.js';
// Paso 2 (E3 · U3): libro con forja (T), feedback de los verbos por frame y avisos de la migración
import { createSkillBook } from './ui-skills.js';
import { createVerbHud } from './ui-verbs.js';
import { LOAD_NOTICES } from './save-schema.js';

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

// Paso 2 (E3 · U3) ---------------------------------------------------------------
const SPEC_AT = Talents.TALENT_RULES.specAt;            // nivel en que se elige especialización
const BOARD_PTS = Talents.TALENT_RULES.pts.board;       // puntos del tablero de glifos (Nv81–100)
// motivos de las respuestas del mixin de talentos (TALENT_REASONS): si llega el código pelado
// a ui.message (una llamada fuera del panel sin `text`), se traduce con el texto del panel
const TALENT_REASON_SET = new Set(TALENT_REASONS);
// textos de los avisos de carga (migración de la partida): van a su tarjeta, no al banner
const NOTICE_TEXTS = new Set(Object.values(LOAD_NOTICES).filter(Boolean));
// avisos que emite la subida de nivel (progression.levelUpAward y Player.onSkillsLearned): con la
// tarjeta de novedades (2f §7.1) quedan solo en el registro de sistema
const LEVEL_MSG_RE = /^(?:⭐|🌿|🌟|🔷)\s*(?:¡?Nivel\s+\d+|¡Especializaciones)|^📖 Nueva habilidad:/u;
// títulos del micromenú que cambian con el Paso 2 (el «Paragon» es ahora la columna del árbol
// héroe de los talentos; P abre el tablero de glifos)
const MICRO_TITLE = { paragon: 'Tablero de glifos' };
const NEWS_MS = 8000;
const pl = (n, uno, varios) => (n === 1 ? uno : varios);

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
    // Paso 2 (E3 · U3): libro con forja (T) y feedback de los verbos (cada frame, D26). El libro
    // va DESPUÉS del panel de talentos: su tira «qué cambia» (cambio de especialización) queda encima
    this.initBook();
    this.initVerbHud();
    this.bindNewsCards();
    this.preloadMapSprites();
    this.decoratePanels();
  }

  // ============================================================
  // Paso 2d · talentos, iconos pintados y marcos
  // ============================================================
  // Panel de talentos v2 (js/ui-talents.js, E3 · U1). Las mutaciones van por el mixin
  // game-talents.js con el envoltorio gameTalentOps (§3.4: recompute, barra, guardado y avisos
  // de apertura y pausa del Paragon); el panel las llama directamente y se repinta solo.
  // Aquí solo se envuelven las que pueden cambiar de especialización, para enseñar la tira
  // «qué cambia» del libro (2f §3.8.1): foto ANTES y resumen DESPUÉS.
  initTalentPanel() {
    const g = this.game;
    try {
      const ops = gameTalentOps(g);
      const swap = (fn) => (...a) => {
        const prev = g.player ? HM.specSnapshot(g.player) : null;
        const r = fn(...a);
        if (r?.ok && prev && (g.player?.talents?.spec || null) !== (prev.spec || null)) this.showSpecSwap(prev);
        return r;
      };
      for (const k of ['chooseSpec', 'restore', 'importTalentCode', 'applyTalentLoadout']) ops[k] = swap(ops[k]);
      this.talentPanel = createTalentPanel(document.body, {
        ops, assetBase: 'assets/',
        getPlayer: () => g.player,
        getGame: () => g,
        onClose: () => this.closePanel(),
        onOpenBook: () => { this.closePanel(); this.togglePanel('skills'); },
      });
    } catch (e) { console.error('[talentos] no se pudo crear el panel', e); this.talentPanel = null; }
  }

  // libro de habilidades con forja (js/ui-skills.js, E3 · U2): se abre con la acción 'skills' (T).
  // Su ✕, T y Esc lo cierran él mismo y avisan por onClose; «Talentos N» pasa a los talentos
  initBook() {
    try {
      this.book = createSkillBook(document.body, {
        game: this.game,
        onClose: () => { if (this.activePanel === 'skills') this.activePanel = null; },
        onOpenTalents: () => this.openTalents(),
      });
      // clic en el fondo oscuro (fuera del escenario): cierra, como el panel de talentos
      this.book?.el?.addEventListener('pointerdown', (e) => { if (e.target === this.book.el) this.closePanel(); });
    } catch (e) { console.error('[libro] no se pudo crear', e); this.book = null; }
  }
  // feedback de los verbos en la barra y junto al cursor: UNA capa fija; update(realDt) desde
  // updateFloats en cada frame (D26), nunca desde updateHUD (10 Hz)
  initVerbHud() {
    try { this.verbHud = createVerbHud(document.body, { game: this.game }); }
    catch (e) { console.error('[verbos] no se pudo crear', e); this.verbHud = null; }
  }
  // tira «qué cambia» al cambiar de especialización (2f §3.8: insignia, activas, ★ y mecánica). El
  // cambio se hace casi siempre en el panel de talentos, y no hay hueco en él que no tape el pie
  // (kit y leyenda) o el árbol nuevo; en el libro, a 1366, pisaría la fila de la barra. Los dos ya
  // muestran la especialización nueva (el panel confirma con su aviso), así que la tira espera a
  // que vuelvas a la partida y sale bajo el banner (#hud-swap), nunca encima de la barra de acciones
  showSpecSwap(prev) {
    const p = this.game.player;
    if (!p || !this.book) return;
    try { this._swap = HM.specSwapSummary(prev, p); } catch (e) { console.warn('[libro] tira de especialización', e); this._swap = null; }
    this._flushSpecSwap();
  }
  _flushSpecSwap() {
    const sum = this._swap, host = $('hud-swap');
    if (!sum || !this.book || !host) return;
    if (this.activePanel || this.game.state !== 'play') return;     // con un panel abierto, espera
    try { this.book.showSpecSwap(sum, { host }); } catch (e) { console.warn('[libro] tira de especialización', e); this._swap = null; return; }
    this.updateTopBand();
    // sin sitio sobre la zona de combate (marco del objetivo + banner de 2 renglones a 1366): sigue
    // pendiente y se reintenta a 10 Hz, así sus 7 s no corren mientras espera
    if (host.classList.contains('tc-wait')) { host.classList.remove('on', 'tc-wait'); return; }
    this._swap = null;
    // con el kit 2g pasa a 2–3 filas: el separador que queda al final de una fila sobra
    for (const s of host.querySelectorAll('.row > .sep')) {
      const a = s.previousElementSibling, b = s.nextElementSibling;
      const mid = el => el.offsetTop + el.offsetHeight / 2;
      s.style.visibility = a && b && Math.abs(mid(a) - mid(b)) < 10 ? '' : 'hidden';
    }
  }
  // apaga la tira y lo pendiente: arranque, muerte, cambio de héroe (closeAllPanels)
  hideSpecSwap() {
    this._swap = null;
    $('hud-swap')?.classList.remove('on');
  }

  // N: abre el panel de talentos (o la elección de especialización si aún no hay)
  openTalents() {
    if (!this.talentPanel) return;
    if (this.activePanel === 'talents') { this.closePanel(); return; }
    const p = this.game.player;
    if (p && p.level >= SPEC_AT && !Talents.activeSpec(p)) { this.openSpecChoice(); return; }
    this.togglePanel('talents');
  }
  openSpecChoice() {
    if (!this.talentPanel) return;
    this.closePanel();
    this._setPanel('talents');
    this.talentPanel.showSpecChoice();
  }

  // aviso de especialización pendiente (Nv10): banner fijo + apertura automática de
  // la pantalla de elección la primera vez que estás fuera de combate y sin paneles (cuando
  // ya se apagó el rótulo «¡Nivel N!», que si no queda encima del selector)
  updateSpecPrompt(p) {
    const el = $('spec-prompt'); if (!el) return;
    const need = !!p && p.level >= SPEC_AT && !Talents.activeSpec(p);
    // la ranura 3 invita a elegir (hb-spec, clic → selector) solo si refreshHotbar la pinta así: al
    // llegar al Nv10 por XP (onSkillsLearned no coloca nada) o al elegir, se rehace la barra
    if (need !== this._specNeed) {
      this._specNeed = need;
      this.refreshHotbar();
      if (!need && this._news?.spec) this.hideLevelNews();   // la tarjeta del Nv10 decía «Elige tu especialización»
    }
    // la tarjeta de novedades de la subida de nivel ocupa su sitio mientras se ve
    el.classList.toggle('hidden', !need || this.activePanel === 'talents' || this._newsOn);
    if (!need) { this._specAutoShown = false; return; }
    if (!this._specAutoShown && this.game.state === 'play' && !this.activePanel && !this.game.canEditTalents?.()
      && performance.now() >= (this._luShowUntil || 0)) {
      this._specAutoShown = true;
      // un renglón del banner (≤ 760 px); el resto lo cuenta el propio selector
      this.message(`🌿 ¡Nivel ${SPEC_AT}! Elige tu especialización: rol, árbol y kit de habilidades`, 5000);
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
      const label = MICRO_TITLE[m.id] || m.label;
      btn.title = `${label}${k ? ` [${k}]` : ''}`;
      btn.setAttribute('aria-label', label);
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
      t.closest('#talents-panel') ||   // talentos v2 y libro: no llevan .panel y cierran solos
      t.closest('#skills-book') ||     //   con su fondo oscuro, su ✕, su tecla o Esc
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
  // un panel pasa a estar abierto: es el activo (pausa la partida) y cancela SIN coste la carga
  // o el canal que se mantenía (§3.6.1). Todo panel se abre por aquí
  _setPanel(name) {
    this.activePanel = name;
    this.game.cancelHeld?.('panel');
    this._flushVerbs();
    this.markJustOpened();
    this.hideHudTip();
  }
  // con un panel abierto la partida queda en pausa y main.tick ya no llama a updateFloats: la carga
  // que se acaba de cancelar dejaría su barra junto al cursor (z 60) congelada encima del panel.
  // Se pinta ya el estado sin carga y se agota el rastro (RESULT_MS = 420 ms) en dos pasos de 0,25 s
  _flushVerbs() {
    if (!this.verbHud) return;
    try { this.verbHud.update(0.25); this.verbHud.update(0.25); } catch (e) { console.warn('[verbos] al abrir un panel', e); }
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
    this._syncLevelSeen(p);
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
    // el texto se quita y se pone tras « · » (el título base lo pone refreshKeyLabels)
    const dot = (id, n, what) => { const b = $(id); if (!b) return; b.classList.toggle('on', n > 0); b.parentElement.title = b.parentElement.title.replace(/ · .*$/, '') + (n > 0 ? ` · ${what}` : ''); };
    dot('badge-stats', p.statPoints || 0, `${p.statPoints} puntos de atributo`);
    // tablero de glifos: puntos libres (derivados del nivel, Nv81+) y glifos sueltos por recoger
    const bi = g.paragonPointsInfo?.() || { left: 0 };
    const loose = g.looseGlyphs?.().length || 0;
    dot('badge-paragon', bi.left + loose, [bi.left ? `${bi.left} punto${bi.left > 1 ? 's' : ''} del tablero` : '', loose ? `${loose} glifo${loose > 1 ? 's' : ''} por recoger` : ''].filter(Boolean).join(' · '));
    // libro: variantes por elegir (la forja no tiene puntos)
    const pend = this._pendingVariants(p);
    dot('badge-skills', pend, `${pend} variante${pend > 1 ? 's' : ''} por elegir`);
    // talentos: puntos libres de clase, especialización y Paragon (si está abierto); sin
    // especialización desde el Nv10, la insignia invita a elegirla; Paragon en pausa, avisa
    const tp = g.talentPointsInfo?.();
    const hasSpec = !!Talents.activeSpec(p);
    const tLeft = tp ? tp.cls.left + tp.spec.left + (tp.heroOpen ? tp.hero.left : 0) : 0;
    const tWhat = p.level < SPEC_AT ? '' : !hasSpec ? 'elige tu especialización'
      : tp?.heroPaused ? 'Paragon en pausa: gasta tus puntos de especialización'
        : `${tLeft} punto${tLeft > 1 ? 's' : ''} de talento`;
    dot('badge-talents', p.level < SPEC_AT ? 0 : !hasSpec || tp?.heroPaused ? 1 : tLeft, tWhat);
    $('badge-talents')?.classList.toggle('paused', !!tp?.heroPaused);
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
    if (this._swap) this._flushSpecSwap();      // tira «qué cambia» que esperaba a cerrar los talentos
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
  // variantes de forja por elegir (insignia del libro): el modelo del libro solo se recalcula
  // cuando cambia algo que lo mueve (nivel, especialización o forja), no a 10 Hz
  _pendingVariants(p) {
    const key = `${p.classId}|${p.level}|${p.talents?.spec || ''}|${JSON.stringify(p.skillForge || {})}`;
    if (this._pendKey !== key) {
      this._pendKey = key;
      try { this._pendN = HM.bookView(p)?.pending || 0; } catch { this._pendN = 0; }
    }
    return this._pendN;
  }
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
      this.gaugeHud = createGaugeHud(host, { plain: true, getView: () => null, sfx: (n) => this.game.sfx?.(n), onReady: (ids) => this._markReady(ids) });
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
      el.querySelector('.bf-status').innerHTML = sts.slice(0, 4).map(x => `<span class="st-chip st-${x.id}" title="${x.label}"><img src="${x.icon || HM.statusIcon(x.id)}" alt="" draggable="false" onerror="this.remove()"><em>${x.label}</em></span>`).join('');
    }
  }

  // franja superior: borde inferior del marco del objetivo, del banner o de la PAUSA.
  // Los números flotantes no suben por encima (nunca tapan la vida del jefe)
  updateTopBand() {
    let band = 0;
    const newsIn = this._fitNews();
    for (const id of ['target-frame', 'hud-banner', 'hud-news']) {
      const el = $(id);
      if (id === 'hud-news' && !newsIn) continue;
      if (el && !el.classList.contains('hidden') && (id !== 'hud-banner' || el.childElementCount)) band = Math.max(band, el.getBoundingClientRect().bottom);
    }
    const sw = $('hud-swap');
    if (this._fitTop(sw, sw?.classList.contains('on'))) band = Math.max(band, sw.getBoundingClientRect().bottom);
    const nt = $('hud-notice');
    this._fitTop(nt, nt && !nt.classList.contains('hidden'));
    if (document.body.classList.contains('paused')) { const pi = $('pause-indic'); if (pi) band = Math.max(band, pi.getBoundingClientRect().bottom); }
    band = Math.max(40, Math.round(band)) + 8;
    if (band !== this._topBand) { this._topBand = band; document.documentElement.style.setProperty('--top-band', band + 'px'); }
  }
  // la tira «qué cambia» y la tarjeta de avisos de la migración, bajo el banner (que ahora puede
  // ocupar dos renglones): si con el marco del objetivo pisarían la zona de combate, esperan
  // invisibles en su hueco (para medir) y salen en cuanto caben, como la tarjeta de novedades
  _fitTop(el, shown) {
    if (!el) return false;
    if (!shown) { el.classList.remove('tc-wait'); return false; }
    const L = this.hudLayout || HM.hudLayout(window.innerWidth, window.innerHeight, this.game.settings?.hudScale || 1);
    const fits = el.getBoundingClientRect().bottom <= L.combat[1] + 0.5;
    el.classList.toggle('tc-wait', !fits);
    return fits;
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
    // tarjeta de novedades de la subida de nivel (un renglón: peor caso con la línea larga)
    const nw = $('hud-news');
    if (nw?.classList.contains('hidden')) {
      nw.classList.remove('hidden');
      nw.innerHTML = `<span class="nw-ico"><img src="${HM.menuIcon('skills')}" alt=""></span><b>Nivel 18: 3 novedades</b><span class="nw-sub">Supernova: mejora Gravedad Solar · Bola de Fuego: elige una variante · +1 punto de talento de especialización</span><kbd>T</kbd>`;
    }
    // con jefe y banner a la vez puede no caber: entonces espera (como en partida) y no se mide
    this._fitNews();
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
      if (!this.gaugeHud) this.gaugeHud = createGaugeHud(sg, { plain: true, getView: () => null });
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
    // marca la subida (gainXP): las novedades de este nivel salen agrupadas en una tarjeta
    this._luFlash = true;
    this._scheduleLevelNews();
    if (this.game.settings?.reduceMotion) return;
    this._luShowUntil = performance.now() + 1500;   // la elección de especialización espera al rótulo
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

  // ---------- barra de 6 ranuras (Paso 2d, docs/paso2-diseno.md §1.1; Paso 2 · U3) ----------
  // lmb básica · rmb principal · 1 movilidad (fuera del GCD) · 2 flexible
  // (defensa/utilidad o 2.ª principal) · 3 insignia · 4 definitiva.
  // Clic = lanzar; clic DERECHO = asignar (la 2 abre el selector de dos pestañas).
  // Se acepta soltar una habilidad arrastrada desde el libro (respeta fitsSlot).
  // DOM estable que usan ui-verbs.js y css/verbs.css: #skillbar .skill-btn[data-slot] > .sk-icon / .sk-cost
  slotKeyLabel(slot) {
    if (slot === 'lmb') return 'IZQ';
    if (slot === 'rmb') return 'DER';
    const n = { k1: 1, k2: 2, k3: 3, k4: 4 }[slot];
    const code = this.game.input?.bindings?.['skill' + n]?.[0];
    return code ? keyLabel(code) : String(n);
  }
  // tecla (remapeable) de una acción del juego, para los textos («Talentos (N)»)
  actionKey(action, fb = '') {
    const c = this.game.input?.bindings?.[action]?.[0];
    return c ? keyLabel(c) : fb;
  }
  // arte de una habilidad (ruta bajo assets/): el `art` del catálogo; si no, las activas de
  // talento el sprite del nodo que las concede y las base su icono pintado (HM.skillArtPath,
  // vale con el catálogo v1 y con el 2g). Si la imagen falta, el marcador .ico-missing con el
  // emoji y el id (§3.12)
  skillArt(sk) {
    if (!sk) return null;
    const p = this.game.player;
    const key = (p?.classId || '') + ':' + sk.id;
    this._artCache = this._artCache || new Map();
    if (!this._artCache.has(key)) this._artCache.set(key, HM.skillArtPath(sk, Talents.talentTreesFor(p?.classId)));
    return this._artCache.get(key);
  }
  skillIconHTML(sk, cls = 'sk-icon') {
    const src = this.skillArt(sk);
    const emoji = sk.icon || '✦';
    if (src) return `<span class="${cls} has-art" data-emoji="${emoji}" data-id="${sk.id}"><img class="sk-art" src="assets/${src}" alt="" draggable="false" onerror="const s=this.parentNode;s.classList.remove('has-art');s.classList.add('ico-missing');s.title=s.dataset.id;s.textContent=s.dataset.emoji"></span>`;
    return `<span class="${cls} ico-missing" data-id="${sk.id}" title="${sk.id}">${emoji}</span>`;
  }
  catBadgeHTML(cat, cls = 'sk-cat') {
    const src = HM.catIcon(cat);
    return src ? `<img class="${cls}" src="${src}" alt="" title="${HM.catLabel(cat)}" draggable="false" onerror="this.remove()">` : '';
  }
  // por qué una habilidad de la barra no se puede usar ahora: «Solo con <especialización>» (kit de
  // otra especialización), la activa de talento que no tienes o el nivel en que se aprende
  lockText(sk) {
    const p = this.game.player;
    if (!sk || !p) return '';
    if (sk.spec && sk.spec !== Talents.activeSpec(p)?.id) {
      const s = Talents.findSpec(p.classId, sk.spec);
      return `Solo con ${s?.name || 'su especialización'}`;
    }
    if (sk.kind === 'talent') return `Se concede con su talento (${this.actionKey('talents', 'N')})`;
    return `Se aprende al nivel ${Math.max(sk.req || 1, sk.spec ? SPEC_AT : 1)}`;
  }

  refreshHotbar() {
    const p = this.game.player;
    const bar = $('skillbar');
    if (!p || !bar) return;
    bar.innerHTML = '';
    this._readySig = null;
    const res = p.cls.resource;
    // sin especialización desde el Nv10, la ranura 3 queda vacía y dice dónde se elige
    const noSpec = p.level >= SPEC_AT && !Talents.activeSpec(p);
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
        if (slot === 'k3' && noSpec) {
          btn.classList.add('hb-spec');
          btn.title = `${label}: elige tu especialización en Talentos (${this.actionKey('talents', 'N')}); su insignia va aquí`;
          castFn = () => this.openSpecChoice();
        } else btn.title = `${label}: ranura vacía. Clic derecho para asignar (o arrastra desde el libro de habilidades, ${this.actionKey('skills', 'T')})`;
      } else {
        btn.dataset.skill = sk.id;
        btn.classList.add('cat-' + sk.cat);
        if (sk.cat === 'basic') btn.classList.add('hb-basic');
        if (sk.kind === 'talent') btn.classList.add('hb-talent');
        if (!known) btn.classList.add('hb-locked');
        const v = HM.slotView(p, sk, prof, GCD, { g: this.game, slot });
        const costHTML = sk.cat === 'basic'
          ? `<span class="sk-cost gen" title="genera ${res?.name || 'recurso'}">+${prof?.gen ?? sk.gen ?? 0}</span>`
          : (v.cost ? `<span class="sk-cost">${v.cost}</span>` : '');
        btn.innerHTML = this.skillIconHTML(sk) + this.catBadgeHTML(sk.cat) + `<span class="sk-key">${label}</span>` + keyHTML + costHTML +
          `<div class="gcd-overlay"></div><div class="cd-overlay cd-radial"></div><span class="sk-cd-sec"></span>` +
          (sk.kind === 'talent' ? '<span class="sk-talent-tag">TALENTO</span>' : '');
        const catTxt = HM.catLabel(sk.cat);
        btn.title = !known ? `${sk.name}: ${this.lockText(sk)}`
          : `${sk.name} · ${catTxt}${sk.cat === 'basic' ? ` · genera ${res?.name || 'recurso'}` : v.cost ? ` · ${v.cost} ${res?.name || ''}` : ''}${sk.kind === 'talent' ? ' · activa de talento' : ''}\nClic derecho: cambiar`;
        castFn = () => {
          if (!known) { this.message(`${sk.name}: ${this.lockText(sk)}`); return; }
          const w = HM.slotView(p, sk, resolveSkill(p, sk), GCD, { g: this.game, slot });
          if (w.noRes && w.cdFrac === 0) this.flashNoMana(btn);
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

  // estado en vivo de la barra (10 Hz desde updateHUD): enfriamiento radial (con cargas, el de la
  // siguiente carga; con la ventana de relanzar abierta, ninguno), sombra del GCD (más tenue, en
  // todas las ranuras que lo comparten), coste y recurso. Los verbos (barra de carga, aro, pips,
  // postura) los pinta ui-verbs.js por frame dentro de la misma ranura
  updateHotbarState(p) {
    const bar = $('skillbar'); if (!bar) return;
    for (const btn of bar.children) {
      const id = btn.dataset.skill;
      if (!id) continue;
      const sk = p.cls.skills.find(s => s.id === id);
      if (!sk) continue;
      const v = HM.slotView(p, sk, resolveSkill(p, sk), GCD, { g: this.game, slot: btn.dataset.slot });
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
  // pestañas, «Defensa/utilidad» y «Principal» (fitsSlot valida cada candidata)
  hotbarSlotChooser(slot, label = this.slotKeyLabel(slot), tab = null) {
    const g = this.game, p = g.player;
    if (!p) return;
    const pop = $('item-popup');
    this.markJustOpened();
    pop.style.left = pop.style.top = pop.style.transform = '';
    const cur = p.hotbar?.[slot] ? p.cls.skills.find(s => s.id === p.hotbar[slot]) : null;
    const known = (sk) => isKnown(p, sk);
    const after = () => { pop.classList.add('hidden'); this.refreshHotbar(); this.updateHUD(); if (this.activePanel === 'skills') this.book?.refresh(); };
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
    if (!list.length) {
      const why = slot !== 'k3' ? ''
        : p.level >= SPEC_AT && !Talents.activeSpec(p) ? ` Elige tu especialización en Talentos (${this.actionKey('talents', 'N')}): su insignia va aquí.`
          : ` La insignia llega con tu especialización (Nv${SPEC_AT}).`;
      pick.innerHTML = `<div class="dim" style="padding:6px 2px">Aún no conoces habilidades para esta ranura: se aprenden solas al subir de nivel.${why}</div>`;
    }
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
    // un motivo de talentos sin texto (código de TALENT_REASONS) se traduce como en el panel
    if (typeof text === 'string' && TALENT_REASON_SET.has(text)) text = reasonText({ ok: false, reason: text });
    // avisos de carga (migración de la partida): a su tarjeta, que se queda hasta leerla
    if (NOTICE_TEXTS.has(text)) { this.queueNotice(text); this.syslog(this._fixMessage(text), true); return; }
    if (typeof text === 'string') text = this._fixMessage(text);
    // subida de nivel en curso (el nivel ya subió y la tarjeta aún no salió): los avisos del
    // mismo instante se agrupan en UNA tarjeta de novedades (2f §7.1; _flushLevelNews)
    const p = this.game.player;
    if (p && this._lvSeen != null && p.level > this._lvSeen) {
      this._luBuf.push([text, ms]);
      this._scheduleLevelNews();
      return;
    }
    this._message(text, ms);
  }
  // textos de la simulación que la interfaz precisa: el tablero de glifos se abre con P (no con
  // C, la hoja de personaje), y una habilidad de otra especialización dice cuál («Solo con
  // Crionte», como la barra) en vez de «solo con su especialización»
  _fixMessage(text) {
    if (text.includes('tablero de glifos') && text.includes('(C)')) text = text.replace('(C)', `(${this.actionKey('paragon', 'P')})`);
    const m = /^(.+): solo con su especialización$/u.exec(text);
    if (m) {
      const sk = this.game.player?.cls?.skills?.find(s => s.name === m[1] && s.spec);
      if (sk) text = `${sk.name}: ${this.lockText(sk)}`;
    }
    return text;
  }
  _message(text, ms) {
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

  // ============================================================
  // Paso 2 (E3 · U3) · tarjeta de novedades de la subida de nivel y avisos de la migración
  // ============================================================
  // Subir de nivel emite, en el mismo instante, el aviso del nivel, el del punto de cada sistema
  // y los de las habilidades aprendidas (progression.js, Player.onSkillsLearned). Se recogen
  // mientras el nivel va por delante de _lvSeen y se resuelven en una microtarea, ya con el
  // nivel final: HM.levelUpNews(p, antes, después) con alguna novedad → UNA tarjeta («Nivel 8: 3
  // novedades») que abre el libro en la primera, y esos avisos quedan solo en el registro; sin
  // novedades → los avisos de siempre. Solo cuenta como subida la que pasó por levelUpFlash
  // (gainXP); un salto de nivel a mano (depuración, humo) suelta los avisos tal cual.
  _scheduleLevelNews() {
    if (this._luPending) return;
    this._luPending = true;
    queueMicrotask(() => this._flushLevelNews());
  }
  _flushLevelNews() {
    this._luPending = false;
    const p = this.game.player;
    const buf = this._luBuf; this._luBuf = [];
    const flashed = this._luFlash; this._luFlash = false;
    const from = this._lvSeen, to = p?.level ?? from;
    this._lvSeen = to;
    let news = null;
    if (flashed && p && from != null && to > from) {
      try { news = HM.levelUpNews(p, from, to); } catch (e) { console.warn('[novedades] levelUpNews', e); }
    }
    const card = !!news && news.count >= 1;
    // lo que la tarjeta añade de esos avisos: los puntos de atributo (+5 por nivel hasta el 20) y,
    // en el Nv10, la invitación a elegir especialización
    const extra = { attrs: 0, spec: false };
    for (const [t, ms] of buf) {
      if (card && typeof t === 'string' && LEVEL_MSG_RE.test(t)) {
        const m = /\+(\d+)\s+atributos/u.exec(t);
        if (m) extra.attrs += +m[1];
        if (/¡Especializaciones/u.test(t)) extra.spec = true;
        this.detectFlourish(t); this.syslog(t); continue;
      }
      this._message(t, ms);
    }
    if (card) this.showLevelNews(news, { ...extra, spec: extra.spec && !Talents.activeSpec(p) });
  }
  // nivel de referencia de las novedades: se fija al entrar en la partida (o cambiar de héroe) y
  // sigue al nivel cuando no hay una subida en curso (saltos a mano)
  _syncLevelSeen(p) {
    // otro héroe: lo pendiente sale como aviso normal (la microtarea ya no ve subida)
    if (this._lvPlayer !== p) { this._lvPlayer = p; this._lvSeen = p?.level ?? null; this._luFlash = false; this.hideLevelNews(); return; }
    if (!this._luPending && p) this._lvSeen = p.level;
  }

  // tarjetas del HUD (arriba en el centro): clic en la de novedades → libro en la primera (o
  // talentos / tablero si solo trae puntos); botones de la de avisos → libro, talentos o cerrar
  bindNewsCards() {
    this._luBuf = [];
    this._notices = [];
    $('hud-news')?.addEventListener('click', () => this.openLevelNews());
    $('hud-notice')?.addEventListener('click', (e) => {
      const act = e.target.closest?.('[data-act]')?.dataset.act;
      if (!act) return;
      this.hideNotice();
      if (act === 'book') this.togglePanel('skills');
      else if (act === 'talents') this.openTalents();
      else if (act === 'board') this.openParagon();
    });
  }
  showLevelNews(news, extra = {}) {
    const el = $('hud-news');
    if (!el || !news) return;
    const first = news.items.find(i => i.id) || null;
    const pts = news.items.find(i => i.kind === 'points') || null;
    // a dónde lleva: el libro en la primera novedad; si solo hay puntos, a su sistema. En el Nv10
    // sin especialización, a elegirla (openTalents abre el selector)
    const target = extra.spec ? 'talents' : first ? 'book' : pts?.system === 'board' ? 'board' : 'talents';
    this._news = { first: first?.id || null, target, spec: !!extra.spec };
    const key = target === 'book' ? this.actionKey('skills', 'T') : target === 'board' ? this.actionKey('paragon', 'P') : this.actionKey('talents', 'N');
    const img = first?.art ? `assets/${first.art}` : HM.menuIcon(target === 'book' ? 'skills' : target === 'board' ? 'paragon' : 'talents');
    el.innerHTML = '';
    const ico = document.createElement('span'); ico.className = 'nw-ico';
    const im = document.createElement('img'); im.alt = ''; im.draggable = false; im.src = img;
    im.onerror = () => { ico.classList.add('ico-missing'); ico.dataset.id = first?.id || ''; ico.textContent = '✦'; };
    ico.appendChild(im);
    const b = document.createElement('b'); b.textContent = news.title;
    el.append(ico, b);
    const attrs = extra.attrs > 0 ? `+${extra.attrs} atributos (${this.actionKey('character', 'C')})` : '';
    const sub = [extra.spec ? 'Elige tu especialización' : '', news.sub].filter(Boolean).join(' · ');
    if (sub) { const s = document.createElement('span'); s.className = 'nw-sub'; s.textContent = sub; el.appendChild(s); }
    // los atributos van aparte y no se recortan (el resumen sí, con «…», si no cabe a 1366)
    if (attrs) { const a = document.createElement('span'); a.className = 'nw-attr'; a.textContent = attrs; el.appendChild(a); }
    const k = document.createElement('kbd'); k.textContent = key; el.appendChild(k);
    const lines = [extra.spec ? 'Elige tu especialización' : '', ...news.items.map(i => i.text), attrs].filter(Boolean);
    el.title = `${lines.join(' · ')}\nClic: ${target === 'book' ? 'abrir el libro' : target === 'board' ? 'abrir el tablero de glifos' : extra.spec ? 'elegir tu especialización' : 'abrir los talentos'}`;
    el.classList.remove('hidden', 'nw-in', 'nw-wait');
    void el.offsetWidth;                  // reinicia la entrada
    el.classList.add('nw-in');
    this._newsOn = true;
    this._newsWait = false;
    $('spec-prompt')?.classList.add('hidden');
    this._newsLeft = NEWS_MS;
    this._armNews();
    this.updateTopBand();
  }
  _armNews() {
    clearTimeout(this._newsT);
    this._newsT0 = performance.now();
    this._newsT = setTimeout(() => this.hideLevelNews(), this._newsLeft);
  }
  // la tarjeta va bajo el marco del objetivo y el banner: si con los dos (jefe + aviso, a
  // 1366 × 768) pisaría la zona de combate, espera invisible (ocupa su sitio para medirla) y
  // su tiempo se para; sale en cuanto vuelve a caber (2f §7.1: no tapar el combate)
  _fitNews() {
    const el = $('hud-news');
    if (!el || el.classList.contains('hidden')) return false;
    const L = this.hudLayout || HM.hudLayout(window.innerWidth, window.innerHeight, this.game.settings?.hudScale || 1);
    const fits = el.getBoundingClientRect().bottom <= L.combat[1] + 0.5;
    if (fits === !!el.classList.contains('nw-wait')) {
      el.classList.toggle('nw-wait', !fits);
      if (this._newsOn) {
        this._newsWait = !fits;
        if (!fits) { clearTimeout(this._newsT); this._newsLeft = Math.max(2500, this._newsLeft - (performance.now() - this._newsT0)); }
        else this._armNews();
      }
    }
    return fits;
  }
  hideLevelNews() {
    clearTimeout(this._newsT);
    $('hud-news')?.classList.add('hidden');
    $('hud-news')?.classList.remove('nw-wait');
    this._newsOn = false;
    this._newsWait = false;
    this._news = null;
  }
  openLevelNews() {
    const n = this._news;
    this.hideLevelNews();
    if (!n) return;
    if (n.target === 'board') { if (this.activePanel !== 'paragon') this.openParagon(); return; }
    if (n.target === 'talents') { if (this.activePanel !== 'talents') this.openTalents(); return; }
    if (n.first) this.book?.select(n.first);
    if (this.activePanel !== 'skills') this.togglePanel('skills');
  }
  // avisos de la migración de la partida (LOAD_NOTICES): todos en una tarjeta que se queda hasta
  // pulsar «Entendido» o uno de sus botones (sin temporizador: quien carga y se aparta no la pierde;
  // la copia del registro de sistema se apaga sola)
  queueNotice(text) {
    if (!this._notices.includes(text)) this._notices.push(text);
    if (this._noticeQ) return;
    this._noticeQ = true;
    queueMicrotask(() => { this._noticeQ = false; this.showNotice(); });
  }
  showNotice() {
    const el = $('hud-notice');
    if (!el || !this._notices.length) return;
    el.innerHTML = '';
    const h = document.createElement('b'); h.className = 'nt-h'; h.textContent = 'Tu partida se actualizó';
    const ul = document.createElement('ul');
    // los glifos sueltos esperan en el tablero de glifos, que se abre con P (_fixMessage: el texto
    // de la migración dice «(C)», la hoja de personaje de antes)
    const LOOSE = LOAD_NOTICES['glifos-sueltos'];
    const board = this.actionKey('paragon', 'P');
    for (const t of this._notices) {
      const li = document.createElement('li');
      li.textContent = this._fixMessage(t);
      ul.appendChild(li);
    }
    const row = document.createElement('div'); row.className = 'nt-btns';
    const btn = (act, txt, key) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.act = act; b.textContent = txt; if (key) { const k = document.createElement('kbd'); k.textContent = key; b.appendChild(k); } return b; };
    row.append(btn('book', 'Libro ', this.actionKey('skills', 'T')), btn('talents', 'Talentos ', this.actionKey('talents', 'N')));
    if (LOOSE && this._notices.includes(LOOSE)) row.append(btn('board', 'Tablero ', board));
    row.append(btn('ok', 'Entendido'));
    // título y botones en el mismo renglón: la tarjeta queda baja (no baja hasta la zona de combate)
    const top = document.createElement('div'); top.className = 'nt-top';
    top.append(h, row);
    el.append(top, ul);
    el.classList.remove('hidden');
    this.updateTopBand();
  }
  hideNotice() {
    $('hud-notice')?.classList.add('hidden');
    this._notices = [];
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
    // D26: los verbos (carga, ventana perfecta, relanzar, pips, postura) se pintan CADA frame con el
    // reloj real (el hit-stop congela `dt`); el estado lo leen del juego (g._charging…), que ya
    // lleva el tiempo de simulación
    const now = performance.now();
    const realDt = this._vfT ? Math.min(0.25, (now - this._vfT) / 1000) : 0;
    this._vfT = now;
    this.verbHud?.update(realDt);
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
  // Los paneles de siempre son #panel-<id>.panel; los talentos (#talents-panel, N) y el libro
  // (#skills-book, T) son fábricas propias sin .panel (E3): se abren y cierran por su API. Toda
  // apertura pasa por _setPanel (activePanel = pausa + cancelHeld) y todo cierre por closePanel
  // o closeAllPanels, que cierran también talentos y libro: nunca queda uno visible con
  // activePanel en null (el juego seguiría corriendo debajo)
  togglePanel(name) {
    if (this.activePanel === name) return this.closePanel();
    this.closePanel();
    if (name === 'talents') { if (!this.talentPanel) return; this._setPanel('talents'); this.talentPanel.open(); return; }
    if (name === 'skills') {
      if (!this.book) return;
      this._setPanel('skills');
      // con la tarjeta de novedades a la vista, el libro abre en la primera novedad
      if (this._news?.first) { this.book.select(this._news.first); this.hideLevelNews(); }
      this.book.open();
      return;
    }
    const el = $('panel-' + name);
    if (!el) return;
    this._setPanel(name);
    el.classList.remove('hidden');
    this.renderPanel();
  }

  closePanel() {
    $('item-popup').classList.add('hidden');
    const cur = this.activePanel;
    this.activePanel = null;           // antes de cerrar: el onClose del libro no repite el cierre
    if (this.talentPanel?.isOpen?.()) this.talentPanel.close();
    if (this.book?.isOpen?.()) this.book.close();
    if (cur) $('panel-' + cur)?.classList.add('hidden');
  }

  // cierra TODOS los paneles y el popup, dejando un estado limpio (arranque, muerte)
  closeAllPanels() {
    this.activePanel = null;
    document.querySelectorAll('.panel').forEach(p => p.classList.add('hidden'));
    this.talentPanel?.close(); // #talents-panel no lleva .panel (E3·U1)
    if (this.book?.isOpen?.()) this.book.close();
    this.hideSpecSwap();
    // en partida, la pantalla de selección no queda debajo (z 50, por encima de los paneles):
    // startGame llama aquí sea cual sea el camino que la arrancó
    if (this.game.state !== 'select') $('class-select')?.classList.add('hidden');
    $('item-popup').classList.add('hidden');
    $('item-tooltip').classList.add('hidden');
    this.hideHudTip();
  }

  renderPanel() {
    if (this.activePanel === 'inv') this.renderInventory();
    else if (this.activePanel === 'skills') this.book?.refresh();
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
      this._setPanel('stash');
      $('panel-stash').classList.remove('hidden');
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
        // §3.6.1: cargar y soltar y las canalizaciones de mantener; «alternar» engancha la carga con
        // la 1.ª pulsación y la suelta con la 2.ª (la ranura lo enseña con un candado)
        { t: 'select', key: 'holdMode', icon: 'hand', label: 'Cargar y canalizar', def: 'hold',
          opts: [['hold', 'Mantener pulsado (soltar lanza)'], ['toggle', 'Alternar (una pulsación empieza, otra suelta)']],
          onChange: (v) => { g.settings.holdMode = v === 'toggle' ? 'toggle' : 'hold'; g.saveSettings(); g.cancelHeld?.('cancel'); } },
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
      // mismo nombre que el micromenú (P = «Tablero de glifos»; el Paragon vive en Talentos)
      row.innerHTML = `<span class="keybind-act">${MICRO_TITLE[a.id] || a.label}</span>`;
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
      this._setPanel('quest');
      $('panel-quest').classList.remove('hidden');
    }
    this.renderQuest();
  }

  // modal de pactos: elige un riesgo a cambio de recompensa (o cancela)
  openPacts() {
    const g = this.game;
    this.closePanel();
    this._setPanel('pacts');
    const panel = $('panel-pacts');
    panel.classList.remove('hidden');
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
      this._setPanel('recipes');
      $('panel-recipes').classList.remove('hidden');
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
      this._setPanel('collection');
      $('panel-collection').classList.remove('hidden');
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
      this._setPanel('waypoints');
      $('panel-waypoints').classList.remove('hidden');
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

  // el libro (js/ui-skills.js) se repinta solo; esto lo piden la forja (game-skills.chooseForge) y
  // los cambios de soportes hechos fuera del libro
  refreshSkillsView() { this.book?.refresh(); }

  // nº de glifos que tienes en la mochila sin engarzar en el tablero de glifos
  unsocketedGlyphCount() {
    const p = this.game.player;
    return (p.materials || []).filter(it => it.kind === 'glyph').length;
  }

  // Barra de navegación del "build" que conecta Personaje ↔ Habilidades ↔ Tablero de glifos.
  // Se inserta en lo alto de la ficha y del tablero para que se entienda que son partes del
  // mismo sistema. Habilidades abre el libro (T); su insignia, las variantes por elegir
  buildNavHTML(active) {
    const p = this.game.player;
    const pend = this._pendingVariants(p);
    const skillBadge = pend > 0 ? `<span class="bnav-badge" title="${pend} variante${pend > 1 ? 's' : ''} por elegir">${pend}</span>` : '';
    const bi = this.game.paragonPointsInfo?.() || { left: 0, open: false, openLevel: Talents.PARAGON_OPEN_LEVEL };
    const extra = bi.left + this.unsocketedGlyphCount() + (this.game.looseGlyphs?.().length || 0);
    const pgBadge = bi.open && extra > 0 ? `<span class="bnav-badge">${extra}</span>` : '';
    const hasBoard = bi.open || Object.keys(p.paragon?.nodes || {}).length > 0;
    // tab: si está bloqueado se muestra IGUAL (descubribilidad/aspiración) con
    // candado y el nivel requerido; al pulsarlo se abre una vista de preview.
    const tab = (key, ico, label, badge, on, lockLvl) =>
      `<button class="bnav-tab${on ? ' on' : ''}${lockLvl ? ' bnav-locked' : ''}" data-bnav="${key}"${lockLvl ? ` title="Se desbloquea en el nivel ${lockLvl}"` : ''}>${icon(ico)} <span class="bnav-lbl">${label}</span>${lockLvl ? `<span class="bnav-lock">${icon('lock')} Nv ${lockLvl}</span>` : badge}</button>`;
    return `<div class="build-nav">
        ${tab('stats', 'hero', 'Personaje', '', active === 'stats')}
        ${tab('skills', 'book', 'Habilidades', skillBadge, active === 'skills')}
        ${tab('paragon', 'star', 'Tablero de glifos', pgBadge, active === 'paragon', hasBoard ? 0 : bi.openLevel)}
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

    // barra de navegación del build (Personaje ↔ Habilidades ↔ tablero de glifos)
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

    // --- tablero de glifos (se abre al Nv81: 16 puntos derivados del nivel, §3.9) ---
    const pgSection = $('paragon-section');
    const pg = $('paragon');
    const para = p.paragon || {};
    const bi = this.game.paragonPointsInfo?.() || { left: 0, open: false };
    const loose = this.game.looseGlyphs?.().length || 0;
    const hasBoard = bi.open || Object.keys(para.nodes || {}).length > 0 || loose > 0;
    const freeGlyphs = this.unsocketedGlyphCount();
    if (hasBoard) {
      pgSection.style.display = '';
      // avisos: puntos sin gastar, glifos sin engarzar y glifos sueltos de la migración
      let alert = '';
      if (bi.left > 0) alert += `<div class="cs-build-alert">⚠️ Tienes <b>${bi.left}</b> ${pl(bi.left, 'punto', 'puntos')} del tablero sin gastar.</div>`;
      if (freeGlyphs > 0) alert += `<div class="cs-build-alert glyph">🔷 Tienes <b>${freeGlyphs}</b> ${pl(freeGlyphs, 'glifo', 'glifos')} en la mochila sin engarzar.</div>`;
      if (loose > 0) alert += `<div class="cs-build-alert glyph">🔷 <b>${loose}</b> ${pl(loose, 'glifo te espera en el tablero: recógelo allí', 'glifos te esperan en el tablero: recógelos allí')}.</div>`;
      pg.innerHTML = `<div class="cs-section-head">
          <span class="cs-section-title">🔷 Tablero de glifos</span>
          <span class="cs-points ${bi.left > 0 ? 'cs-points-active' : ''}">${bi.open ? `${bi.spent}/${BOARD_PTS} puntos` : `Nv ${bi.openLevel || Talents.PARAGON_OPEN_LEVEL}+`}</span>
        </div>
        ${alert}
        <p class="cs-build-help">Activa nodos de estadísticas, llega a un legendario y engarza glifos (🔷) en los zócalos (◇) del camino.</p>`;
      const ob = document.createElement('button');
      ob.className = 'quest-btn cs-build-cta';
      const n = bi.left + freeGlyphs + loose;
      ob.innerHTML = `🔷 Abrir el tablero de glifos${n > 0 ? ` <span class="bnav-badge">${n}</span>` : ''}`;
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
    // ningún panel (ni talentos ni libro) queda abierto encima de la pantalla de muerte
    this.closeAllPanels();
    this.hideLevelNews();
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
      this._setPanel('map');
      $('panel-map').classList.remove('hidden');
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
      this._setPanel('progress');
      $('panel-progress').classList.remove('hidden');
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
      this._setPanel('guide');
      $('panel-guide').classList.remove('hidden');
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
      this._setPanel('pet');
      $('panel-pet').classList.remove('hidden');
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

  // ---------- Tablero de glifos (P; docs/paso2-implementacion.md §3.9, 2g §7.5) ----------
  // Se abre al Nv81 con 16 puntos DERIVADOS del nivel (paragonPointsInfo: no se guardan); los
  // legendarios dan estadísticas grandes (sin poderes) y reiniciarlo es gratis fuera de combate.
  // Antes del Nv81 se ve como vista previa con candado
  openParagon() {
    if (this.activePanel !== 'paragon') {
      this.closePanel();
      this._setPanel('paragon');
      $('panel-paragon').classList.remove('hidden');
      this._pgSel = null;              // la ficha vuelve a la ayuda al abrir
    }
    this.renderParagon();
  }

  nodeStatsText(node) {
    // el legendario trae su texto (los mismos números dichos en palabras): no se repiten
    if (node.type === 'legendary' && node.desc) return node.desc;
    const parts = Object.entries(node.stats || {}).map(([k, v]) => statText(k, v));
    if (node.desc) parts.push(node.desc);
    return parts.join(' · ') || (node.type === 'start' ? 'Inicio' : '');
  }

  renderParagon() {
    const g = this.game, p = g.player;
    const para = p.paragon || { nodes: {} };
    const N = PARAGON_BOARD_SIZE;
    const board = paragonBoardFor(p.classId);
    const bi = g.paragonPointsInfo?.() || { earned: 0, spent: 0, left: 0, open: false, openLevel: Talents.PARAGON_OPEN_LEVEL };
    const nav = $('pg-build-nav');
    if (nav) { nav.innerHTML = this.buildNavHTML('paragon'); this.bindBuildNav(nav); }
    $('paragon-points').textContent = bi.open
      ? `${bi.left} punto${bi.left === 1 ? '' : 's'} libre${bi.left === 1 ? '' : 's'} · ${bi.spent}/${bi.earned} gastados · ${BOARD_PTS} en total del nivel ${bi.openLevel} al ${Talents.LEVEL_MAX}`
      : `Se abre al nivel ${bi.openLevel}: ${BOARD_PTS} puntos, uno por nivel hasta el ${Talents.LEVEL_MAX}`;
    $('paragon-points').classList.toggle('cs-points-active', bi.left > 0);
    // avisos visibles: tablero cerrado, puntos sin gastar, glifos sueltos y glifos sin engarzar
    const alertEl = $('pg-alert');
    if (alertEl) {
      const freeGlyphs = this.unsocketedGlyphCount();
      const loose = g.looseGlyphs?.() || [];
      const freeSockets = board.filter(n => n.type === 'socket' && para.nodes?.[n.id] && !para.glyphs?.[n.id]).length;
      const lockedBoard = !bi.open && !Object.keys(para.nodes || {}).length;
      let html = '';
      if (lockedBoard) html += `<div class="locked-banner">${icon('lock')} El tablero de glifos se abre en el <b>nivel ${bi.openLevel}</b> (te faltan ${Math.max(0, bi.openLevel - p.level)}). Desde ahí, cada nivel da 1 punto (${BOARD_PTS} hasta el ${Talents.LEVEL_MAX}): llegas a un legendario con su zócalo, nunca a dos. Esto es una vista previa.</div>`;
      if (bi.left > 0) html += `<div class="cs-build-alert">⚠️ Tienes <b>${bi.left}</b> ${pl(bi.left, 'punto', 'puntos')} sin gastar.</div>`;
      if (loose.length) html += `<div class="cs-build-alert glyph pg-loose">🔷 <b>${loose.length}</b> ${pl(loose.length, 'glifo suelto', 'glifos sueltos')} de tu partida anterior: ${loose.map(gl => gl.baseName || gl.name || 'Glifo').join(', ')}. <button class="quest-btn pg-reclaim" type="button">Recoger en la bolsa</button></div>`;
      if (freeGlyphs > 0) html += `<div class="cs-build-alert glyph">🔷 Tienes <b>${freeGlyphs}</b> ${pl(freeGlyphs, 'glifo', 'glifos')} sin engarzar${freeSockets > 0 ? ` y <b>${freeSockets}</b> ${pl(freeSockets, 'zócalo ◇ libre', 'zócalos ◇ libres')}` : ''}. Haz clic en un zócalo activo para ${pl(freeGlyphs, 'colocarlo', 'colocarlos')}.</div>`;
      alertEl.innerHTML = html;
      const rb = alertEl.querySelector('.pg-reclaim');
      if (rb) rb.onclick = () => { g.reclaimLooseGlyphs?.(); this.renderParagon(); this.updateHUD(); };
    }
    const grid = $('paragon-grid');
    grid.innerHTML = '';
    grid.style.gridTemplateColumns = `repeat(${N}, 1fr)`;
    grid.classList.toggle('pg-locked', !bi.open);
    // ficha del nodo junto a la rejilla: la del ratón mientras pasa por encima; al salir, la del
    // último clic (o la ayuda). Así las estadísticas de un legendario se leen sin el title nativo
    const info = $('paragon-info');
    if (info && this._pgHelp == null) this._pgHelp = info.innerHTML;
    const showInfo = (html) => { if (info && info.innerHTML !== html) info.innerHTML = html; };
    const nodeInfo = (node, gl) => node.type === 'socket'
      ? `🔷 ${gl ? `<b>${gl.name}</b>` : 'Zócalo vacío'}`
      : `${node.type === 'legendary' ? '★ ' : ''}${node.name ? `<b>${node.name}</b> · ` : ''}${this.nodeStatsText(node)}`;
    grid.onmouseleave = () => showInfo(this._pgSel || this._pgHelp || '');
    showInfo(this._pgSel || this._pgHelp || '');
    const byPos = {};
    for (const n of board) byPos[n.x + ',' + n.y] = n;
    const glyph = { start: '◉', legendary: '★', rare: '◆', magic: '✦', minor: '•', socket: '◇' };
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const cell = document.createElement('div');
      cell.className = 'para-cell';
      const node = byPos[x + ',' + y];
      if (node) {
        const on = node.type === 'start' || !!para.nodes?.[node.id];
        const avail = !on && bi.left > 0 && g.paragonNodeReachable(node.id);
        const gl = node.type === 'socket' ? para.glyphs?.[node.id] : null;
        cell.classList.add('para-node', 'pn-' + node.type);
        if (node.cat) cell.classList.add('cat-' + node.cat);
        if (on) cell.classList.add('on');
        if (avail) cell.classList.add('avail');
        if (gl) cell.classList.add('has-glyph');
        // zócalo activo y vacío: resáltalo para que se vea dónde poner glifos
        const openSocket = node.type === 'socket' && on && !gl;
        if (openSocket) cell.classList.add('open-socket');
        cell.textContent = gl ? '🔷' : (glyph[node.type] || '•');
        cell.title = node.type === 'socket'
          ? (gl ? `🔷 ${gl.name} (clic para cambiar o quitar)` : 'Zócalo de glifo ◇' + (on ? ': clic para engarzar un glifo' : ' (actívalo primero)'))
          : `${node.type === 'legendary' ? '★ ' : ''}${node.name ? node.name + ': ' : ''}${this.nodeStatsText(node)}`;
        cell.onmouseenter = () => showInfo(nodeInfo(node, gl));
        cell.onclick = () => {
          this._pgSel = nodeInfo(node, gl);
          showInfo(this._pgSel);
          if (node.type === 'socket' && on) { this.paragonGlyphChooser(node); return; }
          if (!on && avail) { g.allocateParagonNode(node.id); this.renderParagon(); this.updateHUD(); }
        };
      }
      grid.appendChild(cell);
    }
    const spent = Object.keys(para.nodes || {}).length;
    const free = g.canRespecFree?.() ?? true;
    const rs = $('paragon-respec');
    rs.textContent = free ? '🔄 Reiniciar el tablero (gratis)' : '🔄 Reiniciar el tablero (fuera de combate)';
    rs.disabled = !spent || !free;
    rs.title = !spent ? 'El tablero está vacío' : free ? 'Devuelve todos los puntos; los glifos se quedan en su zócalo' : 'Solo fuera de combate (5 s sin daño) o en un campamento';
    rs.onclick = () => { g.respecParagon(); this.renderParagon(); this.updateHUD(); };
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
      <div class="popup-name">🔷 Zócalo del tablero de glifos</div>
      <div class="popup-sub">${cur ? 'Engarzado: ' + cur.name : 'Zócalo vacío'} · familias contiguas: ${famsHere}</div>
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
    this._setPanel('riftsummary');
    this.game.sfx?.('levelup');
    el.querySelector('.rs-continue').onclick = () => {
      el.classList.add('hidden');
      this.activePanel = null;
      onContinue?.();
    };
  }

  openBlessing(offers) {
    this.closePanel();
    this._setPanel('blessing');
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
