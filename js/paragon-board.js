// ============================================================
// TABLERO DE GLIFOS (Paragon de nodos): configuración por clase y geometría
// ============================================================
// Módulo HOJA (sin imports); data.js lo reexporta. Paso 2g (docs/paso2-implementacion.md
// §3.9 y 2g §7.5): se abre al Nv81 con 16 puntos DERIVADOS del nivel (talents.
// paragonPointsEarned: no se guardan) y reiniciarlo es gratis fuera de combate. Los
// legendarios dan ESTADÍSTICAS grandes y ningún poder (la identidad la dan los árboles héroe;
// los poderes furia/festin/volatil/multidisparo/agil siguen registrados para el equipo).
//
// Geometría (9 × 9, Inicio en 4,4): cuatro brazos en molinete que no se tocan entre sí.
// Cada brazo es un camino de 9 nodos: menor, mágico, menor, ZÓCALO de glifo, menor,
// mágico, menor, mágico y el LEGENDARIO (a 9 casillas del inicio, con el zócalo en el
// camino), más dos raros a los lados. Con 16 puntos se llega a un legendario con su zócalo
// (9) y 7 nodos más; dos legendarios cuestan 18: nunca los dos (lo afirman test35 y test38).
// Las casillas se activan si conectan (en ortogonal) con un nodo activo o con el Inicio.
// Cada nodo lleva `cat` (cuadrante) para los GLIFOS DE FAMILIA (bonus por adyacente de la
// misma familia); los zócalos no tienen familia.
export const PARAGON_CATS = { ofensiva: 'Ofensiva', sustento: 'Sustento', defensa: 'Defensa', utilidad: 'Utilidad' };

// configuración temática por clase: un legendario por brazo + 8 raros (2 por brazo)
export const PG_CFG = {
  guerrero: {
    leg: {
      off: { name: 'Sed de Batalla',  stats: { dmgPct: 10, crit: 2 },  desc: '+10 % de daño y +2 % de crítico' },
      sus: { name: 'Corazón Voraz',   stats: { hp: 60, lph: 2 },       desc: '+60 de vida y +2 de vida al golpear' },
      def: { name: 'Muralla',         stats: { arm: 30, thorns: 12 },  desc: '+30 de armadura y +12 de espinas' },
      uti: { name: 'Cosecha Macabra', stats: { aspdPct: 10, cdr: 3 },  desc: '+10 % de velocidad de ataque y −3 % de enfriamientos' },
    },
    rares: { off1: { dmgPct: 3 }, off2: { crit: 2 }, sus1: { hp: 18 }, sus2: { vit: 4 }, def1: { arm: 8 }, def2: { hp: 14 }, uti1: { cdr: 4 }, uti2: { thorns: 10 } },
  },
  maga: {
    leg: {
      off: { name: 'Núcleo Ardiente',   stats: { dmgPct: 10, crit: 3 },  desc: '+10 % de daño y +3 % de crítico' },
      sus: { name: 'Manantial Arcano',  stats: { hp: 30, mph: 4 },       desc: '+30 de vida y +4 de maná al golpear' },
      def: { name: 'Égida de Escarcha', stats: { arm: 28, hp: 20 },      desc: '+28 de armadura y +20 de vida' },
      uti: { name: 'Vendaval Arcano',   stats: { aspdPct: 10, cdr: 3 },  desc: '+10 % de velocidad de ataque y −3 % de enfriamientos' },
    },
    rares: { off1: { dmgPct: 3 }, off2: { crit: 3 }, sus1: { hp: 16 }, sus2: { mph: 2 }, def1: { arm: 8 }, def2: { hp: 14 }, uti1: { cdr: 5 }, uti2: { mf: 10 } },
  },
  arquera: {
    leg: {
      off: { name: 'Ojo del Halcón',     stats: { crit: 6, dmgPct: 6 },    desc: '+6 % de crítico y +6 % de daño' },
      sus: { name: 'Festín del Cazador', stats: { hp: 40, lph: 3 },        desc: '+40 de vida y +3 de vida al golpear' },
      def: { name: 'Reflejos Felinos',   stats: { arm: 24, aspdPct: 4 },   desc: '+24 de armadura y +4 % de velocidad de ataque' },
      uti: { name: 'Lluvia de Flechas',  stats: { aspdPct: 10, spdPct: 3 }, desc: '+10 % de velocidad de ataque y +3 % de velocidad' },
    },
    rares: { off1: { crit: 3 }, off2: { dmgPct: 3 }, sus1: { hp: 16 }, sus2: { lph: 1 }, def1: { arm: 8 }, def2: { hp: 14 }, uti1: { aspdPct: 3 }, uti2: { mf: 10 } },
  },
};

