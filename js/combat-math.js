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
//   1) bloqueo (opcional): prob. topada en CAPS.block; para BLOCK_REDUCTION + blockPower/100
//      del golpe, con tope BLOCK_REDUCTION_MAX (blockReduction)
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
  // recurso al golpear (stat `mph`, por impacto) — Paso 2b.2: el afijo plano escala
  // con G, pero los pozos de Furia (100) y Energía (60) son fijos (§2): sin tope, a
  // partir de Nv25 los rares típicos daban +50–125 por golpe (recurso infinito)
  mph: 2,
};

export const CRIT_MULT = 1.5;          // daño crítico base (el extra va al saco aditivo)
// Saco DEBILIDAD (Paso 2b.0, §5.3): Vulnerable (bandera, +20) + debilitamientos
// del objetivo (Σd, aditivos, una entrada por fuente) en UN SOLO saco con tope ×1,5.
export const VULN_PCT = 20;            // Vulnerable: +20 puntos en el saco Debilidad
export const WEAKNESS_CAP = 1.5;       // tope del saco Debilidad
export const VULN_MULT = 1 + VULN_PCT / 100; // (compat) Vulnerable solo = ×1,2
export const MAX_MULT_ACTIVE = 3;      // nº máximo de multiplicadores [×] activos
export const BLOCK_REDUCTION = 0.5;    // un golpe bloqueado pierde el 50 % (+ stat blockPower)
export const BLOCK_REDUCTION_MAX = 0.9; // tope: un bloqueo nunca para todo el golpe
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
// con ~50 de Energía la Maga regeneraba ×3,5 y su principal de 0,9 s salía gratis
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
// Paso 2c.2 (claves que antes leían poderes «anfitriones»):
//   preyDmg       contra la PRESA del Montaraz (Cazadora Paciente)
//   explodedDmg   golpes de Fuego contra enemigos que ya estallaron (Sol Naciente: e.pyroBurst)
//   executePct    élites y jefes por debajo del umbral: +executeDmg (Ejecutar; sin esa clave,
//                 EXECUTE_ELITE_ADD; a los normales los remata el poder común nucleo_tv)
// Paso 2 (§3.6, verbos): plantedDmg (héroe PLANTADO), markedDmg (objetivo con una marca
// tuya), detonateDmg (golpe que detona una marca: se suma al pct de la marca)
export const EXECUTE_ELITE_ADD = 40;
export function condAddPct(tv = {}, c = {}) {
  if (!tv) return 0;
  let a = 0;
  if (c.targetElite) a += tv.eliteDmg || 0;
  if (c.targetSlowed) a += tv.slowedDmg || 0;
  if ((c.targetFrac ?? 0) > 0.6) a += tv.highHpDmg || 0;
  if ((c.targetFrac ?? 1) < 0.35) a += tv.lowHpDmg || 0;
  if ((c.manaFrac ?? 0) > 0.7) a += tv.highManaDmg || 0;
  if (c.targetPrey) a += tv.preyDmg || 0;
  if (c.targetExploded && c.elem === 'fire') a += tv.explodedDmg || 0;
  if (tv.executePct > 0 && c.targetElite && (c.targetFrac ?? 1) < tv.executePct / 100) a += tv.executeDmg > 0 ? tv.executeDmg : EXECUTE_ELITE_ADD;
  if (c.planted) a += tv.plantedDmg || 0;
  if (c.targetMarked) a += tv.markedDmg || 0;
  if (c.detonated) a += tv.detonateDmg || 0;
  return a;
}

