// ============================================================
// Entidades: jugador, enemigos y proyectiles
// ============================================================
import * as THREE from 'three';
import { CLASSES, skillVal, xpForLevel, PARAGON_BOARD } from './data.js';
import { SETS } from './items.js';

function rand(min, max) { return min + Math.random() * (max - min); }

// Esquiva: duración corta y pico de velocidad alto con ease-out (recorre ~3.4u)
const DASH_DUR = 0.26;
const DASH_PEAK = 26;

// Mueve una posición con colisión contra la cuadrícula (por ejes)
export function moveWithCollision(grid, pos, dx, dz, r = 0.32) {
  if (dx !== 0 && grid.walkable(pos.x + dx, pos.z, r)) pos.x += dx;
  if (dz !== 0 && grid.walkable(pos.x, pos.z + dz, r)) pos.z += dz;
}

// ------------------------------------------------------------
// Modelos low-poly procedurales
// ------------------------------------------------------------
function std(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: opts.rough ?? 0.85, metalness: opts.metal ?? 0.05, emissive: opts.emissive ?? 0x000000, emissiveIntensity: opts.ei ?? 1 });
}

export function makePlayerModel(cls, tint = null) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.55, 6, 12), std(tint ?? cls.color));
  body.position.y = 0.75;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 12), std(0xd9a878));
  head.position.y = 1.45;
  body.castShadow = head.castShadow = true;
  g.add(body, head);

  const hand = new THREE.Group();
  hand.position.set(0.38, 0.95, 0.1);
  g.add(hand);

  if (cls.id === 'guerrero') {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.95, 0.16), std(0xc8ccd4, { metal: 0.7, rough: 0.35 }));
    blade.position.y = 0.45;
    const hilt = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 0.08), std(0x7a5a2a));
    blade.castShadow = true;
    hand.add(blade, hilt);
    const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.07, 12), std(0x8a6a3a));
    shield.rotation.z = Math.PI / 2;
    shield.position.set(-0.42, 0.9, 0.1);
    g.add(shield);
  } else if (cls.id === 'maga') {
    const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 1.5, 7), std(0x5a4028));
    staff.position.y = 0.3;
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), std(0x66ccff, { emissive: 0x3399ff, ei: 1.8 }));
    orb.position.y = 1.08;
    hand.add(staff, orb);
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.55, 10), std(0x2a4ba6));
    hat.position.y = 1.78;
    g.add(hat);
  } else {
    // arquera: arco
    const bow = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.035, 6, 14, Math.PI), std(0x6e4a22));
    bow.rotation.z = -Math.PI / 2;
    bow.position.y = 0.3;
    hand.add(bow);
    const hood = new THREE.Mesh(new THREE.ConeGeometry(0.27, 0.4, 10), std(0x2e5e30));
    hood.position.y = 1.66;
    g.add(hood);
  }
  g.userData.hand = hand;
  g.userData.body = body;
  return g;
}

export function makeEnemyModel(def) {
  const g = new THREE.Group();
  const s = def.scale || 1;
  const mat = std(def.color);
  let bodyH = 0.75;
  if (def.shape === 'rat') {
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 8), mat);
    body.scale.set(1.3, 0.7, 0.9);
    body.position.y = 0.3;
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.06, 0.7, 5), std(0xc09a90));
    tail.rotation.x = Math.PI / 2.3;
    tail.position.set(0, 0.25, -0.6);
    body.castShadow = true;
    g.add(body, tail);
    bodyH = 0.45;
  } else if (def.shape === 'golem') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.0, 0.55), mat);
    body.position.y = 0.85;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.4, 0.4), mat.clone());
    head.position.y = 1.55;
    for (const sx of [-0.55, 0.55]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.9, 0.3), mat.clone());
      arm.position.set(sx, 0.85, 0);
      g.add(arm);
    }
    body.castShadow = head.castShadow = true;
    g.add(body, head);
    bodyH = 1.0;
  } else if (def.shape === 'demon') {
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.36, 0.6, 6, 10), mat);
    body.position.y = 0.8;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), mat.clone());
    head.position.y = 1.5;
    for (const sx of [-0.16, 0.16]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.3, 6), std(0x222222));
      horn.position.set(sx, 1.78, 0);
      g.add(horn);
    }
    body.castShadow = true;
    g.add(body, head);
    bodyH = 0.9;
  } else if (def.shape === 'mimic') {
    // cofre con dientes
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.6), mat);
    body.position.y = 0.3;
    const lid = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.16, 0.62),
      std(0xc9a227, { metal: 0.4, rough: 0.5 }));
    lid.position.set(0, 0.66, -0.2);
    lid.rotation.x = -0.7;
    for (const sx of [-0.25, 0, 0.25]) {
      const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 4), std(0xf0ead8));
      tooth.position.set(sx, 0.5, 0.26);
      tooth.rotation.x = Math.PI;
      g.add(tooth);
    }
    body.castShadow = true;
    g.add(body, lid);
    bodyH = 0.7;
  } else {
    // humanoide
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.5, 6, 10), mat);
    body.position.y = 0.72;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), mat.clone());
    head.position.y = 1.32;
    body.castShadow = true;
    g.add(body, head);
  }
  // ojos brillantes
  let eyeY = 1.34, eyeZ = 0.2;
  if (def.shape === 'rat') { eyeY = 0.4; eyeZ = 0.45; }
  else if (def.shape === 'golem') { eyeY = 1.58; }
  else if (def.shape === 'mimic') { eyeY = 0.52; eyeZ = 0.33; }
  for (const sx of [-0.09, 0.09]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6),
      new THREE.MeshBasicMaterial({ color: def.boss ? 0xff2200 : 0xffcc00 }));
    eye.position.set(sx, eyeY, eyeZ);
    g.add(eye);
  }
  g.scale.setScalar(s);

  // barra de vida
  const bar = new THREE.Group();
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.1), new THREE.MeshBasicMaterial({ color: 0x111111, depthTest: false, transparent: true, opacity: 0.8 }));
  const fg = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.07), new THREE.MeshBasicMaterial({ color: 0xdd2222, depthTest: false }));
  fg.position.z = 0.001;
  bg.renderOrder = fg.renderOrder = 999;
  bar.add(bg, fg);
  bar.position.y = (bodyH + 1.05) * s;
  bar.visible = false;
  g.add(bar);
  g.userData.bar = bar;
  g.userData.barFg = fg;
  return g;
}

