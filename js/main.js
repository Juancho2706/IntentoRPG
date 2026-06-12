// ============================================================
// IntentoRPG — ARPG isométrico estilo Diablo 2 (Three.js)
// ============================================================
import * as THREE from 'three';
import { ENEMIES, MIMIC, bossForFloor, scaleEnemy, pickEnemyDef, rollEnemyRank, skillVal, synergyBonus, TIER_LEVELS, SHOP_REFRESH_MS, generateQuest, PET_PRICE } from './data.js';
import { buildTown, buildDungeon } from './world.js';
import { Player, Enemy, Projectile, Pet } from './entities.js';
import { rollDrops, makeGold, generateItem, gambleItem, RARITIES } from './items.js';
import { UI } from './ui.js';

const SAVE_KEY = 'intentorpg_save_v1';

// ------------------------------------------------------------
// Sonido: pequeño sintetizador con WebAudio
// ------------------------------------------------------------
function createSfx() {
  let ctx = null;
  const ensure = () => {
    if (!ctx) try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { /* sin audio */ }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  };
  window.addEventListener('pointerdown', ensure, { once: true });
  const tones = {
    hit:     [{ f: 160, d: 0.08, type: 'square', v: 0.12 }],
    shoot:   [{ f: 700, d: 0.07, type: 'sawtooth', v: 0.06, slide: -400 }],
    eshoot:  [{ f: 300, d: 0.12, type: 'sawtooth', v: 0.07, slide: -150 }],
    hurt:    [{ f: 120, d: 0.15, type: 'square', v: 0.13, slide: -60 }],
    potion:  [{ f: 500, d: 0.1, type: 'sine', v: 0.12, slide: 300 }],
    gold:    [{ f: 900, d: 0.06, type: 'sine', v: 0.1 }, { f: 1300, d: 0.08, type: 'sine', v: 0.08, t: 0.05 }],
    pickup:  [{ f: 600, d: 0.08, type: 'triangle', v: 0.1, slide: 200 }],
    levelup: [{ f: 440, d: 0.12, type: 'sine', v: 0.14 }, { f: 660, d: 0.12, type: 'sine', v: 0.14, t: 0.12 }, { f: 880, d: 0.2, type: 'sine', v: 0.14, t: 0.24 }],
    death:   [{ f: 200, d: 0.5, type: 'sawtooth', v: 0.12, slide: -150 }],
    portal:  [{ f: 300, d: 0.3, type: 'sine', v: 0.12, slide: 500 }],
    chest:   [{ f: 350, d: 0.1, type: 'triangle', v: 0.12 }, { f: 700, d: 0.15, type: 'triangle', v: 0.1, t: 0.1 }],
    skill:   [{ f: 520, d: 0.1, type: 'sawtooth', v: 0.09, slide: 250 }],
  };
  return (name) => {
    const c = ensure();
    const def = tones[name];
    if (!c || !def) return;
    for (const n of def) {
      const o = c.createOscillator(), gn = c.createGain();
      o.type = n.type;
      const t0 = c.currentTime + (n.t || 0);
      o.frequency.setValueAtTime(n.f, t0);
      if (n.slide) o.frequency.linearRampToValueAtTime(Math.max(40, n.f + n.slide), t0 + n.d);
      gn.gain.setValueAtTime(n.v, t0);
      gn.gain.exponentialRampToValueAtTime(0.001, t0 + n.d);
      o.connect(gn).connect(c.destination);
      o.start(t0); o.stop(t0 + n.d + 0.02);
    }
  };
}

// ------------------------------------------------------------
// Entrada: ratón, teclado y joystick táctil
// ------------------------------------------------------------
class Input {
  constructor(game) {
    this.game = game;
    this.joyDir = null;     // {x,z} desde el joystick táctil
    this.keyDir = null;     // {x,z} desde WASD/flechas
    this.mouseWorld = null; // último punto del mundo bajo el ratón
    this.pointerDown = false;
    this.keys = new Set();
    this.joyId = null;

    const canvas = game.renderer.domElement;
    canvas.addEventListener('pointerdown', e => this.onPointerDown(e));
    window.addEventListener('pointermove', e => this.onPointerMove(e));
    window.addEventListener('pointerup', e => this.onPointerUp(e));
    window.addEventListener('contextmenu', e => e.preventDefault());

    window.addEventListener('keydown', e => {
      if (e.repeat) return;
      this.keys.add(e.code);
      this.updateKeyDir();
      const g = this.game;
      if (e.code === 'KeyI') g.ui.togglePanel('inv');
      if (e.code === 'KeyT') g.ui.togglePanel('skills');
      if (e.code === 'KeyC') g.ui.togglePanel('stats');
      if (e.code === 'KeyQ') { g.player?.usePotion('hp'); }
      if (e.code === 'KeyE') { g.player?.usePotion('mp'); }
      if (e.code === 'Space') { e.preventDefault(); g.attackNearest(); }
      if (e.code === 'Escape') g.ui.closePanel();
      if (e.code.startsWith('Digit')) {
        const n = parseInt(e.code.slice(5));
        if (n >= 1 && n <= 4) g.castSkillSlot(n - 1);
      }
    });
    window.addEventListener('keyup', e => { this.keys.delete(e.code); this.updateKeyDir(); });

    // joystick táctil: aparece al tocar la mitad izquierda.
    // El seguimiento y el fin del gesto se escuchan en window para no
    // perder el pointerup si el dedo termina sobre otro elemento del HUD.
    const zone = document.getElementById('joy-zone');
    zone.addEventListener('pointerdown', e => {
      if (this.joyId !== null) return;
      e.preventDefault();
      this.joyId = e.pointerId;
      this.joyOrigin = { x: e.clientX, y: e.clientY };
      const joy = document.getElementById('joystick');
      joy.classList.remove('hidden');
      joy.style.left = e.clientX + 'px';
      joy.style.top = e.clientY + 'px';
    });
    window.addEventListener('pointermove', e => {
      if (e.pointerId !== this.joyId) return;
      let dx = e.clientX - this.joyOrigin.x, dy = e.clientY - this.joyOrigin.y;
      const len = Math.hypot(dx, dy);
      const max = 48;
      if (len > max) { dx = dx / len * max; dy = dy / len * max; }
      document.getElementById('joy-knob').style.transform = `translate(${dx}px, ${dy}px)`;
      if (len > 10) {
        // convertir dirección de pantalla a dirección de mundo (cámara isométrica girada 45°)
        const wx = (dx + dy) * 0.7071, wz = (dy - dx) * 0.7071;
        const wl = Math.hypot(wx, wz) || 1;
        this.joyDir = { x: wx / wl, z: wz / wl };
      } else this.joyDir = null;
    });
    const endJoy = e => {
      if (e && e.pointerId !== undefined && e.pointerId !== this.joyId) return;
      this.joyId = null;
      this.joyDir = null;
      document.getElementById('joystick').classList.add('hidden');
      document.getElementById('joy-knob').style.transform = '';
    };
    window.addEventListener('pointerup', endJoy);
    window.addEventListener('pointercancel', endJoy);
    window.addEventListener('blur', () => endJoy());
    document.addEventListener('visibilitychange', () => { if (document.hidden) endJoy(); });
  }

