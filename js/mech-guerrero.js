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
//   strikeBleedSource(p, hit)                 la regla del Sangrado de golpe (también la usa Desangrar)
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
      boilAt: 50,                 // b16 Sangre Hirviente: con más de 50 de Sed
      eliteKill: 30,              // b28 Corazón Indomable 1: matar a un élite
      apexSatedT: 9 },            // b28 Corazón Indomable 2: Sed Saciada 9 s
    // Bastión (rehecho): +1 por bloqueo y +1 cada 2 s plantado en combate; −4 % de daño recibido por
    // carga; caminando pierdes 1 cada 2 s; con 5, cambiar de postura las descarga (Muralla: escudo
    // del 20 % a ti y al aliado más herido · Ariete: onda del 300 % a 5 m, 30 de Quebranto a los
    // jefes) y deja el Bastión 5 s sin llenarse
    bastion: { max: 5, perBlock: 1, plantedEvery: 2, combatT: 5, moveLossEvery: 2, drPerCharge: 4,
      burstAt: 5, lockAfterBurst: 5,
      burst: { shieldPct: 20, shieldDur: 6, coef: 3, radius: 5, stagger: 30, allyRadius: 15 },
      apexMax: 7,                 // d28 Inexpugnable 2: 7 cargas
      raices: 1, raicesBig: 3, raicesBigN: 2,   // d5 Echar Raíces: 1 carga por Terremoto (2 si golpea a 3 o más)
      guarnicion: 1 },            // d20 Guarnición: 1 carga cada 1 s dentro de tu Ciudadela
    // Fervor (rehecho): +1 por suelta perfecta o detonación de Juicio (como mucho 1 por lanzamiento;
    // la suelta perfecta la suma el catálogo: perfectGauge del Martillo 1 y del Cataclismo 3) y +1
    // cada 3 Tajos. A 3, el siguiente Martillo sale al instante como Veredicto (+50 % y cura un 6 %
    // al más herido); el Veredicto no da Fervor ni es suelta perfecta. Fuera de combate, −1 cada 10 s.
    // S-guerrero: +1 si el Juicio golpea y +1 SIEMPRE al detonar una marca del propio Juicio (aparte del
    // tope por lanzamiento); el Cataclismo gasta el Fervor que tenías al empezar a cargar (+25 % por
    // punto a su golpe; una suelta perfecta lo deja en 3, como siempre)
    fervor: { max: 3, perPerfect: 1, perDetonate: 1, perCastMax: 1, perfectCataclysm: 3, basicHits: 3, decayOOC: 10,
      verdict: { cost: 3, dmgPct: 50, healPct: 6, apexHealPct: 10, radius: 15 },
      // S-guerrero: el Juicio que golpea da 1 y su marca, al detonarla, otro (G07: «+150 % y 1 de Fervor
      // seguro»); el Cataclismo gasta el que tenías al empezar a cargarlo: +25 % por punto (G04; la suelta
      // perfecta lo devuelve: +3)
      juicioHit: 1, ownDetonate: 1, cataclysmPct: 25, cataLive: 3 },   // cataLive: s tras empezar a cargar en que un Cataclismo cancelado deja de llevarse el Fervor
  };
}

