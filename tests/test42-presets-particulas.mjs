// Regresión: normalización de presets de partículas (motor reutilizable).
// normalizePreset rellena parciales con defaults, valida enums y clampa; los
// editores (particulasmaker) y el juego dependen de que nunca devuelva basura.
import { normalizePreset, DEFAULT_PRESET, serializePreset, deserializePreset, PRESETS } from '../js/particles.js';

// preset vacío → copia íntegra de los defaults (mismas claves, no la misma ref)
const empty = normalizePreset({});
for (const k of Object.keys(DEFAULT_PRESET)) {
  if (!(k in empty)) throw new Error('falta clave tras normalizar: ' + k);
}
if (empty === DEFAULT_PRESET) throw new Error('debe devolver objeto nuevo, no la ref del default');
console.log('Preset vacío hereda todos los defaults ✓');

// parcial: respeta lo dado, completa el resto
const part = normalizePreset({ name: 'fuego', count: 12, color: { start: '#ff0000' } });
if (part.name !== 'fuego' || part.count !== 12) throw new Error('no respetó valores parciales');
if (part.color.start !== '#ff0000') throw new Error('no respetó color.start');
if (part.color.end !== DEFAULT_PRESET.color.end) throw new Error('no completó color.end con default');
console.log('Parcial respeta lo dado y completa el resto ✓');

// validación de enums: texture/shape/blending inválidos caen al default
const bad = normalizePreset({ texture: 'inexistente', shape: 'hexágono', blending: 'raro' });
if (bad.texture !== DEFAULT_PRESET.texture) throw new Error('texture inválida no cayó al default');
if (bad.shape !== DEFAULT_PRESET.shape) throw new Error('shape inválida no cayó al default');
if (bad.blending !== 'additive') throw new Error('blending inválido no cayó a additive');
console.log('Enums inválidos caen al default ✓');

// clamps numéricos: count nunca < 1, valores siempre numéricos
const z = normalizePreset({ count: 0 });
if (z.count < 1) throw new Error('count debe clamparse a >= 1');
if (typeof z.gravity !== 'number' || Number.isNaN(z.gravity)) throw new Error('gravity debe ser número');
console.log('count clamped a >=1 y numéricos saneados ✓');

// pares [min,max]: un escalar se expande a par
const sc = normalizePreset({ lifetime: 2, speed: [1, 4] });
if (!Array.isArray(sc.lifetime) || sc.lifetime.length !== 2) throw new Error('lifetime escalar no se volvió par');
if (sc.speed[0] !== 1 || sc.speed[1] !== 4) throw new Error('speed par no se respetó');
console.log('Escalares se expanden a pares [min,max] ✓');

// ida y vuelta por JSON estable
const round = deserializePreset(serializePreset({ name: 'x', count: 7 }));
if (round.name !== 'x' || round.count !== 7) throw new Error('serializar/deserializar no es estable');
console.log('serialize/deserialize estable ✓');

// los presets integrados ya están normalizados y son válidos
const names = Object.keys(PRESETS);
if (names.length < 5) throw new Error('esperaba varios presets integrados');
for (const n of names) {
  const p = PRESETS[n];
  if (!(p.count >= 1) || !Array.isArray(p.lifetime)) throw new Error('preset integrado inválido: ' + n);
}
console.log(`${names.length} presets integrados válidos ✓`);

console.log('\nNormalización de presets de partículas OK ✓');
