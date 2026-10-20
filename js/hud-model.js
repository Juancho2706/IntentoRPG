// ============================================================
// MODELO DEL HUD (módulo PURO, sin DOM) — Paso 2d
// ============================================================
// Todo lo que la interfaz DECIDE y se puede probar sin navegador: qué sprite lleva
// cada punto de interés del mapa, qué iconos de estado muestra un enemigo, cómo se
// agrupa el libro de habilidades por categoría, el estado de una ranura de la barra
// (enfriamiento, sombra de GCD, recurso insuficiente), el indicador de
// especialización y la barra de stagger de un jefe. js/ui.js solo pinta lo que
// devuelven estas funciones (tests/test71-hud-modelo.mjs las cubre).
//
// Rutas de assets (relativas a index.html; copiadas de IntentoRPG-assets/web en 2d):
//   assets/ui/cat_*.webp (categoría) · res_* (recurso) · st_* (estado) · menu_* (paneles)
//   · eq_* (ranuras de equipo) · mat_* (materiales) · assets/map/mk_*.webp (marcadores)
//   · assets/chrome/*.webp (marcos 9-slice y texturas, solo CSS)
import { GCD_CATS } from './skill-defs.js';

export const UI_BASE = 'assets/ui/';
export const MAP_BASE = 'assets/map/';
export const uiIcon = (name) => (name ? `${UI_BASE}${name}.webp` : null);
export const mapIcon = (name) => (name ? `${MAP_BASE}${name}.webp` : null);

// ---------- categorías de habilidad (libro + esquina de la ranura) ----------
// orden del libro (docs/paso2-diseno.md §1.1); defensa y utilidad comparten sección
export const BOOK_SECTIONS = Object.freeze([
  { id: 'basic', label: 'Básico', hint: 'Genera recurso · clic izquierdo', cats: ['basic'], icon: 'cat_basico', slots: ['lmb'] },
  { id: 'spender', label: 'Gastadora', hint: 'Gasta recurso · clic derecho o ranura 2', cats: ['spender'], icon: 'cat_gastadora', slots: ['rmb', 'k2'] },
  { id: 'movement', label: 'Movilidad', hint: 'Ranura 1 · fuera del enfriamiento global', cats: ['movement'], icon: 'cat_movilidad', slots: ['k1'] },
  { id: 'defense', label: 'Defensa / utilidad', hint: 'Ranura 2 (flexible)', cats: ['defense', 'utility'], icon: 'cat_defensa', slots: ['k2'] },
  { id: 'spec', label: 'Especialización', hint: 'Ranura 3 · la otorga tu especialización', cats: ['spec'], icon: 'cat_especializacion', slots: ['k3'] },
  { id: 'ultimate', label: 'Definitiva', hint: 'Ranura 4 · sin coste, enfriamiento largo', cats: ['ultimate'], icon: 'cat_definitiva', slots: ['k4'] },
]);
const CAT_TO_SECTION = {};
for (const s of BOOK_SECTIONS) for (const c of s.cats) CAT_TO_SECTION[c] = s;
export function catSection(cat) { return CAT_TO_SECTION[cat] || null; }
export function catIcon(cat) { return uiIcon(CAT_TO_SECTION[cat]?.icon); }
export function catLabel(cat) { return cat === 'utility' ? 'Utilidad' : cat === 'defense' ? 'Defensa' : (CAT_TO_SECTION[cat]?.label || ''); }

// agrupa las habilidades de la clase por sección del libro. Base primero (por nivel),
// después las activas de talento (las que conoces antes que las que no).
//   opts.known(sk) → bool  · devuelve [{ ...sección, skills: [sk] }] (solo secciones con algo)
export function bookSections(skills, opts = {}) {
  const known = opts.known || (() => true);
  const out = BOOK_SECTIONS.map(s => ({ ...s, skills: [] }));
  const byId = new Map(out.map(s => [s.id, s]));
  for (const sk of skills || []) {
    const sec = CAT_TO_SECTION[sk?.cat];
    if (!sec) continue;
    byId.get(sec.id).skills.push(sk);
  }
  const rank = (sk) => (sk.kind === 'talent' ? (known(sk) ? 1 : 2) : 0);
  for (const s of out) s.skills.sort((a, b) => rank(a) - rank(b) || (a.req || 1) - (b.req || 1));
  return out.filter(s => s.skills.length);
}

