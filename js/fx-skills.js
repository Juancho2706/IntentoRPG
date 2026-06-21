// ============================================================
// fx-skills.js — Presets de partículas para las HABILIDADES del jugador.
// ============================================================
//
// Catálogo de efectos temáticos (por elemento) para las habilidades de las 3
// clases (Guerrero, Maga, Arquera) y para los ataques básicos. Se consumen con
// `game.emitFx(preset, pos)` / `game.psys.emit(preset, pos)` desde main.js y
// entities.js. Cada preset es PARCIAL: el motor (particles.js) rellena los
// defaults que falten al normalizar.
//
// Filosofía estética (el usuario se quejó de "espectáculo de luces"):
//  - additive CON MESURA: counts moderados, vidas cortas, fades rápidos.
//  - color por ELEMENTO para lectura clara:
//      fuego  -> naranja/rojo      hielo  -> cian/blanco
//      rayo   -> amarillo          físico -> blanco/ámbar
//      arcano -> violeta           viento -> verde claro
//  - feedback de IMPACTO nítido al golpear a un enemigo (burst corto y seco).
//
// No importa THREE ni el juego: solo objetos de datos serializables.

// ------------------------------------------------------------
// GUERRERO (físico — blanco/ámbar; viento para gritos/cargas)
// ------------------------------------------------------------

// Golpe Brutal — impacto físico contundente: chispas blancas en abanico + polvo
// + onda de choque + destello de núcleo.
export const brutalStrike = {
  name: 'Golpe Brutal', texture: 'spark', blending: 'additive',
  count: 64, burst: true, lifetime: [0.2, 0.5],
  shape: 'cone', shapeRadius: 0.14, coneAngle: 90, speed: [6, 14], gravity: 6, drag: 0.5,
  size: { start: [0.22, 0.5], end: 0.0 },
  color: { start: '#ffffff', end: '#ffd58a' }, alpha: { start: 1, end: 0 },
};
export const brutalStrikeDust = {
  name: 'Golpe Brutal polvo', texture: 'smoke', blending: 'normal',
  count: 22, burst: true, lifetime: [0.45, 0.9],
  shape: 'disc', shapeRadius: 0.5, speed: [0.8, 2.2], gravity: -0.3, drag: 0.6,
  size: { start: [0.5, 1.0], end: 1.7 },
  color: { start: '#cfc4a8', end: '#8a8268' }, alpha: { start: 0.45, end: 0 }, spin: 36,
};
export const brutalStrikeWave = {
  name: 'Golpe Brutal onda', texture: 'disc', blending: 'additive',
  count: 1, burst: true, lifetime: [0.26, 0.34],
  shape: 'point', shapeRadius: 0.01, speed: [0, 0], gravity: 0, drag: 0,
  size: { start: [0.5, 0.6], end: 4.2 },
  color: { start: '#fff4d6', end: '#e0922a' }, alpha: { start: 0.85, end: 0 },
};

// Grito de Guerra — aura/onda de buff que sube desde el jugador (ámbar marcial),
// con doble anillo y motas estelares ascendentes.
export const warCry = {
  name: 'Grito de Guerra', texture: 'disc', blending: 'additive',
  count: 56, burst: true, lifetime: [0.5, 1.0],
  shape: 'ring', shapeRadius: 0.7, speed: [4.5, 7.5], gravity: -1.5, drag: 0.7,
  size: { start: [0.3, 0.6], end: 0.0 },
  color: { start: '#fff0c0', end: '#e08a2a' }, alpha: { start: 0.95, end: 0 }, spin: 70,
};
export const warCryRing = {
  name: 'Grito de Guerra anillo', texture: 'disc', blending: 'additive',
  count: 1, burst: true, lifetime: [0.4, 0.5],
  shape: 'point', shapeRadius: 0.01, speed: [0, 0], gravity: 0, drag: 0,
  size: { start: [0.6, 0.7], end: 5.0 },
  color: { start: '#ffe7a8', end: '#c8741e' }, alpha: { start: 0.8, end: 0 },
};
export const warCryMotes = {
  name: 'Grito de Guerra motas', texture: 'star', blending: 'additive',
  count: 18, burst: true, lifetime: [0.6, 1.2],
  shape: 'ring', shapeRadius: 0.5, speed: [1, 2.5], gravity: -3.5, drag: 0.4,
  size: { start: [0.3, 0.6], end: 0.0 },
  color: { start: '#fff6d6', end: '#f0a23a' }, alpha: { start: 1, end: 0 }, spin: 120,
};

