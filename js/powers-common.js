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
//   critFireCdr     ⑤ cada crítico DIRECTO de Fuego reduce X s los enfriamientos de Fuego
//                   (no definitivas), una vez por instante
//   rootedWeak      ⑨ Debilidad +X a los enemigos INMOVILIZADOS (todo el grupo)
//   drHighMana · drVsSlowed · drMoving · drFocus   ⑧ reducción de daño CONDICIONAL
//                   (maná > 50 % · el atacante está ralentizado/Congelado · te mueves ·
//                   Concentración > 50). El tv.dmgReduc de recompute es la incondicional.
// Las demás claves de §5.3 las lee su punto natural: combat-math.condAddPct/condCritPct
// (eliteDmg, slowedDmg, preyDmg, explodedDmg, burningCrit…), spec-mechanics (frostLayers,
// focusRate, focusEnergy, galeHeal, galeEnergy, fervorChance), resolveSkill (costRed…),
// dotProfile (bleedPct, dotDur…) o la activa que las usa (barrierDr, verdictHeal…).
export const CORE_TV_POWER = 'nucleo_tv';
function coreTvKeys() {
  return ['killHeal', 'manaOnKill', 'burnKillHeal', 'burnKillMana', 'bleedKillHeal', 'bleedKillMana',
    'executePct', 'critFireCdr', 'rootedWeak', 'drHighMana', 'drVsSlowed', 'drMoving', 'drFocus'];
}
export function usesCoreTv(tv) {
  if (!tv) return false;
  for (const k of coreTvKeys()) if (tv[k]) return true;
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
    // nodos clave de talento (§5.2.2): Sed de Batalla también con la Sed Saciada
    // (indicador de spec-mechanics: p.gauges.sed.satedT), Tiro Mortal ×1,30 y
    // Cacería ×1,30 contra ralentizados o inmovilizados que NO sean jefes (2e: control de hordas)
    m_berserk: { name: 'Sed de Batalla', desc: 'Daño ×1,25 con vida por debajo del 40 % o con la Sed Saciada.',
      mult: { mult: 1.25, when: c => c.hpFrac < 0.4 || (c.p?.gauges?.sed?.satedT || 0) > 0 } },
    m_deadeye: { name: 'Tiro Mortal', desc: 'Críticos ×1,20 contra objetivos con más del 60 % de vida.', mult: { mult: 1.20, when: c => c.crit && c.targetFrac > 0.6 } },
    m_hunt:    { name: 'Cacería', desc: 'Daño ×1,30 contra ralentizados o inmovilizados (salvo jefes).', mult: { mult: 1.30, when: c => !c.e?.def?.boss && (c.targetSlowed || (c.e?.rootT || 0) > 0) } },

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
    // Arcanista s0 (Paso 2c.0): el texto del nodo es «cada golpe Arcano te devuelve 1
    // de maná» (eso lo da su stats.mph: 1) y las Cargas Arcanas (indicador `cargas`
    // de spec-mechanics.js). El 4 % del maná máximo por golpe de la maestría vieja
    // era maná infinito con el pozo de §2 (≈16 por golpe a Nv50): el poder queda
    // como marca del nodo clave, sin efecto propio (los talentos de 2c.1 pueden
    // reaccionar a él con hasPower).
    m_overload: {
      name: 'Sobrecarga Arcana', desc: 'Nodo clave del Arcanista: cada golpe te devuelve maná y el Dardo Arcano genera Cargas Arcanas.',
    },
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
    m_judgment: {
      name: 'Juicio', desc: 'Al matar, una onda sagrada (20 % del golpe medio) daña a los cercanos.',
      onKill(g, p, e, kill) { if (!kill?.nested) burst(g, e, Math.max(2, Math.round(avgOf(p) * 0.2)), 2.9, 0xffe680, 10, 'm_judgment'); },
    },
    m_conflag: {
      name: 'Conflagración', desc: 'Al matar, una explosión de fuego (270 % del golpe medio) daña la zona.',
      onKill(g, p, e, kill) { if (!kill?.nested) burst(g, e, Math.max(2, Math.round(avgOf(p) * 2.7)), 3.1, 0xff7722, 14, 'm_conflag'); },
    },

    // ---- Paso 2c.2: claves tv del núcleo (ver cabecera) ----
    nucleo_tv: {                                    // = CORE_TV_POWER (literal: ciclo de módulos)
      name: 'Talentos (núcleo)', desc: 'Aplica las claves de talento que consume el núcleo (curas al matar, Ejecutar, reducción condicional…).',
      priority: 5,                                    // el remate antes que los onHit de clase
      state: () => ({ cdrAt: -1 }),
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
        // Pirotecnia: crítico directo de Fuego → −X s a los enfriamientos de Fuego (no definitivas)
        const red = tv.critFireCdr || 0;
        if (red > 0 && hit?.crit && hit.elem === 'fire') {
          const st = powerState(p, 'nucleo_tv');
          if (st.cdrAt !== p.simT) {
            st.cdrAt = p.simT;
            for (const sk of p.cls?.skills || []) {
              if (sk.elem !== 'fire' || sk.cat === 'ultimate' || !(p.cds?.[sk.id] > 0)) continue;
              p.cds[sk.id] = Math.max(0, p.cds[sk.id] - red);
            }
          }
        }
      },
      onKill(g, p, e, kill) {
        const tv = p.tv || {};
        const burning = !!kill?.status?.burning, bleeding = !!kill?.status?.bleeding;
        const heal = (tv.killHeal || 0) + (burning ? tv.burnKillHeal || 0 : 0) + (bleeding ? tv.bleedKillHeal || 0 : 0);
        if (heal > 0 && p.alive && p.sustain(p.stats.maxHP * heal / 100, 'nucleo_tv') > 0) g.ui?.spawnText?.(p.pos, '+❤️', 'txt-heal');
        const res = (tv.manaOnKill || 0) + (burning ? tv.burnKillMana || 0 : 0) + (bleeding ? tv.bleedKillMana || 0 : 0);
        if (res > 0) gainResource(p, res);
      },
      // Espinas Venenosas: Debilidad a los inmovilizados (dura lo que les quede de raíz)
      onTick(g, p) {
        const w = p.tv?.rootedWeak || 0;
        if (!(w > 0)) return;
        for (const e of g?.enemies || []) if (e.alive && e.rootT > 0) e.applyWeakness?.('m_espinas_venenosas', w, e.rootT);
      },
      // reducción de daño condicional (Piel de Maná, Pellejo de Oso, Esquiva Felina, Posición Elevada)
      condDr(p, dmg) {
        const tv = p.tv || {};
        let dr = 0;
        if (tv.drHighMana && (p.stats?.maxMP || 0) > 0 && p.mp / p.stats.maxMP > 0.5) dr += tv.drHighMana;
        const src = dmg?.src;
        if (tv.drVsSlowed && src && ((src.slowT || 0) > 0 || (src.frozenT || 0) > 0)) dr += tv.drVsSlowed;
        if (tv.drMoving && p.moving) dr += tv.drMoving;
        if (tv.drFocus && gaugeValue(p, 'concentracion') > 50) dr += tv.drFocus;
        return dr;
      },
    },

    // ---- ⑧ onLethal + ⑨ onTick ----
    m_aegis: {
      name: 'Muro Inquebrantable', desc: 'Un golpe letal te deja a 1 de vida e inmune 2 s (recarga 30 s).',
      state: () => ({ cd: 0 }),
      onTick(g, p, dt) { const st = powerState(p, 'm_aegis'); if (st.cd > 0) st.cd = Math.max(0, st.cd - dt); },
      onLethal(g, p) {
        const st = powerState(p, 'm_aegis');
        if (st.cd > 0) return false;
        st.cd = 30;
        p.setHp(1, 'm_aegis');       // restauración (fija la vida; no es curación)
        p.grantInvuln(2);
        g.ui?.message?.('🛡️ ¡Muro Inquebrantable! Sobrevives al golpe letal', 3000);
        g.ui?.spawnText?.(p.pos, '¡INQUEBRANTABLE!', 'txt-heal');
        g.addShake?.(0.5, 0.5);
        g.sfx?.('levelup');
        return true;
      },
    },
  };
}

// comportamientos de habilidad comunes (ninguno en 2b.0; ver §9.1.3)
export function commonBehaviors() {
  return {};
}
