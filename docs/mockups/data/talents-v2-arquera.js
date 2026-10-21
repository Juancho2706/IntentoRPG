/* =====================================================================================================
 * Talentos v2 · ARQUERA (Paso 2g, plantilla §17 de docs/paso2g-maga-coherencia.md) · ETAPA 1 DE 2
 * -----------------------------------------------------------------------------------------------------
 * Diseño: docs/paso2g-arquera.md · contrato: data/README-talents-v2.md · molde: data/talents-v2-maga.js
 * Mockup: docs/mockups/skills-ux.html?cls=arquera&view=talents (abrir como file:///)
 * Validar: node docs/mockups/data/validar-talentos.mjs arquera
 *
 * ETAPA 1 (este archivo): kit base, árbol de CLASE completo y la TIRADORA completa (kit con forja, pasiva,
 * mecánica, árbol de 29 nodos y 2 builds, una híbrida).
 * ETAPA 2 (pendiente, la hace otro agente): Francotiradora y Montaraz (kit, árbol, builds), los 3 árboles
 * héroe y las builds restantes (Tiradora: «Vaivén Eterno» y «Galerna Infinita»). Hasta entonces:
 *   · tree.spec.francotiradora y tree.spec.montaraz = [] (el panel dibuja su rejilla en gris, «En diseño»);
 *   · tree.hero = 3 árboles vacíos con sus 2 especializaciones (el reparto puede cambiarse en la etapa 2);
 *   · specs/mech/innate de esas dos = textos del juego actual o «Pendiente (etapa 2)», con sketch:true;
 *   · su specBar usa solo el kit base (ids del catálogo) para que el libro no se rompa.
 * Prefijos de id: clase c1…c30 · Tiradora v0…v28 · (etapa 2: Francotiradora f, Montaraz m, héroes q/w/y).
 * ===================================================================================================== */
