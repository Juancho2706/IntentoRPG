// ============================================================
// TABLERO DE PARAGON (glifos): configuración por clase y geometría
// ============================================================
// Paso 2 (E0.3): sale de js/data.js sin cambiar nada; data.js lo reexporta, así que
// `import { PARAGON_BOARD, paragonBoardFor, … } from './data.js'` sigue igual.
// Módulo HOJA (sin imports). Dueño en E1: W1 (tablero nuevo de 2g §7.5 y
// docs/paso2-implementacion.md §3.9: puntos derivados, legendarios con estadísticas).
//
// Tablero de Paragon (estilo Diablo 4): nodos conectados en una rejilla 9×9.
// Se activan gastando puntos Paragon, solo si conectan (ortogonalmente) con un
// nodo ya activo o con el Inicio. Tipos: start, minor, magic, rare, legendary.
// Los nodos legendarios (★) otorgan poderes únicos además de stats.
//
// FASE 4 — TABLERO TEMÁTICO POR CLASE: la geometría (Inicio en 4,4; 4 brazos;
// 4 engarces) y el esqueleto de nodos menores/mágicos son idénticos en las 3
// clases (así adyacencias, ids guardados y glifos son estables), pero los
// nodos LEGENDARIOS (build-defining) y los raros llevan poderes/stats temáticos
// de cada clase. Cada nodo lleva además `cat` (cuadrante: ofensiva/sustento/
// defensa/utilidad), que alimenta los GLIFOS DE FAMILIA (bonus extra por nodo
// adyacente de la misma familia).
export const PARAGON_CATS = { ofensiva: 'Ofensiva', sustento: 'Sustento', defensa: 'Defensa', utilidad: 'Utilidad' };

// configuración temática por clase: 4 legendarios (uno por brazo) + 8 raros.
export const PG_CFG = {
  guerrero: {
    leg: {
      off: { name: 'Sed de Batalla',  stats: { dmgPct: 8 },          power: 'furia',        desc: 'poder de la Furia: daño ×1,15 con vida alta' },
      sus: { name: 'Corazón Voraz',   stats: { hp: 40 },             power: 'festin',       desc: 'poder del Festín: cura al matar' },
      def: { name: 'Muralla',         stats: { arm: 30, thorns: 12 },                       desc: '+30 armadura y +12 espinas' },
      uti: { name: 'Cosecha Macabra', stats: { aspdPct: 8 },         power: 'volatil',      desc: 'poder Volátil: los cadáveres estallan' },
    },
    rares: { off1: { dmgPct: 3 }, off2: { crit: 2 }, sus1: { hp: 18 }, sus2: { vit: 4 }, def1: { arm: 8 }, def2: { hp: 14 }, uti1: { cdr: 4 }, uti2: { thorns: 10 } },
  },
  maga: {
    leg: {
      off: { name: 'Núcleo Ardiente',  stats: { dmgPct: 8, crit: 3 }, power: 'volatil',      desc: 'poder Volátil: los enemigos estallan al morir' },
      sus: { name: 'Manantial Arcano', stats: { hp: 30, mph: 4 },                            desc: '+30 vida y +4 maná al golpear' },
      def: { name: 'Égida de Escarcha',stats: { arm: 28, hp: 20 },                           desc: '+28 armadura y +20 vida' },
      uti: { name: 'Vendaval Arcano',  stats: { aspdPct: 8 },         power: 'multidisparo',  desc: 'poder del Vendaval: +1 proyectil' },
    },
    rares: { off1: { dmgPct: 3 }, off2: { crit: 3 }, sus1: { hp: 16 }, sus2: { mph: 2 }, def1: { arm: 8 }, def2: { hp: 14 }, uti1: { cdr: 5 }, uti2: { mf: 10 } },
  },
  arquera: {
    leg: {
      off: { name: 'Ojo del Halcón',    stats: { crit: 6, dmgPct: 4 }, power: 'furia',        desc: 'poder de la Furia: daño ×1,15 con vida alta' },
      sus: { name: 'Festín del Cazador',stats: { hp: 36, lph: 2 },     power: 'festin',       desc: 'poder del Festín: cura al matar' },
      def: { name: 'Reflejos Felinos',  stats: { arm: 24, aspdPct: 4 },power: 'agil',         desc: 'poder Ágil: esquiva con recarga más rápida' },
      uti: { name: 'Lluvia de Flechas', stats: { aspdPct: 8 },         power: 'multidisparo',  desc: 'poder del Vendaval: +1 proyectil' },
    },
    rares: { off1: { crit: 3 }, off2: { dmgPct: 3 }, sus1: { hp: 16 }, sus2: { lph: 1 }, def1: { arm: 8 }, def2: { hp: 14 }, uti1: { aspdPct: 3 }, uti2: { mf: 10 } },
  },
};

