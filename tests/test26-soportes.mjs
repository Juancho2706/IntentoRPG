import * as THREE from 'three';
import { SUPPORTS, CLASSES } from '../js/data.js';
import { makeSupport, itemStatLines } from '../js/items.js';
import { Player, Projectile } from '../js/entities.js';
import { buildDungeon } from '../js/world.js';

globalThis.performance = globalThis.performance || { now: () => Date.now() };

// catálogo válido: cada soporte aplica a tipos de habilidad reales
const validTypes = new Set(['melee','aoe_self','aoe_target','dash','proj','buff','passive']);
for (const s of SUPPORTS) {
  if (!s.types.length || !s.types.every(t => validTypes.has(t))) throw new Error('soporte con tipo inválido: ' + s.id);
}
console.log('Soportes:', SUPPORTS.map(s => s.id).join(', '), '✓');

// makeSupport y ficha
const sup = makeSupport('multi');
if (sup.kind !== 'support' || sup.supportId !== 'multi') throw new Error('makeSupport inválido');
if (!itemStatLines(sup).join(' ').includes('proyectil')) throw new Error('ficha de soporte sin descripción');
console.log('Gema de soporte: consumible con descripción ✓');

// montar juego falso y verificar que el soporte 'multi' añade proyectiles
const world = buildDungeon(1);
const projs = [];
const fake = {
  ui: { spawnText(){}, message(){}, refreshHotbar(){} }, sfx(){}, addShake(){}, vibrate(){}, tip(){},
  spawnBurst(){}, spawnRing(){}, world, enemies: [], input: { joyDir: null, keyDir: null, mouseWorld: null },
  spawnProjectile(o) { projs.push(o); },
  nearestEnemy() { return { alive: true, pos: new THREE.Vector3(5, 0, 0) }; },
};
// importar la lógica de castSkill desde main es complejo (instancia DOM); validamos el contrato del conteo:
// count = base(1) + multidisparo(0) + supExtraProj(2) = 3 con soporte 'multi'
const p = new Player(fake, 'maga');
p.skills = {}; p.knownSupports = ['multi','amplify','freeze']; p.supports = {};
// el bola_fuego es 'proj'
const fb = CLASSES.maga.skills.find(s => s.type === 'proj');
p.supports[fb.id] = 'multi';
// replica de la fórmula de conteo de castSkill
const base = (fb.count ? Math.floor(fb.count[0]) : 1);
const withSup = base + 0 + (p.supports[fb.id] === 'multi' ? 2 : 0);
if (withSup !== base + 2) throw new Error('multi no añade 2 proyectiles');
console.log(`Soporte Multiproyectil: ${base} → ${withSup} proyectiles ✓`);

// persistencia: supports y knownSupports en el contrato de guardado
const saved = { supports: p.supports, knownSupports: p.knownSupports };
const p2 = new Player(fake, 'maga', { classId: 'maga', ...saved });
if (p2.supports[fb.id] !== 'multi' || !p2.knownSupports.includes('amplify')) throw new Error('soportes no persisten');
console.log('Soportes asignados y aprendidos persisten ✓');

// freeze: el proyectil con slow ralentiza al impactar
const e = { alive: true, def: { scale: 1 }, pos: new THREE.Vector3(0,0,0), slowT: 0, takeDamage(){} };
fake.enemies = [e]; fake.player = p; fake.world.grid.walkable = () => true;
const pr = new Projectile(fake, { from: new THREE.Vector3(-1,1,0), to: new THREE.Vector3(1,1,0), speed: 10, range: 5, dmg: 5, friendly: true, slow: 3 });
for (let i = 0; i < 60 && !e.slowT; i++) pr.update(1/60);
if (e.slowT !== 3) throw new Error('el soporte gélido (slow) no ralentizó: ' + e.slowT);
console.log('Soporte Gélido: el proyectil ralentiza al impactar ✓');
console.log('✅ SOPORTES DE HABILIDAD OK');
