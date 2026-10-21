/* =====================================================================================================
 * Talentos v2 · GUERRERO (Paso 2g, plantilla §17 de docs/paso2g-maga-coherencia.md)
 * -----------------------------------------------------------------------------------------------------
 * DISEÑO COMPLETO (etapas 1 y 2; documento: docs/paso2g-guerrero.md):
 *   · Etapa 1: kit base (5), árbol de CLASE (30 nodos), BERSERKER (kit con forja, pasiva, barra Sed, árbol de 29 nodos)
 *     y las 3 habilidades de talento de clase.
 *   · Etapa 2: GUARDIÁN (tanque · Bastión · verbo principal: plantado y posturas) y CRUZADO (martillo sagrado con apoyo ·
 *     Fervor · verbo principal: cargar y soltar con ventana perfecta), cada uno con kit, pasiva, barra, árbol de 29 nodos
 *     y 4 builds; los 3 árboles HÉROE (Titán, Gladiador, Caudillo; 13 nodos) y las 12 builds con su Paragon.
 *   · Corrección de la etapa 2 (juicio de 3 jueces; documento §19): bucles cerrados (Fervor, Bastión, Guardia Total,
 *     Vanguardia), capas de defensa del Guardián contra los topes, finales que escalan el mecanismo por rango,
 *     Gladiador útil contra jefes, Pendón al 80 % del tiempo y Titán más bajo.
 *   · Decisiones del orquestador (documento §17.2): ventana perfecta de 0,25 s de base (Fe Serena 0,35/0,45 s),
 *     tope propio del Guardián en su pasiva (reducción 65 % y bloqueo 50 %; CAPS globales sin cambios) y textos
 *     de pasivas y barras ≤ 120. Ningún id cambió.
 *   · Rejuicio de balance (ronda 2; documento §20): suelo de las definitivas (70 % de su base), Vítores y Peso Acumulado
 *     acotados, Asalto Total recupera media recarga (cada 6 s), Corazón Indomable 3 cada 60 s, la recarga de Piel de
 *     Hierro empieza al acabar, Inquebrantable por daño evitado, Gladiador acotado en grupos, Liturgia y Ritmo de Matanza
 *     con icd, curas de zona del Cruzado con cubeta, y c11A/c17A/c22A salen con Piel de Hierro al 50 % si no están en la
 *     barra. Ningún id cambió.
 *   · Rejuicio de balance (ronda 3; documento §21): las zonas sagradas no se suman (daño ni cura), Golpe Consagrado deja
 *     2 suelos como mucho, los altares no se suman, el Sendero no baja de 4 s (Vigilia), Estallido de Luz da un estallido
 *     por enemigo y lanzamiento, y Carga Reparadora cura una vez cada 6 s por p.sustain() (en una cadena de saltos, los
 *     efectos de «tu movilidad» cuentan el primer uso). Ningún id cambió.
 *
 *   Contrato del formato: data/README-talents-v2.md · Ejemplo aprobado: data/talents-v2-maga.js
 *   Mockup: docs/mockups/skills-ux.html?cls=guerrero&view=talents (abrir como file:///)
 *   Validar: node docs/mockups/data/validar-talentos.mjs guerrero   (debe quedar en verde)
 * ===================================================================================================== */
