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
// Talentos REALES (formato v2, docs/paso2-implementacion.md §3.2) y su indicador
//   const h = makeHarness({ classId: 'guerrero', spec: 'berserker', level: 50,
//                           talents: { cls: { c1: 2 }, sp: { berserker: { b4: 1 } }, choice: { c5: 'B' },
//                                      hero: { berserker: { tree: 'h1', nodes: { h1: { t1: 1 } }, choice: {} } } } });
//   (`talents.specRanks` = rangos de la especialización activa: atajo de `sp: { [spec]: … }`. `talents.spec`
//   como OBJETO es el mismo atajo, @deprecated (los tests v1); como CADENA es el id de la especialización
//   del estado v2, que se puede pasar tal cual: tiene que coincidir con `spec` si se dan los dos)
//   Una build de los datos, llenada punto a punto al nivel con buildRanks (clase, especialización y
//   árbol héroe si el Paragon se abre): build = clave de <CLASE>_TALENTS.builds, el objeto build o
//   true (= defaultBuild de la especialización). `talents` se suma encima (rangos y elecciones; el árbol
//   héroe se FUSIONA nodo a nodo con el de la build).
//   const h = makeHarness({ classId: 'maga', spec: 'piromante', level: 100, build: true });
//   h.gauge('sed', 100);        // fija el indicador (dispara onGauge 'gain'/'full' y su descarga)
//   h.gaugeValue('sed');  h.gaugeView();
//   powers/tv extra (sin nodos): p.talentExtra (lo suma Player.recompute).
// Paso 2c.2: aliados del cooperativo con el contrato del núcleo
//   const a = h.ally(3, 0, 1000);   // en g.party; a.takeDamage(n) → g.damageAlly (⑫)
//   KillInfo.status con killStatus(e) de game-skills.js (bleeding/burning/poisoned reales)
// Paso 2 (verbos, §3.6): habilidades y forja SINTÉTICAS sobre una copia de la clase
//   const h = makeHarness({ classId: 'guerrero', level: 30, inject: { skills: [def…], forge: { id: entrada } } });
//   h.press('rmb'); h.step(0.5); h.release('rmb');  // carga y suelta (entrada controlada)
//   h.hold('k2', 1.0);                               // pulsa, mantiene 1 s y suelta
//   h.walk({ x: 1, z: 0 }, 0.5); h.stand(1);         // caminar / quedarse quieto
//   h.sfxCount('verb_perfect'); h.g.sfxLog           // espía de sonidos (nombre + simT)
//   g.clockNow() = reloj de simulación en ms (la suelta se mide sin reloj de pared)
import * as THREE from 'three';
import { Player, Enemy, Projectile } from '../../js/entities.js';
import { TickScheduler } from '../../js/timers.js';
import { skillMethods, killStatus } from '../../js/game-skills.js';
import { fieldMethods } from '../../js/field-entities.js';
import { firePower } from '../../js/powers.js';
import { createRng } from '../../js/rng.js';
import { normalizeTalents, buildRanks, defaultBuildKey, talentTreesFor } from '../../js/talents.js';
import { setGauge, gaugeValue, gaugeView, gaugeState } from '../../js/spec-mechanics.js';
import { ENEMIES, scaleEnemy, ENEMY_RANKS, CLASSES } from '../../js/data.js';
import { normalizeSkillDef } from '../../js/skill-defs.js';

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
    ui, state: 'play', settings: {}, _paused: false, sfxLog: [], _clockMs: 0,
    // 🖱️Der NO mantenido por defecto (si no, el básico cederá el turno a la gastadora
    // de 🖱️Der: regla de los dos botones del Paso 2b.2); h.g.input.mouseHeld.r = true lo simula
    input: { joyDir: null, keyDir: null, mouseWorld: null, mouseHeld: { l: true, r: false }, held: () => true },
    world: { grid: { walkable: () => true, lineOfSight: () => true } },
    enemies: [], projectiles: [], fx: [], kills: [],
    timers: new TickScheduler(),
    rng: createRng(seed),
    sfx(name) { this.sfxLog.push({ name, t: this.player?.simT || 0 }); }, emitFx() {}, addShake() {},
    // reloj de simulación en ms (game-skills lo usa en lugar del de pared para medir la suelta)
    clockNow() { return this._clockMs; },
    // fuera de combate por defecto (forja y respec gratis); h.g.combatFree = false lo bloquea
    canRespecFree() { return this.combatFree !== false; }, vibrate() {}, tip() {}, spawnBurst() {}, spawnRing() {}, spawnBeam() {},
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
      this._clockMs += dt * 1000;
      // con la entrada controlada (h.press), el MISMO bucle de botones mantenidos que Game.tick
      if (this.input._ctl && p) this.pumpHeldSlots();
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

// copia de la clase con habilidades y forja inyectadas (no toca CLASSES)
function injectClass(classId, inject) {
  const base = CLASSES[classId];
  const extra = (inject.skills || []).map(d => normalizeSkillDef({ icon: '🧪', desc: 'prueba', elem: 'physical', req: 1, ...d }));
  const ids = new Set(extra.map(s => s.id));
  return { ...base, skills: [...base.skills.filter(s => !ids.has(s.id)), ...extra], forge: { ...(base.forge || {}), ...(inject.forge || {}) } };
}
const SLOT_ACTION = { k1: 'skill1', k2: 'skill2', k3: 'skill3', k4: 'skill4' };

