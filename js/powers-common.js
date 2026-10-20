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
    // Cacería ×1,20 contra ralentizados o inmovilizados
    m_berserk: { name: 'Sed de Batalla', desc: 'Daño ×1,25 con vida por debajo del 40 % o con la Sed Saciada.',
      mult: { mult: 1.25, when: c => c.hpFrac < 0.4 || (c.p?.gauges?.sed?.satedT || 0) > 0 } },
    m_deadeye: { name: 'Tiro Mortal', desc: 'Críticos ×1,30 contra objetivos con más del 60 % de vida.', mult: { mult: 1.30, when: c => c.crit && c.targetFrac > 0.6 } },
    m_hunt:    { name: 'Cacería', desc: 'Daño ×1,20 contra ralentizados o inmovilizados.', mult: { mult: 1.20, when: c => c.targetSlowed || (c.e?.rootT || 0) > 0 } },

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
      name: 'Cero Absoluto', desc: 'Los enemigos Congelados (no jefes) por debajo del 15 % de vida se astillan.',
      procs: true,
      onHit(g, p, e) {
        const pct = (p.tv?.shatterPct || 15) / 100;
        if (!e?.alive || isBoss(e) || !(e.frozenT > 0) || e.hp > e.maxHP * pct) return false;
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
      name: 'Juicio', desc: 'Al matar, una onda sagrada (60 % del golpe medio) daña a los cercanos.',
      onKill(g, p, e, kill) { if (!kill?.nested) burst(g, e, Math.max(2, Math.round(avgOf(p) * 0.6)), 2.9, 0xffe680, 10, 'm_judgment'); },
    },
    m_conflag: {
      name: 'Conflagración', desc: 'Al matar, una explosión de fuego (70 % del golpe medio) daña la zona.',
      onKill(g, p, e, kill) { if (!kill?.nested) burst(g, e, Math.max(2, Math.round(avgOf(p) * 0.7)), 3.1, 0xff7722, 14, 'm_conflag'); },
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
