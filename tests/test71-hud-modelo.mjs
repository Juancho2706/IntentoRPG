// Paso 2d: modelo PURO del HUD (js/hud-model.js) — libro por categoría, barra de
// 6 ranuras (enfriamiento, sombra de GCD, recurso), selector de la ranura 2,
// sprites del mapa, estados, indicador de especialización, stagger del jefe y que
// todos los assets que referencia la interfaz existen en assets/ (y en sw.js).
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as HM from '../js/hud-model.js';
import { CLASSES } from '../js/data.js';
import { SLOT_NAMES } from '../js/items.js';
import { fitsSlot } from '../js/skill-resolve.js';
import { CATS, GCD_CATS } from '../js/skill-defs.js';
import { TALENT_TREES } from '../js/talents.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const has = (rel) => existsSync(join(ROOT, rel));

// ---------- 1. libro de habilidades por categoría ----------
const order = HM.BOOK_SECTIONS.map(s => s.id);
assert.deepEqual(order, ['basic', 'spender', 'movement', 'defense', 'spec', 'ultimate']);
for (const cat of CATS) assert.ok(HM.catSection(cat), 'categoría sin sección: ' + cat);
for (const [cid, cls] of Object.entries(CLASSES)) {
  const secs = HM.bookSections(cls.skills, { known: (sk) => sk.kind !== 'talent' });
  const ids = secs.flatMap(s => s.skills.map(sk => sk.id));
  assert.equal(ids.length, cls.skills.length, `${cid}: cada habilidad sale una vez en el libro`);
  assert.equal(new Set(ids).size, ids.length, `${cid}: sin duplicados`);
  for (const s of secs) {
    assert.ok(order.indexOf(s.id) >= 0);
    for (const sk of s.skills) assert.ok(s.cats.includes(sk.cat), `${sk.id} en su sección`);
    // base antes que las activas de talento
    const firstTalent = s.skills.findIndex(sk => sk.kind === 'talent');
    if (firstTalent >= 0) assert.ok(s.skills.slice(firstTalent).every(sk => sk.kind === 'talent'), `${cid}/${s.id}: base primero`);
  }
  assert.ok(secs.find(s => s.id === 'spec')?.skills.length, `${cid}: sección de especialización`);
}
console.log('Libro: 6 secciones en orden, cada habilidad una vez y en su categoría, base antes que talento ✓');

// ---------- 2. estado de una ranura: enfriamiento, GCD, recurso ----------
const p = { cds: { bola: 0.75, ult: 0 }, cdMax: { bola: 1.5 }, gcdT: 0.1, mp: 10 };
const v1 = HM.slotView(p, { id: 'bola', cat: 'spender' }, { cd: 1.5, cost: 18, gcd: true }, 0.2);
assert.equal(v1.cdFrac, 0.5); assert.equal(v1.gcdFrac, 0, 'con enfriamiento propio no se pinta la sombra del GCD');
assert.equal(v1.noRes, true); assert.equal(v1.cost, 18); assert.equal(v1.ready, false);
const v2 = HM.slotView(p, { id: 'ult', cat: 'ultimate' }, { cd: 50, cost: 0, gcd: true }, 0.2);
assert.equal(v2.gcdFrac, 0.5, 'la definitiva comparte el GCD'); assert.equal(v2.noRes, false);
const v3 = HM.slotView(p, { id: 'dash', cat: 'movement' }, { cd: 6, cost: 0, gcd: false }, 0.2);
assert.equal(v3.gcdFrac, 0, 'la movilidad va fuera del GCD');
const v4 = HM.slotView(p, { id: 'tajo', cat: 'basic' }, { cost: 0 }, 0.2);
assert.deepEqual([v4.cdFrac, v4.gcdFrac, v4.noRes], [0, 0, false], 'el básico no tiene enfriamiento ni GCD');
// sin perfil: la categoría decide si comparte GCD
for (const cat of CATS) {
  const v = HM.slotView({ cds: {}, gcdT: 0.2, mp: 999 }, { id: 'x', cat }, null, 0.2);
  assert.equal(v.gcdFrac > 0, cat !== 'basic' && GCD_CATS.has(cat), 'GCD por categoría: ' + cat);
}
assert.equal(HM.cdText(3.2), '4'); assert.equal(HM.cdText(0.44), '0.4'); assert.equal(HM.cdText(0), '');
console.log('Ranura: enfriamiento radial, sombra de GCD (no en básico ni movilidad), recurso insuficiente ✓');

