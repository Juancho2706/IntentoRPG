// ============================================================
// BANCO DE LA FORJA — Paso 2 · E4 (B1): las 51 piezas por clase contra F1–F9 (2f §2.6)
// ============================================================
// Cada habilidad con forja (17 por clase) se mide con el héroe típico de Nv50 de la especialización
// que la lleva (su kit, su barra de SPEC_BAR o la recomendada de la forja; si no está en ninguna
// barra, en la ranura que le toca, quitando la de la barra; el básico, en la especialización en que
// más daño hace), la build por defecto y la forja recomendada en el resto. Configuraciones:
//   sin      la habilidad fuera de la barra (APORTE en CONTROL, TTD+ y APOYO = métrica con ella − sin
//            ella; en UNI y ÁREA×5 el aporte es su daño propio: su id, sus pasos y los poderes de sus
//            piezas)
//   base     sin Mejora ni variante (la Mejora apagada en una copia de la clase)
//   mejora   base + Mejora (Nv ≥ req+3, automática): la referencia «sin variante» de F8
//   i / ii   Mejora + variante I / II
// Escenarios (los de 2e §7.1): UNI · ÁREA×5 · CONTROL · TTD+ (sin tope: se extrapola) · APOYO
// (puntuación = DPS de un aliado + 0,1 × curación en % de vida/s). El escenario DECLARADO de una
// variante es su papel: UNI → UNI, AREA → ÁREA×5, CTRL → CONTROL, AGU → TTD+, APO → APOYO; MOV no
// tiene escenario de banco. El escenario PRINCIPAL de la habilidad (F3): TTD+ si es de defensa;
// CONTROL si controla (tag cc); ÁREA×5 si es de área (área, cono, línea, zona, trampa); si no, UNI;
// la movilidad no tiene. Una defensa medida se usa al enfriarse en todos los escenarios.
//
// REGLAS (2f §2.6):
//  F1 cada variante gana a su hermana en su escenario por ≥ 8 % del aporte de la habilidad
//  F2 ninguna gana a su hermana en todos los escenarios medidos (UNI, ÁREA×5 y los declarados; no se
//     afirma contra una hermana de MOVILIDAD) y ninguna sube la rotación UNI > +20 % sobre la Mejora
//  F3 la Mejora da +5–15 % del aporte de la habilidad en su escenario principal (nunca negativa)
//  F4 una variante de daño (UNI/AREA) no da Vulnerable ni Debilidad a todo el grupo: en APOYO no sube
//     el DPS de los aliados más de 2 puntos sobre la Mejora
//  F5 una variante no sube la generación de recurso de la rotación (UNI) más de un +25 %
//  F6 una pieza que deja una zona por lanzamiento lleva enfriamiento ≥ 3 s o zoneMax 1 (estático)
//  F7 cada Mejora o variante cambia el perfil de resolveSkill, declara un poder o comportamiento
//     registrado o cambia el banco en ≥ 1 %
//  F8 alguna variante supera a la Mejora sola en su escenario
//  F9 2b.2: con cada pieza de una definitiva, la definitiva aporta el 12–22 % de UNI; con cada
//     pieza de un básico, «solo básico» ≤ 0,6× la rotación. (El intercambio de la ranura 2 de 2e no
//     sigue vigente: la barra es la de SPEC_BAR.)
// Lo que hoy no se cumple está en PENDING_FORGE (regla, valor, objetivo, dueño): sale verde solo si
// los fallos de la semilla 1 coinciden EXACTAMENTE con esa lista.
// Uso: `node tests/forge-bench.mjs` (afirma; 1 semilla) · `--report` (matriz completa: los cinco
//      escenarios en todas las piezas) · `--seeds N` (medianas) · `--json <ruta>` · `--class maga`
// ============================================================
import { writeFileSync } from 'fs';
import { CLASSES, SKILL_FORGE, SPEC_BAR, FORGE_RECO } from '../js/data.js';
import { skillSlots, forgeLevels } from '../js/skill-defs.js';
import { resolveSkill } from '../js/skill-resolve.js';
import { POWER_HOOKS, SKILL_BEHAVIORS } from '../js/powers.js';
import * as CM from '../js/combat-math.js';
import {
  buildHero, refEnemies, simulateUni, areaSim, controlSim, ttdPlusSim, apoyoSim, ultKind,
  SPECS, UNI_T, UNI_LIFE, med, f1, pct, sgn,
} from './helpers/bench-core.mjs';
// los héroes de los bancos de E4 usan también la movilidad (1) de su barra
const hero = (c, L, gear, o = {}) => buildHero(c, L, gear, { move: true, ...o });

const ARGV = process.argv.slice(2);
const REPORT = ARGV.includes('--report');
const argOf = k => { const i = ARGV.indexOf(k); return i >= 0 ? ARGV[i + 1] : null; };
export const LEVEL = 50;
export const ROLE_SC = { UNI: 'uni', AREA: 'area', CTRL: 'ctl', AGU: 'ttdp', APO: 'apoyo', MOV: null };
export const SCENARIOS = ['uni', 'area', 'ctl', 'ttdp', 'apoyo'];
export const RULES = { f1: 0.08, f2: 0.20, f3: [0.05, 0.15], f4: 0.02, f5: 0.25, f7: 0.01, ult: [0.12, 0.22], basicOnly: 0.6 };
// «gana» con un margen de ruido (la semilla mueve un ±1 % las métricas de daño)
const WIN_EPS = 0.005;

