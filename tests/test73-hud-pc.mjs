// Paso 2d.2 · HUD de PC (docs/paso2d2-hud-pc.md §1, §2 y §7.1 A9):
//  1) A9: sin herencia móvil en index.html, css/style.css, js/ui.js, js/input.js y js/main.js
//  2) hudLayout: --s (1 a 1080p, 0,8 a 768p), micromenú 2×5 bajo 1600 px, la columna
//     del dock nunca entra en la zona de combate, «Escala del HUD» multiplica
//  3) lootLogEntry, pickGaugeTarget, pickTargetFrame/targetView, messageRoute, promptView,
//     splitBuffs, plateView
//  4) el esqueleto del HUD (index.html) tiene los bloques de §2.2 y los assets de assets/hud
//  5) bindings: atajos del micromenú libres (P J K H Z) y remapeables
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as HM from '../js/hud-model.js';
import { DEFAULT_BINDINGS, BINDABLE_ACTIONS, mergeBindings, buildCodeMap } from '../js/bindings.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => readFileSync(join(ROOT, f), 'utf8');

// ---------- 1. A9: sin herencia móvil ----------
const FILES = ['index.html', 'css/style.css', 'js/ui.js', 'js/input.js', 'js/main.js'];
const BANNED = [
  [/joy-/, 'joy-'], [/body\.touch/, 'body.touch'], [/pointer:\s*coarse/, 'pointer: coarse'], [/rotate-prompt/, 'rotate-prompt'],
  [/safe-area/, 'safe-area'], [/\b[Tt]oca\b/, '«toca»/«Toca»'], [/isTouch/, 'isTouch'], [/hint-touch/, '.hint-touch'],
  [/action-cluster/, '#action-cluster'], [/btn-menu-toggle/, '#btn-menu-toggle'], [/--safe-b/, '--safe-b'], [/joystickRight/, 'joystickRight'],
  [/user-scalable/, 'user-scalable'],
];
for (const f of FILES) {
  const src = read(f);
  for (const [re, what] of BANNED) {
    const m = src.match(re);
    assert.ok(!m, `${f} todavía contiene ${what}: «${m && src.slice(Math.max(0, m.index - 40), m.index + 40).replace(/\n/g, ' ')}»`);
  }
}
// el HUD no desenfoca el canvas cada frame (R4)
const css = read('css/style.css');
const hudCss = css.slice(css.indexOf('PASO 2d.2 · HUD DE PC'));
assert.ok(hudCss.length > 1000, 'falta el bloque «PASO 2d.2 · HUD DE PC» de style.css');
assert.ok(!/backdrop-filter/.test(hudCss), 'el HUD de PC no usa backdrop-filter');
for (const id of ['hud-info', 'menu-btns', 'hud-menu', 'buff-bar', 'quest-tracker {', 'messages']) {
  if (id === 'quest-tracker {') continue;
  assert.ok(!new RegExp(`#${id}\\b`).test(css), `style.css aún tiene #${id}`);
}
// los rellenos de orbes, XP, vida del objetivo y aturdimiento van por transform
const ui = read('js/ui.js');
assert.ok(!/orb-(hp|mp)-fill'\)\.style\.height/.test(ui), 'los orbes no se rellenan por height');
assert.ok(!/xp-fill'\)\.style\.width/.test(ui), 'la XP no se rellena por width');
assert.ok(/translateY\(/.test(ui) && /scaleX\(/.test(ui), 'rellenos por transform (translateY/scaleX)');
console.log(`A9: ${FILES.length} archivos sin joystick, táctil, «toca», safe-area ni rotate-prompt ✓`);

// ---------- 2. hudLayout ----------
const L1080 = HM.hudLayout(1920, 1080);
assert.equal(L1080.s, 1); assert.equal(L1080.microRows, 1);
assert.deepEqual(L1080.combat, [422, 238, 1075, 605], 'zona de combate 56 % × 56 % (mockup)');
const L768 = HM.hudLayout(1366, 768);
assert.equal(L768.s, 0.8, '0,8 a 1366×768'); assert.equal(L768.microRows, 2, 'micromenú 2×5 bajo 1600 px');
assert.equal(HM.hudLayout(1600, 900).microRows, 1);
assert.ok(Math.abs(HM.hudLayout(1600, 900).s - 0.833) < 0.002);
assert.equal(HM.hudLayout(2560, 1440).s, 1.25, 'tope 1,25 en 1440p');
for (const [w, h] of [[1920, 1080], [1600, 900], [1366, 768], [1280, 720], [1280, 1024], [1024, 640]]) {
  const L = HM.hudLayout(w, h);
  const top = h - HM.DOCK_COLUMN_H * L.s;           // borde superior de la columna del dock
  assert.ok(top >= L.combat[1] + L.combat[3], `${w}×${h}: la columna del dock (${top.toFixed(1)}) entra en la zona de combate (${L.combat[1] + L.combat[3]})`);
}
assert.ok(HM.hudLayout(1280, 720).s < 0.8, '1280×720 baja de 0,8 para no tocar la zona de combate');
assert.equal(HM.hudLayout(1920, 1080, 1.2).s, 1.2, '«Escala del HUD» multiplica --s');
assert.equal(HM.hudLayout(1920, 1080, 9).s, 1.5, 'escala acotada a 150 %');
assert.equal(HM.hudLayout(1920, 1080, 0.1).s, 0.7, 'escala acotada a 70 %');
assert.equal(HM.hudLayout(0, 0).s, 1, 'sin medidas: referencia 1920×1080');
console.log('hudLayout: --s 1 / 0,833 / 0,8 / <0,8 en 720p, micromenú 1×10 o 2×5, columna fuera de la zona de combate ✓');

// ---------- 3. modelos ----------
assert.equal(HM.fmtNum(12340), '12 340');
assert.equal(HM.fmtNum(1240), '1 240');
assert.equal(HM.fmtNum(999), '999');
let e = HM.lootLogEntry({ kind: 'item', name: 'Báculo Glacial', rarity: 'raro' });
assert.equal(e.text, '+ Báculo Glacial (Raro)'); assert.equal(e.rarity, 'raro'); assert.equal(e.color, HM.LOOT_COLOR.raro);
e = HM.lootLogEntry({ kind: 'item', name: 'Anillo de Plata', rarity: 'normal' });
assert.equal(e.text, '+ Anillo de Plata'); assert.equal(e.rarity, 'normal');
e = HM.lootLogEntry({ kind: 'item', name: 'Corona', rarity: 'legendario', mythic: true });
assert.equal(e.text, '+ Corona (Mítico)');
e = HM.lootLogEntry({ kind: 'item', name: 'Botas', rarity: 'magico', unidentified: true });
assert.match(e.text, /sin identificar/);
e = HM.lootLogEntry({ kind: 'gold', amount: 412 });
assert.equal(e.text, '+412 oro'); assert.equal(e.merge, 'gold'); assert.equal(e.amount, 412);
e = HM.lootLogEntry({ kind: 'xp', amount: 1240 });
assert.equal(e.text, '+1 240 XP'); assert.equal(e.rarity, 'xp'); assert.equal(e.merge, 'xp');
assert.equal(HM.lootLogEntry({ kind: 'gem', name: 'Rubí Tallado', rarity: 'raro' }).rarity, 'mat');
assert.match(HM.lootLogEntry({ kind: 'potion', pot: 'hp' }).text, /Poción de vida/);
assert.equal(HM.lootLogEntry({ kind: 'gold', amount: 0 }), null);
assert.equal(HM.lootLogEntry(null), null);
assert.equal(HM.lootLogEntry({ kind: 'item' }), null);
for (const r of ['normal', 'magico', 'raro', 'legendario', 'conjunto', 'gold', 'xp', 'mat']) assert.match(HM.LOOT_COLOR[r], /^#[0-9a-f]{6}$/i);
console.log('lootLogEntry: rareza, mítico, sin identificar, oro/XP sumables, materiales ✓');

// objetivo de la mecánica (R1): bajo el cursor > jefe en combate > null
const at = (x, z) => ({ x, z });
const mob = { alive: true, def: { name: 'Esqueleto' }, pos: at(2, 0), hp: 50, maxHP: 100 };
const elite = { alive: true, def: { name: 'Gólem', rank: 'elite', modId: 'cadenas' }, pos: at(4, 0), hp: 300, maxHP: 400 };
const boss = { alive: true, def: { name: 'Señor del Osario', boss: true }, pos: at(12, 0), hp: 600, maxHP: 1000 };
const farBoss = { alive: true, def: { name: 'Lejano', boss: true }, pos: at(80, 0), hp: 1, maxHP: 1 };
const dead = { alive: false, def: { name: 'Muerto' }, pos: at(1, 0) };
const list = [mob, elite, boss, farBoss, dead];
const P = at(0, 0);
assert.equal(HM.pickGaugeTarget(list, mob, P), mob, 'el enemigo bajo el cursor manda');
assert.equal(HM.pickGaugeTarget(list, null, P), boss, 'sin cursor: el jefe en combate');
assert.equal(HM.pickGaugeTarget(list, dead, P), boss, 'un muerto bajo el cursor no cuenta');
assert.equal(HM.pickGaugeTarget(list, { alive: true, pos: at(0, 0) }, P), boss, 'uno que ya no está en la lista no cuenta');
assert.equal(HM.pickGaugeTarget([mob, elite], null, P), null, 'sin jefe ni cursor: null (gaugeView elige)');
assert.equal(HM.pickGaugeTarget([farBoss], null, P), null, 'jefe fuera de alcance');
assert.equal(HM.pickGaugeTarget(list, null, null), null);
// marco superior: el jefe cercano manda sobre el cursor
assert.equal(HM.pickTargetFrame(list, elite, P), boss);
assert.equal(HM.pickTargetFrame([mob, elite], elite, P), elite);
assert.equal(HM.pickTargetFrame([mob, elite], null, P), null);
let v = HM.targetView(boss, { floor: 12 });
assert.equal(v.kind, 'boss'); assert.equal(v.tag, 'JEFE · PISO 12'); assert.equal(v.hpPct, 0.6);
assert.equal(v.frame, 'assets/hud/hud_objetivo_marco.webp'); assert.match(v.hpTxt, /600 \/ 1 000 · 60 %/);
v = HM.targetView(elite);
assert.equal(v.kind, 'elite'); assert.equal(v.tag, 'ÉLITE'); assert.equal(v.frame, 'assets/hud/hud_objetivo_elite.webp');
v = HM.targetView(mob);
assert.equal(v.kind, 'normal'); assert.equal(v.frame, null); assert.equal(v.tag, '');
assert.equal(HM.targetKind({ def: { rank: 'campeon' } }), 'champion');
assert.equal(HM.targetView(null), null);
console.log('pickGaugeTarget (cursor > jefe > null), pickTargetFrame y targetView (jefe/élite/normal) ✓');

// mensajes: banner para lo importante, registro para lo breve y los consejos
assert.equal(HM.messageRoute('💀 ¡Has derrotado al jefe!', 4000), 'banner');
assert.equal(HM.messageRoute('Inventario lleno'), 'syslog');
assert.equal(HM.messageRoute('💡 Consejo largo', 5500), 'syslog');
assert.equal(HM.messageRoute('', 5000), 'none');
// aviso contextual
let pv = HM.promptView({ interact: { type: 'vendor', label: '💰 Mercader' }, keys: { primary: 'Espacio' } });
assert.deepEqual([pv.key, pv.verb, pv.name], ['Espacio', 'Comerciar', 'Mercader']);
pv = HM.promptView({ interact: { type: 'portal_town', label: '🌀 Volver al Pueblo' } });
assert.equal(pv.verb, 'Entrar'); assert.equal(pv.name, 'Volver al Pueblo');
pv = HM.promptView({ loot: { kind: 'item', name: 'Báculo Glacial', rarity: 'raro' }, keys: { grab: 'F' } });
assert.deepEqual([pv.key, pv.verb, pv.name, pv.rarity, pv.tag], ['F', 'Recoger', 'Báculo Glacial', 'raro', 'Raro']);
assert.equal(HM.promptView({}), null);
// alas: beneficios y perjuicios
const sb = HM.splitBuffs([{ id: 'slow', name: 'Ralentizado' }, { id: 'x', name: 'Bendición de Furia' }, { id: 'shield', name: 'Escudo', debuff: false }, { id: 'b', name: 'Sangrando' }]);
assert.deepEqual(sb.buffs.map(b => b.id), ['x', 'shield']);
assert.deepEqual(sb.debuffs.map(b => b.id), ['slow', 'b']);
// placa del héroe
const pl = HM.plateView({ level: 42, torment: 3, cls: { name: 'Maga', icon: '🔮' } }, { id: 'crionte', name: 'Crionte' });
assert.equal(pl.title, 'Nv 42 · Crionte'); assert.equal(pl.sub, 'Maga · Tormento III');
assert.equal(pl.emblem, 'assets/emblems/crionte.webp'); assert.equal(pl.color, HM.SPEC_COLOR.crionte);
assert.equal(HM.plateView({ level: 3, cls: { name: 'Guerrero' } }).sub, 'Guerrero · Normal');
assert.equal(HM.roman(10), 'X'); assert.equal(HM.roman(4), 'IV'); assert.equal(HM.roman(9), 'IX');
assert.equal(HM.MICRO_MENU.length, 10, 'micromenú de 10 botones');
console.log('messageRoute, promptView, splitBuffs, plateView y micromenú ✓');

// ---------- 4. esqueleto del HUD y assets ----------
const html = read('index.html');
for (const id of ['hud-plate', 'target-frame', 'hud-banner', 'hud-minimap', 'minimap', 'hud-objectives', 'hud-loot', 'hud-syslog', 'hud-gold',
  'hud-micro', 'hud-dock', 'buff-wing', 'debuff-wing', 'orb-hp', 'orb-mp', 'hud-prompt', 'spec-gauge', 'hud-bar', 'skillbar', 'btn-dodge',
  'btn-pot-hp', 'btn-pot-mp', 'xp-bar'])
  assert.ok(html.includes(`id="${id}"`), 'index.html sin #' + id);
const blocks = [...html.matchAll(/data-hud-block="([a-zA-Z]+)"/g)].map(m => m[1]);
for (const b of ['placa', 'objetivo', 'banner', 'minimapa', 'mision', 'botin', 'sistema', 'oro', 'micromenu', 'alaBenef', 'alaPerj',
  'orbeVida', 'aviso', 'mecanica', 'barra', 'orbeRecurso'])
  assert.ok(blocks.includes(b), 'bloque medido por ?hudcheck=1 sin marcar: ' + b);
for (const m of HM.MICRO_MENU) {
  assert.ok(html.includes(`data-micro="${m.id}"`), 'micromenú sin botón ' + m.id);
  assert.ok(html.includes(`assets/ui/${m.icon}.webp`), 'micromenú sin icono ' + m.icon);
  assert.ok(existsSync(join(ROOT, `assets/ui/${m.icon}.webp`)), 'falta ' + m.icon);
}
// orden visual de la barra: Q · 1 2 3 4 · IZQ DER · ⇧ E
const barHTML = html.slice(html.indexOf('id="hud-bar"'), html.indexOf('id="xp-bar"'));
const order = ['btn-pot-hp', 'skillbar', 'btn-dodge', 'btn-pot-mp'].map(id => barHTML.indexOf(`id="${id}"`));
assert.ok(order.every((x, i) => x > 0 && (i === 0 || x > order[i - 1])), 'barra: Q · ranuras · ⇧ · E');
assert.match(ui, /\['k1', 'k2', 'k3', 'k4', 'lmb', 'rmb'\]/, 'orden de D4: 1 2 3 4 | IZQ DER');
// assets del HUD (copiados de IntentoRPG-assets/web/hud) y referenciados donde toca
const HUD_ASSETS = ['hud_orbe_marco_vida', 'hud_orbe_marco_recurso', 'hud_liquido_vida', 'hud_liquido_furia', 'hud_liquido_mana',
  'hud_liquido_energia', 'hud_dock', 'hud_objetivo_marco', 'hud_objetivo_elite', 'hud_stagger'];
for (const a of HUD_ASSETS) {
  assert.ok(existsSync(join(ROOT, `assets/hud/${a}.webp`)), 'falta assets/hud/' + a);
  assert.ok(html.includes(`assets/hud/${a}.webp`) || css.includes(`assets/hud/${a}.webp`), 'nadie usa ' + a);
}
// capas: el HUD es un contexto propio por encima de las etiquetas y los números del mundo
assert.match(hudCss, /#labels, #floats, #compass \{ z-index: 5; \}/);
assert.match(hudCss, /#hud \{ position: fixed; inset: 0; z-index: 10;/);
// el KillInfo de onEnemyKilled usa killStatus (2c.2)
assert.match(read('js/main.js'), /status: killStatus\(enemy\)/);
console.log('index.html: bloques de §2.2 marcados, micromenú con menu_*, barra en orden D4, assets/hud usados, HUD sobre el mundo ✓');

// ---------- 5. atajos del micromenú ----------
const map = buildCodeMap(mergeBindings());
for (const [act, code] of [['paragon', 'KeyP'], ['quests', 'KeyJ'], ['collection', 'KeyK'], ['guide', 'KeyH'], ['cleanHud', 'KeyZ']]) {
  assert.deepEqual(DEFAULT_BINDINGS[act], [code], `${act} en ${code}`);
  assert.equal(map[code], act, `${code} libre y resuelto a ${act}`);
  assert.ok(BINDABLE_ACTIONS.some(a => a.id === act), act + ' remapeable');
}
const all = Object.values(DEFAULT_BINDINGS).flat();
assert.equal(new Set(all).size, all.length, 'ningún código repetido entre acciones');
console.log('Atajos P/J/K/H/Z libres y remapeables ✓');

// ---------- 6. Paso 2 (U2): libro, verbos y marcas de mundo en PC ----------
// A9 también en lo nuevo; motion solo con transform/opacity (G10) y sin él con «reducir movimiento»
const NEW = ['js/ui-skills.js', 'js/ui-verbs.js', 'js/world-marks.js', 'css/skills.css', 'css/verbs.css'];
for (const f of NEW) {
  const src = read(f);
  for (const [re, what] of [...BANNED, [/touchstart|touchend|pointerType\s*===?\s*['"]touch/, 'eventos táctiles']]) assert.ok(!re.test(src), `${f} contiene ${what}`);
}
for (const f of ['css/skills.css', 'css/verbs.css']) {
  const src = read(f).replace(/\/\*[\s\S]*?\*\//g, '');
  // cada @keyframes anima solo transform y opacity
  for (const [, name, body] of src.matchAll(/@keyframes\s+([\w-]+)\s*\{((?:[^{}]*\{[^{}]*\})*)\s*\}/g)) {
    for (const [, decls] of body.matchAll(/\{([^{}]*)\}/g)) for (const d of decls.split(';').map(x => x.trim()).filter(Boolean))
      assert.ok(/^(transform|opacity)\s*:/.test(d), `${f} @keyframes ${name}: anima «${d}» (solo transform/opacity)`);
  }
  // las transiciones, también
  for (const [, v] of src.matchAll(/transition\s*:\s*([^;}]+)/g)) for (const part of v.split(/,(?![^(]*\))/).map(x => x.trim()))
    assert.ok(/^(none|transform|opacity)\b/.test(part), `${f}: transición de «${part}» (solo transform/opacity)`);
  assert.ok(/@media\s*\(prefers-reduced-motion:\s*reduce\)/.test(src) && /body\.reduce-motion/.test(src), `${f}: sin pulsos con «reducir movimiento»`);
  assert.ok(!/backdrop-filter/.test(src), `${f}: sin backdrop-filter`);
}
// el pintor de los verbos (cada frame) no lee el layout
const uv = read('js/ui-verbs.js');
assert.ok(!/getBoundingClientRect|offset(Width|Height|Left|Top)|client(Width|Height)|getComputedStyle/.test(uv), 'ui-verbs.js no lee el layout');
// la barra junto al cursor siempre dentro de la pantalla, encima del cursor si cabe
for (const [w, h] of [[1920, 1080], [1366, 768]]) for (let x = 0; x <= w; x += w / 8) for (let y = 0; y <= h; y += h / 6) {
  const q = HM.cursorBarPos(x, y, w, h);
  assert.ok(q.x >= 8 && q.y >= 8 && q.x + 64 <= w - 8 && q.y + 6 <= h - 8, `${w}×${h} cursor (${x}, ${y}): barra fuera (${q.x}, ${q.y})`);
  if (y - 24 - 6 >= 8) assert.equal(q.y, Math.round(y - 30), 'encima del cursor (no tapa al objetivo)');
}
// el libro (1560 × 930) cabe y escala como el HUD a 1080p y 768p
assert.equal(HM.bookScale(1920, 1080), HM.hudLayout(1920, 1080).s);
assert.equal(HM.bookScale(1366, 768), HM.hudLayout(1366, 768).s);
// el libro respeta las teclas del jugador (bindings): no las escribe a mano
const us = read('js/ui-skills.js');
assert.ok(/codeToAction/.test(us) && /keyLabel/.test(us), 'ui-skills.js usa los atajos de bindings.js');
assert.ok(!/e\.code === 'Key[TN]'/.test(us), 'sin T/N fijas en el libro');
console.log('Libro y verbos en PC: sin táctil, motion solo transform/opacity y «reducir movimiento», sin leer el layout por frame, barra del cursor dentro, atajos del jugador ✓');

// marcas de mundo de los verbos: pool fijo, datos a 10 Hz y el destello de la carga el MISMO frame
{
  const { WorldMarks, verbMarksPlan, THREAD_MAX } = await import('../js/world-marks.js');
  const { verbHarness } = await import('./fixtures/skills-verbs-sample.mjs');
  const h = verbHarness('guerrero', { level: 40 });
  const { p, g } = h;
  const wm = new WorldMarks(null);
  const n0 = wm.objectCount();
  const step = (sec, dt = 1 / 60) => { for (let t = 0; t < sec - 1e-9; t += dt) { h.step(dt, dt); wm.update(g, dt); } };
  // plantado: anillo bajo los pies solo con una habilidad que lo use
  p.hotbar.rmb = 'vx_terremoto'; p.recompute();
  step(1.4);
  assert.ok(p.planted && wm.verb.planted.visible, 'plantado → anillo bajo los pies');
  assert.ok(Math.abs(wm.verb.planted.position.x - p.pos.x) < 1e-6, 'el anillo sigue al héroe');
  p.hotbar.rmb = 'vx_tenso'; p.recompute(); step(0.2);
  assert.ok(!wm.verb.planted.visible, 'sin habilidad que use el plantado, sin anillo');
  // postura: aro del color del modo
  p.hotbar.k2 = 'vx_guardia'; p.recompute();
  h.cast('k2'); step(0.2);
  assert.ok(wm.verb.stance.visible && '#' + wm.verb.stance.material.color.getHexString() === HM.STANCE_COLORS[0].toLowerCase(), 'postura → aro a los pies del color del modo');
  // cebo: un hilo por enemigo atraído (pool de THREAD_MAX)
  p.hotbar.k2 = 'vx_cepo'; p.recompute();
  h.aim(4, 0); h.cast('k2'); step(0.7);
  const e = h.enemy({ hp: 1e6, pos: [8, 0, 0] });
  e.aggroed = false;
  for (let i = 0; i < 30 && !e._lure; i++) { g.lureStep?.(e, 1 / 30); step(1 / 30); }
  step(0.15);
  assert.ok(e._lure, 'el cebo atrae al enemigo');
  assert.equal(verbMarksPlan(g).threads.length, 1);
  assert.ok(wm.verb.threads[0].visible && wm.verb.threads.slice(1).every(m => !m.visible), 'un hilo del enemigo a su cebo');
  assert.equal(wm.verb.threads.length, THREAD_MAX);
  // Batida: 3 estallidos en 1 s → el anillo se abre una vez
  p.trapBursts = [p.simT - 0.6, p.simT - 0.3, p.simT];
  step(0.12);
  assert.ok(wm.huntT >= 0 && wm.verb.hunt.visible, 'Batida → anillo que se abre');
  step(0.8);
  assert.ok(!wm.verb.hunt.visible && wm.huntT < 0, 'el anillo de la Batida se apaga');
  step(0.3);
  assert.ok(wm.huntT < 0, 'la misma Batida no se repite');
  // carga: destello en el MISMO frame en que el motor entra en la ventana
  p.hotbar.rmb = 'vx_martillo'; p.recompute(); p.mp = 999; g.resetCooldowns(p);
  h.press('rmb');
  let edge = -1, flash = -1;
  for (let i = 0; i < 80 && g._charging; i++) {
    h.step(1 / 60, 1 / 60); wm.update(g, 1 / 60);
    if (g._charging?.inWindow && edge < 0) edge = i;
    if (wm.verb.flash.visible && flash < 0) flash = i;
  }
  assert.ok(edge > 0 && edge === flash, `destello del arma el mismo frame que inWindow (${edge} / ${flash})`);
  h.release('rmb'); step(0.5);
  assert.equal(wm.objectCount(), n0, 'pool fijo: nada se crea por frame');
  wm.clear();
  assert.ok(!wm.verb.planted.visible && !wm.verb.stance.visible && !wm.verb.hunt.visible && wm.verb.threads.every(m => !m.visible), 'clear() apaga las marcas de verbo');
  console.log('Marcas de mundo de los verbos: plantado, postura, hilos del cebo, Batida y destello de la carga (mismo frame) con pool fijo ✓');
}

console.log('\n✅ HUD DE PC (Paso 2d.2) OK');