// estado v2 de talentos para el arnés: build (buildRanks al nivel) + talents encima
function harnessTalents(classId, level, spec, build, talents) {
  const t = talents || {};
  // talents.spec: cadena = id de la especialización (estado v2); objeto = atajo de rangos (@deprecated, = specRanks)
  if (typeof t.spec === 'string') {
    if (spec && t.spec !== spec) throw new Error(`makeHarness: spec «${spec}» y talents.spec «${t.spec}» no coinciden`);
    spec = t.spec;
  } else if (t.spec != null && (typeof t.spec !== 'object' || Array.isArray(t.spec))) {
    throw new Error('makeHarness: talents.spec es el id de la especialización (cadena) o, @deprecated, sus rangos (objeto): usa talents.specRanks');
  }
  const specRanks = t.specRanks || (t.spec && typeof t.spec === 'object' ? t.spec : null);
  const out = { v: 2, spec: spec || null, cls: {}, sp: {}, choice: {}, hero: {} };
  if (build) {
    const key = build === true ? defaultBuildKey(classId, spec) : build;
    const b = typeof key === 'string' ? talentTreesFor(classId)?.builds?.[key] : key;
    if (!b || typeof b !== 'object') throw new Error(`makeHarness: la build «${key}» no existe en ${classId}`);
    if (spec && b.sp !== spec) throw new Error(`makeHarness: la build «${key}» es de ${b.sp}, no de ${spec}`);
    out.spec = b.sp;
    const r = buildRanks({ classId, level, talents: { v: 2, spec: b.sp } }, b, { level });
    Object.assign(out, { cls: r.cls, sp: r.sp, choice: r.choice, hero: r.hero ? { [b.sp]: r.hero } : {} });
  }
  const sp = out.spec;
  Object.assign(out.cls, t.cls || {});
  for (const [id, ranks] of Object.entries(t.sp || {})) out.sp[id] = { ...(out.sp[id] || {}), ...ranks };
  if (specRanks && Object.keys(specRanks).length) {
    if (!sp) throw new Error('makeHarness: talents.specRanks necesita una especialización (spec o build)');
    out.sp[sp] = { ...(out.sp[sp] || {}), ...specRanks };
  }
  Object.assign(out.choice, t.choice || {});
  // árbol héroe: se fusiona con el de la build (nodos y elecciones por árbol), no lo sustituye
  for (const [s, h] of Object.entries(t.hero || {})) {
    const base = out.hero[s] || {};
    const nodes = { ...(base.nodes || {}) }, choice = { ...(base.choice || {}) };
    for (const [tree, ranks] of Object.entries(h?.nodes || {})) nodes[tree] = { ...(nodes[tree] || {}), ...ranks };
    for (const [tree, ch] of Object.entries(h?.choice || {})) choice[tree] = { ...(choice[tree] || {}), ...ch };
    out.hero[s] = { ...base, ...h, nodes, choice };
  }
  return out;
}

export function makeHarness({ classId = 'guerrero', level = 1, powers = [], seed = 7, tv = null, spec = null, build = null, talents = null, inject = null } = {}) {
  const g = makeGame({ seed });
  const p = new Player(g, classId);
  if (inject) p.cls = injectClass(classId, inject);
  g.player = p;
  p.combatRng = createRng(seed).fork('combate');
  p.level = level;
  // talentos REALES (v2: especialización, rangos, elecciones y árbol héroe) y poderes/tv extra
  // (p.talentExtra). Sin nivel en normalizeTalents: un test puede montar rangos a mano que el
  // nivel no daría (la build sí sale legal punto a punto)
  if (spec || talents || build) p.talents = normalizeTalents(harnessTalents(classId, level, spec, build, talents), classId);
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
    // ---- entrada controlada (Paso 2): la 1.ª llamada pasa de «todo mantenido» a teclas reales
    control() {
      const inp = g.input;
      if (inp._ctl) return inp;
      inp._ctl = true; inp._keys = new Set(); inp.mouseHeld = { l: false, r: false };
      inp.held = a => inp._keys.has(a);
      return inp;
    },
    setHeld(slot, on) {
      const inp = this.control();
      if (slot === 'lmb') inp.mouseHeld.l = on;
      else if (slot === 'rmb') inp.mouseHeld.r = on;
      else if (on) inp._keys.add(SLOT_ACTION[slot]); else inp._keys.delete(SLOT_ACTION[slot]);
    },
    press(slot) { this.setHeld(slot, true); return g.castSkillSlot(slot); },
    release(slot) { this.setHeld(slot, false); return g.releaseSkillSlot(slot); },
    hold(slot, sec, dt = 1 / 60) { const ok = this.press(slot); this.step(sec, dt); this.release(slot); return ok; },
    walk(dir, sec = 1, dt = 1 / 60) {
      const l = Math.hypot(dir.x, dir.z) || 1;
      g.input.keyDir = { x: dir.x / l, z: dir.z / l };
      this.step(sec, dt);
      g.input.keyDir = null;
    },
    stand(sec = 1, dt = 1 / 60) { g.input.keyDir = null; this.step(sec, dt); },
    sfxCount(name) { return g.sfxLog.filter(x => x.name === name).length; },
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
