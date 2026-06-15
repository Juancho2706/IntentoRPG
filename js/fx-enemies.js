// fx-enemies.js — presets de partículas TEMÁTICOS para enemigos (IntentoRPG).
//
// Usa el motor de js/particles.js. Cada preset es un objeto parcial; el sistema
// los normaliza al emitir (normalizePreset). Pensados con telegrafía clara y
// uso comedido del aditivo (sin saturar la escena).
//
// Convención de color por tema:
//   fuego   -> naranja (#ff7a1e / #ffd27a)
//   hielo   -> cian    (#bff0ff / #3aa7ff)
//   veneno  -> verde   (#9bff5e / #2e5d18)
//   sombra  -> violeta oscuro (#b388ff / #3a1a55)
//   físico  -> polvo marrón claro (#d9c2a0 / #6b5536)
//
// Importado y usado desde main.js (helpers de mecánica de enemigo).

// Convierte un color numérico de THREE (0xrrggbb) a string '#rrggbb'.
export function hexNum(n) {
  if (typeof n === 'string') return n.startsWith('#') ? n : '#' + n;
  const v = (Number(n) >>> 0) & 0xffffff;
  return '#' + v.toString(16).padStart(6, '0');
}

// ---------------------------------------------------------------------------
// MUERTE DE ENEMIGO
// ---------------------------------------------------------------------------

// Estallido de muerte estándar, teñido con el color del enemigo. El color se
// inyecta en runtime (deathBurst(colorHex)). Más vivo que el spawnBurst viejo.
export function deathBurst(colorHex, scale = 1) {
  return {
    name: 'Muerte', texture: 'glow', blending: 'additive',
    count: Math.round(22 * scale), burst: true, lifetime: [0.35, 0.75],
    shape: 'sphere', shapeRadius: 0.3 * scale, speed: [2.2, 5.5 * scale],
    gravity: 4, drag: 1.6,
    size: { start: [0.22 * scale, 0.5 * scale], end: 0 },
    color: { start: '#ffffff', end: colorHex }, alpha: { start: 1, end: 0 },
  };
}

// Humo/polvo que acompaña a la muerte (capa 'normal' para dar cuerpo).
export function deathSmoke(colorHex, scale = 1) {
  return {
    name: 'Polvo de muerte', texture: 'smoke', blending: 'normal',
    count: Math.round(10 * scale), burst: true, lifetime: [0.5, 1.0],
    shape: 'sphere', shapeRadius: 0.25 * scale, speed: [0.6, 1.8],
    gravity: -1.2, drag: 1.2,
    size: { start: [0.5 * scale, 0.9 * scale], end: 1.4 * scale },
    color: { start: colorHex, end: '#1a1a1a' }, alpha: { start: 0.45, end: 0 },
  };
}

// Muerte de JEFE: onda de esquirlas brillantes + destellos estelares.
export function bossDeathBurst(colorHex) {
  return {
    name: 'Muerte de jefe', texture: 'spark', blending: 'additive',
    count: 70, burst: true, lifetime: [0.5, 1.2],
    shape: 'sphere', shapeRadius: 0.5, speed: [4, 11], gravity: 3, drag: 1.0,
    size: { start: [0.3, 0.7], end: 0 },
    color: { start: '#ffffff', end: colorHex }, alpha: { start: 1, end: 0 }, spin: 200,
  };
}
export function bossDeathStars(colorHex) {
  return {
    name: 'Destellos de jefe', texture: 'star', blending: 'additive',
    count: 26, burst: true, lifetime: [0.6, 1.3],
    shape: 'ring', shapeRadius: 0.6, speed: [1.5, 4], gravity: -2, drag: 0.5,
    size: { start: [0.6, 1.2], end: 0 },
    color: { start: '#fff6e0', end: colorHex }, alpha: { start: 1, end: 0 }, spin: 120,
  };
}

// ---------------------------------------------------------------------------
// MECÁNICAS DE ENEMIGO (presets fijos por tema)
// ---------------------------------------------------------------------------

