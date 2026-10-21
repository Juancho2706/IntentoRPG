// ============================================================
// ÁRBOLES HÉROE (Paragon) de la clase Maga — esqueleto v2
// ============================================================
// Generado por tools/convert-v2/convert.mjs (--draft) desde docs/mockups/data/talents-v2-maga.js (sha1 7801561901ba, estado «aprobado»).
// Formato: docs/paso2-implementacion.md §3.1 y D5 (lo importa SOLO js/talents-maga.js, campo `hero`).
// Estructura y textos exactos (tests/test-v2-paridad.mjs); `fx: {}` + `todo` = `impl` del mockup (E2: KT).
export const MAGA_HERO = [
  { id: 'crono', name: 'Cronomante', specs: ['piromante', 'arcanista'], art: 'ui256/menu_viajes.webp', line: 'Marcas del Tiempo: el daño que haces vuelve a golpear', key: 'Tu primer golpe marca al enemigo 4 s; al acabar, la marca repite el 30 % del daño que le hiciste', prefix: 't', nodes: [
    { id: 't0', name: 'Marca del Tiempo', t: 'k', tag: 'mec', r: 0, c: 1, max: 1, free: true, d: ()=>'Tu primer golpe marca al enemigo 4 s. Al acabar, la Marca repite el 30 % del daño que le hiciste en ese tiempo', icon: 'talents/maga-clase-c12.webp', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
    { id: 't1', name: 'Reloj de Arena', t: 'p', tag: 'num', r: 1, c: 0, max: 1, req: ['t0'], d: ()=>'La Marca dura 6 s (antes 4 s)', icon: 'talents/maga-clase-c13.webp', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
    { id: 't2', name: 'Eco Mayor o Contagio', t: 'c', tag: 'mec', r: 1, c: 1, max: 1, req: ['t0'], icon: 'talents/maga-arcanista-s1.webp', opts: [
        { k: 'A', name: 'Eco Mayor', desc: 'La Marca repite el 45 % (antes 30 %)', role: 'UNI', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
        { k: 'B', name: 'Marca Contagiosa', desc: 'Al terminar, la Marca pasa a 2 enemigos cercanos', role: 'AREA', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
      ],
      win: 'A, contra jefes. B, contra grupos' },
    { id: 't3', name: 'Prisa Temporal', t: 'p', tag: 'mec', r: 1, c: 2, max: 1, req: ['t0'], d: ()=>'Cada Marca que termina te hace lanzar un 10 % más rápido durante 3 s', icon: 'talents/maga-clase-c11.webp', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
    { id: 't4', name: 'Detener o Retroceder', t: 'c', tag: 'mec', r: 2, c: 0, max: 1, req: ['t1', 't2'], icon: 'talents/maga-arcanista-s9.webp', opts: [
        { k: 'A', name: 'Detener el Tiempo', desc: 'Habilidad (ranura 2): paras el tiempo 3 s a 8 m; las Marcas guardan el doble. Se recarga en 75 s', role: 'CTRL', fx: { grant: 'm_h_detener' }, todo: 'sin impl: escribir el efecto desde el texto' },
        { k: 'B', name: 'Retroceso', desc: 'Al bajar del 40 % de vida, vuelves a la vida que tenías hace 3 s. Una vez cada 90 s', role: 'AGU', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
      ],
      win: 'A, para controlar grupos y preparar un golpe enorme (ocupa la ranura 2). B, para sobrevivir sin ocupar ranura' },
    { id: 't5', name: 'Segundos Robados', t: 'p', tag: 'num', r: 2, c: 1, max: 1, req: ['t2'], d: ()=>'Cada Marca que termina recarga 1 s de tu definitiva', touch: ['m_u_supernova'], icon: 'talents/maga-arcanista-s3.webp', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
    { id: 't6', name: 'Paradoja', t: 'p', tag: 'mec', r: 2, c: 2, max: 1, req: ['t2', 't3'], d: ()=>'Si el enemigo marcado muere antes de tiempo, la Marca pasa al más cercano con lo que llevaba', icon: 'talents/maga-arcanista-s7.webp', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
    { id: 't7', name: 'Bucle', t: 'p', tag: 'mec', r: 3, c: 0, max: 1, req: ['t4', 't5'], d: ()=>'Cada 4.ª Marca que termina se repite una segunda vez', icon: 'talents/maga-arcanista-x1.webp', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
    { id: 't8', name: 'Presagio o Memoria', t: 'c', tag: 'mec', r: 3, c: 1, max: 1, req: ['t5'], icon: 'talents/maga-arcanista-s12.webp', opts: [
        { k: 'A', name: 'Presagio', desc: 'El golpe que pone la Marca ya cuenta el doble para ella', role: 'UNI', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
        { k: 'B', name: 'Memoria', desc: 'Al terminar una Marca, te curas el 3 % del daño que repitió', role: 'AGU', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
      ],
      win: 'A, contra jefes. B, para aguantar en grupos' },
    { id: 't9', name: 'Grieta Temporal', t: 'p', tag: 'mec', r: 3, c: 2, max: 1, req: ['t5', 't6'], d: ()=>'Si 3 Marcas terminan a la vez, abren una grieta 3 s que ralentiza un 30 %', icon: 'talents/maga-arcanista-s14.webp', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
    { id: 't10', name: 'Aceleración', t: 'p', tag: 'num', r: 4, c: 0.5, max: 1, req: ['t7', 't8'], d: ()=>'Con 3 o más Marcas puestas, lanzas un 12 % más rápido', icon: 'talents/maga-clase-c11.webp', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
    { id: 't11', name: 'Momento Exacto', t: 'p', tag: 'mec', r: 4, c: 1.5, max: 1, req: ['t8', 't9'], d: ()=>'Tus críticos alargan la Marca 1 s (hasta 3 s más)', icon: 'talents/maga-clase-c4.webp', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
    { id: 't12', name: 'Señora del Tiempo', t: 'f', tag: 'mec', r: 5, c: 1, max: 1, req: ['t10', 't11'], d: ()=>'Cada 30 s, tu siguiente principal para el reloj 5 s: las Marcas no terminan y luego repiten el 100 % de lo guardado', icon: 'talents/maga-arcanista-x3.webp', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
  ] },
  { id: 'invoca', name: 'Invocadora', specs: ['piromante', 'crionte'], art: 'ui256/menu_mascota.webp', line: 'Un constructo de maná pelea a tu lado con tu elemento', key: 'Un Familiar dispara cada 1,5 s con el elemento de tu último hechizo', prefix: 'f', nodes: [
    { id: 'f0', name: 'Familiar Arcano', t: 'k', tag: 'mec', r: 0, c: 1, max: 1, free: true, d: ()=>'Un Familiar de maná dispara cada 1,5 s (50 % del arma) con tu último elemento: Fuego quema, Hielo frena, Arcano da maná', icon: 'talents/maga-arcanista-s0.webp', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
    { id: 'f1', name: 'Vínculo', t: 'p', tag: 'num', r: 1, c: 0, max: 1, req: ['f0'], d: ()=>'El Familiar tiene +50 % de vida y cada disparo te da 2 de maná', icon: 'talents/maga-clase-c6.webp', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
    { id: 'f2', name: 'Uno o Muchos', t: 'c', tag: 'mec', r: 1, c: 1, max: 1, req: ['f0'], icon: 'talents/maga-arcanista-s5.webp', opts: [
        { k: 'A', name: 'Gran Constructo', desc: 'Un solo Familiar, +80 % de daño; cada 5.º disparo aturde 0,5 s', role: 'UNI', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
        { k: 'B', name: 'Enjambre', desc: 'Tres Familiares pequeños; cada uno hace el 40 %', role: 'AREA', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
      ],
      win: 'A, contra jefes. B, contra grupos (tres blancos a la vez)' },
    { id: 'f3', name: 'Imitación', t: 'p', tag: 'mec', r: 1, c: 2, max: 1, req: ['f0'], d: ()=>'Cuando usas tu definitiva, el Familiar lanza una copia al 25 %', touch: ['m_u_supernova'], icon: 'talents/maga-arcanista-s16.webp', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
    { id: 'f4', name: 'Guardián o Cazador', t: 'c', tag: 'mec', r: 2, c: 0, max: 1, req: ['f1', 'f2'], icon: 'talents/maga-arcanista-s8.webp', opts: [
        { k: 'A', name: 'Guardián', desc: 'El Familiar se interpone: recibe el 15 % del daño que te hacen', role: 'AGU', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
        { k: 'B', name: 'Cazador', desc: 'El Familiar persigue al enemigo con más vida; ese enemigo recibe +10 % de daño', role: 'UNI', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
      ],
      win: 'A, para sobrevivir. B, contra jefes' },
    { id: 'f5', name: 'Sobrecarga', t: 'p', tag: 'num', r: 2, c: 1, max: 1, req: ['f2'], d: ()=>'Cada habilidad principal tuya acelera los disparos del Familiar un 30 % durante 3 s', icon: 'talents/maga-clase-c14.webp', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
    { id: 'f6', name: 'Detonar Constructo', t: 'p', tag: 'mec', r: 2, c: 2, max: 1, req: ['f2', 'f3'], d: ()=>'Si el Familiar cae, estalla (200 % del arma, 4 m) y vuelve a los 5 s', icon: 'talents/maga-arcanista-x2.webp', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
    { id: 'f7', name: 'Aprendiz', t: 'p', tag: 'mec', r: 3, c: 0, max: 1, req: ['f4', 'f5'], d: ()=>'El Familiar copia la variante de forja de tu Dardo (por ejemplo, con Saeta Ígnea sus disparos explotan)', touch: ['m_dardo'], icon: 'talents/maga-clase-c4.webp', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
    { id: 'f8', name: 'Constructo o Fragua', t: 'c', tag: 'mec', r: 3, c: 1, max: 1, req: ['f5'], icon: 'talents/maga-clase-c15.webp', opts: [
        { k: 'A', name: 'Llamar Constructo', desc: 'Habilidad (ranura 2): un Constructo grande aparece 10 s y obliga a los enemigos a 8 m a atacarlo. Se recarga en 45 s', role: 'AGU', fx: { grant: 'm_h_constructo' }, todo: 'sin impl: escribir el efecto desde el texto' },
        { k: 'B', name: 'Fragua Rúnica', desc: 'El Familiar hace +5 % por cada habilidad distinta que usaste en 8 s (hasta +25 %)', role: 'UNI', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
      ],
      win: 'A, para aguantar grupos grandes (ocupa la ranura 2). B, para hacer daño sin ocupar ranura' },
    { id: 'f9', name: 'Eco Elemental', t: 'p', tag: 'mec', r: 3, c: 2, max: 1, req: ['f5', 'f6'], d: ()=>'Los disparos del Familiar alimentan tu mecánica: 3 de Calor (Piromante) o 1 capa de Escarcha (Crionte)', icon: 'talents/maga-piromante-s5.webp', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
    { id: 'f10', name: 'Constructo Templado', t: 'p', tag: 'num', r: 4, c: 0.5, max: 1, req: ['f7', 'f8'], d: ()=>'El Familiar hace +20 % de daño', icon: 'talents/maga-clase-c1.webp', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
    { id: 'f11', name: 'Hilo de Maná', t: 'p', tag: 'mec', r: 4, c: 1.5, max: 1, req: ['f8', 'f9'], d: ()=>'Un hilo de maná te une al Familiar y daña a quien lo cruza (60 % por segundo)', icon: 'talents/maga-arcanista-s14.webp', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
    { id: 'f12', name: 'Legión', t: 'f', tag: 'mec', r: 5, c: 1, max: 1, req: ['f10', 'f11'], d: ()=>'Cada 25 s, tu Familiar se divide en 3 durante 8 s y todos copian tu siguiente principal al 50 %', icon: 'talents/maga-arcanista-x3.webp', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
  ] },
  { id: 'escriba', name: 'Escriba Rúnica', specs: ['crionte', 'arcanista'], art: 'ui256/menu_codice.webp', line: 'Tus hechizos escriben runas; tres juntas forman un Sello', key: 'Cada 3.er hechizo escribe una runa; tres runas cerca forman un Sello que te potencia', prefix: 'e', nodes: [
    { id: 'e0', name: 'Runas', t: 'k', tag: 'mec', r: 0, c: 1, max: 1, free: true, d: ()=>'Cada 3.er hechizo escribe una runa (8 s). Tres runas cerca forman un Sello: dentro haces +15 % y recibes −10 % de daño', icon: 'talents/maga-arcanista-s9.webp', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
    { id: 'e1', name: 'Tinta Duradera', t: 'p', tag: 'num', r: 1, c: 0, max: 1, req: ['e0'], d: ()=>'Las runas duran 12 s (antes 8 s)', icon: 'talents/maga-clase-c13.webp', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
    { id: 'e2', name: 'Poder o Estallido', t: 'c', tag: 'mec', r: 1, c: 1, max: 1, req: ['e0'], icon: 'talents/maga-arcanista-s16.webp', opts: [
        { k: 'A', name: 'Runa de Poder', desc: 'Dentro del Sello haces +25 % de daño (antes +15 %)', role: 'UNI', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
        { k: 'B', name: 'Sello Explosivo', desc: 'Al formarse, el Sello estalla en su área (150 % del arma)', role: 'AREA', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
      ],
      win: 'A, contra jefes. B, contra grupos' },
    { id: 'e3', name: 'Tinta de Maná', t: 'p', tag: 'mec', r: 1, c: 2, max: 1, req: ['e0'], d: ()=>'Pisar una runa tuya te da 5 de maná (una vez por runa)', icon: 'talents/maga-clase-c10.webp', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
    { id: 'e4', name: 'Palabra o Guarda', t: 'c', tag: 'mec', r: 2, c: 0, max: 1, req: ['e1', 'e2'], icon: 'talents/maga-arcanista-s8.webp', opts: [
        { k: 'A', name: 'Palabra de Poder', desc: 'Habilidad (ranura 2): escribes al instante 3 runas a tu alrededor. Se recarga en 40 s', role: 'UNI', fx: { grant: 'm_h_palabra' }, todo: 'sin impl: escribir el efecto desde el texto' },
        { k: 'B', name: 'Runa Guardiana', desc: 'Dentro del Sello recibes −20 % de daño (antes −10 %)', role: 'AGU', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
      ],
      win: 'A, para tener el Sello donde y cuando quieres (ocupa la ranura 2). B, para aguantar sin ocupar ranura' },
    { id: 'e5', name: 'Caligrafía Rápida', t: 'p', tag: 'num', r: 2, c: 1, max: 1, req: ['e2'], d: ()=>'Escribes una runa cada 2 hechizos (antes cada 3)', icon: 'talents/maga-clase-c11.webp', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
    { id: 'e6', name: 'Tinta Elemental', t: 'p', tag: 'mec', r: 2, c: 2, max: 1, req: ['e2', 'e3'], d: ()=>'Las runas toman el elemento del hechizo: Hielo ralentiza 30 %, Arcano da 1 Carga, Fuego quema', icon: 'talents/maga-crionte-s5.webp', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
    { id: 'e7', name: 'Inspiración', t: 'p', tag: 'mec', r: 3, c: 0, max: 1, req: ['e4', 'e5'], d: ()=>'Al formarse un Sello, todos tus enfriamientos bajan 2 s', icon: 'talents/maga-clase-c14.webp', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
    { id: 'e8', name: 'Glosa o Círculo', t: 'c', tag: 'mec', r: 3, c: 1, max: 1, req: ['e5'], icon: 'talents/maga-arcanista-s12.webp', opts: [
        { k: 'A', name: 'Glosa', desc: 'Los enemigos dentro del Sello reciben +10 % de daño', role: 'UNI', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
        { k: 'B', name: 'Círculo Protector', desc: 'Tú y tus aliados dentro del Sello recuperáis un 1 % de vida por segundo', role: 'AGU', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
      ],
      win: 'A, para hacer daño. B, para aguantar y para el grupo' },
    { id: 'e9', name: 'Doble Sello', t: 'p', tag: 'mec', r: 3, c: 2, max: 1, req: ['e5', 'e6'], d: ()=>'Puedes tener 2 Sellos a la vez', icon: 'talents/maga-arcanista-x1.webp', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
    { id: 'e10', name: 'Concentración', t: 'p', tag: 'num', r: 4, c: 0.5, max: 1, req: ['e7', 'e8'], d: ()=>'Dentro del Sello lanzas un 10 % más rápido', icon: 'talents/maga-clase-c11.webp', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
    { id: 'e11', name: 'Palimpsesto', t: 'p', tag: 'mec', r: 4, c: 1.5, max: 1, req: ['e8', 'e9'], d: ()=>'Al acabar, el Sello deja 3 runas nuevas: si sigues ahí, vuelve a formarse', icon: 'talents/maga-arcanista-s7.webp', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
    { id: 'e12', name: 'Gran Grimorio', t: 'f', tag: 'mec', r: 5, c: 1, max: 1, req: ['e10', 'e11'], d: ()=>'Cada 30 s, tu siguiente Sello es un Grimorio 10 s: dentro, cada hechizo se lanza dos veces (la copia al 40 %)', icon: 'talents/maga-arcanista-x3.webp', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
  ] },
];