// ------------------------------------------------------------
// JUGADOR
// ------------------------------------------------------------
export class Player {
  constructor(game, classId, saved = null, opts = {}) {
    this.game = game;
    this.cls = CLASSES[classId];
    this.classId = classId;

    this.level = 1;
    this.xp = 0;
    this.attributes = { ...this.cls.base };
    this.statPoints = 0;
    this.skillPoints = 1;
    this.skills = {};           // id -> nivel
    this.gold = 50;
    this.potions = { hp: 3, mp: 2 };
    this.inventory = [];        // máx 32
    this.equipment = {
      weapon: null, offhand: null, helm: null, shoulders: null, chest: null,
      gloves: null, belt: null, pants: null, boots: null, amulet: null, ring: null, ring2: null,
    };
    this.lastFloor = 1;

    if (saved) Object.assign(this, saved, { game: this.game, cls: this.cls });

    // valores por defecto compatibles con guardados antiguos
    this.equipment = {
      weapon: null, offhand: null, helm: null, shoulders: null, chest: null,
      gloves: null, belt: null, pants: null, boots: null, amulet: null, ring: null, ring2: null,
      ...(this.equipment || {}),
    };
    this.waypoints = Array.isArray(this.waypoints) ? this.waypoints : [];
    this.cube = Array.isArray(this.cube) ? this.cube : [];
    this.quest = this.quest || null;
    this.supports = this.supports || {};               // habilidad → soportes asignados (array, máx 2)
    // retrocompat: saves viejos guardaban 1 soporte como string; lo convertimos a [string]
    for (const k of Object.keys(this.supports)) {
      const v = this.supports[k];
      if (typeof v === 'string') this.supports[k] = v ? [v] : [];
      else if (!Array.isArray(v)) this.supports[k] = [];
    }
    this.knownSupports = Array.isArray(this.knownSupports) ? this.knownSupports : []; // soportes aprendidos
    this.hardcore = !!this.hardcore;
    this.pet = this.pet || null;
    this.dailyDone = this.dailyDone || null;
    this.tips = this.tips || {};
    this.refugeUnlocked = !!this.refugeUnlocked;
    // personalización del héroe: nombre y tinte del cuerpo (opts en personajes
    // nuevos; el guardado tiene prioridad para los ya creados)
    this.heroName = this.heroName || opts.name || this.cls.name;
    this.tint = this.tint ?? (opts.tint ?? null);
    // endgame: dificultad seleccionada (Tormento) y Códice de Aspectos
    this.torment = this.torment || 0;
    this.codex = this.codex || {};
    // bendiciones permanentes (una por categoría), ganadas en grietas
    this.blessings = this.blessings || {};
    // registro de colección: sets vistos, poderes legendarios, bestiario
    this.discovered = { sets: {}, powers: {}, bestiary: {}, ...(this.discovered || {}) };
    // Paragon: tablero de nodos. Migra saves antiguos (formato plano) reembolsando
    // todos los puntos ganados (level-20) al tablero vacío.
    if (this.paragon && this.paragon.nodes) {
      this.paragon.points = this.paragon.points || 0;
      this.paragon.nodes = this.paragon.nodes || {};
      this.paragon.glyphs = this.paragon.glyphs || {};
    } else {
      this.paragon = { points: Math.max(0, (this.level || 1) - 20), nodes: {}, glyphs: {} };
    }
    this.records = {
      kills: 0, eliteKills: 0, bossKills: 0, mimics: 0, deaths: 0,
      maxFloor: 1, legendaries: 0, setPieces: 0, goldEarned: 0, chests: 0, playTime: 0,
      quests: 0, dailies: 0, maxRift: 0,
      ...(this.records || {}),
    };

    this.buffs = [];
    this.cds = {};
    this.atkCd = 0;
    this.slowT = 0;
    this.dodgeT = 0;
    this.dodgeCd = 0;
    this.dodgeDir = { x: 0, z: 1 };
    this.xpBoostT = 0;
    this.moveTarget = null;
    this.attackTarget = null;
    this.pickTarget = null;
    this.swing = 0;
    this.alive = true;
    this.healCd = 0;

    this.group = makePlayerModel(this.cls, this.tint);
    this.recompute();
    this.hp = this.stats.maxHP;
    this.mp = this.stats.maxMP;
    if (saved && saved.hp != null) { this.hp = Math.min(saved.hp, this.stats.maxHP); this.mp = Math.min(saved.mp, this.stats.maxMP); }
  }

  get pos() { return this.group.position; }

  // estadísticas derivadas de atributos + equipo + buffs + pasivas
  recompute() {
    const a = { ...this.attributes };
    const item = { hp: 0, mp: 0, dmgPct: 0, crit: 0, arm: 0, spdPct: 0, aspdPct: 0, mf: 0,
                   lph: 0, mph: 0, cdr: 0, thorns: 0 };

    const addStats = (src) => {
      for (const [k, v] of Object.entries(src)) {
        if (k in a) a[k] += v; else if (k in item) item[k] += v;
      }
    };

    // amuletos de mochila (charms): otorgan stats sin equiparse
    for (const it of this.inventory || []) {
      if (it && it.kind === 'charm') addStats(it.affixes || {});
    }

    const setCounts = {};
    this.powers = new Set();
    for (const it of Object.values(this.equipment)) {
      if (!it || it.unidentified) continue; // sin identificar no da nada
      // calidad (masterworking): escala armadura y afijos del objeto
      const q = 1 + (it.quality || 0) * 0.06;
      if (it.arm) item.arm += Math.round(it.arm * q);
      if (q !== 1) { const scaled = {}; for (const [k, v] of Object.entries(it.affixes || {})) scaled[k] = Math.round(v * q); addStats(scaled); }
      else addStats(it.affixes || {});
      for (const gm of it.gems || []) addStats(gm.stats); // gemas y runas engarzadas
      if (it.runeword) addStats(it.runeword.stats);       // bonus de palabra rúnica
      if (it.setId) setCounts[it.setId] = (setCounts[it.setId] || 0) + 1;
      if (it.power) this.powers.add(it.power.id);          // poderes únicos de legendarios/reliquias
      if (it.power2) this.powers.add(it.power2.id);        // míticos: segundo poder
    }
    if (this.powers.has('avaricia')) item.mf += 30;
    // paragon: tablero de nodos (los nodos legendarios otorgan poderes)
    const pnodes = this.paragon?.nodes || {};
    for (const node of PARAGON_BOARD) {
      if (node.type !== 'start' && !pnodes[node.id]) continue;
      if (node.stats) addStats(node.stats);
      if (node.power) this.powers.add(node.power);
    }
    // glifos engarzados: valor por rango + bonus por nodos activos adyacentes
    const glyphs = this.paragon?.glyphs || {};
    for (const [nodeId, gl] of Object.entries(glyphs)) {
      if (!pnodes[nodeId]) continue; // solo si el engarce está activo
      const node = PARAGON_BOARD.find(n => n.id === nodeId);
      if (!node) continue;
      const adj = PARAGON_BOARD.filter(o => Math.abs(o.x - node.x) + Math.abs(o.y - node.y) === 1 && (o.type === 'start' || pnodes[o.id])).length;
      addStats({ [gl.stat]: gl.rank * gl.per + adj * gl.adj });
    }
    // bonus de conjunto por número de piezas equipadas
    for (const [sid, n] of Object.entries(setCounts)) {
      const set = SETS.find(s => s.id === sid);
      if (!set) continue;
      for (const [need, stats] of Object.entries(set.bonuses))
        if (n >= Number(need)) addStats(stats);
    }
    for (const b of this.buffs) addStats(b.stats);
    // bendiciones permanentes del endgame (una por categoría)
    for (const bl of Object.values(this.blessings || {})) addStats({ [bl.stat]: bl.value });
    // pasivas
    for (const sk of this.cls.skills) {
      const lvl = this.skills[sk.id];
      if (lvl && sk.type === 'passive') {
        for (const [k, arr] of Object.entries(sk.passive)) {
          const v = Math.round(skillVal(arr, lvl));
          if (k in a) a[k] += v; else if (k in item) item[k] += v;
        }
      }
    }

    const c = this.cls;
    const w = this.equipment.weapon;
    const wq = w ? 1 + (w.quality || 0) * 0.06 : 1; // calidad del arma
    const wDmg = w ? [w.dmg[0] * wq, w.dmg[1] * wq] : c.fists;
    const main = a[c.mainStat];

    this.stats = {
      ...a,
      maxHP: Math.round(c.baseHP + a.vit * c.hpPerVit + item.hp + (this.level - 1) * 4),
      maxMP: Math.round(c.baseMP + a.ene * c.mpPerEne + item.mp + (this.level - 1) * 2),
      dmgMin: Math.max(1, Math.round(wDmg[0] * (1 + main * 0.012) * (1 + item.dmgPct / 100))),
      dmgMax: Math.max(2, Math.round(wDmg[1] * (1 + main * 0.012) * (1 + item.dmgPct / 100))),
      crit: Math.min(75, 5 + a.des * 0.15 + item.crit),
      arm: Math.round(item.arm + a.des * 0.3),
      spd: 4.3 * (1 + item.spdPct / 100),
      atkTime: c.atkTime / (1 + item.aspdPct / 100),
      mf: Math.round(item.mf),
      lph: item.lph, mph: item.mph, thorns: item.thorns,
      cdr: Math.min(50, item.cdr), // tope de reducción de enfriamiento
    };
    if (this.hp != null) {
      this.hp = Math.min(this.hp, this.stats.maxHP);
      this.mp = Math.min(this.mp, this.stats.maxMP);
    }
  }

