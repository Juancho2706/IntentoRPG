// ============================================================
// INDICADOR DE ESPECIALIZACIÓN sobre la barra de acciones (Paso 2d, versión GENÉRICA)
// ============================================================
// Módulo propio para que el rework del HUD de PC pueda sustituirlo por una barra
// distinta por especialización (forma, assets y animaciones únicas) sin tocar
// ui.js. Esta versión pinta UNA barra genérica: nombre, valor/máx, color y estado.
//
// API
//   import { createGaugeHud } from './ui-gauges.js';
//   const hud = createGaugeHud(host, { getView });   // host = #spec-gauge
//   hud.update(view?)   // view = gaugeView(p) (+ specName opcional); sin argumento
//                       // usa getView(). null/undefined → se oculta. Llamarlo a ≤ 10 Hz.
//   hud.destroy()
//   view: { id, name, value, max, color, state: 'idle'|'building'|'full'|'active'|'prey',
//           label?, t?, specName? }
// No hace trabajo por frame: solo actualiza el DOM cuando cambia algo.
import { gaugeBar } from './hud-model.js';

export function createGaugeHud(host, { getView } = {}) {
  if (!host) throw new Error('createGaugeHud: falta el contenedor');
  const doc = host.ownerDocument || document;
  host.classList.add('sg', 'hidden');
  host.setAttribute('role', 'meter');
  host.setAttribute('aria-valuemin', '0');
  host.setAttribute('aria-valuemax', '100');
  host.innerHTML = '<div class="sg-head"><span class="sg-title"></span><span class="sg-right"></span></div>' +
    '<div class="sg-track"><div class="sg-fill"></div><div class="sg-segs"></div></div>';
  const $ = (c) => host.querySelector(c);
  const refs = { title: $('.sg-title'), right: $('.sg-right'), fill: $('.sg-fill'), segs: $('.sg-segs') };
  let last = '', shape = '';
  void doc;

  function update(view = getView?.()) {
    const gb = gaugeBar(view || null, view?.specName || '');
    if (!gb) {
      if (last !== 'off') { host.classList.add('hidden'); last = 'off'; }
      return;
    }
    const sig = [gb.title, gb.right, gb.pct, gb.cls, gb.active].join('|');
    if (sig === last) return;
    last = sig;
    const sh = gb.id + '|' + gb.segs + '|' + gb.color;
    if (sh !== shape) {
      shape = sh;
      host.style.setProperty('--sg-color', gb.color);
      refs.segs.innerHTML = Array.from({ length: Math.max(0, gb.segs - 1) },
        (_, i) => `<i style="left:${((i + 1) / gb.segs * 100).toFixed(2)}%"></i>`).join('');
    }
    refs.title.textContent = gb.title;
    refs.right.textContent = gb.right;
    refs.fill.style.width = gb.pct + '%';
    host.className = 'sg ' + gb.cls + (gb.active ? ' sg-active' : '');
    host.setAttribute('aria-label', `${gb.title}: ${gb.right}`);
    host.setAttribute('aria-valuenow', String(Math.round(gb.pct)));
  }

  return {
    el: host,
    update,
    destroy() { host.innerHTML = ''; host.className = ''; },
  };
}