// Torbellino — doble anillo de cortes girando + brasas/chispas alrededor.
export const whirlwind = {
  name: 'Torbellino', texture: 'spark', blending: 'additive',
  count: 80, burst: true, lifetime: [0.3, 0.6],
  shape: 'ring', shapeRadius: 1.6, speed: [3, 7], gravity: 0, drag: 0.4,
  size: { start: [0.24, 0.55], end: 0.0 },
  color: { start: '#ffffff', end: '#dfe6f0' }, alpha: { start: 0.95, end: 0 }, spin: 320,
};
export const whirlwindInner = {
  name: 'Torbellino interior', texture: 'spark', blending: 'additive',
  count: 40, burst: true, lifetime: [0.25, 0.5],
  shape: 'ring', shapeRadius: 0.9, speed: [2, 5], gravity: 0, drag: 0.4,
  size: { start: [0.18, 0.4], end: 0.0 },
  color: { start: '#fff4d6', end: '#ffc878' }, alpha: { start: 0.9, end: 0 }, spin: -280,
};

// Embestida — estela de carga (viento marcial) y impacto al llegar.
export const chargeTrail = {
  name: 'Embestida estela', texture: 'smoke', blending: 'normal',
  count: 28, burst: true, lifetime: [0.3, 0.65],
  shape: 'sphere', shapeRadius: 0.4, speed: [0.6, 2.2], gravity: -0.2, drag: 0.6,
  size: { start: [0.4, 0.75], end: 1.4 },
  color: { start: '#e8e2cf', end: '#9a9078' }, alpha: { start: 0.45, end: 0 },
};
export const chargeImpact = {
  name: 'Embestida impacto', texture: 'spark', blending: 'additive',
  count: 60, burst: true, lifetime: [0.22, 0.5],
  shape: 'cone', shapeRadius: 0.18, coneAngle: 100, speed: [7, 14], gravity: 5, drag: 0.5,
  size: { start: [0.24, 0.55], end: 0.0 },
  color: { start: '#ffffff', end: '#ffcf7a' }, alpha: { start: 1, end: 0 },
};
export const chargeImpactWave = {
  name: 'Embestida onda', texture: 'disc', blending: 'additive',
  count: 1, burst: true, lifetime: [0.28, 0.36],
  shape: 'point', shapeRadius: 0.01, speed: [0, 0], gravity: 0, drag: 0,
  size: { start: [0.5, 0.6], end: 4.6 },
  color: { start: '#fff0cf', end: '#e0922a' }, alpha: { start: 0.85, end: 0 },
};

// Terremoto — grietas/polvo levantándose del suelo en el área + rocas + onda.
export const quakeDust = {
  name: 'Terremoto polvo', texture: 'smoke', blending: 'normal',
  count: 56, burst: true, lifetime: [0.7, 1.4],
  shape: 'disc', shapeRadius: 1.7, speed: [1.2, 3.6], gravity: -1, drag: 0.5,
  size: { start: [0.7, 1.4], end: 2.6 },
  color: { start: '#b8a888', end: '#6e6450' }, alpha: { start: 0.55, end: 0 }, spin: 28,
};
export const quakeRocks = {
  name: 'Terremoto rocas', texture: 'disc', blending: 'normal',
  count: 44, burst: true, lifetime: [0.5, 1.0],
  shape: 'disc', shapeRadius: 1.1, speed: [5, 10], gravity: 16, drag: 0.1,
  size: { start: [0.16, 0.4], end: 0.05 },
  color: { start: '#9a8c6e', end: '#574e3c' }, alpha: { start: 1, end: 0.2 },
};
export const quakeWave = {
  name: 'Terremoto onda', texture: 'disc', blending: 'additive',
  count: 1, burst: true, lifetime: [0.45, 0.55],
  shape: 'point', shapeRadius: 0.01, speed: [0, 0], gravity: 0, drag: 0,
  size: { start: [0.8, 0.9], end: 7.0 },
  color: { start: '#e8d2a0', end: '#7a5e30' }, alpha: { start: 0.75, end: 0 },
};

