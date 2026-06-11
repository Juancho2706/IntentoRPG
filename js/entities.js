// ============================================================
// Entidades: jugador, enemigos y proyectiles
// ============================================================
import * as THREE from 'three';
import { CLASSES, skillVal, xpForLevel } from './data.js';

function rand(min, max) { return min + Math.random() * (max - min); }

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

export function makePlayerModel(cls) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.55, 6, 12), std(cls.color));
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
  for (const sx of [-0.09, 0.09]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6),
      new THREE.MeshBasicMaterial({ color: def.boss ? 0xff2200 : 0xffcc00 }));
    eye.position.set(sx, def.shape === 'rat' ? 0.4 : 1.34 * (def.shape === 'golem' ? 1.18 : 1), def.shape === 'rat' ? 0.45 : 0.2);
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
  constructor(game, classId, saved = null) {
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
    this.equipment = { weapon: null, helm: null, chest: null, boots: null, ring: null, amulet: null };
    this.lastFloor = 1;

    if (saved) Object.assign(this, saved, { game: this.game, cls: this.cls });

    this.buffs = [];
    this.cds = {};
    this.atkCd = 0;
    this.moveTarget = null;
    this.attackTarget = null;
    this.pickTarget = null;
    this.swing = 0;
    this.alive = true;
    this.healCd = 0;

    this.group = makePlayerModel(this.cls);
    this.recompute();
    this.hp = this.stats.maxHP;
    this.mp = this.stats.maxMP;
    if (saved && saved.hp != null) { this.hp = Math.min(saved.hp, this.stats.maxHP); this.mp = Math.min(saved.mp, this.stats.maxMP); }
  }

  get pos() { return this.group.position; }

  // estadísticas derivadas de atributos + equipo + buffs + pasivas
  recompute() {
    const a = { ...this.attributes };
    const item = { hp: 0, mp: 0, dmgPct: 0, crit: 0, arm: 0, spdPct: 0, aspdPct: 0 };

    const addStats = (src) => {
      for (const [k, v] of Object.entries(src)) {
        if (k in a) a[k] += v; else if (k in item) item[k] += v;
      }
    };

    for (const it of Object.values(this.equipment)) {
      if (!it) continue;
      if (it.arm) item.arm += it.arm;
      addStats(it.affixes || {});
    }
    for (const b of this.buffs) addStats(b.stats);
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
    const wDmg = w ? w.dmg : c.fists;
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
    };
    if (this.hp != null) {
      this.hp = Math.min(this.hp, this.stats.maxHP);
      this.mp = Math.min(this.mp, this.stats.maxMP);
    }
  }

  rollDamage(mult = 1, critBonus = 0) {
    let dmg = rand(this.stats.dmgMin, this.stats.dmgMax) * mult;
    const crit = Math.random() * 100 < this.stats.crit + critBonus;
    if (crit) dmg *= 1.8;
    return { dmg: Math.max(1, Math.round(dmg)), crit };
  }

  addBuff(id, stats, dur) {
    this.buffs = this.buffs.filter(b => b.id !== id);
    this.buffs.push({ id, stats, t: dur });
    this.recompute();
  }

  gainXP(amount) {
    this.xp += amount;
    this.game.ui.spawnText(this.pos, `+${amount} XP`, 'txt-xp');
    while (this.xp >= xpForLevel(this.level)) {
      this.xp -= xpForLevel(this.level);
      this.level++;
      this.statPoints += 5;
      this.skillPoints += 1;
      this.recompute();
      this.hp = this.stats.maxHP;
      this.mp = this.stats.maxMP;
      this.game.ui.message(`⭐ ¡Nivel ${this.level}! +5 atributos, +1 punto de habilidad`);
      this.game.sfx('levelup');
    }
  }

  takeDamage(amount, attackerLevel = 1) {
    if (!this.alive) return;
    const red = this.stats.arm / (this.stats.arm + 40 + 12 * attackerLevel);
    const dmg = Math.max(1, Math.round(amount * (1 - Math.min(0.75, red))));
    this.hp -= dmg;
    this.game.ui.spawnText(this.pos, `-${dmg}`, 'txt-dmg-player');
    this.game.ui.flashDamage();
    this.game.sfx('hurt');
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

    let moving = false;
    if (dir) {
      const len = Math.hypot(dir.x, dir.z);
      if (len > 0.001) {
        const nx = dir.x / len, nz = dir.z / len;
        const before = this.pos.clone();
        moveWithCollision(g.world.grid, this.pos, nx * this.stats.spd * dt, nz * this.stats.spd * dt);
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
    const body = this.group.userData.body;
    body.position.y = 0.75 + (moving ? Math.abs(Math.sin(t * 9)) * 0.09 : Math.sin(t * 2) * 0.02);
    this.swing = Math.max(0, this.swing - dt * 5);
    const hand = this.group.userData.hand;
    hand.rotation.x = -this.swing * 1.6;
  }

  basicAttack(target) {
    this.atkCd = this.stats.atkTime;
    this.swing = 1;
    const g = this.game;
    if (this.cls.ranged) {
      const { dmg, crit } = this.rollDamage(1);
      g.spawnProjectile({
        from: this.pos.clone().setY(1.0), to: target.pos.clone().setY(1.0),
        speed: 16, range: this.cls.atkRange + 2, dmg, crit, friendly: true,
        color: 0xe8d8a0, size: 0.09,
      });
      g.sfx('shoot');
    } else {
      const { dmg, crit } = this.rollDamage(1);
      target.takeDamage(dmg, crit);
      g.sfx('hit');
    }
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
    this.group = makeEnemyModel(def);
    this.group.position.copy(pos);
    this.group.userData.enemy = this;
  }

  get pos() { return this.group.position; }

  takeDamage(amount, crit = false) {
    if (!this.alive) return;
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
    this.group.traverse(o => {
      if (o.isMesh && o.material && o.material.emissive)
        o.material.emissive.setHex(this.flashT > 0 ? 0x661111 : this.baseEmissive);
    });

    const player = g.player;
    if (!player || !player.alive) return false;

    this.atkCd = Math.max(0, this.atkCd - dt);
    if (this.slowT > 0) this.slowT -= dt;

    const d = this.pos.distanceTo(player.pos);
    const aggro = this.def.boss ? 12 : 9;
    if (d > aggro + 6) return false; // demasiado lejos, dormir

    const spd = this.def.spd * (this.slowT > 0 ? 0.45 : 1);

    if (d <= aggro) {
      // mirar al jugador
      this.group.rotation.y = Math.atan2(player.pos.x - this.pos.x, player.pos.z - this.pos.z);

      const useRanged = this.def.rangedAttack && (this.def.rangedChance == null || Math.random() < 1); // brujo siempre, jefe mezcla en attack
      const range = this.def.range;

      if (d <= range) {
        if (this.atkCd <= 0) {
          this.atkCd = this.def.atkTime;
          if (this.def.rangedAttack && d > 2.2) {
            g.spawnProjectile({
              from: this.pos.clone().setY(1.1), to: player.pos.clone().setY(1.0),
              speed: this.def.projSpeed || 8, range: range + 3,
              dmg: this.def.dmg, friendly: false, color: this.def.projColor || 0xaa44ff, size: 0.16,
              attackerLevel: this.def.level || 1,
            });
            g.sfx('eshoot');
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
      void useRanged;
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
