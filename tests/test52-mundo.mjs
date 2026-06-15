// Mundo D4-lite: grafo de regiones (links), descubrimiento y pueblo favorito.
import { Player } from '../js/entities.js';
import { worldFlowMethods } from '../js/game-world-flow.js';
import { ZONE_LIST } from '../js/data.js';
import { buildDungeon } from '../js/world.js';

globalThis.performance = globalThis.performance || { now: () => Date.now() };

// --- grafo del mundo: cada zona enlaza con biomas válidos; enlaces simétricos ---
const names = new Set(ZONE_LIST.map(z => z.biome));
for (const z of ZONE_LIST) {
  for (const l of (z.links || [])) {
    if (!names.has(l)) throw new Error(`${z.biome} enlaza con bioma inexistente: ${l}`);
    const other = ZONE_LIST.find(x => x.biome === l);
    if (!(other.links || []).includes(z.biome)) throw new Error(`enlace no simétrico: ${z.biome} ↔ ${l}`);
  }
}
// la Cripta es un hogar (campamento) y el grafo es conexo desde ella
const homes = ZONE_LIST.filter(z => z.home);
if (!homes.some(z => z.biome === 'Cripta')) throw new Error('la Cripta debe ser un hogar');
const seen = new Set(['Cripta']); const stack = ['Cripta'];
while (stack.length) { const b = stack.pop(); for (const l of (ZONE_LIST.find(z => z.biome === b).links || [])) if (!seen.has(l)) { seen.add(l); stack.push(l); } }
if (seen.size !== ZONE_LIST.length) throw new Error('el mundo no es conexo desde la Cripta');
console.log(`Grafo del mundo: ${ZONE_LIST.length} regiones, enlaces simétricos y conexo desde la Cripta ✓`);

// --- jugador: descubrimiento y hogar por defecto ---
const world = buildDungeon(1);
const g = { ui: { message() {} }, sfx() {}, save() {}, world };
Object.assign(g, worldFlowMethods);
const p = new Player(g, 'guerrero'); g.player = p;
if (!p.discoveredZones.includes('Cripta')) throw new Error('la Cripta debe empezar descubierta');
if (p.homeZone !== 'Cripta') throw new Error('el hogar por defecto debe ser la Cripta');
console.log('Jugador: Cripta descubierta y como hogar por defecto ✓');

// --- pueblo favorito: solo refugios descubiertos ---
g.setHomeZone('Infierno');           // bastión SIN reclamar → no es refugio aún
if (p.homeZone !== 'Cripta') throw new Error('no debe fijar como hogar un bastión sin reclamar');
g.setHomeZone('Cripta');             // hogar válido y descubierto
if (p.homeZone !== 'Cripta') throw new Error('debe aceptar la Cripta como hogar');
console.log('Pueblo favorito: solo refugios descubiertos ✓');

// --- bastiones: hay al menos uno y empiezan sin reclamar ---
const strongholds = ZONE_LIST.filter(z => z.stronghold);
if (!strongholds.length) throw new Error('debe haber al menos un bastión');
if (p.strongholdsCleared.length) throw new Error('los bastiones empiezan sin reclamar');
// reclamar un bastión lo vuelve refugio elegible (tras descubrirlo)
const sb = strongholds[0].biome;
p.discoveredZones.push(sb);
p.strongholdsCleared.push(sb);
g.setHomeZone(sb);
if (p.homeZone !== sb) throw new Error('un bastión reclamado y descubierto debe poder fijarse como hogar');
console.log(`Bastiones: ${strongholds.length} sin reclamar al inicio; reclamado → refugio elegible ✓`);

console.log('\n✅ MUNDO D4-LITE OK');
