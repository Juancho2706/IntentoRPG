// ============================================================
// PROGRESIÓN DEL HÉROE: experiencia, subida de nivel y sus avisos (Nv1–100)
// ============================================================
// Paso 2 (E0.3) sacó gainXP de Player (js/entities.js delega aquí); Paso 2g (E1, W1):
//   · tope de nivel LEVEL_MAX (100, js/talents.js); en el tope la experiencia se acota;
//   · un punto por nivel en UN solo sistema, que se calcula (talents.earnedAt), no se
//     guarda: sin paragon.points++ ni skillPoints += 1 (la forja no usa puntos);
//   · aviso de cada subida según el sistema que da el punto (talents.pointKindAt) y del
//     Paragon (el último punto de especialización al Nv70; el árbol héroe del 71 al 80;
//     el tablero de glifos del 81 al 100). Los atributos (+5) siguen hasta el Nv20.
//   gainXP(p, amount)   suma la XP (con sus multiplicadores), sube los niveles que toquen
//                       y avisa de las habilidades nuevas (p.onSkillsLearned)
//   levelUpAward(p)     puntos y avisos del nivel RECIÉN alcanzado (p.level ya subido)
import { xpForLevel } from './data.js';
import { LEVEL_MAX, TALENT_RULES, PARAGON_OPEN_LEVEL, pointKindAt, heroOpen, earnedAt } from './talents.js';

export const STAT_POINTS_UNTIL = 20; // +5 atributos por nivel hasta el 20

// experiencia máxima guardable en el tope (no hay nivel 101)
export function xpCap() { return xpForLevel(LEVEL_MAX); }

export function gainXP(p, amount) {
  const knownBefore = new Set(Object.keys(p.skills || {}));
  if (p.xpBoostT > 0) amount = Math.round(amount * 1.5);
  // mutador de Era (p. ej. Era de la Sabiduría: +50% XP)
  const xpMul = p.game?.eraMutatorBonus?.()?.xpMul || 1;
  if (xpMul !== 1) amount = Math.round(amount * xpMul);
  // talentos: +% de experiencia
  if (p.stats?.xpPct) amount = Math.round(amount * (1 + p.stats.xpPct / 100));
  p.xp += amount;
  p.records.totalXP = (p.records.totalXP || 0) + amount; // acumulado (resúmenes de corrida)
  p.game.ui.spawnText(p.pos, `+${amount} XP`, 'txt-xp');
  while (p.level < LEVEL_MAX && p.xp >= xpForLevel(p.level)) {
    p.xp -= xpForLevel(p.level);
    p.level++;
    levelUpAward(p);
    p.recompute();
    p.hp = p.stats.maxHP;
    // los recursos que se GENERAN (Furia) no se rellenan al subir de nivel
    if (p.cls.resource?.start !== 0) p.mp = p.stats.maxMP;
    p.game.sfx('levelup');
    p.game.vibrate?.([50, 30, 70]);
    p.game.spawnBurst?.(p.pos, 0xffd24a, 14);
    p.game.ui.levelUpFlash?.(p.level);
    p.game.tip?.('subir', 'Cada nivel da un punto: Talentos (N) y, hasta el 20, atributos (C)');
  }
  if (p.level >= LEVEL_MAX) p.xp = Math.min(p.xp, xpCap());
  p.onSkillsLearned(knownBefore);
}

// texto del aviso del nivel L (lo usa levelUpAward; puro para los tests)
export function levelUpText(p, L = p.level) {
  const kind = pointKindAt(L);
  if (L === TALENT_RULES.specAt) return '🌿 ¡Especializaciones desbloqueadas! Elige la tuya en Talentos (N)';
  if (kind === 'spec') {
    if (L === TALENT_RULES.specLast) return `🌿 Nivel ${L}: último punto de especialización. Gasta los ${TALENT_RULES.pts.spec} para abrir el Paragon (N)`;
    return `🌿 Nivel ${L}: +1 punto de especialización (N)`;
  }
  if (kind === 'cls') return `🌿 Nivel ${L}: +1 punto de clase (N)`;
  if (kind === 'hero') return heroOpen(p)
    ? `🌟 Nivel ${L}: +1 punto de Paragon (N)`
    : `🌟 Nivel ${L}: +1 punto de Paragon. Gasta tus ${TALENT_RULES.pts.spec} puntos de especialización para abrirlo (N)`;
  if (kind === 'board') return L === PARAGON_OPEN_LEVEL
    ? `🔷 Nivel ${L}: ¡tablero de glifos abierto! ${TALENT_RULES.pts.board} puntos hasta el nivel ${LEVEL_MAX} (P)`
    : `🔷 Nivel ${L}: +1 punto del tablero de glifos (${earnedAt('board', L)}/${TALENT_RULES.pts.board})`;
  return null;
}

// puntos y avisos del nivel recién alcanzado (se llama con p.level ya subido, antes de recompute)
export function levelUpAward(p) {
  const msgs = [];
  if (p.level <= STAT_POINTS_UNTIL) { p.statPoints += 5; msgs.push(`⭐ ¡Nivel ${p.level}! +5 atributos`); }
  const t = levelUpText(p, p.level);
  if (t) msgs.push(t);
  if (!msgs.length) msgs.push(`⭐ ¡Nivel ${p.level}!`);
  for (const m of msgs) p.game.ui.message(m, 4000);
}
