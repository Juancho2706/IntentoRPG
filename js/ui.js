// ============================================================
// Interfaz: HUD, inventario, árbol de habilidades, paneles
// ============================================================
import * as THREE from 'three';
import { CLASSES, STAT_NAMES, STAT_DESC, TIER_LEVELS, PACTS, ENEMIES, SUPPORTS, skillVal, synergyBonus, xpForLevel, POTION_PRICES, PET_PRICE } from './data.js';
import { RARITIES, SLOT_NAMES, SETS, LEGENDARY_POWERS, itemStatLines, statText } from './items.js';

const $ = (id) => document.getElementById(id);

export class UI {
  constructor(game) {
    this.game = game;
    this.floats = [];
    this.labelMap = new Map();
    this._v = new THREE.Vector3();
    this.activePanel = null;
    this.drag = null;
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
    } else if (tapFn) {
      div.addEventListener('click', tapFn);
    }
  }

  dragStart(e, div, desc, tapFn) {
    if (e.button != null && e.button !== 0) return;
    e.preventDefault();
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
    $('btn-inv').addEventListener('click', () => this.togglePanel('inv'));
    $('btn-skills').addEventListener('click', () => this.togglePanel('skills'));
    $('btn-stats').addEventListener('click', () => this.togglePanel('stats'));
    $('btn-shop').addEventListener('click', () => this.togglePanel('shop'));
    $('btn-settings').addEventListener('click', () => this.togglePanel('settings'));
    $('btn-identify').addEventListener('click', () => g.identifyAll());
    $('btn-junk').addEventListener('click', () => g.sellJunk());
    $('btn-sort').addEventListener('click', () => g.sortInventory());
    document.querySelectorAll('.panel-close').forEach(b => b.addEventListener('click', () => this.closePanel()));
    $('btn-collection').addEventListener('click', () => this.openCollection());
    $('btn-respawn').addEventListener('click', () => g.respawn());
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
        card.innerHTML = `<div class="slot-info">${cls?.icon || '🧍'} <b>${cls?.name || '?'} Nv ${m.level}</b><small>Piso máx ${m.maxFloor}${m.hardcore ? ' ☠️' : ''}</small></div>`;
        const play = document.createElement('button');
        play.className = 'slot-play';
        play.textContent = '▶️ Jugar';
        play.onclick = () => { el.classList.add('hidden'); onPick(i, 'continue'); };
        const del = document.createElement('button');
        del.className = 'slot-del';
        del.textContent = '🗑️';
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

    if (selectedSlot < 0) {
      const full = document.createElement('p');
      full.className = 'dim';
      full.textContent = 'Los 3 huecos están ocupados: borra un héroe para crear otro.';
      cont.appendChild(full);
      return;
    }

    const hc = document.createElement('label');
    hc.className = 'hc-toggle';
    hc.innerHTML = `<input type="checkbox" id="hc-check"> ☠️ Modo Hardcore — la muerte es permanente`;
    cont.appendChild(hc);
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
        onPick(selectedSlot, cls.id, { hardcore: document.getElementById('hc-check')?.checked });
      };
      row.appendChild(card);
    }
    cont.appendChild(row);
  }

  // ---------- HUD ----------
  updateHUD() {
    const p = this.game.player;
    if (!p) return;
    const hpPct = Math.max(0, p.hp / p.stats.maxHP * 100);
    const mpPct = Math.max(0, p.mp / p.stats.maxMP * 100);
    $('orb-hp-fill').style.height = hpPct + '%';
    $('orb-mp-fill').style.height = mpPct + '%';
    $('orb-hp-txt').textContent = `${Math.ceil(p.hp)}`;
    $('orb-mp-txt').textContent = `${Math.ceil(p.mp)}`;
    const need = xpForLevel(p.level);
    $('xp-fill').style.width = Math.min(100, p.xp / need * 100) + '%';
    $('hud-level').textContent = `Nv ${p.level}${p.hardcore ? ' ☠️' : ''}`;
    const tracker = $('quest-tracker');
    if (p.quest) {
      tracker.style.display = '';
      const done = p.quest.progress >= p.quest.goal;
      tracker.textContent = done ? '🎯 ¡Completada! Ve con el Capitán' : `🎯 ${Math.min(p.quest.progress, p.quest.goal)}/${p.quest.goal} — ${p.quest.desc}`;
    } else tracker.style.display = 'none';
    $('hud-gold').textContent = `🪙 ${p.gold}`;
    $('hud-zone').textContent = this.game.world?.type === 'town' ? '🏘️ Pueblo'
      : this.game.world?.type === 'refuge' ? '🏕️ Refugio' : `🕳️ Piso ${this.game.world.floor}`;
    $('pot-hp-count').textContent = p.potions.hp;
    $('pot-mp-count').textContent = p.potions.mp;
    // aviso pulsante cuando la vida es crítica
    document.body.classList.toggle('low-hp', p.alive && hpPct < 30);

    // botón de acción contextual: interactuar o atacar
    const it = this.game.currentInteract;
    const icons = {
      portal_dungeon: '🌀', portal_town: '🌀', portal_next: '🌀', portal_daily: '🌟',
      waypoint: '🗺️', questgiver: '💬', stash: '🗃️', vendor: '💰', chest: '📦', shrine: '✨', enchanter: '🔮',
    };
    const atkBtn = $('btn-attack');
    const icon = it ? (icons[it.type] || '✋') : '⚔️';
    if (atkBtn.textContent !== icon) atkBtn.textContent = icon;
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

    // cooldowns de la barra de habilidades
    for (const btn of $('skillbar').children) {
      const id = btn.dataset.skill;
      if (!id) continue;
      const sk = p.cls.skills.find(s => s.id === id);
      const cd = p.cds[id] || 0;
      const ov = btn.querySelector('.cd-overlay');
      ov.style.height = cd > 0 ? (cd / sk.cd * 100) + '%' : '0%';
      const cost = Math.round(skillVal(sk.mana, p.skills[id] || 1));
      btn.classList.toggle('no-mana', p.mp < cost);
    }
  }

  refreshHotbar() {
    const p = this.game.player;
    const bar = $('skillbar');
    bar.innerHTML = '';
    const actives = p.cls.skills.filter(s => s.type !== 'passive' && p.skills[s.id] > 0).slice(0, 4);
    actives.forEach((sk, i) => {
      const btn = document.createElement('button');
      btn.className = 'skill-btn';
      btn.dataset.skill = sk.id;
      btn.innerHTML = `<span class="sk-icon">${sk.icon}</span><span class="sk-key">${i + 1}</span><div class="cd-overlay"></div>`;
      btn.title = sk.name;
      btn.addEventListener('pointerdown', e => { e.preventDefault(); this.game.castSkillSlot(i); });
      bar.appendChild(btn);
    });
  }

  flashDamage() {
    const el = $('damage-flash');
    el.classList.remove('active');
    void el.offsetWidth;
    el.classList.add('active');
  }

  message(text, ms = 2600) {
    const cont = $('messages');
    const div = document.createElement('div');
    div.className = 'msg';
    div.textContent = text;
    cont.appendChild(div);
    while (cont.children.length > 3) cont.firstChild.remove();
    setTimeout(() => { div.classList.add('fade'); setTimeout(() => div.remove(), 500); }, ms);
  }

  // ---------- textos flotantes (daño, xp...) ----------
  spawnText(worldPos, text, cls) {
    if (this.floats.length > 40) return;
    const el = document.createElement('div');
    el.className = 'float-txt ' + cls;
    el.textContent = text;
    $('floats').appendChild(el);
    this.floats.push({ el, pos: worldPos.clone().add(new THREE.Vector3(0, 1.6, 0)), t: 0 });
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
    this.renderPanel();
  }

  closePanel() {
    if (!this.activePanel) return;
    $('panel-' + this.activePanel).classList.add('hidden');
    this.activePanel = null;
    $('item-popup').classList.add('hidden');
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
  }

  openStash() {
    if (this.activePanel !== 'stash') {
      this.closePanel();
      this.activePanel = 'stash';
      $('panel-stash').classList.remove('hidden');
    }
    this.renderStash();
  }

  renderStash() {
    const g = this.game, p = g.player;
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

  renderSettings() {
    const g = this.game;
    const cont = $('settings-body');
    cont.innerHTML = '';
    const toggle = (key, label, onChange) => {
      const row = document.createElement('label');
      row.className = 'opt-row';
      row.innerHTML = `<span>${label}</span><input type="checkbox" ${g.settings[key] ? 'checked' : ''}>`;
      row.querySelector('input').onchange = (e) => {
        g.settings[key] = e.target.checked;
        g.saveSettings();
        if (onChange) onChange(e.target.checked);
      };
      cont.appendChild(row);
    };
    toggle('sound', '🔊 Sonido');
    toggle('music', '🎵 Música ambiental', (v) => g.music.setEnabled(v));
    toggle('shake', '📳 Sacudida de cámara');
    toggle('haptics', '📱 Vibración (móvil)');
    toggle('autoq', '🚀 Calidad automática (baja gráficos si van lentos)');
    // brillo: útil en mazmorras oscuras o pantallas con reflejos
    const row = document.createElement('label');
    row.className = 'opt-row';
    row.innerHTML = `<span>💡 Brillo</span>
      <input type="range" min="60" max="170" step="5" value="${Math.round((g.settings.brightness || 1) * 100)}">`;
    const slider = row.querySelector('input');
    slider.oninput = () => {
      g.settings.brightness = slider.value / 100;
      g.renderer.toneMappingExposure = g.settings.brightness;
    };
    slider.onchange = () => g.saveSettings();
    cont.appendChild(row);

    // filtro de loot: oculta el botín por debajo de la rareza elegida
    const fr = document.createElement('label');
    fr.className = 'opt-row';
    fr.innerHTML = `<span>🔍 Filtro de loot (mostrar desde)</span>
      <select>
        <option value="normal">Todo</option>
        <option value="magico">Mágico+</option>
        <option value="raro">Raro+</option>
        <option value="legendario">Legendario</option>
      </select>`;
    const sel = fr.querySelector('select');
    sel.value = g.settings.lootFilter || 'normal';
    sel.onchange = () => { g.settings.lootFilter = sel.value; g.saveSettings(); };
    cont.appendChild(fr);

    // copia de seguridad de la partida (de momento local; nube más adelante)
    const head = document.createElement('h4');
    head.textContent = '💾 Copia de seguridad';
    cont.appendChild(head);
    const mkBtn = (txt, fn) => {
      const b = document.createElement('button');
      b.className = 'shop-item';
      b.innerHTML = `<span class="shop-name">${txt}</span>`;
      b.onclick = fn;
      cont.appendChild(b);
    };
    mkBtn('📋 Copiar código de guardado <small class="shop-stats">Incluye tu héroe actual y el alijo</small>', () => g.exportSave());
    mkBtn('📥 Importar código de guardado <small class="shop-stats">Sobrescribe el héroe del hueco actual</small>', () => g.importSave());
  }

  openQuest() {
    if (this.activePanel !== 'quest') {
      this.closePanel();
      this.activePanel = 'quest';
      $('panel-quest').classList.remove('hidden');
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
    const body = $('pacts-body');
    body.innerHTML = '';
    for (const pact of PACTS) {
      const b = document.createElement('button');
      b.className = 'shop-item';
      b.innerHTML = `<span class="shop-name">${pact.icon} ${pact.name}<small class="shop-stats">${pact.desc}</small></span>`;
      b.onclick = () => { g.applyPact(pact.id); this.closePanel(); };
      body.appendChild(b);
    }
    const cancel = document.createElement('button');
    cancel.className = 'quest-btn';
    cancel.textContent = 'Entrar sin pacto';
    cancel.onclick = () => this.closePanel();
    body.appendChild(cancel);
  }

  // panel de colección: sets, poderes legendarios y bestiario
  openCollection() {
    if (this.activePanel !== 'collection') {
      this.closePanel();
      this.activePanel = 'collection';
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
    if (p.quest) {
      const q = p.quest;
      const done = q.progress >= q.goal;
      body.innerHTML = `
        <p class="quest-desc">🎯 ${q.desc}</p>
        <div class="quest-bar"><div style="width:${Math.min(100, q.progress / q.goal * 100)}%"></div></div>
        <p class="quest-progress">${Math.min(q.progress, q.goal)} / ${q.goal}</p>
        <p class="dim">Recompensa: 🪙 ${q.reward.gold} · ✨ ${q.reward.xp} XP${q.reward.item ? ' · 🟡 objeto raro' : ''}</p>`;
      const b = document.createElement('button');
      b.className = 'quest-btn';
      b.textContent = done ? '🏆 Reclamar recompensa' : 'En progreso...';
      b.disabled = !done;
      b.onclick = () => g.claimQuest();
      body.appendChild(b);
    } else {
      const q = g.ensureQuestOffer();
      body.innerHTML = `
        <p class="dim">«Las profundidades están cada vez peor. ¿Me ayudas?»</p>
        <p class="quest-desc">🎯 ${q.desc}</p>
        <p class="dim">Recompensa: 🪙 ${q.reward.gold} · ✨ ${q.reward.xp} XP${q.reward.item ? ' · 🟡 objeto raro' : ''}</p>`;
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
    mk('🏘️ Pueblo', g.world.type === 'town', () => g.travelTo('town'));
    if (p.refugeUnlocked)
      mk('🏕️ Refugio del Abismo', g.world.type === 'refuge', () => g.travelTo('refuge'));
    for (const f of [...p.waypoints].sort((a, b) => a - b))
      mk(`🕳️ Piso ${f}`, g.world.type === 'dungeon' && g.world.floor === f, () => g.travelTo(f));
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
    return `<span class="cell-icon" style="text-shadow:0 0 6px ${r.color}">${item.icon}</span>` +
      `${item.fav ? '<span class="fav-star">⭐</span>' : ''}${sockets}`;
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
      div.className = `inv-cell equip-cell slot-${slot}` + (item ? ' rarity-' + item.rarity : '');
      div.innerHTML = item ? this.itemCellHTML(item) : `<span class="cell-hint">${label}</span>`;
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

    const invGrid = $('inv-grid');
    invGrid.innerHTML = '';
    for (let i = 0; i < 32; i++) {
      const item = p.inventory[i];
      const div = document.createElement('div');
      div.className = 'inv-cell' + (item ? ' rarity-' + item.rarity : '');
      div.innerHTML = this.itemCellHTML(item);
      this.bindCell(div, { zone: 'inv', key: i, item }, item ? () => this.itemPopup(item, { from: 'inv', index: i }) : null);
      invGrid.appendChild(div);
    }
    $('inv-gold').textContent = `🪙 ${p.gold} oro · arrastra para equipar, engarzar u ordenar`;
  }

  itemPopup(item, ctx) {
    const g = this.game;
    const p = g.player;
    const r = RARITIES[item.rarity];
    const pop = $('item-popup');
    const lines = itemStatLines(item).map(l => `<div class="stat-line">${l}</div>`).join('');
    const equipped = item.slot ? p.equipment[item.slot] : null;
    // comparación rápida ▲▼ contra lo equipado (lectura en un vistazo)
    let compare = '';
    if (ctx.from === 'inv' && equipped && equipped !== item) {
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
      compare = `<div class="compare"><em>Frente a: ${equipped.name}</em>${diffs.join('') || '<div class="diff dim">Sin diferencias</div>'}</div>`;
    }
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
    const nameTxt = item.unidentified ? `${item.icon} Objeto sin identificar` : `${item.icon} ${item.name}`;
    pop.innerHTML = `
      <div class="popup-name" style="color:${nameColor}">${nameTxt}</div>
      <div class="popup-sub">${item.unidentified ? '❓ ' + r.name : r.name}${SLOT_NAMES[item.slot] ? ' · ' + SLOT_NAMES[item.slot] : ''}${item.ilvl ? ' · Nv. ' + item.ilvl : ''}</div>
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
    // llave de grieta: abrir la grieta (endgame)
    if (item.kind === 'riftkey') {
      if (ctx.from === 'inv') {
        addBtn(`🌀 Abrir Grieta Nv ${item.riftLevel}`, () => g.useRiftKey(ctx.index), 'btn-good');
        addBtn('Tirar', () => g.dropItem(ctx.index), 'btn-bad');
      }
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
    if (item.sockets && (item.gems || []).length < item.sockets && p.inventory.some(i => i.kind === 'gem' || i.kind === 'rune')) {
      const b = document.createElement('button');
      b.textContent = 'Engarzar 💎';
      b.className = 'btn-good';
      b.onclick = () => this.gemChooser(item);
      btns.appendChild(b);
    }
    addBtn('Cerrar', () => {});
    pop.classList.remove('hidden');
  }

  gemChooser(item) {
    const g = this.game, p = g.player;
    const pop = $('item-popup');
    pop.innerHTML = `
      <div class="popup-name">💎 Elige una gema para:</div>
      <div class="popup-sub">${item.name} (${(item.gems || []).length}/${item.sockets} engarces)</div>
      <div class="popup-btns gem-list"></div>`;
    const btns = pop.querySelector('.popup-btns');
    p.inventory.forEach((gm, i) => {
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

  renderSkills() {
    const p = this.game.player;
    $('skill-points').textContent = p.skillPoints > 0 ? `Puntos disponibles: ${p.skillPoints}` : 'Sin puntos disponibles';
    const cont = $('skill-tree');
    cont.innerHTML = '';
    for (let tier = 1; tier <= 3; tier++) {
      const reqLvl = TIER_LEVELS[tier - 1];
      const unlocked = p.level >= reqLvl;
      const tierDiv = document.createElement('div');
      tierDiv.className = 'skill-tier' + (unlocked ? '' : ' locked');
      tierDiv.innerHTML = `<div class="tier-head">Tier ${tier} ${unlocked ? '' : `· requiere nivel ${reqLvl}`}</div>`;
      for (const sk of p.cls.skills.filter(s => s.tier === tier)) {
        const lvl = p.skills[sk.id] || 0;
        const div = document.createElement('div');
        div.className = 'skill-node' + (lvl > 0 ? ' learned' : '');
        const details = this.skillDetails(sk, Math.max(1, lvl));
        let synHTML = '';
        if (sk.synergies) {
          const txts = sk.synergies.map(sy => {
            const src = p.cls.skills.find(s => s.id === sy.from);
            return `+${sy.pct}% daño por punto en ${src ? src.name : sy.from}`;
          });
          const bonus = synergyBonus(sk, p.skills);
          synHTML = `<small class="sk-syn">🔗 ${txts.join(' · ')}${bonus > 0 ? ` <b>(actual +${bonus}%)</b>` : ''}</small>`;
        }
        div.innerHTML = `
          <span class="sk-big">${sk.icon}</span>
          <div class="sk-info">
            <strong>${sk.name} <em>${lvl}/${sk.max}</em></strong>
            <small>${sk.desc}</small>
            <small class="sk-nums">${details}</small>
            ${synHTML}
          </div>`;
        if (unlocked && p.skillPoints > 0 && lvl < sk.max) {
          const b = document.createElement('button');
          b.className = 'sk-plus';
          b.textContent = '+';
          b.onclick = () => { this.game.learnSkill(sk.id); this.renderSkills(); this.updateHUD(); };
          div.appendChild(b);
        }
        // selector de soporte: para habilidades activas aprendidas con soportes compatibles conocidos
        if (lvl > 0 && sk.type !== 'passive') {
          const compat = SUPPORTS.filter(s => s.types.includes(sk.type) && p.knownSupports.includes(s.id));
          if (compat.length) {
            const sel = document.createElement('select');
            sel.className = 'sk-support';
            sel.innerHTML = `<option value="">Sin soporte</option>` +
              compat.map(s => `<option value="${s.id}">${s.icon} ${s.name}</option>`).join('');
            sel.value = p.supports[sk.id] || '';
            sel.onchange = () => {
              if (sel.value) p.supports[sk.id] = sel.value; else delete p.supports[sk.id];
              this.game.save();
            };
            div.querySelector('.sk-info').appendChild(sel);
          }
        }
        tierDiv.appendChild(div);
      }
      cont.appendChild(tierDiv);
    }
    // respec de habilidades (sumidero de oro)
    if (Object.keys(p.skills).length) {
      const rb = document.createElement('button');
      rb.className = 'quest-btn';
      rb.textContent = `🔄 Redistribuir habilidades (${this.game.respecCost()} 🪙)`;
      rb.disabled = p.gold < this.game.respecCost();
      rb.onclick = () => { this.game.respecSkills(); this.renderSkills(); this.updateHUD(); };
      cont.appendChild(rb);
    }
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

  renderStats() {
    const p = this.game.player;
    $('stat-points').textContent = p.statPoints > 0 ? `Puntos disponibles: ${p.statPoints}` : 'Sin puntos disponibles';
    const cont = $('attr-list');
    cont.innerHTML = '';
    for (const key of ['fue', 'des', 'vit', 'ene']) {
      const row = document.createElement('div');
      row.className = 'attr-row';
      row.innerHTML = `<div><strong>${STAT_NAMES[key]}</strong>: ${p.attributes[key]}<br><small>${STAT_DESC[key]}</small></div>`;
      if (p.statPoints > 0) {
        const b = document.createElement('button');
        b.className = 'sk-plus';
        b.textContent = '+';
        b.onclick = () => { p.attributes[key]++; p.statPoints--; p.recompute(); this.renderStats(); this.updateHUD(); this.game.save(); };
        row.appendChild(b);
      }
      cont.appendChild(row);
    }
    // respec de atributos (sumidero de oro)
    if (p.level > 1) {
      const rb = document.createElement('button');
      rb.className = 'quest-btn';
      rb.textContent = `🔄 Redistribuir atributos (${this.game.respecCost()} 🪙)`;
      rb.disabled = p.gold < this.game.respecCost();
      rb.onclick = () => { this.game.respecAttributes(); this.renderStats(); this.updateHUD(); };
      cont.appendChild(rb);
    }

    // paragon (nivel 20+)
    const pg = $('paragon');
    if (p.level >= 20 || p.paragon.points > 0 || p.paragon.dmgPct + p.paragon.hp + p.paragon.arm + p.paragon.aspdPct > 0) {
      pg.style.display = '';
      pg.innerHTML = `<h4>🌟 Paragon</h4>
        <p class="points-txt">${p.paragon.points > 0 ? `Puntos disponibles: ${p.paragon.points}` : 'Sube de nivel (20+) para ganar puntos'}</p>`;
      const rows = [
        ['dmgPct', '⚔️ Daño', '+1% por punto'],
        ['hp', '❤️ Vida', '+8 por punto'],
        ['arm', '🛡️ Armadura', '+3 por punto'],
        ['aspdPct', '⚡ Vel. de ataque', '+0.5% por punto'],
        ['mf', '🍀 Hallazgo mágico', '+3% por punto'],
      ];
      for (const [key, name, desc] of rows) {
        const row = document.createElement('div');
        row.className = 'attr-row';
        row.innerHTML = `<div><strong>${name}</strong>: ${p.paragon[key]}<br><small>${desc}</small></div>`;
        if (p.paragon.points > 0) {
          const b = document.createElement('button');
          b.className = 'sk-plus';
          b.textContent = '+';
          b.onclick = () => { this.game.paragonAllocate(key); this.renderStats(); this.updateHUD(); };
          row.appendChild(b);
        }
        pg.appendChild(row);
      }
    } else pg.style.display = 'none';

    const s = p.stats;
    $('derived-stats').innerHTML = `
      <div>❤️ Vida: ${Math.ceil(p.hp)} / ${s.maxHP}</div>
      <div>💧 Maná: ${Math.ceil(p.mp)} / ${s.maxMP}</div>
      <div>⚔️ Daño: ${s.dmgMin} - ${s.dmgMax}</div>
      <div>🎯 Crítico: ${s.crit.toFixed(1)}%</div>
      <div>🛡️ Armadura: ${s.arm}</div>
      <div>👟 Velocidad: ${s.spd.toFixed(1)}</div>
      <div>🍀 Hallazgo mágico: ${s.mf || 0}%</div>
      ${s.cdr ? `<div>⏳ Reducción de enfriamiento: ${s.cdr}%</div>` : ''}
      ${s.lph ? `<div>🩸 Vida al golpear: ${s.lph}</div>` : ''}
      ${s.mph ? `<div>🔹 Maná al golpear: ${s.mph}</div>` : ''}
      ${s.thorns ? `<div>🌵 Espinas: ${s.thorns}</div>` : ''}
      <div>⭐ Nivel ${p.level} · XP ${p.xp}/${xpForLevel(p.level)}</div>`;

    const r = p.records;
    const h = Math.floor(r.playTime / 3600), m = Math.floor((r.playTime % 3600) / 60);
    $('records').innerHTML = `
      <div>💀 Monstruos: ${r.kills} (élites/campeones: ${r.eliteKills} · jefes: ${r.bossKills} · mímicos: ${r.mimics})</div>
      <div>🕳️ Piso más profundo: ${r.maxFloor}</div>
      <div>🟠 Legendarios encontrados: ${r.legendaries}</div>
      <div>🟢 Piezas de conjunto: ${r.setPieces || 0}</div>
      <div>📦 Cofres abiertos: ${r.chests}</div>
      <div>🪙 Oro recogido: ${r.goldEarned}</div>
      <div>🎯 Misiones completadas: ${r.quests || 0}</div>
      <div>🌟 Desafíos diarios: ${r.dailies || 0}</div>
      <div>🌀 Grieta máxima: Nivel ${r.maxRift || 0}</div>
      <div>⚰️ Muertes: ${r.deaths}</div>
      <div>⏱️ Tiempo jugado: ${h}h ${m}m</div>`;

    // tabla local del desafío diario
    const log = this.game.dailyLog || [];
    const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    $('daily-log').innerHTML = log.length
      ? log.map(e => `<div>${e.date} · ${CLASSES[e.cls]?.icon || ''} Nv ${e.level} · Piso ${e.floor} · ⏱️ ${fmt(e.time)}${e.hc ? ' ☠️' : ''}</div>`).join('')
      : '<div class="dim">Aún no has completado ningún Desafío Diario</div>';
  }

  renderShop() {
    const g = this.game, p = g.player;
    g.ensureShopStock();
    const cont = $('shop-items');
    cont.innerHTML = '';
    const offer = (html, price, fn) => {
      const b = document.createElement('button');
      b.className = 'shop-item';
      b.innerHTML = `<span class="shop-name">${html}</span><span class="shop-price">${price} 🪙</span>`;
      b.disabled = p.gold < price;
      b.onclick = () => { fn(); this.renderShop(); this.updateHUD(); };
      cont.appendChild(b);
    };
    offer('🧪 Poción de Vida', POTION_PRICES.hp, () => { p.gold -= POTION_PRICES.hp; p.potions.hp++; g.sfx('potion'); g.save(); });
    offer('🔷 Poción de Maná', POTION_PRICES.mp, () => { p.gold -= POTION_PRICES.mp; p.potions.mp++; g.sfx('potion'); g.save(); });
    if (!p.pet) {
      offer(`🐺 Lobo de caza <small class="shop-stats">Te sigue y ataca a tus enemigos. Compañero para siempre.</small>`,
        PET_PRICE, () => g.buyPet());
    }

    for (const it of g.shopStock.items) {
      const r = RARITIES[it.rarity];
      const stats = itemStatLines(it).join(' · ');
      offer(
        `<span style="color:${r.color}">${it.icon} ${it.name}</span>
         <small class="shop-stats">${SLOT_NAMES[it.slot]} Nv.${it.ilvl} · ${stats}</small>`,
        it.price,
        () => g.buyShopItem(it.uid)
      );
    }
    // apuesta: objetos sin identificar, puede tocar legendario
    const head = document.createElement('h4');
    head.textContent = '🎲 Apuesta — objetos sin identificar';
    cont.appendChild(head);
    for (const ofr of g.shopStock.gamble) {
      offer(
        `❓ ${SLOT_NAMES[ofr.slot]} misterioso
         <small class="shop-stats">Mínimo mágico... ¿quizá legendario?</small>`,
        ofr.price,
        () => g.buyGambleItem(ofr.uid)
      );
    }
    this.updateShopTimer();
    $('shop-gold').textContent = `Tu oro: 🪙 ${p.gold} · Vende objetos desde el inventario`;
  }

  updateShopTimer() {
    const stock = this.game.shopStock;
    if (!stock) return;
    const s = Math.max(0, Math.ceil((stock.until - Date.now()) / 1000));
    $('shop-timer').textContent = `⏳ Nueva mercancía en ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  showDeath(hardcore = false) {
    this.deathHardcore = hardcore;
    $('death-text').textContent = hardcore
      ? '☠️ Modo Hardcore: tu héroe ha caído para siempre y su historia termina aquí.'
      : 'Las profundidades reclaman otra alma...';
    $('btn-respawn').textContent = hardcore ? 'Crear un nuevo héroe' : 'Despertar en el Pueblo';
    $('death-screen').classList.remove('hidden');
  }
  hideDeath() { $('death-screen').classList.add('hidden'); }

  // ---------- minimapa ----------
  initMinimap(world) {
    const base = document.createElement('canvas');
    const g = world.grid;
    base.width = g.w * 3; base.height = g.h * 3;
    const ctx = base.getContext('2d');
    const palette = { town: ['#2e4020', '#4e6a38'], refuge: ['#14102a', '#3a3055'] };
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

  drawMinimap() {
    const cv = $('minimap');
    if (!this.minimapBase) return;
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.drawImage(this.minimapBase, 0, 0, cv.width, cv.height);
    const g = this.minimapGrid;
    const sx = cv.width / g.w, sz = cv.height / g.h;
    const dot = (pos, color, r) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc((pos.x - g.ox) * sx, (pos.z - g.oz) * sz, r, 0, Math.PI * 2);
      ctx.fill();
    };
    for (const it of this.game.world.interactables)
      if (it.type.startsWith('portal')) dot(it.pos, it.type === 'portal_next' ? '#ff5577' : '#55aaff', 3);
    for (const e of this.game.enemies)
      if (e.alive) dot(e.pos, e.def.boss ? '#ff2200' : '#cc4444', 2);
    if (this.game.player) dot(this.game.player.pos, '#ffffff', 3);
  }
}
