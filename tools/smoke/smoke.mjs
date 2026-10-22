#!/usr/bin/env node
// ============================================================
// Test de humo del juego en Chrome sin ventana (Paso 2 · E0.5, docs/paso2-implementacion.md §6)
// ============================================================
// npm run smoke -- [--level boot|panels|full|bench] [--port 8099] [--res 1920x1080,1366x768]
//                  [--classes guerrero,maga,arquera] [--compare] [--strict-dom] [--write-baseline]
//                  [--angle swiftshader|d3d11|default] [--chrome <ruta>] [--bench-seconds 60] [--bench-runs 5]
//                  [--max-saves N]
//
// Sin dependencias (Node ≥ 22: WebSocket y fetch globales). NO entra en `npm test` (necesita Chrome):
// lo corre cada trabajador al terminar su etapa y el orquestador en cada juicio.
//   1. Servidor estático propio (server.mjs) sobre la raíz del repo.
//   2. Chrome sin ventana, perfil nuevo en cada corrida (cdp.mjs; mismo enfoque que tests/visual/chrome.mjs).
//   3. CDP: Runtime, Log, Page, Network (sin service worker ni caché) y Fetch, que sirve
//      three@0.160.0 desde node_modules/three (funciona sin red).
//   4. Son ERROR: Runtime.exceptionThrown, console.error, Log de nivel error y los fallos de carga
//      del mismo origen (también los 404 del servidor). Cualquier error falla la corrida.
//   5. Navega a index.html?dev&hudcheck=1 y espera __game.state === 'select' (20 s).
// Niveles (acumulativos: panels ⊃ boot, full ⊃ panels):
//   boot   por clase: hudcheck en la selección, startGame(<clase>, {}, 7), 3 s de juego (frames),
//          Nv10 y cada especialización, combate en una mazmorra con semilla fija lanzando (y soltando)
//          las 6 ranuras 5 s por especialización, ranuras 3/4 llenas a Nv15 (solo CATALOG_V = 2),
//          botones acordes con eventos reales (🖱️Izq y luego 🖱️Der, §3.6.1) y HUD en partida
//          (hudCheck) sin solapes a cada resolución.
//   panels por clase y especialización a Nv 10/40/69/70/100 (contrato de DOM §3.12): talentos (N) y libro (T).
//          Los pasos que no encuentran la raíz del DOM (#talents-panel, #skills-book) quedan «skipped»
//          (hasta E3); con --strict-dom fallan.
//   full   + saves v4 de tests/fixtures/saves-v4-paso2.json → v5, verbos con eventos reales (carga,
//          relanzar, postura) y 60 s simulados con 30 enemigos: coste medio del tick de simulación
//          ≤ 1,25 × tools/smoke/baseline.json (normalizado con una calibración intercalada; ver benchClass).
//   bench  solo la medición del tick (con --write-baseline escribe tools/smoke/baseline.json).
// GL: por defecto SwiftShader (CPU; igual en cualquier máquina; ~1–3 fps: boot ≈ 2,5 min); con GPU,
// --angle d3d11 (Windows) va a ~45 fps y boot tarda ≈ 40 s. La medición del tick no renderiza.
// Salida: tools/smoke/out/report.json ({ ok, level, errors[], warnings[], steps[{ name, ok, ms, detail }] })
// y capturas en tools/smoke/out/. Código de salida 1 si algo falla.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { cpus, platform, release } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { launchChrome, sleep } from './cdp.mjs';
import { startServer } from './server.mjs';
import { pageLib } from './page-lib.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const OUT = join(HERE, 'out');
const BASELINE = join(HERE, 'baseline.json');
const THREE_CDN = 'https://cdn.jsdelivr.net/npm/three@0.160.0/';
const ALL_CLASSES = ['guerrero', 'maga', 'arquera'];
const LEVELS = ['boot', 'panels', 'full', 'bench'];
const SLOT = 7;                       // hueco de guardado del humo (los del jugador son 0–2)
const PANEL_LEVELS = [10, 40, 69, 70, 100];
const NODE_COUNTS = { cls: 30, spec: 29, hero: 13 };
const NODE_STATES = new Set(['locked', 'avail', 'partial', 'max', 'paused']);
const TICK_LIMIT = 1.25;              // §6: coste medio del tick ≤ 1,25 × la línea base
const BENCH = { seconds: 60, warmup: 2, dt: 1 / 60, enemies: 30, level: 10, floor: 3, seed: 424242,
  slots: ['lmb', 'rmb', 'k2', 'k3', 'k4'], roster: ['zombi', 'esqueleto', 'esqueleto', 'brujo', 'demonio'] };

// ---------- argumentos ----------
const argv = process.argv.slice(2);
const flag = k => argv.includes(`--${k}`);
const opt = (k, d) => {
  const i = argv.findIndex(a => a === `--${k}` || a.startsWith(`--${k}=`));
  if (i < 0) return d;
  const a = argv[i];
  return a.includes('=') ? a.split('=').slice(1).join('=') : (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d);
};
if (flag('help') || flag('h')) {
  const lines = readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1);
  console.log(lines.slice(0, lines.findIndex(l => !l.startsWith('//'))).map(l => l.replace(/^\/\/ ?/, '')).join('\n'));
  process.exit(0);
}
const level = opt('level', 'boot');
if (!LEVELS.includes(level)) { console.error(`--level debe ser uno de ${LEVELS.join(', ')}`); process.exit(2); }
const RES = String(opt('res', '1920x1080,1366x768')).split(',').map(s => {
  const [w, h] = s.trim().toLowerCase().split('x').map(Number);
  if (!(w > 0 && h > 0)) { console.error(`--res mal escrita: ${s}`); process.exit(2); }
  return { w, h, label: `${w}x${h}` };
});
const CLASSES = String(opt('classes', ALL_CLASSES.join(','))).split(',').map(s => s.trim()).filter(Boolean);
for (const c of CLASSES) if (!ALL_CLASSES.includes(c)) { console.error(`clase desconocida: ${c}`); process.exit(2); }
const STRICT_DOM = flag('strict-dom');
const COMPARE = flag('compare');
const WRITE_BASELINE = flag('write-baseline');
const ANGLE = opt('angle', 'swiftshader');
const BENCH_SECONDS = Number(opt('bench-seconds', BENCH.seconds));
const BENCH_RUNS = Math.max(1, Number(opt('bench-runs', 5)) | 0);
const MAX_SAVES = Number(opt('max-saves', Infinity));
const runs = l => LEVELS.indexOf(level) >= LEVELS.indexOf(l) && level !== 'bench';

// ---------- informe ----------
const report = { ok: true, level, startedAt: new Date().toISOString(), ms: 0, chrome: null, angle: ANGLE, res: RES.map(r => r.label),
  classes: CLASSES, errors: [], warnings: [], steps: [], bench: null, shots: [] };
let current = '(arranque)';
const seenErr = new Set();
let foreignPage = false;   // --compare navega al mockup: sus errores son avisos, no del juego
function addError(kind, text, extra = {}) {
  if (foreignPage) { addWarning(`mockup:${kind}`, text, extra); return; }
  const key = `${kind}|${text}|${extra.url || ''}`;
  if (seenErr.has(key)) return;
  seenErr.add(key);
  const e = { kind, text: String(text).slice(0, 2000), step: current, ...extra };
  report.errors.push(e);
  console.error(`   ✖ [${kind}] ${e.text.split('\n')[0]}${extra.url ? ` (${extra.url}${extra.line != null ? `:${extra.line}` : ''})` : ''}`);
}
function addWarning(kind, text, extra = {}) {
  if (report.warnings.length >= 300) return;
  report.warnings.push({ kind, text: String(text).slice(0, 600), step: current, ...extra });
}
const SKIP = reason => ({ __skip: true, reason });
async function step(name, fn) {
  const t0 = Date.now();
  const before = report.errors.length;
  current = name;
  const rec = { name, ok: true, ms: 0, detail: null };
  try {
    const r = await fn();
    if (r && r.__skip) {
      if (STRICT_DOM && r.dom) { rec.ok = false; rec.detail = `falta el DOM de §3.12: ${r.reason}`; }
      else { rec.skipped = true; rec.detail = r.reason; }
    } else {
      rec.detail = r ?? null;
      if (r && r.ok === false) rec.ok = false;
    }
  } catch (e) {
    rec.ok = false;
    rec.detail = e?.message || String(e);
  }
  await sleep(30);   // deja llegar los eventos de error rezagados del paso
  if (report.errors.length > before) { rec.ok = false; rec.errors = report.errors.length - before; }
  rec.ms = Date.now() - t0;
  report.steps.push(rec);
  const mark = rec.skipped ? '⏭️ ' : rec.ok ? '✅' : '❌';
  const det = rec.skipped || !rec.ok ? ` — ${typeof rec.detail === 'string' ? rec.detail : JSON.stringify(rec.detail)}`.slice(0, 400) : '';
  console.log(`${mark} ${name} (${rec.ms} ms)${det}`);
  return rec;
}
const check = (cond, msg, detail) => { if (!cond) { const e = new Error(msg + (detail !== undefined ? ` · ${JSON.stringify(detail)}` : '')); throw e; } };

