/* =====================================================================================================
 * Talentos v2 (Paso 2g) · REGLAS COMUNES A TODAS LAS CLASES
 * -----------------------------------------------------------------------------------------------------
 * Lo cargan, en este orden: el mockup docs/mockups/skills-ux.html (con <script src> clásico, funciona por
 * file:///) y el validador docs/mockups/data/validar-talentos.mjs (con node). Después se carga un archivo
 * por clase (data/talents-v2-<clase>.js), que se registra en window.TALENTS_V2_CLASSES['<clase>'].
 *
 * Este archivo NO tiene datos de ninguna clase: solo el ritmo de puntos, el presupuesto, las puertas y las
 * REJILLAS obligatorias (§17 de docs/paso2g-maga-coherencia.md), con la regla del reorden por nivel que cada clase
 * declara en su archivo (`rejilla`, abajo). Si cambia algo aquí, cambia para todas las
 * clases: coordínalo antes (el Guerrero y la Arquera se diseñan en paralelo).
 * Contrato del formato: data/README-talents-v2.md.
 * ===================================================================================================== */
(function () {
  'use strict';
  const W = typeof window !== 'undefined' ? window : globalThis;

  // número con coma decimal y sin ceros sobrantes: n1(1.05) → "1,05", n1(2) → "2"
  const n1 = v => String(+(+v).toFixed(2)).replace('.', ',');

  // ---------------------------------------------------------------- ritmo y presupuesto (§3 y §17.2)
  const REGLAS = {
    nivelMax: 100,
    pts: { cls: 34, spec: 31, hero: 10, board: 16 },          // puntos a Nv100 de cada sistema
    // puertas: puntos gastados en las filas de ARRIBA para abrir una fila (apex = banda del ápice)
    gates: {
      cls: [{ row: 4, need: 8 }, { row: 7, need: 24 }],
      spec: [{ row: 4, need: 8 }, { row: 7, need: 20 }, { row: 9, need: 25, apex: true }],
    },
    specAt: 10,              // se elige especialización (su nodo clave es gratis)
    specLast: 70,            // nivel del último punto de especialización (31/31)
    heroAt: 71,              // primer punto de Paragon (además exige la especialización 31/31 gastada)
    clsLate: [85, 90, 95, 100], // niveles tardíos que dan punto de CLASE
    textoMax: 120,           // largo máximo de un texto de efecto (d / opción)
    heroNodos: 13,           // nodos de un árbol héroe (1 clave gratis + 12)
  };
  const T3_CLS_LATE = REGLAS.clsLate;
  // puntos ganados de cada sistema al nivel L ('cls' | 'spec' | 'hero' | 'board')
  function earnedAt(w, L) {
    if (w === 'spec') return L < 10 ? 0 : Math.min(31, Math.floor((Math.min(L, 70) - 10) / 2) + 1);
    if (w === 'cls') return (L < 11 ? 0 : Math.floor((Math.min(L, 69) - 11) / 2) + 1) + T3_CLS_LATE.filter(x => x <= L).length;
    if (w === 'hero') return Math.max(0, Math.min(10, L - 70));
    if (w === 'board') { let n = 0; for (let l = 81; l <= L; l++) if (!T3_CLS_LATE.includes(l)) n++; return n; }
    return 0;
  }

  // ---------------------------------------------------------------- REJILLAS obligatorias
  // Cada fila: [n, fila, columna, rangos, tipo, requisitos]
  //   n = número del nodo: el id es <prefijo><n> (clase: c1…c30; especialización: p. ej. s0…s28; héroe: t0…t12)
  //   tipo: k clave (gratis) · p pasiva · c elección A/B · f final · x ápice
  //   requisitos = números de los nodos de los que basta UNO al máximo
  // Se respetan fila, columna, rangos y requisitos; el contenido (nombre, texto, icono) es libre.
  const g = rows => rows.map(([n, r, c, max, t, req]) => ({ n, r, c, max, t, req }));
  const REJILLA = {
    // Árbol de CLASE: 30 nodos, 53 rangos, filas 0–8; tres finales en la fila 8
    cls: g([
      [1, 0, 1, 2, 'p', []], [2, 0, 3, 2, 'p', []], [3, 0, 5, 2, 'p', []],
      [4, 1, 0, 3, 'p', [1]], [5, 1, 2, 1, 'c', [1, 2]], [6, 1, 4, 1, 'c', [2, 3]], [7, 1, 6, 1, 'p', [3]],
      [8, 2, 1, 2, 'p', [4, 5]], [9, 2, 3, 1, 'c', [5, 6]], [10, 2, 5, 1, 'c', [6, 7]],
      [11, 3, 0, 1, 'c', [8]], [12, 3, 2, 2, 'p', [8, 9]], [13, 3, 4, 2, 'p', [9, 10]], [14, 3, 6, 1, 'c', [10]],
      [15, 4, 1, 1, 'c', [11, 12]], [16, 4, 3, 1, 'c', [12, 13]], [17, 4, 5, 1, 'c', [13, 14]],
      [18, 5, 0, 2, 'p', [15]], [19, 5, 2, 1, 'p', [15, 16]], [20, 5, 4, 1, 'p', [16, 17]], [21, 5, 6, 1, 'p', [17]],
      [22, 6, 1, 1, 'c', [18, 19]], [23, 6, 3, 2, 'p', [19, 20]], [24, 6, 5, 2, 'p', [20, 21]],
      [25, 7, 0, 3, 'p', [22]], [26, 7, 3, 3, 'p', [23]], [27, 7, 6, 3, 'p', [24]],
      [28, 8, 0, 3, 'f', [25]], [29, 8, 3, 3, 'f', [26]], [30, 8, 6, 3, 'f', [27]],
    ]),
    // Árbol de ESPECIALIZACIÓN (el mismo para las 3 de cada clase): 29 nodos, 59 rangos (sin la clave), filas 0–9.
    // Columna izquierda (0–1) = arquetipo A · centro (2–4) = B · derecha (5–6) = C.
    // Fila 3 = elecciones que definen cada arquetipo · (2,2) A+B, (2,4) B+C y (5,3) los tres = híbridos.
    spec: g([
      [0, 0, 3, 1, 'k', []],
      [1, 1, 1, 3, 'p', [0]], [2, 1, 3, 3, 'p', [0]], [3, 1, 5, 3, 'p', [0]],
      [4, 2, 0, 2, 'p', [1]], [5, 2, 2, 1, 'p', [1, 2]], [6, 2, 4, 1, 'p', [2, 3]], [7, 2, 6, 2, 'p', [3]],
      [8, 3, 1, 1, 'c', [4, 5]], [9, 3, 3, 1, 'c', [5, 6]], [10, 3, 5, 1, 'c', [6, 7]],
      [11, 4, 0, 2, 'p', [8]], [12, 4, 2, 2, 'p', [8, 9]], [13, 4, 4, 2, 'p', [9, 10]], [14, 4, 6, 1, 'p', [10]],
      [15, 5, 1, 1, 'c', [11, 12]], [16, 5, 3, 2, 'p', [12, 13]], [17, 5, 5, 2, 'p', [13, 14]],
      [18, 6, 0, 2, 'p', [15]], [19, 6, 2, 2, 'p', [15, 16]], [20, 6, 4, 2, 'p', [16, 17]], [21, 6, 6, 1, 'p', [17]],
      [22, 7, 0, 3, 'p', [18]], [23, 7, 3, 3, 'p', [19]], [24, 7, 6, 3, 'p', [21]],
      [25, 8, 0, 3, 'f', [22]], [26, 8, 3, 3, 'f', [23]], [27, 8, 6, 3, 'f', [24]],
      [28, 9, 3, 4, 'x', [25, 26, 27]],
    ]),
    // Árbol HÉROE (Paragon): 13 nodos (clave gratis + 12 de 1 rango), 3 elecciones y un final (capstone)
    hero: g([
      [0, 0, 1, 1, 'k', []],
      [1, 1, 0, 1, 'p', [0]], [2, 1, 1, 1, 'c', [0]], [3, 1, 2, 1, 'p', [0]],
      [4, 2, 0, 1, 'c', [1, 2]], [5, 2, 1, 1, 'p', [2]], [6, 2, 2, 1, 'p', [2, 3]],
      [7, 3, 0, 1, 'p', [4, 5]], [8, 3, 1, 1, 'c', [5]], [9, 3, 2, 1, 'p', [5, 6]],
      [10, 4, 0.5, 1, 'p', [7, 8]], [11, 4, 1.5, 1, 'p', [8, 9]],
      [12, 5, 1, 1, 'f', [10, 11]],
    ]),
  };

  // ---------------------------------------------------------------- REORDEN por nivel (aprobado por el dueño, 2026-10-22)
  // Una clase puede recolocar números de la rejilla para que los primeros talentos toquen lo que ya conoces. Lo declara
  // en su archivo con `rejilla: { cls?, spec?, hero?, <specId>? }`, cada uno { número: [fila, columna] }: `spec` vale para
  // sus tres especializaciones (mismo número = misma casilla) y <specId> solo para esa (manda sobre `spec`). La forma no
  // cambia: el número conserva su máximo y su tipo, va a una casilla del mismo tipo y sus requisitos son los de la casilla
  // que ocupa (las aristas no se mueven).
  // reordenar(G, perm) → { G: rejilla recolocada, bad: [errores del propio reorden] }
  function reordenar(G, perm) {
    if (!perm || !Object.keys(perm).length) return { G, bad: [] };
    const bad = [];
    const key = ([r, c]) => `${r},${c}`;
    const cellOf = g => perm[g.n] || [g.r, g.c];
    const host = new Map(G.map(g => [key([g.r, g.c]), g]));   // casilla → quien la ocupa en la rejilla base
    const at = new Map();                                      // casilla nueva → número
    for (const n of Object.keys(perm)) if (!G.some(g => String(g.n) === n)) bad.push(`${n}: no es un número de la rejilla`);
    for (const g of G) {
      if (perm[g.n] && key(perm[g.n]) === key([g.r, g.c])) bad.push(`${g.n}: ya está en ${key([g.r, g.c])} (sobra)`);
      const k = key(cellOf(g));
      if (at.has(k)) bad.push(`casilla ${k} repetida (${at.get(k)} y ${g.n})`);
      if (!host.has(k)) bad.push(`${g.n}: la casilla ${k} no es de la rejilla`);
      else if (host.get(k).t !== g.t) bad.push(`${g.n} (${g.t}) en la casilla ${k}, que es de tipo ${host.get(k).t}`);
      at.set(k, g.n);
    }
    if (bad.length) return { G, bad };
    const by = new Map(G.map(g => [g.n, g]));
    const out = G.map(g => {
      const [r, c] = cellOf(g);
      const req = host.get(key([r, c])).req.map(m => at.get(key([by.get(m).r, by.get(m).c])));
      return { ...g, r, c, req };
    });
    return { G: out, bad: [] };
  }
  // rejilla de un árbol de la clase C: tipo 'cls' | 'spec' | 'hero' (specId: la especialización, si es 'spec')
  function rejillaDe(C, tipo, specId = null) {
    const R = C?.rejilla || {};
    return reordenar(REJILLA[tipo], (tipo === 'spec' && specId && R[specId]) || R[tipo] || null);
  }

  // ---------------------------------------------------------------- clases del juego (selector de clase)
  // specs = ids de especialización (los del juego) · gauges = barra de mecánica que ya existe en js/spec-mechanics.js
  const CLASES = {
    maga: { name: 'Maga', icon: 'ui/res_mana.webp', res: 'Maná',
      specs: ['piromante', 'crionte', 'arcanista'], specNames: { piromante: 'Piromante', crionte: 'Crionte', arcanista: 'Arcanista' },
      gauges: { piromante: 'calor', crionte: 'escarcha', arcanista: 'cargas' }, roles: { piromante: 'Daño en área', crionte: 'Control', arcanista: 'Un objetivo' } },
    guerrero: { name: 'Guerrero', icon: 'ui/res_furia.webp', res: 'Furia',
      specs: ['berserker', 'guardian', 'cruzado'], specNames: { berserker: 'Berserker', guardian: 'Guardián', cruzado: 'Cruzado' },
      gauges: { berserker: 'sed', guardian: 'bastion', cruzado: 'fervor' }, roles: { berserker: 'Daño', guardian: 'Tanque', cruzado: 'Apoyo' } },
    arquera: { name: 'Arquera', icon: 'ui/res_energia.webp', res: 'Energía',
      specs: ['tiradora', 'francotiradora', 'montaraz'], specNames: { tiradora: 'Tiradora Veloz', francotiradora: 'Francotiradora', montaraz: 'Montaraz' },
      gauges: { tiradora: 'impulso', francotiradora: 'concentracion', montaraz: 'coto' }, roles: { tiradora: 'Daño en área', francotiradora: 'Un objetivo', montaraz: 'Control' } },
  };
  const CLASES_ORDEN = ['maga', 'guerrero', 'arquera'];
  const GAUGES = ['sed', 'bastion', 'fervor', 'calor', 'escarcha', 'cargas', 'concentracion', 'coto', 'impulso'];

  // ---------------------------------------------------------------- utilidades para los archivos de clase
  // ruta del icono de un nodo si el nodo no trae `icon`: talents/<clase>-<clase|spec|héroe>-<nodeId>.webp
  const iconoNodo = (cls, arbol, id) => `talents/${cls}-${arbol}-${id}.webp`;
  // Build: `cls` y `spec` van en ORDEN DE COMPRA; «id_» = rango extra del mismo nodo comprado más tarde (en `cls`, Nv85+;
  // en `spec`, tras otros nodos: el reorden por nivel de la Arcanista y del Guerrero). normBuild suma esos rangos en
  // `cls`/`spec` y deja el orden en `clsOrder`/`specOrder` ([[id, rango acumulado], …]). Idempotente.
  function normBuild(b) {
    if (!b) return b;
    const sumar = (src, orden) => { const o = {}; for (const [k, v] of Object.entries(src || {})) { const id = k.replace(/_$/, ''); o[id] = (o[id] || 0) + v; orden.push([id, o[id]]); } return o; };
    if (!b.clsOrder) { b.clsOrder = []; b.cls = sumar(b.cls, b.clsOrder); }
    if (!b.specOrder) { b.specOrder = []; b.spec = sumar(b.spec, b.specOrder); }
    return b;
  }
  // árboles héroe de cada especialización (si la clase no trae `specHero`): en el orden de `hero`
  function specHeroDe(def) {
    if (def.specHero) return def.specHero;
    const out = {}; for (const id of def.specOrder || []) out[id] = (def.tree?.hero || []).filter(h => (h.specs || []).includes(id)).map(h => h.id);
    return out;
  }

  W.TV2 = { formato: 1, n1, REGLAS, earnedAt, REJILLA, reordenar, rejillaDe, CLASES, CLASES_ORDEN, GAUGES, iconoNodo, normBuild, specHeroDe };
  W.TALENTS_V2_CLASSES = W.TALENTS_V2_CLASSES || {};
})();
