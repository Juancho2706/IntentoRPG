// ============================================================
// CATÁLOGO 2g de la clase Maga — BORRADOR para KA (no lo carga el juego)
// ============================================================
// Generado por tools/convert-v2/convert.mjs (--draft) desde docs/mockups/data/talents-v2-maga.js (sha1 7801561901ba, estado «aprobado»).
// Formato: docs/paso2-implementacion.md §3.5 (forja de 2f §2.3). Ids, cat, req, spec, elem, nombres, líneas y papeles
// exactos (los compara tests/test-v2-paridad.mjs cuando <CLASE>_CATALOG_V = 2). Los efectos se escriben a mano desde
// el `k` del mockup (en comentario) y el documento de la clase. Encima de cada habilidad que ya existe, su definición actual.
// D29: las 6 activas de talento (kind 'talent', slots ['k2']) van en este catálogo, al final de MAGA_SKILLS;
// en talents-maga.js, MAGA_TALENT_SKILLS es solo la lista de ids: m_t_bloque, m_t_inversion, m_t_contrahechizo, m_h_detener, m_h_palabra, m_h_constructo.
export const MAGA_SKILLS = [
  // juego actual: { id: 'm_dardo', name: 'Dardo Arcano', icon: '✨', cat: 'basic', slots: ['lmb'], tags: ['basic', 'proj', 'arcane'], elem: 'arcane', type: 'weapon', req: 1, coef: 1.05, gen: 3, color: 13395711, desc: 'Lanza un dardo arcano a distancia (100 % del daño de arma) y recupera 3 de Maná al impactar.' }
  { id: 'm_dardo', name: 'Dardo Arcano', icon: '✨', cat: 'basic', req: 1, elem: 'arcane', coef: 1.05, gen: 3, line: 'Dispara un dardo a 20 m. Cada impacto te devuelve 3 de maná.', art: 'skills256/m_dardo.webp', todo: 'KA1: tipo genérico, verbos (§3.6) y números desde el doc de la clase' },
  // juego actual: { id: 'bola_fuego', name: 'Bola de Fuego', icon: '🔥', cat: 'spender', slots: ['rmb', 'k2'], tags: ['spender', 'proj', 'area', 'fire'], elem: 'fire', type: 'proj', req: 2, coef: 2.2, splash: 3.5, radius: 2, cost: 18, cd: 1.5, windup: 0.3, speed: 13, range: 12, size: 0.26, color: 16737826, desc: 'Tras 0,3 s de lanzamiento, una esfera ardiente que explota al impactar: 220 % de daño al objetivo y 350 % a los enemigos a 2 m. Cuesta 18 de Maná; enfriamiento 1,5 s.' }
  { id: 'bola_fuego', name: 'Bola de Fuego', icon: '🔥', cat: 'spender', req: 2, elem: 'fire', coef: 2.2, cost: 18, cd: 1.5, line: 'Lanza una bola que golpea y explota a 2 m a su alrededor.', innate: { piromante: 'Piromante: explosión 100 → 350 %' }, art: 'skills256/bola_fuego.webp', todo: 'KA1: tipo genérico, verbos (§3.6) y números desde el doc de la clase' },
  // juego actual: { id: 'nova_hielo', name: 'Nova de Hielo', icon: '❄️', cat: 'spender', slots: ['rmb', 'k2'], tags: ['spender', 'area', 'cc', 'frost'], elem: 'frost', type: 'area', at: 'self', req: 14, coef: 1.4, cost: 25, cd: 4, radius: 3.3, slow: 3, slowPct: 30, color: 6737151, desc: 'Una onda gélida a tu alrededor (3,3 m): 140 % de daño y ralentiza un 30 % durante 3 s. Cuesta 25 de Maná; enfriamiento 4 s.' }
  { id: 'nova_hielo', name: 'Nova de Hielo', icon: '❄️', cat: 'spender', req: 8, elem: 'frost', coef: 1.4, cost: 25, cd: 4, line: 'Onda de hielo a tu alrededor (3,3 m): daña y ralentiza un 30 % 3 s.', art: 'skills256/nova_hielo.webp', todo: 'KA1: tipo genérico, verbos (§3.6) y números desde el doc de la clase' },
  // NUEVA en 2g con este id; en el juego hay una parecida: { id: 'm_t_parpadeo', name: 'Parpadeo', icon: '💫', kind: 'talent', cat: 'movement', slots: ['k1'], tags: ['movement', 'arcane'], elem: 'arcane', type: 'blink', req: 10, cd: 15, range: 8, color: 10070783, desc: 'Te teletransportas al instante 8 m hacia el cursor (atraviesas enemigos, no muros). Enfriamiento 15 s.' }
  { id: 'm_parpadeo', name: 'Parpadeo', icon: '✦', cat: 'movement', req: 4, elem: 'arcane', cd: 12, line: 'Te teletransportas 8 m hacia el cursor, atravesando enemigos.', art: 'talents/maga-clase-c3.webp', todo: 'KA1: tipo genérico, verbos (§3.6) y números desde el doc de la clase' },
  // NUEVA en 2g con este id; en el juego hay una parecida: { id: 'm_t_barrera', name: 'Barrera de Maná', icon: '🔮', kind: 'talent', cat: 'defense', slots: ['k2'], tags: ['defense', 'shield', 'arcane'], elem: 'arcane', type: 'shield', behavior: 'm_t_barrera', req: 10, cd: 20, dur: 8, shieldManaPct: 60, color: 12160255, desc: 'Una burbuja de maná absorbe daño igual al 60 % de tu maná máximo durante 8 s. Enfriamiento 20 s.' }
  { id: 'm_barrera', name: 'Barrera de Maná', icon: '✦', cat: 'defense', req: 6, elem: 'arcane', cd: 20, line: 'Escudo que absorbe daño igual al 60 % de tu maná máximo; dura 8 s.', art: 'talents/maga-clase-c2.webp', todo: 'KA1: tipo genérico, verbos (§3.6) y números desde el doc de la clase' },
  // juego actual: { id: 'p_llamarada', name: 'Llamarada', icon: '🔥', kind: 'talent', cat: 'spec', slots: ['k3'], tags: ['spec', 'cone', 'fire'], elem: 'fire', type: 'cone', behavior: 'p_llamarada', req: 10, coef: 1.5, cost: 25, cd: 8, radius: 7, angle: 70, windup: 0.1, detonatePct: 60, color: 16742946, desc: 'Insignia del Piromante: un cono de fuego de 7 m (preparación de 0,1 s): 150 % del arma y detona las Quemaduras, que hacen al instante el 60 % de su daño restante. Cuesta 25 de Maná; enfriamiento 8 s.' }
  { id: 'p_llamarada', name: 'Llamarada', icon: '🔥', cat: 'spec', req: 10, spec: 'piromante', elem: 'fire', coef: 1.5, cost: 25, cd: 8, line: 'Cono de fuego de 7 m; hace estallar las quemaduras (60 % de lo que les queda).', art: 'talents/maga-piromante-s0.webp', todo: 'KA1: tipo genérico, verbos (§3.6) y números desde el doc de la clase' },
  // juego actual: { id: 'm_estela_ignea', name: 'Estela Ígnea', icon: '♨️', cat: 'movement', slots: ['k1'], tags: ['movement', 'zone', 'fire'], elem: 'fire', behavior: 'm_estela_ignea', req: 12, coef: 0.4, cd: 10, range: 6, lockT: 0.2, radius: 1.5, dur: 3, color: 16742195, desc: 'Te deslizas 6 m hacia la mira dejando un rastro de fuego durante 3 s: 40 % de daño por segundo a quien lo pisa. Enfriamiento 10 s.' }
  { id: 'm_estela_ignea', name: 'Estela Ígnea', icon: '♨️', cat: 'movement', req: 12, spec: 'piromante', elem: 'fire', coef: 0.4, cd: 10, line: 'Te deslizas 6 m y dejas el suelo ardiendo 3 s.', art: 'skills256/m_estela_ignea.webp', todo: 'KA1: tipo genérico, verbos (§3.6) y números desde el doc de la clase' },
  // juego actual: { id: 'meteoro', name: 'Meteoro', icon: '☄️', cat: 'spender', slots: ['rmb', 'k2'], tags: ['spender', 'area', 'fire'], elem: 'fire', type: 'area', at: 'target', req: 14, coef: 3.7, cost: 40, cd: 6, radius: 3, range: 11, impactDelay: 0.6, shake: 0.5, color: 16729088, desc: 'Invoca un meteoro que se estrella 0,6 s después en la zona elegida (3 m): 370 % de daño. Cuesta 40 de Maná; enfriamiento 6 s.' }
  { id: 'meteoro', name: 'Meteoro', icon: '☄️', cat: 'spender', req: 14, spec: 'piromante', elem: 'fire', coef: 3.7, cost: 40, cd: 6, line: 'Un meteoro cae donde apuntas a los 0,6 s y golpea en 3 m.', art: 'skills256/meteoro.webp', todo: 'KA1: tipo genérico, verbos (§3.6) y números desde el doc de la clase' },
  // juego actual: { id: 'm_u_supernova', name: 'Supernova', icon: '🌟', cat: 'ultimate', slots: ['k4'], tags: ['ultimate', 'area', 'fire'], elem: 'fire', behavior: 'm_u_supernova', req: 15, coef: 4.7, pulses: 3, pulseGap: 0.25, burn: 12, burnT: 6, cd: 50, radius: 5, range: 10, windup: 0.15, impactDelay: 0.5, shake: 0.6, color: 16763972, desc: 'Definitiva: una estrella cae en la zona (5 m) y estalla 0,5 s después en tres ondas de 470 % de daño (1410 % en total) que dejan una quemadura de 1200 % en 6 s. Enfriamiento 50 s.' }
  { id: 'm_u_supernova', name: 'Supernova', icon: '🌟', cat: 'ultimate', req: 15, spec: 'piromante', elem: 'fire', coef: 4.7, cd: 50, line: 'Creas una estrella que estalla 3 veces a tu alrededor y deja a todos quemándose.', art: 'skills256/m_u_supernova.webp', todo: 'KA1: tipo genérico, verbos (§3.6) y números desde el doc de la clase' },
  // juego actual: { id: 'k_prision', name: 'Prisión de Hielo', icon: '🏔️', kind: 'talent', cat: 'spec', slots: ['k3'], tags: ['spec', 'area', 'cc', 'frost'], elem: 'frost', type: 'area', behavior: 'k_prision', at: 'target', req: 10, coef: 0.8, cost: 30, cd: 20, radius: 4, range: 10, windup: 0.12, layers: 5, freezeDur: 2, bossStagger: 20, color: 8969727, desc: 'Insignia del Crionte: encierras en hielo a los enemigos en 4 m (preparación de 0,12 s): 80 % del arma y 5 capas de Escarcha, que los dejan Congelados 2 s; los jefes quedan Ateridos y suman 20 de stagger. Cuesta 30 de Maná; enfriamiento 20 s.' }
  { id: 'k_prision', name: 'Prisión de Hielo', icon: '🏔️', cat: 'spec', req: 10, spec: 'crionte', elem: 'frost', coef: 0.8, cost: 25, cd: 12, line: 'Encierras en hielo 2 s a los enemigos a 4 m y les pones 2 capas de Escarcha.', art: 'talents/maga-crionte-s0.webp', todo: 'KA1: tipo genérico, verbos (§3.6) y números desde el doc de la clase' },
  // juego actual: { id: 'm_paso_escarcha', name: 'Paso de Escarcha', icon: '🧊', cat: 'movement', slots: ['k1'], tags: ['movement', 'frost'], elem: 'frost', behavior: 'm_paso_escarcha', req: 4, cd: 10, range: 6, lockT: 0.2, radius: 1.5, dur: 3, slow: 1, slowPct: 40, color: 10478591, desc: 'Te deslizas 6 m hacia la mira y dejas una estela helada durante 3 s que ralentiza un 40 % a quien la pisa. Enfriamiento 10 s.' }
  { id: 'm_paso_escarcha', name: 'Paso de Escarcha', icon: '🧊', cat: 'movement', req: 12, spec: 'crionte', elem: 'frost', coef: 0.3, cd: 10, line: 'Te deslizas 6 m dejando hielo 3 s que ralentiza un 40 % y pone 1 capa por segundo.', art: 'skills256/m_paso_escarcha.webp', todo: 'KA1: tipo genérico, verbos (§3.6) y números desde el doc de la clase' },
  // juego actual: { id: 'k_lanza', name: 'Lanza de Hielo', icon: '🔱', kind: 'talent', cat: 'spec', slots: ['rmb', 'k2', 'k3'], tags: ['spec', 'spender', 'proj', 'frost'], elem: 'frost', type: 'proj', behavior: 'k_lanza', req: 10, coef: 2.5, cost: 22, cd: 6, speed: 20, range: 13, pierce: true, frozenMult: 3, burstRadius: 2, color: 11463423, desc: 'Una lanza cristalina perforante: 250 % del arma; a los Congelados les hace el triple y los astilla en un estallido de 2 m. Cuesta 22 de Maná; enfriamiento 6 s.' }
  { id: 'k_lanza', name: 'Lanza de Hielo', icon: '🔱', cat: 'spender', req: 14, spec: 'crionte', elem: 'frost', coef: 2.6, cost: 30, cd: 4, line: 'Lanza que atraviesa en línea 12 m; a los Congelados les hace el triple.', art: 'talents/maga-crionte-s9.webp', todo: 'KA1: tipo genérico, verbos (§3.6) y números desde el doc de la clase' },
  // juego actual: { id: 'm_u_tormenta', name: 'Tormenta Glacial', icon: '🌨️', cat: 'ultimate', slots: ['k4'], tags: ['ultimate', 'zone', 'cc', 'frost'], elem: 'frost', behavior: 'm_u_tormenta', req: 15, coef: 0.6, cd: 55, radius: 6, dur: 8, interval: 0.5, slowPct: 40, freeze: 1.5, freezeAt: 5, color: 12577279, desc: 'Definitiva: una ventisca te sigue durante 8 s (6 m): 60 % de daño cada 0,5 s (960 % en total), ralentiza un 40 % y congela 1,5 s a quien encadena 5 golpes (con rendimientos decrecientes). Enfriamiento 55 s.' }
  { id: 'm_u_tormenta', name: 'Tormenta Glacial', icon: '🌨️', cat: 'ultimate', req: 15, spec: 'crionte', elem: 'frost', coef: 0.9, cd: 50, line: 'Una ventisca te sigue 8 s: daña cada 0,5 s a 4 m y pone 1 capa por golpe.', art: 'skills256/m_u_tormenta.webp', todo: 'KA1: tipo genérico, verbos (§3.6) y números desde el doc de la clase' },
  // juego actual: { id: 'a_orbe', name: 'Orbe Arcano', icon: '🔵', kind: 'talent', cat: 'spec', slots: ['k3'], tags: ['spec', 'proj', 'arcane'], elem: 'arcane', type: 'proj', behavior: 'a_orbe', req: 10, coef: 2, cost: 20, cd: 8, speed: 6, range: 14, pierce: true, bounces: 2, color: 11766015, desc: 'Insignia de la Arcanista: un orbe lento que atraviesa a los enemigos y rebota 2 veces (200 % del arma por impacto). Cuesta 20 de Maná; enfriamiento 8 s.' }
  { id: 'a_orbe', name: 'Orbe Arcano', icon: '🔵', cat: 'spec', req: 10, spec: 'arcanista', elem: 'arcane', coef: 1.6, cost: 20, cd: 8, line: 'Lanzas un orbe lento que atraviesa y rebota 2 veces entre enemigos.', art: 'talents/maga-arcanista-s0.webp', todo: 'KA1: tipo genérico, verbos (§3.6) y números desde el doc de la clase' },
  // juego actual: { id: 'a_sello', name: 'Sello del Archimago', icon: '🔯', kind: 'talent', cat: 'spec', slots: ['k3'], tags: ['spec', 'mark', 'arcane'], elem: 'arcane', type: 'mark', behavior: 'a_sello', req: 10, cd: 45, dur: 8, range: 12, storePct: 25, charges: 4, color: 14725375, desc: 'Marcas a un objetivo 8 s y ganas 4 Cargas Arcanas: el sello guarda el 25 % del daño que recibe y, al expirar, estalla con todo. Enfriamiento 45 s.' }
  { id: 'a_sello', name: 'Sello del Archimago', icon: '🔯', cat: 'utility', req: 12, spec: 'arcanista', elem: 'arcane', cd: 20, line: 'Círculo de 4 m durante 8 s: dentro, tus hechizos cuestan un 30 % menos y ganas 1 Carga cada 2 s.', art: 'talents/maga-arcanista-s9.webp', todo: 'KA1: tipo genérico, verbos (§3.6) y números desde el doc de la clase' },
  // juego actual: { id: 'rayo', name: 'Rayo', icon: '⚡', cat: 'spender', slots: ['rmb', 'k2'], tags: ['spender', 'proj', 'arcane'], elem: 'arcane', type: 'proj', req: 8, coef: 2.3, cost: 20, cd: 2.2, lockT: 0.3, speed: 18, range: 13, pierce: true, beam: true, color: 16772710, desc: 'Un rayo arcano que atraviesa a todos los enemigos en línea (230 % de daño). Cuesta 20 de Maná; enfriamiento 2,2 s.' }
  { id: 'rayo', name: 'Rayo', icon: '⚡', cat: 'spender', req: 14, spec: 'arcanista', elem: 'arcane', coef: 2.4, cost: 22, cd: 2, line: 'Rayo de 15 m que atraviesa en línea y gasta tus Cargas: +35 % de daño y 5 de maná por Carga.', art: 'skills256/rayo.webp', todo: 'KA1: tipo genérico, verbos (§3.6) y números desde el doc de la clase' },
  // juego actual: { id: 'm_u_desgarro', name: 'Desgarro Arcano', icon: '🌌', cat: 'ultimate', slots: ['k4'], tags: ['ultimate', 'channel', 'arcane'], elem: 'arcane', type: 'channel', unstoppable: true, req: 15, coef: 4.4, channelT: 3, ticks: 6, cd: 45, range: 10, color: 13798655, desc: 'Definitiva: canalizas un rayo arcano gigante durante 3 s contra un objetivo (880 % de daño por segundo, 2640 % en total). Eres imparable mientras dura; mantén la tecla. Enfriamiento 45 s.' }
  { id: 'm_u_desgarro', name: 'Desgarro Arcano', icon: '🌌', cat: 'ultimate', req: 15, spec: 'arcanista', elem: 'arcane', coef: 1.2, cd: 50, line: 'Canalizas 3 s un rayo gigante; te da 1 Carga cada medio segundo.', art: 'skills256/m_u_desgarro.webp', todo: 'KA1: tipo genérico, verbos (§3.6) y números desde el doc de la clase' },
  // juego actual: { id: 'm_t_bloque', name: 'Bloque de Hielo', icon: '🧊', kind: 'talent', cat: 'defense', slots: ['k2'], tags: ['defense', 'frost'], elem: 'frost', behavior: 'm_t_bloque', req: 10, cd: 90, dur: 4, color: 10478591, desc: 'Te encierras en hielo: eres inmune durante 4 s, pero no puedes moverte ni atacar (esquiva para romperlo antes). Enfriamiento 90 s.' }
  { id: 'm_t_bloque', name: 'Bloque de Hielo', icon: '🧊', kind: 'talent', cat: 'defense', slots: ['k2'], tags: ['defense', 'frost'], elem: 'frost', req: 21, cd: 90, behavior: 'm_t_bloque', dur: 4, color: 10478591, grantBy: 'c11', line: 'Te encierras en hielo 4 s: no recibes daño, pero no te mueves.', desc: 'Te encierras en hielo: eres inmune durante 4 s, pero no puedes moverte ni atacar (esquiva para romperlo antes). Enfriamiento 90 s.', art: 'talents/maga-clase-c12.webp', todo: 'existe en el juego: revisar texto y números contra la línea 2g' },
  // juego actual: { id: 'm_t_inversion', name: 'Inversión del Tiempo', icon: '⏳', kind: 'talent', cat: 'defense', slots: ['k2'], tags: ['defense', 'arcane'], elem: 'arcane', behavior: 'm_t_inversion', req: 10, cd: 60, rewind: 5, color: 14140159, desc: 'Vuelves a la vida y a la posición que tenías hace 5 s (el hilo del tiempo se graba desde que conoces esta activa). Enfriamiento 60 s.' }
  { id: 'm_t_inversion', name: 'Inversión del Tiempo', icon: '⏳', kind: 'talent', cat: 'defense', slots: ['k2'], tags: ['defense', 'arcane'], elem: 'arcane', req: 27, cd: 60, behavior: 'm_t_inversion', rewind: 5, color: 14140159, grantBy: 'c17', line: 'Vuelves a la vida y al lugar que tenías hace 5 s.', desc: 'Vuelves a la vida y a la posición que tenías hace 5 s (el hilo del tiempo se graba desde que conoces esta activa). Enfriamiento 60 s.', art: 'talents/maga-clase-c12.webp', todo: 'existe en el juego: revisar texto y números contra la línea 2g' },
  // juego actual: { id: 'm_t_contrahechizo', name: 'Contrahechizo', icon: '🚫', kind: 'talent', cat: 'utility', slots: ['k2'], tags: ['utility', 'interrupt', 'arcane'], elem: 'arcane', behavior: 'm_t_contrahechizo', req: 10, cd: 18, range: 12, silence: 3, stagger: 20, color: 13404415, desc: 'Interrumpes al lanzador enemigo a 12 m y lo silencias 3 s; a los jefes les sumas 20 de stagger. Enfriamiento 18 s.' }
  { id: 'm_t_contrahechizo', name: 'Contrahechizo', icon: '🚫', kind: 'talent', cat: 'utility', slots: ['k2'], tags: ['utility', 'interrupt', 'arcane'], elem: 'arcane', req: 31, cd: 18, behavior: 'm_t_contrahechizo', range: 12, silence: 3, stagger: 20, color: 13404415, grantBy: 'c22', line: 'Corta el hechizo de un enemigo a 12 m y lo deja mudo 3 s.', desc: 'Interrumpes al lanzador enemigo a 12 m y lo silencias 3 s; a los jefes les sumas 20 de stagger. Enfriamiento 18 s.', art: 'talents/maga-clase-c5.webp', todo: 'existe en el juego: revisar texto y números contra la línea 2g' },
  { id: 'm_h_detener', name: 'Detener el Tiempo', icon: '✦', kind: 'talent', cat: 'utility', slots: ['k2'], tags: ['utility', 'arcane'], elem: 'arcane', req: 72, cd: 75, grantBy: 't4', hero: true, line: 'Paras el tiempo 3 s a 8 m: los enemigos quedan quietos.', desc: 'Paras el tiempo 3 s a 8 m: los enemigos quedan quietos.', art: 'talents/maga-arcanista-s9.webp', todo: 'NUEVA: tipo genérico o comportamiento (KA1)' },
  { id: 'm_h_palabra', name: 'Palabra de Poder', icon: '✦', kind: 'talent', cat: 'utility', slots: ['k2'], tags: ['utility', 'arcane'], elem: 'arcane', req: 72, cd: 40, grantBy: 'e4', hero: true, line: 'Escribes al instante 3 runas a tu alrededor: formas un Sello donde estás.', desc: 'Escribes al instante 3 runas a tu alrededor: formas un Sello donde estás.', art: 'talents/maga-arcanista-s9.webp', todo: 'NUEVA: tipo genérico o comportamiento (KA1)' },
  { id: 'm_h_constructo', name: 'Llamar Constructo', icon: '✦', kind: 'talent', cat: 'defense', slots: ['k2'], tags: ['defense', 'arcane'], elem: 'arcane', req: 74, cd: 45, grantBy: 'f8', hero: true, line: 'Un Constructo aparece 10 s y los enemigos a 8 m lo atacan a él.', desc: 'Un Constructo aparece 10 s y los enemigos a 8 m lo atacan a él.', art: 'talents/maga-clase-c15.webp', todo: 'NUEVA: tipo genérico o comportamiento (KA1)' },
];