(function () {
  'use strict';
  const TV2 = window.TV2;
  const { n1 } = TV2;                                   // n1(1.5) → "1,5" (números con coma en los textos)
  const I = id => `talents/guerrero-${id}.webp`;        // icono de nodo: I('berserker-s7') → talents/guerrero-berserker-s7.webp
  const K = id => `icons256/${id}.webp`;                // icono de habilidad usado como icono de nodo
  const pl = (r, uno, muchos) => (r > 1 ? muchos : uno);

  // ============================================================ LIBRO: catálogo del Guerrero
  // kit base (todo Guerrero, Nv1–8) · habilidades de talento de clase (ranura 2) · kits del Berserker, del Guardián y del
  // Cruzado (Nv10–15) · habilidades de talento de los árboles héroe (ranura 2, opción A de su elección de la fila 2).
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
    { id:'g_piel', n:'Piel de Hierro', cat:'defense', req:6, elem:'physical', cd:20, s:'Durante 8 s recibes un 40 % menos de daño y no te pueden ralentizar. Su recarga empieza al acabar.',
      innate:{ guardian:'Guardián: 12 s y −50 %' },
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
    // — KIT DEL GUARDIÁN (Nv10–15). Verbos: posturas que se alternan (principal) · plantado · avance lento e imparable · provocación —
    { id:'g_guardia', n:'Cambio de Guardia', cat:'spec', req:10, spec:'guardian', elem:'physical', cd:3, icon:I('guardian-s17'),
      s:'Alternas dos posturas: Muralla (−15 % de daño recibido y +10 % de bloqueo) y Ariete (+15 % de daño). Cambiar: 3 s.',
      M:{ n:'Guardia Ligera', s:'Cambiar de postura se recarga en 1,5 s (antes 3 s).', k:'cdr −50' },
      A:{ n:'Guardia Compartida', r:'APO', s:'Tus aliados a 6 m reciben la mitad de tu postura: −8 % de daño recibido o +8 % de daño.', k:'★aura stance 50 % (r 6)' },
      B:{ n:'Guardia Opresiva', r:'CTRL', s:'Tu postura también pesa sobre los enemigos a 5 m: Muralla les quita un 10 % de daño; Ariete los frena un 20 %.', k:'★aura enemigos: weakenOutgoing 10 | slow 20 (r 5)' } },
    { id:'g_carga_escudo', n:'Carga de Escudo', cat:'movement', req:12, spec:'guardian', elem:'physical', coef:1.3, cd:10, icon:I('guardian-s13'),
      s:'Avanzas 8 m despacio e imparable (1 s): arrastras a los que encuentras y, al llegar, te atacan a ti 3 s.',
      M:{ n:'Avance Largo', s:'Avanzas 10 m (antes 8 m) en el mismo tiempo.', k:'range +25' },
      A:{ n:'Arrollador', r:'CTRL', s:'Al llegar derribas 1 s a los arrastrados; a los jefes les llenas 20 de Quebranto.', k:'★knock 1 · stagger 20' },
      B:{ n:'Carga Veloz', r:'MOV', s:'Rápida: 12 m en 0,3 s, sin arrastrar ni provocar.', k:'★set{range:12, dashT:.3, drag:false, taunt:0}' } },
    { id:'terremoto', n:'Terremoto', cat:'spender', req:14, spec:'guardian', elem:'physical', coef:2.2, cost:30,
      s:'Te preparas 0,4 s y golpeas el suelo: 220 % a 5 m. Plantado (1 s sin moverte), suelta 2 réplicas al 50 %.',
      M:{ n:'Suelo Partido', s:'Radio 5 → 6 m.', k:'radius +20' },
      A:{ n:'Martinete', r:'UNI', s:'Golpeas un solo punto a 3 m: radio 2,5 m, +60 % y 20 de Quebranto a los jefes.', k:'★set{at:aim3, radius:2.5} · dmg +60 · stagger 20' },
      B:{ n:'Falla', r:'AREA', s:'El suelo se abre en línea 10 m: −20 % de daño y ralentiza un 40 % durante 2 s.', k:'★set{type:line, range:10, width:2} · dmg −20 · slow 2' } },
    { id:'g_u_ciudadela', n:'Ciudadela', cat:'ultimate', req:15, spec:'guardian', elem:'physical', cd:90, icon:I('guardian-x3'),
      s:'Clavas el escudo 8 s y no te mueves: tú y tus aliados a 6 m reciben −40 %; los enemigos a 10 m te atacan a ti.',
      M:{ n:'Muros Altos', s:'Dura 10 s (antes 8 s).', k:'durS 2' },
      A:{ n:'Ciudadela Andante', r:'MOV', s:'Puedes moverte al 50 % de velocidad; la reducción baja a −25 % (antes −40 %).', k:'★set{root:false, moveSpd:.5} · dr 25' },
      B:{ n:'Empalizada', r:'AREA', s:'Quien te golpea mientras dura recibe el 60 % de tu arma (una vez por segundo).', k:'★power v_empalizada (onDamaged, icd 1)' } },
    // — KIT DEL CRUZADO (Nv10–15). Verbos: cargar y soltar con ventana perfecta (principal) · marcas que se detonan · zonas sagradas —
    { id:'g_juicio', n:'Juicio', cat:'spec', req:10, spec:'cruzado', elem:'holy', coef:1.2, cost:20, cd:8, icon:I('cruzado-s16'),
      s:'Te preparas 0,3 s y lanzas un martillo de luz (120 % a 3 m) que marca 8 s. Tu siguiente principal lo detona: +100 %.',
      M:{ n:'Juicio Amplio', s:'Radio 3 → 4 m.', k:'radius +33' },
      A:{ n:'Sentencia', r:'UNI', s:'Marca a un solo enemigo 12 s: recibe un 15 % más de daño de todo el grupo.', k:'★set{radius:0, single:true, markDur:12} · vulnPct 15' },
      B:{ n:'Tres Juicios', r:'AREA', s:'Arrojas 3 martillos en abanico al 60 %; cada uno marca.', k:'★set{count:3, spread:.3} · dmg −40' } },
    { id:'g_sendero', n:'Sendero de Luz', cat:'movement', req:12, spec:'cruzado', elem:'holy', coef:1.0, cd:10, icon:I('cruzado-s14'),
      s:'Destello de 8 m: dejas 4 s un sendero sagrado que no se suma: daña un 30 % y cura a tus aliados un 2 % por segundo.',
      M:{ n:'Huella de Luz', s:'El sendero dura 6 s (antes 4 s).', k:'zoneDur +2' },
      A:{ n:'Escolta de Luz', r:'APO', s:'Si atraviesas a un aliado, le das un escudo del 12 % de tu vida durante 6 s (una vez cada 6 s por aliado).', k:'★power v_escolta_luz (g.shield al aliado; icd 6 por aliado)' },
      B:{ n:'Destello Doble', r:'MOV', s:'2 cargas (10 s cada una); el sendero dura 2 s.', k:'★charges 2 · zoneDur −2' } },
    { id:'g_martillo', n:'Martillo de Guerra', cat:'spender', req:14, spec:'cruzado', elem:'holy', coef:1.4, cost:25,
      s:'Mantén para cargar (hasta 1,2 s) y suelta: 140 → 380 % a 3–5 m. Ventana perfecta (destello): +25 % y 1 de Fervor.',
      M:{ n:'Mano Ágil', s:'Cargas del todo en 0,9 s (antes 1,2 s); la ventana perfecta se adelanta igual.', k:'chargeT .9 · perfect [.6, .85]' },
      A:{ n:'Martillo Arrojado', r:'UNI', s:'Al soltar, lo lanzas a 12 m contra uno solo: +40 % y sin área; vuelve a tu mano.', k:'★set{type:proj, range:12, radius:0} · dmg +40' },
      B:{ n:'Onda Sagrada', r:'AREA', s:'Al soltar, el golpe sigue en una onda de 8 m hacia delante (60 %).', k:'★add{wave:{range:8, coef:.6}}' } },
    { id:'g_u_cataclismo', n:'Cataclismo', cat:'ultimate', req:15, spec:'cruzado', elem:'holy', coef:5, cd:60,
      s:'Mantén hasta 2 s y suelta: la luz cae en la mira (500 → 1200 % a 6 m) y consagra el suelo 6 s.',
      M:{ n:'Columna Ancha', s:'Radio 6 → 7,5 m.', k:'radius +25' },
      A:{ n:'Rayo del Cielo', r:'UNI', s:'Un rayo estrecho de 2 m: +80 % y 40 de Quebranto a los jefes.', k:'★set{radius:2} · dmg +80 · stagger 40' },
      B:{ n:'Amanecer', r:'APO', s:'−40 % de daño, pero curas un 30 % a tus aliados a 8 m y les das un escudo del 10 %.', k:'★heal 30 (r 8) · shield 10 · dmg −40' } },
    // — habilidades de talento de los ÁRBOLES HÉROE (opción A de la elección de la fila 2; ranura 2; sin forja) —
    { id:'g_h_bramido', n:'Bramido de Titán', cat:'utility', req:72, talent:true, grantBy:'t4', hero:true, elem:'physical', cd:30, icon:K('grito_guerra'),
      s:'Bramas a 6 m: aturdes 1,5 s (a los jefes, 30 de Quebranto) y tu siguiente principal es un Golpe de Titán.' },
    { id:'g_h_desafio', n:'Desafío de Arena', cat:'utility', req:72, talent:true, grantBy:'l4', hero:true, elem:'physical', cd:40, icon:K('g_provocacion'),
      s:'Encierras a tu Rival contigo en un círculo de 6 m durante 8 s: no puede salir y le haces +20 %.' },
    { id:'g_h_estandarte', n:'Estandarte de Guerra', cat:'utility', req:72, talent:true, grantBy:'u4', hero:true, elem:'physical', cd:30, icon:K('g_u_estandarte'),
      s:'Clavas al instante un Pendón en la mira (a 15 m), aparte del que clavas solo cada 15 s.' },
  ];

  // ============================================================ ESPECIALIZACIONES: metadatos, barra, mecánica y pasiva
  const SPECS = {
    berserker: { id:'berserker', name:'Berserker', role:'Daño', mech:'Sed', mechIco:'ui/st_sangrado.webp',
      line:'Furia desatada: cuanto menos vida te queda, más fuerte golpeas.', innate:'+25 % de daño con menos del 40 % de vida', gauge:'sed' },
    guardian: { id:'guardian', name:'Guardián', role:'Tanque', mech:'Bastión', mechIco:'emblems/guardian.webp',
      line:'Muralla viviente: te plantas, alternas posturas, provocas y proteges al grupo.', innate:'Piel de Hierro: 12 s y −50 %; topes 65 y 50 %', gauge:'bastion' },
    cruzado: { id:'cruzado', name:'Cruzado', role:'Apoyo', mech:'Fervor', mechIco:'emblems/cruzado.webp',
      line:'Martillo sagrado: cargas, sueltas en el destello y sostienes al aliado más herido.', innate:'10 % del daño sagrado cura al aliado más herido', gauge:'fervor' },
  };
  const SPEC_IDS = ['berserker', 'guardian', 'cruzado'];
  // barra, forja y selección recomendadas de cada especialización (las aplica el cambio de especialización)
  const BASE_BAR = { lmb:'g_tajo', rmb:'g_hendidura', k1:'embestida', k2:'g_piel', k3:null, k4:null };
  const SPEC_BAR = {
    berserker: { bar:{ lmb:'g_tajo', rmb:'g_rajar', k1:'g_salto', k2:'g_piel', k3:'g_remolino', k4:'g_u_furia' }, forge:{ g_tajo:'A', g_remolino:'B' }, sel:'g_rajar' },
    guardian:  { bar:{ lmb:'g_tajo', rmb:'terremoto', k1:'g_carga_escudo', k2:'g_piel', k3:'g_guardia', k4:'g_u_ciudadela' }, forge:{ g_tajo:'B', g_piel:'B', g_guardia:'A' }, sel:'g_guardia' },
    cruzado:   { bar:{ lmb:'g_tajo', rmb:'g_martillo', k1:'g_sendero', k2:'g_piel', k3:'g_juicio', k4:'g_u_cataclismo' }, forge:{ g_juicio:'B', g_sendero:'A' }, sel:'g_martillo' },
  };
  // la mecánica de cada especialización (textos del tooltip; números de js/spec-mechanics.js → gaugeTuning())
  const MECH_TXT = {
    berserker: { n:'Sed', range:'0–100', ico:'ui/st_sangrado.webp', gen:'+1 por cada 1 % de vida que pierdes y +2 por golpe de Sangrado (como mucho 10 por segundo)',
      out:'A 100: Sed Saciada 6 s: +25 % de daño aunque tengas la vida alta. Después vuelve a 0', loss:'−8 por segundo tras 4 s fuera de combate',
      feed:['g_tajo', 'g_remolino', 'g_rajar'], alt:'sed · perHpPct 1 · perBleedTick 2 · bleedPerSec 10 · satedT 6 · decayAfter 4 · decayRate 8 · lowHpPct 40', feedNames:{ g_tajo:'Desgarro' } },
    // Bastión rehecho (etapa 2): se llena bloqueando y PLANTADO; caminar lo vacía; con 5 cargas, el cambio de postura lo descarga
    guardian: { n:'Bastión', range:'0–5 cargas', ico:'emblems/guardian.webp', gen:'+1 carga por bloqueo y +1 cada 2 s plantado (sin moverte) en combate. Cada carga: −4 % de daño recibido',
      out:'Con 5, cambiar de postura las gasta: a Muralla, escudo del 20 % a ti y al más herido; a Ariete, onda de 300 % a 5 m',
      loss:'Caminando pierdes 1 carga cada 2 s (la Carga de Escudo no la gasta). Tras descargar, 5 s sin llenarse',
      feed:['g_guardia', 'terremoto', 'g_u_ciudadela'], alt:'bastion · max 5 · perBlock 1 · plantedEvery 2 · moveLossEvery 2 · drPerCharge 4 · burstShield 20 · burstCoef 3 · burstStagger 30 · lockAfterBurst 5' },
    // Fervor rehecho (etapa 2): lo dan la ventana perfecta y las detonaciones; a 3, el Martillo sale como Veredicto
    cruzado: { n:'Fervor', range:'0–3', ico:'emblems/cruzado.webp', gen:'+1 por suelta perfecta o detonación de Juicio (como mucho 1 por lanzamiento; Cataclismo perfecto: +3) y +1 cada 3 Tajos',
      out:'A 3, tu siguiente Martillo sale al instante como Veredicto: +50 % y cura un 6 % al más herido. El Veredicto no da Fervor', loss:'No se pierde con el tiempo; fuera de combate, −1 cada 10 s',
      feed:['g_martillo', 'g_juicio', 'g_u_cataclismo', 'g_tajo'], alt:'fervor · max 3 · perPerfect 1 · perDetonate 1 · perCastMax 1 · basicHits 3 · verdictPct 50 · verdictHeal 6 · verdictNoGain · decayOOC 10' },
  };
  const SPEC_INNATE_TXT = {
    berserker: { sk:'g_u_furia', n:'Al borde', l:'Con menos del 40 % de vida (o con la Sed Saciada) haces +25 % de daño.', f:'Furia Inmortal te deja quedarte ahí: tu vida no baja del 1 %' },
    guardian: { sk:'g_piel', n:'Escudo del Guardián', l:'Piel de Hierro: 12 s y −50 % (antes 8 s y 40 %). Solo para ti, la reducción de daño llega al 65 % y el bloqueo al 50 %.', f:'+15 % de bloqueo con escudo y triple amenaza. Con otra especialización, los topes vuelven a 50 y 40 %' },
    cruzado: { sk:'g_martillo', n:'Martillo Piadoso', l:'El 10 % de tu daño sagrado cura al aliado más herido a 15 m (si vas solo, a ti), hasta un 1 % de su vida por segundo.', f:'No es un sanador puro: cura golpeando' },
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
    { id:'c3', n:'Avance Implacable', t:'p', tag:'num', r:0, c:5, max:2, d:r=>`Tu habilidad de movilidad se recarga un ${12*r} % más rápido`, movilidad:true, icon:I('clase-c11'), impl:'mod @movement cdr · existe (Embestida 8 → 6 s; Salto Devastador 12 → 9 s; Carga de Escudo y Sendero de Luz 10 → 7,6 s)' },
    { id:'c4', n:'Curtido', t:'p', tag:'num', r:1, c:0, max:3, req:['c1'], d:r=>`Piel de Hierro dura ${r} s más (8 → ${8+r} s; con el Guardián, 12 → ${12+r} s)`, touch:['g_piel'], icon:I('clase-c4'), impl:'mod g_piel durS · claves' },
    { id:'c5', n:'Tajo: Firme o Voraz', t:'c', tag:'mec', r:1, c:2, max:1, req:['c1','c2'], touch:['g_tajo'], icon:I('clase-c5'), opts:[
      { k:'A', n:'Tajo Firme', d:'Contra élites y jefes, cada Tajo te da 15 de Furia (antes 10)', role:'UNI', impl:'power g_tajo_firme · NUEVO (onHit + gainResource)' },
      { k:'B', n:'Tajo Voraz', d:'Si el Tajo mata, tu siguiente habilidad principal cuesta la mitad de Furia', role:'AREA', impl:'power g_tajo_voraz · NUEVO (onKill + buff spenderCostPct −50)' } ],
      win:'A, contra jefes: con un solo blanco el Tajo no suma enemigos extra y así no te falta Furia. B, contra grupos: cada muerte abarata la siguiente principal' },
    { id:'c6', n:'Principal: Ensañamiento o Sin Cuartel', t:'c', tag:'mec', r:1, c:4, max:1, req:['c2','c3'], touch:['g_hendidura','g_lanza','g_rajar','terremoto','g_martillo'], icon:I('clase-c13'), opts:[
      { k:'A', n:'Ensañamiento', d:'Tus habilidades principales hacen +25 % al enemigo con más vida de los que golpean', role:'UNI', impl:'power g_ensanamiento · NUEVO (condAdd @spender)' },
      { k:'B', n:'Sin Cuartel', d:'Tus habilidades principales hacen +5 % por cada enemigo que golpean (hasta +25 %)', role:'AREA', impl:'power g_sin_cuartel · NUEVO (modifyResolve por hits del lanzamiento)' } ],
      win:'A, contra jefes: el golpe grande va al que más aguanta. B, contra grupos: con 5 enemigos, +25 % a todas tus principales. Sirve igual a las tres especializaciones' },
    { id:'c7', n:'Marcha Imparable', t:'p', tag:'mec', r:1, c:6, max:1, req:['c3'], d:()=>'Mientras usas tu movilidad y 1 s después eres imparable: nada te aturde ni te frena', movilidad:true, icon:K('embestida'), impl:'mod @movement unstoppable + 1 s · claves' },
    { id:'c8', n:'Determinación', t:'p', tag:'num', r:2, c:1, max:2, req:['c4','c5'], d:r=>`Con más de 50 de Furia, recibes un ${8*r} % menos de daño`, icon:I('clase-c7'), impl:'tv.drHighFury · NUEVO (copia de drHighMana)' },
    { id:'c9', n:'Preparación: Pesada o Sin Pausa', t:'c', tag:'mec', r:2, c:3, max:1, req:['c5','c6'], touch:['g_hendidura','g_rajar','terremoto','g_juicio','g_martillo','g_u_cataclismo'], icon:K('g_hendidura'), opts:[
      { k:'A', n:'Golpe Pesado', d:'Tus golpes con preparación tardan 0,3 s más y hacen +40 %; tus sueltas perfectas, +25 %. A los jefes, 15 de Quebranto', role:'UNI', impl:'mod @windup windupAdd .3 · dmg +40 · stagger 15 + mod @charge perfectDmg 25 · stagger 15 · claves NUEVAS (corrección de la etapa 2: c9 también toca las cargas)' },
      { k:'B', n:'Sin Pausa', d:'Tus golpes con preparación tardan la mitad y te mueves al prepararlos sin dejar de estar plantado. Cargar no te frena', role:'AREA', impl:'mod @windup windupMult .5 · windupMove · keepPlanted + mod @charge moveWhileCharging 1 · claves NUEVAS' } ],
      win:'A, contra jefes: más daño y Quebranto si aguantas la preparación o sueltas en el destello. B, contra grupos: golpeas antes y sin pararte, también al cargar' },
    { id:'c10', n:'Derribo o Silenciar', t:'c', tag:'mec', r:2, c:5, max:1, req:['c6','c7'], icon:K('g_lanza'), opts:[
      { k:'A', n:'Derribo', d:'Cada 8 s, tu siguiente golpe derriba 1 s (a los jefes no: les llena 20 de Quebranto)', role:'CTRL', impl:'power g_derribo · NUEVO (onCast + applyCC knock)' },
      { k:'B', n:'Silenciar', d:'Cada 10 s, tu siguiente Lanza Arrojadiza corta el hechizo del enemigo y lo deja mudo 3 s', role:'UNI', touch:['g_lanza'], impl:'power g_silenciar · NUEVO (interrupt; +20 de Quebranto a jefes)' } ],
      win:'A, contra grupos que te rodean. B, contra jefes y élites que lanzan hechizos: los cortas a distancia (y les llenas el Quebranto)' },
    { id:'c11', n:'Segundo Aliento o Coraza', t:'c', tag:'mec', r:3, c:0, max:1, req:['c8'], icon:I('clase-c2'), opts:[
      { k:'A', n:'Segundo Aliento', d:'Habilidad (ranura 2): gastas tu Furia y te curas un 1 % por cada 3. Si no la pones, sale con Piel de Hierro al 50 %', role:'AGU', act:'g_t_aliento', impl:'activa g_t_aliento · existe; si no está en la barra, Piel de Hierro la lanza al 50 % (gasta la mitad de tu Furia y cura 1 % por cada 3 gastados; respeta su recarga de 30 s; esa Furia no cuenta como gastada)' },
      { k:'B', n:'Coraza de Hierro', d:'Al bajar del 30 % de vida, recibes un 30 % menos de daño durante 5 s. Una vez cada 60 s', role:'AGU', impl:'power g_coraza_hierro · existe' } ],
      win:'A: en la ranura 2 eliges cuándo curarte (100 de Furia, un 33 %); sin ponerla, cada Piel de Hierro gasta media Furia y cura la mitad. B, siempre activo (en el Guardián casi no suma: su reducción ya toca el tope)' },
    { id:'c12', n:'Furia Creciente', t:'p', tag:'num', r:3, c:2, max:2, req:['c8','c9'], d:r=>`Generas un ${10*r} % más de Furia`, icon:'ui/res_furia.webp', impl:'stats.resGainPct · NUEVO (clave)' },
    { id:'c13', n:'Golpes Precisos', t:'p', tag:'num', r:3, c:4, max:2, req:['c9','c10'], d:r=>`+${5*r} % de probabilidad de crítico`, icon:I('clase-c8'), impl:'stats.crit · existe' },
    { id:'c14', n:'Movilidad: Polvareda o Reparo', t:'c', tag:'mec', r:3, c:6, max:1, req:['c10'], movilidad:true, icon:I('clase-c3'), opts:[
      { k:'A', n:'Polvareda', d:'Al llegar con tu movilidad, ralentizas un 50 % durante 3 s a todos a 3 m', role:'CTRL', impl:'power g_polvareda · NUEVO (afterCast @movement + applyCC slow; con movilidades que se relanzan, cuenta el primer uso de la cadena)' },
      { k:'B', n:'Carga Reparadora', d:'Tu movilidad te quita las ralentizaciones y te cura un 6 % de la vida (una vez cada 6 s)', role:'AGU', impl:'power g_carga_reparadora · NUEVO (afterCast @movement + cura por p.sustain() + cleanse; icd 6 en la cura; con movilidades que se relanzan, cuenta el primer uso de la cadena; antes g.heal sin icd: ~15 saltos por ciclo en Estampida ≈ 5 %/s fuera de la cubeta)' } ],
      win:'A, para encerrar a la manada o escapar de ella. B, para aguantar peleas largas' },
    { id:'c15', n:'Furia Protectora o Desbordante', t:'c', tag:'mec', r:4, c:1, max:1, req:['c11','c12'], icon:K('g_p_coraza'), opts:[
      { k:'A', n:'Furia Protectora', d:'El 20 % del daño que recibes lo pagas con Furia: 1 de Furia por cada 0,5 % de tu vida', role:'AGU', impl:'power g_furia_protectora · NUEVO (④ onDamaged: 1 de Furia por cada 0,5 % de la vida máxima; sin Furia, pagas con vida; esa Furia no cuenta como gastada para c26, c29 ni t0)' },
      { k:'B', n:'Furia Desbordante', d:'Puedes guardar hasta 130 de Furia (antes 100); por encima de 100, haces +10 % de daño', role:'UNI', impl:'stats resMaxAdd 30 + power g_desbordante · NUEVO' } ],
      win:'A, para sobrevivir (+15–20 % de aguante), aunque gastas menos Furia en daño (y la que pagas así no cuenta como gastada). B, para hacer daño: guardas Furia para las ráfagas' },
    { id:'c16', n:'Filo Dentado o Contundencia', t:'c', tag:'mec', r:4, c:3, max:1, req:['c12','c13'], icon:K('g_p_sed'), opts:[
      { k:'A', n:'Filo Dentado', d:'Tus Sangrados hacen +25 % de daño y duran 1 s más', role:'UNI', impl:'tv.bleedPct 25 + tv.bleedDur 1 · existen' },
      { k:'B', n:'Contundencia', d:'Tus aturdimientos y derribos duran un 50 % más; a los jefes les llenan un 30 % más de Quebranto', role:'CTRL', impl:'tv.ccDurPct 50 + tv.staggerPct 30 · NUEVOS (claves)' } ],
      win:'A, si tu daño sangra (el Tajo con Desgarro y las habilidades que desangran): +25 % a todo ese daño. B, si controlas: más control y más Quebranto. Une el árbol con la forja' },
    { id:'c17', n:'Grito de Guerra o Ira Contenida', t:'c', tag:'mec', r:4, c:5, max:1, req:['c13','c14'], icon:I('clase-c12'), opts:[
      { k:'A', n:'Grito de Guerra', d:'Habilidad (ranura 2): +30 de Furia y +10 % de daño al grupo 8 s. Si no la pones, sale con Piel de Hierro al 50 %', role:'UNI', act:'grito_guerra', impl:'activa grito_guerra · existe (pasa de base a talento); si no está en la barra, Piel de Hierro la lanza al 50 % (+15 de Furia y +5 % al grupo a 15 m 8 s; respeta su recarga de 20 s)' },
      { k:'B', n:'Ira Contenida', d:'Cada 20 s, tu siguiente habilidad principal no cuesta Furia y hace +20 %', role:'UNI', impl:'power g_ira_contenida · NUEVO (icd 20 + condAdd)' } ],
      win:'A: en la ranura 2 abre una ráfaga de grupo; sin ponerla, cada Piel de Hierro te da 15 de Furia y +5 % al grupo. B, en solitario: más daño propio y sin ocupar ranura' },
    { id:'c18', n:'Hierro Vivo', t:'p', tag:'num', r:5, c:0, max:2, req:['c15'], d:r=>`Piel de Hierro se recarga en ${20-3*r} s (antes 20 s)`, touch:['g_piel'], icon:K('g_piel'), impl:'mod g_piel cdr · existe' },
    { id:'c19', n:'Temple', t:'p', tag:'mec', r:5, c:2, max:1, req:['c15','c16'], d:()=>'Con Piel de Hierro puesta, cada Tajo te da 3 de Furia más y la alarga 0,25 s (hasta 3 s más)', touch:['g_piel','g_tajo'], icon:K('g_p_fuerza'), hyb:'Defensa + Armas', impl:'power g_temple · NUEVO (onHit + extendBuff)' },
    { id:'c20', n:'Desequilibrio', t:'p', tag:'mec', r:5, c:4, max:1, req:['c16','c17'], d:()=>'Tus críticos ralentizan un 30 % durante 2 s; contra ralentizados, tus principales tienen +10 % de crítico', icon:I('clase-c9'), hyb:'Armas + Control', impl:'power g_desequilibrio · NUEVO (onHit + condCrit)' },
    { id:'c21', n:'Persecución', t:'p', tag:'num', r:5, c:6, max:1, req:['c17'], d:()=>'Tu movilidad hace +50 % de daño a los enemigos ralentizados o aturdidos', movilidad:true, icon:'ui/st_ralentizado.webp', impl:'power g_persecucion · NUEVO (condAdd @movement; vale en cada salto de la cadena: es el daño del golpe, como Peso Muerto, no un efecto al llegar)' },
    { id:'c22', n:'Intervención o Hermandad', t:'c', tag:'mec', r:6, c:1, max:1, req:['c18','c19'], icon:I('clase-c15'), opts:[
      { k:'A', n:'Intervención', d:'Habilidad (ranura 2): saltas a un aliado: escudo del 15 % a los dos. Si no la pones, sale con Piel de Hierro al 50 %', role:'AGU', act:'g_t_intervencion', impl:'activa g_t_intervencion · existe (pasa de la 1 a la 2); si no está en la barra, Piel de Hierro la lanza al 50 % (sin salto: escudo del 8 % de tu vida a ti y al aliado más cercano; respeta su recarga de 20 s)' },
      { k:'B', n:'Hermandad de Armas', d:'Tú y tus aliados a 15 m ganan +5 % de daño y +8 % de vida; generas un 5 % más de Furia por aliado', role:'AGU', impl:'power g_aura_hermandad · existe' } ],
      win:'A: en la ranura 2 saltas a proteger a un aliado; sin ponerla, cada Piel de Hierro da un escudo del 8 % a ti y al aliado más cercano. B, siempre activo y sin ocupar ranura' },
    { id:'c23', n:'Ritmo de Combate', t:'p', tag:'mec', r:6, c:3, max:2, req:['c19','c20'], d:r=>`Cada crítico del Tajo recarga ${n1(0.5*r)} s de tu movilidad y de Piel de Hierro`, touch:['g_tajo','embestida','g_salto','g_carga_escudo','g_sendero','g_piel'], icon:I('clase-c6'), impl:'tv.basicCritCdr · NUEVO (copia de dartCritCdr)' },
    { id:'c24', n:'Brazo Veloz', t:'p', tag:'num', r:6, c:5, max:2, req:['c20','c21'], d:r=>`Atacas un ${7*r} % más rápido`, icon:K('g_tajo'), impl:'stats.aspdPct · existe' },
    // penúltimos (fila 7): potentes por sí solos
    { id:'c25', n:'Rencor', t:'p', tag:'mec', r:7, c:0, max:3, req:['c22'], d:r=>`Al acabar Piel de Hierro, devuelves el ${10*r} % del daño que evitó a los enemigos a 4 m`, touch:['g_piel'], icon:'ui/st_escudo.webp', impl:'power g_rencor · NUEVO (cuenta el daño evitado; onBuffEnd)' },
    { id:'c26', n:'Desenfreno', t:'p', tag:'mec', r:7, c:3, max:3, req:['c23'], d:r=>`Si gastas 80 de Furia en 4 s, haces +${4+8*r} % de daño durante 4 s`, icon:I('clase-c14'), impl:'power g_ira_gasto · NUEVO (⑪ onResource; solo cuenta la Furia pagada por habilidades: no cuentan Furia Protectora, Segundo Aliento ni el drenaje de Danza Carmesí; el id g_desenfreno ya es de Sangre Hirviente y sale)' },
    { id:'c27', n:'Rugido de Carga', t:'p', tag:'mec', r:7, c:6, max:3, req:['c24'], d:r=>`Al llegar con tu movilidad, intimidas a los enemigos a 5 m: hacen un ${8*r} % menos de daño durante 4 s`, movilidad:true, icon:K('grito_guerra'), impl:'power g_rugido_carga · NUEVO (e.weakenOutgoing; con movilidades que se relanzan, cuenta el primer uso de la cadena)' },
    // finales (fila 8): el presupuesto alcanza para UNO
    { id:'c28', n:'Inquebrantable', t:'f', tag:'mec', r:8, c:0, max:3, req:['c25'], d:r=>`Piel de Hierro dura hasta que evita daño por un ${25+15*r} % de tu vida; vuelve en 15 s. Con ella, generas un ${10*r} % más de Furia`, touch:['g_piel'], icon:I('clase-c4'), impl:'power g_inquebrantable · NUEVO (presupuesto de daño evitado: 40/55/70 % de la vida máxima; sin caducidad por tiempo; la recarga de 15 s empieza al romperse; el mecanismo escala por rango; antes 3/4/5 golpes, que una manada rompía en ~1 s)', final:'Defensa' },
    { id:'c29', n:'Señor de la Guerra', t:'f', tag:'mec', r:8, c:3, max:3, req:['c26'], d:r=>`Cada 100 de Furia gastada, tu siguiente principal sale dos veces: la copia, gratis y al ${20+20*r} %, no activa otros efectos`, icon:I('clase-c14'), impl:'power g_senor_guerra · NUEVO (echo del canal; solo cuenta la Furia pagada por habilidades: no cuentan Furia Protectora, Segundo Aliento ni el drenaje de Danza Carmesí; con cargar y soltar, la copia sale con la misma carga; la copia es echo:true: no cuenta como suelta perfecta ni como lanzamiento, no da Fervor, no gasta el Golpe de Titán ni suma al 3.er Terremoto de Montaña Viva)', final:'Armas' },
    { id:'c30', n:'Asalto Total', t:'f', tag:'mec', r:8, c:6, max:3, req:['c27'], d:r=>`Tras tu movilidad, la siguiente principal es gratis y +${15*r} %; si mata, tu movilidad recupera media recarga (cada 6 s)`, movilidad:true, icon:K('embestida'), impl:'power g_asalto_total · NUEVO (afterCast @movement + onKill cdReduce del 50 % de la recarga restante, icd 6; antes resetCd sin tope; respeta el suelo de 4 s de d17 y el del Sendero (z21) y cuenta como recarga «seguida» de b27; con movilidades que se relanzan, cuenta el primer uso de la cadena, como c14 y c27)', final:'Movilidad' },
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
    { id:'b5', n:'Reabrir', t:'p', tag:'mec', r:2, c:2, max:1, req:['b1','b2'], d:()=>'Cada golpe de Rajar a un enemigo que sangra reinicia su Sangrado y te da 3 de Sed', touch:['g_rajar'], arch:'hemorragia+verdugo', hyb:'Hemorragia + Verdugo', icon:I('berserker-s14'), impl:'power g_b_reabrir · NUEVO (onHit + replaceDoT + gainGauge)' },
    { id:'b6', n:'Caída Brutal', t:'p', tag:'mec', r:2, c:4, max:1, req:['b2','b3'], d:()=>'Al caer de un Salto Devastador, tu siguiente Rajar empieza por el 3.er golpe', touch:['g_salto','g_rajar'], arch:'verdugo+estampida', hyb:'Verdugo + Estampida', icon:I('berserker-s10'), impl:'power g_b_caida_brutal · NUEVO (afterCast g_salto → comboStep 3)' },
    { id:'b7', n:'Suelo Roto', t:'p', tag:'mec', r:2, c:6, max:2, req:['b3'], d:r=>`Al caer, el Salto Devastador ralentiza un ${25*r} % durante 2 s a los que golpea`, touch:['g_salto'], arch:'estampida', icon:K('terremoto'), impl:'mod g_salto slow 2 · slowPct · claves' },
    { id:'b8', n:'Contagio o Desangrar', t:'c', tag:'mec', r:3, c:1, max:1, req:['b4','b5'], touch:['g_remolino','g_tajo'], arch:'hemorragia', icon:I('berserker-s6'), opts:[
      { k:'A', n:'Contagio', d:'Cuando muere un enemigo que sangra, su Sangrado pasa a 2 enemigos a 3 m', role:'AREA', impl:'power g_b_contagio · NUEVO (onKill; lógica de p_propagacion)' },
      { k:'B', n:'Desangrar', d:'Puedes poner hasta 3 Sangrados a la vez en el mismo enemigo', role:'UNI', impl:'power g_b_desangrar · NUEVO (lógica de p_acumular)' } ],
      win:'A, contra grupos: cada muerte desangra a los siguientes. B, contra jefes: hasta ×2,4 de daño de Sangrado. Decide qué Hemorragia juegas' },
    { id:'b9', n:'Rajar: Onda o Certero', t:'c', tag:'mec', r:3, c:3, max:1, req:['b5','b6'], touch:['g_rajar'], arch:'verdugo', icon:I('berserker-s7'), opts:[
      { k:'A', n:'Onda de Choque', d:'El 3.er golpe de Rajar suelta una onda que hace el 60 % a todos a 4 m', role:'AREA', impl:'power g_b_onda_choque · NUEVO (afterCast step 3 + dealArea)' },
      { k:'B', n:'Remate Certero', d:'El 3.er golpe de Rajar es crítico seguro y a los jefes les llena 15 de Quebranto', role:'UNI', impl:'power g_b_remate_certero · NUEVO (onCast forceCrit step 3 + addStagger)' } ],
      win:'A, contra grupos: el remate alcanza a toda la manada. B, contra jefes: un crítico seguro cada 3 golpes y Quebranto. Decide qué Verdugo juegas' },
    { id:'b10', n:'Salto: Cadena o Aplastante', t:'c', tag:'mec', r:3, c:5, max:1, req:['b6','b7'], touch:['g_salto'], arch:'estampida', icon:I('berserker-s9'), opts:[
      { k:'A', n:'Salto en Cadena', d:'Puedes encadenar hasta 5 saltos (antes 3)', role:'AREA', impl:'mod g_salto recastAdd 2 · clave NUEVA' },
      { k:'B', n:'Salto Aplastante', d:'Cada salto seguido sobre el mismo enemigo hace un 40 % más que el anterior (hasta +120 %)', role:'UNI', impl:'power g_b_salto_aplastante · NUEVO (condAdd por cadena)' } ],
      win:'A, contra grupos: saltas de manada en manada. B, contra jefes: tres caídas cada vez más fuertes sobre el mismo. Decide qué Estampida juegas' },
    { id:'b11', n:'Festín de Sangre', t:'p', tag:'num', r:4, c:0, max:2, req:['b8'], d:r=>`Matar a un enemigo que sangra te cura un ${2*r} % de vida y te da ${4*r} de Furia`, arch:'hemorragia', icon:I('berserker-s8'), impl:'tv.bleedKillHeal + bleedKillMana · existen' },
    { id:'b12', n:'Ritmo de Matanza', t:'p', tag:'mec', r:4, c:2, max:2, req:['b8','b9'], d:r=>`Cada crítico de Rajar acorta ${n1(0.5*r)} s tus recargas, salvo la definitiva y Piel de Hierro (una vez cada 1,5 s)`, touch:['g_rajar'], arch:'verdugo', icon:I('berserker-s12'), impl:'tv.critCdrAll · NUEVO (como critFireCdr, sobre todas menos @ultimate y g_piel; icd 1,5: ≤ 0,67 s/s)' },
    { id:'b13', n:'Peso Muerto', t:'p', tag:'num', r:4, c:4, max:2, req:['b9','b10'], d:r=>`El Salto Devastador hace +${20*r} % de daño`, touch:['g_salto'], arch:'estampida', icon:I('berserker-s1'), impl:'mod g_salto dmg · existe' },
    { id:'b14', n:'Impacto Aturdidor', t:'p', tag:'mec', r:4, c:6, max:1, req:['b10'], d:()=>'Quien sobrevive a la caída del Salto queda aturdido 0,5 s (cada enemigo, una vez cada 4 s); a los jefes, 15 de Quebranto', touch:['g_salto'], arch:'estampida', icon:I('berserker-s17'), impl:'mod g_salto stun .5 + stagger 15 · claves; icd 4 por enemigo (además de los rendimientos decrecientes de applyCC)' },
    { id:'b15', n:'Negación o Umbral', t:'c', tag:'mec', r:5, c:1, max:1, req:['b11','b12'], touch:['g_u_furia'], icon:I('berserker-s13'), opts:[
      { k:'A', n:'Negación de la Muerte', d:'Un golpe que te mataría te deja con 1 de vida y la Sed en 50. Una vez cada 2 min', role:'AGU', impl:'power g_negacion · existe (+ deja la Sed en 50: no la llena, para no encadenar con la salvación de Corazón Indomable 3)' },
      { k:'B', n:'Umbral del Dolor', d:'Con menos del 40 % de vida, recibes un 15 % menos de daño', role:'AGU', impl:'tv.drLowHp · NUEVO (clave)' } ],
      win:'A, donde morir cuesta caro (Hardcore, jefes Pináculo): además te deja con media Sed. B, contra grupos: aguante siempre que juegas al borde' },
    { id:'b16', n:'Sangre Hirviente', t:'p', tag:'mec', r:5, c:3, max:2, req:['b12','b13'], d:r=>`Con más de 50 de Sed, tus golpes, giros y saltos van un ${8*r} % más rápido`, arch:'hemorragia+verdugo+estampida', hyb:'Los tres estilos (por la Sed)', icon:I('berserker-s15'), impl:'power g_b_sangre_hirviente · NUEVO (stats con gaugeValue)' },
    { id:'b17', n:'Sin Suelo', t:'p', tag:'mec', r:5, c:5, max:2, req:['b13','b14'], d:r=>`Durante Furia Inmortal, el Salto Devastador no se recarga y encadena ${r} salto${r > 1 ? 's' : ''} más`, touch:['g_salto','g_u_furia'], arch:'estampida', icon:K('g_u_furia'), impl:'power g_b_sin_suelo · NUEVO (modifyResolve con el buff g_u_furia)' },
    { id:'b18', n:'Avidez', t:'p', tag:'mec', r:6, c:0, max:2, req:['b15'], d:r=>`Mientras giras, cada enemigo que empiezas a desangrar te da ${2*r} de Furia`, touch:['g_remolino'], arch:'hemorragia', icon:I('berserker-s4'), impl:'power g_b_avidez · NUEVO (onHit en el canal)' },
    { id:'b19', n:'Último Trago', t:'p', tag:'mec', r:6, c:2, max:2, req:['b15','b16'], d:r=>`El 3.er golpe de Rajar te da ${5*r} de Sed (el doble contra élites y jefes)`, touch:['g_rajar'], arch:'verdugo', icon:I('berserker-x2'), impl:'power g_b_ultimo_trago · NUEVO (gainGauge sed)' },
    { id:'b20', n:'Alcance Salvaje', t:'p', tag:'num', r:6, c:4, max:2, req:['b16','b17'], d:r=>`Tus golpes de área cuerpo a cuerpo son un ${15*r} % más grandes`, icon:I('berserker-s11'), impl:'mod @melee radius · existe' },
    { id:'b21', n:'Caída Sangrienta', t:'p', tag:'mec', r:6, c:6, max:1, req:['b17'], d:()=>'El último salto de la cadena desangra a todos los que golpea (el 100 % del golpe en 3 s)', touch:['g_salto'], arch:'estampida', icon:I('berserker-s2'), impl:'power g_b_caida_sangrienta · NUEVO (afterCast último salto + applyDoT)' },
    { id:'b22', n:'Estallido Rojo', t:'p', tag:'mec', r:7, c:0, max:3, req:['b18'], d:r=>`Al soltar el Remolino, los Sangrados a 4 m estallan: hacen de golpe el ${20+15*r} % de lo que les queda`, touch:['g_remolino'], arch:'hemorragia', icon:I('berserker-s16'), impl:'power g_b_estallido_rojo · NUEVO (onEnd del canal + consumeDoT)' },
    { id:'b23', n:'Verdugo', t:'p', tag:'mec', r:7, c:3, max:3, req:['b19'], d:r=>`El 3.er golpe de Rajar hace +${3*r} % por cada 10 % de vida que le falta al objetivo`, touch:['g_rajar'], arch:'verdugo', icon:I('berserker-x1'), impl:'power g_b_verdugo · NUEVO (condAdd por vida que falta)' },
    { id:'b24', n:'Ímpetu', t:'p', tag:'mec', r:7, c:6, max:3, req:['b21'], d:r=>`Cada salto de la cadena te da +${3*r} % de daño durante 8 s (se suma hasta 5 veces)`, touch:['g_salto'], arch:'estampida', icon:K('embestida'), impl:'power g_b_impetu · NUEVO (addBuff con pilas)' },
    { id:'b25', n:'Danza Carmesí', t:'f', tag:'mec', r:8, c:0, max:3, req:['b22'], d:r=>`El Remolino sigue mientras toques a alguien que sangra (hasta ${[6,10,20][r-1]} s), a 8 de Furia por segundo tras 3 s${r > 1 ? `. Sangrados +${15*(r-1)} %` : ''}`, touch:['g_remolino'], arch:'hemorragia', icon:I('berserker-x3'), impl:'power g_b_danza_carmesi · NUEVO (canal con drainPerSec y tope por rango: 6/10/20 s)', final:'Hemorragia' },
    { id:'b26', n:'Golpe de Gracia', t:'f', tag:'mec', r:8, c:3, max:3, req:['b23'], d:r=>`El 3.er golpe de Rajar golpea dos veces: el 2.º hace el ${[30,45,60][r-1]} % y deja al objetivo Vulnerable ${n1([1,2.5,4][r-1])} s${r > 1 ? `. Rajar +${15*(r-1)} %` : ''}`, touch:['g_rajar'], arch:'verdugo', icon:K('g_mandoble'), impl:'power g_b_golpe_gracia · NUEVO (echo del paso 3 al 30/45/60 % + vuln 1/2,5/4 s: con un 3.er golpe cada ~2,7 s, Vulnerable el 37/93/100 % del tiempo)', final:'Verdugo' },
    { id:'b27', n:'Estampida Sin Fin', t:'f', tag:'mec', r:8, c:6, max:3, req:['b24'], d:r=>`Si el último salto de la cadena golpea a 3 o más, el Salto ${['recupera 4 s de recarga', 'recupera 8 s de recarga', 'se recarga al instante'][r-1]} (como mucho 2 seguidas)${r > 1 ? `. Salto +${15*(r-1)} %` : ''}`, touch:['g_salto'], arch:'estampida', icon:K('g_salto'), impl:'power g_b_estampida · NUEVO (onChainEnd + cdReduce 4/8 s o resetCd; como mucho 2 reinicios seguidos: la 3.ª cadena espera la recarga normal; cuentan también los de otros poderes: la media recarga de Asalto Total es una «seguida»)', final:'Estampida' },
    { id:'b28', n:'Corazón Indomable', t:'x', tag:'mec', r:9, c:3, max:4, req:['b25','b26','b27'], d:r=>['1) Matar a un élite te da 30 de Sed.', '2) La Sed Saciada dura 9 s (antes 6 s).', '3) Con la Sed Saciada, un golpe que te mataría te deja con 1 de vida (como mucho una vez cada 60 s).', '4) Cada 3 Sed Saciadas, Furia Inmortal se lanza sola 5 s, gratis (como mucho una vez cada 90 s).'].slice(0, r).join(' '), touch:['g_u_furia'], icon:'emblems/berserker.webp', impl:'power g_b_corazon_indomable (rangos) · NUEVO (rango 3: icd 60, antes una vez por Sed; rango 4: icd 90)' },
  ];

  // ============================================================ GUARDIÁN (29 nodos · 59 rangos · misma rejilla)
  // Izquierda = GUARDIA (Cambio de Guardia: posturas que se alternan) · centro = SISMO (Terremoto: plantado, réplicas, Quebranto)
  // · derecha = VANGUARDIA (Carga de Escudo: avance lento e imparable que arrastra y provoca).
  // Híbridos: (2,2) Guardia + Sismo · (2,4) Sismo + Vanguardia · (5,3) los tres (por el Bastión). Ápice: Inexpugnable.
  const GUARDIAN = [
    { id:'d0', n:'Pie Firme', t:'k', tag:'mec', r:0, c:3, max:1, free:true, d:()=>'Bloquear y quedarte plantado llenan tu Bastión (5 cargas): cada carga te quita un 4 % del daño que recibes', icon:I('guardian-s0'), impl:'mecánica bastion rehecha (plantedEvery 2, moveLossEvery 2, drPerCharge 4, descarga al cambiar de postura) · NUEVO; m_aegis sale' },
    { id:'d1', n:'Escudo Alzado', t:'p', tag:'num', r:1, c:1, max:3, req:['d0'], d:r=>`Tus bloqueos paran un ${50+10*r} % del golpe (antes 50 %)`, arch:'guardia', icon:I('guardian-s9'), impl:'stats.blockPower · NUEVO (combat-math: BLOCK_REDUCTION + blockPower/100; antes +15 % de bloqueo, que chocaba con CAPS.block)' },
    { id:'d2', n:'Puño Telúrico', t:'p', tag:'num', r:1, c:3, max:3, req:['d0'], d:r=>`El Terremoto hace +${10*r} % de daño`, touch:['terremoto'], arch:'sismo', icon:I('guardian-s7'), impl:'mod terremoto dmg · existe' },
    { id:'d3', n:'Paso Pesado', t:'p', tag:'num', r:1, c:5, max:3, req:['d0'], d:r=>`La Carga de Escudo se recarga en ${10-r} s (antes 10 s)`, touch:['g_carga_escudo'], arch:'vanguardia', icon:I('guardian-s13'), impl:'mod g_carga_escudo cdr · existe' },
    { id:'d4', n:'Contragolpe', t:'p', tag:'mec', r:2, c:0, max:2, req:['d1'], d:r=>`Al bloquear, devuelves un golpe de escudo del ${40*r} % (una vez por segundo)`, arch:'guardia', icon:I('guardian-s3'), impl:'power g_d_contragolpe · NUEVO (④ onDamaged blocked, icd 1)' },
    { id:'d5', n:'Echar Raíces', t:'p', tag:'mec', r:2, c:2, max:1, req:['d1','d2'], d:()=>'En Muralla, cada Terremoto te da 1 carga de Bastión (2 si golpea a 3 o más)', touch:['terremoto','g_guardia'], arch:'guardia+sismo', hyb:'Guardia + Sismo', icon:I('guardian-s17'), impl:'power g_d_raices · NUEVO (afterCast + gainGauge)' },
    { id:'d6', n:'Pisotón', t:'p', tag:'mec', r:2, c:4, max:1, req:['d2','d3'], d:()=>'Tras la Carga de Escudo, tu siguiente Terremoto no se prepara y cuenta como plantado (sin el bonus de Asalto Total)', touch:['g_carga_escudo','terremoto'], arch:'sismo+vanguardia', hyb:'Sismo + Vanguardia', icon:I('guardian-s10'), impl:'power g_d_pisoton · NUEVO (afterCast → windup 0 + planted; si ese Terremoto lleva Asalto Total, sale gratis pero sin su +%)' },
    { id:'d7', n:'Mirada Desafiante', t:'p', tag:'num', r:2, c:6, max:2, req:['d3'], d:r=>`Los que provoca la Carga de Escudo te atacan ${3+r} s (antes 3 s)`, touch:['g_carga_escudo'], arch:'vanguardia', icon:I('guardian-s4'), impl:'mod g_carga_escudo tauntDur · claves (g.forceTarget)' },
    { id:'d8', n:'Cambio: Barrido o Certero', t:'c', tag:'mec', r:3, c:1, max:1, req:['d4','d5'], touch:['g_guardia'], arch:'guardia', icon:I('guardian-s6'), opts:[
      { k:'A', n:'Barrido de Escudo', d:'Al cambiar de postura, golpeas con el escudo a todos a 4 m (120 %) y los provocas 2 s (una vez cada 3 s)', role:'AREA', impl:'power g_d_barrido · NUEVO (afterCast g_guardia + dealArea + forceTarget; icd 3)' },
      { k:'B', n:'Cambio Certero', d:'Al cambiar de postura, tu siguiente golpe es crítico seguro; contra un jefe Quebrantado, además hace +30 %', role:'UNI', impl:'power g_d_cambio_certero · NUEVO (afterCast g_guardia → forceCrit; condAdd 30 contra Quebrantados; ya no llena Quebranto)' } ],
      win:'A, contra grupos: cada cambio es un golpe en área que además provoca. B, contra jefes: un crítico en cada cambio, más fuerte con el jefe Quebrantado. Decide qué Guardia juegas' },
    { id:'d9', n:'Terremoto: Réplicas o Epicentro', t:'c', tag:'mec', r:3, c:3, max:1, req:['d5','d6'], touch:['terremoto'], arch:'sismo', icon:K('terremoto'), opts:[
      { k:'A', n:'Réplicas', d:'Plantado, el Terremoto suelta 4 réplicas (antes 2) que se abren hasta 8 m', role:'AREA', impl:'mod terremoto aftershocks +2 · claves' },
      { k:'B', n:'Epicentro', d:'Plantado, el Terremoto hace +50 % en el centro (2 m) y a los jefes les llena 20 de Quebranto', role:'UNI', impl:'power g_d_epicentro · NUEVO (condAdd + addStagger)' } ],
      win:'A, contra grupos: las réplicas llegan a toda la sala. B, contra jefes: el golpe del centro les rompe la guardia antes. Decide qué Sismo juegas' },
    { id:'d10', n:'Carga: Arrastre o Choque', t:'c', tag:'mec', r:3, c:5, max:1, req:['d6','d7'], touch:['g_carga_escudo'], arch:'vanguardia', icon:K('g_embate'), opts:[
      { k:'A', n:'Gran Arrastre', d:'La Carga de Escudo arrastra a todos a 3 m de tu camino (antes 1,5 m) y los junta delante de ti', role:'AREA', impl:'mod g_carga_escudo dragWidth 3 · claves' },
      { k:'B', n:'Choque Frontal', d:'Si la Carga de Escudo choca con un élite o un jefe, te paras, haces +60 % y le llenas 25 de Quebranto', role:'UNI', impl:'power g_d_choque · NUEVO (onHit élite → stop + addStagger)' } ],
      win:'A, contra grupos: juntas a la manada para el Terremoto. B, contra jefes: la carga se vuelve un golpe que les rompe la guardia. Decide qué Vanguardia juegas' },
    { id:'d11', n:'Corpulencia', t:'p', tag:'num', r:4, c:0, max:2, req:['d8'], d:r=>`+${8*r} % de vida máxima`, arch:'guardia', icon:I('guardian-s11'), impl:'stats.hpPct · existe' },
    { id:'d12', n:'Tambor de Guerra', t:'p', tag:'mec', r:4, c:2, max:2, req:['d8','d9'], d:r=>`Cada enemigo que golpea el Terremoto acorta ${n1(0.5*r)} s la recarga de Piel de Hierro (hasta ${r} s por Terremoto)`, touch:['terremoto','g_piel'], arch:'sismo', icon:I('guardian-s15'), impl:'power g_d_tambor · NUEVO (onHit → cdReduce g_piel; tope r s por lanzamiento, antes 3 s; solo mientras la Piel se recarga, que empieza al acabar)' },
    { id:'d13', n:'Escudo por Delante', t:'p', tag:'mec', r:4, c:4, max:2, req:['d9','d10'], d:r=>`Al llegar con la Carga de Escudo, bloqueas seguro los ${2*r} golpes siguientes (durante 4 s)`, touch:['g_carga_escudo'], arch:'vanguardia', icon:I('guardian-s1'), impl:'power g_d_escudo_delante · NUEVO (afterCast: bloqueos seguros, fuera de CAPS.block; antes −20 % que el tope de reducción anulaba)' },
    { id:'d14', n:'Guardia Rota', t:'p', tag:'mec', r:4, c:6, max:1, req:['d10'], d:()=>'Los que arrastra la Carga de Escudo quedan Vulnerables 3 s: reciben más daño de todo tu grupo', touch:['g_carga_escudo'], arch:'vanguardia', icon:'ui/st_debilidad.webp', impl:'power g_d_guardia_rota · NUEVO (vuln 3 s)' },
    { id:'d15', n:'Última Línea o Roca', t:'c', tag:'mec', r:5, c:1, max:1, req:['d11','d12'], touch:['g_u_ciudadela'], icon:I('guardian-s2'), opts:[
      { k:'A', n:'Última Línea', d:'Un golpe que te mataría te deja con un 10 % de vida y lanza la Ciudadela 3 s, gratis. Una vez cada 2 min', role:'AGU', impl:'power g_d_ultima_linea · NUEVO (onLethal + lanza g_u_ciudadela 3 s)' },
      { k:'B', n:'Aguante de Roca', d:'Con 5 cargas de Bastión, nada te derriba ni te aturde y tus bloqueos paran un 10 % más (hasta el 90 %)', role:'AGU', impl:'power g_d_roca · NUEVO (inmune a control + blockPower +10 con gaugeValue 5; blockPower con tope 90: un bloqueo nunca para todo el golpe; antes «todo el golpe»)' } ],
      win:'A, contra golpes de jefe que matan (Pináculo, Hardcore): la Ciudadela te salva a ti y al grupo. B, contra grupos: mientras mantengas las 5 cargas, nada te tumba y cada bloqueo para hasta el 90 %' },
    { id:'d16', n:'Fuerza del Bastión', t:'p', tag:'mec', r:5, c:3, max:2, req:['d12','d13'], d:r=>`Cada carga de Bastión te da +${2*r} % de daño (5 cargas: +${10*r} %)`, arch:'guardia+sismo+vanguardia', hyb:'Los tres estilos (por el Bastión)', icon:'emblems/guardian.webp', impl:'power g_d_fuerza_bastion · NUEVO (stats con gaugeValue)' },
    { id:'d17', n:'Avalancha', t:'p', tag:'mec', r:5, c:5, max:2, req:['d13','d14'], d:r=>`Cada enemigo que arrastra la Carga de Escudo le quita 1 s a su recarga (hasta ${r} s); nunca baja de 4 s`, touch:['g_carga_escudo'], arch:'vanguardia', icon:I('guardian-s16'), impl:'power g_d_avalancha · NUEVO (afterCast cdReduce, tope r s; suelo de 4 s tras todas las reducciones y reinicios, también los de otros poderes: un resetCd o la media recarga de Asalto Total respetan el suelo)' },
    { id:'d18', n:'Vínculo de Escudo', t:'p', tag:'mec', r:6, c:0, max:2, req:['d15'], d:r=>`En Muralla, recibes tú el ${10*r} % del daño que sufren tus aliados a 8 m`, touch:['g_guardia'], arch:'guardia', icon:I('guardian-s14'), impl:'power g_d_vinculo · NUEVO (⑫ onAllyDamaged + g.damageAlly; lógica de g_vinculo)' },
    { id:'d19', n:'Tierra Viva', t:'p', tag:'mec', r:6, c:2, max:2, req:['d15','d16'], d:r=>`Plantado, cada 3 s sueltas una réplica gratis a 5 m (${30*r} %)`, touch:['terremoto'], arch:'sismo', icon:I('guardian-s10'), impl:'power g_d_tierra_viva · NUEVO (onTick si p.planted)' },
    { id:'d20', n:'Guarnición', t:'p', tag:'mec', r:6, c:4, max:2, req:['d16','d17'], d:r=>`Dentro de tu Ciudadela, tus aliados hacen +${5*r} % de daño y ganas 1 carga de Bastión por segundo (no en la gratis)`, touch:['g_u_ciudadela'], icon:I('guardian-x1'), impl:'power g_d_guarnicion · NUEVO (aura del buff g_u_ciudadela; sin cargas en la Ciudadela gratis de Inexpugnable 4 y Última Línea; respeta el bloqueo de 5 s tras descargar)' },
    { id:'d21', n:'Proa Blindada', t:'p', tag:'mec', r:6, c:6, max:1, req:['d17'], d:()=>'Durante la Carga de Escudo bloqueas todo lo que viene de frente; cada bloqueo te da 1 carga de Bastión', touch:['g_carga_escudo'], arch:'vanguardia', icon:K('g_p_coraza'), impl:'power g_d_proa · NUEVO (bloqueo frontal durante el avance)' },
    { id:'d22', n:'Guardia Viva', t:'p', tag:'mec', r:7, c:0, max:3, req:['d18'], d:r=>`Cada cambio de postura te da +${3*r} % de daño 8 s (se suma hasta 3 veces) y te cura un ${r} % de la vida`, touch:['g_guardia'], arch:'guardia', icon:K('g_p_fuerza'), impl:'power g_d_guardia_viva · NUEVO (afterCast g_guardia + addBuff con pilas + cura por p.sustain(); antes −2/4/6 % de daño recibido, que el tope de reducción anulaba)' },
    { id:'d23', n:'Réplica Honda', t:'p', tag:'mec', r:7, c:3, max:3, req:['d19'], d:r=>`Las réplicas del Terremoto hacen +${10*r} % (el doble contra jefes Quebrantados)`, touch:['terremoto'], arch:'sismo', icon:K('terremoto'), impl:'power g_d_replica_honda · NUEVO (condAdd; ×2 contra Quebrantados; ya no llena Quebranto)' },
    { id:'d24', n:'Escolta', t:'p', tag:'mec', r:7, c:6, max:3, req:['d21'], d:r=>`Al llegar con la Carga de Escudo, das un escudo del ${4*r} % de tu vida a ti y a tus aliados a 6 m (una vez cada 10 s)`, touch:['g_carga_escudo'], arch:'vanguardia', icon:'ui/st_escudo.webp', impl:'power g_d_escolta · NUEVO (g.shield sobre g.allies(); icd 10)' },
    { id:'d25', n:'Guardia Total', t:'f', tag:'mec', r:8, c:0, max:3, req:['d22'], d:r=>`Tras 3 cambios de postura en 8 s, tienes Muralla y Ariete a la vez ${n1(1.5+1.5*r)} s; vuelve a los 15 s${r > 1 ? `. Posturas +${15*(r-1)} %` : ''}`, touch:['g_guardia'], arch:'guardia', icon:I('guardian-x2'), impl:'power g_d_guardia_total · NUEVO (cuenta cambios; stanceBoth 3/4,5/6 s; icd 15 desde que se activa; los cambios hechos durante Guardia Total no cuentan)', final:'Guardia' },
    { id:'d26', n:'Montaña Viva', t:'f', tag:'mec', r:8, c:3, max:3, req:['d23'], d:r=>`Plantado, cada 3.er Terremoto se repite gratis al ${[50,75,100][r-1]} % y sus réplicas aturden 0,5 s (los jefes no)${r > 1 ? `. Terremoto +${15*(r-1)} %` : ''}`, touch:['terremoto'], arch:'sismo', icon:K('terremoto'), impl:'power g_d_montana_viva · NUEVO (contador + eco ×0,5/0,75/1 + applyCC stun; el eco es echo:true: no cuenta para el contador ni gasta el Golpe de Titán)', final:'Sismo' },
    { id:'d27', n:'Cabeza de Puente', t:'f', tag:'mec', r:8, c:6, max:3, req:['d24'], d:r=>`Al acabar la Carga te plantas: +${[2,3,5][r-1]} cargas de Bastión (cada 10 s) y los enemigos a 8 m te atacan 4 s${r > 1 ? `. Carga +${15*(r-1)} %` : ''}`, touch:['g_carga_escudo'], arch:'vanguardia', icon:K('g_provocacion'), impl:'power g_d_cabeza_puente · NUEVO (afterCast gainGauge 2/3/5 con icd 10 + forceTarget)', final:'Vanguardia' },
    { id:'d28', n:'Inexpugnable', t:'x', tag:'mec', r:9, c:3, max:4, req:['d25','d26','d27'], d:r=>['1) Matar a un élite te llena el Bastión.', '2) El Bastión guarda 7 cargas (antes 5).', '3) Descargar el Bastión acorta 6 s la recarga de Piel de Hierro.', '4) Cada 3 descargas, la Ciudadela se lanza sola 4 s, gratis (como mucho una vez cada 45 s).'].slice(0, r).join(' '), touch:['g_u_ciudadela','g_piel'], icon:'emblems/guardian.webp', impl:'power g_d_inexpugnable (rangos) · NUEVO (rango 3: cdReduce g_piel 6, solo mientras se recarga; rango 4: icd 45 y Ciudadela gratis aparte del suelo de las definitivas)' },
  ];

  // ============================================================ CRUZADO (29 nodos · 59 rangos · misma rejilla)
  // Izquierda = SENTENCIA (Juicio: marcas que se detonan) · centro = VEREDICTO (Martillo de Guerra: cargar y soltar con ventana
  // perfecta) · derecha = SANTUARIO (Sendero de Luz y zonas sagradas: apoyo al aliado más herido).
  // Híbridos: (2,2) Sentencia + Veredicto · (2,4) Veredicto + Santuario · (5,3) los tres (por el Fervor). Ápice: Aureola.
  const CRUZADO = [
    { id:'z0', n:'Voto Sagrado', t:'k', tag:'mec', r:0, c:3, max:1, free:true, d:()=>'Una suelta perfecta o detonar marcas te da 1 de Fervor por lanzamiento. A 3, tu siguiente Martillo es un Veredicto', icon:I('cruzado-s0'), impl:'mecánica fervor rehecha (perPerfect, perDetonate, perCastMax 1, Veredicto sin Fervor ni suelta perfecta) · NUEVO' },
    { id:'z1', n:'Peso de la Ley', t:'p', tag:'num', r:1, c:1, max:3, req:['z0'], d:r=>`Detonar una marca de Juicio hace +${15*r} % de daño`, touch:['g_juicio'], arch:'sentencia', icon:I('cruzado-s6'), impl:'mod g_juicio detonatePct · claves' },
    { id:'z2', n:'Devoción', t:'p', tag:'num', r:1, c:3, max:3, req:['z0'], d:r=>`El Martillo de Guerra hace +${10*r} % de daño`, touch:['g_martillo'], arch:'veredicto', icon:I('cruzado-s7'), impl:'mod g_martillo dmg · existe' },
    { id:'z3', n:'Ligereza', t:'p', tag:'num', r:1, c:5, max:3, req:['z0'], d:r=>`El Sendero de Luz se recarga en ${10-r} s (antes 10 s)`, touch:['g_sendero'], arch:'santuario', icon:I('cruzado-s17'), impl:'mod g_sendero cdr · existe' },
    { id:'z4', n:'Marca Indeleble', t:'p', tag:'num', r:2, c:0, max:2, req:['z1'], d:r=>`Las marcas de Juicio duran ${8+4*r} s (antes 8 s)`, touch:['g_juicio'], arch:'sentencia', icon:I('cruzado-s1'), impl:'mod g_juicio markDur · claves' },
    { id:'z5', n:'Sello del Martillo', t:'p', tag:'mec', r:2, c:2, max:1, req:['z1','z2'], d:()=>'Soltar el Martillo de Guerra en la ventana perfecta marca con Juicio a todos los que golpea', touch:['g_martillo','g_juicio'], arch:'sentencia+veredicto', hyb:'Sentencia + Veredicto', icon:I('cruzado-x2'), impl:'power g_z_sello_martillo · NUEVO (onCast perfect → marca)' },
    { id:'z6', n:'Golpe Consagrado', t:'p', tag:'mec', r:2, c:4, max:1, req:['z2','z3'], d:()=>'Soltar en la ventana perfecta consagra 4 s el suelo donde cae el Martillo (40 % por segundo; 2 a la vez, no se suman)', touch:['g_martillo'], arch:'veredicto+santuario', hyb:'Veredicto + Santuario', icon:I('cruzado-s11'), impl:'power g_z_golpe_consagrado · NUEVO (campo z_suelo; como mucho 2 a la vez: el 3.º quita el más viejo, también con Tierra Santa; el daño de las zonas sagradas no se suma: cada enemigo recibe solo el de la más fuerte; antes, con Tierra Santa, 5–10 suelos de 40 %/s sumados)' },
    { id:'z7', n:'Sendero Bendito', t:'p', tag:'mec', r:2, c:6, max:2, req:['z3'], d:r=>`En tu sendero, tus aliados se curan un ${n1(2+0.5*r)} % por segundo (antes 2 %; no se suma) y van un ${10*r} % más rápido`, touch:['g_sendero'], arch:'santuario', icon:I('cruzado-s3'), impl:'mod g_sendero zoneHeal + power g_z_sendero_veloz · NUEVO (la cura no se suma entre senderos: como mucho 3 %/s por aliado; entra en la cubeta de zona del Cruzado, 4 %/s por receptor)' },
    { id:'z8', n:'Juicio: Estallido o Condena', t:'c', tag:'mec', r:3, c:1, max:1, req:['z4','z5'], touch:['g_juicio'], arch:'sentencia', icon:I('cruzado-s9'), opts:[
      { k:'A', n:'Estallido de Luz', d:'Detonar una marca hace estallar el 50 % del golpe a todos a 3 m (cada enemigo, un estallido por lanzamiento)', role:'AREA', impl:'power g_z_estallido_luz · NUEVO (dealArea; cada enemigo recibe como mucho un estallido por lanzamiento, el de la marca más fuerte: crece con N y no con N²; antes, N marcas × N enemigos)' },
      { k:'B', n:'Condena', d:'Las marcas en élites y jefes duran el doble y, al detonarlas, les llenas 15 de Quebranto', role:'UNI', impl:'power g_z_condena · NUEVO (markDur ×2 + addStagger)' } ],
      win:'A, contra grupos: cada detonación alcanza a la manada. B, contra jefes: la marca aguanta y cada detonación les rompe la guardia. Decide qué Sentencia juegas' },
    { id:'z9', n:'Veredicto: Generoso o Pesado', t:'c', tag:'mec', r:3, c:3, max:1, req:['z5','z6'], touch:['g_martillo'], arch:'veredicto', icon:K('g_martillo'), opts:[
      { k:'A', n:'Veredicto Generoso', d:'El Veredicto golpea a 8 m (antes 5 m) y además cura un 3 % a tus otros aliados a 8 m', role:'AREA', impl:'power g_z_veredicto_generoso · NUEVO (radio 8; g.heal 3 % al resto del grupo a 8 m; el más herido sigue con el 6/10 %)' },
      { k:'B', n:'Veredicto Pesado', d:'El Veredicto hace +80 % al objetivo principal y a los jefes les llena 25 de Quebranto', role:'UNI', impl:'power g_z_veredicto_pesado · NUEVO (condAdd + addStagger)' } ],
      win:'A, contra grupos y en grupo: el golpe y la cura llegan a todos. B, contra jefes: el Veredicto es tu golpe más grande. Decide qué Veredicto juegas' },
    { id:'z10', n:'Sendero: Ardiente o Refugio', t:'c', tag:'mec', r:3, c:5, max:1, req:['z6','z7'], touch:['g_sendero'], arch:'santuario', icon:I('cruzado-s14'), opts:[
      { k:'A', n:'Senda Ardiente', d:'El sendero hace el 60 % por segundo (antes 30 %; no se suma) y ralentiza un 30 % a quien lo pisa', role:'AREA', impl:'mod g_sendero zoneCoef + slow · claves (el daño del sendero no se suma entre senderos ni con otras zonas sagradas: vale la más fuerte)' },
      { k:'B', n:'Refugio', d:'El aliado con menos vida en tu sendero gana un escudo del 10 % de tu vida (una vez cada 6 s)', role:'AGU', impl:'power g_z_refugio · NUEVO (g.shield, target lowest)' } ],
      win:'A, contra grupos: el sendero quema y frena a la manada. B, en grupo o contra jefes que pegan fuerte: proteges al más herido. Decide qué Santuario juegas' },
    { id:'z11', n:'Juicio Presto', t:'p', tag:'num', r:4, c:0, max:2, req:['z8'], d:r=>`Juicio se recarga en ${8-r} s (antes 8 s)`, touch:['g_juicio'], arch:'sentencia', icon:I('cruzado-s5'), impl:'mod g_juicio cdr · existe' },
    { id:'z12', n:'Liturgia', t:'p', tag:'mec', r:4, c:2, max:2, req:['z8','z9'], d:r=>`Cada suelta perfecta acorta ${n1(0.5*r)} s tus recargas, salvo la definitiva y Piel de Hierro (como mucho cada 2 s)`, touch:['g_martillo'], arch:'veredicto', icon:I('cruzado-s12'), impl:'tv.perfectCdrAll · NUEVO (como critCdrAll, sin @ultimate ni g_piel; icd 2: ≤ 0,5 s/s, antes ~0,9 s/s)' },
    { id:'z13', n:'Tierra Bendita', t:'p', tag:'num', r:4, c:4, max:2, req:['z9','z10'], d:r=>`Tus zonas sagradas son un ${15*r} % más grandes y duran ${r} s más`, touch:['g_sendero','g_u_cataclismo'], arch:'santuario', icon:I('cruzado-s15'), impl:'mod @holyZone radius + zoneDur · claves' },
    { id:'z14', n:'Altar de Campaña', t:'p', tag:'mec', r:4, c:6, max:1, req:['z10'], d:()=>'Al llegar con el Sendero de Luz, levantas un altar 6 s: tus aliados a 4 m hacen +10 % de daño (no se suma)', touch:['g_sendero'], arch:'santuario', icon:I('cruzado-s15'), impl:'power g_z_altar · NUEVO (campo con aura; los altares no se suman: +10 % como mucho aunque haya 2 puestos)' },
    { id:'z15', n:'Milagro o Luz Protectora', t:'c', tag:'mec', r:5, c:1, max:1, req:['z11','z12'], touch:['g_martillo'], icon:I('cruzado-s13'), opts:[
      { k:'A', n:'Milagro', d:'Un golpe que mataría a un aliado o a ti lo deja con un 20 % de vida. Una vez cada 2 min', role:'AGU', impl:'power g_z_milagro · NUEVO (onLethal + ⑫ onAllyLethal)' },
      { k:'B', n:'Luz Protectora', d:'Cada Veredicto te da un escudo del 10 % de tu vida durante 6 s', role:'AGU', impl:'power g_z_luz_protectora · NUEVO (g.shield)' } ],
      win:'A, en grupo y donde morir cuesta caro: salvas a quien iba a caer. B, en solitario: aguante constante con cada Veredicto' },
    { id:'z16', n:'Ardor', t:'p', tag:'mec', r:5, c:3, max:2, req:['z12','z13'], d:r=>`Tus golpes sagrados hacen +${4*r} % por cada punto de Fervor (3 de Fervor: +${12*r} %)`, sagrado:true, arch:'sentencia+veredicto+santuario', hyb:'Los tres estilos (por el Fervor)', icon:'emblems/cruzado.webp', impl:'power g_z_ardor · NUEVO (stats con gaugeValue)' },
    { id:'z17', n:'Velo Sagrado', t:'p', tag:'mec', r:5, c:5, max:2, req:['z13','z14'], d:r=>`Tú y tus aliados dentro de tus zonas sagradas reciben un ${5*r} % menos de daño`, touch:['g_sendero','g_u_cataclismo'], arch:'santuario', icon:I('cruzado-s4'), impl:'power g_z_velo · NUEVO (condDr en zona)' },
    { id:'z18', n:'Absolución', t:'p', tag:'mec', r:6, c:0, max:2, req:['z15'], d:r=>`Cada detonación de Juicio cura al aliado con menos vida un ${r} % de su vida (una vez cada 2 s)`, touch:['g_juicio'], arch:'sentencia', icon:I('cruzado-s3'), impl:'power g_z_absolucion · NUEVO (g.heal, target lowest; icd 2)' },
    { id:'z19', n:'Fe Serena', t:'p', tag:'mec', r:6, c:2, max:2, req:['z15','z16'], d:r=>`La ventana perfecta dura ${n1(0.25+0.1*r)} s (antes 0,25 s)`, touch:['g_martillo','g_u_cataclismo'], arch:'veredicto', icon:I('cruzado-s2'), impl:'mod @charge perfectWin +0,1 s por rango (base 0,25 s: 0,35/0,45 s) · clave NUEVA' },
    { id:'z20', n:'Gracia del Cielo', t:'p', tag:'mec', r:6, c:4, max:2, req:['z16','z17'], d:r=>`Cada Veredicto acorta ${2*r} s la recarga del Cataclismo (nunca baja de 42 s)`, touch:['g_u_cataclismo'], icon:K('g_u_cataclismo'), impl:'power g_z_gracia · NUEVO (cdReduce; antes 3/6 s; respeta el suelo de las definitivas: 70 % de su base, 42 s)' },
    { id:'z21', n:'Vigilia', t:'p', tag:'mec', r:6, c:6, max:1, req:['z17'], d:()=>'Mientras estás en tu zona sagrada, el Sendero de Luz se recarga el doble de rápido (nunca baja de 4 s)', touch:['g_sendero'], arch:'santuario', icon:I('cruzado-s14'), impl:'power g_z_vigilia · NUEVO (cdRate ×2 en zona; suelo de 4 s del Sendero, con o sin Vigilia, tras todas las reducciones y reinicios: Ligereza, c3, Disciplina, Ritmo de Combate y la media recarga de Asalto Total; como el de la Carga, d17; antes ~2,2–2,6 s)' },
    { id:'z22', n:'Edicto', t:'p', tag:'mec', r:7, c:0, max:3, req:['z18'], d:r=>`Al detonar una marca, marcas a ${r} enemigo${r > 1 ? 's' : ''} a 5 m`, touch:['g_juicio'], arch:'sentencia', icon:I('cruzado-x1'), impl:'power g_z_edicto · NUEVO (marca a vecinos)' },
    { id:'z23', n:'Racha de Fe', t:'p', tag:'mec', r:7, c:3, max:3, req:['z19'], d:r=>`Cada suelta perfecta seguida suma +${4*r} % al Martillo (hasta 5 veces); fallar la ventana lo reinicia`, touch:['g_martillo'], arch:'veredicto', icon:I('cruzado-x1'), impl:'power g_z_racha · NUEVO (pilas; se reinicia al fallar la ventana)' },
    { id:'z24', n:'Peregrino', t:'p', tag:'mec', r:7, c:6, max:3, req:['z21'], d:r=>`Mientras estás en tu zona sagrada, haces +${4*r} % de daño y recibes un ${3*r} % menos`, touch:['g_sendero','g_u_cataclismo'], arch:'santuario', icon:I('cruzado-s4'), impl:'power g_z_peregrino · NUEVO (condAdd + condDr en zona)' },
    { id:'z25', n:'Tribunal', t:'f', tag:'mec', r:8, c:0, max:3, req:['z22'], d:r=>`Detonar una marca no la gasta: se detona ${r < 3 ? `2 veces (la 2.ª al ${[40, 60][r-1]} %)` : '3 veces (la 2.ª y la 3.ª al 80 %)'} y la última salta a 2 enemigos`, touch:['g_juicio'], arch:'sentencia', icon:I('cruzado-s6'), impl:'power g_z_tribunal · NUEVO (markUses 2/2/3; repeticiones ×0,4/0,6/0,8; las repeticiones no dan Fervor: el tope es 1 por lanzamiento)', final:'Sentencia' },
    { id:'z26', n:'Martillo Celestial', t:'f', tag:'mec', r:8, c:3, max:3, req:['z23'], d:r=>`Cada suelta perfecta llama un martillo del cielo sobre el objetivo: repite el ${[30, 45, 60][r-1]} % del golpe${r > 1 ? `. Martillo +${15*(r-1)} %` : ''}`, touch:['g_martillo'], arch:'veredicto', icon:K('g_martillo'), impl:'power g_z_martillo_celestial · NUEVO (eco del golpe ×0,3/0,45/0,6; echo:true)', final:'Veredicto' },
    { id:'z27', n:'Tierra Santa', t:'f', tag:'mec', r:8, c:6, max:3, req:['z24'], d:r=>`Tus zonas sagradas, que no se suman, duran mientras estés dentro (hasta ${[8, 14, 20][r-1]} s) y curan al más herido un 1 % por segundo`, touch:['g_sendero','g_u_cataclismo'], arch:'santuario', icon:I('cruzado-s11'), impl:'power g_z_tierra_santa · NUEVO (campos con stopIf y tope 8/14/20 s; las zonas sagradas no se suman: cada enemigo recibe solo el daño de la más fuerte y la cura de 1 %/s tampoco se suma; Golpe Consagrado, 2 suelos como mucho; cubeta de zona del Cruzado: sendero + Tierra Santa ≤ 4 %/s por receptor)', final:'Santuario' },
    { id:'z28', n:'Aureola', t:'x', tag:'mec', r:9, c:3, max:4, req:['z25','z26','z27'], d:r=>['1) Matar a un élite te llena el Fervor.', '2) El Veredicto cura al aliado más herido un 10 % (antes 6 %).', '3) La ventana perfecta empieza 0,15 s antes.', '4) Cada 8 Veredictos, cae sobre tu objetivo un Cataclismo al 50 %, gratis (como mucho uno cada 30 s).'].slice(0, r).join(' '), sagrado:true, touch:['g_u_cataclismo'], icon:I('cruzado-x3'), impl:'power g_z_aureola (rangos) · NUEVO (rango 4: eco de g_u_cataclismo a carga completa ×0,5, icd 30; no da Fervor)' },
  ];

  // ============================================================ PARAGON: árboles HÉROE (temas de la CLASE; 13 nodos; clave gratis + 10 puntos)
  // Cada árbol lo comparten 2 especializaciones y funciona con cualquiera de las dos: sus mecánicas leen la Furia gastada
  // (Titán), el primer enemigo que golpeas (Gladiador) o un estandarte que se clava solo (Caudillo).
  const HERO = [
    { id:'h1', n:'Titán', specs:['berserker', 'guardian'], art:'ui256/menu_maestria.webp',
      line:'Peso y sacudidas: la Furia que gastas se convierte en golpes de gigante que hacen temblar el suelo',
      key:'Cada 60 de Furia que gastas, tu siguiente principal hace +40 % y sacude el suelo a 4 m', nodes:[
      { id:'t0', n:'Golpe de Titán', t:'k', tag:'mec', r:0, c:1, max:1, free:true, d:()=>'Cada 60 de Furia gastada, tu siguiente principal hace +40 % y sacude el suelo a 4 m (50 %); a los jefes, 15 de Quebranto', icon:I('guardian-s10'), impl:'power g_ti_golpe_titan · NUEVO (⑪ onResource cuenta Furia gastada; solo la pagada por habilidades: no cuentan Furia Protectora, Segundo Aliento ni el drenaje de Danza Carmesí; antes +60 %; las copias y repeticiones gratis, echo:true, no lo gastan)' },
      { id:'t1', n:'Talla de Gigante', t:'p', tag:'num', r:1, c:0, max:1, req:['t0'], d:()=>'Eres un 10 % más grande: +10 % de alcance cuerpo a cuerpo y +8 % de vida máxima', icon:I('guardian-s11'), impl:'stats.hpPct + mod @melee range · claves' },
      { id:'t2', n:'Sacudida o Aplastar', t:'c', tag:'mec', r:1, c:1, max:1, req:['t0'], icon:I('berserker-s1'), opts:[
        { k:'A', n:'Sacudida Amplia', d:'La sacudida del Golpe de Titán llega a 7 m (antes 4 m) y ralentiza un 30 % durante 2 s', role:'AREA', impl:'mod g_ti_golpe_titan radius 7 + slow · claves' },
        { k:'B', n:'Aplastar', d:'El Golpe de Titán hace +80 % (antes +40 %) y a los jefes les llena 25 de Quebranto (antes 15)', role:'UNI', impl:'tv.titanPct 80 + titanStagger 25 · claves' } ],
        win:'A, contra grupos: cada Golpe de Titán alcanza y frena a la manada. B, contra jefes: un golpe enorme que les rompe la guardia' },
      { id:'t3', n:'Aplomo', t:'p', tag:'mec', r:1, c:2, max:1, req:['t0'], d:()=>'Tras un Golpe de Titán, nada te derriba, aturde ni ralentiza durante 3 s', icon:I('clase-c7'), impl:'power g_ti_aplomo · NUEVO (buff imparable 3 s)' },
      { id:'t4', n:'Bramido o Piel de Montaña', t:'c', tag:'mec', r:2, c:0, max:1, req:['t1','t2'], icon:K('grito_guerra'), opts:[
        { k:'A', n:'Bramido de Titán', d:'Habilidad (ranura 2): aturdes 1,5 s a los enemigos a 6 m y tu siguiente principal es de Titán. Se recarga en 30 s', role:'CTRL', act:'g_h_bramido' },
        { k:'B', n:'Piel de Montaña', d:'Cada Golpe de Titán te da un escudo del 8 % de tu vida durante 5 s', role:'AGU', impl:'power g_ti_piel_montana · NUEVO (g.shield)' } ],
        win:'A, para controlar grupos y adelantar el golpe grande (ocupa la ranura 2). B, para aguantar sin ocupar ranura' },
      { id:'t5', n:'Ira Acumulada', t:'p', tag:'num', r:2, c:1, max:1, req:['t2'], d:()=>'El Golpe de Titán llega cada 50 de Furia gastada (antes 60)', icon:'ui/res_furia.webp', impl:'tuning titán every 50 · clave' },
      { id:'t6', n:'Eco Pétreo', t:'p', tag:'mec', r:2, c:2, max:1, req:['t2','t3'], d:()=>'La sacudida se repite 1 s después al 50 %', icon:K('terremoto'), impl:'power g_ti_eco_petreo · NUEVO (timers: repite la sacudida)' },
      { id:'t7', n:'Quiebrahuesos', t:'p', tag:'mec', r:3, c:0, max:1, req:['t4','t5'], d:()=>'Los jefes Quebrantados reciben +15 % de tu daño mientras dura el Quebranto', icon:'ui/st_quebrantado.webp', impl:'power g_ti_quiebrahuesos · NUEVO (condAdd contra Quebrantados)' },
      { id:'t8', n:'Derrumbe o Mole', t:'c', tag:'mec', r:3, c:1, max:1, req:['t5'], icon:I('berserker-s17'), opts:[
        { k:'A', n:'Derrumbe', d:'Si el Golpe de Titán mata, el enemigo estalla: 100 % a todos a 3 m', role:'AREA', impl:'power g_ti_derrumbe · NUEVO (onKill + dealArea)' },
        { k:'B', n:'Mole', d:'Cada Golpe de Titán seguido sobre el mismo enemigo hace +20 % más (hasta +40 %)', role:'UNI', impl:'power g_ti_mole · NUEVO (pilas por blanco; tope 2)' } ],
        win:'A, contra grupos: cada muerte encadena estallidos. B, contra jefes: cada golpe de gigante pega más fuerte' },
      { id:'t9', n:'Temblor', t:'p', tag:'mec', r:3, c:2, max:1, req:['t5','t6'], d:()=>'Los alcanzados por la sacudida hacen un 10 % menos de daño durante 4 s', icon:I('guardian-s16'), impl:'power g_ti_temblor · NUEVO (e.weakenOutgoing)' },
      { id:'t10', n:'Músculo de Gigante', t:'p', tag:'num', r:4, c:0.5, max:1, req:['t7','t8'], d:()=>'Tus habilidades principales hacen +12 % de daño', icon:I('clase-c1'), impl:'mod @spender dmg · existe' },
      { id:'t11', n:'Peso Acumulado', t:'p', tag:'mec', r:4, c:1.5, max:1, req:['t8','t9'], d:()=>'Cada Golpe de Titán acorta 1 s la recarga de tu definitiva', icon:I('clase-c14'), impl:'power g_ti_peso · NUEVO (cdReduce @ultimate 1 s, antes 2 s; respeta el suelo de las definitivas: 70 % de su base)' },
      { id:'t12', n:'Coloso Despierto', t:'f', tag:'mec', r:5, c:1, max:1, req:['t10','t11'], d:()=>'Cada 30 s, tu siguiente Golpe de Titán te hace gigante 8 s: todos tus golpes sacuden el suelo (al 50 %)', icon:I('guardian-x3'), impl:'power g_ti_coloso · NUEVO (icd 30 + buff de 8 s)' },
    ] },
    { id:'h2', n:'Gladiador', specs:['berserker', 'cruzado'], art:'ui256/menu_tormento.webp',
      line:'El duelo: eliges un Rival, lo persigues con armas arrojadizas y contraatacas tras esquivar',
      key:'Tu primer golpe nombra Rival al enemigo 10 s: le haces +15 %; si muere, ganas Furia y el Rival pasa al siguiente', nodes:[
      { id:'l0', n:'Rival', t:'k', tag:'mec', r:0, c:1, max:1, free:true, d:()=>'Tu primer golpe nombra Rival al enemigo 10 s: le haces +15 %. Si muere, ganas 20 de Furia y el Rival pasa al más cercano', icon:K('g_provocacion'), impl:'power g_gl_rival · NUEVO (marca de duelo; onKill la pasa)' },
      { id:'l1', n:'Ovación', t:'p', tag:'num', r:1, c:0, max:1, req:['l0'], d:()=>'Matar a un Rival élite o Quebrantar a tu Rival te cura un 10 %; un Rival normal, un 2 % (una vez cada 2 s)', icon:I('clase-c10'), impl:'tv.rivalKillHeal · NUEVO (10 % por Rival élite o jefe, o al Quebrantarlo; 2 % por Rival normal con icd 2; por la cubeta de p.sustain())' },
      { id:'l2', n:'Rivales o Duelo', t:'c', tag:'mec', r:1, c:1, max:1, req:['l0'], icon:I('clase-c13'), opts:[
        { k:'A', n:'Muchos Rivales', d:'Tienes 3 Rivales a la vez, a +10 % cada uno (antes 1 a +15 %)', role:'AREA', impl:'power g_gl_rivales · NUEVO (3 marcas de Rival)' },
        { k:'B', n:'Duelo a Muerte', d:'Tu Rival recibe +30 % (antes +15 %), pero solo cambia cuando muere', role:'UNI', impl:'power g_gl_duelo · NUEVO' } ],
        win:'A, contra grupos: tres blancos marcados a la vez. B, contra jefes y élites: el duelo largo paga el doble' },
      { id:'l3', n:'Tiro de Arena', t:'p', tag:'mec', r:1, c:2, max:1, req:['l0'], d:()=>'Al nombrar un Rival, le arrojas gratis una Lanza Arrojadiza que lo ralentiza un 40 % 3 s (una vez cada 4 s)', touch:['g_lanza'], icon:K('g_lanza'), impl:'power g_gl_tiro_arena · NUEVO (al nombrar Rival: eco de g_lanza gratis contra él + slow; icd 4: una Lanza que mata ya no encadena otra; no hace falta la Lanza en la barra)' },
      { id:'l4', n:'Desafío o Contraataque', t:'c', tag:'mec', r:2, c:0, max:1, req:['l1','l2'], icon:K('g_provocacion'), opts:[
        { k:'A', n:'Desafío de Arena', d:'Habilidad (ranura 2): encierras a tu Rival contigo en un círculo de 6 m 8 s; le haces +20 %. Se recarga en 40 s', role:'UNI', act:'g_h_desafio' },
        { k:'B', n:'Contraataque', d:'Tras esquivar, tu siguiente golpe en 2 s hace +60 % y te cura un 5 %', role:'AGU', impl:'power g_gl_contraataque · NUEVO (tras la esquiva)' } ],
        win:'A, contra jefes y élites que huyen o llaman ayuda (ocupa la ranura 2). B, para jugar con la esquiva sin ocupar ranura' },
      { id:'l5', n:'Gloria', t:'p', tag:'mec', r:2, c:1, max:1, req:['l2'], d:()=>'Cada Rival que matas y cada 20 % de vida que pierde tu Rival te dan 1 de Gloria (hasta 5): +4 % de daño cada una', icon:I('clase-c14'), impl:'power g_gl_gloria · NUEVO (pilas por muerte y por cada 20 % de vida del Rival; se borran fuera de combate)' },
      { id:'l6', n:'Retirada Táctica', t:'p', tag:'mec', r:2, c:2, max:1, req:['l2','l3'], d:()=>'Al esquivar, arrojas gratis una Lanza Arrojadiza a tu Rival (+30 %), una vez cada 6 s', touch:['g_lanza'], icon:I('clase-c11'), impl:'power g_gl_retirada · NUEVO (tras la esquiva: eco de g_lanza gratis contra el Rival, icd 6; no hace falta la Lanza en la barra)' },
      { id:'l7', n:'Sangre en la Arena', t:'p', tag:'mec', r:3, c:0, max:1, req:['l4','l5'], d:()=>'Cada punto de Gloria da a tus críticos +5 % de daño (5 de Gloria: +25 %)', icon:'ui/st_sangrado.webp', impl:'power g_gl_sangre_arena · NUEVO (daño de crítico por pila de Gloria)' },
      { id:'l8', n:'Público o Pulgar', t:'c', tag:'mec', r:3, c:1, max:1, req:['l5'], icon:I('clase-c12'), opts:[
        { k:'A', n:'Clamor del Público', d:'Matar a un Rival asusta a los enemigos a 6 m: huyen 2 s (los jefes no: les llena 20 de Quebranto)', role:'CTRL', impl:'power g_gl_clamor · NUEVO (miedo + addStagger a jefes)' },
        { k:'B', n:'Pulgar Abajo', d:'Tu Rival con menos del 30 % de vida recibe +40 % de daño', role:'UNI', impl:'power g_gl_pulgar · NUEVO (condAdd con menos del 30 %)' } ],
        win:'A, para controlar grupos: cada muerte abre hueco. B, contra jefes: rematas antes' },
      { id:'l9', n:'Finta', t:'p', tag:'mec', r:3, c:2, max:1, req:['l5','l6'], d:()=>'Esquivar a menos de 3 m de tu Rival acorta 2 s la recarga de tu movilidad', icon:I('clase-c3'), impl:'power g_gl_finta · NUEVO (cdReduce @movement)' },
      { id:'l10', n:'Campeón', t:'p', tag:'num', r:4, c:0.5, max:1, req:['l7','l8'], d:()=>'Contra tu Rival, tienes +10 % de probabilidad de crítico', icon:I('clase-c8'), impl:'power g_gl_campeon · NUEVO (condCrit contra el Rival)' },
      { id:'l11', n:'Vítores', t:'p', tag:'mec', r:4, c:1.5, max:1, req:['l8','l9'], d:()=>'Matar a un Rival élite o Quebrantar a tu Rival acorta 6 s la recarga de tu definitiva (como mucho una vez cada 15 s)', icon:I('clase-c15'), impl:'power g_gl_vitores · NUEVO (cdReduce @ultimate 6 s, icd 15; solo Rival élite o jefe, o al Quebrantarlo; antes 4 s por cada Rival sin tope; respeta el suelo de las definitivas)' },
      { id:'l12', n:'Triunfo', t:'f', tag:'mec', r:5, c:1, max:1, req:['l10','l11'], d:()=>'Rival Quebrantado o 5 de Gloria (cada 35 s): 10 s de +25 % de daño y principales a media Furia; matar, +1 s (hasta 15 s)', icon:'ui/st_quebrantado.webp', impl:'power g_gl_triunfo · NUEVO (buff con 5 de Gloria o al Quebrantar al Rival; matar +1 s hasta 15 s; icd 35 desde que se activa = 15 s como mucho y 20 s de espera; antes +2 s por muerte sin tope)' },
    ] },
    { id:'h3', n:'Caudillo', specs:['guardian', 'cruzado'], art:'ui256/menu_bendiciones.webp',
      line:'Estandartes y gritos que mandan sobre el grupo: clavas pendones y das órdenes',
      key:'Cada 15 s clavas un Pendón donde estás (12 s): tú y tus aliados a 8 m hacen +8 % de daño y reciben un 8 % menos', nodes:[
      { id:'u0', n:'Pendón', t:'k', tag:'mec', r:0, c:1, max:1, free:true, d:()=>'Cada 15 s clavas un Pendón donde estás (12 s): tú y tus aliados a 8 m hacen +8 % de daño y reciben un 8 % menos', icon:K('g_u_estandarte'), impl:'power g_cau_pendon · NUEVO (campo con aura; icd 15, dura 12 s: 80 % del tiempo; antes 10 s cada 20 s)' },
      { id:'u1', n:'Asta Alta', t:'p', tag:'num', r:1, c:0, max:1, req:['u0'], d:()=>'El Pendón alcanza 12 m (antes 8 m)', icon:I('cruzado-s10'), impl:'tuning pendón radius 12 · clave' },
      { id:'u2', n:'Pendón: Asalto o Defensa', t:'c', tag:'mec', r:1, c:1, max:1, req:['u0'], icon:I('cruzado-s4'), opts:[
        { k:'A', n:'Pendón de Asalto', d:'El Pendón da +16 % de daño (antes +8 %)', role:'UNI', impl:'tuning pendón dmgPct 16 · clave' },
        { k:'B', n:'Pendón de Defensa', d:'El Pendón quita un 16 % del daño recibido (antes 8 %)', role:'AGU', impl:'tuning pendón drPct 16 · clave' } ],
        win:'A, para hacer daño (sobre todo en ráfagas contra jefes). B, para aguantar contra grupos y golpes fuertes' },
      { id:'u3', n:'Arenga', t:'p', tag:'mec', r:1, c:2, max:1, req:['u0'], d:()=>'Al clavar un Pendón, tú y tus aliados a 8 m recuperan un 5 % de la vida', icon:K('grito_guerra'), impl:'power g_cau_arenga · NUEVO (g.heal sobre g.allies())' },
      { id:'u4', n:'Estandarte o Abanderado', t:'c', tag:'mec', r:2, c:0, max:1, req:['u1','u2'], icon:K('g_u_estandarte'), opts:[
        { k:'A', n:'Estandarte de Guerra', d:'Habilidad (ranura 2): clavas al instante un Pendón en la mira (a 15 m), aparte del automático. Se recarga en 30 s', role:'UNI', act:'g_h_estandarte' },
        { k:'B', n:'Abanderado', d:'Llevas el Pendón a la espalda: te sigue y siempre estás dentro', role:'AGU', impl:'power g_cau_abanderado · NUEVO (el campo sigue al jugador)' } ],
        win:'A, para poner el Pendón donde pelea el grupo (ocupa la ranura 2). B, si te mueves mucho y no quieres ocupar ranura' },
      { id:'u5', n:'Clarín', t:'p', tag:'mec', r:2, c:1, max:1, req:['u2'], d:()=>'Cada vez que clavas un Pendón, ganas 20 de Furia', icon:'ui/res_furia.webp', impl:'power g_cau_clarin · NUEVO (gainResource 20)' },
      { id:'u6', n:'Tropel', t:'p', tag:'mec', r:2, c:2, max:1, req:['u2','u3'], d:()=>'Dentro del Pendón, tú y tus aliados se mueven un 15 % más rápido', icon:I('clase-c11'), impl:'aura del Pendón moveSpd 15 · clave' },
      { id:'u7', n:'Línea de Batalla', t:'p', tag:'mec', r:3, c:0, max:1, req:['u4','u5'], d:()=>'Los enemigos dentro del Pendón hacen un 10 % menos de daño', icon:I('guardian-s14'), impl:'aura del Pendón e.weakenOutgoing 10 · clave' },
      { id:'u8', n:'Desbandada u Orden', t:'c', tag:'mec', r:3, c:1, max:1, req:['u5'], icon:I('clase-c12'), opts:[
        { k:'A', n:'Desbandada', d:'Al clavar un Pendón, los enemigos a 8 m huyen 2 s (los jefes no: les llenas 20 de Quebranto)', role:'CTRL', impl:'power g_cau_desbandada · NUEVO (miedo + addStagger a jefes)' },
        { k:'B', n:'Orden de Ataque', d:'Al clavar un Pendón, el enemigo con más vida a 15 m recibe +15 % de daño de todo el grupo durante 10 s', role:'UNI', impl:'power g_cau_orden · NUEVO (vuln al de más vida)' } ],
        win:'A, para controlar grupos y dar respiro. B, contra jefes: todo el grupo pega más al mismo' },
      { id:'u9', n:'Doble Asta', t:'p', tag:'mec', r:3, c:2, max:1, req:['u5','u6'], d:()=>'Tu Pendón dura 20 s (antes 12 s): siempre tienes uno clavado; dos a la vez no se suman', icon:I('cruzado-s10'), impl:'tuning pendón durS 20 · clave (antes «2 Pendones a la vez», que sin Estandarte de Guerra no hacía nada)' },
      { id:'u10', n:'Disciplina', t:'p', tag:'num', r:4, c:0.5, max:1, req:['u7','u8'], d:()=>'Dentro del Pendón, tus habilidades se recargan un 12 % más rápido', icon:I('cruzado-s2'), impl:'aura del Pendón cdr 12 · clave (antes 10: con el 80 % del tiempo, ~10 % efectivo)' },
      { id:'u11', n:'Relevo', t:'p', tag:'mec', r:4, c:1.5, max:1, req:['u8','u9'], d:()=>'Al acabar un Pendón, tú y tus aliados a 8 m ganan un escudo del 10 % de su vida', icon:'ui/st_escudo.webp', impl:'power g_cau_relevo · NUEVO (fin del campo + g.shield)' },
      { id:'u12', n:'Gran Estandarte', t:'f', tag:'mec', r:5, c:1, max:1, req:['u10','u11'], d:()=>'Cada 40 s, tu siguiente Pendón es un Gran Estandarte 15 s: el doble de grande y de efecto', icon:K('g_u_estandarte'), impl:'power g_cau_gran_estandarte · NUEVO (icd 40)' },
    ] },
  ];

  // ============================================================ BUILDS (rangos EN ORDEN DE COMPRA; «c4_» = rangos tardíos Nv85+)
  // 4 por especialización, una híbrida (sin final de especialización). Los órdenes de clase son los tres caminos de la
  // rejilla (Defensa → Inquebrantable · Armas → Señor de la Guerra · Movilidad → Asalto Total); las elecciones cambian.
  const CLS_DEF = () => ({ c1:2, c4:3, c5:1, c8:2, c11:1, c15:1, c19:1, c22:1, c2:2, c12:2, c9:1, c16:1, c18:2, c13:2, c6:1, c10:1, c25:3, c28:3, c3:2, c7:1, c14:1 });
  const CLS_ARM = () => ({ c1:2, c2:2, c5:1, c6:1, c9:1, c12:2, c13:2, c16:1, c19:1, c23:2, c10:1, c17:1, c20:1, c4:1, c8:2, c15:1, c3:2, c26:3, c29:3, c24:2, c4_:2 });
  const CLS_MOV = () => ({ c2:2, c3:2, c6:1, c7:1, c10:1, c14:1, c17:1, c20:1, c24:2, c1:2, c5:1, c9:1, c12:2, c13:2, c16:1, c21:1, c23:2, c27:3, c30:3, c8:2, c4:2 });
  // órdenes de especialización por columna (n = número de la rejilla; p = prefijo del árbol)
  const re = (p, o) => Object.fromEntries(o.map(([n, r]) => [p + n, r]));
  const SPEC_A = p => re(p, [[1,3],[4,2],[5,1],[8,1],[11,2],[15,1],[18,2],[22,3],[25,3],[28,4],[2,3],[9,1],[12,2],[16,2],[3,1]]);
  const SPEC_B = p => re(p, [[2,3],[5,1],[9,1],[12,2],[16,2],[19,2],[23,3],[26,3],[28,4],[1,3],[4,1],[8,1],[15,1],[3,3],[6,1]]);
  const SPEC_C = p => re(p, [[3,3],[7,2],[6,1],[10,1],[13,2],[14,1],[17,2],[21,1],[24,3],[27,3],[28,4],[2,3],[9,1],[16,2],[20,2]]);
  const SPEC_H = p => re(p, [[1,3],[2,3],[4,2],[5,1],[8,1],[9,1],[11,2],[12,2],[15,1],[16,2],[18,2],[19,2],[22,3],[23,3],[3,1],[20,2]]);
  // órdenes del Paragon (10 de 12 nodos; la clave es gratis): P1 deja fuera 7 y 10 · P2 y P3, 6 y 9 · P4, 3 y 6
  const P1 = p => [2,3,6,5,9,8,11,12,4,1].map(n => p + n);
  const P2 = p => [2,1,3,5,8,4,7,10,12,11].map(n => p + n);
  const P3 = p => [2,1,4,5,8,3,7,10,12,11].map(n => p + n);
  const P4 = p => [2,1,4,5,7,8,10,9,11,12].map(n => p + n);
  const BUILDS = {
    // — BERSERKER —
    estampida: { sp:'berserker', n:'Estampida Sin Fin', arch:'Estampida', hero:'h1', heroCh:{ t2:'A', t4:'A', t8:'A' }, heroNodes:P1('t'),
      cls: CLS_MOV(), clsCh: { c5:'B', c6:'B', c9:'B', c10:'A', c14:'A', c16:'A', c17:'B' },
      spec: { b3:3, b7:2, b6:1, b10:1, b13:2, b14:1, b17:2, b21:1, b24:3, b27:3, b28:4, b2:3, b9:1, b16:2, b20:2 },
      specCh: { b9:'A', b10:'A' } },
    hibrido: { sp:'berserker', n:'Sangre y Acero', arch:'Híbrido Hemorragia-Verdugo', hero:'h2', heroCh:{ l2:'B', l4:'B', l8:'B' }, heroNodes:P2('l'),
      cls: CLS_ARM(), clsCh: { c5:'A', c6:'A', c9:'A', c10:'B', c15:'B', c16:'A', c17:'B' },
      spec: { b1:3, b2:3, b4:2, b5:1, b8:1, b9:1, b11:2, b12:2, b15:1, b16:2, b18:2, b19:2, b22:3, b23:3, b3:1, b20:2 },
      specCh: { b8:'A', b9:'B', b15:'B' } },
    danza: { sp:'berserker', n:'Danza Carmesí', arch:'Hemorragia', hero:'h2', heroCh:{ l2:'A', l4:'B', l8:'A' }, heroNodes:P1('l'),
      cls: CLS_DEF(), clsCh: { c5:'B', c6:'B', c9:'B', c10:'A', c11:'B', c14:'B', c15:'A', c16:'A', c22:'B' },
      spec: SPEC_A('b'), specCh: { b8:'A', b9:'A', b15:'B' } },
    gracia: { sp:'berserker', n:'Golpe de Gracia', arch:'Verdugo', hero:'h1', heroCh:{ t2:'B', t4:'B', t8:'B' }, heroNodes:P2('t'),
      cls: CLS_ARM(), clsCh: { c5:'A', c6:'A', c9:'A', c10:'B', c15:'B', c16:'B', c17:'B' },
      spec: SPEC_B('b'), specCh: { b8:'B', b9:'B', b15:'A' } },
    // — GUARDIÁN —
    // rejuicio (ronda 2): Guardia Total y Roca y Escudo eligen Segundo Aliento (c11A, con la Piel al 50 %): la Coraza (c11B) es reducción y el Guardián ya está en su tope
    guardia: { sp:'guardian', n:'Guardia Total', arch:'Guardia', hero:'h3', heroCh:{ u2:'B', u4:'B', u8:'A' }, heroNodes:P3('u'),
      cls: CLS_DEF(), clsCh: { c5:'B', c6:'B', c9:'A', c10:'A', c11:'A', c14:'B', c15:'A', c16:'B', c22:'B' },
      spec: SPEC_A('d'), specCh: { d8:'A', d9:'A', d15:'B' } },
    sismo: { sp:'guardian', n:'Montaña Viva', arch:'Sismo', hero:'h1', heroCh:{ t2:'B', t4:'B', t8:'B' }, heroNodes:P4('t'),
      cls: CLS_ARM(), clsCh: { c5:'A', c6:'A', c9:'A', c10:'B', c15:'A', c16:'B', c17:'B' },
      spec: SPEC_B('d'), specCh: { d8:'B', d9:'B', d15:'A' } },
    vanguardia: { sp:'guardian', n:'Cabeza de Puente', arch:'Vanguardia', hero:'h1', heroCh:{ t2:'A', t4:'B', t8:'A' }, heroNodes:P1('t'),
      cls: CLS_MOV(), clsCh: { c5:'B', c6:'B', c9:'A', c10:'A', c14:'A', c16:'B', c17:'B' },
      spec: SPEC_C('d'), specCh: { d9:'A', d10:'A' } },
    hibguard: { sp:'guardian', n:'Roca y Escudo', arch:'Híbrido Guardia-Sismo', hero:'h3', heroCh:{ u2:'B', u4:'B', u8:'B' }, heroNodes:P2('u'),
      cls: CLS_DEF(), clsCh: { c5:'A', c6:'A', c9:'A', c10:'B', c11:'A', c14:'B', c15:'A', c16:'B', c22:'B' },
      spec: SPEC_H('d'), specCh: { d8:'B', d9:'B', d15:'B' } },
    // — CRUZADO —
    tribunal: { sp:'cruzado', n:'Tribunal', arch:'Sentencia', hero:'h3', heroCh:{ u2:'A', u4:'B', u8:'B' }, heroNodes:P1('u'),
      cls: CLS_DEF(), clsCh: { c5:'B', c6:'B', c9:'B', c10:'A', c11:'B', c14:'B', c15:'A', c16:'B', c22:'B' },
      spec: SPEC_A('z'), specCh: { z8:'A', z9:'A', z15:'A' } },
    // corrección de la etapa 2: contra jefes, Finta (l9) en lugar de Tiro de Arena (l3); Gloria, Ovación, Vítores y Triunfo ya cuentan el Quebranto
    celestial: { sp:'cruzado', n:'Martillo Celestial', arch:'Veredicto', hero:'h2', heroCh:{ l2:'B', l4:'A', l8:'B' }, heroNodes:[2,1,4,5,8,9,7,10,11,12].map(n => 'l' + n),
      cls: CLS_ARM(), clsCh: { c5:'A', c6:'A', c9:'A', c10:'B', c15:'B', c16:'B', c17:'B' },
      spec: SPEC_B('z'), specCh: { z8:'B', z9:'B', z15:'B' } },
    // rejuicio (ronda 2): Tierra Santa elige Grito de Guerra (c17A): sin ponerlo en la barra, sale con cada Piel de Hierro al 50 % (+5 % al grupo)
    santa: { sp:'cruzado', n:'Tierra Santa', arch:'Santuario', hero:'h3', heroCh:{ u2:'B', u4:'A', u8:'A' }, heroNodes:P4('u'),
      cls: CLS_MOV(), clsCh: { c5:'B', c6:'B', c9:'B', c10:'A', c14:'B', c16:'B', c17:'A' },
      spec: SPEC_C('z'), specCh: { z9:'A', z10:'B' } },
    hibcruz: { sp:'cruzado', n:'Luz y Martillo', arch:'Híbrido Sentencia-Veredicto', hero:'h2', heroCh:{ l2:'A', l4:'B', l8:'B' }, heroNodes:P2('l'),
      cls: CLS_ARM(), clsCh: { c5:'A', c6:'B', c9:'B', c10:'A', c15:'A', c16:'B', c17:'B' },
      spec: SPEC_H('z'), specCh: { z8:'A', z9:'B', z15:'B' } },
  };

  // ============================================================ REGISTRO
  window.TALENTS_V2_CLASSES = window.TALENTS_V2_CLASSES || {};
  window.TALENTS_V2_CLASSES.guerrero = {
    formato: 1,                       // versión del contrato (TV2.formato)
    estado: 'diseño',                 // etapas 1 y 2 hechas: falta la aprobación del dueño
    id: 'guerrero', name: 'Guerrero', res: 'Furia', resIcon: 'res_furia', color: '#e8634a',
    emblem: 'ui/res_furia.webp',      // icono de la columna de clase y del selector de clase
    clsArt: 'specs/guardian.webp',    // arte de fondo (muy tenue) de la columna de clase
    book: { baseIcon: 'ui/res_furia.webp', baseNote: 'acero, Furia y empuje' },
    specOrder: SPEC_IDS, defaultSpec: 'berserker', specs: SPECS,
    catalog: CATALOG,
    fallbackBar: BASE_BAR,
    specBar: SPEC_BAR,
    // variantes de forja recomendadas (★ en el libro y botón «Recomendado»)
    reco: {
      berserker: { g_tajo:'A', g_remolino:'B', g_u_furia:'A' },
      guardian: { g_tajo:'B', g_piel:'B', g_guardia:'A', g_carga_escudo:'A', g_u_ciudadela:'B' },
      cruzado: { g_juicio:'B', g_sendero:'A', g_martillo:'B', g_u_cataclismo:'A' },
    },
    sup: { g_rajar:['amplify','bleed'] },     // engarces iniciales del mockup
    mech: MECH_TXT, innate: SPEC_INNATE_TXT,
    // grupos de habilidades para los nodos que tocan «todo tu X» (flag del nodo: golpes:true, sangrado:true, movilidad:true, sagrado:true)
    groups: {
      golpes:   { label: 'Toca todos tus golpes', ids: ['g_tajo', 'g_hendidura', 'embestida', 'g_lanza', 'g_remolino', 'g_salto', 'g_rajar', 'terremoto', 'g_carga_escudo', 'g_juicio', 'g_sendero', 'g_martillo', 'g_u_cataclismo'] },
      sangrado: { label: 'Toca todo tu Sangrado', ids: ['g_tajo', 'g_remolino', 'g_rajar', 'g_salto'] },
      movilidad: { label: 'Toca tu habilidad de movilidad (ranura 1)', ids: ['embestida', 'g_salto', 'g_carga_escudo', 'g_sendero'] },
      sagrado:  { label: 'Toca todo tu daño sagrado', ids: ['g_juicio', 'g_sendero', 'g_martillo', 'g_u_cataclismo'] },
    },
    tree: { cls: CLS, spec: { berserker: BERSERKER, guardian: GUARDIAN, cruzado: CRUZADO }, hero: HERO },
    builds: BUILDS, defaultBuild: { berserker: 'estampida', guardian: 'guardia', cruzado: 'celestial' },
    // nodos que usan las demos de captura (&demo=spend|choice|hover|hoveract|rclick|pick|undo|hl|gate|specswap)
    demo: { spend:'b16', choice:'b9', hover:'b9', hoveract:'t4', rclick:'b9', pick:'b10', undo:'b24', hl:'g_rajar', swapTo:'guardian',
      gate: { ranks: { c2:2, c1:2, c3:2, c6:1 }, ch: { c6:'B' }, buy: ['c5', 'A'] } },
  };
  void pl;
})();
