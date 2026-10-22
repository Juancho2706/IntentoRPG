// ============================================================
// VFX/SFX de las habilidades de la clase GUERRERO — dueño: KA-guerrero (catálogo 2g)
// ============================================================
// js/fx-skills.js FUSIONA estos mapas en SKILL_FX / SKILL_FX_PRESETS (lo de la
// clase pisa lo base con el mismo id).
//  - GUERRERO_FX: { idHabilidad: { trail?, impact?, aura?, extra?, auraY?, color?, sfx? } }
//    cada campo es un preset de partículas (objeto parcial, ver js/particles.js) o el
//    NOMBRE de uno existente (string). `sfx` es un nombre de js/sfx.js.
//  - GUERRERO_FX_PRESETS: presets nuevos con nombre (se citan por string).
// Los presets ajenos (fx-skills.js: whirlwind, brutalStrike, quakeDust, warCry…) se
// citan por NOMBRE: importarlos formaría un ciclo. GUERRERO_FX: una entrada por habilidad del
// catálogo 2g (los kits reutilizan los presets de 2b; los verbos —carga, postura, perfecto— los
// dibuja el canal con los presets verb* de fx-skills.js) y, para las variantes de forja que
// cambian de forma, otra con el id de la variante (`<id>_i` / `<id>_ii`). Los presets sin uso
// en GUERRERO_FX se conservan: los citan los poderes de la clase.
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

  // ---------------- activas de talento y poderes (Paso 2c.1) ----------------
  // Segundo Aliento: pulso rojo de curación que sube del héroe
  secondWind: {
    name: 'Segundo Aliento', texture: 'glow', blending: 'additive',
    count: 36, burst: true, lifetime: [0.5, 0.9],
    shape: 'ring', shapeRadius: 0.6, speed: [0.6, 1.6], gravity: -3.5, drag: 0.5,
    size: { start: [0.3, 0.55], end: 0.0 },
    color: { start: '#ffd0c8', end: '#d8302a' }, alpha: { start: 0.9, end: 0 }, spin: 40,
  },
  // Intervención: domo azul al caer junto al aliado
  interveneDome: {
    name: 'Intervención domo', texture: 'disc', blending: 'additive',
    count: 1, burst: true, lifetime: [0.45, 0.55],
    shape: 'point', shapeRadius: 0.01, speed: [0, 0], gravity: 0, drag: 0,
    size: { start: [0.6, 0.7], end: 3.4 },
    color: { start: '#e0f0ff', end: '#5a8ad8' }, alpha: { start: 0.75, end: 0 },
  },
  // Bramido de Guerra: onda roja amplia
  warHorn: {
    name: 'Bramido', texture: 'disc', blending: 'additive',
    count: 1, burst: true, lifetime: [0.5, 0.6],
    shape: 'point', shapeRadius: 0.01, speed: [0, 0], gravity: 0, drag: 0,
    size: { start: [0.8, 0.9], end: 8.0 },
    color: { start: '#ffd0b0', end: '#c83a22' }, alpha: { start: 0.7, end: 0 },
  },
  // Remolino Sangriento: giro rojo + gotas de sangre en cada golpe
  bloodWhirl: {
    name: 'Remolino Sangriento', texture: 'spark', blending: 'additive',
    count: 54, burst: true, lifetime: [0.25, 0.5],
    shape: 'ring', shapeRadius: 1.6, speed: [3, 6], gravity: 0, drag: 0.4,
    size: { start: [0.22, 0.45], end: 0.0 },
    color: { start: '#ffb0a0', end: '#b0101c' }, alpha: { start: 1, end: 0 }, spin: 260,
  },
  // Ciclón (S-guerrero, G02): el viento gris del Ciclón que se tiñe de rojo al girar
  bloodWindWhirl: {
    name: 'Ciclón sangriento', texture: 'spark', blending: 'additive',
    count: 48, burst: true, lifetime: [0.25, 0.5],
    shape: 'ring', shapeRadius: 1.7, speed: [3, 6], gravity: 0, drag: 0.4,
    size: { start: [0.22, 0.45], end: 0.0 },
    color: { start: '#e6ecf4', end: '#b0101c' }, alpha: { start: 0.95, end: 0 }, spin: 300,
  },
  bloodDrops: {
    name: 'Remolino gotas', texture: 'disc', blending: 'normal',
    count: 10, burst: true, lifetime: [0.3, 0.6],
    shape: 'ring', shapeRadius: 1.4, speed: [2, 4], gravity: 11, drag: 0.3,
    size: { start: [0.1, 0.2], end: 0.04 },
    color: { start: '#b0101c', end: '#5a0008' }, alpha: { start: 0.9, end: 0 },
  },
  // Temeridad (y Sangre Hirviente / Negación): aura carmesí
  recklessAura: {
    name: 'Temeridad', texture: 'glow', blending: 'additive',
    count: 40, burst: true, lifetime: [0.5, 0.9],
    shape: 'sphere', shapeRadius: 0.7, speed: [0.5, 1.5], gravity: -2.5, drag: 0.5,
    size: { start: [0.3, 0.55], end: 0.0 },
    color: { start: '#ff9a7a', end: '#a00a12' }, alpha: { start: 0.9, end: 0 }, spin: 60,
  },
  // Ira Ciega: destellos rojos a la altura de los ojos
  blindRage: {
    name: 'Ira Ciega', texture: 'star', blending: 'additive',
    count: 18, burst: true, lifetime: [0.4, 0.7],
    shape: 'sphere', shapeRadius: 0.3, speed: [0.4, 1.2], gravity: -1, drag: 0.5,
    size: { start: [0.3, 0.5], end: 0.0 },
    color: { start: '#ffffff', end: '#ff2200' }, alpha: { start: 1, end: 0 },
  },
  // Grito Desafiante: onda azul
  defiantShout: {
    name: 'Grito Desafiante', texture: 'disc', blending: 'additive',
    count: 1, burst: true, lifetime: [0.45, 0.55],
    shape: 'point', shapeRadius: 0.01, speed: [0, 0], gravity: 0, drag: 0,
    size: { start: [0.6, 0.7], end: 7.0 },
    color: { start: '#d8e8ff', end: '#3a6ad8' }, alpha: { start: 0.75, end: 0 },
  },
  // Muro de Escudos (y Bastión Eterno): domo de placas azul acero
  shieldWall: {
    name: 'Muro de Escudos', texture: 'star', blending: 'additive',
    count: 34, burst: true, lifetime: [0.5, 0.9],
    shape: 'sphere', shapeRadius: 1.0, speed: [0.2, 0.8], gravity: -0.6, drag: 0.6,
    size: { start: [0.3, 0.5], end: 0.0 },
    color: { start: '#ffffff', end: '#7fb0e8' }, alpha: { start: 1, end: 0 }, spin: 50,
  },
  // Venganza Acumulada: onda de choque al terminar el Muro
  vengeanceWave: {
    name: 'Venganza', texture: 'disc', blending: 'additive',
    count: 1, burst: true, lifetime: [0.35, 0.45],
    shape: 'point', shapeRadius: 0.01, speed: [0, 0], gravity: 0, drag: 0,
    size: { start: [0.6, 0.7], end: 6.0 },
    color: { start: '#e8f2ff', end: '#4a7ac8' }, alpha: { start: 0.85, end: 0 },
  },
  // Carga de Escudo: estela azul
  shieldChargeTrail: {
    name: 'Carga de Escudo', texture: 'spark', blending: 'additive',
    count: 12, burst: true, lifetime: [0.2, 0.4],
    shape: 'disc', shapeRadius: 0.4, speed: [0.5, 1.5], gravity: 0, drag: 0.6,
    size: { start: [0.2, 0.4], end: 0.0 },
    color: { start: '#e0ecff', end: '#4a6ad8' }, alpha: { start: 0.9, end: 0 },
  },
  // Aura de Devoción (y Ascensión): círculo sagrado + motas doradas
  devotionCircle: {
    name: 'Aura de Devoción', texture: 'disc', blending: 'additive',
    count: 1, burst: true, lifetime: [0.7, 0.8],
    shape: 'point', shapeRadius: 0.01, speed: [0, 0], gravity: 0, drag: 0,
    size: { start: [1.0, 1.1], end: 14.0 },
    color: { start: '#fff6d0', end: '#e8b840' }, alpha: { start: 0.55, end: 0 },
  },
  devotionMotes: {
    name: 'Devoción motas', texture: 'star', blending: 'additive',
    count: 24, burst: true, lifetime: [0.7, 1.2],
    shape: 'ring', shapeRadius: 1.0, speed: [0.4, 1.2], gravity: -2, drag: 0.4,
    size: { start: [0.25, 0.4], end: 0.0 },
    color: { start: '#ffffff', end: '#ffd060' }, alpha: { start: 1, end: 0 },
  },
  // Veredicto Final: martillo de luz en cono
  verdictStrike: {
    name: 'Veredicto Final', texture: 'star', blending: 'additive',
    count: 64, burst: true, lifetime: [0.25, 0.55],
    shape: 'cone', shapeRadius: 0.3, coneAngle: 90, speed: [7, 14], gravity: 2, drag: 0.5,
    size: { start: [0.3, 0.6], end: 0.0 },
    color: { start: '#ffffff', end: '#ffd060' }, alpha: { start: 1, end: 0 },
  },
  // Martillo de Justicia: estela dorada del martillo arrojado
  justiceHammer: {
    name: 'Martillo de Justicia', texture: 'glow', blending: 'additive',
    count: 10, burst: true, lifetime: [0.2, 0.35],
    shape: 'point', shapeRadius: 0.15, speed: [0.5, 1.5], gravity: 0, drag: 0.5,
    size: { start: [0.35, 0.5], end: 0.0 },
    color: { start: '#fff6d6', end: '#e8a83a' }, alpha: { start: 1, end: 0 },
  },
  // Martillos Benditos (poder del Cruzado x1): chispa sagrada en cada golpe
  justiceSpark: {
    name: 'Martillo Bendito chispa', texture: 'spark', blending: 'additive',
    count: 10, burst: true, lifetime: [0.15, 0.3],
    shape: 'sphere', shapeRadius: 0.2, speed: [2, 5], gravity: 3, drag: 0.5,
    size: { start: [0.15, 0.3], end: 0.0 },
    color: { start: '#ffffff', end: '#ffd060' }, alpha: { start: 1, end: 0 },
  },

  // ---------------- sensación (S-guerrero, auditoría) ----------------
  // Juicio (G06): la marca estalla al detonarla (la mecánica del Fervor lo emite sobre el enemigo)
  juicioDetonate: {
    name: 'Juicio detonado', texture: 'star', blending: 'additive',
    count: 16, burst: true, lifetime: [0.22, 0.4],
    shape: 'sphere', shapeRadius: 0.25, speed: [2, 4.5], gravity: -2, drag: 2.2,
    size: { start: [0.3, 0.55], end: 0.0 },
    color: { start: '#fffbe0', end: '#ffc23a' }, alpha: { start: 1, end: 0 },
  },
  // Cataclismo (G05): luz que sube por el héroe mientras carga (más seguida cuanto más cargas)
  cataChargeMote: {
    name: 'Cataclismo carga', texture: 'glow', blending: 'additive',
    count: 3, burst: true, lifetime: [0.4, 0.7],
    shape: 'ring', shapeRadius: 0.5, speed: [0.6, 1.4], gravity: -4.5, drag: 0.4,
    size: { start: [0.18, 0.32], end: 0.0 },
    color: { start: '#ffffff', end: '#ffd060' }, alpha: { start: 0.9, end: 0 },
  },
  // suelo consagrado del Cataclismo (G05): motas doradas que suben del suelo
  holyGroundMote: {
    name: 'Suelo consagrado', texture: 'star', blending: 'additive',
    count: 2, burst: true, lifetime: [0.6, 1.1],
    shape: 'point', shapeRadius: 0.1, speed: [0.3, 0.9], gravity: -2.2, drag: 0.4,
    size: { start: [0.18, 0.32], end: 0.0 },
    color: { start: '#fffbe0', end: '#ffc860' }, alpha: { start: 0.95, end: 0 },
  },

  // ---------------- forja (Paso 2, KA2): cambios de forma ----------------
  // Rayo del Cielo: columna estrecha de luz blanca (sube desde el impacto)
  holyBeam: {
    name: 'Rayo del Cielo', texture: 'glow', blending: 'additive',
    count: 26, burst: true, lifetime: [0.25, 0.45],
    shape: 'disc', shapeRadius: 0.5, speed: [4, 9], gravity: -12, drag: 0.2,
    size: { start: [0.35, 0.6], end: 0.0 },
    color: { start: '#ffffff', end: '#fff0b8' }, alpha: { start: 1, end: 0 },
  },
  // Amanecer: motas doradas suaves que suben sobre el grupo (cura y escudo)
  dawnLight: {
    name: 'Amanecer', texture: 'star', blending: 'additive',
    count: 30, burst: true, lifetime: [0.7, 1.2],
    shape: 'disc', shapeRadius: 3.5, speed: [0.4, 1.2], gravity: -2.2, drag: 0.4,
    size: { start: [0.25, 0.45], end: 0.0 },
    color: { start: '#fffbe8', end: '#ffc860' }, alpha: { start: 0.9, end: 0 }, spin: 40,
  },
};