  // registra en la colección un objeto identificado/recogido
  discover(item) {
    if (!item) return;
    if (item.setId) (this.discovered.sets[item.setId] ||= {})[item.slot] = true;
    if (item.power) this.discovered.powers[item.power.id] = true;
    if (item.power2) this.discovered.powers[item.power2.id] = true;
  }

  // vida/maná al golpear (se llama cuando el jugador daña a un enemigo)
  onDealHit() {
    if (this.stats.lph) this.hp = Math.min(this.stats.maxHP, this.hp + this.stats.lph);
    if (this.stats.mph) this.mp = Math.min(this.stats.maxMP, this.mp + this.stats.mph);
  }

  rollDamage(mult = 1, critBonus = 0) {
    let dmg = rand(this.stats.dmgMin, this.stats.dmgMax) * mult;
    const crit = Math.random() * 100 < this.stats.crit + critBonus;
    if (crit) dmg *= 1.8;
    // poder 'furia': más daño con la vida alta
    if (this.powers?.has('furia') && this.hp > this.stats.maxHP * 0.8) dmg *= 1.25;
    return { dmg: Math.max(1, Math.round(dmg)), crit };
  }

  // meta opcional: { name, icon, desc } para que la UI muestre el efecto.
  // Guardamos `dur` (total) además de `t` (restante) para poder calcular progreso.
  addBuff(id, stats, dur, meta = {}) {
    this.buffs = this.buffs.filter(b => b.id !== id);
    this.buffs.push({
      id, stats, t: dur, dur,
      name: meta.name, icon: meta.icon, desc: meta.desc,
    });
    this.recompute();
  }

  // Descripción legible por defecto a partir de los stats de un buff
  _buffStatsDesc(stats) {
    if (!stats) return '';
    const LABELS = {
      dmgPct: '% daño', crit: '% crítico', arm: ' armadura', spdPct: '% vel. mov.',
      aspdPct: '% vel. ataque', mf: '% hallazgo mágico', hp: ' vida', mp: ' maná',
      lph: ' vida al golpear', mph: ' maná al golpear', cdr: '% enfriamiento', thorns: ' espinas',
    };
    return Object.entries(stats)
      .map(([k, v]) => `+${v}${LABELS[k] || ' ' + k}`)
      .join(', ');
  }

  // CONTRATO UI: devuelve TODOS los efectos temporales activos, normalizados.
  // Cada uno: { id, name, icon, remaining, total, desc } (segundos).
  // Nunca lanza: si no hay efectos devuelve [].
  activeBuffs() {
    const out = [];
    try {
      // 1) buffs de habilidades/altares con stats
      for (const b of this.buffs || []) {
        if (!b || b.t <= 0) continue;
        out.push({
          id: b.id,
          name: b.name || 'Bendición',
          icon: b.icon || '✨',
          remaining: Math.max(0, b.t),
          total: b.dur || b.t,
          desc: b.desc || this._buffStatsDesc(b.stats),
        });
      }
      // 2) santuario de experiencia (temporizador suelto, no es un buff con stats)
      if (this.xpBoostT > 0) {
        out.push({
          id: 'xp_boost', name: 'Bendición de Experiencia', icon: '✨',
          remaining: this.xpBoostT, total: this._xpBoostTotal || 60,
          desc: '+50% experiencia',
        });
      }
      // 3) ralentización del jugador (telaraña/escarcha/congelación)
      if (this.slowT > 0) {
        out.push({
          id: 'slow', name: 'Ralentizado', icon: '❄️',
          remaining: this.slowT, total: this._slowTotal || this.slowT,
          desc: '-45% velocidad de movimiento',
        });
      }
      // 4) invulnerabilidad de esquiva (si está activa)
      if (this.dodgeT > 0) {
        out.push({
          id: 'dodge', name: 'Esquiva', icon: '💨',
          remaining: this.dodgeT, total: DASH_DUR,
          desc: 'Invulnerable mientras dura',
        });
      }
    } catch { /* nunca lanzar: la UI debe poder llamarlo siempre */ }
    return out;
  }

  // esquiva: impulso rápido con invulnerabilidad breve
  dodge() {
    if (!this.alive || this.dodgeCd > 0 || this.dodgeT > 0) return;
    const g = this.game;
    const dir = g.input.joyDir || g.input.keyDir;
    let dx, dz;
    if (dir) { const l = Math.hypot(dir.x, dir.z) || 1; dx = dir.x / l; dz = dir.z / l; }
    else { dx = Math.sin(this.group.rotation.y); dz = Math.cos(this.group.rotation.y); }
    this.dodgeDir = { x: dx, z: dz };
    this.dodgeT = DASH_DUR;
    this.dodgeCd = this.dodgeCdMax = this.powers?.has('agil') ? 1.8 : 3; // poder 'agil': recarga más rápida
    this.dashTrail = 0;
    this.moveTarget = this.attackTarget = this.pickTarget = null;
    this.group.rotation.y = Math.atan2(dx, dz);
    g.sfx('dash');
    g.vibrate(20);
  }