// Forja: ids estables <id>_i / <id>_ii; papeles UNI · AREA · CTRL · AGU · APO · MOV; Mejora a Nv req+3, variantes a req+6
export const MAGA_SKILL_FORGE = {
  m_dardo: {
    // k: ★add{speed:+40%} · range +20
    mejora: { name: 'Dardo Veloz', icon: 'forge/mejora', line: '+40 % de velocidad del proyectil y +2 m de alcance.' },
    vars: [
      // k: ★elem fire · ★set{splash:.3, radius:1.5} (absorbe a Ascua)
      { id: 'm_dardo_i', name: 'Saeta Ígnea', role: 'AREA', icon: 'forge/v_m_dardo_i', line: 'Se vuelve de Fuego y estalla a 1,5 m (30 %).' },
      // k: ★elem frost · slow 1.5 · slowPct 20 · dmg −10 (absorbe a Toque Gélido)
      { id: 'm_dardo_ii', name: 'Saeta Gélida', role: 'CTRL', icon: 'forge/v_m_dardo_ii', line: 'Se vuelve de Hielo: ralentiza 20 % 1,5 s; −10 % daño.' },
    ],
  },
  bola_fuego: {
    // k: radius +30
    mejora: { name: 'Núcleo Inestable', icon: 'forge/mejora', line: 'Explosión 2 → 2,6 m.' },
    vars: [
      // k: ★set{windup:0, speed:22} · ★add{splash:−.6}
      { id: 'bola_fuego_i', name: 'Pirodardo', role: 'UNI', icon: 'forge/v_bola_fuego_i', line: 'Sin preparación y muy rápida; explosión 40 %.' },
      // k: ★power v_racimo (onHit)
      { id: 'bola_fuego_ii', name: 'Racimo', role: 'AREA', icon: 'forge/v_bola_fuego_ii', line: 'Al explotar suelta 3 brasas que estallan (40 % c/u).' },
    ],
  },
  nova_hielo: {
    // k: slowPct 40
    mejora: { name: 'Escarcha Profunda', icon: 'forge/mejora', line: 'Ralentiza 30 → 40 %.' },
    vars: [
      // k: ★shieldGain 3/15
      { id: 'nova_hielo_i', name: 'Corazón de Hielo', role: 'AGU', icon: 'forge/v_nova_hielo_i', line: 'Escudo del 3 % de vida por golpeado (máx. 15 %).' },
      // k: ★power v_fractura (condAdd)
      { id: 'nova_hielo_ii', name: 'Nova Fracturante', role: 'UNI', icon: 'forge/v_nova_hielo_ii', line: '+40 % de daño a enemigos ya ralentizados.' },
    ],
  },
  m_parpadeo: {
    // k: range +25
    mejora: { name: 'Salto Largo', icon: 'forge/mejora', line: 'Alcance 8 → 10 m.' },
    vars: [
      // k: ★charges 2
      { id: 'm_parpadeo_i', name: 'Doble Parpadeo', role: 'MOV', icon: 'forge/v_m_parpadeo_i', line: '2 cargas (12 s cada una).' },
      // k: ★behavior v_parpadeo_onda (lo de m_onda) · coef .8 (absorbe a Onda Repulsora)
      { id: 'm_parpadeo_ii', name: 'Parpadeo Disruptor', role: 'CTRL', icon: 'forge/v_m_parpadeo_ii', line: 'Al llegar empujas 3 m y aturdes 0,5 s (80 %).' },
    ],
  },
  m_barrera: {
    // k: durS 2
    mejora: { name: 'Burbuja Estable', icon: 'forge/mejora', line: 'Dura 8 → 10 s.' },
    vars: [
      // k: ★elem frost · ★power v_reactiva (absorbe a Armadura de Hielo)
      { id: 'm_barrera_i', name: 'Barrera Gélida', role: 'CTRL', icon: 'forge/v_m_barrera_i', line: 'Se vuelve de Hielo: al romperse congela 1,5 s a 3 m.' },
      // k: ★power v_coraza_arcana
      { id: 'm_barrera_ii', name: 'Coraza Arcana', role: 'UNI', icon: 'forge/v_m_barrera_ii', line: 'Mientras aguanta, +15 % de daño de hechizos.' },
    ],
  },
  p_llamarada: {
    // k: ★set{angle:90}
    mejora: { name: 'Llama Ancha', icon: 'forge/mejora', line: 'Cono 70 → 90°.' },
    vars: [
      // k: ★set{angle:25, radius:10} · dmg +50
      { id: 'p_llamarada_i', name: 'Lanza de Llamas', role: 'UNI', icon: 'forge/v_p_llamarada_i', line: 'Cono de 25° y 10 m; +50 % de daño.' },
      // k: ★set{type:area, at:self, radius:5} · dmg −15
      { id: 'p_llamarada_ii', name: 'Erupción', role: 'AREA', icon: 'forge/v_p_llamarada_ii', line: 'Anillo de 5 m a tu alrededor; −15 % de daño.' },
    ],
  },
  m_estela_ignea: {
    // k: durS 1
    mejora: { name: 'Rastro Ardiente', icon: 'forge/mejora', line: 'El fuego dura 3 → 4 s.' },
    vars: [
      // k: radius +100 · dmg +37
      { id: 'm_estela_ignea_i', name: 'Senda de Llamas', role: 'AREA', icon: 'forge/v_m_estela_ignea_i', line: 'Rastro el doble de ancho (3 m) y 55 %/s.' },
      // k: ★set{blocks:true} · dmg −50 · campo p_muro_fuego (absorbe a Muro de Fuego)
      { id: 'm_estela_ignea_ii', name: 'Muro de Llamas', role: 'CTRL', icon: 'forge/v_m_estela_ignea_ii', line: 'El rastro corta el paso 3 s (no a jefes); −50 % daño.' },
    ],
  },
  meteoro: {
    // k: ★set{impactDelay:.45}
    mejora: { name: 'Puntería Ígnea', icon: 'forge/mejora', line: 'Cae a los 0,45 s.' },
    vars: [
      // k: ★set{impacts:3, scatter:2.5} · behavior v_meteoritos
      { id: 'meteoro_i', name: 'Lluvia de Meteoritos', role: 'AREA', icon: 'forge/v_meteoro_i', line: '3 meteoritos (55 % c/u, 2,2 m) en un área de 5 m.' },
      // k: dmg +60 · stun 1 · cdr −50
      { id: 'meteoro_ii', name: 'Meteoro Ancestral', role: 'UNI', icon: 'forge/v_meteoro_ii', line: '+60 % de daño y aturde 1 s; enfriamiento 6 → 9 s.' },
    ],
  },
  m_u_supernova: {
    // k: ★pull 2
    mejora: { name: 'Gravedad Solar', icon: 'forge/mejora', line: 'Atrae 2 m antes de estallar.' },
    vars: [
      // k: ★set{follow:true, pulses:4} · behavior
      { id: 'm_u_supernova_i', name: 'Sol Errante', role: 'AREA', icon: 'forge/v_m_u_supernova_i', line: 'La estrella te sigue 4 s y estalla 4 veces (380 %).' },
      // k: ★set{pulses:1, radius:3, coef:13}
      { id: 'm_u_supernova_ii', name: 'Colapso', role: 'UNI', icon: 'forge/v_m_u_supernova_ii', line: 'Una sola onda de 1300 % en 3 m.' },
    ],
  },
  k_prision: {
    // k: radius +25
    mejora: { name: 'Celda Amplia', icon: 'forge/mejora', line: 'Radio 4 → 5 m.' },
    vars: [
      // k: ★set{at:target, range:15, radius:1.5} · stun 3
      { id: 'k_prision_i', name: 'Celda Lejana', role: 'UNI', icon: 'forge/v_k_prision_i', line: 'La lanzas a 15 m sobre un solo enemigo: lo encierra 3 s.' },
      // k: ★set{type:wall, length:8} · campo k_muralla
      { id: 'k_prision_ii', name: 'Muralla de Hielo', role: 'CTRL', icon: 'forge/v_k_prision_ii', line: 'Un muro de hielo de 8 m corta el paso 3 s y da 1 capa al tocarlo.' },
    ],
  },
  m_paso_escarcha: {
    // k: durS 1
    mejora: { name: 'Hielo Duradero', icon: 'forge/mejora', line: 'El hielo dura 3 → 4 s.' },
    vars: [
      // k: ★charges 2
      { id: 'm_paso_escarcha_i', name: 'Paso Doble', role: 'MOV', icon: 'forge/v_m_paso_escarcha_i', line: '2 cargas (10 s cada una).' },
      // k: ★power v_prision_fugaz
      { id: 'm_paso_escarcha_ii', name: 'Prisión Fugaz', role: 'CTRL', icon: 'forge/v_m_paso_escarcha_ii', line: 'Al llegar, congelas 1 s a los que están a 2 m.' },
    ],
  },
  k_lanza: {
    // k: range +17 · dmg +15
    mejora: { name: 'Punta Afilada', icon: 'forge/mejora', line: '+2 m de alcance y +15 % de daño.' },
    vars: [
      // k: ★set{pierce:0} · dmg +60 · layers 2
      { id: 'k_lanza_i', name: 'Lanza Pesada', role: 'UNI', icon: 'forge/v_k_lanza_i', line: 'No atraviesa; +60 % de daño y deja 2 capas.' },
      // k: ★set{count:3, spread:30} · dmg −50
      { id: 'k_lanza_ii', name: 'Abanico Gélido', role: 'AREA', icon: 'forge/v_k_lanza_ii', line: '3 lanzas en abanico; 50 % cada una.' },
    ],
  },
  m_u_tormenta: {
    // k: ★power v_ojo
    mejora: { name: 'Ojo Tranquilo', icon: 'forge/mejora', line: 'Dentro, tú recibes un 10 % menos de daño.' },
    vars: [
      // k: ★set{follow:false, radius:6}
      { id: 'm_u_tormenta_i', name: 'Ventisca Anclada', role: 'AREA', icon: 'forge/v_m_u_tormenta_i', line: 'Se queda fija donde la lanzas, 6 m de radio.' },
      // k: ★set{pulses:1, radius:2.5, coef:11} · freeze 2
      { id: 'm_u_tormenta_ii', name: 'Granizo', role: 'UNI', icon: 'forge/v_m_u_tormenta_ii', line: 'Un solo pedrisco de 1100 % sobre el objetivo; congela 2 s.' },
    ],
  },
  a_orbe: {
    // k: radius +30
    mejora: { name: 'Orbe Grande', icon: 'forge/mejora', line: '+30 % de tamaño.' },
    vars: [
      // k: ★set{speed:2x, bounce:0} · dmg +40
      { id: 'a_orbe_i', name: 'Orbe Veloz', role: 'UNI', icon: 'forge/v_a_orbe_i', line: 'El doble de rápido; +40 % de daño y sin rebotes.' },
      // k: ★set{count:2, spread:25} · dmg −40
      { id: 'a_orbe_ii', name: 'Orbe Gemelo', role: 'AREA', icon: 'forge/v_a_orbe_ii', line: 'Lanzas 2 orbes en V; 60 % cada uno.' },
    ],
  },
  a_sello: {
    // k: durS 2
    mejora: { name: 'Sello Firme', icon: 'forge/mejora', line: 'Dura 8 → 10 s.' },
    vars: [
      // k: ★power v_sello_ofensivo
      { id: 'a_sello_i', name: 'Sello Ofensivo', role: 'UNI', icon: 'forge/v_a_sello_i', line: 'Dentro, tus críticos hacen +25 %; ya no abarata.' },
      // k: ★set{slowPct:40}
      { id: 'a_sello_ii', name: 'Sello de Contención', role: 'CTRL', icon: 'forge/v_a_sello_ii', line: 'Los enemigos que entran quedan ralentizados un 40 %.' },
    ],
  },
  rayo: {
    // k: range +20
    mejora: { name: 'Rayo Largo', icon: 'forge/mejora', line: 'Alcance 15 → 18 m.' },
    vars: [
      // k: ★set{chain:3} · chainPct 70
      { id: 'rayo_i', name: 'Rayo en Cadena', role: 'AREA', icon: 'forge/v_rayo_i', line: 'Salta a 3 enemigos cercanos (70 % cada salto).' },
      // k: ★set{type:channel, dur:1.5} · dmg +80
      { id: 'rayo_ii', name: 'Haz Concentrado', role: 'UNI', icon: 'forge/v_rayo_ii', line: 'Lo canalizas 1,5 s: +80 % al primero que toca.' },
    ],
  },
  m_u_desgarro: {
    // k: ★set{moveWhileChannel:0.4}
    mejora: { name: 'Desgarro Estable', icon: 'forge/mejora', line: 'Puedes moverte despacio mientras lo canalizas.' },
    vars: [
      // k: ★set{type:field, dur:5, radius:3}
      { id: 'm_u_desgarro_i', name: 'Brecha', role: 'AREA', icon: 'forge/v_m_u_desgarro_i', line: 'Abre una grieta en el suelo 5 s que daña a todos a 3 m.' },
      // k: ★set{pulses:1, coef:9}
      { id: 'm_u_desgarro_ii', name: 'Quiebre', role: 'UNI', icon: 'forge/v_m_u_desgarro_ii', line: 'Un solo pulso de 900 % al final; no se canaliza.' },
    ],
  },
};