// ------------------------------------------------------------
// MAGA
// ------------------------------------------------------------

// Bola de Fuego — estela ígnea del proyectil + explosión + onda + brasas + humo.
export const fireballTrail = {
  name: 'Bola de Fuego estela', texture: 'glow', blending: 'additive',
  count: 36, burst: true, lifetime: [0.22, 0.5],
  shape: 'sphere', shapeRadius: 0.22, speed: [0.4, 1.6], gravity: -0.8, drag: 0.5,
  size: { start: [0.3, 0.6], end: 0.0 },
  color: { start: '#fffbe0', end: '#d83a0a' }, alpha: { start: 0.95, end: 0 },
};
export const fireballBlast = {
  name: 'Bola de Fuego explosión', texture: 'glow', blending: 'additive',
  count: 110, burst: true, lifetime: [0.32, 0.8],
  shape: 'sphere', shapeRadius: 0.35, speed: [4, 10], gravity: -1.5, drag: 0.6,
  size: { start: [0.5, 1.2], end: 0.0 },
  color: { start: '#fffbe0', end: '#b3160c' }, alpha: { start: 1, end: 0 },
};
export const fireballWave = {
  name: 'Bola de Fuego onda', texture: 'disc', blending: 'additive',
  count: 1, burst: true, lifetime: [0.3, 0.4],
  shape: 'point', shapeRadius: 0.01, speed: [0, 0], gravity: 0, drag: 0,
  size: { start: [0.6, 0.7], end: 5.0 },
  color: { start: '#ffd98a', end: '#c8300a' }, alpha: { start: 0.9, end: 0 },
};
export const fireballSmoke = {
  name: 'Bola de Fuego humo', texture: 'smoke', blending: 'normal',
  count: 16, burst: true, lifetime: [0.6, 1.3],
  shape: 'sphere', shapeRadius: 0.35, speed: [0.5, 1.8], gravity: -0.8, drag: 0.6,
  size: { start: [0.6, 1.1], end: 2.0 },
  color: { start: '#4a2c1c', end: '#1a1410' }, alpha: { start: 0.5, end: 0 }, spin: 20,
};

// Nova de Hielo — onda gélida + esquirlas que saltan + bruma.
export const frostNova = {
  name: 'Nova de Hielo onda', texture: 'disc', blending: 'additive',
  count: 1, burst: true, lifetime: [0.4, 0.5],
  shape: 'point', shapeRadius: 0.01, speed: [0, 0], gravity: 0, drag: 0,
  size: { start: [0.6, 0.7], end: 5.5 },
  color: { start: '#eaf7ff', end: '#2f8ae0' }, alpha: { start: 0.95, end: 0 },
};
export const frostShards = {
  name: 'Nova de Hielo esquirlas', texture: 'spark', blending: 'additive',
  count: 90, burst: true, lifetime: [0.45, 0.95],
  shape: 'disc', shapeRadius: 0.7, speed: [6, 12], gravity: 4, drag: 0.3,
  size: { start: [0.2, 0.5], end: 0.0 },
  color: { start: '#ffffff', end: '#5cc0ff' }, alpha: { start: 1, end: 0 }, spin: 240,
};
export const frostMist = {
  name: 'Nova de Hielo bruma', texture: 'smoke', blending: 'additive',
  count: 22, burst: true, lifetime: [0.6, 1.2],
  shape: 'disc', shapeRadius: 1.2, speed: [1, 3], gravity: -0.3, drag: 0.7,
  size: { start: [0.6, 1.2], end: 2.4 },
  color: { start: '#cdeeff', end: '#2a6aa0' }, alpha: { start: 0.4, end: 0 },
};

