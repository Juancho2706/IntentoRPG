// ============================================================
// PODERES DE LA FORJA DE LA ARQUERA (variantes 2f: `power: 'v_<id>'`) — stub de contrato
// ============================================================
// Paso 2 (E0.6; docs/paso2-implementacion.md §3.5, D23, D24 y D28). Mismo patrón que
// js/powers-<clase>.js: se exporta una FUNCIÓN (no una constante) porque este módulo entrará
// en el ciclo con js/powers.js, que la llama al cargar (registro: W2 en E1).
// Dueño: KA-arquera (KA2, E2). Los ids `v_*` se comprueban contra
// tools/convert-v2/out/power-ids.json: únicos entre clases (D28; definePower lanza con uno repetido).
//   arqueraForgePowers() → { v_<id>: PowerDef }   (vacío hasta KA2)
export function arqueraForgePowers() {
  return {};
}
