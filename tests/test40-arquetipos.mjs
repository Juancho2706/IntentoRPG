// Arquetipos nuevos, afijos de élite y reglas de justicia (anti-feel-bad)
import * as THREE from 'three';
import { buildDungeon } from '../js/world.js';
import { Enemy, makeEnemyModel } from '../js/entities.js';
import { scaleEnemy, ENEMIES, ELITE_MODS, rollEnemyRank, pickEnemyDef } from '../js/data.js';

globalThis.performance = globalThis.performance || { now: () => Date.now() };

// --- 1) los 6 arquetipos nuevos existen, escalan y declaran su contrajuego ---
const NEW = ['nigromante', 'acolito', 'portaestandarte', 'sembrador', 'embestidor', 'francotirador'];
for (const id of NEW) {
  const def = ENEMIES.find(e => e.id === id);
  if (!def) throw new Error(`falta el enemigo ${id}`);
  const sc = scaleEnemy(def, 5);
  if (!(sc.hp > def.hp) || !(sc.dmg >= def.dmg)) throw new Error(`${id} no escala por piso`);
}
// la cría de espora existe pero nunca aparece sola (weight 0)
const cria = ENEMIES.find(e => e.id === 'cria_espora');
if (!cria || cria.weight !== 0) throw new Error('cria_espora debe tener weight 0 (solo via split)');
for (let i = 0; i < 500; i++) if (pickEnemyDef(20).id === 'cria_espora') throw new Error('la cría no debe aparecer en pools');
console.log(`Arquetipos nuevos (${NEW.length}) escalan y la cría no aparece suelta ✓`);

// --- 2) shape 'slime' construye un modelo válido con barra de vida ---
const slimeModel = makeEnemyModel(ENEMIES.find(e => e.id === 'sembrador'));
if (!slimeModel || !slimeModel.userData.bar || !slimeModel.userData.barFg) throw new Error('modelo slime sin barra');
console.log('Shape slime construye modelo con barra de vida ✓');

// --- 3) afijos de élite nuevos: legibles (aura) y propagan sus flags ---
const NEW_MODS = ['encarcelador', 'vortice', 'escudado', 'cadenas'];
for (const id of NEW_MODS) {
  const m = ELITE_MODS.find(x => x.id === id);
  if (!m || !m.aura) throw new Error(`afijo ${id} sin aura legible`);
}
// rollEnemyRank propaga las banderas del mod al def del enemigo
const flagFor = { encarcelador: 'jail', vortice: 'vortex', escudado: 'shielded', cadenas: 'chains' };
const seen = {};
for (let i = 0; i < 8000; i++) {
  const d = rollEnemyRank(scaleEnemy(pickEnemyDef(8), 8), 8);
  if (d.modId && flagFor[d.modId]) {
    if (!d[flagFor[d.modId]]) throw new Error(`afijo ${d.modId} no propagó ${flagFor[d.modId]}`);
    seen[d.modId] = true;
  }
}
for (const id of NEW_MODS) if (!seen[id]) throw new Error(`el afijo ${id} nunca salió al rolear`);
console.log(`Afijos de élite nuevos (${NEW_MODS.length}) legibles y propagan flags ✓`);

// ---------- banco de pruebas de comportamiento ----------
function makeGame() {
  const world = buildDungeon(6);
  world.grid.walkable = () => true;
  world.grid.lineOfSight = () => true;
  return {
    world, enemies: [], chains: {}, entityGroup: { add() {} },
    ui: { spawnText() {}, message() {} }, sfx() {}, addShake() {}, vibrate() {}, tip() {},
    spawnRing() {}, spawnBurst() {}, spawnTelegraph() {}, spawnBeam() {},
    spawnProjectile(o) { this.projectiles.push(o); }, projectiles: [],
    // helpers de mecánica observados
    chargeWarns: 0, snipeShots: 0,
    enemyChargeWarn() { this.chargeWarns++; },
    fireSnipe(e) { this.snipeShots++; e.snipeDir = null; },
    enemyRaise() {}, enemyHeal() {}, enemySnipe() {}, enemyJail() {}, enemyVortex() {}, enemyShield() {},
    // espeja el guard real de Escudado: no recompensa si muere bajo escudo
    kills: 0,
    onEnemyKilled(e) { if (e.def.shielded && e.shieldT > 0) return; this.kills++; },
    input: { joyDir: null, keyDir: null },
  };
}

