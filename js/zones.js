// ============================================================
// Generación de ZONAS de mundo abierto (estilo Diablo 4)
// Terreno orgánico y conectado: nada de salas + pasillos.
// ============================================================
import * as THREE from 'three';
import {
  Grid, instancedBoxes, makePortal, makeWaypoint, makeNPC, makeTorch, mulberry32, BIOMES,
} from './world.js';

// Construye una zona abierta para el bioma indicado.
//   biomeName: nombre de un bioma de BIOMES (p.ej. 'Cripta').
//   opts.seed: si viene, RNG determinista vía mulberry32; si no, Math.random.
export function buildZone(biomeName, opts = {}) {
  const W = 120, H = 120;
  const grid = new Grid(W, H);
  const group = new THREE.Group();
  const interactables = [];
  const spawns = [];

  // bioma: busca por nombre; si no aparece, usa el primero como respaldo
  const biome = BIOMES.find(b => b.name === biomeName) || BIOMES[0];

  // RNG determinista opcional
  const rnd = opts.seed != null ? mulberry32(opts.seed) : Math.random;
  const ri = (min, max) => Math.floor(min + rnd() * (max - min + 1));

  // ----------------------------------------------------------
  // 1) Terreno orgánico mediante autómata celular
  // ----------------------------------------------------------
  // Sembrado aleatorio: 1 = transitable, 0 = obstáculo/muro.
  // El borde exterior siempre es muro.
  const MARGIN = 2;          // anillo de muro perimetral
  const FILL = 0.44;         // proporción inicial de obstáculos (se suaviza luego)
  let cells = Array.from({ length: H }, () => new Array(W).fill(0));
  for (let z = MARGIN; z < H - MARGIN; z++)
    for (let x = MARGIN; x < W - MARGIN; x++)
      cells[z][x] = rnd() < FILL ? 0 : 1;

  // Suavizado: regla 4-5 (un obstáculo sobrevive/aparece según vecinos muro)
  const inBounds = (x, z) => x >= 0 && z >= 0 && x < W && z < H;
  const wallNeighbors = (src, x, z) => {
    let n = 0;
    for (let dz = -1; dz <= 1; dz++)
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dz === 0) continue;
        const nx = x + dx, nz = z + dz;
        if (!inBounds(nx, nz) || src[nz][nx] === 0) n++; // fuera de límites cuenta como muro
      }
    return n;
  };
  for (let it = 0; it < 4; it++) {
    const next = Array.from({ length: H }, () => new Array(W).fill(0));
    for (let z = 0; z < H; z++)
      for (let x = 0; x < W; x++) {
        if (x < MARGIN || z < MARGIN || x >= W - MARGIN || z >= H - MARGIN) { next[z][x] = 0; continue; }
        const n = wallNeighbors(cells, x, z);
        // si rodeado de muros se vuelve muro; si abierto, queda abierto
        next[z][x] = n >= 5 ? 0 : 1;
      }
    cells = next;
  }

  // ----------------------------------------------------------
  // 2) Flood-fill: quedarse solo con la región abierta más grande
  // ----------------------------------------------------------
  const label = Array.from({ length: H }, () => new Array(W).fill(-1));
  let bestId = -1, bestSize = 0, curId = 0;
  for (let z = 0; z < H; z++)
    for (let x = 0; x < W; x++) {
      if (cells[z][x] !== 1 || label[z][x] !== -1) continue;
      // BFS sobre la componente abierta
      const stack = [[x, z]];
      label[z][x] = curId;
      let size = 0;
      while (stack.length) {
        const [cx, cz] = stack.pop();
        size++;
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + dx, nz = cz + dz;
          if (inBounds(nx, nz) && cells[nz][nx] === 1 && label[nz][nx] === -1) {
            label[nz][nx] = curId;
            stack.push([nx, nz]);
          }
        }
      }
      if (size > bestSize) { bestSize = size; bestId = curId; }
      curId++;
    }

  // Volcar al grid definitivo: transitable solo la componente mayor.
  for (let z = 0; z < H; z++)
    for (let x = 0; x < W; x++)
      grid.cells[z][x] = label[z][x] === bestId ? 1 : 0;

  // Recolectar todas las celdas transitables conectadas (para colocar cosas)
  const openCells = [];
  for (let z = 0; z < H; z++)
    for (let x = 0; x < W; x++)
      if (grid.cells[z][x] === 1) openCells.push([x, z]);

  // ----------------------------------------------------------
  // 3) Suelo: un único plano grande
  // ----------------------------------------------------------
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(W, H),
    new THREE.MeshStandardMaterial({ color: biome.floor, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.05;
  ground.receiveShadow = true;
  group.add(ground);

  // ----------------------------------------------------------
  // 4) Obstáculos instanciados (rocas/formaciones) + borde perimetral
  // ----------------------------------------------------------
  const obstaclePos = [];   // formaciones interiores [1,1.2,1]
  const borderPos = [];     // muro perimetral alto [1,2.5,1]
  for (let z = 0; z < H; z++)
    for (let x = 0; x < W; x++) {
      if (grid.cells[z][x] === 1) continue; // celda abierta, sin caja
      // ¿toca alguna celda abierta? solo así merece una caja (ahorra instancias)
      let near = false;
      for (let dz = -1; dz <= 1 && !near; dz++)
        for (let dx = -1; dx <= 1 && !near; dx++) {
          const nx = x + dx, nz = z + dz;
          if (inBounds(nx, nz) && grid.cells[nz][nx] === 1) near = true;
        }
      if (!near) continue;
      const c = grid.center(x, z);
      const isBorder = x < MARGIN + 1 || z < MARGIN + 1 || x >= W - MARGIN - 1 || z >= H - MARGIN - 1;
      if (isBorder) borderPos.push({ x: c.x, y: 1.25, z: c.z });
      else obstaclePos.push({ x: c.x, y: 0.6, z: c.z });
    }
  group.add(instancedBoxes(obstaclePos, [1, 1.2, 1], biome.wall, { vary: 0.08, castShadow: false }));
  group.add(instancedBoxes(borderPos, [1, 2.5, 1], biome.wall, { vary: 0.06, castShadow: false }));

  // ----------------------------------------------------------
  // 5) Decoración instanciada dispersa (rocas pequeñas / cristales)
  // ----------------------------------------------------------
  // Pequeñas rocas decorativas (no bloquean: van sobre celdas abiertas)
  const rockPos = [];
  const crystalPos = [];
  for (const [x, z] of openCells) {
    if (rnd() < 0.012) {
      const c = grid.center(x, z);
      rockPos.push({ x: c.x, y: 0.18, z: c.z });
    } else if (biome.crystal && rnd() < 0.006) {
      const c = grid.center(x, z);
      crystalPos.push({ x: c.x, y: 0.35, z: c.z });
    }
  }
  if (rockPos.length)
    group.add(instancedBoxes(rockPos, [0.45, 0.36, 0.45], biome.accent ? biome.accent.color : biome.wall,
      { vary: 0.1, castShadow: false }));
  if (crystalPos.length)
    group.add(instancedBoxes(crystalPos, [0.32, 0.8, 0.32], biome.crystal.color,
      { emissive: biome.crystal.emissive, emissiveIntensity: 1.1, vary: 0.05, castShadow: false }));

  // ----------------------------------------------------------
  // 6) Punto de aparición del jugador (celda abierta cerca del centro)
  // ----------------------------------------------------------
  // Elegir la celda transitable más próxima al centro de la rejilla.
  let spawnCell = openCells[0];
  let bestD = Infinity;
  for (const [x, z] of openCells) {
    const d = (x - W / 2) ** 2 + (z - H / 2) ** 2;
    if (d < bestD) { bestD = d; spawnCell = [x, z]; }
  }
  const spawn = grid.center(spawnCell[0], spawnCell[1]);

  // Utilidad: celda abierta aleatoria a >= minDist del spawn (en celdas)
  const cellDistToSpawn = (x, z) => Math.hypot(x - spawnCell[0], z - spawnCell[1]);
  const pickOpenCell = (minDist = 0, maxDist = Infinity) => {
    for (let t = 0; t < 200; t++) {
      const [x, z] = openCells[ri(0, openCells.length - 1)];
      const d = cellDistToSpawn(x, z);
      if (d >= minDist && d <= maxDist) return [x, z];
    }
    return null;
  };

  // ----------------------------------------------------------
  // 7) Interactables / POIs
  // ----------------------------------------------------------
  // Portal de vuelta al pueblo, junto al spawn (busca celda abierta contigua)
  let portalCell = spawnCell;
  for (const [dx, dz] of [[2, 0], [-2, 0], [0, 2], [0, -2], [2, 2], [-2, -2]]) {
    const nx = spawnCell[0] + dx, nz = spawnCell[1] + dz;
    if (inBounds(nx, nz) && grid.cells[nz][nx] === 1) { portalCell = [nx, nz]; break; }
  }
  const portalPos = grid.center(portalCell[0], portalCell[1]);
  const townPortal = makePortal(0x3399ff, 'Pueblo');
  townPortal.position.copy(portalPos);
  group.add(townPortal);
  interactables.push({ type: 'portal_town', pos: portalPos.clone(), radius: 1.3, label: '🌀 Volver al Pueblo', labelCls: 'lbl-portal', mesh: townPortal });

  // Waypoint a media distancia del spawn
  const wpCell = pickOpenCell(8, 22) || pickOpenCell(0) || spawnCell;
  const wpPos = grid.center(wpCell[0], wpCell[1]);
  const wp = makeWaypoint();
  wp.position.copy(wpPos);
  group.add(wp);
  interactables.push({ type: 'waypoint', pos: wpPos.clone(), radius: 1.3, label: '🗺️ Waypoint', labelCls: 'lbl-portal', mesh: wp });

  // 3 entradas de mazmorra repartidas lejos del spawn
  const dungeonFloors = [1, 2, 3];
  for (let i = 0; i < dungeonFloors.length; i++) {
    const dCell = pickOpenCell(28, Infinity) || pickOpenCell(18) || pickOpenCell(0);
    if (!dCell) continue;
    const dPos = grid.center(dCell[0], dCell[1]);
    const dPortal = makePortal(0x9933ff, 'Mazmorra');
    dPortal.position.copy(dPos);
    group.add(dPortal);
    interactables.push({ type: 'zone_dungeon', floor: dungeonFloors[i], pos: dPos.clone(), radius: 1.3, label: '🕳️ Entrada de Mazmorra', labelCls: 'lbl-portal', mesh: dPortal });
  }

  // Un cofre opcional lejos del spawn
  const chestCell = pickOpenCell(15, Infinity);
  if (chestCell) {
    const cPos = grid.center(chestCell[0], chestCell[1]);
    const chest = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.55),
      new THREE.MeshStandardMaterial({ color: 0x7a5a2a, roughness: 0.85 }));
    box.position.y = 0.25;
    const lid = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.18, 0.6),
      new THREE.MeshStandardMaterial({ color: 0xc9a227, metalness: 0.5, roughness: 0.5 }));
    lid.position.y = 0.56;
    box.castShadow = lid.castShadow = true;
    chest.add(box, lid);
    chest.position.copy(cPos);
    group.add(chest);
    interactables.push({ type: 'chest', pos: cPos.clone(), radius: 1.2, label: '📦 Cofre', labelCls: 'lbl-chest', mesh: chest, opened: false, mimic: rnd() < 0.15 });
  }

  // ----------------------------------------------------------
  // 8) Antorchas (pocas luces reales por rendimiento móvil)
  // ----------------------------------------------------------
  const torchLights = [];
  for (let i = 0; i < 6; i++) {
    const tCell = pickOpenCell(6, Infinity);
    if (!tCell) break;
    const tPos = grid.center(tCell[0], tCell[1]);
    const t = makeTorch(biome.torch);
    t.position.copy(tPos);
    group.add(t);
    if (i < 3) {
      const light = new THREE.PointLight(biome.torch, 12, 10, 1.6);
      light.position.set(tPos.x, 1.8, tPos.z);
      group.add(light);
      torchLights.push(light);
    }
  }

  // ----------------------------------------------------------
  // 9) Enemigos en CLÚSTERES repartidos por la zona (no junto al spawn)
  // ----------------------------------------------------------
  let placedEnemies = 0;
  const targetEnemies = 65;        // ~50-80
  for (let guard = 0; guard < 400 && placedEnemies < targetEnemies; guard++) {
    // centro del clúster lejos del spawn
    const center = pickOpenCell(14, Infinity);
    if (!center) break;
    const packSize = ri(3, 6);
    const positions = [];
    for (let k = 0; k < packSize * 3 && positions.length < packSize; k++) {
      const ox = ri(-3, 3), oz = ri(-3, 3);
      const nx = center[0] + ox, nz = center[1] + oz;
      if (inBounds(nx, nz) && grid.cells[nz][nx] === 1 && cellDistToSpawn(nx, nz) >= 10)
        positions.push(grid.center(nx, nz));
    }
    if (positions.length >= 3) {
      spawns.push({ kind: 'pack', positions });
      placedEnemies += positions.length;
    } else {
      for (const pos of positions) { spawns.push({ kind: 'enemy', pos }); placedEnemies++; }
    }
  }

  // ----------------------------------------------------------
  // Contrato de retorno (idéntico a buildDungeon en lo que usa main.js)
  // ----------------------------------------------------------
  return {
    type: 'zone', zone: biomeName, biome: biomeName, group, grid, spawn,
    interactables, spawns, triggers: [], torchLights,
    fog: { color: biome.fog, near: 22, far: 60 },
    ambient: biome.ambient, ambientIntensity: 0.6,
    sun: { color: 0xfff2d8, intensity: 1.6 },
    clearColor: biome.fog,
  };
}
