// ============================================================
// MECÁNICAS DE ESPECIALIZACIÓN DE LA ARQUERA: Concentración (Francotiradora) · Coto de Caza (Montaraz) · Impulso (Tiradora)
// ============================================================
// Paso 2 (E0.3): sale de js/spec-mechanics.js SIN cambiar nada (puro movimiento). Dueño
// desde E2: KT-arquera (docs/paso2-implementacion.md §2 E2: ids de nodo citados, verbos nuevos).
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
  const vis = talentSkill('a_t_vision'), cepo = talentSkill('a_t_cepo');
  return {
    concentracion: { gainPerSec: 20, losePerSec: 25, critPerPoint: 0.15, max: 100,
      alientoSpend: 50,                                                      // s4 Aliento del Cazador
      vision: { t: vis.dur ?? 12 } },
    coto:     { maxArmed: 3, preyT: 15, maxArmedExtra: 1,                    // s14 Coto Cerrado
      trap: { charges: cepo.charges ?? 1, cd: cepo.cd ?? 8, root: cepo.root ?? 2 } },
    impulso:  { perShot: 3, shotGap: 0.15, galeT: 6, galeAspd: 25, max: 100, galeProj: 1,
      andanada: 20,                                                          // s4 Andanada Impulsiva
      galechain: { perKill: 0.5, max: 6 } },                                 // s14 Vendaval Perpetuo
  };
}

