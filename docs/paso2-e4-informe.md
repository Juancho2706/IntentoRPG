# Paso 2 · E4a — Informe del banco (B1) para la calibración (E4b)

> **Estado:** banco del catálogo 2g terminado. `balance-bench.mjs` ya no tiene motivo para estar en la cuarentena: sale verde contra su lista de pendientes (lo decide el orquestador en `tests/pending-2g.json`, que B1 no toca). Fecha: 2026-10-21. Rama `worktree-wf_d59042bf-ba3-1` (sobre `paso2-impl` 84560b8).
> **Cómo leerlo.** El §0 es el resumen. El §6 es la lista de trabajo de E4b: una fila por regla que falla, con archivo, id y número. Las cifras son **medianas de 5 semillas** (`--seeds 5`) salvo que diga «semilla 1».
> **Etiquetas de las propuestas.** `[medido]`: el número se cambió en memoria (semilla 1) y se volvió a pasar el banco. `[estimado]`: estimación lineal sobre lo medido, hay que confirmarla. `[sin número]`: ningún número solo lo arregla (se dice qué hace falta). `[límite]`: el banco no reproduce el efecto (§8). `[decisión]`: lo tiene que decidir el orquestador.
> **Decisión respetada:** los buffs, escudos y curas escalan con el rango (`RANK_BUFF_STEP`) a propósito. El banco los mide así y ninguna propuesta toca esa regla.

## 0. Resumen

1. **Los bancos.** `node tests/balance-bench.mjs` y `node tests/forge-bench.mjs` afirman con la semilla 1. Salen verdes solo si lo que falla coincide **exactamente** con `PENDING_E4B` (98 reglas) y `PENDING_FORGE` (97). Si algo nuevo se rompe o algo pendiente se arregla, fallan, y hay que actualizar la lista. Cada entrada lleva la regla, el valor medido, el objetivo y el dueño. Tiempos del modo rápido: 22–47 s y 20–44 s (según la carga de la PC). Un arnés de mutaciones comprobó que cada familia de reglas puede fallar: detecta las 39 mutaciones del banco de balance y las 18 de la forja (§1.4). `balance-regression.mjs` vigila el ritmo 1A de las tres clases.
2. **Lo estructural** (va antes que afinar números):
   - **Tres especializaciones fijan la media M:** el Cruzado (UNI ×1,95), el Piromante (UNI ×1,49 y ÁREA×5 ×1,71) y el Guardián (UNI ×1,32, ÁREA×5 ×1,79 y TTD+ en el tope de 180 s). Con ellas tan arriba, las reglas «×M» de las otras seis no se cumplen subiendo una sola habilidad. A Nv70 la distancia crece: el Piromante llega a ×2,23 y ×2,32.
   - **El Guerrero está invertido.** El Berserker, la especialización de daño, es la que menos pega de su clase (UNI ×0,97, frente a ×1,32 del Guardián y ×1,95 del Cruzado).
   - **La Arcanista y las tres especializaciones de la Arquera** están por debajo de la media en todo (UNI ×0,57–0,79; ÁREA×5 ×0,34–0,63).
   - **Forja recomendada que hace menos que la Mejora sola.** Pasa en dos especializaciones, en su propio escenario:
     - Arcanista con Haz Concentrado (`rayo_ii`): UNI 1123 frente a 1624 de la Mejora.
     - Tiradora con Abanico Abierto (`flecha_multiple_i`): UNI 1098 frente a 2287, y ÁREA×5 1883 frente a 1974.
     - La otra variante de la Flecha Múltiple, Haz Cerrado, da 3295 y 3233: gana en todo.
   - **Finales que el banco no ve o que restan:**
     - Danza Carmesí resta: la build Danza pasa de 975 a 2350 de UNI sin ella.
     - Montaña Viva baja el aguante de Sismo: TTD+ 28 s con ella, 344 s sin ella.
     - Línea Mortal no se activa nunca con la forja recomendada. Tiro Pesado pone la ventana perfecta antes de la carga completa.
     - Vaivén Eterno y Gran Cacería no cambian nada (0 %).
     - Estampida Sin Fin baja un 2 %. Tierra Santa mueve ±1 %.
   - **Marca del Tiempo.** Es el nodo clave del Cronomante y llega gratis al abrir el Paragon. Da el 18–47 % del daño de sus builds: un +30 % plano casi permanente.
   - **Definitivas fuera del 12–22 %:**
     - Furia Inmortal: 0 %. La Furia no limita al Berserker.
     - Supernova, Desgarro y Cataclismo: 5–6 %.
     - Subirlas choca con otras reglas: el jefe del Piromante muere antes de 36 s, y el golpe máximo del Desgarro y del Cataclismo pasa del 25 %.
   - **TTD+ (aguante) lo decide la vida al golpear del equipo.** Con la cubeta de sustento del 6 % por segundo, las builds que golpean a 7 enemigos sin parar no pierden vida neta (Vanguardia, Campo Minado: «∞»).
   - **La UNI de las builds de ráfaga mide la apertura.** La Ignición mata al jefe de G9 en unos 10 s, con Combustión el 84 % del combate. Por eso queda ×3,4 sobre la Brasa, y los números de duración de su final no mueven nada (§3).
3. **Cuántas reglas fallan** (medianas de 5 semillas):
   - Matriz de rol Nv50: 31.
   - G9: 27 a Nv70 y 22 a Nv100.
   - G18: 3. Berserker (15,9 puntos) y Tiradora (12,8) fallan en las 5 semillas. Arcanista (7,7 en la mediana), Guardián y Crionte, en 3 de 5; Piromante, en 2; Francotiradora y Cruzado, en 1. El G18 tiene ruido de semilla de hasta 13 puntos.
   - F1–F9: 97 (matriz completa).
   - Con la semilla 1, que es la que afirma el modo rápido, son 98 reglas del banco de balance (9 de ellas de las filas 1A de clase) y 97 de la forja.
4. **Cambios del banco en esta entrega** (§1.3):
   - `areaLevelForHero` estirada 0,1 por nivel desde el 70: Nv80 → 48 y Nv100 → 50 (antes 52 y 63); el ilvl no cambia.
   - El TTD de la matriz de rol se mide antes de simular: el Guardián daba 26 s por la postura que quedaba puesta, y son 10 s.
   - F2 mide los escenarios que faltan cuando una variante gana en todo.
   - Los dos arreglos que pedía el plan: `drCapOf` en TTD+ y el básico de la Arquera contado por `p.basicAt` con los dos botones.

## 1. El banco 2g

### 1.1 Héroes y rotación (`tests/helpers/bench-core.mjs`)

- **Héroe por build.** Usa la `build` de `talents-<clase>.js`, llenada punto a punto al nivel con `buildRanks`: clase, especialización y árbol héroe con el Paragon abierto. Además lleva:
  - la barra de `<CLASE>_SPEC_BAR`, con lo que conoce a ese nivel; si falta algo, la de reserva;
  - la forja recomendada `FORGE_RECO` (D3);
  - el tablero de glifos con sus puntos derivados (16 entre el Nv81 y el 100): el brazo ofensivo entero y después el de utilidad;
  - el equipo por perfil fijo de nivel de 2e, igual para las tres clases.
  - El óptimo suma legendarios con poder, soportes, glifos r10 y bendiciones, como en 2e.
- **Verbos.** Con la semilla de cada héroe:
  - Cargar y soltar: 60 % de aciertos en la ventana perfecta, y 90 % con Fe Serena (z19) o en la Calma Absoluta. Un fallo suelta antes de la ventana.
  - Relanzar: primero se usa la cadena abierta.
  - Postura: Muralla en TTD+ y Ariete en lo demás; quien tiene nodos de cambio cambia en cada recarga.
  - Canales mantenidos hasta su final. Los «sin fin» se sueltan con menos del 20 % de recurso o a los 10 s.
  - Plantado: el héroe no camina. La Tiradora se mueve en vaivén lateral de ±0,8 m.
  - Trampas: en el camino de la manada en ÁREA×5 y a los pies del objetivo en los demás escenarios.
  - Movilidad: entra en la rotación si golpea o deja algo por sí sola, o si la build tiene nodos que la tocan.
- **Escenarios** (2e §7.1):
  - **UNI:** jefe de 90 s de vida, 60 s de combate.
  - **ÁREA×5:** 5 comunes con vida de campeón que llegan caminando desde 8 m y se reponen.
  - **CONTROL:** 5 comunes inmortales. Mide control duro, duro + inmovilizar y lento ≥ 30 %.
  - **TTD+:** tiempo hasta perder el 50 % contra 3 élites y 4 comunes. En G9 se extrapola hasta ×10 del tope; «∞» = sin pérdida neta.
  - **APOYO:** 2 aliados fantasma detrás del héroe.
- **G9** usa las 12 builds de cada clase a Nv70 y Nv100. **G18** compara el mismo héroe a Nv80 (los 10 nodos del árbol héroe) y a Nv70 (solo el nodo clave, gratis) contra los enemigos del Nv80.

### 1.2 Reglas afirmadas

- **1A y 2b.2** (filas de clase a Nv 1/5/10/25/50 y Nv50 T10):
  - rangos de TTK y TTD por clase y de la media;
  - ratio óptimo/típico en [1,3; 15];
  - T10 más lento y más letal;
  - «solo básico» ≤ 0,6×;
  - definitiva 12–22 % del daño UNI;
  - ninguna principal trampa;
  - golpe óptimo ≤ 25 % de la vida del jefe.
- **2e** (matriz de rol a Nv50, build por defecto): la métrica de rol, por ejemplo Berserker ≥ ×1,10 de M en UNI; la mejor de su clase por ≥ 10 %; los suelos; los rangos 1A ±20 %; jefe ≤ 2× el más rápido.
  - Ya no sigue vigente el intercambio de la ranura 2: la barra es la de `SPEC_BAR`.
- **G9:** cada arquetipo gana su escenario.
  - La híbrida queda a ≥ 0,85 de la mejor en la Maga y a ≥ 0,90 en el Guerrero.
  - En la Arquera (§17.3): la híbrida no es la mejor en UNI, ÁREA×5 ni mixto; queda a ≥ 0,90 en mixto y a ≥ 0,80 en jefe y en grupos.
- **G18:** ≤ 5 puntos entre los dos árboles héroe de cada especialización.
- **F1–F9** en `forge-bench.mjs` (2f §2.6). Cada habilidad se mide en su host (§5); las piezas, como mínimo al nivel que las habilita.

### 1.3 Cambios de B1 en `js/combat-math.js` y en el banco

- **Curva hasta el 100.** `areaLevelForHero` no cambia hasta el 70 y desde ahí sube 0,1 por nivel (`AREA_LEVEL_LATE`). Del 71 al 100 el héroe solo suma el árbol héroe, el tablero y 4 puntos de clase: el DPS típico crece ×1,27 de media.
  - Con el 0,55 de antes, el área del Nv100 era 63 y un jefe de Nv100 duraba ×4.
  - `CM.itemLevel` no cambia.
  - Lo usa también `ui.js` para el % de armadura que se ve fuera de mazmorras y zonas (ver dudas).
- **Arreglos del plan:** TTD+ analítico con `CM.drCapOf(p.stats)`; con los dos botones, el básico de la Arquera se cuenta por `p.basicAt === p.simT` después del paso.
- **Fallo propio corregido:** el TTD (sin mitigación activa) de la matriz de rol se medía después de la simulación de TTD+, con la postura y los buffs aún puestos.
- **F2 con todos los escenarios.** Si una variante gana a su hermana en todo lo que se midió en el modo rápido, se miden los escenarios que faltan. Así salieron Muralla de Hielo y Haz Cerrado, que pierden en otro escenario.

### 1.4 Mutaciones (cada afirmación puede fallar)

El arnés del scratchpad (`b1/mut-bench.mjs`) corre la semilla 1 una vez. Después muta, una a una, cada familia de umbrales, medidas o datos del juego, y exige que la comparación con la lista de pendientes falle **en la familia mutada**:

- **Banco de balance:** 39 mutaciones.
  - Todas las reglas 1A, 2b.2 y 2e.
  - G9: ganar el escenario, la híbrida ≥ 0,85 y 0,90, y la regla de la Arquera.
  - G18 estricto y holgado.
  - T10 y TTD+ ≥ TTD.
  - Un dato del juego: el coeficiente de Rajar ×4 cambia 6 reglas de rol.
- **Banco de la forja:** 18 mutaciones.
  - F1–F9 estricto y holgado.
  - F6, F7 y F8 con una pieza mutada.
  - Los límites del banco.
  - La Mejora vacía de Bola de Fuego cambia sus reglas F1, F3 y F7.
