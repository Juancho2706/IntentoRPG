// ============================================================
// Chrome headless en TIEMPO REAL para el arnés visual (Paso 2d.2 §7.1)
// ============================================================
// `--virtual-time-budget` congela performance.now() durante el JS síncrono (A7 mediría 0 ms)
// y `--dump-dom` sin él vuelca en el evento load (antes de las mediciones asíncronas). Este
// script lanza Chrome con el protocolo DevTools (WebSocket nativo de Node ≥ 22), abre la URL,
// espera a que exista <pre id="measure"> (o `--wait` ms) y:
//   · imprime su texto (JSON) por stdout;
//   · con --shot=archivo.png guarda una captura de la página.
// Uso (con `npx http-server -p 8094` sirviendo la raíz del repo):
//   node tests/visual/chrome.mjs "http://127.0.0.1:8094/tests/visual/gauges.html?spec=crionte&state=full&measure=1"
//   node tests/visual/chrome.mjs "<url sin measure>" --shot=out.png --size=1200,400 --wait=1500
// No es una suite de `npm test` (vive en tests/visual/, que run.mjs no recorre).
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const args = process.argv.slice(2);
const url = args.find(a => !a.startsWith('--'));
const opt = k => args.find(a => a.startsWith(`--${k}=`))?.split('=').slice(1).join('=');
if (!url) { console.error('uso: node tests/visual/chrome.mjs <url> [--shot=out.png] [--size=W,H] [--wait=ms]'); process.exit(2); }
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const [W, H] = (opt('size') || '1200,500').split(',').map(Number);
const port = 9300 + Math.floor(Math.random() * 500);
const ud = mkdtempSync(join(tmpdir(), 'gz-chrome-'));
const proc = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${port}`,
  `--user-data-dir=${ud}`, `--window-size=${W},${H}`, 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let done = false;
function finish(code) {
  if (done) return; done = true;
  try { proc.kill(); } catch { /* */ }
  setTimeout(() => { try { rmSync(ud, { recursive: true, force: true }); } catch { /* */ } process.exit(code); }, 300);
}
setTimeout(() => { console.error('tiempo agotado'); finish(1); }, 60000);

let target = null;
for (let i = 0; i < 80 && !target; i++) {
  await sleep(150);
  try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(t => t.type === 'page'); } catch { /* aún no */ }
}
if (!target) { console.error('no arrancó Chrome'); finish(1); }
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r, { once: true }));
let seq = 0;
const pending = new Map();
ws.addEventListener('message', ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
});
const cmd = (method, params = {}) => new Promise(r => { const id = ++seq; pending.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
const evaluate = async expr => (await cmd('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result?.result?.value;

await cmd('Page.enable');
await cmd('Runtime.enable');
await cmd('Page.navigate', { url });
const wait = Number(opt('wait') || 0);
if (/[?&]measure=1/.test(url)) {
  for (let i = 0; i < 300; i++) {
    const txt = await evaluate("document.querySelector('pre#measure')?.textContent || ''");
    if (txt) { console.log(txt); break; }
    await sleep(100);
  }
} else await sleep(wait || 1500);
if (wait && /[?&]measure=1/.test(url)) await sleep(wait);
const shot = opt('shot');
if (shot) {
  const r = await cmd('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  writeFileSync(shot, Buffer.from(r.result.data, 'base64'));
  console.error(`captura: ${shot}`);
}
ws.close();
finish(0);
