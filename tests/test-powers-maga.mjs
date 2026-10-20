// Paso 2c.1 — PODERES y ACTIVAS DE TALENTO de la MAGA (docs/paso2-diseno.md §9.1.5)
//  (a) todo `power` y `grant` de js/talents-maga.js existe y se puede lanzar
//  (b) al menos un caso de comportamiento por poder y por activa (arnés con talentos REALES)
//  (c) definePower rechaza claves desconocidas
//  (d) ningún poder de la Maga declara `mult`
import assert from 'node:assert/strict';
import { makeHarness } from './helpers/power-harness.mjs';
import { missingFor, talentRefs, KEY_NODE_MULTS } from './helpers/talent-coverage.mjs';
import { POWER_HOOKS, definePower, firePower, powerState } from '../js/powers.js';
import { magaPowers, magaSkillBehaviors, magaFields } from '../js/powers-maga.js';
import { gainGauge, spendGauge, setGauge } from '../js/spec-mechanics.js';
import { resolveSkill } from '../js/skill-resolve.js';
import { FIELD_DEFS } from '../js/field-entities.js';
import { SKILL_FX } from '../js/fx-skills.js';
import { TALENT_TREES } from '../js/talents.js';

// ------------------------------------------------ (a) cobertura
assert.deepEqual(missingFor('maga'), { powers: [], behaviors: [], skills: [] });
for (const sk of TALENT_TREES.maga.skills) assert.ok(SKILL_FX[sk.id], `${sk.id}: VFX/SFX de la activa`);
for (const k of ['p_muro_fuego', 'k_ventisca', 'k_tumba', 'k_campo_helado']) assert.ok(FIELD_DEFS[k], `campo ${k} registrado`);
assert.equal(Object.keys(magaFields()).length, 4);
console.log('Cobertura: 26 poderes, 15 comportamientos y 4 campos de la Maga registrados ✓');

// ------------------------------------------------ (c) y (d)
assert.throws(() => definePower('t_maga_mal', { onHitt() {} }), /clave desconocida/);
for (const id of talentRefs('maga').powers) if (!KEY_NODE_MULTS.includes(id)) assert.ok(!POWER_HOOKS[id].mult, `${id}: sin mult`);
for (const [id, d] of Object.entries(magaPowers())) assert.ok(!d.mult, `${id}: sin mult`);
console.log('definePower rechaza claves desconocidas; ningún poder de la Maga declara mult ✓');

