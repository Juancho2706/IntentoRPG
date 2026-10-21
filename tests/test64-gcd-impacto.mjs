// Paso 2b.0 — canal de lanzamiento (js/game-skills.js, §4.4 y §9.1)
//  1) GCD de 0,2 s entre gastadoras; la movilidad y el básico quedan fuera
//  2) WINDUP: la esquiva lo cancela SIN cobrar el coste; el coste se cobra al soltar el golpe
//  3) IMPACTO sincronizado: el daño de área llega con el VFX (impactDelay; Meteoro 0,6 s)
//  4) los proyectiles TIRAN EL DAÑO AL IMPACTAR (bonos condicionados al objetivo real)
//  5) canalización por ticks del planificador: soltar / esquivar / golpe > 10 % la cortan
//  6) tipos genéricos: cone · line · leap · dash · blink · shield · taunt · zone · trap · mark · buff
//  7) ⑦ onCast puede cancelar sin coste; afterCast recibe el CastResult
import assert from 'node:assert/strict';
import { CLASSES } from '../js/data.js';
import { normalizeSkillDef } from '../js/skill-defs.js';
import { definePower } from '../js/powers.js';
import { GCD, resolveSkill } from '../js/skill-resolve.js';
import { makeHarness } from './helpers/power-harness.mjs';

// habilidades sintéticas de prueba para los tipos genéricos que aún no usa el catálogo
function addSkill(cid, def) {
  const list = CLASSES[cid].skills;
  if (!list.some(s => s.id === def.id)) list.push(normalizeSkillDef({ icon: '🧪', desc: 'prueba', elem: 'physical', req: 1, ...def }));
}
addSkill('guerrero', { id: 't_linea', name: 'Línea', cat: 'spender', tags: ['spender', 'line', 'physical'], type: 'line', coef: 1, cost: 0, cd: 1, range: 8, width: 2 });
addSkill('guerrero', { id: 't_blink', name: 'Parpadeo', cat: 'movement', tags: ['movement', 'physical'], type: 'blink', cd: 5, range: 8 });
addSkill('guerrero', { id: 't_escudo', name: 'Escudo', cat: 'defense', tags: ['defense', 'shield', 'physical'], type: 'shield', cd: 10, shieldPct: 20, dur: 6 });
addSkill('guerrero', { id: 't_provoca', name: 'Provoca', cat: 'utility', tags: ['utility', 'taunt', 'cc', 'physical'], type: 'taunt', cd: 8, radius: 6, dur: 4 });
addSkill('guerrero', { id: 't_zona', name: 'Zona', cat: 'spender', tags: ['spender', 'zone', 'physical'], type: 'zone', at: 'target', coef: 1, cd: 5, radius: 3, dur: 2, range: 8 });
addSkill('guerrero', { id: 't_cepo', name: 'Cepo', cat: 'utility', tags: ['utility', 'trap', 'cc', 'nature'], elem: 'nature', type: 'trap', coef: 1, cd: 5, radius: 1.5, root: 2, dur: 10, trap: { armT: 0.3 }, range: 8 });
addSkill('guerrero', { id: 't_marca', name: 'Marca', cat: 'utility', tags: ['utility', 'mark', 'arcane'], elem: 'arcane', type: 'mark', cd: 5, dur: 8, weakPct: 20, range: 10 });
// el Martillo de Guerra v1 (área en la mira con preparación e impacto diferido): el 2g es de cargar y soltar
addSkill('guerrero', { id: 't_mazazo', name: 'Mazazo', cat: 'spender', tags: ['spender', 'melee', 'area', 'physical'], type: 'area', at: 'target', coef: 1.4, cost: 30, radius: 3, range: 2.5, windup: 0.15, impactDelay: 0.23 });
addSkill('maga', { id: 't_canal', name: 'Canal', cat: 'spender', tags: ['spender', 'channel', 'arcane'], elem: 'arcane', type: 'channel', coef: 0.5, cost: 10, cd: 1, channelT: 1, ticks: 4, int: true, range: 10 });

