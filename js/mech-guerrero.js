// ============================================================
// MECÁNICAS DE ESPECIALIZACIÓN DEL GUERRERO: Sed (Berserker) · Bastión (Guardián) · Fervor (Cruzado)
// ============================================================
// Paso 2 (E0.3): sale de js/spec-mechanics.js SIN cambiar nada (puro movimiento). Dueño
// desde E2: KT-guerrero (docs/paso2-implementacion.md §2 E2: ids de nodo citados, verbos nuevos).
// Módulo HOJA (sin imports, y así debe quedar): el núcleo (js/spec-mechanics.js) compone
// gaugeTuning()/baseGauges() de las tres clases e INYECTA sus helpers en `H` para no crear
// un ciclo con powers.js. `H` trae: gainGauge, spendGauge, drainGauge, gaugeGainMult,
// gaugeLossMult, isBoss, buffOf, peekPower, r2, now, isBasicHit, invalidate, talentSkill,
// hasPower, gainResource y, perezosos (getters), POWER_HOOKS y STAGGER_CC.
// Nada de `const` de módulo que se lea al cargar: el núcleo puede llamar a estas funciones
// dentro del ciclo powers.js ↔ spec-mechanics.js, antes de evaluar este archivo.
//   gaugeTuning(H) → { <id>: números }       ÚNICA fuente de los números (explain(T) de la UI)
//   baseGauges(T, H) → { <id>: definición }  T = gaugeTuning() COMPLETO (las tres clases)
// El orden de las claves importa (gaugeDefs/gaugeIds lo conservan): guerrero → maga → arquera.

export function gaugeTuning(H) {
  const { talentSkill } = H;
  const muro = talentSkill('g_t_muro'), ver = talentSkill('g_t_veredicto');
  return {
    sed:      { perHpPct: 1, perBleedTick: 2, bleedPerSec: 10, satedT: 6, decayAfter: 4, decayRate: 8,
      max: 100, lowHpPct: 40, satedDmgPct: 25,                              // m_berserk ×1,25
      remolino: { perHit: 2, max: 20 },                                      // s4 Remolino Sediento (2e: por golpe)
      frenzy: { t: 8, aspdPct: 30, healPct: 1 } },                           // s14 Sangre Hirviente
    bastion:  { max: 5, perBlock: 1, decayEvery: 6, blockPct: 15,
      shout: 2,                                                              // s4 Desafío Firme
      murallaPerRank: 1,                                                     // s17 Muralla Viviente (2e: era 2)
      wall: { t: muro.dur ?? 8, drPerCharge: muro.drPerCharge ?? 10, drMax: muro.drMax ?? 50 } },
    fervor:   { max: 3, perKill: 1, hammerHits: 3, basicHits: 3,             // 2e: también 1 cada 3 básicos
      verdict: { cost: ver.gaugeCost ?? 3, coefPct: Math.round((ver.coef ?? 3) * 100), healPct: ver.healDealtPct ?? 25 },
      ascension: { t: 10, need: 3 } },                                       // x3 Ascensión
  };
}