export const FX = {
  // Telaraña: hilos/polvo verdoso que cae sobre la zona atrapada.
  web: {
    name: 'Telaraña', texture: 'spark', blending: 'normal',
    count: 30, burst: true, lifetime: [0.6, 1.2],
    shape: 'disc', shapeRadius: 1.8, speed: [0.3, 1.2], gravity: 1.5, drag: 0.4,
    size: { start: [0.12, 0.3], end: 0.05 },
    color: { start: '#cfeeb0', end: '#5a7a4a' }, alpha: { start: 0.8, end: 0 }, spin: 30,
  },
  webDust: {
    name: 'Polvo de telaraña', texture: 'smoke', blending: 'normal',
    count: 12, burst: true, lifetime: [0.8, 1.6],
    shape: 'disc', shapeRadius: 1.6, speed: [0.1, 0.6], gravity: -0.3, drag: 0.6,
    size: { start: [0.6, 1.1], end: 1.6 },
    color: { start: '#9ad86a', end: '#3a5026' }, alpha: { start: 0.4, end: 0 },
  },

  // Abanico: chispas en el cono de disparo (violeta/arcano por defecto; el color
  // se inyecta desde el def del enemigo en runtime).
  fan: {
    name: 'Chispas de abanico', texture: 'spark', blending: 'additive',
    count: 14, burst: true, lifetime: [0.2, 0.5],
    shape: 'cone', shapeRadius: 0.15, coneAngle: 40, speed: [3, 7], gravity: 0, drag: 1.0,
    size: { start: [0.14, 0.3], end: 0 },
    color: { start: '#ffffff', end: '#cc66ff' }, alpha: { start: 1, end: 0 },
  },

  // Aura de escarcha: niebla fría pulsante (emisión continua corta).
  frostAura: {
    name: 'Niebla de escarcha', texture: 'smoke', blending: 'additive',
    count: 8, burst: false, duration: 0.5, rate: 16, lifetime: [0.6, 1.2],
    shape: 'disc', shapeRadius: 1.1, speed: [0.2, 0.9], gravity: -0.5, drag: 0.6,
    size: { start: [0.4, 0.8], end: 1.3 },
    color: { start: '#bff0ff', end: '#3aa7ff' }, alpha: { start: 0.35, end: 0 },
  },
  // Esquirlas de hielo que ascienden con el pulso del aura.
  frostMotes: {
    name: 'Esquirlas de hielo', texture: 'spark', blending: 'additive',
    count: 6, burst: true, lifetime: [0.5, 1.0],
    shape: 'ring', shapeRadius: 0.9, speed: [0.4, 1.2], gravity: -1.5, drag: 0.5,
    size: { start: [0.12, 0.26], end: 0 },
    color: { start: '#ffffff', end: '#3aa7ff' }, alpha: { start: 0.9, end: 0 }, spin: 120,
  },

  // Aura de exaltación (rally): destellos ascendentes cálidos sobre el aliado.
  rallyAura: {
    name: 'Destellos de exaltación', texture: 'star', blending: 'additive',
    count: 8, burst: true, lifetime: [0.4, 0.9],
    shape: 'ring', shapeRadius: 0.45, speed: [0.8, 2.2], gravity: -3.5, drag: 0.4,
    size: { start: [0.18, 0.4], end: 0 },
    color: { start: '#fff0c0', end: '#ff8844' }, alpha: { start: 1, end: 0 }, spin: 90,
  },

  // Embestida: polvo marrón al impactar (físico).
  chargeImpact: {
    name: 'Polvo de embestida', texture: 'smoke', blending: 'normal',
    count: 18, burst: true, lifetime: [0.4, 0.85],
    shape: 'cone', shapeRadius: 0.2, coneAngle: 70, speed: [2.5, 6], gravity: 3, drag: 1.2,
    size: { start: [0.4, 0.8], end: 1.3 },
    color: { start: '#d9c2a0', end: '#6b5536' }, alpha: { start: 0.7, end: 0 },
  },
  // Polvo de carga (windup): pequeñas chispas físicas que anuncian la carga.
  chargeWindup: {
    name: 'Carga inminente', texture: 'spark', blending: 'normal',
    count: 4, burst: true, lifetime: [0.3, 0.6],
    shape: 'disc', shapeRadius: 0.4, speed: [0.5, 1.5], gravity: 2, drag: 0.8,
    size: { start: [0.12, 0.24], end: 0 },
    color: { start: '#e8d4b0', end: '#7a6040' }, alpha: { start: 0.8, end: 0 },
  },

  // Invocación: vórtice oscuro (violeta/sombra) que succiona y estalla.
  summon: {
    name: 'Vórtice oscuro', texture: 'glow', blending: 'additive',
    count: 34, burst: true, lifetime: [0.5, 1.0],
    shape: 'ring', shapeRadius: 1.6, speed: [2, 5], gravity: 0, drag: 2.5,
    size: { start: [0.3, 0.6], end: 0 },
    color: { start: '#b388ff', end: '#3a1a55' }, alpha: { start: 0.9, end: 0 }, spin: 180,
  },
  summonCore: {
    name: 'Núcleo de invocación', texture: 'star', blending: 'additive',
    count: 12, burst: true, lifetime: [0.4, 0.9],
    shape: 'sphere', shapeRadius: 0.25, speed: [0.5, 2], gravity: -1, drag: 1.0,
    size: { start: [0.5, 1.0], end: 0 },
    color: { start: '#e0c0ff', end: '#5a2a88' }, alpha: { start: 1, end: 0 }, spin: 100,
  },

  // Nova de escarcha de jefe: onda radial de esquirlas de hielo.
  frostNova: {
    name: 'Nova de escarcha', texture: 'spark', blending: 'additive',
    count: 60, burst: true, lifetime: [0.4, 0.9],
    shape: 'disc', shapeRadius: 0.6, speed: [7, 13], gravity: 1.5, drag: 0.6,
    size: { start: [0.2, 0.45], end: 0 },
    color: { start: '#ffffff', end: '#3aa7ff' }, alpha: { start: 1, end: 0 }, spin: 160,
  },
  frostNovaMist: {
    name: 'Bruma de nova', texture: 'smoke', blending: 'additive',
    count: 16, burst: true, lifetime: [0.6, 1.2],
    shape: 'disc', shapeRadius: 1.2, speed: [1, 3], gravity: -0.4, drag: 0.8,
    size: { start: [0.6, 1.1], end: 2.0 },
    color: { start: '#bff0ff', end: '#2a6aa0' }, alpha: { start: 0.4, end: 0 },
  },

  // Charco de fuego: brasas que ascienden + humo (emisión por pulsos desde main).
  firePoolEmbers: {
    name: 'Brasas', texture: 'glow', blending: 'additive',
    count: 6, burst: true, lifetime: [0.5, 1.1],
    shape: 'disc', shapeRadius: 1.3, speed: [0.8, 2.2], gravity: -2.5, drag: 0.5,
    size: { start: [0.18, 0.4], end: 0 },
    color: { start: '#ffd27a', end: '#ff3a0c' }, alpha: { start: 1, end: 0 },
  },
  firePoolSmoke: {
    name: 'Humo de fuego', texture: 'smoke', blending: 'normal',
    count: 3, burst: true, lifetime: [0.8, 1.6],
    shape: 'disc', shapeRadius: 1.0, speed: [0.3, 1.0], gravity: -1.0, drag: 0.6,
    size: { start: [0.6, 1.0], end: 1.8 },
    color: { start: '#5a3520', end: '#1a1a1a' }, alpha: { start: 0.4, end: 0 },
  },
  // Estallido inicial del charco al encenderse.
  firePoolIgnite: {
    name: 'Ignición', texture: 'glow', blending: 'additive',
    count: 30, burst: true, lifetime: [0.3, 0.7],
    shape: 'disc', shapeRadius: 1.4, speed: [2, 5], gravity: -1.5, drag: 1.0,
    size: { start: [0.3, 0.6], end: 0 },
    color: { start: '#fff2a8', end: '#b3160c' }, alpha: { start: 1, end: 0 },
  },

  // Teletransporte de brujo: implosión (en el punto de salida) + aparición (en el
  // punto de llegada). Tema sombra/violeta.
  blinkOut: {
    name: 'Implosión de salto', texture: 'glow', blending: 'additive',
    count: 24, burst: true, lifetime: [0.25, 0.5],
    shape: 'sphere', shapeRadius: 0.7, speed: [-4, -1.5], gravity: 0, drag: 0.5,
    size: { start: [0.25, 0.5], end: 0 },
    color: { start: '#b388ff', end: '#3a1a55' }, alpha: { start: 1, end: 0 },
  },
  blinkIn: {
    name: 'Aparición de salto', texture: 'star', blending: 'additive',
    count: 20, burst: true, lifetime: [0.3, 0.6],
    shape: 'sphere', shapeRadius: 0.15, speed: [2, 5], gravity: -1, drag: 1.5,
    size: { start: [0.3, 0.6], end: 0 },
    color: { start: '#e0c0ff', end: '#6a2aa0' }, alpha: { start: 1, end: 0 }, spin: 120,
  },

  // Golpe pesado (slam): onda de polvo radial al impactar (físico).
  slam: {
    name: 'Onda de golpe', texture: 'smoke', blending: 'normal',
    count: 24, burst: true, lifetime: [0.4, 0.8],
    shape: 'disc', shapeRadius: 0.4, speed: [4, 8], gravity: 1.5, drag: 1.2,
    size: { start: [0.4, 0.8], end: 1.6 },
    color: { start: '#d9c2a0', end: '#6b5536' }, alpha: { start: 0.7, end: 0 },
  },
  slamSpark: {
    name: 'Esquirlas de golpe', texture: 'spark', blending: 'normal',
    count: 12, burst: true, lifetime: [0.3, 0.6],
    shape: 'cone', shapeRadius: 0.1, coneAngle: 80, speed: [3, 7], gravity: 6, drag: 0.5,
    size: { start: [0.12, 0.26], end: 0 },
    color: { start: '#e8d4b0', end: '#7a6040' }, alpha: { start: 0.9, end: 0 },
  },

  // Ataque cuerpo a cuerpo del enemigo: pequeño destello/chispa en el punto de
  // golpe sobre el jugador (rojo/cálido, breve).
  meleeHit: {
    name: 'Impacto cuerpo a cuerpo', texture: 'spark', blending: 'additive',
    count: 8, burst: true, lifetime: [0.15, 0.35],
    shape: 'sphere', shapeRadius: 0.1, speed: [1.5, 4], gravity: 2, drag: 2.0,
    size: { start: [0.16, 0.3], end: 0 },
    color: { start: '#ffe0b0', end: '#cc3322' }, alpha: { start: 1, end: 0 },
  },
};
