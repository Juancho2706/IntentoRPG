// Paso 2b.2 — pedidos de los trabajadores de 2b.1 resueltos en el NÚCLEO
//  A1  p.slowImmuneT / Player.applySlow: única entrada de las ralentizaciones al héroe
//  A2  fallo de proyectiles enemigos (projMissPct de buff o de zona aliada) en Projectile
//  A3  los básicos de proyectil genéricos dan recurso AL IMPACTAR (no al disparar)
//  A4  g.gainResource(p, n) y sk.gen / genOnHit en habilidades que no son básicos
//  A5  daño SALIENTE debilitado por enemigo (Enemy.weakenOutgoing / outDmgMul)
//  A6  coste por buff dentro de resolveSkill (stat spenderCostPct)
//  A7  campo 'aura' (tipo genérico `aura`): buff a los aliados dentro + recurso/s
//  A8  sk.cadence de los básicos en el canal
//  A9  g.startChannel y type:'channel' + behavior (solo tick) conviven
//  A10 g.fireProjectile (crítico + Sangre Fría + ctx.hit) y COLDBLOOD_CRIT exportado
//  A11 basicAttack usa el VFX/SFX del básico de su clase (el Dardo suena `bolt`)
//  +   sin escopetazo, abanico con el primer proyectil recto, tope de recurso al golpear,
//      tics de DoT marcados `dot` con su habilidad
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CLASSES } from '../js/data.js';
import { normalizeSkillDef, validateSkillDef, COLDBLOOD_CRIT as DEFS_CB, projFanOffset } from '../js/skill-defs.js';
import { COLDBLOOD_CRIT, CAPS } from '../js/combat-math.js';
import { defineSkillBehavior, SKILL_BEHAVIORS } from '../js/powers.js';
import { resolveSkill } from '../js/skill-resolve.js';
import { Projectile } from '../js/entities.js';
import { makeHarness } from './helpers/power-harness.mjs';

const SK = (c, id) => CLASSES[c].skills.find(s => s.id === id);
const lost = e => e.maxHP - e.hp;
function addSkill(cid, def) {
  const list = CLASSES[cid].skills;
  if (!list.some(s => s.id === def.id)) list.push(normalizeSkillDef({ icon: '🧪', desc: 'prueba 1', elem: 'arcane', req: 1, ...def }));
}
// habilidades v1 del Guerrero retiradas en 2g, copiadas como sintéticas (tools/convert-v2/juego-v1.json)
// con su `req` de v1: buffMul y el coeficiente escalan con el rango, que depende de él
addSkill('guerrero', { id: 't_provocacion', name: 'Provocación v1', cat: 'utility', tags: ['utility', 'taunt', 'cc', 'physical'], elem: 'physical',
  type: 'taunt', req: 16, cd: 8, range: 15, dur: 4, weakenPct: 15, genOnHit: 15 });
addSkill('guerrero', { id: 't_estandarte', name: 'Estandarte v1', cat: 'ultimate', tags: ['ultimate', 'aura', 'buff', 'ally', 'physical'], elem: 'physical',
  type: 'aura', req: 15, cd: 55, dur: 12, radius: 8, buff: { dmgPct: 20, dr: 15 }, resPerSec: 5 });
addSkill('guerrero', { id: 't_mandoble', name: 'Mandoble v1', cat: 'basic', tags: ['basic', 'melee', 'physical'], elem: 'physical',
  type: 'melee', req: 3, coef: 1.5, gen: 14, range: 2.4, windup: 0.12, cadence: 1.5 });
addSkill('guerrero', { id: 't_embate', name: 'Embate v1', cat: 'basic', tags: ['basic', 'melee', 'area', 'physical'], elem: 'physical',
  type: 'area', at: 'self', req: 8, coef: 0.6, gen: 7, genPerExtra: 2, genMax: 15, radius: 2.5, cadence: 1.1 });

