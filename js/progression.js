// ============================================================
// PROGRESIÓN DEL HÉROE: experiencia, subida de nivel y sus avisos
// ============================================================
// Paso 2 (E0.3): sale de Player.gainXP (js/entities.js) sin cambiar nada; el método
// Player.gainXP delega aquí (`gainXP(p, amount)`). Dueño en E1: W1 (tope de Nv100, sin
// paragon.points++ ni skillPoints += 1, aviso por pointKindAt y aviso de Paragon abierto;
// docs/paso2-implementacion.md §2 W1).
//   gainXP(p, amount)   suma la XP (con sus multiplicadores), sube los niveles que toquen
//                       y avisa de las habilidades nuevas (p.onSkillsLearned)
//   levelUpAward(p)     puntos y avisos del nivel RECIÉN alcanzado (p.level ya subido)
import { xpForLevel } from './data.js';
import { TALENT_START_LEVEL, talentPointsEarned } from './talents.js';

export function gainXP(p, amount) {
  const knownBefore = new Set(Object.keys(p.skills || {}));
  if (p.xpBoostT > 0) amount = Math.round(amount * 1.5);
  // mutador de Era (p. ej. Era de la Sabiduría: +50% XP)
  const xpMul = p.game?.eraMutatorBonus?.()?.xpMul || 1;
  if (xpMul !== 1) amount = Math.round(amount * xpMul);
  // talentos: +% de experiencia (Maga c13…)
  if (p.stats?.xpPct) amount = Math.round(amount * (1 + p.stats.xpPct / 100));
  p.xp += amount;
  p.records.totalXP = (p.records.totalXP || 0) + amount; // acumulado (resúmenes de corrida)
  p.game.ui.spawnText(p.pos, `+${amount} XP`, 'txt-xp');
  while (p.xp >= xpForLevel(p.level)) {
    p.xp -= xpForLevel(p.level);
    p.level++;
    levelUpAward(p);
    p.recompute();
    p.hp = p.stats.maxHP;
    // los recursos que se GENERAN (Furia) no se rellenan al subir de nivel
    if (p.cls.resource?.start !== 0) p.mp = p.stats.maxMP;
    p.game.sfx('levelup');
    p.game.vibrate([50, 30, 70]);
    p.game.spawnBurst(p.pos, 0xffd24a, 14);
    p.game.ui.levelUpFlash?.(p.level);
    p.game.tip('subir', 'Reparte tus puntos: Personaje (C / 🧍) y Habilidades (T / 📖)');
  }
  p.onSkillsLearned(knownBefore);
}

// puntos y avisos del nivel recién alcanzado (se llama con p.level ya subido, antes de recompute)
export function levelUpAward(p) {
  if (p.level > 20) {
    // tras el nivel 20: puntos Paragon en lugar de atributos/habilidades
    p.paragon.points++;
    p.game.ui.message(`🌟 ¡Nivel ${p.level}! +1 punto Paragon (panel de Personaje)`);
  } else {
    p.statPoints += 5;
    p.skillPoints += 1;
    p.game.ui.message(`⭐ ¡Nivel ${p.level}! +5 atributos, +1 punto de habilidad`);
  }
  // talentos (Paso 2c.0): especialización en Nv10 y 1 punto por nivel hasta el 50
  // (niveles pares → especialización, impares → clase; se CALCULAN, no se guardan)
  if (p.level === TALENT_START_LEVEL)
    p.game.ui.message('🌿 ¡Especializaciones desbloqueadas! Elige la tuya en Talentos (N)', 5000);
  else if (p.level > TALENT_START_LEVEL && talentPointsEarned(p, p.level % 2 ? 'cls' : 'spec') > 0 && p.level <= 50)
    p.game.ui.message(`🌿 +1 punto de talento de ${p.level % 2 ? 'clase' : 'especialización'} (N)`);
}
