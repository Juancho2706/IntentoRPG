// Paso 0 — hotfixes que rompían partidas. Regresiones headless de:
//  1) guardado de la build (skillSystemV/skillBranches/hotbar) + migración idempotente
//  2) uids de objetos únicos tras cargar (syncItemUids)
//  3) bolsa de materiales: gemas/runas apilan; llaves/fragmentos/glifos nunca bloqueados
//  4) la mascota recoge llaves de grieta (kind 'riftkey')
//  5) caminos entre regiones exigen el nivel mínimo
//  6/8/9) básico a distancia: recurso/robo/efectos SOLO al impactar (también con {pos})
//  7) aturdimiento con rendimientos decrecientes y regla de jefe
//  10) Enemy.dispose libera geometrías/materiales
//  11) los jefes con rangedChance disparan a distancia
//  12) todo `new Enemy(` del juego pasa por buffByPact (mods de grieta/pacto)
import * as THREE from 'three';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { CLASSES, BOSSES, scaleEnemy, pickEnemyDef } from '../js/data.js';
import { Player, Enemy, Projectile, Pet, MAX_MATERIALS, canAddMaterial, materialSlotsUsed } from '../js/entities.js';
import { makeGem, makeRune, makeRiftKey, makeFragment, makeGlyph, generateItem, syncItemUids, peekItemUid } from '../js/items.js';
import { worldFlowMethods } from '../js/game-world-flow.js';

globalThis.performance = globalThis.performance || { now: () => Date.now() };
const assert = (c, msg) => { if (!c) throw new Error(msg); };

// mundo abierto sin muros (los proyectiles vuelan libres)
const openWorld = { grid: { walkable: () => true } };
const mk = () => ({
  ui: { spawnText() {}, message() {}, flashDamage() {} }, sfx() {}, addShake() {}, vibrate() {}, tip() {},
  spawnBurst() {}, spawnRing() {}, emitFx() {}, hitStop() {}, onEnemyKilled() {}, applyDoT() {},
  input: { joyDir: null, keyDir: null }, world: openWorld, enemies: [], projectiles: [],
  spawnProjectile(o) { this.projectiles.push(new Projectile(this, o)); },
  stepProjectiles(sec) {
    for (let t = 0; t < sec; t += 1 / 60)
      for (let i = this.projectiles.length - 1; i >= 0; i--) if (this.projectiles[i].update(1 / 60)) this.projectiles.splice(i, 1);
  },
});

// ---------------------------------------------------------------- 1) guardado
{
  // Paso 2b.0 (guardado v3): `skills` se DERIVA del nivel (no se guarda);
  // skillSystemV/skillBranches/hotbar/skillPoints siguen persistiendo.
  const G = CLASSES.guerrero;
  const core = G.skills.find(s => s.cat === 'spender');
  const p = new Player(mk(), 'guerrero');
  p.level = 10; p.recompute(); p.skillPoints = 4;
  p.skillBranches = { [core.id]: { [`${core.id}_o`]: true } };
  p.hotbar = p.normalizeHotbar({ lmb: 'g_tajo', rmb: core.id, k1: null, k2: null, k3: null, k4: null });
  const snap = JSON.stringify({ s: p.skills, b: p.skillBranches, h: p.hotbar, pts: p.skillPoints });
  // dos recargas seguidas: el estado NO debe cambiar (antes: reembolso infinito)
  let cur = p;
  for (let i = 0; i < 2; i++) {
    const saved = JSON.parse(JSON.stringify(cur.toSaveData()));
    assert(saved.skillSystemV === 5, 'el guardado debe incluir skillSystemV (5)');
    assert(saved.skills === undefined, 'los rangos de habilidad ya no se guardan (se derivan del nivel)');
    assert(saved.skillBranches && saved.hotbar, 'el guardado debe incluir skillBranches y hotbar');
    cur = new Player(mk(), saved.classId, saved);
    const now = JSON.stringify({ s: cur.skills, b: cur.skillBranches, h: cur.hotbar, pts: cur.skillPoints });
    assert(now === snap, `recarga ${i + 1}: la build cambió\n antes ${snap}\n ahora ${now}`);
  }
  console.log('Guardado: habilidades derivadas/ramas/hotbar/puntos idénticos tras 2 recargas ✓');

  // save legado (sin skillSystemV): los puntos se recalculan UNA vez desde el nivel
  // (Nv10 → 9 puntos ganados, sin ramas) y la migración es idempotente
  const legacy = { classId: 'guerrero', level: 10, skills: { g_tajo: 1, [core.id]: 2 }, skillPoints: 3 };
  const a = new Player(mk(), 'guerrero', legacy);
  assert(a.skillPoints === 9, `migración legada: esperaba 9 puntos (Nv2–10), dio ${a.skillPoints}`);
  const b = new Player(mk(), 'guerrero', JSON.parse(JSON.stringify(a.toSaveData())));
  assert(b.skillPoints === 9, `la migración no es idempotente: ${b.skillPoints}`);
  console.log('Migración v4→v3 de guardado: puntos recalculados una sola vez e idempotente ✓');
}

