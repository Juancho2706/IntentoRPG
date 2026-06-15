// ============================================================
// IntentoRPG — ARPG isométrico estilo Diablo 2 (Three.js)
// ============================================================
import * as THREE from 'three';
import { ENEMIES, MIMIC, GOBLIN, UBER_BOSS, ENEMY_RANKS, PACTS, ZONE_LIST, BLESSINGS, blessingValue, bossForFloor, scaleEnemy, pickEnemyDef, rollEnemyRank, skillVal, synergyBonus, TIER_LEVELS, generateQuest } from './data.js';
import { buildTown, buildDungeon, buildRefuge } from './world.js';
import { buildZone } from './zones.js';
import { Player, Enemy, Projectile, Pet, MAX_MATERIALS } from './entities.js';
import { rollDrops, makeGold, generateItem, makeRelic, makeRiftKey, makeFragment, makeMythic, makeGlyph, RARITIES } from './items.js';
import { UI } from './ui.js';
import { createSfx } from './sfx.js';
import { Input } from './input.js';
import { economyMethods } from './economy.js';
import { Music } from './music.js';
import { smoothNoise, hitStopMs } from './vfx.js';
import { PostFX, AmbientParticles } from './postfx.js';
import { ParticleSystem, PRESETS } from './particles.js';
import { SKILL_FX, SKILL_FX_PRESETS } from './fx-skills.js';
import { FX as ENEMY_FX, hexNum, deathBurst, deathSmoke, bossDeathBurst, bossDeathStars } from './fx-enemies.js';

const SAVE_KEY = 'intentorpg_save_v1';