// Rayo — chispas amarillas perforantes (estela e impacto) + flash de núcleo.
export const boltTrail = {
  name: 'Rayo estela', texture: 'spark', blending: 'additive',
  count: 28, burst: true, lifetime: [0.1, 0.3],
  shape: 'point', shapeRadius: 0.12, speed: [1, 4], gravity: 0, drag: 0.8,
  size: { start: [0.18, 0.4], end: 0.0 },
  color: { start: '#ffffff', end: '#ffe24d' }, alpha: { start: 1, end: 0 },
};
export const boltSpark = {
  name: 'Rayo impacto', texture: 'spark', blending: 'additive',
  count: 70, burst: true, lifetime: [0.12, 0.4],
  shape: 'cone', shapeRadius: 0.1, coneAngle: 70, speed: [9, 18], gravity: 0, drag: 0.8,
  size: { start: [0.18, 0.45], end: 0.0 },
  color: { start: '#ffffff', end: '#ffd11a' }, alpha: { start: 1, end: 0 },
};
export const boltFlash = {
  name: 'Rayo destello', texture: 'glow', blending: 'additive',
  count: 1, burst: true, lifetime: [0.1, 0.16],
  shape: 'point', shapeRadius: 0.01, speed: [0, 0], gravity: 0, drag: 0,
  size: { start: [1.8, 2.2], end: 0.0 },
  color: { start: '#ffffff', end: '#fff0a0' }, alpha: { start: 1, end: 0 },
};

// Armadura Helada — escarcha que envuelve al jugador (buff defensivo) + cristales.
export const frostArmor = {
  name: 'Armadura Helada', texture: 'star', blending: 'additive',
  count: 50, burst: true, lifetime: [0.55, 1.2],
  shape: 'sphere', shapeRadius: 0.6, speed: [0.4, 2], gravity: -0.6, drag: 0.5,
  size: { start: [0.35, 0.7], end: 0.0 },
  color: { start: '#eaf7ff', end: '#5cb6ff' }, alpha: { start: 0.9, end: 0 }, spin: 100,
};
export const frostArmorRing = {
  name: 'Armadura Helada anillo', texture: 'spark', blending: 'additive',
  count: 30, burst: true, lifetime: [0.5, 1.0],
  shape: 'ring', shapeRadius: 0.7, speed: [0.6, 1.8], gravity: -1, drag: 0.5,
  size: { start: [0.16, 0.36], end: 0.0 },
  color: { start: '#ffffff', end: '#7accff' }, alpha: { start: 0.95, end: 0 }, spin: 160,
};

// Meteoro — caída ardiente + impacto al estrellarse + onda + brasas.
export const meteorFall = {
  name: 'Meteoro caída', texture: 'glow', blending: 'additive',
  count: 44, burst: true, lifetime: [0.25, 0.6],
  shape: 'cone', shapeRadius: 0.24, coneAngle: 20, speed: [2, 6], gravity: -2, drag: 0.3,
  size: { start: [0.5, 1.0], end: 0.0 },
  color: { start: '#fffbe0', end: '#ff5a14' }, alpha: { start: 1, end: 0 },
};
export const meteorImpact = {
  name: 'Meteoro impacto', texture: 'glow', blending: 'additive',
  count: 130, burst: true, lifetime: [0.4, 0.95],
  shape: 'disc', shapeRadius: 0.8, speed: [5, 12], gravity: -1, drag: 0.5,
  size: { start: [0.6, 1.3], end: 0.0 },
  color: { start: '#fffbe0', end: '#a01408' }, alpha: { start: 1, end: 0 },
};
export const meteorWave = {
  name: 'Meteoro onda', texture: 'disc', blending: 'additive',
  count: 1, burst: true, lifetime: [0.36, 0.46],
  shape: 'point', shapeRadius: 0.01, speed: [0, 0], gravity: 0, drag: 0,
  size: { start: [0.8, 0.9], end: 7.5 },
  color: { start: '#ffd98a', end: '#b32a0a' }, alpha: { start: 0.9, end: 0 },
};
export const meteorEmbers = {
  name: 'Meteoro brasas', texture: 'spark', blending: 'additive',
  count: 40, burst: true, lifetime: [0.6, 1.5],
  shape: 'disc', shapeRadius: 0.7, speed: [3, 8], gravity: 7, drag: 0.2,
  size: { start: [0.14, 0.34], end: 0.0 },
  color: { start: '#ffd27a', end: '#ff2e0c' }, alpha: { start: 1, end: 0 },
};
export const meteorSmoke = {
  name: 'Meteoro humo', texture: 'smoke', blending: 'normal',
  count: 26, burst: true, lifetime: [0.7, 1.5],
  shape: 'disc', shapeRadius: 0.9, speed: [0.8, 2.4], gravity: -0.6, drag: 0.6,
  size: { start: [0.7, 1.3], end: 2.4 },
  color: { start: '#5a4a40', end: '#1a1410' }, alpha: { start: 0.55, end: 0 }, spin: 22,
};

