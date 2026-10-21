// ============================================================
// MECÁNICAS DE ESPECIALIZACIÓN DE LA ARQUERA: Concentración (Francotiradora) · Coto de Caza (Montaraz) · Impulso (Tiradora)
// ============================================================
// Paso 2 (E0.3): sale de js/spec-mechanics.js. Dueño desde E2: KT-arquera (docs/paso2g-arquera.md
// §7.0–§7.2: Impulso con pérdida quieta y Vendaval; Concentración con perfectos, Calma Absoluta y
// Respiro; Coto con Presas y Batida).
// Módulo HOJA (sin imports, y así debe quedar): el núcleo (js/spec-mechanics.js) compone
// gaugeTuning()/baseGauges() de las tres clases e INYECTA sus helpers en `H` para no crear
// un ciclo con powers.js. `H` trae: gainGauge, spendGauge, drainGauge, gaugeGainMult,
// gaugeLossMult, isBoss, buffOf, peekPower, r2, now, isBasicHit, invalidate, talentSkill,
// hasPower, gainResource y, perezosos (getters), POWER_HOOKS y STAGGER_CC.
// Nada de `const` de módulo que se lea al cargar: el núcleo puede llamar a estas funciones
// dentro del ciclo powers.js ↔ spec-mechanics.js, antes de evaluar este archivo.
//   gaugeTuning(H) → { <id>: números }       ÚNICA fuente de los números (explain(T) de la UI)
//   baseGauges(T, H) → { <id>: definición }  T = gaugeTuning() COMPLETO (las tres clases)
//   cotoPreys(st) · cotoAddPrey(...)         Presas del Coto (también para js/powers-arquera.js)
// El orden de las claves importa (gaugeDefs/gaugeIds lo conservan): guerrero → maga → arquera.
// Nodos que cita la UI (js/ui-gauges-arquera.js): v0 · v2 (tv.galeT) · f0 · f28 (Calma de 8 s) ·
// m0 · m9A (Presas en Manada) · m23 (tv.batidaDur / batidaPreyStagger) · m28 (Batida con 2).

export function gaugeTuning(H) {
  const { talentSkill } = H;
  const cepo = talentSkill('a_t_cepo');
  return {
    // f0 Mira Serena: +15/s quieta; perfectos de Disparo Apuntado o de un haz +15 y del básico +3 (una
    // ganancia por segundo como mucho); a 100, Calma Absoluta 5 s (8 con Ojo Inmóvil): todo tensado desde
    // media carga es perfecto y Apuntado y los haces se tensan ×1,5; después, Respiro de 7 s sin ganar
    concentracion: { gainPerSec: 15, losePerSec: 25, critPerPoint: 0.15, max: 100,
      perfectGain: 15, basicPerfectGain: 3, gainGap: 1,
      calmT: 5, calmLong: 8, calmChargeMul: 1.5, calmLock: 7 },
    // m0 Coto de Caza: trampas armadas (hasta 3; un Racimo cuenta 1) y Presa (15 s sin golpearla);
    // Batida: 3 estallidos en 1 s → +15 % de daño recibido 6 s a los alcanzados y a la Presa (cada 12 s)
    coto:     { maxArmed: 3, preyT: 15, manada: { elite: 1, trap: 2 },
      batida: { n: 3, win: 1, pct: 15, dur: 6, icd: 12 },
      trap: { charges: cepo.charges ?? 2, cd: cepo.cd ?? 8, root: cepo.root ?? 2 } },
    // v0 Impulso: +3 por acierto en movimiento (uno cada 0,15 s); a 100, Vendaval 6 s (+25 % de velocidad
    // de ataque y +1 flecha a Flecha Múltiple); quieta más de 2 s pierde 10 por segundo
    impulso:  { perShot: 3, shotGap: 0.15, galeT: 6, galeAspd: 25, max: 100, galeProj: 1, idleAfter: 2, idleRate: 10 },
  };
}

// ---------- Presas del Coto: st.preys = [{ e, t, kind }] ('elite': la del golpe; 'trap': Presas en Manada) ----------
export function cotoPreys(st) {
  return (st?.preys || []).filter(x => x.e?.alive && x.t > 0).map(x => x.e);
}
function syncPrey(st) {
  const first = st.preys[0] || null;
  st.prey = first ? first.e : null;
  st.preyT = first ? first.t : 0;
}
// añade una Presa de `kind` (como mucho `cap` de ese tipo); la que ya lo es renueva su tiempo
export function cotoAddPrey(st, e, kind, preyT, cap = 1) {
  if (!st || !e?.alive) return false;
  st.preys = (st.preys || []).filter(x => {
    if (x.e?.alive && x.t > 0) return true;
    if (x.e) x.e.prey = false;
    return false;
  });
  const has = st.preys.find(x => x.e === e);
  if (has) { has.t = preyT; syncPrey(st); return false; }
  if (!(cap > 0) || st.preys.filter(x => x.kind === kind).length >= cap) return false;
  st.preys.push({ e, t: preyT, kind });
  e.prey = true;
  syncPrey(st);
  return true;
}

