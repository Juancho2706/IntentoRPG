// Ejecuta todas las suites; falla si alguna falla.
// Cuarentena del Paso 2 (docs/paso2-implementacion.md §2.2): las suites listadas en
// tests/pending-2g.json se ejecutan igual, pero su fallo no tumba la corrida (⚠️ con su dueño).
// La lista tiene que quedar vacía al cierre (E5).
import { execFileSync } from 'child_process';
import { readdirSync, readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const dir = dirname(fileURLToPath(import.meta.url));
const pendPath = join(dir, 'pending-2g.json');
const pending = existsSync(pendPath) ? (JSON.parse(readFileSync(pendPath, 'utf8')).suites || {}) : {};
const files = readdirSync(dir).filter(f => f.endsWith('.mjs') && f !== 'run.mjs').sort();
let failed = 0, quarantined = 0;
for (const f of files) {
  try {
    execFileSync('node', [join(dir, f)], { stdio: 'pipe' });
    console.log(`✅ ${f}${pending[f] ? '  (en cuarentena pero ya pasa: sácala de pending-2g.json)' : ''}`);
  } catch (e) {
    if (pending[f]) {
      quarantined++;
      console.warn(`⚠️  ${f} en cuarentena · dueño ${pending[f].owner || '?'} · ${pending[f].stage || ''}`);
    } else {
      failed++;
      console.error(`❌ ${f}\n${e.stdout || ''}${e.stderr || ''}`);
    }
  }
}
const tail = quarantined ? ` · ${quarantined} en cuarentena (tests/pending-2g.json)` : '';
console.log(failed ? `\n${failed} suite(s) fallaron${tail}` : `\nTodas las suites en verde${tail}`);
process.exit(failed ? 1 : 0);