// ranura 2 flexible: las dos pestañas del selector (§1.1, §1.4)
export const K2_TABS = Object.freeze([
  { id: 'defense', label: 'Defensa/utilidad', cats: ['defense', 'utility'], icon: 'cat_defensa' },
  { id: 'spender', label: 'Gastadora', cats: ['spender'], icon: 'cat_gastadora' },
]);
// candidatas de cada pestaña (fits = fitsSlot de skill-resolve; known = isKnown)
export function k2Tabs(skills, { fits, known } = {}) {
  const ok = (sk) => (!fits || fits(sk, 'k2')) && (!known || known(sk));
  return K2_TABS.map(t => ({ ...t, skills: (skills || []).filter(sk => t.cats.includes(sk.cat) && ok(sk)) }));
}
// pestaña que abre el selector según lo que hay hoy en la ranura
export function k2TabFor(sk) { return sk?.cat === 'spender' ? 'spender' : 'defense'; }

// ---------- estado de una ranura de la barra ----------
// p: jugador · sk: habilidad · prof: resolveSkill(p, sk) · gcd: duración del GCD
// → { cdFrac, cdSec, gcdFrac, noRes, cost, ready }
export function slotView(p, sk, prof, gcd = 0.2) {
  if (!p || !sk) return { cdFrac: 0, cdSec: 0, gcdFrac: 0, noRes: false, cost: 0, ready: false };
  const basic = sk.cat === 'basic' || sk.type === 'weapon';
  const cd = basic ? 0 : Math.max(0, p.cds?.[sk.id] || 0);
  const max = p.cdMax?.[sk.id] || prof?.cd || sk.cd || 1;
  const cdFrac = cd > 0 ? Math.max(0, Math.min(1, cd / max)) : 0;
  const usesGcd = basic ? false : (prof?.gcd != null ? !!prof.gcd : GCD_CATS.has(sk.cat));
  // la sombra del GCD solo se ve donde no hay ya un enfriamiento más largo encima
  const gcdT = usesGcd && cd <= 0 ? Math.max(0, p.gcdT || 0) : 0;
  const gcdFrac = gcdT > 0 ? Math.max(0, Math.min(1, gcdT / (gcd || 0.2))) : 0;
  const cost = basic ? 0 : Math.max(0, Math.round(prof?.cost || 0));
  const noRes = cost > 0 && (p.mp || 0) < cost - 1e-9;
  return { cdFrac, cdSec: cd, gcdFrac, noRes, cost, ready: cdFrac === 0 && gcdFrac === 0 && !noRes };
}
// texto de segundos restantes (≥1 s entero; <1 s con un decimal)
export function cdText(sec) { return sec > 0 ? (sec >= 1 ? String(Math.ceil(sec)) : sec.toFixed(1)) : ''; }

// ---------- recursos ----------
export const RES_ICON = Object.freeze({ furia: 'res_furia', mana: 'res_mana', energia: 'res_energia' });
export function resIcon(resId) { return uiIcon(RES_ICON[resId]); }

// ---------- iconos de menú por panel (#panel-<id>) ----------
export const MENU_ICON = Object.freeze({
  inv: 'menu_inventario', skills: 'menu_habilidades', stats: 'menu_estadisticas', talents: 'menu_talentos',
  shop: 'menu_tienda', settings: 'menu_ajustes', guide: 'menu_guia', map: 'menu_mapa', stash: 'menu_alijo',
  pet: 'menu_mascota', pacts: 'menu_pactos', blessing: 'menu_bendiciones', collection: 'menu_coleccion',
  recipes: 'menu_cubo', waypoints: 'menu_viajes', quest: 'menu_misiones', progress: 'menu_tormento',
  paragon: 'menu_paragon', codex: 'menu_codice',
});
export function menuIcon(panel) { return uiIcon(MENU_ICON[panel]); }

