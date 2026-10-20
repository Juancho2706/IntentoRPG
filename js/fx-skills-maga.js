// ============================================================
// VFX/SFX de las habilidades de la clase MAGA — dueño: trabajador de la clase (2b.1)
// ============================================================
// js/fx-skills.js FUSIONA estos mapas en SKILL_FX / SKILL_FX_PRESETS.
//  - MAGA_FX: { idHabilidad: { trail?, impact?, aura?, extra?, auraY?, color?, sfx? } }
//    cada campo es un preset de partículas (objeto parcial, ver js/particles.js) o el
//    NOMBRE de uno existente (string). `sfx` es un nombre de js/sfx.js.
//  - MAGA_FX_PRESETS: presets nuevos con nombre (se citan por string).
// Presets de fx-skills.js citados por NOMBRE (no se importan: habría ciclo):
//   fireballTrail/Blast/Wave/Smoke, frostNova/Shards/Mist, boltTrail/Spark/Flash,
//   frostArmor/frostArmorRing, meteorFall/Impact/Wave/Embers/Smoke.
// Paleta por elemento (fx-skills.js): fuego naranja/rojo · escarcha cian/blanco ·
// arcano violeta. Sonidos elementales de §4.4: fire / ice / bolt.
// Paso 2c.1: entradas de las 16 activas de TALENTO (m_t_*, p_*, k_*, a_*) y sus presets;
// los comportamientos (js/powers-maga.js) leen aura/impact/extra de su ctx.fx.
// Este archivo no importa nada.

