// ============================================================
// PODERES del GUERRERO (Berserker · Guardián · Cruzado) — Paso 2c.1
// ============================================================
// Dueño: el trabajador de la clase en el Paso 2c.1 (docs/paso2-diseno.md §9.1.6).
// Solo se tocan ESTE archivo, js/talents-guerrero.js, js/fx-skills-guerrero.js y
// tests/test-powers-guerrero.mjs. js/powers.js ya importa y registra al cargar los
// cuatro mapas que devuelven las funciones de abajo.
// Son FUNCIONES (no constantes) a propósito: powers.js ↔ powers-guerrero.js forman un
// ciclo de módulos y una función declarada se puede llamar aunque este módulo aún
// no se haya evaluado (p. ej. si un test lo importa el primero). Los helpers de este
// archivo son también declaraciones de función (se elevan con el módulo); los
// valores de diseño viven en tun() (función, no constante de módulo).
//
//  guerreroPowers()          { id: PowerDef }  → definePower (claves de POWER_KEYS en powers.js:
//                        stats modifyResolve condAdd condCrit onCast afterCast onHit onKill
//                        condDr onDamaged onLethal onTick onGauge · icd priority procs state
//                        name desc tags). `mult` SOLO en los nodos clave ya registrados
//                        (powers-common.js: m_berserk/m_deadeye/m_hunt): un poder nuevo con
//                        mult lo rechaza test67.
//  guerreroSkillBehaviors() { skillId: { cast?(g,p,prof,cast), tick?(g,p,inst,dt), end?(g,p,inst) } }
//                        → defineSkillBehavior: el `behavior` de las activas de talento de
//                        js/talents-guerrero.js (formato de MEMORIA.md §7 punto 3).
//  guerreroFields()          { kind: { init, tick, onEnter?, onExit?, onExpire?, render? } } → defineField
//  guerreroGauges()          { id: GaugeDef } → spec-mechanics.defineGauge (solo indicadores NUEVOS;
//                        los 9 de §2 ya existen: potencia los tuyos con gainGauge/spendGauge
//                        y el gancho onGauge(g, p, id, ev, n, e)).
//
// REGLAS: no uses nada importado en el nivel superior del módulo (ciclo powers.js ↔
// powers-<clase>.js: los bindings importados solo se usan DENTRO de los ganchos). Nada de `powers.has(` fuera de js/powers*.js
// (aquí sí se puede: hasPower(p, id)), ni setTimeout (g.timers.schedule), ni
// Math.random en la simulación (g.simRng(stream) / p.combatRng). Daño de un poder:
// dealProcDamage(g, e, n, { source: 'power:<id>' }). Control: e.applyCC(kind, dur, { src: p,
// stagger? }). Curas: p.sustain (golpe/muerte) o g.heal / g.shield (habilidad). Amenaza:
// g.forceTarget(e, p, t) / g.addThreat(e, p, n). Aliados: g.allies(pos, r).
//
// ------------------------------------------------------------
// LO QUE HAY AQUÍ (2c.1 + 2c.2)
// ------------------------------------------------------------
// · 29 poderes de los árboles (clase, Berserker, Guardián, Cruzado), uno por nodo.
// · 11 comportamientos de activas de talento: Segundo Aliento, Intervención, Bramido,
//   Remolino Sangriento, Temeridad, Ira Ciega, Grito Desafiante, Muro de Escudos,
//   Carga de Escudo, Aura de Devoción y Veredicto Final (Martillo de Justicia usa el
//   tipo genérico `proj`: aturdir + bossStun + stagger ya los entiende el núcleo).
// · 3 campos de suelo: g_devocion (aura que te sigue), g_consagracion (suelo sagrado
//   que cura) y g_martillos (martillos orbitales del Martillo Bendito).
// · Indicadores (spec-mechanics): Sed (Remolino Sediento +4/enemigo, Instinto Asesino
//   +2/crítico, Temeridad ×2 por stat 'gaugeGain:sed', Negación la llena, Desenfreno al
//   llenarse, Carnicero +15·r por remate), Bastión (Desafío Firme +2, Martillo Pesado +1,
//   Muro de Escudos las gasta, Muralla Viva −2·r % por carga, Bastión Eterno con 5) y
//   Fervor (Devoción Ferviente +1, Fervor Creciente del núcleo, Veredicto gasta 3, Luz
//   del Alba alarga el Aura, Ascensión no gasta).
//
// PASO 2c.2 — sin portadores: cada nodo con efecto propio lleva SU poder o una clave tv
// que consume el núcleo (poder común nucleo_tv / combat-math / spec-mechanics). Un poder
// solo lee el rango de SU PROPIO nodo (ownRank).
//   Berserker  s5 Instinto Asesino → g_instinto_asesino (+2 Sed por crítico)
//              s8 Festín de Sangre → tv.bleedKillHeal · s15 Sed Insaciable → tv.bleedKillMana
//              s9 Temeridad → sin poder: su buff lleva 'gaugeGain:sed' (+100) y dmgTakenPct (+10)
//              x1 Ejecutar → tv.executePct (remate, +40 a élites/jefes, wasExecuted)
//              x2 Carnicero → g_carnicero (onKill de un remate) · x3 → g_matanza_eterna
//   Guardián   s4 → g_desafio_firme · s7 Martillo Pesado → g_martillo_pesado
//              s8 Recuperación → tv.killHeal · s14 Vínculo → ⑫ onAllyDamaged
//              x3 Bastión Eterno → ⑫ onAllyLethal (icd 60 s)
//   Cruzado    s6A Consagración → g_consagracion (afterCast de Martillo: campo que cura)
//              s8 Luz Sanadora → tv.killHeal (a ti) + g_luz_sanadora (a los aliados a 10 m)
//              s12 Fervor Creciente → tv.fervorChance · s13A Intercesión → ⑫ onAllyLethal (icd 90 s)
//   Clase      c15 Hermandad de Armas → ⑪ onResource (+5 % de la Furia ganada por aliado)
//
// GRUPO (cooperativo; en solitario no hacen nada): Hermandad de Armas (buff a aliados a
// 15 m y +5 % de Furia por aliado), Bramido/Devoción/Intervención/Veredicto (aliados en
// el radio), Mano Sanadora, Luz Sanadora, Martillo Bendito (curas a aliados), Vínculo del
// Guardián (te pasas el 20 % del daño de los aliados a 10 m), Intercesión y Bastión Eterno
// (un aliado que iba a caer queda a 1). El daño de los aliados entra por g.damageAlly (⑫).
// Los aliados son las entidades de g.party (contrato de g.allies: { pos, alive, hp,
// stats.maxHP, healSkill, addShield, addBuff?, sustain?, setHp?, grantInvuln? }).
import * as THREE from 'three';
import { dealProcDamage, powerState, hasPower } from './powers.js';
import { gainGauge, spendGauge, gaugeValue, gaugeMax } from './spec-mechanics.js';
import { dotProfile, rankCoef } from './combat-math.js';
import { spendResource } from './resources.js';
import { wasExecuted } from './powers-common.js';
// (importados: úsalos solo dentro de los ganchos)