export function baseGauges(T, H) {
  const { gainGauge, drainGauge, buffOf, now, isBasicHit, hasPower } = H;
  return {
    // Berserker: perder vida y desangrar llenan la Sed; a 100 → Sed Saciada 6 s
    // (activa m_berserk ×1,25 aunque tengas la vida alta) y vuelve a 0.
    sed: {
      name: 'Sed', color: '#e8634a', max: 100, procs: true,
      decay: { after: T.sed.decayAfter, rate: T.sed.decayRate, ooc: true },
      state: () => ({ satedT: 0, bleedT: -9, bleedN: 0 }),
      canGain: (p, st) => !(st.satedT > 0),
      hold: st => st.satedT > 0,
      onDamaged(g, p, dmg) {
        const max = p.stats?.maxHP || 0;
        if (dmg?.amount > 0 && max > 0) gainGauge(p, 'sed', dmg.amount / max * 100 * T.sed.perHpPct);
      },
      onHit(g, p, e, hit, st) {
        if (!hit?.dot || !/:bleed$/.test(hit.source || '')) return;
        if (now(p) - st.bleedT >= 1) { st.bleedT = now(p); st.bleedN = 0; }
        const n = Math.min(T.sed.perBleedTick, T.sed.bleedPerSec - st.bleedN);
        if (n > 0) { st.bleedN += n; gainGauge(p, 'sed', n); }
      },
      onFull(g, p, st) {
        st.satedT = T.sed.satedT;
        g?.ui?.spawnText?.(p.pos, '¡SED SACIADA!', 'txt-crit');
      },
      onTick(g, p, dt, st) {
        if (st.satedT > 0) { st.satedT -= dt; if (st.satedT <= 0) { st.satedT = 0; drainGauge(p, 'sed', st.v); } }
      },
      view: st => (st.satedT > 0 ? { state: 'active', label: 'Sed Saciada', t: st.satedT } : null),
      // v2: vida baja (m_berserk activo por vida) y Desenfreno (s14, buff g_desenfreno)
      viewX(p, st, e, out) {
        const max = p.stats?.maxHP || 0, fr = buffOf(p, 'g_desenfreno');
        out.x = { low: max > 0 && p.hp / max < T.sed.lowHpPct / 100, frenzyT: fr ? fr.t : 0, frenzyMax: fr ? (fr.dur || T.sed.frenzy.t) : 0 };
        if (st.satedT > 0) out.tMax = T.sed.satedT;
      },
    },
    // Guardián: +1 carga por bloqueo (innata: 15 % de bloqueo con escudo); se pierde
    // 1 carga cada 6 s sin ganar ninguna. La gastan Muro de Escudos y los talentos.
    bastion: {
      name: 'Bastión', color: '#7fb0e8', max: T.bastion.max, integer: true,
      decay: { after: 0, every: T.bastion.decayEvery, n: 1 },          // 1 carga cada 6 s sin ganar
      onDamaged(g, p, dmg) { if (dmg?.blocked) gainGauge(p, 'bastion', T.bastion.perBlock); },
      // v2: Muralla Viviente (s17: su condDr real), Muro de Escudos (s9: buff g_t_muro)
      viewX(p, st, e, out) {
        let drPct = 0;
        if (hasPower(p, 'g_muralla_viva')) { try { drPct = +H.POWER_HOOKS.g_muralla_viva?.condDr?.(p) || 0; } catch { drPct = 0; } }
        const wall = buffOf(p, 'g_t_muro');
        out.x = { drPct, wallT: wall ? wall.t : 0, wallMax: wall ? (wall.dur || T.bastion.wall.t) : 0,
          wallDr: wall ? (wall.stats?.dr || 0) : 0, decayEvery: T.bastion.decayEvery };
        if (wall) { out.state = 'active'; out.label = 'Muro de Escudos'; out.t = wall.t; out.tMax = out.x.wallMax; }
      },
    },
    // Cruzado: +1 por muerte (Juicio, su nodo clave), +1 cada 3 impactos de Martillo de
    // Guerra y +1 cada 3 golpes del básico que aciertan (Paso 2e). Veredicto Final gasta 3.
    fervor: {
      name: 'Fervor', color: '#ecc760', max: T.fervor.max, integer: true,
      state: () => ({ hammerHits: 0, basicHits: 0 }),
      onKill(g, p) { gainGauge(p, 'fervor', T.fervor.perKill); },
      // Paso 2e: el básico que acierta también da Fervor (1 cada 3); sin Martillo en la barra
      // (variante defensiva de §7.1) el Cruzado no ganaba Fervor contra un jefe
      onHit(g, p, e, hit, st) {
        if (hit?.proc || hit?.dot) return;
        if (hit?.skill === 'g_martillo') {
          if (++st.hammerHits >= T.fervor.hammerHits) { st.hammerHits = 0; gainGauge(p, 'fervor', 1); }
        } else if (isBasicHit(p, hit)) {
          if (++st.basicHits >= T.fervor.basicHits) { st.basicHits = 0; gainGauge(p, 'fervor', 1); }
          // Fervor Creciente (tv.fervorChance; Paso 2e: del Martillo pasa al básico): cada
          // golpe del básico que acierta tiene X % de dar 1 más
          const ch = p.tv?.fervorChance || 0;
          if (ch > 0) {
            const r = typeof p.combatRng === 'function' ? p.combatRng() : 0.5;
            if (r * 100 < ch) gainGauge(p, 'fervor', 1);
          }
        }
      },
      // v2: cuentas del Martillo, Ascensión (x3: buff g_ascension) y Veredicto listo
      viewX(p, st, e, out) {
        const asc = buffOf(p, 'g_ascension');
        out.x = { hammerHits: st.hammerHits || 0, hammerNeed: T.fervor.hammerHits,
          ascT: asc ? asc.t : 0, ascMax: asc ? (asc.dur || T.fervor.ascension.t) : 0 };
        if (asc) { out.state = 'active'; out.label = 'Ascensión'; out.t = asc.t; out.tMax = out.x.ascMax; }
        out.ready = (asc || out.value >= T.fervor.verdict.cost) ? ['g_t_veredicto'] : [];
      },
    },
  };
}