// ---------- ranuras de equipo y materiales ----------
export const EQ_ICON = Object.freeze({
  weapon: 'eq_arma', offhand: 'eq_mano_izq', helm: 'eq_casco', chest: 'eq_pecho', gloves: 'eq_guantes',
  belt: 'eq_cinturon', boots: 'eq_botas', amulet: 'eq_amuleto', ring: 'eq_anillo', ring2: 'eq_anillo',
});
export function eqIcon(slot) { return uiIcon(EQ_ICON[slot]); }
export const MAT_ICON = Object.freeze({
  gem: 'mat_gema', rune: 'mat_runa', glyph: 'mat_glifo', riftkey: 'mat_llave_grieta', fragment: 'mat_fragmento', gold: 'mat_oro',
});
export function matIcon(kind) { return uiIcon(MAT_ICON[kind]); }

// ---------- estados (st_*) ----------
export const STATUS = Object.freeze({
  quebrantado: { icon: 'st_quebrantado', label: 'Quebrantado' },
  aturdido: { icon: 'st_aturdido', label: 'Aturdido' },
  escarcha: { icon: 'st_escarcha', label: 'Escarcha' },
  ralentizado: { icon: 'st_ralentizado', label: 'Ralentizado' },
  provocado: { icon: 'st_provocado', label: 'Provocado' },
  debilidad: { icon: 'st_debilidad', label: 'Debilidad' },
  quemadura: { icon: 'st_quemadura', label: 'Quemadura' },
  sangrado: { icon: 'st_sangrado', label: 'Sangrado' },
  veneno: { icon: 'st_veneno', label: 'Veneno' },
  escudo: { icon: 'st_escudo', label: 'Escudo' },
});
export function statusIcon(id) { return uiIcon(STATUS[id]?.icon); }

// estados visibles de un enemigo (marco del jefe/objetivo), en orden de importancia:
// → [{ id, label, t? }]
export function enemyStatuses(e) {
  if (!e) return [];
  const out = [];
  const add = (id, label, t) => out.push({ id, label: label || STATUS[id].label, ...(t > 0 ? { t } : {}) });
  if (e.staggerBrokenT > 0) add('quebrantado', 'Quebrantado', e.staggerBrokenT);
  if (e.frozenT > 0) add('escarcha', 'Congelado', e.frozenT);
  else if (e.numbT > 0) add('escarcha', 'Aterido', e.numbT);
  else if ((e.gauges?.escarcha?.v || 0) > 0) add('escarcha', `Escarcha ${Math.floor(e.gauges.escarcha.v)}`);
  if (e.stunT > 0 && !(e.staggerBrokenT > 0) && !(e.frozenT > 0)) add('aturdido', 'Aturdido', e.stunT);
  if (e.rootT > 0) add('ralentizado', 'Inmovilizado', e.rootT);
  else if (e.slowT > 0) add('ralentizado', 'Ralentizado', e.slowT);
  if (e.tauntT > 0) add('provocado', 'Provocado', e.tauntT);
  const weak = Object.keys(e.debuffs || {}).length > 0;
  if (e.vulnT > 0) add('debilidad', 'Vulnerable', e.vulnT);
  else if (weak) add('debilidad', 'Debilidad');
  const dots = Object.keys(e._dots || {});
  if (dots.some(k => k.includes('burn'))) add('quemadura');
  if (dots.some(k => k.includes('bleed'))) add('sangrado');
  if (dots.some(k => k.includes('poison'))) add('veneno');
  return out;
}
// icono de estado de un buff/debuff del jugador (fila de buffs) o null
export function playerStatusIcon(b) {
  const id = b?.id || '';
  if (id === 'slow' || /ralent|congel/i.test(b?.name || '')) return statusIcon('ralentizado');
  if (id === 'shield' || /escudo|barrera|piel de hierro/i.test(b?.name || '')) return statusIcon('escudo');
  if (/sangr/i.test(b?.name || '')) return statusIcon('sangrado');
  if (/venen/i.test(b?.name || '')) return statusIcon('veneno');
  if (/quem|ardiendo/i.test(b?.name || '')) return statusIcon('quemadura');
  if (/aturd/i.test(b?.name || '')) return statusIcon('aturdido');
  return null;
}