- **Resultado:** a la primera, 3 mutaciones no hacían fallar nada. Eran mal elegidas: el jefe del Guardián caía dentro del rango mutado; el mixto de la Arquera a 0,999 dejaba igual lo que ya fallaba; la variante «ganadora en todo» tenía APOYO 0 × 50 = 0. Se rehicieron, y en la segunda pasada el arnés detecta las 39 y las 18 (salidas en el scratchpad: `b1/mut-bench2.txt` y `b1/mut-forge2.txt`).

## 2. Matrices de rol (Nv50 y Nv70)

- **Qué es cada columna.**
  - «×M»: frente a la media de las 9 especializaciones.
  - CONTROL: % del tiempo con control duro, con duro + inmovilizar y con lento ≥ 30 %. «Q/min»: roturas de Quebranto por minuto.
  - TTD+: con la defensa (ranura 2) a la recarga.
  - APOYO: % del DPS de un aliado que suma el héroe y cura en % de la vida del aliado por segundo.
  - Definitiva: % del daño UNI que se pierde sin ella.
  - Perfecto: % de cargas soltadas en la ventana. Plantado: % del tiempo quieto.
- **Qué se afirma.** La matriz de Nv50 se afirma con las reglas de 2e. La de Nv70 solo se informa: 2e fija sus reglas a Nv50, y a Nv70 fallarían entre 40 y 44 por semilla.


### Matriz de rol · Nv50 (típico, build por defecto, medianas de 5 semillas)

M (media de las 9): UNI 1911 · ÁREA×5 4509 · TTD+ 37,8 s.

| Especialización (build) | UNI (×M) | ÁREA×5 (×M) | CONTROL duro / +inm. / lento · Q/min | TTD+ s (×M) | APOYO DPS · cura | Jefe · élite · común (s) | TTD | Definitiva | Solo básico | Perfecto · plantado |
|---|---|---|---|---|---|---|---|---|---|---|
| Berserker (estampida) | 1854 (×0,97) | 4205 (×0,93) | 11 % / 11 % / 82 % · 2,0 | 11,4 (×0,30) | 5 % · 0,00 %/s | 51,8 · 7,5 · 1,41 | 6,6 | 0 % | ×0,34 | — · 54 % |
| Guardián (guardia) | 2529 (×1,32) | 8067 (×1,79) | 20 % / 20 % / 20 % · 3,0 | 180,0 (×4,76) | 26 % · 0,00 %/s | 39,0 · 5,8 · 1,11 | 9,5 | — | ×0,14 | — · 74 % |
| Cruzado (celestial) | 3733 (×1,95) | 6516 (×1,45) | 0 % / 0 % / 78 % · 3,0 | 15,4 (×0,41) | 8 % · 1,53 %/s | 27,5 · 4,1 · 1,22 | 6,6 | 5 % | ×0,09 | 93 % · 76 % |
| Piromante (brasa) | 2845 (×1,49) | 7692 (×1,71) | 0 % / 0 % / 0 % · 0,0 | 9,6 (×0,25) | 0 % · 0,00 %/s | 39,6 · 4,5 · 0,92 | 5,8 | 6 % | ×0,15 | — · 73 % |
| Crionte (glaciar) | 1338 (×0,70) | 5879 (×1,30) | 40 % / 40 % / 65 % · 3,0 | 56,6 (×1,50) | 8 % · 0,00 %/s | 78,0 · 4,2 · 0,88 | 5,8 | 12 % | ×0,26 | — · 86 % |
| Arcanista (rayo) | 1122 (×0,59) | 1549 (×0,34) | 0 % / 0 % / 23 % · 2,0 | 4,7 (×0,13) | 5 % · 0,00 %/s | 89,6 · 11,3 · 1,29 | 5,8 | 6 % | ×0,35 | — · 87 % |
| Francotiradora (puntodebil) | 1517 (×0,79) | 1946 (×0,43) | 0 % / 0 % / 17 % · 3,0 | 10,5 (×0,28) | 30 % · 0,00 %/s | 66,2 · 9,4 · 1,71 | 6,2 | 12 % | ×0,30 | 73 % · 79 % |
| Montaraz (zarzal) | 1161 (×0,61) | 2842 (×0,63) | 0 % / 52 % / 89 % · 3,0 | 31,2 (×0,83) | 8 % · 0,00 %/s | 93,3 · 13,2 · 1,68 | 6,2 | 22 % | ×0,50 | — · 79 % |
| Tiradora (plumas) | 1098 (×0,57) | 1883 (×0,42) | 0 % / 0 % / 18 % · 1,0 | 20,8 (×0,55) | 3 % · 0,00 %/s | 93,8 · 26,0 · 2,87 | 6,2 | 19 % | ×0,22 | — · 0 % |

### Matriz de rol · Nv70 (típico, build por defecto, medianas de 5 semillas)

M (media de las 9): UNI 4665 · ÁREA×5 13.134 · TTD+ 13,5 s.

| Especialización (build) | UNI (×M) | ÁREA×5 (×M) | CONTROL duro / +inm. / lento · Q/min | TTD+ s (×M) | APOYO DPS · cura | Jefe · élite · común (s) | TTD | Definitiva | Solo básico | Perfecto · plantado |
|---|---|---|---|---|---|---|---|---|---|---|
| Berserker (estampida) | 3693 (×0,79) | 9984 (×0,76) | 12 % / 12 % / 89 % · 2,0 | 8,9 (×0,66) | 5 % · 0,00 %/s | 63,9 · 11,0 · 1,81 | 3,6 | 0 % | ×0,29 | — · 55 % |
| Guardián (guardia) | 5121 (×1,10) | 19.055 (×1,45) | 21 % / 21 % / 21 % · 3,0 | 41,4 (×3,07) | 43 % · 0,10 %/s | 50,2 · 8,8 · 1,22 | 5,2 | — | ×0,11 | — · 70 % |
| Cruzado (celestial) | 9061 (×1,94) | 25.308 (×1,93) | 0 % / 0 % / 91 % · 3,0 | 4,4 (×0,32) | 8 % · 2,50 %/s | 27,8 · 5,2 · 0,78 | 3,6 | 6 % | ×0,06 | 95 % · 76 % |
| Piromante (brasa) | 10.402 (×2,23) | 30.417 (×2,32) | 0 % / 0 % / 48 % · 1,0 | 5,2 (×0,39) | 3 % · 0,00 %/s | 23,6 · 4,8 · 1,00 | 3,3 | 8 % | ×0,11 | — · 66 % |
| Crionte (glaciar) | 2870 (×0,62) | 18.848 (×1,44) | 47 % / 47 % / 70 % · 3,0 | 27,4 (×2,03) | 8 % · 0,00 %/s | 97,3 · 7,5 · 1,04 | 3,3 | 23 % | ×0,25 | — · 86 % |
| Arcanista (rayo) | 3244 (×0,70) | 3999 (×0,30) | 0 % / 0 % / 26 % · 2,0 | 3,1 (×0,23) | 5 % · 0,00 %/s | 80,0 · 8,7 · 1,63 | 3,3 | 7 % | ×0,24 | — · 80 % |
| Francotiradora (puntodebil) | 3371 (×0,72) | 2830 (×0,22) | 0 % / 0 % / 17 % · 3,0 | 8,2 (×0,61) | 30 % · 0,00 %/s | 77,6 · 13,2 · 1,78 | 3,5 | 8 % | ×0,24 | 80 % · 79 % |
| Montaraz (zarzal) | 1805 (×0,39) | 4337 (×0,33) | 0 % / 51 % / 89 % · 3,0 | 12,2 (×0,91) | 11 % · 0,52 %/s | 153,2 · 23,7 · 2,46 | 3,5 | 22 % | ×0,51 | — · 79 % |
| Tiradora (plumas) | 2419 (×0,52) | 3425 (×0,26) | 0 % / 0 % / 20 % · 1,0 | 10,4 (×0,77) | 3 % · 0,00 %/s | 112,9 · 34,7 · 3,55 | 3,5 | 12 % | ×0,17 | — · 0 % |


**Lectura.**

- **La M del TTD+ está inflada.** El Guardián llega al tope de 180 s en el Nv50. Sin él, la M sería 20,0 s, y las reglas «×M» de TTD+ seguirían fallando para el Berserker (×0,57), el Cruzado (×0,77) y la Francotiradora (×0,52).
- **Qué hace el daño de cada especialización.**
  - Una habilidad lleva el daño del Guardián (Terremoto, 84 %), del Cruzado (Martillo, 82 %) y de la Arcanista (Rayo, 71 %).
  - En la Francotiradora y el Montaraz, el básico (`a_disparo`) da el 42–43 %.
- **A Nv70 pesan los nodos tardíos.**
  - Piromante: Corazón del Sol (s28) da el 16 %.
  - Arcanista: la Marca del Tiempo da el 23 %.
  - Por eso esas dos especializaciones despegan.
  - El Montaraz cae a ×0,39 de UNI y tarda 153 s con el jefe.
- **El TTD sin mitigación** baja de 5,8–9,5 s (Nv50) a 3,3–5,2 s (Nv70) en las nueve. A Nv70 lo marca la curva de los enemigos y no las clases.

## 3. G9: cada arquetipo gana su escenario

### G9 · builds a Nv70 (medianas de 5 semillas; ×1,00 = la mejor de su especialización; **negrita** = el escenario que debe ganar)


**Guerrero**

| Especialización · build (árbol héroe) | UNI | ÁREA×5 | CONTROL lento (duro+inm.) | TTD+ s | APOYO cura %/s | mixto | Fallos G9 |
|---|---|---|---|---|---|---|---|
| Berserker · Estampida Sin Fin (h1) | 3693 ×0,97 | **9984 ×1,00** | 89 % ×0,93 (12 %) | 8,9 ×1,00 | 0,00 — | 0,98 | ✓ |
| Berserker · Sangre y Acero (híbrida) (h2) | 2268 ×0,59 | 7577 ×0,76 | 95 % ×1,00 (0 %) | 3,7 ×0,42 | 0,00 — | 0,68 | hibrida ×0,59 |
| Berserker · Danza Carmesí (h2) | 975 ×0,26 | 3611 ×0,36 | 3 % ×0,03 (3 %) | **5,2 ×0,59** | 0,00 — | 0,31 | ttdp ×0,59 |
| Berserker · Golpe de Gracia (h1) | **3813 ×1,00** | 6823 ×0,68 | 78 % ×0,82 (0 %) | 3,7 ×0,42 | 0,00 — | 0,84 | ✓ |
| Guardián · Guardia Total (h3) | 5121 ×0,80 | 19.055 ×0,84 | 21 % ×0,23 (21 %) | **41,4 ×0,02** | 0,10 ×0,10 | 0,82 | ttdp ×0,02 |
| Guardián · Montaña Viva (h1) | **6407 ×1,00** | 14.068 ×0,62 | 95 % ×1,00 (21 %) | 25,6 ×0,01 | 0,00 ×0,00 | 0,81 | ✓ |
| Guardián · Cabeza de Puente (h1) | 5971 ×0,93 | **22.674 ×1,00** | 89 % ×0,94 (36 %) | ∞ ×1,00 | 1,00 ×1,00 | 0,97 | ✓ |
| Guardián · Roca y Escudo (híbrida) (h3) | 4646 ×0,73 | 13.441 ×0,59 | 21 % ×0,22 (21 %) | 20,9 ×0,01 | 0,10 ×0,10 | 0,66 | hibrida ×0,01 |
| Cruzado · Tribunal (h3) | 4857 ×0,55 | **16.686 ×0,65** | 4 % ×0,04 (4 %) | 5,7 ×0,07 | 2,63 ×1,00 | 0,60 | area ×0,65 |
| Cruzado · Martillo Celestial (h2) | **8807 ×1,00** | 25.308 ×0,99 | 91 % ×1,00 (0 %) | 4,4 ×0,05 | 2,48 ×0,94 | 0,99 | ✓ |
| Cruzado · Tierra Santa (h3) | 4135 ×0,47 | 14.671 ×0,57 | 86 % ×0,94 (4 %) | 81,7 ×1,00 | **2,46 ×0,94** | 0,52 | apoyo ×0,94 |
| Cruzado · Luz y Martillo (híbrida) (h2) | 7111 ×0,81 | 25.611 ×1,00 | 88 % ×0,97 (4 %) | 7,5 ×0,09 | 1,98 ×0,75 | 0,90 | hibrida ×0,81 |

**Maga**