  gainXP(amount) {
    if (this.xpBoostT > 0) amount = Math.round(amount * 1.5);
    this.xp += amount;
    this.game.ui.spawnText(this.pos, `+${amount} XP`, 'txt-xp');
    while (this.xp >= xpForLevel(this.level)) {
      this.xp -= xpForLevel(this.level);
      this.level++;
      if (this.level > 20) {
        // tras el nivel 20: puntos Paragon en lugar de atributos/habilidades
        this.paragon.points++;
        this.game.ui.message(`🌟 ¡Nivel ${this.level}! +1 punto Paragon (panel de Personaje)`);
      } else {
        this.statPoints += 5;
        this.skillPoints += 1;
        this.game.ui.message(`⭐ ¡Nivel ${this.level}! +5 atributos, +1 punto de habilidad`);
      }
      this.recompute();
      this.hp = this.stats.maxHP;
      this.mp = this.stats.maxMP;
      this.game.sfx('levelup');
      this.game.vibrate([50, 30, 70]);
      this.game.spawnBurst(this.pos, 0xffd24a, 14);
      this.game.tip('subir', 'Reparte tus puntos: Personaje (C / 🧍) y Habilidades (T / 📖)');
    }
  }

  takeDamage(amount, attackerLevel = 1) {
    if (!this.alive) return;
    if (this.dodgeT > 0) {
      // invulnerable durante la esquiva
      this.game.ui.spawnText(this.pos, '¡Esquivado!', 'txt-heal');
      return;
    }
    const red = this.stats.arm / (this.stats.arm + 60 + 16 * attackerLevel);
    const dmg = Math.max(1, Math.round(amount * (1 - Math.min(0.75, red))));
    this.hp -= dmg;
    // espinas: refleja daño al atacante cuerpo a cuerpo más cercano
    if (this.stats.thorns) {
      const e = this.game.nearestEnemy(2.6);
      if (e) e.takeDamage(this.stats.thorns, false);
    }
    this.game.ui.spawnText(this.pos, `-${dmg}`, 'txt-dmg-player');
    this.game.ui.flashDamage();
    this.game.addShake(0.15 + Math.min(0.25, dmg / this.stats.maxHP), 0.22);
    this.game.vibrate(35);
    this.game.sfx('hurt');
    this.game.tip('pocion', 'Si tu vida baja, bebe una poción: tecla Q o el botón 🧪');
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      this.game.onPlayerDeath();
    }
  }

  usePotion(pot) {
    if (this.potions[pot] <= 0) { this.game.ui.message('No te quedan pociones'); return; }
    if (pot === 'hp') {
      if (this.hp >= this.stats.maxHP) return;
      this.hp = Math.min(this.stats.maxHP, this.hp + Math.round(this.stats.maxHP * 0.4));
      this.game.ui.spawnText(this.pos, '+Vida', 'txt-heal');
    } else {
      if (this.mp >= this.stats.maxMP) return;
      this.mp = Math.min(this.stats.maxMP, this.mp + Math.round(this.stats.maxMP * 0.45));
      this.game.ui.spawnText(this.pos, '+Maná', 'txt-mana');
    }
    this.potions[pot]--;
    this.game.sfx('potion');
  }

  faceToward(target) {
    const dx = target.x - this.pos.x, dz = target.z - this.pos.z;
    if (dx * dx + dz * dz > 0.0001) this.group.rotation.y = Math.atan2(dx, dz);
  }

  update(dt) {
    if (!this.alive) return;
    const g = this.game;

    // buffs
    let expired = false;
    for (const b of this.buffs) { b.t -= dt; if (b.t <= 0) expired = true; }
    if (expired) { this.buffs = this.buffs.filter(b => b.t > 0); this.recompute(); }

    // cooldowns y regeneración
    this.atkCd = Math.max(0, this.atkCd - dt);
    this.dodgeCd = Math.max(0, this.dodgeCd - dt);
    if (this.xpBoostT > 0) this.xpBoostT -= dt;
    for (const k in this.cds) this.cds[k] = Math.max(0, this.cds[k] - dt);
    this.mp = Math.min(this.stats.maxMP, this.mp + (1 + this.stats.ene * 0.05) * dt);
    this.hp = Math.min(this.stats.maxHP, this.hp + (0.4 + this.stats.vit * 0.02) * dt);

    // ---- movimiento ----
    let dir = null;
    const joy = g.input.joyDir;
    const key = g.input.keyDir;
    if (joy) { dir = joy; this.moveTarget = this.attackTarget = this.pickTarget = null; }
    else if (key) { dir = key; this.moveTarget = this.attackTarget = this.pickTarget = null; }

    if (!dir && this.attackTarget) {
      const t = this.attackTarget;
      if (!t.alive) { this.attackTarget = null; }
      else {
        const d = this.pos.distanceTo(t.pos);
        if (d <= this.cls.atkRange) {
          this.faceToward(t.pos);
          if (this.atkCd <= 0) this.basicAttack(t);
        } else {
          dir = { x: t.pos.x - this.pos.x, z: t.pos.z - this.pos.z };
        }
      }
    }
    if (!dir && this.pickTarget) {
      const p = this.pickTarget;
      const d = this.pos.distanceTo(p.mesh.position);
      if (d < 1.0) { g.pickupGroundItem(p); this.pickTarget = null; }
      else dir = { x: p.mesh.position.x - this.pos.x, z: p.mesh.position.z - this.pos.z };
    }
    if (!dir && this.moveTarget) {
      const d = this.pos.distanceTo(this.moveTarget);
      if (d < 0.18) this.moveTarget = null;
      else dir = { x: this.moveTarget.x - this.pos.x, z: this.moveTarget.z - this.pos.z };
    }

    if (this.slowT > 0) this.slowT -= dt;
    const spd = this.stats.spd * (this.slowT > 0 ? 0.55 : 1);

    // esquiva en curso: impulso con voltereta. Velocidad con ease-out (sale
    // rápido y frena) — se siente mucho más ágil que a velocidad constante.
    const body = this.group.userData.body;
    if (this.dodgeT > 0) {
      this.dodgeT -= dt;
      const k = Math.max(0, this.dodgeT) / DASH_DUR;     // 1 → 0
      const speed = DASH_PEAK * k;                        // decelera hacia el final
      moveWithCollision(g.world.grid, this.pos, this.dodgeDir.x * speed * dt, this.dodgeDir.z * speed * dt);
      body.rotation.x = (1 - k) * Math.PI * 2;            // voltereta completa
      // estela de imágenes residuales (cada ~25ms)
      this.dashTrail = (this.dashTrail || 0) + dt;
      if (this.dashTrail >= 0.025) { this.dashTrail = 0; g.spawnDashGhost?.(this); }
      if (this.dodgeT <= 0) body.rotation.x = 0;
      return;
    }

    let moving = false;
    if (dir) {
      const len = Math.hypot(dir.x, dir.z);
      if (len > 0.001) {
        const nx = dir.x / len, nz = dir.z / len;
        const before = this.pos.clone();
        moveWithCollision(g.world.grid, this.pos, nx * spd * dt, nz * spd * dt);
        if (this.pos.distanceToSquared(before) > 1e-8) {
          moving = true;
          this.group.rotation.y = Math.atan2(nx, nz);
        } else if (this.moveTarget) {
          this.moveTarget = null; // atascado contra un muro
        }
      }
    }

    // animación procedural
    const t = performance.now() / 1000;
    body.position.y = 0.75 + (moving ? Math.abs(Math.sin(t * 9)) * 0.09 : Math.sin(t * 2) * 0.02);
    this.swing = Math.max(0, this.swing - dt * 5);
    const hand = this.group.userData.hand;
    hand.rotation.x = -this.swing * 1.6;
  }

  basicAttack(target) {
    this.atkCd = this.stats.atkTime;
    this.swing = 1;
    const g = this.game;
    const atk = this.cls.atk || (this.cls.ranged ? 'arrow' : 'cleave');

    if (atk === 'cleave') {
      // Guerrero: tajo amplio — golpea al objetivo y a los enemigos pegados
      const { dmg, crit } = this.rollDamage(1);
      target.takeDamage(dmg, crit);
      this.onDealHit();
      if (target.alive && target.def.thorns)
        this.takeDamage(Math.max(1, Math.round(dmg * target.def.thorns)), target.def.level || 1);
      for (const e of g.enemies) {
        if (e === target || !e.alive) continue;
        if (e.pos.distanceToSquared(target.pos) < 2.0 * 2.0) {
          const r = this.rollDamage(0.5);
          e.takeDamage(r.dmg, r.crit);
        }
      }
      g.spawnRing(target.pos.clone(), 1.4, 0xffbb66);
      g.sfx('hit');
      return;
    }

    // Maga (proyectil arcano) y Arquera (flecha): a distancia, con multidisparo
    const arrow = atk === 'arrow';
    const color = arrow ? 0xe8d8a0 : 0xcc66ff;
    const speed = arrow ? 18 : 13;
    const size = arrow ? 0.09 : 0.17;
    const extra = this.powers?.has('multidisparo') ? 1 : 0;
    const baseAngle = Math.atan2(target.pos.x - this.pos.x, target.pos.z - this.pos.z);
    for (let i = 0; i <= extra; i++) {
      const a = baseAngle + (extra ? (i - extra / 2) * 0.18 : 0);
      const to = this.pos.clone().add(new THREE.Vector3(Math.sin(a) * 6, 0, Math.cos(a) * 6));
      const { dmg, crit } = this.rollDamage(1);
      g.spawnProjectile({
        from: this.pos.clone().setY(1.0), to: to.setY(1.0),
        speed, range: this.cls.atkRange + 2, dmg, crit, friendly: true, color, size,
      });
    }
    g.sfx(arrow ? 'shoot' : 'skill');
  }
}

