// ============================================================
// Generación del mundo: pueblo y mazmorras procedurales
// ============================================================
import * as THREE from 'three';

function ri(min, max) { return Math.floor(min + Math.random() * (max - min + 1)); }

// RNG determinista para la mazmorra diaria (misma semilla = mismo trazado)
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Biomas de la mazmorra según la profundidad
const BIOMES = [
  { name: 'Cripta', minFloor: 1, floor: 0x3c3a44, wall: 0x2a2733, fog: 0x070609,
    ambient: 0x556677, torch: 0xff9944 },
  { name: 'Cavernas de Hielo', minFloor: 6, floor: 0x39495e, wall: 0x263750, fog: 0x060c14,
    ambient: 0x6688bb, torch: 0x66bbff,
    accent: { color: 0x9fe8ff, emissive: 0x2288bb, chance: 0.045 },
    crystal: { color: 0xbfeaff, emissive: 0x44aadd } },
  { name: 'Infierno', minFloor: 11, floor: 0x462a26, wall: 0x2f1816, fog: 0x130404,
    ambient: 0x885544, torch: 0xff5522,
    accent: { color: 0xff6a22, emissive: 0xbb3300, chance: 0.05 },
    crystal: { color: 0xff8844, emissive: 0xcc3300 } },
  { name: 'Abismo Estelar', minFloor: 16, floor: 0x2a2440, wall: 0x1a1530, fog: 0x070512,
    ambient: 0x7766aa, torch: 0xbb66ff,
    accent: { color: 0xaa88ff, emissive: 0x6633cc, chance: 0.05 },
    crystal: { color: 0xcc99ff, emissive: 0x7744cc } },
];

// Cuadrícula de colisión. cells[z][x] = 1 transitable, 0 muro
class Grid {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.ox = -w / 2; this.oz = -h / 2;
    this.cells = Array.from({ length: h }, () => new Array(w).fill(0));
  }
  cellAt(wx, wz) {
    const x = Math.floor(wx - this.ox), z = Math.floor(wz - this.oz);
    if (x < 0 || z < 0 || x >= this.w || z >= this.h) return 0;
    return this.cells[z][x];
  }
  walkable(wx, wz, r = 0.32) {
    return this.cellAt(wx - r, wz - r) && this.cellAt(wx + r, wz - r) &&
           this.cellAt(wx - r, wz + r) && this.cellAt(wx + r, wz + r);
  }
  center(x, z) { return new THREE.Vector3(this.ox + x + 0.5, 0, this.oz + z + 0.5); }
}

function instancedBoxes(positions, size, color, opts = {}) {
  const geo = new THREE.BoxGeometry(size[0], size[1], size[2]);
  const mat = new THREE.MeshStandardMaterial({
    color, roughness: opts.roughness ?? 0.95, metalness: 0.02,
    emissive: opts.emissive ?? 0x000000, emissiveIntensity: opts.emissiveIntensity ?? 1,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, positions.length);
  const m = new THREE.Matrix4();
  const c = new THREE.Color();
  for (let i = 0; i < positions.length; i++) {
    const p = positions[i];
    m.makeTranslation(p.x, p.y, p.z);
    mesh.setMatrixAt(i, m);
    c.set(color).offsetHSL(0, 0, (Math.random() - 0.5) * (opts.vary ?? 0.06));
    mesh.setColorAt(i, c);
  }
  mesh.castShadow = !!opts.castShadow;
  mesh.receiveShadow = opts.receiveShadow !== false;
  return mesh;
}

function makePortal(color, label) {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.9, 0.12, 10, 28),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.6, roughness: 0.4 })
  );
  ring.position.y = 1.2;
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(0.78, 24),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.45, side: THREE.DoubleSide })
  );
  disc.position.y = 1.2;
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(1.1, 1.25, 0.18, 20),
    new THREE.MeshStandardMaterial({ color: 0x444450, roughness: 0.9 })
  );
  base.position.y = 0.09;
  g.add(ring, disc, base);
  g.userData.spin = [ring, disc];
  g.userData.label = label;
  return g;
}

function makeNPC(color, hatColor) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.2, 10), mat);
  body.position.y = 0.6;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0xd9a878, roughness: 0.8 }));
  head.position.y = 1.4;
  body.castShadow = head.castShadow = true;
  g.add(body, head);
  if (hatColor) {
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.5, 10),
      new THREE.MeshStandardMaterial({ color: hatColor, roughness: 0.85 }));
    hat.position.y = 1.75;
    g.add(hat);
  }
  return g;
}