// ------------------------------------------------------------
// valores de diseño (texto de los nodos) — función: ver la nota del ciclo de módulos
// ------------------------------------------------------------
function tun() {
  return {
    critFury: 2,                       // c14 Maestro de Armas: Furia por crítico
    brother: { dmgPct: 5, hpPct: 8, radius: 15, furyPct: 5, maxAllies: 3 },   // c15
    coraza: { below: 0.3, dr: 30, dur: 5, icd: 60 },                        // c12B
    remolinoSed: { perHit: 2, max: 20 },                                     // s4 Berserker
    instintoSed: 2,                    // s5 Berserker: Sed por crítico
    remolinoBleedMul: 0.3,             // Sangrado de Remolino por tic (× perfil de Sangrado)
    carniceria: { jump: 4 },           // s6A: el Sangrado salta a cercanos a ≤ 4 m
    butcher: { sedPerRank: 15, fury: 5 },                                  // x2 Carnicero
    eternal: 2,                        // x3 Matanza Eterna: +2 s de Desenfreno por remate
    frenzy: { aspdPct: 30, dur: 8, healPct: 1 },                            // s14 Desenfreno
    negacion: { icd: 120 },
    desafioFirme: 2, martilloPesado: { hits: 3, n: 1, coef: 2.0 },          // Guardián s4 / s7 (coef: Paso 2e)
    reto: { pct: 20, dur: 8 },                                              // Guardián s6B
    juramento: 10,                     // s13A: Muro Inquebrantable 30 → 20 s
    vinculo: { pct: 20, radius: 10 },                                       // s14
    muralla: 1,                        // s17: −1 %/rango por carga de Bastión (Paso 2e: era 2)
    represalia: 30,                    // x1: % del daño bloqueado o absorbido que reflejas
    venganza: { pctPerRank: 20, radius: 6 },                                // x2
    eterno: { radius: 10, icd: 60, invuln: 2 },                             // x3 Bastión Eterno
    manoRadius: 10,                    // Cruzado s3
    ferviente: { fervor: 1, heal: 10 },                                     // s4
    sentencia: { pct: 20, dur: 4, radius: 2.9 },                            // s6B (radio de Juicio)
    consagracion: { healPctPerSec: 2 },                                     // s6A
    luzRadius: 10,                     // s8
    banner: 15,                        // s10: radio del Estandarte
    intercesion: { icd: 90, cost: 20, radius: 15 },                         // s13A
    alba: { dmgPct: 25, selfDmgPct: 10, perFervor: 1 },                                     // s14
    hammers: { n: 3, coef: 0.15, every: 1, reach: 2.6, healPct: 1, healRadius: 15, juicioPct: 15 },  // x1/x2
    ascension: { need: 3, gap: 8, dur: 10, radius: 30, minCd: 1.5 },        // x3
  };
}

// ------------------------------------------------------------
// helpers (declaraciones de función: se elevan con el módulo)
// ------------------------------------------------------------
function isBoss(e) { return !!(e?.def?.boss || e?.def?.uber || e?.def?.worldBoss); }
function isEliteOrBoss(e) { return !!e?.def?.rank || isBoss(e); }
function specOf(p) { return p?.talentAgg?.spec || null; }
// rango REAL del PROPIO nodo del poder que lo pregunta (0 si no es esa especialización).
// Solo para escalar el efecto de SU nodo (Mano Sanadora, Muralla, Carnicero, Venganza,
// Martillos del Juicio): nunca para encender el efecto de otro nodo (Paso 2c.2).
function ownRank(p, id, spec) {
  const s = specOf(p);
  if (!s || (spec && s !== spec)) return 0;
  return (p.talents?.sp?.[s]?.[id] | 0);
}
function buffOf(a, id) { return (a?.buffs || []).find(b => b.id === id && b.t > 0) || null; }
// renueva (sin recompute) o crea un buff de duración corta (auras)
function keepBuff(a, id, stats, dur, meta) {
  const b = buffOf(a, id);
  if (b) { b.t = Math.max(b.t, dur); b.dur = Math.max(b.dur || 0, dur); return b; }
  a?.addBuff?.(id, { ...stats }, dur, meta || {});
  return null;
}
function others(g, p, r) { return (g?.allies ? g.allies(p.pos, r) : []).filter(a => a !== p); }
// curación de HABILIDAD a un aliado (tú: g.heal, que suma la amenaza de curar)
function skillHeal(g, p, a, amt, src) {
  if (!(amt > 0) || !a) return 0;
  if (a === p) return g.heal ? g.heal(amt, { target: 'self', src }) : p.healSkill(amt, src);
  return a.healSkill?.(amt, src) || 0;
}
// SUSTENTO de un aliado (su cubeta; un aliado sin cubeta lo recibe como curación)
function allySustain(a, amt, src) {
  if (!(amt > 0) || !a) return 0;
  return a.sustain ? a.sustain(amt, src) : (a.healSkill?.(amt, src) || 0);
}
function fxAt(g, name, pos, y = 1) {
  if (!name || !pos || !g?.emitFx) return;
  g.emitFx(name, pos.clone ? pos.clone().setY(y) : { x: pos.x, y, z: pos.z });
}
function fieldOf(g, p, kind) { return (g?.fields || []).find(f => !f.dead && f.kind === kind && f.owner === p) || null; }
function v3(x, y, z) { return new THREE.Vector3(x, y, z); }
// Muro de Escudos: puntos de reducción de daño del buff y daño que evitó en un golpe
function muroDr(p) { return buffOf(p, 'g_t_muro')?.stats?.dr || 0; }
function muroPrevented(p, amount) {
  const m = muroDr(p);
  if (!(m > 0) || !(amount > 0)) return 0;
  const t = Math.min(50, p.stats?.dr || 0), without = Math.max(0, t - m);
  return amount * (t - without) / Math.max(1, 100 - t);
}
function nearAL(g, p) {
  let al = 0;
  for (const e of g?.enemies || []) if (e.alive && e.pos.distanceTo(p.pos) <= 20) al = Math.max(al, e.def?.level || 0);
  return al || p.level || 1;
}
// ¿el aliado (de g.party, no tú) está a ≤ r m?
function allyNear(p, a, r) { return !!a && a !== p && !!a.pos?.distanceTo && a.pos.distanceTo(p.pos) <= r; }
// Sangrado de una activa (perfil central de DoT; fuente '<habilidad>:bleed' → Sed y KillInfo)
function applyBleed(g, p, e, avgHit, mul, skill) {
  if (!e?.alive) return;
  const d = dotProfile('bleed', avgHit, { dotMul: mul, tv: p.tv });
  if (d) g.applyDoT?.(e, d.total, d.ticks, d.interval, undefined, `${skill}:bleed`);
}
// buff de una activa (como el tipo genérico `buff`): a ti o, con tag ally, al grupo
function castBuff(g, p, prof, sk, ctx, stats) {
  const meta = { name: sk.name, icon: sk.icon, desc: sk.desc };
  const targets = prof.tags.has('ally') ? g.allies(p.pos, sk.allyRadius || 15) : [p];
  for (const a of targets) {
    a.addBuff?.(sk.id, { ...(stats || prof.buff) }, prof.dur, meta);
    if (prof.unstoppable) a.unstoppableT = Math.max(a.unstoppableT || 0, prof.dur);
  }
  g.spawnRing?.(p.pos, 1.4, ctx.color || 0x66ddff);
  fxAt(g, ctx.fx?.aura, p.pos, 1.0);
  fxAt(g, ctx.fx?.extra, p.pos, 0.2);
  return targets;
}
// sin objetivo o sin recurso propio: el enfriamiento no se gasta
function refundCd(g, p, sk, msg) {
  p.cds[sk.id] = 0;
  if (msg) g.ui?.message?.(msg);
}