| Especialización · build (árbol héroe) | UNI | ÁREA×5 | CONTROL lento (duro+inm.) | TTD+ s | APOYO cura %/s | mixto | Fallos G9 |
|---|---|---|---|---|---|---|---|
| Piromante · Incendio (invoca) | 10.468 ×0,29 | **30.417 ×0,47** | 48 % ×0,49 (0 %) | 5,2 ×1,00 | 0,00 — | 0,38 | area ×0,47 |
| Piromante · Lluvia de Fuego (crono) | 9641 ×0,27 | 20.197 ×0,31 | **97 % ×1,00 (0 %)** | 2,2 ×0,43 | 0,00 — | 0,29 | ctl ×1,00 |
| Piromante · Combustión Perpetua (crono) | **35.673 ×1,00** | 64.722 ×1,00 | 98 % ×1,00 (0 %) | 2,7 ×0,53 | 0,00 — | 1,00 | ✓ |
| Piromante · Brasa Ardiente (híbrida) (invoca) | 10.775 ×0,30 | 37.173 ×0,57 | 96 % ×0,98 (0 %) | 3,7 ×0,72 | 0,00 — | 0,44 | hibrida ×0,30 |
| Crionte · Era Glacial (escriba) | 2870 ×0,17 | 18.848 ×0,55 | **70 % ×0,72 (47 %)** | 27,4 ×1,00 | 0,00 — | 0,36 | ctl ×0,72 |
| Crionte · Invierno Eterno (invoca) | 3607 ×0,21 | **12.430 ×0,36** | 98 % ×1,00 (22 %) | 6,2 ×0,23 | 0,00 — | 0,29 | area ×0,36 |
| Crionte · Cero Absoluto (escriba) | **16.854 ×1,00** | 34.244 ×1,00 | 96 % ×0,98 (29 %) | 9,2 ×0,34 | 0,00 — | 1,00 | ✓ |
| Crionte · Escarcha Quebradiza (híbrida) (invoca) | 12.989 ×0,77 | 18.421 ×0,54 | 87 % ×0,89 (31 %) | 12,5 ×0,46 | 0,00 — | 0,65 | hibrida ×0,54 |
| Arcanista · Tormenta de Cargas (crono) | **3244 ×0,91** | 3999 ×1,00 | 26 % ×0,55 (0 %) | 3,1 ×0,71 | 0,00 — | 0,95 | uni ×0,91 |
| Arcanista · Constelación (escriba) | 2978 ×0,83 | **3902 ×0,98** | 47 % ×1,00 (0 %) | 2,2 ×0,51 | 0,00 — | 0,90 | area ×0,98 |
| Arcanista · Grieta Eterna (crono) | 3584 ×1,00 | 3508 ×0,88 | 9 % ×0,20 (0 %) | **4,4 ×1,00** | 0,00 — | 0,94 | ✓ |
| Arcanista · Rayo Orbital (híbrida) (escriba) | 2172 ×0,61 | 3779 ×0,94 | 31 % ×0,64 (0 %) | 3,5 ×0,80 | 0,00 — | 0,78 | hibrida ×0,61 |

**Arquera**

| Especialización · build (árbol héroe) | UNI | ÁREA×5 | CONTROL lento (duro+inm.) | TTD+ s | APOYO cura %/s | mixto | Fallos G9 |
|---|---|---|---|---|---|---|---|
| Francotiradora · Línea Mortal (h1) | 2016 ×0,60 | **2796 ×0,60** | 18 % ×1,00 (0 %) | 7,2 ×0,88 | 0,00 — | 0,60 | area ×0,60 |
| Francotiradora · Disparo Imposible (h3) | **3371 ×1,00** | 2830 ×0,61 | 17 % ×0,96 (0 %) | 8,2 ×1,00 | 0,00 — | 0,80 | ✓ |
| Francotiradora · Atalaya Eterna (h1) | 3196 ×0,95 | 4651 ×1,00 | 17 % ×0,96 (0 %) | 7,5 ×0,91 | 0,00 — | **0,97** | ✓ |
| Francotiradora · Pulso de Hierro (híbrida) (h3) | 3053 ×0,91 | 2616 ×0,56 | 18 % ×1,00 (0 %) | 7,7 ×0,94 | 0,00 — | 0,73 | min:area ×0,56; min:mixto ×0,75 |
| Montaraz · Tierra Arrasada (h2) | 1747 ×0,67 | **3152 ×0,73** | 80 % ×0,84 (64 %) | ∞ ×1,00 | 0,00 ×0,00 | 0,70 | area ×0,73 |
| Montaraz · Gran Cacería (h3) | **1949 ×0,74** | 2595 ×0,60 | 64 % ×0,67 (64 %) | 12,2 ×0,01 | 0,00 ×0,00 | 0,67 | uni ×0,74 |
| Montaraz · Bosque Vivo (h2) | 1805 ×0,69 | 4337 ×1,00 | **89 % ×0,94 (51 %)** | 12,2 ×0,01 | 0,52 ×1,00 | 0,84 | ctl ×0,94 |
| Montaraz · Espinas de Caza (híbrida) (h3) | 2624 ×1,00 | 3719 ×0,86 | 95 % ×1,00 (51 %) | 487,4 ×0,27 | 0,00 ×0,00 | 0,93 | noBest:uni ×1,35; noBest:mixto ×1,10 |
| Tiradora · Tormenta de Plumas (h2) | 2406 ×1,00 | **3425 ×1,00** | 20 % ×1,00 (0 %) | 10,4 ×1,00 | 0,00 ×0,00 | 1,00 | ✓ |
| Tiradora · Vaivén Eterno (h1) | **1302 ×0,54** | 2678 ×0,78 | 11 % ×0,58 (0 %) | 10,2 ×0,99 | 0,00 ×0,00 | 0,66 | uni ×0,54 |
| Tiradora · Galerna Infinita (h2) | 1738 ×0,72 | 3282 ×0,96 | 18 % ×0,92 (0 %) | 7,4 ×0,71 | 0,37 ×1,00 | 0,84 | ✓ |
| Tiradora · Viento Cruzado (híbrida) (h1) | 1877 ×0,78 | 3148 ×0,92 | 7 % ×0,37 (0 %) | 8,9 ×0,86 | 0,00 ×0,00 | 0,85 | min:uni ×0,78; min:mixto ×0,85 |

### G9 · builds a Nv100 (medianas de 5 semillas; ×1,00 = la mejor de su especialización; **negrita** = el escenario que debe ganar)


**Guerrero**

| Especialización · build (árbol héroe) | UNI | ÁREA×5 | CONTROL lento (duro+inm.) | TTD+ s | APOYO cura %/s | mixto | Fallos G9 |
|---|---|---|---|---|---|---|---|
| Berserker · Estampida Sin Fin (h1) | 4301 ×0,90 | **12.108 ×1,00** | 89 % ×0,94 (12 %) | 12,1 ×1,00 | 0,00 — | 0,95 | ✓ |
| Berserker · Sangre y Acero (híbrida) (h2) | 2809 ×0,59 | 10.615 ×0,88 | 95 % ×1,00 (0 %) | 3,1 ×0,26 | 0,00 — | 0,73 | hibrida ×0,59 |
| Berserker · Danza Carmesí (h2) | 1206 ×0,25 | 5139 ×0,42 | 8 % ×0,08 (3 %) | **4,4 ×0,36** | 0,00 — | 0,34 | ttdp ×0,36 |
| Berserker · Golpe de Gracia (h1) | **4781 ×1,00** | 8683 ×0,72 | 77 % ×0,81 (0 %) | 3,4 ×0,28 | 0,00 — | 0,86 | ✓ |
| Guardián · Guardia Total (h3) | 4965 ×0,65 | 19.873 ×0,77 | 34 % ×0,36 (34 %) | **1581,9 ×0,88** | 1,07 ×1,00 | 0,71 | ttdp ×0,88 |
| Guardián · Montaña Viva (h1) | **7685 ×1,00** | 17.626 ×0,68 | 95 % ×1,00 (21 %) | ∞ ×1,00 | 0,02 ×0,02 | 0,84 | ✓ |
| Guardián · Cabeza de Puente (h1) | 6826 ×0,89 | **25.767 ×1,00** | 91 % ×0,96 (36 %) | ∞ ×1,00 | 0,93 ×0,87 | 0,94 | ✓ |
| Guardián · Roca y Escudo (híbrida) (h3) | 4841 ×0,63 | 13.870 ×0,54 | 32 % ×0,33 (32 %) | 236,6 ×0,13 | 1,02 ×0,95 | 0,58 | hibrida ×0,13 |
| Cruzado · Tribunal (h3) | 6662 ×0,58 | **22.982 ×0,71** | 4 % ×0,04 (4 %) | 4,9 ×0,00 | 2,67 ×1,00 | 0,64 | area ×0,71 |
| Cruzado · Martillo Celestial (h2) | **11.473 ×1,00** | 31.375 ×0,97 | 92 % ×0,95 (0 %) | 1,9 ×0,00 | 2,51 ×0,94 | 0,98 | ✓ |
| Cruzado · Tierra Santa (h3) | 4963 ×0,43 | 17.163 ×0,53 | 96 % ×1,00 (17 %) | 1653,8 ×1,00 | **2,51 ×0,94** | 0,48 | apoyo ×0,94 |
| Cruzado · Luz y Martillo (híbrida) (h2) | 8708 ×0,76 | 32.431 ×1,00 | 89 % ×0,93 (4 %) | 4,4 ×0,00 | 2,10 ×0,79 | 0,88 | hibrida ×0,76 |

**Maga**

| Especialización · build (árbol héroe) | UNI | ÁREA×5 | CONTROL lento (duro+inm.) | TTD+ s | APOYO cura %/s | mixto | Fallos G9 |
|---|---|---|---|---|---|---|---|
| Piromante · Incendio (invoca) | 15.386 ×0,35 | **44.102 ×0,62** | 45 % ×0,46 (0 %) | 5,1 ×1,00 | 0,00 — | 0,48 | area ×0,62 |
| Piromante · Lluvia de Fuego (crono) | 13.849 ×0,32 | 27.266 ×0,38 | **97 % ×1,00 (0 %)** | 2,5 ×0,49 | 0,00 — | 0,35 | ctl ×1,00 |
| Piromante · Combustión Perpetua (crono) | **43.615 ×1,00** | 71.634 ×1,00 | 98 % ×1,00 (0 %) | 2,7 ×0,54 | 0,00 — | 1,00 | ✓ |
| Piromante · Brasa Ardiente (híbrida) (invoca) | 13.593 ×0,31 | 40.456 ×0,56 | 95 % ×0,97 (2 %) | 3,9 ×0,76 | 0,00 — | 0,44 | hibrida ×0,31 |
| Crionte · Era Glacial (escriba) | 4028 ×0,13 | 24.729 ×0,54 | **72 % ×0,73 (47 %)** | 25,9 ×1,00 | 1,73 ×1,00 | 0,34 | ctl ×0,73 |
| Crionte · Invierno Eterno (invoca) | 5151 ×0,16 | **15.022 ×0,33** | 99 % ×1,00 (21 %) | 6,1 ×0,24 | 0,00 ×0,00 | 0,25 | area ×0,33 |
| Crionte · Cero Absoluto (escriba) | **31.592 ×1,00** | 45.487 ×1,00 | 98 % ×1,00 (26 %) | 17,2 ×0,67 | 0,00 ×0,00 | 1,00 | ✓ |
| Crionte · Escarcha Quebradiza (híbrida) (invoca) | 18.541 ×0,59 | 26.597 ×0,58 | 86 % ×0,87 (32 %) | 13,6 ×0,53 | 0,00 ×0,00 | 0,59 | hibrida ×0,58 |
| Arcanista · Tormenta de Cargas (crono) | **4933 ×1,00** | 5761 ×1,00 | 26 % ×0,52 (0 %) | 3,1 ×0,80 | 0,00 — | 1,00 | ✓ |
| Arcanista · Constelación (escriba) | 3742 ×0,76 | **5330 ×0,93** | 50 % ×1,00 (0 %) | 2,5 ×0,64 | 0,00 — | 0,84 | area ×0,93 |
| Arcanista · Grieta Eterna (crono) | 4513 ×0,91 | 4900 ×0,85 | 22 % ×0,44 (0 %) | **3,9 ×1,00** | 0,00 — | 0,88 | ✓ |
| Arcanista · Rayo Orbital (híbrida) (escriba) | 2776 ×0,56 | 4998 ×0,87 | 35 % ×0,70 (0 %) | 3,5 ×0,90 | 0,00 — | 0,72 | hibrida ×0,56 |

**Arquera**