// ------------------------------------------------ A1 inmunidad a ralentizaciones
{
  const h = makeHarness({ classId: 'arquera', level: 20 });
  assert.equal(h.p.applySlow(2), true, 'sin inmunidad: se aplica');
  assert.ok(h.p.slowT >= 2);
  h.p.grantSlowImmune(3);
  assert.equal(h.p.slowT, 0, 'la inmunidad purga la ralentización');
  assert.equal(h.p.applySlow(2), false, 'con slowImmuneT no se aplica');
  h.p.slowT = 2; h.step(0.05);
  assert.equal(h.p.slowT, 0, 'Player.update la vuelve a quitar (fuentes que escriben slowT a mano)');
  h.tick(3.1);
  assert.equal(h.p.applySlow(2), true, 'al terminar, vuelve a poder ralentizarse');
  h.p.slowT = 0; h.p.unstoppableT = 1;
  assert.equal(h.p.applySlow(2), false, 'imparable: tampoco');
  // Agilidad (buff genérico con slowImmune; catálogo 2g: activa de talento de la ranura 2, la concede c17A)
  h.p.unstoppableT = 0;
  h.p.talentExtra.grants.add('agilidad'); h.p.recompute();
  h.setSlot('k2', 'agilidad');
  assert.equal(h.cast('k2'), true);
  assert.ok(h.p.slowImmuneT > 5.9, 'Agilidad: 6 s de inmunidad');
  console.log('A1 slowImmuneT/applySlow (Agilidad, Piel de Hierro, Furia Inmortal) ✓');
}

// ------------------------------------------------ A2 fallo de proyectiles enemigos
{
  const h = makeHarness({ classId: 'arquera', level: 20 });
  const fire = () => {
    let n = 0;
    const orig = h.p.takeDamage.bind(h.p);
    h.p.takeDamage = (a, l, o) => { n++; return orig(a, l, o); };
    for (let i = 0; i < 40; i++)
      h.g.projectiles.push(new Projectile(h.g, { from: new THREE.Vector3(-2, 1, 0), to: new THREE.Vector3(0, 1, 0), speed: 10, range: 5, dmg: 1, friendly: false }));
    h.step(0.5);
    h.p.takeDamage = orig;
    return n;
  };
  assert.equal(fire(), 40, 'sin humo, todos impactan');
  h.p.addBuff('t_niebla', { projMissPct: 100 }, 5);
  assert.equal(h.p.projMissChance(), 100, 'stat projMissPct de buff');
  assert.equal(fire(), 0, 'fallo 100 %: ninguno impacta');
  assert.ok(h.g.projectiles.length === 0 || h.g.projectiles.every(pr => pr.missed), 'los que fallan siguen de largo');
  console.log('A2 projMissPct (buff y zona) en Projectile ✓');
}

// ------------------------------------------------ A3 básico de proyectil: recurso al impactar
{
  const run = (hit) => {
    const h = makeHarness({ classId: 'maga', level: 10 });
    const e = h.enemy({ hp: 1e6, pos: [0, 0, 5] });
    h.p.mp = 0;
    h.aim(hit ? 0 : -5, hit ? 5 : -5); h.setSlot('lmb', 'm_dardo');   // (2g: el Ascua se retiró)
    assert.equal(h.cast('lmb'), true);
    const after = h.p.mp;
    h.step(1);
    return { cast: after, end: h.p.mp, dmg: lost(e) };
  };
  const a = run(true), b = run(false);
  assert.ok(a.cast < 1 && a.dmg > 0, 'al disparar no se gana nada');
  assert.ok(a.end - b.end >= 3 - 1e-6, `+3 de Maná solo al acertar (${a.end.toFixed(2)} vs ${b.end.toFixed(2)})`);
  console.log('A3 básicos de proyectil: recurso AL IMPACTAR (Dardo Arcano) ✓');
}

// ------------------------------------------------ A4 gainResource, gen y genOnHit
{
  const h = makeHarness({ classId: 'guerrero', level: 20 });
  assert.equal(h.g.gainResource(h.p, 17), 17, 'g.gainResource devuelve lo ganado');
  assert.equal(h.p.mp, 17);
  assert.equal(resolveSkill(h.p, SK('guerrero', 'grito_guerra')).gen, 30, 'sk.gen en una utilidad');
  // Embestida a Nv6, antes de su Mejora (Carga Fiera, Nv7: +4)
  assert.equal(resolveSkill(makeHarness({ classId: 'guerrero', level: 6 }).p, SK('guerrero', 'embestida')).genOnHit, 12, 'genOnHit en la movilidad');
  assert.equal(resolveSkill(h.p, SK('guerrero', 't_provocacion')).genOnHit, 15, 'genOnHit en la provocación');
  console.log('A4 g.gainResource · sk.gen al lanzar · genOnHit si golpea ✓');
}

