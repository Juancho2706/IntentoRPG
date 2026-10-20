// Paso 2c.0 — primitivas de rol (docs/paso2-diseno.md §6): solitario hoy, cooperativo mañana
//  1) amenaza y provocación: forceTarget (objetivo forzado + amenaza = máx. + 10 %), la
//     amenaza decide el objetivo con histéresis (110 % cuerpo a cuerpo / 130 % a
//     distancia), × threatMult (Guardián ×3), la curación genera amenaza; el enemigo
//     ataca de verdad a la fuente con más amenaza (Enemy.update → combatTarget)
//  2) curas y escudos al aliado con MENOS vida (g.heal / g.shield, target 'lowest')
//  3) stagger de jefes: el control suma (aturdir 30/s, congelar 25, inmovilizar 15/s,
//     empujar 10, interrumpir 20, ralentizar ≥30 % 4/s, golpes 0,5 por 1 %), × staggerPct;
//     a 100 → Quebrantado 4 s (aturdido de verdad + Vulnerable) y barra bloqueada 15 s
//  4) control con rendimientos decrecientes por canal (élites normales; jefes solo stagger)
//  5) lanzamientos enemigos interrumpibles (enemy-abilities: ENEMY_CASTS)
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { makeHarness } from './helpers/power-harness.mjs';
import { talentMethods } from '../js/game-talents.js';
import { enemyAbilities, ENEMY_CASTS } from '../js/enemy-abilities.js';
import { STAGGER_BREAK_T, STAGGER_LOCK_T, staggerFromCC, THREAT_SWITCH, weaknessMult, VULN_PCT } from '../js/combat-math.js';

const approx = (a, b, e = 1e-6) => Math.abs(a - b) <= e;
// una fuente de amenaza que no es el jugador (Señuelo / aliado del cooperativo)
const decoy = (x, z) => ({ pos: new THREE.Vector3(x, 0, z), alive: true, hits: 0, takeDamage() { this.hits++; }, applySlow() {} });

// ------------------------------------------------ 1) amenaza y provocación
{
  const h = makeHarness({ classId: 'guerrero', level: 20 });
  const p = h.p, g = h.g;
  const e = h.enemy({ hp: 1e6, pos: [1, 0, 0] });
  assert.equal(e.combatTarget(p), p, 'en solitario el objetivo es el jugador');
  e.takeDamage(100, false, {});
  assert.equal(e.threatOf(p), 100, 'daño ×1 de amenaza');
  // provocación desde un señuelo: objetivo forzado y amenaza = máx. × 1,1
  const d = decoy(1.5, 0);
  assert.ok(g.forceTarget(e, d, 3) > 0);
  assert.equal(e.combatTarget(p), d, 'provocado: ataca al señuelo');
  assert.ok(approx(e.threatOf(d), 110), 'amenaza del provocador = máx. + 10 %');
  // el enemigo REALMENTE ataca al señuelo (Enemy.update → combatTarget)
  e.aggroed = true; e.atkCd = 0; e.def.range = 2.5;
  const hp0 = p.hp;
  e.update(0.05);
  assert.equal(d.hits, 1, 'el golpe va al señuelo');
  assert.equal(p.hp, hp0, 'y no al jugador');
  // termina la provocación: decide la amenaza con histéresis (cuerpo a cuerpo 110 %)
  e.tickStun(3.1);
  assert.equal(e.tauntSrc, null);
  assert.equal(e.combatTarget(p), d, 'sigue con el señuelo mientras tenga más amenaza');
  e.takeDamage(10, false, {});             // jugador 110 = señuelo 110: no supera el 110 % → no cambia
  assert.equal(e.combatTarget(p), d, 'histéresis: hace falta superar el 110 %');
  e.takeDamage(200, false, {});            // 310 > 110 × 1,1
  assert.equal(e.combatTarget(p), p, 'con más del 110 % vuelve al jugador');
  assert.equal(THREAT_SWITCH.ranged, 1.30);
  // fuentes muertas se olvidan
  d.alive = false; assert.equal(e.combatTarget(p), p);
  // jefes SÍ se provocan (sin rendimientos decrecientes)
  const b = h.enemy({ hp: 1e6, boss: true });
  for (let i = 0; i < 3; i++) assert.ok(b.applyCC('taunt', 2, { src: p }) === 2, 'provocación sin rendimientos decrecientes');
  assert.equal(b.tauntSrc, p);
  // threatMult: el Guardián genera ×3 de amenaza
  const gh = makeHarness({ classId: 'guerrero', level: 20, spec: 'guardian' });
  const ge = gh.enemy({ hp: 1e6 });
  ge.takeDamage(100, false, {});
  assert.equal(ge.threatOf(gh.p), 300, 'Guardián: amenaza ×3');
  // la curación genera amenaza (×0,5 repartida entre los enemigos en combate)
  const hh = makeHarness({ classId: 'guerrero', level: 20 });
  const e1 = hh.enemy({ hp: 1e6, pos: [2, 0, 0] }), e2 = hh.enemy({ hp: 1e6, pos: [-2, 0, 0] });
  e1.aggroed = e2.aggroed = true;
  hh.p.hp = hh.p.stats.maxHP - 100;
  const healed = hh.g.heal(100);
  assert.ok(healed > 0);
  assert.ok(approx(e1.threatOf(hh.p), healed * 0.5 / 2) && approx(e2.threatOf(hh.p), healed * 0.5 / 2), 'curación: ×0,5 repartida');
}
console.log('Amenaza y provocación: objetivo forzado, histéresis 110 %, ×3 del Guardián, amenaza de curación ✓');

