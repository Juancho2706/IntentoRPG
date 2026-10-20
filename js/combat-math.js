// ============================================================
// Fórmulas de combate (módulo PURO, testeable headless) — Paso 1A
// ============================================================
// Fuente ÚNICA de las fórmulas de daño, defensa, topes y curvas de escalado.
// No importa nada del juego (ni data.js ni entities.js) para evitar ciclos:
// quien llama le pasa los datos ya resueltos.
//
// DAÑO DE UN GOLPE DEL JUGADOR (modelo D4 temporada 2+ / PoE "increased vs more"):
//
//   daño = arma × coef × (1 + Σ ADITIVO/100) × M(atributo) × CRIT × DEB × Π[×]
//
//   arma      tirada entre wMin..wMax (poder de arma, escala con G(ilvl) y calidad)
//   coef      coeficiente de la habilidad (sk.mult por rango; Eco ×0.5/0.6)
//   ADITIVO   UN SOLO SACO: dmgPct de objetos/paragon/glifos/bendiciones/era/
//             buffs/maestría (stats) + sinergias + soportes (Amplificado,
//             Concentrado, Sobrecarga) + modificadores "+X %" de la habilidad
//             (Brutal, Aplastar, Coloso, contrapartidas negativas…) + daño
//             crítico extra (stat critDmg, solo si es crítico)
//   M         1 + atributo principal × MAIN_STAT_PER_POINT
//   CRIT      ×CRIT_MULT (1,5) si es crítico; prob. topada en CAPS.crit DESPUÉS
//             de sumar todos los bonus (equipo + habilidad + soportes)
//   DEB       saco DEBILIDAD del objetivo: Vulnerable (+20) + debilitamientos,
//             tope ×1,5 (weaknessMult) — Paso 2b.0
//   Π[×]      multiplicadores ESCASOS: poderes legendarios / nodos clave de
//             maestría (Furia, Sed de Batalla, Tiro Mortal, Cacería) y el hook de
//             talentos. Cada uno ×1,10–×1,30 y solo cuentan los MAX_MULT_ACTIVE
//             (3) mayores activos a la vez.
//
// DEFENSA (en capas, todas multiplicativas entre sí):
//   1) bloqueo (opcional): prob. topada en CAPS.block, reduce el golpe BLOCK_REDUCTION
//   2) armadura: solo daño físico; arm/(arm + K(AL)); tope CAPS.armor (75 %)
//   3) resistencia elemental (fuego/frío/rayo/veneno): tope CAPS.res (70 %), 0 por defecto
//   4) reducción de daño % (saco escaso): Π(1−r) de las fuentes, tope CAPS.dr
//   Espinas: solo contra atacantes CUERPO A CUERPO.
//
// CURVA ÚNICA DE NIVEL DE ÁREA: G(AL) = AREA_GROWTH^(AL−1) (1,065 → ×2 cada ~11
// niveles). La usan vida y daño enemigos (con exponentes propios) y el poder de
// arma / afijos planos de los objetos. Así la ofensiva del héroe y la vida de los
// monstruos crecen con la MISMA base y el banco de balance puede predecirlos.
// ============================================================

// ---------- topes ----------
export const CAPS = {
  crit: 60,     // % prob. de crítico (tras TODOS los bonus)
  cdr: 50,      // % reducción de enfriamiento (stat + modificadores + soportes)
  aspd: 100,    // % velocidad de ataque adicional (= el doble de cadencia)
  spd: 50,      // % velocidad de movimiento adicional
  armor: 75,    // % reducción máxima por armadura
  res: 70,      // % resistencia elemental máxima
  dr: 50,       // % reducción de daño genérica (saco multiplicativo escaso)
  block: 40,    // % prob. de bloqueo
  heal: 50,     // % curación de habilidad adicional (healPct) — Paso 2b.0, §6.1
};