// ---------- 3. ranura 2 flexible: dos pestañas validadas con fitsSlot ----------
for (const [cid, cls] of Object.entries(CLASSES)) {
  const tabs = HM.k2Tabs(cls.skills, { fits: fitsSlot });
  assert.deepEqual(tabs.map(t => t.id), ['defense', 'spender']);
  assert.ok(tabs[0].skills.length > 0 && tabs[1].skills.length > 0, `${cid}: las dos pestañas tienen opciones`);
  for (const t of tabs) for (const sk of t.skills) {
    assert.ok(fitsSlot(sk, 'k2'), `${sk.id} encaja en k2`);
    assert.ok(t.cats.includes(sk.cat));
  }
  assert.ok(!tabs.flatMap(t => t.skills).some(sk => ['basic', 'movement', 'ultimate'].includes(sk.cat)));
}
assert.equal(HM.k2TabFor({ cat: 'spender' }), 'spender'); assert.equal(HM.k2TabFor(null), 'defense');
console.log('Ranura 2: pestañas «Defensa/utilidad» y «Gastadora» con fitsSlot ✓');

// ---------- 4. sprites del mapa / minimapa ----------
const ctx = { level: 10, quest: null, rift: 0 };
const cases = [
  [{ type: 'chest' }, 'cofre'], [{ type: 'chest', opened: true }, null], [{ type: 'vendor' }, 'mercader'],
  [{ type: 'enchanter' }, 'encantador'], [{ type: 'healer' }, 'sanador'], [{ type: 'stash' }, 'alijo'],
  [{ type: 'petkeeper' }, 'mascotas'], [{ type: 'blacksmith' }, 'herrero'], [{ type: 'waypoint' }, 'waypoint'],
  [{ type: 'zone_dungeon' }, 'mazmorra'], [{ type: 'world_event' }, 'evento'], [{ type: 'world_event', used: true }, null],
  [{ type: 'zone_exit', minLevel: 20 }, 'salida'], [{ type: 'gate_zone' }, 'salida'], [{ type: 'portal_next' }, 'portal_siguiente'],
  [{ type: 'portal_dungeon' }, 'portal_siguiente'], [{ type: 'portal_town' }, 'portal'], [{ type: 'portal_daily' }, 'portal'],
  [{ type: 'shrine' }, null], [{ type: 'questgiver' }, 'mision'],
];
for (const [it, want] of cases) assert.equal(HM.poiSprite(it, ctx), want, JSON.stringify(it));
assert.equal(HM.poiSprite({ type: 'questgiver' }, { quest: { progress: 1, goal: 5 } }), 'mision');
assert.equal(HM.poiSprite({ type: 'questgiver' }, { quest: { progress: 5, goal: 5 } }), 'entregar');
assert.equal(HM.poiSprite({ type: 'portal_next' }, { rift: 3 }), 'grieta');
assert.equal(HM.poiLocked({ type: 'zone_exit', minLevel: 20 }, ctx), true);
assert.equal(HM.poiLocked({ type: 'zone_exit', minLevel: 5 }, ctx), false);
assert.equal(HM.enemySprite({ def: { boss: true } }), 'jefe');
assert.equal(HM.enemySprite({ def: { worldBoss: true } }), 'jefe');
assert.equal(HM.enemySprite({ def: { rank: 'elite' } }), 'elite');
assert.equal(HM.enemySprite({ def: { goblin: true } }), 'goblin');
assert.equal(HM.enemySprite({ def: {} }), null);
for (const n of HM.MAP_SPRITES) { const s = HM.markerSize(n); assert.ok(s >= 14 && s <= 20, `${n}: ${s} px legible`); }
const legend = HM.mapLegend({ interactables: [{ type: 'chest' }, { type: 'vendor' }, { type: 'chest' }] }, { enemies: [{ def: { boss: true } }], death: true });
assert.deepEqual(legend.map(l => l.sprite), ['jugador', 'cofre', 'mercader', 'jefe', 'muerte']);
console.log('Mapa: sprite por tipo de POI/NPC/estado de misión/grieta, enemigos clave, tamaños 14–20 px, leyenda ✓');

