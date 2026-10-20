// ============================================================
// MECÁNICAS DE ESPECIALIZACIÓN: indicadores (módulo PURO, sin DOM) — Paso 2c.0
// ============================================================
// docs/paso2-diseno.md §2 (tabla «Mecánicas propias de cada especialización»),
// §9.1.2 (punto ⑩) y §9.1.3. El recurso de clase (Furia/Maná/Energía) es igual
// para todos; cada especialización añade UN indicador con su ritmo propio:
//   sed (Berserker) · bastion (Guardián) · fervor (Cruzado) · calor (Piromante) ·
//   escarcha (Crionte, POR ENEMIGO) · cargas (Arcanista) · concentracion
//   (Francotiradora) · coto (Montaraz: trampas armadas + Presa) · impulso (Tiradora)
// Aquí vive la mecánica BASE de llenado y descarga de cada uno. Los talentos que
// la potencian (Remolino Sediento, Desafío Firme, Combustión…) son poderes de
// js/powers-<clase>.js (2c.1) que llaman a gainGauge/spendGauge o reaccionan con
// el gancho ⑩ `onGauge`.
//
// API (estable para los trabajadores de 2c.1):
//   defineGauge(id, def)                 registra un indicador NUEVO (los 9 base ya están)
//   gainGauge(p, id, n, e?) → n ganado   ⑩ onGauge('gain') y, al llegar al máximo, ('full')
//   spendGauge(p, id, n, e?) → bool      ⑩ onGauge('spent') y, si queda a 0, ('empty')
//   drainGauge(p, id, n, e?)             baja sin «gastar» (pérdida/caducidad; ⑩ 'empty' a 0)
//   setGauge(p, id, v, e?)               fija el valor (tests / arnés: h.gauge(id, n))
//   touchGauge(p, id, e?)                renueva el reloj de pérdida sin ganar nada
//   gaugeValue(p, id, e?) · gaugeMax(p, id) · gaugeState(p, id, e?) (estado extra del indicador)
//   Paso 2c.2 — modificadores por STAT (de poderes `stats` o de buffs, sin escribir st.v):
//     'gaugeMax:<id>'  +máximo (Coto Cerrado)
//     'gaugeGain:<id>' +% de lo que se GANA (Temeridad: Sed ×2 = +100; Combustión: Calor ×2)
//     'gaugeLoss:<id>' +% de lo que se PIERDE con el tiempo/al moverte (Paso del
//                      Acechador −15; Visión Certera −100 = moverte no vacía la Concentración)
//     gaugeStat(p, key) · gaugeGainMult(p, id) · gaugeLossMult(p, id)
//   claves tv que consume aquí el núcleo: frostLayers (Escarcha), focusRate y focusEnergy
//   (Concentración), galeHeal y galeEnergy (Impulso), fervorChance (Fervor)
//   activeMechanic(p) → id | null        el de la especialización ACTIVA (p.talentAgg.mechanic)
//   gaugeView(p, { target }?) → vista v2 | null   (HUD, 2d · 2d.2 §3.10; ver gaugeView abajo)
//   gaugeSeq(p, id) → { gain, full, spent, empty }  contadores MONÓTONOS de eventos (⑩)
//   gaugeTuning() → números de cada mecánica (ÚNICA fuente para el texto de la UI: explain(T))
//   gaugeDefs() · gaugeIds()
// Solo se llena el indicador de la especialización activa (gainGauge devuelve 0
// con cualquier otro). `e` es obligatorio en los indicadores por enemigo
// (perEnemy: escarcha). El estado es volátil (p.gauges / e.gauges; no se guarda).
//
// CÓMO SE ENGANCHA AL JUEGO (sin puntos de despacho nuevos): cada indicador es un
// poder del registro, `gauge_<id>` (gaugePowers(), lo registra js/powers.js), que
// Player.recompute añade a p.powers cuando su especialización está activa. Sus
// ganchos onHit/onDamaged/onKill/onTick/onCast/afterCast/condAdd/condCrit/
// modifyResolve reciben, como ÚLTIMO argumento extra, el estado del indicador.
// Máximo extra por poderes: `stats: () => ({ 'gaugeMax:<id>': n })` (p.powerStats).
//
// CICLO DE MÓDULOS: powers.js importa este archivo (para registrar gauge_<id>) y
// este importa powers.js (firePower para ⑩). Por eso nada del nivel superior lee
// bindings importados y el registro es un `var` perezoso (seguro en cualquier
// orden de evaluación).
// hojas puras (sin imports): los números de las activas de talento que cita la UI. Van
// ANTES de powers.js: en el ciclo powers.js ↔ este módulo, powers.js llama a gaugePowers()
// (→ gaugeTuning) al cargar y estas hojas tienen que estar ya evaluadas.
// (espacio de nombres: los tests que sustituyen los árboles por un fixture no exportan *_TALENT_SKILLS)
import * as TAL_G from './talents-guerrero.js';
import * as TAL_M from './talents-maga.js';
import * as TAL_A from './talents-arquera.js';
import { STAGGER_CC } from './combat-math.js';
import { firePower, definePower, POWER_HOOKS, hasPower } from './powers.js';
import { gainResource } from './resources.js';