// ============================================================
// PODERES
// ============================================================
export function guerreroPowers() {
  const T = tun();
  return {
    // ---------------- ÁRBOL DE CLASE ----------------
    // c12B Coraza de Hierro: al bajar del 30 % de vida, −30 % de daño recibido 5 s (cada 60 s)
    g_coraza_hierro: {
      name: 'Coraza de Hierro', desc: 'Al bajar del 30 % de vida recibes −30 % de daño durante 5 s. Una vez cada 60 s.',
      icd: T.coraza.icd,
      onDamaged(g, p, dmg) {
        const max = p.stats.maxHP;
        if (!(dmg.amount > 0) || p.hp / max < T.coraza.below || (p.hp - dmg.amount) / max >= T.coraza.below) return false;
        p.addBuff('g_coraza_hierro', { dr: T.coraza.dr }, T.coraza.dur, { name: 'Coraza de Hierro', icon: '🛡️', desc: `−${T.coraza.dr}% de daño recibido` });
        g.ui?.spawnText?.(p.pos, '¡CORAZA!', 'txt-heal');
        fxAt(g, 'ironSkin', p.pos, 1.0);
        return true;
      },
    },
    // c14 Maestro de Armas (+10 % de daño crítico lo da tv.critDmg): cada crítico da 2 de Furia (2c.2: era 3)
    g_crit_furia: {
      name: 'Maestro de Armas', desc: 'Cada crítico te da 2 de Furia.',
      onHit(g, p, e, hit) { if (hit?.crit) g.gainResource(p, T.critFury); },
    },
    // c15 Hermandad de Armas (nodo clave de clase): +5 % de daño y +8 % de vida a ti y a los
    // aliados a 15 m; +5 % de Furia generada por aliado cerca (máx. 3; 0 en solitario)
    g_aura_hermandad: {
      name: 'Hermandad de Armas', desc: 'Tú y los aliados a 15 m: +5 % de daño y +8 % de vida máxima. +5 % de Furia por aliado cerca (máx. 3).',
      state: () => ({ acc: 0, near: 0 }),
      stats: () => ({ dmgPct: T.brother.dmgPct, hpPct: T.brother.hpPct }),
      // pulso de 0,5 s: renueva el aura de los aliados a 15 m y cuenta cuántos hay (máx. 3)
      onTick(g, p, dt) {
        const st = powerState(p, 'g_aura_hermandad');
        st.acc += dt;
        if (st.acc < 0.5 - 1e-9) return;
        st.acc = 0;
        const list = others(g, p, T.brother.radius);
        st.near = Math.min(T.brother.maxAllies, list.length);
        for (const a of list) keepBuff(a, 'g_aura_hermandad', { dmgPct: T.brother.dmgPct, hpPct: T.brother.hpPct }, 0.65,
          { name: 'Hermandad de Armas', icon: '🤝', desc: `+${T.brother.dmgPct}% de daño y +${T.brother.hpPct}% de vida` });
      },
      // ⑪ Furia REALMENTE ganada × 5 % por aliado cerca (silent: no se realimenta)
      onResource(g, p, n) {
        const near = powerState(p, 'g_aura_hermandad').near;
        if (near > 0 && n > 0) g.gainResource(p, n * T.brother.furyPct / 100 * near, { silent: true });
      },
    },

    // ---------------- BERSERKER ----------------
    // s4 Remolino Sediento: cada GOLPE de Remolino Sangriento suma 2 de Sed (máx. 20 por uso).
    // Paso 2e: antes 4 por ENEMIGO golpeado: contra un jefe solo daba 4 por giro (la Sed del
    // Berserker no se llenaba nunca en UNI) y con 5 enemigos ya llegaba al tope de 20
    g_remolino_sediento: {
      name: 'Remolino Sediento', desc: 'Cada golpe de Remolino Sangriento suma 2 de Sed (máx. 20 por uso).',
      state: () => ({ got: 0 }),
      onCast(g, p, cast) {
        if (cast?.sk?.id !== 'g_t_remolino') return;
        powerState(p, 'g_remolino_sediento').got = 0;
      },
      onHit(g, p, e, hit) {
        if (hit?.skill !== 'g_t_remolino' || hit.dot || hit.proc) return;
        const st = powerState(p, 'g_remolino_sediento');
        if (st.got >= T.remolinoSed.max) return;
        const n = Math.min(T.remolinoSed.perHit, T.remolinoSed.max - st.got);
        st.got += n;
        gainGauge(p, 'sed', n);
      },
    },
    // s5 Instinto Asesino (+3 %/rango de crítico: stats del nodo): cada crítico suma 2 de Sed
    g_instinto_asesino: {
      name: 'Instinto Asesino', desc: 'Cada crítico suma 2 de Sed.',
      onHit(g, p, e, hit) { if (hit?.crit) gainGauge(p, 'sed', T.instintoSed); },
    },
    // s13A Negación de la Muerte: cada 2 min, un golpe letal te deja a 1 de vida y con la Sed llena
    g_negacion: {
      name: 'Negación de la Muerte', desc: 'Una vez cada 2 minutos, un golpe letal te deja con 1 de vida y la Sed llena.',
      icd: T.negacion.icd, priority: 1,
      onLethal(g, p) {
        p.setHp(1, 'g_negacion');                       // restauración (§6.1)
        gainGauge(p, 'sed', gaugeMax(p, 'sed'));
        g.ui?.message?.('🩸 ¡Negación de la Muerte! Sobrevives con la Sed llena', 3000);
        g.ui?.spawnText?.(p.pos, '¡NEGACIÓN!', 'txt-crit');
        fxAt(g, 'recklessAura', p.pos, 1.0);
        g.addShake?.(0.4, 0.4);
        return true;
      },
    },
    // s14 Sangre Hirviente: con la Sed llena entras en Desenfreno 8 s (+30 % de vel. de ataque
    // y cada golpe te cura un 1 % de vida: sustento, §6.1)
    g_desenfreno: {
      name: 'Sangre Hirviente', desc: 'Con la Sed llena: Desenfreno 8 s (+30 % de velocidad de ataque y cada golpe te cura un 1 % de vida).',
      onGauge(g, p, id, ev) {
        if (id !== 'sed' || ev !== 'full') return;
        p.addBuff('g_desenfreno', { aspdPct: T.frenzy.aspdPct }, T.frenzy.dur,
          { name: 'Desenfreno', icon: '🩸', desc: `+${T.frenzy.aspdPct}% de velocidad de ataque y ${T.frenzy.healPct}% de vida por golpe` });
        g.ui?.spawnText?.(p.pos, '¡DESENFRENO!', 'txt-crit');
        fxAt(g, 'recklessAura', p.pos, 1.0);
      },
      onHit(g, p) { if (buffOf(p, 'g_desenfreno')) p.sustain(p.stats.maxHP * T.frenzy.healPct / 100, 'g_desenfreno'); },
    },
    // x2 Carnicero (rango r): cada REMATE (wasExecuted: normal rematado por Ejecutar —
    // tv.executePct de x1, núcleo nucleo_tv— o élite/jefe que muere tras bajar del umbral)
    // suma 15·r de Sed y te devuelve 10 de Furia
    g_carnicero: {
      name: 'Carnicero', desc: 'Cada remate suma 15 de Sed por rango y te devuelve 5 de Furia.',
      onKill(g, p, e) {
        const r = ownRank(p, 'x2', 'berserker');
        if (!(r > 0) || !wasExecuted(e)) return;
        gainGauge(p, 'sed', T.butcher.sedPerRank * r);
        g.gainResource(p, T.butcher.fury);
      },
    },
    // x3 Matanza Eterna: rematar durante el Desenfreno lo alarga 2 s, sin límite
    g_matanza_eterna: {
      name: 'Matanza Eterna', desc: 'Rematar durante el Desenfreno lo alarga 2 s, sin límite.',
      onKill(g, p, e) {
        const b = buffOf(p, 'g_desenfreno');
        if (!b || !wasExecuted(e)) return;
        b.t += T.eternal; b.dur = (b.dur || 0) + T.eternal;
        g.ui?.spawnText?.(p.pos, `+${T.eternal}s`, 'txt-crit');
      },
    },

    // ---------------- GUARDIÁN ----------------
    // s4 Desafío Firme: Grito Desafiante te da 2 cargas de Bastión (si provoca a alguien)
    g_desafio_firme: {
      name: 'Desafío Firme', desc: 'Grito Desafiante te da 2 cargas de Bastión.',
      afterCast(g, p, cast, res) {
        if (cast?.sk?.id === 'g_t_desafio' && res?.hits > 0) gainGauge(p, 'bastion', T.desafioFirme);
      },
    },
    // s7 Martillo Pesado (+15 %/rango de daño de Martillo: mod del nodo): el Martillo de
    // Guerra pasa de la onda ligera de la clase (coef 0,34, el constructor de Fervor del
    // Cruzado) a un golpe pesado de coef T.martilloPesado.coef (escala con el rango de la
    // habilidad, Paso 2e); si golpea a 3 o más, +1 carga de Bastión
    g_martillo_pesado: {
      name: 'Martillo Pesado', desc: 'Martillo de Guerra golpea con el 200 % del arma; si golpea a 3 o más enemigos, suma 1 carga de Bastión.',
      modifyResolve(p, sk, prof) {
        if (sk.id === 'g_martillo') prof.coef = Math.max(prof.coef, T.martilloPesado.coef * rankCoef(prof.rank));
      },
      afterCast(g, p, cast, res) {
        if (cast?.sk?.id === 'g_martillo' && res?.hits >= T.martilloPesado.hits) gainGauge(p, 'bastion', T.martilloPesado.n);
      },
    },
    // s6B Reto Singular: Provocación marca a su objetivo: −20 % de daño a tu grupo 8 s
    g_reto: {
      name: 'Reto Singular', desc: 'Provocación marca a un enemigo: hace −20 % de daño a tu grupo durante 8 s.',
      afterCast(g, p, cast, res) {
        if (cast?.sk?.id !== 'g_provocacion' || !(res?.hits > 0)) return;
        const range = cast.prof?.range || 15;
        let e = cast.enemy;
        if (!e?.alive || e.pos.distanceTo(p.pos) > range + 0.5) e = g.nearestEnemy?.(range) || null;
        if (!e?.alive) return;
        e.weakenOutgoing?.('g_reto', T.reto.pct, T.reto.dur);
        (e.marks || (e.marks = {})).g_reto = { t: T.reto.dur, by: p };
        g.spawnRing?.(e.pos, 1.3, 0x5599ff);
        fxAt(g, 'tauntMark', e.pos, (e.def?.scale || 1) + 0.8);
      },
    },
    // s13A Juramento del Escudo: Muro Inquebrantable (m_aegis) se recarga en 20 s en vez de 30 s
    g_juramento: {
      name: 'Juramento del Escudo', desc: 'Muro Inquebrantable se recarga en 20 s en lugar de 30 s.',
      state: () => ({ last: 0 }),
      onTick(g, p) {
        const aegis = powerState(p, 'm_aegis');
        const st = powerState(p, 'g_juramento');
        if ((aegis.cd || 0) > st.last + 1e-6) aegis.cd = Math.max(0, aegis.cd - T.juramento);   // acaba de saltar
        st.last = aegis.cd || 0;
      },
    },
    // s14 Vínculo del Guardián (cooperativo): recibes tú el 20 % del daño que sufren los
    // aliados a 10 m, reducido por tu armadura (⑫ onAllyDamaged: te quedas esa parte)
    g_vinculo: {
      name: 'Vínculo del Guardián', desc: 'Recibes tú el 20 % del daño que sufren los aliados a 10 m, reducido por tu armadura.',
      onAllyDamaged(g, p, ally, dmg) {
        if (!p.alive || !(dmg?.amount > 0) || !allyNear(p, ally, T.vinculo.radius)) return;
        const share = dmg.amount * T.vinculo.pct / 100;
        dmg.amount -= share;
        p.takeDamage(share, nearAL(g, p), { element: 'phys' });
      },
    },
    // s17 Muralla Viviente: cada carga de Bastión te da −2 %/rango de daño recibido
    g_muralla_viva: {
      name: 'Muralla Viviente', desc: 'Cada carga de Bastión te da −1 % de daño recibido por rango.',
      condDr(p) { return T.muralla * ownRank(p, 's17', 'guardian') * Math.floor(gaugeValue(p, 'bastion')); },
    },
    // x1 Represalia: tus espinas reflejan además el 30 % del daño que bloqueas o que absorbe
    // Muro de Escudos (al atacante, como daño de poder)
    g_represalia: {
      name: 'Represalia', desc: 'Reflejas el 30 % del daño que bloqueas o absorbes con Muro de Escudos.',
      onDamaged(g, p, dmg) {
        let prevented = muroPrevented(p, dmg.amount);
        if (dmg.blocked) prevented += dmg.amount;          // el bloqueo quitó lo mismo que dejó pasar (−50 %)
        const src = dmg.src;
        if (!(prevented > 0) || !src?.alive || typeof src.takeDamage !== 'function') return;
        dealProcDamage(g, src, prevented * T.represalia / 100, { source: 'power:g_represalia' });
      },
    },
    // x2 Venganza Acumulada: al terminar Muro de Escudos, una onda devuelve el 20 %/rango del
    // daño absorbido (lo acumula aquí; la onda la lanza el comportamiento del Muro al acabar)
    g_venganza: {
      name: 'Venganza Acumulada', desc: 'Al terminar Muro de Escudos, una onda devuelve un 20 % por rango del daño absorbido.',
      state: () => ({ absorbed: 0 }),
      onDamaged(g, p, dmg) {
        const n = muroPrevented(p, dmg.amount);
        if (n > 0) powerState(p, 'g_venganza').absorbed += n;
      },
    },
    // x3 Bastión Eterno (cooperativo): con 5 cargas, Muro Inquebrantable protege también a
    // los aliados a 10 m (⑫ onAllyLethal: queda a 1 de vida e inmune 2 s; icd 60 s, que
    // solo se gasta si salva: return false no lo consume)
    g_bastion_eterno: {
      name: 'Bastión Eterno', desc: 'Con 5 cargas de Bastión, Muro Inquebrantable protege también a los aliados a 10 m (una vez cada 60 s).',
      icd: T.eterno.icd,
      onAllyLethal(g, p, ally) {
        if (!p.alive || !allyNear(p, ally, T.eterno.radius) || gaugeValue(p, 'bastion') < gaugeMax(p, 'bastion')) return false;
        ally.grantInvuln?.(T.eterno.invuln);
        g.ui?.message?.('🛡️ ¡Bastión Eterno! Tu aliado sobrevive', 2500);
        fxAt(g, 'shieldWall', ally.pos, 1.0);
        return true;
      },
    },

    // ---------------- CRUZADO ----------------
    // s3 Mano Sanadora (+2/rango de vida al golpear: stats.lph): los aliados a 10 m reciben la mitad
    g_mano_sanadora: {
      name: 'Mano Sanadora', desc: 'Los aliados a 10 m reciben la mitad de la vida al golpear de Mano Sanadora.',
      state: () => ({ at: -1 }),
      onHit(g, p) {
        const st = powerState(p, 'g_mano_sanadora');
        if (st.at === p.simT) return;                       // una vez por impacto (como onDealHit)
        st.at = p.simT;
        const half = ownRank(p, 's3', 'cruzado');           // la mitad de 2·rango
        if (half > 0) for (const a of others(g, p, T.manoRadius)) allySustain(a, half, 'g_mano_sanadora');
      },
    },
    // s4 Devoción Ferviente: Aura de Devoción te da 1 de Fervor al lanzarla y cura un 10 % más
    // (el +10 % lo lee el campo g_devocion)
    g_devocion_ferviente: {
      name: 'Devoción Ferviente', desc: 'Aura de Devoción te da 1 de Fervor al lanzarla y cura un 10 % más.',
      afterCast(g, p, cast) { if (cast?.sk?.id === 'g_t_devocion') gainGauge(p, 'fervor', T.ferviente.fervor); },
    },
    // s6B Sentencia: Juicio marca a élites y jefes: +20 % de daño recibido de todo el grupo 4 s
    // (saco Debilidad, §5.3)
    g_sentencia: {
      name: 'Sentencia', desc: 'Juicio marca a élites y jefes: reciben +20 % de daño de todo el grupo durante 4 s.',
      onKill(g, p, e, kill) {
        if (kill?.nested || !e?.pos) return;
        for (const o of g.enemies || []) {
          if (!o.alive || o === e || !isEliteOrBoss(o)) continue;
          const r = T.sentencia.radius + 0.5 * (o.def?.scale || 1);
          if (o.pos.distanceToSquared(e.pos) > r * r) continue;
          o.applyWeakness?.('g_sentencia', T.sentencia.pct, T.sentencia.dur);
          g.ui?.spawnText?.(o.pos.clone().setY((o.def?.scale || 1) + 0.7), 'SENTENCIA', 'txt-crit');
        }
      },
    },
    // s6A Consagración (mod.zone de Martillo: la zona que daña es del núcleo): el suelo
    // sagrado también cura a los aliados que lo pisan (campo g_consagracion, 2 %/s).
    // Paso 2e: la curación NO se apila (cada Martillo renueva el suelo que cura; antes, con
    // un Martillo por segundo, 4 campos curaban 8 %/s y el Cruzado era inmortal en TTD+)
    g_consagracion: {
      name: 'Consagración', desc: 'El suelo sagrado de Martillo de Guerra también cura a los aliados que lo pisan (no se apila: cada Martillo lo renueva).',
      afterCast(g, p, cast) {
        if (cast?.sk?.id !== 'g_martillo' || !cast.target || !g.spawnField) return;
        const prof = cast.prof || {};
        const old = fieldOf(g, p, 'g_consagracion');
        if (old) old.t = 0;
        g.spawnField('g_consagracion', { pos: cast.target.clone().setY(0), radius: Math.max(2, (prof.radius || 3) * 0.9),
          dur: prof.zoneDur || 4, owner: p, data: { healPctPerSec: T.consagracion.healPctPerSec } });
      },
    },
    // s8 Luz Sanadora (tv.killHeal: el núcleo te cura a TI al matar): los aliados a 10 m
    // reciben el mismo % de SU vida (sustento de cada uno)
    g_luz_sanadora: {
      name: 'Luz Sanadora', desc: 'Al matar, los aliados a 10 m se curan el mismo % de vida que tú.',
      onKill(g, p) {
        const pct = p.tv?.killHeal || 0;
        if (!(pct > 0)) return;
        for (const a of others(g, p, T.luzRadius)) allySustain(a, (a.stats?.maxHP || 0) * pct / 100, 'g_luz_sanadora');
      },
    },
    // s10 Estandarte Sagrado (+20 %/rango de duración: mod): su bonificación alcanza a los aliados a 15 m
    g_estandarte_grupo: {
      name: 'Estandarte Sagrado', desc: 'La bonificación de Estandarte de Guerra alcanza a los aliados a 15 m.',
      modifyResolve(p, sk, prof) { if (sk.id === 'g_u_estandarte') prof.radius = Math.max(prof.radius || 0, T.banner); },
    },
    // s13A Intercesión (cooperativo): cada 90 s, un aliado a 15 m que iba a morir queda a 1
    // de vida y tú pierdes un 20 % de vida (⑫ onAllyLethal; icd 90 s, solo si salva)
    g_intercesion: {
      name: 'Intercesión', desc: 'Cada 90 s, un aliado que iba a morir queda a 1 de vida; tú pierdes un 20 % de vida.',
      icd: T.intercesion.icd,
      onAllyLethal(g, p, ally) {
        if (!p.alive || !allyNear(p, ally, T.intercesion.radius)) return false;
        p.setHp(Math.max(1, p.hp - p.stats.maxHP * T.intercesion.cost / 100), 'g_intercesion');
        g.ui?.message?.('✨ ¡Intercesión! Tu aliado sobrevive', 2500);
        return true;
      },
    },
    // s14 Luz del Alba: Aura de Devoción da también +10 % de daño al grupo (lo aplica el campo)
    // y cada Fervor gastado la alarga 1 s
    g_luz_alba: {
      name: 'Luz del Alba', desc: 'Aura de Devoción da +25 % de daño a tus aliados (+10 % a ti) y cada Fervor gastado la alarga 1 s.',
      onGauge(g, p, id, ev, n) {
        if (id !== 'fervor' || ev !== 'spent') return;
        const f = fieldOf(g, p, 'g_devocion');
        if (f) { f.t += n * T.alba.perFervor; f.dur += n * T.alba.perFervor; }
      },
    },
    // x1 Martillo Bendito: 3 martillos sagrados orbitan a tu alrededor (campo g_martillos):
    // cada segundo cada uno golpea al enemigo más cercano a ≤ 2,6 m (15 % del arma, Sagrado,
    // + Fe Ardiente) y cada golpe cura un 1 % de vida a los aliados a 15 m (sustento)
    g_martillo_bendito: {
      name: 'Martillo Bendito', desc: '3 martillos sagrados orbitan a tu alrededor. Cada golpe cura un 1 % de vida a los aliados a 15 m.',
      onTick(g, p) {
        if (!g?.spawnField || !p.alive || fieldOf(g, p, 'g_martillos')) return;
        g.spawnField('g_martillos', { pos: p.pos.clone(), radius: T.hammers.reach, dur: 3600, owner: p, data: {} });
      },
    },
    // x2 Martillos del Juicio: +1 martillo y +15 % de daño de los Martillos Benditos por rango
    // (lo lee el campo g_martillos; este poder solo marca el nodo)
    g_martillos_juicio: {
      name: 'Martillos del Juicio', desc: '+1 martillo y +15 % de daño de los Martillos Benditos por rango.',
    },
    // x3 Ascensión: tras 3 Veredictos seguidos (≤ 8 s entre ellos), 10 s de alas de luz: el
    // Fervor no se gasta y el Aura cubre 30 m. Tope: Veredicto con 1,5 s de enfriamiento
    // mientras dura (sin coste ni enfriamiento serían ≈150 WD en 10 s: desbocado)
    g_ascension: {
      name: 'Ascensión', desc: 'Tras 3 Veredictos seguidos, 10 s de alas de luz: el Fervor no se gasta y el Aura cubre 30 m.',
      state: () => ({ n: 0, last: -99 }),
      afterCast(g, p, cast, res) {
        if (cast?.sk?.id !== 'g_t_veredicto' || !res?.verdict || buffOf(p, 'g_ascension')) return;
        const st = powerState(p, 'g_ascension');
        st.n = (p.simT || 0) - st.last <= T.ascension.gap ? st.n + 1 : 1;
        st.last = p.simT || 0;
        if (st.n < T.ascension.need) return;
        st.n = 0;
        p.addBuff('g_ascension', {}, T.ascension.dur, { name: 'Ascensión', icon: '🕊️', desc: 'El Fervor no se gasta y el Aura de Devoción cubre 30 m' });
        g.ui?.spawnText?.(p.pos, '¡ASCENSIÓN!', 'txt-crit');
        fxAt(g, 'devotionCircle', p.pos, 0.2);
        fxAt(g, 'holyImpact', p.pos, 1.6);
      },
      modifyResolve(p, sk, prof) {
        if (sk.id === 'g_t_veredicto' && buffOf(p, 'g_ascension')) prof.cd = Math.max(prof.cd || 0, T.ascension.minCd);
      },
    },
  };
}