// ---------------- PENDIENTES DE CALIBRACIÓN (E4b) ----------------
// regla (clave estable), lo medido, el objetivo y el dueño (KA-<clase>: catálogo y forja)
export const PENDING_FORGE = [
  { key: 'F3:g_tajo', medido: 0.211, objetivo: [0.05, 0.15], dueño: 'KA-guerrero', regla: 'F3 guerrero g_tajo (Filo Ancho): la Mejora da +21% del aporte en area (+5–15 %)' },
  { key: 'F8:embestida', medido: null, objetivo: null, dueño: 'KA-guerrero', regla: 'F8 guerrero embestida: ninguna variante supera a la Mejora sola en su escenario' },
  { key: 'F3:g_piel', medido: 0, objetivo: [0.05, 0.15], dueño: 'KA-guerrero', regla: 'F3 guerrero g_piel (Acero Templado): la Mejora da +0% del aporte en ttdp (+5–15 %)' },
  { key: 'F2b:g_lanza_ii', medido: 0.549, objetivo: 0.2, dueño: 'KA-guerrero', regla: 'F2 guerrero g_lanza_ii (Jabalinas): sube la rotación UNI +55% sobre la Mejora (≤ +20 %)' },
  { key: 'F3:g_lanza', medido: 0, objetivo: [0.05, 0.15], dueño: 'KA-guerrero', regla: 'F3 guerrero g_lanza (Punta de Arpón): la Mejora da +0% del aporte en uni (+5–15 %)' },
  { key: 'F3:g_remolino', medido: 0, objetivo: [0.05, 0.15], dueño: 'KA-guerrero', regla: 'F3 guerrero g_remolino (Giro Firme): la Mejora da +0% del aporte en area (+5–15 %)' },
  { key: 'F1:g_rajar_ii', medido: -0.277, objetivo: 0.08, dueño: 'KA-guerrero', regla: 'F1 guerrero g_rajar_ii (Molino, AREA): gana a su hermana por -28% del aporte en area (≥ 8 %)' },
  { key: 'F3:g_rajar', medido: -0.047, objetivo: [0.05, 0.15], dueño: 'KA-guerrero', regla: 'F3 guerrero g_rajar (Filo Encadenado): la Mejora da -5% del aporte en uni (+5–15 %)' },
  { key: 'F1:g_u_furia_i', medido: -0.367, objetivo: 0.08, dueño: 'KA-guerrero', regla: 'F1 guerrero g_u_furia_i (Sed Voraz, AGU): gana a su hermana por -37% del aporte en ttdp (≥ 8 %)' },
  { key: 'F1:g_u_furia_ii', medido: null, objetivo: 0.08, dueño: 'KA-guerrero', regla: 'F1 guerrero g_u_furia_ii (Frenesí, UNI): no aporta nada en uni (≥ 8 %)' },
  { key: 'F8:g_u_furia', medido: null, objetivo: null, dueño: 'KA-guerrero', regla: 'F8 guerrero g_u_furia: ninguna variante supera a la Mejora sola en su escenario' },
  { key: 'F3:g_u_furia', medido: null, objetivo: [0.05, 0.15], dueño: 'KA-guerrero', regla: 'F3 guerrero g_u_furia (Sin Freno): la Mejora da — (la habilidad no aporta en uni) del aporte en uni (+5–15 %)' },
  { key: 'F9:ult:g_u_furia:mejora', medido: 0, objetivo: [0.12, 0.22], dueño: 'KA-guerrero', regla: 'F9 guerrero g_u_furia:mejora: la definitiva aporta 0% de UNI (12–22 %)' },
  { key: 'F9:ult:g_u_furia_i', medido: 0, objetivo: [0.12, 0.22], dueño: 'KA-guerrero', regla: 'F9 guerrero g_u_furia_i: la definitiva aporta 0% de UNI (12–22 %)' },
  { key: 'F9:ult:g_u_furia_ii', medido: 0, objetivo: [0.12, 0.22], dueño: 'KA-guerrero', regla: 'F9 guerrero g_u_furia_ii: la definitiva aporta 0% de UNI (12–22 %)' },
  { key: 'F1:g_guardia_ii', medido: null, objetivo: 0.08, dueño: 'KA-guerrero', regla: 'F1 guerrero g_guardia_ii (Guardia Opresiva, CTRL): no aporta nada en ctl (≥ 8 %)' },
  { key: 'F3:g_guardia', medido: -1.683, objetivo: [0.05, 0.15], dueño: 'KA-guerrero', regla: 'F3 guerrero g_guardia (Guardia Ligera): la Mejora da -168% del aporte en uni (+5–15 %)' },
  { key: 'F2b:g_carga_escudo_ii', medido: 0.232, objetivo: 0.2, dueño: 'KA-guerrero', regla: 'F2 guerrero g_carga_escudo_ii (Carga Veloz): sube la rotación UNI +23% sobre la Mejora (≤ +20 %)' },
  { key: 'F1:terremoto_ii', medido: -1.974, objetivo: 0.08, dueño: 'KA-guerrero', regla: 'F1 guerrero terremoto_ii (Falla, AREA): gana a su hermana por -197% del aporte en area (≥ 8 %)' },
  { key: 'F4:terremoto_ii', medido: 0.022, objetivo: 0.02, dueño: 'KA-guerrero', regla: 'F4 guerrero terremoto_ii (Falla): da +2% del DPS de un aliado al grupo (variante de daño; ≤ 2 puntos)' },
  { key: 'F1:g_u_ciudadela_ii', medido: 0, objetivo: 0.08, dueño: 'KA-guerrero', regla: 'F1 guerrero g_u_ciudadela_ii (Empalizada, AREA): gana a su hermana por 0% del aporte en area (≥ 8 %)' },
  { key: 'F8:g_u_ciudadela', medido: null, objetivo: null, dueño: 'KA-guerrero', regla: 'F8 guerrero g_u_ciudadela: ninguna variante supera a la Mejora sola en su escenario' },
  { key: 'F3:g_u_ciudadela', medido: null, objetivo: [0.05, 0.15], dueño: 'KA-guerrero', regla: 'F3 guerrero g_u_ciudadela (Muros Altos): la Mejora da — (la habilidad no aporta en uni) del aporte en uni (+5–15 %)' },
  { key: 'F1:g_juicio_i', medido: -1.173, objetivo: 0.08, dueño: 'KA-guerrero', regla: 'F1 guerrero g_juicio_i (Sentencia, UNI): gana a su hermana por -117% del aporte en uni (≥ 8 %)' },
  { key: 'F4:g_juicio_i', medido: 0.29, objetivo: 0.02, dueño: 'KA-guerrero', regla: 'F4 guerrero g_juicio_i (Sentencia): da +29% del DPS de un aliado al grupo (variante de daño; ≤ 2 puntos)' },
  { key: 'F3:g_juicio', medido: 0, objetivo: [0.05, 0.15], dueño: 'KA-guerrero', regla: 'F3 guerrero g_juicio (Juicio Amplio): la Mejora da +0% del aporte en uni (+5–15 %)' },
  { key: 'F1:g_sendero_i', medido: null, objetivo: 0.08, dueño: 'KA-guerrero', regla: 'F1 guerrero g_sendero_i (Escolta de Luz, APO): no aporta nada en apoyo (≥ 8 %)' },
  { key: 'F8:g_sendero', medido: null, objetivo: null, dueño: 'KA-guerrero', regla: 'F8 guerrero g_sendero: ninguna variante supera a la Mejora sola en su escenario' },
  { key: 'F1:g_martillo_i', medido: 0.072, objetivo: 0.08, dueño: 'KA-guerrero', regla: 'F1 guerrero g_martillo_i (Martillo Arrojado, UNI): gana a su hermana por 7% del aporte en uni (≥ 8 %)' },
  { key: 'F3:g_u_cataclismo', medido: 0.009, objetivo: [0.05, 0.15], dueño: 'KA-guerrero', regla: 'F3 guerrero g_u_cataclismo (Columna Ancha): la Mejora da +1% del aporte en area (+5–15 %)' },
  { key: 'F9:ult:g_u_cataclismo:mejora', medido: 0.03, objetivo: [0.12, 0.22], dueño: 'KA-guerrero', regla: 'F9 guerrero g_u_cataclismo:mejora: la definitiva aporta 3% de UNI (12–22 %)' },
  { key: 'F9:ult:g_u_cataclismo_i', medido: 0.043, objetivo: [0.12, 0.22], dueño: 'KA-guerrero', regla: 'F9 guerrero g_u_cataclismo_i: la definitiva aporta 4% de UNI (12–22 %)' },
  { key: 'F9:ult:g_u_cataclismo_ii', medido: 0.021, objetivo: [0.12, 0.22], dueño: 'KA-guerrero', regla: 'F9 guerrero g_u_cataclismo_ii: la definitiva aporta 2% de UNI (12–22 %)' },
  { key: 'F1:m_dardo_ii', medido: -0.076, objetivo: 0.08, dueño: 'KA-maga', regla: 'F1 maga m_dardo_ii (Saeta Gélida, CTRL): gana a su hermana por -8% del aporte en ctl (≥ 8 %)' },
  { key: 'F3:m_dardo', medido: -0.033, objetivo: [0.05, 0.15], dueño: 'KA-maga', regla: 'F3 maga m_dardo (Dardo Veloz): la Mejora da -3% del aporte en uni (+5–15 %)' },
  { key: 'F1:bola_fuego_ii', medido: -0.101, objetivo: 0.08, dueño: 'KA-maga', regla: 'F1 maga bola_fuego_ii (Racimo, AREA): gana a su hermana por -10% del aporte en area (≥ 8 %)' },
  { key: 'F3:bola_fuego', medido: 0.329, objetivo: [0.05, 0.15], dueño: 'KA-maga', regla: 'F3 maga bola_fuego (Núcleo Inestable): la Mejora da +33% del aporte en area (+5–15 %)' },
  { key: 'F3:m_barrera', medido: 0, objetivo: [0.05, 0.15], dueño: 'KA-maga', regla: 'F3 maga m_barrera (Burbuja Estable): la Mejora da +0% del aporte en ttdp (+5–15 %)' },
  { key: 'F3:nova_hielo', medido: -0.022, objetivo: [0.05, 0.15], dueño: 'KA-maga', regla: 'F3 maga nova_hielo (Escarcha Profunda): la Mejora da -2% del aporte en ctl (+5–15 %)' },
  { key: 'F1:p_llamarada_i', medido: 0.005, objetivo: 0.08, dueño: 'KA-maga', regla: 'F1 maga p_llamarada_i (Lanza de Llamas, UNI): gana a su hermana por 0% del aporte en uni (≥ 8 %)' },
  { key: 'F3:p_llamarada', medido: 0.158, objetivo: [0.05, 0.15], dueño: 'KA-maga', regla: 'F3 maga p_llamarada (Llama Ancha): la Mejora da +16% del aporte en area (+5–15 %)' },
  { key: 'F1:meteoro_ii', medido: -2.322, objetivo: 0.08, dueño: 'KA-maga', regla: 'F1 maga meteoro_ii (Meteoro Ancestral, UNI): gana a su hermana por -232% del aporte en uni (≥ 8 %)' },
  { key: 'F2b:meteoro_i', medido: 0.503, objetivo: 0.2, dueño: 'KA-maga', regla: 'F2 maga meteoro_i (Lluvia de Meteoritos): sube la rotación UNI +50% sobre la Mejora (≤ +20 %)' },
  { key: 'F4:meteoro_ii', medido: 0.053, objetivo: 0.02, dueño: 'KA-maga', regla: 'F4 maga meteoro_ii (Meteoro Ancestral): da +5% del DPS de un aliado al grupo (variante de daño; ≤ 2 puntos)' },
  { key: 'F1:m_u_supernova_i', medido: -0.139, objetivo: 0.08, dueño: 'KA-maga', regla: 'F1 maga m_u_supernova_i (Sol Errante, AREA): gana a su hermana por -14% del aporte en area (≥ 8 %)' },
  { key: 'F1:m_u_supernova_ii', medido: -0.605, objetivo: 0.08, dueño: 'KA-maga', regla: 'F1 maga m_u_supernova_ii (Colapso, UNI): gana a su hermana por -60% del aporte en uni (≥ 8 %)' },
  { key: 'F8:m_u_supernova', medido: null, objetivo: null, dueño: 'KA-maga', regla: 'F8 maga m_u_supernova: ninguna variante supera a la Mejora sola en su escenario' },
  { key: 'F9:ult:m_u_supernova:mejora', medido: 0.063, objetivo: [0.12, 0.22], dueño: 'KA-maga', regla: 'F9 maga m_u_supernova:mejora: la definitiva aporta 6% de UNI (12–22 %)' },
  { key: 'F9:ult:m_u_supernova_i', medido: 0.067, objetivo: [0.12, 0.22], dueño: 'KA-maga', regla: 'F9 maga m_u_supernova_i: la definitiva aporta 7% de UNI (12–22 %)' },
  { key: 'F9:ult:m_u_supernova_ii', medido: 0.044, objetivo: [0.12, 0.22], dueño: 'KA-maga', regla: 'F9 maga m_u_supernova_ii: la definitiva aporta 4% de UNI (12–22 %)' },
  { key: 'F1:k_prision_i', medido: -0.089, objetivo: 0.08, dueño: 'KA-maga', regla: 'F1 maga k_prision_i (Celda Lejana, UNI): gana a su hermana por -9% del aporte en uni (≥ 8 %)' },
  { key: 'F8:k_prision', medido: null, objetivo: null, dueño: 'KA-maga', regla: 'F8 maga k_prision: ninguna variante supera a la Mejora sola en su escenario' },
  { key: 'F2a:k_prision_ii', medido: null, objetivo: null, dueño: 'KA-maga', regla: 'F2 maga k_prision_ii (Muralla de Hielo): gana a su hermana en todos los escenarios (uni, area, ctl)' },
  { key: 'F3:k_prision', medido: null, objetivo: [0.05, 0.15], dueño: 'KA-maga', regla: 'F3 maga k_prision (Celda Amplia): la Mejora da — (la habilidad no aporta en ctl) del aporte en ctl (+5–15 %)' },
  { key: 'F1:m_paso_escarcha_ii', medido: null, objetivo: 0.08, dueño: 'KA-maga', regla: 'F1 maga m_paso_escarcha_ii (Prisión Fugaz, CTRL): no aporta nada en ctl (≥ 8 %)' },
  { key: 'F8:m_paso_escarcha', medido: null, objetivo: null, dueño: 'KA-maga', regla: 'F8 maga m_paso_escarcha: ninguna variante supera a la Mejora sola en su escenario' },
  { key: 'F1:m_u_tormenta_ii', medido: -0.822, objetivo: 0.08, dueño: 'KA-maga', regla: 'F1 maga m_u_tormenta_ii (Granizo, UNI): gana a su hermana por -82% del aporte en uni (≥ 8 %)' },
  { key: 'F3:m_u_tormenta', medido: 0, objetivo: [0.05, 0.15], dueño: 'KA-maga', regla: 'F3 maga m_u_tormenta (Ojo Tranquilo): la Mejora da +0% del aporte en area (+5–15 %)' },
  { key: 'F9:ult:m_u_tormenta:mejora', medido: 0.119, objetivo: [0.12, 0.22], dueño: 'KA-maga', regla: 'F9 maga m_u_tormenta:mejora: la definitiva aporta 12% de UNI (12–22 %)' },
  { key: 'F9:ult:m_u_tormenta_i', medido: 0.119, objetivo: [0.12, 0.22], dueño: 'KA-maga', regla: 'F9 maga m_u_tormenta_i: la definitiva aporta 12% de UNI (12–22 %)' },
  { key: 'F9:ult:m_u_tormenta_ii', medido: 0.071, objetivo: [0.12, 0.22], dueño: 'KA-maga', regla: 'F9 maga m_u_tormenta_ii: la definitiva aporta 7% de UNI (12–22 %)' },
  { key: 'F1:a_orbe_i', medido: -2.115, objetivo: 0.08, dueño: 'KA-maga', regla: 'F1 maga a_orbe_i (Orbe Veloz, UNI): gana a su hermana por -212% del aporte en uni (≥ 8 %)' },
  { key: 'F8:a_orbe', medido: null, objetivo: null, dueño: 'KA-maga', regla: 'F8 maga a_orbe: ninguna variante supera a la Mejora sola en su escenario' },
  { key: 'F3:a_orbe', medido: 0, objetivo: [0.05, 0.15], dueño: 'KA-maga', regla: 'F3 maga a_orbe (Orbe Grande): la Mejora da +0% del aporte en uni (+5–15 %)' },
  { key: 'F5:a_sello_i', medido: 0.365, objetivo: 0.25, dueño: 'KA-maga', regla: 'F5 maga a_sello_i (Sello Ofensivo): sube la generación de recurso +37% (≤ +25 %)' },
  { key: 'F3:a_sello', medido: 0.541, objetivo: [0.05, 0.15], dueño: 'KA-maga', regla: 'F3 maga a_sello (Sello Firme): la Mejora da +54% del aporte en uni (+5–15 %)' },
  { key: 'F1:rayo_ii', medido: -0.291, objetivo: 0.08, dueño: 'KA-maga', regla: 'F1 maga rayo_ii (Haz Concentrado, UNI): gana a su hermana por -29% del aporte en uni (≥ 8 %)' },
  { key: 'F3:rayo', medido: 0, objetivo: [0.05, 0.15], dueño: 'KA-maga', regla: 'F3 maga rayo (Rayo Largo): la Mejora da +0% del aporte en area (+5–15 %)' },
  { key: 'F3:m_u_desgarro', medido: 0, objetivo: [0.05, 0.15], dueño: 'KA-maga', regla: 'F3 maga m_u_desgarro (Desgarro Estable): la Mejora da +0% del aporte en uni (+5–15 %)' },
  { key: 'F9:ult:m_u_desgarro:mejora', medido: 0.064, objetivo: [0.12, 0.22], dueño: 'KA-maga', regla: 'F9 maga m_u_desgarro:mejora: la definitiva aporta 6% de UNI (12–22 %)' },
  { key: 'F9:ult:m_u_desgarro_i', medido: 0.038, objetivo: [0.12, 0.22], dueño: 'KA-maga', regla: 'F9 maga m_u_desgarro_i: la definitiva aporta 4% de UNI (12–22 %)' },
  { key: 'F9:ult:m_u_desgarro_ii', medido: 0.057, objetivo: [0.12, 0.22], dueño: 'KA-maga', regla: 'F9 maga m_u_desgarro_ii: la definitiva aporta 6% de UNI (12–22 %)' },
  { key: 'F1:a_disparo_i', medido: -0.957, objetivo: 0.08, dueño: 'KA-arquera', regla: 'F1 arquera a_disparo_i (Disparo Disperso, AREA): gana a su hermana por -96% del aporte en area (≥ 8 %)' },
  { key: 'F3:a_disparo', medido: 0.028, objetivo: [0.05, 0.15], dueño: 'KA-arquera', regla: 'F3 arquera a_disparo (Mano Rápida): la Mejora da +3% del aporte en uni (+5–15 %)' },
  { key: 'F1:flecha_perforante_i', medido: -0.091, objetivo: 0.08, dueño: 'KA-arquera', regla: 'F1 arquera flecha_perforante_i (Flecha Explosiva, AREA): gana a su hermana por -9% del aporte en area (≥ 8 %)' },
  { key: 'F3:flecha_perforante', medido: -0.01, objetivo: [0.05, 0.15], dueño: 'KA-arquera', regla: 'F3 arquera flecha_perforante (Astil de Fresno): la Mejora da -1% del aporte en uni (+5–15 %)' },
  { key: 'F3:a_humo', medido: 0, objetivo: [0.05, 0.15], dueño: 'KA-arquera', regla: 'F3 arquera a_humo (Humo Espeso): la Mejora da +0% del aporte en ttdp (+5–15 %)' },
  { key: 'F3:lluvia_flechas', medido: 0.46, objetivo: [0.05, 0.15], dueño: 'KA-arquera', regla: 'F3 arquera lluvia_flechas (Cielo Plomizo): la Mejora da +46% del aporte en area (+5–15 %)' },
  { key: 'F3:a_t_andanada', medido: -0.209, objetivo: [0.05, 0.15], dueño: 'KA-arquera', regla: 'F3 arquera a_t_andanada (Arco Ancho): la Mejora da -21% del aporte en area (+5–15 %)' },
  { key: 'F1:a_v_carrera_i', medido: 0.03, objetivo: 0.08, dueño: 'KA-arquera', regla: 'F1 arquera a_v_carrera_i (Carrera Certera, UNI): gana a su hermana por 3% del aporte en uni (≥ 8 %)' },
  { key: 'F8:a_v_carrera', medido: null, objetivo: null, dueño: 'KA-arquera', regla: 'F8 arquera a_v_carrera: ninguna variante supera a la Mejora sola en su escenario' },
  { key: 'F1:flecha_multiple_i', medido: -3.303, objetivo: 0.08, dueño: 'KA-arquera', regla: 'F1 arquera flecha_multiple_i (Abanico Abierto, AREA): gana a su hermana por -330% del aporte en area (≥ 8 %)' },
  { key: 'F2a:flecha_multiple_ii', medido: null, objetivo: null, dueño: 'KA-arquera', regla: 'F2 arquera flecha_multiple_ii (Haz Cerrado): gana a su hermana en todos los escenarios (uni, area, apoyo)' },
  { key: 'F2b:flecha_multiple_ii', medido: 0.455, objetivo: 0.2, dueño: 'KA-arquera', regla: 'F2 arquera flecha_multiple_ii (Haz Cerrado): sube la rotación UNI +46% sobre la Mejora (≤ +20 %)' },
  { key: 'F3:a_u_diluvio', medido: 1.248, objetivo: [0.05, 0.15], dueño: 'KA-arquera', regla: 'F3 arquera a_u_diluvio (Nube Ancha): la Mejora da +125% del aporte en area (+5–15 %)' },
  { key: 'F9:ult:a_u_diluvio_ii', medido: 0.221, objetivo: [0.12, 0.22], dueño: 'KA-arquera', regla: 'F9 arquera a_u_diluvio_ii: la definitiva aporta 22% de UNI (12–22 %)' },
  { key: 'F1:a_t_apuntado_i', medido: 0.041, objetivo: 0.08, dueño: 'KA-arquera', regla: 'F1 arquera a_t_apuntado_i (Tres Saetas, AREA): gana a su hermana por 4% del aporte en area (≥ 8 %)' },
  { key: 'F3:a_t_apuntado', medido: -0.064, objetivo: [0.05, 0.15], dueño: 'KA-arquera', regla: 'F3 arquera a_t_apuntado (Tensado Rápido): la Mejora da -6% del aporte en uni (+5–15 %)' },
  { key: 'F3:a_f_rodilla', medido: -0.083, objetivo: [0.05, 0.15], dueño: 'KA-arquera', regla: 'F3 arquera a_f_rodilla (Rodilla Firme): la Mejora da -8% del aporte en uni (+5–15 %)' },
  { key: 'F1:a_f_rastreador_i', medido: -0.005, objetivo: 0.08, dueño: 'KA-arquera', regla: 'F1 arquera a_f_rastreador_i (Rastreo Múltiple, AREA): gana a su hermana por -1% del aporte en area (≥ 8 %)' },
  { key: 'F3:a_f_rastreador', medido: 0, objetivo: [0.05, 0.15], dueño: 'KA-arquera', regla: 'F3 arquera a_f_rastreador (Marca Duradera): la Mejora da +0% del aporte en uni (+5–15 %)' },
  { key: 'F1:a_u_celeste_i', medido: -2.241, objetivo: 0.08, dueño: 'KA-arquera', regla: 'F1 arquera a_u_celeste_i (Lluvia Estelar, AREA): gana a su hermana por -224% del aporte en area (≥ 8 %)' },
  { key: 'F3:a_u_celeste', medido: 0, objetivo: [0.05, 0.15], dueño: 'KA-arquera', regla: 'F3 arquera a_u_celeste (Cielo Abierto): la Mejora da +0% del aporte en uni (+5–15 %)' },
  { key: 'F9:ult:a_u_celeste_i', medido: 0.062, objetivo: [0.12, 0.22], dueño: 'KA-arquera', regla: 'F9 arquera a_u_celeste_i: la definitiva aporta 6% de UNI (12–22 %)' },
  { key: 'F9:ult:a_u_celeste_ii', medido: 0.119, objetivo: [0.12, 0.22], dueño: 'KA-arquera', regla: 'F9 arquera a_u_celeste_ii: la definitiva aporta 12% de UNI (12–22 %)' },
  { key: 'F3:a_t_cepo', medido: 0.191, objetivo: [0.05, 0.15], dueño: 'KA-arquera', regla: 'F3 arquera a_t_cepo (Muelles Firmes): la Mejora da +19% del aporte en ctl (+5–15 %)' },
  { key: 'F3:a_m_detonante', medido: 0.312, objetivo: [0.05, 0.15], dueño: 'KA-arquera', regla: 'F3 arquera a_m_detonante (Pólvora Fina): la Mejora da +31% del aporte en area (+5–15 %)' },
  { key: 'F3:a_u_zarzas', medido: 0.369, objetivo: [0.05, 0.15], dueño: 'KA-arquera', regla: 'F3 arquera a_u_zarzas (Espinas Duraderas): la Mejora da +37% del aporte en ctl (+5–15 %)' },
  { key: 'F9:ult:a_u_zarzas_i', medido: 0.221, objetivo: [0.12, 0.22], dueño: 'KA-arquera', regla: 'F9 arquera a_u_zarzas_i: la definitiva aporta 22% de UNI (12–22 %)' },
];

