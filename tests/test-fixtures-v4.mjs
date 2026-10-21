// Vigila los guardados v4 reales del Paso 2 (E0.2): sus invariantes (puntos de habilidad y Paragon
// coherentes, barra válida con fitsSlot, cobertura) y que nadie los edite a mano (_meta.savesSha256).
// `--verify` no importa código del juego, así que sigue valiendo cuando el guardado suba a v5.
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
execFileSync('node', [join(root, 'tools', 'make-v4-saves.mjs'), '--verify'], { stdio: 'inherit', cwd: root });
console.log('Guardados v4 del Paso 2: invariantes ✓');