export const CRIT_MULT = 1.5;          // daño crítico base (el extra va al saco aditivo)
// Saco DEBILIDAD (Paso 2b.0, §5.3): Vulnerable (bandera, +20) + debilitamientos
// del objetivo (Σd, aditivos, una entrada por fuente) en UN SOLO saco con tope ×1,5.
export const VULN_PCT = 20;            // Vulnerable: +20 puntos en el saco Debilidad
export const WEAKNESS_CAP = 1.5;       // tope del saco Debilidad
export const VULN_MULT = 1 + VULN_PCT / 100; // (compat) Vulnerable solo = ×1,2
export const MAX_MULT_ACTIVE = 3;      // nº máximo de multiplicadores [×] activos
export const BLOCK_REDUCTION = 0.5;    // un golpe bloqueado pierde el 50 %
export const LEECH_CAP_PER_SEC = 0.06; // cubeta de SUSTENTO: máx. 6 % de la vida máx. por segundo
export const MAIN_STAT_PER_POINT = 0.01; // +1 % de daño por punto de atributo principal
export const VOLATILE_COEF = 0.5;      // Volátil: 50 % del golpe medio del héroe

// ---------- curva de nivel de área ----------
export const AREA_GROWTH = 1.065;
export function G(al) { return Math.pow(AREA_GROWTH, Math.max(0, (al || 1) - 1)); }

// Escalado de enemigos por nivel de área (piso). Vida: G^HP_EXP; daño: G^DMG_EXP.
// La vida crece algo más rápido que el arma (G^1) porque el héroe también suma
// atributos, rangos de habilidad, paragon, maestría y más afijos con el nivel.
export const ENEMY_CURVE = {
  hpExp: 1.38,    // vida  = base × G^hpExp × hpBase
  hpBase: 1.0,
  dmgExp: 0.85,   // daño  = base × G^dmgExp × dmgBase
  dmgBase: 1.5,   // calibrado con el banco: TTD contra manada 6–10 s
  xpLin: 0.35,    // la XP sigue lineal (no toca el ritmo de subida de nivel)
};
export function enemyHpScale(al) { return ENEMY_CURVE.hpBase * Math.pow(G(al), ENEMY_CURVE.hpExp); }
export function enemyDmgScale(al) { return ENEMY_CURVE.dmgBase * Math.pow(G(al), ENEMY_CURVE.dmgExp); }
export function enemyXpScale(al) { return 1 + ENEMY_CURVE.xpLin * Math.max(0, (al || 1) - 1); }

// multiplicadores por rango / tipo de enemigo (sobre la vida ya escalada)
export const RANK_HP = { campeon: 3.0, elite: 6.1 }; // elite = valor en AL 1 (ver eliteHpMult)
export const RANK_DMG = { campeon: 1.25, elite: 1.45 };
export const BOSS_HP_MULT = 11.0;   // jefes de piso/mundo (tope de la rampa, ver bossHpMult)
export const BOSS_HP_MULT_MIN = 4.5; // primer jefe (AL 1): ~30–60 s solo con el ataque básico
export const BOSS_RAMP_AL = 9;       // la rampa llega a BOSS_HP_MULT en AL 9 (héroe ~Nv10)
// Vida de jefe por nivel de área: rampa lineal ×4,5 (AL1) → ×11 (AL ≥ 9). Al
// principio el héroe solo tiene el básico (sin ráfaga): un jefe ×11 duraba >2 min.
export function bossHpMult(al) {
  const t = Math.max(0, Math.min(1, ((al || 1) - 1) / (BOSS_RAMP_AL - 1)));
  return BOSS_HP_MULT_MIN + (BOSS_HP_MULT - BOSS_HP_MULT_MIN) * t;
}
// Vida de élite por nivel de área: ×6,1 + 0,002·(AL−1)² (×6,2 en AL9, ×7 en AL22,
// ×8,55 en AL36). Con el nivel las clases ganan ráfaga (más habilidades y rangos)
// y los élites se derretían en <4 s; en niveles bajos ×6,5 era demasiado lento.
export function eliteHpMult(al) {
  const a = Math.max(0, (al || 1) - 1);
  return RANK_HP.elite + 0.002 * a * a;
}
export const UBER_HP_MULT = 1.0;   // pináculo: su base (900) ya es ~2× la de un jefe

// Daño de peligros del entorno (charcos de fuego, aura ardiente…) por nivel de área
export function hazardDamage(base, al) { return Math.max(1, Math.round(base * enemyDmgScale(al) / ENEMY_CURVE.dmgBase)); }