| Especialización · build (árbol héroe) | UNI | ÁREA×5 | CONTROL lento (duro+inm.) | TTD+ s | APOYO cura %/s | mixto | Fallos G9 |
|---|---|---|---|---|---|---|---|
| Francotiradora · Línea Mortal (h1) | 2680 ×0,61 | **3717 ×0,74** | 42 % ×1,00 (0 %) | 5,5 ×0,72 | 0,00 — | 0,68 | area ×0,74 |
| Francotiradora · Disparo Imposible (h3) | **4381 ×1,00** | 4397 ×0,87 | 17 % ×0,41 (0 %) | 7,6 ×1,00 | 0,00 — | 0,94 | ✓ |
| Francotiradora · Atalaya Eterna (h1) | 3867 ×0,88 | 5034 ×1,00 | 17 % ×0,41 (0 %) | 5,7 ×0,75 | 0,00 — | **0,94** | ✓ |
| Francotiradora · Pulso de Hierro (híbrida) (h3) | 3831 ×0,87 | 4042 ×0,80 | 18 % ×0,43 (0 %) | 6,4 ×0,83 | 0,00 — | 0,84 | min:mixto ×0,89 |
| Montaraz · Tierra Arrasada (h2) | 2244 ×0,72 | **3552 ×0,66** | 87 % ×0,94 (67 %) | ∞ ×1,00 | 0,00 ×0,00 | 0,69 | area ×0,66 |
| Montaraz · Gran Cacería (h3) | **2569 ×0,82** | 3221 ×0,60 | 82 % ×0,89 (59 %) | 12,1 ×0,01 | 0,00 ×0,00 | 0,71 | uni ×0,82 |
| Montaraz · Bosque Vivo (h2) | 2350 ×0,75 | 5361 ×1,00 | **92 % ×1,00 (60 %)** | 6,9 ×0,00 | 0,67 ×1,00 | 0,87 | ✓ |
| Montaraz · Espinas de Caza (híbrida) (h3) | 3135 ×1,00 | 4589 ×0,86 | 91 % ×0,98 (52 %) | 517,3 ×0,29 | 0,00 ×0,00 | 0,93 | noBest:uni ×1,22; noBest:mixto ×1,06 |
| Tiradora · Tormenta de Plumas (h2) | 2768 ×1,00 | **4242 ×1,00** | 24 % ×0,86 (3 %) | 9,2 ×1,00 | 0,00 ×0,00 | 1,00 | ✓ |
| Tiradora · Vaivén Eterno (h1) | **1982 ×0,72** | 3447 ×0,81 | 14 % ×0,48 (0 %) | 9,2 ×1,00 | 0,00 ×0,00 | 0,76 | uni ×0,72 |
| Tiradora · Galerna Infinita (h2) | 2240 ×0,81 | 4177 ×0,98 | 22 % ×0,78 (0 %) | 6,2 ×0,68 | 0,37 ×1,00 | 0,90 | ✓ |
| Tiradora · Viento Cruzado (híbrida) (h1) | 2729 ×0,99 | 4193 ×0,99 | 28 % ×1,00 (0 %) | 8,2 ×0,89 | 0,00 ×0,00 | 0,99 | ✓ |


**Diagnóstico por especialización** (las propuestas, en el §6):

- **Piromante.** Combustión Perpetua (Ignición) gana todo: UNI ×3,4 de la Brasa y ÁREA×5 ×2,1.
  - Ablación a Nv70, semilla 1 [medido]:
    - sin Pirotecnia (s12, `critFireCdr`): la Ignición pasa de 36.923 a 14.912 de UNI;
    - sin Combustión (s23): a 22.126;
    - sin Perpetua (s26): a 22.981.
  - La Ignición mata al jefe de G9 en ~10 s con Combustión el 84 % del combate. Por eso la duración de la Combustión (`calor.combustion.base` 1,5 → 0) y la extensión de la Perpetua (`perpetuaExt` 3 → 0) no cambian ni una cifra [medido].
  - Pirotecnia a 0,25 baja la Ignición a 28.556 y la Brasa del Nv50 a ×1,32/×1,52 de M. Ayuda a la M, pero no a G9 [medido].
- **Crionte.** Cero Absoluto (Fractura) gana UNI y ÁREA×5; Invierno Eterno solo hace 12.400 de ÁREA×5. No baja el ÁREA×5 de la Fractura por debajo de 30.000 [medido]:
  - ni la Lanza del Invierno (`lanzaInvierno` 4 → 2: la Fractura pasa de 18.403 a 8.848 de UNI y de 34.244 a 32.302 de ÁREA×5);
  - ni Cero Absoluto (`ceroCoef` 3 → 0: 30.241 de ÁREA×5).
  - Lo que falla es el Invierno Eterno, que se queda corto.
  - Era Glacial pierde CONTROL contra Invierno Eterno porque la métrica de G9 es el lento ≥ 30 %, que casi todas saturan (§8).
- **Arcanista.**
  - Tormenta de Cargas (Rayo) gana el ÁREA×5 que debería ganar Constelación (×0,98 y ×0,93): las cuatro builds dan entre 3.500 y 4.000.
  - Rayo Orbital (híbrida) se queda en ×0,56–0,61 de UNI.
  - La Marca del Tiempo da a las dos builds Cronomante un 18–47 % del daño.
- **Berserker.**
  - Danza Carmesí resta: sin el final (b25), la build Danza pasa de 975 a 2.350 de UNI [medido]. La furia por segundo y su tope no influyen.
  - Danza pierde TTD+ contra Estampida (×0,59 y ×0,36), y Sangre y Acero queda a ×0,59.
- **Guardián.** Cabeza de Puente no pierde vida (TTD+ «∞») a Nv70, y Guardia Total se queda en 41 s.
  - Montaña Viva baja el TTD+ de Sismo de 344 a 28 s [medido].
  - A Nv100, Sismo y Cabeza de Puente llegan al «∞».
- **Cruzado.**
  - Tribunal pierde el ÁREA×5 contra Luz y Martillo (×0,65–0,71). Subir el % del Tribunal baja su área, porque el ÁREA×5 se satura de golpes [medido].
  - Tierra Santa pierde APOYO por un 6 %: sus zonas no alcanzan a los aliados fantasma (§8).
- **Tiradora.**
  - Vaivén Eterno no aporta nada: 43 s de Vendaval y 8 Andanadas, y el mismo daño que sin él.
  - A Nv100, con la semilla 1, la híbrida Viento Cruzado es la mejor en todo por un 0–3 %, y la Arquera lo prohíbe (§17.3). En la mediana empata (×0,99).
- **Francotiradora.**
  - Línea Mortal no se activa nunca. Con Tiro Pesado la ventana perfecta es [2,15; 2,35] s y la carga máxima 2,5 s, así que la build suelta como mucho al 94 % de la carga.
  - Con el umbral al 85 %, la build solo gana un 4 % de UNI [medido], porque el haz es débil (20 %).
- **Montaraz.**
  - Gran Cacería no hace nada: nunca hay 2 trampas propias a la vez (el máximo es 1).
  - La híbrida Espinas de Caza es la mejor en UNI (×1,22–1,35) y en mixto, lo que la Arquera prohíbe.
  - Tierra Arrasada pierde el ÁREA×5 contra Bosque Vivo.

## 4. G18: los dos árboles héroe de cada especialización

### G18 · aporte del árbol héroe (Nv80 frente a Nv70, enemigos del Nv80; media de UNI y ÁREA×5; medianas de 5 semillas)

| Especialización | Árbol A (builds) | Árbol B (builds) | Diferencia | G18 (≤ 5 puntos) |
|---|---|---|---|---|
| Berserker | Titán +7,0 % (estampida, gracia) | Gladiador +22,9 % (hibrido, danza) | 15,9 | ✗ |
| Guardián | Caudillo +1,2 % (guardia, hibguard) | Titán +5,4 % (sismo, vanguardia) | 4,2 | ✓ |
| Cruzado | Caudillo +8,9 % (tribunal, santa) | Gladiador +12,4 % (celestial, hibcruz) | 3,5 | ✓ |
| Piromante | Invocadora +18,0 % (brasa, hibrido) | Cronomante +15,7 % (cataclismo, ignicion) | 2,3 | ✓ |
| Crionte | Escriba Rúnica +15,4 % (glaciar, fractura) | Invocadora +11,8 % (tormenta, hibcrio) | 3,5 | ✓ |
| Arcanista | Cronomante +19,2 % (rayo, grieta) | Escriba Rúnica +27,0 % (orbe, hibarca) | 7,7 | ✗ |
| Francotiradora | Errante del Viento +11,8 % (perforacion, vigia) | Halconera +8,1 % (puntodebil, pulso) | 3,7 | ✓ |
| Montaraz | Carcaj Encantado +10,5 % (campo, zarzal) | Halconera +9,4 % (caceria, espinas) | 1,2 | ✓ |
| Tiradora | Carcaj Encantado +9,1 % (plumas, galerna) | Errante del Viento +21,9 % (vaiven, cruzado) | 12,8 | ✗ |


- **Ruido de semilla.** El aporte del árbol se mide como la diferencia entre dos héroes del mismo nivel, y por eso cambia con la semilla:
  - el Piromante da 15,2 puntos con la semilla 1 y 2,3 en la mediana;
  - el Crionte, 10,5 y 3,5.
  - Solo el Berserker y la Tiradora fallan en las 5 semillas.
  - Antes de tocar un árbol por el G18, conviene pasar `--seeds 5`.
- **Berserker.** El Gladiador (+23 %) es el árbol de la Danza y la híbrida; el Titán aporta +7 %. Ningún número solo lo arregla [medido]:
  - el Titán t10 (`@spender dmg` 12 → 45) deja 10,9 puntos;
  - la Gloria del Gladiador (`pct` 4 → 1) deja 12,5.
- **Arcanista.** La Escriba Rúnica (+27 %) va por delante del Cronomante (+19 %).
  - Bajar e8A `sealVuln` de 10 a 7 deja 4,1 puntos con la semilla 1 [medido], pero a 6 dio 5,9 y a 5 dio 4,8: el ruido es del tamaño del cambio.
  - Bajar la Marca del Tiempo (`marcaPct` 30 → 20) cierra el G18 (2,2 puntos), pero abre un fallo nuevo: Constelación queda a ×0,81 en ÁREA×5 [medido].
- **Tiradora.** Errante del Viento (+22 %) sobre Carcaj Encantado (+9 %).
  - Ni el movimiento del viento ni el daño de la punta bajan de 9 puntos [medido: 9,0–11,4].

## 5. Forja: F1–F9 por habilidad

- **Cómo leer la tabla.**
  - «Mejora: a → b»: el daño propio (o la métrica) de la habilidad en su escenario principal, sin la Mejora y con ella.
  - «I/II»: cada variante en el escenario de su papel, frente a su hermana.
  - Fallos:
    - F1: la variante gana a su hermana en su papel por ≥ 8 %.
    - F2a: ninguna variante gana en todos los escenarios.
    - F2b: una variante sube la rotación UNI ≤ +20 % sobre la Mejora.
    - F3: la Mejora aporta +5–15 %.
    - F4: una variante de daño da ≤ 2 puntos al grupo.
    - F5: la generación de recurso sube ≤ +25 %.
    - F6: las zonas tienen límite.
    - F7: nada deja de hacer algo.
    - F8: alguna variante supera a la Mejora sola.
    - F9: la definitiva da el 12–22 % y «solo básico» ≤ 0,6×.
  - Números a Nv50 o al nivel que habilita la pieza (medianas de 5 semillas).
- **Los «0 %» de F3** suelen ser Mejoras que el banco no ve: alcance, velocidad, una cura a vida llena o un radio que la manada no aprovecha. Van como `[límite]` en el §6.

### Forja · Guerrero (Nv50, medianas de 5 semillas; matriz completa: `node tests/forge-bench.mjs --report --class guerrero`)