// ============================================================
// COMPORTAMIENTOS de las activas de talento (formato MEMORIA §7.3)
// ============================================================
export function guerreroSkillBehaviors() {
  const T = tun();
  return {
    // c2 Segundo Aliento: consumes toda la Furia y te curas 1 % de vida por cada 3 gastada
    // (curación de habilidad: escala con healPct y +6 %/rango)
    g_t_aliento: {
      cast(g, p, prof, cast) {
        const { sk, ctx } = cast;
        const per = sk.furyPerPct || 3;
        const fury = p.mp || 0;
        if (fury < per) { refundCd(g, p, sk, 'Segundo Aliento: no tienes Furia'); return ctx.res; }
        spendResource(p, fury);
        const healed = g.heal(p.stats.maxHP * (fury / per) / 100 * (prof.buffMul || 1), { target: 'self', src: sk.id });
        g.ui?.spawnText?.(p.pos, `+${Math.round(healed)}`, 'txt-heal');
        g.spawnRing?.(p.pos, 1.4, ctx.color || 0xff5a4a);
        fxAt(g, ctx.fx?.aura, p.pos, 1.0);
        ctx.res.hits = 1;
        return ctx.res;
      },
    },
    // c3 Intervención: saltas hasta un aliado a ≤ 8 m (el más cercano a la mira) o 8 m hacia
    // la mira; al caer, tú y él ganáis un escudo del 15 % de TU vida máxima 6 s
    g_t_intervencion: {
      cast(g, p, prof, cast) {
        const { sk, ctx } = cast;
        const range = prof.range || sk.range || 8;
        let ally = null, bd = Infinity;
        for (const a of others(g, p, range + 0.5)) {
          const d = a.pos.distanceTo(cast.target);
          if (d < bd) { bd = d; ally = a; }
        }
        let to;
        if (ally) {
          const back = p.pos.clone().sub(ally.pos).setY(0);
          to = back.lengthSq() > 1e-6 ? ally.pos.clone().addScaledVector(back.normalize(), 1).setY(0) : ally.pos.clone().setY(0);
          to = g.clampWalkable(p.pos, to, range + 1);
        } else to = g.clampWalkable(p.pos, cast.target, range);
        p.faceToward(to);
        fxAt(g, ctx.fx?.trail, p.pos, 0.9);
        p.leap = {
          from: p.pos.clone(), to, t: 0, dur: sk.airT || 0.4,
          onLand: () => {
            const amt = (sk.shieldPct || 15) / 100 * p.stats.maxHP * (prof.buffMul || 1);
            g.shield(amt, { target: 'self', dur: prof.dur || 6, src: sk.id });
            if (ally?.alive !== false) ally?.addShield?.(amt, prof.dur || 6, sk.id);
            g.spawnRing?.(p.pos, 1.6, ctx.color || 0x88bbff);
            fxAt(g, ctx.fx?.impact, p.pos, 1.0);
            ctx.res.hits = ally ? 2 : 1;
            cast.done(ctx.res);
          },
        };
        return undefined;   // diferido: termina al caer
      },
    },
    // c12A Bramido de Guerra: tú y los aliados a 15 m ganan +15 % de vida máxima 10 s y se
    // curan ese 15 % al instante (curación de habilidad)
    g_t_bramido: {
      cast(g, p, prof, cast) {
        const { sk, ctx } = cast;
        const targets = castBuff(g, p, prof, sk, ctx);
        // (addBuff ya recalcula: la cura usa la vida máxima NUEVA)
        const pct = (sk.healPct || 15) * (prof.buffMul || 1);
        for (const a of targets) skillHeal(g, p, a, (a.stats?.maxHP || 0) * pct / 100, sk.id);
        ctx.res.hits = targets.length;
        return ctx.res;
      },
    },
    // s0 Remolino Sangriento (insignia del Berserker): 2 s girando (te mueves a velocidad
    // normal), 10 golpes a todo lo que hay a 2,9 m (57 % del arma cada uno) y Sangrado por
    // golpe (30 % del perfil de Sangrado; los tics llenan la Sed). Carnicería (s6A): +10 % de
    // radio y el Sangrado salta a 1 enemigo cercano por golpe. No exige mantener la tecla
    // (canalización del núcleo con hold: false); la esquiva la corta.
    g_t_remolino: {
      cast(g, p, prof, cast) {
        const { sk, ctx } = cast;
        const rad = prof.radius || 2.9;
        fxAt(g, ctx.fx?.aura, p.pos, 1.0);
        return g.startChannel(ctx, cast.done, {
          hold: false, dur: sk.channelT || 3, ticks: sk.ticks || 10,
          onTick: () => {
            p.swing = 1;
            const hitList = [];
            g.dealArea(p.pos.clone(), rad, ctx.coef, {
              ...ctx.areaOpts,
              onHit: (e, dealt) => { ctx.hit(e, dealt); hitList.push(e); applyBleed(g, p, e, ctx.avgHit, T.remolinoBleedMul * (prof.dotMul || 1), sk.id); },
            });
            // Carnicería: el Sangrado salta a `chain` enemigos cercanos que el giro no tocó
            if (prof.chain > 0 && hitList.length) {
              const hitSet = new Set(hitList);
              let left = prof.chain;
              for (const o of g.enemies || []) {
                if (left <= 0) break;
                if (!o.alive || hitSet.has(o)) continue;
                if (hitList.some(e => e.pos.distanceTo(o.pos) <= T.carniceria.jump)) {
                  applyBleed(g, p, o, ctx.avgHit, T.remolinoBleedMul * (prof.dotMul || 1), sk.id);
                  left--;
                }
              }
            }
            ctx.zoneCenter = p.pos.clone(); ctx.zoneRad = rad;
            fxAt(g, ctx.fx?.extra, p.pos, 0.8);
          },
        });
      },
    },
    // s9 Temeridad: 10 s de +25 % de crítico (prof.buff, escala por rango); el MISMO buff
    // lleva la Sed ×2 (stat del núcleo 'gaugeGain:sed' = +100 %) y el +10 % de daño
    // recibido (stat dmgTakenPct, tras mitigar), sin escalar
    g_t_temeridad: {
      cast(g, p, prof, cast) {
        const { sk, ctx } = cast;
        castBuff(g, p, prof, sk, ctx, {
          ...prof.buff,
          'gaugeGain:sed': ((sk.gaugeMult ?? 2) - 1) * 100,
          dmgTakenPct: sk.dmgTakenPct ?? 10,
        });
        ctx.res.hits = 1;
        return ctx.res;
      },
    },
    // s13B Ira Ciega: pagas un 10 % de tu vida actual: 6 s de +30 % de daño (aditivo) e imparable
    g_t_ira_ciega: {
      cast(g, p, prof, cast) {
        const { sk, ctx } = cast;
        p.setHp(Math.max(1, p.hp * (1 - (sk.hpCostPct || 10) / 100)), sk.id);
        castBuff(g, p, prof, sk, ctx);
        p.unstoppableT = Math.max(p.unstoppableT || 0, prof.dur);
        ctx.res.hits = 1;
        return ctx.res;
      },
    },
    // s0 Grito Desafiante (insignia del Guardián): provoca a todos a 10 m durante 4 s y ganas
    // 20 de Furia. Cerco (s6A): +50 % de radio y ralentiza 3 s. Sin nadie al alcance no se
    // gasta el enfriamiento ni da Furia. Desafío Firme (s4): +2 Bastión (afterCast).
    g_t_desafio: {
      cast(g, p, prof, cast) {
        const { sk, ctx } = cast;
        const rad = prof.radius || 10, dur = prof.dur || 4;
        const list = (g.enemies || []).filter(e => e.alive && e.pos.distanceTo(p.pos) <= rad);
        if (!list.length) { refundCd(g, p, sk, 'Ningún enemigo al alcance'); return ctx.res; }
        for (const e of list) {
          if (e.applyCC('taunt', dur, { src: p })) ctx.res.hits++;
          // Paso 2e: los provocados te hacen −weakenPct % de daño mientras dura (× potencia)
          if (sk.weakenPct > 0) e.weakenOutgoing?.('g_t_desafio', Math.round(sk.weakenPct * (prof.buffMul || 1)), dur);
          if (prof.slow > 0) e.applyCC('slow', prof.slow, { pct: prof.slowPct || 50, src: p });
          fxAt(g, ctx.fx?.impact, e.pos, (e.def?.scale || 1) + 0.8);
        }
        g.gainResource(p, sk.genOnUse || 0);
        g.spawnRing?.(p.pos, rad, ctx.color || 0x5599ff);
        fxAt(g, ctx.fx?.aura, p.pos, 1.0);
        return ctx.res;
      },
    },
    // s9 Muro de Escudos: gastas TODAS las cargas de Bastión: −10 % de daño recibido por carga
    // 8 s (máx. −50 %, saco dr). Al terminar: Venganza Acumulada (x2) devuelve un % de lo absorbido.
    g_t_muro: {
      cast(g, p, prof, cast) {
        const { sk, ctx } = cast;
        const n = Math.floor(gaugeValue(p, 'bastion'));
        if (n < 1) { refundCd(g, p, sk, 'Muro de Escudos: no tienes cargas de Bastión'); return ctx.res; }
        spendGauge(p, 'bastion', n);
        const dr = Math.min(sk.drMax || 50, Math.round((sk.drPerCharge || 10) * n * (prof.buffMul || 1)));
        const dur = prof.dur || 8;
        powerState(p, 'g_venganza').absorbed = 0;
        p.addBuff(sk.id, { dr }, dur, { name: sk.name, icon: sk.icon, desc: `−${dr}% de daño recibido (${n} ${n > 1 ? 'cargas' : 'carga'})` });
        g.spawnRing?.(p.pos, 1.6, ctx.color || 0x7fb0e8);
        fxAt(g, ctx.fx?.aura, p.pos, 1.0);
        g.timers.schedule(dur, () => {
          if (!hasPower(p, 'g_venganza') || !p.alive) return;
          const st = powerState(p, 'g_venganza');
          const total = st.absorbed * T.venganza.pctPerRank * Math.max(1, ownRank(p, 'x2', 'guardian')) / 100;
          st.absorbed = 0;
          if (!(total > 0)) return;
          g.spawnRing?.(p.pos, T.venganza.radius, 0x9fc4ff);
          fxAt(g, 'vengeanceWave', p.pos, 0.3);
          for (const e of g.enemies || []) {
            const r = T.venganza.radius + 0.5 * (e.def?.scale || 1);
            if (e.alive && e.pos.distanceToSquared(p.pos) <= r * r) dealProcDamage(g, e, total, { source: 'power:g_venganza' });
          }
        });
        ctx.res.hits = n;
        return ctx.res;
      },
    },
    // s13B Carga de Escudo: cargas hasta 8 m arrastrando a los enemigos (no jefes: se detiene
    // contra ellos); al llegar, 100 % del arma a todo en 1,9 m y aturde 1,5 s (jefes: stagger)
    g_t_carga: {
      cast(g, p, prof, cast) {
        const { sk, ctx } = cast;
        const dir = cast.target.clone().sub(p.pos).setY(0);
        const dist = Math.min(dir.length(), prof.range || sk.range || 8);
        const dragged = new Set();
        if (dist > 0.1) {
          dir.normalize();
          p.faceToward(p.pos.clone().add(dir));
          let traveled = 0, n = 0;
          while (traveled < dist) {
            const step = Math.min(0.3, dist - traveled);
            const nx = p.pos.x + dir.x * step, nz = p.pos.z + dir.z * step;
            if (g.world?.grid && !g.world.grid.walkable(nx, nz)) break;
            const wall = (g.enemies || []).find(e => e.alive && isBoss(e) && Math.hypot(e.pos.x - nx, e.pos.z - nz) <= 0.6 + 0.5 * (e.def?.scale || 1));
            if (wall) break;                                       // un jefe para la carga
            p.pos.x = nx; p.pos.z = nz; traveled += step;
            for (const e of g.enemies || []) {
              if (!e.alive || dragged.has(e) || isBoss(e)) continue;
              const r = 1.1 + 0.5 * (e.def?.scale || 1);
              if (e.pos.distanceToSquared(p.pos) <= r * r) dragged.add(e);
            }
            const fx = p.pos.x + dir.x * 0.9, fz = p.pos.z + dir.z * 0.9;
            if (!g.world?.grid || g.world.grid.walkable(fx, fz)) for (const e of dragged) { e.pos.x = fx; e.pos.z = fz; }
            if (ctx.fx?.trail && (n++ % 2 === 0)) fxAt(g, ctx.fx.trail, p.pos, 0.9);
          }
        }
        const rad = prof.radius || 1.9;
        g.spawnRing?.(p.pos, rad, ctx.color || 0x6699ff);
        if (ctx.coef > 0) g.dealArea(p.pos.clone(), rad, ctx.coef, ctx.areaOpts);
        ctx.zoneCenter = p.pos.clone(); ctx.zoneRad = rad;
        p.swing = 1;
        fxAt(g, ctx.fx?.impact, p.pos, 0.7);
        g.addShake?.(0.3);
        return ctx.res;
      },
    },
    // s0 Aura de Devoción (insignia del Cruzado): 8 s, tú y los aliados a 15 m recuperan un 2 %
    // de vida por segundo y ganan +30 de armadura (campo g_devocion que te sigue)
    g_t_devocion: {
      cast(g, p, prof, cast) {
        const { sk, ctx } = cast;
        const old = fieldOf(g, p, 'g_devocion');
        if (old) old.t = 0;
        const f = g.spawnField('g_devocion', { pos: p.pos.clone(), radius: sk.allyRadius || 15, dur: prof.dur || 8, owner: p,
          data: { buff: { ...prof.buff }, buffMul: prof.buffMul || 1, healPctPerSec: sk.healPctPerSec || 2, radius: sk.allyRadius || 15,
            meta: { name: sk.name, icon: sk.icon, desc: sk.desc }, color: ctx.color || 0xffdd77 } });
        if (f) devotionPulse(g, f, 0);                       // +armadura al instante
        g.spawnRing?.(p.pos, sk.allyRadius || 15, ctx.color || 0xffdd77);
        fxAt(g, ctx.fx?.aura, p.pos, 0.2);
        fxAt(g, ctx.fx?.extra, p.pos, 1.2);
        ctx.res.hits = 1;
        return ctx.res;
      },
    },
    // s9 Veredicto Final: gasta 3 de Fervor (Ascensión: no se gasta): golpe sagrado en cono de
    // 6 m (300 % del arma); cada aliado a 15 m se cura (sustento) el 25 % (+Gracia) del daño hecho
    g_t_veredicto: {
      cast(g, p, prof, cast) {
        const { sk, ctx } = cast;
        const need = sk.gaugeCost || 3;
        if (!buffOf(p, 'g_ascension') && !spendGauge(p, 'fervor', need)) {
          g.ui?.message?.(`Veredicto Final: necesitas ${need} de Fervor`);
          return ctx.res;
        }
        const dir = cast.target.clone().sub(p.pos).setY(0);
        if (dir.lengthSq() < 1e-6) dir.set(Math.sin(p.group.rotation.y), 0, Math.cos(p.group.rotation.y));
        dir.normalize();
        p.faceToward(p.pos.clone().add(dir));
        p.swing = 1;
        const list = g.enemiesInCone(p.pos, dir, prof.radius || 6, prof.angle || 90);
        for (const e of list) {
          const { dmg, crit } = p.rollDamage(ctx.coef, prof.critBonus, prof.addPct, e, ctx.hitInfo);
          ctx.hit(e, e.takeDamage(dmg, crit, ctx.dmgOpts) || 0);
        }
        if (list.length) p.onDealHit();
        const pct = ((sk.healDealtPct || 25) + (p.tv?.verdictHeal || 0)) / 100;
        if (ctx.res.dealt > 0) for (const a of g.allies(p.pos, 15)) allySustain(a, ctx.res.dealt * pct, sk.id);
        const front = p.pos.clone().addScaledVector(dir, (prof.radius || 6) * 0.5);
        ctx.zoneCenter = front; ctx.zoneRad = (prof.radius || 6) * 0.5;
        g.spawnRing?.(front, (prof.radius || 6) * 0.5, ctx.color || 0xffe08a);
        fxAt(g, ctx.fx?.impact, front, 1.0);
        fxAt(g, ctx.fx?.aura, front, 0.3);
        ctx.res.verdict = true;
        return ctx.res;
      },
    },
  };
}