  updateKeyDir() {
    let x = 0, z = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) { x -= 1; z -= 1; }
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) { x += 1; z += 1; }
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) { x -= 1; z += 1; }
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) { x += 1; z -= 1; }
    const l = Math.hypot(x, z);
    this.keyDir = l > 0 ? { x: x / l, z: z / l } : null;
  }

  raycast(e) {
    const g = this.game;
    const ndc = new THREE.Vector2(
      (e.clientX / window.innerWidth) * 2 - 1,
      -(e.clientY / window.innerHeight) * 2 + 1
    );
    g.raycaster.setFromCamera(ndc, g.camera);
    return g.raycaster;
  }

  groundPoint(e) {
    const ray = this.raycast(e).ray;
    const t = -ray.origin.y / ray.direction.y;
    if (!isFinite(t) || t < 0) return null;
    return ray.origin.clone().addScaledVector(ray.direction, t);
  }

  onPointerDown(e) {
    const g = this.game;
    if (!g.player || !g.player.alive || g.state !== 'play') return;
    this.pointerDown = true;
    // ¿tocó un enemigo?
    const ray = this.raycast(e);
    const hits = ray.intersectObjects(g.entityGroup.children, true);
    for (const h of hits) {
      let o = h.object;
      while (o && !o.userData.enemy) o = o.parent;
      if (o && o.userData.enemy && o.userData.enemy.alive) {
        g.player.attackTarget = o.userData.enemy;
        g.player.moveTarget = null;
        return;
      }
    }
    // moverse al punto: solo con ratón (en táctil se camina con el joystick)
    if (e.pointerType !== 'mouse') return;
    const p = this.groundPoint(e);
    if (p) {
      g.player.moveTarget = p;
      g.player.attackTarget = null;
      g.player.pickTarget = null;
    }
  }

  onPointerMove(e) {
    if (e.pointerType === 'mouse') this.mouseWorld = this.groundPoint(e);
    if (this.pointerDown && e.pointerType === 'mouse' && this.game.player?.alive) {
      const p = this.groundPoint(e);
      if (p && this.game.player.moveTarget) this.game.player.moveTarget = p;
    }
  }

  onPointerUp() { this.pointerDown = false; }
}

// ------------------------------------------------------------
// JUEGO
// ------------------------------------------------------------
class Game {
  constructor() {
    this.state = 'select';
    this.enemies = [];
    this.projectiles = [];
    this.groundItems = [];
    this.fx = [];
    this.firePools = [];
    this.nearVendor = false;
    this.portalArmed = true;
    this.healPulse = 0;
    this.saveTimer = 0;
    this.giUid = 1;
    this.sfx = createSfx();

    // renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    document.getElementById('game').appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.entityGroup = new THREE.Group();
    this.lootGroup = new THREE.Group();
    this.fxGroup = new THREE.Group();
    this.scene.add(this.entityGroup, this.lootGroup, this.fxGroup);

    // cámara isométrica ortográfica
    this.frustum = 17;
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
    this.camOffset = new THREE.Vector3(11, 13, 11);
    this.camTarget = new THREE.Vector3();
    this.resize();
    window.addEventListener('resize', () => this.resize());

    // luces
    this.ambient = new THREE.HemisphereLight(0xbbccdd, 0x445544, 0.8);
    this.sun = new THREE.DirectionalLight(0xfff2d8, 2.2);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    this.sun.shadow.camera.left = -22; this.sun.shadow.camera.right = 22;
    this.sun.shadow.camera.top = 22; this.sun.shadow.camera.bottom = -22;
    this.scene.add(this.ambient, this.sun, this.sun.target);
    this.playerLight = new THREE.PointLight(0xffcc88, 0, 11, 1.5);
    this.scene.add(this.playerLight);

    this.raycaster = new THREE.Raycaster();
    this.ui = new UI(this);
    this.input = new Input(this);
    this.clock = new THREE.Clock();

    const hasSave = !!localStorage.getItem(SAVE_KEY);
    this.ui.showClassSelect(hasSave, id => this.startGame(id));

    this.renderer.setAnimationLoop(() => this.tick());
  }