(function () {
'use strict';
const TV2 = window.TV2;
const { n1 } = TV2;                                   // n1(1.5) → "1,5" (números con coma en los textos)
const I = id => `talents/arquera-${id}.webp`;         // icono: I('clase-c1') → talents/arquera-clase-c1.webp
const S = id => `icons256/${id}.webp`;                // icono de habilidad reutilizado en un nodo

// ============================================================ LIBRO: catálogo de la Arquera
// kit base (toda Arquera, Nv1–8) · activas que concede un nodo de elección de clase (ranura 2) · kit de la Tiradora (Nv10–15)
const CATALOG = [
  // — KIT BASE (toda Arquera, Nv1–8): básica, dos principales de estilo distinto (línea y zona), movilidad y defensa —
  { id:'a_disparo', n:'Disparo Rápido', cat:'basic', req:1, elem:'physical', coef:1.0, gen:5, s:'Dispara una flecha veloz (100 % del arma). Cada acierto te devuelve 5 de Energía.',
    innate:{ tiradora:'Tiradora: cada 3.er disparo, 2 flechas más' },
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
  { id:'a_humo', n:'Bomba de Humo', cat:'defense', req:6, elem:'physical', cd:16, s:'Nube de 4 m durante 8 s: dentro recibes un 50 % menos de daño y los enemigos, cegados, pegan un 30 % menos.',
    M:{ n:'Humo Espeso', s:'Radio 4 → 5 m.', k:'radius +25' },
    A:{ n:'Humo Venenoso', r:'AREA', s:'Dentro, los enemigos sufren veneno del 40 % por segundo.', k:'dot poison · ★set{coef:.4}' },
    B:{ n:'Estallido de Humo', r:'CTRL', s:'Al lanzarla, empuja 3 m a los cercanos y los ralentiza un 40 % 2 s.', k:'★knock 3 · slow 2 · slowPct 40' } },
  { id:'lluvia_flechas', n:'Lluvia de Flechas', cat:'spender', req:8, elem:'physical', coef:0.6, cost:30, cd:4, s:'Tras 0,3 s de aviso, caen 4 oleadas de flechas en un círculo de 3 m (60 % cada una).',
    M:{ n:'Cielo Plomizo', s:'4 → 5 oleadas.', k:'★add{waves:1}' },
    A:{ n:'Aguacero', r:'UNI', s:'Radio 2 m, cae en 0,8 s y hace +40 % de daño.', k:'radius −33 · ★set{span:.8} · dmg +40' },
    B:{ n:'Cortina', r:'AGU', s:'Dentro, los enemigos pegan un 15 % menos y fallan la mitad de sus proyectiles.', k:'★set{allyDr:15, projMissPct:50} (zona)' } },
  // — activas de clase que se eligen en un nodo de elección del árbol de clase (ranura 2) —
  { id:'a_t_camuflaje', n:'Camuflaje', cat:'defense', req:21, talent:true, grantBy:'c11', elem:'physical', cd:30, icon:I('clase-c12'), s:'Te vuelves invisible 4 s y los enemigos te pierden; tu primer disparo al salir es crítico.' },
  { id:'agilidad', n:'Agilidad', cat:'utility', req:27, talent:true, grantBy:'c17', elem:'physical', cd:16, s:'Durante 6 s: +30 % de velocidad, +15 % de velocidad de ataque e inmunidad a las ralentizaciones.' },
  { id:'a_t_bengala', n:'Flecha Bengala', cat:'utility', req:31, talent:true, grantBy:'c22', elem:'physical', cd:30, icon:I('clase-c15'), s:'Una bengala de 10 m durante 8 s: dentro, los enemigos reciben un 10 % más de daño de todo el grupo.' },
  // — KIT DE LA TIRADORA (solo con la especialización; Nv10–15) —
  { id:'a_t_andanada', n:'Andanada', cat:'spec', req:10, spec:'tiradora', elem:'physical', coef:0.55, cost:25, cd:8, icon:I('tiradora-s4'), s:'Saltas 4 m atrás y disparas 10 flechas en 120° (55 % cada una). En 2 s, pulsa otra vez: saltas adelante y repites.',
    M:{ n:'Arco Ancho', s:'Abanico 120 → 150°.', k:'★set{spread:150°}' },
    A:{ n:'Andanada Cerrada', r:'UNI', s:'Abanico de 30° y +3 m de alcance: más flechas sobre el mismo enemigo.', k:'★set{spread:30°} · range +3' },
    B:{ n:'Andanada Repulsora', r:'CTRL', s:'Las flechas empujan 2 m y ralentizan un 30 % 2 s; −15 % de daño.', k:'★knock 2 · slow 2 · slowPct 30 · dmg −15' } },
  { id:'a_v_carrera', n:'Carrera del Viento', cat:'movement', req:12, spec:'tiradora', elem:'physical', coef:0.45, cd:10, icon:I('tiradora-s9'), s:'Mantén pulsado: corres un 40 % más rápido hasta 4 s y disparas sola al enemigo más cercano cada 0,4 s (45 %).',
    M:{ n:'Galope', s:'Corres un 40 → 55 % más rápido.', k:'★set{moveMul:1.55}' },
    A:{ n:'Carrera Certera', r:'UNI', s:'Disparas cada 0,6 s al enemigo con más vida; +70 % de daño.', k:'★set{autoShot.every:.6, autoShot.target:maxHp} · dmg +70' },
    B:{ n:'Carrera Esquiva', r:'AGU', s:'Mientras corres, el 40 % de los proyectiles enemigos te fallan; −30 % de daño.', k:'★set{projMissPct:40} · dmg −30' } },
  { id:'flecha_multiple', n:'Flecha Múltiple', cat:'spender', req:14, spec:'tiradora', elem:'physical', coef:0.39, cost:22, s:'Disparas 5 flechas en un abanico de 50° (39 % cada una). No te frena: úsala corriendo.',
    M:{ n:'Alcance Largo', s:'+3 m de alcance (10 → 13 m).', k:'range +30' },
    A:{ n:'Abanico Abierto', r:'AREA', s:'7 flechas en 90° (33 % cada una).', k:'★set{count:7, spread:90°, coef:.33}' },
    B:{ n:'Haz Cerrado', r:'UNI', s:'3 flechas juntas en 10° que atraviesan; 55 % cada una.', k:'★set{count:3, spread:10°, pierce:true, coef:.55}' } },
  { id:'a_u_diluvio', n:'Diluvio de Saetas', cat:'ultimate', req:15, spec:'tiradora', elem:'physical', coef:1.7, cd:50, s:'Una nube de saetas te sigue 6 s y cada 0,5 s descarga en 4 m a tu alrededor (170 % por oleada).',
    M:{ n:'Nube Ancha', s:'Radio 4 → 5 m.', k:'radius +25' },
    A:{ n:'Diluvio Anclado', r:'AREA', s:'Queda fijo donde apuntas, con 6 m de radio.', k:'★set{follow:false, at:target, radius:6}' },
    B:{ n:'Saetas Pesadas', r:'UNI', s:'4 saetas de 500 % caen sobre tu objetivo en 2 s.', k:'★set{waves:4, span:2, radius:1.5, coef:5}' } },
];

// ============================================================ ESPECIALIZACIONES: metadatos, barra, mecánica y pasiva
const SPECS = {
  tiradora: { id:'tiradora', name:'Tiradora Veloz', role:'Daño en área', mech:'Impulso', mechIco:'emblems/tiradora.webp',
    line:'Nunca se detiene: dispara corriendo, salta atrás y vuelve a disparar.', innate:'Cada 3.er Disparo Rápido sale triple', gauge:'impulso' },
  // ETAPA 2 (esqueletos: textos del juego actual)
  francotiradora: { id:'francotiradora', name:'Francotiradora', role:'Un objetivo', mech:'Concentración', mechIco:'emblems/francotiradora.webp',
    line:'Un disparo, una baja: críticos devastadores desde lejos.', innate:'Pendiente (etapa 2)', gauge:'concentracion', sketch:true },
  montaraz: { id:'montaraz', name:'Montaraz', role:'Control', mech:'Coto de Caza', mechIco:'emblems/montaraz.webp',
    line:'Trampas y terreno: la presa nunca escapa de tu coto de caza.', innate:'+25 % de Quebranto a los jefes (juego actual)', gauge:'coto', sketch:true },
};
const SPEC_IDS = ['tiradora', 'francotiradora', 'montaraz'];
const BASE_BAR = { lmb:'a_disparo', rmb:'flecha_perforante', k1:'a_paso', k2:'a_humo', k3:null, k4:null };
const SPEC_BAR = {
  tiradora: { bar:{ lmb:'a_disparo', rmb:'flecha_multiple', k1:'a_v_carrera', k2:'a_humo', k3:'a_t_andanada', k4:'a_u_diluvio' }, forge:{ a_disparo:'A', flecha_multiple:'A' }, sel:'flecha_multiple' },
  francotiradora: { bar:{ ...BASE_BAR }, forge:{}, sel:'flecha_perforante' },   // etapa 2
  montaraz: { bar:{ ...BASE_BAR, k2:'lluvia_flechas' }, forge:{}, sel:'lluvia_flechas' },  // etapa 2
};
const MECH_TXT = {
  tiradora: { n:'Impulso', range:'0–100', ico:'emblems/tiradora.webp',
    gen:'+3 por cada acierto mientras te mueves (como mucho uno cada 0,15 s). Quieta no ganas',
    out:'A 100: Vendaval 6 s. +25 % de velocidad de ataque y +1 flecha a Flecha Múltiple',
    loss:'Quieta más de 2 s: −10 por segundo. Al acabar el Vendaval vuelve a 0',
    feed:['a_disparo', 'flecha_multiple', 'a_t_andanada', 'a_v_carrera'], feedNames:{ a_disparo:'Disparo Rápido (en movimiento)' },
    alt:'impulso · perShot 3 · shotGap 0,15 · galeT 6 · galeAspd 25 · galeProj 1 · NUEVO: idleAfter 2 · idleRate 10' },
  // ETAPA 2: textos del juego actual (js/ui-gauges-arquera.js)
  francotiradora: { n:'Concentración', range:'0–100', ico:'emblems/francotiradora.webp', gen:'Quieta: +20 por segundo',
    out:'Cada punto da +0,15 % de crítico (+15 % a 100)', loss:'Moverte: −25 por segundo', feed:[], alt:'concentracion · juego actual · pendiente (etapa 2)' },
  montaraz: { n:'Coto de Caza', range:'0–3 trampas', ico:'emblems/montaraz.webp', gen:'Trampa de Cepo: 1 carga, 8 s por carga',
    out:'Un cepo pisado inmoviliza 2 s y se gasta. Presa: el primer élite o jefe que golpeas, 15 s', loss:'Los cepos duran 30 s armados', feed:[], alt:'coto · juego actual · pendiente (etapa 2)' },
};
const SPEC_INNATE_TXT = {
  tiradora: { sk:'a_disparo', n:'Tercera Flecha', l:'Cada 3.er Disparo Rápido lanza 2 flechas más en abanico de 30° (60 % cada una).', f:'Con otra especialización, Disparo Rápido vuelve a ser una sola flecha' },
  francotiradora: { sk:null, n:'Pendiente (etapa 2)', l:'Se diseña en la etapa 2 (docs/paso2g-arquera.md §16).', f:'' },
  montaraz: { sk:null, n:'Cazadora de jefes (juego actual)', l:'Llenas un 25 % más rápido el Quebranto de los jefes. Se revisa en la etapa 2.', f:'' },
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
    { k:'B', n:'Flecha Saqueadora', d:'Si Disparo Rápido mata, recuperas 8 de Energía', role:'AREA', impl:'power a_saqueo · NUEVO (onKill + g.gainResource)' } ],
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
    { k:'A', n:'Camuflaje', d:'Habilidad (ranura 2): invisible 4 s; los enemigos te pierden y tu primer disparo es crítico. Se recarga en 30 s', role:'AGU', act:'a_t_camuflaje', impl:'activa a_t_camuflaje · existe (+ power a_camuflaje)' },
    { k:'B', n:'Instinto de Supervivencia', d:'Un golpe que te mataría te deja con 1 de vida y suelta una Bomba de Humo gratis. Una vez cada 120 s', role:'AGU', impl:'power a_instinto · NUEVO (onLethal + lanza a_humo como eco)' } ],
    win:'A, contra golpes de jefe que se ven venir y para cambiar de sitio (ocupa la ranura 2). B, siempre activo y sin ocupar ranura' },
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
  { id:'c18', n:'Humo Denso', t:'p', tag:'num', r:5, c:0, max:2, req:['c15'], d:r=>`La Bomba de Humo dura ${8+2*r} s (antes 8 s)`, touch:['a_humo'], icon:S('a_humo'), impl:'mod a_humo durS · existe' },
  { id:'c19', n:'Tiro desde la Niebla', t:'p', tag:'mec', r:5, c:2, max:1, req:['c15','c16'], d:()=>'Dentro de tu Bomba de Humo, cada Disparo Rápido te da 3 de Energía y alarga el humo 0,3 s (hasta +4 s)', touch:['a_humo','a_disparo'], hyb:'Defensa + Básica', icon:I('tiradora-s7'), impl:'power a_tiro_niebla · NUEVO (onHit + campo zona)' },
  { id:'c20', n:'Lluvia en Retirada', t:'p', tag:'mec', r:5, c:4, max:1, req:['c16','c17'], d:()=>'Paso Veloz deja caer una Lluvia de Flechas gratis al 50 % donde empezaste a rodar', touch:['a_paso','lluvia_flechas'], hyb:'Movilidad + Principal', icon:S('lluvia_flechas'), impl:'power a_lluvia_retirada · NUEVO (afterCast + eco de lluvia_flechas ×0,5)' },
  { id:'c21', n:'Piernas de Corredora', t:'p', tag:'num', r:5, c:6, max:1, req:['c17'], d:()=>'Te mueves un 10 % más rápido', icon:I('tiradora-s2'), impl:'stats.spdPct · existe' },
  { id:'c22', n:'Bengala o Economía', t:'c', tag:'mec', r:6, c:1, max:1, req:['c18','c19'], icon:I('clase-c14'), opts:[
    { k:'A', n:'Flecha Bengala', d:'Habilidad (ranura 2): bengala de 10 m 8 s; los enemigos dentro reciben +10 % de daño. Se recarga en 30 s', role:'AREA', act:'a_t_bengala', impl:'activa a_t_bengala · existe (dmgPct → applyWeakness 10)' },
    { k:'B', n:'Economía Letal', d:'Las habilidades que cuestan más de 20 de Energía cuestan un 20 % menos', role:'UNI', impl:'tv.costRedBig {pct:20, over:20} · existe' } ],
    win:'A, en grupo: todo el grupo pega +10 % dentro (ocupa la ranura 2). B, para hacer daño en solitario (+5–7 %)' },
  { id:'c23', n:'Recarga en Marcha', t:'p', tag:'mec', r:6, c:3, max:2, req:['c19','c20'], d:r=>`Cada habilidad principal que lanzas recarga ${n1(0.3*r)} s de Paso Veloz y de la Bomba de Humo`, touch:['a_paso','a_humo'], icon:I('tiradora-s1'), impl:'power a_recarga_marcha · NUEVO (afterCast de cat spender)' },
  { id:'c24', n:'Cadencia', t:'p', tag:'num', r:6, c:5, max:2, req:['c20','c21'], d:r=>`Disparas un ${7*r} % más rápido`, icon:I('clase-c8'), impl:'stats.aspdPct · existe' },
  // penúltimos (fila 7): potentes por sí solos
  { id:'c25', n:'Emboscada', t:'p', tag:'mec', r:7, c:0, max:3, req:['c22'], d:r=>`Al salir de tu Bomba de Humo o al acabarse, tus ${r+1} siguientes disparos son críticos seguros`, touch:['a_humo'], icon:I('francotiradora-s15'), impl:'power a_emboscada · NUEVO (onTick: dentro→fuera; onCast forceCrit)' },
  { id:'c26', n:'Compás', t:'p', tag:'mec', r:7, c:3, max:3, req:['c23'], d:r=>`Alternar básica y principal te da un Compás (hasta 5): +${2*r} % de daño cada uno. Se pierden a los 3 s`, icon:I('francotiradora-s2'), impl:'power a_compas · NUEVO (⑦ onCast: alterna basic/spender; stacks)' },
  { id:'c27', n:'Tras la Rodada', t:'p', tag:'mec', r:7, c:6, max:3, req:['c24'], d:r=>`Tras Paso Veloz, tu siguiente habilidad principal no cuesta Energía y hace +${10*r} %`, touch:['a_paso'], icon:I('tiradora-s8'), impl:'power a_tras_rodada · NUEVO (afterCast + modifyResolve)' },
  // finales (fila 8): el presupuesto alcanza para UNO
  { id:'c28', n:'Manto de Niebla', t:'f', tag:'mec', r:8, c:0, max:3, req:['c25'], d:r=>`Tu Bomba de Humo te sigue. Tú y tus aliados dentro recuperan un ${r} % de vida por segundo`, touch:['a_humo'], icon:I('montaraz-s13'), impl:'power a_manto · NUEVO (campo zona que sigue al dueño + g.heal target all en el radio)', final:'Defensa' },
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
  { id:'v4', n:'Puntas Templadas', t:'p', tag:'num', r:2, c:0, max:2, req:['v1'], d:r=>`Flecha Múltiple y tu disparo triple hacen +${15*r} % de daño`, touch:['flecha_multiple','a_disparo'], arch:'abanico', icon:I('clase-c9'), impl:'mod flecha_multiple dmg + power t_tercera (rango) · claves' },
  { id:'v5', n:'Remate Triple', t:'p', tag:'mec', r:2, c:2, max:1, req:['v1','v2'], d:()=>'Tras cada Andanada, tu siguiente Disparo Rápido sale triple, sin esperar al 3.º', touch:['a_t_andanada','a_disparo'], arch:'abanico+vaiven', hyb:'Abanico + Vaivén', icon:I('tiradora-s4'), impl:'power t_remate_triple · NUEVO (afterCast pone el contador de seq a 2)' },
  { id:'v6', n:'Soltar y Disparar', t:'p', tag:'mec', r:2, c:4, max:1, req:['v2','v3'], d:()=>'Al soltar o acabar Carrera del Viento disparas una Andanada gratis al 60 %, sin saltar', touch:['a_v_carrera','a_t_andanada'], arch:'vaiven+galerna', hyb:'Vaivén + Galerna', icon:I('tiradora-s16'), impl:'power t_soltar · NUEVO (onRelease del canal + eco de a_t_andanada ×0,6 sin desplazamiento)' },
  { id:'v7', n:'Fondo de Corredora', t:'p', tag:'mec', r:2, c:6, max:2, req:['v3'], d:r=>`Carrera del Viento dura hasta ${4+r} s (antes 4 s) y te hace inmune a las ralentizaciones`, touch:['a_v_carrera'], arch:'galerna', icon:I('tiradora-s2'), impl:'mod a_v_carrera channelT + slowImmune · claves' },
  { id:'v8', n:'Triple: Abierto o Clavado', t:'c', tag:'mec', r:3, c:1, max:1, req:['v4','v5'], touch:['a_disparo'], arch:'abanico', icon:I('tiradora-s3'), opts:[
    { k:'A', n:'Triple Abierto', d:'Tu disparo triple lanza 4 flechas extra (antes 2) en un abanico de 60°', role:'AREA', impl:'power t_tercera · opción (seq.onNth count 5)' },
    { k:'B', n:'Triple Clavado', d:'Tu disparo triple es crítico seguro y hace +30 % de daño', role:'UNI', impl:'power t_triple_clavado · NUEVO (onCast forceCrit en el 3.º)' } ],
    win:'A, contra grupos: el doble de flechas extra cada 3 disparos. B, contra jefes: un crítico seguro cada 3 disparos. Decide qué Abanico juegas' },
  { id:'v9', n:'Andanada: Último Instante o Ida y Vuelta', t:'c', tag:'mec', r:3, c:3, max:1, req:['v5','v6'], touch:['a_t_andanada'], arch:'vaiven', icon:I('tiradora-x1'), opts:[
    { k:'A', n:'Último Instante', d:'Si relanzas Andanada en su último medio segundo, la segunda hace +80 % y te da 20 de Impulso', role:'UNI', impl:'power t_ultimo_instante · NUEVO (lee recast.left del canal)' },
    { k:'B', n:'Ida y Vuelta', d:'Puedes relanzar Andanada dos veces (antes una): atrás, adelante y atrás de nuevo; la tercera al 70 %', role:'AREA', impl:'mod a_t_andanada recast.max +1 · clave NUEVA (tipo genérico recast)' } ],
    win:'A, contra jefes: si aciertas el momento, +40 % de media y el Vendaval antes. B, contra grupos: barres tres sitios por uso. Decide qué Vaivén juegas' },
  { id:'v10', n:'Carrera: Rueda o Blanco Fijo', t:'c', tag:'mec', r:3, c:5, max:1, req:['v6','v7'], touch:['a_v_carrera'], arch:'galerna', icon:I('tiradora-s9'), opts:[
    { k:'A', n:'Rueda de Flechas', d:'Mientras corres con Carrera, cada segundo sueltas un anillo de 8 flechas a tu alrededor (40 % cada una)', role:'AREA', impl:'power t_rueda · NUEVO (tick del canal)' },
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
  { id:'v17', n:'Nube de Paso', t:'p', tag:'mec', r:5, c:5, max:2, req:['v13','v14'], d:r=>`Cada segundo de Carrera del Viento recarga ${r} s del Diluvio de Saetas`, touch:['a_v_carrera','a_u_diluvio'], arch:'galerna', icon:I('tiradora-s16'), impl:'power t_nube_paso · NUEVO (tick del canal)' },
  { id:'v18', n:'Flechas Perdidas', t:'p', tag:'mec', r:6, c:0, max:2, req:['v15'], d:r=>`Si Flecha Múltiple mata, suelta ${r+1} flechas hacia enemigos cercanos (50 % cada una)`, touch:['flecha_multiple'], arch:'abanico', icon:I('tiradora-s6'), impl:'power t_flechas_perdidas · NUEVO (onKill + fireProjectile)' },
  { id:'v19', n:'Vendaval Encadenado', t:'p', tag:'mec', r:6, c:2, max:2, req:['v15','v16'], d:r=>`Cada relanzamiento de Andanada alarga el Vendaval ${n1(0.5*r)} s (hasta +4 s)`, touch:['a_t_andanada'], arch:'vaiven', icon:I('tiradora-s14'), impl:'power t_vendaval_encadenado · NUEVO (sustituye a t_galechain)' },
  { id:'v20', n:'Pies Ligeros', t:'p', tag:'num', r:6, c:4, max:2, req:['v16','v17'], d:r=>`Te mueves un ${8*r} % más rápido`, icon:I('tiradora-s5'), impl:'stats.spdPct · existe' },
  { id:'v21', n:'Nube Fiel', t:'p', tag:'mec', r:6, c:6, max:1, req:['v17'], d:()=>'Mientras corres con Carrera, el Diluvio de Saetas descarga cada 0,25 s (antes 0,5 s)', touch:['a_v_carrera','a_u_diluvio'], arch:'galerna', icon:S('a_u_diluvio'), impl:'power t_nube_fiel · NUEVO (modifyResolve del intervalo mientras canalizas)' },
  { id:'v22', n:'Ráfaga Creciente', t:'p', tag:'mec', r:7, c:0, max:3, req:['v18'], d:r=>`Cada Flecha Múltiple a menos de 3 s de otra dispara 1 flecha más (hasta +${r+1})`, touch:['flecha_multiple'], arch:'abanico', icon:I('tiradora-s3'), impl:'power t_rafaga_creciente · NUEVO (modifyResolve proj con contador)' },
  { id:'v23', n:'Golpe de Apertura', t:'p', tag:'mec', r:7, c:3, max:3, req:['v19'], d:r=>`Al empezar el Vendaval, tus ${r+1} siguientes Andanadas o Flechas Múltiples son críticas seguras`, touch:['a_t_andanada','flecha_multiple'], arch:'vaiven', icon:I('tiradora-x1'), impl:'power t_apertura · NUEVO (⑩ onGauge full + onCast forceCrit)' },
  { id:'v24', n:'Ciclones', t:'p', tag:'mec', r:7, c:6, max:3, req:['v21'], d:r=>`Mientras corres con Carrera, cada ${n1(2.5-0.5*r)} s dejas un ciclón 4 s que dispara cada 0,5 s al más cercano (40 %)`, touch:['a_v_carrera'], arch:'galerna', icon:I('tiradora-x2'), impl:'power t_ciclones · NUEVO (campo t_ciclon que dispara)' },
  { id:'v25', n:'Tormenta de Plumas', t:'f', tag:'mec', r:8, c:0, max:3, req:['v22'], d:r=>`Cada 3.ª Flecha Múltiple sale además en círculo: 12 flechas más al 60 %${r > 1 ? `. Múltiple +${15*(r-1)} %` : ''}`, touch:['flecha_multiple'], arch:'abanico', icon:S('flecha_multiple'), impl:'power t_tormenta_plumas · NUEVO (afterCast cada 3.ª: anillo de proyectiles)', final:'Abanico' },
  { id:'v26', n:'Vaivén Eterno', t:'f', tag:'mec', r:8, c:3, max:3, req:['v23'], d:r=>`Durante el Vendaval, Andanada no se recarga: al cerrar su ventana puedes lanzarla otra vez${r > 1 ? `. Andanada +${15*(r-1)} %` : ''}`, touch:['a_t_andanada'], arch:'vaiven', icon:I('tiradora-x2'), impl:'power t_vaiven · NUEVO (al cerrar la ventana de recast, cds = 0 si galeT > 0)', final:'Vaivén' },
  { id:'v27', n:'Galerna Infinita', t:'f', tag:'mec', r:8, c:6, max:3, req:['v24'], d:r=>`Carrera del Viento dura mientras la mantengas (gasta 10 de Energía por segundo)${r > 1 ? `. Carrera +${15*(r-1)} %` : ''}`, touch:['a_v_carrera'], arch:'galerna', icon:I('tiradora-x3'), impl:'power t_galerna · NUEVO (canal sin fin con coste por tic)', final:'Galerna' },
  { id:'v28', n:'Ojo del Huracán', t:'x', tag:'mec', r:9, c:3, max:4, req:['v25','v26','v27'], d:r=>['1) El Vendaval también te da +20 % de velocidad de movimiento.', '2) Matar a un élite te da 50 de Impulso.', '3) El Vendaval salta a 80 de Impulso (antes 100).', '4) Cada 3 Vendavales, el Diluvio de Saetas se lanza solo y gratis.'].slice(0, r).join(' '), icon:I('tiradora-x3'), impl:'power t_ojo_huracan (rangos) · NUEVO (sustituye a t_eyestorm)' },
];

// ---------------------------------------------------------------- PARAGON (árboles héroe): ETAPA 2
// 3 árboles TEMÁTICOS DE LA CLASE, cada uno lo comparten 2 especializaciones (13 nodos: clave gratis, 3 elecciones y capstone).
// Reparto provisional (el del esqueleto): h1 Tiradora + Francotiradora · h2 Tiradora + Montaraz · h3 Francotiradora + Montaraz.
// Ideas de tema en docs/paso2g-arquera.md §10; la etapa 2 decide nombres, mecánica y reparto.
const HERO = [
  { id:'h1', n:'Árbol héroe 1', specs:['tiradora','francotiradora'], art:'ui256/menu_mapa.webp',
    line:'Pendiente (etapa 2): árbol héroe temático de la clase', key:'Pendiente (etapa 2)', nodes:[] },
  { id:'h2', n:'Árbol héroe 2', specs:['tiradora','montaraz'], art:'ui256/menu_coleccion.webp',
    line:'Pendiente (etapa 2): árbol héroe temático de la clase', key:'Pendiente (etapa 2)', nodes:[] },
  { id:'h3', n:'Árbol héroe 3', specs:['francotiradora','montaraz'], art:'ui256/menu_guia.webp',
    line:'Pendiente (etapa 2): árbol héroe temático de la clase', key:'Pendiente (etapa 2)', nodes:[] },
];

// ============================================================ BUILDS (Tiradora: 2 de 4 en la etapa 1; una híbrida)
// Rangos en ORDEN DE COMPRA (cada punto va al primer nodo de la lista que se pueda comprar). 'c4_' = rangos tardíos (Nv85+).
// heroNodes vacío: el Paragon se diseña en la etapa 2 (el validador lo marca como pendiente).
const BUILDS = {
  plumas: { sp:'tiradora', n:'Tormenta de Plumas', arch:'Abanico', hero:'h2', heroCh:{}, heroNodes:[],
    cls: { c1:2, c2:2, c5:1, c6:1, c10:1, c13:2, c8:2, c12:2, c11:1, c16:1, c19:1, c23:2, c17:1, c21:1, c4:1, c15:1, c18:2, c26:3, c29:3, c24:2, c4_:2 },
    clsCh: { c5:'B', c6:'A', c10:'A', c11:'B', c15:'B', c16:'B', c17:'B' },
    spec: { v1:3, v4:2, v5:1, v8:1, v11:2, v15:1, v18:2, v22:3, v25:3, v28:4, v2:3, v9:1, v12:2, v16:2, v3:1 },
    specCh: { v8:'A', v9:'B', v15:'A' } },
  cruzado: { sp:'tiradora', n:'Viento Cruzado', arch:'Híbrido Abanico-Vaivén', hero:'h1', heroCh:{}, heroNodes:[],
    cls: { c2:2, c3:2, c6:1, c7:1, c10:1, c14:1, c17:1, c20:1, c24:2, c5:1, c8:2, c12:2, c13:2, c16:1, c21:1, c23:2, c1:1, c27:3, c30:3, c1_:1, c11:1, c15:1, c26:1 },
    clsCh: { c5:'A', c6:'A', c10:'B', c11:'B', c14:'A', c15:'B', c16:'A', c17:'A' },
    spec: { v1:3, v2:3, v4:2, v5:1, v8:1, v9:1, v11:2, v12:2, v15:1, v16:2, v18:2, v19:2, v22:3, v23:3, v13:1, v20:2 },
    specCh: { v8:'A', v9:'A', v15:'B' } },
};
Object.values(BUILDS).forEach(TV2.normBuild);

// ============================================================ REGISTRO
window.TALENTS_V2_CLASSES = window.TALENTS_V2_CLASSES || {};
window.TALENTS_V2_CLASSES.arquera = {
  formato: 1,
  estado: 'diseño',                 // etapa 1: clase + Tiradora; etapa 2: Francotiradora, Montaraz y Paragon
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
  },
  sup: { flecha_multiple:['amplify','wide'] },
  mech: MECH_TXT, innate: SPEC_INNATE_TXT,
  groups: {
    flechas: { label:'Toca todas tus flechas', ids:['a_disparo', 'flecha_perforante', 'lluvia_flechas', 'a_t_andanada', 'a_v_carrera', 'flecha_multiple', 'a_u_diluvio'] },
  },
  tree: { cls: CLS, spec: { tiradora: TIRADORA, francotiradora: [], montaraz: [] }, hero: HERO },
  builds: BUILDS,
  defaultBuild: { tiradora:'plumas' },
  demo: { spend:'v16', choice:'v9', hover:'v9', hoveract:'c11', rclick:'v9', pick:'v8', undo:'v23', hl:'flecha_multiple', swapTo:'francotiradora',
    gate: { ranks: { c2:2, c1:2, c3:2, c6:1 }, ch: { c6:'B' }, buy: ['c5', 'A'] } },
};
})();