export const GUERRERO_FX = {
  // kit base (el Tajo lo dibuja Player.basicAttack con 'basicCleave'/'meleeHit')
  g_tajo:        { impact: 'basicCleave', color: 0xffbb66, sfx: 'hit' },
  g_hendidura:   { impact: 'cleaveArc', aura: 'cleaveBlood', color: 0xd8302a, sfx: 'hit' },
  embestida:     { trail: 'chargeTrail', impact: 'chargeImpact', color: 0xffcf7a, sfx: 'dash' },
  g_piel:        { aura: 'ironSkin', color: 0xb8c4d0, sfx: 'equip' },
  g_lanza:       { trail: 'piercingTrail', impact: 'meleeHit', color: 0xe8dcc0, sfx: 'shoot' },
  // kit del Berserker (rojo sangre). Remolino (S-guerrero, G02): aura y «whoosh» en CADA giro (tickSfx),
  // gotas sobre los golpeados y el anillo que rota a tus pies con estos colores (campo g_giro)
  g_remolino:    { aura: 'bloodWhirl', extra: 'bloodDrops', color: 0xcc2222, sfx: 'dash', tickSfx: 'whoosh', ringColors: [0xd8202a, 0x7a0a10] },
  g_salto:       { impact: 'leapImpact', color: 0xffcc66, sfx: 'hit' },
  g_rajar:       { impact: 'cleaveArc', aura: 'bloodDrops', extra: 'cleaveBlood', color: 0xb0101c, sfx: 'hit' },
  g_u_furia:     { aura: 'furyAura', extra: 'warCryRing', color: 0xff5a3c, sfx: 'hurt' },
  // kit del Guardián (azul acero; el cambio de postura lo dibuja el canal con verbStance)
  g_guardia:     { aura: 'shieldWall', color: 0x4a7ad8, sfx: 'equip' },
  g_carga_escudo:{ trail: 'shieldChargeTrail', impact: 'chargeImpact', color: 0x6699ff, sfx: 'dash' },
  terremoto:     { impact: 'quakeFissure', aura: 'quakeWave', extra: 'quakeRocks', auraY: 0.2, color: 0x9a8c6e, sfx: 'hit' },
  g_u_ciudadela: { aura: 'shieldWall', extra: 'defiantShout', color: 0x7fb0e8, sfx: 'equip' },
  // kit del Cruzado (oro y luz; extra del Cataclismo = el suelo consagrado)
  g_juicio:      { trail: 'justiceHammer', impact: 'holyImpact', aura: 'justiceSpark', color: 0xffd36b, sfx: 'holy' },
  g_sendero:     { impact: 'devotionMotes', color: 0xffe680, sfx: 'dash' },
  g_martillo:    { impact: 'holyImpact', aura: 'hammerShock', extra: 'brutalStrikeDust', color: 0xffe08a, sfx: 'holy' },
  g_u_cataclismo:{ trail: 'holyFall', impact: 'holyImpact', aura: 'brutalStrikeWave', extra: 'devotionCircle', color: 0xffe7a0, sfx: 'holy' },
  // activas de talento (de clase: comportamientos en js/powers-guerrero.js; de héroe: en skills-guerrero.js)
  g_t_aliento:      { aura: 'secondWind', color: 0xff5a4a, sfx: 'potion' },
  grito_guerra:     { aura: 'warCry', extra: 'warCryRing', color: 0xe08a2a, sfx: 'levelup' },
  g_t_intervencion: { trail: 'chargeTrail', impact: 'interveneDome', color: 0x88bbff, sfx: 'dash' },
  g_h_bramido:      { aura: 'warHorn', extra: 'warCryRing', color: 0xff6644, sfx: 'levelup' },
  g_h_desafio:      { aura: 'bannerAura', impact: 'tauntMark', color: 0xe0a040, sfx: 'levelup' },
  g_h_estandarte:   { aura: 'bannerAura', extra: 'bannerSparks', color: 0xd8a040, sfx: 'levelup' },

  // ---------------- forja: VFX de las variantes que CAMBIAN DE FORMA ----------------
  // Clave = id de la variante (`<id>_i` / `<id>_ii`): sustituyen a los de su habilidad (el motor
  // busca el VFX por variante: skillFxFor de fx-skills.js). Reutilizan presets existentes: el mismo
  // campo (trail/impact/aura/extra) que lee el tipo genérico de la forma nueva.
  g_tajo_ii:         { impact: 'sweepRing', color: 0xffcc77, sfx: 'hit' },                                       // Siega: barrido
  g_remolino_i:      { aura: 'whirlwindInner', extra: 'bloodDrops', color: 0xb0101c, sfx: 'hit', tickSfx: 'whoosh', ringColors: [0xb0101c, 0xff4a3a] },   // Anclado: giro corto
  // Ciclón: remolino de viento gris con la sangre del Remolino (anillo gris y rojo, gotas rojas)
  g_remolino_ii:     { aura: 'bloodWindWhirl', extra: 'bloodDrops', color: 0xcfd6e0, sfx: 'dash', tickSfx: 'whoosh', ringColors: [0xcfd6e0, 0xc8202a] },
  g_salto_i:         { impact: 'quakeWave', color: 0xd8b070, sfx: 'hit' },                                      // Caída Atronadora: onda
  g_salto_ii:        { impact: 'chargeImpact', color: 0xffcc66, sfx: 'dash' },                                  // Salto Rasante
  g_rajar_i:         { impact: 'heavySwing', aura: 'bloodDrops', extra: 'cleaveBlood', color: 0xb0101c, sfx: 'hit' },  // Estocada en línea
  g_rajar_ii:        { impact: 'sweepRing', aura: 'bloodWhirl', color: 0xb0101c, sfx: 'hit' },                  // Molino: giros a tu alrededor
  g_carga_escudo_ii: { trail: 'chargeTrail', impact: 'chargeImpact', color: 0x9ab8ff, sfx: 'dash' },            // Carga Veloz
  terremoto_i:       { impact: 'brutalStrike', aura: 'quakeWave', extra: 'quakeRocks', auraY: 0.2, color: 0x9a8c6e, sfx: 'hit' },  // Martinete
  terremoto_ii:      { impact: 'quakeFissure', color: 0x9a8c6e, sfx: 'hit' },                                   // Falla en línea
  g_juicio_i:        { trail: 'justiceHammer', impact: 'justiceSpark', color: 0xffd36b, sfx: 'holy' },          // Sentencia: sin área
  g_martillo_i:      { trail: 'justiceHammer', impact: 'holyImpact', color: 0xffe08a, sfx: 'holy' },            // Martillo Arrojado
  g_u_cataclismo_i:  { trail: 'holyFall', impact: 'holyBeam', aura: 'justiceSpark', extra: 'devotionCircle', color: 0xfff6d8, sfx: 'holy' },  // Rayo del Cielo
  g_u_cataclismo_ii: { trail: 'holyFall', impact: 'holyImpact', aura: 'dawnLight', extra: 'devotionCircle', color: 0xffe7a0, sfx: 'holy' },  // Amanecer
};