// ---------- marcadores del mapa / minimapa ----------
const NPC_SPRITE = { vendor: 'mercader', enchanter: 'encantador', healer: 'sanador', stash: 'alijo', petkeeper: 'mascotas', blacksmith: 'herrero', smith: 'herrero' };
// it: interactuable del mundo · ctx: { level, quest (p.quest), rift (world.rift) }
// → nombre del sprite (sin 'mk_') o null si no tiene sprite propio
export function poiSprite(it, ctx = {}) {
  const t = it?.type;
  if (!t) return null;
  if (t === 'chest') return it.opened ? null : 'cofre';
  if (NPC_SPRITE[t]) return NPC_SPRITE[t];
  if (t === 'questgiver') {
    const q = ctx.quest;
    return q && q.progress >= q.goal ? 'entregar' : 'mision';
  }
  if (t === 'waypoint') return 'waypoint';
  if (t === 'zone_dungeon') return 'mazmorra';
  if (t === 'world_event') return it.used ? null : 'evento';
  if (t === 'zone_exit' || t === 'gate_zone' || t === 'portal_zone') return 'salida';
  if (t === 'portal_next') return ctx.rift ? 'grieta' : 'portal_siguiente';
  if (t === 'portal_dungeon') return 'portal_siguiente';
  if (t.startsWith('portal')) return 'portal';
  return null;
}
// ¿marcador apagado? (salida a una región de nivel superior)
export function poiLocked(it, ctx = {}) {
  return it?.type === 'zone_exit' && (ctx.level || 1) < (it.minLevel || 0);
}
// sprite de un enemigo (solo los relevantes; el resto son puntos)
export function enemySprite(e) {
  const d = e?.def || {};
  if (d.goblin) return 'goblin';
  if (d.boss || d.worldBoss || d.uber) return 'jefe';
  if (d.rank) return 'elite';
  return null;
}
// tamaño en px de pantalla de cada marcador (legible 14–20 px)
export function markerSize(name, big = false) {
  const base = name === 'jugador' ? 18 : name === 'jefe' ? 18 : name === 'elite' || name === 'goblin' ? 15 : 16;
  return big ? base + 2 : base;
}
// leyenda del mapa: qué sprites pueden aparecer en este mundo → [{ sprite, label }]
export function mapLegend(world, ctx = {}) {
  const its = world?.interactables || [];
  const seen = new Map();
  const add = (sprite, label) => { if (sprite && !seen.has(sprite)) seen.set(sprite, label); };
  add('jugador', 'Tú');
  const LABEL = {
    cofre: 'Cofre', mercader: 'Mercader', encantador: 'Encantadora', sanador: 'Sanador', alijo: 'Alijo', mascotas: 'Domador',
    herrero: 'Herrero', mision: 'Misión', entregar: 'Entregar misión', waypoint: 'Punto de viaje', mazmorra: 'Mazmorra',
    evento: 'Evento', salida: 'Camino a otra región', portal_siguiente: 'Descenso', grieta: 'Salida de la grieta', portal: 'Portal',
  };
  for (const it of its) { const s = poiSprite(it, ctx); if (s) add(s, LABEL[s] || s); }
  for (const e of ctx.enemies || []) { const s = enemySprite(e); if (s) add(s, s === 'jefe' ? 'Jefe' : s === 'elite' ? 'Élite' : 'Goblin del tesoro'); }
  if (ctx.death) add('muerte', 'Tu última muerte');
  return [...seen].map(([sprite, label]) => ({ sprite, label }));
}
// todos los sprites de marcador (precarga única)
export const MAP_SPRITES = Object.freeze(['jugador', 'cofre', 'portal', 'portal_siguiente', 'mazmorra', 'waypoint', 'salida', 'mercader', 'herrero',
  'encantador', 'sanador', 'alijo', 'mascotas', 'mision', 'entregar', 'jefe', 'elite', 'goblin', 'evento', 'grieta', 'muerte']);