const fury = h => { h.p.mp = h.p.stats.maxMP; };

// ------------------------------------------------ 1) GCD
{
  const h = makeHarness({ classId: 'guerrero', level: 20 });
  fury(h);
  h.enemy({ hp: 1e6, pos: [3, 0, 0] });
  h.aim(3, 0);
  // t_linea: gastadora sin bloqueo (aísla el GCD); la Lanza tiene bloqueo de 0,3 s (§3.1)
  h.setSlot('rmb', 't_linea'); h.setSlot('k2', 'g_lanza'); h.setSlot('k1', 'embestida');
  assert.equal(h.cast('rmb'), true, 'primera gastadora');
  assert.ok(Math.abs(h.p.gcdT - GCD) < 1e-9, 'pone el GCD de 0,2 s');
  assert.equal(h.cast('k2'), false, 'la segunda gastadora espera al GCD');
  assert.equal(h.cast('k1'), true, 'la movilidad está FUERA del GCD');
  h.tick(0.3);
  assert.equal(h.cast('k2'), true, 'tras 0,2 s la segunda gastadora sale');
  assert.ok(Math.abs(h.p.castLock - 0.3) < 1e-9, 'Lanza Arrojadiza: bloqueo de 0,3 s');
  h.p.cds.embestida = 0;
  assert.equal(h.cast('k1'), false, 'durante el bloqueo no se lanza otra cosa');
  h.tick(0.3);
  assert.equal(h.cast('k1'), true, 'tras el bloqueo, la movilidad sale');
  console.log('GCD 0,2 s entre gastadoras; movilidad fuera del GCD; bloqueo de la Lanza ✓');
}

// ------------------------------------------------ 2) windup cancelable sin coste
{
  const h = makeHarness({ classId: 'guerrero', level: 20 });
  fury(h);
  const e = h.enemy({ hp: 1e6, pos: [4, 0, 0] });
  h.aim(4, 0);
  h.setSlot('rmb', 't_mazazo');    // windup 0,15 + impacto 0,23
  const cost = resolveSkill(h.p, CLASSES.guerrero.skills.find(s => s.id === 't_mazazo')).cost;
  assert.equal(cost, 30, 'Mazazo: coste 30');
  assert.equal(h.cast('rmb'), true);
  assert.equal(h.p.mp, 100, 'el coste NO se cobra durante el windup');
  h.p.dodge();                      // la esquiva cancela el windup
  h.step(0.6);
  assert.equal(e.hp, 1e6, 'golpe cancelado: sin daño');
  assert.equal(h.p.mp, 100, 'golpe cancelado: sin coste');
  assert.equal(h.p.cds.t_mazazo || 0, 0, 'golpe cancelado: sin enfriamiento');
  h.p.dodgeT = 0;
  assert.equal(h.cast('rmb'), true);
  h.step(0.1);
  assert.equal(h.p.mp, 100, 'aún en windup');
  h.step(0.1);
  assert.equal(h.p.mp, 100 - cost, 'al soltar el golpe se cobra el coste');
  assert.equal(e.hp, 1e6, '...pero el daño llega con el impacto (impactDelay 0,23 s)');
  h.step(0.3);
  assert.ok(e.hp < 1e6, 'el mazazo impacta');
  console.log('Windup: la esquiva lo cancela sin cobrar; coste al soltar, daño al impactar ✓');
}

// ------------------------------------------------ 3) Meteoro: impacto a 0,6 s
{
  // el Meteoro es del kit de la Piromante (2g); Nv16, antes de su Mejora (Nv17: cae a los 0,45 s)
  const h = makeHarness({ classId: 'maga', level: 16, spec: 'piromante' });
  const e = h.enemy({ hp: 1e6, pos: [5, 0, 0] });
  h.aim(5, 0);
  h.setSlot('rmb', 'meteoro');
  const mp0 = h.p.mp;
  assert.equal(h.cast('rmb'), true);
  assert.ok(h.p.mp < mp0, 'sin windup: el coste se cobra al lanzar');
  h.step(0.5);
  assert.equal(e.hp, 1e6, 'a 0,5 s el meteoro aún cae');
  h.step(0.2);
  assert.ok(e.hp < 1e6, 'el daño llega con la bola (0,6 s)');
  console.log('Impacto sincronizado con el VFX (Meteoro 0,6 s) ✓');
}

