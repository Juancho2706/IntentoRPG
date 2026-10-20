// ============================================================
// PANEL DE TALENTOS (estilo WoW Retail) · #panel-talents · tecla N
// ============================================================
// Paso 2d (parte del trabajador). Referencia visual aprobada: los mockups
// IntentoRPG-assets/mockups/Talentos.dc.html y Spec-*.dc.html. Solo PC (ratón y
// teclado). Estilos en css/talents.css (prefijo `tp-`).
//
// API PÚBLICA
//   import * as Talents from './talents.js';
//   import { createTalentPanel } from './ui-talents.js';
//   const panel = createTalentPanel(host, {
//     api: Talents,                 // OBLIGATORIO: la API pura de js/talents.js
//     getPlayer: () => game.player, // OBLIGATORIO: el jugador a mostrar/editar
//     onChange: (p) => { … },       // tras CADA mutación: p.recompute() + guardar
//     onClose: () => ui.closePanel(),// botón ✕ y clic en el fondo (por defecto: close())
//     canEdit: (p) => null | 'motivo', // p. ej. bloquear en combate (por defecto: null)
//     assetBase: 'assets/',         // raíz de talents/, specs/, emblems/, ui/
//     id: 'panel-talents',          // id del elemento raíz (clase .panel)
//     ops: { addRank(p, which, id) … }, // OPCIONAL (2d): sustituye mutaciones de
//                                   // talents-ops por las del juego (mixin game-talents,
//                                   // que además sincroniza la barra); mismas firmas
//   });
//   → { el, open(), close(), render(), isOpen(), showSpecChoice(), destroy() }
//
//   · Construye su propio DOM: añade a `host` un <div id="panel-talents"
//     class="panel tp hidden">. open()/close() solo quitan/ponen `hidden` y
//     open() renderiza; render() repinta (llamarlo al abrir o tras un cambio
//     externo: subir de nivel, cargar partida). NUNCA hace trabajo por frame.
//   · Las mutaciones van por js/talents-ops.js (createTalentOps(api)); el panel
//     no toca p.talents directamente y después llama onChange(p).
//   · Los iconos se crean al construir el árbol (al abrir), no al importar el
//     módulo; si una imagen falla se muestran las iniciales del talento.
//   · El tamaño se adapta a la ventana: diseño "completo" (1760×1080, el del
//     mockup) o "compacto" (1330×740, para 1366×768), escalado con `zoom`; el
//     cálculo solo se rehace en `resize` mientras el panel está abierto.
//
// CONEXIÓN EN ui.js (jefe):
//   this.talentPanel = createTalentPanel(document.body, { api: Talents,
//     getPlayer: () => this.game.player, onClose: () => this.closePanel(),
//     canEdit: (p) => this.game.inCombat?.() ? 'No puedes cambiar talentos en combate' : null,
//     onChange: (p) => { p.recompute(); this.game.save?.(); this.renderHUD?.(); } });
//   togglePanel('talents') funciona tal cual (quita `hidden` a #panel-talents);
//   en renderPanel(): `else if (this.activePanel === 'talents') this.talentPanel.render();`
//   input.js: case 'talents': g.ui.togglePanel('talents').
import { createTalentOps } from './talents-ops.js';