function makeWaypoint() {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.15, 0.22, 8),
    new THREE.MeshStandardMaterial({ color: 0x55606e, roughness: 0.8 }));
  base.position.y = 0.11;
  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0),
    new THREE.MeshStandardMaterial({ color: 0x44ddff, emissive: 0x22aacc, emissiveIntensity: 1.6 }));
  crystal.position.y = 0.95;
  g.add(base, crystal);
  g.userData.crystal = crystal;
  return g;
}

function makeTorch(flameColor = 0xffaa33) {
  const g = new THREE.Group();
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 1.4, 6),
    new THREE.MeshStandardMaterial({ color: 0x4a3520, roughness: 1 }));
  stick.position.y = 0.7;
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.4, 8),
    new THREE.MeshBasicMaterial({ color: flameColor }));
  flame.position.y = 1.55;
  g.add(stick, flame);
  g.userData.flame = flame;
  return g;
}

// ---------------------------------------------------------
// PUEBLO
// ---------------------------------------------------------
export function buildTown() {
  const W = 36, H = 36;
  const grid = new Grid(W, H);
  const group = new THREE.Group();
  const interactables = [];

  // todo transitable excepto el borde
  for (let z = 1; z < H - 1; z++)
    for (let x = 1; x < W - 1; x++)
      grid.cells[z][x] = 1;

  // suelo
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(W, H),
    new THREE.MeshStandardMaterial({ color: 0x5e7a44, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);

  // camino central de tierra
  const path = new THREE.Mesh(
    new THREE.PlaneGeometry(4, H - 4),
    new THREE.MeshStandardMaterial({ color: 0x8a7355, roughness: 1 })
  );
  path.rotation.x = -Math.PI / 2;
  path.position.y = 0.01;
  group.add(path);

  // muralla perimetral
  const wallPos = [];
  for (let z = 0; z < H; z++)
    for (let x = 0; x < W; x++)
      if (x === 0 || z === 0 || x === W - 1 || z === H - 1) {
        const c = grid.center(x, z);
        wallPos.push({ x: c.x, y: 1, z: c.z });
      }
  group.add(instancedBoxes(wallPos, [1, 2, 1], 0x6b6258, { castShadow: true }));

  // casas (bloquean colisión)
  const houses = [
    { x: 5, z: 6, w: 5, d: 4 }, { x: 26, z: 5, w: 6, d: 5 },
    { x: 4, z: 24, w: 5, d: 5 }, { x: 27, z: 25, w: 5, d: 4 },
    { x: 25, z: 15, w: 4, d: 4 },
  ];
  for (const h of houses) {
    for (let z = h.z; z < h.z + h.d; z++)
      for (let x = h.x; x < h.x + h.w; x++)
        if (grid.cells[z]) grid.cells[z][x] = 0;
    const cx = grid.ox + h.x + h.w / 2, cz = grid.oz + h.z + h.d / 2;
    const body = new THREE.Mesh(new THREE.BoxGeometry(h.w, 2.2, h.d),
      new THREE.MeshStandardMaterial({ color: 0x9c8468, roughness: 0.95 }));
    body.position.set(cx, 1.1, cz);
    body.castShadow = body.receiveShadow = true;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(h.w, h.d) * 0.75, 1.6, 4),
      new THREE.MeshStandardMaterial({ color: 0x7a3b2a, roughness: 0.95 }));
    roof.position.set(cx, 3.0, cz);
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    group.add(body, roof);
  }

  // árboles decorativos (lejos de NPCs, portales, waypoint y punto de aparición)
  const reserved = [[11, 14], [22, 14], [Math.floor(W / 2), 3], [Math.floor(W / 2), H - 6], [Math.floor(W / 2), 8], [13, 22], [12, 4], [23, 22], [26, 9]];
  for (let i = 0; i < 14; i++) {
    const x = ri(2, W - 3), z = ri(2, H - 3);
    if (!grid.cells[z][x]) continue;
    if (Math.abs(grid.ox + x - 0) < 4) continue; // no en el camino
    if (reserved.some(([rx, rz]) => Math.abs(rx - x) < 3 && Math.abs(rz - z) < 3)) continue;
    grid.cells[z][x] = 0;
    const c = grid.center(x, z);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 1.2, 7),
      new THREE.MeshStandardMaterial({ color: 0x5a4028, roughness: 1 }));
    trunk.position.set(c.x, 0.6, c.z);
    const crown = new THREE.Mesh(new THREE.SphereGeometry(0.9 + Math.random() * 0.4, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0x3f6e2f, roughness: 1 }));
    crown.position.set(c.x, 1.9, c.z);
    trunk.castShadow = crown.castShadow = true;
    group.add(trunk, crown);
  }

  // fuente del curandero
  const healerPos = grid.center(11, 14);
  const fountain = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.4, 0.5, 16),
    new THREE.MeshStandardMaterial({ color: 0x8899aa, roughness: 0.6 }));
  fountain.position.set(healerPos.x, 0.25, healerPos.z - 1.6);
  const water = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.1, 16),
    new THREE.MeshStandardMaterial({ color: 0x3da8d8, emissive: 0x1188bb, emissiveIntensity: 0.4 }));
  water.position.set(healerPos.x, 0.52, healerPos.z - 1.6);
  group.add(fountain, water);

  const healer = makeNPC(0xf0ead8);
  healer.position.copy(healerPos);
  group.add(healer);
  interactables.push({ type: 'healer', pos: healerPos.clone(), radius: 2.2, label: '⛪ Curandero', labelCls: 'lbl-npc' });

  const vendorPos = grid.center(22, 14);
  const vendor = makeNPC(0x8a5d2e, 0x553311);
  vendor.position.copy(vendorPos);
  group.add(vendor);
  // puesto del mercader
  const stall = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 1),
    new THREE.MeshStandardMaterial({ color: 0x6e4f2f, roughness: 1 }));
  stall.position.set(vendorPos.x, 0.45, vendorPos.z - 1.2);
  stall.castShadow = true;
  group.add(stall);
  interactables.push({ type: 'vendor', pos: vendorPos.clone(), radius: 2.4, label: '💰 Mercader', labelCls: 'lbl-npc' });

  // portal a la mazmorra (al norte)
  const portalPos = grid.center(Math.floor(W / 2), 3);
  const portal = makePortal(0x9933ff, 'Mazmorra');
  portal.position.copy(portalPos);
  group.add(portal);
  interactables.push({ type: 'portal_dungeon', pos: portalPos.clone(), radius: 1.3, label: '🌀 Entrar a la Mazmorra', labelCls: 'lbl-portal', mesh: portal });

  // antorchas junto al portal
  for (const dx of [-2, 2]) {
    const t = makeTorch();
    t.position.set(portalPos.x + dx, 0, portalPos.z);
    group.add(t);
  }

  // alijo compartido entre personajes
  const stashPos = grid.center(23, 22);
  const stash = new THREE.Group();
  const sBox = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.7, 0.75),
    new THREE.MeshStandardMaterial({ color: 0x5a4a7a, roughness: 0.8 }));
  sBox.position.y = 0.35;
  const sLid = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.22, 0.8),
    new THREE.MeshStandardMaterial({ color: 0xc9a227, metalness: 0.5, roughness: 0.5 }));
  sLid.position.y = 0.78;
  sBox.castShadow = sLid.castShadow = true;
  stash.add(sBox, sLid);
  stash.position.copy(stashPos);
  group.add(stash);
  interactables.push({ type: 'stash', pos: stashPos.clone(), radius: 1.8, label: '🗃️ Alijo compartido', labelCls: 'lbl-chest' });

  // encantadora: reforja afijos por oro
  const enchPos = grid.center(26, 9);
  const enchanter = makeNPC(0x9a4a8a, 0x55224a);
  enchanter.position.copy(enchPos);
  group.add(enchanter);
  interactables.push({ type: 'enchanter', pos: enchPos.clone(), radius: 2.2, label: '🔮 Encantadora', labelCls: 'lbl-npc' });

  // capitán de la guardia: misiones
  const captPos = grid.center(13, 22);
  const captain = makeNPC(0x4a6a9a, 0x2a3a55);
  captain.position.copy(captPos);
  group.add(captain);
  interactables.push({ type: 'questgiver', pos: captPos.clone(), radius: 2.0, label: '🎖️ Capitán de la Guardia', labelCls: 'lbl-npc' });

  // portal del desafío diario (mismo trazado para todos cada día)
  const dailyPos = grid.center(12, 4);
  const dailyPortal = makePortal(0xffcc33, 'Desafío Diario');
  dailyPortal.position.copy(dailyPos);
  group.add(dailyPortal);
  interactables.push({ type: 'portal_daily', pos: dailyPos.clone(), radius: 1.3, label: '🌟 Desafío Diario', labelCls: 'lbl-portal', mesh: dailyPortal });

  // waypoint del pueblo: viaje rápido a los pisos descubiertos
  const wpPos = grid.center(Math.floor(W / 2), 8);
  const wp = makeWaypoint();
  wp.position.copy(wpPos);
  group.add(wp);
  interactables.push({ type: 'waypoint', pos: wpPos.clone(), radius: 1.2, label: '🗺️ Waypoint', labelCls: 'lbl-portal', mesh: wp });

  const spawn = grid.center(Math.floor(W / 2), H - 6);
  return {
    type: 'town', group, grid, spawn, interactables, spawns: [],
    fog: { color: 0x9fb8d0, near: 30, far: 70 },
    ambient: 0x96a8c0, ambientIntensity: 0.9,
    sun: { color: 0xfff2d8, intensity: 2.4 },
    clearColor: 0x9fb8d0,
  };
}