// ---------------- límites del banco (explícitos) ----------------
// piezas cuyo efecto el escenario de su papel NO reproduce: F1 no se afirma (se informa). Cada
// entrada dice por qué; si el banco aprende a medirlo, se quita de aquí
export const BENCH_LIMITS = {
  g_lanza_i: 'atrae (4 m): CONTROL solo cuenta aturdir, congelar, miedo, inmovilizar y ralentizar ≥ 30 %',
  g_remolino_ii: 'atrae (1 m por tic): CONTROL no cuenta desplazamientos',
  a_m_detonante_ii: 'atrae a la trampa: CONTROL no cuenta desplazamientos',
  m_estela_ignea_ii: 'muro que bloquea el paso: la manada del banco no choca con muros',
  k_prision_ii: 'muro de hielo que bloquea el paso: la manada del banco no choca con muros',
  m_barrera_i: 'congela a quien rompe la Barrera: en CONTROL los enemigos no te pegan',
  g_piel_i: 'espinas al recibir golpes: en ÁREA×5 los enemigos no te pegan',
  a_u_zarzas_ii: 'señuelo que atrae a los enemigos: en TTD+ la manada no se mueve',
  a_v_carrera_ii: 'fallo de proyectiles: la manada de TTD+ pega cuerpo a cuerpo',
};