// ------------------------------------------------ 4) proyectiles: daño al impactar
{
  definePower('t_cond_elite', { name: 'prueba', condAdd: (p, e) => (e?.def?.rank ? 1000 : 0) });
  const h = makeHarness({ classId: 'arquera', level: 10, powers: ['t_cond_elite'] });
  h.p.stats.critRaw = -1000; // sin críticos (comparación limpia)
  const normal = h.enemy({ hp: 1e6, pos: [0, 0, 4] });
  h.p.basicAttack(normal);
  const pr = h.g.projectiles[0];
  assert.equal(typeof pr.rollAt, 'function', 'el proyectil lleva rollAt');
  assert.equal(pr.dmg, undefined, 'no hay daño tirado al disparar');
  h.step(1);
  const dn = 1e6 - normal.hp;
  normal.alive = false; normal.hp = 0;
  const elite = h.enemy({ hp: 1e6, rank: 'elite', pos: [0, 0, 4] });
  h.p.atkCd = 0;
  h.p.basicAttack(elite);
  h.step(1);
  const de = 1e6 - elite.hp;
  assert.ok(dn > 0 && de > dn * 5, `bono condicionado al objetivo real al impactar: ${dn} vs ${de}`);
  console.log('Proyectiles: el daño se tira al impactar contra el objetivo real ✓');
}

// ------------------------------------------------ 5) canalización
{
  const mkCh = () => {
    const h = makeHarness({ classId: 'maga', level: 10 });
    const e = h.enemy({ hp: 1e6, pos: [0, 0, 4] });
    let ticks = 0;
    const orig = e.takeDamage.bind(e);
    e.takeDamage = (a, c, o) => { ticks++; return orig(a, c, o); };
    h.aim(0, 4);
    h.setSlot('k2', 't_canal');
    return { h, e, ticks: () => ticks };
  };
  let t = mkCh();
  assert.equal(t.h.cast('k2'), true);
  assert.ok(t.h.p.castLock > 0, 'bloquea mientras canaliza');
  assert.equal(t.h.cast('k2'), false, 'no se relanza durante la canalización');
  t.h.step(1.2);
  assert.equal(t.ticks(), 4, 'los 4 tics llegan por el planificador: ' + t.ticks());
  assert.equal(t.h.p.castLock, 0);
  // soltar la tecla la corta
  t = mkCh();
  t.h.cast('k2');
  t.h.g.input.held = () => false;
  t.h.step(1.2);
  assert.equal(t.ticks(), 0, 'soltar la tecla corta la canalización');
  // esquivar la corta
  t = mkCh();
  t.h.cast('k2'); t.h.step(0.3);
  const before = t.ticks();
  t.h.p.dodge(); t.h.step(1);
  assert.ok(before >= 1 && t.ticks() === before, 'la esquiva corta la canalización');
  // golpe > 10 % de la vida la interrumpe (Int.), salvo imparable
  t = mkCh();
  t.h.cast('k2'); t.h.step(0.3);
  t.h.p.takeDamage(Math.round(t.h.p.stats.maxHP * 0.3), 1);
  const b2 = t.ticks(); t.h.step(1);
  assert.equal(t.ticks(), b2, 'un golpe fuerte interrumpe');
  t = mkCh();
  t.h.p.unstoppableT = 5;
  t.h.cast('k2'); t.h.step(0.3);
  t.h.p.takeDamage(Math.round(t.h.p.stats.maxHP * 0.3), 1);
  t.h.step(1);
  assert.equal(t.ticks(), 4, 'imparable: no se interrumpe');
  console.log('Canalización por ticks: soltar / esquiva / golpe > 10 % la cortan (salvo imparable) ✓');
}

