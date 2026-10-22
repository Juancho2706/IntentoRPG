// Paso 2 (2f + 2g) — PODERES y ACTIVAS DE TALENTO del GUERRERO (js/powers-guerrero.js, árboles v2)
//  (a) cobertura: todo power y grant de los árboles existe y se lanza; un nodo por poder
//  (b) activas de talento (D29): definición válida, comportamiento y VFX
//  (c) definePower rechaza claves desconocidas · (d) sin `mult` nuevo (solo m_berserk)
//  (e) los poderes v1 retirados ya no están registrados
//  (f) reglas transversales: suelo de las definitivas, innatas, sin p.cds escrito a mano
//  (g) textos de los poderes de los nodos: cortos, en español y sin jerga
//  (h) combate largo con TODOS los nodos de cada especialización (A y B): sin errores ni NaN
// El efecto de cada nodo lo prueba tests/test-talentos-guerrero.mjs.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeHarness } from './helpers/power-harness.mjs';
import { missingFor, talentRefs, KEY_NODE_MULTS } from './helpers/talent-coverage.mjs';
import { POWER_HOOKS, SKILL_BEHAVIORS, definePower } from '../js/powers.js';
import { CLASSES } from '../js/data.js';
import { validateSkillDef } from '../js/skill-defs.js';
import { resolveSkill } from '../js/skill-resolve.js';
import { SKILL_FX, SKILL_FX_PRESETS } from '../js/fx-skills.js';
import { gaugeValue, gaugeMax, gaugeSeq } from '../js/spec-mechanics.js';
import { TALENT_TREES } from '../js/talents.js';
import { GUERRERO_TALENT_SKILLS } from '../js/talents-guerrero.js';
import { guerreroPowers } from '../js/powers-guerrero.js';

globalThis.performance = globalThis.performance || { now: () => Date.now() };
const warns = [];
console.warn = (...a) => { warns.push(a.map(String).join(' ')); };
const approx = (a, b, e = 1e-6) => Math.abs(a - b) <= e;
const TT = TALENT_TREES.guerrero;
const SRC = readFileSync(new URL('../js/powers-guerrero.js', import.meta.url), 'utf8');
const OWN = guerreroPowers();
const mk = (spec, specRanks = {}, choice = {}) => makeHarness({ classId: 'guerrero', spec, level: 100, seed: 7, talents: { specRanks, choice } });
const prof = (h, id) => resolveSkill(h.p, h.p.cls.skills.find(s => s.id === id));

// ------------------------------------------------ (a) cobertura
assert.deepEqual(missingFor('guerrero'), { powers: [], behaviors: [], skills: [] });
const refs = talentRefs('guerrero');
{
  const seen = new Map();
  for (const tree of [TT.cls, ...TT.specs, ...TT.hero]) for (const n of tree.nodes)
    for (const [k, fx] of n.t === 'c' ? (n.opts || []).map(o => [`${n.id}${o.k}`, o.fx || {}]) : [[n.id, n.fx || {}]]) {
      if (!fx.power) continue;
      assert.ok(!seen.has(fx.power), `${fx.power} en dos nodos: ${seen.get(fx.power)} y ${k}`);
      seen.set(fx.power, k);
      // poderes propios con el prefijo de la clase; m_berserk (b0) es la pasiva común del Berserker
      assert.ok(fx.power === 'm_berserk' ? !OWN[fx.power] : /^g_[a-z0-9_]+$/.test(fx.power) && OWN[fx.power], `${k}: ${fx.power} es de powers-guerrero.js`);
    }
  assert.equal(seen.size, refs.powers.size, 'un nodo por poder');
  assert.ok(refs.powers.size >= 110, `poderes de los nodos (${refs.powers.size})`);
}
console.log(`(a) ${refs.powers.size} poderes de los nodos registrados, uno por nodo ✓`);

