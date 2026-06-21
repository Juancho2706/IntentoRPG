// ============================================================
// Generación de ZONAS de mundo abierto (estilo Diablo 4)
// Terreno orgánico y conectado: nada de salas + pasillos.
// ============================================================
import * as THREE from 'three';
import {
  Grid, instancedBoxes, makePortal, makeWaypoint, makeNPC, makeTorch, mulberry32, BIOMES,
  makeShrineMesh, SHRINE_DEFS, makeGroundTextures, groundMatParams, scatterDecals, placeTownServices,
  makeRock, makeCrystalCluster, makeBonePile, makeRoot, makeGrassTuft, makeMushroom, makeRuinPillar,
} from './world.js';

// Paleta de props ambientales por bioma (colores coherentes con el grading).
const ZONE_DECOR = {
  'Cripta': { grass: 0x4e6a34, rock: 0x5f5a4e, mossColor: 0x46622f, root: true, moss: true, ground: { tint: 0x6a7a44, tintAmt: 0.35 } },
  'Cavernas de Hielo': { grass: 0x5a7a86, rock: 0x46586e, mossColor: 0x4a6a7a, frost: true, ground: { tint: 0x9fe8ff, tintAmt: 0.28 } },
  'Infierno': { grass: 0x7a4a2a, rock: 0x4a2a22, mossColor: 0x6a3320, ember: true, ground: { tint: 0xff6a22, tintAmt: 0.3 } },
  'Abismo Estelar': { grass: 0x4a3f6a, rock: 0x2e2748, mossColor: 0x5a3f8a, mushroom: true, ground: { tint: 0xaa88ff, tintAmt: 0.32 } },
};

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
  // suelo con grano por bioma: textura/normal generadas por canvas (coherente
  // con el color de cada bioma y el grading del composer). Cae a color plano
  // en entornos sin canvas (tests).
  const decor = ZONE_DECOR[biome.name] || ZONE_DECOR['Cripta'];
  const zTex = makeGroundTextures(biome.floor, { variation: 0.24, normalStrength: 1.9, ...(decor.ground || {}) });
  if (zTex) { for (const t of [zTex.map, zTex.normalMap, zTex.roughnessMap]) if (t) t.repeat.set(W / 4, H / 4); }
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(W, H),
    new THREE.MeshStandardMaterial(groundMatParams(biome.floor, zTex, 0.8))
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.05;
  ground.receiveShadow = true;
  group.add(ground);
  // grietas/manchas repartidas solo sobre celdas transitables del bioma
  scatterDecals(group, rnd, 60, {
    minX: grid.ox + 2, maxX: grid.ox + W - 2, minZ: grid.oz + 2, maxZ: grid.oz + H - 2,
    y: -0.05, color: 0x000000,
    isOpen: (x, z) => grid.walkable(x, z),
  });

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
  // "vestir" algunas formaciones interiores con una roca poligonal encima, para
  // romper la silueta cúbica (decorativo, sobre el muro ya existente)
  for (const p of obstaclePos) {
    if (rnd() > 0.18) continue;
    const rock = makeRock(rnd, { r: 0.5 + rnd() * 0.5, color: biome.wall, moss: decor.moss, mossColor: decor.mossColor });
    rock.position.set(p.x, 1.2, p.z); rock.scale.multiplyScalar(1.1 + rnd() * 0.5);
    group.add(rock);
  }

  // ----------------------------------------------------------
  // 5) Decoración dispersa con VIDA: props procedurales por bioma sobre celdas
  //    abiertas (no bloquean el paso). Mezcla de hierba/maleza, rocas con musgo,
  //    racimos de cristal, raíces, setas luminosas, huesos y ruinas, según el
  //    bioma. El grano de tierra (instanced) se mantiene para densidad barata.
  // ----------------------------------------------------------
  const pebblePos = [];   // chinas planas baratas (instanced) para densidad
  // contadores para no saturar de mallas individuales en zonas enormes
  let nGrass = 0, nRock = 0, nCryst = 0, nBone = 0, nRoot = 0, nMush = 0, nRuin = 0;
  const capG = 220, capR = 120, capC = 70, capB = 36, capRt = 50, capM = 70, capRu = 22;
  for (const [x, z] of openCells) {
    const roll = rnd();
    // chinas: muy frecuentes pero baratísimas (instanced más abajo)
    if (roll < 0.020) { const c = grid.center(x, z); pebblePos.push({ x: c.x, y: 0.06, z: c.z }); continue; }
    if (roll >= 0.085) continue; // densidad global de props "ricos"
    const c = grid.center(x, z);
    const jx = (rnd() - 0.5) * 0.6, jz = (rnd() - 0.5) * 0.6;
    let m = null;
    const t = rnd();
    if (t < 0.42 && nGrass < capG) { m = makeGrassTuft(rnd, { color: decor.grass }); nGrass++; }
    else if (t < 0.66 && nRock < capR) { m = makeRock(rnd, { r: 0.2 + rnd() * 0.35, color: decor.rock, moss: decor.moss, mossColor: decor.mossColor }); nRock++; }
    else if (t < 0.78 && biome.crystal && nCryst < capC) { m = makeCrystalCluster(rnd, { color: biome.crystal.color, emissive: biome.crystal.emissive, count: 2 + (rnd() * 2 | 0) }); nCryst++; }
    else if (t < 0.86 && decor.root && nRoot < capRt) { m = makeRoot(rnd); nRoot++; }
    else if (t < 0.86 && decor.mushroom && nMush < capM) { m = makeMushroom(rnd, { color: biome.crystal?.color ?? 0x9b6bff, emissive: biome.crystal?.emissive ?? 0x5a2fbf }); nMush++; }
    else if (t < 0.94 && nBone < capB) { m = makeBonePile(rnd); nBone++; }
    else if (nRuin < capRu) { m = makeRuinPillar(rnd, { color: decor.rock }); nRuin++; }
    else if (nGrass < capG) { m = makeGrassTuft(rnd, { color: decor.grass }); nGrass++; }
    if (!m) continue;
    m.position.set(c.x + jx, 0, c.z + jz);
    m.rotation.y = rnd() * Math.PI * 2;
    m.scale.multiplyScalar(0.85 + rnd() * 0.4);
    group.add(m);
  }
  if (pebblePos.length)
    group.add(instancedBoxes(pebblePos, [0.3, 0.14, 0.3], decor.rock,
      { vary: 0.12, castShadow: false }));

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

  const torchLights = []; // luces de antorcha (las llena el campamento y la sección 8)

  // ----------------------------------------------------------
  // 7) Interactables / POIs
  // ----------------------------------------------------------
  // HOME (seamless hub): el campamento/pueblo va integrado en el bolsillo seguro
  // del spawn — se sale caminando al mundo abierto, sin portal de retorno.
  let safeZone = null;
  let campRadius = 0;
  if (opts.townPocket) {
    const { radius } = placeTownServices(grid, group, interactables, torchLights, spawnCell, { radius: 10 });
    campRadius = radius;
    const half = radius + 0.5;
    safeZone = { minX: spawn.x - half, maxX: spawn.x + half, minZ: spawn.z - half, maxZ: spawn.z + half };
  } else {
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
  }

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

  // Cofres repartidos por la zona (uno de ellos custodiado por una élite)
  const placeChest = (cell, mimicChance) => {
    if (!cell) return null;
    const cPos = grid.center(cell[0], cell[1]);
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
    interactables.push({ type: 'chest', pos: cPos.clone(), radius: 1.2, label: '📦 Cofre', labelCls: 'lbl-chest', mesh: chest, opened: false, mimic: rnd() < mimicChance });
    return cPos;
  };
  // 2 cofres normales
  placeChest(pickOpenCell(15, Infinity), 0.15);
  placeChest(pickOpenCell(15, Infinity), 0.15);
  // 1 tesoro custodiado: cofre seguro con una élite vigilándolo
  const guardCell = pickOpenCell(20, Infinity);
  if (guardCell) {
    const gPos = placeChest(guardCell, 0);
    spawns.push({ kind: 'elite', pos: gPos.clone() });
  }

  // ----------------------------------------------------------
  // 7b) Santuarios de campo (reutilizan el sistema de mazmorra)
  // ----------------------------------------------------------
  // Garantiza un santuario de la Avaricia (goblin) y reparte 2 al azar.
  const placeShrine = (def, cell) => {
    if (!def || !cell) return;
    const sPos = grid.center(cell[0], cell[1]);
    const shrine = makeShrineMesh(def.color);
    shrine.position.copy(sPos);
    group.add(shrine);
    interactables.push({ type: 'shrine', shrine: def.kind, pos: sPos.clone(), radius: 1.5, label: `✨ ${def.name}`, labelCls: 'lbl-portal', mesh: shrine, used: false });
  };
  const avaricia = SHRINE_DEFS.find(s => s.kind === 'avaricia');
  placeShrine(avaricia, pickOpenCell(12, Infinity));
  for (let i = 0; i < 2; i++) {
    const def = SHRINE_DEFS[ri(0, SHRINE_DEFS.length - 1)];
    placeShrine(def, pickOpenCell(10, Infinity));
  }

  // ----------------------------------------------------------
  // 8) Antorchas (pocas luces reales por rendimiento móvil)
  // ----------------------------------------------------------
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
  const targetEnemies = 58;        // ~50-70 (algo menos = mejor FPS en gama media)
  // los enemigos no aparecen pegados a la ciudad: si hay campamento, exígeles
  // estar bien lejos del borde (anti-cheese: no se puede pegar-y-correr al pueblo)
  const spawnMinDist = campRadius ? campRadius + 9 : 9;
  for (let guard = 0; guard < 400 && placedEnemies < targetEnemies; guard++) {
    // centro del clúster lejos del spawn
    const center = pickOpenCell(spawnMinDist + 4, Infinity);
    if (!center) break;
    const packSize = ri(3, 6);
    const positions = [];
    for (let k = 0; k < packSize * 3 && positions.length < packSize; k++) {
      const ox = ri(-3, 3), oz = ri(-3, 3);
      const nx = center[0] + ox, nz = center[1] + oz;
      if (inBounds(nx, nz) && grid.cells[nz][nx] === 1 && cellDistToSpawn(nx, nz) >= spawnMinDist)
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
    interactables, spawns, triggers: [], torchLights, safeZone, isHome: !!opts.townPocket,
    fog: { color: biome.fog, near: 22, far: 60 },
    ambient: biome.ambient, ambientIntensity: 0.6,
    sun: { color: 0xfff2d8, intensity: 1.6 },
    clearColor: biome.fog,
  };
}