// ---------------- dónde se mide cada habilidad ----------------
// especialización: la de su kit, la que la lleva en la barra o la que la recomienda en la forja; ranura:
// la suya en esa barra o, si no está, la que le toca (la principal sin enfriamiento en 🖱️Der, para
// que se use; con enfriamiento, en 2)
export function hostOf(classId, id) {
  const sk = CLASSES[classId].skills.find(s => s.id === id);
  const specs = SPECS[classId];
  const spec = sk.spec || specs.find(s => Object.values(SPEC_BAR[s].bar).includes(id)) || specs.find(s => FORGE_RECO[s]?.[id]) || specs[0];
  const bar = SPEC_BAR[spec].bar;
  let slot = Object.keys(bar).find(k => bar[k] === id) || null;
  if (!slot) {
    const pref = sk.cat === 'movement' ? ['k1'] : sk.cat === 'ultimate' ? ['k4'] : sk.cat === 'spec' ? ['k3']
      : sk.cat === 'spender' && !((sk.cd || 0) > 0) ? ['rmb', 'k2'] : ['k2', 'rmb'];
    slot = pref.find(k => skillSlots(sk).includes(k)) || null;
  }
  return { spec, slot, sk };
}
// escenario principal de la habilidad (F3)
export function mainScenario(sk) {
  if (sk.cat === 'movement') return null;
  if (sk.cat === 'defense') return 'ttdp';
  const tags = new Set(sk.tags || []);
  if (tags.has('cc')) return 'ctl';
  return ['area', 'cone', 'line', 'zone', 'trap'].some(t => tags.has(t)) ? 'area' : 'uni';
}
// copia de la clase con la Mejora de `id` apagada (config «base»)
function noMejoraClass(classId, id) {
  const C = CLASSES[classId];
  return { ...C, forge: { ...(C.forge || {}), [id]: { ...(C.forge?.[id] || SKILL_FORGE[id]), mejora: null } } };
}