export function baseGauges(T, H) {
  const { gainGauge, spendGauge, drainGauge, buffOf, now, isBasicHit, isBoss, hasPower, invalidate } = H;
  const rank = (p, id) => p?.talentAgg?.powerRank?.[id] | 0;
  // el Veredicto cambia el perfil del Martillo (Veredicto Generoso, z9A): la caché del resolvedor
  // se vacía cada vez que el Fervor entra en 3 o sale de 3 (al llenarse, al gastarlo y al perderlo)
  const syncVerdict = (p, st) => {
    const ready = (st?.v || 0) >= T.fervor.verdict.cost - 1e-9;
    if (ready === !!st.ready) return;
    st.ready = ready;
    invalidate(p);
  };
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
        // Sangrado de golpe: el nuevo SUSTITUYE al que esa habilidad ya había dejado (lo que le
        // quedaba se pierde, como la Ignición de la Maga). ⑤ llega antes que los efectos al golpear:
        // aquí se quita el viejo y el núcleo pone el nuevo. Con Desangrar (b8B) su poder lo aparta a
        // otra ranura en vez de perderlo
        if (!hit?.dot) {
          const src = strikeBleedSource(p, hit);
          if (src && e?.alive && !hasPower(p, 'g_b_desangrar')) g?.consumeDoT?.(e, src);
          return;
        }
        if (!/:bleed$/.test(hit.source || '')) return;
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
      // own: enemigo → { m, uses } con la marca que le puso el propio Juicio (no la del Sello ni la del
      // Edicto) y los usos que le quedaban: si bajan, se detonó y da su Fervor seguro. jHits: los que
      // golpea el Juicio en curso (su marca se pone después del gancho ⑤; se anota en afterCast)
      state: () => ({ basicAt: -1, basicN: 0, det: false, verdictCast: null, verdictLive: false, verdictTarget: null, verdictHealed: null, ready: false,
        cata: null, own: new WeakMap(), jHits: [] }),
      onFull(g, p, st) { syncVerdict(p, st); },
      onTick(g, p, dt, st) {
        syncVerdict(p, st);
        // un Cataclismo que no llegó a caer (carga cancelada) ya no se lleva el Fervor
        if (st.cata?.live && !g?._charging && now(p) - st.cata.t0 > T.fervor.cataLive) st.cata.live = false;
      },
      // a 3 de Fervor, el Martillo sale al instante (Veredicto: cast.instant, carga completa sin perfecto)
      onCast(g, p, cast, st) {
        st.det = false;
        if (cast?.sk?.id === 'g_juicio' && !cast.echo) st.jHits = [];
        // Cataclismo (S-guerrero, G04/G05): gasta el Fervor que tienes al EMPEZAR a cargarlo (condAdd y
        // afterCast) y, mientras cargas, la mira y el héroe lo telegrafían (campo g_cata_mira de
        // js/powers-guerrero.js: círculo del radio real, dorado en la ventana, y luz que sube en ti)
        if (cast?.sk?.id === 'g_u_cataclismo' && !cast.echo) {
          st.cata = { cast, n: Math.floor(st.v || 0), live: true, t0: now(p) };
          g?.spawnField?.('g_cata_mira', { pos: cast.target || p.pos, radius: cast.prof?.radius || 6, dur: 10, owner: null,
            data: { p, cast, prof: cast.prof } });
        }
        if (cast?.sk?.id !== 'g_martillo' || cast.echo) return;
        if ((st.v || 0) >= T.fervor.verdict.cost - 1e-9) {
          cast.instant = true;
          st.verdictCast = cast; st.verdictLive = true; st.verdictTarget = cast.enemy || null; st.verdictHealed = null;
        } else st.verdictLive = false;
      },
      onHit(g, p, e, hit, st) {
        if (hit?.proc || hit?.dot) return;
        if (hit?.detonated) {
          if (!hit.echo) st.det = true;
          // ¿era la marca del propio Juicio? (le quedan menos usos que al ponerla): +1 seguro
          const o = e && st.own.get(e);
          if (o && o.m.uses < o.uses) {
            o.uses = o.m.uses;
            if (o.uses <= 0) st.own.delete(e);
            gainGauge(p, 'fervor', T.fervor.ownDetonate);
          }
        }
        if (hit?.skill === 'g_juicio' && !hit.echo && e) st.jHits.push(e);
        // +1 cada 3 Tajos que aciertan (uno por golpe aunque alcance a varios)
        if (isBasicHit(p, hit) && st.basicAt !== now(p)) {
          st.basicAt = now(p);
          if (++st.basicN >= T.fervor.basicHits) { st.basicN = 0; gainGauge(p, 'fervor', 1); }
          // tv.fervorChance (contrato del núcleo, spec-mechanics.js; ningún nodo v2 la da): X % de 1 más
          const ch = p.tv?.fervorChance || 0;
          if (ch > 0 && (typeof p.combatRng === 'function' ? p.combatRng() : 0.5) * 100 < ch) gainGauge(p, 'fervor', 1);
        }
      },
      // Veredicto: +50 % al Martillo · Cataclismo: +25 % por cada punto de Fervor que gasta (solo su golpe
      // al caer: la repetición del Martillo Celestial llega después de afterCast y ya no lo lleva)
      condAdd: (p, e, hit, st) => (hit?.skill === 'g_martillo' && st?.verdictLive ? T.fervor.verdict.dmgPct : 0)
        + (hit?.skill === 'g_u_cataclismo' && st?.cata?.live ? T.fervor.cataclysmPct * st.cata.n : 0),
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
          syncVerdict(p, st);
          g?.ui?.spawnText?.(p.pos.clone().setY(2.2), '¡VEREDICTO!', 'txt-crit');
          return;
        }
        // Juicio (S-guerrero, G07): si golpea, +1 de Fervor (además de lo que dé su detonación) y se
        // anotan las marcas que acaba de poner (las suyas: puestas en este instante a los que golpeó)
        if (cast.sk?.id === 'g_juicio') {
          if (res?.hits > 0) gainGauge(p, 'fervor', T.fervor.juicioHit);
          for (const e of st.jHits) {
            const m = e.marks?.juicio;
            if (m && m.by === p && m.at >= now(p) - 1e-9) st.own.set(e, { m, uses: m.uses });
          }
          st.jHits = [];
        }
        // Cataclismo (G04): se lleva el Fervor con que empezaste a cargar (no es un Veredicto: drenaje, sin
        // 'spent'). Una suelta perfecta ya te dejó en 3 (perfectGauge) y lo conserva
        if (cast.sk?.id === 'g_u_cataclismo' && st.cata?.cast === cast) {
          if (!cast.perfect && st.cata.n > 0) drainGauge(p, 'fervor', Math.min(st.v || 0, st.cata.n));
          st.cata.live = false;
          syncVerdict(p, st);
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

// fuente del Sangrado que ESTE golpe directo deja con el perfil central del núcleo (el `dot` de la
// habilidad o de su paso de combo: el 3.er golpe de Rajar, un Desgarro) o null. No cuentan las
// copias (echo: se suman) ni el Sangrado de los giros (hitDot del Remolino: se acumula a propósito).
// Lo usan la Sed (sustituir) y Desangrar (b8B, js/powers-guerrero.js)
export function strikeBleedSource(p, hit) {
  if (!hit?.skill || hit.proc || hit.dot || hit.echo) return null;
  const prof = p?.resolved?.[hit.skill];
  const def = prof?.def || p?.forged?.[hit.skill]?.def || (p?.cls?.skills || []).find(s => s.id === hit.skill);
  if (!def) return null;
  const top = prof?.dot || def.dot;
  const dot = hit.step > 0 ? (def.steps?.[hit.step - 1]?.dot || top) : top;
  return dot === 'bleed' ? `${hit.skill}:bleed` : null;
}

