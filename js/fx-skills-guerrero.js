// ============================================================
// VFX/SFX de las habilidades de la clase GUERRERO — dueño: trabajador de la clase (2b.1)
// ============================================================
// js/fx-skills.js FUSIONA estos mapas en SKILL_FX / SKILL_FX_PRESETS (lo de la
// clase pisa lo base con el mismo id).
//  - GUERRERO_FX: { idHabilidad: { trail?, impact?, aura?, extra?, auraY?, color?, sfx? } }
//    cada campo es un preset de partículas (objeto parcial, ver js/particles.js) o el
//    NOMBRE de uno existente (string). `sfx` es un nombre de js/sfx.js.
//  - GUERRERO_FX_PRESETS: presets nuevos con nombre (se citan por string).
// Los presets ajenos (fx-skills.js: whirlwind, brutalStrike, quakeDust, warCry…) se
// citan por NOMBRE: importarlos formaría un ciclo. Columna VFX/SFX de §3.1.
// Estética (fx-skills.js): físico = blanco/ámbar, sangre/furia = rojo, sagrado =
// dorado pálido; counts moderados, vidas cortas.

export const GUERRERO_FX_PRESETS = {
  // Mandoble: tajo grande y seco (más chispas y onda que el golpe normal)
  heavySwing: {
    name: 'Mandoble', texture: 'spark', blending: 'additive',
    count: 48, burst: true, lifetime: [0.18, 0.42],
    shape: 'cone', shapeRadius: 0.2, coneAngle: 110, speed: [6, 13], gravity: 5, drag: 0.5,
    size: { start: [0.25, 0.55], end: 0.0 },
    color: { start: '#ffffff', end: '#ffc46a' }, alpha: { start: 1, end: 0 },
  },
  // Embate: anillo bajo de polvo y chispas alrededor del héroe
  sweepRing: {
    name: 'Embate', texture: 'spark', blending: 'additive',
    count: 40, burst: true, lifetime: [0.2, 0.4],
    shape: 'ring', shapeRadius: 1.2, speed: [3, 6], gravity: 2, drag: 0.6,
    size: { start: [0.18, 0.4], end: 0.0 },
    color: { start: '#fff1cc', end: '#d79a4a' }, alpha: { start: 0.9, end: 0 }, spin: 90,
  },
  // Hendidura: arco ROJO frontal (cono ancho) con salpicadura
  cleaveArc: {
    name: 'Hendidura', texture: 'spark', blending: 'additive',
    count: 70, burst: true, lifetime: [0.22, 0.5],
    shape: 'cone', shapeRadius: 0.3, coneAngle: 120, speed: [7, 15], gravity: 3, drag: 0.55,
    size: { start: [0.25, 0.6], end: 0.0 },
    color: { start: '#ffd0c0', end: '#c8202a' }, alpha: { start: 1, end: 0 },
  },
  cleaveBlood: {
    name: 'Hendidura sangre', texture: 'disc', blending: 'normal',
    count: 16, burst: true, lifetime: [0.35, 0.7],
    shape: 'cone', shapeRadius: 0.3, coneAngle: 100, speed: [3, 7], gravity: 12, drag: 0.3,
    size: { start: [0.12, 0.25], end: 0.05 },
    color: { start: '#b0101c', end: '#5a0008' }, alpha: { start: 0.9, end: 0 },
  },
  // Martillo de Guerra: onda de choque baja + polvo
  hammerShock: {
    name: 'Martillo onda', texture: 'disc', blending: 'additive',
    count: 1, burst: true, lifetime: [0.3, 0.38],
    shape: 'point', shapeRadius: 0.01, speed: [0, 0], gravity: 0, drag: 0,
    size: { start: [0.6, 0.7], end: 6.0 },
    color: { start: '#fff2cf', end: '#b8862e' }, alpha: { start: 0.85, end: 0 },
  },
  // Terremoto: grieta (polvo y rocas a lo largo del centro de la línea)
  quakeFissure: {
    name: 'Terremoto grieta', texture: 'smoke', blending: 'normal',
    count: 34, burst: true, lifetime: [0.5, 1.0],
    shape: 'disc', shapeRadius: 3.2, speed: [0.6, 2.0], gravity: -0.6, drag: 0.6,
    size: { start: [0.5, 1.0], end: 1.8 },
    color: { start: '#b8a888', end: '#6a5e48' }, alpha: { start: 0.55, end: 0 }, spin: 30,
  },
  // Salto Devastador: caída + anillo de polvo
  leapImpact: {
    name: 'Salto impacto', texture: 'spark', blending: 'additive',
    count: 60, burst: true, lifetime: [0.25, 0.55],
    shape: 'ring', shapeRadius: 0.8, speed: [5, 10], gravity: 6, drag: 0.5,
    size: { start: [0.25, 0.5], end: 0.0 },
    color: { start: '#ffffff', end: '#e0a24a' }, alpha: { start: 1, end: 0 },
  },
  // Piel de Hierro: brillo metálico que envuelve al héroe
  ironSkin: {
    name: 'Piel de Hierro', texture: 'star', blending: 'additive',
    count: 30, burst: true, lifetime: [0.5, 0.9],
    shape: 'sphere', shapeRadius: 0.8, speed: [0.3, 1.0], gravity: -0.8, drag: 0.5,
    size: { start: [0.25, 0.45], end: 0.0 },
    color: { start: '#ffffff', end: '#8fa2b8' }, alpha: { start: 1, end: 0 }, spin: 60,
  },
  // Provocación: grito (onda roja) + marca sobre el provocado
  tauntShout: {
    name: 'Provocación grito', texture: 'disc', blending: 'additive',
    count: 1, burst: true, lifetime: [0.35, 0.45],
    shape: 'point', shapeRadius: 0.01, speed: [0, 0], gravity: 0, drag: 0,
    size: { start: [0.5, 0.6], end: 4.0 },
    color: { start: '#ffb0a0', end: '#c0302a' }, alpha: { start: 0.8, end: 0 },
  },
  tauntMark: {
    name: 'Provocación marca', texture: 'star', blending: 'additive',
    count: 10, burst: true, lifetime: [0.6, 1.0],
    shape: 'point', shapeRadius: 0.1, speed: [0.2, 0.8], gravity: -1, drag: 0.4,
    size: { start: [0.4, 0.6], end: 0.0 },
    color: { start: '#ff7a5a', end: '#a0101a' }, alpha: { start: 1, end: 0 },
  },
  // Furia Inmortal: aura de fuego que sube del héroe
  furyAura: {
    name: 'Furia Inmortal', texture: 'glow', blending: 'additive',
    count: 60, burst: true, lifetime: [0.5, 1.0],
    shape: 'ring', shapeRadius: 0.7, speed: [1, 3], gravity: -4, drag: 0.4,
    size: { start: [0.35, 0.7], end: 0.0 },
    color: { start: '#ffd070', end: '#e02a10' }, alpha: { start: 0.9, end: 0 }, spin: 40,
  },
  // Cataclismo: meteoro de luz que cae + destello dorado al tocar suelo
  holyFall: {
    name: 'Cataclismo caída', texture: 'glow', blending: 'additive',
    count: 14, burst: true, lifetime: [0.3, 0.45],
    shape: 'point', shapeRadius: 0.2, speed: [6, 9], gravity: 18, drag: 0,
    size: { start: [0.4, 0.7], end: 0.1 },
    color: { start: '#fffbe0', end: '#f0c040' }, alpha: { start: 1, end: 0 },
  },
  holyImpact: {
    name: 'Cataclismo impacto', texture: 'star', blending: 'additive',
    count: 44, burst: true, lifetime: [0.3, 0.6],
    shape: 'ring', shapeRadius: 0.6, speed: [4, 9], gravity: 2, drag: 0.5,
    size: { start: [0.3, 0.6], end: 0.0 },
    color: { start: '#ffffff', end: '#ffd060' }, alpha: { start: 1, end: 0 }, spin: 90,
  },
  // Estandarte: círculo dorado en el suelo + chispas en el asta
  bannerAura: {
    name: 'Estandarte', texture: 'disc', blending: 'additive',
    count: 1, burst: true, lifetime: [0.6, 0.7],
    shape: 'point', shapeRadius: 0.01, speed: [0, 0], gravity: 0, drag: 0,
    size: { start: [1.0, 1.1], end: 9.0 },
    color: { start: '#ffe7a8', end: '#c8741e' }, alpha: { start: 0.6, end: 0 },
  },
  bannerSparks: {
    name: 'Estandarte chispas', texture: 'star', blending: 'additive',
    count: 20, burst: true, lifetime: [0.6, 1.1],
    shape: 'point', shapeRadius: 0.2, speed: [1, 2.5], gravity: -2.5, drag: 0.4,
    size: { start: [0.3, 0.5], end: 0.0 },
    color: { start: '#fff6d6', end: '#f0a23a' }, alpha: { start: 1, end: 0 },
  },
};