// ------------------------------------------------------------
// ARQUERA (físico/viento — verde claro y ámbar)
// ------------------------------------------------------------

// Disparo Certero — flecha (estela tenue) + chispa al impactar.
export const preciseTrail = {
  name: 'Disparo Certero estela', texture: 'spark', blending: 'additive',
  count: 16, burst: true, lifetime: [0.12, 0.32],
  shape: 'point', shapeRadius: 0.06, speed: [0.5, 1.8], gravity: 0, drag: 0.7,
  size: { start: [0.12, 0.28], end: 0.0 },
  color: { start: '#ffffff', end: '#d6ff8a' }, alpha: { start: 0.9, end: 0 },
};
export const arrowSpark = {
  name: 'Flecha impacto', texture: 'spark', blending: 'additive',
  count: 46, burst: true, lifetime: [0.15, 0.45],
  shape: 'cone', shapeRadius: 0.12, coneAngle: 80, speed: [5, 11], gravity: 5, drag: 0.4,
  size: { start: [0.16, 0.4], end: 0.0 },
  color: { start: '#ffffff', end: '#c6f078' }, alpha: { start: 1, end: 0 },
};

// Flecha Múltiple — chispas en abanico al disparar.
export const multiShotBurst = {
  name: 'Flecha Múltiple', texture: 'spark', blending: 'additive',
  count: 40, burst: true, lifetime: [0.16, 0.4],
  shape: 'cone', shapeRadius: 0.14, coneAngle: 80, speed: [4, 9], gravity: 1, drag: 0.5,
  size: { start: [0.14, 0.34], end: 0.0 },
  color: { start: '#eaffc6', end: '#a8d860' }, alpha: { start: 0.95, end: 0 },
};

// Flecha Perforante — estela perforante densa + chispa de penetración.
export const piercingTrail = {
  name: 'Flecha Perforante estela', texture: 'spark', blending: 'additive',
  count: 26, burst: true, lifetime: [0.16, 0.4],
  shape: 'point', shapeRadius: 0.08, speed: [0.6, 2.2], gravity: 0, drag: 0.6,
  size: { start: [0.16, 0.36], end: 0.0 },
  color: { start: '#ffffff', end: '#f0ffb0' }, alpha: { start: 1, end: 0 },
};

// Agilidad — ráfaga de viento de buff (verde claro) en espiral + motas estelares.
export const agility = {
  name: 'Agilidad', texture: 'glow', blending: 'additive',
  count: 48, burst: true, lifetime: [0.45, 1.0],
  shape: 'ring', shapeRadius: 0.6, speed: [3, 6], gravity: -1.2, drag: 0.5,
  size: { start: [0.22, 0.5], end: 0.0 },
  color: { start: '#eaffd6', end: '#6fc24a' }, alpha: { start: 0.85, end: 0 }, spin: 200,
};
export const agilityMotes = {
  name: 'Agilidad motas', texture: 'star', blending: 'additive',
  count: 16, burst: true, lifetime: [0.5, 1.1],
  shape: 'ring', shapeRadius: 0.45, speed: [1, 2.6], gravity: -2.5, drag: 0.4,
  size: { start: [0.25, 0.5], end: 0.0 },
  color: { start: '#f0ffd6', end: '#8fe066' }, alpha: { start: 1, end: 0 }, spin: 140,
};