  resize() {
    const aspect = window.innerWidth / window.innerHeight;
    const f = this.frustum;
    this.camera.left = -f * aspect / 2;
    this.camera.right = f * aspect / 2;
    this.camera.top = f / 2;
    this.camera.bottom = -f / 2;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // ---------- inicio / guardado ----------
  startGame(pick, opts = {}) {
    let saved = null;
    if (pick === 'continue') {
      try { saved = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch { saved = null; }
      if (!saved) pick = 'guerrero';
    }
    const classId = saved ? saved.classId : pick;
    this.player = new Player(this, classId, saved);
    if (!saved) {
      // primera habilidad gratis
      const first = this.player.cls.skills[0];
      this.player.skills[first.id] = 1;
      this.player.skillPoints = 0;
      this.player.hardcore = !!opts.hardcore;
    }
    this.scene.add(this.player.group);
    if (this.player.pet) this.spawnPet();
    this.state = 'play';
    this.loadWorld({ type: 'town' });
    this.ui.refreshHotbar();
    this.ui.updateHUD();
    this.ui.message(`${this.player.cls.icon} ¡Bienvenido, ${this.player.cls.name}! Entra al portal del norte para explorar la mazmorra.`, 5000);
    document.getElementById('hud').classList.remove('hidden');
  }

  save() {
    const p = this.player;
    if (!p) return;
    const data = {
      classId: p.classId, level: p.level, xp: p.xp, attributes: p.attributes,
      statPoints: p.statPoints, skillPoints: p.skillPoints, skills: p.skills,
      gold: p.gold, potions: p.potions, inventory: p.inventory, equipment: p.equipment,
      lastFloor: p.lastFloor, hp: Math.round(p.hp), mp: Math.round(p.mp),
      waypoints: p.waypoints, records: p.records, cube: p.cube,
      quest: p.quest, hardcore: p.hardcore, pet: p.pet, dailyDone: p.dailyDone,
    };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch { /* sin almacenamiento */ }
  }

  // ---------- mundo ----------
  loadWorld(spec) {
    // limpiar mundo anterior
    if (this.world) {
      this.scene.remove(this.world.group);
      this.world.group.traverse(o => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose());
      });
    }
    for (const e of this.enemies) this.entityGroup.remove(e.group);
    for (const pr of this.projectiles) this.fxGroup.remove(pr.mesh);
    for (const gi of this.groundItems) this.lootGroup.remove(gi.mesh);
    for (const f of this.fx) this.fxGroup.remove(f.mesh);
    for (const fp of this.firePools) this.fxGroup.remove(fp.mesh);
    this.enemies = []; this.projectiles = []; this.groundItems = []; this.fx = []; this.firePools = [];

    this.world = spec.type === 'town' ? buildTown() : buildDungeon(spec.floor, spec.seed ?? null);
    this.world.daily = !!spec.daily;
    this.scene.add(this.world.group);

    // ambiente
    const w = this.world;
    this.scene.fog = new THREE.Fog(w.fog.color, w.fog.near, w.fog.far);
    this.renderer.setClearColor(w.clearColor);
    this.ambient.intensity = w.ambientIntensity;
    this.ambient.color.setHex(w.ambient);
    this.sun.intensity = w.sun.intensity;
    this.sun.color.setHex(w.sun.color);
    this.playerLight.intensity = w.type === 'dungeon' ? 16 : 0;

    // enemigos (los normales pueden salir Campeón o Élite)
    for (const s of w.spawns) {
      let def;
      if (s.kind === 'boss') {
        def = scaleEnemy(bossForFloor(w.floor), w.floor);
        def.rankLabel = `👹 ${def.name}`;
        def.labelCls = 'lbl-elite';
      } else {
        def = rollEnemyRank(scaleEnemy(pickEnemyDef(w.floor), w.floor), w.floor);
      }
      const enemy = new Enemy(this, def, s.pos);
      this.enemies.push(enemy);
      this.entityGroup.add(enemy.group);
    }

    // jugador
    this.player.pos.copy(w.spawn);
    this.player.moveTarget = this.player.attackTarget = this.player.pickTarget = null;
    this.input.joyDir = null;
    this.portalArmed = false; // los portales se activan al alejarse de todos ellos
    if (w.type === 'dungeon' && !w.daily) this.player.records.maxFloor = Math.max(this.player.records.maxFloor, w.floor);
    if (this.pet) {
      this.pet.pos.copy(w.spawn).add(new THREE.Vector3(0.9, 0, 0.6));
      this.pet.pos.y = 0;
    }
    // no abrir el waypoint si el jugador aparece pegado a él
    for (const it of w.interactables)
      if (it.type === 'waypoint' && this.player.pos.distanceTo(it.pos) < it.radius + 0.5) it._in = true;
    this.camTarget.copy(this.player.pos);
    this.ui.initMinimap(w);
    if (w.daily) this.ui.message(`🌟 Desafío Diario · Piso ${w.floor} — el mismo trazado para todos hoy. ¡Derrota al jefe!`, 4500);
    else if (w.type === 'dungeon') this.ui.message(`🕳️ Piso ${w.floor} · ${w.biome}`, 3000);
    this.sfx('portal');
    this.save();
  }

  // ---------- mecánicas de jefe ----------
  bossSummon(boss) {
    const base = ENEMIES.find(e => e.id === 'esqueleto');
    for (let i = 0; i < 3; i++) {
      const a = Math.PI * 2 * i / 3;
      const pos = boss.pos.clone().add(new THREE.Vector3(Math.sin(a) * 1.8, 0, Math.cos(a) * 1.8));
      if (!this.world.grid.walkable(pos.x, pos.z)) pos.copy(boss.pos);
      pos.y = 0;
      const e = new Enemy(this, scaleEnemy(base, this.world.floor || 1), pos);
      this.enemies.push(e);
      this.entityGroup.add(e.group);
    }
    this.spawnRing(boss.pos, 2.4, 0x8844ff);
    this.ui.message(`👹 ¡${boss.def.name} invoca a sus esbirros!`);
    this.sfx('eshoot');
  }

  bossFrostNova(boss) {
    this.spawnRing(boss.pos, 3.6, 0x66ccff);
    const p = this.player;
    if (p.alive && p.pos.distanceTo(boss.pos) < 4) {
      p.takeDamage(Math.round(boss.def.dmg * 0.8), boss.def.level || 1);
      p.slowT = 2.5;
      this.ui.message('❄️ ¡Estás congelado! Muévete lento unos segundos', 1800);
    }
    this.sfx('eshoot');
  }

