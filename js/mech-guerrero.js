// ============================================================
// MECÁNICAS DE ESPECIALIZACIÓN DEL GUERRERO: Sed (Berserker) · Bastión (Guardián) · Fervor (Cruzado)
// ============================================================
// Paso 2g (docs/paso2g-guerrero.md §7 y §11.5). Dueño: KT-guerrero.
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

export function gaugeTuning() {
  return {
    // Sed: +1 por 1 % de vida perdida, +2 por golpe de Sangrado (≤ 10/s); a 100, Sed Saciada 6 s
    // (m_berserk: +25 % de daño aunque tengas la vida alta) y vuelve a 0; −8/s tras 4 s fuera de
    // combate. Los talentos que la alimentan citan aquí su número (la barra los explica)
    sed: { perHpPct: 1, perBleedTick: 2, bleedPerSec: 10, satedT: 6, decayAfter: 4, decayRate: 8,
      max: 100, lowHpPct: 40, satedDmgPct: 25,
      reabrir: 3,                 // b5 Reabrir: por golpe de Rajar a un enemigo que sangra
      ultimoTrago: 5,             // b19 Último Trago: × rango (el doble contra élites y jefes)
      negacion: 50,               // b15A Negación de la Muerte: deja la Sed en 50
      eliteKill: 30,              // b28 Corazón Indomable 1: matar a un élite
      apexSatedT: 9 },            // b28 Corazón Indomable 2: Sed Saciada 9 s
    // Bastión (rehecho): +1 por bloqueo y +1 cada 2 s plantado en combate; −4 % de daño recibido por
    // carga; caminando pierdes 1 cada 2 s; con 5, cambiar de postura las descarga (Muralla: escudo
    // del 20 % a ti y al aliado más herido · Ariete: onda del 300 % a 5 m, 30 de Quebranto a los
    // jefes) y deja el Bastión 5 s sin llenarse
    bastion: { max: 5, perBlock: 1, plantedEvery: 2, combatT: 5, moveLossEvery: 2, drPerCharge: 4,
      burstAt: 5, lockAfterBurst: 5,
      burst: { shieldPct: 20, shieldDur: 6, coef: 3, radius: 5, stagger: 30, allyRadius: 15 },
      apexMax: 7 },               // d28 Inexpugnable 2: 7 cargas
    // Fervor (rehecho): +1 por suelta perfecta o detonación de Juicio (como mucho 1 por lanzamiento;
    // la suelta perfecta la suma el catálogo: perfectGauge del Martillo 1 y del Cataclismo 3) y +1
    // cada 3 Tajos. A 3, el siguiente Martillo sale al instante como Veredicto (+50 % y cura un 6 %
    // al más herido); el Veredicto no da Fervor ni es suelta perfecta. Fuera de combate, −1 cada 10 s
    fervor: { max: 3, perPerfect: 1, perDetonate: 1, perCastMax: 1, perfectCataclysm: 3, basicHits: 3, decayOOC: 10,
      verdict: { cost: 3, dmgPct: 50, healPct: 6, apexHealPct: 10, radius: 15 } },
  };
}