// eslint-disable-next-line no-var
var GAUGE_DEFS; // id → def congelada (perezoso: ver gaugeDefs)
// eslint-disable-next-line no-var
var GAUGE_POWERS_DONE; // true cuando powers.js ya registró los gauge_<id>

// (funciones, no constantes de módulo: se pueden llamar antes de evaluar este módulo)
function gaugeHooks() { return ['onHit', 'onDamaged', 'onKill', 'onCast', 'afterCast', 'condAdd', 'condCrit', 'condDr', 'modifyResolve']; }
function gaugeKeys() {
  return ['name', 'desc', 'color', 'max', 'perEnemy', 'integer', 'decay', 'state', 'value', 'view', 'viewX',
    'canGain', 'hold', 'onFull', 'procs', 'onTick', ...gaugeHooks()];
}

function isBoss(e) { return !!(e?.def?.boss || e?.def?.uber || e?.def?.worldBoss); }
// buff activo del héroe (los poderes de talento exponen sus ventanas como buffs)
function buffOf(p, id) { return (p?.buffs || []).find(b => b && b.id === id && b.t > 0) || null; }
// estado de un poder SIN crearlo (la vista no muta nada del héroe)
function peekPower(p, id) { return p?.powerState?.[id] || null; }
function r2(n) { return Math.round(n * 100) / 100; }
function talentSkill(id) {
  // (try: si un orden de carga raro llegara antes que las hojas, quedan los valores por defecto)
  for (const get of [() => TAL_G.GUERRERO_TALENT_SKILLS, () => TAL_M.MAGA_TALENT_SKILLS, () => TAL_A.ARQUERA_TALENT_SKILLS]) {
    let L = null;
    try { L = get(); } catch { L = null; }
    const s = (L || []).find(x => x.id === id);
    if (s) return s;
  }
  return {};
}
function now(p) { return p?.simT || 0; }
// el resolvedor cachea perfiles: un indicador que cambia coste/crítico/proyectiles
// (Ignición Total, Vendaval) los invalida
function invalidate(p) { if (p) p.resolved = {}; }