// ---------- Tormento: multiplicadores por escalón (NO sube el nivel de área) ----------
// El botín NO sube de ilvl con el Tormento (antes: +1 piso ⇒ mejor ilvl ⇒ T10 era
// más FÁCIL con su propio equipo). Ahora da CALIDAD (masterwork) + rareza/cantidad.
export const TORMENT_MAX = 10;
export function tormentMods(T) {
  const t = Math.max(0, Math.min(TORMENT_MAX, T | 0));
  return {
    T: t,
    hp: 1 + 0.40 * t,           // T10 = ×5 vida
    dmg: 1 + 0.15 * t,          // T10 = ×2,5 daño
    xp: 1 + 0.10 * t,           // T10 = +100 % XP
    mf: t * 12,                 // hallazgo mágico (como antes)
    qty: t * 8,                 // cantidad de botín (como antes)
    quality: Math.floor(t / 2), // calidad pre-forjada del botín (máx 5 = +30 %)
  };
}

// ---------- objetos ----------
export const ILVL_MAX = 40; // el ilvl del botín se acota (más allá: calidad/rareza)
export function itemLevel(floor) { return Math.max(1, Math.min(ILVL_MAX, Math.round(floor || 1))); }
export const ATTR_STATS = ['fue', 'des', 'vit', 'ene'];
// poder de arma base (antes del factor de rareza/tirada): 3 en ilvl 1, ×G
export function weaponBase(ilvl) { return 3 * G(ilvl); }
export function armorBase(ilvl) { return 2 * G(ilvl); }
// escala de un afijo NO plano: los planos (hp, mp, arm, espinas, vida/maná al
// golpear) siguen G; los ATRIBUTOS crecen lineal y suave (multiplican el daño:
// si crecieran con G la ofensiva sería cuadrática).
export function affixScale(stat, ilvl) {
  const l = Math.max(1, ilvl || 1);
  return ATTR_STATS.includes(stat) ? 1 + 0.12 * (l - 1) : G(l);
}
// Fórmulas VIEJAS (≤ v1 del guardado), para reescalar objetos guardados.
export const LEGACY_ITEM = {
  weaponBase: ilvl => 3 + 2.0 * (Math.max(1, ilvl) - 1),
  armorBase: ilvl => 2 + 1.6 * (Math.max(1, ilvl) - 1),
  affixScale: ilvl => 1 + 0.22 * (Math.max(1, ilvl) - 1),
};
// versión de escala de los objetos (marcador por objeto: idempotente)
export const ITEM_SCALE_VERSION = 2;

// ---------- atributo principal y velocidades ----------
export function mainStatMult(v) { return 1 + Math.max(0, v || 0) * MAIN_STAT_PER_POINT; }
export function attackTime(base, aspdPct) { return base / (1 + Math.max(-50, Math.min(CAPS.aspd, aspdPct || 0)) / 100); }
export function moveSpeed(base, spdPct) { return base * (1 + Math.max(-50, Math.min(CAPS.spd, spdPct || 0)) / 100); }
// Regeneración de Maná/Energía por segundo. Antes ×(1 + 5 % por punto de Energía):
// con ~50 de Energía la Maga regeneraba ×3,5 y su gastadora de 0,9 s salía gratis
// (recurso casi infinito). Ahora +2 % por punto: hay que alternar con el básico.
export const REGEN_PER_ENE = 0.02;
export function resourceRegen(base, ene) { return (base || 0) * (1 + Math.max(0, ene || 0) * REGEN_PER_ENE); }
export function critChance(base, bonus = 0) { return Math.max(0, Math.min(CAPS.crit, (base || 0) + (bonus || 0))); }

// ---------- habilidades ----------
// Soportes que suman daño: van al saco ADITIVO (antes ×1,3 × ×1,35 × ×1,5).
export const SUPPORT_ADD = { amplify: 30, concentrated: 35, overcharge: 50 };
export const SUPPORT_CDR = { swift: 30 };    // Raudo: suma al número único de CDR
export const MASSACRE_CDR = 25;              // Masacre (golpear a 4+): suma 25 puntos de CDR
export const SUPPORT_CRIT = { focused: 25 }; // Certero
export const COLDBLOOD_CRIT = 100;           // Sangre Fría: llega al tope vs ralentizados
export const SUPPORT_COST = { echo: 1.6, overcharge: 1.4, efficient: 0.65 };