// ------------------------------------------------ A5 daño saliente debilitado
{
  const h = makeHarness({ classId: 'guerrero', level: 20 });
  const e = h.enemy({ hp: 1e6, pos: [8, 0, 0] });
  h.p.stats.arm = 0; h.p.stats.dr = 0; h.p.stats.block = 0;
  const hit = () => { const hp0 = h.p.hp = h.p.stats.maxHP; h.p.takeDamage(100, 1, { melee: true, source: e }); return hp0 - h.p.hp; };
  const base = hit();
  const mpC = h.p.mp;
  h.aim(8, 0); h.setSlot('k2', 't_provocacion'); assert.equal(h.cast('k2'), true);
  assert.equal(h.p.mp - mpC, 15, '+15 de Furia (genOnHit) al provocar');
  assert.ok(e.tauntT > 0 && Math.abs(e.outDmgMul() - 0.85) < 1e-9, 'Provocación: el provocado te hace −15 %');
  const weak = hit();
  assert.ok(Math.abs(weak - Math.round(base * 0.85)) <= 1, `Player.takeDamage aplica outDmgMul de la fuente (${base} → ${weak})`);
  h.tick(4.2);
  assert.equal(e.outDmgMul(), 1, 'caduca con la provocación');
  console.log('A5 Enemy.weakenOutgoing / outDmgMul (Provocación sin tocar e.def) ✓');
}

// ------------------------------------------------ A6 coste por buff en resolveSkill
{
  const h = makeHarness({ classId: 'arquera', level: 20 });
  const fp = SK('arquera', 'flecha_perforante');
  const c0 = resolveSkill(h.p, fp).cost;
  h.p.addBuff('t_gratis', { spenderCostPct: -50 }, 2);
  assert.equal(resolveSkill(h.p, fp).cost, Math.round(c0 * 0.5), 'spenderCostPct −50 → mitad de coste');
  assert.equal(resolveSkill(h.p, SK('arquera', 'a_t_cepo')).cost, 10, 'no afecta a lo que no es principal (Trampa de Cepo)');
  h.tick(2.1);
  assert.equal(resolveSkill(h.p, fp).cost, c0, 'al caducar el buff, coste normal');
  console.log('A6 coste por buff en resolveSkill (Furia Inmortal = spenderCostPct −100) ✓');
}

// ------------------------------------------------ A7 aura (Estandarte de Guerra)
{
  const h = makeHarness({ classId: 'guerrero', level: 15 });
  h.setSlot('k4', 't_estandarte'); assert.equal(h.cast('k4'), true);
  const f = (h.g.fields || []).find(x => x.kind === 'aura');
  assert.ok(f && f.radius === 8, 'campo aura de 8 m');
  assert.ok(h.p.buffs.some(b => b.id === 't_estandarte'), 'buff al instante');
  const mp0 = h.p.mp; h.tick(2);
  assert.ok(h.p.mp - mp0 >= 9 && h.p.mp - mp0 <= 11, `+5 de Furia/s dentro (${(h.p.mp - mp0).toFixed(1)})`);
  console.log('A7 campo aura: buff renovado a los aliados dentro + recurso/s ✓');
}

// ------------------------------------------------ A8 cadencia de los básicos
{
  const h = makeHarness({ classId: 'guerrero', level: 20 });
  assert.equal(resolveSkill(h.p, SK('guerrero', 't_mandoble')).cadence, 1.5);
  assert.equal(resolveSkill(h.p, SK('guerrero', 't_embate')).cadence, 1.1);
  assert.equal(resolveSkill(h.p, SK('guerrero', 'g_hendidura')).cadence, 1, 'solo los básicos');
  // ningún básico del catálogo necesita un comportamiento para su cadencia (la lee el canal)
  for (const c of Object.values(CLASSES)) for (const s of c.skills)
    if (s.cat === 'basic' && s.cadence) assert.ok(!s.behavior && !SKILL_BEHAVIORS[s.id], `${s.id}: sin comportamiento redundante`);
  console.log('A8 sk.cadence en el canal (Mandoble ×1,5 · Embate ×1,1) ✓');
}