export function buildParagonBoard(cfg) {
  const nodes = [];
  const add = (x, y, type, stats, cat, extra = {}) => nodes.push({ id: `${x}_${y}`, x, y, type, stats, cat, ...extra });
  add(4, 4, 'start', {}, null, { name: 'Inicio' });
  // brazo SUPERIOR — ofensiva
  add(4, 3, 'minor', { dmgPct: 1 }, 'ofensiva');
  add(4, 2, 'magic', { dmgPct: 2, crit: 1 }, 'ofensiva');
  add(4, 1, 'minor', { dmgPct: 1 }, 'ofensiva');
  add(4, 0, 'legendary', cfg.leg.off.stats, 'ofensiva', { name: cfg.leg.off.name, power: cfg.leg.off.power, desc: cfg.leg.off.desc });
  add(3, 2, 'rare', cfg.rares.off1, 'ofensiva');
  add(5, 2, 'rare', cfg.rares.off2, 'ofensiva');
  // brazo INFERIOR — sustento
  add(4, 5, 'minor', { hp: 6 }, 'sustento');
  add(4, 6, 'magic', { hp: 14 }, 'sustento');
  add(4, 7, 'minor', { hp: 6 }, 'sustento');
  add(4, 8, 'legendary', cfg.leg.sus.stats, 'sustento', { name: cfg.leg.sus.name, power: cfg.leg.sus.power, desc: cfg.leg.sus.desc });
  add(3, 6, 'rare', cfg.rares.sus1, 'sustento');
  add(5, 6, 'rare', cfg.rares.sus2, 'sustento');
  // brazo IZQUIERDO — defensa
  add(3, 4, 'minor', { arm: 4 }, 'defensa');
  add(2, 4, 'magic', { arm: 10 }, 'defensa');
  add(1, 4, 'minor', { arm: 4 }, 'defensa');
  add(0, 4, 'legendary', cfg.leg.def.stats, 'defensa', { name: cfg.leg.def.name, power: cfg.leg.def.power, desc: cfg.leg.def.desc });
  add(2, 3, 'rare', cfg.rares.def1, 'defensa');
  add(2, 5, 'rare', cfg.rares.def2, 'defensa');
  // brazo DERECHO — velocidad / utilidad
  add(5, 4, 'minor', { aspdPct: 1 }, 'utilidad');
  add(6, 4, 'magic', { aspdPct: 3 }, 'utilidad');
  add(7, 4, 'minor', { aspdPct: 1 }, 'utilidad');
  add(8, 4, 'legendary', cfg.leg.uti.stats, 'utilidad', { name: cfg.leg.uti.name, power: cfg.leg.uti.power, desc: cfg.leg.uti.desc });
  add(6, 3, 'rare', cfg.rares.uti1, 'utilidad');
  add(6, 5, 'rare', cfg.rares.uti2, 'utilidad');
  // nodos de ENGARCE (sockets) para glifos — en la unión de dos cuadrantes, de
  // modo que la familia del glifo que coloques aquí es una decisión real.
  add(3, 3, 'socket', {}, null);
  add(5, 3, 'socket', {}, null);
  add(3, 5, 'socket', {}, null);
  add(5, 5, 'socket', {}, null);
  return nodes;
}

export const PARAGON_BOARDS = {
  guerrero: buildParagonBoard(PG_CFG.guerrero),
  maga: buildParagonBoard(PG_CFG.maga),
  arquera: buildParagonBoard(PG_CFG.arquera),
};
// tablero por defecto / compatibilidad (la mayoría del código lo resuelve por
// clase con paragonBoardFor; los tests headless importan este alias = guerrero).
export const PARAGON_BOARD = PARAGON_BOARDS.guerrero;
export function paragonBoardFor(classId) { return PARAGON_BOARDS[classId] || PARAGON_BOARD; }
export const PARAGON_BOARD_SIZE = 9;