export function baseGauges(T, H) {
  const { gainGauge, drainGauge, gaugeLossMult, isBoss, r2, now, invalidate, hasPower, gainResource } = H;
  const C = T.concentracion, K = T.coto, I = T.impulso;
  const CHARGED = ['a_t_apuntado', 'a_u_celeste'];
  // de rodillas (postura con keepGauge): moverte no gasta Concentración
  const keepsFocus = (g, p) => (g?.activeStanceModes?.(p) || []).some(m => m.keepGauge === 'concentracion');
  // una ganancia de perfecto por segundo como mucho
  const perfectGain = (p, st, n) => {
    if (now(p) - (st.gainAt ?? -99) < C.gainGap - 1e-9) return;
    if (gainGauge(p, 'concentracion', n) > 0) st.gainAt = now(p);
  };
  const endCalm = (p, st) => {
    st.calmT = 0;
    st.lockT = C.calmLock;
    drainGauge(p, 'concentracion', st.v);
    if (p.buffs?.some(b => b.id === 'f_calma')) { p.buffs = p.buffs.filter(b => b.id !== 'f_calma'); p.recompute?.(); } else invalidate(p);
  };
  return {
    // Francotiradora: +15/s quieta (× 1 + tv.focusRate/100), −25/s moviéndote (de rodillas, nada);
    // +0,15 % de crítico por punto. A 100, CALMA ABSOLUTA; al acabar, a 0 y RESPIRO (sin ganar)
    concentracion: {
      name: 'Concentración', color: '#ead86e', max: 100,
      state: () => ({ calmT: 0, calmMax: 0, lockT: 0, gainAt: -99 }),
      canGain: (p, st) => !(st.calmT > 0) && !(st.lockT > 0),
      hold: st => st.calmT > 0,
      onTick(g, p, dt, st) {
        if (st.calmT > 0) {
          st.calmT -= dt;
          if (st.calmT <= 1e-9) endCalm(p, st);
          return;
        }
        if (st.lockT > 0) { st.lockT = Math.max(0, st.lockT - dt); return; }
        if (p.moving) { if (!keepsFocus(g, p)) drainGauge(p, 'concentracion', C.losePerSec * dt * gaugeLossMult(p, 'concentracion')); }
        else gainGauge(p, 'concentracion', C.gainPerSec * dt * Math.max(0, 1 + (p.tv?.focusRate || 0) / 100));
      },
      // CALMA ABSOLUTA: perfecto desde media carga (stat perfectAlways) y tensado ×1,5 en Apuntado y los haces
      onFull(g, p, st) {
        const t = hasPower(p, 'f_ojo_inmovil') ? C.calmLong : C.calmT;
        st.calmT = st.calmMax = t;
        p.addBuff?.('f_calma', { perfectAlways: 1 }, t, { name: 'Calma Absoluta', icon: '🎯', desc: 'Todo tensado desde media carga es perfecto' });
        g?.ui?.spawnText?.(p.pos?.clone ? p.pos.clone().setY(2.4) : p.pos, '¡Calma Absoluta!', 'txt-crit');
        const n = p.tv?.focusEnergy || 0;                  // Respiración Profunda (v1): Energía al llenarla
        if (n > 0) gainResource(p, n);
      },
      modifyResolve(p, sk, prof, st) {
        if (st.calmT > 0 && prof.charge && CHARGED.includes(sk.id)) prof.charge.speed *= C.calmChargeMul;
      },
      // perfecto del básico tensado (lo sabe al disparar) y de Disparo Apuntado o un haz (al acabar)
      onCast(g, p, cast, st) { if (cast?.weapon && cast.perfect) perfectGain(p, st, C.basicPerfectGain); },
      afterCast(g, p, cast, res, st) { if (cast?.perfect && CHARGED.includes(cast.sk?.id)) perfectGain(p, st, C.perfectGain); },
      condCrit(p, e, hit, st) { return st.v * C.critPerPoint; },
      viewX(p, st, e, out) {
        const moving = !!p.moving, kneel = keepsFocus(p.game, p);
        const calmT = r2(Math.max(0, st.calmT || 0)), calmMax = st.calmMax || C.calmT;
        // visionT/visionMax: nombres del contrato de la vista (docs/paso2d2-hud-pc.md §3.10) = la Calma
        out.x = { moving, kneeling: kneel, critPct: r2(out.value * C.critPerPoint), calmT, calmMax,
          lockT: r2(Math.max(0, st.lockT || 0)), lockMax: C.calmLock, visionT: calmT, visionMax: calmT > 0 ? calmMax : 0 };
        out.decaying = moving && !kneel && out.value > 0 && !(st.calmT > 0) && gaugeLossMult(p, 'concentracion') > 0;
        if (st.calmT > 0) { out.state = 'active'; out.label = 'Calma Absoluta'; out.t = st.calmT; out.tMax = st.calmMax || C.calmT; out.ready = [...CHARGED]; }
        else if (st.lockT > 0) { out.label = 'Respiro'; out.t = st.lockT; out.tMax = C.calmLock; out.ready = []; }
        else out.ready = [];
      },
    },
    // Montaraz: el valor son las TRAMPAS ARMADAS tuyas (campos 'trampa' o data.trap; un Racimo, data.cluster,
    // cuenta 1; hasta 3 + gaugeMax:coto). PRESA: el primer élite o jefe que golpeas (15 s sin golpearla;
    // con Presas en Manada, también 2 que pisen una trampa): cuenta como élite y KillInfo.status.prey.
    // BATIDA: 3 estallidos de trampa en 1 s (2 con Corazón del Bosque 3) → Debilidad a los alcanzados y a
    // la Presa (+tv.batidaDur s; tv.batidaPreyStagger de Quebranto a la Presa); una cada 12 s
    coto: {
      name: 'Coto de Caza', color: '#86d47a', max: K.maxArmed, integer: true,
      state: () => ({ prey: null, preyT: 0, preys: [], hits: new Map(), batidaT: 0, batidaMax: 0, batidaAt: -99, batidas: 0 }),
      value(p) {
        const seen = new Set();
        for (const f of p.game?.fields || []) {
          if (f.dead || f.sprung || f.owner !== p || !(f.kind === 'trampa' || f.data?.trap)) continue;
          if ((f.age || 0) < (f.armAt || 0) - 1e-9) continue;
          seen.add(f.data?.cluster ?? f.uid);
        }
        return Math.min(seen.size, K.maxArmed + (p.powerStats?.['gaugeMax:coto'] || 0));
      },
      onHit(g, p, e, hit, st) {
        if (hit?.proc || hit?.dot || !e) return;
        if (hit.trap) st.hits.set(e, now(p));
        if (!e.alive) return;
        if (cotoAddPrey(st, e, 'elite', K.preyT, (e.def?.rank || isBoss(e)) ? K.manada.elite : 0))
          g?.ui?.spawnText?.(e.pos?.clone ? e.pos.clone().setY((e.def?.scale || 1) + 0.8) : e.pos, '¡PRESA!', 'txt-crit');
      },
      onTick(g, p, dt, st) {
        for (const x of st.preys) x.t -= dt;
        st.preys = st.preys.filter(x => {
          if (x.e?.alive && x.t > 0) return true;
          if (x.e) x.e.prey = false;
          return false;
        });
        syncPrey(st);
        if (st.batidaT > 0) st.batidaT = Math.max(0, st.batidaT - dt);
        const t = now(p);
        for (const [e, at] of st.hits) if (!e.alive || t - at > 2) st.hits.delete(e);
        const need = K.batida.n - ((p.talentAgg?.powerRank?.m_corazon_bosque | 0) >= 3 ? 1 : 0);
        if (t - st.batidaAt < K.batida.icd - 1e-9 || (g?.trapBurstsWithin?.(p, K.batida.win) || 0) < need) return;
        const targets = new Set(cotoPreys(st));
        for (const [e, at] of st.hits) if (e.alive && t - at <= K.batida.win + 1e-9) targets.add(e);
        if (!targets.size) return;
        const dur = K.batida.dur + (p.tv?.batidaDur || 0), stagger = p.tv?.batidaPreyStagger || 0;
        for (const e of targets) e.applyWeakness?.('coto_batida', K.batida.pct, dur);
        if (stagger > 0) for (const e of cotoPreys(st)) e.addStagger?.(stagger, p);
        st.batidaT = st.batidaMax = dur;
        st.batidaAt = t;
        st.batidas++;
        g?.sfx?.('verb_hunt');
        g?.ui?.spawnText?.(p.pos?.clone ? p.pos.clone().setY(2.4) : p.pos, '¡Batida!', 'txt-crit');
      },
      view: st => (st.prey ? { state: 'prey', label: 'Presa', t: st.preyT } : null),
      // Presas (nombre, vida, atrapada), Batida y cargas de Trampa de Cepo (sin mutar el estado: las
      // recargas pendientes se cuentan aquí)
      viewX(p, st, e, out) {
        const prey = st.prey?.alive ? st.prey : null;
        const knows = (p.skills?.a_t_cepo || 0) > 0;
        const ch = p.skCharges?.a_t_cepo;
        const max = knows ? (ch?.max || K.trap.charges) : 0;
        const cd = p.cdMax?.a_t_cepo || K.trap.cd;
        let charges = max, frac = 0;
        if (knows && ch) {
          charges = Math.min(max, ch.n);
          let next = ch.nextAt;
          while (charges < max && next != null && now(p) + 1e-6 >= next) { charges++; next += cd; }
          if (charges < max && next != null) frac = Math.max(0, Math.min(1, 1 - (next - now(p)) / cd));
        }
        const t = now(p);
        out.x = { preyName: prey ? (prey.def?.name || prey.name || '') : '',
          preyHpPct: prey ? Math.round(Math.max(0, prey.hp) / Math.max(1, prey.maxHP || 1) * 100) : 0,
          preys: cotoPreys(st).length, trapCharges: charges, trapChargesMax: max, trapCdFrac: r2(frac),
          preyTrapped: !!prey && (prey.rootT || 0) > 0,
          batidaT: r2(st.batidaT || 0), batidaMax: st.batidaMax || K.batida.dur,
          batidaIn: r2(Math.max(0, K.batida.icd - (t - st.batidaAt))) };
        if (st.batidaT > 0) { out.state = 'active'; out.label = 'Batida'; out.t = st.batidaT; out.tMax = st.batidaMax || K.batida.dur; }
        else if (prey) out.tMax = K.preyT;
        out.ready = knows && charges > 0 ? ['a_t_cepo'] : [];
      },
    },
    // Tiradora: +3 por disparo hecho EN MOVIMIENTO; quieta más de 2 s pierde 10/s; a 100 → VENDAVAL
    // 6 s (+tv.galeT; +25 % de velocidad de ataque, +1 proyectil a Flecha Múltiple) y vuelve a 0.
    impulso: {
      name: 'Impulso', color: '#66d7c7', max: 100,
      state: () => ({ galeT: 0, galeMax: 0, shotAt: -9 }),
      canGain: (p, st) => !(st.galeT > 0),
      hold: st => st.galeT > 0,
      onHit(g, p, e, hit, st) {
        if (hit?.proc || hit?.dot || !p.moving || !hit?.tags?.has?.('proj')) return;
        if (now(p) - st.shotAt < I.shotGap) return;
        st.shotAt = now(p);
        gainGauge(p, 'impulso', I.perShot);
      },
      onFull(g, p, st) {
        const t = I.galeT + (p.tv?.galeT || 0);
        st.galeT = st.galeMax = t;
        p.addBuff?.('t_vendaval', { aspdPct: I.galeAspd }, t,
          { name: 'Vendaval', icon: '🌬️', desc: `+${I.galeAspd}% vel. de ataque y +${I.galeProj} proyectil a Flecha Múltiple` });
        invalidate(p);
        // Segundo Aliento (tv.galeHeal % de vida —curación de habilidad— y tv.galeEnergy de Energía)
        const heal = p.tv?.galeHeal || 0, en = p.tv?.galeEnergy || 0;
        if (heal > 0) { if (g?.heal) g.heal(p.stats.maxHP * heal / 100, { target: 'self', src: 'galeHeal' }); else p.healSkill?.(p.stats.maxHP * heal / 100, 'galeHeal'); }
        if (en > 0) gainResource(p, en);
      },
      modifyResolve(p, sk, prof, st) { if (st.galeT > 0 && sk.id === 'flecha_multiple') prof.proj = (prof.proj || 0) + I.galeProj; },
      onTick(g, p, dt, st) {
        if (st.galeT > 0) {
          st.galeT -= dt;
          if (st.galeT <= 0) { st.galeT = 0; st.galeMax = 0; drainGauge(p, 'impulso', st.v); invalidate(p); }
          return;
        }
        if (!p.moving && (p.stillT || 0) >= I.idleAfter - 1e-9) drainGauge(p, 'impulso', I.idleRate * dt * gaugeLossMult(p, 'impulso'));
      },
      view: st => (st.galeT > 0 ? { state: 'active', label: 'Vendaval', t: st.galeT } : null),
      // en movimiento (gana), quieta (pierde tras idleAfter) y el Vendaval con sus segundos de más
      viewX(p, st, e, out) {
        const still = p.moving ? 0 : (p.stillT || 0);
        out.x = { moving: !!p.moving, still: r2(still), idleIn: r2(Math.max(0, I.idleAfter - still)),
          galeExt: r2(Math.max(0, (st.galeMax || 0) - I.galeT - (p.tv?.galeT || 0))) };
        out.decaying = !p.moving && !(st.galeT > 0) && out.value > 0 && still >= I.idleAfter - 1e-9;
        if (st.galeT > 0) { out.tMax = st.galeMax || I.galeT; out.ready = ['flecha_multiple']; } else out.ready = [];
      },
    },
  };
}