// ------------------------------------------------------------
// Los 9 indicadores BASE (§2). Constantes en un solo sitio:
// ------------------------------------------------------------
// eslint-disable-next-line no-var
var TUNING;
// Los números BASE los consume el núcleo (abajo). Los de los talentos que solo CITA la UI
// salen de la activa de talento (talents-<clase>.js) o, si viven en un poder
// (powers-<clase>.js), se copian aquí y tests/test75-gaugeview-v2 comprueba que el texto
// del nodo dice lo mismo (sin desfase entre el juego y la explicación de la barra).
export function gaugeTuning() {
  if (TUNING) return TUNING;
  const muro = talentSkill('g_t_muro'), ver = talentSkill('g_t_veredicto'), comb = talentSkill('p_combustion');
  const vis = talentSkill('a_t_vision'), cepo = talentSkill('a_t_cepo');
  return (TUNING = Object.freeze({
    sed:      { perHpPct: 1, perBleedTick: 2, bleedPerSec: 10, satedT: 6, decayAfter: 4, decayRate: 8,
      max: 100, lowHpPct: 40, satedDmgPct: 25,                              // m_berserk ×1,25
      remolino: { perEnemy: 4, max: 20 },                                    // s4 Remolino Sediento
      frenzy: { t: 8, aspdPct: 30, healPct: 1 } },                           // s14 Sangre Hirviente
    bastion:  { max: 5, perBlock: 1, decayEvery: 6, blockPct: 15,
      shout: 2,                                                              // s4 Desafío Firme
      murallaPerRank: 2,                                                     // s17 Muralla Viviente
      wall: { t: muro.dur ?? 8, drPerCharge: muro.drPerCharge ?? 10, drMax: muro.drMax ?? 50 } },
    fervor:   { max: 3, perKill: 1, hammerHits: 3,
      verdict: { cost: ver.gaugeCost ?? 3, coefPct: Math.round((ver.coef ?? 3) * 100), healPct: ver.healDealtPct ?? 25 },
      ascension: { t: 10, need: 3 } },                                       // x3 Ascensión
    calor:    { perFireHit: 5, decayAfter: 3, decayRate: 10, skills: ['bola_fuego', 'meteoro'],
      max: 100, llamarada: 25,                                               // s4 Llamarada Avivada
      combustion: { t: comb.dur ?? 10, mult: comb.gaugeMult ?? 2 } },
    escarcha: { max: 5, perHit: 1, nova: 2, freezeT: 1.5, numbT: 4, decayEvery: 2,
      bossStagger: STAGGER_CC.freeze, numbMovePct: 30, numbAspdPct: 15 },
    cargas:   { max: 4, perDart: 1, dmgPerCharge: 35, manaPerCharge: 5, loseAfter: 6,
      orbMax: 2,                                                             // s4 Orbe Resonante
      resonanceCrit: 15 },                                                   // s14 Resonancia
    concentracion: { gainPerSec: 20, losePerSec: 25, critPerPoint: 0.15, max: 100,
      alientoSpend: 50,                                                      // s4 Aliento del Cazador
      vision: { t: vis.dur ?? 12 } },
    coto:     { maxArmed: 3, preyT: 15, maxArmedExtra: 1,                    // s14 Coto Cerrado
      trap: { charges: cepo.charges ?? 1, cd: cepo.cd ?? 8, root: cepo.root ?? 2 } },
    impulso:  { perShot: 3, shotGap: 0.15, galeT: 6, galeAspd: 25, max: 100, galeProj: 1,
      andanada: 20,                                                          // s4 Andanada Impulsiva
      galechain: { perKill: 0.5, max: 6 } },                                 // s14 Vendaval Perpetuo
  }));
}