// ---------------------------------------------------------------- 2) uids
{
  const g1 = makeGem(3); g1.uid = 500;
  const g2 = makeGem(3); g2.uid = 500;               // duplicado (save afectado por el bug)
  const sword = generateItem(5); sword.uid = 42;
  sword.gems = [{ ...makeGem(2), uid: 777 }];        // gema engarzada con uid alto
  const stashItem = generateItem(5); stashItem.uid = 900;
  const data = { inventory: [sword], materials: [g1, g2], equipment: { weapon: null }, cube: [], paragon: { glyphs: {} } };
  const renum = syncItemUids(data, [stashItem], []);
  assert(renum === 1, `debía re-numerar 1 duplicado, re-numeró ${renum}`);
  assert(g1.uid !== g2.uid, 'los duplicados deben quedar con uid distinto');
  assert(peekItemUid() > 900, 'el contador debe arrancar por encima del máximo uid guardado');
  const fresh = makeGem(1);
  const all = [sword.uid, sword.gems[0].uid, g1.uid, g2.uid, stashItem.uid];
  assert(!all.includes(fresh.uid), 'un objeto nuevo no debe repetir uid de uno guardado');
  console.log(`uids: contador sincronizado (>${900}) y duplicados re-numerados ✓`);
}

// ---------------------------------------------------------------- 3) bolsa
{
  // 60 pilas distintas = bolsa llena
  const mats = Array.from({ length: MAX_MATERIALS }, (_, i) => makeGem(i + 1));
  assert(materialSlotsUsed(mats) === MAX_MATERIALS, 'debe haber 60 huecos ocupados');
  assert(!canAddMaterial(mats, makeGem(MAX_MATERIALS + 10)), 'una gema nueva no debe caber con la bolsa llena');
  // una gema idéntica a una pila existente sí cabe (se apila)
  assert(canAddMaterial(mats, { ...mats[0], uid: 123456 }), 'una gema idéntica debe apilarse');
  // runas idénticas apilan: 20 runas iguales ocupan 1 hueco
  const r = makeRune();
  const runes = Array.from({ length: 20 }, () => ({ ...r }));
  assert(materialSlotsUsed(runes) === 1, 'runas idénticas deben ocupar un solo hueco');
  // materiales de progreso: nunca bloqueados y no ocupan hueco
  for (const it of [makeRiftKey(3), makeFragment(), makeGlyph(1)])
    assert(canAddMaterial(mats, it), `${it.kind} no debe bloquearse por el tope`);
  const withProg = [...mats, makeRiftKey(1), makeFragment(), makeGlyph(2)];
  assert(materialSlotsUsed(withProg) === MAX_MATERIALS, 'llaves/fragmentos/glifos no deben ocupar hueco');
  // migración: un save viejo (un objeto por unidad, sin contador) se interpreta apilado
  const old = new Player(mk(), 'guerrero', { classId: 'guerrero', materials: [makeGem(4), makeGem(4)] });
  assert(old.materials.length === 2, 'el save viejo conserva sus unidades');
  console.log('Bolsa: gemas/runas apilan, progreso nunca bloqueado, saves viejos compatibles ✓');
}

