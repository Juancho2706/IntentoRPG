/* =====================================================================================================
 * Talentos v2 · ARQUERA (Paso 2g, plantilla §17 de docs/paso2g-maga-coherencia.md) · ETAPAS 1 Y 2 (completa)
 * -----------------------------------------------------------------------------------------------------
 * Diseño: docs/paso2g-arquera.md · contrato: data/README-talents-v2.md · molde: data/talents-v2-maga.js
 * Mockup: docs/mockups/skills-ux.html?cls=arquera&view=talents (abrir como file:///)
 * Validar: node docs/mockups/data/validar-talentos.mjs arquera
 *
 * ETAPA 1: kit base, árbol de CLASE y la TIRADORA (kit con forja, pasiva, mecánica, árbol y 2 builds).
 * ETAPA 2: FRANCOTIRADORA (cargar y soltar, plantada) y MONTARAZ (colocar y detonar), cada una con kit, pasiva,
 * mecánica, árbol de 29 nodos y 4 builds; los 3 ÁRBOLES HÉROE (Errante del Viento, Carcaj Encantado, Halconera);
 * las builds «Vaivén Eterno» y «Galerna Infinita» de la Tiradora y el Paragon (heroNodes) de las 12 builds.
 * CORRECCIÓN DE LA ETAPA 2 (juicio de 3 jueces, 2026-10-21): bucles de Concentración, Galerna, Rearme y humo cerrados;
 * números recalibrados con el modelo de %WD/s del documento (§12.1); finales que escalan por rango; activas mejoradas.
 * REJUICIO (decisiones del orquestador, 2026-10-21; doc §17.3): Gran Cacería (m26) a mitad de daño y Cepo Reforzado (m8B)
 * 3 × 20 % (contra un jefe, ~0,80 de la Francotiradora); Espinas de Caza toma Halcón Peregrino (y8B). Ningún id cambió.
 * REJUICIO DE BALANCE, RONDA 2 (juez independiente; doc §19): Punta Curativa (w4B) con techo; Presa Atrapada (m5) una vez cada
 * 10 s; veneno del cepo que se renueva; Cerco gratis de Bosque Vivo (m27) sin veneno ni estallido; Atalaya (f10A, f21, f27) y
 * Ciclones (v24) a la baja; Rueda de Flechas (v10A) al 50 %; Tormenta de Plumas (v25) contra jefes; activas c11A, c22A y w4A a
 * 20 s; topes en c5B y w11; Saetas Pesadas 700 %; marca del halcón +10 %; Bosque Vivo con Puntas Afines (w9). Ningún id cambió.
 * Prefijos de id: clase c1…c30 · Tiradora v0…v28 · Francotiradora f0…f28 · Montaraz m0…m28 ·
 * héroes q0…q12 (h1 Errante del Viento), w0…w12 (h2 Carcaj Encantado), y0…y12 (h3 Halconera).
 * ===================================================================================================== */