// Perfil de daño de un lanzamiento. Pura: recibe lo ya resuelto.
//  mult      = skillVal(sk.mult, rango) (coeficiente)
//  synergyPct= synergyBonus(sk, skills)
//  sups      = array de ids de soporte; mods = aggregateSkillMods(...)
//  echoMult  = 0 (lanzamiento normal) o 0.5/0.6 (repetición del Eco)
export function skillProfile({ mult = 1, synergyPct = 0, sups = [], mods = {}, echoMult = 0, critBonus = 0 } = {}) {
  let addPct = synergyPct;
  for (const s of sups) addPct += SUPPORT_ADD[s] || 0;
  addPct += mods.dmg || 0;
  let crit = (critBonus || 0) + (mods.crit || 0);
  for (const s of sups) crit += SUPPORT_CRIT[s] || 0;
  return { coef: mult * (echoMult > 0 ? echoMult : 1), addPct, critBonus: crit };
}

// Enfriamiento final: UN número de CDR (stat + mods + soportes + Masacre), con tope.
// Los mods con CDR negativo (Brutal/Aplastar/Coloso) restan de ese número.
export function cdrTotal(statCdr = 0, mods = {}, sups = [], massacre = false) {
  let c = (statCdr || 0) + (mods.cdr || 0);
  for (const s of sups) c += SUPPORT_CDR[s] || 0;
  if (massacre) c += MASSACRE_CDR;
  return Math.max(-100, Math.min(CAPS.cdr, c));
}
export function skillCooldown(baseCd, statCdr, mods, sups, massacre = false) {
  return Math.max(0, (baseCd || 0) * (1 - cdrTotal(statCdr, mods, sups, massacre) / 100));
}
export function skillCostMult(sups = []) {
  let m = 1;
  for (const s of sups) m *= SUPPORT_COST[s] || 1;
  return m;
}

// ---------- golpe ----------
// Daño de un golpe ANTES de los modificadores del objetivo (Vulnerable, Π[×]).
//  w = tirada del arma; st = stats del héroe (mainMult, dmgPct, critDmg)
export function hitDamage(w, coef, st, addPct = 0, isCrit = false) {
  const add = (st.dmgPct || 0) + (addPct || 0) + (isCrit ? (st.critDmg || 0) : 0);
  let d = w * coef * Math.max(0, 1 + add / 100) * (st.mainMult || 1);
  if (isCrit) d *= CRIT_MULT;
  return d;
}

// Multiplicadores [×] condicionales (poderes legendarios / nodos clave). Hook de
// talentos: registerMultiplier(id, { mult, when(ctx) }) — el rework de talentos
// declarará aquí los suyos y competirán por las MAX_MULT_ACTIVE plazas.
// ctx = { hpFrac (héroe), targetFrac, targetSlowed, crit }
// Paso 2b.0: la tabla se rellena desde el registro de poderes (js/powers.js →
// PowerDef.mult → registerMultiplier). Los de siempre (Furia ×1,15, Sed de Batalla
// ×1,25, Tiro Mortal ×1,25, Cacería ×1,15) viven en js/powers-common.js.
export const MULT_POWERS = {};
export function registerMultiplier(id, def) {
  if (!id || !def || !(def.mult > 0)) return;
  MULT_POWERS[id] = { mult: Math.min(1.3, Math.max(1, def.mult)), when: def.when || (() => true), name: def.name || id };
}
// Lista de multiplicadores activos (los MAX_MULT_ACTIVE mayores). `extra` admite
// [{id, mult}] estáticos (p. ej. nodos de talento sin condición).
export function activeMultipliers(powers, ctx = {}, extra = []) {
  const act = [];
  if (powers) for (const id of powers) {
    const m = MULT_POWERS[id];
    if (m && m.when(ctx)) act.push(m.mult);
  }
  for (const e of extra || []) if (e && e.mult > 1) act.push(Math.min(1.3, e.mult));
  act.sort((a, b) => b - a);
  return act.slice(0, MAX_MULT_ACTIVE);
}
export function multiplierProduct(powers, ctx = {}, extra = []) {
  return activeMultipliers(powers, ctx, extra).reduce((a, b) => a * b, 1);
}