export function baseGauges(T, H) {
  const { gainGauge, drainGauge, gaugeLossMult, isBoss, buffOf, peekPower, r2, now, invalidate, hasPower, gainResource } = H;
  return {
    // Francotiradora: +20/s quieta (× 1 + tv.focusRate/100), −25/s moviéndote;
    // +0,15 % de crítico por punto (+15 % a 100).
    concentracion: {
      name: 'Concentración', color: '#ead86e', max: 100,
      onTick(g, p, dt) {
        if (p.moving) drainGauge(p, 'concentracion', T.concentracion.losePerSec * dt * gaugeLossMult(p, 'concentracion'));
        else gainGauge(p, 'concentracion', T.concentracion.gainPerSec * dt * Math.max(0, 1 + (p.tv?.focusRate || 0) / 100));
      },
      // Respiración Profunda (tv.focusEnergy): al llenarla, +X de Energía
      onFull(g, p) { const n = p.tv?.focusEnergy || 0; if (n > 0) gainResource(p, n); },
      condCrit(p, e, hit, st) { return st.v * T.concentracion.critPerPoint; },
      // v2: moverte la vacía (decaying), Visión Certera (s9: buff a_t_vision) y Aliento (s4)
      viewX(p, st, e, out) {
        const vis = buffOf(p, 'a_t_vision'), moving = !!p.moving;
        out.x = { moving, critPct: r2(out.value * T.concentracion.critPerPoint), visionT: vis ? vis.t : 0,
          visionMax: vis ? (vis.dur || T.concentracion.vision.t) : 0 };
        out.decaying = moving && out.value > 0 && gaugeLossMult(p, 'concentracion') > 0;
        if (vis) { out.state = 'active'; out.label = 'Visión Certera'; out.t = vis.t; out.tMax = out.x.visionMax; }
        out.ready = hasPower(p, 'f_aliento_cazador') && out.value >= out.max ? ['a_t_apuntado'] : [];
      },
    },
    // Montaraz: el valor son las TRAMPAS ARMADAS (campos 'trampa' del héroe o con
    // data.trap; máx. 3, +gaugeMax:coto). PRESA = el primer élite o jefe que golpeas
    // (15 s): cuenta como élite para eliteDmg y KillInfo.status.prey.
    coto: {
      name: 'Coto de Caza', color: '#86d47a', max: T.coto.maxArmed, integer: true,
      state: () => ({ prey: null, preyT: 0 }),
      value(p) {
        const g = p.game;
        return (g?.fields || []).filter(f => !f.dead && f.owner === p && (f.kind === 'trampa' || f.data?.trap)).length;
      },
      onHit(g, p, e, hit, st) {
        if (hit?.proc || hit?.dot || !e?.alive) return;
        if (st.prey?.alive && st.preyT > 0) return;
        if (!(e.def?.rank || isBoss(e))) return;
        st.prey = e; st.preyT = T.coto.preyT; e.prey = true;
        g?.ui?.spawnText?.(e.pos?.clone ? e.pos.clone().setY((e.def?.scale || 1) + 0.8) : e.pos, '¡PRESA!', 'txt-crit');
      },
      onTick(g, p, dt, st) {
        if (!st.prey) return;
        st.preyT -= dt;
        if (st.preyT <= 0 || !st.prey.alive) { st.prey.prey = false; st.prey = null; st.preyT = 0; }
      },
      view: st => (st.prey ? { state: 'prey', label: 'Presa', t: st.preyT } : null),
      // v2: Presa (nombre, vida, atrapada) y cargas de Trampa de Cepo (sin mutar su estado:
      // las recargas pendientes se cuentan aquí; las aplica el comportamiento al lanzar)
      viewX(p, st, e, out) {
        const prey = st.prey?.alive ? st.prey : null;
        const knows = (p.skills?.a_t_cepo || 0) > 0;
        const max = knows ? T.coto.trap.charges + (hasPower(p, 'm_cepo_doble') ? 1 : 0) : 0;
        const cs = peekPower(p, 'a_t_cepo'), cd = p.cdMax?.a_t_cepo || T.coto.trap.cd;
        let charges = max, frac = 0;
        if (knows && cs && cs.charges != null) {
          charges = Math.min(max, cs.charges);
          let next = cs.nextAt || 0;
          while (charges < max && next > 0 && now(p) + 1e-6 >= next) { charges++; next += cd; }
          if (charges < max && next > 0) frac = Math.max(0, Math.min(1, 1 - (next - now(p)) / cd));
        }
        const gh = peekPower(p, 'm_greathunt');
        out.x = { preyName: prey ? (prey.def?.name || prey.name || '') : '',
          preyHpPct: prey ? Math.round(Math.max(0, prey.hp) / Math.max(1, prey.maxHP || 1) * 100) : 0,
          trapCharges: charges, trapChargesMax: max, trapCdFrac: r2(frac),
          preyTrapped: !!prey && ((prey.rootT || 0) > 0 || (hasPower(p, 'm_greathunt') && gh?.prey === prey)) };
        if (prey) out.tMax = T.coto.preyT;
      },
    },
    // Tiradora: +3 por disparo hecho EN MOVIMIENTO; a 100 → VENDAVAL 6 s (+25 % de
    // velocidad de ataque, +1 proyectil a Flecha Múltiple) y vuelve a 0.
    impulso: {
      name: 'Impulso', color: '#66d7c7', max: 100,
      state: () => ({ galeT: 0, shotAt: -9 }),
      canGain: (p, st) => !(st.galeT > 0),
      hold: st => st.galeT > 0,
      onHit(g, p, e, hit, st) {
        if (hit?.proc || hit?.dot || !p.moving || !hit?.tags?.has?.('proj')) return;
        if (now(p) - st.shotAt < T.impulso.shotGap) return;
        st.shotAt = now(p);
        gainGauge(p, 'impulso', T.impulso.perShot);
      },
      onFull(g, p, st) {
        st.galeT = T.impulso.galeT;
        p.addBuff?.('t_vendaval', { aspdPct: T.impulso.galeAspd }, T.impulso.galeT,
          { name: 'Vendaval', icon: '🌬️', desc: `+${T.impulso.galeAspd}% vel. de ataque y +1 proyectil a Flecha Múltiple` });
        invalidate(p);
        // Segundo Aliento (tv.galeHeal % de vida —curación de habilidad— y tv.galeEnergy de Energía)
        const heal = p.tv?.galeHeal || 0, en = p.tv?.galeEnergy || 0;
        if (heal > 0) { if (g?.heal) g.heal(p.stats.maxHP * heal / 100, { target: 'self', src: 'galeHeal' }); else p.healSkill?.(p.stats.maxHP * heal / 100, 'galeHeal'); }
        if (en > 0) gainResource(p, en);
      },
      modifyResolve(p, sk, prof, st) { if (st.galeT > 0 && sk.id === 'flecha_multiple') prof.proj = (prof.proj || 0) + 1; },
      onTick(g, p, dt, st) {
        if (st.galeT > 0) { st.galeT -= dt; if (st.galeT <= 0) { st.galeT = 0; drainGauge(p, 'impulso', st.v); invalidate(p); } }
      },
      view: st => (st.galeT > 0 ? { state: 'active', label: 'Vendaval', t: st.galeT } : null),
      // v2: en movimiento (gana) y Vendaval Perpetuo (s14: segundos extra acumulados)
      viewX(p, st, e, out) {
        const galeExt = hasPower(p, 't_galechain') ? (peekPower(p, 't_galechain')?.ext || 0) : 0;
        out.x = { moving: !!p.moving, galeExt: r2(galeExt) };
        if (st.galeT > 0) { out.tMax = T.impulso.galeT + galeExt; out.ready = ['flecha_multiple']; } else out.ready = [];
      },
    },
  };
}
