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
//
// Paso 2 (2f + 2g, U2; docs/paso2-implementacion.md §3.12): al final, los modelos del libro con
// forja (bookView, forgeView), el feedback de los verbos (slotView ampliado, verbView) y los
// vínculos con los talentos (talentLinks, nodeSkills, specSwapSummary, levelUpNews). Los
// pintan js/ui-skills.js (tecla T) y js/ui-verbs.js (cada frame); tests/test86 los cubre.
import { GCD_CATS, CAT_LABELS, CATS, SLOT_UNLOCK, skillVerbs, forgeDef, forgeVar, supportFits, supportSockets, RANK_MAX } from './skill-defs.js';
import { isKnown, forgeState, forgedDef, resolveSkill, fitsSlot, rankBase } from './skill-resolve.js';
import { SUPPORTS, FORGE_RECO, CLASSES } from './data.js';
import { talentTreesFor, findSpec, activeHeroTree, heroOpen, pointKindAt, TALENT_RULES } from './talents.js';
import { rankCoef, chargeRelease } from './combat-math.js';
import { gaugeDefs } from './spec-mechanics.js';
import { talentArtPath } from './talent-art.js';

export const UI_BASE = 'assets/ui/';
export const MAP_BASE = 'assets/map/';
export const uiIcon = (name) => (name ? `${UI_BASE}${name}.webp` : null);
export const mapIcon = (name) => (name ? `${MAP_BASE}${name}.webp` : null);