// ---------- Debilidad (saco único del objetivo, §5.3) ----------
// DEB = min(WEAKNESS_CAP; 1 + (V + Σd)/100); V = VULN_PCT si es Vulnerable.
export function weaknessMult(v = 0, sumDebuffs = 0) {
  return Math.min(WEAKNESS_CAP, 1 + (Math.max(0, v || 0) + Math.max(0, sumDebuffs || 0)) / 100);
}
// suma de los debilitamientos ACTIVOS de un objetivo: debuffs = { id: { pct, t } }
export function sumWeakness(debuffs) {
  let s = 0;
  if (debuffs) for (const d of Object.values(debuffs)) if (d && d.t > 0) s += d.pct || 0;
  return s;
}

// ---------- condiciones ADITIVAS por objetivo (claves tv de talentos, §5.3) ----------
// ctx = { targetElite, targetSlowed, targetFrac, manaFrac }. Devuelve puntos al
// saco ADITIVO para ESE golpe (los poderes suman los suyos con PowerDef.condAdd).
export function condAddPct(tv = {}, c = {}) {
  if (!tv) return 0;
  let a = 0;
  if (c.targetElite) a += tv.eliteDmg || 0;
  if (c.targetSlowed) a += tv.slowedDmg || 0;
  if ((c.targetFrac ?? 0) > 0.6) a += tv.highHpDmg || 0;
  if ((c.targetFrac ?? 1) < 0.35) a += tv.lowHpDmg || 0;
  if ((c.manaFrac ?? 0) > 0.7) a += tv.highManaDmg || 0;
  return a;
}

// ---------- perfil central de DoT (sangrado/veneno/quemadura) ----------
// total = golpe medio × fracción × dotMul × (1 + (dotPct + <tipo>Pct)/100). La
// duración extra (dotDur/burnDur, s) añade tics con el MISMO daño por segundo.
export const DOT_PROFILES = Object.freeze({
  poison: { frac: 0.9, ticks: 5, interval: 1.0, color: 0x66ff66 },
  burn:   { frac: 0.8, ticks: 4, interval: 0.8, color: 0xff7722 },
  bleed:  { frac: 0.6, ticks: 3, interval: 1.0, color: 0xff4466 },
});
export function dotProfile(kind, avgHit, { dotMul = 1, tv = null } = {}) {
  const P = DOT_PROFILES[kind];
  if (!P || !(avgHit > 0)) return null;
  const pct = (tv?.dotPct || 0) + (tv?.[kind + 'Pct'] || 0);
  const extraS = (tv?.dotDur || 0) + (kind === 'burn' ? (tv?.burnDur || 0) : 0);
  const extraTicks = Math.max(0, Math.round(extraS / P.interval));
  const base = avgHit * P.frac * dotMul * Math.max(0, 1 + pct / 100);
  return { kind, total: base * (P.ticks + extraTicks) / P.ticks, ticks: P.ticks + extraTicks, interval: P.interval, color: P.color };
}

// ---------- rango de habilidad (§3.0/§4.1) ----------
export const RANK_COEF_STEP = 0.10;   // coeficiente +10 %/rango
export const RANK_BUFF_STEP = 0.06;   // buffs, escudos y curas +6 %/rango
export function rankCoef(rank) { return 1 + RANK_COEF_STEP * (Math.max(1, rank || 1) - 1); }
export function rankBuff(rank) { return 1 + RANK_BUFF_STEP * (Math.max(1, rank || 1) - 1); }

// ---------- curación de habilidad (§6.1 B) ----------
// Escala con healPct (tope CAPS.heal). El SUSTENTO (cubeta) no escala.
export function healScaled(amount, healPct = 0) {
  return Math.max(0, amount || 0) * (1 + Math.max(0, Math.min(CAPS.heal, healPct || 0)) / 100);
}

