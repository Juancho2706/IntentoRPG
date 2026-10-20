// Paso 2b.1 — catálogo BASE de la MAGA (docs/paso2-diseno.md §3.2, §1.2, §1.4, §4.4)
//  - cada habilidad valida (validateSkillDef) y tiene 3 ramas × 3 opciones
//  - ranuras = categoría (CAT_SLOTS): las gastadoras van en 🖱️Der o en la ranura 2
//  - calendario de §1.2 y solo habilidades base (las de talento son de 2c)
//  - resolveSkill en Nv1/Nv20/Nv50 (rango por nivel, coeficiente por rango)
//  - comportamientos a medida con el arnés (canal de lanzamiento REAL)
import assert from 'node:assert/strict';
import { CLASSES, SKILL_MODS } from '../js/data.js';
import { validateSkillDef, CAT_SLOTS, SLOT_KEYS } from '../js/skill-defs.js';
import { SKILL_BEHAVIORS } from '../js/powers.js';
import { resolveSkill, fitsSlot, isKnown, rankBase } from '../js/skill-resolve.js';
import { MAGA_SKILLS, MAGA_SKILL_BEHAVIORS } from '../js/skills-maga.js';
import { MAGA_FX, MAGA_FX_PRESETS } from '../js/fx-skills-maga.js';
import { SKILL_FX, SKILL_FX_PRESETS } from '../js/fx-skills.js';
import { resourceDefFor, resourceRegenRate } from '../js/resources.js';
import { makeHarness } from './helpers/power-harness.mjs';

// catálogo BASE (las activas de talento, kind 'talent', entran en CLASSES desde el Paso 2c.0)
const M = { ...CLASSES.maga, skills: CLASSES.maga.skills.filter(s => s.kind !== 'talent') };
assert.equal(CLASSES.maga.skills.filter(s => s.kind === 'talent').length, 16, 'las 16 activas de talento de la Maga entran en CLASSES con kind talent');
const S = id => M.skills.find(s => s.id === id);

// ------------------------------------------------ 1) catálogo y formato
const EXPECTED = {
  // id: [cat, req]
  m_dardo: ['basic', 1], m_ascua: ['basic', 3], m_toque: ['basic', 8],
  bola_fuego: ['spender', 2], rayo: ['spender', 8], nova_hielo: ['spender', 14], meteoro: ['spender', 14],
  m_paso_escarcha: ['movement', 4], m_estela_ignea: ['movement', 12],
  m_armadura: ['defense', 6], m_onda: ['utility', 12],
  m_u_supernova: ['ultimate', 15], m_u_tormenta: ['ultimate', 15], m_u_desgarro: ['ultimate', 15],
};
assert.deepEqual(M.skills.map(s => s.id).sort(), Object.keys(EXPECTED).sort(), 'catálogo base de §3.2 (sin talentos ni pasivas)');
assert.ok(!S('m_p_arcano'), 'la pasiva m_p_arcano se eliminó');
for (const s of M.skills) {
  assert.deepEqual(validateSkillDef(s, { behaviors: SKILL_BEHAVIORS }), [], s.id);
  const [cat, req] = EXPECTED[s.id];
  assert.equal(s.cat, cat, `${s.id}: categoría`);
  assert.equal(s.req, req, `${s.id}: nivel del calendario §1.2`);
  assert.notEqual(s.kind, 'talent', `${s.id}: base, no de talento`);
  assert.equal(SKILL_MODS[s.id]?.length, 3, `${s.id}: 3 ramas`);
  for (const br of SKILL_MODS[s.id]) assert.equal(br.opts.length, 3, `${s.id}/${br.id}: 3 opciones`);
  assert.ok(/\d/.test(s.desc), `${s.id}: la descripción lleva números`);
  if (s.behavior) assert.ok(MAGA_SKILL_BEHAVIORS[s.behavior] && SKILL_BEHAVIORS[s.behavior], `${s.id}: comportamiento registrado`);
  assert.ok(SKILL_FX[s.id] === MAGA_FX[s.id], `${s.id}: VFX propio fusionado en SKILL_FX`);
}
// los nombres de preset citados existen (propios o de fx-skills.js)
for (const [id, fx] of Object.entries(MAGA_FX)) {
  for (const k of ['trail', 'impact', 'aura', 'extra'])
    if (typeof fx[k] === 'string') assert.ok(SKILL_FX_PRESETS[fx[k]], `${id}.${k}: preset ${fx[k]} inexistente`);
  assert.ok(['fire', 'ice', 'bolt', 'dash', 'portal'].includes(fx.sfx), `${id}: sfx`);
}
for (const k of Object.keys(MAGA_FX_PRESETS)) assert.equal(SKILL_FX_PRESETS[k], MAGA_FX_PRESETS[k], `preset ${k} fusionado`);
// los sonidos elementales quedan en uso
const sfxUsed = new Set(Object.values(MAGA_FX).map(f => f.sfx));
for (const s of ['fire', 'ice', 'bolt']) assert.ok(sfxUsed.has(s), `sfx ${s} en uso`);
// enfriamientos: TODAS las gastadoras de la Maga tienen enfriamiento (§3.2); las definitivas no cuestan
for (const s of M.skills.filter(x => x.cat === 'spender')) assert.ok(s.cd > 0 && s.cost > 0, `${s.id}: gastadora con coste y enfriamiento`);
for (const s of M.skills.filter(x => x.cat === 'ultimate')) assert.ok(s.cost === 0 && s.cd >= 45, `${s.id}: definitiva sin coste, enfriamiento ≥ 45 s`);
for (const s of M.skills.filter(x => x.cat === 'basic')) assert.ok(s.gen >= 3 && s.gen <= 4, `${s.id}: el básico casi no genera (3–4)`);
console.log('Catálogo base de la Maga (§3.2): formato, calendario, ramas y VFX ✓');