// ------------------------------------------------ (b) activas de talento (D29)
const TALENT = CLASSES.guerrero.skills.filter(s => s.kind === 'talent');
assert.deepEqual(TALENT.map(s => s.id).sort(), [...GUERRERO_TALENT_SKILLS].sort(), 'las 6 activas de talento de la clase');
assert.deepEqual([...refs.grants].sort(), [...GUERRERO_TALENT_SKILLS].sort(), 'cada activa la concede un nodo');
for (const s of TALENT) {
  assert.deepEqual(validateSkillDef(s, { behaviors: SKILL_BEHAVIORS }), [], s.id);
  if (s.behavior) assert.ok(SKILL_BEHAVIORS[s.behavior]?.cast, `${s.id}: comportamiento con cast`);
  const fx = SKILL_FX[s.id];
  assert.ok(fx && fx.sfx, `${s.id}: VFX/SFX`);
  for (const k of ['trail', 'impact', 'aura', 'extra']) if (typeof fx[k] === 'string') assert.ok(SKILL_FX_PRESETS[fx[k]], `${s.id}: preset ${fx[k]}`);
}
// los efectos que citan los poderes existen
for (const [, name] of SRC.matchAll(/fxAt\(g, '([A-Za-z]+)'/g)) assert.ok(SKILL_FX_PRESETS[name], `preset citado por los poderes: ${name}`);
console.log('(b) activas de talento válidas, con comportamiento y VFX ✓');

// ------------------------------------------------ (c) y (d)
assert.throws(() => definePower('t_mal_guerrero', { onHitt() {} }), /clave desconocida/);
for (const id of refs.powers) if (!KEY_NODE_MULTS.includes(id)) assert.ok(!POWER_HOOKS[id].mult, `${id}: sin mult`);
assert.ok(POWER_HOOKS.m_berserk.mult, 'm_berserk conserva su multiplicador');
console.log('(c) definePower rechaza claves desconocidas · (d) ningún mult nuevo ✓');

// ------------------------------------------------ (e) poderes v1 retirados (2c: nodos s*, x*, activas g_t_*)
const RETIRED = ['g_ascension', 'g_bastion_eterno', 'g_carnicero', 'g_consagracion', 'g_desafio_firme', 'g_desenfreno', 'g_devocion',
  'g_devocion_ferviente', 'g_estandarte_grupo', 'g_instinto_asesino', 'g_intercesion', 'g_juramento', 'g_luz_alba', 'g_luz_sanadora',
  'g_mano_sanadora', 'g_martillo_bendito', 'g_martillo_pesado', 'g_martillos', 'g_martillos_juicio', 'g_matanza_eterna', 'g_muralla_viva',
  'g_remolino_sediento', 'g_represalia', 'g_reto', 'g_sentencia', 'g_venganza', 'g_vinculo',
  'g_t_bramido', 'g_t_carga', 'g_t_desafio', 'g_t_devocion', 'g_t_ira_ciega', 'g_t_muro', 'g_t_remolino', 'g_t_temeridad', 'g_t_veredicto'];
for (const id of RETIRED) {
  assert.ok(!OWN[id] && !POWER_HOOKS[id] && !SKILL_BEHAVIORS[id], `${id}: retirado`);
  assert.ok(!new RegExp(`'${id}'`).test(SRC), `${id}: ya no lo cita powers-guerrero.js`);
}
// m_aegis (Muro Inquebrantable) y m_judgment también salen (§11.3): ningún nodo los lleva y ya no
// están en js/powers-common.js (E5)
for (const id of ['m_aegis', 'm_judgment']) {
  assert.ok(!refs.powers.has(id), `${id}: ningún nodo del Guerrero lo lleva`);
  assert.ok(!new RegExp(`'${id}'`).test(SRC), `${id}: no lo cita powers-guerrero.js`);
  assert.ok(!POWER_HOOKS[id], `${id}: ya no está registrado`);
}
console.log(`(e) ${RETIRED.length} poderes v1 retirados (y m_aegis, m_judgment sin nodo) ✓`);

// ------------------------------------------------ (f) reglas transversales
// sin p.cds escrito a mano (D2: g.reduceCooldown); sin powers.has; sin setTimeout ni Math.random
{
  const code = SRC.replace(/\/\/.*$/gm, '');
  assert.ok(!/\bp\.cds(\[[^\]]+\]|\.\w+)\s*(=(?!=)|[-+*/]=)/.test(code), 'powers-guerrero.js no escribe p.cds');
  assert.ok(!/\bsetTimeout\(|Math\.random\(/.test(code), 'retardos por timers.js y azar por rng.js');
}
// suelo de las definitivas: la recarga efectiva del Cataclismo no baja del 70 % aunque Gracia del Cielo
// (z20) la recorte con muchos Veredictos
{
  const h = mk('cruzado', { z20: 3 });
  h.enemy({ hp: 1e9, pos: [2.5, 0, 0] });
  const t0 = h.p.simT;
  h.g._startCooldown(h.p, 'g_u_cataclismo', prof(h, 'g_u_cataclismo'));
  const base = h.p.cds.g_u_cataclismo;
  for (let i = 0; i < 10; i++) {
    h.gauge('fervor', 3);
    h.setSlot('rmb', 'g_martillo'); h.aim(2.5, 0); h.p.mp = 100;
    h.press('rmb'); h.step(0.05); h.release('rmb'); h.step(0.6);
  }
  const eff = h.p.simT - t0 + h.p.cds.g_u_cataclismo;
  assert.ok(h.p.cds.g_u_cataclismo > 0 && approx(eff, base * 0.7, 0.05), `Cataclismo: nunca baja del 70 % (${eff.toFixed(2)} s de ${base} s)`);
}
// el suelo es del 70 % de la recarga BASE del catálogo (nota 13 del plan), no de la ya reducida: con
// −20 % de enfriamiento (48 s) el suelo fraccionario del núcleo (cdFloor 0,7 → 33,6 s) no basta;
// lo pone el poder (42 s)
{
  const h = mk('cruzado', { z20: 3 });
  h.p.talentExtra = { stats: { cdr: 20 } };
  h.p.recompute();
  h.enemy({ hp: 1e9, pos: [2.5, 0, 0] });
  const t0 = h.p.simT;
  h.g._startCooldown(h.p, 'g_u_cataclismo', prof(h, 'g_u_cataclismo'));
  const base = h.p.cds.g_u_cataclismo, catalog = h.p.cls.skills.find(s => s.id === 'g_u_cataclismo').cd;
  assert.ok(approx(base, catalog * 0.8, 0.01), `con −20 % de enfriamiento, ${base} s`);
  for (let i = 0; i < 10; i++) {
    h.gauge('fervor', 3);
    h.setSlot('rmb', 'g_martillo'); h.aim(2.5, 0); h.p.mp = 100;
    h.press('rmb'); h.step(0.05); h.release('rmb'); h.step(0.6);
  }
  const eff = h.p.simT - t0 + h.p.cds.g_u_cataclismo;
  assert.ok(h.p.cds.g_u_cataclismo > 0 && approx(eff, catalog * 0.7, 0.05), `Cataclismo: nunca baja del 70 % de su base (${eff.toFixed(2)} s de ${catalog} s)`);
}
// innatas: el Guardián bloquea un 15 % más (con escudo), genera el triple de amenaza y tiene +5 % de
// vida (§11.2); las otras, sin stats (el healPct 30 del Cruzado v1 no está en el diseño: pendientes §4.3)
{
  const b = mk('berserker'), d = mk('guardian'), z = mk('cruzado');
  assert.equal(d.p.stats.block, b.p.stats.block, 'Guardián: sin escudo, sin bloqueo');
  for (const x of [b, d]) { x.p.equipment.offhand = { slot: 'offhand', icon: '🛡️', name: 'Escudo de prueba', stats: {} }; x.p.recompute(); }
  assert.equal(d.p.stats.block - b.p.stats.block, 15, 'Guardián: con escudo, +15 % de bloqueo');
  assert.ok(d.p.stats.threatMult === 3 && b.p.stats.threatMult === 1 && z.p.stats.threatMult === 1, 'Guardián: amenaza ×3');
  assert.equal(d.p.stats.hpPct - b.p.stats.hpPct, 5, 'Guardián: +5 % de vida');
  assert.ok(b.p.stats.healPct === z.p.stats.healPct && b.p.stats.hpPct === z.p.stats.hpPct, 'Berserker y Cruzado sin stats innatas');
  // topes propios del Guardián (drCapAdd 15, blockCapAdd 10: solo de la innata): con dr 80 y block 70
  // (con escudo), 65 y 50; las otras especializaciones, los topes comunes 50 y 40
  for (const x of [b, d, z]) { x.p.talentExtra.stats = { dr: 80, block: 70 }; x.p.recompute(); }
  assert.ok(d.p.stats.dr === 65 && d.p.stats.block === 50, `Guardián: topes 65 y 50 (${d.p.stats.dr}, ${d.p.stats.block})`);
  assert.ok(b.p.stats.dr === 50 && b.p.stats.block === 40 && z.p.stats.dr === 50, `Berserker y Cruzado: 50 y 40 (${b.p.stats.dr}, ${b.p.stats.block})`);
  // Piel de Hierro del Guardián (innate.mod): 12 s y −50 %, lanzada de verdad y una sola vez (d0 ya no la suma)
  for (const x of [b, d]) { x.p.talentExtra.stats = {}; x.p.recompute(); x.setSlot('k2', 'g_piel'); x.cast('k2'); }
  const piel = x => x.p.buffs.find(f => f.id === 'g_piel');
  assert.ok(approx(piel(d).t, 12, 0.05) && approx(piel(b).t, 8, 0.05), `Guardián: Piel de Hierro 12 s (${piel(d).t} frente a ${piel(b).t})`);
  assert.ok(approx(piel(d).stats.dr / piel(b).stats.dr, 1.25, 0.02), `Guardián: −50 % frente a −40 % (×1,25: ${piel(d).stats.dr} / ${piel(b).stats.dr})`);
}
// Cruzado solo: el Martillo Piadoso te cura a ti (eres el aliado con menos vida)
{
  const h = mk('cruzado');
  const e = h.enemy({ hp: 1e9 });
  h.p.hp = h.p.stats.maxHP * 0.5;
  const hp0 = h.p.hp;
  h.g.onPlayerHit(e, { dealt: 1e5, raw: 1e5, crit: false, skill: 'g_martillo', tags: new Set(['spender', 'holy']), elem: 'holy', proc: false, dot: false, source: 'hit', pos: { x: 0, z: 0 } });
  assert.ok(h.p.hp > hp0 && h.p.hp - hp0 <= h.p.stats.maxHP * 0.012 + 1, `Martillo Piadoso: solo, te cura a ti (≤ 1 %/s) (${h.p.hp - hp0})`);
}
console.log('(f) sin p.cds a mano, suelo de las definitivas e innatas ✓');

// ------------------------------------------------ (g) textos de los poderes de los nodos
for (const id of refs.powers) {
  if (id === 'm_berserk') continue;
  const d = OWN[id];
  assert.ok(typeof d.name === 'string' && d.name.length >= 3 && d.name.length <= 28, `${id}: nombre corto (${d.name})`);
  assert.ok(typeof d.desc === 'string' && d.desc.length >= 20 && d.desc.length <= 140 && /\.$/.test(d.desc), `${id}: descripción corta con punto (${d.desc})`);
  assert.ok(!/stagger|\bprocs?\b|\bDoT\b|\bCC\b|\bUNI\b|\bcd\b|\bbuff\b/i.test(d.name + ' ' + d.desc), `${id}: sin jerga (${d.desc})`);
}
console.log('(g) nombres y descripciones de los poderes ✓');

// ------------------------------------------------ (h) combate largo con todos los nodos
// cada especialización con TODOS sus nodos al rango máximo (elecciones A y luego B): 30 s de combate
// real con la barra completa, aliados y enemigos que mueren y vuelven. Ningún poder avisa de un
// error, nada queda en NaN y las recargas son números válidos.
const BAR = {
  berserker: { rmb: 'g_rajar', k1: 'g_salto', k2: 'g_piel', k3: 'g_remolino', k4: 'g_u_furia' },
  guardian: { rmb: 'terremoto', k1: 'g_carga_escudo', k2: 'g_piel', k3: 'g_guardia', k4: 'g_u_ciudadela' },
  cruzado: { rmb: 'g_martillo', k1: 'g_sendero', k2: 'g_piel', k3: 'g_juicio', k4: 'g_u_cataclismo' },
};
for (const sp of TT.specs) {
  for (const pick of ['A', 'B']) {
    const ranks = {}, choice = {};
    for (const n of sp.nodes) { ranks[n.id] = n.max || 1; if (n.t === 'c') choice[n.id] = pick; }
    const h = mk(sp.id, ranks, choice);
    const p = h.p;
    assert.ok(Object.keys(ranks).every(id => (p.talentAgg.ranks?.[id] ?? ranks[id]) > 0), `${sp.id}/${pick}: nodos puestos`);
    for (const [slot, id] of Object.entries(BAR[sp.id])) h.setSlot(slot, id);
    const allies = [h.ally(3, 2, 2000), h.ally(-2, 3, 1500)];
    const foes = () => (h.g.enemies || []).filter(e => e.alive);
    let waves = 0;
    const spawn = () => {
      waves++;
      for (const [x, z, o] of [[1.5, 0, {}], [1.2, 1.2, {}], [1.5, -1.2, { rank: 'elite', hp: 400 }], [2, 0.6, { boss: true, hp: 6000 }]])
        h.enemy({ hp: 200, pos: [p.pos.x + x, 0, p.pos.z + z], ...o });
    };
    spawn();
    const order = ['lmb', 'rmb', 'k1', 'rmb', 'k3', 'lmb', 'k2', 'rmb', 'k4', 'lmb', 'rmb'];
    const w0 = warns.length;
    for (let i = 0; i < 300; i++) {
      if (foes().length < 2) spawn();
      // los enemigos del arnés no persiguen: los que quedan lejos vuelven a tu lado
      for (const f of foes()) if (f.pos.distanceTo(p.pos) > 3) f.pos.copy(p.pos).add(f.pos.clone().sub(p.pos).setY(0).setLength(1.5));
      const e = foes().sort((a, b) => a.pos.distanceTo(p.pos) - b.pos.distanceTo(p.pos))[0];
      if (e) h.aim(e.pos.x, e.pos.z);
      p.mp = Math.max(p.mp, 40);
      const slot = order[i % order.length];
      const sk = BAR[sp.id][slot];
      if (sk && prof(h, sk).charge) { h.press(slot); h.step(i % 3 ? 0.3 : 1.0); h.release(slot); }
      else h.cast(slot);
      if (i % 7 === 0) p.takeDamage(p.stats.maxHP * 0.08, 1, { source: e || null, melee: true });
      if (i % 11 === 0) h.g.damageAlly(allies[i % 2], 120, { source: e || null });
      if (i % 25 === 0 && p.hp < p.stats.maxHP * 0.3) p.hp = p.stats.maxHP;
      if (!p.alive) { p.alive = true; p.hp = p.stats.maxHP; }
      h.step(0.1);
    }
    const tag = `${sp.id}/${pick}`;
    const seq = gaugeSeq(p, sp.mechanic);
    assert.ok(waves >= 2 && seq.gain >= 5 && seq.full >= 1, `${tag}: hubo combate de verdad (${waves} oleadas, ${JSON.stringify(seq)})`);
    assert.deepEqual(warns.slice(w0).filter(w => /poder|indicador|canalización|comportamiento|Error/i.test(w)), [], `${tag}: ningún poder falla`);
    assert.ok(Number.isFinite(p.hp) && Number.isFinite(p.mp) && Number.isFinite(gaugeValue(p, sp.mechanic)), `${tag}: vida, Furia y ${sp.mechanic} son números`);
    assert.ok(gaugeValue(p, sp.mechanic) >= 0 && gaugeValue(p, sp.mechanic) <= gaugeMax(p, sp.mechanic), `${tag}: ${sp.mechanic} dentro de su máximo`);
    for (const [id, t] of Object.entries(p.cds || {})) assert.ok(Number.isFinite(t) && t >= 0, `${tag}: recarga de ${id} (${t})`);
    for (const a of allies) assert.ok(Number.isFinite(a.hp) && a.shields.every(s => Number.isFinite(s.amt)), `${tag}: aliados con números`);
    for (const e of h.g.enemies) assert.ok(Number.isFinite(e.hp), `${tag}: enemigos con números`);
  }
}
console.log('(h) 30 s de combate con todos los nodos de cada especialización (A y B): sin errores ✓');

console.log('\n✅ PODERES DEL GUERRERO (2g): cobertura, activas, retirados, reglas, textos y combate largo');
if (process.env.VERBOSE) for (const w of warns) process.stderr.write(`aviso: ${w}\n`);