| Habilidad (host) | Escenario ppal. | Mejora | I (papel) | II (papel) | Fallos F1–F9 |
|---|---|---|---|---|---|
| Tajo `g_tajo` (Guardián · lmb) | ÁREA | Filo Ancho: 141 → 203 | Desgarro (I UNI): 364 frente a 227 | Siega (II AREA): 265 frente a 197 | F3 44 % |
| Hendidura `g_hendidura` (Berserker · rmb) | ÁREA | Arco Amplio: 1791 → 2051 | Rompefilas (I UNI): 845 frente a 709 | Grieta (II AREA): 2146 frente a 2058 | F1 4 % |
| Embestida `embestida` (Berserker · k1) | — | Carga Fiera: — | Carnero (I CTRL): 82 % frente a 82 % | Doble Carga (MOV) | F1 2 %; F8 |
| Piel de Hierro `g_piel` (Berserker · k2) | TTD+ | Acero Templado: 11,4 → 11,4 | Espinas (I AREA): 4210 frente a 4233 | Inamovible (II AGU): 13,1 frente a 11,4 | F3 0 % |
| Lanza Arrojadiza `g_lanza` (Berserker · rmb) | UNI | Punta de Arpón: 422 → 422 | Arpón (I CTRL): 73 % frente a 73 % | Jabalinas (II AREA): 672 frente a 468 | F2b 49 %; F3 0 % |
| Remolino Sangriento `g_remolino` (Berserker · k3) | ÁREA | Giro Firme: 1065 → 1065 | Remolino Anclado (I UNI): 582 frente a 386 | Ciclón (II CTRL): 82 % frente a 82 % | F3 0 % |
| Salto Devastador `g_salto` (Berserker · k1) | — | Caída Pesada: — | Caída Atronadora (I CTRL): 88 % frente a 82 % | Salto Rasante (MOV) | ✓ |
| Rajar `g_rajar` (Berserker · rmb) | UNI | Filo Encadenado: 1070 → 1085 | Estocada Final (I UNI): 1426 frente a 958 | Molino (II AREA): 1670 frente a 2003 | F1 -20 %; F3 1 % |
| Furia Inmortal `g_u_furia` (Berserker · k4) | UNI | Sin Freno: 1823 → 1854 | Sed Voraz (I AGU): 11,4 frente a 11,4 | Frenesí (II UNI): 1854 frente a 1854 | F1 0 %; F1; F8; F3; F9:ult:g_u_furia 0 %; F9:ult 0 %; F9:ult 0 % |
| Cambio de Guardia `g_guardia` (Guardián · k3) | UNI | Guardia Ligera: 2676 → 2523 | Guardia Compartida (I APO): 0,27 frente a 0,19 | Guardia Opresiva (II CTRL): 20 % frente a 20 % | F1; F3 -105 % |
| Carga de Escudo `g_carga_escudo` (Guardián · k1) | — | Avance Largo: — | Arrollador (I CTRL): 20 % frente a 0 % | Carga Veloz (MOV) | F2b 22 % |
| Terremoto `terremoto` (Guardián · rmb) | ÁREA | Suelo Partido: 7080 → 7408 | Martinete (I UNI): 2661 frente a 578 | Falla (II AREA): 3076 frente a 8231 | F1 -168 %; F2b 22 %; F3 5 % |
| Ciudadela `g_u_ciudadela` (Guardián · k4) | UNI | Muros Altos: 2563 → 2523 | Ciudadela Andante (MOV) | Empalizada (II AREA): 8067 frente a 8067 | F1 0 %; F8; F3 |
| Juicio `g_juicio` (Cruzado · k3) | UNI | Juicio Amplio: 83 → 83 | Sentencia (I UNI): 101 frente a 195 | Tres Juicios (II AREA): 631 frente a 81 | F1 -93 %; F4 29 %; F3 0 % |
| Sendero de Luz `g_sendero` (Cruzado · k1) | — | Huella de Luz: — | Escolta de Luz (I APO): 0,23 frente a 0,23 | Destello Doble (MOV) | F8 |
| Martillo de Guerra `g_martillo` (Cruzado · rmb) | ÁREA | Mano Ágil: 4560 → 5029 | Martillo Arrojado (I UNI): 3179 frente a 3000 | Onda Sagrada (II AREA): 4985 frente a 1550 | F1 6 % |
| Cataclismo `g_u_cataclismo` (Cruzado · k4) | ÁREA | Columna Ancha: 661 → 667 | Rayo del Cielo (I UNI): 157 frente a 77 | Amanecer (II APO): 0,33 frente a 0,23 | F3 1 %; F9:ult:g_u_cataclismo 3 %; F9:ult 4 %; F9:ult 2 % |

### Forja · Maga (Nv50, medianas de 5 semillas; matriz completa: `node tests/forge-bench.mjs --report --class maga`)

| Habilidad (host) | Escenario ppal. | Mejora | I (papel) | II (papel) | Fallos F1–F9 |
|---|---|---|---|---|---|
| Dardo Arcano `m_dardo` (Crionte · lmb) | UNI | Dardo Veloz: 327 → 321 | Saeta Ígnea (I AREA): 379 frente a 342 | Saeta Gélida (II CTRL): 65 % frente a 65 % | F1 0 %; F3 -2 % |
| Bola de Fuego `bola_fuego` (Piromante · rmb) | ÁREA | Núcleo Inestable: 1449 → 2581 | Pirodardo (I UNI): 1010 frente a 690 | Racimo (II AREA): 2507 frente a 3123 | F1 -25 %; F3 78 % |
| Parpadeo `m_parpadeo` (Arcanista · k1) | — | Salto Largo: — | Doble Parpadeo (MOV) | Parpadeo Disruptor (II CTRL): 35 % frente a 23 % | ✓ |
| Barrera de Maná `m_barrera` (Arcanista · k2) | TTD+ | Burbuja Estable: 4,7 → 4,7 | Barrera Gélida (I CTRL): 22 % frente a 22 % | Coraza Arcana (II UNI): 1136 frente a 1087 | F3 0 % |
| Nova de Hielo `nova_hielo` (Crionte · k2) | CTRL | Escarcha Profunda: 64 % → 65 % | Corazón de Hielo (I AGU): 19,1 frente a 11,5 | Nova Fracturante (II UNI): 199 frente a 169 | ✓ |
| Llamarada `p_llamarada` (Piromante · k3) | ÁREA | Llama Ancha: 1254 → 1381 | Lanza de Llamas (I UNI): 613 frente a 604 | Erupción (II AREA): 1748 frente a 1014 | F1 2 % |
| Estela Ígnea `m_estela_ignea` (Piromante · k1) | — | Rastro Ardiente: — | Senda de Llamas (I AREA): 205 frente a 91 | Muro de Llamas (II CTRL): 0 % frente a 0 % | ✓ |
| Meteoro `meteoro` (Piromante · k2) | ÁREA | Puntería Ígnea: 2587 → 2599 | Lluvia de Meteoritos (I AREA): 2807 frente a 1856 | Meteoro Ancestral (II UNI): 412 frente a 1264 | F1 -207 %; F2b 45 %; F4 5 %; F3 0 % |
| Supernova `m_u_supernova` (Piromante · k4) | ÁREA | Gravedad Solar: 507 → 523 | Sol Errante (I AREA): 311 frente a 536 | Colapso (II UNI): 145 frente a 213 | F1 -72 %; F1 -47 %; F8; F3 3 %; F9:ult:m_u_supernova 6 %; F9:ult 7 %; F9:ult 5 % |
| Prisión de Hielo `k_prision` (Crionte · k3) | CTRL | Celda Amplia: 65 % → 65 % | Celda Lejana (I UNI): 58 frente a 57 | Muralla de Hielo (II CTRL): 61 % frente a 61 % | F1 3 %; F8; F3 0 % |
| Paso de Escarcha `m_paso_escarcha` (Crionte · k1) | — | Hielo Duradero: — | Paso Doble (MOV) | Prisión Fugaz (II CTRL): 65 % frente a 64 % | F8 |
| Lanza de Hielo `k_lanza` (Crionte · rmb) | UNI | Punta Afilada: 472 → 514 | Lanza Pesada (I UNI): 719 frente a 373 | Abanico Gélido (II AREA): 5042 frente a 1057 | ✓ |
| Tormenta Glacial `m_u_tormenta` (Crionte · k4) | ÁREA | Ojo Tranquilo: 97 → 97 | Ventisca Anclada (I AREA): 908 frente a 189 | Granizo (II UNI): 81 frente a 161 | F1 -98 %; F3 0 %; F9:ult:m_u_tormenta 12 %; F9:ult 12 %; F9:ult 6 % |
| Orbe Arcano `a_orbe` (Arcanista · k3) | UNI | Orbe Grande: 224 → 224 | Orbe Veloz (I UNI): 85 frente a 265 | Orbe Gemelo (II AREA): 322 frente a 200 | F1 -211 %; F8; F3 0 % |
| Sello del Archimago `a_sello` (Arcanista · k2) | UNI | Sello Firme: 1118 → 1123 | Sello Ofensivo (I UNI): 1189 frente a 1122 | Sello de Contención (II CTRL): 47 % frente a 23 % | F5 37 %; F3 30 % |
| Rayo `rayo` (Arcanista · rmb) | ÁREA | Rayo Largo: 1872 → 1872 | Rayo en Cadena (I AREA): 2455 frente a 971 | Haz Concentrado (II UNI): 800 frente a 978 | F1 -22 %; F3 0 % |
| Desgarro Arcano `m_u_desgarro` (Arcanista · k4) | UNI | Desgarro Estable: 71 → 71 | Brecha (I AREA): 111 frente a 68 | Quiebre (II UNI): 64 frente a 42 | F3 0 %; F9:ult:m_u_desgarro 6 %; F9:ult 4 %; F9:ult 6 % |

### Forja · Arquera (Nv50, medianas de 5 semillas; matriz completa: `node tests/forge-bench.mjs --report --class arquera`)

| Habilidad (host) | Escenario ppal. | Mejora | I (papel) | II (papel) | Fallos F1–F9 |
|---|---|---|---|---|---|
| Disparo Rápido `a_disparo` (Francotiradora · lmb) | UNI | Mano Rápida: 599 → 625 | Disparo Disperso (I AREA): 224 frente a 411 | Flecha de Cicuta (II UNI): 630 frente a 228 | F1 -84 %; F3 4 % |
| Flecha Perforante `flecha_perforante` (Francotiradora · rmb) | UNI | Astil de Fresno: 261 → 261 | Flecha Explosiva (I AREA): 564 frente a 636 | Tiro de Precisión (II UNI): 331 frente a 261 | F1 -13 %; F3 0 % |
| Paso Veloz `a_paso` (Francotiradora · k1) | — | Ágil: — | Rodar y Disparar (I UNI): 1517 frente a 1327 | Doble Rodada (MOV) | ✓ |
| Bomba de Humo `a_humo` (Montaraz · k2) | TTD+ | Humo Espeso: 31,2 → 31,2 | Humo Venenoso (I AREA): 2942 frente a 2842 | Estallido de Humo (II CTRL): 89 % frente a 88 % | F3 0 % |
| Lluvia de Flechas `lluvia_flechas` (Montaraz · k2) | ÁREA | Cielo Plomizo: 439 → 555 | Aguacero (I UNI): 320 frente a 260 | Cortina (II AGU): 11,5 frente a 6,4 | F3 26 % |
| Andanada `a_t_andanada` (Tiradora · k3) | ÁREA | Arco Ancho: 45 → 42 | Andanada Cerrada (I UNI): 78 frente a 46 | Andanada Repulsora (II CTRL): 18 % frente a 11 % | F3 -8 % |
| Carrera del Viento `a_v_carrera` (Tiradora · k1) | — | Galope: — | Carrera Certera (I UNI): 183 frente a 169 | Carrera Esquiva (II AGU): 20,8 frente a 12,5 | F8 |
| Flecha Múltiple `flecha_multiple` (Tiradora · rmb) | ÁREA | Alcance Largo: 558 → 558 | Abanico Abierto (I AREA): 474 frente a 1864 | Haz Cerrado (II UNI): 2957 frente a 622 | F1 -293 %; F2b 44 %; F3 0 % |
| Diluvio de Saetas `a_u_diluvio` (Tiradora · k4) | ÁREA | Nube Ancha: 132 → 370 | Diluvio Anclado (I AREA): 955 frente a 397 | Saetas Pesadas (II UNI): 273 frente a 203 | F3 180 %; F9:ult 23 % |
| Disparo Apuntado `a_t_apuntado` (Francotiradora · k3) | UNI | Tensado Rápido: 392 → 377 | Tres Saetas (I AREA): 414 frente a 342 | Tiro Pesado (II UNI): 465 frente a 377 | F3 -4 % |
| Rodilla en Tierra `a_f_rodilla` (Francotiradora · k2) | UNI | Rodilla Firme: 1409 → 1457 | Puesto Fijo (I UNI): 1517 frente a 1457 | Parapeto (II AGU): 4,2 frente a 2,6 | F3 105 % |
| Tiro Rastreador `a_f_rastreador` (Francotiradora · rmb) | UNI | Marca Duradera: 238 → 238 | Rastreo Múltiple (I AREA): 221 frente a 206 | Grillete (II CTRL): 17 % frente a 0 % | F1 7 %; F3 0 % |
| Tiro Celestial `a_u_celeste` (Francotiradora · k4) | UNI | Cielo Abierto: 215 → 215 | Lluvia Estelar (I AREA): 301 frente a 1083 | Haz Único (II UNI): 171 frente a 83 | F1 -260 %; F3 0 %; F9:ult 6 %; F9:ult 12 % |
| Trampa de Cepo `a_t_cepo` (Montaraz · k3) | CTRL | Muelles Firmes: 85 % → 86 % | Mina de Espinas (I AREA): 130 frente a 20 | Red de Caza (II CTRL): 89 % frente a 85 % | F3 19 % |
| Salto de Acecho `a_m_acecho` (Montaraz · k1) | — | Acecho Lejano: — | Acecho Enredador (I CTRL): 89 % frente a 87 % | Doble Acecho (MOV) | ✓ |
| Flecha Detonante `a_m_detonante` (Montaraz · rmb) | ÁREA | Pólvora Fina: 753 → 1041 | Detonación en Cadena (I AREA): 1041 frente a 275 | Flecha de Garfio (II CTRL): 90 % frente a 89 % | F3 38 % |
| Cerco de Zarzas `a_u_zarzas` (Montaraz · k4) | CTRL | Espinas Duraderas: 86 % → 88 % | Jaula de Espinas (I UNI): 256 frente a 204 | Señuelo de Zarzas (II AGU): 13,5 frente a 31,2 | F3 37 %; F9:ult 22 % |