// ---------------- medición ----------------
// métrica de un escenario con un héroe ya armado (y lo que cada regla necesita de él)
// daño PROPIO de la habilidad (su aporte en UNI y ÁREA×5): el que lleva su id (y los pasos `id#n`) y el
// de los poderes que declaran sus piezas de forja
function ownOf(by, ctx) {
  let s = 0;
  for (const [k, v] of Object.entries(by || {})) {
    const base = k.startsWith('power:') ? k.slice(6) : k;
    if (base === ctx.id || base.startsWith(ctx.id + '#') || ctx.own.has(base)) s += v;
  }
  return s;
}
function measure(p, s, ref, ctx) {
  if (s === 'uni') {
    const u = simulateUni(p, ref, UNI_T, { hp: ctx.hp });
    return { v: u.dps, own: ownOf(u.by, ctx) / u.t, gen: u.gen, ult: u.total > 0 ? (u.by[p.hotbar.k4] || 0) / u.total : 0 };
  }
  if (s === 'area') { const a = areaSim(p, ref); return { v: a.dps, own: ownOf(a.by, ctx) / 30 }; }
  if (s === 'ctl') { const c = controlSim(p, ref); return { v: c.slow, hard: c.hard }; }
  if (s === 'ttdp') return { v: ttdPlusSim(p, ref, { defAtCd: true, extrapolate: true }) };
  if (s === 'apoyo') { const a = apoyoSim(p, ref, { hp: ctx.hp, allyHp: ctx.allyHp }); return { v: a.dpsShare + 0.1 * a.heal, dps: a.dpsShare, heal: a.heal }; }
  return null;
}
// matriz de una habilidad: config → escenario → medida
export function forgeSkill(classId, id, { seed = 1, full = false, level = LEVEL } = {}) {
  const entry = CLASSES[classId].forge?.[id] || SKILL_FORGE[id];
  let { spec, slot, sk } = hostOf(classId, id);
  const al = CM.areaLevelForHero(level), ref = refEnemies(al);
  const hp = ref.boss * UNI_LIFE / 60;
  // el BÁSICO lo llevan las tres: se mide en la especialización en que más daño hace en UNI (en la del
  // Berserker apenas se usa y su forja no movería nada)
  if (sk.cat === 'basic') {
    const share = sp => { const u = simulateUni(hero(classId, level, 'tipico', { al, seed, spec: sp, forge: { [id]: null } }), ref, UNI_T, { hp }); return u.total > 0 ? (u.by[id] || 0) / u.total : 0; };
    spec = SPECS[classId].map(sp => [sp, share(sp)]).reduce((a, b) => (b[1] > a[1] ? b : a))[0];
    slot = 'lmb';
  }
  const vars = entry.vars || [];
  const sI = ROLE_SC[vars[0]?.role] ?? null, sII = ROLE_SC[vars[1]?.role] ?? null;
  const main = mainScenario(sk);
  const isBasic = sk.cat === 'basic';
  const decl = [sI, sII].filter(Boolean);
  const core = full ? SCENARIOS : [...new Set(['uni', 'area', ...decl, ...(main ? [main] : [])])];
  const dmgVar = v => v && (v.role === 'UNI' || v.role === 'AREA');
  const own = new Set([...vars.map(v => v.id), ...[entry.mejora, ...vars].map(x => x?.power).filter(Boolean)]);
  const ctx = { id, hp, allyHp: 0, own };
  const mk = (cfg, variant = 'ofensiva') => {
    const forge = { [id]: cfg === 'i' ? 'i' : cfg === 'ii' ? 'ii' : null };
    const bar = cfg === 'sin' ? { [slot]: null } : (slot ? { [slot]: id } : null);
    const p = hero(classId, level, 'tipico', { al, seed, spec, forge, bar, variant, cls: cfg === 'base' ? noMejoraClass(classId, id) : null });
    if (sk.cat === 'defense') p._benchDefOnCd = true;          // la defensa medida se usa al enfriarse
    return p;
  };
  ctx.allyHp = mk('mejora').stats.maxHP;
  // ¿hace daño propio? (coeficiente o básico): su aporte en UNI y ÁREA×5 es su daño; si no (buffs,
  // posturas, auras, defensas), lo que cambia la métrica sin ella. «sin la habilidad» solo hace falta
  // para esos aportes por diferencia
  const dmgSkill = isBasic || (sk.coef || 0) > 0;
  const byDiff = s => s && (!dmgSkill || (s !== 'uni' && s !== 'area'));
  const want = {
    sin: isBasic ? [] : [...new Set([...decl, ...(main ? [main] : [])])].filter(byDiff),
    base: main ? [main] : [],
    mejora: [...new Set([...core, ...(dmgVar(vars[0]) || dmgVar(vars[1]) ? ['apoyo'] : [])])],
    i: [...new Set([...core, ...(dmgVar(vars[0]) ? ['apoyo'] : [])])],
    ii: [...new Set([...core, ...(dmgVar(vars[1]) ? ['apoyo'] : [])])],
  };
  const out = { classId, id, name: sk.name, cat: sk.cat, dmgSkill, spec, slot, main, sI, sII, vars: vars.map(v => ({ id: v.id, name: v.name, role: v.role })), mejora: entry.mejora?.name || null, m: {} };
  for (const [cfg, list] of Object.entries(want)) {
    out.m[cfg] = {};
    for (const s of list) out.m[cfg][s] = measure(mk(cfg), s, ref, ctx);
  }
  // F9: «solo básico» con cada pieza del básico; la definitiva de refuerzo, por su marginal
  if (isBasic) for (const cfg of ['mejora', 'i', 'ii']) out.m[cfg].basico = measure(mk(cfg, 'basico'), 'uni', ref, ctx);
  if (sk.cat === 'ultimate') {
    out.ultKind = ultKind(mk('mejora'));
    if (out.ultKind === 'buff') out.m.sin.uni = measure(mk('sin'), 'uni', ref, ctx);
  }
  // F7: perfil de resolveSkill de cada configuración
  const sig = cfg => { const p = mk(cfg); return profSig(resolveSkill(p, p.cls.skills.find(s => s.id === id))); };
  out.sig = { base: sig('base'), mejora: sig('mejora'), i: sig('i'), ii: sig('ii') };
  out.levels = forgeLevels(sk);
  return out;
}
// firma del perfil de resolveSkill (también la definición forjada, sin lo cosmético ni la marca de forja)
const COSMETIC = new Set(['color', 'icon', 'name', 'line', 'desc', 'art', 'forged', 'shake', 'size0']);
function profSig(prof) {
  const keep = {};
  for (const [k, v] of Object.entries(prof)) {
    if (['def', 'onHitPowers', 'sups', 'variant', 'mejora', 'windupMods'].includes(k)) continue;
    keep[k] = v instanceof Set ? [...v].sort() : v;
  }
  keep._def = Object.fromEntries(Object.entries(prof.def || {}).filter(([k]) => !COSMETIC.has(k)));
  return JSON.stringify(keep, (k, v) => (typeof v === 'function' ? 'fn' : v instanceof Set ? [...v].sort() : v));
}