// ---------- 5. estados del objetivo y del jugador ----------
const boss = { staggerBrokenT: 2, slowT: 3, tauntT: 1, vulnT: 0, debuffs: { a: { pct: 10, t: 2 } }, frozenT: 0, numbT: 2,
  _dots: { 'bola_fuego:burn': {}, 'x:bleed': {}, 'y:poison': {} }, stunT: 2 };
assert.deepEqual(HM.enemyStatuses(boss).map(s => s.id), ['quebrantado', 'escarcha', 'ralentizado', 'provocado', 'debilidad', 'quemadura', 'sangrado', 'veneno']);
assert.equal(HM.enemyStatuses({ stunT: 1 })[0].id, 'aturdido');
assert.equal(HM.enemyStatuses({ rootT: 1 })[0].label, 'Inmovilizado');
assert.equal(HM.enemyStatuses({ gauges: { escarcha: { v: 3 } } })[0].label, 'Escarcha 3');
assert.equal(HM.playerStatusIcon({ id: 'slow', name: 'Ralentizado' }), 'assets/ui/st_ralentizado.webp');
assert.equal(HM.playerStatusIcon({ id: 'shield', name: 'Escudo' }), 'assets/ui/st_escudo.webp');
assert.equal(HM.playerStatusIcon({ id: 'xp_boost', name: 'Bendición de Experiencia' }), null);
console.log('Estados: Quebrantado, Escarcha/Aterido, control, Provocado, Debilidad y DoT con su icono st_* ✓');

// ---------- 6. indicador de especialización y stagger ----------
const gb = HM.gaugeBar({ id: 'calor', name: 'Calor', value: 72, max: 100, color: '#ff8a3d', state: 'building' }, 'Piromante');
assert.equal(gb.title, 'CALOR · PIROMANTE'); assert.equal(gb.pct, 72); assert.equal(gb.segs, 4);
assert.match(gb.right, /^72 \/ 100 · a 100: Ignición Total$/);
assert.equal(HM.gaugeBar({ id: 'fervor', name: 'Fervor', value: 3, max: 3, state: 'full' }).segs, 3, 'cargas: una celda por carga');
const act = HM.gaugeBar({ id: 'sed', name: 'Sed', value: 0, max: 100, state: 'active', label: 'Sed Saciada', t: 4.25 });
assert.equal(act.active, true); assert.equal(act.right, 'Sed Saciada · 4.3 s');
assert.equal(HM.gaugeBar(null), null);
assert.deepEqual(HM.staggerBar({ value: 40, max: 100 }), { pct: 40, state: 'building', label: 'Aturdimiento 40 %' });
assert.equal(HM.staggerBar({ value: 0, max: 100, broken: true, brokenT: 3.5 }).state, 'broken');
assert.match(HM.staggerBar({ value: 0, max: 100, broken: true, brokenT: 3.5 }).label, /QUEBRANTADO/);
assert.equal(HM.staggerBar({ value: 0, max: 100, locked: true, lockT: 30 }).pct, 100);
assert.equal(HM.staggerBar(null), null);
const pos = { x: 0, z: 0 };
const near = { alive: true, def: { boss: true }, pos: { x: 5, z: 0 } }, far = { alive: true, def: { worldBoss: true }, pos: { x: 50, z: 0 } };
assert.equal(HM.pickBossTarget([far, near, { alive: true, def: {}, pos: { x: 1, z: 0 } }], pos, 30), near);
assert.equal(HM.pickBossTarget([far], pos, 30), null);
console.log('Indicador de especialización (título, valor/máx, celdas, estado activo) y barra de stagger (Quebrantado) ✓');