function baseGauges() {
  const T = gaugeTuning();
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
        if (hasPower(p, 'g_muralla_viva')) { try { drPct = +POWER_HOOKS.g_muralla_viva?.condDr?.(p) || 0; } catch { drPct = 0; } }
        const wall = buffOf(p, 'g_t_muro');
        out.x = { drPct, wallT: wall ? wall.t : 0, wallMax: wall ? (wall.dur || T.bastion.wall.t) : 0,
          wallDr: wall ? (wall.stats?.dr || 0) : 0, decayEvery: T.bastion.decayEvery };
        if (wall) { out.state = 'active'; out.label = 'Muro de Escudos'; out.t = wall.t; out.tMax = out.x.wallMax; }
      },
    },
    // Cruzado: +1 por muerte (Juicio, su nodo clave) y +1 cada 3 impactos de
    // Martillo de Guerra. Veredicto Final gasta 3.
    fervor: {
      name: 'Fervor', color: '#ecc760', max: T.fervor.max, integer: true,
      state: () => ({ hammerHits: 0 }),
      onKill(g, p) { gainGauge(p, 'fervor', T.fervor.perKill); },
      onHit(g, p, e, hit, st) {
        if (hit?.proc || hit?.dot || hit?.skill !== 'g_martillo') return;
        if (++st.hammerHits >= T.fervor.hammerHits) { st.hammerHits = 0; gainGauge(p, 'fervor', 1); }
      },
      // Fervor Creciente (tv.fervorChance, Paso 2c.2): un Martillo que golpea tiene X % de dar 1 más
      afterCast(g, p, cast, res) {
        const ch = p.tv?.fervorChance || 0;
        if (!(ch > 0) || cast?.sk?.id !== 'g_martillo' || !(res?.hits > 0)) return;
        const r = typeof p.combatRng === 'function' ? p.combatRng() : 0.5;
        if (r * 100 < ch) gainGauge(p, 'fervor', 1);
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

function freezeDef(id, def) {
  if (!id || typeof id !== 'string') throw new Error('defineGauge: id inválido');
  if (!def || typeof def !== 'object') throw new Error(`defineGauge("${id}"): definición vacía`);
  const keys = gaugeKeys();
  for (const k of Object.keys(def)) if (!keys.includes(k)) throw new Error(`defineGauge("${id}"): clave desconocida "${k}"`);
  if (!(typeof def.max === 'function' || def.max > 0)) throw new Error(`defineGauge("${id}"): max debe ser > 0 o función`);
  return Object.freeze({ id, ...def });
}

export function gaugeDefs() {
  if (!GAUGE_DEFS) {
    GAUGE_DEFS = {};
    for (const [id, d] of Object.entries(baseGauges())) GAUGE_DEFS[id] = freezeDef(id, d);
  }
  return GAUGE_DEFS;
}
export function gaugeIds() { return Object.keys(gaugeDefs()); }
export const BASE_GAUGE_IDS = ['sed', 'bastion', 'fervor', 'calor', 'escarcha', 'cargas', 'concentracion', 'coto', 'impulso'];
export function gaugePowerId(id) { return `gauge_${id}`; }

// indicador NUEVO (los <CLASE>_GAUGES de powers-<clase>.js pasan por aquí). Un id
// repetido lanza: para potenciar uno base usa gainGauge/onGauge desde un poder.
export function defineGauge(id, def) {
  const defs = gaugeDefs();
  if (defs[id]) throw new Error(`defineGauge: indicador repetido "${id}"`);
  defs[id] = freezeDef(id, def);
  if (GAUGE_POWERS_DONE && !POWER_HOOKS[gaugePowerId(id)]) definePower(gaugePowerId(id), gaugePowerOf(defs[id]));
  return defs[id];
}
export function registerGauges(map) { for (const [id, def] of Object.entries(map || {})) defineGauge(id, def); }

// ------------------------------------------------------------
// estado y valor
// ------------------------------------------------------------
export function activeMechanic(p) { return p?.talentAgg?.mechanic || null; }

// estado del indicador: { v, last, ...def.state() } en p.gauges[id] (o e.gauges[id])
export function gaugeState(p, id, e = null) {
  const def = gaugeDefs()[id];
  if (!def || !p) return null;
  const host = def.perEnemy ? e : p;
  if (!host) return null;
  const all = host.gauges || (host.gauges = {});
  return all[id] || (all[id] = { v: 0, last: -99, _acc: 0, ...(def.state ? def.state() : {}) });
}
// stat propia de los indicadores: la suma de p.powerStats[key] (poderes `stats`) y de
// los buffs activos que la declaran (addBuff(id, { 'gaugeGain:sed': 100 }, …))
export function gaugeStat(p, key) {
  let v = p?.powerStats?.[key] || 0;
  for (const b of p?.buffs || []) if (b && b.t > 0 && Number.isFinite(b.stats?.[key])) v += b.stats[key];
  return v;
}
export function gaugeGainMult(p, id) { return Math.max(0, 1 + gaugeStat(p, `gaugeGain:${id}`) / 100); }
export function gaugeLossMult(p, id) { return Math.max(0, 1 + gaugeStat(p, `gaugeLoss:${id}`) / 100); }
export function gaugeMax(p, id) {
  const def = gaugeDefs()[id];
  if (!def) return 0;
  const base = typeof def.max === 'function' ? def.max(p) : def.max;
  return Math.max(1, base + gaugeStat(p, `gaugeMax:${id}`));
}
export function gaugeValue(p, id, e = null) {
  const def = gaugeDefs()[id];
  if (!def) return 0;
  if (def.value) { try { return def.value(p, e) || 0; } catch { return 0; } }
  return gaugeState(p, id, e)?.v || 0;
}

// contadores MONÓTONOS de eventos por indicador (2d.2 §3.10: `seq` de la vista). Viven
// aparte de p.gauges para que resetGauges (cambio de especialización) no los rebobine; por
// enemigo (Escarcha) suman TODOS los enemigos. La UI compara con la vista anterior.
const SEQ_EVENTS = ['gain', 'full', 'spent', 'empty'];
export function gaugeSeq(p, id) {
  if (!p) return { gain: 0, full: 0, spent: 0, empty: 0 };
  const all = p._gaugeSeq || (p._gaugeSeq = {});
  return all[id] || (all[id] = { gain: 0, full: 0, spent: 0, empty: 0 });
}
function bumpSeq(p, id, ev) { if (p && SEQ_EVENTS.includes(ev)) gaugeSeq(p, id)[ev]++; }

// ⑩ punto de despacho de los indicadores: onGauge(g, p, id, ev, n, e)
function fireGauge(p, id, ev, n, e) {
  bumpSeq(p, id, ev);
  if (p?.hookIndex?.onGauge) firePower('onGauge', p, p.game, p, id, ev, n, e || null);
}

// indicadores DERIVADOS (def.value: Coto = trampas armadas) no pasan por gainGauge: sus
// eventos se cuentan comparando el valor con el anterior (onTick a 10 Hz y gaugeView).
// Solo `seq` (no dispara ⑩: ningún poder escucha esos eventos y así no cambia el juego).
function trackDerived(p, def) {
  if (!def?.value || def.perEnemy || !p) return;
  const st = gaugeState(p, def.id);
  if (!st) return;
  const v = gaugeValue(p, def.id), was = st._dv;
  st._dv = v;
  if (was == null || v === was) return;
  const max = gaugeMax(p, def.id);
  if (v > was) { bumpSeq(p, def.id, 'gain'); if (v >= max && was < max) bumpSeq(p, def.id, 'full'); }
  else { bumpSeq(p, def.id, 'spent'); if (v <= 0) bumpSeq(p, def.id, 'empty'); }
}

// opts.raw: sin el multiplicador 'gaugeGain:<id>' (setGauge / arnés)
export function gainGauge(p, id, n, e = null, opts = null) {
  if (!(n > 0) || !p) return 0;
  const def = gaugeDefs()[id];
  if (!def || activeMechanic(p) !== id) return 0;
  if (def.perEnemy && !e?.alive) return 0;
  const st = gaugeState(p, id, e);
  if (!st || (def.canGain && !def.canGain(p, st, e))) return 0;
  if (!opts?.raw) n *= gaugeGainMult(p, id);
  if (!(n > 0)) return 0;
  const max = gaugeMax(p, id);
  const before = st.v;
  st.v = Math.min(max, st.v + n);
  st.last = now(p);
  st._acc = 0;
  const got = st.v - before;
  if (got > 0) fireGauge(p, id, 'gain', got, e);
  if (before < max && st.v >= max) {
    fireGauge(p, id, 'full', st.v, e);
    try { def.onFull?.(p.game, p, st, e); } catch (err) { try { console.warn(`[indicador ${id}] onFull`, err); } catch { /* */ } }
  }
  return got;
}
export function spendGauge(p, id, n, e = null) {
  const def = gaugeDefs()[id];
  const st = def && gaugeState(p, id, e);
  if (!st || !(n > 0) || st.v + 1e-9 < n) return false;
  st.v = Math.max(0, st.v - n);
  fireGauge(p, id, 'spent', n, e);
  if (st.v <= 1e-9) { st.v = 0; fireGauge(p, id, 'empty', 0, e); }
  return true;
}
export function drainGauge(p, id, n, e = null) {
  const def = gaugeDefs()[id];
  const st = def && gaugeState(p, id, e);
  if (!st || !(n > 0) || st.v <= 0) return 0;
  const before = st.v;
  st.v = Math.max(0, st.v - n);
  if (st.v <= 1e-9) { st.v = 0; fireGauge(p, id, 'empty', 0, e); }
  return before - st.v;
}
export function setGauge(p, id, v, e = null) {
  const st = gaugeState(p, id, e);
  if (!st) return 0;
  if (v > st.v) gainGauge(p, id, v - st.v, e, { raw: true });
  else if (v < st.v) drainGauge(p, id, st.v - v, e);
  return st.v;
}
export function touchGauge(p, id, e = null) { const st = gaugeState(p, id, e); if (st) { st.last = now(p); st._acc = 0; } }
// vacía los indicadores del héroe (cambio de especialización)
export function resetGauges(p) { if (p) p.gauges = {}; }

// pérdida con el tiempo: { after (s sin ganar; ooc = s fuera de combate), rate/s |
// every+n (escalones) | all (todo de golpe) }
function tickDecay(p, def, st, dt, e = null) {
  const d = def.decay;
  if (!d || !st || st.v <= 0 || (def.hold && def.hold(st))) { if (st) st._acc = 0; return; }
  const idle = d.ooc ? (p.sinceCombat || 0) : now(p) - st.last;
  if (idle < (d.after || 0)) { st._acc = 0; return; }
  if (d.all) { drainGauge(p, def.id, st.v, e); return; }
  if (d.every) {
    st._acc += dt;
    while (st._acc >= d.every && st.v > 0) { st._acc -= d.every; drainGauge(p, def.id, d.n || 1, e); }
    return;
  }
  drainGauge(p, def.id, (d.rate || 0) * dt * gaugeLossMult(p, def.id), e);
}

// el poder gauge_<id> que engancha el indicador a los puntos de despacho
function gaugePowerOf(def) {
  const id = def.id;
  const pw = { name: def.name || id, desc: `Indicador de especialización: ${def.name || id}`, tags: ['gauge'] };
  if (def.procs) pw.procs = true;
  for (const h of gaugeHooks()) {
    if (!def[h]) continue;
    if (h === 'modifyResolve') pw[h] = (p, sk, prof) => def[h](p, sk, prof, gaugeState(p, id));
    else if (h === 'condAdd' || h === 'condCrit' || h === 'condDr') pw[h] = (p, a, b) => (def.perEnemy ? 0 : def[h](p, a, b, gaugeState(p, id)) || 0);
    else if (h === 'onHit') pw[h] = (g, p, e, hit) => def[h](g, p, e, hit, def.perEnemy ? gaugeState(p, id, e) : gaugeState(p, id));
    else if (h === 'onKill') pw[h] = (g, p, e, kill) => def[h](g, p, e, kill, def.perEnemy ? gaugeState(p, id, e) : gaugeState(p, id));
    else if (h === 'afterCast') pw[h] = (g, p, cast, res) => def[h](g, p, cast, res, gaugeState(p, id));
    else pw[h] = (g, p, x) => def[h](g, p, x, gaugeState(p, id));      // onDamaged, onCast
  }
  // ⑨ a 10 Hz: pérdida + onTick propio (los por enemigo recorren los enemigos con capas)
  pw.onTick = (g, p, dt) => {
    if (def.perEnemy) {
      for (const e of g?.enemies || []) {
        const st = e.alive && e.gauges?.[id];
        if (st && st.v > 0) tickDecay(p, def, st, dt, e);
      }
    } else tickDecay(p, def, gaugeState(p, id), dt);
    if (def.onTick) def.onTick(g, p, dt, def.perEnemy ? null : gaugeState(p, id));
    trackDerived(p, def);
  };
  return pw;
}
// mapa { gauge_<id>: PowerDef } (lo registra js/powers.js al final de su carga)
export function gaugePowers() {
  GAUGE_POWERS_DONE = true;
  const out = {};
  for (const def of Object.values(gaugeDefs())) out[gaugePowerId(def.id)] = gaugePowerOf(def);
  return out;
}

// ------------------------------------------------------------
// lectura para el HUD (2d · v2 de 2d.2 §3.10): indicador sobre la barra de habilidades
// ------------------------------------------------------------
// gaugeView(p, opts = {}) → null | {
//   id, name, value, max, color, state, label?, t?, enemy?     (v1, igual que antes)
//   tMax?      duración total del estado activo o de la ventana (anillo: t / tMax)
//   decayIn    s hasta la próxima pérdida: escalón (every), inicio (after) o caducidad
//              total (all); null si no pierde, está vacío o en hold
//   decaying   true si está perdiendo AHORA (Calor/Sed tras su espera, Concentración al moverte)
//   hold       true si un estado activo congela la pérdida (def.hold; Resonancia)
//   seq        { gain, full, spent, empty } contadores MONÓTONOS (gaugeSeq; copia)
//   ready      [skillId] habilidades que la mecánica deja listas o potenciadas AHORA
//   x          extra por indicador (siempre un objeto; tabla en docs/paso2d2-hud-pc.md §3.10)
//   sinceCombat  s desde el último golpe dado o recibido (la UI desvanece a los 5 s)
// }
// state: 'idle' (vacío) · 'building' · 'full' · 'active' (Sed Saciada, Ignición Total,
// Vendaval, Muro de Escudos, Ascensión, Visión Certera, jefe Aterido) · 'prey' (Presa).
// La vista NO muta al héroe ni a los enemigos (salvo los contadores de los derivados).
// opts.target: enemigo que la UI quiere ver (solo indicadores por enemigo: Escarcha).
// Regla de objetivo (R1): el enemigo bajo el cursor (opts.target vivo) → el jefe en combate
// (con capas o Aterido) → el más escarchado.
export function pickGaugeEnemy(p, id, target = null) {
  if (target?.alive) return target;
  let boss = null, best = null, bv = -1;
  for (const o of p?.game?.enemies || []) {
    if (!o?.alive) continue;
    const s = o.gauges?.[id];
    const v = s?.v || 0;
    if (!boss && isBoss(o) && (v > 0 || (o.numbT || 0) > 0)) boss = o;
    if (s && v > bv) { bv = v; best = o; }
  }
  return boss || best;
}

// pérdida con el tiempo, en lectura (misma regla que tickDecay)
function decayInfo(p, def, st, value) {
  const d = def.decay;
  if (!d || !st || !(value > 0) || (def.hold && def.hold(st))) return { decayIn: null, decaying: false };
  const idle = d.ooc ? (p.sinceCombat || 0) : now(p) - st.last;
  const wait = d.after || 0;
  if (d.every) {
    if (idle < wait) return { decayIn: wait - idle + d.every, decaying: false };
    return { decayIn: Math.max(0, d.every - (st._acc || 0)), decaying: false };
  }
  if (d.all) return { decayIn: Math.max(0, wait - idle), decaying: false };
  if (idle < wait) return { decayIn: wait - idle, decaying: false };
  return { decayIn: 0, decaying: (d.rate || 0) * gaugeLossMult(p, def.id) > 0 };
}

export function gaugeView(p, opts = {}) {
  const id = activeMechanic(p);
  const def = id && gaugeDefs()[id];
  if (!def) return null;
  let st = null, e = null;
  if (def.perEnemy) {
    e = pickGaugeEnemy(p, id, opts?.target || null);
    st = e?.gauges?.[id] || null;            // lectura: no crea estado en el enemigo
  } else st = gaugeState(p, id);
  trackDerived(p, def);
  const max = gaugeMax(p, id);
  const value = def.value ? gaugeValue(p, id, e) : (st?.v || 0);
  const extra = (st && def.view && def.view(st)) || null;
  const state = extra?.state || (value >= max ? 'full' : value > 0 ? 'building' : 'idle');
  const out = { id, name: def.name || id, value: def.integer ? Math.floor(value) : Math.round(value * 10) / 10, max, color: def.color || '#ffffff', state };
  if (extra?.label) out.label = extra.label;
  if (extra?.t != null) out.t = Math.max(0, extra.t);
  if (e) out.enemy = e;
  // v2 (solo AÑADE campos)
  const dec = decayInfo(p, def, st, value);
  out.decayIn = dec.decayIn == null ? null : Math.round(dec.decayIn * 100) / 100;
  out.decaying = dec.decaying;
  out.hold = !!(st && def.hold && def.hold(st));
  out.seq = { ...gaugeSeq(p, id) };
  out.ready = [];
  out.x = {};
  out.sinceCombat = p.sinceCombat ?? null;
  if (def.viewX) {
    try { def.viewX(p, st || {}, e, out); } catch (err) { try { console.warn(`[indicador ${id}] viewX`, err); } catch { /* */ } }
    if (!out.x || typeof out.x !== 'object') out.x = {};
    if (!Array.isArray(out.ready)) out.ready = [];
  }
  if (out.t != null) out.t = Math.max(0, Math.round(out.t * 100) / 100);
  return out;
}