// ---------------------------------------------------------------- 4) mascota
{
  const fake = { player: { pet: { kind: 'lobo', upgrades: { materials: 2 }, collar: 'none' },
    materials: Array.from({ length: MAX_MATERIALS }, (_, i) => makeGem(i + 1)) } };
  const pet = new Pet(fake);
  assert(pet.autoPicks(makeRiftKey(2), fake.player), 'la mascota debe recoger llaves de grieta (riftkey)');
  assert(pet.autoPicks('riftkey', fake.player), 'autoPicks también acepta el kind');
  assert(pet.autoPicks(makeFragment(), fake.player) && pet.autoPicks(makeGlyph(1), fake.player), 'fragmentos/glifos con bolsa llena');
  assert(!pet.autoPicks(makeGem(MAX_MATERIALS + 3), fake.player), 'gema nueva con bolsa llena: no');
  console.log('Mascota: recoge riftkey/fragmentos/glifos aunque la bolsa esté llena ✓');
}

// ---------------------------------------------------------------- 5) caminos
{
  const msgs = [], loads = [];
  const g = Object.assign({ player: { level: 1 }, ui: { message: (m) => msgs.push(m), closePanel() {} },
    loadWorld: (s) => loads.push(s) }, worldFlowMethods);
  assert(g.crossZoneExit({ biome: 'Cavernas de Hielo' }) === false && !loads.length, 'nivel 1 no debe cruzar a Cavernas (nivel 6)');
  assert(msgs.some(m => m.includes('nivel 6')), 'debe avisar del nivel requerido');
  assert(g.travelToZone('Infierno') === false && !loads.length, 'el viaje rápido también respeta el nivel');
  g.player.level = 6;
  assert(g.crossZoneExit({ biome: 'Cavernas de Hielo' }) === true && loads[0]?.biome === 'Cavernas de Hielo', 'con nivel 6 sí cruza');
  console.log('Caminos entre regiones: exigen minLevel (avisa y no cruza) ✓');
}

// ------------------------------------------------- 6/8/9) básico a distancia
{
  const g = mk();
  const p = new Player(g, 'arquera'); g.player = p; p.pos.set(0, 0, 0);
  // ramas: Sediento (robo 14%) + Quebrantar (vulnerable)
  p.skillMods = { a_disparo: { a_disparo_f: 'a_disparo_f2', a_disparo_v: 'a_disparo_v2' } };
  const e = new Enemy(g, scaleEnemy(pickEnemyDef(1), 1), new THREE.Vector3(0, 0, 5));
  e.maxHP = e.hp = 99999; g.enemies = [e];
  p.mp = 0; p.hp = 10;
  // FALLO: dispara a un punto vacío (+x) → ni recurso, ni robo, ni efectos
  p.basicAttack({ pos: new THREE.Vector3(6, 0, 0) });
  assert(p.mp === 0, `el básico a distancia generó recurso sin impactar (${p.mp})`);
  g.stepProjectiles(2);
  assert(p.mp === 0 && p.hp === 10 && e.hp === 99999 && !(e.vulnT > 0), 'un disparo fallido no debe dar recurso/vida/efectos');
  // ACIERTO apuntando con {pos} (esquema WASD): todo se aplica AL IMPACTAR
  p.atkCd = 0;
  p.basicAttack({ pos: new THREE.Vector3(0, 0, 5) });
  assert(p.mp === 0, 'el recurso no debe llegar antes del impacto');
  g.stepProjectiles(2);
  const dealt = 99999 - e.hp;
  assert(dealt > 0, 'el proyectil debía impactar');
  assert(p.mp > 0, 'el impacto debe generar recurso');
  assert(e.vulnT > 0, 'las ramas del básico deben aplicarse con {pos} (WASD)');
  assert(Math.abs((p.hp - 10) - dealt * 0.14) < 0.01, `robo de vida debe ser 14% del daño infligido (${p.hp - 10} vs ${dealt * 0.14})`);
  console.log('Básico a distancia: recurso/robo/ramas solo al impactar, también apuntando a un punto ✓');
}