## 6. Propuestas para E4b, por clase

- **Formato.** Una fila por regla o por grupo de reglas con la misma causa.
  - «Medido → objetivo» va en mediana, salvo las filas 1A, que solo se miden con la semilla 1.
  - La propuesta es **un** número: archivo · id · campo · de → a. Si el número sale en la línea de la pieza o del nodo, la línea cambia con él.
  - Las etiquetas son las de la cabecera.
- **Orden recomendado para E4b.**
  1. Primero las tres que fijan la M: Martillo, Terremoto y Pirotecnia.
  2. Después, las reglas «×M» de las demás especializaciones.
  3. Por último, la forja.
- **Paquete probado en bloque [medido, semilla 1].**
  - Contenido:
    - Martillo 2,3;
    - Terremoto 1,3;
    - Meteoro 2,6;
    - `rayo_ii` 1,7;
    - `flecha_multiple_i` 0,95;
    - Tormenta 0,95;
    - Zarzas 0,97;
    - Detonante 0,96.
  - Resultado a Nv50:
    - de 31 a 28 reglas fuera;
    - jefe más lento ×2,48 del más rápido;
    - Arcanista UNI ×1,08;
    - Cruzado UNI ×1,46, con el jefe en 36,5 s.

### 6.1 Guerrero

| # | Regla (medido → objetivo) | Propuesta | Efecto | Etiqueta · dueño |
|---|---|---|---|---|
| G1 | `ROL:cruzado:50:ttkB` jefe 27,5 s → 36–108 | `js/skills-guerrero.js` · `g_martillo` · `charge.scale.coef[1]` 3,8 → 2,3 | jefe 38 s; UNI ×1,95 → ×1,46 (baja la M) | [medido] · KA-guerrero |
| G2 | (sin fallo propio: sube la M) Guardián UNI ×1,32, ÁREA×5 ×1,79 | `js/skills-guerrero.js` · `terremoto` · `coef` 2,2 → 1,32 | Guardián UNI ×0,95, jefe 57 s | [medido] · KA-guerrero |
| G3 | `ROL:berserker:50:min:uni` ×0,97 → ≥ 1,10; `min:area` ×0,93 → ≥ 1,0 | `js/skills-guerrero.js` · `g_rajar` · `coef` 1,4 → 1,89 | UNI ×1,14 (el área no se midió) | [medido] · KA-guerrero |
| G4 | `ROL:berserker:50:best:uni` 0,48–0,50 de la mejor de su clase → ≥ 1,1 | sin número único: con G1 y G3 el Cruzado sigue en ×1,46. Falta bajar el Martillo a ~1,6 | — | [sin número] · KA-guerrero |
| G5 | `1A:guerrero:25:ult`, `1A:guerrero:50:ult`, `ROL:berserker:50:ult` 0 % → 12–22 %; forja `g_u_furia` F1 i/ii, F8, F3, F9 ×3 | `js/skills-guerrero.js` · `g_rajar` · `cost` 15 → 35 | Furia Inmortal da Furia, pero con Rajar a 15 la Furia nunca falta. A 35 la definitiva da el 13,1 % (a 25, el 3,6 %). No se midió el UNI con el cambio | [medido] · KA-guerrero |
| G6 | `ROL:cruzado:50:ult` 5 % → 12–22 %; `ROL:cruzado:50:maxHit` 27 % (semilla 1: 37 %) → ≤ 25 %; forja `g_u_cataclismo` F3, F9 ×3 | `js/skills-guerrero.js` · `g_u_cataclismo` · `cd` 60 → 20 | definitiva 11 %, jefe 23 s (cd 19,8; antes de G1). El golpe máximo pide además `charge.scale.coef[1]` 12 → 8 (con 10 da 30,9 %) | [sin número único] · KA-guerrero |
| G7 | `ROL:cruzado:50:apoyoDps` 8 % → ≥ 25 %; `best:apoyo` 0,31 → ≥ 1,1 | la build por defecto (Veredicto) no lleva apoyo. El APOYO de 2e lo da Tierra Santa (2,46 %/s de cura en G9) o Sentencia, y F4 lo prohíbe en una variante de daño. Medir el rol con Santuario o cambiar la regla | — | [decisión] · KT-guerrero |
| G8 | `ROL:berserker:50:min:ttdp` ×0,30 → ≥ 0,9; `ROL:cruzado:50:min:ttdp` ×0,41 → ≥ 1,3 | ver §8.3. La M del TTD+ está inflada por el tope del Guardián: sin él, ×0,57 y ×0,77 | — | [decisión] · E4b |
| G9 | `1A:guerrero:5:ttkB` jefe 26,4 s → 30–90 (semilla 1) | `js/skills-guerrero.js` · `g_hendidura` · `coef` ×0,80 | a Nv5 la Hendidura da el 63 % del UNI → jefe ~30 s | [estimado] · KA-guerrero |
| G10 | `G9:berserker:{70,100}:danza:ttdp` ×0,59/×0,36; `hibrido:hibrida` ×0,59/×0,60 → ≥ 0,90 | `js/talents-guerrero.js` · b25 Danza Carmesí: el final resta (Danza pasa de 975 a 2.350 de UNI sin él). La furia por segundo y su tope no influyen. Hay que ver qué cambia en la rotación antes de tocar números | — | [sin número] · KT-guerrero |
| G11 | `G9:guardian:70:guardia:ttdp` ×0,02; `hibguard:hibrida` ×0,01/×0,07 | Cabeza de Puente y Sismo llegan al «∞» por la vida al golpear (§8.3). Aparte, d26 Montaña Viva baja el TTD+ de Sismo de 344 a 28 s [medido]: revisarla | — | [decisión] · KT-guerrero |
| G12 | `G9:cruzado:{70,100}:tribunal:area` ×0,70/×0,69 | subir el % del Tribunal (z25) baja su área: el ÁREA×5 se satura de golpes | — | [sin número] · KT-guerrero |
| G13 | `G9:cruzado:{70,100}:santa:apoyo` ×0,93/×0,94 | las zonas de Tierra Santa no cubren a los aliados del banco; triplicar la cura da +1 % (§8.4) | — | [límite] · B1/E4b |
| G14 | `G9:cruzado:{70,100}:hibcruz:hibrida` ×0,81/×0,75 → ≥ 0,90 | `js/powers-guerrero.js` · `celestial.pct[2]` 60 → 30 | híbrida ×0,896 (Nv70) y ×0,835 (Nv100); falta poco a Nv70, junto con G1 | [medido] parcial · KT-guerrero |
| G15 | `G18:berserker` 15,9 puntos → ≤ 5 | sin número único: el Titán t10 (`@spender dmg` 12 → 45) deja 10,9; la Gloria (`pct` 4 → 1), 12,5 | — | [sin número] · KT-guerrero |
| G16 | `G18:guardian` 4,2 en la mediana (6,4 con la semilla 1) | ninguna: ruido de semilla | — | — |

**Forja del Guerrero.** Archivo `js/skills-guerrero.js` (`SKILL_FORGE`), dueño KA-guerrero. Las variantes de definitiva y la furia están en G5 y G6.

| Regla | Propuesta | Etiqueta |
|---|---|---|
| F3 `g_tajo` +44 % | Mejora `mod.splashPct` 30 → 10 | [estimado] |
| F1 `g_hendidura_ii` 4 % | `g_hendidura_ii` `mod.zonePct` 40 → 60 | [estimado] |
| F1 `embestida_i` 2 %; F8 `embestida` | CONTROL saturado (82 % las dos) | [límite] |
| F3 `g_piel` 0 % | la cura de Acero Templado llega con la vida llena | [límite] |
| F2b `g_lanza_ii` +49 % | `g_lanza_ii` `mod.dmg` −30 → −52 | [estimado] |
| F3 `g_lanza` 0 %; F3 `g_remolino` 0 % | Mejoras de alcance y de giro que el banco no aprovecha | [límite] |
| F1 `g_rajar_ii` −20 % | `g_rajar_ii` `mod.dmg` −20 → +3 | [estimado] |
| F3 `g_rajar` 1,5 % | la ventana del combo: el banco encadena sin ella | [límite] |
| F1 `g_guardia_ii` 0 % | Guardia Opresiva frena un 20 %, por debajo del lento del banco (30 %): `js/powers-forge-guerrero.js` · `opresiva.slowPct` 20 → 30 | [estimado] |
| F3 `g_guardia` −105 % | la rotación cambia de postura en cada recarga, y la Mejora la recarga antes | [límite] |
| F2b `g_carga_escudo_ii` +22 % | en el borde (≤ +20 %); si se mantiene, `set.range` 12 → 10 | [estimado] |
| F1 `terremoto_ii` −168 % | Falla (línea) frente a Martinete (anillo) en ÁREA×5: `terremoto_ii` `set.width` 2 → 4 | [estimado] |
| F2b `terremoto_i` +22 % | `terremoto_i` `mod.dmg` 60 → 56 | [estimado] |
| F3 `terremoto` 4,6 % | en el borde (5 %) | ruido |
| F1 `g_u_ciudadela_ii`, F8, F3 `g_u_ciudadela` | las espinas de la Empalizada y el TTD+ «∞» | [límite] |
| F1 `g_juicio_i` −93 % | la métrica de daño propio no ve la debilidad de Sentencia (el UNI total sube un 8 %) | [límite] |
| F4 `g_juicio_i` +29 % del DPS de un aliado | una variante de daño que da al grupo: conflicto de diseño (ver G7) | [decisión] |
| F3 `g_juicio` 0 % | — | [límite] |
| F8 `g_sendero` | ningún aliado cruza el sendero | [límite] |
| F1 `g_martillo_i` 5,6 % | `g_martillo_i` `mod.dmg` 40 → 45 | [estimado] |

### 6.2 Maga

