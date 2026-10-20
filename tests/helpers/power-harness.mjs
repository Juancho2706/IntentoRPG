// ============================================================
// Arnés para probar PODERES y HABILIDADES de forma aislada (Paso 2b.0, §9.1.5)
// ============================================================
// Usa un Player REAL (headless), un TickScheduler REAL, el registro de campos
// REAL (sin dibujar: no hay fxGroup), el canal de lanzamiento REAL
// (js/game-skills.js) y el despachador REAL de poderes (js/powers.js). La UI es
// falsa (cuenta mensajes), sfx/emitFx no hacen nada y el azar va con semilla.
//
//   import { makeHarness } from './helpers/power-harness.mjs';
//   const h = makeHarness({ classId: 'guerrero', level: 50, powers: ['festin'], seed: 7 });
//   const e = h.enemy({ hp: 1000, rank: 'elite' });   // Enemy real (applyCC, Debilidad…)
//   h.hit(e, { skill: 'g_tajo', crit: true, dealt: 120 }); // pasa por ⑤ con el despachador real
//   h.tick(1.0);                                         // 10 ticks de 0,1 s (onTick a 10 Hz)
//   h.setSlot('rmb', 'torbellino'); h.cast('rmb'); h.step(0.5);
//   h.sustained();                                       // vida curada por la cubeta de sustento
// Paso 2c.0: talentos REALES y su indicador
//   const h = makeHarness({ classId: 'guerrero', spec: 'berserker', level: 50,
//                           talents: { spec: { s14: 1 }, cls: { c1: 2 }, choice: { c5: 'B' } } });
//   h.gauge('sed', 100);        // fija el indicador (dispara onGauge 'gain'/'full' y su descarga)
//   h.gaugeValue('sed');  h.gaugeView();
//   powers/tv extra (sin nodos): p.talentExtra (lo suma Player.recompute).
// Paso 2c.2: aliados del cooperativo con el contrato del núcleo
//   const a = h.ally(3, 0, 1000);   // en g.party; a.takeDamage(n) → g.damageAlly (⑫)
//   KillInfo.status con killStatus(e) de game-skills.js (bleeding/burning/poisoned reales)
import * as THREE from 'three';
import { Player, Enemy, Projectile } from '../../js/entities.js';
import { TickScheduler } from '../../js/timers.js';
import { skillMethods, killStatus } from '../../js/game-skills.js';
import { fieldMethods } from '../../js/field-entities.js';
import { firePower } from '../../js/powers.js';
import { createRng } from '../../js/rng.js';
import { normalizeTalents } from '../../js/talents.js';
import { setGauge, gaugeValue, gaugeView, gaugeState } from '../../js/spec-mechanics.js';
import { ENEMIES, scaleEnemy, ENEMY_RANKS } from '../../js/data.js';

globalThis.performance = globalThis.performance || { now: () => Date.now() };

// juego falso con los mixins REALES de habilidades y campos
export function makeGame({ seed = 7 } = {}) {
  const ui = {
    messages: [], texts: 0,
    message(m) { this.messages.push(String(m)); },
    spawnText() { this.texts++; }, flashDamage() {}, refreshHotbar() {}, levelUpFlash() {},
    updateHUD() {}, refreshSkillsView() {},
  };
  const g = {
    ui, state: 'play', settings: {}, _paused: false,
    // 🖱️Der NO mantenido por defecto (si no, el básico cederá el turno a la gastadora
    // de 🖱️Der: regla de los dos botones del Paso 2b.2); h.g.input.mouseHeld.r = true lo simula
    input: { joyDir: null, keyDir: null, mouseWorld: null, mouseHeld: { l: true, r: false }, held: () => true },
    world: { grid: { walkable: () => true, lineOfSight: () => true } },
    enemies: [], projectiles: [], fx: [], kills: [],
    timers: new TickScheduler(),
    rng: createRng(seed),
    sfx() {}, emitFx() {}, addShake() {}, vibrate() {}, tip() {}, spawnBurst() {}, spawnRing() {}, spawnBeam() {},
    hitStop() {}, save() {}, onPlayerDeath() { this.dead = true; },
    spawnProjectile(o) { this.projectiles.push(new Projectile(this, o)); },
    nearestEnemy(maxDist = 10, from = null) {
      const origin = from || this.player.pos;
      let best = null, bd = maxDist * maxDist;
      for (const e of this.enemies) {
        if (!e.alive) continue;
        const d = e.pos.distanceToSquared(origin);
        if (d < bd) { bd = d; best = e; }
      }
      return best;
    },
    // ⑥ réplica mínima de Game.onEnemyKilled (main.js no se importa headless):
    // KillInfo + guarda `nested` + loot.goldMul, con el despachador REAL
    onEnemyKilled(e) {
      const p = this.player;
      const kill = { skill: e._lastSkill || null, tags: e._lastTags || new Set(), crit: !!e._lastCrit, overkill: Math.max(0, -e.hp),
        nested: !!this._killBurst, loot: { goldMul: 1 },
        status: killStatus(e) };
      this.kills.push({ e, kill });
      const was = !!this._killBurst;
      this._killBurst = true;
      try { firePower('onKill', p, this, p, e, kill); } finally { this._killBurst = was; }
    },
    // avanza la simulación como Game.tick (sin render)
    step(dt) {
      const p = this.player;
      if (p) p.update(dt);
      this.updateFields(dt);
      this.timers.tick(dt);
      for (const e of this.enemies) if (e.alive) { e.tickStun(dt); if (e.vulnT > 0) e.vulnT -= dt; if (e.slowT > 0) e.slowT -= dt; }
      for (let i = this.projectiles.length - 1; i >= 0; i--) if (this.projectiles[i].update(dt)) this.projectiles.splice(i, 1);
    },
  };
  Object.assign(g, skillMethods, fieldMethods);
  return g;
}