// ------------------------------------------------ 2) curas y escudos al de menos vida
{
  const h = makeHarness({ classId: 'guerrero', level: 20 });
  const p = h.p, g = h.g;
  const ally = { pos: new THREE.Vector3(3, 0, 0), alive: true, hp: 40, stats: { maxHP: 100, healPct: 0 }, shields: [],
    healSkill(n) { const b = this.hp; this.hp = Math.min(this.stats.maxHP, this.hp + n); return this.hp - b; },
    addShield(n) { this.shields.push(n); return n; } };
  g.party = [ally];
  assert.equal(g.allies().length, 2, 'aliados = jugador + grupo');
  assert.equal(g.allies(p.pos, 2).length, 1, 'filtra por radio');
  p.hp = p.stats.maxHP;
  g.shield(50, { target: 'lowest' });
  assert.deepEqual(ally.shields, [50], 'el escudo va al aliado con menos % de vida');
  assert.equal(p.shieldTotal(), 0);
  g.heal(30, { target: 'lowest' });
  assert.equal(ally.hp, 70, 'la cura también');
  p.hp = 10;                                 // ahora el jugador es el de menos vida
  g.shield(40, { target: 'lowest' });
  assert.ok(p.shieldTotal() > 0, 'y si el jugador tiene menos vida, a él');
  g.shield(10, { target: 'all' });
  assert.equal(ally.shields.length, 2, "target 'all' a todos");
  g.party = [];
  assert.equal(g.allies().length, 1, 'en solitario, solo tú');
}
console.log('Curas y escudos: al aliado con menos vida, a todos o a ti (cooperativo listo) ✓');