// Barra, forja ('i'/'ii'; el mockup usa 'A'/'B') y habilidad seleccionada al elegir la especialización (D6)
export const MAGA_SPEC_BAR = {
  piromante: { bar: { lmb: 'm_dardo', rmb: 'bola_fuego', k1: 'm_estela_ignea', k2: 'meteoro', k3: 'p_llamarada', k4: 'm_u_supernova' }, forge: { m_dardo: 'i', bola_fuego: 'ii', m_parpadeo: 'i' }, sel: 'bola_fuego' },
  crionte: { bar: { lmb: 'm_dardo', rmb: 'k_lanza', k1: 'm_paso_escarcha', k2: 'nova_hielo', k3: 'k_prision', k4: 'm_u_tormenta' }, forge: { m_dardo: 'ii', nova_hielo: 'ii' }, sel: 'k_lanza' },
  arcanista: { bar: { lmb: 'm_dardo', rmb: 'rayo', k1: 'm_parpadeo', k2: 'a_sello', k3: 'a_orbe', k4: 'm_u_desgarro' }, forge: { m_parpadeo: 'i', m_barrera: 'ii' }, sel: 'rayo' },
};
export const MAGA_FORGE_RECO = {
  piromante: { m_dardo: 'i', bola_fuego: 'ii', meteoro: 'i', m_u_supernova: 'i', p_llamarada: 'ii' },
  crionte: { m_dardo: 'ii', nova_hielo: 'ii', m_toque: 'i', m_u_tormenta: 'i', m_paso_escarcha: 'ii' },
  arcanista: { rayo: 'ii', m_u_desgarro: 'ii', m_onda: 'i', m_armadura: 'ii' },
};
export const MAGA_FALLBACK_BAR = { lmb: 'm_dardo', rmb: 'bola_fuego', k1: 'm_parpadeo', k2: 'm_barrera', k3: null, k4: null };
export const MAGA_CATALOG_V = 2;
