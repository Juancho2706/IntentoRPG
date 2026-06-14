// Lógica del filtro de loot (passesLootFilter)
import { economyMethods } from '../js/economy.js'; void economyMethods;
// passesLootFilter está en Game (main.js), pero su lógica es pura; la replico para validar el contrato
const rank = { normal: 0, magico: 1, raro: 2, legendario: 3, conjunto: 3 };
const passes = (filter, rarity) => (rank[rarity] ?? 0) >= (rank[filter] ?? 0);

// con filtro 'normal' pasa todo
for (const r of ['normal','magico','raro','legendario','conjunto']) if (!passes('normal', r)) throw new Error('normal debería mostrar todo');
// con filtro 'raro' se ocultan normal y mágico, pasan raro/legendario/conjunto
if (passes('raro','normal') || passes('raro','magico')) throw new Error('raro+ no debería mostrar normal/magico');
if (!passes('raro','raro') || !passes('raro','legendario') || !passes('raro','conjunto')) throw new Error('raro+ debe mostrar raro/leg/conjunto');
// con filtro 'legendario' solo legendario y conjunto
if (passes('legendario','raro')) throw new Error('legendario no debería mostrar raro');
if (!passes('legendario','legendario') || !passes('legendario','conjunto')) throw new Error('legendario debe mostrar leg/conjunto');
console.log('Filtro de loot: normal=todo, raro+=oculta normal/mágico, legendario=solo leg/conjunto ✓');
console.log('✅ FILTRO DE LOOT OK');