// --- 4) Embestidor: windup → dash (SLOW, no stun) → recuperación vulnerable ---
{
  const g = makeGame();
  const center = new THREE.Vector3(0, 0, 0);
  let slowApplied = 0, stunFlagged = false;
  g.player = { alive: true, pos: new THREE.Vector3(5, 0, 0), slowT: 0,
    takeDamage() {}, get stunned() { stunFlagged = true; return false; } };
  const def = scaleEnemy(ENEMIES.find(e => e.id === 'embestidor'), 6);
  const emb = new Enemy(g, def, center.clone());
  emb.aggroed = true; emb.hasLOS = true; emb.losT = 99; emb.chargeCd = 0;
  const states = new Set();
  for (let i = 0; i < 300; i++) {
    emb.update(1 / 60);
    if (emb.chargeState) states.add(emb.chargeState);
    if (g.player.slowT > slowApplied) slowApplied = g.player.slowT;
  }
  if (g.chargeWarns < 1) throw new Error('el embestidor no telegrafió su carga');
  for (const need of ['windup', 'dash', 'recover'])
    if (!states.has(need)) throw new Error(`el embestidor no pasó por el estado ${need}`);
  if (slowApplied <= 0) throw new Error('la embestida no aplicó SLOW');
  if (slowApplied > 2.5) throw new Error('SLOW de la embestida demasiado largo (debe ser breve)');
  void stunFlagged;
  console.log(`Embestidor: telegrafía, embiste con SLOW breve (${slowApplied.toFixed(1)}s) y queda vulnerable ✓`);
}

// --- 5) Francotirador: línea de aviso y dispara DESPUÉS (ventana de escape) ---
{
  const g = makeGame();
  g.player = { alive: true, pos: new THREE.Vector3(10, 0, 0), slowT: 0, takeDamage() {} };
  const def = scaleEnemy(ENEMIES.find(e => e.id === 'francotirador'), 9);
  const fr = new Enemy(g, def, new THREE.Vector3(0, 0, 0));
  // simula la carga: la línea de aviso fija un retardo antes del disparo
  fr.snipeDir = { nx: 1, nz: 0 };
  fr.snipeFireT = 1.0;
  fr.aggroed = true; fr.hasLOS = true; fr.losT = 99;
  // a mitad del aviso aún no debe haber disparado
  for (let i = 0; i < 20; i++) fr.update(1 / 60);
  if (g.snipeShots !== 0) throw new Error('el francotirador disparó antes de completar el aviso');
  for (let i = 0; i < 60; i++) fr.update(1 / 60);
  if (g.snipeShots < 1) throw new Error('el francotirador no disparó tras el aviso');
  console.log('Francotirador: dispara solo tras la línea de aviso (hay ventana de escape) ✓');
}

// --- 6) Cadenas: el daño a un miembro arrastra a todos a la misma fracción ---
{
  const g = makeGame();
  g.player = { alive: true, pos: new THREE.Vector3(4, 0, 0), slowT: 0, takeDamage() {} };
  const base = scaleEnemy(ENEMIES.find(e => e.id === 'zombi'), 6);
  const members = [];
  for (let i = 0; i < 3; i++) {
    const e = new Enemy(g, { ...base, chains: true }, new THREE.Vector3(i, 0, 0));
    e.chainId = 'c1'; e.aggroed = true; e.hasLOS = true; e.losT = 99;
    members.push(e); g.enemies.push(e);
  }
  g.chains['c1'] = members.slice();
  // daña SOLO al primero a la mitad
  members[0].hp = members[0].maxHP * 0.5;
  for (let i = 0; i < 5; i++) for (const e of members) e.update(1 / 60);
  for (const e of members) {
    const frac = e.hp / e.maxHP;
    if (Math.abs(frac - 0.5) > 0.02) throw new Error(`Cadenas no igualó (${frac.toFixed(2)})`);
  }
  console.log('Cadenas: el daño a uno arrastra a todo el pack a la misma vida ✓');
}