// ---------------------------------------------------------
// MAZMORRA PROCEDURAL
// ---------------------------------------------------------
export function buildDungeon(floor, seed = null) {
  const W = 46, H = 46;
  const grid = new Grid(W, H);
  const group = new THREE.Group();
  const interactables = [];
  const spawns = [];
  const biome = BIOMES.filter(b => floor >= b.minFloor).pop();
  // con semilla, el trazado es idéntico para todos (desafío diario)
  const rnd = seed != null ? mulberry32(seed) : Math.random;
  const ri = (min, max) => Math.floor(min + rnd() * (max - min + 1));

  // generar salas
  const rooms = [];
  const maxRooms = 7 + Math.min(4, Math.floor(floor / 2));
  for (let t = 0; t < 80 && rooms.length < maxRooms; t++) {
    const w = ri(5, 9), d = ri(5, 9);
    const x = ri(2, W - w - 2), z = ri(2, H - d - 2);
    const r = { x, z, w, d, cx: x + Math.floor(w / 2), cz: z + Math.floor(d / 2) };
    if (rooms.some(o => x < o.x + o.w + 1 && x + w + 1 > o.x && z < o.z + o.d + 1 && z + d + 1 > o.z)) continue;
    rooms.push(r);
  }

  const carve = (x, z) => { if (x > 0 && z > 0 && x < W - 1 && z < H - 1) grid.cells[z][x] = 1; };
  for (const r of rooms)
    for (let z = r.z; z < r.z + r.d; z++)
      for (let x = r.x; x < r.x + r.w; x++)
        carve(x, z);

  // pasillos en L entre salas consecutivas (ancho 2)
  for (let i = 1; i < rooms.length; i++) {
    const a = rooms[i - 1], b = rooms[i];
    let x = a.cx, z = a.cz;
    while (x !== b.cx) { carve(x, z); carve(x, z + 1); x += Math.sign(b.cx - x); }
    while (z !== b.cz) { carve(x, z); carve(x + 1, z); z += Math.sign(b.cz - z); }
    carve(x, z);
  }

  // suelo y muros instanciados (algunas losas brillan según el bioma)
  const floorPos = [], wallPos = [], accentPos = [];
  for (let z = 0; z < H; z++)
    for (let x = 0; x < W; x++) {
      if (grid.cells[z][x]) {
        const c = grid.center(x, z);
        if (biome.accent && Math.random() < biome.accent.chance)
          accentPos.push({ x: c.x, y: -0.04, z: c.z });
        else
          floorPos.push({ x: c.x, y: -0.05, z: c.z });
      } else {
        // muro solo si toca suelo (ahorra instancias)
        let near = false;
        for (let dz = -1; dz <= 1 && !near; dz++)
          for (let dx = -1; dx <= 1 && !near; dx++) {
            const nz = z + dz, nx = x + dx;
            if (nz >= 0 && nx >= 0 && nz < H && nx < W && grid.cells[nz][nx]) near = true;
          }
        if (near) {
          const c = grid.center(x, z);
          wallPos.push({ x: c.x, y: 0.6, z: c.z });
        }
      }
    }
  group.add(instancedBoxes(floorPos, [1, 0.1, 1], biome.floor, { vary: 0.05 }));
  // muros bajos para que los enemigos no queden ocultos tras ellos en la vista isométrica
  group.add(instancedBoxes(wallPos, [1, 1.2, 1], biome.wall, { vary: 0.08, castShadow: false }));
  if (accentPos.length)
    group.add(instancedBoxes(accentPos, [1, 0.12, 1], biome.accent.color,
      { emissive: biome.accent.emissive, emissiveIntensity: 0.7, vary: 0.04 }));

  // decoración: pilares y huesos en salas
  for (const r of rooms) {
    if (rnd() < 0.5 && r.w > 6 && r.d > 6) {
      for (const [px, pz] of [[r.x + 1, r.z + 1], [r.x + r.w - 2, r.z + r.d - 2]]) {
        grid.cells[pz][px] = 0;
        const c = grid.center(px, pz);
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 1.5, 8),
          new THREE.MeshStandardMaterial({ color: 0x4a4756, roughness: 0.9 }));
        pillar.position.set(c.x, 0.75, c.z);
        pillar.castShadow = true;
        group.add(pillar);
      }
    }
    if (rnd() < 0.6) {
      const c = grid.center(ri(r.x + 1, r.x + r.w - 2), ri(r.z + 1, r.z + r.d - 2));
      const bones = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 0),
        new THREE.MeshStandardMaterial({ color: 0xbbb5a0, roughness: 1 }));
      bones.position.set(c.x, 0.12, c.z);
      group.add(bones);
    }
    // cristales de hielo / rocas de lava según el bioma
    if (biome.crystal && rnd() < 0.55) {
      const c = grid.center(ri(r.x + 1, r.x + r.w - 2), ri(r.z + 1, r.z + r.d - 2));
      const crystal = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.7 + rnd() * 0.5, 5),
        new THREE.MeshStandardMaterial({ color: biome.crystal.color, emissive: biome.crystal.emissive, emissiveIntensity: 1.1, roughness: 0.4 }));
      crystal.position.set(c.x, 0.35, c.z);
      crystal.rotation.y = rnd() * Math.PI;
      crystal.castShadow = true;
      group.add(crystal);
    }
  }

  // antorchas (pocas luces reales por rendimiento)
  const torchLights = [];
  for (let i = 0; i < rooms.length; i++) {
    const r = rooms[i];
    const c = grid.center(r.cx, r.z + 1);
    const t = makeTorch(biome.torch);
    t.position.set(c.x, 0, c.z - 0.2);
    group.add(t);
    if (i < 4) {
      const light = new THREE.PointLight(biome.torch, 14, 9, 1.6);
      light.position.set(c.x, 1.8, c.z);
      group.add(light);
      torchLights.push(light);
    }
  }

  // portal de entrada (vuelta al pueblo) en la primera sala
  const entry = grid.center(rooms[0].cx, rooms[0].cz);
  const townPortal = makePortal(0x3399ff, 'Pueblo');
  townPortal.position.copy(entry);
  group.add(townPortal);
  interactables.push({ type: 'portal_town', pos: entry.clone(), radius: 1.3, label: '🌀 Volver al Pueblo', labelCls: 'lbl-portal', mesh: townPortal });

  // waypoint cada 5 pisos, cerca de la entrada (lejos del punto de aparición)
  if (floor % 5 === 0) {
    const r0 = rooms[0];
    for (const [wx, wz] of [[r0.cx - 2, r0.cz], [r0.cx + 2, r0.cz], [r0.cx, r0.cz - 2]]) {
      if (wz < 0 || wx < 0 || wz >= H || wx >= W || !grid.cells[wz][wx]) continue;
      const pos = grid.center(wx, wz);
      const wp = makeWaypoint();
      wp.position.copy(pos);
      group.add(wp);
      interactables.push({ type: 'waypoint', floor, pos: pos.clone(), radius: 1.2, label: `🗺️ Waypoint · Piso ${floor}`, labelCls: 'lbl-portal', mesh: wp });
      break;
    }
  }

  // portal de salida (siguiente piso) en la última sala
  const last = rooms[rooms.length - 1];
  const exit = grid.center(last.cx, last.cz);
  const nextPortal = makePortal(0xff3355, `Piso ${floor + 1}`);
  nextPortal.position.copy(exit);
  group.add(nextPortal);
  interactables.push({ type: 'portal_next', pos: exit.clone(), radius: 1.3, label: `🌀 Descender al Piso ${floor + 1}`, labelCls: 'lbl-portal', mesh: nextPortal });

  // celda transitable aleatoria dentro de una sala (evita pilares)
  const freeCell = (r) => {
    for (let t = 0; t < 12; t++) {
      const x = ri(r.x + 1, r.x + r.w - 2), z = ri(r.z + 1, r.z + r.d - 2);
      if (grid.cells[z][x]) return grid.center(x, z);
    }
    return null;
  };

  // santuarios: bendiciones de un solo uso (alguno está maldito...)
  const SHRINES = [
    { kind: 'xp', name: 'Santuario de Experiencia', color: 0xb388ff },
    { kind: 'dmg', name: 'Santuario de Furia', color: 0xff5544 },
    { kind: 'pocion', name: 'Santuario de la Vida', color: 0x55dd66 },
    { kind: 'oro', name: 'Santuario Dorado', color: 0xffd24a },
    { kind: 'maldito', name: 'Santuario Susurrante', color: 0x8855aa },
  ];
  let shrineCount = 0;

  // enemigos: en todas las salas menos la primera
  for (let i = 1; i < rooms.length; i++) {
    const r = rooms[i];
    const isLast = i === rooms.length - 1;
    const n = 2 + Math.floor(floor / 2) + ri(0, 2);
    for (let j = 0; j < n; j++) {
      const pos = freeCell(r);
      if (!pos || pos.distanceTo(exit) < 2.5) continue;
      spawns.push({ kind: 'enemy', pos });
    }
    if (isLast) {
      const bp = freeCell(last) || exit.clone();
      spawns.push({ kind: 'boss', pos: bp });
    }
    // santuarios (máximo 2 por piso)
    if (shrineCount < 2 && rnd() < 0.22) {
      const sPos = freeCell(r);
      if (sPos) {
        shrineCount++;
        const def = SHRINES[ri(0, SHRINES.length - 1)];
        const shrine = new THREE.Group();
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 1.1, 6),
          new THREE.MeshStandardMaterial({ color: 0x4a4756, roughness: 0.9 }));
        pillar.position.y = 0.55;
        pillar.castShadow = true;
        const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0),
          new THREE.MeshStandardMaterial({ color: def.color, emissive: def.color, emissiveIntensity: 1.4 }));
        crystal.position.y = 1.35;
        crystal.userData.baseY = 1.35;
        shrine.add(pillar, crystal);
        shrine.userData.crystal = crystal;
        shrine.position.copy(sPos);
        group.add(shrine);
        interactables.push({ type: 'shrine', shrine: def.kind, pos: sPos.clone(), radius: 1.5, label: `✨ ${def.name}`, labelCls: 'lbl-portal', mesh: shrine, used: false });
      }
    }
    // cofres
    if (rnd() < 0.35) {
      const pos = freeCell(r);
      if (!pos) continue;
      const chest = new THREE.Group();
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.55),
        new THREE.MeshStandardMaterial({ color: 0x7a5a2a, roughness: 0.85 }));
      box.position.y = 0.25;
      const lid = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.18, 0.6),
        new THREE.MeshStandardMaterial({ color: 0xc9a227, metalness: 0.5, roughness: 0.5 }));
      lid.position.y = 0.56;
      box.castShadow = lid.castShadow = true;
      chest.add(box, lid);
      chest.position.copy(pos);
      group.add(chest);
      // algunos cofres son mímicos disfrazados
      interactables.push({ type: 'chest', pos: pos.clone(), radius: 1.2, label: '📦 Cofre', labelCls: 'lbl-chest', mesh: chest, opened: false, mimic: rnd() < 0.18 });
    }
  }

  return {
    type: 'dungeon', floor, biome: biome.name, group, grid,
    spawn: grid.center(rooms[0].cx, rooms[0].cz + 2),
    interactables, spawns, torchLights, rooms,
    fog: { color: biome.fog, near: 14, far: 30 },
    ambient: biome.ambient, ambientIntensity: 0.32,
    sun: { color: 0x8899bb, intensity: 0.5 },
    clearColor: biome.fog,
  };
}

