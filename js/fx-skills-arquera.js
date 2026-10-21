// ============================================================
// VFX/SFX de las habilidades de la clase ARQUERA — dueño: KA-arquera (catálogo 2g)
// ============================================================
// js/fx-skills.js FUSIONA estos mapas en SKILL_FX / SKILL_FX_PRESETS (este mapa
// va DESPUÉS del base, así que redefine las entradas viejas de la Arquera).
//  - ARQUERA_FX: { idHabilidad: { trail?, impact?, aura?, extra?, auraY?, color?, sfx?, vars? } }
//    (vars = { i?, ii? }: lo que cambia cada variante de la forja, con las mismas claves)
//    cada campo es un preset de partículas (objeto parcial, ver js/particles.js) o el
//    NOMBRE de uno existente (string). `sfx` es un nombre de js/sfx.js.
//  - ARQUERA_FX_PRESETS: presets nuevos con nombre (se citan por string).
// No importa nada: los presets de fx-skills.js se citan por NOMBRE
// ('basicArrow', 'arrowSpark', 'multiShotBurst', 'piercingTrail', 'agility',
// 'agilityMotes', 'arrowRain', 'arrowRainDust', 'critFlash', 'critRing').
// Los de los verbos (verbWindow, verbPerfect, verbRecast, verbStance, verbDetonate) los
// emite el canal de lanzamiento en el borde: el tensado, el relanzar y la postura no los repiten.
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

  // ---- Activas de talento (Paso 2c.1) ----
  // Flecha Silenciadora — estela violeta y sello sobre la cabeza del silenciado
  arqSilenceTrail: {
    name: 'Flecha Silenciadora estela', texture: 'glow', blending: 'additive',
    count: 10, burst: true, lifetime: [0.2, 0.4],
    shape: 'point', shapeRadius: 0.06, speed: [0.3, 1.0], gravity: 0, drag: 0.8,
    size: { start: [0.14, 0.26], end: 0.0 },
    color: { start: '#e6d4ff', end: '#7a4fd0' }, alpha: { start: 0.85, end: 0 },
  },
  arqSilenceMark: {
    name: 'Silenciado', texture: 'star', blending: 'additive',
    count: 14, burst: true, lifetime: [0.4, 0.8],
    shape: 'ring', shapeRadius: 0.35, speed: [0.2, 0.8], gravity: -0.5, drag: 0.6,
    size: { start: [0.16, 0.3], end: 0.0 },
    color: { start: '#ffffff', end: '#b98cff' }, alpha: { start: 1, end: 0 }, spin: 120,
  },
  // Disparo Conmocionante — golpe romo
  arqStunPop: {
    name: 'Conmoción', texture: 'disc', blending: 'additive',
    count: 1, burst: true, lifetime: [0.2, 0.3],
    shape: 'point', shapeRadius: 0.01, speed: [0, 0], gravity: 0, drag: 0,
    size: { start: [0.3, 0.4], end: 1.6 },
    color: { start: '#fff2cc', end: '#c8b48a' }, alpha: { start: 0.7, end: 0 },
  },
  // Flecha Bengala — estallido dorado en lo alto
  arqFlareBurst: {
    name: 'Flecha Bengala', texture: 'star', blending: 'additive',
    count: 48, burst: true, lifetime: [0.6, 1.4],
    shape: 'sphere', shapeRadius: 0.3, speed: [2, 5], gravity: 1.5, drag: 0.5,
    size: { start: [0.2, 0.45], end: 0.0 },
    color: { start: '#ffffff', end: '#ffcc55' }, alpha: { start: 1, end: 0 }, spin: 90,
  },
  // Camuflaje — hojas que envuelven y se dispersan
  arqCamoLeaves: {
    name: 'Camuflaje', texture: 'spark', blending: 'normal',
    count: 30, burst: true, lifetime: [0.5, 1.0],
    shape: 'sphere', shapeRadius: 0.6, speed: [0.6, 2.0], gravity: -0.4, drag: 0.7,
    size: { start: [0.18, 0.34], end: 0.06 },
    color: { start: '#cfe8b0', end: '#4f7a3a' }, alpha: { start: 0.9, end: 0 }, spin: 60,
  },
  // Disparo Apuntado — saeta de luz y destello al atravesar
  arqAimedTrail: {
    name: 'Disparo Apuntado estela', texture: 'glow', blending: 'additive',
    count: 14, burst: true, lifetime: [0.2, 0.4],
    shape: 'point', shapeRadius: 0.08, speed: [0.2, 0.8], gravity: 0, drag: 0.9,
    size: { start: [0.2, 0.34], end: 0.0 },
    color: { start: '#ffffff', end: '#fff1a8' }, alpha: { start: 0.95, end: 0 },
  },
  arqAimedImpact: {
    name: 'Disparo Apuntado impacto', texture: 'spark', blending: 'additive',
    count: 40, burst: true, lifetime: [0.2, 0.45],
    shape: 'sphere', shapeRadius: 0.15, speed: [4, 9], gravity: 2, drag: 0.5,
    size: { start: [0.18, 0.4], end: 0.0 },
    color: { start: '#ffffff', end: '#ffe680' }, alpha: { start: 1, end: 0 },
  },
  // Visión Certera — ojo dorado
  arqVisionEye: {
    name: 'Visión Certera', texture: 'star', blending: 'additive',
    count: 26, burst: true, lifetime: [0.5, 0.9],
    shape: 'ring', shapeRadius: 0.5, speed: [0.3, 1.2], gravity: -0.8, drag: 0.6,
    size: { start: [0.2, 0.4], end: 0.0 },
    color: { start: '#ffffff', end: '#ffd966' }, alpha: { start: 1, end: 0 }, spin: 140,
  },
  // Disparo Disuasorio — estampido a quemarropa
  arqBlastPop: {
    name: 'Disparo Disuasorio', texture: 'spark', blending: 'additive',
    count: 34, burst: true, lifetime: [0.15, 0.35],
    shape: 'cone', shapeRadius: 0.15, coneAngle: 60, speed: [5, 10], gravity: 1, drag: 0.6,
    size: { start: [0.18, 0.36], end: 0.0 },
    color: { start: '#ffffff', end: '#e8d27a' }, alpha: { start: 1, end: 0 },
  },
  // Trampa de Cepo — dientes metálicos al cerrarse
  arqTrapSnap: {
    name: 'Trampa de Cepo', texture: 'spark', blending: 'additive',
    count: 24, burst: true, lifetime: [0.2, 0.45],
    shape: 'ring', shapeRadius: 0.7, speed: [1, 3], gravity: 3, drag: 0.6,
    size: { start: [0.14, 0.28], end: 0.04 },
    color: { start: '#f2f2f2', end: '#86d47a' }, alpha: { start: 1, end: 0.1 },
  },
  // Mina de Espinas / Señuelo: estallido de espinas
  arqThornBurst: {
    name: 'Estallido de espinas', texture: 'spark', blending: 'normal',
    count: 46, burst: true, lifetime: [0.3, 0.7],
    shape: 'sphere', shapeRadius: 0.4, speed: [3, 7], gravity: 4, drag: 0.5,
    size: { start: [0.16, 0.34], end: 0.04 },
    color: { start: '#d8f0a0', end: '#5a7a2a' }, alpha: { start: 1, end: 0 }, spin: 80,
  },
  // Arpón — eslabones de la cadena
  arqChainTrail: {
    name: 'Arpón cadena', texture: 'spark', blending: 'normal',
    count: 8, burst: true, lifetime: [0.15, 0.3],
    shape: 'point', shapeRadius: 0.05, speed: [0.2, 0.6], gravity: 2, drag: 0.8,
    size: { start: [0.1, 0.18], end: 0.04 },
    color: { start: '#e0e0e0', end: '#707070' }, alpha: { start: 0.9, end: 0 },
  },
  // Señuelo de Paja — paja al plantarlo
  arqStrawPuff: {
    name: 'Señuelo de Paja', texture: 'smoke', blending: 'normal',
    count: 18, burst: true, lifetime: [0.5, 1.0],
    shape: 'disc', shapeRadius: 0.5, speed: [0.5, 1.6], gravity: -0.2, drag: 0.7,
    size: { start: [0.3, 0.5], end: 0.8 },
    color: { start: '#f0dca0', end: '#a08550' }, alpha: { start: 0.6, end: 0 },
  },
  // Danza de Flechas — remolino turquesa
  arqDanceSwirl: {
    name: 'Danza de Flechas', texture: 'glow', blending: 'additive',
    count: 20, burst: true, lifetime: [0.3, 0.6],
    shape: 'ring', shapeRadius: 1.2, speed: [1, 2.5], gravity: -0.5, drag: 0.6,
    size: { start: [0.16, 0.3], end: 0.0 },
    color: { start: '#e8fffb', end: '#7fe8d8' }, alpha: { start: 0.9, end: 0 }, spin: 200,
  },
  // ---- Catálogo 2g (Paso 2, KA1) ----
  // Carrera del Viento — ráfagas de viento a la espalda al arrancar
  arqWindRun: {
    name: 'Carrera del Viento', texture: 'glow', blending: 'additive',
    count: 18, burst: true, lifetime: [0.25, 0.5],
    shape: 'cone', shapeRadius: 0.3, coneAngle: 50, speed: [3, 6], gravity: 0, drag: 0.9,
    size: { start: [0.2, 0.36], end: 0.0 },
    color: { start: '#f0fdff', end: '#9fe8ff' }, alpha: { start: 0.8, end: 0 },
  },
  // Rodilla en Tierra — polvo dorado al hincar la rodilla
  arqKneel: {
    name: 'Rodilla en Tierra', texture: 'smoke', blending: 'normal',
    count: 12, burst: true, lifetime: [0.4, 0.8],
    shape: 'ring', shapeRadius: 0.6, speed: [0.4, 1.2], gravity: -0.2, drag: 0.8,
    size: { start: [0.3, 0.5], end: 0.9 },
    color: { start: '#fff0b8', end: '#b8963a' }, alpha: { start: 0.5, end: 0 },
  },
  // Tiro Rastreador — estela ámbar y sello del Punto Débil
  arqTrackerTrail: {
    name: 'Tiro Rastreador estela', texture: 'glow', blending: 'additive',
    count: 10, burst: true, lifetime: [0.15, 0.3],
    shape: 'point', shapeRadius: 0.06, speed: [0.3, 1.0], gravity: 0, drag: 0.8,
    size: { start: [0.14, 0.26], end: 0.0 },
    color: { start: '#fff1dc', end: '#ff9a4a' }, alpha: { start: 0.9, end: 0 },
  },
  arqTrackerMark: {
    name: 'Punto Débil', texture: 'star', blending: 'additive',
    count: 8, burst: true, lifetime: [0.4, 0.7],
    shape: 'ring', shapeRadius: 0.5, speed: [0.2, 0.6], gravity: -0.6, drag: 0.7,
    size: { start: [0.22, 0.4], end: 0.0 },
    color: { start: '#ffffff', end: '#ff8a2a' }, alpha: { start: 1, end: 0 }, spin: 120,
  },
  // Flecha Detonante — chispas de pólvora y estallido naranja
  arqDetonTrail: {
    name: 'Flecha Detonante estela', texture: 'spark', blending: 'additive',
    count: 12, burst: true, lifetime: [0.15, 0.35],
    shape: 'point', shapeRadius: 0.06, speed: [0.5, 1.6], gravity: 1, drag: 0.7,
    size: { start: [0.1, 0.2], end: 0.0 },
    color: { start: '#fff0c0', end: '#ff7a1a' }, alpha: { start: 1, end: 0 },
  },
  arqDetonBlast: {
    name: 'Flecha Detonante estallido', texture: 'glow', blending: 'additive',
    count: 30, burst: true, lifetime: [0.2, 0.45],
    shape: 'sphere', shapeRadius: 0.4, speed: [3, 7], gravity: 1, drag: 0.8,
    size: { start: [0.35, 0.7], end: 0.0 },
    color: { start: '#fff2c0', end: '#ff6a1a' }, alpha: { start: 1, end: 0 },
  },
  // Torbellino — anillo de viento que levanta
  arqWhirlwind: {
    name: 'Torbellino', texture: 'glow', blending: 'additive',
    count: 40, burst: true, lifetime: [0.4, 0.8],
    shape: 'ring', shapeRadius: 3.6, speed: [1, 2.5], gravity: -2.5, drag: 0.6,
    size: { start: [0.2, 0.4], end: 0.0 },
    color: { start: '#f4fcff', end: '#bfe8ff' }, alpha: { start: 0.85, end: 0 }, spin: 240,
  },
  // Desborde de Puntas — tres colores de punta encantada
  arqTripleTips: {
    name: 'Desborde de Puntas', texture: 'star', blending: 'additive',
    count: 24, burst: true, lifetime: [0.3, 0.6],
    shape: 'sphere', shapeRadius: 0.5, speed: [1, 2.5], gravity: -1, drag: 0.7,
    size: { start: [0.18, 0.34], end: 0.0 },
    color: { start: '#ffe9a8', end: '#7fd0ff' }, alpha: { start: 1, end: 0 }, spin: 180,
  },
  // Llamada del Halcón — plumas al llamar y picado sobre el blanco
  arqHawkCall: {
    name: 'Llamada del Halcón', texture: 'spark', blending: 'normal',
    count: 14, burst: true, lifetime: [0.5, 1.0],
    shape: 'sphere', shapeRadius: 0.5, speed: [0.8, 2.0], gravity: 1.5, drag: 0.7,
    size: { start: [0.18, 0.3], end: 0.08 },
    color: { start: '#f2e2c0', end: '#8a6a3a' }, alpha: { start: 0.9, end: 0 }, spin: 90,
  },
  arqHawkStrike: {
    name: 'Halcón picado', texture: 'spark', blending: 'additive',
    count: 16, burst: true, lifetime: [0.15, 0.35],
    shape: 'cone', shapeRadius: 0.2, coneAngle: 70, speed: [3, 6], gravity: 2, drag: 0.6,
    size: { start: [0.14, 0.28], end: 0.0 },
    color: { start: '#ffffff', end: '#d8b070' }, alpha: { start: 1, end: 0 },
  },
  // ---- Forja 2g (Paso 2, KA2): cambios de forma ----
  // Humo Venenoso — la nube se tiñe de verde cicuta
  arqVenomCloud: {
    name: 'Humo Venenoso', texture: 'smoke', blending: 'normal',
    count: 60, burst: true, lifetime: [1.8, 3.6],
    shape: 'disc', shapeRadius: 3.6, speed: [0.3, 1.2], gravity: -0.15, drag: 0.9,
    size: { start: [1.2, 2.2], end: 3.4 },
    color: { start: '#cfe8a8', end: '#4e7a32' }, alpha: { start: 0.6, end: 0 }, spin: 20,
  },
  // Jaula de Espinas — el anillo de zarzas, cerrado a 3 m
  arqBriarCage: {
    name: 'Jaula de Espinas', texture: 'spark', blending: 'normal',
    count: 50, burst: true, lifetime: [0.8, 1.6],
    shape: 'ring', shapeRadius: 2.9, speed: [0.4, 1.4], gravity: -1.4, drag: 0.8,
    size: { start: [0.25, 0.5], end: 0.1 },
    color: { start: '#b8e070', end: '#3e5e22' }, alpha: { start: 0.95, end: 0 }, spin: 40,
  },
  // Lluvia Estelar — el haz cae del cielo antes del impacto
  arqCelestialFall: {
    name: 'Lluvia Estelar caída', texture: 'star', blending: 'additive',
    count: 18, burst: true, lifetime: [0.2, 0.35],
    shape: 'disc', shapeRadius: 0.6, speed: [8, 12], gravity: 26, drag: 0.1,
    size: { start: [0.3, 0.55], end: 0.06 },
    color: { start: '#ffffff', end: '#7fc4ff' }, alpha: { start: 1, end: 0.2 }, spin: 120,
  },
};