// ------------------------------------------------------------
// ENEMIGO
// ------------------------------------------------------------
let enemyUid = 1;

export class Enemy {
  constructor(game, def, pos) {
    this.game = game;
    this.def = def;
    this.uid = enemyUid++;
    this.hp = def.hp;
    this.maxHP = def.hp;
    this.alive = true;
    this.atkCd = rand(0.2, 1);
    this.slowT = 0;
    this.flashT = 0;
    this.fade = 0;
    this.baseEmissive = def.glow || 0x000000; // campeones y élites brillan
    this.burnTick = 0;
    this.group = makeEnemyModel(def);
    this.group.position.copy(pos);
    this.group.userData.enemy = this;
    // aura visible bajo campeones y élites
    if (def.aura) {
      const aura = new THREE.Mesh(
        new THREE.RingGeometry(0.55, 0.78, 24),
        new THREE.MeshBasicMaterial({ color: def.aura, transparent: true, opacity: 0.5, side: THREE.DoubleSide }));
      aura.rotation.x = -Math.PI / 2;
      aura.position.y = 0.06;
      this.group.add(aura);
      this.aura = aura;
    }
  }

  get pos() { return this.group.position; }

  takeDamage(amount, crit = false) {
    if (!this.alive) return;
    this.aggroed = true; // ser golpeado despierta al enemigo al instante
    this.hp -= amount;
    this.flashT = 0.12;
    const bar = this.group.userData.bar;
    bar.visible = true;
    const fg = this.group.userData.barFg;
    fg.scale.x = Math.max(0.001, this.hp / this.maxHP);
    fg.position.x = -0.43 * (1 - fg.scale.x);
    this.game.ui.spawnText(this.pos.clone().add(new THREE.Vector3(rand(-0.3, 0.3), this.def.scale, 0)),
      `${amount}${crit ? '!' : ''}`, crit ? 'txt-crit' : 'txt-dmg');
    if (this.hp <= 0) this.die();
  }

  die() {
    this.alive = false;
    // los explosivos detonan al morir (con aviso para esquivar)
    if (this.def.explode)
      this.game.spawnTelegraph(this.pos.clone(), 2.2, 0.7, Math.round(this.def.dmg * 1.5), this.def.level || 1);
    this.game.onEnemyKilled(this);
  }

