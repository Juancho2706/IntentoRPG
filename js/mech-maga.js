// ============================================================
// MECÁNICAS DE ESPECIALIZACIÓN DE LA MAGA: Calor (Piromante) · Escarcha por enemigo (Crionte) · Cargas Arcanas (Arcanista)
// ============================================================
// Paso 2 (E0.3): sale de js/spec-mechanics.js. Dueño desde E2: KT-maga (docs/paso2-implementacion.md
// §2 E2). Paso 2g (docs/paso2g-maga-coherencia.md §5): cada indicador ES el nodo clave de su
// especialización (i0, a0; el Calor además lo alimenta s0 Ignición): se llena, se gasta y se pierde
// aquí, con la mecánica de la especialización activa y sin depender de ningún poder; los talentos
// lo potencian con claves tv y con poderes de js/powers-maga.js (gainGauge/onGauge).
// Módulo HOJA (sin imports, y así debe quedar): el núcleo (js/spec-mechanics.js) compone
// gaugeTuning()/baseGauges() de las tres clases e INYECTA sus helpers en `H` para no crear
// un ciclo con powers.js. `H` trae: gainGauge, spendGauge, drainGauge, gaugeGainMult,
// gaugeLossMult, isBoss, buffOf, peekPower, r2, now, isBasicHit, invalidate, talentSkill,
// hasPower, gainResource y, perezosos (getters), POWER_HOOKS y STAGGER_CC.
// Nada de `const` de módulo que se lea al cargar: el núcleo puede llamar a estas funciones
// dentro del ciclo powers.js ↔ spec-mechanics.js, antes de evaluar este archivo.
//   gaugeTuning(H) → { <id>: números }       ÚNICA fuente de los números (explain(T) de la UI y
//                                            los poderes de js/powers-maga.js que los citan)
//   baseGauges(T, H) → { <id>: definición }  T = gaugeTuning() COMPLETO (las tres clases)
// El orden de las claves importa (gaugeDefs/gaugeIds lo conservan): guerrero → maga → arquera.
// Claves tv de la especialización que lee este archivo: calorHit (s19), frostDecay (i4),
// chargeDur (a1), chargeCrit (a2), chargeDmg (a4), drCharges (a15B), aspdCharges (a20) y
// chargeKeep (a28).

export function gaugeTuning(H) {
  const { STAGGER_CC } = H;
  return {
    calor: { perFireHit: 5, decayAfter: 3, decayRate: 10, skills: ['bola_fuego', 'meteoro'], max: 100,
      chispas: 5,                                   // s5 Chispas
      llamarada: 25,                                // s9A Llamarada Avivada
      voraz: 8, vorazN: 3,                          // s9B Llamarada Voraz (por enemigo, desde 3)
      combustion: { base: 1.5, perRank: 1 },        // s23 Combustión: 1,5 + rango s
      perpetua: 4, perpetuaExt: 3,                  // s26 Combustión Perpetua
      eliteCalor: 25, ignitionAt: 80 },             // s28 Corazón del Sol (rangos 2 y 3)
    escarcha: { max: 5, perHit: 1, nova: 2, freezeT: 1.0, numbT: 4, decayEvery: 2,
      bossStagger: STAGGER_CC.freeze, numbMovePct: 30, numbAspdPct: 15 },
    cargas: { max: 4, perDart: 1, dmgPerCharge: 35, manaPerCharge: 5, loseAfter: 6,
      sealEvery: 2,                                 // Sello del Archimago: 1 Carga cada 2 s dentro
      resonanceCrit: 6 },                           // a16 Resonancia (por rango)
  };
}