// ------------------------------------------------ A9 canalización: startChannel y channel + behavior
{
  let ticks = 0, ended = 0;
  defineSkillBehavior('t_canal_propio', { tick: () => { ticks++; }, end: () => { ended++; } });
  addSkill('maga', { id: 't_canal_b', name: 'Canal propio', cat: 'spender', tags: ['spender', 'channel', 'arcane'], type: 'channel', behavior: 't_canal_propio',
    coef: 1, cost: 0, cd: 1, channelT: 1, ticks: 5, range: 10 });
  assert.deepEqual(validateSkillDef(SK('maga', 't_canal_b'), { behaviors: SKILL_BEHAVIORS }), [], 'behavior sin cast + type channel es válido');
  const h = makeHarness({ classId: 'maga', level: 10 });
  const e = h.enemy({ hp: 1e6, pos: [0, 0, 4] }); h.aim(0, 4);
  h.setSlot('k2', 't_canal_b'); assert.equal(h.cast('k2'), true);
  h.step(1.2);
  assert.equal(ticks, 5, 'el tick del comportamiento sustituye al golpe por defecto');
  assert.equal(ended, 1, 'y su end se llama al terminar');
  assert.equal(lost(e), 0, 'sin golpe por defecto');
  // Desgarro Arcano: canalización GENÉRICA con unstoppable (sin comportamiento propio)
  const d = SK('maga', 'm_u_desgarro');
  assert.ok(d.type === 'channel' && d.unstoppable && !d.behavior, 'Desgarro = channel genérico');
  // startChannel como API pública
  const h2 = makeHarness({ classId: 'maga', level: 10 });
  let n = 0;
  const ctx = { p: h2.p, sk: { id: 'x' }, key: 'k3', enemy: null };
  h2.g.startChannel(ctx, () => {}, { dur: 0.6, ticks: 3, unstoppable: true, onTick: () => { n++; } });
  assert.ok(h2.p.unstoppableT > 0 && h2.p.castLock > 0);
  h2.step(0.8);
  assert.equal(n, 3); assert.equal(h2.p.unstoppableT, 0, 'al terminar se quita el imparable'); assert.equal(h2.g._channel, null);
  console.log('A9 g.startChannel · type:channel + behavior(tick) conviven · Desgarro genérico ✓');
}

// ------------------------------------------------ A10 fireProjectile y Sangre Fría
{
  assert.equal(DEFS_CB, COLDBLOOD_CRIT, 'skill-defs exporta COLDBLOOD_CRIT = combat-math');
  // Sangre Fría (soporte): +100 de crítico contra ralentizados → el tope (60 %), sin él ~0 %
  const rate = (slowed) => {
    const h = makeHarness({ classId: 'arquera', level: 20 });
    h.p.supports = { flecha_perforante: ['coldblood'] }; h.p.recompute();
    h.p.stats.critRaw = 0;                                  // 0 % de crítico de base
    const e = h.enemy({ hp: 1e9, pos: [0, 0, 4] });
    let crits = 0, hits = 0;
    const orig = e.takeDamage.bind(e);
    e.takeDamage = (a, c, o = {}) => { if (o.skill === 'flecha_perforante') { hits++; if (c) crits++; } return orig(a, c, o); };
    h.aim(0, 4); h.setSlot('rmb', 'flecha_perforante');
    for (let i = 0; i < 40; i++) {
      if (slowed) e.applyCC('slow', 5, { pct: 30 });
      h.p.mp = h.p.stats.maxMP; h.p.castLock = 0; h.p.gcdT = 0;
      h.cast('rmb'); h.step(0.4);
    }
    return { r: crits / Math.max(1, hits), hits };
  };
  const a = rate(true), b = rate(false);
  assert.ok(a.hits >= 35 && b.hits >= 35, 'los proyectiles del núcleo impactan');
  assert.ok(a.r > 0.4 && b.r < 0.15, `Sangre Fría por g.fireProjectile: ${(a.r * 100).toFixed(0)} % vs ${(b.r * 100).toFixed(0)} % de crítico`);
  console.log('A10 g.fireProjectile (crítico + Sangre Fría + ctx.hit) · COLDBLOOD_CRIT exportado ✓');
}