// ------------------------------------------------ 2) ranuras por categoría
for (const s of M.skills) {
  const want = CAT_SLOTS[s.cat];
  for (const slot of SLOT_KEYS) assert.equal(fitsSlot(s, slot), want.includes(slot), `${s.id} en ${slot}`);
}
// identidad de enfriamientos (§1.4): dos gastadoras a la vez (rmb + k2)
for (const id of ['bola_fuego', 'rayo', 'nova_hielo', 'meteoro']) assert.ok(fitsSlot(S(id), 'rmb') && fitsSlot(S(id), 'k2') && !fitsSlot(S(id), 'k3'));
console.log('Ranuras: gastadoras en 🖱️Der o 2 (flexible), movilidad en 1, defensa/utilidad en 2, definitivas en 4 ✓');

// ------------------------------------------------ 3) resolveSkill en Nv1 / Nv20 / Nv50
for (const L of [1, 20, 50]) {
  const h = makeHarness({ classId: 'maga', level: L });
  for (const s of M.skills) {
    const prof = resolveSkill(h.p, s);
    const rank = rankBase(L, s.req);
    assert.equal(isKnown(h.p, s), L >= s.req, `${s.id} conocida a Nv${L}`);
    assert.equal(prof.rank, rank, `${s.id} Nv${L}: rango ${rank}`);
    assert.ok(Math.abs(prof.coef - (s.coef || 0) * (1 + 0.1 * (rank - 1))) < 1e-9, `${s.id} Nv${L}: coef por rango`);
    assert.equal(prof.cost, s.cost || 0, `${s.id}: coste`);
    assert.ok(prof.cd <= (s.cd || 0) + 1e-9 && (!(s.cd > 0) || prof.cd > 0), `${s.id}: enfriamiento`);
    assert.equal(prof.gcd, s.cat !== 'basic' && s.cat !== 'movement', `${s.id}: GCD solo fuera de básico/movilidad`);
    if (s.cat === 'basic') assert.equal(prof.gen, s.gen);
  }
  if (L === 50) assert.equal(resolveSkill(h.p, S('m_dardo')).rank, 5, 'rango 5 (tope base) a Nv50');
}
console.log('resolveSkill en Nv1/Nv20/Nv50: rango por nivel, coef ×(1+0,1·(rango−1)), coste/enfriamiento ✓');