| # | Regla (medido → objetivo) | Propuesta | Efecto | Etiqueta · dueño |
|---|---|---|---|---|
| M1 | (sube la M) Piromante UNI ×1,49 y ÁREA×5 ×1,71; `1A:maga:50:ttkE` élite 4,12 s → ≥ 4,5 (semilla 1) | `js/talents-maga.js` · s12 Pirotecnia · `fx.tv.critFireCdr` 0,5 → 0,25 | Piromante ×1,32 y ×1,52 (Nv50), ×1,97 y ×1,97 (Nv70); jefe 40,3 s; élite ~4,6 s [estimado] | [medido] · KT-maga |
| M2 | `1A:maga:25:ult` 10,3 %, `1A:maga:50:ult` 5,8 %, `ROL:piromante:50:ult` 6 % → 12–22 %; forja `m_u_supernova` F1 i/ii, F8, F3, F9 ×3 | `js/skills-maga.js` · `m_u_supernova_i` (Sol Errante, la forja recomendada) · `set.coef` 3,8 → 9,1 | sin M1, la definitiva da 12,3 % pero el jefe baja a 33 s (< 36); con 7,6, 10,6 % y 35,9 s. Junto con M1 el jefe queda en ~36–37 s | [medido] + [estimado] · KA-maga |
| M3 | `1A:maga:50:ttd` 5,83 s → ≥ 6 (semilla 1) | `js/data.js` · `CLASSES.maga.hpPerLevel` 6 → 7 | +49 de vida a Nv50 (1.504 → 1.553, +3,3 %) → TTD ~6,0 s | [estimado] · E4b |
| M4 | `ROL:crionte:50:min:uni` ×0,70 → ≥ 0,85 | sin número único: `k_lanza` `coef` ×1,6 da UNI ×0,83, pero la élite muere en 3,44 s (< 3,6) | — | [sin número] · KA-maga |
| M5 | `ROL:crionte:50:ult` 11,9 % → 12–22 %; forja `m_u_tormenta` F9 Mejora e I | `js/skills-maga.js` · `m_u_tormenta` · `coef` 0,9 → 0,945 | 12,4 % | [medido] · KA-maga |
| M6 | `ROL:arcanista:50:min:uni` ×0,59 → ≥ 1,15; `best:uni` 0,40 → ≥ 1,1; forja F1 `rayo_ii` −22 % | `js/skills-maga.js` · `rayo_ii` (la forja recomendada, una trampa: hoy hace menos que la Mejora sola) · `set.coef` 0,8 → 1,7 | UNI ≈ ×1,0 de M (1,6 → ×0,95; 2,0 → ×1,12; 2,4 → ×1,28). Pasado ~1,7 la variante rompería F2b (+20 % sobre la Mejora). La distancia que queda, sin número | [medido] · KA-maga |
| M7 | `ROL:arcanista:50:min:area` ×0,34 → ≥ 0,75 | sin número único: `a_orbe` `coef` ×3 da ×0,47; con M6, el máximo medido fue ×0,52 | — | [sin número] · KA-maga |
| M8 | `ROL:arcanista:50:ult` 6 % → 12–22 %; forja `m_u_desgarro` F9 ×3 | `js/skills-maga.js` · `m_u_desgarro` · `cd` 50 → 22,5 | 14,6 % (a 30: 11 %). Subir el coeficiente de `m_u_desgarro_ii` a 25,2 da > 12 %, pero el golpe máximo llega al 35,7 % | [medido] · KA-maga |
| M9 | `G9:piromante:{70,100}:brasa:area` ×0,47/×0,62; `hibrido:hibrida` ×0,30/×0,31 → ≥ 0,85 | la Ignición mide su apertura (~10 s, §8.1). M1 la baja un 23 %; la duración de Combustión y la extensión de la Perpetua no la mueven (§3). Lo que la sostiene es Pirotecnia (s12), Combustión (s23) y Perpetua (s26) juntas | — | [sin número] · KT-maga |
| M10 | `G9:piromante:{70,100}:cataclismo:ctl` ×1,00 (97 % frente a 98 %) | la métrica de CONTROL de G9 está saturada; ninguna build de Piromante tiene control duro (§8.2) | — | [decisión] · E4b |
| M11 | `G9:crionte:{70,100}:tormenta:area` ×0,36/×0,33; `hibcrio:hibrida` ×0,54/×0,58 | hay que subir lo que da i27 Invierno Eterno (12.400 de ÁREA×5). Bajar la Fractura no sirve: `lanzaInvierno` 4 → 2 y `ceroCoef` 3 → 0 la dejan por encima de 30.000 [medido] | — | [sin número] · KT-maga |
| M12 | `G9:crionte:{70,100}:glaciar:ctl` ×0,72/×0,73 | con la métrica de duro + inmovilizar, Era Glacial gana (47 % frente a 22–29 %) | — | [decisión] · E4b |
| M13 | `G9:arcanista:70:rayo:uni` ×0,85–0,91; `G9:arcanista:{70,100}:orbe:area` ×0,98/×0,93; `hibarca:hibrida` ×0,61/×0,56 | la Marca del Tiempo (`js/powers-maga.js` · `marcaPct` 30 → 20) da el G18 en 2,2 puntos, pero Constelación pasa a ×0,81 en ÁREA×5 [medido]. Las cuatro builds se mueven entre 3.500 y 4.000 de ÁREA×5: una regla de «ganar» no tiene margen | — | [sin número] · KT-maga |
| M14 | `G18:arcanista` 7,7 puntos (mediana) | `js/talents-maga.js` · e8A · `sealVuln` 10 → 7 | 4,1 puntos con la semilla 1. Con 6 dio 5,9 y con 5 dio 4,8: ruido del tamaño del cambio | [medido] · KT-maga |
| M15 | `G18:piromante` 15,2, `G18:crionte` 10,5 (semilla 1) | ninguna: las medianas son 2,3 y 3,5 | — | ruido |

**Forja de la Maga.** Archivo `js/skills-maga.js` (`SKILL_FORGE`) o `js/powers-forge-maga.js` donde se dice, dueño KA-maga. Las definitivas están en M2, M5 y M8, y `rayo_ii` en M6.

| Regla | Propuesta | Etiqueta |
|---|---|---|
| F1 `m_dardo_ii` 0 % | Saeta Gélida frena un 20 %, por debajo del lento del banco: `m_dardo_ii` `mod.slowPct` 20 → 30 | [estimado] |
| F3 `m_dardo` −2 % | Mejora de velocidad y alcance | [límite] |
| F1 `bola_fuego_ii` −25 % | `js/powers-forge-maga.js` · `emberCoef` 0,4 → 0,7 (cada brasa del Racimo) | [estimado] |
| F3 `bola_fuego` +78 % | radio 2 → 2,6 m: con 2,6 m la manada entra entera (salto de geometría). Si se quiere afinar: Mejora `mod.radius` 30 → 10 | [límite] / [estimado] |
| F3 `m_barrera` 0 % | dura 8 → 10 s, pero el escudo se gasta antes | [límite] |
| F1 `p_llamarada_i` 1,5 % | `p_llamarada_i` `mod.dmg` 50 → 60 | [estimado] |
| F2b `meteoro_i` +45 % | `meteoro_i` `mod.dmg` −45 → −65 | [estimado] |
| F1 `meteoro_ii` −207 % | Lluvia de Meteoritos gana incluso en UNI (3 impactos); se repasa después de F2b | [sin número] |
| F4 `meteoro_ii` +5 % | el aturdimiento de 1 s da Quebranto y vulnerable al grupo | [decisión] |
| F3 `meteoro` 0 % | Puntería Ígnea no cambia nada en el banco | [límite] |
| F1 `k_prision_i` 2,7 %; F8 y F3 `k_prision` | CONTROL saturado; Celda Lejana da 58 frente a 57 | [límite] |
| F8 `m_paso_escarcha` | movilidad | [límite] |
| F1 `m_u_tormenta_ii` −98 %; F9 `m_u_tormenta_ii` 6 % | `m_u_tormenta_ii` `set.coef` 11 → 24 | [estimado] |
| F3 `m_u_tormenta` 0 % | Ojo Tranquilo | [límite] |
| F1 `a_orbe_i` −211 % | Orbe Veloz sin rebotes pierde en UNI contra el Orbe que rebota | [sin número] |
| F8 y F3 `a_orbe` | Orbe Grande (`mul size` 1,3) no se nota | [límite] |
| F5 `a_sello_i` +37 % | `a_sello_i` `set.buff.critDmg` 25 → 16. Revisar: la generación sube por los críticos de las Cargas | [estimado] |
| F3 `a_sello` +30 % | Mejora `mod.durS` 2 → 1 | [estimado] |
| F3 `rayo` 0 % | Rayo Largo (alcance) | [límite] |
| F3 `m_u_desgarro` 0 % | Desgarro Estable (moverse al canalizar) | [límite] |

### 6.3 Arquera

| # | Regla (medido → objetivo) | Propuesta | Efecto | Etiqueta · dueño |
|---|---|---|---|---|
| A1 | `ROL:tiradora:50:min:area` ×0,42 → ≥ 1,2; `best:area` 0,65 → ≥ 1,1; `min:uni` ×0,57 → ≥ 0,85; `ttkN` 2,87 s → ≤ 1,8; `ttkE` 26 s → ≤ 12,6 | `js/skills-arquera.js` · `flecha_multiple_i` (Abanico Abierto, la forja recomendada, una trampa: hace menos que la Mejora sola, y Haz Cerrado da 3.295 y 3.233) · `set.coef` 0,38 → 0,95 | mejor de su clase en ÁREA×5 ✓ y UNI ≥ ×0,85 ✓. ÁREA×5 se queda en ×0,57 (falla) y la definitiva baja al 10,5 % (falla). Común y élite, sin medir | [medido] parcial · KA-arquera |
| A2 | F2b `flecha_multiple_ii` +44 % | `flecha_multiple_ii` `set.coef` 0,55 → 0,38 | — | [estimado] · KA-arquera |
| A3 | `ROL:francotiradora:50:min:uni` ×0,79 → ≥ 1,15 | sin número único: la carga de `a_t_apuntado_ii` ×1,6 da ×0,89, y `a_disparo_ii` ×1,6 da ×0,87. Con la M más baja (G1, G2, M1) la distancia se acorta | — | [sin número] · KA-arquera |
| A4 | `ROL:francotiradora:50:min:area` ×0,43 → ≥ 0,7 | — | — | [sin número] · KA-arquera |
| A5 | `ROL:francotiradora:50:min:ttdp` ×0,28 → ≥ 0,85 | ver §8.3 | — | [decisión] · E4b |
| A6 | `ROL:francotiradora:50:ult` 11,7 % → 12–22 %; forja F9 `a_u_celeste_ii` 11,7 % | `js/skills-arquera.js` · `a_u_celeste_ii` · `charge.scale.coef[1]` 10 → 10,8 | ~12,5 %. El coeficiente base no se nota, porque la forja recomendada lo fija | [estimado] · KA-arquera |
| A7 | `1A:arquera:25:maxHit` 28,8 % (Lluvia Celeste) → ≤ 25 % (semilla 1) | choca con A6: bajar la carga completa a Nv25 baja la definitiva del Nv50. Haría falta más frecuencia y menos golpe | — | [sin número único] · KA-arquera |
| A8 | `ROL:montaraz:50:ttkE` 13,2 s → ≤ 12,6 | `js/skills-arquera.js` · `a_m_detonante` · `coef` 0,8 → 0,96 | élite dentro del rango | [medido] · KA-arquera |
| A9 | `ROL:montaraz:50:min:area` ×0,63 → ≥ 0,9 | sin número único: el Detonante ×2 llega a ×0,67 | — | [sin número] · KA-arquera |
| A10 | `ROL:montaraz:50:ult` 22,1 % → ≤ 22 %; forja F9 `a_u_zarzas_i` 22,1 % | `js/skills-arquera.js` · `a_u_zarzas` · `coef` 1 → 0,97 | 21,5 % | [medido] · KA-arquera |
| A11 | `ROL:spread:50` jefe más lento ×3,40 del más rápido → ≤ 2 | el Montaraz y la Tiradora tardan 93 s; con G1 el más rápido pasa a 38 s y hacen falta ≤ 76 s | — | [sin número único] · E4b |
| A12 | `G9:tiradora:{70,100}:vaiven:uni` ×0,53/×0,71 | `js/talents-arquera.js` · v26 Vaivén Eterno no cambia el daño: 43 s de Vendaval y 8 Andanadas, lo mismo que sin el final. Revisar su condición | — | [sin número] · KT-arquera |
| A13 | `G9:tiradora:70:cruzado:min:uni` ×0,77 → ≥ 0,80, `min:mixto` ×0,85 → ≥ 0,90; a Nv100 `cruzado:noBest:*` 1,00–1,03 y `plumas:area` ×0,95 (semilla 1) | dependen de A12; en la mediana de Nv100, la híbrida empata | — | [sin número] · KT-arquera |
| A14 | `G9:francotiradora:{70,100}:perforacion:area` ×0,57/×0,75; `pulso:min:area` ×0,56 → ≥ 0,8; `pulso:min:mixto` ×0,75/×0,89 → ≥ 0,9 | f25 Línea Mortal no se activa nunca: con Tiro Pesado la ventana perfecta es [2,15; 2,35] s, la carga máxima es 2,5 s y la build suelta como mucho al 94 %. Con el umbral al 85 %, solo +4 % de UNI (el haz da el 20 %) | — | [sin número] · KT-arquera |
| A15 | `G9:francotiradora:70:puntodebil:uni` 0,99 (semilla 1) | ninguna: en la mediana pasa | — | ruido |
| A16 | `G9:montaraz:{70,100}:caceria:uni` ×0,74/×0,82; `espinas:noBest:uni` ×1,35/×1,22; `espinas:noBest:mixto` ×1,06–1,10; `espinas:min:area` 0,79 (semilla 1) | m26 Gran Cacería pide 2 trampas propias a la vez y en el banco nunca hay más de 1. Revisar la condición o la recarga de las trampas | — | [sin número] · KT-arquera |
| A17 | `G9:montaraz:{70,100}:campo:area` ×0,72/×0,64 | m25 Tierra Arrasada pierde contra Bosque Vivo, que se lleva el área con sus zarzas | — | [sin número] · KT-arquera |
| A18 | `G9:montaraz:70:zarzal:ctl` ×0,94 | métrica saturada. Con duro + inmovilizar, Bosque Vivo también pierde (51 % frente a 64 %) | — | [decisión] · E4b |
| A19 | `G18:tiradora` 12,8 puntos | sin número único: ni el movimiento del viento ni el daño de la punta bajan de 9 puntos | — | [sin número] · KT-arquera |

**Forja de la Arquera.** Archivo `js/skills-arquera.js` (`SKILL_FORGE`), dueño KA-arquera. A1, A2, A6 y A10 ya cubren la Flecha Múltiple, Lluvia Celeste y Zarzas.