// ---------- 7. arte de las activas de talento ----------
let arts = 0;
for (const [cid, cls] of Object.entries(CLASSES)) for (const sk of cls.skills.filter(s => s.kind === 'talent')) {
  const art = HM.talentSkillArt(TALENT_TREES[cid], sk.id);
  assert.ok(art?.icon, `${cid}/${sk.id}: nodo que la concede`);
  assert.ok(has('assets/' + art.icon), 'falta el sprite ' + art.icon);
  arts++;
}
console.log(`Activas de talento: ${arts} con el sprite de su nodo ✓`);

// ---------- 8. assets referenciados (y precargados por el service worker) ----------
const need = new Set();
for (const s of HM.BOOK_SECTIONS) need.add(HM.uiIcon(s.icon));
for (const t of HM.K2_TABS) need.add(HM.uiIcon(t.icon));
for (const cls of Object.values(CLASSES)) { const r = HM.resIcon(cls.resource.id); assert.ok(r, 'recurso sin icono: ' + cls.resource.id); need.add(r); }
for (const id of Object.keys(HM.MENU_ICON)) need.add(HM.menuIcon(id));
for (const slot of Object.keys(SLOT_NAMES)) if (HM.eqIcon(slot)) need.add(HM.eqIcon(slot));
for (const k of Object.keys(HM.MAT_ICON)) need.add(HM.matIcon(k));
for (const id of Object.keys(HM.STATUS)) need.add(HM.statusIcon(id));
for (const n of HM.MAP_SPRITES) need.add(HM.mapIcon('mk_' + n));
for (const f of ['tx_panel', 'tx_pergamino', 'ui_boton', 'ui_boton_hover', 'ui_cabecera', 'ui_cerrar', 'ui_marco_minimapa', 'ui_marco_panel', 'ui_pestana', 'ui_ranura', 'ui_separador', 'ui_tooltip'])
  need.add(`assets/chrome/${f}.webp`);
const sw = readFileSync(join(ROOT, 'sw.js'), 'utf8');
for (const f of need) {
  assert.ok(has(f), 'falta el asset ' + f);
  assert.ok(sw.includes(`'./${f}'`), 'sw.js no precarga ' + f);
}
for (const js of ['js/hud-model.js', 'js/ui-gauges.js', 'js/ui-talents.js', 'css/talents.css']) assert.ok(sw.includes(`'./${js}'`), 'sw.js sin ' + js);
assert.ok(!/assets\/talents\/[a-z]/.test(sw), 'los iconos de talentos NO se precargan (caché en tiempo de ejecución)');
assert.match(sw, /ART_RE = .*talents\|specs\|emblems\|ui256/);
// cada panel de index.html tiene icono de menú
const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
for (const [, id] of html.matchAll(/id="panel-([a-z]+)"/g)) assert.ok(HM.MENU_ICON[id], 'panel sin icono de menú: ' + id);
for (const id of ['spec-gauge', 'boss-frame', 'spec-prompt', 'btn-talents', 'minimap-frame', 'orb-mp-res']) assert.ok(html.includes(`id="${id}"`), 'index.html sin #' + id);
assert.ok(html.includes('href="css/talents.css"'), 'index.html enlaza css/talents.css');
console.log(`Assets: ${need.size} ficheros de ui/, map/ y chrome/ existen y los precarga sw.js; paneles con icono ✓`);

console.log('\n✅ MODELO DEL HUD (Paso 2d) OK');
