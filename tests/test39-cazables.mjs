// Cazabilidad de duendes y cobardes + contrato activeBuffs()
import * as THREE from 'three';
import { buildZone } from '../js/zones.js';
import { Player, Enemy } from '../js/entities.js';
import { scaleEnemy, GOBLIN, ENEMIES } from '../js/data.js';

globalThis.performance = globalThis.performance || { now: () => Date.now() };

const world = buildZone('Cripta', { seed: 7 });
world.grid.walkable = () => true;     // cinemática libre: aísla la lógica de persecución
world.grid.lineOfSight = () => true;

function makeGame() {
  return {
    world, enemies: [], entityGroup: { add() {} },
    groundItems: [], projectiles: [],
    ui: { spawnText() {}, message() {}, flashDamage() {} },
    sfx() {}, addShake() {}, vibrate() {}, tip() {},
    spawnRing() {}, spawnBurst() {}, spawnProjectile(o) { this.projectiles.push(o); },
    spawnGroundItem(item) { this.groundItems.push({ item }); },
    goblinEscape(e) { e.alive = false; e.fade = 2; e.escaped = true; },
    goblinGoldDrip(e) { this.groundItems.push({ item: { kind: 'gold' } }); },
    input: { joyDir: null, keyDir: null },
  };
}

// El jugador persigue al goblin a velocidad de movimiento (clic-mover) y mide
// si en una ventana razonable logra ponerse a rango de melee (alcanzable).
function chase(type, seconds = 14) {
  const g = makeGame();
  const p = new Player(g, 'guerrero');
  g.player = p;
  const home = new THREE.Vector3(0, 0, 0);
  p.pos.copy(home);

  const def = scaleEnemy(GOBLIN, 3);
  def.goblin = true;
  def.goblinType = type;
  // velocidades de spawnGoblin
  def.spd = type === 'veloz' ? 4.6 : type === 'cargado' ? 3.4 : 4.0;
  const gob = new Enemy(g, def, home.clone().add(new THREE.Vector3(2, 0, 0)));
  gob.escapeT = 999; // no nos interesa el escape por tiempo aquí
  g.enemies.push(gob);

  const dt = 1 / 30;
  let minDist = Infinity;
  for (let i = 0; i < seconds / dt; i++) {
    // el jugador siempre se dirige hacia el goblin
    p.moveTarget = gob.pos.clone();
    p.update(dt);
    gob.update(dt);
    const d = p.pos.distanceTo(gob.pos);
    if (d < minDist) minDist = d;
  }
  return minDist;
}

for (const type of ['veloz', 'cargado', 'portal']) {
  const d = chase(type);
  if (d > 2.1) throw new Error(`Goblin ${type} no es cazable a pie (dist mín ${d.toFixed(2)})`);
  console.log(`Goblin ${type}: alcanzable a pie (dist mín ${d.toFixed(2)}) ✓`);
}

// El goblin cargado deja reguero de oro al huir
{
  const g = makeGame();
  const p = new Player(g, 'guerrero'); g.player = p; p.pos.set(0, 0, 0);
  const def = scaleEnemy(GOBLIN, 3); def.goblin = true; def.goblinType = 'cargado'; def.spd = 3.4;
  const gob = new Enemy(g, def, new THREE.Vector3(2, 0, 0));
  gob.escapeT = 999; g.enemies.push(gob);
  for (let i = 0; i < 90; i++) gob.update(1 / 30);
  if (g.groundItems.length === 0) throw new Error('el goblin cargado no soltó oro al huir');
  console.log(`Goblin cargado: suelta reguero de oro (${g.groundItems.length} monedas) ✓`);
}

// Cobarde: se ralentiza por ráfagas y es alcanzable (no huye sin fin)
{
  const g = makeGame();
  const p = new Player(g, 'guerrero'); g.player = p; p.pos.set(0, 0, 0);
  const rata = ENEMIES.find(e => e.coward);
  const def = scaleEnemy(rata, 3);
  const e = new Enemy(g, def, new THREE.Vector3(2.5, 0, 0));
  e.aggroed = true; e.hasLOS = true;
  e.maxHP = 100; e.hp = 10; // poca vida → entra en modo huida
  g.enemies.push(e);

  let minDist = Infinity;
  const dt = 1 / 30;
  for (let i = 0; i < 6 / dt; i++) {
    p.moveTarget = e.pos.clone();
    p.update(dt);
    e.update(dt);
    minDist = Math.min(minDist, p.pos.distanceTo(e.pos));
  }
  if (minDist > def.range + 0.3) throw new Error(`cobarde no alcanzable (dist mín ${minDist.toFixed(2)})`);
  console.log(`Cobarde: alcanzable pese a huir (dist mín ${minDist.toFixed(2)}) ✓`);
}

// activeBuffs(): forma exacta y robustez
{
  const g = makeGame();
  const p = new Player(g, 'guerrero'); g.player = p;

  // sin efectos → []
  const empty = p.activeBuffs();
  if (!Array.isArray(empty) || empty.length !== 0) throw new Error('activeBuffs() sin efectos debe devolver []');

  // buff de habilidad/altar con metadatos
  p.addBuff('shrine_dmg', { dmgPct: 25 }, 45, { name: 'Bendición de Furia', icon: '⚔️', desc: '+25% daño' });
  p.xpBoostT = 60; p._xpBoostTotal = 60;
  p.slowT = 3; p._slowTotal = 3;

  const arr = p.activeBuffs();
  const KEYS = ['id', 'name', 'icon', 'remaining', 'total', 'desc'];
  for (const b of arr) {
    for (const k of KEYS) if (!(k in b)) throw new Error(`activeBuffs(): falta clave ${k}`);
    if (typeof b.remaining !== 'number' || typeof b.total !== 'number')
      throw new Error('remaining/total deben ser números (segundos)');
    if (typeof b.icon !== 'string' || !b.icon) throw new Error('icon debe ser un emoji (string)');
  }
  const ids = arr.map(b => b.id);
  for (const need of ['shrine_dmg', 'xp_boost', 'slow'])
    if (!ids.includes(need)) throw new Error(`activeBuffs() debería incluir ${need}`);
  console.log(`activeBuffs(): ${arr.length} efectos con forma {${KEYS.join(', ')}} ✓`);
}

console.log('test39-cazables OK');
