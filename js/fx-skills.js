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

// Golpe Brutal — impacto físico contundente: chispas blancas en abanico + polvo.
export const brutalStrike = {
  name: 'Golpe Brutal', texture: 'spark', blending: 'additive',
  count: 26, burst: true, lifetime: [0.18, 0.4],
  shape: 'cone', shapeRadius: 0.12, coneAngle: 80, speed: [4, 9], gravity: 6, drag: 0.5,
  size: { start: [0.18, 0.4], end: 0.0 },
  color: { start: '#ffffff', end: '#ffd58a' }, alpha: { start: 1, end: 0 },
};
export const brutalStrikeDust = {
  name: 'Golpe Brutal polvo', texture: 'smoke', blending: 'normal',
  count: 10, burst: true, lifetime: [0.4, 0.8],
  shape: 'disc', shapeRadius: 0.4, speed: [0.6, 1.6], gravity: -0.3, drag: 0.6,
  size: { start: [0.4, 0.8], end: 1.3 },
  color: { start: '#cfc4a8', end: '#8a8268' }, alpha: { start: 0.4, end: 0 }, spin: 30,
};

// Grito de Guerra — aura/onda de buff que sube desde el jugador (ámbar marcial).
export const warCry = {
  name: 'Grito de Guerra', texture: 'disc', blending: 'additive',
  count: 30, burst: true, lifetime: [0.45, 0.85],
  shape: 'ring', shapeRadius: 0.7, speed: [3.5, 6], gravity: -1.5, drag: 0.7,
  size: { start: [0.25, 0.5], end: 0.0 },
  color: { start: '#ffe7a8', end: '#e08a2a' }, alpha: { start: 0.9, end: 0 }, spin: 60,
};

// Torbellino — anillo de cortes girando alrededor del jugador.
export const whirlwind = {
  name: 'Torbellino', texture: 'spark', blending: 'additive',
  count: 34, burst: true, lifetime: [0.25, 0.5],
  shape: 'ring', shapeRadius: 1.6, speed: [2, 5], gravity: 0, drag: 0.4,
  size: { start: [0.2, 0.45], end: 0.0 },
  color: { start: '#ffffff', end: '#cfd6e0' }, alpha: { start: 0.95, end: 0 }, spin: 240,
};

// Embestida — estela de carga (viento marcial) y impacto al llegar.
export const chargeTrail = {
  name: 'Embestida estela', texture: 'smoke', blending: 'normal',
  count: 16, burst: true, lifetime: [0.3, 0.6],
  shape: 'sphere', shapeRadius: 0.35, speed: [0.5, 1.8], gravity: -0.2, drag: 0.6,
  size: { start: [0.35, 0.65], end: 1.1 },
  color: { start: '#e8e2cf', end: '#9a9078' }, alpha: { start: 0.4, end: 0 },
};
export const chargeImpact = {
  name: 'Embestida impacto', texture: 'spark', blending: 'additive',
  count: 30, burst: true, lifetime: [0.2, 0.45],
  shape: 'cone', shapeRadius: 0.15, coneAngle: 90, speed: [5, 10], gravity: 5, drag: 0.5,
  size: { start: [0.2, 0.45], end: 0.0 },
  color: { start: '#ffffff', end: '#ffcf7a' }, alpha: { start: 1, end: 0 },
};

// Terremoto — grietas/polvo levantándose del suelo en el área.
export const quakeDust = {
  name: 'Terremoto polvo', texture: 'smoke', blending: 'normal',
  count: 28, burst: true, lifetime: [0.6, 1.2],
  shape: 'disc', shapeRadius: 1.6, speed: [1, 3], gravity: -1, drag: 0.5,
  size: { start: [0.6, 1.2], end: 2.0 },
  color: { start: '#b8a888', end: '#6e6450' }, alpha: { start: 0.5, end: 0 }, spin: 25,
};
export const quakeRocks = {
  name: 'Terremoto rocas', texture: 'disc', blending: 'normal',
  count: 22, burst: true, lifetime: [0.5, 0.9],
  shape: 'disc', shapeRadius: 1.0, speed: [4, 8], gravity: 14, drag: 0.1,
  size: { start: [0.15, 0.35], end: 0.05 },
  color: { start: '#9a8c6e', end: '#574e3c' }, alpha: { start: 1, end: 0.2 },
};

// ------------------------------------------------------------
// MAGA
// ------------------------------------------------------------