// ------------------------------------------------ 4) comportamientos (canal real)
const noCrit = h => { h.p.stats.critRaw = -1000; h.p.stats.crit = -1000; };
const lost = e => e.maxHP - e.hp;

// Ascua: golpe + salpicadura; el Maná llega AL IMPACTAR
{
  const h = makeHarness({ classId: 'maga', level: 10 }); noCrit(h);
  const e = h.enemy({ hp: 1e6, pos: [4, 0, 0] });
  const n = h.enemy({ hp: 1e6, pos: [4.8, 0, 0.9] });
  const far = h.enemy({ hp: 1e6, pos: [9, 0, 6] });
  h.aim(4, 0); h.setSlot('lmb', 'm_ascua');
  h.p.mp = 50;
  assert.equal(h.cast('lmb'), true);
  assert.equal(h.p.mp, 50, 'no genera al lanzar');
  const regen = resourceRegenRate(resourceDefFor(h.p.cls), h.p.stats) * 0.6;
  h.step(0.6);
  assert.ok(lost(e) > 0 && lost(n) > 0 && lost(far) === 0, 'golpe directo + salpicadura a 1,5 m');
  assert.ok(lost(e) > lost(n) * 1.8, `el objetivo recibe 0,75 y los cercanos 0,3 (${lost(e)} vs ${lost(n)})`);
  assert.ok(Math.abs(h.p.mp - regen - 53) < 0.1, `+3 de Maná al acertar (mp ${h.p.mp.toFixed(2)}, regen ${regen.toFixed(2)})`);
  assert.ok(h.p.atkCd > 0, 'cadencia del básico');
  console.log('Ascua: estalla al impactar (0,75 + 0,3 en 1,5 m) y genera +3 al acertar ✓');
}

// Toque Gélido: cono, ralentiza 20 %, +4 de Maná
{
  const h = makeHarness({ classId: 'maga', level: 10 });
  const e = h.enemy({ hp: 1e6, pos: [2.5, 0, 0] });
  const back = h.enemy({ hp: 1e6, pos: [-2.5, 0, 0] });
  h.aim(3, 0); h.setSlot('lmb', 'm_toque'); h.p.mp = 50;
  assert.equal(h.cast('lmb'), true);
  assert.ok(lost(e) > 0 && lost(back) === 0, 'solo el cono delantero');
  assert.ok(e.slowT > 0 && e.slowPct === 20, `ralentiza 20 % (${e.slowPct})`);
  assert.ok(Math.abs(h.p.mp - 54) < 0.6, '+4 de Maná');
  console.log('Toque Gélido: cono de 70°, ralentiza 20 % 1,5 s, +4 de Maná ✓');
}

// Bola de Fuego: el daño llega AL IMPACTAR y explota en 2 m
{
  const h = makeHarness({ classId: 'maga', level: 10 }); noCrit(h);
  const e = h.enemy({ hp: 1e6, pos: [0, 0, 5] });
  const n = h.enemy({ hp: 1e6, pos: [1.2, 0, 6] });
  h.aim(0, 5); h.setSlot('rmb', 'bola_fuego');
  const mp0 = h.p.mp;
  assert.equal(h.cast('rmb'), true);
  assert.equal(h.p.mp, mp0, 'lanzamiento de 0,3 s: el coste se cobra al soltarla');
  h.step(0.32);
  assert.ok(h.p.mp <= mp0 - 18 + 2 && h.p.mp >= mp0 - 18, `cuesta 18 (${h.p.mp} de ${mp0}, con regeneración)`);
  assert.equal(lost(e), 0, 'aún no impacta');
  h.step(0.7);
  assert.ok(lost(e) > 0 && lost(n) > 0, 'golpe directo + explosión');
  // Paso 2e: la explosión (2,5 → 3,5 con la manada que camina) pesa más que el impacto
  // directo (2,2): la Bola es de área (golpes pequeños a Nv10: ±25 % por redondeo)
  const ratio = S('bola_fuego').splash / S('bola_fuego').coef;
  assert.ok(lost(n) > lost(e) * ratio * 0.75 && lost(n) < lost(e) * ratio * 1.25, `directo 2,2 frente a salpicadura 3,5 (${lost(e)} vs ${lost(n)})`);
  console.log('Bola de Fuego: daño al impactar + explosión de 2 m ✓');
}

