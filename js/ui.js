// ============================================================
// Interfaz: HUD, inventario, árbol de habilidades, paneles
// ============================================================
import * as THREE from 'three';
import { CLASSES, STAT_NAMES, STAT_DESC, TIER_LEVELS, skillVal, synergyBonus, xpForLevel, POTION_PRICES } from './data.js';
import { RARITIES, SLOT_NAMES, SETS, itemStatLines, statText } from './items.js';

const $ = (id) => document.getElementById(id);

export class UI {
  constructor(game) {
    this.game = game;
    this.floats = [];
    this.labelMap = new Map();
    this._v = new THREE.Vector3();
    this.activePanel = null;
    this.bindHUD();
  }

  bindHUD() {
    const g = this.game;
    $('btn-pot-hp').addEventListener('pointerdown', e => { e.preventDefault(); g.player?.usePotion('hp'); this.updateHUD(); });
    $('btn-pot-mp').addEventListener('pointerdown', e => { e.preventDefault(); g.player?.usePotion('mp'); this.updateHUD(); });
    $('btn-attack').addEventListener('pointerdown', e => { e.preventDefault(); g.attackNearest(); });
    $('btn-inv').addEventListener('click', () => this.togglePanel('inv'));
    $('btn-skills').addEventListener('click', () => this.togglePanel('skills'));
    $('btn-stats').addEventListener('click', () => this.togglePanel('stats'));
    $('btn-shop').addEventListener('click', () => this.togglePanel('shop'));
    document.querySelectorAll('.panel-close').forEach(b => b.addEventListener('click', () => this.closePanel()));
    $('btn-respawn').addEventListener('click', () => g.respawn());
  }

  // ---------- selección de clase ----------
  showClassSelect(hasSave, onPick) {
    const el = $('class-select');
    el.classList.remove('hidden');
    const cont = $('class-cards');
    cont.innerHTML = '';
    if (hasSave) {
      const btn = document.createElement('button');
      btn.className = 'btn-continue';
      btn.textContent = '▶️ Continuar partida guardada';
      btn.onclick = () => { el.classList.add('hidden'); onPick('continue'); };
      cont.appendChild(btn);
    }
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
      card.querySelector('button').onclick = () => { el.classList.add('hidden'); onPick(cls.id); };
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
    $('hud-level').textContent = `Nv ${p.level}`;
    $('hud-gold').textContent = `🪙 ${p.gold}`;
    $('hud-zone').textContent = this.game.world?.type === 'town' ? '🏘️ Pueblo' : `🕳️ Piso ${this.game.world.floor}`;
    $('pot-hp-count').textContent = p.potions.hp;
    $('pot-mp-count').textContent = p.potions.mp;

    const badge = (id, n) => { const b = $(id); b.style.display = n > 0 ? 'flex' : 'none'; b.textContent = n; };
    badge('badge-stats', p.statPoints);
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
    for (const f of [...p.waypoints].sort((a, b) => a - b))
      mk(`🕳️ Piso ${f}`, g.world.type === 'dungeon' && g.world.floor === f, () => g.travelTo(f));
  }

  itemCellHTML(item) {
    if (!item) return '';
    const r = RARITIES[item.rarity];
    return `<span class="cell-icon" style="text-shadow:0 0 6px ${r.color}">${item.icon}</span>`;
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
      if (item) div.onclick = () => this.itemPopup(item, { from: 'equip', slot });
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
      if (item) {
        div.title = 'Devolver al inventario';
        div.onclick = () => { g.cubeReturn(i); this.renderInventory(); };
      }
      cubeRow.appendChild(div);
    }
    const tb = document.createElement('button');
    tb.id = 'btn-transmute';
    tb.textContent = '✨ Transmutar';
    tb.disabled = p.cube.length !== 3;
    tb.onclick = () => g.transmute();
    cubeRow.appendChild(tb);

    const invGrid = $('inv-grid');
    invGrid.innerHTML = '';
    for (let i = 0; i < 32; i++) {
      const item = p.inventory[i];
      const div = document.createElement('div');
      div.className = 'inv-cell' + (item ? ' rarity-' + item.rarity : '');
      div.innerHTML = this.itemCellHTML(item);
      if (item) div.onclick = () => this.itemPopup(item, { from: 'inv', index: i });
      invGrid.appendChild(div);
    }
    $('inv-gold').textContent = `🪙 ${p.gold} oro`;
  }

  itemPopup(item, ctx) {
    const g = this.game;
    const p = g.player;
    const r = RARITIES[item.rarity];
    const pop = $('item-popup');
    const lines = itemStatLines(item).map(l => `<div class="stat-line">${l}</div>`).join('');
    const equipped = item.slot ? p.equipment[item.slot] : null;
    let compare = '';
    if (ctx.from === 'inv' && equipped && equipped !== item) {
      compare = `<div class="compare"><em>Equipado: ${equipped.name}</em>${itemStatLines(equipped).map(l => `<div class="stat-line dim">${l}</div>`).join('')}</div>`;
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
    pop.innerHTML = `
      <div class="popup-name" style="color:${r.color}">${item.icon} ${item.name}</div>
      <div class="popup-sub">${r.name} · ${SLOT_NAMES[item.slot] || ''} · Nv. ${item.ilvl}</div>
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
    if (ctx.from === 'inv') {
      addBtn('Equipar', () => g.equipItem(ctx.index), 'btn-good');
      addBtn(`Vender (${item.value} 🪙)`, () => g.sellItem(ctx.index));
      if (p.cube.length < 3 && item.rarity !== 'legendario' && item.rarity !== 'conjunto')
        addBtn('Al cubo 🧪', () => g.addToCube(ctx.index));
      addBtn('Tirar', () => g.dropItem(ctx.index), 'btn-bad');
    } else if (ctx.from === 'equip') {
      addBtn('Desequipar', () => g.unequipItem(ctx.slot));
    }
    addBtn('Cerrar', () => {});
    pop.classList.remove('hidden');
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
        tierDiv.appendChild(div);
      }
      cont.appendChild(tierDiv);
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
    const s = p.stats;
    $('derived-stats').innerHTML = `
      <div>❤️ Vida: ${Math.ceil(p.hp)} / ${s.maxHP}</div>
      <div>💧 Maná: ${Math.ceil(p.mp)} / ${s.maxMP}</div>
      <div>⚔️ Daño: ${s.dmgMin} - ${s.dmgMax}</div>
      <div>🎯 Crítico: ${s.crit.toFixed(1)}%</div>
      <div>🛡️ Armadura: ${s.arm}</div>
      <div>👟 Velocidad: ${s.spd.toFixed(1)}</div>
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
      <div>⚰️ Muertes: ${r.deaths}</div>
      <div>⏱️ Tiempo jugado: ${h}h ${m}m</div>`;
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

  showDeath() { $('death-screen').classList.remove('hidden'); }
  hideDeath() { $('death-screen').classList.add('hidden'); }

  // ---------- minimapa ----------
  initMinimap(world) {
    const base = document.createElement('canvas');
    const g = world.grid;
    base.width = g.w * 3; base.height = g.h * 3;
    const ctx = base.getContext('2d');
    ctx.fillStyle = world.type === 'town' ? '#2e4020' : '#0a0a10';
    ctx.fillRect(0, 0, base.width, base.height);
    ctx.fillStyle = world.type === 'town' ? '#4e6a38' : '#3c3a48';
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