(function () {
'use strict';
const TV2 = window.TV2;
const { n1 } = TV2;                                   // n1(1.5) → "1,5" (números con coma en los textos)
const I = id => `talents/arquera-${id}.webp`;         // icono: I('clase-c1') → talents/arquera-clase-c1.webp
const S = id => `icons256/${id}.webp`;                // icono de habilidad reutilizado en un nodo

// ============================================================ LIBRO: catálogo de la Arquera
// kit base (toda Arquera, Nv1–8) · activas de los nodos de elección de clase (ranura 2) · kits de la Tiradora, la Francotiradora
// y el Montaraz (Nv10–15) · activas de los árboles héroe (ranura 2)
const CATALOG = [
  // — KIT BASE (toda Arquera, Nv1–8): básica, dos principales de estilo distinto (línea y zona), movilidad y defensa —
  { id:'a_disparo', n:'Disparo Rápido', cat:'basic', req:1, elem:'physical', coef:1.0, gen:5, s:'Dispara una flecha veloz (100 % del arma). Cada acierto te devuelve 5 de Energía.',
    innate:{ tiradora:'Tiradora: cada 3.er disparo, 2 flechas más', francotiradora:'Francotiradora: se puede tensar (mantén)' },
    M:{ n:'Mano Rápida', s:'Disparas un 10 % más rápido.', k:'★set{cadence:.9}' },
    A:{ n:'Disparo Disperso', r:'AREA', s:'3 flechas en abanico de 25° (45 % cada una).', k:'★set{count:3, spread:.218, coef:.45} (absorbe a Disparo Disperso)' },
    B:{ n:'Flecha de Cicuta', r:'UNI', s:'Se vuelve de Naturaleza: 70 % y veneno del 50 % en 4 s, que se suma.', k:'★elem nature · coef .7 · hitDot poison .5/4 s (absorbe a Flecha de Cicuta)' } },
  { id:'flecha_perforante', n:'Flecha Perforante', cat:'spender', req:2, elem:'physical', coef:2.4, cost:26, s:'Una flecha pesada (240 %) que atraviesa a todos los enemigos en línea. Cuesta 26 de Energía.',
    M:{ n:'Astil de Fresno', s:'+2 m de alcance y +20 % de velocidad de la flecha.', k:'range +15 · ★add{speed:+20%}' },
    A:{ n:'Flecha Explosiva', r:'AREA', s:'No atraviesa: explota en 3 m al 80 %.', k:'★set{pierce:false} · ★set{splash:.8, radius:3}' },
    B:{ n:'Tiro de Precisión', r:'UNI', s:'Preparas 0,35 s (la esquiva la cancela): +45 % de daño.', k:'★set{windup:.35} · dmg +45' } },
  { id:'a_paso', n:'Paso Veloz', cat:'movement', req:4, elem:'physical', cd:9, s:'Ruedas 6 m hacia donde te mueves y ganas +20 % de velocidad de ataque durante 3 s.',
    M:{ n:'Ágil', s:'El bonus dura 3 → 4 s.', k:'durS 1' },
    A:{ n:'Rodar y Disparar', r:'UNI', s:'Al rodar disparas un Disparo Rápido gratis al 150 %.', k:'★power v_rodar (afterCast)' },
    B:{ n:'Doble Rodada', r:'MOV', s:'2 cargas (9 s cada una), sin el bonus de ataque.', k:'★charges 2 · buff 0' } },
  { id:'a_humo', n:'Bomba de Humo', cat:'defense', req:6, elem:'physical', cd:16, s:'Nube de 4 m durante 8 s: dentro recibes un 50 % menos de daño y los cegados pegan un 30 % menos. Recarga al disiparse.',
    M:{ n:'Humo Espeso', s:'Radio 4 → 5 m.', k:'radius +25' },
    A:{ n:'Humo Venenoso', r:'AREA', s:'Dentro, los enemigos sufren veneno del 40 % por segundo.', k:'dot poison · ★set{coef:.4}' },
    B:{ n:'Estallido de Humo', r:'CTRL', s:'Al lanzarla, empuja 3 m a los cercanos y los ralentiza un 40 % 2 s.', k:'★knock 3 · slow 2 · slowPct 40' } },
  { id:'lluvia_flechas', n:'Lluvia de Flechas', cat:'spender', req:8, elem:'physical', coef:0.6, cost:30, cd:4, s:'Tras 0,3 s de aviso, caen 4 oleadas de flechas en un círculo de 3 m (60 % cada una).',
    M:{ n:'Cielo Plomizo', s:'4 → 5 oleadas.', k:'★add{waves:1}' },
    A:{ n:'Aguacero', r:'UNI', s:'Radio 2 m, cae en 0,8 s y hace +40 % de daño.', k:'radius −33 · ★set{span:.8} · dmg +40' },
    B:{ n:'Cortina', r:'AGU', s:'Dentro, los enemigos pegan un 15 % menos y fallan la mitad de sus proyectiles.', k:'★set{allyDr:15, projMissPct:50} (zona)' } },
  // — activas de clase que se eligen en un nodo de elección del árbol de clase (ranura 2) —
  { id:'a_t_camuflaje', n:'Camuflaje', cat:'defense', req:21, talent:true, grantBy:'c11', elem:'physical', cd:20, icon:I('clase-c12'), s:'Te vuelves invisible 4 s, los enemigos te pierden y Paso Veloz se recarga; tu primer disparo al salir es crítico.' },
  { id:'agilidad', n:'Agilidad', cat:'utility', req:27, talent:true, grantBy:'c17', elem:'physical', cd:16, s:'Durante 6 s: +30 % de velocidad, +15 % de velocidad de ataque e inmunidad a las ralentizaciones.' },
  { id:'a_t_bengala', n:'Flecha Bengala', cat:'utility', req:31, talent:true, grantBy:'c22', elem:'physical', cd:20, icon:I('clase-c15'), s:'Una bengala de 10 m durante 10 s: dentro, los enemigos reciben un 15 % más de daño del grupo y pegan un 15 % menos.' },
  // — KIT DE LA TIRADORA (solo con la especialización; Nv10–15) —
  { id:'a_t_andanada', n:'Andanada', cat:'spec', req:10, spec:'tiradora', elem:'physical', coef:0.45, cost:25, cd:8, icon:I('tiradora-s4'), s:'Saltas 4 m atrás y disparas 10 flechas en 120° (45 % cada una). En 2 s, pulsa otra vez: saltas adelante y repites.',
    M:{ n:'Arco Ancho', s:'Abanico 120 → 150°.', k:'★set{spread:150°}' },
    A:{ n:'Andanada Cerrada', r:'UNI', s:'Abanico de 30° y +3 m de alcance: hasta 3 flechas de cada salto dan al mismo enemigo.', k:'★set{spread:30°, perTarget:3} · range +3 (tope por salto)' },
    B:{ n:'Andanada Repulsora', r:'CTRL', s:'Las flechas empujan 2 m y ralentizan un 30 % 2 s; −15 % de daño.', k:'★knock 2 · slow 2 · slowPct 30 · dmg −15' } },
  { id:'a_v_carrera', n:'Carrera del Viento', cat:'movement', req:12, spec:'tiradora', elem:'physical', coef:0.45, cd:10, icon:I('tiradora-s9'), s:'Mantén pulsado: corres un 40 % más rápido hasta 4 s y disparas sola al enemigo más cercano cada 0,4 s (45 %).',
    M:{ n:'Galope', s:'Corres un 40 → 55 % más rápido.', k:'★set{moveMul:1.55}' },
    A:{ n:'Carrera Certera', r:'UNI', s:'Disparas cada 0,6 s al enemigo con más vida; +70 % de daño.', k:'★set{autoShot.every:.6, autoShot.target:maxHp} · dmg +70' },
    B:{ n:'Carrera Esquiva', r:'AGU', s:'Mientras corres, el 40 % de los proyectiles enemigos te fallan; −30 % de daño.', k:'★set{projMissPct:40} · dmg −30' } },
  { id:'flecha_multiple', n:'Flecha Múltiple', cat:'spender', req:14, spec:'tiradora', elem:'physical', coef:0.45, cost:22, s:'Disparas 5 flechas en un abanico de 50° (45 % cada una). No te frena: úsala corriendo.',
    M:{ n:'Alcance Largo', s:'+3 m de alcance (10 → 13 m).', k:'range +30' },
    A:{ n:'Abanico Abierto', r:'AREA', s:'7 flechas en 90° (38 % cada una).', k:'★set{count:7, spread:90°, coef:.38}' },
    B:{ n:'Haz Cerrado', r:'UNI', s:'3 flechas juntas en 10° que atraviesan; 55 % cada una.', k:'★set{count:3, spread:10°, pierce:true, coef:.55}' } },
  { id:'a_u_diluvio', n:'Diluvio de Saetas', cat:'ultimate', req:15, spec:'tiradora', elem:'physical', coef:1.7, cd:50, s:'Una nube de saetas te sigue 6 s y cada 0,5 s descarga en 4 m a tu alrededor (170 % por oleada).',
    M:{ n:'Nube Ancha', s:'Radio 4 → 5 m.', k:'radius +25' },
    A:{ n:'Diluvio Anclado', r:'AREA', s:'Queda fijo donde apuntas, con 6 m de radio.', k:'★set{follow:false, at:target, radius:6}' },
    B:{ n:'Saetas Pesadas', r:'UNI', s:'4 saetas de 700 % caen sobre tu objetivo en 2 s.', k:'★set{waves:4, span:2, radius:1.5, coef:7}' } },
  // — KIT DE LA FRANCOTIRADORA (solo con la especialización; Nv10–15). Verbo principal: CARGAR Y SOLTAR, plantada —
  { id:'a_t_apuntado', n:'Disparo Apuntado', cat:'spec', req:10, spec:'francotiradora', elem:'physical', coef:2.5, cost:30, cd:4, icon:S('a_p_punteria'),
    s:'Mantén para tensar hasta 1,5 s y suelta: de 80 a 250 % y atraviesa. En la ventana dorada, +50 % y crítico.',
    M:{ n:'Tensado Rápido', s:'Tensas un 15 % más rápido (carga completa en 1,3 s).', k:'★set{charge.max:1.3}' },
    A:{ n:'Tres Saetas', r:'AREA', s:'A carga completa sueltas 3 saetas en abanico de 20° que atraviesan (40 % cada una).', k:'★set{charge.fullCount:3, spread:20°, coef ×0,4}' },
    B:{ n:'Tiro Pesado', r:'UNI', s:'Tensas hasta 2,5 s: hasta 300 %, pero no atraviesa.', k:'★set{charge.max:2.5, charge.coefMax:3, pierce:false}' } },
  { id:'a_f_rodilla', n:'Rodilla en Tierra', cat:'utility', req:12, spec:'francotiradora', elem:'physical', cd:14, icon:I('francotiradora-s8'),
    s:'Postura 8 s: Disparo Apuntado y los haces se tensan un 40 % más rápido y moverte no gasta Concentración (vas al 50 %).',
    M:{ n:'Rodilla Firme', s:'Disparo Apuntado y los haces se tensan un 50 % más rápido (antes 40 %).', k:'★set{chargeMul:1.5}' },
    A:{ n:'Puesto Fijo', r:'UNI', s:'No te mueves: Disparo Apuntado y los haces se tensan el doble de rápido y hacen +15 %.', k:'★set{moveMul:0, chargeMul:2} · dmg +15 (Apuntado y haces)' },
    B:{ n:'Parapeto', r:'AGU', s:'De rodillas recibes un 30 % menos de daño y la mitad de los proyectiles te fallan.', k:'★set{dr:30, projMissPct:50}' } },
  { id:'a_f_rastreador', n:'Tiro Rastreador', cat:'spender', req:14, spec:'francotiradora', elem:'physical', coef:1.4, cost:20, icon:I('francotiradora-x1'),
    s:'Una flecha (140 %) que abre un Punto Débil 8 s: tu primer tensado contra él es perfecto y +30 % (uno cada 8 s).',
    M:{ n:'Marca Duradera', s:'El Punto Débil dura 12 s (antes 8 s).', k:'mark.dur 12' },
    A:{ n:'Rastreo Múltiple', r:'AREA', s:'Abre el Punto Débil en 3 enemigos a 4 m del blanco; dura 6 s.', k:'★set{markCount:3, markRadius:4, mark.dur:6}' },
    B:{ n:'Grillete', r:'CTRL', s:'El marcado va un 50 % más lento; a un jefe le llena 20 de Quebranto.', k:'slow 8 · slowPct 50 · stagger 20 (jefes)' } },
  { id:'a_u_celeste', n:'Tiro Celestial', cat:'ultimate', req:15, spec:'francotiradora', elem:'physical', coef:4, cd:50,
    s:'Durante 8 s tensas hasta 3 haces celestes (0,8 s cada uno): 400 % y atraviesan. Perfecto: +50 % y crítico.',
    M:{ n:'Cielo Abierto', s:'Tienes 10 s para disparar los haces (antes 8 s).', k:'window 10' },
    A:{ n:'Lluvia Estelar', r:'AREA', s:'Cada haz cae del cielo donde apuntas, en 4 m (150 %); no atraviesa.', k:'★set{at:target, radius:4, coef:1.5, pierce:false}' },
    B:{ n:'Haz Único', r:'UNI', s:'Un solo haz que tensas hasta 3 s: hasta 1000 %.', k:'★set{shots:1, charge.max:3, charge.coefMax:10}' } },
  // — KIT DEL MONTARAZ (solo con la especialización; Nv10–15). Verbo principal: COLOCAR Y DETONAR trampas y zonas —
  { id:'a_t_cepo', n:'Trampa de Cepo', cat:'spec', req:10, spec:'montaraz', elem:'nature', coef:0.6, cost:10, cd:8, icon:I('montaraz-s0'),
    s:'Colocas un cepo (hasta 3; se arma en 0,5 s): inmoviliza 2 s y envenena (60 % en 5 s; se renueva, no se suma). 2 cargas.',
    M:{ n:'Muelles Firmes', s:'Se arma en 0,2 s (antes 0,5 s).', k:'armT .2' },
    A:{ n:'Mina de Espinas', r:'AREA', s:'No inmoviliza: al pisarla estalla en 3 m (100 %).', k:'★set{root:0, burst:{radius:3, coef:1}}' },
    B:{ n:'Red de Caza', r:'CTRL', s:'Al pisarla lanza una red de 3 m que inmoviliza 2,5 s a todos los que atrapa.', k:'★set{radius:3, root:2.5} · absorbe a Red de Caza (a_red)' } },
  { id:'a_m_acecho', n:'Salto de Acecho', cat:'movement', req:12, spec:'montaraz', elem:'physical', coef:1.0, cd:10, icon:I('montaraz-s2'),
    s:'Saltas a tu trampa más cercana al cursor (hasta 15 m) y la haces estallar al llegar (100 %). Sin trampas, 6 m.',
    M:{ n:'Acecho Lejano', s:'Llegas a trampas a 20 m (antes 15 m).', k:'range 20' },
    A:{ n:'Acecho Enredador', r:'CTRL', s:'Al llegar no la gastas: inmovilizas 1,5 s a todos a 3 m.', k:'★set{consume:false, root:1.5, radius:3}' },
    B:{ n:'Doble Acecho', r:'MOV', s:'2 cargas (10 s cada una); el estallido hace un 30 % menos.', k:'★charges 2 · dmg −30' } },
  { id:'a_m_detonante', n:'Flecha Detonante', cat:'spender', req:14, spec:'montaraz', elem:'physical', coef:0.8, cost:24, icon:I('montaraz-s6'),
    s:'Estalla en 3 m (80 %) y hace estallar tus trampas que alcanza (100 % cada una; como mucho 2 por enemigo).',
    M:{ n:'Pólvora Fina', s:'Estalla en 4 m (antes 3 m).', k:'radius +33' },
    A:{ n:'Detonación en Cadena', r:'AREA', s:'Cada trampa que estalla hace estallar las tuyas a 6 m, una tras otra.', k:'★set{chain:6}' },
    B:{ n:'Flecha de Garfio', r:'CTRL', s:'No estalla: arrastra 6 m al enemigo hacia tu trampa más cercana.', k:'★set{splash:0, pull:{to:trap, dist:6}} · absorbe al Arpón (a_t_arpon)' } },
  { id:'a_u_zarzas', n:'Cerco de Zarzas', cat:'ultimate', req:15, spec:'montaraz', elem:'nature', coef:1.0, cd:45,
    s:'Anillo de zarzas de 7 m, 8 s: cruzarlo inmoviliza 1,5 s; dentro, veneno (100 % por segundo); al cerrarse, 300 %.',
    M:{ n:'Espinas Duraderas', s:'Dura 10 s (antes 8 s).', k:'dur 10' },
    A:{ n:'Jaula de Espinas', r:'UNI', s:'Se cierra sobre un enemigo: 3 m, no puede salir y el veneno hace +60 %.', k:'★set{radius:3, target:one, trapIn:true} · dmg +60' },
    B:{ n:'Señuelo de Zarzas', r:'AGU', s:'En el centro, un señuelo de paja atrae 6 s a los enemigos a 10 m.', k:'★set{decoy:{dur:6, radius:10}} · absorbe al Señuelo de Paja (a_t_senuelo)' } },
  // — activas de ÁRBOL HÉROE (opción A de una elección del Paragon; ranura 2; sin forja) —
  { id:'a_h_torbellino', n:'Torbellino', cat:'utility', req:72, talent:true, grantBy:'q4', hero:true, elem:'physical', cd:40, icon:I('tiradora-s15'), s:'Un torbellino de 4 m levanta 1,5 s a los enemigos y te da 3 Ráfagas.' },
  { id:'a_h_puntas', n:'Desborde de Puntas', cat:'utility', req:72, talent:true, grantBy:'w4', hero:true, elem:'physical', cd:20, icon:I('clase-c9'), s:'Tus 8 siguientes disparos llevan las tres puntas encantadas a la vez.' },
  { id:'a_h_halcon', n:'Llamada del Halcón', cat:'utility', req:72, talent:true, grantBy:'y4', hero:true, elem:'physical', cd:30, icon:I('clase-c4'), s:'El halcón ataca a tu blanco 6 s sin parar (40 % cada 0,5 s), lo deja ciego y le llena 30 de Quebranto.' },
];

// ============================================================ ESPECIALIZACIONES: metadatos, barra, mecánica y pasiva
const SPECS = {
  tiradora: { id:'tiradora', name:'Tiradora Veloz', role:'Daño en área', mech:'Impulso', mechIco:'emblems/tiradora.webp',
    line:'Nunca se detiene: dispara corriendo, salta atrás y vuelve a disparar.', innate:'Cada 3.er Disparo Rápido sale triple', gauge:'impulso' },
  francotiradora: { id:'francotiradora', name:'Francotiradora', role:'Un objetivo', mech:'Concentración', mechIco:'emblems/francotiradora.webp',
    line:'Plantada, tensa y suelta en el instante justo: un disparo, una baja.', innate:'Disparo Rápido se puede tensar', gauge:'concentracion' },
  montaraz: { id:'montaraz', name:'Montaraz', role:'Control', mech:'Coto de Caza', mechIco:'emblems/montaraz.webp',
    line:'Prepara el terreno: coloca cepos, atrae a la presa y hazlo estallar todo.', innate:'Tus trampas atraen a los enemigos', gauge:'coto' },
};
const SPEC_IDS = ['tiradora', 'francotiradora', 'montaraz'];
const BASE_BAR = { lmb:'a_disparo', rmb:'flecha_perforante', k1:'a_paso', k2:'a_humo', k3:null, k4:null };
const SPEC_BAR = {
  tiradora: { bar:{ lmb:'a_disparo', rmb:'flecha_multiple', k1:'a_v_carrera', k2:'a_humo', k3:'a_t_andanada', k4:'a_u_diluvio' }, forge:{ a_disparo:'A', flecha_multiple:'A' }, sel:'flecha_multiple' },
  francotiradora: { bar:{ lmb:'a_disparo', rmb:'a_f_rastreador', k1:'a_paso', k2:'a_f_rodilla', k3:'a_t_apuntado', k4:'a_u_celeste' }, forge:{ a_disparo:'B', a_t_apuntado:'B', a_f_rastreador:'B' }, sel:'a_t_apuntado' },
  montaraz: { bar:{ lmb:'a_disparo', rmb:'a_m_detonante', k1:'a_m_acecho', k2:'a_humo', k3:'a_t_cepo', k4:'a_u_zarzas' }, forge:{ a_disparo:'B', a_t_cepo:'B' }, sel:'a_t_cepo' },
};
const MECH_TXT = {
  tiradora: { n:'Impulso', range:'0–100', ico:'emblems/tiradora.webp',
    gen:'+3 por cada acierto mientras te mueves (como mucho uno cada 0,15 s). Quieta no ganas',
    out:'A 100: Vendaval 6 s. +25 % de velocidad de ataque y +1 flecha a Flecha Múltiple',
    loss:'Quieta más de 2 s: −10 por segundo. Al acabar el Vendaval vuelve a 0',
    feed:['a_disparo', 'flecha_multiple', 'a_t_andanada', 'a_v_carrera'], feedNames:{ a_disparo:'Disparo Rápido (en movimiento)' },
    alt:'impulso · perShot 3 · shotGap 0,15 · galeT 6 · galeAspd 25 · galeProj 1 · NUEVO: idleAfter 2 · idleRate 10' },
  francotiradora: { n:'Concentración', range:'0–100', ico:'emblems/francotiradora.webp',
    gen:'Quieta: +15 por segundo. Perfecto de Disparo Apuntado o de un haz: +15 (uno por segundo); del básico: +3',
    out:'Cada punto: +0,15 % de crítico. A 100: Calma Absoluta 5 s, es perfecto todo tensado a media carga o más',
    loss:'Moverte: −25 por segundo (de rodillas, nada). Tras la Calma vuelve a 0 y no sube durante 7 s (Respiro)',
    feed:['a_disparo', 'a_t_apuntado', 'a_f_rastreador', 'a_f_rodilla', 'a_u_celeste'], feedNames:{ a_disparo:'Disparo Rápido (tensado)' },
    alt:'concentracion · gainPerSec 15 (antes 20) · NUEVO: perfectGain 15 (Apuntado y haces; 1 por s) · basicPerfectGain 3 · losePerSec 25 · critPerPoint 0,15 · NUEVO: calmT 5 (perfecto desde media carga; chargeMul 1,5 en Apuntado y haces) · calmLock 7' },
  montaraz: { n:'Coto de Caza', range:'0–3 trampas', ico:'emblems/montaraz.webp',
    gen:'Cada trampa armada suma 1 (hasta 3; un Racimo cuenta como 1). Presa: el primer élite o jefe que golpeas, 15 s',
    out:'Si estallan 3 trampas a la vez: Batida, los alcanzados y tu Presa reciben +15 % de daño 6 s (una cada 12 s)',
    loss:'Una trampa sin pisar se desarma a los 30 s. La Presa se pierde a los 15 s sin golpearla',
    feed:['a_t_cepo', 'a_m_detonante', 'a_m_acecho', 'a_u_zarzas'],
    alt:'coto · maxArmed 3 · armT 0,5 · armLife 30 · preyT 15 · NUEVO: batida (3 estallidos en 1 s) dmgTaken 15 · 6 s · icd 12 · cebo 6 m · detonate.perTarget 2' },
};
const SPEC_INNATE_TXT = {
  tiradora: { sk:'a_disparo', n:'Tercera Flecha', l:'Cada 3.er Disparo Rápido lanza 2 flechas más en abanico de 30° (60 % cada una).', f:'Con otra especialización, Disparo Rápido vuelve a ser una sola flecha' },
  francotiradora: { sk:'a_disparo', n:'Cuerda Tensa', l:'Mantén Disparo Rápido para tensarlo hasta 1 s: hasta +60 %. Su último 0,2 s es perfecto: crítico seguro.', f:'Con otra especialización, Disparo Rápido no se puede tensar' },
  montaraz: { sk:'a_t_cepo', n:'Cebo de Caza', l:'Tus trampas armadas atraen: los enemigos a 6 m caminan hacia ellas (los élites, a 3 m; los jefes, no).', f:'Sin el Montaraz no tienes trampas' },
};

// ============================================================ ÁRBOLES
// Nodo: { id, n, t: p|c|k|f|x, tag: num|mec, r, c, max, req[], d(r), opts[{k,n,d,role,act,impl}], win, touch[], arch, hyb, final, icon, impl }
// Forma: CÍRCULO = pasivo · CUADRADO = activo (concede habilidad) · HEXÁGONO = elección A/B.
// ---------------------------------------------------------------- CLASE (toca el kit base y lo genérico; no nombra el kit de ninguna especialización)
// izquierda = Defensa (Bomba de Humo) · centro = Ritmo (básica, principales, Energía) · derecha = Movilidad (Paso Veloz)
const CLS = [
  { id:'c1', n:'Carcaj Profundo', t:'p', tag:'num', r:0, c:1, max:2, d:r=>`+${10*r} de Energía máxima (antes 60)`, icon:I('clase-c6'), impl:'stats.mp · existe' },
  { id:'c2', n:'Pulso Firme', t:'p', tag:'num', r:0, c:3, max:2, d:r=>`Todas tus flechas hacen +${6*r} % de daño`, flechas:true, icon:I('clase-c1'), impl:'stats.dmgPct · existe' },
  { id:'c3', n:'Paso de Gacela', t:'p', tag:'num', r:0, c:5, max:2, d:r=>`Paso Veloz se recarga en ${n1(9-1.5*r)} s (antes 9 s)`, touch:['a_paso'], icon:I('clase-c11'), impl:'mod a_paso cdr · existe' },
  { id:'c4', n:'Bomba Rápida', t:'p', tag:'num', r:1, c:0, max:3, req:['c1'], d:r=>`La Bomba de Humo se recarga en ${16-2*r} s (antes 16 s)`, touch:['a_humo'], icon:S('a_humo'), impl:'mod a_humo cdr · existe' },
  { id:'c5', n:'Disparo: Fijo o Saqueo', t:'c', tag:'mec', r:1, c:2, max:1, req:['c1','c2'], touch:['a_disparo'], icon:S('a_disparo'), opts:[
    { k:'A', n:'Puntería Fija', d:'Cada 4.º Disparo Rápido al mismo enemigo es crítico seguro', role:'UNI', impl:'power a_punteria_fija · NUEVO (onCast cast.forceCrit, cuenta por objetivo)' },
    { k:'B', n:'Flecha Saqueadora', d:'Si Disparo Rápido mata, recuperas 8 de Energía (como mucho una vez por disparo)', role:'AREA', impl:'power a_saqueo · NUEVO (onKill + g.gainResource; una vez por lanzamiento)' } ],
    win:'A, contra jefes: un crítico seguro cada ~3 s. B, contra grupos: como mueren muchos, ≈ una habilidad principal extra cada 3 muertes' },
  { id:'c6', n:'Distancia: Bocajarro o Lejos', t:'c', tag:'mec', r:1, c:4, max:1, req:['c2','c3'], flechas:true, icon:I('francotiradora-s8'), opts:[
    { k:'A', n:'A Bocajarro', d:'A menos de 5 m, tus flechas hacen +15 % de daño y empujan 1 m al enemigo', role:'AREA', impl:'power a_bocajarro · NUEVO (condAdd por distancia + knock)' },
    { k:'B', n:'Tiro Lejano', d:'A más de 10 m, tus flechas hacen +20 % de daño', role:'UNI', impl:'power a_tiro_lejano · NUEVO (condAdd por distancia)' } ],
    win:'A, contra grupos que te alcanzan: el empuje te da aire para seguir kiteando. B, contra jefes, si sabes mantener la distancia. Sirve igual a las tres' },
  { id:'c7', n:'Paso Limpio', t:'p', tag:'mec', r:1, c:6, max:1, req:['c3'], d:()=>'Paso Veloz te quita las ralentizaciones y las inmovilizaciones', touch:['a_paso'], icon:I('clase-c2'), impl:'mod a_paso cleanse · clave existente (prof.cleanse)' },
  { id:'c8', n:'Difícil de Alcanzar', t:'p', tag:'num', r:2, c:1, max:2, req:['c4','c5'], d:r=>`Mientras te mueves, recibes un ${6*r} % menos de daño`, icon:I('clase-c7'), impl:'tv.drMoving · existe' },
  { id:'c9', n:'Perforante: Lastrada o Diamante', t:'c', tag:'mec', r:2, c:3, max:1, req:['c5','c6'], touch:['flecha_perforante'], icon:S('flecha_perforante'), opts:[
    { k:'A', n:'Flecha Lastrada', d:'Flecha Perforante ralentiza un 40 % durante 3 s a todos los que atraviesa', role:'CTRL', impl:'mod flecha_perforante slow/slowPct · claves existentes' },
    { k:'B', n:'Punta de Diamante', d:'Flecha Perforante hace +40 % al primer enemigo que toca', role:'UNI', impl:'power a_punta_diamante · NUEVO (condAdd al primer impacto)' } ],
    win:'A, para controlar grupos en fila y escapar de ellos. B, contra jefes y élites' },
  { id:'c10', n:'Roma o Silbante', t:'c', tag:'mec', r:2, c:5, max:1, req:['c6','c7'], icon:I('clase-c3'), opts:[
    { k:'A', n:'Flecha Roma', d:'Cada 8 s, tu siguiente disparo ralentiza un 50 % durante 4 s', role:'CTRL', impl:'power a_flecha_roma · NUEVO (lógica de a_t_conmocion; onHit + applyCC slow)' },
    { k:'B', n:'Flecha Silbante', d:'Cada 10 s, tu siguiente disparo corta el hechizo del enemigo y lo deja mudo 3 s', role:'UNI', impl:'power a_silbante · NUEVO (lógica de a_t_silencio; applyCC interrupt = 20 de Quebranto a jefes)' } ],
    win:'A, contra grupos que te persiguen. B, contra jefes y élites que lanzan hechizos (además les llena 20 de Quebranto)' },
  { id:'c11', n:'Camuflaje o Instinto', t:'c', tag:'mec', r:3, c:0, max:1, req:['c8'], icon:I('clase-c12'), opts:[
    { k:'A', n:'Camuflaje', d:'Habilidad (ranura 2): invisible 4 s; te pierden, Paso Veloz se recarga y tu primer disparo es crítico. 20 s', role:'AGU', act:'a_t_camuflaje', impl:'activa a_t_camuflaje · existe (+ power a_camuflaje: cds a_paso = 0)' },
    { k:'B', n:'Instinto de Supervivencia', d:'Un golpe que te mataría te deja con 1 de vida y suelta una Bomba de Humo gratis. Una vez cada 180 s', role:'AGU', impl:'power a_instinto · NUEVO (onLethal + lanza a_humo como eco)' } ],
    win:'A, contra golpes de jefe que se ven venir: esquivas y vuelves a rodar (ocupa la ranura 2). B, un seguro cada 3 minutos sin ocupar ranura' },
  { id:'c12', n:'Respiración Pausada', t:'p', tag:'num', r:3, c:2, max:2, req:['c8','c9'], d:r=>`Recuperas Energía un ${15*r} % más rápido`, icon:I('clase-c10'), impl:'stats.regenPct (Energía) · existe' },
  { id:'c13', n:'Ojo de Halcón', t:'p', tag:'num', r:3, c:4, max:2, req:['c9','c10'], d:r=>`+${5*r} % de probabilidad de crítico`, icon:I('clase-c4'), impl:'stats.crit · existe' },
  { id:'c14', n:'Paso: Abrojos o Sanador', t:'c', tag:'mec', r:3, c:6, max:1, req:['c10'], touch:['a_paso'], icon:I('montaraz-s3'), opts:[
    { k:'A', n:'Paso de Abrojos', d:'Donde empieza tu Paso Veloz quedan abrojos 3 s que ralentizan un 50 %', role:'CTRL', impl:'power a_paso_abrojos · NUEVO (spawnField zona)' },
    { k:'B', n:'Paso Sanador', d:'Paso Veloz te cura un 6 % de la vida', role:'AGU', impl:'power a_rodada_cura · NUEVO (g.heal self)' } ],
    win:'A, para escapar de enemigos cuerpo a cuerpo. B, para aguantar peleas largas' },
  { id:'c15', n:'Adrenalina o Calma Letal', t:'c', tag:'mec', r:4, c:1, max:1, req:['c11','c12'], icon:I('tiradora-s11'), opts:[
    { k:'A', n:'Adrenalina', d:'Al bajar del 50 % de vida recuperas 30 de Energía y recibes un 20 % menos 4 s. Una vez cada 30 s', role:'AGU', impl:'power a_adrenalina · NUEVO (④ onDamaged + addBuff dr)' },
    { k:'B', n:'Calma Letal', d:'Con más de 40 de Energía, haces +10 % de daño', role:'UNI', impl:'tv.highManaDmg (umbral 40 de Energía) · existe' } ],
    win:'A, para sobrevivir a golpes fuertes (+12–15 % de aguante). B, para hacer daño (+6–8 %)' },
  { id:'c16', n:'Presión o Barrido', t:'c', tag:'mec', r:4, c:3, max:1, req:['c12','c13'], flechas:true, icon:I('clase-c13'), opts:[
    { k:'A', n:'Presión Constante', d:'Cada disparo al mismo enemigo te da +4 % de daño contra él (hasta +20 %); se pierde al cambiar de blanco', role:'UNI', impl:'power a_presion · NUEVO (condAdd con contador por objetivo)' },
    { k:'B', n:'Barrido de Caza', d:'Cada enemigo distinto que golpeas en 2 s te da +3 % de velocidad de ataque (hasta +15 %)', role:'AREA', impl:'power a_barrido · NUEVO (onHit + addBuff)' } ],
    win:'A, contra jefes: +20 % casi siempre. B, contra grupos: +15 % de velocidad de ataque con 5 enemigos a tiro' },
  { id:'c17', n:'Agilidad o Huida', t:'c', tag:'mec', r:4, c:5, max:1, req:['c13','c14'], icon:S('agilidad'), opts:[
    { k:'A', n:'Agilidad', d:'Habilidad (ranura 2): 6 s con +30 % de velocidad, +15 % de ataque e inmune a ralentizaciones. Se recarga en 16 s', role:'AGU', act:'agilidad', impl:'activa agilidad · existe (buff genérico con slowImmune)' },
    { k:'B', n:'Huida Desesperada', d:'Al bajar del 30 % de vida: +40 % de velocidad y un 20 % menos de daño 4 s. Una vez cada 60 s', role:'AGU', impl:'power a_huida · NUEVO (onDamaged)' } ],
    win:'A, para escapar o perseguir a voluntad (ocupa la ranura 2). B, contra el daño constante de un grupo, sin ocupar ranura' },
  { id:'c18', n:'Humo Denso', t:'p', tag:'num', r:5, c:0, max:2, req:['c15'], d:r=>`La Bomba de Humo dura ${8+r} s (antes 8 s)`, touch:['a_humo'], icon:S('a_humo'), impl:'mod a_humo durS · existe' },
  { id:'c19', n:'Tiro desde la Niebla', t:'p', tag:'mec', r:5, c:2, max:1, req:['c15','c16'], d:()=>'Dentro de tu Bomba de Humo, cada Disparo Rápido te da 3 de Energía y alarga el humo 0,3 s (hasta +2 s)', touch:['a_humo','a_disparo'], hyb:'Defensa + Básica', icon:I('tiradora-s7'), impl:'power a_tiro_niebla · NUEVO (onHit + campo zona)' },
  { id:'c20', n:'Lluvia en Retirada', t:'p', tag:'mec', r:5, c:4, max:1, req:['c16','c17'], d:()=>'Paso Veloz deja caer una Lluvia de Flechas gratis al 30 % donde empezaste a rodar', touch:['a_paso','lluvia_flechas'], hyb:'Movilidad + Principal', icon:S('lluvia_flechas'), impl:'power a_lluvia_retirada · NUEVO (afterCast + eco de lluvia_flechas ×0,3)' },
  { id:'c21', n:'Piernas de Corredora', t:'p', tag:'num', r:5, c:6, max:1, req:['c17'], d:()=>'Te mueves un 10 % más rápido', icon:I('tiradora-s2'), impl:'stats.spdPct · existe' },
  { id:'c22', n:'Bengala o Economía', t:'c', tag:'mec', r:6, c:1, max:1, req:['c18','c19'], icon:I('clase-c14'), opts:[
    { k:'A', n:'Flecha Bengala', d:'Habilidad (ranura 2): bengala de 10 m 10 s; dentro reciben +15 % de daño y pegan un 15 % menos. 20 s', role:'AREA', act:'a_t_bengala', impl:'activa a_t_bengala · existe (applyWeakness 15 + weakenOutgoing 15)' },
    { k:'B', n:'Economía Letal', d:'Las habilidades que cuestan más de 20 de Energía cuestan un 20 % menos', role:'UNI', impl:'tv.costRedBig {pct:20, over:20} · existe' } ],
    win:'A, en grupo: todos pegan +15 % dentro y recibes menos (ocupa la ranura 2). B, para hacer daño en solitario (+5–7 %)' },
  { id:'c23', n:'Recarga en Marcha', t:'p', tag:'mec', r:6, c:3, max:2, req:['c19','c20'], d:r=>`Cada habilidad principal que lanzas recarga ${n1(0.3*r)} s de Paso Veloz y de la Bomba de Humo`, touch:['a_paso','a_humo'], icon:I('tiradora-s1'), impl:'power a_recarga_marcha · NUEVO (afterCast de cat spender)' },
  { id:'c24', n:'Cadencia', t:'p', tag:'num', r:6, c:5, max:2, req:['c20','c21'], d:r=>`Disparas un ${7*r} % más rápido`, icon:I('clase-c8'), impl:'stats.aspdPct · existe' },
  // penúltimos (fila 7): potentes por sí solos
  { id:'c25', n:'Emboscada', t:'p', tag:'mec', r:7, c:0, max:3, req:['c22'], d:r=>`Al salir de tu Bomba de Humo o al acabarse, tus ${r+1} siguientes disparos son críticos seguros`, touch:['a_humo'], icon:I('francotiradora-s15'), impl:'power a_emboscada · NUEVO (onTick: dentro→fuera; onCast forceCrit)' },
  { id:'c26', n:'Compás', t:'p', tag:'mec', r:7, c:3, max:3, req:['c23'], d:r=>`Alternar básica y principal te da un Compás (hasta 5): +${2*r} % de daño cada uno. Se pierden a los 3 s`, icon:I('francotiradora-s2'), impl:'power a_compas · NUEVO (⑦ onCast: alterna basic/spender; stacks)' },
  { id:'c27', n:'Tras la Rodada', t:'p', tag:'mec', r:7, c:6, max:3, req:['c24'], d:r=>`Tras Paso Veloz, tu siguiente habilidad principal no cuesta Energía y hace +${10*r} %`, touch:['a_paso'], icon:I('tiradora-s8'), impl:'power a_tras_rodada · NUEVO (afterCast + modifyResolve)' },
  // finales (fila 8): el presupuesto alcanza para UNO
  { id:'c28', n:'Manto de Niebla', t:'f', tag:'mec', r:8, c:0, max:3, req:['c25'], d:r=>`Tu Bomba de Humo te sigue; dentro recibes un 25 % menos (antes 50 %) y el grupo recupera un ${n1(0.25*r)} % de vida por segundo`, touch:['a_humo'], icon:I('montaraz-s13'), impl:'power a_manto · NUEVO (campo que sigue al dueño: dr 25; su ceguera no se suma a la de otro humo; g.heal a los aliados dentro)', final:'Defensa' },
  { id:'c29', n:'Danza del Arco', t:'f', tag:'mec', r:8, c:3, max:3, req:['c26'], d:r=>`Con 5 Compases, tu siguiente principal es gratis, crítica y hace +${20*r} %; los Compases vuelven a 0`, icon:I('clase-c15'), impl:'power a_danza_arco · NUEVO (lee a_compas)', final:'Ritmo' },
  { id:'c30', n:'Sombra Gemela', t:'f', tag:'mec', r:8, c:6, max:3, req:['c27'], d:r=>`Paso Veloz deja una sombra tuya 3 s que repite tus habilidades principales al ${15+15*r} %`, touch:['a_paso'], icon:I('tiradora-x2'), impl:'power a_sombra · NUEVO (aliado sin vida que copia las principales como eco ×0,3–0,6)', final:'Movilidad' },
];

// ---------------------------------------------------------------- TIRADORA VELOZ (daño en área · Impulso)
// Arquetipos: A = ABANICO (izquierda: la básica triple y Flecha Múltiple) · B = VAIVÉN (centro: Andanada que se relanza
// y el Vendaval) · C = GALERNA (derecha: Carrera del Viento que se mantiene y el Diluvio que te sigue).
const TIRADORA = [
  { id:'v0', n:'Impulso', t:'k', tag:'mec', r:0, c:3, max:1, free:true, d:()=>'Cada acierto en movimiento te da 3 de Impulso. A 100: Vendaval 6 s, +25 % de velocidad de ataque y +1 flecha a Múltiple', touch:['flecha_multiple'], icon:I('tiradora-s0'), impl:'mecánica impulso · existe (+ pérdida quieta NUEVA) · pasiva Tercera Flecha: power t_tercera · NUEVO (seq del básico)' },
  { id:'v1', n:'Astiles Ligeros', t:'p', tag:'num', r:1, c:1, max:3, req:['v0'], d:r=>`Flecha Múltiple cuesta ${22-2*r} de Energía (antes 22)`, touch:['flecha_multiple'], arch:'abanico', icon:I('tiradora-s7'), impl:'mod flecha_multiple cost · existe' },
  { id:'v2', n:'Vendaval Largo', t:'p', tag:'num', r:1, c:3, max:3, req:['v0'], d:r=>`El Vendaval dura ${6+r} s (antes 6 s)`, arch:'vaiven', icon:I('tiradora-s14'), impl:'tv.galeT · NUEVO (clave; gaugeTuning impulso.galeT + tv)' },
  { id:'v3', n:'Aire Fresco', t:'p', tag:'num', r:1, c:5, max:3, req:['v0'], d:r=>`Carrera del Viento se recarga en ${10-r} s (antes 10 s)`, touch:['a_v_carrera'], arch:'galerna', icon:I('tiradora-s5'), impl:'mod a_v_carrera cdr · claves' },
  { id:'v4', n:'Puntas Templadas', t:'p', tag:'num', r:2, c:0, max:2, req:['v1'], d:r=>`Flecha Múltiple y tu disparo triple hacen +${20*r} % de daño`, touch:['flecha_multiple','a_disparo'], arch:'abanico', icon:I('clase-c9'), impl:'mod flecha_multiple dmg + power t_tercera (rango) · claves' },
  { id:'v5', n:'Remate Triple', t:'p', tag:'mec', r:2, c:2, max:1, req:['v1','v2'], d:()=>'Tras una Andanada, tu siguiente Disparo Rápido sale triple sin esperar al 3.º (una vez cada 4 s)', touch:['a_t_andanada','a_disparo'], arch:'abanico+vaiven', hyb:'Abanico + Vaivén', icon:I('tiradora-s4'), impl:'power t_remate_triple · NUEVO (afterCast pone el contador de seq a 2)' },
  { id:'v6', n:'Soltar y Disparar', t:'p', tag:'mec', r:2, c:4, max:1, req:['v2','v3'], d:()=>'Al soltar o acabar Carrera del Viento disparas una Andanada gratis al 60 %, sin saltar', touch:['a_v_carrera','a_t_andanada'], arch:'vaiven+galerna', hyb:'Vaivén + Galerna', icon:I('tiradora-s16'), impl:'power t_soltar · NUEVO (onRelease del canal + eco de a_t_andanada ×0,6 sin desplazamiento)' },
  { id:'v7', n:'Fondo de Corredora', t:'p', tag:'mec', r:2, c:6, max:2, req:['v3'], d:r=>`Carrera del Viento dura hasta ${4+r} s (antes 4 s) y te hace inmune a las ralentizaciones`, touch:['a_v_carrera'], arch:'galerna', icon:I('tiradora-s2'), impl:'mod a_v_carrera channelT + slowImmune · claves' },
  { id:'v8', n:'Triple: Abierto o Clavado', t:'c', tag:'mec', r:3, c:1, max:1, req:['v4','v5'], touch:['a_disparo'], arch:'abanico', icon:I('tiradora-s3'), opts:[
    { k:'A', n:'Triple Abierto', d:'Tu disparo triple lanza 4 flechas extra (antes 2) en un abanico de 60°', role:'AREA', impl:'power t_tercera · opción (seq.onNth count 5)' },
    { k:'B', n:'Triple Clavado', d:'Tu disparo triple es crítico seguro y hace +20 % de daño', role:'UNI', impl:'power t_triple_clavado · NUEVO (onCast forceCrit en el 3.º)' } ],
    win:'A, contra grupos: el doble de flechas extra cada 3 disparos. B, contra jefes: un crítico seguro cada 3 disparos. Decide qué Abanico juegas' },
  { id:'v9', n:'Andanada: Último Instante o Ida y Vuelta', t:'c', tag:'mec', r:3, c:3, max:1, req:['v5','v6'], touch:['a_t_andanada'], arch:'vaiven', icon:I('tiradora-x1'), opts:[
    { k:'A', n:'Último Instante', d:'Si relanzas Andanada en su último medio segundo, la segunda hace +40 % y te da 20 de Impulso', role:'UNI', impl:'power t_ultimo_instante · NUEVO (lee recast.left del canal)' },
    { k:'B', n:'Ida y Vuelta', d:'Puedes relanzar Andanada dos veces (antes una): atrás, adelante y atrás de nuevo; la tercera al 70 %', role:'AREA', impl:'mod a_t_andanada recast.max +1 · clave NUEVA (tipo genérico recast)' } ],
    win:'A, contra jefes: si aciertas el momento, +20 % de media y el Vendaval antes. B, contra grupos: barres tres sitios por uso. Decide qué Vaivén juegas' },
  { id:'v10', n:'Carrera: Rueda o Blanco Fijo', t:'c', tag:'mec', r:3, c:5, max:1, req:['v6','v7'], touch:['a_v_carrera'], arch:'galerna', icon:I('tiradora-s9'), opts:[
    { k:'A', n:'Rueda de Flechas', d:'Mientras corres con Carrera, cada segundo sueltas un anillo de 8 flechas a tu alrededor (50 % cada una)', role:'AREA', impl:'power t_rueda · NUEVO (tick del canal; ronda 2: 50 %, antes 40 %)' },
    { k:'B', n:'Blanco Fijo', d:'Si Carrera dispara al mismo enemigo, cada flecha seguida hace +10 % (hasta +60 %)', role:'UNI', impl:'power t_blanco_fijo · NUEVO (condAdd por objetivo)' } ],
    win:'A, contra grupos que te persiguen. B, contra jefes: a los 2,4 s de carrera ya pega +60 %. Decide qué Galerna juegas' },
  { id:'v11', n:'Mano Llena', t:'p', tag:'num', r:4, c:0, max:2, req:['v8'], d:r=>`Flecha Múltiple dispara ${5+r} flechas (antes 5)`, touch:['flecha_multiple'], arch:'abanico', icon:I('tiradora-s12'), impl:'mod flecha_multiple proj · existe' },
  { id:'v12', n:'Salto Impulsivo', t:'p', tag:'mec', r:4, c:2, max:2, req:['v8','v9'], d:r=>`Cada salto de Andanada te da ${8*r} de Impulso`, touch:['a_t_andanada'], arch:'vaiven', icon:I('tiradora-s13'), impl:'power t_salto_impulsivo · NUEVO (sustituye a t_andanada_impulsiva)' },
  { id:'v13', n:'Saetas Afiladas', t:'p', tag:'num', r:4, c:4, max:2, req:['v9','v10'], d:r=>`Carrera del Viento y Diluvio de Saetas hacen +${15*r} % de daño`, touch:['a_v_carrera','a_u_diluvio'], arch:'galerna', icon:I('tiradora-s17'), impl:'mod dmg · claves' },
  { id:'v14', n:'Vacío de Aire', t:'p', tag:'mec', r:4, c:6, max:1, req:['v10'], d:()=>'Al soltar o acabar Carrera del Viento, atraes 2 m a los enemigos a 5 m; a los jefes les llena 15 de Quebranto', touch:['a_v_carrera'], arch:'galerna', icon:I('tiradora-s15'), impl:'power t_vacio_aire · NUEVO (onRelease del canal: atraer + addStagger)' },
  { id:'v15', n:'Piel de Brisa o Retirada', t:'c', tag:'mec', r:5, c:1, max:1, req:['v11','v12'], icon:I('tiradora-s8'), opts:[
    { k:'A', n:'Piel de Brisa', d:'Durante el Vendaval recibes un 20 % menos de daño', role:'AGU', impl:'power t_piel_brisa · NUEVO (condDr con gaugeState impulso.galeT)' },
    { k:'B', n:'Retirada Instintiva', d:'Si te golpean cuerpo a cuerpo, saltas 4 m atrás y ganas 15 de Impulso. Una vez cada 8 s', role:'AGU', impl:'power t_retirada · NUEVO (④ onDamaged; lógica de a_t_salto)' } ],
    win:'A, contra grupos: el Vendaval está puesto casi la mitad del tiempo. B, contra élites cuerpo a cuerpo que te alcanzan' },
  { id:'v16', n:'Viento en las Plumas', t:'p', tag:'mec', r:5, c:3, max:2, req:['v12','v13'], d:r=>`Con 50 o más de Impulso: Múltiple y Andanada +${10*r} %, y Carrera dispara un ${15*r} % más rápido`, touch:['flecha_multiple','a_t_andanada','a_v_carrera'], hyb:'Los tres estilos (por el Impulso)', icon:I('tiradora-s1'), impl:'power t_viento_plumas · NUEVO (condAdd con gaugeValue)' },
  { id:'v17', n:'Nube de Paso', t:'p', tag:'mec', r:5, c:5, max:2, req:['v13','v14'], d:r=>`En los 6 primeros segundos de Carrera del Viento, cada segundo recarga ${n1(0.5*r)} s del Diluvio de Saetas`, touch:['a_v_carrera','a_u_diluvio'], arch:'galerna', icon:I('tiradora-s16'), impl:'power t_nube_paso · NUEVO (tick del canal; solo los 6 primeros s de cada Carrera)' },
  { id:'v18', n:'Flechas Perdidas', t:'p', tag:'mec', r:6, c:0, max:2, req:['v15'], d:r=>`Si Flecha Múltiple mata, suelta ${r+1} flechas hacia enemigos cercanos (50 % cada una)`, touch:['flecha_multiple'], arch:'abanico', icon:I('tiradora-s6'), impl:'power t_flechas_perdidas · NUEVO (onKill + fireProjectile)' },
  { id:'v19', n:'Vendaval Encadenado', t:'p', tag:'mec', r:6, c:2, max:2, req:['v15','v16'], d:r=>`Cada relanzamiento de Andanada alarga el Vendaval ${n1(0.5*r)} s (hasta +4 s)`, touch:['a_t_andanada'], arch:'vaiven', icon:I('tiradora-s14'), impl:'power t_vendaval_encadenado · NUEVO (sustituye a t_galechain)' },
  { id:'v20', n:'Pies Ligeros', t:'p', tag:'num', r:6, c:4, max:2, req:['v16','v17'], d:r=>`Te mueves un ${8*r} % más rápido`, icon:I('tiradora-s5'), impl:'stats.spdPct · existe' },
  { id:'v21', n:'Nube Fiel', t:'p', tag:'mec', r:6, c:6, max:1, req:['v17'], d:()=>'En los 6 primeros segundos de Carrera del Viento, el Diluvio de Saetas descarga cada 0,4 s (antes 0,5 s)', touch:['a_v_carrera','a_u_diluvio'], arch:'galerna', icon:S('a_u_diluvio'), impl:'power t_nube_fiel · NUEVO (modifyResolve del intervalo; no cuenta la prórroga de Galerna Infinita)' },
  { id:'v22', n:'Ráfaga Creciente', t:'p', tag:'mec', r:7, c:0, max:3, req:['v18'], d:r=>`Cada Flecha Múltiple a menos de 3 s de otra dispara 1 flecha más (hasta +${r+1})`, touch:['flecha_multiple'], arch:'abanico', icon:I('tiradora-s3'), impl:'power t_rafaga_creciente · NUEVO (modifyResolve proj con contador)' },
  { id:'v23', n:'Golpe de Apertura', t:'p', tag:'mec', r:7, c:3, max:3, req:['v19'], d:r=>`Al empezar el Vendaval, tus ${r+1} siguientes Andanadas o Flechas Múltiples son críticas seguras`, touch:['a_t_andanada','flecha_multiple'], arch:'vaiven', icon:I('tiradora-x1'), impl:'power t_apertura · NUEVO (⑩ onGauge full + onCast forceCrit)' },
  { id:'v24', n:'Ciclones', t:'p', tag:'mec', r:7, c:6, max:3, req:['v21'], d:r=>`Mientras corres con Carrera, cada ${n1(2.5-0.5*r)} s dejas un ciclón 4 s que dispara cada 0,5 s al más cercano (28 %; 3 vivos)`, touch:['a_v_carrera'], arch:'galerna', icon:I('tiradora-x2'), impl:'power t_ciclones · NUEVO (campo t_ciclon que dispara; ronda 2: 28 %, antes 35 %)' },
  { id:'v25', n:'Tormenta de Plumas', t:'f', tag:'mec', r:8, c:0, max:3, req:['v22'], d:r=>`Cada 3.ª Flecha Múltiple sale además en círculo: ${3+3*r} flechas más al 60 % (hasta 3 caen sobre su blanco)`, touch:['flecha_multiple'], arch:'abanico', icon:S('flecha_multiple'), impl:'power t_tormenta_plumas · NUEVO (afterCast cada 3.ª: anillo de proyectiles; ronda 2: hasta 3 buscan al blanco de la Múltiple, con su propio tope de 3)', final:'Abanico' },
  { id:'v26', n:'Vaivén Eterno', t:'f', tag:'mec', r:8, c:3, max:3, req:['v23'], d:r=>`Durante el Vendaval, al cerrar su ventana Andanada vuelve sin recarga y a mitad de coste (${['1 vez', '2 veces', 'sin límite'][r-1]})`, touch:['a_t_andanada'], arch:'vaiven', icon:I('tiradora-x2'), impl:'power t_vaiven · NUEVO (al cerrar la ventana de recast, cds = 0 y coste ×0,5 si galeT > 0; usos por Vendaval 1/2/∞)', final:'Vaivén' },
  { id:'v27', n:'Galerna Infinita', t:'f', tag:'mec', r:8, c:6, max:3, req:['v24'], d:r=>`Carrera del Viento dura ${['2 s más', '4 s más', 'lo que la mantengas'][r-1]}; el tiempo extra gasta 10 de Energía por segundo y sube 3 cada segundo`, touch:['a_v_carrera'], arch:'galerna', icon:I('tiradora-x3'), impl:'power t_galerna · NUEVO (prórroga del canal 2/4/∞ s; coste 10 + 3·t por s: ~6,5 s con 80 de Energía)', final:'Galerna' },
  { id:'v28', n:'Ojo del Huracán', t:'x', tag:'mec', r:9, c:3, max:4, req:['v25','v26','v27'], d:r=>['1) El Vendaval también te da +20 % de velocidad de movimiento.', '2) Matar a un élite te da 50 de Impulso.', '3) El Vendaval salta a 80 de Impulso (antes 100).', '4) Cada Vendaval recarga 4 s del Diluvio de Saetas.'].slice(0, r).join(' '), icon:I('tiradora-x3'), impl:'power t_ojo_huracan (rangos) · NUEVO (sustituye a t_eyestorm)' },
];

// ---------------------------------------------------------------- FRANCOTIRADORA (un objetivo · Concentración)
// Verbo principal: CARGAR Y SOLTAR con ventana dorada, PLANTADA. Arquetipos: A = PERFORACIÓN (izquierda: Disparo Apuntado
// atraviesa la fila y estalla en su línea) · B = PUNTO DÉBIL (centro: marcas de Tiro Rastreador y soltados perfectos contra
// jefes) · C = VIGÍA (derecha: la postura Rodilla en Tierra y Tiro Celestial, daño sostenido sin moverse).
const FRANCO = [
  { id:'f0', n:'Mira Serena', t:'k', tag:'mec', r:0, c:3, max:1, free:true, d:()=>'Quieta, +15 de Concentración por segundo; cada perfecto de Disparo Apuntado o de un haz, +15. A 100: Calma Absoluta 5 s', touch:['a_t_apuntado','a_disparo'], icon:I('francotiradora-s0'), impl:'mecánica concentracion · existe (gainPerSec 15; perfectGain 15/3, Calma Absoluta y Respiro NUEVOS) · pasiva Cuerda Tensa: tipo genérico charge en a_disparo · NUEVO' },
  { id:'f1', n:'Punta de Barrena', t:'p', tag:'num', r:1, c:1, max:3, req:['f0'], d:r=>`Disparo Apuntado hace +${10*r} % de daño y llega ${2*r} m más lejos`, touch:['a_t_apuntado'], arch:'perforacion', icon:I('francotiradora-s3'), impl:'mod a_t_apuntado dmg + range · claves' },
  { id:'f2', n:'Ojo Paciente', t:'p', tag:'num', r:1, c:3, max:3, req:['f0'], d:r=>`Un soltado perfecto de Disparo Apuntado o de un haz hace +${50+5*r} % de daño (antes +50 %)`, touch:['a_t_apuntado','a_u_celeste'], arch:'puntodebil', icon:I('francotiradora-s1'), impl:'tv.perfectMul · NUEVO (clave del tipo charge)' },
  { id:'f3', n:'Cuerda Ligera', t:'p', tag:'num', r:1, c:5, max:3, req:['f0'], d:r=>`Disparo Apuntado y los haces de Tiro Celestial se tensan un ${8*r} % más rápido`, touch:['a_t_apuntado','a_u_celeste'], arch:'vigia', icon:I('francotiradora-s10'), impl:'tv.chargeSpeed · NUEVO (clave del tipo charge)' },
  { id:'f4', n:'Sobrepenetración', t:'p', tag:'mec', r:2, c:0, max:2, req:['f1'], d:r=>`Disparo Apuntado hace +${10*r} % más por cada enemigo que ya atravesó (hasta 4)`, touch:['a_t_apuntado'], arch:'perforacion', icon:I('francotiradora-s14'), impl:'power f_sobrepenetracion · NUEVO (sustituye a f_overpen)' },
  { id:'f5', n:'Línea de Mira', t:'p', tag:'mec', r:2, c:2, max:1, req:['f1','f2'], d:()=>'Un soltado perfecto que atraviesa deja un Punto Débil de 4 s en cada enemigo que toca', touch:['a_t_apuntado','a_f_rastreador'], arch:'perforacion+puntodebil', hyb:'Perforación + Punto Débil', icon:I('francotiradora-s7'), impl:'power f_linea_mira · NUEVO (onHit si cast.perfect: marca f_punto_debil 4 s)' },
  { id:'f6', n:'Pulso Quieto', t:'p', tag:'mec', r:2, c:4, max:1, req:['f2','f3'], d:()=>'En Rodilla en Tierra, la ventana dorada de tus disparos tensados es un 50 % más ancha', touch:['a_f_rodilla','a_t_apuntado'], arch:'puntodebil+vigia', hyb:'Punto Débil + Vigía', icon:I('francotiradora-s2'), impl:'power f_pulso_quieto · NUEVO (modifyResolve charge.perfect ×1,5 con la postura)' },
  { id:'f7', n:'Guardia Larga', t:'p', tag:'num', r:2, c:6, max:2, req:['f3'], d:r=>`Rodilla en Tierra dura ${8+2*r} s (antes 8 s)`, touch:['a_f_rodilla'], arch:'vigia', icon:I('francotiradora-s8'), impl:'mod a_f_rodilla dur · claves' },
  { id:'f8', n:'Saeta: Estela o Doble Impacto', t:'c', tag:'mec', r:3, c:1, max:1, req:['f4','f5'], touch:['a_t_apuntado'], arch:'perforacion', icon:I('francotiradora-s6'), opts:[
    { k:'A', n:'Estela Explosiva', d:'Un soltado perfecto de Disparo Apuntado deja su línea cargada: estalla a los 0,5 s (30 %)', role:'AREA', impl:'power f_estela · NUEVO (campo en línea con retardo)' },
    { k:'B', n:'Doble Impacto', d:'Si Disparo Apuntado no atraviesa a nadie más, rebota en el blanco y lo golpea otra vez al 30 %', role:'UNI', impl:'power f_doble_impacto · NUEVO (un solo impacto → eco ×0,6)' } ],
    win:'A, contra grupos en fila: cada soltado perfecto barre la línea dos veces. B, contra jefes solos: un 30 % más si no hay nadie detrás. Decide qué Perforación juegas' },
  { id:'f9', n:'Marca: Saltarina o Vital', t:'c', tag:'mec', r:3, c:3, max:1, req:['f5','f6'], touch:['a_f_rastreador'], arch:'puntodebil', icon:I('francotiradora-x1'), opts:[
    { k:'A', n:'Marca Saltarina', d:'Si el marcado muere, el Punto Débil salta al enemigo más cercano con el tiempo que le quedaba', role:'AREA', impl:'power f_marca_saltarina · NUEVO (onKill)' },
    { k:'B', n:'Punto Vital', d:'Contra tu Punto Débil, el soltado perfecto hace +35 % más y le llena 15 de Quebranto', role:'UNI', impl:'power f_punto_vital · NUEVO (condAdd + addStagger)' } ],
    win:'A, contra grupos de élites: la marca no se pierde al matar. B, contra jefes: más premio y Quebranto. Decide qué Punto Débil juegas' },
  { id:'f10', n:'Vigía: Salva o Paciencia', t:'c', tag:'mec', r:3, c:5, max:1, req:['f6','f7'], touch:['a_f_rodilla'], arch:'vigia', icon:I('francotiradora-s9'), opts:[
    { k:'A', n:'Salva de Vigía', d:'En Rodilla en Tierra, cada soltado a carga completa dispara 2 saetas más a enemigos cercanos (25 % cada una)', role:'AREA', impl:'power f_salva · NUEVO (afterCast con la postura; ronda 2: 25 %, antes 40 %)' },
    { k:'B', n:'Paciencia de Vigía', d:'En Rodilla en Tierra, cada disparo tensado seguido al mismo enemigo hace +10 % (hasta +50 %)', role:'UNI', impl:'power f_paciencia · NUEVO (sustituye a f_patience)' } ],
    win:'A, contra grupos que se acercan. B, contra jefes: +50 % desde el 5.º disparo seguido. Decide qué Vigía juegas' },
  { id:'f11', n:'Fila Rota', t:'p', tag:'mec', r:4, c:0, max:2, req:['f8'], d:r=>`Cada enemigo que mata Disparo Apuntado te devuelve ${4*r} de Energía y ${5*r} de Concentración`, touch:['a_t_apuntado'], arch:'perforacion', icon:I('francotiradora-s16'), impl:'power f_fila_rota · NUEVO (onKill + gainResource + gainGauge)' },
  { id:'f12', n:'Lectura del Blanco', t:'p', tag:'mec', r:4, c:2, max:2, req:['f8','f9'], d:r=>`Contra tu Punto Débil, la ventana dorada dura un ${25*r} % más`, touch:['a_f_rastreador','a_t_apuntado'], arch:'puntodebil', icon:I('francotiradora-s5'), impl:'power f_lectura · NUEVO (modifyResolve charge.perfect contra el marcado)' },
  { id:'f13', n:'Puntería de Vigía', t:'p', tag:'num', r:4, c:4, max:2, req:['f9','f10'], d:r=>`En Rodilla en Tierra, tus disparos tensados hacen +${15*r} % de daño`, touch:['a_f_rodilla'], arch:'vigia', icon:I('francotiradora-s12'), impl:'power f_punteria_vigia · NUEVO (condAdd con la postura)' },
  { id:'f14', n:'Estrella Fija', t:'p', tag:'mec', r:4, c:6, max:1, req:['f10'], d:()=>'Cada soltado perfecto de Disparo Apuntado recarga 1,5 s de Tiro Celestial', touch:['a_u_celeste','a_t_apuntado'], arch:'vigia', icon:S('a_u_celeste'), impl:'power f_estrella_fija · NUEVO (onCast de a_t_apuntado si cast.perfect; el básico y los haces no cuentan)' },
  { id:'f15', n:'Quietud o Nervios', t:'c', tag:'mec', r:5, c:1, max:1, req:['f11','f12'], icon:I('francotiradora-s13'), opts:[
    { k:'A', n:'Quietud', d:'Quieta más de 1 s, recibes un 15 % menos de daño', role:'AGU', impl:'tv.drStill · NUEVO (clave, espejo de drMoving)' },
    { k:'B', n:'Nervios de Acero', d:'Si te golpean mientras tensas, ganas un escudo del 8 % de tu vida. Una vez cada 6 s', role:'AGU', impl:'power f_nervios · NUEVO (④ onDamaged + g.shield)' } ],
    win:'A, contra grupos que disparan de lejos, si sabes quedarte quieta. B, contra élites cuerpo a cuerpo que te golpean mientras tensas' },
  { id:'f16', n:'Serenidad', t:'p', tag:'mec', r:5, c:3, max:2, req:['f12','f13'], d:r=>`Con 50 o más de Concentración, Disparo Apuntado y los haces se tensan un ${10*r} % más rápido y hacen +${10*r} %`, touch:['a_t_apuntado','a_u_celeste'], hyb:'Los tres estilos (por la Concentración)', icon:I('francotiradora-s11'), impl:'power f_serenidad · NUEVO (condAdd con gaugeValue)' },
  { id:'f17', n:'Haces Gemelos', t:'p', tag:'mec', r:5, c:5, max:2, req:['f13','f14'], d:r=>`Cada haz de Tiro Celestial dispara otro detrás, al ${15*r} %`, touch:['a_u_celeste'], arch:'vigia', icon:I('francotiradora-s17'), impl:'power f_haces_gemelos · NUEVO (eco del haz; un eco no repite)' },
  { id:'f18', n:'Rebote Certero', t:'p', tag:'mec', r:6, c:0, max:2, req:['f15'], d:r=>`Disparo Apuntado rebota en el primer muro y vuelve por su línea al ${10*r} %`, touch:['a_t_apuntado'], arch:'perforacion', icon:I('francotiradora-s4'), impl:'power f_rebote · NUEVO (proyectil que vuelve; el eco no rebota)' },
  { id:'f19', n:'Herida Expuesta', t:'p', tag:'mec', r:6, c:2, max:2, req:['f15','f16'], d:r=>`Mientras tiene tu Punto Débil, el enemigo recibe +${6*r} % de daño de todo el grupo`, touch:['a_f_rastreador'], arch:'puntodebil', icon:I('francotiradora-x2'), impl:'power f_herida_expuesta · NUEVO (applyWeakness mientras dura la marca)' },
  { id:'f20', n:'Vista Larga', t:'p', tag:'num', r:6, c:4, max:2, req:['f16','f17'], d:r=>`Tus disparos tensados alcanzan ${2*r} m más y hacen +${6*r} % a más de 10 m`, touch:['a_t_apuntado','a_disparo','a_u_celeste'], icon:I('francotiradora-s15'), impl:'mod range + condAdd por distancia · claves' },
  { id:'f21', n:'Firmamento', t:'p', tag:'mec', r:6, c:6, max:1, req:['f17'], d:()=>'En Rodilla en Tierra, Tiro Celestial se recarga un 40 % más rápido', touch:['a_u_celeste','a_f_rodilla'], arch:'vigia', icon:S('a_u_celeste'), impl:'power f_firmamento · NUEVO (cdRate ×1,4 con la postura; ronda 2, antes ×1,5)' },
  { id:'f22', n:'Saetas Paralelas', t:'p', tag:'mec', r:7, c:0, max:3, req:['f18'], d:r=>`Cada soltado perfecto de Disparo Apuntado suelta ${r} saeta${r > 1 ? 's' : ''} más en paralelo, a 1 m (20 %)`, touch:['a_t_apuntado'], arch:'perforacion', icon:S('flecha_perforante'), impl:'power f_paralelas · NUEVO (afterCast si cast.perfect)' },
  { id:'f23', n:'Herida sobre Herida', t:'p', tag:'mec', r:7, c:3, max:3, req:['f19'], d:r=>`Cada soltado perfecto a tu Punto Débil le deja una Herida (hasta 5): tus tensados le hacen +${2*r} % por cada una`, touch:['a_f_rastreador','a_t_apuntado'], arch:'puntodebil', icon:I('francotiradora-s6'), impl:'power f_heridas · NUEVO (stacks por objetivo; condAdd)' },
  { id:'f24', n:'Ojo Entrenado', t:'p', tag:'mec', r:7, c:6, max:3, req:['f21'], d:r=>`Cada ${7-r} s en Rodilla en Tierra, tu siguiente Disparo Apuntado sale al instante y a carga completa`, touch:['a_f_rodilla','a_t_apuntado'], arch:'vigia', icon:I('francotiradora-s0'), impl:'power f_ojo_entrenado · NUEVO (onTick con la postura; charge.instant)' },
  { id:'f25', n:'Línea Mortal', t:'f', tag:'mec', r:8, c:0, max:3, req:['f22'], d:r=>`A carga completa, Disparo Apuntado (o su saeta central) es un haz de 30 m que estalla en toda su línea (${5+5*r} %)`, touch:['a_t_apuntado'], arch:'perforacion', icon:S('a_p_punteria'), impl:'power f_linea_mortal · NUEVO (charge.full → haz + estallido en línea)', final:'Perforación' },
  { id:'f26', n:'Disparo Imposible', t:'f', tag:'mec', r:8, c:3, max:3, req:['f23'], d:r=>`Un soltado perfecto de Disparo Apuntado a tu Punto Débil sale dos veces: la 2.ª al ${5+10*r} %, crítica y con 20 de Quebranto`, touch:['a_f_rastreador','a_t_apuntado'], arch:'puntodebil', icon:I('francotiradora-x3'), impl:'power f_disparo_imposible · NUEVO (sustituye a f_impossible; como mucho un doble por segundo; la 2.ª no da Herida ni Concentración)', final:'Punto Débil' },
  { id:'f27', n:'Atalaya Eterna', t:'f', tag:'mec', r:8, c:6, max:3, req:['f24'], d:r=>`Rodilla en Tierra dura ${['20 s', '30 s', 'hasta que te levantes'][r-1]}; cada 5 s en ella, un haz celeste gratis sobre tu blanco (160 %)`, touch:['a_f_rodilla','a_u_celeste'], arch:'vigia', icon:I('francotiradora-s9'), impl:'power f_atalaya · NUEVO (postura de 20/30/∞ s + eco de un haz de a_u_celeste ×0,4 que cae sobre el blanco y no atraviesa)', final:'Vigía' },
  { id:'f28', n:'Ojo Inmóvil', t:'x', tag:'mec', r:9, c:3, max:4, req:['f25','f26','f27'], d:r=>['1) La Calma Absoluta dura 8 s (antes 5 s).', '2) Matar a un élite te da 50 de Concentración.', '3) La Calma Absoluta salta a 80 de Concentración (antes 100).', '4) Cada Calma Absoluta recarga 5 s de Tiro Celestial.'].slice(0, r).join(' '), icon:I('francotiradora-x2'), impl:'power f_ojo_inmovil (rangos) · NUEVO (sustituye a f_weakspot)' },
];

// ---------------------------------------------------------------- MONTARAZ (control · Coto de Caza)
// Verbo principal: COLOCAR Y DETONAR trampas y zonas. Arquetipos: A = CAMPO MINADO (izquierda: muchos cepos que estallan
// en cadena, contra grupos) · B = PRESA (centro: la Presa, sus trampas y el Quebranto, contra jefes) · C = ZARZAL (derecha:
// zarzales fijos y Cerco de Zarzas, control constante).
const MONTARAZ = [
  { id:'m0', n:'Coto de Caza', t:'k', tag:'mec', r:0, c:3, max:1, free:true, d:()=>'Cada trampa armada suma 1 al Coto (hasta 3). Si estallan 3 a la vez, Batida: +15 % de daño recibido 6 s (cada 12 s)', touch:['a_t_cepo','a_m_detonante'], icon:I('montaraz-s14'), impl:'mecánica coto · existe (+ Batida NUEVA) · pasiva Cebo de Caza: power m_cebo · NUEVO (sustituye al +25 % de Quebranto)' },
  { id:'m1', n:'Muelles Ligeros', t:'p', tag:'num', r:1, c:1, max:3, req:['m0'], d:r=>`Trampa de Cepo recupera una carga en ${8-r} s (antes 8 s)`, touch:['a_t_cepo'], arch:'campo', icon:I('montaraz-s12'), impl:'mod a_t_cepo cdr · existe' },
  { id:'m2', n:'Olfato de Presa', t:'p', tag:'num', r:1, c:3, max:3, req:['m0'], d:r=>`Haces +${4*r} % de daño a tu Presa`, arch:'presa', icon:I('montaraz-s15'), impl:'tv.preyDmg · existe' },
  { id:'m3', n:'Raíz Rápida', t:'p', tag:'num', r:1, c:5, max:3, req:['m0'], d:r=>`Cerco de Zarzas se recarga en ${45-3*r} s (antes 45 s)`, touch:['a_u_zarzas'], arch:'zarzal', icon:I('montaraz-s16'), impl:'mod a_u_zarzas cdr · claves' },
  { id:'m4', n:'Pólvora Negra', t:'p', tag:'num', r:2, c:0, max:2, req:['m1'], d:r=>`Tus trampas y Flecha Detonante hacen +${15*r} % de daño`, touch:['a_t_cepo','a_m_detonante'], arch:'campo', icon:I('montaraz-s5'), impl:'mod dmg · claves' },
  { id:'m5', n:'Presa Atrapada', t:'p', tag:'mec', r:2, c:2, max:1, req:['m1','m2'], d:()=>'Una trampa que atrapa a tu Presa estalla (60 %) y te devuelve una carga de Trampa de Cepo (una vez cada 10 s)', touch:['a_t_cepo'], arch:'campo+presa', hyb:'Campo Minado + Presa', icon:I('montaraz-s4'), impl:'power m_presa_atrapada · NUEVO (icd 10 s para el estallido y la carga; las trampas que salta Gran Cacería no la activan)' },
  { id:'m6', n:'Cerco a la Presa', t:'p', tag:'mec', r:2, c:4, max:1, req:['m2','m3'], d:()=>'Flecha Detonante sobre tu Presa le deja debajo un zarzal de 2 m 4 s que la ralentiza un 40 %', touch:['a_m_detonante'], arch:'presa+zarzal', hyb:'Presa + Zarzal', icon:I('montaraz-x1'), impl:'power m_cerco_presa · NUEVO (campo m_zarzal)' },
  { id:'m7', n:'Raíces Profundas', t:'p', tag:'num', r:2, c:6, max:2, req:['m3'], d:r=>`Cruzar el Cerco de Zarzas inmoviliza ${n1(1.5+0.5*r)} s (antes 1,5 s)`, touch:['a_u_zarzas'], arch:'zarzal', icon:S('a_u_zarzas'), impl:'mod a_u_zarzas crossRoot · claves' },
  { id:'m8', n:'Cepo: Racimo o Reforzado', t:'c', tag:'mec', r:3, c:1, max:1, req:['m4','m5'], touch:['a_t_cepo'], arch:'campo', icon:I('montaraz-s6'), opts:[
    { k:'A', n:'Racimo de Cepos', d:'Trampa de Cepo coloca 3 cepos en triángulo (35 % cada uno); en el Coto cuentan como una trampa', role:'AREA', impl:'power m_racimo · NUEVO (afterCast: 2 cepos más ×0,35; coto cuenta 1)' },
    { k:'B', n:'Cepo Reforzado', d:'Si atrapa a un élite o a un jefe, el cepo estalla 3 veces (20 % cada una)', role:'UNI', impl:'power m_cepo_reforzado · NUEVO (rejuicio: 3 × 20 %, antes 3 × 30 %)' } ],
    win:'A, contra grupos: tres cepos por carga para cubrir el suelo. B, contra jefes: cada cepo pega tres veces. Decide qué Campo Minado juegas' },
  { id:'m9', n:'Presa: Manada o Herida', t:'c', tag:'mec', r:3, c:3, max:1, req:['m5','m6'], arch:'presa', icon:I('montaraz-s0'), opts:[
    { k:'A', n:'Presas en Manada', d:'Tienes hasta 3 Presas: tu primer élite y los 2 primeros enemigos que pisen una trampa', role:'AREA', impl:'power m_manada · NUEVO (coto.preyMax 3)' },
    { k:'B', n:'Presa Herida', d:'Tu Presa recibe +10 % de daño de todo el grupo y cada trampa que pisa le llena 25 de Quebranto', role:'UNI', impl:'power m_presa_herida · NUEVO (applyWeakness 10 + addStagger)' } ],
    win:'A, contra grupos con varios élites. B, contra jefes: +10 % para todo el grupo y Quebranto. Decide qué Presa juegas' },
  { id:'m10', n:'Zarzal: Creciente o Asfixiante', t:'c', tag:'mec', r:3, c:5, max:1, req:['m6','m7'], touch:['a_u_zarzas'], arch:'zarzal', icon:I('montaraz-x2'), opts:[
    { k:'A', n:'Zarzal Creciente', d:'Cerco de Zarzas crece 1 m por segundo (hasta 12 m) y atrapa a los que alcanza', role:'AREA', impl:'power m_creciente · NUEVO (radio por tic)' },
    { k:'B', n:'Zarzal Asfixiante', d:'Dentro del Cerco, el veneno al enemigo con más vida sube un 15 % cada segundo (hasta +90 %)', role:'UNI', impl:'power m_asfixiante · NUEVO (stacks por objetivo)' } ],
    win:'A, contra grupos que llegan desde lejos. B, contra jefes que se quedan dentro. Decide qué Zarzal juegas' },
  { id:'m11', n:'Metralla', t:'p', tag:'mec', r:4, c:0, max:2, req:['m8'], d:r=>`Cada cepo de Trampa de Cepo que estalla suelta ${2*r} púas a enemigos cercanos (20 % cada una)`, touch:['a_t_cepo'], arch:'campo', icon:I('montaraz-s17'), impl:'power m_metralla · NUEVO (fireProjectile ×N; ni los cepos sembrados ni los pequeños sueltan)' },
  { id:'m12', n:'Acoso', t:'p', tag:'mec', r:4, c:2, max:2, req:['m8','m9'], d:r=>`Cada trampa que pisa tu Presa le llena ${15*r} de Quebranto (si es un élite, la ralentiza un 30 % 3 s)`, touch:['a_t_cepo'], arch:'presa', icon:I('montaraz-s10'), impl:'power m_acoso · NUEVO (addStagger; applyCC slow a élites; ya no da Debilidad)' },
  { id:'m13', n:'Espino Venenoso', t:'p', tag:'num', r:4, c:4, max:2, req:['m9','m10'], d:r=>`El veneno de tus zarzas y de tus cepos hace +${15*r} %`, touch:['a_u_zarzas','a_t_cepo'], arch:'zarzal', icon:I('montaraz-s7'), impl:'tv.poisonPct · existe' },
  { id:'m14', n:'Semillas de Zarza', t:'p', tag:'mec', r:4, c:6, max:1, req:['m10'], d:()=>'Flecha Detonante deja un zarzal de 2 m durante 4 s donde estalla: ralentiza un 40 %', touch:['a_m_detonante'], arch:'zarzal', icon:I('montaraz-s3'), impl:'power m_semillas · NUEVO (campo m_zarzal)' },
  { id:'m15', n:'Huida o Guarida', t:'c', tag:'mec', r:5, c:1, max:1, req:['m11','m12'], icon:I('montaraz-s13'), opts:[
    { k:'A', n:'Cepo de Huida', d:'Al bajar del 50 % de vida, sueltas a tus pies un cepo gratis que inmoviliza 3 s a todos a 4 m. Una vez cada 30 s', role:'AGU', impl:'power m_cepo_huida · NUEVO (④ onDamaged)' },
    { k:'B', n:'Guarida', d:'A 4 m de tus trampas armadas, recibes un 15 % menos de daño', role:'AGU', impl:'power m_guarida · NUEVO (condDr)' } ],
    win:'A, contra grupos cuerpo a cuerpo que te alcanzan. B, para pelear junto a tus trampas sin moverte' },
  { id:'m16', n:'Coto Cerrado', t:'p', tag:'mec', r:5, c:3, max:2, req:['m12','m13'], d:r=>`Con 2 o más trampas armadas, haces +${6*r} % de daño y tus zarzales duran ${r} s más`, touch:['a_t_cepo'], hyb:'Los tres estilos (por el Coto)', icon:I('montaraz-s8'), impl:'power m_coto_cerrado · NUEVO (condAdd con gaugeValue)' },
  { id:'m17', n:'Zarzas Trepadoras', t:'p', tag:'mec', r:5, c:5, max:2, req:['m13','m14'], d:r=>`Cada enemigo que inmoviliza el Cerco de Zarzas lo alarga ${n1(0.5*r)} s (hasta +4 s)`, touch:['a_u_zarzas'], arch:'zarzal', icon:I('montaraz-s11'), impl:'power m_trepadoras · NUEVO' },
  { id:'m18', n:'Rearme Rápido', t:'p', tag:'mec', r:6, c:0, max:2, req:['m15'], d:r=>`Cada detonación que hace estallar un cepo tuyo recarga ${r} s del Cepo y del Salto de Acecho (este no baja de 5 s)`, touch:['a_t_cepo','a_m_acecho'], arch:'campo', icon:I('montaraz-s12'), impl:'power m_rearme · NUEVO (por detonación, no por trampa; los cepos pequeños y sembrados no cuentan; Salto ≥ 5 s)' },
  { id:'m19', n:'Rastro Fresco', t:'p', tag:'mec', r:6, c:2, max:2, req:['m15','m16'], d:r=>`Al morir tu Presa, el enemigo más fuerte a 10 m pasa a ser tu Presa y ganas ${10*r} de Energía`, arch:'presa', icon:I('montaraz-s9'), impl:'power m_rastro · NUEVO (onKill)' },
  { id:'m20', n:'Ojo de Trampera', t:'p', tag:'num', r:6, c:4, max:2, req:['m16','m17'], d:r=>`Tus trampas y zarzales duran un ${25*r} % más`, touch:['a_t_cepo','a_u_zarzas'], icon:I('montaraz-s1'), impl:'tv.fieldDur · claves' },
  { id:'m21', n:'Rebrote', t:'p', tag:'mec', r:6, c:6, max:1, req:['m17'], d:()=>'Al acabarse, el Cerco de Zarzas deja 3 zarzales de 2 m durante 6 s que ralentizan un 40 %', touch:['a_u_zarzas'], arch:'zarzal', icon:I('montaraz-s16'), impl:'power m_rebrote · NUEVO (campo m_zarzal ×3)' },
  { id:'m22', n:'Campo Sembrado', t:'p', tag:'mec', r:7, c:0, max:3, req:['m18'], d:r=>`Flecha Detonante deja ${r} cepo${r > 1 ? 's' : ''} armado${r > 1 ? 's' : ''} donde cae (al 35 %; no gasta cargas)`, touch:['a_m_detonante','a_t_cepo'], arch:'campo', icon:I('montaraz-s4'), impl:'power m_campo_sembrado · NUEVO (afterCast)' },
  { id:'m23', n:'Batida Mayor', t:'p', tag:'mec', r:7, c:3, max:3, req:['m19'], d:r=>`La Batida dura ${6+r} s (antes 6 s) y a tu Presa le llena ${10*r} de Quebranto`, arch:'presa', icon:I('montaraz-x3'), impl:'tv.batidaDur + tv.batidaPreyStagger · NUEVO (claves de la mecánica coto; ya no sube la Debilidad)' },
  { id:'m24', n:'Siembra de Espinas', t:'p', tag:'mec', r:7, c:6, max:3, req:['m21'], d:r=>`Cada cepo que atrapa o estalla deja un zarzal de 2 m durante ${2+2*r} s que ralentiza un 40 %`, touch:['a_t_cepo'], arch:'zarzal', icon:I('montaraz-s17'), impl:'power m_siembra · NUEVO (campo m_zarzal)' },
  { id:'m25', n:'Tierra Arrasada', t:'f', tag:'mec', r:8, c:0, max:3, req:['m22'], d:r=>`Cada cepo de Trampa de Cepo que estalla siembra ${r} cepo${r > 1 ? 's' : ''} pequeño${r > 1 ? 's' : ''} a 3 m (30 %; esos no siembran; hasta 6)`, touch:['a_t_cepo'], arch:'campo', icon:I('montaraz-x1'), impl:'power m_tierra_arrasada · NUEVO (solo siembran los cepos de carga; 6 pequeños vivos como mucho)', final:'Campo Minado' },
  { id:'m26', n:'Gran Cacería', t:'f', tag:'mec', r:8, c:3, max:3, req:['m23'], d:r=>`Si tu Presa pisa una trampa, todas tus trampas saltan a su alrededor y se rearman a mitad de daño (una vez cada ${[12, 9, 6][r-1]} s)`, touch:['a_t_cepo'], arch:'presa', icon:I('montaraz-x3'), impl:'power m_gran_caceria · NUEVO (sustituye a m_greathunt; rejuicio: las trampas que saltan hacen el 50 % y cuentan para el tope de 2 estallidos; ronda 2: no activan Presa Atrapada, m5)', final:'Presa' },
  { id:'m27', n:'Bosque Vivo', t:'f', tag:'mec', r:8, c:6, max:3, req:['m24'], d:r=>`Si 3 zarzales tuyos se tocan, forman un Cerco de Zarzas gratis de ${r+1} s, sin veneno ni estallido (una vez cada 8 s)`, touch:['a_u_zarzas'], arch:'zarzal', icon:I('montaraz-x2'), impl:'power m_bosque_vivo · NUEVO (eco de a_u_zarzas de 2/3/4 s; uno vivo; ronda 2: solo controla, coef 0 y sin el estallido al cerrarse)', final:'Zarzal' },
  { id:'m28', n:'Corazón del Bosque', t:'x', tag:'mec', r:9, c:3, max:4, req:['m25','m26','m27'], d:r=>['1) Tus trampas armadas ralentizan un 30 % a 3 m.', '2) Matar a un élite coloca un cepo gratis donde cae.', '3) La Batida salta con 2 trampas (antes 3).', '4) Cada 12 trampas que estallan, Cerco de Zarzas se lanza solo y gratis.'].slice(0, r).join(' '), icon:I('montaraz-s0'), impl:'power m_corazon_bosque (rangos) · NUEVO (sustituye a m_thornweb)' },
];

// ---------------------------------------------------------------- PARAGON = árboles héroe (temas de la CLASE, no de una especialización)
// 13 nodos y 10 puntos (Nv71–80): nunca se completa. Cada árbol lo comparten dos especializaciones.
// h1 ERRANTE DEL VIENTO (Tiradora + Francotiradora) · h2 CARCAJ ENCANTADO (Tiradora + Montaraz) · h3 HALCONERA (Francotiradora + Montaraz)
const HERO = [
  { id:'h1', n:'Errante del Viento', specs:['tiradora','francotiradora'], art:'ui256/menu_viajes.webp',
    line:'El viento viaja contigo: guardas Ráfagas que salen con tus flechas', key:'Cada 4 s ganas una Ráfaga (hasta 3); tu siguiente principal o insignia suelta 1 flecha de viento por Ráfaga', nodes:[
    { id:'q0', n:'Ráfagas', t:'k', tag:'mec', r:0, c:1, max:1, free:true, d:()=>'Cada 4 s ganas una Ráfaga (hasta 3). Tu siguiente principal o insignia suelta 1 flecha de viento por Ráfaga (60 %)', icon:I('tiradora-s14'), impl:'power q_rafagas · NUEVO (contador por tiempo; afterCast de spender/spec)' },
    { id:'q1', n:'Brisa Constante', t:'p', tag:'num', r:1, c:0, max:1, req:['q0'], d:()=>'Ganas una Ráfaga cada 3 s (antes 4 s)', icon:I('tiradora-s5') },
    { id:'q2', n:'Favor o Calma', t:'c', tag:'mec', r:1, c:1, max:1, req:['q0'], icon:I('tiradora-s2'), opts:[
      { k:'A', n:'Viento a Favor', d:'Cada 15 m que recorres (rodando o saltando también) te dan una Ráfaga más', role:'AREA' },
      { k:'B', n:'Aire Quieto', d:'Quieta, ganas una Ráfaga cada 2 s (antes 4 s)', role:'UNI' } ],
      win:'A, si juegas en movimiento, contra grupos. B, si juegas plantada, contra jefes' },
    { id:'q3', n:'Plumas de Aire', t:'p', tag:'mec', r:1, c:2, max:1, req:['q0'], d:()=>'Las flechas de viento atraviesan a 2 enemigos', icon:I('tiradora-s6') },
    { id:'q4', n:'Torbellino o Corriente', t:'c', tag:'mec', r:2, c:0, max:1, req:['q1','q2'], icon:I('tiradora-s15'), opts:[
      { k:'A', n:'Torbellino', d:'Habilidad (ranura 2): un torbellino de 4 m levanta 1,5 s a los enemigos y te da 3 Ráfagas. Se recarga en 40 s', role:'CTRL', act:'a_h_torbellino' },
      { k:'B', n:'Corriente Protectora', d:'Con 3 Ráfagas guardadas, recibes un 15 % menos de daño', role:'AGU' } ],
      win:'A, para controlar grupos y tener Ráfagas a voluntad (ocupa la ranura 2). B, para sobrevivir sin ocupar ranura' },
    { id:'q5', n:'Aire Afilado', t:'p', tag:'num', r:2, c:1, max:1, req:['q2'], d:()=>'Las flechas de viento hacen +30 % de daño', icon:I('tiradora-s17') },
    { id:'q6', n:'Empuje del Aire', t:'p', tag:'mec', r:2, c:2, max:1, req:['q2','q3'], d:()=>'Gastar 3 Ráfagas a la vez te da 15 de tu mecánica (Impulso o Concentración)', icon:I('tiradora-s1') },
    { id:'q7', n:'Rachas', t:'p', tag:'mec', r:3, c:0, max:1, req:['q4','q5'], d:()=>'Gastar 3 Ráfagas a la vez recarga 2 s de tu insignia', icon:I('tiradora-s13') },
    { id:'q8', n:'Certero o Abierto', t:'c', tag:'mec', r:3, c:1, max:1, req:['q5'], icon:I('tiradora-s3'), opts:[
      { k:'A', n:'Ojo de la Racha', d:'Las flechas de viento buscan al enemigo con más vida y hacen +25 % a élites y jefes', role:'UNI' },
      { k:'B', n:'Abanico de Aire', d:'Las flechas de viento salen en abanico y atraviesan a 3 enemigos', role:'AREA' } ],
      win:'A, contra jefes. B, contra grupos' },
    { id:'q9', n:'Aire Pesado', t:'p', tag:'mec', r:3, c:2, max:1, req:['q5','q6'], d:()=>'Las flechas de viento ralentizan un 30 % durante 2 s', icon:I('clase-c3') },
    { id:'q10', n:'Tormenta Guardada', t:'p', tag:'num', r:4, c:0.5, max:1, req:['q7','q8'], d:()=>'Puedes guardar hasta 5 Ráfagas (antes 3)', icon:I('tiradora-x3') },
    { id:'q11', n:'Silbido', t:'p', tag:'mec', r:4, c:1.5, max:1, req:['q8','q9'], d:()=>'Si una flecha de viento hace crítico, te devuelve una Ráfaga (una vez por lanzamiento)', icon:I('clase-c10') },
    { id:'q12', n:'Rosa de los Vientos', t:'f', tag:'mec', r:5, c:1, max:1, req:['q10','q11'], d:()=>'Cada 25 s, el viento ruge 6 s: ganas una Ráfaga por segundo y las flechas de viento hacen +50 %', icon:I('tiradora-s0') },
  ] },
  { id:'h2', n:'Carcaj Encantado', specs:['tiradora','montaraz'], art:'ui256/menu_coleccion.webp',
    line:'Tu carcaj encanta las puntas: fuego, hielo y rayo, por turnos', key:'Cada 6 s tu siguiente flecha lleva una punta encantada que rota: el Fuego quema, el Hielo frena y el Rayo salta', nodes:[
    { id:'w0', n:'Puntas Encantadas', t:'k', tag:'mec', r:0, c:1, max:1, free:true, d:()=>'Cada 6 s tu siguiente flecha lleva una punta que rota: Fuego (quema 200 %), Hielo (frena 40 %) o Rayo (80 %, salta a 3)', icon:I('clase-c9'), impl:'power w_puntas · NUEVO (onCast cada 6 s; rota fire/frost/lightning; una punta por enemigo cada 1 s; la quemadura se renueva)' },
    { id:'w1', n:'Encantamiento Rápido', t:'p', tag:'num', r:1, c:0, max:1, req:['w0'], d:()=>'Una punta encantada cada 4 s (antes 6 s)', icon:I('clase-c8') },
    { id:'w2', n:'Punta: Mayor o Repartida', t:'c', tag:'mec', r:1, c:1, max:1, req:['w0'], icon:I('clase-c1'), opts:[
      { k:'A', n:'Punta Mayor', d:'La punta encantada hace +40 % y su efecto dura el doble', role:'UNI' },
      { k:'B', n:'Punta Repartida', d:'Todas las flechas de ese disparo llevan la punta (al 30 %; una por enemigo)', role:'AREA' } ],
      win:'A, contra jefes. B, contra grupos: en un disparo de varias flechas, todas la llevan' },
    { id:'w3', n:'Trampa Encantada', t:'p', tag:'mec', r:1, c:2, max:1, req:['w0'], d:()=>'Tus trampas, zonas y lluvias también toman la punta encantada al colocarlas', icon:I('montaraz-s4') },
    { id:'w4', n:'Desborde o Bálsamo', t:'c', tag:'mec', r:2, c:0, max:1, req:['w1','w2'], icon:I('clase-c9'), opts:[
      { k:'A', n:'Desborde de Puntas', d:'Habilidad (ranura 2): tus 8 siguientes disparos llevan las tres puntas a la vez. Se recarga en 20 s', role:'AREA', act:'a_h_puntas' },
      { k:'B', n:'Punta Curativa', d:'Cada punta encantada que golpea te cura un 2 % de la vida (como mucho una vez cada 6 s)', role:'AGU' } ],
      win:'A, para un estallido de daño a voluntad (ocupa la ranura 2). B, para aguantar sin ocupar ranura' },
    { id:'w5', n:'Fuego Prendido', t:'p', tag:'num', r:2, c:1, max:1, req:['w2'], d:()=>'La punta de Fuego quema un 50 % más', icon:I('clase-c13') },
    { id:'w6', n:'Hielo Hondo', t:'p', tag:'mec', r:2, c:2, max:1, req:['w2','w3'], d:()=>'La punta de Hielo inmoviliza 1 s a los enemigos normales', icon:I('clase-c3') },
    { id:'w7', n:'Trenza de Puntas', t:'p', tag:'mec', r:3, c:0, max:1, req:['w4','w5'], d:()=>'Tras Fuego, Hielo y Rayo seguidos, tu siguiente flecha estalla en 4 m (150 %)', icon:I('clase-c15') },
    { id:'w8', n:'Rayo o Escarcha', t:'c', tag:'mec', r:3, c:1, max:1, req:['w5'], icon:I('clase-c14'), opts:[
      { k:'A', n:'Chispa Saltarina', d:'La punta de Rayo salta a 6 enemigos (antes 3)', role:'AREA' },
      { k:'B', n:'Hielo Mordiente', d:'Los enemigos con la punta de Hielo reciben +15 % de tus flechas durante 4 s', role:'UNI' } ],
      win:'A, contra grupos. B, contra jefes' },
    { id:'w9', n:'Puntas Afines', t:'p', tag:'mec', r:3, c:2, max:1, req:['w5','w6'], d:()=>'Cada punta encantada te da 8 de Impulso (Tiradora) o recarga 1 s de Trampa de Cepo (Montaraz)', icon:I('clase-c5') },
    { id:'w10', n:'Encantamiento Hondo', t:'p', tag:'num', r:4, c:0.5, max:1, req:['w7','w8'], d:()=>'Las puntas encantadas hacen +25 % de daño', icon:I('clase-c2') },
    { id:'w11', n:'Punta Viva', t:'p', tag:'mec', r:4, c:1.5, max:1, req:['w8','w9'], d:()=>'Si una punta encantada mata, la siguiente llega al instante (una vez cada 3 s)', icon:I('clase-c7') },
    { id:'w12', n:'Lluvia Encantada', t:'f', tag:'mec', r:5, c:1, max:1, req:['w10','w11'], d:()=>'Cada 30 s, durante 6 s, tus flechas llevan una punta encantada (al 30 %; una por enemigo cada 1 s)', icon:S('lluvia_flechas') },
  ] },
  { id:'h3', n:'Halconera', specs:['francotiradora','montaraz'], art:'ui256/menu_mascota.webp',
    line:'Un halcón caza contigo: marca a la presa y cae en picado sobre ella', key:'Un halcón cae en picado cada 6 s sobre tu blanco (100 %) y lo marca: recibe +10 % de tus flechas', nodes:[
    { id:'y0', n:'Halcón Cazador', t:'k', tag:'mec', r:0, c:1, max:1, free:true, d:()=>'Un halcón cae en picado cada 6 s sobre tu blanco (100 %) y lo marca 6 s: recibe +10 % de tus flechas', icon:I('clase-c4'), impl:'power y_halcon · NUEVO (aliado sin vida; picado = eco con marca)' },
    { id:'y1', n:'Alas Rápidas', t:'p', tag:'num', r:1, c:0, max:1, req:['y0'], d:()=>'El halcón cae en picado cada 5 s (antes 6 s)', icon:I('clase-c11') },
    { id:'y2', n:'Picado: Hondo o Rasante', t:'c', tag:'mec', r:1, c:1, max:1, req:['y0'], icon:I('francotiradora-s16'), opts:[
      { k:'A', n:'Picado Hondo', d:'El picado hace +40 % y a un jefe le llena 15 de Quebranto', role:'UNI' },
      { k:'B', n:'Vuelo Rasante', d:'El picado barre una línea de 8 m y golpea a todos (70 %)', role:'AREA' } ],
      win:'A, contra jefes. B, contra grupos' },
    { id:'y3', n:'Presa Señalada', t:'p', tag:'mec', r:1, c:2, max:1, req:['y0'], d:()=>'La marca del halcón cuenta como tu Punto Débil (sin el perfecto gratis) o como tu Presa (Montaraz)', icon:I('francotiradora-x1') },
    { id:'y4', n:'Llamada o Alas', t:'c', tag:'mec', r:2, c:0, max:1, req:['y1','y2'], icon:I('clase-c4'), opts:[
      { k:'A', n:'Llamada del Halcón', d:'Habilidad (ranura 2): el halcón ataca a tu blanco 6 s (40 % cada 0,5 s), lo ciega y le llena 30 de Quebranto. 30 s', role:'UNI', act:'a_h_halcon' },
      { k:'B', n:'Alas Protectoras', d:'Al bajar del 40 % de vida, el halcón te cubre: recibes un 30 % menos de daño 4 s. Una vez cada 60 s', role:'AGU' } ],
      win:'A, contra jefes: daño, ceguera y Quebranto a voluntad (ocupa la ranura 2). B, para sobrevivir sin ocupar ranura' },
    { id:'y5', n:'Garras Afiladas', t:'p', tag:'num', r:2, c:1, max:1, req:['y2'], d:()=>'El halcón hace +25 % de daño', icon:I('clase-c1') },
    { id:'y6', n:'Grito del Halcón', t:'p', tag:'mec', r:2, c:2, max:1, req:['y2','y3'], d:()=>'El picado corta el hechizo del blanco y lo deja mudo 2 s', icon:I('clase-c3') },
    { id:'y7', n:'Cetrería', t:'p', tag:'mec', r:3, c:0, max:1, req:['y4','y5'], d:()=>'Golpear al marcado con tu principal o tu insignia hace caer al halcón al instante (una vez cada 10 s)', icon:I('francotiradora-s15') },
    { id:'y8', n:'Bandada o Peregrino', t:'c', tag:'mec', r:3, c:1, max:1, req:['y5'], icon:I('francotiradora-s16'), opts:[
      { k:'A', n:'Bandada', d:'Dos halcones más pequeños caen sobre otros enemigos (60 % cada uno)', role:'AREA' },
      { k:'B', n:'Halcón Peregrino', d:'El picado contra un élite o un jefe hace +40 %', role:'UNI' } ],
      win:'A, contra grupos. B, contra jefes' },
    { id:'y9', n:'Plumas Cortantes', t:'p', tag:'mec', r:3, c:2, max:1, req:['y5','y6'], d:()=>'El picado suelta 4 plumas a enemigos cercanos (40 % cada una)', icon:I('tiradora-s6') },
    { id:'y10', n:'Ojo Compartido', t:'p', tag:'mec', r:4, c:0.5, max:1, req:['y7','y8'], d:()=>'La marca del halcón dura 12 s (antes 6 s) y no se pierde al marcar a otro: varios marcados a la vez', icon:I('francotiradora-x2') },
    { id:'y11', n:'Halcón Fiel', t:'p', tag:'mec', r:4, c:1.5, max:1, req:['y8','y9'], d:()=>'Si el marcado muere, el halcón marca al siguiente y cae en picado gratis', icon:I('montaraz-s15') },
    { id:'y12', n:'Cielo de Halcones', t:'f', tag:'mec', r:5, c:1, max:1, req:['y10','y11'], d:()=>'Cada 30 s, durante 4 s, el halcón cae en picado cada segundo y cada picado marca a otro enemigo', icon:I('francotiradora-x3') },
  ] },
];

// ============================================================ BUILDS (4 por especialización, una híbrida; 12 en total)
// Rangos en ORDEN DE COMPRA (cada punto va al primer nodo de la lista que se pueda comprar). 'c4_' = rangos tardíos (Nv85+).
// Cada build compra solo nodos de habilidades que lleva en su barra (G8b; la barra está en docs/paso2g-arquera.md §8).
// Órdenes de clase reutilizados (todos legales punto a punto):
const CLS_DANZA_HUMO = { c1:2, c2:2, c5:1, c6:1, c10:1, c13:2, c8:2, c12:2, c11:1, c16:1, c19:1, c23:2, c17:1, c21:1, c4:1, c15:1, c18:2, c26:3, c29:3, c24:2, c4_:2 }; // Danza del Arco, con Bomba de Humo
const CLS_MANTO = { c1:2, c4:3, c5:1, c8:2, c11:1, c15:1, c19:1, c22:1, c2:2, c12:2, c6:1, c10:1, c16:1, c18:2, c13:2, c17:1, c25:3, c28:3, c21:1, c24:2, c23:1 };    // Manto de Niebla, sin Paso Veloz
const CLS_SOMBRA = { c2:2, c3:2, c6:1, c7:1, c10:1, c14:1, c17:1, c21:1, c24:2, c1:2, c5:1, c8:2, c12:2, c13:2, c16:1, c15:1, c11:1, c27:3, c30:3, c20:1, c23:2, c26:1 }; // Sombra Gemela, sin humo ni Perforante
const CLS_DANZA_PASO = { c1:2, c2:2, c5:1, c6:1, c10:1, c13:2, c8:2, c12:2, c11:1, c16:1, c3:2, c7:1, c14:1, c17:1, c20:1, c23:2, c15:1, c26:3, c29:3, c21:1, c24:2, c27:1 }; // Danza del Arco, con Paso Veloz y sin humo
const CLS_DANZA_PERF = { c1:2, c2:2, c5:1, c6:1, c9:1, c12:2, c13:2, c16:1, c10:1, c17:1, c20:1, c23:2, c8:2, c15:1, c3:2, c11:1, c7:1, c26:3, c29:3, c14:1, c21:1, c24:2 }; // Danza del Arco, con Flecha Perforante
const BUILDS = {
  // ---- TIRADORA VELOZ
  plumas: { sp:'tiradora', n:'Tormenta de Plumas', arch:'Abanico', hero:'h2', heroCh:{ w2:'B', w4:'B', w8:'A' }, heroNodes:['w2','w3','w6','w5','w9','w8','w11','w12','w4','w1'],
    cls: { ...CLS_DANZA_HUMO },
    clsCh: { c5:'B', c6:'A', c10:'A', c11:'B', c15:'B', c16:'B', c17:'B' },
    spec: { v1:3, v4:2, v5:1, v8:1, v11:2, v15:1, v18:2, v22:3, v25:3, v28:4, v2:3, v9:1, v12:2, v16:2, v3:1 },
    specCh: { v8:'A', v9:'B', v15:'A' } },
  vaiven: { sp:'tiradora', n:'Vaivén Eterno', arch:'Vaivén', hero:'h1', heroCh:{ q2:'A', q4:'B', q8:'A' }, heroNodes:['q2','q1','q3','q5','q8','q4','q7','q10','q12','q11'],
    cls: { ...CLS_DANZA_HUMO },
    clsCh: { c5:'A', c6:'A', c10:'B', c11:'B', c15:'B', c16:'A', c17:'B' },
    spec: { v2:3, v5:1, v9:1, v12:2, v16:2, v19:2, v23:3, v26:3, v28:4, v1:3, v4:1, v8:1, v15:1, v3:3, v6:1 },
    specCh: { v8:'B', v9:'A', v15:'A' } },
  galerna: { sp:'tiradora', n:'Galerna Infinita', arch:'Galerna', hero:'h2', heroCh:{ w2:'B', w4:'B', w8:'A' }, heroNodes:['w2','w1','w3','w5','w8','w4','w7','w10','w12','w11'],
    cls: { ...CLS_MANTO },
    clsCh: { c5:'B', c6:'A', c10:'A', c11:'B', c15:'A', c16:'B', c17:'B', c22:'B' },
    spec: { v3:3, v7:2, v6:1, v10:1, v13:2, v14:1, v17:2, v21:1, v24:3, v27:3, v28:4, v2:3, v9:1, v16:2, v20:2 },
    specCh: { v9:'B', v10:'A' } },
  cruzado: { sp:'tiradora', n:'Viento Cruzado', arch:'Híbrido Abanico-Vaivén', hero:'h1', heroCh:{ q2:'A', q4:'B', q8:'A' }, heroNodes:['q2','q3','q6','q5','q9','q8','q11','q12','q4','q1'],
    cls: { c2:2, c3:2, c6:1, c7:1, c10:1, c14:1, c17:1, c20:1, c24:2, c5:1, c8:2, c12:2, c13:2, c16:1, c21:1, c23:2, c1:1, c27:3, c30:3, c1_:1, c11:1, c15:1, c26:1 },
    clsCh: { c5:'A', c6:'A', c10:'B', c11:'B', c14:'A', c15:'B', c16:'A', c17:'A' },
    spec: { v1:3, v2:3, v4:2, v5:1, v8:1, v9:1, v11:2, v12:2, v15:1, v16:2, v18:2, v19:2, v22:3, v23:3, v13:1, v20:2 },
    specCh: { v8:'A', v9:'A', v15:'B' } },
  // ---- FRANCOTIRADORA
  perforacion: { sp:'francotiradora', n:'Línea Mortal', arch:'Perforación', hero:'h1', heroCh:{ q2:'B', q4:'A', q8:'B' }, heroNodes:['q2','q3','q6','q5','q9','q8','q11','q12','q4','q1'],
    cls: { ...CLS_DANZA_PASO },
    clsCh: { c5:'A', c6:'B', c10:'A', c11:'B', c14:'A', c15:'B', c16:'B', c17:'B' },
    spec: { f1:3, f4:2, f5:1, f8:1, f11:2, f15:1, f18:2, f22:3, f25:3, f28:4, f2:3, f9:1, f12:2, f16:2, f3:1 },
    specCh: { f8:'A', f9:'A', f15:'A' } },
  puntodebil: { sp:'francotiradora', n:'Disparo Imposible', arch:'Punto Débil', hero:'h3', heroCh:{ y2:'A', y4:'B', y8:'B' }, heroNodes:['y2','y1','y3','y5','y8','y4','y7','y10','y12','y11'],
    cls: { ...CLS_SOMBRA },
    clsCh: { c5:'A', c6:'B', c10:'B', c11:'B', c14:'B', c15:'B', c16:'A', c17:'B' },
    spec: { f2:3, f5:1, f9:1, f12:2, f16:2, f19:2, f23:3, f26:3, f28:4, f1:3, f4:1, f8:1, f15:1, f3:3, f6:1 },
    specCh: { f8:'B', f9:'B', f15:'B' } },
  vigia: { sp:'francotiradora', n:'Atalaya Eterna', arch:'Vigía', hero:'h1', heroCh:{ q2:'B', q4:'B', q8:'A' }, heroNodes:['q2','q1','q3','q5','q8','q4','q7','q10','q12','q11'],
    cls: { ...CLS_DANZA_PERF },
    clsCh: { c5:'A', c6:'B', c9:'B', c10:'B', c11:'B', c14:'A', c15:'B', c16:'A', c17:'B' },
    spec: { f3:3, f7:2, f6:1, f10:1, f13:2, f14:1, f17:2, f21:1, f24:3, f27:3, f28:4, f2:3, f5:1, f16:2, f20:2 },
    specCh: { f10:'A' } },
  pulso: { sp:'francotiradora', n:'Pulso de Hierro', arch:'Híbrido Perforación-Punto Débil', hero:'h3', heroCh:{ y2:'A', y4:'B', y8:'B' }, heroNodes:['y2','y3','y6','y5','y9','y8','y11','y12','y4','y1'],
    cls: { ...CLS_SOMBRA },
    clsCh: { c5:'A', c6:'B', c10:'A', c11:'B', c14:'A', c15:'B', c16:'A', c17:'B' },
    spec: { f1:3, f2:3, f4:2, f5:1, f8:1, f9:1, f11:2, f12:2, f15:1, f16:2, f18:2, f19:2, f22:3, f23:3, f3:1, f20:2 },
    specCh: { f8:'B', f9:'B', f15:'B' } },
  // ---- MONTARAZ
  campo: { sp:'montaraz', n:'Tierra Arrasada', arch:'Campo Minado', hero:'h2', heroCh:{ w2:'B', w4:'B', w8:'A' }, heroNodes:['w2','w3','w6','w5','w9','w8','w11','w12','w4','w1'],
    cls: { ...CLS_DANZA_HUMO },
    clsCh: { c5:'B', c6:'A', c10:'A', c11:'B', c15:'A', c16:'B', c17:'B' },
    spec: { m1:3, m4:2, m5:1, m8:1, m11:2, m15:1, m18:2, m22:3, m25:3, m28:4, m2:3, m9:1, m12:2, m16:2, m3:1 },
    specCh: { m8:'A', m9:'A', m15:'A' } },
  caceria: { sp:'montaraz', n:'Gran Cacería', arch:'Presa', hero:'h3', heroCh:{ y2:'A', y4:'A', y8:'B' }, heroNodes:['y2','y1','y3','y5','y8','y4','y7','y10','y12','y11'],
    cls: { ...CLS_SOMBRA },
    clsCh: { c5:'A', c6:'A', c10:'B', c11:'B', c14:'A', c15:'B', c16:'A', c17:'B' },
    spec: { m2:3, m5:1, m9:1, m12:2, m16:2, m19:2, m23:3, m26:3, m28:4, m1:3, m4:1, m8:1, m15:1, m3:3, m6:1 },
    specCh: { m8:'B', m9:'B', m15:'B' } },
  zarzal: { sp:'montaraz', n:'Bosque Vivo', arch:'Zarzal', hero:'h2', heroCh:{ w2:'A', w4:'B', w8:'B' }, heroNodes:['w2','w1','w3','w5','w8','w4','w7','w9','w11','w12'],   // ronda 2: Puntas Afines (w9) en lugar de Encantamiento Hondo (w10)
    cls: { ...CLS_MANTO },
    clsCh: { c5:'B', c6:'A', c10:'A', c11:'B', c15:'A', c16:'A', c17:'B', c22:'B' },
    spec: { m3:3, m7:2, m6:1, m10:1, m13:2, m14:1, m17:2, m21:1, m24:3, m27:3, m28:4, m2:3, m9:1, m16:2, m20:2 },
    specCh: { m9:'A', m10:'A' } },
  espinas: { sp:'montaraz', n:'Espinas de Caza', arch:'Híbrido Presa-Zarzal', hero:'h3', heroCh:{ y2:'A', y4:'B', y8:'B' }, heroNodes:['y2','y3','y6','y5','y9','y8','y11','y12','y4','y1'],
    cls: { ...CLS_DANZA_HUMO },
    clsCh: { c5:'A', c6:'A', c10:'B', c11:'B', c15:'B', c16:'A', c17:'B' },
    spec: { m2:3, m3:3, m6:1, m7:2, m9:1, m10:1, m12:2, m13:2, m16:2, m17:2, m19:2, m21:1, m23:3, m24:3, m14:1, m20:2 },
    specCh: { m9:'B', m10:'B' } },
};
Object.values(BUILDS).forEach(TV2.normBuild);

// ============================================================ REGISTRO
window.TALENTS_V2_CLASSES = window.TALENTS_V2_CLASSES || {};
window.TALENTS_V2_CLASSES.arquera = {
  formato: 1,
  estado: 'diseño',                 // etapas 1 y 2 completas y corregidas tras el juicio: clase, 3 especializaciones, 3 árboles héroe y 12 builds
  id: 'arquera', name: 'Arquera', res: 'Energía', resIcon: 'res_energia', color: '#ead86e',
  emblem: 'ui/res_energia.webp',
  clsArt: 'specs/tiradora.webp',
  book: { baseIcon: 'ui/res_energia.webp', baseNote: 'flecha, rodada y humo' },
  specOrder: SPEC_IDS, defaultSpec: 'tiradora', specs: SPECS,
  catalog: CATALOG,
  fallbackBar: { ...BASE_BAR },
  specBar: SPEC_BAR,
  reco: {
    tiradora: { a_disparo:'A', flecha_multiple:'A', a_t_andanada:'B', a_v_carrera:'B', a_u_diluvio:'A', a_humo:'A', a_paso:'A' },
    francotiradora: { a_disparo:'B', a_t_apuntado:'B', a_f_rastreador:'B', a_f_rodilla:'A', a_u_celeste:'B', flecha_perforante:'B', a_paso:'A' },
    montaraz: { a_disparo:'B', a_t_cepo:'B', a_m_detonante:'A', a_m_acecho:'A', a_u_zarzas:'A', a_humo:'B', lluvia_flechas:'B' },
  },
  sup: { flecha_multiple:['amplify','wide'] },
  mech: MECH_TXT, innate: SPEC_INNATE_TXT,
  groups: {
    flechas: { label:'Toca todas tus flechas', ids:['a_disparo', 'flecha_perforante', 'lluvia_flechas', 'a_t_andanada', 'a_v_carrera', 'flecha_multiple', 'a_u_diluvio', 'a_t_apuntado', 'a_f_rastreador', 'a_u_celeste', 'a_m_detonante'] },
  },
  tree: { cls: CLS, spec: { tiradora: TIRADORA, francotiradora: FRANCO, montaraz: MONTARAZ }, hero: HERO },
  builds: BUILDS,
  defaultBuild: { tiradora:'plumas', francotiradora:'puntodebil', montaraz:'zarzal' },
  demo: { spend:'v16', choice:'v9', hover:'v9', hoveract:'c11', rclick:'v9', pick:'v8', undo:'v23', hl:'flecha_multiple', swapTo:'francotiradora',
    gate: { ranks: { c2:2, c1:2, c3:2, c6:1 }, ch: { c6:'B' }, buy: ['c5', 'A'] } },
};
})();
