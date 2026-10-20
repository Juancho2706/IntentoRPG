// ============================================================
// TALENTOS Y ESPECIALIZACIÓN (mixin de Game) — Paso 2c.0
// ============================================================
// Sustituye a game-mastery.js (docs/paso2-diseno.md §5.4). Las reglas (puntos,
// puertas, requisitos, presets, código de build) viven en js/talents.js (consultas)
// y js/talents-ops.js (mutaciones puras, las mismas que usa el panel de 2d); aquí
// solo va la orquestación con el juego:
//   · fuera de combate (Game.canRespecFree: 5 s sin daño o en un campamento) los
//     cambios son GRATIS; en combate se rechazan con motivo;
//   · tras cada cambio: Player.recompute() (talentAgg, poderes, indicador), la barra
//     se sincroniza con las activas `grant` (las nuevas entran en su ranura según
//     fitsSlot; las que ya no concede ningún nodo se desengarzan), aviso y guardado.
// Todas las operaciones devuelven { ok, reason? } (reason = texto para el jugador).
// Se inyecta en Game.prototype con Object.assign (test43 vigila los nombres).
import * as Talents from './talents.js';
import { createTalentOps } from './talents-ops.js';
import { fitsSlot, isKnown } from './skill-resolve.js';
import { resetGauges } from './spec-mechanics.js';

// operaciones puras compartidas con el panel (js/ui-talents.js las crea igual)
export const TALENT_OPS = createTalentOps(Talents);
const SLOT_ORDER = ['k3', 'k2', 'rmb', 'k1', 'k4', 'lmb'];

export const talentMethods = {
  // null = se puede editar · texto = motivo (en combate)
  canEditTalents() {
    const p = this.player;
    if (!p) return 'Sin héroe';
    if (typeof this.canRespecFree === 'function' && !this.canRespecFree()) return '⚔️ Solo fuera de combate (5 s sin daño) o en un campamento';
    return null;
  },

  // aplica una mutación de talents-ops y, si salió bien, sincroniza el juego
  _talentMutate(fn, okMsg = null, { needEdit = true } = {}) {
    const p = this.player;
    if (!p) return { ok: false, reason: 'Sin héroe' };
    if (needEdit) {
      const why = this.canEditTalents();
      if (why) { this.ui?.message?.(why, 2500); return { ok: false, reason: why }; }
    }
    const before = new Set(p.talentAgg?.grants || []);
    const specBefore = p.talents?.spec || null;
    const r = fn(p) || { ok: false };
    if (!r.ok) { if (r.reason || r.error) this.ui?.message?.(r.reason || r.error, 2500); return r; }
    this.onTalentsChanged(before, specBefore);
    if (okMsg) this.ui?.message?.(okMsg, 2500);
    return r;
  },

  // recompute + barra ↔ activas concedidas + guardado
  onTalentsChanged(grantsBefore = new Set(), specBefore = null) {
    const p = this.player;
    if (!p) return;
    if ((p.talents?.spec || null) !== specBefore) resetGauges(p);
    p.recompute();
    const hb = p.hotbar || (p.hotbar = {});
    // 1) desengarza las activas de talento que ya no se conocen (nodo retirado o cambio de especialización)
    for (const [slot, id] of Object.entries(hb)) {
      const sk = id && p.cls.skills.find(s => s.id === id);
      if (sk && sk.kind === 'talent' && !isKnown(p, sk)) hb[slot] = null;
    }
    // 2) las recién concedidas entran en su ranura libre (la insignia, en 3)
    const fresh = [...(p.talentAgg?.grants || [])].filter(id => !grantsBefore.has(id));
    const insignia = Talents.specInsignia(p.classId, p.talents?.spec);
    fresh.sort((a, b) => (a === insignia ? -1 : b === insignia ? 1 : 0));
    for (const id of fresh) {
      const sk = p.cls.skills.find(s => s.id === id);
      if (!sk || Object.values(hb).includes(id)) continue;
      const slot = SLOT_ORDER.find(s => fitsSlot(sk, s) && !hb[s]);
      if (slot) hb[slot] = id;
      this.ui?.message?.(`📖 Nueva habilidad de talento: ${sk.icon || ''} ${sk.name}${slot ? ` (ranura ${slot.toUpperCase()})` : ''}`, 3500);
    }
    this.ui?.refreshHotbar?.();
    this.ui?.updateHUD?.();
    this.ui?.renderPanel?.();
    this.save?.();
  },

  // elegir / cambiar especialización (Nv ≥ 10; gratis fuera de combate). Cada una
  // conserva sus rangos en talents.sp[specId]; su nodo clave (s0) es gratis.
  chooseSpec(specId) {
    const p = this.player;
    if (p?.talents?.spec === specId) return { ok: true, same: true };
    const s = Talents.findSpec(p?.classId, specId);
    return this._talentMutate(q => TALENT_OPS.chooseSpec(q, specId), s ? `🌿 Especialización: ${s.name}` : null);
  },
  // alias de §5.4 (cambiar de especialización es lo mismo que elegirla)
  switchSpec(specId) { return this.chooseSpec(specId); },

  // which: 'cls' | 'spec'
  addTalentRank(which, nodeId) { return this._talentMutate(q => TALENT_OPS.addRank(q, which, nodeId)); },
  removeTalentRank(which, nodeId) { return this._talentMutate(q => TALENT_OPS.removeRank(q, which, nodeId)); },
  // opción A/B de un nodo de elección (busca el nodo en el árbol de clase y en el de especialización)
  chooseTalentOption(nodeId, k) {
    const p = this.player;
    const which = Talents.nodeById(Talents.treeOf(p, 'cls'), nodeId) ? 'cls' : 'spec';
    return this._talentMutate(q => TALENT_OPS.setChoice(q, which, nodeId, k));
  },
  // build recomendada: which 'cls' | 'spec' | 'all' (preset de clase = el de la especialización activa)
  applyTalentPreset(which = 'all') {
    return this._talentMutate(q => (which === 'all' ? TALENT_OPS.applyPresetAll(q) : TALENT_OPS.applyPreset(q, which)), '🌿 Build recomendada aplicada');
  },
  resetTalentTree(which = 'all') {
    return this._talentMutate(q => (which === 'all' ? TALENT_OPS.resetAll(q) : TALENT_OPS.resetTree(q, which)), '🌿 Talentos reiniciados');
  },
  // código de build IRPG1-<clase>-<spec>-… (exportar no exige estar fuera de combate)
  exportTalentCode() { return this.player ? TALENT_OPS.exportCode(this.player) : ''; },
  importTalentCode(code) { return this._talentMutate(q => TALENT_OPS.importCode(q, code), '🌿 Build importada'); },

  // puntos libres de cada árbol (UI)
  talentPointsInfo() {
    const p = this.player;
    if (!p) return { cls: 0, spec: 0 };
    return { cls: Talents.talentPointsLeft(p, 'cls'), spec: Talents.talentPointsLeft(p, 'spec') };
  },
};
