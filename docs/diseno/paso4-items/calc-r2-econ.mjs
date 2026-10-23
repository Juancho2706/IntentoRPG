// Economía v4 (ronda 2): una moneda de Herrería (oro), Polvo para el Códice y Chispas. node calc-r2-econ.mjs
const fint = x => Math.round(x).toLocaleString('es-CL');
const r1 = x => Math.round(x * 10) / 10;
const H = { gold: 130000, dust: 165, gems: 34, rareplus: 93, legs: 22, sparks: 0.3 };   // por hora, Nv70 T0 (grieta 10)
const FACT = { weapon: 1.5, helm: 1, chest: 1, offhand: 0.75, gloves: 0.75, belt: 0.75, boots: 0.75, amulet: 0.75, ring1: 0.6, ring2: 0.6 };
const SUMF = Object.values(FACT).reduce((a, b) => a + b, 0);
const up = (r, no, f) => 400 * (r + 1) * (1 + no / 20) * f;               // mejorar r → r+1
let upFull = 0; for (let r = 0; r < 5; r++) upFull += up(r, 47 + r, 1);
console.log('Mejorar r0→r5 (◆47→52), factor 1:', fint(upFull), '· arma', fint(upFull * 1.5), '· las 10 piezas', fint(upFull * SUMF), '=', r1(upFull * SUMF / H.gold), 'h de oro');
// Afinar: dado 1–5, te quedas con el mayor; coste 3 500·1,3^m × factor (m = afinados en la pieza)
const triesToFive = 5; // esperanza de tiradas hasta sacar un 5 (p = 0,2), sea cual sea el paso de partida
const afinarPiece = (lines, base = 3500, k = 1.3) => { let s = 0; for (let m = 0; m < lines * triesToFive; m++) s += base * Math.pow(k, m); return s; };
console.log('Afinar 3 líneas al paso 5 (15 tiradas) en una pieza de factor 1:', fint(afinarPiece(3)), '· las 10 piezas:', fint(afinarPiece(3) * SUMF), '=', r1(afinarPiece(3) * SUMF / H.gold), 'h de oro');
console.log('   2 líneas por pieza (10 tiradas):', fint(afinarPiece(2) * SUMF), '=', r1(afinarPiece(2) * SUMF / H.gold), 'h');
// ★: remate al r5 en una línea al azar de 3; mover = 10 000·1,5^k a otra al azar
const starMoves = (2 / 3) * 2;  // 1/3 cae bien; si no, cada movimiento acierta con 1/2
let starCost = 0; for (let k = 0; k < 3; k++) starCost += 10000 * Math.pow(1.5, k) * [2 / 3, 1 / 3, 1 / 6][k];
console.log('★ en la línea elegida: movimientos esperados', r1(starMoves), '· coste esperado por pieza', fint(starCost), '· 10 piezas', fint(starCost * 10));
const reroll = 3000 + 4500; // dos re-tiradas por pieza de media
const techo = upFull * SUMF + afinarPiece(3) * SUMF + starCost * 10 + reroll * 10 + 6 * 1500 * 5;
console.log('Oro hasta el techo (mejorar todo + afinar 3 líneas + ★ + 2 re-tiradas + grabar 6 r5):', fint(techo), '=', r1(techo / H.gold), 'h de oro');
// apuesta: precio para que todo el oro de una hora en UNA ranura dé ≤ 0,5 × los Raro+ de esa ranura matando
const perSlot = H.rareplus / 10;
const price = 2 * H.gold / perSlot;
console.log('Apuesta: Raro+ por ranura y hora matando', r1(perSlot), '→ precio', fint(price), '(joyería ×1,25 =', fint(price * 1.25) + ') · todo el oro de 1 h =', r1(H.gold / price), 'objetos');
console.log('   legendarios: matando', r1(H.legs / 6), 'por ranura de aspecto y hora · apostando (27 %)', r1(H.gold / price * 0.27));
// Polvo: los 6 aspectos de la build a r5
const dust6 = 6 * (25 + 25 * (1 + 2 + 3 + 4));
console.log('Polvo: 6 aspectos a r5 =', dust6, '=', r1(dust6 / H.dust), 'h (sin contar los que caen con rango alto)');
// gemas: 1 cada 2 élites (≈ 4 por grieta), grado 2–3 al 50 %; Perfecta = 9 Talladas (grado 3)
const g3eqPerType = H.gems / 6 * (0.5 / 3 + 0.5);
console.log('Gemas: grado-3 equivalentes por tipo y hora', r1(g3eqPerType), '→ 4 Perfectas de un tipo (36)', r1(36 / g3eqPerType), 'h · 3 de otro (27)', r1(27 / g3eqPerType), 'h');
console.log('Chispas: 4 →', r1(4 / H.sparks), 'h por Mítico');