// ------------------------------------------------ 6) tipos genéricos
{
  // el Salto Devastador es del kit del Berserker (2g)
  const h = makeHarness({ classId: 'guerrero', level: 20, spec: 'berserker' });
  fury(h);
  // cone (Hendidura, windup 0,25): golpea delante, no detrás
  const front = h.enemy({ hp: 1e6, pos: [2, 0, 0] }), back = h.enemy({ hp: 1e6, pos: [-2, 0, 0] });
  h.aim(5, 0); h.setSlot('rmb', 'g_hendidura');
  assert.equal(h.cast('rmb'), true); h.step(0.3);
  assert.ok(front.hp < 1e6 && back.hp === 1e6, 'cono: delante sí, detrás no');
  front.alive = back.alive = false;
  // line
  h.tick(0.3);
  const inLine = h.enemy({ hp: 1e6, pos: [4, 0, 0] }), offLine = h.enemy({ hp: 1e6, pos: [4, 0, 3] });
  h.setSlot('k2', 't_linea'); assert.equal(h.cast('k2'), true);
  assert.ok(inLine.hp < 1e6 && offLine.hp === 1e6, 'línea: solo lo alineado');
  inLine.alive = offLine.alive = false;
  // leap (Salto Devastador): te mueve, intocable en el aire, daña al caer
  h.tick(0.3);
  const landing = h.enemy({ hp: 1e6, pos: [6.5, 0, 0] });
  h.aim(6, 0); h.setSlot('k1', 'g_salto');
  assert.equal(h.cast('k1'), true);
  const hp0 = h.p.hp; h.p.takeDamage(50, 1);
  assert.equal(h.p.hp, hp0, 'intocable durante el salto');
  h.step(0.6);
  assert.ok(Math.abs(h.p.pos.x - 6) < 0.05 && landing.hp < 1e6, 'aterriza en el destino y daña: ' + h.p.pos.x);
  landing.alive = false;
  // dash (Embestida)
  h.tick(0.5); h.p.cds = {};
  h.p.pos.set(0, 0, 0); h.aim(5, 0); h.setSlot('k1', 'embestida');
  assert.equal(h.cast('k1'), true);
  assert.ok(h.p.pos.x > 4.5, 'la embestida desplaza');
  // blink
  h.tick(0.5); h.p.pos.set(0, 0, 0); h.aim(3, 4); h.setSlot('k1', 't_blink');
  assert.equal(h.cast('k1'), true);
  assert.ok(Math.abs(h.p.pos.x - 3) < 0.31 && Math.abs(h.p.pos.z - 4) < 0.31, 'parpadeo al destino');
  // shield
  h.tick(0.5); h.p.pos.set(0, 0, 0); h.setSlot('k2', 't_escudo');
  assert.equal(h.cast('k2'), true);
  const sh = h.p.shieldTotal();
  assert.ok(Math.abs(sh - Math.round(0.2 * h.p.stats.maxHP * 1.0 * (1 + 0.06 * 2))) <= 1, 'escudo 20 % de vida (+6 %/rango): ' + sh);
  const hpS = h.p.hp; h.p.takeDamage(1, 1);
  assert.equal(h.p.hp, hpS, 'el escudo absorbe tras mitigar');
  // taunt
  h.tick(0.5);
  const t1 = h.enemy({ hp: 1e6, pos: [3, 0, 0] }), t2 = h.enemy({ hp: 1e6, pos: [12, 0, 0] });
  h.setSlot('k2', 't_provoca'); assert.equal(h.cast('k2'), true);
  assert.ok(t1.tauntT > 0 && !(t2.tauntT > 0), 'provoca a los cercanos');
  t1.alive = t2.alive = false;
  // zone (campo de suelo con tics)
  h.tick(0.5);
  const z = h.enemy({ hp: 1e6, pos: [5, 0, 0] });
  h.aim(5, 0); h.setSlot('rmb', 't_zona'); h.p.cds = {};
  assert.equal(h.cast('rmb'), true);
  assert.equal(h.g.fields.length, 1, 'la zona es una entidad de suelo');
  h.step(1);
  assert.ok(z.hp < 1e6, 'la zona daña por tics');
  h.step(1.5);
  assert.equal(h.g.fields.length, 0, 'la zona caduca');
  z.alive = false;
  // trap: se ARMA en trap.armT (0,3 s) y salta con el primer enemigo dentro (inmoviliza);
  // fuera de su radio no pasa nada y, al saltar, se consume (Paso 2, §3.6)
  h.tick(0.5);
  h.aim(6, 0); h.setSlot('k2', 't_cepo');
  assert.equal(h.cast('k2'), true);
  const prey = h.enemy({ hp: 1e6, pos: [9, 0, 0] });
  h.step(0.4);
  assert.equal(prey.hp, 1e6, 'fuera de la trampa no pasa nada');
  prey.pos.set(6, 0, 0); h.step(0.1);
  assert.ok(prey.hp < 1e6 && prey.rootT > 0, 'la trampa daña e inmoviliza');
  assert.ok(!h.g.fields.some(f => !f.dead && f.kind === 'trampa'), 'al saltar se consume');
  prey.alive = false;
  h.p.cds.t_cepo = 0; h.p.gcdT = 0;
  const early = h.enemy({ hp: 1e6, pos: [6, 0, 0] });
  assert.equal(h.cast('k2'), true);
  h.step(0.2);
  assert.equal(early.hp, 1e6, 'sin armar (0,2 s < armT) no salta aunque esté encima');
  h.step(0.15);
  assert.ok(early.hp < 1e6, 'armada, salta');
  early.alive = false;
  // mark: debilitamiento (saco Debilidad)
  h.tick(0.5);
  const m = h.enemy({ hp: 1e6, pos: [4, 0, 0] });
  h.aim(4, 0); h.setSlot('k2', 't_marca');
  assert.equal(h.cast('k2'), true);
  assert.equal(m.weaknessPct(), 20, 'la marca aplica Debilidad');
  // buff (Piel de Hierro; el Grito de Guerra es activa de talento desde 2g)
  h.tick(0.5); h.setSlot('k2', 'g_piel');
  assert.equal(h.cast('k2'), true);
  assert.ok(h.p.buffs.some(b => b.id === 'g_piel'), 'buff aplicado');
  console.log('Tipos genéricos: cone · line · leap · dash · blink · shield · taunt · zone · trap · mark · buff ✓');
}

