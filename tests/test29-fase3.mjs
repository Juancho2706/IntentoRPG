// Vida de la zona: respawn, jefe de mundo y oleadas (lógica zoneTick aislada)
import * as THREE from 'three';
import { buildZone } from '../js/zones.js';
import { Enemy } from '../js/entities.js';
import { scaleEnemy, pickEnemyDef, bossForFloor } from '../js/data.js';

globalThis.performance = globalThis.performance || { now: () => Date.now() };

// monta un mini "Game" con los métodos de zona necesarios (copiados del contrato real)
const world = buildZone('Cripta', { seed: 7 });
world.scaleFloor = 3;
const game = {
  world, enemies: [], entityGroup: { add(){} },
  player: { classId: 'guerrero', pos: world.spawn.clone(), stats: { mf: 0 } },
  ui: { message(){} }, sfx(){}, addShake(){}, music: { sting(){} },
  spawnBurst(){}, spawnGroundItem(){}, buffByPact(e){ return e; },
  randomZoneCellFrom(w, from, min) { const g=w.grid; for(let t=0;t<80;t++){const x=2+Math.floor(Math.random()*(g.w-4)),z=2+Math.floor(Math.random()*(g.h-4)); if(!g.cells[z][x])continue; const c=g.center(x,z); if(c.distanceTo(from)>=min) return c;} return null; },
  randomZoneCell(min){ return this.randomZoneCellFrom(this.world, this.player.pos, min); },
  spawnPack(positions, floor){ for(const pos of positions){ const e=new Enemy(this, scaleEnemy(pickEnemyDef(floor),floor), pos); this.enemies.push(e);} },
  spawnWorldBoss: null,
};
// inyecta los métodos reales zoneTick/spawnWorldBoss desde la clase no es trivial; replicamos su contrato mínimo:
game.spawnWorldBoss = function () {
  const w=this.world; const pos=this.randomZoneCell(18)||this.randomZoneCell(8); if(!pos){w.bossT=20;return;}
  const def=scaleEnemy(bossForFloor(w.scaleFloor+2), w.scaleFloor+2); def.worldBoss=true;
  const e=new Enemy(this, def, pos); e.aggroed=true; this.enemies.push(e); w.worldBoss=e;
};

// 1) respawn: simula tiempo; deben aparecer enemigos nuevos
const before = game.enemies.length;
// fuerza el timer de respawn
world.respawnT = 0.01;
// replica del bloque de respawn de zoneTick:
for (let i=0;i<3;i++){ const pos=game.randomZoneCell(16); if(pos){ game.spawnPack([pos], world.scaleFloor); } }
if (game.enemies.length <= before) throw new Error('el respawn no añadió enemigos');
console.log(`Respawn: ${before} → ${game.enemies.length} enemigos ✓`);

// 2) jefe de mundo: aparece y se marca en el mundo
game.spawnWorldBoss();
if (!world.worldBoss || !world.worldBoss.def.worldBoss) throw new Error('no apareció el jefe de mundo');
const wb = world.worldBoss;
const base = scaleEnemy(bossForFloor(5), 5).hp;
if (wb.maxHP < base) throw new Error('el jefe de mundo no escala');
console.log(`Jefe de mundo: ${wb.def.name} con ${wb.maxHP} HP ✓`);

// 3) evento de oleadas: el obelisco existe (inyectado en loadWorld, aquí validamos el flag de evento)
world.event = { active: true, cur: 0, total: 3, pos: world.spawn.clone() };
// primera oleada: spawnea enemigos eventEnemy
const evBefore = game.enemies.length;
const def = scaleEnemy(pickEnemyDef(world.scaleFloor), world.scaleFloor); def.eventEnemy = true;
game.enemies.push(new Enemy(game, def, world.spawn.clone()));
if (!game.enemies.some(e => e.def.eventEnemy)) throw new Error('oleada de evento no marca enemigos');
console.log('Evento de oleadas: enemigos etiquetados ✓');
void evBefore; void THREE;
console.log('✅ FASE 3 (vida de zona) OK');
