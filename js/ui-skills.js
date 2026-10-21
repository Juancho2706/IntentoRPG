// ============================================================
// LIBRO DE HABILIDADES CON FORJA (tecla T) — stub de contrato
// ============================================================
// Paso 2 (E0.6; docs/paso2-implementacion.md §3.12, D24; diseño: docs/paso2f-habilidades-ux.md).
// Lo implementa U2 (E3) y lo monta U3 en js/ui.js. Debe poder importarse SIN DOM (nada de
// `document`/`window` al cargar el módulo).
//   createSkillBook(root, { game, onClose, onOpenTalents })
//     → { open(), close(), refresh(), el, check() }
//   DOM estable (§3.12): #skills-book[data-open], .sb-tile[data-skill], .sb-var[data-var][data-state],
//   .sb-mejora; check() deja window.__uicheck = { panel, overlaps: [], offscreen: [] }.
// Stub: métodos sin efecto hasta E3 (U3 puede cablearlo ya).
export function createSkillBook(root, opts = {}) {
  void opts;
  return {
    el: root || null,
    open() {},
    close() {},
    refresh() {},
    check() { return { panel: 'skills', overlaps: [], offscreen: [] }; },
  };
}