// ------------------------------------------------ utilidades
const mk = (spec, sp = {}, { cls = {}, choice = {}, level = 50 } = {}) => {
  const h = makeHarness({ classId: 'maga', level, spec, talents: { spec: sp, cls, choice } });
  h.p.mp = h.p.stats.maxMP;
  return h;
};
// daño recibido por fuente (opts.source || opts.skill)
const track = e => {
  const by = {};
  const orig = e.takeDamage.bind(e);
  e.takeDamage = (amount, crit, opts = {}) => {
    const before = e.hp;
    const r = orig(amount, crit, opts);
    const k = opts.source && String(opts.source).startsWith('power:') ? opts.source : (opts.skill || opts.source || 'otros');
    by[k] = (by[k] || 0) + Math.max(0, before - e.hp);
    return r;
  };
  return by;
};
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} ≉ ${b}`);
const burnLeft = (e, k = 'p_ignicion:burn') => { const d = e._dots?.[k]; return d ? d.per * d.left : 0; };
const castAt = (h, slot, id, x, z, sec = 0.5) => { h.setSlot(slot, id); h.aim(x, z); const ok = h.cast(slot); h.step(sec); return ok; };

// ================================================ CLASE
{ // c2 Barrera de Maná + c7 Escudo Prismático
  const h = mk('arcanista', {}, { cls: { c1: 2, c2: 1, c7: 2 } });
  const dr0 = h.p.stats.dr;
  assert.ok(castAt(h, 'k2', 'm_t_barrera', 2, 0, 0.1));
  const s = h.p.shields.find(x => x.src === 'm_t_barrera');
  assert.ok(s && s.amt >= Math.round(0.3 * h.p.stats.maxMP) - 1, 'escudo = 30 % del maná máximo');
  assert.equal(h.p.stats.dr, dr0 + 20, 'Escudo Prismático: −20 % de daño mientras dura');
  h.p.absorbShields(1e9);                                  // se rompe
  h.step(0.4);
  assert.ok(!h.p.buffs.some(b => b.id === 'm_t_barrera_dr'), 'el −% se va con el escudo');
  assert.equal(h.p.stats.dr, dr0);
}
{ // c3 Parpadeo (tipo genérico blink)
  const h = mk('arcanista', {}, { cls: { c1: 2, c3: 1 } });
  assert.ok(castAt(h, 'k1', 'm_t_parpadeo', 20, 0, 0.1));
  near(h.p.pos.x, 8, 0.4, 'Parpadeo: 8 m hacia el cursor');
}
{ // c5A Contrahechizo
  const h = mk('arcanista', {}, { cls: { c5: 1 }, choice: { c5: 'A' } });
  const e = h.enemy({ hp: 1e5, pos: [6, 0, 0] });
  let ran = false;
  e.beginCast('invocar', 2, () => { ran = true; });
  assert.ok(castAt(h, 'k2', 'm_t_contrahechizo', 6, 0, 0.1));
  assert.ok(!e.casting && e.silenceT > 2.5, 'interrumpe y silencia 3 s');
  h.step(2.5); assert.ok(!ran, 'el lanzamiento interrumpido no sale');
  const b = mk('arcanista', {}, { cls: { c5: 1 }, choice: { c5: 'A' } });
  const boss = b.enemy({ hp: 1e6, boss: true, pos: [5, 0, 0] });
  castAt(b, 'k2', 'm_t_contrahechizo', 5, 0, 0.1);
  near(boss.stagger, 20, 0.01, 'jefe: +20 de stagger');
  const n = mk('arcanista', {}, { cls: { c5: 1 }, choice: { c5: 'A' } });
  castAt(n, 'k2', 'm_t_contrahechizo', 5, 0, 0.1);
  assert.equal(n.p.cds.m_t_contrahechizo || 0, 0, 'sin objetivo no gasta el enfriamiento');
}
{ // c5B Ralentizar
  const h = mk('piromante', {}, { cls: { c5: 1 }, choice: { c5: 'B' } });
  const e = h.enemy({ hp: 1e6, pos: [4, 0, 0] });
  castAt(h, 'rmb', 'bola_fuego', 4, 0, 1.0);
  assert.ok(e.slowT > 2.5 && e.slowPct === 50, 'el siguiente hechizo ralentiza 50 % 4 s');
  e.slowT = 0; e.slowPct = 0;
  h.step(1);
  castAt(h, 'rmb', 'bola_fuego', 4, 0, 1.0);
  assert.ok(!(e.slowT > 0), 'no otra vez hasta pasados 8 s');
  h.step(7);
  castAt(h, 'rmb', 'bola_fuego', 4, 0, 1.0);
  assert.ok(e.slowT > 2.5, 'a los 8 s vuelve a estar listo');
}
{ // c15 Aura de Intelecto (grupo)
  const base = mk('arcanista');
  const h = mk('arcanista', {}, { cls: { c15: 1 } });
  near(h.p.stats.mpPct, base.p.stats.mpPct + 10, 1e-9, '+10 % de maná máximo propio');
  near(h.p.stats.dmgPct, base.p.stats.dmgPct + 5, 1e-9, '+5 % de daño propio');
  const mkAlly = (x) => ({ pos: h.p.pos.clone().set(x, 0, 0), alive: true, hp: 100, stats: { maxHP: 100 }, buffs: [],
    addBuff(id, stats, dur) { this.buffs = this.buffs.filter(b => b.id !== id); this.buffs.push({ id, stats, t: dur, dur }); } });
  const cerca = mkAlly(6), lejos = mkAlly(30);
  h.g.party = [cerca, lejos];
  h.tick(1);
  assert.ok(cerca.buffs.some(b => b.id === 'm_aura_intelecto' && b.stats.dmgPct === 5 && b.stats.mpPct === 10), 'aliado a 15 m: aura');
  assert.ok(!lejos.buffs.length, 'aliado lejos: nada');
}
{ // c12A Inversión del Tiempo
  const h = mk('arcanista', {}, { cls: { c12: 1 }, choice: { c12: 'A' } });
  castAt(h, 'k2', 'm_t_inversion', 2, 0, 0.1);
  assert.equal(h.p.cds.m_t_inversion || 0, 0, 'sin historial no gasta el enfriamiento');
  assert.ok(h.messages().some(m => /Inversión del Tiempo/.test(m)));
  h.p.hp = h.p.stats.maxHP;
  h.tick(2);
  h.p.pos.set(6, 0, 0); h.p.hp = h.p.stats.maxHP * 0.3;
  h.tick(4.5);
  castAt(h, 'k2', 'm_t_inversion', 2, 0, 0.1);
  assert.ok(h.p.pos.x < 0.5, 'vuelve a la posición de hace 5 s');
  assert.ok(h.p.hp > h.p.stats.maxHP * 0.9, 'y a la vida de hace 5 s');
  assert.ok(h.p.cds.m_t_inversion > 50, 'enfriamiento 60 s');
}
{ // c12B Bloque de Hielo
  const h = mk('arcanista', {}, { cls: { c12: 1 }, choice: { c12: 'B' } });
  const e = h.enemy({ hp: 1e6, pos: [3, 0, 0] });
  assert.ok(castAt(h, 'k2', 'm_t_bloque', 2, 0, 0.1));
  assert.ok(h.p.invulnT > 3.5, 'inmune 4 s');
  const hp = h.p.hp;
  h.p.takeDamage(500, 1, { source: e });
  assert.equal(h.p.hp, hp, 'no recibe daño');
  h.p.pos.x = 3; h.step(0.1);
  assert.ok(Math.abs(h.p.pos.x) < 0.01, 'no puede moverse');
  h.setSlot('rmb', 'rayo'); h.aim(3, 0);
  assert.equal(h.cast('rmb'), false, 'no puede atacar');
  h.step(4.1);
  assert.ok(!(h.p.castLock > 0), 'al terminar vuelve a actuar');
  h.p.cds.m_t_bloque = 0;
  castAt(h, 'k2', 'm_t_bloque', 2, 0, 0.1);
  h.p.dodge(); h.step(0.1);
  assert.ok(!h.p._mgBlock && !(h.p.invulnT > 0), 'la esquiva rompe el hielo antes');
}

// ================================================ PIROMANTE
{ // s0 Ignición: Quemadura del 60 % en 4 s, sin apilar; Calor +5
  const h = mk('piromante');
  const e = h.enemy({ hp: 1e6, pos: [3, 0, 0] });
  h.hit(e, { skill: 'bola_fuego', elem: 'fire', dealt: 100 });
  near(burnLeft(e), 60, 2, 'Quemadura = 60 % del golpe');
  assert.equal(e._dots['p_ignicion:burn'].left, 4, '4 tics de 1 s');
  assert.ok(h.gaugeValue('calor') >= 5, 'genera Calor');
  h.hit(e, { skill: 'bola_fuego', elem: 'fire', dealt: 50 });
  near(burnLeft(e), 30, 2, 'no se apila: la nueva sustituye a la anterior');
  h.hit(e, { skill: 'bola_fuego', elem: 'fire', dealt: 200 });
  near(burnLeft(e), 120, 2, 'y renueva su duración');
  h.hit(e, { skill: 'rayo', elem: 'arcane', dealt: 500 });
  near(burnLeft(e), 120, 2, 'solo el Fuego quema');
  const hp = e.hp; h.tick(4.2);
  assert.ok(hp - e.hp >= 110 && !e._dots['p_ignicion:burn'], 'arde y se apaga');
}
{ // claves tv de la Piromante (anfitrión p_ignicion): s5, s8, s12, s15, s16, x2
  const h = mk('piromante', { s5: 3, s8: 2, s12: 2, s15: 2, s16: 2, x2: 2 });
  const e = h.enemy({ hp: 1e6, pos: [3, 0, 0] });
  assert.equal(firePower('condCrit', h.p, h.p, e, { elem: 'fire' }), 0);
  h.hit(e, { skill: 'bola_fuego', elem: 'fire', dealt: 100 });
  assert.equal(firePower('condCrit', h.p, h.p, e, { elem: 'fire' }), 12, 's5: +12 % de crítico contra enemigos en llamas');
  e.pyroBurst = true;
  assert.equal(firePower('condAdd', h.p, h.p, e, { elem: 'fire' }), 30, 'x2: +30 % de Fuego contra los que ya estallaron');
  assert.equal(firePower('condAdd', h.p, h.p, e, { elem: 'arcane' }), 0);
  // s12 Pirotecnia (no a las definitivas)
  Object.assign(h.p.cds, { bola_fuego: 1.5, meteoro: 6, m_u_supernova: 50 });
  h.hit(e, { skill: 'bola_fuego', elem: 'fire', dealt: 100, crit: true });
  near(h.p.cds.bola_fuego, 0.5, 1e-9, 's12: −1 s por crítico'); near(h.p.cds.meteoro, 5, 1e-9, 's12');
  assert.equal(h.p.cds.m_u_supernova, 50, 's12: la definitiva no');
  // s8 / s15 al matar a un enemigo en llamas
  const v = h.enemy({ hp: 50, pos: [2, 0, 0] });
  h.hit(v, { skill: 'bola_fuego', elem: 'fire', dealt: 10 });
  h.p.hp = h.p.stats.maxHP * 0.5; h.p.mp = 10;
  const hp0 = h.p.hp;
  v.takeDamage(1e6, false, { skill: 'rayo' });
  assert.ok(h.p.hp > hp0, 's8: cura (sustento)');
  near(h.p.mp, 16, 1e-6, 's15: +6 de maná');
  // s16: la Quemadura de Supernova un 100 % más fuerte (quemadura extra)
  h.g.applyDoT(e, 600, 6, 1, undefined, 'm_u_supernova:burn');
  firePower('afterCast', h.p, h.g, h.p, { sk: { id: 'm_u_supernova' } }, { hits: 1, dealt: 1, killed: 0 });
  near(burnLeft(e, 'm_u_supernova:burn'), 1200, 6, 's16: Quemadura de Supernova un 100 % más fuerte');
  firePower('afterCast', h.p, h.g, h.p, { sk: { id: 'm_u_supernova' } }, { hits: 1, dealt: 1, killed: 0 });
  near(burnLeft(e, 'm_u_supernova:burn'), 1200, 6, 's16: una sola vez por Quemadura');
}
{ // s0 Llamarada (insignia): detona (consume) el 60 % de las Quemaduras; s4 Avivada 100 % y +25 Calor
  for (const [sp, pct] of [[{}, 60], [{ s4: 1 }, 100]]) {
    const h = mk('piromante', sp);
    const e = h.enemy({ hp: 1e6, pos: [3, 0, 0] });
    h.hit(e, { skill: 'bola_fuego', elem: 'fire', dealt: 100 });
    const by = track(e);
    const c0 = h.gaugeValue('calor');
    assert.ok(castAt(h, 'k3', 'p_llamarada', 3, 0, 0.4), 'Llamarada se lanza');
    near(by['power:p_llamarada'] || 0, 60 * pct / 100, 2, `detona el ${pct} %`);
    assert.ok((by.p_llamarada || 0) > 0, 'y el cono golpea');
    assert.ok(e._dots['p_ignicion:burn'], 'el cono vuelve a encenderlo');
    if (pct === 100) assert.ok(h.gaugeValue('calor') - c0 >= 25, 's4: +25 de Calor');
  }
}
{ // s9 Combustión: Fuego siempre crítico y Calor doble
  const h = mk('piromante', { s9: 1 });
  assert.ok(castAt(h, 'k3', 'p_combustion', 2, 0, 0.1));
  assert.ok(h.p.buffs.some(b => b.id === 'p_combustion'));
  assert.equal(resolveSkill(h.p, h.p.cls.skills.find(s => s.id === 'bola_fuego')).forceCrit, true, 'Fuego siempre crítico');
  assert.equal(resolveSkill(h.p, h.p.cls.skills.find(s => s.id === 'rayo')).forceCrit, false);
  const c0 = h.gaugeValue('calor');
  gainGauge(h.p, 'calor', 5);
  near(h.gaugeValue('calor') - c0, 10, 1e-9, 'el Calor se llena el doble');
  h.step(10.2);
  assert.equal(resolveSkill(h.p, h.p.cls.skills.find(s => s.id === 'bola_fuego')).forceCrit, false, 'dura 10 s');
}
{ // s13B Muro de Fuego: quema y bloquea el paso (no a los jefes)
  const h = mk('piromante', { s13: 1 }, { choice: { s13: 'B' } });
  const e = h.enemy({ hp: 1e6, pos: [3, 0, 0] });
  const boss = h.enemy({ hp: 1e6, boss: true, pos: [3, 0, 2] });
  assert.ok(castAt(h, 'k2', 'p_muro_fuego', 5, 0, 0.1));
  const f = h.g.fields.find(x => x.kind === 'p_muro_fuego');
  assert.ok(f && f.t > 4.5, 'muro de 5 s');
  e.pos.x = 5.1; boss.pos.x = 5.1;
  h.step(0.05);
  assert.ok(e.pos.x < 4.2, 'bloquea al que intenta cruzar');
  assert.ok(boss.pos.x > 5, 'los jefes pasan');
  const hp = e.hp; h.tick(1.1);
  assert.ok(e.hp < hp, 'quema a quien está pegado al muro');
}
{ // s6A Propagación
  const h = mk('piromante', { s6: 1 }, { choice: { s6: 'A' } });
  const v = h.enemy({ hp: 1000, pos: [3, 0, 0] });
  const a = h.enemy({ hp: 1e6, pos: [4, 0, 0] }), b = h.enemy({ hp: 1e6, pos: [3, 0, 1.5] }), c = h.enemy({ hp: 1e6, pos: [6.5, 0, 0] });
  h.hit(v, { skill: 'bola_fuego', elem: 'fire', dealt: 100 });
  v.takeDamage(1e6, false, { skill: 'rayo' });
  assert.ok(burnLeft(a) > 50 && burnLeft(b) > 50, 'la Quemadura salta a los 2 más cercanos');
  assert.equal(burnLeft(c), 0, 'solo a 2');
}
{ // s6B Concentración: hasta 3 Quemaduras
  const h = mk('piromante', { s6: 1 }, { choice: { s6: 'B' } });
  const e = h.enemy({ hp: 1e6, pos: [3, 0, 0] });
  for (const d of [100, 100, 100, 200]) h.hit(e, { skill: 'bola_fuego', elem: 'fire', dealt: d });
  const keys = Object.keys(e._dots).filter(k => k.startsWith('p_ignicion'));
  assert.equal(keys.length, 3, '3 pilas');
  near(keys.reduce((s, k) => s + burnLeft(e, k), 0), 60 + 60 + 120, 4, 'la 4.ª sustituye a la más débil');
}
{ // s13A Fénix
  const h = mk('piromante', { s13: 1 }, { choice: { s13: 'A' } });
  h.p.takeDamage(1e9, 1, {});
  assert.ok(h.p.alive && Math.abs(h.p.hp - h.p.stats.maxHP * 0.5) < 1, 'renace con el 50 % de vida');
  h.step(1.2);
  h.p.takeDamage(1e9, 1, {});
  assert.ok(!h.p.alive && h.g.dead, 'una vez cada 2 minutos');
}
{ // x1 Corazón del Sol: al terminar, la Quemadura explota con el 40 % de su total
  const h = mk('piromante', { x1: 1 });
  const e = h.enemy({ hp: 1e6, pos: [3, 0, 0] }), o = h.enemy({ hp: 1e6, pos: [4, 0, 0] });
  const by = track(o);
  h.hit(e, { skill: 'bola_fuego', elem: 'fire', dealt: 100 });
  h.tick(0.3);
  assert.ok(!e.pyroBurst);
  h.tick(4.2);
  assert.ok(e.pyroBurst, 'estalló');
  near(by['power:p_corazon_sol'] || 0, 24, 2, '40 % del total (60) a los cercanos');
  // Llamarada la consume: no estalla
  const h2 = mk('piromante', { x1: 1 });
  const e2 = h2.enemy({ hp: 1e6, pos: [3, 0, 0] });
  h2.hit(e2, { skill: 'bola_fuego', elem: 'fire', dealt: 100 });
  h2.tick(0.3);
  h2.g.timers.cancel(e2._dots['p_ignicion:burn'].timer); delete e2._dots['p_ignicion:burn']; delete e2._mgBurns['p_ignicion:burn'];
  h2.tick(1); assert.ok(!e2.pyroBurst, 'una quemadura consumida no estalla');
}
{ // x3 Nova Solar: cada 20 explosiones (aquí Conflagración), Supernova sola y gratis
  const h = mk('piromante', { s14: 1, x3: 1 });
  const v = h.enemy({ hp: 100, pos: [4, 0, 0] });
  const o = h.enemy({ hp: 1e7, pos: [5, 0, 0] });
  const by = track(o);
  h.p.hotbar.k4 = null;
  powerState(h.p, 'p_nova_solar').n = 19;
  v.takeDamage(1e6, false, { skill: 'rayo' });
  h.step(1.6);
  assert.ok((by.m_u_supernova || 0) > 0, 'Supernova se lanza sola');
  assert.equal(h.p.cds.m_u_supernova || 0, 0, 'gratis: sin enfriamiento');
  assert.equal(h.p.hotbar.k4, null, 'la barra queda como estaba');
  assert.equal(powerState(h.p, 'p_nova_solar').n, 0);
}

// ================================================ CRIONTE
{ // s0 Prisión de Hielo (insignia) y s4 Prisión Profunda
  for (const [sp, fr, st] of [[{}, 2, 20], [{ s4: 1 }, 3, 35]]) {
    const h = mk('crionte', sp);
    const e = h.enemy({ hp: 1e6, pos: [5, 0, 0] });
    const boss = h.enemy({ hp: 1e9, boss: true, pos: [6, 0, 0] });
    assert.ok(castAt(h, 'k3', 'k_prision', 5, 0, 0.3), 'Prisión se lanza');
    near(e.frozenT, fr - 0.18, 0.1, `Congelado ${fr} s`);
    assert.ok(boss.numbT > 3.5 && !(boss.frozenT > 0), 'jefe: Aterido, no congelado');
    assert.ok(boss.stagger >= st * 1.25 && boss.stagger < st * 1.25 + 2, `jefe: ${st} de stagger (× innata 25 %)`);
  }
}
{ // s6B Témpano: la Nova empuja 3 m (y aturde 1 s por su mod)
  const h = mk('crionte', { s6: 1 }, { choice: { s6: 'B' } });
  const e = h.enemy({ hp: 1e6, pos: [1.5, 0, 0] });
  castAt(h, 'rmb', 'nova_hielo', 2, 0, 0.1);
  assert.ok(e.pos.x > 4, `empujado 3 m (${e.pos.x.toFixed(2)})`);
}
{ // s7 Carámbanos: el Dardo pasa a Escarcha y suma capas
  const h = mk('crionte', { s7: 1 });
  assert.equal(resolveSkill(h.p, h.p.cls.skills.find(s => s.id === 'm_dardo')).elem, 'frost');
  const e = h.enemy({ hp: 1e6, pos: [3, 0, 0] });
  h.aim(3, 0); h.cast('lmb'); h.step(0.6);
  assert.ok(h.gaugeValue('escarcha', e) >= 1, 'el dardo suma 1 capa');
}
{ // s8 Coraza de Escarcha: −5 %/rango y capa al atacante cuerpo a cuerpo
  const base = mk('crionte');
  const h = mk('crionte', { s8: 2 });
  assert.equal(h.p.stats.dr, base.p.stats.dr + 10);
  const e = h.enemy({ hp: 1e6, pos: [1, 0, 0] });
  h.p.takeDamage(5, 1, { melee: true, source: e });
  assert.equal(h.gaugeValue('escarcha', e), 1, 'quien te golpea cuerpo a cuerpo gana 1 capa');
  h.p.takeDamage(5, 1, { melee: false, source: e });
  assert.equal(h.gaugeValue('escarcha', e), 1);
}
{ // s9 Lanza de Hielo: ×3 a los Congelados y los astilla (estallido de 3 m)
  const h = mk('crionte', { s9: 1 });
  const e = h.enemy({ hp: 1e7, pos: [4, 0, 0] }), o = h.enemy({ hp: 1e7, pos: [4.5, 0, 2] });
  const byE = track(e), byO = track(o);
  e.applyCC('freeze', 3, { src: h.p });
  assert.ok(castAt(h, 'k2', 'k_lanza', 4, 0, 1.0), 'Lanza se lanza');
  near(byE['power:k_lanza'], 2 * byE.k_lanza, byE.k_lanza * 0.02 + 2, 'triple de daño (+200 %)');
  assert.ok(byO['power:k_lanza'] > 0, 'el estallido golpea en 3 m');
  const h2 = mk('crionte', { s9: 1 });
  const f = h2.enemy({ hp: 1e7, pos: [4, 0, 0] });
  const byF = track(f);
  castAt(h2, 'k2', 'k_lanza', 4, 0, 1.0);
  assert.ok(byF.k_lanza > 0 && !byF['power:k_lanza'], 'sin congelar, golpe normal');
}
{ // s6A Ventisca: daño y +1 capa por segundo
  const h = mk('crionte', { s6: 1 }, { choice: { s6: 'A' } });
  const e = h.enemy({ hp: 1e7, pos: [5, 0, 0] });
  const hp = e.hp;
  assert.ok(castAt(h, 'k3', 'k_ventisca', 5, 0, 0.1));
  h.tick(2.1);
  assert.ok(h.gaugeValue('escarcha', e) >= 2, '+1 capa por segundo');
  assert.ok(e.hp < hp, 'daño por segundo');
}
{ // s13B Aliento Boreal: empuja 4 m y deja 3 capas
  const h = mk('crionte', { s13: 1 }, { choice: { s13: 'B' } });
  const e = h.enemy({ hp: 1e7, pos: [2, 0, 0] });
  assert.ok(castAt(h, 'k2', 'k_aliento', 3, 0, 0.1));
  assert.equal(h.gaugeValue('escarcha', e), 3, '3 capas');
  assert.ok(e.pos.x > 5.5, 'empujado 4 m');
}
{ // s13A Tumba Glacial: el que muere Congelado deja un bloque que corta el paso 4 s
  const h = mk('crionte', { s13: 1 }, { choice: { s13: 'A' } });
  const v = h.enemy({ hp: 100, pos: [4, 0, 0] });
  v.applyCC('freeze', 2, { src: h.p });
  v.takeDamage(1e6, false, { skill: 'nova_hielo' });
  const f = h.g.fields.find(x => x.kind === 'k_tumba');
  assert.ok(f && f.t > 3.9, 'bloque de hielo 4 s');
  const o = h.enemy({ hp: 1e6, pos: [4.1, 0, 0] });
  h.step(0.05);
  assert.ok(Math.hypot(o.pos.x - 4, o.pos.z) >= 1.2, 'corta el paso');
}
{ // s14 Reacción Glacial: cada astillamiento (Cero Absoluto) suma 2 capas en 4 m
  const h = mk('crionte', { s14: 1 });
  const e = h.enemy({ hp: 100, pos: [3, 0, 0] }), o = h.enemy({ hp: 1e6, pos: [4.5, 0, 0] });
  e.applyCC('freeze', 2, { src: h.p }); e.hp = 10;
  h.hit(e, { skill: 'm_toque', elem: 'frost', dealt: 1 });
  assert.ok(!e.alive, 'astillado');
  assert.equal(h.gaugeValue('escarcha', o), 2, '+2 capas al vecino');
}
{ // s17 Frío Implacable: los Ateridos atacan un 15 % más lento (y +8 %/rango contra élites)
  const h = mk('crionte', { s17: 2 });
  assert.equal(h.p.tv.eliteDmg, 16);
  const e = h.enemy({ hp: 1e6, boss: true, pos: [3, 0, 0] });
  e.numbT = 4; e.atkCd = 1;
  h.tick(1);
  near(e.atkCd, 1.15, 0.011, 'su recarga de ataque avanza un 15 % más lenta');
}
{ // x1 Invierno Eterno + x2 Glaciación
  const h = mk('crionte', { x1: 1, x2: 2 });
  const e = h.enemy({ hp: 1e7, pos: [2, 0, 0] });
  castAt(h, 'rmb', 'nova_hielo', 2, 0, 0.1);
  assert.ok(h.g.fields.some(f => f.kind === 'k_campo_helado' && f.t > 5.5), 'campo helado de 6 s');
  const l0 = h.gaugeValue('escarcha', e);
  h.tick(1.1);
  assert.ok(e.slowPct === 50 && e.slowT > 0, 'ralentiza un 50 %');
  assert.equal(e.debuffs.k_glaciacion?.pct, 16, 'x2: +16 % de daño recibido dentro');
  assert.ok(h.gaugeValue('escarcha', e) > l0 || e.frozenT > 0, '+1 capa por segundo');
}
{ // x3 Edad de Hielo: cada 15 astillamientos, Prisión sola y gratis sobre el grupo
  const h = mk('crionte', { x3: 1 });
  const e = h.enemy({ hp: 100, pos: [3, 0, 0] });
  const g1 = h.enemy({ hp: 1e7, pos: [8, 0, 0] }), g2 = h.enemy({ hp: 1e7, pos: [8.5, 0, 1] });
  h.p.hotbar.k3 = null;
  powerState(h.p, 'k_ice_age').n = 14;
  e.applyCC('freeze', 2, { src: h.p }); e.hp = 10;
  h.hit(e, { skill: 'm_toque', elem: 'frost', dealt: 1 });
  h.step(0.3);
  assert.ok(g1.frozenT > 1.5 && g2.frozenT > 1.5, 'Prisión de Hielo sobre el grupo');
  assert.equal(h.p.cds.k_prision || 0, 0, 'gratis');
  assert.equal(h.p.hotbar.k3, null);
}
{ // s15 Mente Gélida por la ruta EXACTA s1→s3→s6A→s9→s12→s15 (ningún otro poder de Crionte)
  const route = { s1: 3, s3: 2, s6: 1, s9: 1, s12: 2, s15: 2 };
  const h = mk('crionte', route, { choice: { s6: 'A' } });
  const own = [...h.p.powers].filter(id => /^k_/.test(id));
  assert.deepEqual(own, ['k_shatter_chain'], 'por esta ruta solo está el poder que lleva s15');
  const v = h.enemy({ hp: 50, pos: [3, 0, 0] });
  h.p.mp = 10;
  v.takeDamage(1e6, false, { skill: 'rayo' });
  near(h.p.mp, 16, 1e-6, 's15: +6 de maná por enemigo abatido');
  // astillado (Cero Absoluto) también cuenta, y SIN s14 no hay Reacción Glacial
  const e = h.enemy({ hp: 100, pos: [3, 0, 0] }), o = h.enemy({ hp: 1e6, pos: [4.5, 0, 0] });
  e.applyCC('freeze', 2, { src: h.p }); e.hp = 10;
  h.p.mp = 10;
  h.hit(e, { skill: 'm_toque', elem: 'frost', dealt: 1 });
  assert.ok(!e.alive, 'astillado');
  near(h.p.mp, 16, 1e-6, 's15: +6 de maná por enemigo astillado');
  assert.equal(h.gaugeValue('escarcha', o), 0, 'sin s14, el astillamiento no suma capas');
}
{ // s16 Nova Perpetua por la ruta s1→s2→s4→s6A→s9→s12→s13B→s16 (sin otro poder de Crionte)
  const route = { s1: 3, s2: 2, s4: 1, s6: 1, s9: 1, s12: 2, s13: 1, s16: 2 };
  const h = mk('crionte', route, { choice: { s6: 'A', s13: 'B' } });
  assert.deepEqual([...h.p.powers].filter(id => /^k_/.test(id)).sort(), ['k_eternal_winter', 'k_prision_profunda']);
  const e = h.enemy({ hp: 1e7, pos: [1.5, 0, 0] });
  castAt(h, 'rmb', 'nova_hielo', 2, 0, 0.1);
  assert.ok(h.g.fields.some(f => f.kind === 'estela' && f.data?.skill === 'nova_hielo'), 's16: suelo helado de la Nova');
  assert.ok(!h.g.fields.some(f => f.kind === 'k_campo_helado'), 'sin x1 no hay campo de Invierno Eterno');
  h.tick(3.4);
  assert.ok(e.slowT > 0, 's16: el suelo helado ralentiza cuando acaba el ralentizar de la Nova');
  const n = mk('crionte', { s1: 3, s2: 2, s4: 1, s6: 1, s9: 1, s12: 2, s13: 1 }, { choice: { s6: 'A', s13: 'B' } });
  const f = n.enemy({ hp: 1e7, pos: [1.5, 0, 0] });
  castAt(n, 'rmb', 'nova_hielo', 2, 0, 0.1);
  n.tick(3.4);
  assert.ok(!(f.slowT > 0), 'sin s16, a los 3,4 s ya no está ralentizado');
}
{ // ningún nodo con efecto propio depende de OTRO poder: por cada nodo con `power`, el
  // árbol con SOLO ese nodo (y la clave gratis) lo deja en p.powers
  for (const s of TALENT_TREES.maga.specs) {
    for (const n of s.nodes) {
      for (const o of n.t === 'c' ? n.opts : [{ k: null, fx: n.fx }]) {
        if (!o.fx?.power || n.free) continue;
        const h = mk(s.id, { [n.id]: 1 }, { choice: o.k ? { [n.id]: o.k } : {} });
        assert.ok(h.p.powers.has(o.fx.power), `${s.id}/${n.id}${o.k || ''}: ${o.fx.power} activo con su nodo`);
      }
    }
  }
}

// ================================================ ARCANISTA
{ // s0 Orbe Arcano: atraviesa y rebota 2 veces · s4 Orbe Resonante (máx. 2 Cargas)
  const h = mk('arcanista', { s4: 1 });
  const es = [3, 4, 5].map(x => h.enemy({ hp: 1e7, pos: [x, 0, 0] }));
  const bys = es.map(track);
  assert.ok(castAt(h, 'k3', 'a_orbe', 8, 0, 0.1));
  h.step(2.0);
  assert.ok(bys.every(b => b.a_orbe > 0), 'atraviesa a todos');
  assert.equal(h.gaugeValue('cargas'), 2, 's4: 1 Carga por enemigo, máx. 2');
  const one = bys[0].a_orbe;
  h.step(6.5);
  assert.ok(bys[0].a_orbe > one * 1.5, 'el rebote vuelve a golpear');
}
{ // s6A Misiles Arcanos: 6 misiles; cada uno devuelve 1 % de maná (sin maná infinito)
  const h = mk('arcanista', { s6: 1 }, { choice: { s6: 'A' } });
  const e = h.enemy({ hp: 1e7, pos: [4, 0, 0] });
  const by = track(e);
  h.p.mp = 100;
  assert.ok(castAt(h, 'k2', 'a_misiles', 4, 0, 2.3));
  assert.ok(by.a_misiles > 0);
  const per = h.p.stats.maxMP * 0.01;
  assert.ok(6 * per < 30, 'devuelve menos de lo que cuesta');
  assert.ok(h.p.mp > 100 - 30 + 6 * per - 1, '6 × 1 % de maná');
}
{ // s8 Piel de Maná: el −% solo con más del 50 % de maná
  const base = mk('arcanista');
  const h = mk('arcanista', { s8: 2 });
  assert.equal(h.p.stats.dr, base.p.stats.dr + 10);
  assert.equal(firePower('condDr', h.p, h.p, { amount: 10 }), 0, 'maná lleno: −10 %');
  h.p.mp = h.p.stats.maxMP * 0.3;
  assert.equal(firePower('condDr', h.p, h.p, { amount: 10 }), -10, 'maná ≤ 50 %: nada');
}
{ // s9 Sello del Archimago: +4 Cargas; guarda el 25 % y estalla al expirar
  const h = mk('arcanista', { s9: 1 });
  const e = h.enemy({ hp: 1e7, pos: [4, 0, 0] }), o = h.enemy({ hp: 1e7, pos: [5, 0, 0] });
  const by = track(o);
  assert.ok(castAt(h, 'k3', 'a_sello', 4, 0, 0.1));
  assert.equal(h.gaugeValue('cargas'), 4, '+4 Cargas');
  e.takeDamage(10000, false, { skill: 'rayo' });
  h.step(8.2);
  near(by['power:a_sello'] || 0, 2500, 30, 'estalla con el 25 % guardado');
}
{ // s11 Claridad: descargar 4 Cargas → Rayo gratis (con la tirada a favor)
  const h = mk('arcanista', { s11: 2 });
  h.p.combatRng = () => 0;
  const rayo = h.p.cls.skills.find(s => s.id === 'rayo');
  const cost = resolveSkill(h.p, rayo).cost;
  setGauge(h.p, 'cargas', 4); spendGauge(h.p, 'cargas', 4);
  assert.equal(resolveSkill(h.p, rayo).cost, 0, 'siguiente Rayo gratis');
  h.enemy({ hp: 1e7, pos: [4, 0, 0] });
  const mp = h.p.mp;
  castAt(h, 'rmb', 'rayo', 4, 0, 0.05);
  assert.ok(h.p.mp >= mp - 1e-6, 'no cobra');
  assert.equal(resolveSkill(h.p, rayo).cost, cost, 'se consume');
}
{ // s13A Evocación: canaliza 3 s y recupera el 60 % del maná
  const h = mk('arcanista', { s13: 1 }, { choice: { s13: 'A' } });
  h.p.mp = 0;
  assert.ok(castAt(h, 'k2', 'a_evocacion', 2, 0, 3.1));
  assert.ok(h.p.mp >= h.p.stats.maxMP * 0.6 - 1, '60 % del maná');
  assert.ok(h.p.mp < h.p.stats.maxMP * 0.75, 'no más');
}
{ // s14 Resonancia: con 4 Cargas, +15 % de crítico Arcano y no se desvanecen
  const h = mk('arcanista', { s14: 1 });
  const e = h.enemy({ hp: 1e6, pos: [3, 0, 0] });
  h.gauge('cargas', 4);
  assert.equal(firePower('condCrit', h.p, h.p, e, { elem: 'arcane' }), 15);
  assert.equal(firePower('condCrit', h.p, h.p, e, { elem: 'fire' }), 0);
  h.tick(8);
  assert.equal(h.gaugeValue('cargas'), 4, 'las Cargas no se desvanecen');
  const n = mk('arcanista');
  n.gauge('cargas', 4); n.tick(7);
  assert.equal(n.gaugeValue('cargas'), 0, 'sin Resonancia, sí');
}
{ // s15 Sobretensión: con 4 Cargas, el Dardo atraviesa
  const h = mk('arcanista', { s15: 1 });
  const dardo = h.p.cls.skills.find(s => s.id === 'm_dardo');
  assert.equal(resolveSkill(h.p, dardo).pierce, false);
  h.gauge('cargas', 4);
  assert.equal(resolveSkill(h.p, dardo).pierce, true, 'atraviesa con 4 Cargas');
  h.gauge('cargas', 0);
  assert.equal(resolveSkill(h.p, dardo).pierce, false);
}
{ // x1 Cadena de Rayos · x2 Arco Eterno
  const h = mk('arcanista', { x1: 1, x2: 2 });
  h.p.combatRng = () => 0;
  const e = h.enemy({ hp: 1e7, pos: [4, 0, 0] });
  const os = [[5, 0], [4, 2], [6, 1], [9.5, 0]].map(([x, z]) => h.enemy({ hp: 1e7, pos: [x, 0, z] }));
  const bys = os.map(track);
  h.hit(e, { skill: 'rayo', crit: true, dealt: 200 });
  assert.deepEqual(bys.map(b => Math.round(b['power:a_chain_crit'] || 0)), [100, 100, 100, 0], 'salta a 3 con el 50 %');
  h.hit(e, { skill: 'rayo', crit: true, dealt: 200 });
  assert.equal(Math.round(bys[0]['power:a_chain_crit']), 100, 'una cadena por Rayo');
  firePower('afterCast', h.p, h.g, h.p, { sk: { id: 'rayo' } }, { hits: 1, dealt: 1, killed: 0 });
  assert.equal(h.gaugeValue('cargas'), 3, 'x2: cada salto da 1 Carga (al terminar el Rayo)');
  const solo = mk('arcanista', { x1: 1 });
  const s = solo.enemy({ hp: 1e7, pos: [4, 0, 0] });
  const byS = track(s);
  solo.hit(s, { skill: 'rayo', crit: true, dealt: 200 });
  near(byS['power:a_chain_crit'], 200, 2, 'solo: lo golpea dos veces');
  solo.hit(s, { skill: 'rayo', crit: false, dealt: 200 });
}
{ // x3 Singularidad: +15 % de daño recibido 6 s, hasta 2 veces
  const h = mk('arcanista', { x3: 1 });
  const e = h.enemy({ hp: 1e7, pos: [4, 0, 0] });
  h.hit(e, { skill: 'rayo', dealt: 10 });
  for (const want of [15, 30, 30]) {
    setGauge(h.p, 'cargas', 4); spendGauge(h.p, 'cargas', 4);
    assert.equal(e.debuffs.a_singularity?.pct, want, `Singularidad ${want}`);
  }
  h.tick(6.2);
  assert.ok(!e.debuffs.a_singularity, 'dura 6 s');
}

// ------------------------------------------------ todas las activas: un lanzamiento real que no rompe
const behaviors = magaSkillBehaviors();
for (const sk of TALENT_TREES.maga.skills) if (sk.behavior) assert.ok(behaviors[sk.behavior], `${sk.id}: comportamiento propio`);
console.log('✅ PODERES Y ACTIVAS DE TALENTO DE LA MAGA OK');
