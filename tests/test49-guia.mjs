// Guía de sistemas (onboarding): el catálogo es coherente y cubre los sistemas
// gated clave con su requisito, para que un jugador nuevo descubra qué existe.
import { SYSTEMS_GUIDE } from '../js/data.js';

if (!Array.isArray(SYSTEMS_GUIDE) || SYSTEMS_GUIDE.length < 10)
  throw new Error('la guía debe listar la mayoría de sistemas');

for (const s of SYSTEMS_GUIDE) {
  if (!s.icon || !s.name || !s.desc) throw new Error('entrada de guía incompleta: ' + JSON.stringify(s));
  // cada entrada debe decir CÓMO se accede: por nivel (req) o por texto (reqText)
  if (!s.req && !s.reqText) throw new Error('entrada sin condición de acceso: ' + s.name);
  if (s.req != null && typeof s.req !== 'number') throw new Error('req debe ser número: ' + s.name);
}
console.log(`Guía: ${SYSTEMS_GUIDE.length} sistemas, todos con icono/nombre/desc y condición de acceso ✓`);

// debe cubrir los hitos gated por nivel con su nivel correcto
const byName = (n) => SYSTEMS_GUIDE.find(s => s.name.toLowerCase().includes(n));
// Paso 2c.0: las maestrías se sustituyeron por talentos y especialización (Nv10)
if (byName('maestr')) throw new Error('las maestrías ya no existen (talentos, Paso 2c.0)');
const tal = byName('talento');
if (!tal || tal.req !== 10) throw new Error('Talentos y especialización deben aparecer con req nivel 10');
// Paso 2 (§3.9): el árbol héroe (Paragon) se abre al Nv71 y el tablero de glifos al Nv81 (antes Nv20)
const para = byName('paragon');
if (!para || para.req !== 71) throw new Error('Paragon (árbol héroe) debe aparecer con req nivel 71');
const board = byName('tablero');
if (!board || board.req !== 81) throw new Error('El tablero de glifos debe aparecer con req nivel 81');
if (SYSTEMS_GUIDE.some(s => s.req === 20)) throw new Error('ningún sistema se abre ya al Nv20');
console.log('Hitos por nivel correctos: Talentos (Nv10), Paragon/árbol héroe (Nv71), tablero (Nv81) ✓');

// Paso 2d: la guía explica la tecla N y la barra de 6 ranuras con la 2 flexible
if (!/tecla N/i.test(tal.desc)) throw new Error('la guía de talentos debe decir que se abren con la tecla N');
if (!/nivel 100/.test(tal.desc) || !/un solo sistema/.test(tal.desc)) throw new Error('talentos: 1 punto por nivel hasta el 100, cada uno para un solo sistema');
const hab = byName('habilidades');
if (!hab || !/6 ranuras/.test(hab.desc)) throw new Error('la guía de habilidades debe explicar la barra de 6 ranuras');
for (const kw of ['movilidad', 'especialización', 'definitiva', 'principal', 'insignia']) if (!hab.desc.toLowerCase().includes(kw)) throw new Error('la barra de 6 ranuras debe nombrar: ' + kw);
if (!/2 defensa, utilidad o 2\.ª Principal/.test(hab.desc)) throw new Error('la ranura 2 debe explicarse como flexible');
if (!/arrastra/i.test(hab.desc)) throw new Error('la guía debe contar que se arrastra desde el libro a la barra');
console.log('Guía: tecla N para talentos y barra de 6 ranuras (2 flexible, arrastrar desde el libro) ✓');

// Paso 2 (2f): la forja sustituye a las ramas; nada de puntos de habilidad ni «Gastadora» (G15)
const forja = byName('forja');
if (!forja || forja.req !== 4) throw new Error('la forja debe aparecer (Mejora a req+3 de la primera habilidad: Nv4)');
if (!/Mejora/.test(forja.desc) || !/Variantes/.test(forja.desc) || !/gratis fuera de combate/.test(forja.desc)) throw new Error('la forja debe explicar Mejora, Variantes y que cambiar es gratis fuera de combate');
const all = SYSTEMS_GUIDE.map(s => `${s.name} ${s.desc}`).join(' ');
if (/astadora/i.test(all)) throw new Error('ningún texto dice «Gastadora» (G15)');
if (/rama|puntos? de habilidad/i.test(all)) throw new Error('las ramas y los puntos de habilidad ya no existen');
console.log('Forja (Nv4) en lugar de ramas; sin «Gastadora» ni puntos de habilidad ✓');

// debe mencionar sistemas de endgame aunque no sean por nivel
for (const kw of ['grieta', 'pináculo', 'tormento', 'era', 'compañero']) {
  if (!byName(kw)) throw new Error('falta sistema en la guía: ' + kw);
}
console.log('Cubre endgame y sistemas clave (grietas, pináculo, tormento, eras, compañero) ✓');

console.log('\n✅ GUÍA DE SISTEMAS OK');
