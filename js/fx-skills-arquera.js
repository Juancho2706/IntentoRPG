// ============================================================
// VFX/SFX de las habilidades de la clase ARQUERA — dueño: trabajador de la clase (2b.1)
// ============================================================
// js/fx-skills.js FUSIONA estos mapas en SKILL_FX / SKILL_FX_PRESETS (este mapa
// va DESPUÉS del base, así que redefine las entradas viejas de la Arquera).
//  - ARQUERA_FX: { idHabilidad: { trail?, impact?, aura?, extra?, auraY?, color?, sfx? } }
//    cada campo es un preset de partículas (objeto parcial, ver js/particles.js) o el
//    NOMBRE de uno existente (string). `sfx` es un nombre de js/sfx.js.
//  - ARQUERA_FX_PRESETS: presets nuevos con nombre (se citan por string).
// No importa nada: los presets de fx-skills.js se citan por NOMBRE
// ('basicArrow', 'arrowSpark', 'multiShotBurst', 'piercingTrail', 'agility',
// 'agilityMotes', 'arrowRain', 'arrowRainDust', 'critFlash', 'critRing').
// Paleta: madera/verde de la Arquera; cicuta y zarzas en verdes ácidos; humo
// gris frío; el Tiro Celestial en azul cielo (lectura clara de definitiva).

export const ARQUERA_FX_PRESETS = {
  // Disparo Disperso — tres chispas en abanico corto
  arqScatter: {
    name: 'Disparo Disperso', texture: 'spark', blending: 'additive',
    count: 24, burst: true, lifetime: [0.12, 0.3],
    shape: 'cone', shapeRadius: 0.1, coneAngle: 40, speed: [4, 8], gravity: 1, drag: 0.6,
    size: { start: [0.12, 0.26], end: 0.0 },
    color: { start: '#fff6dc', end: '#d8c48a' }, alpha: { start: 0.95, end: 0 },
  },
  // Flecha de Cicuta — vaho verde al soltar y salpicadura venenosa al impactar
  arqHemlockTrail: {
    name: 'Cicuta estela', texture: 'glow', blending: 'additive',
    count: 12, burst: true, lifetime: [0.2, 0.45],
    shape: 'point', shapeRadius: 0.08, speed: [0.4, 1.4], gravity: -0.6, drag: 0.8,
    size: { start: [0.16, 0.3], end: 0.0 },
    color: { start: '#e6ffb0', end: '#4fa832' }, alpha: { start: 0.8, end: 0 },
  },
  arqHemlockSplash: {
    name: 'Cicuta salpicadura', texture: 'smoke', blending: 'normal',
    count: 16, burst: true, lifetime: [0.4, 0.9],
    shape: 'sphere', shapeRadius: 0.25, speed: [0.6, 2.0], gravity: -0.8, drag: 0.7,
    size: { start: [0.3, 0.55], end: 0.9 },
    color: { start: '#b6f070', end: '#3d6e22' }, alpha: { start: 0.55, end: 0 }, spin: 40,
  },
  // Paso Veloz — polvo bajo al rodar
  arqRollDust: {
    name: 'Paso Veloz polvo', texture: 'smoke', blending: 'normal',
    count: 10, burst: true, lifetime: [0.3, 0.6],
    shape: 'disc', shapeRadius: 0.35, speed: [0.5, 1.6], gravity: -0.2, drag: 0.7,
    size: { start: [0.3, 0.55], end: 1.0 },
    color: { start: '#e2d8bc', end: '#9a8e70' }, alpha: { start: 0.45, end: 0 },
  },
  // Red de Caza — hilos que se despliegan al caer
  arqNetBurst: {
    name: 'Red de Caza', texture: 'spark', blending: 'additive',
    count: 36, burst: true, lifetime: [0.3, 0.6],
    shape: 'ring', shapeRadius: 1.2, speed: [1.5, 3.5], gravity: 3, drag: 0.8,
    size: { start: [0.14, 0.3], end: 0.04 },
    color: { start: '#fff2cc', end: '#b89a5a' }, alpha: { start: 0.95, end: 0.1 }, spin: 90,
  },
  arqNetToss: {
    name: 'Red de Caza lanzamiento', texture: 'spark', blending: 'additive',
    count: 10, burst: true, lifetime: [0.12, 0.25],
    shape: 'cone', shapeRadius: 0.1, coneAngle: 50, speed: [3, 6], gravity: 0, drag: 0.6,
    size: { start: [0.12, 0.22], end: 0.0 },
    color: { start: '#fff6dc', end: '#c8a868' }, alpha: { start: 0.9, end: 0 },
  },
  // Bomba de Humo — nube densa + motas grises
  arqSmokeCloud: {
    name: 'Bomba de Humo', texture: 'smoke', blending: 'normal',
    count: 60, burst: true, lifetime: [1.8, 3.6],
    shape: 'disc', shapeRadius: 3.2, speed: [0.3, 1.2], gravity: -0.15, drag: 0.9,
    size: { start: [1.2, 2.2], end: 3.4 },
    color: { start: '#c9ccd2', end: '#6c7078' }, alpha: { start: 0.6, end: 0 }, spin: 20,
  },
  arqSmokePuff: {
    name: 'Bomba de Humo estallido', texture: 'disc', blending: 'normal',
    count: 1, burst: true, lifetime: [0.3, 0.4],
    shape: 'point', shapeRadius: 0.01, speed: [0, 0], gravity: 0, drag: 0,
    size: { start: [0.6, 0.7], end: 5.5 },
    color: { start: '#e4e6ea', end: '#8a8e96' }, alpha: { start: 0.55, end: 0 },
  },
  // Diluvio de Saetas — lluvia ancha y densa (r 5)
  arqDeluge: {
    name: 'Diluvio de Saetas', texture: 'spark', blending: 'additive',
    count: 110, burst: true, lifetime: [0.2, 0.55],
    shape: 'disc', shapeRadius: 4.2, speed: [2, 6], gravity: 12, drag: 0.3,
    size: { start: [0.16, 0.4], end: 0.0 },
    color: { start: '#ffffff', end: '#bfffbf' }, alpha: { start: 0.95, end: 0 },
  },
  arqDelugeFall: {
    name: 'Diluvio de Saetas caída', texture: 'spark', blending: 'additive',
    count: 40, burst: true, lifetime: [0.3, 0.5],
    shape: 'disc', shapeRadius: 4.0, speed: [6, 10], gravity: 18, drag: 0.1,
    size: { start: [0.12, 0.26], end: 0.04 },
    color: { start: '#f2fff2', end: '#9adf9a' }, alpha: { start: 0.9, end: 0.2 },
  },
  // Tiro Celestial — haz azul cielo y destello estelar al impactar
  arqCelestialMuzzle: {
    name: 'Tiro Celestial carga', texture: 'star', blending: 'additive',
    count: 22, burst: true, lifetime: [0.25, 0.5],
    shape: 'sphere', shapeRadius: 0.2, speed: [1, 3], gravity: -1, drag: 0.6,
    size: { start: [0.25, 0.5], end: 0.0 },
    color: { start: '#ffffff', end: '#7fc4ff' }, alpha: { start: 1, end: 0 }, spin: 160,
  },
  arqCelestialImpact: {
    name: 'Tiro Celestial impacto', texture: 'spark', blending: 'additive',
    count: 56, burst: true, lifetime: [0.2, 0.5],
    shape: 'sphere', shapeRadius: 0.2, speed: [5, 11], gravity: 2, drag: 0.5,
    size: { start: [0.2, 0.45], end: 0.0 },
    color: { start: '#ffffff', end: '#8fd0ff' }, alpha: { start: 1, end: 0 },
  },
  // Cerco de Zarzas — espinas que brotan en el anillo y crujido al inmovilizar
  arqBriarRing: {
    name: 'Cerco de Zarzas', texture: 'spark', blending: 'normal',
    count: 90, burst: true, lifetime: [0.8, 1.6],
    shape: 'ring', shapeRadius: 6.8, speed: [0.4, 1.6], gravity: -1.2, drag: 0.8,
    size: { start: [0.25, 0.5], end: 0.1 },
    color: { start: '#a8d870', end: '#3e5e22' }, alpha: { start: 0.95, end: 0 }, spin: 30,
  },
  arqBriarSnag: {
    name: 'Zarzas enganche', texture: 'spark', blending: 'normal',
    count: 18, burst: true, lifetime: [0.3, 0.6],
    shape: 'sphere', shapeRadius: 0.3, speed: [1.5, 3.5], gravity: 4, drag: 0.6,
    size: { start: [0.16, 0.32], end: 0.04 },
    color: { start: '#c8f090', end: '#4a6e2a' }, alpha: { start: 1, end: 0.1 },
  },
};