// ---------------- reglas ----------------
// aporte de la habilidad en un escenario: el daño propio en UNI y ÁREA×5; en el resto, lo que cambia
// la métrica con ella frente a sin ella en la barra
const ownSc = (r, s) => r.dmgSkill && (s === 'uni' || s === 'area');
function aporte(r, cfg, s) {
  const m = r.m[cfg]?.[s];
  if (!m) return null;
  if (ownSc(r, s)) return m.own;
  if (r.cat === 'basic') return m.v;
  const sin = r.m.sin?.[s];
  return sin ? m.v - sin.v : null;
}
// lo que se compara entre piezas en un escenario: el daño propio (habilidad de daño en UNI y ÁREA×5;
// la diferencia total tiene el ruido de toda la rotación) o la métrica del escenario
const val = (r, cfg, s) => { const m = r.m[cfg]?.[s]; return m ? (ownSc(r, s) ? m.own : m.v) : null; };
const winBy = (r, a, b, s) => val(r, a, s) > val(r, b, s) * (1 + WIN_EPS) + 1e-9;
export function checkForge(rows) {
  const fails = [];
  const chk = (key, ok, msg, extra = {}) => { if (!ok) fails.push({ key, msg, ...extra }); };
  for (const r of rows) {
    const [vI, vII] = r.vars;
    const sOf = { i: r.sI, ii: r.sII };
    // F1 y F8
    let f8 = false, f8any = false;
    for (const [cfg, other, v] of [['i', 'ii', vI], ['ii', 'i', vII]]) {
      const s = sOf[cfg];
      if (!v || !s) continue;
      f8any = true;
      if (BENCH_LIMITS[v.id]) { if (winBy(r, cfg, 'mejora', s)) f8 = true; continue; }
      const ap = aporte(r, cfg, s);
      const need = RULES.f1 * Math.max(0, ap ?? 0);
      const diff = val(r, cfg, s) - val(r, other, s);
      chk(`F1:${v.id}`, ap > 0 && diff >= need - 1e-9, `F1 ${r.classId} ${v.id} (${v.name}, ${v.role}): ${ap > 0 ? `gana a su hermana por ${pct(diff / ap)} del aporte` : 'no aporta nada'} en ${s} (≥ 8 %)`,
        { value: ap > 0 ? diff / ap : null, target: RULES.f1, cls: r.classId, skill: r.id, piece: v.id, scenario: s });
      if (winBy(r, cfg, 'mejora', s)) f8 = true;
    }
    if (f8any) chk(`F8:${r.id}`, f8, `F8 ${r.classId} ${r.id}: ninguna variante supera a la Mejora sola en su escenario`, { cls: r.classId, skill: r.id });
    // F2: ninguna gana en todos los escenarios medidos; ninguna sube la rotación UNI > +20 %
    const common = Object.keys(r.m.i).filter(s => r.m.ii[s] && s !== 'basico');
    for (const [cfg, other, v] of [['i', 'ii', vI], ['ii', 'i', vII]]) {
      if (!v) continue;
      // contra una hermana de MOVILIDAD (o en BENCH_LIMITS) no se afirma: su fuerte no está en el banco
      const sister = cfg === 'i' ? vII : vI;
      const sisterOff = sister?.role === 'MOV' || !!BENCH_LIMITS[sister?.id];   // su fuerte no se mide
      const all = !sisterOff && common.length > 1 && common.every(s => winBy(r, cfg, other, s));
      chk(`F2a:${v.id}`, !all,`F2 ${r.classId} ${v.id} (${v.name}): gana a su hermana en todos los escenarios (${common.join(', ')})`, { cls: r.classId, skill: r.id, piece: v.id });
      const up = r.m[cfg].uni.v / r.m.mejora.uni.v - 1;
      chk(`F2b:${v.id}`, up <= RULES.f2 + 1e-9, `F2 ${r.classId} ${v.id} (${v.name}): sube la rotación UNI ${sgn(up)} sobre la Mejora (≤ +20 %)`, { value: up, target: RULES.f2, cls: r.classId, skill: r.id, piece: v.id });
      // F5: generación de recurso en UNI
      const g0 = r.m.mejora.uni.gen, g1 = r.m[cfg].uni.gen;
      if (g0 > 0) chk(`F5:${v.id}`, g1 / g0 - 1 <= RULES.f5 + 1e-9, `F5 ${r.classId} ${v.id} (${v.name}): sube la generación de recurso ${sgn(g1 / g0 - 1)} (≤ +25 %)`, { value: g1 / g0 - 1, target: RULES.f5, cls: r.classId, skill: r.id, piece: v.id });
      // F4: variante de daño sin Vulnerable/Debilidad para todo el grupo
      if ((v.role === 'UNI' || v.role === 'AREA') && r.m[cfg].apoyo && r.m.mejora.apoyo) {
        const d = r.m[cfg].apoyo.dps - r.m.mejora.apoyo.dps;
        chk(`F4:${v.id}`, d <= RULES.f4 + 1e-9, `F4 ${r.classId} ${v.id} (${v.name}): da +${pct(d)} del DPS de un aliado al grupo (variante de daño; ≤ 2 puntos)`, { value: d, target: RULES.f4, cls: r.classId, skill: r.id, piece: v.id });
      }
    }
    // F3: la Mejora en el escenario principal, en % del aporte (sin Mejora)
    if (r.main && r.m.base[r.main] && r.mejora) {
      const ap = aporte(r, 'base', r.main);
      const gain = val(r, 'mejora', r.main) - val(r, 'base', r.main);
      const rel = ap > 0 ? gain / ap : null;
      const [lo, hi] = RULES.f3;
      chk(`F3:${r.id}`, rel != null && rel >= lo - 1e-9 && rel <= hi + 1e-9, `F3 ${r.classId} ${r.id} (${r.mejora}): la Mejora da ${rel == null ? '— (la habilidad no aporta en ' + r.main + ')' : sgn(rel)} del aporte en ${r.main} (+5–15 %)`,
        { value: rel, target: RULES.f3, cls: r.classId, skill: r.id, piece: `${r.id}:mejora`, scenario: r.main });
    }
    // F6: zonas con límite (estático, sobre la definición forjada)
    for (const cfg of ['mejora', 'i', 'ii']) {
      const P = JSON.parse(r.sig[cfg]);
      const zone = (P.zone || 0) > 0 || P.type === 'zone' || !!P.trail;
      const pid = cfg === 'mejora' ? `${r.id}:mejora` : (cfg === 'i' ? vI : vII)?.id;
      if (zone) chk(`F6:${pid}`, (P.cdBase || 0) >= 3 || (P.zoneMax || 0) >= 1, `F6 ${r.classId} ${pid}: deja una zona por lanzamiento sin enfriamiento ≥ 3 s ni zoneMax 1`, { cls: r.classId, skill: r.id, piece: pid });
    }
    // F7: nada que no haga nada
    const entry = CLASSES[r.classId].forge?.[r.id] || SKILL_FORGE[r.id];
    const pieces = [['mejora', 'base', entry.mejora, `${r.id}:mejora`], ['i', 'mejora', vI && entry.vars[0], vI?.id], ['ii', 'mejora', vII && entry.vars[1], vII?.id]];
    for (const [cfg, ref0, def, pid] of pieces) {
      if (!def) continue;
      const prof = r.sig[cfg] !== r.sig[ref0];
      const reg = (def.power && POWER_HOOKS[def.power]) || (def.behavior && SKILL_BEHAVIORS[def.behavior]);
      const bench = Object.keys(r.m[cfg]).some(s => r.m[ref0]?.[s] && Math.abs(r.m[cfg][s].v - r.m[ref0][s].v) >= RULES.f7 * Math.max(1e-9, Math.abs(r.m[ref0][s].v)));
      chk(`F7:${pid}`, prof || !!reg || bench, `F7 ${r.classId} ${pid}: no cambia el perfil, no declara poder/comportamiento registrado y no mueve el banco ≥ 1 %`, { cls: r.classId, skill: r.id, piece: pid });
    }
    // F9: definitiva 12–22 % de UNI con cada pieza; «solo básico» ≤ 0,6× con cada pieza del básico
    if (r.cat === 'ultimate' && r.ultKind !== 'def') {
      for (const cfg of ['mejora', 'i', 'ii']) {
        const pid = cfg === 'mejora' ? `${r.id}:mejora` : (cfg === 'i' ? vI : vII)?.id;
        const sh = r.ultKind === 'buff' ? Math.max(0, 1 - r.m.sin.uni.v / r.m[cfg].uni.v) : r.m[cfg].uni.ult;
        chk(`F9:ult:${pid}`, sh >= RULES.ult[0] - 1e-9 && sh <= RULES.ult[1] + 1e-9, `F9 ${r.classId} ${pid}: la definitiva aporta ${pct(sh)} de UNI (12–22 %)`, { value: sh, target: RULES.ult, cls: r.classId, skill: r.id, piece: pid });
      }
    }
    if (r.cat === 'basic') {
      for (const cfg of ['mejora', 'i', 'ii']) {
        const pid = cfg === 'mejora' ? `${r.id}:mejora` : (cfg === 'i' ? vI : vII)?.id;
        const x = r.m[cfg].basico.v / r.m[cfg].uni.v;
        chk(`F9:basico:${pid}`, x <= RULES.basicOnly + 1e-9, `F9 ${r.classId} ${pid}: «solo básico» ×${x.toFixed(2)} de la rotación (≤ ×0,6)`, { value: x, target: RULES.basicOnly, cls: r.classId, skill: r.id, piece: pid });
      }
    }
  }
  return fails;
}

