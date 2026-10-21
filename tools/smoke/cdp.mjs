// ============================================================
// Cliente CDP sin dependencias para el humo (Paso 2 · E0.5, docs/paso2-implementacion.md §6)
// ============================================================
// Mismo enfoque que tests/visual/chrome.mjs (Chrome sin ventana + DevTools Protocol por el
// WebSocket nativo de Node ≥ 22, sin puppeteer), pero como MÓDULO reutilizable:
//   · launchChrome({ width, height, angle, chromePath }) → { port, proc, newPage(), close() }
//     Perfil nuevo en una carpeta temporal en cada corrida (sin guardados del dueño); el puerto
//     sale de DevToolsActivePort (--remote-debugging-port=0: varias corridas en paralelo no chocan).
//   · CdpPage: send(method, params), on(event, fn), evaluate(expr | fn, arg), close().
// tests/visual/chrome.mjs es un script (lee argv y sale al terminar): no se puede importar.
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const DEFAULT_CHROME = process.env.CHROME_PATH || process.env.CHROME
  || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const sleep = ms => new Promise(r => setTimeout(r, ms));

// banderas de GL: swiftshader (por defecto: CPU, igual en cualquier máquina; ~3 fps con el
// post-procesado), d3d11 (GPU real en Windows, ~60 fps) o default (lo que elija Chrome)
const ANGLE_ARGS = {
  swiftshader: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  d3d11: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'],
  default: [],
};

export async function launchChrome({ width = 1920, height = 1080, angle = 'swiftshader', chromePath = DEFAULT_CHROME, extraArgs = [] } = {}) {
  if (!existsSync(chromePath)) throw new Error(`no encuentro Chrome en ${chromePath} (usa CHROME_PATH o --chrome)`);
  const ud = mkdtempSync(join(tmpdir(), 'irpg-smoke-'));
  const args = ['--headless=new', '--hide-scrollbars', '--remote-debugging-port=0', `--user-data-dir=${ud}`,
    `--window-size=${width},${height}`, '--no-first-run', '--no-default-browser-check', '--mute-audio',
    '--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
    ...(ANGLE_ARGS[angle] || ANGLE_ARGS.swiftshader), ...extraArgs, 'about:blank'];
  const proc = spawn(chromePath, args, { stdio: 'ignore' });
  let exited = false;
  proc.on('exit', () => { exited = true; });
  const close = async () => {
    try { proc.kill(); } catch { /* ya cerrado */ }
    for (let i = 0; i < 20 && !exited; i++) await sleep(100);
    for (let i = 0; i < 10; i++) {   // Windows suelta los ficheros del perfil con retraso
      try { rmSync(ud, { recursive: true, force: true }); break; } catch { await sleep(200); }
    }
  };
  // DevToolsActivePort: 1.ª línea = puerto, 2.ª = ruta del WebSocket del navegador
  let port = 0;
  for (let i = 0; i < 150 && !port && !exited; i++) {
    await sleep(100);
    try { port = Number(readFileSync(join(ud, 'DevToolsActivePort'), 'utf8').split(/\r?\n/)[0]) || 0; } catch { /* aún no */ }
  }
  if (!port) { await close(); throw new Error('Chrome no arrancó (sin DevToolsActivePort en 15 s)'); }
  const http = `http://127.0.0.1:${port}`;
  const version = await (await fetch(`${http}/json/version`)).json();
  // la pestaña about:blank que abre Chrome
  let target = null;
  for (let i = 0; i < 50 && !target; i++) {
    try { target = (await (await fetch(`${http}/json/list`)).json()).find(t => t.type === 'page'); } catch { /* aún no */ }
    if (!target) await sleep(100);
  }
  if (!target) { await close(); throw new Error('Chrome sin pestaña inicial'); }
  return {
    port, proc, version, userDataDir: ud, close,
    async firstPage() { const pg = new CdpPage(target.webSocketDebuggerUrl); await pg.open(); return pg; },
  };
}

export class CdpPage {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.seq = 0;
    this.pending = new Map();
    this.listeners = new Map();
    this.closed = false;
  }
  async open() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((res, rej) => {
      this.ws.addEventListener('open', res, { once: true });
      this.ws.addEventListener('error', () => rej(new Error('WebSocket de CDP: error al abrir')), { once: true });
    });
    this.ws.addEventListener('message', ev => {
      const m = JSON.parse(typeof ev.data === 'string' ? ev.data : Buffer.from(ev.data).toString('utf8'));
      if (m.id && this.pending.has(m.id)) {
        const { res, rej, timer } = this.pending.get(m.id);
        clearTimeout(timer);
        this.pending.delete(m.id);
        if (m.error) rej(new Error(`${m.error.message}${m.error.data ? ` (${m.error.data})` : ''}`));
        else res(m.result || {});
      } else if (m.method) {
        for (const fn of this.listeners.get(m.method) || []) { try { fn(m.params || {}); } catch (e) { console.error('[cdp] oyente', m.method, e); } }
      }
    });
    this.ws.addEventListener('close', () => {
      this.closed = true;
      for (const { rej, timer } of this.pending.values()) { clearTimeout(timer); rej(new Error('CDP cerrado')); }
      this.pending.clear();
    });
  }
  send(method, params = {}, { timeout = 120000 } = {}) {
    if (this.closed) return Promise.reject(new Error('CDP cerrado'));
    return new Promise((res, rej) => {
      const id = ++this.seq;
      const timer = setTimeout(() => { this.pending.delete(id); rej(new Error(`CDP ${method}: sin respuesta en ${timeout} ms`)); }, timeout);
      this.pending.set(id, { res, rej, timer });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  on(method, fn) {
    if (!this.listeners.has(method)) this.listeners.set(method, []);
    this.listeners.get(method).push(fn);
    return () => { const l = this.listeners.get(method) || []; const i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); };
  }
  // evaluate('expr') o evaluate(fn, arg): la función se serializa con toString() y se llama con
  // `arg` en JSON (no puede capturar variables de Node). Espera promesas y devuelve el valor.
  async evaluate(fnOrExpr, arg, { timeout = 120000 } = {}) {
    const expression = typeof fnOrExpr === 'function' ? `(${fnOrExpr.toString()})(${JSON.stringify(arg ?? null)})` : String(fnOrExpr);
    const r = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true }, { timeout });
    if (r.exceptionDetails) {
      const d = r.exceptionDetails;
      throw new Error(`evaluate: ${d.exception?.description || d.text || 'excepción'}`.split('\n').slice(0, 4).join(' | '));
    }
    return r.result?.value;
  }
  // espera a que `fn(arg)` en la página devuelva algo verdadero (sondeo cada `every` ms)
  async waitFor(fn, arg, { timeout = 20000, every = 100 } = {}) {
    const t0 = Date.now();
    let last;
    while (Date.now() - t0 < timeout) {
      try { last = await this.evaluate(fn, arg); if (last) return last; } catch { /* la página aún navega */ }
      await sleep(every);
    }
    return null;
  }
  async close() {
    try { this.ws?.close(); } catch { /* */ }
  }
}

export { sleep };