// pulso del Aura de Devoción: buff (armadura, +daño con Luz del Alba) a los aliados en el
// radio y, si step > 0, 2 %/s de vida × step (curación de aura; +10 % con Devoción Ferviente)
function devotionPulse(g, f, step) {
  const o = f.owner;
  if (!o?.alive) return;
  const T = tun();
  const buff = { ...f.data.buff };
  const heal = (f.data.healPctPerSec || 2) * step * (f.data.buffMul || 1) * (hasPower(o, 'g_devocion_ferviente') ? 1 + T.ferviente.heal / 100 : 1);
  for (const a of g.allies ? g.allies(v3(f.pos.x, 0, f.pos.z), f.radius) : [o]) {
    // Luz del Alba (Paso 2e): +25 % de daño a los aliados y +10 % a ti
    const b = hasPower(o, 'g_luz_alba') ? { ...buff, dmgPct: (buff.dmgPct || 0) + (a === o ? T.alba.selfDmgPct : T.alba.dmgPct) } : buff;
    keepBuff(a, 'g_t_devocion', b, f.data.interval + 0.15, f.data.meta);
    if (heal > 0) skillHeal(g, o, a, (a.stats?.maxHP || 0) * heal / 100, 'g_t_devocion');
  }
}

// ============================================================
// CAMPOS DE SUELO
// ============================================================
export function guerreroFields() {
  return {
    // Aura de Devoción: sigue al dueño; cada 0,5 s renueva el buff y cura. Con Ascensión
    // cubre 30 m. Luz del Alba la alarga (f.t) al gastar Fervor.
    g_devocion: {
      name: 'Aura de Devoción',
      init(f) { f.data.interval = f.data.interval || 0.5; f.acc = 0; f.ringAcc = 0; },
      tick(g, f, dt) {
        const o = f.owner;
        if (!o?.alive) { f.t = 0; return; }
        f.pos.x = o.pos.x; f.pos.z = o.pos.z;
        f.radius = buffOf(o, 'g_ascension') ? tun().ascension.radius : f.data.radius;
        f.acc += dt; f.ringAcc += dt;
        if (f.ringAcc >= 1) { f.ringAcc = 0; g.spawnRing?.(v3(f.pos.x, 0.05, f.pos.z), f.radius, f.data.color); }
        if (f.acc < f.data.interval - 1e-9) return;
        const step = f.acc; f.acc = 0;
        devotionPulse(g, f, step);
      },
      render(g, f) {
        if (f.dead) { if (f.decal) { g.fxGroup.remove(f.decal); f.decal.geometry.dispose(); f.decal.material.dispose(); f.decal = null; } return; }
        if (!f.decal || f.decalR !== f.radius) {
          if (f.decal) { g.fxGroup.remove(f.decal); f.decal.geometry.dispose(); f.decal.material.dispose(); }
          const decal = new THREE.Mesh(new THREE.RingGeometry(f.radius * 0.94, f.radius, 56),
            new THREE.MeshBasicMaterial({ color: f.data.color, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false }));
          decal.rotation.x = -Math.PI / 2;
          g.fxGroup.add(decal);
          f.decal = decal; f.decalR = f.radius;
        }
        f.decal.position.set(f.pos.x, 0.06, f.pos.z);
        f.decal.material.opacity = 0.22 + 0.1 * Math.abs(Math.sin(f.t * 3));
      },
    },
    // Consagración (Cruzado s6A): el suelo sagrado de Martillo de Guerra cura a los aliados
    // dentro (curación de aura: 2 % de vida por segundo, cada 0,5 s). El daño es la zona del núcleo.
    g_consagracion: {
      name: 'Consagración',
      init(f) { f.data.interval = 0.5; f.acc = 0; f.data.color = f.data.color ?? 0xffe39a; },
      tick(g, f, dt) {
        f.acc += dt;
        if (f.acc < f.data.interval - 1e-9) return;
        const step = f.acc; f.acc = 0;
        const o = f.owner;
        if (!o?.alive) return;
        for (const a of g.allies ? g.allies(v3(f.pos.x, 0, f.pos.z), f.radius) : [])
          skillHeal(g, o, a, (a.stats?.maxHP || 0) * (f.data.healPctPerSec || 2) * step / 100, 'g_consagracion');
      },
      render(g, f) {
        if (f.dead) { if (f.decal) { g.fxGroup.remove(f.decal); f.decal.geometry.dispose(); f.decal.material.dispose(); f.decal = null; } return; }
        if (!f.decal) {
          const decal = new THREE.Mesh(new THREE.CircleGeometry(f.radius, 36),
            new THREE.MeshBasicMaterial({ color: f.data.color, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
          decal.rotation.x = -Math.PI / 2;
          decal.position.set(f.pos.x, 0.055, f.pos.z);
          g.fxGroup.add(decal);
          f.decal = decal;
        }
        f.decal.material.opacity = 0.1 + 0.1 * Math.max(0, Math.min(1, f.t / (f.dur || 1)));
      },
    },
    // Martillos Benditos (Cruzado x1/x2): orbitan al dueño mientras tenga el poder; cada
    // segundo cada martillo golpea (proc Sagrado) al enemigo más cercano a su alcance y cada
    // golpe cura un 1 % de vida (sustento) a los aliados a 15 m
    g_martillos: {
      name: 'Martillos Benditos',
      init(f) { f.acc = 0; f.ang = 0; },
      tick(g, f, dt) {
        const o = f.owner;
        if (!o?.alive || !hasPower(o, 'g_martillo_bendito')) { f.t = 0; return; }
        f.t = f.dur;
        f.pos.x = o.pos.x; f.pos.z = o.pos.z;
        f.ang += dt * 3;
        const H = tun().hammers;
        f.acc += dt;
        if (f.acc < H.every - 1e-9) return;
        f.acc = 0;
        const r = hasPower(o, 'g_martillos_juicio') ? Math.max(1, ownRank(o, 'x2', 'cruzado')) : 0;
        const n = H.n + r;
        const reach = H.reach;
        const targets = (g.enemies || []).filter(e => e.alive && e.pos.distanceTo(o.pos) <= reach + 0.5 * (e.def?.scale || 1))
          .sort((a, b) => a.pos.distanceToSquared(o.pos) - b.pos.distanceToSquared(o.pos));
        if (!targets.length) return;
        const holy = o.talentAgg?.mods?.g_t_devocion?.dmg || 0;            // Fe Ardiente (+% Sagrado)
        const dmg = o.avgHit(H.coef, holy + H.juicioPct * r);
        const tags = new Set(['holy']);
        for (let i = 0; i < n; i++) {
          const e = targets[i % targets.length];
          if (!e.alive) continue;
          if (dealProcDamage(g, e, dmg, { source: 'power:g_martillo_bendito', tags }) > 0)
            for (const a of g.allies ? g.allies(o.pos, H.healRadius) : [o]) allySustain(a, (a.stats?.maxHP || 0) * H.healPct / 100, 'g_martillo_bendito');
          fxAt(g, 'justiceSpark', e.pos, 1.0);
        }
      },
      render(g, f) {
        const list = f.meshes || [];
        if (f.dead) { for (const m of list) { g.fxGroup.remove(m); m.geometry.dispose(); m.material.dispose(); } f.meshes = null; return; }
        const o = f.owner;
        const H = tun().hammers;
        const n = H.n + (o && hasPower(o, 'g_martillos_juicio') ? Math.max(1, ownRank(o, 'x2', 'cruzado')) : 0);
        while (list.length < n) {
          const m = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.42, 0.18),
            new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
          g.fxGroup.add(m); list.push(m);
        }
        while (list.length > n) { const m = list.pop(); g.fxGroup.remove(m); m.geometry.dispose(); m.material.dispose(); }
        f.meshes = list;
        for (let i = 0; i < list.length; i++) {
          const a = f.ang + i * Math.PI * 2 / list.length;
          list[i].position.set(f.pos.x + Math.cos(a) * 1.6, 1.1 + 0.15 * Math.sin(f.ang * 2 + i), f.pos.z + Math.sin(a) * 1.6);
          list[i].rotation.set(0, -a, 0.6);
        }
      },
    },
  };
}

// ============================================================
// INDICADORES NUEVOS: ninguno (Sed, Bastión y Fervor son de spec-mechanics.js)
// ============================================================
export function guerreroGauges() {
  return {};
}