// ---------------------------------------------------------
// REFUGIO DEL ABISMO: segundo pueblo (se desbloquea en el piso 16)
// ---------------------------------------------------------
export function buildRefuge() {
  const W = 26, H = 26;
  const grid = new Grid(W, H);
  const group = new THREE.Group();
  const interactables = [];

  for (let z = 1; z < H - 1; z++)
    for (let x = 1; x < W - 1; x++)
      grid.cells[z][x] = 1;

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(W, H),
    new THREE.MeshStandardMaterial({ color: 0x2e2848, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);

  // muralla
  const wallPos = [];
  for (let z = 0; z < H; z++)
    for (let x = 0; x < W; x++)
      if (x === 0 || z === 0 || x === W - 1 || z === H - 1) {
        const c = grid.center(x, z);
        wallPos.push({ x: c.x, y: 1, z: c.z });
      }
  group.add(instancedBoxes(wallPos, [1, 2, 1], 0x3a3055, { castShadow: true }));

  // cristales del vacío decorativos
  for (let i = 0; i < 10; i++) {
    const x = ri(3, W - 4), z = ri(3, H - 4);
    if (!grid.cells[z][x] || (Math.abs(x - W / 2) < 4 && Math.abs(z - H / 2) < 6)) continue;
    grid.cells[z][x] = 0;
    const c = grid.center(x, z);
    const crystal = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.2 + Math.random(), 5),
      new THREE.MeshStandardMaterial({ color: 0xcc99ff, emissive: 0x7744cc, emissiveIntensity: 0.9, roughness: 0.4 }));
    crystal.position.set(c.x, 0.6, c.z);
    crystal.rotation.y = Math.random() * Math.PI;
    crystal.castShadow = true;
    group.add(crystal);
  }

  // curandera
  const healerPos = grid.center(7, 10);
  const healer = makeNPC(0xd8c8f0);
  healer.position.copy(healerPos);
  group.add(healer);
  interactables.push({ type: 'healer', pos: healerPos.clone(), radius: 2.2, label: '⛪ Sanadora del Vacío', labelCls: 'lbl-npc' });

  // mercader
  const vendorPos = grid.center(18, 10);
  const vendor = makeNPC(0x6a4a8a, 0x3a2a55);
  vendor.position.copy(vendorPos);
  group.add(vendor);
  interactables.push({ type: 'vendor', pos: vendorPos.clone(), radius: 2.4, label: '💰 Mercader Errante', labelCls: 'lbl-npc' });

  // alijo compartido
  const stashPos = grid.center(13, 18);
  const stash = new THREE.Group();
  const sBox = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.7, 0.75),
    new THREE.MeshStandardMaterial({ color: 0x5a4a7a, roughness: 0.8 }));
  sBox.position.y = 0.35;
  const sLid = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.22, 0.8),
    new THREE.MeshStandardMaterial({ color: 0xc9a227, metalness: 0.5, roughness: 0.5 }));
  sLid.position.y = 0.78;
  sBox.castShadow = sLid.castShadow = true;
  stash.add(sBox, sLid);
  stash.position.copy(stashPos);
  group.add(stash);
  interactables.push({ type: 'stash', pos: stashPos.clone(), radius: 1.8, label: '🗃️ Alijo compartido', labelCls: 'lbl-chest' });

  // waypoint
  const wpPos = grid.center(13, 13);
  const wp = makeWaypoint();
  wp.position.copy(wpPos);
  group.add(wp);
  interactables.push({ type: 'waypoint', pos: wpPos.clone(), radius: 1.2, label: '🗺️ Waypoint', labelCls: 'lbl-portal', mesh: wp });

  // portal a las profundidades (piso 16+)
  const portalPos = grid.center(13, 4);
  const portal = makePortal(0xaa66ff, 'Abismo');
  portal.position.copy(portalPos);
  group.add(portal);
  interactables.push({ type: 'portal_dungeon', minFloor: 16, pos: portalPos.clone(), radius: 1.3, label: '🌀 Descender al Abismo (16+)', labelCls: 'lbl-portal', mesh: portal });

  return {
    type: 'refuge', group, grid, spawn: grid.center(13, H - 5), interactables, spawns: [],
    fog: { color: 0x0a0716, near: 22, far: 50 },
    ambient: 0x7766aa, ambientIntensity: 0.55,
    sun: { color: 0xbba8ff, intensity: 1.2 },
    clearColor: 0x0a0716,
  };
}