// Dos gastadoras: GCD 0,2 s (y el bloqueo de 0,3 s de la Bola) y enfriamientos independientes
{
  const h = makeHarness({ classId: 'maga', level: 20 });
  h.enemy({ hp: 1e6, pos: [0, 0, 5] }); h.aim(0, 5);
  h.setSlot('rmb', 'bola_fuego'); h.setSlot('k2', 'rayo');
  assert.equal(h.cast('rmb'), true);
  assert.equal(h.cast('k2'), false, 'GCD/lanzamiento: no se encadenan en el mismo instante');
  h.step(0.35);
  assert.equal(h.cast('k2'), true, 'tras el GCD y el bloqueo, la segunda gastadora sale');
  assert.equal(h.cast('rmb'), false, 'la Bola sigue en enfriamiento');
  assert.ok(h.p.cds.bola_fuego > 0 && h.p.cds.rayo > 0, 'cada una conserva su enfriamiento');
  h.step(1.5);
  assert.equal(h.cast('rmb'), true, 'Bola de nuevo (1,5 s desde que se soltó)');
  console.log('Ranura 2 ofensiva: Bola (🖱️Der) + Rayo (2) con GCD y enfriamientos propios ✓');
}

// Nova de Hielo y Meteoro (tipos genéricos)
{
  const h = makeHarness({ classId: 'maga', level: 20 });
  const e = h.enemy({ hp: 1e6, pos: [2, 0, 0] });
  h.setSlot('rmb', 'nova_hielo');
  assert.equal(h.cast('rmb'), true);
  assert.ok(lost(e) > 0 && e.slowT > 2.5 && e.slowPct === 30, 'Nova: daño + 30 % 3 s');
  const m = h.enemy({ hp: 1e6, pos: [6, 0, 0] });
  h.aim(6, 0); h.setSlot('k2', 'meteoro'); h.step(0.25);
  assert.equal(h.cast('k2'), true);
  h.step(0.5); assert.equal(lost(m), 0, 'Meteoro: aún cae');
  h.step(0.2); assert.ok(lost(m) > 0, 'Meteoro: impacta a 0,6 s');
  console.log('Nova de Hielo (ralentiza 30 %) y Meteoro (impacto a 0,6 s) ✓');
}

// Paso de Escarcha: desliz de 6 m + estela que ralentiza 40 %
{
  const h = makeHarness({ classId: 'maga', level: 10 });
  const e = h.enemy({ hp: 1e6, pos: [3, 0, 0.6] });
  h.aim(10, 0); h.setSlot('k1', 'm_paso_escarcha');
  assert.equal(h.cast('k1'), true);
  assert.ok(Math.abs(h.p.pos.x - 6) < 0.05 && Math.abs(h.p.pos.z) < 1e-6, `se desliza 6 m (x=${h.p.pos.x.toFixed(2)})`);
  assert.ok((h.g.fields || []).filter(f => f.kind === 'zona').length >= 3, 'deja una estela de campos');
  h.step(0.4);
  assert.ok(e.slowT > 0 && e.slowPct === 40, 'la estela ralentiza 40 %');
  assert.equal(lost(e), 0, 'la estela helada no hace daño');
  assert.equal(h.p.gcdT, 0, 'la movilidad está fuera del GCD');
  h.step(3);
  assert.equal((h.g.fields || []).length, 0, 'la estela dura 3 s');
  console.log('Paso de Escarcha: desliz 6 m, estela 3 s que ralentiza 40 % ✓');
}