// ---------- CARGAR Y SOLTAR (Paso 2, §3.6) ----------
// Valor de una escala de carga en la carga `u` (s nominales): `scale` = [aMin, aMax] (lineal
// entre min y max) o [[t, v], …] (por tramos, t en s). Fuera del rango, el extremo.
export function chargeCoefAt(scale, u, min = 0, max = 1) {
  if (!Array.isArray(scale) || !scale.length) return null;
  if (Array.isArray(scale[0])) {
    const pts = scale;
    if (u <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) {
      const [t0, v0] = pts[i - 1], [t1, v1] = pts[i];
      if (u <= t1) return t1 > t0 ? v0 + (v1 - v0) * (u - t0) / (t1 - t0) : v1;
    }
    return pts[pts.length - 1][1];
  }
  const f = max > min ? Math.max(0, Math.min(1, (u - min) / (max - min))) : 1;
  return scale[0] + (scale[scale.length - 1] - scale[0]) * f;
}
// Resultado de una SUELTA: frac (0–1), perfect (en la ventana, forzada o siempre perfecta)
// y los multiplicadores del perfil respecto a su base (coef/radio/alcance de la escala).
// La suelta perfecta suma perfectPct al saco ADITIVO (no es un multiplicador [×]).
export function chargeRelease(ch, u, { def = null, forcePerfect = false, perfectAlways = false } = {}) {
  const min = ch?.min || 0, max = ch?.max || 1;
  const uu = Math.max(min, Math.min(max, u || 0));
  const frac = max > min ? (uu - min) / (max - min) : 1;
  const [a, b] = ch?.perfect || [max, max];
  // perfectAlways (Calma Absoluta): perfecto desde media carga
  const perfect = !!forcePerfect || (uu >= a - 1e-9 && uu <= b + 1e-9) || (!!perfectAlways && frac >= 0.5 - 1e-9);
  const ratio = (key, base) => {
    const v = chargeCoefAt(ch?.scale?.[key], uu, min, max);
    return v == null ? 1 : (base > 0 ? v / base : 1);
  };
  return {
    u: uu, frac, perfect,
    coefMul: ratio('coef', def?.coef || 0),
    radiusMul: ratio('radius', def?.radius || 0),
    rangeMul: ratio('range', def?.range || 0),
    addPct: perfect ? (ch?.perfectPct || 0) : 0,
    full: frac >= 1 - 1e-9,
  };
}

// ---------- DESPLAZAR (Paso 2, §3.6) ----------
// Rendimientos decrecientes propios de atraer/empujar: +add por aplicación, decaen decay/s,
// inmune con ≥ 0,9 (como el control duro, pero más suaves: un giro que atrae cada tic).
export const DISPLACE_DR = Object.freeze({ add: 0.1, decay: 0.25 });
// a los jefes no se les mueve: el desplazamiento llena Quebranto (5 por metro = un empuje de 2 m
// lo mismo que STAGGER_CC.knock)
export const STAGGER_PER_DISPLACE_M = 5;
export function staggerFromDisplace(dist, staggerPct = 0) {
  return Math.max(0, dist || 0) * STAGGER_PER_DISPLACE_M * Math.max(0, 1 + (staggerPct || 0) / 100);
}
// a campeones y élites se les mueve menos (×0,6 de la distancia)
export const ELITE_DISPLACE_MUL = 0.6;
export function displaceDist(dist, dr = 0, elite = false) {
  return Math.max(0, dist || 0) * Math.max(0, 1 - (dr || 0)) * (elite ? ELITE_DISPLACE_MUL : 1);
}
// duración de un control con las claves de talento del héroe que lo aplica:
//   ccDurPct  +% a los aturdimientos · freezeDur  +s al Congelado
export function ccDurationWithTalents(kind, dur, tv = null) {
  if (!tv) return dur;
  if (kind === 'stun' && tv.ccDurPct) return dur * Math.max(0, 1 + tv.ccDurPct / 100);
  if (kind === 'freeze' && tv.freezeDur) return dur + tv.freezeDur;
  return dur;
}
// duración de una trampa o un zarzal PROPIOS con tv.fieldDur (+%: Ojo de Trampera); la aplica spawnField
export function fieldDurationWithTalents(dur, tv = null) {
  const pct = tv?.fieldDur || 0;
  return pct ? dur * Math.max(0, 1 + pct / 100) : dur;
}
// probabilidad de crítico condicional por claves tv (se suma al critBonus del golpe):
//   burningCrit   contra enemigos en llamas (Calor Abrasador)
export function condCritPct(tv = {}, c = {}) {
  if (!tv) return 0;
  let a = 0;
  if (c.targetBurning) a += tv.burningCrit || 0;
  return a;
}

