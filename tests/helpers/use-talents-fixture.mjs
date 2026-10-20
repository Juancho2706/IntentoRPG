// Importa este módulo ANTES de importar dinámicamente js/talents.js:
//   import './helpers/use-talents-fixture.mjs';
//   const T = await import('../js/talents.js');
// y talents.js usará tests/fixtures/talents-sample.mjs como datos por clase.
import { register } from 'node:module';
register('./talents-fixture-hooks.mjs', import.meta.url);