// Estela Ígnea: desliz dejando fuego (0,4 WD/s)
{
  const h = makeHarness({ classId: 'maga', level: 12 });
  const e = h.enemy({ hp: 1e6, pos: [4, 0, 0.4] });
  h.aim(10, 0); h.setSlot('k1', 'm_estela_ignea');
  assert.equal(h.cast('k1'), true);
  assert.ok(h.p.pos.x > 5.9, 'se desliza 6 m');
  h.step(1.0);
  const avg = h.p.avgHit(resolveSkill(h.p, S('m_estela_ignea')).coef);
  assert.ok(lost(e) > 0 && lost(e) < avg * 2.5, `el rastro quema (~0,4 WD/s; ${lost(e)} en 1 s, WD/s ${avg.toFixed(1)})`);
  console.log('Estela Ígnea: rastro de fuego de 3 s ✓');
}

// Armadura de Hielo: escudo del 30 % de la vida 8 s, enfriamiento 12 s (2e)
{
  const h = makeHarness({ classId: 'maga', level: 6 });
  h.setSlot('k2', 'm_armadura');
  assert.equal(h.cast('k2'), true);
  const sh = h.p.shieldTotal();
  assert.ok(Math.abs(sh - Math.round(0.30 * h.p.stats.maxHP)) <= 1, `escudo 30 % (${sh} de ${h.p.stats.maxHP})`);
  const hp0 = h.p.hp;
  h.p.takeDamage(Math.floor(sh / 2), 1, { element: 'fire' });
  assert.equal(h.p.hp, hp0, 'el escudo absorbe antes que la vida');
  assert.equal(h.p.cds.m_armadura, 12);
  console.log('Armadura de Hielo: escudo del 30 % de la vida máxima ✓');
}

// Onda Repulsora: daño, empuje de 5 m y aturdimiento
{
  const h = makeHarness({ classId: 'maga', level: 12 });
  const e = h.enemy({ hp: 1e6, pos: [2, 0, 0] });
  h.setSlot('k2', 'm_onda');
  assert.equal(h.cast('k2'), true);
  assert.ok(lost(e) > 0, 'daña');
  assert.ok(e.pos.x > 6.5, `empuja ~5 m (x=${e.pos.x.toFixed(2)})`);
  assert.ok(e.stunT > 0, 'aturde');
  const boss = h.enemy({ hp: 1e6, boss: true, pos: [1, 0, 1] });
  h.p.cds.m_onda = 0; h.p.gcdT = 0;
  h.cast('k2');
  assert.ok(Math.hypot(boss.pos.x - 1, boss.pos.z - 1) < 1e-6, 'a los jefes no los empuja');
  console.log('Onda Repulsora: 0,8 WD, empuja 5 m y aturde 0,5 s (jefes no se empujan) ✓');
}

// Supernova: windup 0,15 + telegrafía 0,5, TRES ondas de 4,7 WD (2b.2: golpe máximo ≤ 21 % del jefe) y Quemadura de 12 WD (2e)
{
  const h = makeHarness({ classId: 'maga', level: 20 }); noCrit(h);
  const e = h.enemy({ hp: 1e7, pos: [5, 0, 0] });
  h.aim(5, 0); h.setSlot('k4', 'm_u_supernova');
  assert.equal(h.cast('k4'), true);
  h.step(0.6); assert.equal(lost(e), 0, 'telegrafía: aún no estalla');
  h.step(0.1); const first = lost(e); assert.ok(first > 0, 'primera onda a 0,65 s');
  h.step(0.25); const second = lost(e); assert.ok(second > first * 1.6, 'segunda onda 0,25 s después');
  h.step(0.25); const third = lost(e); assert.ok(third > second * 1.3, 'tercera onda 0,25 s después');
  assert.ok(Object.keys(e._dots || {}).some(k => k.includes('burn')), 'deja Quemadura');
  h.step(6.5);
  const burn = lost(e) - third;
  const prof = resolveSkill(h.p, S('m_u_supernova'));
  const want = h.p.avgHit(prof.coef * S('m_u_supernova').burn / S('m_u_supernova').coef, prof.addPct);
  assert.ok(burn > want * 0.8 && burn < want * 1.2, `Quemadura ≈ 12 WD (${burn} vs ${want.toFixed(0)})`);
  assert.equal(h.p.cdMax.m_u_supernova, 50, 'enfriamiento 50 s');
  console.log('Supernova: 3 ondas de 4,7 WD + Quemadura de 12 WD (≈26 WD) ✓');
}

