/* =====================================================================================================
 * Talentos v2 · GUERRERO (Paso 2g, plantilla §17 de docs/paso2g-maga-coherencia.md)
 * -----------------------------------------------------------------------------------------------------
 * ETAPA 1 DE 2 (diseño: docs/paso2g-guerrero.md):
 *   · HECHO: kit base (5), árbol de CLASE (30 nodos), BERSERKER completo (kit con forja, pasiva, barra Sed,
 *     árbol de 29 nodos y 2 builds validadas punto a punto, una híbrida) y las 3 habilidades de talento de clase.
 *   · PENDIENTE (etapa 2): Guardián y Cruzado (kit, árbol, builds), los 3 árboles HÉROE y las otras 2 builds
 *     del Berserker. Sus campos quedan como ESQUELETOS VÁLIDOS: árboles vacíos ([]), que el mockup pinta en
 *     gris con «En diseño», y metadatos con la marca ESBOZO (sketch:true). Ver §16 del doc: lo que la etapa 2
 *     debe respetar (verbos ya usados, nombres, ids, huecos de la ranura 2…).
 *
 *   Contrato del formato: data/README-talents-v2.md · Ejemplo aprobado: data/talents-v2-maga.js
 *   Mockup: docs/mockups/skills-ux.html?cls=guerrero&view=talents (abrir como file:///)
 *   Validar: node docs/mockups/data/validar-talentos.mjs guerrero
 *     (en la etapa 1 solo quedan los errores de lo pendiente: árboles del Guardián, del Cruzado y héroe vacíos,
 *      sus kits y builds, y el Paragon de las builds del Berserker; ver §15.3 del doc)
 * ===================================================================================================== */
