// ============================================================
// Habilidades y telegrafías de enemigos/jefes (mixin de Game)
// ============================================================
// Métodos de ataque/aviso de enemigos y jefes extraídos de main.js para
// aligerar el hub. Se inyectan en Game.prototype con Object.assign (mismo
// patrón que economyMethods). Usan `this` (estado y otros métodos del juego);
// solo necesitan estos imports de módulo.
import * as THREE from 'three';
import { ENEMIES, scaleEnemy } from './data.js';
import { Enemy } from './entities.js';
import { makeGold } from './items.js';
import { FX as ENEMY_FX, hexNum } from './fx-enemies.js';

export const enemyAbilities = {
  updateTriggers(dt) {
    const p = this.player;
    for (const tr of this.world.triggers || []) {
      if (tr.triggered || p.pos.distanceTo(tr.pos) > tr.radius) continue;
      tr.triggered = true;
      this.ui.message('⚠️ ¡Es una emboscada!', 2500);
      this.addShake(0.3, 0.3);
      this.vibrate([50, 40, 50]);
      this.spawnWave(tr.waves[0]);
      if (tr.waves[1]?.length) (this.pendingWaves ||= []).push({ t: 4, positions: tr.waves[1] });
    }
    for (let i = (this.pendingWaves || []).length - 1; i >= 0; i--) {
      const wv = this.pendingWaves[i];
      wv.t -= dt;
      if (wv.t <= 0) { this.spawnWave(wv.positions); this.pendingWaves.splice(i, 1); }
    }
  },

  // ---------- mecánicas de jefe ----------
  bossSummon(boss) {
    const base = ENEMIES.find(e => e.id === 'esqueleto');
    for (let i = 0; i < 3; i++) {
      const a = Math.PI * 2 * i / 3;
      const pos = boss.pos.clone().add(new THREE.Vector3(Math.sin(a) * 1.8, 0, Math.cos(a) * 1.8));
      if (!this.world.grid.walkable(pos.x, pos.z)) pos.copy(boss.pos);
      pos.y = 0;
      const e = new Enemy(this, scaleEnemy(base, this.world.scaleFloor || 1), pos);
      this.enemies.push(e);
      this.entityGroup.add(e.group);
    }
    this.spawnRing(boss.pos, 2.4, 0x8844ff);
    // vórtice oscuro: anillo que succiona + núcleo arcano en el centro
    this.emitFx(ENEMY_FX.summon, boss.pos.clone().setY(0.8));
    this.emitFx(ENEMY_FX.summonCore, boss.pos.clone().setY(0.9));
    this.ui.message(`👹 ¡${boss.def.name} invoca a sus esbirros!`);
    this.sfx('eshoot');
  },

  bossFrostNova(boss) {
    // aviso de 0.8s; al estallar daña y congela a quien siga dentro
    this.spawnTelegraph(boss.pos.clone(), 3.8, 0.8, boss.def.dmg, boss.def.level || 1, {
      slow: true,
      onDone: (at) => {
        // onda de esquirlas de hielo + bruma fría al estallar
        this.emitFx(ENEMY_FX.frostNova, at.clone().setY(0.6));
        this.emitFx(ENEMY_FX.frostNovaMist, at.clone().setY(0.5));
      },
    });
    this.sfx('eshoot');
  },

  spawnFirePool(pos) {
    // aviso breve y después la zona queda en llamas
    this.spawnTelegraph(pos.clone(), 1.6, 0.6, 0, 1, {
      onDone: (at) => {
        const mesh = new THREE.Mesh(new THREE.CircleGeometry(1.5, 20),
          new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.55 }));
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.copy(at).setY(0.06);
        this.fxGroup.add(mesh);
        this.firePools.push({ mesh, t: 0, dur: 4.5, radius: 1.6, tick: 0.4, fire: true });
        // estallido inicial de ignición
        this.emitFx(ENEMY_FX.firePoolIgnite, at.clone().setY(0.2));
      },
    });
    this.sfx('eshoot');
  },

  // telaraña/escarcha telegrafiada: aviso en el suelo; al estallar, ralentiza
  // al jugador unos segundos si sigue dentro (sin daño injusto).
  enemyWeb(enemy, pos) {
    this.spawnTelegraph(pos, 2.0, 0.7, 0, enemy.def.level || 1, {
      onDone: (at) => {
        const p = this.player;
        if (p && p.alive && p.pos.distanceTo(at) <= 2.3) {
          p.slowT = 3; p._slowTotal = 3;
          this.ui.message('🕸️ ¡Atrapado! Estás ralentizado', 1500);
        }
        // marca visual breve en el suelo
        const mesh = new THREE.Mesh(new THREE.CircleGeometry(2.0, 20),
          new THREE.MeshBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0.4 }));
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.copy(at).setY(0.05);
        this.fxGroup.add(mesh);
        this.firePools.push({ mesh, t: 0, dur: 2.5, radius: 0, tick: 99 });
        // hilos y polvo verdoso de la telaraña al cerrarse
        this.emitFx(ENEMY_FX.web, at.clone().setY(0.3));
        this.emitFx(ENEMY_FX.webDust, at.clone().setY(0.3));
      },
    });
    this.sfx('eshoot');
  },

  // abanico de proyectiles: 3 disparos en arco hacia el jugador (esquivable)
  enemyFan(enemy, target) {
    const baseAngle = Math.atan2(target.x - enemy.pos.x, target.z - enemy.pos.z);
    // chispas en el cono de disparo, teñidas con el color del proyectil
    const fcol = hexNum(enemy.def.projColor ?? 0xcc66ff);
    this.emitFx({ ...ENEMY_FX.fan, color: { start: '#ffffff', end: fcol } },
      enemy.pos.clone().setY(1.0));
    for (let i = -1; i <= 1; i++) {
      const a = baseAngle + i * 0.26;
      const to = enemy.pos.clone().add(new THREE.Vector3(Math.sin(a) * 8, 0, Math.cos(a) * 8));
      this.spawnProjectile({
        from: enemy.pos.clone().setY(1.1), to: to.setY(1.0),
        speed: enemy.def.projSpeed || 9, range: 11,
        dmg: Math.round(enemy.def.dmg * 0.7), friendly: false,
        color: enemy.def.projColor || 0xcc66ff, size: 0.16,
        attackerLevel: enemy.def.level || 1,
      });
    }
    this.sfx('eshoot');
  },

  // ---------- mecánicas de arquetipos nuevos ----------
  // Nigromante: invoca 2 esqueletos con anillo visible. Quedan ligados al
  // nigromante (raisedBy) para poder debilitarlos cuando este muera.
  enemyRaise(enemy) {
    const base = ENEMIES.find(e => e.id === 'esqueleto');
    const floor = this.world.scaleFloor || 1;
    for (let i = 0; i < 2; i++) {
      const a = Math.PI * 2 * (i + Math.random()) / 2;
      const pos = enemy.pos.clone().add(new THREE.Vector3(Math.sin(a) * 1.6, 0, Math.cos(a) * 1.6));
      if (!this.world.grid.walkable(pos.x, pos.z)) pos.copy(enemy.pos);
      pos.y = 0;
      const e = new Enemy(this, scaleEnemy(base, floor), pos);
      e.raisedBy = enemy.uid; // vínculo para debilitarlos al morir el invocador
      e.aggroed = true;
      this.enemies.push(e);
      this.entityGroup.add(e.group);
    }
    this.spawnRing(enemy.pos.clone(), 1.8, 0x66ff88);
    this.spawnBurst(enemy.pos, 0x66ff88, 8);
    this.sfx('eshoot');
  },

  // Acólito: cura a un aliado herido cercano con un haz visible. Contrajuego:
  // enfocar al acólito (es frágil) para cortar la curación.
  enemyHeal(enemy) {
    let best = null, bd = 7 * 7;
    for (const e of this.enemies) {
      if (e === enemy || !e.alive || e.def.boss) continue;
      if (e.hp >= e.maxHP) continue;
      const dd = e.pos.distanceToSquared(enemy.pos);
      if (dd < bd) { bd = dd; best = e; }
    }
    if (!best) return;
    const heal = Math.round(best.maxHP * 0.18);
    best.hp = Math.min(best.maxHP, best.hp + heal);
    const fg = best.group.userData.barFg;
    if (fg) { fg.scale.x = Math.max(0.001, best.hp / best.maxHP); fg.position.x = -0.43 * (1 - fg.scale.x); }
    // haz visible entre acólito y aliado curado
    this.spawnBeam(enemy.pos.clone().setY(1.1), best.pos.clone().setY(1.1), 0x88ffcc);
    this.ui.spawnText(best.pos.clone().setY(best.def.scale + 0.5), `+${heal}`, 'txt-heal');
    this.sfx('skill');
  },

  // Francotirador del Vacío: línea de aviso de largo alcance; tras ~1s dispara un
  // proyectil rápido por esa línea (lo dispara Enemy.update). Contrajuego: romper
  // visión / esquivar tras ver la línea.
  enemySnipe(enemy, target) {
    const dir = target.clone().sub(enemy.pos); dir.y = 0;
    const l = Math.hypot(dir.x, dir.z) || 1;
    const nx = dir.x / l, nz = dir.z / l;
    const end = enemy.pos.clone().add(new THREE.Vector3(nx, 0, nz).multiplyScalar(16));
    this.spawnBeam(enemy.pos.clone().setY(1.0), end.setY(1.0), 0xcc66ff, 1.0); // línea de aviso
    enemy.snipeDir = { nx, nz };
    enemy.snipeFireT = 1.0; // Enemy.update dispara al agotarse
    this.sfx('eshoot');
  },

  // dispara el proyectil cargado del francotirador (llamado por Enemy.update)
  fireSnipe(enemy) {
    const d = enemy.snipeDir;
    if (!d) return;
    const to = enemy.pos.clone().add(new THREE.Vector3(d.nx, 0, d.nz).multiplyScalar(16));
    this.spawnProjectile({
      from: enemy.pos.clone().setY(1.0), to: to.setY(1.0),
      speed: enemy.def.projSpeed || 22, range: 17,
      dmg: enemy.def.dmg, friendly: false, color: enemy.def.projColor || 0xcc66ff, size: 0.2,
      attackerLevel: enemy.def.level || 1,
    });
    enemy.snipeDir = null;
    this.sfx('eshoot');
  },

  // afijo Encarcelador: telegrafía un anillo bajo el jugador; si sigue dentro al
  // llenarse, lo enraíza brevemente (SLOW fuerte y corto, sin stun).
  enemyJail(enemy, pos) {
    this.spawnTelegraph(pos, 1.8, 0.8, 0, enemy.def.level || 1, {
      onDone: (at) => {
        const p = this.player;
        if (p && p.alive && p.pos.distanceTo(at) <= 2.0) {
          p.slowT = Math.max(p.slowT, 1.4); p._slowTotal = 1.4;
          this.ui.message('⛓️ ¡Apresado! Ralentizado un instante', 1200);
        }
        const mesh = new THREE.Mesh(new THREE.RingGeometry(1.5, 1.8, 24),
          new THREE.MeshBasicMaterial({ color: 0x66ffcc, transparent: true, opacity: 0.5, side: THREE.DoubleSide }));
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.copy(at).setY(0.05);
        this.fxGroup.add(mesh);
        this.firePools.push({ mesh, t: 0, dur: 1.4, radius: 0, tick: 99 });
      },
    });
    this.sfx('eshoot');
  },

  // afijo Vórtice: tirón único hacia el enemigo, telegrafiado con un anillo. Solo
  // ocurre una vez por enemigo (no encadenable). Respeta los muros.
  enemyVortex(enemy) {
    const p = this.player;
    if (!p || !p.alive) return;
    this.spawnRing(enemy.pos.clone(), 2.5, 0x9966ff);
    const dir = enemy.pos.clone().sub(p.pos); dir.y = 0;
    const l = Math.hypot(dir.x, dir.z) || 1;
    const pull = Math.min(3.0, l - 1.5);
    if (pull > 0) {
      const nx = dir.x / l, nz = dir.z / l;
      const tx = p.pos.x + nx * pull, tz = p.pos.z + nz * pull;
      if (this.world.grid.walkable(tx, tz, 0.32)) { p.pos.x = tx; p.pos.z = tz; }
    }
    this.ui.message('🌀 ¡Te arrastra el Vórtice!', 1200);
    this.sfx('eshoot');
  },

  // afijo Escudado: cáscara visible de inmunidad temporal sobre el enemigo.
  enemyShield(enemy) {
    if (!enemy.shieldShell) {
      const shell = new THREE.Mesh(new THREE.SphereGeometry(0.85, 12, 10),
        new THREE.MeshBasicMaterial({ color: 0xffee88, transparent: true, opacity: 0.3, side: THREE.DoubleSide }));
      shell.position.y = 0.9;
      enemy.group.add(shell);
      enemy.shieldShell = shell;
    }
    enemy.shieldShell.visible = true;
    this.spawnRing(enemy.pos.clone(), 1.4, 0xffee88);
    this.sfx('skill');
  },

  // Embestidor: línea de aviso de la carga inminente (ventana de escape).
  enemyChargeWarn(enemy, dir, len) {
    const end = enemy.pos.clone().add(new THREE.Vector3(dir.x, 0, dir.z).multiplyScalar(len));
    this.spawnBeam(enemy.pos.clone().setY(0.3), end.setY(0.3), 0xff5533, 1.0);
    // polvo bajo las patas anunciando la carga (telegrafía física)
    this.emitFx(ENEMY_FX.chargeWindup, enemy.pos.clone().setY(0.15));
    this.sfx('eshoot');
  },

  // Embestidor: polvo al impactar contra el jugador durante el dash.
  enemyChargeImpact(pos) {
    this.emitFx(ENEMY_FX.chargeImpact, (pos.clone?.() ?? pos).setY?.(0.3) ?? pos);
  },

  // Golpe pesado (slam): onda de polvo + esquirlas en el punto de impacto.
  enemySlamFx(pos) {
    const at = (pos.clone?.() ?? pos);
    if (at.setY) at.setY(0.2);
    this.emitFx(ENEMY_FX.slam, at);
    this.emitFx(ENEMY_FX.slamSpark, at);
  },

  // Aura de escarcha: niebla fría pulsante + esquirlas ascendentes (pulso ~0.6s,
  // disparado por Enemy.update mientras el aura está activa).
  enemyFrostAuraPulse(pos) {
    const at = (pos.clone?.() ?? pos);
    if (at.setY) at.setY(0.4);
    this.emitFx(ENEMY_FX.frostAura, at);
    this.emitFx(ENEMY_FX.frostMotes, at);
  },

  // Aura de exaltación (rally): destellos ascendentes sobre un aliado animado.
  enemyRallyFx(pos) {
    const at = (pos.clone?.() ?? pos);
    if (at.setY) at.setY(0.5);
    this.emitFx(ENEMY_FX.rallyAura, at);
  },

  // Teletransporte de brujo: implosión en el origen, aparición en el destino.
  enemyBlinkFx(fromPos, toPos) {
    const a = (fromPos.clone?.() ?? fromPos); if (a.setY) a.setY(0.8);
    const b = (toPos.clone?.() ?? toPos); if (b.setY) b.setY(0.8);
    this.emitFx(ENEMY_FX.blinkOut, a);
    this.emitFx(ENEMY_FX.blinkIn, b);
  },

  // Ataque cuerpo a cuerpo del enemigo: chispa breve en el punto de golpe.
  enemyMeleeFx(pos) {
    const at = (pos.clone?.() ?? pos);
    if (at.setY) at.setY(1.0);
    this.emitFx(ENEMY_FX.meleeHit, at);
  },

  // Sembrador de Esporas (splitter): al morir deja un saco telegrafiado en el
  // suelo; tras ~1.5s revienta en 3 crías. Hay ventana de escape (marca visible).
  spawnSporeSack(pos, floor) {
    // marca de suelo (saco) que avisa antes de reventar
    const sack = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0x9ad86a, transparent: true, opacity: 0.7 }));
    sack.position.copy(pos).setY(0.4);
    this.fxGroup.add(sack);
    this.firePools.push({ mesh: sack, t: 0, dur: 1.5, radius: 0, tick: 99 });
    this.spawnTelegraph(pos.clone(), 1.4, 1.5, 0, 1, {
      onDone: (at) => {
        const base = ENEMIES.find(e => e.id === 'cria_espora');
        for (let i = 0; i < 3; i++) {
          const a = Math.PI * 2 * i / 3;
          const cp = at.clone().add(new THREE.Vector3(Math.sin(a) * 0.9, 0, Math.cos(a) * 0.9));
          if (!this.world.grid.walkable(cp.x, cp.z)) cp.copy(at);
          cp.y = 0;
          const e = new Enemy(this, scaleEnemy(base, floor), cp);
          e.aggroed = true;
          this.enemies.push(e);
          this.entityGroup.add(e.group);
        }
        this.spawnBurst(at, 0x9ad86a, 8);
      },
    });
  },

  // goblin cargado: deja caer una moneda al huir (botín gratis del reguero)
  goblinGoldDrip(enemy) {
    const floor = this.world.scaleFloor || this.world.floor || 1;
    this.spawnGroundItem(makeGold(Math.max(1, floor - 1)), enemy.pos);
  },
};