// ---------- presentación por especialización (copiado de los mockups) ----------
const CLASS_COLOR = { guerrero: '#c98b6b', maga: '#9fbaff', arquera: '#a8d88a' };
const CLASS_NAME = { guerrero: 'Guerrero', maga: 'Maga', arquera: 'Arquera' };
const ROLE_LABEL = { dps: 'Daño', tank: 'Tanque', support: 'Apoyo', control: 'Control' };
// color · acento · fondo/borde de la tarjeta de mecánica · borde del árbol
export const SPEC_INFO = {
  berserker: { color: '#e8634a', hi: '#ff8f7a', bg: '#1c0f0e', bd: '#5a2620', tree: '#4a2622', role: 'Daño cuerpo a cuerpo',
    mech: 'Sed', text: 'Perder vida y desangrar enemigos llena tu Sed. A 100 entras en <b>Desenfreno</b>: 8 s de +30% de velocidad de ataque y cada golpe te cura.',
    cols: [['Generar', 'Perder 1% de vida +1 · Remolino +4'], ['Descargar', 'Desenfreno automático al llegar a 100'], ['Ventana', 'Ejecutar remata y alarga el Desenfreno']],
    desc: 'Cuerpo a cuerpo temerario: cuanta menos vida te queda, más golpeas. Sangrados, críticos y remates en cadena.' },
  guardian: { color: '#7fb0e8', hi: '#a9cdf5', bg: '#0f1520', bd: '#2b4566', tree: '#263a52', role: 'Tanque de grupo',
    mech: 'Bastión', text: 'Bloquear y provocar te da cargas de Bastión (máx. 5). Guárdalas para el golpe fuerte del jefe: <b>Muro de Escudos</b> las gasta y reduce el daño un 10% por carga.',
    cols: [['Generar', 'Bloqueo +1 · Grito Desafiante +2'], ['Descargar', 'Muro de Escudos: −10% de daño por carga'], ['Ventana', 'Con 5 cargas tus espinas se duplican']],
    desc: 'El muro del grupo: bloquea, provoca y aguanta el golpe fuerte del jefe mientras devuelves el daño con espinas.' },
  cruzado: { color: '#ecc760', hi: '#f3d98c', bg: '#1a160c', bd: '#5a4a1e', tree: '#4a3e1c', role: 'Apoyo de grupo',
    mech: 'Fervor', text: 'Martillo de Guerra y cada Juicio te dan Fervor (máx. 3). Con 3 cargas, <b>Veredicto Final</b> castiga en cono y cura a todo el grupo con parte del daño.',
    cols: [['Generar', 'Martillo de Guerra +1 · Juicio al matar +1'], ['Descargar', 'Veredicto Final gasta 3: daño y curación'], ['Ventana', 'Cada Fervor gastado alarga el Aura 1 s']],
    desc: 'Martillo sagrado y auras: castiga a los enemigos en cono y cura al grupo con parte del daño que haces.' },
  piromante: { color: '#ff8a3d', hi: '#ffb27a', bg: '#1a120d', bd: '#5a3a22', tree: '#4a3324', role: 'Daño en área',
    mech: 'Calor', text: 'Cada hechizo de Fuego suma Calor. Al llegar a 100 se dispara <b>Combustión Espontánea</b>: tu próximo Meteoro es instantáneo, gratis y deja el suelo en llamas.',
    cols: [['Generar', 'Bola de Fuego +12 · Llamarada +25'], ['Descargar', 'Meteoro instantáneo y gratis a 100'], ['Ventana', 'Combustión duplica el Calor 10 s']],
    desc: 'Fuego en área: quemaduras que se propagan, detonaciones y Meteoros instantáneos para arrasar hordas.' },
  crionte: { color: '#74cdf2', hi: '#a8e0f8', bg: '#0b161d', bd: '#22445a', tree: '#24485e', role: 'Control',
    mech: 'Escarcha', text: 'Cada golpe de Escarcha suma una capa de hielo. A 5 capas el enemigo queda <b>Congelado</b> y Lanza de Hielo lo <b>astilla</b> en fragmentos.',
    cols: [['Cubrir', 'Nova de Hielo y Dardo: +1 capa por golpe'], ['Astillar', 'Lanza de Hielo: daño ×3 a Congelados'], ['Jefes', 'No se congelan: quedan Ateridos 4 s']],
    desc: 'Control de escarcha: congela grupos enteros y astilla a los congelados con la Lanza de Hielo.' },
  arcanista: { color: '#b996ff', hi: '#cfbaff', bg: '#130e22', bd: '#3e2f66', tree: '#3c2f60', role: 'Daño a un objetivo',
    mech: 'Cargas Arcanas', text: 'Dardo y Orbe suman Cargas (máx. 4): +12% de daño y +25% de coste de maná cada una. <b>Rayo</b> las descarga todas y te devuelve maná.',
    cols: [['Cargar', 'Dardo +1 · Orbe +1 por enemigo'], ['Descargar', 'Rayo: +50% de daño y 5% de maná por Carga'], ['Riesgo', 'Sin maná, las Cargas implosionan: silencio 1 s']],
    desc: 'Daño a un objetivo con riesgo: acumula Cargas Arcanas y descárgalas con Rayo sin quedarte sin maná.' },
  francotiradora: { color: '#ead86e', hi: '#f2e39a', bg: '#16140b', bd: '#4d4520', tree: '#4a4224', role: 'Daño a un objetivo',
    mech: 'Concentración', text: 'Quedarte quieta llena la Concentración y moverte la vacía. Al llegar a 100 la retícula se cierra: <b>Tiro Fijado</b>, tu próximo Disparo Apuntado es instantáneo y crítico seguro.',
    cols: [['Generar', 'Quieta +20 por segundo · Disparo Rápido +5'], ['Descargar', 'Disparo Apuntado instantáneo y crítico a 100'], ['Ventana', 'Sangre Fría: 4 s moviéndote sin perderla']],
    desc: 'Precisión a distancia: quieta llenas la Concentración y tus Disparos Apuntados rompen jefes.' },
  montaraz: { color: '#86d47a', hi: '#a9e59d', bg: '#0f170d', bd: '#2d4a28', tree: '#2f4a2a', role: 'Control',
    mech: 'Coto de Caza', text: 'Mantienes hasta 3 trampas armadas. Cuando tu <b>Presa</b> pisa una, todas las trampas armadas saltan a la vez sobre ella: queda inmovilizada y el grupo la remata.',
    cols: [['Armar', 'Trampa de Cepo · Arpón arrastra a la Presa'], ['Cerrar', 'La Presa activa todas las trampas armadas'], ['Ventana', 'Presa atrapada: +25% de daño del grupo 4 s']],
    desc: 'Trampera de control: arma el coto de caza, inmoviliza a la presa y deja que el grupo la remate.' },
  tiradora: { color: '#66d7c7', hi: '#94e8dc', bg: '#0c1716', bd: '#1f4a45', tree: '#22443f', role: 'Daño en área',
    mech: 'Impulso', text: 'Disparar mientras corres acumula Impulso; quedarte quieta lo desploma. A 100 se desata el <b>Vendaval</b>: 6 s en los que cada Disparo Rápido sale en abanico de 3 flechas.',
    cols: [['Generar', '+4 por flecha en movimiento · Voltereta +15'], ['Descargar', 'Vendaval: Disparo Rápido en abanico 6 s'], ['Freno', 'Quieta más de 1.5 s: el Impulso cae a la mitad']],
    desc: 'Arquera en movimiento: dispara mientras corres para acumular Impulso y desatar el Vendaval en abanico.' },
};
const DEFAULT_INFO = { color: '#e8c06a', hi: '#f5d999', bg: '#17131c', bd: '#3a2f45', tree: '#3a2f45', mech: '', text: '', cols: [], desc: '' };
function specInfo(spec) {
  if (!spec) return DEFAULT_INFO;
  const base = SPEC_INFO[spec.id] || DEFAULT_INFO;
  // los datos reales pueden sobreescribir la presentación (spec.color, spec.mechInfo…)
  return { ...base, ...(spec.color ? { color: spec.color } : null), ...(spec.mechInfo || null),
    role: spec.roleLabel || base.role || ROLE_LABEL[spec.role] || '', desc: spec.desc || base.desc };
}