  update(dt) {
    const g = this.game;
    if (!this.alive) {
      // animación de muerte: hundirse y desvanecer
      this.fade += dt;
      this.group.position.y = -this.fade * 1.2;
      this.group.rotation.x = Math.min(Math.PI / 2, this.fade * 2.5);
      return this.fade > 1.2; // true => eliminar
    }

    if (this.flashT > 0) this.flashT -= dt;
    // recorrer el modelo solo cuando el flash cambia de estado
    const flashing = this.flashT > 0;
    if (flashing !== this._flashState) {
      this._flashState = flashing;
      this.group.traverse(o => {
        if (o.isMesh && o.material && o.material.emissive)
          o.material.emissive.setHex(flashing ? 0x661111 : this.baseEmissive);
      });
    }

    const player = g.player;
    if (!player || !player.alive) return false;

    // --- goblin del tesoro: nunca ataca; huye y, si no lo cazas, escapa ---
    // Tres tipos, cada uno con una VENTANA REAL para alcanzarlo (melee o rango):
    //   'veloz'  → corre rápido pero se detiene a burlarse cada pocos segundos
    //   'cargado'→ lento (más que el jugador) y deja un reguero de oro
    //   'portal' → se teletransporta de cerca pero queda aturdido tras parpadear
    if (this.def.goblin) {
      if (this.slowT > 0) this.slowT -= dt;
      const type = this.def.goblinType || 'veloz';
      const dg = this.pos.distanceTo(player.pos);
      this.escapeT = (this.escapeT ?? 26) - dt;

      // estado de aturdimiento (portal): quieto y vulnerable
      this.gobStunT = Math.max(0, (this.gobStunT ?? 0) - dt);
      // estado de descanso/burla (veloz): quieto y vulnerable
      this.gobRestT = Math.max(0, (this.gobRestT ?? 0) - dt);

      // multiplicador de huida por tipo (relativo a su def.spd)
      let fleeMul = 1.25;
      if (type === 'cargado') fleeMul = 1.0;
      else if (type === 'portal') fleeMul = 0.9;

      let resting = false;

      if (type === 'veloz') {
        // ciclo correr / descansar: corre ~2.5s, descansa ~1.2s (ventana de golpe)
        if (this.gobRestT > 0) {
          resting = true;
        } else {
          this.gobRunT = (this.gobRunT ?? 2.5) - dt;
          if (this.gobRunT <= 0) { this.gobRunT = 2.5; this.gobRestT = 1.2; resting = true; }
        }
      } else if (type === 'portal') {
        if (this.gobStunT > 0) {
          resting = true; // aturdido tras parpadear
        } else {
          // se teletransporta lejos cuando te acercas, y queda aturdido al llegar
          this.gobBlinkCd = Math.max(0, (this.gobBlinkCd ?? 0) - dt);
          if (dg < 2.6 && this.gobBlinkCd <= 0 && dg > 0.01) {
            for (let t = 0; t < 8; t++) {
              const a = Math.random() * Math.PI * 2;
              const nx = this.pos.x + Math.sin(a) * 5, nz = this.pos.z + Math.cos(a) * 5;
              if (g.world.grid.walkable(nx, nz, 0.3) &&
                  Math.hypot(nx - player.pos.x, nz - player.pos.z) > dg) {
                g.spawnRing?.(this.pos.clone(), 0.9, 0xffd24a);
                this.pos.set(nx, 0, nz);
                this.gobBlinkCd = 4;
                this.gobStunT = 1.5; // ventana de golpe: queda aturdido
                g.sfx?.('portal');
                break;
              }
            }
          }
        }
      }

      const gspd = this.def.spd * (this.slowT > 0 ? 0.5 : 1) * fleeMul;

      if (resting) {
        // detenido (descansando, burlándose o aturdido): bamboleo en el sitio
        if (dg > 0.01) this.group.rotation.y = Math.atan2(player.pos.x - this.pos.x, player.pos.z - this.pos.z);
      } else if (dg < 11 && dg > 0.01) {
        // huye del jugador; si choca con un muro, lo rodea en perpendicular
        const nx = (this.pos.x - player.pos.x) / dg, nz = (this.pos.z - player.pos.z) / dg;
        const before = this.pos.clone();
        moveWithCollision(g.world.grid, this.pos, nx * gspd * dt, nz * gspd * dt, 0.3);
        if (this.pos.distanceToSquared(before) < 1e-7) {
          moveWithCollision(g.world.grid, this.pos, -nz * gspd * dt, nx * gspd * dt, 0.3);
          this.group.rotation.y = Math.atan2(-nz, nx);
        } else {
          this.group.rotation.y = Math.atan2(nx, nz);
        }
        // goblin cargado: va soltando un reguero de oro mientras huye
        if (type === 'cargado') {
          this.goldDripT = (this.goldDripT ?? 0) - dt;
          if (this.goldDripT <= 0) { this.goldDripT = 0.55; g.goblinGoldDrip?.(this); }
        }
      } else {
        // deambula despacio mientras no lo ves
        this.wanderT = (this.wanderT ?? 0) - dt;
        if (this.wanderT <= 0 || !this.wanderTarget) {
          this.wanderT = 1.5 + Math.random() * 2;
          const a = Math.random() * Math.PI * 2, r = 3 + Math.random() * 4;
          this.wanderTarget = this.pos.clone().add(new THREE.Vector3(Math.sin(a) * r, 0, Math.cos(a) * r));
        }
        const wt = this.wanderTarget, dw = this.pos.distanceTo(wt);
        if (dw > 0.5) {
          const nx = (wt.x - this.pos.x) / dw, nz = (wt.z - this.pos.z) / dw;
          moveWithCollision(g.world.grid, this.pos, nx * gspd * 0.5 * dt, nz * gspd * 0.5 * dt, 0.3);
          this.group.rotation.y = Math.atan2(nx, nz);
        }
      }
      const body = this.group.userData.body;
      // bamboleo más intenso al correr; suave al descansar/aturdido
      if (body) body.position.y = 0.75 + Math.abs(Math.sin(performance.now() / (resting ? 220 : 90))) * (resting ? 0.05 : 0.12);
      if (this.escapeT <= 0) { g.goblinEscape(this); return false; }
      return false;
    }

    // --- jefe de mundo: ronda su zona y, si lo alejas, vuelve a su spawn ---
    if (this.home) {
      const dh = this.pos.distanceTo(this.home);
      // si lo alejas más allá del leash, se compromete a regresar del todo
      // (no hace yo-yo en el borde persiguiéndote)
      if (this.aggroed && dh > this.leash) this.returning = true;
      if (this.returning) {
        // regresa a su spawn y se regenera; ignora al jugador hasta llegar
        const nx = dh > 0.01 ? (this.home.x - this.pos.x) / dh : 0, nz = dh > 0.01 ? (this.home.z - this.pos.z) / dh : 0;
        moveWithCollision(g.world.grid, this.pos, nx * this.def.spd * 1.4 * dt, nz * this.def.spd * 1.4 * dt, 0.3);
        this.group.rotation.y = Math.atan2(nx, nz);
        this.hp = Math.min(this.maxHP, this.hp + this.maxHP * 0.06 * dt);
        if (dh < this.leash * 0.5) { this.returning = false; this.aggroed = false; }
        return false;
      }
      if (!this.aggroed) {
        // patrulla lenta alrededor de su casa
        this.wanderT = (this.wanderT ?? 0) - dt;
        if (this.wanderT <= 0 || !this.wanderTarget) {
          this.wanderT = 2 + Math.random() * 2;
          const a = Math.random() * Math.PI * 2, r = Math.random() * this.leash * 0.6;
          this.wanderTarget = this.home.clone().add(new THREE.Vector3(Math.sin(a) * r, 0, Math.cos(a) * r));
        }
        const wt = this.wanderTarget, dw = this.pos.distanceTo(wt);
        if (dw > 0.6) {
          const nx = (wt.x - this.pos.x) / dw, nz = (wt.z - this.pos.z) / dw;
          moveWithCollision(g.world.grid, this.pos, nx * this.def.spd * 0.5 * dt, nz * this.def.spd * 0.5 * dt, 0.3);
          this.group.rotation.y = Math.atan2(nx, nz);
        }
        // aggro si entras en su área con visión
        if (this.pos.distanceToSquared(player.pos) <= 100) {
          this.losT = (this.losT ?? 0) - dt;
          if (this.losT <= 0) { this.losT = 0.2; this.hasLOS = g.world.grid.lineOfSight(this.pos.x, this.pos.z, player.pos.x, player.pos.z); }
          if (this.hasLOS) this.aggroed = true;
        }
        if (!this.aggroed) return false;
      }
    } else if (!this.aggroed) {
      // --- LOD: los enemigos dormidos razonan a intervalos, no cada frame ---
      this.thinkT = (this.thinkT ?? Math.random() * 0.35) - dt;
      if (this.thinkT > 0) return false;
      this.thinkT = 0.3 + Math.random() * 0.15;
      const aggroR = this.def.boss ? 12 : 9;
      if (this.pos.distanceToSquared(player.pos) > aggroR * aggroR) return false;
      this.hasLOS = g.world.grid.lineOfSight(this.pos.x, this.pos.z, player.pos.x, player.pos.z);
      if (!this.hasLOS) return false;
      this.aggroed = true;
    }

    this.atkCd = Math.max(0, this.atkCd - dt);
    if (this.slowT > 0) this.slowT -= dt;

    const d = this.pos.distanceTo(player.pos);
    // enemigos normales: si te alejas mucho, se duermen (los jefes de mundo no)
    if (!this.home && d > (this.def.boss ? 18 : 14)) { this.aggroed = false; return false; }

    // línea de visión (cada 0.2s): para decidir disparos/ataques
    this.losT = (this.losT ?? 0) - dt;
    if (this.losT <= 0) {
      this.losT = 0.2;
      this.hasLOS = g.world.grid.lineOfSight(this.pos.x, this.pos.z, player.pos.x, player.pos.z);
    }

    const aggro = this.def.boss ? 12 : 9;

    // aura pulsante; los ardientes queman de cerca
    if (this.aura) {
      this.aura.material.opacity = 0.35 + Math.sin(performance.now() / 200) * 0.2;
      if (this.def.burn && d < 2.0) {
        this.burnTick -= dt;
        if (this.burnTick <= 0) {
          this.burnTick = 0.5;
          player.takeDamage(Math.max(1, Math.round(2 + (this.def.level || 1) * 1.2)), this.def.level || 1);
        }
      }
      // aura de escarcha: ralentiza al jugador mientras esté cerca (sin daño)
      if (this.def.frostAura && d < 2.6) {
        player.slowT = Math.max(player.slowT, 0.4);
      }
    }
    // aura de mando: potencia a los aliados cercanos (vel. de ataque) — el buff
    // se aplica de forma pasiva marcando a los enemigos próximos cada ~0.5s.
    if (this.def.rallyAura) {
      this.rallyTick = (this.rallyTick ?? 0) - dt;
      if (this.rallyTick <= 0) {
        this.rallyTick = 0.5;
        for (const e of g.enemies) {
          if (e === this || !e.alive || e.def.boss) continue;
          if (e.pos.distanceToSquared(this.pos) < 5 * 5) e.rallyT = 0.7;
        }
      }
    }
    // beneficiado por un aura de mando aliada: ataca más rápido un instante
    this.rallyT = Math.max(0, (this.rallyT ?? 0) - dt);

    const spd = this.def.spd * (this.slowT > 0 ? 0.45 : 1) * (this.rallyT > 0 ? 1.2 : 1);

    // cobardes: con poca vida huyen de ti, pero EN RÁFAGAS — corren ~1.5s y
    // luego se cansan ~1.5s (se ralentizan y se dan la vuelta), dando una
    // ventana real para alcanzarlos. Ya no huyen indefinidamente.
    if (this.def.coward && this.hp < this.maxHP * 0.3 && d < 6 && d > 0.01) {
      this.cowardPhaseT = (this.cowardPhaseT ?? 0) - dt;
      if (this.cowardPhaseT <= 0) {
        // alterna entre huir y cansarse
        this.cowardFleeing = !this.cowardFleeing;
        this.cowardPhaseT = this.cowardFleeing ? 1.5 : 1.5;
      }
      if (this.cowardFleeing) {
        const nx = (this.pos.x - player.pos.x) / d, nz = (this.pos.z - player.pos.z) / d;
        moveWithCollision(g.world.grid, this.pos, nx * spd * dt, nz * spd * dt, 0.3);
        this.group.rotation.y = Math.atan2(nx, nz);
        return false;
      }
      // cansado: se gira hacia el jugador y avanza muy despacio (alcanzable);
      // si el jugador está en rango, deja que el bloque de ataque actúe.
      this.group.rotation.y = Math.atan2(player.pos.x - this.pos.x, player.pos.z - this.pos.z);
      if (d > this.def.range) {
        const nx = (player.pos.x - this.pos.x) / d, nz = (player.pos.z - this.pos.z) / d;
        moveWithCollision(g.world.grid, this.pos, nx * spd * 0.35 * dt, nz * spd * 0.35 * dt, 0.3);
        return false;
      }
    }

    // brujos: se teletransportan lejos si te acercas demasiado
    this.blinkCd = Math.max(0, (this.blinkCd || 0) - dt);
    if (this.def.blink && this.blinkCd <= 0 && d < 2.6 && this.hasLOS) {
      for (let t = 0; t < 8; t++) {
        const a = Math.random() * Math.PI * 2;
        const nx = this.pos.x + Math.sin(a) * 5, nz = this.pos.z + Math.cos(a) * 5;
        if (g.world.grid.walkable(nx, nz, 0.3) &&
            Math.hypot(nx - player.pos.x, nz - player.pos.z) > d) {
          g.spawnRing(this.pos.clone(), 0.8, 0xaa66ff);
          this.pos.set(nx, 0, nz);
          this.blinkCd = 5;
          g.sfx('eshoot');
          break;
        }
      }
    }

    // enemigo activo: mira, usa mecánicas, ataca o persigue
    {
      this.group.rotation.y = Math.atan2(player.pos.x - this.pos.x, player.pos.z - this.pos.z);

      // mecánicas especiales de jefe
      if (this.def.mechanic) {
        if (this.def.mechanic === 'summon') {
          if (!this.summoned && this.hp < this.maxHP * 0.5) {
            this.summoned = true;
            g.bossSummon(this);
          }
        } else {
          this.mechCd = (this.mechCd ?? 4) - dt;
          if (this.mechCd <= 0) {
            if (this.def.mechanic === 'frost_nova' && d < 7) { this.mechCd = 6; g.bossFrostNova(this); }
            else if (this.def.mechanic === 'fire_pool' && d < 11) { this.mechCd = 5; g.spawnFirePool(player.pos.clone()); }
            // telaraña/escarcha telegrafiada: avisa y, si no esquivas, te ralentiza
            else if (this.def.mechanic === 'web' && d < 9 && this.hasLOS) { this.mechCd = 5; g.enemyWeb(this, player.pos.clone()); }
            // abanico de proyectiles hacia el jugador (esquivable)
            else if (this.def.mechanic === 'fan' && d < 11 && this.hasLOS) { this.mechCd = 4.5; g.enemyFan(this, player.pos.clone()); }
          }
        }
      }

      const range = this.def.range;
      if (d <= range && this.hasLOS) {
        if (this.atkCd <= 0) {
          this.atkCd = this.def.atkTime * (this.rallyT > 0 ? 0.8 : 1);
          if (this.def.rangedAttack && d > 2.2) {
            g.spawnProjectile({
              from: this.pos.clone().setY(1.1), to: player.pos.clone().setY(1.0),
              speed: this.def.projSpeed || 8, range: range + 3,
              dmg: this.def.dmg, friendly: false, color: this.def.projColor || 0xaa44ff, size: 0.16,
              attackerLevel: this.def.level || 1,
            });
            g.sfx('eshoot');
          } else if (this.def.slam) {
            // golpe pesado telegrafiado: avisa, pero castiga fuerte si no lo esquivas
            g.spawnTelegraph(player.pos.clone(), 1.6, 0.65, Math.round(this.def.dmg * 1.5), this.def.level || 1);
          } else {
            player.takeDamage(this.def.dmg, this.def.level || 1);
          }
        }
      } else {
        // perseguir; los tiradores mantienen distancia
        const stop = this.def.rangedAttack ? range * 0.8 : 0;
        if (d > stop) {
          const nx = (player.pos.x - this.pos.x) / d, nz = (player.pos.z - this.pos.z) / d;
          moveWithCollision(g.world.grid, this.pos, nx * spd * dt, nz * spd * dt, 0.3);
        }
      }
      void aggro;
    }
    return false;
  }
}