// ------------------------------------------------ A11 VFX/SFX del básico de arma
{
  const h = makeHarness({ classId: 'maga', level: 5 });
  const sounds = [];
  h.g.sfx = (n) => sounds.push(n);
  const e = h.enemy({ hp: 1e6, pos: [0, 0, 4] });
  h.p.basicAttack(e);
  assert.ok(sounds.includes('bolt'), `el Dardo Arcano suena bolt (${sounds.join(',')})`);
  const hg = makeHarness({ classId: 'guerrero', level: 5 });
  const s2 = []; hg.g.sfx = (n) => s2.push(n);
  hg.p.basicAttack(hg.enemy({ hp: 1e6, pos: [1.2, 0, 0] }));
  assert.ok(s2.includes('hit'), 'el Tajo suena hit');
  console.log('A11 basicAttack con el VFX/SFX del básico (Dardo → bolt) ✓');
}

// ------------------------------------------------ reglas nuevas del núcleo
{
  // abanico: el primer proyectil va recto; los extra se alternan a ±0,18 rad
  assert.equal(projFanOffset(0, 2), 0);
  assert.ok(Math.abs(projFanOffset(1, 2) - 0.18) < 1e-9 && Math.abs(projFanOffset(2, 3) + 0.18) < 1e-9);
  assert.ok(Math.abs(projFanOffset(0, 5, 0.436) + 0.436) < 1e-9, 'con abanico propio se reparte en él');
  // sin escopetazo: 1 proyectil base + 2 extra golpean a un enemigo grande UNA vez
  const h = makeHarness({ classId: 'maga', level: 20 });
  h.p.supports = { bola_fuego: ['multi'] }; h.p.recompute();
  const big = h.enemy({ hp: 1e6, pos: [0, 0, 3], boss: true });
  big.def.scale = 4;
  let direct = 0;
  const orig = big.takeDamage.bind(big);
  big.takeDamage = (a, c, o = {}) => { if (o.skill === 'bola_fuego') direct++; return orig(a, c, o); };
  h.aim(0, 3); h.setSlot('rmb', 'bola_fuego'); assert.equal(h.cast('rmb'), true);
  h.step(1);
  assert.equal(direct, 1, `Multiproyectil: un impacto por enemigo y lanzamiento (${direct})`);
  // tope del recurso al golpear (afijo plano ×G frente a pozos fijos)
  const g2 = makeHarness({ classId: 'guerrero', level: 50 });
  g2.p.equipment.ring = { kind: 'item', slot: 'ring', affixes: { mph: 80 }, quality: 0 }; g2.p.recompute();
  assert.equal(g2.p.stats.mph, CAPS.mph, `mph topado a ${CAPS.mph} por impacto`);
  // los tics de DoT llegan marcados `dot` y atribuidos a su habilidad
  const h3 = makeHarness({ classId: 'arquera', level: 20 });
  const v = h3.enemy({ hp: 1e6, pos: [0, 0, 4] });
  const seen = [];
  const o3 = v.takeDamage.bind(v);
  v.takeDamage = (a, c, o = {}) => { seen.push(o); return o3(a, c, o); };
  // (catálogo 2g: Flecha de Cicuta es una variante de la forja; aquí, un básico sintético con su hitDot)
  addSkill('arquera', { id: 't_cicuta', name: 'Cicuta de prueba', cat: 'basic', tags: ['basic', 'proj', 'nature', 'dot'], elem: 'nature',
    type: 'proj', coef: 0.7, gen: 5, hitDot: { kind: 'poison', coef: 0.5, dur: 4 }, speed: 17, range: 9.5 });
  h3.aim(0, 4); h3.setSlot('lmb', 't_cicuta'); h3.cast('lmb'); h3.step(2);
  assert.ok(seen.some(o => o.dot && o.skill === 't_cicuta'), 'tic de Veneno: dot:true, skill t_cicuta');
  console.log('Sin escopetazo · primer proyectil recto · tope de recurso al golpear · tics de DoT atribuidos ✓');
}