(function () {
  'use strict';
  const TV2 = window.TV2;
  const { n1 } = TV2;                                   // n1(1.5) → "1,5" (números con coma en los textos)
  const I = id => `talents/guerrero-${id}.webp`;        // icono de nodo: I('berserker-s7') → talents/guerrero-berserker-s7.webp
  const K = id => `icons256/${id}.webp`;                // icono de habilidad usado como icono de nodo
  const pl = (r, uno, muchos) => (r > 1 ? muchos : uno);

  // ============================================================ LIBRO: catálogo del Guerrero
  // kit base (todo Guerrero, Nv1–8) · habilidades que concede un nodo de elección de CLASE (ranura 2) · kit del Berserker (Nv10–15)
  // El Guardián y el Cruzado (etapa 2) añadirán aquí sus 4 habilidades cada uno (spec:'guardian' | spec:'cruzado').
  const CATALOG = [
    // — KIT BASE (todo Guerrero, Nv1–8): un básico, dos principales (cuerpo a cuerpo en cono y a distancia), una movilidad y una defensa —
    { id:'g_tajo', n:'Tajo', cat:'basic', req:1, elem:'physical', coef:1.0, gen:10, s:'Cortas al objetivo y al que está pegado a él (50 %). Te da 10 de Furia, +2 por cada enemigo extra.',
      M:{ n:'Filo Ancho', s:'Salpicadura 50 → 65 % y alcance 2 → 2,5 m.', k:'★add{cleave:+.15, cleaveR:+.5}' },
      A:{ n:'Desgarro', r:'UNI', s:'El objetivo sangra el 60 % del golpe en 3 s; salpicadura 30 %.', k:'hitDot bleed .6/3s · ★add{cleave:−.2}' },
      B:{ n:'Siega', r:'AREA', s:'Barrido de 3 m a todos al 75 %; el principal, al 85 %.', k:'★set{cleave:.75, cleaveR:3} · dmg −15 (absorbe a Embate)' } },
    { id:'g_hendidura', n:'Hendidura', cat:'spender', req:2, elem:'physical', coef:2.9, cost:27, s:'Golpe frontal pesado en un cono de 120° y 4,5 m. Se prepara 0,25 s: la esquiva lo cancela sin gastar Furia.',
      M:{ n:'Arco Amplio', s:'Cono 120 → 150°.', k:'★set{angle:150}' },
      A:{ n:'Rompefilas', r:'UNI', s:'+45 % de daño si golpea a un único enemigo.', k:'★power v_rompefilas (condAdd)' },
      B:{ n:'Grieta', r:'AREA', s:'Deja una grieta 2 s que hace el 40 % por segundo; solo 1 a la vez.', k:'zone · zoneDur 2 · ★add{zoneMax:1}' } },
    { id:'embestida', n:'Embestida', cat:'movement', req:4, elem:'physical', coef:1.2, cd:8, s:'Embistes 7 m hacia la mira y golpeas al llegar (120 % a 1,9 m). Si golpeas, ganas 12 de Furia.',
      M:{ n:'Carga Fiera', s:'Alcance 7 → 9 m y +4 de Furia si golpea.', k:'range +28 · ★add{genOnHit:4}' },
      A:{ n:'Carnero', r:'CTRL', s:'Arrastras a los que encuentras y los aturdes 0,5 s.', k:'★power v_carnero · stun .5' },
      B:{ n:'Doble Carga', r:'MOV', s:'2 cargas (8 s cada una).', k:'★charges 2' } },
    { id:'g_piel', n:'Piel de Hierro', cat:'defense', req:6, elem:'physical', cd:20, s:'Durante 8 s recibes un 40 % menos de daño y no te pueden ralentizar.',
      M:{ n:'Acero Templado', s:'Al activarla te curas el 8 % de la vida.', k:'★power v_temple (onCast g.heal)' },
      A:{ n:'Espinas', r:'AREA', s:'Mientras dura, devuelves el 40 % del daño cuerpo a cuerpo que recibes.', k:'★power v_espinas (onDamaged)' },
      B:{ n:'Inamovible', r:'AGU', s:'Dura 10 s y te vuelve imparable; se recarga en 25 s.', k:'durS 2 · ★set{unstoppable:true} · cdr −25 (antes «Bastión», nombre de la barra del Guardián)' } },
    { id:'g_lanza', n:'Lanza Arrojadiza', cat:'spender', req:8, elem:'physical', coef:1.9, cost:20, s:'Arrojas una lanza que atraviesa a todos en 11 m (190 %). Tu respuesta a voladores y lanzadores.',
      M:{ n:'Punta de Arpón', s:'Los golpeados se ralentizan un 30 % durante 2 s.', k:'slow 2 · slowPct 30' },
      A:{ n:'Arpón', r:'CTRL', s:'El primero que golpea es arrastrado 4 m hacia ti (+30 %).', k:'★pull 4 · ★set{pierce:false} · dmg +30' },
      B:{ n:'Jabalinas', r:'AREA', s:'3 lanzas en abanico al 70 %.', k:'★set{count:3, spread:.25} · dmg −30' } },
    // — habilidades de talento de CLASE (opción A de un nodo de elección; ranura 2; sin forja) —
    { id:'g_t_aliento', n:'Segundo Aliento', cat:'defense', req:21, talent:true, grantBy:'c11', elem:'physical', cd:30, icon:I('clase-c2'), s:'Gastas toda tu Furia y te curas un 1 % de la vida por cada 3 de Furia (100 de Furia: un 33 %).' },
    { id:'grito_guerra', n:'Grito de Guerra', cat:'utility', req:27, talent:true, grantBy:'c17', elem:'physical', cd:20, gen:30, icon:K('grito_guerra'), s:'Ganas 30 de Furia y tu grupo a 15 m hace +10 % de daño durante 8 s.' },
    { id:'g_t_intervencion', n:'Intervención', cat:'utility', req:31, talent:true, grantBy:'c22', elem:'physical', cd:20, icon:I('clase-c3'), s:'Saltas junto a un aliado (o 8 m hacia la mira) y los dos ganan un escudo del 15 % de tu vida durante 6 s.' },
    // — KIT DEL BERSERKER (solo con la especialización; Nv10–15). Verbos: canalizar en marcha · relanzar en una ventana · combo de 3 —
    { id:'g_remolino', n:'Remolino Sangriento', cat:'spec', req:10, spec:'berserker', elem:'physical', coef:0.45, cost:30, cd:6, icon:K('torbellino'),
      s:'Mantén para girar hasta 3 s sin dejar de moverte: golpeas a 2,9 m 4 veces por segundo (45 %) y desangras.',
      M:{ n:'Giro Firme', s:'Mientras giras no te pueden ralentizar.', k:'★set{slowImmune:true}' },
      A:{ n:'Remolino Anclado', r:'UNI', s:'Giras sin moverte: radio 2 m y +60 % de daño.', k:'★set{moveFree:false, radius:2} · dmg +60' },
      B:{ n:'Ciclón', r:'CTRL', s:'Cada giro atrae 1 m a los enemigos a 5 m; −15 % de daño.', k:'★pull 1/tic (r 5) · dmg −15' } },
    { id:'g_salto', n:'Salto Devastador', cat:'movement', req:12, spec:'berserker', elem:'physical', coef:1.5, cd:12,
      s:'Saltas hasta 8 m y golpeas al caer (150 % a 3 m). Si golpeas, puedes volver a saltar en 2 s (hasta 3 saltos).',
      M:{ n:'Caída Pesada', s:'Radio de la caída 3 → 4 m.', k:'radius +33' },
      A:{ n:'Caída Atronadora', r:'CTRL', s:'Un solo salto: al caer atraes 2 m y aturdes 0,75 s a todos.', k:'★set{recast:0} · ★pull 2 · stun .75 (antes «Impacto Sísmico»: nombre de un nodo de la Maga)' },
      B:{ n:'Salto Rasante', r:'MOV', s:'Saltas 12 m, bajo y rápido (0,25 s en el aire); −20 % de daño.', k:'★set{range:12, airT:.25} · dmg −20' } },
    { id:'g_rajar', n:'Rajar', cat:'spender', req:14, spec:'berserker', elem:'physical', coef:1.4, cost:15, icon:I('berserker-s7'),
      s:'Combo de 3: tajo, revés y un golpe descendente (320 %) que se prepara 0,3 s y desangra. Si paras 2,5 s, vuelve al 1.º.',
      M:{ n:'Filo Encadenado', s:'El combo espera 4 s (antes 2,5 s).', k:'★set{comboWin:4}' },
      A:{ n:'Estocada Final', r:'UNI', s:'El 3.er golpe es una estocada de 5 m en línea: +40 % y sin área.', k:'★set{steps[2]:{type:line, range:5, width:1}} · dmg3 +40' },
      B:{ n:'Molino', r:'AREA', s:'Los tres golpes son giros de 2,5 m a tu alrededor; −20 % de daño.', k:'★set{steps:*{type:area, at:self, radius:2.5}} · dmg −20' } },
    { id:'g_u_furia', n:'Furia Inmortal', cat:'ultimate', req:15, spec:'berserker', elem:'physical', cd:60,
      s:'10 s imparable: tu vida no baja del 1 % y tus principales no cuestan Furia. Al acabar, te curas un 20 %.',
      M:{ n:'Sin Freno', s:'Dura 10 → 12 s.', k:'durS 2' },
      A:{ n:'Sed Voraz', r:'AGU', s:'Mientras dura, robas el 8 % del daño como vida; al acabar no te curas.', k:'★power v_sed_voraz (sustain) · endHeal 0' },
      B:{ n:'Frenesí', r:'UNI', s:'+40 % de velocidad de ataque, pero tu vida sí puede bajar del 1 %.', k:'buff aspdPct +40 · ★set{minHpPct:0}' } },
  ];

  // ============================================================ ESPECIALIZACIONES: metadatos, barra, mecánica y pasiva
  const SPECS = {
    berserker: { id:'berserker', name:'Berserker', role:'Daño', mech:'Sed', mechIco:'ui/st_sangrado.webp',
      line:'Furia desatada: cuanto menos vida te queda, más fuerte golpeas.', innate:'+25 % de daño con menos del 40 % de vida', gauge:'sed' },
    // — ETAPA 2: textos del juego actual (talents-guerrero.js); el diseñador de la etapa 2 los rehace —
    guardian: { id:'guardian', name:'Guardián', role:'Tanque', mech:'Bastión', mechIco:'emblems/guardian.webp',
      line:'Muralla viviente: atrae a los enemigos y protege al grupo.', innate:'+15 % de bloqueo, ×3 de amenaza y +5 % de vida', gauge:'bastion', sketch:true },
    cruzado: { id:'cruzado', name:'Cruzado', role:'Apoyo', mech:'Fervor', mechIco:'emblems/cruzado.webp',
      line:'Luz sagrada: castiga a los caídos y sostiene a tus aliados.', innate:'+30 % de curación', gauge:'fervor', sketch:true },
  };
  const SPEC_IDS = ['berserker', 'guardian', 'cruzado'];
  // barra, forja y selección recomendadas de cada especialización (las aplica el cambio de especialización)
  const BASE_BAR = { lmb:'g_tajo', rmb:'g_hendidura', k1:'embestida', k2:'g_piel', k3:null, k4:null };
  const SPEC_BAR = {
    berserker: { bar:{ lmb:'g_tajo', rmb:'g_rajar', k1:'g_salto', k2:'g_piel', k3:'g_remolino', k4:'g_u_furia' }, forge:{ g_tajo:'A', g_remolino:'B' }, sel:'g_rajar' },
    guardian:  { bar:{ ...BASE_BAR, k2:'g_lanza' }, forge:{}, sel:'g_hendidura' },   // etapa 2
    cruzado:   { bar:{ ...BASE_BAR }, forge:{}, sel:'g_hendidura' },                  // etapa 2
  };
  // la mecánica de cada especialización (textos del tooltip; números de js/spec-mechanics.js → gaugeTuning().sed)
  const MECH_TXT = {
    berserker: { n:'Sed', range:'0–100', ico:'ui/st_sangrado.webp', gen:'+1 por cada 1 % de vida que pierdes y +2 por golpe de Sangrado (como mucho 10 por segundo)',
      out:'A 100: Sed Saciada 6 s: +25 % de daño aunque tengas la vida alta. Después vuelve a 0', loss:'−8 por segundo tras 4 s fuera de combate',
      feed:['g_tajo', 'g_remolino', 'g_rajar'], alt:'sed · perHpPct 1 · perBleedTick 2 · bleedPerSec 10 · satedT 6 · decayAfter 4 · decayRate 8 · lowHpPct 40', feedNames:{ g_tajo:'Desgarro' } },
    // — ETAPA 2: textos actuales del juego (js/ui-gauges-guerrero.js) —
    guardian: { n:'Bastión', range:'0–5 cargas', ico:'emblems/guardian.webp', gen:'+1 carga por bloqueo (15 % de bloqueo innato con escudo)',
      out:'Muro de Escudos las gasta: −10 % de daño recibido por carga 8 s (máx. −50 %)', loss:'Una carga cada 6 s sin ganar ninguna', feed:[], alt:'bastion · max 5 · perBlock 1 · decayEvery 6' },
    cruzado: { n:'Fervor', range:'0–3', ico:'emblems/cruzado.webp', gen:'+1 por muerte · +1 cada 3 impactos de Martillo · +1 cada 3 golpes del básico',
      out:'Veredicto Final gasta 3: 200 % del arma en cono; el grupo se cura el 25 % del daño', loss:'No se pierde con el tiempo', feed:[], alt:'fervor · max 3 · perKill 1 · hammerHits 3 · basicHits 3' },
  };
  const SPEC_INNATE_TXT = {
    berserker: { sk:'g_u_furia', n:'Al borde', l:'Con menos del 40 % de vida (o con la Sed Saciada) haces +25 % de daño.', f:'Furia Inmortal te deja quedarte ahí: tu vida no baja del 1 %' },
    guardian: { sk:null, n:'Muralla', l:'+15 % de bloqueo con escudo, ×3 de amenaza y +5 % de vida (texto actual del juego).', f:'Es el tanque: provoca y protege (etapa 2)' },
    cruzado: { sk:null, n:'Luz que sostiene', l:'+30 % de curación (texto actual del juego).', f:'Apoyo con martillo sagrado (etapa 2)' },
  };

  // ============================================================ ÁRBOL DE CLASE (30 nodos · 53 rangos · filas 0–8)
  // Toca el kit base (Tajo, Hendidura, Lanza Arrojadiza, Embestida, Piel de Hierro) y lo genérico (Furia, vida,
  // crítico, golpes con preparación, Sangrado, control). Tres caminos a tres finales de utilidad o ritmo:
  // izquierda = Defensa (Piel de Hierro) · centro = Armas (Furia y principales) · derecha = Movilidad («tu movilidad»:
  // la habilidad de la ranura 1, sea la Embestida del kit base o la de tu especialización; así no hay nodos muertos).
  // Ningún texto nombra una habilidad de especialización (G1). Habilidades de talento: c11A, c17A y c22A (ranura 2).
  const CLS = [
    { id:'c1', n:'Constitución', t:'p', tag:'num', r:0, c:1, max:2, d:r=>`+${6*r} % de vida máxima`, icon:I('clase-c10'), impl:'stats.hpPct · existe' },
    { id:'c2', n:'Fuerza Bruta', t:'p', tag:'num', r:0, c:3, max:2, d:r=>`Todos tus golpes hacen +${6*r} % de daño`, golpes:true, icon:I('clase-c1'), impl:'mod @all dmg · existe' },
    { id:'c3', n:'Avance Implacable', t:'p', tag:'num', r:0, c:5, max:2, d:r=>`Tu habilidad de movilidad se recarga un ${12*r} % más rápido`, movilidad:true, icon:I('clase-c11'), impl:'mod @movement cdr · existe (Embestida 8 → 6 s; Salto Devastador 12 → 9 s)' },
    { id:'c4', n:'Curtido', t:'p', tag:'num', r:1, c:0, max:3, req:['c1'], d:r=>`Piel de Hierro dura ${8+r} s (antes 8 s)`, touch:['g_piel'], icon:I('clase-c4'), impl:'mod g_piel durS · claves' },
    { id:'c5', n:'Tajo: Firme o Voraz', t:'c', tag:'mec', r:1, c:2, max:1, req:['c1','c2'], touch:['g_tajo'], icon:I('clase-c5'), opts:[
      { k:'A', n:'Tajo Firme', d:'Contra élites y jefes, cada Tajo te da 15 de Furia (antes 10)', role:'UNI', impl:'power g_tajo_firme · NUEVO (onHit + gainResource)' },
      { k:'B', n:'Tajo Voraz', d:'Si el Tajo mata, tu siguiente habilidad principal cuesta la mitad de Furia', role:'AREA', impl:'power g_tajo_voraz · NUEVO (onKill + buff spenderCostPct −50)' } ],
      win:'A, contra jefes: con un solo blanco el Tajo no suma enemigos extra y así no te falta Furia. B, contra grupos: cada muerte abarata la siguiente principal' },
    { id:'c6', n:'Principal: Ensañamiento o Sin Cuartel', t:'c', tag:'mec', r:1, c:4, max:1, req:['c2','c3'], touch:['g_hendidura','g_lanza','g_rajar'], icon:I('clase-c13'), opts:[
      { k:'A', n:'Ensañamiento', d:'Tus habilidades principales hacen +25 % al enemigo con más vida de los que golpean', role:'UNI', impl:'power g_ensanamiento · NUEVO (condAdd @spender)' },
      { k:'B', n:'Sin Cuartel', d:'Tus habilidades principales hacen +5 % por cada enemigo que golpean (hasta +25 %)', role:'AREA', impl:'power g_sin_cuartel · NUEVO (modifyResolve por hits del lanzamiento)' } ],
      win:'A, contra jefes: el golpe grande va al que más aguanta. B, contra grupos: con 5 enemigos, +25 % a todas tus principales. Sirve igual a las tres especializaciones' },
    { id:'c7', n:'Marcha Imparable', t:'p', tag:'mec', r:1, c:6, max:1, req:['c3'], d:()=>'Mientras usas tu movilidad y 1 s después eres imparable: nada te aturde ni te frena', movilidad:true, icon:K('embestida'), impl:'mod @movement unstoppable + 1 s · claves' },
    { id:'c8', n:'Determinación', t:'p', tag:'num', r:2, c:1, max:2, req:['c4','c5'], d:r=>`Con más de 50 de Furia, recibes un ${8*r} % menos de daño`, icon:I('clase-c7'), impl:'tv.drHighFury · NUEVO (copia de drHighMana)' },
    { id:'c9', n:'Preparación: Pesada o Sin Pausa', t:'c', tag:'mec', r:2, c:3, max:1, req:['c5','c6'], touch:['g_hendidura','g_rajar'], icon:K('g_hendidura'), opts:[
      { k:'A', n:'Golpe Pesado', d:'Tus golpes con preparación tardan 0,3 s más, hacen +40 % y a los jefes les llenan 15 de Quebranto', role:'UNI', impl:'mod @windup windupAdd .3 · dmg +40 · stagger 15 · claves NUEVAS' },
      { k:'B', n:'Sin Pausa', d:'Tus golpes con preparación tardan la mitad y puedes moverte mientras los preparas', role:'AREA', impl:'mod @windup windupMult .5 · windupMove · claves NUEVAS' } ],
      win:'A, contra jefes: más daño y Quebranto si aguantas la preparación (la esquiva la cancela). B, contra grupos: golpeas antes y sin pararte. Vale para la Hendidura y cualquier golpe que se prepare' },
    { id:'c10', n:'Derribo o Silenciar', t:'c', tag:'mec', r:2, c:5, max:1, req:['c6','c7'], icon:K('g_lanza'), opts:[
      { k:'A', n:'Derribo', d:'Cada 8 s, tu siguiente golpe derriba 1 s (a los jefes no: les llena 20 de Quebranto)', role:'CTRL', impl:'power g_derribo · NUEVO (onCast + applyCC knock)' },
      { k:'B', n:'Silenciar', d:'Cada 10 s, tu siguiente Lanza Arrojadiza corta el hechizo del enemigo y lo deja mudo 3 s', role:'UNI', touch:['g_lanza'], impl:'power g_silenciar · NUEVO (interrupt; +20 de Quebranto a jefes)' } ],
      win:'A, contra grupos que te rodean. B, contra jefes y élites que lanzan hechizos: los cortas a distancia (y les llenas el Quebranto)' },
    { id:'c11', n:'Segundo Aliento o Coraza', t:'c', tag:'mec', r:3, c:0, max:1, req:['c8'], icon:I('clase-c2'), opts:[
      { k:'A', n:'Segundo Aliento', d:'Habilidad (ranura 2): gastas toda tu Furia y te curas un 1 % por cada 3 de Furia. Se recarga en 30 s', role:'AGU', act:'g_t_aliento', impl:'activa g_t_aliento · existe' },
      { k:'B', n:'Coraza de Hierro', d:'Al bajar del 30 % de vida, recibes un 30 % menos de daño durante 5 s. Una vez cada 60 s', role:'AGU', impl:'power g_coraza_hierro · existe' } ],
      win:'A, si eliges cuándo curarte (ocupa la ranura 2): con 100 de Furia, un 33 % de vida. B, siempre activo y sin ocupar ranura' },
    { id:'c12', n:'Furia Creciente', t:'p', tag:'num', r:3, c:2, max:2, req:['c8','c9'], d:r=>`Generas un ${10*r} % más de Furia`, icon:'ui/res_furia.webp', impl:'stats.resGainPct · NUEVO (clave)' },
    { id:'c13', n:'Golpes Precisos', t:'p', tag:'num', r:3, c:4, max:2, req:['c9','c10'], d:r=>`+${5*r} % de probabilidad de crítico`, icon:I('clase-c8'), impl:'stats.crit · existe' },
    { id:'c14', n:'Movilidad: Polvareda o Reparo', t:'c', tag:'mec', r:3, c:6, max:1, req:['c10'], movilidad:true, icon:I('clase-c3'), opts:[
      { k:'A', n:'Polvareda', d:'Al llegar con tu movilidad, ralentizas un 50 % durante 3 s a todos a 3 m', role:'CTRL', impl:'power g_polvareda · NUEVO (afterCast @movement + applyCC slow)' },
      { k:'B', n:'Carga Reparadora', d:'Tu movilidad te cura un 6 % de la vida y te quita las ralentizaciones', role:'AGU', impl:'power g_carga_reparadora · NUEVO (afterCast @movement + g.heal + cleanse)' } ],
      win:'A, para encerrar a la manada o escapar de ella. B, para aguantar peleas largas' },
    { id:'c15', n:'Furia Protectora o Desbordante', t:'c', tag:'mec', r:4, c:1, max:1, req:['c11','c12'], icon:K('g_p_coraza'), opts:[
      { k:'A', n:'Furia Protectora', d:'El 20 % del daño que recibes lo pagas con Furia en vez de vida', role:'AGU', impl:'power g_furia_protectora · NUEVO (④ onDamaged)' },
      { k:'B', n:'Furia Desbordante', d:'Puedes guardar hasta 130 de Furia (antes 100); por encima de 100, haces +10 % de daño', role:'UNI', impl:'stats resMaxAdd 30 + power g_desbordante · NUEVO' } ],
      win:'A, para sobrevivir (+15–20 % de aguante), aunque gastas menos Furia en daño. B, para hacer daño: guardas Furia para las ráfagas' },
    { id:'c16', n:'Filo Dentado o Contundencia', t:'c', tag:'mec', r:4, c:3, max:1, req:['c12','c13'], icon:K('g_p_sed'), opts:[
      { k:'A', n:'Filo Dentado', d:'Tus Sangrados hacen +25 % de daño y duran 1 s más', role:'UNI', impl:'tv.bleedPct 25 + tv.bleedDur 1 · existen' },
      { k:'B', n:'Contundencia', d:'Tus aturdimientos y derribos duran un 50 % más; a los jefes les llenan un 30 % más de Quebranto', role:'CTRL', impl:'tv.ccDurPct 50 + tv.staggerPct 30 · NUEVOS (claves)' } ],
      win:'A, si tu daño sangra (el Tajo con Desgarro y las habilidades que desangran): +25 % a todo ese daño. B, si controlas: más control y más Quebranto. Une el árbol con la forja' },
    { id:'c17', n:'Grito de Guerra o Ira Contenida', t:'c', tag:'mec', r:4, c:5, max:1, req:['c13','c14'], icon:I('clase-c12'), opts:[
      { k:'A', n:'Grito de Guerra', d:'Habilidad (ranura 2): ganas 30 de Furia y tu grupo a 15 m hace +10 % de daño 8 s. Se recarga en 20 s', role:'UNI', act:'grito_guerra', impl:'activa grito_guerra · existe (pasa de base a talento)' },
      { k:'B', n:'Ira Contenida', d:'Cada 20 s, tu siguiente habilidad principal no cuesta Furia y hace +20 %', role:'UNI', impl:'power g_ira_contenida · NUEVO (icd 20 + condAdd)' } ],
      win:'A, en grupo o para abrir una ráfaga (ocupa la ranura 2). B, en solitario y sin ocupar ranura' },
    { id:'c18', n:'Hierro Vivo', t:'p', tag:'num', r:5, c:0, max:2, req:['c15'], d:r=>`Piel de Hierro se recarga en ${20-3*r} s (antes 20 s)`, touch:['g_piel'], icon:K('g_piel'), impl:'mod g_piel cdr · existe' },
    { id:'c19', n:'Temple', t:'p', tag:'mec', r:5, c:2, max:1, req:['c15','c16'], d:()=>'Con Piel de Hierro puesta, cada Tajo te da 3 de Furia más y la alarga 0,25 s (hasta 3 s más)', touch:['g_piel','g_tajo'], icon:K('g_p_fuerza'), hyb:'Defensa + Armas', impl:'power g_temple · NUEVO (onHit + extendBuff)' },
    { id:'c20', n:'Desequilibrio', t:'p', tag:'mec', r:5, c:4, max:1, req:['c16','c17'], d:()=>'Tus críticos ralentizan un 30 % durante 2 s; contra ralentizados, tus principales tienen +10 % de crítico', icon:I('clase-c9'), hyb:'Armas + Control', impl:'power g_desequilibrio · NUEVO (onHit + condCrit)' },
    { id:'c21', n:'Persecución', t:'p', tag:'num', r:5, c:6, max:1, req:['c17'], d:()=>'Tu movilidad hace +50 % de daño a los enemigos ralentizados o aturdidos', movilidad:true, icon:'ui/st_ralentizado.webp', impl:'power g_persecucion · NUEVO (condAdd @movement)' },
    { id:'c22', n:'Intervención o Hermandad', t:'c', tag:'mec', r:6, c:1, max:1, req:['c18','c19'], icon:I('clase-c15'), opts:[
      { k:'A', n:'Intervención', d:'Habilidad (ranura 2): saltas junto a un aliado (o 8 m) y los dos ganan un escudo del 15 % de tu vida. Se recarga en 20 s', role:'AGU', act:'g_t_intervencion', impl:'activa g_t_intervencion · existe (pasa de la 1 a la 2)' },
      { k:'B', n:'Hermandad de Armas', d:'Tú y tus aliados a 15 m ganan +5 % de daño y +8 % de vida; generas un 5 % más de Furia por aliado', role:'AGU', impl:'power g_aura_hermandad · existe' } ],
      win:'A, en grupo: proteges a un aliado y te recolocas (ocupa la ranura 2); en solitario, un segundo salto con escudo. B, siempre activo y sin ocupar ranura' },
    { id:'c23', n:'Ritmo de Combate', t:'p', tag:'mec', r:6, c:3, max:2, req:['c19','c20'], d:r=>`Cada crítico del Tajo recarga ${n1(0.5*r)} s de tu movilidad y de Piel de Hierro`, touch:['g_tajo','embestida','g_salto','g_piel'], icon:I('clase-c6'), impl:'tv.basicCritCdr · NUEVO (copia de dartCritCdr)' },
    { id:'c24', n:'Brazo Veloz', t:'p', tag:'num', r:6, c:5, max:2, req:['c20','c21'], d:r=>`Atacas un ${7*r} % más rápido`, icon:K('g_tajo'), impl:'stats.aspdPct · existe' },
    // penúltimos (fila 7): potentes por sí solos
    { id:'c25', n:'Rencor', t:'p', tag:'mec', r:7, c:0, max:3, req:['c22'], d:r=>`Al acabar Piel de Hierro, devuelves el ${10*r} % del daño que evitó a los enemigos a 4 m`, touch:['g_piel'], icon:'ui/st_escudo.webp', impl:'power g_rencor · NUEVO (cuenta el daño evitado; onBuffEnd)' },
    { id:'c26', n:'Desenfreno', t:'p', tag:'mec', r:7, c:3, max:3, req:['c23'], d:r=>`Si gastas 80 de Furia en 4 s, haces +${4+8*r} % de daño durante 4 s`, icon:I('clase-c14'), impl:'power g_ira_gasto · NUEVO (⑪ onResource; el id g_desenfreno ya es de Sangre Hirviente y sale)' },
    { id:'c27', n:'Rugido de Carga', t:'p', tag:'mec', r:7, c:6, max:3, req:['c24'], d:r=>`Al llegar con tu movilidad, intimidas a los enemigos a 5 m: hacen un ${8*r} % menos de daño durante 4 s`, movilidad:true, icon:K('grito_guerra'), impl:'power g_rugido_carga · NUEVO (e.weakenOutgoing)' },
    // finales (fila 8): el presupuesto alcanza para UNO
    { id:'c28', n:'Inquebrantable', t:'f', tag:'mec', r:8, c:0, max:3, req:['c25'], d:r=>`Piel de Hierro no caduca: dura hasta 5 golpes y vuelve a los 15 s. Con ella, generas un ${10*r} % más de Furia`, touch:['g_piel'], icon:I('clase-c4'), impl:'power g_inquebrantable · NUEVO (cuenta golpes; reactiva)', final:'Defensa' },
    { id:'c29', n:'Señor de la Guerra', t:'f', tag:'mec', r:8, c:3, max:3, req:['c26'], d:r=>`Cada 100 de Furia que gastas, tu siguiente principal golpea dos veces: la copia es gratis y hace el ${20+20*r} %`, icon:I('clase-c14'), impl:'power g_senor_guerra · NUEVO (echo del canal)', final:'Armas' },
    { id:'c30', n:'Asalto Total', t:'f', tag:'mec', r:8, c:6, max:3, req:['c27'], d:r=>`Tras usar tu movilidad, tu siguiente principal no cuesta Furia y hace +${15*r} %; si mata, la movilidad se recarga`, movilidad:true, icon:K('embestida'), impl:'power g_asalto_total · NUEVO (afterCast @movement + onKill resetCd; con movilidades que se relanzan, cuenta el primer uso de la cadena)', final:'Movilidad' },
  ];

  // ============================================================ BERSERKER (29 nodos · 59 rangos · misma rejilla que el Piromante)
  // Izquierda = HEMORRAGIA (Remolino: canalizar en marcha) · centro = VERDUGO (Rajar: combo de 3) · derecha = ESTAMPIDA (Salto: relanzar).
  // Híbridos: (2,2) Hemorragia + Verdugo · (2,4) Verdugo + Estampida · (5,3) los tres (por la Sed).
  const BERSERKER = [
    { id:'b0', n:'Sed de Batalla', t:'k', tag:'mec', r:0, c:3, max:1, free:true, d:()=>'Perder vida y desangrar llenan tu Sed. A 100, Sed Saciada 6 s: +25 % de daño aunque tengas la vida alta', icon:I('berserker-s0'), impl:'mecánica sed + power m_berserk · existen (ya no concede activa: el Remolino está en el libro)' },
    { id:'b1', n:'Heridas Abiertas', t:'p', tag:'num', r:1, c:1, max:3, req:['b0'], d:r=>`Tus Sangrados duran ${3+r} s (antes 3 s)`, sangrado:true, arch:'hemorragia', icon:I('berserker-s3'), impl:'tv.bleedDur · NUEVO (copia de burnDur)' },
    { id:'b2', n:'Instinto Asesino', t:'p', tag:'num', r:1, c:3, max:3, req:['b0'], d:r=>`Rajar tiene +${5*r} % de probabilidad de crítico`, touch:['g_rajar'], arch:'verdugo', icon:I('berserker-s5'), impl:'mod g_rajar crit · claves' },
    { id:'b3', n:'Zancada', t:'p', tag:'num', r:1, c:5, max:3, req:['b0'], d:r=>`El Salto Devastador se recarga en ${n1(12-1.5*r)} s (antes 12 s)`, touch:['g_salto'], arch:'estampida', icon:I('clase-c11'), impl:'mod g_salto cdr · existe' },
    { id:'b4', n:'Sangre Espesa', t:'p', tag:'num', r:2, c:0, max:2, req:['b1'], d:r=>`Tus Sangrados hacen +${15*r} % de daño`, sangrado:true, arch:'hemorragia', icon:'ui/st_sangrado.webp', impl:'tv.bleedPct · existe' },
    { id:'b5', n:'Reabrir', t:'p', tag:'mec', r:2, c:2, max:1, req:['b1','b2'], d:()=>'Cada golpe de Rajar a un enemigo que sangra reinicia su Sangrado y te da 3 de Sed', touch:['g_rajar'], arch:'hemorragia+verdugo', hyb:'Hemorragia + Verdugo', icon:I('berserker-s14'), impl:'power b_reabrir · NUEVO (onHit + replaceDoT + gainGauge)' },
    { id:'b6', n:'Caída Brutal', t:'p', tag:'mec', r:2, c:4, max:1, req:['b2','b3'], d:()=>'Al caer de un Salto Devastador, tu siguiente Rajar empieza por el 3.er golpe', touch:['g_salto','g_rajar'], arch:'verdugo+estampida', hyb:'Verdugo + Estampida', icon:I('berserker-s10'), impl:'power b_caida_brutal · NUEVO (afterCast g_salto → comboStep 3)' },
    { id:'b7', n:'Suelo Roto', t:'p', tag:'mec', r:2, c:6, max:2, req:['b3'], d:r=>`Al caer, el Salto Devastador ralentiza un ${25*r} % durante 2 s a los que golpea`, touch:['g_salto'], arch:'estampida', icon:K('terremoto'), impl:'mod g_salto slow 2 · slowPct · claves' },
    { id:'b8', n:'Contagio o Desangrar', t:'c', tag:'mec', r:3, c:1, max:1, req:['b4','b5'], touch:['g_remolino','g_tajo'], arch:'hemorragia', icon:I('berserker-s6'), opts:[
      { k:'A', n:'Contagio', d:'Cuando muere un enemigo que sangra, su Sangrado pasa a 2 enemigos a 3 m', role:'AREA', impl:'power b_contagio · NUEVO (onKill; lógica de p_propagacion)' },
      { k:'B', n:'Desangrar', d:'Puedes poner hasta 3 Sangrados a la vez en el mismo enemigo', role:'UNI', impl:'power b_desangrar · NUEVO (lógica de p_acumular)' } ],
      win:'A, contra grupos: cada muerte desangra a los siguientes. B, contra jefes: hasta ×2,4 de daño de Sangrado. Decide qué Hemorragia juegas' },
    { id:'b9', n:'Rajar: Onda o Certero', t:'c', tag:'mec', r:3, c:3, max:1, req:['b5','b6'], touch:['g_rajar'], arch:'verdugo', icon:I('berserker-s7'), opts:[
      { k:'A', n:'Onda de Choque', d:'El 3.er golpe de Rajar suelta una onda que hace el 60 % a todos a 4 m', role:'AREA', impl:'power b_onda_choque · NUEVO (afterCast step 3 + dealArea)' },
      { k:'B', n:'Remate Certero', d:'El 3.er golpe de Rajar es crítico seguro y a los jefes les llena 15 de Quebranto', role:'UNI', impl:'power b_remate_certero · NUEVO (onCast forceCrit step 3 + addStagger)' } ],
      win:'A, contra grupos: el remate alcanza a toda la manada. B, contra jefes: un crítico seguro cada 3 golpes y Quebranto. Decide qué Verdugo juegas' },
    { id:'b10', n:'Salto: Cadena o Aplastante', t:'c', tag:'mec', r:3, c:5, max:1, req:['b6','b7'], touch:['g_salto'], arch:'estampida', icon:I('berserker-s9'), opts:[
      { k:'A', n:'Salto en Cadena', d:'Puedes encadenar hasta 5 saltos (antes 3)', role:'AREA', impl:'mod g_salto recastAdd 2 · clave NUEVA' },
      { k:'B', n:'Salto Aplastante', d:'Cada salto seguido sobre el mismo enemigo hace un 40 % más que el anterior (hasta +120 %)', role:'UNI', impl:'power b_salto_aplastante · NUEVO (condAdd por cadena)' } ],
      win:'A, contra grupos: saltas de manada en manada. B, contra jefes: tres caídas cada vez más fuertes sobre el mismo. Decide qué Estampida juegas' },
    { id:'b11', n:'Festín de Sangre', t:'p', tag:'num', r:4, c:0, max:2, req:['b8'], d:r=>`Matar a un enemigo que sangra te cura un ${2*r} % de vida y te da ${4*r} de Furia`, arch:'hemorragia', icon:I('berserker-s8'), impl:'tv.bleedKillHeal + bleedKillMana · existen' },
    { id:'b12', n:'Ritmo de Matanza', t:'p', tag:'mec', r:4, c:2, max:2, req:['b8','b9'], d:r=>`Cada crítico de Rajar acorta ${n1(0.5*r)} s todas tus recargas`, touch:['g_rajar'], arch:'verdugo', icon:I('berserker-s12'), impl:'tv.critCdrAll · NUEVO (como critFireCdr, sobre todas)' },
    { id:'b13', n:'Peso Muerto', t:'p', tag:'num', r:4, c:4, max:2, req:['b9','b10'], d:r=>`El Salto Devastador hace +${20*r} % de daño`, touch:['g_salto'], arch:'estampida', icon:I('berserker-s1'), impl:'mod g_salto dmg · existe' },
    { id:'b14', n:'Impacto Aturdidor', t:'p', tag:'mec', r:4, c:6, max:1, req:['b10'], d:()=>'Quien sobrevive a la caída del Salto queda aturdido 0,5 s; a los jefes les llena 15 de Quebranto', touch:['g_salto'], arch:'estampida', icon:I('berserker-s17'), impl:'mod g_salto stun .5 + stagger 15 · claves' },
    { id:'b15', n:'Negación o Umbral', t:'c', tag:'mec', r:5, c:1, max:1, req:['b11','b12'], touch:['g_u_furia'], icon:I('berserker-s13'), opts:[
      { k:'A', n:'Negación de la Muerte', d:'Un golpe que te mataría te deja con 1 de vida y la Sed llena. Una vez cada 2 min', role:'AGU', impl:'power g_negacion · existe (+ llena la Sed)' },
      { k:'B', n:'Umbral del Dolor', d:'Con menos del 40 % de vida, recibes un 15 % menos de daño', role:'AGU', impl:'tv.drLowHp · NUEVO (clave)' } ],
      win:'A, donde morir cuesta caro (Hardcore, jefes Pináculo): además te deja con la Sed Saciada. B, contra grupos: aguante siempre que juegas al borde' },
    { id:'b16', n:'Sangre Hirviente', t:'p', tag:'mec', r:5, c:3, max:2, req:['b12','b13'], d:r=>`Con más de 50 de Sed, tus golpes, giros y saltos van un ${8*r} % más rápido`, arch:'hemorragia+verdugo+estampida', hyb:'Los tres estilos (por la Sed)', icon:I('berserker-s15'), impl:'power b_sangre_hirviente · NUEVO (stats con gaugeValue)' },
    { id:'b17', n:'Sin Suelo', t:'p', tag:'mec', r:5, c:5, max:2, req:['b13','b14'], d:r=>`Durante Furia Inmortal, el Salto Devastador no se recarga y encadena ${r} salto${r > 1 ? 's' : ''} más`, touch:['g_salto','g_u_furia'], arch:'estampida', icon:K('g_u_furia'), impl:'power b_sin_suelo · NUEVO (modifyResolve con el buff g_u_furia)' },
    { id:'b18', n:'Avidez', t:'p', tag:'mec', r:6, c:0, max:2, req:['b15'], d:r=>`Mientras giras, cada enemigo que empiezas a desangrar te da ${2*r} de Furia`, touch:['g_remolino'], arch:'hemorragia', icon:I('berserker-s4'), impl:'power b_avidez · NUEVO (onHit en el canal)' },
    { id:'b19', n:'Último Trago', t:'p', tag:'mec', r:6, c:2, max:2, req:['b15','b16'], d:r=>`El 3.er golpe de Rajar te da ${5*r} de Sed (el doble contra élites y jefes)`, touch:['g_rajar'], arch:'verdugo', icon:I('berserker-x2'), impl:'power b_ultimo_trago · NUEVO (gainGauge sed)' },
    { id:'b20', n:'Alcance Salvaje', t:'p', tag:'num', r:6, c:4, max:2, req:['b16','b17'], d:r=>`Tus golpes de área cuerpo a cuerpo son un ${15*r} % más grandes`, icon:I('berserker-s11'), impl:'mod @melee radius · existe' },
    { id:'b21', n:'Caída Sangrienta', t:'p', tag:'mec', r:6, c:6, max:1, req:['b17'], d:()=>'El último salto de la cadena desangra a todos los que golpea (el 100 % del golpe en 3 s)', touch:['g_salto'], arch:'estampida', icon:I('berserker-s2'), impl:'power b_caida_sangrienta · NUEVO (afterCast último salto + applyDoT)' },
    { id:'b22', n:'Estallido Rojo', t:'p', tag:'mec', r:7, c:0, max:3, req:['b18'], d:r=>`Al soltar el Remolino, los Sangrados a 4 m estallan: hacen de golpe el ${20+15*r} % de lo que les queda`, touch:['g_remolino'], arch:'hemorragia', icon:I('berserker-s16'), impl:'power b_estallido_rojo · NUEVO (onEnd del canal + consumeDoT)' },
    { id:'b23', n:'Verdugo', t:'p', tag:'mec', r:7, c:3, max:3, req:['b19'], d:r=>`El 3.er golpe de Rajar hace +${3*r} % por cada 10 % de vida que le falta al objetivo`, touch:['g_rajar'], arch:'verdugo', icon:I('berserker-x1'), impl:'power b_verdugo · NUEVO (condAdd por vida que falta)' },
    { id:'b24', n:'Ímpetu', t:'p', tag:'mec', r:7, c:6, max:3, req:['b21'], d:r=>`Cada salto de la cadena te da +${3*r} % de daño durante 8 s (se suma hasta 5 veces)`, touch:['g_salto'], arch:'estampida', icon:K('embestida'), impl:'power b_impetu · NUEVO (addBuff con pilas)' },
    { id:'b25', n:'Danza Carmesí', t:'f', tag:'mec', r:8, c:0, max:3, req:['b22'], d:r=>`El Remolino no se acaba mientras toques a alguien que sangra; tras 3 s, cuesta 8 de Furia por segundo${r > 1 ? `. Sangrados +${15*(r-1)} %` : ''}`, touch:['g_remolino'], arch:'hemorragia', icon:I('berserker-x3'), impl:'power b_danza_carmesi · NUEVO (canal sin fin con drainPerSec)', final:'Hemorragia' },
    { id:'b26', n:'Golpe de Gracia', t:'f', tag:'mec', r:8, c:3, max:3, req:['b23'], d:r=>`El 3.er golpe de Rajar golpea dos veces: el 2.º hace el 60 % y deja al objetivo Vulnerable 4 s${r > 1 ? `. Rajar +${15*(r-1)} %` : ''}`, touch:['g_rajar'], arch:'verdugo', icon:K('g_mandoble'), impl:'power b_golpe_gracia · NUEVO (echo del paso 3 + vuln)', final:'Verdugo' },
    { id:'b27', n:'Estampida Sin Fin', t:'f', tag:'mec', r:8, c:6, max:3, req:['b24'], d:r=>`Al acabar la cadena, si el último salto golpeó a 3 o más, el Salto Devastador se recarga al instante${r > 1 ? `. Salto +${15*(r-1)} %` : ''}`, touch:['g_salto'], arch:'estampida', icon:K('g_salto'), impl:'power b_estampida · NUEVO (onChainEnd + resetCd)', final:'Estampida' },
    { id:'b28', n:'Corazón Indomable', t:'x', tag:'mec', r:9, c:3, max:4, req:['b25','b26','b27'], d:r=>['1) Matar a un élite te da 30 de Sed.', '2) La Sed Saciada dura 9 s (antes 6 s).', '3) Con la Sed Saciada, un golpe que te mataría te deja con 1 de vida (una vez por Sed).', '4) Cada 3 Sed Saciadas, Furia Inmortal se lanza sola 5 s, gratis.'].slice(0, r).join(' '), touch:['g_u_furia'], icon:'emblems/berserker.webp', impl:'power b_corazon_indomable (rangos) · NUEVO' },
  ];

  // ============================================================ PARAGON (árboles héroe): ETAPA 2
  // Tres árboles TEMÁTICOS DE LA CLASE, cada uno compartido por 2 especializaciones (13 nodos: clave gratis,
  // 3 elecciones, capstone). Nombres y temas = PROPUESTA de la etapa 1 (§9 del doc), no vinculante.
  const HERO = [
    { id:'h1', n:'Titán (etapa 2)', specs:['berserker', 'guardian'], art:'ui256/menu_maestria.webp',
      line:'Propuesta, pendiente (etapa 2): peso y sacudidas; tus golpes grandes hacen temblar el suelo y llenan el Quebranto',
      key:'Pendiente (etapa 2)', nodes:[] },
    { id:'h2', n:'Gladiador (etapa 2)', specs:['berserker', 'cruzado'], art:'ui256/menu_tormento.webp',
      line:'Propuesta, pendiente (etapa 2): el duelo; armas arrojadizas y contraataques tras esquivar',
      key:'Pendiente (etapa 2)', nodes:[] },
    { id:'h3', n:'Caudillo (etapa 2)', specs:['guardian', 'cruzado'], art:'ui256/menu_bendiciones.webp',
      line:'Propuesta, pendiente (etapa 2): estandartes y gritos que mandan sobre el grupo',
      key:'Pendiente (etapa 2)', nodes:[] },
  ];

  // ============================================================ BUILDS (rangos EN ORDEN DE COMPRA; «c4_» = rangos tardíos Nv85+)
  // Etapa 1: 2 del Berserker (una híbrida). Etapa 2: las otras 2 del Berserker (Hemorragia y Verdugo con final)
  // y las 4 del Guardián y del Cruzado. El Paragon de estas builds queda vacío hasta que existan los árboles héroe.
  const BUILDS = {
    estampida: { sp:'berserker', n:'Estampida Sin Fin', arch:'Estampida', hero:'h1', heroCh:{}, heroNodes:[],
      cls: { c2:2, c3:2, c6:1, c7:1, c10:1, c14:1, c17:1, c20:1, c24:2, c1:2, c5:1, c9:1, c12:2, c13:2, c16:1, c21:1, c23:2, c27:3, c30:3, c8:2, c4:2 },
      clsCh: { c5:'B', c6:'B', c9:'B', c10:'A', c14:'A', c16:'A', c17:'B' },
      spec: { b3:3, b7:2, b6:1, b10:1, b13:2, b14:1, b17:2, b21:1, b24:3, b27:3, b28:4, b2:3, b9:1, b16:2, b20:2 },
      specCh: { b9:'A', b10:'A' } },
    hibrido: { sp:'berserker', n:'Sangre y Acero', arch:'Híbrido Hemorragia-Verdugo', hero:'h2', heroCh:{}, heroNodes:[],
      cls: { c1:2, c2:2, c5:1, c6:1, c9:1, c12:2, c13:2, c16:1, c19:1, c23:2, c10:1, c17:1, c20:1, c4:1, c8:2, c15:1, c3:2, c26:3, c29:3, c24:2, c4_:2 },
      clsCh: { c5:'A', c6:'A', c9:'A', c10:'B', c15:'B', c16:'A', c17:'B' },
      spec: { b1:3, b2:3, b4:2, b5:1, b8:1, b9:1, b11:2, b12:2, b15:1, b16:2, b18:2, b19:2, b22:3, b23:3, b3:1, b20:2 },
      specCh: { b8:'A', b9:'B', b15:'B' } },
  };

  // ============================================================ REGISTRO
  window.TALENTS_V2_CLASSES = window.TALENTS_V2_CLASSES || {};
  window.TALENTS_V2_CLASSES.guerrero = {
    formato: 1,                       // versión del contrato (TV2.formato)
    estado: 'diseño',                 // etapa 1 de 2: kit base, clase y Berserker diseñados; Guardián, Cruzado y héroe en esqueleto
    id: 'guerrero', name: 'Guerrero', res: 'Furia', resIcon: 'res_furia', color: '#e8634a',
    emblem: 'ui/res_furia.webp',      // icono de la columna de clase y del selector de clase
    clsArt: 'specs/guardian.webp',    // arte de fondo (muy tenue) de la columna de clase
    book: { baseIcon: 'ui/res_furia.webp', baseNote: 'acero, Furia y empuje' },
    specOrder: SPEC_IDS, defaultSpec: 'berserker', specs: SPECS,
    catalog: CATALOG,
    fallbackBar: BASE_BAR,
    specBar: SPEC_BAR,
    // variantes de forja recomendadas (★ en el libro y botón «Recomendado»); guardian/cruzado: etapa 2
    reco: {
      berserker: { g_tajo:'A', g_remolino:'B', g_u_furia:'A' },
    },
    sup: { g_rajar:['amplify','bleed'] },     // engarces iniciales del mockup
    mech: MECH_TXT, innate: SPEC_INNATE_TXT,
    // grupos de habilidades para los nodos que tocan «todo tu X» (flag del nodo: golpes:true, sangrado:true)
    groups: {
      golpes:   { label: 'Toca todos tus golpes', ids: ['g_tajo', 'g_hendidura', 'embestida', 'g_lanza', 'g_remolino', 'g_salto', 'g_rajar'] },
      sangrado: { label: 'Toca todo tu Sangrado', ids: ['g_tajo', 'g_remolino', 'g_rajar', 'g_salto'] },
      movilidad: { label: 'Toca tu habilidad de movilidad (ranura 1)', ids: ['embestida', 'g_salto'] },
    },
    tree: { cls: CLS, spec: { berserker: BERSERKER, guardian: [], cruzado: [] }, hero: HERO },
    builds: BUILDS, defaultBuild: { berserker: 'estampida' },
    // nodos que usan las demos de captura (&demo=spend|choice|hover|rclick|pick|undo|hl|gate|specswap)
    demo: { spend:'b16', choice:'b9', hover:'b9', rclick:'b9', pick:'b10', undo:'b24', hl:'g_rajar', swapTo:'guardian',
      gate: { ranks: { c2:2, c1:2, c3:2, c6:1 }, ch: { c6:'B' }, buy: ['c5', 'A'] } },
  };
  void pl;
})();