// ---------- defensa ----------
// K(AL): armadura para el 50 % frente a un atacante de nivel de área AL. Crece
// con G para que la armadura de los objetos (que también sigue G) conserve su
// porcentaje al progresar.
export const ARMOR_K = 60;
export function armorK(al) { return ARMOR_K * G(al); }
export function armorReduction(arm, al) {
  const a = Math.max(0, arm || 0);
  return Math.min(CAPS.armor / 100, a / (a + armorK(al)));
}
export const ELEMENTS = ['phys', 'fire', 'cold', 'lightning', 'poison'];
export const RES_STAT = { fire: 'resFire', cold: 'resCold', lightning: 'resLightning', poison: 'resPoison' };
export function resistance(stats, element) {
  const k = RES_STAT[element];
  return k ? Math.max(-100, Math.min(CAPS.res, stats?.[k] || 0)) / 100 : 0;
}
// Reducción de daño genérica (saco escaso): se guarda como % sumado en stats.dr
// (cada fuente debería ser pequeña); tope CAPS.dr.
export function damageReduction(stats) { return Math.max(0, Math.min(CAPS.dr, stats?.dr || 0)) / 100; }

// Mitiga un golpe entrante. opts: { al, element='phys', rng=Math.random }
// Devuelve { dmg, blocked, armorPct, resPct }.
export function mitigate(amount, stats, opts = {}) {
  const el = opts.element || 'phys';
  const rng = opts.rng || Math.random;
  let d = Math.max(0, amount || 0);
  let blocked = false;
  const blockCh = Math.max(0, Math.min(CAPS.block, stats?.block || 0));
  if (blockCh > 0 && rng() * 100 < blockCh) { d *= 1 - BLOCK_REDUCTION; blocked = true; }
  const armorPct = el === 'phys' ? armorReduction(stats?.arm || 0, opts.al || 1) : 0;
  const resPct = el === 'phys' ? 0 : resistance(stats, el);
  d *= (1 - armorPct) * (1 - resPct) * (1 - damageReduction(stats));
  return { dmg: Math.max(1, Math.round(d)), blocked, armorPct, resPct };
}
// Daño esperado (sin azar de bloqueo) — para el banco y la UI
export function expectedMitigation(stats, al, element = 'phys') {
  const blockCh = Math.max(0, Math.min(CAPS.block, stats?.block || 0)) / 100;
  const armorPct = element === 'phys' ? armorReduction(stats?.arm || 0, al) : 0;
  const resPct = element === 'phys' ? 0 : resistance(stats, element);
  return (1 - blockCh * BLOCK_REDUCTION) * (1 - armorPct) * (1 - resPct) * (1 - damageReduction(stats));
}

// ---------- cubeta de SUSTENTO (robo de vida y TODA cura por golpe/muerte) ----------
// Paso 2b.0 (§6.1 A): una sola cubeta por receptor que comparten el robo de vida,
// la vida al golpear (lph), las curas al matar (Festín…) y los procs de indicador.
// Se rellena a LEECH_CAP_PER_SEC × vidaMáx por segundo hasta 1 s de capacidad.
export function leechRefill(bucket, maxHP, dt) {
  const cap = LEECH_CAP_PER_SEC * maxHP;
  return Math.min(cap, (bucket ?? cap) + cap * dt);
}
export function leechTake(bucket, maxHP, want) {
  const cap = LEECH_CAP_PER_SEC * maxHP;
  const b = Math.min(cap, bucket ?? cap);
  const got = Math.max(0, Math.min(b, want || 0));
  return { heal: got, bucket: b - got };
}

export const SUSTAIN_CAP_PER_SEC = LEECH_CAP_PER_SEC;
export const sustainRefill = leechRefill;
export const sustainTake = leechTake;

// ---------- Volátil ----------
// Escala con el daño del HÉROE (no con la vida del muerto) y no encadena.
export function volatileDamage(avgHit) { return Math.max(1, Math.round((avgHit || 0) * VOLATILE_COEF)); }

// ---------- referencia: nivel de área esperado para un nivel de héroe ----------
// (lo usa el banco de balance) — nv1-20: un poco por debajo del nivel (zonas
// 3/8/13/18 para nv 1/6/11/16); nv>20: medio piso por nivel Paragon.
export function areaLevelForHero(level) {
  const L = Math.max(1, level | 0);
  return L <= 20 ? Math.max(1, L - 1) : Math.round(19 + (L - 20) * 0.55);
}