| Regla | Propuesta | Etiqueta |
|---|---|---|
| F1 `a_disparo_i` −84 % | `a_disparo_i` `set.coef` 0,45 → 0,9 | [estimado] |
| F3 `a_disparo` 4 % | en el borde | ruido |
| F1 `flecha_perforante_i` −13 % | `flecha_perforante_i` `set.splash` 0,8 → 1,0 | [estimado] |
| F3 `flecha_perforante` 0 % | Astil de Fresno no cambia nada en el banco | [límite] |
| F3 `a_humo` 0 % | radio 4 → 5 m: los enemigos ya están a menos de 4 m | [límite] |
| F3 `lluvia_flechas` +26 % | +1 oleada sobre 4 da +25 % por construcción: F3 (5–15 %) no se cumple sin cambiar la Mejora | [decisión] |
| F3 `a_t_andanada` −8 % | abanico 120 → 150°: la manada cabe en 120° y la Mejora reparte flechas fuera | [límite] |
| F8 `a_v_carrera` | movilidad | [límite] |
| F1 `flecha_multiple_i` −293 %; F3 `flecha_multiple` 0 % | A1 y A2; la Mejora es de alcance | [medido] / [límite] |
| F3 `a_u_diluvio` +180 % | radio 4 → 5 m: con 5 m la manada entra entera (salto de geometría) | [límite] |
| F9 `a_u_diluvio_ii` 22,7 % | `a_u_diluvio_ii` `set.coef` 7 → 6,5 | [estimado] |
| F3 `a_t_apuntado` −3,8 % | — | [límite] |
| F3 `a_f_rodilla` +105 % | tensado 40 → 50 %: salto de umbral (la carga entra antes en la ventana) | [sin número] |
| F1 `a_f_rastreador_i` 6,6 % | `a_f_rastreador_i` `set.mark.radius` 4 → 5 | [estimado] |
| F3 `a_f_rastreador` 0 % | Marca Duradera (duración) | [límite] |
| F1 `a_u_celeste_i` −260 %; F9 `a_u_celeste_i` 5,6 % | `a_u_celeste_i` `set.coef` 1,5 → 3,6 | [estimado] |
| F3 `a_u_celeste` 0 % | Cielo Abierto | [límite] |
| F3 `a_t_cepo` +19 % | Mejora `set.trap.armT` 0,2 → 0,35 | [estimado] |
| F3 `a_m_detonante` +38 % | radio 3 → 4 m (salto de geometría). Si se quiere afinar: Mejora `set.radius` 4 → 3,5 | [límite] / [estimado] |
| F3 `a_u_zarzas` +37 % | Mejora `mod.durS` 2 → 1 | [estimado] |

## 7. Notas del punto 18

- **Llamada del Halcón (y4A).** Medida en la build Presa del Montaraz a Nv80 y Nv100: es la única que compra y4A, y `SPEC_BAR` nunca la pone en la barra.
  - Hace 3 llamadas cada 60 s, de 12 ataques cada una (36 ataques).
  - Aporta el 5,0 % del daño UNI (5,7 % a Nv100).
  - Puesta en la ranura 2 en lugar del Humo, suma un 4,8 % de UNI y resta un 4,5 % de área.
  - Da 30 de Quebranto por llamada, 90 por minuto. Las roturas siguen en 3 por minuto: es el tope del bloqueo de 15 s, así que el Quebranto extra no se nota.
  - El G18 de la Halconera pasa (Francotiradora 3,7 y Montaraz 1,2 puntos).
  - **No hace falta cambiar nada.**
- **Quebranto del Grillete** (`a_f_rastreador_ii`: `mod` lento de 8 s al 50 % y `stagger` 20). Francotiradora a Nv50, comparado con Rastreo Múltiple o Marca Duradera:
  - llena el Quebranto en 4,7, 3,6 y 4,0 s, frente a 10,6 s;
  - rompe 3 veces por minuto, frente a 2;
  - suma 355 de Quebranto por minuto, frente a 231 (20 de control y 97 de lento).
  - Cada relanzamiento da los 20 del `mod` más unos 8 por los 2 s de lento nuevo; el primero, 52. La línea dice «le llena 20 de Quebranto» y en la práctica son ~28.
  - Propuesta: `a_f_rastreador_ii` `mod.stagger` 20 → 12, para que el total coincida con la línea [estimado; KA-arquera]. Otra opción es cambiar la línea a «unos 30», pero es un texto.
- **Quebranto por desplazamiento.**
  - La Tiradora empuja 49 veces por minuto (66 a Nv70), con 46 de Quebranto (59 a Nv70) y una resistencia media de 0,59–0,60: el tope de resistencia (+0,5 por empujón, −0,1 por segundo) funciona.
  - El Piromante, 2 empujones por minuto (10 de Quebranto cada uno).
  - Sin propuesta.
- **Nodos con números absolutos sobre la Mejora** (medido con `probe-abs`, Maga; en el Guerrero y la Arquera no se encontraron casos). La decisión es del orquestador [decisión; KT-maga]: o la línea pasa a relativa («+2 m»), o el número del nodo se ajusta para que la línea valga con la Mejora (y deja de valer sin ella).

  | Nodo | Habilidad · campo | Base / Mejora | Con el nodo: sin Mejora / con Mejora | La línea dice | Número para que valga con la Mejora |
  |---|---|---|---|---|---|
  | i8A | `k_prision` `radius` +50 % | 4 / 5 m | 6 / 7 m | «a 6 m (antes 4 m)» | `radius` 50 → 25 |
  | i9A | `k_lanza` `range` +50 % | 12 / 14 m | 18 / 20 m | «llega a 18 m (antes 12 m)» | `range` 50 → 33 |
  | a17 | `a_sello` `durS` +2 por rango | 8 / 10 s | 10–12 / 12–14 s | «dura 10 s» / «12 s» (antes 8) | `durS` 2 → 1 (11 y 12 s con la Mejora) |
  | s6 | `p_volatil`: radio de la Bola ×2 | 2 / 2,6 m | 4 / 5,2 m | «4 m» | `T.volatilRadius` 2 → 1,54 |

## 8. Límites del banco, decisiones y dudas

### 8.1 UNI hasta matar al jefe

- El UNI se mide como el DPS hasta que el jefe muere (90 s de vida a DPS típico, 60 s de combate).
- Una build que lo mata en ~10 s mide su apertura, como la Ignición (definitiva, Ignición Total y Combustión el 84 % del combate).
- El banco no ve su DPS sostenido, y G9 no castiga una apertura desmedida si después se cae.
- Pasa lo mismo con Cero Absoluto (31.600 de UNI a Nv100).

### 8.2 CONTROL de G9

- En G9, CONTROL es el % del tiempo con lento ≥ 30 %, y casi todas las builds lo saturan (89–99 %).
- Con «duro + inmovilizar», que es lo que la matriz de rol ya mide:
  - Era Glacial ganaría (47 % frente a 22–29 %);
  - Bosque Vivo seguiría perdiendo (51 % frente a 64 %);
  - Lluvia de Fuego empataría a 0.
- **[decisión]** qué métrica afirma G9.

### 8.3 TTD+

- Lo decide la vida al golpear del equipo. Con la cubeta de sustento al 6 % de la vida por segundo:
  - las builds que golpean a 7 enemigos sin parar no pierden vida neta (Cabeza de Puente, Campo Minado, Sismo a Nv100);
  - en 180 s se curan 17.026 de vida con la vida al golpear.
- La M de la matriz de rol se infla por el tope de 180 s del Guardián.
- Los nodos de bloqueo o de resistencia del Guardián no mueven su TTD+, que ya está en el tope [medido].
- **[decisión]** medir TTD+ sin la vida al golpear del equipo, o con el sustento a un objetivo.

### 8.4 APOYO

- El banco pone 2 aliados fantasma quietos en (−1, ±1,6), detrás del héroe.
- Las zonas que no los cubren (Tierra Santa) y los efectos que piden que un aliado se mueva (Sendero) no se ven.
- Cambiar su posición cambia el veredicto de Tierra Santa y de F8 `g_sendero`. **[decisión]**

### 8.5 Otros límites

- **F1 mide el daño propio** de la habilidad. Las variantes que dan un debuff (Sentencia) salen por debajo de lo que valen.
- **Mejoras invisibles.** Las de alcance, velocidad, duración del escudo o radio no se ven o dan saltos: la manada del banco cabe en 5 m y en un abanico de 120°.
- **Verbos.** La ventana perfecta es del 60 % (90 % con Fe Serena o en Calma) y no depende de la habilidad.
- **Equipo.** El perfil de equipo es fijo por nivel e igual para las tres clases.

### 8.6 Decisiones respetadas

- Los buffs, escudos y curas escalan con el rango (`RANK_BUFF_STEP`).
- La forja recomendada (D3) se mide tal cual, aunque `rayo_ii` y `flecha_multiple_i` sean trampas: se informan en M6 y A1.
- El Quebranto por lento cuenta solo los segundos nuevos de lento: no se cambió.

### 8.7 Dudas

1. **`areaLevelForHero` cambia desde el Nv70.**
   - Lo usa también `js/ui.js` para el % de armadura que se ve fuera de mazmorras y zonas, así que esa cifra cambia por encima del 70.
   - Antes, el Nv100 equivalía a un área 63; ahora, a 50.
   - El ilvl (`CM.itemLevel`) no cambia.
2. **El modo rápido tarda 22–47 s** según la carga de la PC. Con la PC ocupada se acerca al límite de 60 s.

## 9. Antes y después: 2e → 2g (Nv50, típico, medianas)

Para `MEMORIA.md`. El TTD+ de 2e se medía sin `drCapOf` y con la barra de 2e, así que no se compara uno a uno.

| Especialización | UNI 2e (×M) | UNI 2g (×M) | ÁREA×5 2e | ÁREA×5 2g | TTD+ 2e | TTD+ 2g |
|---|---|---|---|---|---|---|
| Berserker | 2446 (×1,22) | 1854 (×0,97) | 5782 (×1,07) | 4205 (×0,93) | 12,1 (×0,97) | 11,4 (×0,30) |
| Guardián | 1549 (×0,77) | 2529 (×1,32) | 4124 (×0,76) | 8067 (×1,79) | 33,4 (×2,68) | 180 (×4,76) |
| Cruzado | 1802 (×0,90) | 3733 (×1,95) | 5104 (×0,94) | 6516 (×1,45) | 17,5 (×1,40) | 15,4 (×0,41) |
| Piromante | 1881 (×0,94) | 2845 (×1,49) | 6954 (×1,28) | 7692 (×1,71) | 4,1 (×0,33) | 9,6 (×0,25) |
| Crionte | 1861 (×0,93) | 1338 (×0,70) | 5231 (×0,97) | 5879 (×1,30) | 12,1 (×0,97) | 56,6 (×1,50) |
| Arcanista | 2595 (×1,29) | 1122 (×0,59) | 4708 (×0,87) | 1549 (×0,34) | 4,2 (×0,34) | 4,7 (×0,13) |
| Francotiradora | 2428 (×1,21) | 1517 (×0,79) | 4829 (×0,89) | 1946 (×0,43) | 11,4 (×0,91) | 10,5 (×0,28) |
| Montaraz | 1661 (×0,83) | 1161 (×0,61) | 5189 (×0,96) | 2842 (×0,63) | 6,1 (×0,49) | 31,2 (×0,83) |
| Tiradora | 1810 (×0,90) | 1098 (×0,57) | 6866 (×1,27) | 1883 (×0,42) | 11,2 (×0,90) | 20,8 (×0,55) |
| **M** | 2004 | 1911 | 5421 | 4509 | 12,5 | 37,8 |

En 2e las 9 estaban entre ×0,77 y ×1,29 de UNI. En 2g van de ×0,57 a ×1,95: el catálogo 2g abrió la distancia, sobre todo por el Cruzado, el Piromante y el Guardián (arriba) y por la Arquera y la Arcanista (abajo).

## Anexo: reproducir

- `node tests/balance-bench.mjs`: modo rápido.
  - Semilla 1: filas 1A y 2b.2, matriz de rol Nv50, G9 a Nv70 y Nv100, y G18.
  - Afirma contra `PENDING_E4B`.
  - Añade `--report` para las tablas y `--levels 70,100` para elegir los niveles de G9.
- `node tests/balance-bench.mjs --seeds 5 --json <archivo>`: lo de arriba más las medianas de 5 semillas.
  - De ahí salen las tablas de este informe (unos 330 s).
- `node tests/forge-bench.mjs`: modo rápido de la forja, afirma contra `PENDING_FORGE`.
  - `--report` imprime la matriz completa y `--class <clase>` la limita a una clase.
  - `--seeds 5 --json <archivo>` da las medianas.
- `node tests/balance-regression.mjs`: el ritmo 1A de 2b.2 con el catálogo 2g.
- **Pruebas pesadas.** Se lanzan por turno: `node tools/turno.mjs node tests/<banco>.mjs …`.
- **Núcleo compartido:** `tests/helpers/bench-core.mjs`. Sus exportaciones son `buildHero`, `simulateUni`, `areaSim`, `controlSim`, `apoyoSim`, `ttdPlusSim` y `refEnemies`.
- **Herramientas que no se versionan.** El arnés de mutaciones y los barridos de números (`sweep.mjs` y `psweep.mjs`, que cambian un número de un catálogo o de una tabla congelada en una copia y miden las reglas afectadas) quedaron en el scratchpad de la sesión de B1.
