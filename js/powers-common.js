// ============================================================
// Poderes COMUNES (legendarios, Paragon, eras y los nodos clave de talento que ya
// existían como maestrías) — Paso 2b.0 · valores de §5.2.2/§5.2.3 en el Paso 2c.0
// ============================================================
// Migración de TODOS los `powers.has(...)` que estaban dispersos por main.js y
// entities.js a entradas del registro (js/powers.js, §9.1). Cada poder declara
// solo los ganchos que usa; el despachador los llama desde los puntos fijos.
//
// IMPORTANTE (ciclo de módulos): js/powers.js importa este archivo y lo registra
// al cargar. Por eso aquí todo vive DENTRO de funciones (commonPowers /
// commonBehaviors): nada de constantes de módulo que se lean al registrar.
// Los módulos por clase de 2c (powers-<clase>.js) siguen el mismo patrón.
import { volatileDamage } from './combat-math.js';
import { dealProcDamage, powerState } from './powers.js';
import { gaugeValue } from './spec-mechanics.js';
import { gainResource } from './resources.js';
import { NUCLEO_TV_KEYS, NUCLEO_TV_OUTSIDE } from './skill-defs.js';   // módulo sin imports: no forma ciclo
// definición FORJADA de una habilidad (elemento real tras la forja): la caché que deja
// resolveSkill (p.forged / p.resolved). Sin importar skill-resolve.js: resources.js →
// powers.js → aquí → skill-resolve → data.js formaría un ciclo con RESOURCE_DEFS sin iniciar.
// Las habilidades en enfriamiento ya se resolvieron al lanzarse.
const forgedDef = (p, sk) => p.forged?.[sk.id]?.def || p.resolved?.[sk.id]?.def || sk;

