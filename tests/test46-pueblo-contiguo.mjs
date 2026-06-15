// Pueblo contiguo (seamless hub): la Cripta es el hogar con un campamento en el
// bolsillo seguro del spawn — servicios dentro, enemigos fuera, sin portal.
import * as THREE from 'three';
import { buildZone } from '../js/zones.js';

globalThis.performance = globalThis.performance || { now: () => Date.now() };

// --- HOGAR: Cripta con campamento (townPocket) ---
const home = buildZone('Cripta', { seed: 12345, townPocket: true });
if (!home.isHome) throw new Error('el hogar debe marcar isHome');
if (!home.safeZone) throw new Error('el hogar debe definir safeZone');
const sz = home.safeZone;
if (!(sz.maxX > sz.minX && sz.maxZ > sz.minZ)) throw new Error('safeZone inválida');

// servicios del campamento presentes
const types = new Set(home.interactables.map(i => i.type));
for (const t of ['healer', 'vendor', 'enchanter', 'questgiver', 'petkeeper', 'stash', 'world_statue', 'portal_daily']) {
  if (!types.has(t)) throw new Error('falta servicio en el campamento: ' + t);
}
console.log('Campamento: servicios completos (curandero/mercader/encantadora/capitán/domador/alijo/estatua/diaria) ✓');

// NO hay portal de "volver al pueblo" (eres el pueblo): se sale caminando
if (types.has('portal_town')) throw new Error('el hogar no debe tener portal_town (es seamless)');
console.log('Sin portal de retorno: se sale caminando al mundo abierto ✓');

// el spawn es transitable y está dentro de la zona segura
const sc = home.spawn;
if (!home.grid.walkable(sc.x, sc.z)) throw new Error('el spawn del campamento no es transitable');
if (!(sc.x >= sz.minX && sc.x <= sz.maxX && sc.z >= sz.minZ && sc.z <= sz.maxZ)) throw new Error('el spawn debe estar dentro del campamento');
console.log('Spawn transitable y dentro del campamento ✓');

// ningún enemigo inicial aparece dentro del campamento seguro
const inSafe = (p) => p.x >= sz.minX && p.x <= sz.maxX && p.z >= sz.minZ && p.z <= sz.maxZ;
let bad = 0;
for (const s of home.spawns) {
  const ps = s.positions || (s.pos ? [s.pos] : []);
  for (const p of ps) if (inSafe(p)) bad++;
}
if (bad) throw new Error(`${bad} posiciones de enemigo dentro del campamento`);
console.log(`Enemigos fuera del campamento (${home.spawns.length} grupos/spawns, 0 dentro) ✓`);

// --- ZONA NORMAL (otro bioma): mantiene portal de retorno, sin campamento ---
const wild = buildZone('Cavernas de Hielo', { seed: 999 });
if (wild.isHome || wild.safeZone) throw new Error('una zona normal no debe ser hogar');
if (!wild.interactables.some(i => i.type === 'portal_town')) throw new Error('una zona normal debe tener portal_town');
console.log('Zona normal: sin campamento y con portal de retorno ✓');

console.log('\n✅ PUEBLO CONTIGUO (SEAMLESS HUB) OK');