// ------------------------------------------------------------
// PROYECTIL
// ------------------------------------------------------------
export class Projectile {
  constructor(game, opts) {
    this.game = game;
    this.friendly = opts.friendly;
    this.dmg = opts.dmg;
    this.crit = opts.crit || false;
    this.pierce = opts.pierce || false;
    this.slow = opts.slow || 0;
    this.attackerLevel = opts.attackerLevel || 1;
    this.hitSet = new Set();

    const dir = opts.to.clone().sub(opts.from);
    dir.y = 0;
    if (dir.lengthSq() < 0.001) dir.set(0, 0, 1);
    dir.normalize();
    this.vel = dir.multiplyScalar(opts.speed);
    this.life = (opts.range || 10) / opts.speed;

    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(opts.size || 0.14, 8, 6),
      new THREE.MeshBasicMaterial({ color: opts.color || 0xffffff })
    );
    this.mesh.position.copy(opts.from);
  }

  // devuelve true cuando hay que eliminarlo
  update(dt) {
    const g = this.game;
    this.life -= dt;
    if (this.life <= 0) return true;
    this.mesh.position.addScaledVector(this.vel, dt);
    const p = this.mesh.position;

    if (!g.world.grid.walkable(p.x, p.z, 0.05)) return true;

    if (this.friendly) {
      for (const e of g.enemies) {
        if (!e.alive || this.hitSet.has(e)) continue;
        const r = 0.55 * (e.def.scale || 1);
        if (p.distanceToSquared(e.pos.clone().setY(p.y)) < r * r) {
          e.takeDamage(this.dmg, this.crit);
          g.player?.onDealHit();
          if (this.slow) e.slowT = this.slow;
          g.sfx('hit');
          if (!this.pierce) return true;
          this.hitSet.add(e);
        }
      }
    } else {
      const pl = g.player;
      if (pl && pl.alive && p.distanceToSquared(pl.pos.clone().setY(p.y)) < 0.45) {
        pl.takeDamage(this.dmg, this.attackerLevel);
        return true;
      }
    }
    return false;
  }
}

