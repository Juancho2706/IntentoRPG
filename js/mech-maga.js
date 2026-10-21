// ============================================================
// MECÁNICAS DE ESPECIALIZACIÓN DE LA MAGA: Calor (Piromante) · Escarcha por enemigo (Crionte) · Cargas Arcanas (Arcanista)
// ============================================================
// Paso 2 (E0.3): sale de js/spec-mechanics.js SIN cambiar nada (puro movimiento). Dueño
// desde E2: KT-maga (docs/paso2-implementacion.md §2 E2: ids de nodo citados, verbos nuevos).
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
  const { talentSkill, STAGGER_CC } = H;
  const comb = talentSkill('p_combustion');
  return {
    calor:    { perFireHit: 5, decayAfter: 3, decayRate: 10, skills: ['bola_fuego', 'meteoro'],
      max: 100, llamarada: 25,                                               // s4 Llamarada Avivada
      combustion: { t: comb.dur ?? 10, mult: comb.gaugeMult ?? 2 } },
    escarcha: { max: 5, perHit: 1, nova: 2, freezeT: 1.0, numbT: 4, decayEvery: 2,
      bossStagger: STAGGER_CC.freeze, numbMovePct: 30, numbAspdPct: 15 },
    cargas:   { max: 4, perDart: 1, dmgPerCharge: 35, manaPerCharge: 5, loseAfter: 6,
      orbMax: 2,                                                             // s4 Orbe Resonante
      resonanceCrit: 12 },                                                   // s14 Resonancia (2e: era 15)
  };
}

export function baseGauges(T, H) {
  const { gainGauge, spendGauge, drainGauge, gaugeGainMult, isBoss, buffOf, r2, now, invalidate, hasPower, gainResource } = H;
  return {
    // Piromante: +5 por golpe de Fuego (su nodo clave hace que todos quemen; una
    // vez por instante: un área no da +25); baja −10/s tras 3 s. A 100 → IGNICIÓN
    // TOTAL: la siguiente Bola de Fuego o Meteoro cuesta 0 y es crítico seguro.
    // Se consume al LANZARLA (⑦ onCast; si la esquiva cancela la preparación, se pierde).
    calor: {
      name: 'Calor', color: '#ff8a3d', max: 100,
      decay: { after: T.calor.decayAfter, rate: T.calor.decayRate },
      state: () => ({ ready: false, gainAt: -9 }),
      canGain: (p, st) => !st.ready,
      hold: st => st.ready,
      onHit(g, p, e, hit, st) {
        if (hit?.proc || hit?.dot || hit?.elem !== 'fire') return;
        if (now(p) - st.gainAt < 0.05) return;
        st.gainAt = now(p);
        gainGauge(p, 'calor', T.calor.perFireHit);
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
      // v2: enfriándose, Combustión (s9: buff p_combustion, Calor x2) e Ignición -> ranuras
      viewX(p, st, e, out) {
        const comb = buffOf(p, 'p_combustion');
        out.x = { cooling: !!out.decaying, combT: comb ? comb.t : 0, combMax: comb ? (comb.dur || T.calor.combustion.t) : 0,
          mult: r2(gaugeGainMult(p, 'calor')) };
        out.ready = st.ready ? [...T.calor.skills] : [];
        if (!st.ready && comb) { out.label = 'Combustión'; out.t = comb.t; out.tMax = out.x.combMax; }
      },
    },
    // Crionte (POR ENEMIGO): +1 capa por golpe de Escarcha (Nova +2, +tv.frostLayers);
    // a 5 capas → Congelado 1,5 s (control duro con rendimientos decrecientes); un
    // jefe queda ATERIDO 4 s (−30 % de movimiento, −15 % de velocidad de ataque) y
    // suma 25 de stagger. Las capas caen 1 cada 2 s.
    escarcha: {
      name: 'Escarcha', color: '#74cdf2', max: T.escarcha.max, perEnemy: true, integer: true,
      decay: { after: 0, every: T.escarcha.decayEvery, n: 1 },         // 1 capa cada 2 s sin ganar
      onHit(g, p, e, hit) {
        if (hit?.proc || hit?.dot || hit?.elem !== 'frost' || !e?.alive) return;
        const n = hit.skill === 'nova_hielo' ? T.escarcha.nova + (p.tv?.frostLayers || 0) : T.escarcha.perHit;
        gainGauge(p, 'escarcha', n, e);
      },
      onFull(g, p, st, e) {
        if (!e?.alive) return;
        if (isBoss(e)) e.numbT = Math.max(e.numbT || 0, T.escarcha.numbT);
        e.applyCC?.('freeze', T.escarcha.freezeT, { src: p });
        drainGauge(p, 'escarcha', st.v, e);
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
        // targetFrozen: el objetivo de la vista está Congelado ahora (la UI no lee e.frozenT)
        out.x = { enemyName: e ? (e.def?.name || e.name || '') : '', boss, layered, frozen, numbT, targetFrozen: !!e && (e.frozenT || 0) > 0 };
        if (boss && numbT > 0) { out.state = 'active'; out.label = 'Aterido'; out.t = numbT; out.tMax = T.escarcha.numbT; }
      },
    },
    // Arcanista: Dardo Arcano +1 Carga por impacto (máx. 4); Rayo las consume TODAS:
    // +35 % de daño aditivo por carga y devuelve 5 de maná por carga. Se pierden 6 s
    // después de la última ganancia (Resonancia: touchGauge).
    cargas: {
      name: 'Cargas Arcanas', color: '#b996ff', max: T.cargas.max, integer: true,
      decay: { after: T.cargas.loseAfter, all: true },
      onHit(g, p, e, hit) { if (!hit?.proc && !hit?.dot && hit?.skill === 'm_dardo') gainGauge(p, 'cargas', T.cargas.perDart); },
      condAdd(p, e, hit, st) { return hit?.skill === 'rayo' ? T.cargas.dmgPerCharge * Math.floor(st.v) : 0; },
      afterCast(g, p, cast, res, st) {
        if (cast?.sk?.id !== 'rayo' || st.v < 1) return;
        const n = Math.floor(st.v);
        if (spendGauge(p, 'cargas', n)) gainResource(p, T.cargas.manaPerCharge * n);
      },
      // v2: previsión del próximo Rayo y Resonancia (s14: con 4 Cargas no caducan)
      viewX(p, st, e, out) {
        const n = Math.floor(out.value);
        const resonance = hasPower(p, 'a_resonance') && n >= out.max;
        out.x = { loseAfter: T.cargas.loseAfter, bonusPct: T.cargas.dmgPerCharge * n, manaBack: T.cargas.manaPerCharge * n, resonance };
        // Resonancia es una ventana: estado 'active' (no caducan) con su rótulo
        if (resonance) { out.decayIn = null; out.hold = true; out.state = 'active'; out.label = 'Resonancia'; }
        out.ready = n >= 1 ? ['rayo'] : [];
      },
    },
  };
}
