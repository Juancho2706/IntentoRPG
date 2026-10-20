// Soportes de habilidad (gemas de soporte estilo PoE) — reescrito en el Paso 2b.0:
// compatibilidad por TAGS (requires/forbids, §4.3), efecto vía SUPPORT_MOD del
// resolvedor único, huecos por categoría y comprobación EN COMBATE (canal real).
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { SUPPORTS, CLASSES } from '../js/data.js';
import { TAGS } from '../js/skill-defs.js';
import { makeSupport, itemStatLines } from '../js/items.js';
import { Player, Projectile } from '../js/entities.js';
import { resolveSkill, supportFits, SUPPORT_MOD } from '../js/skill-resolve.js';
import { makeHarness } from './helpers/power-harness.mjs';

globalThis.performance = globalThis.performance || { now: () => Date.now() };

// catálogo: requires/forbids sobre el vocabulario cerrado de tags (o pseudo-tags @dmg/@cost/@cd)
const PSEUDO = new Set(['@dmg', '@cost', '@cd']);
for (const s of SUPPORTS) {
  assert.ok(s.requires?.length, `${s.id}: requires`);
  for (const r of s.requires) for (const t of r.split('|')) assert.ok(TAGS.has(t) || PSEUDO.has(t), `${s.id}: tag desconocido ${t}`);
  for (const f of s.forbids || []) assert.ok(TAGS.has(f), `${s.id}: forbids desconocido ${f}`);
  assert.ok(SUPPORT_MOD[s.id], `${s.id}: sin efecto en SUPPORT_MOD`);
  assert.ok(s.effect && s.desc && s.fits, `${s.id}: textos`);
}
console.log('Soportes:', SUPPORTS.map(s => s.id).join(', '), '— requires/forbids por tags ✓');

// gema de soporte (objeto) y ficha
const sup = makeSupport('multi');
assert.equal(sup.kind, 'support'); assert.equal(sup.supportId, 'multi');
assert.ok(itemStatLines(sup).join(' ').includes('proyectil') && itemStatLines(sup).join(' ').includes('Aplicable a'), 'ficha con descripción y a qué se aplica');
console.log('Gema de soporte: consumible con descripción ✓');

// cualquier habilidad nueva es compatible SIN tocar la lista (modelo PoE2)
const fb = CLASSES.maga.skills.find(s => s.id === 'bola_fuego');
const nova = CLASSES.maga.skills.find(s => s.id === 'nova_hielo');
const S = id => SUPPORTS.find(s => s.id === id);
assert.ok(supportFits(S('multi'), fb) && !supportFits(S('multi'), nova), 'Multiproyectil: solo proyectiles');
assert.ok(supportFits(S('wide'), nova) && !supportFits(S('wide'), fb), 'Expansivo: solo áreas');
const nueva = { id: 'x', cat: 'spender', tags: ['spender', 'channel', 'arcane'], elem: 'arcane', coef: 1, cost: 10, cd: 0 };
assert.ok(!supportFits(S('multi'), nueva) && !supportFits(S('echo'), nueva) && supportFits(S('amplify'), nueva), 'una canalización nueva: por tags, sin listas de tipos');
console.log('Compatibilidad por tags (también para habilidades futuras) ✓');

// multi-socket: 2 huecos en una gastadora; ambos aplican en el perfil
const p = new Player({ ui: { spawnText() {}, message() {} }, sfx() {}, input: {}, enemies: [] }, 'maga');
p.level = 10; p.knownSupports = ['multi', 'amplify', 'freeze', 'chain']; p.supports = { bola_fuego: ['multi', 'amplify'] };
p.recompute();
const prof = resolveSkill(p, fb);
assert.equal(prof.count + prof.proj, 1 + 2, 'Multiproyectil +2 proyectiles');
assert.equal(prof.addPct, 30, 'Amplificado +30 al saco aditivo');
console.log('Multi-socket: 2 soportes aplican a la vez (proyectiles + daño) ✓');

// persistencia y retrocompatibilidad (string → array)
const fake = { ui: { spawnText() {}, message() {} }, sfx() {}, input: {}, enemies: [] };
const p2 = new Player(fake, 'maga', { classId: 'maga', saveVersion: 3, skillSystemV: 5, supports: p.supports, knownSupports: p.knownSupports });
assert.deepEqual(p2.supports.bola_fuego, ['multi', 'amplify']); assert.ok(p2.knownSupports.includes('amplify'));
const pOld = new Player(fake, 'maga', { classId: 'maga', level: 5, supports: { bola_fuego: 'multi' }, knownSupports: ['multi'] });
assert.deepEqual(pOld.supports.bola_fuego, ['multi'], 'retrocompat: string → array (y encaja por tags)');
console.log('Soportes asignados (array) y aprendidos persisten; retrocompat ✓');

// EN COMBATE (canal real): Multiproyectil dispara 3 bolas; Gélido ralentiza al impactar
{
  const h = makeHarness({ classId: 'maga', level: 10 });
  h.p.supports = { bola_fuego: ['multi', 'freeze'] }; h.p.recompute();
  const e = h.enemy({ hp: 1e6, pos: [0, 0, 5] });
  h.aim(0, 5); h.setSlot('rmb', 'bola_fuego');
  assert.equal(h.cast('rmb'), true);
  assert.equal(h.g.projectiles.length, 3, 'Multiproyectil: 3 proyectiles');
  h.step(1);
  assert.ok(e.hp < 1e6 && e.slowT > 0, 'Gélido: el impacto ralentiza');
  console.log('En combate: Multiproyectil y Gélido funcionan por el canal real ✓');
}

// el proyectil aplica la ralentización por Enemy.applyCC (gana la más fuerte)
{
  const h = makeHarness({ classId: 'arquera', level: 1 });
  const e = h.enemy({ hp: 1e6, pos: [1, 0, 0] });
  const pr = new Projectile(h.g, { from: new THREE.Vector3(-1, 1, 0), to: new THREE.Vector3(1, 1, 0), speed: 10, range: 5, dmg: 5, friendly: true, slow: 3, slowPct: 40 });
  for (let i = 0; i < 60 && !(e.slowT > 0); i++) pr.update(1 / 60);
  assert.ok(e.slowT >= 2.9 && e.slowPct === 40, 'slow del proyectil vía applyCC');
}
console.log('✅ SOPORTES DE HABILIDAD (por tags) OK');