// ---------------- ejecución ----------------
export function runForge({ classes = ['guerrero', 'maga', 'arquera'], seed = 1, full = false } = {}) {
  const rows = [];
  for (const c of classes) for (const id of Object.keys(CLASSES[c].forge || {})) rows.push(forgeSkill(c, id, { seed, full }));
  return rows;
}
const SC = { uni: 'UNI', area: 'ÁREA', ctl: 'CTRL', ttdp: 'TTD+', apoyo: 'APOYO' };
const fmtV = (s, m) => (m == null ? '—' : s === 'ctl' ? pct(m.v) : s === 'apoyo' ? m.v.toFixed(3) : f1(m.v));
export function printForge(rows) {
  for (const c of [...new Set(rows.map(r => r.classId))]) {
    console.log(`\nFORJA · ${c.toUpperCase()} (Nv${LEVEL} típico; host = especialización · ranura; métricas: UNI/ÁREA DPS, CTRL % lento, TTD+ s, APOYO puntos)`);
    console.log('habilidad           host               config                         |    UNI       ÁREA     CTRL    TTD+   APOYO | aporte(ppal)');
    for (const r of rows.filter(x => x.classId === c)) {
      const lines = [['base', 'sin Mejora'], ['mejora', `Mejora · ${r.mejora || '—'}`], ['i', `I ${r.vars[0]?.role} · ${r.vars[0]?.name}`], ['ii', `II ${r.vars[1]?.role} · ${r.vars[1]?.name}`], ['sin', 'sin la habilidad']];
      for (const [cfg, label] of lines) {
        const m = r.m[cfg]; if (!m || !Object.keys(m).length) continue;
        const ap = r.main ? aporte(r, cfg, r.main) : null;
        console.log(`${(cfg === 'base' ? r.id : '').padEnd(19)} ${(cfg === 'base' ? `${r.spec}·${r.slot}` : '').padEnd(18)} ${label.slice(0, 30).padEnd(30)} | ${['uni', 'area', 'ctl', 'ttdp', 'apoyo'].map(s => fmtV(s, m[s]).padStart(s === 'uni' || s === 'area' ? 8 : 7)).join(' ')} | ${ap == null ? '—' : f1(ap)}`);
      }
    }
  }
}
function medForge(runs) {
  return runs[0].map(base => {
    const same = runs.map(rs => rs.find(r => r.classId === base.classId && r.id === base.id));
    const out = { ...base, m: {} };
    for (const [cfg, sc] of Object.entries(base.m)) {
      out.m[cfg] = {};
      for (const [s, m] of Object.entries(sc)) {
        out.m[cfg][s] = {};
        for (const k of Object.keys(m)) out.m[cfg][s][k] = med(same.map(r => r.m[cfg]?.[s]?.[k]).filter(v => v != null));
      }
    }
    return out;
  });
}
export function diffPending(fails, pending = PENDING_FORGE) {
  const got = new Set(fails.map(f => f.key)), want = new Set(pending.map(p => p.key));
  return { nuevos: fails.filter(f => !want.has(f.key)), arreglados: pending.filter(p => !got.has(p.key)) };
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop());
if (isMain) {
  const t0 = Date.now();
  const only = argOf('--class');
  const classes = only ? [only] : ['guerrero', 'maga', 'arquera'];
  const rows = runForge({ classes, full: REPORT });
  const fails = checkForge(rows);
  if (REPORT) printForge(rows);
  const nSeeds = argOf('--seeds') ? Math.max(1, parseInt(argOf('--seeds'), 10) || 5) : 0;
  let S = null;
  if (nSeeds) {
    const runs = [rows, ...Array.from({ length: nSeeds - 1 }, (_, i) => runForge({ classes, seed: i + 2, full: REPORT }))];
    const mrows = medForge(runs);
    console.log(`\n================ MEDIANAS DE ${nSeeds} SEMILLAS ================`);
    printForge(mrows);
    const mf = checkForge(mrows);
    console.log(`\nMedianas fuera de F1–F9 (${mf.length}):\n - ` + mf.map(f => f.msg).join('\n - '));
    S = { rows: mrows, fails: mf, perSeed: runs.map(rs => checkForge(rs).map(f => f.key)) };
  }
  const jp = argOf('--json');
  if (jp) { writeFileSync(jp, JSON.stringify({ fecha: new Date().toISOString(), semilla1: { rows, fails }, medianas: S }, null, 1)); console.log(`(JSON en ${jp})`); }
  const pend = only ? PENDING_FORGE.filter(p => p.key.includes(only) || (p.cls || '') === only) : PENDING_FORGE;
  console.log(`\nLímites del banco (F1 no se afirma; se informa): ${Object.entries(BENCH_LIMITS).map(([k, v]) => `${k} (${v})`).join(' · ')}`);
  const { nuevos, arreglados } = diffPending(fails, only ? pend : PENDING_FORGE);
  console.log(`\nSemilla 1: ${fails.length} reglas F1–F9 fuera · ${PENDING_FORGE.length} pendientes de calibración (E4b)`);
  if (nuevos.length) console.log('FUERA DE F1–F9 Y NO PENDIENTES:\n - ' + nuevos.map(f => `${f.key} · ${f.msg}`).join('\n - '));
  if (arreglados.length) console.log('PENDIENTES QUE YA SE CUMPLEN (sácalos de PENDING_FORGE):\n - ' + arreglados.map(p => `${p.key} · ${p.regla}`).join('\n - '));
  console.log(`(${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  if ((nuevos.length || arreglados.length) && !REPORT && !nSeeds && !only) { console.error('❌ BANCO DE LA FORJA: los fallos no coinciden con PENDING_FORGE'); process.exit(1); }
  if (!nuevos.length && !arreglados.length) console.log('✅ BANCO DE LA FORJA: fuera de F1–F9 solo lo pendiente de calibración (E4b)');
}