// brazos: casillas del camino (orden de compra desde el Inicio) y de los dos raros
const ARMS = [
  { key: 'off', cat: 'ofensiva', minor: { dmgPct: 1 }, magic: { dmgPct: 2, crit: 1 },
    path: [[4, 3], [4, 2], [4, 1], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [8, 1]], rares: [[3, 2], [6, 1]] },
  { key: 'uti', cat: 'utilidad', minor: { aspdPct: 1 }, magic: { aspdPct: 3 },
    path: [[5, 4], [6, 4], [7, 4], [8, 4], [8, 5], [8, 6], [8, 7], [8, 8], [7, 8]], rares: [[6, 3], [7, 6]] },
  { key: 'sus', cat: 'sustento', minor: { hp: 6 }, magic: { hp: 14 },
    path: [[4, 5], [4, 6], [4, 7], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8], [0, 7]], rares: [[5, 6], [2, 7]] },
  { key: 'def', cat: 'defensa', minor: { arm: 4 }, magic: { arm: 10 },
    path: [[3, 4], [2, 4], [1, 4], [0, 4], [0, 3], [0, 2], [0, 1], [0, 0], [1, 0]], rares: [[2, 3], [1, 2]] },
];
// tipo de cada paso del camino (el 4.º es el zócalo; el 9.º, el legendario)
const PATH_TYPES = ['minor', 'magic', 'minor', 'socket', 'minor', 'magic', 'minor', 'magic', 'legendary'];
export const PARAGON_SOCKET_STEP = 4;
export const PARAGON_LEGENDARY_STEP = 9;

export function buildParagonBoard(cfg) {
  const nodes = [];
  const add = (x, y, type, stats, cat, extra = {}) => nodes.push({ id: `${x}_${y}`, x, y, type, stats, cat, ...extra });
  add(4, 4, 'start', {}, null, { name: 'Inicio' });
  for (const arm of ARMS) {
    arm.path.forEach(([x, y], i) => {
      const type = PATH_TYPES[i];
      if (type === 'socket') add(x, y, 'socket', {}, null);
      else if (type === 'legendary') { const L = cfg.leg[arm.key]; add(x, y, 'legendary', { ...L.stats }, arm.cat, { name: L.name, desc: L.desc }); }
      else add(x, y, type, { ...arm[type] }, arm.cat);
    });
    arm.rares.forEach(([x, y], i) => add(x, y, 'rare', { ...cfg.rares[`${arm.key}${i + 1}`] }, arm.cat));
  }
  return nodes;
}

export const PARAGON_BOARDS = {
  guerrero: buildParagonBoard(PG_CFG.guerrero),
  maga: buildParagonBoard(PG_CFG.maga),
  arquera: buildParagonBoard(PG_CFG.arquera),
};
export function paragonBoardFor(classId) { return PARAGON_BOARDS[classId] || PARAGON_BOARDS.guerrero; }
export const PARAGON_BOARD_SIZE = 9;

// coste mínimo (nodos a activar) para tener activos a la vez los nodos `targets` desde el
// Inicio. El tablero es un árbol (molinete sin ciclos): la unión de los caminos desde el
// Inicio es el mínimo exacto. Lo usan los tests.
export function paragonPathCost(board, targets) {
  const start = board.find(n => n.type === 'start');
  const adj = n => board.filter(o => Math.abs(o.x - n.x) + Math.abs(o.y - n.y) === 1);
  const prev = new Map([[start.id, null]]);
  const queue = [start];
  while (queue.length) { const n = queue.shift(); for (const o of adj(n)) if (!prev.has(o.id)) { prev.set(o.id, n.id); queue.push(o); } }
  const need = new Set();
  for (const id of targets) {
    if (!prev.has(id)) return Infinity;
    for (let cur = id; cur && cur !== start.id; cur = prev.get(cur)) need.add(cur);
  }
  return need.size;
}