// ---------- geometría (la del mockup y una compacta para 1366×768) ----------
const LAYOUTS = {
  full: { name: 'full', W: 1760, H: 1080, padY: 32, padX: 40, headH: 72, gap: 20, legendH: 56,
    clsW: 520, specW: 560, midW: 560, treeHead: 60, cy0: 44, dy: 82, node: 52, big: 60,
    cls: { cx0: 71, dx: 126 }, spec: { cx0: 85, dx: 130 } },
  compact: { name: 'compact', W: 1330, H: 740, padY: 14, padX: 18, headH: 56, gap: 12, legendH: 34,
    clsW: 430, specW: 450, midW: 390, treeHead: 46, cy0: 34, dy: 61, node: 44, big: 50,
    cls: { cx0: 58, dx: 104 }, spec: { cx0: 62, dx: 108 } },
};
for (const L of Object.values(LAYOUTS)) L.mainH = L.H - 2 * L.padY - L.headH - L.legendH - 2 * L.gap;
function pickLayout(vw, vh) {
  const F = LAYOUTS.full, C = LAYOUTS.compact;
  const sf = Math.min((vw - 24) / F.W, (vh - 24) / F.H);
  if (sf >= 0.9) return { L: F, scale: Math.min(sf, 1.25) };
  const sc = Math.min((vw - 16) / C.W, (vh - 16) / C.H);
  return { L: C, scale: Math.max(0.5, Math.min(sc, 1.15)) };
}

const KINDS = { p: 'PASIVA', a: 'ACTIVA NUEVA', c: 'ELECCIÓN', k: 'NODO CLAVE', x: 'APEX' };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const initials = (name) => (String(name || '?').split(/\s+/).filter(w => w.length > 2).slice(0, 2).map(w => w[0]).join('') || String(name || '?')[0]).toUpperCase();

