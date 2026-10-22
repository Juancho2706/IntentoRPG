/* =====================================================================================================
 * Talentos v2 · MAGA (Paso 2g v4, aprobada por el dueño: commits d75e7ed y d8dd49c)
 * -----------------------------------------------------------------------------------------------------
 * Es la clase de REFERENCIA del formato: el Guerrero y la Arquera copian esta estructura.
 * Diseño: docs/paso2g-maga-coherencia.md (§17 = plantilla para otras clases) · contrato: data/README-talents-v2.md
 * Mockup: docs/mockups/skills-ux.html?cls=maga&view=talents (abrir como file:///)
 * Validar: node docs/mockups/data/validar-talentos.mjs maga
 * Los bloques de abajo son los del mockup v4 copiados tal cual (sin cambiar ni un dato); solo cambia dónde viven.
 * ===================================================================================================== */
(function () {
'use strict';
const TV2 = window.TV2;
const { n1 } = TV2;                              // n1(1.05) → "1,05"
const I = id => `talents/maga-${id}.webp`;       // icono de nodo: I('clase-c6') → talents/maga-clase-c6.webp

// ============================================================ LIBRO: catálogo de la Maga
// kit base (toda Maga, Nv1–8) · activas que concede un nodo de elección (ranura 2) · kit de cada especialización (Nv10–15)
const CATALOG = [
  // — KIT BASE (toda Maga, Nv1–8): un hechizo por elemento + utilidad arcana —
  { id:'m_dardo', n:'Dardo Arcano', cat:'basic', req:1, elem:'arcane', coef:1.05, gen:3, s:'Dispara un dardo a 20 m. Cada impacto te devuelve 3 de maná.',
    M:{ n:'Dardo Veloz', s:'+40 % de velocidad del proyectil y +2 m de alcance.', k:'★add{speed:+40%} · range +20' },
    A:{ n:'Saeta Ígnea', r:'AREA', s:'Se vuelve de Fuego y estalla a 1,5 m (30 %).', k:'★elem fire · ★set{splash:.3, radius:1.5} (absorbe a Ascua)' },
    B:{ n:'Saeta Gélida', r:'CTRL', s:'Se vuelve de Hielo: ralentiza 20 % 1,5 s; −10 % daño.', k:'★elem frost · slow 1.5 · slowPct 20 · dmg −10 (absorbe a Toque Gélido)' } },
  { id:'bola_fuego', n:'Bola de Fuego', cat:'spender', req:2, elem:'fire', coef:2.2, cost:18, cd:1.5, s:'Lanza una bola que golpea y explota a 2 m a su alrededor.', innate:{ piromante:'Piromante: explosión 100 → 350 %' },
    M:{ n:'Núcleo Inestable', s:'Explosión 2 → 2,6 m.', k:'radius +30' },
    A:{ n:'Pirodardo', r:'UNI', s:'Sin preparación y muy rápida; explosión 40 %.', k:'★set{windup:0, speed:22} · ★add{splash:−.6}' },
    B:{ n:'Racimo', r:'AREA', s:'Al explotar suelta 3 brasas que estallan (40 % c/u).', k:'★power v_racimo (onHit)' } },
  { id:'nova_hielo', n:'Nova de Hielo', cat:'spender', req:8, elem:'frost', coef:1.4, cost:25, cd:4, s:'Onda de hielo a tu alrededor (3,3 m): daña y ralentiza un 30 % 3 s.',
    M:{ n:'Escarcha Profunda', s:'Ralentiza 30 → 40 %.', k:'slowPct 40' },
    A:{ n:'Corazón de Hielo', r:'AGU', s:'Escudo del 3 % de vida por golpeado (máx. 15 %).', k:'★shieldGain 3/15' },
    B:{ n:'Nova Fracturante', r:'UNI', s:'+40 % de daño a enemigos ya ralentizados.', k:'★power v_fractura (condAdd)' } },
  { id:'m_parpadeo', n:'Parpadeo', cat:'movement', req:4, elem:'arcane', cd:12, icon:'talents/maga-clase-c3.webp', s:'Te teletransportas 8 m hacia el cursor, atravesando enemigos.',
    M:{ n:'Salto Largo', s:'Alcance 8 → 10 m.', k:'range +25' },
    A:{ n:'Doble Parpadeo', r:'MOV', s:'2 cargas (12 s cada una).', k:'★charges 2' },
    B:{ n:'Parpadeo Disruptor', r:'CTRL', s:'Al llegar empujas 3 m y aturdes 0,5 s (80 %).', k:'★behavior v_parpadeo_onda (lo de m_onda) · coef .8 (absorbe a Onda Repulsora)' } },
  { id:'m_barrera', n:'Barrera de Maná', cat:'defense', req:6, elem:'arcane', cd:20, icon:'talents/maga-clase-c2.webp', s:'Escudo que absorbe daño igual al 60 % de tu maná máximo; dura 8 s.',
    M:{ n:'Burbuja Estable', s:'Dura 8 → 10 s.', k:'durS 2' },
    A:{ n:'Barrera Gélida', r:'CTRL', s:'Se vuelve de Hielo: al romperse congela 1,5 s a 3 m.', k:'★elem frost · ★power v_reactiva (absorbe a Armadura de Hielo)' },
    B:{ n:'Coraza Arcana', r:'UNI', s:'Mientras aguanta, +15 % de daño de hechizos.', k:'★power v_coraza_arcana' } },
  // — activas de clase que se eligen en un nodo de elección del árbol de clase (ranura 2) —
  { id:'m_t_bloque', n:'Bloque de Hielo', cat:'defense', req:21, talent:true, grantBy:'c11', elem:'frost', cd:90, icon:'talents/maga-clase-c12.webp', s:'Te encierras en hielo 4 s: no recibes daño, pero no te mueves.' },
  { id:'m_t_inversion', n:'Inversión del Tiempo', cat:'defense', req:27, talent:true, grantBy:'c17', elem:'arcane', cd:60, icon:'talents/maga-clase-c12.webp', s:'Vuelves a la vida y al lugar que tenías hace 5 s.' },
  { id:'m_t_contrahechizo', n:'Contrahechizo', cat:'utility', req:31, talent:true, grantBy:'c22', elem:'arcane', cd:18, icon:'talents/maga-clase-c5.webp', s:'Corta el hechizo de un enemigo a 12 m y lo deja mudo 3 s.' },
  { id:'m_h_detener', n:'Detener el Tiempo', cat:'utility', req:72, talent:true, grantBy:'t4', hero:true, elem:'arcane', cd:75, icon:'talents/maga-arcanista-s9.webp', s:'Paras el tiempo 3 s a 8 m: los enemigos quedan quietos.' },
  { id:'m_h_palabra', n:'Palabra de Poder', cat:'utility', req:72, talent:true, grantBy:'e4', hero:true, elem:'arcane', cd:40, icon:'talents/maga-arcanista-s9.webp', s:'Escribes al instante 3 runas a tu alrededor: formas un Sello donde estás.' },
  { id:'m_h_constructo', n:'Llamar Constructo', cat:'defense', req:73, talent:true, grantBy:'f8', hero:true, elem:'arcane', cd:45, icon:'talents/maga-clase-c15.webp', s:'Un Constructo aparece 10 s y los enemigos a 8 m lo atacan a él.' },
  // — KIT DEL PIROMANTE (solo con la especialización; Nv10–15) —
  { id:'p_llamarada', n:'Llamarada', cat:'spec', req:10, spec:'piromante', elem:'fire', coef:1.5, cost:25, cd:8, icon:'talents/maga-piromante-s0.webp', s:'Cono de fuego de 7 m; hace estallar las quemaduras (60 % de lo que les queda).',
    M:{ n:'Llama Ancha', s:'Cono 70 → 90°.', k:'★set{angle:90}' },
    A:{ n:'Lanza de Llamas', r:'UNI', s:'Cono de 25° y 10 m; +50 % de daño.', k:'★set{angle:25, radius:10} · dmg +50' },
    B:{ n:'Erupción', r:'AREA', s:'Anillo de 5 m a tu alrededor; −15 % de daño.', k:'★set{type:area, at:self, radius:5} · dmg −15' } },
  { id:'m_estela_ignea', n:'Estela Ígnea', cat:'movement', req:12, spec:'piromante', elem:'fire', coef:0.4, cd:10, s:'Te deslizas 6 m y dejas el suelo ardiendo 3 s.',
    M:{ n:'Rastro Ardiente', s:'El fuego dura 3 → 4 s.', k:'durS 1' },
    A:{ n:'Senda de Llamas', r:'AREA', s:'Rastro el doble de ancho (3 m) y 55 %/s.', k:'radius +100 · dmg +37' },
    B:{ n:'Muro de Llamas', r:'CTRL', s:'El rastro corta el paso 3 s (no a jefes); −50 % daño.', k:'★set{blocks:true} · dmg −50 · campo p_muro_fuego (absorbe a Muro de Fuego)' } },
  { id:'meteoro', n:'Meteoro', cat:'spender', req:14, spec:'piromante', elem:'fire', coef:3.7, cost:40, cd:6, s:'Un meteoro cae donde apuntas a los 0,6 s y golpea en 3 m.',
    M:{ n:'Puntería Ígnea', s:'Cae a los 0,45 s.', k:'★set{impactDelay:.45}' },
    A:{ n:'Lluvia de Meteoritos', r:'AREA', s:'3 meteoritos (55 % c/u, 2,2 m) en un área de 5 m.', k:'★set{impacts:3, scatter:2.5} · behavior v_meteoritos' },
    B:{ n:'Meteoro Ancestral', r:'UNI', s:'+60 % de daño y aturde 1 s; enfriamiento 6 → 9 s.', k:'dmg +60 · stun 1 · cdr −50' } },
  { id:'m_u_supernova', n:'Supernova', cat:'ultimate', req:15, spec:'piromante', elem:'fire', coef:4.7, cd:50, s:'Creas una estrella que estalla 3 veces a tu alrededor y deja a todos quemándose.',
    M:{ n:'Gravedad Solar', s:'Atrae 2 m antes de estallar.', k:'★pull 2' },
    A:{ n:'Sol Errante', r:'AREA', s:'La estrella te sigue 4 s y estalla 4 veces (380 %).', k:'★set{follow:true, pulses:4} · behavior' },
    B:{ n:'Colapso', r:'UNI', s:'Una sola onda de 1300 % en 3 m.', k:'★set{pulses:1, radius:3, coef:13}' } },
  // — KIT DEL CRIONTE (solo con la especialización; Nv10–15) —
  { id:'k_prision', n:'Prisión de Hielo', cat:'spec', req:10, spec:'crionte', elem:'frost', coef:0.8, cost:25, cd:12, icon:'talents/maga-crionte-s0.webp', s:'Encierras en hielo 2 s a los enemigos a 4 m y les pones 2 capas de Escarcha.',
    M:{ n:'Celda Amplia', s:'Radio 4 → 5 m.', k:'radius +25' },
    A:{ n:'Celda Lejana', r:'UNI', s:'La lanzas a 15 m sobre un solo enemigo: lo encierra 3 s.', k:'★set{at:target, range:15, radius:1.5} · stun 3' },
    B:{ n:'Muralla de Hielo', r:'CTRL', s:'Un muro de hielo de 8 m corta el paso 3 s y da 1 capa al tocarlo.', k:'★set{type:wall, length:8} · campo k_muralla' } },
  { id:'m_paso_escarcha', n:'Paso de Escarcha', cat:'movement', req:12, spec:'crionte', elem:'frost', coef:0.3, cd:10, s:'Te deslizas 6 m dejando hielo 3 s que ralentiza un 40 % y pone 1 capa por segundo.',
    M:{ n:'Hielo Duradero', s:'El hielo dura 3 → 4 s.', k:'durS 1' },
    A:{ n:'Paso Doble', r:'MOV', s:'2 cargas (10 s cada una).', k:'★charges 2' },
    B:{ n:'Prisión Fugaz', r:'CTRL', s:'Al llegar, congelas 1 s a los que están a 2 m.', k:'★power v_prision_fugaz' } },
  { id:'k_lanza', n:'Lanza de Hielo', cat:'spender', req:14, spec:'crionte', elem:'frost', coef:2.6, cost:30, cd:4, icon:'talents/maga-crionte-s9.webp', s:'Lanza que atraviesa en línea 12 m; a los Congelados les hace el triple.',
    M:{ n:'Punta Afilada', s:'+2 m de alcance y +15 % de daño.', k:'range +17 · dmg +15' },
    A:{ n:'Lanza Pesada', r:'UNI', s:'No atraviesa; +60 % de daño y deja 2 capas.', k:'★set{pierce:0} · dmg +60 · layers 2' },
    B:{ n:'Abanico Gélido', r:'AREA', s:'3 lanzas en abanico; 50 % cada una.', k:'★set{count:3, spread:30} · dmg −50' } },
  { id:'m_u_tormenta', n:'Tormenta Glacial', cat:'ultimate', req:15, spec:'crionte', elem:'frost', coef:0.9, cd:50, s:'Una ventisca te sigue 8 s: daña cada 0,5 s a 4 m y pone 1 capa por golpe.',
    M:{ n:'Ojo Tranquilo', s:'Dentro, tú recibes un 10 % menos de daño.', k:'★power v_ojo' },
    A:{ n:'Ventisca Anclada', r:'AREA', s:'Se queda fija donde la lanzas, 6 m de radio.', k:'★set{follow:false, radius:6}' },
    B:{ n:'Granizo', r:'UNI', s:'Un solo pedrisco de 1100 % sobre el objetivo; congela 2 s.', k:'★set{pulses:1, radius:2.5, coef:11} · freeze 2' } },
  // — KIT DEL ARCANISTA (solo con la especialización; Nv10–15) —
  { id:'a_orbe', n:'Orbe Arcano', cat:'spec', req:10, spec:'arcanista', elem:'arcane', coef:1.6, cost:20, cd:8, icon:'talents/maga-arcanista-s0.webp', s:'Lanzas un orbe lento que atraviesa y rebota 2 veces entre enemigos.',
    M:{ n:'Orbe Grande', s:'+30 % de tamaño.', k:'radius +30' },
    A:{ n:'Orbe Veloz', r:'UNI', s:'El doble de rápido; +40 % de daño y sin rebotes.', k:'★set{speed:2x, bounce:0} · dmg +40' },
    B:{ n:'Orbe Gemelo', r:'AREA', s:'Lanzas 2 orbes en V; 60 % cada uno.', k:'★set{count:2, spread:25} · dmg −40' } },
  { id:'a_sello', n:'Sello del Archimago', cat:'utility', req:12, spec:'arcanista', elem:'arcane', cd:20, icon:'talents/maga-arcanista-s9.webp', s:'Círculo de 4 m durante 8 s: dentro, tus hechizos cuestan un 30 % menos y ganas 1 Carga cada 2 s.',
    M:{ n:'Sello Firme', s:'Dura 8 → 10 s.', k:'durS 2' },
    A:{ n:'Sello Ofensivo', r:'UNI', s:'Dentro, tus críticos hacen +25 %; ya no abarata.', k:'★power v_sello_ofensivo' },
    B:{ n:'Sello de Contención', r:'CTRL', s:'Los enemigos que entran quedan ralentizados un 40 %.', k:'★set{slowPct:40}' } },
  { id:'rayo', n:'Rayo', cat:'spender', req:14, spec:'arcanista', elem:'arcane', coef:2.4, cost:22, cd:2, s:'Rayo de 15 m que atraviesa en línea y gasta tus Cargas: +35 % de daño y 5 de maná por Carga.',
    M:{ n:'Rayo Largo', s:'Alcance 15 → 18 m.', k:'range +20' },
    A:{ n:'Rayo en Cadena', r:'AREA', s:'Salta a 3 enemigos cercanos (70 % cada salto).', k:'★set{chain:3} · chainPct 70' },
    B:{ n:'Haz Concentrado', r:'UNI', s:'Lo canalizas 1,5 s: +80 % al primero que toca.', k:'★set{type:channel, dur:1.5} · dmg +80' } },
  { id:'m_u_desgarro', n:'Desgarro Arcano', cat:'ultimate', req:15, spec:'arcanista', elem:'arcane', coef:1.2, cd:50, s:'Canalizas 3 s un rayo gigante; te da 1 Carga cada medio segundo.',
    M:{ n:'Desgarro Estable', s:'Puedes moverte despacio mientras lo canalizas.', k:'★set{moveWhileChannel:0.4}' },
    A:{ n:'Brecha', r:'AREA', s:'Abre una grieta en el suelo 5 s que daña a todos a 3 m.', k:'★set{type:field, dur:5, radius:3}' },
    B:{ n:'Quiebre', r:'UNI', s:'Un solo pulso de 900 % al final; no se canaliza.', k:'★set{pulses:1, coef:9}' } },
];

// ============================================================ ESPECIALIZACIONES: metadatos, barra, mecánica y pasiva
// ===================== PASO 2g · MAGA REHECHA: kit base + kit Piromante (docs/paso2g-maga-coherencia.md) =====================
// Reglas: el LIBRO tiene todas las activas (kit base de la clase + kit de cada especialización); los TALENTOS
// son solo pasivas (ningún nodo concede activas). El árbol de clase toca el kit base arcano (Dardo, Parpadeo,
// Barrera) y lo general; el de la especialización, su kit y la habilidad base de su elemento (Bola de Fuego).
// La forja TRANSFORMA (forma, elemento, ritmo); el talento AÑADE o MULTIPLICA (números, sinergias, mecánica).
const M_SPECS = {
  piromante: { id:'piromante', name:'Piromante', role:'Daño en área', mech:'Calor', mechIco:'ui/st_quemadura.webp', line:'Todo arde: la Quemadura se propaga y estalla.', innate:'Bola de Fuego: explosión 100 → 350 %', gauge:'calor' },
  crionte:   { id:'crionte', name:'Crionte', role:'Control', mech:'Escarcha', mechIco:'ui/st_escarcha.webp', line:'Congela, ralentiza y astilla.', innate:'Llenas un 25 % más rápido el Quebranto de los jefes', gauge:'escarcha' },
  arcanista: { id:'arcanista', name:'Arcanista', role:'Un objetivo', mech:'Cargas Arcanas', mechIco:'ui/res_mana.webp', line:'Maná, críticos y cadenas.', innate:'Dardo Arcano: 1 Carga por impacto (máx. 4)', gauge:'cargas' },
};
const SPEC_IDS = ['piromante', 'crionte', 'arcanista'];
// barra, forja y selección recomendadas de cada especialización (las aplica el cambio de especialización)
const SPEC_BAR = {
  piromante: { bar:{ lmb:'m_dardo', rmb:'bola_fuego', k1:'m_estela_ignea', k2:'meteoro', k3:'p_llamarada', k4:'m_u_supernova' }, forge:{ m_dardo:'A', bola_fuego:'B', m_parpadeo:'A' }, sel:'bola_fuego' },
  crionte:   { bar:{ lmb:'m_dardo', rmb:'k_lanza', k1:'m_paso_escarcha', k2:'nova_hielo', k3:'k_prision', k4:'m_u_tormenta' }, forge:{ m_dardo:'B', nova_hielo:'B' }, sel:'k_lanza' },
  arcanista: { bar:{ lmb:'m_dardo', rmb:'rayo', k1:'m_parpadeo', k2:'a_sello', k3:'a_orbe', k4:'m_u_desgarro' }, forge:{ m_parpadeo:'A', m_barrera:'B' }, sel:'rayo' },
};
// la mecánica de cada especialización (textos del tooltip; números de js/spec-mechanics.js)
const MECH_TXT = {
  piromante: { n:'Calor', range:'0–100', ico:'ui/st_quemadura.webp', gen:'+5 por golpe de Fuego (1 por instante)', out:'A 100: Ignición Total. La siguiente Bola de Fuego o Meteoro, gratis y crítica', loss:'−10 por segundo tras 3 s sin ganar', feed:['m_dardo', 'bola_fuego', 'p_llamarada', 'meteoro'], alt:'calor · perFireHit 5 · decayAfter 3 · decayRate 10', feedNames:{ m_dardo:'Saeta Ígnea' } },
  crionte:   { n:'Escarcha', range:'0–5 capas por enemigo', ico:'ui/st_escarcha.webp', gen:'+1 capa por golpe de Hielo; la Nova, +2', out:'A 5 capas: Congelado 1 s. Un jefe queda Aterido 4 s (−30 % de movimiento, −15 % de ataque) y suma 25 de Quebranto', loss:'1 capa cada 2 s sin golpearlo', feed:['m_dardo', 'nova_hielo', 'k_prision', 'k_lanza', 'm_u_tormenta'], alt:'escarcha · max 5 · nova 2 · freezeT 1 · numbT 4 · decayEvery 2', feedNames:{ m_dardo:'Saeta Gélida' } },
  arcanista: { n:'Cargas Arcanas', range:'0–4', ico:'ui/res_mana.webp', gen:'+1 por impacto del Dardo Arcano', out:'El Rayo las gasta todas: +35 % de daño y 5 de maná por Carga', loss:'Todas, 6 s después de la última que ganaste', feed:['m_dardo', 'rayo'], alt:'cargas · max 4 · perDart 1 · dmgPerCharge 35 · manaPerCharge 5 · loseAfter 6' },
};
const SPEC_INNATE_TXT = {
  piromante: { sk:'bola_fuego', n:'Bola de Fuego del Piromante', l:'La explosión pasa del 100 % al 350 % a 2 m.', f:'Con otra especialización vuelve al 100 %' },
  crionte:   { sk:'nova_hielo', n:'Frío que quiebra', l:'Llenas un 25 % más rápido la barra de Quebranto de los jefes.', f:'Se suma al Quebranto de la Prisión y del Congelado' },
  arcanista: { sk:'m_dardo', n:'Dardo del Arcanista', l:'Cada impacto del Dardo Arcano te da 1 Carga Arcana (máx. 4).', f:'Sin Arcanista, el Dardo no genera Cargas' },
};

// ============================================================ ÁRBOLES (clase · especialización · héroe) y BUILDS
// ===== Paso 2g v3 · Talentos de la Maga estilo WoW (fuente única: mockup + tablas del doc) =====
// Nodo: { id, n (nombre), t: p|c|k|f|x (pasiva|elección|clave|final|ápice), tag: 'num'|'mec', r, c, max, req[],
//         d(r) → efecto en el rango r, opts:[{k,n,d,role,act,impl}], win (qué gana cada opción, en palabras),
//         touch:[skillIds], fire:true (todo el Fuego), impl, icon, arch (arquetipo del Piromante) }
// Forma del icono: CÍRCULO = pasivo · CUADRADO = activo (concede una habilidad) · HEXÁGONO = elección A/B.
// Ritmo (nivel máximo 100): especialización en los niveles pares 10–70 (31) · clase en los impares 11–69 (30) y 85/90/95/100 (+4 = 34)
//   · Paragon (árbol héroe) 71–80 (10) solo con la especialización «al máximo» (31/31 ganados y gastados) · tablero de glifos 81–100 salvo 85/90/95/100 (16).
// Puertas (puntos gastados en las filas de ARRIBA): clase 8 → fila 4 y 24 → fila 7 · especialización 8 → fila 4, 20 → fila 7, 25 → ápice.
const TALENTS_V2 = {
  // ---------------------------------------------------------------- CLASE
  cls: [
    { id:'c1', n:'Reservas Profundas', t:'p', tag:'num', r:0, c:1, max:2, d:r=>`+${15*r} % de maná máximo`, icon:I('clase-c6'), impl:'stats.mpPct · existe' },
    { id:'c2', n:'Intelecto Arcano', t:'p', tag:'num', r:0, c:3, max:2, d:r=>`Todos tus hechizos hacen +${6*r} % de daño`, icon:I('clase-c1'), impl:'mod @all dmg · existe' },
    { id:'c3', n:'Reflejos Arcanos', t:'p', tag:'num', r:0, c:5, max:2, d:r=>`Parpadeo se recarga en ${12-2*r} s (antes 12 s)`, touch:['m_parpadeo'], icon:I('clase-c3'), impl:'mod m_parpadeo cdr · existe' },
    { id:'c4', n:'Escudo Prismático', t:'p', tag:'num', r:1, c:0, max:3, req:['c1'], d:r=>`Mientras tengas la Barrera de Maná, recibes un ${8*r} % menos de daño`, touch:['m_barrera'], icon:I('clase-c7'), impl:'tv.barrierDr · existe' },
    { id:'c5', n:'Dardo: Certero o Sifón', t:'c', tag:'mec', r:1, c:2, max:1, req:['c1','c2'], touch:['m_dardo'], icon:I('clase-c4'), opts:[
      { k:'A', n:'Dardo Certero', d:'Cada 4.º Dardo Arcano es crítico seguro', role:'UNI', impl:'power m_dardo_certero · NUEVO' },
      { k:'B', n:'Dardo Sifón', d:'Si el Dardo mata, ganas 6 de maná y tus habilidades principales se recargan 1 s antes', role:'AREA', impl:'power m_dardo_sifon · NUEVO' } ],
      win:'A, contra jefes: un crítico seguro cada ~4 s. B, contra grupos: como mueren muchos, ≈1 habilidad principal extra cada 8 s' },
    { id:'c6', n:'Principal: Núcleo u Onda', t:'c', tag:'num', r:1, c:4, max:1, req:['c2','c3'], touch:['bola_fuego','nova_hielo','meteoro','k_lanza','rayo'], icon:I('clase-c8'), opts:[
      { k:'A', n:'Núcleo Denso', d:'El golpe directo de tus habilidades principales hace +25 %', role:'UNI', impl:'mod @spender dmgDirect · NUEVO (clave)' },
      { k:'B', n:'Onda Expansiva', d:'Las explosiones y áreas de tus habilidades principales hacen +30 %', role:'AREA', impl:'mod @spender splashPct · NUEVO (clave)' } ],
      win:'A, contra jefes (un solo blanco recibe el golpe). B, contra grupos (el área golpea a todos). Sirve igual con Fuego, Hielo o Arcano' },
    { id:'c7', n:'Paso Fugaz', t:'p', tag:'mec', r:1, c:6, max:1, req:['c3'], d:()=>'Después de Parpadeo corres un 30 % más rápido durante 3 s', touch:['m_parpadeo'], icon:I('clase-c11'), impl:'power m_paso_fugaz · NUEVO (afterCast + addBuff)' },
    { id:'c8', n:'Piel de Maná', t:'p', tag:'num', r:2, c:1, max:2, req:['c4','c5'], d:r=>`Con más de la mitad del maná, recibes un ${8*r} % menos de daño`, icon:I('clase-c2'), impl:'tv.drHighMana · existe' },
    { id:'c9', n:'Nova: Congelante o Cortante', t:'c', tag:'mec', r:2, c:3, max:1, req:['c5','c6'], touch:['nova_hielo'], icon:I('crionte-s2'), opts:[
      { k:'A', n:'Nova Congelante', d:'La Nova de Hielo congela 1 s (no a jefes); como mucho una vez cada 8 s', role:'CTRL', impl:'power m_nova_congelante · NUEVO (applyCC freeze)' },
      { k:'B', n:'Nova Cortante', d:'La Nova de Hielo hace +40 % de daño, pero ralentiza 1 s menos', role:'AREA', impl:'mod nova_hielo dmg/slow · claves existentes' } ],
      win:'A, para controlar y sobrevivir: congelas al grupo un 8–12 % del tiempo. B, para matar grupos más rápido' },
    { id:'c10', n:'Ralentizar o Disrupción', t:'c', tag:'mec', r:2, c:5, max:1, req:['c6','c7'], icon:I('clase-c5'), opts:[
      { k:'A', n:'Ralentizar', d:'Cada 8 s, tu siguiente hechizo ralentiza un 50 % durante 4 s', role:'CTRL', impl:'power m_ralentizar · existe' },
      { k:'B', n:'Disrupción', d:'Cada 10 s, tu siguiente Dardo corta el hechizo del enemigo y lo deja mudo 3 s', role:'UNI', touch:['m_dardo'], impl:'power m_disrupcion · NUEVO (lógica de m_t_contrahechizo; +20 de Quebranto a jefes)' } ],
      win:'A, contra grupos que te rodean. B, contra jefes y élites que lanzan hechizos (además llena su barra de Quebranto)' },
    { id:'c11', n:'Bloque de Hielo o Aguante', t:'c', tag:'mec', r:3, c:0, max:1, req:['c8'], icon:I('clase-c12'), opts:[
      { k:'A', n:'Bloque de Hielo', d:'Habilidad (ranura 2): te encierras en hielo 4 s; no recibes daño ni te mueves. Se recarga en 90 s', role:'AGU', act:'m_t_bloque', impl:'activa m_t_bloque · existe' },
      { k:'B', n:'Aguante Arcano', d:'Un golpe que te mataría te deja con 1 de vida y una Barrera gratis. Una vez cada 120 s', role:'AGU', impl:'power m_aguante · NUEVO (onLethal)' } ],
      win:'A, contra golpes de jefe que se ven venir (ocupa la ranura 2). B, siempre activo y sin ocupar ranura' },
    { id:'c12', n:'Flujo de Maná', t:'p', tag:'num', r:3, c:2, max:2, req:['c8','c9'], d:r=>`Cada golpe te devuelve ${2*r} de maná`, icon:I('clase-c10'), impl:'stats.mph · existe' },
    { id:'c13', n:'Mente Afilada', t:'p', tag:'num', r:3, c:4, max:2, req:['c9','c10'], d:r=>`+${5*r} % de probabilidad de crítico`, icon:I('clase-c4'), impl:'stats.crit · existe' },
    { id:'c14', n:'Parpadeo: Runa o Reparo', t:'c', tag:'mec', r:3, c:6, max:1, req:['c10'], touch:['m_parpadeo'], icon:I('clase-c3'), opts:[
      { k:'A', n:'Runa de Escarcha', d:'Donde empieza tu Parpadeo queda una runa que ralentiza un 50 % durante 3 s', role:'CTRL', impl:'power m_runa · NUEVO (spawnField zona)' },
      { k:'B', n:'Parpadeo Reparador', d:'Parpadeo te cura un 8 % de la vida y te quita las ralentizaciones', role:'AGU', impl:'power m_parpadeo_cura · NUEVO (g.heal)' } ],
      win:'A, para escapar de enemigos cuerpo a cuerpo. B, para aguantar peleas largas' },
    { id:'c15', n:'Escudo de Maná o Mente Clara', t:'c', tag:'mec', r:4, c:1, max:1, req:['c11','c12'], icon:I('arcanista-s8'), opts:[
      { k:'A', n:'Escudo de Maná', d:'El 20 % del daño que recibes lo pagas con maná en vez de vida', role:'AGU', impl:'power m_escudo_mana · NUEVO (④ onDamaged)' },
      { k:'B', n:'Mente Clara', d:'Recuperas maná un 30 % más rápido; con el maná lleno, haces +10 % de daño', role:'UNI', impl:'stats regen + tv.highManaDmg · existe' } ],
      win:'A, para sobrevivir (+15–20 % de aguante). B, para hacer daño (+6–8 %: lanzas más habilidades principales)' },
    { id:'c16', n:'Armonía o Pureza Elemental', t:'c', tag:'mec', r:4, c:3, max:1, req:['c12','c13'], icon:I('clase-c9'), opts:[
      { k:'A', n:'Armonía Elemental', d:'Cada vez que cambias de elemento: +8 % de daño 5 s (se suma hasta 3 veces)', role:'UNI', impl:'power m_armonia · NUEVO' },
      { k:'B', n:'Pureza Elemental', d:'3 hechizos seguidos del mismo elemento: +15 % de daño de ese elemento durante 6 s', role:'AREA', impl:'power m_pureza · NUEVO' } ],
      win:'A, si mezclas elementos (Dardo Arcano + Fuego + Nova): hasta +24 %. B, si todo es del mismo elemento (todo Fuego, todo Hielo o todo Arcano): +15 % casi siempre. Es la pieza que une el árbol con la forja' },
    { id:'c17', n:'Inversión o Anclaje', t:'c', tag:'mec', r:4, c:5, max:1, req:['c13','c14'], icon:I('clase-c12'), opts:[
      { k:'A', n:'Inversión del Tiempo', d:'Habilidad (ranura 2): vuelves a la vida y al lugar que tenías hace 5 s. Se recarga en 60 s', role:'AGU', act:'m_t_inversion', impl:'activa m_t_inversion · existe' },
      { k:'B', n:'Anclaje Temporal', d:'Al bajar del 30 % de vida: −30 % de daño recibido y +50 % de velocidad 4 s. Una vez cada 60 s', role:'AGU', impl:'power m_anclaje · NUEVO (onDamaged)' } ],
      win:'A, contra un golpe enorme de jefe (ocupa la ranura 2). B, contra el daño constante de un grupo, sin ocupar ranura' },
    { id:'c18', n:'Barrera Reforzada', t:'p', tag:'num', r:5, c:0, max:2, req:['c15'], d:r=>`La Barrera de Maná absorbe un ${25*r} % más`, touch:['m_barrera'], icon:I('clase-c2'), impl:'mod m_barrera shieldManaPct · claves' },
    { id:'c19', n:'Barrera Resonante', t:'p', tag:'mec', r:5, c:2, max:1, req:['c15','c16'], d:()=>'Con la Barrera puesta, cada Dardo te da 2 de maná y la recarga un 2 % de tu vida', touch:['m_barrera','m_dardo'], icon:I('arcanista-s3'), hyb:'Defensa + Arcano', impl:'power m_barrera_resonante · NUEVO' },
    { id:'c20', n:'Escarcha Arcana', t:'p', tag:'mec', r:5, c:4, max:1, req:['c16','c17'], d:()=>'Tus críticos ralentizan un 30 % 2 s; contra enemigos ralentizados, el Dardo tiene +15 % de crítico', touch:['m_dardo'], icon:I('crionte-s5'), hyb:'Arcano + Control', impl:'power m_escarcha_arcana · NUEVO' },
    { id:'c21', n:'Escarcha Tenaz', t:'p', tag:'num', r:5, c:6, max:1, req:['c17'], d:()=>'Todas tus ralentizaciones duran 2 s más', icon:I('crionte-s3'), impl:'mod @all slow +2 · claves' },
    { id:'c22', n:'Contrahechizo o Canalizador', t:'c', tag:'mec', r:6, c:1, max:1, req:['c18','c19'], icon:I('clase-c5'), opts:[
      { k:'A', n:'Contrahechizo', d:'Habilidad (ranura 2): corta el hechizo de un enemigo a 12 m y lo deja mudo 3 s. Se recarga en 18 s', role:'CTRL', act:'m_t_contrahechizo', impl:'activa m_t_contrahechizo · existe' },
      { k:'B', n:'Canalizador', d:'Los hechizos que cuestan más de 20 de maná cuestan un 20 % menos', role:'UNI', impl:'tv.costRedBig · existe' } ],
      win:'A, en grupo y contra enemigos que lanzan hechizos. B, para hacer daño (+5–7 %)' },
    { id:'c23', n:'Ritmo Arcano', t:'p', tag:'mec', r:6, c:3, max:2, req:['c19','c20'], d:r=>`Cada crítico del Dardo recarga ${n1(0.5*r)} s de Parpadeo y de la Barrera`, touch:['m_dardo','m_parpadeo','m_barrera'], icon:I('clase-c9'), impl:'tv.dartCritCdr · NUEVO' },
    { id:'c24', n:'Celeridad', t:'p', tag:'num', r:6, c:5, max:2, req:['c20','c21'], d:r=>`Lanzas hechizos un ${7*r} % más rápido`, icon:I('clase-c11'), impl:'stats.aspdPct · existe' },
    // penúltimos (fila 7): potentes por sí solos
    { id:'c25', n:'Cristal de Barrera', t:'p', tag:'mec', r:7, c:0, max:3, req:['c22'], d:r=>`Cuando se rompe la Barrera, estalla: empuja 3 m, ralentiza un 40 % 2 s y te devuelve el ${10*r} % del maná`, touch:['m_barrera'], icon:I('clase-c7'), impl:'power m_cristal · NUEVO (onShieldBreak)' },
    { id:'c26', n:'Torrente de Maná', t:'p', tag:'mec', r:7, c:3, max:3, req:['c23'], d:r=>`Si gastas 60 de maná en 3 s, entras en Sobrecarga: +${4+8*r} % de daño durante 4 s`, icon:I('clase-c14'), impl:'power m_torrente · NUEVO (⑪ onResource)' },
    { id:'c27', n:'Imagen Arcana', t:'p', tag:'mec', r:7, c:6, max:3, req:['c24'], d:r=>`Parpadeo deja una copia tuya ${2+r} s; los enemigos a 6 m la atacan a ella`, touch:['m_parpadeo'], icon:I('arcanista-s14'), impl:'power m_imagen · NUEVO (g.forceTarget)' },
    // finales (fila 8): el presupuesto alcanza para UNO
    { id:'c28', n:'Bastión Arcano', t:'f', tag:'mec', r:8, c:0, max:3, req:['c25'], d:r=>`La Barrera ya no caduca: dura hasta que la rompen y vuelve a los 20 s. Con ella, tus hechizos cuestan un ${10*r} % menos`, touch:['m_barrera'], icon:I('clase-c15'), impl:'power m_bastion · NUEVO', final:'Defensa' },
    { id:'c29', n:'Archimaga', t:'f', tag:'mec', r:8, c:3, max:3, req:['c26'], d:r=>`Cada 4.ª habilidad principal se lanza dos veces: la copia es gratis y hace el ${20+20*r} %`, icon:I('clase-c1'), impl:'power m_archimaga · NUEVO (echo del canal)', final:'Arcano' },
    { id:'c30', n:'Paso del Vacío', t:'f', tag:'mec', r:8, c:6, max:3, req:['c27'], d:r=>`Tras Parpadeo, tu siguiente habilidad principal no se recarga y hace +${15*r} %`, touch:['m_parpadeo'], icon:I('arcanista-x3'), impl:'power m_vacio · NUEVO', final:'Movilidad' },
  ],
  // ---------------------------------------------------------------- PIROMANTE
  spec: [
    { id:'s0', n:'Ignición', t:'k', tag:'mec', r:0, c:3, max:1, free:true, d:()=>'Tus golpes de Fuego queman (un 60 % extra del golpe en 4 s) y la Bola de Fuego explota al 350 % (antes 100 %)', fire:true, icon:I('piromante-s0'), impl:'power p_ignicion · existe (+ modifyResolve de la Bola)' },
    { id:'s1', n:'Brasas', t:'p', tag:'num', r:1, c:1, max:3, req:['s0'], d:r=>`Las quemaduras duran ${4+r} s (antes 4 s)`, arch:'brasa', icon:I('piromante-s3'), impl:'tv.burnDur · existe' },
    { id:'s2', n:'Calor Abrasador', t:'p', tag:'num', r:1, c:3, max:3, req:['s0'], d:r=>`+${5*r} % de crítico contra enemigos que se queman`, arch:'ignicion', icon:I('piromante-s5'), impl:'tv.burningCrit · existe' },
    { id:'s3', n:'Mecha Corta', t:'p', tag:'num', r:1, c:5, max:3, req:['s0'], d:r=>`La Bola de Fuego se recarga en ${n1(1.5*(1-0.1*r))} s (antes 1,5 s)`, touch:['bola_fuego'], arch:'cataclismo', icon:I('piromante-s2'), impl:'mod bola_fuego cdr · existe' },
    { id:'s4', n:'Llama Persistente', t:'p', tag:'num', r:2, c:0, max:2, req:['s1'], d:r=>`Las quemaduras hacen +${15*r} % de daño`, arch:'brasa', icon:I('piromante-s11'), impl:'tv.burnPct · existe' },
    { id:'s5', n:'Chispas', t:'p', tag:'mec', r:2, c:2, max:1, req:['s1','s2'], d:()=>'Un crítico sobre un enemigo que se quema reinicia su quemadura y te da 5 de Calor', arch:'brasa+ignicion', hyb:'Brasa + Ignición', icon:I('piromante-s12'), impl:'power p_chispas · NUEVO' },
    { id:'s6', n:'Combustible Volátil', t:'p', tag:'mec', r:2, c:4, max:1, req:['s2','s3'], d:()=>'Con Ignición Total, la Bola explota en 4 m (antes 2 m) y el Meteoro cae al instante', touch:['bola_fuego','meteoro'], arch:'ignicion+cataclismo', hyb:'Ignición + Cataclismo', icon:I('piromante-s10'), impl:'power p_volatil · NUEVO (modifyResolve con prof.ignition)' },
    { id:'s7', n:'Pira', t:'p', tag:'mec', r:2, c:6, max:2, req:['s3'], d:r=>`El Meteoro deja el suelo ardiendo ${1+r} s (40 % por segundo)`, touch:['meteoro'], arch:'cataclismo', icon:I('piromante-s7'), impl:'mod meteoro zone · existe' },
    { id:'s8', n:'Propagación o Brasa Profunda', t:'c', tag:'mec', r:3, c:1, max:1, req:['s4','s5'], arch:'brasa', icon:I('piromante-s6'), opts:[
      { k:'A', n:'Propagación', d:'Cuando muere un enemigo que se quema, su quemadura pasa a 2 enemigos cercanos', role:'AREA', impl:'power p_propagacion · existe' },
      { k:'B', n:'Brasa Profunda', d:'Puedes poner hasta 3 quemaduras a la vez en el mismo enemigo', role:'UNI', impl:'power p_acumular · existe' } ],
      win:'A, contra grupos: cada muerte enciende a los siguientes. B, contra jefes: ×2,2 de daño de quemadura. Decide qué Brasa juegas' },
    { id:'s9', n:'Llamarada: Avivada o Voraz', t:'c', tag:'mec', r:3, c:3, max:1, req:['s5','s6'], touch:['p_llamarada'], arch:'ignicion', icon:I('piromante-s4'), opts:[
      { k:'A', n:'Llamarada Avivada', d:'Llamarada hace estallar el 100 % de las quemaduras (antes 60 %) y te da 25 de Calor', role:'UNI', impl:'power p_llamarada_avivada · existe' },
      { k:'B', n:'Llamarada Voraz', d:'Si Llamarada hace estallar 3 o más quemaduras: se recarga 4 s antes y ganas 8 de Calor por enemigo', role:'AREA', impl:'power p_llamarada_voraz · NUEVO' } ],
      win:'A, contra jefes: una Ignición Total extra cada ~25 s. B, contra grupos: Llamarada cada 4 s y el Calor lleno en 2 usos' },
    { id:'s10', n:'Meteoro: Gemelo o Concentrado', t:'c', tag:'mec', r:3, c:5, max:1, req:['s6','s7'], touch:['meteoro'], arch:'cataclismo', icon:I('piromante-s10'), opts:[
      { k:'A', n:'Meteoro Gemelo', d:'Cada 3.er Meteoro cae dos veces en el mismo sitio', role:'AREA', impl:'power p_meteoro_gemelo · NUEVO (echo del canal)' },
      { k:'B', n:'Meteoro Concentrado', d:'El Meteoro hace +50 % al enemigo más cercano al centro', role:'UNI', impl:'power p_meteoro_conc · NUEVO (condAdd)' } ],
      win:'A, contra grupos: un 33 % más de Meteoros. B, contra jefes. Decide qué Cataclismo juegas: barrido o martillo' },
    { id:'s11', n:'Fuego Interior', t:'p', tag:'num', r:4, c:0, max:2, req:['s8'], d:r=>`Cuando matas a un enemigo que se quema, te curas un ${2*r} % y ganas ${3*r} de maná`, arch:'brasa', icon:I('piromante-s8'), impl:'tv.burnKillHeal + burnKillMana · existen' },
    { id:'s12', n:'Pirotecnia', t:'p', tag:'mec', r:4, c:2, max:2, req:['s8','s9'], d:r=>`Cada crítico de Fuego recarga ${n1(0.5*r)} s de todas tus habilidades de Fuego`, fire:true, arch:'ignicion', icon:I('piromante-s12'), impl:'tv.critFireCdr · existe' },
    { id:'s13', n:'Ceniza Ardiente', t:'p', tag:'num', r:4, c:4, max:2, req:['s9','s10'], d:r=>`Meteoro y Supernova hacen +${15*r} % de daño`, touch:['meteoro','m_u_supernova'], arch:'cataclismo', icon:I('piromante-s10'), impl:'mod meteoro/supernova dmg · existe' },
    { id:'s14', n:'Impacto Sísmico', t:'p', tag:'mec', r:4, c:6, max:1, req:['s10'], d:()=>'Quien sobrevive al Meteoro queda ralentizado un 50 % 3 s; a los jefes les llena 20 de Quebranto', touch:['meteoro'], arch:'cataclismo', icon:I('piromante-s14'), impl:'mod meteoro slow + stagger · claves' },
    { id:'s15', n:'Fénix o Escudo de Llamas', t:'c', tag:'mec', r:5, c:1, max:1, req:['s11','s12'], icon:I('piromante-s13'), opts:[
      { k:'A', n:'Fénix', d:'Si mueres, renaces con la mitad de la vida. Una vez cada 2 min', role:'AGU', impl:'power p_fenix · existe' },
      { k:'B', n:'Escudo de Llamas', d:'Recibes un 10 % menos de daño y quien te golpea cuerpo a cuerpo se quema', role:'AGU', impl:'power p_escudo_llamas · NUEVO' } ],
      win:'A, donde morir cuesta caro (Hardcore, jefes Pináculo). B, contra grupos: +12–15 % de aguante siempre' },
    { id:'s16', n:'Brasero', t:'p', tag:'mec', r:5, c:3, max:2, req:['s12','s13'], d:r=>`Con más de 50 de Calor: quemaduras +${15+10*r} % y Meteoro +${10+5*r} %`, arch:'brasa+ignicion+cataclismo', hyb:'Los tres estilos (por el Calor)', icon:I('piromante-s1'), impl:'power p_brasero · NUEVO (cond con gaugeValue)' },
    { id:'s17', n:'Estrellas Fugaces', t:'p', tag:'mec', r:5, c:5, max:2, req:['s13','s14'], d:r=>`Supernova suelta además ${1+2*r} meteoros pequeños (40 % cada uno) en 3 s`, touch:['m_u_supernova','meteoro'], arch:'cataclismo', icon:I('piromante-s16'), impl:'power p_estrellas_fugaces · NUEVO' },
    { id:'s18', n:'Brasa Errante', t:'p', tag:'mec', r:6, c:0, max:2, req:['s15'], d:r=>`Las quemaduras que pasan a otro enemigo no pierden daño ni tiempo, y pasan a ${r} enemigo${r > 1 ? 's' : ''} más`, arch:'brasa', icon:I('piromante-s6'), impl:'power p_brasa_errante · NUEVO' },
    { id:'s19', n:'Ignición Rápida', t:'p', tag:'mec', r:6, c:2, max:2, req:['s15','s16'], d:r=>`Cada golpe de Fuego te da ${5+2*r} de Calor (antes 5)`, arch:'ignicion', icon:I('piromante-s5'), impl:'stat gaugeGain:calor · existe' },
    { id:'s20', n:'Ola de Calor', t:'p', tag:'num', r:6, c:4, max:2, req:['s16','s17'], d:r=>`Todas tus explosiones y áreas de Fuego son un ${15*r} % más grandes`, fire:true, icon:I('piromante-s17'), impl:'mod @fire radius · existe' },
    { id:'s21', n:'Estela Meteórica', t:'p', tag:'mec', r:6, c:6, max:1, req:['s17'], d:()=>'Al terminar la Estela Ígnea, tu siguiente Meteoro cae allí al instante', touch:['m_estela_ignea','meteoro'], arch:'cataclismo', icon:I('piromante-s1'), impl:'power p_estela_meteorica · NUEVO' },
    { id:'s22', n:'Brasa Viva', t:'p', tag:'mec', r:7, c:0, max:3, req:['s18'], d:r=>`Los enemigos que se queman contagian: cada segundo, el ${10+10*r} % de su quemadura pasa a otro enemigo a 2 m`, arch:'brasa', icon:I('piromante-s11'), impl:'power p_brasa_viva · NUEVO (onTick)' },
    { id:'s23', n:'Combustión', t:'p', tag:'mec', r:7, c:3, max:3, req:['s19'], d:r=>`Al usar Ignición Total, durante ${n1(1.5+r)} s todo tu Fuego es crítico`, touch:['bola_fuego','meteoro'], arch:'ignicion', icon:I('piromante-s9'), impl:'power p_combustion · existe (+ afterCast con prof.ignition)' },
    { id:'s24', n:'Cráter', t:'p', tag:'mec', r:7, c:6, max:3, req:['s21'], d:r=>`El Meteoro deja un cráter 4 s: dentro, los enemigos reciben +${10+5*r} % de Fuego y tu Bola de Fuego explota dos veces`, touch:['meteoro','bola_fuego'], arch:'cataclismo', icon:I('piromante-s14'), impl:'power p_crater · NUEVO (campo)' },
    { id:'s25', n:'Incendio Forestal', t:'f', tag:'mec', r:8, c:0, max:3, req:['s22'], d:r=>`Un enemigo aguanta hasta 5 quemaduras tuyas. Cuando muere, todas pasan a cada enemigo a 4 m${r > 1 ? `. Quemaduras +${20*(r-1)} %` : ''}`, arch:'brasa', icon:I('piromante-x1'), impl:'power p_incendio · NUEVO', final:'Brasa' },
    { id:'s26', n:'Combustión Perpetua', t:'f', tag:'mec', r:8, c:3, max:3, req:['s23'], d:r=>`En Combustión, cada crítico da 4 de Calor; a 100, dura 3 s más y lanza una Bola gratis${r > 1 ? `. Críticos +${15*(r-1)} %` : ''}`, touch:['bola_fuego'], arch:'ignicion', icon:I('piromante-x2'), impl:'power p_perpetua · NUEVO', final:'Ignición' },
    { id:'s27', n:'Lluvia de Fuego', t:'f', tag:'mec', r:8, c:6, max:3, req:['s24'], d:r=>`Con Ignición Total, el Meteoro cae 3 veces (100/60/60 %); si golpea a 3 o más, se recarga al instante${r > 1 ? `. Meteoro +${15*(r-1)} %` : ''}`, touch:['meteoro'], arch:'cataclismo', icon:I('piromante-x3'), impl:'power p_lluvia_fuego · NUEVO', final:'Cataclismo' },
    { id:'s28', n:'Corazón del Sol', t:'x', tag:'mec', r:9, c:3, max:4, req:['s25','s26','s27'], d:r=>['1) Ignición Total hace estallar las quemaduras a 8 m (50 % de lo que les queda).', '2) Matar a un élite te da 25 de Calor.', '3) Ignición Total salta a 80 de Calor (antes 100).', '4) Cada 20 explosiones, Supernova se lanza sola y gratis.'].slice(0, r).join(' '), fire:true, icon:I('piromante-x1'), impl:'power p_corazon_sol (rangos) · NUEVO sobre el existente' },
  ],
  // ---------------------------------------------------------------- PARAGON = árboles héroe (temas de la CLASE, no de un elemento)
  // 13 nodos y 10 puntos (Nv71–80): nunca se completa. Cada árbol lo comparten dos especializaciones.
  hero: [
    { id:'crono', n:'Cronomante', specs:['piromante','arcanista'], art:'ui256/menu_viajes.webp', line:'Marcas del Tiempo: el daño que haces vuelve a golpear', key:'Tu primer golpe marca al enemigo 4 s; al acabar, la marca repite el 30 % del daño que le hiciste', nodes:[
      { id:'t0', n:'Marca del Tiempo', t:'k', tag:'mec', r:0, c:1, max:1, free:true, d:()=>'Tu primer golpe marca al enemigo 4 s. Al acabar, la Marca repite el 30 % del daño que le hiciste en ese tiempo', icon:I('clase-c12') },
      { id:'t1', n:'Reloj de Arena', t:'p', tag:'num', r:1, c:0, max:1, req:['t0'], d:()=>'La Marca dura 6 s (antes 4 s)', icon:I('clase-c13') },
      { id:'t2', n:'Eco Mayor o Contagio', t:'c', tag:'mec', r:1, c:1, max:1, req:['t0'], icon:I('arcanista-s1'), opts:[
        { k:'A', n:'Eco Mayor', d:'La Marca repite el 45 % (antes 30 %)', role:'UNI' }, { k:'B', n:'Marca Contagiosa', d:'Al terminar, la Marca pasa a 2 enemigos cercanos', role:'AREA' } ], win:'A, contra jefes. B, contra grupos' },
      { id:'t3', n:'Prisa Temporal', t:'p', tag:'mec', r:1, c:2, max:1, req:['t0'], d:()=>'Cada Marca que termina te hace lanzar un 10 % más rápido durante 3 s', icon:I('clase-c11') },
      { id:'t4', n:'Detener o Retroceder', t:'c', tag:'mec', r:2, c:0, max:1, req:['t1','t2'], icon:I('arcanista-s9'), opts:[
        { k:'A', n:'Detener el Tiempo', d:'Habilidad (ranura 2): paras el tiempo 3 s a 8 m; las Marcas guardan el doble. Se recarga en 75 s', role:'CTRL', act:'m_h_detener' },
        { k:'B', n:'Retroceso', d:'Al bajar del 40 % de vida, vuelves a la vida que tenías hace 3 s. Una vez cada 90 s', role:'AGU' } ], win:'A, para controlar grupos y preparar un golpe enorme (ocupa la ranura 2). B, para sobrevivir sin ocupar ranura' },
      { id:'t5', n:'Segundos Robados', t:'p', tag:'num', r:2, c:1, max:1, req:['t2'], d:()=>'Cada Marca que termina recarga 1 s de tu definitiva', touch:['@ultimate'], icon:I('arcanista-s3') },
      { id:'t6', n:'Paradoja', t:'p', tag:'mec', r:2, c:2, max:1, req:['t2','t3'], d:()=>'Si el enemigo marcado muere antes de tiempo, la Marca pasa al más cercano con lo que llevaba', icon:I('arcanista-s7') },
      { id:'t7', n:'Bucle', t:'p', tag:'mec', r:3, c:0, max:1, req:['t4','t5'], d:()=>'Cada 4.ª Marca que termina se repite una segunda vez', icon:I('arcanista-x1') },
      { id:'t8', n:'Presagio o Memoria', t:'c', tag:'mec', r:3, c:1, max:1, req:['t5'], icon:I('arcanista-s12'), opts:[
        { k:'A', n:'Presagio', d:'El golpe que pone la Marca ya cuenta el doble para ella', role:'UNI' }, { k:'B', n:'Memoria', d:'Al terminar una Marca, te curas el 3 % del daño que repitió', role:'AGU' } ], win:'A, contra jefes. B, para aguantar en grupos' },
      { id:'t9', n:'Grieta Temporal', t:'p', tag:'mec', r:3, c:2, max:1, req:['t5','t6'], d:()=>'Si 3 Marcas terminan a la vez, abren una grieta 3 s que ralentiza un 30 %', icon:I('arcanista-s14') },
      { id:'t10', n:'Aceleración', t:'p', tag:'num', r:4, c:0.5, max:1, req:['t7','t8'], d:()=>'Con 3 o más Marcas puestas, lanzas un 12 % más rápido', icon:I('clase-c11') },
      { id:'t11', n:'Momento Exacto', t:'p', tag:'mec', r:4, c:1.5, max:1, req:['t8','t9'], d:()=>'Tus críticos alargan la Marca 1 s (hasta 3 s más)', icon:I('clase-c4') },
      { id:'t12', n:'Señora del Tiempo', t:'f', tag:'mec', r:5, c:1, max:1, req:['t10','t11'], d:()=>'Cada 30 s, tu siguiente principal para el reloj 5 s: las Marcas no terminan y luego repiten el 100 % de lo guardado', icon:I('arcanista-x3') },
    ] },
    { id:'invoca', n:'Invocadora', specs:['piromante','crionte'], art:'ui256/menu_mascota.webp', line:'Un constructo de maná pelea a tu lado con tu elemento', key:'Un Familiar dispara cada 1,5 s con el elemento de tu último hechizo', nodes:[
      { id:'f0', n:'Familiar Arcano', t:'k', tag:'mec', r:0, c:1, max:1, free:true, d:()=>'Un Familiar de maná dispara cada 1,5 s (50 % del arma) con tu último elemento: Fuego quema, Hielo frena, Arcano da maná', icon:I('arcanista-s0') },
      { id:'f1', n:'Vínculo', t:'p', tag:'num', r:1, c:0, max:1, req:['f0'], d:()=>'El Familiar tiene +50 % de vida y cada disparo te da 2 de maná', icon:I('clase-c6') },
      { id:'f2', n:'Uno o Muchos', t:'c', tag:'mec', r:1, c:1, max:1, req:['f0'], icon:I('arcanista-s5'), opts:[
        { k:'A', n:'Gran Constructo', d:'Un solo Familiar, +80 % de daño; cada 5.º disparo aturde 0,5 s', role:'UNI' }, { k:'B', n:'Enjambre', d:'Tres Familiares pequeños; cada uno hace el 40 %', role:'AREA' } ], win:'A, contra jefes. B, contra grupos (tres blancos a la vez)' },
      { id:'f3', n:'Imitación', t:'p', tag:'mec', r:1, c:2, max:1, req:['f0'], d:()=>'Cuando usas tu definitiva, el Familiar lanza una copia al 25 %', touch:['@ultimate'], icon:I('arcanista-s16') },
      { id:'f4', n:'Guardián o Cazador', t:'c', tag:'mec', r:2, c:0, max:1, req:['f1','f2'], icon:I('arcanista-s8'), opts:[
        { k:'A', n:'Guardián', d:'El Familiar se interpone: recibe el 15 % del daño que te hacen', role:'AGU' }, { k:'B', n:'Cazador', d:'El Familiar persigue al enemigo con más vida; ese enemigo recibe +10 % de daño', role:'UNI' } ], win:'A, para sobrevivir. B, contra jefes' },
      { id:'f5', n:'Sobrecarga', t:'p', tag:'num', r:2, c:1, max:1, req:['f2'], d:()=>'Cada habilidad principal tuya acelera los disparos del Familiar un 30 % durante 3 s', icon:I('clase-c14') },
      { id:'f6', n:'Detonar Constructo', t:'p', tag:'mec', r:2, c:2, max:1, req:['f2','f3'], d:()=>'Si el Familiar cae, estalla (200 % del arma, 4 m) y vuelve a los 5 s', icon:I('arcanista-x2') },
      { id:'f7', n:'Aprendiz', t:'p', tag:'mec', r:3, c:0, max:1, req:['f4','f5'], d:()=>'El Familiar copia la variante de forja de tu Dardo (por ejemplo, con Saeta Ígnea sus disparos explotan)', touch:['m_dardo'], icon:I('clase-c4') },
      { id:'f8', n:'Constructo o Fragua', t:'c', tag:'mec', r:3, c:1, max:1, req:['f5'], icon:I('clase-c15'), opts:[
        { k:'A', n:'Llamar Constructo', d:'Habilidad (ranura 2): un Constructo grande aparece 10 s y obliga a los enemigos a 8 m a atacarlo. Se recarga en 45 s', role:'AGU', act:'m_h_constructo' },
        { k:'B', n:'Fragua Rúnica', d:'El Familiar hace +5 % por cada habilidad distinta que usaste en 8 s (hasta +25 %)', role:'UNI' } ], win:'A, para aguantar grupos grandes (ocupa la ranura 2). B, para hacer daño sin ocupar ranura' },
      { id:'f9', n:'Eco Elemental', t:'p', tag:'mec', r:3, c:2, max:1, req:['f5','f6'], d:()=>'Los disparos del Familiar alimentan tu mecánica: 3 de Calor (Piromante) o 1 capa de Escarcha (Crionte)', icon:I('piromante-s5') },
      { id:'f10', n:'Constructo Templado', t:'p', tag:'num', r:4, c:0.5, max:1, req:['f7','f8'], d:()=>'El Familiar hace +20 % de daño', icon:I('clase-c1') },
      { id:'f11', n:'Hilo de Maná', t:'p', tag:'mec', r:4, c:1.5, max:1, req:['f8','f9'], d:()=>'Un hilo de maná te une al Familiar y daña a quien lo cruza (60 % por segundo)', icon:I('arcanista-s14') },
      { id:'f12', n:'Legión', t:'f', tag:'mec', r:5, c:1, max:1, req:['f10','f11'], d:()=>'Cada 25 s, tu Familiar se divide en 3 durante 8 s y todos copian tu siguiente principal al 50 %', icon:I('arcanista-x3') },
    ] },
    { id:'escriba', n:'Escriba Rúnica', specs:['crionte','arcanista'], art:'ui/mat_runa.webp', line:'Tus hechizos escriben runas; tres juntas forman un Sello', nodes:[] },
  ],
};
// BUILDS del Piromante (rangos por nodo EN ORDEN DE COMPRA; elecciones en *Ch). Nv100: clase 34 · Piromante 31 · Paragon 10 de 13.
const BUILDS_V2 = {
  brasa: { n:'Incendio', arch:'Brasa', hero:'invoca', heroCh:{ f2:'B', f4:'A', f8:'B' }, heroNodes:['f2','f3','f6','f5','f9','f8','f11','f12','f4','f1'],
    cls: { c1:2, c4:3, c5:1, c8:2, c11:1, c15:1, c19:1, c22:1, c2:2, c12:2, c9:1, c16:1, c18:2, c13:2, c6:1, c10:1, c25:3, c28:3, c3:2, c7:1, c14:1 },
    clsCh: { c5:'B', c6:'B', c9:'B', c10:'A', c11:'B', c14:'A', c15:'A', c16:'B', c22:'B' },
    spec: { s1:3, s4:2, s5:1, s8:1, s11:2, s15:1, s18:2, s22:3, s25:3, s28:4, s2:3, s9:1, s12:2, s16:2, s3:1 },
    specCh: { s8:'A', s9:'B', s15:'B' } },
  cataclismo: { n:'Lluvia de Fuego', arch:'Cataclismo', hero:'crono', heroCh:{ t2:'B', t4:'B', t8:'A' }, heroNodes:['t2','t3','t6','t5','t9','t8','t11','t12','t4','t1'],
    cls: { c2:2, c3:2, c6:1, c7:1, c10:1, c14:1, c17:1, c20:1, c24:2, c1:2, c5:1, c9:1, c12:2, c13:2, c16:1, c21:1, c23:2, c27:3, c30:3, c8:2, c4:2 },
    clsCh: { c5:'B', c6:'B', c9:'B', c10:'A', c14:'A', c16:'B', c17:'B' },
    spec: { s3:3, s7:2, s6:1, s10:1, s13:2, s14:1, s17:2, s21:1, s24:3, s27:3, s28:4, s2:3, s9:1, s16:2, s20:2 },
    specCh: { s9:'B', s10:'A' } },
  ignicion: { n:'Combustión Perpetua', arch:'Ignición', hero:'crono', heroCh:{ t2:'A', t4:'B', t8:'A' }, heroNodes:['t2','t1','t3','t5','t8','t4','t7','t10','t12','t11'],
    cls: { c1:2, c2:2, c5:1, c6:1, c9:1, c12:2, c13:2, c16:1, c19:1, c23:2, c10:1, c17:1, c20:1, c4:1, c8:2, c15:1, c3:2, c26:3, c29:3, c24:2, c4_:2 },
    clsCh: { c5:'A', c6:'A', c9:'B', c10:'B', c15:'B', c16:'A', c17:'A' },
    spec: { s2:3, s5:1, s9:1, s12:2, s16:2, s19:2, s23:3, s26:3, s28:4, s1:3, s4:1, s8:1, s15:1, s3:3, s6:1 },
    specCh: { s8:'B', s9:'A', s15:'A' } },
  hibrido: { n:'Brasa Ardiente', arch:'Híbrido Brasa-Ignición', hero:'invoca', heroCh:{ f2:'A', f4:'A', f8:'A' }, heroNodes:['f2','f1','f4','f5','f8','f3','f7','f10','f12','f11'],
    cls: { c1:2, c2:2, c5:1, c6:1, c9:1, c12:2, c13:2, c16:1, c19:1, c23:2, c10:1, c17:1, c20:1, c4:1, c8:2, c15:1, c3:2, c26:3, c29:3, c24:2, c7:1, c4_:1 },
    clsCh: { c5:'A', c6:'B', c9:'B', c10:'A', c15:'A', c16:'B', c17:'B' },
    spec: { s1:3, s2:3, s4:2, s5:1, s8:1, s9:1, s11:2, s12:2, s15:1, s16:2, s18:2, s19:2, s22:3, s23:3, s3:1, s20:2 },
    specCh: { s8:'A', s9:'A', s15:'B' } },
};
// «id_» = rango extra del mismo nodo comprado más tarde (Nv85+): se normaliza al cargar.
Object.values(BUILDS_V2).forEach(TV2.normBuild); // mismo cálculo de siempre, ahora en data/talents-v2-comun.js
// ===== Paso 2g v4 · Crionte y Arcanista (misma rejilla que el Piromante: mismas filas, columnas, rangos, requisitos y puertas) =====
// Columna izquierda = arquetipo A · centro = B · derecha = C. Híbridos en (2,2) A+B, (2,4) B+C y (5,3) los tres.
const CRIONTE_TREE = [
  { id:'i0', n:'Escarcha', t:'k', tag:'mec', r:0, c:3, max:1, free:true, d:()=>'Tus golpes de Hielo ponen 1 capa de Escarcha (la Nova, 2). A 5 capas se congela 1 s; un jefe queda Aterido 4 s', frost:true, icon:I('crionte-s0'), impl:'mecánica escarcha · existe' },
  { id:'i1', n:'Frío Penetrante', t:'p', tag:'num', r:1, c:1, max:3, req:['i0'], d:r=>`Congelado dura ${n1(1+0.2*r)} s (antes 1 s)`, arch:'glaciar', icon:I('crionte-s3'), impl:'tv.freezeDur · NUEVO (clave)' },
  { id:'i2', n:'Filo Helado', t:'p', tag:'num', r:1, c:3, max:3, req:['i0'], d:r=>`+${5*r} % de crítico contra enemigos con 3 o más capas`, arch:'fractura', icon:I('crionte-s5'), impl:'tv.frostCrit · NUEVO (clave)' },
  { id:'i3', n:'Viento Cortante', t:'p', tag:'num', r:1, c:5, max:3, req:['i0'], d:r=>`La Nova de Hielo se recarga en ${n1(4-0.5*r)} s (antes 4 s)`, touch:['nova_hielo'], arch:'tormenta', icon:I('crionte-s2'), impl:'mod nova_hielo cdr · existe' },
  { id:'i4', n:'Escarcha Densa', t:'p', tag:'num', r:2, c:0, max:2, req:['i1'], d:r=>`Las capas caen cada ${2+r} s (antes cada 2 s)`, arch:'glaciar', icon:I('crionte-s4'), impl:'tuning escarcha.decayEvery · tv' },
  { id:'i5', n:'Hielo Quebradizo', t:'p', tag:'mec', r:2, c:2, max:1, req:['i1','i2'], d:()=>'Los enemigos Congelados reciben +20 % de daño de todo', hyb:'Glaciar + Fractura', icon:I('crionte-s9'), impl:'power k_quebradizo · NUEVO (condAdd)' },
  { id:'i6', n:'Polvo de Diamante', t:'p', tag:'mec', r:2, c:4, max:1, req:['i2','i3'], d:()=>'Al congelar a un enemigo, tu siguiente Lanza de Hielo o Nova no cuesta maná', touch:['k_lanza','nova_hielo'], hyb:'Fractura + Tormenta', icon:I('crionte-s7'), impl:'power k_polvo · NUEVO' },
  { id:'i7', n:'Tormenta Creciente', t:'p', tag:'mec', r:2, c:6, max:2, req:['i3'], d:r=>`La Tormenta Glacial dura ${8+r} s (antes 8 s) y crece un 10 % cada segundo`, touch:['m_u_tormenta'], arch:'tormenta', icon:I('crionte-s6'), impl:'mod m_u_tormenta durS + power k_crece' },
  { id:'i8', n:'Prisión: Amplia o Profunda', t:'c', tag:'mec', r:3, c:1, max:1, req:['i4','i5'], touch:['k_prision'], arch:'glaciar', icon:I('crionte-s0'), opts:[
    { k:'A', n:'Prisión Amplia', d:'La Prisión de Hielo atrapa a todos a 6 m (antes 4 m)', role:'AREA', impl:'mod k_prision radius · claves' },
    { k:'B', n:'Prisión Profunda', d:'La Prisión de Hielo atrapa a un solo enemigo 3 s y le hace +80 %', role:'UNI', impl:'power k_prision_profunda · NUEVO' } ],
    win:'A, contra grupos: congelas a toda la manada a la vez. B, contra jefes y élites. Decide qué Glaciar juegas' },
  { id:'i9', n:'Lanza: Larga o del Invierno', t:'c', tag:'mec', r:3, c:3, max:1, req:['i5','i6'], touch:['k_lanza'], arch:'fractura', icon:I('crionte-s10'), opts:[
    { k:'A', n:'Lanza Larga', d:'La Lanza de Hielo llega a 18 m (antes 12 m) y ralentiza un 30 % a todos los que atraviesa', role:'AREA', impl:'mod k_lanza range + slow · claves' },
    { k:'B', n:'Lanza del Invierno', d:'Contra Congelados o Ateridos, la Lanza hace el cuádruple (antes el triple)', role:'UNI', impl:'power k_lanza_invierno · NUEVO (condAdd)' } ],
    win:'A, contra grupos en fila. B, contra jefes: el golpe grande de la Fractura' },
  { id:'i10', n:'Tormenta: Viva o Fría', t:'c', tag:'mec', r:3, c:5, max:1, req:['i6','i7'], touch:['m_u_tormenta','nova_hielo'], arch:'tormenta', icon:I('crionte-s14'), opts:[
    { k:'A', n:'Ventisca Viva', d:'Mientras dura, la Tormenta Glacial suelta una Nova de Hielo cada 2 s', role:'AREA', impl:'power k_ventisca_viva · NUEVO (onTick)' },
    { k:'B', n:'Frío Sostenido', d:'La Tormenta hace +60 % al enemigo con más capas', role:'UNI', impl:'power k_frio_sostenido · NUEVO (condAdd)' } ],
    win:'A, contra grupos: capas para todos. B, contra jefes. Decide qué Tormenta juegas' },
  { id:'i11', n:'Sangre Fría', t:'p', tag:'num', r:4, c:0, max:2, req:['i8'], d:r=>`Matar a un Congelado te cura un ${2*r} % y te da ${3*r} de maná`, arch:'glaciar', icon:I('crionte-s8'), impl:'tv.frozenKillHeal · NUEVO (clave)' },
  { id:'i12', n:'Astillas', t:'p', tag:'mec', r:4, c:2, max:2, req:['i8','i9'], d:r=>`Cada crítico de Hielo recarga ${n1(0.5*r)} s de la Lanza y de la Prisión`, touch:['k_lanza','k_prision'], arch:'fractura', icon:I('crionte-s12'), impl:'tv.critFrostCdr · NUEVO (copia de critFireCdr)' },
  { id:'i13', n:'Frío Intenso', t:'p', tag:'num', r:4, c:4, max:2, req:['i9','i10'], d:r=>`La Tormenta Glacial y la Nova hacen +${15*r} % de daño`, touch:['m_u_tormenta','nova_hielo'], arch:'tormenta', icon:I('crionte-s11'), impl:'mod dmg · claves' },
  { id:'i14', n:'Suelo Helado', t:'p', tag:'mec', r:4, c:6, max:1, req:['i10'], d:()=>'La Prisión de Hielo deja el suelo helado 4 s: ralentiza un 40 % y pone 1 capa por segundo', touch:['k_prision'], arch:'tormenta', icon:I('crionte-s13'), impl:'campo k_suelo · NUEVO' },
  { id:'i15', n:'Piel o Cristal', t:'c', tag:'mec', r:5, c:1, max:1, req:['i11','i12'], icon:I('crionte-s15'), opts:[
    { k:'A', n:'Piel de Invierno', d:'Recibes un 15 % menos de daño de enemigos con capas', role:'AGU', impl:'tv.drVsLayered · NUEVO' },
    { k:'B', n:'Cristal Protector', d:'Congelar a un enemigo a 4 m te da un escudo del 5 % de tu vida (una vez cada 3 s)', role:'AGU', impl:'power k_cristal · NUEVO (g.shield)' } ],
    win:'A, contra grupos que te rodean. B, contra élites que pegan fuerte' },
  { id:'i16', n:'Invierno Profundo', t:'p', tag:'mec', r:5, c:3, max:2, req:['i12','i13'], d:r=>`Por cada enemigo Congelado a 10 m, tu Hielo hace +${5*r} % (hasta 5 enemigos)`, hyb:'Los tres estilos (por las congelaciones)', icon:I('crionte-s16'), impl:'power k_invierno · NUEVO (condAdd)' },
  { id:'i17', n:'Remolino', t:'p', tag:'mec', r:5, c:5, max:2, req:['i13','i14'], d:r=>`Al terminar el Paso de Escarcha, sueltas una Nova de Hielo al ${50*r} %`, touch:['m_paso_escarcha','nova_hielo'], arch:'tormenta', icon:I('crionte-s17'), impl:'power k_remolino · NUEVO (afterCast)' },
  { id:'i18', n:'Congelación en Cadena', t:'p', tag:'mec', r:6, c:0, max:2, req:['i15'], d:r=>`Cuando muere un Congelado, se congela${r > 1 ? 'n' : ''} ${r} enemigo${r > 1 ? 's' : ''} a 4 m`, arch:'glaciar', icon:I('crionte-s9'), impl:'power k_cadena · NUEVO (onKill)' },
  { id:'i19', n:'Ruptura', t:'p', tag:'mec', r:6, c:2, max:2, req:['i15','i16'], d:r=>`La Lanza hace añicos a un Congelado: +${25*r} % de daño, le quita la congelación y le deja 3 capas`, touch:['k_lanza'], arch:'fractura', icon:I('crionte-s10'), impl:'power k_ruptura · NUEVO' },
  { id:'i20', n:'Expansión Glacial', t:'p', tag:'num', r:6, c:4, max:2, req:['i16','i17'], d:r=>`Todas tus áreas de Hielo son un ${15*r} % más grandes`, frost:true, icon:I('crionte-s11'), impl:'mod @frost radius · claves' },
  { id:'i21', n:'Ojo Frío', t:'p', tag:'mec', r:6, c:6, max:1, req:['i17'], d:()=>'Al acabar, la Tormenta Glacial estalla (200 %) y congela a todos los que tengan 3 o más capas', touch:['m_u_tormenta'], arch:'tormenta', icon:I('crionte-s14'), impl:'power k_ojo_frio · NUEVO' },
  { id:'i22', n:'Glaciar', t:'p', tag:'mec', r:7, c:0, max:3, req:['i18'], d:r=>`Al congelar a un enemigo, los que están a 3 m ganan ${r} capa${r > 1 ? 's' : ''}`, arch:'glaciar', icon:I('crionte-x1'), impl:'power k_glaciar · NUEVO' },
  { id:'i23', n:'Esquirlas', t:'p', tag:'mec', r:7, c:3, max:3, req:['i19'], d:r=>`Hacer añicos a un enemigo suelta 4 esquirlas que hacen el ${20+10*r} % a los cercanos`, touch:['k_lanza'], arch:'fractura', icon:I('crionte-s12'), impl:'power k_esquirlas · NUEVO' },
  { id:'i24', n:'Tormenta Perpetua', t:'p', tag:'mec', r:7, c:6, max:3, req:['i21'], d:r=>`Cada enemigo que congelas dentro de la Tormenta la alarga ${n1(0.5*r)} s (hasta +6 s)`, touch:['m_u_tormenta'], arch:'tormenta', icon:I('crionte-s6'), impl:'power k_perpetua · NUEVO' },
  { id:'i25', n:'Era Glacial', t:'f', tag:'mec', r:8, c:0, max:3, req:['i22'], d:r=>`Al congelar a un enemigo, se congelan todos los que tengan capas a 5 m (una vez cada 6 s)${r > 1 ? `. Congelado +${n1(0.5*(r-1))} s` : ''}`, arch:'glaciar', icon:I('crionte-x1'), impl:'power k_era_glacial · NUEVO', final:'Glaciar' },
  { id:'i26', n:'Cero Absoluto', t:'f', tag:'mec', r:8, c:3, max:3, req:['i23'], d:r=>`Hacer añicos a un Congelado hace un 300 % extra y recarga la Lanza al instante${r > 1 ? `. Críticos de Hielo +${15*(r-1)} %` : ''}`, touch:['k_lanza'], arch:'fractura', icon:I('crionte-x2'), impl:'power k_cero · NUEVO', final:'Fractura' },
  { id:'i27', n:'Invierno Eterno', t:'f', tag:'mec', r:8, c:6, max:3, req:['i24'], d:r=>`La Tormenta Glacial no se acaba mientras haya un Congelado dentro (hasta 20 s)${r > 1 ? `. Tormenta +${15*(r-1)} %` : ''}`, touch:['m_u_tormenta'], arch:'tormenta', icon:I('crionte-x3'), impl:'power k_eterno · NUEVO', final:'Tormenta' },
  { id:'i28', n:'Corazón del Invierno', t:'x', tag:'mec', r:9, c:3, max:4, req:['i25','i26','i27'], d:r=>['1) Congelar a un jefe le llena 20 de Quebranto.', '2) Matar a un Congelado te da 10 de maná.', '3) Bastan 4 capas para congelar (antes 5).', '4) Cada 15 congelaciones, la Tormenta Glacial se lanza sola y gratis.'].slice(0, r).join(' '), frost:true, icon:I('crionte-x3'), impl:'power k_corazon_invierno (rangos) · NUEVO' },
];
const ARCANISTA_TREE = [
  { id:'a0', n:'Cargas Arcanas', t:'k', tag:'mec', r:0, c:3, max:1, free:true, d:()=>'El Dardo te da 1 Carga por impacto (máx. 4; duran 6 s). El Rayo las gasta: +35 % de daño y 5 de maná por Carga', arcane:true, icon:I('arcanista-s0'), impl:'mecánica cargas · existe' },
  { id:'a1', n:'Memoria Arcana', t:'p', tag:'num', r:1, c:1, max:3, req:['a0'], d:r=>`Las Cargas duran ${6+2*r} s (antes 6 s)`, arch:'rayo', icon:I('arcanista-s1'), impl:'tuning cargas.loseAfter · tv' },
  { id:'a2', n:'Mente Brillante', t:'p', tag:'num', r:1, c:3, max:3, req:['a0'], d:r=>`+${5*r} % de crítico con 2 o más Cargas`, arch:'orbe', icon:I('arcanista-s2'), impl:'tv.chargeCrit · NUEVO (clave)' },
  { id:'a3', n:'Flujo Constante', t:'p', tag:'num', r:1, c:5, max:3, req:['a0'], d:r=>`El Desgarro Arcano se recarga en ${50-5*r} s (antes 50 s)`, touch:['m_u_desgarro'], arch:'grieta', icon:I('arcanista-s3'), impl:'mod m_u_desgarro cdr · claves' },
  { id:'a4', n:'Potencia Acumulada', t:'p', tag:'num', r:2, c:0, max:2, req:['a1'], d:r=>`Cada Carga da +${35+5*r} % al Rayo (antes +35 %)`, touch:['rayo'], arch:'rayo', icon:I('arcanista-s4'), impl:'tuning cargas.dmgPerCharge · tv' },
  { id:'a5', n:'Rebote Cargado', t:'p', tag:'mec', r:2, c:2, max:1, req:['a1','a2'], d:()=>'Cada enemigo que toca el Orbe Arcano te da 1 Carga', touch:['a_orbe'], hyb:'Rayo + Orbe', icon:I('arcanista-s5'), impl:'power a_rebote_cargado · NUEVO (onHit)' },
  { id:'a6', n:'Sello Cargado', t:'p', tag:'mec', r:2, c:4, max:1, req:['a2','a3'], d:()=>'Dentro de tu Sello del Archimago, el Orbe y el Desgarro te dan 1 Carga por golpe', touch:['a_sello','a_orbe','m_u_desgarro'], hyb:'Orbe + Grieta', icon:I('arcanista-s9'), impl:'power a_sello_cargado · NUEVO' },
  { id:'a7', n:'Grieta Abierta', t:'p', tag:'mec', r:2, c:6, max:2, req:['a3'], d:r=>`Al terminar el Desgarro, la grieta queda ${1+r} s y daña un 40 % por segundo`, touch:['m_u_desgarro'], arch:'grieta', icon:I('arcanista-s7'), impl:'campo a_grieta · NUEVO' },
  { id:'a8', n:'Rayo: Doble o Recargado', t:'c', tag:'mec', r:3, c:1, max:1, req:['a4','a5'], touch:['rayo'], arch:'rayo', icon:I('arcanista-s6'), opts:[
    { k:'A', n:'Rayo Doble', d:'Un Rayo con 4 Cargas se lanza dos veces; la copia hace el 50 %', role:'UNI', impl:'power a_rayo_doble · NUEVO (echo del canal)' },
    { k:'B', n:'Rayo Recargado', d:'Cada enemigo que atraviesa el Rayo te devuelve 1 Carga (hasta 2)', role:'AREA', impl:'power a_rayo_recargado · NUEVO (afterCast)' } ],
    win:'A, contra jefes: el golpe grande sale dos veces. B, contra grupos en fila. Decide qué Rayo juegas' },
  { id:'a9', n:'Orbe: Cargado o Atrayente', t:'c', tag:'mec', r:3, c:3, max:1, req:['a5','a6'], touch:['a_orbe'], arch:'orbe', icon:I('arcanista-s4'), opts:[
    { k:'A', n:'Orbe Cargado', d:'El Orbe hace +20 % por cada Carga que tienes, sin gastarlas', role:'UNI', impl:'power a_orbe_cargado · NUEVO (condAdd)' },
    { k:'B', n:'Orbe Atrayente', d:'El Orbe arrastra hacia su camino a los enemigos a 3 m', role:'AREA', impl:'power a_orbe_atrae · NUEVO (pull)' } ],
    win:'A, contra jefes. B, contra grupos: los junta para el Rayo. Decide qué Orbe juegas' },
  { id:'a10', n:'Desgarro: Fijo o Voraz', t:'c', tag:'mec', r:3, c:5, max:1, req:['a6','a7'], touch:['m_u_desgarro'], arch:'grieta', icon:I('arcanista-s14'), opts:[
    { k:'A', n:'Desgarro Fijo', d:'Si no te mueves, el Desgarro hace +8 % cada medio segundo (hasta +48 %)', role:'UNI', impl:'power a_desgarro_fijo · NUEVO' },
    { k:'B', n:'Desgarro Voraz', d:'Cada enemigo que toca el Desgarro te da 3 de maná, y ganas 1 Carga por segundo', role:'AREA', impl:'power a_desgarro_voraz · NUEVO' } ],
    win:'A, contra jefes quietos. B, contra grupos: sostiene tu maná. Decide qué Grieta juegas' },
  { id:'a11', n:'Precisión Arcana', t:'p', tag:'num', r:4, c:0, max:2, req:['a8'], d:r=>`El Rayo tiene +${10*r} % de crítico`, touch:['rayo'], arch:'rayo', icon:I('arcanista-s11'), impl:'mod rayo crit · claves' },
  { id:'a12', n:'Inercia', t:'p', tag:'mec', r:4, c:2, max:2, req:['a8','a9'], d:r=>`Cada rebote del Orbe recarga ${n1(0.5*r)} s del Rayo`, touch:['a_orbe','rayo'], arch:'orbe', icon:I('arcanista-s12'), impl:'power a_inercia · NUEVO' },
  { id:'a13', n:'Torrente Arcano', t:'p', tag:'num', r:4, c:4, max:2, req:['a9','a10'], d:r=>`El Desgarro Arcano y el Orbe hacen +${15*r} % de daño`, touch:['m_u_desgarro','a_orbe'], arch:'grieta', icon:I('arcanista-s13'), impl:'mod dmg · claves' },
  { id:'a14', n:'Maná Inagotable', t:'p', tag:'mec', r:4, c:6, max:1, req:['a10'], d:()=>'Mientras canalizas el Desgarro no gastas maná y recuperas un 2 % por segundo', touch:['m_u_desgarro'], arch:'grieta', icon:I('arcanista-s3'), impl:'power a_mana_inagotable · NUEVO' },
  { id:'a15', n:'Desplazamiento o Velo', t:'c', tag:'mec', r:5, c:1, max:1, req:['a11','a12'], icon:I('arcanista-s8'), opts:[
    { k:'A', n:'Desplazamiento', d:'Un golpe de más del 20 % de tu vida te teletransporta 5 m y no te hace daño. Una vez cada 30 s', role:'AGU', impl:'power a_desplazamiento · NUEVO (onDamaged)' },
    { k:'B', n:'Velo Arcano', d:'Con 3 o más Cargas, recibes un 12 % menos de daño', role:'AGU', impl:'tv.drCharges · NUEVO' } ],
    win:'A, contra golpes grandes de jefe. B, siempre activo contra grupos' },
  { id:'a16', n:'Resonancia', t:'p', tag:'mec', r:5, c:3, max:2, req:['a12','a13'], d:r=>`Con 4 Cargas, no se pierden y tienes +${6*r} % de crítico`, hyb:'Los tres estilos (por las Cargas)', icon:I('arcanista-s16'), impl:'power a_resonance · existe (rangos)' },
  { id:'a17', n:'Sello Viviente', t:'p', tag:'mec', r:5, c:5, max:2, req:['a13','a14'], d:r=>`El Sello del Archimago dura ${8+2*r} s (antes 8 s) y te sigue`, touch:['a_sello'], arch:'grieta', icon:I('arcanista-s9'), impl:'mod a_sello durS + power a_sello_sigue' },
  { id:'a18', n:'Carga Final', t:'p', tag:'mec', r:6, c:0, max:2, req:['a15'], d:r=>`Un Rayo con 4 Cargas te devuelve ${r} Carga${r > 1 ? 's' : ''}`, touch:['rayo'], arch:'rayo', icon:I('arcanista-s6'), impl:'power a_carga_final · NUEVO (afterCast)' },
  { id:'a19', n:'Satélite', t:'p', tag:'mec', r:6, c:2, max:2, req:['a15','a16'], d:r=>`Cada 3.er Orbe deja un orbe pequeño girando a tu alrededor 6 s (${20*r} % por golpe)`, touch:['a_orbe'], arch:'orbe', icon:I('arcanista-s5'), impl:'power a_satelite · NUEVO' },
  { id:'a20', n:'Agudeza', t:'p', tag:'num', r:6, c:4, max:2, req:['a16','a17'], d:r=>`Con 3 o más Cargas, lanzas un ${7*r} % más rápido`, arcane:true, icon:I('arcanista-s2'), impl:'tv.aspdCharges · NUEVO' },
  { id:'a21', n:'Doble Grieta', t:'p', tag:'mec', r:6, c:6, max:1, req:['a17'], d:()=>'Si lanzas el Rayo durante el Desgarro, se abre una segunda grieta al 50 %', touch:['rayo','m_u_desgarro'], arch:'grieta', icon:I('arcanista-s14'), impl:'power a_doble_grieta · NUEVO' },
  { id:'a22', n:'Cargas Desbordadas', t:'p', tag:'mec', r:7, c:0, max:3, req:['a18'], d:r=>`Puedes guardar hasta ${4+r} Cargas (antes 4); las que pasan de 4 dan el doble al Rayo`, touch:['rayo'], arch:'rayo', icon:I('arcanista-x1'), impl:'tuning cargas.max + condAdd' },
  { id:'a23', n:'Orbe Múltiple', t:'p', tag:'mec', r:7, c:3, max:3, req:['a19'], d:r=>`Cada 3.er Orbe sale con ${r} orbe${r > 1 ? 's' : ''} más pequeño${r > 1 ? 's' : ''} (40 % cada uno)`, touch:['a_orbe'], arch:'orbe', icon:I('arcanista-s4'), impl:'power a_orbe_multiple · NUEVO (echo)' },
  { id:'a24', n:'Fuente de Maná', t:'p', tag:'mec', r:7, c:6, max:3, req:['a21'], d:r=>`Mientras canalizas, cada segundo te da 1 Carga y +${5*r} % de daño (hasta 3 veces)`, touch:['m_u_desgarro'], arch:'grieta', icon:I('arcanista-s13'), impl:'power a_fuente · NUEVO' },
  { id:'a25', n:'Tormenta de Cargas', t:'f', tag:'mec', r:8, c:0, max:3, req:['a22'], d:r=>`Al gastar 4 o más Cargas, el Rayo se lanza 3 veces en 1,5 s (100/50/50 %)${r > 1 ? `. Rayo +${15*(r-1)} %` : ''}`, touch:['rayo'], arch:'rayo', icon:I('arcanista-x1'), impl:'power a_tormenta_cargas · NUEVO', final:'Rayo' },
  { id:'a26', n:'Constelación', t:'f', tag:'mec', r:8, c:3, max:3, req:['a23'], d:r=>`Tus Orbes no desaparecen: se quedan 8 s girando a tu alrededor (hasta 3) y disparan al más cercano${r > 1 ? `. Orbe +${15*(r-1)} %` : ''}`, touch:['a_orbe'], arch:'orbe', icon:I('arcanista-x2'), impl:'power a_constelacion · NUEVO', final:'Orbe' },
  { id:'a27', n:'Grieta Eterna', t:'f', tag:'mec', r:8, c:6, max:3, req:['a24'], d:r=>`El Desgarro dura mientras tengas maná (gasta un 3 % por segundo)${r > 1 ? `. Desgarro +${15*(r-1)} %` : ''}`, touch:['m_u_desgarro'], arch:'grieta', icon:I('arcanista-x3'), impl:'power a_grieta_eterna · NUEVO', final:'Grieta' },
  { id:'a28', n:'Singularidad', t:'x', tag:'mec', r:9, c:3, max:4, req:['a25','a26','a27'], d:r=>['1) Un Rayo con 4 Cargas abre una grieta 3 s en el objetivo (50 % por segundo).', '2) Matar a un élite te da 4 Cargas.', '3) Las Cargas ya no se pierden.', '4) Cada 20 Cargas gastadas, el Desgarro se lanza solo 2 s, gratis.'].slice(0, r).join(' '), arcane:true, icon:I('arcanista-x3'), impl:'power a_singularidad (rangos) · NUEVO' },
];
// Escriba Rúnica (Crionte · Arcanista): misma rejilla que los otros árboles héroe
const ESCRIBA_NODES = [
  { id:'e0', n:'Runas', t:'k', tag:'mec', r:0, c:1, max:1, free:true, d:()=>'Cada 3.er hechizo escribe una runa (8 s). Tres runas cerca forman un Sello: dentro haces +15 % y recibes −10 % de daño', icon:I('arcanista-s9') },
  { id:'e1', n:'Tinta Duradera', t:'p', tag:'num', r:1, c:0, max:1, req:['e0'], d:()=>'Las runas duran 12 s (antes 8 s)', icon:I('clase-c13') },
  { id:'e2', n:'Poder o Estallido', t:'c', tag:'mec', r:1, c:1, max:1, req:['e0'], icon:I('arcanista-s16'), opts:[
    { k:'A', n:'Runa de Poder', d:'Dentro del Sello haces +25 % de daño (antes +15 %)', role:'UNI' }, { k:'B', n:'Sello Explosivo', d:'Al formarse, el Sello estalla en su área (150 % del arma)', role:'AREA' } ], win:'A, contra jefes. B, contra grupos' },
  { id:'e3', n:'Tinta de Maná', t:'p', tag:'mec', r:1, c:2, max:1, req:['e0'], d:()=>'Pisar una runa tuya te da 5 de maná (una vez por runa)', icon:I('clase-c10') },
  { id:'e4', n:'Palabra o Guarda', t:'c', tag:'mec', r:2, c:0, max:1, req:['e1','e2'], icon:I('arcanista-s8'), opts:[
    { k:'A', n:'Palabra de Poder', d:'Habilidad (ranura 2): escribes al instante 3 runas a tu alrededor. Se recarga en 40 s', role:'UNI', act:'m_h_palabra' },
    { k:'B', n:'Runa Guardiana', d:'Dentro del Sello recibes −20 % de daño (antes −10 %)', role:'AGU' } ], win:'A, para tener el Sello donde y cuando quieres (ocupa la ranura 2). B, para aguantar sin ocupar ranura' },
  { id:'e5', n:'Caligrafía Rápida', t:'p', tag:'num', r:2, c:1, max:1, req:['e2'], d:()=>'Escribes una runa cada 2 hechizos (antes cada 3)', icon:I('clase-c11') },
  { id:'e6', n:'Tinta Elemental', t:'p', tag:'mec', r:2, c:2, max:1, req:['e2','e3'], d:()=>'Las runas toman el elemento del hechizo: Hielo ralentiza 30 %, Arcano da 1 Carga, Fuego quema', icon:I('crionte-s5') },
  { id:'e7', n:'Inspiración', t:'p', tag:'mec', r:3, c:0, max:1, req:['e4','e5'], d:()=>'Al formarse un Sello, todos tus enfriamientos bajan 2 s', icon:I('clase-c14') },
  { id:'e8', n:'Glosa o Círculo', t:'c', tag:'mec', r:3, c:1, max:1, req:['e5'], icon:I('arcanista-s12'), opts:[
    { k:'A', n:'Glosa', d:'Los enemigos dentro del Sello reciben +10 % de daño', role:'UNI' }, { k:'B', n:'Círculo Protector', d:'Tú y tus aliados dentro del Sello recuperáis un 1 % de vida por segundo', role:'AGU' } ], win:'A, para hacer daño. B, para aguantar y para el grupo' },
  { id:'e9', n:'Doble Sello', t:'p', tag:'mec', r:3, c:2, max:1, req:['e5','e6'], d:()=>'Puedes tener 2 Sellos a la vez', icon:I('arcanista-x1') },
  { id:'e10', n:'Concentración', t:'p', tag:'num', r:4, c:0.5, max:1, req:['e7','e8'], d:()=>'Dentro del Sello lanzas un 10 % más rápido', icon:I('clase-c11') },
  { id:'e11', n:'Palimpsesto', t:'p', tag:'mec', r:4, c:1.5, max:1, req:['e8','e9'], d:()=>'Al acabar, el Sello deja 3 runas nuevas: si sigues ahí, vuelve a formarse', icon:I('arcanista-s7') },
  { id:'e12', n:'Gran Grimorio', t:'f', tag:'mec', r:5, c:1, max:1, req:['e10','e11'], d:()=>'Cada 30 s, tu siguiente Sello es un Grimorio 10 s: dentro, cada hechizo se lanza dos veces (la copia al 40 %)', icon:I('arcanista-x3') },
];

// especializaciones: árbol por id y builds del Crionte y del Arcanista. Las tres comparten rejilla (mismas filas,
// columnas, rangos, requisitos y puertas), así que una build legal en un árbol lo es en los otros con sus ids.
// En cada build: .sp = especialización · .spec = rangos del árbol de especialización · .cls/.clsOrder = clase.
TALENTS_V2.specs = { piromante: TALENTS_V2.spec, crionte: CRIONTE_TREE, arcanista: ARCANISTA_TREE };
{ const esc = TALENTS_V2.hero.find(h => h.id === 'escriba'); esc.nodes = ESCRIBA_NODES; delete esc.sketch;
  Object.assign(esc, { key:'Cada 3.er hechizo escribe una runa; tres runas cerca forman un Sello que te potencia', art:'ui256/menu_codice.webp' }); }
for (const k of ['brasa', 'cataclismo', 'ignicion', 'hibrido']) BUILDS_V2[k].sp = 'piromante';
{
  const P = BUILDS_V2, re = (o, pre) => Object.fromEntries(Object.entries(o).map(([k, v]) => [pre + k.slice(1), v]));
  const mk = (sp, from, pre, n, arch, specCh, cls, hero, heroCh, heroNodes) => ({ sp, n, arch, hero, heroCh, heroNodes,
    cls: { ...P[cls].cls }, clsOrder: P[cls].clsOrder.map(x => [...x]), clsCh: { ...P[cls].clsCh }, spec: re(P[from].spec, pre), specCh });
  Object.assign(P, {
    glaciar:  mk('crionte', 'brasa', 'i', 'Era Glacial', 'Glaciar', { i8:'A', i9:'A', i15:'A' }, 'brasa', 'escriba', { e2:'B', e4:'B', e8:'B' }, ['e2','e3','e6','e5','e9','e8','e11','e12','e4','e1']),
    tormenta: mk('crionte', 'cataclismo', 'i', 'Invierno Eterno', 'Tormenta', { i9:'A', i10:'A' }, 'cataclismo', 'invoca', { f2:'B', f4:'A', f8:'B' }, ['f2','f3','f6','f5','f9','f8','f11','f12','f4','f1']),
    fractura: mk('crionte', 'ignicion', 'i', 'Cero Absoluto', 'Fractura', { i8:'B', i9:'B', i15:'B' }, 'ignicion', 'escriba', { e2:'A', e4:'B', e8:'A' }, ['e2','e1','e3','e5','e8','e4','e7','e10','e12','e11']),
    hibcrio:  mk('crionte', 'hibrido', 'i', 'Escarcha Quebradiza', 'Híbrido Glaciar-Fractura', { i8:'A', i9:'B', i15:'A' }, 'hibrido', 'invoca', { f2:'A', f4:'B', f8:'B' }, ['f2','f1','f4','f5','f8','f3','f7','f10','f12','f11']),
    rayo:     mk('arcanista', 'brasa', 'a', 'Tormenta de Cargas', 'Rayo', { a8:'A', a9:'A', a15:'B' }, 'ignicion', 'crono', { t2:'A', t4:'B', t8:'A' }, ['t2','t1','t3','t5','t8','t4','t7','t10','t12','t11']),
    orbe:     mk('arcanista', 'ignicion', 'a', 'Constelación', 'Orbe', { a8:'B', a9:'B', a15:'A' }, 'cataclismo', 'escriba', { e2:'B', e4:'B', e8:'A' }, ['e2','e3','e6','e5','e9','e8','e11','e12','e4','e1']),
    grieta:   mk('arcanista', 'cataclismo', 'a', 'Grieta Eterna', 'Grieta', { a9:'A', a10:'A' }, 'brasa', 'crono', { t2:'A', t4:'A', t8:'A' }, ['t2','t3','t6','t5','t9','t8','t11','t12','t4','t1']),
    hibarca:  mk('arcanista', 'hibrido', 'a', 'Rayo Orbital', 'Híbrido Rayo-Orbe', { a8:'A', a9:'B', a15:'B' }, 'hibrido', 'escriba', { e2:'A', e4:'B', e8:'A' }, ['e2','e1','e3','e5','e8','e4','e7','e10','e12','e11']),
  });
}
const SPEC_DEFAULT_BUILD = { piromante:'brasa', crionte:'glaciar', arcanista:'rayo' };
const SPEC_HERO = { piromante:['crono', 'invoca'], crionte:['invoca', 'escriba'], arcanista:['crono', 'escriba'] };

// ============================================================ REGISTRO
window.TALENTS_V2_CLASSES = window.TALENTS_V2_CLASSES || {};
window.TALENTS_V2_CLASSES.maga = {
  formato: 1,                       // versión del contrato (TV2.formato)
  estado: 'aprobado',               // esqueleto · diseño · aprobado (la cinta del mockup solo se oculta con «aprobado»)
  id: 'maga', name: 'Maga', res: 'Maná', resIcon: 'res_mana', color: '#ff8a3d',
  emblem: 'ui/res_mana.webp',       // icono de la columna de clase (y del selector de clase)
  clsArt: 'specs/arcanista.webp',   // arte de fondo de la columna de clase
  book: { baseIcon: 'ui/res_mana.webp', baseNote: 'fuego, hielo y arcano' },
  specOrder: SPEC_IDS, defaultSpec: 'piromante', specs: M_SPECS,
  catalog: CATALOG,
  // barra válida para el nivel: lo que aún no se conoce cae al kit base de su ranura (o se vacía)
  fallbackBar: { lmb:'m_dardo', rmb:'bola_fuego', k1:'m_parpadeo', k2:'m_barrera', k3:null, k4:null },
  specBar: SPEC_BAR,
  // variantes de forja recomendadas por especialización (★ en el libro y botón «Recomendado»)
  reco: {
    piromante: { m_dardo:'A', bola_fuego:'B', meteoro:'A', m_u_supernova:'A', p_llamarada:'B' },
    crionte: { m_dardo:'B', nova_hielo:'B', m_toque:'A', m_u_tormenta:'A', m_paso_escarcha:'B' },
    arcanista: { rayo:'B', m_u_desgarro:'B', m_onda:'A', m_armadura:'B' },
  },
  sup: { bola_fuego:['amplify','wide'] },  // engarces iniciales del mockup
  mech: MECH_TXT, innate: SPEC_INNATE_TXT,
  // grupos de habilidades para los nodos que tocan «todo tu X» (flag del nodo: fire:true, frost:true, arcane:true)
  groups: {
    fire:   { label: 'Toca todo tu Fuego', ids: ['m_dardo', 'bola_fuego', 'p_llamarada', 'm_estela_ignea', 'meteoro', 'm_u_supernova'] },
    frost:  { label: 'Toca todo tu Hielo', ids: ['m_dardo', 'nova_hielo', 'k_prision', 'm_paso_escarcha', 'k_lanza', 'm_u_tormenta'] },
    arcane: { label: 'Toca todo tu Arcano', ids: ['m_dardo', 'rayo', 'a_orbe', 'a_sello', 'm_u_desgarro'] },
  },
  tree: { cls: TALENTS_V2.cls, spec: TALENTS_V2.specs, hero: TALENTS_V2.hero },
  specHero: SPEC_HERO, builds: BUILDS_V2, defaultBuild: SPEC_DEFAULT_BUILD,
  // nodos que usan las demos de captura (&demo=spend|choice|hover|hoveract|rclick|pick|undo|hl|gate|specswap)
  demo: { spend:'s16', choice:'s9', hover:'s9', hoveract:'t4', rclick:'s9', pick:'s8', undo:'s23', hl:'meteoro', swapTo:'crionte',
    gate: { ranks: { c2:2, c1:2, c3:2, c6:1 }, ch: { c6:'B' }, buy: ['c5', 'A'] } },
};
})();