export const MAGA_FX_PRESETS = {
  // ---- Ascua (básico de fuego): brasa pequeña + chisporroteo al estallar ----
  emberTrail: {
    name: 'Ascua estela', texture: 'glow', blending: 'additive',
    count: 10, burst: true, lifetime: [0.15, 0.3],
    shape: 'sphere', shapeRadius: 0.1, speed: [0.3, 1.2], gravity: -0.6, drag: 0.6,
    size: { start: [0.16, 0.3], end: 0.0 },
    color: { start: '#ffe6a8', end: '#e0400c' }, alpha: { start: 0.9, end: 0 },
  },
  emberBurst: {
    name: 'Ascua estallido', texture: 'spark', blending: 'additive',
    count: 26, burst: true, lifetime: [0.18, 0.42],
    shape: 'sphere', shapeRadius: 0.16, speed: [2.5, 6], gravity: 3, drag: 0.6,
    size: { start: [0.12, 0.28], end: 0.0 },
    color: { start: '#fff0c0', end: '#ff5a14' }, alpha: { start: 1, end: 0 },
  },
  emberRing: {
    name: 'Ascua onda', texture: 'disc', blending: 'additive',
    count: 1, burst: true, lifetime: [0.2, 0.26],
    shape: 'point', shapeRadius: 0.01, speed: [0, 0], gravity: 0, drag: 0,
    size: { start: [0.3, 0.4], end: 2.6 },
    color: { start: '#ffd98a', end: '#c8300a' }, alpha: { start: 0.75, end: 0 },
  },

  // ---- Toque Gélido (básico de escarcha): vaho en cono + escarcha flotante ----
  frostBreath: {
    name: 'Toque Gélido vaho', texture: 'smoke', blending: 'additive',
    count: 26, burst: true, lifetime: [0.3, 0.6],
    shape: 'cone', shapeRadius: 0.12, coneAngle: 70, speed: [4, 8], gravity: -0.2, drag: 1.2,
    size: { start: [0.3, 0.55], end: 1.3 },
    color: { start: '#eaf7ff', end: '#5cb6ff' }, alpha: { start: 0.55, end: 0 },
  },
  frostBreathMotes: {
    name: 'Toque Gélido escarcha', texture: 'star', blending: 'additive',
    count: 14, burst: true, lifetime: [0.35, 0.7],
    shape: 'disc', shapeRadius: 0.9, speed: [0.4, 1.4], gravity: -0.8, drag: 0.6,
    size: { start: [0.12, 0.24], end: 0.0 },
    color: { start: '#ffffff', end: '#9fe3ff' }, alpha: { start: 0.9, end: 0 }, spin: 160,
  },

  // ---- Paso de Escarcha: polvo de hielo a ras de suelo + destello al llegar ----
  frostStepTrail: {
    name: 'Paso de Escarcha estela', texture: 'spark', blending: 'additive',
    count: 12, burst: true, lifetime: [0.3, 0.7],
    shape: 'disc', shapeRadius: 0.5, speed: [0.4, 1.6], gravity: -0.4, drag: 0.8,
    size: { start: [0.14, 0.3], end: 0.0 },
    color: { start: '#ffffff', end: '#7accff' }, alpha: { start: 0.9, end: 0 }, spin: 200,
  },
  frostStepBurst: {
    name: 'Paso de Escarcha llegada', texture: 'star', blending: 'additive',
    count: 22, burst: true, lifetime: [0.3, 0.6],
    shape: 'ring', shapeRadius: 0.5, speed: [1.5, 3.5], gravity: -1, drag: 0.6,
    size: { start: [0.18, 0.36], end: 0.0 },
    color: { start: '#eaf7ff', end: '#5cb6ff' }, alpha: { start: 0.95, end: 0 }, spin: 140,
  },

  // ---- Estela Ígnea: llamas que brotan del rastro + fogonazo al llegar ----
  fireStepTrail: {
    name: 'Estela Ígnea llamas', texture: 'glow', blending: 'additive',
    count: 14, burst: true, lifetime: [0.3, 0.65],
    shape: 'disc', shapeRadius: 0.5, speed: [0.6, 2.2], gravity: -2.4, drag: 0.6,
    size: { start: [0.25, 0.5], end: 0.0 },
    color: { start: '#fff2b0', end: '#d83a0a' }, alpha: { start: 0.9, end: 0 },
  },
  fireStepBurst: {
    name: 'Estela Ígnea llegada', texture: 'spark', blending: 'additive',
    count: 24, burst: true, lifetime: [0.25, 0.55],
    shape: 'ring', shapeRadius: 0.4, speed: [2, 5], gravity: 2, drag: 0.5,
    size: { start: [0.14, 0.3], end: 0.0 },
    color: { start: '#ffe6a8', end: '#ff4a10' }, alpha: { start: 1, end: 0 },
  },

  // ---- Onda Repulsora: anillo arcano que se expande + runas que salen despedidas ----
  repulseWave: {
    name: 'Onda Repulsora anillo', texture: 'disc', blending: 'additive',
    count: 1, burst: true, lifetime: [0.3, 0.36],
    shape: 'point', shapeRadius: 0.01, speed: [0, 0], gravity: 0, drag: 0,
    size: { start: [0.6, 0.7], end: 7.0 },
    color: { start: '#f0e0ff', end: '#7a3cd6' }, alpha: { start: 0.85, end: 0 },
  },
  repulseRunes: {
    name: 'Onda Repulsora runas', texture: 'star', blending: 'additive',
    count: 40, burst: true, lifetime: [0.3, 0.6],
    shape: 'ring', shapeRadius: 0.8, speed: [7, 12], gravity: 0, drag: 1.4,
    size: { start: [0.18, 0.38], end: 0.0 },
    color: { start: '#ffffff', end: '#b98cff' }, alpha: { start: 1, end: 0 }, spin: 220,
  },

  // ---- Supernova: núcleo estelar que colapsa + llamarada dorada + brasas ----
  supernovaFall: {
    name: 'Supernova caída', texture: 'star', blending: 'additive',
    count: 30, burst: true, lifetime: [0.3, 0.55],
    shape: 'sphere', shapeRadius: 0.4, speed: [0.5, 2], gravity: 6, drag: 0.3,
    size: { start: [0.4, 0.8], end: 0.0 },
    color: { start: '#ffffff', end: '#ffcc44' }, alpha: { start: 1, end: 0 }, spin: 90,
  },
  supernovaCore: {
    name: 'Supernova núcleo', texture: 'glow', blending: 'additive',
    count: 1, burst: true, lifetime: [0.22, 0.3],
    shape: 'point', shapeRadius: 0.01, speed: [0, 0], gravity: 0, drag: 0,
    size: { start: [3.2, 3.6], end: 0.0 },
    color: { start: '#ffffff', end: '#ffd27a' }, alpha: { start: 1, end: 0 },
  },
  supernovaFlare: {
    name: 'Supernova llamarada', texture: 'glow', blending: 'additive',
    count: 120, burst: true, lifetime: [0.35, 0.9],
    shape: 'disc', shapeRadius: 1.0, speed: [6, 13], gravity: -1, drag: 0.5,
    size: { start: [0.5, 1.1], end: 0.0 },
    color: { start: '#fffbe0', end: '#e0621a' }, alpha: { start: 1, end: 0 },
  },

  // ---- Tormenta Glacial: remolino de nieve que acompaña a la Maga ----
  glacialStorm: {
    name: 'Tormenta Glacial nieve', texture: 'star', blending: 'additive',
    count: 30, burst: true, lifetime: [0.5, 1.0],
    shape: 'ring', shapeRadius: 3.2, speed: [1.5, 4], gravity: 1.2, drag: 0.4,
    size: { start: [0.14, 0.3], end: 0.0 },
    color: { start: '#ffffff', end: '#9fd8ff' }, alpha: { start: 0.9, end: 0 }, spin: 260,
  },
  glacialStormMist: {
    name: 'Tormenta Glacial bruma', texture: 'smoke', blending: 'additive',
    count: 10, burst: true, lifetime: [0.6, 1.1],
    shape: 'disc', shapeRadius: 3.5, speed: [0.6, 1.8], gravity: -0.2, drag: 0.6,
    size: { start: [0.8, 1.4], end: 2.6 },
    color: { start: '#dff3ff', end: '#3a7ab8' }, alpha: { start: 0.3, end: 0 },
  },

  // ---- Desgarro Arcano: carga en la mano + desgarro violeta en el objetivo ----
  riftCharge: {
    name: 'Desgarro Arcano carga', texture: 'star', blending: 'additive',
    count: 30, burst: true, lifetime: [0.3, 0.6],
    shape: 'sphere', shapeRadius: 0.6, speed: [-3, -1], gravity: 0, drag: 0.2,
    size: { start: [0.2, 0.4], end: 0.0 },
    color: { start: '#ffffff', end: '#a050ff' }, alpha: { start: 1, end: 0 }, spin: 180,
  },
  riftImpact: {
    name: 'Desgarro Arcano impacto', texture: 'spark', blending: 'additive',
    count: 34, burst: true, lifetime: [0.15, 0.4],
    shape: 'sphere', shapeRadius: 0.25, speed: [4, 9], gravity: 0, drag: 0.8,
    size: { start: [0.2, 0.45], end: 0.0 },
    color: { start: '#ffffff', end: '#c070ff' }, alpha: { start: 1, end: 0 },
  },

  // ============ Paso 2c.1: activas de TALENTO ============
  // ---- Barrera de Maná: burbuja violeta que se cierra sobre la Maga ----
  manaBubble: {
    name: 'Barrera de Maná', texture: 'disc', blending: 'additive',
    count: 1, burst: true, lifetime: [0.45, 0.5],
    shape: 'point', shapeRadius: 0.01, speed: [0, 0], gravity: 0, drag: 0,
    size: { start: [2.6, 2.8], end: 1.6 },
    color: { start: '#f2e6ff', end: '#8a5cf0' }, alpha: { start: 0.55, end: 0 },
  },
  manaBubbleMotes: {
    name: 'Barrera de Maná chispas', texture: 'star', blending: 'additive',
    count: 22, burst: true, lifetime: [0.4, 0.8],
    shape: 'sphere', shapeRadius: 1.1, speed: [-1.2, -0.3], gravity: 0, drag: 0.4,
    size: { start: [0.14, 0.3], end: 0.0 },
    color: { start: '#ffffff', end: '#b98cff' }, alpha: { start: 0.9, end: 0 }, spin: 160,
  },
  // ---- Parpadeo / Inversión del Tiempo: destello arcano ----
  blinkFlash: {
    name: 'Parpadeo destello', texture: 'glow', blending: 'additive',
    count: 1, burst: true, lifetime: [0.18, 0.22],
    shape: 'point', shapeRadius: 0.01, speed: [0, 0], gravity: 0, drag: 0,
    size: { start: [1.8, 2.0], end: 0.0 },
    color: { start: '#ffffff', end: '#99aaff' }, alpha: { start: 1, end: 0 },
  },
  rewindSpiral: {
    name: 'Inversión espiral', texture: 'star', blending: 'additive',
    count: 34, burst: true, lifetime: [0.4, 0.8],
    shape: 'ring', shapeRadius: 1.2, speed: [-2.5, -0.8], gravity: -0.6, drag: 0.3,
    size: { start: [0.14, 0.32], end: 0.0 },
    color: { start: '#ffffff', end: '#d7c2ff' }, alpha: { start: 1, end: 0 }, spin: -300,
  },
  // ---- Contrahechizo: runa que estalla sobre el lanzador ----
  counterRune: {
    name: 'Contrahechizo runa', texture: 'star', blending: 'additive',
    count: 18, burst: true, lifetime: [0.3, 0.55],
    shape: 'ring', shapeRadius: 0.5, speed: [1.5, 3.5], gravity: 0, drag: 1.0,
    size: { start: [0.2, 0.4], end: 0.0 },
    color: { start: '#ffffff', end: '#cc88ff' }, alpha: { start: 1, end: 0 }, spin: 260,
  },
  // ---- Bloque de Hielo ----
  iceBlock: {
    name: 'Bloque de Hielo', texture: 'glow', blending: 'additive',
    count: 1, burst: true, lifetime: [0.6, 0.7],
    shape: 'point', shapeRadius: 0.01, speed: [0, 0], gravity: 0, drag: 0,
    size: { start: [2.2, 2.4], end: 2.0 },
    color: { start: '#eaf7ff', end: '#7accff' }, alpha: { start: 0.7, end: 0 },
  },
  // ---- Llamarada: cono de fuego + estallido de las quemaduras ----
  flameCone: {
    name: 'Llamarada cono', texture: 'glow', blending: 'additive',
    count: 60, burst: true, lifetime: [0.25, 0.55],
    shape: 'cone', shapeRadius: 0.2, coneAngle: 70, speed: [8, 15], gravity: -1, drag: 1.0,
    size: { start: [0.4, 0.9], end: 0.0 },
    color: { start: '#fff2b0', end: '#e0400c' }, alpha: { start: 1, end: 0 },
  },
  flameConeEmbers: {
    name: 'Llamarada brasas', texture: 'spark', blending: 'additive',
    count: 28, burst: true, lifetime: [0.3, 0.6],
    shape: 'disc', shapeRadius: 1.4, speed: [1.5, 4], gravity: 2, drag: 0.6,
    size: { start: [0.12, 0.26], end: 0.0 },
    color: { start: '#ffe6a8', end: '#ff4a10' }, alpha: { start: 1, end: 0 },
  },
  // ---- Combustión: llamas que envuelven el cuerpo ----
  combustionAura: {
    name: 'Combustión aura', texture: 'glow', blending: 'additive',
    count: 50, burst: true, lifetime: [0.4, 0.9],
    shape: 'ring', shapeRadius: 0.7, speed: [0.6, 2.2], gravity: -4, drag: 0.5,
    size: { start: [0.35, 0.7], end: 0.0 },
    color: { start: '#fff6c0', end: '#ff6a10' }, alpha: { start: 1, end: 0 },
  },
  // ---- Muro de Fuego: lenguas de fuego a lo largo del muro ----
  fireWallFlames: {
    name: 'Muro de Fuego llamas', texture: 'glow', blending: 'additive',
    count: 8, burst: true, lifetime: [0.35, 0.7],
    shape: 'disc', shapeRadius: 0.9, speed: [0.8, 2.4], gravity: -3.2, drag: 0.5,
    size: { start: [0.3, 0.6], end: 0.0 },
    color: { start: '#fff2b0', end: '#d8300a' }, alpha: { start: 0.95, end: 0 },
  },
  // ---- Prisión de Hielo: cúpula que se cierra + esquirlas ----
  iceDome: {
    name: 'Prisión de Hielo cúpula', texture: 'disc', blending: 'additive',
    count: 1, burst: true, lifetime: [0.4, 0.45],
    shape: 'point', shapeRadius: 0.01, speed: [0, 0], gravity: 0, drag: 0,
    size: { start: [7.5, 8.0], end: 3.0 },
    color: { start: '#ffffff', end: '#5cb6ff' }, alpha: { start: 0.7, end: 0 },
  },
  iceDomeShards: {
    name: 'Prisión de Hielo esquirlas', texture: 'star', blending: 'additive',
    count: 40, burst: true, lifetime: [0.4, 0.8],
    shape: 'ring', shapeRadius: 3.6, speed: [-3, -1], gravity: -1, drag: 0.4,
    size: { start: [0.2, 0.42], end: 0.0 },
    color: { start: '#ffffff', end: '#88ddff' }, alpha: { start: 1, end: 0 }, spin: 200,
  },
  // ---- Lanza de Hielo ----
  iceLanceTrail: {
    name: 'Lanza de Hielo estela', texture: 'spark', blending: 'additive',
    count: 10, burst: true, lifetime: [0.15, 0.35],
    shape: 'sphere', shapeRadius: 0.12, speed: [0.3, 1.2], gravity: 0, drag: 0.8,
    size: { start: [0.14, 0.3], end: 0.0 },
    color: { start: '#ffffff', end: '#aeeaff' }, alpha: { start: 0.9, end: 0 },
  },
  iceLanceShatter: {
    name: 'Lanza de Hielo astillado', texture: 'star', blending: 'additive',
    count: 46, burst: true, lifetime: [0.3, 0.7],
    shape: 'sphere', shapeRadius: 0.3, speed: [5, 11], gravity: 4, drag: 0.6,
    size: { start: [0.2, 0.45], end: 0.0 },
    color: { start: '#ffffff', end: '#7accff' }, alpha: { start: 1, end: 0 }, spin: 300,
  },
  // ---- Ventisca / Aliento Boreal ----
  blizzard: {
    name: 'Ventisca nieve', texture: 'star', blending: 'additive',
    count: 26, burst: true, lifetime: [0.6, 1.1],
    shape: 'disc', shapeRadius: 4.5, speed: [1.5, 3.5], gravity: 3, drag: 0.4,
    size: { start: [0.14, 0.3], end: 0.0 },
    color: { start: '#ffffff', end: '#cfefff' }, alpha: { start: 0.9, end: 0 }, spin: 280,
  },
  borealBreath: {
    name: 'Aliento Boreal', texture: 'smoke', blending: 'additive',
    count: 34, burst: true, lifetime: [0.35, 0.7],
    shape: 'cone', shapeRadius: 0.15, coneAngle: 70, speed: [6, 11], gravity: -0.2, drag: 1.1,
    size: { start: [0.4, 0.7], end: 1.6 },
    color: { start: '#f2fbff', end: '#5cb6ff' }, alpha: { start: 0.6, end: 0 },
  },
  // ---- Orbe Arcano / Sello / Evocación ----
  arcaneOrbCast: {
    name: 'Orbe Arcano lanzamiento', texture: 'glow', blending: 'additive',
    count: 1, burst: true, lifetime: [0.25, 0.3],
    shape: 'point', shapeRadius: 0.01, speed: [0, 0], gravity: 0, drag: 0,
    size: { start: [1.2, 1.4], end: 0.0 },
    color: { start: '#ffffff', end: '#b388ff' }, alpha: { start: 1, end: 0 },
  },
  sealRune: {
    name: 'Sello del Archimago runa', texture: 'disc', blending: 'additive',
    count: 1, burst: true, lifetime: [0.6, 0.7],
    shape: 'point', shapeRadius: 0.01, speed: [0, 0], gravity: 0, drag: 0,
    size: { start: [1.6, 1.8], end: 1.0 },
    color: { start: '#fff0ff', end: '#e0b0ff' }, alpha: { start: 0.8, end: 0 },
  },
  sealBlast: {
    name: 'Sello del Archimago estallido', texture: 'star', blending: 'additive',
    count: 60, burst: true, lifetime: [0.3, 0.7],
    shape: 'sphere', shapeRadius: 0.4, speed: [6, 12], gravity: 0, drag: 0.8,
    size: { start: [0.25, 0.55], end: 0.0 },
    color: { start: '#ffffff', end: '#c070ff' }, alpha: { start: 1, end: 0 }, spin: 200,
  },
  evocationSpiral: {
    name: 'Evocación espiral', texture: 'star', blending: 'additive',
    count: 16, burst: true, lifetime: [0.4, 0.7],
    shape: 'ring', shapeRadius: 1.6, speed: [-3, -1.5], gravity: -1.5, drag: 0.2,
    size: { start: [0.14, 0.3], end: 0.0 },
    color: { start: '#ffffff', end: '#9f8cff' }, alpha: { start: 0.95, end: 0 }, spin: 340,
  },
};

