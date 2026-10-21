// ============================================================
// ÁRBOLES HÉROE (Paragon) de la clase Arquera — esqueleto v2
// ============================================================
// Generado por tools/convert-v2/convert.mjs (--write talents, E1.5) desde docs/mockups/data/talents-v2-arquera.js (sha1 76ae75357a1e, estado «diseño»).
// Formato: docs/paso2-implementacion.md §3.1 y D5 (lo importa SOLO js/talents-arquera.js, campo `hero`).
// Estructura y textos exactos (tests/test-v2-paridad.mjs); `fx: {}` + `todo` = `impl` del mockup (E2: KT).
export const ARQUERA_HERO = [
  { id: 'h1', name: 'Errante del Viento', specs: ['tiradora', 'francotiradora'], art: 'ui256/menu_viajes.webp', line: 'El viento viaja contigo: guardas Ráfagas que salen con tus flechas', key: 'Cada 4 s ganas una Ráfaga (hasta 3); tu siguiente principal o insignia suelta 1 flecha de viento por Ráfaga', prefix: 'q', nodes: [
    { id: 'q0', name: 'Ráfagas', t: 'k', tag: 'mec', r: 0, c: 1, max: 1, free: true, d: ()=>'Cada 4 s ganas una Ráfaga (hasta 3). Tu siguiente principal o insignia suelta 1 flecha de viento por Ráfaga (60 %)', icon: 'talents/arquera-tiradora-s14.webp', fx: {}, todo: 'power q_rafagas · NUEVO (contador por tiempo; afterCast de spender/spec)' },
    { id: 'q1', name: 'Brisa Constante', t: 'p', tag: 'num', r: 1, c: 0, max: 1, req: ['q0'], d: ()=>'Ganas una Ráfaga cada 3 s (antes 4 s)', icon: 'talents/arquera-tiradora-s5.webp', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
    { id: 'q2', name: 'Favor o Calma', t: 'c', tag: 'mec', r: 1, c: 1, max: 1, req: ['q0'], icon: 'talents/arquera-tiradora-s2.webp', opts: [
        { k: 'A', name: 'Viento a Favor', desc: 'Cada 15 m que recorres (rodando o saltando también) te dan una Ráfaga más', role: 'AREA', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
        { k: 'B', name: 'Aire Quieto', desc: 'Quieta, ganas una Ráfaga cada 2 s (antes 4 s)', role: 'UNI', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
      ],
      win: 'A, si juegas en movimiento, contra grupos. B, si juegas plantada, contra jefes' },
    { id: 'q3', name: 'Plumas de Aire', t: 'p', tag: 'mec', r: 1, c: 2, max: 1, req: ['q0'], d: ()=>'Las flechas de viento atraviesan a 2 enemigos', icon: 'talents/arquera-tiradora-s6.webp', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
    { id: 'q4', name: 'Torbellino o Corriente', t: 'c', tag: 'mec', r: 2, c: 0, max: 1, req: ['q1', 'q2'], icon: 'talents/arquera-tiradora-s15.webp', opts: [
        { k: 'A', name: 'Torbellino', desc: 'Habilidad (ranura 2): un torbellino de 4 m levanta 1,5 s a los enemigos y te da 3 Ráfagas. Se recarga en 40 s', role: 'CTRL', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
        { k: 'B', name: 'Corriente Protectora', desc: 'Con 3 Ráfagas guardadas, recibes un 15 % menos de daño', role: 'AGU', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
      ],
      win: 'A, para controlar grupos y tener Ráfagas a voluntad (ocupa la ranura 2). B, para sobrevivir sin ocupar ranura' },
    { id: 'q5', name: 'Aire Afilado', t: 'p', tag: 'num', r: 2, c: 1, max: 1, req: ['q2'], d: ()=>'Las flechas de viento hacen +30 % de daño', icon: 'talents/arquera-tiradora-s17.webp', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
    { id: 'q6', name: 'Empuje del Aire', t: 'p', tag: 'mec', r: 2, c: 2, max: 1, req: ['q2', 'q3'], d: ()=>'Gastar 3 Ráfagas a la vez te da 15 de tu mecánica (Impulso o Concentración)', icon: 'talents/arquera-tiradora-s1.webp', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
    { id: 'q7', name: 'Rachas', t: 'p', tag: 'mec', r: 3, c: 0, max: 1, req: ['q4', 'q5'], d: ()=>'Gastar 3 Ráfagas a la vez recarga 2 s de tu insignia', icon: 'talents/arquera-tiradora-s13.webp', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
    { id: 'q8', name: 'Certero o Abierto', t: 'c', tag: 'mec', r: 3, c: 1, max: 1, req: ['q5'], icon: 'talents/arquera-tiradora-s3.webp', opts: [
        { k: 'A', name: 'Ojo de la Racha', desc: 'Las flechas de viento buscan al enemigo con más vida y hacen +25 % a élites y jefes', role: 'UNI', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
        { k: 'B', name: 'Abanico de Aire', desc: 'Las flechas de viento salen en abanico y atraviesan a 3 enemigos', role: 'AREA', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
      ],
      win: 'A, contra jefes. B, contra grupos' },
    { id: 'q9', name: 'Aire Pesado', t: 'p', tag: 'mec', r: 3, c: 2, max: 1, req: ['q5', 'q6'], d: ()=>'Las flechas de viento ralentizan un 30 % durante 2 s', icon: 'talents/arquera-clase-c3.webp', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
    { id: 'q10', name: 'Tormenta Guardada', t: 'p', tag: 'num', r: 4, c: 0.5, max: 1, req: ['q7', 'q8'], d: ()=>'Puedes guardar hasta 5 Ráfagas (antes 3)', icon: 'talents/arquera-tiradora-x3.webp', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
    { id: 'q11', name: 'Silbido', t: 'p', tag: 'mec', r: 4, c: 1.5, max: 1, req: ['q8', 'q9'], d: ()=>'Si una flecha de viento hace crítico, te devuelve una Ráfaga (una vez por lanzamiento)', icon: 'talents/arquera-clase-c10.webp', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
    { id: 'q12', name: 'Rosa de los Vientos', t: 'f', tag: 'mec', r: 5, c: 1, max: 1, req: ['q10', 'q11'], d: ()=>'Cada 25 s, el viento ruge 6 s: ganas una Ráfaga por segundo y las flechas de viento hacen +50 %', icon: 'talents/arquera-tiradora-s0.webp', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
  ] },
  { id: 'h2', name: 'Carcaj Encantado', specs: ['tiradora', 'montaraz'], art: 'ui256/menu_coleccion.webp', line: 'Tu carcaj encanta las puntas: fuego, hielo y rayo, por turnos', key: 'Cada 6 s tu siguiente flecha lleva una punta encantada que rota: el Fuego quema, el Hielo frena y el Rayo salta', prefix: 'w', nodes: [
    { id: 'w0', name: 'Puntas Encantadas', t: 'k', tag: 'mec', r: 0, c: 1, max: 1, free: true, d: ()=>'Cada 6 s tu siguiente flecha lleva una punta que rota: Fuego (quema 200 %), Hielo (frena 40 %) o Rayo (80 %, salta a 3)', icon: 'talents/arquera-clase-c9.webp', fx: {}, todo: 'power w_puntas · NUEVO (onCast cada 6 s; rota fire/frost/lightning; una punta por enemigo cada 1 s; la quemadura se renueva; ronda 3: las tres de Desborde cuentan como una)' },
    { id: 'w1', name: 'Encantamiento Rápido', t: 'p', tag: 'num', r: 1, c: 0, max: 1, req: ['w0'], d: ()=>'Una punta encantada cada 4 s (antes 6 s)', icon: 'talents/arquera-clase-c8.webp', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
    { id: 'w2', name: 'Punta: Mayor o Repartida', t: 'c', tag: 'mec', r: 1, c: 1, max: 1, req: ['w0'], icon: 'talents/arquera-clase-c1.webp', opts: [
        { k: 'A', name: 'Punta Mayor', desc: 'La punta encantada hace +40 % y su efecto dura el doble', role: 'UNI', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
        { k: 'B', name: 'Punta Repartida', desc: 'Todas las flechas de ese disparo llevan la punta (al 30 %; una por enemigo)', role: 'AREA', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
      ],
      win: 'A, contra jefes. B, contra grupos: en un disparo de varias flechas, todas la llevan' },
    { id: 'w3', name: 'Trampa Encantada', t: 'p', tag: 'mec', r: 1, c: 2, max: 1, req: ['w0'], d: ()=>'Tus trampas, zonas y lluvias también toman la punta encantada al colocarlas', icon: 'talents/arquera-montaraz-s4.webp', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
    { id: 'w4', name: 'Desborde o Bálsamo', t: 'c', tag: 'mec', r: 2, c: 0, max: 1, req: ['w1', 'w2'], icon: 'talents/arquera-clase-c9.webp', opts: [
        { k: 'A', name: 'Desborde de Puntas', desc: 'Habilidad (ranura 2): tus 4 siguientes disparos llevan las tres puntas al 50 % (sin Trenza ni Repartida). 20 s', role: 'AREA', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
        { k: 'B', name: 'Punta Curativa', desc: 'Cada punta encantada que golpea te cura un 2 % de la vida (como mucho una vez cada 6 s)', role: 'AGU', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
      ],
      win: 'A, para un estallido de daño a voluntad (ocupa la ranura 2). B, para aguantar sin ocupar ranura' },
    { id: 'w5', name: 'Fuego Prendido', t: 'p', tag: 'num', r: 2, c: 1, max: 1, req: ['w2'], d: ()=>'La punta de Fuego quema un 50 % más', icon: 'talents/arquera-clase-c13.webp', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
    { id: 'w6', name: 'Hielo Hondo', t: 'p', tag: 'mec', r: 2, c: 2, max: 1, req: ['w2', 'w3'], d: ()=>'La punta de Hielo inmoviliza 1 s a los enemigos normales', icon: 'talents/arquera-clase-c3.webp', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
    { id: 'w7', name: 'Trenza de Puntas', t: 'p', tag: 'mec', r: 3, c: 0, max: 1, req: ['w4', 'w5'], d: ()=>'Tras Fuego, Hielo y Rayo seguidos, tu siguiente flecha estalla en 4 m (150 %)', icon: 'talents/arquera-clase-c15.webp', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
    { id: 'w8', name: 'Rayo o Escarcha', t: 'c', tag: 'mec', r: 3, c: 1, max: 1, req: ['w5'], icon: 'talents/arquera-clase-c14.webp', opts: [
        { k: 'A', name: 'Chispa Saltarina', desc: 'La punta de Rayo salta a 6 enemigos (antes 3)', role: 'AREA', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
        { k: 'B', name: 'Hielo Mordiente', desc: 'Los enemigos con la punta de Hielo reciben +15 % de tus flechas durante 4 s', role: 'UNI', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
      ],
      win: 'A, contra grupos. B, contra jefes' },
    { id: 'w9', name: 'Puntas Afines', t: 'p', tag: 'mec', r: 3, c: 2, max: 1, req: ['w5', 'w6'], d: ()=>'Cada punta encantada te da 8 de Impulso (Tiradora) o recarga 1 s de Trampa de Cepo (Montaraz)', icon: 'talents/arquera-clase-c5.webp', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
    { id: 'w10', name: 'Encantamiento Hondo', t: 'p', tag: 'num', r: 4, c: 0.5, max: 1, req: ['w7', 'w8'], d: ()=>'Las puntas encantadas hacen +25 % de daño', icon: 'talents/arquera-clase-c2.webp', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
    { id: 'w11', name: 'Punta Viva', t: 'p', tag: 'mec', r: 4, c: 1.5, max: 1, req: ['w8', 'w9'], d: ()=>'Si una punta encantada mata, la siguiente llega al instante (una vez cada 3 s)', icon: 'talents/arquera-clase-c7.webp', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
    { id: 'w12', name: 'Lluvia Encantada', t: 'f', tag: 'mec', r: 5, c: 1, max: 1, req: ['w10', 'w11'], d: ()=>'Cada 30 s, durante 6 s, tus flechas llevan una punta encantada (al 30 %; una por enemigo cada 1 s)', icon: 'skills256/lluvia_flechas.webp', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
  ] },
  { id: 'h3', name: 'Halconera', specs: ['francotiradora', 'montaraz'], art: 'ui256/menu_mascota.webp', line: 'Un halcón caza contigo: marca a la presa y cae en picado sobre ella', key: 'Un halcón cae en picado cada 6 s sobre tu blanco (100 %) y lo marca: recibe +10 % de tus flechas', prefix: 'y', nodes: [
    { id: 'y0', name: 'Halcón Cazador', t: 'k', tag: 'mec', r: 0, c: 1, max: 1, free: true, d: ()=>'Un halcón cae en picado cada 6 s sobre tu blanco (100 %) y lo marca 6 s: recibe +10 % de tus flechas', icon: 'talents/arquera-clase-c4.webp', fx: {}, todo: 'power y_halcon · NUEVO (aliado sin vida; picado = eco con marca)' },
    { id: 'y1', name: 'Alas Rápidas', t: 'p', tag: 'num', r: 1, c: 0, max: 1, req: ['y0'], d: ()=>'El halcón cae en picado cada 5 s (antes 6 s)', icon: 'talents/arquera-clase-c11.webp', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
    { id: 'y2', name: 'Picado: Hondo o Rasante', t: 'c', tag: 'mec', r: 1, c: 1, max: 1, req: ['y0'], icon: 'talents/arquera-francotiradora-s16.webp', opts: [
        { k: 'A', name: 'Picado Hondo', desc: 'El picado hace +40 % y a un jefe le llena 15 de Quebranto', role: 'UNI', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
        { k: 'B', name: 'Vuelo Rasante', desc: 'El picado barre una línea de 8 m y golpea a todos (70 %)', role: 'AREA', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
      ],
      win: 'A, contra jefes. B, contra grupos' },
    { id: 'y3', name: 'Presa Señalada', t: 'p', tag: 'mec', r: 1, c: 2, max: 1, req: ['y0'], d: ()=>'La marca del halcón cuenta como tu Punto Débil (sin el perfecto gratis) o como tu Presa (Montaraz)', icon: 'talents/arquera-francotiradora-x1.webp', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
    { id: 'y4', name: 'Llamada o Alas', t: 'c', tag: 'mec', r: 2, c: 0, max: 1, req: ['y1', 'y2'], icon: 'talents/arquera-clase-c4.webp', opts: [
        { k: 'A', name: 'Llamada del Halcón', desc: 'Habilidad (ranura 2): el halcón ataca a tu blanco 6 s (40 % cada 0,5 s), lo ciega y le llena 30 de Quebranto. 30 s', role: 'UNI', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
        { k: 'B', name: 'Alas Protectoras', desc: 'Al bajar del 40 % de vida, el halcón te cubre: recibes un 30 % menos de daño 4 s. Una vez cada 60 s', role: 'AGU', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
      ],
      win: 'A, contra jefes: daño, ceguera y Quebranto a voluntad (ocupa la ranura 2). B, para sobrevivir sin ocupar ranura' },
    { id: 'y5', name: 'Garras Afiladas', t: 'p', tag: 'num', r: 2, c: 1, max: 1, req: ['y2'], d: ()=>'El halcón hace +25 % de daño', icon: 'talents/arquera-clase-c1.webp', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
    { id: 'y6', name: 'Grito del Halcón', t: 'p', tag: 'mec', r: 2, c: 2, max: 1, req: ['y2', 'y3'], d: ()=>'El picado corta el hechizo del blanco y lo deja mudo 2 s', icon: 'talents/arquera-clase-c3.webp', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
    { id: 'y7', name: 'Cetrería', t: 'p', tag: 'mec', r: 3, c: 0, max: 1, req: ['y4', 'y5'], d: ()=>'Golpear al marcado con tu principal o tu insignia hace caer al halcón al instante (una vez cada 10 s)', icon: 'talents/arquera-francotiradora-s15.webp', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
    { id: 'y8', name: 'Bandada o Peregrino', t: 'c', tag: 'mec', r: 3, c: 1, max: 1, req: ['y5'], icon: 'talents/arquera-francotiradora-s16.webp', opts: [
        { k: 'A', name: 'Bandada', desc: 'Dos halcones más pequeños caen sobre otros enemigos (60 % cada uno)', role: 'AREA', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
        { k: 'B', name: 'Halcón Peregrino', desc: 'El picado contra un élite o un jefe hace +40 %', role: 'UNI', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
      ],
      win: 'A, contra grupos. B, contra jefes' },
    { id: 'y9', name: 'Plumas Cortantes', t: 'p', tag: 'mec', r: 3, c: 2, max: 1, req: ['y5', 'y6'], d: ()=>'El picado suelta 4 plumas a enemigos cercanos (40 % cada una)', icon: 'talents/arquera-tiradora-s6.webp', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
    { id: 'y10', name: 'Ojo Compartido', t: 'p', tag: 'mec', r: 4, c: 0.5, max: 1, req: ['y7', 'y8'], d: ()=>'La marca del halcón dura 12 s (antes 6 s) y no se pierde al marcar a otro: varios marcados a la vez', icon: 'talents/arquera-francotiradora-x2.webp', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
    { id: 'y11', name: 'Halcón Fiel', t: 'p', tag: 'mec', r: 4, c: 1.5, max: 1, req: ['y8', 'y9'], d: ()=>'Si el marcado muere, el halcón marca al siguiente y cae en picado gratis', icon: 'talents/arquera-montaraz-s15.webp', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
    { id: 'y12', name: 'Cielo de Halcones', t: 'f', tag: 'mec', r: 5, c: 1, max: 1, req: ['y10', 'y11'], d: ()=>'Cada 30 s, durante 4 s, el halcón cae en picado cada segundo y cada picado marca a otro enemigo', icon: 'talents/arquera-francotiradora-x3.webp', fx: {}, todo: 'sin impl: escribir el efecto desde el texto' },
  ] },
];