// ---------- indicador de especialización (mockup HUD: «CALOR · PIROMANTE») ----------
const GAUGE_HINT = {
  sed: 'a 100: Sed Saciada', bastion: '−2 % de daño por carga', fervor: '3 cargas: Veredicto Final',
  calor: 'a 100: Ignición Total', escarcha: '5 capas: Congelado', cargas: 'Rayo las consume',
  concentracion: '+0,15 % crít./punto', coto: 'trampas armadas', impulso: 'a 100: Vendaval',
};
// view = gaugeView(p) de spec-mechanics · specName = nombre de la especialización activa
// → { id, title, right, pct, segs, color, active, cls } | null
export function gaugeBar(view, specName = '') {
  if (!view) return null;
  const max = Math.max(1, view.max || 1);
  const val = Math.max(0, Math.min(max, view.value || 0));
  const pct = Math.round(val / max * 1000) / 10;
  const segs = max <= 6 ? max : 4; // cargas discretas: una celda por carga; si no, cuartos
  const active = view.state === 'active' || view.state === 'prey' || view.state === 'full';
  const num = Number.isInteger(val) ? val : Math.floor(val);
  const t = view.t > 0 ? ` · ${view.t.toFixed(view.t < 10 ? 1 : 0)} s` : '';
  const right = view.label ? `${view.label}${t}` : `${num} / ${max} · ${GAUGE_HINT[view.id] || ''}`.replace(/ · $/, '');
  const title = `${(view.name || view.id).toUpperCase()}${specName ? ' · ' + specName.toUpperCase() : ''}`;
  return { id: view.id, title, right, pct, segs, color: view.color || '#e8c06a', active, cls: `gauge-${view.state || 'idle'}` };
}

// ---------- barra de stagger del jefe ----------
// sv = enemy.staggerView() → { pct, state: 'broken'|'locked'|'building'|'idle', label }
export function staggerBar(sv) {
  if (!sv) return null;
  const max = Math.max(1, sv.max || 100);
  if (sv.broken) return { pct: 100, state: 'broken', label: `¡QUEBRANTADO! ${sv.brokenT.toFixed(1)} s` };
  if (sv.locked) return { pct: Math.min(100, Math.round((sv.lockT / 15) * 100)), state: 'locked', label: `Recuperándose ${Math.ceil(sv.lockT)} s` };
  const pct = Math.max(0, Math.min(100, Math.round((sv.value || 0) / max * 100)));
  return { pct, state: pct > 0 ? 'building' : 'idle', label: `Aturdimiento ${pct} %` };
}
// ¿qué jefe muestra el marco superior? El vivo más cercano dentro de `range` m.
export function pickBossTarget(enemies, pos, range = 28) {
  let best = null, bd = range * range;
  for (const e of enemies || []) {
    const d = e?.def;
    if (!e?.alive || !(d?.boss || d?.worldBoss || d?.uber)) continue;
    const dx = e.pos.x - pos.x, dz = e.pos.z - pos.z, dd = dx * dx + dz * dz;
    if (dd <= bd) { bd = dd; best = e; }
  }
  return best;
}

// ---------- arte de las habilidades base ----------
// icono pintado de una habilidad BASE (assets/skills/<id>.webp, 128 px; skills256/
// para el foco de ramas). Las activas de talento usan el sprite de su nodo.
export function baseSkillIcon(sk, big = false) {
  if (!sk?.id || sk.kind === 'talent') return null;
  return `${big ? 'skills256' : 'skills'}/${sk.id}.webp`;
}

// ---------- arte de las activas de talento ----------
// sprite del nodo que concede la activa (talents/<clase>-<clase|spec>-<nodo>.webp)
//   trees = TALENT_TREES[classId] → { tree: 'cls'|specId, specName, icon } | null
export function talentSkillArt(trees, skillId) {
  if (!trees || !skillId) return null;
  const grants = (n) => n.fx?.grant === skillId || (n.opts || []).some(o => o.fx?.grant === skillId);
  const n0 = (trees.cls?.nodes || []).find(grants);
  if (n0) return { tree: 'cls', specName: '', icon: n0.icon || null, node: n0.id };
  for (const s of trees.specs || []) {
    const n = s.nodes.find(grants);
    if (n) return { tree: s.id, specName: s.name, icon: n.icon || null, node: n.id };
  }
  return null;
}

