// ============================================================
// LIBRO DE HABILIDADES CON FORJA (tecla T) — Paso 2 (U2)
// ============================================================
// docs/paso2f-habilidades-ux.md §3 (manda en contenido: distribución, flujo y clics, tooltip
// rico, estados, ranura 2 flexible, accesibilidad) y docs/paso2g-maga-coherencia.md §9.3 (el
// libro por ORIGEN: kit base · kit de tu especialización con su barra de mecánica en demo ·
// las otras especializaciones). Porta el mockup aprobado (docs/mockups/skills-ux.html).
//
// createSkillBook(root, { game, onClose, onOpenTalents }) → { open(), close(), refresh(), el, check(),
//   isOpen(), select(id), showSpecSwap(summary) }
//   root          capa donde vive el libro (U3: document.body o su capa de paneles)
//   game          el juego: player, assignHotbar, chooseForge, canRespecFree, save, ui.message
//   onClose       al cerrar (✕, T o Esc)
//   onOpenTalents al pulsar «Talentos N» (o la tecla N con el libro abierto)
// Lo que se ve lo deciden los modelos PUROS de js/hud-model.js (bookView, forgeView,
// talentLinks, supportOptions, recoPlan); aquí solo se pinta y se reparten los eventos.
// El libro es una pantalla de 1560 × 930 escalada con --s (bookScale: 1 a 1920 × 1080 y 0,8 a
// 1366 × 768), así que las medidas son fijas y nada lee el layout para colocar la forja.
// DOM estable (§3.12, humo y ?skillscheck=1): #skills-book[data-open], .sb-tile[data-skill],
// .sb-var[data-var][data-state], .sb-mejora; check() deja window.__uicheck = { panel, overlaps, offscreen }.
// #skills-book[data-open] va por PRESENCIA (como #talents-panel de U1): data-open="" con el libro
// abierto y sin el atributo cerrado; el humo y los arneses lo leen con hasAttribute.
// Iconos que no existen → <span class="ico-missing" data-id="…"> (no se piden imágenes que no
// están: los iconos de variante de la forja aún no existen, §7 del plan).
// Se importa sin DOM (los tests corren en Node): nada usa `document` al cargar el módulo.
import { bookView, forgeView, talentLinks, supportOptions, supportsAfter, recoPlan, bookScale, skillOf, slotOfSkill,
  SLOT_ORDER, SLOT_LABEL, ROLE_INFO, ROLE_ROW, VERB_LABEL, catLabel, resIcon, specCard, skillArtPath, hyphenEs } from './hud-model.js';
import { createGaugeHud, gaugeViewFor } from './ui-gauges.js';
import { gaugeTuning } from './spec-mechanics.js';
import { fitsSlot } from './skill-resolve.js';
import { SLOT_UNLOCK } from './skill-defs.js';
import { talentTreesFor, TALENT_RULES } from './talents.js';
import { mergeBindings, buildCodeMap, keyLabel } from './bindings.js';

// iconos de VARIANTE ya pintados (assets/forge/v_<id>.webp): vacío hasta la tanda de arte
// (2f §5; A8 diferido). Mientras, la reserva legible: icono base virado al color del papel
// (la II en espejo) con el glifo grande del papel (2f §4.1)
export const FORGE_ART = new Set([
  'a_disparo_i', 'a_disparo_ii', 'a_f_rastreador_i', 'a_f_rastreador_ii', 'a_f_rodilla_i', 'a_f_rodilla_ii',
  'a_humo_i', 'a_humo_ii', 'a_m_acecho_i', 'a_m_acecho_ii', 'a_m_detonante_i', 'a_m_detonante_ii', 'a_orbe_i',
  'a_orbe_ii', 'a_paso_i', 'a_paso_ii', 'a_sello_i', 'a_sello_ii', 'a_t_andanada_i', 'a_t_andanada_ii',
  'a_t_apuntado_i', 'a_t_apuntado_ii', 'a_t_cepo_i', 'a_t_cepo_ii', 'a_u_celeste_i', 'a_u_celeste_ii',
  'a_u_diluvio_i', 'a_u_diluvio_ii', 'a_u_zarzas_i', 'a_u_zarzas_ii', 'a_v_carrera_i', 'a_v_carrera_ii',
  'bola_fuego_i', 'bola_fuego_ii', 'embestida_i', 'embestida_ii', 'flecha_multiple_i', 'flecha_multiple_ii',
  'flecha_perforante_i', 'flecha_perforante_ii', 'g_carga_escudo_i', 'g_carga_escudo_ii', 'g_guardia_i',
  'g_guardia_ii', 'g_hendidura_i', 'g_hendidura_ii', 'g_juicio_i', 'g_juicio_ii', 'g_lanza_i', 'g_lanza_ii',
  'g_martillo_i', 'g_martillo_ii', 'g_piel_i', 'g_piel_ii', 'g_rajar_i', 'g_rajar_ii', 'g_remolino_i',
  'g_remolino_ii', 'g_salto_i', 'g_salto_ii', 'g_sendero_i', 'g_sendero_ii', 'g_tajo_i', 'g_tajo_ii',
  'g_u_cataclismo_i', 'g_u_cataclismo_ii', 'g_u_ciudadela_i', 'g_u_ciudadela_ii', 'g_u_furia_i', 'g_u_furia_ii',
  'k_lanza_i', 'k_lanza_ii', 'k_prision_i', 'k_prision_ii', 'lluvia_flechas_i', 'lluvia_flechas_ii', 'm_barrera_i',
  'm_barrera_ii', 'm_dardo_i', 'm_dardo_ii', 'm_estela_ignea_i', 'm_estela_ignea_ii', 'm_parpadeo_i',
  'm_parpadeo_ii', 'm_paso_escarcha_i', 'm_paso_escarcha_ii', 'm_u_desgarro_i', 'm_u_desgarro_ii', 'm_u_supernova_i',
  'm_u_supernova_ii', 'm_u_tormenta_i', 'm_u_tormenta_ii', 'meteoro_i', 'meteoro_ii', 'nova_hielo_i',
  'nova_hielo_ii', 'p_llamarada_i', 'p_llamarada_ii', 'rayo_i', 'rayo_ii', 'terremoto_i', 'terremoto_ii'
]);
const TIP_DELAY = 160;                       // ms (2f §3.4)
const DRAG_PX = 7;
// glifos de papel (reserva hasta los iconos rol_*): un objetivo, área, control, aguante, apoyo, movilidad
export const ROLE_GLYPH = Object.freeze({
  UNI: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/></svg>',
  AREA: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="2.5" fill="currentColor"/><path d="M5.6 6.6a9 9 0 0 0 0 10.8M18.4 6.6a9 9 0 0 1 0 10.8M8.5 9a4.6 4.6 0 0 0 0 6M15.5 9a4.6 4.6 0 0 1 0 6"/></svg>',
  CTRL: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="9" width="8" height="6" rx="3"/><rect x="13" y="9" width="8" height="6" rx="3"/></svg>',
  AGU: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 3l8 3v6c0 4.5-3.4 7.8-8 9-4.6-1.2-8-4.5-8-9V6z"/></svg>',
  APO: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M6 21V3M6 4h11l-3 4 3 4H6"/></svg>',
  MOV: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M4 16h9l3-6M13 16l5 0 2-3M3 11h6M5 7h6"/></svg>',
});
const LOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
// escapa y deja juntos el número y su unidad («40 %», «0,25 s», «2 m» no se parten al final de línea)
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
  .replace(/(\d) (?=%|s\b|m\b)/g, '$1\u00a0');
const fmt = v => String(Math.round((+v || 0) * 10) / 10).replace('.', ',');
const fmt2 = v => String(Math.round((+v || 0) * 100) / 100).replace('.', ',');       // coeficientes (Alt)
const SPEC_AT = TALENT_RULES.specAt;          // nivel en que se elige especialización (y se abre la ranura 3)
const VAR_NUM = { i: 'I', ii: 'II' };
// textos largos (catálogo v1 sin `line`, líneas de variante de más de 90 letras): una línea más con
// letra algo menor en vez de cortarlos (el texto entero sigue en el tooltip)
const LONG_LINE = 110, LONG_VAR = 90;