// ------------------------------------------------ 3) stagger de jefes
{
  const h = makeHarness({ classId: 'maga', level: 20 });
  const p = h.p;
  const b = h.enemy({ hp: 1e6, boss: true });
  assert.ok(b.staggerView() && !h.enemy({ hp: 10 }).staggerView(), 'solo los jefes tienen barra');
  // cada control suma su parte y NO aturde
  b.applyCC('stun', 1, { src: p });   assert.ok(approx(b.stagger, 30) && b.stunT === 0, 'aturdir: 30 por s nominal');
  b.applyCC('root', 2, { src: p });   assert.ok(approx(b.stagger, 60) && b.rootT === 0, 'inmovilizar: 15 por s');
  b.applyCC('slow', 3, { pct: 20, src: p }); assert.ok(approx(b.stagger, 60), 'ralentizar < 30 %: nada');
  assert.ok(b.slowT > 0, 'pero la ralentización sí se aplica (×0,5 en jefes)');
  b.applyCC('slow', 2, { pct: 50, src: p }); assert.ok(approx(b.stagger, 68), 'ralentizar ≥ 30 %: 4 por s');
  b.applyCC('knock', 3, { src: p });  assert.ok(approx(b.stagger, 78), 'empujar: 10');
  b.applyCC('interrupt', 1, { src: p }); assert.ok(approx(b.stagger, 98), 'interrumpir: 20');
  assert.ok(b.silenceT > 0, 'la interrupción sí se aplica');
  b.takeDamage(Math.round(b.maxHP * 0.04), false, {});      // golpes: 0,5 por 1 % → +2 → 100
  assert.equal(b.staggerBreaks, 1, 'golpes: 0,5 por cada 1 % de la vida → Quebrantado');
  assert.equal(b.stagger, 0);
  assert.ok(approx(b.stunT, STAGGER_BREAK_T) && b.vulnT >= STAGGER_BREAK_T, 'Quebrantado: 4 s aturdido (ignora la resistencia) y Vulnerable');
  assert.ok(approx(weaknessMult(b.vulnT > 0 ? VULN_PCT : 0, 0), 1.2), 'Vulnerable en el saco Debilidad');
  const v = b.staggerView(); assert.ok(v.broken && !v.locked);
  assert.equal(b.applyCC('stun', 3, { src: p }), 0, 'durante el Quebrantado no suma');
  b.tickStun(STAGGER_BREAK_T + 0.01);
  assert.ok(b.staggerView().locked && b.stunT <= 0, 'después la barra queda bloqueada (gris)');
  assert.equal(b.addStagger(50, p), 0, 'bloqueada: no suma');
  b.tickStun(STAGGER_LOCK_T);
  assert.ok(b.addStagger(10, p) > 0, 'a los 15 s vuelve a sumar');
  // staggerPct del héroe (Crionte +25)
  const c = makeHarness({ classId: 'maga', level: 20, spec: 'crionte' });
  const cb = c.enemy({ hp: 1e6, boss: true });
  cb.applyCC('stun', 1, { src: c.p });
  assert.ok(approx(cb.stagger, 30 * 1.25), 'Crionte: +25 % de stagger');
  assert.ok(approx(staggerFromCC('freeze', 9), 25), 'congelar: 25 por aplicación');
  // stagger propio de la habilidad (sk.stagger) en el perfil → al golpear a un jefe
  const pb = c.enemy({ hp: 1e6, boss: true, pos: [0, 0, 4] });
  pb.applyCC('freeze', 1, { src: c.p, stagger: 20 });
  assert.ok(approx(pb.stagger, 20 * 1.25 + 25 * 1.25), 'opts.stagger extra (Prisión 20/35, Contrahechizo…) × staggerPct');
  // un élite NO tiene stagger: rendimientos decrecientes normales
  const el = c.enemy({ hp: 1e6, rank: 'elite', pos: [4, 0, 0] });
  assert.ok(el.applyCC('stun', 1, { src: c.p }) > 0 && el.stunT > 0 && el.stagger === 0, 'élite: aturdimiento normal');
}
console.log('Stagger: control y golpes llenan la barra, Quebrantado 4 s + Vulnerable, bloqueo 15 s, staggerPct ✓');