export function baseGauges(T, H) {
  const { gainGauge, spendGauge, drainGauge, gaugeGainMult, isBoss, buffOf, r2, now, invalidate, hasPower, gainResource } = H;
  // escalón de pérdida de la Escarcha (Escarcha Densa: +1 s por rango) y vida de las Cargas
  // (Memoria Arcana: +2 s por rango)
  const frostEvery = p => T.escarcha.decayEvery + (p?.tv?.frostDecay || 0);
  const chargeLife = p => T.cargas.loseAfter + (p?.tv?.chargeDur || 0);
  // las Cargas no se pierden: Singularidad (rango 3) o Resonancia con 4
  const chargesKept = (p, n) => (p?.tv?.chargeKeep || 0) > 0 || (hasPower(p, 'a_resonance') && n >= T.cargas.max);
  // definición FORJADA de una habilidad (caché de la forja o del perfil; si no, la del catálogo)
  const defOf = (p, id) => p?.forged?.[id]?.def || p?.resolved?.[id]?.def || p?.cls?.skills?.find(s => s.id === id) || null;
  // ¿el héroe está dentro de su Sello del Archimago? (aura genérica: buffId = id de la habilidad)
  const inSeal = p => (p?.game?.fieldsOf?.(p, { kind: 'aura' }) || []).some(f => f.data?.buffId === 'a_sello' && f.t > 0
    && (p.pos.x - f.pos.x) ** 2 + (p.pos.z - f.pos.z) ** 2 <= f.radius * f.radius);
  return {
    // Piromante: cada golpe de Fuego da 5 de Calor (+2 por rango de Ignición Rápida; una vez por
    // instante: un área no da +25); baja −10/s tras 3 s. Lleno → IGNICIÓN TOTAL: la siguiente
    // Bola de Fuego o Meteoro cuesta 0 y es crítico seguro. Se consume al LANZARLA (⑦ onCast;
    // si la esquiva cancela la preparación, se pierde). El máximo baja a 80 con Corazón del Sol 3.
    calor: {
      name: 'Calor', color: '#ff8a3d', max: T.calor.max,
      decay: { after: T.calor.decayAfter, rate: T.calor.decayRate },
      state: () => ({ ready: false, gainAt: -9 }),
      canGain: (p, st) => !st.ready,
      hold: st => st.ready,
      onHit(g, p, e, hit, st) {
        if (hit?.proc || hit?.dot || hit?.elem !== 'fire') return;
        if (now(p) - st.gainAt < 0.05) return;
        st.gainAt = now(p);
        gainGauge(p, 'calor', T.calor.perFireHit + (p.tv?.calorHit || 0));
      },
      onFull(g, p, st) {
        st.ready = true;
        invalidate(p);
        g?.ui?.spawnText?.(p.pos, '¡IGNICIÓN TOTAL!', 'txt-crit');
      },
      modifyResolve(p, sk, prof, st) {
        if (!st.ready || !T.calor.skills.includes(sk.id)) return;
        prof.cost = 0;
        prof.forceCrit = true;
        prof.ignition = true;
      },
      onCast(g, p, cast, st) {
        if (!st.ready || !cast?.prof?.ignition) return;
        st.ready = false;
        spendGauge(p, 'calor', st.v);
        invalidate(p);
      },
      view: st => (st.ready ? { state: 'active', label: 'Ignición Total' } : null),
      // v2: enfriándose, Combustión (s23: buff p_combustion, todo el Fuego crítico) e Ignición
      viewX(p, st, e, out) {
        const comb = buffOf(p, 'p_combustion');
        out.x = { cooling: !!out.decaying, combT: comb ? comb.t : 0, combMax: comb ? (comb.dur || 0) : 0,
          mult: r2(gaugeGainMult(p, 'calor')), perHit: T.calor.perFireHit + (p.tv?.calorHit || 0) };
        out.ready = st.ready ? [...T.calor.skills] : [];
        if (!st.ready && comb) { out.label = 'Combustión'; out.t = comb.t; out.tMax = out.x.combMax; }
      },
    },
    // Crionte (POR ENEMIGO): cada golpe de Hielo pone las capas de su habilidad FORJADA (`layers`:
    // la Prisión 2, la Lanza con su forja 2), la Nova 2 y el resto 1. A 5 (4 con Corazón del
    // Invierno 3) → Congelado 1 s (control duro
    // con rendimientos decrecientes); un jefe queda ATERIDO 4 s (−30 % de movimiento, −15 % de
    // velocidad de ataque) y suma Quebranto. Cae 1 capa cada 2 s (+1 s por rango de Escarcha
    // Densa) desde la última ganancia o caída (el escalón depende del héroe: no es un `decay` fijo).
    escarcha: {
      name: 'Escarcha', color: '#74cdf2', max: T.escarcha.max, perEnemy: true, integer: true,
      onHit(g, p, e, hit) {
        if (hit?.proc || hit?.dot || hit?.elem !== 'frost' || !e?.alive) return;
        const L = defOf(p, hit.skill)?.layers;
        gainGauge(p, 'escarcha', L > 0 ? L : hit.skill === 'nova_hielo' ? T.escarcha.nova : T.escarcha.perHit, e);
      },
      onFull(g, p, st, e) {
        if (!e?.alive) return;
        if (isBoss(e)) e.numbT = Math.max(e.numbT || 0, T.escarcha.numbT);
        e.applyCC?.('freeze', T.escarcha.freezeT, { src: p });
        drainGauge(p, 'escarcha', st.v, e);
      },
      onTick(g, p) {
        const every = frostEvery(p), t = now(p);
        for (const e of g?.enemies || []) {
          const s = e.alive && e.gauges?.escarcha;
          if (!s || !(s.v > 0)) continue;
          if (t - Math.max(s.last, s.dropAt ?? -99) < every - 1e-9) continue;
          drainGauge(p, 'escarcha', 1, e);
          s.dropAt = t;
        }
      },
      // v2: e = el objetivo que eligió gaugeView (cursor > jefe en combate > el más escarchado)
      viewX(p, st, e, out) {
        let layered = 0, frozen = 0;
        for (const o of p.game?.enemies || []) {
          if (!o?.alive) continue;
          if ((o.gauges?.escarcha?.v || 0) >= 1) layered++;
          if ((o.frozenT || 0) > 0) frozen++;
        }
        const boss = !!e && isBoss(e), numbT = e && e.numbT > 0 ? e.numbT : 0;
        const every = frostEvery(p);
        // targetFrozen: el objetivo de la vista está Congelado ahora (la UI no lee e.frozenT)
        out.x = { enemyName: e ? (e.def?.name || e.name || '') : '', boss, layered, frozen, numbT, targetFrozen: !!e && (e.frozenT || 0) > 0, every };
        if ((st.v || 0) > 0) out.decayIn = r2(Math.max(0, every - (now(p) - Math.max(st.last ?? -99, st.dropAt ?? -99))));
        if (boss && numbT > 0) { out.state = 'active'; out.label = 'Aterido'; out.t = numbT; out.tMax = T.escarcha.numbT; out.decayIn = null; }
      },
    },
    // Arcanista: 1 Carga por impacto del Dardo y por golpe del Desgarro, y 1 cada 2 s dentro de tu
    // Sello. El Rayo las gasta TODAS: +(35 + tv.chargeDmg) % por Carga (las que pasan de 4, el doble:
    // Cargas Desbordadas) y 5 de maná por Carga; anota cuántas (st.spent: Rayo Doble, Carga Final…).
    // Máximo 4 (+1 por rango de Cargas Desbordadas). Se pierden todas 6 s (+2 por rango de Memoria
    // Arcana) después de la última ganancia, salvo con Resonancia y 4 o con Singularidad 3. Con 2 o
    // más: Mente Brillante (crítico); con 3 o más: Velo Arcano (menos daño) y Agudeza (buff a_agudeza).
    cargas: {
      name: 'Cargas Arcanas', color: '#b996ff', max: T.cargas.max, integer: true,
      state: () => ({ keep: false, spent: 0, echoN: null, seal: 0 }),
      hold: st => !!st.keep,
      onHit(g, p, e, hit) {
        if (hit?.proc || hit?.dot) return;
        if (hit?.skill === 'm_dardo' || hit?.skill === 'm_u_desgarro') gainGauge(p, 'cargas', T.cargas.perDart);
      },
      // las repeticiones del Rayo (Rayo Doble, Tormenta de Cargas) usan las Cargas del original (echoN)
      condAdd(p, e, hit, st) {
        if (hit?.skill !== 'rayo') return 0;
        const n = st.echoN ?? Math.floor(st.v);
        return (T.cargas.dmgPerCharge + (p.tv?.chargeDmg || 0)) * (Math.min(n, 4) + 2 * Math.max(0, n - 4));
      },
      afterCast(g, p, cast, res, st) {
        if (cast?.sk?.id !== 'rayo') return;
        const n = Math.floor(st.v);
        st.spent = 0;
        if (n < 1 || !spendGauge(p, 'cargas', st.v)) return;
        st.spent = n;
        gainResource(p, T.cargas.manaPerCharge * n);
      },
      condCrit(p, e, hit, st) { return Math.floor(st.v) >= 2 ? (p.tv?.chargeCrit || 0) : 0; },
      condDr(p, info, _x, st) { return Math.floor(st.v) >= 3 ? (p.tv?.drCharges || 0) : 0; },
      onTick(g, p, dt, st) {
        if (inSeal(p)) {
          st.seal += dt;
          if (st.seal >= T.cargas.sealEvery - 1e-9) { st.seal = 0; gainGauge(p, 'cargas', 1); }
        }
        const n = Math.floor(st.v);
        st.keep = chargesKept(p, n);
        if (st.v > 0 && !st.keep && now(p) - st.last >= chargeLife(p) - 1e-9) drainGauge(p, 'cargas', st.v);
        const aspd = p.tv?.aspdCharges || 0;
        if (!(aspd > 0) || Math.floor(st.v) < 3) return;
        const b = (p.buffs || []).find(x => x.id === 'a_agudeza');
        if (b && b.t > 0) { b.t = Math.max(b.t, 0.35); return; }
        p.addBuff?.('a_agudeza', { aspdPct: aspd }, 0.35, { name: 'Agudeza', icon: '⚡', desc: `+${aspd} % de velocidad de lanzamiento` });
      },
      // v2: previsión del próximo Rayo, caducidad y Resonancia (a16: con 4 Cargas no caducan)
      viewX(p, st, e, out) {
        const n = Math.floor(out.value);
        const per = T.cargas.dmgPerCharge + (p.tv?.chargeDmg || 0);
        const life = chargeLife(p);
        const keep = chargesKept(p, n);
        const resonance = hasPower(p, 'a_resonance') && n >= T.cargas.max;
        out.x = { loseAfter: life, bonusPct: per * (Math.min(n, 4) + 2 * Math.max(0, n - 4)), manaBack: T.cargas.manaPerCharge * n, resonance, keep };
        out.decayIn = n > 0 && !keep ? r2(Math.max(0, life - (now(p) - st.last))) : null;
        out.hold = keep;
        // Resonancia es una ventana: estado 'active' (no caducan) con su rótulo
        if (resonance) { out.state = 'active'; out.label = 'Resonancia'; }
        out.ready = n >= 1 ? ['rayo'] : [];
      },
    },
  };
}
