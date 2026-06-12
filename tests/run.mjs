// Ejecuta todas las suites; falla si alguna falla.
import { execFileSync } from 'child_process';
import { readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const dir = dirname(fileURLToPath(import.meta.url));
const files = readdirSync(dir).filter(f => f.endsWith('.mjs') && f !== 'run.mjs').sort();
let failed = 0;
for (const f of files) {
  try {
    execFileSync('node', [join(dir, f)], { stdio: 'pipe' });
    console.log(`✅ ${f}`);
  } catch (e) {
    failed++;
    console.error(`❌ ${f}\n${e.stdout || ''}${e.stderr || ''}`);
  }
}
console.log(failed ? `\n${failed} suite(s) fallaron` : '\nTodas las suites en verde');
process.exit(failed ? 1 : 0);