// ------------------------------------------------------------
// MASCOTA: lobo de caza que sigue al jugador y ataca a su objetivo
// ------------------------------------------------------------
function makeWolfModel() {
  const g = new THREE.Group();
  const fur = std(0x8a8d96);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.34, 0.3), fur);
  body.position.y = 0.34;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.24, 0.26), fur.clone());
  head.position.set(0, 0.5, 0.36);
  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.14), std(0x6a6d76));
  snout.position.set(0, 0.45, 0.54);
  for (const sx of [-0.08, 0.08]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 4), fur.clone());
    ear.position.set(sx, 0.68, 0.34);
    g.add(ear);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xffdd44 }));
    eye.position.set(sx, 0.53, 0.5);
    g.add(eye);
  }
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.3), fur.clone());
  tail.position.set(0, 0.42, -0.4);
  tail.rotation.x = -0.5;
  body.castShadow = head.castShadow = true;
  g.add(body, head, snout, tail);
  // el lobo gira sobre su eje Z+ (mismo convenio que jugador/enemigos)
  return g;
}

export class Pet {
  constructor(game) {
    this.game = game;
    this.atkCd = 0;
    this.lunge = 0;
    this.group = makeWolfModel();
  }

  get pos() { return this.group.position; }

  // botín que se recoge solo (cerca del dueño, no del lobo, para no alejarse)
  nearestLoot(g, p) {
    let best = null, bd = 81;
    for (const gi of g.groundItems || []) {
      const k = gi.item.kind;
      const auto = k === 'gold' || k === 'potion' ||
        ((k === 'gem' || k === 'rune') && p.inventory.length < 32);
      if (!auto) continue;
      const d = gi.mesh.position.distanceToSquared(p.pos);
      if (d < bd) { bd = d; best = gi; }
    }
    return best;
  }

  update(dt) {
    const g = this.game, p = g.player;
    this.atkCd = Math.max(0, this.atkCd - dt);
    this.lunge = Math.max(0, this.lunge - dt * 4);

    const dp = this.pos.distanceTo(p.pos);
    if (dp > 12) { this.pos.copy(p.pos); return; } // teletransporte si se queda atrás

    // objetivo: el del jugador, o el enemigo más cercano a su dueño
    let target = p.attackTarget && p.attackTarget.alive ? p.attackTarget : null;
    if (!target) {
      let bd = 36;
      for (const e of g.enemies) {
        if (!e.alive) continue;
        const d = e.pos.distanceToSquared(p.pos);
        if (d < bd) { bd = d; target = e; }
      }
    }

    let dest = null;
    if (target) {
      const dte = this.pos.distanceTo(target.pos);
      if (dte <= 1.5) {
        this.group.rotation.y = Math.atan2(target.pos.x - this.pos.x, target.pos.z - this.pos.z);
        if (this.atkCd <= 0) {
          this.atkCd = 1.1;
          this.lunge = 1;
          // el lobo escala con el daño del dueño (sigue siendo útil en el endgame)
          const dmg = Math.max(2, Math.round(3 + (p.stats.dmgMin + p.stats.dmgMax) / 2 * 0.45));
          target.takeDamage(dmg, false);
          g.sfx('hit');
        }
      } else dest = target.pos;
    } else {
      // sin combate: el lobo va a buscar el botín recogible cercano
      const gi = this.nearestLoot(g, p);
      if (gi) {
        const dgi = this.pos.distanceTo(gi.mesh.position.clone().setY(this.pos.y));
        if (dgi < 0.7) g.pickupGroundItem(gi);
        else dest = gi.mesh.position;
      } else if (dp > 2.2) {
        dest = p.pos;
      }
    }

    if (dest) {
      const dx = dest.x - this.pos.x, dz = dest.z - this.pos.z;
      const l = Math.hypot(dx, dz) || 1;
      moveWithCollision(g.world.grid, this.pos, dx / l * 5 * dt, dz / l * 5 * dt, 0.25);
      this.group.rotation.y = Math.atan2(dx, dz);
    }
    this.group.position.y = Math.abs(Math.sin(performance.now() / 1000 * 8)) * (dest ? 0.07 : 0.02) + this.lunge * 0.18;
  }
}