// ---------- utilidades ----------
function findThree() {
  for (let d = ROOT; ; d = dirname(d)) {
    const p = join(d, 'node_modules', 'three');
    if (existsSync(join(p, 'build', 'three.module.js'))) return p;
    if (dirname(d) === d) return null;
  }
}
function gitHead() {
  try { return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(); } catch { return null; }
}
const evalLib = (page, expr) => page.evaluate(`window.__smokeLib.${expr}`);
const L = (page, fn, ...args) => page.evaluate(`window.__smokeLib.${fn}(${args.map(a => JSON.stringify(a)).join(',')})`);

function waitEvent(page, method, timeout = 30000) {
  return new Promise((res, rej) => {
    const off = page.on(method, p => { clearTimeout(t); off(); res(p); });
    const t = setTimeout(() => { off(); rej(new Error(`${method}: no llegó en ${timeout} ms`)); }, timeout);
  });
}

async function setRes(page, r) {
  await page.send('Emulation.setDeviceMetricsOverride', { width: r.w, height: r.h, deviceScaleFactor: 1, mobile: false });
}

async function shot(page, name) {
  const file = join(OUT, `${name}.png`);
  const r = await page.send('Page.captureScreenshot', { format: 'png' }, { timeout: 60000 });
  writeFileSync(file, Buffer.from(r.data, 'base64'));
  report.shots.push(file);
  return file;
}

// carga el juego y espera la pantalla de selección; inyecta la biblioteca del humo
async function loadGame(page, origin, query = 'dev&hudcheck=1') {
  const fired = waitEvent(page, 'Page.loadEventFired', 30000);
  await page.send('Page.navigate', { url: `${origin}/index.html?${query}` });
  await fired;
  const ok = await page.waitFor(() => !!(window.__game && window.__game.ui && window.__game.state === 'select' && document.readyState === 'complete'), null, { timeout: 20000 });
  check(ok, "el juego no llegó a __game.state === 'select' en 20 s");
  await page.evaluate(pageLib);
  await evalLib(page, 'install()');
}

// ratón con eventos reales (CDP Input): buttons = máscara de botones pulsados (izq 1, der 2)
const mouse = (page, type, x, y, button = 'none', buttons = 0) =>
  page.send('Input.dispatchMouseEvent', { type, x, y, button, buttons, clickCount: type === 'mouseMoved' ? 0 : 1, pointerType: 'mouse' });