// ---------------------------------------------------------------- 7) aturdir
{
  const g = mk();
  const uptime = (e) => {
    let stunned = 0;
    for (let t = 0; t < 20; t += 0.1) { e.applyStun(1.0); if (e.stunT > 0) stunned += 0.1; e.tickStun(0.1); }
    return stunned / 20;
  };
  const n = new Enemy(g, scaleEnemy(pickEnemyDef(1), 1), new THREE.Vector3());
  assert(Math.abs(n.applyStun(1.0) - 1.0) < 1e-9, 'el primer aturdimiento a un normal dura completo');
  n.stunT = 0; n.stunDR = 0;
  const un = uptime(n);
  const b = new Enemy(g, scaleEnemy(BOSSES[0], 1), new THREE.Vector3());
  const first = b.applyStun(1.0);
  assert(first > 0 && first <= 0.36, `al jefe el aturdimiento debe reducirse mucho (${first})`);
  b.stunT = 0; b.stunDR = 0;
  const ub = uptime(b);
  assert(un < 0.4, `spam de aturdimiento: un normal no debe quedar bloqueado (${(un * 100).toFixed(0)}% del tiempo)`);
  assert(ub < 0.15, `spam de aturdimiento: el jefe no debe quedar bloqueado (${(ub * 100).toFixed(0)}% del tiempo)`);
  console.log(`Aturdimiento: rendimientos decrecientes (normal ${(un * 100).toFixed(0)}%, jefe ${(ub * 100).toFixed(0)}% del tiempo con spam) ✓`);
}

// ---------------------------------------------------------------- 10) dispose
{
  const e = new Enemy(mk(), scaleEnemy(pickEnemyDef(1), 1), new THREE.Vector3());
  const geos = new Set(), mats = new Set();
  e.group.traverse(o => { if (o.geometry) geos.add(o.geometry); if (o.material) [].concat(o.material).forEach(m => mats.add(m)); });
  let gd = 0, md = 0;
  for (const x of geos) x.addEventListener('dispose', () => gd++);
  for (const x of mats) x.addEventListener('dispose', () => md++);
  e.dispose(); e.dispose(); // idempotente
  assert(gd === geos.size && md === mats.size, `dispose debe liberar todo (${gd}/${geos.size} geos, ${md}/${mats.size} mats)`);
  console.log(`Enemy.dispose libera ${geos.size} geometrías y ${mats.size} materiales ✓`);
}

// ---------------------------------------------------------------- 11) jefe a distancia
{
  const shots = [];
  const g = Object.assign(mk(), { spawnProjectile: (o) => shots.push(o) });
  const boss = new Enemy(g, scaleEnemy(BOSSES[0], 1), new THREE.Vector3());
  const player = { pos: new THREE.Vector3(0, 0, 5) };
  const rnd = Math.random;
  try {
    Math.random = () => 0;
    boss.atkCd = 0;
    assert(boss.tryRangedVolley(1.5, player) === false, 'a rango melee no dispara (usa melee/slam)');
    assert(boss.tryRangedVolley(5, player) === true && shots.length === 1 && shots[0].friendly === false, 'el jefe debe disparar a distancia');
    assert(boss.tryRangedVolley(5, player) === false, 'respeta el enfriamiento de ataque');
    Math.random = () => 0.99;
    boss.atkCd = 0;
    assert(boss.tryRangedVolley(5, player) === false && boss.atkCd > 0, 'si falla la tirada, espera (no re-tira cada frame)');
  } finally { Math.random = rnd; }
  console.log('Jefes: el ataque a distancia (rangedChance) se dispara ✓');
}

// ---------------------------------------------------------------- 12) pactos
{
  const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'js');
  const bad = [];
  for (const f of readdirSync(dir).filter(f => f.endsWith('.js'))) {
    const lines = readFileSync(join(dir, f), 'utf8').split('\n');
    lines.forEach((l, i) => { if (/new Enemy\(/.test(l) && !/buffByPact\(/.test(l)) bad.push(`${f}:${i + 1}`); });
  }
  assert(!bad.length, 'enemigos creados sin buffByPact (no reciben mods de grieta/pacto): ' + bad.join(', '));
  console.log('Todos los spawns de enemigos pasan por buffByPact ✓');
}

console.log('\nHotfixes Paso 0: todas las regresiones OK ✓');