// ------------------------------------------------------------
// Paso 2c.2 — CLAVES tv QUE CONSUME EL NÚCLEO (poder común `nucleo_tv`)
// ------------------------------------------------------------
// Player.recompute añade el poder `nucleo_tv` cuando el agregado de talentos trae alguna
// de estas claves (usesCoreTv). Así ningún nodo necesita llevar el poder de OTRO nodo
// («portadores»/«anfitriones» de 2c.1): el nodo declara su clave y el núcleo la aplica.
//   killHeal        ⑥ % de vida al matar (sustento, cubeta compartida §6.1)
//   manaOnKill      ⑥ recurso de clase al matar
//   burnKillHeal / burnKillMana    ⑥ lo mismo si el muerto ARDÍA (KillInfo.status.burning)
//   bleedKillHeal / bleedKillMana  ⑥ lo mismo si el muerto SANGRABA (KillInfo.status.bleeding)
//   executePct      ⑤ remata a los NORMALES por debajo del umbral (élites/jefes: +40 %
//                   aditivo bajo él, combat-math.condAddPct); wasExecuted(e) = «remate»
//   critFireCdr · critFrostCdr   ⑤ cada crítico DIRECTO de Fuego (de Hielo) reduce X s los
//                   enfriamientos de Fuego (de Hielo), no definitivas, una vez por instante
//   critCdrAll      ⑤ Paso 2: cada crítico directo reduce X s TODOS tus enfriamientos salvo
//                   las definitivas (Ritmo de Matanza), una vez por instante
//   basicCritCdr    ⑤ Paso 2: cada crítico directo de tu BÁSICO reduce X s los enfriamientos
//                   de tu movilidad y de tus defensas (Ritmo de Combate; alias dartCritCdr)
//   frozenKillHeal / frozenKillMana   ⑥ Paso 2: % de vida / recurso al matar a un CONGELADO
//   rootedWeak      ⑨ Debilidad +X a los enemigos INMOVILIZADOS (todo el grupo)
//   drHighMana · drVsSlowed · drMoving · drFocus   ⑧ reducción de daño CONDICIONAL
//                   (maná > 50 % · el atacante está ralentizado/Congelado · te mueves ·
//                   Concentración > 50). El tv.dmgReduc de recompute es la incondicional.
//                   drHighMana vale para cualquier recurso (> 50 %: Determinación = drHighFury)
//   drLowHp         ⑧ Paso 2: reducción de daño con menos del 40 % de vida (Umbral del Dolor)
//   drStill         ⑧ Paso 2: reducción de daño QUIETA más de DR_STILL_T s (Quietud): p.stillT,
//                   s sin desplazarte por ningún medio (no el plantado); espejo de drMoving
//   perfectCdrAll   ③ Paso 2 (Liturgia): cada suelta PERFECTA acorta X s tus enfriamientos
//                   salvo las definitivas y las de recarga al acabar (cdOnEnd); como mucho
//                   una vez cada 2 s. Todo enfriamiento se resta con g.reduceCooldown (D2).
// Las demás claves de §5.3 las lee su punto natural: combat-math.condAddPct/condCritPct
// (eliteDmg, slowedDmg, preyDmg, explodedDmg, burningCrit…), spec-mechanics (frostLayers,
// focusRate, focusEnergy, galeHeal, galeEnergy, fervorChance), resolveSkill (costRed…),
// dotProfile (bleedPct, dotDur…) o la activa que las usa (barrierDr, verdictHeal…).
// fieldDur está en NUCLEO_TV_KEYS (para CORE_TV_KEYS) pero la lee spawnField: no activa el poder.
export const CORE_TV_POWER = 'nucleo_tv';
// la lista de claves es NUCLEO_TV_KEYS (skill-defs.js, fuente única que comparte talents.CORE_TV_KEYS)
// umbral de vida de tv.drLowHp
export const DR_LOW_HP_FRAC = 0.4;
// s quieta para tv.drStill (Quietud: «quieta más de 1 s»)
export const DR_STILL_T = 1;
// crítico directo → enfriamientos (claves tv del núcleo): qué habilidades acorta cada clave.
// nucleo_tv las lee POR TABLA (tv[clave]); test78 acepta como leídas las de CRIT_CDR_TV_KEYS
const CRIT_CDR_KEYS = {
  critFireCdr: { hit: h => h.elem === 'fire', sk: d => d.elem === 'fire' },
  critFrostCdr: { hit: h => h.elem === 'frost', sk: d => d.elem === 'frost' },
  critCdrAll: { hit: () => true, sk: () => true },
  basicCritCdr: { hit: h => hasTag(h, 'basic'), sk: d => d.cat === 'movement' || d.cat === 'defense' },
};
export const CRIT_CDR_TV_KEYS = Object.freeze(Object.keys(CRIT_CDR_KEYS));
function hasTag(hit, t) {
  const tags = hit?.tags;
  return !!(tags && (tags instanceof Set ? tags.has(t) : Array.isArray(tags) && tags.includes(t)));
}
export function usesCoreTv(tv) {
  if (!tv) return false;
  for (const k of NUCLEO_TV_KEYS) if (tv[k] && !NUCLEO_TV_OUTSIDE.includes(k)) return true;
  return false;
}
// ¿murió REMATADO? (normal ejecutado por Ejecutar, o élite/jefe golpeado bajo el umbral)
export function wasExecuted(e) { return !!(e?._executed || e?._execUnder); }