// Lluvia de Flechas — impactos repartidos en la zona objetivo.
export const arrowRain = {
  name: 'Lluvia de Flechas', texture: 'spark', blending: 'additive',
  count: 70, burst: true, lifetime: [0.2, 0.55],
  shape: 'disc', shapeRadius: 1.7, speed: [2, 6], gravity: 10, drag: 0.3,
  size: { start: [0.16, 0.38], end: 0.0 },
  color: { start: '#ffffff', end: '#aaff8a' }, alpha: { start: 0.95, end: 0 },
};
export const arrowRainDust = {
  name: 'Lluvia de Flechas polvo', texture: 'smoke', blending: 'normal',
  count: 24, burst: true, lifetime: [0.4, 0.9],
  shape: 'disc', shapeRadius: 1.4, speed: [0.5, 1.8], gravity: -0.3, drag: 0.6,
  size: { start: [0.4, 0.85], end: 1.6 },
  color: { start: '#c8d8b0', end: '#7a8a60' }, alpha: { start: 0.4, end: 0 },
};

// ------------------------------------------------------------
// ATAQUES BÁSICOS
// ------------------------------------------------------------

// Guerrero — cleave: arco de chispas blancas/ámbar.
export const basicCleave = {
  name: 'Tajo básico', texture: 'spark', blending: 'additive',
  count: 30, burst: true, lifetime: [0.15, 0.36],
  shape: 'cone', shapeRadius: 0.12, coneAngle: 100, speed: [4, 9], gravity: 4, drag: 0.5,
  size: { start: [0.18, 0.4], end: 0.0 },
  color: { start: '#ffffff', end: '#ffd58a' }, alpha: { start: 1, end: 0 },
};

// Maga — bolt: motas arcanas en la mano al lanzar.
export const basicBolt = {
  name: 'Descarga arcana', texture: 'glow', blending: 'additive',
  count: 26, burst: true, lifetime: [0.18, 0.45],
  shape: 'sphere', shapeRadius: 0.2, speed: [1, 3.5], gravity: 0, drag: 0.6,
  size: { start: [0.2, 0.42], end: 0.0 },
  color: { start: '#f4e0ff', end: '#7a3cff' }, alpha: { start: 0.95, end: 0 },
};

// Arquera — arrow: pequeño soplo de viento al soltar la cuerda.
export const basicArrow = {
  name: 'Disparo básico', texture: 'spark', blending: 'additive',
  count: 18, burst: true, lifetime: [0.12, 0.3],
  shape: 'cone', shapeRadius: 0.1, coneAngle: 44, speed: [2.5, 6], gravity: 0, drag: 0.6,
  size: { start: [0.12, 0.28], end: 0.0 },
  color: { start: '#ffffff', end: '#d6ff8a' }, alpha: { start: 0.9, end: 0 },
};

// Impacto genérico de golpe (feedback de IMPACTO al golpear enemigo): chispas +
// destello de núcleo para que cada golpe "chasquee".
export const meleeHit = {
  name: 'Impacto cuerpo a cuerpo', texture: 'spark', blending: 'additive',
  count: 34, burst: true, lifetime: [0.12, 0.32],
  shape: 'sphere', shapeRadius: 0.18, speed: [4, 9], gravity: 3, drag: 0.5,
  size: { start: [0.18, 0.4], end: 0.0 },
  color: { start: '#ffffff', end: '#ffe0b0' }, alpha: { start: 1, end: 0 },
};
export const meleeHitFlash = {
  name: 'Impacto destello', texture: 'glow', blending: 'additive',
  count: 1, burst: true, lifetime: [0.08, 0.14],
  shape: 'point', shapeRadius: 0.01, speed: [0, 0], gravity: 0, drag: 0,
  size: { start: [1.0, 1.3], end: 0.0 },
  color: { start: '#ffffff', end: '#ffdca0' }, alpha: { start: 1, end: 0 },
};