export function createTalentPanel(host, opts = {}) {
  const T = opts.api;
  if (!T) throw new Error('createTalentPanel: falta opts.api (import * as Talents from "./talents.js")');
  const ops = { ...createTalentOps(T), ...(opts.ops || {}) };
  const getPlayer = opts.getPlayer || (() => null);
  const onChange = opts.onChange || (() => {});
  const canEdit = opts.canEdit || (() => null);
  const base = opts.assetBase ?? 'assets/';
  const doc = host.ownerDocument || document;
  const win = doc.defaultView || window;

  const root = doc.createElement('div');
  root.id = opts.id || 'panel-talents';
  root.className = 'panel tp hidden';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-label', 'Talentos');
  root.innerHTML = '<div class="tp-stage"></div>';
  host.appendChild(root);
  const stage = root.firstChild;

  const S = {
    open: false, view: 'trees', // 'trees' | 'choose'
    key: null, layout: null, scale: 1,
    hover: null,                // { which, id }
    importing: false, importErr: '', resetArmed: false, resetT: 0,
    trees: {},                  // which → { tree, nodes: Map(id → refs), edges: [], gates: [], band }
    refs: {},
  };
  const close = () => { if (opts.onClose) opts.onClose(); else api.close(); };

  // ---------- utilidades ----------
  const iconSrc = (p, which, node) => base + (node.icon || `talents/${p.classId}-${which === 'cls' ? 'clase' : p.talents.spec}-${node.id}.webp`);
  function imgTag(src, cls, alt = '') {
    return `<img class="${cls}" src="${esc(src)}" alt="${esc(alt)}" draggable="false" onerror="this.classList.add('tp-broken')">`;
  }
  function toast(msg, kind = 'err') {
    const t = S.refs.toast; if (!t) return;
    t.textContent = msg;
    t.className = 'tp-toast tp-toast-' + kind + ' tp-show';
    clearTimeout(S.toastT);
    S.toastT = setTimeout(() => t.classList.remove('tp-show'), 2600);
  }
  function featInfo(p) {
    const st = Math.min(2, (p.strongholdsCleared || []).length);
    const bo = Math.min(4, Math.floor((p.records?.bossKills || 0) / 3));
    return { n: st + bo, st, bo };
  }
  function mutate(fn, okMsg) {
    const p = getPlayer(); if (!p) return false;
    const lock = canEdit(p);
    if (lock) { toast(lock); return false; }
    const r = fn(p);
    if (r && r.ok === false) { if (r.reason || r.error) toast(r.reason || r.error); render(); return false; }
    try { onChange(p); } catch (e) { console.error('[talentos] onChange', e); }
    render();
    if (okMsg) toast(okMsg, 'ok');
    return true;
  }

  // ---------- layout / escala ----------
  function applyLayout() {
    const { L, scale } = pickLayout(win.innerWidth || 1920, win.innerHeight || 1080);
    S.scale = scale;
    stage.style.zoom = String(Math.round(scale * 1000) / 1000);
    if (S.layout !== L) { S.layout = L; S.key = null; }
    stage.classList.remove('tp-full', 'tp-compact');
    stage.classList.add('tp-' + L.name);
    const st = stage.style;
    st.width = L.W + 'px'; st.height = L.H + 'px';
    st.setProperty('--tp-pad-y', L.padY + 'px'); st.setProperty('--tp-pad-x', L.padX + 'px');
    st.setProperty('--tp-gap', L.gap + 'px'); st.setProperty('--tp-head-h', L.headH + 'px');
    st.setProperty('--tp-legend-h', L.legendH + 'px'); st.setProperty('--tp-main-h', L.mainH + 'px');
    st.setProperty('--tp-cls-w', L.clsW + 'px'); st.setProperty('--tp-spec-w', L.specW + 'px');
    st.setProperty('--tp-mid-w', L.midW + 'px'); st.setProperty('--tp-tree-head', L.treeHead + 'px');
  }
  let resizeRaf = 0;
  const onResize = () => {
    if (resizeRaf) return;
    resizeRaf = win.requestAnimationFrame(() => { resizeRaf = 0; if (S.open) { const prev = S.layout; applyLayout(); if (prev !== S.layout) render(); } });
  };

  // ---------- esqueleto ----------
  function buildSkeleton(p, spec, view) {
    const info = specInfo(spec);
    const cc = CLASS_COLOR[p.classId] || '#e8c06a';
    stage.style.setProperty('--tp-spec', info.color);
    stage.style.setProperty('--tp-hi', info.hi);
    stage.style.setProperty('--tp-cls', cc);
    stage.style.setProperty('--tp-mech-bg', info.bg);
    stage.style.setProperty('--tp-mech-bd', info.bd);
    stage.style.setProperty('--tp-tree-bd', info.tree);
    const portrait = spec ? base + (spec.icon || `specs/${spec.id}.webp`) : '';
    const emblem = spec ? base + (spec.emblem || `emblems/${spec.id}.webp`) : '';
    const L = S.layout;
    let main;
    if (view === 'choose') main = chooserHTML(p);
    else main = `
      <section class="tp-tree tp-tree-cls" aria-label="Árbol de clase" style="width:${L.clsW}px">
        <div class="tp-thead"><div class="tp-tname">Árbol de ${esc(CLASS_NAME[p.classId] || p.classId)}</div>
          <div class="tp-tpts" data-pts="cls"></div></div>
        <div class="tp-canvas" data-canvas="cls"></div>
      </section>
      <div class="tp-mid" style="width:${L.midW}px">
        <div class="tp-detail" data-detail></div>
        ${info.mech ? `<div class="tp-mech">
          <div class="tp-mech-top"><span class="tp-mech-title">MECÁNICA ÚNICA · ${esc(info.mech.toUpperCase())}</span><span class="tp-mech-only">Solo ${esc(spec.name)}</span></div>
          <p class="tp-mech-text">${info.text}</p>
          <div class="tp-gauge"><div class="tp-gauge-fill"></div></div>
          <div class="tp-mech-cols">${info.cols.map(([a, b]) => `<div><span>${esc(a.toUpperCase())}</span><span>${esc(b)}</span></div>`).join('')}</div>
        </div>` : ''}
        <div class="tp-grants">
          <div class="tp-label">HABILIDADES CONCEDIDAS POR TALENTOS</div>
          <div class="tp-grant-list" data-grants></div>
          <div class="tp-code">
            <div class="tp-code-field"><label for="${root.id}-code">Código para compartir la build</label>
              <input id="${root.id}-code" class="tp-code-input" data-code readonly spellcheck="false" autocomplete="off"></div>
            <button class="tp-btn tp-btn-sm" data-act="copy">Copiar</button>
            <button class="tp-btn tp-btn-sm" data-act="import">Importar</button>
            <button class="tp-btn tp-btn-sm tp-btn-gold" data-act="import-apply">Aplicar</button>
            <button class="tp-btn tp-btn-sm" data-act="import-cancel">Cancelar</button>
          </div>
          <div class="tp-code-err" data-code-err role="alert"></div>
        </div>
      </div>
      <section class="tp-tree tp-tree-spec" aria-label="Árbol de especialización" style="width:${L.specW}px">
        <div class="tp-thead"><div class="tp-tname tp-tname-spec">${emblem ? imgTag(emblem, 'tp-temblem') : ''}${esc(spec?.name || '')}</div>
          <div class="tp-tpts" data-pts="spec"></div></div>
        <div class="tp-canvas" data-canvas="spec">${portrait ? imgTag(portrait, 'tp-tree-art') : ''}</div>
      </section>`;
    stage.innerHTML = `
      ${portrait ? imgTag(portrait, 'tp-bgart') : ''}
      <header class="tp-head">
        <div class="tp-crest">${imgTag(base + 'ui/menu_talentos.webp', 'tp-crest-img')}</div>
        <div class="tp-titles"><h2 class="tp-h1" data-title></h2><div class="tp-sub" data-sub></div></div>
        <div class="tp-actions">
          <span class="tp-lock" data-lock></span>
          ${view === 'choose' ? (spec ? '<button class="tp-btn" data-act="back">Volver a los talentos</button>' : '')
            : `<button class="tp-btn tp-btn-spec" data-act="spec">${emblem ? imgTag(emblem, 'tp-btn-emblem') : ''}Especialización</button>
               <button class="tp-btn tp-btn-gold" data-act="preset">Recomendado</button>
               <button class="tp-btn tp-btn-ghost" data-act="reset">Reiniciar</button>`}
          <button class="tp-close" data-act="close" title="Cerrar (Esc)" aria-label="Cerrar">✕</button>
        </div>
      </header>
      <div class="tp-main">${main}</div>
      <footer class="tp-legend">
        <span><i class="tp-lg tp-lg-p"></i>Pasiva</span>
        <span><i class="tp-lg tp-lg-a"></i>Activa nueva</span>
        <span><i class="tp-lg tp-lg-c"></i>Elección (A o B)</span>
        <span><i class="tp-lg tp-lg-k"></i>Nodo clave</span>
        <span><i class="tp-lg tp-lg-x"></i>Apex</span>
        <span class="tp-lg-sep"><i class="tp-dot" style="background:#e8c06a"></i>Al máximo</span>
        <span><i class="tp-dot" style="background:#7bd36a"></i>Disponible</span>
        <span><i class="tp-dot" style="background:#4a4252"></i>Bloqueado</span>
        <span class="tp-keys">Clic +1 · Clic derecho −1 · N / Esc cerrar</span>
      </footer>
      <div class="tp-toast" data-toast role="status" aria-live="polite"></div>`;
    const q = (s) => stage.querySelector(s);
    S.refs = { title: q('[data-title]'), sub: q('[data-sub]'), lock: q('[data-lock]'), toast: q('[data-toast]'),
      detail: q('[data-detail]'), grants: q('[data-grants]'), code: q('[data-code]'), codeErr: q('[data-code-err]'),
      pts: { cls: q('[data-pts="cls"]'), spec: q('[data-pts="spec"]') } };
    S.trees = {};
    if (view !== 'choose') {
      buildTree(p, 'cls', q('[data-canvas="cls"]'));
      if (spec) buildTree(p, 'spec', q('[data-canvas="spec"]'));
      const ci = S.refs.code;
      ci.addEventListener('keydown', (e) => {
        e.stopPropagation(); // que el juego no lea las teclas mientras se escribe
        if (!S.importing) return;
        if (e.key === 'Enter') { e.preventDefault(); doImport(); }
        else if (e.key === 'Escape') { e.preventDefault(); setImporting(false); }
      });
      ci.addEventListener('keyup', (e) => e.stopPropagation());
    }
  }

  function chooserHTML(p) {
    const t = T.talentTreesFor(p.classId);
    const lockLvl = (p.level | 0) < T.TALENT_START_LEVEL;
    const cur = p.talents?.spec;
    return `<div class="tp-choose">
      ${(t?.specs || []).map(s => {
        const info = specInfo(s);
        const isCur = s.id === cur;
        const btn = lockLvl ? `<button class="tp-btn" disabled>Disponible en el nivel ${T.TALENT_START_LEVEL}</button>`
          : isCur ? '<button class="tp-btn tp-btn-gold" data-act="back">Especialización actual · ver talentos</button>'
          : `<button class="tp-btn tp-btn-choose" data-act="choose" data-spec="${esc(s.id)}">Elegir ${esc(s.name)}</button>`;
        return `<article class="tp-card${isCur ? ' tp-card-cur' : ''}${lockLvl ? ' tp-card-lock' : ''}" style="--c:${info.color};--hi:${info.hi};--mbg:${info.bg};--mbd:${info.bd}">
          <div class="tp-card-art">${imgTag(base + (s.icon || `specs/${s.id}.webp`), 'tp-card-portrait')}
            <div class="tp-card-emblem">${imgTag(base + (s.emblem || `emblems/${s.id}.webp`), 'tp-card-emblem-img')}</div></div>
          <div class="tp-card-body">
            <div class="tp-card-role">${esc((info.role || '').toUpperCase())}</div>
            <h3 class="tp-card-name">${esc(s.name)}</h3>
            <p class="tp-card-desc">${esc(info.desc)}</p>
            ${info.mech ? `<div class="tp-card-mech"><span>MECÁNICA · ${esc(info.mech.toUpperCase())}</span><p>${info.text}</p></div>` : ''}
            <div class="tp-card-foot">${btn}</div>
          </div></article>`;
      }).join('')}
    </div>`;
  }

  // ---------- árboles ----------
  function buildTree(p, which, canvas) {
    const tree = T.treeOf(p, which);
    if (!tree || !canvas) return;
    const L = S.layout, G = L[which];
    const cx = (n) => G.cx0 + n.c * G.dx, cy = (n) => L.cy0 + n.r * L.dy;
    const canvasH = L.mainH - L.treeHead;
    let html = '';
    const lastRow = Math.max(...tree.nodes.map(n => n.r));
    const apexGate = tree.gates.find(g => g.level);
    if (which === 'spec' && apexGate) {
      const top = Math.round(cy({ r: apexGate.row }) - L.dy * 0.52);
      const h = Math.round(Math.min(canvasH - 8 - top, L.dy * 1.17));
      html += `<div class="tp-band" data-band style="top:${top}px;height:${h}px"><span>APEX</span></div>`;
    }
    tree.gates.forEach((g, i) => {
      const y = Math.round(L.cy0 + (g.row - 0.5) * L.dy);
      html += `<div class="tp-gate" data-gate="${i}" style="top:${y}px"><span class="tp-gate-lbl"></span></div>`;
    });
    const edges = [];
    for (const n of tree.nodes) for (const pid of n.req || []) {
      const par = T.nodeById(tree, pid); if (!par) continue;
      const x1 = cx(par), y1 = cy(par), x2 = cx(n), y2 = cy(n);
      const len = Math.round(Math.hypot(x2 - x1, y2 - y1));
      const deg = Math.round(Math.atan2(y2 - y1, x2 - x1) * 1800 / Math.PI) / 10;
      html += `<div class="tp-edge" data-edge="${edges.length}" style="left:${x1}px;top:${y1 - 1.5}px;width:${len}px;transform:rotate(${deg}deg)"></div>`;
      edges.push({ par, n });
    }
    for (const n of tree.nodes) {
      const s = n.t === 'k' || n.t === 'x' ? L.big : L.node;
      html += `<div class="tp-node k-${esc(n.t)}" data-tree="${which}" data-id="${esc(n.id)}" style="left:${cx(n) - s / 2}px;top:${cy(n) - s / 2}px;width:${s}px;height:${s}px">
        <span class="tp-pulse"></span><span class="tp-burst"></span>
        <button class="tp-nbtn" type="button"><span class="tp-nfill">${imgTag(iconSrc(p, which, n), 'tp-nimg')}<span class="tp-glyph">${esc(initials(n.name))}</span></span></button>
        ${n.free ? '' : '<span class="tp-badge"></span>'}${n.t === 'c' ? '<span class="tp-opt"></span>' : ''}</div>`;
    }
    canvas.insertAdjacentHTML('beforeend', html);
    canvas.style.setProperty('--tp-rows', lastRow + 1);
    const nodes = new Map();
    canvas.querySelectorAll('.tp-node').forEach(el => nodes.set(el.dataset.id, {
      el, btn: el.querySelector('.tp-nbtn'), badge: el.querySelector('.tp-badge'), opt: el.querySelector('.tp-opt'), burst: el.querySelector('.tp-burst') }));
    S.trees[which] = { tree, nodes, edges: edges.map((e, i) => ({ ...e, el: canvas.querySelector(`[data-edge="${i}"]`) })),
      gates: tree.gates.map((g, i) => ({ g, el: canvas.querySelector(`[data-gate="${i}"]`) })), band: canvas.querySelector('[data-band]') };
  }

  function updateTree(p, which) {
    const TT = S.trees[which]; if (!TT) return;
    const tree = T.treeOf(p, which); if (!tree) return;
    TT.tree = tree;
    const ranks = T.ranksOf(p, which);
    const rk = (n) => (n.free ? 1 : (ranks[n.id] | 0));
    const left = T.talentPointsLeft(p, which);
    const earned = T.talentPointsEarned(p, which);
    const spent = T.spentIn(tree, ranks);
    S.refs.pts[which].innerHTML = `<b class="${left > 0 ? 'tp-left' : 'tp-left0'}">${left}</b> puntos libres · ${spent}/${earned}`;
    for (const n of tree.nodes) {
      const R = TT.nodes.get(n.id); if (!R) continue;
      const st = ops.nodeState(p, which, n, tree);
      R.el.className = `tp-node k-${n.t} is-${st.state}${st.canAdd ? ' can-add' : ''}`;
      if (R.badge) R.badge.textContent = `${st.rank}/${n.max}`;
      if (R.opt) R.opt.textContent = st.rank > 0 ? (st.choice || n.opts[0].k) : '';
      R.btn.setAttribute('aria-label', `${n.name}, rango ${st.rank} de ${n.max}${st.canAdd ? ', disponible' : ''}${st.state === 'locked' ? ', bloqueado' : ''}`);
    }
    for (const E of TT.edges) {
      const on = rk(E.par) >= E.par.max, live = on && rk(E.n) > 0;
      E.el.className = 'tp-edge' + (live ? ' is-live' : on ? ' is-on' : '');
    }
    for (const Gt of TT.gates) {
      const g = Gt.g;
      const have = T.spentIn(tree, ranks, g.row);
      const ok = have >= g.need && (!g.level || (p.level | 0) >= g.level);
      Gt.el.className = 'tp-gate' + (ok ? ' is-ok' : '');
      Gt.el.firstChild.textContent = ok ? (g.level ? 'APEX DESBLOQUEADO' : `FILA ${g.row + 1} DESBLOQUEADA`)
        : g.level ? `APEX · NIVEL ${g.level} Y ${g.need} PUNTOS (${have})` : `${g.need} PUNTOS PARA DESBLOQUEAR (${have})`;
      if (g.level && TT.band) TT.band.classList.toggle('is-ok', ok);
    }
  }

  // ---------- panel de detalle (el "tooltip" fijo del mockup) ----------
  function updateDetail(p) {
    const box = S.refs.detail; if (!box) return;
    let h = S.hover;
    if (!h || !S.trees[h.which]?.tree || !T.nodeById(S.trees[h.which].tree, h.id)) {
      // por defecto: el primer talento disponible (o el nodo clave)
      h = null;
      for (const which of ['spec', 'cls']) {
        const TT = S.trees[which]; if (!TT) continue;
        const n = TT.tree.nodes.find(x => ops.nodeState(p, which, x, TT.tree).canAdd) || (which === 'spec' ? TT.tree.nodes.find(x => x.free) : null);
        if (n) { h = { which, id: n.id }; break; }
      }
      if (!h && S.trees.cls) h = { which: 'cls', id: S.trees.cls.tree.nodes[0].id };
      if (!h) { box.innerHTML = ''; return; }
    }
    const tree = S.trees[h.which].tree, n = T.nodeById(tree, h.id);
    const st = ops.nodeState(p, h.which, n, tree);
    const lines = [];
    if (n.t === 'c') {
      const pick = st.choice || n.opts[0].k;
      for (const o of n.opts) {
        const on = st.rank > 0 && o.k === pick;
        lines.push(`<button class="tp-line tp-line-opt${on ? ' is-on' : ''}" data-act="opt" data-k="${esc(o.k)}" data-which="${h.which}" data-id="${esc(n.id)}" type="button">
          <span class="tp-line-title">${esc(o.k)} · ${esc(o.name)}${o.active || o.fx?.grant ? ' · activa' : ''}${on ? ' ✓' : ''}</span>
          <span class="tp-line-text">${esc(o.desc ?? o.d ?? '')}</span></button>`);
      }
    } else {
      const box1 = (title, text, cls = '') => `<div class="tp-line ${cls}">${title ? `<span class="tp-line-title">${esc(title)}</span>` : ''}<span class="tp-line-text">${esc(text)}</span></div>`;
      const r = st.rank;
      if (n.free) lines.push(box1('', T.nodeDesc(n, 1)));
      else if (r <= 0) lines.push(box1(n.max > 1 ? `Rango 1 (máx. ${n.max})` : 'Rango 1', T.nodeDesc(n, 1), 'is-next'));
      else if (r >= n.max) lines.push(box1(`Rango ${r} · máximo`, T.nodeDesc(n, r), 'is-cur'));
      else {
        const cur = T.nodeDesc(n, r), nxt = T.nodeDesc(n, r + 1);
        if (cur === nxt) lines.push(box1(`Rango actual ${r} · siguiente ${r + 1}`, cur, 'is-cur'));
        else { lines.push(box1(`Rango actual (${r})`, cur, 'is-cur')); lines.push(box1(`Siguiente rango (${r + 1})`, nxt, 'is-next')); }
      }
    }
    let status, sc;
    if (n.free) { status = 'Concedido gratis al elegir la especialización'; sc = 'gold'; }
    else if (st.maxed) { status = 'Al máximo' + (st.removeBlock ? ` · ${st.removeBlock}` : ' · clic derecho para quitar un rango'); sc = 'gold'; }
    else if (st.gate || st.req) { status = st.gate || st.req; sc = 'warn'; }
    else if (st.left <= 0) { status = `Sin puntos libres en este árbol${st.rank > 0 && st.removeBlock ? ' · ' + st.removeBlock : ''}`; sc = 'warn'; }
    else { status = 'Disponible: haz clic para aprender' + (st.removeBlock ? ` · ${st.removeBlock}` : ''); sc = 'ok'; }
    const kindColor = n.t === 'x' ? 'var(--tp-hi)' : n.t === 'a' ? (h.which === 'cls' ? 'var(--tp-cls)' : 'var(--tp-hi)') : n.t === 'k' ? '#e8c06a' : '#b8ad9a';
    box.className = 'tp-detail' + (n.t === 'x' ? ' is-apex' : '');
    box.innerHTML = `
      <div class="tp-d-top"><span class="tp-d-kind" style="color:${kindColor}">${KINDS[n.t] || ''}${h.which === 'cls' ? ' · CLASE' : ' · ESPECIALIZACIÓN'}</span>
        <span class="tp-d-rank">Rango ${st.rank}/${n.max} · fila ${n.r + 1}</span></div>
      <div class="tp-d-name">${esc(n.name)}</div>
      <div class="tp-d-lines${n.t === 'c' ? ' is-choice' : ''}">${lines.join('')}</div>
      <div class="tp-d-status tp-s-${sc}">${esc(status)}</div>
      <div class="tp-d-hint">Clic: +1 rango · Clic derecho: −1 · En elecciones, clic alterna la opción</div>`;
  }

  function updateGrants(p) {
    const el = S.refs.grants; if (!el) return;
    const items = [];
    for (const which of ['cls', 'spec']) {
      const TT = S.trees[which]; if (!TT) continue;
      for (const g of ops.grantsOf(p, which, TT.tree)) items.push({ ...g, which });
    }
    const short = S.layout?.name === 'compact';
    const label = (g) => g.choice ? (short ? `fila ${g.node.r + 1} (${g.opt})` : `elección, fila ${g.node.r + 1}`) : short ? `fila ${g.node.r + 1}`
      : `${g.which === 'cls' ? (CLASS_NAME[p.classId] || 'Clase') : (T.findSpec(p.classId, p.talents.spec)?.name || '')}, fila ${g.node.r + 1}`;
    el.innerHTML = items.length ? items.map(g => `
      <div class="tp-grant${g.learned ? ' is-on' : ''} tp-g-${g.which}" data-hover-which="${g.which}" data-hover-id="${esc(g.node.id)}">
        <span class="tp-grant-ic">${imgTag(iconSrc(p, g.which, g.node), 'tp-grant-img')}<span class="tp-glyph">${esc(initials(g.name))}</span></span>
        <span class="tp-grant-txt"><span class="tp-grant-name">${esc(g.name)}</span>
          <span class="tp-grant-tag">${g.learned ? 'Aprendida' : 'Sin aprender'} · ${esc(label(g))}</span></span>
      </div>`).join('') : '<div class="tp-empty">Este árbol no concede habilidades activas.</div>';
    el.classList.toggle('is-scroll', el.scrollHeight > el.clientHeight + 2);
  }

  function updateCode(p) {
    const ci = S.refs.code; if (!ci) return;
    stage.classList.toggle('tp-importing', S.importing);
    if (!S.importing) { ci.readOnly = true; ci.value = ops.exportCode(p); ci.placeholder = ''; }
    S.refs.codeErr.textContent = S.importErr || '';
  }
  function setImporting(on) {
    S.importing = on; S.importErr = '';
    const ci = S.refs.code; if (!ci) return;
    if (on) { ci.readOnly = false; ci.value = ''; ci.placeholder = 'Pega aquí un código IRPG1-…'; }
    const p = getPlayer(); if (p) updateCode(p);
    if (on) ci.focus();
  }
  function doImport() {
    const p = getPlayer(); if (!p) return;
    const lock = canEdit(p);
    if (lock) { S.importErr = lock; updateCode(p); return; }
    const code = S.refs.code.value;
    const r = ops.importCode(p, code);
    if (!r.ok) { S.importErr = r.error; updateCode(p); return; }
    S.importing = false; S.importErr = '';
    try { onChange(p); } catch (e) { console.error('[talentos] onChange', e); }
    render();
    toast('Build importada', 'ok');
  }
  function copyCode() {
    const ci = S.refs.code; if (!ci) return;
    const txt = ci.value;
    const done = () => toast('Código copiado', 'ok');
    try {
      if (win.navigator?.clipboard?.writeText) { win.navigator.clipboard.writeText(txt).then(done, () => { ci.select(); doc.execCommand?.('copy'); done(); }); return; }
    } catch { /* sin portapapeles: selección manual */ }
    ci.select(); try { doc.execCommand('copy'); } catch { /* ignorar */ }
    done();
  }

  // ---------- render ----------
  function render() {
    if (root.classList.contains('hidden')) { // lo cerró otro (ui.closePanel)
      if (S.open) { S.open = false; win.removeEventListener('resize', onResize); }
      return;
    }
    if (!S.open) return;
    const p = getPlayer();
    if (!p) { stage.innerHTML = '<div class="tp-empty">Sin personaje.</div>'; S.key = null; return; }
    ops.ensure(p);
    if (!S.layout) applyLayout();
    const spec = T.findSpec(p.classId, p.talents.spec);
    const view = !spec || S.view === 'choose' ? 'choose' : 'trees';
    const key = [p.classId, spec?.id || '-', view, S.layout.name].join('|');
    if (key !== S.key) { S.key = key; buildSkeleton(p, spec, view); }
    // cabecera
    const info = specInfo(spec);
    const fi = featInfo(p);
    const feats = fi.n ? `${fi.n} hazaña${fi.n > 1 ? 's' : ''} (${fi.st} ${fi.st === 1 ? 'bastión' : 'bastiones'}, ${fi.bo} jefe${fi.bo === 1 ? '' : 's'} único${fi.bo === 1 ? '' : 's'})` : 'sin hazañas';
    const cname = CLASS_NAME[p.classId] || p.classId;
    if (view === 'choose') {
      S.refs.title.textContent = `Especialización · ${cname}`;
      S.refs.sub.textContent = (p.level | 0) < T.TALENT_START_LEVEL
        ? `Nivel ${p.level | 0} · las especializaciones se desbloquean en el nivel ${T.TALENT_START_LEVEL} (te faltan ${T.TALENT_START_LEVEL - (p.level | 0)})`
        : `Nivel ${p.level | 0} · elige tu camino: su nodo clave es gratis · cada especialización guarda sus talentos · cambiar es gratis fuera de combate`;
    } else {
      S.refs.title.textContent = `Talentos · ${cname} ${spec.name}`;
      S.refs.sub.textContent = `Nivel ${p.level | 0} · ${info.role} · ${feats} · cambiar especialización: gratis fuera de combate`;
      updateTree(p, 'cls'); updateTree(p, 'spec');
      updateDetail(p); updateGrants(p); updateCode(p);
    }
    const lock = canEdit(p);
    S.refs.lock.textContent = lock || '';
    stage.classList.toggle('tp-locked', !!lock);
    const rb = stage.querySelector('[data-act="reset"]');
    if (rb) rb.textContent = S.resetArmed ? '¿Seguro? Reiniciar' : 'Reiniciar';
  }

  // ---------- eventos (delegados; ninguno por frame) ----------
  function nodeFromEvent(e) {
    const el = e.target.closest?.('.tp-node');
    return el && stage.contains(el) ? { which: el.dataset.tree, id: el.dataset.id, el } : null;
  }
  function burst(which, id) {
    const R = S.trees[which]?.nodes.get(id); if (!R) return;
    R.el.classList.remove('tp-burst-a', 'tp-burst-b');
    void R.el.offsetWidth; // reinicia la animación
    R.el.classList.add(S.flip ? 'tp-burst-a' : 'tp-burst-b'); S.flip = !S.flip;
  }
  root.addEventListener('click', (e) => {
    if (e.target === root) { close(); return; } // clic en el fondo oscuro
    const nd = nodeFromEvent(e);
    if (nd) {
      const p = getPlayer(); if (!p) return;
      const tree = S.trees[nd.which]?.tree; const n = tree && T.nodeById(tree, nd.id);
      S.hover = { which: nd.which, id: nd.id };
      if (n?.t === 'c' && (T.ranksOf(p, nd.which)[n.id] | 0) > 0) { mutate(q => ops.toggleChoice(q, nd.which, nd.id)); return; }
      if (mutate(q => ops.addRank(q, nd.which, nd.id))) burst(nd.which, nd.id);
      return;
    }
    const b = e.target.closest?.('[data-act]');
    if (!b || !stage.contains(b) || b.disabled) return;
    const act = b.dataset.act;
    if (act === 'close') close();
    else if (act === 'spec') { S.view = 'choose'; render(); }
    else if (act === 'back') { S.view = 'trees'; render(); }
    else if (act === 'choose') {
      const sid = b.dataset.spec;
      if (mutate(q => ops.chooseSpec(q, sid))) { S.view = 'trees'; S.hover = null; render(); toast(`Especialización: ${T.findSpec(getPlayer().classId, sid)?.name || sid}`, 'ok'); }
    }
    else if (act === 'preset') mutate(q => ops.applyPresetAll(q), 'Build recomendada aplicada');
    else if (act === 'reset') {
      if (!S.resetArmed) {
        S.resetArmed = true; render();
        clearTimeout(S.resetT); S.resetT = setTimeout(() => { S.resetArmed = false; render(); }, 3000);
      } else { S.resetArmed = false; clearTimeout(S.resetT); mutate(q => ops.resetAll(q), 'Talentos reiniciados'); }
    }
    else if (act === 'opt') mutate(q => ops.setChoice(q, b.dataset.which, b.dataset.id, b.dataset.k));
    else if (act === 'copy') copyCode();
    else if (act === 'import') setImporting(true);
    else if (act === 'import-cancel') setImporting(false);
    else if (act === 'import-apply') doImport();
  });
  root.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const nd = nodeFromEvent(e);
    if (!nd) return;
    S.hover = { which: nd.which, id: nd.id };
    mutate(q => ops.removeRank(q, nd.which, nd.id));
  });
  const hoverTo = (which, id) => {
    if (S.hover && S.hover.which === which && S.hover.id === id) return;
    S.hover = { which, id };
    const p = getPlayer(); if (p) updateDetail(p);
  };
  root.addEventListener('mouseover', (e) => {
    const nd = nodeFromEvent(e);
    if (nd) { hoverTo(nd.which, nd.id); return; }
    const g = e.target.closest?.('[data-hover-id]');
    if (g && stage.contains(g)) hoverTo(g.dataset.hoverWhich, g.dataset.hoverId);
  });
  root.addEventListener('focusin', (e) => { const nd = nodeFromEvent(e); if (nd) hoverTo(nd.which, nd.id); });

  // ---------- API ----------
  const api = {
    el: root,
    isOpen: () => S.open,
    open() {
      if (!S.open) { S.open = true; win.addEventListener('resize', onResize); }
      root.classList.remove('hidden');
      S.view = 'trees'; S.importing = false; S.importErr = '';
      applyLayout();
      render();
    },
    close() {
      if (S.open) { S.open = false; win.removeEventListener('resize', onResize); }
      root.classList.add('hidden');
      S.resetArmed = false; clearTimeout(S.resetT);
    },
    render() {
      // tolera que ui.js quite `hidden` por su cuenta (togglePanel) y luego llame render()
      if (!S.open && !root.classList.contains('hidden')) { S.open = true; win.addEventListener('resize', onResize); applyLayout(); }
      render();
    },
    showSpecChoice() { api.open(); S.view = 'choose'; render(); },
    destroy() { api.close(); root.remove(); },
    ops,
  };
  return api;
}