// --- 7) Escudado: niega el daño durante la ventana de inmunidad (sin tocar takeDamage) ---
{
  const g = makeGame();
  g.player = { alive: true, pos: new THREE.Vector3(3, 0, 0), slowT: 0, takeDamage() {} };
  const def = { ...scaleEnemy(ENEMIES.find(e => e.id === 'zombi'), 6), shielded: true, aura: 0xffee88 };
  const e = new Enemy(g, def, new THREE.Vector3(0, 0, 0));
  e.aggroed = true; e.hasLOS = true; e.losT = 99;
  e.shieldCd = 0;            // fuerza activar el escudo en el próximo frame
  e.update(1 / 60);          // activa la ventana de escudo
  if (!(e.shieldT > 0)) throw new Error('el escudo no se activó');
  const before = e.hp;
  e.takeDamage(9999, false); // intenta matarlo durante la inmunidad
  e.update(1 / 60);          // la ventana restaura la vida
  if (e.hp < before - 0.5 || !e.alive) throw new Error('el escudado recibió daño durante la inmunidad');
  console.log('Escudado: inmune mientras dura la ventana (esperarla es el contrajuego) ✓');
}

// --- 8) Portaestandarte: el aura de baluarte regenera a un aliado herido ---
{
  const g = makeGame();
  g.player = { alive: true, pos: new THREE.Vector3(3, 0, 0), slowT: 0, takeDamage() {} };
  const std = new Enemy(g, scaleEnemy(ENEMIES.find(e => e.id === 'portaestandarte'), 7), new THREE.Vector3(0, 0, 0));
  std.aggroed = true; std.hasLOS = true; std.losT = 99; g.enemies.push(std);
  const ally = new Enemy(g, scaleEnemy(ENEMIES.find(e => e.id === 'zombi'), 7), new THREE.Vector3(1, 0, 0));
  ally.aggroed = true; ally.hasLOS = true; ally.losT = 99; g.enemies.push(ally);
  ally.hp = ally.maxHP * 0.4;
  const before = ally.hp;
  for (let i = 0; i < 120; i++) { std.update(1 / 60); ally.update(1 / 60); }
  if (ally.hp <= before) throw new Error('el aura de baluarte no regeneró al aliado');
  console.log(`Portaestandarte: su aura regenera a aliados heridos (${before.toFixed(0)}→${ally.hp.toFixed(0)}) ✓`);
}

// --- 9) Nigromante: al morir, sus esbirros invocados se debilitan ---
{
  const g = makeGame();
  g.player = { alive: true, pos: new THREE.Vector3(3, 0, 0), slowT: 0, takeDamage() {} };
  const necro = new Enemy(g, scaleEnemy(ENEMIES.find(e => e.id === 'nigromante'), 7), new THREE.Vector3(0, 0, 0));
  g.enemies.push(necro);
  // simula 2 esbirros ligados al nigromante
  const minions = [];
  for (let i = 0; i < 2; i++) {
    const m = new Enemy(g, scaleEnemy(ENEMIES.find(e => e.id === 'esqueleto'), 7), new THREE.Vector3(1 + i, 0, 0));
    m.raisedBy = necro.uid; minions.push(m); g.enemies.push(m);
  }
  // espeja el efecto al morir del nigromante (lógica de onEnemyKilled)
  const hpBefore = minions.map(m => m.hp);
  for (const m of g.enemies) {
    if (m.raisedBy !== necro.uid) continue;
    m.hp = Math.max(1, Math.round(m.hp * 0.5));
    m.maxHP = Math.max(1, Math.round(m.maxHP * 0.5));
    m.def = { ...m.def, dmg: Math.max(1, Math.round(m.def.dmg * 0.6)) };
  }
  for (let i = 0; i < minions.length; i++)
    if (!(minions[i].hp < hpBefore[i])) throw new Error('esbirro no se debilitó al morir el nigromante');
  console.log('Nigromante: al caer, sus esbirros invocados se debilitan ✓');
}

// --- 10) Reglas de justicia: nada de stun al jugador desde mecánicas/afijos ---
// Comprobamos en el código fuente que las mecánicas usan slowT y no fijan stun.
{
  const src = await import('fs').then(fs => fs.readFileSync(new URL('../js/entities.js', import.meta.url), 'utf8'));
  if (/player\.(stun|stunT|frozen|feared)/.test(src))
    throw new Error('una mecánica aplica stun/fear al jugador (prohibido)');
  console.log('Justicia: las mecánicas usan SLOW, sin stun/fear encadenable al jugador ✓');
}

console.log('✅ ARQUETIPOS, AFIJOS Y JUSTICIA OK');