async function click(page, x, y, button = 'left') {
  const bit = button === 'right' ? 2 : 1;
  await mouse(page, 'mouseMoved', x, y);
  await mouse(page, 'mousePressed', x, y, button, bit);
  await mouse(page, 'mouseReleased', x, y, button, 0);
}
const VK = { Digit1: 49, Digit2: 50, Digit3: 51, Digit4: 52, KeyZ: 90, KeyN: 78, KeyT: 84, Escape: 27 };
async function key(page, code, type = 'both', modifiers = 0) {
  const k = code.startsWith('Digit') ? code.slice(5) : code.startsWith('Key') ? code.slice(3).toLowerCase() : code;
  const base = { code, key: k, windowsVirtualKeyCode: VK[code] || 0, nativeVirtualKeyCode: VK[code] || 0, modifiers };
  if (type !== 'up') await page.send('Input.dispatchKeyEvent', { type: 'keyDown', ...base, ...(k.length === 1 && !modifiers ? { text: k } : {}) });
  if (type !== 'down') await page.send('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
}

// ============================================================
// Comprobaciones globales
// ============================================================
function swAssetsStep() {
  return step('sw.js · cada ruta precargada existe (cache.addAll falla entera con un 404)', () => {
    const sw = readFileSync(join(ROOT, 'sw.js'), 'utf8');
    const paths = [...new Set([...sw.matchAll(/'(\.\/[^']*)'/g)].map(m => m[1]))];
    const missing = paths.filter(p => !existsSync(p === './' ? join(ROOT, 'index.html') : join(ROOT, p)));
    const ext = [...new Set([...sw.matchAll(/'(https:\/\/[^']+)'/g)].map(m => m[1]))];
    const three = findThree();
    const extMissing = ext.filter(u => u.startsWith(THREE_CDN) && !(three && existsSync(join(three, u.slice(THREE_CDN.length)))));
    check(missing.length === 0, `faltan ${missing.length} ruta(s) de sw.js`, missing.slice(0, 20));
    return { rutas: paths.length, externas: ext.length, sinCopiaLocal: extMissing };
  });
}

// ============================================================
// boot (§6)
// ============================================================
// un punto de la zona de combate donde el lienzo del juego recibe el ratón
const canvasPoint = page => page.evaluate(() => {
  const cv = window.__game.renderer.domElement, w = innerWidth, h = innerHeight;
  for (const [fx, fy] of [[0.5, 0.42], [0.42, 0.45], [0.58, 0.45], [0.5, 0.55], [0.35, 0.35], [0.65, 0.35]]) {
    const x = Math.round(w * fx), y = Math.round(h * fy);
    if (document.elementFromPoint(x, y) === cv) return { x, y };
  }
  // qué capa tapa el centro (para el detalle del fallo)
  const el = document.elementFromPoint(Math.round(w * 0.5), Math.round(h * 0.42));
  const path = [];
  for (let n = el; n && n !== document.body && path.length < 4; n = n.parentElement) path.push(n.tagName.toLowerCase() + (n.id ? '#' + n.id : '') + (n.classList.length ? '.' + [...n.classList].join('.') : ''));
  return { blocked: path.join(' < ') || String(el), panel: window.__game.ui?.activePanel || null };
});

// punto de pantalla de un enemigo vivo a más de 3 m (el más cercano), si el lienzo recibe ahí el
// ratón; null si no hay ninguno
const enemyPoint = page => page.evaluate(() => {
  const g = window.__game, p = g.player, cv = g.renderer.domElement, r = cv.getBoundingClientRect();
  const es = (g.enemies || []).filter(e => e.alive && e.pos.distanceTo(p.pos) > 3).sort((a, b) => a.pos.distanceTo(p.pos) - b.pos.distanceTo(p.pos));
  for (const e of es) {
    const v = e.pos.clone(); v.y = 0.5; v.project(g.camera);
    const x = Math.round(r.left + (v.x + 1) / 2 * r.width), y = Math.round(r.top + (1 - v.y) / 2 * r.height);
    if (document.elementFromPoint(x, y) === cv) return { x, y, d: +e.pos.distanceTo(p.pos).toFixed(1) };
  }
  return null;
});

// el aviso de Nv10 puede abrir el selector de especialización (pantalla completa) entre
// setLevel y chooseSpec, y el panel sigue abierto tras elegir: se cierra antes del ratón real
// y se espera al frame que quita la pausa (con la partida en pausa no arranca ninguna carga)
async function closePanels(page) {
  await page.evaluate('window.__game.ui?.closePanel?.()');
  await page.waitFor(() => !window.__game._paused, null, { timeout: 5000 });
}

async function chordStep(page, cls, info) {
  return step(`${cls} · botones acordes con eventos reales (🖱️Izq y luego 🖱️Der, §3.6.1)`, async () => {
    await closePanels(page);
    const pt = await canvasPoint(page);
    check(pt && !pt.blocked, 'ningún punto de la zona de combate deja el ratón al lienzo (¿una capa lo tapa?)', pt);
    const held = () => page.evaluate('({ ...window.__game.input.mouseHeld })');
    await mouse(page, 'mouseMoved', pt.x, pt.y);
    await mouse(page, 'mousePressed', pt.x, pt.y, 'left', 1);
    await sleep(60);
    const a = await held();
    await mouse(page, 'mousePressed', pt.x, pt.y, 'right', 3);   // con 🖱️Izq pulsado: Pointer Events no da pointerdown
    await sleep(60);
    const b = await held();
    // con el contrato de W2: si la ranura DER carga (charge), 0,5 s simulados con los dos botones
    // mantenidos deben dejar una carga en curso (el Martillo del Cruzado mientras el básico ataca)
    let carga = null;
    if (info.has.releaseSkillSlot) {
      const rmbCharges = await page.evaluate(() => {
        const p = window.__game.player, id = p.hotbar?.rmb;
        return !!p.cls.skills.find(s => s.id === id)?.charge;
      });
      if (rmbCharges) {
        const seen = await page.evaluate('window.__smokeLib.step(30, 1/60, true)');
        carga = seen.some(v => v.charging);
        check(carga, 'con 🖱️Izq y 🖱️Der mantenidos, la carga de la ranura DER no empezó');
      }
    }
    await mouse(page, 'mouseReleased', pt.x, pt.y, 'right', 1);
    await sleep(60);
    const c = await held();
    await mouse(page, 'mouseReleased', pt.x, pt.y, 'left', 0);
    await sleep(60);
    const d = await held();
    const seq = { izq: a, izqDer: b, soltarDer: c, soltarTodo: d };
    check(a.l, 'pulsar 🖱️Izq no marcó mouseHeld.l', seq);
    check(!d.l && !d.r, 'soltar los dos botones no vació mouseHeld', seq);
    // el contrato de D27 (mouseHeld desde e.buttons) llega con W2: se exige cuando existe releaseSkillSlot
    const contract = info.has.releaseSkillSlot;
    if (contract) {
      check(b.l && b.r, 'con 🖱️Izq pulsado, 🖱️Der no marcó mouseHeld.r (D27: usar e.buttons)', seq);
      check(c.l && !c.r, 'soltar 🖱️Der debe dejar 🖱️Izq mantenido', seq);
    }
    return { punto: pt, ...seq, cargaDer: carga, contratoD27: contract ? 'exigido' : 'aún no (sin releaseSkillSlot): solo se anota' };
  });
}

async function bootClass(page, origin, cls) {
  const r = await step(`${cls} · carga (index.html?dev&hudcheck=1)`, async () => { await loadGame(page, origin); return { ok: true }; });
  if (!r.ok) return false;
  await step(`${cls} · hudcheck en la selección (peor caso)`, async () => {
    const m = await page.waitFor(() => document.querySelector('pre#measure')?.textContent || '', null, { timeout: 5000 });
    check(m, 'hudcheck no volcó <pre id="measure">');
    const j = JSON.parse(m);
    check(!j.solapes?.length && !j.fuera?.length, 'el HUD se solapa o se sale', { solapes: j.solapes, fuera: j.fuera });
    return { res: j.res, s: j.s, solapes: j.solapes, fuera: j.fuera };
  });
  const st = await step(`${cls} · startGame('${cls}', {}, ${SLOT})`, async () => {
    const s = await L(page, 'start', cls, SLOT);
    check(s.state === 'play', `state = ${s.state}`);
    check(s.cls === cls, `clase = ${s.cls}`);
    check(s.hud, 'el HUD no está visible');
    return s;
  });
  if (!st.ok) return false;
  await step(`${cls} · 3 s de juego (el bucle avanza)`, async () => {
    // con SwiftShader (y la máquina cargada) los primeros frames compilan shaders y pueden tardar
    // segundos: 3 s de juego y, si aún no hay 2 frames, hasta 15 s más
    const f0 = await evalLib(page, 'frames');
    const t0 = Date.now();
    await sleep(3000);
    let f1 = await evalLib(page, 'frames');
    while (f1 - f0 < 2 && Date.now() - t0 < 18000) { await sleep(500); f1 = await evalLib(page, 'frames'); }
    const secs = (Date.now() - t0) / 1000;
    const state = await page.evaluate('window.__game.state');
    check(f1 - f0 >= 2, `el contador de frames no avanza (${f0} → ${f1} en ${secs} s)`);
    check(state === 'play', `state = ${state}`);
    return { frames: f1 - f0, segundos: secs, fps: Math.round(((f1 - f0) / secs) * 10) / 10 };
  });
  let info = null;
  const ci = await step(`${cls} · datos de la clase (talents.js, skills-${cls}.js, save-schema.js)`, async () => {
    info = await L(page, 'classInfo', cls);
    return info;
  });
  if (!ci.ok) return false;
  const specs = info.specs.map(s => s.id);
  await step(`${cls} · Nv10 y cada especialización (${specs.join(', ')})`, async () => {
    check(specs.length > 0, 'la clase no tiene especializaciones');
    const lv = await L(page, 'setLevel', 10);
    check(lv.level === 10, `nivel ${lv.level}`);
    const out = {};
    for (const s of specs) {
      const c = await L(page, 'chooseSpec', s);
      check(c.ok && c.spec === s, `chooseSpec('${s}') falló`, c);
      out[s] = c.hotbar;
    }
    return { catalogV: info.catalogV, talentsV: info.talentsV, saveVersion: info.saveVersion, has: info.has, barras: out };
  });
  await step(`${cls} · combate en mazmorra: 6 ranuras 5 s por especialización`, async () => {
    const arena = await L(page, 'enterArena', { floor: BENCH.floor, seed: BENCH.seed });
    check(arena.type === 'dungeon', `mundo ${arena.type}`);
    const out = {};
    for (const s of specs) {
      const c = await L(page, 'chooseSpec', s);
      check(c.ok, `chooseSpec('${s}') en la mazmorra`, c);
      await L(page, 'clearEnemies');
      const n = await L(page, 'spawnRing', { n: 8, floor: BENCH.floor });
      check(n > 0, 'no hay casillas libres para los enemigos');
      // 5 s simulados a 60 Hz; uno de cada 60 ticks se renderiza (shaders y VFX de las habilidades)
      const d = await L(page, 'drive', { seconds: 5, renderEvery: 60, slots: ['lmb', 'rmb', 'k1', 'k2', 'k3', 'k4'] });
      const okCasts = Object.values(d.castsOk).reduce((a, b) => a + b, 0);
      check(d.state === 'play', `state = ${d.state}`, d);
      check(d.pausedTicks === 0, `simulación en pausa ${d.pausedTicks} ticks (panel ${d.panelAtEnd || d.panelAtStart})`);
      check(okCasts > 0, `ningún lanzamiento salió con ${s}`, d.castsOk);
      out[s] = { enemigos: n, lanzados: d.castsOk, muertes: d.deaths, vivosAlFinal: d.enemies };
    }
    return out;
  });
  await step(`${cls} · ranuras 3 y 4 con habilidad a Nv15`, async () => {
    if (info.catalogV !== 2) return SKIP(`CATALOG_V = ${info.catalogV}: la afirmación se activa con el catálogo v2 (KA1)`);
    await L(page, 'setLevel', 15);
    const out = {};
    for (const s of specs) {
      const c = await L(page, 'chooseSpec', s);
      check(c.ok, `chooseSpec('${s}')`, c);
      check(c.hotbar.k3 && c.hotbar.k4, `${s}: ranura 3 o 4 vacía a Nv15`, c.hotbar);
      out[s] = c.hotbar;
    }
    return out;
  });
  await chordStep(page, cls, info);
  for (const res of RES) {
    await step(`${cls} · HUD en partida ${res.label} (hudCheck sin solapes)`, async () => {
      await setRes(page, res);
      await sleep(400);
      const m = await evalLib(page, 'hudCheck()');
      check(m, 'hudCheck() no devolvió medidas');
      await shot(page, `boot-${cls}-${res.label}`);
      check(!m.solapes.length && !m.fuera.length, 'el HUD se solapa o se sale', m);
      return m;
    });
  }
  await setRes(page, RES[0]);
  return true;
}

// ============================================================
// panels (§6, contrato de DOM §3.12)
// ============================================================
const PANEL_DOM = {
  talents: { root: '#talents-panel', open: () => window.__game.ui.openTalents() },
  book: { root: '#skills-book', open: () => window.__game.ui.togglePanel('skills') },
};
async function openPanel(page, which) {
  await page.evaluate('window.__uicheck = null; window.__game.ui.closeAllPanels?.()');
  await page.evaluate(PANEL_DOM[which].open);
  const sel = PANEL_DOM[which].root;
  const ok = await page.waitFor(s => { const el = document.querySelector(s); return !!(el && el.hasAttribute('data-open') && el.dataset.open !== 'false'); }, sel, { timeout: 2500 });
  return !!ok;
}
async function uiCheck(page) {
  // el panel mide 450 ms después de su último repintado y, con SwiftShader (1–3 fps), el repintado tras
  // cambiar la resolución puede tardar más de 1 s: con 2,5 s fallaba al azar (también antes del reorden de talentos)
  const u = await page.waitFor(() => window.__uicheck && window.__uicheck.panel ? window.__uicheck : null, null, { timeout: 6000 });
  check(u, 'sin window.__uicheck tras abrir el panel (¿?talentscheck=1 / ?skillscheck=1 y check()?)');
  return { panel: u.panel, overlaps: u.overlaps || [], offscreen: u.offscreen || [] };
}
const nodeRects = (page, tree) => page.evaluate(t => [...document.querySelectorAll(`#talents-panel [data-tree="${t}"] .tn[data-node]`)].map(el => {
  const r = el.getBoundingClientRect();
  return { id: el.dataset.node, state: el.dataset.state, x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), w: r.width };
}), tree);
const spentOf = info => Object.values(info || {}).reduce((s, v) => s + (v && typeof v === 'object' && typeof v.spent === 'number' ? v.spent : typeof v === 'number' ? -v : 0), 0);

async function talentsPanelSteps(page, cls, spec, lvl) {
  const tag = `${cls}/${spec} Nv${lvl}`;
  const opened = await openPanel(page, 'talents');
  if (!opened) {
    await step(`${tag} · talentos (N)`, async () => ({ ...SKIP('no aparece #talents-panel[data-open] (llega con U1/U3 en E3)'), dom: true }));
    return;
  }
  await step(`${tag} · talentos: nodos y estados`, async () => {
    const out = {};
    for (const t of ['cls', 'spec', 'hero']) {
      const nodes = await nodeRects(page, t);
      const bad = nodes.filter(n => !NODE_STATES.has(n.state)).map(n => `${n.id}:${n.state}`);
      check(nodes.length === NODE_COUNTS[t], `árbol ${t}: ${nodes.length} nodos (se esperan ${NODE_COUNTS[t]})`);
      check(!bad.length, `estados desconocidos en ${t}`, bad);
      out[t] = nodes.reduce((m, n) => { m[n.state] = (m[n.state] || 0) + 1; return m; }, {});
    }
    if (lvl === 69) check(Object.keys(out.hero).every(s => s === 'locked' || s === 'paused'), 'a Nv69 el Paragon debe estar en gris', out.hero);
    if (lvl === 70) check(Object.keys(out.hero).some(s => s !== 'locked'), 'a Nv70 el Paragon debe revelarse', out.hero);
    return out;
  });
  await step(`${tag} · talentos: clic derecho quita, clic sube, Ctrl+Z restaura`, async () => {
    const info0 = await page.evaluate('window.__game.talentPointsInfo()');
    const code0 = await page.evaluate('window.__game.exportTalentCode()');
    const cands = [...(await nodeRects(page, 'spec')), ...(await nodeRects(page, 'cls'))].filter(n => n.state === 'max' || n.state === 'partial').reverse();
    if (!cands.length) return { nota: 'sin nodos con rango a este nivel' };
    let node = null;
    for (const n of cands.slice(0, 12)) {
      await click(page, n.x, n.y, 'right');
      await sleep(120);
      if (spentOf(await page.evaluate('window.__game.talentPointsInfo()')) < spentOf(info0)) { node = n; break; }
    }
    check(node, 'el clic derecho no quitó ningún rango');
    await click(page, node.x, node.y, 'left');
    await sleep(120);
    check(spentOf(await page.evaluate('window.__game.talentPointsInfo()')) === spentOf(info0), `el clic en ${node.id} no devolvió el punto`);
    await click(page, node.x, node.y, 'right');
    await sleep(120);
    await key(page, 'KeyZ', 'both', 2);
    await sleep(150);
    const code1 = await page.evaluate('window.__game.exportTalentCode()');
    check(code1 === code0, 'Ctrl+Z no restauró la build', { antes: code0, despues: code1 });
    return { nodo: node.id };
  });
  await step(`${tag} · talentos: hexágono bajo el ratón = el nodo (G14)`, async () => {
    const ids = await page.evaluate(async c => {
      const T = await import(new URL('js/talents.js', location.href).href);
      const tree = T.talentTreesFor?.(c) || T.TALENT_TREES?.[c];
      const all = [...(tree?.cls?.nodes || []), ...((tree?.specs || []).flatMap(s => s.nodes || []))];
      return all.filter(n => n.t === 'c').map(n => n.id);
    }, cls);
    const nodes = [...(await nodeRects(page, 'cls')), ...(await nodeRects(page, 'spec'))].filter(n => ids.includes(n.id) && n.w > 0);
    if (!nodes.length) return { nota: 'sin hexágonos visibles' };
    const bad = [];
    for (const n of nodes.slice(0, 4)) {
      await mouse(page, 'mouseMoved', n.x, n.y);
      await sleep(150);
      const under = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest('.tn')?.dataset.node || null, n);
      if (under !== n.id) bad.push(`${n.id}→${under}`);
    }
    check(!bad.length, 'el flotante tapa el hexágono', bad);
    return { probados: nodes.slice(0, 4).map(n => n.id) };
  });
  await step(`${tag} · talentos: código ida y vuelta`, async () => {
    const r = await page.evaluate(() => {
      const g = window.__game;
      g.player.sinceCombat = 99;
      const code = g.exportTalentCode();
      const imp = g.importTalentCode(code) || {};
      return { code, ok: !!imp.ok, reason: imp.reason || null, again: g.exportTalentCode() };
    });
    check(/^IRPG2-/.test(r.code), `código ${r.code.slice(0, 12)}… (se espera IRPG2, §3.10)`);
    check(r.ok && r.again === r.code, 'importar el código exportado no da lo mismo', r);
    return { code: r.code };
  });
  for (const res of RES) {
    await step(`${tag} · talentos ${res.label}: sin solapes ni fuera de pantalla`, async () => {
      await setRes(page, res);
      await sleep(250);
      check(await openPanel(page, 'talents'), 'el panel no reabre');
      await sleep(250);
      const u = await uiCheck(page);
      await shot(page, `${cls}-${spec}-${lvl}-talents-${res.label}`);
      check(!u.overlaps.length && !u.offscreen.length, 'solapes o fuera de pantalla', u);
      return u;
    });
  }
  await setRes(page, RES[0]);
}

async function bookPanelSteps(page, cls, spec, lvl) {
  const tag = `${cls}/${spec} Nv${lvl}`;
  const opened = await openPanel(page, 'book');
  if (!opened) {
    await step(`${tag} · libro (T)`, async () => ({ ...SKIP('no aparece #skills-book[data-open] (llega con U2/U3 en E3)'), dom: true }));
    return;
  }
  await step(`${tag} · libro: elegir una variante en ≤ 2 clics (A4)`, async () => {
    const tiles = await page.evaluate(() => [...document.querySelectorAll('#skills-book .sb-tile[data-skill]')].map(el => {
      const r = el.getBoundingClientRect(); return { id: el.dataset.skill, x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), w: r.width };
    }).filter(t => t.w > 0));
    check(tiles.length, 'el libro no muestra ninguna .sb-tile[data-skill]');
    for (const t of tiles.slice(0, 25)) {
      await click(page, t.x, t.y);
      await sleep(150);
      const v = await page.evaluate(() => {
        const el = [...document.querySelectorAll('#skills-book .sb-var[data-var]')].find(e => e.dataset.state === 'abierta' && e.getBoundingClientRect().width > 0);
        if (!el) return null;
        const r = el.getBoundingClientRect(); return { v: el.dataset.var, x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
      });
      if (!v) continue;
      let clicks = 1;
      for (; clicks < 4; clicks++) {
        await click(page, v.x, v.y);
        await sleep(150);
        const f = await page.evaluate(id => window.__game.player.skillForge?.[id] ?? null, t.id);
        if (f === v.v) break;
      }
      const total = clicks + 1;   // el de la casilla + los de la variante
      check(clicks < 4, `elegir la variante ${v.v} de ${t.id} no cambió p.skillForge tras ${total - 1} clics`);
      check(total <= 2, `elegir la variante ${v.v} de ${t.id} costó ${total} clics (A4: ≤ 2)`);
      return { habilidad: t.id, variante: v.v, clics: total };
    }
    return { nota: 'ninguna variante abierta a este nivel' };
  });
  for (const res of RES) {
    await step(`${tag} · libro ${res.label}: sin solapes ni fuera de pantalla`, async () => {
      await setRes(page, res);
      await sleep(250);
      check(await openPanel(page, 'book'), 'el libro no reabre');
      await sleep(250);
      const u = await uiCheck(page);
      await shot(page, `${cls}-${spec}-${lvl}-book-${res.label}`);
      check(!u.overlaps.length && !u.offscreen.length, 'solapes o fuera de pantalla', u);
      return u;
    });
  }
  await setRes(page, RES[0]);
}

async function panelsClass(page, origin, cls) {
  const shots = [];
  const r = await step(`${cls} · panels: carga`, async () => { await loadGame(page, origin, 'dev&talentscheck=1&skillscheck=1'); return { ok: true }; });
  if (!r.ok) return shots;
  const info = await L(page, 'classInfo', cls);
  // sin ninguna de las dos raíces del DOM de §3.12 (antes de E3): un solo salto por clase
  const dom = await step(`${cls} · panels: DOM de §3.12`, async () => {
    const s = await L(page, 'start', cls, SLOT);
    check(s.state === 'play', `state = ${s.state}`);
    const talents = await openPanel(page, 'talents');
    const book = await openPanel(page, 'book');
    await page.evaluate('window.__game.ui.closeAllPanels?.()');
    if (!talents && !book) return { ...SKIP('ni #talents-panel[data-open] ni #skills-book[data-open] (llegan con U1/U2/U3 en E3)'), dom: true };
    return { talentos: talents, libro: book };
  });
  if (dom.skipped || !dom.ok) return shots;
  for (const spec of info.specs.map(s => s.id)) {
    const st = await step(`${cls}/${spec} · panels: héroe nuevo`, async () => {
      await loadGame(page, origin, 'dev&talentscheck=1&skillscheck=1');
      const s = await L(page, 'start', cls, SLOT);
      check(s.state === 'play', `state = ${s.state}`);
      await L(page, 'setLevel', 10);
      const c = await L(page, 'chooseSpec', spec);
      check(c.ok, `chooseSpec('${spec}')`, c);
      return { ok: true };
    });
    if (!st.ok) continue;
    for (const lvl of PANEL_LEVELS) {
      const b = await step(`${cls}/${spec} Nv${lvl} · nivel y Recomendado`, async () => {
        const lv = await L(page, 'setLevel', lvl);
        const ap = await L(page, 'applyBuild');
        check(ap.ok, 'applyTalentBuild() falló', ap);
        return { nivel: lv.level };
      });
      if (!b.ok) continue;
      await talentsPanelSteps(page, cls, spec, lvl);
      await bookPanelSteps(page, cls, spec, lvl);
      await page.evaluate('window.__game.ui.closeAllPanels?.()');
      for (const res of RES) shots.push({ cls, spec, lvl, res });
    }
  }
  await boardSteps(page, cls);
  return shots;
}

// tablero de glifos (P, Nv81–100; U3 · E3): cabe sin scroll, sin solapes y dentro de la pantalla a
// cada resolución, con el marco del jefe a la vista o sin él; la ficha del nodo (#paragon-info)
// va junto a la rejilla
async function boardSteps(page, cls) {
  for (const res of RES) {
    await step(`${cls} · tablero de glifos ${res.label}: sin scroll, solapes ni fuera de pantalla`, async () => {
      await setRes(page, res);
      const lv = await L(page, 'setLevel', 100);
      check(lv.level === 100, `nivel ${lv.level}`);
      const out = await page.evaluate(async () => {
        const ui = window.__game.ui, tf = document.getElementById('target-frame');
        const ov = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
        const runs = [];
        for (const boss of [false, true]) {
          tf.classList.toggle('hidden', !boss);
          ui.closeAllPanels(); ui.openParagon();
          await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
          const pc = document.getElementById('panel-paragon'), P = pc.getBoundingClientRect();
          const parts = [...pc.querySelectorAll('#paragon-grid, #paragon-points, #pg-alert, #paragon-info, .pg-legend, #paragon-respec')]
            .map(el => [el.id || el.className, el.getBoundingClientRect()]).filter(([, b]) => b.width >= 1 && b.height >= 1);
          const outside = parts.filter(([, b]) => b.top < P.top - 0.5 || b.bottom > P.bottom + 0.5 || b.left < P.left - 0.5 || b.right > P.right + 0.5).map(([n]) => n);
          const overlaps = [];
          for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) if (ov(parts[i][1], parts[j][1]) > 1) overlaps.push(`${parts[i][0]} × ${parts[j][0]}`);
          runs.push({ boss, scroll: pc.scrollHeight > pc.clientHeight + 1, offscreen: P.top < 0 || P.left < 0 || P.bottom > innerHeight || P.right > innerWidth, outside, overlaps,
            panel: [P.left, P.top, P.right, P.bottom].map(Math.round) });
        }
        tf.classList.add('hidden');
        ui.closeAllPanels();
        return runs;
      });
      for (const r of out) {
        const tag = r.boss ? 'con jefe' : 'sin jefe';
        check(!r.scroll, `${tag}: el tablero necesita scroll`, r);
        check(!r.offscreen, `${tag}: el tablero sale de la pantalla`, r);
        check(!r.outside.length && !r.overlaps.length, `${tag}: piezas fuera del panel o solapadas`, r);
      }
      return { panel: out[0].panel };
    });
  }
}

// --compare: captura el mockup y deja cada par juego/mockup lado a lado en out/compare/
async function compareShots(page, shots) {
  const dir = join(OUT, 'compare');
  mkdirSync(dir, { recursive: true });
  const mock = pathToFileURL(join(ROOT, 'docs', 'mockups', 'skills-ux.html')).href;
  for (const s of shots) {
    const game = join(OUT, `${s.cls}-${s.spec}-${s.lvl}-talents-${s.res.label}.png`);
    if (!existsSync(game)) continue;
    foreignPage = true;
    await step(`compare · ${s.cls}/${s.spec} Nv${s.lvl} ${s.res.label}`, async () => {
      await setRes(page, s.res);
      const fired = waitEvent(page, 'Page.loadEventFired', 30000);
      await page.send('Page.navigate', { url: `${mock}?cls=${s.cls}&view=talents&spec=${s.spec}&lvl=${s.lvl}&res=${s.res.w}&shot=1` });
      await fired;
      await sleep(1500);
      const mfile = join(dir, `mock-${s.cls}-${s.spec}-${s.lvl}-talents-${s.res.label}.png`);
      writeFileSync(mfile, Buffer.from((await page.send('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
      const html = join(dir, `par-${s.cls}-${s.spec}-${s.lvl}-${s.res.label}.html`);
      writeFileSync(html, `<!doctype html><meta charset="utf-8"><style>body{margin:0;display:flex;background:#111}img{width:${s.res.w}px;height:${s.res.h}px;display:block}</style>`
        + `<img src="${pathToFileURL(game).href}"><img src="${pathToFileURL(mfile).href}">`);
      await page.send('Emulation.setDeviceMetricsOverride', { width: s.res.w * 2, height: s.res.h, deviceScaleFactor: 0.5, mobile: false });
      const f2 = waitEvent(page, 'Page.loadEventFired', 30000);
      await page.send('Page.navigate', { url: pathToFileURL(html).href });
      await f2;
      await sleep(300);
      const out = join(dir, `${s.cls}-${s.spec}-${s.lvl}-${s.res.label}.png`);
      writeFileSync(out, Buffer.from((await page.send('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
      report.shots.push(out);
      return { par: out };
    });
  }
  foreignPage = false;
  await setRes(page, RES[0]);
}

// ============================================================
// full (§6): saves v4 → v5, verbos con eventos reales, tick con 30 enemigos
// ============================================================
function loadSaveFixture() {
  const file = join(ROOT, 'tests', 'fixtures', 'saves-v4-paso2.json');
  if (!existsSync(file)) return null;
  const raw = JSON.parse(readFileSync(file, 'utf8'));
  const list = Array.isArray(raw) ? raw : Array.isArray(raw.saves) ? raw.saves : Object.entries(raw.saves || raw).map(([k, v]) => ({ name: k, ...(v && v.classId ? { save: v } : v) }));
  return list.map((e, i) => {
    const save = e.save || e.data || (e.classId ? e : null);
    return save ? { name: e.name || e.id || `${save.classId}-${save.level}-${i}`, save } : null;
  }).filter(Boolean);
}

async function savesSteps(page, origin) {
  const saves = loadSaveFixture();
  if (!saves) { await step('saves v4 → v5', async () => SKIP('falta tests/fixtures/saves-v4-paso2.json (P1 · E0.2)')); return; }
  const probe = await step('saves v4 → v5 · versión del juego', async () => {
    await loadGame(page, origin);
    const v = await page.evaluate(async () => (await import(new URL('js/save-schema.js', location.href).href)).SAVE_VERSION);
    if (v < 5) return SKIP(`SAVE_VERSION = ${v}: la migración v4 → v5 llega con W1 (E1) y M1 (E5)`);
    return { saveVersion: v };
  });
  if (probe.skipped || !probe.ok) return;
  for (const s of saves.slice(0, MAX_SAVES)) {
    await step(`save ${s.name} → v5`, async () => {
      await page.evaluate(({ save, slot }) => {
        const k = window.__game.slotKey(slot);
        localStorage.setItem(k, JSON.stringify(save));
        localStorage.removeItem(`${k}.bak-v4`);
      }, { save: s.save, slot: 0 });
      await loadGame(page, origin);
      const r = await page.evaluate(async () => {
        const g = window.__game, L = window.__smokeLib;
        const SS = await import(new URL('js/save-schema.js', location.href).href);
        L.messages.length = 0;
        g.startGame('continue', {}, 0);
        g.save();
        const k = g.slotKey(0);
        const saved = JSON.parse(localStorage.getItem(k) || 'null');
        const want = [SS.LOAD_NOTICES?.paso2].filter(Boolean);
        return { state: g.state, cls: g.player?.classId, level: g.player?.level, saveVersion: saved?.saveVersion, talentsV: g.player?.talents?.v,
          aviso: want.length > 0 && want.every(t => L.messages.some(m => m.includes(t))), bak: localStorage.getItem(`${k}.bak-v4`) != null,
          hotbar: { ...(g.player?.hotbar || {}) } };
      });
      check(r.state === 'play', `state = ${r.state}`);
      check(r.saveVersion === 5, `saveVersion = ${r.saveVersion}`);
      check(r.talentsV === 2, `talents.v = ${r.talentsV}`);
      check(r.aviso, 'no se mostró el aviso de migración (LOAD_NOTICES.paso2)');
      check(r.bak, `no existe ${'<slot>'}.bak-v4`);
      check(r.hotbar.lmb, 'lmb vacía tras migrar', r.hotbar);
      return r;
    });
  }
}

async function verbSteps(page, origin, cls) {
  const KEYS = { k1: 'Digit1', k2: 'Digit2', k3: 'Digit3', k4: 'Digit4' };
  const VERBS = ['charge', 'recast', 'stance'];
  // qué verbos trae el catálogo (una sola carga); los que no, se saltan sin recargar
  let found = {};
  const probe = await step(`${cls} · verbos: catálogo`, async () => {
    await loadGame(page, origin, 'dev');
    const s = await L(page, 'start', cls, SLOT);
    check(s.state === 'play', `state = ${s.state}`);
    for (const v of VERBS) found[v] = await L(page, 'findVerbSkill', v);
    return Object.fromEntries(VERBS.map(v => [v, found[v]?.id || null]));
  });
  if (!probe.ok) return;
  for (const verb of VERBS) {
    await step(`${cls} · verbo ${verb} con eventos reales`, async () => {
      if (!found[verb]) return SKIP(`ningún ${verb} en el catálogo de ${cls} (llega con KA1)`);
      await loadGame(page, origin, 'dev');
      const s = await L(page, 'start', cls, SLOT);
      check(s.state === 'play', `state = ${s.state}`);
      const sk = await L(page, 'findVerbSkill', verb);
      check(sk, `${verb} desapareció del catálogo`);
      await L(page, 'setLevel', Math.max(15, sk.req));
      if (sk.spec) { const c = await L(page, 'chooseSpec', sk.spec); check(c.ok, `chooseSpec('${sk.spec}')`, c); }
      await L(page, 'enterArena', { floor: BENCH.floor, seed: BENCH.seed });
      await L(page, 'spawnRing', { n: 6, floor: BENCH.floor, immortal: true });
      const slot = sk.fits.includes('rmb') ? 'rmb' : sk.fits.find(x => KEYS[x]);
      check(slot, `${sk.id} no cabe en ninguna ranura`, sk.fits);
      await L(page, 'putInSlot', sk.id, slot);
      await closePanels(page);
      const pt = await canvasPoint(page);
      check(pt && !pt.blocked, 'ningún punto de la zona de combate deja el ratón al lienzo', pt);
      const press = async () => {
        if (slot === 'rmb') { await mouse(page, 'mouseMoved', pt.x, pt.y); await mouse(page, 'mousePressed', pt.x, pt.y, 'left', 1); await mouse(page, 'mousePressed', pt.x, pt.y, 'right', 3); }
        else await key(page, KEYS[slot], 'down');
      };
      const release = async () => {
        if (slot === 'rmb') { await mouse(page, 'mouseReleased', pt.x, pt.y, 'right', 1); await mouse(page, 'mouseReleased', pt.x, pt.y, 'left', 0); }
        else await key(page, KEYS[slot], 'up');
      };
      if (verb === 'charge') {
        await press();
        const seen = await page.evaluate('window.__smokeLib.step(48, 1/60, true)');   // 0,8 s mantenida
        await release();
        const after = await page.evaluate('window.__smokeLib.step(3, 1/60, true)');
        check(seen.some(v => v.charging), `${sk.id}: la carga no empezó (g._charging)`, seen.slice(0, 3));
        if (!seen.some(v => v.hasVerbView) || !seen.some(v => v.el)) return { ...SKIP('sin verbView(g) o sin .verb-charge (U2 · E3)'), dom: true };
        check(seen.filter(v => v.charging).every(v => v.visible), '.verb-charge no visible durante la carga');
        const late = seen.filter(v => v.inWindowModel === true && v.inWindowDom !== true).length;
        check(late === 0, `.verb-charge[data-in-window] llegó tarde en ${late} frame(s)`);
        check(!after[after.length - 1].charging, 'soltar no terminó la carga');
        // T a media carga (botón aún pulsado): el libro abre, la carga se cancela y su barra junto
        // al cursor (z 60) se apaga ya; con la partida en pausa nadie más la repintaría (U3 · E3)
        await press();
        await page.evaluate('window.__smokeLib.step(20, 1/60, true)');
        await key(page, 'KeyT');
        const panel = await page.evaluate(() => ({ active: window.__game.ui.activePanel, charging: !!window.__game._charging,
          cursor: +getComputedStyle(document.querySelector('.verb-cursor')).opacity }));
        await release();
        await key(page, 'Escape');
        check(panel.active === 'skills' && !panel.charging, 'T a media carga: no abrió el libro o no canceló la carga', panel);
        check(!(panel.cursor > 0.05), '.verb-cursor sigue encima del libro tras T a media carga', panel);
        return { habilidad: sk.id, ranura: slot, framesEnVentana: seen.filter(v => v.inWindowModel).length };
      }
      if (verb === 'recast') {
        // el relanzar del catálogo 2g puede pedir acierto (recast.cond 'hit': Salto Devastador):
        // el ratón apunta a un enemigo del anillo y se espera a que caiga (salto ~0,45 s)
        const aim = await enemyPoint(page);
        if (aim) await mouse(page, 'mouseMoved', aim.x, aim.y);
        await press(); await page.evaluate('window.__smokeLib.step(2)'); await release();
        await page.evaluate('window.__smokeLib.step(45)');
        const st = await page.evaluate(({ id, slot }) => ({ state: window.__game.player.skState?.[id]?.recast || null,
          ring: !!document.querySelector(`.verb-ring[data-slot="${slot}"]`) }), { id: sk.id, slot });
        check(st.state, `${sk.id}: tras el 1.er uso no hay ventana de relanzar (p.skState[id].recast)`, aim);
        const aim2 = await enemyPoint(page);
        if (aim2) await mouse(page, 'mouseMoved', aim2.x, aim2.y);
        await press(); await page.evaluate('window.__smokeLib.step(2)'); await release();
        await page.evaluate('window.__smokeLib.step(45)');
        if (!st.ring) return { ...SKIP('sin .verb-ring[data-slot] (U2 · E3)'), dom: true };
        return { habilidad: sk.id, ranura: slot, estado: st.state };
      }
      // postura: alternar dos veces
      const mode = () => page.evaluate(({ id, slot }) => ({ m: window.__game.stanceOf?.(window.__game.player, id) ?? null,
        dom: document.querySelector(`.verb-stance[data-slot="${slot}"]`)?.dataset.mode ?? null }), { id: sk.id, slot });
      await press(); await page.evaluate('window.__smokeLib.step(2)'); await release();
      await page.evaluate('window.__smokeLib.step(90)');
      const a = await mode();
      await press(); await page.evaluate('window.__smokeLib.step(2)'); await release();
      await page.evaluate('window.__smokeLib.step(6)');
      const b = await mode();
      check(a.m != null, `${sk.id}: stanceOf no da modo tras el 1.er uso`);
      check(a.m !== b.m, `${sk.id}: la postura no alternó`, { a, b });
      if (a.dom == null) return { ...SKIP('sin .verb-stance[data-slot][data-mode] (U2 · E3)'), dom: true };
      check(a.dom !== b.dom, '.verb-stance no cambió de data-mode', { a, b });
      return { habilidad: sk.id, modos: [a.m, b.m] };
    });
  }
}

// Mide el tick de SIMULACIÓN (sin render) con 30 enemigos inmortales en la mazmorra fija.
// Fase medida: la interfaz (HUD, textos flotantes, avisos, minimapa) y los efectos cosméticos
// (partículas, sonidos, sacudidas) quedan MUDOS (no-op): así ningún recálculo de estilo o de
// layout del DOM cae dentro de la lógica, que es lo único que afirma §6. Cada tick se intercala
// con una calibración fija de JS (page-lib.mjs) y se informa simNorm = sim / calibración: la
// carga de la máquina (otros procesos) mueve las dos por igual.
// `runs` corridas (página nueva cada una); se queda la MEDIANA por simNorm. Después, una pasada
// informativa de 10 s con la interfaz viva (coste con UI y FX).
async function benchClass(page, origin, cls, seconds, runs) {
  let res = null;
  await step(`${cls} · tick de simulación: ${runs} × ${seconds} s con ${BENCH.enemies} enemigos (sin render)`, async () => {
    const all = [];
    const setup = async () => {
      await loadGame(page, origin, 'dev&iso=1');
      const iso = await page.evaluate('self.crossOriginIsolated === true');
      if (!iso) addWarning('bench', 'la página no quedó aislada (crossOriginIsolated): performance.now() a 100 µs, medición más ruidosa');
      const s = await L(page, 'start', cls, SLOT);
      check(s.state === 'play', `state = ${s.state}`);
      const info = await L(page, 'classInfo', cls);
      await L(page, 'setLevel', BENCH.level);
      const spec = info.specs[0]?.id;
      if (spec) { const c = await L(page, 'chooseSpec', spec); check(c.ok, `chooseSpec('${spec}')`, c); }
      await L(page, 'enterArena', { floor: BENCH.floor, seed: BENCH.seed });
      const n = await L(page, 'spawnRing', { n: BENCH.enemies, floor: BENCH.floor, immortal: true, roster: BENCH.roster });
      check(n === BENCH.enemies, `solo caben ${n} enemigos`);
      return { spec, iso };
    };
    const drive = async (secs, quietUi) => {
      const d = await page.evaluate(`window.__smokeLib.drive(${JSON.stringify({ seconds: secs + BENCH.warmup, warmup: BENCH.warmup, dt: BENCH.dt,
        renderEvery: 0, slots: BENCH.slots, measure: true, quietUi })})`, null, { timeout: 600000 });
      check(d.state === 'play', `state = ${d.state}`);
      check(d.pausedTicks === 0, `la simulación estuvo en pausa ${d.pausedTicks} ticks (panel ${d.panelAtEnd || d.panelAtStart})`, d);
      check(d.enemies.min === BENCH.enemies, `enemigos ${d.enemies.min}–${d.enemies.max} (se esperan ${BENCH.enemies} todo el rato)`);
      return d;
    };
    for (let k = 0; k < runs; k++) {
      const { spec, iso } = await setup();
      const d = await drive(seconds, true);
      all.push({ spec, iso, simNorm: d.simNorm, simMs: d.simMs, calibMs: d.calibMs, ticks: d.measured, enemies: d.enemies,
        casts: d.castsOk, deaths: d.deaths, panelAlEmpezar: d.panelAtStart });
    }
    const sorted = [...all].sort((a, b) => a.simNorm - b.simNorm);
    res = { ...sorted[Math.floor((sorted.length - 1) / 2)],
      corridas: all.map(r => ({ simNorm: r.simNorm, simTmean: r.simMs.tmean, calibTmean: r.calibMs.tmean, lanzados: r.casts })) };
    // informativo: el mismo escenario 10 s con la interfaz y los efectos vivos
    await setup();
    const u = await drive(10, false);
    res.conUi = { frameMs: u.frameMs, uiMs: u.uiMs, fxMs: u.fxMs, simMs: u.simMs };
    return res;
  });
  return res;
}

// §6: coste medio del tick ≤ 1,25 × la línea base, por clase. Se compara simNorm (media sin el
// 1 % de ticks más caros —pausas de GC o del sistema— dividida por la calibración intercalada) de
// la corrida mediana. El cociente en ms sin normalizar y el de la pasada con UI son informativos.
async function benchCompareStep(results, seconds) {
  return step(`tick de simulación ≤ ${TICK_LIMIT} × línea base (tools/smoke/baseline.json)`, async () => {
    if (!existsSync(BASELINE)) return SKIP('falta tools/smoke/baseline.json (npm run smoke -- --level bench --write-baseline)');
    const base = JSON.parse(readFileSync(BASELINE, 'utf8'));
    const out = {}, bad = [];
    const r2 = v => Math.round(v * 100) / 100;
    for (const [cls, r] of Object.entries(results)) {
      const b = base.clases?.[cls];
      if (!r || !b) continue;
      const ratio = r2(r.simNorm / b.simNorm);
      out[cls] = { simNorm: r.simNorm, simNormBase: b.simNorm, ratio, ratioMs: r2(r.simMs.tmean / b.simMs.tmean),
        ratioConUi: b.conUi && r.conUi ? r2(r.conUi.frameMs.tmean / b.conUi.frameMs.tmean) : null };
      if (ratio > TICK_LIMIT) bad.push(cls);
    }
    if (base.escenario?.seconds !== seconds) addWarning('bench', `escenario distinto de la línea base (${seconds} s frente a ${base.escenario?.seconds} s)`);
    check(!bad.length, `tick más caro que ${TICK_LIMIT} × la línea base en ${bad.join(', ')}`, out);
    return out;
  });
}

// ============================================================
// principal
// ============================================================
async function main() {
  const t0 = Date.now();
  mkdirSync(OUT, { recursive: true });
  console.log(`Humo · nivel ${level} · clases ${CLASSES.join(', ')} · ${RES.map(r => r.label).join(', ')} · GL ${ANGLE}`);
  await swAssetsStep();
  const three = findThree();
  if (!three) addWarning('three', 'no encuentro node_modules/three: three@0.160.0 se pedirá a la red (npm install)');
  const server = await startServer(ROOT, Number(opt('port', 8099)));
  const maxW = Math.max(...RES.map(r => r.w)), maxH = Math.max(...RES.map(r => r.h));
  let chrome = null, page = null;
  try {
    chrome = await launchChrome({ width: maxW, height: maxH, angle: ANGLE, chromePath: opt('chrome', undefined) || undefined });
    report.chrome = chrome.version?.Browser || null;
    page = await chrome.firstPage();
    // mismo origen (el favicon implícito de Chrome no cuenta)
    const sameOrigin = u => typeof u === 'string' && u.startsWith(server.origin) && !u.startsWith(`${server.origin}/favicon.ico`);
    const failedUrls = new Set();
    const reqUrl = new Map();
    page.on('Runtime.exceptionThrown', ({ exceptionDetails: d }) =>
      addError('excepción', d.exception?.description || d.text, { url: d.url, line: d.lineNumber }));
    page.on('Runtime.consoleAPICalled', ({ type, args, stackTrace }) => {
      const text = (args || []).map(a => a.value ?? a.description ?? a.unserializableValue ?? a.type).join(' ');
      const fr = stackTrace?.callFrames?.[0];
      if (type === 'error' || type === 'assert') addError('console.error', text, { url: fr?.url, line: fr?.lineNumber });
      else if (type === 'warning') addWarning('console.warn', text);
    });
    page.on('Log.entryAdded', ({ entry }) => {
      if (entry.level !== 'error') { if (entry.level === 'warning') addWarning(`log.${entry.source}`, entry.text, { url: entry.url }); return; }
      if (entry.source === 'network') {
        if (!sameOrigin(entry.url)) { addWarning('red-externa', entry.text, { url: entry.url }); return; }
        if (failedUrls.has(entry.url)) return;
        failedUrls.add(entry.url);
      }
      addError(`log.${entry.source}`, entry.text, { url: entry.url });
    });
    page.on('Network.requestWillBeSent', ({ requestId, request }) => reqUrl.set(requestId, request.url));
    page.on('Network.responseReceived', ({ response }) => {
      if (sameOrigin(response.url) && response.status >= 400 && !failedUrls.has(response.url)) {
        failedUrls.add(response.url);
        addError('carga', `HTTP ${response.status} ${response.url}`, { url: response.url });
      }
    });
    page.on('Network.loadingFailed', ({ requestId, errorText, canceled }) => {
      const url = reqUrl.get(requestId);
      if (canceled || !url) return;
      if (!sameOrigin(url)) { addWarning('red-externa', `${errorText} ${url}`); return; }
      if (failedUrls.has(url)) return;
      failedUrls.add(url);
      addError('carga', `${errorText} ${url}`, { url });
    });
    if (three) {
      page.on('Fetch.requestPaused', async ({ requestId, request }) => {
        const rel = request.url.slice(THREE_CDN.length).split(/[?#]/)[0];
        const file = join(three, rel);
        try {
          const body = readFileSync(file);
          await page.send('Fetch.fulfillRequest', { requestId, responseCode: 200, body: body.toString('base64'),
            responseHeaders: [{ name: 'Content-Type', value: 'text/javascript; charset=utf-8' }, { name: 'Access-Control-Allow-Origin', value: '*' }] });
        } catch {
          addWarning('three', `sin copia local de ${request.url}`);
          await page.send('Fetch.continueRequest', { requestId }).catch(() => {});
        }
      });
      await page.send('Fetch.enable', { patterns: [{ urlPattern: `${THREE_CDN}*`, requestStage: 'Request' }] });
    }
    await page.send('Runtime.enable');
    await page.send('Log.enable');
    await page.send('Page.enable');
    await page.send('Network.enable');
    await page.send('Network.setBypassServiceWorker', { bypass: true });
    await page.send('Network.setCacheDisabled', { cacheDisabled: true });
    await setRes(page, RES[0]);

    // boot (y por acumulación panels/full)
    if (runs('boot')) for (const cls of CLASSES) await bootClass(page, server.origin, cls);
    let shots = [];
    if (runs('panels')) for (const cls of CLASSES) shots = shots.concat(await panelsClass(page, server.origin, cls));
    if (runs('panels') && COMPARE) await compareShots(page, shots);
    if (runs('full')) {
      await savesSteps(page, server.origin);
      for (const cls of CLASSES) await verbSteps(page, server.origin, cls);
    }
    if (level === 'full' || level === 'bench') {
      const seconds = BENCH_SECONDS;
      const results = {};
      for (const cls of CLASSES) results[cls] = await benchClass(page, server.origin, cls, seconds, BENCH_RUNS);
      report.bench = { escenario: { ...BENCH, seconds, runs: BENCH_RUNS }, clases: results };
      if (level === 'full') await benchCompareStep(results, seconds);
      if (WRITE_BASELINE) {
        await step('escribir tools/smoke/baseline.json', async () => {
          check(Object.values(results).every(Boolean) && CLASSES.length === ALL_CLASSES.length, 'la línea base necesita las tres clases sin fallos');
          const cpu = cpus()[0]?.model?.trim() || null;
          const base = {
            nota: 'Línea base del humo (docs/paso2-implementacion.md §6, E0.5): coste del tick de SIMULACIÓN (sin render; interfaz y efectos cosméticos mudos), '
              + 'motor de ticks manual con dt fijo, en Chrome sin ventana con aislamiento entre orígenes (performance.now a 5 µs). '
              + 'simNorm = simMs.tmean (media sin el 1 % de ticks más caros) / calibMs.tmean (trabajo fijo de JS intercalado con cada tick: compensa la carga de la máquina). '
              + `Por clase, la corrida mediana por simNorm de ${BENCH_RUNS}. El nivel full exige simNorm ≤ 1,25 × este valor por clase; `
              + 'los ms sin normalizar y conUi (10 s con la interfaz viva) son informativos. Rehacer solo con el juego de referencia: '
              + 'npm run smoke -- --level bench --write-baseline',
            fecha: new Date().toISOString(), commit: gitHead(), chrome: report.chrome, node: process.version, cpu, nucleos: cpus().length,
            so: `${platform()} ${release()}`, angle: ANGLE, umbral: TICK_LIMIT,
            escenario: { ...BENCH, seconds, runs: BENCH_RUNS, dt: '1/60', mundo: `mazmorra piso ${BENCH.floor} con semilla ${BENCH.seed}`,
              heroe: `héroe nuevo a Nv${BENCH.level} con la 1.ª especialización; ranuras ${BENCH.slots.join(', ')} en ciclo de mantener/soltar`,
              enemigos: `${BENCH.enemies} inmortales (vida 1e9) agresivos alrededor del héroe; vida del héroe rellenada cada tick` },
            clases: results,
          };
          writeFileSync(BASELINE, JSON.stringify(base, null, 2) + '\n');
          return { archivo: BASELINE };
        });
      }
    }
  } catch (e) {
    addError('humo', e?.stack || String(e));
  } finally {
    current = '(cierre)';
    try { await page?.close(); } catch { /* */ }
    try { await chrome?.close(); } catch { /* */ }
    for (const m of server.misses) if (!m.startsWith('/tools/smoke/')) addError('404 (servidor)', m, { url: `${server.origin}${m}` });
    await server.close();
  }
  report.ms = Date.now() - t0;
  report.ok = report.errors.length === 0 && report.steps.every(s => s.ok);
  writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  const n = report.steps.length, skipped = report.steps.filter(s => s.skipped).length, failed = report.steps.filter(s => !s.ok).length;
  console.log(`\n${report.ok ? '✅ Humo en verde' : '❌ Humo en ROJO'} · ${n} pasos (${failed} fallidos, ${skipped} saltados) · ${report.errors.length} errores · ${report.warnings.length} avisos · ${Math.round(report.ms / 1000)} s`);
  console.log(`Informe: ${join(OUT, 'report.json')}`);
  process.exit(report.ok ? 0 : 1);
}

main();