// Por habilidad del catálogo 2g. Los presets de las habilidades retiradas se conservan para las
// variantes de la forja que las absorben (Disperso, Cicuta, Red de Caza, Garfio, Señuelo).
// `vars.i|ii` (Paso 2, forja): lo que cambia el VFX de esa variante (mismas claves; se fusiona
// sobre la entrada). Lo leen los comportamientos de skills-arquera.js, los tipos genéricos (flecha,
// salto) y el básico de arma (skillFxFor de fx-skills.js). Las trampas cambian de color con la
// definición forjada (`color` de la variante).
export const ARQUERA_FX = {
  // kit base (el básico de arma: la flecha de siempre; sus variantes, abanico o cicuta). Sin
  // `color` en la base: sale la flecha beige de la clase; la Cicuta pone su verde (vars.ii y la
  // definición forjada, que Player.basicAttack lee antes que el color del VFX base)
  a_disparo:         { aura: 'basicArrow', sfx: 'shoot',
    vars: { i: { aura: 'arqScatter' }, ii: { aura: 'arqHemlockTrail', impact: 'arqHemlockSplash', color: 0x86d47a } } },
  flecha_perforante: { trail: 'piercingTrail', impact: 'arrowSpark', color: 0xffffcc, sfx: 'shoot',
    vars: { i: { aura: 'arqDetonBlast', extra: 'arqBlastPop' }, ii: { trail: 'arqAimedTrail', impact: 'arqAimedImpact' } } },
  a_paso:            { trail: 'arqRollDust', impact: 'arqRollDust', color: 0xe2d8bc, sfx: 'dash' },
  a_humo:            { aura: 'arqSmokeCloud', extra: 'arqSmokePuff', color: 0x9aa0a8, sfx: 'dash',
    vars: { i: { aura: 'arqVenomCloud', extra: 'arqHemlockSplash' }, ii: { impact: 'arqStunPop' } } },
  lluvia_flechas:    { aura: 'arrowRain', extra: 'arrowRainDust', color: 0xaaffaa, sfx: 'shoot',
    vars: { ii: { extra: 'arqSmokePuff' } } },
  // Tiradora
  a_t_andanada:      { aura: 'multiShotBurst', trail: 'arqRollDust', impact: 'arrowSpark', color: 0x66d7c7, sfx: 'shoot',
    vars: { ii: { impact: 'arqStunPop' } } },
  a_v_carrera:       { aura: 'arqWindRun', impact: 'arrowSpark', color: 0x9fe8ff, sfx: 'dash' },
  flecha_multiple:   { aura: 'multiShotBurst', impact: 'arrowSpark', color: 0xccddaa, sfx: 'shoot' },
  a_u_diluvio:       { trail: 'arqDelugeFall', aura: 'arqDeluge', extra: 'arrowRainDust', color: 0xbfffbf, sfx: 'shoot',
    vars: { ii: { aura: 'arqAimedImpact', extra: 'critRing' } } },
  // Francotiradora
  a_t_apuntado:      { trail: 'arqAimedTrail', impact: 'arqAimedImpact', color: 0xfff1a8, sfx: 'crit' },
  a_f_rodilla:       { aura: 'arqKneel', color: 0xffd966, sfx: 'skill' },
  a_f_rastreador:    { trail: 'arqTrackerTrail', impact: 'arqTrackerMark', color: 0xff9a4a, sfx: 'shoot' },
  a_u_celeste:       { aura: 'arqCelestialMuzzle', impact: 'arqCelestialImpact', extra: 'critRing', color: 0x9fd8ff, sfx: 'crit',
    vars: { i: { trail: 'arqCelestialFall' } } },
  // Montaraz (la red y el salto enredador los pinta su poder: arqNetBurst)
  a_t_cepo:          { aura: 'arqTrapSnap', color: 0x86d47a, sfx: 'trap' },
  a_m_acecho:        { trail: 'arqRollDust', impact: 'arqThornBurst', color: 0xb6e07a, sfx: 'dash' },
  a_m_detonante:     { trail: 'arqDetonTrail', impact: 'arqBlastPop', aura: 'arqDetonBlast', color: 0xffa040, sfx: 'shoot',
    vars: { ii: { trail: 'arqChainTrail', impact: 'arqChainTrail' } } },
  a_u_zarzas:        { aura: 'arqBriarRing', impact: 'arqBriarSnag', color: 0x5a8a3a, sfx: 'trap',
    vars: { i: { aura: 'arqBriarCage' }, ii: { extra: 'arqStrawPuff' } } },
  // activas de talento
  a_t_camuflaje:     { aura: 'arqCamoLeaves', color: 0x8fbf7a, sfx: 'portal' },
  agilidad:          { aura: 'agility', extra: 'agilityMotes', color: 0x9af06a, sfx: 'dash' },
  a_t_bengala:       { aura: 'arqFlareBurst', color: 0xffcc55, sfx: 'shoot' },
  a_h_torbellino:    { aura: 'arqWhirlwind', color: 0xbfe8ff, sfx: 'dash' },
  a_h_puntas:        { aura: 'arqTripleTips', color: 0xffd27a, sfx: 'skill' },
  a_h_halcon:        { aura: 'arqHawkCall', impact: 'arqHawkStrike', color: 0xd8b070, sfx: 'shoot' },
};