export const MAGA_FX = {
  // básicos (el Dardo lo dibuja Player.basicAttack: 'basicBolt'; se deja su entrada
  // para cuando el núcleo lea SKILL_FX también en el básico de arma)
  m_dardo:         { impact: 'riftImpact', color: 0xcc66ff, sfx: 'bolt' },
  m_ascua:         { trail: 'emberTrail', impact: 'emberBurst', aura: 'emberRing', color: 0xff8a33, sfx: 'fire' },
  m_toque:         { impact: 'frostBreathMotes', aura: 'frostBreath', color: 0x9fe3ff, sfx: 'ice' },
  // gastadoras
  bola_fuego:      { trail: 'fireballTrail', impact: 'fireballBlast', aura: 'fireballWave', extra: 'fireballSmoke', color: 0xff6622, sfx: 'fire' },
  rayo:            { aura: 'boltFlash', impact: 'boltSpark', color: 0xffee66, sfx: 'bolt' },
  nova_hielo:      { aura: 'frostNova', extra: 'frostShards', impact: 'frostMist', auraY: 0.4, color: 0x66ccff, sfx: 'ice' },
  meteoro:         { trail: 'meteorFall', impact: 'meteorImpact', aura: 'meteorWave', extra: 'meteorEmbers', color: 0xff4400, sfx: 'fire' },
  // movilidad
  m_paso_escarcha: { trail: 'frostStepTrail', impact: 'frostStepBurst', color: 0x9fe3ff, sfx: 'dash' },
  m_estela_ignea:  { trail: 'fireStepTrail', impact: 'fireStepBurst', color: 0xff7733, sfx: 'dash' },
  // defensa / utilidad
  m_armadura:      { aura: 'frostArmor', extra: 'frostArmorRing', color: 0x88ccff, sfx: 'ice' },
  m_onda:          { aura: 'repulseWave', extra: 'repulseRunes', color: 0xb98cff, sfx: 'portal' },
  // definitivas
  m_u_supernova:   { trail: 'supernovaFall', impact: 'supernovaCore', aura: 'supernovaFlare', extra: 'meteorEmbers', color: 0xffcc44, sfx: 'fire' },
  m_u_tormenta:    { aura: 'glacialStorm', extra: 'glacialStormMist', color: 0xbfe9ff, sfx: 'ice' },
  m_u_desgarro:    { aura: 'riftCharge', impact: 'riftImpact', color: 0xd28cff, sfx: 'bolt', tickSfx: 'bolt' },
  // activas de TALENTO (Paso 2c.1) — clase
  m_t_barrera:       { aura: 'manaBubble', extra: 'manaBubbleMotes', color: 0xb98cff, sfx: 'portal' },
  m_t_parpadeo:      { impact: 'blinkFlash', color: 0x99aaff, sfx: 'portal' },
  m_t_contrahechizo: { impact: 'counterRune', color: 0xcc88ff, sfx: 'bolt' },
  m_t_inversion:     { aura: 'rewindSpiral', impact: 'blinkFlash', color: 0xd7c2ff, sfx: 'portal' },
  m_t_bloque:        { aura: 'iceBlock', color: 0x9fe3ff, sfx: 'ice' },
  // Piromante
  p_llamarada:       { aura: 'flameCone', impact: 'flameConeEmbers', color: 0xff7a22, sfx: 'fire' },
  p_combustion:      { aura: 'combustionAura', extra: 'fireStepBurst', color: 0xffaa33, sfx: 'fire' },
  p_muro_fuego:      { aura: 'fireStepBurst', extra: 'fireWallFlames', color: 0xff5511, sfx: 'fire' },
  // Crionte
  k_prision:         { aura: 'iceDome', extra: 'iceDomeShards', color: 0x88ddff, sfx: 'ice' },
  k_lanza:           { trail: 'iceLanceTrail', impact: 'frostShards', extra: 'iceLanceShatter', color: 0xaeeaff, sfx: 'ice' },
  k_ventisca:        { aura: 'blizzard', extra: 'glacialStormMist', color: 0xcfefff, sfx: 'ice' },
  k_aliento:         { aura: 'borealBreath', impact: 'frostBreathMotes', color: 0xbfeaff, sfx: 'ice' },
  // Arcanista
  a_orbe:            { aura: 'arcaneOrbCast', impact: 'riftImpact', color: 0xb388ff, sfx: 'bolt' },
  a_misiles:         { aura: 'riftCharge', impact: 'riftImpact', color: 0xd28cff, sfx: 'bolt', tickSfx: 'bolt' },
  a_sello:           { aura: 'sealRune', impact: 'sealBlast', color: 0xe0b0ff, sfx: 'bolt' },
  a_evocacion:       { aura: 'evocationSpiral', extra: 'manaBubbleMotes', color: 0x9f8cff, sfx: 'portal' },
};