  spawnFirePool(pos) {
    const mesh = new THREE.Mesh(new THREE.CircleGeometry(1.5, 20),
      new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.55 }));
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.copy(pos).setY(0.06);
    this.fxGroup.add(mesh);
    this.firePools.push({ mesh, t: 0, dur: 4.5, radius: 1.6, tick: 0.4 });
    this.sfx('eshoot');
  }

  // ---------- combate ----------
  spawnProjectile(opts) {
    const pr = new Projectile(this, opts);
    this.projectiles.push(pr);
    this.fxGroup.add(pr.mesh);
  }

  spawnRing(pos, radius, color) {
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(radius * 0.8, radius, 28),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, side: THREE.DoubleSide })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.copy(pos).setY(0.07);
    mesh.scale.setScalar(0.3);
    this.fxGroup.add(mesh);
    this.fx.push({ mesh, t: 0, dur: 0.4, ring: true });
  }

  dealArea(pos, radius, mult, opts = {}) {
    let hits = 0;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const r = radius + 0.5 * (e.def.scale || 1);
      if (e.pos.distanceToSquared(pos) <= r * r) {
        const { dmg, crit } = this.player.rollDamage(mult, opts.critBonus || 0);
        e.takeDamage(dmg, crit);
        if (opts.slow) e.slowT = opts.slow;
        hits++;
      }
    }
    return hits;
  }

  nearestEnemy(maxDist = 10, from = null) {
    const origin = from || this.player.pos;
    let best = null, bd = maxDist * maxDist;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const d = e.pos.distanceToSquared(origin);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  attackNearest() {
    const p = this.player;
    if (!p || !p.alive) return;
    const e = this.nearestEnemy(12);
    if (e) { p.attackTarget = e; p.moveTarget = null; }
  }

  castSkillSlot(slot) {
    const p = this.player;
    if (!p || !p.alive || this.state !== 'play') return;
    const actives = p.cls.skills.filter(s => s.type !== 'passive' && p.skills[s.id] > 0).slice(0, 4);
    const sk = actives[slot];
    if (!sk) return;
    const lvl = p.skills[sk.id];
    const cost = Math.round(skillVal(sk.mana, lvl));
    if ((p.cds[sk.id] || 0) > 0) return;
    if (p.mp < cost) { this.ui.message('Maná insuficiente'); return; }

    // objetivo: ratón (escritorio) o enemigo más cercano (móvil)
    const maxRange = sk.range || 8;
    let target = null;
    const near = this.nearestEnemy(maxRange + 2);
    if (this.input.mouseWorld) target = this.input.mouseWorld.clone();
    else if (near) target = near.pos.clone();
    else {
      const fwd = new THREE.Vector3(Math.sin(p.group.rotation.y), 0, Math.cos(p.group.rotation.y));
      target = p.pos.clone().addScaledVector(fwd, Math.min(4, maxRange));
    }
    // limitar al alcance
    const delta = target.clone().sub(p.pos);
    delta.y = 0;
    if (delta.length() > maxRange) target = p.pos.clone().addScaledVector(delta.normalize(), maxRange);

    // sinergias: puntos en otras habilidades aumentan el daño de esta
    const mult = sk.mult ? skillVal(sk.mult, lvl) * (1 + synergyBonus(sk, p.skills) / 100) : 1;
    let casted = true;

    switch (sk.type) {
      case 'melee': {
        const e = near && p.pos.distanceTo(near.pos) <= (sk.range || 2.2) ? near : null;
        if (!e) { this.ui.message('Ningún enemigo al alcance'); casted = false; break; }
        p.faceToward(e.pos);
        p.swing = 1;
        const { dmg, crit } = p.rollDamage(mult);
        e.takeDamage(dmg, crit);
        this.spawnRing(e.pos, 0.8, 0xffbb44);
        break;
      }
      case 'aoe_self': {
        this.spawnRing(p.pos, sk.radius, sk.color || 0xffaa33);
        this.dealArea(p.pos, skillVal(sk.radius, lvl) || sk.radius, mult, { slow: sk.slow });
        p.swing = 1;
        break;
      }
      case 'aoe_target': {
        p.faceToward(target);
        this.spawnRing(target, sk.radius, sk.color || 0xff6633);
        // bola descendente decorativa
        const ball = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6),
          new THREE.MeshBasicMaterial({ color: sk.color || 0xff6633 }));
        ball.position.copy(target).setY(5);
        this.fxGroup.add(ball);
        this.fx.push({ mesh: ball, t: 0, dur: 0.25, fall: target.clone() });
        this.dealArea(target, sk.radius, mult);
        break;
      }
      case 'dash': {
        p.faceToward(target);
        const dir = target.clone().sub(p.pos).setY(0);
        const dist = dir.length();
        if (dist > 0.1) {
          dir.normalize();
          let traveled = 0;
          while (traveled < dist) {
            const step = Math.min(0.3, dist - traveled);
            const nx = p.pos.x + dir.x * step, nz = p.pos.z + dir.z * step;
            if (!this.world.grid.walkable(nx, nz)) break;
            p.pos.x = nx; p.pos.z = nz;
            traveled += step;
          }
        }
        this.spawnRing(p.pos, sk.radius, 0xffcc66);
        this.dealArea(p.pos, sk.radius, mult);
        p.swing = 1;
        break;
      }
      case 'proj': {
        p.faceToward(target);
        p.swing = 1;
        const count = sk.count ? Math.floor(skillVal(sk.count, lvl)) : 1;
        const baseAngle = Math.atan2(target.x - p.pos.x, target.z - p.pos.z);
        for (let i = 0; i < count; i++) {
          const off = count > 1 ? (i - (count - 1) / 2) * (sk.spread || 0.4) / Math.max(1, count - 1) * 2 : 0;
          const a = baseAngle + off;
          const to = p.pos.clone().add(new THREE.Vector3(Math.sin(a) * 5, 0, Math.cos(a) * 5));
          const { dmg, crit } = p.rollDamage(mult, sk.critBonus || 0);
          this.spawnProjectile({
            from: p.pos.clone().setY(1.0), to: to.setY(1.0),
            speed: sk.speed || 14, range: sk.range || 10,
            dmg, crit, friendly: true, pierce: sk.pierce, slow: sk.slow,
            color: sk.color || 0xffffff, size: 0.14,
          });
        }
        break;
      }
      case 'buff': {
        const stats = {};
        for (const [k, arr] of Object.entries(sk.buff)) stats[k] = Math.round(skillVal(arr, lvl));
        p.addBuff(sk.id, stats, sk.dur);
        this.spawnRing(p.pos, 1.4, 0x66ddff);
        break;
      }
    }

    if (casted) {
      p.mp -= cost;
      p.cds[sk.id] = sk.cd;
      this.sfx('skill');
    }
  }

  learnSkill(id) {
    const p = this.player;
    const sk = p.cls.skills.find(s => s.id === id);
    if (!sk || p.skillPoints <= 0) return;
    const lvl = p.skills[id] || 0;
    if (lvl >= sk.max || p.level < TIER_LEVELS[sk.tier - 1]) return;
    p.skills[id] = lvl + 1;
    p.skillPoints--;
    p.recompute();
    this.ui.refreshHotbar();
    this.sfx('levelup');
    this.save();
  }

  // ---------- misiones ----------
  ensureQuestOffer() {
    if (!this.questOffer) this.questOffer = generateQuest(this.player.level);
    return this.questOffer;
  }

  acceptQuest() {
    const p = this.player;
    if (p.quest) return;
    p.quest = this.ensureQuestOffer();
    this.questOffer = null;
    this.ui.message(`🎯 Misión aceptada: ${p.quest.desc}`, 3000);
    this.save();
  }

  questProgress(type) {
    const q = this.player.quest;
    if (!q || q.type !== type || q.progress >= q.goal) return;
    q.progress++;
    if (q.progress >= q.goal)
      this.ui.message('🎯 ¡Misión completada! Vuelve con el Capitán de la Guardia', 4000);
  }

  claimQuest() {
    const p = this.player;
    const q = p.quest;
    if (!q || q.progress < q.goal) return;
    p.gold += q.reward.gold;
    p.gainXP(q.reward.xp);
    if (q.reward.item) {
      const item = generateItem(Math.max(1, Math.round(p.level * 0.8)), q.reward.item);
      if (p.inventory.length < 32) p.inventory.push(item);
      else this.spawnGroundItem(item, p.pos);
      this.ui.message(`Recompensa: ${item.name}`, 2500);
    }
    p.records.quests = (p.records.quests || 0) + 1;
    p.quest = null;
    this.sfx('levelup');
    this.ui.renderPanel();
    this.save();
  }

  // ---------- desafío diario ----------
  checkDailyReward(boss) {
    if (!this.world.daily) return;
    const p = this.player;
    const today = new Date().toISOString().slice(0, 10);
    if (p.dailyDone === today) return;
    p.dailyDone = today;
    p.records.dailies = (p.records.dailies || 0) + 1;
    this.spawnGroundItem(generateItem(this.world.floor, 'legendario'), boss.pos);
    for (let i = 0; i < 3; i++) this.spawnGroundItem(makeGold(this.world.floor + 3), boss.pos);
    this.ui.message('🌟 ¡Desafío Diario completado! Botín extra. Vuelve mañana por otro.', 5000);
    this.sfx('levelup');
    this.save();
  }

  // ---------- mascota ----------
  spawnPet() {
    if (this.pet) return;
    this.pet = new Pet(this);
    this.pet.pos.copy(this.player.pos).add(new THREE.Vector3(0.9, 0, 0.6));
    this.pet.pos.y = 0;
    this.entityGroup.add(this.pet.group);
  }

  buyPet() {
    const p = this.player;
    if (p.pet || p.gold < PET_PRICE) return;
    p.gold -= PET_PRICE;
    p.pet = { level: 1 };
    this.spawnPet();
    this.ui.message('🐺 ¡El lobo de caza se une a ti!', 3000);
    this.sfx('levelup');
    this.save();
  }

  // viaje rápido desde un waypoint
  travelTo(dest) {
    this.ui.closePanel();
    if (dest === 'town') this.loadWorld({ type: 'town' });
    else {
      this.player.lastFloor = dest;
      this.loadWorld({ type: 'dungeon', floor: dest });
    }
  }

  // ---------- tienda del mercader ----------
  // El stock rota cada 5 minutos y mejora con el nivel del jugador
  ensureShopStock() {
    if (this.shopStock && Date.now() < this.shopStock.until) return;
    const lvl = this.player?.level || 1;
    const ilvl = Math.max(1, Math.round(lvl * 0.8));
    const n = 4 + Math.min(3, Math.floor(lvl / 5));
    const items = [];
    for (let i = 0; i < n; i++) {
      const it = generateItem(ilvl);
      it.price = Math.max(20, it.value * 4);
      items.push(it);
    }
    // ofertas de apuesta: objetos sin identificar
    const slots = ['weapon', 'helm', 'chest', 'boots', 'ring', 'amulet'];
    const gamble = [];
    for (let i = 0; i < 3; i++) {
      gamble.push({
        uid: 'g' + (this.gambleUid = (this.gambleUid || 0) + 1),
        slot: slots[Math.floor(Math.random() * slots.length)],
        price: 40 + lvl * 12,
      });
    }
    this.shopStock = { items, gamble, until: Date.now() + SHOP_REFRESH_MS };
  }

  buyGambleItem(uid) {
    const p = this.player;
    this.ensureShopStock();
    const idx = this.shopStock.gamble.findIndex(o => o.uid === uid);
    if (idx < 0) return;
    const offer = this.shopStock.gamble[idx];
    if (p.gold < offer.price) { this.ui.message('Oro insuficiente'); return; }
    if (p.inventory.length >= 32) { this.ui.message('Inventario lleno'); return; }
    p.gold -= offer.price;
    this.shopStock.gamble.splice(idx, 1);
    const item = gambleItem(Math.max(1, Math.round(p.level * 0.8)), offer.slot);
    p.inventory.push(item);
    if (item.rarity === 'legendario') p.records.legendaries++;
    this.sfx(item.rarity === 'legendario' ? 'levelup' : 'gold');
    this.ui.renderShop();
    this.ui.itemPopup(item, { from: 'inv', index: p.inventory.length - 1 });
    this.save();
  }

  buyShopItem(uid) {
    const p = this.player;
    this.ensureShopStock();
    const idx = this.shopStock.items.findIndex(i => i.uid === uid);
    if (idx < 0) return;
    const it = this.shopStock.items[idx];
    if (p.gold < it.price) { this.ui.message('Oro insuficiente'); return; }
    if (p.inventory.length >= 32) { this.ui.message('Inventario lleno'); return; }
    p.gold -= it.price;
    this.shopStock.items.splice(idx, 1);
    p.inventory.push(it);
    this.ui.message(`Compras: ${it.name}`, 1800);
    this.sfx('gold');
    this.save();
  }

  // ---------- loot ----------
  onEnemyKilled(enemy) {
    const p = this.player;
    p.gainXP(enemy.def.xp);
    p.records.kills++;
    if (enemy.def.boss) p.records.bossKills++;
    if (enemy.def.rank) p.records.eliteKills++;
    if (enemy.def.mimic) p.records.mimics++;
    this.questProgress('kill');
    if (enemy.def.rank) this.questProgress('elite');
    if (enemy.def.boss) {
      this.questProgress('boss');
      this.checkDailyReward(enemy);
    }
    const floor = this.world.floor || 1;
    let drops;
    if (enemy.def.mimic) drops = rollDrops(floor, { minItems: 1, itemChance: 0.35, goldChance: 1, potionChance: 0.5, setChance: 0.08 });
    else if (enemy.def.boss) drops = rollDrops(floor, { boss: true, goldChance: 1, potionChance: 0.8 });
    else if (enemy.def.rank === 'elite') drops = rollDrops(floor, { minItems: 1, itemChance: 0.35, goldChance: 1, potionChance: 0.4, setChance: 0.1 });
    else if (enemy.def.rank === 'campeon') drops = rollDrops(floor, { itemChance: 0.45, goldChance: 0.85, potionChance: 0.3, setChance: 0.07 });
    else drops = rollDrops(floor);
    for (const d of drops) this.spawnGroundItem(d, enemy.pos);
    if (enemy.def.boss) this.ui.message(`💀 ¡Has derrotado al ${enemy.def.name}!`, 4000);
    this.sfx('death');
    this.save();
  }

  spawnGroundItem(item, pos) {
    let mesh;
    if (item.kind === 'gold') {
      mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.1, 8),
        new THREE.MeshStandardMaterial({ color: 0xffcc33, emissive: 0xaa8800, emissiveIntensity: 0.5, metalness: 0.7, roughness: 0.3 }));
    } else if (item.kind === 'potion') {
      mesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.14, 4, 8),
        new THREE.MeshStandardMaterial({
          color: item.pot === 'hp' ? 0xdd2233 : 0x2255dd,
          emissive: item.pot === 'hp' ? 0x661111 : 0x112266, emissiveIntensity: 1.2,
        }));
    } else {
      const glow = RARITIES[item.rarity].glow;
      mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0),
        new THREE.MeshStandardMaterial({ color: glow, emissive: glow, emissiveIntensity: 0.9, roughness: 0.3 }));
    }
    const a = Math.random() * Math.PI * 2, r = 0.3 + Math.random() * 0.7;
    mesh.position.set(pos.x + Math.sin(a) * r, 0.35, pos.z + Math.cos(a) * r);
    if (!this.world.grid.walkable(mesh.position.x, mesh.position.z, 0.1))
      mesh.position.set(pos.x, 0.35, pos.z);
    this.lootGroup.add(mesh);
    this.groundItems.push({ id: 'gi' + this.giUid++, item, mesh, bob: Math.random() * Math.PI * 2 });
  }

  pickupGroundItem(gi) {
    const p = this.player;
    const it = gi.item;
    if (it.kind === 'gold') { p.gold += it.amount; p.records.goldEarned += it.amount; this.ui.spawnText(p.pos, `+${it.amount} 🪙`, 'txt-gold'); this.sfx('gold'); }
    else if (it.kind === 'potion') {
      if (p.potions[it.pot] >= 99) return;
      p.potions[it.pot]++;
      this.sfx('potion');
    } else {
      if (p.inventory.length >= 32) { this.ui.message('Inventario lleno'); return; }
      p.inventory.push(it);
      if (it.rarity === 'legendario') p.records.legendaries++;
      if (it.rarity === 'conjunto') {
        p.records.setPieces = (p.records.setPieces || 0) + 1;
        this.ui.message(`🟢 ¡Pieza de conjunto! ${it.name}`, 2500);
        this.sfx('levelup');
      } else {
        this.ui.message(`Obtienes: ${it.name}`, 1800);
        this.sfx('pickup');
      }
    }
    this.lootGroup.remove(gi.mesh);
    gi.mesh.geometry.dispose(); gi.mesh.material.dispose();
    this.groundItems.splice(this.groundItems.indexOf(gi), 1);
    this.save();
  }

  equipItem(index) {
    const p = this.player;
    const item = p.inventory[index];
    if (!item || !item.slot) return;
    const old = p.equipment[item.slot];
    p.equipment[item.slot] = item;
    p.inventory.splice(index, 1);
    if (old) p.inventory.push(old);
    p.recompute();
    this.sfx('pickup');
    this.save();
  }

  unequipItem(slot) {
    const p = this.player;
    const item = p.equipment[slot];
    if (!item) return;
    if (p.inventory.length >= 32) { this.ui.message('Inventario lleno'); return; }
    p.equipment[slot] = null;
    p.inventory.push(item);
    p.recompute();
    this.save();
  }

  sellItem(index) {
    const p = this.player;
    const item = p.inventory[index];
    if (!item) return;
    p.inventory.splice(index, 1);
    p.gold += item.value;
    this.ui.spawnText(p.pos, `+${item.value} 🪙`, 'txt-gold');
    this.sfx('gold');
    this.save();
  }

  // ---------- cubo de transmutación ----------
  // 3 objetos de la misma rareza → 1 objeto de la rareza superior
  addToCube(index) {
    const p = this.player;
    const item = p.inventory[index];
    if (!item || p.cube.length >= 3) return;
    p.inventory.splice(index, 1);
    p.cube.push(item);
    this.sfx('pickup');
    this.save();
  }

  cubeReturn(i) {
    const p = this.player;
    const item = p.cube[i];
    if (!item) return;
    if (p.inventory.length >= 32) { this.ui.message('Inventario lleno'); return; }
    p.cube.splice(i, 1);
    p.inventory.push(item);
    this.save();
  }

  transmute() {
    const p = this.player;
    if (p.cube.length !== 3) { this.ui.message('El cubo necesita 3 objetos'); return; }
    const r = p.cube[0].rarity;
    if (!p.cube.every(it => it.rarity === r)) { this.ui.message('Los 3 objetos deben tener la misma rareza'); return; }
    const next = { normal: 'magico', magico: 'raro', raro: 'legendario' }[r];
    if (!next) { this.ui.message('Los legendarios no se pueden transmutar'); return; }
    if (p.inventory.length >= 32) { this.ui.message('Inventario lleno'); return; }
    const ilvl = Math.max(...p.cube.map(it => it.ilvl));
    p.cube = [];
    const item = generateItem(ilvl, next);
    p.inventory.push(item);
    if (item.rarity === 'legendario') p.records.legendaries++;
    this.ui.message(`🧪 ¡Transmutación! Obtienes: ${item.name}`, 3000);
    this.sfx('levelup');
    this.ui.renderPanel();
    this.ui.itemPopup(item, { from: 'inv', index: p.inventory.length - 1 });
    this.save();
  }

  dropItem(index) {
    const p = this.player;
    const item = p.inventory[index];
    if (!item) return;
    p.inventory.splice(index, 1);
    this.spawnGroundItem(item, p.pos);
    this.save();
  }

  // ---------- muerte ----------
  onPlayerDeath() {
    this.state = 'dead';
    this.player.records.deaths++;
    this.sfx('death');
    if (this.player.hardcore) {
      // muerte permanente: el guardado se borra para siempre
      try { localStorage.removeItem(SAVE_KEY); } catch { /* sin almacenamiento */ }
      this.ui.showDeath(true);
    } else {
      this.ui.showDeath(false);
      this.save();
    }
  }

  respawn() {
    if (this.ui.deathHardcore) { location.reload(); return; }
    const p = this.player;
    p.gold = Math.floor(p.gold * 0.9);
    p.alive = true;
    p.hp = p.stats.maxHP;
    p.mp = p.stats.maxMP;
    this.state = 'play';
    this.ui.hideDeath();
    this.loadWorld({ type: 'town' });
    this.ui.message('Has despertado en el pueblo... (-10% oro)', 3500);
  }

  // ---------- bucle principal ----------
  tick() {
    const dt = Math.min(0.05, this.clock.getDelta());
    if (this.state === 'select') { this.renderer.render(this.scene, this.camera); return; }

    const p = this.player;
    if (this.state === 'play') {
      p.update(dt);
      p.records.playTime += dt;
      if (this.pet) this.pet.update(dt);
    }

    // enemigos
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e.update(dt)) {
        this.entityGroup.remove(e.group);
        this.enemies.splice(i, 1);
      } else if (e.alive && e.group.userData.bar.visible) {
        // orientar la barra de vida hacia la cámara compensando la rotación del enemigo
        e.group.getWorldQuaternion(this._q ??= new THREE.Quaternion());
        e.group.userData.bar.quaternion.copy(this._q.invert().multiply(this.camera.quaternion));
      }
    }

    // proyectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const pr = this.projectiles[i];
      if (pr.update(dt)) {
        this.fxGroup.remove(pr.mesh);
        pr.mesh.geometry.dispose(); pr.mesh.material.dispose();
        this.projectiles.splice(i, 1);
      }
    }

    // efectos
    for (let i = this.fx.length - 1; i >= 0; i--) {
      const f = this.fx[i];
      f.t += dt;
      const k = f.t / f.dur;
      if (k >= 1) {
        this.fxGroup.remove(f.mesh);
        f.mesh.geometry.dispose(); f.mesh.material.dispose();
        this.fx.splice(i, 1);
        continue;
      }
      if (f.ring) { f.mesh.scale.setScalar(0.3 + k * 0.9); f.mesh.material.opacity = 0.8 * (1 - k); }
      if (f.fall) f.mesh.position.y = 5 * (1 - k);
    }

    // charcos de fuego: dañan al jugador que se queda dentro
    for (let i = this.firePools.length - 1; i >= 0; i--) {
      const fp = this.firePools[i];
      fp.t += dt;
      if (fp.t >= fp.dur) {
        this.fxGroup.remove(fp.mesh);
        fp.mesh.geometry.dispose(); fp.mesh.material.dispose();
        this.firePools.splice(i, 1);
        continue;
      }
      fp.mesh.material.opacity = 0.2 + 0.4 * (1 - fp.t / fp.dur);
      fp.tick -= dt;
      if (fp.tick <= 0 && this.state === 'play' && p.alive &&
          p.pos.distanceTo(fp.mesh.position) < fp.radius + 0.3) {
        fp.tick = 0.5;
        p.takeDamage(4 + 2 * (this.world.floor || 1), this.world.floor || 1);
      }
    }

    // loot: animación y recogida automática de oro/pociones
    const t = performance.now() / 1000;
    for (let i = this.groundItems.length - 1; i >= 0; i--) {
      const gi = this.groundItems[i];
      gi.mesh.rotation.y += dt * 2;
      gi.mesh.position.y = 0.35 + Math.sin(t * 3 + gi.bob) * 0.08;
      if (this.state === 'play' && (gi.item.kind === 'gold' || gi.item.kind === 'potion')) {
        if (gi.mesh.position.distanceToSquared(p.pos.clone().setY(gi.mesh.position.y)) < 1.1)
          this.pickupGroundItem(gi);
      }
    }

    // interactuables
    this.nearVendor = false;
    if (this.state === 'play') this.checkInteractables(dt);

    // animar portales, waypoints y antorchas
    for (const it of this.world.interactables) {
      if (it.mesh?.userData.spin) {
        it.mesh.userData.spin[0].rotation.z += dt * 1.5;
        const s = 1 + Math.sin(t * 3) * 0.05;
        it.mesh.userData.spin[1].scale.setScalar(s);
      }
      if (it.mesh?.userData.crystal) {
        const c = it.mesh.userData.crystal;
        c.rotation.y += dt * 1.2;
        c.position.y = 0.95 + Math.sin(t * 2.5) * 0.12;
      }
    }
    this.world.group.traverse(o => {
      if (o.userData?.flame) {
        o.userData.flame.scale.y = 1 + Math.sin(t * 11 + o.position.x) * 0.25;
      }
    });

    // cámara y luces siguen al jugador
    this.camTarget.lerp(p.pos, Math.min(1, dt * 6));
    this.camera.position.copy(this.camTarget).add(this.camOffset);
    this.camera.lookAt(this.camTarget);
    this.playerLight.position.copy(p.pos).setY(2.2);
    this.sun.position.copy(p.pos).add(new THREE.Vector3(10, 18, 6));
    this.sun.target.position.copy(p.pos);

    // UI
    this.ui.updateFloats(dt);
    this.ui.updateHUD();
    this.syncWorldLabels();
    this.ui.drawMinimap();

    // rotación de la mercancía de la tienda
    if (this.shopStock && Date.now() >= this.shopStock.until) {
      this.ensureShopStock();
      if (this.ui.activePanel === 'shop') {
        this.ui.renderShop();
        this.ui.message('🛒 ¡El mercader tiene nueva mercancía!');
      }
    }

    this.saveTimer += dt;
    if (this.saveTimer > 8) { this.saveTimer = 0; this.save(); }

    this.renderer.render(this.scene, this.camera);
  }

  checkInteractables(dt) {
    const p = this.player;
    this.healPulse = Math.max(0, this.healPulse - dt);

    // los portales no funcionan hasta que el jugador se aleje de todos
    // (evita teletransportes en bucle al aparecer junto a un portal)
    if (!this.portalArmed) {
      const nearAny = this.world.interactables.some(it =>
        it.type.startsWith('portal') && p.pos.distanceTo(it.pos) < it.radius + 0.5);
      if (!nearAny) this.portalArmed = true;
    }

    for (const it of this.world.interactables) {
      const d = p.pos.distanceTo(it.pos);
      if (d > it.radius) { if (d > it.radius + 0.4) it._in = false; continue; }
      switch (it.type) {
        case 'portal_dungeon':
          if (this.portalArmed) this.loadWorld({ type: 'dungeon', floor: p.lastFloor || 1 });
          return;
        case 'portal_town':
          if (this.portalArmed) this.loadWorld({ type: 'town' });
          return;
        case 'portal_next':
          if (this.portalArmed) {
            p.lastFloor = this.world.floor + 1;
            this.loadWorld({ type: 'dungeon', floor: p.lastFloor });
          }
          return;
        case 'portal_daily':
          if (this.portalArmed) {
            const d = new Date();
            const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
            this.loadWorld({ type: 'dungeon', floor: 3 + (seed % 8), seed, daily: true });
          }
          return;
        case 'questgiver':
          if (!it._in) { it._in = true; this.ui.openQuest(); }
          break;
        case 'waypoint':
          if (!it._in) {
            it._in = true;
            if (it.floor && !p.waypoints.includes(it.floor)) {
              p.waypoints.push(it.floor);
              this.ui.message(`🗺️ ¡Waypoint del piso ${it.floor} activado!`, 3500);
              this.sfx('portal');
              this.save();
            }
            this.ui.openWaypoints();
          }
          break;
        case 'healer':
          if ((p.hp < p.stats.maxHP || p.mp < p.stats.maxMP) && this.healPulse <= 0) {
            this.healPulse = 0.5;
            p.hp = Math.min(p.stats.maxHP, p.hp + p.stats.maxHP * 0.1);
            p.mp = Math.min(p.stats.maxMP, p.mp + p.stats.maxMP * 0.1);
            this.ui.spawnText(p.pos, '+❤️', 'txt-heal');
          }
          break;
        case 'vendor':
          this.nearVendor = true;
          break;
        case 'chest':
          if (!it.opened) {
            it.opened = true;
            if (it.mimic) {
              // ¡el cofre era un monstruo!
              it.label = '';
              this.world.group.remove(it.mesh);
              const def = scaleEnemy(MIMIC, this.world.floor);
              def.rankLabel = '📦 ¡Mímico!';
              def.labelCls = 'lbl-elite';
              def.mimic = true;
              const m = new Enemy(this, def, it.pos.clone());
              this.enemies.push(m);
              this.entityGroup.add(m.group);
              this.ui.message('📦 ¡El cofre era un Mímico!');
              this.sfx('eshoot');
            } else {
              it.label = '📦 Cofre vacío';
              it.mesh.children[1].rotation.x = -1.1;
              const drops = rollDrops(this.world.floor, { minItems: 1, itemChance: 0.35, goldChance: 1, setChance: 0.06 });
              for (const drop of drops) this.spawnGroundItem(drop, it.pos);
              this.spawnGroundItem(makeGold(this.world.floor), it.pos);
              p.records.chests++;
              this.questProgress('chest');
              this.sfx('chest');
            }
          }
          break;
      }
    }
  }

  syncWorldLabels() {
    const p = this.player;
    const entries = [];
    const maxD = 14 * 14;
    for (const gi of this.groundItems) {
      if (gi.mesh.position.distanceToSquared(p.pos) > maxD) continue;
      const it = gi.item;
      if (it.kind === 'item') {
        entries.push({
          id: gi.id, pos: gi.mesh.position, text: `${it.icon} ${it.name}`,
          cls: 'lbl-item rarity-' + it.rarity,
          onClick: () => { p.pickTarget = gi; p.moveTarget = null; p.attackTarget = null; },
        });
      }
    }
    // nombres de campeones, élites y jefes
    for (const e of this.enemies) {
      if (!e.alive || !e.def.rankLabel) continue;
      if (e.pos.distanceToSquared(p.pos) > maxD) continue;
      entries.push({
        id: 'en' + e.uid,
        pos: e.pos.clone().setY(2.3 * (e.def.scale || 1)),
        text: e.def.rankLabel, cls: e.def.labelCls,
        onClick: () => { p.attackTarget = e; p.moveTarget = null; p.pickTarget = null; },
      });
    }
    for (let i = 0; i < this.world.interactables.length; i++) {
      const it = this.world.interactables[i];
      if (!it.label || it.pos.distanceToSquared(p.pos) > maxD) continue;
      entries.push({
        id: 'int' + i + it.label, pos: it.pos.clone().setY(1.8), text: it.label, cls: it.labelCls,
        onClick: () => { p.moveTarget = it.pos.clone(); p.attackTarget = null; p.pickTarget = null; },
      });
    }
    this.ui.syncLabels(entries.slice(0, 24));
  }
}

new Game();