export function makeHarness({ classId = 'guerrero', level = 1, powers = [], seed = 7, tv = null, spec = null, talents = null } = {}) {
  const g = makeGame({ seed });
  const p = new Player(g, classId);
  g.player = p;
  p.combatRng = createRng(seed).fork('combate');
  p.level = level;
  // talentos REALES (especialización + rangos) y poderes/tv extra (p.talentExtra)
  if (spec || talents) {
    const raw = { spec, cls: talents?.cls || {}, sp: spec ? { [spec]: talents?.spec || {} } : {}, choice: talents?.choice || {} };
    p.talents = normalizeTalents(raw, classId);
  }
  p.talentExtra = { powers: new Set(powers), tv: tv || {}, mods: {}, skillLv: {}, grants: new Set() };
  p.recompute();
  p.hp = p.stats.maxHP;
  p.mp = p.cls.resource?.start === 0 ? 0 : p.stats.maxMP;
  p.pos.set(0, 0, 0);

  const h = {
    g, p,
    // Enemy REAL (con applyCC/applyWeakness/takeDamage → ⑤). rank: null|'campeon'|'elite'; boss: jefe
    enemy({ hp = 1000, rank = null, boss = false, pos = [2, 0, 0], def = null } = {}) {
      const base = def || ENEMIES[0];
      const d = { ...scaleEnemy(base, 1), hp };
      if (rank) Object.assign(d, { rank, ...(ENEMY_RANKS[rank] ? {} : {}) });
      if (boss) d.boss = true;
      const e = new Enemy(g, d, new THREE.Vector3(pos[0], pos[1] || 0, pos[2] || 0));
      e.maxHP = e.hp = hp;
      g.enemies.push(e);
      return e;
    },
    // pasa un impacto por ⑤ (Game.onPlayerHit) con el despachador REAL
    hit(e, { skill = null, crit = false, dealt = 100, tags = [], elem = null, proc = false, dot = false } = {}) {
      const hit = { dealt, raw: dealt, crit, skill, tags: new Set(tags), elem, proc, dot, source: proc ? 'proc' : 'hit', pos: { x: e.pos.x, z: e.pos.z } };
      g.onPlayerHit(e, hit);
      return hit;
    },
    // pasos de 0,1 s (onTick de los poderes va a 10 Hz)
    tick(sec = 1) { for (let t = 0; t < sec - 1e-9; t += 0.1) g.step(0.1); },
    // pasos finos (proyectiles, windups)
    step(sec = 1, dt = 1 / 60) { for (let t = 0; t < sec - 1e-9; t += dt) g.step(dt); },
    setSlot(slot, id) { p.hotbar[slot] = id; },
    cast(slot) { return g.castSkillSlot(slot); },
    aim(x, z) { g.input.mouseWorld = new THREE.Vector3(x, 0, z); },
    addPowers(...ids) { for (const id of ids) p.talentExtra.powers.add(id); p.recompute(); },
    // aliado del cooperativo (contrato de g.allies, §6): entra en g.party; su daño va por
    // g.damageAlly (⑫ onAllyDamaged / onAllyLethal) como el de un jugador remoto
    ally(x = 3, z = 0, maxHP = 1000, extra = {}) {
      const a = {
        pos: new THREE.Vector3(x, 0, z), alive: true, hp: maxHP, stats: { maxHP, healPct: 0 }, buffs: [], shields: [], healed: 0,
        addBuff(id, stats, dur) { this.buffs = this.buffs.filter(b => b.id !== id); this.buffs.push({ id, stats, t: dur, dur }); },
        healSkill(n) { const b = this.hp; this.hp = Math.min(this.stats.maxHP, this.hp + n); this.healed += this.hp - b; return this.hp - b; },
        sustain(n) { return this.healSkill(n); },
        addShield(n, dur, src) { this.shields.push({ amt: n, t: dur, src }); return n; },
        setHp(v) { this.hp = Math.max(0, Math.min(this.stats.maxHP, v)); return this.hp; },
        grantInvuln(s) { this.invulnT = s; },
        takeDamage(n, al, opts) { return g.damageAlly(this, n, opts); },
        ...extra,
      };
      (g.party || (g.party = [])).push(a);
      return a;
    },
    sustained() { return p._sustained || 0; },
    messages() { return g.ui.messages; },
    // indicador de especialización (spec-mechanics): fija el valor por gainGauge/drainGauge
    gauge(id, n, e = null) { return setGauge(p, id, n, e); },
    gaugeValue(id, e = null) { return gaugeValue(p, id, e); },
    gaugeState(id, e = null) { return gaugeState(p, id, e); },
    gaugeView(opts) { return gaugeView(p, opts); },   // v2 (2d.2): opts.target = enemigo bajo el cursor
  };
  return h;
}