// ============================================================
// Paso 2d.2 · HUD de PC (docs/paso2d2-hud-pc.md §2): escala, registro de botín,
// objetivo del indicador y del marco superior, enrutado de mensajes y micromenú
// ============================================================
export const HUD_ASSET = (name) => `assets/hud/${name}.webp`;
// referencia de diseño: 1920×1080 a --s = 1
export const HUD_REF = Object.freeze({ w: 1920, h: 1080, sMin: 0.8, sMax: 1.25 });
// zona de combate reservada: 56 % × 56 % de la pantalla, centrada en el héroe
export const COMBAT_ZONE = 0.56;
// alto (px a --s = 1) de la columna de identidad del dock contado desde el borde
// inferior: margen 8 + XP 6 + barra 72 + mecánica 72 + aviso 26 + huecos (medido con ?hudcheck=1)
export const DOCK_COLUMN_H = 206;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// escala del HUD: --s = clamp(0,8, min(vw/1920, vh/1080), 1,25), recortada para que
// la columna central nunca entre en la zona de combate (1280×720 → 0,75), × la
// opción «Escala del HUD» (70–150 %). Debajo de 1600 px de ancho el micromenú va en 2×5.
// → { s, microRows, combat: [x, y, w, h] }
export function hudLayout(vw, vh, scale = 1) {
  const W = Math.max(1, +vw || HUD_REF.w), H = Math.max(1, +vh || HUD_REF.h);
  const base = clamp(Math.min(W / HUD_REF.w, H / HUD_REF.h), HUD_REF.sMin, HUD_REF.sMax);
  const fit = ((1 - COMBAT_ZONE) / 2 * H - 1) / DOCK_COLUMN_H;
  const k = clamp(+scale || 1, 0.7, 1.5);
  const s = Math.round(Math.min(base, fit) * k * 1000) / 1000;
  const m = (1 - COMBAT_ZONE) / 2;
  return { s, microRows: W < 1600 ? 2 : 1, combat: [Math.round(W * m), Math.round(H * m), Math.round(W * COMBAT_ZONE), Math.round(H * COMBAT_ZONE)] };
}

// color de cada especialización (IntentoRPG-assets/STYLE.md; el mismo del mockup)
export const SPEC_COLOR = Object.freeze({
  berserker: '#e8634a', guardian: '#7fb0e8', cruzado: '#ecc760', piromante: '#ff8a3d', crionte: '#74cdf2',
  arcanista: '#b996ff', francotiradora: '#ead86e', montaraz: '#86d47a', tiradora: '#66d7c7',
});
const ROMAN = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
export function roman(n) {
  let v = Math.max(0, n | 0), out = '';
  for (const [k, r] of ROMAN) while (v >= k) { out += r; v -= k; }
  return out;
}
// placa del héroe (arriba-izq.): «Nv 42 · Crionte» / «Maga · Tormento III»
// → { title, sub, color, emblem (ruta o null), icon (emoji de respaldo) }
export function plateView(p, spec = null) {
  if (!p) return null;
  const cls = p.cls?.name || '';
  const torment = (p.torment | 0) > 0 ? `Tormento ${roman(p.torment)}` : 'Normal';
  return {
    title: `Nv ${p.level || 1} · ${spec?.name || cls}`,
    sub: `${cls} · ${torment}`,
    color: (spec && SPEC_COLOR[spec.id]) || '#e8c06a',
    emblem: spec?.id ? `assets/emblems/${spec.id}.webp` : null,
    icon: p.cls?.icon || '⚔️',
  };
}