// ------------------------------------------------ 7) onCast / afterCast
{
  const seen = [];
  definePower('t_cancela_lanza', { name: 'prueba', onCast: (g, p, cast) => (cast.sk.id === 'g_lanza' ? false : undefined) });
  definePower('t_tras', { name: 'prueba', afterCast: (g, p, cast, res) => { seen.push([cast.sk.id, res.hits]); } });
  const h = makeHarness({ classId: 'guerrero', level: 20, powers: ['t_cancela_lanza', 't_tras'] });
  fury(h);
  h.enemy({ hp: 1e6, pos: [2, 0, 0] });
  h.aim(2, 0);
  h.setSlot('rmb', 'g_lanza');
  assert.equal(h.cast('rmb'), false, 'onCast → false cancela');
  assert.equal(h.p.mp, 100, '...sin coste');
  assert.equal(h.p.gcdT, 0, '...y sin GCD');
  h.setSlot('rmb', 't_linea');
  assert.equal(h.cast('rmb'), true);
  assert.deepEqual(seen, [['t_linea', 1]], 'afterCast recibe el CastResult (1 golpe)');
  console.log('⑦ onCast cancela sin coste; afterCast recibe el resultado ✓');
}
console.log('\n✅ CANAL DE LANZAMIENTO (GCD · windup · impacto · canalización · tipos genéricos) OK');
