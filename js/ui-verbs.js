// ============================================================
// FEEDBACK DE LOS VERBOS (carga, relanzar, combo, postura, plantado…) — stub de contrato
// ============================================================
// Paso 2 (E0.6; docs/paso2-implementacion.md §3.12 «Feedback de los verbos», D24 y D26).
// Lo implementa U2 (E3) y lo monta U3 en js/ui.js. Debe poder importarse SIN DOM.
//   createVerbHud(root, { game }) → { update(realDt), el }
//   update(realDt) lo llama ui.updateFloats CADA FRAME (D26), no updateHUD a 10 Hz.
//   DOM estable (§3.12): .verb-charge[data-in-window], .verb-pips[data-slot], .verb-ring[data-slot],
//   .verb-stance[data-slot][data-mode].
// Stub: update sin efecto hasta E3.
export function createVerbHud(root, opts = {}) {
  void opts;
  return {
    el: root || null,
    update(realDt) { void realDt; },
  };
}