// cifras con separador de miles fino («12 340»), también en 4 cifras como el mockup
export function fmtNum(n) {
  const v = Math.round(+n || 0);
  return (v < 0 ? '−' : '') + String(Math.abs(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

// ---------- registro de botín (#hud-loot) ----------
const RARITY_LABEL = { normal: '', magico: 'Mágico', raro: 'Raro', legendario: 'Legendario', conjunto: 'Conjunto' };
export const LOOT_COLOR = Object.freeze({
  normal: '#d9d4c8', magico: '#7f9bff', raro: '#ffd24a', legendario: '#ff9a3d', conjunto: '#5fe08a',
  gold: '#f1d97a', xp: '#c8a2ff', mat: '#9fd8e8', potion: '#ff9a8a',
});
const MAT_KINDS = new Set(['gem', 'rune', 'riftkey', 'fragment', 'glyph', 'support']);
// it: objeto recogido ({ kind, name, rarity, amount, pot, mythic, unidentified }) o
// { kind: 'xp' | 'gold', amount } → { text, rarity, color, merge? } | null
// `merge` = clave para sumar entradas seguidas (oro y XP no llenan el registro)
export function lootLogEntry(item) {
  if (!item || typeof item !== 'object') return null;
  const k = item.kind;
  if (k === 'gold' || k === 'xp') {
    const amt = Math.round(item.amount || 0);
    if (amt <= 0) return null;
    return { text: `+${fmtNum(amt)} ${k === 'xp' ? 'XP' : 'oro'}`, rarity: k, color: LOOT_COLOR[k], merge: k, amount: amt };
  }
  if (k === 'potion') return { text: `+ Poción de ${item.pot === 'mp' ? 'recurso' : 'vida'}`, rarity: 'potion', color: LOOT_COLOR.potion };
  const name = String(item.name || '').trim();
  if (!name) return null;
  if (MAT_KINDS.has(k)) return { text: `+ ${name}`, rarity: 'mat', color: LOOT_COLOR.mat };
  const r = RARITY_LABEL[item.rarity] != null ? item.rarity : 'normal';
  const tag = item.unidentified ? ' (sin identificar)' : item.mythic ? ' (Mítico)' : RARITY_LABEL[r] ? ` (${RARITY_LABEL[r]})` : '';
  return { text: `+ ${name}${tag}`, rarity: r, color: LOOT_COLOR[r] };
}

// ---------- objetivo del indicador de especialización (R1) ----------
// bajo el cursor > jefe en combate (el vivo más cercano a ≤ range m) > null
// (gaugeView elige entonces el más afectado). enemies: lista viva del juego
export function pickGaugeTarget(enemies, hover, pos, range = 30) {
  if (hover?.alive && (enemies || []).includes(hover)) return hover;
  if (!pos) return null;
  return pickBossTarget(enemies, pos, range);
}

// ---------- marco del objetivo/jefe (#target-frame) ----------
// tipo de marco: jefe (hud_objetivo_marco), élite (hud_objetivo_elite) o normal
export function targetKind(e) {
  const d = e?.def || {};
  if (d.boss || d.worldBoss || d.uber) return 'boss';
  if (d.rank === 'elite' || d.goblin) return 'elite';
  if (d.rank === 'campeon') return 'champion';
  return 'normal';
}
const KIND_TAG = { boss: 'JEFE', elite: 'ÉLITE', champion: 'CAMPEÓN', normal: '' };
// qué enemigo muestra el marco: el jefe cercano manda; si no, el enemigo bajo el cursor
export function pickTargetFrame(enemies, hover, pos, range = 30) {
  const boss = pos ? pickBossTarget(enemies, pos, range) : null;
  if (boss) return boss;
  return hover?.alive && (enemies || []).includes(hover) ? hover : null;
}
// → { kind, name, tag, hpPct (0–1), hpTxt, frame (asset) } | null
export function targetView(e, ctx = {}) {
  if (!e) return null;
  const kind = targetKind(e);
  const max = Math.max(1, e.maxHP || e.def?.hp || 1);
  const hp = Math.max(0, Math.min(max, e.hp || 0));
  const pct = hp / max;
  const where = ctx.floor ? ` · PISO ${ctx.floor}` : '';
  const name = stripIcon(e.def?.name) || 'Enemigo';
  return {
    kind, name, tag: (KIND_TAG[kind] || '') + (KIND_TAG[kind] ? where : ''),
    hpPct: Math.round(pct * 1000) / 1000,
    hpTxt: `${fmtNum(Math.ceil(hp))} / ${fmtNum(Math.ceil(max))} · ${Math.round(pct * 100)} %`,
    frame: kind === 'boss' ? HUD_ASSET('hud_objetivo_marco') : kind === 'normal' ? null : HUD_ASSET('hud_objetivo_elite'),
  };
}

// ---------- mensajes: registro de sistema o banner crítico ----------
// Los avisos largos (≥ 4 s) son sucesos importantes → banner bajo el marco del jefe
// (y quedan en el registro). Los consejos (💡) y lo breve, solo al registro.
export function messageRoute(text, ms = 2600) {
  const t = String(text || '');
  if (!t) return 'none';
  if (t.startsWith('💡')) return 'syslog';
  return ms >= 4000 ? 'banner' : 'syslog';
}

// ---------- micromenú (abajo a la derecha): icono menu_*, acción de bindings.js ----------
// panel = id de #panel-<id> que abre (para el resaltado del activo)
export const MICRO_MENU = Object.freeze([
  { id: 'stats', action: 'character', icon: 'menu_estadisticas', label: 'Personaje' },
  { id: 'inv', action: 'inventory', icon: 'menu_inventario', label: 'Inventario' },
  { id: 'skills', action: 'skills', icon: 'menu_habilidades', label: 'Habilidades' },
  { id: 'talents', action: 'talents', icon: 'menu_talentos', label: 'Talentos' },
  { id: 'paragon', action: 'paragon', icon: 'menu_paragon', label: 'Paragon' },
  { id: 'map', action: 'map', icon: 'menu_mapa', label: 'Mapa' },
  { id: 'quest', action: 'quests', icon: 'menu_misiones', label: 'Misiones' },
  { id: 'collection', action: 'collection', icon: 'menu_coleccion', label: 'Colección' },
  { id: 'guide', action: 'guide', icon: 'menu_guia', label: 'Guía' },
  { id: 'settings', action: 'close', icon: 'menu_ajustes', label: 'Opciones' },
]);

// ---------- alas de beneficios (izq.) y perjuicios (der., borde rojo) ----------
const DEBUFF_RE = /ralent|congel|sangr|venen|quem|aturd|maldi|debilit|vulnerab|aterid|inmoviliz|silenci/i;
export function isDebuff(b) {
  if (!b) return false;
  if (b.debuff === true || b.kind === 'debuff') return true;
  if (b.debuff === false) return false;
  return b.id === 'slow' || DEBUFF_RE.test(b.name || '');
}
// reparte la lista de activeBuffs() en las dos alas → { buffs, debuffs }
export function splitBuffs(list) {
  const buffs = [], debuffs = [];
  for (const b of list || []) (isDebuff(b) ? debuffs : buffs).push(b);
  return { buffs, debuffs };
}

// ---------- aviso contextual (#hud-prompt) ----------
const INTERACT_VERB = {
  vendor: 'Comerciar', questgiver: 'Hablar', stash: 'Abrir', chest: 'Abrir', waypoint: 'Viajar', shrine: 'Activar',
  enchanter: 'Reforjar', world_event: 'Activar', healer: 'Hablar', petkeeper: 'Hablar', blacksmith: 'Hablar',
};
const stripIcon = (s) => String(s || '').replace(/^[^\p{L}\p{N}«(¡¿]+/u, '').trim();
// interact: interactuable activo (game.currentInteract) · loot: objeto más cercano
// (gi.item) · keys: { primary, grab } etiquetas de tecla → { key, verb, name, rarity } | null
export function promptView({ interact = null, loot = null, keys = {} } = {}) {
  if (interact) {
    const t = interact.type || '';
    const verb = INTERACT_VERB[t] || (t.startsWith('portal') || t.includes('dungeon') || t.includes('gate') || t.includes('exit') ? 'Entrar' : 'Usar');
    return { key: keys.primary || 'Espacio', verb, name: stripIcon(interact.label), rarity: '' };
  }
  if (loot) {
    const e = lootLogEntry(loot);
    const name = loot.unidentified ? 'Objeto sin identificar' : String(loot.name || '').trim();
    if (!name) return null;
    return { key: keys.grab || 'F', verb: 'Recoger', name, rarity: e?.rarity || 'normal', tag: RARITY_LABEL[loot.rarity] || '' };
  }
  return null;
}