export function createSkillBook(root, opts = {}) {
  const game = opts.game || null;
  const doc = root?.ownerDocument || null;
  const stub = { el: root || null, open() {}, close() {}, refresh() {}, isOpen: () => false, select() {}, showSpecSwap() {},
    check() { return { panel: 'skills', overlaps: [], offscreen: [] }; } };
  if (!root || !doc) return stub;
  const win = doc.defaultView || globalThis;
  // rutas de arte relativas a ESTE módulo: valen en index.html y en tests/visual/
  const ASSET = new URL('../assets/', import.meta.url).href;
  const A = p => (p ? ASSET + String(p).replace(/^assets\//, '').replace(/^\.\.\/assets\//, '') : null);
  const P = () => game?.player || null;
  // atajos con las teclas que use el jugador (bindings.js; remapeables en Ajustes)
  let defBinds = null, defMap = null;
  const binds = () => game?.input?.bindings || (defBinds ||= mergeBindings());
  const actionOf = code => (game?.input?.codeToAction || (defMap ||= buildCodeMap(binds())))[code] || null;
  const K = act => esc(keyLabel(binds()[act]?.[0]) || '');

  // ---------------------------------------------------------------- esqueleto (una vez)
  const layer = doc.createElement('div');
  layer.id = 'skills-book';                  // cerrado: sin data-open
  layer.setAttribute('role', 'dialog');
  layer.setAttribute('aria-label', 'Libro de habilidades');
  layer.innerHTML = `
    <div class="sb-stage">
      <header class="sb-head">
        <div class="sb-emb"><img src="${A('ui/menu_habilidades.webp')}" alt="" draggable="false"></div>
        <div class="sb-titles"><h2 class="sb-title" data-title>Habilidades</h2><div class="sb-sub" data-sub></div></div>
        <div class="sb-sp"></div>
        <button class="sb-btn" type="button" data-act="talents"><img src="${A('ui/menu_talentos.webp')}" alt="" draggable="false">Talentos <kbd data-key="talents">N</kbd></button>
        <button class="sb-btn" type="button" data-act="reco" title="Aplica las variantes recomendadas para tu especialización">Recomendado</button>
        <button class="sb-btn sb-x" type="button" data-act="close" title="Cerrar (T / Esc)" aria-label="Cerrar">✕</button>
      </header>
      <div class="sb-body">
        <section class="sb-card sb-bookcard"><div class="sb-card-h"><h3>Libro</h3><span class="r" data-count></span></div><div class="sb-book" data-book></div></section>
        <section class="sb-card sb-forge" data-forge></section>
      </div>
      <footer class="sb-bar">
        <span class="t">Barra</span>
        <div class="sb-slots" data-slots></div>
        <div class="sb-hints"><span>⇢ arrastra · <kbd data-key="skill1">1</kbd>–<kbd data-key="skill4">4</kbd> asigna · <kbd>Alt</kbd> detalle · <kbd data-key="skills">T</kbd> cerrar</span></div>
      </footer>
    </div>
    <div class="sb-tip" role="tooltip"></div>
    <div class="sb-toast" hidden></div>
    <div class="sb-ghost"></div>
    <div class="sb-pop"></div>
    <div class="sb-strip" role="status" aria-live="polite"></div>`;
  root.appendChild(layer);
  const $ = s => layer.querySelector(s);
  const R = { stage: $('.sb-stage'), title: $('[data-title]'), sub: $('[data-sub]'), count: $('[data-count]'), book: $('[data-book]'),
    forge: $('[data-forge]'), slots: $('[data-slots]'), tip: $('.sb-tip'), toast: $('.sb-toast'), ghost: $('.sb-ghost'), pop: $('.sb-pop'),
    strip: $('.sb-strip') };

  const S = { open: false, sel: null, hover: null, alt: false, seen: new Set(), view: null, fv: null, s: 1,
    tipFn: null, tipAnchor: null, tipTimer: 0, lastEv: null, drag: null, popFor: null, gauge: null, gaugeId: null, toastT: 0, stripT: 0 };

  // ---------------------------------------------------------------- utilidades de pintura
  const combat = () => typeof game?.canRespecFree === 'function' && !game.canRespecFree();
  const message = (txt, sk = null) => {
    R.toast.hidden = false;
    R.toast.innerHTML = (sk ? icoHTML(sk.art, sk.id, sk.emoji, 'sb-ico sm') : '') + `<div>${txt}</div>`;
    win.clearTimeout(S.toastT);
    S.toastT = win.setTimeout(() => { R.toast.hidden = true; }, 2200);
  };
  // icono: <img> si hay ruta (si no carga, marcador); sin ruta, el marcador directamente
  function icoHTML(path, id, emoji = '✦', cls = 'sb-ico', extra = '') {
    if (!path) return `<span class="${cls} ico-missing" data-id="${esc(id)}" title="${esc(id)}"${extra}><b>${esc(emoji)}</b><i>${esc(id)}</i></span>`;
    return `<span class="${cls}"${extra}><img src="${esc(A(path))}" alt="" draggable="false" data-id="${esc(id)}"></span>`;
  }
  // los <img> que fallan se cambian por el marcador (2f §3.12)
  layer.addEventListener('error', e => {
    const img = e.target;
    if (img?.tagName !== 'IMG' || !img.dataset.id) return;
    const box = img.parentNode;
    if (!box) return;
    box.classList.add('ico-missing');
    box.dataset.id = img.dataset.id;
    box.title = img.dataset.id;
    img.remove();
    if (!box.querySelector('i')) box.insertAdjacentHTML('beforeend', `<i>${esc(box.dataset.id)}</i>`);
  }, true);
  const roleChip = (role) => `<span class="sb-role" style="color:${ROLE_INFO[role].color}">${ROLE_GLYPH[role]}${esc(ROLE_INFO[role].label)}</span>`;
  // icono de variante: reserva legible (base virada al color del papel, II en espejo, glifo del
  // papel) y, si existe, su arte encima
  function varIco(fv, v, cls = '') {
    const base = fv.art ? `<img class="bgi" src="${esc(A(fv.art))}" alt="" draggable="false">` : '';
    const art = FORGE_ART.has(v.id) ? `<img class="art" src="${esc(A(`forge/v_${v.id}.webp`))}" alt="" draggable="false">` : '';
    return `<span class="sb-vico ${v.key} ${cls}" style="--rc:${v.roleColor}">${base}<i class="tint"></i><span class="gl">${ROLE_GLYPH[v.role]}</span>${art}</span>`;
  }

  // ---------------------------------------------------------------- cabecera
  function renderHead(v) {
    const p = P();
    R.title.textContent = `Habilidades · ${v.cls.name}`;
    const res = v.cls.res;
    const pend = v.pending ? ` · <b class="sb-pend">${v.pending} variante${v.pending > 1 ? 's' : ''} por elegir</b>` : '';
    R.sub.innerHTML = `Nivel <b>${p?.level || 1}</b>${v.spec ? ` · ${esc(v.spec.name)}` : ''}${res ? ` · <img class="sb-resi" src="${esc(A(resIcon(res.id)) || '')}" alt="">${esc(res.name)}` : ''}${pend}`;
    R.count.textContent = `${v.known} de ${v.total} aprendidas`;
    layer.querySelector('[data-act="reco"]').disabled = !v.spec;
  }

  // ---------------------------------------------------------------- libro
  function tileHTML(t) {
    const mark = t.variant ? `<span class="sb-seal">${VAR_NUM[t.variant]}</span>` : '';
    const reco = t.reco ? `<span class="sb-reco" title="Recomendada para tu especialización">★</span>` : '';
    const lock = t.known ? '' : `<span class="sb-lock">${LOCK}${t.lockLv ? `Nv ${t.lockLv}` : ''}</span>`;
    const isNew = t.isNew && !S.seen.has(t.id) ? '<span class="sb-new" title="Novedad"></span>' : '';
    return `<div class="sb-tile${t.known ? '' : ' locked'}${S.sel === t.id ? ' sel' : ''}${t.todo ? ' todo' : ''}${t.talent ? ' talent' : ''}${t.spec ? ' spk' : ''}" ` +
      `data-skill="${esc(t.id)}" tabindex="0" role="button" aria-label="${esc(t.name)} · ${esc(t.catLabel)}${t.slotLabel ? ' · ranura ' + t.slotLabel : ''}">` +
      (t.slotLabel ? `<span class="sb-key">${t.slotLabel}</span>` : '') + isNew +
      `<span class="sb-icowrap">${icoHTML(t.art, t.id, t.emoji)}${lock}${mark}${reco}<img class="sb-catb" src="${esc(A(t.catIcon) || '')}" alt="" title="${esc(t.catLabel)}"></span>` +
      (t.tag ? `<span class="sb-ttag">${t.tag}</span>` : '') + `<span class="sb-nm">${esc(hyphenEs(t.name))}</span></div>`;
  }
  function renderBook(v) {
    const p = P();
    const trees = talentTreesFor(p?.classId);
    const out = [];
    for (const g of v.groups) {
      if (g.id === 'base') {
        const emb = trees?.cls?.emblem ? A(trees.cls.emblem) : (A(resIcon(v.cls.res?.id)) || '');
        out.push(`<section class="sb-sec sb-base"><div class="sb-sec-h"><img src="${esc(emb)}" alt="">${esc(g.title)}<span class="n">${g.known}/${g.tiles.length}</span></div>` +
          `<div class="sb-tiles">${g.tiles.map(tileHTML).join('')}</div></section>`);
      } else if (g.id === 'spec') {
        const sp = g.spec;
        out.push(`<section class="sb-sec sb-spec" style="--spc:${sp.color}"><div class="sb-sec-h"><img class="emb" src="${esc(A(sp.emblem))}" alt="">${esc(sp.name)}` +
          `<span class="n">${g.known}/${g.tiles.length} · tu especialización</span></div>` +
          (g.tiles.length ? `<div class="sb-tiles">${g.tiles.map(tileHTML).join('')}</div>` : '') +
          `<div class="sb-gains"><span class="sb-gchip" data-g="mech"><img src="${esc(A(sp.emblem))}" alt="">Mecánica: <b>${esc(sp.mechName)}</b></span>` +
          (sp.innateText ? `<span class="sb-gchip" data-g="innate"><img src="${esc(A(sp.emblem))}" alt="">Pasiva: <b>${esc(sp.innateText)}</b></span>` : '') + '</div>' +
          `<div class="sb-gz" data-gauge></div></section>`);
      } else {
        const pre = g.id === 'pre';
        const note = !pre ? `se cambian gratis en Talentos <kbd>${K('talents')}</kbd>`
          : v.level < SPEC_AT ? `eliges una al nivel ${SPEC_AT} · cada una trae su kit` : `elige una en Talentos <kbd>${K('talents')}</kbd> · cada una trae su kit`;
        out.push(`<section class="sb-sec sb-others${pre ? ' pre' : ''}"><div class="sb-sec-h">${pre ? `<img src="${esc(A('ui/cat_especializacion.webp'))}" alt="">Especialización` : 'Otras especializaciones'}` +
          `<span class="n">${note}</span></div>` +
          g.rows.map(r => `<div class="sb-srow" data-spec="${esc(r.id)}"><img class="se" src="${esc(A(r.emblem))}" alt="" data-tipspec="${esc(r.id)}">` +
            `<div class="sb-sname"><b>${esc(r.name)}</b><small>${esc(r.roleLabel)}${r.mechName ? ' · ' + esc(r.mechName) : ''}</small></div>` +
            `<div class="sb-mini">${r.kit.map(k => `<span class="sb-mt" data-mini="${esc(k.id)}">${icoHTML(k.art, k.id, k.emoji, 'sb-ico')}<img class="sb-catb" src="${esc(A(k.catIcon) || '')}" alt=""></span>`).join('')}</div>` +
            (r.choose ? `<button class="sb-choose" type="button" data-act="talents" title="Elige tu especialización en Talentos">Elegir <kbd>${K('talents')}</kbd></button>`
              : `<span class="lv">${r.lockLv ? `${LOCK}Nv ${r.lockLv}` : ''}</span>`) + '</div>').join('') + '</section>');
      }
    }
    // la barra de mecánica en demo vive fuera del innerHTML (no se reinicia en cada repintado)
    if (S.gauge) S.gauge.el.remove();
    R.book.classList.toggle('dense', !!v.dense);       // 3 filas de casillas o más: libro compacto
    R.book.innerHTML = out.join('');
    mountGauge(v.spec);
  }
  function mountGauge(spec) {
    const slot = R.book.querySelector('[data-gauge]');
    if (!slot || !spec?.mechanic || !S.open) { if (S.gauge) { S.gauge.destroy(); S.gauge = null; S.gaugeId = null; } return; }
    if (!S.gauge) {
      const host = doc.createElement('div');
      try { S.gauge = createGaugeHud(host, { mode: 'demo', id: spec.mechanic }); S.gaugeId = spec.mechanic; } catch (e) { try { console.warn('[ui-skills] mecánica', e); } catch { /* */ } S.gauge = null; }
    } else if (S.gaugeId !== spec.mechanic) { S.gauge.play(spec.mechanic); S.gaugeId = spec.mechanic; }
    if (S.gauge) slot.appendChild(S.gauge.el);
  }

  // ---------------------------------------------------------------- forja
  // la forja se dibuja en coordenadas fijas: árbol de 744 px de ancho (css/skills.css); las alturas, en %
  const TREE = { w: 744, mx: 150, vx: 540 };
  function renderForge() {
    const p = P();
    const sk = skillOf(p, S.sel);
    if (!sk) { R.forge.innerHTML = '<div class="sb-empty">Elige una habilidad del libro.</div>'; S.fv = null; return; }
    const fv = forgeView(p, sk, { combat: combat() });
    S.fv = fv;
    const chips = [];
    chips.push(`<span class="sb-chip"><img src="${esc(A(fv.catIcon) || '')}" alt="">${esc(fv.catLabel)} · ${fv.slots.split(' o ').map(s => `<kbd>${s}</kbd>`).join(' o ')}</span>`);
    if (fv.dmg) chips.push(`<span class="sb-chip gold">Daño ${fv.dmg} %</span>`);
    const res = p?.cls?.resource;
    if (fv.cost) chips.push(`<span class="sb-chip">${resIcon(res?.id) ? `<img src="${esc(A(resIcon(res.id)))}" alt="">` : ''}${fv.cost}</span>`);
    if (fv.cd) chips.push(`<span class="sb-chip">⏱ ${fmt(fv.cd)} s</span>`);
    if (fv.elemLabel) chips.push(`<span class="sb-chip">${esc(fv.elemLabel)}</span>`);
    for (const vb of fv.verbs) chips.push(`<span class="sb-chip verb">${esc(VERB_LABEL[vb] || vb)}</span>`);
    if (fv.spec) chips.push(`<span class="sb-chip spec"><img src="${esc(A(fv.spec.emblem))}" alt="">${esc(fv.spec.name)}</span>`);
    if (fv.innate) chips.push(`<span class="sb-chip gold">${esc(fv.innate)}</span>`);
    const dots = Array.from({ length: fv.rankMax }, (_, i) => `<i class="${i < fv.rank ? 'on' : ''}"></i>`).join('');
    let html = `<div class="sb-fh">${icoHTML(fv.art, fv.id, fv.emoji, 'sb-ico big')}<div class="sb-fhx"><h4>${esc(fv.name)}</h4><div class="sb-line${fv.line.length > LONG_LINE * 1.7 ? ' long xlong' : fv.line.length > LONG_LINE ? ' long' : ''}">${esc(fv.line)}</div><div class="sb-chips">${chips.join('')}</div></div>` +
      (fv.talent ? '' : `<div class="sb-rank"><span>Rango</span><b>${fv.rank}</b><div class="dots">${dots}</div><span>sube con el nivel</span></div>`) + '</div>';
    if (fv.talent) {
      html += `<div class="sb-tree sb-tree-msg"><div>Activa de ${fv.hero ? 'Paragon' : 'talento'}: sus cambios están en el árbol que la concede.` +
        `<button class="sb-btn" type="button" data-act="talents"><img src="${esc(A('ui/menu_talentos.webp'))}" alt="">Abrir Talentos <kbd>${K('talents')}</kbd></button></div></div>`;
      R.forge.innerHTML = html + footHTML(fv);
      return;
    }
    if (!fv.entry) {
      html += `<div class="sb-tree sb-tree-msg"><div>Esta habilidad aún no tiene forja.</div></div>`;
      R.forge.innerHTML = html + footHTML(fv);
      return;
    }
    const ch = fv.chosen;
    const path = (y2, on, sel) => `<path class="${sel ? 'sel' : on ? 'on' : ''}" d="M${TREE.mx + 58} 50 C ${TREE.mx + 130} 50, ${TREE.vx - 270} ${y2}, ${TREE.vx - 190} ${y2}" vector-effect="non-scaling-stroke"/>`;
    const open = fv.vars.some(x => x.state !== 'bloqueada');
    html += `<div class="sb-tree"><svg viewBox="0 0 ${TREE.w} 100" preserveAspectRatio="none" aria-hidden="true">${path(25, open, ch === 'i')}${path(75, open, ch === 'ii')}</svg>`;
    const m = fv.mejora;
    if (m) {
      html += `<div class="sb-mejora ${m.state === 'abierta' ? 'on' : 'off'}" data-state="${m.state}" style="left:${TREE.mx}px;top:50%" tabindex="0">` +
        `<div class="lbl">Mejora</div><div class="dia">${icoHTML(fv.art, fv.id, fv.emoji, 'sb-ico')}</div><div class="nm2">${esc(m.name)}</div></div>`;
    }
    for (const v of fv.vars) {
      const st = v.state === 'bloqueada' ? 'locked' : v.state === 'elegida' ? 'chosen' : ch === 'i' || ch === 'ii' ? 'other' : fv.pending ? 'todo' : 'open';
      const pill = v.state === 'bloqueada' ? `<span class="sb-lockpill">${LOCK}Nv ${v.level}</span>` : v.state === 'elegida' ? '<span class="sb-sealb">ELEGIDA</span>' : '';
      html += `<div class="sb-var ${st}${fv.combat ? ' combat' : ''}" data-var="${v.key}" data-state="${v.state}" style="left:${TREE.vx}px;top:${v.key === 'i' ? 25 : 75}%" tabindex="0" role="button" aria-label="Variante ${v.num}: ${esc(v.name)} · ${esc(v.roleLabel)}">` +
        `<span class="num">${v.num}</span>${pill}${v.reco ? `<span class="sb-recochip">★ ${esc(v.recoSpec)}</span>` : ''}` +
        `${varIco(fv, v)}<div class="sb-vtx"><div class="vn">${esc(v.name)}</div><div class="vs${v.line.length > LONG_VAR ? ' long' : ''}">${esc(v.line)}</div>${roleChip(v.role)}</div></div>`;
    }
    html += '</div>';
    R.forge.innerHTML = html + footHTML(fv);
  }
  function footHTML(fv) {
    let socks = '';
    for (let i = 0; i < fv.sockets; i++) {
      const s = fv.supports[i];
      socks += `<button class="sb-sock${s ? ' on' : ''}${s && !s.fits ? ' bad' : ''}" type="button" data-sock="${i}" aria-label="Engarce ${i + 1}">${s ? `<span>${esc(s.icon)}</span>` : '+'}</button>`;
    }
    const note = fv.combat ? `<span class="sb-note lock">${LOCK} En combate: variantes y engarces bloqueados</span>`
      : '<span class="sb-note">Cambiar de variante es <b>gratis</b> fuera de combate</span>';
    return `<div class="sb-ffoot"><span class="t">Engarces</span>${socks}${note}</div>`;
  }

  // ---------------------------------------------------------------- barra
  function renderBar() {
    const p = P();
    const out = [];
    for (const slot of SLOT_ORDER) {
      const lab = SLOT_LABEL[slot];
      const lv = SLOT_UNLOCK[slot] || 1;
      if ((p?.level || 1) < lv) {
        out.push(`<div class="sb-slot locked" data-slot="${slot}"><span class="k">${lab}</span><span class="lk">${slot === 'k3' ? `<img src="${esc(A('ui/cat_especializacion.webp'))}" alt="">` : LOCK}Nv ${lv}</span></div>`);
        continue;
      }
      const sk = skillOf(p, p?.hotbar?.[slot]);
      const t = sk ? bookTileOf(sk.id) : null;
      out.push(`<div class="sb-slot${sk ? '' : ' empty'}${slot === 'k2' ? ' flex' : ''}" data-slot="${slot}">` +
        (sk ? icoHTML(t?.art, sk.id, sk.icon || '✦', 'sb-ico') : '') + `<span class="k">${lab}</span>` + (slot === 'k2' ? '<span class="flexb">FLEX</span>' : '') +
        (t?.variant ? `<span class="sb-seal">${VAR_NUM[t.variant]}</span>` : '') + '</div>');
    }
    R.slots.innerHTML = out.join('');
  }
  // casilla del libro de una habilidad (o la de la barra, si no está en el libro)
  function bookTileOf(id) {
    for (const g of S.view?.groups || []) for (const t of g.tiles || []) if (t.id === id) return t;
    const sk = skillOf(P(), id);
    return sk ? { id, art: skillArtPath(sk, talentTreesFor(P()?.classId)), variant: null, emoji: sk.icon, known: true } : null;
  }

  // ---------------------------------------------------------------- tooltip (ui_tooltip, 380 px)
  function tipShow(e, fn, anchor = null) {
    S.tipFn = fn; S.tipAnchor = anchor; S.lastEv = e;
    win.clearTimeout(S.tipTimer);
    S.tipTimer = win.setTimeout(() => { if (S.tipFn !== fn) return; R.tip.innerHTML = fn(); R.tip.classList.add('on'); tipPlace(); }, opts.tipDelay ?? TIP_DELAY);
  }
  function tipHide() { win.clearTimeout(S.tipTimer); S.tipFn = null; R.tip.classList.remove('on'); }
  function tipRefresh() { if (S.tipFn && R.tip.classList.contains('on')) { R.tip.innerHTML = S.tipFn(); tipPlace(); } }
  // siempre dentro de la pantalla; el de una variante, a la IZQUIERDA de su tarjeta (no tapa a su
  // hermana, 2f §4.3); el resto, junto al ratón
  function tipPlace() {
    const vw = win.innerWidth, vh = win.innerHeight, s = S.s;
    const w = R.tip.offsetWidth * s, hgt = R.tip.offsetHeight * s;
    let x, y;
    if (S.tipAnchor) {
      const a = S.tipAnchor.getBoundingClientRect();
      x = a.left - w - 14; y = a.top;
      if (x < 8) x = a.right + 14;
    } else {
      const e = S.lastEv || { clientX: vw / 2, clientY: vh / 2 };
      x = e.clientX + 22; y = e.clientY + 18;
      if (x + w > vw - 8) x = e.clientX - w - 22;
    }
    x = Math.max(8, Math.min(vw - w - 8, x));
    y = Math.max(8, Math.min(vh - hgt - 8, y));
    R.tip.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) scale(${s})`;
  }
  const rows = (pairs) => `<table>${pairs.filter(Boolean).map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join('')}</table>`;
  function linksHTML(id) {
    const ls = talentLinks(P(), id);
    if (!ls.length) return '';
    return `<div class="sb-tnodes"><span class="lb">Talentos que la tocan</span>${ls.slice(0, 6).map(l => `<span class="tn1${l.bought ? '' : ' off'}">` +
      `${icoHTML(l.icon, l.id, '◆', 'sb-ico xs')}${esc(l.name)}${l.bought ? ' <b>✓</b>' : ''}</span>`).join('')}</div>`;
  }
  function tipSkill(id) {
    const p = P(), sk = skillOf(p, id);
    if (!sk) return '';
    const fv = forgeView(p, sk, { combat: combat() });
    const res = p?.cls?.resource?.name || 'recurso';
    if (fv.talent) {
      return `<div class="th">${icoHTML(fv.art, fv.id, fv.emoji, 'sb-ico md')}<div><div class="tn">${esc(fv.name)}</div><div class="tk">Activa de ${fv.hero ? 'Paragon' : 'talento'} · ${esc(fv.catLabel)} · ranura 2</div></div></div>` +
        `<div class="tl">${esc(fv.line)}</div>${rows([fv.cd && ['Enfriamiento', `${fmt(fv.cd)} s`]])}${linksHTML(id)}<div class="tf"><span>Se modifica en <kbd>${K('talents')}</kbd> Talentos</span></div>`;
    }
    const kind = `${fv.spec ? esc(fv.spec.name) + ' · ' : fv.known ? 'Kit base · ' : ''}${esc(fv.catLabel)} · ${fv.slots} · Rango ${fv.rank}`;
    const tr = [
      fv.dmg && ['Daño', `${fv.dmg} %${fv.dmgNext ? ` <span class="nx">→ ${fv.dmgNext} %</span>` : ''}`],
      fv.cost && ['Coste', `${fv.cost} ${esc(res)}`],
      fv.cd && ['Enfriamiento', `${fmt(fv.cd)} s`],
      fv.gen && ['Genera', `${fv.gen} ${esc(res)}`],
    ];
    const v = fv.vars.find(x => x.key === fv.chosen);
    const st = !fv.known ? `<div class="st lk">Se aprende al nivel ${fv.learnAt}</div>` : fv.pending ? '<div class="st g">¡Elige una variante!</div>'
      : v && v.state === 'elegida' ? `<div class="st ok">Variante ${v.num}: ${esc(v.name)}</div>` : '';
    const verbs = fv.verbs.length ? `<div class="tg">${fv.verbs.map(x => `<i class="vb">${esc(VERB_LABEL[x] || x)}</i>`).join('')}</div>` : '';
    return `<div class="th">${icoHTML(fv.art, fv.id, fv.emoji, 'sb-ico md')}<div><div class="tn">${esc(fv.name)}</div><div class="tk">${kind}</div></div></div>` +
      `<div class="tl">${esc(fv.line)}</div>${fv.innate ? `<div class="tnx">${esc(fv.innate)}</div>` : ''}${verbs}${rows(tr)}` +
      (fv.nextRankLv && fv.known ? `<div class="tk">Rango ${fv.rank + 1} al nivel ${fv.nextRankLv}</div>` : '') + st +
      (S.alt ? `<div class="tg">${fv.tags.map(t => `<i>${esc(t)}</i>`).join('')}</div><div class="adv"><b>Detalle (Alt):</b> daño = arma × ${fmt2(fv.coef)} × (1 + Σ aditivos) × atributo × crítico</div>` : '') +
      linksHTML(id) + '<div class="tf"><span>Clic: forja</span><span>Arrastra a la barra</span><span><kbd>Alt</kbd> detalle</span></div>';
  }
  function tipMejora() {
    const fv = S.fv, m = fv?.mejora;
    if (!m) return '';
    return `<div class="th"><span class="sb-ico md round">${fv.art ? `<img src="${esc(A(fv.art))}" alt="">` : esc(fv.emoji)}</span><div><div class="tn">${esc(m.name)}</div><div class="tk">Mejora de ${esc(fv.name)} · automática</div></div></div>` +
      `<div class="tl">${esc(m.line)}</div>` + (m.state === 'abierta' ? '<div class="st ok">✓ Activa</div>' : `<div class="st lk">Se activa sola al nivel ${m.level}</div>`) +
      (S.alt && m.detail ? `<div class="adv"><b>Detalle (Alt):</b> ${esc(m.detail)}</div>` : '');
  }
  function tipVar(key) {
    const fv = S.fv, v = fv?.vars.find(x => x.key === key);
    if (!v) return '';
    const other = fv.vars.find(x => x.key !== key);
    const row = ROLE_ROW.map(r => `<span class="rc${r === v.role ? ' me' : r === v.sisterRole ? ' ot' : ''}" style="${r === v.role ? `color:${ROLE_INFO[r].color}` : ''}" title="${esc(ROLE_INFO[r].label)}">${ROLE_GLYPH[r]}</span>`).join('') +
      `<span class="gw">gana en <b style="color:${v.roleColor}">${esc(v.roleLabel)}</b></span>`;
    const tags = [...v.tagsDel.map(t => `<i class="del">${esc(t.label)}</i>`), ...v.tagsAdd.map(t => `<i class="add">${esc(t.label)}</i>`)];
    const st = v.state === 'bloqueada' ? `<div class="st lk">Se desbloquea al nivel ${v.level}</div>`
      : fv.combat ? `<div class="st lk">${v.state === 'elegida' ? '✓ Elegida · ' : ''}bloqueada en combate</div>`
        : v.state === 'elegida' ? '<div class="st ok">✓ Elegida · clic para quitarla</div>'
          : `<div class="st g">Clic: elegir${other?.state === 'elegida' ? ` (sustituye a ${esc(other.name)})` : ''} · gratis</div>`;
    return `<div class="th">${varIco(fv, v, 'sm')}<div><div class="tn">${esc(v.name)}</div><div class="tk">Variante ${v.num} de ${esc(fv.name)}</div></div></div>` +
      `<div class="tl">${esc(v.line)}</div>${tags.length ? `<div class="tg">${tags.join('')}</div>` : ''}<div class="cmp">${row}</div>` +
      (v.reco ? `<div class="st g">★ Recomendada para ${esc(v.recoSpec)}</div>` : '') + st +
      (S.alt && v.detail ? `<div class="adv"><b>Detalle (Alt):</b> ${esc(v.detail)}</div>` : '') + linksHTML(fv.id);
  }
  function tipSlot(slot) {
    const p = P();
    const lv = SLOT_UNLOCK[slot] || 1;
    const flex = slot === 'k2' ? '<div class="tl flex">Ranura flexible: una defensa o utilidad <b>o</b> una segunda principal.</div>' : '';
    if ((p?.level || 1) < lv) return `<div class="tn">Ranura ${SLOT_LABEL[slot]}</div><div class="tl">${slot === 'k3' ? `Se abre al elegir especialización (nivel ${SPEC_AT}): su habilidad insignia.` : `Se abre al nivel ${lv}.`}</div>`;
    const id = p?.hotbar?.[slot];
    if (!id) return `<div class="tn">Ranura ${SLOT_LABEL[slot]}</div>${flex}<div class="tl">Vacía: arrastra aquí una habilidad.</div>`;
    return tipSkill(id).replace('<div class="tf">', flex + '<div class="tf">');
  }
  function tipSock(i) {
    const s = S.fv?.supports?.[i];
    if (!s) return `<div class="tn">Engarce ${i + 1}</div><div class="tl">Vacío. Clic para engarzar un soporte compatible.</div>`;
    return `<div class="tn">${esc(s.icon)} ${esc(s.name)}</div><div class="tl">${esc(s.effect)}${s.trade ? ` · <span class="lk">${esc(s.trade)}</span>` : ''}</div>` +
      (s.fits ? '' : '<div class="st lk">No encaja con la forma actual</div>') + '<div class="tf"><span>Clic: cambiar</span></div>';
  }
  function tipMech() {
    const sp = S.view?.spec;
    if (!sp?.mechanic) return '';
    let E = null;
    try { E = gaugeViewFor(sp.mechanic)?.explain?.(gaugeTuning()); } catch { E = null; }
    const lines = (E?.tip?.length ? E.tip : [E?.text]).filter(Boolean).slice(0, 3);
    return `<div class="tn">${esc(sp.mechName)}</div><div class="tk">Mecánica de ${esc(sp.name)}</div>${lines.map(l => `<div class="tl sm">${l}</div>`).join('')}`;
  }
  function tipInnate() {
    const sp = S.view?.spec;
    return sp ? `<div class="tn">Pasiva de ${esc(sp.name)}</div><div class="tk">De la especialización (no es un talento)</div><div class="tl">${esc(sp.innateText)}</div>` : '';
  }
  function tipSpec(id) {
    const p = P(), c = specCard(p?.classId, id);
    if (!c) return '';
    const kit = (S.view?.groups || []).flatMap(g => g.rows || []).find(r => r.id === id)?.kit || [];
    return `<div class="th"><span class="sb-ico md"><img src="${esc(A(c.emblem))}" alt=""></span><div><div class="tn">${esc(c.name)}</div><div class="tk">${esc(c.roleLabel)} · mecánica: ${esc(c.mechName)}</div></div></div>` +
      (c.line ? `<div class="tl">${esc(c.line)}</div>` : '') +
      (kit.length ? `<div class="sb-tnodes"><span class="lb">Desbloquea en el libro</span>${kit.map(k => `<span class="tn1">${icoHTML(k.art, k.id, k.emoji, 'sb-ico xs')}${esc(k.name)}</span>`).join('')}</div>` : '') +
      (c.innateText ? `<div class="tf"><span>Pasiva: ${esc(c.innateText)}</span></div>` : '');
  }
  function tipMini(id) {
    const p = P(), sk = skillOf(p, id);
    if (!sk) return '';
    const c = specCard(p?.classId, sk.spec);
    const lv = Math.max(sk.req || 1, SPEC_AT);
    const why = (p?.level || 1) < SPEC_AT ? `Se aprende al nivel ${lv} si eliges ${esc(c?.name)} (nivel ${SPEC_AT})`
      : specIdNow() ? `Cambia a ${esc(c?.name)} en Talentos (${K('talents')}) para usarla` : `Elige ${esc(c?.name)} en Talentos (${K('talents')}) para usarla`;
    return `<div class="tn">${esc(sk.name)}</div><div class="tk">Kit de ${esc(c?.name || '')} · ${esc(catLabel(sk.cat))}</div><div class="tl">${esc(sk.line || sk.desc || '')}</div><div class="st lk">${why}</div>`;
  }

  const specIdNow = () => S.view?.spec?.id || null;

  // ---------------------------------------------------------------- acciones
  function select(id, { focus = false } = {}) {
    const p = P(), sk = skillOf(p, id);
    if (!sk) return;
    if (sk.spec && sk.spec !== S.view?.spec?.id) { message(`${esc(sk.name)}: kit de ${esc(specCard(p.classId, sk.spec)?.name || '')}`, null); return; }
    S.sel = id; S.seen.add(id);
    renderAll();
    if (focus) R.book.querySelector(`.sb-tile[data-skill="${CSS.escape(id)}"]`)?.focus();
  }
  function chooseVar(key) {
    const fv = S.fv;
    const v = fv?.vars.find(x => x.key === key);
    if (!v) return;
    if (v.state === 'bloqueada') { message(`${esc(v.name)} se desbloquea al nivel ${v.level}`); return; }
    if (fv.combat) { message('En combate no puedes cambiar de variante'); return; }
    const next = fv.chosen === key ? null : key;
    const r = game?.chooseForge?.(fv.id, next);
    if (r && r.ok === false) { if (r.reason === 'combat') message('En combate no puedes cambiar de variante'); return; }
    renderAll();
    const el = R.forge.querySelector(`.sb-var[data-var="${key}"]`);
    if (el && S.lastEv) tipShow(S.lastEv, () => tipVar(key), el);
  }
  function assign(slot, id) {
    const p = P(), sk = skillOf(p, id);
    if (!sk) return false;
    const lv = SLOT_UNLOCK[slot] || 1;
    if ((p.level || 1) < lv) { message(`La ranura ${SLOT_LABEL[slot]} se abre al nivel ${lv}`); return false; }
    if (!fitsSlot(sk, slot)) { message(`${esc(sk.name)} va en ${SLOT_ORDER.filter(s => fitsSlot(sk, s)).map(s => SLOT_LABEL[s]).join(' o ')}`); return false; }
    const ok = typeof game?.assignHotbar === 'function' ? game.assignHotbar(slot, id) : false;
    if (ok === false) return false;
    renderAll();
    message(`${esc(sk.name)} → ranura ${SLOT_LABEL[slot]}`, bookTileOf(id) ? { ...bookTileOf(id), emoji: sk.icon } : null);
    return true;
  }
  const naturalSlot = sk => SLOT_ORDER.find(s => fitsSlot(sk, s) && (P()?.level || 1) >= (SLOT_UNLOCK[s] || 1)) || null;
  function applyReco() {
    if (combat()) { message('En combate no puedes cambiar de variante'); return; }
    const plan = recoPlan(P());
    let n = 0;
    for (const { id, v } of plan) if (game?.chooseForge?.(id, v)?.ok !== false) n++;
    renderAll();
    message(n ? `${n} variante${n > 1 ? 's' : ''} recomendada${n > 1 ? 's' : ''} para ${esc(S.view?.spec?.name || '')}` : 'Ya tienes las variantes recomendadas');
  }
  function openPop(btn, i) {
    if (combat()) { message('En combate no puedes cambiar engarces'); return; }
    const p = P(), sk = skillOf(p, S.sel);
    if (!sk) return;
    const opts2 = supportOptions(p, sk, i);
    S.popFor = { i, id: sk.id };
    R.pop.innerHTML = `<div class="pt">Engarce ${i + 1} · ${esc(sk.name)}</div><div class="g">` +
      `<button class="gm none" type="button" data-sup="" title="Quitar">✕</button>` +
      opts2.map(o => `<button class="gm ${o.state}${o.current ? ' cur' : ''}" type="button" data-sup="${esc(o.id)}" ${o.state === 'ok' || o.current ? '' : 'aria-disabled="true"'}` +
        ` aria-label="${esc(o.name)}${o.state === 'ok' ? '' : ` · ${SUP_STATE[o.state]}`}">${esc(o.icon)}${supMark(o)}</button>`).join('') + '</div>';
    R.pop.classList.add('on');
    const r = btn.getBoundingClientRect(), s = S.s;
    const ph = R.pop.offsetHeight * s, pw = R.pop.offsetWidth * s;
    const x = Math.max(8, Math.min(win.innerWidth - pw - 8, r.left));
    const y = Math.max(8, r.top - ph - 10);
    R.pop.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) scale(${s})`;
  }
  function closePop() { R.pop.classList.remove('on'); S.popFor = null; }
  // marca de forma de cada estado de la cuadrícula: candado (aún no lo tienes), aspa (no encaja)
  // o el número del otro engarce (ya está allí)
  const SUP_STATE = { unknown: 'aún no lo tienes', incompatible: 'no encaja', used: 'ya está en el otro engarce' };
  function supMark(o) {
    if (o.current || o.state === 'ok') return '';
    if (o.state === 'unknown') return `<span class="mk lk">${LOCK}</span>`;
    if (o.state === 'incompatible') return '<span class="mk no">✕</span>';
    return `<span class="mk us">${o.usedIn + 1}</span>`;
  }
  function setSupport(supId) {
    const pf = S.popFor, p = P(), sk = skillOf(p, pf?.id);
    if (!sk) return;
    const opt = supportOptions(p, sk, pf.i).find(o => o.id === supId);
    if (supId && opt && opt.state !== 'ok' && !opt.current) {
      message(opt.state === 'unknown' ? 'Aún no tienes ese soporte' : opt.state === 'used' ? 'Ya está en el otro engarce' : 'No encaja con esta habilidad');
      return;
    }
    p.supports = p.supports || {};
    p.supports[sk.id] = supportsAfter(p, sk, pf.i, supId || null);
    p.resolved = {};                       // el perfil cambia con sus soportes
    game?.save?.();
    game?.ui?.refreshHotbar?.();
    closePop(); tipHide();
    renderAll();
  }

  // ---------------------------------------------------------------- arrastre a la barra
  function dragStart(e, id) {
    if (e.button !== 0) return;
    const p = P(), sk = skillOf(p, id);
    S.drag = { id, sx: e.clientX, sy: e.clientY, moved: false, known: !!bookTileOf(id)?.known && !!sk };
    const mv = ev => {
      const d = S.drag;
      if (!d) return;
      if (!d.moved && Math.hypot(ev.clientX - d.sx, ev.clientY - d.sy) > DRAG_PX) {
        if (!d.known) return;
        d.moved = true; tipHide();
        layer.classList.add('dragging');
        const t = bookTileOf(id);
        R.ghost.innerHTML = icoHTML(t?.art, id, sk?.icon || '✦', 'sb-ico');
        R.ghost.classList.add('on');
        for (const el of R.slots.querySelectorAll('.sb-slot')) el.classList.add(fitsSlot(sk, el.dataset.slot) && !el.classList.contains('locked') ? 'ok' : 'no');
      }
      if (d.moved) {
        R.ghost.style.transform = `translate(${ev.clientX}px, ${ev.clientY}px) translate(-50%, -50%) scale(${S.s * 1.05})`;
        for (const el of R.slots.querySelectorAll('.sb-slot.hov')) el.classList.remove('hov');
        doc.elementFromPoint(ev.clientX, ev.clientY)?.closest?.('.sb-slot')?.classList.add('hov');
      }
    };
    const up = ev => {
      win.removeEventListener('pointermove', mv); win.removeEventListener('pointerup', up);
      const d = S.drag; S.drag = null;
      layer.classList.remove('dragging');
      R.ghost.classList.remove('on');
      for (const el of R.slots.querySelectorAll('.sb-slot')) el.classList.remove('ok', 'no', 'hov');
      if (!d) return;
      if (!d.moved) { select(id); return; }
      const slotEl = doc.elementFromPoint(ev.clientX, ev.clientY)?.closest?.('.sb-slot');
      if (slotEl) assign(slotEl.dataset.slot, id);
    };
    win.addEventListener('pointermove', mv);
    win.addEventListener('pointerup', up);
  }

  // ---------------------------------------------------------------- eventos (delegados, una vez)
  layer.addEventListener('pointerdown', e => {
    if (!e.target.closest('.sb-pop') && !e.target.closest('.sb-sock')) closePop();
    const tile = e.target.closest('.sb-tile');
    if (tile) dragStart(e, tile.dataset.skill);
  });
  layer.addEventListener('click', e => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'close') { api.close(); return; }
    if (act === 'talents') { opts.onOpenTalents?.(); return; }
    if (act === 'reco') { applyReco(); return; }
    const v = e.target.closest('.sb-var');
    if (v) { S.lastEv = e; chooseVar(v.dataset.var); return; }
    const sock = e.target.closest('.sb-sock');
    if (sock) { openPop(sock, +sock.dataset.sock); return; }
    const gm = e.target.closest('.sb-pop .gm');
    if (gm) { setSupport(gm.dataset.sup || null); return; }
    const slot = e.target.closest('.sb-slot');
    if (slot && !slot.classList.contains('locked')) { const id = P()?.hotbar?.[slot.dataset.slot]; if (id) select(id); return; }
    const mini = e.target.closest('[data-mini]');
    if (mini) {
      const sk = skillOf(P(), mini.dataset.mini);
      if (sk) message(`${esc(sk.name)}: ${(P()?.level || 1) < SPEC_AT ? `elige especialización al nivel ${SPEC_AT}` : `${specIdNow() ? 'cambia de' : 'elige'} especialización en Talentos (${K('talents')})`}`);
    }
  });
  layer.addEventListener('contextmenu', e => {
    const tile = e.target.closest('.sb-tile');
    if (!tile) return;
    e.preventDefault();
    const sk = skillOf(P(), tile.dataset.skill);
    const slot = sk && naturalSlot(sk);
    if (slot && bookTileOf(sk.id)?.known) assign(slot, sk.id);
  });
  // tooltip y «bajo el ratón» (para 1–4)
  layer.addEventListener('mouseover', e => {
    if (S.drag?.moved) return;
    const t = e.target;
    const tile = t.closest?.('.sb-tile');
    // las teclas 1–4 asignan la casilla bajo el ratón: fuera de una casilla, ninguna
    S.hover = tile ? tile.dataset.skill : null;
    if (tile) return tipShow(e, () => tipSkill(tile.dataset.skill));
    const v = t.closest?.('.sb-var');
    if (v) return tipShow(e, () => tipVar(v.dataset.var), v);
    if (t.closest?.('.sb-mejora')) return tipShow(e, tipMejora);
    const sl = t.closest?.('.sb-slot');
    if (sl) return tipShow(e, () => tipSlot(sl.dataset.slot));
    const so = t.closest?.('.sb-sock');
    if (so) return tipShow(e, () => tipSock(+so.dataset.sock));
    const gm = t.closest?.('.sb-pop .gm');
    if (gm) {
      const o = supportOptions(P(), skillOf(P(), S.popFor?.id), S.popFor?.i || 0).find(x => x.id === gm.dataset.sup);
      return tipShow(e, () => o ? `<div class="tn">${esc(o.icon)} ${esc(o.name)}</div><div class="tl">${esc(o.effect)}${o.trade ? ` · <span class="lk">${esc(o.trade)}</span>` : ''}</div>` +
        (o.state === 'unknown' ? '<div class="st lk">Aún no lo tienes</div>' : o.state === 'incompatible' ? `<div class="st lk">No encaja: ${esc(o.fits)}</div>` : o.state === 'used' ? '<div class="st lk">Ya está en el otro engarce</div>' : '')
        : '<div class="tn">Quitar el soporte</div>', R.pop);       // junto a la cuadrícula, sin taparla
    }
    const gc = t.closest?.('.sb-gchip');
    if (gc) return tipShow(e, gc.dataset.g === 'mech' ? tipMech : tipInnate);
    const sp = t.closest?.('[data-tipspec]');
    if (sp) return tipShow(e, () => tipSpec(sp.dataset.tipspec));
    const mini = t.closest?.('[data-mini]');
    if (mini) return tipShow(e, () => tipMini(mini.dataset.mini));
    if (!t.closest?.('.sb-tip')) tipHide();
  });
  layer.addEventListener('mousemove', e => { S.lastEv = e; if (R.tip.classList.contains('on') && !S.tipAnchor) tipPlace(); });
  layer.addEventListener('mouseleave', () => { S.hover = null; tipHide(); });
  layer.addEventListener('focusin', e => {
    const tile = e.target.closest?.('.sb-tile');
    if (tile) S.hover = tile.dataset.skill;
  });

  // teclado (2f §3.3 y §3.7): ←/→ entre habilidades, Intro elige, las teclas de habilidad 1–4
  // asignan la casilla bajo el ratón o enfocada, Esc o la tecla del libro (T) cierran, la de
  // Talentos (N) los abre, Alt amplía el tooltip. Con las teclas que tenga el jugador (bindings).
  // Fase de captura: con el libro abierto, estas teclas no llegan al juego (input.js escucha en window)
  const ACT_SLOT = { skill1: 'k1', skill2: 'k2', skill3: 'k3', skill4: 'k4' };
  const NUMPAD = { Numpad1: 'k1', Numpad2: 'k2', Numpad3: 'k3', Numpad4: 'k4' };
  function onKey(e) {
    if (!S.open) return;
    if (e.target?.closest?.('input, textarea, [contenteditable="true"]')) return;
    if (e.key === 'Alt') { if (!S.alt) { S.alt = true; tipRefresh(); } return; }    // no se detiene: input.js lo usa
    const stop = () => { e.preventDefault(); e.stopPropagation(); };
    const act = actionOf(e.code);
    const close = e.code === 'Escape' || act === 'skills';
    if (e.repeat && (close || act === 'talents')) { stop(); return; }
    if (close) { stop(); if (S.popFor) closePop(); else api.close(); return; }
    if (act === 'talents') { stop(); opts.onOpenTalents?.(); return; }
    const slot = ACT_SLOT[act] || NUMPAD[e.code];
    if (slot) { stop(); const id = S.hover || doc.activeElement?.closest?.('.sb-tile')?.dataset.skill || S.sel; if (id) assign(slot, id); return; }
    if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') {
      stop();
      const order = S.view?.order || [];
      if (!order.length) return;
      const i = order.indexOf(S.sel);
      select(order[(i + (e.code === 'ArrowRight' ? 1 : -1) + order.length) % order.length], { focus: true });
      return;
    }
    if (e.code === 'Enter' || e.code === 'NumpadEnter') {
      stop();
      const f = doc.activeElement;
      const fv = f?.closest?.('.sb-var');
      if (fv && layer.contains(fv)) { chooseVar(fv.dataset.var); R.forge.querySelector(`.sb-var[data-var="${fv.dataset.var}"]`)?.focus(); return; }
      const t = f?.closest?.('.sb-tile');
      if (t) select(t.dataset.skill, { focus: true });
      else if (S.fv?.vars?.length) R.forge.querySelector('.sb-var')?.focus();
    }
  }
  function onKeyUp(e) { if (e.key === 'Alt' && S.alt) { S.alt = false; tipRefresh(); } }
  const onResize = () => { if (S.open) applyScale(); };

  // ---------------------------------------------------------------- todo
  function applyScale() {
    S.s = bookScale(win.innerWidth, win.innerHeight);
    layer.style.setProperty('--s', String(S.s));
  }
  function renderAll() {
    const p = P();
    if (!p) return;
    const v = bookView(p);
    S.view = v;
    if (!S.sel || !skillOf(p, S.sel) || (skillOf(p, S.sel).spec && skillOf(p, S.sel).spec !== v.spec?.id)) {
      // la seleccionada: la de DER, si no la primera aprendida del libro
      S.sel = p.hotbar?.rmb && v.order.includes(p.hotbar.rmb) ? p.hotbar.rmb : (v.groups[0]?.tiles?.find(t => t.known)?.id || v.order[0] || null);
    }
    renderHead(v);
    renderBook(v);
    renderForge();
    renderBar();
    layer.classList.toggle('combat', combat());
  }

  const api = {
    el: layer,
    isOpen: () => S.open,
    open() {
      if (S.open) { api.refresh(); return; }
      S.open = true;
      layer.setAttribute('data-open', '');
      applyScale();
      for (const k of layer.querySelectorAll('kbd[data-key]')) k.textContent = keyLabel(binds()[k.dataset.key]?.[0]) || k.textContent;
      doc.addEventListener('keydown', onKey, true);
      doc.addEventListener('keyup', onKeyUp, true);
      win.addEventListener('resize', onResize);
      renderAll();
      if (/[?&]skillscheck=1\b/.test(win.location?.search || '')) { layer.classList.add('sb-check'); win.requestAnimationFrame?.(() => api.check()); }
    },
    close() {
      if (!S.open) return;
      S.open = false;
      layer.removeAttribute('data-open');
      tipHide(); closePop();
      doc.removeEventListener('keydown', onKey, true);
      doc.removeEventListener('keyup', onKeyUp, true);
      win.removeEventListener('resize', onResize);
      if (S.gauge) { S.gauge.destroy(); S.gauge = null; S.gaugeId = null; }
      R.strip.classList.remove('on');
      opts.onClose?.();
    },
    refresh() { if (S.open) renderAll(); },
    select(id) { if (S.open) select(id); else S.sel = id; },
    // la tira «qué cambia» al cambiar de especialización (specSwapSummary de hud-model)
    showSpecSwap(sum, { host = null, ms = 7000 } = {}) {
      if (!sum?.spec) return;
      const io = (art, id, emoji) => icoHTML(art, id, emoji, 'sb-ico xs');
      const ins = sum.insignia || {};
      const parts = [`<span class="h"><img src="${esc(A(sum.spec.emblem))}" alt=""><b>${esc(sum.spec.name)}</b></span>`];
      if (ins.to) parts.push(`<span><kbd>3</kbd>${ins.from ? `<s>${esc(ins.from.name)}</s>→` : ''}${io(ins.to.art, ins.to.id, ins.to.emoji)}<b>${esc(ins.to.name)}</b></span>`);
      if (sum.grantsIn.length || sum.grantsOut.length) parts.push(`<span>${sum.grantsIn.map(g => `${io(g.art, g.id, g.emoji)}<em class="in">+${esc(g.name)}</em>`).join(' ')}${sum.grantsOut.map(g => `<em class="out">−${esc(g.name)}</em>`).join(' ')}</span>`);
      if (sum.reco.length) parts.push(`<span><b class="star">★</b>Recomendadas ${sum.reco.map(r => io(r.art, r.id, r.emoji)).join('')}</span>`);
      if (sum.mechanic?.name) parts.push(`<span>Mecánica: <b>${esc(sum.mechanic.name)}</b></span>`);
      parts.push(`<span><kbd>${K('skills')}</kbd> ver en el libro</span>`);
      const el = host || R.strip;
      el.innerHTML = `<div class="row">${parts.join('<i class="sep"></i>')}</div>`;
      if (!host) applyScale();
      el.classList.add('sb-strip', 'on');
      win.clearTimeout(S.stripT);
      S.stripT = win.setTimeout(() => el.classList.remove('on'), ms);
    },
    // ?skillscheck=1 / humo: cajas del libro, solapes y lo que sale de la pantalla (A5)
    check() {
      const out = { panel: 'skills', overlaps: [], offscreen: [] };
      if (!S.open) { win.__uicheck = out; return out; }
      const vw = win.innerWidth, vh = win.innerHeight;
      const box = el => { const r = el.getBoundingClientRect(); return r.width >= 1 && r.height >= 1 ? r : null; };
      const name = el => el.dataset.skill || el.dataset.var || el.dataset.slot || el.dataset.sock || el.className.split(' ')[0];
      const hit = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
      const groups = [
        ['.sb-tile', R.book], ['.sb-var, .sb-mejora', R.forge], ['.sb-slot', R.slots], ['.sb-chip', R.forge], ['.sb-srow', R.book], ['.sb-sec', R.book],
      ];
      for (const [sel, scope] of groups) {
        const els = [...scope.querySelectorAll(sel)].map(el => [el, box(el)]).filter(x => x[1]);
        for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) {
          if (els[i][0].contains(els[j][0]) || els[j][0].contains(els[i][0])) continue;
          if (hit(els[i][1], els[j][1])) out.overlaps.push(`${sel}: ${name(els[i][0])} × ${name(els[j][0])}`);
        }
      }
      // tarjetas grandes: el libro no pisa la forja ni la barra; nada sale del escenario ni de la pantalla
      const big = [['libro', layer.querySelector('.sb-bookcard')], ['forja', R.forge], ['barra', layer.querySelector('.sb-bar')], ['cabecera', layer.querySelector('.sb-head')]];
      for (let i = 0; i < big.length; i++) for (let j = i + 1; j < big.length; j++) {
        const a = box(big[i][1]), b = box(big[j][1]);
        if (a && b && hit(a, b)) out.overlaps.push(`${big[i][0]} × ${big[j][0]}`);
      }
      const stage = box(R.stage), bk = box(R.book);
      for (const el of [R.stage, ...layer.querySelectorAll('.sb-tile, .sb-var, .sb-mejora, .sb-slot, .sb-chip, .sb-sock, .sb-btn, .sb-srow, .sb-gchip')]) {
        const r = box(el);
        if (!r) continue;
        // lo que recorta el scroll del libro tampoco se ve sin desplazarse
        if (bk && R.book.contains(el) && (r.bottom > bk.bottom + 1 || r.top < bk.top - 1)) out.offscreen.push(`${name(el)} (bajo el pliegue)`);
        else if (r.left < -1 || r.top < -1 || r.right > vw + 1 || r.bottom > vh + 1) out.offscreen.push(name(el));
        else if (el !== R.stage && stage && (r.left < stage.left - 1 || r.right > stage.right + 1 || r.top < stage.top - 1 || r.bottom > stage.bottom + 1)) out.offscreen.push(`${name(el)} (fuera del libro)`);
      }
      // textos cortados: con puntos suspensivos (nombres de variante, de especialización…), los que
      // pasan de sus líneas (line-clamp) y las palabras que no caben en su caja
      // (en una línea solo se mira el ancho: los glifos de Cinzel asoman por abajo sin cortarse)
      const wide = el => el.scrollWidth > el.clientWidth + 1;
      const tall = el => el.matches('.sb-line, .sb-var .vs, .sb-nm') && el.scrollHeight > el.clientHeight + 1;
      for (const el of layer.querySelectorAll('.sb-var .vn, .sb-var .vs, .sb-fh h4, .sb-line, .sb-sname b, .sb-sname small, .sb-gchip, .sb-nm')) {
        if (!wide(el) && !tall(el)) continue;
        const host = el.closest('[data-skill], [data-var], [data-spec], .sb-gchip');
        out.offscreen.push(`${R.forge.contains(el) ? `forja de ${S.sel} · ` : ''}${host ? name(host) + ' ' : ''}${el.className ? '.' + el.className.split(' ')[0] : el.tagName.toLowerCase()} (texto cortado)`);
      }
      if (R.tip.classList.contains('on')) { const r = box(R.tip); if (r && (r.left < 0 || r.top < 0 || r.right > vw || r.bottom > vh)) out.offscreen.push('tooltip'); }
      win.__uicheck = out;
      return out;
    },
  };
  return api;
}