// Color grading por bioma (estética 2026): tinte del composer + multiplicador
// de exposición + color/tono de la luz de relleno (rim). Realza la identidad
// fría/cálida/violeta de cada bioma sin tocar la jugabilidad. `tint` se mezcla
// muy levemente (tintAmt) sobre la imagen final en postfx.js.
const BIOME_GRADE = {
  'Cripta':            { tint: 0xc9c2a8, tintAmt: 0.14, exposure: 0.96, rim: 0x6a78a0, rimI: 0.55 },
  'Cavernas de Hielo': { tint: 0x9fc6ff, tintAmt: 0.20, exposure: 1.06, rim: 0x88bbff, rimI: 0.75 },
  'Infierno':          { tint: 0xff9a5a, tintAmt: 0.20, exposure: 1.04, rim: 0xff7a44, rimI: 0.7 },
  'Abismo Estelar':    { tint: 0xb088ff, tintAmt: 0.22, exposure: 1.0,  rim: 0x9a7aff, rimI: 0.7 },
};
const DEFAULT_GRADE = { tint: 0xffffff, tintAmt: 0.0, exposure: 1.0, rim: 0xaaccff, rimI: 0.5 };
// glifo de rareza para las etiquetas del suelo (rareza no solo por color)
const RGLYPH = { normal: '', magico: '✦', raro: '◆', legendario: '★', conjunto: '❖' };


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
    this.telegraphs = [];
    this.nearVendor = false;
    this.currentInteract = null;
    this.healPulse = 0;
    this.saveTimer = 0;
    this.giUid = 1;
    // game-feel: cámara basada en "trauma" (0..1) y hit-stop por reloj propio
    this.trauma = 0;       // acumulador 0..1, el desplazamiento usa trauma²
    this.shakeMag = 0;     // amplitud máxima pedida por las llamadas a addShake
    this.shakeClock = 0;   // tiempo para el ruido suave (no depende del frame)
    this.hitStopT = 0;     // segundos restantes de congelado de tiempo
    // opciones persistentes (sonido, vibración, sacudida de cámara)
    let opts = {};
    try { opts = JSON.parse(localStorage.getItem('intentorpg_opts') || '{}'); } catch { /* sin opciones */ }
    this.settings = { sound: true, music: true, shake: true, haptics: true, brightness: 1, autoq: true, lootFilter: 'normal',
      reduceMotion: false, bigText: false, colorblind: false, postfx: true, ...opts };
    this.applyAccessibility();
    this.qualityLevel = 0;
    this.fpsAcc = 0;
    this.fpsFrames = 0;
    this.loadStash();
    try { this.dailyLog = JSON.parse(localStorage.getItem('intentorpg_dailylog') || '[]'); } catch { this.dailyLog = []; }
    const rawSfx = createSfx();
    this.sfx = (name) => { if (this.settings.sound) rawSfx(name); };
    this.music = new Music();
    this.music.enabled = this.settings.music !== false;
    window.addEventListener('pointerdown', () => this.music.resume(), { once: true });

    // renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = this.settings.brightness;
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
    // luz de relleno/rim: separa al héroe del fondo desde detrás-arriba; no
    // proyecta sombras (barata) y tiñe levemente el borde del personaje.
    this.rimLight = new THREE.DirectionalLight(0xaaccff, 0.6);
    this.scene.add(this.rimLight, this.rimLight.target);

    // post-procesado opcional (bloom + viñeta + grading de bioma) y partículas
    // ambientales. Ambos tolerantes a fallos: si el CDN de addons no carga, el
    // juego sigue con render directo y sin partículas (ver postfx.js).
    this.postfx = new PostFX();
    this.postfx.setEnabled(this.settings.postfx !== false && !this.settings.reduceMotion);
    this.particles = new AmbientParticles(this.scene);
    this.particles.setEnabled(this.settings.postfx !== false && !this.settings.reduceMotion);
    // motor de partículas de GAMEPLAY (impactos, habilidades, enemigos) — pooled.
    // Va en la escena (no en fxGroup, que se limpia al cambiar de mundo); psys
    // tiene su propio clear(). try/catch para degradar si WebGL falla.
    try { this.psys = new ParticleSystem(this.scene, { poolSize: 2000 }); }
    catch { this.psys = null; }
    this.postfx.init(this.renderer, this.scene, this.camera).then(() => {
      // sincroniza tamaño/calidad iniciales y aplica el estado de calidad actual
      this.syncPostFX();
    });

    this.raycaster = new THREE.Raycaster();
    this.ui = new UI(this);
    this.input = new Input(this);
    this.clock = new THREE.Clock();

    // migración: el guardado único antiguo pasa al hueco 1
    try {
      const legacy = localStorage.getItem(SAVE_KEY);
      if (legacy && !localStorage.getItem(this.slotKey(0))) localStorage.setItem(this.slotKey(0), legacy);
      if (legacy) localStorage.removeItem(SAVE_KEY);
    } catch { /* sin almacenamiento */ }
    this.activeSlot = 0;
    this.ui.showClassSelect((slot, pick, opts) => this.startGame(pick, opts, slot));

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
    // mantener el composer en sincronía con el renderer (tamaño + pixelRatio)
    this.postfx?.setSize(window.innerWidth, window.innerHeight, this.renderer.getPixelRatio());
  }

  // Aplica el estado de calidad/accesibilidad al post-procesado:
  // - bloom OFF en calidad baja o reduceMotion (caro en móvil),
  // - composer y partículas obedecen el toggle `postfx` + reduceMotion,
  // - tamaño/pixelRatio igualados al renderer.
  syncPostFX() {
    const on = this.settings.postfx !== false && !this.settings.reduceMotion;
    this.postfx?.setEnabled(on);
    this.postfx?.setBloom(on && this.qualityLevel < 2);
    this.particles?.setEnabled(on);
    this.postfx?.setSize(window.innerWidth, window.innerHeight, this.renderer.getPixelRatio());
  }

  // ---------- huecos de guardado ----------
  slotKey(i) { return `intentorpg_save_slot${i}`; }

  slotMetas() {
    return [0, 1, 2].map(i => {
      try {
        const d = JSON.parse(localStorage.getItem(this.slotKey(i)));
        return d ? { classId: d.classId, level: d.level, maxFloor: d.records?.maxFloor || 1, hardcore: !!d.hardcore, name: d.heroName, tint: d.tint } : null;
      } catch { return null; }
    });
  }

  deleteSlot(i) {
    try { localStorage.removeItem(this.slotKey(i)); } catch { /* sin almacenamiento */ }
  }

  // exportar/importar partida (código de texto; más adelante, guardado en la nube)
  exportSave() {
    this.save();
    const data = {
      save: localStorage.getItem(this.slotKey(this.activeSlot)),
      stash: localStorage.getItem('intentorpg_stash'),
    };
    const code = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
    const fallback = () => prompt('Copia tu código de guardado:', code);
    if (navigator.clipboard?.writeText)
      navigator.clipboard.writeText(code)
        .then(() => this.ui.message('📋 Código de guardado copiado al portapapeles', 3500))
        .catch(fallback);
    else fallback();
  }

  importSave() {
    const code = prompt('Pega aquí tu código de guardado:\n(Se sobrescribirá el héroe del hueco actual)');
    if (!code) return;
    try {
      const data = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
      JSON.parse(data.save); // valida que el guardado sea JSON real
      localStorage.setItem(this.slotKey(this.activeSlot), data.save);
      if (data.stash) localStorage.setItem('intentorpg_stash', data.stash);
      location.reload();
    } catch {
      this.ui.message('❌ Código de guardado no válido');
    }
  }

  // ---------- inicio / guardado ----------
  startGame(pick, opts = {}, slot = 0) {
    this.activeSlot = slot;
    // mundo abierto persistente por sesión (como Diablo 2): cada bioma se genera
    // una vez con su semilla y conserva su trazado y la niebla descubierta hasta
    // recargar la página (nueva sesión). No se guarda en disco a propósito.
    this.zoneSeeds = {};
    this.zoneExplored = {};
    this.zoneBounties = {};
    let saved = null;
    if (pick === 'continue') {
      try { saved = JSON.parse(localStorage.getItem(this.slotKey(slot))); } catch { saved = null; }
      if (!saved) pick = 'guerrero';
    }
    const classId = saved ? saved.classId : pick;
    this.player = new Player(this, classId, saved, opts);
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
    this.ui.message(`${this.player.cls.icon} ¡Bienvenido, ${this.player.heroName}! Entra al portal del norte para explorar la mazmorra.`, 5000);
    document.getElementById('hud').classList.remove('hidden');
    // garantiza que no quede ningún panel abierto al entrar (lo añade la UI)
    this.ui.closeAllPanels?.();
    const touch = window.matchMedia('(pointer: coarse)').matches;
    this.tip('mover', touch
      ? 'Mantén el pulgar en la mitad izquierda para moverte con el joystick; toca un enemigo para atacarlo'
      : 'Haz clic en el suelo para moverte (o WASD) y clic en un enemigo para atacarlo');
  }

  save() {
    const p = this.player;
    if (!p) return;
    const data = {
      classId: p.classId, level: p.level, xp: p.xp, attributes: p.attributes,
      statPoints: p.statPoints, skillPoints: p.skillPoints, skills: p.skills,
      gold: p.gold, potions: p.potions, inventory: p.inventory, materials: p.materials, equipment: p.equipment,
      lastFloor: p.lastFloor, hp: Math.round(p.hp), mp: Math.round(p.mp),
      waypoints: p.waypoints, records: p.records, cube: p.cube,
      quest: p.quest, hardcore: p.hardcore, pet: p.pet, dailyDone: p.dailyDone, tips: p.tips,
      supports: p.supports, knownSupports: p.knownSupports,
      paragon: p.paragon, refugeUnlocked: p.refugeUnlocked, discovered: p.discovered,
      heroName: p.heroName, tint: p.tint,
      torment: p.torment, codex: p.codex, blessings: p.blessings,
    };
    try { localStorage.setItem(this.slotKey(this.activeSlot), JSON.stringify(data)); } catch { /* sin almacenamiento */ }
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
    // limpia por completo loot y efectos (a prueba de mallas huérfanas que
    // quedaban como objetos estáticos al cambiar de mundo)
    const clearGroup = (grp) => {
      for (const child of grp.children) {
        child.traverse?.((o) => {
          if (o.geometry) o.geometry.dispose();
          if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
        });
      }
      grp.clear();
    };
    clearGroup(this.lootGroup);
    clearGroup(this.fxGroup);
    this.enemies = []; this.projectiles = []; this.groundItems = []; this.fx = [];
    this.firePools = []; this.telegraphs = []; this.chains = {};
    this.psys?.clear();   // limpia partículas de gameplay del mundo anterior

    // semilla persistente por sesión: la zona se genera una sola vez y mantiene
    // su trazado mientras dure la partida (hasta recargar la página)
    if (spec.type === 'zone' && spec.seed == null) {
      if (!this.zoneSeeds) this.zoneSeeds = {};
      if (this.zoneSeeds[spec.biome] == null)
        this.zoneSeeds[spec.biome] = (Math.random() * 1e9) | 0;
      spec.seed = this.zoneSeeds[spec.biome];
    }
    this.world = spec.type === 'town' ? buildTown()
      : spec.type === 'refuge' ? buildRefuge()
      : spec.type === 'zone' ? buildZone(spec.biome, { seed: spec.seed ?? null })
      : buildDungeon(spec.rift ? 16 + spec.rift * 2 : spec.floor, spec.seed ?? null);
    this.world.daily = !!spec.daily;
    this.world.pinnacle = !!spec.pinnacle;
    this.world.rift = spec.rift || 0;
    // dificultad de una zona abierta según su bioma
    const zoneDef = ZONE_LIST.find(z => z.biome === spec.biome);
    const zoneFloor = zoneDef ? zoneDef.floor : 3;
    // la diaria comparte trazado con todos, pero su dificultad escala a tu progreso
    this.world.scaleFloor = spec.rift ? 16 + spec.rift * 2
      : spec.daily ? Math.max(this.world.floor, (this.player.records.maxFloor || 1) - 2)
      : spec.type === 'zone' ? zoneFloor
      : (this.world.floor || 1);
    // una grieta aplica varios modificadores a la vez (reutiliza el sistema de pactos)
    if (spec.rift) {
      const L = spec.rift;
      this.world.pact = { id: 'rift', qty: 25 + L * 12, mf: 30 + L * 15, xp: 20 + L * 10 };
      this.world.pactEnemyMods = { ehp: 0.3 + L * 0.12, edmg: 0.2 + L * 0.08, espd: Math.min(0.5, 0.05 + L * 0.04) };
    }
    // Tormento: dificultad global seleccionable. Sube la dificultad efectiva
    // (más vida/daño enemigo) y el botín (rareza/cantidad). No aplica a grietas
    // ni a la diaria, que tienen su propia escalera.
    const T = (spec.rift || spec.daily || spec.type === 'town' || spec.type === 'refuge')
      ? 0 : Math.min(this.tormentUnlocked(), this.player.torment || 0);
    this.world.torment = T;
    if (T > 0) {
      // +1 piso efectivo por Tormento (antes +2): el jugador no escala su poder al
      // subir Tormento, así que +2 disparaba el TTK y los one-shots (auditoría)
      this.world.scaleFloor += T;           // enemigos más duros y mejor ilvl de botín
      this.world.tormentMF = T * 12;        // empuja la rareza hacia arriba
      this.world.tormentQty = T * 8;        // y la cantidad de botín
    }
    this.scene.add(this.world.group);

    // ambiente
    const w = this.world;
    this.edgeArmed = false; // puertas automáticas desarmadas hasta alejarse
    // en la zona, el portal de retorno se cruza caminando (como salir por el sur)
    if (w.type === 'zone') {
      // niebla de guerra persistente por sesión: la zona recuerda lo explorado
      if (!this.zoneExplored) this.zoneExplored = {};
      if (!this.zoneExplored[w.biome]) this.zoneExplored[w.biome] = new Set();
      w.explored = this.zoneExplored[w.biome];
      // contratos de zona (persistentes por sesión)
      w.bounties = this.ensureZoneBounties(w.biome).list;
      const ret = w.interactables.find(it => it.type === 'portal_town');
      if (ret) { ret.auto = true; ret.label = '🚪 Volver al Pueblo'; }
      // escala las entradas de mazmorra al piso base de la zona (bf-2, bf, bf+2)
      const bf = w.scaleFloor;
      const dgs = w.interactables.filter(it => it.type === 'zone_dungeon');
      dgs.forEach((d, i) => {
        d.floor = Math.max(1, bf + (i - Math.floor(dgs.length / 2)) * 2);
        d.label = `🕳️ Mazmorra (piso ${d.floor})`;
      });
      // obelisco de evento: una pieza interactuable que desata oleadas
      const op = this.randomZoneCellFrom(w, w.spawn, 18);
      if (op) {
        const ob = new THREE.Group();
        const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.2, 0.5),
          new THREE.MeshStandardMaterial({ color: 0x442a66, emissive: 0x8833cc, emissiveIntensity: 0.8, roughness: 0.5 }));
        shaft.position.y = 1.1; shaft.castShadow = true;
        const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.3, 0),
          new THREE.MeshStandardMaterial({ color: 0xcc66ff, emissive: 0xaa44ff, emissiveIntensity: 1.5 }));
        orb.position.y = 2.5; orb.userData.baseY = 2.5;
        ob.add(shaft, orb); ob.userData.crystal = orb; ob.position.copy(op);
        w.group.add(ob);
        w.interactables.push({ type: 'world_event', pos: op.clone(), radius: 1.6, label: '🌀 Obelisco — Evento de oleadas', labelCls: 'lbl-elite', mesh: ob, used: false });
      }
    }
    // aparecer junto a la puerta correspondiente al cruzar pueblo↔zona
    if (spec.entry) {
      const gateType = spec.entry === 'fromTown' ? 'portal_town' : 'gate_zone';
      const gate = w.interactables.find(it => it.type === gateType);
      if (gate) {
        const toC = gate.pos.clone().setY(0).multiplyScalar(-1);
        if (toC.lengthSq() > 0.01) toC.normalize(); else toC.set(0, 0, 1);
        for (let s = 2; s <= 6; s++) {
          const cand = gate.pos.clone().addScaledVector(toC, s).setY(0);
          if (w.grid.walkable(cand.x, cand.z)) { w.spawn = cand; break; }
        }
      }
    }
    this.scene.fog = new THREE.Fog(w.fog.color, w.fog.near, w.fog.far);
    this.renderer.setClearColor(w.clearColor);
    this.ambient.intensity = w.ambientIntensity;
    this.ambient.color.setHex(w.ambient);
    this.sun.intensity = w.sun.intensity;
    this.sun.color.setHex(w.sun.color);
    this.playerLight.intensity = w.type === 'dungeon' ? 16 : 0;

    // --- color grading + ambiente por bioma ---
    const grade = BIOME_GRADE[w.biome] || DEFAULT_GRADE;
    this.exposureBase = this.settings.brightness * grade.exposure;
    this.renderer.toneMappingExposure = this.exposureBase;
    this.postfx?.setTint(grade.tint, grade.tintAmt);
    // luz de relleno/rim teñida por bioma, ubicada detrás-arriba del héroe
    this.rimLight.color.setHex(grade.rim);
    this.rimLight.intensity = grade.rimI;
    // partículas ambientales del bioma (motas/nieve/brasas/vacío); solo en
    // mundos jugables con bioma (no pueblo/refugio)
    if ((w.type === 'dungeon' || w.type === 'zone') && w.biome)
      this.particles?.setBiome(w.biome, w.spawn);
    else
      this.particles?.setBiome(null);
    // flicker real de antorchas: cada PointLight guarda su intensidad base y
    // una fase de ruido propia para titilar de forma independiente
    this.torchLights = w.torchLights || [];
    for (const L of this.torchLights) {
      L.userData.baseI = L.intensity;
      L.userData.flick = Math.random() * 100;
    }

    // enemigos: sueltos, manadas con líder, élites de tesoro y jefe
    const sf = w.scaleFloor;
    for (const s of w.spawns) {
      if (s.kind === 'pack') { this.spawnPack(s.positions, sf); continue; }
      let def;
      if (s.kind === 'boss') {
        // en el Pináculo, el jefe es el uber (Heraldo del Vacío)
        def = w.pinnacle ? scaleEnemy(UBER_BOSS, sf) : scaleEnemy(bossForFloor(sf), sf);
        def.rankLabel = w.pinnacle ? `👁️ ${def.name} (Pináculo)` : `👹 ${def.name}`;
        def.labelCls = 'lbl-elite';
      } else if (s.kind === 'elite') {
        def = rollEnemyRank(scaleEnemy(pickEnemyDef(sf), sf), sf);
        for (let t = 0; t < 25 && def.rank !== 'elite'; t++)
          def = rollEnemyRank(scaleEnemy(pickEnemyDef(sf), sf), sf);
      } else {
        def = rollEnemyRank(scaleEnemy(pickEnemyDef(sf), sf), sf);
      }
      const enemy = new Enemy(this, def, s.pos);
      this.enemies.push(enemy);
      this.entityGroup.add(enemy.group);
    }
    this.pendingWaves = [];

    // jugador
    this.player.pos.copy(w.spawn);
    this.player.moveTarget = this.player.attackTarget = this.player.pickTarget = null;
    this.input.joyDir = null;
    this.currentInteract = null;
    if (w.type === 'dungeon' && !w.daily) this.player.records.maxFloor = Math.max(this.player.records.maxFloor, w.floor);
    this.checkTormentUnlock();
    if (w.type === 'dungeon' && w.floor >= 16 && !this.player.refugeUnlocked) {
      this.player.refugeUnlocked = true;
      this.ui.message('🏕️ ¡Has descubierto el Refugio del Abismo! Ya puedes viajar desde cualquier waypoint', 5000);
      this.save();
    }
    if (this.pet) {
      this.pet.pos.copy(w.spawn).add(new THREE.Vector3(0.9, 0, 0.6));
      this.pet.pos.y = 0;
    }
    this.camTarget.copy(this.player.pos);
    this.music.play(w.type === 'town' ? 'town' : w.type === 'refuge' ? 'refuge' : w.biome);
    this.ui.initMinimap(w);
    if (w.daily) this.dailyStart = Date.now();
    if (w.pinnacle) this.ui.message(`👁️ ¡El Pináculo! El Heraldo del Vacío te espera. Derrótalo para obtener un objeto MÍTICO.`, 5000);
    else if (w.rift) this.ui.message(`🌀 Grieta Nivel ${w.rift} · ${w.biome} — enemigos reforzados, botín aumentado. ¡Derrota al jefe!`, 4500);
    else if (w.daily) this.ui.message(`🌟 Desafío Diario · trazado del día, dificultad de piso ${w.scaleFloor}. ¡Derrota al jefe!`, 4500);
    else if (w.type === 'zone') this.ui.message(`🌿 ${w.biome} — zona abierta. Explora y entra a las mazmorras (🕳️).`, 4000);
    else if (w.type === 'dungeon') this.ui.message(`🕳️ Piso ${w.floor} · ${w.biome}`, 3000);
    this.sfx('portal');
    this.save();
  }

  // ---------- sensaciones: sacudida, vibración, partículas, consejos ----------
  saveSettings() {
    try { localStorage.setItem('intentorpg_opts', JSON.stringify(this.settings)); } catch { /* sin almacenamiento */ }
  }

  // accesibilidad: aplica clases al <body> para CSS (y persiste)
  applyAccessibility() {
    const b = document.body;
    b.classList.toggle('reduce-motion', !!this.settings.reduceMotion);
    b.classList.toggle('big-text', !!this.settings.bigText);
    b.classList.toggle('cb', !!this.settings.colorblind);
    this.saveSettings();
  }

  // filtro de loot: ¿esta rareza supera el umbral elegido?
  passesLootFilter(rarity) {
    const rank = { normal: 0, magico: 1, raro: 2, legendario: 3, conjunto: 3 };
    return (rank[rarity] ?? 0) >= (rank[this.settings.lootFilter] ?? 0);
  }

  // calidad adaptativa: si los FPS caen, baja resolución y sombras
  applyQuality(level) {
    this.qualityLevel = level;
    const ratios = [Math.min(window.devicePixelRatio, 1.75), Math.min(window.devicePixelRatio, 1.25), 1];
    this.renderer.setPixelRatio(ratios[level]);
    this.sun.castShadow = level < 2;
    this.resize();
    // bloom y tamaño del composer siguen a la calidad (se apaga en nivel 2)
    this.syncPostFX();
  }

  monitorFPS(dt) {
    if (!this.settings.autoq) {
      if (this.qualityLevel !== 0) this.applyQuality(0);
      return;
    }
    this.fpsAcc += dt;
    this.fpsFrames++;
    if (this.fpsAcc < 2) return;
    const fps = this.fpsFrames / this.fpsAcc;
    this.fpsAcc = 0;
    this.fpsFrames = 0;
    if (fps < 45 && this.qualityLevel < 2) {
      this.applyQuality(this.qualityLevel + 1);
      if (this.qualityLevel === 1) this.ui.message('⚙️ Calidad ajustada para mantener la fluidez', 2500);
    }
  }

  // Cámara basada en "trauma": cada impacto AÑADE trauma (0..1) que decae solo.
  // El desplazamiento aplicado es trauma² (sensación de golpe seco) con ruido
  // suave. Misma firma que antes: amp ~ intensidad, dur ~ cuánto trauma sumar.
  addShake(amp, dur = 0.25) {
    if (!this.settings.shake || this.settings.reduceMotion) return;
    // 'amp' marca la amplitud máxima en metros que un trauma pleno desplazará;
    // 'dur' modula cuánto trauma inyecta este impacto (golpes largos = más).
    this.shakeMag = Math.max(this.shakeMag, amp);
    this.trauma = Math.min(1, this.trauma + amp * 0.9 + dur * 0.4);
  }

  vibrate(pattern) {
    if (this.settings.haptics && navigator.vibrate) navigator.vibrate(pattern);
  }

  // estela de la esquiva: cápsula translúcida que se desvanece donde estuvo el héroe
  spawnDashGhost(p) {
    if (this.settings.reduceMotion) return;
    const cls = p.cls;
    const mesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.32, 0.55, 4, 8),
      new THREE.MeshBasicMaterial({ color: cls.color, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    mesh.position.copy(p.pos).setY(0.75);
    mesh.rotation.y = p.group.rotation.y;
    this.fxGroup.add(mesh);
    this.fx.push({ mesh, t: 0, dur: 0.3, ghost: true });
  }

  // lanza un preset de partículas en una posición del mundo (motor particles.js)
  // acepta un objeto-preset o un nombre (busca en fx-skills, particles, fx-enemies)
  // pos = Vector3/{x,y,z}/[x,y,z]. Guardado para tests (sin GL = no-op).
  emitFx(preset, pos) {
    if (!this.psys || !preset) return;
    const p = typeof preset === 'string' ? (SKILL_FX_PRESETS[preset] || PRESETS[preset] || ENEMY_FX[preset]) : preset;
    if (!p) return;
    try { this.psys.emit(p, pos); } catch { /* sin GL en tests */ }
  }

  // ráfaga de partículas (muertes, cofres, nivel)
  spawnBurst(pos, color, n = 9) {
    const geo = new THREE.BoxGeometry(0.09, 0.09, 0.09);
    const mat = new THREE.MeshBasicMaterial({ color });
    const group = new THREE.Group();
    const parts = [];
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(pos.x, 0.6, pos.z);
      group.add(m);
      parts.push({ m, vx: (Math.random() - 0.5) * 4.5, vy: 2 + Math.random() * 3, vz: (Math.random() - 0.5) * 4.5 });
    }
    this.fxGroup.add(group);
    this.fx.push({ mesh: group, t: 0, dur: 0.55, burst: parts });
  }

  // consejo contextual que solo se muestra una vez por partida
  tip(id, text) {
    const p = this.player;
    if (!p || p.tips[id]) return;
    p.tips[id] = 1;
    this.ui.message('💡 ' + text, 5500);
    this.save();
  }

  // ---------- ataques telegrafiados ----------
  // círculo rojo de aviso: al llenarse, daña a quien siga dentro
  spawnTelegraph(pos, radius, dur, dmg, attackerLevel = 1, opts = {}) {
    const group = new THREE.Group();
    const outer = new THREE.Mesh(
      new THREE.RingGeometry(radius - 0.08, radius, 28),
      new THREE.MeshBasicMaterial({ color: 0xff2222, transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
    const inner = new THREE.Mesh(
      new THREE.CircleGeometry(radius, 28),
      new THREE.MeshBasicMaterial({ color: 0xff3300, transparent: true, opacity: 0.3, side: THREE.DoubleSide }));
    outer.rotation.x = inner.rotation.x = -Math.PI / 2;
    inner.scale.setScalar(0.01);
    group.add(outer, inner);
    group.position.copy(pos).setY(0.08);
    this.fxGroup.add(group);
    this.telegraphs.push({ group, inner, t: 0, dur, radius, dmg, attackerLevel, slow: opts.slow, onDone: opts.onDone });
    this.tip('esquiva', '¡Círculo rojo = peligro! Apártate o esquiva (💨 / Shift) antes de que se llene');
  }

  updateTelegraphs(dt) {
    const p = this.player;
    for (let i = this.telegraphs.length - 1; i >= 0; i--) {
      const tg = this.telegraphs[i];
      tg.t += dt;
      tg.inner.scale.setScalar(Math.max(0.01, Math.min(1, tg.t / tg.dur)));
      if (tg.t < tg.dur) continue;
      // impacto
      if (tg.dmg && p.alive && p.pos.distanceTo(tg.group.position) <= tg.radius + 0.3) {
        p.takeDamage(tg.dmg, tg.attackerLevel);
        if (tg.slow && p.alive) { p.slowT = 2.5; p._slowTotal = 2.5; this.ui.message('❄️ ¡Estás congelado!', 1500); }
      }
      this.spawnRing(tg.group.position, tg.radius, 0xff5533);
      this.addShake(0.12, 0.15);
      if (tg.onDone) tg.onDone(tg.group.position.clone());
      this.fxGroup.remove(tg.group);
      tg.group.children.forEach(c => { c.geometry.dispose(); c.material.dispose(); });
      this.telegraphs.splice(i, 1);
    }
  }

  // ---------- manadas y emboscadas ----------
  // manada: líder campeón/élite y esbirros del mismo tipo que heredan su rasgo
  spawnPack(positions, floor) {
    const base = pickEnemyDef(floor);
    let leader = rollEnemyRank(scaleEnemy(base, floor), floor);
    for (let t = 0; t < 25 && !leader.rank; t++) leader = rollEnemyRank(scaleEnemy(base, floor), floor);
    if (!leader.rank) {
      const rk = ENEMY_RANKS.campeon;
      const d = scaleEnemy(base, floor);
      leader = {
        ...d, rank: 'campeon', glow: rk.glow, labelCls: rk.labelCls, aura: 0x2244aa,
        hp: Math.round(d.hp * rk.hp), dmg: Math.round(d.dmg * rk.dmg),
        xp: Math.round(d.xp * rk.xp), scale: (d.scale || 1) * rk.scale,
        rankLabel: `${rk.icon} ${d.name} ${rk.name}`,
      };
    }
    // afijo Cadenas: la manada entera comparte daño. Marcamos un id de cadena
    // común; el reparto del daño lo resuelve onEnemyHit (sin tocar takeDamage).
    const chainId = leader.modId === 'cadenas' ? `chain_${Date.now()}_${Math.floor(Math.random() * 1e4)}` : null;
    const linked = [];

    const lead = new Enemy(this, leader, positions[0]);
    if (chainId) lead.chainId = chainId;
    this.enemies.push(lead);
    this.entityGroup.add(lead.group);
    linked.push(lead);
    for (const pos of positions.slice(1)) {
      const m = scaleEnemy(base, floor);
      const minion = {
        ...m, aura: leader.aura, burn: leader.burn, explode: leader.explode,
        thorns: leader.thorns, xp: Math.round(m.xp * 1.2),
      };
      if (leader.modId === 'veloz') minion.spd = m.spd * 1.3;
      // los esbirros de una manada Cadenas también comparten el daño
      if (chainId) minion.chains = true;
      const e = new Enemy(this, minion, pos);
      if (chainId) e.chainId = chainId;
      this.enemies.push(e);
      this.entityGroup.add(e.group);
      linked.push(e);
    }
    // registro de cadenas para el reparto de daño
    if (chainId) { this.chains = this.chains || {}; this.chains[chainId] = linked; }
  }

  // aplica los modificadores del pacto a un enemigo que aparece tras sellarlo
  buffByPact(e) {
    const m = this.world.pactEnemyMods;
    if (!m) return e;
    if (m.ehp) { const add = Math.round(e.maxHP * m.ehp); e.maxHP += add; e.hp += add; }
    if (m.edmg) e.def = { ...e.def, dmg: Math.round(e.def.dmg * (1 + m.edmg)) };
    if (m.espd) e.def = { ...e.def, spd: e.def.spd * (1 + m.espd) };
    return e;
  }

  spawnWave(positions) {
    const sf = this.world.scaleFloor || 1;
    for (const pos of positions) {
      const def = rollEnemyRank(scaleEnemy(pickEnemyDef(sf), sf), sf);
      const e = this.buffByPact(new Enemy(this, def, pos));
      e.aggroed = true; // vienen directos a por ti
      this.enemies.push(e);
      this.entityGroup.add(e.group);
      this.spawnBurst(pos, 0x8844ff, 6);
    }
    this.sfx('eshoot');
  }

  // celda transitable aleatoria de un mundo, lejos de un punto dado
  randomZoneCellFrom(world, fromPos, minDist = 12) {
    const g = world.grid;
    for (let t = 0; t < 50; t++) {
      const x = 2 + Math.floor(Math.random() * (g.w - 4));
      const z = 2 + Math.floor(Math.random() * (g.h - 4));
      if (!g.cells[z][x]) continue;
      const c = g.center(x, z);
      if (c.distanceTo(fromPos) >= minDist) return c;
    }
    return null;
  }

  // celda transitable aleatoria de la zona, lejos del jugador
  randomZoneCell(minDistFromPlayer = 12) {
    return this.randomZoneCellFrom(this.world, this.player.pos, minDistFromPlayer);
  }

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
  }

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
  }

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
  }

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
  }

  // ---------- contratos de zona (bounties, estilo susurros) ----------
  // Persisten por sesión (como la zona) hasta recargar la página.
  ensureZoneBounties(biome) {
    if (!this.zoneBounties) this.zoneBounties = {};
    if (!this.zoneBounties[biome]) {
      const pool = [
        { type: 'kill', goal: 30, desc: 'Da caza a 30 enemigos' },
        { type: 'elite', goal: 4, desc: 'Elimina 4 campeones o élites' },
        { type: 'chest', goal: 3, desc: 'Saquea 3 cofres' },
        { type: 'boss', goal: 1, desc: 'Derrota al Jefe de Mundo' },
        { type: 'goblin', goal: 1, desc: 'Caza al Goblin del Tesoro' },
      ];
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      const list = pool.slice(0, 3).map(b => ({ ...b, progress: 0, done: false }));
      this.zoneBounties[biome] = { list, rewardGiven: false };
    }
    return this.zoneBounties[biome];
  }

  bountyProgress(type, n = 1) {
    const w = this.world;
    if (w.type !== 'zone' || !w.bounties) return;
    const data = this.zoneBounties?.[w.biome];
    let changed = false;
    for (const b of w.bounties) {
      if (b.type !== type || b.done) continue;
      b.progress = Math.min(b.goal, b.progress + n);
      changed = true;
      if (b.progress >= b.goal) {
        b.done = true;
        this.ui.message(`📜 Contrato cumplido: ${b.desc}`, 3500);
        this.sfx('levelup');
      }
    }
    if (changed && data && !data.rewardGiven && w.bounties.every(b => b.done)) {
      data.rewardGiven = true;
      this.grantBountyReward();
    }
  }

  grantBountyReward() {
    const p = this.player, w = this.world;
    const floor = w.scaleFloor || 1;
    const at = p.pos;
    for (let i = 0; i < 8; i++) this.spawnGroundItem(makeGold(floor + 4), at);
    this.spawnGroundItem(generateItem(floor + 2, 'legendario', null, null, p.classId), at);
    this.spawnGroundItem(makeRiftKey(1), at);
    this.spawnRing(at.clone(), 2.2, 0xffd24a);
    this.ui.message('📜 ¡Todos los contratos de la zona cumplidos! Gran recompensa', 5000);
    this.music.sting();
  }

  // ---------- endgame: Tormento (dificultad) y Códice de Aspectos ----------
  // Nivel de Tormento desbloqueado, derivado del progreso (sin estado extra que
  // guardar): empuje de grietas o profundidad de mazmorra alcanzada.
  tormentUnlocked() {
    const r = this.player.records || {};
    return Math.min(10, Math.max(r.maxRift || 0, Math.floor((r.maxFloor || 1) / 6)));
  }

  setTorment(t) {
    const cap = this.tormentUnlocked();
    this.player.torment = Math.max(0, Math.min(cap, t | 0));
    this.ui.message(this.player.torment > 0
      ? `☠️ Dificultad fijada en Tormento ${this.player.torment}`
      : '☠️ Dificultad normal (sin Tormento)', 2500);
    this.save();
  }

  // avisa cuando el progreso desbloquea un nuevo nivel de Tormento
  checkTormentUnlock() {
    const cap = this.tormentUnlocked();
    if (this.player._tormentCap == null) { this.player._tormentCap = cap; return; }
    if (cap > this.player._tormentCap) {
      this.player._tormentCap = cap;
      this.ui.message(`☠️ ¡Nuevo nivel de dificultad: Tormento ${cap}! Ajústalo en la Estatua del Mundo (pueblo)`, 5000);
    }
  }

  // Códice: extrae el poder de un legendario al Códice permanente (consume el objeto)
  extractAspect(index) {
    const p = this.player;
    const it = p.inventory[index];
    if (!it || !it.power) return;
    if (!p.codex) p.codex = {};
    if (p.codex[it.power.id]) {
      this.ui.message('🔮 Ese aspecto ya está en tu Códice (no se duplica)', 3000);
    } else {
      p.codex[it.power.id] = { id: it.power.id, name: it.power.name, desc: it.power.desc };
      p.discovered.powers[it.power.id] = true;
      this.ui.message(`🔮 Aspecto «${it.power.name}» extraído al Códice`, 3500);
    }
    p.inventory.splice(index, 1); // el objeto se consume al extraer su poder
    this.sfx('levelup');
    this.ui.renderPanel();
    this.save();
  }

  imprintCost(item) {
    return Math.round((300 + (item.ilvl || 1) * 40) * (1 + (item.quality || 0) * 0.25));
  }

  // Códice: graba un aspecto conocido en un objeto sin poder (pasa a legendario)
  imprintAspect(index, powerId) {
    const p = this.player;
    const it = p.inventory[index];
    const power = p.codex?.[powerId];
    if (!it || !power || it.power || it.unidentified) return;
    const cost = this.imprintCost(it);
    if (p.gold < cost) { this.ui.message('🪙 No tienes oro suficiente'); return; }
    p.gold -= cost;
    it.power = { id: power.id, name: power.name, desc: power.desc };
    it.rarity = 'legendario';
    if (power.id === 'avaricia') it.affixes.mf = (it.affixes.mf || 0) + 30;
    this.sfx('levelup');
    this.ui.message(`🔮 Aspecto «${power.name}» grabado en ${it.name}`, 3000);
    this.ui.renderPanel();
    this.save();
  }

  // Bendiciones: al completar una grieta (corrupción `tier`) ofrece 3 opciones;
  // se equipa UNA por categoría (permanente). Estilo Last Epoch.
  offerBlessing(tier) {
    const pool = [...BLESSINGS];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const offers = pool.slice(0, 3).map(b => ({
      id: b.id, cat: b.cat, stat: b.stat, name: b.name,
      value: blessingValue(b, tier),
      text: b.desc.replace('{v}', blessingValue(b, tier)),
      tier,
    }));
    this.pendingBlessings = offers;
    this.ui.openBlessing(offers);
  }

  chooseBlessing(index) {
    const offer = (this.pendingBlessings || [])[index];
    this.pendingBlessings = null;
    if (!offer) return;
    const p = this.player;
    if (!p.blessings) p.blessings = {};
    p.blessings[offer.cat] = { id: offer.id, cat: offer.cat, stat: offer.stat, value: offer.value, name: offer.name, text: offer.text };
    p.recompute();
    this.sfx('levelup');
    this.ui.message(`🌟 Bendición de ${offer.cat}: «${offer.name}» (${offer.text})`, 4500);
    this.ui.closePanel();
    this.ui.updateHUD();
    this.save();
  }

  // ---------- Jefe Pináculo (uber) ----------
  fragmentCount() {
    return (this.player.materials || []).filter(it => it.kind === 'fragment').length;
  }

  pinnacleFloor() {
    const r = this.player.records || {};
    return 18 + Math.max(r.maxRift || 0, Math.floor((r.maxFloor || 1) / 2)) * 2;
  }

  summonPinnacle() {
    const p = this.player;
    const NEED = 3;
    if (this.fragmentCount() < NEED) { this.ui.message(`✴️ Necesitas ${NEED} Fragmentos de Pináculo`, 3000); return; }
    // consume 3 fragmentos de la bolsa de materiales
    let removed = 0;
    for (let i = p.materials.length - 1; i >= 0 && removed < NEED; i--) {
      if (p.materials[i].kind === 'fragment') { p.materials.splice(i, 1); removed++; }
    }
    this.ui.closePanel();
    this.loadWorld({ type: 'dungeon', floor: this.pinnacleFloor(), pinnacle: true });
  }

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
  }

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
  }

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
  }

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
  }

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
  }

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
  }

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
  }

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
  }

  // haz/línea visible breve entre dos puntos (curación, aviso de francotirador)
  spawnBeam(from, to, color, dur = 0.4) {
    const dir = to.clone().sub(from);
    const len = dir.length();
    if (len < 0.01) return;
    const geo = new THREE.CylinderGeometry(0.05, 0.05, len, 6);
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7 }));
    mesh.position.copy(from).addScaledVector(dir, 0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    this.fxGroup.add(mesh);
    this.fx.push({ mesh, t: 0, dur, ring: true });
  }

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
  }

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
  }

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
  }

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
  }

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
  }

  // Embestidor: línea de aviso de la carga inminente (ventana de escape).
  enemyChargeWarn(enemy, dir, len) {
    const end = enemy.pos.clone().add(new THREE.Vector3(dir.x, 0, dir.z).multiplyScalar(len));
    this.spawnBeam(enemy.pos.clone().setY(0.3), end.setY(0.3), 0xff5533, 1.0);
    // polvo bajo las patas anunciando la carga (telegrafía física)
    this.emitFx(ENEMY_FX.chargeWindup, enemy.pos.clone().setY(0.15));
    this.sfx('eshoot');
  }

  // Embestidor: polvo al impactar contra el jugador durante el dash.
  enemyChargeImpact(pos) {
    this.emitFx(ENEMY_FX.chargeImpact, (pos.clone?.() ?? pos).setY?.(0.3) ?? pos);
  }

  // Golpe pesado (slam): onda de polvo + esquirlas en el punto de impacto.
  enemySlamFx(pos) {
    const at = (pos.clone?.() ?? pos);
    if (at.setY) at.setY(0.2);
    this.emitFx(ENEMY_FX.slam, at);
    this.emitFx(ENEMY_FX.slamSpark, at);
  }

  // Aura de escarcha: niebla fría pulsante + esquirlas ascendentes (pulso ~0.6s,
  // disparado por Enemy.update mientras el aura está activa).
  enemyFrostAuraPulse(pos) {
    const at = (pos.clone?.() ?? pos);
    if (at.setY) at.setY(0.4);
    this.emitFx(ENEMY_FX.frostAura, at);
    this.emitFx(ENEMY_FX.frostMotes, at);
  }

  // Aura de exaltación (rally): destellos ascendentes sobre un aliado animado.
  enemyRallyFx(pos) {
    const at = (pos.clone?.() ?? pos);
    if (at.setY) at.setY(0.5);
    this.emitFx(ENEMY_FX.rallyAura, at);
  }

  // Teletransporte de brujo: implosión en el origen, aparición en el destino.
  enemyBlinkFx(fromPos, toPos) {
    const a = (fromPos.clone?.() ?? fromPos); if (a.setY) a.setY(0.8);
    const b = (toPos.clone?.() ?? toPos); if (b.setY) b.setY(0.8);
    this.emitFx(ENEMY_FX.blinkOut, a);
    this.emitFx(ENEMY_FX.blinkIn, b);
  }

  // Ataque cuerpo a cuerpo del enemigo: chispa breve en el punto de golpe.
  enemyMeleeFx(pos) {
    const at = (pos.clone?.() ?? pos);
    if (at.setY) at.setY(1.0);
    this.emitFx(ENEMY_FX.meleeHit, at);
  }

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
  }

  // goblin cargado: deja caer una moneda al huir (botín gratis del reguero)
  goblinGoldDrip(enemy) {
    const floor = this.world.scaleFloor || this.world.floor || 1;
    this.spawnGroundItem(makeGold(Math.max(1, floor - 1)), enemy.pos);
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
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6, side: THREE.DoubleSide })
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
        // Sangre Fría: crítico garantizado si el objetivo ya está ralentizado/congelado
        const cb = (opts.critBonus || 0) + (opts.coldblood && e.slowT > 0 ? 100 : 0);
        const { dmg, crit } = this.player.rollDamage(mult, cb);
        e.takeDamage(dmg, crit);
        if (opts.slow) e.slowT = opts.slow;
        if (opts.onHit) opts.onHit(e, dmg);
        hits++;
      }
    }
    if (hits) this.player.onDealHit(); // vida/maná al golpear (una vez por AoE)
    return hits;
  }

  // soportes asignados a una habilidad, siempre como array (multi-socket, máx 2).
  // tolera saves viejos en formato string.
  skillSupports(skillId) {
    const v = this.player?.supports?.[skillId];
    if (Array.isArray(v)) return v;
    if (typeof v === 'string' && v) return [v];
    return [];
  }

  // Daño por tiempo (sangrado/veneno): tics independientes del bucle principal.
  // Reutiliza el patrón de "charco" pero sobre un enemigo concreto. Usa setTimeout
  // para no tocar el bucle tick ni el update de las entidades (alcance acotado).
  applyDoT(enemy, totalDmg, ticks, interval, color = 'txt-dmg') {
    if (!enemy || !enemy.alive || totalDmg <= 0) return;
    const per = Math.max(1, Math.round(totalDmg / ticks));
    let n = 0;
    const tick = () => {
      if (this.state !== 'play' || !enemy.alive) return;
      enemy.takeDamage(per, false);
      if (++n < ticks && enemy.alive) setTimeout(tick, interval * 1000);
    };
    setTimeout(tick, interval * 1000);
  }

  // Encadenado: tras el impacto, busca enemigos cercanos al objetivo y dispara
  // proyectiles de rebote con daño reducido (−25% por salto). Hasta `jumps` saltos.
  spawnChainBounce(fromEnemy, baseDmg, jumps, exclude, color) {
    if (!fromEnemy || baseDmg <= 0 || jumps <= 0) return;
    const seen = new Set(exclude || []);
    seen.add(fromEnemy);
    let origin = fromEnemy;
    let dmg = baseDmg;
    for (let j = 0; j < jumps; j++) {
      dmg = Math.round(dmg * 0.75); // −25% de daño por salto
      if (dmg <= 0) break;
      let next = null, bd = 6 * 6;
      for (const e of this.enemies) {
        if (!e.alive || seen.has(e)) continue;
        const d = e.pos.distanceToSquared(origin.pos);
        if (d < bd) { bd = d; next = e; }
      }
      if (!next) break;
      seen.add(next);
      this.spawnProjectile({
        from: origin.pos.clone().setY(1.0), to: next.pos.clone().setY(1.0),
        speed: 18, range: Math.sqrt(bd) + 1, dmg, crit: false, friendly: true,
        color: color || 0x66ddff, size: 0.12,
      });
      origin = next;
    }
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

  // botón 🖐️: agarra el botín más cercano sin preguntar
  grabNearest() {
    if (!this.player?.alive || this.state !== 'play') return;
    const p = this.player;
    let best = null, bd = 9 * 9;
    for (const gi of this.groundItems) {
      if (gi === p.pickTarget) continue; // si repites, va a por el siguiente
      const d = gi.mesh.position.distanceToSquared(p.pos);
      if (d < bd) { bd = d; best = gi; }
    }
    if (!best) { this.ui.message('No hay botín cerca'); return; }
    if (Math.sqrt(bd) < 1.3) this.pickupGroundItem(best);
    else {
      p.pickTarget = best;
      p.moveTarget = null;
      p.attackTarget = null;
    }
  }

  attackNearest() {
    const p = this.player;
    if (!p || !p.alive) return;
    const e = this.nearestEnemy(12);
    if (!e) return;
    // si ya está a tiro, ataca al instante (funciona aunque te estés moviendo);
    // si no, camina hacia él
    if (p.pos.distanceTo(e.pos) <= p.cls.atkRange) {
      p.faceToward(e.pos);
      if (p.atkCd <= 0) p.basicAttack(e);
    } else {
      p.attackTarget = e; p.moveTarget = null;
    }
  }

  // echoMult: si se pasa (p.ej. 0.5), es una repetición del soporte Eco —
  // omite consumo de maná/CD y no vuelve a hacer eco (evita bucle).
  castSkillSlot(slot, echoMult = 0) {
    const p = this.player;
    if (!p || !p.alive || this.state !== 'play') return;
    const actives = p.cls.skills.filter(s => s.type !== 'passive' && p.skills[s.id] > 0).slice(0, 4);
    const sk = actives[slot];
    if (!sk) return;
    const isEcho = echoMult > 0;
    const lvl = p.skills[sk.id];
    const baseCost = Math.round(skillVal(sk.mana, lvl));
    if (!isEcho && (p.cds[sk.id] || 0) > 0) return;
    // coste extra de maná de algunos soportes (Eco +60%, Sobrecarga +40%)
    const supsCost = this.skillSupports(sk.id);
    let manaMul = 1;
    if (supsCost.includes('echo')) manaMul *= 1.6;
    if (supsCost.includes('overcharge')) manaMul *= 1.4;
    const cost = Math.round(baseCost * manaMul);
    if (!isEcho && p.mp < cost) { this.ui.message('Maná insuficiente'); return; }

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
    let mult = sk.mult ? skillVal(sk.mult, lvl) * (1 + synergyBonus(sk, p.skills) / 100) : 1;
    if (isEcho) mult *= echoMult; // la repetición del Eco pega al 50%
    // soportes asignados a esta habilidad (multi-socket: array de hasta 2 ids)
    const sups = this.skillSupports(sk.id); // normaliza a array siempre
    const has = id => sups.includes(id);
    if (has('amplify')) mult *= 1.3;
    if (has('concentrated')) mult *= 1.35;
    if (has('overcharge')) mult *= 1.5;
    const supSlow = has('freeze') ? 3 : sk.slow;
    const supPierce = (has('pierce') || has('chain')) ? true : sk.pierce;
    const supExtraProj = has('multi') ? 2 : 0;
    let supRadius = has('wide') ? 1.45 : 1;
    if (has('concentrated')) supRadius *= 0.7; // −30% radio (contrapartida)
    // Sangre Fría: crítico garantizado contra objetivos ya ralentizados/congelados
    const supColdblood = has('coldblood');
    // Daño por tiempo (Sed de Sangre/Veneno): total a repartir en tics, basado en el daño medio.
    const avgHit = (p.stats.dmgMin + p.stats.dmgMax) / 2 * mult;
    const supDoT = has('poison')
      ? { total: avgHit * 0.9, ticks: 5, interval: 1.0, color: 0x66ff66 }
      : has('bleed')
        ? { total: avgHit * 0.6, ticks: 3, interval: 1.0, color: 0xff4466 }
        : null;
    const applyDoT = e => { if (supDoT && e && e.alive) this.applyDoT(e, supDoT.total, supDoT.ticks, supDoT.interval); };
    let casted = true;

    // efectos temáticos por habilidad (impacto/estela/aura/buff). Tolerante:
    // emitFx no hace nada si el motor de partículas no está activo.
    const fx = SKILL_FX[sk.id];
    // pose de lanzamiento del jugador (raise breve de la mano), sin romper
    // el movimiento ni el ataque básico (usa el mismo canal `swing`).
    p.castPose?.(sk.type);

    switch (sk.type) {
      case 'melee': {
        const e = near && p.pos.distanceTo(near.pos) <= (sk.range || 2.2) ? near : null;
        if (!e) { this.ui.message('Ningún enemigo al alcance'); casted = false; break; }
        p.faceToward(e.pos);
        p.swing = 1;
        const cb = (sk.critBonus || 0) + (supColdblood && e.slowT > 0 ? 100 : 0);
        const { dmg, crit } = p.rollDamage(mult, cb);
        e.takeDamage(dmg, crit);
        if (supSlow && e.alive) e.slowT = supSlow;
        applyDoT(e);
        p.onDealHit();
        this.spawnRing(e.pos, 0.8, 0xffbb44);
        // Golpe Brutal: impacto físico contundente sobre el enemigo + polvo bajo.
        const hp = e.pos.clone().setY(1.0);
        this.emitFx(fx?.impact, hp);
        if (fx?.extra) this.emitFx(fx.extra, e.pos.clone().setY(0.1));
        break;
      }
      case 'aoe_self': {
        const rad = (skillVal(sk.radius, lvl) || sk.radius) * supRadius;
        this.spawnRing(p.pos, rad, sk.color || 0xffaa33);
        this.dealArea(p.pos, rad, mult, { slow: supSlow, coldblood: supColdblood, onHit: applyDoT });
        p.swing = 1;
        // Aura/onda centrada en el jugador (Torbellino, Nova de Hielo).
        if (fx?.aura) {
          const fp = sk.id === 'nova_hielo' ? p.pos.clone().setY(0.4) : p.pos.clone().setY(1.0);
          this.emitFx(fx.aura, fp);
        }
        if (fx?.extra) this.emitFx(fx.extra, p.pos.clone().setY(0.5));
        break;
      }
      case 'aoe_target': {
        p.faceToward(target);
        const rad = sk.radius * supRadius;
        this.spawnRing(target, rad, sk.color || 0xff6633);
        // bola descendente decorativa
        const ball = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6),
          new THREE.MeshBasicMaterial({ color: sk.color || 0xff6633 }));
        ball.position.copy(target).setY(5);
        this.fxGroup.add(ball);
        this.fx.push({ mesh: ball, t: 0, dur: 0.25, fall: target.clone() });
        // estela de caída (Meteoro) y, tras un instante, impacto/polvo en la zona.
        if (fx?.trail) this.emitFx(fx.trail, target.clone().setY(4.5));
        const gp = target.clone().setY(0.3);
        const dp = target.clone().setY(0.1);
        // sincroniza el burst de impacto con la llegada de la bola decorativa.
        setTimeout(() => {
          if (this.state !== 'play') return;
          if (fx?.impact) this.emitFx(fx.impact, gp);
          if (fx?.aura) this.emitFx(fx.aura, gp);
          if (fx?.extra) this.emitFx(fx.extra, dp);
          this.addShake?.(sk.id === 'terremoto' || sk.id === 'meteoro' ? 0.5 : 0.25);
        }, 230);
        this.dealArea(target, rad, mult, { slow: supSlow, coldblood: supColdblood, onHit: applyDoT });
        break;
      }
      case 'dash': {
        p.faceToward(target);
        const start = p.pos.clone();
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
            // estela de carga sembrada a lo largo del recorrido.
            if (fx?.trail && traveled % 0.6 < 0.3)
              this.emitFx(fx.trail, new THREE.Vector3(p.pos.x, 0.9, p.pos.z));
          }
        }
        const rad = sk.radius * supRadius;
        this.spawnRing(p.pos, rad, 0xffcc66);
        this.dealArea(p.pos, rad, mult, { slow: supSlow, coldblood: supColdblood, onHit: applyDoT });
        p.swing = 1;
        // impacto contundente al llegar.
        if (fx?.impact) this.emitFx(fx.impact, p.pos.clone().setY(0.7));
        break;
      }
      case 'proj': {
        p.faceToward(target);
        p.swing = 1;
        const count = (sk.count ? Math.floor(skillVal(sk.count, lvl)) : 1) + (p.powers?.has('multidisparo') ? 1 : 0) + supExtraProj;
        const baseAngle = Math.atan2(target.x - p.pos.x, target.z - p.pos.z);
        // fogonazo de lanzamiento en la mano (estela/abanico elemental).
        const muzzle = p.pos.clone().setY(1.0)
          .add(new THREE.Vector3(Math.sin(baseAngle) * 0.5, 0, Math.cos(baseAngle) * 0.5));
        if (fx?.aura) this.emitFx(fx.aura, muzzle);
        else if (fx?.trail) this.emitFx(fx.trail, muzzle);
        for (let i = 0; i < count; i++) {
          const off = count > 1 ? (i - (count - 1) / 2) * (sk.spread || 0.4) / Math.max(1, count - 1) * 2 : 0;
          const a = baseAngle + off;
          const to = p.pos.clone().add(new THREE.Vector3(Math.sin(a) * 5, 0, Math.cos(a) * 5));
          const cb = (sk.critBonus || 0) + (supColdblood && near && near.slowT > 0 ? 100 : 0);
          const { dmg, crit } = p.rollDamage(mult, cb);
          this.spawnProjectile({
            from: p.pos.clone().setY(1.0), to: to.setY(1.0),
            speed: sk.speed || 14, range: sk.range || 10,
            dmg, crit, friendly: true, pierce: supPierce, slow: supSlow,
            color: sk.color || 0xffffff, size: 0.14,
          });
        }
        // Encadenado y DoT de proyectil: se aplican sobre el objetivo apuntado
        // (el enemigo más cercano), donde tenemos confirmación de impacto.
        if (near && near.alive && p.pos.distanceTo(near.pos) <= (sk.range || 10)) {
          if (has('chain')) this.spawnChainBounce(near, Math.round(avgHit), 2, [], sk.color || 0x66ddff);
          applyDoT(near);
          // impacto elemental sobre el objetivo apuntado (feedback claro de golpe).
          if (fx?.impact) this.emitFx(fx.impact, near.pos.clone().setY(1.0));
        }
        break;
      }
      case 'buff': {
        const stats = {};
        for (const [k, arr] of Object.entries(sk.buff)) stats[k] = Math.round(skillVal(arr, lvl));
        p.addBuff(sk.id, stats, sk.dur, { name: sk.name, icon: sk.icon, desc: sk.desc });
        this.spawnRing(p.pos, 1.4, 0x66ddff);
        // aura de buff sobre el jugador (Grito de Guerra, Armadura Helada, Agilidad).
        if (fx?.aura) this.emitFx(fx.aura, p.pos.clone().setY(1.0));
        break;
      }
    }

    if (casted) {
      if (!isEcho) {
        p.mp -= cost;
        p.cds[sk.id] = sk.cd * (1 - (p.stats.cdr || 0) / 100); // reducción de enfriamiento
        // Eco: repite la habilidad ~0.5s después al 50% de daño (sin coste ni CD extra)
        if (has('echo')) setTimeout(() => this.castSkillSlot(slot, 0.5), 500);
      }
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
      const item = generateItem(Math.max(1, Math.round(p.level * 0.8)), q.reward.item, null, null, p.classId);
      item.unidentified = false;
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
    this.spawnGroundItem(generateItem(this.world.scaleFloor || this.world.floor, 'legendario'), boss.pos);
    for (let i = 0; i < 3; i++) this.spawnGroundItem(makeGold((this.world.scaleFloor || this.world.floor) + 3), boss.pos);
    // registro en la tabla local del desafío diario
    const time = Math.round((Date.now() - (this.dailyStart || Date.now())) / 1000);
    this.dailyLog.unshift({ date: today, cls: p.classId, level: p.level, floor: this.world.floor, time, hc: p.hardcore });
    this.dailyLog = this.dailyLog.slice(0, 14);
    try { localStorage.setItem('intentorpg_dailylog', JSON.stringify(this.dailyLog)); } catch { /* sin almacenamiento */ }
    const mm = Math.floor(time / 60), ss = String(time % 60).padStart(2, '0');
    this.ui.message(`🌟 ¡Desafío Diario completado en ${mm}:${ss}! Botín extra. Vuelve mañana.`, 5000);
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


  // viaje rápido desde un waypoint
  travelTo(dest) {
    this.ui.closePanel();
    if (dest === 'town') this.loadWorld({ type: 'town' });
    else if (dest === 'refuge') this.loadWorld({ type: 'refuge' });
    else {
      this.player.lastFloor = dest;
      this.loadWorld({ type: 'dungeon', floor: dest });
    }
  }

  // viaje a una zona abierta (regiones desbloqueadas por nivel)
  travelToZone(biome) {
    this.ui.closePanel();
    this.fromZone = null;
    this.loadWorld({ type: 'zone', biome });
  }

  // ---------- pactos: riesgo↔recompensa por piso ----------
  applyPact(pactId) {
    const pact = PACTS.find(p => p.id === pactId);
    if (!pact || this.world.pact) return;
    const m = pact.mods;
    this.world.pact = { id: pact.id, qty: m.qty || 0, mf: m.mf || 0, xp: m.xp || 0 };
    // potencia a los enemigos ya presentes
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (m.ehp) { const add = Math.round(e.maxHP * m.ehp); e.maxHP += add; e.hp += add; }
      if (m.edmg) e.def = { ...e.def, dmg: Math.round(e.def.dmg * (1 + m.edmg)) };
      if (m.espd) e.def = { ...e.def, spd: e.def.spd * (1 + m.espd) };
    }
    this.world.pactEnemyMods = { ehp: m.ehp || 0, edmg: m.edmg || 0, espd: m.espd || 0 };
    const altar = this.world.interactables.find(it => it.type === 'altar');
    if (altar) {
      altar.label = `${pact.icon} ${pact.name} (sellado)`;
      if (altar.mesh?.userData.crystal) altar.mesh.userData.crystal.material.emissiveIntensity = 0.2;
    }
    this.ui.message(`${pact.icon} ${pact.name} sellado — ${pact.desc}`, 4000);
    this.addShake(0.3, 0.3);
    this.sfx('eshoot');
    this.save();
  }


  // ---------- loot ----------
  onEnemyKilled(enemy) {
    const p = this.player;
    // afijo Escudado: si "muere" durante su ventana de inmunidad, el golpe no
    // cuenta — no da recompensas y Enemy.update lo revive en el próximo frame.
    if (enemy.def.shielded && enemy.shieldT > 0) {
      this.ui.spawnText(enemy.pos.clone().setY((enemy.def.scale || 1) + 0.5), '¡Inmune!', 'txt-heal');
      return;
    }
    p.gainXP(Math.round(enemy.def.xp * (1 + (this.world.pact?.xp || 0) / 100)));
    p.records.kills++;
    if (enemy.def.boss) p.records.bossKills++;
    if (enemy.def.rank) p.records.eliteKills++;
    if (enemy.def.mimic) p.records.mimics++;
    // bestiario: cuenta de muertes por tipo de enemigo
    if (enemy.def.id) p.discovered.bestiary[enemy.def.id] = (p.discovered.bestiary[enemy.def.id] || 0) + 1;
    this.questProgress('kill');
    if (enemy.def.rank) this.questProgress('elite');
    // contratos de zona (bounties)
    if (this.world.type === 'zone') {
      this.bountyProgress('kill');
      if (enemy.def.rank) this.bountyProgress('elite');
      if (enemy.def.worldBoss) this.bountyProgress('boss');
      if (enemy.def.goblin) this.bountyProgress('goblin');
    }
    if (enemy.def.boss) {
      this.questProgress('boss');
      this.checkDailyReward(enemy);
      this.addShake(0.45, 0.4);
      this.vibrate([60, 40, 80]);
      this.music.sting();
    }
    this.spawnBurst(enemy.pos, enemy.def.color, enemy.def.boss ? 18 : 8);
    // estallido de partículas teñido con el color/tipo del enemigo; jefes con un
    // estallido más espectacular (esquirlas + destellos estelares).
    {
      const dpos = enemy.pos.clone().setY(0.7);
      const col = hexNum(enemy.def.color ?? 0xffffff);
      if (enemy.def.boss) {
        this.emitFx(bossDeathBurst(col), dpos);
        this.emitFx(bossDeathStars(col), dpos);
        this.emitFx(deathSmoke(col, 1.8), dpos);
      } else {
        const s = enemy.def.rank ? 1.5 : (enemy.def.scale || 1);
        this.emitFx(deathBurst(col, s), dpos);
        this.emitFx(deathSmoke(col, s), dpos);
      }
    }

    // --- efectos al morir de los arquetipos nuevos (telegrafiados / justos) ---
    // Nigromante: al caer, sus esbirros invocados se DEBILITAN (pierden vida y
    // daño) — contrajuego claro: matar al invocador rebaja a su corte.
    if (enemy.def.mechanic === 'raise') {
      for (const e of this.enemies) {
        if (!e.alive || e.raisedBy !== enemy.uid) continue;
        e.hp = Math.max(1, Math.round(e.hp * 0.5));
        e.maxHP = Math.max(1, Math.round(e.maxHP * 0.5));
        e.def = { ...e.def, dmg: Math.max(1, Math.round(e.def.dmg * 0.6)) };
        const fg = e.group.userData.barFg;
        if (fg) { fg.scale.x = Math.max(0.001, e.hp / e.maxHP); fg.position.x = -0.43 * (1 - fg.scale.x); e.group.userData.bar.visible = true; }
        this.spawnRing(e.pos.clone(), 1.0, 0x447755);
      }
    }
    // Sembrador de Esporas: deja un saco telegrafiado que revienta en 3 crías
    // tras ~1.5s (con ventana de escape y marca de suelo).
    if (enemy.def.mechanic === 'split') {
      this.spawnSporeSack(enemy.pos.clone(), this.world.scaleFloor || this.world.floor || 1);
    }
    // afijo Cadenas: limpia el registro de la cadena al morir un miembro
    if (enemy.chainId && this.chains && this.chains[enemy.chainId]) {
      this.chains[enemy.chainId] = this.chains[enemy.chainId].filter(e => e.alive && e !== enemy);
      if (this.chains[enemy.chainId].length === 0) delete this.chains[enemy.chainId];
    }

    // poderes únicos al matar
    if (p.powers?.has('festin') && p.alive) {
      p.hp = Math.min(p.stats.maxHP, p.hp + p.stats.maxHP * 0.06);
      this.ui.spawnText(p.pos, '+❤️', 'txt-heal');
    }
    if (p.powers?.has('volatil')) {
      // el enemigo explota dañando a los cercanos
      const boom = Math.round((enemy.maxHP || 20) * 0.4);
      this.spawnRing(enemy.pos.clone(), 2.2, 0xff6622);
      this.spawnBurst(enemy.pos, 0xff6622, 10);
      for (const e of this.enemies) {
        if (e.alive && e !== enemy && e.pos.distanceToSquared(enemy.pos) <= 2.6 * 2.6)
          e.takeDamage(boom, false);
      }
    }
    const floor = this.world.scaleFloor || this.world.floor || 1;
    let drops;
    const lootOpts = { mf: (p.stats.mf || 0) + (this.world.pact?.mf || 0) + (this.world.tormentMF || 0), qty: (this.world.pact?.qty || 0) + (this.world.tormentQty || 0), cls: p.classId };
    if (enemy.def.mimic) drops = rollDrops(floor, { ...lootOpts, minItems: 1, itemChance: 0.3, goldChance: 1, potionChance: 0.5, setChance: 0.025 });
    else if (enemy.def.boss) drops = rollDrops(floor, { ...lootOpts, boss: true, goldChance: 1, potionChance: 0.8 });
    else if (enemy.def.rank === 'elite') drops = rollDrops(floor, { ...lootOpts, minItems: 1, itemChance: 0.3, goldChance: 1, potionChance: 0.4, setChance: 0.03 });
    else if (enemy.def.rank === 'campeon') drops = rollDrops(floor, { ...lootOpts, itemChance: 0.4, goldChance: 0.85, potionChance: 0.3, setChance: 0.02 });
    else drops = rollDrops(floor, lootOpts);
    if (p.powers?.has('avaricia')) for (const d of drops) if (d.kind === 'gold') d.amount = Math.round(d.amount * 1.5);
    // reliquia temática del jefe (baja probabilidad, mejora con el hallazgo mágico)
    if (enemy.def.boss && Math.random() < 0.12 * (1 + (p.stats.mf || 0) / 100))
      drops.push(makeRelic(enemy.def.id, floor));
    // grietas: el jefe de un piso profundo suelta una Llave de Grieta (entrada al endgame)
    if (enemy.def.boss && !this.world.rift && (this.world.floor || 0) >= 10 && Math.random() < 0.5)
      drops.push(makeRiftKey(1));
    // goblin del tesoro: lluvia de oro y un objeto extra (mágico+)
    if (enemy.def.goblin) {
      if (this.world.goblin === enemy) this.world.goblin = null;
      for (let i = 0; i < 6; i++) drops.push(makeGold(floor + 3));
      drops.push(generateItem(floor + 1, Math.random() < 0.12 ? 'legendario' : Math.random() < 0.5 ? 'raro' : 'magico', null, null, p.classId));
      this.ui.message('🪙 ¡Goblin del Tesoro abatido! Botín liberado', 3500);
      this.music.sting();
    }
    // jefe de mundo: botín mayor (legendario + grieta) y reaparece tras un rato
    if (enemy.def.worldBoss) {
      this.world.worldBoss = null;
      this.world.bossDone = true;
      this.world.bossT = 90; // volverá a aparecer
      this.world.bossDone = false;
      drops.push(generateItem(floor + 2, 'legendario', null, null, p.classId));
      drops.push(makeRiftKey(1));
      drops.push(makeFragment()); // fragmento para el Pináculo
      this.ui.message('👑 ¡Jefe de Mundo derrotado! Botín mayor + Fragmento de Pináculo', 5000);
    }
    // jefe Pináculo (uber): botín MÍTICO exclusivo
    if (enemy.def.uber) {
      p.records.uberKills = (p.records.uberKills || 0) + 1;
      drops.push(makeMythic(floor + 4, p.classId));
      drops.push(generateItem(floor + 3, 'legendario', null, null, p.classId));
      drops.push(makeGlyph(Math.max(2, (p.records.maxRift || 0) + 1)));
      for (let i = 0; i < 5; i++) drops.push(makeGold(floor + 6));
      drops.push(makeRiftKey(Math.max(1, (p.records.maxRift || 0))));
      this.ui.message('👁️ ¡Heraldo del Vacío derrotado! Ha caído un objeto MÍTICO', 6000);
      this.music.sting();
      this.addShake(0.5, 0.6);
    }
    // completar una grieta: registra nivel máximo, botín extra y una llave superior
    if (enemy.def.boss && this.world.rift) {
      const L = this.world.rift;
      p.records.maxRift = Math.max(p.records.maxRift || 0, L);
      this.checkTormentUnlock();
      drops.push(generateItem(floor, 'legendario', null, null, p.classId));
      drops.push(makeRiftKey(L + 1));
      if (Math.random() < 0.7) drops.push(makeFragment()); // fragmento para el Pináculo
      if (Math.random() < 0.5) drops.push(makeGlyph(L));    // glifo para el tablero
      // los glifos engarzados suben de rango al completar grietas (tope 10)
      for (const gl of Object.values(p.paragon.glyphs || {})) {
        if (gl.rank < 10) { gl.rank++; gl.name = `${gl.baseName} · rango ${gl.rank}`; }
      }
      p.recompute();
      this.ui.message(`🌀 ¡Grieta Nivel ${L} completada! Botín extra y Llave de Grieta Nv ${L + 1}`, 5000);
      this.music.sting();
      this._riftCompleted = L; // ofrece una bendición de corrupción al terminar
    }
    for (const d of drops) this.spawnGroundItem(d, enemy.pos);
    if (enemy.def.boss && !this.world.rift) this.ui.message(`💀 ¡Has derrotado al ${enemy.def.name}!`, 4000);
    this.sfx('death');
    this.save();
    // recompensa de corrupción: ofrece elegir una bendición permanente
    if (this._riftCompleted != null) { const L = this._riftCompleted; this._riftCompleted = null; this.offerBlessing(L); }
  }

  // abre una grieta de endgame consumiendo una llave del inventario
  // index = índice en la bolsa de materiales (p.materials)
  useRiftKey(index) {
    const p = this.player;
    const key = p.materials[index];
    if (!key || key.kind !== 'riftkey') return;
    p.materials.splice(index, 1);
    this.ui.closePanel();
    this.loadWorld({ type: 'dungeon', rift: key.riftLevel });
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
    const gi = { id: 'gi' + this.giUid++, item, mesh, bob: Math.random() * Math.PI * 2 };
    // pilar de luz por rareza: el loot bueno se ve desde lejos
    if (item.kind === 'item' || item.kind === 'gem' || item.kind === 'rune' || item.kind === 'riftkey' || item.kind === 'support' || item.kind === 'fragment' || item.kind === 'glyph') {
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.13, 2.4, 6, 1, true),
        new THREE.MeshBasicMaterial({
          color: RARITIES[item.rarity].glow, transparent: true, opacity: 0.3,
          blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
        }));
      beam.position.set(mesh.position.x, 1.2, mesh.position.z);
      this.lootGroup.add(beam);
      gi.beam = beam;
    }
    this.groundItems.push(gi);
  }

  pickupGroundItem(gi) {
    const p = this.player;
    // a prueba de doble recogida: si ya no está en la lista, no hagas nada
    // (un indexOf(-1) en el splice borraría el ÚLTIMO objeto y dejaría su modelo
    //  huérfano en el suelo — la causa de los "items pegados")
    const idx = this.groundItems.indexOf(gi);
    if (idx < 0) return;
    const it = gi.item;
    if (it.kind === 'gold') { p.gold += it.amount; p.records.goldEarned += it.amount; this.ui.spawnText(p.pos, `+${it.amount} 🪙`, 'txt-gold'); this.sfx('gold'); }
    else if (it.kind === 'potion') {
      if (p.potions[it.pot] >= 99) return;
      p.potions[it.pot]++;
      this.sfx('potion');
    } else if (it.kind === 'support') {
      // se aprende al recogerlo (queda disponible para asignar en el árbol)
      if (!p.knownSupports.includes(it.supportId)) {
        p.knownSupports.push(it.supportId);
        this.ui.message(`📘 ¡Soporte aprendido: ${it.name.replace('Soporte: ', '')}! Asígnalo en Habilidades`, 3500);
        this.sfx('levelup');
      } else { p.gold += 30; this.ui.message('Soporte ya conocido (+30 🪙)'); }
    } else if (it.kind === 'gem' || it.kind === 'rune' || it.kind === 'riftkey' || it.kind === 'fragment' || it.kind === 'glyph') {
      // materiales: van a la bolsa de materiales (no a la mochila)
      if (p.materials.length >= MAX_MATERIALS) { this.ui.message('Bolsa de materiales llena'); return; }
      p.materials.push(it);
      this.ui.message(`Obtienes: ${it.name}`, 1800);
      this.sfx('pickup');
    } else {
      if (p.inventory.length >= 32) { this.ui.message('Inventario lleno'); return; }
      p.inventory.push(it);
      if (!it.unidentified) p.discover(it); // si ya viene identificado, a la colección
      if (it.rarity === 'legendario') p.records.legendaries++;
      if (it.rarity === 'conjunto') {
        p.records.setPieces = (p.records.setPieces || 0) + 1;
        this.ui.message(`🟢 ¡Pieza de conjunto! ${it.name}`, 2500);
        this.sfx('levelup');
        this.vibrate([40, 30, 40]);
      } else {
        if (it.rarity === 'legendario') { this.vibrate([40, 30, 40]); this.ui.flourishLegendary?.(it.mythic ? `✦ ${it.name}` : it.name); }
        this.ui.message(`Obtienes: ${it.name}`, 1800);
        this.sfx('pickup');
      }
      this.tip('equipar', 'Abre el inventario (I / 🎒) y toca el objeto para equiparlo o compararlo');
    }
    this.lootGroup.remove(gi.mesh);
    gi.mesh.geometry.dispose(); gi.mesh.material.dispose();
    if (gi.beam) {
      this.lootGroup.remove(gi.beam);
      gi.beam.geometry.dispose(); gi.beam.material.dispose();
    }
    this.groundItems.splice(this.groundItems.indexOf(gi), 1);
    this.save();
  }




  // ---------- alijo compartido entre personajes ----------
  loadStash() {
    try { this.stash = JSON.parse(localStorage.getItem('intentorpg_stash') || '[]'); } catch { this.stash = []; }
  }

  saveStash() {
    try { localStorage.setItem('intentorpg_stash', JSON.stringify(this.stash)); } catch { /* sin almacenamiento */ }
  }

  depositToStash(invIndex) {
    const p = this.player;
    const item = p.inventory[invIndex];
    if (!item) return;
    if (this.stash.length >= 24) { this.ui.message('El alijo está lleno'); return; }
    p.inventory.splice(invIndex, 1);
    this.stash.push(item);
    this.saveStash();
    this.save();
  }

  takeFromStash(i) {
    const p = this.player;
    const item = this.stash[i];
    if (!item) return;
    if (p.inventory.length >= 32) { this.ui.message('Inventario lleno'); return; }
    this.stash.splice(i, 1);
    p.inventory.push(item);
    this.saveStash();
    this.save();
  }


  // ---------- muerte ----------
  onPlayerDeath() {
    this.state = 'dead';
    this.player.records.deaths++;
    this.sfx('death');
    if (this.player.hardcore) {
      // muerte permanente: el guardado se borra para siempre
      try { localStorage.removeItem(this.slotKey(this.activeSlot)); } catch { /* sin almacenamiento */ }
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
    const realDt = Math.min(0.05, this.clock.getDelta());
    if (this.state === 'select') { this.renderer.render(this.scene, this.camera); return; }
    this.monitorFPS(realDt);

    // --- hit-stop: congela el tiempo de juego unos ms al impactar ---
    // Se descuenta con el reloj real (no setTimeout). Mientras dura, el dt
    // de animación/movimiento se escala casi a 0 para un "punch" seco.
    let timeScale = 1;
    if (this.hitStopT > 0) {
      this.hitStopT = Math.max(0, this.hitStopT - realDt);
      timeScale = 0.02;
    }
    const dt = realDt * timeScale;

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
        if (f.mesh.geometry) { f.mesh.geometry.dispose(); f.mesh.material.dispose(); }
        else if (f.burst) { f.burst[0].m.geometry.dispose(); f.burst[0].m.material.dispose(); }
        this.fx.splice(i, 1);
        continue;
      }
      if (f.ring) { f.mesh.scale.setScalar(0.3 + k * 0.9); f.mesh.material.opacity = 0.8 * (1 - k); }
      if (f.ghost) f.mesh.material.opacity = 0.4 * (1 - k);
      if (f.fall) f.mesh.position.y = 5 * (1 - k);
      if (f.burst) {
        for (const pt of f.burst) {
          pt.vy -= 11 * dt;
          pt.m.position.x += pt.vx * dt;
          pt.m.position.y = Math.max(0.05, pt.m.position.y + pt.vy * dt);
          pt.m.position.z += pt.vz * dt;
          pt.m.scale.setScalar(1 - k * 0.8);
        }
      }
    }

    // ataques telegrafiados
    this.updateTelegraphs(dt);

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
      // charco de fuego: brasas que ascienden + humo (pulsos sobre la zona)
      if (fp.fire) {
        fp.emT = (fp.emT ?? 0) - dt;
        if (fp.emT <= 0) {
          fp.emT = 0.18;
          this.emitFx(ENEMY_FX.firePoolEmbers, fp.mesh.position.clone().setY(0.15));
          this.emitFx(ENEMY_FX.firePoolSmoke, fp.mesh.position.clone().setY(0.2));
        }
      }
      fp.tick -= dt;
      if (fp.tick <= 0 && this.state === 'play' && p.alive &&
          p.pos.distanceTo(fp.mesh.position) < fp.radius + 0.3) {
        fp.tick = 0.5;
        p.takeDamage(4 + 2 * (this.world.scaleFloor || 1), this.world.scaleFloor || 1);
      }
    }

    // loot: animación y recogida automática de oro/pociones
    const t = performance.now() / 1000;
    for (let i = this.groundItems.length - 1; i >= 0; i--) {
      const gi = this.groundItems[i];
      gi.mesh.rotation.y += dt * 2;
      gi.mesh.position.y = 0.35 + Math.sin(t * 3 + gi.bob) * 0.08;
      // filtro de loot: atenúa la baliza del botín por debajo del umbral (oro/pociones siempre visibles)
      const filtered = gi.item.rarity && !this.passesLootFilter(gi.item.rarity);
      gi.mesh.visible = !filtered;
      if (gi.beam) { gi.beam.visible = !filtered; gi.beam.material.opacity = 0.22 + Math.sin(t * 2.5 + gi.bob) * 0.1; }
      if (this.state === 'play') {
        const k = gi.item.kind;
        // recogida automática al pasar por encima: oro/pociones/soportes siempre;
        // el resto (objetos, gemas, runas, llaves, fragmentos, glifos) si hay
        // hueco en la mochila y supera el filtro de loot. Así, caminar hasta el
        // botín lo recoge aunque uses el joystick (que cancela el "ir a por él").
        const isMaterial = k === 'gem' || k === 'rune' || k === 'riftkey' || k === 'fragment' || k === 'glyph';
        const hasRoom = isMaterial ? p.materials.length < MAX_MATERIALS : p.inventory.length < 32;
        const needsBag = k === 'item' || isMaterial;
        const auto = k === 'gold' || k === 'potion' || k === 'support'
          || (needsBag && hasRoom && this.passesLootFilter(gi.item.rarity));
        if (auto && gi.mesh.position.distanceToSquared(p.pos.clone().setY(gi.mesh.position.y)) < 1.2)
          this.pickupGroundItem(gi);
      }
    }

    // interactuables
    this.nearVendor = false;
    this.nearEnchanter = false;
    if (this.state === 'play') {
      this.checkInteractables(dt);
      this.updateTriggers(dt);
      if (this.world.type === 'zone') this.zoneTick(dt);
    }

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
        c.position.y = (c.userData.baseY ?? 0.95) + Math.sin(t * 2.5) * 0.12;
      }
    }
    this.world.group.traverse(o => {
      if (o.userData?.flame) {
        o.userData.flame.scale.y = 1 + Math.sin(t * 11 + o.position.x) * 0.25;
      }
    });

    // cámara y luces siguen al jugador (con sacudida breve y amortiguada)
    this.camTarget.lerp(p.pos, Math.min(1, dt * 6));
    this.camera.position.copy(this.camTarget).add(this.camOffset);
    this.camera.lookAt(this.camTarget);
    // sacudida basada en trauma: usa tiempo REAL (sigue temblando aunque el
    // hit-stop congele el gameplay) y ruido suave para un movimiento orgánico.
    if (this.trauma > 0) {
      this.shakeClock += realDt;
      this.trauma = Math.max(0, this.trauma - realDt * 1.2); // decaimiento ~1.2/s
      const shake = this.trauma * this.trauma;               // trauma²
      const a = this.shakeMag * shake;
      const f = 22; // frecuencia del ruido
      this.camera.position.x += smoothNoise(this.shakeClock * f, 1) * a;
      this.camera.position.y += smoothNoise(this.shakeClock * f, 2) * a * 0.6;
      this.camera.position.z += smoothNoise(this.shakeClock * f, 3) * a;
      if (this.trauma === 0) this.shakeMag = 0;
    }
    this.playerLight.position.copy(p.pos).setY(2.2);
    this.sun.position.copy(p.pos).add(new THREE.Vector3(10, 18, 6));
    this.sun.target.position.copy(p.pos);
    // rim/relleno: desde detrás-arriba respecto a la cámara para recortar al
    // héroe contra el fondo (apunta al jugador)
    this.rimLight.position.copy(p.pos).add(new THREE.Vector3(-9, 12, -9));
    this.rimLight.target.position.copy(p.pos);

    // flicker de antorchas: ruido suave sobre la intensidad base (tiempo real)
    if (this.torchLights && this.torchLights.length) {
      for (const L of this.torchLights) {
        const base = L.userData.baseI || 0;
        const n = smoothNoise(t * 9 + (L.userData.flick || 0), 7); // -1..1
        L.intensity = base * (0.78 + 0.22 * (n * 0.5 + 0.5)) + n * base * 0.08;
      }
    }
    // partículas ambientales del bioma (siguen a la cámara)
    this.particles?.update(realDt, this.camera.position);
    // partículas de gameplay (impactos/habilidades/enemigos) — realDt para que
    // sigan fluyendo durante el hit-stop
    this.psys?.update(realDt);

    // UI: textos y etiquetas siguen al mundo (cada frame), pero el HUD y el
    // minimapa se refrescan a 10Hz — menos trabajo de DOM, mismo aspecto
    this.ui.updateFloats(dt);
    this.syncWorldLabels();
    this.hudTimer = (this.hudTimer || 0) + dt;
    if (this.hudTimer >= 0.1) {
      this.hudTimer = 0;
      this.ui.updateHUD();
      this.ui.drawMinimap();
      // el mapa completo, si está abierto, se refresca "en vivo": enemigos y
      // jugador se mueven mientras lo miras (el panel deja pasar el control)
      if (this.ui.activePanel === 'map') this.ui.renderMap();
    }

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

    // render: vía composer si el post-procesado está activo; si no (CDN no
    // cargado, toggle off o reduceMotion), render directo — nunca se rompe.
    if (this.postfx?.shouldRender) this.postfx.render();
    else this.renderer.render(this.scene, this.camera);
  }

  // Detecta el interactuable más cercano; la acción ya no se dispara al
  // pisar (portales/cofres/NPCs se usan con el botón de acción o Espacio)
  checkInteractables(dt) {
    const p = this.player;
    this.healPulse = Math.max(0, this.healPulse - dt);
    // niebla de guerra: marca como descubiertas las celdas alrededor del jugador
    const g = this.world.grid;
    if (!this.world.explored) this.world.explored = new Set();
    const cx = Math.floor(p.pos.x - g.ox), cz = Math.floor(p.pos.z - g.oz);
    for (let dz = -5; dz <= 5; dz++) for (let dx = -5; dx <= 5; dx++) {
      if (dx * dx + dz * dz > 30) continue;
      const x = cx + dx, z = cz + dz;
      if (x >= 0 && z >= 0 && x < g.w && z < g.h) this.world.explored.add(z * g.w + x);
    }
    let best = null, bestD = Infinity;
    // puertas automáticas (gate_zone / portal_town de zona): se cruzan caminando.
    // Se "arman" al alejarte para no rebotar al aparecer encima.
    let nearAuto = false;
    for (const it of this.world.interactables) {
      const d = p.pos.distanceTo(it.pos);
      if (it.auto) {
        if (d <= it.radius) {
          nearAuto = true;
          if (this.edgeArmed) { this.edgeArmed = false; this.interactWith(it); return; }
        }
        continue;
      }
      if (d > it.radius) continue;
      switch (it.type) {
        case 'healer':
          if ((p.hp < p.stats.maxHP || p.mp < p.stats.maxMP) && this.healPulse <= 0) {
            this.healPulse = 0.5;
            p.hp = Math.min(p.stats.maxHP, p.hp + p.stats.maxHP * 0.1);
            p.mp = Math.min(p.stats.maxMP, p.mp + p.stats.maxMP * 0.1);
            this.ui.spawnText(p.pos, '+❤️', 'txt-heal');
          }
          break;
        case 'chest':
          if (!it.opened && d < bestD) { best = it; bestD = d; }
          break;
        case 'vendor':
          this.nearVendor = true;
          if (d < bestD) { best = it; bestD = d; }
          break;
        case 'enchanter':
          this.nearEnchanter = true;
          if (d < bestD) { best = it; bestD = d; }
          break;
        default: // portales, waypoint, capitán, alijo
          if (d < bestD) { best = it; bestD = d; }
      }
    }
    if (!nearAuto) this.edgeArmed = true; // ya saliste de la puerta: lista para cruzar de vuelta
    this.currentInteract = best;
    if (best) this.tip('interactuar', 'Pulsa el botón de acción (o Espacio) para usar portales, abrir cofres y hablar con NPCs');
    this.tip('salir', 'Camina hacia la salida 🌿 del pueblo para entrar a las Tierras de la Cripta');
  }

  // botón de acción: interactúa si hay algo cerca; si no, ataca
  primaryAction() {
    if (!this.player || !this.player.alive || this.state !== 'play') return;
    if (this.currentInteract) this.interactWith(this.currentInteract);
    else this.attackNearest();
  }

  interactWith(it) {
    const p = this.player;
    switch (it.type) {
      case 'portal_dungeon':
        this.loadWorld({ type: 'dungeon', floor: it.minFloor ? Math.max(it.minFloor, p.lastFloor || 1) : (p.lastFloor || 1) });
        break;
      case 'portal_zone':
      case 'gate_zone':
        // salir del pueblo a la zona abierta (apareces junto a la entrada de la zona)
        this.fromZone = null;
        this.loadWorld({ type: 'zone', biome: it.biome, entry: 'fromTown' });
        break;
      case 'zone_dungeon':
        // entrar a una mazmorra instanciada desde la zona abierta (contenido difícil)
        this.fromZone = this.world.biome;
        this.loadWorld({ type: 'dungeon', floor: it.floor || 1 });
        break;
      case 'world_event':
        if (it.used) { this.ui.message('El obelisco ya se ha consumido'); break; }
        it.used = true;
        it.label = '🌀 Obelisco (agotado)';
        if (it.mesh?.userData.crystal) it.mesh.userData.crystal.material.emissiveIntensity = 0.2;
        this.world.event = { active: true, cur: 0, total: 3, pos: it.pos.clone() };
        this.ui.message('🌀 ¡El obelisco despierta! Sobrevive a las oleadas', 3500);
        this.addShake(0.3, 0.3);
        this.sfx('eshoot');
        break;
      case 'enchanter':
        this.ui.togglePanel('inv');
        this.ui.message('🔮 «Toca un objeto con afijos y reforjaré uno de ellos... por un precio»', 3500);
        break;
      case 'portal_town':
        // desde una mazmorra entrada por la zona → vuelves a la zona; desde la
        // zona → vuelves al pueblo (apareciendo en su puerta norte)
        if (this.fromZone) { const b = this.fromZone; this.fromZone = null; this.loadWorld({ type: 'zone', biome: b }); }
        else this.loadWorld({ type: 'town', entry: this.world.type === 'zone' ? 'fromZone' : null });
        break;
      case 'portal_next':
        p.lastFloor = this.world.floor + 1;
        this.loadWorld({ type: 'dungeon', floor: p.lastFloor });
        break;
      case 'portal_daily': {
        const d = new Date();
        const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
        this.loadWorld({ type: 'dungeon', floor: 3 + (seed % 8), seed, daily: true });
        break;
      }
      case 'waypoint':
        if (it.floor && !p.waypoints.includes(it.floor)) {
          p.waypoints.push(it.floor);
          this.ui.message(`🗺️ ¡Waypoint del piso ${it.floor} activado!`, 3500);
          this.sfx('portal');
          this.save();
        }
        this.ui.openWaypoints();
        break;
      case 'questgiver':
        this.ui.openQuest();
        break;
      case 'altar':
        if (this.world.pact) { this.ui.message('🩸 Ya has sellado un pacto en este piso'); break; }
        this.ui.openPacts();
        break;
      case 'stash':
        this.ui.openStash();
        break;
      case 'world_statue':
        this.ui.openProgress();
        break;
      case 'vendor':
        this.ui.togglePanel('shop');
        break;
      case 'chest':
        this.openChest(it);
        break;
      case 'shrine':
        this.useShrine(it);
        break;
    }
  }

  useShrine(it) {
    if (it.used) { this.ui.message('El santuario está agotado'); return; }
    const p = this.player;
    it.used = true;
    const floor = this.world.scaleFloor || this.world.floor || 1;
    switch (it.shrine) {
      case 'xp':
        p.xpBoostT = 60; p._xpBoostTotal = 60;
        this.ui.message('✨ ¡Bendición de Experiencia! +50% XP durante 60s', 3500);
        break;
      case 'dmg':
        p.addBuff('shrine_dmg', { dmgPct: 25 }, 45,
          { name: 'Bendición de Furia', icon: '⚔️', desc: '+25% daño' });
        this.ui.message('⚔️ ¡Bendición de Furia! +25% daño durante 45s', 3500);
        break;
      case 'pocion':
        p.potions.hp = Math.min(99, p.potions.hp + 2);
        p.potions.mp = Math.min(99, p.potions.mp + 2);
        p.hp = p.stats.maxHP;
        p.mp = p.stats.maxMP;
        this.ui.message('🧪 ¡Bendición de Vida! Curado al máximo y +2/+2 pociones', 3500);
        break;
      case 'oro':
        for (let i = 0; i < 4; i++) this.spawnGroundItem(makeGold(floor + 2), it.pos);
        this.ui.message('🪙 ¡Bendición Dorada!', 2500);
        break;
      case 'fortuna':
        p.addBuff('shrine_mf', { mf: 80 }, 60,
          { name: 'Bendición de la Fortuna', icon: '🍀', desc: '+80% hallazgo mágico' });
        this.ui.message('🍀 ¡Bendición de la Fortuna! +80% hallazgo mágico durante 60s', 3500);
        break;
      case 'avaricia':
        // invoca un Goblin del Tesoro junto al santuario
        this.spawnGoblin(it.pos.clone());
        this.ui.message('🪙 ¡Santuario de la Avaricia! Aparece un Goblin del Tesoro', 3500);
        break;
      case 'maldito': {
        this.spawnGroundItem(generateItem(floor, 'raro'), it.pos);
        for (let i = 0; i < 3; i++) {
          const a = Math.PI * 2 * i / 3;
          const pos = it.pos.clone().add(new THREE.Vector3(Math.sin(a) * 2, 0, Math.cos(a) * 2));
          if (!this.world.grid.walkable(pos.x, pos.z)) pos.copy(it.pos);
          pos.y = 0;
          // reintenta hasta conseguir un campeón/élite para que la emboscada pique
          let def = rollEnemyRank(scaleEnemy(pickEnemyDef(floor), floor), floor);
          for (let t = 0; t < 12 && !def.rank; t++)
            def = rollEnemyRank(scaleEnemy(pickEnemyDef(floor), floor), floor);
          const e = new Enemy(this, def, pos);
          this.enemies.push(e);
          this.entityGroup.add(e.group);
        }
        this.ui.message('💀 ¡El santuario estaba maldito! Una emboscada... y un tesoro', 3500);
        this.sfx('eshoot');
        break;
      }
    }
    it.label = '✨ Santuario agotado';
    if (it.mesh?.userData.crystal) {
      it.mesh.userData.crystal.material.emissiveIntensity = 0.1;
      it.mesh.userData.crystal.material.color.setHex(0x555555);
    }
    this.spawnRing(it.pos, 1.4, 0xffe9b0);
    this.sfx('levelup');
    this.save();
  }

  openChest(it) {
    if (it.opened) return;
    const p = this.player;
    it.opened = true;
    if (it.mimic) {
      // ¡el cofre era un monstruo!
      it.label = '';
      this.world.group.remove(it.mesh);
      const def = scaleEnemy(MIMIC, this.world.scaleFloor || this.world.floor);
      def.rankLabel = '📦 ¡Mímico!';
      def.labelCls = 'lbl-elite';
      def.mimic = true;
      const m = this.buffByPact(new Enemy(this, def, it.pos.clone()));
      this.enemies.push(m);
      this.entityGroup.add(m.group);
      this.ui.message('📦 ¡El cofre era un Mímico!');
      this.sfx('eshoot');
    } else {
      it.label = '📦 Cofre vacío';
      it.mesh.children[1].rotation.x = -1.1;
      const drops = rollDrops(this.world.scaleFloor || this.world.floor, { mf: (p.stats.mf || 0) + (this.world.pact?.mf || 0) + (this.world.tormentMF || 0), qty: (this.world.pact?.qty || 0) + (this.world.tormentQty || 0), cls: p.classId, minItems: 1, itemChance: 0.3, goldChance: 1, setChance: 0.02 });
      for (const drop of drops) this.spawnGroundItem(drop, it.pos);
      this.spawnGroundItem(makeGold(this.world.scaleFloor || this.world.floor), it.pos);
      p.records.chests++;
      this.questProgress('chest');
      if (this.world.type === 'zone') this.bountyProgress('chest');
      this.sfx('chest');
    }
  }

  syncWorldLabels() {
    const p = this.player;
    const entries = [];
    const maxD = 14 * 14;
    for (const gi of this.groundItems) {
      if (gi.mesh.position.distanceToSquared(p.pos) > maxD) continue;
      const it = gi.item;
      if ((it.kind === 'item' || it.kind === 'gem' || it.kind === 'rune' || it.kind === 'riftkey' || it.kind === 'support' || it.kind === 'fragment' || it.kind === 'glyph') && this.passesLootFilter(it.rarity)) {
        entries.push({
          id: gi.id, pos: gi.mesh.position,
          text: it.unidentified ? `${it.icon} ❓ sin identificar` : `${RGLYPH[it.rarity] || ''} ${it.icon} ${it.name}`,
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
        // por encima de la barra de vida para no taparla
        pos: e.pos.clone().setY(3.05 * (e.def.scale || 1)),
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

  // ---------- game-feel ----------
  // Hit-stop: breve congelado del tiempo al impactar. Usa el reloj del juego
  // (lo consume tick()), nunca setTimeout. Respeta reduceMotion.
  // Acepta milisegundos (número) o un tipo: 'normal' | 'heavy' | 'crit'.
  hitStop(amount) {
    if (this.settings.reduceMotion) return; // accesibilidad: sin congelado
    const ms = typeof amount === 'string' ? hitStopMs(amount) : amount;
    this.hitStopT = Math.max(this.hitStopT, ms / 1000);
  }
}

Object.assign(Game.prototype, economyMethods);

new Game();