export const GUERRERO_FX = {
  // básicos (el Tajo lo dibuja Player.basicAttack con 'basicCleave'/'meleeHit')
  g_tajo:        { impact: 'basicCleave', color: 0xffbb66, sfx: 'hit' },
  g_mandoble:    { impact: 'heavySwing', extra: 'meleeHit', color: 0xffc46a, sfx: 'crit' },
  g_embate:      { aura: 'sweepRing', auraY: 0.6, color: 0xffbb66, sfx: 'hit' },
  // gastadoras
  torbellino:    { aura: 'whirlwind', extra: 'whirlwindInner', color: 0xcfd6e0, sfx: 'dash' },
  g_hendidura:   { impact: 'cleaveArc', aura: 'cleaveBlood', color: 0xd8302a, sfx: 'hit' },
  g_martillo:    { impact: 'brutalStrike', aura: 'hammerShock', extra: 'brutalStrikeDust', color: 0xffd58a, sfx: 'hit' },
  terremoto:     { impact: 'quakeFissure', color: 0x9a8c6e, sfx: 'hit' },
  g_lanza:       { trail: 'piercingTrail', impact: 'meleeHit', color: 0xe8dcc0, sfx: 'shoot' },
  // movilidad
  embestida:     { trail: 'chargeTrail', impact: 'chargeImpact', color: 0xffcf7a, sfx: 'dash' },
  g_salto:       { impact: 'leapImpact', color: 0xffcc66, sfx: 'hit' },
  // defensa / utilidad
  g_piel:        { aura: 'ironSkin', color: 0xb8c4d0, sfx: 'equip' },
  g_provocacion: { aura: 'tauntShout', impact: 'tauntMark', color: 0xff5544, sfx: 'levelup' },
  grito_guerra:  { aura: 'warCry', extra: 'warCryRing', color: 0xe08a2a, sfx: 'levelup' },
  // definitivas
  g_u_furia:     { aura: 'furyAura', extra: 'warCryRing', color: 0xff5a3c, sfx: 'hurt' },
  g_u_cataclismo:{ trail: 'holyFall', impact: 'holyImpact', aura: 'brutalStrikeWave', color: 0xffe7a0, sfx: 'holy' },
  g_u_estandarte:{ aura: 'bannerAura', extra: 'bannerSparks', color: 0xd8a040, sfx: 'levelup' },
};