// Destello de CRÍTICO genérico (golpe crítico): estrella dorada + chispas
// radiales + flash blanco. El color se puede teñir por elemento desde main.
export const critStar = {
  name: 'Crítico estrella', texture: 'star', blending: 'additive',
  count: 24, burst: true, lifetime: [0.25, 0.55],
  shape: 'sphere', shapeRadius: 0.18, speed: [6, 13], gravity: 1, drag: 0.7,
  size: { start: [0.5, 1.1], end: 0.0 },
  color: { start: '#ffffff', end: '#ffae00' }, alpha: { start: 1, end: 0 }, spin: 220,
};
export const critFlash = {
  name: 'Crítico destello', texture: 'glow', blending: 'additive',
  count: 1, burst: true, lifetime: [0.1, 0.18],
  shape: 'point', shapeRadius: 0.01, speed: [0, 0], gravity: 0, drag: 0,
  size: { start: [1.6, 2.0], end: 0.0 },
  color: { start: '#ffffff', end: '#ffcf4d' }, alpha: { start: 1, end: 0 },
};
export const critRing = {
  name: 'Crítico anillo', texture: 'disc', blending: 'additive',
  count: 1, burst: true, lifetime: [0.22, 0.3],
  shape: 'point', shapeRadius: 0.01, speed: [0, 0], gravity: 0, drag: 0,
  size: { start: [0.4, 0.5], end: 3.0 },
  color: { start: '#fff0c0', end: '#ff9a1e' }, alpha: { start: 0.85, end: 0 },
};

// ------------------------------------------------------------
// Tabla por id de habilidad (para acceso cómodo desde main.js).
// Cada entrada describe los presets que usa la habilidad y el color de elemento.
// ------------------------------------------------------------
export const SKILL_FX = {
  // Guerrero
  golpe_brutal:   { impact: brutalStrike, extra: brutalStrikeWave, color: 0xffd58a },
  grito_guerra:   { aura: warCry, color: 0xe08a2a },
  torbellino:     { aura: whirlwind, extra: whirlwindInner, color: 0xcfd6e0 },
  embestida:      { trail: chargeTrail, impact: chargeImpact, color: 0xffcf7a },
  terremoto:      { aura: quakeDust, extra: quakeRocks, color: 0x9a8c6e },
  // Maga
  bola_fuego:     { trail: fireballTrail, impact: fireballBlast, color: 0xff6622 },
  nova_hielo:     { aura: frostNova, extra: frostShards, color: 0x66ccff },
  rayo:           { trail: boltTrail, impact: boltSpark, color: 0xffee66 },
  armadura_helada:{ aura: frostArmor, color: 0x66ccff },
  meteoro:        { trail: meteorFall, impact: meteorImpact, aura: meteorWave, extra: meteorEmbers, color: 0xff4400 },
  // Arquera
  disparo_certero:{ trail: preciseTrail, impact: arrowSpark, color: 0xddffaa },
  flecha_multiple:{ aura: multiShotBurst, color: 0xccddaa },
  flecha_perforante:{ trail: piercingTrail, impact: arrowSpark, color: 0xffffcc },
  agilidad:       { aura: agility, color: 0x9af06a },
  lluvia_flechas: { aura: arrowRain, extra: arrowRainDust, color: 0xaaffaa },
};

export const SKILL_FX_PRESETS = {
  brutalStrike, brutalStrikeDust, brutalStrikeWave,
  warCry, warCryRing, warCryMotes,
  whirlwind, whirlwindInner,
  chargeTrail, chargeImpact, chargeImpactWave,
  quakeDust, quakeRocks, quakeWave,
  fireballTrail, fireballBlast, fireballWave, fireballSmoke,
  frostNova, frostShards, frostMist,
  boltTrail, boltSpark, boltFlash,
  frostArmor, frostArmorRing,
  meteorFall, meteorImpact, meteorWave, meteorEmbers, meteorSmoke,
  preciseTrail, arrowSpark, multiShotBurst, piercingTrail,
  agility, agilityMotes, arrowRain, arrowRainDust,
  basicCleave, basicBolt, basicArrow,
  meleeHit, meleeHitFlash,
  critStar, critFlash, critRing,
};