// ---------- categorías de habilidad (libro + esquina de la ranura) ----------
// orden del libro (docs/paso2-diseno.md §1.1); defensa y utilidad comparten sección
// D14: las etiquetas visibles salen de CAT_LABELS (skill-defs.js); la clave interna no cambia
export const BOOK_SECTIONS = Object.freeze([
  { id: 'basic', label: CAT_LABELS.basic, hint: 'Genera recurso · clic izquierdo', cats: ['basic'], icon: 'cat_basico', slots: ['lmb'] },
  { id: 'spender', label: CAT_LABELS.spender, hint: 'Gasta recurso · clic derecho o ranura 2', cats: ['spender'], icon: 'cat_principal', slots: ['rmb', 'k2'] },
  { id: 'movement', label: CAT_LABELS.movement, hint: 'Ranura 1 · fuera del enfriamiento global', cats: ['movement'], icon: 'cat_movilidad', slots: ['k1'] },
  { id: 'defense', label: `${CAT_LABELS.defense} · ${CAT_LABELS.utility.toLowerCase()}`, hint: 'Ranura 2 (flexible)', cats: ['defense', 'utility'], icon: 'cat_defensa', slots: ['k2'] },
  { id: 'spec', label: CAT_LABELS.spec, hint: 'Ranura 3 · la otorga tu especialización', cats: ['spec'], icon: 'cat_especializacion', slots: ['k3'] },
  { id: 'ultimate', label: CAT_LABELS.ultimate, hint: 'Ranura 4 · sin coste, enfriamiento largo', cats: ['ultimate'], icon: 'cat_definitiva', slots: ['k4'] },
]);
const CAT_TO_SECTION = {};
for (const s of BOOK_SECTIONS) for (const c of s.cats) CAT_TO_SECTION[c] = s;
export function catSection(cat) { return CAT_TO_SECTION[cat] || null; }
export function catIcon(cat) { return uiIcon(CAT_TO_SECTION[cat]?.icon); }
export function catLabel(cat) { return CAT_LABELS[cat] || ''; }

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
  { id: 'defense', label: `${CAT_LABELS.defense}/${CAT_LABELS.utility.toLowerCase()}`, cats: ['defense', 'utility'], icon: 'cat_defensa' },
  { id: 'spender', label: CAT_LABELS.spender, cats: ['spender'], icon: 'cat_principal' },
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
// ctx (Paso 2, opcional) = { g, slot }: el juego y la ranura, para los verbos EN CURSO (carga,
// canal); sin ctx solo salen los que viven en el jugador (cargas, relanzar, combo, postura…)
// → { cdFrac, cdSec, gcdFrac, noRes, cost, ready } + los verbos de slotVerbs (abajo)
export function slotView(p, sk, prof, gcd = 0.2, ctx = null) {
  if (!p || !sk) return { cdFrac: 0, cdSec: 0, gcdFrac: 0, noRes: false, cost: 0, ready: false, ...slotVerbs(null, null) };
  const basic = sk.cat === 'basic' || sk.type === 'weapon';
  const verb = slotVerbs(p, sk, prof, ctx);
  let cd = basic ? 0 : Math.max(0, p.cds?.[sk.id] || 0);
  let max = p.cdMax?.[sk.id] || prof?.cd || sk.cd || 1;
  // cargas: lista con una carga aunque la siguiente siga recargando (p.cds se sincroniza
  // solo al lanzar: aquí se calcula sin tocar el estado)
  if (verb.charges) { cd = verb.charges.n > 0 ? 0 : verb.charges.nextSec; max = verb.charges.cd; }
  // ventana de relanzar abierta: se relanza sin esperar el enfriamiento (lo enseña el aro)
  if (verb.recast) cd = 0;
  const cdFrac = cd > 0 ? Math.max(0, Math.min(1, cd / max)) : 0;
  const usesGcd = basic ? false : (prof?.gcd != null ? !!prof.gcd : GCD_CATS.has(sk.cat));
  // la sombra del GCD solo se ve donde no hay ya un enfriamiento más largo encima
  const gcdT = usesGcd && cd <= 0 && !verb.recast ? Math.max(0, p.gcdT || 0) : 0;
  const gcdFrac = gcdT > 0 ? Math.max(0, Math.min(1, gcdT / (gcd || 0.2))) : 0;
  const cost = basic || (verb.recast && prof?.recast?.free !== false) ? 0 : Math.max(0, Math.round(prof?.cost || 0));
  const noRes = cost > 0 && (p.mp || 0) < cost - 1e-9;
  return { cdFrac, cdSec: cd, gcdFrac, noRes, cost, ready: cdFrac === 0 && gcdFrac === 0 && !noRes, ...verb };
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
  // `art` del catálogo 2g (arte ya existente) manda sobre skills/<id>.webp
  if (sk.art) return big ? sk.art : sk.art.replace('skills256/', 'skills/');
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

// ============================================================
// Paso 2 (2f + 2g) · LIBRO CON FORJA, FEEDBACK DE LOS VERBOS Y VÍNCULOS CON LOS TALENTOS
// docs/paso2-implementacion.md §3.12 · docs/paso2f-habilidades-ux.md §3 y §7.1 (U2)
// ============================================================
// Todo PURO (sin DOM y sin mutar al jugador): js/ui-skills.js y js/ui-verbs.js solo pintan.
const clamp01 = v => Math.max(0, Math.min(1, +v || 0));
const nowOf = p => p?.simT || 0;
export const SLOT_ORDER = Object.freeze(['lmb', 'rmb', 'k1', 'k2', 'k3', 'k4']);
export const SLOT_LABEL = Object.freeze({ lmb: 'IZQ', rmb: 'DER', k1: '1', k2: '2', k3: '3', k4: '4' });
// orden de las categorías en el libro y en la barra (D14: «por categoría»)
export const CAT_ORDER = Object.freeze(Object.fromEntries(CATS.map((c, i) => [c, i])));
// papeles de las variantes (2f §2.1): color + glifo + palabra (nunca solo color, 2f §3.7)
export const ROLE_INFO = Object.freeze({
  UNI: { label: 'Un objetivo', color: '#f0c45a' }, AREA: { label: 'Área', color: '#ff8a3d' },
  CTRL: { label: 'Control', color: '#74cdf2' }, AGU: { label: 'Aguante', color: '#7fb0e8' },
  APO: { label: 'Apoyo', color: '#ecc760' }, MOV: { label: 'Movilidad', color: '#86d47a' },
});
// los 5 glifos de la fila «gana en…» del tooltip de variante (2f §3.4)
export const ROLE_ROW = Object.freeze(['UNI', 'AREA', 'CTRL', 'AGU', 'MOV']);
export const ELEM_LABEL = Object.freeze({ physical: 'Físico', fire: 'Fuego', frost: 'Hielo', arcane: 'Arcano', holy: 'Sagrado', nature: 'Naturaleza' });
// tags visibles (los de categoría no se enseñan: no cambian con la forja)
export const TAG_LABEL = Object.freeze({
  melee: 'Cuerpo a cuerpo', proj: 'Proyectil', area: 'Área', cone: 'Cono', line: 'Línea', channel: 'Canalizada',
  aura: 'Aura', zone: 'Zona', trap: 'Trampa', mark: 'Marca', wall: 'Muro', summon: 'Invocación', shout: 'Grito',
  buff: 'Refuerzo', shield: 'Escudo', heal: 'Cura', ally: 'Aliados', cc: 'Control', taunt: 'Provoca',
  interrupt: 'Interrumpe', dot: 'Daño continuo', charge: 'Cargar', combo: 'Combo', recast: 'Relanzar', stance: 'Postura',
  ...ELEM_LABEL,
});
// chip de verbo (D22: skillVerbs de la definición forjada)
export const VERB_LABEL = Object.freeze({
  hold: 'Mantener', charge: 'Cargar y soltar', recast: 'Relanzar', combo: 'Combo de 3', seq: 'Secuencia',
  stance: 'Postura', trap: 'Trampa', detonate: 'Detonar', planted: 'Plantado', follow: 'Te sigue',
});
// color de cada modo de postura si la definición no trae `color` (1.º acero, 2.º oro)
export const STANCE_COLORS = Object.freeze(['#7fb0e8', '#ecc760', '#e8634a']);

// habilidad del catálogo del jugador por id (mapa por catálogo: la UI la pide cada frame)
const SKILL_MAPS = new WeakMap();
export function skillOf(p, id) {
  const list = (p?.cls || CLASSES[p?.classId])?.skills;
  if (!list || !id) return null;
  let m = SKILL_MAPS.get(list);
  if (!m) { m = new Map(list.map(s => [s.id, s])); SKILL_MAPS.set(list, m); }
  return m.get(id) || null;
}
// ranura de la barra que ocupa una habilidad (o null)
export function slotOfSkill(hotbar, id) {
  if (!hotbar || !id) return null;
  for (const s of SLOT_ORDER) if (hotbar[s] === id) return s;
  return null;
}
// ranuras que admite (etiquetas «DER o 2»)
export function slotsLabel(sk) {
  return SLOT_ORDER.filter(s => fitsSlot(sk, s)).map(s => SLOT_LABEL[s]).join(' o ');
}
// arte de una habilidad (ruta relativa a assets/): el `art` del catálogo; si no, las activas de
// talento el sprite del nodo que las concede y las base su icono pintado. Si la imagen no
// existe, la UI pinta el marcador .ico-missing (§3.12)
export function skillArtPath(sk, trees = null) {
  if (!sk) return null;
  if (sk.art) return sk.art;
  if (sk.kind === 'talent') return talentSkillArt(trees, sk.id)?.icon || null;
  return `skills/${sk.id}.webp`;
}

// ------------------------------------------------------------ verbos de una ranura
// estado de los verbos de una habilidad, PURO (lee p.skState, p.skCharges, p.planted y, con
// ctx = { g, slot }, la carga y el canal en curso de esa ranura). Sin p: todo a null.
//   charges { n, max, cd, nextSec, nextFrac } · recast { left, n, idx, t, frac, perfect }
//   combo { n, idx, last, frac } · seq { every, count, ready } · charge (chargeView)
//   channel { endless, toggle, frac, t } · stance { mode, name, idx, n, color, both, timed, frac }
//   planted (bool, solo si la habilidad lo usa) · traps { n, max } (trampas ARMADAS de la habilidad)
export function slotVerbs(p, sk, prof = null, ctx = null) {
  const out = { verbs: [], charges: null, recast: null, combo: null, seq: null, charge: null, channel: null, stance: null, planted: null, traps: null };
  if (!p || !sk) return out;
  const def = prof?.def || sk;
  out.verbs = skillVerbs(def);
  const now = nowOf(p);
  const st = p.skState?.[sk.id] || null;
  const g = ctx?.g || null, slot = ctx?.slot || null;
  // cargas de enfriamiento: recarga perezosa calculada sin tocar p.skCharges
  const maxCh = Math.max(1, Math.floor(prof?.charges || def.charges || 1));
  if (maxCh > 1) {
    const ch = p.skCharges?.[sk.id];
    const cd = Math.max(0.05, prof?.cd || def.cd || 0.05);
    let n = ch ? Math.min(maxCh, ch.n) : maxCh, next = ch ? ch.nextAt : null;
    while (n < maxCh && next != null && now >= next - 1e-9) { n++; next = n < maxCh ? next + cd : null; }
    const nextSec = n < maxCh && next != null ? Math.max(0, next - now) : 0;
    out.charges = { n, max: maxCh, cd, nextSec, nextFrac: nextSec > 0 ? clamp01(nextSec / cd) : 0 };
  }
  // relanzar: usos que quedan y tiempo de la ventana; «justo» en los últimos perfectLast s
  const rc = st?.recast;
  if (rc && rc.left > 0) {
    const t = Math.max(0, (rc.until || 0) - now);
    out.recast = { left: rc.left, n: rc.n, idx: rc.idx, t, frac: clamp01(t / Math.max(0.01, rc.win || 1)),
      perfect: (rc.perfectLast || 0) > 0 && t <= rc.perfectLast + 1e-9 };
  }
  // combo de 3: idx = paso que toca (0 = el primero); vuelve al 1.º si pasa comboWin
  if (def.type === 'combo' && def.steps?.length) {
    const n = def.steps.length, cs = st?.combo;
    const live = !!(cs && cs.idx > 0 && now <= (cs.until || 0) + 1e-9);
    const idx = live ? Math.min(n - 1, cs.idx) : 0;
    out.combo = { n, idx, last: idx === n - 1, frac: live ? clamp01((cs.until - now) / Math.max(0.01, prof?.comboWin || 2.5)) : 0 };
  }
  // secuencia del básico: ataques hechos en la vuelta; el siguiente es el especial si ready
  if (def.seq) {
    const every = Math.max(2, def.seq.every || 3);
    const count = (st?.seq?.count || 0) % every;
    out.seq = { every, count, ready: count === every - 1 };
  }
  // carga y canal EN CURSO de esta ranura (o de esta habilidad sin ranura)
  const c = g?._charging;
  if (c && (slot ? c.key === slot : c.id === sk.id)) out.charge = chargeView(p, c);
  const inst = g?._channel;
  if (inst && (slot ? inst.ctx?.key === slot : (inst.ctx?.sk?.id || inst.ctx?.cast?.sk?.id) === sk.id)) out.channel = channelView(inst);
  // postura: modo activo (color del modo), las dos a la vez (Guardia Total) y lo que dura
  const modes = def.type === 'stance' ? (def.stance?.modes || []) : [];
  const ss = st?.stance;
  if (modes.length && ss && ss.mode != null && modes[ss.mode]) {
    const m = modes[ss.mode];
    const timed = Number.isFinite(ss.until);
    const dur = def.stance?.dur ?? prof?.dur ?? 0;
    out.stance = { mode: m.id, name: m.name || m.id, idx: ss.mode, n: modes.length, color: m.color || STANCE_COLORS[ss.mode % STANCE_COLORS.length],
      both: !!(ss.both && now < (ss.bothUntil || 0)), timed, frac: timed && dur > 0 ? clamp01((ss.until - now) / dur) : 1 };
  }
  if (out.verbs.includes('planted')) out.planted = !!p.planted;
  // trampas armadas de la habilidad (contador de la ranura; el Coto cuenta las de la clase)
  if ((def.type === 'trap' || def.trap) && typeof g?.fieldsOf === 'function') {
    let n = 0;
    try { n = g.fieldsOf(p, { skill: sk.id, armed: true }).length; } catch { n = 0; }
    out.traps = { n, max: def.trap?.maxArmed || null };
  }
  return out;
}
// la carga en curso (g._charging) para la barra: fracciones sobre el máximo de la carga
//   frac (relleno) · lo/hi (ventana perfecta) · minFrac (un toque suelta aquí) · inWindow (la
//   del motor, el MISMO frame en que entra: G17) · calm (Calma Absoluta) · calmLo (desde dónde es
//   perfecta con ella) · perfectNow (soltar ahora sería perfecto: la ventana del motor o, con
//   Calma, la MISMA regla con que el motor resuelve la suelta, chargeRelease) · toggle (enganchada)
export function chargeView(p, c) {
  if (!c) return null;
  const max = Math.max(0.05, c.max || c.ch?.max || 1);
  const min = Math.max(0, Math.min(max, c.min ?? c.ch?.min ?? 0));
  const [a, b] = c.window || c.ch?.perfect || [max, max];
  const u = Math.max(0, Math.min(max, c.u || 0));
  const calm = ((p?.stats?.perfectAlways || 0) + (p?.powerStats?.perfectAlways || 0)) > 0;
  const calmFrom = min + 0.5 * (max - min);
  const inWindow = typeof c.inWindow === 'boolean' ? c.inWindow : (u >= a - 1e-9 && u <= b + 1e-9);
  const calmNow = calm && chargeRelease({ min, max, perfect: [a, b] }, u, { perfectAlways: true }).perfect;
  return { u, min, max, frac: u / max, lo: clamp01(a / max), hi: clamp01(b / max), minFrac: min / max, calmLo: calmFrom / max,
    inWindow, calm, perfectNow: inWindow || calmNow, toggle: !!c.toggle, releasing: !!c.release };
}
// el canal en curso (g._channel): frac = tics que quedan sobre el total (hechos + los que
// quedan: también vale si extendChannel lo alarga) · t = segundos que quedan
export function channelView(inst) {
  if (!inst) return null;
  const left = Math.max(0, inst.left || 0);
  const total = left + Math.max(0, inst.tickN || 0);
  return { endless: !!inst.endless, toggle: !!inst.toggle, frac: inst.endless ? 1 : (total > 0 ? clamp01(left / total) : 1), t: left * (inst.interval || 0) };
}
// lo que dibuja js/ui-verbs.js cada frame: los verbos de las 6 ranuras y la carga en curso
// (para la barra junto al cursor) → { slots: { lmb: slotVerbs|null, … }, charge: { slot, … } | null, planted }
export function verbView(g) {
  const p = g?.player;
  const out = { slots: {}, charge: null, planted: !!p?.planted };
  if (!p) return out;
  for (const slot of SLOT_ORDER) {
    const sk = skillOf(p, p.hotbar?.[slot]);
    if (!sk || !isKnown(p, sk)) { out.slots[slot] = null; continue; }
    const v = slotVerbs(p, sk, resolveSkill(p, sk), { g, slot });
    out.slots[slot] = v;
    if (v.charge) out.charge = { slot, ...v.charge };
  }
  // una carga de una habilidad que ya no está en la barra (no debería pasar) también se ve
  if (!out.charge && g._charging) out.charge = { slot: g._charging.key || null, ...chargeView(p, g._charging) };
  return out;
}
// posición de la barra junto al cursor (§3.12): w × h px a `gap` px del cursor, ENCIMA de él
// (no tapa al objetivo) y siempre dentro de la pantalla (debajo si no cabe arriba)
export function cursorBarPos(mx, my, vw, vh, { w = 64, h = 6, gap = 24, margin = 8 } = {}) {
  let x = Math.round((+mx || 0) - w / 2);
  let y = Math.round((+my || 0) - gap - h);
  if (y < margin) y = Math.round((+my || 0) + gap);
  x = Math.max(margin, Math.min(Math.max(margin, (vw || 0) - margin - w), x));
  y = Math.max(margin, Math.min(Math.max(margin, (vh || 0) - margin - h), y));
  return { x, y };
}

// ------------------------------------------------------------ especialización (libro y avisos)
export const specIdOf = p => (p?.talentAgg ? (p.talentAgg.spec || null) : ((p?.level || 1) >= TALENT_RULES.specAt ? (p?.talents?.spec || null) : null));
// ficha de una especialización para el libro: nombre, emblema, mecánica y pasiva
export function specCard(classId, specId) {
  const s = findSpec(classId, specId);
  if (!s) return null;
  const mech = s.mechanic ? gaugeDefs()[s.mechanic] : null;
  return { id: s.id, name: s.name, roleLabel: s.roleLabel || '', emblem: s.emblem || `emblems/${s.id}.webp`, art: s.icon || `specs/${s.id}.webp`,
    mechanic: s.mechanic || null, mechName: mech?.name || s.mechanic || '', innateText: s.innateText || '', line: s.line || '',
    color: SPEC_COLOR[s.id] || '#e8c06a' };
}
// variantes recomendadas de una especialización (D6: FORGE_RECO; un arnés puede traer las suyas
// en p.cls.forgeReco) → { skillId: 'i' | 'ii' } | null
export function recoFor(p, specId) {
  if (!specId) return null;
  return p?.cls?.forgeReco?.[specId] || FORGE_RECO[specId] || null;
}
// kit de una especialización en el catálogo del jugador
export function specKit(p, specId) {
  return ((p?.cls || CLASSES[p?.classId])?.skills || []).filter(s => s.spec === specId);
}

// ------------------------------------------------------------ libro (2f §3.2, 2g §9.3)
const byCatReq = (a, b) => (CAT_ORDER[a.cat] ?? 9) - (CAT_ORDER[b.cat] ?? 9) || (a.req || 1) - (b.req || 1);
// casilla del libro: una habilidad con todo lo que la casilla enseña (UN marcador por casilla:
// sello I/II o anillo dorado «por elegir», 2f §3.5)
export function bookTile(p, sk, { reco = null, trees = null } = {}) {
  const L = p?.level || 1;
  const known = isKnown(p, sk);
  const fst = forgeState(p, sk);
  const def = known ? forgedDef(p, sk) : sk;
  const varsOpen = known && !!fst.entry && L >= fst.levels.vars;
  const chosen = fst.chosen;                         // undefined = nunca elegida (D3)
  const variant = varsOpen && (chosen === 'i' || chosen === 'ii') ? chosen : null;
  const slot = slotOfSkill(p?.hotbar, sk.id);
  const r = reco?.[sk.id] || null;
  const isNew = known && (L === (sk.req || 1) || (!!fst.entry?.mejora && L === fst.levels.mejora) || (!!fst.entry && L === fst.levels.vars));
  return {
    id: sk.id, name: sk.name, emoji: sk.icon || '✦', art: skillArtPath(sk, trees), cat: sk.cat, catLabel: catLabel(sk.cat), catIcon: catIcon(sk.cat),
    // candado con el nivel en que se aprende (el kit de la especialización, nunca antes de elegirla)
    known, lockLv: known || sk.kind === 'talent' ? null : sk.spec ? Math.max(sk.req || 1, TALENT_RULES.specAt) : (sk.req || 1), spec: sk.spec || null,
    slot, slotLabel: slot ? SLOT_LABEL[slot] : null, variant, todo: varsOpen && chosen === undefined,
    reco: varsOpen && r && chosen === undefined ? r : null, isNew, talent: sk.kind === 'talent',
    tag: sk.kind === 'talent' ? (sk.hero ? 'PARAGON' : 'TALENTO') : null, verbs: skillVerbs(def), forge: !!fst.entry,
  };
}
// fila de otra especialización: emblema, rol · mecánica y su kit en miniatura (bloqueado).
// Sin especialización (pre): candado al nivel en que se elige; desde ese nivel, `choose` (la
// fila invita a elegirla en Talentos)
function specRow(p, specId, trees, pre) {
  const card = specCard(p.classId, specId);
  const kit = specKit(p, specId).sort(byCatReq).map(sk => ({ id: sk.id, name: sk.name, emoji: sk.icon || '✦', art: skillArtPath(sk, trees),
    cat: sk.cat, catLabel: catLabel(sk.cat), catIcon: catIcon(sk.cat), req: sk.req || 1 }));
  const early = (p.level || 1) < TALENT_RULES.specAt;
  return { ...card, kit, lockLv: pre && early ? TALENT_RULES.specAt : null, choose: pre && !early };
}
// casillas por fila del libro (css/skills.css: 7 × 84 px en la tarjeta de 660 px)
export const BOOK_ROW = 7;
// el libro entero por ORIGEN (kit base · kit de tu especialización · las otras), cada grupo
// ordenado por categoría (con CAT_LABELS en cada casilla) → { cls, level, specAt, spec, groups,
// known, total, pending, order, rows, dense }. Las activas de talento solo salen si las tienes
// (con su etiqueta). rows = filas de casillas (base + especialización); con 3 o más (las activas
// de talento o el catálogo v1 bajan el kit base a una 2.ª fila) el libro va COMPACTO (dense)
// para que todo quepa sin desplazarse (A5)
export function bookView(p) {
  const cls = p?.cls || CLASSES[p?.classId];
  if (!p || !cls) return null;
  const trees = talentTreesFor(p.classId);
  const specId = specIdOf(p);
  const reco = recoFor(p, specId);
  const all = cls.skills || [];
  const tile = sk => bookTile(p, sk, { reco, trees });
  const groups = [];
  const base = all.filter(s => !s.spec && (s.kind !== 'talent' || isKnown(p, s))).sort(byCatReq).map(tile);
  groups.push({ id: 'base', title: `Kit base · ${cls.name}`, tiles: base, known: base.filter(t => t.known).length });
  const specs = trees?.specs || [];
  if (specId) {
    const kit = specKit(p, specId).sort(byCatReq).map(tile);
    groups.push({ id: 'spec', spec: specCard(p.classId, specId), tiles: kit, known: kit.filter(t => t.known).length });
    groups.push({ id: 'others', rows: specs.filter(s => s.id !== specId).map(s => specRow(p, s.id, trees, false)) });
  } else {
    groups.push({ id: 'pre', rows: specs.map(s => specRow(p, s.id, trees, true)) });
  }
  const tiles = groups.flatMap(gr => gr.tiles || []);
  const rows = groups.reduce((n, gr) => n + Math.ceil((gr.tiles?.length || 0) / BOOK_ROW), 0);
  return {
    cls: { id: p.classId, name: cls.name, res: cls.resource || null }, level: p.level || 1, specAt: TALENT_RULES.specAt,
    spec: specId ? specCard(p.classId, specId) : null, groups, rows, dense: rows >= 3,
    known: tiles.filter(t => t.known).length, total: tiles.length,
    pending: tiles.filter(t => t.todo).length,            // «N variantes por elegir» (cabecera)
    order: tiles.map(t => t.id),                          // ←/→ del teclado (2f §3.7)
  };
}
// guiones suaves (U+00AD) en las palabras de `minLen` letras o más, por sílabas del español: el
// nombre de una casilla (80 px, 2 líneas) parte «Contra-hechizo» en vez de cortarlo. Solo en
// palabras largas: las que caben enteras en una línea nunca se parten.
//   V-CV · VC-CV · grupos inseparables (bl, br, cl, cr, dr, fl, fr, gl, gr, kl, kr, pl, pr, tr) y
//   ch, ll, rr como una consonante; las vocales seguidas no se separan; ≥ 2 letras a cada lado
const HY_V = /[aeiouáéíóúü]/i;
const HY_ONSET = new Set(['bl', 'br', 'cl', 'cr', 'dr', 'fl', 'fr', 'gl', 'gr', 'kl', 'kr', 'pl', 'pr', 'tr']);
const HY_DIG = new Set(['ch', 'll', 'rr']);
function hyphenWord(w) {
  const lw = w.toLowerCase();
  const units = [];                                    // [{ at, len, v }]
  for (let i = 0; i < w.length;) {
    const two = lw.slice(i, i + 2);
    if (HY_DIG.has(two)) { units.push({ at: i, len: 2, v: false }); i += 2; continue; }
    units.push({ at: i, len: 1, v: HY_V.test(w[i]) || (lw[i] === 'y' && i === w.length - 1) });
    i++;
  }
  const cuts = [];
  let k = units.findIndex(u => u.v);
  while (k >= 0) {
    while (k < units.length && units[k].v) k++;          // fin del grupo de vocales
    const e = k;
    while (k < units.length && !units[k].v) k++;         // consonantes hasta la siguiente vocal
    if (k >= units.length) break;
    const c = units.slice(e, k), n = c.length;
    const pair = (a, b) => lw.substr(a.at, a.len) + lw.substr(b.at, b.len);
    const cut = n === 1 ? e : n === 2 ? (HY_ONSET.has(pair(c[0], c[1])) ? e : e + 1)
      : n === 3 ? (HY_ONSET.has(pair(c[1], c[2])) ? e + 1 : e + 2) : e + 2;
    if (n) cuts.push(units[cut].at);
  }
  let out = '', last = 0;
  for (const at of cuts) {
    if (at < 2 || w.length - at < 2) continue;
    out += w.slice(last, at) + '­';
    last = at;
  }
  return out + w.slice(last);
}
export function hyphenEs(text, minLen = 12) {
  return String(text ?? '').replace(/[\p{L}]+/gu, w => (w.length >= minLen ? hyphenWord(w) : w));
}

// escala del libro (diseño 1560 × 930 a escala 1, 2f §3.2): 1 a 1920 × 1080, 0,8 a 1366 × 768
export const BOOK_SIZE = Object.freeze({ w: 1560, h: 930 });
export function bookScale(vw, vh) {
  const W = +vw || 1920, H = +vh || 1080;
  const fit = Math.min((W - 48) / BOOK_SIZE.w, (H - 24) / BOOK_SIZE.h, Math.max(1, Math.min(W / 1920, H / 1080)));
  return Math.round(Math.max(0.6, Math.min(1.25, fit)) * 1000) / 1000;
}

// ------------------------------------------------------------ forja de una habilidad (2f §2–§3)
const fmtN = v => String(Math.round(v * 100) / 100).replace('.', ',');
// detalle técnico de una pieza de forja (tooltip con Alt): set/add/mul/mod/elem/tags/poder
export function forgePieceDetail(piece) {
  if (!piece) return '';
  const out = [];
  const kv = (o, sign) => Object.entries(o || {}).map(([k, v]) => `${k} ${sign && v > 0 ? '+' : ''}${typeof v === 'number' ? fmtN(v) : JSON.stringify(v)}`);
  if (piece.set) out.push(`fija ${kv(piece.set).join(', ')}`);
  if (piece.add) out.push(`suma ${kv(piece.add, true).join(', ')}`);
  if (piece.mul) out.push(`× ${kv(piece.mul).join(', ')}`);
  if (piece.mod) out.push(kv(piece.mod, true).join(', '));
  if (piece.elem) out.push(`elemento ${ELEM_LABEL[piece.elem] || piece.elem}`);
  if (piece.tags?.add?.length) out.push(`+${piece.tags.add.join(' +')}`);
  if (piece.tags?.remove?.length) out.push(`−${piece.tags.remove.join(' −')}`);
  if (piece.power) out.push(`poder ${piece.power}`);
  if (piece.behavior) out.push(`comportamiento ${piece.behavior}`);
  return out.join(' · ');
}
// tags que cambian entre dos definiciones (sin los de categoría): { add, del } con su etiqueta
function tagDiff(from, to) {
  const shown = t => !CATS.includes(t) && TAG_LABEL[t];
  const a = new Set((from?.tags || []).filter(shown)), b = new Set((to?.tags || []).filter(shown));
  return { add: [...b].filter(t => !a.has(t)).map(t => ({ id: t, label: TAG_LABEL[t] })),
    del: [...a].filter(t => !b.has(t)).map(t => ({ id: t, label: TAG_LABEL[t] })) };
}
// la forja de una habilidad para la tarjeta y los tooltips. opts.combat: bloqueada (la UI lo
// pregunta a game.canRespecFree). Mejora: 'abierta' (activa) | 'bloqueada'; variantes:
// 'bloqueada' | 'abierta' | 'elegida', cada una con los tags que tacha y los que añade
export function forgeView(p, sk, { combat = false } = {}) {
  if (!p || !sk) return null;
  const L = p.level || 1;
  const known = isKnown(p, sk);
  const fst = forgeState(p, sk);
  const prof = known ? resolveSkill(p, sk) : null;
  const def = known ? forgedDef(p, sk) : sk;
  const trees = talentTreesFor(p.classId);
  const specId = specIdOf(p);
  const recoKey = recoFor(p, specId)?.[sk.id] || null;
  const specName = specId ? (findSpec(p.classId, specId)?.name || '') : '';
  // rango y daño (número FINAL del perfil; el del siguiente rango, en verde, 2f §3.4)
  const baseRank = rankBase(L, sk.req);
  const rank = known ? prof.rank : baseRank;
  const add = 1 + (prof?.addPct || 0) / 100;
  const dmg = (sk.coef || 0) > 0 ? Math.round((prof ? prof.coef : (sk.coef || 0) * rankCoef(rank)) * add * 100) : 0;
  const dmgNext = dmg && rank < RANK_MAX ? Math.round((def.coef || sk.coef || 0) * rankCoef(rank + 1) * add * 100) : 0;
  const entry = fst.entry;
  const lvMej = fst.levels.mejora, lvVar = fst.levels.vars;
  const withMejora = forgeDef(sk, entry, { mejora: fst.mejora });
  const mejora = entry?.mejora ? {
    id: entry.mejora.id || `${sk.id}_m`, name: entry.mejora.name, line: entry.mejora.line || '', icon: entry.mejora.icon || null,
    level: lvMej, state: known && L >= lvMej ? 'abierta' : 'bloqueada', detail: forgePieceDetail(entry.mejora),
  } : null;
  const vars = (entry?.vars || []).slice(0, 2).map((v, i) => {
    const key = i ? 'ii' : 'i';
    const open = known && L >= lvVar && !!forgeVar(entry, key);
    const withV = forgeDef(sk, entry, { mejora: fst.mejora, variant: key });
    const diff = tagDiff(withMejora, withV);
    const role = ROLE_INFO[v.role] ? v.role : 'UNI';
    return {
      key, num: i ? 'II' : 'I', id: v.id, name: v.name, line: v.line || '', role, roleLabel: ROLE_INFO[role].label, roleColor: ROLE_INFO[role].color,
      icon: v.icon || null, level: lvVar, state: !open ? 'bloqueada' : fst.chosen === key ? 'elegida' : 'abierta',
      reco: recoKey === key, recoSpec: recoKey === key ? specName : '', tagsAdd: diff.add, tagsDel: diff.del,
      elem: withV.elem !== withMejora.elem ? { from: withMejora.elem, to: withV.elem } : null, detail: forgePieceDetail(v),
    };
  });
  vars.forEach((v, i) => { v.sisterRole = vars[1 - i]?.role || null; });
  const sockets = supportSockets(def);
  const cur = p.supports?.[sk.id];
  const raw = Array.isArray(cur) ? cur : (typeof cur === 'string' && cur ? [cur] : []);
  const supports = Array.from({ length: sockets }, (_, i) => {
    const sup = SUPPORTS.find(s => s.id === raw[i]) || null;
    return sup ? { id: sup.id, name: sup.name, icon: sup.icon, effect: sup.effect || sup.desc || '', trade: sup.trade || '', fits: supportFits(sup, def) } : null;
  });
  return {
    id: sk.id, name: sk.name, line: sk.line || sk.desc || '', emoji: sk.icon || '✦', art: skillArtPath(sk, trees),
    cat: sk.cat, catLabel: catLabel(sk.cat), catIcon: catIcon(sk.cat), slots: slotsLabel(sk), known, req: sk.req || 1,
    learnAt: sk.spec ? Math.max(sk.req || 1, TALENT_RULES.specAt) : (sk.req || 1),     // nivel en que se aprende
    talent: sk.kind === 'talent', hero: !!sk.hero, spec: sk.spec ? specCard(p.classId, sk.spec) : null,
    innate: specId && sk.innate?.[specId] ? sk.innate[specId] : '', elem: def.elem || null, elemLabel: ELEM_LABEL[def.elem] || '',
    rank, rankMax: RANK_MAX, nextRankLv: baseRank < RANK_MAX ? (sk.req || 1) + 8 * baseRank : null,
    dmg, dmgNext, cost: prof ? prof.cost : (sk.cost || 0), cd: prof ? Math.round(prof.cd * 10) / 10 : (sk.cd || 0),
    gen: sk.cat === 'basic' ? (prof?.gen ?? sk.gen ?? 0) : (prof?.gen || 0), coef: prof ? prof.coef : (sk.coef || 0),
    verbs: skillVerbs(def), tags: (def.tags || []).filter(t => TAG_LABEL[t] && !CATS.includes(t)).map(t => TAG_LABEL[t]),
    entry: !!entry, mejora, vars, chosen: fst.chosen, variant: fst.variant,
    pending: vars.length > 0 && vars.every(v => v.state !== 'bloqueada') && fst.chosen === undefined,
    combat: !!combat, sockets, supports,
  };
}
// cambios de «Recomendado» del libro (2f §3.8.4): las variantes recomendadas de tu
// especialización que están abiertas y no son la elegida → [{ id, v }]
export function recoPlan(p) {
  const out = [];
  for (const [id, v] of Object.entries(recoFor(p, specIdOf(p)) || {})) {
    const sk = skillOf(p, id);
    if (!sk || !isKnown(p, sk)) continue;
    const fst = forgeState(p, sk);
    if (!fst.entry || (p.level || 1) < fst.levels.vars || !forgeVar(fst.entry, v)) continue;
    if (fst.chosen !== v) out.push({ id, v });
  }
  return out;
}
// la cuadrícula del engarce i de una habilidad: cada soporte con su estado
//   ok · incompatible (con la forma forjada) · unknown (aún no lo tienes) · used (en el otro
//   engarce: usedIn = su índice; −1 si no está en otro)
export function supportOptions(p, sk, i = 0) {
  if (!p || !sk) return [];
  const def = isKnown(p, sk) ? forgedDef(p, sk) : sk;
  const cur = Array.isArray(p.supports?.[sk.id]) ? p.supports[sk.id] : [];
  const known = new Set(p.knownSupports || []);
  return SUPPORTS.map(s => ({
    id: s.id, name: s.name, icon: s.icon, effect: s.effect || s.desc || '', trade: s.trade || '', fits: s.fits || '',
    current: cur[i] === s.id, usedIn: cur.findIndex((x, j) => j !== i && x === s.id),
    state: !known.has(s.id) ? 'unknown' : !supportFits(s, def) ? 'incompatible' : cur.some((x, j) => j !== i && x === s.id) ? 'used' : 'ok',
  }));
}
// engarces tras poner `supId` (o null = quitar) en el hueco i: lista limpia, sin repetidos y
// dentro de los huecos de la habilidad (la UI la escribe en p.supports)
export function supportsAfter(p, sk, i, supId) {
  const def = isKnown(p, sk) ? forgedDef(p, sk) : sk;
  const n = supportSockets(def);
  const arr = (Array.isArray(p?.supports?.[sk.id]) ? p.supports[sk.id] : []).slice(0, n);
  while (arr.length < n) arr.push(null);
  if (i >= 0 && i < n) arr[i] = supId || null;
  const out = [];
  for (const id of arr) if (id && !out.includes(id)) out.push(id);
  return out;
}

// ------------------------------------------------------------ vínculos con los talentos (2f §3.8)
// ids de habilidad que nombra un nodo: `touch` (también el de sus opciones) y sus efectos
// (fx.mod / fx.skillLv / fx.grant). Los selectores (@fire, @spec…) quedan fuera para no listar
// media clase. Con `skills` (catálogo) devuelve las definiciones que existen.
export function nodeSkills(node, skills = null) {
  if (!node) return [];
  const ids = new Set();
  const fxIds = fx => {
    if (!fx) return;
    for (const k of Object.keys(fx.mod || {})) if (!k.startsWith('@')) ids.add(k);
    for (const k of Object.keys(fx.skillLv || {})) if (!k.startsWith('@')) ids.add(k);
    if (fx.grant) ids.add(fx.grant);
  };
  const touch = list => { for (const t of list || []) if (typeof t === 'string' && !t.startsWith('@')) ids.add(t); };
  touch(node.touch);
  fxIds(node.fx);
  for (const o of node.opts || []) { touch(o.touch); fxIds(o.fx); }
  if (!skills) return [...ids];
  const by = new Map(skills.map(s => [s.id, s]));
  return [...ids].map(id => by.get(id)).filter(Boolean);
}
// «Talentos que la tocan» (tooltip del libro): nodos de la clase, de tu especialización y de
// tu árbol héroe que nombran la habilidad, con su rango (los comprados llevan ✓)
//   → [{ id, name, icon, which: 'cls'|'spec'|'hero', rank, max, bought }]
export function talentLinks(p, skillId) {
  const T = talentTreesFor(p?.classId);
  if (!T || !skillId) return [];
  const t = p.talents || {};
  const specId = specIdOf(p);
  const spec = specId ? findSpec(p.classId, specId) : null;
  const hero = spec ? activeHeroTree(p) : null;
  const trees = [['cls', T.cls?.nodes || [], id => t.cls?.[id] | 0, true]];
  if (spec) trees.push(['spec', spec.nodes || [], id => t.sp?.[spec.id]?.[id] | 0, true]);
  if (hero) trees.push(['hero', hero.nodes || [], id => t.hero?.[spec.id]?.nodes?.[hero.id]?.[id] | 0, heroOpen(p)]);
  const out = [];
  for (const [which, nodes, rankOf, on] of trees) {
    for (const n of nodes) {
      if (!nodeSkills(n).includes(skillId)) continue;
      const rank = n.free ? (on ? 1 : 0) : rankOf(n.id);
      const tree = which === 'cls' ? 'clase' : which === 'spec' ? spec.id : hero.id;
      out.push({ id: n.id, name: n.name, icon: talentArtPath(p.classId, tree, n.id) || n.icon || null, which, rank, max: n.max || 1, bought: rank > 0 });
    }
  }
  return out;
}

// ------------------------------------------------------------ cambio de especialización (2f §3.8.1)
// foto ligera del héroe ANTES de cambiar (el jugador cambia en sitio): lo que compara la tira
export function specSnapshot(p) {
  const cls = p?.cls || CLASSES[p?.classId];
  const grants = (cls?.skills || []).filter(s => s.kind === 'talent' && isKnown(p, s)).map(s => s.id);
  return { classId: p?.classId, level: p?.level || 1, spec: specIdOf(p), grants, hotbar: { ...(p?.hotbar || {}) },
    skillForge: { ...(p?.skillForge || {}) }, skills: cls?.skills || [], forgeReco: p?.cls?.forgeReco || null };
}
// la tira «qué cambia» al cambiar de especialización: insignia vieja → nueva (ranura 3),
// activas de talento que entran (+) y salen (−), variantes recomendadas (★), mecánica y barra.
// prev = specSnapshot(p) de antes · next = el jugador (o su foto) de después
export function specSwapSummary(prev, next) {
  const a = prev?.grants ? prev : specSnapshot(prev);
  const b = next?.grants ? next : specSnapshot(next);
  const list = b.skills?.length ? b.skills : (CLASSES[b.classId]?.skills || []);
  const by = new Map(list.map(s => [s.id, s]));
  const trees = talentTreesFor(b.classId);
  const brief = id => { const s = by.get(id); return s ? { id, name: s.name, emoji: s.icon || '✦', art: skillArtPath(s, trees) } : null; };
  const insigniaOf = spec => list.find(s => s.spec === spec && s.cat === 'spec')?.id || null;
  const reco = Object.entries(b.forgeReco?.[b.spec] || FORGE_RECO[b.spec] || {})
    .filter(([id]) => by.has(id)).map(([id, v]) => ({ ...brief(id), variant: v }));
  const card = b.spec ? specCard(b.classId, b.spec) : null;
  return {
    spec: card, from: a.spec ? specCard(a.classId, a.spec) : null,
    insignia: { from: a.spec ? brief(insigniaOf(a.spec)) : null, to: b.spec ? brief(insigniaOf(b.spec)) : null },
    grantsIn: b.grants.filter(id => !a.grants.includes(id)).map(brief).filter(Boolean),
    grantsOut: a.grants.filter(id => !b.grants.includes(id)).map(brief).filter(Boolean),
    reco, bar: { ...b.hotbar }, mechanic: card ? { id: card.mechanic, name: card.mechName } : null,
  };
}

// ------------------------------------------------------------ subida de nivel (2f §7.1)
const POINT_LABEL = { cls: 'punto de talento de clase', spec: 'punto de talento de especialización', hero: 'punto de Paragon', board: 'punto del tablero de glifos' };
// novedades al pasar de nvAntes a nvDespués: habilidades aprendidas, Mejoras (req+3),
// variantes (req+6), ranuras de la barra y puntos por sistema. Varias → UNA tarjeta
// («Nivel 8: 3 novedades») que abre el libro en la primera (2f §7.1). Sin novedades: count 0,
// title «Nivel N», sub '' y first null (la UI deja su aviso normal de nivel, sin tarjeta).
//   → { level, items: [{ kind, id?, name?, text, line?, art? }], count, title, sub, first }
export function levelUpNews(p, before, after) {
  const cls = p?.cls || CLASSES[p?.classId];
  const from = Math.max(0, before | 0), to = Math.max(from, after | 0);
  const specId = p?.talents?.spec || null;
  const trees = talentTreesFor(p?.classId);
  const items = [];
  // el kit de la especialización solo cuenta si es la tuya (y desde el nivel en que se elige)
  const mine = s => s.kind !== 'talent' && (!s.spec || s.spec === specId);
  for (let L = from + 1; L <= to; L++) {
    for (const s of cls?.skills || []) {
      if (!mine(s)) continue;
      const req = Math.max(s.req || 1, s.spec ? TALENT_RULES.specAt : 1);
      const fst = forgeState({ cls, classId: p?.classId, level: L, skillForge: p?.skillForge }, s);
      const art = skillArtPath(s, trees);
      if (L === req) items.push({ kind: 'learn', id: s.id, name: s.name, art, text: `Aprendes ${s.name}`, line: s.line || '' });
      if (fst.entry?.mejora && L === fst.levels.mejora && L >= req) items.push({ kind: 'mejora', id: s.id, name: s.name, art,
        text: `${s.name}: mejora ${fst.entry.mejora.name}`, line: fst.entry.mejora.line || '' });
      if (fst.entry?.vars?.length && L === fst.levels.vars && L >= req) items.push({ kind: 'vars', id: s.id, name: s.name, art,
        text: `${s.name}: elige una variante`, line: fst.entry.vars.map(v => v.name).join(' o ') });
    }
    for (const [slot, lv] of Object.entries(SLOT_UNLOCK)) if (lv === L && lv > 1) items.push({ kind: 'slot', slot, text: `Ranura ${SLOT_LABEL[slot]} abierta` });
    const kind = pointKindAt(L);
    if (kind) items.push({ kind: 'points', system: kind, text: `+1 ${POINT_LABEL[kind] || 'punto'}` });
  }
  const first = items.find(i => i.id) || null;
  const n = items.length;
  return {
    level: to, items, count: n, first: first?.id || null,
    title: !n ? `Nivel ${to}` : n === 1 ? `Nivel ${to} · ${items[0].text}` : `Nivel ${to}: ${n} novedades`,
    sub: !n ? '' : n === 1 ? (items[0].line || '') : items.slice(0, 3).map(i => i.text).join(' · '),
  };
}
