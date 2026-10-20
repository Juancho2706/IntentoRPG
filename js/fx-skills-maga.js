// ============================================================
// VFX/SFX de las habilidades de la clase MAGA — dueño: trabajador de la clase (2b.1)
// ============================================================
// Stub del Paso 2b.0: js/fx-skills.js FUSIONA estos mapas en SKILL_FX /
// SKILL_FX_PRESETS, así el trabajador no toca archivos compartidos.
//  - MAGA_FX: { idHabilidad: { trail?, impact?, aura?, extra?, auraY?, color?, sfx? } }
//    cada campo es un preset de partículas (objeto parcial, ver js/particles.js) o el
//    NOMBRE de uno existente (string; p. ej. 'fireballBlast'). `sfx` es un nombre de
//    js/sfx.js ('fire', 'ice', 'bolt', 'holy', 'trap', 'chain', 'hit', 'shoot'…).
//  - MAGA_FX_PRESETS: presets nuevos con nombre (se pueden referenciar por string).
// Para reutilizar un preset de fx-skills.js, refiérelo por su NOMBRE (no lo importes:
// fx-skills.js importa este archivo y se formaría un ciclo).
export const MAGA_FX = {};
export const MAGA_FX_PRESETS = {};