// Tormenta Glacial: te sigue, ralentiza y congela al 5.º golpe
{
  const h = makeHarness({ classId: 'maga', level: 20 });
  const a = h.enemy({ hp: 1e6, pos: [2, 0, 0] });
  h.setSlot('k4', 'm_u_tormenta');
  assert.equal(h.cast('k4'), true);
  assert.ok(lost(a) > 0 && a.slowT > 0, 'primer pulso al lanzarla');
  h.p.pos.set(30, 0, 0);                               // la Maga se aleja: la tormenta la sigue
  const b = h.enemy({ hp: 1e6, pos: [32, 0, 0] });
  const aLost = lost(a);
  let frozen = false;
  for (let i = 0; i < 30; i++) { h.step(0.1); if (b.frozenT > 0) frozen = true; }
  assert.equal(lost(a), aLost, 'ya no golpea donde estaba');
  assert.ok(lost(b) > 0, 'golpea alrededor de la Maga');
  assert.ok(frozen, 'congela tras 5 golpes');
  h.step(6);
  const bl = lost(b); h.step(1); assert.equal(lost(b), bl, 'dura 8 s');
  console.log('Tormenta Glacial: te sigue 8 s, ralentiza y congela con rendimientos decrecientes ✓');
}

// Desgarro Arcano: canalización imparable (un golpe fuerte no la corta), soltar sí
{
  const h = makeHarness({ classId: 'maga', level: 20 });
  const e = h.enemy({ hp: 1e7, pos: [0, 0, 4] });
  let ticks = 0;
  const orig = e.takeDamage.bind(e);
  e.takeDamage = (a, c, o) => { ticks++; return orig(a, c, o); };
  h.aim(0, 4); h.setSlot('k4', 'm_u_desgarro');
  assert.equal(h.cast('k4'), true);
  assert.ok(h.p.castLock > 0 && h.p.unstoppableT > 0, 'bloquea y es imparable');
  h.step(1.1);
  h.p.takeDamage(h.p.stats.maxHP * 0.3, 1, { element: 'arcane' });
  assert.ok(h.g._channel, 'un golpe > 10 % NO la interrumpe (imparable)');
  h.step(2.2);
  assert.equal(ticks, 6, `6 tics en 3 s (${ticks})`);
  assert.equal(h.g._channel, null); assert.equal(h.p.castLock, 0); assert.equal(h.p.unstoppableT, 0);
  // soltar la tecla la corta
  const h2 = makeHarness({ classId: 'maga', level: 20 });
  const e2 = h2.enemy({ hp: 1e7, pos: [0, 0, 4] });
  h2.aim(0, 4); h2.setSlot('k4', 'm_u_desgarro');
  h2.cast('k4'); h2.g.input.held = () => false; h2.step(1);
  assert.equal(lost(e2), 0, 'soltar la tecla corta la canalización');
  assert.equal(h2.g._channel, null);
  // la esquiva también
  const h3 = makeHarness({ classId: 'maga', level: 20 });
  h3.enemy({ hp: 1e7, pos: [0, 0, 4] }); h3.aim(0, 4); h3.setSlot('k4', 'm_u_desgarro');
  h3.cast('k4'); assert.equal(h3.g.cancelCast('dodge'), true);
  assert.equal(h3.g._channel, null); assert.equal(h3.p.unstoppableT, 0);
  console.log('Desgarro Arcano: 6,5 WD/s × 3 s, imparable; soltar o esquivar lo cortan ✓');
}

console.log('\n✅ HABILIDADES DE LA MAGA OK');