// Bola de Fuego — estela ígnea del proyectil + explosión al impactar.
export const fireballTrail = {
  name: 'Bola de Fuego estela', texture: 'glow', blending: 'additive',
  count: 18, burst: true, lifetime: [0.2, 0.45],
  shape: 'sphere', shapeRadius: 0.18, speed: [0.4, 1.4], gravity: -0.8, drag: 0.5,
  size: { start: [0.25, 0.5], end: 0.0 },
  color: { start: '#fff0b0', end: '#d83a0a' }, alpha: { start: 0.95, end: 0 },
};
export const fireballBlast = {
  name: 'Bola de Fuego explosión', texture: 'glow', blending: 'additive',
  count: 44, burst: true, lifetime: [0.3, 0.7],
  shape: 'sphere', shapeRadius: 0.3, speed: [3, 7], gravity: -1.5, drag: 0.6,
  size: { start: [0.4, 0.9], end: 0.0 },
  color: { start: '#fff2a8', end: '#b3160c' }, alpha: { start: 1, end: 0 },
};

// Nova de Hielo — onda gélida + esquirlas que saltan.
export const frostNova = {
  name: 'Nova de Hielo onda', texture: 'disc', blending: 'additive',
  count: 30, burst: true, lifetime: [0.35, 0.7],
  shape: 'ring', shapeRadius: 1.2, speed: [4, 8], gravity: 0, drag: 0.6,
  size: { start: [0.3, 0.6], end: 0.0 },
  color: { start: '#eaf7ff', end: '#3aa7ff' }, alpha: { start: 0.95, end: 0 }, spin: 40,
};
export const frostShards = {
  name: 'Nova de Hielo esquirlas', texture: 'spark', blending: 'additive',
  count: 36, burst: true, lifetime: [0.4, 0.85],
  shape: 'disc', shapeRadius: 0.6, speed: [5, 9], gravity: 4, drag: 0.3,
  size: { start: [0.18, 0.4], end: 0.0 },
  color: { start: '#ffffff', end: '#5cc0ff' }, alpha: { start: 1, end: 0 }, spin: 200,
};

// Rayo — chispas amarillas perforantes (estela e impacto del proyectil).
export const boltTrail = {
  name: 'Rayo estela', texture: 'spark', blending: 'additive',
  count: 14, burst: true, lifetime: [0.1, 0.28],
  shape: 'point', shapeRadius: 0.1, speed: [1, 3], gravity: 0, drag: 0.8,
  size: { start: [0.15, 0.32], end: 0.0 },
  color: { start: '#ffffff', end: '#ffe24d' }, alpha: { start: 1, end: 0 },
};
export const boltSpark = {
  name: 'Rayo impacto', texture: 'spark', blending: 'additive',
  count: 30, burst: true, lifetime: [0.12, 0.35],
  shape: 'cone', shapeRadius: 0.1, coneAngle: 60, speed: [7, 13], gravity: 0, drag: 0.8,
  size: { start: [0.15, 0.38], end: 0.0 },
  color: { start: '#ffffff', end: '#ffd11a' }, alpha: { start: 1, end: 0 },
};

// Armadura Helada — escarcha que envuelve al jugador (buff defensivo).
export const frostArmor = {
  name: 'Armadura Helada', texture: 'star', blending: 'additive',
  count: 26, burst: true, lifetime: [0.5, 1.0],
  shape: 'sphere', shapeRadius: 0.55, speed: [0.4, 1.6], gravity: -0.6, drag: 0.5,
  size: { start: [0.3, 0.6], end: 0.0 },
  color: { start: '#eaf7ff', end: '#5cb6ff' }, alpha: { start: 0.9, end: 0 }, spin: 80,
};

// Meteoro — caída ardiente + impacto al estrellarse.
export const meteorFall = {
  name: 'Meteoro caída', texture: 'glow', blending: 'additive',
  count: 22, burst: true, lifetime: [0.25, 0.5],
  shape: 'cone', shapeRadius: 0.2, coneAngle: 18, speed: [2, 5], gravity: -2, drag: 0.3,
  size: { start: [0.4, 0.8], end: 0.0 },
  color: { start: '#fff0a0', end: '#ff5a14' }, alpha: { start: 1, end: 0 },
};
export const meteorImpact = {
  name: 'Meteoro impacto', texture: 'glow', blending: 'additive',
  count: 52, burst: true, lifetime: [0.35, 0.8],
  shape: 'disc', shapeRadius: 0.7, speed: [4, 9], gravity: -1, drag: 0.5,
  size: { start: [0.5, 1.0], end: 0.0 },
  color: { start: '#fff2a8', end: '#a01408' }, alpha: { start: 1, end: 0 },
};
export const meteorSmoke = {
  name: 'Meteoro humo', texture: 'smoke', blending: 'normal',
  count: 14, burst: true, lifetime: [0.6, 1.2],
  shape: 'disc', shapeRadius: 0.8, speed: [0.6, 2], gravity: -0.6, drag: 0.6,
  size: { start: [0.6, 1.1], end: 1.8 },
  color: { start: '#5a4a40', end: '#2a2420' }, alpha: { start: 0.5, end: 0 }, spin: 20,
};