export function commonPowers() {
  const isBoss = e => !!(e?.def?.boss || e?.def?.uber || e?.def?.worldBoss);
  const avgOf = p => (p.avgHit ? p.avgHit() : ((p.stats?.dmgMin || 1) + (p.stats?.dmgMax || 2)) / 2);
  // explosión al matar (proc: sin Π[×]; la guarda `kill.nested` evita cadenas)
  const burst = (g, e, dmg, rad, color, n, id) => {
    g.spawnRing?.(e.pos.clone(), rad, color);
    g.spawnBurst?.(e.pos, color, n);
    for (const o of g.enemies || [])
      if (o.alive && o !== e && o.pos.distanceToSquared(e.pos) <= rad * rad)
        dealProcDamage(g, o, dmg, { source: `power:${id}`, tags: new Set(['area']) });
  };
  return {
    // ---- multiplicadores [×] (Paso 1A; ≤ ×1,3; máx. 3 activos) ----
    furia:     { name: 'Furia', desc: 'Daño ×1,15 con vida por encima del 80 %.', mult: { mult: 1.15, when: c => c.hpFrac > 0.8 } },
    // nodo clave de talento (§5.2.2): Sed de Batalla también con la Sed Saciada
    // (indicador de spec-mechanics: p.gauges.sed.satedT)
    m_berserk: { name: 'Sed de Batalla', desc: 'Daño ×1,25 con vida por debajo del 40 % o con la Sed Saciada.',
      mult: { mult: 1.25, when: c => c.hpFrac < 0.4 || (c.p?.gauges?.sed?.satedT || 0) > 0 } },

    // ---- ① stats ----
    avaricia: {
      name: 'de la Avaricia', desc: '+30 % de hallazgo mágico y los enemigos sueltan +50 % de oro.',
      stats: () => ({ mf: 30 }),
      onKill(g, p, e, kill) { if (kill?.loot) kill.loot.goldMul = Math.max(kill.loot.goldMul || 1, 1.5); },
    },
    agil: {
      name: 'del Viento', desc: 'Tu esquiva se recarga un 40 % más rápido (3 s → 1,8 s).',
      stats: () => ({ dodgeCdr: 1.2 }),
    },

    // ---- ② modifyResolve ----
    multidisparo: {
      name: 'del Vendaval', desc: 'Tus ataques y habilidades de proyectil lanzan +1 proyectil.',
      modifyResolve(p, sk, prof) { if (prof.tags?.has('proj')) prof.proj = (prof.proj || 0) + 1; },
    },

    // ---- ⑤ onHit ----
    // Crionte s0 (§5.2.3): astilla a los CONGELADOS (5 capas de Escarcha) por debajo
    // de tv.shatterPct (15 %), no jefes
    m_shatter: {
      name: 'Cero Absoluto', desc: 'Los enemigos Congelados (no jefes ni élites) por debajo del 38 % de vida se astillan.',
      procs: true,
      onHit(g, p, e) {
        const pct = (p.tv?.shatterPct || 15) / 100;
        if (!e?.alive || isBoss(e) || e.def?.rank === 'elite' || !(e.frozenT > 0) || e.hp > e.maxHP * pct) return false;
        g.ui?.spawnText?.(e.pos.clone().setY((e.def?.scale || 1) + 0.6), '¡ASTILLADO!', 'txt-crit');
        dealProcDamage(g, e, e.hp + 1, { source: 'power:m_shatter' });
      },
    },

    // ---- ⑥ onKill ----
    festin: {
      name: 'del Festín', desc: 'Recuperas un 6 % de tu vida máxima al matar (sustento: cubeta compartida).',
      onKill(g, p) {
        if (!p.alive) return;
        if (p.sustain(p.stats.maxHP * 0.06, 'festin') > 0) g.ui?.spawnText?.(p.pos, '+❤️', 'txt-heal');
      },
    },
    volatil: {
      name: 'Volátil', desc: 'Los enemigos explotan al morir: 50 % de tu golpe medio a los cercanos (no encadena).',
      onKill(g, p, e, kill) { if (!kill?.nested) burst(g, e, volatileDamage(avgOf(p)), 2.6, 0xff6622, 10, 'volatil'); },
    },

    // ---- Paso 2c.2: claves tv del núcleo (ver cabecera) ----
    nucleo_tv: {                                    // = CORE_TV_POWER (literal: ciclo de módulos)
      name: 'Talentos (núcleo)', desc: 'Aplica las claves de talento que consume el núcleo (curas al matar, Ejecutar, reducción condicional…).',
      priority: 5,                                    // el remate antes que los onHit de clase
      state: () => ({ cdrAt: {}, perfAt: -99 }),
      onHit(g, p, e, hit) {
        const tv = p.tv || {};
        // Ejecutar: normales por debajo del umbral → remate; élites/jefes → marca de «remate»
        const ex = tv.executePct || 0;
        if (ex > 0 && e?.alive && e.maxHP > 0 && e.hp / e.maxHP <= ex / 100) {
          if (e.def?.rank || isBoss(e)) e._execUnder = true;
          else {
            e._executed = true;
            g.ui?.spawnText?.(e.pos.clone().setY((e.def?.scale || 1) + 0.6), '¡REMATE!', 'txt-crit');
            dealProcDamage(g, e, e.hp + 1, { source: 'power:nucleo_tv', skill: hit?.skill || null });
          }
        }
        // críticos directos que acortan enfriamientos (Pirotecnia, Astillas, Ritmo de Matanza,
        // Ritmo de Combate): elemento FORJADO (una Saeta Ígnea cuenta como Fuego), nunca las
        // definitivas, una vez por instante y clave
        if (hit?.crit && !hit.proc && !hit.dot) {
          const st = powerState(p, 'nucleo_tv');
          for (const [key, rule] of Object.entries(CRIT_CDR_KEYS)) {
            const red = tv[key] || (key === 'basicCritCdr' ? tv.dartCritCdr || 0 : 0);
            if (!(red > 0) || !rule.hit(hit) || st.cdrAt[key] === p.simT) continue;
            st.cdrAt[key] = p.simT;
            for (const sk of p.cls?.skills || []) {
              const def = forgedDef(p, sk);
              if (def.cat === 'ultimate' || !rule.sk(def) || !(p.cds?.[sk.id] > 0)) continue;
              g.reduceCooldown?.(p, sk.id, red);
            }
          }
        }
      },
      // Liturgia: suelta perfecta → −X s a todas tus recargas (no definitivas ni cdOnEnd), cada 2 s
      afterCast(g, p, cast) {
        const red = p.tv?.perfectCdrAll || 0;
        if (!(red > 0) || !cast?.perfect || cast.echo) return;
        const st = powerState(p, 'nucleo_tv');
        if ((p.simT || 0) - st.perfAt < 2 - 1e-9) return;
        st.perfAt = p.simT || 0;
        for (const sk of p.cls?.skills || []) {
          const def = forgedDef(p, sk);
          if (def.cat === 'ultimate' || def.cdOnEnd || !(p.cds?.[sk.id] > 0)) continue;
          g.reduceCooldown?.(p, sk.id, red);
        }
      },
      onKill(g, p, e, kill) {
        const tv = p.tv || {};
        const burning = !!kill?.status?.burning, bleeding = !!kill?.status?.bleeding, frozen = !!kill?.status?.frozen;
        const heal = (tv.killHeal || 0) + (burning ? tv.burnKillHeal || 0 : 0) + (bleeding ? tv.bleedKillHeal || 0 : 0) + (frozen ? tv.frozenKillHeal || 0 : 0);
        if (heal > 0 && p.alive && p.sustain(p.stats.maxHP * heal / 100, 'nucleo_tv') > 0) g.ui?.spawnText?.(p.pos, '+❤️', 'txt-heal');
        const res = (tv.manaOnKill || 0) + (burning ? tv.burnKillMana || 0 : 0) + (bleeding ? tv.bleedKillMana || 0 : 0) + (frozen ? tv.frozenKillMana || 0 : 0);
        if (res > 0) gainResource(p, res);
      },
      // Espinas Venenosas: Debilidad a los inmovilizados (dura lo que les quede de raíz)
      onTick(g, p) {
        const w = p.tv?.rootedWeak || 0;
        if (!(w > 0)) return;
        for (const e of g?.enemies || []) if (e.alive && e.rootT > 0) e.applyWeakness?.('m_espinas_venenosas', w, e.rootT);
      },
      // reducción de daño condicional (Piel de Maná, Pellejo de Oso, Esquiva Felina, Posición Elevada,
      // Quietud)
      condDr(p, dmg) {
        const tv = p.tv || {};
        let dr = 0;
        if (tv.drHighMana && (p.stats?.maxMP || 0) > 0 && p.mp / p.stats.maxMP > 0.5) dr += tv.drHighMana;
        const src = dmg?.src;
        if (tv.drVsSlowed && src && ((src.slowT || 0) > 0 || (src.frozenT || 0) > 0)) dr += tv.drVsSlowed;
        if (tv.drMoving && p.moving) dr += tv.drMoving;
        // quieta ≥ 1 s (p.stillT: caminar con keepPlanted o llegar con plant: true no cuentan)
        if (tv.drStill && (p.stillT || 0) >= DR_STILL_T - 1e-9) dr += tv.drStill;
        if (tv.drFocus && gaugeValue(p, 'concentracion') > 50) dr += tv.drFocus;
        if (tv.drLowHp && (p.stats?.maxHP || 0) > 0 && p.hp / p.stats.maxHP < DR_LOW_HP_FRAC) dr += tv.drLowHp;
        return dr;
      },
    },
  };
}

// comportamientos de habilidad comunes (ninguno en 2b.0; ver §9.1.3)
export function commonBehaviors() {
  return {};
}