// ---------- STAGGER de jefes (Paso 2c.0, §6) ----------
// Barra 0–100 SOLO en jefes/uber/jefes de mundo: el control no los aturde directo,
// suma stagger. A 100 → QUEBRANTADO STAGGER_BREAK_T s (aturdimiento real que
// ignora la resistencia + Vulnerable) y después STAGGER_LOCK_T s bloqueada (gris).
// Por aplicación: aturdir 30 por s nominal · congelar 25 · inmovilizar 15 por s ·
// empujar 10 · interrumpir 20 · ralentizar (≥30 %) 4 por s; y los GOLPES suman
// STAGGER_PER_HP_PCT por cada 1 % de la vida máx. infligido. × (1 + staggerPct/100)
// del héroe (innata de Crionte y Montaraz +25).
export const STAGGER_MAX = 100;
export const STAGGER_BREAK_T = 4;
export const STAGGER_LOCK_T = 15;
export const STAGGER_PER_HP_PCT = 0.5;
export const STAGGER_CC = Object.freeze({ stun: 30, freeze: 25, root: 15, knock: 10, interrupt: 20, slow: 4 });
export const STAGGER_SLOW_MIN_PCT = 30;
export function staggerFromCC(kind, dur = 0, { pct = 0, staggerPct = 0 } = {}) {
  const k = STAGGER_CC[kind] || 0;
  let n = 0;
  if (kind === 'stun' || kind === 'root') n = k * Math.max(0, dur || 0);
  else if (kind === 'slow') n = (pct || 0) >= STAGGER_SLOW_MIN_PCT ? k * Math.max(0, dur || 0) : 0;
  else n = k;
  return n * Math.max(0, 1 + (staggerPct || 0) / 100);
}
export function staggerFromDamage(dealt, maxHP, staggerPct = 0) {
  if (!(dealt > 0) || !(maxHP > 0)) return 0;
  return dealt / maxHP * 100 * STAGGER_PER_HP_PCT * Math.max(0, 1 + (staggerPct || 0) / 100);
}

// ---------- AMENAZA (Paso 2c.0, §6) ----------
// Daño ×1, curación ×0,5 (repartida entre los enemigos en combate), × threatMult
// (Guardián ×3). Cambiar de objetivo exige superar el 110 % (cuerpo a cuerpo) o el
// 130 % (a distancia) de la amenaza del actual; la provocación fija amenaza =
// máx. × TAUNT_THREAT_BONUS.
export const THREAT_HEAL_MULT = 0.5;
export const THREAT_SWITCH = Object.freeze({ melee: 1.10, ranged: 1.30 });
export const TAUNT_THREAT_BONUS = 1.10;
export function threatFromDamage(dealt, threatMult = 1) { return Math.max(0, dealt || 0) * Math.max(0, threatMult || 1); }
export function threatFromHeal(healed, threatMult = 1, enemies = 1) {
  return Math.max(0, healed || 0) * THREAT_HEAL_MULT * Math.max(0, threatMult || 1) / Math.max(1, enemies | 0);
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
  // +s por tipo: tv.burnDur (Quemadura) y tv.bleedDur (Sangrado, Heridas Abiertas)
  const extraS = (tv?.dotDur || 0) + (kind === 'burn' ? (tv?.burnDur || 0) : 0) + (kind === 'bleed' ? (tv?.bleedDur || 0) : 0);
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
// Lo que PARA un bloqueo (fracción del golpe): BLOCK_REDUCTION + blockPower/100 (Escudo
// Alzado, Aguante de Roca), con tope BLOCK_REDUCTION_MAX
export function blockReduction(stats) {
  return Math.max(0, Math.min(BLOCK_REDUCTION_MAX, BLOCK_REDUCTION + (stats?.blockPower || 0) / 100));
}

// Mitiga un golpe entrante. opts: { al, element='phys', rng=Math.random }
// Devuelve { dmg, blocked, armorPct, resPct }.
export function mitigate(amount, stats, opts = {}) {
  const el = opts.element || 'phys';
  const rng = opts.rng || Math.random;
  let d = Math.max(0, amount || 0);
  let blocked = false;
  const blockCh = Math.max(0, Math.min(CAPS.block, stats?.block || 0));
  if (blockCh > 0 && rng() * 100 < blockCh) { d *= 1 - blockReduction(stats); blocked = true; }
  const armorPct = el === 'phys' ? armorReduction(stats?.arm || 0, opts.al || 1) : 0;
  const resPct = el === 'phys' ? 0 : resistance(stats, el);
  d *= (1 - armorPct) * (1 - resPct) * (1 - damageReduction(stats)) * takenMult(stats);
  return { dmg: Math.max(1, Math.round(d)), blocked, armorPct, resPct };
}
// daño recibido EXTRA tras mitigar (stat dmgTakenPct: Temeridad +10 %), Paso 2c.2
export function takenMult(stats) { return Math.max(0, 1 + (stats?.dmgTakenPct || 0) / 100); }
// Daño esperado (sin azar de bloqueo) — para el banco y la UI
export function expectedMitigation(stats, al, element = 'phys') {
  const blockCh = Math.max(0, Math.min(CAPS.block, stats?.block || 0)) / 100;
  const armorPct = element === 'phys' ? armorReduction(stats?.arm || 0, al) : 0;
  const resPct = element === 'phys' ? 0 : resistance(stats, element);
  return (1 - blockCh * blockReduction(stats)) * (1 - armorPct) * (1 - resPct) * (1 - damageReduction(stats)) * takenMult(stats);
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