export const ARQUERA_FX = {
  // básicos
  a_disperso:        { aura: 'arqScatter', impact: 'arrowSpark', color: 0xe8d8a0, sfx: 'shoot' },
  a_cicuta:          { trail: 'arqHemlockTrail', impact: 'arqHemlockSplash', color: 0x8fe05a, sfx: 'shoot' },
  // gastadoras
  flecha_perforante: { trail: 'piercingTrail', impact: 'arrowSpark', color: 0xffffcc, sfx: 'shoot' },
  flecha_multiple:   { aura: 'multiShotBurst', impact: 'arrowSpark', color: 0xccddaa, sfx: 'shoot' },
  lluvia_flechas:    { aura: 'arrowRain', extra: 'arrowRainDust', color: 0xaaffaa, sfx: 'shoot' },
  // movilidad
  a_paso:            { trail: 'arqRollDust', impact: 'arqRollDust', color: 0xe2d8bc, sfx: 'dash' },
  agilidad:          { aura: 'agility', extra: 'agilityMotes', color: 0x9af06a, sfx: 'dash' },
  // defensa / utilidad
  a_red:             { trail: 'arqNetToss', impact: 'arqNetBurst', color: 0xd8c49a, sfx: 'shoot' },
  a_humo:            { aura: 'arqSmokeCloud', extra: 'arqSmokePuff', color: 0x9aa0a8, sfx: 'dash' },
  // definitivas
  a_u_diluvio:       { trail: 'arqDelugeFall', aura: 'arqDeluge', extra: 'arrowRainDust', color: 0xbfffbf, sfx: 'shoot' },
  a_u_celeste:       { aura: 'arqCelestialMuzzle', impact: 'arqCelestialImpact', extra: 'critRing', color: 0x9fd8ff, sfx: 'crit' },
  a_u_zarzas:        { aura: 'arqBriarRing', impact: 'arqBriarSnag', color: 0x5a8a3a, sfx: 'trap' },
};
