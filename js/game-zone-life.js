// ============================================================
// Vida de la zona abierta (mixin de Game)
// ============================================================
// Respawn gradual, Jefe de Mundo, Goblin del Tesoro, oleadas de evento y
// utilidades de celdas aleatorias transitables. Se inyecta en Game.prototype
// con Object.assign (igual que los demás mixins). Todo `this` resuelve vía
// instancia (spawnPack/buffByPact/spawnBurst/etc. siguen viviendo en main.js).
import * as THREE from 'three';
import { GOBLIN, bossForFloor, scaleEnemy, pickEnemyDef, rollEnemyRank } from './data.js';
import { Enemy } from './entities.js';
import { rollDrops } from './items.js';

export const zoneLifeMethods = {
  // celda transitable aleatoria de un mundo, lejos de un punto dado
  randomZoneCellFrom(world, fromPos, minDist = 12) {
    const g = world.grid;
    const sz = world.safeZone;
    for (let t = 0; t < 50; t++) {
      const x = 2 + Math.floor(Math.random() * (g.w - 4));
      const z = 2 + Math.floor(Math.random() * (g.h - 4));
      if (!g.cells[z][x]) continue;
      const c = g.center(x, z);
      // nunca generes enemigos dentro del campamento seguro (hogar)
      if (sz && c.x >= sz.minX && c.x <= sz.maxX && c.z >= sz.minZ && c.z <= sz.maxZ) continue;
      if (c.distanceTo(fromPos) >= minDist) return c;
    }
    return null;
  },

  // celda transitable aleatoria de la zona, lejos del jugador
  randomZoneCell(minDistFromPlayer = 12) {
    return this.randomZoneCellFrom(this.world, this.player.pos, minDistFromPlayer);
  },

  // vida de la zona abierta: respawn gradual, jefe de mundo y oleadas de evento
  zoneTick(dt) {
    const w = this.world;
    const alive = this.enemies.reduce((n, e) => n + (e.alive ? 1 : 0), 0);

    // respawn gradual: la zona nunca queda vacía (con tope)
    w.respawnT = (w.respawnT ?? 8) - dt;
    if (w.respawnT <= 0) {
      w.respawnT = 7 + Math.random() * 6;
      if (alive < 70) {
        const pos = this.randomZoneCell(16);
        if (pos) {
          const positions = [pos];
          const n = 2 + (Math.random() < 0.5 ? 1 : 0);
          for (let i = 1; i < n; i++) {
            const a = Math.random() * Math.PI * 2;
            const c = pos.clone().add(new THREE.Vector3(Math.sin(a) * 2, 0, Math.cos(a) * 2));
            if (w.grid.walkable(c.x, c.z)) positions.push(c);
          }
          this.spawnPack(positions, w.scaleFloor);
        }
      }
    }

    // jefe de mundo: aparece tras un rato, anunciado, con gran botín al caer
    if (!w.worldBoss && !w.bossDone) {
      w.bossT = (w.bossT ?? 50) - dt;
      if (w.bossT <= 0) this.spawnWorldBoss();
    }

    // goblin del tesoro: aparece de vez en cuando si no hay otro rondando
    if (!w.goblin || !w.goblin.alive) {
      w.goblinT = (w.goblinT ?? 35) - dt;
      if (w.goblinT <= 0) { w.goblinT = 45 + Math.random() * 40; this.spawnGoblin(); }
    }

    // evento de oleadas (obelisco): siguiente oleada cuando mueren las anteriores
    if (w.event && w.event.active) {
      const evAlive = this.enemies.some(e => e.alive && e.def.eventEnemy);
      if (!evAlive) {
        if (w.event.cur < w.event.total) {
          w.event.cur++;
          const around = w.event.pos;
          const positions = [];
          for (let i = 0; i < 3 + w.event.cur; i++) {
            const a = Math.random() * Math.PI * 2, r = 2 + Math.random() * 3;
            const c = around.clone().add(new THREE.Vector3(Math.sin(a) * r, 0, Math.cos(a) * r));
            if (w.grid.walkable(c.x, c.z)) positions.push(c);
          }
          for (const pos of positions) {
            const def = rollEnemyRank(scaleEnemy(pickEnemyDef(w.scaleFloor), w.scaleFloor), w.scaleFloor);
            def.eventEnemy = true;
            const e = this.buffByPact(new Enemy(this, def, pos));
            e.aggroed = true;
            this.enemies.push(e);
            this.entityGroup.add(e.group);
          }
          this.spawnBurst(around, 0x9933ff, 8);
          this.ui.message(`🌀 Oleada ${w.event.cur}/${w.event.total}`, 2000);
        } else {
          // evento completado: recompensa
          w.event.active = false;
          for (const d of rollDrops(w.scaleFloor, { mf: this.player.stats.mf || 0, boss: true, cls: this.player.classId }))
            this.spawnGroundItem(d, w.event.pos);
          this.ui.message('🌀 ¡Evento completado! Botín liberado', 4000);
          this.music.sting();
        }
      }
    }
  },

  spawnWorldBoss() {
    const w = this.world;
    const pos = this.randomZoneCell(18) || this.randomZoneCell(8);
    if (!pos) { w.bossT = 20; return; }
    const def = scaleEnemy(bossForFloor(w.scaleFloor + 2), w.scaleFloor + 2);
    def.hp = Math.round(def.hp * 1.6);
    def.worldBoss = true;
    def.rankLabel = `👑 ${def.name} (Jefe de Mundo)`;
    def.labelCls = 'lbl-elite';
    const e = new Enemy(this, def, pos);
    e.home = pos.clone();   // ronda su zona; si lo alejas demasiado, vuelve
    e.leash = 14;
    this.enemies.push(e);
    this.entityGroup.add(e.group);
    w.worldBoss = e;
    this.ui.message('👑 ¡Un Jefe de Mundo ha aparecido en la zona! (mira el minimapa)', 5000);
    this.addShake(0.4, 0.5);
    this.music.sting();
  },

  // Guardián de un Bastión sin reclamar: jefe reforzado; al caer, la zona se
  // reclama y pasa a ser un refugio (lo gestiona claimStronghold en onEnemyKilled).
  spawnStrongholdGuardian(biome) {
    const w = this.world;
    const pos = this.randomZoneCellFrom(w, w.spawn, 30) || this.randomZoneCellFrom(w, w.spawn, 15);
    if (!pos) return;
    const def = scaleEnemy(bossForFloor(w.scaleFloor + 3), w.scaleFloor + 3);
    def.hp = Math.round(def.hp * 1.8);
    def.stronghold = biome;
    def.rankLabel = `🏰 Guardián del Bastión`;
    def.labelCls = 'lbl-elite';
    const e = new Enemy(this, def, pos);
    e.home = pos.clone();
    e.leash = 16;
    this.enemies.push(e);
    this.entityGroup.add(e.group);
    this.ui.message(`🏰 Bastión de ${biome} sin reclamar — derrota a su Guardián para hacerlo tuyo`, 5000);
  },

  // goblin del tesoro: huye y suelta gran botín si lo cazas a tiempo.
  // Tres tipos, cada uno con una ventana real para alcanzarlo (melee o rango).
  spawnGoblin(pos = null, type = null) {
    const w = this.world;
    const at = pos || this.randomZoneCell(14) || this.randomZoneCell(6);
    if (!at) return null;
    const floor = w.scaleFloor || w.floor || 1;
    type = type || ['veloz', 'cargado', 'portal'][Math.floor(Math.random() * 3)];
    const VARIANTS = {
      veloz:   { spd: 4.6, label: '🪙 Goblin Veloz',   msg: 'un Goblin Veloz (corre, pero se detiene a burlarse)' },
      cargado: { spd: 3.4, label: '🪙 Goblin Cargado', msg: 'un Goblin Cargado (lento, suelta oro al huir)', hpMul: 1.2 },
      portal:  { spd: 4.0, label: '🪙 Goblin Portal',  msg: 'un Goblin Portal (parpadea, pero queda aturdido)', hpMul: 0.65 },
    };
    const v = VARIANTS[type] || VARIANTS.veloz;
    const def = scaleEnemy(GOBLIN, floor);
    def.goblin = true;
    def.goblinType = type;
    def.spd = v.spd;
    if (v.hpMul) def.hp = Math.round(def.hp * v.hpMul);
    def.rankLabel = v.label;
    def.labelCls = 'lbl-elite';
    const e = new Enemy(this, def, at);
    e.escapeT = 26;
    this.enemies.push(e);
    this.entityGroup.add(e.group);
    if (w.type === 'zone') w.goblin = e;
    this.spawnRing(at.clone(), 1.2, 0xffd24a);
    this.ui.message(`🪙 ¡Aparece ${v.msg}! Cázalo antes de que escape`, 3500);
    this.sfx('portal');
    return e;
  },

  // el goblin escapa sin botín si no lo matas a tiempo
  goblinEscape(e) {
    this.spawnRing(e.pos.clone(), 1.6, 0xffd24a);
    this.spawnBurst(e.pos, 0xffd24a, 14);
    e.group.visible = false;
    e.alive = false;
    e.fade = 2; // se elimina en el siguiente update
    if (this.world.goblin === e) this.world.goblin = null;
    this.sfx('portal');
    this.ui.message('🦹 El Goblin del Tesoro ha escapado con su botín...', 3000);
  },
};
