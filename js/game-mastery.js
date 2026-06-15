// ============================================================
// Maestrías de clase (mixin de Game)
// ============================================================
// Elegir rama, asignar nodos y reespecializar. El efecto de los nodos vive en
// Player.recompute() (stats + powers) y en los hooks de combate; aquí solo va la
// gestión de puntos/elección. Se inyecta en Game.prototype con Object.assign.
import { MASTERIES, findMastery, MASTERY_START_LEVEL } from './data.js';

export const masteryMethods = {
  // nº de nodos ya asignados en la maestría activa
  masterySpent() {
    const m = this.player?.mastery;
    if (!m?.id) return 0;
    return Object.values(m.nodes || {}).filter(Boolean).length;
  },

  // elige una de las 3 maestrías de tu clase (una vez; cambiar = reespecializar)
  chooseMastery(id) {
    const p = this.player;
    if (p.level < MASTERY_START_LEVEL) { this.ui.message(`🌿 Las maestrías se desbloquean en el nivel ${MASTERY_START_LEVEL}`); return; }
    const m = findMastery(id);
    if (!m || !(MASTERIES[p.classId] || []).some(x => x.id === id)) return; // solo de tu clase
    if (p.mastery.id) { this.ui.message('Ya tienes una maestría; reespecializa para cambiarla', 3000); return; }
    p.mastery.id = id;
    p.recompute();
    this.sfx('levelup');
    this.ui.message(`🌿 Maestría elegida: ${m.icon} ${m.name}`, 3500);
    this.ui.renderPanel?.();
    this.save();
  },

  // asigna un nodo (cuesta 1 punto; requiere `req` nodos ya gastados en la rama)
  allocateMasteryNode(nodeId) {
    const p = this.player, m = findMastery(p.mastery?.id);
    if (!m) return;
    const node = m.nodes.find(n => n.id === nodeId);
    if (!node || p.mastery.nodes[nodeId]) return;
    if (p.mastery.points <= 0) { this.ui.message('Sin puntos de maestría'); return; }
    if (this.masterySpent() < node.req) { this.ui.message(`Requiere ${node.req} puntos gastados en esta rama`, 2500); return; }
    p.mastery.nodes[nodeId] = true;
    p.mastery.points--;
    p.recompute();
    this.sfx('levelup');
    this.ui.message(`🌿 ${node.name}`, 1800);
    this.ui.renderPanel?.();
    this.ui.updateHUD?.();
    this.save();
  },

  masteryRespecCost() {
    return 500 + (this.player?.level || 1) * 80;
  },

  // reinicia la maestría: devuelve todos los puntos y permite re-elegir rama
  respecMastery() {
    const p = this.player;
    if (!p.mastery?.id) return;
    const cost = this.masteryRespecCost();
    if (p.gold < cost) { this.ui.message('🪙 Oro insuficiente para reespecializar', 3000); return; }
    p.gold -= cost;
    p.mastery.points += this.masterySpent();
    p.mastery.nodes = {};
    p.mastery.id = null;
    p.recompute();
    this.sfx('levelup');
    this.ui.message('🌿 Maestría reiniciada — elige de nuevo', 3500);
    this.ui.renderPanel?.();
    this.ui.updateHUD?.();
    this.save();
  },
};