// ------------------------------------------------------------
// ARQUERA (físico/viento — verde claro y ámbar)
// ------------------------------------------------------------

// Disparo Certero — flecha (estela tenue) + chispa al impactar.
export const preciseTrail = {
  name: 'Disparo Certero estela', texture: 'spark', blending: 'additive',
  count: 8, burst: true, lifetime: [0.12, 0.3],
  shape: 'point', shapeRadius: 0.06, speed: [0.5, 1.5], gravity: 0, drag: 0.7,
  size: { start: [0.1, 0.22], end: 0.0 },
  color: { start: '#ffffff', end: '#d6ff8a' }, alpha: { start: 0.9, end: 0 },
};
export const arrowSpark = {
  name: 'Flecha impacto', texture: 'spark', blending: 'additive',
  count: 22, burst: true, lifetime: [0.15, 0.4],
  shape: 'cone', shapeRadius: 0.1, coneAngle: 70, speed: [4, 8], gravity: 5, drag: 0.4,
  size: { start: [0.14, 0.32], end: 0.0 },
  color: { start: '#ffffff', end: '#c6f078' }, alpha: { start: 1, end: 0 },
};

// Flecha Múltiple — chispas en abanico al disparar.
export const multiShotBurst = {
  name: 'Flecha Múltiple', texture: 'spark', blending: 'additive',
  count: 18, burst: true, lifetime: [0.15, 0.35],
  shape: 'cone', shapeRadius: 0.12, coneAngle: 70, speed: [3, 7], gravity: 1, drag: 0.5,
  size: { start: [0.12, 0.28], end: 0.0 },
  color: { start: '#eaffc6', end: '#a8d860' }, alpha: { start: 0.95, end: 0 },
};

// Flecha Perforante — estela perforante densa + chispa de penetración.
export const piercingTrail = {
  name: 'Flecha Perforante estela', texture: 'spark', blending: 'additive',
  count: 12, burst: true, lifetime: [0.15, 0.35],
  shape: 'point', shapeRadius: 0.08, speed: [0.6, 1.8], gravity: 0, drag: 0.6,
  size: { start: [0.14, 0.3], end: 0.0 },
  color: { start: '#ffffff', end: '#f0ffb0' }, alpha: { start: 1, end: 0 },
};

// Agilidad — ráfaga de viento de buff (verde claro) en espiral.
export const agility = {
  name: 'Agilidad', texture: 'glow', blending: 'additive',
  count: 26, burst: true, lifetime: [0.4, 0.85],
  shape: 'ring', shapeRadius: 0.6, speed: [2.5, 5], gravity: -1.2, drag: 0.5,
  size: { start: [0.2, 0.45], end: 0.0 },
  color: { start: '#e6ffd0', end: '#6fc24a' }, alpha: { start: 0.85, end: 0 }, spin: 160,
};

// Lluvia de Flechas — impactos repartidos en la zona objetivo.
export const arrowRain = {
  name: 'Lluvia de Flechas', texture: 'spark', blending: 'additive',
  count: 30, burst: true, lifetime: [0.2, 0.5],
  shape: 'disc', shapeRadius: 1.6, speed: [2, 5], gravity: 8, drag: 0.3,
  size: { start: [0.14, 0.32], end: 0.0 },
  color: { start: '#ffffff', end: '#aaff8a' }, alpha: { start: 0.95, end: 0 },
};
export const arrowRainDust = {
  name: 'Lluvia de Flechas polvo', texture: 'smoke', blending: 'normal',
  count: 12, burst: true, lifetime: [0.4, 0.8],
  shape: 'disc', shapeRadius: 1.3, speed: [0.5, 1.5], gravity: -0.3, drag: 0.6,
  size: { start: [0.35, 0.7], end: 1.2 },
  color: { start: '#c8d8b0', end: '#7a8a60' }, alpha: { start: 0.35, end: 0 },
};

// ------------------------------------------------------------
// ATAQUES BÁSICOS
// ------------------------------------------------------------

