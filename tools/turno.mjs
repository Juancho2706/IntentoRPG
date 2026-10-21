// Turno global para las pruebas pesadas: una sola a la vez en toda la PC, aunque corran
// varios worktrees o workflows (npm test, humo, capturas con Chrome, balance-bench).
// Uso: node tools/turno.mjs <comando> [args…]   (npm test y npm run smoke ya pasan por aquí)
// El candado es una carpeta en el temporal del sistema: se libera al salir, se roba si su
// dueño murió o lo retuvo más de MAX_HOLD, y es reentrante (TURNO_HELD) para no bloquearse solo.
import { spawn } from 'child_process';
import { mkdirSync, rmSync, readFileSync, writeFileSync, statSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const LOCK = join(tmpdir(), 'intentorpg-turno');
const INFO = join(LOCK, 'duenio.json');
const POLL_MS = 2000, AVISO_MS = 60e3, MAX_HOLD_MS = 45 * 60e3, MAX_WAIT_MS = 40 * 60e3, GRACIA_MS = 10e3;

const cmd = process.argv.slice(2);
if (!cmd.length) { console.error('uso: node tools/turno.mjs <comando> [args…]'); process.exit(2); }

const vivo = pid => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };
const leer = () => { try { return JSON.parse(readFileSync(INFO, 'utf8')); } catch { return null; } };
const mio = () => leer()?.pid === process.pid;

// null = turno tomado; si no, el dueño actual (o {} si el candado está recién creado sin datos)
function tomar() {
  try { mkdirSync(LOCK); } catch (e) {
    if (e.code !== 'EEXIST') throw e;
    const d = leer();
    if (!d) {
      let edad = Infinity;
      try { edad = Date.now() - statSync(LOCK).mtimeMs; } catch { return tomar(); }
      if (edad < GRACIA_MS) return {};
    } else if (vivo(d.pid) && Date.now() - d.t < MAX_HOLD_MS) return d;
    // dueño muerto o colgado: se roba solo si nadie lo cambió entretanto
    const otra = leer();
    if (d && otra && (otra.pid !== d.pid || otra.t !== d.t)) return otra;
    console.warn(`⚠️  turno: libero el candado de ${d ? `pid ${d.pid} (${d.cmd})` : 'un dueño sin datos'}`);
    rmSync(LOCK, { recursive: true, force: true });
    return tomar();
  }
  writeFileSync(INFO, JSON.stringify({ pid: process.pid, t: Date.now(), cwd: process.cwd(), cmd: cmd.join(' ') }));
  return null;
}

function soltar() { if (mio()) rmSync(LOCK, { recursive: true, force: true }); }

function correr() {
  const env = { ...process.env, TURNO_HELD: '1' };
  const q = a => (/[\s"]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a);
  const child = cmd[0] === 'node'
    ? spawn(process.execPath, cmd.slice(1), { stdio: 'inherit', env })
    : spawn(cmd.map(q).join(' '), { stdio: 'inherit', env, shell: true });
  const cortar = () => { try { child.kill(); } catch {} soltar(); process.exit(130); };
  process.on('SIGINT', cortar);
  process.on('SIGTERM', cortar);
  child.on('exit', (code, sig) => { soltar(); process.exit(code ?? (sig ? 1 : 0)); });
  child.on('error', e => { console.error(e.message); soltar(); process.exit(1); });
}

if (process.env.TURNO_HELD === '1') correr();
else {
  const t0 = Date.now();
  let ultimoAviso = 0;
  const intentar = () => {
    const d = tomar();
    if (!d) {
      if (ultimoAviso) console.log(`▶️  turno tomado tras ${Math.round((Date.now() - t0) / 1000)} s`);
      return correr();
    }
    if (!vivo(process.ppid)) process.exit(1); // quien me lanzó ya no está: no corro huérfano
    if (Date.now() - t0 > MAX_WAIT_MS) {
      console.error(`❌ turno: ${Math.round(MAX_WAIT_MS / 60e3)} min esperando; reintenta más tarde`);
      process.exit(75);
    }
    if (Date.now() - ultimoAviso > AVISO_MS) {
      ultimoAviso = Date.now();
      const hace = d.t ? `${Math.round((Date.now() - d.t) / 1000)} s` : '?';
      console.log(`⏳ esperando turno: lo tiene «${d.cmd || '?'}» (pid ${d.pid || '?'}, hace ${hace}, ${d.cwd || '?'})`);
    }
    setTimeout(intentar, POLL_MS);
  };
  intentar();
}