export function baseGauges(T, H) {
  const { gainGauge, spendGauge, drainGauge, buffOf, now, isBasicHit, isBoss } = H;
  const rank = (p, id) => p?.talentAgg?.powerRank?.[id] | 0;
  return {
    // ---------------- SED (Berserker) ----------------
    sed: {
      name: 'Sed', color: '#e8634a', max: T.sed.max, procs: true,
      decay: { after: T.sed.decayAfter, rate: T.sed.decayRate, ooc: true },
      state: () => ({ satedT: 0, satedMax: 0, bleedT: -9, bleedN: 0 }),
      canGain: (p, st) => !(st.satedT > 0),
      hold: st => st.satedT > 0,
      // la vida que de verdad pierdes (un golpe letal no llena la Sed más allá de la que te quedaba)
      onDamaged(g, p, dmg) {
        const max = p.stats?.maxHP || 0, lost = Math.min(dmg?.amount || 0, Math.max(0, p.hp));
        if (lost > 0 && max > 0) gainGauge(p, 'sed', lost / max * 100 * T.sed.perHpPct);
      },
      onHit(g, p, e, hit, st) {
        if (!hit?.dot || !/:bleed$/.test(hit.source || '')) return;
        if (now(p) - st.bleedT >= 1) { st.bleedT = now(p); st.bleedN = 0; }
        const n = Math.min(T.sed.perBleedTick, T.sed.bleedPerSec - st.bleedN);
        if (n > 0) { st.bleedN += n; gainGauge(p, 'sed', n); }
      },
      onFull(g, p, st) {
        st.satedT = st.satedMax = rank(p, 'g_b_corazon_indomable') >= 2 ? T.sed.apexSatedT : T.sed.satedT;
        g?.ui?.spawnText?.(p.pos, '¡SED SACIADA!', 'txt-crit');
      },
      onTick(g, p, dt, st) {
        if (st.satedT > 0) { st.satedT -= dt; if (st.satedT <= 0) { st.satedT = 0; drainGauge(p, 'sed', st.v); } }
      },
      view: st => (st.satedT > 0 ? { state: 'active', label: 'Sed Saciada', t: st.satedT } : null),
      // vida baja (Al borde: m_berserk ya suma su +25 %) y Sangre Hirviente (b16, venas ámbar).
      // frenzyT/frenzyMax: nombres del contrato §3.10 (tests/test75) para el buff de Sangre Hirviente
      viewX(p, st, e, out) {
        const max = p.stats?.maxHP || 0;
        const boil = buffOf(p, 'g_b_sangre_hirviente');
        out.x = { low: max > 0 && p.hp / max < T.sed.lowHpPct / 100 && !(st.satedT > 0), boil: !!boil,
          frenzyT: boil ? boil.t : 0, frenzyMax: boil ? (boil.dur || 0) : 0 };
        if (st.satedT > 0) out.tMax = st.satedMax || T.sed.satedT;
      },
    },

    // ---------------- BASTIÓN (Guardián) ----------------
    bastion: {
      name: 'Bastión', color: '#7fb0e8', max: T.bastion.max, integer: true,
      state: () => ({ lockUntil: -99, plantAcc: 0, walkAcc: 0, burst: null }),
      // tras descargar, 5 s sin llenarse
      canGain: (p, st) => now(p) >= st.lockUntil - 1e-9,
      onDamaged(g, p, dmg) { if (dmg?.blocked) gainGauge(p, 'bastion', T.bastion.perBlock); },
      condDr: (p, info, _x, st) => T.bastion.drPerCharge * Math.floor(st?.v || 0),
      onTick(g, p, dt, st) {
        const B = T.bastion;
        const inCombat = (p.sinceCombat ?? 99) < B.combatT;
        // plantado en combate: +1 cada 2 s
        if (p.planted && inCombat) {
          st.plantAcc += dt;
          if (st.plantAcc >= B.plantedEvery - 1e-9) { st.plantAcc -= B.plantedEvery; gainGauge(p, 'bastion', 1); }
        } else st.plantAcc = 0;
        // caminando (no la Carga de Escudo ni un salto): −1 cada 2 s
        const walking = !!p.moving && !p.planted && !p.dashMove && !p.leap;
        if (walking && st.v > 0) {
          st.walkAcc += dt;
          if (st.walkAcc >= B.moveLossEvery - 1e-9) { st.walkAcc -= B.moveLossEvery; drainGauge(p, 'bastion', 1); }
        } else if (!walking) st.walkAcc = 0;
      },
      // DESCARGA: con 5 cargas, el cambio de postura las gasta todas
      afterCast(g, p, cast, res, st) {
        const B = T.bastion;
        if (cast?.sk?.id !== 'g_guardia' || !cast.stance || st.v < B.burstAt - 1e-9) return;
        const n = st.v;
        st.burst = { stance: cast.stance, n, t: now(p) };
        st.lockUntil = now(p) + B.lockAfterBurst;
        spendGauge(p, 'bastion', n);
        if (cast.stance === 'muralla') {
          const amt = (p.stats?.maxHP || 0) * B.burst.shieldPct / 100;
          g?.shield?.(amt, { target: 'self', dur: B.burst.shieldDur, src: 'bastion' });
          let ally = null;
          for (const a of g?.allies ? g.allies(p.pos, B.burst.allyRadius) : []) {
            if (a === p || !(a.stats?.maxHP > 0)) continue;
            if (!ally || a.hp / a.stats.maxHP < ally.hp / ally.stats.maxHP) ally = a;
          }
          ally?.addShield?.(amt, B.burst.shieldDur, 'bastion');
        } else {
          const c = p.pos.clone();
          g?.dealArea?.(c, B.burst.radius, B.burst.coef, { from: c, hitInfo: { skill: 'g_guardia', tags: new Set(['spec', 'area', 'physical']), elem: 'physical' },
            onHit: e => { if (e.alive && isBoss(e)) e.addStagger?.(B.burst.stagger, p); } });
          g?.spawnRing?.(c, B.burst.radius, 0xd83a2a);
        }
        g?.ui?.spawnText?.(p.pos, '¡BASTIÓN!', 'txt-crit');
      },
      // la postura (Muralla o Ariete), si estás plantado, la reducción de las cargas, la espera
      // tras descargar (estado activo «Descarga») y si caminando pierdes cargas
      viewX(p, st, e, out) {
        const B = T.bastion;
        const lockT = Math.max(0, (st.lockUntil ?? -99) - now(p));
        const modes = p.game?.activeStanceModes?.(p) || [];
        const stance = modes.length > 1 ? 'both' : (modes[0]?.id || null);
        const walking = !!p.moving && !p.planted && !p.dashMove && !p.leap;
        out.x = { stance, planted: !!p.planted, drPct: B.drPerCharge * Math.floor(out.value || 0), perCharge: B.drPerCharge,
          lockT, lockMax: B.lockAfterBurst, walking, walkIn: walking && out.value > 0 ? Math.max(0, B.moveLossEvery - (st.walkAcc || 0)) : null,
          // nombres del contrato §3.10 (tests/test75): la descarga ocupa el sitio del Muro de Escudos
          wallT: lockT, wallMax: lockT > 0 ? B.lockAfterBurst : 0, wallDr: 0, decayEvery: B.moveLossEvery };
        if (lockT > 0) { out.state = 'active'; out.label = 'Descarga'; out.t = lockT; out.tMax = B.lockAfterBurst; }
        out.ready = out.value >= B.burstAt ? ['g_guardia'] : [];
      },
    },

    // ---------------- FERVOR (Cruzado) ----------------
    fervor: {
      name: 'Fervor', color: '#ecc760', max: T.fervor.max, integer: true,
      decay: { after: T.fervor.decayOOC, every: T.fervor.decayOOC, n: 1, ooc: true },
      state: () => ({ basicAt: -1, basicN: 0, det: false, verdictCast: null, verdictLive: false, verdictTarget: null, verdictHealed: null }),
      // a 3 de Fervor, el Martillo sale al instante (Veredicto: cast.instant, carga completa sin perfecto)
      onCast(g, p, cast, st) {
        st.det = false;
        if (cast?.sk?.id !== 'g_martillo' || cast.echo) return;
        if ((st.v || 0) >= T.fervor.verdict.cost - 1e-9) {
          cast.instant = true;
          st.verdictCast = cast; st.verdictLive = true; st.verdictTarget = cast.enemy || null; st.verdictHealed = null;
        } else st.verdictLive = false;
      },
      onHit(g, p, e, hit, st) {
        if (hit?.proc || hit?.dot) return;
        if (hit?.detonated && !hit.echo) st.det = true;
        // +1 cada 3 Tajos que aciertan (uno por golpe aunque alcance a varios)
        if (isBasicHit(p, hit) && st.basicAt !== now(p)) {
          st.basicAt = now(p);
          if (++st.basicN >= T.fervor.basicHits) { st.basicN = 0; gainGauge(p, 'fervor', 1); }
          // tv.fervorChance (contrato del núcleo, spec-mechanics.js; ningún nodo v2 la da): X % de 1 más
          const ch = p.tv?.fervorChance || 0;
          if (ch > 0 && (typeof p.combatRng === 'function' ? p.combatRng() : 0.5) * 100 < ch) gainGauge(p, 'fervor', 1);
        }
      },
      condAdd: (p, e, hit, st) => (hit?.skill === 'g_martillo' && st?.verdictLive ? T.fervor.verdict.dmgPct : 0),
      afterCast(g, p, cast, res, st) {
        if (!cast || cast.echo) return;
        const det = st.det;
        st.det = false;
        if (st.verdictLive && st.verdictCast === cast) {
          // VEREDICTO: cura al aliado más herido (Aureola 2: un 10 %) y gasta todo el Fervor
          st.verdictLive = false;
          const V = T.fervor.verdict;
          const pct = rank(p, 'g_z_aureola') >= 2 ? V.apexHealPct : V.healPct;
          let low = null;
          for (const a of g?.allies ? g.allies(p.pos, V.radius) : [p]) {
            if (!(a.stats?.maxHP > 0)) continue;
            if (!low || a.hp / a.stats.maxHP < low.hp / low.stats.maxHP) low = a;
          }
          if (low) {
            st.verdictHealed = low;
            if (low === p && g?.heal) g.heal(p.stats.maxHP * pct / 100, { target: 'self', src: 'veredicto' });
            else low.healSkill?.(low.stats.maxHP * pct / 100, 'veredicto');
          }
          spendGauge(p, 'fervor', st.v);
          g?.ui?.spawnText?.(p.pos.clone().setY(2.2), '¡VEREDICTO!', 'txt-crit');
          return;
        }
        // detonar marcas: +1 (como mucho 1 por lanzamiento; una suelta perfecta ya dio el suyo)
        if (det && !cast.perfect) gainGauge(p, 'fervor', T.fervor.perDetonate);
      },
      viewX(p, st, e, out) {
        // hammerHits/hammerNeed/ascT/ascMax: nombres del contrato §3.10 (tests/test75); las cuentas
        // son ahora los Tajos y ya no hay Ascensión
        out.x = { basicHits: st.basicN || 0, basicNeed: T.fervor.basicHits, hammerHits: st.basicN || 0, hammerNeed: T.fervor.basicHits, ascT: 0, ascMax: 0 };
        out.ready = out.value >= T.fervor.verdict.cost ? ['g_martillo'] : [];
        if (out.ready.length) out.label = 'Veredicto';
      },
    },
  };
}