// ------------------------------------------------ dos botones mantenidos (🖱️Izq + 🖱️Der)
{
  // 3 s con los dos botones mantenidos, como el bucle de main.js (lmb y luego rmb cada frame)
  const h = makeHarness({ classId: 'guerrero', level: 20 });
  h.p.mp = h.p.stats.maxMP;
  const e = h.enemy({ hp: 1e9, pos: [1.6, 0, 0] });
  h.aim(1.6, 0); h.setSlot('lmb', 'g_tajo'); h.setSlot('rmb', 'g_hendidura');
  h.g.input.mouseHeld = { l: true, r: true };
  const hits = [];                                   // [frame, skill] impactos directos
  let frame = 0;
  const orig = e.takeDamage.bind(e);
  e.takeDamage = (a, c, o = {}) => { if (!o.dot && !o.proc && o.skill) hits.push([frame, o.skill]); return orig(a, c, o); };
  let both = 0, spenders = 0, basics = 0;
  for (; frame < 180; frame++) {
    const a0 = h.p.atkCd;
    h.g.castSkillSlot('lmb');
    const b = h.p.atkCd > a0;
    const s = h.g.castSkillSlot('rmb');
    if (b && s) both++;
    basics += b ? 1 : 0; spenders += s ? 1 : 0;
    h.step(1 / 60, 1 / 60);
  }
  assert.equal(both, 0, 'nunca salen básico y gastadora en el mismo frame');
  const byFrame = {};
  for (const [f, k] of hits) (byFrame[f] || (byFrame[f] = new Set())).add(k);
  assert.ok(!Object.values(byFrame).some(x => x.has('g_tajo') && x.has('g_hendidura')), 'nunca dos acciones con impacto en el mismo frame');
  assert.ok(spenders >= 3 && basics >= 3, `gasta la Furia en Hendiduras y el básico rellena (${spenders} Hendiduras, ${basics} Tajos en 3 s)`);
  // con Furia infinita la gastadora sale con SU cadencia (windup + GCD) y el básico cede siempre
  {
    const k = makeHarness({ classId: 'guerrero', level: 20 });
    k.enemy({ hp: 1e9, pos: [1.6, 0, 0] });
    k.aim(1.6, 0); k.setSlot('lmb', 'g_tajo'); k.setSlot('rmb', 'g_hendidura');
    k.g.input.mouseHeld = { l: true, r: true };
    let sp = 0, ba = 0, bb = 0;
    for (let f = 0; f < 180; f++) {
      k.p.mp = k.p.stats.maxMP;
      const a0 = k.p.atkCd; k.g.castSkillSlot('lmb'); const b = k.p.atkCd > a0;
      const s2 = k.g.castSkillSlot('rmb');
      sp += s2 ? 1 : 0; ba += b ? 1 : 0; if (b && s2) bb++;
      k.step(1 / 60, 1 / 60);
    }
    assert.ok(sp >= 10 && bb === 0, `cadencia de la gastadora con los dos botones: ${sp} en 3 s, ${ba} básicos`);
  }
  // el windup del básico (Mandoble) lo cancela la gastadora: tiene prioridad
  const m = makeHarness({ classId: 'guerrero', level: 20 });
  m.p.mp = m.p.stats.maxMP;
  m.enemy({ hp: 1e9, pos: [1.6, 0, 0] });
  m.aim(1.6, 0); m.setSlot('lmb', 't_mandoble'); m.setSlot('rmb', 'g_hendidura');
  assert.equal(m.cast('lmb'), true); assert.ok(m.g._windup?.ctx.isBasic, 'Mandoble preparando');
  m.step(0.05);
  assert.equal(m.cast('rmb'), true, 'la gastadora corta el remate del básico');
  assert.ok(m.g._windup?.ctx.sk.id === 'g_hendidura', 'el windup en curso es ahora el de la Hendidura');
  assert.ok(m.p.actionLockT > 0 && m.cast('lmb') === false, 'mientras la gastadora prepara, el básico espera');
  // DPS de «los dos botones» ≈ rotación del banco (±10 %) en las tres clases
  const { buildHero, refEnemies, simulateUni } = await import('./balance-bench.mjs');
  const { areaLevelForHero } = await import('../js/combat-math.js');
  for (const [c, L] of [['guerrero', 25], ['maga', 25], ['arquera', 25]]) {
    const ref = refEnemies(areaLevelForHero(L));
    const mk = () => { const p = buildHero(c, L, 'tipico'); p.hotbar.k2 = null; p.hotbar.k3 = null; p.hotbar.k4 = null; return p; };   // 2e: buildHero ya pone la insignia en 3
    // los dos botones con cada lanzamiento de proyectil y cada impacto directo anotados por frame
    // (el básico a distancia puede salir DENTRO del paso de simulación: sameFrameCasts no lo ve)
    const pb = mk(), lmb = pb.hotbar.lmb, rmb = pb.hotbar.rmb;
    let frame = 0;
    const launch = { [lmb]: [], [rmb]: [] }, hitAt = { [lmb]: new Set(), [rmb]: new Set() };
    const arr = pb.game.projectiles, push0 = arr.push;
    arr.push = function (...xs) { for (const x of xs) launch[x.skill]?.push(frame); return push0.apply(this, xs); };
    const onFrame = e => {
      frame++;
      if (e._t69) return;
      e._t69 = true;
      const o = e.takeDamage.bind(e);
      e.takeDamage = (a, cr, opts = {}) => { if (!opts.dot && !opts.proc) hitAt[opts.skill]?.add(frame); return o(a, cr, opts); };
    };
    const rot = simulateUni(mk(), ref), btn = simulateUni(pb, ref, 60, { buttons: true, onFrame });
    assert.equal(btn.sameFrameCasts, 0, `${c}: sin dos acciones en el mismo frame`);
    for (const id of [lmb, rmb]) if (SK(c, id).tags.includes('proj')) assert.ok(launch[id].length > 3, `${c}: lanzamientos de ${id} anotados`);
    const both = launch[lmb].filter(f => launch[rmb].includes(f));
    assert.deepEqual(both, [], `${c}: sin dos proyectiles (básico y gastadora) lanzados en el mismo frame`);
    // impactos de los dos en el mismo frame: con golpes instantáneos serían dos acciones a la vez; con
    // dos proyectiles, solo vale la principal lanzada DESPUÉS del básico (le cede como mucho un frame
    // y puede llegar antes); un básico lanzado durante el vuelo de la principal rompe su bloqueo
    const same = [...hitAt[lmb]].filter(f => hitAt[rmb].has(f));
    assert.equal(same.length, btn.sameFrameHits, `${c}: los impactos anotados son los del banco`);
    const last = (list, f) => list.filter(x => x <= f).pop() ?? null;
    const bad = same.filter(f => {
      const lb = last(launch[lmb], f), ls = last(launch[rmb], f);
      return lb == null || ls == null || lb >= ls;
    });
    assert.deepEqual(bad, [], `${c}: sin impactos de básico y gastadora en el mismo frame (salvo la principal que adelanta al básico)`);
    assert.ok(Math.abs(btn.dps / rot.dps - 1) <= 0.10, `${c}: los dos botones ≈ la rotación (${btn.dps.toFixed(0)} vs ${rot.dps.toFixed(0)})`);
    const sid = mk().hotbar.rmb;
    assert.ok(Math.abs((btn.uses[sid] || 0) - (rot.uses[sid] || 0)) <= Math.max(2, 0.1 * (rot.uses[sid] || 0)), `${c}: la gastadora conserva su cadencia`);
  }
  console.log('Dos botones mantenidos: una acción por frame, la gastadora manda y el DPS ≈ rotación ✓');
}

console.log('\n✅ NÚCLEO 2b.2 (pedidos de 2b.1) OK');
