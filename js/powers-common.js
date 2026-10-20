// ============================================================
// Poderes COMUNES (legendarios, Paragon, maestrías, eras) — Paso 2b.0
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
import { gainResource } from './resources.js';

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
    m_berserk: { name: 'Sed de Batalla', desc: 'Daño ×1,25 con vida por debajo del 40 %.', mult: { mult: 1.25, when: c => c.hpFrac < 0.4 } },
    m_deadeye: { name: 'Tiro Mortal', desc: 'Críticos ×1,25 contra objetivos con más del 60 % de vida.', mult: { mult: 1.25, when: c => c.crit && c.targetFrac > 0.6 } },
    m_hunt:    { name: 'Cacería', desc: 'Daño ×1,15 contra ralentizados.', mult: { mult: 1.15, when: c => c.targetSlowed } },

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
    m_overload: {
      name: 'Sobrecarga Arcana', desc: 'Recuperas un 4 % del maná máximo con cada golpe (una vez por impacto).',
      icd: 0.05,  // un área que golpea a varios en el mismo instante cuenta una vez
      onHit(g, p) { gainResource(p, (p.stats?.maxMP || 0) * 0.04); },
    },
    m_shatter: {
      name: 'Cero Absoluto', desc: 'Los enemigos ralentizados (no jefes) con poca vida (≤18 %) se astillan.',
      procs: true,
      onHit(g, p, e) {
        if (!e?.alive || isBoss(e) || !(e.slowT > 0) || e.hp > e.maxHP * 0.18) return false;
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
