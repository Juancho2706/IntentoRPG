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
const mast = byName('maestr');
if (!mast || mast.req !== 12) throw new Error('Maestrías deben aparecer con req nivel 12');
const para = byName('paragon');
if (!para || para.req !== 20) throw new Error('Paragon debe aparecer con req nivel 20');
console.log('Hitos por nivel correctos: Maestrías (Nv12), Paragon (Nv20) ✓');

// debe mencionar sistemas de endgame aunque no sean por nivel
for (const kw of ['grieta', 'pináculo', 'tormento', 'era', 'compañero']) {
  if (!byName(kw)) throw new Error('falta sistema en la guía: ' + kw);
}
console.log('Cubre endgame y sistemas clave (grietas, pináculo, tormento, eras, compañero) ✓');

console.log('\n✅ GUÍA DE SISTEMAS OK');
