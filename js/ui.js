// ============================================================
// Interfaz: HUD, inventario, árbol de habilidades, paneles
// ============================================================
import * as THREE from 'three';
import { CLASSES, STAT_NAMES, STAT_DESC, TIER_LEVELS, PACTS, ENEMIES, SUPPORTS, ZONE_LIST, skillVal, synergyBonus, xpForLevel, POTION_PRICES, PET_PRICE, PET_KINDS, PET_UPGRADES, PET_COLLARS, MASTERIES, findMastery, MASTERY_START_LEVEL, paragonBoardFor, PARAGON_CATS, PARAGON_BOARD_SIZE } from './data.js';
import { RARITIES, SLOT_NAMES, SETS, LEGENDARY_POWERS, RUNES, RUNEWORDS, itemStatLines, statText, glyphValue } from './items.js';
import { BINDABLE_ACTIONS, keyLabel } from './bindings.js';
import { SYSTEMS_GUIDE, SKILL_MODS } from './data.js';

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
const HOVER_TOOLTIP = window.matchMedia('(pointer: fine)').matches;

// contexto de cada estadística derivada (qué hace) — se muestra como tooltip
// en la hoja de personaje para que el jugador entienda su build.
const DERIVED_DESC = {
  dmg: 'Daño por golpe de tu arma + atributos. Base de todo tu daño.',
  crit: 'Probabilidad de golpe crítico (x2 daño).',
  lph: 'Vida que recuperas cada vez que golpeas a un enemigo.',
  mph: 'Maná que recuperas cada vez que golpeas a un enemigo.',
  thorns: 'Daño que devuelves a quien te golpea cuerpo a cuerpo.',
  maxHP: 'Vida máxima. Al llegar a 0 mueres.',
  maxMP: 'Maná máximo. Lo gastan tus habilidades.',
  arm: 'Reduce el daño físico recibido.',
  spd: 'Velocidad de movimiento.',
  mf: 'Hallazgo mágico: sube la probabilidad de botín raro y legendario.',
  cdr: 'Reducción de enfriamiento: tus habilidades se recargan más rápido.',
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
    this.bindHUD();
  }

  // ---------- arrastrar y soltar (Pointer Events: ratón + táctil) ----------
  // Cada celda lleva data-zone / data-key. Las celdas con objeto son
  // arrastrables; todas son destinos válidos. Un toque sin arrastre = tap.
  bindCell(div, desc, tapFn) {
    div.dataset.zone = desc.zone;
    div.dataset.key = desc.key;
    div._tapFn = tapFn;
    if (desc.item) {
      div.style.touchAction = 'none';
      div.addEventListener('pointerdown', (e) => this.dragStart(e, div, desc, tapFn));
      // tooltip al pasar el ratón (solo escritorio; en táctil se toca para ver la ficha)
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
    if (!d.moved) { if (d.tapFn) d.tapFn(); return; } // fue un toque, no un arrastre
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
    $('btn-pot-hp').addEventListener('pointerdown', e => { e.preventDefault(); g.player?.usePotion('hp'); this.updateHUD(); });
    $('btn-pot-mp').addEventListener('pointerdown', e => { e.preventDefault(); g.player?.usePotion('mp'); this.updateHUD(); });
    $('btn-attack').addEventListener('pointerdown', e => { e.preventDefault(); g.primaryAction(); });
    $('btn-dodge').addEventListener('pointerdown', e => { e.preventDefault(); g.player?.dodge(); });
    $('btn-grab').addEventListener('pointerdown', e => { e.preventDefault(); g.grabNearest(); });
    $('minimap').addEventListener('click', () => this.openMap());
    $('btn-inv').addEventListener('click', () => this.togglePanel('inv'));
    $('btn-skills').addEventListener('click', () => this.togglePanel('skills'));
    $('btn-stats').addEventListener('click', () => this.togglePanel('stats'));
    $('btn-shop').addEventListener('click', () => this.togglePanel('shop'));
    $('btn-settings').addEventListener('click', () => this.togglePanel('settings'));
    $('btn-guide')?.addEventListener('click', () => this.openGuide());
    // modo limpio del HUD: oculta lo no esencial (persiste en settings)
    const cleanBtn = $('btn-clean-hud');
    if (cleanBtn) {
      const syncCleanIcon = () => {
        cleanBtn.setAttribute('aria-pressed', String(!!g.settings?.cleanHud));
        cleanBtn.innerHTML = `<svg class="ui-ico"><use href="#ic-${g.settings?.cleanHud ? 'eye-off' : 'eye'}"/></svg>`;
      };
      syncCleanIcon();
      cleanBtn.addEventListener('click', () => {
        g.settings.cleanHud = !g.settings.cleanHud;
        syncCleanIcon();
        g.saveSettings?.();
        this.updateHUD();
        this.message(g.settings.cleanHud ? 'Modo limpio activado' : 'HUD completo', 1600);
      });
    }
    $('btn-identify').addEventListener('click', () => g.identifyAll());
    $('btn-junk').addEventListener('click', () => g.sellJunk());
    $('btn-sort').addEventListener('click', () => g.sortInventory());
    document.querySelectorAll('.panel-close').forEach(b => b.addEventListener('click', () => this.closePanel()));
    $('btn-collection').addEventListener('click', () => this.openCollection());
    $('btn-respawn').addEventListener('click', () => g.respawn());

    // cerrar panel/popup al tocar/clicar fuera (paneles flotantes, no el de
    // bendición que obliga a elegir). Se registra en captura para detectar el
    // origen real del toque; el sello _justOpened evita que el mismo gesto que
    // abre lo cierre.
    document.addEventListener('pointerdown', (e) => this.onOutsidePointer(e), true);
  }

  // ¿el panel/popup activo debe cerrarse al tocar fuera?
  onOutsidePointer(e) {
    const popupOpen = !$('item-popup').classList.contains('hidden');
    // paneles "modales" sin botón de cerrar: no se cierran tocando fuera
    const modal = this.activePanel === 'blessing';
    if ((!this.activePanel || modal) && !popupOpen) return;
    // no cerrar con el MISMO gesto que abrió el panel/popup
    if (this._justOpened) return;
    const t = e.target;
    if (t.closest && (
      t.closest('.panel') ||           // dentro de un panel
      t.closest('#item-popup') ||      // dentro del popup de objeto
      t.closest('#item-tooltip') ||    // tooltip de hover
      t.closest('#menu-btns') ||       // botones que abren paneles
      t.closest('#btn-shop')           // botón de tienda (fuera de menu-btns)
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

    // selector de esquema de control (PC) — se elige al empezar el juego
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

  // ---------- HUD ----------
  updateHUD() {
    const p = this.game.player;
    if (!p) return;
    // "Poder del héroe": feedback flotante cuando SUBE (equipar mejor, nivel,
    // paragon, maestría…). Un solo punto de detección, barato (10Hz).
    const pw = p.stats.power || 0;
    if (this._lastPower != null && pw > this._lastPower && this.game.state === 'play')
      this.spawnText(p.pos, `+${pw - this._lastPower} ⚡ Poder`, 'txt-gold');
    this._lastPower = pw;
    const hpPct = Math.max(0, p.hp / p.stats.maxHP * 100);
    const mpPct = Math.max(0, p.mp / p.stats.maxMP * 100);
    $('orb-hp-fill').style.height = hpPct + '%';
    $('orb-mp-fill').style.height = mpPct + '%';
    $('orb-hp-txt').textContent = `${Math.ceil(p.hp)}`;
    $('orb-mp-txt').textContent = `${Math.ceil(p.mp)}`;
    // tinta el orbe del recurso según la clase (Furia rojo / Maná azul / Energía verde)
    const res = p.cls.resource;
    if (res && this._orbRes !== res.id) {
      const c = '#' + (res.color >>> 0).toString(16).padStart(6, '0');
      const orb = $('orb-mp-fill'); if (orb) orb.style.background = c;
      const wrap = $('orb-mp-fill').parentElement; if (wrap) wrap.title = res.name;
      this._orbRes = res.id;
    }
    const need = xpForLevel(p.level);
    $('xp-fill').style.width = Math.min(100, p.xp / need * 100) + '%';
    $('hud-level').innerHTML = `Nv ${p.level}${p.hardcore ? ' ' + icon('skull', { cls: 'hud-hc', title: 'Hardcore' }) : ''}`;
    const tracker = $('quest-tracker');
    if (p.quest) {
      tracker.style.display = '';
      const done = p.quest.progress >= p.quest.goal;
      tracker.innerHTML = icon('target') + ' ' + (done ? '¡Completada! Ve con el Capitán' : `${Math.min(p.quest.progress, p.quest.goal)}/${p.quest.goal} — ${p.quest.desc}`);
    } else tracker.style.display = 'none';
    // contratos de zona
    const ct = $('zone-contracts');
    const w = this.game.world;
    if (w?.type === 'zone' && w.bounties?.length) {
      ct.style.display = '';
      const rows = w.bounties.map(b => {
        const cur = Math.min(b.progress, b.goal);
        return b.done
          ? `<div class="c-row c-done">${icon('check')} ${b.desc}</div>`
          : `<div class="c-row">${icon('target', { cls: 'c-bullet' })} ${b.desc} <b>${cur}/${b.goal}</b></div>`;
      }).join('');
      ct.innerHTML = `<div class="c-title">${icon('scroll')} Contratos</div>${rows}`;
    } else ct.style.display = 'none';
    $('hud-gold').innerHTML = `${icon('coin', { cls: 'ico-gold' })} ${p.gold}`;
    const zoneIco = (n, txt) => `${icon(n)} ${txt}`;
    $('hud-zone').innerHTML = this.game.world?.type === 'town' ? zoneIco('village', 'Pueblo')
      : this.game.world?.type === 'refuge' ? zoneIco('camp', 'Refugio')
      : this.game.world?.type === 'zone' ? zoneIco('leaf', this.game.world.biome)
      : this.game.world?.rift ? zoneIco('vortex', `Grieta ${this.game.world.rift}`) : zoneIco('pit', `Piso ${this.game.world.floor}`);
    $('pot-hp-count').textContent = p.potions.hp;
    $('pot-mp-count').textContent = p.potions.mp;
    // aviso pulsante cuando la vida es crítica
    document.body.classList.toggle('low-hp', p.alive && hpPct < 30);

    // botón de acción contextual: interactuar o atacar (iconos SVG del set)
    const it = this.game.currentInteract;
    const icons = {
      portal_dungeon: 'vortex', portal_town: 'vortex', portal_next: 'vortex', portal_daily: 'star',
      portal_zone: 'leaf', gate_zone: 'leaf', zone_dungeon: 'pit', world_event: 'vortex',
      waypoint: 'map', questgiver: 'chat', stash: 'chest', vendor: 'coin', chest: 'chest', shrine: 'magic', enchanter: 'magic',
    };
    const atkBtn = $('btn-attack');
    const iconName = it ? (icons[it.type] || 'hand') : 'sword';
    // sustituye el icono solo si cambia (evita reescribir el DOM cada frame)
    if (atkBtn.dataset.icon !== iconName) {
      atkBtn.dataset.icon = iconName;
      atkBtn.innerHTML = `<svg class="ui-ico"><use href="#ic-${iconName}"/></svg>`;
    }
    atkBtn.classList.toggle('interact', !!it);

    // cooldown de la esquiva
    $('btn-dodge').querySelector('.cd-overlay').style.height =
      p.dodgeCd > 0 ? (p.dodgeCd / (p.dodgeCdMax || 3) * 100) + '%' : '0%';

    // el botón de recoger brilla si hay botín cerca
    const lootNear = this.game.groundItems.some(gi => gi.mesh.position.distanceToSquared(p.pos) < 81);
    $('btn-grab').classList.toggle('has-loot', lootNear);

    const badge = (id, n) => { const b = $(id); b.style.display = n > 0 ? 'flex' : 'none'; b.textContent = n; };
    badge('badge-stats', p.statPoints + p.paragon.points);
    badge('badge-skills', p.skillPoints);
    $('btn-shop').style.display = this.game.nearVendor ? '' : 'none';
    if (this.activePanel === 'shop') this.updateShopTimer();

    // cooldowns de la barra de habilidades (overlay RADIAL via conic-gradient)
    for (const btn of $('skillbar').children) {
      const id = btn.dataset.skill;
      if (!id) continue;
      const sk = p.cls.skills.find(s => s.id === id);
      if (!sk || sk.kind === 'basic') continue; // el básico usa atkCd, no tiene overlay/coste
      const cd = p.cds[id] || 0;
      const ov = btn.querySelector('.cd-overlay');
      const frac = cd > 0 ? Math.max(0, Math.min(1, cd / sk.cd)) : 0;
      // el ángulo barre en sentido horario y se vacía según se enfría
      ov.style.setProperty('--cd-deg', Math.round(frac * 360) + 'deg');
      ov.classList.toggle('on', frac > 0);
      // segundos restantes legibles + pulso de "listo" al terminar el enfriamiento
      const secEl = btn.querySelector('.sk-cd-sec');
      if (secEl) secEl.textContent = cd > 0 ? (cd >= 1 ? Math.ceil(cd) : cd.toFixed(1)) : '';
      if ((btn._lastFrac || 0) > 0 && frac === 0) {
        btn.classList.remove('just-ready'); void btn.offsetWidth; btn.classList.add('just-ready');
      }
      btn._lastFrac = frac;
      const cost = Math.round(skillVal(sk.mana, p.skills[id] || 1));
      const costEl = btn.querySelector('.sk-cost');
      if (costEl && costEl.textContent !== String(cost)) costEl.textContent = cost;
      btn.classList.toggle('no-mana', p.mp < cost);
    }

    // brújula de objetivos importantes fuera de pantalla
    this.updateCompass();
    // modo limpio del HUD: oculta lo no esencial (toggle en Opciones)
    document.body.classList.toggle('hud-clean', !!this.game.settings?.cleanHud);

    this.renderBuffs();
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

  // ---------- fila de buffs/pasivos temporales activos ----------
  // cada buff: { id, name, icon, remaining, total, desc } (segundos · icon=emoji)
  renderBuffs() {
    const bar = $('buff-bar');
    if (!bar) return;
    const p = this.game.player;
    const buffs = (p && p.activeBuffs?.()) || [];
    if (!buffs.length) { bar.style.display = 'none'; bar.innerHTML = ''; return; }
    bar.style.display = 'flex';
    // reconcilia por id: crea las celdas que falten, elimina las sobrantes
    const seen = new Set();
    for (const b of buffs) {
      seen.add(b.id);
      let cell = bar.querySelector(`.buff[data-id="${b.id}"]`);
      if (!cell) {
        cell = document.createElement('div');
        cell.className = 'buff';
        cell.dataset.id = b.id;
        cell.innerHTML = `<span class="buff-ico"></span><span class="buff-sec"></span>`;
        // al tocar/clicar: muestra nombre + descripción + tiempo restante
        cell.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.showBuffInfo(cell._buff || b, e.clientX, e.clientY);
        });
        bar.appendChild(cell);
      }
      cell._buff = b;
      cell.querySelector('.buff-ico').textContent = b.icon || '✨';
      const secs = Math.max(0, Math.ceil(b.remaining));
      cell.querySelector('.buff-sec').textContent = secs >= 60 ? `${Math.ceil(secs / 60)}m` : secs;
      // anillo de cuenta atrás: se vacía según remaining/total
      const frac = b.total > 0 ? Math.max(0, Math.min(1, b.remaining / b.total)) : 0;
      const deg = Math.round(frac * 360);
      cell.style.setProperty('--buff-deg', deg + 'deg');
      cell.classList.toggle('expiring', b.remaining <= 3);
    }
    for (const cell of [...bar.children]) {
      if (!seen.has(cell.dataset.id)) cell.remove();
    }
  }

  // tooltip/popup pequeño con la ficha de un buff
  showBuffInfo(b, x, y) {
    const pop = $('item-popup');
    this.markJustOpened();
    const secs = Math.max(0, Math.ceil(b.remaining));
    const time = secs >= 60 ? `${Math.floor(secs / 60)}m ${secs % 60}s` : `${secs}s`;
    pop.innerHTML = `
      <div class="popup-name">${b.icon || '✨'} ${b.name || 'Efecto'}</div>
      <div class="popup-sub">⏳ ${time} restantes</div>
      <div class="stat-line">${b.desc || ''}</div>
      <div class="popup-btns"></div>`;
    const c = document.createElement('button');
    c.textContent = 'Cerrar';
    c.onclick = () => pop.classList.add('hidden');
    pop.querySelector('.popup-btns').appendChild(c);
    // posiciona cerca del toque, dentro de la pantalla (anula el centrado CSS)
    pop.style.transform = 'none';
    pop.classList.remove('hidden');
    const w = pop.offsetWidth, h = pop.offsetHeight;
    let nx = x - w / 2, ny = y + 14;
    if (nx + w > window.innerWidth - 8) nx = window.innerWidth - w - 8;
    if (ny + h > window.innerHeight - 8) ny = y - h - 14;
    pop.style.left = Math.max(8, nx) + 'px';
    pop.style.top = Math.max(8, ny) + 'px';
  }

  // Hotbar de 6 ranuras (estilo D4): 🖱️Izq = básico generador, 🖱️Der + 1·2·3·4.
  refreshHotbar() {
    const p = this.game.player;
    const bar = $('skillbar');
    bar.innerHTML = '';
    const res = p.cls.resource;
    const SLOTS = [['lmb', '🖱️I'], ['rmb', '🖱️D'], ['k1', '1'], ['k2', '2'], ['k3', '3'], ['k4', '4']];
    for (const [slot, label] of SLOTS) {
      const id = p.hotbar?.[slot] || null;
      const btn = document.createElement('button');
      btn.className = 'skill-btn';
      btn.dataset.slot = slot;
      if (!id) {
        btn.classList.add('hb-empty');
        btn.innerHTML = `<span class="sk-icon dim">·</span><span class="sk-key">${label}</span>`;
        btn.title = 'Ranura vacía — asígnale una habilidad en el panel Habilidades';
        bar.appendChild(btn);
        continue;
      }
      const sk = p.cls.skills.find(s => s.id === id);
      if (!sk) { bar.appendChild(btn); continue; }
      const known = p.skills[sk.id] > 0;
      btn.dataset.skill = sk.id;
      if (!known) btn.classList.add('hb-locked');
      if (sk.kind === 'basic') {
        // básico: genera recurso, sin coste; no muestra coste ni overlay de CD
        btn.classList.add('hb-basic');
        btn.innerHTML = `<span class="sk-icon">${sk.icon}</span><span class="sk-key">${label}</span>` +
          `<span class="sk-cost gen" title="genera ${res?.name || 'recurso'}">+${sk.gen || res?.gen || 0}</span>`;
        btn.title = `${sk.name} · genera ${res?.name || 'recurso'}`;
        btn.addEventListener('pointerdown', e => { e.preventDefault(); if (!known) { this.message(`${sk.name}: apréndelo en Habilidades`); return; } this.game.castSkillSlot(slot); });
        bar.appendChild(btn);
        continue;
      }
      const cost = Math.round(skillVal(sk.mana, p.skills[sk.id] || 1));
      btn.innerHTML = `<span class="sk-icon">${sk.icon}</span>` +
        `<span class="sk-key">${label}</span>` +
        `<span class="sk-cost">${cost}</span>` +
        `<div class="cd-overlay cd-radial"></div>` +
        `<span class="sk-cd-sec"></span>`;
      btn.title = known ? `${sk.name} · ${cost} ${res?.name || 'maná'}` : `${sk.name} (apréndela en Habilidades)`;
      btn.addEventListener('pointerdown', e => {
        e.preventDefault();
        if (!known) { this.message(`${sk.name}: apréndela en el panel de Habilidades`); return; }
        const onCd = (p.cds[sk.id] || 0) > 0;
        if (p.mp < cost && !onCd) this.flashNoMana(btn);
        this.game.castSkillSlot(slot);
      });
      bar.appendChild(btn);
    }
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
    const cont = $('messages');
    const div = document.createElement('div');
    div.className = 'msg';
    div.textContent = text;
    cont.appendChild(div);
    while (cont.children.length > 3) cont.firstChild.remove();
    setTimeout(() => { div.classList.add('fade'); setTimeout(() => div.remove(), 500); }, ms);
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
      f.el.style.transform = `translate(${s.x}px, ${s.y}px)`;
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
    $('panel-' + name).classList.remove('hidden');
    this.markJustOpened();
    this.renderPanel();
  }

  closePanel() {
    $('item-popup').classList.add('hidden');
    if (!this.activePanel) return;
    const panel = $('panel-' + this.activePanel);
    if (panel) panel.classList.add('hidden');
    this.activePanel = null;
  }

  // cierra TODOS los paneles y el popup, dejando un estado limpio (arranque)
  closeAllPanels() {
    document.querySelectorAll('.panel').forEach(p => p.classList.add('hidden'));
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
    else if (this.activePanel === 'mastery') this.renderMastery();
    else if (this.activePanel === 'paragon') this.renderParagon();
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
        { t: 'toggle', key: 'joystickRight', icon: 'hand', label: 'Joystick a la derecha (zurdo)', def: false, onChange: () => g.applyAccessibility() },
        { t: 'range', icon: 'plus', label: 'Tamaño de los controles', min: 70, max: 150, step: 5,
          get: () => Math.round((g.settings.hudScale || 1) * 100),
          set: (v) => { g.settings.hudScale = v / 100; g.applyAccessibility(); } },
        { t: 'toggle', key: 'haptics', icon: 'phone', label: 'Vibración (móvil)', def: true },
      ] },
      { id: 'interfaz', icon: 'eye', label: 'Interfaz', items: [
        { t: 'toggle', key: 'cleanHud', icon: 'eye-off', label: 'HUD limpio (oculta lo no esencial)', def: false, onChange: () => g.applyAccessibility() },
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
    if (id === 'bateria') { s.postfx = false; s.ao = false; s.outline = false; s.perfHud = false; g.setQuality?.(3); }
    else if (id === 'equilibrado') { s.postfx = true; s.ao = true; s.outline = true; g.setQuality?.('auto'); }
    else if (id === 'calidad') { s.postfx = true; s.ao = true; s.outline = true; g.setQuality?.(0); }
    g.syncPostFX?.(); g.saveSettings();
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

  itemCellHTML(item) {
    if (!item) return '';
    const r = RARITIES[item.rarity];
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
        : `<span class="cell-hint"><span class="slot-glyph">${SLOT_ICON[slot] || ''}</span><span class="slot-name">${label}</span></span>`;
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
    $('inv-gold').innerHTML = `${icon('coin', { cls: 'ico-gold' })} ${p.gold} oro · toca para comparar/equipar · arrastra para mover (I o B para abrir)`;

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
    // celdas para todo el material + algunas vacías para arrastrar/soltar
    const cells = Math.max(24, mats.length + 4);
    for (let i = 0; i < cells; i++) {
      const item = mats[i];
      const div = document.createElement('div');
      div.className = 'inv-cell' + (item ? ' rarity-' + item.rarity : '');
      div.innerHTML = this.itemCellHTML(item);
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

    if (!equipped) return `<div class="compare">${verdict}</div>`;

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
    return `<div class="compare">${verdict}<em>Frente a: ${equipped.name}</em>${diffs.join('') || '<div class="diff dim">Sin diferencias</div>'}</div>`;
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
    // diff pero buildCompare lo gestiona). En táctil esto da el "tap = comparar".
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
    if (sk.mult) return `Daño ${Math.round(skillVal(sk.mult, lvl) * 100)}%`;
    if (sk.buff) return Object.entries(sk.buff).map(([k, v]) => `+${Math.round(skillVal(v, lvl))} ${STAT_NAMES[k] || k}`).join(', ');
    if (sk.passive) return Object.entries(sk.passive).map(([k, v]) => `+${Math.round(skillVal(v, lvl))} ${STAT_NAMES[k] || k}`).join(', ');
    if (sk.count) return `${Math.floor(skillVal(sk.count, lvl))} proyectiles`;
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

  renderSkills() {
    const p = this.game.player;
    const nav = $('sk-build-nav');
    if (nav) { nav.innerHTML = this.buildNavHTML('skills'); this.bindBuildNav(nav); }
    const ptsEl = $('skill-points');
    ptsEl.className = 'sk-summary' + (p.skillPoints > 0 ? ' has-points' : '');
    ptsEl.innerHTML = `<span class="sk-sum-cls">${p.cls.icon} ${p.cls.name} · ${p.cls.resource?.icon || ''} ${p.cls.resource?.name || ''}</span>` +
      (p.skillPoints > 0
        ? `<span class="sk-sum-pts">✦ ${p.skillPoints} punto${p.skillPoints > 1 ? 's' : ''} por gastar</span>`
        : `<span class="sk-sum-pts dim">Sin puntos por gastar</span>`);
    const cont = $('skill-tree');
    cont.innerHTML = '';

    // editor ÚNICO de la barra: toca una ranura → elige qué habilidad colocar
    cont.appendChild(this.renderHotbarEditor());

    // árbol de habilidades estilo D4: 6 nodos en cadena (Básicos → Hab. I/II/III
    // → Definitiva → Pasivas), conectados por líneas. Cada nodo despliega sus
    // habilidades, y cada habilidad sus 3 mini-ramas de pasivos (Mejora+Aspectos).
    const graph = document.createElement('div');
    graph.className = 'sk-tree6';
    const tree = p.cls.tree || [];
    const kindLabel = { basic: 'Genera recurso', core: 'Habilidad', ultimate: 'Definitiva', passive: 'Pasiva' };
    tree.forEach((node, idx) => {
      const unlocked = p.level >= node.req;
      const sec = document.createElement('div');
      sec.className = 'sk-knode-sec' + (unlocked ? '' : ' locked');
      const head = document.createElement('div');
      head.className = 'sk-knode-head';
      head.innerHTML =
        `<div class="sk-knode kind-${node.kind}${unlocked ? '' : ' locked'}"><span class="sk-knode-n">${idx + 1}</span></div>` +
        `<div class="sk-knode-lbl"><b>${node.name}</b><small>${unlocked ? (kindLabel[node.kind] || '') : `${icon('lock')} Nivel ${node.req}`}</small></div>`;
      sec.appendChild(head);
      const skillsRow = document.createElement('div');
      skillsRow.className = 'sk-knode-skills';
      for (const sid of node.skills) {
        const sk = p.cls.skills.find(s => s.id === sid);
        if (sk) skillsRow.appendChild(this.skTreeSkill(sk, node, unlocked));
      }
      sec.appendChild(skillsRow);
      graph.appendChild(sec);
      if (idx < tree.length - 1) { const t = document.createElement('div'); t.className = 'sk-trunk6'; graph.appendChild(t); }
    });
    // zoom in/out (el árbol es grande): toolbar + rueda del ratón
    this.skillZoom = this.skillZoom || 1;
    const applyZoom = z => { this.skillZoom = Math.max(0.5, Math.min(1.6, Math.round(z * 20) / 20)); graph.style.transform = `scale(${this.skillZoom})`; if (zl) zl.textContent = Math.round(this.skillZoom * 100) + '%'; };
    const zoomBar = document.createElement('div'); zoomBar.className = 'sk-zoom';
    zoomBar.innerHTML = `<button class="sk-zoom-b" data-z="out">−</button><span class="sk-zoom-lbl">100%</span><button class="sk-zoom-b" data-z="in">+</button><button class="sk-zoom-b" data-z="reset">⟲</button>`;
    const zl = zoomBar.querySelector('.sk-zoom-lbl');
    zoomBar.querySelector('[data-z=out]').onclick = () => applyZoom(this.skillZoom - 0.1);
    zoomBar.querySelector('[data-z=in]').onclick = () => applyZoom(this.skillZoom + 0.1);
    zoomBar.querySelector('[data-z=reset]').onclick = () => applyZoom(1);
    cont.appendChild(zoomBar);
    graph.style.transformOrigin = 'top center';
    cont.appendChild(graph);
    applyZoom(this.skillZoom);
    cont.onwheel = e => { if (e.ctrlKey || e.shiftKey) { e.preventDefault(); applyZoom(this.skillZoom + (e.deltaY < 0 ? 0.1 : -0.1)); } };

    // respec (habilidades + aspectos comparten el mismo pool de puntos)
    if (Object.keys(p.skills).length || Object.keys(p.skillMods || {}).length) {
      const cost = this.game.respecCost();
      const rb = document.createElement('button');
      rb.className = 'quest-btn sk-respec';
      rb.innerHTML = `${icon('recycle')} Redistribuir habilidades <span class="dim">(${cost} 🪙)</span>`;
      rb.disabled = p.gold < cost;
      rb.onclick = () => { this.game.respecSkills(); this.renderSkills(); this.updateHUD(); };
      cont.appendChild(rb);
    }
  }

  // ---- editor único de la hotbar (toca una ranura → elige habilidad) ----
  renderHotbarEditor() {
    const p = this.game.player;
    const wrap = document.createElement('div');
    wrap.className = 'hb-editor';
    wrap.innerHTML = `<div class="hb-editor-head">🎮 Barra de habilidades <small class="dim">— toca una ranura y elige qué colocar</small></div>`;
    const row = document.createElement('div'); row.className = 'hb-slots';
    const SLOTS = [['lmb', '🖱️I'], ['rmb', '🖱️D'], ['k1', '1'], ['k2', '2'], ['k3', '3'], ['k4', '4']];
    for (const [slot, label] of SLOTS) {
      const id = p.hotbar?.[slot] || null;
      let ico = '·', nm = 'Vacío', cls = ' empty';
      if (id) { const sk = p.cls.skills.find(s => s.id === id); if (sk) { ico = sk.icon; nm = sk.name + (p.skills[id] > 0 ? '' : ' (sin aprender)'); cls = sk.kind === 'basic' ? ' basic' : ''; } }
      const b = document.createElement('button');
      b.className = 'hb-slot' + cls;
      b.innerHTML = `<span class="hb-slot-key">${label}</span><span class="hb-slot-ico">${ico}</span>`;
      b.title = `${label}: ${nm} — toca para cambiar`;
      b.onclick = () => this.hotbarSlotChooser(slot, label);
      row.appendChild(b);
    }
    wrap.appendChild(row);
    return wrap;
  }

  // popup: elige qué habilidad colocar en una ranura concreta
  hotbarSlotChooser(slot, label) {
    const g = this.game, p = g.player;
    const pop = $('item-popup');
    pop.style.left = pop.style.top = pop.style.transform = '';
    pop.innerHTML = `<div class="popup-name">🎮 Asignar a la ranura ${label}</div><div class="popup-btns codex-choose"></div>`;
    const btns = pop.querySelector('.popup-btns');
    const add = (id, html, dim = false) => {
      const b = document.createElement('button');
      b.className = 'btn-good' + (p.hotbar?.[slot] === id ? ' on' : '');
      if (dim) b.style.opacity = '0.55';
      b.innerHTML = html;
      b.onclick = () => { g.assignHotbar(slot, id); pop.classList.add('hidden'); this.renderSkills(); this.updateHUD(); };
      btns.appendChild(b);
    };
    // básicos, cores y ultimates son colocables (las pasivas no van a la barra)
    const groups = [['basic', 'Básicos'], ['core', 'Habilidades'], ['ultimate', 'Definitivas']];
    for (const [kind] of groups) {
      for (const sk of p.cls.skills.filter(s => s.kind === kind)) {
        const known = p.skills[sk.id] > 0;
        const tag = kind === 'basic' ? ' <small class="dim">(generador)</small>' : kind === 'ultimate' ? ' <small class="dim">(definitiva)</small>' : '';
        add(sk.id, `${sk.icon} ${sk.name}${known ? tag : ' <small class="dim">(sin aprender)</small>'}`, !known);
      }
    }
    const clr = document.createElement('button'); clr.textContent = '✖ Vaciar ranura';
    clr.onclick = () => { g.assignHotbar(slot, null); pop.classList.add('hidden'); this.renderSkills(); this.updateHUD(); };
    btns.appendChild(clr);
    const c = document.createElement('button'); c.textContent = 'Cerrar';
    c.onclick = () => pop.classList.add('hidden');
    btns.appendChild(c);
    pop.classList.remove('hidden');
  }

  // ---- nodos del grafo de habilidades (estilo D4) ----
  skNodeWrap(node, label) {
    const w = document.createElement('div'); w.className = 'sk-nwrap';
    const l = document.createElement('div'); l.className = 'sk-nlbl'; l.textContent = label;
    w.append(node, l); return w;
  }
  skConn() { const d = document.createElement('div'); d.className = 'sk-conn'; return d; }
  // una habilidad dentro de su nodo del árbol (con sus 3 mini-ramas si es core)
  skTreeSkill(sk, node, unlocked) {
    const p = this.game.player;
    const lvl = p.skills[sk.id] || 0;
    const maxed = lvl >= sk.max;
    const canLearn = unlocked && p.skillPoints > 0 && !maxed;
    const shape = node.kind === 'passive' ? 'passive' : node.kind === 'ultimate' ? 'ult' : node.kind === 'basic' ? 'basic' : 'core';
    const wrap = document.createElement('div'); wrap.className = 'sk-skill';
    const n = document.createElement('button');
    n.className = 'sk-node ' + shape + (lvl > 0 ? ' learned' : '') + (canLearn ? ' avail' : '') + (maxed ? ' maxed' : '') + (!unlocked ? ' tier-locked' : '');
    n.innerHTML = `<span class="sk-node-ico">${sk.icon}</span><span class="sk-node-rank">${lvl}/${sk.max}</span>` + (!unlocked ? `<span class="sk-node-lock">${icon('lock')}</span>` : '');
    n.title = `${sk.name} — ${sk.desc}` + (!unlocked ? `\n🔒 Requiere nivel ${node.req}` : '');
    n.onclick = () => {
      if (!unlocked) { this.message(`🔒 ${node.name}: requiere nivel ${node.req}`); return; }
      if (node.kind === 'passive') {
        if (!maxed && p.skillPoints > 0) { this.game.learnSkill(sk.id); this.renderSkills(); this.updateHUD(); }
        else this.message(maxed ? `${sk.name} al máximo` : 'Sin puntos de habilidad');
        return;
      }
      this.skillDetailPopup(sk, node);
    };
    wrap.appendChild(this.skNodeWrap(n, sk.name));
    // 3 ramas de pasivos × 3 opciones (elige 1 por rama, swap libre) — solo si aprendida
    const branches = SKILL_MODS[sk.id];
    if (branches && lvl > 0 && node.kind !== 'passive') {
      const mods = document.createElement('div'); mods.className = 'sk-branches';
      for (const br of branches) mods.appendChild(this.skBranchRow(sk, br));
      wrap.appendChild(this.skConn());
      wrap.appendChild(mods);
    }
    return wrap;
  }
  // una rama de pasivos: etiqueta + 3 opciones (1 activa). Tocar una opción la
  // elige; tocar la activa la quita. Gratis y cambiable cuando quieras.
  skBranchRow(sk, br) {
    const g = this.game, p = g.player;
    const sel = (p.skillMods[sk.id] || {})[br.id] || null;
    const row = document.createElement('div'); row.className = 'sk-branch';
    const lbl = document.createElement('span'); lbl.className = 'sk-branch-lbl'; lbl.textContent = br.name;
    row.appendChild(lbl);
    const opts = document.createElement('div'); opts.className = 'sk-branch-opts';
    for (const o of br.opts) {
      const b = document.createElement('button');
      const on = sel === o.id;
      b.className = 'sk-opt' + (on ? ' on' : '');
      b.innerHTML = `<span class="sk-opt-name">${o.name}</span>`;
      b.title = `${o.name}: ${o.desc}` + (on ? '\n✓ activa (toca para quitar)' : '');
      b.onclick = () => { g.setSkillMod(sk.id, br.id, o.id); this.renderSkills(); this.updateHUD(); };
      opts.appendChild(b);
    }
    row.appendChild(opts);
    return row;
  }

  // detalle de una habilidad (subir rango + engarces de soporte si aplica)
  skillDetailPopup(sk, node) {
    const g = this.game, p = g.player;
    const pop = $('item-popup');
    pop.style.left = pop.style.top = pop.style.transform = '';
    const lvl = p.skills[sk.id] || 0;
    const reqLvl = sk.req || node?.req || 1;
    const unlocked = p.level >= reqLvl;
    const maxed = lvl >= sk.max;
    const cost = Math.round(skillVal(sk.mana, Math.max(1, lvl)));
    const res = p.cls.resource;
    const details = this.skillDetails(sk, Math.max(1, lvl));
    let syn = '';
    if (sk.synergies) {
      const txts = sk.synergies.map(sy => { const src = p.cls.skills.find(s => s.id === sy.from); return `${sy.pct}%/pt en ${src ? src.name : sy.from}`; });
      const bonus = synergyBonus(sk, p.skills);
      syn = `<div class="sk-detail-syn">🔗 ${txts.join(' · ')}${bonus > 0 ? ` <b>(+${bonus}%)</b>` : ''}</div>`;
    }
    pop.innerHTML = `
      <div class="popup-name">${sk.icon} ${sk.name} <span class="dim">${lvl}/${sk.max}</span></div>
      <div class="popup-sub">${sk.desc}</div>
      <div class="sk-detail-nums">${details} · cuesta ${cost} ${res?.name || ''}</div>
      ${syn}
      <div class="popup-btns codex-choose"></div>`;
    const btns = pop.querySelector('.popup-btns');
    const up = document.createElement('button');
    up.className = 'btn-good';
    if (!unlocked) { up.disabled = true; up.textContent = `🔒 Requiere nivel ${reqLvl}`; }
    else if (maxed) { up.disabled = true; up.textContent = '★ Rango máximo'; }
    else if (p.skillPoints <= 0) { up.disabled = true; up.textContent = 'Sin puntos de habilidad'; }
    else up.textContent = lvl === 0 ? 'Aprender (1 punto)' : `Subir a rango ${lvl + 1} (1 punto)`;
    up.onclick = () => { g.learnSkill(sk.id); pop.classList.add('hidden'); this.renderSkills(); this.updateHUD(); };
    btns.appendChild(up);
    if (lvl > 0 && (sk.kind === 'core' || sk.kind === 'ultimate')) this.renderSupportSlots(pop, sk, () => this.skillDetailPopup(sk, node));
    const c = document.createElement('button'); c.textContent = 'Cerrar';
    c.onclick = () => pop.classList.add('hidden');
    btns.appendChild(c);
    pop.classList.remove('hidden');
  }

  // Multi-socket: hasta 2 soportes por habilidad. Muestra dos selectores con el
  // efecto y la contrapartida de cada soporte; los incompatibles aparecen en gris.
  renderSupportSlots(infoEl, sk, onChange) {
    const p = this.game.player;
    const MAX_SLOTS = 2;
    // normaliza a array (retrocompat con saves viejos en string)
    let cur = p.supports[sk.id];
    if (typeof cur === 'string') cur = cur ? [cur] : [];
    if (!Array.isArray(cur)) cur = [];
    p.supports[sk.id] = cur;

    // soportes conocidos compatibles con el tipo de esta habilidad
    const compat = SUPPORTS.filter(s => s.types.includes(sk.type) && p.knownSupports.includes(s.id));
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
        const incompatible = !s.types.includes(sk.type);
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

  skillDetails(sk, lvl) {
    const parts = [];
    if (sk.mult) parts.push(`Daño ${Math.round(skillVal(sk.mult, lvl) * 100)}%`);
    if (sk.mana) parts.push(`Maná ${Math.round(skillVal(sk.mana, lvl))}`);
    if (sk.cd) parts.push(`CD ${sk.cd}s`);
    if (sk.radius) parts.push(`Radio ${sk.radius}m`);
    if (sk.count) parts.push(`Proyectiles ${Math.floor(skillVal(sk.count, lvl))}`);
    if (sk.buff) parts.push(Object.entries(sk.buff).map(([k, v]) => `+${Math.round(skillVal(v, lvl))} ${k}`).join(', ') + ` (${sk.dur}s)`);
    if (sk.passive) parts.push(Object.entries(sk.passive).map(([k, v]) => `+${Math.round(skillVal(v, lvl))} ${k}`).join(', '));
    return parts.join(' · ');
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
    const mPts = p.mastery?.points || 0;
    const hasMastery = p.level >= MASTERY_START_LEVEL || p.mastery?.id;
    const mBadge = mPts > 0 ? `<span class="bnav-badge">${mPts}</span>` : '';
    // tab: si está bloqueado se muestra IGUAL (descubribilidad/aspiración) con
    // candado y el nivel requerido; al pulsarlo se abre una vista de preview.
    const tab = (key, ico, label, badge, on, lockLvl) =>
      `<button class="bnav-tab${on ? ' on' : ''}${lockLvl ? ' bnav-locked' : ''}" data-bnav="${key}"${lockLvl ? ` title="Se desbloquea en el nivel ${lockLvl}"` : ''}>${icon(ico)} <span class="bnav-lbl">${label}</span>${lockLvl ? `<span class="bnav-lock">${icon('lock')} Nv ${lockLvl}</span>` : badge}</button>`;
    return `<div class="build-nav">
        ${tab('stats', 'hero', 'Personaje', '', active === 'stats')}
        ${tab('skills', 'book', 'Habilidades', skillBadge, active === 'skills')}
        ${tab('mastery', 'magic', 'Maestría', mBadge, active === 'mastery', hasMastery ? 0 : MASTERY_START_LEVEL)}
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
        else if (dest === 'mastery') this.openMastery();
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
      <div class="cs-power" title="Poder del héroe: resume la fuerza de tu build. Sube al mejorar equipo, nivel, paragon o maestrías.">⚡ Poder <b>${s.power || 0}</b></div>
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
      statLine('shield', 'Armadura', s.arm, 'arm');
    const utility =
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
  // abierto para que sea "en vivo" (jugador y enemigos se mueven en tiempo real)
  renderMap() {
    if (this.activePanel !== 'map') return;
    const g = this.game.world.grid;
    const ex = this.game.world.explored || new Set();
    const cv = $('map-canvas');
    const S = 380; if (cv.width !== S) { cv.width = S; cv.height = S; }
    const ctx = cv.getContext('2d');
    const cs = S / Math.max(g.w, g.h);
    ctx.fillStyle = '#05060a'; ctx.fillRect(0, 0, S, S);
    // rotación 45° (norte de cámara = arriba) + reducción para que el cuadrado
    // girado quepa entero dentro del lienzo
    ctx.save();
    ctx.translate(S / 2, S / 2);
    ctx.rotate(Math.PI / 4);
    ctx.scale(0.7071, 0.7071);
    ctx.translate(-S / 2, -S / 2);
    // celdas descubiertas
    for (let z = 0; z < g.h; z++) for (let x = 0; x < g.w; x++) {
      if (!ex.has(z * g.w + x)) continue;
      ctx.fillStyle = g.cells[z][x] ? '#3a4a3a' : '#1a1a22';
      ctx.fillRect(x * cs, z * cs, Math.ceil(cs), Math.ceil(cs));
    }
    const dot = (pos, color, r) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc((pos.x - g.ox) * cs, (pos.z - g.oz) * cs, r, 0, Math.PI * 2);
      ctx.fill();
    };
    // POIs (solo los ya descubiertos)
    for (const it of this.game.world.interactables) {
      const col = this.poiColor(it.type);
      if (!col) continue;
      const x = Math.floor(it.pos.x - g.ox), z = Math.floor(it.pos.z - g.oz);
      if (ex.has(z * g.w + x)) dot(it.pos, col, 4);
    }
    // enemigos en vivo (solo en celdas descubiertas)
    for (const e of this.game.enemies) {
      if (!e.alive) continue;
      const x = Math.floor(e.pos.x - g.ox), z = Math.floor(e.pos.z - g.oz);
      if (ex.has(z * g.w + x)) dot(e.pos, this.enemyDot(e), (e.def.boss || e.def.worldBoss) ? 5 : 3);
    }
    if (this.game.player) dot(this.game.player.pos, '#ffffff', 4);
    ctx.restore();
    const pct = Math.round(ex.size / (g.w * g.h) * 100);
    $('map-info').textContent = `${this.game.world.biome || this.game.world.type} · descubierto ${pct}%`;
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
    html += `</div><p class="dim wm-foot">Toca una región conectada para viajar · ⭐ fija tu hogar de reaparición.</p>`;
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
    if (type === 'portal_next') return '#ff5577';
    if (type === 'waypoint') return '#44ddff';
    if (type === 'shrine') return '#9ff0c4';
    if (type === 'world_event') return '#cc66ff';
    if (type.startsWith('portal')) return '#55aaff';
    if (type === 'vendor' || type === 'questgiver' || type === 'stash' || type === 'enchanter' || type === 'healer' || type === 'petkeeper') return '#ffd24a';
    return null;
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
    const dot = (pos, color, r) => {
      const cx = (pos.x - g.ox - ox0) * scale, cz = (pos.z - g.oz - oz0) * scale;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(cx, cz, r, 0, Math.PI * 2);
      ctx.fill();
    };
    for (const it of this.game.world.interactables) {
      const col = this.poiColor(it.type);
      if (col) dot(it.pos, col, it.type === 'zone_dungeon' || it.type.startsWith('portal') ? 3 : 2);
    }
    for (const e of this.game.enemies)
      if (e.alive) dot(e.pos, this.enemyDot(e), e.def.goblin ? 3 : 2);
    if (p) dot(p.pos, '#ffffff', 3);
    ctx.restore();
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
    html += `<p class="dim">Más Tormento = enemigos más fuertes y mejor botín (rareza y cantidad). Se desbloquea empujando grietas y descendiendo en las mazmorras.</p>`;
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

  // ---------- Maestrías de clase (ramas) ----------
  openMastery() {
    if (this.activePanel !== 'mastery') {
      this.closePanel();
      this.activePanel = 'mastery';
      $('panel-mastery').classList.remove('hidden');
      this.markJustOpened();
    }
    this.renderMastery();
  }

  renderMastery() {
    const g = this.game, p = g.player;
    const nav = $('mastery-build-nav');
    if (nav) { nav.innerHTML = this.buildNavHTML('mastery'); this.bindBuildNav(nav); }
    const body = $('mastery-body');
    const list = MASTERIES[p.classId] || [];

    if (p.level < MASTERY_START_LEVEL && !p.mastery?.id) {
      // PREVIEW (bloqueado): se ve qué viene, para que el jugador lo anhele
      let html = `<div class="locked-banner">${icon('lock')} Las maestrías se desbloquean en el <b>nivel ${MASTERY_START_LEVEL}</b> (te faltan ${MASTERY_START_LEVEL - p.level}). Elegirás <b>una</b> de estas ${list.length} ramas y ganarás 1 punto cada 2 niveles. Vista previa:</div>`;
      html += `<div class="mastery-pick preview">`;
      for (const m of list) {
        html += `<div class="mastery-card locked">
          <div class="mastery-card-ico">${m.icon}</div>
          <div class="mastery-card-name">${m.name}</div>
          <div class="dim mastery-card-desc">${m.desc}</div>
          <ul class="mastery-card-nodes">${m.nodes.filter(n => n.type === 'capstone').map(n => `<li>★ <b>${n.name}</b>: ${n.desc}</li>`).join('')}</ul>
        </div>`;
      }
      html += `</div>`;
      body.innerHTML = html;
      return;
    }

    // aún sin elegir: muestra las 3 ramas para escoger
    if (!p.mastery?.id) {
      let html = `<p class="dim">Elige <b>una</b> maestría: define la identidad de tu build. Podrás reespecializar por oro más adelante. Puntos: <b>${p.mastery?.points || 0}</b></p>`;
      html += `<div class="mastery-pick">`;
      for (const m of list) {
        html += `<div class="mastery-card">
          <div class="mastery-card-ico">${m.icon}</div>
          <div class="mastery-card-name">${m.name}</div>
          <div class="dim mastery-card-desc">${m.desc}</div>
          <ul class="mastery-card-nodes">${m.nodes.map(n => `<li>${n.type === 'capstone' ? '★ ' : ''}<b>${n.name}</b>: ${n.desc}</li>`).join('')}</ul>
          <button class="quest-btn" data-pick="${m.id}">Elegir ${m.icon} ${m.name}</button>
        </div>`;
      }
      html += `</div>`;
      body.innerHTML = html;
      body.querySelectorAll('[data-pick]').forEach(b =>
        b.onclick = () => { g.chooseMastery(b.dataset.pick); this.renderMastery(); this.updateHUD(); });
      return;
    }

    // ya elegida: muestra el árbol de nodos por tier
    const m = findMastery(p.mastery.id);
    const spent = g.masterySpent();
    const pts = p.mastery.points || 0;
    let html = `<div class="mastery-head"><span class="mastery-head-ico">${m.icon}</span> <b>${m.name}</b> <span class="dim">— ${m.desc}</span></div>`;
    html += `<p class="points-txt">Puntos de maestría: <b>${pts}</b> · asignados: <b>${spent}</b></p>`;
    const tiers = [{ k: 'minor', label: 'Menores' }, { k: 'notable', label: 'Notables (req. 3)' }, { k: 'mayor', label: 'Mayores (req. 6)' }, { k: 'capstone', label: 'Capstone (req. 8)' }];
    html += `<div class="mastery-tree">`;
    for (const t of tiers) {
      const nodes = m.nodes.filter(n => n.type === t.k);
      if (!nodes.length) continue;
      html += `<div class="mastery-tier"><div class="mastery-tier-lbl">${t.label}</div><div class="mastery-row">`;
      for (const n of nodes) {
        const owned = !!p.mastery.nodes[n.id];
        const locked = spent < n.req;
        const canBuy = !owned && !locked && pts > 0;
        const cls = owned ? ' owned' : locked ? ' locked' : canBuy ? ' avail' : '';
        html += `<button class="mastery-node${cls}" data-node="${n.id}" ${owned || locked || pts <= 0 ? 'disabled' : ''}>
          <b>${n.type === 'capstone' ? '★ ' : ''}${n.name}</b>
          <span class="mastery-node-desc">${n.desc}</span>
          <span class="mastery-node-tag">${owned ? '✓ asignado' : locked ? `🔒 req. ${n.req}` : pts > 0 ? 'Asignar (1 pt)' : 'sin puntos'}</span>
        </button>`;
      }
      html += `</div></div>`;
    }
    html += `</div>`;
    // reespecializar
    const cost = g.masteryRespecCost();
    html += `<button id="mastery-respec" class="quest-btn mastery-respec${p.gold < cost ? ' no-gold' : ''}" ${p.gold < cost ? 'disabled' : ''}>♻️ Reespecializar (${icon('coin', { cls: 'ico-gold' })} ${cost})</button>`;
    body.innerHTML = html;
    body.querySelectorAll('[data-node]').forEach(b =>
      b.onclick = () => { g.allocateMasteryNode(b.dataset.node); });
    const rb = $('mastery-respec');
    if (rb) rb.onclick = () => { g.respecMastery(); this.renderMastery(); this.updateHUD(); };
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
      if (freeGlyphs > 0) html += `<div class="cs-build-alert glyph">🔷 Tienes <b>${freeGlyphs}</b> glifo(s) sin engarzar${freeSockets > 0 ? ` y <b>${freeSockets}</b> engarce(s) ◇ libre(s)` : ''}. Toca un engarce activo para colocarlos.</div>`;
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
          ? (gl ? `🔷 ${gl.name} (toca para cambiar/quitar)` : 'Engarce de glifo ◇' + (on ? ' — toca para engarzar un glifo' : ' (actívalo primero)'))
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
