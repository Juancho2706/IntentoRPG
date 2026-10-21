// ============================================================
// Helpers PUROS de texto para los datos de talentos v2 (Paso 2g · E0.4)
// ============================================================
// Copia LITERAL de los helpers que usan las funciones d(r) de los datos del mockup
// (docs/mockups/data/talents-v2-comun.js → TV2.n1; talents-v2-guerrero.js → pl), para
// que js/talents-<clase>.js y js/hero-<clase>.js den exactamente el mismo texto.
// Lo importan los datos de talentos y el conversor (tools/convert-v2/convert.mjs), que
// comprueba d(r) contra el mockup para r = 1…max y FALLA si una d(r) usa un identificador
// libre que no se exporte aquí. Un helper nuevo se añade aquí (dueño: W1 desde E1).
// Sin imports y sin DOM: se puede cargar headless.

// número con coma decimal y sin ceros sobrantes: n1(1.05) → "1,05", n1(2) → "2"
export const n1 = v => String(+(+v).toFixed(2)).replace('.', ',');

// singular o plural según el rango: pl(r, 'salto', 'saltos')
export const pl = (r, uno, muchos) => (r > 1 ? muchos : uno);
