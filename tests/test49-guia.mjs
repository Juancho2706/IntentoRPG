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
const para = byName('paragon');
if (!para || para.req !== 20) throw new Error('Paragon debe aparecer con req nivel 20');
console.log('Hitos por nivel correctos: Talentos y especialización (Nv10), Paragon (Nv20) ✓');

// Paso 2d: la guía explica la tecla N y la barra de 6 ranuras con la 2 flexible
if (!/tecla N/i.test(tal.desc)) throw new Error('la guía de talentos debe decir que se abren con la tecla N');
const hab = byName('habilidades');
if (!hab || !/6 ranuras/.test(hab.desc)) throw new Error('la guía de habilidades debe explicar la barra de 6 ranuras');
for (const kw of ['movilidad', 'especialización', 'definitiva', 'gastadora']) if (!hab.desc.toLowerCase().includes(kw)) throw new Error('la barra de 6 ranuras debe nombrar: ' + kw);
if (!/2 defensa o 2\.ª gastadora/.test(hab.desc)) throw new Error('la ranura 2 debe explicarse como flexible');
if (!/arrastra/i.test(hab.desc)) throw new Error('la guía debe contar que se arrastra desde el libro a la barra');
console.log('Guía: tecla N para talentos y barra de 6 ranuras (2 flexible, arrastrar desde el libro) ✓');

// debe mencionar sistemas de endgame aunque no sean por nivel
for (const kw of ['grieta', 'pináculo', 'tormento', 'era', 'compañero']) {
  if (!byName(kw)) throw new Error('falta sistema en la guía: ' + kw);
}
console.log('Cubre endgame y sistemas clave (grietas, pináculo, tormento, eras, compañero) ✓');

console.log('\n✅ GUÍA DE SISTEMAS OK');