// ------------------------------------------------ 4) rendimientos decrecientes por canal
{
  const h = makeHarness({ classId: 'guerrero', level: 10 });
  const e = h.enemy({ hp: 1e6 });
  assert.ok(approx(e.applyCC('stun', 1), 1)); e.stunT = 0;
  assert.ok(approx(e.applyCC('freeze', 1), 0.65), 'canal duro: +0,35 por aplicación (congelar comparte con aturdir)'); e.stunT = 0;
  assert.ok(approx(e.applyCC('stun', 1), 0.30)); e.stunT = 0;
  assert.equal(e.applyCC('stun', 1), 0, 'con ≥ 0,9 de resistencia: inmune');
  e.tickStun(2);
  assert.ok(e.applyCC('stun', 1) > 0, 'la resistencia decae 0,12/s');
  assert.ok(approx(e.applyCC('root', 1), 1), 'inmovilizar tiene su propio canal'); e.rootT = 0;
  assert.ok(approx(e.applyCC('root', 1), 0.75), '+0,25 por aplicación');
  assert.equal(e.applyCC('slow', 3, { pct: 40 }), 3);
  assert.equal(e.applyCC('slow', 3, { pct: 20 }), 0, 'ralentizar: gana el más fuerte');
  e.applyCC('slow', 3, { pct: 95 }); assert.equal(e.slowPct, 70, 'tope 70 %');
  assert.equal(e.applyCC('interrupt', 2), 2);
  e.tickStun(2.1);
  assert.equal(e.applyCC('interrupt', 2), 0, 'interrumpir: 6 s de inmunidad tras silenciar');
}
console.log('Control: canales duro / inmovilizar / ralentizar / interrumpir con rendimientos decrecientes ✓');

// ------------------------------------------------ 5) lanzamientos enemigos interrumpibles
{
  const h = makeHarness({ classId: 'maga', level: 20 });
  const g = h.g;
  g.enemyCast = enemyAbilities.enemyCast;
  let healed = 0;
  g.enemyHeal = () => { healed++; };
  for (const [id, d] of Object.entries(ENEMY_CASTS)) assert.ok(d.interruptible === true && d.castT >= 0, `${id}: interruptible + castT`);
  const acolyte = h.enemy({ hp: 1e6 });
  assert.equal(g.enemyCast(acolyte, 'enemyHeal'), true);
  assert.ok(acolyte.casting && acolyte.castT > 0, 'lanzamiento visible en curso');
  acolyte.tickCast(0.3); assert.equal(healed, 0);
  acolyte.applyCC('interrupt', 3, { src: h.p });
  assert.equal(acolyte.casting, null, 'la interrupción corta el lanzamiento');
  acolyte.tickCast(1); assert.equal(healed, 0, 'y el efecto no ocurre');
  assert.equal(g.enemyCast(acolyte, 'enemyHeal'), false, 'silenciado: no puede volver a lanzar');
  acolyte.tickStun(3.1);
  assert.equal(g.enemyCast(acolyte, 'enemyHeal'), true);
  acolyte.tickCast(ENEMY_CASTS.enemyHeal.castT + 0.01);
  assert.equal(healed, 1, 'sin interrupción, el lanzamiento termina');
  // el disparo cargado del Francotirador también se corta
  const sn = h.enemy({ hp: 1e6, pos: [5, 0, 0] });
  sn.snipeFireT = 1;
  sn.applyCC('interrupt', 2, { src: h.p });
  assert.equal(sn.snipeFireT, 0, 'interrumpe el disparo cargado');
  // la invocación del jefe, si se corta, se reintenta
  const boss = h.enemy({ hp: 1e6, boss: true, pos: [0, 0, 5] });
  boss.summoned = true;
  g.bossSummon = () => { boss.didSummon = true; };
  g.enemyCast(boss, 'bossSummon');
  boss.applyCC('interrupt', 2, { src: h.p });
  assert.equal(boss.summoned, false, 'invocación cortada: el jefe lo reintentará');
  assert.ok(!boss.didSummon);
}
console.log('Interrupción: ENEMY_CASTS con castT, Contrahechizo/Silenciadora cortan y silencian ✓');

void talentMethods;
console.log('\n✅ PRIMITIVAS DE ROL (Paso 2c.0) OK');