// Guerrero — cleave: arco de chispas blancas/ámbar.
export const basicCleave = {
  name: 'Tajo básico', texture: 'spark', blending: 'additive',
  count: 14, burst: true, lifetime: [0.15, 0.32],
  shape: 'cone', shapeRadius: 0.1, coneAngle: 95, speed: [3, 7], gravity: 4, drag: 0.5,
  size: { start: [0.16, 0.34], end: 0.0 },
  color: { start: '#ffffff', end: '#ffd58a' }, alpha: { start: 1, end: 0 },
};

// Maga — bolt: motas arcanas en la mano al lanzar.
export const basicBolt = {
  name: 'Descarga arcana', texture: 'glow', blending: 'additive',
  count: 12, burst: true, lifetime: [0.18, 0.4],
  shape: 'sphere', shapeRadius: 0.18, speed: [1, 3], gravity: 0, drag: 0.6,
  size: { start: [0.18, 0.36], end: 0.0 },
  color: { start: '#e9c6ff', end: '#7a3cff' }, alpha: { start: 0.95, end: 0 },
};

// Arquera — arrow: pequeño soplo de viento al soltar la cuerda.
export const basicArrow = {
  name: 'Disparo básico', texture: 'spark', blending: 'additive',
  count: 8, burst: true, lifetime: [0.12, 0.28],
  shape: 'cone', shapeRadius: 0.08, coneAngle: 40, speed: [2, 5], gravity: 0, drag: 0.6,
  size: { start: [0.1, 0.24], end: 0.0 },
  color: { start: '#ffffff', end: '#d6ff8a' }, alpha: { start: 0.9, end: 0 },
};

// Impacto genérico de golpe (feedback de IMPACTO al golpear enemigo).
export const meleeHit = {
  name: 'Impacto cuerpo a cuerpo', texture: 'spark', blending: 'additive',
  count: 16, burst: true, lifetime: [0.12, 0.28],
  shape: 'sphere', shapeRadius: 0.15, speed: [3, 7], gravity: 3, drag: 0.5,
  size: { start: [0.16, 0.34], end: 0.0 },
  color: { start: '#ffffff', end: '#ffe0b0' }, alpha: { start: 1, end: 0 },
};

// ------------------------------------------------------------
// Tabla por id de habilidad (para acceso cómodo desde main.js).
// Cada entrada describe los presets que usa la habilidad y el color de elemento.
// ------------------------------------------------------------
export const SKILL_FX = {
  // Guerrero
  golpe_brutal:   { impact: brutalStrike, extra: brutalStrikeDust, color: 0xffd58a },
  grito_guerra:   { aura: warCry, color: 0xe08a2a },
  torbellino:     { aura: whirlwind, color: 0xcfd6e0 },
  embestida:      { trail: chargeTrail, impact: chargeImpact, color: 0xffcf7a },
  terremoto:      { aura: quakeDust, extra: quakeRocks, color: 0x9a8c6e },
  // Maga
  bola_fuego:     { trail: fireballTrail, impact: fireballBlast, color: 0xff6622 },
  nova_hielo:     { aura: frostNova, extra: frostShards, color: 0x66ccff },
  rayo:           { trail: boltTrail, impact: boltSpark, color: 0xffee66 },
  armadura_helada:{ aura: frostArmor, color: 0x66ccff },
  meteoro:        { trail: meteorFall, impact: meteorImpact, extra: meteorSmoke, color: 0xff4400 },
  // Arquera
  disparo_certero:{ trail: preciseTrail, impact: arrowSpark, color: 0xddffaa },
  flecha_multiple:{ aura: multiShotBurst, color: 0xccddaa },
  flecha_perforante:{ trail: piercingTrail, impact: arrowSpark, color: 0xffffcc },
  agilidad:       { aura: agility, color: 0x9af06a },
  lluvia_flechas: { aura: arrowRain, extra: arrowRainDust, color: 0xaaffaa },
};

export const SKILL_FX_PRESETS = {
  brutalStrike, brutalStrikeDust, warCry, whirlwind, chargeTrail, chargeImpact,
  quakeDust, quakeRocks, fireballTrail, fireballBlast, frostNova, frostShards,
  boltTrail, boltSpark, frostArmor, meteorFall, meteorImpact, meteorSmoke,
  preciseTrail, arrowSpark, multiShotBurst, piercingTrail, agility, arrowRain,
  arrowRainDust, basicCleave, basicBolt, basicArrow, meleeHit,
};
